// app/api/chronic-prescription/route.ts - Chronic Disease Medication Prescription API
// Generates prescriptions for chronic disease medications (antidiabetics, antihypertensives, statins, etc.)
import { type NextRequest, NextResponse } from "next/server"
import { callLLM } from '@/lib/llm-client'
import { parseLLMJsonSafely } from '@/lib/llm/json-recovery'
import {
  buildClinicalQuery,
  inferSpecialty,
  queryMedicalGuidelines,
  formatGuidelinesForPrompt,
  scrubAndEnrichEvidenceRefs,
  filterEvidenceRefsByTopic,
  type RAGContext,
} from '@/lib/rag/medical-rag'

export const runtime = 'nodejs'
export const maxDuration = 600 // 600s for DeepSeek-V4-Pro chronic prescription generation

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
    nationalId: patientData?.nationalId || '',
    city: patientData?.city || '',
    country: patientData?.country || ''
  }

  const anonymized = { ...patientData }
  const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'nationalId', 'city', 'country']

  sensitiveFields.forEach(field => {
    delete anonymized[field]
  })

  const anonymousId = `ANON-RX-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId

  console.log('🔒 Patient data anonymized for chronic prescription')

  return { anonymized, originalIdentity, anonymousId }
}

export async function POST(req: NextRequest) {
  try {
    const { patientData, clinicalData, diagnosisData, reportData } = await req.json()

    // Anonymize patient data before sending to AI
    const { anonymized: anonymizedPatient, originalIdentity, anonymousId } = anonymizePatientData(patientData)

    // Calculate BMI for medication dosing considerations
    const weight = parseFloat(anonymizedPatient.weight)
    const heightInMeters = parseFloat(anonymizedPatient.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    // Get current date for prescription
    const prescriptionDate = new Date()
    const prescriptionId = `ORD-CHR-${prescriptionDate.getFullYear()}-${String(prescriptionDate.getMonth() + 1).padStart(2, '0')}-${String(prescriptionDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    const systemPrompt = `You are a SENIOR ENDOCRINOLOGIST specialist prescribing medications for chronic disease management.

You MUST generate a COMPREHENSIVE PRESCRIPTION for chronic disease medications based on the diagnosis data provided.

CRITICAL REQUIREMENTS:

1. CHRONIC DISEASE MEDICATIONS:
   You must prescribe appropriate medications for:
   - DIABETES: Metformine, Gliclazide, Sitagliptine, Insulines (Lantus, Novorapid)
   - HYPERTENSION: IEC (Ramipril, Perindopril), ARA2 (Losartan, Valsartan), Beta-bloquants (Bisoprolol), Inhibiteurs calciques (Amlodipine), Diurétiques (HCTZ, Furosémide)
   - DYSLIPIDÉMIE: Statines (Atorvastatine, Rosuvastatine, Simvastatine), Fibrates (Fénofibrate)
   - CARDIOVASCULAR PROTECTION: Aspirine 100mg
   - SUPPLEMENTS: Vitamine D, Omega-3, etc.

2. PRESCRIPTION FORMAT:
   Each medication must include:
   - DCI (Dénomination Commune Internationale) - generic name
   - Commercial name (brand name if applicable)
   - Dosage form (comprimé, gélule, injection, etc.)
   - Strength (mg, UI, etc.)
   - Posology (precise dosage, frequency, timing)
   - Treatment duration (for chronic disease: usually "Long-term ongoing treatment" or specific duration)
   - Quantity to dispense
   - Renewals (usually renewable for chronic medications)
   - Administration instructions
   - Indication (which chronic disease)
   - Safety information (contraindications, side effects, monitoring)

3. MEDICATION SELECTION LOGIC:
   - If HbA1c > 7%: Add or increase antidiabetic
   - If BP > 130/80: Add or adjust antihypertensive
   - If LDL cholesterol elevated: Prescribe statin
   - Consider patient's current medications (from diagnosis data)
   - Follow medication management recommendations (continue/modify/add/stop)

4. SAFETY CHECKS:
   - Verify no contraindications based on patient profile
   - Check for drug interactions
   - Adjust dosages for:
     * Age (elderly patients: start low, go slow)
     * Renal function (if impaired, adjust Metformine, etc.)
     * Weight (for some medications)
   - Monitor for side effects

5. MAURITIUS HEALTHCARE CONTEXT:
   - Use International Nonproprietary Names (INN) - English medication names
   - Follow Mauritius formulary when possible
   - Include local availability considerations

Return ONLY valid JSON with this EXACT structure:
{
  "success": true,
  "prescription": {
    "prescriptionHeader": {
      "prescriptionId": "unique ID",
      "prescriptionType": "CHRONIC DISEASE LONG-TERM TREATMENT",
      "issueDate": "date",
      "issueTime": "time",
      "validityPeriod": "3-6 months (renewable)",
      "prescriber": {
        "name": "doctor name",
        "specialty": "Endocrinology / Internal Medicine",
        "medicalCouncilNumber": "MCM registration",
        "establishment": "practice location"
      },
      "patient": {
        "lastName": "last name",
        "firstName": "first name",
        "age": age,
        "weight": weight_kg,
        "bmi": bmi,
        "chronicDiseases": ["list of chronic diseases"]
      }
    },
    "chronicMedications": [
      {
        "lineNumber": 1,
        "category": "ANTIDIABETIC|ANTIHYPERTENSIVE|STATIN|ANTIPLATELET|SUPPLEMENT|OTHER",
        "dci": "generic name (DCI)",
        "brandName": "commercial name",
        "dosageForm": "form (comprimé, gélule, etc.)",
        "strength": "strength with unit",
        "atcCode": "ATC code if known",
        "posology": {
          "dosage": "precise dose",
          "frequency": "frequency (1x/jour, 2x/jour, etc.)",
          "timing": "when to take (matin, soir, repas, etc.)",
          "route": "route of administration",
          "specificInstructions": "special instructions"
        },
        "treatment": {
          "treatmentType": "LONG-TERM CHRONIC|SHORT-TERM INITIATION|ADJUSTMENT",
          "duration": "duration or 'Long-term ongoing treatment'",
          "totalQuantity": "quantity to dispense (with unit)",
          "renewals": "renewable or not",
          "renewalInstructions": "renewal instructions"
        },
        "indication": {
          "chronicDisease": "which disease (Diabète type 2, HTA, etc.)",
          "therapeuticGoal": "therapeutic objective",
          "clinicalRationale": "Full clinical reasoning for prescribing this medication for THIS patient (1-3 sentences). Embed [ref-N] tokens at the END of sentences supported by a guideline in the RAG block (e.g. 'First-line ACEi for stage 1 hypertension in adults under 55 [ref-1].'). STRICT TOPIC-MATCH: only cite refs whose title clearly addresses the same disease as the prescription (HTA guideline for an antihypertensive, diabetes guideline for an antidiabetic, etc.). NEVER cite an off-topic ref just to attach evidence — an unsourced indication is preferable to a misleading citation.",
          "expectedBenefit": "expected clinical benefit"
        },
        "safetyProfile": {
          "contraindications": {
            "absolute": ["list"],
            "relative": ["list"],
            "patientStatus": "status in this patient"
          },
          "commonSideEffects": ["list of common side effects"],
          "seriousSideEffects": ["list of serious side effects"],
          "warningSignsToReport": "signs requiring medical attention"
        },
        "monitoring": {
          "clinicalMonitoring": "what to monitor clinically",
          "laboratoryMonitoring": "lab tests required (e.g., HbA1c, créatinine, etc.)",
          "monitoringFrequency": "how often to monitor"
        },
        "patientInstructions": {
          "administrationInstructions": "how to take properly",
          "storageInstructions": "how to store",
          "missedDoseInstructions": "what to do if missed",
          "lifestyleRecommendations": "lifestyle advice related to medication"
        },
        "adjustmentCriteria": {
          "titrationPlan": "dose adjustment plan if applicable",
          "targetParameters": "target values to achieve",
          "adjustmentTriggers": "when to adjust dose"
        }
      }
    ],
    "medicationSummary": {
      "totalMedications": number,
      "byCategory": {
        "antidiabetics": number,
        "antihypertensives": number,
        "statins": number,
        "antiplatelets": number,
        "supplements": number,
        "others": number
      },
      "polypharmacyRisk": "LOW|MODERATE|HIGH (based on number and interactions)",
      "adherenceConsiderations": "factors affecting medication adherence",
      "costEstimate": "estimated monthly cost if known",
      "simplificationOpportunities": "suggestions to simplify regimen"
    },
    "pharmacologicalPlan": {
      "currentRegimen": "summary of prescribed regimen",
      "therapeuticStrategy": "overall therapeutic strategy",
      "shortTermGoals": "goals for next 1-3 months",
      "longTermGoals": "goals for 6-12 months",
      "reviewSchedule": "when to review medications"
    },
    "pharmacistNotes": {
      "dispensingInstructions": "special instructions for pharmacist",
      "counselingPoints": "key points for patient counseling",
      "interactionAlerts": "important interaction alerts"
    },
    "prescriptionValidation": {
      "appropriateSelection": "medications appropriate for diagnoses",
      "dosesVerified": "doses checked for patient profile",
      "interactionsChecked": "drug interactions verified",
      "contraindications Check": "contraindications reviewed",
      "monitoringPlanDefined": "monitoring plan established",
      "safetyScore": number_0_to_100
    }
  }
}

IMPORTANT:
1. Base medication selection on diagnosis data (diseaseAssessment, medicationManagement)
2. If diagnosis recommends "continue" → prescribe existing medications
3. If diagnosis recommends "adjust" → prescribe with new dosage
4. If diagnosis recommends "add" → add new medications to prescription
5. If diagnosis recommends "stop" → DO NOT prescribe those medications
6. Ensure all chronic diseases are covered with appropriate medications
7. Include cardiovascular protection (Aspirine) if diabetes + CV risk
8. Consider supplements (Vitamin D) if indicated
9. Use International Nonproprietary Names (INN) - English terminology with Anglo-Saxon standards
10. Make prescription COMPREHENSIVE and SAFE`

    // ANONYMIZED patient context - no personal identifiers sent to AI
    const patientContext = `
PRESCRIPTION DATE: ${prescriptionDate.toLocaleDateString('fr-MU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
TIME: ${prescriptionDate.toLocaleTimeString('fr-MU', { hour: '2-digit', minute: '2-digit' })}
PRESCRIPTION ID: ${prescriptionId}

PATIENT INFORMATION:
- Patient ID: ${anonymousId}
- Age: ${anonymizedPatient.age} years ${anonymizedPatient.age >= 65 ? '(ELDERLY - Dosage caution)' : ''}
- Gender: ${anonymizedPatient.gender}
- Weight: ${weight} kg
- Height: ${anonymizedPatient.height} cm
- BMI: ${bmi.toFixed(1)} kg/m² (${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese'})

GYNECOLOGICAL STATUS (if female):
${anonymizedPatient.gender?.toLowerCase() === 'female' || anonymizedPatient.gender?.toLowerCase() === 'femme' ? `
- Pregnancy Status: ${anonymizedPatient.pregnancyStatus || 'Not specified'}
- Last Menstrual Period: ${anonymizedPatient.lastMenstrualPeriod || 'Not specified'}
- Gestational Age: ${anonymizedPatient.gestationalAge || 'Not applicable'}
` : '- Not applicable (male patient)'}

CHRONIC DISEASES & MEDICAL HISTORY:
${(anonymizedPatient.medicalHistory || []).map((d: string, i: number) => `${i + 1}. ${d}`).join('\n') || '- None declared'}
${anonymizedPatient.otherMedicalHistory ? `\nAdditional Medical History: ${anonymizedPatient.otherMedicalHistory}` : ''}

CURRENT MEDICATIONS (TO REVIEW):
${anonymizedPatient.currentMedicationsText || anonymizedPatient.currentMedications || 'None reported'}

ALLERGIES (CRITICAL FOR PRESCRIPTION SAFETY):
${Array.isArray(anonymizedPatient.allergies) ? anonymizedPatient.allergies.join(', ') : (anonymizedPatient.allergies || 'No known allergies')}
${anonymizedPatient.otherAllergies ? `\nOther Allergies: ${anonymizedPatient.otherAllergies}` : ''}

LIFESTYLE HABITS (may affect medication choice):
- Smoking: ${anonymizedPatient.lifeHabits?.smoking || 'Not specified'}
- Alcohol Consumption: ${anonymizedPatient.lifeHabits?.alcohol || 'Not specified'}
- Physical Activity: ${anonymizedPatient.lifeHabits?.physicalActivity || 'Not specified'}

CURRENT CLINICAL EXAMINATION DATA:
${clinicalData ? `
- Chief Complaint: ${clinicalData.chiefComplaint || 'Not specified'}
- Symptom Duration: ${clinicalData.symptomDuration || 'Not specified'}
- Blood Pressure: ${clinicalData.vitalSigns?.bloodPressureSystolic || 'Not measured'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || 'Not measured'} mmHg
- Blood Glucose: ${clinicalData.vitalSigns?.bloodGlucose || 'Not measured'} g/L
- Heart Rate: ${clinicalData.vitalSigns?.heartRate || 'Not measured'} bpm
- Last HbA1c: ${clinicalData.chronicDiseaseSpecific?.lastHbA1c || 'Not available'} (Date: ${clinicalData.chronicDiseaseSpecific?.lastHbA1cDate || 'N/A'})
- Last Lipid Panel: ${clinicalData.chronicDiseaseSpecific?.lastLipidPanel || 'Not available'}
- Medication Adherence: ${clinicalData.chronicDiseaseSpecific?.medicationAdherence || 'Not reported'}
- Side Effects: ${clinicalData.chronicDiseaseSpecific?.sideEffects || 'None reported'}
- Complications Screening:
  * Vision Changes: ${clinicalData.chronicDiseaseSpecific?.complications?.visionChanges || 'None'}
  * Foot Problems: ${clinicalData.chronicDiseaseSpecific?.complications?.footProblems || 'None'}
  * Chest Pain: ${clinicalData.chronicDiseaseSpecific?.complications?.chestPain || 'None'}
  * Shortness of Breath: ${clinicalData.chronicDiseaseSpecific?.complications?.shortnessOfBreath || 'None'}
` : 'Clinical data not available'}

DIAGNOSIS DATA (BASIS FOR PRESCRIPTION):
${JSON.stringify(diagnosisData, null, 2)}

MEDICATION MANAGEMENT RECOMMENDATIONS FROM DIAGNOSIS:
${diagnosisData.medicationManagement ? JSON.stringify(diagnosisData.medicationManagement, null, 2) : 'Not provided'}

REPORT DATA (IF AVAILABLE):
${reportData ? JSON.stringify(reportData.structuredData?.therapeuticPlan, null, 2) : 'Not yet generated'}

DOCTOR INFORMATION:
- Name: Dr. ${patientData.doctorName || 'TIBOKai DOCTOR'}
- Specialty: Endocrinology / Internal Medicine
- MCM Number: ${patientData.doctorMCM || 'MCM-XXXXXXXXX'}

PRESCRIPTION INSTRUCTIONS:
1. Review the diagnosis data carefully
2. Identify all chronic diseases present (diabetes, hypertension, obesity, etc.)
3. For each disease, prescribe appropriate long-term medications
4. Follow the medication management recommendations:
   - CONTINUE: Prescribe existing medications unchanged
   - ADJUST: Prescribe with new dosage
   - ADD: Add new medications to regimen
   - STOP: Do NOT include these medications
5. Ensure comprehensive coverage:
   - Diabetes: At least one antidiabetic (Metformine first line)
   - Hypertension: At least one antihypertensive (IEC/ARA2 preferred)
   - High cholesterol: Statin if needed
   - CV protection: Aspirine 100mg if diabetes + high CV risk
   - Supplements: Vitamin D if deficiency suspected
6. Use chronic disease medication dosages:
   - Metformine: 500-1000mg 2x/jour
   - Ramipril: 2.5-10mg 1x/jour
   - Atorvastatine: 10-80mg 1x/jour
   - Gliclazide: 30-120mg 1x/jour
   - Amlodipine: 5-10mg 1x/jour
7. All chronic medications should be "Long-term ongoing treatment - Renewable"
8. Include complete safety information and monitoring requirements
9. Write in ENGLISH with Anglo-Saxon medical standards (UK/US medical terminology)
10. Generate COMPLETE JSON with ALL required fields

Generate the comprehensive chronic disease prescription now.`

    // Phase 2.E.4.4 — RAG enrichment for chronic medication prescription.
    // Same chain as chronic-diagnosis: build query, infer specialty, retrieve
    // chunks, prepend the formatted block to the system prompt. The LLM is
    // instructed (via formatGuidelinesForPrompt) to cite [ref-N] in
    // medication "indication" / "rationale" fields when a guideline supports
    // the prescription. Best-effort: if retrieval fails the route falls back
    // to the existing prompt unchanged.
    let ragContext: RAGContext = {
      chunks: [],
      references: [],
      totalChunks: 0,
      avgSimilarity: 0,
      ragUsed: false,
    }
    let ragPromptBlock = ''
    try {
      const ragQuery = buildClinicalQuery({
        chiefComplaint: clinicalData?.chiefComplaint || 'Suivi maladie chronique',
        symptoms: clinicalData?.symptoms || [],
        ageYears: anonymizedPatient.age,
        sex: anonymizedPatient.gender,
        medicalHistory: anonymizedPatient.medicalHistory || [],
        vitalSigns: clinicalData?.vitalSigns,
        duration: clinicalData?.symptomDuration,
      })
      const inferredSpecialty = inferSpecialty(ragQuery)
      const inferredSpecialtyPattern = inferredSpecialty ? `${inferredSpecialty}%` : null
      console.log(`📚 [RAG-CHRONIC-PRESCRIPTION] Querying guidelines (specialty=${inferredSpecialtyPattern ?? 'any'})`)
      ragContext = await queryMedicalGuidelines(ragQuery, { specialty: inferredSpecialtyPattern, limit: 15 })
      console.log(
        `📚 [RAG-CHRONIC-PRESCRIPTION] Retrieved ${ragContext.totalChunks} chunks ` +
          `(avg similarity ${ragContext.avgSimilarity.toFixed(2)}, refs: ${ragContext.references.length})`
      )
      ragPromptBlock = formatGuidelinesForPrompt(ragContext)
    } catch (ragErr: any) {
      console.error('📚 [RAG-CHRONIC-PRESCRIPTION] Enrichment failed (non-blocking):', ragErr?.message || ragErr)
    }

    const finalSystemPrompt = ragPromptBlock
      ? `${ragPromptBlock}\n\n${systemPrompt}`
      : systemPrompt

    console.log('🤖 Calling LLM (callLLM, JSON mode) for chronic prescription...')

    let llmResult
    try {
      llmResult = await callLLM({
        useCase: 'CHRONIC_PRESCRIPTION',
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: patientContext }
        ],
        maxTokens: 8000,
        responseFormat: 'json_object',
        // Prescription assembly is structured JSON output, not novel reasoning —
        // DeepSeek-V4-Pro default 'medium' reasoning was burning 200-500s of
        // CoT, pushing total time past the 600s cap (observed 504 in prod).
        // 'low' keeps output quality on this template-filling task while
        // bringing latency under 2-3 min.
        reasoningEffort: 'low',
        timeoutMs: 280_000,
      })
    } catch (llmErr: any) {
      console.error('❌ LLM call failed:', llmErr?.message || llmErr)
      return NextResponse.json(
        { error: 'LLM call failed', details: String(llmErr?.message || llmErr).substring(0, 200) },
        { status: 502 }
      )
    }

    const content = llmResult.text
    console.log(`[llm] use=CHRONIC_PRESCRIPTION provider=${llmResult.provider} model=${llmResult.model} latency=${llmResult.latencyMs}ms tokens=${llmResult.usage?.totalTokens ?? 'n/a'}`)

    if (!content) {
      console.error('❌ No content in LLM response')
      return NextResponse.json(
        { error: "No content in LLM response" },
        { status: 502 }
      )
    }

    console.log('✅ AI response received, length:', content.length)

    let prescriptionData
    try {
      // Use the shared JSON recovery ladder — DeepSeek v4-pro / v3-chat
      // occasionally close JSON with stray fragments after the final `}`
      // (e.g. trailing reasoning blocks) or truncate at maxTokens with an
      // unterminated string. The strict `JSON.parse` then threw and we
      // surfaced a generic 500 to the client even though the payload was
      // 95% recoverable. Same helper as chronic-diagnosis/chronic-examens.
      prescriptionData = parseLLMJsonSafely(content, 'CHRONIC_PRESCRIPTION')
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError.message)
      console.error("Raw content head:", content.substring(0, 400))
      console.error("Raw content tail:", content.substring(Math.max(0, content.length - 400)))
      return NextResponse.json(
        { error: "Failed to parse prescription data", details: parseError.message },
        { status: 500 }
      )
    }

    // Tolerant structure validation: an HTA stage-1 / lifestyle-first case
    // can legitimately produce no medications. Coerce to an empty
    // chronicMedications array rather than 500'ing — the rest of the route
    // (RAG scrub, frontend rendering) handles an empty array fine, and a
    // missing `prescription` object is recovered into a minimal shape.
    if (!prescriptionData.prescription) {
      console.warn("LLM response missing 'prescription' wrapper — synthesizing empty shell")
      prescriptionData.prescription = {
        prescriptionHeader: {},
        chronicMedications: [],
      }
    }
    if (!Array.isArray(prescriptionData.prescription.chronicMedications)) {
      console.warn("LLM response missing 'chronicMedications' array — defaulting to [] (lifestyle-first case)")
      prescriptionData.prescription.chronicMedications = []
    }

    // Phase 2.E.4.4 — scrub hallucinated [ref-N], filter unused refs, enrich
    // with metadata. Walk the entire prescriptionData tree (medications +
    // any nested rationale/indication strings) so [ref-N] tokens emitted in
    // medication "indication" / "rationale" fields are validated.
    const ragResult = scrubAndEnrichEvidenceRefs(
      prescriptionData,
      ragContext,
      { logPrefix: '📚 [RAG-CHRONIC-PRESCRIPTION]' }
    )
    // Topic-match safety net — seeds derived from the chronic diseases the
    // upstream diagnosis flagged + the prescribed medication DCIs.
    const presTopicSeeds: string[] = []
    const presDA = diagnosisData?.diseaseAssessment || {}
    if (presDA.diabetes?.present) presTopicSeeds.push('diabetes', 'glucose', 'insulin', 'metformin', 'gliclazide')
    if (presDA.hypertension?.present) presTopicSeeds.push('hypertension', 'blood pressure', 'antihypertensive', 'ace', 'arb', 'beta-blocker')
    if (presDA.obesity?.present) presTopicSeeds.push('obesity', 'weight')
    if (Array.isArray(anonymizedPatient.medicalHistory)) {
      presTopicSeeds.push(...anonymizedPatient.medicalHistory)
    }
    const presFiltered = filterEvidenceRefsByTopic(
      ragResult.evidenceReferences,
      presTopicSeeds,
      {
        logPrefix: '🎯 [TOPIC-FILTER-CHRONIC-PRESCRIPTION]',
        patientFlags: {
          isPregnant: /\b(pregn|enceinte|gestational|gravid)/i.test(String(anonymizedPatient.pregnancyStatus || '')),
          isChild: typeof anonymizedPatient.age === 'number' ? anonymizedPatient.age < 18 :
            /^(\d+)/.test(String(anonymizedPatient.age || ''))
              ? parseInt(String(anonymizedPatient.age), 10) < 18
              : false,
          hasCancer: Array.isArray(anonymizedPatient.medicalHistory) &&
            anonymizedPatient.medicalHistory.some((d: string) =>
              /\b(cancer|carcinoma|melanoma|lymphoma|leukemi|leukaemi|sarcoma|metastat|oncolog|tumou?r|neoplas)/i.test(String(d || ''))
            ),
        },
      }
    )
    ragResult.evidenceReferences = presFiltered.kept

    // Defensive auto-cite: if a chronicMedication's indication.clinicalRationale
    // doesn't already contain [ref-N] and we have at least one evidence ref,
    // append the first one. Same principle as dermato/chronic-examens — the
    // prescription's Indication field is what the doctor / pharmacist sees;
    // an unattributed prescription rationale looks like personal opinion.
    const availableRefIds = Array.isArray(ragResult.evidenceReferences)
      ? ragResult.evidenceReferences
          .map((r: any) => r?.ref_id)
          .filter((r): r is string => typeof r === 'string' && r.length > 0)
      : []
    if (availableRefIds.length > 0) {
      const firstRef = availableRefIds[0].startsWith('ref-')
        ? `[${availableRefIds[0]}]`
        : `[ref-${availableRefIds[0]}]`
      const cite = (raw: unknown): string => {
        const s = typeof raw === 'string' ? raw : ''
        if (!s.trim()) return s
        if (/\[ref-\d+\]/i.test(s)) return s
        const sep = s.trim().endsWith('.') ? ' ' : '. '
        return `${s.trim()}${sep}${firstRef}`
      }
      const meds = (prescriptionData as any)?.prescription?.chronicMedications
      if (Array.isArray(meds)) {
        for (const m of meds) {
          if (m?.indication && typeof m.indication === 'object') {
            m.indication.clinicalRationale = cite(m.indication.clinicalRationale)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      prescription: prescriptionData.prescription,
      prescriptionId: prescriptionId,
      generatedAt: prescriptionDate.toISOString(),
      // Phase 2.E.4.4 — top-level RAG fields, mirroring openai-diagnosis /
      // chronic-diagnosis / dermatology-diagnosis. Consumed downstream by
      // generate-chronic-report's citation expansion.
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

  } catch (error: any) {
    console.error("Chronic Prescription API Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate chronic disease prescription",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
