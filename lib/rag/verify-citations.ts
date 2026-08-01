// lib/rag/verify-citations.ts
//
// GROUNDING VERIFICATION — the missing lock in the RAG chain.
//
// What the existing chain already guarantees (see medical-rag.ts):
//   - a [ref-N] token that points outside the retrieved set is stripped
//   - a ref listed in evidence_references but never cited in the prose is dropped
//   - title / source / URL / date are joined from the corpus row, never from
//     the model — so a fabricated LINK is impossible by construction
//   - filterEvidenceRefsByTopic drops refs whose TITLE has no overlap with the
//     diagnosis, and hard-drops obvious patient-context mismatches
//
// What NONE of those check: whether the guideline text actually says anything
// about the sentence it is attached to. Every filter so far reasons on the
// TITLE. `chunk_content` — the only thing that can settle it — was read to
// build the prompt and to re-rank, never to verify an attribution.
//
// The failure mode this closes is specific and invisible in the logs: a real
// NICE / CDC / ESC guideline, correctly retrieved, correctly linked, attached
// to a dosage or a threshold it does not contain. The reader sees an
// authoritative reference next to a claim it does not support. That is worse
// than no citation at all, because the reference lends its authority to
// something it never said.
//
// HOW IT WORKS
//   One LLM call per consultation. For each cited ref we send the guideline
//   text and the exact narrative excerpts where the model placed [ref-N], and
//   ask a single question: does this text bear on these claims?
//
// DELIBERATE ASYMMETRY
//   The verifier defaults to `supported: true`. Only an explicit
//   `supported: false` removes anything. Rationale: the cost of the two errors
//   is not symmetric here. Dropping a legitimate citation makes a sound report
//   look unsourced; keeping a wrong one makes an unsound claim look sourced.
//   But this pass runs LAST, after three filters have already removed the
//   easy cases — anything reaching it is plausible enough that a strict
//   verifier would mostly be wrong. So it only fires on clear mismatches.
//
// WHAT IS REMOVED, AND WHAT IS NOT
//   Only the [ref-N] markers and the bibliography entry. The medical prose is
//   never touched: an unsupported citation means "this sentence is not sourced
//   by that guideline", NOT "this sentence is wrong". Removing the clinical
//   content on a bibliographic signal would be a much worse failure than the
//   one being fixed.
//
// FAIL-OPEN
//   Timeout, parse error, empty verdicts, missing ref in the response → the
//   citation is kept and the consultation proceeds unchanged. Same contract as
//   retrieval and re-rank: RAG never blocks a consultation.

import { callLLM } from '@/lib/llm-client'
import type { RAGContext, RAGReference } from './medical-rag'

/** An evidence reference as produced by scrubAndEnrichEvidenceRefs. */
export type EnrichedRef = RAGReference & { used_for?: string }

export interface CitationVerdict {
  ref_id: string
  supported: boolean
  reason: string
}

export interface VerifyCitationsResult {
  /** The bibliography with unsupported refs removed. */
  evidenceReferences: EnrichedRef[]
  /** ref_ids removed because the guideline text did not support the claim. */
  removedRefIds: string[]
  /** Per-ref verdicts as returned by the verifier (audit log). */
  verdicts: CitationVerdict[]
  /** True when the verification pass actually ran and produced verdicts. */
  verified: boolean
  /** Set when the pass was skipped or failed — why. */
  skippedReason?: string
  /** Number of [ref-N] tokens stripped from the narrative. */
  tokensStripped: number
  /**
   * Refs kept without being verified because no narrative excerpt was
   * attached to them (typically the Pass-2 reconstruction path, which lists
   * refs the model never cited). Nothing to check against — kept, but
   * counted so the gap stays visible in rag_metadata.
   */
  unverifiableRefIds: string[]
  latencyMs: number
}

export interface VerifyCitationsOptions {
  logPrefix?: string
  /** Default 45s. The pass is auxiliary — it must not extend the consultation. */
  timeoutMs?: number
  /** Model override; falls back to RAG_VERIFY_MODEL, then callLLM resolution. */
  model?: string
  /** Max narrative excerpts sent per ref. Default 3. */
  maxExcerptsPerRef?: number
  /** Max guideline characters sent per ref. Default 1800. */
  maxChunkCharsPerRef?: number
}

const DEFAULT_TIMEOUT_MS = 45_000
const DEFAULT_MAX_EXCERPTS = 3
const DEFAULT_MAX_CHUNK_CHARS = 1800

const REF_TOKEN_GLOBAL = /\[ref-(\d+)\]/g

const SYSTEM_PROMPT = `You are a medical fact-checker auditing citations in a clinical report.

For each item you receive: the text of a clinical guideline, and the sentences from the report where that guideline was cited.

ONE question per item: does the guideline text BEAR ON those sentences?

Mark supported = true when the guideline text addresses the same clinical subject as the claim — the same condition, drug, test, threshold, population or management step. Partial or indirect support counts: a guideline discussing the management of the condition supports a statement about treating it, even if it does not repeat the exact wording.

Mark supported = false ONLY when the guideline text is clearly about something else — a different disease, a different drug class, a different population — so that a clinician reading the report would be misled into thinking this guideline backs a claim it never addresses.

WHEN IN DOUBT, ANSWER TRUE. You are looking for clear mismatches, not imperfect matches. A partially relevant citation stays.

Return JSON ONLY, no prose:
{ "verdicts": [ { "ref_id": "ref-1", "supported": true, "reason": "<max 15 words>" } ] }

Return a verdict for EVERY ref_id you were given.`

/**
 * Strip the given [ref-N] tokens from every string in an object tree.
 *
 * Mutates in place. `evidence_references` and `rag_metadata` are skipped so
 * the structured bibliography is not rewritten by a narrative pass — the
 * caller filters those explicitly.
 */
function stripRefTokens(
  node: any,
  idsToRemove: ReadonlySet<string>,
  counter: { n: number },
  excludeKeys: ReadonlySet<string> = new Set(['evidence_references', 'rag_metadata']),
): any {
  if (idsToRemove.size === 0) return node
  const visit = (n: any): any => {
    if (typeof n === 'string') {
      if (!n.includes('[ref-')) return n
      let modified = false
      const cleaned = n.replace(REF_TOKEN_GLOBAL, (match, num) => {
        if (!idsToRemove.has(`ref-${num}`)) return match
        modified = true
        counter.n++
        return ''
      })
      if (!modified) return n
      return cleaned
        .replace(/\s+([,.;:!?)])/g, '$1')
        .replace(/\(\s*\)/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }
    if (Array.isArray(n)) {
      for (let i = 0; i < n.length; i++) n[i] = visit(n[i])
      return n
    }
    if (n && typeof n === 'object') {
      for (const k of Object.keys(n)) {
        if (excludeKeys.has(k)) continue
        n[k] = visit(n[k])
      }
    }
    return n
  }
  return visit(node)
}

/** Collect the guideline text belonging to a ref, deduped and truncated. */
function guidelineTextForRef(ctx: RAGContext, refId: string, maxChars: number): string {
  const parts: string[] = []
  const seen = new Set<string>()
  for (const chunk of ctx.chunks) {
    if (chunk.refId !== refId) continue
    const content = (chunk.content || '').trim()
    if (!content) continue
    const key = content.slice(0, 120)
    if (seen.has(key)) continue
    seen.add(key)
    parts.push(chunk.section ? `[${chunk.section}] ${content}` : content)
  }
  const joined = parts.join('\n---\n')
  return joined.length > maxChars ? `${joined.slice(0, maxChars)}…` : joined
}

/**
 * Verify that every cited guideline actually bears on the claim it is attached
 * to, and remove the citations that do not.
 *
 * Runs LAST in the RAG chain — after scrubAndEnrichEvidenceRefs and, where the
 * route has one, after filterEvidenceRefsByTopic. By then the bibliography is
 * small (typically 2-6 refs), so a single call is enough.
 *
 * Never throws. On any failure the input bibliography is returned unchanged
 * with `verified: false` and a `skippedReason`.
 */
export async function verifyCitationGrounding(
  analysis: any,
  ragContext: RAGContext,
  evidenceReferences: EnrichedRef[],
  refUsageByPath: Map<string, Array<{ path: string; excerpt: string }>>,
  options: VerifyCitationsOptions = {},
): Promise<VerifyCitationsResult> {
  const tag = options.logPrefix || '🔒 [RAG-VERIFY]'
  const t0 = Date.now()
  const refs = Array.isArray(evidenceReferences) ? evidenceReferences : []

  const base: VerifyCitationsResult = {
    evidenceReferences: refs,
    removedRefIds: [],
    verdicts: [],
    verified: false,
    tokensStripped: 0,
    unverifiableRefIds: [],
    latencyMs: 0,
  }

  if (refs.length === 0) {
    return { ...base, skippedReason: 'no-refs', latencyMs: Date.now() - t0 }
  }
  if (!ragContext?.ragUsed || !Array.isArray(ragContext.chunks) || ragContext.chunks.length === 0) {
    return { ...base, skippedReason: 'no-chunks', latencyMs: Date.now() - t0 }
  }

  const maxExcerpts = options.maxExcerptsPerRef ?? DEFAULT_MAX_EXCERPTS
  const maxChunkChars = options.maxChunkCharsPerRef ?? DEFAULT_MAX_CHUNK_CHARS

  // Build one verification item per ref that has at least one claim attached.
  const items: Array<{ ref_id: string; title: string; source: string; guideline_text: string; claims: string[] }> = []
  const unverifiableRefIds: string[] = []

  for (const ref of refs) {
    const refId = String(ref?.ref_id || '').trim()
    if (!refId) continue

    const usages = refUsageByPath?.get(refId) ?? []
    const claims = Array.from(new Set(usages.map(u => (u.excerpt || '').trim()).filter(Boolean))).slice(0, maxExcerpts)
    if (claims.length === 0) {
      // Nothing was attributed to this ref in the prose — there is no claim to
      // check. Keep it (the Pass-2 reconstruction path lands here) and count it.
      unverifiableRefIds.push(refId)
      continue
    }

    const guidelineText = guidelineTextForRef(ragContext, refId, maxChunkChars)
    if (!guidelineText) {
      unverifiableRefIds.push(refId)
      continue
    }

    items.push({
      ref_id: refId,
      title: ref.title || 'Untitled guideline',
      source: ref.source || 'UNKNOWN',
      guideline_text: guidelineText,
      claims,
    })
  }

  if (unverifiableRefIds.length > 0) {
    console.warn(
      `${tag} ${unverifiableRefIds.length} ref(s) kept WITHOUT verification — no narrative claim attached: ` +
        unverifiableRefIds.join(', '),
    )
  }

  if (items.length === 0) {
    return {
      ...base,
      unverifiableRefIds,
      skippedReason: 'no-verifiable-claims',
      latencyMs: Date.now() - t0,
    }
  }

  console.log(`${tag} Verifying ${items.length} citation(s) against guideline text…`)

  const verdicts: CitationVerdict[] = []
  try {
    // Model resolution: explicit override → RAG_VERIFY_MODEL (lets a
    // deployment point this auxiliary pass at a cheap fast variant) → the
    // standard callLLM env resolution.
    const modelOverride = options.model ?? process.env.RAG_VERIFY_MODEL ?? undefined
    const result = await callLLM({
      useCase: 'RAG_VERIFY',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ items }, null, 2) },
      ],
      maxTokens: 1200,
      responseFormat: 'json_object',
      reasoningEffort: 'none',
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      ...(modelOverride ? { model: modelOverride } : {}),
    })

    let parsed: { verdicts?: unknown }
    try {
      parsed = JSON.parse(result.text || '{}')
    } catch (parseErr: any) {
      console.warn(`${tag} JSON parse failed (${parseErr?.message || parseErr}) — keeping all citations`)
      return { ...base, unverifiableRefIds, skippedReason: 'parse-error', latencyMs: Date.now() - t0 }
    }

    if (!Array.isArray(parsed.verdicts) || parsed.verdicts.length === 0) {
      console.warn(`${tag} No verdicts returned — keeping all citations`)
      return { ...base, unverifiableRefIds, skippedReason: 'empty-verdicts', latencyMs: Date.now() - t0 }
    }

    const knownIds = new Set(items.map(i => i.ref_id))
    for (const raw of parsed.verdicts as any[]) {
      const refId = String(raw?.ref_id || '').replace(/^\[(.+)\]$/, '$1').trim()
      if (!refId || !knownIds.has(refId)) continue
      verdicts.push({
        ref_id: refId,
        // Anything that is not an explicit `false` counts as supported.
        supported: raw?.supported !== false,
        reason: String(raw?.reason || '').slice(0, 120),
      })
    }
  } catch (err: any) {
    console.warn(`${tag} Verification call failed (${err?.message || err}) — keeping all citations`)
    return { ...base, unverifiableRefIds, skippedReason: 'call-failed', latencyMs: Date.now() - t0 }
  }

  if (verdicts.length === 0) {
    console.warn(`${tag} No usable verdict matched a known ref — keeping all citations`)
    return { ...base, unverifiableRefIds, skippedReason: 'no-matching-verdicts', latencyMs: Date.now() - t0 }
  }

  const removedRefIds = verdicts.filter(v => !v.supported).map(v => v.ref_id)

  for (const v of verdicts) {
    console.log(`${tag} [${v.ref_id}] ${v.supported ? '✅ supported' : '❌ UNSUPPORTED'} — ${v.reason || 'no reason given'}`)
  }

  if (removedRefIds.length === 0) {
    console.log(`${tag} All ${verdicts.length} verified citation(s) grounded — nothing removed`)
    return {
      evidenceReferences: refs,
      removedRefIds: [],
      verdicts,
      verified: true,
      tokensStripped: 0,
      unverifiableRefIds,
      latencyMs: Date.now() - t0,
    }
  }

  // Remove the markers from the prose. The prose itself is left intact — an
  // unsupported citation means the sentence is unsourced, not wrong.
  const removeSet = new Set(removedRefIds)
  const counter = { n: 0 }
  stripRefTokens(analysis, removeSet, counter)

  // Drop the entries from the model's own evidence_references array too, so a
  // downstream consumer reading `analysis` directly stays consistent with the
  // returned bibliography.
  if (Array.isArray(analysis?.evidence_references)) {
    analysis.evidence_references = analysis.evidence_references.filter((entry: any) => {
      const id = String(entry?.ref_id || '').replace(/^\[(.+)\]$/, '$1').trim()
      return !removeSet.has(id)
    })
  }

  const kept = refs.filter(r => !removeSet.has(String(r?.ref_id || '').trim()))

  console.warn(
    `${tag} Removed ${removedRefIds.length} unsupported citation(s): ${removedRefIds.join(', ')} ` +
      `(${counter.n} [ref-N] token(s) stripped from the narrative; prose left unchanged). ` +
      `Bibliography: ${refs.length} → ${kept.length}.`,
  )
  if (kept.length === 0) {
    console.warn(
      `${tag} Bibliography is now EMPTY — every verified citation was judged unsupported. ` +
        `The report stands on clinical practice alone, which is the correct outcome when no ` +
        `retrieved guideline backs its claims.`,
    )
  }

  return {
    evidenceReferences: kept,
    removedRefIds,
    verdicts,
    verified: true,
    tokensStripped: counter.n,
    unverifiableRefIds,
    latencyMs: Date.now() - t0,
  }
}
