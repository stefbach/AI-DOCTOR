"use client"

// components/send-failure-dialog.tsx
//
// What the doctor sees when the documents do not reach the patient.
//
// It replaces a toast. A toast was the wrong shape for this: it disappears
// after a few seconds, it renders at the top of the screen where the TIBOK
// video pane covers it, and on 17/08 a doctor never saw the one that explained
// why nothing was happening. They watched a spinner for fifteen minutes and
// closed the tab; the patient had paid and received nothing.
//
// Three rules, learned from that consultation:
//
//   1. IT STAYS. No timeout, no dismissal by clicking beside it. The doctor
//      closes it when they have decided what to do.
//   2. IT SAYS WHAT HAPPENED, NOT WHAT BROKE. "Missing IDs - Consultation:
//      4d8e…, Patient: null" is not a sentence a doctor can act on. A status
//      code is not either. The technical detail is kept, folded away, for the
//      support conversation that follows.
//   3. EVERY BUTTON DOES SOMETHING. Doctors will not investigate, and should
//      not have to. Retry retries. Save writes the report to the server so it
//      cannot be lost, whatever happens next. Neither asks them to understand
//      anything.

import * as React from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, Loader2, RefreshCw, Save, X, Check } from "lucide-react"

export type SendFailureKind =
  | "identity_unresolved"
  | "network"
  | "server"
  | "validation"
  | "unknown"

export interface SendFailure {
  kind: SendFailureKind
  /** Raw message, shown only under "technical detail". */
  detail?: string
}

const COPY: Record<
  SendFailureKind,
  { fr: { title: string; body: string }; en: { title: string; body: string } }
> = {
  identity_unresolved: {
    fr: {
      title: "Les informations de la consultation sont introuvables",
      body:
        "L'application n'a pas retrouvé à quel patient et à quel médecin cette consultation appartient, et ne peut donc pas envoyer les documents. Enregistrez le rapport ci-dessous : il sera conservé et pourra être envoyé ensuite. Prévenez le support avant de fermer.",
    },
    en: {
      title: "The consultation details could not be found",
      body:
        "The app could not work out which patient and doctor this consultation belongs to, so it cannot send the documents. Save the report below: it will be kept and can be sent afterwards. Tell support before closing.",
    },
  },
  network: {
    fr: {
      title: "La connexion a été perdue",
      body:
        "Les documents n'ont pas pu partir. Rien n'est perdu. Réessayez — si cela échoue encore, enregistrez le rapport et prévenez le support.",
    },
    en: {
      title: "The connection dropped",
      body:
        "The documents could not be sent. Nothing is lost. Try again — if it fails again, save the report and tell support.",
    },
  },
  server: {
    fr: {
      title: "Le serveur n'a pas accepté l'envoi",
      body:
        "Les documents n'ont pas pu être transmis au dossier du patient. Le rapport, lui, peut être enregistré dès maintenant. Réessayez, puis prévenez le support si cela se reproduit.",
    },
    en: {
      title: "The server refused the transfer",
      body:
        "The documents could not be delivered to the patient's file. The report itself can be saved right away. Try again, and tell support if it happens twice.",
    },
  },
  validation: {
    fr: {
      title: "Une information obligatoire manque",
      body:
        "Le dossier ne peut pas être transmis tant qu'elle n'est pas renseignée — le plus souvent le numéro de téléphone du patient, à l'étape « Informations patient ». Le détail exact est indiqué ci-dessous. Enregistrez le rapport pour ne rien perdre, corrigez l'information, puis relancez l'envoi.",
    },
    en: {
      title: "A required detail is missing",
      body:
        "The record cannot be sent until it is filled in — most often the patient's phone number, on the Patient information step. The exact detail is shown below. Save the report so nothing is lost, fill it in, then send again.",
    },
  },
  unknown: {
    fr: {
      title: "L'envoi n'a pas abouti",
      body:
        "Les documents ne sont pas arrivés au patient. Enregistrez le rapport pour qu'il ne soit pas perdu, réessayez, et prévenez le support si le problème persiste.",
    },
    en: {
      title: "The documents were not sent",
      body:
        "They did not reach the patient. Save the report so it cannot be lost, try again, and tell support if it keeps happening.",
    },
  },
}

export default function SendFailureDialog({
  failure,
  onRetry,
  onSave,
  onClose,
  language = "fr",
}: {
  failure: SendFailure | null
  onRetry: () => void | Promise<void>
  /** Writes the report to the server. Resolves true when it is safe. */
  onSave: () => Promise<boolean>
  onClose: () => void
  language?: "fr" | "en"
}) {
  const [retrying, setRetrying] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  // document does not exist while rendering on the server.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // A new failure is a new conversation: the previous outcome must not carry
  // over and tell the doctor a fresh report is already safe.
  React.useEffect(() => {
    setSaved(false)
    setRetrying(false)
    setSaving(false)
  }, [failure])

  if (!failure || !mounted || typeof document === "undefined") return null

  const copy = COPY[failure.kind] || COPY.unknown
  const text = language === "fr" ? copy.fr : copy.en

  const labels =
    language === "fr"
      ? {
          retry: "Réessayer l'envoi",
          save: "Enregistrer le rapport",
          saved: "Rapport enregistré",
          close: "Fermer",
          detail: "Détail technique",
          saveFailed: "L'enregistrement a échoué — réessayez",
        }
      : {
          retry: "Try sending again",
          save: "Save the report",
          saved: "Report saved",
          close: "Close",
          detail: "Technical detail",
          saveFailed: "The save failed — try again",
        }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      setSaved(await onSave())
    } finally {
      setSaving(false)
    }
  }

  // Rendered into <body>, not where it is written.
  //
  // `position: fixed` is not enough here. This dialog is written inside the
  // report card, and that card carries `glass-card` — `backdrop-filter` — which
  // makes it a containing block for fixed descendants. So "fixed inset-0"
  // anchored to the CARD, which is several screens tall, and the dialog
  // appeared at the top of it. A doctor pressing "Finalize and send" at the
  // bottom of the page got no visible response at all and had to scroll up to
  // find out why — which nobody would think to do.
  //
  // A portal to <body> escapes the card entirely, so the overlay covers the
  // viewport wherever the doctor happens to be. Same reason ViewportLayer
  // exists; this one needs its own because it must take pointer events.
  return createPortal(
    // z-[60]: above the review dialog at z-50. This one reports that a paid
    // consultation may have been lost, and nothing may cover it.
    //
    // Top-anchored and scrollable rather than centred: under the TIBOK video
    // pane a vertically centred panel is pushed off the visible sliver and its
    // buttons become unreachable.
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 p-3 print:hidden">
      <div className="my-4 w-full max-w-md rounded-xl bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900">{text.title}</h2>
            <p className="mt-2 text-sm leading-snug text-gray-700">{text.body}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {/* Saving comes first, and stays available after it succeeds so a
              doctor who edits and retries can secure the new version too. */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              saved
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-gray-900 text-white hover:bg-gray-800"
            } disabled:opacity-60`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? labels.save : saved ? labels.saved : labels.save}
          </button>

          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {labels.retry}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            {labels.close}
          </button>
        </div>

        {/* On a validation failure the detail names the missing field, which is
            the one thing the doctor has to act on — so it is shown, not folded
            away behind a disclosure nobody opens. */}
        {failure.detail && failure.kind === "validation" && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            {failure.detail}
          </p>
        )}

        {failure.detail && failure.kind !== "validation" && (
          <details className="mt-3 border-t border-gray-100 pt-3">
            <summary className="cursor-pointer text-xs text-gray-500">
              {labels.detail}
            </summary>
            <p className="mt-1 break-words font-mono text-[11px] leading-snug text-gray-500">
              {failure.detail}
            </p>
          </details>
        )}
      </div>
    </div>,
    document.body,
  )
}
