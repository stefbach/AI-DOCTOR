// lib/ai-result-cache.ts
//
// Not losing work the server has already done.
//
// /api/openai-diagnosis routinely runs 90-150s: DeepSeek on the enriched
// prompt, plus the RAG fan-out. The doctor waits on a phone, inside an iframe
// on tibok.mu, under a live video pane. That is the worst link in the chain,
// and it drops.
//
// On 18/08 at 13:21 it dropped mid-wait. The function finished in 92.5s and
// answered 200 with a complete analysis (dengue fever, prescription, six labs)
// — into a socket nobody was listening on. The browser only found out at
// 354s, when the OS gave up on the connection. Six minutes of spinner, and the
// analysis discarded.
//
// So the result is written down before it is sent. If the response never
// arrives, the client asks for it back by consultation id. Nothing is
// recomputed, and the doctor waits seconds rather than minutes.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/** Steps that cache their result. One row per (consultation, step). */
export type AiStep = "diagnosis"

/**
 * A cached result is only ever useful for the few minutes the doctor is still
 * on that consultation. Rows older than this are swept by the delivery cron.
 */
export const AI_RESULT_TTL_HOURS = 24

function cacheClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  // Service role only: the table holds a full clinical analysis and has no
  // RLS policies by design, so the anon key would read nothing anyway.
  if (!url || !key) return null
  return createClient(url, key)
}

/** Locally generated ids (`consultation_…`) are fine as keys — they are stable
 *  for the life of the tab, which is exactly the window recovery needs. What is
 *  not fine is an empty or absent id: it would collide across consultations. */
function usableKey(consultationId: unknown): string | null {
  const id = String(consultationId ?? "").trim()
  return id.length >= 8 ? id : null
}

/**
 * Store a finished step result.
 *
 * Never throws. A failed write costs the recovery path, not the response the
 * doctor is waiting for — the caller must still answer.
 */
export async function saveStepResult(
  consultationId: unknown,
  step: AiStep,
  payload: any,
  token?: unknown,
): Promise<boolean> {
  const key = usableKey(consultationId)
  if (!key) {
    console.warn(`[ai-result-cache] no usable consultation id — ${step} result not cached`)
    return false
  }

  const supabase = cacheClient()
  if (!supabase) {
    console.warn("[ai-result-cache] service role not configured — result not cached")
    return false
  }

  try {
    const { error } = await supabase
      .from("ai_step_results")
      .upsert(
        {
          consultation_id: key,
          step,
          payload,
          token: token == null ? null : String(token),
          created_at: new Date().toISOString(),
        },
        { onConflict: "consultation_id,step" },
      )

    if (error) {
      console.error(`[ai-result-cache] failed to cache ${step} for ${key}:`, error.message)
      return false
    }

    console.log(`[ai-result-cache] ${step} result cached for ${key}`)
    return true
  } catch (err: any) {
    console.error(`[ai-result-cache] unexpected error caching ${step}:`, err?.message || err)
    return false
  }
}

/**
 * Read back a cached step result, or null if there is nothing (yet).
 *
 * When a token is given, a row carrying a different one is treated as absent.
 * A consultation can be re-run — the doctor edits the clinical data and
 * regenerates — and a request that died before reaching the server would
 * otherwise "recover" the previous run's analysis into the medical record.
 */
export async function readStepResult(
  consultationId: unknown,
  step: AiStep,
  token?: unknown,
): Promise<any | null> {
  const key = usableKey(consultationId)
  if (!key) return null

  const supabase = cacheClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("ai_step_results")
      .select("payload, token")
      .eq("consultation_id", key)
      .eq("step", step)
      .maybeSingle()

    if (error) {
      console.error(`[ai-result-cache] failed to read ${step} for ${key}:`, error.message)
      return null
    }

    if (!data) return null

    const wanted = token == null ? null : String(token)
    if (wanted && data.token !== wanted) {
      console.log(
        `[ai-result-cache] ${step} for ${key} is from another attempt — not returning it`,
      )
      return null
    }

    return data.payload ?? null
  } catch (err: any) {
    console.error(`[ai-result-cache] unexpected error reading ${step}:`, err?.message || err)
    return null
  }
}

/**
 * Drop results past their usefulness. Called from the delivery sweep so this
 * needs no cron entry of its own. Returns the number of rows removed, or -1 if
 * the purge could not run.
 */
export async function purgeExpiredStepResults(): Promise<number> {
  const supabase = cacheClient()
  if (!supabase) return -1

  const cutoff = new Date(Date.now() - AI_RESULT_TTL_HOURS * 60 * 60 * 1000).toISOString()

  try {
    const { data, error } = await supabase
      .from("ai_step_results")
      .delete()
      .lt("created_at", cutoff)
      .select("id")

    if (error) {
      console.error("[ai-result-cache] purge failed:", error.message)
      return -1
    }
    return data?.length ?? 0
  } catch (err: any) {
    console.error("[ai-result-cache] unexpected purge error:", err?.message || err)
    return -1
  }
}
