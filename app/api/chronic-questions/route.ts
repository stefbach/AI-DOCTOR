// app/api/chronic-questions/route.ts - Chronic Disease Specialized Questions API
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'edge'
export const preferredRegion = 'auto'

interface ChronicPatientData {
  firstName?: string
  lastName?: string
  age: string | number
  gender: string
  weight?: string | number
  height?: string | number
  medicalHistory?: string[]
  currentMedications?: string
}

interface ChronicClinicalData {
  chiefComplaint: string
  symptomDuration?: string
  vitalSigns?: {
    temperature?: string | number
    bloodPressureSystolic?: string | number
    bloodPressureDiastolic?: string | number
    bloodGlucose?: string | number
    heartRate?: string | number
  }
  chronicDiseaseSpecific?: {
    lastHbA1c?: string
    lastLipidPanel?: string
    complications?: string[]
    medicationAdherence?: string
    lastFollowUp?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const { patientData, clinicalData }: { 
      patientData: ChronicPatientData
      clinicalData: ChronicClinicalData 
    } = await req.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    // Detect chronic diseases
    const chronicDiseases = patientData.medicalHistory || []
    const hasDiabetes = chronicDiseases.some(d => d.toLowerCase().includes('diabetes'))
    const hasHypertension = chronicDiseases.some(d => d.toLowerCase().includes('hypertension'))
    const hasObesity = chronicDiseases.some(d => d.toLowerCase().includes('obesity'))

    // Build specialized prompt for chronic disease
    const systemPrompt = `You are a specialized AI medical assistant focused on chronic disease management and follow-up.

Your role is to generate TARGETED, SPECIFIC questions for chronic disease monitoring:
- Diabetes: glycemic control, complications screening, medication adherence
- Hypertension: BP control, cardiovascular risk, lifestyle modifications
- Obesity: weight trends, comorbidities, dietary assessment

Generate 8-12 ESSENTIAL questions in JSON format.

CRITICAL RULES:
1. Questions MUST be specific to the detected chronic diseases
2. Focus on: control assessment, complications, adherence, lifestyle
3. Include measurable parameters (HbA1c, BP readings, weight changes)
4. Screen for complications specific to each disease
5. Assess medication adherence and side effects
6. Return ONLY valid JSON array of question objects

JSON FORMAT:
{
  "questions": [
    {
      "id": "unique_id",
      "category": "diabetes_control|hypertension_control|obesity_management|complications|medications|lifestyle",
      "question_en": "English question",
      "question_fr": "Question française",
      "type": "text|number|select|multiselect",
      "options": ["option1", "option2"],
      "required": true|false,
      "clinicalSignificance": "Why this question matters"
    }
  ]
}`

    const patientContext = `
PATIENT PROFILE:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Weight: ${patientData.weight || 'Not specified'}kg
- Height: ${patientData.height || 'Not specified'}cm

CHRONIC DISEASES DETECTED:
${chronicDiseases.map(d => `- ${d}`).join('\n')}

CURRENT CONSULTATION:
- Chief Complaint: ${clinicalData.chiefComplaint}
- Duration: ${clinicalData.symptomDuration || 'Not specified'}

VITAL SIGNS:
- Blood Pressure: ${clinicalData.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
- Blood Glucose: ${clinicalData.vitalSigns?.bloodGlucose || 'Not measured'} g/L
- Heart Rate: ${clinicalData.vitalSigns?.heartRate || 'Not measured'} bpm
- Temperature: ${clinicalData.vitalSigns?.temperature || 'Not measured'}°C

CURRENT MEDICATIONS:
${patientData.currentMedications || 'None reported'}

FOCUS AREAS:
${hasDiabetes ? '✓ Diabetes Management & Complications Screening' : ''}
${hasHypertension ? '✓ Hypertension Control & Cardiovascular Risk' : ''}
${hasObesity ? '✓ Weight Management & Metabolic Assessment' : ''}

Generate specialized questions for chronic disease follow-up.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: patientContext }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenAI API Error:", error)
      return NextResponse.json(
        { error: "Failed to generate chronic disease questions" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "No content received from AI" },
        { status: 500 }
      )
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("No JSON found in response:", content)
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      )
    }

    const questionsData = JSON.parse(jsonMatch[0])
    
    return NextResponse.json({
      success: true,
      questions: questionsData.questions || [],
      chronicDiseases: {
        diabetes: hasDiabetes,
        hypertension: hasHypertension,
        obesity: hasObesity
      }
    })

  } catch (error: any) {
    console.error("Chronic Questions API Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate chronic disease questions",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
