// app/api/chronic-questions/route.ts - VERSION 2.0: Professional-grade quality
// Questions à choix multiples pour maladies chroniques (format identique à /api/openai-questions)
// - 4 retry attempts with progressive enhancement
// - Auto-correction on final attempt
// - 8000 max tokens for comprehensive questions
// - Advanced OpenAI parameters
import { type NextRequest, NextResponse } from "next/server"

// ==================== CONFIGURATION ====================
export const runtime = 'nodejs'

// ==================== INTERFACES & TYPES ====================
interface PatientData {
  firstName?: string
  lastName?: string
  age: string | number
  gender: string
  weight?: string | number
  height?: string | number
  allergies?: string[]
  medicalHistory?: string[]
  currentMedicationsText?: string
  lifeHabits?: {
    smoking?: string
    alcohol?: string
    physicalActivity?: string
  }
}

interface ClinicalData {
  chiefComplaint: string
  symptomDuration?: string
  bloodPressureSystolic?: string | number
  bloodPressureDiastolic?: string | number
  bloodGlucose?: string | number
  heartRate?: string | number
  temperature?: string | number
  weight?: string | number
  height?: string | number
  bmi?: number
  lastHbA1c?: string
  lastFollowUpDate?: string
  medicationAdherence?: string
  visionChanges?: boolean
  footProblems?: boolean
  chestPain?: boolean
  dietCompliance?: string
  exerciseFrequency?: string
}

interface DiagnosticQuestion {
  id: number
  question: string
  options: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  rationale?: string
  category: 'diabetes_control' | 'hypertension_control' | 'obesity_management' | 'complications' | 'medications' | 'lifestyle'
  clinicalRelevance?: string
}

interface ProcessedPatientData {
  age: number
  gender: string
  bmi?: number
  chronicDiseases: {
    diabetes: boolean
    hypertension: boolean
    obesity: boolean
  }
  currentMedications: string[]
}

interface ProcessedClinicalData {
  chiefComplaint: string
  bloodPressure?: string
  bpStatus?: 'hypotension' | 'normal' | 'pre-hypertension' | 'hypertension' | 'crisis'
  bloodGlucose?: number
  bgStatus?: 'severe-hypo' | 'hypo' | 'normal' | 'moderate-hyper' | 'severe-hyper'
  bmi?: number
  bmiCategory?: 'underweight' | 'normal' | 'overweight' | 'obese'
  lastHbA1c?: number
  medicationAdherence?: 'excellent' | 'good' | 'fair' | 'poor'
  hasComplications: boolean
}

// ==================== UTILITY FUNCTIONS ====================
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function processPatientData(patient: PatientData): ProcessedPatientData {
  const age = typeof patient.age === 'string' ? parseInt(patient.age) || 0 : patient.age || 0
  const weight = typeof patient.weight === 'string' ? parseFloat(patient.weight) || 0 : patient.weight || 0
  const height = typeof patient.height === 'string' ? parseFloat(patient.height) || 0 : patient.height || 0
  
  let bmi: number | undefined
  if (weight > 0 && height > 0) {
    const heightInMeters = height / 100
    bmi = weight / (heightInMeters * heightInMeters)
  }
  
  // Detect chronic diseases
  const medicalHistory = Array.isArray(patient.medicalHistory) ? patient.medicalHistory : []
  const historyText = medicalHistory.join(' ').toLowerCase()
  
  const chronicDiseases = {
    diabetes: historyText.includes('diabetes') || historyText.includes('diabete') || historyText.includes('diabète'),
    hypertension: historyText.includes('hypertension') || historyText.includes('hta') || historyText.includes('tension'),
    obesity: historyText.includes('obesity') || historyText.includes('obesite') || historyText.includes('obésité') || (bmi !== undefined && bmi >= 30)
  }
  
  // Parse medications
  const medicationsText = patient.currentMedicationsText || ''
  const currentMedications = medicationsText 
    ? medicationsText.split(/[,\n]/).map(m => m.trim()).filter(Boolean)
    : []
  
  return {
    age,
    gender: patient.gender || 'Unknown',
    bmi,
    chronicDiseases,
    currentMedications
  }
}

function processClinicalData(clinical: ClinicalData): ProcessedClinicalData {
  const result: ProcessedClinicalData = {
    chiefComplaint: clinical.chiefComplaint || 'Chronic disease follow-up',
    hasComplications: !!(clinical.visionChanges || clinical.footProblems || clinical.chestPain)
  }
  
  // Blood pressure analysis
  if (clinical.bloodPressureSystolic && clinical.bloodPressureDiastolic) {
    const sys = typeof clinical.bloodPressureSystolic === 'string' 
      ? parseInt(clinical.bloodPressureSystolic) 
      : clinical.bloodPressureSystolic
    const dia = typeof clinical.bloodPressureDiastolic === 'string' 
      ? parseInt(clinical.bloodPressureDiastolic) 
      : clinical.bloodPressureDiastolic
    
    if (!isNaN(sys) && !isNaN(dia)) {
      result.bloodPressure = `${sys}/${dia}`
      
      if (sys < 90 || dia < 60) result.bpStatus = 'hypotension'
      else if (sys < 120 && dia < 80) result.bpStatus = 'normal'
      else if (sys < 140 && dia < 90) result.bpStatus = 'pre-hypertension'
      else if (sys < 180 && dia < 120) result.bpStatus = 'hypertension'
      else result.bpStatus = 'crisis'
    }
  }
  
  // Blood glucose analysis (in g/L)
  if (clinical.bloodGlucose) {
    const bg = typeof clinical.bloodGlucose === 'string' 
      ? parseFloat(clinical.bloodGlucose) 
      : clinical.bloodGlucose
    
    if (!isNaN(bg) && bg > 0) {
      result.bloodGlucose = bg
      
      if (bg < 0.7) result.bgStatus = 'severe-hypo'
      else if (bg < 1.0) result.bgStatus = 'hypo'
      else if (bg <= 1.26) result.bgStatus = 'normal'
      else if (bg < 2.0) result.bgStatus = 'moderate-hyper'
      else result.bgStatus = 'severe-hyper'
    }
  }
  
  // BMI analysis
  if (clinical.bmi) {
    result.bmi = clinical.bmi
    if (clinical.bmi < 18.5) result.bmiCategory = 'underweight'
    else if (clinical.bmi < 25) result.bmiCategory = 'normal'
    else if (clinical.bmi < 30) result.bmiCategory = 'overweight'
    else result.bmiCategory = 'obese'
  }
  
  // HbA1c analysis
  if (clinical.lastHbA1c) {
    const hba1c = parseFloat(clinical.lastHbA1c)
    if (!isNaN(hba1c)) {
      result.lastHbA1c = hba1c
    }
  }
  
  // Medication adherence
  result.medicationAdherence = clinical.medicationAdherence as any || 'unknown'
  
  return result
}

// ==================== RETRY MECHANISM ====================
async function callOpenAIWithRetry(
  apiKey: string,
  prompt: string,
  systemMessage: string,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 OpenAI call attempt ${attempt + 1}/${maxRetries + 1}`)
      
      // Progressive enhancement of system message
      let enhancedSystemMessage = systemMessage
      
      if (attempt === 1) {
        enhancedSystemMessage = `🚨 ATTEMPT 2/4 - ENHANCED QUALITY REQUIREMENTS:

${systemMessage}

⚠️ CRITICAL: Each question MUST have:
- Clear, specific clinical language
- EXACTLY 4 answer options representing different levels/severity
- Clinically actionable information
- Proper categorization (diabetes_control, hypertension_control, etc.)`
      } else if (attempt === 2) {
        enhancedSystemMessage = `🚨🚨 ATTEMPT 3/4 - STRICT QUALITY STANDARDS:

${systemMessage}

⚠️ MANDATORY REQUIREMENTS:
- Questions must be specific to patient's chronic conditions
- Options must represent clear clinical distinctions
- Rationale must explain medical reasoning
- Clinical relevance must justify why this question matters
- Each question adds unique diagnostic value`
      } else if (attempt >= 3) {
        enhancedSystemMessage = `🆘 ATTEMPT 4/4 - MAXIMUM QUALITY MODE:

${systemMessage}

🎯 FINAL ATTEMPT REQUIREMENTS:
- ALL questions must be specific, targeted, and clinically actionable
- ALL options must provide clear diagnostic distinction
- ALL rationales must explain medical reasoning (30+ characters)
- ALL questions must align with patient's specific chronic conditions
- Response MUST be valid JSON with complete fields`
      }
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.2',
          messages: [
            { role: 'system', content: enhancedSystemMessage },
            { role: 'user', content: prompt }
          ],
          temperature: attempt === 0 ? 0.3 : attempt === 1 ? 0.2 : 0.1,
          max_completion_tokens: 8000,
          response_format: { type: 'json_object' },
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.2
        }),
      })
      
      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`)
      }
      
      const aiData = await openaiResponse.json()
      const content = aiData.choices[0]?.message?.content || '{}'
      
      let parsed
      try {
        parsed = JSON.parse(content)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', content)
        throw new Error('Invalid response format from AI')
      }
      
      const questions: DiagnosticQuestion[] = parsed.questions || []
      
      // Quality validation
      const hasMinimumQuestions = questions.length >= 6
      const allHaveOptions = questions.every(q => q.options && q.options.length === 4)
      const allHaveRationale = questions.every(q => q.rationale && q.rationale.length > 10)
      
      if ((!hasMinimumQuestions || !allHaveOptions || !allHaveRationale) && attempt < maxRetries) {
        console.log(`⚠️ Quality issues: ${questions.length} questions, options ok: ${allHaveOptions}, rationales ok: ${allHaveRationale}`)
        throw new Error('Quality validation failed')
      }
      
      // Auto-correction on final attempt
      if ((!hasMinimumQuestions || !allHaveOptions || !allHaveRationale) && attempt === maxRetries) {
        console.log('🔧 AUTO-CORRECTION MODE: Fixing quality issues...')
        
        questions.forEach((q, idx) => {
          if (!q.options || q.options.length !== 4) {
            q.options = ['Never/Rarely', 'Sometimes', 'Often', 'Always/Daily']
          }
          if (!q.rationale || q.rationale.length < 10) {
            q.rationale = 'Important for chronic disease management and treatment optimization'
          }
          if (!q.category) {
            q.category = 'lifestyle'
          }
        })
        
        console.log('✅ Auto-correction applied')
      }
      
      console.log(`✅ Generated ${questions.length} questions (attempt ${attempt + 1})`)
      
      return {
        questions,
        qualityMetrics: {
          attempt: attempt + 1,
          questionsCount: questions.length,
          allHaveOptions,
          allHaveRationale
        }
      }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`⏳ Retrying in ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
}

// ==================== PROMPT GENERATION ====================
function generateChronicDiseasePrompt(
  patient: ProcessedPatientData,
  clinical: ProcessedClinicalData
): string {
  const diseasesPresent = []
  if (patient.chronicDiseases.diabetes) diseasesPresent.push('Diabetes')
  if (patient.chronicDiseases.hypertension) diseasesPresent.push('Hypertension')
  if (patient.chronicDiseases.obesity) diseasesPresent.push('Obesity')
  
  const medsList = patient.currentMedications.slice(0, 3).join(', ') || 'None'
  
  return `CHRONIC DISEASE FOLLOW-UP ASSESSMENT

PATIENT PROFILE:
- Demographics: ${patient.age}y ${patient.gender}, BMI: ${patient.bmi?.toFixed(1) || 'N/A'}
- Chronic Diseases: ${diseasesPresent.join(', ')}
- Current Medications: ${medsList}

CLINICAL STATUS:
- Chief Complaint: ${clinical.chiefComplaint}
${clinical.bloodPressure ? `- Blood Pressure: ${clinical.bloodPressure} (${clinical.bpStatus})` : ''}
${clinical.bloodGlucose ? `- Blood Glucose: ${clinical.bloodGlucose} g/L (${clinical.bgStatus})` : ''}
${clinical.lastHbA1c ? `- Last HbA1c: ${clinical.lastHbA1c}%` : ''}
- Medication Adherence: ${clinical.medicationAdherence}

Generate 8 diagnostic questions following this protocol:

${patient.chronicDiseases.diabetes ? `DIABETES MONITORING (3 questions):
- Glycemic control patterns (fasting/post-prandial glucose)
- Hypoglycemia frequency and symptoms
- Complications screening (neuropathy, retinopathy)
` : ''}
${patient.chronicDiseases.hypertension ? `HYPERTENSION MONITORING (2 questions):
- Blood pressure control and patterns
- Medication compliance
` : ''}
${patient.chronicDiseases.obesity ? `OBESITY MANAGEMENT (1 question):
- Weight trends and dietary patterns
` : ''}
MEDICATION ASSESSMENT (1 question):
- Adherence barriers and side effects

LIFESTYLE ASSESSMENT (1 question):
- Diet quality and physical activity

🚨 CRITICAL FORMAT REQUIREMENTS:
- ALL questions MUST be multiple choice with EXACTLY 4 specific answer options
- NO open-ended questions allowed
- Options should represent different severity/frequency levels
- Use clear, patient-friendly language
- Be clinically actionable

Format:
{
  "questions": [
    {
      "id": 1,
      "question": "Clear clinical question text",
      "options": ["Specific option 1", "Specific option 2", "Specific option 3", "Specific option 4"],
      "priority": "high",
      "category": "diabetes_control",
      "rationale": "Clinical reasoning for this question",
      "clinicalRelevance": "How this helps management"
    }
  ]
}

Generate exactly 8 questions. Response must be valid JSON only.`
}

// ==================== MAIN API HANDLER ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Invalid or missing OpenAI API key')
    }
    
    const body = await request.json()
    const { patientData, clinicalData } = body
    
    console.log('🏥 CHRONIC DISEASE QUESTIONS API - Input:', {
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      medicalHistory: patientData?.medicalHistory
    })
    
    if (!patientData || !clinicalData) {
      return NextResponse.json(
        { error: 'Missing required data', success: false },
        { status: 400 }
      )
    }
    
    const processedPatient = processPatientData(patientData)
    const processedClinical = processClinicalData(clinicalData)
    
    console.log('📊 Processed Chronic Disease Data:', {
      age: processedPatient.age,
      chronicDiseases: processedPatient.chronicDiseases,
      bmi: processedPatient.bmi,
      bloodPressure: processedClinical.bloodPressure,
      bloodGlucose: processedClinical.bloodGlucose,
      medicationAdherence: processedClinical.medicationAdherence
    })
    
    const prompt = generateChronicDiseasePrompt(processedPatient, processedClinical)
    
    console.log('🤖 Calling GPT-5.2 with retry mechanism for chronic disease questions...')
    
    const systemMessage = 'You are an expert endocrinologist and diabetologist conducting a chronic disease follow-up assessment. Generate diagnostic questions based on evidence-based medicine. CRITICAL: ALL questions MUST be multiple choice format with EXACTLY 4 specific answer options. NO open-ended questions. Always respond with valid JSON only.'
    
    const result = await callOpenAIWithRetry(apiKey, prompt, systemMessage, 3)
    const questions = result.questions
    
    console.log(`✅ Generated ${questions.length} chronic disease questions with retry mechanism`)
    
    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        model: 'gpt-5.2',
        version: '2.0-Professional-Grade-4Retry',
        processingTime: Date.now() - startTime,
        chronicDiseases: processedPatient.chronicDiseases,
        questionsGenerated: questions.length,
        qualityMetrics: result.qualityMetrics
      }
    })
    
  } catch (error: any) {
    console.error('❌ Chronic Questions API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate questions',
      questions: []
    }, { status: 500 })
  }
}
