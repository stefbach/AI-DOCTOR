// app/api/openai-questions/route.ts - VERSION SANS OPENAI
import { NextRequest, NextResponse } from "next/server"

// Questions prédéfinies par type de symptômes
const PREDEFINED_QUESTIONS = {
  headache: [
    {
      id: 1,
      question: "Where exactly is your headache located?",
      options: ["Forehead", "Temples", "Back of head", "All over"],
      priority: "high"
    },
    {
      id: 2,
      question: "How would you describe the pain?",
      options: ["Throbbing", "Constant pressure", "Sharp stabbing", "Dull ache"],
      priority: "high"
    },
    {
      id: 3,
      question: "When did the headache start?",
      options: ["Today", "Yesterday", "Few days ago", "More than a week"],
      priority: "high"
    },
    {
      id: 4,
      question: "What makes it worse?",
      options: ["Light", "Noise", "Movement", "Nothing specific"],
      priority: "medium"
    },
    {
      id: 5,
      question: "Have you taken any medication?",
      options: ["Yes, it helped", "Yes, no effect", "No", "Planning to"],
      priority: "medium"
    }
  ],
  fever: [
    {
      id: 1,
      question: "How high is your temperature?",
      options: ["37-38°C", "38-39°C", "Above 39°C", "Not measured"],
      priority: "high"
    },
    {
      id: 2,
      question: "When did the fever start?",
      options: ["Today", "Yesterday", "2-3 days ago", "More than 3 days"],
      priority: "high"
    },
    {
      id: 3,
      question: "Do you have chills or sweating?",
      options: ["Chills only", "Sweating only", "Both", "Neither"],
      priority: "high"
    },
    {
      id: 4,
      question: "Any other symptoms with the fever?",
      options: ["Body aches", "Headache", "Cough", "None"],
      priority: "medium"
    },
    {
      id: 5,
      question: "Have you been exposed to anyone sick?",
      options: ["Yes, confirmed", "Possibly", "No", "Not sure"],
      priority: "medium"
    }
  ],
  default: [
    {
      id: 1,
      question: "How long have you had these symptoms?",
      options: ["Less than 24h", "2-7 days", "1-4 weeks", "More than a month"],
      priority: "high"
    },
    {
      id: 2,
      question: "Are your symptoms getting worse?",
      options: ["Yes, rapidly", "Yes, slowly", "Stable", "Improving"],
      priority: "high"
    },
    {
      id: 3,
      question: "Do you have any pain?",
      options: ["Severe pain", "Moderate pain", "Mild pain", "No pain"],
      priority: "high"
    },
    {
      id: 4,
      question: "Have you had similar symptoms before?",
      options: ["Yes, recently", "Yes, long ago", "Never", "Not sure"],
      priority: "medium"
    },
    {
      id: 5,
      question: "Are you currently taking any medications?",
      options: ["Yes, prescription", "Yes, over-the-counter", "No", "Supplements only"],
      priority: "medium"
    }
  ]
}

// Function to detect symptom type
function detectSymptomType(clinicalData: any): string {
  const symptoms = (clinicalData?.symptoms || clinicalData?.chiefComplaint || "").toLowerCase()
  
  if (symptoms.includes("headache") || symptoms.includes("head")) {
    return "headache"
  }
  if (symptoms.includes("fever") || symptoms.includes("temperature")) {
    return "fever"
  }
  
  return "default"
}

// POST handler
export async function POST(request: NextRequest) {
  console.log("🚀 POST /api/openai-questions - PREDEFINED VERSION")
  
  try {
    // Parse request
    const body = await request.json()
    const { patientData, clinicalData, mode = 'balanced' } = body
    
    console.log("📝 Request received:", {
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      mode,
      symptoms: clinicalData?.symptoms || clinicalData?.chiefComplaint
    })
    
    // Detect symptom type
    const symptomType = detectSymptomType(clinicalData)
    console.log(`🔍 Detected symptom type: ${symptomType}`)
    
    // Get appropriate questions
    const questions = PREDEFINED_QUESTIONS[symptomType as keyof typeof PREDEFINED_QUESTIONS] || PREDEFINED_QUESTIONS.default
    
    // Return response
    const response = {
      success: true,
      questions: questions,
      metadata: {
        mode,
        symptomType,
        source: "predefined",
        message: "Questions generated from predefined templates",
        patientAge: patientData?.age || "Unknown",
        totalQuestions: questions.length
      }
    }
    
    console.log("✅ Returning predefined questions")
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error("❌ Error:", error)
    
    // Even on error, return default questions
    return NextResponse.json({
      success: true,
      questions: PREDEFINED_QUESTIONS.default,
      metadata: {
        mode: "fallback",
        source: "error-fallback",
        error: error.message
      }
    })
  }
}

// GET handler for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "✅ API Working",
    version: "Predefined Questions (No OpenAI)",
    message: "This version does not require OpenAI API key",
    availableTypes: Object.keys(PREDEFINED_QUESTIONS),
    test: {
      url: "/api/openai-questions",
      method: "POST",
      body: {
        patientData: { age: 30, gender: "Male" },
        clinicalData: { symptoms: "headache" }
      }
    },
    timestamp: new Date().toISOString()
  })
}
