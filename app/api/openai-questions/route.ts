// app/api/openai-questions/route.ts - VERSION VERCEL OPTIMISÉE
import { NextRequest, NextResponse } from "next/server"

// ⚠️ PAS D'EDGE RUNTIME - Important pour Vercel !
// NE PAS AJOUTER: export const runtime = 'edge'

// Configuration pour Vercel
export const maxDuration = 30 // Timeout de 30 secondes

// ==================== SIMPLE CACHE ====================
const cache = new Map<string, any>()

// ==================== FALLBACK QUESTIONS ====================
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

// ==================== MAIN POST HANDLER ====================
export async function POST(request: NextRequest) {
  console.log("🚀 POST /api/openai-questions - Start")
  
  try {
    // 1. Get and validate API key
    const apiKey = process.env.OPENAI_API_KEY
    
    // Debug log for Vercel
    console.log("🔑 API Key check:", {
      exists: !!apiKey,
      length: apiKey?.length || 0,
      prefix: apiKey?.substring(0, 10) || "MISSING",
      isVercel: !!process.env.VERCEL,
      environment: process.env.NODE_ENV
    })
    
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY is missing in environment variables")
      
      // Return fallback questions instead of error
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS,
        metadata: {
          mode: "fallback",
          reason: "API key not configured",
          message: "Using fallback questions - API key missing"
        }
      })
    }
    
    // 2. Parse request
    const body = await request.json()
    const { patientData, clinicalData, mode = 'balanced' } = body
    
    console.log("📝 Request received:", {
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      mode
    })
    
    // 3. Validate data
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
    
    // 4. Create cache key
    const symptoms = clinicalData.symptoms || clinicalData.chiefComplaint || ""
    const cacheKey = `${symptoms}_${patientData.age}_${mode}`
    
    // 5. Check cache
    if (cache.has(cacheKey)) {
      console.log("✅ Cache hit")
      return NextResponse.json(cache.get(cacheKey))
    }
    
    // 6. Prepare prompt (without personal data)
    const prompt = `Patient: ${patientData.age || "Unknown"} years old, ${patientData.gender || "Unknown"} gender.
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

    // 7. Call OpenAI
    console.log("🤖 Calling OpenAI API...")
    const startTime = Date.now()
    
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
      
      const responseTime = Date.now() - startTime
      console.log(`⏱️ OpenAI responded in ${responseTime}ms`)
      
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        console.error("❌ OpenAI error:", openaiResponse.status, errorText)
        
        // Return fallback on OpenAI error
        return NextResponse.json({
          success: true,
          questions: FALLBACK_QUESTIONS,
          metadata: {
            mode: "fallback",
            reason: `OpenAI error: ${openaiResponse.status}`,
            responseTime
          }
        })
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
      
      // 8. Prepare response
      const response = {
        success: true,
        questions: questions.length > 0 ? questions : FALLBACK_QUESTIONS,
        metadata: {
          mode,
          responseTime,
          fromCache: false,
          model: mode === 'fast' ? "gpt-3.5-turbo" : "gpt-4o-mini"
        }
      }
      
      // 9. Cache response
      cache.set(cacheKey, response)
      
      console.log("✅ Success - returning questions")
      return NextResponse.json(response)
      
    } catch (fetchError: any) {
      console.error("❌ Fetch error:", fetchError.message)
      
      // Return fallback on network error
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS,
        metadata: {
          mode: "fallback",
          reason: "Network error",
          error: fetchError.message
        }
      })
    }
    
  } catch (error: any) {
    console.error("❌ Unexpected error:", error)
    
    // Always return fallback questions on error
    return NextResponse.json({
      success: true,
      questions: FALLBACK_QUESTIONS,
      metadata: {
        mode: "fallback",
        reason: "Unexpected error",
        error: error.message
      }
    })
  }
}

// ==================== GET ENDPOINT FOR TESTING ====================
export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  const isVercel = !!process.env.VERCEL
  
  // Test response
  return NextResponse.json({
    status: apiKey ? "✅ API configured" : "❌ API key missing",
    environment: {
      isVercel,
      nodeEnv: process.env.NODE_ENV,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 10) || "NOT_SET"
    },
    message: apiKey 
      ? "API is ready to generate questions" 
      : "Please add OPENAI_API_KEY to Vercel Environment Variables",
    timestamp: new Date().toISOString()
  })
}
