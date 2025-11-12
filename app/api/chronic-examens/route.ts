// app/api/chronic-examens/route.ts - Chronic Disease Laboratory and Paraclinical Exam Orders API
// Generates exam orders for chronic disease monitoring (HbA1c, lipids, ECG, fundus exam, etc.)
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

export async function POST(req: NextRequest) {
  try {
    const { patientData, diagnosisData, reportData } = await req.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    // Get current date for exam orders
    const orderDate = new Date()
    const orderId = `EXM-CHR-${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    const systemPrompt = `You are a SENIOR ENDOCRINOLOGIST ordering laboratory tests and paraclinical examinations for chronic disease monitoring.

You MUST generate COMPREHENSIVE EXAM ORDERS for chronic disease follow-up based on the diagnosis data provided.

CRITICAL REQUIREMENTS:

1. LABORATORY TESTS (BIOLOGICAL EXAMS):
   For DIABETES:
   - HbA1c (Hémoglobine glyquée) - MANDATORY every 3 months
   - Glycémie à jeun - Baseline assessment
   - Bilan lipidique complet (CT, HDL, LDL, TG) - Every 6 months
   - Créatininémie + DFG (fonction rénale) - Every 6-12 months
   - Microalbuminurie - Annual (nephropathy screening)
   - ASAT, ALAT (fonction hépatique) - If on medications
   - TSH - Annual if type 1 diabetes
   
   For HYPERTENSION:
   - Ionogramme sanguin (Na, K, Cl) - Baseline and monitoring
   - Créatininémie + DFG - Monitoring renal function
   - Bilan lipidique - CV risk assessment
   - Glycémie à jeun - Diabetes screening
   
   For OBESITY/DYSLIPIDEMIA:
   - Bilan lipidique complet - Monitoring
   - Glycémie à jeun + HbA1c - Diabetes screening
   - Bilan hépatique (ASAT, ALAT, GGT) - NASH screening
   - TSH - Thyroid function if weight gain
   
   For CV PROTECTION:
   - Troponine - If chest pain/CV symptoms
   - BNP/NT-proBNP - If heart failure suspected

2. PARACLINICAL EXAMS (IMAGING & SPECIAL TESTS):
   For DIABETES:
   - Fond d'œil (Fundus examination) - MANDATORY annual (retinopathy screening)
   - ECG - Annual (cardiovascular screening)
   - Examen des pieds - Every consultation (neuropathy/arteriopathy)
   - Écho-Doppler artères MI - If arteriopathy suspected
   - Test monofilament - Neuropathy screening
   
   For HYPERTENSION:
   - ECG - Baseline and annual (LVH screening)
   - Échocardiographie - If uncontrolled or LVH suspected
   - Holter tensionnel 24h - If white coat or masked HTN suspected
   - Écho-Doppler TSA - If carotid bruit or high CV risk
   - Mesure de l'index de pression systolique cheville/bras - Arteriopathy screening
   
   For OBESITY:
   - Échographie abdominale - NASH/steatosis screening
   - Test d'effort - CV fitness if starting exercise program
   
   For COMPLICATIONS:
   - EMG - If neuropathy symptoms
   - IRM cérébrale - If neurological symptoms
   - Scintigraphie myocardique - If ischemia suspected

3. EXAM ORDER FORMAT:
   Each exam must include:
   - Test/exam name (French medical terminology)
   - Category (BIOLOGIE, IMAGERIE, EXPLORATION FONCTIONNELLE, CONSULTATION SPÉCIALISÉE)
   - Clinical indication (why ordered)
   - Urgency (URGENT, SEMI-URGENT, ROUTINE)
   - Timing (when to perform: IMMÉDIAT, DANS 1 MOIS, DANS 3 MOIS, etc.)
   - Frequency (how often: TOUS LES 3 MOIS, ANNUEL, etc.)
   - Fasting requirement (À JEUN, NON À JEUN)
   - Special instructions
   - Expected results / targets
   - Follow-up plan based on results

4. EXAM SELECTION LOGIC:
   - Based on chronic diseases present
   - Based on disease control status
   - Based on complications screening needs
   - Based on medication monitoring needs
   - Based on follow-up schedule from diagnosis
   - Consider patient's last exam dates if available

5. MAURITIUS HEALTHCARE CONTEXT:
   - Use French medical terminology
   - Follow Mauritius lab standards
   - Include local lab reference values
   - Consider local availability of exams

Return ONLY valid JSON with this EXACT structure:
{
  "success": true,
  "examOrders": {
    "orderHeader": {
      "orderId": "unique ID",
      "orderType": "CHRONIC DISEASE MONITORING",
      "orderDate": "date",
      "orderTime": "time",
      "prescriber": {
        "name": "doctor name",
        "specialty": "Endocrinology / Internal Medicine",
        "medicalCouncilNumber": "MCM registration"
      },
      "patient": {
        "lastName": "last name",
        "firstName": "first name",
        "age": age,
        "chronicDiseases": ["list of chronic diseases"]
      },
      "clinicalContext": "brief clinical context for labs"
    },
    "laboratoryTests": [
      {
        "lineNumber": 1,
        "category": "BIOCHIMIE|HÉMATOLOGIE|IMMUNOLOGIE|MICROBIOLOGIE",
        "testName": "test name in French",
        "testCode": "lab code if applicable",
        "clinicalIndication": "why this test is ordered",
        "urgency": "URGENT|SEMI-URGENT|ROUTINE",
        "timing": {
          "when": "when to perform",
          "frequency": "how often (tous les 3 mois, annuel, etc.)",
          "nextDueDate": "estimated date if known"
        },
        "preparation": {
          "fasting": true|false,
          "fastingDuration": "duration if fasting required",
          "medicationInstructions": "medication instructions if any",
          "otherInstructions": "other preparation instructions"
        },
        "expectedResults": {
          "normalRange": "normal reference range",
          "targetForPatient": "specific target for this patient",
          "interpretationGuidance": "how to interpret results"
        },
        "monitoringPurpose": {
          "diseaseMonitoring": "which disease",
          "medicationMonitoring": "which medication if applicable",
          "complicationScreening": "which complication if applicable"
        },
        "followUpActions": {
          "ifNormal": "action if normal",
          "ifAbnormal": "action if abnormal",
          "alertCriteria": "when to alert doctor immediately"
        }
      }
    ],
    "paraclinicalExams": [
      {
        "lineNumber": 1,
        "category": "IMAGERIE|EXPLORATION FONCTIONNELLE|CONSULTATION SPÉCIALISÉE",
        "examName": "exam name in French",
        "examType": "specific type",
        "clinicalIndication": "why this exam is ordered",
        "urgency": "URGENT|SEMI-URGENT|ROUTINE",
        "timing": {
          "when": "when to perform",
          "frequency": "how often",
          "nextDueDate": "estimated date if known"
        },
        "preparation": {
          "fastingRequired": true|false,
          "medicationAdjustments": "medication adjustments if needed",
          "contrastAllergy": "check contrast allergy if applicable",
          "otherPreparation": "other preparation instructions"
        },
        "technicalSpecifications": {
          "specificProtocol": "specific protocol if needed",
          "views": "specific views to obtain",
          "measurements": "specific measurements needed"
        },
        "expectedFindings": {
          "normalFindings": "what normal looks like",
          "concerningFindings": "what to look for",
          "reportingRequirements": "what should be in report"
        },
        "followUpActions": {
          "ifNormal": "action if normal",
          "ifAbnormal": "action if abnormal",
          "alertCriteria": "when to alert doctor immediately"
        }
      }
    ],
    "specialistReferrals": [
      {
        "specialty": "specialty name",
        "consultationType": "INITIAL|FOLLOW-UP|URGENT",
        "indication": "clinical indication for referral",
        "urgency": "URGENT|SEMI-URGENT|ROUTINE",
        "timing": "when to schedule",
        "frequency": "how often",
        "specificQuestions": "specific questions for specialist",
        "informationToProvide": "information to provide to specialist"
      }
    ],
    "examSummary": {
      "totalLabTests": number,
      "totalParaclinicalExams": number,
      "totalSpecialistReferrals": number,
      "byUrgency": {
        "urgent": number,
        "semiUrgent": number,
        "routine": number
      },
      "byPurpose": {
        "diseaseMonitoring": number,
        "complicationScreening": number,
        "medicationMonitoring": number,
        "cardiovascularRisk": number
      },
      "estimatedCost": "estimated total cost if known",
      "timelineOverview": "overview of when exams should be done"
    },
    "monitoringPlan": {
      "immediate": ["exams to do immediately"],
      "oneMonth": ["exams within 1 month"],
      "threeMonths": ["exams within 3 months"],
      "sixMonths": ["exams within 6 months"],
      "annual": ["annual exams"]
    },
    "laboratoryNotes": {
      "specimenCollection": "specimen collection instructions",
      "transportRequirements": "transport requirements if any",
      "resultReporting": "how results should be reported",
      "criticalValueAlerts": "critical values requiring immediate alert"
    },
    "orderValidation": {
      "appropriateTests": "tests appropriate for diagnoses",
      "noRedundantTests": "no unnecessary redundancy",
      "timingAppropriate": "timing appropriate for monitoring",
      "safetyChecked": "safety considerations reviewed",
      "costEffective": "cost-effectiveness considered",
      "validationScore": number_0_to_100
    }
  }
}

IMPORTANT:
1. Base exam selection on diagnosis data (diseaseAssessment, followUpPlan)
2. Include ALL essential exams for each chronic disease
3. Prioritize by urgency and clinical importance
4. Consider last exam dates to avoid redundancy
5. Include both monitoring exams and complication screening
6. Provide specific timing for each exam
7. Include preparation instructions (fasting, medication adjustments)
8. Specify what to look for in results
9. Define follow-up actions based on results
10. Use French medical terminology for Mauritius healthcare`

    const patientContext = `
EXAM ORDER DATE: ${orderDate.toLocaleDateString('fr-MU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
TIME: ${orderDate.toLocaleTimeString('fr-MU', { hour: '2-digit', minute: '2-digit' })}
ORDER ID: ${orderId}

PATIENT INFORMATION:
- Full Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}

CHRONIC DISEASES (REQUIRE MONITORING):
${(patientData.medicalHistory || []).map((d: string, i: number) => `${i + 1}. ${d}`).join('\n') || '- None declared'}

DIAGNOSIS DATA (BASIS FOR EXAM ORDERS):
${JSON.stringify(diagnosisData, null, 2)}

FOLLOW-UP PLAN FROM DIAGNOSIS:
${diagnosisData.followUpPlan ? JSON.stringify(diagnosisData.followUpPlan, null, 2) : 'Not provided'}

MONITORING REQUIREMENTS FROM REPORT:
${reportData?.structuredData?.monitoring ? JSON.stringify(reportData.structuredData.monitoring, null, 2) : 'Not yet generated'}

DOCTOR INFORMATION:
- Name: Dr. ${patientData.doctorName || 'TIBOKai DOCTOR'}
- Specialty: Endocrinology / Internal Medicine
- MCM Number: ${patientData.doctorMCM || 'MCM-XXXXXXXXX'}

EXAM ORDER INSTRUCTIONS:
1. Review the diagnosis data carefully
2. Identify all chronic diseases present (diabetes, hypertension, obesity, dyslipidemia)
3. For each disease, order appropriate monitoring exams:
   
   DIABETES:
   - HbA1c (MANDATORY every 3 months)
   - Glycémie à jeun
   - Bilan lipidique (every 6 months)
   - Créatininémie + DFG (every 6-12 months)
   - Microalbuminurie (annual)
   - Fond d'œil (MANDATORY annual)
   - ECG (annual)
   
   HYPERTENSION:
   - Ionogramme
   - Créatininémie + DFG
   - ECG (annual)
   - Échocardiographie (if uncontrolled)
   
   OBESITY/DYSLIPIDEMIA:
   - Bilan lipidique
   - Glycémie + HbA1c
   - Bilan hépatique
   
4. Categorize exams by urgency:
   - URGENT: If patient has concerning symptoms
   - SEMI-URGENT: If disease poorly controlled
   - ROUTINE: Regular monitoring schedule
   
5. Specify timing:
   - IMMÉDIAT: Critical exams
   - DANS 1 MOIS: Important follow-up
   - DANS 3 MOIS: HbA1c and quarterly monitoring
   - DANS 6 MOIS: Lipids and semi-annual monitoring
   - ANNUEL: Fundus exam, ECG, comprehensive check
   
6. Include fasting requirements:
   - À JEUN: Glycémie, bilan lipidique, bilan hépatique
   - NON À JEUN: HbA1c, créatininémie, ECG, fond d'œil
   
7. Specify target values:
   - HbA1c: < 7% (or patient-specific)
   - LDL cholesterol: < 1.0 g/L (if diabetes)
   - DFG: > 60 mL/min/1.73m²
   
8. Define follow-up actions based on results
   
9. Include specialist referrals if needed:
   - Ophtalmologue (fundus exam)
   - Cardiologue (if complications)
   - Néphrologue (if renal impairment)
   - Podologue (foot exam)
   
10. Write in French for Mauritius healthcare system
11. Generate COMPLETE JSON with ALL required fields

Generate the comprehensive chronic disease exam orders now.`

    // Call OpenAI API using Vercel AI SDK (like generate-consultation-report)
    console.log('🤖 Calling OpenAI API using Vercel AI SDK...')
    
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: patientContext }
      ],
      maxTokens: 2500,
      temperature: 0.2,
    })

    const content = result.text
    
    if (!content) {
      console.error("❌ No content in AI response")
      return NextResponse.json(
        { error: "No content received from AI" },
        { status: 500 }
      )
    }
    
    console.log('✅ AI response received, length:', content.length)

    // Parse JSON response
    let examOrdersData
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("No JSON found in response:", content)
        return NextResponse.json(
          { error: "Invalid response format from AI - no JSON found" },
          { status: 500 }
        )
      }
      examOrdersData = JSON.parse(jsonMatch[0])
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError.message)
      console.error("Content received:", content)
      return NextResponse.json(
        { 
          error: "Failed to parse exam orders data",
          details: parseError.message
        },
        { status: 500 }
      )
    }

    // Validate essential fields
    if (!examOrdersData.examOrders || (!examOrdersData.examOrders.laboratoryTests && !examOrdersData.examOrders.paraclinicalExams)) {
      console.error("Missing essential exam orders fields:", examOrdersData)
      return NextResponse.json(
        { error: "Incomplete exam orders generated" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      examOrders: examOrdersData.examOrders,
      orderId: orderId,
      generatedAt: orderDate.toISOString()
    })

  } catch (error: any) {
    console.error("Chronic Examens API Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate chronic disease exam orders",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
