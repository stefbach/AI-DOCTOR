// app/api/dermatology-questions/route.ts - VERSION 2.0: Professional-grade quality
// - 4 retry attempts with progressive enhancement
// - Auto-correction on final attempt  
// - 8000 max tokens for comprehensive questions
// - Advanced OpenAI parameters
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// ==================== RETRY MECHANISM ====================
async function callOpenAIWithRetry(
  openai: OpenAI,
  prompt: string,
  systemMessage: string,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 OpenAI call attempt ${attempt + 1}/${maxRetries + 1}`)
      
      let enhancedSystemMessage = systemMessage
      
      if (attempt === 1) {
        enhancedSystemMessage = `🚨 ATTEMPT 2/4 - ENHANCED QUALITY:

${systemMessage}

⚠️ Each question must be:
- Specific to dermatology assessment
- Clinically relevant based on image analysis
- Include proper options for multiple choice questions`
      } else if (attempt === 2) {
        enhancedSystemMessage = `🚨🚨 ATTEMPT 3/4 - STRICT STANDARDS:

${systemMessage}

⚠️ MANDATORY:
- Questions must be targeted to visible skin condition
- Multiple choice questions must have 4-6 specific options
- All questions must have proper ID, category, type`
      } else if (attempt >= 3) {
        enhancedSystemMessage = `🆘 ATTEMPT 4/4 - MAXIMUM QUALITY:

${systemMessage}

🎯 FINAL ATTEMPT - response must be PERFECT:
- All questions specific and clinically actionable
- All IDs unique and properly formatted
- All categories properly assigned
- All multiple choice options comprehensive`
      }
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: enhancedSystemMessage },
          { role: "user", content: prompt }
        ],
        temperature: attempt === 0 ? 0.4 : attempt === 1 ? 0.2 : 0.1,
        max_tokens: 8000,
        response_format: { type: "json_object" },
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.2
      })
      
      let questionsText = completion.choices[0].message.content || '[]'
      questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      
      let parsed
      try {
        parsed = JSON.parse(questionsText)
      } catch (parseError) {
        throw new Error('Invalid JSON response')
      }
      
      const questions = Array.isArray(parsed) ? parsed : (parsed.questions || [])
      
      // Quality validation
      const hasMinimumQuestions = questions.length >= 8
      const allHaveIds = questions.every((q: any) => q.id)
      const allHaveCategories = questions.every((q: any) => q.category)
      
      if ((!hasMinimumQuestions || !allHaveIds || !allHaveCategories) && attempt < maxRetries) {
        console.log(`⚠️ Quality issues: ${questions.length} questions, ids ok: ${allHaveIds}, categories ok: ${allHaveCategories}`)
        throw new Error('Quality validation failed')
      }
      
      // Auto-correction on final attempt
      if ((!hasMinimumQuestions || !allHaveIds || !allHaveCategories) && attempt === maxRetries) {
        console.log('🔧 AUTO-CORRECTION MODE')
        questions.forEach((q: any, idx: number) => {
          if (!q.id) q.id = `derm_q${idx + 1}`
          if (!q.category) q.category = 'General'
          if (!q.type) q.type = 'multiple_choice'
          // Force all questions to be multiple choice
          if (q.type !== 'multiple_choice') {
            q.type = 'multiple_choice'
            if (!q.options || q.options.length < 4) {
              q.options = ['Option 1', 'Option 2', 'Option 3', 'Option 4']
            }
          }
        })
        console.log('✅ Auto-correction applied')
      }
      
      console.log(`✅ Generated ${questions.length} questions (attempt ${attempt + 1})`)
      
      return {
        questions,
        qualityMetrics: {
          attempt: attempt + 1,
          questionsCount: questions.length,
          allHaveIds,
          allHaveCategories
        }
      }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`⏳ Retrying in ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
}

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client inside the function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

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

🚨 CRITICAL FORMAT REQUIREMENTS:
- ALL questions MUST be multiple choice format ONLY
- NO open-ended questions allowed
- NO yes/no questions without options
- EVERY question MUST have 4-6 specific answer options

FORMAT each question as a JSON object:
{
  "id": "unique_id",
  "category": "category_name",
  "question": "question text",
  "type": "multiple_choice",
  "options": ["Specific option 1", "Specific option 2", "Specific option 3", "Specific option 4"]
}

EXAMPLE:
{
  "id": "derm_q1",
  "category": "Onset & Duration",
  "question": "How long have you noticed this skin condition?",
  "type": "multiple_choice",
  "options": ["Less than 1 week", "1-4 weeks", "1-3 months", "More than 3 months"]
}

⚠️ Remember: ALL questions must have type: "multiple_choice" with 4-6 options!

Return ONLY a valid JSON array of question objects, no additional text.`

    const systemMessage = "You are an expert dermatologist. Generate targeted clinical questions in valid JSON format only. CRITICAL: ALL questions MUST be multiple choice format with 4-6 specific answer options. NO open-ended questions allowed."
    
    const result = await callOpenAIWithRetry(openai, prompt, systemMessage, 3)
    const questions = result.questions

    console.log(`✅ Generated ${questions.length} dermatology questions with retry mechanism`)

    return NextResponse.json({
      success: true,
      questions,
      patientInfo: {
        firstName: patientData.firstName,
        lastName: patientData.lastName
      },
      metadata: {
        model: 'gpt-4o',
        version: '2.0-Professional-Grade-4Retry',
        qualityMetrics: result.qualityMetrics
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
      type: "multiple_choice",
      options: ["Less than 1 week ago", "1-4 weeks ago", "1-3 months ago", "More than 3 months ago"]
    },
    {
      id: "derm_q2",
      category: "Onset & Duration",
      question: "Has the condition changed in size, color, or appearance since it first appeared?",
      type: "multiple_choice",
      options: ["No change", "Slowly getting worse", "Rapidly getting worse", "Getting better", "Fluctuating (better and worse)"]
    },
    {
      id: "derm_q3",
      category: "Symptoms",
      question: "Are you experiencing any itching, pain, or burning sensation?",
      type: "multiple_choice",
      options: ["No symptoms", "Mild itching", "Moderate itching", "Severe itching", "Pain", "Burning sensation"]
    },
    {
      id: "derm_q4",
      category: "Aggravating Factors",
      question: "What makes the condition worse?",
      type: "multiple_choice",
      options: ["Sun exposure", "Heat or sweating", "Cold weather", "Stress", "Certain products or chemicals", "Physical activity", "Nothing specific"]
    },
    {
      id: "derm_q5",
      category: "Previous Treatments",
      question: "Have you tried any treatments for this condition?",
      type: "multiple_choice",
      options: ["No treatment yet", "Over-the-counter creams/ointments", "Prescription medications", "Home remedies", "Multiple treatments with no improvement"]
    },
    {
      id: "derm_q6",
      category: "Medical History",
      question: "Do you have a history of skin conditions?",
      type: "multiple_choice",
      options: ["No history", "Eczema", "Psoriasis", "Acne", "Other skin conditions", "Multiple skin conditions"]
    },
    {
      id: "derm_q7",
      category: "Allergies",
      question: "Do you have any known allergies to medications, cosmetics, or other substances?",
      type: "multiple_choice",
      options: ["No known allergies", "Medication allergies", "Cosmetic/skincare allergies", "Contact allergies (metals, latex, etc.)", "Multiple allergies"]
    },
    {
      id: "derm_q8",
      category: "Lifestyle",
      question: "Have you recently changed any personal care products, detergents, or medications?",
      type: "multiple_choice",
      options: ["No recent changes", "Changed skincare products", "Changed laundry detergent", "Started new medications", "Multiple changes recently"]
    },
    {
      id: "derm_q9",
      category: "Systemic Symptoms",
      question: "Are you experiencing any other symptoms?",
      type: "multiple_choice",
      options: ["No other symptoms", "Fever", "Fatigue", "Joint pain", "Multiple symptoms"]
    },
    {
      id: "derm_q10",
      category: "Family History",
      question: "Does anyone in your family have similar skin conditions?",
      type: "multiple_choice",
      options: ["No family history", "Yes, immediate family", "Yes, extended family", "Unsure", "Multiple family members affected"]
    }
  ]
}
