"use client"

// components/triage-banner.tsx
// Shared triage banner for all consultation flows (general / chronic /
// dermatology). Replaces three divergent copies of `detectEmergency()`.
//
// Four states, so an urgent-but-not-emergency case is no longer silent:
//   🔴 emergency  — hospital transfer (unchanged behaviour)
//   🟠 urgent     — do NOT send to A&E; schedule a review consultation in X
//   🔵 routine + pending urgent investigations — calm reminder + booking CTA
//   ⚪ unassessed — the LLM produced no triage block; ask the doctor to assess
//
// A plain routine case with nothing pending renders nothing.

import * as React from "react"
import { AlertTriangle, CalendarClock, HelpCircle } from "lucide-react"

import { cn } from "@/lib/utils"

import type { ResolvedTriage, FollowUpPlan } from "@/lib/triage"
import { formatDelay } from "@/lib/triage"

interface TriageBannerProps {
  triage: ResolvedTriage
  followUp?: FollowUpPlan | null
  /** Rendered inside the urgent banner, e.g. the "schedule follow-up" button. */
  action?: React.ReactNode
  language?: "fr" | "en"
  /**
   * Suppress the "triage not assessed" notice. Used on read-only viewers of
   * past consultations, where legacy reports predate the triage block and the
   * notice would be pure noise (the consultation is already closed).
   */
  hideUnassessed?: boolean
}

/**
 * Lets a call-to-action button fit a phone.
 *
 * The buttons handed in as `action` come from the report pages and carry the
 * shadcn defaults, `whitespace-nowrap` among them. "Programmer la consultation
 * de contrôle" therefore refused to wrap, overflowed its column, and had its
 * right-hand end clipped by the card — the doctor saw "…grammer la consultation
 * de contrô". Below `sm` the button takes the full width and is allowed to run
 * onto a second line; from `sm` up it goes back to its natural size.
 */
const ACTION_FITS =
  "[&>button]:h-auto [&>button]:w-full [&>button]:whitespace-normal [&>button]:py-2 [&>button]:leading-snug sm:[&>button]:w-auto"

const TEXT = {
  fr: {
    emergencyTitle: "CAS URGENT",
    emergencySub: "PRISE EN CHARGE MÉDICALE IMMÉDIATE REQUISE",
    emergencyBody: "Cette consultation nécessite un transfert hospitalier urgent — ne pas différer.",
    urgentTitle: "Suivi rapproché requis",
    urgentNoAE: "N'orientez pas le patient vers les urgences.",
    urgentBody: (d: string) => `Programmez une consultation de contrôle sous ${d}.`,
    urgentLabs: "Délai ajusté pour tenir compte du temps de rendu des analyses.",
    criteria: "Critères retenus",
    reviewTitle: "Consultation de contrôle recommandée",
    unassessedTitle: "Triage automatique non abouti",
    unassessedBody:
      "Le niveau d'urgence n'a pas pu être déterminé automatiquement pour cette consultation. Évaluez vous-même le degré d'urgence avant de valider le rapport.",
  },
  en: {
    emergencyTitle: "EMERGENCY CASE",
    emergencySub: "IMMEDIATE MEDICAL ATTENTION REQUIRED",
    emergencyBody: "This consultation requires urgent hospital referral — do not delay.",
    urgentTitle: "Close follow-up required",
    urgentNoAE: "Do not refer the patient to A&E.",
    urgentBody: (d: string) => `Schedule a review consultation within ${d}.`,
    urgentLabs: "Delay adjusted to account for laboratory turnaround time.",
    criteria: "Criteria met",
    reviewTitle: "Review consultation recommended",
    unassessedTitle: "Automatic triage did not complete",
    unassessedBody:
      "The urgency level could not be determined automatically for this consultation. Assess the level of urgency yourself before validating the report.",
  },
} as const

export default function TriageBanner({
  triage,
  followUp,
  action,
  language = "fr",
  hideUnassessed = false,
}: TriageBannerProps) {
  const t = TEXT[language] ?? TEXT.fr

  // A routine case can still need a review consultation when urgent
  // investigations are pending — surface it (calmly) so the call to action
  // has somewhere to live.
  if (triage.level === "routine") {
    if (!followUp) return null
    return (
      <div className="mb-6 rounded-lg border-2 border-sky-300 bg-sky-50 p-4 print:shadow-none">
        <div className="flex items-start gap-3">
          <CalendarClock className="h-6 w-6 flex-shrink-0 text-sky-600" />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sky-900">{t.reviewTitle}</h3>
            <p className="mt-1 break-words text-sm text-sky-800">
              {t.urgentBody(formatDelay(followUp.delayHours, language))} — {followUp.reason}
            </p>
            {action && <div className={cn("mt-3 print:hidden", ACTION_FITS)}>{action}</div>}
          </div>
        </div>
      </div>
    )
  }
  if (triage.level === "unassessed" && hideUnassessed) return null

  // ---------- 🔴 EMERGENCY ----------
  if (triage.level === "emergency") {
    return (
      <div
        role="alert"
        className="mb-6 p-4 sm:p-6 bg-red-600 text-white rounded-lg border-4 border-red-700 shadow-2xl animate-pulse print:animate-none print:bg-red-100 print:text-red-900 print:border-red-900"
      >
        {/* Sized for a phone first. Two 60px sirens and a 30px heading fitted a
            desktop and nothing else: on the 360px screen this is actually read
            on, they left barely a third of the width for the words, and the
            criteria — the part a receiving hospital needs — wrapped into a
            column one word wide. The second siren goes at small widths; the
            first one is the alarm, the second was decoration. */}
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <div className="shrink-0 text-4xl sm:text-6xl">🚨</div>
          <div className="min-w-0 flex-1">
            <h2 className="mb-1 text-xl font-black tracking-wide sm:mb-2 sm:text-3xl">
              ⚠️ {t.emergencyTitle} ⚠️
            </h2>
            <p className="text-base font-bold sm:text-xl">{t.emergencySub}</p>
            <p className="mt-2 text-sm sm:text-lg">{t.emergencyBody}</p>
            {triage.criteriaMet.length > 0 && (
              <p className="mt-3 break-words text-xs opacity-90 sm:text-sm">
                <span className="font-semibold">{t.criteria} : </span>
                {triage.criteriaMet.join(" · ")}
              </p>
            )}
          </div>
          <div className="hidden shrink-0 text-6xl sm:block">🚨</div>
        </div>
      </div>
    )
  }

  // ---------- 🟠 URGENT ----------
  if (triage.level === "urgent") {
    const delayLabel = followUp ? formatDelay(followUp.delayHours, language) : null
    return (
      <div
        role="alert"
        className="mb-6 p-4 sm:p-5 rounded-lg border-4 border-orange-400 bg-orange-50 shadow-xl print:shadow-none"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <AlertTriangle className="h-7 w-7 flex-shrink-0 text-orange-600 sm:h-10 sm:w-10" />
          <div className="min-w-0 flex-1">
            <h2 className="mb-1 text-lg font-black text-orange-900 sm:text-2xl">{t.urgentTitle}</h2>
            <p className="text-sm font-bold text-orange-900 sm:text-base">{t.urgentNoAE}</p>
            {delayLabel && (
              <p className="mt-1 flex items-start gap-2 text-base font-semibold text-orange-800 sm:items-center sm:text-lg">
                <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
                <span className="min-w-0">{t.urgentBody(delayLabel)}</span>
              </p>
            )}
            {followUp?.adjustedForLabs && (
              <p className="mt-1 text-xs text-orange-700 sm:text-sm">{t.urgentLabs}</p>
            )}
            {triage.criteriaMet.length > 0 && (
              <p className="mt-2 break-words text-xs text-orange-800 sm:text-sm">
                <span className="font-semibold">{t.criteria} : </span>
                {triage.criteriaMet.join(" · ")}
              </p>
            )}
            {action && <div className={cn("mt-4 print:hidden", ACTION_FITS)}>{action}</div>}
          </div>
        </div>
      </div>
    )
  }

  // ---------- ⚪ UNASSESSED ----------
  return (
    <div
      role="status"
      className="mb-6 p-4 rounded-lg border-2 border-slate-300 bg-slate-50 print:shadow-none"
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="h-6 w-6 flex-shrink-0 text-slate-500" />
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800">{t.unassessedTitle}</h3>
          <p className="mt-1 break-words text-sm text-slate-700">{t.unassessedBody}</p>
        </div>
      </div>
    </div>
  )
}
