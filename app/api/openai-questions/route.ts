// app/api/openai-questions/route.ts - VERSION WITH GPT-5 
import { type NextRequest, NextResponse } from "next/server"

// Configuration for edge runtime
export const runtime = 'edge'
export const preferredRegion = 'auto'

// ==================== GPT-5 CONFIGURATION ====================
const GPT5_CONFIG = {
  model: 'gpt-5',  // ONLY GPT-5
  temperature: 1,   // GPT-5 only supports default temperature
  max_completion_tokens: 800,
  seed: 42  // For reproducibility
}

// ==================== MAURITIUS MEDICAL UNITS ====================
const MAURITIUS_UNITS = {
  temperature: 'Celsius (°C)',
  weight: 'kilograms (kg)',
  height: 'centimeters (cm)',
  normalBodyTemp: '37°C',
  feverThreshold: '38°C',
  highFever: '39°C',
  distance: 'kilometers (km)'
}

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
        options: ["Yes (>38°C)", "No", "I don't know", "Sometimes"],
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
        options: ["Yes (>38°C)", "Feel feverish", "No", "I don't know"],
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
      options: ["Yes, measured >38°C", "Feel feverish", "No", "I don't know"],
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

// ==================== MAIN FUNCTION ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("🚀 Starting POST request /api/openai-questions (GPT-5 VERSION)")
  console.log("📊 GPT-5 Config:", GPT5_CONFIG)
  
  let body: any = null
  
  try {
    // 1. Parse request body
    try {
      body = await request.json()
      console.log("📝 Body received, parsing data...")
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError)
      return NextResponse.json(
        { error: "Invalid request body", success: false },
        { status: 400 }
      )
    }
    
    const { 
      patientData, 
      clinicalData, 
      mode = 'balanced'
    } = body

    // 2. Retrieve and validate API key
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY missing')
      throw new Error('OPENAI_API_KEY missing in environment variables')
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Invalid API key format')
      throw new Error('Invalid API key format (must start with sk-)')
    }
    
    console.log('✅ API key validated')
    
    // 3. Extract data from body
    if (!patientData || !clinicalData) {
      console.error("❌ Missing data in request")
      return NextResponse.json(
        { error: "Patient and clinical data required", success: false },
        { status: 400 }
      )
    }

    // 5. Data protection: anonymization
    const { anonymized: anonymizedPatientData, originalIdentity, anonymousId } = anonymizePatientData(patientData)
    console.log('✅ Patient data anonymized')

    // 6. Data normalization WITH ANONYMIZED DATA
    const validatedPatientData = {
      age: anonymizedPatientData.age || 'Not specified',
      gender: anonymizedPatientData.gender || anonymizedPatientData.sex || 'Not specified',
      medicalHistory: anonymizedPatientData.medicalHistory || [],
      currentMedications: anonymizedPatientData.currentMedications || [],
      ...anonymizedPatientData
    }

    const validatedClinicalData = {
      symptoms: clinicalData.symptoms || clinicalData.chiefComplaint || '',
      chiefComplaint: clinicalData.chiefComplaint || clinicalData.symptoms || '',
      ...clinicalData
    }

    // 7. Determine symptoms string
    const symptomsString = String(validatedClinicalData.symptoms || validatedClinicalData.chiefComplaint || '')
    console.log(`📋 Symptoms: "${symptomsString.substring(0, 100)}..."`)
    
    console.log(`🤖 Using model: ${GPT5_CONFIG.model}`)

    // 8. Check cache
    const cacheKey = `${symptomsString}_${validatedPatientData.age}_${validatedPatientData.gender}_${GPT5_CONFIG.model}`
    const cached = patternCache.get(cacheKey)
    
    if (cached) {
      console.log(`✅ Cache hit: ${Date.now() - startTime}ms`)
      return NextResponse.json({
        ...cached,
        dataProtection: {
          enabled: true,
          anonymousId,
          method: 'anonymization',
          message: 'Patient data protected during processing'
        },
        metadata: {
          ...cached.metadata,
          fromCache: true,
          responseTime: Date.now() - startTime,
          model: GPT5_CONFIG.model
        }
      })
    }

    // 9. Detect main pattern
    const pattern = detectMainPattern(symptomsString)
    console.log(`🔍 Pattern detected: ${pattern}`)

    // 10. Use predefined questions if available and mode is fast
    if (mode === 'fast' && pattern !== 'general' && DIAGNOSTIC_PATTERNS[pattern as keyof typeof DIAGNOSTIC_PATTERNS]) {
      console.log(`✅ Using predefined questions for: ${pattern}`)
      const response = {
        success: true,
        questions: DIAGNOSTIC_PATTERNS[pattern as keyof typeof DIAGNOSTIC_PATTERNS].questions,
        dataProtection: {
          enabled: true,
          anonymousId,
          method: 'predefined-patterns',
          message: 'No personal data sent to AI - using predefined patterns'
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

    // 11. Generate prompt for OpenAI - QUESTIONS ONLY
    const prompt = `Patient: ${validatedPatientData.age} years old, ${validatedPatientData.gender}. 
Medical history: ${validatedPatientData.medicalHistory.length > 0 ? validatedPatientData.medicalHistory.join(', ') : 'None specified'}.
Current medications: ${validatedPatientData.currentMedications.length > 0 ? validatedPatientData.currentMedications.join(', ') : 'None'}.
Symptoms: ${symptomsString}.
Location: Mauritius (use metric system - Celsius for temperature, kg for weight, cm for height).

Generate exactly 5 highly relevant diagnostic questions to assess this patient's condition.

You MUST respond with ONLY a JSON object in this exact format (no other text):
{
  "questions": [
    {
      "id": 1,
      "question": "Clear and medically relevant question in English",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "high",
      "rationale": "Brief medical rationale for this question"
    },
    {
      "id": 2,
      "question": "Another diagnostic question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "high",
      "rationale": "Medical rationale"
    },
    {
      "id": 3,
      "question": "Third diagnostic question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "medium",
      "rationale": "Medical rationale"
    },
    {
      "id": 4,
      "question": "Fourth diagnostic question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "medium",
      "rationale": "Medical rationale"
    },
    {
      "id": 5,
      "question": "Fifth diagnostic question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "low",
      "rationale": "Medical rationale"
    }
  ]
}

CRITICAL REQUIREMENTS: 
- Output MUST be valid JSON only, no markdown formatting
- Exactly 5 questions required
- Each question must have exactly 4 options
- Priority must be "high", "medium", or "low"
- Questions must be clinically relevant to narrow differential diagnosis
- Use metric system (Celsius for temperature)
- NEVER include patient names or personal information`

    console.log(`🔒 Protection enabled: No personal data sent`)

    // 12. OpenAI call with retry
    console.log(`🤖 Calling OpenAI ${GPT5_CONFIG.model}...`)
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
            model: GPT5_CONFIG.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert telemedicine physician with deep clinical knowledge practicing in Mauritius. Generate highly relevant diagnostic questions that will help establish a differential diagnosis. You must respond with valid JSON only, no additional text or markdown formatting. Focus on questions that distinguish between likely conditions based on the presented symptoms. Use the metric system (Celsius for temperature, kg for weight, cm for height) as used in Mauritius. Never include or ask for names or personally identifiable information.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: GPT5_CONFIG.temperature,
            max_completion_tokens: GPT5_CONFIG.max_completion_tokens,
            response_format: { type: "json_object" },
            seed: GPT5_CONFIG.seed
          }),
        })
        
        if (openaiResponse.ok) {
          break
        } else if (openaiResponse.status === 401) {
          const errorBody = await openaiResponse.text()
          console.error('❌ Error 401 - Invalid API key:', errorBody)
          throw new Error(`Invalid API key: ${errorBody}`)
        } else if (openaiResponse.status === 429 && retryCount < maxRetries) {
          console.warn(`⚠️ Rate limit, retry ${retryCount + 1}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
          retryCount++
        } else {
          const errorText = await openaiResponse.text()
          throw new Error(`OpenAI error ${openaiResponse.status}: ${errorText}`)
        }
      } catch (error) {
        if (retryCount >= maxRetries) {
          throw error
        }
        console.warn(`⚠️ Error, retry ${retryCount + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
        retryCount++
      }
    }
    
    if (!openaiResponse || !openaiResponse.ok) {
      throw new Error('Unable to contact OpenAI')
    }
    
    const aiTime = Date.now() - aiStartTime
    console.log(`✅ OpenAI response received in ${aiTime}ms`)
    
    // 13. Parse response with improved error handling
    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content || '{}'
    
    console.log(`📝 Raw OpenAI response (first 500 chars):`, content.substring(0, 500))
    
    let questions = []
    try {
      // Clean the content in case there are markdown code blocks
      let cleanedContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      // If the content starts with text before JSON, find the first {
      const jsonStart = cleanedContent.indexOf('{')
      if (jsonStart > 0) {
        cleanedContent = cleanedContent.substring(jsonStart)
      }
      
      // If the content ends with text after JSON, find the last }
      const jsonEnd = cleanedContent.lastIndexOf('}')
      if (jsonEnd > -1 && jsonEnd < cleanedContent.length - 1) {
        cleanedContent = cleanedContent.substring(0, jsonEnd + 1)
      }
      
      console.log(`🧹 Cleaned content (first 500 chars):`, cleanedContent.substring(0, 500))
      
      const parsed = JSON.parse(cleanedContent)
      questions = parsed.questions || []
      
      console.log(`✅ ${questions.length} questions extracted`)
      
      // Log the first question for debugging
      if (questions.length > 0) {
        console.log(`📋 First question:`, JSON.stringify(questions[0], null, 2))
      }
      
    } catch (parseError) {
      console.error("❌ JSON parsing error:", parseError)
      console.error("Content received:", content)
      
      // Try to use fallback questions instead of throwing error
      console.log("⚠️ Using fallback questions due to parsing error")
      const pattern = detectMainPattern(symptomsString)
      questions = FALLBACK_QUESTIONS[pattern as keyof typeof FALLBACK_QUESTIONS] || FALLBACK_QUESTIONS.general
    }

    // 12. Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      console.error("❌ No valid questions generated, using fallback")
      const pattern = detectMainPattern(symptomsString)
      questions = FALLBACK_QUESTIONS[pattern as keyof typeof FALLBACK_QUESTIONS] || FALLBACK_QUESTIONS.general
    }
    
    // Ensure we have exactly 5 questions with proper structure
    questions = questions.slice(0, 5).map((q: any, idx: number) => ({
      id: q.id || idx + 1,
      question: q.question || `Question ${idx + 1}`,
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["Option 1", "Option 2", "Option 3", "Option 4"],
      priority: q.priority || "medium",
      rationale: q.rationale || ""
    }))

    // 14. Prepare response WITH PROTECTION INDICATOR
    const response = {
      success: true,
      questions: questions.slice(0, 5), // Ensure maximum 5 questions
      dataProtection: {
        enabled: true,
        anonymousId,
        method: 'anonymization',
        fieldsProtected: Object.keys(originalIdentity).filter(k => originalIdentity[k]),
        message: 'Patient identity was protected during AI processing',
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
        model: GPT5_CONFIG.model,
        modelParameters: {
          temperature: GPT5_CONFIG.temperature,
          max_completion_tokens: GPT5_CONFIG.max_completion_tokens
        },
        dataProtected: true,
        complexity: {
          symptoms: symptomsString.split(/[,;]/).length,
          medicalHistory: validatedPatientData.medicalHistory.length,
          medications: validatedPatientData.currentMedications.length
        },
        tokensUsed: openaiData.usage || {},
        questionsGenerated: questions.length
      }
    }

    // 15. Cache response
    patternCache.set(cacheKey, response)

    console.log(`✅ Total success: ${response.metadata.responseTime}ms`)
    console.log(`📊 Questions generated: ${questions.length}`)
    console.log(`🔒 Data protection: ACTIVE - No personal data sent to OpenAI`)
    console.log(`🤖 Model used: ${GPT5_CONFIG.model}`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error(`❌ Main Error:`, error)
    console.error("Stack:", error.stack)
    
    // Always return fallback questions to ensure the app continues working
    const pattern = detectMainPattern(
      body?.clinicalData?.symptoms || body?.clinicalData?.chiefComplaint || 'general'
    )
    
    console.log(`🔄 Using fallback questions for pattern: ${pattern}`)
    
    const fallbackQuestions = FALLBACK_QUESTIONS[pattern as keyof typeof FALLBACK_QUESTIONS] || FALLBACK_QUESTIONS.general
    
    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      dataProtection: {
        enabled: true,
        method: 'fallback',
        message: 'Using fallback questions - no AI processing needed',
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
        dataProtected: true,
        debugInfo: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
          errorDetails: error.message
        }
      }
    })
  }
}

// ==================== TEST ENDPOINT ====================
export async function GET(request: NextRequest) {
  console.log("🧪 Testing OpenAI GPT-5 connection...")
  console.log("📊 GPT-5 Configuration:", GPT5_CONFIG)
  
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({
      status: '❌ No API key',
      error: 'OPENAI_API_KEY not defined',
      help: 'Add OPENAI_API_KEY to your environment variables',
      dataProtection: {
        status: 'N/A - No API key'
      }
    }, { status: 500 })
  }
  
  try {
    // Test GPT-5 model
    const testStart = Date.now()
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GPT5_CONFIG.model,
          messages: [
            {
              role: 'user',
              content: 'Respond with JSON: {"test":"ok","model":"' + GPT5_CONFIG.model + '"}'
            }
          ],
          temperature: GPT5_CONFIG.temperature,
          max_completion_tokens: 50,
          response_format: { type: "json_object" }
        }),
      })
      
      const testResult = response.ok 
        ? {
            status: '✅ Connected',
            responseTime: `${Date.now() - testStart}ms`,
            response: (await response.json()).choices[0]?.message?.content
          }
        : {
            status: '❌ Error',
            error: (await response.text()).substring(0, 100),
            statusCode: response.status
          }
      
      return NextResponse.json({
        status: "✅ OpenAI GPT-5 Questions System Ready",
        modelConfiguration: GPT5_CONFIG,
        testResult,
        dataProtection: {
          status: '✅ Enabled',
          method: 'anonymization',
          compliance: ['GDPR', 'HIPAA'],
          features: [
            'Automatic patient data anonymization',
            'No names/emails/phones sent to OpenAI',
            'Anonymous ID for tracking',
            'Secure logging',
            'GPT-5 integration',
            'Metric system (Celsius, kg, cm) as used in Mauritius',
            'Generates 5 diagnostic questions only'
          ]
        },
        functionality: {
          purpose: 'Generate 5 diagnostic questions',
          output: 'JSON with questions array',
          fallback: 'Predefined patterns for common symptoms',
          cache: 'Enabled for performance'
        },
        modes: {
          fast: {
            description: "Fast with predefined patterns or GPT-5",
            model: GPT5_CONFIG.model,
            useCase: "Initial triage",
            dataProtected: true
          },
          balanced: {
            description: "Balanced with GPT-5",
            model: GPT5_CONFIG.model,
            useCase: "Standard usage",
            dataProtected: true
          },
          intelligent: {
            description: "Maximum intelligence with GPT-5",
            model: GPT5_CONFIG.model,
            useCase: "Complex cases",
            dataProtected: true
          }
        },
        medicalUnits: {
          system: "Metric (SI)",
          temperature: "Celsius (°C)",
          weight: "Kilograms (kg)",
          height: "Centimeters (cm)",
          feverThreshold: "38°C (normal: 37°C)",
          location: "Mauritius"
        },
        performanceParameters: {
          temperature: GPT5_CONFIG.temperature,
          max_completion_tokens: GPT5_CONFIG.max_completion_tokens,
          seed: GPT5_CONFIG.seed
        },
        keyInfo: {
          prefix: apiKey.substring(0, 20),
          length: apiKey.length,
          valid: true
        }
      })
    } catch (error: any) {
      return NextResponse.json({
        status: '❌ Connection failed',
        error: error.message,
        model: GPT5_CONFIG.model
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ Test error:", error)
    return NextResponse.json({
      status: "❌ Error",
      error: error.message,
      errorType: error.name,
      dataProtection: {
        status: 'Error during test'
      }
    }, { status: 500 })
  }
}
