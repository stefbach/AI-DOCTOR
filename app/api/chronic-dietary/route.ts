// app/api/chronic-dietary/route.ts - Simplified Dietary Protocol for Chronic Diseases
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

export async function POST(req: NextRequest) {
  try {
    const { patientData, diagnosisData, clinicalData } = await req.json()

    const weight = parseFloat(patientData.weight)
    const heightInMeters = parseFloat(patientData.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)
    const age = parseInt(patientData.age) || 40
    const gender = patientData.gender?.toLowerCase() || 'male'

    // CALCULATE BASAL METABOLIC RATE (BMR) using Mifflin-St Jeor Equation
    let bmr = 0
    if (gender === 'male' || gender === 'm' || gender === 'homme') {
      bmr = (10 * weight) + (6.25 * parseFloat(patientData.height)) - (5 * age) + 5
    } else {
      bmr = (10 * weight) + (6.25 * parseFloat(patientData.height)) - (5 * age) - 161
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
    
    const hasDiabetes = patientData.medicalHistory?.some((condition: string) => 
      condition.toLowerCase().includes('diabet') || condition.toLowerCase().includes('glyc')
    )
    const hasHypertension = patientData.medicalHistory?.some((condition: string) => 
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

    const patientContext = `
PATIENT: ${patientData.firstName} ${patientData.lastName}
AGE: ${age} years | GENDER: ${gender}
WEIGHT: ${weight} kg | HEIGHT: ${patientData.height} cm | BMI: ${bmi.toFixed(1)}

CHRONIC CONDITIONS: ${(patientData.medicalHistory || []).join(', ') || 'None'}
ALLERGIES: ${Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : (patientData.allergies || 'None')}
MEDICATIONS: ${patientData.currentMedicationsText || 'None'}

VITAL SIGNS:
- BP: ${clinicalData?.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData?.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
- Blood Glucose: ${clinicalData?.vitalSigns?.bloodGlucose || '?'} g/L

Generate complete 7-day meal plan with EXACTLY ${Math.round(targetCalories)} kcal per day.`

    console.log('🥗 Calling OpenAI API for dietary protocol...')
    
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: patientContext }
      ],
      maxTokens: 3500,
      temperature: 0.3,
    })

    const content = result.text
    
    if (!content) {
      return NextResponse.json(
        { error: "No content received from AI" },
        { status: 500 }
      )
    }
    
    console.log('✅ Dietary protocol response received')

    let dietaryData
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "Invalid response format" },
          { status: 500 }
        )
      }
      dietaryData = JSON.parse(jsonMatch[0])
    } catch (parseError: any) {
      return NextResponse.json(
        { error: "Failed to parse dietary protocol" },
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
