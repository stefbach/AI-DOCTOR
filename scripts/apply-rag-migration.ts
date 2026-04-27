/**
 * Apply the RAG system migration to Supabase.
 *
 * Reads the SQL file `supabase/migrations/20260427000000_create_rag_system.sql`
 * and executes it against the configured Supabase project.
 *
 * Usage:
 *   npx tsx scripts/apply-rag-migration.ts
 *
 * Required env:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Note: pgvector extension is enabled by the migration itself (CREATE EXTENSION IF NOT EXISTS).
 *       The Supabase Pro plan is required to create extensions and HNSW indexes.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

const MIGRATION_FILE = path.resolve(
  process.cwd(),
  'supabase/migrations/20260427000000_create_rag_system.sql'
)

async function main() {
  // ─── Validate env ────────────────────────────────────────────────────────
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // ─── Load SQL ─────────────────────────────────────────────────────────────
  console.log(`📂 Loading migration: ${MIGRATION_FILE}`)
  const sql = await fs.readFile(MIGRATION_FILE, 'utf-8')
  console.log(`   ${sql.split('\n').length} lines, ${sql.length} bytes`)

  // ─── Execute ──────────────────────────────────────────────────────────────
  // Supabase JS client cannot run arbitrary DDL directly.
  // We use the REST endpoint pgmeta-equivalent: pg_query through service role.
  //
  // Since the supabase-js client has no `query()` method by default, we rely on
  // a Postgres RPC function. If your project doesn't have `exec_sql` defined,
  // the recommended path is:
  //   - paste the migration into Supabase Dashboard → SQL Editor → Run
  //   - OR install supabase-cli and run:  supabase db push
  //
  // This script attempts the RPC path first, then falls back to instructions.

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  })

  // Try via REST POST to PostgREST query (requires `exec_sql` function defined)
  const directUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  const res = await fetch(directUrl, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ sql })
  })

  if (res.ok) {
    console.log('✅ Migration applied successfully via exec_sql RPC')
    await verify(supabase)
    return
  }

  // ─── Fallback: instructions for manual application ───────────────────────
  console.warn(`⚠️  exec_sql RPC not available (status ${res.status})`)
  console.warn('')
  console.warn('Two options to apply the migration:')
  console.warn('')
  console.warn('  Option 1 — Supabase Dashboard:')
  console.warn(`    1. Open https://app.supabase.com/project/<your-project>/sql/new`)
  console.warn(`    2. Paste the contents of ${MIGRATION_FILE}`)
  console.warn(`    3. Click "Run"`)
  console.warn('')
  console.warn('  Option 2 — Supabase CLI:')
  console.warn(`    1. Install: npm install -g supabase`)
  console.warn(`    2. Login: supabase login`)
  console.warn(`    3. Link: supabase link --project-ref <your-project-ref>`)
  console.warn(`    4. Push: supabase db push`)
  console.warn('')
  console.warn('After applying, re-run this script to verify the migration.')
  process.exit(2)
}

async function verify(supabase: ReturnType<typeof createClient>) {
  console.log('')
  console.log('🔍 Verifying migration...')

  // Check that the 7 RAG tables exist by querying their schema
  const tables = [
    'medical_guidelines',
    'drug_safety_alerts',
    'guideline_update_log',
    'consultation_rag_trace',
    'guideline_sources',
    'guideline_ingestion_runs',
    'guideline_failed_documents'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.error(`   ❌ ${table}: ${error.message}`)
    } else {
      console.log(`   ✅ ${table}`)
    }
  }

  // Check seeded sources
  const { count } = await supabase
    .from('guideline_sources')
    .select('*', { count: 'exact', head: true })
  console.log(`   📊 ${count ?? 0} sources seeded in guideline_sources`)
  if ((count ?? 0) >= 16) {
    console.log('   ✅ All 16 sources seeded (FDA + 15 guideline sources)')
  } else {
    console.warn(`   ⚠️  Expected 16 sources, found ${count}`)
  }

  console.log('')
  console.log('✅ Verification complete')
}

main().catch((e) => {
  console.error('💥 Fatal error:', e)
  process.exit(1)
})
