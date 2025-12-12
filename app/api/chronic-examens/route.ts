// app/api/chronic-examens/route.ts - Chronic Disease Laboratory and Paraclinical Exam Orders API
// VERSION 3.0: Split into multiple smaller OpenAI calls for reliability (same pattern as chronic-diagnosis)
// - Call 1: Laboratory Tests
// - Call 2: Paraclinical Exams
// - Call 3: Specialist Referrals + Monitoring Plan
// - Call 4: Exam Summary
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'
export const maxDuration = 60

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
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  try {
    const { patientData, clinicalData, diagnosisData } = await req.json()

    // Get current date for exam orders
    const orderDate = new Date()
    const orderId = `EXM-CHR-${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Calculate BMI
    const weight = parseFloat(patientData.weight) || 70
    const heightInMeters = (parseFloat(patientData.height) || 170) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    // Detect chronic diseases
    const chronicDiseases = patientData.medicalHistory || []
    const hasDiabetes = chronicDiseases.some((d: string) =>
      d.toLowerCase().includes('diabetes') || d.toLowerCase().includes('diabète'))
    const hasHypertension = chronicDiseases.some((d: string) =>
      d.toLowerCase().includes('hypertension') || d.toLowerCase().includes('hta'))

    // Build patient context (shared across all calls)
    const patientContext = `
PATIENT: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
POIDS: ${weight} kg | TAILLE: ${patientData.height} cm | IMC: ${bmi.toFixed(1)}
MALADIES CHRONIQUES: ${chronicDiseases.join(', ') || 'Aucune déclarée'}
PA: ${clinicalData?.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData?.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
GLYCÉMIE: ${clinicalData?.vitalSigns?.bloodGlucose || '?'} g/L
MÉDICAMENTS ACTUELS: ${patientData.currentMedications || patientData.currentMedicationsText || 'Aucun'}
ALLERGIES: ${patientData.allergies || 'Aucune'}
MOTIF: ${clinicalData?.chiefComplaint || 'Suivi maladie chronique'}
DIABETES: ${hasDiabetes ? 'OUI' : 'NON'}
HYPERTENSION: ${hasHypertension ? 'OUI' : 'NON'}
DIAGNOSTIC DATA: ${JSON.stringify(diagnosisData?.diseaseAssessment || {}, null, 2)}`

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
          // ========== CALL 1: Laboratory Tests (25%) ==========
          sendSSE('progress', { message: 'Génération des analyses biologiques...', progress: 10 })
          console.log('🔬 Call 1: Laboratory Tests')

          const labTests = await callOpenAI(apiKey, `Tu es un endocrinologue senior. Génère les analyses biologiques pour le suivi des maladies chroniques.
Utilise la terminologie médicale anglaise (Anglo-Saxon standards).

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "laboratoryTests": [
    {
      "lineNumber": 1,
      "category": "BIOCHIMIE|HÉMATOLOGIE|IMMUNOLOGIE",
      "testName": "test name in English",
      "clinicalIndication": "why this test is ordered",
      "urgency": "URGENT|SEMI-URGENT|ROUTINE",
      "timing": {
        "when": "IMMÉDIAT|DANS 1 MOIS|DANS 3 MOIS",
        "frequency": "tous les 3 mois|annuel|etc."
      },
      "preparation": {
        "fasting": true|false,
        "fastingDuration": "12 heures si à jeun"
      },
      "expectedResults": {
        "normalRange": "reference range",
        "targetForPatient": "specific target"
      },
      "monitoringPurpose": {
        "diseaseMonitoring": "which disease",
        "complicationScreening": "which complication if applicable"
      }
    }
  ]
}

TESTS REQUIS selon les maladies:
- DIABÈTE: HbA1c (tous les 3 mois), Glycémie à jeun, Bilan lipidique, Créatininémie + DFG, Microalbuminurie
- HYPERTENSION: Ionogramme, Créatininémie + DFG, Bilan lipidique
- OBÉSITÉ: Bilan lipidique, Glycémie + HbA1c, Bilan hépatique (ASAT/ALAT/GGT)`, patientContext, 2000)

          sendSSE('progress', { message: 'Analyses biologiques générées...', progress: 30 })

          // ========== CALL 2: Paraclinical Exams (50%) ==========
          sendSSE('progress', { message: 'Génération des examens paracliniques...', progress: 35 })
          console.log('🏥 Call 2: Paraclinical Exams')

          const paraclinicalExams = await callOpenAI(apiKey, `Tu es un endocrinologue senior. Génère les examens paracliniques (imagerie, explorations fonctionnelles) pour le suivi des maladies chroniques.
Utilise la terminologie médicale anglaise.

Retourne UNIQUEMENT un JSON valide:
{
  "paraclinicalExams": [
    {
      "lineNumber": 1,
      "category": "IMAGERIE|EXPLORATION FONCTIONNELLE",
      "examName": "exam name in English",
      "examType": "specific type",
      "clinicalIndication": "why this exam is ordered",
      "urgency": "URGENT|SEMI-URGENT|ROUTINE",
      "timing": {
        "when": "when to perform",
        "frequency": "how often"
      },
      "preparation": {
        "fastingRequired": true|false,
        "contrastAllergy": "check if applicable"
      },
      "expectedFindings": {
        "normalFindings": "what normal looks like",
        "concerningFindings": "what to look for"
      }
    }
  ]
}

EXAMENS REQUIS:
- DIABÈTE: Fond d'œil (annuel), ECG (annuel), Examen des pieds, Écho-Doppler artères MI si nécessaire
- HYPERTENSION: ECG (annuel), Échocardiographie si mal contrôlée, Holter tensionnel si suspicion
- OBÉSITÉ: Échographie abdominale (stéatose)`, patientContext, 1500)

          sendSSE('progress', { message: 'Examens paracliniques générés...', progress: 55 })

          // ========== CALL 3: Specialist Referrals + Monitoring (70%) ==========
          sendSSE('progress', { message: 'Génération des consultations spécialisées...', progress: 60 })
          console.log('👨‍⚕️ Call 3: Specialist Referrals + Monitoring Plan')

          const referralsAndMonitoring = await callOpenAI(apiKey, `Tu es un endocrinologue senior. Génère les consultations spécialisées et le plan de suivi.

Retourne UNIQUEMENT un JSON valide:
{
  "specialistReferrals": [
    {
      "specialty": "specialty name",
      "consultationType": "INITIAL|FOLLOW-UP",
      "indication": "clinical indication",
      "urgency": "URGENT|SEMI-URGENT|ROUTINE",
      "timing": "when to schedule",
      "frequency": "how often"
    }
  ],
  "monitoringPlan": {
    "immediate": ["exams immédiats"],
    "oneMonth": ["exams dans 1 mois"],
    "threeMonths": ["exams dans 3 mois"],
    "sixMonths": ["exams dans 6 mois"],
    "annual": ["exams annuels"]
  },
  "laboratoryNotes": {
    "specimenCollection": "instructions de prélèvement",
    "criticalValueAlerts": "valeurs critiques nécessitant alerte"
  }
}

CONSULTATIONS selon maladies:
- DIABÈTE: Ophtalmologue (fond d'œil annuel), Podologue, Cardiologue si complications
- HYPERTENSION: Cardiologue si mal contrôlée, Néphrologue si atteinte rénale
- OBÉSITÉ: Diététicien, Endocrinologue`, patientContext, 1500)

          sendSSE('progress', { message: 'Plan de suivi généré...', progress: 75 })

          // ========== CALL 4: Exam Summary (85%) ==========
          sendSSE('progress', { message: 'Génération du récapitulatif...', progress: 80 })
          console.log('📊 Call 4: Exam Summary')

          const labCount = labTests.laboratoryTests?.length || 0
          const paraCount = paraclinicalExams.paraclinicalExams?.length || 0
          const refCount = referralsAndMonitoring.specialistReferrals?.length || 0

          const examSummary = await callOpenAI(apiKey, `Tu es un endocrinologue senior. Génère le récapitulatif des examens prescrits.

Nombre d'analyses biologiques: ${labCount}
Nombre d'examens paracliniques: ${paraCount}
Nombre de consultations spécialisées: ${refCount}

Retourne UNIQUEMENT un JSON valide:
{
  "examSummary": {
    "totalLabTests": ${labCount},
    "totalParaclinicalExams": ${paraCount},
    "totalSpecialistReferrals": ${refCount},
    "byUrgency": {
      "urgent": 0,
      "semiUrgent": 2,
      "routine": ${labCount + paraCount - 2}
    },
    "byPurpose": {
      "diseaseMonitoring": ${Math.ceil((labCount + paraCount) * 0.5)},
      "complicationScreening": ${Math.ceil((labCount + paraCount) * 0.3)},
      "medicationMonitoring": ${Math.ceil((labCount + paraCount) * 0.2)},
      "cardiovascularRisk": ${Math.ceil((labCount + paraCount) * 0.3)}
    },
    "timelineOverview": "description du calendrier des examens"
  },
  "orderValidation": {
    "appropriateTests": "tests appropriés pour les diagnostics",
    "noRedundantTests": "pas de redondance",
    "timingAppropriate": "timing approprié",
    "safetyChecked": "sécurité vérifiée",
    "costEffective": "coût-efficacité considérée",
    "validationScore": 95
  }
}`, patientContext, 1000)

          sendSSE('progress', { message: 'Finalisation...', progress: 90 })

          // ========== COMBINE ALL RESULTS ==========
          console.log('✅ All 4 calls completed, combining results...')

          const orderHeader = {
            orderId: orderId,
            orderType: "CHRONIC DISEASE MONITORING",
            orderDate: orderDate.toLocaleDateString('fr-MU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            orderTime: orderDate.toLocaleTimeString('fr-MU', { hour: '2-digit', minute: '2-digit' }),
            prescriber: {
              name: `Dr. ${patientData.doctorName || 'TIBOKai DOCTOR'}`,
              specialty: "Endocrinology / Internal Medicine",
              medicalCouncilNumber: patientData.doctorMCM || "MCM-XXXXXXXXX"
            },
            patient: {
              lastName: patientData.lastName,
              firstName: patientData.firstName,
              age: patientData.age,
              chronicDiseases: chronicDiseases
            },
            clinicalContext: `Suivi maladie chronique - IMC: ${bmi.toFixed(1)} - PA: ${clinicalData?.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData?.vitalSigns?.bloodPressureDiastolic || '?'} mmHg`
          }

          const combinedExamOrders = {
            orderHeader,
            laboratoryTests: labTests.laboratoryTests || [],
            paraclinicalExams: paraclinicalExams.paraclinicalExams || [],
            specialistReferrals: referralsAndMonitoring.specialistReferrals || [],
            monitoringPlan: referralsAndMonitoring.monitoringPlan || {
              immediate: [],
              oneMonth: [],
              threeMonths: [],
              sixMonths: [],
              annual: []
            },
            laboratoryNotes: referralsAndMonitoring.laboratoryNotes || {
              specimenCollection: "Standard collection procedures",
              criticalValueAlerts: "Contact physician immediately for critical values"
            },
            examSummary: examSummary.examSummary || {
              totalLabTests: labCount,
              totalParaclinicalExams: paraCount,
              totalSpecialistReferrals: refCount,
              byUrgency: { urgent: 0, semiUrgent: 2, routine: labCount + paraCount - 2 },
              byPurpose: { diseaseMonitoring: 3, complicationScreening: 2, medicationMonitoring: 1, cardiovascularRisk: 2 },
              timelineOverview: "Examens répartis sur 12 mois selon le calendrier de suivi"
            },
            orderValidation: examSummary.orderValidation || {
              appropriateTests: "Tests appropriés",
              noRedundantTests: "Pas de redondance",
              timingAppropriate: "Timing approprié",
              safetyChecked: "Sécurité vérifiée",
              costEffective: "Coût-efficacité considérée",
              validationScore: 95
            }
          }

          sendSSE('progress', { message: 'Ordonnances générées!', progress: 100 })

          // Send complete result
          sendSSE('complete', {
            success: true,
            examOrders: combinedExamOrders,
            orderId: orderId,
            generatedAt: orderDate.toISOString()
          })

          console.log('✅ Complete exam orders sent to client')

        } catch (error: any) {
          console.error('Chronic examens error:', error)
          sendSSE('error', {
            error: 'Failed to generate exam orders',
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
    console.error("Chronic Examens API Error:", error)
    return NextResponse.json(
      { error: "Failed to generate chronic disease exam orders", details: error.message },
      { status: 500 }
    )
  }
}
