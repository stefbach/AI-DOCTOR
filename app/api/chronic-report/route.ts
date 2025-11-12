// app/api/chronic-report/route.ts - Chronic Disease Follow-Up Report Generation
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'edge'
export const preferredRegion = 'auto'

export async function POST(req: NextRequest) {
  try {
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData,
      doctorData 
    } = await req.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    const systemPrompt = `You are an expert medical documentation specialist for chronic disease management.

Generate a COMPREHENSIVE CHRONIC DISEASE FOLLOW-UP REPORT in JSON format.

This report must include:
1. Chronic Disease Status Summary
2. Disease-Specific Control Assessments
3. Complications Screening Results
4. Medication Management Plan
5. Lifestyle Modifications
6. Laboratory Monitoring Schedule
7. Follow-Up Plan
8. Patient Education Points

Return ONLY valid JSON with this structure:
{
  "report": {
    "header": {
      "documentType": "CHRONIC DISEASE FOLLOW-UP REPORT",
      "documentId": "CHR-YYYY-MM-DD-XXXXX",
      "generatedAt": "ISO date",
      "consultationType": "Chronic Disease Follow-Up"
    },
    "patientInfo": {
      "name": "full name",
      "age": "age",
      "gender": "gender",
      "chronicDiseases": ["list"]
    },
    "vitalSigns": {
      "bloodPressure": "systolic/diastolic mmHg",
      "bloodGlucose": "value g/L",
      "weight": "kg",
      "bmi": "calculated",
      "heartRate": "bpm"
    },
    "chronicDiseaseStatus": {
      "diabetes": {
        "status": "present/absent",
        "control": "Excellent|Good|Fair|Poor",
        "currentMetrics": {
          "hbA1c": "value or estimated",
          "fastingGlucose": "value",
          "complications": ["list"]
        },
        "management": "summary"
      },
      "hypertension": {
        "status": "present/absent",
        "control": "Excellent|Good|Fair|Poor",
        "currentMetrics": {
          "office_bp": "value",
          "home_bp": "value if available",
          "cardiovascular_risk": "assessment"
        },
        "management": "summary"
      },
      "obesity": {
        "status": "present/absent",
        "bmi": "value",
        "category": "classification",
        "comorbidities": ["list"],
        "management": "summary"
      }
    },
    "assessment": {
      "chiefComplaint": "reason for visit",
      "chronicDiseaseReview": "detailed assessment",
      "complicationsScreening": "findings",
      "overallControl": "assessment",
      "riskFactors": ["list"]
    },
    "managementPlan": {
      "medications": {
        "current": [
          {
            "medication": "name",
            "dosage": "dose",
            "frequency": "frequency",
            "indication": "why",
            "monitoring": "what to monitor"
          }
        ],
        "changes": "summary of medication changes"
      },
      "lifestyle": {
        "diet": "specific recommendations",
        "exercise": "specific plan",
        "smoking": "recommendations",
        "alcohol": "recommendations"
      },
      "selfMonitoring": {
        "bloodGlucose": "schedule if applicable",
        "bloodPressure": "schedule if applicable",
        "weight": "schedule if applicable"
      }
    },
    "monitoring": {
      "laboratory": [
        {
          "test": "test name",
          "indication": "why",
          "schedule": "when"
        }
      ],
      "specialistReferrals": [
        {
          "specialty": "specialist type",
          "indication": "why",
          "urgency": "routine|urgent"
        }
      ]
    },
    "followUp": {
      "nextVisit": {
        "timing": "recommendation",
        "reason": "why"
      },
      "warningS signs": ["list of concerning symptoms"],
      "emergencyInstructions": "when to seek immediate care"
    },
    "patientEducation": [
      {
        "topic": "education topic",
        "keyPoints": ["list of points"],
        "resources": "materials provided"
      }
    ],
    "prescriptions": {
      "medications": [
        {
          "name": "medication",
          "dosage": "dose",
          "form": "tablet|capsule|etc",
          "frequency": "how often",
          "duration": "how long",
          "quantity": "amount to dispense",
          "instructions": "special instructions",
          "indication": "chronic disease being treated"
        }
      ],
      "labTests": [
        {
          "test": "test name",
          "indication": "why ordered",
          "fasting": true|false,
          "urgent": true|false
        }
      ]
    }
  }
}`

    const contextData = `
PATIENT: ${patientData.firstName} ${patientData.lastName}
Age: ${patientData.age}, Gender: ${patientData.gender}
Weight: ${patientData.weight}kg, Height: ${patientData.height}cm

CHRONIC DISEASES: ${(patientData.medicalHistory || []).join(', ')}

VITAL SIGNS:
- BP: ${clinicalData.vitalSigns?.bloodPressureSystolic}/${clinicalData.vitalSigns?.bloodPressureDiastolic} mmHg
- Blood Glucose: ${clinicalData.vitalSigns?.bloodGlucose} g/L
- Heart Rate: ${clinicalData.vitalSigns?.heartRate} bpm
- Temperature: ${clinicalData.vitalSigns?.temperature}°C

CURRENT MEDICATIONS:
${patientData.currentMedications || 'None'}

CHIEF COMPLAINT: ${clinicalData.chiefComplaint}

AI ASSESSMENT:
${JSON.stringify(diagnosisData, null, 2)}

DOCTOR: ${doctorData?.fullName || 'Dr. [Name]'}
MCM Registration: ${doctorData?.medicalCouncilNumber || '[Registration]'}

Generate comprehensive chronic disease follow-up report for Mauritius healthcare system.`

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
          { role: "user", content: contextData }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenAI API Error:", error)
      return NextResponse.json(
        { error: "Failed to generate chronic disease report" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "No content received from AI" },
        { status: 500 }
      )
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("No JSON found in response:", content)
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      )
    }

    const reportData = JSON.parse(jsonMatch[0])
    
    return NextResponse.json({
      success: true,
      report: reportData.report
    })

  } catch (error: any) {
    console.error("Chronic Report API Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate chronic disease report",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
