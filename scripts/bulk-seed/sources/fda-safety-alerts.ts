/**
 * Bulk-seed: FDA Drug Safety Alerts
 *
 * Strategy:
 *   1. Pull FDA RSS feeds (recalls + drug safety communications)
 *   2. For each item, use GPT to extract structured drug info
 *   3. Insert into drug_safety_alerts table
 *
 * Target table: drug_safety_alerts (NOT medical_guidelines)
 *
 * Usage: imported by scripts/bulk-seed/index.ts (or run standalone via tsx)
 */

import Parser from 'rss-parser'
import {
  openai,
  supabase,
  startRun,
  finishRun,
  recordFailedDocument
} from '../lib/helpers.js'
import { normalizeDrugName } from '../../../lib/rag/safety-alerts.js'

const FEEDS = [
  {
    source: 'FDA' as const,
    url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/rss.xml',
    type: 'recall' as const
  },
  {
    source: 'FDA' as const,
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drugs/rss.xml',
    type: 'safety_communication' as const
  }
]

interface ExtractedDrugInfo {
  drug_name: string | null
  drug_name_aliases: string[]
  alert_type: 'recall' | 'black_box' | 'contraindication' | 'shortage' | 'safety_communication' | 'dose_adjustment' | 'interaction_warning'
  severity: 'class_I' | 'class_II' | 'class_III' | 'critical' | 'moderate' | 'low' | null
  summary: string
  affected_lots: string[]
  affected_countries: string[]
  recommended_action: string | null
  extraction_confidence: number
}

async function extractDrugInfoFromAlert(
  title: string,
  content: string
): Promise<ExtractedDrugInfo> {
  const prompt = `You are a regulatory expert. Extract structured drug safety information.

Title: ${title}
Content: ${content.slice(0, 2000)}

Return ONLY valid JSON:
{
  "drug_name": "Main drug name (DCI), or null if no specific drug",
  "drug_name_aliases": ["Brand names"],
  "alert_type": "recall|black_box|contraindication|shortage|safety_communication|dose_adjustment|interaction_warning",
  "severity": "class_I|class_II|class_III|critical|moderate|low|null",
  "summary": "1-2 sentence summary",
  "affected_lots": ["lot1", "lot2"],
  "affected_countries": ["US"],
  "recommended_action": "What physicians should do, 1 sentence",
  "extraction_confidence": 0.95
}

Rules:
- drug_name = null if title doesn't mention a specific drug (e.g. "Quarterly Recall Summary")
- extraction_confidence: 0.9+ if drug name explicit, 0.7+ if inferred, 0.5- if uncertain`

  try {
    const res = await openai().chat.completions.create({
      model: 'gpt-5.4',
      messages: [
        { role: 'system', content: 'You extract drug safety data. Return JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: 'json_object' }
    } as any)

    const json = JSON.parse(res.choices[0]?.message?.content || '{}')
    return json as ExtractedDrugInfo
  } catch (e) {
    return {
      drug_name: null,
      drug_name_aliases: [],
      alert_type: 'safety_communication',
      severity: null,
      summary: title.slice(0, 200),
      affected_lots: [],
      affected_countries: [],
      recommended_action: null,
      extraction_confidence: 0
    }
  }
}

export async function seedFDA(opts: { maxItemsPerFeed?: number } = {}): Promise<{
  totalProcessed: number
  totalNew: number
  totalSkipped: number
  totalFailed: number
}> {
  const maxItems = opts.maxItemsPerFeed ?? 50
  console.log('═'.repeat(70))
  console.log('🇺🇸 FDA Drug Safety Alerts — Bulk Seed')
  console.log('═'.repeat(70))

  const startedAt = Date.now()
  const runId = await startRun('FDA', 'bulk-seed:fda')

  const parser = new Parser({ timeout: 20000 })
  const sb = supabase()

  let totalProcessed = 0
  let totalNew = 0
  let totalSkipped = 0
  let totalFailed = 0
  const warnings: string[] = []

  for (const feed of FEEDS) {
    console.log(`\n📡 Fetching ${feed.url}`)
    let parsed
    try {
      parsed = await parser.parseURL(feed.url)
    } catch (e) {
      console.error(`   ❌ Feed unreachable: ${(e as Error).message}`)
      warnings.push(`Feed unreachable: ${feed.url}`)
      continue
    }

    const items = parsed.items.slice(0, maxItems)
    console.log(`   Found ${parsed.items.length} items, processing first ${items.length}`)

    for (const item of items) {
      totalProcessed++
      if (!item.link || !item.title) {
        totalFailed++
        continue
      }

      // Dedup
      const { data: existing } = await sb
        .from('drug_safety_alerts')
        .select('id')
        .eq('url', item.link)
        .maybeSingle()
      if (existing) {
        totalSkipped++
        continue
      }

      // AI extraction
      const info = await extractDrugInfoFromAlert(
        item.title,
        item.contentSnippet || item.content || ''
      )

      if (!info.drug_name) {
        // Skip non-drug-specific alerts (e.g. quarterly summaries)
        totalSkipped++
        continue
      }

      // Insert
      const { error } = await sb.from('drug_safety_alerts').insert({
        source: feed.source,
        alert_type: info.alert_type || feed.type,
        severity: info.severity,
        drug_name: info.drug_name,
        drug_name_normalized: normalizeDrugName(info.drug_name),
        drug_name_aliases: info.drug_name_aliases || [],
        summary: info.summary || item.title,
        full_text: item.content || item.contentSnippet,
        affected_lots: info.affected_lots || [],
        affected_countries: info.affected_countries || [],
        recommended_action: info.recommended_action,
        url: item.link,
        published_date: item.pubDate
          ? new Date(item.pubDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        extraction_confidence: info.extraction_confidence || 0.7,
        active: true,
        validated_by_human: false
      })

      if (error) {
        await recordFailedDocument(
          'FDA',
          item.link,
          item.title,
          'insert_failed',
          error.message
        )
        totalFailed++
      } else {
        totalNew++
        process.stdout.write('.')
      }
    }
    console.log('')
  }

  await finishRun(runId, startedAt, {
    status: totalFailed > totalNew ? 'partial_success' : 'success',
    items_fetched: totalProcessed,
    items_new: totalNew,
    items_unchanged: totalSkipped,
    items_failed: totalFailed,
    warnings
  })

  console.log('')
  console.log(`✅ FDA seed complete:`)
  console.log(`   Processed : ${totalProcessed}`)
  console.log(`   New       : ${totalNew}`)
  console.log(`   Skipped   : ${totalSkipped} (duplicates or non-drug-specific)`)
  console.log(`   Failed    : ${totalFailed}`)

  return { totalProcessed, totalNew, totalSkipped, totalFailed }
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFDA().catch((e) => {
    console.error('💥 FDA seed failed:', e)
    process.exit(1)
  })
}
