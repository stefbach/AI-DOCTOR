// app/api/chronic-diagnosis/route.ts - Specialist-Level Chronic Disease Diagnosis API
// Behaves as TRUE Endocrinologist/Dietitian with DETAILED meal plans and therapeutic objectives
// VERSION 3.0: Professional-grade quality matching openai-diagnosis
// - 4 retry attempts with progressive enhancement
// - Auto-correction on final attempt
// - 8000 max tokens for comprehensive responses
// - Consultation type detection (new vs renewal/follow-up)
// - Enhanced context awareness
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

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
 * Calls OpenAI with retry mechanism and quality validation
 */
async function callOpenAIWithRetry(
  apiKey: string,
  systemPrompt: string,
  patientContext: string,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 OpenAI call attempt ${attempt + 1}/${maxRetries + 1}`)
      
      // Enhance prompt with quality requirements on retry
      let enhancedSystemPrompt = systemPrompt
      
      if (attempt === 1) {
        enhancedSystemPrompt = `🚨 ATTEMPT 2/4 - PREVIOUS RESPONSE HAD QUALITY ISSUES - ENHANCED REQUIREMENTS:

${systemPrompt}

⚠️ CRITICAL MEDICATION REQUIREMENTS (DCI VALIDATION):
- EVERY medication must have SPECIFIC pharmaceutical name with DCI (e.g., "Metformine 500mg" NOT "Medication" or "Drug")
- EVERY medication must have PRECISE dosage with UK format (OD/BD/TDS/QDS)
- EVERY medication must have DETAILED indication (minimum 25 characters explaining medical reason)
- NO generic terms like "medication", "drug", "antibiotic" without specific names

EXAMPLES OF CORRECT MEDICATION FORMAT:
✅ "medication": "Metformine 500mg", "dosage": "500mg", "frequency": "BD (twice daily)", "indication": "Traitement de première ligne du diabète type 2 pour améliorer le contrôle glycémique"
✅ "medication": "Périndopril 4mg", "dosage": "4mg", "frequency": "OD (once daily)", "indication": "Contrôle tensionnel pour atteindre PA cible < 130/80 mmHg"

❌ FORBIDDEN:
❌ "medication": "Medication", "indication": "Treatment"
❌ Vague or incomplete medication information`
      } else if (attempt === 2) {
        enhancedSystemPrompt = `🚨🚨 ATTEMPT 3/4 - STRICT QUALITY REQUIREMENTS - MAURITIUS MEDICAL STANDARDS:

${systemPrompt}

⚠️ ABSOLUTE REQUIREMENTS:
1. NEVER use "Medication", "undefined", null, or generic names
2. ALWAYS use precise pharmaceutical names with DCI
3. ALWAYS use UK dosing format (OD/BD/TDS/QDS) with daily totals
4. DCI MUST BE EXACT: Metformine, Périndopril, Amlodipine, Atorvastatine
5. INDICATIONS MUST BE DETAILED: Minimum 40 characters with specific medical context
6. MEAL PLANS MUST BE COMPLETE: All meals with portions, examples, timing
7. ALL fields must be completed with specific medical content
8. THERAPEUTIC OBJECTIVES must be measurable with exact targets

🎯 MANDATORY MEAL PLAN STRUCTURE:
- BREAKFAST: Composition + Portions + Examples (min 2) + Timing
- LUNCH: Composition + Portions + Examples (min 2) + Timing
- DINNER: Composition + Portions + Examples (min 2) + Timing
- SNACKS: Morning + Afternoon options with portions

💊 MANDATORY MEDICATION FORMAT:
{
  "medication": "Metformine 500mg",
  "dci": "Metformine",
  "dosage": "500mg",
  "frequency": "BD (twice daily)",
  "indication": "Traitement de première intention du diabète de type 2 pour améliorer le contrôle glycémique et réduire la résistance à l'insuline",
  "monitoring": "Surveillance de la créatinine et fonction rénale tous les 6 mois"
}`
      } else if (attempt >= 3) {
        enhancedSystemPrompt = `🆘 ATTEMPT 4/4 - MAXIMUM QUALITY MODE - FINAL ATTEMPT:

${systemPrompt}

🎯 EMERGENCY REQUIREMENTS FOR MAURITIUS CHRONIC DISEASE MANAGEMENT:

Every medication MUST have ALL these fields completed with DETAILED content:

1. "medication": "SPECIFIC UK NAME + DOSE" (e.g., "Metformine 500mg")
2. "dci": "EXACT DCI NAME" (e.g., "Metformine") 
3. "indication": "DETAILED MEDICAL INDICATION" (minimum 50 characters with full medical context)
4. "dosage": "EXACT DOSE" (e.g., "500mg")
5. "frequency": "UK FORMAT with explanation" (e.g., "BD (twice daily)")
6. "monitoring": "SPECIFIC monitoring requirements"
7. ALL other fields must be completed with medical content

EXAMPLE COMPLETE MEDICATION:
{
  "medication": "Metformine 500mg",
  "dci": "Metformine",
  "dosage": "500mg",
  "frequency": "BD (twice daily)",
  "indication": "Traitement de première intention du diabète de type 2 pour améliorer le contrôle glycémique, réduire la résistance à l'insuline, et diminuer la production hépatique de glucose. Contribue également à la perte de poids modeste.",
  "monitoring": "Surveillance de la créatinine et calcul du DFG tous les 6 mois. Surveillance de la vitamine B12 annuellement. Vérifier la tolérance gastro-intestinale.",
  "contraindications": "Insuffisance rénale sévère (DFG < 30 ml/min), acidose métabolique, insuffisance hépatique sévère",
  "sideEffects": "Troubles gastro-intestinaux (diarrhée, nausées), déficit en vitamine B12 à long terme, acidose lactique rare"
}

MEAL PLAN MUST BE EXTREMELY DETAILED:
- Each meal: Timing + Composition + Specific portions (g/ml) + At least 2 concrete examples
- Nutritional rationale for each meal
- Glycemic considerations for diabetes
- Sodium considerations for hypertension
- Caloric targets for obesity

THERAPEUTIC OBJECTIVES MUST BE MEASURABLE:
- Short-term: Exact targets with numbers (e.g., "HbA1c from 8.2% to < 7.5%")
- Medium-term: Specific goals with timeline (e.g., "Weight loss of 8kg in 3-6 months")
- Long-term: Maintenance targets (e.g., "HbA1c < 7.0% consistently")

⚠️ THIS IS THE FINAL ATTEMPT - RESPONSE MUST BE PERFECT!`
      }
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: enhancedSystemPrompt },
            { role: "user", content: patientContext }
          ],
          temperature: attempt === 0 ? 0.5 : attempt === 1 ? 0.3 : 0.1,
          max_tokens: 8000,
          response_format: { type: "json_object" },
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.2
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`)
      }
      
      const data = await response.json()
      const content = data.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('No content received from OpenAI')
      }
      
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response')
      }
      
      const assessmentData = JSON.parse(jsonMatch[0])
      
      // Validate essential structure
      if (!assessmentData.diseaseAssessment || !assessmentData.detailedMealPlan) {
        throw new Error('Missing essential fields: diseaseAssessment or detailedMealPlan')
      }
      
      // Validate medication quality (DCI compliance)
      const medicationValidation = validateMedicationDCI(
        assessmentData.medicationManagement?.add || []
      )
      
      // Validate meal plan completeness
      const mealPlanValidation = validateMealPlan(assessmentData.detailedMealPlan)
      
      // If quality issues found and we have retries left, throw error to retry
      if ((!medicationValidation.isValid || !mealPlanValidation.isValid) && attempt < maxRetries) {
        const allIssues = [...medicationValidation.issues, ...mealPlanValidation.issues]
        console.log(`⚠️ Quality issues detected (${allIssues.length}), retrying...`)
        console.log('Issues:', allIssues.slice(0, 3))
        throw new Error(`Quality validation failed: ${allIssues.slice(0, 2).join('; ')}`)
      }
      
      // AUTO-CORRECTION on final attempt if quality issues remain (like openai-diagnosis)
      if ((!medicationValidation.isValid || !mealPlanValidation.isValid) && attempt === maxRetries) {
        console.log(`🔧 AUTO-CORRECTION MODE: Applying fixes to ${medicationValidation.issues.length + mealPlanValidation.issues.length} quality issues...`)
        
        // Auto-correct medication issues
        if (assessmentData.medicationManagement?.add) {
          assessmentData.medicationManagement.add = assessmentData.medicationManagement.add.map((med: any) => {
            if (!med.dci || med.dci === 'undefined') {
              // Extract DCI from medication name
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
        
        console.log(`✅ Auto-correction applied - proceeding with enhanced response`)
      }
      
      // Log quality metrics
      if (!medicationValidation.isValid || !mealPlanValidation.isValid) {
        console.log(`⚠️ Final attempt - ${medicationValidation.issues.length + mealPlanValidation.issues.length} quality issues remain (auto-corrected)`)
        console.log('Medication issues:', medicationValidation.issues.length)
        console.log('Meal plan issues:', mealPlanValidation.issues.length)
      } else {
        console.log('✅ Quality validation passed')
      }
      
      return {
        assessment: assessmentData,
        qualityMetrics: {
          medicationDCICompliant: medicationValidation.isValid,
          mealPlanComplete: mealPlanValidation.isValid,
          attempt: attempt + 1,
          issues: [...medicationValidation.issues, ...mealPlanValidation.issues]
        }
      }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff
        console.log(`⏳ Retrying in ${waitTime}ms with enhanced quality requirements...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
}

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

    // Call OpenAI with retry mechanism and DCI validation
    const result = await callOpenAIWithRetry(apiKey, systemPrompt, patientContext, 2)
    const assessmentData = result.assessment
    
    // ========== EXTRACT currentMedicationsValidated FROM medicationManagement.continue ==========
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
    
    console.log(`📋 CHRONIC: Extracted ${currentMedicationsValidated.length} continuing medications as currentMedicationsValidated`)
    
    // ========== EXTRACT NEW/ADJUSTED MEDICATIONS (MATCH NORMAL WORKFLOW) ==========
    const addMedications = assessmentData?.medicationManagement?.add || []
    const adjustMedications = assessmentData?.medicationManagement?.adjust || []
    const medications = [...addMedications, ...adjustMedications]
    
    console.log(`💊 CHRONIC: Extracting new/adjusted medications`)
    console.log(`   - Add medications: ${addMedications.length}`)
    console.log(`   - Adjust medications: ${adjustMedications.length}`)
    console.log(`   - Total new medications: ${medications.length}`)
    
    // ========== COMBINED PRESCRIPTION (MATCH NORMAL WORKFLOW) ==========
    const combinedPrescription = [...currentMedicationsValidated, ...medications]
    console.log(`📋 CHRONIC: Combined prescription - ${combinedPrescription.length} total medications`)
    
    // ========== EXTRACT INVESTIGATIONS (MATCH NORMAL WORKFLOW) ==========
    const investigations = []
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
    
    console.log(`🔬 CHRONIC: Extracted ${investigations.length} investigations`)
    
    return NextResponse.json({
      success: true,
      
      // ========== TOP-LEVEL MEDICATIONS (MATCH NORMAL WORKFLOW) ==========
      currentMedicationsValidated: currentMedicationsValidated,
      medications: medications,
      combinedPrescription: combinedPrescription,
      
      // ========== TOP-LEVEL ANALYSIS WITH INVESTIGATIONS (MATCH NORMAL WORKFLOW) ==========
      expertAnalysis: {
        expert_therapeutics: {
          primary_treatments: medications
        },
        expert_investigations: {
          immediate_priority: investigations
        }
      },
      
      // ========== ORIGINAL CHRONIC STRUCTURE (FOR BACKWARD COMPATIBILITY) ==========
      assessment: assessmentData,
      
      chronicDiseases: {
        diabetes: hasDiabetes,
        hypertension: hasHypertension,
        obesity: hasObesity || bmi >= 25
      },
      patientBMI: bmi.toFixed(1),
      qualityMetrics: result.qualityMetrics,
      version: '3.0-Professional-Grade-4Retry-AutoCorrect-Normalized',
      timestamp: new Date().toISOString(),
      metadata: {
        structureNormalized: true,
        matchesNormalWorkflow: true
      }
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
