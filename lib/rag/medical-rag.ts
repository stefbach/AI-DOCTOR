/**
 * Medical RAG (Retrieval-Augmented Generation) — Runtime
 *
 * Called from /app/api/openai-diagnosis/route.ts on every consultation.
 *
 * Pipeline:
 *   1. Build clinical context query from patient data
 *   2. Generate embedding via OpenAI text-embedding-3-small (~150 ms)
 *   3. Search pgvector via match_guidelines RPC (~50 ms)
 *   4. Format retrieved guidelines for prompt injection
 *   5. Log RAG trace (10y retention, medico-legal)
 *
 * Failsafe: any error returns empty array — never blocks a consultation.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

let _supabase: SupabaseClient | null = null
let _openai: OpenAI | null = null

function supabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _supabase
}

function openai(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

// ============================================================================
// Types
// ============================================================================
export interface GuidelineMatch {
  id: number
  source: string
  guideline_code: string
  title: string
  section: string | null
  content: string
  url: string
  page_reference: string | null
  version: string
  effective_date: string
  specialty: string[] | null
  similarity: number
}

export interface RAGQueryOptions {
  topK?: number
  threshold?: number
  filterSpecialties?: string[]
  language?: 'en' | 'fr'
}

// ============================================================================
// Retrieval
// ============================================================================
export async function retrieveRelevantGuidelines(
  clinicalContext: string,
  options: RAGQueryOptions = {}
): Promise<GuidelineMatch[]> {
  const {
    topK = parseInt(process.env.RAG_TOP_K || '5'),
    threshold = parseFloat(process.env.RAG_MIN_SIMILARITY || '0.65'),
    filterSpecialties,
    language = 'en'
  } = options

  if (process.env.RAG_ENABLED !== 'true') {
    console.log('[RAG] Disabled via RAG_ENABLED flag')
    return []
  }

  try {
    const truncated = clinicalContext.slice(0, 8000)

    const embedRes = await openai().embeddings.create({
      model: 'text-embedding-3-small',
      input: truncated
    })
    const queryEmbedding = embedRes.data[0].embedding

    const { data, error } = await supabase().rpc('match_guidelines', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: topK,
      filter_specialties: filterSpecialties || null,
      filter_language: language
    })

    if (error) {
      console.error('[RAG] Retrieval failed:', error.message)
      return []
    }

    console.log(
      `[RAG] Retrieved ${data?.length || 0} guidelines (threshold=${threshold}, topK=${topK})`
    )
    return (data || []) as GuidelineMatch[]
  } catch (e) {
    console.error('[RAG] Exception:', e)
    return []
  }
}

// ============================================================================
// Prompt formatting
// ============================================================================
export function formatGuidelinesForPrompt(matches: GuidelineMatch[]): string {
  if (matches.length === 0) {
    return `
[RAG: No recent guidelines retrieved — rely on training knowledge, but be explicit about uncertainty]
`
  }

  const sections = matches
    .map(
      (m, i) => `
[SOURCE ${i + 1}] ${m.source} ${m.version} — ${m.title}
${m.section ? `Section: ${m.section}` : ''}
${m.page_reference ? `Reference: ${m.page_reference}` : ''}
URL: ${m.url}
Effective since: ${m.effective_date}
Relevance: ${(m.similarity * 100).toFixed(0)}%

${m.content.trim()}
`
    )
    .join('\n───────────────────────────────────────────────────────────────────\n')

  return `
═══════════════════════════════════════════════════════════════════════
📚 LATEST OFFICIAL MEDICAL GUIDELINES (retrieved from RAG database)
═══════════════════════════════════════════════════════════════════════

${sections}

═══════════════════════════════════════════════════════════════════════
⚠️ CRITICAL INSTRUCTIONS FOR USING THESE GUIDELINES:

1. These guidelines are from OFFICIAL sources and MORE RECENT than your training data.
2. When your training knowledge CONFLICTS with these guidelines, TRUST THE GUIDELINES.
3. ALWAYS cite the source using format [SOURCE N] in your recommendations.
4. Include the URL in your response so the physician can verify.
5. If retrieved guidelines don't cover a specific aspect, use your training
   knowledge but state explicitly: "Not covered by retrieved guidelines, based on
   general medical knowledge: ..."
═══════════════════════════════════════════════════════════════════════
`
}

// ============================================================================
// Traceability
// ============================================================================
export interface LogRAGTraceParams {
  consultationId: string
  patientAnonymousId?: string
  queryText: string
  guidelines: GuidelineMatch[]
  alerts: any[]
  gptModel?: string
  reasoningEffort?: string
  inputTokens?: number
  outputTokens?: number
  consultationType?: string
}

export async function logRAGTrace(params: LogRAGTraceParams): Promise<void> {
  try {
    const cost = estimateCost(params.inputTokens || 0, params.outputTokens || 0)

    await supabase().from('consultation_rag_trace').insert({
      consultation_id: params.consultationId,
      patient_anonymous_id: params.patientAnonymousId,
      query_text: params.queryText.slice(0, 2000),
      guidelines_retrieved: params.guidelines.map((g) => ({
        id: g.id,
        source: g.source,
        code: g.guideline_code,
        title: g.title,
        url: g.url,
        version: g.version,
        similarity: g.similarity
      })),
      alerts_triggered: params.alerts || [],
      gpt_model: params.gptModel || 'gpt-5.4',
      reasoning_effort: params.reasoningEffort || 'medium',
      total_input_tokens: params.inputTokens,
      total_output_tokens: params.outputTokens,
      total_cost_usd: cost,
      consultation_type: params.consultationType
    })
  } catch (e) {
    console.error('[RAG] Failed to log trace:', e)
  }
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  // GPT-5.4 indicative pricing — to adjust per OpenAI pricing
  const INPUT_PRICE_PER_1M = 5.0
  const OUTPUT_PRICE_PER_1M = 15.0
  return (
    (inputTokens * INPUT_PRICE_PER_1M + outputTokens * OUTPUT_PRICE_PER_1M) / 1_000_000
  )
}
