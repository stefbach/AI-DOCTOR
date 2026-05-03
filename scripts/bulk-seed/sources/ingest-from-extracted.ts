/**
 * TS Bridge: ingest extracted text from tibok-rag-collector/extracted/<SOURCE>.json
 * directly into Supabase.
 *
 * Unlike ingest-from-manifest.ts (which expects PDFs on disk and re-extracts text),
 * this bridge consumes the pre-extracted text already committed in the repo.
 *
 * Why: the Python extract_all.py has already done the heavy work of downloading
 * PDFs (or fetching via NCBI efetch XML for paywalled articles), extracting plain
 * text, and chunking. The only step remaining is generating embeddings and
 * inserting into Supabase.
 *
 * Usage:
 *   # Ingest one source
 *   npx tsx scripts/bulk-seed/sources/ingest-from-extracted.ts NICE
 *
 *   # Ingest all sources
 *   npx tsx scripts/bulk-seed/sources/ingest-from-extracted.ts ALL
 *
 *   # Dry-run (no embeddings, no insert)
 *   DRY_RUN=true npx tsx scripts/bulk-seed/sources/ingest-from-extracted.ts ALL
 *
 *   # Resume after interruption
 *   RESUME=true npx tsx scripts/bulk-seed/sources/ingest-from-extracted.ts ALL
 *
 * Cost (per OpenAI text-embedding-3-small, ~$0.02/M tokens):
 *   - 209 docs × 4780 chunks × ~800 tokens = ~3.8M tokens = ~$0.08 total
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import {
  finishRun,
  generateEmbeddingsBatch,
  insertGuidelineDirect,
  startRun,
  supabase
} from '../lib/helpers.js'

const EXTRACTED_DIR = path.resolve('tibok-rag-collector/extracted')

interface ExtractedDoc {
  id: string
  source: string
  title: string
  year: string
  page_url: string
  pdf_url: string
  license: string
  commercial_use: string
  clinical_domain: string
  priority: string
  sha256: string
  size_bytes: number
  pdf_source: string  // 'direct' | 'pmc-xml'
  pmcid: string | null
  char_count: number
  chunk_count: number
  extracted_at: string
  chunks: Array<{ chunk_index: number; content: string }>
}

interface ExtractedFile {
  source: string
  generated_at: string
  total_documents: number
  documents: ExtractedDoc[]
}

function deriveLanguage(source: string): 'en' | 'fr' {
  return source === 'HAS' ? 'fr' : 'en'
}

function inferSpecialties(domain: string): string[] {
  const map: Record<string, string[]> = {
    cardiology: ['cardiology'],
    neurology: ['neurology'],
    endocrinology: ['endocrinology'],
    obstetrics: ['obstetrics', 'gynecology'],
    gynecology: ['gynecology'],
    pediatrics: ['pediatrics'],
    nephrology: ['nephrology'],
    respiratory: ['pulmonology', 'respiratory'],
    psychiatry: ['psychiatry'],
    infectious: ['infectious_diseases'],
    oncology: ['oncology'],
    rheumatology: ['rheumatology'],
    musculoskeletal: ['musculoskeletal'],
    hepatology: ['hepatology'],
    pain: ['pain_management'],
    geriatrics: ['geriatrics'],
    prevention: ['prevention'],
    emergency: ['emergency_medicine'],
    pharmacology: ['pharmacology']
  }
  return map[domain] || [domain]
}

async function ingestOne(doc: ExtractedDoc, resume: boolean, dryRun: boolean): Promise<{ ok: boolean; reason?: string }> {
  const sb = supabase()

  if (resume && doc.sha256) {
    const { data: existing } = await sb
      .from('medical_guidelines')
      .select('id')
      .eq('source', doc.source)
      .eq('guideline_code', doc.id)
      .eq('source_hash', doc.sha256)
      .limit(1)
      .maybeSingle()
    if (existing) return { ok: false, reason: 'already_ingested' }
  }

  if (!doc.chunks || doc.chunks.length === 0) {
    return { ok: false, reason: 'no chunks in extracted file' }
  }

  if (dryRun) {
    return { ok: true, reason: 'dry-run' }
  }

  const embeddings = await generateEmbeddingsBatch(
    doc.chunks.map((c) => c.content),
    100
  )

  await insertGuidelineDirect({
    source: doc.source,
    guideline_code: doc.id,
    title: doc.title,
    url: doc.page_url,
    version: doc.year || '1.0',
    effective_date: doc.year ? `${doc.year}-01-01` : new Date().toISOString().split('T')[0],
    source_hash: doc.sha256,
    language: deriveLanguage(doc.source),
    specialty: inferSpecialties(doc.clinical_domain),
    conditions_covered: [],
    drugs_mentioned: [],
    patient_population: {},
    metadata: {
      license: doc.license,
      commercial_use: doc.commercial_use,
      clinical_domain: doc.clinical_domain,
      priority: doc.priority,
      pdf_source: doc.pdf_source,
      pmcid: doc.pmcid,
      pdf_url: doc.pdf_url,
      size_bytes: doc.size_bytes,
      char_count: doc.char_count,
      extracted_at: doc.extracted_at
    },
    chunks: doc.chunks.map((c, i) => ({
      chunk_index: c.chunk_index,
      section: null,
      content: c.content,
      embedding: embeddings[i]
    })),
    ingested_by: `extract-all:${doc.pdf_source}`
  })

  return { ok: true }
}

async function ingestSource(sourceCode: string, resume: boolean, dryRun: boolean) {
  const filePath = path.join(EXTRACTED_DIR, `${sourceCode}.json`)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    console.log(`  ⏭  ${sourceCode}: no extracted file (${filePath})`)
    return { ok: 0, skipped: 0, failed: 0 }
  }
  const data: ExtractedFile = JSON.parse(raw)
  const docs = data.documents || []

  console.log(`\n═══ ${sourceCode} — ${docs.length} documents ═══`)
  const startedAt = Date.now()
  const runId = await startRun(sourceCode, `extract-bridge:${sourceCode}`)

  let ok = 0, skipped = 0, failed = 0
  let totalChunks = 0
  let totalTokens = 0

  for (const [i, doc] of docs.entries()) {
    process.stdout.write(`  [${i + 1}/${docs.length}] ${doc.id} ${doc.title.slice(0, 50).padEnd(50)} `)
    try {
      const r = await ingestOne(doc, resume, dryRun)
      if (r.ok) {
        ok++
        totalChunks += doc.chunk_count
        totalTokens += doc.char_count / 4  // rough
        console.log(dryRun ? '🔵 dry' : '✅')
      } else if (r.reason === 'already_ingested') {
        skipped++
        console.log('⏭')
      } else {
        failed++
        console.log(`❌ ${r.reason}`)
      }
    } catch (e: any) {
      failed++
      console.log(`💥 ${e.message}`)
    }
  }

  await finishRun(runId, startedAt, {
    status: failed > ok ? 'partial_success' : 'success',
    items_fetched: docs.length,
    items_new: ok,
    items_unchanged: skipped,
    items_failed: failed,
    chunks_created: totalChunks,
    embeddings_generated: dryRun ? 0 : totalChunks,
    openai_tokens_used: dryRun ? 0 : Math.round(totalTokens),
    estimated_cost_usd: dryRun ? 0 : (totalTokens * 0.02) / 1_000_000
  })

  console.log(`  → ${sourceCode}: ok=${ok} skipped=${skipped} failed=${failed} (${totalChunks} chunks)`)
  return { ok, skipped, failed }
}

async function main() {
  const target = process.argv[2]
  if (!target) {
    console.error('Usage: ingest-from-extracted.ts <SOURCE|ALL>')
    console.error('       Pass "ALL" to ingest every <SOURCE>.json in extracted/')
    console.error('       Or pass a single source code (e.g. NICE, WHO, ESC)')
    process.exit(1)
  }
  const resume = process.env.RESUME === 'true'
  const dryRun = process.env.DRY_RUN === 'true'

  // Dynamically discover all extracted source files (preserves all 126+ sources
  // added across the 6 extraction passes — no hardcoded list to update).
  const allFiles = await fs.readdir(EXTRACTED_DIR)
  const allSources = allFiles
    .filter((f) => f.endsWith('.json') && f !== '_summary.json')
    .map((f) => f.replace(/\.json$/, ''))
    .sort()

  const targets = target.toUpperCase() === 'ALL' ? allSources : [target]

  console.log('╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║   AI-DOCTOR — Ingest extracted JSONs into Supabase               ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝')
  console.log(`  Sources : ${targets.length} (${targets.slice(0, 6).join(', ')}${targets.length > 6 ? ', ...' : ''})`)
  console.log(`  Resume  : ${resume}`)
  console.log(`  Dry run : ${dryRun}`)

  const summary = []
  for (const src of targets) {
    const r = await ingestSource(src, resume, dryRun)
    summary.push({ source: src, ...r })
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║                          FINAL SUMMARY                            ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝')
  for (const r of summary) {
    console.log(`  ${r.source.padEnd(8)} ok=${String(r.ok).padStart(3)} skipped=${String(r.skipped).padStart(3)} failed=${String(r.failed).padStart(3)}`)
  }
  const totalOk = summary.reduce((s, r) => s + r.ok, 0)
  const totalFailed = summary.reduce((s, r) => s + r.failed, 0)
  console.log(`  TOTAL    ok=${totalOk} failed=${totalFailed}`)
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
