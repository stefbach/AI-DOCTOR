// app/api/chronic-diagnosis/route.ts - Specialist-Level Chronic Disease Diagnosis API
// VERSION 5.0: 2-call hybrid approach for reliability + quality
// - Call 1: Disease Assessment + Medication Management (reasoning: medium, 16K budget)
// - Call 2: Meal Plan + Objectives & Follow-up (no reasoning, ~6K budget)
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const maxDuration = 300

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
  maxTokens: number = 2000,
  useReasoning: boolean = false
): Promise<any> {
  // For reasoning models (gpt-5.2), reasoning tokens count toward max_completion_tokens.
  // With reasoning_effort 'medium', the model may use 6-10K reasoning tokens,
  // so we need a 16K budget to leave enough room for the actual JSON output.
  const effectiveMaxTokens = useReasoning ? Math.max(maxTokens, 16384) : maxTokens

  const body: any = {
    model: "gpt-5.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_completion_tokens: effectiveMaxTokens,
    response_format: { type: "json_object" }
  }

  if (useReasoning) {
    body.reasoning_effort = 'medium'
  } else {
    body.temperature = 0.3
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()

  // Log response structure for debugging
  const choice = data.choices?.[0]
  console.log(`   📡 OpenAI response - finish_reason: ${choice?.finish_reason}, has content: ${!!choice?.message?.content}, usage: ${JSON.stringify(data.usage || {})}`)

  const content = choice?.message?.content

  if (!content) {
    // Log full response structure when content is missing
    console.error('❌ No content in OpenAI response. Full response:', JSON.stringify(data, null, 2).substring(0, 500))

    // Check if the model hit the token limit (all tokens consumed by reasoning)
    if (choice?.finish_reason === 'length') {
      throw new Error(`OpenAI response truncated - reasoning consumed all ${effectiveMaxTokens} tokens, leaving none for output. Usage: ${JSON.stringify(data.usage || {})}`)
    }

    throw new Error(`No content in OpenAI response (finish_reason: ${choice?.finish_reason || 'unknown'})`)
  }

  // Warn if output was truncated (partial JSON) but still try to parse
  if (choice?.finish_reason === 'length') {
    console.warn(`⚠️ Response truncated (finish_reason: length) but content exists (${content.length} chars). Attempting parse...`)
  }

  try {
    return JSON.parse(content)
  } catch (parseError) {
    // If JSON is truncated, try cleaning it first
    console.warn(`⚠️ JSON parse failed, attempting cleanup. Content starts with: ${content.substring(0, 100)}...`)
    try {
      const cleaned = cleanJsonString(content)
      return JSON.parse(cleaned)
    } catch {
      throw new Error(`Invalid JSON from OpenAI (finish_reason: ${choice?.finish_reason}). First 200 chars: ${content.substring(0, 200)}`)
    }
  }
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
          // ========== CALL 1: Clinical Reasoning — Disease Assessment + Medication Management (50%) ==========
          sendSSE('progress', { message: 'Analyse clinique approfondie des maladies chroniques...', progress: 10 })
          console.log('🧠 Call 1: Clinical Reasoning — Disease Assessment + Medication Management')

          const clinicalAnalysis = await callOpenAI(apiKey, `Tu es un endocrinologue senior spécialisé en pharmacologie.
Analyse les maladies chroniques du patient ET propose la gestion médicamenteuse.
UTILISE les noms DCI (Metformine, Périndopril, Amlodipine, etc.)
Format posologie UK: OD (1x/jour), BD (2x/jour), TDS (3x/jour)

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "diseaseAssessment": {
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
    }
  },
  "medicationManagement": {
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
  },
  "overallAssessment": {
    "globalControl": "Good/Fair/Poor",
    "mainConcerns": ["préoccupation 1", "préoccupation 2"],
    "priorityActions": ["action 1", "action 2"]
  }
}
Si pas de médicaments à modifier, retourne des tableaux vides pour continue/add/adjust/stop.`, patientContext, 8000, true)

          sendSSE('progress', { message: 'Évaluation clinique complète, création du plan de suivi...', progress: 50 })

          // Build clinical summary from Call 1 to inform Call 2
          const diseaseSummary = []
          if (clinicalAnalysis.diseaseAssessment?.diabetes?.present) {
            diseaseSummary.push(`Diabète ${clinicalAnalysis.diseaseAssessment.diabetes.type || 'Type 2'} - Contrôle: ${clinicalAnalysis.diseaseAssessment.diabetes.currentControl || '?'}`)
          }
          if (clinicalAnalysis.diseaseAssessment?.hypertension?.present) {
            diseaseSummary.push(`HTA ${clinicalAnalysis.diseaseAssessment.hypertension.stage || '?'} - PA: ${clinicalAnalysis.diseaseAssessment.hypertension.currentBP || '?'}`)
          }
          if (clinicalAnalysis.diseaseAssessment?.obesity?.present) {
            diseaseSummary.push(`Obésité ${clinicalAnalysis.diseaseAssessment.obesity.category || '?'} - IMC: ${clinicalAnalysis.diseaseAssessment.obesity.currentBMI || bmi.toFixed(1)}`)
          }
          const medicationSummary = [
            ...(clinicalAnalysis.medicationManagement?.continue || []).map((m: any) => `${m.medication} ${m.dosage} ${m.frequency}`),
            ...(clinicalAnalysis.medicationManagement?.add || []).map((m: any) => `NOUVEAU: ${m.medication} ${m.dosage} ${m.frequency}`)
          ].join(', ') || 'Aucun'

          // ========== CALL 2: Structured Plans — Meal Plan + Objectives & Follow-up (90%) ==========
          sendSSE('progress', { message: 'Création du plan nutritionnel et objectifs thérapeutiques...', progress: 55 })
          console.log('📋 Call 2: Structured Plans — Meal Plan + Objectives & Follow-up')

          const structuredPlans = await callOpenAI(apiKey, `Tu es un diététicien clinique ET endocrinologue senior.
Crée un plan alimentaire DÉTAILLÉ et PERSONNALISÉ + les objectifs thérapeutiques et le plan de suivi.

CONTEXTE CLINIQUE (résultat de l'évaluation):
- Diagnostics: ${diseaseSummary.join(' | ') || 'Aucun diagnostic spécifique'}
- Médicaments en cours: ${medicationSummary}
- Préoccupations principales: ${(clinicalAnalysis.overallAssessment?.mainConcerns || []).join(', ') || 'Suivi général'}

Adapte le plan nutritionnel aux pathologies et médicaments ci-dessus.

Retourne UNIQUEMENT un JSON valide:
{
  "detailedMealPlan": {
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
  },
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
}`, patientContext, 6000)

          sendSSE('progress', { message: 'Finalisation de l\'évaluation...', progress: 90 })

          // ========== COMBINE RESULTS ==========
          console.log('✅ Both calls completed, combining results...')

          const combinedAssessment = {
            diseaseAssessment: {
              diabetes: clinicalAnalysis.diseaseAssessment?.diabetes || { present: false },
              hypertension: clinicalAnalysis.diseaseAssessment?.hypertension || { present: false },
              obesity: clinicalAnalysis.diseaseAssessment?.obesity || { present: false }
            },
            detailedMealPlan: structuredPlans.detailedMealPlan,
            therapeuticObjectives: structuredPlans.therapeuticObjectives,
            followUpPlan: structuredPlans.followUpPlan,
            medicationManagement: clinicalAnalysis.medicationManagement || {
              continue: [], add: [], adjust: [], stop: []
            },
            overallAssessment: clinicalAnalysis.overallAssessment || {
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

          console.log('✅ Complete assessment sent to client (2-call hybrid)')

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
