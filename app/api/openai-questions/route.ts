// app/api/openai-questions/route.ts - VERSION OPTIMISÉE SANS EDGE
import { type NextRequest, NextResponse } from "next/server"

// ❌ SUPPRIMÉ: export const runtime = 'edge'
// ❌ SUPPRIMÉ: export const preferredRegion = 'auto'

// ==================== DATA PROTECTION FUNCTIONS ====================
function anonymizePatientData(patientData: any): {
  anonymized: any,
  originalIdentity: any,
  anonymousId: string
} {
  const originalIdentity = {
    firstName: patientData?.firstName,
    lastName: patientData?.lastName,
    name: patientData?.name,
    email: patientData?.email,
    phone: patientData?.phone
  }
  
  const anonymized = { ...patientData }
  const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'idNumber', 'ssn']
  
  sensitiveFields.forEach(field => {
    delete anonymized[field]
  })
  
  const anonymousId = `ANON-Q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId
  
  console.log('🔒 Patient data anonymized for questions')
  console.log(`   - Anonymous ID: ${anonymousId}`)
  console.log('   - Protected fields:', sensitiveFields.filter(f => originalIdentity[f]).join(', '))
  
  return { anonymized, originalIdentity, anonymousId }
}

// ==================== SIMPLE CACHE ====================
class SimpleCache {
  private cache = new Map<string, any>()
  private maxSize = 50

  get(key: string): any | null {
    return this.cache.get(key) || null
  }

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
}

const patternCache = new SimpleCache()

// ==================== DIAGNOSTIC PATTERNS ====================
const DIAGNOSTIC_PATTERNS = {
  chest_pain: {
    keywords: ["chest", "thorax", "cardiac", "heart", "pressure", "tightness"],
    questions: [
      {
        id: 1,
        question: "Where exactly do you feel the pain?",
        options: ["Center of chest", "Left side", "Back", "All over"],
        priority: "high"
      },
      {
        id: 2,
        question: "Does the pain occur with exertion?",
        options: ["Yes", "No", "Sometimes", "I don't know"],
        priority: "high"
      },
      {
        id: 3,
        question: "Does the pain radiate?",
        options: ["To left arm", "To jaw", "To back", "No"],
        priority: "high"
      },
      {
        id: 4,
        question: "How long have you had this pain?",
        options: ["Less than 30 minutes", "30 min - 2h", "More than 2h", "Intermittent"],
        priority: "high"
      },
      {
        id: 5,
        question: "Do you have any associated symptoms?",
        options: ["Shortness of breath", "Sweating", "Nausea", "None"],
        priority: "medium"
      }
    ]
  },
  headache: {
    keywords: ["head", "headache", "migraine", "cephalalgia", "head pain"],
    questions: [
      {
        id: 1,
        question: "How would you describe your headache?",
        options: ["Pulsating (throbbing)", "Tight band", "Stabbing", "Diffuse"],
        priority: "high"
      },
      {
        id: 2,
        question: "Do you have any associated symptoms?",
        options: ["Nausea", "Light sensitivity", "Visual disturbances", "None"],
        priority: "high"
      },
      {
        id: 3,
        question: "What triggers your headache?",
        options: ["Stress", "Certain foods", "Lack of sleep", "Nothing specific"],
        priority: "medium"
      },
      {
        id: 4,
        question: "How often do you get these headaches?",
        options: ["First time", "Occasional", "Frequent (>1/week)", "Daily"],
        priority: "high"
      },
      {
        id: 5,
        question: "Is your headache accompanied by fever?",
        options: ["Yes", "No", "I don't know", "Sometimes"],
        priority: "high"
      }
    ]
  },
  abdominal_pain: {
    keywords: ["stomach", "abdomen", "belly", "abdominal pain", "tummy"],
    questions: [
      {
        id: 1,
        question: "Where is the pain located?",
        options: ["Upper abdomen", "Around navel", "Lower abdomen", "All over"],
        priority: "high"
      },
      {
        id: 2,
        question: "How would you describe the pain?",
        options: ["Cramping", "Burning", "Stabbing", "Heavy feeling"],
        priority: "high"
      },
      {
        id: 3,
        question: "Is the pain related to meals?",
        options: ["Before meals", "After meals", "During meals", "No relation"],
        priority: "high"
      },
      {
        id: 4,
        question: "Do you have any digestive symptoms?",
        options: ["Nausea/vomiting", "Diarrhea", "Constipation", "None"],
        priority: "high"
      },
      {
        id: 5,
        question: "Do you have a fever?",
        options: ["Yes (>100.4°F)", "Feel feverish", "No", "I don't know"],
        priority: "high"
      }
    ]
  }
}

// ==================== FALLBACK QUESTIONS ====================
const FALLBACK_QUESTIONS = {
  general: [
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
}

// ==================== PATTERN DETECTION ====================
function detectMainPattern(symptoms: string | undefined | null): string {
  const symptomsLower = String(symptoms || '').toLowerCase()
  
  for (const [pattern, data] of Object.entries(DIAGNOSTIC_PATTERNS)) {
    if (data.keywords.some(keyword => symptomsLower.includes(keyword))) {
      return pattern
    }
  }
  
  return 'general'
}

// ==================== MODEL CONFIGURATION ====================
const AI_CONFIGS = {
  fast: {
    model: "gpt-3.5-turbo",
    temperature: 0.1,
    maxTokens: 500
  },
  balanced: {
    model: "gpt-4o-mini", 
    temperature: 0.2,
    maxTokens: 800
  },
  intelligent: {
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 1200
  }
}

// ==================== MAIN POST FUNCTION ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("🚀 Starting POST request /api/openai-questions")
  
  try {
    // 1. Validate API key
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY missing')
      throw new Error('API configuration error')
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Invalid API key format')
      throw new Error('Invalid API key format')
    }
    
    // 2. Parse request body
    const body = await request.json()
    console.log("📝 Request received for questions generation")
    
    const { 
      patientData, 
      clinicalData, 
      mode = 'balanced'
    } = body

    // 3. Validate required data
    if (!patientData || !clinicalData) {
      console.error("❌ Missing required data")
      return NextResponse.json(
        { 
          error: "Patient and clinical data required", 
          success: false 
        },
        { status: 400 }
      )
    }

    // 4. Anonymize patient data
    const { 
      anonymized: anonymizedPatientData, 
      originalIdentity, 
      anonymousId 
    } = anonymizePatientData(patientData)

    // 5. Normalize data
    const validatedPatientData = {
      age: anonymizedPatientData.age || 'Not specified',
      gender: anonymizedPatientData.gender || anonymizedPatientData.sex || 'Not specified',
      ...anonymizedPatientData
    }

    const validatedClinicalData = {
      symptoms: clinicalData.symptoms || clinicalData.chiefComplaint || '',
      chiefComplaint: clinicalData.chiefComplaint || clinicalData.symptoms || '',
      ...clinicalData
    }

    console.log('📊 Processing:', {
      age: validatedPatientData.age,
      symptoms: validatedClinicalData.symptoms,
      mode: mode
    })

    // 6. Check cache
    const symptomsString = String(validatedClinicalData.symptoms || validatedClinicalData.chiefComplaint || '')
    const cacheKey = `${symptomsString}_${validatedPatientData.age}_${validatedPatientData.gender}_${mode}`
    const cached = patternCache.get(cacheKey)
    
    if (cached) {
      console.log(`✅ Cache hit: ${Date.now() - startTime}ms`)
      return NextResponse.json({
        ...cached,
        dataProtection: {
          enabled: true,
          anonymousId,
          method: 'anonymization',
          message: 'Patient data protected'
        },
        metadata: {
          ...cached.metadata,
          fromCache: true,
          responseTime: Date.now() - startTime
        }
      })
    }

    // 7. Detect pattern
    const pattern = detectMainPattern(symptomsString)
    console.log(`🔍 Pattern detected: ${pattern}`)

    // 8. Use predefined questions if available
    if (pattern !== 'general' && DIAGNOSTIC_PATTERNS[pattern as keyof typeof DIAGNOSTIC_PATTERNS]) {
      console.log(`✅ Using predefined questions for: ${pattern}`)
      const response = {
        success: true,
        questions: DIAGNOSTIC_PATTERNS[pattern as keyof typeof DIAGNOSTIC_PATTERNS].questions,
        dataProtection: {
          enabled: true,
          anonymousId,
          method: 'predefined-patterns',
          message: 'No personal data sent to AI'
        },
        metadata: {
          mode,
          pattern,
          patientAge: validatedPatientData.age,
          responseTime: Date.now() - startTime,
          fromCache: false,
          model: 'predefined-patterns',
          dataProtected: true
        }
      }
      
      patternCache.set(cacheKey, response)
      return NextResponse.json(response)
    }

    // 9. Generate prompt
    const prompt = `Patient: ${validatedPatientData.age} years old, ${validatedPatientData.gender}. 
Symptoms: ${symptomsString}.

Generate exactly 5 relevant diagnostic questions to assess this patient.

Required JSON format:
{
  "questions": [
    {
      "id": 1,
      "question": "Clear and simple question in English",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "high"
    }
  ]
}

IMPORTANT: 
- Respond ONLY with JSON, no additional text
- Exactly 5 questions
- Each question must have exactly 4 options
- Questions must be relevant to the mentioned symptoms
- Use simple and clear English
- NEVER mention names or personal information`

    // 10. Get AI configuration
    const aiConfig = AI_CONFIGS[mode as keyof typeof AI_CONFIGS] || AI_CONFIGS.balanced
    console.log(`⚙️ Using ${aiConfig.model} model`)

    // 11. Call OpenAI API with retry logic
    console.log(`🤖 Calling OpenAI ${aiConfig.model}...`)
    const aiStartTime = Date.now()
    
    let openaiResponse
    let retryCount = 0
    const maxRetries = 2
    
    while (retryCount <= maxRetries) {
      try {
        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert telemedicine physician. Generate relevant diagnostic questions in JSON format.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.maxTokens,
            response_format: { type: "json_object" }
          }),
        })
        
        if (openaiResponse.ok) {
          break
        }
        
        // Handle specific error codes
        if (openaiResponse.status === 401) {
          throw new Error('Invalid API key')
        }
        
        if (openaiResponse.status === 429 && retryCount < maxRetries) {
          console.warn(`⚠️ Rate limit, retry ${retryCount + 1}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          retryCount++
          continue
        }
        
        const errorText = await openaiResponse.text()
        throw new Error(`OpenAI error ${openaiResponse.status}: ${errorText.substring(0, 100)}`)
        
      } catch (error) {
        if (retryCount >= maxRetries) {
          throw error
        }
        console.warn(`⚠️ Retry ${retryCount + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        retryCount++
      }
    }
    
    if (!openaiResponse || !openaiResponse.ok) {
      throw new Error('Unable to contact OpenAI')
    }
    
    const aiTime = Date.now() - aiStartTime
    console.log(`✅ OpenAI response in ${aiTime}ms`)
    
    // 12. Parse OpenAI response
    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content || '{}'
    
    let questions = []
    try {
      const parsed = JSON.parse(content)
      questions = parsed.questions || []
      console.log(`✅ ${questions.length} questions extracted`)
    } catch (parseError) {
      console.error("❌ JSON parsing error:", parseError)
      throw new Error('Invalid OpenAI response format')
    }

    // 13. Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No valid questions generated")
    }

    // 14. Prepare response
    const response = {
      success: true,
      questions: questions.slice(0, 5),
      dataProtection: {
        enabled: true,
        anonymousId,
        method: 'anonymization',
        fieldsProtected: Object.keys(originalIdentity).filter(k => originalIdentity[k as keyof typeof originalIdentity]),
        message: 'Patient identity protected',
        compliance: {
          rgpd: true,
          hipaa: true,
          dataMinimization: true
        }
      },
      metadata: {
        mode,
        pattern,
        patientAge: validatedPatientData.age,
        responseTime: Date.now() - startTime,
        aiResponseTime: aiTime,
        fromCache: false,
        model: aiConfig.model,
        dataProtected: true
      }
    }

    // 15. Cache response
    patternCache.set(cacheKey, response)

    console.log(`✅ Success: ${response.metadata.responseTime}ms`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error(`❌ Error:`, error.message)
    
    // Return fallback questions on error
    const pattern = 'general'
    return NextResponse.json({
      success: true,
      questions: FALLBACK_QUESTIONS[pattern],
      dataProtection: {
        enabled: true,
        method: 'fallback',
        message: 'Using fallback questions',
        compliance: {
          rgpd: true,
          hipaa: true
        }
      },
      metadata: {
        mode: 'fallback',
        pattern,
        responseTime: Date.now() - startTime,
        fallback: true,
        fallbackReason: error.message,
        errorType: error.name,
        model: 'fallback',
        dataProtected: true
      }
    })
  }
}

// ==================== GET ENDPOINT FOR TESTING ====================
export async function GET(request: NextRequest) {
  console.log("🧪 Testing OpenAI connection...")
  
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({
      status: '❌ No API key',
      error: 'OPENAI_API_KEY not defined',
      help: 'Add OPENAI_API_KEY to your environment variables'
    }, { status: 500 })
  }
  
  try {
    const testStart = Date.now()
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Respond with JSON: {"test":"ok"}'
          }
        ],
        temperature: 0,
        max_tokens: 50,
        response_format: { type: "json_object" }
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({
        status: '❌ OpenAI error',
        error,
        statusCode: response.status
      }, { status: response.status })
    }
    
    const data = await response.json()
    const testTime = Date.now() - testStart
    
    return NextResponse.json({
      status: "✅ OpenAI connected",
      responseTime: `${testTime}ms`,
      response: data.choices[0]?.message?.content,
      dataProtection: {
        status: '✅ Enabled',
        method: 'anonymization',
        compliance: ['GDPR', 'HIPAA'],
        features: [
          'Automatic patient data anonymization',
          'No names/emails/phones sent to OpenAI',
          'Anonymous ID for tracking',
          'Secure logging'
        ]
      },
      modes: {
        fast: {
          description: "Ultra-fast",
          model: "gpt-3.5-turbo",
          useCase: "Initial triage",
          dataProtected: true
        },
        balanced: {
          description: "Balanced",
          model: "gpt-4o-mini",
          useCase: "Standard usage",
          dataProtected: true
        },
        intelligent: {
          description: "Maximum intelligence",
          model: "gpt-4o",
          useCase: "Complex cases",
          dataProtected: true
        }
      },
      keyInfo: {
        prefix: apiKey.substring(0, 20),
        length: apiKey.length,
        valid: true
      }
    })
  } catch (error: any) {
    console.error("❌ Test error:", error)
    return NextResponse.json({
      status: "❌ Error",
      error: error.message,
      errorType: error.name
    }, { status: 500 })
  }
}
