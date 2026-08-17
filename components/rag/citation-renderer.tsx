/**
 * Citation Renderer
 *
 * Converts inline citation patterns into Vancouver-style numeric footnotes
 * tied to the report's evidence_references array, and renders both:
 *   - the cleaned indication/text with [1], [2]… superscripts, and
 *   - a compact per-section bibliography that mirrors the global one.
 *
 * Patterns recognised (case-insensitive, in order):
 *   [ref-1], [ref-2], …             — canonical RAG token
 *   [1], [2], …                     — already-Vancouver markers from LLM
 *   (ECDC, 2025), (NICE, 2019), …   — author-year emitted by DeepSeek
 *
 * The numeric output ([1], [2]…) matches the position of each reference
 * inside the `references` prop, so the per-section bibliography uses the
 * SAME numbering as the global one (no surprise mismatch for the doctor).
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

interface RenderResult {
  /** Element to render inside the indication paragraph. */
  node: React.ReactNode
  /** Indices (0-based, matching the `references` prop) referenced by the text. */
  usedIndices: number[]
}

function yearOf(iso?: string): string | null {
  if (!iso) return null
  const m = iso.match(/(\d{4})/)
  return m ? m[1] : null
}

function normaliseSource(s?: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Build a lookup from textual signals → reference index.
 *
 * For each reference we register:
 *   - its `ref_id` (e.g. "ref-1"),
 *   - its numeric position (e.g. "1"),
 *   - and `source|year` (e.g. "ecdc|2025") when both are available.
 *
 * Matching is best-effort: a "(WHO, 2024)" mention will resolve to the WHO
 * reference even if the year is slightly different (year is preferred but
 * not required when only one ref shares that source).
 */
function buildLookup(references: EvidenceReference[]) {
  const byRefId = new Map<string, number>()
  const bySourceYear = new Map<string, number>()
  const bySource = new Map<string, number[]>()
  references.forEach((ref, idx) => {
    if (ref.ref_id) {
      byRefId.set(ref.ref_id.toLowerCase(), idx)
      // also accept "ref-1" → "1" numeric mapping
      const m = ref.ref_id.match(/(\d+)/)
      if (m) byRefId.set(m[1], idx)
    }
    const src = normaliseSource(ref.source)
    const y = yearOf(ref.publication_date)
    if (src && y) bySourceYear.set(`${src}|${y}`, idx)
    if (src) {
      const list = bySource.get(src) || []
      list.push(idx)
      bySource.set(src, list)
    }
  })
  return { byRefId, bySourceYear, bySource }
}

/**
 * Render a string with citations replaced by superscript footnote markers.
 * If `references` is empty the text is rendered unchanged.
 */
export function renderWithCitations(
  text: string | undefined | null,
  references: EvidenceReference[] | undefined | null
): RenderResult {
  const safe = typeof text === 'string' ? text : ''
  const refs = Array.isArray(references) ? references : []
  if (!safe) return { node: '', usedIndices: [] }
  if (refs.length === 0) return { node: safe, usedIndices: [] }

  const { byRefId, bySourceYear, bySource } = buildLookup(refs)
  const used = new Set<number>()
  const parts: Array<{ type: 'text' | 'ref'; value: string; idx?: number }> = []

  // One sweep, leftmost-match. Pattern order:
  //   [ref-N]  →  [N]  →  (Source, Year)
  const pattern = /\[ref-(\d+)\]|\[(\d+)\]|\(([A-Z][A-Za-z&\- ]{1,30}?),\s*(\d{4})\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(safe)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: safe.slice(lastIndex, match.index) })
    }
    let resolvedIdx: number | undefined
    if (match[1]) {
      // [ref-N]
      const num = match[1]
      const idx = byRefId.get(`ref-${num}`) ?? byRefId.get(num)
      if (idx !== undefined) resolvedIdx = idx
    } else if (match[2]) {
      // [N] — only resolve if it lands within the references range to avoid
      // hijacking legitimate numeric brackets like "[10g]" later in text.
      const num = parseInt(match[2], 10)
      if (num >= 1 && num <= refs.length) resolvedIdx = num - 1
    } else if (match[3] && match[4]) {
      // (Source, Year)
      const src = normaliseSource(match[3])
      const y = match[4]
      const k = `${src}|${y}`
      let idx = bySourceYear.get(k)
      if (idx === undefined) {
        // Fall back to source-only if a single ref matches that source.
        const list = bySource.get(src)
        if (list && list.length === 1) idx = list[0]
      }
      if (idx !== undefined) resolvedIdx = idx
    }

    if (resolvedIdx !== undefined) {
      used.add(resolvedIdx)
      parts.push({ type: 'ref', value: match[0], idx: resolvedIdx })
    } else {
      // Unresolved citation — keep raw text so nothing is lost.
      parts.push({ type: 'text', value: match[0] })
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < safe.length) {
    parts.push({ type: 'text', value: safe.slice(lastIndex) })
  }

  const node = parts.map((p, i) => {
    if (p.type === 'text') return <React.Fragment key={i}>{p.value}</React.Fragment>
    const n = (p.idx as number) + 1
    return (
      <sup
        key={i}
        className="text-blue-700 font-semibold cursor-pointer hover:underline ml-0.5"
        title="See references below"
      >
        [{n}]
      </sup>
    )
  })

  return { node, usedIndices: Array.from(used).sort((a, b) => a - b) }
}

/**
 * Convenience aggregator: render citations across several indication strings
 * and return both the combined "used" reference set (in the same order as the
 * full `references` array) and a per-string node map.
 */
export function aggregateReferences(
  texts: Array<string | undefined | null>,
  references: EvidenceReference[] | undefined | null
): { nodes: React.ReactNode[]; usedRefs: EvidenceReference[] } {
  const refs = Array.isArray(references) ? references : []
  const allUsed = new Set<number>()
  const nodes: React.ReactNode[] = []
  for (const t of texts) {
    const { node, usedIndices } = renderWithCitations(t, refs)
    nodes.push(node)
    usedIndices.forEach(i => allUsed.add(i))
  }
  const usedRefs = refs.filter((_, i) => allUsed.has(i))
  return { nodes, usedRefs }
}

/**
 * Compact per-section bibliography used at the bottom of prescription,
 * lab and radiology forms. Matches the global numbering implicitly because
 * the caller passes the same `references` array filtered by `usedRefs`.
 */
export function SectionBibliography({
  references,
  globalReferences,
  title = 'References cited in this section',
}: {
  references: EvidenceReference[] | undefined | null
  globalReferences?: EvidenceReference[]
  title?: string
}) {
  const refs = Array.isArray(references) ? references.filter(r => r && r.title) : []
  if (refs.length === 0) return null

  const globalList = Array.isArray(globalReferences) && globalReferences.length > 0
    ? globalReferences
    : refs

  const indexOf = (ref: EvidenceReference): number => {
    const i = globalList.findIndex(g =>
      (g.ref_id && ref.ref_id && g.ref_id === ref.ref_id) ||
      (g.title && ref.title && g.title === ref.title)
    )
    return i >= 0 ? i : -1
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 print:border-gray-300">
      <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>
      <ol className="space-y-2 text-xs text-gray-700">
        {refs.map((ref, k) => {
          const n = indexOf(ref)
          const display = n >= 0 ? n + 1 : k + 1
          const source = ref.source?.trim()
          const y = yearOf(ref.publication_date)
          const url = ref.url?.trim()
          return (
            <li key={`${ref.ref_id || ref.title || k}`} className="break-inside-avoid">
              <span className="font-semibold mr-1">[{display}]</span>
              <span className="font-medium text-gray-900">{ref.title}</span>
              {(source || y) && (
                <span className="text-gray-600">
                  {' '}— {[source, y].filter(Boolean).join(', ')}
                </span>
              )}
              {url && (
                <span className="block text-blue-700 break-all print:text-gray-700">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {url}
                  </a>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
