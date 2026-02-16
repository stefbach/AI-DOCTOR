// app/api/reformat-medical-text/route.ts - Reformat medical text with OpenAI
import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { text, sectionType, currentContent } = await req.json()

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      )
    }

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

TRANSLATION EXAMPLES:
- "douleur thoracique" → "chest pain"
- "fièvre" → "fever"
- "tension artérielle" → "blood pressure"
- "antécédents" → "medical history"
- "Doliprane" → "Paracetamol/Acetaminophen"
- "ordonnance" → "prescription"

${currentContent ? `EXISTING CONTENT IN THIS SECTION:\n${currentContent}\n\nAppend the new information naturally, avoiding repetition.` : ''}

Return ONLY the formatted medical text as a paragraph IN ENGLISH, nothing else. No titles, no bullet points.`

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please format this voice-transcribed text for the ${sectionType} section:\n\n${text}` }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      reasoning_effort: "none" as any,
    })

    const formattedText = response.choices[0]?.message?.content?.trim() || text

    return NextResponse.json({
      success: true,
      formattedText,
      originalText: text
    })

  } catch (error: any) {
    console.error("Reformat API Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reformat text" },
      { status: 500 }
    )
  }
}
