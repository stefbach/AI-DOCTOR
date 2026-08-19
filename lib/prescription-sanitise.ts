// lib/prescription-sanitise.ts
//
// Keeping academic citations off the prescription.
//
// A prescription field answers one question each: how much, how often, for how
// long. The model, having been given guideline extracts to reason from,
// sometimes writes its source into the answer — "7 days (ASPS, 2020)" landed in
// a Duration field and was printed, as-is, on a document a pharmacist reads.
//
// There was already a scrubber for the retrieval tokens ([ref-3]); it never saw
// this, because a citation written out in prose is not a token. So the rule
// here is about the field, not the marker: a duration contains a duration.
// Anything shaped like a reference is removed from every structured field of
// the prescription.
//
// Deliberately narrow. A false strip silently alters a medical instruction, so
// each pattern has to look like a citation and nothing else — a parenthesis
// that merely ends in a number ("max 4g/24h", "until day 10") is left alone.

/** A parenthesised or bracketed group is a citation when it ends in a year and
 *  starts with a source, not with a word about time. */
const TEMPORAL_LEAD = /^(?:until|through|since|from|to|by|after|before|day|days|week|weeks|month|months|year|years|review|recheck)\b/i

const CITATION_PATTERNS: Array<{ re: RegExp; guard?: (match: string) => boolean }> = [
  // The retrieval token itself: [ref-3], [ref 12]. Belt and braces — the RAG
  // scrubber runs earlier, but only on the narrative.
  { re: /\[\s*ref[-_\s]?\d+\s*\]/gi },

  // (Smith et al., 2020) — an author list is never dosing information.
  { re: /[([][^()[\]]*\bet\s+al\.?[^()[\]]*[)\]]/gi },

  // (ASPS, 2020) · (NICE 2021) · [WHO, 2019a] · (ICHD-3, 2018)
  // Must open with a capital and close with a year; a temporal lead word means
  // it is an instruction to the patient, not a source.
  {
    re: /[([]\s*[A-Z][A-Za-z0-9&.\/’'-]*(?:[\s,]+[A-Za-z0-9&.\/’'-]+){0,5}[\s,]*(?:19|20)\d{2}[a-z]?\s*[)\]]/g,
    guard: (match) => !TEMPORAL_LEAD.test(match.replace(/^[([]\s*/, '')),
  },

  // "as per NICE guideline NG136", "per ASPS recommendations" — a trailing
  // justification tacked onto the end of a field.
  {
    re: /[\s,;–—-]*\b(?:as\s+)?per\s+(?:the\s+)?[A-Z][A-Za-z0-9&.\/’'-]*(?:\s+[A-Za-z&.\/’'-]+){0,4}\s+(?:guideline|guidance|recommendation|statement|consensus)s?\b[^,.;]*/gi,
  },
]

/** Fields that must not be left blank by the strip. A prescription with no
 *  duration is a worse document than one with a stray citation. */
const NEUTRAL_IF_EMPTIED: Record<string, string> = {
  duration: 'As directed',
  frequency: 'As directed',
  dosage: 'As prescribed',
}

/**
 * Every structured field of a prescription line.
 *
 * `name` is deliberately absent: a drug name does not carry citations, and a
 * wrong strip there changes which medicine is dispensed.
 */
export const PRESCRIPTION_TEXT_FIELDS = [
  'genericName',
  'dosage',
  'form',
  'frequency',
  'route',
  'duration',
  'quantity',
  'instructions',
  'indication',
  'monitoring',
  'how_to_take',
  'posology',
  'completeLine',
] as const

/** Remove citation-shaped text from one value. Never throws; non-strings come
 *  back as the empty string, which is what the callers already expect. */
export function stripCitations(value: unknown): string {
  let text = typeof value === 'string' ? value : value == null ? '' : String(value)
  if (!text) return ''

  for (const { re, guard } of CITATION_PATTERNS) {
    text = text.replace(re, (match) => (guard && !guard(match) ? match : ' '))
  }

  return text
    // A strip leaves gaps and orphaned punctuation behind: "7 days  ," → "7 days".
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[\s,;]*[-–—]\s*$/g, '')
    .replace(/^[\s,;:.\-–—]+|[\s,;:\-–—]+$/g, '')
    .trim()
}

/**
 * Clean every structured field of one prescription line, in place.
 *
 * Returns the names of the fields that actually changed, so the route can log
 * what it removed — a silent edit to a medical instruction is not something to
 * discover from a screenshot.
 */
export function sanitisePrescriptionEntry(entry: any): string[] {
  if (!entry || typeof entry !== 'object') return []

  const changed: string[] = []

  for (const field of PRESCRIPTION_TEXT_FIELDS) {
    const original = entry[field]
    if (typeof original !== 'string' || !original) continue

    let cleaned = stripCitations(original)
    if (!cleaned && NEUTRAL_IF_EMPTIED[field]) cleaned = NEUTRAL_IF_EMPTIED[field]

    if (cleaned !== original) {
      entry[field] = cleaned
      changed.push(field)
    }
  }

  return changed
}
