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
          <div className="flex-1">
            <h3 className="font-bold text-sky-900">{t.reviewTitle}</h3>
            <p className="mt-1 text-sm text-sky-800">
              {t.urgentBody(formatDelay(followUp.delayHours, language))} — {followUp.reason}
            </p>
            {action && <div className="mt-3 print:hidden">{action}</div>}
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
        className="mb-6 p-6 bg-red-600 text-white rounded-lg border-4 border-red-700 shadow-2xl animate-pulse print:animate-none print:bg-red-100 print:text-red-900 print:border-red-900"
      >
        <div className="flex items-center gap-4">
          <div className="text-6xl">🚨</div>
          <div className="flex-1">
            <h2 className="text-3xl font-black mb-2 tracking-wide">⚠️ {t.emergencyTitle} ⚠️</h2>
            <p className="text-xl font-bold">{t.emergencySub}</p>
            <p className="text-lg mt-2">{t.emergencyBody}</p>
            {triage.criteriaMet.length > 0 && (
              <p className="text-sm mt-3 opacity-90">
                <span className="font-semibold">{t.criteria} : </span>
                {triage.criteriaMet.join(" · ")}
              </p>
            )}
          </div>
          <div className="text-6xl">🚨</div>
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
        className="mb-6 p-5 rounded-lg border-4 border-orange-400 bg-orange-50 shadow-xl print:shadow-none"
      >
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-10 w-10 flex-shrink-0 text-orange-600" />
          <div className="flex-1">
            <h2 className="text-2xl font-black text-orange-900 mb-1">{t.urgentTitle}</h2>
            <p className="text-base font-bold text-orange-900">{t.urgentNoAE}</p>
            {delayLabel && (
              <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-orange-800">
                <CalendarClock className="h-5 w-5" />
                {t.urgentBody(delayLabel)}
              </p>
            )}
            {followUp?.adjustedForLabs && (
              <p className="mt-1 text-sm text-orange-700">{t.urgentLabs}</p>
            )}
            {triage.criteriaMet.length > 0 && (
              <p className="mt-2 text-sm text-orange-800">
                <span className="font-semibold">{t.criteria} : </span>
                {triage.criteriaMet.join(" · ")}
              </p>
            )}
            {action && <div className="mt-4 print:hidden">{action}</div>}
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
        <div>
          <h3 className="font-bold text-slate-800">{t.unassessedTitle}</h3>
          <p className="mt-1 text-sm text-slate-700">{t.unassessedBody}</p>
        </div>
      </div>
    </div>
  )
}
