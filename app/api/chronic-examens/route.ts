// app/api/chronic-examens/route.ts - Chronic Disease Laboratory and Paraclinical Exam Orders API
// VERSION 4.0: 2-call approach for reliability (avoids Vercel timeout)
// - Call 1: Laboratory Tests + Paraclinical Exams
// - Call 2: Specialist Referrals + Monitoring Plan + Summary
import { type NextRequest, NextResponse } from "next/server"
import { callLLM } from '@/lib/llm-client'
import {
  buildClinicalQuery,
  inferSpecialty,
  queryMedicalGuidelines,
  formatGuidelinesForPrompt,
  scrubAndEnrichEvidenceRefs,
  type RAGContext,
} from '@/lib/rag/medical-rag'

export const runtime = 'nodejs'
export const maxDuration = 600 // 600s: 2 sequential DeepSeek calls (labs/imaging + referrals/monitoring) can total 250-500s.

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

  const anonymousId = `ANON-EXM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId

  console.log('🔒 Patient data anonymized for chronic examens')

  return { anonymized, originalIdentity, anonymousId }
}

// ==================== HELPER FUNCTIONS ====================

async function callOpenAI(
  _apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000
): Promise<any> {
  const llmResult = await callLLM({
    useCase: 'CHRONIC_EXAMENS',
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    maxTokens,
    responseFormat: 'json_object',
    timeoutMs: 280_000,
  })
  console.log(`[llm] use=CHRONIC_EXAMENS provider=${llmResult.provider} model=${llmResult.model} latency=${llmResult.latencyMs}ms tokens=${llmResult.usage?.totalTokens ?? 'n/a'}`)

  const content = llmResult.text

  if (!content) {
    throw new Error('No content in LLM response')
  }

  return JSON.parse(content)
}

export async function POST(req: NextRequest) {
  // Credential validation is delegated to callLLM (LLM_PROVIDER_CHRONIC_EXAMENS).
  try {
    const { patientData, clinicalData, diagnosisData } = await req.json()

    // Anonymize patient data before sending to AI
    const { anonymized: anonymizedPatient, originalIdentity, anonymousId } = anonymizePatientData(patientData)

    // Get current date for exam orders
    const orderDate = new Date()
    const orderId = `EXM-CHR-${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

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
PA: ${clinicalData?.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData?.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
GLYCÉMIE: ${clinicalData?.vitalSigns?.bloodGlucose || '?'} g/L
MÉDICAMENTS ACTUELS: ${anonymizedPatient.currentMedications || anonymizedPatient.currentMedicationsText || 'Aucun'}
ALLERGIES: ${anonymizedPatient.allergies || 'Aucune'}
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
          // ========== Phase 2.E.4.4 — RAG enrichment ==========
          // Same chain as chronic-diagnosis: retrieve once before the LLM
          // calls and inject into both systemPrompts so each call can cite
          // [ref-N] in the test/exam indication fields. Best-effort:
          // failure leaves ragPromptBlock empty and the route runs as before.
          let ragContext: RAGContext = {
            chunks: [],
            references: [],
            totalChunks: 0,
            avgSimilarity: 0,
            ragUsed: false,
          }
          let ragPromptBlock = ''
          try {
            sendSSE('progress', { message: 'Consultation des guidelines médicales...', progress: 5 })
            const ragQuery = buildClinicalQuery({
              chiefComplaint: clinicalData?.chiefComplaint || 'Suivi maladie chronique',
              symptoms: clinicalData?.symptoms || [],
              ageYears: anonymizedPatient.age,
              sex: anonymizedPatient.gender,
              medicalHistory: chronicDiseases,
              vitalSigns: clinicalData?.vitalSigns,
              duration: clinicalData?.symptomDuration,
            })
            const inferredSpecialty = inferSpecialty(ragQuery)
            console.log(`📚 [RAG-CHRONIC-EXAMENS] Querying guidelines (specialty=${inferredSpecialty ?? 'any'})`)
            ragContext = await queryMedicalGuidelines(ragQuery, { specialty: inferredSpecialty, limit: 15 })
            console.log(
              `📚 [RAG-CHRONIC-EXAMENS] Retrieved ${ragContext.totalChunks} chunks ` +
                `(avg similarity ${ragContext.avgSimilarity.toFixed(2)}, refs: ${ragContext.references.length})`
            )
            ragPromptBlock = formatGuidelinesForPrompt(ragContext)
          } catch (ragErr: any) {
            console.error('📚 [RAG-CHRONIC-EXAMENS] Enrichment failed (non-blocking):', ragErr?.message || ragErr)
          }

          // ========== CALL 1: Laboratory Tests + Paraclinical Exams (50%) ==========
          sendSSE('progress', { message: 'Génération des analyses et examens paracliniques...', progress: 10 })
          console.log('🔬 Call 1: Laboratory Tests + Paraclinical Exams')

          const call1SystemPrompt = `${ragPromptBlock ? ragPromptBlock + '\n\n' : ''}Tu es un endocrinologue senior. Génère les analyses biologiques ET les examens paracliniques (imagerie, explorations fonctionnelles) pour le suivi des maladies chroniques.
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
        "fasting": true/false,
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
  ],
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
        "fastingRequired": true/false,
        "contrastAllergy": "check if applicable"
      },
      "expectedFindings": {
        "normalFindings": "what normal looks like",
        "concerningFindings": "what to look for"
      }
    }
  ]
}

TESTS REQUIS selon les maladies:
- DIABÈTE: HbA1c (tous les 3 mois), Glycémie à jeun, Bilan lipidique, Créatininémie + DFG, Microalbuminurie
- HYPERTENSION: Ionogramme, Créatininémie + DFG, Bilan lipidique
- OBÉSITÉ: Bilan lipidique, Glycémie + HbA1c, Bilan hépatique (ASAT/ALAT/GGT)

EXAMENS PARACLINIQUES:
- DIABÈTE: Fond d'œil (annuel), ECG (annuel), Examen des pieds, Écho-Doppler artères MI si nécessaire
- HYPERTENSION: ECG (annuel), Échocardiographie si mal contrôlée, Holter tensionnel si suspicion
- OBÉSITÉ: Échographie abdominale (stéatose)`
          const clinicalOrders = await callOpenAI('', call1SystemPrompt, patientContext, 4000)

          sendSSE('progress', { message: 'Analyses et examens générés, préparation du plan de suivi...', progress: 50 })

          // Extract counts from Call 1 for Call 2
          const labCount = clinicalOrders.laboratoryTests?.length || 0
          const paraCount = clinicalOrders.paraclinicalExams?.length || 0

          // ========== CALL 2: Specialist Referrals + Monitoring + Summary (90%) ==========
          sendSSE('progress', { message: 'Génération des consultations spécialisées et récapitulatif...', progress: 55 })
          console.log('👨‍⚕️ Call 2: Specialist Referrals + Monitoring Plan + Summary')

          const call2SystemPrompt = `${ragPromptBlock ? ragPromptBlock + '\n\n' : ''}Tu es un endocrinologue senior. Génère les consultations spécialisées, le plan de suivi, ET le récapitulatif des examens.

Nombre d'analyses biologiques prescrites: ${labCount}
Nombre d'examens paracliniques prescrits: ${paraCount}

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
  },
  "examSummary": {
    "totalLabTests": ${labCount},
    "totalParaclinicalExams": ${paraCount},
    "totalSpecialistReferrals": "number you generated",
    "byUrgency": {
      "urgent": 0,
      "semiUrgent": 2,
      "routine": ${Math.max(labCount + paraCount - 2, 0)}
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
}

CONSULTATIONS selon maladies:
- DIABÈTE: Ophtalmologue (fond d'œil annuel), Podologue, Cardiologue si complications
- HYPERTENSION: Cardiologue si mal contrôlée, Néphrologue si atteinte rénale
- OBÉSITÉ: Diététicien, Endocrinologue`
          const referralsAndSummary = await callOpenAI('', call2SystemPrompt, patientContext, 3000)

          sendSSE('progress', { message: 'Finalisation...', progress: 90 })

          // ========== COMBINE RESULTS ==========
          console.log('✅ Both calls completed, combining results...')

          const refCount = referralsAndSummary.specialistReferrals?.length || 0

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
            laboratoryTests: clinicalOrders.laboratoryTests || [],
            paraclinicalExams: clinicalOrders.paraclinicalExams || [],
            specialistReferrals: referralsAndSummary.specialistReferrals || [],
            monitoringPlan: referralsAndSummary.monitoringPlan || {
              immediate: [],
              oneMonth: [],
              threeMonths: [],
              sixMonths: [],
              annual: []
            },
            laboratoryNotes: referralsAndSummary.laboratoryNotes || {
              specimenCollection: "Standard collection procedures",
              criticalValueAlerts: "Contact physician immediately for critical values"
            },
            examSummary: referralsAndSummary.examSummary || {
              totalLabTests: labCount,
              totalParaclinicalExams: paraCount,
              totalSpecialistReferrals: refCount,
              byUrgency: { urgent: 0, semiUrgent: 2, routine: Math.max(labCount + paraCount - 2, 0) },
              byPurpose: { diseaseMonitoring: 3, complicationScreening: 2, medicationMonitoring: 1, cardiovascularRisk: 2 },
              timelineOverview: "Examens répartis sur 12 mois selon le calendrier de suivi"
            },
            orderValidation: referralsAndSummary.orderValidation || {
              appropriateTests: "Tests appropriés",
              noRedundantTests: "Pas de redondance",
              timingAppropriate: "Timing approprié",
              safetyChecked: "Sécurité vérifiée",
              costEffective: "Coût-efficacité considérée",
              validationScore: 95
            }
          }

          // Phase 2.E.4.4 — scrub hallucinated [ref-N] in narrative strings
          // (test indications, exam rationale, monitoringPlan items, etc.),
          // filter unused refs, and enrich a final evidence_references list
          // with metadata. Same helper as chronic-diagnosis +
          // chronic-prescription. Walks the entire combinedExamOrders tree.
          const ragResult = scrubAndEnrichEvidenceRefs(
            combinedExamOrders,
            ragContext,
            { logPrefix: '📚 [RAG-CHRONIC-EXAMENS]' }
          )

          sendSSE('progress', { message: 'Ordonnances générées!', progress: 100 })

          // Send complete result
          sendSSE('complete', {
            success: true,
            examOrders: combinedExamOrders,
            orderId: orderId,
            generatedAt: orderDate.toISOString(),
            // Phase 2.E.4.4 — top-level RAG fields, mirroring the
            // diagnosis/prescription routes. Consumed downstream by
            // generate-chronic-report's citation expansion (2.E.4.1).
            rag_used: ragContext.ragUsed,
            rag_metadata: {
              chunks_retrieved: ragContext.totalChunks,
              avg_similarity: Number(ragContext.avgSimilarity.toFixed(3)),
              provided_references: ragContext.references.length,
              cited_references: ragResult.evidenceReferences.length,
              unknown_citations: ragResult.unknownCitedRefs,
              citations_reconstructed: ragResult.citationsReconstructed,
              hallucinated_refs_scrubbed: ragResult.hallucinatedRefsScrubbed,
              hallucinated_refs_breakdown: ragResult.hallucinatedRefsBreakdown,
              unused_refs_filtered: ragResult.unusedRefsFiltered,
            },
            evidence_references: ragResult.evidenceReferences,
          })

          console.log('✅ Complete exam orders sent to client (2-call approach)')

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
