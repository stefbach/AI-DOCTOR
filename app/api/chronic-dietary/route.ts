// app/api/chronic-dietary/route.ts - Comprehensive Dietary Protocol Generator for Chronic Diseases
// Generates detailed meal plans with nutritional guidance for diabetes, hypertension, obesity
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'
// Note: maxDuration removed - using default Vercel timeout like other working APIs

export async function POST(req: NextRequest) {
  try {
    const { patientData, diagnosisData, clinicalData } = await req.json()

    // Calculate BMI for dietary planning
    const weight = parseFloat(patientData.weight)
    const heightInMeters = parseFloat(patientData.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    const systemPrompt = `You are a SPECIALIZED CLINICAL DIETITIAN expert in chronic disease nutrition management.

Your task is to generate a PRACTICAL DIETARY PROTOCOL for chronic disease management.

IMPORTANT: Generate a complete 7-DAY meal plan but keep each day's description CONCISE and PRACTICAL.

CRITICAL REQUIREMENTS:

1. PERSONALIZED MEAL PLANNING:
   - Create meal plans for 7 DAYS (breakfast, lunch, dinner, 1-2 snacks per day)
   - For EACH MEAL, provide ONLY:
     * Main foods (2-3 items max per meal)
     * Total calories per meal
     * Brief preparation note (1 sentence)
     * Macronutrient breakdown (proteins, carbs, fats)
     * Preparation methods (grilled, steamed, baked, raw)
     * Timing recommendations
   - Culturally appropriate for Mauritius (include local foods when possible)

2. DISEASE-SPECIFIC DIETARY REQUIREMENTS:
   For DIABETES:
   - Low glycemic index meals
   - Carbohydrate counting and distribution
   - Target: 45-60g carbs per main meal, 15-20g per snack
   - Emphasis on fiber (25-35g daily)
   - Limit simple sugars
   - Include complex carbohydrates (whole grains, legumes)
   
   For HYPERTENSION:
   - DASH diet principles
   - Sodium restriction (< 2300mg/day, ideally < 1500mg/day)
   - Potassium-rich foods (3500-5000mg/day)
   - Limit processed foods
   - Include fruits, vegetables, low-fat dairy
   
   For OBESITY/WEIGHT LOSS:
   - Caloric deficit (typically 500-750 kcal/day deficit)
   - Portion control emphasis
   - High satiety foods (high fiber, protein, water content)
   - Regular meal timing to prevent overeating
   - Avoid calorie-dense, nutrient-poor foods

3. NUTRITIONAL ASSESSMENT:
   - Calculate Total Daily Energy Expenditure (TDEE)
   - Determine appropriate calorie target based on goals
   - Protein requirements: 1.0-1.2g per kg ideal body weight for diabetes
   - Carbohydrate requirements: 45-60% of total calories (adjust for diabetes)
   - Fat requirements: 25-35% of total calories (emphasize unsaturated fats)
   - Micronutrient recommendations (vitamins, minerals)
   - Hydration targets (30-35ml per kg body weight)

4. MEAL PLAN STRUCTURE (7-day plan - CONCISE format):
   For EACH of 7 days, provide:
   
   DAY 1:
   Breakfast (390 kcal): Oatmeal with milk and apple | Cook oatmeal with water, add cinnamon
   Mid-Morning Snack (150 kcal): Greek yogurt | Plain, no sugar
   Lunch (520 kcal): Grilled chicken, brown rice, vegetables | Grill chicken, steam vegetables
   Afternoon Snack (100 kcal): Apple with almonds | 1 medium apple, 10 almonds
   Dinner (480 kcal): Baked fish, quinoa, salad | Bake fish with herbs, serve with quinoa
   Daily Total: 1640 kcal
   
   DAY 2-7: Follow same BRIEF format (main foods, calories, one-line prep)

5. FOODS TO EMPHASIZE vs AVOID:
   List specific foods in each category:
   
   FOODS TO EMPHASIZE:
   - Whole grains: Brown rice, quinoa, whole wheat bread, oats
   - Lean proteins: Chicken breast, fish (tuna, salmon), tofu, legumes
   - Vegetables: Leafy greens, broccoli, cauliflower, tomatoes, cucumbers
   - Fruits: Apples, berries, citrus fruits (low GI fruits)
   - Healthy fats: Olive oil, avocado, nuts (almonds, walnuts), seeds
   - Dairy: Low-fat milk, yogurt, cottage cheese
   
   FOODS TO LIMIT/AVOID:
   - Refined carbs: White bread, white rice, pastries, cookies
   - Sugary foods: Candies, sodas, sweetened beverages, cakes
   - High sodium: Processed meats, canned soups, salty snacks
   - Saturated fats: Butter, cream, fatty meats, fried foods
   - Alcohol: Limit or avoid based on condition

6. PRACTICAL GUIDANCE:
   - Meal timing recommendations
   - Portion control strategies (visual guides, measuring)
   - Grocery shopping lists
   - Meal prep tips (batch cooking, food storage)
   - Restaurant eating guidelines
   - Travel/social event strategies
   - Reading nutrition labels
   - Healthy cooking methods

7. MONITORING & ADJUSTMENT:
   - Weight tracking (weekly weigh-ins)
   - Food diary recommendations
   - Blood glucose monitoring for diabetes (before/after meals)
   - Blood pressure monitoring for hypertension
   - Symptoms to track (energy, hunger, satiety)
   - When to adjust the plan
   - Follow-up schedule (typically every 2-4 weeks)

8. CULTURAL CONSIDERATIONS:
   - Mauritius food culture (rice, roti, dholl puri, curry)
   - Adapt traditional recipes with healthier modifications
   - Respect religious dietary restrictions if any
   - Family meal integration

IMPORTANT OPTIMIZATION RULES:
- Keep food lists to 2-4 items per meal (not extensive lists)
- Use brief preparation notes (1 sentence max)
- Focus on practical, easy-to-follow guidance
- Omit excessive nutritional micro-details
- Prioritize clarity and usability over exhaustive detail

Return ONLY valid JSON with this EXACT structure:
{
  "success": true,
  "dietaryProtocol": {
    "protocolHeader": {
      "protocolId": "unique ID",
      "protocolType": "CHRONIC DISEASE DIETARY MANAGEMENT",
      "generatedDate": "ISO date",
      "validityPeriod": "4 weeks (renewable with adjustments)",
      "dietitian": {
        "name": "Clinical Dietitian",
        "credentials": "RD, CDN, CDE",
        "specialty": "Chronic Disease Nutrition Management"
      },
      "patient": {
        "fullName": "patient name",
        "age": age,
        "gender": "gender",
        "weight": weight_kg,
        "height": height_cm,
        "bmi": bmi_value,
        "chronicDiseases": ["list"]
      }
    },
    "nutritionalAssessment": {
      "currentWeight": "kg",
      "idealBodyWeight": "kg (based on BMI 22-23)",
      "targetWeight": "kg (realistic goal in 3-6 months)",
      "currentBMI": bmi_value,
      "bmiCategory": "Underweight|Normal|Overweight|Obese Class I|II|III",
      "totalDailyEnergyExpenditure": "kcal (calculated)",
      "recommendedCaloricIntake": "kcal per day (for goal achievement)",
      "macronutrientTargets": {
        "carbohydrates": {
          "gramsPerDay": number,
          "percentageOfCalories": "45-60%",
          "distribution": "distribute evenly across meals",
          "emphasis": "complex carbs, high fiber, low GI"
        },
        "proteins": {
          "gramsPerDay": number,
          "percentageOfCalories": "15-20%",
          "gramsPerKgBodyWeight": "1.0-1.2g/kg",
          "sources": ["lean meats", "fish", "legumes", "dairy"]
        },
        "fats": {
          "gramsPerDay": number,
          "percentageOfCalories": "25-35%",
          "saturatedFatLimit": "< 7% of calories",
          "emphasis": "unsaturated fats, omega-3"
        }
      },
      "micronutrientFocus": [
        "Vitamin D: 600-800 IU daily",
        "Calcium: 1000-1200mg daily",
        "Magnesium: 320-420mg daily",
        "Potassium: 3500-5000mg daily (hypertension)",
        "Sodium: < 2300mg daily (< 1500mg for hypertension)",
        "Fiber: 25-35g daily",
        "Omega-3: 1-2g daily (fish oil or EPA/DHA)"
      ],
      "hydrationTarget": "liters per day",
      "specialConsiderations": [
        "any allergies or food intolerances",
        "cultural/religious dietary restrictions",
        "food preferences and dislikes",
        "cooking skills and kitchen facilities",
        "budget considerations"
      ]
    },
    "weeklyMealPlan": {
      "day1": {
        "breakfast": {
          "foods": [
            { "item": "food name", "quantity": "amount", "calories": number }
          ],
          "totalCalories": number,
          "preparationNotes": "brief prep instructions"
        },
        "midMorningSnack": { "foods": [...], "totalCalories": number },
        "lunch": { "foods": [...], "totalCalories": number, "preparationNotes": "..." },
        "afternoonSnack": { "foods": [...], "totalCalories": number },
        "dinner": { "foods": [...], "totalCalories": number, "preparationNotes": "..." },
        "dailyTotal": { "calories": number }
      },
      "day2": { /* same brief structure */ },
      "day3": { /* same brief structure */ },
      "day4": { /* same brief structure */ },
      "day5": { /* same brief structure */ },
      "day6": { /* same brief structure */ },
      "day7": { /* same brief structure */ }
    },
    "foodLists": {
      "emphasizedFoods": {
        "vegetables": ["specific vegetables with benefits"],
        "fruits": ["specific fruits, specify low/medium GI"],
        "proteins": ["specific lean protein sources"],
        "grains": ["specific whole grains"],
        "fats": ["specific healthy fat sources"],
        "dairy": ["specific low-fat dairy options"]
      },
      "foodsToLimit": [
        "specific foods to limit with reasons"
      ],
      "foodsToAvoid": [
        "specific foods to completely avoid with reasons"
      ],
      "portionGuides": [
        "1 cup cooked rice = 200 kcal, 45g carbs = size of a fist",
        "3 oz chicken breast = 140 kcal, 26g protein = deck of cards",
        "1 tablespoon oil = 120 kcal, 14g fat = size of thumb tip"
      ]
    },
    "practicalGuidance": {
      "groceryShoppingList": [
        "organized by food category with quantities"
      ],
      "mealPrepTips": [
        "batch cooking strategies",
        "food storage guidelines",
        "time-saving techniques"
      ],
      "cookingMethods": [
        "Grilling: reduces fat, retains nutrients",
        "Steaming: preserves vitamins, no added fat",
        "Baking: healthy alternative to frying",
        "Avoid: deep frying, excessive oil"
      ],
      "eatingOutGuidelines": [
        "Choose grilled over fried",
        "Ask for dressing on the side",
        "Portion control at buffets",
        "Skip bread basket and sugary drinks"
      ],
      "travelTips": [
        "Pack healthy snacks",
        "Stay hydrated",
        "Research restaurant options ahead"
      ]
    },
    "culturalAdaptations": {
      "mauritianFoods": [
        {
          "traditionalFood": "Dholl Puri",
          "healthierVersion": "Use whole wheat flour, reduce oil, add vegetable filling",
          "portionAdvice": "1 small puri with minimal oil",
          "frequency": "Once per week as a treat"
        },
        {
          "traditionalFood": "White rice",
          "healthierVersion": "Replace with brown rice or mix 50:50",
          "portionAdvice": "1/2 cup cooked (not heaping)",
          "frequency": "1-2 times per day maximum"
        }
      ],
      "recipeModifications": [
        "Replace coconut milk with low-fat milk or coconut-flavored water",
        "Use less oil in curries (measure, don't pour)",
        "Add more vegetables to traditional dishes",
        "Use herbs and spices instead of salt"
      ]
    },
    "monitoringAndFollowUp": {
      "selfMonitoring": {
        "weightTracking": "Weekly, same day, same time, same conditions",
        "foodDiary": "Keep detailed log for first 2 weeks, then spot-check",
        "symptomTracking": ["energy levels", "hunger", "cravings", "digestion"],
        "adherenceTracking": "Rate compliance to plan daily (1-10 scale)"
      },
      "clinicalMonitoring": {
        "bloodGlucose": "Before breakfast and 2 hours after meals (diabetes)",
        "bloodPressure": "Daily at same time (hypertension)",
        "weight": "Weekly",
        "labTests": "HbA1c every 3 months (diabetes), lipid panel every 6 months"
      },
      "adjustmentCriteria": {
        "increaseCalories": "If losing > 1kg per week or feeling weak",
        "decreaseCalories": "If not losing weight after 2 weeks",
        "adjustCarbs": "If blood glucose not at target",
        "adjustProtein": "If feeling excessive hunger"
      },
      "followUpSchedule": {
        "initialPhase": "Weekly for first month (phone or in-person)",
        "maintenancePhase": "Every 2-4 weeks",
        "longTerm": "Monthly check-ins",
        "emergencyContact": "Contact if adverse reactions or concerns"
      }
    },
    "supplementationRecommendations": [
      {
        "supplement": "Vitamin D3",
        "dosage": "1000-2000 IU daily",
        "rationale": "Common deficiency, important for insulin sensitivity",
        "timing": "With a meal containing fat"
      },
      {
        "supplement": "Omega-3 (Fish Oil)",
        "dosage": "1000mg EPA+DHA daily",
        "rationale": "Cardiovascular protection, anti-inflammatory",
        "timing": "With meals"
      }
    ],
    "educationalResources": [
      "Carbohydrate counting guide",
      "Glycemic index food chart",
      "Portion size visual guide",
      "Healthy recipe collection",
      "Meal planning template"
    ],
    "motivationalSupport": {
      "goalSetting": [
        "Short-term: Lose 2-3kg in first month",
        "Medium-term: Reduce HbA1c by 1% in 3 months",
        "Long-term: Achieve target weight and maintain for 6 months"
      ],
      "behaviorChangeStrategies": [
        "Keep unhealthy foods out of sight",
        "Use smaller plates for portion control",
        "Eat slowly and mindfully",
        "Plan meals in advance",
        "Find non-food rewards for achieving goals"
      ],
      "barrierManagement": [
        {
          "barrier": "Time constraints",
          "solution": "Meal prep on weekends, use slow cooker, keep healthy frozen meals"
        },
        {
          "barrier": "Social pressures",
          "solution": "Communicate your goals, bring healthy dish to gatherings, practice polite refusal"
        }
      ]
    },
    "emergencyProtocol": {
      "hypoglycemia": "If blood sugar < 70 mg/dL: consume 15g fast-acting carbs (juice, glucose tablets)",
      "severeHypoglycemia": "If unresponsive: emergency glucagon injection, call emergency services",
      "hyperglycemia": "If blood sugar > 300 mg/dL persistently: contact doctor immediately",
      "adverseFoodReactions": "If allergic reaction: stop food, take antihistamine, seek medical care if severe"
    }
  }
}

IMPORTANT INSTRUCTIONS:
1. Make the 7-day meal plan EXTREMELY DETAILED with exact portions and nutritional breakdowns
2. Base recommendations on the patient's chronic diseases from diagnosis data
3. Calculate realistic calorie targets based on age, gender, weight, height, activity level
4. Provide culturally appropriate foods for Mauritius when possible
5. Include practical, actionable advice that patient can implement immediately
6. Write in ENGLISH with Anglo-Saxon medical and nutritional terminology
7. Be specific with portions (use grams, cups, tablespoons - not vague terms like "some" or "a little")
8. Include preparation methods for each meal
9. Provide variety across the 7 days to prevent diet fatigue
10. Ensure nutritional adequacy while meeting disease-specific requirements

Generate the comprehensive dietary protocol now.`

    const patientContext = `
DIETARY ASSESSMENT DATE: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}

PATIENT INFORMATION:
- Full Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Weight: ${weight} kg
- Height: ${patientData.height} cm
- BMI: ${bmi.toFixed(1)} kg/m²

CHRONIC DISEASES:
${(patientData.medicalHistory || []).map((d: string, i: number) => `${i + 1}. ${d}`).join('\n') || '- No chronic diseases declared'}

CURRENT MEDICATIONS (may affect nutrition):
${patientData.currentMedicationsText || patientData.currentMedications || 'None reported'}

ALLERGIES (CRITICAL for meal planning):
${Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : (patientData.allergies || 'No known allergies')}
${patientData.otherAllergies ? `\nOther Allergies: ${patientData.otherAllergies}` : ''}

LIFESTYLE HABITS:
- Smoking: ${patientData.lifeHabits?.smoking || 'Not specified'}
- Alcohol: ${patientData.lifeHabits?.alcohol || 'Not specified'}
- Physical Activity: ${patientData.lifeHabits?.physicalActivity || 'Not specified'}

CURRENT CLINICAL DATA:
- Blood Pressure: ${clinicalData?.vitalSigns?.bloodPressureSystolic || 'Not measured'}/${clinicalData?.vitalSigns?.bloodPressureDiastolic || 'Not measured'} mmHg
- Blood Glucose: ${clinicalData?.vitalSigns?.bloodGlucose || 'Not measured'} g/L
- Heart Rate: ${clinicalData?.vitalSigns?.heartRate || 'Not measured'} bpm

DIAGNOSIS SUMMARY:
${JSON.stringify(diagnosisData, null, 2)}

DIETARY PLANNING OBJECTIVES:
1. Create a personalized 7-day meal plan with EXACT portions and nutritional values
2. Address all chronic diseases with appropriate dietary modifications
3. Ensure nutritional adequacy while meeting disease-specific restrictions
4. Provide practical, culturally appropriate guidance
5. Include monitoring and follow-up recommendations
6. Educate patient on long-term dietary management

Generate the comprehensive dietary protocol now with ALL required details.`

    // Call OpenAI API
    console.log('🥗 Calling OpenAI API for comprehensive dietary protocol...')
    
    const result = await generateText({
      model: openai("gpt-4o"),  // Use GPT-4o - faster for long responses than gpt-4o-mini
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: patientContext }
      ],
      maxTokens: 3500,  // Sufficient for 7-day meal plan
      temperature: 0.3,
    })

    const content = result.text
    
    if (!content) {
      console.error("❌ No content in AI response")
      return NextResponse.json(
        { error: "No content received from AI" },
        { status: 500 }
      )
    }
    
    console.log('✅ Dietary protocol response received, length:', content.length)

    // Parse JSON response
    let dietaryData
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("No JSON found in response:", content)
        return NextResponse.json(
          { error: "Invalid response format from AI", details: content.substring(0, 500) },
          { status: 500 }
        )
      }

      dietaryData = JSON.parse(jsonMatch[0])
      console.log('✅ Dietary protocol parsed successfully')
      
    } catch (parseError: any) {
      console.error("JSON parsing error:", parseError)
      return NextResponse.json(
        { error: "Failed to parse dietary protocol", details: parseError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(dietaryData)

  } catch (error: any) {
    console.error("Error generating dietary protocol:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate dietary protocol" },
      { status: 500 }
    )
  }
}
