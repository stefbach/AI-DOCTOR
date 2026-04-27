/**
 * Webhook called by n8n after a guideline has been processed.
 *
 * n8n does the heavy lifting (fetch, parse, AI metadata extraction, chunking,
 * embeddings) and then POSTs the final payload here for storage.
 *
 * Auth: header X-Webhook-Secret must match N8N_WEBHOOK_SECRET.
 *
 * Payload schema is enforced via zod.
 *
 * Status of inserted chunks is always 'pending_review' — human validation
 * required before they become 'active' and visible to the runtime RAG.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

const ChunkSchema = z.object({
  chunk_index: z.number().int().min(0),
  section: z.string().optional().nullable(),
  content: z.string().min(50),
  embedding: z.array(z.number()).length(1536)
})

const IngestSchema = z.object({
  source: z.enum([
    'NICE','WHO','ESC','AHA','ACC','ADA','HAS','IDSA',
    'KDIGO','GOLD','GINA','USPSTF','CDC','ECDC','EASL',
    'ERS','BNF','OTHER'
  ]),
  guideline_code: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  version: z.string().default('1.0'),
  effective_date: z.string(),
  source_hash: z.string().min(8),
  language: z.enum(['en','fr','es','de']).default('en'),
  specialty: z.array(z.string()).optional().default([]),
  conditions_covered: z.array(z.string()).optional().default([]),
  drugs_mentioned: z.array(z.string()).optional().default([]),
  patient_population: z.record(z.any()).optional().default({}),
  metadata: z.record(z.any()).optional().default({}),
  chunks: z.array(ChunkSchema).min(1),
  ingested_by: z.string().default('n8n'),
  replaces_version: z.string().optional()
})

export async function POST(request: NextRequest) {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── Validation ──────────────────────────────────────────────────────────
  let payload
  try {
    const body = await request.json()
    payload = IngestSchema.parse(body)
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Invalid payload', details: e.errors || e.message },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    // ─── Supersede previous version if applicable ──────────────────────────
    let replacesId: number | null = null
    if (payload.replaces_version) {
      const { data: prev } = await supabase
        .from('medical_guidelines')
        .select('id')
        .eq('source', payload.source)
        .eq('guideline_code', payload.guideline_code)
        .eq('version', payload.replaces_version)
        .eq('status', 'active')
        .limit(1)

      if (prev && prev.length > 0) {
        replacesId = prev[0].id
        await supabase
          .from('medical_guidelines')
          .update({
            status: 'superseded',
            superseded_at: new Date().toISOString()
          })
          .eq('source', payload.source)
          .eq('guideline_code', payload.guideline_code)
          .eq('version', payload.replaces_version)
      }
    }

    // ─── Insert all chunks ─────────────────────────────────────────────────
    const chunks = payload.chunks.map((chunk) => ({
      source: payload.source,
      guideline_code: payload.guideline_code,
      title: payload.title,
      section: chunk.section || null,
      chunk_index: chunk.chunk_index,
      total_chunks: payload.chunks.length,
      content: chunk.content,
      embedding: chunk.embedding,
      url: payload.url,
      source_hash: payload.source_hash,
      language: payload.language,
      version: payload.version,
      effective_date: payload.effective_date,
      replaces_id: replacesId,
      status: 'pending_review',
      specialty: payload.specialty,
      conditions_covered: payload.conditions_covered,
      drugs_mentioned: payload.drugs_mentioned,
      patient_population: payload.patient_population,
      metadata: payload.metadata,
      ingested_by: payload.ingested_by
    }))

    const { error: insertError } = await supabase
      .from('medical_guidelines')
      .insert(chunks)

    if (insertError) throw insertError

    // ─── Audit log ─────────────────────────────────────────────────────────
    await supabase.from('guideline_update_log').insert({
      source: payload.source,
      guideline_code: payload.guideline_code,
      action: replacesId ? 'updated' : 'created',
      old_version: payload.replaces_version || null,
      new_version: payload.version,
      new_hash: payload.source_hash,
      triggered_by: payload.ingested_by,
      metadata: {
        chunks_count: payload.chunks.length,
        title: payload.title,
        url: payload.url
      }
    })

    return NextResponse.json({
      success: true,
      ingested_chunks: payload.chunks.length,
      status: 'pending_review',
      guideline_code: payload.guideline_code,
      admin_review_url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/guidelines`
    })
  } catch (error: any) {
    console.error('[Webhook n8n/rag-ingest] Error:', error)
    return NextResponse.json(
      { error: 'Ingestion failed', details: error.message },
      { status: 500 }
    )
  }
}
