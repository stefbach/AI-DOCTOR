// app/api/ai-result/route.ts
//
// "The analysis you already paid for — is it ready?"
//
// The client calls this after its own request to /api/openai-diagnosis died on
// the network. Two cases, and both are answered the same way:
//
//   - the server finished while the phone was offline  → the result is here,
//     hand it back, the doctor loses seconds instead of minutes;
//   - the server is still working                       → nothing yet, the
//     client polls again.
//
// Same-origin only, keyed by consultation id. See lib/ai-result-cache.ts for
// why this exists at all.

import { NextRequest, NextResponse } from "next/server"
import { readStepResult, type AiStep } from "@/lib/ai-result-cache"

export const runtime = "nodejs"
export const maxDuration = 30
export const dynamic = "force-dynamic"

const KNOWN_STEPS: AiStep[] = ["diagnosis"]

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const consultationId = (params.get("consultationId") || "").trim()
  const step = (params.get("step") || "diagnosis").trim() as AiStep
  // Identifies the attempt that is asking. A result from an earlier run of the
  // same consultation is not this doctor's result.
  const token = (params.get("token") || "").trim()

  if (!consultationId) {
    return NextResponse.json(
      { success: false, found: false, error: "consultationId is required" },
      { status: 400 },
    )
  }

  if (!KNOWN_STEPS.includes(step)) {
    return NextResponse.json(
      { success: false, found: false, error: `unknown step "${step}"` },
      { status: 400 },
    )
  }

  const payload = await readStepResult(consultationId, step, token || undefined)

  if (!payload) {
    // Not an error: "not ready yet" is the expected answer while the server is
    // still working, and the client is polling on that basis.
    return NextResponse.json(
      { success: true, found: false },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  console.log(`♻️ [ai-result] serving cached ${step} for ${consultationId}`)

  return NextResponse.json(
    { success: true, found: true, payload },
    { headers: { "Cache-Control": "no-store" } },
  )
}
