import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { callLLM } from "@/lib/llm-client"
import {
  type PatientContext,
  type ReviewAlert,
  type ReviewSeverity,
  type ReviewSnapshot,
  type SnapshotDiff,
  countBlocking,
  mergeAlerts,
  runDeterministicChecks,
  sortAlerts,
} from "@/lib/prescription-review"

// Clinical review of a doctor-edited report, run just before signature.
//
// Two layers, in this order:
//   1. deterministic rules (lib/prescription-review.ts) — arithmetic and
//      composition facts, always computed, never overridden;
//   2. an LLM pass for the judgement calls rules cannot make (is this drug
//      appropriate for THIS presentation? is this lab relevant? does the
//      rewritten diagnosis still match the findings?).
//
// The route is advisory: it returns alerts, it does not decide. The doctor
// signs, and a doctor who overrides must justify — that decision is recorded
// through PATCH below. If the LLM fails we still return the deterministic
// alerts rather than nothing: a degraded review beats no review, and an
// error here must never stop a consultation.

export const maxDuration = 60

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const VALID_SEVERITIES: ReviewSeverity[] = ["critical", "major", "minor", "info"]
const VALID_TARGETS = ["medication", "laboratory", "imaging", "diagnosis"] as const

const s = (v: any): string => (typeof v === "string" ? v.trim() : "")

function describeMedications(snapshot: ReviewSnapshot): string {
  if (!snapshot.medications.length) return "(none)"
  return snapshot.medications
    .map(
      (m, i) =>
        `${i + 1}. name="${m.nom}" | INN/dci="${m.dci}" | strength="${m.dosage}" | form="${m.forme}" | route="${m.modeAdministration}" | posology="${m.posologie}" | duration="${m.dureeTraitement}" | instructions="${m.instructions}" | stated indication="${m.justification}"`,
    )
    .join("\n")
}

function describeLabs(snapshot: ReviewSnapshot): string {
  if (!snapshot.laboratory.length) return "(none)"
  return snapshot.laboratory
    .map(
      (t, i) =>
        `${i + 1}. "${t.nom}" [${t.category}]${t.urgence ? " URGENT" : ""} | indication="${t.motifClinique}"`,
    )
    .join("\n")
}

function describeImaging(snapshot: ReviewSnapshot): string {
  if (!snapshot.imaging.length) return "(none)"
  return snapshot.imaging
    .map(
      (e, i) =>
        `${i + 1}. "${e.type}" ${e.modalite} ${e.region}${e.urgence ? " URGENT" : ""} | indication="${e.indicationClinique}"`,
    )
    .join("\n")
}

function describeNarrative(snapshot: ReviewSnapshot, only?: string[]): string {
  const entries = Object.entries(snapshot.narrative).filter(
    ([k]) => !only || only.length === 0 || only.includes(k),
  )
  if (!entries.length) return "(none)"
  return entries.map(([k, v]) => `### ${k}\n${v}`).join("\n\n")
}

function describeChanges(diff: SnapshotDiff | null): string {
  if (!diff || diff.baselineMissing) {
    return "The AI baseline for this report is not available, so the exact doctor edits cannot be isolated. Review the WHOLE prescription and report as it stands."
  }
  if (!diff.hasChanges) {
    return "No difference detected between the AI proposal and the current document."
  }
  const lines: string[] = []
  if (diff.medicationsAdded.length) lines.push(`Medications ADDED by the doctor: ${diff.medicationsAdded.join("; ")}`)
  if (diff.medicationsRemoved.length) lines.push(`Medications REMOVED by the doctor: ${diff.medicationsRemoved.join("; ")}`)
  for (const m of diff.medicationsModified) {
    lines.push(`Medication MODIFIED: ${m.item} (fields changed: ${m.fields.join(", ")})`)
  }
  if (diff.labsAdded.length) lines.push(`Lab tests ADDED: ${diff.labsAdded.join("; ")}`)
  if (diff.labsRemoved.length) lines.push(`Lab tests REMOVED: ${diff.labsRemoved.join("; ")}`)
  if (diff.imagingAdded.length) lines.push(`Imaging ADDED: ${diff.imagingAdded.join("; ")}`)
  if (diff.imagingRemoved.length) lines.push(`Imaging REMOVED: ${diff.imagingRemoved.join("; ")}`)
  if (diff.narrativeModified.length) lines.push(`Narrative sections REWRITTEN: ${diff.narrativeModified.join(", ")}`)
  return lines.join("\n")
}

function buildPrompt(
  patient: PatientContext,
  snapshot: ReviewSnapshot,
  diff: SnapshotDiff | null,
  ruleAlerts: ReviewAlert[],
): string {
  const alreadyFlagged = ruleAlerts.length
    ? ruleAlerts.map((a) => `- [${a.severity}] ${a.issue} on "${a.item}"`).join("\n")
    : "(none)"

  return `You are a senior clinical pharmacologist reviewing a teleconsultation report in Mauritius, immediately BEFORE the doctor signs it.

The report was drafted by an AI, then edited by the doctor. Your job is to catch clinically unsound edits before they reach the patient. You are a safety net, not a second opinion on style: report only things that could harm the patient, mislead the pharmacist, or make the document clinically incoherent.

PATIENT
- Age: ${patient.age || "unknown"}
- Sex: ${patient.sexe || "unknown"}
- Weight: ${patient.poids || "unknown"}
- Allergies: ${patient.allergies || "not documented"}
- Past medical history: ${patient.medicalHistory || "not documented"}
- Current medications (before this consultation): ${patient.currentMedications || "not documented"}
- Chief complaint: ${patient.chiefComplaint || "not documented"}
- Diagnostic conclusion in the report: ${patient.diagnosis || "not documented"}

WHAT THE DOCTOR CHANGED
${describeChanges(diff)}

CURRENT MEDICATION PRESCRIPTION
${describeMedications(snapshot)}

CURRENT LABORATORY REQUESTS
${describeLabs(snapshot)}

CURRENT RADIOLOGY REQUESTS
${describeImaging(snapshot)}

CURRENT NARRATIVE REPORT
${describeNarrative(snapshot, diff && !diff.baselineMissing ? diff.narrativeModified : undefined)}

ALREADY DETECTED BY DETERMINISTIC RULES — do NOT repeat these, they are already shown to the doctor
${alreadyFlagged}

WHAT TO LOOK FOR
1. Medication safety: therapeutic duplication (including a branded combination product that repeats a molecule already prescribed), drug-drug interaction with the prescribed list or the patient's existing medications, contraindication given the age/sex/history/allergies, dose or duration inappropriate for the indication, wrong galenic form or route for the stated posology.
2. Clinical relevance: a drug, lab test or imaging study that does not correspond to the documented presentation and diagnosis — either not indicated, or a needed one obviously missing given the diagnosis.
3. Diagnostic and narrative coherence: a diagnosis or a rewritten section that contradicts the documented symptoms, examination findings, or the treatment actually prescribed. Only flag a genuine clinical contradiction — never a matter of wording, length or style.

SEVERITY
- "critical": could seriously harm the patient (overdose, contraindication, dangerous interaction, wrong route for the form).
- "major": clinically wrong or incoherent, needs correction before signing (drug not indicated for this case, diagnosis contradicting the findings, missing essential monitoring).
- "minor": imprecision or incompleteness that should be tidied but is not dangerous.
- "info": worth the doctor's attention, no action strictly required.

RULES
- Judge the WHOLE prescription together, not each line in isolation.
- Be specific: name the medication/test and say what is wrong and why, in clinical terms.
- Prefer silence over noise. If the edits are clinically sound, return an empty list. An empty list is a perfectly good answer and is the expected answer most of the time.
- The doctor is responsible and may have context you do not. Word alerts as findings to check, never as orders.
- Never invent a patient detail that is not stated above.
- "message" must be in FRENCH, "messageEn" in ENGLISH, and both must say the same thing.

Respond with ONLY a JSON object, no markdown fence, exactly in this shape:
{"alerts":[{"severity":"critical|major|minor|info","target":"medication|laboratory|imaging|diagnosis","item":"<the prescription line, test or section concerned>","issue":"<short-kebab-case-code>","message":"<French explanation>","messageEn":"<English explanation>","suggestion":"<French: what to do>","suggestionEn":"<English: what to do>"}]}`
}

function parseAiAlerts(raw: string): ReviewAlert[] {
  const clean = (raw || "").replace(/```json/gi, "").replace(/```/g, "").trim()
  if (!clean) return []

  let parsed: any
  try {
    parsed = JSON.parse(clean)
  } catch {
    // Some models wrap the object in prose despite the instruction.
    const start = clean.indexOf("{")
    const end = clean.lastIndexOf("}")
    if (start === -1 || end <= start) throw new Error("no JSON object in model output")
    parsed = JSON.parse(clean.slice(start, end + 1))
  }

  const list = Array.isArray(parsed?.alerts) ? parsed.alerts : []
  const alerts: ReviewAlert[] = []

  list.forEach((a: any, i: number) => {
    const severity = VALID_SEVERITIES.includes(a?.severity) ? (a.severity as ReviewSeverity) : "minor"
    const target = VALID_TARGETS.includes(a?.target) ? a.target : "medication"
    const message = s(a?.message) || s(a?.messageEn)
    if (!message) return
    alerts.push({
      id: `ai-${i + 1}`,
      severity,
      target,
      item: s(a?.item) || "Document",
      issue: s(a?.issue) || "clinical-review",
      message,
      messageEn: s(a?.messageEn) || message,
      suggestion: s(a?.suggestion),
      suggestionEn: s(a?.suggestionEn) || s(a?.suggestion),
      source: "ai",
    })
  })

  return alerts
}

async function persistReview(payload: {
  consultationId: string | null
  patientId: string | null
  doctorId: string | null
  consultationType: string | null
  alerts: ReviewAlert[]
  aiStatus: string
  snapshot: ReviewSnapshot
  diff: SnapshotDiff | null
}): Promise<string | null> {
  if (!supabase) return null
  if (!payload.consultationId || payload.consultationId.startsWith("sim-")) return null

  const { data, error } = await supabase
    .from("prescription_reviews")
    .insert({
      consultation_id: payload.consultationId,
      patient_id: payload.patientId,
      doctor_id: payload.doctorId,
      consultation_type: payload.consultationType,
      alerts: payload.alerts,
      blocking_count: countBlocking(payload.alerts),
      ai_status: payload.aiStatus,
      decision: "pending",
      snapshot: {
        medications: payload.snapshot.medications,
        laboratory: payload.snapshot.laboratory,
        imaging: payload.snapshot.imaging,
        changes: payload.diff,
      },
      reviewed_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle()

  if (error) {
    // Never fail the review because the audit row could not be written.
    console.error("⚠️ prescription-review: audit insert failed:", error.message)
    return null
  }
  return data?.id ?? null
}

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }

    const {
      consultationId = null,
      patientId = null,
      doctorId = null,
      consultationType = null,
      patient,
      snapshot,
      diff = null,
    } = body || {}

    if (!snapshot || typeof snapshot !== "object") {
      return NextResponse.json({ success: false, error: "Missing snapshot" }, { status: 400 })
    }

    const safeSnapshot: ReviewSnapshot = {
      medications: Array.isArray(snapshot.medications) ? snapshot.medications : [],
      laboratory: Array.isArray(snapshot.laboratory) ? snapshot.laboratory : [],
      imaging: Array.isArray(snapshot.imaging) ? snapshot.imaging : [],
      narrative: snapshot.narrative && typeof snapshot.narrative === "object" ? snapshot.narrative : {},
    }

    const safePatient: PatientContext = {
      age: s(patient?.age),
      sexe: s(patient?.sexe),
      poids: s(patient?.poids),
      allergies: s(patient?.allergies),
      medicalHistory: s(patient?.medicalHistory),
      currentMedications: s(patient?.currentMedications),
      chiefComplaint: s(patient?.chiefComplaint),
      diagnosis: s(patient?.diagnosis),
    }

    // Layer 1 — always runs, cannot fail on a model outage.
    const ruleAlerts = runDeterministicChecks(safeSnapshot, safePatient)

    const nothingToReview =
      safeSnapshot.medications.length === 0 &&
      safeSnapshot.laboratory.length === 0 &&
      safeSnapshot.imaging.length === 0

    // Layer 2 — clinical judgement.
    let aiAlerts: ReviewAlert[] = []
    let aiStatus = "ok"

    if (nothingToReview && Object.keys(safeSnapshot.narrative).length === 0) {
      aiStatus = "skipped_empty"
    } else {
      try {
        const result = await callLLM({
          useCase: "prescription_review",
          messages: [
            {
              role: "system",
              content:
                "You are a clinical pharmacology safety reviewer. You return strict JSON only. You raise an alert only when a real clinical problem exists.",
            },
            { role: "user", content: buildPrompt(safePatient, safeSnapshot, diff, ruleAlerts) },
          ],
          responseFormat: "json_object",
          maxTokens: 3000,
          reasoningEffort: "medium",
          timeoutMs: 45_000,
        })
        aiAlerts = parseAiAlerts(result.text)
        console.log(
          `[prescription-review] provider=${result.provider} model=${result.model} latency=${result.latencyMs}ms rules=${ruleAlerts.length} ai=${aiAlerts.length}`,
        )
      } catch (err: any) {
        aiStatus = `failed: ${err?.message || "unknown error"}`
        console.error("⚠️ prescription-review: AI layer failed:", err?.message || err)
      }
    }

    const alerts = sortAlerts(mergeAlerts(ruleAlerts, aiAlerts))

    const reviewId = await persistReview({
      consultationId,
      patientId,
      doctorId,
      consultationType,
      alerts,
      aiStatus,
      snapshot: safeSnapshot,
      diff,
    })

    return NextResponse.json({
      success: true,
      reviewId,
      alerts,
      blockingCount: countBlocking(alerts),
      // Surfaced so the dialog can tell the doctor the review is partial
      // rather than letting a silent model outage read as "all clear".
      aiStatus,
      degraded: aiStatus !== "ok" && aiStatus !== "skipped_empty",
    })
  } catch (error: any) {
    console.error("❌ prescription-review error:", error?.message || error)
    // The doctor must never be stuck behind a broken review.
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Review failed",
        alerts: [],
        blockingCount: 0,
        degraded: true,
      },
      { status: 200 },
    )
  }
}

/**
 * Record what the doctor did with the alerts. Called once, right after they
 * accept the review or override it with a justification. This is the audit
 * trail the clinic asked for: an override without a reason is not possible
 * from the UI, and the reason lands here.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const { reviewId, decision, justification = "", doctorId = null } = body || {}

    if (!reviewId) {
      return NextResponse.json({ success: false, error: "Missing reviewId" }, { status: 400 })
    }
    if (decision !== "accepted" && decision !== "overridden" && decision !== "corrected") {
      return NextResponse.json({ success: false, error: "Invalid decision" }, { status: 400 })
    }
    if (decision === "overridden" && s(justification).length < 10) {
      return NextResponse.json(
        { success: false, error: "A justification is required to override a clinical alert" },
        { status: 400 },
      )
    }
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Audit storage not configured" }, { status: 503 })
    }

    const { error } = await supabase
      .from("prescription_reviews")
      .update({
        decision,
        override_justification: s(justification) || null,
        decided_by: doctorId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", reviewId)

    if (error) {
      console.error("❌ prescription-review PATCH failed:", error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log(`✅ prescription-review decision recorded: ${reviewId} -> ${decision}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ prescription-review PATCH error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Unexpected error" }, { status: 500 })
  }
}
