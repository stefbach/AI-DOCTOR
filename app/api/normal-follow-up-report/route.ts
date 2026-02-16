import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

/**
 * API Route: Normal Follow-Up Report Generation
 * 
 * Generates comprehensive follow-up medical reports with historical context.
 * Compares current clinical data with previous consultations to identify:
 * - Clinical progression or regression
 * - Treatment effectiveness
 * - New concerns or improvements
 * - Adjusted treatment plans
 * 
 * Uses GPT-4o for superior narrative quality and clinical reasoning.
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      patientDemographics, 
      clinicalData, 
      previousConsultation,
      consultationHistory 
    } = await req.json()

    // Validate required data
    if (!patientDemographics || !clinicalData) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    // Build patient context
    const patientContext = buildPatientContext(
      patientDemographics,
      clinicalData,
      previousConsultation,
      consultationHistory
    )

    // Generate report using GPT-5.2
    const result = await generateText({
      model: openai('gpt-5.2', { reasoningEffort: 'none' }),
      messages: [
        {
          role: 'system',
          content: FOLLOW_UP_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: patientContext
        }
      ],
      maxTokens: 4000,
      temperature: 0.3
    })

    // Parse structured response
    const report = parseStructuredReport(result.text)

    return NextResponse.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('Error generating follow-up report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function buildPatientContext(
  demographics: any,
  clinical: any,
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
  if (demographics.phone) sections.push(`Phone: ${demographics.phone}`)
  sections.push('')

  // Medical History
  if (demographics.medicalHistory && demographics.medicalHistory.length > 0) {
    sections.push('Medical History: ' + demographics.medicalHistory.join(', '))
  }
  if (demographics.allergies && demographics.allergies.length > 0) {
    sections.push('Allergies: ' + demographics.allergies.join(', '))
  }
  if (demographics.currentMedications && demographics.currentMedications.length > 0) {
    sections.push('Current Medications: ' + demographics.currentMedications.join(', '))
  }
  sections.push('')

  // Previous Consultation Context
  if (previous) {
    sections.push('=== PREVIOUS CONSULTATION CONTEXT ===')
    sections.push(`Date: ${new Date(previous.date).toLocaleDateString()}`)
    sections.push(`Chief Complaint: ${previous.chiefComplaint || 'N/A'}`)
    sections.push(`Diagnosis: ${previous.diagnosis || 'N/A'}`)
    
    if (previous.vitalSigns) {
      sections.push('\nPrevious Vital Signs:')
      Object.entries(previous.vitalSigns).forEach(([key, value]) => {
        sections.push(`  ${key}: ${value}`)
      })
    }

    if (previous.medications && previous.medications.length > 0) {
      sections.push('\nPrevious Medications:')
      previous.medications.forEach((med: any) => {
        const medName = typeof med === 'string' ? med : med.name
        sections.push(`  - ${medName}`)
      })
    }
    sections.push('')
  }

  // Consultation History Summary
  if (history && history.length > 1) {
    sections.push('=== CONSULTATION HISTORY SUMMARY ===')
    sections.push(`Total consultations on record: ${history.length}`)
    sections.push('\nRecent consultations:')
    history.slice(0, 3).forEach((consult, idx) => {
      sections.push(`  ${idx + 1}. ${new Date(consult.date).toLocaleDateString()} - ${consult.chiefComplaint || 'General consultation'}`)
    })
    sections.push('')
  }

  // Current Visit Data
  sections.push('=== CURRENT VISIT (FOLLOW-UP) ===')
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

  if (clinical.symptoms) {
    sections.push('Current Symptoms:')
    sections.push(clinical.symptoms)
    sections.push('')
  }

  // Current Vital Signs
  sections.push('Current Vital Signs:')
  if (clinical.bloodPressureSystolic && clinical.bloodPressureDiastolic) {
    sections.push(`  Blood Pressure: ${clinical.bloodPressureSystolic}/${clinical.bloodPressureDiastolic} mmHg`)
  }
  if (clinical.heartRate) {
    sections.push(`  Heart Rate: ${clinical.heartRate} bpm`)
  }
  if (clinical.temperature) {
    sections.push(`  Temperature: ${clinical.temperature}°C`)
  }
  if (clinical.weight) {
    sections.push(`  Weight: ${clinical.weight} kg`)
  }
  if (clinical.height) {
    sections.push(`  Height: ${clinical.height} cm`)
  }
  if (clinical.bmi) {
    sections.push(`  BMI: ${clinical.bmi} kg/m²`)
  }
  if (clinical.respiratoryRate) {
    sections.push(`  Respiratory Rate: ${clinical.respiratoryRate}/min`)
  }
  if (clinical.oxygenSaturation) {
    sections.push(`  Oxygen Saturation: ${clinical.oxygenSaturation}%`)
  }
  sections.push('')

  // Physical Examination
  if (clinical.physicalExam) {
    sections.push('Physical Examination Findings:')
    sections.push(clinical.physicalExam)
    sections.push('')
  }

  // Comparison Data
  if (clinical.comparison) {
    sections.push('=== VITAL SIGNS COMPARISON ===')
    
    if (clinical.comparison.bloodPressure) {
      const bp = clinical.comparison.bloodPressure
      sections.push(`Blood Pressure: ${bp.previousValue} → ${bp.currentValue} mmHg`)
      sections.push(`  Change: ${bp.change} mmHg (${bp.changePercent > 0 ? '+' : ''}${bp.changePercent.toFixed(1)}%)`)
      sections.push(`  Trend: ${bp.trend}`)
      sections.push(`  Status: ${bp.interpretation}`)
      if (bp.isImprovement !== undefined) {
        sections.push(`  Assessment: ${bp.isImprovement ? '✓ IMPROVED' : '⚠ CONCERN'}`)
      }
      sections.push('')
    }

    if (clinical.comparison.weight) {
      const wt = clinical.comparison.weight
      sections.push(`Weight: ${wt.previousValue} → ${wt.currentValue} kg`)
      sections.push(`  Change: ${wt.change} kg (${wt.changePercent > 0 ? '+' : ''}${wt.changePercent.toFixed(1)}%)`)
      sections.push(`  Trend: ${wt.trend}`)
      if (wt.isImprovement !== undefined) {
        sections.push(`  Assessment: ${wt.isImprovement ? '✓ IMPROVED' : '⚠ CONCERN'}`)
      }
      sections.push('')
    }

    if (clinical.comparison.bmi) {
      const bmi = clinical.comparison.bmi
      sections.push(`BMI: ${bmi.previousValue} → ${bmi.currentValue} kg/m²`)
      sections.push(`  Change: ${bmi.change} kg/m²`)
      sections.push(`  Status: ${bmi.interpretation}`)
      if (bmi.isImprovement !== undefined) {
        sections.push(`  Assessment: ${bmi.isImprovement ? '✓ IMPROVED' : '⚠ CONCERN'}`)
      }
      sections.push('')
    }
  }

  return sections.join('\n')
}

const FOLLOW_UP_SYSTEM_PROMPT = `You are an expert physician generating a comprehensive FOLLOW-UP medical report.

This is a FOLLOW-UP CONSULTATION, which means:
1. The patient has been seen before
2. You must compare current findings with previous consultation
3. Assess clinical progression (improvement, stable, or worsening)
4. Evaluate treatment effectiveness
5. Adjust treatment plan based on patient response

CRITICAL REQUIREMENTS:

1. **Structure your response EXACTLY in this format:**

   [PATIENT_INFO]
   Structured patient demographics and identification
   [/PATIENT_INFO]

   [CHIEF_COMPLAINT]
   Current chief complaint
   [/CHIEF_COMPLAINT]

   [HISTORY_COMPARISON]
   Detailed comparison with previous visit:
   - What has changed since last visit?
   - Which symptoms improved?
   - Which symptoms worsened or persisted?
   - Treatment adherence and effectiveness
   [/HISTORY_COMPARISON]

   [PRESENT_ILLNESS]
   Timeline and progression of current condition
   [/PRESENT_ILLNESS]

   [PHYSICAL_EXAMINATION]
   Current physical examination findings
   [/PHYSICAL_EXAMINATION]

   [VITAL_SIGNS_ANALYSIS]
   Analysis of vital signs changes:
   - Blood pressure evolution
   - Weight changes
   - BMI trends
   - Clinical significance of changes
   [/VITAL_SIGNS_ANALYSIS]

   [CLINICAL_ASSESSMENT]
   Overall clinical assessment comparing current and previous status
   [/CLINICAL_ASSESSMENT]

   [DIAGNOSIS]
   Current diagnosis (updated or confirmed)
   [/DIAGNOSIS]

   [TREATMENT_PLAN]
   Treatment plan adjustments:
   - Continue effective treatments
   - Discontinue or modify ineffective treatments
   - New interventions if needed
   [/TREATMENT_PLAN]

   [RECOMMENDATIONS]
   Clinical recommendations and patient education
   [/RECOMMENDATIONS]

   [FOLLOW_UP_PLAN]
   Follow-up timeline and monitoring plan
   [/FOLLOW_UP_PLAN]

   [SIGNATURE]
   Professional signature block
   [/SIGNATURE]

2. **Follow-Up Focus:**
   - Emphasize changes and evolution
   - Compare with previous findings
   - Assess treatment response
   - Identify new concerns
   - Celebrate improvements

3. **Clinical Depth:**
   - Professional medical terminology
   - Evidence-based reasoning
   - Detailed clinical correlation
   - 1500-2500 words total

4. **Vital Signs Interpretation:**
   - Reference provided comparison data
   - Clinical significance of trends
   - Recommendations based on changes

Generate a thorough, professional follow-up medical report.`

function parseStructuredReport(text: string): any {
  const report: any = {}

  const sections = [
    { key: 'patientInfo', tag: 'PATIENT_INFO' },
    { key: 'chiefComplaint', tag: 'CHIEF_COMPLAINT' },
    { key: 'historyComparison', tag: 'HISTORY_COMPARISON' },
    { key: 'presentIllness', tag: 'PRESENT_ILLNESS' },
    { key: 'physicalExamination', tag: 'PHYSICAL_EXAMINATION' },
    { key: 'vitalSignsAnalysis', tag: 'VITAL_SIGNS_ANALYSIS' },
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
