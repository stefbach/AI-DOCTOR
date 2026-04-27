/**
 * Generic HTML scraper for medical society guideline indexes.
 *
 * Many societies don't expose RSS — they publish guidelines as a list of
 * links on a dedicated page. This scraper:
 *   1. Fetches the index page
 *   2. Extracts guideline links via configurable CSS selector
 *   3. Optionally filters links (by URL pattern, title keywords, etc.)
 *   4. For each guideline:
 *      a. Fetches the detail page
 *      b. Optionally finds and fetches a PDF
 *      c. Extracts clean text
 *      d. Hash-checks against existing rows (skip if unchanged)
 *      e. AI metadata extraction
 *      f. Chunking + embedding
 *      g. Direct insert into medical_guidelines (status='pending_review')
 *
 * Used by:
 *   - ESC, AHA, ADA, IDSA, KDIGO, GOLD, GINA, EASL, ERS, USPSTF
 */

import * as cheerio from 'cheerio'
import {
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

export interface HTMLScrapingConfig {
  /** Source registry config */
  source: SourceConfig

  /** CSS selector that matches links to guideline pages, on the index page */
  link_selector: string

  /** Optional filter applied to each link before processing */
  link_filter?: (href: string, text: string) => boolean

  /** Maximum number of links to process per run (cost control) */
  max_links?: number

  /** Optional CSS selector for the main content on the guideline detail page.
   *  Defaults to <main>, <article>, or <body>. */
  content_selector?: string

  /** Optional CSS selector for a PDF download link on the guideline page.
   *  If found and reachable, the PDF is preferred over HTML. */
  pdf_selector?: string

  /** Custom function to derive a stable guideline_code from URL+title */
  code_extractor?: (url: string, title: string) => string

  /** HTTP headers (e.g. User-Agent, Cookie) */
  headers?: Record<string, string>

  /** Optional User-Agent override */
  user_agent?: string
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; AI-DOCTOR-RAG/1.0; +https://ai-doctor.example.com)'

function defaultCodeExtractor(url: string, title: string): string {
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').filter(Boolean).pop() || ''
    const cleaned = last.replace(/\.(html|php|aspx?|pdf)$/i, '').slice(0, 100)
    if (cleaned.length >= 3) return cleaned
  } catch {}
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

async function fetchHTML(url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(url, { headers, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
  return await res.text()
}

async function fetchPDF(url: string, headers: Record<string, string>): Promise<string> {
  const pdfParse = (await import('pdf-parse' as any)).default
  const res = await fetch(url, { headers, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const data = await pdfParse(buf)
  return data.text
}

/**
 * Main entry point — scrapes a medical society guideline index page.
 */
export async function scrapeHTMLSource(
  config: HTMLScrapingConfig
): Promise<{
  totalProcessed: number
  totalNew: number
  totalUnchanged: number
  totalFailed: number
}> {
  const { source } = config
  const headers = {
    'User-Agent': config.user_agent || DEFAULT_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
    ...(config.headers || {})
  }
  const codeExtractor = config.code_extractor || defaultCodeExtractor
  const maxLinks = config.max_links ?? 30

  console.log('═'.repeat(70))
  console.log(`📚 ${source.code} — ${source.name} (HTML scraping)`)
  console.log(`   Index: ${source.primary_url}`)
  console.log(`   Selector: ${config.link_selector}`)
  console.log('═'.repeat(70))

  const startedAt = Date.now()
  const runId = await startRun(source.code, `bulk-seed:${source.code.toLowerCase()}`)
  const sb = supabase()

  let totalProcessed = 0
  let totalNew = 0
  let totalUnchanged = 0
  let totalFailed = 0
  let totalChunks = 0
  let totalTokens = 0
  const warnings: string[] = []

  // ─── Step 1: Fetch index page ────────────────────────────────────────────
  let indexHtml: string
  try {
    indexHtml = await fetchHTML(source.primary_url, headers)
  } catch (e: any) {
    console.error(`❌ Index page unreachable: ${e.message}`)
    await finishRun(runId, startedAt, {
      status: 'failed',
      error_message: `Index unreachable: ${e.message}`
    })
    await sb
      .from('guideline_sources')
      .update({
        access_status: 'blocked',
        last_failed_run: new Date().toISOString(),
        consecutive_failures: 1,
        notes: `HTML scraping blocked: ${e.message}`
      })
      .eq('source_code', source.code)
    return { totalProcessed: 0, totalNew: 0, totalUnchanged: 0, totalFailed: 1 }
  }

  // ─── Step 2: Extract links via CSS selector ──────────────────────────────
  const $ = cheerio.load(indexHtml)
  const baseUrl = new URL(source.primary_url)

  const linkCandidates: Array<{ href: string; text: string }> = []
  $(config.link_selector).each((_, el) => {
    const $el = $(el)
    const href = $el.attr('href') || ''
    const text = $el.text().trim()
    if (!href || !text) return

    // Resolve relative URLs
    let absoluteHref = href
    try {
      absoluteHref = new URL(href, baseUrl.toString()).toString()
    } catch {
      return
    }

    if (config.link_filter && !config.link_filter(absoluteHref, text)) return
    linkCandidates.push({ href: absoluteHref, text })
  })

  // Deduplicate by URL
  const seen = new Set<string>()
  const uniqueLinks = linkCandidates.filter((l) => {
    if (seen.has(l.href)) return false
    seen.add(l.href)
    return true
  })

  const links = uniqueLinks.slice(0, maxLinks)
  console.log(
    `✅ Index parsed: ${linkCandidates.length} candidates → ${uniqueLinks.length} unique → processing ${links.length}`
  )

  if (links.length === 0) {
    warnings.push(`No links found with selector "${config.link_selector}"`)
    await finishRun(runId, startedAt, {
      status: 'partial_success',
      items_fetched: 0,
      warnings
    })
    return { totalProcessed: 0, totalNew: 0, totalUnchanged: 0, totalFailed: 0 }
  }

  await sb
    .from('guideline_sources')
    .update({
      access_status: 'accessible',
      last_successful_run: new Date().toISOString(),
      consecutive_failures: 0
    })
    .eq('source_code', source.code)

  // ─── Step 3: Process each guideline ──────────────────────────────────────
  for (const link of links) {
    totalProcessed++
    const url = link.href
    const title = link.text
    const code = codeExtractor(url, title)

    console.log(`\n   [${totalProcessed}/${links.length}] ${title.slice(0, 80)}`)
    console.log(`         code=${code}`)
    console.log(`         url=${url}`)

    try {
      // 3a. Fetch detail page
      const detailHtml = await fetchHTML(url, headers)
      let text = ''
      let pdfUsed = false

      // 3b. If PDF link selector provided, try to fetch PDF
      if (config.pdf_selector) {
        const $$ = cheerio.load(detailHtml)
        const pdfHref = $$(config.pdf_selector).first().attr('href')
        if (pdfHref) {
          const pdfUrl = new URL(pdfHref, url).toString()
          try {
            text = await fetchPDF(pdfUrl, headers)
            pdfUsed = true
            console.log(`         📑 PDF used (${text.length} chars)`)
          } catch (e: any) {
            console.log(`         ⚠️  PDF failed (${e.message}), falling back to HTML`)
          }
        }
      }

      if (!text) {
        // 3c. Extract clean HTML text
        if (config.content_selector) {
          const $$ = cheerio.load(detailHtml)
          $$('nav, footer, aside, script, style, noscript').remove()
          text = $$(config.content_selector).text().replace(/\s+/g, ' ').trim()
        } else {
          text = extractCleanText(detailHtml)
        }
      }

      if (text.length < 500) {
        console.log(`         ⚠️  text too short (${text.length} chars), skipping`)
        warnings.push(`Short text: ${url}`)
        totalFailed++
        continue
      }

      // 3d. Hash check
      const hash = sha256(text)
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

      // 3e. AI metadata
      const meta = await extractMetadataWithAI(source.code, title, text)

      // 3f. Chunking
      const chunks = chunkText(text, 800, 100)
      console.log(`         📄 ${chunks.length} chunks`)
      if (chunks.length === 0) {
        totalFailed++
        continue
      }

      // 3g. Embeddings (batched)
      const embeddings = await generateEmbeddingsBatch(
        chunks.map((c) => c.content),
        100
      )

      // 3h. Insert
      const newVersion = existing ? incrementVersion(existing.version || '1.0') : '1.0'

      await insertGuidelineDirect({
        source: source.code,
        guideline_code: code,
        title,
        url,
        version: newVersion,
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
          ingestion_method: pdfUsed ? 'html+pdf' : 'html_only'
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
    items_fetched: links.length,
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
  console.log(`✅ ${source.code} done — ${totalNew} new, ${totalUnchanged} unchanged, ${totalFailed} failed`)

  return { totalProcessed, totalNew, totalUnchanged, totalFailed }
}

function incrementVersion(v: string): string {
  const m = v.match(/^(\d+)\.(\d+)$/)
  if (!m) return '1.1'
  return `${m[1]}.${parseInt(m[2]) + 1}`
}
