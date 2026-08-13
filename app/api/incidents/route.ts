import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Read side of the black box, for /admin/incidents.
//
// Service role only. The table's RLS grants insert to anon and nothing else,
// so stack traces and consultation identifiers are never readable from a
// browser holding the public key — they are only ever assembled here, on the
// server, for the incidents page.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Incident storage not configured (SUPABASE_SERVICE_ROLE_KEY missing)" },
        { status: 503 },
      )
    }

    const url = new URL(request.url)
    const hours = Math.min(Math.max(Number(url.searchParams.get("hours")) || 24, 1), 24 * 30)
    const kind = url.searchParams.get("kind")
    const consultationId = url.searchParams.get("consultationId")
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 200)

    const since = new Date(Date.now() - hours * 3600_000).toISOString()

    let query = supabase
      .from("client_error_events")
      .select("*")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(limit)

    if (kind) query = query.eq("kind", kind)
    if (consultationId) query = query.eq("consultation_id", consultationId)

    const { data, error } = await query

    if (error) {
      console.error("❌ incidents: query failed:", error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const events = data || []

    // Group by signature so a single recurring bug reads as one line with a
    // count, not fifty rows burying everything else.
    const groups = new Map<string, any>()
    for (const e of events) {
      const key = `${e.kind}|${(e.message || "").slice(0, 120)}`
      const existing = groups.get(key)
      if (existing) {
        existing.count++
        existing.lastSeen = existing.lastSeen > e.occurred_at ? existing.lastSeen : e.occurred_at
        existing.firstSeen = existing.firstSeen < e.occurred_at ? existing.firstSeen : e.occurred_at
        if (e.consultation_id) existing.consultations.add(e.consultation_id)
      } else {
        groups.set(key, {
          key,
          kind: e.kind,
          severity: e.severity,
          message: e.message,
          count: 1,
          firstSeen: e.occurred_at,
          lastSeen: e.occurred_at,
          consultations: new Set(e.consultation_id ? [e.consultation_id] : []),
          sample: e,
        })
      }
    }

    const grouped = [...groups.values()]
      .map((g) => ({ ...g, consultations: [...g.consultations] }))
      .sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1))

    return NextResponse.json({
      success: true,
      windowHours: hours,
      total: events.length,
      groups: grouped,
    })
  } catch (error: any) {
    console.error("❌ incidents: unexpected error:", error?.message || error)
    return NextResponse.json(
      { success: false, error: error?.message || "Unexpected error" },
      { status: 500 },
    )
  }
}
