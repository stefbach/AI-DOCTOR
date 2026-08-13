"use client"

// components/prescription-review-dialog.tsx
//
// Shown between "Validate and sign" and the actual signature, whenever the AI
// review found something in the doctor's edits.
//
// Deliberately NOT a hard block: a doctor mid-consultation with a real patient
// must always be able to move forward (the KYC incident of 2026-08 made that
// non-negotiable). Critical and major alerts require a written justification
// instead, which is recorded against the consultation. Minor and info alerts
// are shown and never block.
//
// The layout mirrors the KYC dialog for the same reason it was rewritten:
// this runs inside an iframe under a video pane, so the panel flows from the
// top, Content itself is the scroll container, and the actions are pinned to
// the bottom of the visible area.

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ShieldAlert,
  Stethoscope,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { type ReviewAlert, type ReviewSeverity, isBlocking } from "@/lib/prescription-review"

export type ReviewLanguage = "fr" | "en"

interface PrescriptionReviewDialogProps {
  open: boolean
  loading: boolean
  alerts: ReviewAlert[]
  /** True when the AI layer failed and only deterministic rules ran. */
  degraded?: boolean
  language?: ReviewLanguage
  /** Doctor accepts the review (no blocking alert, or after correcting). */
  onProceed: (justification: string) => void
  /** Doctor goes back to the document to fix something. */
  onCorrect: () => void
}

const MIN_JUSTIFICATION = 10

const TEXT = {
  fr: {
    title: "Contrôle clinique avant signature",
    analysing: "Analyse des modifications en cours…",
    analysingHint: "L'IA vérifie la cohérence de l'ordonnance, des examens et du diagnostic.",
    clean: "Aucune anomalie détectée",
    cleanBody:
      "Les modifications apportées au document sont cohérentes avec le cas clinique. Vous pouvez signer.",
    blockingIntro: (n: number) =>
      n === 1
        ? "1 point nécessite votre attention avant signature."
        : `${n} points nécessitent votre attention avant signature.`,
    advisoryIntro: "Points d'attention (non bloquants) :",
    degraded:
      "L'analyse IA n'a pas pu s'exécuter. Seules les vérifications automatiques ont été appliquées — le contrôle est partiel.",
    justificationLabel: "Justification clinique (obligatoire pour signer malgré les alertes)",
    justificationPlaceholder:
      "Expliquez pourquoi la prescription reste appropriée pour ce patient…",
    justificationTooShort: `Minimum ${MIN_JUSTIFICATION} caractères.`,
    correct: "Corriger le document",
    proceed: "Signer malgré tout",
    proceedClean: "Continuer et signer",
    suggestion: "À faire",
    severity: {
      critical: "Critique",
      major: "Important",
      minor: "Mineur",
      info: "Information",
    } as Record<ReviewSeverity, string>,
    target: {
      medication: "Ordonnance",
      laboratory: "Biologie",
      imaging: "Imagerie",
      diagnosis: "Diagnostic",
    } as Record<string, string>,
    responsibility:
      "Cet avis est consultatif. La décision et la responsabilité médicale restent les vôtres.",
  },
  en: {
    title: "Clinical check before signature",
    analysing: "Reviewing your changes…",
    analysingHint: "The AI is checking the prescription, investigations and diagnosis for coherence.",
    clean: "No issue detected",
    cleanBody:
      "Your changes are consistent with the clinical case. You can sign.",
    blockingIntro: (n: number) =>
      n === 1
        ? "1 point needs your attention before signing."
        : `${n} points need your attention before signing.`,
    advisoryIntro: "Advisory points (non-blocking):",
    degraded:
      "The AI analysis could not run. Only the automatic checks were applied — this review is partial.",
    justificationLabel: "Clinical justification (required to sign despite the alerts)",
    justificationPlaceholder: "Explain why the prescription remains appropriate for this patient…",
    justificationTooShort: `Minimum ${MIN_JUSTIFICATION} characters.`,
    correct: "Go back and correct",
    proceed: "Sign anyway",
    proceedClean: "Continue and sign",
    suggestion: "Action",
    severity: {
      critical: "Critical",
      major: "Important",
      minor: "Minor",
      info: "Information",
    } as Record<ReviewSeverity, string>,
    target: {
      medication: "Prescription",
      laboratory: "Laboratory",
      imaging: "Imaging",
      diagnosis: "Diagnosis",
    } as Record<string, string>,
    responsibility:
      "This is advisory. The clinical decision and responsibility remain yours.",
  },
}

const SEVERITY_STYLES: Record<ReviewSeverity, { box: string; chip: string; icon: React.ReactNode }> = {
  critical: {
    box: "border-red-300 bg-red-50",
    chip: "bg-red-600 text-white",
    icon: <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />,
  },
  major: {
    box: "border-orange-300 bg-orange-50",
    chip: "bg-orange-500 text-white",
    icon: <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />,
  },
  minor: {
    box: "border-amber-200 bg-amber-50",
    chip: "bg-amber-400 text-amber-950",
    icon: <Info className="h-4 w-4 text-amber-600 shrink-0" />,
  },
  info: {
    box: "border-blue-200 bg-blue-50",
    chip: "bg-blue-500 text-white",
    icon: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
  },
}

function AlertCard({
  alert,
  t,
  language,
}: {
  alert: ReviewAlert
  t: (typeof TEXT)["fr"]
  language: ReviewLanguage
}) {
  const style = SEVERITY_STYLES[alert.severity]
  const message = language === "fr" ? alert.message : alert.messageEn || alert.message
  const suggestion = language === "fr" ? alert.suggestion : alert.suggestionEn || alert.suggestion

  return (
    <div className={cn("rounded-md border p-3", style.box)}>
      <div className="flex items-start gap-2">
        {style.icon}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", style.chip)}>
              {t.severity[alert.severity]}
            </span>
            <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
              {t.target[alert.target] || alert.target}
            </span>
            {alert.source === "rule" && (
              <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                auto
              </span>
            )}
          </div>
          <p className="mt-1.5 break-words text-sm font-semibold text-gray-900">{alert.item}</p>
          <p className="mt-1 break-words text-sm leading-relaxed text-gray-800">{message}</p>
          {suggestion && (
            <p className="mt-1.5 break-words text-xs text-gray-700">
              <span className="font-semibold">{t.suggestion} : </span>
              {suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PrescriptionReviewDialog({
  open,
  loading,
  alerts,
  degraded = false,
  language = "fr",
  onProceed,
  onCorrect,
}: PrescriptionReviewDialogProps) {
  const t = TEXT[language] || TEXT.fr
  const [justification, setJustification] = React.useState("")

  // A fresh review is a fresh decision — never carry a previous justification
  // over to a new set of alerts.
  React.useEffect(() => {
    if (open) setJustification("")
  }, [open, alerts])

  const blocking = React.useMemo(() => alerts.filter(isBlocking), [alerts])
  const advisory = React.useMemo(() => alerts.filter((a) => !isBlocking(a)), [alerts])

  const needsJustification = blocking.length > 0
  const justificationOk = justification.trim().length >= MIN_JUSTIFICATION
  const canProceed = !loading && (!needsJustification || justificationOk)

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {/* Same geometry as the KYC dialog: top-anchored, Content scrolls. */}
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4">
          <DialogPrimitive.Content
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "relative w-full max-w-xl",
              "max-h-full overflow-y-auto overscroll-contain",
              "rounded-lg border bg-background p-4 shadow-lg",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            )}
          >
            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              {t.title}
            </DialogPrimitive.Title>

            {loading ? (
              // Radix requires a Description on every open dialog; without one
              // in this branch it warned on every review and told a screen
              // reader nothing about what the wait was for.
              <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <DialogPrimitive.Description className="text-sm font-medium text-gray-900">
                  {t.analysing}
                </DialogPrimitive.Description>
                <p className="max-w-sm text-xs text-gray-500">{t.analysingHint}</p>
              </div>
            ) : (
              <>
                <DialogPrimitive.Description className="mt-2 text-sm text-gray-600">
                  {alerts.length === 0
                    ? t.cleanBody
                    : needsJustification
                      ? t.blockingIntro(blocking.length)
                      : t.advisoryIntro}
                </DialogPrimitive.Description>

                {degraded && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{t.degraded}</span>
                  </div>
                )}

                {alerts.length === 0 ? (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    <p className="text-sm font-medium text-green-900">{t.clean}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {blocking.map((a) => (
                      <AlertCard key={a.id} alert={a} t={t} language={language} />
                    ))}
                    {advisory.length > 0 && blocking.length > 0 && (
                      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t.advisoryIntro}
                      </p>
                    )}
                    {advisory.map((a) => (
                      <AlertCard key={a.id} alert={a} t={t} language={language} />
                    ))}
                  </div>
                )}

                {needsJustification && (
                  <div className="mt-4">
                    <label
                      htmlFor="review-justification"
                      className="text-xs font-semibold text-gray-800"
                    >
                      {t.justificationLabel}
                    </label>
                    <Textarea
                      id="review-justification"
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder={t.justificationPlaceholder}
                      rows={3}
                      className="mt-1 text-sm"
                    />
                    {!justificationOk && justification.length > 0 && (
                      <p className="mt-1 text-[11px] text-red-600">{t.justificationTooShort}</p>
                    )}
                  </div>
                )}

                <p className="mt-3 text-[11px] leading-relaxed text-gray-500">{t.responsibility}</p>
              </>
            )}

            {/* Pinned actions: on a short viewport these must never fall below
                the fold — that is exactly how the KYC modal trapped a doctor. */}
            <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background px-4 pb-1 pt-3">
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  onClick={() => onProceed(justification.trim())}
                  disabled={!canProceed}
                  className={cn(
                    "w-full sm:w-auto",
                    needsJustification
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-green-600 hover:bg-green-700",
                  )}
                >
                  {needsJustification ? t.proceed : t.proceedClean}
                </Button>
                <Button
                  variant="outline"
                  onClick={onCorrect}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-1.5 h-4 w-4" />
                  {t.correct}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
