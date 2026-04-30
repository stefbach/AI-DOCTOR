/**
 * Medical RAG (Retrieval-Augmented Generation) — Runtime
 *
 * Targets the TIBOK Supabase project (yyxmqositmmyyeyuryln) which holds
 * the validated guidelines pipeline (Phase 3).
 *
 * Pipeline:
 *   1. Generate embedding for the clinical query (OpenAI text-embedding-3-small)
 *   2. Call public.match_guidelines RPC on Supabase (cosine similarity)
 *   3. Format the chunks into a prompt-injection block (with [ref-N] tags)
 *   4. Return references metadata for citation display in reports
 *
 * Failsafe: any error (no embedding, RPC error, empty result) returns an
 * empty RAGContext — never blocks the diagnosis pipeline.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// ============================================================================
// Lazy singletons (Vercel build-safe, see FIX-1 pattern)
// ============================================================================
let _supabase: SupabaseClient | null = null
let _openai: OpenAI | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    }
    _supabase = createClient(url, key, { auth: { persistSession: false } })
  }
  return _supabase
}

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set')
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

// ============================================================================
// Types
// ============================================================================

/** Specialty codes recognised by the TIBOK RAG (validated by Megane). */
export type SpecialtyCode =
  | 'cardiology'
  | 'endocrinology'
  | 'preventive_medicine'
  | 'infectious_diseases'
  | 'pulmonology'

/** Raw row shape returned by public.match_guidelines RPC. */
interface MatchGuidelinesRow {
  guideline_title: string
  guideline_external_id: string
  source_code: string
  source_url: string
  source_publication_date: string | null
  specialty_code: string | null
  chunk_content: string
  chunk_metadata: { section_title?: string; [k: string]: unknown } | null
  similarity: number
}

export interface RAGChunk {
  content: string
  section: string
  similarity: number
  refId: string
}

export interface RAGReference {
  /** Citation tag injected in the prompt (e.g. "ref-1"). */
  ref_id: string
  title: string
  external_id: string
  source: string
  url: string
  publication_date: string
  specialty: string
}

export interface RAGContext {
  chunks: RAGChunk[]
  references: RAGReference[]
  totalChunks: number
  avgSimilarity: number
  /** True if RAG was successfully consulted (whether or not it returned chunks). */
  ragUsed: boolean
}

export interface QueryOptions {
  /** Specialty filter; null = broad search across all specialties. */
  specialty?: SpecialtyCode | null
  /** Cosine similarity threshold; default matches Megane's RPC default (0.7). */
  threshold?: number
  /** Max chunks to retrieve; default 8 (RPC default). */
  limit?: number
}

const EMPTY_CONTEXT: RAGContext = {
  chunks: [],
  references: [],
  totalChunks: 0,
  avgSimilarity: 0,
  ragUsed: false,
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Retrieve relevant guideline chunks from the TIBOK Supabase RAG.
 *
 * Returns an empty context (ragUsed=false) on any failure — callers MUST
 * treat RAG as best-effort enrichment, never as a hard dependency.
 */
export async function queryMedicalGuidelines(
  query: string,
  opts: QueryOptions = {}
): Promise<RAGContext> {
  const trimmedQuery = (query || '').trim()
  if (!trimmedQuery) return EMPTY_CONTEXT

  const specialty = opts.specialty ?? null
  const threshold = opts.threshold ?? 0.7
  const limit = opts.limit ?? 8

  // 1. Embed the query
  let embedding: number[]
  try {
    const t0 = Date.now()
    const res = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: trimmedQuery,
    })
    embedding = res.data[0].embedding
    console.log(`[RAG] embedding generated in ${Date.now() - t0}ms (${embedding.length} dims)`)
  } catch (err: any) {
    console.error('[RAG] embedding failed (non-blocking):', err?.message || err)
    return { ...EMPTY_CONTEXT, ragUsed: false }
  }

  // 2. Call match_guidelines RPC
  let rows: MatchGuidelinesRow[] = []
  try {
    const t0 = Date.now()
    const { data, error } = await getSupabase().rpc('match_guidelines', {
      query_embedding: embedding,
      match_specialty_code: specialty,
      match_threshold: threshold,
      match_count: limit,
    })
    if (error) {
      console.error('[RAG] match_guidelines RPC error:', error.message)
      return { ...EMPTY_CONTEXT, ragUsed: true }
    }
    rows = (data || []) as MatchGuidelinesRow[]
    console.log(
      `[RAG] match_guidelines returned ${rows.length} chunks in ${Date.now() - t0}ms ` +
        `(specialty=${specialty ?? 'any'}, threshold=${threshold}, limit=${limit})`
    )
  } catch (err: any) {
    console.error('[RAG] RPC call failed (non-blocking):', err?.message || err)
    return { ...EMPTY_CONTEXT, ragUsed: true }
  }

  if (rows.length === 0) {
    return { ...EMPTY_CONTEXT, ragUsed: true }
  }

  // 3. Build chunks + dedup references by external_id
  const refByExternalId = new Map<string, RAGReference>()
  const chunks: RAGChunk[] = []

  rows.forEach((row, idx) => {
    const externalId = row.guideline_external_id || `unknown-${idx}`
    let ref = refByExternalId.get(externalId)
    if (!ref) {
      const refId = `ref-${refByExternalId.size + 1}`
      ref = {
        ref_id: refId,
        title: row.guideline_title || 'Untitled guideline',
        external_id: externalId,
        source: row.source_code || 'UNKNOWN',
        url: row.source_url || '',
        publication_date: row.source_publication_date || '',
        specialty: row.specialty_code || '',
      }
      refByExternalId.set(externalId, ref)
    }
    chunks.push({
      content: row.chunk_content || '',
      section: row.chunk_metadata?.section_title || '',
      similarity: row.similarity || 0,
      refId: ref.ref_id,
    })
  })

  const references = Array.from(refByExternalId.values())
  const avgSimilarity =
    chunks.reduce((sum, c) => sum + c.similarity, 0) / Math.max(chunks.length, 1)

  return {
    chunks,
    references,
    totalChunks: chunks.length,
    avgSimilarity,
    ragUsed: true,
  }
}

/**
 * Format an RAGContext into a prompt-injection block.
 *
 * The block must be inserted in the system prompt with explicit instructions
 * for the LLM to cite each [ref-N] when making a recommendation.
 */
export function formatGuidelinesForPrompt(ctx: RAGContext): string {
  if (!ctx.ragUsed || ctx.chunks.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push('=== CONTEXTE GUIDELINES MÉDICALES (RAG) ===')
  lines.push('')
  lines.push(
    'Les recommandations suivantes proviennent de guidelines officielles validées.'
  )
  lines.push(
    'Utilise-les pour informer ton diagnostic et tes prescriptions.'
  )
  lines.push(
    'CHAQUE recommandation que tu donnes DOIT citer la guideline source en utilisant le format [ref-N].'
  )
  lines.push('')

  // Group chunks by ref so each guideline appears once with its sections.
  const chunksByRef = new Map<string, RAGChunk[]>()
  for (const c of ctx.chunks) {
    const arr = chunksByRef.get(c.refId) ?? []
    arr.push(c)
    chunksByRef.set(c.refId, arr)
  }

  for (const ref of ctx.references) {
    const refChunks = chunksByRef.get(ref.ref_id) ?? []
    const date = ref.publication_date ? ` (${ref.publication_date})` : ''
    lines.push(`[${ref.ref_id}] ${ref.source} ${ref.external_id}${date} — ${ref.title}`)
    if (ref.url) lines.push(`URL: ${ref.url}`)
    if (ref.specialty) lines.push(`Specialty: ${ref.specialty}`)
    for (const chunk of refChunks) {
      if (chunk.section) lines.push(`Section: ${chunk.section}`)
      lines.push(`Contenu (similarity ${chunk.similarity.toFixed(2)}):`)
      lines.push(chunk.content.trim())
      lines.push('')
    }
  }

  lines.push('=== RÈGLES OBLIGATOIRES POUR LES RÉFÉRENCES ===')
  lines.push(
    '1. Chaque recommandation diagnostique ou thérapeutique DOIT être attribuée à une référence [ref-N] si elle est supportée par les guidelines ci-dessus.'
  )
  lines.push(
    "2. Si aucune guideline du contexte ne supporte une recommandation, note explicitement: 'Recommandation basée sur la pratique clinique standard, hors guideline RAG'."
  )
  lines.push(
    '3. Liste TOUTES les références utilisées dans le champ evidence_references du JSON output.'
  )
  lines.push(
    "4. NE PAS inventer de références: ne cite que les [ref-N] présents ci-dessus."
  )
  lines.push('')

  return lines.join('\n')
}

/**
 * Infer a specialty filter from a free-text clinical query, if confident.
 * Returns null for broad search when the query mixes signals or is unclear.
 *
 * Heuristic; safe to widen or narrow without breaking callers.
 */
export function inferSpecialty(query: string): SpecialtyCode | null {
  const q = (query || '').toLowerCase()

  const cardioHits = [
    'chest pain',
    'angina',
    'acs',
    'stemi',
    'nstemi',
    'heart failure',
    'douleur thoracique',
    'tachycard',
    'bradycard',
    'hypertension',
    'hta',
    'blood pressure',
    'tension artérielle',
  ].filter(k => q.includes(k))

  const infectHits = [
    'fever',
    'fièvre',
    'tropical',
    'travel',
    'voyage',
    'malaria',
    'paludisme',
    'dengue',
    'chikungunya',
    'zika',
    'arbovir',
    'rash',
    'éruption',
    'sepsis',
    'meningitis',
    'méningite',
    'pneumonia',
    'covid',
  ].filter(k => q.includes(k))

  const endoHits = [
    'diabet',
    'glycém',
    'glycemia',
    'hba1c',
    'hyperglyc',
    'hypoglyc',
    'thyroid',
    'thyroïde',
    'insulin',
  ].filter(k => q.includes(k))

  const pulmHits = [
    'cough',
    'toux',
    'dyspn',
    'breath',
    'wheez',
    'asthma',
    'asthme',
    'copd',
    'bpco',
  ].filter(k => q.includes(k))

  const preventiveHits = [
    'screening',
    'dépistage',
    'prevent',
    'prévention',
    'check-up',
    'bilan',
    'statin',
    'aspirin',
  ].filter(k => q.includes(k))

  const scores: Array<[SpecialtyCode, number]> = [
    ['cardiology', cardioHits.length],
    ['infectious_diseases', infectHits.length],
    ['endocrinology', endoHits.length],
    ['pulmonology', pulmHits.length],
    ['preventive_medicine', preventiveHits.length],
  ]

  scores.sort((a, b) => b[1] - a[1])
  const [topCode, topScore] = scores[0]
  const [, secondScore] = scores[1]

  // Require top score ≥ 2 and clear lead over second; otherwise broad search.
  if (topScore >= 2 && topScore > secondScore) return topCode
  return null
}

/**
 * Build a clinical query string from raw consultation data.
 * The result is what we embed and search for.
 */
export function buildClinicalQuery(input: {
  chiefComplaint?: string
  symptoms?: string[]
  ageYears?: number | string
  sex?: string
  medicalHistory?: string[]
  travelHistory?: string
  vitalSigns?: Record<string, unknown>
  duration?: string
}): string {
  const parts: string[] = []
  if (input.chiefComplaint) parts.push(`Chief complaint: ${input.chiefComplaint}`)
  if (input.symptoms?.length) parts.push(`Symptoms: ${input.symptoms.join(', ')}`)
  if (input.duration) parts.push(`Duration: ${input.duration}`)
  if (input.ageYears != null && input.ageYears !== '') parts.push(`Age: ${input.ageYears}`)
  if (input.sex) parts.push(`Sex: ${input.sex}`)
  if (input.medicalHistory?.length) parts.push(`History: ${input.medicalHistory.join(', ')}`)
  if (input.travelHistory) parts.push(`Travel: ${input.travelHistory}`)
  if (input.vitalSigns) {
    const vs = Object.entries(input.vitalSigns)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    if (vs) parts.push(`Vitals: ${vs}`)
  }
  return parts.join('. ')
}
