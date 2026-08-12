import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Lightweight clinical triage: given the patient's presentation (Chief
// Complaint + Disease History + reported symptoms), decide which vital signs
// the doctor should verify in REAL TIME on camera. This is the "AI" layer of
// the hybrid Vital Signs disclaimer; the client merges the result with a
// deterministic heuristic and the AI can only ADD alerts, never remove them.
// On any failure we return all-false with success:false so the client keeps
// the heuristic result — the disclaimer is a safety feature and must never be
// suppressed by an AI error.

export const maxDuration = 15

const EMPTY = { temperature: false, bloodPressure: false, glucose: false }

export async function POST(request: NextRequest) {
  try {
    const { chiefComplaint = "", diseaseHistory = "", symptoms = [] } =
      await request.json()

    const presentation = [
      chiefComplaint,
      diseaseHistory,
      Array.isArray(symptoms) && symptoms.length ? `Symptoms: ${symptoms.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim()

    if (presentation.length < 4) {
      return NextResponse.json({ success: true, alerts: EMPTY })
    }

    const prompt = `You are a clinical triage assistant for a teleconsultation. Based ONLY on the patient's presentation below, decide which vital signs the doctor should verify in REAL TIME (ask the patient to measure live on camera) because the presentation suggests that vital could be abnormal or is clinically important to confirm.

Flag each of these three vitals independently:
- "temperature": suspicion of fever / infection / inflammatory process (e.g. fever, chills, sweats, sore throat, productive cough, urinary or abdominal infection, cellulitis...).
- "bloodPressure": suspicion of hypertension or a BP-relevant emergency (e.g. severe headache with visual symptoms, chest pain, palpitations, dizziness in a known hypertensive, epistaxis, stroke-like symptoms, known/poorly-controlled hypertension...).
- "glucose": suspicion of hyper- or hypoglycemia or diabetes relevance (e.g. known diabetic, excessive thirst, frequent urination, blurred vision, unexplained weight loss, confusion, polyphagia...).

Be conservative and specific: only flag a vital when the presentation genuinely warrants live verification. Do NOT flag on isolated non-specific complaints such as fatigue alone, a mild isolated headache, or generic malaise.

CRITICAL — respect negations: an explicitly denied or absent finding must NEVER raise its alert. For example "no fever", "afebrile", "denies chest pain", "pas de fièvre", "sans douleur thoracique" mean that finding is ABSENT, so do not flag the corresponding vital on that basis.

The presentation may be written in English, French or a mix.

Patient presentation:
"""
${presentation}
"""

Respond with ONLY a compact JSON object, no markdown, no commentary, exactly in this shape:
{"temperature": true|false, "bloodPressure": true|false, "glucose": true|false}`

    // NOTE: no `temperature` here — gpt-5.5 rejects the parameter outright
    // ("Unsupported parameter: 'temperature' is not supported with this
    // model"), which made every call to this route fail and silently fall
    // back to the heuristic-only path.
    const result = await generateText({
      model: openai("gpt-5.5", { reasoningEffort: "none" }),
      prompt,
    })

    let alerts = { ...EMPTY }
    try {
      const clean = (result.text || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()
      const parsed = JSON.parse(clean)
      alerts = {
        temperature: parsed.temperature === true,
        bloodPressure: parsed.bloodPressure === true,
        glucose: parsed.glucose === true,
      }
    } catch (parseErr) {
      console.error("⚠️ vital-signs-disclaimer: parse error:", parseErr, result.text)
      return NextResponse.json({ success: false, alerts: EMPTY })
    }

    return NextResponse.json({ success: true, alerts })
  } catch (error: any) {
    console.error("❌ vital-signs-disclaimer error:", error?.message || error)
    // Never block/suppress the heuristic on failure.
    return NextResponse.json({ success: false, alerts: EMPTY })
  }
}
