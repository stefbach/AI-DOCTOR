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
  ArrowRight,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  type MedicationSnapshot,
  type ReviewAlert,
  type ReviewSeverity,
  type ReviewTarget,
  isBlocking,
  medLabel,
} from "@/lib/prescription-review"

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

  // ---- Correcting without leaving the dialog -----------------------------
  // A doctor told to fix a prescription line had to close this, find the tab,
  // find the line, and remember what the alert said. For a sentence buried in
  // a report that is a long hunt. So the lines an alert names are editable
  // here, and anything not editable here gets a button that opens the right
  // place instead of leaving them to look for it.

  /** Current prescription lines, so an alert can be matched to what it names. */
  medications?: MedicationSnapshot[]
  /** Apply a partial edit to one prescription line. */
  onApplyMedicationEdit?: (index: number, patch: Partial<MedicationSnapshot>) => void
  /** Re-run the review after edits, since the alerts on screen are now stale. */
  onRecheck?: () => void
  /** Close and take the doctor to the part of the document an alert concerns. */
  onGoToTarget?: (target: ReviewTarget) => void
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
    editLine: "Corriger ici",
    closeEditor: "Fermer",
    apply: "Appliquer",
    goToTarget: "Aller corriger",
    edited: "Modifications appliquées. Les alertes ci-dessus ne tiennent plus compte de vos corrections.",
    recheck: "Revérifier",
    fieldName: "Médicament",
    fieldDosage: "Dosage",
    fieldForm: "Forme",
    fieldPosology: "Posologie",
    fieldRoute: "Voie",
    fieldDuration: "Durée",
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
    editLine: "Fix it here",
    closeEditor: "Close",
    apply: "Apply",
    goToTarget: "Go and fix",
    edited: "Changes applied. The alerts above no longer reflect your corrections.",
    recheck: "Re-check",
    fieldName: "Medication",
    fieldDosage: "Strength",
    fieldForm: "Form",
    fieldPosology: "Posology",
    fieldRoute: "Route",
    fieldDuration: "Duration",
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

const EDITABLE_FIELDS: { key: keyof MedicationSnapshot; label: keyof (typeof TEXT)["fr"] }[] = [
  { key: "nom", label: "fieldName" },
  { key: "dosage", label: "fieldDosage" },
  { key: "forme", label: "fieldForm" },
  { key: "posologie", label: "fieldPosology" },
  { key: "modeAdministration", label: "fieldRoute" },
  { key: "dureeTraitement", label: "fieldDuration" },
]

/** One prescription line, editable in place. */
function MedicationEditor({
  med,
  t,
  onApply,
}: {
  med: MedicationSnapshot
  t: (typeof TEXT)["fr"]
  onApply: (patch: Partial<MedicationSnapshot>) => void
}) {
  const [draft, setDraft] = React.useState<Partial<MedicationSnapshot>>({})
  const value = (key: keyof MedicationSnapshot) =>
    (draft[key] as string | undefined) ?? ((med[key] as string) || "")

  return (
    <div className="mt-2 rounded border border-gray-300 bg-white p-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {EDITABLE_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="text-[10px] font-semibold uppercase text-gray-500">{t[label] as string}</label>
            <Input
              value={value(key)}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              className="mt-0.5 h-8 text-sm"
              autoComplete="off"
            />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        onClick={() => onApply(draft)}
        disabled={Object.keys(draft).length === 0}
        className="mt-2 h-8 bg-blue-600 hover:bg-blue-700"
      >
        {t.apply}
      </Button>
    </div>
  )
}

function AlertCard({
  alert,
  t,
  language,
  medications,
  onApplyMedicationEdit,
  onGoToTarget,
}: {
  alert: ReviewAlert
  t: (typeof TEXT)["fr"]
  language: ReviewLanguage
  medications?: MedicationSnapshot[]
  onApplyMedicationEdit?: (index: number, patch: Partial<MedicationSnapshot>) => void
  onGoToTarget?: (target: ReviewTarget) => void
}) {
  const style = SEVERITY_STYLES[alert.severity]
  const message = language === "fr" ? alert.message : alert.messageEn || alert.message
  const suggestion = language === "fr" ? alert.suggestion : alert.suggestionEn || alert.suggestion
  const [editing, setEditing] = React.useState(false)

  // Match the alert to the lines it names, using the same label the rules
  // built it from, so there is one definition of "which line is this".
  const concerned = React.useMemo(() => {
    if (!medications?.length) return []
    const wanted = new Set(alert.items?.length ? alert.items : [alert.item])
    return medications
      .map((m, index) => ({ med: m, index }))
      .filter(({ med }) => wanted.has(medLabel(med)))
  }, [medications, alert])

  const canEditHere = alert.target === "medication" && concerned.length > 0 && !!onApplyMedicationEdit
  const canJump = !canEditHere && !!onGoToTarget

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

          {(canEditHere || canJump) && (
            <div className="mt-2">
              {canEditHere ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing((v) => !v)}
                  className="h-7 bg-white text-xs"
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  {editing ? t.closeEditor : t.editLine}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onGoToTarget?.(alert.target)}
                  className="h-7 bg-white text-xs"
                >
                  <ArrowRight className="mr-1 h-3 w-3" />
                  {t.goToTarget}
                </Button>
              )}
            </div>
          )}

          {editing &&
            concerned.map(({ med, index }) => (
              <div key={index}>
                <p className="mt-2 text-[11px] font-semibold text-gray-600">{medLabel(med)}</p>
                <MedicationEditor
                  med={med}
                  t={t}
                  onApply={(patch) => {
                    onApplyMedicationEdit?.(index, patch)
                    setEditing(false)
                  }}
                />
              </div>
            ))}
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
  medications,
  onApplyMedicationEdit,
  onRecheck,
  onGoToTarget,
}: PrescriptionReviewDialogProps) {
  const t = TEXT[language] || TEXT.fr
  const [justification, setJustification] = React.useState("")
  // Set as soon as a line is edited from here: the alerts on screen were
  // computed against the document as it was, so they no longer describe it.
  const [edited, setEdited] = React.useState(false)

  // A fresh review is a fresh decision — never carry a previous justification
  // over to a new set of alerts.
  React.useEffect(() => {
    if (open) {
      setJustification("")
      setEdited(false)
    }
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
                      <AlertCard
                        key={a.id}
                        alert={a}
                        t={t}
                        language={language}
                        medications={medications}
                        onApplyMedicationEdit={
                          onApplyMedicationEdit
                            ? (i, patch) => {
                                onApplyMedicationEdit(i, patch)
                                setEdited(true)
                              }
                            : undefined
                        }
                        onGoToTarget={onGoToTarget}
                      />
                    ))}
                    {advisory.length > 0 && blocking.length > 0 && (
                      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t.advisoryIntro}
                      </p>
                    )}
                    {advisory.map((a) => (
                      <AlertCard
                        key={a.id}
                        alert={a}
                        t={t}
                        language={language}
                        medications={medications}
                        onApplyMedicationEdit={
                          onApplyMedicationEdit
                            ? (i, patch) => {
                                onApplyMedicationEdit(i, patch)
                                setEdited(true)
                              }
                            : undefined
                        }
                        onGoToTarget={onGoToTarget}
                      />
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

                {edited && (
                  <div className="mt-4 flex flex-col gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-blue-900">{t.edited}</p>
                    {onRecheck && (
                      <Button
                        size="sm"
                        onClick={() => onRecheck()}
                        className="h-8 shrink-0 bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        {t.recheck}
                      </Button>
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
