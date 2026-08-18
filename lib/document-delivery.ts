// lib/document-delivery.ts
//
// Getting a consultation's documents to the patient, whatever happens.
//
// The doctor's phone used to post them straight to TIBOK. That is the longest
// and least reliable hop in the chain — mobile data, inside an iframe, during
// a video call — and it carried the one payload that must not be lost. When it
// failed there was no retry and no record: on 17/08 a doctor watched a spinner
// for fifteen minutes, closed the tab, and a paying patient received nothing.
//
// The hop is now short and the retry is ours. The phone posts to
// /api/deliver-documents on the same origin; that route writes the payload
// down and forwards it server-to-server. From the moment the row exists the
// consultation is safe: the doctor can close the tab, lose signal, go home,
// and the delivery still happens.
//
// This module holds the part both the first attempt and the retry sweep need,
// so a replay is the same code path as the original — byte for byte, with no
// second implementation to drift.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/** How many times a delivery is retried before it needs a human. */
export const MAX_DELIVERY_ATTEMPTS = 20

/** A single forward attempt must not hold a serverless function open. */
const FORWARD_TIMEOUT_MS = 20_000

export function deliveryClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  // Service role only. The table has no RLS policies by design — it holds a
  // full medical record — so the anon key would read nothing anyway, and
  // falling back to it would only produce a confusing empty result.
  if (!url || !key) return null
  return createClient(url, key)
}

export interface ForwardResult {
  delivered: boolean
  error?: string
  status?: number
}

/**
 * Hand one payload to TIBOK.
 *
 * Never throws: the caller is either answering a doctor who is waiting, or
 * sweeping a queue, and neither should fail because one delivery did.
 */
export async function forwardToTibok(
  tibokUrl: string,
  payload: any,
): Promise<ForwardResult> {
  const target = `${String(tibokUrl).replace(/\/+$/, "")}/api/send-to-patient-dashboard`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS)

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    })

    const text = await response.text().catch(() => "")

    if (!response.ok) {
      return {
        delivered: false,
        status: response.status,
        error: `HTTP ${response.status}: ${text.slice(0, 300)}`,
      }
    }

    // A 200 carrying an error is still a failure. TIBOK answers with
    // { success: boolean }, and trusting the status alone would mark a
    // rejected delivery as done and stop retrying it.
    let parsed: any = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      return {
        delivered: false,
        status: response.status,
        error: `unparseable response: ${text.slice(0, 300)}`,
      }
    }

    if (parsed?.success === false) {
      return {
        delivered: false,
        status: response.status,
        error: String(parsed?.error || "TIBOK reported failure").slice(0, 300),
      }
    }

    return { delivered: true, status: response.status }
  } catch (error: any) {
    const message = error?.name === "AbortError" ? "timeout" : error?.message || "network error"
    return { delivered: false, error: String(message).slice(0, 300) }
  } finally {
    clearTimeout(timer)
  }
}

/** Record the outcome of one attempt against a queued delivery. */
export async function recordAttempt(
  supabase: SupabaseClient,
  consultationId: string,
  result: ForwardResult,
  attempts: number,
): Promise<void> {
  const now = new Date().toISOString()

  if (result.delivered) {
    await supabase
      .from("document_deliveries")
      .update({
        status: "delivered",
        attempts,
        last_error: null,
        last_attempt_at: now,
        delivered_at: now,
        updated_at: now,
      })
      .eq("consultation_id", consultationId)
    return
  }

  await supabase
    .from("document_deliveries")
    .update({
      // 'failed' is not "give up on the patient" — it is "this needs a human".
      // The row keeps its payload either way, so a manual retry is still a
      // replay of the original rather than a reconstruction.
      status: attempts >= MAX_DELIVERY_ATTEMPTS ? "failed" : "pending",
      attempts,
      last_error: result.error || "unknown error",
      last_attempt_at: now,
      updated_at: now,
    })
    .eq("consultation_id", consultationId)
}
