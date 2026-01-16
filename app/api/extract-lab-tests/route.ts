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

  const anonymousId = `ANON-LAB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId

  console.log('🔒 Patient data anonymized for lab tests extraction')

  return { anonymized, originalIdentity, anonymousId }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client inside the function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const body = await request.json()
    const { diagnosisText, patientData } = body

    // Anonymize patient data before processing
    const { anonymized: anonymizedPatient, originalIdentity, anonymousId } = anonymizePatientData(patientData)

    console.log(`🧪 Extracting lab tests from diagnosis for patient ${anonymousId} (anonymized)`)

    const extractionPrompt = `Extract all laboratory test recommendations from this dermatology diagnosis and convert them into a structured format.

DIAGNOSIS TEXT:
${diagnosisText}

INSTRUCTIONS:
1. Extract ONLY laboratory tests explicitly mentioned in the RECOMMENDED INVESTIGATIONS section
2. For each test, provide:
   - Test name (nom) - e.g., "Complete Blood Count (CBC)", "Liver Function Tests"
   - Category (categorie) - use one of: clinicalChemistry, hematology, immunology, microbiology, other
   - Urgent flag (urgence) - true if marked as urgent/STAT, false otherwise
   - Fasting required (aJeun) - true if fasting mentioned, false otherwise
   - Clinical indication (motifClinique) - brief reason for the test

3. Common dermatology lab tests include:
   - Complete Blood Count (CBC) - hematology
   - Liver Function Tests (LFTs) - clinicalChemistry
   - Kidney Function Tests - clinicalChemistry
   - ESR/CRP (inflammation markers) - hematology
   - Skin culture - microbiology
   - Patch testing - immunology
   - ANA, anti-dsDNA - immunology

IMPORTANT:
- Return ONLY a JSON array of tests
- Do NOT include explanations or additional text
- If no tests are mentioned, return an empty array: []
- Most tests default to urgence: false and aJeun: false
- Set aJeun: true only for tests that explicitly require fasting (glucose, lipid panel)

EXAMPLE OUTPUT FORMAT:
[
  {
    "nom": "Complete Blood Count (CBC)",
    "categorie": "hematology",
    "urgence": false,
    "aJeun": false,
    "motifClinique": "Rule out systemic infection or inflammatory process"
  },
  {
    "nom": "Liver Function Tests (LFTs)",
    "categorie": "clinicalChemistry",
    "urgence": false,
    "aJeun": true,
    "motifClinique": "Baseline before systemic antifungal therapy"
  }
]`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a medical assistant specialized in extracting structured laboratory test data from dermatology diagnoses. Always return valid JSON arrays only."
        },
        {
          role: "user",
          content: extractionPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const responseText = completion.choices[0].message.content || '[]'
    console.log('🤖 AI Response:', responseText)

    // Clean up the response to extract JSON
    let cleanedText = responseText.trim()
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    // Find the JSON array
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.log('⚠️ No JSON array found in response')
      return NextResponse.json({ success: true, tests: [] })
    }

    const tests = JSON.parse(jsonMatch[0])
    
    console.log(`✅ Extracted ${tests.length} lab test(s)`)

    return NextResponse.json({
      success: true,
      tests: tests
    })

  } catch (error: any) {
    console.error('❌ Error extracting lab tests:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to extract lab tests',
      tests: []
    }, { status: 500 })
  }
}
