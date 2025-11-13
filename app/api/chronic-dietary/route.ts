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

    const systemPrompt = `You are a clinical dietitian. Generate a 7-day meal plan for chronic disease management.

Return ONLY valid JSON with this structure:
{
  "success": true,
  "dietaryProtocol": {
    "protocolHeader": {
      "protocolType": "7-Day Dietary Protocol",
      "issueDate": "YYYY-MM-DD"
    },
    "nutritionalAssessment": {
      "currentWeight": "${weight} kg",
      "bmi": ${bmi.toFixed(1)},
      "targetWeight": "calculated kg",
      "dailyCaloricNeeds": {
        "targetCalories": "calculated kcal/day",
        "macroDistribution": {
          "carbs": "percentage",
          "protein": "percentage",
          "fat": "percentage"
        }
      }
    },
    "weeklyMealPlan": {
      "day1": {
        "breakfast": {
          "foods": [{"item": "food name", "quantity": "amount", "calories": number}],
          "totalCalories": number
        },
        "midMorningSnack": {"foods": [...], "totalCalories": number},
        "lunch": {"foods": [...], "totalCalories": number},
        "afternoonSnack": {"foods": [...], "totalCalories": number},
        "dinner": {"foods": [...], "totalCalories": number}
      },
      "day2": { /* same structure */ },
      "day3": { /* same structure */ },
      "day4": { /* same structure */ },
      "day5": { /* same structure */ },
      "day6": { /* same structure */ },
      "day7": { /* same structure */ }
    },
    "practicalGuidance": {
      "groceryList": {
        "proteins": ["chicken", "fish", "eggs"],
        "vegetables": ["broccoli", "spinach"],
        "grains": ["brown rice", "oats"]
      },
      "mealPrepTips": ["batch cook on weekends", "prep vegetables ahead"],
      "cookingMethods": {
        "recommended": ["grilling", "steaming", "baking"],
        "avoid": ["deep frying"]
      }
    }
  }
}

REQUIREMENTS:
- For DIABETES: Low GI foods, limit sugars, 45-60g carbs per meal
- For HYPERTENSION: Low sodium (<2300mg/day), high potassium
- For OBESITY: Calorie deficit (500-750 kcal/day)
- Use Mauritius-appropriate foods
- Keep responses CONCISE`

    const patientContext = `
PATIENT: ${patientData.firstName} ${patientData.lastName}
AGE: ${patientData.age} years
WEIGHT: ${weight} kg | HEIGHT: ${patientData.height} cm | BMI: ${bmi.toFixed(1)}

CHRONIC DISEASES:
${(patientData.medicalHistory || []).join(', ') || 'None'}

ALLERGIES: ${Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : (patientData.allergies || 'None')}

CURRENT MEDICATIONS: ${patientData.currentMedicationsText || 'None'}

CLINICAL DATA:
- BP: ${clinicalData?.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData?.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
- Blood Glucose: ${clinicalData?.vitalSigns?.bloodGlucose || '?'} g/L

Generate the 7-day dietary protocol now.`

    console.log('🥗 Calling OpenAI API for dietary protocol...')
    
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: patientContext }
      ],
      maxTokens: 2000,
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
