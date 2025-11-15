// app/api/chronic-report/route.ts - PROFESSIONAL Chronic Disease Report with Structured Prescriptions
// Generates narrative report + PROFESSIONAL ordonnances/biologie/paraclinique (NO EMOJIS, NO COLORS)
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import OpenAI from "openai"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

// ==================== PROFESSIONAL PRESCRIPTION EXTRACTION ====================
// Extract medications in PROFESSIONAL format (like generate-consultation-report)

async function extractMedicationsProfessional(diagnosisData: any, patientData: any): Promise<any[]> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    const prompt = `Extract ALL medications from chronic disease management data with COMPLETE professional details.

DIAGNOSIS DATA:
${JSON.stringify(diagnosisData, null, 2)}

PATIENT INFO:
- Chronic diseases: ${(patientData.medicalHistory || []).join(', ')}
- Current medications: ${patientData.currentMedicationsText || patientData.currentMedications || 'None'}
- Allergies: ${patientData.allergies || 'None'}

Return format (professional prescription - NO EMOJIS):
[
  {
    "name": "Metformin Hydrochloride",
    "genericName": "Metformin",
    "dosage": "850mg",
    "form": "Tablet",
    "frequency": "1 tablet twice daily with meals",
    "route": "Oral route",
    "duration": "3 months (renewable)",
    "quantity": "180 tablets",
    "instructions": "Take with food to reduce gastrointestinal side effects. Swallow whole, do not crush.",
    "indication": "Type 2 Diabetes Mellitus - glycemic control",
    "monitoring": "Monitor kidney function (eGFR) every 6 months. Discontinue if eGFR <30 ml/min.",
    "doNotSubstitute": false,
    "pharmacologicalClass": "Biguanide antidiabetic",
    "contraindications": "Severe renal impairment, acute metabolic acidosis",
    "sideEffects": "Gastrointestinal upset, lactic acidosis (rare), vitamin B12 deficiency with long-term use",
    "precautions": "Hold before contrast procedures. Monitor for lactic acidosis signs.",
    "interactions": "Caution with alcohol, iodinated contrast agents",
    "pregnancyCategory": "Category B",
    "storageConditions": "Store at room temperature, protect from moisture"
  }
]

CRITICAL: Return ONLY the JSON array. Use ANGLO-SAXON medical nomenclature in ENGLISH. NO EMOJIS.`

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a clinical pharmacist extracting medication prescriptions. Use professional medical terminology in ENGLISH. NO EMOJIS. Include all safety information." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })

    const text = (completion.choices[0].message.content || '[]').trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (error) {
    console.error('Error extracting medications:', error)
    return []
  }
}

async function extractLabTestsProfessional(diagnosisData: any, patientData: any): Promise<any[]> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    const prompt = `Extract ALL laboratory tests for chronic disease monitoring with COMPLETE details.

DIAGNOSIS DATA:
${JSON.stringify(diagnosisData, null, 2)}

PATIENT INFO:
- Chronic diseases: ${(patientData.medicalHistory || []).join(', ')}
- Age: ${patientData.age}

Return format (professional lab request - NO EMOJIS):
[
  {
    "name": "Glycated Hemoglobin (HbA1c)",
    "category": "clinicalChemistry",
    "urgency": false,
    "fasting": false,
    "clinicalIndication": "Diabetes monitoring - assessment of 3-month average glycemic control",
    "expectedValues": "Target <7% for most adults with diabetes, <6.5% if achievable without hypoglycemia",
    "clinicalSignificance": "HbA1c reflects average plasma glucose over previous 8-12 weeks. Elevated values indicate suboptimal glycemic control.",
    "sampleType": "Venous blood - EDTA tube (purple top)",
    "sampleVolume": "2-3 mL whole blood",
    "handlingInstructions": "No special handling required. Stable at room temperature for 24 hours.",
    "laboratoryInstructions": "HPLC or immunoassay method. Report with reference range.",
    "timing": "Every 3 months for uncontrolled diabetes, every 6 months when at target",
    "costEstimate": "MUR 800-1200"
  }
]

Categories: hematology, clinicalChemistry, immunology, microbiology, endocrinology

CRITICAL: Return ONLY the JSON array. Use ANGLO-SAXON nomenclature. NO EMOJIS.`

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a clinical pathologist ordering laboratory investigations. Professional medical terminology in ENGLISH. NO EMOJIS." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })

    const text = (completion.choices[0].message.content || '[]').trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (error) {
    console.error('Error extracting lab tests:', error)
    return []
  }
}

async function extractImagingStudiesProfessional(diagnosisData: any, patientData: any): Promise<any[]> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    const prompt = `Extract ALL imaging studies for chronic disease complications screening with COMPLETE details.

DIAGNOSIS DATA:
${JSON.stringify(diagnosisData, null, 2)}

PATIENT INFO:
- Chronic diseases: ${(patientData.medicalHistory || []).join(', ')}
- Age: ${patientData.age}

Return format (professional imaging request - NO EMOJIS):
[
  {
    "type": "Doppler Ultrasound - Lower Limb Arteries",
    "modality": "Ultrasound Doppler",
    "region": "Bilateral lower extremities - femoral to tibial arteries",
    "clinicalIndication": "Diabetes with peripheral neuropathy - screening for peripheral arterial disease",
    "urgency": false,
    "contrast": false,
    "specificProtocol": "Color Doppler and spectral waveform analysis. Include ankle-brachial index (ABI) calculation.",
    "diagnosticQuestion": "Evidence of arterial stenosis or occlusion? Assess perfusion adequacy.",
    "technicalRequirements": "High-resolution linear transducer with Doppler capability",
    "patientPosition": "Supine with leg slightly externally rotated",
    "expectedDuration": "30-45 minutes for bilateral examination",
    "reportingSpecialist": "Radiologist or vascular sonographer",
    "costEstimate": "MUR 2500-4000",
    "preparationInstructions": "No special preparation required",
    "clinicalCorrelation": "Correlate with pedal pulses, capillary refill, and diabetic foot examination"
  }
]

CRITICAL: Return ONLY the JSON array. Professional terminology. NO EMOJIS.`

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a radiologist ordering imaging studies. Professional medical terminology in ENGLISH. NO EMOJIS." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2500
    })

    const text = (completion.choices[0].message.content || '[]').trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (error) {
    console.error('Error extracting imaging studies:', error)
    return []
  }
}

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

    // Call OpenAI API - Using gpt-4o for PROFESSIONAL-QUALITY narrative reports
    // gpt-4o is required for complex, detailed medical narratives (1500+ words)
    console.log('🤖 Calling OpenAI API using Vercel AI SDK with gpt-4o for professional quality...')
    
    const result = await generateText({
      model: openai("gpt-4o"),  // ✅ UPGRADED to gpt-4o for superior narrative quality
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: patientContext }
      ],
      maxTokens: 4000,  // ✅ INCREASED token limit for longer, more detailed reports
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
    
    console.log('Extracting PROFESSIONAL prescriptions (medications, lab tests, imaging)...')
    
    // ===== EXTRACT PROFESSIONAL PRESCRIPTIONS =====
    const [medications, labTests, imagingStudies] = await Promise.all([
      extractMedicationsProfessional(diagnosisData, patientData),
      extractLabTestsProfessional(diagnosisData, patientData),
      extractImagingStudiesProfessional(diagnosisData, patientData)
    ])
    
    console.log(`Extracted: ${medications.length} medications, ${labTests.length} lab tests, ${imagingStudies.length} imaging studies`)
    
    // ===== BUILD PROFESSIONAL PRESCRIPTIONS (NO EMOJIS) =====
    const examDate = reportDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
    
    const physician = {
      name: doctorData?.fullName ? `Dr. ${doctorData.fullName}` : "Dr. [PHYSICIAN NAME]",
      qualifications: doctorData?.qualifications || "MBBS",
      specialty: "Endocrinology / Internal Medicine",
      practiceAddress: doctorData?.practiceAddress || doctorData?.clinicAddress || "Tibok Teleconsultation Platform",
      email: doctorData?.email || "[Professional email]",
      consultationHours: doctorData?.consultationHours || "Consultation Hours: 8:00 AM - 8:00 PM",
      medicalCouncilNumber: doctorData?.medicalCouncilNumber || "[MCM Registration Required]"
    }
    
    const patient = {
      fullName: `${patientData.firstName} ${patientData.lastName}`,
      age: `${patientData.age} years`,
      gender: patientData.gender,
      address: `${patientData.address || ''}, ${patientData.city || ''}, ${patientData.country || ''}`,
      phone: patientData.phone || '',
      email: patientData.email || ''
    }
    
    // Build professional prescriptions structure
    const professionalPrescriptions: any = {}
    
    // MEDICATIONS PRESCRIPTION (if any)
    if (medications.length > 0) {
      professionalPrescriptions.medications = {
        header: physician,
        patient: patient,
        prescription: {
          prescriptionDate: examDate,
          medications: medications.map((med, idx) => ({
            number: idx + 1,
            name: med.name,
            genericName: med.genericName || med.name,
            dosage: med.dosage,
            form: med.form || 'Tablet',
            frequency: med.frequency,
            route: med.route,
            duration: med.duration,
            quantity: med.quantity,
            instructions: med.instructions,
            indication: med.indication,
            monitoring: med.monitoring,
            doNotSubstitute: med.doNotSubstitute || false,
            pharmacologicalClass: med.pharmacologicalClass,
            contraindications: med.contraindications,
            sideEffects: med.sideEffects,
            precautions: med.precautions,
            storageConditions: med.storageConditions
          })),
          validity: "3 months unless otherwise specified",
          dispensationNote: "For pharmaceutical use only - Chronic disease management"
        },
        authentication: {
          signature: "Medical Practitioner's Signature",
          physicianName: physician.name.toUpperCase(),
          registrationNumber: physician.medicalCouncilNumber,
          officialStamp: "Official Medical Stamp",
          date: examDate
        }
      }
    }
    
    // LABORATORY TESTS (if any)
    if (labTests.length > 0) {
      // Categorize tests
      const categorizedTests: any = {
        hematology: labTests.filter(t => t.category === 'hematology'),
        clinicalChemistry: labTests.filter(t => t.category === 'clinicalChemistry'),
        endocrinology: labTests.filter(t => t.category === 'endocrinology'),
        immunology: labTests.filter(t => t.category === 'immunology'),
        microbiology: labTests.filter(t => t.category === 'microbiology')
      }
      
      const analyses: any = {}
      Object.keys(categorizedTests).forEach(category => {
        if (categorizedTests[category].length > 0) {
          analyses[category] = categorizedTests[category].map((test: any) => ({
            name: test.name,
            urgency: test.urgency,
            fasting: test.fasting,
            clinicalIndication: test.clinicalIndication,
            expectedValues: test.expectedValues,
            sampleType: test.sampleType,
            timing: test.timing
          }))
        }
      })
      
      professionalPrescriptions.laboratoryTests = {
        header: physician,
        patient: patient,
        prescription: {
          prescriptionDate: examDate,
          clinicalIndication: "Chronic disease monitoring and complications screening",
          analyses: analyses,
          specialInstructions: labTests.some(t => t.fasting) ? ["Some tests require fasting - please verify individual requirements"] : [],
          recommendedLaboratory: "Accredited medical laboratory"
        },
        authentication: {
          signature: "Medical Practitioner's Signature",
          physicianName: physician.name.toUpperCase(),
          registrationNumber: physician.medicalCouncilNumber,
          date: examDate
        }
      }
    }
    
    // IMAGING STUDIES (if any)
    if (imagingStudies.length > 0) {
      professionalPrescriptions.imagingStudies = {
        header: physician,
        patient: patient,
        prescription: {
          prescriptionDate: examDate,
          examinations: imagingStudies.map((study: any) => ({
            type: study.type,
            modality: study.modality,
            region: study.region,
            clinicalIndication: study.clinicalIndication,
            urgency: study.urgency,
            contrast: study.contrast,
            specificProtocol: study.specificProtocol,
            diagnosticQuestion: study.diagnosticQuestion
          })),
          clinicalContext: "Chronic disease complications screening and management",
          recommendedCenter: "Accredited imaging center with experienced radiologists"
        },
        authentication: {
          signature: "Medical Practitioner's Signature",
          physicianName: physician.name.toUpperCase(),
          registrationNumber: physician.medicalCouncilNumber,
          date: examDate
        }
      }
    }
    
    // ===== INVOICE (Professional format) =====
    const invoice = {
      header: {
        invoiceNumber: `CHR-INV-${reportDate.getFullYear()}-${String(Date.now()).slice(-6)}`,
        consultationDate: examDate,
        invoiceDate: examDate
      },
      provider: {
        companyName: "Digital Data Solutions Ltd",
        tradeName: "Tibok",
        registrationNumber: "C20173522",
        vatNumber: "27816949",
        registeredOffice: "Bourdet Road, Grand Baie, Mauritius",
        phone: "+230 4687377/78",
        email: "contact@tibok.mu",
        website: "www.tibok.mu"
      },
      patient: {
        name: patient.fullName,
        email: patient.email,
        phone: patient.phone,
        patientId: documentId
      },
      services: {
        items: [{
          description: "Online chronic disease follow-up consultation with comprehensive report generation via Tibok",
          quantity: 1,
          unitPrice: 1500,
          total: 1500
        }],
        subtotal: 1500,
        vatRate: 0.15,
        vatAmount: 0,
        totalDue: 1500
      },
      payment: {
        method: "[Credit Card / MCB Juice / MyT Money / Other]",
        receivedDate: examDate,
        status: "pending" as const
      },
      physician: {
        name: physician.name,
        registrationNumber: physician.medicalCouncilNumber
      },
      notes: [
        "This invoice corresponds to a remote chronic disease follow-up consultation performed via the Tibok platform.",
        "The service was delivered by a registered medical professional specialized in endocrinology/internal medicine.",
        "No audio or video recording was made. All data securely hosted on health data certified server (OVH - HDS compliant).",
        "Service available from 08:00 to 00:00 (Mauritius time), 7 days a week.",
        "Medication delivery included during daytime, with possible extra charges after 17:00 depending on pharmacy availability."
      ],
      signature: {
        entity: "Digital Data Solutions Ltd",
        onBehalfOf: physician.name,
        title: "Registered Medical Practitioner - Endocrinology/Internal Medicine (Mauritius)"
      }
    }
    
    // ===== COMBINE EVERYTHING =====
    const completeReport = {
      ...reportData.report,
      prescriptions: professionalPrescriptions,
      invoice: invoice,
      metadata: {
        documentId: documentId,
        generatedAt: reportDate.toISOString(),
        type: "comprehensive_chronic_disease_report",
        version: "2.0_professional",
        includedSections: {
          narrativeReport: true,
          structuredData: true,
          medications: medications.length > 0,
          laboratoryTests: labTests.length > 0,
          imagingStudies: imagingStudies.length > 0,
          invoice: true
        }
      }
    }
    
    console.log('Professional chronic disease report generated successfully')
    console.log(`- Narrative report: ${reportData.report.narrativeReport.fullText.length} characters`)
    console.log(`- Medications: ${medications.length}`)
    console.log(`- Lab tests: ${labTests.length}`)
    console.log(`- Imaging studies: ${imagingStudies.length}`)
    
    return NextResponse.json({
      success: true,
      report: completeReport,
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
