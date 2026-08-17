/**
 * Evidence References Section
 *
 * English, like the report it closes. This section is printed on the document
 * the patient and the receiving hospital read, not shown in the doctor's
 * console, so it follows the language of the document rather than that of the
 * interface.
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

type GuidelineContentKind = 'referentiel' | 'recherche' | 'notice' | 'indetermine'

interface EvidenceReference {
  ref_id?: string
  title?: string
  external_id?: string
  source?: string
  url?: string
  publication_date?: string
  specialty?: string
  used_for?: string
  /** Nature of the source, read from guideline_content_kind server-side. */
  content_kind?: GuidelineContentKind
}

/**
 * What the reader is told about a source that is NOT a society guideline.
 *
 * A third of the corpus is primary research and an eighth is a bibliographic
 * pointer whose full text was never retrieved. Listing all of them under
 * "international medical guidelines" — as this section did until now — lends
 * a 53-patient cohort the authority of a learned society. A title alone
 * cannot be trusted to say what a document is, so we say it explicitly.
 *
 * `referentiel` gets no badge on purpose: it IS what the section header
 * already claims, and badging the normal case only adds noise.
 */
const KIND_BADGE: Record<GuidelineContentKind, { label: string; className: string } | null> = {
  referentiel: null,
  recherche: {
    label: 'Study — not a learned-society guideline',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  notice: {
    label: 'Bibliographic record — full text not consulted',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  indetermine: {
    label: 'Status unconfirmed',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
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
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function EvidenceReferencesSection({ references }: Props) {
  const refs = Array.isArray(references) ? references.filter(isValidRef) : []

  if (refs.length === 0) {
    return (
      <section className="mt-10 pt-6 border-t border-gray-200 evidence-references">
        <p className="text-sm text-gray-500 italic">
          Note: recommendations based on standard clinical practice (no
          retrieved guideline applied to this case).
        </p>
      </section>
    )
  }

  return (
    <section className="mt-10 pt-6 border-t border-gray-200 evidence-references">
      <h2 className="font-bold text-lg mb-3 text-gray-800">
        Medical references used
      </h2>
      <p className="text-sm text-gray-700 mb-4">
        This diagnosis and these recommendations draw on the international
        medical sources below. Sources that are not learned-society guidelines
        are labelled as such:
      </p>
      <ol className="space-y-4 text-sm text-gray-700">
        {refs.map((ref, idx) => {
          const title = ref.title?.trim() || 'Untitled guideline'
          const source = ref.source?.trim()
          const date = formatDate(ref.publication_date)
          const url = ref.url?.trim()
          const usedFor = ref.used_for?.trim()
          const badge = ref.content_kind ? KIND_BADGE[ref.content_kind] : null
          return (
            <li key={`${ref.ref_id || ref.external_id || idx}`} className="break-inside-avoid">
              <div className="flex gap-2">
                <span className="font-semibold shrink-0">[{idx + 1}]</span>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-gray-900">{title}</p>
                  {badge && (
                    <p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </p>
                  )}
                  {date && (
                    <p className="text-xs text-gray-600">Published: {date}</p>
                  )}
                  {source && (
                    <p className="text-xs text-gray-600">Source: {source}</p>
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
                      Used for: {usedFor}
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
