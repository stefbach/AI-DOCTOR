// app/api/chronic-diagnosis/route.ts - Specialist-Level Chronic Disease Diagnosis API
// VERSION 4.0: Split into multiple smaller OpenAI calls for reliability
// - Call 1: Disease Assessment
// - Call 2: Medication Management
// - Call 3: Meal Plan
// - Call 4: Follow-up Plan & Objectives
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'
export const maxDuration = 60

// ==================== DATA ANONYMIZATION ====================
function anonymizePatientData(patientData: any): {
  anonymized: any,
  originalIdentity: any,
  anonymousId: string
} {
  const originalIdentity = {
    firstName: patientData?.firstName || '',
    lastName: patientData?.lastName || '',
    name: patientData?.name || '',
    email: patientData?.email || '',
    phone: patientData?.phone || '',
    address: patientData?.address || '',
    nationalId: patientData?.nationalId || ''
  }

  const anonymized = { ...patientData }
  const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'nationalId']

  sensitiveFields.forEach(field => {
    delete anonymized[field]
  })

  const anonymousId = `ANON-CD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId

  console.log('🔒 Patient data anonymized for chronic disease diagnosis')

  return { anonymized, originalIdentity, anonymousId }
}

// ==================== HELPER FUNCTIONS ====================

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000
): Promise<any> {
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
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content in OpenAI response')
  }

  return JSON.parse(content)
}

// Clean JSON string to fix control characters
function cleanJsonString(jsonStr: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]
    const charCode = jsonStr.charCodeAt(i)

    if (escaped) {
      result += char
      escaped = false
      continue
    }

    if (char === '\\' && inString) {
      escaped = true
      result += char
      continue
    }

    if (char === '"' && !escaped) {
      inString = !inString
      result += char
      continue
    }

    if (inString && charCode < 32) {
      if (charCode === 10) result += '\\n'
      else if (charCode === 13) result += '\\r'
      else if (charCode === 9) result += '\\t'
      else result += `\\u${charCode.toString(16).padStart(4, '0')}`
      continue
    }

    result += char
  }

  return result
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  try {
    const { patientData, clinicalData, questionsData } = await req.json()

    // Anonymize patient data before sending to AI
    const { anonymized: anonymizedPatient, originalIdentity, anonymousId } = anonymizePatientData(patientData)

    // Calculate BMI
    const weight = parseFloat(anonymizedPatient.weight) || 70
    const heightInMeters = (parseFloat(anonymizedPatient.height) || 170) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    // Detect chronic diseases
    const chronicDiseases = anonymizedPatient.medicalHistory || []
    const hasDiabetes = chronicDiseases.some((d: string) =>
      d.toLowerCase().includes('diabetes') || d.toLowerCase().includes('diabète'))
    const hasHypertension = chronicDiseases.some((d: string) =>
      d.toLowerCase().includes('hypertension') || d.toLowerCase().includes('hta'))

    // Build patient context (shared across all calls) - ANONYMIZED
    const patientContext = `
PATIENT: ${anonymousId}, ${anonymizedPatient.age} ans, ${anonymizedPatient.gender}
POIDS: ${weight} kg | TAILLE: ${anonymizedPatient.height} cm | IMC: ${bmi.toFixed(1)}
MALADIES CHRONIQUES: ${chronicDiseases.join(', ') || 'Aucune déclarée'}
PA: ${clinicalData.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
GLYCÉMIE: ${clinicalData.vitalSigns?.bloodGlucose || '?'} g/L
MÉDICAMENTS ACTUELS: ${anonymizedPatient.currentMedications || 'Aucun'}
ALLERGIES: ${anonymizedPatient.allergies || 'Aucune'}
MOTIF: ${clinicalData.chiefComplaint || 'Suivi maladie chronique'}
QUESTIONNAIRE: ${JSON.stringify(questionsData, null, 2)}`

    // ========== SSE STREAMING IMPLEMENTATION ==========
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (event: string, data: any) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch (e) {
            console.error('SSE send error:', e)
          }
        }

        try {
          // ========== CALL 1: Disease Assessment (20%) ==========
          sendSSE('progress', { message: 'Analyse des maladies chroniques...', progress: 10 })
          console.log('📊 Call 1: Disease Assessment')

          const diseaseAssessment = await callOpenAI(apiKey, `Tu es un endocrinologue senior. Analyse les maladies chroniques du patient.
Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "diabetes": {
    "present": true/false,
    "type": "Type 2",
    "currentControl": "Good/Fair/Poor",
    "currentHbA1c": "valeur estimée",
    "targetHbA1c": "< 7.0%",
    "complications": { "retinopathy": "None/Suspected", "nephropathy": "None/Suspected", "neuropathy": "None/Suspected" },
    "riskFactors": ["facteur 1", "facteur 2"]
  },
  "hypertension": {
    "present": true/false,
    "stage": "Stage 1/Stage 2/Controlled",
    "currentBP": "valeur",
    "targetBP": "< 130/80 mmHg",
    "cardiovascularRisk": "Low/Moderate/High",
    "riskFactors": ["facteur 1"]
  },
  "obesity": {
    "present": true/false,
    "currentBMI": "${bmi.toFixed(1)}",
    "category": "Normal/Overweight/Obesity Class I/II/III",
    "currentWeight": "${weight}",
    "targetWeight": "target weight NUMBER ONLY without unit (e.g., 75)",
    "riskFactors": ["facteur 1"]
  },
  "overallAssessment": {
    "globalControl": "Good/Fair/Poor",
    "mainConcerns": ["préoccupation 1", "préoccupation 2"],
    "priorityActions": ["action 1", "action 2"]
  }
}`, patientContext, 1500)

          sendSSE('progress', { message: 'Évaluation complète...', progress: 25 })

          // ========== CALL 2: Medication Management (40%) ==========
          sendSSE('progress', { message: 'Analyse des médicaments...', progress: 30 })
          console.log('💊 Call 2: Medication Management')

          const medicationManagement = await callOpenAI(apiKey, `Tu es un endocrinologue senior spécialisé en pharmacologie.
Analyse les médicaments du patient et propose des ajustements si nécessaire.
UTILISE les noms DCI (Metformine, Périndopril, Amlodipine, etc.)
Format posologie UK: OD (1x/jour), BD (2x/jour), TDS (3x/jour)

Retourne UNIQUEMENT un JSON valide:
{
  "continue": [
    { "medication": "Nom DCI", "dosage": "dose", "frequency": "OD/BD/TDS", "rationale": "pourquoi continuer" }
  ],
  "add": [
    { "medication": "Nom DCI", "dosage": "dose", "frequency": "OD/BD/TDS", "indication": "indication détaillée min 30 caractères", "monitoring": "surveillance" }
  ],
  "adjust": [
    { "medication": "Nom DCI", "currentDosage": "dose actuelle", "newDosage": "nouvelle dose", "rationale": "pourquoi ajuster" }
  ],
  "stop": [
    { "medication": "Nom", "rationale": "pourquoi arrêter" }
  ]
}
Si pas de médicaments à modifier, retourne des tableaux vides.`, patientContext, 1500)

          sendSSE('progress', { message: 'Plan médicamenteux établi...', progress: 45 })

          // ========== CALL 3: Meal Plan (60%) ==========
          sendSSE('progress', { message: 'Création du plan nutritionnel...', progress: 50 })
          console.log('🍽️ Call 3: Meal Plan')

          const mealPlan = await callOpenAI(apiKey, `Tu es un diététicien clinique spécialisé dans les maladies chroniques (diabète, HTA, obésité).
Crée un plan alimentaire DÉTAILLÉ et PERSONNALISÉ pour ce patient.

Retourne UNIQUEMENT un JSON valide:
{
  "breakfast": {
    "timing": "7:00-8:00",
    "composition": "description nutritionnelle",
    "portions": "portions précises",
    "examples": ["Exemple 1 détaillé", "Exemple 2 détaillé", "Exemple 3 détaillé"],
    "glycemicConsiderations": "impact glycémique"
  },
  "lunch": {
    "timing": "12:30-13:30",
    "composition": "description",
    "portions": "portions précises",
    "examples": ["Exemple 1", "Exemple 2"],
    "macronutrientBalance": "répartition protéines/glucides/lipides"
  },
  "dinner": {
    "timing": "19:00-20:00",
    "composition": "description",
    "portions": "portions précises",
    "examples": ["Exemple 1", "Exemple 2"],
    "eveningRecommendations": "conseils spécifiques soir"
  },
  "snacks": {
    "midMorning": { "timing": "10:00", "options": ["snack 1", "snack 2"] },
    "afternoon": { "timing": "16:00", "options": ["snack 1", "snack 2"] }
  },
  "hydration": "objectif hydratation détaillé",
  "foodsToFavor": ["aliment 1 + raison", "aliment 2 + raison"],
  "foodsToAvoid": ["aliment 1 + raison", "aliment 2 + raison"],
  "cookingMethods": ["méthode 1", "méthode 2"],
  "portionControlTips": ["conseil 1", "conseil 2"]
}`, patientContext, 2000)

          sendSSE('progress', { message: 'Plan nutritionnel créé...', progress: 70 })

          // ========== CALL 4: Objectives & Follow-up (80%) ==========
          sendSSE('progress', { message: 'Définition des objectifs thérapeutiques...', progress: 75 })
          console.log('📋 Call 4: Objectives & Follow-up')

          const followUpPlan = await callOpenAI(apiKey, `Tu es un endocrinologue senior.
Définis les objectifs thérapeutiques et le plan de suivi pour ce patient.

Retourne UNIQUEMENT un JSON valide:
{
  "therapeuticObjectives": {
    "shortTerm": {
      "duration": "1-3 mois",
      "targets": ["objectif mesurable 1", "objectif mesurable 2", "objectif mesurable 3"]
    },
    "mediumTerm": {
      "duration": "3-6 mois",
      "targets": ["objectif 1", "objectif 2"]
    },
    "longTerm": {
      "duration": "6-12 mois",
      "targets": ["objectif 1", "objectif 2"]
    }
  },
  "followUpPlan": {
    "specialistConsultations": [
      { "specialty": "Endocrinologue", "frequency": "tous les 3 mois", "rationale": "suivi diabète" },
      { "specialty": "Diététicien", "frequency": "tous les 2 mois", "rationale": "suivi nutritionnel" }
    ],
    "laboratoryTests": [
      { "test": "HbA1c", "frequency": "tous les 3 mois", "target": "< 7%", "rationale": "contrôle glycémique" },
      { "test": "Bilan lipidique", "frequency": "tous les 6 mois", "target": "LDL < 1g/L", "rationale": "risque cardiovasculaire" }
    ],
    "selfMonitoring": {
      "bloodGlucose": { "frequency": "2x/jour", "timing": "à jeun + post-prandial", "target": "0.80-1.20 g/L" },
      "bloodPressure": { "frequency": "2x/semaine", "timing": "matin", "target": "< 130/80 mmHg" },
      "weight": { "frequency": "1x/semaine", "timing": "matin à jeun", "target": "perte progressive" }
    }
  }
}`, patientContext, 1500)

          sendSSE('progress', { message: 'Finalisation de l\'évaluation...', progress: 90 })

          // ========== COMBINE ALL RESULTS ==========
          console.log('✅ All 4 calls completed, combining results...')

          const combinedAssessment = {
            diseaseAssessment: {
              diabetes: diseaseAssessment.diabetes || { present: false },
              hypertension: diseaseAssessment.hypertension || { present: false },
              obesity: diseaseAssessment.obesity || { present: false }
            },
            detailedMealPlan: mealPlan,
            therapeuticObjectives: followUpPlan.therapeuticObjectives,
            followUpPlan: followUpPlan.followUpPlan,
            medicationManagement: medicationManagement,
            overallAssessment: diseaseAssessment.overallAssessment || {
              globalControl: "Fair",
              mainConcerns: ["Suivi requis"],
              priorityActions: ["Continuer le traitement"]
            }
          }

          sendSSE('progress', { message: 'Évaluation terminée!', progress: 100 })

          // Send complete result
          sendSSE('complete', {
            success: true,
            assessment: combinedAssessment
          })

          console.log('✅ Complete assessment sent to client')

        } catch (error: any) {
          console.error('Chronic diagnosis error:', error)
          sendSSE('error', {
            error: 'Failed to generate assessment',
            details: error.message
          })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error("Chronic Diagnosis API Error:", error)
    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    )
  }
}
