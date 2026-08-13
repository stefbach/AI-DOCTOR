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

    const { error } = await supabase.from("client_error_events").insert({
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
