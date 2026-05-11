// app/api/reformat-medical-text/route.ts
// Reformat voice-transcribed medical text (FR -> EN) using the unified LLM
// client so the provider (OpenAI / DeepSeek) is selectable per env var.
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callLLM } from "@/lib/llm-client"

export const maxDuration = 90

const RequestSchema = z.object({
  text: z.string().min(1, "No text provided"),
  sectionType: z.string().min(1).default("general"),
  currentContent: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      )
    }
    const { text, sectionType, currentContent } = parsed.data

    const systemPrompt = `You are a medical documentation specialist. Your task is to format voice-transcribed medical text into professional, clear medical documentation IN ENGLISH.

SECTION TYPE: ${sectionType}

RULES:
1. IMPORTANT: If the input text is in French (or any other language), TRANSLATE it to English first
2. Fix any transcription errors or unclear words based on medical context
3. Use proper medical terminology IN ENGLISH (use INN/generic drug names)
4. Format as clear, professional medical documentation
5. Keep the clinical meaning intact
6. Use proper punctuation and capitalization
7. If the section already has content, append the new information appropriately
8. Be concise but complete
9. Write in flowing prose/paragraph format - DO NOT use bullet points, lists, or dashes
10. Maintain a professional, objective tone
11. DO NOT include any section title or header - the title is already shown separately
12. Start directly with the content, no headings like "Chief Complaint:" or "**Title**"

ANTI-HALLUCINATION RULE (STRICT):
- NEVER invent clinical facts, diagnoses, drugs, doses or values that are not explicitly present in the input.
- If the source text is too unclear, partial or noisy to format reliably, return the input text unchanged with minimal cleanup (punctuation, capitalization). Do NOT fabricate content to fill gaps.

TRANSLATION EXAMPLES:
- "douleur thoracique" -> "chest pain"
- "fièvre" -> "fever"
- "tension artérielle" -> "blood pressure"
- "antécédents" -> "medical history"
- "Doliprane" -> "Paracetamol/Acetaminophen"
- "ordonnance" -> "prescription"

${currentContent ? `EXISTING CONTENT IN THIS SECTION:\n${currentContent}\n\nAppend the new information naturally, avoiding repetition.` : ''}

Return ONLY the formatted medical text as a paragraph IN ENGLISH, nothing else. No titles, no bullet points.`

    const result = await callLLM({
      useCase: 'REFORMAT',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please format this voice-transcribed text for the ${sectionType} section:\n\n${text}` },
      ],
      maxTokens: 1000,
      reasoningEffort: 'none',
      timeoutMs: 60_000,
    })

    const ResponseSchema = z.string().min(1)
    const cleaned = (result.text ?? '').trim()
    const validated = ResponseSchema.safeParse(cleaned)
    const formattedText = validated.success ? validated.data : text

    return NextResponse.json({
      success: true,
      formattedText,
      originalText: text,
      metadata: {
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        usage: result.usage,
        fallbackUsed: result.fallbackUsed,
        attempts: result.attempts,
      },
    })
  } catch (error: any) {
    console.error("Reformat API Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reformat text" },
      { status: 500 },
    )
  }
}
