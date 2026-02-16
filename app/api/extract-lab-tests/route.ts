import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// OpenAI client will be initialized inside the function to avoid build-time errors

// Moved inside function - const openai = new OpenAI({
// Moved inside function -   apiKey: process.env.OPENAI_API_KEY
// Moved inside function - })

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client inside the function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const body = await request.json()
    const { diagnosisText, patientData } = body

    console.log(`🧪 Extracting lab tests from diagnosis for ${patientData.firstName} ${patientData.lastName}`)

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
      model: "gpt-5.2",
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
      max_tokens: 1500,
      reasoning_effort: "none" as any
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
