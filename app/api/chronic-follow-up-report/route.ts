import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: NextRequest) {
  try {
    const { patientDemographics, clinicalData, trendsData, previousConsultation, consultationHistory } = await req.json()

    if (!patientDemographics || !clinicalData || !trendsData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    const patientContext = buildPatientContext(patientDemographics, clinicalData, trendsData, previousConsultation, consultationHistory)

    const result = await generateText({
      model: openai('gpt-4o'),
      messages: [
        { role: 'system', content: CHRONIC_SYSTEM_PROMPT },
        { role: 'user', content: patientContext }
      ],
      maxTokens: 5000,
      temperature: 0.3
    })

    const report = parseStructuredReport(result.text)
    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

function buildPatientContext(demographics: any, clinical: any, trends: any, previous: any, history: any[]): string {
  const sections = []
  sections.push('=== PATIENT INFORMATION ===')
  sections.push(`Name: ${demographics.fullName}`)
  sections.push(`Age: ${demographics.age} • Gender: ${demographics.gender}`)
  if (demographics.chronicConditions) sections.push(`Chronic Conditions: ${demographics.chronicConditions.join(', ')}`)
  sections.push('')

  if (trends) {
    sections.push('=== LONG-TERM TRENDS ANALYSIS ===')
    sections.push(`Monitoring Period: ${trends.consultationCount} consultations`)
    trends.trends?.forEach((trend: any) => {
      sections.push(`\n${trend.metric}:`)
      sections.push(`  Average: ${trend.average} ${trend.unit}`)
      sections.push(`  Range: ${trend.min} - ${trend.max} ${trend.unit}`)
      sections.push(`  Trend: ${trend.trend}`)
      sections.push(`  Data Points: ${trend.data.length}`)
    })
    sections.push('')
  }

  sections.push('=== CURRENT VISIT ===')
  sections.push(`Chief Complaint: ${clinical.chiefComplaint}`)
  if (clinical.chronicConditionStatus) sections.push(`\nCondition Status: ${clinical.chronicConditionStatus}`)
  if (clinical.symptomsChanges) sections.push(`\nSymptoms Changes: ${clinical.symptomsChanges}`)
  sections.push(`\nVitals: BP ${clinical.bloodPressureSystolic}/${clinical.bloodPressureDiastolic} mmHg`)
  if (clinical.weight) sections.push(`Weight: ${clinical.weight} kg`)
  if (clinical.glucose) sections.push(`Glucose: ${clinical.glucose} mmol/L`)
  sections.push('')

  sections.push('=== MEDICATION COMPLIANCE ===')
  sections.push(`Adherent: ${clinical.medicationAdherence ? 'Yes' : 'No'}`)
  if (clinical.missedDoses) sections.push(`Missed Doses: ${clinical.missedDoses}`)
  if (clinical.sideEffects) sections.push(`Side Effects: ${clinical.sideEffects}`)
  sections.push('')

  sections.push('=== LIFESTYLE ===')
  if (clinical.dietAdherence) sections.push(`Diet: ${clinical.dietAdherence}`)
  if (clinical.exerciseRoutine) sections.push(`Exercise: ${clinical.exerciseRoutine}`)
  if (clinical.lifestyleChanges) sections.push(`Changes: ${clinical.lifestyleChanges}`)

  return sections.join('\n')
}

const CHRONIC_SYSTEM_PROMPT = `You are an expert physician generating a CHRONIC DISEASE FOLLOW-UP report.

Focus on:
1. Long-term trend analysis (BP, weight, glucose over multiple visits)
2. Medication compliance assessment
3. Disease progression evaluation
4. Treatment effectiveness
5. Lifestyle modifications impact

Structure:
[PATIENT_INFO]...[/PATIENT_INFO]
[CHIEF_COMPLAINT]...[/CHIEF_COMPLAINT]
[TREND_ANALYSIS]Long-term vital signs trends, progression, patterns[/TREND_ANALYSIS]
[CLINICAL_ASSESSMENT]Current status and comparison[/CLINICAL_ASSESSMENT]
[MEDICATION_COMPLIANCE]Adherence, barriers, side effects[/MEDICATION_COMPLIANCE]
[DIAGNOSIS]...[/DIAGNOSIS]
[TREATMENT_PLAN]...[/TREATMENT_PLAN]
[RECOMMENDATIONS]...[/RECOMMENDATIONS]
[FOLLOW_UP_PLAN]...[/FOLLOW_UP_PLAN]
[SIGNATURE]...[/SIGNATURE]

Generate professional chronic disease management report (1500-2500 words).`

function parseStructuredReport(text: string): any {
  const report: any = {}
  const sections = [
    { key: 'patientInfo', tag: 'PATIENT_INFO' },
    { key: 'chiefComplaint', tag: 'CHIEF_COMPLAINT' },
    { key: 'trendAnalysis', tag: 'TREND_ANALYSIS' },
    { key: 'clinicalAssessment', tag: 'CLINICAL_ASSESSMENT' },
    { key: 'medicationCompliance', tag: 'MEDICATION_COMPLIANCE' },
    { key: 'diagnosis', tag: 'DIAGNOSIS' },
    { key: 'treatmentPlan', tag: 'TREATMENT_PLAN' },
    { key: 'recommendations', tag: 'RECOMMENDATIONS' },
    { key: 'followUpPlan', tag: 'FOLLOW_UP_PLAN' },
    { key: 'signature', tag: 'SIGNATURE' }
  ]

  sections.forEach(({ key, tag }) => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
    const match = text.match(regex)
    if (match && match[1]) report[key] = match[1].trim()
  })

  return report
}
