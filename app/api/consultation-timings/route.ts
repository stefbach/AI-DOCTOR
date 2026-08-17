// app/api/consultation-timings/route.ts
//
// Records how long a consultation took, section by section.
//
// Called at every step transition, not only at the end: a consultation the
// doctor abandons halfway is exactly the one worth seeing, and it would leave
// no trace at all if the only write happened at signature.
//
// Nothing clinical crosses this boundary — identifiers, section names and
// durations. The measurement is management data, and keeping it free of
// patient content means it can be read by people who have no business reading
// a medical record.

import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null

const KNOWN_SECTIONS = new Set([
  "patientInfo",
  "clinicalData",
  "questions",
  "diagnosis",
  "medicalRecord",
])

const str = (v: any): string | null => {
  const s = typeof v === "string" ? v.trim() : ""
  return s ? s.slice(0, 200) : null
}

/** A duration, or 0. Never NaN, never negative, never a year long. */
const seconds = (v: any): number => {
  const n = Number(v)
  if (!isFinite(n) || n < 0) return 0
  return Math.min(Math.round(n), 24 * 3600)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const consultationId = str(body?.consultationId)
    if (!consultationId) {
      return NextResponse.json({ success: false, error: "consultationId required" }, { status: 400 })
    }
    if (!supabase) {
      return NextResponse.json({ success: false, error: "storage unavailable" }, { status: 503 })
    }

    const startedAt = body?.startedAt ? new Date(body.startedAt) : null
    if (!startedAt || isNaN(startedAt.getTime())) {
      return NextResponse.json({ success: false, error: "startedAt required" }, { status: 400 })
    }
    const endedAtRaw = body?.endedAt ? new Date(body.endedAt) : null
    const endedAt = endedAtRaw && !isNaN(endedAtRaw.getTime()) ? endedAtRaw : null

    // Only the sections this app actually has, so a bad payload cannot grow
    // arbitrary keys in a column the dashboard iterates over.
    const sectionSeconds: Record<string, number> = {}
    const raw = body?.sectionSeconds
    if (raw && typeof raw === "object") {
      for (const [key, value] of Object.entries(raw)) {
        if (KNOWN_SECTIONS.has(key)) sectionSeconds[key] = seconds(value)
      }
    }

    const questionCount = Number.isFinite(Number(body?.questionCount))
      ? Math.max(0, Math.min(50, Math.round(Number(body.questionCount))))
      : null

    const { error } = await supabase
      .from("consultation_timings")
      .upsert(
        {
          consultation_id: consultationId,
          doctor_id: str(body?.doctorId),
          patient_id: str(body?.patientId),
          consultation_type: str(body?.consultationType) || "general",
          started_at: startedAt.toISOString(),
          ended_at: endedAt ? endedAt.toISOString() : null,
          total_seconds: seconds(body?.totalSeconds),
          ai_wait_seconds: seconds(body?.aiWaitSeconds),
          section_seconds: sectionSeconds,
          question_count: questionCount,
          budget_seconds: seconds(body?.budgetSeconds) || 900,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "consultation_id" },
      )
    // No .select(): a returning clause needs a SELECT policy this table
    // deliberately does not grant, and that failure mode is silent.

    if (error) {
      console.error("⏱️ consultation_timings upsert failed:", error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // A measurement must never take a consultation down with it.
    console.error("⏱️ consultation-timings route failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    )
  }
}
