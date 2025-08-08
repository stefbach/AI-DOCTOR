// app/api/openai-questions/route.ts - API ROUTE CORRECTE
import { NextRequest, NextResponse } from "next/server"

// Questions prédéfinies de fallback
const FALLBACK_QUESTIONS = [
  {
    id: 1,
    question: "How long have you had these symptoms?",
    options: ["Less than 24h", "2-7 days", "1-4 weeks", "More than a month"],
    priority: "high"
  },
  {
    id: 2,
    question: "How are your symptoms evolving?",
    options: ["Getting worse", "Stable", "Improving", "Variable"],
    priority: "high"
  },
  {
    id: 3,
    question: "What triggers or worsens your symptoms?",
    options: ["Exertion/movement", "Stress", "Food", "Nothing specific"],
    priority: "medium"
  },
  {
    id: 4,
    question: "Do you have a fever?",
    options: ["Yes, measured >100.4°F", "Feel feverish", "No", "I don't know"],
    priority: "high"
  },
  {
    id: 5,
    question: "How concerned are you about your condition?",
    options: ["Very concerned", "Moderately", "Slightly concerned", "Not at all"],
    priority: "medium"
  }
]

// POST handler
export async function POST(request: NextRequest) {
  console.log("🚀 POST /api/openai-questions")
  
  try {
    // Parse request
    const body = await request.json()
    const { patientData, clinicalData, mode = 'balanced' } = body
    
    console.log("📝 Request received:", {
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      mode
    })
    
    // Validate data
    if (!patientData || !clinicalData) {
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS,
        metadata: {
          mode: "fallback",
          reason: "Missing required data"
        }
      })
    }
    
    // Get API key
    const apiKey = process.env.OPENAI_API_KEY
    
    // If no API key, use fallback
    if (!apiKey) {
      console.log("⚠️ No API key, using fallback questions")
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS,
        metadata: {
          mode: "fallback",
          reason: "API key not configured"
        }
      })
    }
    
    // Prepare prompt
    const symptoms = clinicalData.symptoms || clinicalData.chiefComplaint || ""
    const prompt = `Patient: ${patientData.age || "Unknown"} years old, ${patientData.gender || "Unknown"}.
Symptoms: ${symptoms}

Generate exactly 5 diagnostic questions in JSON format:
{
  "questions": [
    {
      "id": 1,
      "question": "Clear question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "high"
    }
  ]
}

IMPORTANT: Respond ONLY with valid JSON.`

    // Call OpenAI
    console.log("🤖 Calling OpenAI...")
    
    try {
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: mode === 'fast' ? "gpt-3.5-turbo" : "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a medical AI assistant. Generate diagnostic questions in JSON format."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: "json_object" }
        }),
      })
      
      if (!openaiResponse.ok) {
        console.error("❌ OpenAI error:", openaiResponse.status)
        throw new Error(`OpenAI error: ${openaiResponse.status}`)
      }
      
      const openaiData = await openaiResponse.json()
      const content = openaiData.choices?.[0]?.message?.content || "{}"
      
      let questions = []
      try {
        const parsed = JSON.parse(content)
        questions = parsed.questions || []
      } catch (parseError) {
        console.error("❌ Failed to parse OpenAI response")
        questions = FALLBACK_QUESTIONS
      }
      
      return NextResponse.json({
        success: true,
        questions: questions.length > 0 ? questions : FALLBACK_QUESTIONS,
        metadata: {
          mode,
          model: mode === 'fast' ? "gpt-3.5-turbo" : "gpt-4o-mini"
        }
      })
      
    } catch (error: any) {
      console.error("❌ OpenAI call failed:", error.message)
      
      // Return fallback on error
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS,
        metadata: {
          mode: "fallback",
          reason: error.message
        }
      })
    }
    
  } catch (error: any) {
    console.error("❌ Unexpected error:", error)
    
    // Always return fallback questions
    return NextResponse.json({
      success: true,
      questions: FALLBACK_QUESTIONS,
      metadata: {
        mode: "fallback",
        reason: "Unexpected error"
      }
    })
  }
}

// GET handler for testing
export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  
  return NextResponse.json({
    status: apiKey ? "✅ API configured" : "❌ API key missing",
    hasApiKey: !!apiKey,
    message: apiKey 
      ? "API is ready to generate questions" 
      : "Using fallback questions (no API key)",
    timestamp: new Date().toISOString()
  })
}
