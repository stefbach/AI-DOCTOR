/**
 * Bulk-Seed Orchestrator — All 16 sources
 *
 * Phase 1 (RSS — 5 sources):
 *   1. FDA Drug Safety Alerts (table: drug_safety_alerts)
 *   2. WHO Guidelines        (table: medical_guidelines, lang=en)
 *   3. HAS Guidelines        (table: medical_guidelines, lang=fr)
 *   4. CDC MMWR              (table: medical_guidelines, lang=en)
 *   5. NICE Guidelines       (with fallback to manual PDF)
 *   6. ECDC                  (RSS, EU public health)
 *
 * Phase 2 (HTML scraping — 10 medical societies):
 *   7. ESC      8. AHA      9. ADA      10. IDSA      11. KDIGO
 *   12. GOLD    13. GINA    14. EASL    15. ERS       16. USPSTF
 *
 * Usage:
 *   npx tsx scripts/bulk-seed/index.ts                    # all 16 sources (Phase 1 + 2)
 *   npx tsx scripts/bulk-seed/index.ts --phase=1          # priority 5 sources only
 *   npx tsx scripts/bulk-seed/index.ts --phase=2          # societies only
 *   npx tsx scripts/bulk-seed/index.ts --only=ESC         # single source
 *   npx tsx scripts/bulk-seed/index.ts --max=10           # limit per source
 *   npx tsx scripts/bulk-seed/index.ts --dry-run          # connectivity only
 *
 * Required env:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - OPENAI_API_KEY
 */

import { SOURCES, PHASE_1_SOURCES, PHASE_2_SOURCES } from './lib/sources-config.js'
import { seedFDA } from './sources/fda-safety-alerts.js'
import { seedRSSSource } from './sources/rss-guidelines.js'
import { seedNICE } from './sources/nice-fallback.js'
import { scrapeHTMLSource } from './sources/html-scrape-guidelines.js'
import { HTML_CONFIGS } from './sources/html-source-configs.js'

interface CLIArgs {
  only?: string
  phase?: 1 | 2
  max: number
  dryRun: boolean
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    max: parseInt(process.env.SEED_MAX_ITEMS || '30'),
    dryRun: process.env.SEED_DRY_RUN === 'true'
  }
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length).toUpperCase()
    if (arg.startsWith('--max=')) args.max = parseInt(arg.slice('--max='.length))
    if (arg === '--dry-run') args.dryRun = true
    if (arg === '--phase=1') args.phase = 1
    if (arg === '--phase=2') args.phase = 2
  }
  return args
}

interface SummaryRow {
  source: string
  status: 'ok' | 'partial' | 'failed' | 'skipped' | 'dry_run' | 'manual_required'
  new: number
  failed: number
  duration_s?: number
}

async function runOne(
  code: string,
  args: CLIArgs,
  summary: SummaryRow[]
): Promise<void> {
  const started = Date.now()

  if (args.dryRun) {
    console.log(`⏭  ${code} — dry run, skipping`)
    summary.push({ source: code, status: 'dry_run', new: 0, failed: 0 })
    return
  }

  try {
    if (code === 'FDA') {
      const r = await seedFDA({ maxItemsPerFeed: args.max })
      summary.push({
        source: 'FDA',
        status: r.totalFailed > r.totalNew ? 'partial' : 'ok',
        new: r.totalNew,
        failed: r.totalFailed,
        duration_s: Math.round((Date.now() - started) / 1000)
      })
      return
    }

    if (code === 'NICE') {
      const r = await seedNICE()
      summary.push({
        source: 'NICE',
        status: r.strategy_used === 'rss' ? 'ok' : 'manual_required',
        new: r.items_ingested,
        failed: 0,
        duration_s: Math.round((Date.now() - started) / 1000)
      })
      return
    }

    // RSS sources (WHO, HAS, CDC, ECDC)
    if (['WHO', 'HAS', 'CDC', 'ECDC'].includes(code)) {
      const src = SOURCES[code]
      const r = await seedRSSSource(src, { maxItems: args.max })
      summary.push({
        source: code,
        status: r.totalFailed > r.totalNew ? 'partial' : 'ok',
        new: r.totalNew,
        failed: r.totalFailed,
        duration_s: Math.round((Date.now() - started) / 1000)
      })
      return
    }

    // HTML scraping (10 societies)
    if (HTML_CONFIGS[code]) {
      const config = HTML_CONFIGS[code]
      // override max_links from CLI if provided
      if (args.max) config.max_links = Math.min(config.max_links || 30, args.max)
      const r = await scrapeHTMLSource(config)
      summary.push({
        source: code,
        status: r.totalFailed > r.totalNew ? 'partial' : 'ok',
        new: r.totalNew,
        failed: r.totalFailed,
        duration_s: Math.round((Date.now() - started) / 1000)
      })
      return
    }

    summary.push({ source: code, status: 'skipped', new: 0, failed: 0 })
  } catch (e: any) {
    summary.push({
      source: code,
      status: 'failed',
      new: 0,
      failed: 1,
      duration_s: Math.round((Date.now() - started) / 1000)
    })
    console.error(`💥 ${code} crashed: ${e.message}`)
  }
}

async function main() {
  const args = parseArgs()

  // ─── Validate env ────────────────────────────────────────────────────────
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']
    .filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  // ─── Determine which sources to run ──────────────────────────────────────
  let sourcesToRun: string[]
  if (args.only) {
    sourcesToRun = [args.only]
  } else if (args.phase === 1) {
    sourcesToRun = PHASE_1_SOURCES.map((s) => s.code)
  } else if (args.phase === 2) {
    sourcesToRun = PHASE_2_SOURCES.map((s) => s.code)
  } else {
    // All 16 sources
    sourcesToRun = Object.keys(SOURCES)
  }

  console.log('')
  console.log('╔════════════════════════════════════════════════════════════════════╗')
  console.log('║                  AI-DOCTOR — Bulk Seed Orchestrator                ║')
  console.log('╚════════════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  Sources to run       : ${sourcesToRun.length}`)
  console.log(`  Codes                : ${sourcesToRun.join(', ')}`)
  console.log(`  Max items per source : ${args.max}`)
  console.log(`  Dry run              : ${args.dryRun}`)
  console.log('')
  console.log('  Estimated duration   : ~1-3 min per source')
  console.log('  Estimated cost       : ~$0.05-0.50 per source (embeddings + AI metadata)')
  console.log('')

  const summary: SummaryRow[] = []
  const totalStart = Date.now()

  for (const code of sourcesToRun) {
    await runOne(code, args, summary)
  }

  // ─── Final summary ───────────────────────────────────────────────────────
  const totalDuration = Math.round((Date.now() - totalStart) / 1000)
  console.log('')
  console.log('╔════════════════════════════════════════════════════════════════════╗')
  console.log('║                            FINAL SUMMARY                           ║')
  console.log('╚════════════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  ${'Source'.padEnd(10)} ${'Status'.padEnd(20)} ${'New'.padStart(6)} ${'Failed'.padStart(8)} ${'Duration'.padStart(10)}`)
  console.log(`  ${'─'.repeat(10)} ${'─'.repeat(20)} ${'─'.repeat(6)} ${'─'.repeat(8)} ${'─'.repeat(10)}`)
  for (const row of summary) {
    const icon =
      row.status === 'ok' ? '✅' :
      row.status === 'failed' ? '❌' :
      row.status === 'partial' ? '⚠️' :
      row.status === 'manual_required' ? '📋' :
      '⏭'
    const statusLabel = `${icon} ${row.status}`
    const dur = row.duration_s !== undefined ? `${row.duration_s}s` : '-'
    console.log(
      `  ${row.source.padEnd(10)} ${statusLabel.padEnd(20)} ${String(row.new).padStart(6)} ${String(row.failed).padStart(8)} ${dur.padStart(10)}`
    )
  }

  const totalNew = summary.reduce((s, r) => s + r.new, 0)
  const totalFailed = summary.reduce((s, r) => s + r.failed, 0)
  const okCount = summary.filter((r) => r.status === 'ok').length
  const failedCount = summary.filter((r) => r.status === 'failed').length
  const manualCount = summary.filter((r) => r.status === 'manual_required').length

  console.log('')
  console.log(`  Total duration       : ${totalDuration}s (${(totalDuration / 60).toFixed(1)} min)`)
  console.log(`  Total new items      : ${totalNew}`)
  console.log(`  Total failed items   : ${totalFailed}`)
  console.log(`  Sources OK           : ${okCount}/${summary.length}`)
  console.log(`  Sources failed       : ${failedCount}/${summary.length}`)
  console.log(`  Manual required      : ${manualCount}/${summary.length}`)
  console.log('')

  if (manualCount > 0) {
    console.log('  📋 Manual ingestion needed for:')
    for (const r of summary.filter((s) => s.status === 'manual_required')) {
      console.log(`     - ${r.source}: see scripts/bulk-seed/sources/${r.source.toLowerCase()}-manual.ts (if available)`)
    }
    console.log('')
  }

  if (failedCount > 0) {
    console.log('  ❌ Failed sources — check logs above for details, then:')
    console.log('     - Verify access from your network (curl <source URL>)')
    console.log('     - Update CSS selector in html-source-configs.ts if site has changed')
    console.log('     - Use manual PDF ingestion as fallback (scripts/bulk-seed/sources/nice-manual.ts)')
    console.log('')
  }

  console.log('  Next steps:')
  console.log('    1. Review pending guidelines: /admin/guidelines')
  console.log('    2. Validate them (status pending_review → active)')
  console.log('    3. Set up n8n workflows for continuous updates')
  console.log('       (see n8n-workflows/SETUP.md)')
  console.log('')

  // Exit code based on result
  if (failedCount === summary.length) process.exit(1)  // all failed
  if (totalFailed > totalNew) process.exit(2)  // more failures than successes
  process.exit(0)
}

main().catch((e) => {
  console.error('💥 Orchestrator fatal error:', e)
  process.exit(1)
})
