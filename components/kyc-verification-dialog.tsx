"use client"

// components/kyc-verification-dialog.tsx
// Mandatory KYC (patient identity verification) modal shown at the very start
// of every consultation (general, chronic, dermatology). The doctor must visually
// verify the patient's ID against the displayed details and approve before the
// consultation can proceed. The approval is recorded for compliance/audit.

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ShieldCheck, User, Loader2, AlertTriangle } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type KycLanguage = "fr" | "en"

interface KycPatientData {
  firstName?: string
  lastName?: string
  age?: string | number
  gender?: string
  [key: string]: any
}

interface KycVerificationDialogProps {
  open: boolean
  patientData: KycPatientData | null | undefined
  consultationId?: string | null
  patientId?: string | null
  doctorId?: string | null
  consultationType?: "general" | "chronic" | "dermatology" | string
  language?: KycLanguage
  onConfirmed: () => void
}

// ---- Bilingual copy (self-contained FR/EN) ----
const TEXT = {
  fr: {
    title: "Vérification d'identité (KYC)",
    subtitle:
      "Avant de démarrer, demandez au patient de présenter sa pièce d'identité et vérifiez qu'elle correspond aux informations ci-dessous.",
    patientDetails: "Détails du patient",
    lastName: "Nom",
    firstName: "Prénom",
    age: "Âge",
    gender: "Sexe",
    years: "ans",
    checkboxLabel:
      "Je confirme avoir vérifié la pièce d'identité du patient. KYC fait et approuvé.",
    confirm: "Confirmer et démarrer la consultation",
    saving: "Enregistrement…",
    error:
      "Impossible d'enregistrer la vérification. Vérifiez votre connexion et réessayez.",
    retry: "Réessayer",
    male: "Masculin",
    female: "Féminin",
    notProvided: "Non renseigné",
  },
  en: {
    title: "Identity Verification (KYC)",
    subtitle:
      "Before starting, ask the patient to show their ID and confirm it matches the details below.",
    patientDetails: "Patient details",
    lastName: "Last name",
    firstName: "First name",
    age: "Age",
    gender: "Sex",
    years: "yrs",
    checkboxLabel:
      "I confirm I have verified the patient's ID document. KYC done and approved.",
    confirm: "Confirm and start consultation",
    saving: "Saving…",
    error: "Could not record the verification. Check your connection and try again.",
    retry: "Retry",
    male: "Male",
    female: "Female",
    notProvided: "Not provided",
  },
} as const

function formatGender(gender: string | undefined, t: (typeof TEXT)["fr"]): string {
  if (!gender) return t.notProvided
  const g = String(gender).toLowerCase().trim()
  if (["m", "male", "masculin", "homme", "man"].includes(g)) return t.male
  if (["f", "female", "féminin", "feminin", "femme", "woman"].includes(g)) return t.female
  return gender
}

export default function KycVerificationDialog({
  open,
  patientData,
  consultationId,
  patientId,
  doctorId,
  consultationType,
  language = "en",
  onConfirmed,
}: KycVerificationDialogProps) {
  const t = TEXT[language] ?? TEXT.en
  const [approved, setApproved] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const firstName = patientData?.firstName?.toString().trim() || ""
  const lastName = patientData?.lastName?.toString().trim() || ""
  const ageValue = patientData?.age != null ? String(patientData.age).trim() : ""
  const genderLabel = formatGender(patientData?.gender, t)

  const handleConfirm = React.useCallback(async () => {
    if (!approved || isSaving) return
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/kyc-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: consultationId ?? null,
          patientId: patientId ?? null,
          doctorId: doctorId ?? null,
          consultationType: consultationType ?? null,
          approved: true,
          patientSnapshot: {
            firstName,
            lastName,
            age: ageValue,
            gender: patientData?.gender ?? null,
          },
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "KYC save failed")
      }

      onConfirmed()
    } catch (err) {
      console.error("❌ KYC verification save failed:", err)
      setError(t.error)
    } finally {
      setIsSaving(false)
    }
  }, [
    approved,
    isSaving,
    consultationId,
    patientId,
    doctorId,
    consultationType,
    firstName,
    lastName,
    ageValue,
    patientData?.gender,
    onConfirmed,
    t.error,
  ])

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          // Mandatory / blocking: prevent every implicit close path.
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
            // max-height + scroll: without them the dialog grew past the
            // viewport on a phone and the confirm button sat below the fold
            // with no way to reach it, trapping the doctor mid-consultation.
            "max-h-[90vh] overflow-y-auto overscroll-contain",
            "gap-4 border bg-background p-4 sm:p-6 shadow-lg sm:rounded-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {t.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {t.subtitle}
            </DialogPrimitive.Description>
          </div>

          {/* Patient details */}
          <div className="mt-4 rounded-lg border bg-muted/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4 text-teal-600" />
              {t.patientDetails}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.lastName}
                </dt>
                <dd className="font-semibold text-foreground break-words">
                  {lastName || t.notProvided}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.firstName}
                </dt>
                <dd className="font-semibold text-foreground break-words">
                  {firstName || t.notProvided}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.age}
                </dt>
                <dd className="font-semibold text-foreground">
                  {ageValue ? `${ageValue} ${t.years}` : t.notProvided}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.gender}
                </dt>
                <dd className="font-semibold text-foreground">{genderLabel}</dd>
              </div>
            </dl>
          </div>

          {/* Approval checkbox */}
          <label
            htmlFor="kyc-approved"
            className={cn(
              "mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              approved ? "border-teal-500 bg-teal-50" : "border-input hover:bg-muted/50"
            )}
          >
            <Checkbox
              id="kyc-approved"
              checked={approved}
              onCheckedChange={(v) => setApproved(v === true)}
              className="mt-0.5"
              disabled={isSaving}
            />
            <span className="text-sm font-medium leading-snug text-foreground">
              {t.checkboxLabel}
            </span>
          </label>

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Confirm — sticky so it stays reachable however short the viewport */}
          <div className="sticky bottom-0 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-1 bg-background border-t">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!approved || isSaving}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.saving}
                </>
              ) : error ? (
                t.retry
              ) : (
                t.confirm
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
