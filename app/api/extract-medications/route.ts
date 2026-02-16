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

    console.log(`💊 Extracting medications from diagnosis for ${patientData.firstName} ${patientData.lastName}`)

    const extractionPrompt = `Extract all medication recommendations from this dermatology diagnosis and convert them into a structured format suitable for a prescription.

DIAGNOSIS TEXT:
${diagnosisText}

INSTRUCTIONS:
1. Extract ONLY medications explicitly mentioned in the TREATMENT PLAN or PHARMACOLOGICAL sections
2. Include both topical and oral medications
3. For each medication, provide:
   - Commercial name (nom)
   - Generic/INN name (denominationCommune)
   - Dosage (e.g., "1%", "500mg")
   - Form (cream, ointment, lotion, gel, tablet, capsule)
   - Posology/frequency (e.g., "Apply twice daily", "1 tablet 3 times daily")
   - Route of administration (Topical route, Oral route, Parenteral route)
   - Treatment duration (e.g., "14 days", "4 weeks")
   - Quantity needed (e.g., "1 tube", "1 box")
   - Special instructions (e.g., "Apply to affected areas only", "Take with food")

4. For dermatology medications:
   - Default to "Topical route" for creams/ointments/lotions/gels
   - Default to "Oral route" for tablets/capsules
   - Typical duration is 2-4 weeks for topical treatments
   - Typical duration is 7-14 days for oral antibiotics

IMPORTANT:
- Return ONLY a JSON array of medications
- Do NOT include explanations or additional text
- If no medications are mentioned, return an empty array: []
- Ensure all field names match exactly: nom, denominationCommune, dosage, forme, posologie, modeAdministration, dureeTraitement, quantite, instructions

EXAMPLE OUTPUT FORMAT:
[
  {
    "nom": "Hydrocortisone Cream",
    "denominationCommune": "Hydrocortisone",
    "dosage": "1%",
    "forme": "cream",
    "posologie": "Apply twice daily",
    "modeAdministration": "Topical route",
    "dureeTraitement": "14 days",
    "quantite": "1 tube (30g)",
    "instructions": "Apply thin layer to affected areas only. Avoid face and groin unless directed."
  }
]`

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are a medical assistant specialized in extracting structured medication data from dermatology diagnoses. Always return valid JSON arrays only."
        },
        {
          role: "user",
          content: extractionPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
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
      return NextResponse.json({ success: true, medications: [] })
    }

    const medications = JSON.parse(jsonMatch[0])
    
    console.log(`✅ Extracted ${medications.length} medication(s)`)

    return NextResponse.json({
      success: true,
      medications: medications
    })

  } catch (error: any) {
    console.error('❌ Error extracting medications:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to extract medications',
      medications: []
    }, { status: 500 })
  }
}
