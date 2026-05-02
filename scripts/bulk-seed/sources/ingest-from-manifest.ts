/**
 * TS Bridge: ingest manifest.json from Python collector into Supabase.
 *
 * Reads the manifest.json produced by tibok-rag-collector/download_guidelines.py
 * and:
 *   1. For each successful PDF: extract text (pdf-parse)
 *   2. AI metadata extraction (specialty, conditions, drugs)
 *   3. Chunk (~800 words, overlap 100)
 *   4. Generate embeddings (OpenAI text-embedding-3-small)
 *   5. Insert into medical_guidelines (status='pending_review')
 *
 * Preserves ALL Python metadata in metadata JSONB:
 *   - license, commercial_use, clinical_domain, priority
 *   - pdf_source (direct | pmc | manual), pmcid
 *   - sha256, size_bytes, page_url, pdf_url
 *
 * IMPORTANT: ingests EVERYTHING in the manifest by default — both the 96
 * commercial-allowed guidelines AND the 191 restricted ones. Filtering for
 * production B2B serving is done at the runtime RAG layer via the
 * `commercial_use` field stored in metadata, NOT at ingestion time.
 *
 * Usage:
 *   npx tsx scripts/bulk-seed/sources/ingest-from-manifest.ts <manifest-path>
 *
 * Examples:
 *   # ingest all 287 guidelines from a Python download run
 *   npx tsx scripts/bulk-seed/sources/ingest-from-manifest.ts \
 *     ./tibok-rag-collector/pdfs/manifest.json
 *
 *   # filter (for testing): only HAS source
 *   FILTER_SOURCE=HAS npx tsx scripts/bulk-seed/sources/ingest-from-manifest.ts ...
 *
 *   # filter (for testing): only commercial-allowed
 *   FILTER_COMMERCIAL=allowed npx tsx scripts/bulk-seed/sources/ingest-from-manifest.ts ...
 *
 *   # resume: skip docs already in DB (by sha256)
 *   RESUME=true npx tsx scripts/bulk-seed/sources/ingest-from-manifest.ts ...
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import {
  chunkText,
  extractMetadataWithAI,
  finishRun,
  generateEmbeddingsBatch,
  insertGuidelineDirect,
  startRun,
  supabase
} from '../lib/helpers.js'

interface ManifestDoc {
  id: string
  source: string
  title: string
  year: string
  page_url: string
  pdf_url: string | null
  pdf_source: string  // "direct" | "pmc" | "manual"
  pmcid: string | null
  local_path: string | null
  sha256: string | null
  size_bytes: number | null
  status: string  // "ok" | "no_pdf" | "http_error" | "exception"
  error: string | null
  license: string
  commercial_use: string
  clinical_domain: string
  priority: string
}

interface Manifest {
  generated_at: string
  total: number
  ok: number
  ok_direct: number
  ok_pmc: number
  no_pdf: number
  http_error: number
  exception: number
  documents: ManifestDoc[]
}

async function extractPDFText(pdfPath: string): Promise<string> {
  const pdfParse = (await import('pdf-parse' as any)).default
  const buf = await fs.readFile(pdfPath)
  const data = await pdfParse(buf)
  return data.text
}

function deriveLanguage(source: string): 'en' | 'fr' {
  return source === 'HAS' ? 'fr' : 'en'
}

function inferSpecialties(domain: string): string[] {
  // Map clinical_domain (Python CSV) to specialty (TS schema)
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
    pharmacology: ['pharmacology'],
    'care-org': ['care_organization']
  }
  return map[domain] || [domain]
}

async function ingestOne(
  doc: ManifestDoc,
  manifestDir: string,
  resume: boolean
): Promise<{ ok: boolean; reason?: string }> {
  if (doc.status !== 'ok' || !doc.local_path) {
    return { ok: false, reason: `Python status=${doc.status}` }
  }

  const sb = supabase()

  // Resume: skip if already ingested with this exact sha256
  if (resume && doc.sha256) {
    const { data: existing } = await sb
      .from('medical_guidelines')
      .select('id')
      .eq('source', doc.source)
      .eq('guideline_code', doc.id)
      .eq('source_hash', doc.sha256)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return { ok: false, reason: 'already_ingested' }
    }
  }

  // Resolve PDF path (could be absolute or relative to manifest dir)
  let pdfPath = doc.local_path
  if (!path.isAbsolute(pdfPath)) {
    pdfPath = path.resolve(manifestDir, pdfPath)
  }

  // 1. Extract text
  let text: string
  try {
    text = await extractPDFText(pdfPath)
  } catch (e: any) {
    return { ok: false, reason: `PDF extract failed: ${e.message}` }
  }
  if (text.length < 500) {
    return { ok: false, reason: `text too short (${text.length} chars)` }
  }

  // 2. AI metadata extraction
  const meta = await extractMetadataWithAI(doc.source, doc.title, text)

  // 3. Chunking
  const chunks = chunkText(text, 800, 100)
  if (chunks.length === 0) {
    return { ok: false, reason: 'no chunks generated' }
  }

  // 4. Embeddings
  const embeddings = await generateEmbeddingsBatch(
    chunks.map((c) => c.content),
    100
  )

  // 5. Insert into Supabase
  await insertGuidelineDirect({
    source: doc.source,
    guideline_code: doc.id,
    title: doc.title,
    url: doc.page_url,
    version: doc.year || '1.0',
    effective_date: doc.year ? `${doc.year}-01-01` : new Date().toISOString().split('T')[0],
    source_hash: doc.sha256 || '',
    language: deriveLanguage(doc.source),
    specialty: meta.specialty?.length ? meta.specialty : inferSpecialties(doc.clinical_domain),
    conditions_covered: meta.conditions_covered,
    drugs_mentioned: meta.drugs_mentioned,
    patient_population: meta.patient_population,
    metadata: {
      // Python-collector provenance
      license: doc.license,
      commercial_use: doc.commercial_use,  // 'allowed' | 'restricted' | 'restricted-cds'
      clinical_domain: doc.clinical_domain,
      priority: doc.priority,
      pdf_source: doc.pdf_source,  // 'direct' | 'pmc' | 'manual'
      pmcid: doc.pmcid,
      pdf_url: doc.pdf_url,
      size_bytes: doc.size_bytes,
      // AI extraction
      icd10_codes: meta.icd10_codes,
      significance: meta.significance
    },
    chunks: chunks.map((c, i) => ({
      chunk_index: c.chunk_index,
      section: c.section,
      content: c.content,
      embedding: embeddings[i]
    })),
    ingested_by: `python-collector:${doc.pdf_source}`
  })

  return { ok: true }
}

async function main() {
  const manifestPath = process.argv[2]
  if (!manifestPath) {
    console.error('Usage: npx tsx scripts/bulk-seed/sources/ingest-from-manifest.ts <manifest.json>')
    console.error('')
    console.error('Optional env vars:')
    console.error('  FILTER_SOURCE=NICE      only ingest one source (default: ALL 287)')
    console.error('  FILTER_COMMERCIAL=allowed   only ingest commercial-allowed (default: BOTH)')
    console.error('  RESUME=true             skip docs already in DB (by sha256)')
    console.error('  MAX_DOCS=10             cap for testing')
    process.exit(1)
  }

  const filterSource = process.env.FILTER_SOURCE || null
  const filterCommercial = process.env.FILTER_COMMERCIAL || null
  const resume = process.env.RESUME === 'true'
  const maxDocs = process.env.MAX_DOCS ? parseInt(process.env.MAX_DOCS) : 0

  console.log('═'.repeat(70))
  console.log('📥 Ingesting manifest into Supabase')
  console.log(`   Manifest: ${manifestPath}`)
  console.log(`   Filters : source=${filterSource || '(all)'} commercial=${filterCommercial || '(all)'}`)
  console.log(`   Resume  : ${resume}`)
  console.log(`   Max docs: ${maxDocs || '(no limit)'}`)
  console.log('═'.repeat(70))

  const manifestDir = path.dirname(path.resolve(manifestPath))
  const raw = await fs.readFile(manifestPath, 'utf-8')
  const manifest: Manifest = JSON.parse(raw)

  console.log(`\n📊 Manifest stats:`)
  console.log(`   Total documents : ${manifest.total}`)
  console.log(`   Status OK       : ${manifest.ok} (direct=${manifest.ok_direct}, pmc=${manifest.ok_pmc})`)
  console.log(`   Failed          : ${manifest.no_pdf + manifest.http_error + manifest.exception}`)
  console.log('')

  // Apply filters
  let docs = manifest.documents.filter((d) => d.status === 'ok')
  if (filterSource) {
    docs = docs.filter((d) => d.source === filterSource)
  }
  if (filterCommercial) {
    docs = docs.filter((d) => d.commercial_use === filterCommercial)
  }
  if (maxDocs > 0) {
    docs = docs.slice(0, maxDocs)
  }

  // Default: ingest ALL 287 (both commercial allowed and restricted)
  if (!filterCommercial) {
    const allowed = docs.filter((d) => d.commercial_use === 'allowed').length
    const restricted = docs.filter((d) => d.commercial_use !== 'allowed').length
    console.log(`📋 Will ingest ${docs.length} guidelines:`)
    console.log(`     - ${allowed} with commercial_use='allowed' (USPSTF, CDC, ECDC, HAS)`)
    console.log(`     - ${restricted} with restrictions (will be tagged in metadata.commercial_use)`)
    console.log(`   ⚠️  Commercial filter applied at RUNTIME via metadata.commercial_use, not at ingestion.`)
    console.log('')
  }

  const startedAt = Date.now()
  const runId = await startRun('python-bridge', `manifest:${path.basename(manifestPath)}`)

  let totalOk = 0
  let totalSkipped = 0
  let totalFailed = 0
  let totalChunks = 0
  let totalTokens = 0

  for (const [index, doc] of docs.entries()) {
    const tag = `[${index + 1}/${docs.length}] ${doc.source}/${doc.id}`
    process.stdout.write(`${tag} ${doc.title.slice(0, 60).padEnd(60)} `)

    try {
      const result = await ingestOne(doc, manifestDir, resume)
      if (result.ok) {
        totalOk++
        // Approx chunk + token counts for stats
        const text = await fs.readFile(doc.local_path!).catch(() => Buffer.from(''))
        totalChunks += Math.ceil(text.length / 4000)
        totalTokens += Math.ceil(text.length / 4)
        console.log('✅')
      } else {
        if (result.reason === 'already_ingested') {
          totalSkipped++
          console.log('⏭  skipped (already ingested)')
        } else {
          totalFailed++
          console.log(`❌ ${result.reason}`)
        }
      }
    } catch (e: any) {
      totalFailed++
      console.log(`💥 ${e.message}`)
    }
  }

  const cost = (totalTokens * 0.02) / 1_000_000

  await finishRun(runId, startedAt, {
    status: totalFailed > totalOk ? 'partial_success' : 'success',
    items_fetched: docs.length,
    items_new: totalOk,
    items_unchanged: totalSkipped,
    items_failed: totalFailed,
    chunks_created: totalChunks,
    embeddings_generated: totalChunks,
    openai_tokens_used: totalTokens,
    estimated_cost_usd: cost
  })

  console.log('')
  console.log('═'.repeat(70))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(70))
  console.log(`   Ingested  : ${totalOk}`)
  console.log(`   Skipped   : ${totalSkipped}`)
  console.log(`   Failed    : ${totalFailed}`)
  console.log(`   Chunks    : ~${totalChunks}`)
  console.log(`   Cost est. : $${cost.toFixed(4)}`)
  console.log('')
  console.log('   Next steps:')
  console.log('     1. Review pending guidelines: /admin/guidelines')
  console.log('     2. Validate per source: UPDATE medical_guidelines SET status=\'active\' WHERE source=...')
  console.log('     3. Optional: filter at runtime by metadata->>\'commercial_use\' for B2B prod')
  console.log('')

  process.exit(totalFailed > totalOk ? 1 : 0)
}

main().catch((e) => {
  console.error('💥 Fatal:', e)
  process.exit(1)
})
