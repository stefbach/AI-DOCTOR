#!/usr/bin/env node
//
// scripts/rag-ingest/generate-embeddings.mjs
//
// One-shot script to populate the `embedding` column on every
// guidelines_chunks row where it is currently NULL.
//
// Background: the Python ingestion pipeline (ingest.py) inserts chunks
// with embedding=NULL on purpose, leaving embedding generation to a
// "secondary batch script" (cf scripts/rag-ingest/README.md line 61).
// That secondary script was never written or never run at scale.
// Audit (2026-05-12) showed 56 058 of 56 115 chunks (99.9%) had no
// embedding and were therefore invisible to the RAG match_guidelines
// RPC. This script fills that gap.
//
// Resumable: re-running picks up only chunks where embedding IS NULL.
// Stops cleanly when zero such rows remain.
//
// Usage:
//   OPENAI_API_KEY=sk-... \
//   SUPABASE_URL=https://<proj>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/rag-ingest/generate-embeddings.mjs
//
// Cost reference (May 2026): text-embedding-3-small at $0.02 / 1M tokens.
// For ~56k chunks × ~300 tokens each → ~$0.34 total.

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// ---------- Configuration ----------
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error(
    'ERROR: missing required env vars. Need: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY',
  )
  process.exit(1)
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
// Chunks per OpenAI embeddings call. OpenAI accepts up to ~2048 inputs
// per call but smaller batches make per-batch failures less costly and
// give cleaner progress logs.
const BATCH_SIZE = 100
// Parallel UPDATE writes back to Supabase per batch.
const MAX_CONCURRENT_UPDATES = 10
// Safety truncation. text-embedding-3-small has an 8 191 token input
// limit. ~30 000 chars = ~7 500 tokens, well under cap.
const MAX_CONTENT_CHARS = 30_000
// OpenAI cost (May 2026 pricing)
const COST_PER_1M_TOKENS_USD = 0.02

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ---------- Stats ----------
let totalProcessed = 0
let totalSuccess = 0
let totalFailed = 0
let totalSkippedEmpty = 0
let totalTokensUsed = 0
const startTime = Date.now()

// ---------- Helpers ----------
async function countMissingEmbeddings() {
  const { count, error } = await supabase
    .from('guidelines_chunks')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null)
  if (error) throw new Error(`count failed: ${error.message}`)
  return count || 0
}

async function fetchNextBatch() {
  const { data, error } = await supabase
    .from('guidelines_chunks')
    .select('id, chunk_content')
    .is('embedding', null)
    .limit(BATCH_SIZE)
  if (error) throw new Error(`fetch batch failed: ${error.message}`)
  return data || []
}

async function callOpenAIEmbeddings(inputs) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: inputs,
      })
    } catch (err) {
      const msg = err?.message || String(err)
      if (attempt === 4) {
        throw new Error(`OpenAI failed after 4 attempts: ${msg}`)
      }
      const waitMs = 1000 * Math.pow(2, attempt)
      console.warn(
        `  ⚠️  OpenAI error (attempt ${attempt}/4): ${msg} — retrying in ${waitMs}ms`,
      )
      await new Promise(r => setTimeout(r, waitMs))
    }
  }
}

async function processBatch() {
  const chunks = await fetchNextBatch()
  if (chunks.length === 0) return 0

  // Truncate and filter empty chunks.
  const validChunks = []
  const validInputs = []
  for (const c of chunks) {
    const text = (c.chunk_content || '').slice(0, MAX_CONTENT_CHARS).trim()
    if (text) {
      validChunks.push(c)
      validInputs.push(text)
    } else {
      totalSkippedEmpty++
    }
  }

  if (validInputs.length === 0) {
    // Whole batch was empty. Without an embedding the row stays NULL
    // and we'd loop forever on the same batch. Mark them with a marker
    // so they don't keep getting re-selected.
    // Strategy: set embedding to a zero-vector wouldn't make sense.
    // Instead UPDATE chunk_metadata to flag them; the WHERE clause on
    // the next iteration still hits embedding IS NULL though, so they
    // would re-appear. The cleanest fix is to insert a sentinel
    // single-element vector that match_guidelines will never match in
    // practice. For now we just abort to avoid infinite loop.
    console.warn(
      `  ⚠️  Batch of ${chunks.length} chunks has only empty content — aborting to avoid loop. Inspect manually.`,
    )
    return -1
  }

  // Call OpenAI.
  const response = await callOpenAIEmbeddings(validInputs)
  totalTokensUsed += response.usage?.total_tokens || 0

  // UPDATE each chunk in parallel with bounded concurrency.
  const updates = validChunks.map((c, i) => ({
    id: c.id,
    embedding: response.data[i].embedding,
  }))

  const pending = []
  for (const upd of updates) {
    const p = supabase
      .from('guidelines_chunks')
      .update({ embedding: upd.embedding })
      .eq('id', upd.id)
      .then(({ error }) => {
        if (error) {
          totalFailed++
          console.error(`  ❌ UPDATE failed for chunk ${upd.id}: ${error.message}`)
        } else {
          totalSuccess++
        }
      })
    pending.push(p)
    if (pending.length >= MAX_CONCURRENT_UPDATES) {
      await Promise.all(pending.splice(0))
    }
  }
  await Promise.all(pending)

  return chunks.length
}

// ---------- Main loop ----------
console.log('===========================================')
console.log('  RAG Embeddings Generation Script')
console.log('===========================================')
console.log(`Model:      ${EMBEDDING_MODEL}`)
console.log(`Batch size: ${BATCH_SIZE} chunks per OpenAI call`)
console.log(`Concurrent UPDATEs: ${MAX_CONCURRENT_UPDATES}`)
console.log('---')

console.log('Counting chunks needing embeddings...')
const initialMissing = await countMissingEmbeddings()
console.log(`Found ${initialMissing.toLocaleString()} chunk(s) with NULL embedding.`)

if (initialMissing === 0) {
  console.log('Nothing to do. Exiting.')
  process.exit(0)
}

const estTokens = initialMissing * 300
const estCost = (estTokens / 1_000_000) * COST_PER_1M_TOKENS_USD
console.log(
  `Estimated cost: ~$${estCost.toFixed(2)} (assuming ~300 tokens/chunk).`,
)
console.log('Starting...\n')

while (true) {
  const processed = await processBatch()
  if (processed === 0) {
    console.log('\n✅ No more chunks with NULL embedding. Done.')
    break
  }
  if (processed === -1) {
    console.log('\n⛔ Aborted on empty batch. Resolve manually then re-run.')
    process.exit(2)
  }
  totalProcessed += processed

  const elapsedMin = (Date.now() - startTime) / 60_000
  const rate = totalProcessed / Math.max(elapsedMin, 0.01)
  const remaining = Math.max(0, initialMissing - totalProcessed)
  const etaMin = remaining / Math.max(rate, 1)
  const currentCost =
    (totalTokensUsed / 1_000_000) * COST_PER_1M_TOKENS_USD

  console.log(
    `[${totalProcessed.toLocaleString()}/${initialMissing.toLocaleString()}] ` +
      `✅ ${totalSuccess} ❌ ${totalFailed} ⏭️ ${totalSkippedEmpty} | ` +
      `${rate.toFixed(0)} chunks/min | ETA ${etaMin.toFixed(1)} min | ` +
      `tokens ${(totalTokensUsed / 1000).toFixed(1)}k | cost $${currentCost.toFixed(4)}`,
  )
}

const totalElapsedMin = (Date.now() - startTime) / 60_000
const finalCost = (totalTokensUsed / 1_000_000) * COST_PER_1M_TOKENS_USD

console.log('\n===========================================')
console.log('  Summary')
console.log('===========================================')
console.log(`Total processed:  ${totalProcessed.toLocaleString()}`)
console.log(`Success:          ${totalSuccess.toLocaleString()}`)
console.log(`Failed:           ${totalFailed.toLocaleString()}`)
console.log(`Skipped (empty):  ${totalSkippedEmpty.toLocaleString()}`)
console.log(`Tokens used:      ${totalTokensUsed.toLocaleString()}`)
console.log(`Estimated cost:   $${finalCost.toFixed(4)}`)
console.log(`Duration:         ${totalElapsedMin.toFixed(1)} min`)
console.log('===========================================')

// Final sanity check.
const remainingNull = await countMissingEmbeddings()
if (remainingNull > 0) {
  console.log(
    `\n⚠️  ${remainingNull.toLocaleString()} chunk(s) still have NULL embedding (likely the skipped-empty batches). Re-run if needed.`,
  )
}
