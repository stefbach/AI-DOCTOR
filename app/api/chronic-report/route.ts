// app/api/chronic-report/route.ts - PROFESSIONAL Chronic Disease Report with SAME STRUCTURE as consultation-report
// Uses EXACT SAME LOGIC as generate-consultation-report for consistency (NO EMOJIS, NO COLORS)
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import OpenAI from "openai"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

// ==================== HELPER FUNCTIONS ====================
function getString(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function calculateAge(birthDate: string): number {
  if (!birthDate) return 0
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// ==================== DATA EXTRACTION FROM DIAGNOSIS ====================
function extractChronicDiseaseData(diagnosisData: any, patientData: any, clinicalData: any) {
  console.log("📊 EXTRACTING CHRONIC DISEASE DATA...")
  
  // =========== 1. CHIEF COMPLAINT & CONSULTATION REASON ===========
  const chiefComplaint = getString(
    clinicalData?.chiefComplaint ||
    diagnosisData?.consultationReason ||
    "Chronic disease follow-up consultation"
  )
  
  // =========== 2. MEDICAL HISTORY ===========
  const chronicDiseases = Array.isArray(patientData.medicalHistory) 
    ? patientData.medicalHistory 
    : (patientData.medicalHistory ? [patientData.medicalHistory] : [])
  
  const medicalHistoryText = chronicDiseases.length > 0
    ? `Patient has documented history of: ${chronicDiseases.join(', ')}. ${getString(clinicalData?.medicalHistory || '')}`
    : "No significant chronic diseases documented in medical record."
  
  // =========== 3. CURRENT MEDICATIONS ===========
  const currentMedications = getString(
    patientData.currentMedicationsText || 
    patientData.currentMedications ||
    "No current medications reported"
  )
  
  // =========== 4. CLINICAL EXAMINATION ===========
  const vitalSigns = clinicalData?.vitalSigns || {}
  const clinicalExamination = `VITAL SIGNS:\n` +
    `- Blood Pressure: ${vitalSigns.bloodPressureSystolic || 'Not measured'}/${vitalSigns.bloodPressureDiastolic || 'Not measured'} mmHg\n` +
    `- Blood Glucose: ${vitalSigns.bloodGlucose || 'Not measured'} g/L\n` +
    `- Heart Rate: ${vitalSigns.heartRate || 'Not measured'} bpm\n` +
    `- Temperature: ${vitalSigns.temperature || 'Not measured'} °C\n` +
    `- Weight: ${patientData.weight || 'Not measured'} kg\n` +
    `- BMI: ${patientData.bmi || 'Not calculated'} kg/m²\n\n` +
    getString(clinicalData?.examination || "Clinical assessment conducted via teleconsultation.")
  
  // =========== 5. DISEASE ASSESSMENTS ===========
  const diabetesAssessment = diagnosisData?.diseaseAssessments?.diabetes || {}
  const hypertensionAssessment = diagnosisData?.diseaseAssessments?.hypertension || {}
  const obesityAssessment = diagnosisData?.diseaseAssessments?.obesity || {}
  
  // =========== 6. MANAGEMENT PLAN ===========
  const managementPlan = getString(
    diagnosisData?.managementPlan?.therapeutic_approach ||
    diagnosisData?.therapeuticPlan?.summary ||
    "Comprehensive chronic disease management approach with medication optimization, lifestyle modifications, and regular monitoring."
  )
  
  // =========== 7. DIETARY PLAN ===========
  const dietaryPlan = getString(
    diagnosisData?.dietaryPlan?.summary ||
    diagnosisData?.lifestyle?.dietSummary ||
    "Balanced diet appropriate for chronic disease management with emphasis on portion control and nutritional quality."
  )
  
  // =========== 8. SELF-MONITORING ===========
  const selfMonitoring = getString(
    diagnosisData?.selfMonitoring?.instructions ||
    diagnosisData?.monitoring?.selfMonitoring?.summary ||
    "Regular home monitoring of relevant parameters with documentation in patient logbook."
  )
  
  // =========== 9. FOLLOW-UP SCHEDULE ===========
  const followUpSchedule = getString(
    diagnosisData?.followUpPlan?.schedule ||
    diagnosisData?.followUp?.nextGeneralConsultation?.timing ||
    "Follow-up consultation in 3 months, with interim laboratory monitoring as indicated."
  )
  
  // =========== 10. WARNING SIGNS ===========
  const warningSigns = getString(
    diagnosisData?.followUpPlan?.red_flags ||
    diagnosisData?.followUp?.warningSigns?.join(', ') ||
    "Severe symptoms, uncontrolled blood pressure, persistent hyperglycemia, signs of complications."
  )
  
  // =========== 11. MEDICATIONS (from diagnosis) ===========
  const medications: any[] = []
  
  // Continue medications
  const continueMeds = diagnosisData?.therapeuticPlan?.medications?.continue || []
  continueMeds.forEach((med: any) => {
    medications.push({
      name: getString(med.name || med.medication),
      dosage: getString(med.dosage),
      frequency: getString(med.frequency),
      indication: getString(med.indication),
      action: 'continue'
    })
  })
  
  // New medications
  const addMeds = diagnosisData?.therapeuticPlan?.medications?.add || []
  addMeds.forEach((med: any) => {
    medications.push({
      name: getString(med.name || med.medication),
      dosage: getString(med.dosage),
      frequency: getString(med.frequency),
      indication: getString(med.indication),
      monitoring: getString(med.monitoring),
      action: 'add'
    })
  })
  
  // Modified medications
  const modifyMeds = diagnosisData?.therapeuticPlan?.medications?.modify || []
  modifyMeds.forEach((med: any) => {
    medications.push({
      name: getString(med.name || med.medication),
      previousDosage: getString(med.previousDosage),
      newDosage: getString(med.newDosage),
      rationale: getString(med.rationale),
      action: 'modify'
    })
  })
  
  // Stopped medications
  const stopMeds = diagnosisData?.therapeuticPlan?.medications?.stop || []
  stopMeds.forEach((med: any) => {
    medications.push({
      name: getString(med.name || med.medication),
      rationale: getString(med.rationale),
      action: 'stop'
    })
  })
  
  // =========== 12. LAB TESTS ===========
  const labTests: any[] = []
  const laboratoryTests = diagnosisData?.monitoring?.laboratoryTests || []
  
  laboratoryTests.forEach((test: any) => {
    labTests.push({
      name: getString(test.test || test.name),
      indication: getString(test.indication),
      timing: getString(test.timing),
      fasting: test.fasting || false,
      target: getString(test.target || '')
    })
  })
  
  // =========== 13. IMAGING STUDIES ===========
  const imagingStudies: any[] = []
  const paraclinicalExams = diagnosisData?.monitoring?.paraclinicalExams || []
  
  paraclinicalExams.forEach((exam: any) => {
    imagingStudies.push({
      type: getString(exam.exam || exam.type),
      indication: getString(exam.indication),
      timing: getString(exam.timing),
      urgency: exam.urgency || 'routine'
    })
  })
  
  // =========== 14. COMPLICATIONS SCREENING ===========
  const complicationsScreening = getString(
    diagnosisData?.complicationsScreening?.summary ||
    diagnosisData?.diseaseAssessments?.complications ||
    "Comprehensive screening for disease-specific complications performed."
  )
  
  // =========== 15. OVERALL ASSESSMENT ===========
  const overallAssessment = getString(
    diagnosisData?.overallAssessment?.clinical_impression ||
    diagnosisData?.assessment?.summary ||
    "Overall chronic disease control assessment with identification of therapeutic objectives."
  )
  
  console.log("✅ DATA EXTRACTION COMPLETE:")
  console.log(`   - Chief complaint: ${!!chiefComplaint}`)
  console.log(`   - Medications: ${medications.length}`)
  console.log(`   - Lab tests: ${labTests.length}`)
  console.log(`   - Imaging: ${imagingStudies.length}`)
  
  return {
    chiefComplaint,
    medicalHistoryText,
    currentMedications,
    clinicalExamination,
    diabetesAssessment,
    hypertensionAssessment,
    obesityAssessment,
    complicationsScreening,
    overallAssessment,
    managementPlan,
    dietaryPlan,
    selfMonitoring,
    followUpSchedule,
    warningSigns,
    medications,
    labTests,
    imagingStudies,
    medicationsCount: medications.length,
    labTestsCount: labTests.length,
    imagingStudiesCount: imagingStudies.length
  }
}

// ==================== GPT-4 DATA PREPARATION ====================
function prepareChronicDiseaseGPTData(extractedData: any, patientData: any) {
  return {
    // Patient info
    patient: {
      age: `${patientData.age || 'Unknown'} years`,
      gender: getString(patientData.gender || 'Not specified'),
      weight: `${patientData.weight || 'Not provided'} kg`,
      height: `${patientData.height || 'Not provided'} cm`,
      bmi: patientData.bmi ? `${patientData.bmi} kg/m²` : 'Not calculated',
      chronicDiseases: Array.isArray(patientData.medicalHistory) 
        ? patientData.medicalHistory 
        : (patientData.medicalHistory ? [patientData.medicalHistory] : [])
    },
    
    // Clinical presentation
    presentation: {
      chiefComplaint: extractedData.chiefComplaint,
      medicalHistory: extractedData.medicalHistoryText,
      currentMedications: extractedData.currentMedications,
      clinicalExamination: extractedData.clinicalExamination
    },
    
    // Disease assessments
    assessments: {
      diabetes: extractedData.diabetesAssessment,
      hypertension: extractedData.hypertensionAssessment,
      obesity: extractedData.obesityAssessment,
      complicationsScreening: extractedData.complicationsScreening,
      overallAssessment: extractedData.overallAssessment
    },
    
    // Treatment plan
    treatment: {
      managementPlan: extractedData.managementPlan,
      medications: extractedData.medications,
      dietaryPlan: extractedData.dietaryPlan,
      selfMonitoring: extractedData.selfMonitoring
    },
    
    // Follow-up
    followUp: {
      schedule: extractedData.followUpSchedule,
      warningSigns: extractedData.warningSigns,
      labTests: extractedData.labTests,
      imaging: extractedData.imagingStudies
    },
    
    // Summary
    summary: {
      medicationsCount: extractedData.medicationsCount,
      labTestsCount: extractedData.labTestsCount,
      imagingCount: extractedData.imagingStudiesCount
    }
  }
}

// ==================== GPT-4 PROMPTS (ADAPTED FOR CHRONIC DISEASES) ====================
function createChronicDiseaseSystemPrompt(): string {
  return `You are a senior endocrinologist writing professional medical reports in ENGLISH for chronic disease follow-up consultations in Mauritius.

Write professional medical reports using the provided COMPLETE CHRONIC DISEASE ANALYSIS.

IMPORTANT: You are receiving PRE-ANALYZED medical data including:
- Complete disease assessments (diabetes, hypertension, obesity)
- Current treatment validation and modifications
- Complications screening results
- Detailed management plan with therapeutic objectives
- Dietary plan and self-monitoring instructions
- Follow-up schedule with specialist referrals

Your task is to STRUCTURE this existing analysis into narrative form, NOT to re-analyze.

FORMATTING REQUIREMENTS:
- Each section must contain minimum 150-200 words
- Use the provided detailed analysis - do not invent new information
- Expand professionally on available information when sections need more content
- Maintain medical accuracy and professional tone
- Structure existing data into coherent narrative sections
- Use Anglo-Saxon medical terminology in ENGLISH
- NO EMOJIS, NO COLOR INDICATORS`
}

function createChronicDiseaseUserPrompt(enrichedData: any, patientData: any, doctorData: any): string {
  return `Based on this COMPLETE CHRONIC DISEASE ANALYSIS, generate a professional medical report in ENGLISH:

=== PATIENT INFORMATION ===
${JSON.stringify(enrichedData.patient, null, 2)}

=== CLINICAL PRESENTATION ===
Chief Complaint: ${enrichedData.presentation.chiefComplaint}
Medical History: ${enrichedData.presentation.medicalHistory}
Current Medications: ${enrichedData.presentation.currentMedications}
Clinical Examination: ${enrichedData.presentation.clinicalExamination}

=== DISEASE ASSESSMENTS ===
Diabetes Assessment:
${JSON.stringify(enrichedData.assessments.diabetes, null, 2)}

Hypertension Assessment:
${JSON.stringify(enrichedData.assessments.hypertension, null, 2)}

Obesity Assessment:
${JSON.stringify(enrichedData.assessments.obesity, null, 2)}

Complications Screening:
${enrichedData.assessments.complicationsScreening}

Overall Assessment:
${enrichedData.assessments.overallAssessment}

=== TREATMENT PLAN ===
Management Approach: ${enrichedData.treatment.managementPlan}

MEDICATIONS (${enrichedData.summary.medicationsCount}):
${enrichedData.treatment.medications?.map((med: any) => {
  if (med.action === 'continue') {
    return `- CONTINUE: ${med.name} ${med.dosage} ${med.frequency} (${med.indication})`
  } else if (med.action === 'add') {
    return `- ADD: ${med.name} ${med.dosage} ${med.frequency} (${med.indication}) - Monitoring: ${med.monitoring}`
  } else if (med.action === 'modify') {
    return `- MODIFY: ${med.name} from ${med.previousDosage} to ${med.newDosage} (${med.rationale})`
  } else if (med.action === 'stop') {
    return `- STOP: ${med.name} (${med.rationale})`
  }
  return `- ${med.name}`
}).join('\n') || 'No medication changes'}

Dietary Plan Summary: ${enrichedData.treatment.dietaryPlan}

Self-Monitoring Instructions: ${enrichedData.treatment.selfMonitoring}

=== INVESTIGATIONS (${enrichedData.summary.labTestsCount + enrichedData.summary.imagingCount} total) ===
Laboratory Tests (${enrichedData.summary.labTestsCount}):
${enrichedData.followUp.labTests?.map((test: any) => 
  `- ${test.name}: ${test.indication} (${test.timing})${test.fasting ? ' - FASTING REQUIRED' : ''}`
).join('\n') || 'None required at this time'}

Imaging Studies (${enrichedData.summary.imagingCount}):
${enrichedData.followUp.imaging?.map((img: any) => 
  `- ${img.type}: ${img.indication} (${img.timing})`
).join('\n') || 'None required at this time'}

=== FOLLOW-UP PLAN ===
Schedule: ${enrichedData.followUp.schedule}
Warning Signs: ${enrichedData.followUp.warningSigns}

TASK: Structure this EXISTING analysis into these narrative sections:

1. chiefComplaint - Use provided chief complaint, expand professionally
2. historyOfPresentIllness - Use medical history + current disease status
3. pastMedicalHistory - Use chronic diseases background
4. physicalExamination - Use clinical examination findings
5. diagnosticSynthesis - Use disease assessments (diabetes, hypertension, obesity) + complications screening (200+ words)
6. diagnosticConclusion - Use overall assessment + therapeutic objectives (150+ words)
7. managementPlan - Use therapeutic plan + mention ${enrichedData.summary.medicationsCount} medications, ${enrichedData.summary.labTestsCount} lab tests, ${enrichedData.summary.imagingCount} imaging studies
8. dietaryPlan - Use dietary plan summary (expand to 150+ words)
9. selfMonitoring - Use self-monitoring instructions (expand to 150+ words)
10. followUpPlan - Use follow-up schedule + warning signs (expand to 150+ words)
11. conclusion - Synthesize the complete chronic disease management plan

IMPORTANT:
- Use the PROVIDED analysis - do not re-analyze
- Expand professionally on existing content to meet 150-200 word requirements
- Maintain consistency with the pre-analyzed data
- Include all medication counts, test counts as specified
- Use Anglo-Saxon medical terminology in ENGLISH
- NO EMOJIS, NO COLOR INDICATORS
- Professional medical report style

Return ONLY a JSON object with these 11 keys and their narrative content in ENGLISH.`
}

// ==================== FALLBACK FUNCTION ====================
function useChronicDiseaseFallback(extractedData: any, patientData: any) {
  const chronicDiseases = Array.isArray(patientData.medicalHistory) 
    ? patientData.medicalHistory.join(', ')
    : (patientData.medicalHistory || 'chronic conditions')
  
  return {
    chiefComplaint: extractedData.chiefComplaint || `Follow-up consultation for chronic disease management: ${chronicDiseases}`,
    
    historyOfPresentIllness: `Patient presents for routine follow-up consultation regarding established chronic diseases: ${chronicDiseases}. Current treatment includes: ${extractedData.currentMedications}. Clinical assessment evaluates disease control status, therapeutic compliance, and complications screening. Systematic review of symptoms and disease-specific parameters has been conducted to assess overall disease management effectiveness.`,
    
    pastMedicalHistory: extractedData.medicalHistoryText || `Documented chronic conditions include: ${chronicDiseases}. Complete medical history review conducted including cardiovascular risk factors, metabolic parameters, and end-organ function assessment. Previous therapeutic interventions and their efficacy have been evaluated. This comprehensive background informs current management strategy.`,
    
    physicalExamination: extractedData.clinicalExamination || `Clinical assessment conducted via teleconsultation methodology. Vital signs assessment performed including blood pressure, heart rate, and relevant metabolic parameters. Systematic evaluation of disease-specific clinical indicators completed. Remote examination provides adequate clinical information for chronic disease management decisions.`,
    
    diagnosticSynthesis: `Comprehensive assessment of chronic disease control status integrates clinical findings, patient-reported data, and available laboratory parameters. ${extractedData.overallAssessment || 'Disease control evaluation indicates need for ongoing management optimization.'} ${extractedData.complicationsScreening || 'Systematic complications screening performed according to evidence-based protocols.'} Therapeutic objectives identified include optimization of metabolic parameters, cardiovascular risk reduction, and prevention of disease-specific complications. Evidence-based management approach incorporates current clinical guidelines for chronic disease management.`,
    
    diagnosticConclusion: `Following systematic clinical evaluation, chronic disease management assessment confirms: ${extractedData.overallAssessment || 'ongoing need for comprehensive therapeutic approach'}. ${extractedData.medicationsCount > 0 ? `Current pharmacological regimen reviewed with ${extractedData.medicationsCount} medication interventions.` : 'Treatment plan focuses on lifestyle interventions and monitoring.'} Therapeutic strategy targets evidence-based control parameters with individualized goal-setting. Management plan balances therapeutic efficacy with patient safety and quality of life considerations. Regular monitoring schedule established to ensure optimal disease control.`,
    
    managementPlan: `Comprehensive therapeutic strategy developed based on disease assessment and therapeutic objectives. ${extractedData.managementPlan || 'Evidence-based treatment approach focuses on multi-factorial disease control.'} ${extractedData.medicationsCount > 0 ? `Pharmacological management includes ${extractedData.medicationsCount} medication(s) targeting specific disease parameters.` : 'Non-pharmacological management prioritized.'} ${extractedData.labTestsCount > 0 || extractedData.imagingStudiesCount > 0 ? `Monitoring protocol includes ${extractedData.labTestsCount || 0} laboratory studies and ${extractedData.imagingStudiesCount || 0} imaging examinations for complications screening and therapeutic assessment.` : 'Clinical monitoring approach established.'} Treatment plan ensures comprehensive chronic disease control.`,
    
    dietaryPlan: extractedData.dietaryPlan || `Comprehensive nutritional management approach tailored to chronic disease requirements. Dietary recommendations emphasize balanced macronutrient distribution, portion control, and meal timing optimization. Specific nutritional targets established for metabolic parameter control. Patient education provided regarding food choices, meal planning strategies, and nutritional label interpretation. Dietary modifications integrated with overall therapeutic strategy to optimize disease control and support medication efficacy. Regular nutritional counseling recommended.`,
    
    selfMonitoring: extractedData.selfMonitoring || `Structured home monitoring protocol established for key disease parameters. Patient instructed in proper self-monitoring techniques including measurement frequency, timing, and documentation methods. Target ranges established for monitored parameters with clear action thresholds. Patient logbook implementation recommended for systematic data recording. Home monitoring results guide therapeutic adjustments and identify early intervention opportunities. Regular review of self-monitoring data ensures protocol adherence and clinical relevance.`,
    
    followUpPlan: `Structured follow-up protocol ensures continuity of care and optimal disease management. ${extractedData.followUpSchedule || 'Follow-up consultation scheduled in 3 months for therapeutic review and complications screening.'} ${extractedData.labTestsCount > 0 ? `Laboratory monitoring schedule established with ${extractedData.labTestsCount} test(s) for metabolic parameter assessment.` : 'Clinical monitoring approach established.'} ${extractedData.warningSigns ? `Critical warning signs requiring immediate medical attention: ${extractedData.warningSigns}.` : 'Patient counseled regarding symptoms requiring urgent medical evaluation.'} Comprehensive follow-up approach ensures systematic disease management and early complication detection.`,
    
    conclusion: `This comprehensive chronic disease follow-up consultation provides thorough assessment of disease control status with implementation of evidence-based management approach. ${extractedData.medicationsCount > 0 ? `Therapeutic interventions include ${extractedData.medicationsCount} medication(s) with appropriate monitoring protocols.` : 'Management strategy emphasizes lifestyle interventions and clinical monitoring.'} Patient education provided regarding disease management, self-monitoring protocols, and warning signs. Appropriate follow-up arrangements ensure continued systematic disease control and optimal patient outcomes. This teleconsultation meets professional standards for chronic disease management.`
  }
}

// ==================== PROFESSIONAL PRESCRIPTION EXTRACTION ====================
async function extractMedicationsProfessional(diagnosisData: any, patientData: any): Promise<any[]> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    const prompt = `Extract ALL medications from chronic disease management data with COMPLETE professional details.

DIAGNOSIS DATA:
${JSON.stringify(diagnosisData, null, 2)}

PATIENT INFO:
- Chronic diseases: ${(patientData.medicalHistory || []).join(', ')}
- Current medications: ${patientData.currentMedicationsText || patientData.currentMedications || 'None'}
- Allergies: ${patientData.allergies || 'None'}

Return format (professional prescription - NO EMOJIS):
[
  {
    "name": "Metformin Hydrochloride",
    "genericName": "Metformin",
    "dosage": "850mg",
    "form": "Tablet",
    "frequency": "1 tablet twice daily with meals",
    "route": "Oral route",
    "duration": "3 months (renewable)",
    "quantity": "180 tablets",
    "instructions": "Take with food to reduce gastrointestinal side effects. Swallow whole, do not crush.",
    "indication": "Type 2 Diabetes Mellitus - glycemic control",
    "monitoring": "Monitor kidney function (eGFR) every 6 months. Discontinue if eGFR <30 ml/min.",
    "doNotSubstitute": false,
    "pharmacologicalClass": "Biguanide antidiabetic",
    "contraindications": "Severe renal impairment, acute metabolic acidosis",
    "sideEffects": "Gastrointestinal upset, lactic acidosis (rare), vitamin B12 deficiency with long-term use",
    "precautions": "Hold before contrast procedures. Monitor for lactic acidosis signs.",
    "interactions": "Caution with alcohol, iodinated contrast agents",
    "pregnancyCategory": "Category B",
    "storageConditions": "Store at room temperature, protect from moisture"
  }
]

CRITICAL: Return ONLY the JSON array. Use ANGLO-SAXON medical nomenclature in ENGLISH. NO EMOJIS.`

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a clinical pharmacist extracting medication prescriptions. Use professional medical terminology in ENGLISH. NO EMOJIS. Include all safety information." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })

    const text = (completion.choices[0].message.content || '[]').trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (error) {
    console.error('Error extracting medications:', error)
    return []
  }
}

async function extractLabTestsProfessional(diagnosisData: any, patientData: any): Promise<any[]> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    const prompt = `Extract ALL laboratory tests for chronic disease monitoring with COMPLETE details.

DIAGNOSIS DATA:
${JSON.stringify(diagnosisData, null, 2)}

PATIENT INFO:
- Chronic diseases: ${(patientData.medicalHistory || []).join(', ')}
- Age: ${patientData.age}

Return format (professional lab request - NO EMOJIS):
[
  {
    "name": "Glycated Hemoglobin (HbA1c)",
    "category": "clinicalChemistry",
    "urgency": "routine",
    "fasting": false,
    "clinicalIndication": "Diabetes monitoring - assessment of 3-month average glycemic control",
    "expectedValues": "Target <7% for most adults with diabetes",
    "sampleType": "Venous blood - EDTA tube",
    "timing": "Every 3 months for uncontrolled diabetes"
  }
]

Categories: hematology, clinicalChemistry, immunology, microbiology, endocrinology

CRITICAL: Return ONLY the JSON array. Use ANGLO-SAXON nomenclature. NO EMOJIS.`

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a clinical pathologist ordering laboratory investigations. Professional medical terminology in ENGLISH. NO EMOJIS." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })

    const text = (completion.choices[0].message.content || '[]').trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (error) {
    console.error('Error extracting lab tests:', error)
    return []
  }
}

async function extractImagingStudiesProfessional(diagnosisData: any, patientData: any): Promise<any[]> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    const prompt = `Extract ALL imaging studies for chronic disease complications screening with COMPLETE details.

DIAGNOSIS DATA:
${JSON.stringify(diagnosisData, null, 2)}

PATIENT INFO:
- Chronic diseases: ${(patientData.medicalHistory || []).join(', ')}
- Age: ${patientData.age}

Return format (professional imaging request - NO EMOJIS):
[
  {
    "type": "Doppler Ultrasound - Lower Limb Arteries",
    "modality": "Ultrasound Doppler",
    "region": "Bilateral lower extremities",
    "clinicalIndication": "Diabetes - screening for peripheral arterial disease",
    "urgency": "routine",
    "contrast": false,
    "diagnosticQuestion": "Evidence of arterial stenosis?"
  }
]

CRITICAL: Return ONLY the JSON array. Professional terminology. NO EMOJIS.`

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a radiologist ordering imaging studies. Professional medical terminology in ENGLISH. NO EMOJIS." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2500
    })

    const text = (completion.choices[0].message.content || '[]').trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (error) {
    console.error('Error extracting imaging studies:', error)
    return []
  }
}

// ==================== MAIN FUNCTION ====================
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log("Starting PROFESSIONAL chronic disease report generation (consultation-report structure)")
  
  try {
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData,
      doctorData 
    } = await req.json()

    console.log("\nRECEIVED DATA:")
    console.log("- patientData present:", !!patientData)
    console.log("- clinicalData present:", !!clinicalData)
    console.log("- diagnosisData present:", !!diagnosisData)

    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json({ success: false, error: "Incomplete data" }, { status: 400 })
    }

    // Calculate BMI
    const weight = parseFloat(patientData.weight)
    const heightInMeters = parseFloat(patientData.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)
    patientData.bmi = bmi.toFixed(1)

    // Get current date for report header
    const reportDate = new Date()
    const documentId = `CHR-${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(reportDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // ===== STEP 1: EXTRACT DATA (like consultation-report) =====
    console.log("\nSTEP 1: Extracting chronic disease data...")
    const extractedData = extractChronicDiseaseData(diagnosisData, patientData, clinicalData)
    
    // ===== STEP 2: PREPARE ENRICHED DATA (like consultation-report) =====
    console.log("STEP 2: Preparing enriched GPT data...")
    const enrichedData = prepareChronicDiseaseGPTData(extractedData, patientData)
    
    // ===== STEP 3: GENERATE NARRATIVE REPORT WITH GPT-4 (like consultation-report) =====
    console.log("STEP 3: Generating narrative report with gpt-4o-mini...")
    
    const systemPrompt = createChronicDiseaseSystemPrompt()
    const userPrompt = createChronicDiseaseUserPrompt(enrichedData, patientData, doctorData)
    
    let narrativeSections: any
    
    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),  // Same as consultation-report
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        maxTokens: 3000,
        temperature: 0.3,
      })

      const content = result.text
      
      if (!content) {
        console.warn("No content in AI response, using fallback")
        narrativeSections = useChronicDiseaseFallback(extractedData, patientData)
      } else {
        console.log("AI response received, length:", content.length)
        
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            console.warn("No JSON found in response, using fallback")
            narrativeSections = useChronicDiseaseFallback(extractedData, patientData)
          } else {
            narrativeSections = JSON.parse(jsonMatch[0])
          }
        } catch (parseError: any) {
          console.warn("JSON parse error, using fallback:", parseError.message)
          narrativeSections = useChronicDiseaseFallback(extractedData, patientData)
        }
      }
    } catch (aiError: any) {
      console.warn("AI generation error, using fallback:", aiError.message)
      narrativeSections = useChronicDiseaseFallback(extractedData, patientData)
    }
    
    // ===== STEP 4: BUILD COMPLETE NARRATIVE TEXT =====
    console.log("STEP 4: Building complete narrative text...")
    
    const fullText = `CHRONIC DISEASE FOLLOW-UP CONSULTATION REPORT

DOCUMENT ID: ${documentId}
DATE: ${reportDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
PHYSICIAN: ${doctorData?.fullName ? `Dr. ${doctorData.fullName}` : 'Dr. [Physician Name]'}
SPECIALTY: Endocrinology / Internal Medicine
MCM REGISTRATION: ${doctorData?.medicalCouncilNumber || '[Registration Number]'}

PATIENT IDENTIFICATION:
Name: ${patientData.firstName} ${patientData.lastName}
Age: ${patientData.age} years
Gender: ${patientData.gender}
Weight: ${patientData.weight} kg
Height: ${patientData.height} cm
BMI: ${patientData.bmi} kg/m²

CHIEF COMPLAINT:
${narrativeSections.chiefComplaint}

HISTORY OF PRESENT ILLNESS:
${narrativeSections.historyOfPresentIllness}

PAST MEDICAL HISTORY:
${narrativeSections.pastMedicalHistory}

PHYSICAL EXAMINATION:
${narrativeSections.physicalExamination}

DIAGNOSTIC SYNTHESIS:
${narrativeSections.diagnosticSynthesis}

DIAGNOSTIC CONCLUSION:
${narrativeSections.diagnosticConclusion}

MANAGEMENT PLAN:
${narrativeSections.managementPlan}

DIETARY PLAN:
${narrativeSections.dietaryPlan}

SELF-MONITORING INSTRUCTIONS:
${narrativeSections.selfMonitoring}

FOLLOW-UP PLAN:
${narrativeSections.followUpPlan}

CONCLUSION:
${narrativeSections.conclusion}

___________________________
${doctorData?.fullName ? `Dr. ${doctorData.fullName}` : 'Dr. [Physician Name]'}
${doctorData?.qualifications || 'MBBS'}
Endocrinology / Internal Medicine
MCM Registration: ${doctorData?.medicalCouncilNumber || '[Registration Number]'}
Date: ${reportDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`

    // ===== STEP 5: EXTRACT PROFESSIONAL PRESCRIPTIONS =====
    console.log("STEP 5: Extracting PROFESSIONAL prescriptions...")
    
    const [medications, labTests, imagingStudies] = await Promise.all([
      extractMedicationsProfessional(diagnosisData, patientData),
      extractLabTestsProfessional(diagnosisData, patientData),
      extractImagingStudiesProfessional(diagnosisData, patientData)
    ])
    
    console.log(`Extracted: ${medications.length} medications, ${labTests.length} lab tests, ${imagingStudies.length} imaging studies`)
    
    // ===== STEP 6: BUILD PROFESSIONAL PRESCRIPTIONS =====
    const examDate = reportDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
    
    const physician = {
      name: doctorData?.fullName ? `Dr. ${doctorData.fullName}` : "Dr. [PHYSICIAN NAME]",
      qualifications: doctorData?.qualifications || "MBBS",
      specialty: "Endocrinology / Internal Medicine",
      practiceAddress: doctorData?.practiceAddress || doctorData?.clinicAddress || "Tibok Teleconsultation Platform",
      email: doctorData?.email || "[Professional email]",
      consultationHours: doctorData?.consultationHours || "Consultation Hours: 8:00 AM - 8:00 PM",
      medicalCouncilNumber: doctorData?.medicalCouncilNumber || "[MCM Registration Required]"
    }
    
    const patient = {
      fullName: `${patientData.firstName} ${patientData.lastName}`,
      dateOfBirth: patientData.dateOfBirth || patientData.birthDate || '',
      age: calculateAge(patientData.dateOfBirth || patientData.birthDate || ''),
      sex: patientData.gender,
      phone: patientData.phone || '',
      email: patientData.email || '',
      address: `${patientData.address || ''}, ${patientData.city || ''}, ${patientData.country || ''}`
    }
    
    const professionalPrescriptions: any = {}
    
    // MEDICATIONS PRESCRIPTION (if any)
    if (medications.length > 0) {
      professionalPrescriptions.medications = {
        header: physician,
        patient: patient,
        prescription: {
          prescriptionDate: examDate,
          medications: medications.map((med, idx) => ({
            number: idx + 1,
            name: med.name,
            genericName: med.genericName || med.name,
            dosage: med.dosage,
            form: med.form || 'Tablet',
            frequency: med.frequency,
            route: med.route,
            duration: med.duration,
            quantity: med.quantity,
            instructions: med.instructions,
            indication: med.indication,
            monitoring: med.monitoring,
            doNotSubstitute: med.doNotSubstitute || false,
            pharmacologicalClass: med.pharmacologicalClass,
            contraindications: med.contraindications,
            sideEffects: med.sideEffects,
            precautions: med.precautions,
            storageConditions: med.storageConditions
          })),
          validity: "3 months unless otherwise specified",
          dispensationNote: "For pharmaceutical use only - Chronic disease management"
        },
        authentication: {
          signature: "Medical Practitioner's Signature",
          physicianName: physician.name.toUpperCase(),
          registrationNumber: physician.medicalCouncilNumber,
          officialStamp: "Official Medical Stamp",
          date: examDate
        }
      }
    }
    
    // LABORATORY TESTS (if any)
    if (labTests.length > 0) {
      const categorizedTests: any = {
        hematology: labTests.filter(t => t.category === 'hematology'),
        clinicalChemistry: labTests.filter(t => t.category === 'clinicalChemistry'),
        endocrinology: labTests.filter(t => t.category === 'endocrinology'),
        immunology: labTests.filter(t => t.category === 'immunology'),
        microbiology: labTests.filter(t => t.category === 'microbiology')
      }
      
      const analyses: any = {}
      Object.keys(categorizedTests).forEach(category => {
        if (categorizedTests[category].length > 0) {
          analyses[category] = categorizedTests[category].map((test: any) => ({
            name: test.name,
            urgency: test.urgency,
            fasting: test.fasting,
            clinicalIndication: test.clinicalIndication,
            expectedValues: test.expectedValues,
            sampleType: test.sampleType,
            timing: test.timing
          }))
        }
      })
      
      professionalPrescriptions.laboratoryTests = {
        header: physician,
        patient: patient,
        prescription: {
          prescriptionDate: examDate,
          clinicalIndication: "Chronic disease monitoring and complications screening",
          analyses: analyses,
          specialInstructions: labTests.some(t => t.fasting) ? ["Some tests require fasting - please verify individual requirements"] : [],
          recommendedLaboratory: "Accredited medical laboratory"
        },
        authentication: {
          signature: "Medical Practitioner's Signature",
          physicianName: physician.name.toUpperCase(),
          registrationNumber: physician.medicalCouncilNumber,
          date: examDate
        }
      }
    }
    
    // IMAGING STUDIES (if any)
    if (imagingStudies.length > 0) {
      professionalPrescriptions.imagingStudies = {
        header: physician,
        patient: patient,
        prescription: {
          prescriptionDate: examDate,
          clinicalIndication: "Chronic disease complications screening and management",
          studies: imagingStudies.map((study, idx) => ({
            number: idx + 1,
            name: study.type,
            modality: study.modality,
            anatomicalRegion: study.region,
            clinicalIndication: study.clinicalIndication,
            diagnosticQuestion: study.diagnosticQuestion,
            urgency: study.urgency,
            contrast: study.contrast
          })),
          recommendedFacility: "Accredited radiology center or hospital imaging department"
        },
        authentication: {
          signature: "Medical Practitioner's Signature",
          physicianName: physician.name.toUpperCase(),
          registrationNumber: physician.medicalCouncilNumber,
          date: examDate
        }
      }
    }
    
    // ===== STEP 7: GENERATE INVOICE =====
    const invoice = {
      header: {
        invoiceNumber: `CHR-INV-${reportDate.getFullYear()}-${String(Date.now()).slice(-6)}`,
        consultationDate: examDate,
        invoiceDate: examDate
      },
      provider: {
        companyName: "Digital Data Solutions Ltd",
        tradeName: "Tibok",
        registrationNumber: "C20173522",
        vatNumber: "27816949",
        registeredOffice: "Bourdet Road, Grand Baie, Mauritius",
        phone: "+230 4687377/78",
        email: "contact@tibok.mu",
        website: "www.tibok.mu"
      },
      patient: {
        name: patient.fullName,
        email: patient.email,
        phone: patient.phone,
        patientId: documentId
      },
      services: {
        items: [{
          description: "Online chronic disease follow-up consultation with comprehensive report generation via Tibok",
          quantity: 1,
          unitPrice: 1500,
          total: 1500
        }],
        subtotal: 1500,
        vatRate: 0.15,
        vatAmount: 0,
        totalDue: 1500
      },
      payment: {
        method: "[Credit Card / MCB Juice / MyT Money / Other]",
        receivedDate: examDate,
        status: "pending" as const
      },
      physician: {
        name: physician.name,
        registrationNumber: physician.medicalCouncilNumber
      },
      notes: [
        "This invoice corresponds to a remote chronic disease follow-up consultation performed via the Tibok platform.",
        "The service was delivered by a registered medical professional specialized in endocrinology/internal medicine.",
        "No audio or video recording was made. All data securely hosted on health data certified server (OVH - HDS compliant).",
        "Service available from 08:00 to 00:00 (Mauritius time), 7 days a week.",
        "Medication delivery included during daytime, with possible extra charges after 17:00 depending on pharmacy availability."
      ],
      signature: {
        entity: "Digital Data Solutions Ltd",
        onBehalfOf: physician.name,
        title: "Registered Medical Practitioner - Endocrinology/Internal Medicine (Mauritius)"
      }
    }
    
    // ===== STEP 8: BUILD COMPLETE REPORT =====
    const completeReport = {
      documentMetadata: {
        documentId: documentId,
        documentType: "CHRONIC_DISEASE_FOLLOWUP_CONSULTATION",
        generatedAt: reportDate.toISOString(),
        consultationDate: reportDate.toISOString(),
        language: "English (Anglo-Saxon medical standards)",
        version: "3.0_professional_consultation_structure"
      },
      narrativeReport: {
        fullText: fullText,
        sections: narrativeSections
      },
      structuredData: extractedData,
      prescriptions: professionalPrescriptions,
      invoice: invoice,
      metadata: {
        documentId: documentId,
        generatedAt: reportDate.toISOString(),
        type: "comprehensive_chronic_disease_report",
        version: "3.0_consultation_structure",
        includedSections: {
          narrativeReport: true,
          structuredData: true,
          medications: medications.length > 0,
          laboratoryTests: labTests.length > 0,
          imagingStudies: imagingStudies.length > 0,
          invoice: true
        }
      }
    }
    
    const elapsedTime = Date.now() - startTime
    console.log(`\nPROFESSIONAL chronic disease report generated successfully in ${elapsedTime}ms`)
    console.log(`- Narrative report: ${fullText.length} characters`)
    console.log(`- Medications: ${medications.length}`)
    console.log(`- Lab tests: ${labTests.length}`)
    console.log(`- Imaging studies: ${imagingStudies.length}`)
    
    return NextResponse.json({
      success: true,
      report: completeReport,
      documentId: documentId,
      generatedAt: reportDate.toISOString()
    })

  } catch (error: any) {
    console.error("Chronic Report API Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate chronic disease medical report",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
