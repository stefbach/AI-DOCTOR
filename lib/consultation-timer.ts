// lib/consultation-timer.ts
//
// How long a consultation takes, section by section.
//
// Two audiences, one measurement: the doctor sees it live so they know they
// are running long, and TIBOK reads it afterwards to see where the time goes.
// It measures and shows — it never blocks. A doctor with a patient on the line
// must always be able to keep going, however far over they are.
//
// The clock is plain wall time from the first step to the signature: it never
// pauses, not for an idle tab, not while the AI is working. That was decided
// deliberately — a figure nobody can dispute beats a cleverer one nobody can
// reproduce. The AI's share is measured all the same, both to tell the doctor
// why the clock is moving while they wait, and so an overrun caused by a slow
// model can be told apart from an overrun caused by a slow doctor.

export type TimerSection =
  | "patientInfo"
  | "clinicalData"
  | "questions"
  | "diagnosis"
  | "medicalRecord"

/** Step index in app/page.tsx → section. Kept here so both agree. */
export const SECTION_BY_STEP: TimerSection[] = [
  "patientInfo",
  "clinicalData",
  "questions",
  "diagnosis",
  "medicalRecord",
]

export const SECTION_LABELS: Record<TimerSection, { fr: string; en: string }> = {
  patientInfo: { fr: "Informations patient", en: "Patient information" },
  clinicalData: { fr: "Données cliniques", en: "Clinical data" },
  questions: { fr: "Questions", en: "Questions" },
  diagnosis: { fr: "Diagnostic", en: "Diagnosis" },
  medicalRecord: { fr: "Dossier médical", en: "Medical record" },
}

/**
 * Time allowed per section, in seconds. `questions` is PER QUESTION — the app
 * generates three or five depending on the case, so that budget is 3 or 5
 * minutes, not one.
 */
export const SECTION_BUDGET_SECONDS: Record<TimerSection, number> = {
  patientInfo: 2 * 60,
  clinicalData: 3 * 60,
  questions: 1 * 60,
  diagnosis: 1 * 60,
  medicalRecord: 5 * 60,
}

/** The whole consultation. "15 minutes grand maximum." */
export const TOTAL_BUDGET_SECONDS = 15 * 60

/** Amber at four fifths of a budget, red past it. */
export const WARNING_RATIO = 0.8

export interface TimerState {
  consultationId: string
  /** Epoch ms. */
  startedAt: number
  /** Epoch ms, set at signature. Null while the consultation is open. */
  endedAt: number | null
  currentSection: TimerSection | null
  /** Epoch ms the current section was entered. */
  sectionEnteredAt: number | null
  /** Seconds accumulated per section, closed sections only. */
  sections: Partial<Record<TimerSection, number>>
  /** Seconds spent waiting on a model, cumulative. */
  aiWaitSeconds: number
  /** How many questions this case produced, so its budget can be computed. */
  questionCount: number | null
}

const KEY_PREFIX = "consultation-timer-"

const now = () => Date.now()

export function emptyState(consultationId: string): TimerState {
  return {
    consultationId,
    startedAt: now(),
    endedAt: null,
    currentSection: null,
    sectionEnteredAt: null,
    sections: {},
    aiWaitSeconds: 0,
    questionCount: null,
  }
}

/**
 * Read the timer back. A consultation survives a page reload — losing the
 * clock on a refresh would make every measurement a guess, and refreshes
 * happen.
 */
export function loadState(consultationId: string): TimerState | null {
  if (typeof window === "undefined" || !consultationId) return null
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + consultationId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.startedAt !== "number") return null
    return { ...emptyState(consultationId), ...parsed, consultationId }
  } catch {
    return null
  }
}

/**
 * Forget a consultation's clock, so the next visit starts from zero.
 *
 * The clock deliberately survives a reload — losing it on a refresh would
 * make every measurement a guess. That is right in production and wrong on a
 * test bench, where the same consultation is replayed again and again and the
 * time from the previous run carries over. `?resetTimer=1` clears it.
 */
export function clearState(consultationId: string): void {
  if (typeof window === "undefined" || !consultationId) return
  try {
    window.localStorage.removeItem(KEY_PREFIX + consultationId)
  } catch {
    // Nothing to do: an unreadable store is an empty one.
  }
}

export function saveState(state: TimerState): void {
  if (typeof window === "undefined" || !state.consultationId) return
  try {
    window.localStorage.setItem(KEY_PREFIX + state.consultationId, JSON.stringify(state))
  } catch {
    // A full quota must not take the consultation down with it.
  }
}

/** Total wall time, live while open and frozen once signed. */
export function totalSeconds(state: TimerState, at: number = now()): number {
  const end = state.endedAt ?? at
  return Math.max(0, Math.round((end - state.startedAt) / 1000))
}

/** Seconds in one section, including the one currently running. */
export function sectionSeconds(
  state: TimerState,
  section: TimerSection,
  at: number = now(),
): number {
  const closed = state.sections[section] || 0
  if (state.currentSection !== section || state.sectionEnteredAt == null) return closed
  const end = state.endedAt ?? at
  return closed + Math.max(0, Math.round((end - state.sectionEnteredAt) / 1000))
}

/** Every section's total, for the record written to the database. */
export function allSectionSeconds(
  state: TimerState,
  at: number = now(),
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const section of SECTION_BY_STEP) {
    const value = sectionSeconds(state, section, at)
    if (value > 0) out[section] = value
  }
  return out
}

/**
 * Budget for a section. The questions budget scales with the number of
 * questions actually asked; before they exist, one is assumed rather than
 * showing the doctor an impossible target.
 */
export function budgetFor(section: TimerSection, questionCount: number | null): number {
  if (section === "questions") {
    return SECTION_BUDGET_SECONDS.questions * Math.max(1, questionCount ?? 1)
  }
  return SECTION_BUDGET_SECONDS[section]
}

export type BudgetStatus = "ok" | "warning" | "over"

export function budgetStatus(elapsed: number, budget: number): BudgetStatus {
  if (budget <= 0) return "ok"
  if (elapsed > budget) return "over"
  if (elapsed >= budget * WARNING_RATIO) return "warning"
  return "ok"
}

/** "7:12", "1:04:30" past the hour. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/** Close the running section and open another. Re-entering one adds to it. */
export function enterSection(state: TimerState, section: TimerSection, at: number = now()): TimerState {
  if (state.currentSection === section) return state

  const sections = { ...state.sections }
  if (state.currentSection && state.sectionEnteredAt != null) {
    const elapsed = Math.max(0, Math.round((at - state.sectionEnteredAt) / 1000))
    sections[state.currentSection] = (sections[state.currentSection] || 0) + elapsed
  }

  return { ...state, sections, currentSection: section, sectionEnteredAt: at }
}

/** The consultation is signed. Folds in the running section, stops the clock. */
export function stopTimer(state: TimerState, at: number = now()): TimerState {
  if (state.endedAt != null) return state

  const sections = { ...state.sections }
  if (state.currentSection && state.sectionEnteredAt != null) {
    const elapsed = Math.max(0, Math.round((at - state.sectionEnteredAt) / 1000))
    sections[state.currentSection] = (sections[state.currentSection] || 0) + elapsed
  }

  return { ...state, sections, sectionEnteredAt: null, endedAt: at }
}

// ---------------------------------------------------------------------------
// AI wait
// ---------------------------------------------------------------------------
//
// The models are called from inside the step components, not from the page
// that owns the clock, so the call sites announce themselves here and anything
// that cares subscribes. A counter rather than a flag: the report step fires
// several calls and the last one to finish must be the one that clears it.

let aiCallDepth = 0
let aiBusySince: number | null = null
const aiListeners = new Set<(busy: boolean) => void>()

function notifyAi() {
  const busy = aiCallDepth > 0
  for (const listener of aiListeners) listener(busy)
}

/**
 * Announce a model call. Returns the function that ends it — call it in a
 * `finally`, so a failed call cannot leave the doctor staring at "AI working"
 * forever.
 */
export function markAiCallStart(): (onElapsed?: (seconds: number) => void) => void {
  aiCallDepth++
  if (aiCallDepth === 1) aiBusySince = now()
  notifyAi()

  let ended = false
  return (onElapsed) => {
    if (ended) return
    ended = true
    aiCallDepth = Math.max(0, aiCallDepth - 1)
    if (aiCallDepth === 0 && aiBusySince != null) {
      const seconds = Math.max(0, Math.round((now() - aiBusySince) / 1000))
      aiBusySince = null
      onElapsed?.(seconds)
      for (const listener of aiElapsedListeners) listener(seconds)
    }
    notifyAi()
  }
}

const aiElapsedListeners = new Set<(seconds: number) => void>()

export function subscribeAiBusy(listener: (busy: boolean) => void): () => void {
  aiListeners.add(listener)
  listener(aiCallDepth > 0)
  return () => aiListeners.delete(listener)
}

export function subscribeAiElapsed(listener: (seconds: number) => void): () => void {
  aiElapsedListeners.add(listener)
  return () => aiElapsedListeners.delete(listener)
}

export function isAiBusy(): boolean {
  return aiCallDepth > 0
}
