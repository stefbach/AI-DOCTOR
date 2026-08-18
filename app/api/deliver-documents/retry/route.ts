// app/api/deliver-documents/retry/route.ts
//
// The sweep that finishes what the doctor's browser started.
//
// Every few minutes it takes the deliveries that have not reached TIBOK and
// tries them again. This is the whole point of the queue: the doctor closed
// the tab an hour ago, the phone is off, and the patient still gets their
// documents.
//
// Retries are replays. The stored payload is sent again exactly as it was
// built, so a delivery made on the tenth attempt is byte-identical to the one
// that would have been made on the first.

import { type NextRequest, NextResponse } from "next/server"

import {
  MAX_DELIVERY_ATTEMPTS,
  deliveryClient,
  forwardToTibok,
  recordAttempt,
} from "@/lib/document-delivery"
import { purgeExpiredStepResults } from "@/lib/ai-result-cache"

export const runtime = "nodejs"
export const maxDuration = 300

/** Deliveries attempted per sweep, so one run cannot outlive its budget. */
const BATCH = 10

/**
 * Wait longer after each failure, up to an hour.
 *
 * TIBOK being down for twenty minutes should not cost twenty attempts, and a
 * consultation queued three hours ago should still be tried regularly rather
 * than abandoned. Computed from the attempt count, so nothing has to be stored.
 */
function readyForAnotherAttempt(attempts: number, lastAttemptAt: string | null): boolean {
  if (!lastAttemptAt) return true
  const waitMinutes = Math.min(60, Math.max(1, 2 ** Math.min(attempts, 6)))
  const elapsed = Date.now() - new Date(lastAttemptAt).getTime()
  return elapsed >= waitMinutes * 60_000
}

async function sweep() {
  const supabase = deliveryClient()
  if (!supabase) {
    return NextResponse.json({ success: false, error: "storage unavailable" }, { status: 503 })
  }

  const { data, error } = await supabase
    .from("document_deliveries")
    .select("consultation_id, tibok_url, payload, attempts, last_attempt_at")
    .eq("status", "pending")
    .lt("attempts", MAX_DELIVERY_ATTEMPTS)
    .order("last_attempt_at", { ascending: true, nullsFirst: true })
    .limit(BATCH)

  if (error) {
    console.error("📦 retry sweep: query failed:", error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const rows = data || []
  let delivered = 0
  let stillPending = 0
  let skipped = 0

  for (const row of rows) {
    if (!readyForAnotherAttempt(row.attempts, row.last_attempt_at)) {
      skipped++
      continue
    }

    const result = await forwardToTibok(row.tibok_url, row.payload)
    await recordAttempt(supabase, row.consultation_id, result, (row.attempts || 0) + 1)

    if (result.delivered) {
      delivered++
      console.log(`📦 Retry delivered ${row.consultation_id} on attempt ${(row.attempts || 0) + 1}`)
    } else {
      stillPending++
      console.warn(
        `📦 Retry failed for ${row.consultation_id} (attempt ${(row.attempts || 0) + 1}): ${result.error}`,
      )
    }
  }

  console.log(
    `📦 Sweep done: ${rows.length} queued, ${delivered} delivered, ${stillPending} still pending, ${skipped} not due yet`,
  )

  // Cached AI results only help the doctor still on that consultation. This
  // sweep already runs every five minutes, so it carries the cleanup rather
  // than earning a cron entry of its own.
  const purged = await purgeExpiredStepResults()
  if (purged > 0) console.log(`♻️ Purged ${purged} expired AI result(s)`)

  return NextResponse.json({
    success: true,
    examined: rows.length,
    delivered,
    stillPending,
    skipped,
    aiResultsPurged: purged,
  })
}

/**
 * Vercel's scheduler calls this with `Authorization: Bearer $CRON_SECRET` when
 * that variable is set. The check is skipped when it is not, so the sweep works
 * before anyone has configured it — and says so, because an unguarded endpoint
 * that forwards medical documents should not stay unguarded quietly.
 */
function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn("📦 retry sweep: CRON_SECRET is not set — endpoint is unauthenticated")
    return true
  }
  return request.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ success: false, error: "unauthorised" }, { status: 401 })
  }
  return sweep()
}

// Same work under POST, so the sweep can be triggered by hand from a terminal
// without pretending a scheduled GET is what happened.
export async function POST(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ success: false, error: "unauthorised" }, { status: 401 })
  }
  return sweep()
}
