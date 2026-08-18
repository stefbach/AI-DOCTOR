// app/api/deliver-documents/relink/route.ts
//
// Attaching a stranded delivery to the right patient, and sending it.
//
// A delivery can arrive here with no patient: the browser lost the identifier,
// the database lookup could not recover it, and the documents were queued
// anyway rather than dropped. Someone then has to say who the patient is.
//
// The reason this is a route rather than a note telling an administrator which
// two fields to edit: the patient id lives in TWO places — the row's own
// column, and inside the stored payload that is replayed to TIBOK. Correcting
// one and not the other produces a delivery that looks fixed on the admin
// screen and still reaches nobody. Doing it here makes that impossible.

import { type NextRequest, NextResponse } from "next/server"

import { deliveryClient, forwardToTibok, recordAttempt } from "@/lib/document-delivery"

export const runtime = "nodejs"
export const maxDuration = 60

const str = (v: any, max = 200): string | null => {
  const s = typeof v === "string" ? v.trim() : ""
  return s ? s.slice(0, max) : null
}

export async function POST(request: NextRequest) {
  try {
    // This route moves medical documents on someone's behalf. It is not the
    // cron secret: a value pasted into another team's admin codebase should
    // not also be the one that can trigger the scheduler.
    const secret = process.env.DELIVERY_ADMIN_SECRET
    if (!secret) {
      console.error("📦 relink: DELIVERY_ADMIN_SECRET is not set — refusing")
      return NextResponse.json({ success: false, error: "not configured" }, { status: 503 })
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: "unauthorised" }, { status: 401 })
    }

    const body = await request.json()
    const consultationId = str(body?.consultationId)
    const patientId = str(body?.patientId)
    const doctorId = str(body?.doctorId)

    if (!consultationId) {
      return NextResponse.json({ success: false, error: "consultationId required" }, { status: 400 })
    }
    if (!patientId && !doctorId) {
      return NextResponse.json(
        { success: false, error: "patientId or doctorId required" },
        { status: 400 },
      )
    }

    const supabase = deliveryClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "storage unavailable" }, { status: 503 })
    }

    const { data: row, error: readError } = await supabase
      .from("document_deliveries")
      .select("consultation_id, tibok_url, payload, attempts, status")
      .eq("consultation_id", consultationId)
      .maybeSingle()

    if (readError) {
      return NextResponse.json({ success: false, error: readError.message }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ success: false, error: "delivery not found" }, { status: 404 })
    }
    if (row.status === "delivered") {
      // Not an error: an administrator opening the page twice should be told
      // it is already done rather than made to send a duplicate.
      return NextResponse.json({ success: true, alreadyDelivered: true })
    }

    // Both places, in one write.
    const payload = { ...(row.payload as any) }
    if (patientId) payload.patientId = patientId
    if (doctorId) payload.doctorId = doctorId

    const { error: updateError } = await supabase
      .from("document_deliveries")
      .update({
        ...(patientId ? { patient_id: patientId } : {}),
        ...(doctorId ? { doctor_id: doctorId } : {}),
        payload,
        // Back into the queue from zero: whatever made the earlier attempts
        // fail has just been corrected, so they should not count against it.
        status: "pending",
        attempts: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("consultation_id", consultationId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    console.log(`📦 Relinked ${consultationId} → patient ${patientId || "(unchanged)"}`)

    // Attempted at once, so the administrator sees the outcome of what they
    // just did rather than being told to wait for a sweep.
    const result = await forwardToTibok(row.tibok_url, payload)
    await recordAttempt(supabase, consultationId, result, 1)

    return NextResponse.json({
      success: true,
      delivered: result.delivered,
      error: result.delivered ? undefined : result.error,
    })
  } catch (error) {
    console.error("📦 relink failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    )
  }
}
