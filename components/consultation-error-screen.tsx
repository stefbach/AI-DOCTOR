"use client"

// components/consultation-error-screen.tsx
//
// What a doctor sees instead of a white page.
//
// This app has no error boundary at all, so any error thrown during render
// propagates to the root and unmounts the whole React tree. On 13/08/2026 a
// crash in the consultation hub did exactly that: the screen went white and a
// paid consultation was lost 39 seconds after it started. The doctor had
// nothing to read, nothing to click, and no way back.
//
// So this screen has one job: never leave the doctor without a next step.
// Retry re-renders the failed segment (enough when the error was transient);
// reload restarts the page from scratch (needed when it is not, since a
// deterministic error will just throw again on retry).
//
// Written for the real conditions: a phone, inside the TIBOK iframe, under a
// video pane. Compact, top-anchored, scrollable, both actions above the fold.

import * as React from "react"
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react"

import { reportRenderCrash } from "@/lib/blackbox"

interface ConsultationErrorScreenProps {
  error: Error & { digest?: string }
  /** Re-render the failed segment. Provided by the Next.js error boundary. */
  reset: () => void
  /** Root-layout failures cannot re-render in place; only a reload helps. */
  fatal?: boolean
}

export default function ConsultationErrorScreen({
  error,
  reset,
  fatal = false,
}: ConsultationErrorScreenProps) {
  // Surfaced so the doctor can quote it and we can find the matching record.
  // digest is set for server errors; client-side crashes only carry a message.
  const reference = error?.digest || null

  React.useEffect(() => {
    console.error("💥 Consultation UI crash:", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    })
    // Ship it with the breadcrumbs that led here. Guarded: a telemetry failure
    // must not stop the doctor seeing their way out.
    try {
      reportRenderCrash(error)
    } catch {
      /* ignore */
    }
  }, [error])

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="mx-auto mt-6 w-full max-w-md rounded-lg border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900">
              Une erreur technique s'est produite
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">A technical error occurred</p>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm leading-relaxed text-blue-900">
            <span className="font-semibold">La consultation n'est pas perdue.</span> Les
            informations déjà saisies sont enregistrées automatiquement. Rechargez la page pour
            reprendre où vous en étiez.
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-blue-800">
            The consultation is not lost — your entries are auto-saved. Reload to resume.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload()
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Recharger la page / Reload
          </button>

          {!fatal && (
            <button
              onClick={reset}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Réessayer / Retry
            </button>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
          Si le problème persiste, terminez la consultation depuis TIBOK et signalez-le en
          transmettant la référence ci-dessous.
        </p>

        <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
          <p className="text-[11px] font-medium text-gray-600">Référence technique</p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-gray-800">
            {reference || error?.message || "unknown error"}
          </p>
        </div>
      </div>
    </div>
  )
}
