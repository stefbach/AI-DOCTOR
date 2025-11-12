// app/api/chronic-diagnosis/route.ts - Chronic Disease Diagnosis & Assessment API
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'edge'
export const preferredRegion = 'auto'

export async function POST(req: NextRequest) {
  try {
    const { patientData, clinicalData, questionsData } = await req.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    // Detect chronic diseases
    const chronicDiseases = patientData.medicalHistory || []
    const hasDiabetes = chronicDiseases.some((d: string) => d.toLowerCase().includes('diabetes'))
    const hasHypertension = chronicDiseases.some((d: string) => d.toLowerCase().includes('hypertension'))
    const hasObesity = chronicDiseases.some((d: string) => d.toLowerCase().includes('obesity'))

    const systemPrompt = `You are an expert AI physician specializing in chronic disease management.

Analyze the patient's chronic disease status and provide:
1. DISEASE CONTROL ASSESSMENT (for each chronic condition)
2. COMPLICATIONS SCREENING
3. MEDICATION OPTIMIZATION
4. LIFESTYLE MODIFICATIONS
5. FOLLOW-UP PLAN
6. LABORATORY MONITORING

Return ONLY a valid JSON object with this exact structure:
{
  "chronicDiseaseAssessment": {
    "diabetes": {
      "present": true/false,
      "type": "Type 1|Type 2|Gestational",
      "controlStatus": "Excellent|Good|Fair|Poor",
      "currentHbA1c": "value or estimated",
      "targetHbA1c": "<7% for most adults",
      "complications": {
        "retinopathy": "screening status",
        "nephropathy": "screening status",
        "neuropathy": "screening status",
        "cardiovascular": "risk assessment"
      },
      "medications": ["current medications"],
      "medicationChanges": "recommendations"
    },
    "hypertension": {
      "present": true/false,
      "stage": "Stage 1|Stage 2|Controlled",
      "currentBP": "systolic/diastolic",
      "targetBP": "<130/80 mmHg",
      "cardiovascularRisk": "Low|Moderate|High",
      "organDamage": "assessment",
      "medications": ["current medications"],
      "medicationChanges": "recommendations"
    },
    "obesity": {
      "present": true/false,
      "bmi": "calculated value",
      "category": "Overweight|Obese Class I/II/III",
      "comorbidities": ["associated conditions"],
      "weightGoal": "realistic target",
      "interventions": "recommendations"
    }
  },
  "overallAssessment": {
    "diseaseControl": "Excellent|Good|Fair|Poor",
    "complications": ["list of concerns"],
    "riskFactors": ["modifiable risk factors"],
    "prognosis": "assessment"
  },
  "treatmentPlan": {
    "medications": {
      "continue": ["medications to continue"],
      "adjust": ["medications to adjust with reasoning"],
      "add": ["medications to add with reasoning"],
      "stop": ["medications to stop with reasoning"]
    },
    "lifestyle": {
      "diet": "specific recommendations",
      "exercise": "specific recommendations",
      "smoking": "recommendations if applicable",
      "alcohol": "recommendations if applicable"
    },
    "monitoring": {
      "selfMonitoring": ["home monitoring tasks"],
      "labTests": ["tests needed with timing"],
      "specialistReferrals": ["referrals if needed"]
    }
  },
  "followUp": {
    "nextVisit": "timing recommendation",
    "urgentSigns": ["warning signs to watch"],
    "patientEducation": ["key education points"]
  },
  "prescriptions": {
    "medications": [
      {
        "name": "medication name",
        "dosage": "dose",
        "frequency": "frequency",
        "indication": "why prescribed",
        "monitoring": "what to monitor"
      }
    ],
    "labTests": [
      {
        "test": "test name",
        "indication": "why ordered",
        "timing": "when to do"
      }
    ]
  }
}`

    const patientContext = `
PATIENT: ${patientData.firstName} ${patientData.lastName}, ${patientData.age}yo ${patientData.gender}

CHRONIC DISEASES:
${chronicDiseases.map((d: string) => `- ${d}`).join('\n')}

VITAL SIGNS:
- BP: ${clinicalData.vitalSigns?.bloodPressureSystolic}/${clinicalData.vitalSigns?.bloodPressureDiastolic} mmHg
- Blood Glucose: ${clinicalData.vitalSigns?.bloodGlucose} g/L
- Weight: ${patientData.weight}kg, Height: ${patientData.height}cm
- BMI: ${patientData.weight && patientData.height ? (parseFloat(patientData.weight) / Math.pow(parseFloat(patientData.height)/100, 2)).toFixed(1) : 'Not calculated'}

CURRENT MEDICATIONS:
${patientData.currentMedications || 'None'}

CHIEF COMPLAINT: ${clinicalData.chiefComplaint}

AI QUESTIONS RESPONSES:
${JSON.stringify(questionsData, null, 2)}

Provide comprehensive chronic disease assessment and management plan.`

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
        temperature: 0.3,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenAI API Error:", error)
      return NextResponse.json(
        { error: "Failed to generate chronic disease assessment" },
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

    const assessmentData = JSON.parse(jsonMatch[0])
    
    return NextResponse.json({
      success: true,
      assessment: assessmentData,
      chronicDiseases: {
        diabetes: hasDiabetes,
        hypertension: hasHypertension,
        obesity: hasObesity
      }
    })

  } catch (error: any) {
    console.error("Chronic Diagnosis API Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate chronic disease assessment",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
