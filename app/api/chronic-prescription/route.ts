// app/api/chronic-prescription/route.ts - Chronic Disease Medication Prescription API
// Generates prescriptions for chronic disease medications (antidiabetics, antihypertensives, statins, etc.)
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'
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
          "clinicalRationale": "why this medication is prescribed",
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

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    console.log('🤖 Calling OpenAI API (direct fetch, JSON mode) for chronic prescription...')

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: patientContext }
        ],
        max_completion_tokens: 8000,
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ OpenAI API error (${response.status}):`, errorText.substring(0, 300))
      return NextResponse.json(
        { error: `OpenAI API error (${response.status})`, details: errorText.substring(0, 200) },
        { status: 502 }
      )
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const content = choice?.message?.content

    console.log(`📡 OpenAI response - finish_reason: ${choice?.finish_reason}, usage: ${JSON.stringify(data.usage || {})}`)

    if (!content) {
      console.error('❌ No content in OpenAI response:', JSON.stringify(data, null, 2).substring(0, 500))
      return NextResponse.json(
        { error: "No content in OpenAI response" },
        { status: 502 }
      )
    }

    console.log('✅ AI response received, length:', content.length)

    let prescriptionData
    try {
      prescriptionData = JSON.parse(content)
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError.message)
      return NextResponse.json(
        { error: "Failed to parse prescription data", details: parseError.message },
        { status: 500 }
      )
    }

    // Validate essential fields
    if (!prescriptionData.prescription || !prescriptionData.prescription.chronicMedications) {
      console.error("Missing essential prescription fields:", prescriptionData)
      return NextResponse.json(
        { error: "Incomplete prescription generated" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      prescription: prescriptionData.prescription,
      prescriptionId: prescriptionId,
      generatedAt: prescriptionDate.toISOString()
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
