// app/api/chronic-diagnosis/route.ts - Specialist-Level Chronic Disease Diagnosis API
// Behaves as TRUE Endocrinologist/Dietitian with DETAILED meal plans and therapeutic objectives
// VERSION 3.1: Streaming SSE to avoid Vercel Hobby 10s timeout
// - Uses OpenAI streaming API with Server-Sent Events
// - Progressive response delivery
// - Works within Vercel Hobby timeout limits
// - Consultation type detection (new vs renewal/follow-up)
// - Enhanced context awareness
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'
export const maxDuration = 60 // Extended timeout for Pro plans (Hobby uses streaming to avoid 10s limit)

// ==================== HELPER FUNCTIONS ====================

/**
 * Validates medication objects for DCI compliance
 */
function validateMedicationDCI(medications: any[]): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!medications || medications.length === 0) {
    return { isValid: true, issues: [] }
  }
  
  medications.forEach((med, index) => {
    // Check for generic names
    if (!med.medication || med.medication.toLowerCase().includes('medication') || 
        med.medication.toLowerCase().includes('drug')) {
      issues.push(`Medication ${index + 1}: Generic name "${med.medication}" - needs specific DCI name`)
    }
    
    // Check for missing dosage details (e.g., "10mg", "500mg", "5mg/kg")
    if (!med.dosage || med.dosage.length < 3) {
      issues.push(`Medication ${index + 1}: Missing or incomplete dosage information`)
    }
    
    // Check for missing frequency
    if (!med.frequency || med.frequency.length < 2) {
      issues.push(`Medication ${index + 1}: Missing or incomplete frequency (should use OD/BD/TDS/QDS)`)  
    }
    
    // Check for vague indications
    if (med.indication && med.indication.length < 20) {
      issues.push(`Medication ${index + 1}: Indication too vague (should be detailed)`)  
    }
  })
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Validates meal plan completeness
 */
function validateMealPlan(mealPlan: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!mealPlan) {
    issues.push('Missing meal plan object')
    return { isValid: false, issues }
  }
  
  // Check breakfast
  if (!mealPlan.breakfast || !mealPlan.breakfast.examples || mealPlan.breakfast.examples.length < 2) {
    issues.push('Breakfast: Missing or insufficient meal examples (need at least 2)')
  }
  
  // Check lunch
  if (!mealPlan.lunch || !mealPlan.lunch.examples || mealPlan.lunch.examples.length < 2) {
    issues.push('Lunch: Missing or insufficient meal examples (need at least 2)')
  }
  
  // Check dinner
  if (!mealPlan.dinner || !mealPlan.dinner.examples || mealPlan.dinner.examples.length < 2) {
    issues.push('Dinner: Missing or insufficient meal examples (need at least 2)')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Calls OpenAI with streaming to avoid Vercel Hobby 10s timeout
 * Returns a ReadableStream that can be used for SSE
 */
async function callOpenAIStreaming(
  apiKey: string,
  systemPrompt: string,
  patientContext: string
): Promise<{ stream: ReadableStream, reader: ReadableStreamDefaultReader<Uint8Array> }> {
  console.log(`📡 OpenAI streaming call initiated`)

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: patientContext }
      ],
      temperature: 0.3,
      max_tokens: 8000, // Increased for comprehensive chronic disease assessment
      response_format: { type: "json_object" },
      stream: true  // Enable streaming
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`)
  }

  if (!response.body) {
    throw new Error('No response body from OpenAI')
  }

  return {
    stream: response.body,
    reader: response.body.getReader()
  }
}

/**
 * Process streamed response and extract complete JSON
 */
async function processStreamedResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onProgress: (progress: string) => void
): Promise<string> {
  const decoder = new TextDecoder()
  let fullContent = ''
  let chunkCount = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            fullContent += content
            chunkCount++

            // Send progress update every 10 chunks
            if (chunkCount % 10 === 0) {
              onProgress(`Generating assessment... ${Math.min(95, Math.floor(chunkCount / 2))}%`)
            }
          }
        } catch {
          // Skip invalid JSON chunks
        }
      }
    }
  }

  return fullContent
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    )
  }

  try {
    const { patientData, clinicalData, questionsData } = await req.json()

    // Detect chronic diseases from patient data
    const chronicDiseases = patientData.medicalHistory || []
    const hasDiabetes = chronicDiseases.some((d: string) => d.toLowerCase().includes('diabetes') || d.toLowerCase().includes('diabète'))
    const hasHypertension = chronicDiseases.some((d: string) => d.toLowerCase().includes('hypertension') || d.toLowerCase().includes('hta'))
    const hasObesity = chronicDiseases.some((d: string) => d.toLowerCase().includes('obesity') || d.toLowerCase().includes('obésité'))

    // Calculate BMI for obesity assessment
    const weight = parseFloat(patientData.weight)
    const heightInMeters = parseFloat(patientData.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    // Detect consultation type (like openai-diagnosis and dermatology-diagnosis)
    const hasCurrentMedications = patientData.currentMedications && patientData.currentMedications.length > 0
    const chiefComplaint = clinicalData?.chiefComplaint || ''
    const isLikelyRenewal = hasCurrentMedications && (
      chiefComplaint.toLowerCase().includes('renewal') ||
      chiefComplaint.toLowerCase().includes('refill') ||
      chiefComplaint.toLowerCase().includes('continue') ||
      chiefComplaint.toLowerCase().includes('renouvellement') ||
      chiefComplaint.toLowerCase().includes('suivi') ||
      chiefComplaint.toLowerCase().includes('follow-up')
    )
    const consultationType = isLikelyRenewal ? 'renewal' : 'new_problem'
    
    console.log(`📋 Consultation type detected: ${consultationType}`)
    if (hasCurrentMedications) {
      console.log(`💊 Patient has current medications: ${patientData.currentMedications}`)
    }

    const systemPrompt = `You are a SENIOR ENDOCRINOLOGIST and CLINICAL DIETITIAN specialist with 20+ years of experience in chronic disease management.

CONSULTATION TYPE DETECTED: ${consultationType.toUpperCase()}

${consultationType === 'renewal' ? `
🔄 TREATMENT RENEWAL/FOLLOW-UP CONSULTATION STRATEGY:

This appears to be a FOLLOW-UP consultation for chronic disease management. Your approach MUST prioritize:

1. VALIDATE CURRENT TREATMENT EFFICACY:
   - Review current medications for continued appropriateness
   - Assess disease control based on recent clinical data
   - Check for adverse effects or tolerability issues
   - Evaluate if medication adjustments needed

2. TREATMENT CONTINUATION DECISION:
   - If current treatment is EFFECTIVE: Continue with same regimen
   - If PARTIALLY EFFECTIVE: Consider dose adjustment or adding complementary therapy
   - If INEFFECTIVE: Consider switching medications or intensifying treatment

3. MINIMAL CHANGES PRINCIPLE:
   - DO NOT change working medications unnecessarily
   - Adjust only if clinical targets not met
   - Explain medical justification for any changes

4. FOCUS ON OPTIMIZATION:
   - Fine-tune meal plans based on progress
   - Adjust therapeutic objectives based on current status
   - Intensify or relax treatment based on control
` : `
🆕 NEW CHRONIC DISEASE MANAGEMENT CONSULTATION STRATEGY:

This appears to be a NEW or COMPREHENSIVE assessment. Your approach:

1. COMPREHENSIVE DISEASE ASSESSMENT:
   - Evaluate all chronic conditions present
   - Establish baseline control status
   - Identify complications and risk factors

2. COMPLETE TREATMENT PLAN:
   - Design comprehensive medication regimen if indicated
   - Provide detailed meal plans for all meals
   - Set measurable therapeutic objectives

3. EXISTING MEDICATIONS REVIEW (if any):
   - Check for interactions with new chronic disease medications
   - Validate current medications for continued use
   - Consider medication reconciliation
`}

🎯 MAURITIUS MEDICAL STANDARDS + DCI COMPLIANCE:
You MUST use PRECISE pharmaceutical nomenclature with DCI (Dénomination Commune Internationale):
- Metformine (NOT Metformin generic)
- Périndopril (NOT Perindopril generic)
- Amlodipine (with DCI precision)
- Atorvastatine (with DCI precision)
- Use UK dosing format: OD (once daily), BD (twice daily), TDS (three times daily), QDS (four times daily)

Your role is to provide PROFESSIONAL-LEVEL assessment and recommendations that match REAL clinical practice standards.

You MUST generate a COMPREHENSIVE evaluation including:

1. DISEASE-SPECIFIC ASSESSMENT (for each chronic condition present)
   - Current control status (Excellent/Good/Fair/Poor)
   - Current values vs. target values
   - Complications identified or suspected
   - Risk factors to address

2. DETAILED MEAL PLANS (THIS IS CRITICAL - NOT GENERIC ADVICE)
   You MUST provide STRUCTURED meal plans with:
   
   BREAKFAST (Timing: 7:00-8:00):
   - Nutritional composition: [e.g., "Complex carbs + lean protein + fiber"]
   - Specific portions: [e.g., "1 slice whole grain bread (30g), 1 boiled egg, 150g steamed vegetables"]
   - Concrete examples: [e.g., "Option 1: Oatmeal with berries and almonds", "Option 2: Scrambled eggs with spinach"]
   - Glycemic considerations: [e.g., "Low GI foods to prevent glucose spikes"]
   
   LUNCH (Timing: 12:30-13:30):
   - Nutritional composition
   - Specific portions
   - Concrete examples (at least 2 options)
   - Macronutrient balance
   
   DINNER (Timing: 19:00-20:00):
   - Nutritional composition
   - Specific portions
   - Concrete examples (at least 2 options)
   - Evening recommendations
   
   SNACKS (Mid-morning 10:00 and Afternoon 16:00):
   - Healthy options with portions
   - Examples for each snack time
   - Portion control guidance

3. STRUCTURED DIETARY HABITS (NOT QUESTIONS - ACTUAL PRESCRIPTIONS)
   - Meal timing schedule: [specific times for each meal]
   - Hydration target: [e.g., "2 liters of water daily, distributed as: 250ml upon waking, 500ml mid-morning, 500ml afternoon, 750ml evening"]
   - Supplements if needed: [e.g., "Vitamin D3 1000 IU daily", "Omega-3 1g daily"]
   - Foods to FAVOR: [specific list with reasoning]
   - Foods to AVOID: [specific list with reasoning]
   - Cooking methods: [preferred techniques]
   - Portion control strategies: [practical tips]

4. PRECISE THERAPEUTIC OBJECTIVES (MEASURABLE TARGETS)
   Short-term (1-3 months):
   - [e.g., "Reduce HbA1c from current 8.2% to < 7.5%"]
   - [e.g., "Weight loss of 3-5kg"]
   - [e.g., "Blood pressure consistently < 135/85 mmHg"]
   
   Medium-term (3-6 months):
   - [e.g., "Achieve HbA1c < 7.0%"]
   - [e.g., "Weight loss of 8-10kg total"]
   - [e.g., "Blood pressure < 130/80 mmHg"]
   - [e.g., "LDL cholesterol < 1.0 g/L"]
   
   Long-term (6-12 months):
   - [e.g., "Maintain HbA1c < 7.0% consistently"]
   - [e.g., "Achieve BMI < 30"]
   - [e.g., "Eliminate or reduce antihypertensive medications"]
   - [e.g., "Prevent diabetic complications"]

5. COMPLETE FOLLOW-UP PLAN (DIABETOLOGY/ENDOCRINOLOGY STANDARD)
   Specialist Consultations:
   - [e.g., "Endocrinologue: tous les 3 mois pendant 6 mois, puis tous les 6 mois"]
   - [e.g., "Diététicien: tous les 2 mois pendant 6 mois"]
   - [e.g., "Ophtalmologue: fond d'œil annuel (dépistage rétinopathie diabétique)"]
   - [e.g., "Cardiologue: si PA non contrôlée ou complications cardiovasculaires"]
   - [e.g., "Podologue: examen des pieds tous les 6 mois"]
   
   Laboratory Tests Schedule:
   - [e.g., "HbA1c: tous les 3 mois jusqu'à stabilisation, puis tous les 6 mois"]
   - [e.g., "Bilan lipidique complet: tous les 6 mois"]
   - [e.g., "Créatinine + DFG: tous les 6 mois (surveillance fonction rénale)"]
   - [e.g., "Microalbuminurie: annuelle (dépistage néphropathie)"]
   - [e.g., "TSH: annuelle (si diabète type 1 ou symptômes)"]
   - [e.g., "Bilan hépatique: annuel"]
   
   Self-Monitoring Instructions:
   - [e.g., "Glycémie capillaire: 2 fois par jour (à jeun + 2h post-prandial) - objectif: 0.80-1.20 g/L à jeun"]
   - [e.g., "Pression artérielle: 2 fois par semaine le matin - objectif: < 130/80 mmHg"]
   - [e.g., "Poids: 1 fois par semaine le matin à jeun - objectif: perte progressive"]
   - [e.g., "Journal alimentaire: quotidien pendant 1 mois, puis hebdomadaire"]
   - [e.g., "Examen des pieds: quotidien (recherche blessures, mycoses)"]

6. MEDICATION MANAGEMENT (if applicable based on clinical data)
   ⚠️ CRITICAL DCI REQUIREMENTS:
   - EVERY medication must have SPECIFIC name with DCI (e.g., "Metformine 500mg" NOT "Medication")
   - EVERY medication must have PRECISE UK dosing (OD/BD/TDS/QDS)
   - EVERY medication must have DETAILED indication (minimum 25 characters with medical reasoning)
   
   Current medications to CONTINUE:
   - medication: "SPECIFIC NAME with DCI", dosage: "EXACT DOSE", frequency: "UK FORMAT", rationale: "DETAILED REASON"
   
   Medications to ADJUST:
   - medication: "SPECIFIC NAME", currentDosage: "CURRENT", newDosage: "NEW", rationale: "WHY"
   
   Medications to ADD:
   - medication: "SPECIFIC NAME with DCI", dosage: "EXACT DOSE", frequency: "UK FORMAT", indication: "DETAILED MEDICAL REASON (30+ chars)", monitoring: "WHAT TO MONITOR"
   
   Medications to STOP:
   - medication: "SPECIFIC NAME", rationale: "WHY STOP"

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanations):
{
  "diseaseAssessment": {
    "diabetes": {
      "present": true/false,
      "type": "Type 1|Type 2|Gestational|Pre-diabetes",
      "currentControl": "Excellent|Good|Fair|Poor",
      "currentHbA1c": "value or estimated based on glucose readings",
      "targetHbA1c": "< 7.0% for most adults, < 7.5% if elderly",
      "currentFastingGlucose": "value in g/L",
      "targetFastingGlucose": "0.80-1.20 g/L",
      "complications": {
        "retinopathy": "Present|Suspected|Screen needed|None detected",
        "nephropathy": "Present|Suspected|Screen needed|None detected",
        "neuropathy": "Present|Suspected|Screen needed|None detected",
        "cardiovascular": "High risk|Moderate risk|Low risk"
      },
      "riskFactors": ["list specific modifiable risk factors"]
    },
    "hypertension": {
      "present": true/false,
      "stage": "Stage 1 (130-139/80-89)|Stage 2 (≥140/90)|Controlled|Pre-hypertension",
      "currentBP": "systolic/diastolic in mmHg",
      "targetBP": "< 130/80 mmHg (or < 140/90 if elderly)",
      "cardiovascularRisk": "Low|Moderate|High|Very High",
      "organDamage": {
        "cardiac": "Present|Suspected|None",
        "renal": "Present|Suspected|None",
        "vascular": "Present|Suspected|None"
      },
      "riskFactors": ["list specific modifiable risk factors"]
    },
    "obesity": {
      "present": true/false,
      "currentBMI": "calculated value",
      "category": "Normal (18.5-24.9)|Overweight (25-29.9)|Obesity Class I (30-34.9)|Class II (35-39.9)|Class III (≥40)",
      "currentWeight": "in kg",
      "targetWeight": "realistic target in kg",
      "weightLossGoal": "kg to lose with timeline",
      "comorbidities": ["associated metabolic complications"],
      "riskFactors": ["list specific modifiable risk factors"]
    }
  },
  "detailedMealPlan": {
    "breakfast": {
      "timing": "7:00-8:00",
      "composition": "nutritional composition description",
      "portions": "specific portion sizes with units",
      "examples": ["option 1 with details", "option 2 with details", "option 3 with details"],
      "glycemicConsiderations": "how this meal affects blood sugar"
    },
    "lunch": {
      "timing": "12:30-13:30",
      "composition": "nutritional composition description",
      "portions": "specific portion sizes with units",
      "examples": ["option 1 with details", "option 2 with details"],
      "macronutrientBalance": "protein/carbs/fat distribution"
    },
    "dinner": {
      "timing": "19:00-20:00",
      "composition": "nutritional composition description",
      "portions": "specific portion sizes with units",
      "examples": ["option 1 with details", "option 2 with details"],
      "eveningRecommendations": "why this composition for evening"
    },
    "snacks": {
      "midMorning": {
        "timing": "10:00",
        "options": ["snack 1 with portion", "snack 2 with portion"]
      },
      "afternoon": {
        "timing": "16:00",
        "options": ["snack 1 with portion", "snack 2 with portion"]
      }
    },
    "hydration": "detailed hydration schedule with amounts and timing",
    "supplements": ["supplement 1 with dosage", "supplement 2 with dosage"] or [],
    "foodsToFavor": ["food 1 with reason", "food 2 with reason", "food 3 with reason"],
    "foodsToAvoid": ["food 1 with reason", "food 2 with reason", "food 3 with reason"],
    "cookingMethods": ["method 1", "method 2", "method 3"],
    "portionControlTips": ["tip 1", "tip 2", "tip 3"]
  },
  "therapeuticObjectives": {
    "shortTerm": {
      "duration": "1-3 months",
      "targets": [
        "measurable objective 1 with current → target values",
        "measurable objective 2 with current → target values",
        "measurable objective 3 with current → target values"
      ]
    },
    "mediumTerm": {
      "duration": "3-6 months",
      "targets": [
        "measurable objective 1 with target values",
        "measurable objective 2 with target values",
        "measurable objective 3 with target values"
      ]
    },
    "longTerm": {
      "duration": "6-12 months",
      "targets": [
        "measurable objective 1 with target values",
        "measurable objective 2 with target values",
        "measurable objective 3 with target values"
      ]
    }
  },
  "followUpPlan": {
    "specialistConsultations": [
      {
        "specialty": "Endocrinologue",
        "frequency": "specific schedule",
        "rationale": "why this frequency"
      },
      {
        "specialty": "Diététicien",
        "frequency": "specific schedule",
        "rationale": "why this frequency"
      },
      {
        "specialty": "Other specialists as needed",
        "frequency": "specific schedule",
        "rationale": "indication"
      }
    ],
    "laboratoryTests": [
      {
        "test": "HbA1c",
        "frequency": "specific schedule",
        "target": "target value",
        "rationale": "clinical indication"
      },
      {
        "test": "Other tests as needed",
        "frequency": "specific schedule",
        "target": "target value if applicable",
        "rationale": "clinical indication"
      }
    ],
    "selfMonitoring": {
      "bloodGlucose": {
        "frequency": "specific schedule",
        "timing": "when to measure",
        "target": "target range",
        "instructions": "how to adjust based on readings"
      },
      "bloodPressure": {
        "frequency": "specific schedule",
        "timing": "when to measure",
        "target": "target value",
        "instructions": "when to alert doctor"
      },
      "weight": {
        "frequency": "specific schedule",
        "timing": "when to measure",
        "target": "target trajectory",
        "instructions": "monitoring tips"
      },
      "other": {
        "task": "description",
        "frequency": "schedule",
        "instructions": "details"
      }
    }
  },
  "medicationManagement": {
    "continue": [
      {
        "medication": "name",
        "dosage": "dose",
        "frequency": "schedule",
        "rationale": "why continue"
      }
    ],
    "adjust": [
      {
        "medication": "name",
        "currentDosage": "current dose",
        "newDosage": "new dose",
        "rationale": "why adjust"
      }
    ],
    "add": [
      {
        "medication": "name",
        "dosage": "dose",
        "frequency": "schedule",
        "indication": "why prescribe",
        "monitoring": "what to monitor"
      }
    ],
    "stop": [
      {
        "medication": "name",
        "rationale": "why stop"
      }
    ]
  },
  "overallAssessment": {
    "globalControl": "Excellent|Good|Fair|Poor",
    "mainConcerns": ["concern 1", "concern 2", "concern 3"],
    "strengths": ["positive aspect 1", "positive aspect 2"],
    "priorityActions": ["action 1", "action 2", "action 3"],
    "prognosis": "realistic assessment with timeline"
  }
}`

    // Build comprehensive patient context
    const patientContext = `
PATIENT IDENTIFICATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Weight: ${weight} kg
- Height: ${patientData.height} cm
- BMI: ${bmi.toFixed(1)} kg/m²

CHRONIC DISEASES DECLARED:
${chronicDiseases.map((d: string) => `- ${d}`).join('\n') || '- None declared'}

DETECTED CONDITIONS:
- Diabetes: ${hasDiabetes ? 'YES' : 'NO'}
- Hypertension: ${hasHypertension ? 'YES' : 'NO'}
- Obesity/Overweight: ${hasObesity || bmi >= 25 ? 'YES' : 'NO'}

VITAL SIGNS (CURRENT CONSULTATION):
- Blood Pressure: ${clinicalData.vitalSigns?.bloodPressureSystolic || 'Not measured'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || 'Not measured'} mmHg
- Blood Glucose: ${clinicalData.vitalSigns?.bloodGlucose || 'Not measured'} g/L
- Heart Rate: ${clinicalData.vitalSigns?.heartRate || 'Not measured'} bpm
- Temperature: ${clinicalData.vitalSigns?.temperature || 'Not measured'} °C

CURRENT MEDICATIONS:
${patientData.currentMedications || 'None reported'}

ALLERGIES:
${patientData.allergies || 'None reported'}

CHIEF COMPLAINT:
${clinicalData.chiefComplaint || 'Chronic disease follow-up consultation'}

MEDICAL HISTORY (CONTEXT):
${clinicalData.medicalHistory || 'Not provided'}

PATIENT'S RESPONSES TO SPECIALIZED QUESTIONS:
${JSON.stringify(questionsData, null, 2)}

ANALYSIS INSTRUCTIONS:
1. Analyze ALL the information above comprehensively
2. For each chronic disease present, provide DETAILED assessment
3. Generate SPECIFIC meal plans with EXACT portions (not generic advice)
4. Set MEASURABLE therapeutic objectives with numeric targets
5. Create COMPLETE follow-up schedule with specific frequencies
6. Base medication recommendations on current data (if current medications listed, evaluate them)
7. Your response must match the quality of a REAL endocrinologist consultation report
8. USE PRECISE DCI NAMES for ALL medications (Metformine, Périndopril, Amlodipine, etc.)

CRITICAL: Return ONLY the JSON object, no markdown formatting, no explanations outside JSON.`

    // ========== STREAMING SSE IMPLEMENTATION ==========
    // Create a TransformStream to handle SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // Send initial progress
          sendSSE('progress', { message: 'Initializing AI assessment...', progress: 5 })

          // Start OpenAI streaming call with timeout
          sendSSE('progress', { message: 'Connecting to AI model...', progress: 10 })

          // Add timeout for the entire streaming operation (4 minutes max)
          const streamTimeout = 240000 // 4 minutes
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('OpenAI streaming timeout - response took too long')), streamTimeout)
          })

          const { reader } = await Promise.race([
            callOpenAIStreaming(apiKey, systemPrompt, patientContext),
            timeoutPromise
          ]) as { stream: ReadableStream, reader: ReadableStreamDefaultReader<Uint8Array> }

          sendSSE('progress', { message: 'Generating specialist assessment...', progress: 15 })

          // Process the stream with activity timeout
          const decoder = new TextDecoder()
          let fullContent = ''
          let chunkCount = 0
          let lastActivityTime = Date.now()
          const activityTimeout = 60000 // 60 seconds without chunks = timeout

          while (true) {
            // Check for inactivity timeout
            if (Date.now() - lastActivityTime > activityTimeout) {
              throw new Error('OpenAI stream stalled - no data received for 60 seconds')
            }

            const { done, value } = await reader.read()
            if (done) break

            lastActivityTime = Date.now() // Reset activity timer

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullContent += content
                    chunkCount++

                    // Send progress update every 15 chunks
                    if (chunkCount % 15 === 0) {
                      const progress = Math.min(90, 15 + Math.floor(chunkCount / 3))
                      sendSSE('progress', {
                        message: `Analyzing chronic conditions... ${progress}%`,
                        progress
                      })
                    }
                  }
                } catch {
                  // Skip invalid JSON chunks
                }
              }
            }
          }

          sendSSE('progress', { message: 'Validating assessment quality...', progress: 92 })
          console.log(`📊 OpenAI stream completed: ${chunkCount} chunks, ${fullContent.length} chars`)
          console.log(`📄 Full content preview (first 500 chars):`, fullContent.substring(0, 500))

          // Parse the complete JSON response
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            console.error('❌ No JSON found in response. Full content:', fullContent.substring(0, 1000))
            throw new Error('No valid JSON found in AI response')
          }

          console.log(`📋 JSON matched, length: ${jsonMatch[0].length} chars`)

          // Robust JSON cleanup function to fix control characters in strings
          const cleanJsonString = (jsonStr: string): string => {
            // Process the string character by character to properly escape control chars in strings
            let result = ''
            let inString = false
            let escaped = false

            for (let i = 0; i < jsonStr.length; i++) {
              const char = jsonStr[i]
              const charCode = jsonStr.charCodeAt(i)

              if (escaped) {
                result += char
                escaped = false
                continue
              }

              if (char === '\\' && inString) {
                escaped = true
                result += char
                continue
              }

              if (char === '"' && !escaped) {
                inString = !inString
                result += char
                continue
              }

              // If we're inside a string and hit a control character, escape it
              if (inString && charCode < 32) {
                // Escape control characters properly
                if (charCode === 10) result += '\\n'      // newline
                else if (charCode === 13) result += '\\r' // carriage return
                else if (charCode === 9) result += '\\t'  // tab
                else result += `\\u${charCode.toString(16).padStart(4, '0')}` // other control chars
                continue
              }

              result += char
            }

            return result
          }

          const cleanedJson = cleanJsonString(jsonMatch[0])

          let assessmentData
          try {
            assessmentData = JSON.parse(cleanedJson)
          } catch (parseError: any) {
            console.error('❌ JSON parse error (attempt 1):', parseError.message)
            const errorPosition = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0')
            console.error('❌ Position info:', errorPosition)
            console.error('❌ Character at error position:', cleanedJson.charAt(errorPosition), '(code:', cleanedJson.charCodeAt(errorPosition), ')')
            console.error('❌ JSON content around error (pos-50 to pos+50):', cleanedJson.substring(Math.max(0, errorPosition - 50), errorPosition + 50))

            // Attempt 2: More aggressive cleanup
            console.log('🔄 Attempting more aggressive JSON repair...')
            try {
              // Remove any text before first { and after last }
              const startIdx = cleanedJson.indexOf('{')
              const endIdx = cleanedJson.lastIndexOf('}')
              let repairedJson = cleanedJson.substring(startIdx, endIdx + 1)

              // Fix common issues:
              // 1. Replace smart quotes with regular quotes
              repairedJson = repairedJson.replace(/[""]/g, '"').replace(/['']/g, "'")
              // 2. Fix unescaped backslashes before non-escape characters
              repairedJson = repairedJson.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1')
              // 3. Remove any BOM or zero-width characters
              repairedJson = repairedJson.replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
              // 4. Fix trailing commas in arrays/objects
              repairedJson = repairedJson.replace(/,(\s*[}\]])/g, '$1')

              assessmentData = JSON.parse(repairedJson)
              console.log('✅ JSON repair successful on attempt 2')
            } catch (repairError: any) {
              console.error('❌ JSON repair attempt 2 failed:', repairError.message)
              console.error('❌ JSON content (first 500 chars):', cleanedJson.substring(0, 500))
              console.error('❌ JSON content (last 200 chars):', cleanedJson.substring(cleanedJson.length - 200))
              throw new Error(`JSON parse error: ${parseError.message}`)
            }
          }

          // Validate essential structure
          if (!assessmentData.diseaseAssessment || !assessmentData.detailedMealPlan) {
            throw new Error('Missing essential fields in assessment')
          }

          sendSSE('progress', { message: 'Processing medications...', progress: 95 })

          // Validate and auto-correct medications
          const medicationValidation = validateMedicationDCI(assessmentData.medicationManagement?.add || [])
          const mealPlanValidation = validateMealPlan(assessmentData.detailedMealPlan)

          // Auto-correct medication issues if needed
          if (!medicationValidation.isValid && assessmentData.medicationManagement?.add) {
            assessmentData.medicationManagement.add = assessmentData.medicationManagement.add.map((med: any) => {
              if (!med.dci || med.dci === 'undefined') {
                const medName = med.medication || ''
                const dciMatch = medName.match(/^([A-Za-zéèêàâôûùç]+)/)
                if (dciMatch) med.dci = dciMatch[1]
              }
              if (!med.indication || med.indication.length < 25) {
                med.indication = `Traitement médicamenteux pour la gestion de la maladie chronique selon les standards cliniques`
              }
              if (!med.frequency || !med.frequency.match(/OD|BD|TDS|QDS/i)) {
                med.frequency = 'OD (once daily)'
              }
              return med
            })
          }

          // ========== EXTRACT currentMedicationsValidated ==========
          const currentMedicationsValidated: any[] = []
          if (assessmentData?.medicationManagement?.continue && Array.isArray(assessmentData.medicationManagement.continue)) {
            assessmentData.medicationManagement.continue.forEach((med: any, idx: number) => {
              currentMedicationsValidated.push({
                id: idx + 1,
                name: med.medication || 'Current medication',
                medication_name: med.medication || 'Current medication',
                dci: med.medication || 'Current medication',
                dosage: med.dosage || '',
                frequency: med.frequency || 'As prescribed',
                posology: med.frequency || 'As prescribed',
                indication: 'Chronic disease management',
                assessment: 'Continue',
                reasoning: med.rationale || 'Continuing current treatment',
                validated_corrections: 'AI validated for chronic disease management',
                original_input: med.medication || ''
              })
            })
          }

          // ========== EXTRACT NEW/ADJUSTED MEDICATIONS ==========
          const addMedications = assessmentData?.medicationManagement?.add || []
          const adjustMedications = assessmentData?.medicationManagement?.adjust || []
          const medications = [...addMedications, ...adjustMedications]
          const combinedPrescription = [...currentMedicationsValidated, ...medications]

          // ========== EXTRACT INVESTIGATIONS ==========
          const investigations: any[] = []
          if (assessmentData?.investigationsPlan?.laboratory) {
            assessmentData.investigationsPlan.laboratory.forEach((test: string) => {
              investigations.push({
                examination: test,
                category: 'Laboratory',
                urgency: 'routine',
                indication: 'Chronic disease monitoring',
                rationale: 'Disease progression monitoring'
              })
            })
          }
          if (assessmentData?.investigationsPlan?.imaging) {
            assessmentData.investigationsPlan.imaging.forEach((test: string) => {
              investigations.push({
                examination: test,
                category: 'Imaging',
                urgency: 'routine',
                indication: 'Chronic disease assessment',
                rationale: 'Structural assessment'
              })
            })
          }

          sendSSE('progress', { message: 'Finalizing report...', progress: 98 })

          // Send the complete result
          const result = {
            success: true,
            currentMedicationsValidated,
            medications,
            combinedPrescription,
            expertAnalysis: {
              expert_therapeutics: { primary_treatments: medications },
              expert_investigations: { immediate_priority: investigations }
            },
            assessment: assessmentData,
            chronicDiseases: {
              diabetes: hasDiabetes,
              hypertension: hasHypertension,
              obesity: hasObesity || bmi >= 25
            },
            patientBMI: bmi.toFixed(1),
            qualityMetrics: {
              medicationDCICompliant: medicationValidation.isValid,
              mealPlanComplete: mealPlanValidation.isValid,
              attempt: 1,
              issues: [...medicationValidation.issues, ...mealPlanValidation.issues]
            },
            version: '3.1-Streaming-SSE',
            timestamp: new Date().toISOString(),
            metadata: {
              structureNormalized: true,
              matchesNormalWorkflow: true,
              streaming: true
            }
          }

          sendSSE('complete', result)
          sendSSE('progress', { message: 'Assessment complete!', progress: 100 })

        } catch (error: any) {
          console.error('Streaming error:', error)
          sendSSE('error', {
            error: 'Failed to generate assessment',
            details: error.message
          })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error("Chronic Diagnosis API Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate specialist-level chronic disease assessment",
        details: error.message
      },
      { status: 500 }
    )
  }
}
