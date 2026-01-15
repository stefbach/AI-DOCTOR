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

    const systemPrompt = `You are a medical documentation specialist. Your task is to format voice-transcribed medical text into professional, clear medical documentation.

SECTION TYPE: ${sectionType}

RULES:
1. Fix any transcription errors or unclear words based on medical context
2. Use proper medical terminology
3. Format as clear, professional medical documentation
4. Keep the clinical meaning intact
5. Use proper punctuation and capitalization
6. If the section already has content, append the new information appropriately
7. Be concise but complete
8. Use bullet points for lists when appropriate
9. Maintain a professional, objective tone

${currentContent ? `EXISTING CONTENT IN THIS SECTION:\n${currentContent}\n\nAppend the new information naturally, avoiding repetition.` : ''}

Return ONLY the formatted medical text, nothing else.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please format this voice-transcribed text for the ${sectionType} section:\n\n${text}` }
      ],
      max_tokens: 1000,
      temperature: 0.3,
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
