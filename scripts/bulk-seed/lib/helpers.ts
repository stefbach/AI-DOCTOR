/**
 * Shared helpers for all bulk-seed source scripts.
 *
 * Provides:
 *   - chunkText() : split a long text into ~800-word chunks with overlap
 *   - extractCleanText() : strip HTML to readable text (uses cheerio)
 *   - sha256() : content hash for change detection
 *   - generateEmbedding() : OpenAI text-embedding-3-small
 *   - extractMetadataWithAI() : AI-driven extraction (specialty, conditions, drugs, etc.)
 *   - postToWebhook() : send batch payload to Vercel webhook /api/webhook/n8n/rag-ingest
 *   - logRun() / updateRun() : record ingestion run audit trail
 */

import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import crypto from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _openai: OpenAI | null = null
let _supabase: SupabaseClient | null = null

export function openai(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export function supabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _supabase
}

// ============================================================================
// Text utilities
// ============================================================================
export function chunkText(
  text: string,
  chunkSize = 800,
  overlap = 100
): Array<{ chunk_index: number; section: string | null; content: string }> {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  const words = cleaned.split(' ')
  const chunks = []
  let chunkIndex = 0

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const slice = words.slice(i, i + chunkSize).join(' ')
    if (slice.length < 100) break
    chunks.push({
      chunk_index: chunkIndex++,
      section: null,
      content: slice
    })
  }

  return chunks
}

export function extractCleanText(html: string): string {
  const $ = cheerio.load(html)
  $('nav, footer, aside, script, style, noscript').remove()
  $('.sidebar, .cookie-banner, .advertisement, .ad-container').remove()
  $('[role="navigation"], [role="complementary"]').remove()

  let content =
    $('main').text() ||
    $('#content').text() ||
    $('article').text() ||
    $('body').text()

  return content.replace(/\s+/g, ' ').trim()
}

export function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// ============================================================================
// OpenAI helpers
// ============================================================================
export async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = text.slice(0, 8000)
  const res = await openai().embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated
  })
  return res.data[0].embedding
}

export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize = 100
): Promise<number[][]> {
  const results: number[][] = []
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.slice(0, 8000))
    const res = await openai().embeddings.create({
      model: 'text-embedding-3-small',
      input: batch
    })
    results.push(...res.data.map((d) => d.embedding))
    // small breath between batches to respect rate limits
    if (i + batchSize < texts.length) await new Promise((r) => setTimeout(r, 200))
  }
  return results
}

export interface AIExtractedMetadata {
  specialty: string[]
  conditions_covered: string[]
  drugs_mentioned: string[]
  icd10_codes: string[]
  patient_population: {
    age_range?: string
    pregnancy?: boolean
    pediatric?: boolean
    special_populations?: string[]
  }
  significance?: 'major' | 'moderate' | 'minor' | 'cosmetic'
}

export async function extractMetadataWithAI(
  source: string,
  title: string,
  textPreview: string
): Promise<AIExtractedMetadata> {
  const prompt = `You are a medical librarian. Extract structured metadata from this clinical guideline.

Source: ${source}
Title: ${title}
Text (first 3000 chars):
${textPreview.slice(0, 3000)}

Return ONLY valid JSON (no markdown, no explanation):
{
  "specialty": ["cardiology"],
  "conditions_covered": ["acute coronary syndrome", "NSTEMI"],
  "drugs_mentioned": ["aspirin", "ticagrelor"],
  "icd10_codes": ["I20.0", "I21.0"],
  "patient_population": {
    "age_range": "adult",
    "pregnancy": false,
    "pediatric": false,
    "special_populations": ["elderly"]
  },
  "significance": "moderate"
}

Rules:
- specialty: lowercase English (cardiology, neurology, infectious_diseases, ...)
- drugs_mentioned: lowercase DCI (international nonproprietary names)
- empty array [] if a field cannot be determined — DO NOT invent`

  try {
    const res = await openai().chat.completions.create({
      model: 'gpt-5.4',
      messages: [
        { role: 'system', content: 'You are a precise medical metadata extractor. Output JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    } as any)

    const content = res.choices[0]?.message?.content || '{}'
    return JSON.parse(content) as AIExtractedMetadata
  } catch (e) {
    console.warn('[Metadata] AI extraction failed, using empty defaults:', (e as Error).message)
    return {
      specialty: [],
      conditions_covered: [],
      drugs_mentioned: [],
      icd10_codes: [],
      patient_population: {}
    }
  }
}

// ============================================================================
// Vercel webhook poster
// ============================================================================
export interface IngestPayload {
  source: string
  guideline_code: string
  title: string
  url: string
  version: string
  effective_date: string
  source_hash: string
  language: 'en' | 'fr' | 'es' | 'de'
  specialty?: string[]
  conditions_covered?: string[]
  drugs_mentioned?: string[]
  patient_population?: Record<string, any>
  metadata?: Record<string, any>
  chunks: Array<{
    chunk_index: number
    section: string | null
    content: string
    embedding: number[]
  }>
  ingested_by: string
  replaces_version?: string
}

export async function postToWebhook(
  payload: IngestPayload,
  webhookUrl?: string,
  webhookSecret?: string
): Promise<{ ok: boolean; status: number; body: any }> {
  const url = webhookUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/n8n/rag-ingest`
  const secret = webhookSecret || process.env.N8N_WEBHOOK_SECRET

  if (!url || !secret) {
    throw new Error('NEXT_PUBLIC_SITE_URL and N8N_WEBHOOK_SECRET must be set to post to webhook')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret
    },
    body: JSON.stringify(payload)
  })

  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

// Direct insert (alternative to webhook — used during bulk seed when SITE not yet deployed)
export async function insertGuidelineDirect(payload: IngestPayload): Promise<void> {
  const sb = supabase()

  // Optionally supersede previous version
  let replacesId: number | null = null
  if (payload.replaces_version) {
    const { data: prev } = await sb
      .from('medical_guidelines')
      .select('id')
      .eq('source', payload.source)
      .eq('guideline_code', payload.guideline_code)
      .eq('version', payload.replaces_version)
      .eq('status', 'active')
      .limit(1)

    if (prev && prev.length > 0) {
      replacesId = prev[0].id
      await sb
        .from('medical_guidelines')
        .update({ status: 'superseded', superseded_at: new Date().toISOString() })
        .eq('source', payload.source)
        .eq('guideline_code', payload.guideline_code)
        .eq('version', payload.replaces_version)
    }
  }

  const rows = payload.chunks.map((c) => ({
    source: payload.source,
    guideline_code: payload.guideline_code,
    title: payload.title,
    section: c.section,
    chunk_index: c.chunk_index,
    total_chunks: payload.chunks.length,
    content: c.content,
    embedding: c.embedding,
    url: payload.url,
    source_hash: payload.source_hash,
    language: payload.language,
    version: payload.version,
    effective_date: payload.effective_date,
    replaces_id: replacesId,
    status: 'pending_review',
    specialty: payload.specialty || [],
    conditions_covered: payload.conditions_covered || [],
    drugs_mentioned: payload.drugs_mentioned || [],
    patient_population: payload.patient_population || {},
    metadata: payload.metadata || {},
    ingested_by: payload.ingested_by
  }))

  const { error } = await sb.from('medical_guidelines').insert(rows)
  if (error) throw new Error(`Direct insert failed: ${error.message}`)

  await sb.from('guideline_update_log').insert({
    source: payload.source,
    guideline_code: payload.guideline_code,
    action: replacesId ? 'updated' : 'created',
    old_version: payload.replaces_version || null,
    new_version: payload.version,
    new_hash: payload.source_hash,
    triggered_by: payload.ingested_by,
    metadata: { chunks_count: payload.chunks.length, title: payload.title }
  })
}

// ============================================================================
// Run tracking
// ============================================================================
export async function startRun(
  sourceCode: string,
  triggeredBy = 'bulk-seed'
): Promise<number> {
  const sb = supabase()

  // get source_id
  const { data: src } = await sb
    .from('guideline_sources')
    .select('id')
    .eq('source_code', sourceCode)
    .maybeSingle()

  const { data, error } = await sb
    .from('guideline_ingestion_runs')
    .insert({
      source_id: src?.id || null,
      source_code: sourceCode,
      status: 'running',
      triggered_by: triggeredBy
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to start run: ${error.message}`)
  return data.id
}

export interface RunUpdate {
  status?: 'success' | 'partial_success' | 'failed' | 'skipped'
  items_fetched?: number
  items_new?: number
  items_updated?: number
  items_unchanged?: number
  items_failed?: number
  chunks_created?: number
  embeddings_generated?: number
  openai_tokens_used?: number
  estimated_cost_usd?: number
  error_message?: string
  warnings?: string[]
  metadata?: Record<string, any>
}

export async function finishRun(
  runId: number,
  startedAt: number,
  update: RunUpdate
): Promise<void> {
  const duration = Date.now() - startedAt
  await supabase()
    .from('guideline_ingestion_runs')
    .update({
      ...update,
      finished_at: new Date().toISOString(),
      duration_ms: duration
    })
    .eq('id', runId)
}

export async function recordFailedDocument(
  sourceCode: string,
  documentUrl: string,
  documentTitle: string | null,
  errorType: string,
  errorMessage: string
): Promise<void> {
  await supabase()
    .from('guideline_failed_documents')
    .insert({
      source_code: sourceCode,
      document_url: documentUrl,
      document_title: documentTitle,
      error_type: errorType,
      error_message: errorMessage,
      next_retry_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString()  // +6h
    })
}

// ============================================================================
// Filtering helper for RSS items (titleIncludes / titleExcludes / maxAgeDays)
// ============================================================================
export function applyItemFilters<T extends { title?: string; pubDate?: string }>(
  items: T[],
  filters?: {
    titleIncludes?: string[]
    titleExcludes?: string[]
    maxAgeDays?: number
  }
): T[] {
  if (!filters) return items

  const now = Date.now()
  return items.filter((item) => {
    const title = (item.title || '').toLowerCase()

    if (filters.titleIncludes && filters.titleIncludes.length > 0) {
      const hasInclude = filters.titleIncludes.some((kw) => title.includes(kw.toLowerCase()))
      if (!hasInclude) return false
    }

    if (filters.titleExcludes && filters.titleExcludes.length > 0) {
      const hasExclude = filters.titleExcludes.some((kw) => title.includes(kw.toLowerCase()))
      if (hasExclude) return false
    }

    if (filters.maxAgeDays && item.pubDate) {
      const pubTime = Date.parse(item.pubDate)
      if (!isNaN(pubTime)) {
        const ageDays = (now - pubTime) / (1000 * 3600 * 24)
        if (ageDays > filters.maxAgeDays) return false
      }
    }

    return true
  })
}
