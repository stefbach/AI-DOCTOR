import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientData, imageData, ocrAnalysisData, questionsData } = body

    console.log(`🔬 Starting specialized dermatology diagnosis`)
    console.log(`👤 Patient: ${patientData.firstName} ${patientData.lastName}`)

    // Prepare comprehensive context
    const ocrAnalysis = ocrAnalysisData?.analysis?.fullText || 'No image analysis available'
    const questionsAnswers = formatQuestionsAnswers(questionsData?.answers || {}, questionsData?.questions || [])

    const diagnosticPrompt = `You are a board-certified dermatologist with over 20 years of experience in diagnosing and treating skin conditions.

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Medical History: ${patientData.medicalHistory?.join(', ') || 'None reported'}
- Known Allergies: ${patientData.allergies?.join(', ') || 'None reported'}

IMAGE ANALYSIS (OCR/AI):
${ocrAnalysis}

CLINICAL HISTORY (from questions):
${questionsAnswers}

TASK: Provide a comprehensive dermatological assessment and diagnosis.

FORMAT YOUR RESPONSE IN THE FOLLOWING STRUCTURE:

1. CLINICAL SUMMARY
Brief summary of the case presentation

2. PRIMARY DIAGNOSIS
- Diagnosis name (with ICD-10 code if applicable)
- Confidence level (High/Moderate/Low)
- Key diagnostic criteria met
- Typical vs atypical presentation notes

3. DIFFERENTIAL DIAGNOSES (at least 3-5 alternatives)
For each:
- Condition name
- Likelihood (%)
- Supporting features
- Distinguishing features from primary diagnosis

4. PATHOPHYSIOLOGY
Brief explanation of the underlying disease process

5. RECOMMENDED INVESTIGATIONS
- Laboratory tests (if needed)
- Biopsy considerations
- Imaging (if indicated)
- Patch testing or other specialized tests

6. TREATMENT PLAN
A. Immediate/Acute Management:
   - First-line treatments
   - Symptomatic relief measures
   
B. Long-term Management:
   - Maintenance therapy
   - Preventive measures
   - Lifestyle modifications

C. Pharmacological:
   - Topical medications (with specific products, concentrations, and application instructions)
   - Oral medications (if needed)
   - Duration of treatment

D. Non-pharmacological:
   - Skincare routine recommendations
   - Environmental modifications
   - Trigger avoidance

7. PATIENT EDUCATION
- Explanation of condition in simple terms
- What to expect during treatment
- Warning signs requiring urgent attention
- Prognosis and expected outcomes

8. FOLLOW-UP PLAN
- Recommended follow-up timeline
- Parameters to monitor
- When to return sooner

9. RED FLAGS
List any concerning features that require immediate attention or specialist referral

10. ADDITIONAL RECOMMENDATIONS
- Referrals to other specialists (if needed)
- Support resources
- Any other relevant advice

Provide a thorough, professional dermatological assessment suitable for clinical documentation and patient care.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert board-certified dermatologist. Provide comprehensive, evidence-based diagnostic assessments."
        },
        {
          role: "user",
          content: diagnosticPrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 4000
    })

    const diagnosis = completion.choices[0].message.content || ''

    // Parse and structure the diagnosis
    const structuredDiagnosis = parseDiagnosisResponse(diagnosis)

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      diagnosisId: `DERM-DX-${Date.now()}`,
      patientInfo: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: patientData.age
      },
      diagnosis: {
        fullText: diagnosis,
        structured: structuredDiagnosis
      },
      metadata: {
        imagesAnalyzed: imageData?.length || 0,
        questionsAnswered: Object.keys(questionsData?.answers || {}).length,
        generatedAt: new Date().toISOString()
      }
    }

    console.log('✅ Dermatology diagnosis completed successfully')

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ Error in dermatology diagnosis:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to generate diagnosis',
        message: error.message,
        details: error.toString()
      },
      { status: 500 }
    )
  }
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

// Helper function to parse diagnosis response into structured format
function parseDiagnosisResponse(diagnosis: string) {
  const sections: any = {
    clinicalSummary: '',
    primaryDiagnosis: {},
    differentialDiagnoses: [],
    treatmentPlan: {},
    investigations: [],
    followUp: {},
    redFlags: [],
    patientEducation: ''
  }

  // Simple section extraction (can be enhanced with more sophisticated parsing)
  const lines = diagnosis.split('\n')
  let currentSection = ''
  let currentContent: string[] = []

  lines.forEach(line => {
    const trimmedLine = line.trim()
    
    if (trimmedLine.match(/^\d+\.\s+[A-Z]/)) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        const content = currentContent.join('\n').trim()
        if (currentSection.includes('SUMMARY')) sections.clinicalSummary = content
        else if (currentSection.includes('PRIMARY DIAGNOSIS')) sections.primaryDiagnosis = { text: content }
        else if (currentSection.includes('TREATMENT')) sections.treatmentPlan = { text: content }
        else if (currentSection.includes('EDUCATION')) sections.patientEducation = content
      }
      
      // Start new section
      currentSection = trimmedLine
      currentContent = []
    } else if (trimmedLine) {
      currentContent.push(trimmedLine)
    }
  })

  // Save last section
  if (currentSection && currentContent.length > 0) {
    const content = currentContent.join('\n').trim()
    if (currentSection.includes('FOLLOW')) sections.followUp = { text: content }
  }

  return sections
}
