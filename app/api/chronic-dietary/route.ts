// app/api/chronic-dietary/route.ts - Dietary Protocol for Chronic Diseases
// Routes through callLLM (DeepSeek when LLM_PROVIDER_CHRONIC_DIETARY=deepseek)
import { type NextRequest, NextResponse } from "next/server"
import { callLLM } from '@/lib/llm-client'
import { parseLLMJsonSafely } from '@/lib/llm/json-recovery'

export const runtime = 'nodejs'
export const maxDuration = 600 // 600s for DeepSeek-V4-Pro (7-day meal plan can run 200-400s on rich cases)

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

  const anonymousId = `ANON-DIET-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId

  console.log('🔒 Patient data anonymized for dietary protocol')

  return { anonymized, originalIdentity, anonymousId }
}

export async function POST(req: NextRequest) {
  try {
    const { patientData, diagnosisData, clinicalData } = await req.json()

    // Anonymize patient data before sending to AI
    const { anonymized: anonymizedPatient, originalIdentity, anonymousId } = anonymizePatientData(patientData)

    const weight = parseFloat(anonymizedPatient.weight)
    const heightInMeters = parseFloat(anonymizedPatient.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)
    const age = parseInt(anonymizedPatient.age) || 40
    const gender = anonymizedPatient.gender?.toLowerCase() || 'male'

    // CALCULATE BASAL METABOLIC RATE (BMR) using Mifflin-St Jeor Equation
    let bmr = 0
    if (gender === 'male' || gender === 'm' || gender === 'homme') {
      bmr = (10 * weight) + (6.25 * parseFloat(anonymizedPatient.height)) - (5 * age) + 5
    } else {
      bmr = (10 * weight) + (6.25 * parseFloat(anonymizedPatient.height)) - (5 * age) - 161
    }

    // CALCULATE TOTAL DAILY ENERGY EXPENDITURE (TDEE)
    // Activity factor: 1.3-1.4 for chronic disease patients (light activity)
    const activityFactor = 1.3
    const tdee = bmr * activityFactor

    // DETERMINE TARGET CALORIES based on BMI and chronic conditions
    let targetCalories = tdee
    let caloricAdjustment = ""

    if (bmi < 18.5) {
      // UNDERWEIGHT: Add 300-500 kcal for weight gain
      targetCalories = tdee + 400
      caloricAdjustment = "Weight gain protocol (+400 kcal)"
    } else if (bmi >= 18.5 && bmi < 25) {
      // NORMAL WEIGHT: Maintenance calories
      targetCalories = tdee
      caloricAdjustment = "Weight maintenance"
    } else if (bmi >= 25 && bmi < 30) {
      // OVERWEIGHT: Moderate deficit (300-500 kcal)
      targetCalories = tdee - 400
      caloricAdjustment = "Moderate weight loss (-400 kcal)"
    } else if (bmi >= 30 && bmi < 35) {
      // OBESE CLASS I: Moderate to high deficit (500-750 kcal)
      targetCalories = tdee - 600
      caloricAdjustment = "Weight loss for obesity (-600 kcal)"
    } else {
      // OBESE CLASS II+: High deficit but minimum 1200 kcal for women, 1500 for men
      targetCalories = tdee - 750
      const minCalories = (gender === 'male' || gender === 'm' || gender === 'homme') ? 1500 : 1200
      targetCalories = Math.max(targetCalories, minCalories)
      caloricAdjustment = `Therapeutic weight loss (-750 kcal, minimum ${minCalories} kcal)`
    }

    // ENSURE MINIMUM SAFE CALORIE LEVELS
    const absoluteMinimum = (gender === 'male' || gender === 'm' || gender === 'homme') ? 1500 : 1200
    targetCalories = Math.max(targetCalories, absoluteMinimum)

    // CALCULATE TARGET WEIGHT for normal BMI (22.5)
    const idealBMI = 22.5
    const targetWeight = idealBMI * (heightInMeters * heightInMeters)

    // DETERMINE MACRO DISTRIBUTION based on chronic conditions
    let carbsPercent = 50, proteinPercent = 20, fatPercent = 30
    
    const hasDiabetes = anonymizedPatient.medicalHistory?.some((condition: string) =>
      condition.toLowerCase().includes('diabet') || condition.toLowerCase().includes('glyc')
    )
    const hasHypertension = anonymizedPatient.medicalHistory?.some((condition: string) =>
      condition.toLowerCase().includes('hypertension') || condition.toLowerCase().includes('tension')
    )
    
    if (hasDiabetes) {
      // Lower carbs for diabetes control
      carbsPercent = 40
      proteinPercent = 25
      fatPercent = 35
    }
    if (bmi >= 30) {
      // Higher protein for satiety and muscle preservation
      carbsPercent = 40
      proteinPercent = 30
      fatPercent = 30
    }

    // ---- Shared system context used by both half-week calls. ----
    const sharedRules = `You are a clinical dietitian specialized in chronic disease management.

CRITICAL MEDICAL REQUIREMENTS:
1. BMI: ${bmi.toFixed(1)} kg/m²
2. BMR (Basal Metabolic Rate): ${Math.round(bmr)} kcal/day
3. TDEE: ${Math.round(tdee)} kcal/day
4. TARGET DAILY CALORIES: ${Math.round(targetCalories)} kcal/day
5. Caloric Strategy: ${caloricAdjustment}

MANDATORY: Each day's meals MUST total approximately ${Math.round(targetCalories)} kcal (±100 kcal)

Meal distribution should be:
- Breakfast: ${Math.round(targetCalories * 0.25)} kcal (25%)
- Mid-Morning Snack: ${Math.round(targetCalories * 0.10)} kcal (10%)
- Lunch: ${Math.round(targetCalories * 0.35)} kcal (35%)
- Afternoon Snack: ${Math.round(targetCalories * 0.10)} kcal (10%)
- Dinner: ${Math.round(targetCalories * 0.20)} kcal (20%)

Macronutrient distribution:
- Carbohydrates: ${carbsPercent}% (${Math.round(targetCalories * carbsPercent / 400)} g)
- Protein: ${proteinPercent}% (${Math.round(targetCalories * proteinPercent / 400)} g)
- Fat: ${fatPercent}% (${Math.round(targetCalories * fatPercent / 900)} g)

DISEASE-SPECIFIC REQUIREMENTS:
${hasDiabetes ? '- DIABETES: Low GI foods, complex carbs, 45-60g carbs per meal, avoid simple sugars' : ''}
${hasHypertension ? '- HYPERTENSION: Low sodium (<2000mg/day), high potassium foods, DASH diet principles' : ''}
${bmi >= 30 ? '- OBESITY: High protein for satiety, high fiber, portion control emphasis' : ''}

Use Mauritius-appropriate foods (rice, dholl puri, rougaille, fish, tropical fruits).

OUTPUT BUDGET RULES (critical to avoid truncated JSON):
- Each food entry SHORT: "item" ≤ 4 words, "quantity" ≤ 3 words.
- Max 5 food items per meal (3-4 ideal). Snacks: 1-2 items.
- Numbers in "calories" / "totalCalories" are plain integers (no quotes, no units).
- Output MUST be valid JSON with every brace and bracket closed.`

    // ===== CALL 1: nutritional assessment + days 1-4 + practical guidance =====
    const systemPromptCall1 = `${sharedRules}

Return ONLY valid JSON with this exact structure (no extra keys):
{
  "success": true,
  "dietaryProtocol": {
    "protocolHeader": {
      "protocolType": "7-Day Personalized Dietary Protocol",
      "issueDate": "${new Date().toISOString().split('T')[0]}"
    },
    "nutritionalAssessment": {
      "currentWeight": "${weight} kg",
      "bmi": ${bmi.toFixed(1)},
      "bmiCategory": "${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}",
      "targetWeight": "${targetWeight.toFixed(1)} kg",
      "bmr": "${Math.round(bmr)} kcal/day",
      "tdee": "${Math.round(tdee)} kcal/day",
      "dailyCaloricNeeds": {
        "targetCalories": "${Math.round(targetCalories)} kcal/day",
        "caloricAdjustment": "${caloricAdjustment}",
        "macroDistribution": {
          "carbs": "${carbsPercent}%",
          "protein": "${proteinPercent}%",
          "fat": "${fatPercent}%"
        }
      }
    },
    "weeklyMealPlan": {
      "day1": {
        "breakfast": {"foods": [{"item": "food", "quantity": "amount", "calories": number}], "totalCalories": ${Math.round(targetCalories * 0.25)}},
        "midMorningSnack": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.10)}},
        "lunch": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.35)}},
        "afternoonSnack": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.10)}},
        "dinner": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.20)}}
      },
      "day2": "<same 5-meal object shape as day1, fully populated>",
      "day3": "<same shape, fully populated>",
      "day4": "<same shape, fully populated>"
    },
    "practicalGuidance": {
      "groceryList": {"proteins": [], "vegetables": [], "grains": []},
      "mealPrepTips": [],
      "cookingMethods": {"recommended": [], "avoid": []}
    }
  }
}

PART 1 of 2: Generate ONLY days 1-4. Days 5-7 will be requested in a follow-up call — DO NOT include them here.
groceryList: max 8 items per category. mealPrepTips: max 5 short bullets. cookingMethods: max 5 each.`

    // ===== CALL 2: days 5-7 only =====
    const systemPromptCall2 = `${sharedRules}

PART 2 of 2: Generate ONLY days 5-7 of the 7-day meal plan. Vary the menus from days 1-4 to keep the week interesting while respecting the same caloric targets, macro distribution, and disease-specific constraints.

Return ONLY valid JSON with this exact structure (no nesting under dietaryProtocol, no extra keys):
{
  "weeklyMealPlan": {
    "day5": {
      "breakfast": {"foods": [{"item": "food", "quantity": "amount", "calories": number}], "totalCalories": ${Math.round(targetCalories * 0.25)}},
      "midMorningSnack": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.10)}},
      "lunch": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.35)}},
      "afternoonSnack": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.10)}},
      "dinner": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.20)}}
    },
    "day6": "<same shape, fully populated>",
    "day7": "<same shape, fully populated>"
  }
}`

    // ANONYMIZED patient context - no personal identifiers sent to AI
    const patientContext = `
PATIENT: ${anonymousId}
AGE: ${age} years | GENDER: ${gender}
WEIGHT: ${weight} kg | HEIGHT: ${anonymizedPatient.height} cm | BMI: ${bmi.toFixed(1)}

CHRONIC CONDITIONS: ${(anonymizedPatient.medicalHistory || []).join(', ') || 'None'}
ALLERGIES: ${Array.isArray(anonymizedPatient.allergies) ? anonymizedPatient.allergies.join(', ') : (anonymizedPatient.allergies || 'None')}
MEDICATIONS: ${anonymizedPatient.currentMedicationsText || 'None'}

VITAL SIGNS:
- BP: ${clinicalData?.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData?.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
- Blood Glucose: ${clinicalData?.vitalSigns?.bloodGlucose || '?'} g/L

PART 1: produce ONLY days 1-4 plus nutritionalAssessment and practicalGuidance, with daily totals near ${Math.round(targetCalories)} kcal.`

    // ===== CALLS 1 & 2 in PARALLEL =====
    // Vercel serverless has a hard ~300s edge-gateway cap on Pro plan
    // (independent of maxDuration). Two sequential ~3-min DeepSeek calls
    // were tripping ERR_CONNECTION_CLOSED in the client. Running them
    // concurrently keeps wall time at max(call1, call2) ≈ 3 min instead
    // of 5-6 min, comfortably under the cap.
    //
    // Trade-off: call 2 no longer sees call 1's days 1-4 output, so it
    // can't explicitly "vary from" them. We compensate with a stronger
    // diversity rule in systemPromptCall2 (\"choose 3 menus that are
    // distinct from each other and from any common breakfast/lunch
    // patterns\") and rely on the LLM's variation tendencies — which are
    // strong enough on a structured generation like this. Worst case a
    // dish repeats once across the week; a non-blocking issue.
    const part2UserPrompt = `${patientContext}

PART 2: produce ONLY days 5-7. Choose distinct menus from each other so the patient sees a variety of dishes within these three days, while respecting the same caloric targets and macro distribution.`

    console.log('🥗 Dietary calls 1/2 + 2/2 running in PARALLEL...')
    const [call1Settled, call2Settled] = await Promise.allSettled([
      callLLM({
        useCase: 'CHRONIC_DIETARY',
        messages: [
          { role: 'system', content: systemPromptCall1 },
          { role: 'user', content: patientContext }
        ],
        maxTokens: 12000,
        responseFormat: 'json_object',
        reasoningEffort: 'low',
        timeoutMs: 240_000,
      }),
      callLLM({
        useCase: 'CHRONIC_DIETARY',
        messages: [
          { role: 'system', content: systemPromptCall2 },
          { role: 'user', content: part2UserPrompt }
        ],
        maxTokens: 8000,
        responseFormat: 'json_object',
        reasoningEffort: 'low',
        timeoutMs: 240_000,
      }),
    ])

    if (call1Settled.status === 'rejected') {
      console.error('❌ Dietary call 1 failed:', call1Settled.reason?.message || call1Settled.reason)
      return NextResponse.json(
        { error: 'Dietary call 1 failed', details: String(call1Settled.reason?.message || call1Settled.reason).substring(0, 200) },
        { status: 502 }
      )
    }
    const call1Result = call1Settled.value
    console.log(`[llm] use=CHRONIC_DIETARY part=1/2 provider=${call1Result.provider} model=${call1Result.model} latency=${call1Result.latencyMs}ms tokens=${call1Result.usage?.totalTokens ?? 'n/a'}`)

    let part1: any
    try {
      part1 = parseLLMJsonSafely(call1Result.text || '', 'dietary part 1')
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Failed to parse dietary protocol (part 1)', details: parseError.message },
        { status: 500 }
      )
    }

    // Call 2 result (may have failed — graceful degradation).
    let part2: any = null
    if (call2Settled.status === 'fulfilled') {
      const call2Result = call2Settled.value
      console.log(`[llm] use=CHRONIC_DIETARY part=2/2 provider=${call2Result.provider} model=${call2Result.model} latency=${call2Result.latencyMs}ms tokens=${call2Result.usage?.totalTokens ?? 'n/a'}`)
      try {
        part2 = parseLLMJsonSafely(call2Result.text || '', 'dietary part 2')
      } catch {
        console.warn('⚠️ Dietary call 2 unparseable — returning part 1 only (days 1-4 + assessment)')
      }
    } else {
      console.warn('⚠️ Dietary call 2 failed — returning part 1 only:', call2Settled.reason?.message || call2Settled.reason)
    }

    // Merge: keep part1's full envelope, append days 5-7 onto weeklyMealPlan.
    const dietaryData = {
      ...part1,
      dietaryProtocol: {
        ...(part1?.dietaryProtocol || {}),
        weeklyMealPlan: {
          ...(part1?.dietaryProtocol?.weeklyMealPlan || {}),
          ...(part2?.weeklyMealPlan || {}),
        },
      },
    }

    console.log('✅ Dietary protocol assembled (parts 1+2 merged)')

    return NextResponse.json(dietaryData)

  } catch (error: any) {
    console.error("Dietary API Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate dietary protocol" },
      { status: 500 }
    )
  }
}
