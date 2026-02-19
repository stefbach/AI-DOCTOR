// app/api/chronic-dietary/route.ts - Dietary Protocol for Chronic Diseases
// Uses direct OpenAI fetch with JSON mode for reliability
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'
export const maxDuration = 300 // 7-day meal plan generation needs time with gpt-5.2

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

    const systemPrompt = `You are a clinical dietitian specialized in chronic disease management.

CRITICAL MEDICAL REQUIREMENTS:
1. BMI: ${bmi.toFixed(1)} kg/m²
2. BMR (Basal Metabolic Rate): ${Math.round(bmr)} kcal/day
3. TDEE (Total Daily Energy Expenditure): ${Math.round(tdee)} kcal/day
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

Return ONLY valid JSON with this structure:
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
        "breakfast": {
          "foods": [{"item": "food", "quantity": "amount", "calories": number}],
          "totalCalories": ${Math.round(targetCalories * 0.25)}
        },
        "midMorningSnack": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.10)}},
        "lunch": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.35)}},
        "afternoonSnack": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.10)}},
        "dinner": {"foods": [...], "totalCalories": ${Math.round(targetCalories * 0.20)}}
      },
      "day2": {...}, "day3": {...}, "day4": {...}, "day5": {...}, "day6": {...}, "day7": {...}
    },
    "practicalGuidance": {
      "groceryList": {"proteins": [], "vegetables": [], "grains": []},
      "mealPrepTips": [],
      "cookingMethods": {"recommended": [], "avoid": []}
    }
  }
}

DISEASE-SPECIFIC REQUIREMENTS:
${hasDiabetes ? '- DIABETES: Low GI foods, complex carbs, 45-60g carbs per meal, avoid simple sugars' : ''}
${hasHypertension ? '- HYPERTENSION: Low sodium (<2000mg/day), high potassium foods, DASH diet principles' : ''}
${bmi >= 30 ? '- OBESITY: High protein for satiety, high fiber, portion control emphasis' : ''}

Use Mauritius-appropriate foods (rice, dholl puri, rougaille, fish, tropical fruits).`

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

Generate complete 7-day meal plan with EXACTLY ${Math.round(targetCalories)} kcal per day.`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    console.log('🥗 Calling OpenAI API (direct fetch, JSON mode) for 7-day dietary protocol...')

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: patientContext }
        ],
        max_completion_tokens: 10000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ OpenAI API error (${response.status}):`, errorText.substring(0, 300))
      return NextResponse.json(
        { error: `OpenAI API error (${response.status})`, details: errorText.substring(0, 200) },
        { status: 502 }
      )
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const content = choice?.message?.content

    console.log(`📡 OpenAI response - finish_reason: ${choice?.finish_reason}, usage: ${JSON.stringify(data.usage || {})}`)

    if (!content) {
      console.error('❌ No content in OpenAI response:', JSON.stringify(data, null, 2).substring(0, 500))
      if (choice?.finish_reason === 'length') {
        return NextResponse.json(
          { error: "Response truncated - model ran out of tokens" },
          { status: 502 }
        )
      }
      return NextResponse.json(
        { error: "No content in OpenAI response" },
        { status: 502 }
      )
    }

    console.log('✅ Dietary protocol response received, length:', content.length)

    let dietaryData
    try {
      dietaryData = JSON.parse(content)
      console.log('✅ JSON parsed successfully')
    } catch (parseError: any) {
      console.error("❌ JSON parse error:", parseError.message)
      console.error("Content sample:", content.substring(0, 500))
      return NextResponse.json(
        { error: "Failed to parse dietary protocol", details: parseError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(dietaryData)

  } catch (error: any) {
    console.error("Dietary API Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate dietary protocol" },
      { status: 500 }
    )
  }
}
