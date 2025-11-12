// app/api/chronic-questions/route.ts - REFONTE COMPLÈTE
// Questions à choix multiples pour maladies chroniques (format identique à /api/openai-questions)
import { type NextRequest, NextResponse } from "next/server"

// ==================== CONFIGURATION ====================
export const runtime = 'edge'
export const preferredRegion = 'auto'

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

// ==================== PROMPT GENERATION ====================
function generateChronicDiseasePrompt(
  patient: ProcessedPatientData,
  clinical: ProcessedClinicalData
): string {
  const diseasesPresent = []
  if (patient.chronicDiseases.diabetes) diseasesPresent.push('Diabetes')
  if (patient.chronicDiseases.hypertension) diseasesPresent.push('Hypertension')
  if (patient.chronicDiseases.obesity) diseasesPresent.push('Obesity')
  
  return `Generate 8-10 chronic disease follow-up questions in JSON format.

PATIENT: ${patient.age}yo ${patient.gender}, BMI ${patient.bmi?.toFixed(1)}, Diseases: ${diseasesPresent.join(', ')}
CLINICAL: BP ${clinical.bloodPressure || 'N/A'}, BG ${clinical.bloodGlucose || 'N/A'} g/L, HbA1c ${clinical.lastHbA1c || 'N/A'}%
MEDICATIONS: ${patient.currentMedications.slice(0, 3).join(', ') || 'None'}, Adherence: ${clinical.medicationAdherence}

REQUIRED QUESTIONS:
${patient.chronicDiseases.diabetes ? '- Diabetes: 3-4 questions (glucose control, hypo symptoms, SMBG, complications)\n' : ''}${patient.chronicDiseases.hypertension ? '- Hypertension: 2-3 questions (BP patterns, medication, symptoms)\n' : ''}${patient.chronicDiseases.obesity ? '- Obesity: 2 questions (weight trends, diet/exercise)\n' : ''}- Medications: 1-2 questions (adherence barriers, side effects)
- Lifestyle: 1-2 questions (diet, physical activity)

FORMAT (STRICT JSON):
{
  "questions": [
    {
      "id": 1,
      "question": "Specific question text?",
      "options": ["Option A (specific)", "Option B (specific)", "Option C (specific)", "Option D (specific)"],
      "priority": "high",
      "category": "diabetes_control",
      "rationale": "Brief clinical reasoning",
      "clinicalRelevance": "Brief impact on care"
    }
  ]
}

RULES:
- Each question needs EXACTLY 4 specific options (no yes/no)
- Options should show different severity/frequency levels
- Use simple language
- Valid JSON only`
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
    
    console.log('🤖 Calling GPT-4o for chronic disease questions...')
    
    // Add timeout to prevent 504 errors
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout
    
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Expert endocrinologist generating chronic disease follow-up questions. Respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 2500,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
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
      
      console.log(`✅ Generated ${questions.length} chronic disease questions`)
      
      return NextResponse.json({
        success: true,
        questions,
        metadata: {
          model: 'gpt-4o',
          processingTime: Date.now() - startTime,
          chronicDiseases: processedPatient.chronicDiseases,
          questionsGenerated: questions.length
        }
      })
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - AI took too long to respond')
      }
      throw fetchError
    }
    
  } catch (error: any) {
    console.error('❌ Chronic Questions API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate questions',
      questions: []
    }, { status: 500 })
  }
}
