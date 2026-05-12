// lib/rag/rerank.ts
//
// Two-stage RAG retrieval: after the cosine-similarity retrieval returns
// 10-15 candidate chunks, a fast LLM re-ranks them by clinical relevance
// to the specific patient case (syndrome fit, source authority, geographic
// applicability, recency). The top-K survivors are passed to the diagnostic
// LLM with re-assigned ref-N ids so the model sees ref-1 = best match,
// ref-2 = second-best, etc.
//
// On any failure (timeout, JSON parse error, empty ranking, network) the
// original cosine-ordered context is returned unchanged so the consultation
// never degrades below the pre-rerank state. Re-rank is purely additive.

import { callLLM } from '@/lib/llm-client'
import type { RAGContext, RAGChunk, RAGReference } from './medical-rag'

const DEEPSEEK_FAST_MODEL = 'deepseek-chat'
const DEFAULT_TOP_K = 8
const DEFAULT_TIMEOUT_MS = 15_000
const EXCERPT_MAX_CHARS = 600

export interface RerankPatientContext {
  chiefComplaint: string
  age?: number | string
  sex?: string
  symptomDuration?: string
  keySymptoms?: string[]
  travelHistory?: string
  comorbidities?: string[]
}

export interface RerankOptions {
  /** Number of chunks to keep after re-rank. Default 8. */
  topK?: number
  /** Timeout for the re-rank LLM call. Default 15s. */
  timeoutMs?: number
  /**
   * Override the model used for re-rank. Default 'deepseek-chat' (fast,
   * non-reasoning, ~3-5s for 12 chunks). Set explicitly if you need to A/B
   * test a different model without changing the global DEEPSEEK_MODEL.
   */
  model?: string
}

/**
 * Re-rank the chunks in an RAGContext by clinical relevance to the patient
 * case. Returns a NEW RAGContext with chunks reordered, truncated to top-K,
 * orphaned references dropped, and ref-N ids re-assigned in the new order.
 *
 * Fallback contract: on any error the original ctx is returned unchanged
 * (with all chunks, no truncation). Callers can therefore treat this as a
 * no-throw best-effort enrichment.
 */
export async function reRankAndShrinkContext(
  ctx: RAGContext,
  patient: RerankPatientContext,
  opts: RerankOptions = {},
): Promise<RAGContext> {
  const topK = opts.topK ?? DEFAULT_TOP_K

  // Skip early only when there's genuinely nothing to do: 0, 1, or 2 chunks.
  // With 3+ chunks the LLM call is still worth it for REORDERING (placing
  // the most patient-relevant chunk at ref-1) even when no truncation is
  // needed. The previous `<= topK` guard was skipping the re-rank whenever
  // retrieval returned exactly 8 chunks, which is the typical case after
  // dedup — the re-ranker was essentially never running in production.
  if (!ctx.chunks || ctx.chunks.length <= 2) {
    return ctx
  }

  const t0 = Date.now()
  const refByRefId = new Map<string, RAGReference>(
    ctx.references.map(r => [r.ref_id, r]),
  )

  const chunkSummaries = ctx.chunks.map((c, idx) => {
    const ref = refByRefId.get(c.refId)
    return {
      id: c.refId,
      idx,
      section: c.section || '',
      title: ref?.title ?? 'Untitled',
      source: ref?.source ?? 'UNKNOWN',
      year: ref?.publication_date ? ref.publication_date.slice(0, 4) : '',
      excerpt: (c.content || '').slice(0, EXCERPT_MAX_CHARS),
    }
  })

  const patientSummary = formatPatientForRerank(patient)

  const systemPrompt = `You are a clinical librarian helping a senior physician pick the best evidence for a specific patient case. Score EACH chunk 0-100 on CLINICAL relevance for THIS patient. Weight:
- Direct applicability to the patient's syndrome and chief complaint (50%)
- Authority of the source: NICE / CDC / WHO / IDSA / ECDC / national guideline > clinical paper / case report / regional bulletin (25%)
- Geographic and epidemiologic fit (Mauritius, Indian Ocean, tropical context) (15%)
- Recency: prefer last 5 years unless the chunk is a seminal reference (10%)

Return JSON ONLY, no prose, in this exact shape:
{ "ranking": [{"id": "ref-1", "score": 87, "reason": "<<=15 words>"}, ...] }

Rank ALL chunks (do not omit any). "reason" is for audit logs and must be at most 15 words.`

  const userPrompt = `Patient case:\n${patientSummary}\n\nChunks to rank (${chunkSummaries.length}):\n${JSON.stringify(chunkSummaries, null, 2)}`

  try {
    const result = await callLLM({
      useCase: 'RERANK',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 2000,
      responseFormat: 'json_object',
      reasoningEffort: 'none',
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      model: opts.model ?? DEEPSEEK_FAST_MODEL,
    })

    let parsed: { ranking?: Array<{ id?: unknown; score?: unknown; reason?: unknown }> }
    try {
      parsed = JSON.parse(result.text || '{}')
    } catch (parseErr: any) {
      console.warn(
        `[rerank] JSON parse failed (${parseErr?.message || parseErr}) — falling back to cosine order`,
      )
      return ctx
    }

    if (!Array.isArray(parsed.ranking) || parsed.ranking.length === 0) {
      console.warn(`[rerank] empty or missing ranking array — falling back to cosine order`)
      return ctx
    }

    const scoreById = new Map<string, number>()
    for (const item of parsed.ranking) {
      if (!item || typeof item.id !== 'string' || typeof item.score !== 'number') continue
      scoreById.set(item.id, item.score)
    }

    if (scoreById.size === 0) {
      console.warn(`[rerank] no valid scores parsed — falling back to cosine order`)
      return ctx
    }

    // Sort original chunks by score DESC. Unscored chunks get -1 and sink.
    const sortedChunks = [...ctx.chunks].sort((a, b) => {
      const sa = scoreById.get(a.refId) ?? -1
      const sb = scoreById.get(b.refId) ?? -1
      return sb - sa
    })

    const kept = sortedChunks.slice(0, topK)
    const droppedCount = ctx.chunks.length - kept.length

    // Re-build references: only refs cited by at least one surviving chunk.
    // Re-assign ref-N ids in the new order so the diagnostic LLM sees ref-1
    // = top-scored chunk, ref-2 = second, etc.
    const oldToNewRefId = new Map<string, string>()
    const newRefs: RAGReference[] = []
    const newChunks: RAGChunk[] = []
    for (const c of kept) {
      let newRefId = oldToNewRefId.get(c.refId)
      if (!newRefId) {
        const oldRef = refByRefId.get(c.refId)
        newRefId = `ref-${newRefs.length + 1}`
        oldToNewRefId.set(c.refId, newRefId)
        if (oldRef) {
          newRefs.push({ ...oldRef, ref_id: newRefId })
        }
      }
      newChunks.push({ ...c, refId: newRefId })
    }

    const avgSim = newChunks.length > 0
      ? newChunks.reduce((s, c) => s + (c.similarity || 0), 0) / newChunks.length
      : 0

    const topScoresLog = kept
      .map(c => Math.round(scoreById.get(c.refId) ?? -1))
      .join(',')

    console.log(
      `[rerank] use=DIAGNOSIS provider=${result.provider} model=${result.model} ` +
        `input_chunks=${ctx.chunks.length} kept_top_k=${kept.length} dropped=${droppedCount} ` +
        `top_scores=[${topScoresLog}] latency=${Date.now() - t0}ms`,
    )

    return {
      chunks: newChunks,
      references: newRefs,
      totalChunks: newChunks.length,
      avgSimilarity: avgSim,
      ragUsed: ctx.ragUsed,
    }
  } catch (err: any) {
    console.warn(
      `[rerank] LLM call failed (${err?.message || err}) — falling back to cosine order, ` +
        `latency_before_fail=${Date.now() - t0}ms`,
    )
    return ctx
  }
}

function formatPatientForRerank(p: RerankPatientContext): string {
  const lines: string[] = []
  if (p.chiefComplaint) lines.push(`Chief complaint: ${p.chiefComplaint}`)
  if (p.age !== undefined && p.age !== null && p.age !== '') lines.push(`Age: ${p.age}`)
  if (p.sex) lines.push(`Sex: ${p.sex}`)
  if (p.symptomDuration) lines.push(`Symptom duration: ${p.symptomDuration}`)
  if (p.keySymptoms && p.keySymptoms.length > 0) lines.push(`Key symptoms: ${p.keySymptoms.join(', ')}`)
  if (p.travelHistory) lines.push(`Travel history: ${p.travelHistory}`)
  if (p.comorbidities && p.comorbidities.length > 0) lines.push(`Comorbidities: ${p.comorbidities.join(', ')}`)
  return lines.join('\n')
}
