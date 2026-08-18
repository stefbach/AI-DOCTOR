// app/api/deliver-documents/route.ts
//
// Where the doctor's browser hands over the documents, and stops being
// responsible for them.
//
// It used to post them straight to TIBOK, across the network, from a phone on
// mobile data inside an iframe during a video call. That request failing meant
// the patient got nothing and nobody knew. Now the browser only has to reach
// our own origin — a hop so short it barely fails — and everything after that
// is the server's problem, which is a problem the server can retry.
//
// The contract with the browser is deliberately generous: once this route has
// written the row, it answers success. Not "the patient has the documents" —
// "the documents cannot be lost any more". Those are different promises and
// the response says which one it is keeping, so the doctor is never told a
// delivery happened when it has not.

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
    const body = await request.json()

    const consultationId = str(body?.consultationId)
    const tibokUrl = str(body?.tibokUrl, 500)
    const payload = body?.payload

    if (!consultationId) {
      return NextResponse.json({ success: false, error: "consultationId required" }, { status: 400 })
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, error: "payload required" }, { status: 400 })
    }
    if (!tibokUrl) {
      return NextResponse.json({ success: false, error: "tibokUrl required" }, { status: 400 })
    }

    const supabase = deliveryClient()
    if (!supabase) {
      // Refusing loudly matters here. Answering success without a row would
      // tell the doctor their work is safe when nothing was written.
      console.error("📦 deliver-documents: no service-role client, cannot queue")
      return NextResponse.json({ success: false, error: "storage unavailable" }, { status: 503 })
    }

    // Written FIRST, forwarded second. If this process dies between the two,
    // the sweep picks the row up; if it died before the write there would be
    // nothing to pick up, and that is the failure mode being removed.
    const { error: queueError } = await supabase.from("document_deliveries").upsert(
      {
        consultation_id: consultationId,
        patient_id: str(body?.patientId),
        doctor_id: str(body?.doctorId),
        patient_name: str(body?.patientName),
        doctor_name: str(body?.doctorName),
        tibok_url: tibokUrl,
        payload,
        status: "pending",
        attempts: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "consultation_id" },
    )

    if (queueError) {
      console.error("📦 deliver-documents: could not queue:", queueError.message)
      return NextResponse.json({ success: false, error: queueError.message }, { status: 500 })
    }

    console.log(`📦 Documents queued for ${consultationId}`)

    // From here the consultation is safe. The forward is attempted at once so
    // that the ordinary case — everything working — still delivers while the
    // doctor is looking at the screen.
    const result = await forwardToTibok(tibokUrl, payload)
    await recordAttempt(supabase, consultationId, result, 1)

    if (result.delivered) {
      console.log(`📦 Documents delivered to TIBOK for ${consultationId}`)
      return NextResponse.json({ success: true, delivered: true })
    }

    console.warn(
      `📦 Delivery pending for ${consultationId} — will retry. Reason: ${result.error}`,
    )
    return NextResponse.json({
      success: true,
      delivered: false,
      queued: true,
      error: result.error,
    })
  } catch (error) {
    console.error("📦 deliver-documents failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    )
  }
}
