import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

/**
 * API Route: Follow-Up Documents Generation
 * 
 * Generates follow-up specific documents including:
 * - Prescription renewals/adjustments with status indicators
 * - Follow-up lab tests with comparison context
 * - Follow-up imaging studies
 * 
 * Key differences from initial consultation documents:
 * - Medications include status (continued, modified, new, discontinued)
 * - Lab tests marked as follow-up/control
 * - Context from previous consultation included
 */
export async function POST(req: NextRequest) {
  try {
    const {
      patientDemographics,
      generatedReport,
      previousConsultation,
      consultationHistory,
      consultationType
    } = await req.json()

    // Validate required data
    if (!patientDemographics || !generatedReport) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    // Build context for document generation
    const context = buildDocumentContext(
      patientDemographics,
      generatedReport,
      previousConsultation,
      consultationHistory,
      consultationType
    )

    // Generate documents using GPT-4o
    const result = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: FOLLOW_UP_DOCUMENTS_PROMPT
        },
        {
          role: 'user',
          content: context
        }
      ],
      maxTokens: 3000,
      temperature: 0.3
    })

    // Parse structured response
    const documents = parseDocuments(result.text)

    return NextResponse.json({
      success: true,
      documents
    })
  } catch (error) {
    console.error('Error generating follow-up documents:', error)
    return NextResponse.json(
      { error: 'Failed to generate follow-up documents' },
      { status: 500 }
    )
  }
}

function buildDocumentContext(
  demographics: any,
  report: any,
  previous: any,
  history: any[],
  type: string
): string {
  const sections = []

  sections.push('=== FOLLOW-UP CONSULTATION CONTEXT ===')
  sections.push(`Consultation Type: ${type.toUpperCase()} FOLLOW-UP`)
  sections.push(`Date: ${new Date().toLocaleDateString()}`)
  sections.push('')

  // Patient info
  sections.push('=== PATIENT ===')
  sections.push(`Name: ${demographics.fullName}`)
  sections.push(`Age: ${demographics.age} years`)
  sections.push('')

  // Previous consultation context
  if (previous) {
    sections.push('=== PREVIOUS CONSULTATION ===')
    sections.push(`Date: ${new Date(previous.date).toLocaleDateString()}`)
    sections.push(`Diagnosis: ${previous.diagnosis || 'N/A'}`)

    // Extract previous medications
    if (previous.medications && previous.medications.length > 0) {
      sections.push('\nPREVIOUS MEDICATIONS:')
      previous.medications.forEach((med: any) => {
        const medName = typeof med === 'string' ? med : (med.name || med.nom)
        const medDosage = typeof med === 'string' ? '' : (med.dosage || '')
        sections.push(`  - ${medName} ${medDosage}`)
      })
    }

    // Extract previous lab tests if available
    if (previous.labTests && previous.labTests.length > 0) {
      sections.push('\nPREVIOUS LAB TESTS:')
      previous.labTests.forEach((test: any) => {
        sections.push(`  - ${test}`)
      })
    }
    sections.push('')
  }

  // Current report assessment
  sections.push('=== CURRENT ASSESSMENT ===')
  if (report.diagnosis) {
    sections.push('Current Diagnosis:')
    sections.push(report.diagnosis)
    sections.push('')
  }

  if (report.treatmentPlan) {
    sections.push('Treatment Plan:')
    sections.push(report.treatmentPlan)
    sections.push('')
  }

  if (report.clinicalAssessment) {
    sections.push('Clinical Assessment:')
    sections.push(report.clinicalAssessment)
    sections.push('')
  }

  // Treatment response comparison
  if (report.historyComparison || report.treatmentResponse) {
    sections.push('=== TREATMENT RESPONSE ===')
    sections.push(report.historyComparison || report.treatmentResponse)
    sections.push('')
  }

  return sections.join('\n')
}

const FOLLOW_UP_DOCUMENTS_PROMPT = `You are an expert physician generating FOLLOW-UP MEDICAL DOCUMENTS (prescriptions, lab tests).

CRITICAL: This is a FOLLOW-UP consultation, NOT an initial consultation.

Your task is to analyze the patient's treatment response and generate appropriate follow-up documents.

MEDICATION STATUS CATEGORIES:
1. **CONTINUED**: Same medication, same dosage (working well, no changes needed)
2. **MODIFIED**: Same medication, but dosage/frequency changed (needs adjustment)
3. **NEW**: Brand new medication not prescribed before (additional treatment)
4. **DISCONTINUED**: Previously prescribed but now stopped (side effects, ineffective, or resolved)

LAB TEST REQUIREMENTS:
- Mark tests as "isFollowUp: true" for control/surveillance tests
- Include previous test date if known
- Focus on monitoring treatment effectiveness or disease progression

STRUCTURE YOUR RESPONSE EXACTLY AS:

[MEDICATIONS]
[
  {
    "nom": "Medication trade name",
    "denominationCommune": "Generic name",
    "dosage": "Dose amount",
    "forme": "Form (Comprimé, Gélule, etc.)",
    "posologie": "Frequency",
    "modeAdministration": "Route",
    "dureeTraitement": "Duration",
    "quantite": "Quantity",
    "instructions": "Special instructions",
    "status": "continued|modified|new|discontinued",
    "previousDosage": "Only if status=modified"
  }
]
[/MEDICATIONS]

[LAB_TESTS]
[
  {
    "nom": "Test name",
    "categorie": "Category",
    "urgence": false,
    "aJeun": true/false,
    "motifClinique": "Clinical indication - mention this is follow-up",
    "isFollowUp": true,
    "previousDate": "Date of last test if known"
  }
]
[/LAB_TESTS]

[IMAGING]
[
  {
    "type": "Exam type",
    "region": "Anatomical region",
    "indicationClinique": "Clinical indication - mention follow-up context",
    "urgence": false,
    "isFollowUp": true
  }
]
[/IMAGING]

GUIDELINES:
1. **Analyze treatment response** before deciding medication status
2. **Continue effective medications** (status: continued)
3. **Modify medications** that need dosage adjustment (status: modified)
4. **Add new medications** for new symptoms or conditions (status: new)
5. **Stop medications** that caused side effects or are no longer needed (status: discontinued)
6. **Prioritize monitoring tests** - focus on surveillance and control
7. **Reference previous consultation** in clinical indications
8. **Be conservative** - don't add unnecessary tests or medications

Generate practical, evidence-based follow-up prescriptions.`

function parseDocuments(text: string): any {
  const documents: any = {}

  // Parse medications
  const medicationsMatch = text.match(/\[MEDICATIONS\]([\s\S]*?)\[\/MEDICATIONS\]/i)
  if (medicationsMatch && medicationsMatch[1]) {
    try {
      documents.medications = JSON.parse(medicationsMatch[1].trim())
    } catch (error) {
      console.error('Error parsing medications:', error)
      documents.medications = []
    }
  }

  // Parse lab tests
  const labTestsMatch = text.match(/\[LAB_TESTS\]([\s\S]*?)\[\/LAB_TESTS\]/i)
  if (labTestsMatch && labTestsMatch[1]) {
    try {
      documents.labTests = JSON.parse(labTestsMatch[1].trim())
    } catch (error) {
      console.error('Error parsing lab tests:', error)
      documents.labTests = []
    }
  }

  // Parse imaging
  const imagingMatch = text.match(/\[IMAGING\]([\s\S]*?)\[\/IMAGING\]/i)
  if (imagingMatch && imagingMatch[1]) {
    try {
      documents.imaging = JSON.parse(imagingMatch[1].trim())
    } catch (error) {
      console.error('Error parsing imaging:', error)
      documents.imaging = []
    }
  }

  return documents
}
