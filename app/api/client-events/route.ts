import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Ingest for the browser-side black box (lib/blackbox.ts).
//
// Reports arrive via sendBeacon, so this route must be cheap, must never make
// the browser wait, and must answer 200 even when it drops the record: a
// failing telemetry endpoint must not produce console noise in a doctor's
// browser on top of whatever already went wrong.
//
// Writes with the ANON key against an insert-only RLS policy. Reads are
// service-role only, in app/api/incidents.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const VALID_KINDS = new Set([
  "render_crash",
  "js_error",
  "unhandled_rejection",
  "api_error",
  "slow_request",
  "boot_stall",
])

const MAX_BREADCRUMBS = 50
const text = (v: any, max: number): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false }, { status: 200 })
    }

    const kind = VALID_KINDS.has(body.kind) ? body.kind : "js_error"
    const severity = body.severity === "warning" ? "warning" : "error"

    // Second line of defence on confidentiality: the recorder already stores
    // paths without query strings, but a stray full URL must not slip through
    // in a stack trace or a pathname field.
    const pathname = text(String(body.pathname || "").split("?")[0], 300)

    const breadcrumbs = Array.isArray(body.breadcrumbs)
      ? body.breadcrumbs.slice(-MAX_BREADCRUMBS).map((b: any) => ({
          t: Number(b?.t) || 0,
          type: text(b?.type, 20),
          name: text(String(b?.name || "").split("?")[0], 200),
          status: typeof b?.status === "number" ? b.status : undefined,
          ms: typeof b?.ms === "number" ? b.ms : undefined,
          ok: typeof b?.ok === "boolean" ? b.ok : undefined,
        }))
      : []

    if (!supabase) {
      console.error("⚠️ client-events: Supabase not configured, dropping report:", kind)
      return NextResponse.json({ success: false }, { status: 200 })
    }

    // The browser retries delivery and also beacons on page hide, so the same
    // report can arrive twice. It carries a browser-generated id, and a unique
    // index turns the second arrival into a 23505 we swallow below.
    //
    // Deliberately a plain insert, NOT an upsert: any ON CONFLICT clause — even
    // DO NOTHING — makes Postgres require an UPDATE policy on the table, and
    // the only way to grant that here would be to let anyone holding the public
    // key rewrite stored incidents. A black box whose records can be edited is
    // not a black box. Verified as the anon role: plain INSERT passes,
    // ON CONFLICT DO NOTHING and DO UPDATE are both refused by RLS.
    const clientEventId = text(body._id, 100)

    const { error } = await supabase.from("client_error_events").insert({
      client_event_id: clientEventId,
      occurred_at: text(body.occurredAt, 40) || new Date().toISOString(),
      kind,
      severity,
      message: text(body.message, 1000),
      stack: text(body.stack, 4000),
      pathname,
      consultation_id: text(body.consultationId, 100),
      patient_id: text(body.patientId, 100),
      doctor_id: text(body.doctorId, 100),
      breadcrumbs,
      session_id: text(body.sessionId, 100),
      user_agent: text(body.userAgent, 400),
      viewport: text(body.viewport, 20),
      commit_sha: text(body.commitSha, 60),
    })

    if (error) {
      // 23505: this report is already stored — a retry or the exit beacon
      // arriving after the queued copy got through. Report success so the
      // browser drops it from its outbox instead of retrying forever.
      if (error.code === "23505") {
        console.log(`📼 Black box: duplicate report ignored (${clientEventId})`)
        return NextResponse.json({ success: true, duplicate: true })
      }
      console.error("⚠️ client-events: insert failed:", error.message)
      return NextResponse.json({ success: false }, { status: 200 })
    }

    console.log(
      `📼 Black box [${severity}] ${kind}: ${text(body.message, 160)} (consultation ${text(body.consultationId, 60) || "n/a"})`,
    )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("⚠️ client-events: unexpected error:", error?.message || error)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
