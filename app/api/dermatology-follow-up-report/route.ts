import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

/**
 * API Route: Dermatology Follow-Up Report Generation
 * 
 * Generates comprehensive dermatology follow-up reports with image comparison analysis.
 * Focuses on:
 * - Visual progression of skin conditions
 * - Treatment effectiveness assessment
 * - Lesion characteristics changes
 * - Before/after image analysis
 * - Dermatological diagnostic reasoning
 * 
 * Uses GPT-4o for superior clinical reasoning and image analysis descriptions.
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      patientDemographics, 
      clinicalData,
      imageComparisonData,
      previousConsultation,
      consultationHistory 
    } = await req.json()

    // Validate required data
    if (!patientDemographics || !clinicalData || !imageComparisonData) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    // Build patient context
    const patientContext = buildPatientContext(
      patientDemographics,
      clinicalData,
      imageComparisonData,
      previousConsultation,
      consultationHistory
    )

    // Generate report using GPT-4o
    const result = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: DERMATOLOGY_FOLLOW_UP_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: patientContext
        }
      ],
      maxTokens: 4500,
      temperature: 0.3
    })

    // Parse structured response
    const report = parseStructuredReport(result.text)

    return NextResponse.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('Error generating dermatology follow-up report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function buildPatientContext(
  demographics: any,
  clinical: any,
  images: any,
  previous: any,
  history: any[]
): string {
  const sections = []

  // Patient Demographics
  sections.push('=== PATIENT INFORMATION ===')
  sections.push(`Name: ${demographics.fullName}`)
  sections.push(`Age: ${demographics.age} years`)
  sections.push(`Gender: ${demographics.gender}`)
  if (demographics.email) sections.push(`Email: ${demographics.email}`)
  sections.push('')

  // Medical History
  if (demographics.medicalHistory && demographics.medicalHistory.length > 0) {
    sections.push('Medical History: ' + demographics.medicalHistory.join(', '))
  }
  if (demographics.allergies && demographics.allergies.length > 0) {
    sections.push('Allergies: ' + demographics.allergies.join(', '))
  }
  sections.push('')

  // Previous Consultation Context
  if (previous) {
    sections.push('=== PREVIOUS DERMATOLOGY CONSULTATION ===')
    sections.push(`Date: ${new Date(previous.date).toLocaleDateString()}`)
    sections.push(`Chief Complaint: ${previous.chiefComplaint || 'N/A'}`)
    sections.push(`Previous Diagnosis: ${previous.diagnosis || 'N/A'}`)
    
    if (previous.medications && previous.medications.length > 0) {
      sections.push('\nPrevious Treatment:')
      previous.medications.forEach((med: any) => {
        const medName = typeof med === 'string' ? med : med.name
        sections.push(`  - ${medName}`)
      })
    }
    sections.push('')
  }

  // Consultation History Summary
  if (history && history.length > 1) {
    sections.push('=== DERMATOLOGY CONSULTATION HISTORY ===')
    sections.push(`Total dermatology consultations: ${history.length}`)
    sections.push('\nRecent consultations:')
    history.slice(0, 3).forEach((consult, idx) => {
      sections.push(`  ${idx + 1}. ${new Date(consult.date).toLocaleDateString()} - ${consult.chiefComplaint || 'Dermatology consultation'}`)
    })
    sections.push('')
  }

  // Image Comparison Data
  if (images) {
    sections.push('=== IMAGE COMPARISON ANALYSIS ===')
    sections.push(`Previous Images: ${images.previousImages?.length || 0}`)
    sections.push(`Current Images: ${images.currentImages?.length || 0}`)
    
    if (images.visualComparison) {
      sections.push('\nVisual Changes Observed:')
      sections.push(images.visualComparison)
    }
    
    if (images.imageNotes) {
      sections.push('\nImage Notes:')
      sections.push(images.imageNotes)
    }
    sections.push('')
  }

  // Current Visit Data
  sections.push('=== CURRENT DERMATOLOGY FOLLOW-UP VISIT ===')
  sections.push(`Date: ${new Date().toLocaleDateString()}`)
  sections.push('')

  sections.push('Chief Complaint:')
  sections.push(clinical.chiefComplaint)
  sections.push('')

  if (clinical.presentIllness) {
    sections.push('History of Present Illness:')
    sections.push(clinical.presentIllness)
    sections.push('')
  }

  if (clinical.previousTreatmentResponse) {
    sections.push('Treatment Response Since Last Visit:')
    sections.push(clinical.previousTreatmentResponse)
    sections.push('')
  }

  // Dermatological Findings
  sections.push('=== CURRENT DERMATOLOGICAL FINDINGS ===')
  
  if (clinical.lesionLocation) {
    sections.push(`Lesion Location: ${clinical.lesionLocation}`)
  }
  if (clinical.lesionSize) {
    sections.push(`Size: ${clinical.lesionSize}`)
  }
  if (clinical.lesionColor) {
    sections.push(`Color/Pigmentation: ${clinical.lesionColor}`)
  }
  if (clinical.lesionTexture) {
    sections.push(`Texture: ${clinical.lesionTexture}`)
  }
  if (clinical.lesionBorders) {
    sections.push(`Borders: ${clinical.lesionBorders}`)
  }
  if (clinical.surfaceChanges) {
    sections.push(`Surface Changes: ${clinical.surfaceChanges}`)
  }
  sections.push('')

  if (clinical.associatedSymptoms) {
    sections.push('Associated Symptoms:')
    sections.push(clinical.associatedSymptoms)
    sections.push('')
  }

  if (clinical.skinExamination) {
    sections.push('Comprehensive Skin Examination:')
    sections.push(clinical.skinExamination)
    sections.push('')
  }

  if (clinical.diagnosis) {
    sections.push('Clinical Assessment/Diagnosis:')
    sections.push(clinical.diagnosis)
    sections.push('')
  }

  return sections.join('\n')
}

const DERMATOLOGY_FOLLOW_UP_SYSTEM_PROMPT = `You are an expert dermatologist generating a comprehensive DERMATOLOGY FOLLOW-UP report.

This is a DERMATOLOGY FOLLOW-UP CONSULTATION focusing on:
1. Visual assessment of skin condition progression
2. Comparison with previous images and findings
3. Evaluation of treatment effectiveness
4. Dermatological diagnostic reasoning
5. Assessment of lesion characteristics changes

CRITICAL REQUIREMENTS:

1. **Structure your response EXACTLY in this format:**

   [PATIENT_INFO]
   Structured patient demographics
   [/PATIENT_INFO]

   [CHIEF_COMPLAINT]
   Current dermatological concern
   [/CHIEF_COMPLAINT]

   [IMAGE_COMPARISON]
   Detailed analysis comparing previous and current images:
   - Changes in lesion size, color, texture
   - Improvement or worsening of condition
   - New lesions or resolution of old ones
   - Response to treatment visible in images
   - Dermatological assessment of visual progression
   [/IMAGE_COMPARISON]

   [TREATMENT_RESPONSE]
   Assessment of treatment response since last visit:
   - Efficacy of previous treatment
   - Side effects or complications
   - Patient adherence
   - Clinical improvement or deterioration
   [/TREATMENT_RESPONSE]

   [PRESENT_ILLNESS]
   Timeline and progression of skin condition
   [/PRESENT_ILLNESS]

   [DERMATOLOGICAL_FINDINGS]
   Detailed dermatological examination findings:
   - Lesion morphology (size, shape, color, borders)
   - Surface characteristics
   - Distribution pattern
   - Associated features
   [/DERMATOLOGICAL_FINDINGS]

   [SKIN_EXAMINATION]
   Comprehensive skin examination
   [/SKIN_EXAMINATION]

   [CLINICAL_ASSESSMENT]
   Overall dermatological assessment and progression
   [/CLINICAL_ASSESSMENT]

   [DIAGNOSIS]
   Dermatological diagnosis (confirmed/updated/differential)
   [/DIAGNOSIS]

   [TREATMENT_PLAN]
   Treatment plan adjustments:
   - Continue effective treatments
   - Modify ineffective treatments
   - New dermatological interventions
   - Topical/systemic medications
   [/TREATMENT_PLAN]

   [RECOMMENDATIONS]
   Dermatological recommendations:
   - Skin care regimen
   - Sun protection
   - Lifestyle modifications
   - Patient education
   [/RECOMMENDATIONS]

   [FOLLOW_UP_PLAN]
   Follow-up schedule and monitoring plan
   [/FOLLOW_UP_PLAN]

   [SIGNATURE]
   Professional signature
   [/SIGNATURE]

2. **Dermatology-Specific Focus:**
   - Emphasize visual changes and morphological progression
   - Use dermatological terminology appropriately
   - Describe lesion characteristics systematically
   - Compare before/after appearances
   - Assess treatment response based on clinical findings

3. **Clinical Depth:**
   - Professional dermatological terminology
   - Evidence-based dermatological reasoning
   - Detailed morphological descriptions
   - 1500-2500 words total

4. **Image Analysis:**
   - Reference provided image comparison data
   - Describe visible changes
   - Clinical correlation with findings
   - Prognostic implications

Generate a thorough, professional dermatology follow-up report.`

function parseStructuredReport(text: string): any {
  const report: any = {}

  const sections = [
    { key: 'patientInfo', tag: 'PATIENT_INFO' },
    { key: 'chiefComplaint', tag: 'CHIEF_COMPLAINT' },
    { key: 'imageComparison', tag: 'IMAGE_COMPARISON' },
    { key: 'treatmentResponse', tag: 'TREATMENT_RESPONSE' },
    { key: 'presentIllness', tag: 'PRESENT_ILLNESS' },
    { key: 'dermatologicalFindings', tag: 'DERMATOLOGICAL_FINDINGS' },
    { key: 'skinExamination', tag: 'SKIN_EXAMINATION' },
    { key: 'clinicalAssessment', tag: 'CLINICAL_ASSESSMENT' },
    { key: 'diagnosis', tag: 'DIAGNOSIS' },
    { key: 'treatmentPlan', tag: 'TREATMENT_PLAN' },
    { key: 'recommendations', tag: 'RECOMMENDATIONS' },
    { key: 'followUpPlan', tag: 'FOLLOW_UP_PLAN' },
    { key: 'signature', tag: 'SIGNATURE' }
  ]

  sections.forEach(({ key, tag }) => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
    const match = text.match(regex)
    if (match && match[1]) {
      report[key] = match[1].trim()
    }
  })

  return report
}
