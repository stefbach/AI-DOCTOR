// app/api/chronic-diagnosis/route.ts - Specialist-Level Chronic Disease Diagnosis API
// Behaves as TRUE Endocrinologist/Dietitian with DETAILED meal plans and therapeutic objectives
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'edge'
export const preferredRegion = 'auto'

export async function POST(req: NextRequest) {
  try {
    const { patientData, clinicalData, questionsData } = await req.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    // Detect chronic diseases from patient data
    const chronicDiseases = patientData.medicalHistory || []
    const hasDiabetes = chronicDiseases.some((d: string) => d.toLowerCase().includes('diabetes') || d.toLowerCase().includes('diabète'))
    const hasHypertension = chronicDiseases.some((d: string) => d.toLowerCase().includes('hypertension') || d.toLowerCase().includes('hta'))
    const hasObesity = chronicDiseases.some((d: string) => d.toLowerCase().includes('obesity') || d.toLowerCase().includes('obésité'))

    // Calculate BMI for obesity assessment
    const weight = parseFloat(patientData.weight)
    const heightInMeters = parseFloat(patientData.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    const systemPrompt = `You are a SENIOR ENDOCRINOLOGIST and CLINICAL DIETITIAN specialist with 20+ years of experience in chronic disease management.

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
   - Current medications to CONTINUE with reasoning
   - Medications to ADJUST with new dosages and reasoning
   - Medications to ADD with indication, dosage, frequency
   - Medications to STOP with reasoning

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

CRITICAL: Return ONLY the JSON object, no markdown formatting, no explanations outside JSON.`

    // Call OpenAI API with GPT-4o
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: patientContext }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenAI API Error:", error)
      return NextResponse.json(
        { error: "Failed to generate specialist-level chronic disease assessment" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "No content received from AI specialist model" },
        { status: 500 }
      )
    }

    // Parse JSON response (handle potential markdown wrapping)
    let assessmentData
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("No JSON found in response:", content)
        return NextResponse.json(
          { error: "Invalid response format from AI specialist" },
          { status: 500 }
        )
      }
      assessmentData = JSON.parse(jsonMatch[0])
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError.message)
      console.error("Content received:", content)
      return NextResponse.json(
        { 
          error: "Failed to parse specialist assessment",
          details: parseError.message
        },
        { status: 500 }
      )
    }

    // Validate essential fields are present
    if (!assessmentData.diseaseAssessment || !assessmentData.detailedMealPlan) {
      console.error("Missing essential fields in assessment:", assessmentData)
      return NextResponse.json(
        { error: "Incomplete specialist assessment generated" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      assessment: assessmentData,
      chronicDiseases: {
        diabetes: hasDiabetes,
        hypertension: hasHypertension,
        obesity: hasObesity || bmi >= 25
      },
      patientBMI: bmi.toFixed(1),
      timestamp: new Date().toISOString()
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
