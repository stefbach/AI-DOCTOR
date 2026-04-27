/**
 * Generic RSS guidelines seeder.
 *
 * Used for sources that publish a standard RSS/Atom feed of new guidelines:
 *   - WHO
 *   - HAS
 *   - CDC
 *   - NICE
 *
 * Pipeline per item:
 *   1. Filter (titleIncludes / titleExcludes / age)
 *   2. Fetch full HTML page
 *   3. Hash check against existing rows (skip if unchanged)
 *   4. Extract clean text (cheerio)
 *   5. AI metadata extraction (specialty, conditions, drugs, …)
 *   6. Chunk text (~800 words, overlap 100)
 *   7. Generate embeddings (batched)
 *   8. Insert directly into medical_guidelines (status='pending_review')
 *   9. Audit log + run statistics
 */

import Parser from 'rss-parser'
import {
  applyItemFilters,
  chunkText,
  extractCleanText,
  extractMetadataWithAI,
  finishRun,
  generateEmbeddingsBatch,
  insertGuidelineDirect,
  recordFailedDocument,
  sha256,
  startRun,
  supabase
} from '../lib/helpers.js'
import type { SourceConfig } from '../lib/sources-config.js'

interface SeedOptions {
  maxItems?: number
  /** If true, only test the feed reachability, do not ingest */
  dryRun?: boolean
  /** Optional override of guideline_code extractor (regex on URL) */
  codeExtractor?: (url: string, title: string) => string
}

/**
 * Default guideline_code extractor: derives a stable code from URL or title.
 * Each source can override via codeExtractor.
 */
function defaultCodeExtractor(url: string, title: string): string {
  // Try URL last segment without extension
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').filter(Boolean).pop() || ''
    const cleaned = last.replace(/\.(html|php|aspx?)$/i, '').slice(0, 100)
    if (cleaned.length >= 3) return cleaned
  } catch {}
  // Fallback: title slug
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export async function seedRSSSource(
  source: SourceConfig,
  opts: SeedOptions = {}
): Promise<{
  totalProcessed: number
  totalNew: number
  totalUnchanged: number
  totalFailed: number
}> {
  const maxItems = opts.maxItems ?? 30
  const codeExtractor = opts.codeExtractor || defaultCodeExtractor

  console.log('═'.repeat(70))
  console.log(`📚 ${source.code} — ${source.name} — Bulk Seed`)
  console.log(`   Feed: ${source.primary_url}`)
  console.log(`   Language: ${source.language} | Frequency: ${source.frequency}`)
  console.log('═'.repeat(70))

  const startedAt = Date.now()
  const runId = await startRun(source.code, `bulk-seed:${source.code.toLowerCase()}`)

  const parser = new Parser({ timeout: 30000 })
  const sb = supabase()

  let totalProcessed = 0
  let totalNew = 0
  let totalUnchanged = 0
  let totalFailed = 0
  let totalChunks = 0
  let totalTokens = 0
  const warnings: string[] = []

  // ─── 1. Fetch RSS ────────────────────────────────────────────────────────
  let parsed
  try {
    parsed = await parser.parseURL(source.primary_url)
  } catch (e) {
    const msg = (e as Error).message
    console.error(`❌ Feed unreachable: ${msg}`)
    await finishRun(runId, startedAt, {
      status: 'failed',
      error_message: `Feed unreachable: ${msg}`
    })
    // Mark source as inaccessible
    await sb
      .from('guideline_sources')
      .update({
        access_status: 'blocked',
        last_failed_run: new Date().toISOString(),
        consecutive_failures: 1
      })
      .eq('source_code', source.code)
    return { totalProcessed: 0, totalNew: 0, totalUnchanged: 0, totalFailed: 1 }
  }

  console.log(`✅ Feed reachable, ${parsed.items.length} items`)

  // Mark source as accessible
  await sb
    .from('guideline_sources')
    .update({
      access_status: 'accessible',
      last_successful_run: new Date().toISOString(),
      consecutive_failures: 0
    })
    .eq('source_code', source.code)

  if (opts.dryRun) {
    console.log('   (dry-run, skipping ingestion)')
    await finishRun(runId, startedAt, { status: 'success', items_fetched: parsed.items.length })
    return { totalProcessed: 0, totalNew: 0, totalUnchanged: 0, totalFailed: 0 }
  }

  // ─── 2. Apply filters ────────────────────────────────────────────────────
  const filtered = applyItemFilters(parsed.items as any, source.filters)
  const items = filtered.slice(0, maxItems)
  console.log(`   ${filtered.length} match filters, processing first ${items.length}`)

  // ─── 3. Loop over items ──────────────────────────────────────────────────
  for (const item of items) {
    totalProcessed++

    if (!item.link || !item.title) {
      totalFailed++
      continue
    }

    const url = item.link
    const title = item.title.trim()
    const code = codeExtractor(url, title)

    console.log(`\n   [${totalProcessed}/${items.length}] ${title.slice(0, 80)}`)
    console.log(`         code=${code}`)

    try {
      // 3a. Fetch full document
      const fetchRes = await fetch(url, {
        headers: {
          'User-Agent': 'AI-DOCTOR-RAG-Ingest/1.0 (+https://ai-doctor.example.com)'
        }
      })
      if (!fetchRes.ok) {
        throw new Error(`HTTP ${fetchRes.status}`)
      }
      const html = await fetchRes.text()
      const hash = sha256(html)

      // 3b. Hash check (skip if unchanged)
      const { data: existing } = await sb
        .from('medical_guidelines')
        .select('id, source_hash, version')
        .eq('source', source.code)
        .eq('guideline_code', code)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (existing && existing.source_hash === hash) {
        console.log(`         ⏭  unchanged, skipping`)
        totalUnchanged++
        continue
      }

      // 3c. Extract clean text
      const text = extractCleanText(html)
      if (text.length < 500) {
        console.log(`         ⚠️  text too short (${text.length} chars), skipping`)
        warnings.push(`Short text: ${url}`)
        totalFailed++
        continue
      }

      // 3d. AI metadata extraction
      const meta = await extractMetadataWithAI(source.code, title, text)

      // 3e. Chunking
      const chunks = chunkText(text, 800, 100)
      console.log(`         📄 ${chunks.length} chunks generated`)
      if (chunks.length === 0) {
        totalFailed++
        continue
      }

      // 3f. Embeddings (batched)
      const embeddings = await generateEmbeddingsBatch(
        chunks.map((c) => c.content),
        100
      )

      // 3g. Insert directly into medical_guidelines (status='pending_review')
      const newVersion = existing
        ? incrementVersion(existing.version || '1.0')
        : '1.0'

      await insertGuidelineDirect({
        source: source.code,
        guideline_code: code,
        title,
        url,
        version: newVersion,
        effective_date: item.pubDate
          ? new Date(item.pubDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        source_hash: hash,
        language: source.language,
        specialty: meta.specialty || source.primary_specialties,
        conditions_covered: meta.conditions_covered,
        drugs_mentioned: meta.drugs_mentioned,
        patient_population: meta.patient_population,
        metadata: {
          icd10_codes: meta.icd10_codes,
          significance: meta.significance,
          rss_pub_date: item.pubDate
        },
        chunks: chunks.map((c, i) => ({
          chunk_index: c.chunk_index,
          section: c.section,
          content: c.content,
          embedding: embeddings[i]
        })),
        ingested_by: `bulk-seed:${source.code.toLowerCase()}`,
        replaces_version: existing?.version
      })

      totalNew++
      totalChunks += chunks.length
      totalTokens += chunks.reduce((sum, c) => sum + Math.ceil(c.content.length / 4), 0)

      console.log(`         ✅ ingested (status=pending_review)`)
    } catch (e: any) {
      console.error(`         ❌ ${e.message}`)
      await recordFailedDocument(source.code, url, title, 'fetch_or_parse', e.message)
      totalFailed++
    }
  }

  await finishRun(runId, startedAt, {
    status: totalFailed > totalNew ? 'partial_success' : 'success',
    items_fetched: parsed.items.length,
    items_new: totalNew,
    items_unchanged: totalUnchanged,
    items_failed: totalFailed,
    chunks_created: totalChunks,
    embeddings_generated: totalChunks,
    openai_tokens_used: totalTokens,
    estimated_cost_usd: (totalTokens * 0.02) / 1_000_000,
    warnings
  })

  console.log('\n' + '─'.repeat(70))
  console.log(`✅ ${source.code} seed complete:`)
  console.log(`   Processed : ${totalProcessed}`)
  console.log(`   New       : ${totalNew} (→ pending_review)`)
  console.log(`   Unchanged : ${totalUnchanged}`)
  console.log(`   Failed    : ${totalFailed}`)
  console.log(`   Chunks    : ${totalChunks}`)
  console.log(`   Cost est. : $${((totalTokens * 0.02) / 1_000_000).toFixed(4)}`)

  return { totalProcessed, totalNew, totalUnchanged, totalFailed }
}

function incrementVersion(v: string): string {
  const m = v.match(/^(\d+)\.(\d+)$/)
  if (!m) return '1.1'
  return `${m[1]}.${parseInt(m[2]) + 1}`
}
