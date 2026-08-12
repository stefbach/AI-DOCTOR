// lib/triage.ts
// Single source of truth for triage interpretation and follow-up scheduling.
//
// Historically each report component re-implemented `detectEmergency()` with
// slightly different rules, so the banner behaved differently per flow and a
// missing triage block silently read as "routine" (no banner at all). This
// module centralises:
//   1. resolving the triage level (including an explicit "unassessed" state),
//   2. deciding whether a follow-up consultation must be scheduled,
//   3. computing WHEN, with hard guard rails around the AI's proposal.

export type TriageLevel = "emergency" | "urgent" | "routine" | "unassessed"

export interface ResolvedTriage {
  level: TriageLevel
  severity: string
  disposition: string
  criteriaMet: string[]
  justification: string
  /** false when the diagnostic LLM never produced a triage block. */
  assessed: boolean
}

/**
 * Clinical windows for the result-review consultation, in hours.
 * The AI proposes a delay; these bounds are authoritative.
 */
export const TRIAGE_WINDOWS: Record<
  Exclude<TriageLevel, "unassessed">,
  { minHours: number; maxHours: number; defaultHours: number }
> = {
  emergency: { minHours: 0, maxHours: 24, defaultHours: 24 },
  urgent: { minHours: 24, maxHours: 72, defaultHours: 48 },
  routine: { minHours: 168, maxHours: 720, defaultHours: 168 },
}

/**
 * Minimum realistic lab turnaround (hours). Observed on real orders: same-day
 * to ~3 days. Used so a review consultation is never booked before the urgent
 * results could plausibly be back.
 */
export const MIN_URGENT_LAB_TURNAROUND_HOURS = 24

const EMERGENCY_DISPOSITIONS = ["ambulance_immediate", "a&e_same_day"]
const URGENT_DISPOSITIONS = ["gp_review_24h"]

/**
 * Resolve the triage block into a level. Accepts the diagnosis payload in any
 * of the shapes used across flows (diagnosisData / medicalReport).
 */
export function resolveTriage(source: any): ResolvedTriage {
  // The block sits at different paths depending on flow and on how the report
  // was persisted; check every known location once.
  const triage = [
    source?.triage_assessment,
    // The diagnosis step historically nested the raw API payload here.
    source?.completeData?.triage_assessment,
    source?.rapport?.triage_assessment,
    source?.medicalReport?.triage_assessment,
    source?.diagnosis?.triage_assessment,
    source?.diagnosticReasoning?.triage_assessment,
  ].find((t) => t && typeof t === "object")

  if (!triage || typeof triage !== "object") {
    return {
      level: "unassessed",
      severity: "",
      disposition: "",
      criteriaMet: [],
      justification: "",
      assessed: false,
    }
  }

  const severity = String(triage.severity || "").toLowerCase().trim()
  const disposition = String(triage.disposition || "").toLowerCase().trim()

  // The API marks a defaulted block with assessed:false — treat it as unknown
  // rather than as a genuine "routine" classification.
  const explicitlyUnassessed =
    triage.assessed === false || severity === "unassessed" || (!severity && !disposition)

  if (explicitlyUnassessed) {
    return {
      level: "unassessed",
      severity,
      disposition,
      criteriaMet: Array.isArray(triage.criteria_met) ? triage.criteria_met : [],
      justification: String(triage.justification || ""),
      assessed: false,
    }
  }

  let level: TriageLevel = "routine"
  if (severity === "emergency" || EMERGENCY_DISPOSITIONS.includes(disposition)) {
    level = "emergency"
  } else if (severity === "urgent" || URGENT_DISPOSITIONS.includes(disposition)) {
    level = "urgent"
  }

  return {
    level,
    severity,
    disposition,
    criteriaMet: Array.isArray(triage.criteria_met) ? triage.criteria_met : [],
    justification: String(triage.justification || ""),
    assessed: true,
  }
}

export interface FollowUpPlan {
  /** A result-review consultation should be proposed to the doctor. */
  required: boolean
  /** Recommended delay from now, in hours (after guard rails). */
  delayHours: number
  /** Target date/time for the follow-up. */
  targetDate: Date
  /** Latest acceptable date for the clinical window. */
  deadlineDate: Date
  reason: string
  /** True when the delay was raised to respect lab turnaround. */
  adjustedForLabs: boolean
  /** True when the AI proposal was out of bounds and got clamped. */
  clamped: boolean
}

export interface FollowUpInput {
  level: TriageLevel
  /** Delay proposed by the diagnostic LLM, in hours (optional). */
  proposedDelayHours?: number | null
  /** At least one urgent laboratory investigation was ordered. */
  urgentLabs?: boolean
  reason?: string
  /** Injectable for deterministic tests. */
  now?: Date
}

/**
 * Decide whether and when a second (result-review) consultation is needed.
 * The AI proposes; these rules dispose.
 */
export function computeFollowUp(input: FollowUpInput): FollowUpPlan | null {
  const { level, proposedDelayHours, urgentLabs = false, now = new Date() } = input

  // Nothing is auto-proposed when triage failed — the doctor decides.
  if (level === "unassessed") return null

  // Routine cases only get a proposal when urgent labs are pending.
  const required = level === "emergency" || level === "urgent" || urgentLabs
  if (!required) return null

  // Urgent investigations pull a routine case into the urgent window: pending
  // urgent labs must be reviewed within days, not deferred to a 7-day routine
  // follow-up.
  const window =
    level === "routine" && urgentLabs ? TRIAGE_WINDOWS.urgent : TRIAGE_WINDOWS[level]

  let delay =
    typeof proposedDelayHours === "number" && isFinite(proposedDelayHours) && proposedDelayHours > 0
      ? proposedDelayHours
      : window.defaultHours

  const beforeClamp = delay
  delay = Math.min(Math.max(delay, window.minHours), window.maxHours)
  const clamped = delay !== beforeClamp

  // Never review urgent labs before they could realistically be back.
  let adjustedForLabs = false
  if (urgentLabs && delay < MIN_URGENT_LAB_TURNAROUND_HOURS) {
    delay = MIN_URGENT_LAB_TURNAROUND_HOURS
    adjustedForLabs = true
  }

  const targetDate = new Date(now.getTime() + delay * 3600_000)
  const deadlineDate = new Date(
    now.getTime() + Math.max(delay, window.maxHours) * 3600_000
  )

  const reason =
    input.reason ||
    (urgentLabs
      ? "Contrôle des résultats biologiques urgents"
      : "Consultation de contrôle")

  return { required: true, delayHours: delay, targetDate, deadlineDate, reason, adjustedForLabs, clamped }
}

/** Human-readable delay, e.g. "48 h" / "3 jours". */
export function formatDelay(hours: number, language: "fr" | "en" = "fr"): string {
  if (hours < 24) return language === "fr" ? `${hours} h` : `${hours} hrs`
  const days = Math.round(hours / 24)
  if (language === "fr") return days === 1 ? "24 h" : `${days} jours`
  return days === 1 ? "24 hrs" : `${days} days`
}

/** YYYY-MM-DD in local time — matches the date input the booking modal uses. */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Detect urgent laboratory investigations from the report/diagnosis payload.
 * Used both to flag lab_orders.is_urgent and to drive the follow-up proposal.
 */
export function hasUrgentLabs(source: any, level?: TriageLevel): boolean {
  const explicit =
    source?.follow_up_plan?.labs_urgent ??
    source?.labs_urgent ??
    null
  if (typeof explicit === "boolean") return explicit

  // Fall back to the triage level: urgent/emergency cases with any biology
  // ordered are treated as urgent investigations.
  const biology =
    source?.ordonnances?.biologie ||
    source?.laboratoryTests ||
    source?.expertAnalysis?.expert_investigations?.immediate_priority ||
    null

  const hasBiology = Array.isArray(biology)
    ? biology.length > 0
    : !!biology && typeof biology === "object"
      ? Object.keys(biology).length > 0
      : false

  return hasBiology && (level === "emergency" || level === "urgent")
}
