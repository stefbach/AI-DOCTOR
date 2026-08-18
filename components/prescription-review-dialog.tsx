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
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  type ImagingSnapshot,
  type LabSnapshot,
  type MedicationSnapshot,
  type ReviewAlert,
  type ReviewSeverity,
  type ReviewTarget,
  NARRATIVE_SECTIONS,
  isBlocking,
  imagingLabel,
  labLabel,
  medLabel,
  narrativeLabel,
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
  // A doctor told to fix something had to close this, find the tab, find the
  // line, and remember what the alert said. Prescription lines became editable
  // here first; labs, imaging and the report's own sections kept sending the
  // doctor away, which is the same hunt the dialog exists to remove. Every
  // target an alert can name is now correctable in place, and the doctor is
  // only sent back to the document when there is genuinely nothing here to
  // correct.

  /** Everything an alert can name, so it can be matched to what it describes. */
  medications?: MedicationSnapshot[]
  laboratory?: LabSnapshot[]
  imaging?: ImagingSnapshot[]
  /** Report sections, keyed by report field name. */
  narrative?: Record<string, string>

  onApplyMedicationEdit?: (index: number, patch: Partial<MedicationSnapshot>) => void
  onApplyLabEdit?: (category: string, index: number, patch: Partial<LabSnapshot>) => void
  onApplyImagingEdit?: (index: number, patch: Partial<ImagingSnapshot>) => void
  onApplyNarrativeEdit?: (key: string, value: string) => void

  // Removal, because the commonest finding about an investigation is that it
  // is not indicated — and rewording it does not answer that.
  onRemoveMedication?: (index: number) => void
  onRemoveLab?: (category: string, index: number) => void
  onRemoveImaging?: (index: number) => void

  /**
   * Identifies this review run. Local state (justification, what has been
   * corrected) resets when it changes — and only then. The alert list itself
   * is refreshed live as the doctor corrects, so resetting on the list would
   * wipe a half-written justification every time they fixed a line.
   */
  reviewKey?: string | null
  /** Re-run the review after edits, since the alerts on screen are now stale. */
  onRecheck?: () => void
  /** Last resort: nothing of that kind exists to correct here. */
  onGoToTarget?: (target: ReviewTarget) => void
}

const MIN_JUSTIFICATION = 10

/**
 * Identify an alert by what it says, not by its id: ids come from a module
 * counter and are regenerated every time the rule layer re-runs, so keying on
 * them would remount a card — and lose an editor the doctor is typing in —
 * each time anything else changed.
 */
const alertKey = (a: ReviewAlert) => `${a.severity}|${a.issue}|${a.item}`

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
    fieldTestName: "Analyse",
    fieldCategory: "Catégorie",
    fieldClinicalReason: "Motif clinique",
    fieldUrgent: "Urgent",
    fieldExamType: "Examen",
    fieldModality: "Modalité",
    fieldRegion: "Région",
    fieldIndication: "Indication clinique",
    remove: "Retirer",
    removeConfirm: "Confirmer le retrait",
    cancel: "Annuler",
    handled: "Corrigé — à revérifier",
    noMatch: "Aucune ligne ne correspond exactement à cette alerte — choisissez celle à corriger :",
    pickOne: "Quelle ligne corriger ?",
    pickSection: "Quelle section corriger ?",
    sectionEmpty: "(section vide)",
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
    fieldTestName: "Test",
    fieldCategory: "Category",
    fieldClinicalReason: "Clinical indication",
    fieldUrgent: "Urgent",
    fieldExamType: "Examination",
    fieldModality: "Modality",
    fieldRegion: "Region",
    fieldIndication: "Clinical indication",
    remove: "Remove",
    removeConfirm: "Confirm removal",
    cancel: "Cancel",
    handled: "Fixed — needs re-check",
    noMatch: "No line matches this alert exactly — pick the one to fix:",
    pickOne: "Which line do you want to fix?",
    pickSection: "Which section do you want to fix?",
    sectionEmpty: "(empty section)",
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

const LAB_FIELDS: { key: keyof LabSnapshot; label: keyof (typeof TEXT)["fr"] }[] = [
  { key: "nom", label: "fieldTestName" },
  { key: "category", label: "fieldCategory" },
  { key: "motifClinique", label: "fieldClinicalReason" },
]

const IMAGING_FIELDS: { key: keyof ImagingSnapshot; label: keyof (typeof TEXT)["fr"] }[] = [
  { key: "type", label: "fieldExamType" },
  { key: "modalite", label: "fieldModality" },
  { key: "region", label: "fieldRegion" },
  { key: "indicationClinique", label: "fieldIndication" },
]

/**
 * Fold a label for comparison. The model writes an alert's subject in its own
 * words — "Dengue NS1 antigen", "the dengue serology", "Prise en charge" —
 * while the document holds one exact spelling. Accents, case and punctuation
 * must not decide whether the doctor gets an editor or a dead end.
 */
function fold(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Does an alert's subject name this item?
 *
 * Exact and loose are answered separately, because "Conclusion" is contained
 * in "Conclusion diagnostique": on containment alone it names two sections at
 * once, and the doctor is asked to choose between an obvious answer and a
 * wrong one. An exact hit, when there is one, settles it.
 *
 * Separators are ignored on both sides, so "chest xray" and "Chest X-ray"
 * are the same examination.
 */
function namesItem(alertSubjects: string[], candidates: string[]): "exact" | "loose" | false {
  const compact = (s: string) => s.replace(/ /g, "")
  const subjects = alertSubjects.map(fold).filter((s) => s.length >= 3)
  const targets = candidates.map(fold).filter((s) => s.length >= 3)
  if (!subjects.length || !targets.length) return false

  if (subjects.some((s) => targets.some((c) => s === c || compact(s) === compact(c)))) return "exact"
  if (
    subjects.some((s) =>
      targets.some(
        (c) =>
          s.includes(c) || c.includes(s) || compact(s).includes(compact(c)) || compact(c).includes(compact(s)),
      ),
    )
  ) {
    return "loose"
  }
  return false
}

/** Exact matches when there are any, loose ones otherwise. */
function bestMatches<T>(items: T[], subjectsOf: (item: T) => string[], subjects: string[]): T[] {
  const scored = items
    .map((item) => ({ item, hit: namesItem(subjects, subjectsOf(item)) }))
    .filter(({ hit }) => hit !== false)
  const exact = scored.filter(({ hit }) => hit === "exact")
  return (exact.length ? exact : scored).map(({ item }) => item)
}

/** Two-step removal: a stray click must not drop a line before signature. */
function RemoveButton({ t, onRemove }: { t: (typeof TEXT)["fr"]; onRemove: () => void }) {
  const [armed, setArmed] = React.useState(false)
  if (!armed) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setArmed(true)}
        className="h-8 border-red-300 bg-white text-xs text-red-700 hover:bg-red-50"
      >
        <Trash2 className="mr-1 h-3 w-3" />
        {t.remove}
      </Button>
    )
  }
  return (
    <div className="flex gap-1.5">
      <Button size="sm" onClick={onRemove} className="h-8 bg-red-600 text-xs hover:bg-red-700">
        {t.removeConfirm}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setArmed(false)} className="h-8 text-xs">
        {t.cancel}
      </Button>
    </div>
  )
}

/**
 * A row of short text fields over one item, applied as a partial patch.
 * Shared by prescription lines, laboratory tests and imaging studies: they
 * differ only in which fields they show.
 */
function FieldEditor<T extends Record<string, any>>({
  item,
  fields,
  t,
  onApply,
  onRemove,
  urgentKey,
}: {
  item: T
  fields: { key: keyof T; label: keyof (typeof TEXT)["fr"] }[]
  t: (typeof TEXT)["fr"]
  onApply: (patch: Partial<T>) => void
  onRemove?: () => void
  /** When set, that boolean field gets a checkbox. */
  urgentKey?: keyof T
}) {
  const [draft, setDraft] = React.useState<Partial<T>>({})
  const value = (key: keyof T) => (draft[key] as string | undefined) ?? ((item[key] as string) || "")
  const checked = urgentKey
    ? ((draft[urgentKey] as boolean | undefined) ?? !!item[urgentKey])
    : false

  return (
    <div className="mt-2 rounded border border-gray-300 bg-white p-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ key, label }) => (
          <div key={String(key)}>
            <label className="text-[10px] font-semibold uppercase text-gray-500">
              {t[label] as string}
            </label>
            <Input
              value={value(key)}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              className="mt-0.5 h-8 text-sm"
              autoComplete="off"
            />
          </div>
        ))}
      </div>
      {urgentKey && (
        <label className="mt-2 flex items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setDraft((d) => ({ ...d, [urgentKey]: e.target.checked }) as Partial<T>)}
            className="h-3.5 w-3.5"
          />
          {t.fieldUrgent}
        </label>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          onClick={() => onApply(draft)}
          disabled={Object.keys(draft).length === 0}
          className="h-8 bg-blue-600 text-xs hover:bg-blue-700"
        >
          {t.apply}
        </Button>
        {onRemove && <RemoveButton t={t} onRemove={onRemove} />}
      </div>
    </div>
  )
}

/**
 * A report section, editable as the paragraph it is.
 *
 * These are the alerts that used to cost the most: a contradiction in the
 * management plan meant closing the dialog, finding the section, and rewriting
 * from memory what the alert had said. The alert stays on screen above the
 * text being rewritten.
 */
function NarrativeEditor({
  value,
  t,
  onApply,
}: {
  value: string
  t: (typeof TEXT)["fr"]
  onApply: (next: string) => void
}) {
  const [draft, setDraft] = React.useState(value)
  React.useEffect(() => setDraft(value), [value])

  return (
    <div className="mt-2 rounded border border-gray-300 bg-white p-2">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={8}
        className="text-sm"
        placeholder={t.sectionEmpty}
      />
      <Button
        size="sm"
        onClick={() => onApply(draft)}
        disabled={draft === value}
        className="mt-2 h-8 bg-blue-600 text-xs hover:bg-blue-700"
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
  laboratory,
  imaging,
  narrative,
  onApplyMedicationEdit,
  onApplyLabEdit,
  onApplyImagingEdit,
  onApplyNarrativeEdit,
  onRemoveMedication,
  onRemoveLab,
  onRemoveImaging,
  onGoToTarget,
  handled,
  onHandled,
}: {
  alert: ReviewAlert
  t: (typeof TEXT)["fr"]
  language: ReviewLanguage
  medications?: MedicationSnapshot[]
  laboratory?: LabSnapshot[]
  imaging?: ImagingSnapshot[]
  narrative?: Record<string, string>
  onApplyMedicationEdit?: (index: number, patch: Partial<MedicationSnapshot>) => void
  onApplyLabEdit?: (category: string, index: number, patch: Partial<LabSnapshot>) => void
  onApplyImagingEdit?: (index: number, patch: Partial<ImagingSnapshot>) => void
  onApplyNarrativeEdit?: (key: string, value: string) => void
  onRemoveMedication?: (index: number) => void
  onRemoveLab?: (category: string, index: number) => void
  onRemoveImaging?: (index: number) => void
  onGoToTarget?: (target: ReviewTarget) => void
  /** The doctor corrected something from this card; it describes the old text. */
  handled?: boolean
  onHandled?: () => void
}) {
  const style = SEVERITY_STYLES[alert.severity]
  const message = language === "fr" ? alert.message : alert.messageEn || alert.message
  const suggestion = language === "fr" ? alert.suggestion : alert.suggestionEn || alert.suggestion
  const [editing, setEditing] = React.useState(false)

  const subjects = React.useMemo(
    () => (alert.items?.length ? alert.items : [alert.item]).filter(Boolean),
    [alert],
  )

  // Which items of the alert's own kind it is about.
  //
  // Prescription lines are matched on the exact label the rules built the
  // alert from — one definition of "which line is this". The other kinds come
  // from the model, which names them in its own words, so those are matched
  // loosely. When the loose match finds nothing, the doctor is offered the
  // list to pick from rather than being sent back to the document: a wrong
  // guess would silently edit the wrong test.
  /**
   * Which item the alert is about, and of what kind.
   *
   * The kind comes from the alert's `target`, which the model fills in and
   * sometimes gets wrong: a real review returned an alert about "CT Scan
   * CÉRÉBRAL" labelled `medication`. Nothing matched among the medications, so
   * the whole list was offered as a fallback — and the list held exactly one
   * line, Paracetamol, which then appeared under the CT scan alert as though
   * it were the thing to fix.
   *
   * So the ITEM decides, not the label. The declared target is tried first;
   * when nothing there matches, the other three are searched, and a single
   * unambiguous hit wins. The model classifies; the item names.
   */
  const editable = React.useMemo(() => {
    const poolFor = (target: ReviewTarget) => {
      if (target === "medication") {
        const wanted = new Set(subjects)
        const all = (medications || []).map((med, index) => ({ med, index }))
        // The rules build a medication alert from medLabel itself, so an exact
        // label hit is authoritative; the loose pass only serves AI alerts.
        const byLabel = all.filter(({ med }) => wanted.has(medLabel(med)))
        return {
          all,
          matched: byLabel.length
            ? byLabel
            : bestMatches(all, ({ med }) => [medLabel(med), med.nom, med.dci], subjects),
        }
      }
      if (target === "laboratory") {
        const all = laboratory || []
        return {
          all,
          matched: bestMatches(all, (test) => [labLabel(test), test.nom, test.category], subjects),
        }
      }
      if (target === "imaging") {
        const all = (imaging || []).map((exam, index) => ({ exam, index }))
        return {
          all,
          matched: bestMatches(
            all,
            ({ exam }) => [imagingLabel(exam), exam.type, exam.modalite, exam.region],
            subjects,
          ),
        }
      }
      const present = NARRATIVE_SECTIONS.filter((s) => narrative && s.key in narrative)
      const all = present.map((s) => ({ key: s.key, value: narrative?.[s.key] || "" }))
      return {
        all,
        matched: bestMatches(
          all,
          ({ key }) => [key, narrativeLabel(key, "fr"), narrativeLabel(key, "en")],
          subjects,
        ),
      }
    }

    const declared = poolFor(alert.target)
    if ((declared.matched as any[]).length) {
      return { target: alert.target, ...declared, unmatched: false }
    }

    // The label was wrong, or the item is simply not in the document. Look
    // everywhere else before giving up.
    const others = (["medication", "laboratory", "imaging", "diagnosis"] as ReviewTarget[])
      .filter((t) => t !== alert.target)
      .map((t) => ({ target: t, ...poolFor(t) }))
      .filter((p) => (p.matched as any[]).length)

    if (others.length === 1) {
      return { ...others[0], unmatched: false }
    }

    // Nothing found, or found in several places at once. Fall back to the
    // declared kind — and say so, because presenting an unrelated line as the
    // answer is exactly the failure this comment exists to describe.
    return { target: alert.target, ...declared, unmatched: true }
  }, [alert.target, subjects, medications, laboratory, imaging, narrative])

  const resolvedTarget = editable.target

  const handlerPresent =
    resolvedTarget === "medication" ? !!onApplyMedicationEdit
    : resolvedTarget === "laboratory" ? !!onApplyLabEdit
    : resolvedTarget === "imaging" ? !!onApplyImagingEdit
    : !!onApplyNarrativeEdit

  const canEditHere = handlerPresent && (editable.all as any[]).length > 0
  // Only when there is nothing of that kind in the document at all.
  const canJump = !canEditHere && !!onGoToTarget

  const shown = (editable.matched as any[]).length ? editable.matched : editable.all
  // Ask which whenever the choice is not settled: several candidates, OR none
  // matched at all. That second case used to pass silently when the document
  // held a single line of that kind — the doctor was shown one editor and had
  // every reason to believe it was the line the alert named.
  const needsPicking = editable.unmatched || (shown as any[]).length > 1

  const done = () => {
    setEditing(false)
    onHandled?.()
  }

  return (
    <div className={cn("rounded-md border p-3", style.box, handled && "opacity-60")}>
      <div className="flex items-start gap-2">
        {style.icon}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", style.chip)}>
              {t.severity[alert.severity]}
            </span>
            <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
              {t.target[resolvedTarget] || resolvedTarget}
            </span>
            {alert.source === "rule" && (
              <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                auto
              </span>
            )}
            {handled && (
              <span className="flex items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                <CheckCircle2 className="h-3 w-3" />
                {t.handled}
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
                  onClick={() => onGoToTarget?.(resolvedTarget)}
                  className="h-7 bg-white text-xs"
                >
                  <ArrowRight className="mr-1 h-3 w-3" />
                  {t.goToTarget}
                </Button>
              )}
            </div>
          )}

          {editing && (
            <div>
              {needsPicking && (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {editable.unmatched
                    ? t.noMatch
                    : resolvedTarget === "diagnosis" ? t.pickSection : t.pickOne}
                </p>
              )}

              {resolvedTarget === "medication" &&
                (shown as { med: MedicationSnapshot; index: number }[]).map(({ med, index }) => (
                  <div key={`med-${index}`}>
                    <p className="mt-2 text-[11px] font-semibold text-gray-600">{medLabel(med)}</p>
                    <FieldEditor
                      item={med}
                      fields={EDITABLE_FIELDS}
                      t={t}
                      onApply={(patch) => {
                        onApplyMedicationEdit?.(index, patch)
                        done()
                      }}
                      onRemove={
                        onRemoveMedication ? () => { onRemoveMedication(index); done() } : undefined
                      }
                    />
                  </div>
                ))}

              {resolvedTarget === "laboratory" &&
                (shown as LabSnapshot[]).map((test) => (
                  <div key={`lab-${test.category}-${test.index}`}>
                    <p className="mt-2 text-[11px] font-semibold text-gray-600">
                      {labLabel(test)} <span className="font-normal text-gray-500">— {test.category}</span>
                    </p>
                    <FieldEditor
                      item={test}
                      fields={LAB_FIELDS}
                      t={t}
                      urgentKey="urgence"
                      onApply={(patch) => {
                        onApplyLabEdit?.(test.category, test.index, patch)
                        done()
                      }}
                      onRemove={
                        onRemoveLab
                          ? () => { onRemoveLab(test.category, test.index); done() }
                          : undefined
                      }
                    />
                  </div>
                ))}

              {resolvedTarget === "imaging" &&
                (shown as { exam: ImagingSnapshot; index: number }[]).map(({ exam, index }) => (
                  <div key={`img-${index}`}>
                    <p className="mt-2 text-[11px] font-semibold text-gray-600">{imagingLabel(exam)}</p>
                    <FieldEditor
                      item={exam}
                      fields={IMAGING_FIELDS}
                      t={t}
                      urgentKey="urgence"
                      onApply={(patch) => {
                        onApplyImagingEdit?.(index, patch)
                        done()
                      }}
                      onRemove={
                        onRemoveImaging ? () => { onRemoveImaging(index); done() } : undefined
                      }
                    />
                  </div>
                ))}

              {resolvedTarget === "diagnosis" &&
                (shown as { key: string; value: string }[]).map(({ key, value }) => (
                  <div key={`nar-${key}`}>
                    <p className="mt-2 text-[11px] font-semibold text-gray-600">
                      {narrativeLabel(key, language)}
                    </p>
                    <NarrativeEditor
                      value={value}
                      t={t}
                      onApply={(next) => {
                        onApplyNarrativeEdit?.(key, next)
                        done()
                      }}
                    />
                  </div>
                ))}
            </div>
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
  medications,
  laboratory,
  imaging,
  narrative,
  onApplyMedicationEdit,
  onApplyLabEdit,
  onApplyImagingEdit,
  onApplyNarrativeEdit,
  onRemoveMedication,
  onRemoveLab,
  onRemoveImaging,
  reviewKey,
  onRecheck,
  onGoToTarget,
}: PrescriptionReviewDialogProps) {
  const t = TEXT[language] || TEXT.fr
  const [justification, setJustification] = React.useState("")
  // Set as soon as a line is edited from here: the alerts on screen were
  // computed against the document as it was, so they no longer describe it.
  const [edited, setEdited] = React.useState(false)
  // Which alerts the doctor has corrected from. Their text describes the
  // document as it was, so they are dimmed and badged rather than left looking
  // like live findings.
  const [handled, setHandled] = React.useState<Set<string>>(new Set())

  // A fresh review is a fresh decision — never carry a previous justification
  // over to a new one. Keyed on the review, NOT on the alert list: the rule
  // layer now refreshes that list live as the doctor corrects, and resetting
  // on it would wipe a half-written justification at every fix.
  React.useEffect(() => {
    if (open) {
      setJustification("")
      setEdited(false)
      setHandled(new Set())
    }
  }, [open, reviewKey])

  // Every correction made from here invalidates the alerts on screen, so each
  // handler is wrapped once rather than at each of the two call sites.
  const editHandlers = React.useMemo(() => {
    const flag = <A extends any[]>(fn?: (...args: A) => void) =>
      fn ? (...args: A) => { fn(...args); setEdited(true) } : undefined
    return {
      onApplyMedicationEdit: flag(onApplyMedicationEdit),
      onApplyLabEdit: flag(onApplyLabEdit),
      onApplyImagingEdit: flag(onApplyImagingEdit),
      onApplyNarrativeEdit: flag(onApplyNarrativeEdit),
      onRemoveMedication: flag(onRemoveMedication),
      onRemoveLab: flag(onRemoveLab),
      onRemoveImaging: flag(onRemoveImaging),
    }
  }, [
    onApplyMedicationEdit, onApplyLabEdit, onApplyImagingEdit, onApplyNarrativeEdit,
    onRemoveMedication, onRemoveLab, onRemoveImaging,
  ])

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

                {/* Above the list, not below it: it says the alerts underneath
                    are out of date, which is no use after reading them all. */}
                {edited && (
                  <div className="mt-3 flex flex-col gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
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

                {alerts.length === 0 ? (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    <p className="text-sm font-medium text-green-900">{t.clean}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {blocking.map((a) => (
                      <AlertCard
                        key={alertKey(a)}
                        alert={a}
                        t={t}
                        language={language}
                        medications={medications}
                        laboratory={laboratory}
                        imaging={imaging}
                        narrative={narrative}
                        {...editHandlers}
                        onGoToTarget={onGoToTarget}
                        handled={handled.has(alertKey(a))}
                        onHandled={() =>
                          setHandled((prev) => new Set(prev).add(alertKey(a)))
                        }
                      />
                    ))}
                    {advisory.length > 0 && blocking.length > 0 && (
                      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t.advisoryIntro}
                      </p>
                    )}
                    {advisory.map((a) => (
                      <AlertCard
                        key={alertKey(a)}
                        alert={a}
                        t={t}
                        language={language}
                        medications={medications}
                        laboratory={laboratory}
                        imaging={imaging}
                        narrative={narrative}
                        {...editHandlers}
                        onGoToTarget={onGoToTarget}
                        handled={handled.has(alertKey(a))}
                        onHandled={() =>
                          setHandled((prev) => new Set(prev).add(alertKey(a)))
                        }
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
