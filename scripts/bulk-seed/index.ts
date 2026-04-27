/**
 * Bulk-Seed Orchestrator — Phase 1 (5 priority sources)
 *
 * Runs the initial ingestion across the 5 highest-priority sources:
 *   1. FDA Drug Safety Alerts (table: drug_safety_alerts)
 *   2. WHO Guidelines        (table: medical_guidelines, lang=en)
 *   3. HAS Guidelines        (table: medical_guidelines, lang=fr)
 *   4. CDC MMWR              (table: medical_guidelines, lang=en)
 *   5. NICE Guidelines       (with fallback to manual PDF)
 *
 * Usage:
 *   npx tsx scripts/bulk-seed/index.ts                # all phase-1 sources
 *   npx tsx scripts/bulk-seed/index.ts --only=FDA     # single source
 *   npx tsx scripts/bulk-seed/index.ts --max=10       # limit items per source
 *   npx tsx scripts/bulk-seed/index.ts --dry-run      # check feeds only, no ingest
 *
 * Required env:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - OPENAI_API_KEY
 *
 * Optional env:
 *   - SEED_MAX_ITEMS         (default: 30)
 *   - SEED_DRY_RUN           (default: false)
 */

import { SOURCES } from './lib/sources-config.js'
import { seedFDA } from './sources/fda-safety-alerts.js'
import { seedRSSSource } from './sources/rss-guidelines.js'
import { seedNICE } from './sources/nice-fallback.js'

interface CLIArgs {
  only?: string
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
  }
  return args
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

  console.log('')
  console.log('╔════════════════════════════════════════════════════════════════════╗')
  console.log('║         AI-DOCTOR — Bulk Seed (Phase 1: 5 priority sources)       ║')
  console.log('╚════════════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  Max items per source : ${args.max}`)
  console.log(`  Dry run              : ${args.dryRun}`)
  console.log(`  Filter (--only)      : ${args.only || '(all phase-1 sources)'}`)
  console.log('')

  const summary: Array<{ source: string; status: string; new: number; failed: number }> = []
  const totalStart = Date.now()

  // ─── 1. FDA Safety Alerts ────────────────────────────────────────────────
  if (!args.only || args.only === 'FDA') {
    if (args.dryRun) {
      console.log('🇺🇸 FDA — dry run, skipping')
      summary.push({ source: 'FDA', status: 'dry_run', new: 0, failed: 0 })
    } else {
      try {
        const r = await seedFDA({ maxItemsPerFeed: args.max })
        summary.push({
          source: 'FDA',
          status: r.totalFailed > r.totalNew ? 'partial' : 'ok',
          new: r.totalNew,
          failed: r.totalFailed
        })
      } catch (e: any) {
        summary.push({ source: 'FDA', status: 'failed', new: 0, failed: 1 })
        console.error(`💥 FDA failed: ${e.message}`)
      }
    }
  }

  // ─── 2. WHO ──────────────────────────────────────────────────────────────
  if (!args.only || args.only === 'WHO') {
    try {
      const r = await seedRSSSource(SOURCES.WHO, { maxItems: args.max, dryRun: args.dryRun })
      summary.push({
        source: 'WHO',
        status: r.totalFailed > r.totalNew ? 'partial' : 'ok',
        new: r.totalNew,
        failed: r.totalFailed
      })
    } catch (e: any) {
      summary.push({ source: 'WHO', status: 'failed', new: 0, failed: 1 })
      console.error(`💥 WHO failed: ${e.message}`)
    }
  }

  // ─── 3. HAS ──────────────────────────────────────────────────────────────
  if (!args.only || args.only === 'HAS') {
    try {
      const r = await seedRSSSource(SOURCES.HAS, { maxItems: args.max, dryRun: args.dryRun })
      summary.push({
        source: 'HAS',
        status: r.totalFailed > r.totalNew ? 'partial' : 'ok',
        new: r.totalNew,
        failed: r.totalFailed
      })
    } catch (e: any) {
      summary.push({ source: 'HAS', status: 'failed', new: 0, failed: 1 })
      console.error(`💥 HAS failed: ${e.message}`)
    }
  }

  // ─── 4. CDC ──────────────────────────────────────────────────────────────
  if (!args.only || args.only === 'CDC') {
    try {
      const r = await seedRSSSource(SOURCES.CDC, { maxItems: args.max, dryRun: args.dryRun })
      summary.push({
        source: 'CDC',
        status: r.totalFailed > r.totalNew ? 'partial' : 'ok',
        new: r.totalNew,
        failed: r.totalFailed
      })
    } catch (e: any) {
      summary.push({ source: 'CDC', status: 'failed', new: 0, failed: 1 })
      console.error(`💥 CDC failed: ${e.message}`)
    }
  }

  // ─── 5. NICE (with fallback) ─────────────────────────────────────────────
  if (!args.only || args.only === 'NICE') {
    if (args.dryRun) {
      console.log('🇬🇧 NICE — dry run, skipping')
      summary.push({ source: 'NICE', status: 'dry_run', new: 0, failed: 0 })
    } else {
      try {
        const r = await seedNICE()
        summary.push({
          source: 'NICE',
          status: r.strategy_used === 'rss' ? 'ok' : 'manual_required',
          new: r.items_ingested,
          failed: 0
        })
      } catch (e: any) {
        summary.push({ source: 'NICE', status: 'failed', new: 0, failed: 1 })
        console.error(`💥 NICE failed: ${e.message}`)
      }
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  const totalDuration = Math.round((Date.now() - totalStart) / 1000)
  console.log('')
  console.log('╔════════════════════════════════════════════════════════════════════╗')
  console.log('║                            SUMMARY                                 ║')
  console.log('╚════════════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  ${'Source'.padEnd(10)} ${'Status'.padEnd(20)} ${'New'.padStart(6)} ${'Failed'.padStart(8)}`)
  console.log(`  ${'─'.repeat(10)} ${'─'.repeat(20)} ${'─'.repeat(6)} ${'─'.repeat(8)}`)
  for (const row of summary) {
    const statusIcon = row.status === 'ok' ? '✅' : row.status === 'failed' ? '❌' : '⚠️'
    console.log(
      `  ${row.source.padEnd(10)} ${(statusIcon + ' ' + row.status).padEnd(20)} ${String(row.new).padStart(6)} ${String(row.failed).padStart(8)}`
    )
  }
  console.log('')
  console.log(`  Duration : ${totalDuration}s`)
  console.log(`  New total: ${summary.reduce((s, r) => s + r.new, 0)} guidelines/alerts ingested`)
  console.log('')
  console.log('  Next steps:')
  console.log('    1. Review pending guidelines: /admin/guidelines')
  console.log('    2. Validate them (status pending_review → active)')
  console.log('    3. Set up n8n workflows for continuous updates')
  console.log('')
}

main().catch((e) => {
  console.error('💥 Orchestrator fatal error:', e)
  process.exit(1)
})
