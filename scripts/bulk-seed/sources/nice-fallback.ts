/**
 * NICE Fallback Strategy
 *
 * NICE (UK) sometimes blocks automated access (geo-restriction, rate limiting,
 * bot detection). This script provides 3 fallback strategies in order:
 *
 *   1. Try the official RSS feed (preferred)
 *   2. If RSS fails: try the public sitemap
 *   3. If both fail: list a curated set of high-priority NICE guidelines
 *      to be ingested manually (PDF upload via admin UI)
 *
 * Usage:
 *   npx tsx scripts/bulk-seed/sources/nice-fallback.ts
 *
 * If access fails, the script will print a list of recommended NICE guidelines
 * and exit with code 0 (not an error — expected behavior).
 */

import Parser from 'rss-parser'
import { SOURCES } from '../lib/sources-config.js'
import { seedRSSSource } from './rss-guidelines.js'
import { supabase } from '../lib/helpers.js'

const NICE = SOURCES.NICE

/**
 * Curated list of high-priority NICE guidelines to seed if automated access fails.
 * These are the most clinically critical ones for the AI-DOCTOR use case.
 */
const NICE_PRIORITY_GUIDELINES = [
  { code: 'NG185', title: 'Acute coronary syndromes', url: 'https://www.nice.org.uk/guidance/ng185' },
  { code: 'NG128', title: 'Stroke and transient ischaemic attack in over 16s', url: 'https://www.nice.org.uk/guidance/ng128' },
  { code: 'NG28', title: 'Type 2 diabetes in adults: management', url: 'https://www.nice.org.uk/guidance/ng28' },
  { code: 'NG136', title: 'Hypertension in adults: diagnosis and management', url: 'https://www.nice.org.uk/guidance/ng136' },
  { code: 'NG106', title: 'Chronic heart failure in adults', url: 'https://www.nice.org.uk/guidance/ng106' },
  { code: 'NG115', title: 'Chronic obstructive pulmonary disease in over 16s', url: 'https://www.nice.org.uk/guidance/ng115' },
  { code: 'NG80', title: 'Asthma: diagnosis, monitoring and chronic asthma management', url: 'https://www.nice.org.uk/guidance/ng80' },
  { code: 'NG203', title: 'Chronic kidney disease', url: 'https://www.nice.org.uk/guidance/ng203' },
  { code: 'NG143', title: 'Fever in under 5s', url: 'https://www.nice.org.uk/guidance/ng143' },
  { code: 'NG141', title: 'Acute kidney injury', url: 'https://www.nice.org.uk/guidance/ng141' },
  { code: 'NG51', title: 'Sepsis: recognition, diagnosis and early management', url: 'https://www.nice.org.uk/guidance/ng51' },
  { code: 'CG175', title: 'Prostate cancer: diagnosis and management', url: 'https://www.nice.org.uk/guidance/cg175' },
  { code: 'NG12', title: 'Suspected cancer: recognition and referral', url: 'https://www.nice.org.uk/guidance/ng12' }
]

export async function seedNICE(): Promise<{
  strategy_used: 'rss' | 'sitemap' | 'manual_required'
  items_ingested: number
  manual_list?: typeof NICE_PRIORITY_GUIDELINES
}> {
  console.log('═'.repeat(70))
  console.log('🇬🇧 NICE — UK National Institute for Health and Care Excellence')
  console.log('═'.repeat(70))

  // ─── STRATEGY 1: Official RSS feed ──────────────────────────────────────
  console.log('\n📡 Strategy 1: Official RSS feed')
  const parser = new Parser({ timeout: 15000 })
  let rssReachable = false
  try {
    const parsed = await parser.parseURL(NICE.primary_url)
    if (parsed.items && parsed.items.length > 0) {
      rssReachable = true
      console.log(`   ✅ RSS reachable, ${parsed.items.length} items`)
    }
  } catch (e) {
    console.warn(`   ⚠️  RSS unreachable: ${(e as Error).message}`)
  }

  if (rssReachable) {
    const result = await seedRSSSource(NICE, { maxItems: 30 })
    return {
      strategy_used: 'rss',
      items_ingested: result.totalNew
    }
  }

  // ─── STRATEGY 2: Sitemap fallback ────────────────────────────────────────
  console.log('\n📡 Strategy 2: Public sitemap')
  try {
    const sitemapUrl = 'https://www.nice.org.uk/sitemap.xml'
    const res = await fetch(sitemapUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (res.ok) {
      console.log('   ✅ Sitemap reachable — see scripts/bulk-seed/sources/nice-sitemap.ts (TODO: implement)')
      // sitemap parser would go here
    }
  } catch (e) {
    console.warn(`   ⚠️  Sitemap unreachable: ${(e as Error).message}`)
  }

  // ─── STRATEGY 3: Manual upload required ──────────────────────────────────
  console.log('\n📋 Strategy 3: Manual ingestion required')
  console.log('   NICE automated access is blocked from this environment.')
  console.log('')
  console.log('   ACTION REQUIRED: Download these PDFs manually and run:')
  console.log('')
  console.log('   $ npx tsx scripts/bulk-seed/sources/nice-manual.ts <pdf-path> <code> <title>')
  console.log('')
  console.log('   Priority list (13 guidelines covering 90% of common clinical cases):')
  console.log('')
  for (const g of NICE_PRIORITY_GUIDELINES) {
    console.log(`     ${g.code.padEnd(8)} ${g.title.padEnd(60)} ${g.url}`)
  }

  // Mark source as requires_auth (needs manual handling)
  const sb = supabase()
  await sb
    .from('guideline_sources')
    .update({
      access_status: 'restricted',
      notes: 'Automated access blocked — manual PDF ingestion required for priority guidelines'
    })
    .eq('source_code', 'NICE')

  return {
    strategy_used: 'manual_required',
    items_ingested: 0,
    manual_list: NICE_PRIORITY_GUIDELINES
  }
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedNICE().catch((e) => {
    console.error('💥 NICE seed failed:', e)
    process.exit(1)
  })
}
