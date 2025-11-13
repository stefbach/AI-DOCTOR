import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientData, imageData, ocrAnalysisData } = body

    console.log(`🔬 Generating dermatology-specific questions`)
    console.log(`👤 Patient: ${patientData.firstName} ${patientData.lastName}`)

    // Create context from OCR analysis
    const ocrContext = ocrAnalysisData?.analysis?.fullText || 'No image analysis available'
    const observations = ocrAnalysisData?.observations?.join(', ') || 'No specific observations'

    const prompt = `You are an expert dermatologist conducting a detailed consultation.

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age}
- Gender: ${patientData.gender}

IMAGE ANALYSIS RESULTS:
${ocrContext}

KEY OBSERVATIONS:
${observations}

Generate 8-12 targeted dermatology questions to gather essential clinical information for accurate diagnosis. 

QUESTION CATEGORIES TO INCLUDE:
1. ONSET & DURATION:
   - When did the skin condition first appear?
   - How has it evolved over time?
   
2. SYMPTOMS & SENSATIONS:
   - Itching, pain, burning, tingling?
   - Severity and triggers?

3. AGGRAVATING/RELIEVING FACTORS:
   - What makes it worse (sun, heat, stress, certain products)?
   - What provides relief?

4. PREVIOUS TREATMENTS:
   - Any treatments tried (OTC or prescribed)?
   - Results of previous treatments?

5. PERSONAL/FAMILY HISTORY:
   - History of skin conditions (eczema, psoriasis, etc.)?
   - Family history of similar conditions?
   - Known allergies to medications or products?

6. LIFESTYLE & EXPOSURES:
   - Recent changes in products (cosmetics, detergents, medications)?
   - Occupational exposures?
   - Recent travel or environmental changes?

7. SYSTEMIC SYMPTOMS:
   - Any fever, fatigue, joint pain?
   - Any other health concerns?

8. SPECIFIC DERMATOLOGY INQUIRIES:
   - Based on the image analysis, ask targeted questions about specific features observed

FORMAT each question as a JSON object:
{
  "id": "unique_id",
  "category": "category_name",
  "question": "question text",
  "type": "open" | "closed" | "scale" | "multiple_choice",
  "options": ["option1", "option2"] // for multiple choice
}

Return ONLY a valid JSON array of question objects, no additional text.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert dermatologist. Generate targeted clinical questions in valid JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    let questionsText = completion.choices[0].message.content || '[]'
    
    // Clean up the response to ensure valid JSON
    questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Parse questions
    let questions
    try {
      questions = JSON.parse(questionsText)
    } catch (parseError) {
      console.error('Error parsing questions JSON:', parseError)
      // Fallback to default questions if parsing fails
      questions = getDefaultDermatologyQuestions()
    }

    console.log(`✅ Generated ${questions.length} dermatology questions`)

    return NextResponse.json({
      success: true,
      questions,
      patientInfo: {
        firstName: patientData.firstName,
        lastName: patientData.lastName
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error generating dermatology questions:', error)
    
    // Return default questions on error
    return NextResponse.json({
      success: true,
      questions: getDefaultDermatologyQuestions(),
      fallback: true,
      timestamp: new Date().toISOString()
    })
  }
}

// Default fallback questions
function getDefaultDermatologyQuestions() {
  return [
    {
      id: "derm_q1",
      category: "Onset & Duration",
      question: "When did you first notice this skin condition?",
      type: "open"
    },
    {
      id: "derm_q2",
      category: "Onset & Duration",
      question: "Has the condition changed in size, color, or appearance since it first appeared?",
      type: "closed"
    },
    {
      id: "derm_q3",
      category: "Symptoms",
      question: "Are you experiencing any itching, pain, or burning sensation?",
      type: "multiple_choice",
      options: ["No symptoms", "Mild itching", "Moderate itching", "Severe itching", "Pain", "Burning"]
    },
    {
      id: "derm_q4",
      category: "Aggravating Factors",
      question: "What makes the condition worse? (Select all that apply)",
      type: "multiple_choice",
      options: ["Sun exposure", "Heat", "Cold", "Stress", "Certain products", "Physical activity", "Nothing specific"]
    },
    {
      id: "derm_q5",
      category: "Previous Treatments",
      question: "Have you tried any treatments for this condition?",
      type: "open"
    },
    {
      id: "derm_q6",
      category: "Medical History",
      question: "Do you have a history of skin conditions (eczema, psoriasis, acne, etc.)?",
      type: "closed"
    },
    {
      id: "derm_q7",
      category: "Allergies",
      question: "Do you have any known allergies to medications, cosmetics, or other substances?",
      type: "open"
    },
    {
      id: "derm_q8",
      category: "Lifestyle",
      question: "Have you recently changed any personal care products, detergents, or medications?",
      type: "closed"
    },
    {
      id: "derm_q9",
      category: "Systemic Symptoms",
      question: "Are you experiencing any other symptoms like fever, fatigue, or joint pain?",
      type: "closed"
    },
    {
      id: "derm_q10",
      category: "Family History",
      question: "Does anyone in your family have similar skin conditions?",
      type: "closed"
    }
  ]
}
