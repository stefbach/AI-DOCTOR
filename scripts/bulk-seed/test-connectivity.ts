/**
 * Connectivity Test — verifies which guideline sources are reachable.
 *
 * Run BEFORE the bulk-seed to know which sources will succeed and which will
 * need fallback (e.g. NICE manual ingestion).
 *
 * Usage:
 *   npx tsx scripts/bulk-seed/test-connectivity.ts
 *
 * Exit codes:
 *   0 = all sources reachable
 *   1 = some sources unreachable (script prints which)
 *   2 = network completely down
 *
 * No OpenAI calls, no Supabase writes — pure HTTP HEAD/GET checks.
 * Cost: $0. Duration: ~30 seconds.
 */

import Parser from 'rss-parser'
import { SOURCES } from './lib/sources-config.js'

interface TestResult {
  source: string
  url: string
  status: 'ok' | 'http_error' | 'timeout' | 'parse_error' | 'empty'
  http_code?: number
  items_found?: number
  first_item_title?: string
  duration_ms: number
  error?: string
}

async function testSource(code: string, url: string): Promise<TestResult> {
  const started = Date.now()
  const parser = new Parser({
    timeout: 20000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; AI-DOCTOR-RAG/1.0; +https://ai-doctor.example.com)'
    }
  })

  try {
    const feed = await parser.parseURL(url)
    const duration = Date.now() - started

    if (!feed.items || feed.items.length === 0) {
      return {
        source: code,
        url,
        status: 'empty',
        items_found: 0,
        duration_ms: duration
      }
    }

    return {
      source: code,
      url,
      status: 'ok',
      http_code: 200,
      items_found: feed.items.length,
      first_item_title: feed.items[0].title?.slice(0, 80) || '(no title)',
      duration_ms: duration
    }
  } catch (e: any) {
    const duration = Date.now() - started
    const message = e.message || String(e)

    let status: TestResult['status'] = 'http_error'
    let httpCode: number | undefined

    if (message.includes('timeout') || message.includes('ECONNABORTED')) {
      status = 'timeout'
    } else if (message.includes('Status code')) {
      status = 'http_error'
      const m = message.match(/Status code (\d+)/)
      if (m) httpCode = parseInt(m[1])
    } else if (message.includes('parse') || message.includes('XML')) {
      status = 'parse_error'
    }

    return {
      source: code,
      url,
      status,
      http_code: httpCode,
      duration_ms: duration,
      error: message.slice(0, 200)
    }
  }
}

async function main() {
  console.log('═'.repeat(78))
  console.log('🔌 AI-DOCTOR — Test de connectivité des sources de guidelines')
  console.log('═'.repeat(78))
  console.log('')
  console.log('Cible: 16 sources (5 prioritaires + 11 secondaires)')
  console.log('Pas d’appel OpenAI, pas d’écriture Supabase. Coût: 0$')
  console.log('')

  const sourcesToTest = Object.values(SOURCES)
  const results: TestResult[] = []

  // Phase 1 (priorité 1-5)
  console.log('─── Phase 1 (priorité 1-5) ───')
  for (const s of sourcesToTest.filter((x) => x.priority <= 5)) {
    process.stdout.write(`  ${s.code.padEnd(8)} `)
    const r = await testSource(s.code, s.primary_url)
    results.push(r)
    printResult(r)
  }

  console.log('')
  console.log('─── Phase 2 (priorité 6-16) ───')
  for (const s of sourcesToTest.filter((x) => x.priority > 5)) {
    process.stdout.write(`  ${s.code.padEnd(8)} `)
    const r = await testSource(s.code, s.primary_url)
    results.push(r)
    printResult(r)
  }

  // Summary
  console.log('')
  console.log('═'.repeat(78))
  console.log('📊 RÉSUMÉ')
  console.log('═'.repeat(78))
  const ok = results.filter((r) => r.status === 'ok')
  const empty = results.filter((r) => r.status === 'empty')
  const failed = results.filter((r) => r.status !== 'ok' && r.status !== 'empty')

  console.log(`  ✅ Accessibles + flux non vide : ${ok.length}/${results.length}`)
  console.log(`  ⚠️  Accessibles mais flux vide  : ${empty.length}/${results.length}`)
  console.log(`  ❌ Inaccessibles               : ${failed.length}/${results.length}`)
  console.log('')

  if (failed.length > 0) {
    console.log('Sources inaccessibles (à investiguer ou fallback manuel) :')
    for (const f of failed) {
      console.log(`  ${f.source.padEnd(8)} ${f.status.padEnd(15)} ${f.error?.slice(0, 80) || ''}`)
    }
    console.log('')
    console.log('💡 Pistes :')
    console.log('  - 403/401     : géo-restriction ou auth requise → fallback manuel PDF')
    console.log('  - 404         : URL changée → mettre à jour sources-config.ts')
    console.log('  - timeout     : feed lent ou non disponible → re-essayer plus tard')
    console.log('  - parse_error : format XML invalide → vérifier dans navigateur')
    console.log('')
    process.exit(1)
  }

  if (ok.length === results.length) {
    console.log('🎉 Toutes les sources sont accessibles. Vous pouvez lancer :')
    console.log('   npm run rag:seed')
    console.log('')
    process.exit(0)
  }

  process.exit(0)
}

function printResult(r: TestResult): void {
  if (r.status === 'ok') {
    console.log(
      `✅ ${r.items_found} items   (${r.duration_ms}ms)   "${r.first_item_title}"`
    )
  } else if (r.status === 'empty') {
    console.log(`⚠️  Empty feed   (${r.duration_ms}ms)`)
  } else {
    const code = r.http_code ? ` [HTTP ${r.http_code}]` : ''
    console.log(`❌ ${r.status}${code}   (${r.duration_ms}ms)`)
    if (r.error) console.log(`     ${r.error.slice(0, 120)}`)
  }
}

main().catch((e) => {
  console.error('💥 Test failed:', e)
  process.exit(2)
})
