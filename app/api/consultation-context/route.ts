// app/api/consultation-context/route.ts
//
// Who the patient and the doctor are, for a consultation the browser has lost
// track of.
//
// TIBOK writes `patient_id` and `doctor_id` into `consultations` the moment a
// consultation is created. The doctor's browser receives them through a chain
// of URL parameters and sessionStorage that a third-party iframe on a phone
// can break at any point — and when it breaks, the app refuses to save or send
// a report whose owner the database has known all along.
//
// So it asks. Given the one identifier that survives, this returns the two
// that did not. No clinical content crosses this boundary: two identifiers and
// the consultation's type, nothing else.

import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase =
  supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
    : null

/** A consultation id is a uuid. Anything else is not worth a query. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  try {
    const consultationId = (
      request.nextUrl.searchParams.get("consultationId") || ""
    ).trim()

    if (!consultationId) {
      return NextResponse.json(
        { success: false, error: "consultationId required" },
        { status: 400 },
      )
    }

    // Locally generated ids ("consultation_1786…") never exist in TIBOK's
    // table. Answering plainly beats a database round-trip and a 404 the
    // caller has to interpret.
    if (!UUID.test(consultationId)) {
      return NextResponse.json({
        success: false,
        error: "not a TIBOK consultation id",
        local: true,
      })
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "storage unavailable" },
        { status: 503 },
      )
    }

    const { data, error } = await supabase
      .from("consultations")
      .select("id, patient_id, doctor_id, consultation_type, status")
      .eq("id", consultationId)
      .maybeSingle()

    if (error) {
      console.error("🆔 consultation-context lookup failed:", error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "consultation not found" },
        { status: 404 },
      )
    }

    console.log(
      `🆔 consultation-context resolved ${consultationId}: patient=${!!data.patient_id} doctor=${!!data.doctor_id}`,
    )

    return NextResponse.json({
      success: true,
      consultationId: data.id,
      patientId: data.patient_id || null,
      doctorId: data.doctor_id || null,
      consultationType: data.consultation_type || null,
      status: data.status || null,
    })
  } catch (error) {
    console.error("🆔 consultation-context route failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    )
  }
}
