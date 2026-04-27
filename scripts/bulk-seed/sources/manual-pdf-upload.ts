/**
 * Manual PDF Upload — universal fallback for any source that's blocked.
 *
 * When a source's automated scraping is blocked (geo-restriction, paywall,
 * anti-bot), the operator downloads the PDF manually from a browser and
 * runs this script to ingest it.
 *
 * Usage:
 *   npx tsx scripts/bulk-seed/sources/manual-pdf-upload.ts \
 *       <source-code> <pdf-path> <guideline-code> "<title>" [url]
 *
 * Examples:
 *   # NICE NG185
 *   npx tsx scripts/bulk-seed/sources/manual-pdf-upload.ts \
 *       NICE ./guidelines/ng185.pdf NG185 "Acute coronary syndromes" \
 *       https://www.nice.org.uk/guidance/ng185
 *
 *   # ESC 2024 STEMI
 *   npx tsx scripts/bulk-seed/sources/manual-pdf-upload.ts \
 *       ESC ./guidelines/esc-stemi-2024.pdf ESC-STEMI-2024 \
 *       "ESC 2024 Guidelines for STEMI" https://www.escardio.org/...
 *
 *   # ADA Standards of Care 2026
 *   npx tsx scripts/bulk-seed/sources/manual-pdf-upload.ts \
 *       ADA ./guidelines/ada-soc-2026.pdf ADA-2026-SOC \
 *       "Standards of Medical Care in Diabetes 2026" https://...
 */

import fs from 'node:fs/promises'
import { SOURCES } from '../lib/sources-config.js'
import {
  chunkText,
  extractMetadataWithAI,
  finishRun,
  generateEmbeddingsBatch,
  insertGuidelineDirect,
  sha256,
  startRun
} from '../lib/helpers.js'

async function extractPDFText(pdfPath: string): Promise<string> {
  const pdfParse = (await import('pdf-parse' as any)).default
  const buf = await fs.readFile(pdfPath)
  const data = await pdfParse(buf)
  return data.text
}

async function main() {
  const [sourceCode, pdfPath, code, ...rest] = process.argv.slice(2)
  const title = rest.filter((s) => !s.startsWith('http')).join(' ')
  const url =
    rest.find((s) => s.startsWith('http')) ||
    `https://example.com/${sourceCode.toLowerCase()}/${code.toLowerCase()}`

  if (!sourceCode || !pdfPath || !code || !title) {
    console.error('Usage:')
    console.error(
      '  npx tsx scripts/bulk-seed/sources/manual-pdf-upload.ts <source-code> <pdf-path> <guideline-code> "<title>" [url]'
    )
    console.error('')
    console.error('Available source codes:')
    Object.values(SOURCES).forEach((s) => {
      console.error(`  ${s.code.padEnd(8)} ${s.name}`)
    })
    process.exit(1)
  }

  const source = SOURCES[sourceCode.toUpperCase()]
  if (!source) {
    console.error(`❌ Unknown source code: ${sourceCode}`)
    console.error('Run without arguments to see valid codes.')
    process.exit(1)
  }

  console.log('═'.repeat(70))
  console.log(`📄 Manual PDF Upload — ${source.name}`)
  console.log('═'.repeat(70))
  console.log(`  Source:    ${source.code}`)
  console.log(`  PDF path:  ${pdfPath}`)
  console.log(`  Code:      ${code}`)
  console.log(`  Title:     ${title}`)
  console.log(`  URL:       ${url}`)
  console.log(`  Language:  ${source.language}`)
  console.log('')

  const startedAt = Date.now()
  const runId = await startRun(source.code, `manual:${code}`)

  try {
    // 1. Extract text from PDF
    console.log('📑 Extracting text from PDF...')
    const text = await extractPDFText(pdfPath)
    console.log(`   ${text.length} characters extracted`)
    if (text.length < 500) {
      throw new Error('PDF text too short — empty or scanned PDF without OCR?')
    }

    // 2. Hash for change detection
    const hash = sha256(text)

    // 3. AI metadata extraction
    console.log('🤖 Running AI metadata extraction...')
    const meta = await extractMetadataWithAI(source.code, title, text)
    console.log(`   Specialty: ${(meta.specialty || []).join(', ') || '(none detected)'}`)
    console.log(`   Drugs:     ${(meta.drugs_mentioned || []).slice(0, 5).join(', ') || '(none)'}`)

    // 4. Chunking
    console.log('✂️  Chunking...')
    const chunks = chunkText(text, 800, 100)
    console.log(`   ${chunks.length} chunks generated`)

    // 5. Embeddings
    console.log('🧠 Generating embeddings (this may take a minute)...')
    const embeddings = await generateEmbeddingsBatch(
      chunks.map((c) => c.content),
      100
    )

    // 6. Insert
    console.log('💾 Inserting into Supabase...')
    await insertGuidelineDirect({
      source: source.code,
      guideline_code: code,
      title,
      url,
      version: '1.0',
      effective_date: new Date().toISOString().split('T')[0],
      source_hash: hash,
      language: source.language,
      specialty: meta.specialty || source.primary_specialties,
      conditions_covered: meta.conditions_covered,
      drugs_mentioned: meta.drugs_mentioned,
      patient_population: meta.patient_population,
      metadata: {
        icd10_codes: meta.icd10_codes,
        significance: meta.significance,
        ingestion_method: 'manual_pdf'
      },
      chunks: chunks.map((c, i) => ({
        chunk_index: c.chunk_index,
        section: c.section,
        content: c.content,
        embedding: embeddings[i]
      })),
      ingested_by: `manual:${source.code.toLowerCase()}`
    })

    const cost = (chunks.reduce((s, c) => s + Math.ceil(c.content.length / 4), 0) * 0.02) / 1_000_000

    await finishRun(runId, startedAt, {
      status: 'success',
      items_fetched: 1,
      items_new: 1,
      chunks_created: chunks.length,
      embeddings_generated: chunks.length,
      estimated_cost_usd: cost
    })

    console.log('')
    console.log(
      `✅ Successfully ingested ${source.code}/${code} — ${chunks.length} chunks (status=pending_review)`
    )
    console.log(`   Cost: $${cost.toFixed(4)}`)
    console.log(`   Validate at: /admin/guidelines`)
  } catch (e: any) {
    await finishRun(runId, startedAt, {
      status: 'failed',
      error_message: e.message
    })
    console.error(`❌ Failed: ${e.message}`)
    process.exit(1)
  }
}

main()
