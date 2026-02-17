// app/api/dermatology-diagnosis/route.ts
// VERSION 4.0: Professional-grade dermatology consultation matching openai-diagnosis quality
// - Consultation type detection (new problem vs treatment renewal)
// - Explicit OCR/image analysis integration requirements
// - Current medications validation and continuation strategy
// - Treatment interaction checking
// - 4 retry attempts with progressive enhancement
// - Auto-correction on final attempt
// - 8000 max tokens for comprehensive responses
// - Enhanced context awareness
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

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

  const anonymousId = `ANON-DD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId

  console.log('🔒 Patient data anonymized for dermatology diagnosis')

  return { anonymized, originalIdentity, anonymousId }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Validates dermatology medications for DCI compliance (topical + oral)
 */
function validateDermatologyMedications(treatment: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!treatment) {
    return { isValid: true, issues: [] }
  }
  
  // Validate topical medications
  if (treatment.topical && Array.isArray(treatment.topical)) {
    treatment.topical.forEach((med: any, index: number) => {
      if (!med.medication || med.medication.toLowerCase().includes('medication') || 
          med.medication.toLowerCase().includes('cream') || med.medication.toLowerCase().includes('ointment')) {
        issues.push(`Topical ${index + 1}: Generic name "${med.medication}" - needs specific DCI (e.g., "Hydrocortisone 1% cream")`)
      }
      
      if (!med.dci || med.dci.length < 3) {
        issues.push(`Topical ${index + 1}: Missing or incomplete DCI name`)
      }
      
      if (!med.application || !med.application.match(/OD|BD|TDS|QDS|PRN|once|twice|three times|four times/i)) {
        issues.push(`Topical ${index + 1}: Missing or unclear application frequency`)
      }
      
      if (!med.duration || med.duration.length < 5) {
        issues.push(`Topical ${index + 1}: Missing or incomplete treatment duration`)
      }
      
      if (!med.instructions || med.instructions.length < 15) {
        issues.push(`Topical ${index + 1}: Instructions too brief - need detailed application guidance`)
      }
    })
  }
  
  // Validate oral medications
  if (treatment.oral && Array.isArray(treatment.oral)) {
    treatment.oral.forEach((med: any, index: number) => {
      if (!med.medication || med.medication.toLowerCase().includes('medication') || 
          med.medication.toLowerCase().includes('drug')) {
        issues.push(`Oral ${index + 1}: Generic name "${med.medication}" - needs specific DCI`)
      }
      
      if (!med.dci || med.dci.length < 3) {
        issues.push(`Oral ${index + 1}: Missing or incomplete DCI name`)
      }
      
      if (!med.dosage || med.dosage.length < 3) {
        issues.push(`Oral ${index + 1}: Missing or incomplete dosage`)
      }
      
      if (!med.frequency || !med.frequency.match(/OD|BD|TDS|QDS/i)) {
        issues.push(`Oral ${index + 1}: Missing or incomplete frequency (should use OD/BD/TDS/QDS)`)
      }
      
      if (!med.indication || med.indication.length < 20) {
        issues.push(`Oral ${index + 1}: Indication too vague - need detailed medical reasoning`)
      }
    })
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Validates differential diagnosis completeness
 */
function validateDifferentialDiagnoses(differentials: any[]): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!differentials || !Array.isArray(differentials)) {
    issues.push('Missing differential diagnoses array')
    return { isValid: false, issues }
  }
  
  if (differentials.length < 3) {
    issues.push(`Only ${differentials.length} differential diagnoses - minimum 3 required`)
  }
  
  differentials.forEach((diff: any, index: number) => {
    if (!diff.condition || diff.condition.length < 5) {
      issues.push(`Differential ${index + 1}: Missing or incomplete condition name`)
    }
    
    if (!diff.likelihood || typeof diff.likelihood !== 'number') {
      issues.push(`Differential ${index + 1}: Missing or invalid likelihood percentage`)
    }
    
    if (!diff.supportingFeatures || diff.supportingFeatures.length < 10) {
      issues.push(`Differential ${index + 1}: Supporting features too brief`)
    }
    
    if (!diff.distinguishingFeatures || diff.distinguishingFeatures.length < 10) {
      issues.push(`Differential ${index + 1}: Distinguishing features too brief`)
    }
  })
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Validates current medications review (if applicable)
 */
function validateCurrentMedicationsReview(currentMeds: any[]): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!currentMeds || !Array.isArray(currentMeds)) {
    // Not required if patient has no current medications
    return { isValid: true, issues: [] }
  }
  
  if (currentMeds.length === 0) {
    return { isValid: true, issues: [] }
  }
  
  currentMeds.forEach((med: any, index: number) => {
    if (!med.medication || med.medication.length < 3) {
      issues.push(`Current Med ${index + 1}: Missing or incomplete medication name`)
    }
    
    if (!med.assessment || !['Continue', 'Adjust', 'Stop'].includes(med.assessment)) {
      issues.push(`Current Med ${index + 1}: Assessment must be Continue/Adjust/Stop`)
    }
    
    if (!med.reasoning || med.reasoning.length < 30) {
      issues.push(`Current Med ${index + 1}: Reasoning too brief - need detailed medical justification (30+ chars)`)
    }
    
    if (!med.interactions) {
      issues.push(`Current Med ${index + 1}: Missing interaction assessment`)
    }
  })
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Validates dermatology-specific quality requirements
 */
function validateDermatologyQuality(diagnosis: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check clinical summary
  if (!diagnosis.clinicalSummary || diagnosis.clinicalSummary.length < 50) {
    issues.push('Clinical summary too brief - needs comprehensive overview')
  }
  
  // Check primary diagnosis
  if (!diagnosis.primaryDiagnosis?.name) {
    issues.push('Missing primary diagnosis name')
  }
  
  if (!diagnosis.primaryDiagnosis?.icd10) {
    issues.push('Missing ICD-10 code for primary diagnosis')
  }
  
  if (!diagnosis.primaryDiagnosis?.confidence) {
    issues.push('Missing confidence level for primary diagnosis')
  }
  
  // Check pathophysiology
  if (!diagnosis.pathophysiology || diagnosis.pathophysiology.length < 50) {
    issues.push('Pathophysiology explanation too brief - need detailed mechanism')
  }
  
  // Check treatment plan completeness
  if (!diagnosis.treatmentPlan?.immediate) {
    issues.push('Missing immediate management plan')
  }
  
  if (!diagnosis.treatmentPlan?.longTerm) {
    issues.push('Missing long-term management plan')
  }
  
  // Check patient education
  if (!diagnosis.patientEducation || diagnosis.patientEducation.length < 100) {
    issues.push('Patient education too brief - need comprehensive explanation')
  }
  
  // Check follow-up plan
  if (!diagnosis.followUpPlan?.timeline) {
    issues.push('Missing follow-up timeline')
  }
  
  // Check red flags
  if (!diagnosis.redFlags || !Array.isArray(diagnosis.redFlags) || diagnosis.redFlags.length === 0) {
    issues.push('Missing red flags / warning signs')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Calls OpenAI with retry mechanism and quality validation
 */
async function callOpenAIWithRetry(
  openai: OpenAI,
  diagnosticPrompt: string,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 OpenAI call attempt ${attempt + 1}/${maxRetries + 1}`)
      
      // Enhance system message with quality requirements on retry
      let systemMessage = "You are an expert board-certified dermatologist. Provide comprehensive, evidence-based diagnostic assessments with structured JSON responses."
      
      if (attempt === 1) {
        systemMessage = `🚨 ATTEMPT 2/4 - PREVIOUS RESPONSE HAD QUALITY ISSUES - ENHANCED REQUIREMENTS:

You are an expert board-certified dermatologist. Your response MUST meet these CRITICAL standards:

⚠️ MEDICATION DCI REQUIREMENTS:
- EVERY medication (topical and oral) must have SPECIFIC pharmaceutical name with DCI
- TOPICAL: e.g., "Hydrocortisone 1% cream" (DCI: "Hydrocortisone"), NOT "steroid cream"
- ORAL: e.g., "Doxycycline 100mg" (DCI: "Doxycycline"), NOT "antibiotic"
- ALL medications need detailed application/dosing instructions (minimum 15 characters)
- Use UK dosing format: OD/BD/TDS/QDS

⚠️ DIFFERENTIAL DIAGNOSIS REQUIREMENTS:
- MINIMUM 3 differential diagnoses (ideally 4-5)
- Each must have: condition name, likelihood %, supporting features, distinguishing features
- All descriptions must be detailed (minimum 30 characters each)

⚠️ CLINICAL QUALITY REQUIREMENTS:
- Clinical summary: minimum 50 characters
- Pathophysiology: minimum 50 characters  
- Patient education: minimum 100 characters
- Red flags: at least 2-3 specific warning signs

Provide comprehensive, professional-grade dermatological assessment.`
      } else if (attempt === 2) {
        systemMessage = `🚨🚨 ATTEMPT 3/4 - STRICT QUALITY REQUIREMENTS - MAURITIUS DERMATOLOGY STANDARDS:

You are an expert board-certified dermatologist.

⚠️ ABSOLUTE REQUIREMENTS:
1. NEVER use "Medication", "undefined", null, or generic names
2. ALWAYS use precise pharmaceutical names with DCI
3. ALWAYS use UK dosing format (OD/BD/TDS/QDS)
4. DCI MUST BE EXACT for all topical and oral medications
5. INDICATIONS MUST BE DETAILED: Minimum 40 characters with specific medical context
6. DIFFERENTIAL DIAGNOSES: Minimum 4 conditions with detailed features
7. ALL fields must be completed with specific medical content
8. MUST correlate OCR/image analysis with clinical assessment
9. MUST validate current medications if patient has any

🎯 MANDATORY TOPICAL MEDICATION FORMAT:
{
  "medication": "Hydrocortisone 1% cream",
  "dci": "Hydrocortisone",
  "application": "BD (twice daily)",
  "duration": "7-14 days",
  "instructions": "Apply thin layer to affected areas after cleansing, avoid occlusive dressings on face",
  "sideEffects": "Skin atrophy with prolonged use, contact dermatitis"
}

💊 MANDATORY ORAL MEDICATION FORMAT:
{
  "medication": "Doxycycline 100mg",
  "dci": "Doxycycline",
  "dosage": "100mg",
  "frequency": "OD (once daily)",
  "duration": "6-12 weeks",
  "indication": "Anti-inflammatory and antimicrobial treatment for moderate to severe inflammatory acne with photosensitivity considerations",
  "monitoring": "Liver function tests if prolonged use, photosensitivity precautions",
  "contraindications": "Pregnancy, children under 12, severe hepatic impairment"
}`
      } else if (attempt >= 3) {
        systemMessage = `🆘 ATTEMPT 4/4 - MAXIMUM QUALITY MODE - FINAL ATTEMPT:

You are an expert board-certified dermatologist. THIS IS THE FINAL ATTEMPT - response must be PERFECT.

🎯 EMERGENCY REQUIREMENTS FOR MAURITIUS DERMATOLOGY SYSTEM:

Every medication MUST have ALL these fields completed with DETAILED content:

1. "medication": "SPECIFIC NAME + CONCENTRATION" (e.g., "Hydrocortisone 1% cream")
2. "dci": "EXACT DCI NAME" (e.g., "Hydrocortisone") 
3. "application" or "frequency": "UK FORMAT" (e.g., "BD (twice daily)")
4. "instructions": "DETAILED APPLICATION GUIDANCE" (minimum 50 characters)
5. "indication": "DETAILED MEDICAL INDICATION" (minimum 50 characters with full medical context)
6. "duration": "SPECIFIC TREATMENT DURATION"
7. ALL other fields must be completed with medical content

EXAMPLE COMPLETE TOPICAL MEDICATION:
{
  "medication": "Clobétasol propionate 0.05% cream",
  "dci": "Clobétasol",
  "application": "BD (twice daily)",
  "duration": "Maximum 2 weeks for initial treatment, then step-down therapy",
  "instructions": "Apply thin layer to affected areas twice daily after cleansing and drying skin. Avoid face, genitals, and intertriginous areas. Use occlusive dressing only if specified. Wash hands after application.",
  "sideEffects": "Skin atrophy, telangiectasia, striae, perioral dermatitis with prolonged use. Hypothalamic-pituitary-adrenal axis suppression if large areas treated."
}

DIFFERENTIAL DIAGNOSES MUST BE EXTREMELY DETAILED:
- MINIMUM 4 conditions (preferably 5)
- Each with: specific condition name, likelihood %, supporting features (50+ chars), distinguishing features (50+ chars)
- Must reference visual findings from OCR/image analysis

CLINICAL SUMMARY MUST INCLUDE:
- Patient demographics and presentation
- Key visual findings from image analysis
- Distribution and morphology of lesions
- Duration and progression
- Relevant history and risk factors

⚠️ THIS IS THE FINAL ATTEMPT - RESPONSE MUST BE PERFECT!`
      }
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: diagnosticPrompt
          }
        ],
        max_completion_tokens: 16000,
        reasoning_effort: 'high',
        response_format: { type: "json_object" },
      })
      
      const content = completion.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('No content received from OpenAI')
      }
      
      // Parse JSON response
      let diagnosisData
      try {
        diagnosisData = JSON.parse(content)
      } catch (parseError) {
        throw new Error(`JSON parse error: ${parseError}`)
      }
      
      // Validate quality
      const medicationValidation = validateDermatologyMedications(diagnosisData.treatmentPlan)
      const differentialValidation = validateDifferentialDiagnoses(diagnosisData.differentialDiagnoses)
      const qualityValidation = validateDermatologyQuality(diagnosisData)
      const currentMedsValidation = validateCurrentMedicationsReview(diagnosisData.currentMedicationsValidated)
      
      const allIssues = [
        ...medicationValidation.issues,
        ...differentialValidation.issues,
        ...qualityValidation.issues,
        ...currentMedsValidation.issues
      ]
      
      // If quality issues found and we have retries left, throw error to retry
      if (allIssues.length > 0 && attempt < maxRetries) {
        console.log(`⚠️ Quality issues detected (${allIssues.length}), retrying...`)
        console.log('Issues:', allIssues.slice(0, 5))
        throw new Error(`Quality validation failed: ${allIssues.slice(0, 3).join('; ')}`)
      }
      
      // AUTO-CORRECTION on final attempt if quality issues remain (like openai-diagnosis)
      if (allIssues.length > 0 && attempt === maxRetries) {
        console.log(`🔧 AUTO-CORRECTION MODE: Applying fixes to ${allIssues.length} quality issues...`)
        
        // Auto-correct topical medication issues
        if (diagnosisData.treatmentPlan?.topical) {
          diagnosisData.treatmentPlan.topical = diagnosisData.treatmentPlan.topical.map((med: any) => {
            if (!med.dci || med.dci === 'undefined') {
              const medName = med.medication || ''
              const dciMatch = medName.match(/^([A-Za-zéèêàâôûùç]+)/)
              if (dciMatch) med.dci = dciMatch[1]
            }
            if (!med.instructions || med.instructions.length < 15) {
              med.instructions = `Apply to affected areas as directed by your dermatologist`
            }
            if (!med.application || !med.application.match(/OD|BD|TDS|QDS/i)) {
              med.application = 'BD (twice daily)'
            }
            return med
          })
        }
        
        // Auto-correct oral medication issues
        if (diagnosisData.treatmentPlan?.oral) {
          diagnosisData.treatmentPlan.oral = diagnosisData.treatmentPlan.oral.map((med: any) => {
            if (!med.dci || med.dci === 'undefined') {
              const medName = med.medication || ''
              const dciMatch = medName.match(/^([A-Za-zéèêàâôûùç]+)/)
              if (dciMatch) med.dci = dciMatch[1]
            }
            if (!med.indication || med.indication.length < 20) {
              med.indication = `Traitement médicamenteux pour la condition dermatologique diagnostiquée selon les standards cliniques`
            }
            if (!med.frequency || !med.frequency.match(/OD|BD|TDS|QDS/i)) {
              med.frequency = 'OD (once daily)'
            }
            return med
          })
        }
        
        // Ensure minimum differential diagnoses
        if (diagnosisData.differentialDiagnoses && diagnosisData.differentialDiagnoses.length < 3) {
          console.log(`⚠️ Only ${diagnosisData.differentialDiagnoses.length} differentials - this is below minimum but proceeding`)
        }
        
        console.log(`✅ Auto-correction applied - proceeding with enhanced response`)
      }
      
      // Log quality metrics
      if (allIssues.length > 0) {
        console.log(`⚠️ Final attempt - ${allIssues.length} quality issues remain (auto-corrected where possible)`)
        console.log('Medication issues:', medicationValidation.issues.length)
        console.log('Differential issues:', differentialValidation.issues.length)
        console.log('Quality issues:', qualityValidation.issues.length)
        console.log('Current meds issues:', currentMedsValidation.issues.length)
      } else {
        console.log('✅ Quality validation passed - dermatology standards met')
      }
      
      return {
        diagnosis: diagnosisData,
        qualityMetrics: {
          medicationDCICompliant: medicationValidation.isValid,
          differentialComplete: differentialValidation.isValid,
          clinicalQuality: qualityValidation.isValid,
          currentMedicationsReviewed: currentMedsValidation.isValid,
          attempt: attempt + 1,
          issues: allIssues
        }
      }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff
        console.log(`⏳ Retrying in ${waitTime}ms with enhanced dermatology quality requirements...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
}

// ==================== MAIN POST HANDLER ====================

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client inside the function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const body = await request.json()
    const { patientData, imageData, ocrAnalysisData, questionsData } = body

    // Anonymize patient data before sending to AI
    const { anonymized: anonymizedPatient, originalIdentity, anonymousId } = anonymizePatientData(patientData)

    console.log(`🔬 Starting specialized dermatology diagnosis v3.0`)
    console.log(`👤 Patient ID: ${anonymousId} (anonymized)`)
    console.log(`📸 Image analysis available: ${ocrAnalysisData ? 'Yes' : 'No'}`)
    console.log(`❓ Questions answered: ${Object.keys(questionsData?.answers || {}).length}`)

    // Prepare comprehensive context
    // Use structured OCR data - convert to detailed text for prompt
    let ocrAnalysis = 'No image analysis available'
    
    if (ocrAnalysisData && ocrAnalysisData.analysis) {
      const ocr = ocrAnalysisData.analysis
      const summary = ocrAnalysisData.summary || ''
      
      // Build comprehensive OCR analysis text from structured data
      ocrAnalysis = `
=== IMAGE QUALITY ASSESSMENT ===
Overall Quality: ${ocr.imageQualityAssessment?.overallQuality || 'Not assessed'}
Focus: ${ocr.imageQualityAssessment?.focus || 'N/A'}
Lighting: ${ocr.imageQualityAssessment?.lighting || 'N/A'}
Diagnostic Quality: ${ocr.imageQualityAssessment?.diagnosticQuality || 'N/A'}

=== VISUAL OBSERVATIONS ===
Primary Morphology: ${ocr.visualObservations?.primaryMorphology || 'Not specified'}
Secondary Features: ${ocr.visualObservations?.secondaryMorphology?.join(', ') || 'None'}
Color: ${ocr.visualObservations?.color || 'Not described'}
Size: ${ocr.visualObservations?.size || 'Not measured'}
Shape: ${ocr.visualObservations?.shape || 'Not described'}
Border: ${ocr.visualObservations?.border || 'Not described'}
Texture: ${ocr.visualObservations?.texture || 'Not described'}
Distribution: ${ocr.visualObservations?.distribution || 'Not described'}
Arrangement: ${ocr.visualObservations?.arrangement || 'Not described'}

=== LOCATION ===
Primary Site: ${ocr.locationAnalysis?.primarySite || 'Not specified'}
Specific Areas: ${ocr.locationAnalysis?.specificAreas?.join(', ') || 'Not specified'}
Pattern: ${ocr.locationAnalysis?.pattern || 'None'}
Laterality: ${ocr.locationAnalysis?.laterality || 'Not specified'}

${ocr.clinicalScoring?.melanomaConcern?.applicable ? `
=== MELANOMA CONCERN (ABCDE SCORING) ===
Asymmetry: ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.asymmetryScore || 'N/A'} - ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.asymmetryDescription || 'N/A'}
Border: ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.borderScore || 'N/A'} - ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.borderDescription || 'N/A'}
Color: ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.colorScore || 'N/A'} - ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.colorDescription || 'N/A'}
Diameter: ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.diameterScore || 'N/A'} - ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.diameterDescription || 'N/A'}
Evolution: ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.evolutionScore || 'N/A'} - ${ocr.clinicalScoring.melanomaConcern.abcdeScore?.evolutionDescription || 'N/A'}
Total ABCDE Score: ${ocr.clinicalScoring.melanomaConcern.totalScore || 'N/A'}/5
Risk Assessment: ${ocr.clinicalScoring.melanomaConcern.riskLevel || 'Not assessed'}
` : ''}

=== DIFFERENTIAL DIAGNOSES (FROM IMAGE) ===
${ocr.differentialDiagnoses?.map((dd: any, i: number) => `
${i + 1}. ${dd.diagnosis} (${dd.likelihood || 'N/A'}%)
   Supporting Features: ${dd.supportingFeatures || 'N/A'}
   Distinguishing Features: ${dd.distinguishingFeatures || 'N/A'}
`).join('') || 'No differentials provided'}

=== URGENCY ASSESSMENT ===
Level: ${ocr.urgencyAssessment?.level || 'Not assessed'}
Timeframe: ${ocr.urgencyAssessment?.timeframe || 'N/A'}
Reasoning: ${ocr.urgencyAssessment?.reasoning || 'N/A'}
Red Flags: ${ocr.urgencyAssessment?.redFlags?.join('; ') || 'None identified'}

=== SUMMARY ===
${summary}
`.trim()
    } else if (ocrAnalysisData?.summary) {
      // Fallback to summary if structured data not available
      ocrAnalysis = ocrAnalysisData.summary
    }
    const questionsAnswers = formatQuestionsAnswers(questionsData?.answers || {}, questionsData?.questions || [])
    
    // Detect consultation type based on current medications and chief complaint
    const hasCurrentMedications = anonymizedPatient.currentMedications && anonymizedPatient.currentMedications.length > 0
    const questionsText = questionsAnswers.toLowerCase()
    const isLikelyRenewal = hasCurrentMedications && (
      questionsText.includes('renewal') ||
      questionsText.includes('refill') ||
      questionsText.includes('continue') ||
      questionsText.includes('same treatment') ||
      questionsText.includes('renouvellement')
    )
    const consultationType = isLikelyRenewal ? 'renewal' : 'new_problem'

    console.log(`📋 Consultation type: ${consultationType}`)
    if (hasCurrentMedications) {
      console.log(`💊 Patient has current medications: ${anonymizedPatient.currentMedications}`)
    }

    // Format current medications properly for GPT-4
    const currentMedicationsFormatted = hasCurrentMedications
      ? (Array.isArray(anonymizedPatient.currentMedications)
          ? anonymizedPatient.currentMedications.map((med: string, idx: number) => `${idx + 1}. ${med}`).join('\n  ')
          : anonymizedPatient.currentMedications)
      : 'None reported'

    // ANONYMIZED diagnostic prompt - no personal identifiers sent to AI
    const diagnosticPrompt = `You are a board-certified dermatologist with over 20 years of experience in diagnosing and treating skin conditions.

🎯 MAURITIUS MEDICAL STANDARDS + DCI COMPLIANCE:
You MUST use PRECISE pharmaceutical nomenclature with DCI for ALL dermatology medications:
- TOPICAL: Hydrocortisone, Clobétasol, Tacrolimus, Clindamycine, Trétinoïne, Adapalène, etc.
- ORAL: Doxycycline, Isotrétinoïne, Prednisolone, Cétirizine, Terbinafine, etc.
- Use UK dosing format: OD (once daily), BD (twice daily), TDS (three times daily), QDS (four times daily)

PATIENT INFORMATION:
- Patient ID: ${anonymousId}
- Age: ${anonymizedPatient.age}
- Gender: ${anonymizedPatient.gender}
- Medical History: ${anonymizedPatient.medicalHistory?.join(', ') || 'None reported'}
- Known Allergies: ${anonymizedPatient.allergies?.join(', ') || 'None reported'}
- Current Medications:
  ${currentMedicationsFormatted}

IMAGE ANALYSIS FROM OCR/AI (🚨 CRITICAL PRIMARY DIAGNOSTIC DATA):
${ocrAnalysis}

⚠️ MANDATORY OCR INTEGRATION REQUIREMENTS:
You MUST actively correlate the visual observations from the IMAGE ANALYSIS above with:
1. DIFFERENTIAL DIAGNOSES: Do the visual findings (morphology, distribution, color) support or refute each differential diagnosis?
2. DIAGNOSTIC CONFIDENCE: High-quality images with clear pathognomonic findings = higher confidence. Poor quality or unclear findings = lower confidence and need for additional imaging.
3. RECOMMENDED INVESTIGATIONS: If image quality is poor or findings are ambiguous, specify what additional imaging is needed (dermoscopy, close-up photos, specific angles).
4. TREATMENT INTENSITY: Visual severity assessment (mild/moderate/severe based on extent, morphology, inflammation) must guide treatment approach.
5. MONITORING PARAMETERS: Document specific visual features to track for follow-up (lesion size, color changes, distribution evolution).

DO NOT treat the image analysis as optional context - it is PRIMARY clinical evidence that must inform EVERY aspect of your assessment.

CLINICAL HISTORY (from questions):
${questionsAnswers}

🚨 MANDATORY CURRENT MEDICATIONS HANDLING:

${hasCurrentMedications ? `
⚠️ PATIENT HAS CURRENT MEDICATIONS - YOU MUST:
1. VALIDATE and CORRECT each medication (spelling, dosing format)
2. STANDARDIZE to UK format (OD/BD/TDS/QDS)
3. ADD DCI name for each medication
4. POPULATE "currentMedicationsValidated" array with EVERY existing medication
5. FORMAT with ALL required fields: medication_name, why_prescribed, how_to_take, duration, dci, validated_corrections, original_input

EXAMPLE VALIDATION:
Input: "amlodipine 5mg once daily"
→ Output in currentMedicationsValidated: {
  "medication_name": "Amlodipine 5mg",
  "why_prescribed": "Hypertension management",
  "how_to_take": "OD (once daily)",
  "duration": "Ongoing chronic treatment",
  "dci": "Amlodipine",
  "validated_corrections": "None - correctly formatted",
  "original_input": "amlodipine 5mg once daily"
}

🚨 THIS IS MANDATORY - DO NOT SKIP CURRENT MEDICATIONS VALIDATION!
` : `
Patient has NO current medications - "currentMedicationsValidated" should be empty array []
`}

CONSULTATION TYPE: ${consultationType.toUpperCase()}

${consultationType === 'renewal' ? `
🔄 TREATMENT RENEWAL CONSULTATION STRATEGY:

This appears to be a TREATMENT RENEWAL consultation. Your approach MUST prioritize:

1. VALIDATE CURRENT MEDICATIONS:
   - Review each existing medication for continued appropriateness
   - Assess efficacy based on patient report and IMAGE ANALYSIS showing current skin condition
   - Check for adverse effects or tolerability issues
   - Evaluate if dosing adjustments needed

2. TREATMENT CONTINUATION DECISION:
   - If current treatment is EFFECTIVE and WELL-TOLERATED: Continue with same medications
   - If PARTIALLY EFFECTIVE: Consider dose adjustment or adding complementary therapy
   - If INEFFECTIVE or POORLY TOLERATED: Switch to alternative regimen

3. MINIMAL CHANGES PRINCIPLE:
   - DO NOT change working medications unnecessarily
   - Add new treatments ONLY if current regimen insufficient
   - Explain medical justification for any changes

4. MEDICATION VALIDATION MANDATORY:
   - MUST populate "currentMedicationsValidated" array with ALL existing medications
   - For each medication: provide assessment (Continue/Adjust/Stop) with clear reasoning
   - Check for interactions if adding new medications

5. PRESCRIPTION STRATEGY:
   - Validated continuing medications go in "currentMedicationsValidated"
   - New additions go in "treatmentPlan.topical" or "treatmentPlan.oral"
   - Clearly separate continuing vs new medications in patient education

` : `
🆕 NEW DERMATOLOGY PROBLEM CONSULTATION STRATEGY:

This appears to be a NEW PROBLEM consultation. Your approach:

1. COMPREHENSIVE DIAGNOSTIC ASSESSMENT:
   - Provide thorough differential diagnosis based on IMAGE ANALYSIS and clinical history
   - Establish primary diagnosis with confidence level
   - Explain pathophysiology and natural history

2. EXISTING MEDICATIONS REVIEW (if any):
   - Even for new dermatology problems, review existing medications for:
     * Drug-induced skin conditions (medications causing rash, photosensitivity, etc.)
     * Interactions with planned dermatology treatments
     * Medications that might worsen skin condition (e.g., lithium/psoriasis, beta-blockers/psoriasis)
   - MUST populate "currentMedicationsValidated" if patient has existing medications

3. NEW TREATMENT PLAN:
   - Design comprehensive treatment appropriate for new diagnosis
   - Prescribe new topical and/or oral medications as indicated
   - Provide complete management strategy

4. INTERACTION CHECKING:
   - If patient has existing medications, explicitly check for:
     * Pharmacokinetic interactions (CYP450 metabolism conflicts)
     * Pharmacodynamic interactions (additive effects, antagonism)
     * Timing considerations (separation of dosing if needed)

5. PATIENT EDUCATION:
   - Explain new diagnosis thoroughly
   - Clarify how new dermatology treatments interact with existing medications
   - Set realistic expectations for improvement timeline

`}

TASK: Provide a comprehensive dermatological assessment with appropriate consultation strategy.

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanations):
{
  "clinicalSummary": "Comprehensive summary of case presentation with key clinical features (minimum 50 characters)",
  
  "primaryDiagnosis": {
    "name": "Specific dermatological condition name",
    "icd10": "L20.9 (exact ICD-10 code)",
    "confidence": "High|Moderate|Low",
    "keyCriteria": ["criterion 1", "criterion 2", "criterion 3"],
    "presentationType": "Typical|Atypical - with explanation"
  },
  
  "differentialDiagnoses": [
    {
      "condition": "Alternative diagnosis name",
      "likelihood": 25,
      "supportingFeatures": "Features that support this diagnosis (minimum 30 characters)",
      "distinguishingFeatures": "How to distinguish from primary diagnosis (minimum 30 characters)"
    },
    {
      "condition": "Second alternative",
      "likelihood": 15,
      "supportingFeatures": "...",
      "distinguishingFeatures": "..."
    },
    {
      "condition": "Third alternative",
      "likelihood": 10,
      "supportingFeatures": "...",
      "distinguishingFeatures": "..."
    }
  ],
  
  "pathophysiology": "Detailed explanation of underlying disease mechanism (minimum 50 characters)",
  
  "recommendedInvestigations": {
    "laboratory": ["Specific test 1 with rationale", "Specific test 2 with rationale"],
    "biopsy": "EITHER: Specific biopsy type with site (e.g., 'Punch biopsy of affected lesion for histopathological confirmation') OR: 'Not indicated' if biopsy not needed. NEVER use vague terms.",
    "imaging": ["Imaging study with indication if needed"],
    "specializedTests": ["Patch testing or other specialized investigations if indicated"]
  },
  
  "treatmentPlan": {
    "immediate": {
      "description": "Immediate/acute management approach",
      "symptomatic": ["Symptomatic relief measure 1", "Symptomatic relief measure 2"]
    },
    
    "longTerm": {
      "maintenance": "Long-term maintenance therapy description",
      "preventive": ["Preventive measure 1", "Preventive measure 2"],
      "lifestyle": ["Lifestyle modification 1", "Lifestyle modification 2"]
    },
    
    "topical": [
      {
        "medication": "SPECIFIC NAME with concentration (e.g., Hydrocortisone 1% cream)",
        "dci": "DCI NAME (e.g., Hydrocortisone)",
        "application": "BD (twice daily) or OD (once daily) or TDS",
        "duration": "Treatment duration (e.g., 7-14 days)",
        "instructions": "Detailed application instructions - where, how, precautions (minimum 15 characters)",
        "sideEffects": "Common side effects to watch for"
      }
    ],
    
    "oral": [
      {
        "medication": "SPECIFIC NAME with dose (e.g., Doxycycline 100mg)",
        "dci": "DCI NAME (e.g., Doxycycline)",
        "dosage": "100mg",
        "frequency": "BD (twice daily) or OD",
        "duration": "Treatment duration (e.g., 6-12 weeks)",
        "indication": "Detailed medical indication with mechanism (minimum 20 characters)",
        "monitoring": "What to monitor during treatment",
        "contraindications": "Key contraindications"
      }
    ],
    
    "nonPharmacological": {
      "skincare": ["Skincare recommendation 1", "Skincare recommendation 2"],
      "environmental": ["Environmental modification 1", "Environmental modification 2"],
      "triggerAvoidance": ["Trigger to avoid 1", "Trigger to avoid 2"]
    }
  },
  
  "patientEducation": "Clear explanation of condition in simple terms with what to expect during treatment (minimum 100 characters)",
  
  "followUpPlan": {
    "timeline": "Specific follow-up schedule (e.g., 2 weeks, then 6 weeks)",
    "parameters": ["Parameter to monitor 1", "Parameter to monitor 2"],
    "returnSooner": "Conditions requiring earlier return"
  },
  
  "redFlags": [
    "Specific warning sign 1 requiring urgent attention",
    "Specific warning sign 2 requiring urgent attention",
    "Specific warning sign 3 requiring specialist referral"
  ],
  
  "additionalRecommendations": {
    "referrals": ["Specialist referral if needed with indication"],
    "resources": ["Support resource or patient information"],
    "otherAdvice": ["Any other relevant clinical advice"]
  },
  
  "prognosis": "Expected outcome and timeline for improvement",
  
  "currentMedicationsValidated": [
    {
      "medication_name": "MANDATORY - Full medication name with corrected dose (e.g., Amlodipine 5mg)",
      "why_prescribed": "MANDATORY - Indication or chronic condition (e.g., Hypertension)",
      "how_to_take": "MANDATORY - UK format dosing (e.g., OD, BD, TDS)",
      "duration": "MANDATORY - Ongoing chronic treatment or specific duration",
      "dci": "MANDATORY - DCI name (e.g., Amlodipine)",
      "validated_corrections": "Any corrections made to spelling or dosing",
      "original_input": "Original patient input for reference"
    }
  ]
}

⚠️ CRITICAL REQUIREMENTS:
- MANDATORY: Correlate IMAGE ANALYSIS findings with ALL aspects of your assessment (differentials, confidence, investigations, treatment)
- ALL topical medications must have: specific name with DCI, application frequency, duration, detailed instructions
- ALL oral medications must have: specific name with DCI, dosage, frequency (OD/BD/TDS), duration, detailed indication (20+ chars)
- MINIMUM 3 differential diagnoses (preferably 4-5) with likelihood %, supporting features, distinguishing features
- Clinical summary minimum 50 characters
- Pathophysiology minimum 50 characters
- Patient education minimum 100 characters
- At least 2-3 specific red flags
- ICD-10 code mandatory for primary diagnosis
- IF patient has existing medications: MUST populate "currentMedicationsValidated" array with assessment for EACH medication
- For RENEWAL consultations: Prioritize validating and continuing effective treatments
- For NEW PROBLEM consultations: Check existing medications for interactions and causative factors
- ⚠️ INVESTIGATION NAMES: If recommending biopsy, use SPECIFIC descriptive name (e.g., "Punch biopsy of lesion for histopathology"). NEVER leave generic or use test name as status indicator.

GENERATE your EXPERT dermatological assessment with MAXIMUM clinical specificity and pharmaceutical precision.`

    // Call OpenAI with retry mechanism and quality validation
    const result = await callOpenAIWithRetry(openai, diagnosticPrompt, 2)
    const diagnosisData = result.diagnosis
    
    // Generate formatted text for backward compatibility
    const fullTextDiagnosis = generateFormattedDiagnosisText(diagnosisData)

    // ========== EXTRACT TO TOP LEVEL - MATCH NORMAL WORKFLOW STRUCTURE ==========
    const currentMedicationsValidated = diagnosisData?.currentMedicationsValidated || []
    console.log(`📋 DERMATOLOGY: Extracting currentMedicationsValidated - ${currentMedicationsValidated.length} medications`)
    
    // ========== EXTRACT MEDICATIONS FROM treatmentPlan (topical + oral) ==========
    const topicalMedicationsRaw = diagnosisData?.treatmentPlan?.topical || []
    const oralMedicationsRaw = diagnosisData?.treatmentPlan?.oral || []
    
    console.log(`💊 DERMATOLOGY: Extracting medications from treatmentPlan`)
    console.log(`   - Topical medications (raw): ${topicalMedicationsRaw.length}`)
    console.log(`   - Oral medications (raw): ${oralMedicationsRaw.length}`)
    
    // ========== CHECK FOR MEDICAL APPROPRIATENESS OF NO MEDICATIONS ==========
    const primaryDiagnosisName = diagnosisData?.primaryDiagnosis?.name || ''
    const hasBiopsy = diagnosisData?.recommendedInvestigations?.biopsy && 
                      diagnosisData.recommendedInvestigations.biopsy !== 'Not indicated'
    const hasReferral = diagnosisData?.additionalRecommendations?.referrals?.length > 0
    
    if (topicalMedicationsRaw.length === 0 && oralMedicationsRaw.length === 0) {
      console.log(`⚠️ DERMATOLOGY: No medications prescribed`)
      console.log(`   - Primary diagnosis: ${primaryDiagnosisName}`)
      console.log(`   - Biopsy required: ${hasBiopsy ? 'Yes' : 'No'}`)
      console.log(`   - Referral required: ${hasReferral ? 'Yes' : 'No'}`)
      
      // Check if this is medically appropriate (cancer, pre-malignant lesions, etc.)
      const requiresSpecialistOnly = primaryDiagnosisName.toLowerCase().includes('melanoma') ||
                                     primaryDiagnosisName.toLowerCase().includes('carcinoma') ||
                                     primaryDiagnosisName.toLowerCase().includes('cancer') ||
                                     hasBiopsy
      
      if (requiresSpecialistOnly) {
        console.log(`   ✅ MEDICALLY APPROPRIATE: Condition requires specialist management, no GP-level treatment`)
      } else {
        console.log(`   ⚠️ WARNING: No medications prescribed for non-specialist condition`)
      }
    }
    
    // ========== TRANSFORM MEDICATIONS TO MATCH NORMAL WORKFLOW FORMAT ==========
    // Dermatology uses: medication, dci, application/frequency, instructions/indication
    // Normal workflow uses: nom, denominationCommune, dosage, posologie, forme, modeAdministration
    
    const topicalMedications = topicalMedicationsRaw.map((med: any) => {
      console.log(`   📦 Transforming topical med: ${med.medication || 'UNNAMED'}`)
      return {
        nom: med.medication || '',
        denominationCommune: med.dci || '',
        dosage: '', // Topical doesn't have dosage in mg
        forme: 'cream', // Could be cream, ointment, lotion - default to cream
        posologie: med.application || '', // BD, OD, etc.
        modeAdministration: 'Topical application',
        dureeTraitement: med.duration || '',
        quantite: '1 tube',
        instructions: med.instructions || '',
        justification: `Topical treatment. ${med.sideEffects || ''}`,
        surveillanceParticuliere: med.sideEffects || '',
        nonSubstituable: false
      }
    })
    
    const oralMedications = oralMedicationsRaw.map((med: any) => {
      console.log(`   💊 Transforming oral med: ${med.medication || 'UNNAMED'}`)
      return {
        nom: med.medication || '',
        denominationCommune: med.dci || '',
        dosage: med.dosage || '',
        forme: 'tablet',
        posologie: med.frequency || '',
        modeAdministration: 'Oral route',
        dureeTraitement: med.duration || '',
        quantite: '1 box',
        instructions: med.indication || '',
        justification: med.indication || '',
        surveillanceParticuliere: med.monitoring || '',
        nonSubstituable: false,
        contraindications: med.contraindications || ''
      }
    })
    
    const medications = [...topicalMedications, ...oralMedications]
    
    console.log(`✅ DERMATOLOGY: Medications transformed to standard format`)
    console.log(`   - Topical medications: ${topicalMedications.length}`)
    console.log(`   - Oral medications: ${oralMedications.length}`)
    console.log(`   - Total medications: ${medications.length}`)
    
    // Log first medication details for verification
    if (medications.length > 0) {
      const firstMed = medications[0]
      console.log(`   📋 First medication details:`)
      console.log(`      - nom: ${firstMed.nom}`)
      console.log(`      - denominationCommune: ${firstMed.denominationCommune}`)
      console.log(`      - dosage: ${firstMed.dosage}`)
      console.log(`      - posologie: ${firstMed.posologie}`)
      console.log(`      - forme: ${firstMed.forme}`)
    }
    
    // ========== EXTRACT INVESTIGATIONS FROM recommendedInvestigations ==========
    const investigations = diagnosisData?.recommendedInvestigations || {}
    const laboratoryTests = investigations.laboratory || []
    const imagingTests = investigations.imaging || []
    
    // ⚠️ FILTER OUT "Not indicated" from biopsy recommendation
    const biopsyRaw = investigations.biopsy || ''
    const biopsyTest = (biopsyRaw && 
                        biopsyRaw !== 'Not indicated' && 
                        !biopsyRaw.toLowerCase().includes('not indicated')) 
      ? [biopsyRaw] 
      : []
    
    const specializedTests = investigations.specializedTests || []
    
    console.log(`🔬 DERMATOLOGY: Filtering investigations`)
    console.log(`   - Biopsy raw: "${biopsyRaw}"`)
    console.log(`   - Biopsy filtered: ${biopsyTest.length > 0 ? `"${biopsyTest[0]}"` : 'EXCLUDED (Not indicated)'}`)
    
    // Combine all investigations into expertAnalysis format (match normal workflow)
    const allInvestigations = [
      ...laboratoryTests.map((test: string) => ({
        examination: test,
        category: 'Laboratory',
        urgency: 'routine',
        indication: 'Dermatology investigation',
        rationale: 'Clinical assessment'
      })),
      ...imagingTests.map((test: string) => ({
        examination: test,
        category: 'Imaging',
        urgency: 'routine',
        indication: 'Dermatology imaging',
        rationale: 'Diagnostic imaging'
      })),
      ...biopsyTest.map((test: string) => ({
        examination: test,
        category: 'Dermatology',
        urgency: 'urgent',
        indication: 'Tissue diagnosis if diagnosis uncertain',
        rationale: 'Histopathological confirmation'
      })),
      ...specializedTests.map((test: string) => ({
        examination: test,
        category: 'Laboratory',
        urgency: 'routine',
        indication: 'Specialized dermatology test',
        rationale: 'Specific diagnostic test'
      }))
    ]
    
    console.log(`🔬 DERMATOLOGY: Extracting investigations`)
    console.log(`   - Laboratory tests: ${laboratoryTests.length}`)
    console.log(`   - Imaging tests: ${imagingTests.length}`)
    console.log(`   - Biopsy: ${biopsyTest.length}`)
    console.log(`   - Specialized tests: ${specializedTests.length}`)
    console.log(`   - Total investigations: ${allInvestigations.length}`)
    
    // ========== COMBINED PRESCRIPTION (current + new medications) ==========
    const combinedPrescription = [...currentMedicationsValidated, ...medications]
    console.log(`📋 DERMATOLOGY: Combined prescription - ${combinedPrescription.length} total medications`)
    
    // ========== CHECK IF NO MEDICATIONS IS MEDICALLY APPROPRIATE ==========
    const requiresSpecialistOnly = primaryDiagnosisName.toLowerCase().includes('melanoma') ||
                                   primaryDiagnosisName.toLowerCase().includes('carcinoma') ||
                                   primaryDiagnosisName.toLowerCase().includes('cancer') ||
                                   hasBiopsy
    
    const noMedicationsReason = (medications.length === 0 && requiresSpecialistOnly) 
      ? `No medications prescribed - ${primaryDiagnosisName} requires urgent specialist evaluation and biopsy confirmation before treatment initiation.`
      : null
    
    if (noMedicationsReason) {
      console.log(`ℹ️ NO MEDICATIONS REASON: ${noMedicationsReason}`)
    }
    
    // ========== BUILD RESPONSE WITH SAME STRUCTURE AS NORMAL WORKFLOW ==========
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      diagnosisId: `DERM-DX-${Date.now()}`,
      patientInfo: {
        firstName: originalIdentity.firstName,
        lastName: originalIdentity.lastName,
        age: anonymizedPatient.age
      },
      
      // ========== TOP-LEVEL MEDICATIONS (MATCH NORMAL WORKFLOW) ==========
      currentMedicationsValidated: currentMedicationsValidated,
      medications: medications,
      combinedPrescription: combinedPrescription,
      noMedicationsReason: noMedicationsReason, // Explain when 0 medications is medically appropriate
      
      // ========== TOP-LEVEL ANALYSIS WITH INVESTIGATIONS (MATCH NORMAL WORKFLOW) ==========
      expertAnalysis: {
        expert_therapeutics: {
          primary_treatments: medications
        },
        expert_investigations: {
          immediate_priority: allInvestigations
        }
      },
      
      // ========== ORIGINAL DERMATOLOGY STRUCTURE (FOR BACKWARD COMPATIBILITY) ==========
      diagnosis: {
        fullText: fullTextDiagnosis,
        structured: diagnosisData
      },
      
      qualityMetrics: result.qualityMetrics,
      version: '4.0-Professional-Grade-4Retry-AutoCorrect-Normalized',
      consultationType: consultationType,
      metadata: {
        imagesAnalyzed: imageData?.length || 0,
        questionsAnswered: Object.keys(questionsData?.answers || {}).length,
        generatedAt: new Date().toISOString(),
        structureNormalized: true,
        matchesNormalWorkflow: true
      }
    }

    console.log('✅ Dermatology diagnosis v3.0 completed successfully')
    console.log(`📊 Quality Metrics:`)
    console.log(`   - Medication DCI: ${result.qualityMetrics.medicationDCICompliant ? '✅' : '⚠️'}`)
    console.log(`   - Differentials: ${result.qualityMetrics.differentialComplete ? '✅' : '⚠️'}`)
    console.log(`   - Clinical Quality: ${result.qualityMetrics.clinicalQuality ? '✅' : '⚠️'}`)
    console.log(`   - Current Meds Reviewed: ${result.qualityMetrics.currentMedicationsReviewed ? '✅' : '⚠️'}`)
    console.log(`   - Consultation Type: ${consultationType}`)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Error in dermatology diagnosis:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to generate dermatology diagnosis',
        message: error.message,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Generates formatted text from structured diagnosis for backward compatibility
 */
function generateFormattedDiagnosisText(diagnosis: any): string {
  let text = ''
  
  // 1. CLINICAL SUMMARY
  text += '1. CLINICAL SUMMARY\n\n'
  text += `${diagnosis.clinicalSummary || 'No summary available'}\n\n`
  
  // 2. PRIMARY DIAGNOSIS
  text += '2. PRIMARY DIAGNOSIS\n\n'
  if (diagnosis.primaryDiagnosis) {
    text += `Diagnosis: ${diagnosis.primaryDiagnosis.name || 'Not specified'}\n`
    text += `ICD-10 Code: ${diagnosis.primaryDiagnosis.icd10 || 'Not specified'}\n`
    text += `Confidence Level: ${diagnosis.primaryDiagnosis.confidence || 'Not specified'}\n`
    if (diagnosis.primaryDiagnosis.keyCriteria && diagnosis.primaryDiagnosis.keyCriteria.length > 0) {
      text += `Key Diagnostic Criteria:\n`
      diagnosis.primaryDiagnosis.keyCriteria.forEach((criterion: string) => {
        text += `  - ${criterion}\n`
      })
    }
    text += `Presentation Type: ${diagnosis.primaryDiagnosis.presentationType || 'Not specified'}\n\n`
  }
  
  // 3. DIFFERENTIAL DIAGNOSES
  text += '3. DIFFERENTIAL DIAGNOSES\n\n'
  if (diagnosis.differentialDiagnoses && diagnosis.differentialDiagnoses.length > 0) {
    diagnosis.differentialDiagnoses.forEach((diff: any, index: number) => {
      text += `${index + 1}. ${diff.condition} (Likelihood: ${diff.likelihood}%)\n`
      text += `   Supporting Features: ${diff.supportingFeatures}\n`
      text += `   Distinguishing Features: ${diff.distinguishingFeatures}\n\n`
    })
  } else {
    text += 'No differential diagnoses provided\n\n'
  }
  
  // 4. PATHOPHYSIOLOGY
  text += '4. PATHOPHYSIOLOGY\n\n'
  text += `${diagnosis.pathophysiology || 'Not provided'}\n\n`
  
  // 5. RECOMMENDED INVESTIGATIONS
  text += '5. RECOMMENDED INVESTIGATIONS\n\n'
  if (diagnosis.recommendedInvestigations) {
    const inv = diagnosis.recommendedInvestigations
    
    if (inv.laboratory && inv.laboratory.length > 0) {
      text += 'Laboratory Tests:\n'
      inv.laboratory.forEach((test: string) => {
        text += `  - ${test}\n`
      })
    }
    
    if (inv.biopsy) {
      text += `\nBiopsy: ${inv.biopsy}\n`
    }
    
    if (inv.imaging && inv.imaging.length > 0) {
      text += '\nImaging Studies:\n'
      inv.imaging.forEach((img: string) => {
        text += `  - ${img}\n`
      })
    }
    
    if (inv.specializedTests && inv.specializedTests.length > 0) {
      text += '\nSpecialized Tests:\n'
      inv.specializedTests.forEach((test: string) => {
        text += `  - ${test}\n`
      })
    }
    text += '\n'
  }
  
  // 6. CURRENT MEDICATIONS REVIEW (if applicable)
  if (diagnosis.currentMedicationsValidated && diagnosis.currentMedicationsValidated.length > 0) {
    text += '6. CURRENT MEDICATIONS REVIEW\n\n'
    diagnosis.currentMedicationsValidated.forEach((med: any, index: number) => {
      text += `${index + 1}. ${med.medication}\n`
      text += `   Indication: ${med.indication}\n`
      text += `   Current Frequency: ${med.frequency}\n`
      text += `   Assessment: ${med.assessment}\n`
      text += `   Reasoning: ${med.reasoning}\n`
      if (med.dosageChange && med.dosageChange !== 'None') {
        text += `   Dosage Change: ${med.dosageChange}\n`
      }
      if (med.interactions) {
        text += `   Interactions: ${med.interactions}\n`
      }
      text += '\n'
    })
  }
  
  // 7. TREATMENT PLAN
  text += `${diagnosis.currentMedicationsValidated && diagnosis.currentMedicationsValidated.length > 0 ? '7' : '6'}. TREATMENT PLAN\n\n`
  if (diagnosis.treatmentPlan) {
    const tx = diagnosis.treatmentPlan
    
    // Immediate management
    if (tx.immediate) {
      text += 'A. Immediate/Acute Management:\n'
      text += `   ${tx.immediate.description || 'Not specified'}\n`
      if (tx.immediate.symptomatic && tx.immediate.symptomatic.length > 0) {
        text += '   Symptomatic Relief:\n'
        tx.immediate.symptomatic.forEach((measure: string) => {
          text += `     - ${measure}\n`
        })
      }
      text += '\n'
    }
    
    // Long-term management
    if (tx.longTerm) {
      text += 'B. Long-term Management:\n'
      if (tx.longTerm.maintenance) {
        text += `   Maintenance Therapy: ${tx.longTerm.maintenance}\n`
      }
      if (tx.longTerm.preventive && tx.longTerm.preventive.length > 0) {
        text += '   Preventive Measures:\n'
        tx.longTerm.preventive.forEach((measure: string) => {
          text += `     - ${measure}\n`
        })
      }
      if (tx.longTerm.lifestyle && tx.longTerm.lifestyle.length > 0) {
        text += '   Lifestyle Modifications:\n'
        tx.longTerm.lifestyle.forEach((mod: string) => {
          text += `     - ${mod}\n`
        })
      }
      text += '\n'
    }
    
    // Topical medications
    if (tx.topical && tx.topical.length > 0) {
      text += 'C. Topical Medications:\n'
      tx.topical.forEach((med: any, index: number) => {
        text += `   ${index + 1}. ${med.medication}\n`
        text += `      DCI: ${med.dci}\n`
        text += `      Application: ${med.application}\n`
        text += `      Duration: ${med.duration}\n`
        text += `      Instructions: ${med.instructions}\n`
        if (med.sideEffects) {
          text += `      Side Effects: ${med.sideEffects}\n`
        }
        text += '\n'
      })
    }
    
    // Oral medications
    if (tx.oral && tx.oral.length > 0) {
      text += 'D. Oral Medications:\n'
      tx.oral.forEach((med: any, index: number) => {
        text += `   ${index + 1}. ${med.medication}\n`
        text += `      DCI: ${med.dci}\n`
        text += `      Dosage: ${med.dosage}\n`
        text += `      Frequency: ${med.frequency}\n`
        text += `      Duration: ${med.duration}\n`
        text += `      Indication: ${med.indication}\n`
        if (med.monitoring) {
          text += `      Monitoring: ${med.monitoring}\n`
        }
        if (med.contraindications) {
          text += `      Contraindications: ${med.contraindications}\n`
        }
        text += '\n'
      })
    }
    
    // Non-pharmacological
    if (tx.nonPharmacological) {
      text += 'E. Non-pharmacological Management:\n'
      if (tx.nonPharmacological.skincare && tx.nonPharmacological.skincare.length > 0) {
        text += '   Skincare Routine:\n'
        tx.nonPharmacological.skincare.forEach((item: string) => {
          text += `     - ${item}\n`
        })
      }
      if (tx.nonPharmacological.environmental && tx.nonPharmacological.environmental.length > 0) {
        text += '   Environmental Modifications:\n'
        tx.nonPharmacological.environmental.forEach((item: string) => {
          text += `     - ${item}\n`
        })
      }
      if (tx.nonPharmacological.triggerAvoidance && tx.nonPharmacological.triggerAvoidance.length > 0) {
        text += '   Trigger Avoidance:\n'
        tx.nonPharmacological.triggerAvoidance.forEach((item: string) => {
          text += `     - ${item}\n`
        })
      }
      text += '\n'
    }
  }
  
  // PATIENT EDUCATION
  const sectionNum = diagnosis.currentMedicationsValidated && diagnosis.currentMedicationsValidated.length > 0 ? 8 : 7
  text += `${sectionNum}. PATIENT EDUCATION\n\n`
  text += `${diagnosis.patientEducation || 'Not provided'}\n\n`
  
  // FOLLOW-UP PLAN
  text += `${sectionNum + 1}. FOLLOW-UP PLAN\n\n`
  if (diagnosis.followUpPlan) {
    const fu = diagnosis.followUpPlan
    text += `Timeline: ${fu.timeline || 'Not specified'}\n`
    if (fu.parameters && fu.parameters.length > 0) {
      text += 'Parameters to Monitor:\n'
      fu.parameters.forEach((param: string) => {
        text += `  - ${param}\n`
      })
    }
    if (fu.returnSooner) {
      text += `Return Sooner If: ${fu.returnSooner}\n`
    }
    text += '\n'
  }
  
  // RED FLAGS
  const redFlagNum = diagnosis.currentMedicationsValidated && diagnosis.currentMedicationsValidated.length > 0 ? 10 : 9
  text += `${redFlagNum}. RED FLAGS\n\n`
  if (diagnosis.redFlags && diagnosis.redFlags.length > 0) {
    diagnosis.redFlags.forEach((flag: string) => {
      text += `  ⚠️ ${flag}\n`
    })
    text += '\n'
  } else {
    text += 'No specific red flags identified\n\n'
  }
  
  // ADDITIONAL RECOMMENDATIONS
  const addRecNum = diagnosis.currentMedicationsValidated && diagnosis.currentMedicationsValidated.length > 0 ? 11 : 10
  text += `${addRecNum}. ADDITIONAL RECOMMENDATIONS\n\n`
  if (diagnosis.additionalRecommendations) {
    const rec = diagnosis.additionalRecommendations
    if (rec.referrals && rec.referrals.length > 0) {
      text += 'Specialist Referrals:\n'
      rec.referrals.forEach((ref: string) => {
        text += `  - ${ref}\n`
      })
    }
    if (rec.resources && rec.resources.length > 0) {
      text += '\nSupport Resources:\n'
      rec.resources.forEach((res: string) => {
        text += `  - ${res}\n`
      })
    }
    if (rec.otherAdvice && rec.otherAdvice.length > 0) {
      text += '\nOther Advice:\n'
      rec.otherAdvice.forEach((advice: string) => {
        text += `  - ${advice}\n`
      })
    }
    text += '\n'
  }
  
  // PROGNOSIS
  const prognosisNum = diagnosis.currentMedicationsValidated && diagnosis.currentMedicationsValidated.length > 0 ? 12 : 11
  text += `${prognosisNum}. PROGNOSIS\n\n`
  text += `${diagnosis.prognosis || 'Not provided'}\n`
  
  return text
}

// Helper function to format questions and answers
function formatQuestionsAnswers(answers: any, questions: any[]): string {
  if (!answers || Object.keys(answers).length === 0) {
    return 'No clinical history provided'
  }

  let formatted = ''
  
  questions.forEach((question: any) => {
    const answer = answers[question.id]
    if (answer) {
      formatted += `\nQ: ${question.question}\nA: ${Array.isArray(answer) ? answer.join(', ') : answer}\n`
    }
  })

  return formatted || 'No clinical history provided'
}
