"use client"

// components/consultation-timer-bar.tsx
//
// The consultation clock, as the doctor sees it: total against the 15-minute
// target, and the current section against its own.
//
// It goes amber, then red. It never blocks and never interrupts — the doctor
// decides what a patient needs, and a timer that got between them and that
// decision would be worse than no timer at all. Red is a fact, not a gate.

import * as React from "react"
import { Clock, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  type BudgetStatus,
  type TimerSection,
  type TimerState,
  SECTION_LABELS,
  TOTAL_BUDGET_SECONDS,
  budgetFor,
  budgetStatus,
  formatDuration,
  sectionSeconds,
  totalSeconds,
} from "@/lib/consultation-timer"

const TONE: Record<BudgetStatus, string> = {
  ok: "bg-teal-50 text-teal-900 border-teal-200",
  warning: "bg-amber-50 text-amber-900 border-amber-300",
  over: "bg-red-50 text-red-900 border-red-300",
}

const VALUE_TONE: Record<BudgetStatus, string> = {
  ok: "text-teal-700",
  warning: "text-amber-700",
  over: "text-red-700",
}

export default function ConsultationTimerBar({
  state,
  aiBusy,
  language = "fr",
}: {
  state: TimerState | null
  aiBusy?: boolean
  language?: "fr" | "en"
}) {
  // One tick a second, and only while the consultation is open: a signed
  // report has a frozen figure and does not need re-rendering forever.
  const [, forceTick] = React.useState(0)
  const live = !!state && state.endedAt == null
  React.useEffect(() => {
    if (!live) return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [live])

  if (!state) return null

  const total = totalSeconds(state)
  const totalStatus = budgetStatus(total, TOTAL_BUDGET_SECONDS)

  const section = state.currentSection
  const sectionElapsed = section ? sectionSeconds(state, section) : 0
  const sectionBudget = section ? budgetFor(section, state.questionCount) : 0
  const sectionStat = section ? budgetStatus(sectionElapsed, sectionBudget) : "ok"

  const t = language === "fr"
    ? { over: "au-delà du temps prévu", ai: "IA en cours — le chrono continue", done: "Consultation terminée" }
    : { over: "over the expected time", ai: "AI working — the clock keeps running", done: "Consultation finished" }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5",
          TONE[totalStatus],
        )}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold tabular-nums">
          <span className={cn("text-base", VALUE_TONE[totalStatus])}>{formatDuration(total)}</span>
          <span className="opacity-70"> / {formatDuration(TOTAL_BUDGET_SECONDS)}</span>
        </span>
      </div>

      {section && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5",
            TONE[sectionStat],
          )}
        >
          <span className="text-xs font-medium opacity-80">
            {SECTION_LABELS[section][language]}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            <span className={VALUE_TONE[sectionStat]}>{formatDuration(sectionElapsed)}</span>
            <span className="opacity-70"> / {formatDuration(sectionBudget)}</span>
          </span>
        </div>
      )}

      {/* The clock does not stop for the models, so it says when they are the
          reason it is moving. Without this the doctor watches the number climb
          during a three-minute generation and reads it as their own delay. */}
      {aiBusy && state.endedAt == null && (
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-900">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs font-medium">{t.ai}</span>
        </div>
      )}

      {totalStatus === "over" && state.endedAt == null && (
        <span className="text-xs font-medium text-red-700">{t.over}</span>
      )}

      {state.endedAt != null && (
        <span className="text-xs font-medium text-gray-600">{t.done}</span>
      )}
    </div>
  )
}

export type { TimerSection }
