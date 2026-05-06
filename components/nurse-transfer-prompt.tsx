'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'

/**
 * Phase 2.D.B — Nurse-side end-of-step-2 prompt.
 *
 * Replaces the "Launch AI Diagnosis" / "Continuer" buttons in the questions
 * form (and any equivalent end-of-step-2 CTA) when the current viewer role
 * is 'nurse'. The actual "Transfer to doctor" button lives in the TIBOK
 * overlay above the iframe — AI-DOCTOR just communicates that the nurse's
 * part is done and points her there.
 *
 * No interactive elements: by design. The handoff trigger is on the TIBOK
 * side; AI-DOCTOR shouldn't duplicate it.
 */
export function NurseTransferPrompt() {
  return (
    <div className="my-6 flex justify-center">
      <div
        role="status"
        className="max-w-2xl w-full rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-6 py-5 shadow-md"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-emerald-900">
              Vous avez terminé votre partie de la consultation
            </h3>
            <p className="mt-1 text-sm text-emerald-800 leading-relaxed">
              Cliquez sur le bouton{' '}
              <span className="font-semibold">« Transférer au médecin »</span>{' '}
              en bas de la page pour passer la main au docteur. Le médecin
              reprendra à partir du diagnostic.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
