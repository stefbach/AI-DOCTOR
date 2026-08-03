// lib/llm-pricing.ts
// Centralised LLM pricing table + per-call cost estimator.
//
// Goal: turn the token usage already returned by every callLLM() into a USD
// cost, so each consultation step (diagnosis, report, prescription, …) reports
// what it actually costs and we can see which module is the most expensive.
//
// Prices are expressed in USD per 1,000,000 tokens, split between input
// (prompt) and output (completion). DeepSeek and OpenAI both bill cached input
// tokens at a reduced rate, so we model that separately (`cachedInputPerMTok`).
//
// IMPORTANT — keep this table up to date:
//  - `confirmed: true`  => value taken from the provider's public pricing page.
//  - `confirmed: false` => placeholder for a model with no public price yet
//    (e.g. the future default ids configured in llm-client.ts). The cost is
//    still computed, but flagged so it is clearly an estimate to verify.
// Any entry can be overridden at runtime without a redeploy via the
// `LLM_PRICING_OVERRIDES` env var (a JSON map of model -> ModelPrice).

export interface ModelPrice {
  /** USD per 1M input/prompt tokens (standard / cache-miss rate). */
  inputPerMTok: number
  /** USD per 1M cached input tokens (cache-hit rate). Falls back to inputPerMTok. */
  cachedInputPerMTok?: number
  /** USD per 1M output/completion tokens. */
  outputPerMTok: number
  /** Where the figure comes from (provider page + tier/date). */
  source?: string
  /** false => placeholder for a not-yet-publicly-priced model; verify before billing. */
  confirmed: boolean
}

// Keyed by the canonical (base) model id. Variant suffixes used in the codebase
// (e.g. "gpt-5.5-fallback", "gpt-5.5-pharmacology-expert") resolve to their base
// via prefix matching in `getModelPrice()`.
const PRICING_TABLE: Record<string, ModelPrice> = {
  // ── DeepSeek ────────────────────────────────────────────────────────────
  // Source: official DeepSeek API pricing page (api-docs.deepseek.com/quick_start/pricing).
  // All values USD per 1M tokens.
  //
  // deepseek-v4-pro — the model actually used in production for this app
  // (DEEPSEEK_DEFAULT_MODEL). Carries the two heaviest calls (DIAGNOSIS, REPORT).
  'deepseek-v4-pro': {
    inputPerMTok: 0.435,
    cachedInputPerMTok: 0.003625,
    outputPerMTok: 0.87,
    source: 'DeepSeek API pricing — deepseek-v4-pro',
    confirmed: true,
  },
  // deepseek-v4-flash — cheaper non-pro tier.
  'deepseek-v4-flash': {
    inputPerMTok: 0.14,
    cachedInputPerMTok: 0.0028,
    outputPerMTok: 0.28,
    source: 'DeepSeek API pricing — deepseek-v4-flash',
    confirmed: true,
  },
  // deepseek-chat / deepseek-reasoner — LEGACY aliases (non-thinking / thinking
  // modes of v4-flash), billed at v4-flash rates. Deprecated 2026-07-24.
  // NOTE: several routes still hard-code model: 'deepseek-chat' (e.g.
  // openai-diagnosis, generate-consultation-report). After deprecation, or to
  // use V4-Pro there, switch those overrides to 'deepseek-v4-pro'/'deepseek-v4-flash'.
  'deepseek-chat': {
    inputPerMTok: 0.14,
    cachedInputPerMTok: 0.0028,
    outputPerMTok: 0.28,
    source: 'DeepSeek API pricing — deepseek-chat (legacy alias of v4-flash, deprecated 2026-07-24)',
    confirmed: true,
  },
  'deepseek-reasoner': {
    inputPerMTok: 0.14,
    cachedInputPerMTok: 0.0028,
    outputPerMTok: 0.28,
    source: 'DeepSeek API pricing — deepseek-reasoner (legacy thinking-mode alias of v4-flash, deprecated 2026-07-24)',
    confirmed: true,
  },

  // ── OpenAI ──────────────────────────────────────────────────────────────
  // gpt-5.5 is the OPENAI_DEFAULT_MODEL / fallback. Not a publicly priced SKU
  // yet — placeholder at a gpt-4o-class rate. CONFIRM before relying on it.
  'gpt-5.5': {
    inputPerMTok: 2.50,
    cachedInputPerMTok: 1.25,
    outputPerMTok: 10.00,
    source: 'PLACEHOLDER — gpt-4o-class rate, gpt-5.5 not publicly priced yet',
    confirmed: false,
  },
  // text-embedding-3-small — RAG guideline retrieval embeddings.
  'text-embedding-3-small': {
    inputPerMTok: 0.02,
    outputPerMTok: 0,
    source: 'OpenAI pricing — text-embedding-3-small',
    confirmed: true,
  },
  // Whisper is billed per audio-minute, not per token, so token-based cost is 0.
  'whisper-1': {
    inputPerMTok: 0,
    outputPerMTok: 0,
    source: 'OpenAI Whisper billed per audio-minute, not per token',
    confirmed: true,
  },
}

let overridesCache: Record<string, ModelPrice> | null = null
function getOverrides(): Record<string, ModelPrice> {
  if (overridesCache) return overridesCache
  const raw = process.env.LLM_PRICING_OVERRIDES
  if (!raw) {
    overridesCache = {}
    return overridesCache
  }
  try {
    overridesCache = JSON.parse(raw) as Record<string, ModelPrice>
  } catch (err) {
    console.warn(`[llm-pricing] Failed to parse LLM_PRICING_OVERRIDES: ${(err as Error).message}`)
    overridesCache = {}
  }
  return overridesCache
}

/**
 * Resolve the price for a model id. Tries (1) env override, (2) exact match,
 * (3) longest base-key that the id starts with (so "gpt-5.5-fallback" → "gpt-5.5").
 * Returns null when the model is unknown.
 */
export function getModelPrice(model: string): ModelPrice | null {
  if (!model) return null
  const id = model.toLowerCase().trim()
  const overrides = getOverrides()

  if (overrides[id]) return overrides[id]
  if (overrides[model]) return overrides[model]
  if (PRICING_TABLE[id]) return PRICING_TABLE[id]

  // Prefix match: pick the longest base key the id starts with.
  let best: { key: string; price: ModelPrice } | null = null
  for (const [key, price] of Object.entries({ ...PRICING_TABLE, ...overrides })) {
    if (id.startsWith(key.toLowerCase()) && (!best || key.length > best.key.length)) {
      best = { key, price }
    }
  }
  return best?.price ?? null
}

export interface CostBreakdown {
  model: string
  inputUsd: number
  cachedInputUsd: number
  outputUsd: number
  totalUsd: number
  /** false when the price is a placeholder (model not publicly priced yet). */
  priceConfirmed: boolean
}

export interface TokenUsageLike {
  promptTokens?: number
  completionTokens?: number
  /** Subset of promptTokens served from cache (DeepSeek prompt_cache_hit_tokens / OpenAI cached_tokens). */
  cachedPromptTokens?: number
}

/**
 * Estimate the USD cost of a single LLM call from its model + token usage.
 * Cached prompt tokens are billed at the reduced cache-hit rate; the rest of
 * the prompt at the standard rate. Returns null for unknown models.
 */
export function estimateCost(model: string, usage: TokenUsageLike | undefined): CostBreakdown | null {
  if (!usage) return null
  const price = getModelPrice(model)
  if (!price) return null

  const promptTokens = usage.promptTokens ?? 0
  const completionTokens = usage.completionTokens ?? 0
  const cachedTokens = Math.min(usage.cachedPromptTokens ?? 0, promptTokens)
  const uncachedPromptTokens = Math.max(promptTokens - cachedTokens, 0)

  const cachedRate = price.cachedInputPerMTok ?? price.inputPerMTok
  const inputUsd = (uncachedPromptTokens / 1_000_000) * price.inputPerMTok
  const cachedInputUsd = (cachedTokens / 1_000_000) * cachedRate
  const outputUsd = (completionTokens / 1_000_000) * price.outputPerMTok

  return {
    model,
    inputUsd,
    cachedInputUsd,
    outputUsd,
    totalUsd: inputUsd + cachedInputUsd + outputUsd,
    priceConfirmed: price.confirmed,
  }
}

/** Sum several call costs into one consultation-level total. */
export function sumCosts(costs: Array<CostBreakdown | null | undefined>): CostBreakdown {
  return costs.reduce<CostBreakdown>(
    (acc, c) => {
      if (!c) return acc
      return {
        model: 'aggregate',
        inputUsd: acc.inputUsd + c.inputUsd,
        cachedInputUsd: acc.cachedInputUsd + c.cachedInputUsd,
        outputUsd: acc.outputUsd + c.outputUsd,
        totalUsd: acc.totalUsd + c.totalUsd,
        priceConfirmed: acc.priceConfirmed && c.priceConfirmed,
      }
    },
    { model: 'aggregate', inputUsd: 0, cachedInputUsd: 0, outputUsd: 0, totalUsd: 0, priceConfirmed: true },
  )
}

/** Format a USD amount with enough precision for sub-cent LLM costs. */
export function formatUsd(amount: number): string {
  if (amount === 0) return '$0'
  if (amount < 0.01) return `$${amount.toFixed(6)}`
  if (amount < 1) return `$${amount.toFixed(4)}`
  return `$${amount.toFixed(4)}`
}
