// app/api/chronic-diagnosis/route.ts - Specialist-Level Chronic Disease Diagnosis API
// VERSION 5.0: 2-call hybrid approach for reliability + quality
// - Call 1: Disease Assessment + Medication Management (reasoning: medium, 16K budget)
// - Call 2: Meal Plan + Objectives & Follow-up (no reasoning, ~6K budget)
import { type NextRequest, NextResponse } from "next/server"
import { callLLM } from '@/lib/llm-client'
import {
  buildClinicalQuery,
  buildSecondaryQueries,
  inferSpecialty,
  queryMedicalGuidelines,
  queryMedicalGuidelinesMulti,
  formatGuidelinesForPrompt,
  scrubAndEnrichEvidenceRefs,
  type RAGContext,
} from '@/lib/rag/medical-rag'

export const runtime = 'nodejs'
export const maxDuration = 600 // 600s: chronic-diagnosis runs 2 sequential DeepSeek-V4-Pro reasoning calls (clinical analysis + structured plans). Each can take 150-250s, so the previous 300s cap was tripping FUNCTION_INVOCATION_TIMEOUT mid-stream.

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
  _apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000,
  useReasoning: boolean = false
): Promise<any> {
  // Reasoning models route reasoning tokens through max_completion_tokens, so
  // budget a floor of 16k when reasoning is on to leave room for the JSON output.
  const effectiveMaxTokens = useReasoning ? Math.max(maxTokens, 16384) : maxTokens

  const llmResult = await callLLM({
    useCase: 'CHRONIC_DIAGNOSIS',
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    maxTokens: effectiveMaxTokens,
    responseFormat: 'json_object',
    reasoningEffort: useReasoning ? 'medium' : 'none',
    timeoutMs: 280_000,
  })
  console.log(`[llm] use=CHRONIC_DIAGNOSIS provider=${llmResult.provider} model=${llmResult.model} latency=${llmResult.latencyMs}ms tokens=${llmResult.usage?.totalTokens ?? 'n/a'}`)

  const content = llmResult.text

  if (!content) {
    throw new Error('No content in LLM response')
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
      throw new Error(`Invalid JSON from LLM. First 200 chars: ${content.substring(0, 200)}`)
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
  // Credential validation delegated to callLLM (LLM_PROVIDER_CHRONIC_DIAGNOSIS).
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
          // ========== RAG ENRICHMENT (TIBOK guidelines) — best-effort, non-blocking ==========
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
              chiefComplaint: clinicalData.chiefComplaint || 'Suivi maladie chronique',
              symptoms: clinicalData.symptoms || [],
              ageYears: anonymizedPatient.age,
              sex: anonymizedPatient.gender,
              medicalHistory: chronicDiseases,
              vitalSigns: clinicalData.vitalSigns,
              duration: clinicalData.symptomDuration,
            })
            // For chronic, let inferSpecialty decide (often endocrinology for diabetes,
            // cardiology for HTA). Fall back to broad search when scorer is unsure.
            const inferredSpecialty = inferSpecialty(ragQuery)
            console.log(`📚 [RAG-CHRONIC] Querying guidelines (specialty=${inferredSpecialty ?? 'any'})`)
            console.log(`📚 [RAG-CHRONIC] Query: ${ragQuery.slice(0, 200)}${ragQuery.length > 200 ? '…' : ''}`)

            // Phase 2.E.4.3: multi-query when secondary topics are detected.
            // For chronic, the relevant secondary is bacterial_workup (e.g.
            // infectious decompensation in a diabetic with prolonged fever);
            // malaria can also fire if the chronic patient happens to have
            // travelled to an endemic area. buildSecondaryQueries handles
            // both; if it returns [] we transparently fall back to the
            // single-query path below — same retrieval coverage as before.
            const secondaryQueries = buildSecondaryQueries({
              chiefComplaint: clinicalData.chiefComplaint || 'Suivi maladie chronique',
              symptoms: clinicalData.symptoms || [],
              travelHistory: clinicalData.diseaseHistory,
              symptomDuration: clinicalData.symptomDuration,
              ageYears: anonymizedPatient.age,
            })
            if (secondaryQueries.length > 0) {
              console.log(
                `📚 [RAG-CHRONIC] Secondary queries triggered: ${secondaryQueries.map(q => q.label).join(', ')}`
              )
              ragContext = await queryMedicalGuidelinesMulti(
                ragQuery,
                secondaryQueries,
                { specialty: inferredSpecialty, limit: 10 }
              )
            } else {
              console.log('📚 [RAG-CHRONIC] No secondary queries triggered — running single-query retrieval')
              ragContext = await queryMedicalGuidelines(ragQuery, { specialty: inferredSpecialty, limit: 15 })
            }
            console.log(
              `📚 [RAG-CHRONIC] Retrieved ${ragContext.totalChunks} chunks ` +
                `(avg similarity ${ragContext.avgSimilarity.toFixed(2)}, refs: ${ragContext.references.length})`
            )
            ragPromptBlock = formatGuidelinesForPrompt(ragContext)
          } catch (ragErr: any) {
            console.error('📚 [RAG-CHRONIC] Enrichment failed (non-blocking):', ragErr?.message || ragErr)
          }

          // ========== CALL 1: Clinical Reasoning — Disease Assessment + Medication Management (50%) ==========
          sendSSE('progress', { message: 'Analyse clinique approfondie des maladies chroniques...', progress: 10 })
          console.log('🧠 Call 1: Clinical Reasoning — Disease Assessment + Medication Management')

          const call1SystemPrompt = `${ragPromptBlock ? ragPromptBlock + '\n\n' : ''}Tu es un endocrinologue senior spécialisé en pharmacologie.
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
  },
  "evidence_references": [
    { "ref_id": "ref-1", "used_for": "Description précise de l'usage de cette guideline dans tes recommandations" }
  ]
}
Si pas de médicaments à modifier, retourne des tableaux vides pour continue/add/adjust/stop.
Si le RAG n'a fourni aucune guideline (pas de bloc CONTEXTE GUIDELINES MÉDICALES ci-dessus), retourne evidence_references: [].`
          const clinicalAnalysis = await callOpenAI('', call1SystemPrompt, patientContext, 8000, true)

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

          const call2SystemPrompt = `${ragPromptBlock ? ragPromptBlock + '\n\n' : ''}Tu es un diététicien clinique ET endocrinologue senior.
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
}

Si une recommandation s'appuie sur une guideline du bloc CONTEXTE GUIDELINES MÉDICALES ci-dessus, cite [ref-N] dans le texte de la recommandation (ex: "viser HbA1c < 7% [ref-1]").`
          // Call 2 builds the full meal plan + objectives + follow-up plan in one shot.
          // DeepSeek-V4-Pro is noticeably more verbose than gpt-5.5 on these deeply
          // nested JSONs, so the previous 6000-token cap was getting hit mid-string
          // ("Invalid JSON from LLM" with the response truncated). 16000 leaves
          // ample headroom without coming close to the model's context cap.
          const structuredPlans = await callOpenAI('', call2SystemPrompt, patientContext, 16000)

          sendSSE('progress', { message: 'Finalisation de l\'évaluation...', progress: 90 })

          // ========== COMBINE RESULTS ==========
          console.log('✅ Both calls completed, combining results...')

          const combinedAssessment: any = {
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
            },
            // LLM-emitted citations from Call 1's evidence_references field;
            // walked + filtered + enriched by scrubAndEnrichEvidenceRefs below.
            evidence_references: Array.isArray(clinicalAnalysis.evidence_references)
              ? clinicalAnalysis.evidence_references
              : []
          }

          // RAG: scrub hallucinated [ref-N] from narrative, drop unused refs,
          // normalise bracketed ref_id, enrich with full metadata. Same helper
          // as openai-diagnosis and dermatology-diagnosis.
          const ragResult = scrubAndEnrichEvidenceRefs(
            combinedAssessment,
            ragContext,
            { logPrefix: '📚 [RAG-CHRONIC]' }
          )
          combinedAssessment.evidence_references = ragResult.evidenceReferences
          combinedAssessment.rag_used = ragContext.ragUsed
          combinedAssessment.rag_metadata = {
            chunks_retrieved: ragContext.totalChunks,
            avg_similarity: Number(ragContext.avgSimilarity.toFixed(3)),
            provided_references: ragContext.references.length,
            cited_references: ragResult.evidenceReferences.length,
            unknown_citations: ragResult.unknownCitedRefs,
            citations_reconstructed: ragResult.citationsReconstructed,
            hallucinated_refs_scrubbed: ragResult.hallucinatedRefsScrubbed,
            hallucinated_refs_breakdown: ragResult.hallucinatedRefsBreakdown,
            unused_refs_filtered: ragResult.unusedRefsFiltered,
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
