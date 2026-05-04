/**
 * Evidence References Section
 *
 * Renders the medical guidelines that informed the diagnosis/recommendations.
 * Shown at the bottom of consultation reports (just before the doctor's signature).
 *
 * Source of truth: `evidence_references` from the openai-diagnosis API response.
 * Each reference is enriched server-side with full metadata (title, source, url,
 * publication_date, used_for) — see app/api/openai-diagnosis/route.ts.
 *
 * Failsafe: malformed input renders the italic-gray fallback note rather than
 * crashing the whole report.
 */

import React from 'react'

interface EvidenceReference {
  ref_id?: string
  title?: string
  external_id?: string
  source?: string
  url?: string
  publication_date?: string
  specialty?: string
  used_for?: string
}

interface Props {
  /** Raw evidence_references from the API. May be undefined / null / non-array. */
  references?: unknown
}

function isValidRef(r: unknown): r is EvidenceReference {
  if (!r || typeof r !== 'object') return false
  const ref = r as EvidenceReference
  return typeof ref.title === 'string' && ref.title.trim().length > 0
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function EvidenceReferencesSection({ references }: Props) {
  const refs = Array.isArray(references) ? references.filter(isValidRef) : []

  if (refs.length === 0) {
    return (
      <section className="mt-10 pt-6 border-t border-gray-200 evidence-references">
        <p className="text-sm text-gray-500 italic">
          Note : Recommandations basées sur la pratique clinique standard
          (aucune guideline RAG appliquée pour ce cas).
        </p>
      </section>
    )
  }

  return (
    <section className="mt-10 pt-6 border-t border-gray-200 evidence-references">
      <h2 className="font-bold text-lg mb-3 text-gray-800">
        Références médicales utilisées
      </h2>
      <p className="text-sm text-gray-700 mb-4">
        Ce diagnostic et ces recommandations s'appuient sur les guidelines
        médicales internationales suivantes :
      </p>
      <ol className="space-y-4 text-sm text-gray-700">
        {refs.map((ref, idx) => {
          const title = ref.title?.trim() || 'Untitled guideline'
          const source = ref.source?.trim()
          const date = formatDate(ref.publication_date)
          const url = ref.url?.trim()
          const usedFor = ref.used_for?.trim()
          return (
            <li key={`${ref.ref_id || ref.external_id || idx}`} className="break-inside-avoid">
              <div className="flex gap-2">
                <span className="font-semibold shrink-0">[{idx + 1}]</span>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-gray-900">{title}</p>
                  {date && (
                    <p className="text-xs text-gray-600">Publié : {date}</p>
                  )}
                  {source && (
                    <p className="text-xs text-gray-600">Source : {source}</p>
                  )}
                  {url && (
                    <p className="text-xs text-blue-700 break-all print:text-gray-700">
                      <span aria-hidden="true">🔗 </span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {url}
                      </a>
                    </p>
                  )}
                  {usedFor && (
                    <p className="text-xs text-gray-700 italic">
                      Utilisé pour : {usedFor}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
