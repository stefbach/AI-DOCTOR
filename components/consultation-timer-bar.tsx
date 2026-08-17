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

  // One line, on a phone as much as on a desktop. Wrapping put each pill on
  // its own row and the bar then covered a third of a small screen — a status
  // display that big stops being a status display.
  //
  // Nothing is dropped to make it fit: the section name truncates, the wordy
  // labels shorten, and the numbers — the only part that has to be read
  // exactly — keep their size at every width.
  return (
    <div className="flex flex-nowrap items-center gap-1 sm:gap-2 print:hidden">
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 shadow-lg sm:gap-2 sm:px-3 sm:py-1.5",
          TONE[totalStatus],
        )}
      >
        <Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        <span className="whitespace-nowrap text-xs font-semibold tabular-nums sm:text-sm">
          <span className={cn("text-sm sm:text-base", VALUE_TONE[totalStatus])}>
            {formatDuration(total)}
          </span>
          <span className="opacity-70"> / {formatDuration(TOTAL_BUDGET_SECONDS)}</span>
        </span>
      </div>

      {section && (
        <div
          className={cn(
            "flex min-w-0 items-center gap-1 rounded-lg border px-2 py-1 shadow-lg sm:gap-2 sm:px-3 sm:py-1.5",
            TONE[sectionStat],
          )}
        >
          <span className="truncate text-[10px] font-medium opacity-80 sm:text-xs">
            {SECTION_LABELS[section][language]}
          </span>
          <span className="whitespace-nowrap text-xs font-semibold tabular-nums sm:text-sm">
            <span className={VALUE_TONE[sectionStat]}>{formatDuration(sectionElapsed)}</span>
            <span className="opacity-70"> / {formatDuration(sectionBudget)}</span>
          </span>
        </div>
      )}

      {/* The clock does not stop for the models, so it says when they are the
          reason it is moving. Without this the doctor watches the number climb
          during a three-minute generation and reads it as their own delay.
          On a phone the spinner alone carries it — the sentence would push the
          numbers off the screen. */}
      {aiBusy && state.endedAt == null && (
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-blue-900 shadow-lg sm:px-3 sm:py-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="hidden text-xs font-medium md:inline">{t.ai}</span>
          <span className="text-[10px] font-medium md:hidden">IA</span>
        </div>
      )}

      {/* Redundant with the red, and the first thing to go when space is short. */}
      {totalStatus === "over" && state.endedAt == null && (
        <span className="hidden shrink-0 rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-700 shadow lg:inline-block">
          {t.over}
        </span>
      )}

      {state.endedAt != null && (
        <span className="hidden shrink-0 rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-600 shadow sm:inline-block">
          {t.done}
        </span>
      )}
    </div>
  )
}

export type { TimerSection }
