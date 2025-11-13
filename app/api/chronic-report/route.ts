// app/api/chronic-report/route.ts - Comprehensive Narrative Medical Report for Chronic Disease Follow-Up
// Generates TRUE endocrinology consultation report with narrative text + structured data
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const runtime = 'nodejs'
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

    // Calculate BMI
    const weight = parseFloat(patientData.weight)
    const heightInMeters = parseFloat(patientData.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    // Get current date for report header
    const reportDate = new Date()
    const documentId = `CHR-${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(reportDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    const systemPrompt = `You are a SENIOR ENDOCRINOLOGIST writing a COMPREHENSIVE CONSULTATION REPORT for chronic disease follow-up.

Your report must be a COMPLETE NARRATIVE DOCUMENT that could be printed and placed in a patient's medical file, matching REAL clinical practice standards.

You MUST generate a report with TWO main parts:

PART 1: NARRATIVE MEDICAL REPORT (Complete text as a real doctor would write)
PART 2: STRUCTURED DATA (For database storage and system processing)

The narrative report should read like a REAL endocrinology consultation letter, with:
- Professional medical language (but understandable)
- Complete sentences and paragraphs (NOT bullet points for main sections)
- Clinical reasoning explained
- Therapeutic decision-making rationale
- Follow-up justification

CRITICAL REQUIREMENTS:

1. NARRATIVE REPORT STRUCTURE:
   - Header (Title, Patient ID, Date, Doctor)
   - Patient Identification (Name, Age, Gender, Medical Record)
   - Chief Complaint & Reason for Consultation
   - Medical History (Chronic diseases, relevant past history)
   - Current Treatment (Medications with dosages)
   - Clinical Examination (Vital signs, physical findings)
   - Disease-Specific Assessment (Diabetes, Hypertension, Obesity - detailed paragraph for each)
   - Complications Screening (Current status, findings)
   - Paraclinical Data (Lab results if available, otherwise note what's needed)
   - Overall Assessment & Clinical Impression (Synthesis)
   - Therapeutic Plan (Detailed management strategy)
   - Dietary Plan (Summary of meal plan recommendations)
   - Self-Monitoring Instructions (What patient must monitor at home)
   - Follow-Up Schedule (When to return, which specialists to see)
   - Warning Signs (When to seek urgent care)
   - Patient Education Points (Key messages)
   - Conclusion
   - Doctor's Signature Block

2. STRUCTURED DATA (for system):
   - Document metadata
   - All patient information
   - Vital signs
   - Disease assessments
   - Medication lists
   - Lab orders
   - Prescriptions
   - Follow-up schedule

Return ONLY valid JSON with this EXACT structure:
{
  "success": true,
  "report": {
    "documentMetadata": {
      "documentId": "unique ID",
      "documentType": "CHRONIC DISEASE FOLLOW-UP CONSULTATION",
      "generatedAt": "ISO timestamp",
      "consultationDate": "date of consultation",
      "language": "English (Anglo-Saxon medical standards)",
      "version": "1.0"
    },
    "narrativeReport": {
      "fullText": "COMPLETE NARRATIVE REPORT AS ONE LONG TEXT STRING WITH \\n\\n FOR PARAGRAPHS - This is the actual medical letter a doctor would write, in ENGLISH with Anglo-Saxon medical standards, professional medical language, covering ALL sections mentioned above. Minimum 1500 words. Include all assessment details, meal plans summary, therapeutic objectives, follow-up schedule, etc.",
      "sections": {
        "header": "Report header text",
        "patientIdentification": "Patient ID paragraph",
        "reasonForConsultation": "Chief complaint paragraph",
        "medicalHistory": "Complete medical history paragraph",
        "currentTreatment": "Current medications paragraph",
        "clinicalExamination": "Examination findings paragraph",
        "diabetesAssessment": "Detailed diabetes assessment paragraph (if applicable)",
        "hypertensionAssessment": "Detailed hypertension assessment paragraph (if applicable)",
        "obesityAssessment": "Detailed obesity assessment paragraph (if applicable)",
        "complicationsScreening": "Complications screening paragraph",
        "paraclinicalData": "Lab data paragraph",
        "overallAssessment": "Clinical synthesis paragraph",
        "therapeuticPlan": "Detailed therapeutic plan paragraph",
        "dietaryPlan": "Dietary recommendations summary paragraph",
        "selfMonitoring": "Self-monitoring instructions paragraph",
        "followUpSchedule": "Follow-up schedule paragraph",
        "warningSigns": "Warning signs paragraph",
        "patientEducation": "Education points paragraph",
        "conclusion": "Conclusion paragraph",
        "signature": "Doctor signature block"
      }
    },
    "structuredData": {
      "patient": {
        "id": "patient ID if available",
        "fullName": "name",
        "age": age,
        "gender": "gender",
        "weight": weight_kg,
        "height": height_cm,
        "bmi": calculated_bmi,
        "chronicDiseases": ["list of chronic diseases"],
        "allergies": "allergies if any",
        "currentMedications": ["list of current medications"]
      },
      "consultation": {
        "chiefComplaint": "reason for visit",
        "consultationType": "Chronic Disease Follow-Up"
      },
      "vitalSigns": {
        "bloodPressure": {
          "systolic": value,
          "diastolic": value,
          "unit": "mmHg"
        },
        "bloodGlucose": {
          "value": value,
          "unit": "g/L",
          "timing": "fasting|random"
        },
        "heartRate": value,
        "temperature": value,
        "weight": weight,
        "bmi": bmi
      },
      "diseaseAssessments": {
        "diabetes": {
          "present": true|false,
          "type": "Type 1|Type 2|Gestational",
          "controlStatus": "Excellent|Good|Fair|Poor",
          "currentHbA1c": "value or estimated",
          "targetHbA1c": "target value",
          "complications": {
            "retinopathy": "status",
            "nephropathy": "status",
            "neuropathy": "status",
            "cardiovascular": "risk level"
          },
          "summary": "brief summary"
        },
        "hypertension": {
          "present": true|false,
          "stage": "stage classification",
          "controlStatus": "Excellent|Good|Fair|Poor",
          "currentBP": "value",
          "targetBP": "target value",
          "cardiovascularRisk": "risk level",
          "organDamage": "assessment",
          "summary": "brief summary"
        },
        "obesity": {
          "present": true|false,
          "currentBMI": value,
          "category": "classification",
          "targetWeight": "target in kg",
          "comorbidities": ["list"],
          "summary": "brief summary"
        }
      },
      "therapeuticPlan": {
        "medications": {
          "continue": [
            {
              "name": "medication name",
              "dosage": "dose",
              "frequency": "frequency",
              "indication": "chronic disease"
            }
          ],
          "modify": [
            {
              "name": "medication name",
              "previousDosage": "old dose",
              "newDosage": "new dose",
              "rationale": "reason for change"
            }
          ],
          "add": [
            {
              "name": "medication name",
              "dosage": "dose",
              "frequency": "frequency",
              "indication": "reason to add",
              "monitoring": "what to monitor"
            }
          ],
          "stop": [
            {
              "name": "medication name",
              "rationale": "reason to stop"
            }
          ]
        },
        "lifestyle": {
          "dietSummary": "brief summary of dietary plan",
          "exercisePlan": "exercise recommendations",
          "smokingCessation": "recommendations if applicable",
          "alcoholModeration": "recommendations if applicable"
        }
      },
      "monitoring": {
        "laboratoryTests": [
          {
            "test": "test name",
            "indication": "why ordered",
            "timing": "when to do",
            "target": "expected range if applicable",
            "fasting": true|false
          }
        ],
        "paraclinicalExams": [
          {
            "exam": "exam name",
            "indication": "why ordered",
            "timing": "when to do",
            "urgency": "routine|urgent"
          }
        ],
        "selfMonitoring": {
          "bloodGlucose": {
            "frequency": "schedule",
            "timing": "when to measure",
            "target": "target range",
            "logbook": "instructions"
          },
          "bloodPressure": {
            "frequency": "schedule",
            "timing": "when to measure",
            "target": "target value",
            "technique": "how to measure"
          },
          "weight": {
            "frequency": "schedule",
            "timing": "when to weigh",
            "target": "target trajectory",
            "logbook": "instructions"
          }
        }
      },
      "followUp": {
        "specialistConsultations": [
          {
            "specialty": "specialist type",
            "timing": "when",
            "indication": "why",
            "urgency": "routine|urgent"
          }
        ],
        "nextGeneralConsultation": {
          "timing": "when to return",
          "reason": "for what purpose"
        },
        "warningSigns": [
          "list of signs requiring urgent consultation"
        ],
        "emergencyContacts": {
          "instructions": "when to seek immediate care"
        }
      },
      "patientEducation": [
        {
          "topic": "education topic",
          "keyPoints": ["list of key messages"],
          "materialsProvided": "educational resources given"
        }
      ],
      "prescriptions": {
        "medications": [
          {
            "name": "medication name",
            "genericName": "generic if different",
            "dosage": "dose per unit",
            "form": "tablet|capsule|injection|etc",
            "frequency": "how often",
            "timing": "when to take",
            "duration": "treatment duration",
            "quantity": "total quantity to dispense",
            "refills": number_of_refills,
            "instructions": "special instructions",
            "indication": "chronic disease being treated"
          }
        ],
        "labOrders": [
          {
            "test": "test name",
            "indication": "clinical indication",
            "fasting": true|false,
            "timing": "when to perform",
            "urgent": true|false
          }
        ],
        "paraclinicalOrders": [
          {
            "exam": "exam name",
            "indication": "clinical indication",
            "timing": "when to perform",
            "urgent": true|false
          }
        ]
      },
      "doctorInformation": {
        "fullName": "doctor full name",
        "specialty": "Endocrinology / Internal Medicine",
        "medicalCouncilNumber": "registration number",
        "signature": "signature placeholder",
        "signatureDate": "consultation date"
      }
    }
  }
}

IMPORTANT INSTRUCTIONS:
1. Write the narrative report in ENGLISH (Anglo-Saxon medical standards)
2. Use professional medical terminology but keep it understandable
3. The narrative should be DETAILED and COMPLETE (minimum 1500 words)
4. Include ALL assessment data from the diagnosis
5. Summarize the meal plans (don't list every meal, but summarize the approach)
6. Explain therapeutic decisions with rationale
7. Make it read like a REAL doctor's consultation letter
8. Use proper medical report formatting with clear paragraphs
9. The fullText field should contain the ENTIRE narrative report as one continuous text
10. Use \\n\\n to separate paragraphs in the fullText
11. Be specific with medication names, dosages, frequencies (based on diagnosis data)
12. Include precise follow-up timing (e.g., "follow-up consultation in 3 months")
13. Reference lab test frequencies (e.g., "HbA1c every 3 months")

CRITICAL: The narrative report must be comprehensive enough to serve as the OFFICIAL medical consultation report that could be printed, signed, and given to the patient or sent to referring physicians.`

    const patientContext = `
DATE OF CONSULTATION: ${reportDate.toLocaleDateString('fr-MU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
TIME: ${reportDate.toLocaleTimeString('fr-MU', { hour: '2-digit', minute: '2-digit' })}

PATIENT IDENTIFICATION:
- Full Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Date of Birth: ${patientData.birthDate || patientData.dateOfBirth || 'Not provided'}
- Address: ${patientData.address || 'Not provided'}, ${patientData.city || ''} ${patientData.country || ''}
- Phone: ${patientData.phone || 'Not provided'}
- Email: ${patientData.email || 'Not provided'}

ANTHROPOMETRIC DATA:
- Weight: ${weight} kg
- Height: ${patientData.height} cm
- BMI: ${bmi.toFixed(1)} kg/m² (${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese'})

GYNECOLOGICAL STATUS (if female):
${patientData.gender?.toLowerCase() === 'female' || patientData.gender?.toLowerCase() === 'femme' ? `
- Pregnancy Status: ${patientData.pregnancyStatus || 'Not specified'}
- Last Menstrual Period: ${patientData.lastMenstrualPeriod || 'Not specified'}
- Gestational Age: ${patientData.gestationalAge || 'Not applicable'}
` : '- Not applicable (male patient)'}

CHRONIC DISEASES HISTORY & MEDICAL BACKGROUND:
${(patientData.medicalHistory || []).map((d: string, i: number) => `${i + 1}. ${d}`).join('\n') || '- No chronic diseases declared'}
${patientData.otherMedicalHistory ? `\nAdditional Medical History: ${patientData.otherMedicalHistory}` : ''}

CURRENT MEDICATIONS:
${patientData.currentMedicationsText || patientData.currentMedications || 'None reported'}

ALLERGIES:
${Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : (patientData.allergies || 'No known allergies')}
${patientData.otherAllergies ? `\nOther Allergies: ${patientData.otherAllergies}` : ''}

LIFESTYLE HABITS:
- Smoking: ${patientData.lifeHabits?.smoking || 'Not specified'}
- Alcohol Consumption: ${patientData.lifeHabits?.alcohol || 'Not specified'}
- Physical Activity: ${patientData.lifeHabits?.physicalActivity || 'Not specified'}

CURRENT CONSULTATION DATA:

VITAL SIGNS:
- Blood Pressure: ${clinicalData.vitalSigns?.bloodPressureSystolic || 'Not measured'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || 'Not measured'} mmHg
- Blood Glucose: ${clinicalData.vitalSigns?.bloodGlucose || 'Not measured'} g/L
- Heart Rate: ${clinicalData.vitalSigns?.heartRate || 'Not measured'} bpm
- Temperature: ${clinicalData.vitalSigns?.temperature || 'Not measured'} °C

CHIEF COMPLAINT:
${clinicalData.chiefComplaint || 'Chronic disease follow-up consultation'}

MEDICAL HISTORY NOTES:
${clinicalData.medicalHistory || 'Not provided'}

PATIENT'S RESPONSES TO SPECIALIZED QUESTIONS:
${JSON.stringify(questionsData, null, 2)}

COMPREHENSIVE DIAGNOSIS DATA FROM AI SPECIALIST ASSESSMENT:
${JSON.stringify(diagnosisData, null, 2)}

DOCTOR INFORMATION:
- Full Name: ${doctorData?.fullName || 'Dr. [Name]'}
- Specialty: Endocrinology / Internal Medicine
- MCM Registration: ${doctorData?.medicalCouncilNumber || '[Registration Number]'}
- Practice: ${doctorData?.practice || 'Mauritius'}

INSTRUCTIONS FOR REPORT GENERATION:
1. Generate a COMPLETE narrative medical report in ENGLISH (Anglo-Saxon standards)
2. The report should be suitable for printing and filing in medical records
3. Include ALL assessment data from the specialist diagnosis
4. Summarize the detailed meal plans (don't list every meal individually, but describe the dietary approach)
5. Include therapeutic objectives with specific targets (HbA1c < X%, BP < X/Y, etc.)
6. Specify follow-up schedule with timing (consultations, lab tests)
7. List medications with precise dosages and frequencies
8. Explain clinical reasoning for therapeutic decisions
9. Make it professional but understandable for both medical professionals and educated patients
10. Use proper English medical terminology with Anglo-Saxon medical standards

Generate the complete narrative report now.`

    // Call OpenAI API - Using gpt-4o-mini for faster response (matching working APIs)
    console.log('🤖 Calling OpenAI API using Vercel AI SDK (like generate-consultation-report)...')
    
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
      console.error("❌ No content in AI response")
      return NextResponse.json(
        { error: "No content received from AI" },
        { status: 500 }
      )
    }
    
    console.log('✅ AI response received, length:', content.length)

    // Parse JSON response
    let reportData
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("No JSON found in response:", content)
        return NextResponse.json(
          { error: "Invalid response format from AI - no JSON found" },
          { status: 500 }
        )
      }
      reportData = JSON.parse(jsonMatch[0])
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError.message)
      console.error("Content received:", content)
      return NextResponse.json(
        { 
          error: "Failed to parse medical report",
          details: parseError.message
        },
        { status: 500 }
      )
    }

    // Validate essential fields
    if (!reportData.report || !reportData.report.narrativeReport || !reportData.report.structuredData) {
      console.error("Missing essential report fields:", reportData)
      return NextResponse.json(
        { error: "Incomplete medical report generated" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      report: reportData.report,
      documentId: documentId,
      generatedAt: reportDate.toISOString()
    })

  } catch (error: any) {
    console.error("Chronic Report API Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate chronic disease medical report",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
