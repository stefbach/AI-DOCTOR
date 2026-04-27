/**
 * NICE Manual PDF Seeder
 *
 * Used when automated NICE access is blocked. Operator downloads the PDF
 * from nice.org.uk manually and runs:
 *
 *   npx tsx scripts/bulk-seed/sources/nice-manual.ts <pdf-path> <code> "<title>"
 *
 * Example:
 *   npx tsx scripts/bulk-seed/sources/nice-manual.ts ./guidelines/ng185.pdf NG185 "Acute coronary syndromes"
 */

import fs from 'node:fs/promises'
import {
  chunkText,
  extractMetadataWithAI,
  generateEmbeddingsBatch,
  insertGuidelineDirect,
  sha256,
  startRun,
  finishRun
} from '../lib/helpers.js'

async function extractPDFText(pdfPath: string): Promise<string> {
  // Lazy import (heavy dep)
  const pdfParse = (await import('pdf-parse')).default
  const buf = await fs.readFile(pdfPath)
  const data = await pdfParse(buf)
  return data.text
}

async function main() {
  const [pdfPath, code, ...titleParts] = process.argv.slice(2)
  const title = titleParts.join(' ')

  if (!pdfPath || !code || !title) {
    console.error('Usage: npx tsx scripts/bulk-seed/sources/nice-manual.ts <pdf-path> <code> "<title>"')
    console.error('Example: ... ./ng185.pdf NG185 "Acute coronary syndromes"')
    process.exit(1)
  }

  console.log(`📄 Processing ${pdfPath} → NICE ${code}`)
  const startedAt = Date.now()
  const runId = await startRun('NICE', `manual:${code}`)

  try {
    const text = await extractPDFText(pdfPath)
    console.log(`   ${text.length} chars extracted`)

    const hash = sha256(text)
    const meta = await extractMetadataWithAI('NICE', title, text)
    const chunks = chunkText(text, 800, 100)
    console.log(`   ${chunks.length} chunks generated`)

    const embeddings = await generateEmbeddingsBatch(
      chunks.map((c) => c.content),
      100
    )

    await insertGuidelineDirect({
      source: 'NICE',
      guideline_code: code,
      title,
      url: `https://www.nice.org.uk/guidance/${code.toLowerCase()}`,
      version: '1.0',
      effective_date: new Date().toISOString().split('T')[0],
      source_hash: hash,
      language: 'en',
      specialty: meta.specialty || ['all'],
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
      ingested_by: 'manual:nice'
    })

    await finishRun(runId, startedAt, {
      status: 'success',
      items_fetched: 1,
      items_new: 1,
      chunks_created: chunks.length,
      embeddings_generated: chunks.length
    })

    console.log(`✅ Ingested ${code} — ${chunks.length} chunks (status=pending_review)`)
  } catch (e: any) {
    await finishRun(runId, startedAt, { status: 'failed', error_message: e.message })
    console.error(`❌ Failed: ${e.message}`)
    process.exit(1)
  }
}

main()
