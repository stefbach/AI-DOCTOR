// app/api/generate-dermatology-report/route.ts - COMPLETE MAURITIAN STRUCTURE
import { type NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ==================== HELPER FUNCTIONS ====================
function getString(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.en && typeof value.en === 'string') return value.en
    if (value.fr && typeof value.fr === 'string') return value.fr
    const firstValue = Object.values(value).find(v => typeof v === 'string')
    return firstValue ? String(firstValue) : ''
  }
  return String(value)
}

function getArray(value: any): any[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

// ==================== MAIN HANDLER ====================
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    const body = await request.json()
    const {
      patientData,
      imageData,
      ocrAnalysisData,
      questionsData,
      diagnosisData,
      doctorData
    } = body

    console.log('🔬 ===============================================')
    console.log('🔬 DERMATOLOGY REPORT GENERATION - MAURITIAN STANDARD')
    console.log('🔬 ===============================================')
    console.log(`👤 Patient: ${patientData.firstName} ${patientData.lastName}`)

    const currentDate = new Date()
    const examDate = currentDate.toISOString().split('T')[0]

    // ==================== PREPARE PHYSICIAN INFO ====================
    const physician = {
      name: `Dr. ${getString(doctorData?.fullName) || '[Name Required]'}`,
      qualifications: getString(doctorData?.qualifications) || 'MBBS, MD (Dermatology)',
      specialty: getString(doctorData?.specialty) || 'Dermatology',
      clinicAddress: getString(doctorData?.clinicAddress) || 'Tibok Teleconsultation Platform',
      email: getString(doctorData?.email) || '[Email Required]',
      consultationHours: getString(doctorData?.consultationHours) || 'Teleconsultation Hours: 8:00 AM - 8:00 PM',
      medicalCouncilNumber: getString(doctorData?.medicalCouncilNumber) || '[MCM Registration Required]'
    }

    // ==================== PREPARE PATIENT INFO ====================
    const patient = {
      name: `${getString(patientData?.firstName)} ${getString(patientData?.lastName)}`.trim(),
      fullName: `${getString(patientData?.lastName).toUpperCase()} ${getString(patientData?.firstName)}`.trim(),
      age: getString(patientData?.age),
      birthDate: getString(patientData?.birthDate),
      gender: getString(patientData?.gender),
      weight: getString(patientData?.weight),
      height: getString(patientData?.height),
      phone: getString(patientData?.phone),
      email: getString(patientData?.email),
      address: getString(patientData?.address),
      city: getString(patientData?.city),
      country: getString(patientData?.country) || 'Mauritius',
      allergies: formatAllergies(patientData),
      medicalHistory: formatMedicalHistory(patientData),
      currentMedications: getString(patientData?.currentMedicationsText) || getString(patientData?.currentMedications),
      lifeHabits: patientData?.lifeHabits || {},
      examDate: examDate
    }

    console.log('✅ Patient and physician data prepared')

    // ==================== EXTRACT DIAGNOSTIC DATA ====================
    const ocrAnalysis = ocrAnalysisData?.analysis?.fullText || ''
    const diagnosisFullText = diagnosisData?.diagnosis?.fullText || ''
    
    console.log('📊 Diagnostic data extracted:')
    console.log(`   - OCR Analysis: ${ocrAnalysis.length} chars`)
    console.log(`   - Diagnosis: ${diagnosisFullText.length} chars`)

    // ==================== GENERATE MEDICATIONS WITH AI ====================
    console.log('💊 Extracting medications from diagnosis...')
    const medications = await extractMedicationsAI(diagnosisFullText, patient)
    console.log(`   ✅ ${medications.length} medications extracted`)

    // ==================== GENERATE LAB TESTS WITH AI ====================
    console.log('🧪 Extracting laboratory tests from diagnosis...')
    const labTests = await extractLabTestsAI(diagnosisFullText, patient)
    console.log(`   ✅ ${labTests.length} lab tests extracted`)

    // ==================== GENERATE IMAGING STUDIES WITH AI ====================
    console.log('🔬 Extracting imaging studies from diagnosis...')
    const imagingStudies = await extractImagingStudiesAI(diagnosisFullText, patient)
    console.log(`   ✅ ${imagingStudies.length} imaging studies extracted`)

    // ==================== GENERATE NARRATIVE REPORT ====================
    console.log('📝 Generating narrative consultation report...')
    const narrativeReport = await generateNarrativeReportAI(
      patient,
      ocrAnalysis,
      questionsData,
      diagnosisFullText,
      imageData
    )
    console.log('   ✅ Narrative report generated')

    // ==================== BUILD COMPLETE MAURITIAN REPORT STRUCTURE ====================
    const reportStructure = {
      compteRendu: {
        header: {
          title: "DERMATOLOGY CONSULTATION REPORT",
          subtitle: "Professional Medical Documentation - Dermatology",
          reference: `DERM-${Date.now()}`,
          consultationType: "Dermatology - Teleconsultation with Image Analysis"
        },
        praticien: {
          nom: physician.name,
          qualifications: physician.qualifications,
          specialite: physician.specialty,
          adresseCabinet: physician.clinicAddress,
          email: physician.email,
          heuresConsultation: physician.consultationHours,
          numeroEnregistrement: physician.medicalCouncilNumber
        },
        patient: {
          nom: patient.name,
          nomComplet: patient.fullName,
          age: patient.age,
          dateNaissance: patient.birthDate,
          sexe: patient.gender,
          adresse: patient.address,
          telephone: patient.phone,
          email: patient.email,
          poids: patient.weight,
          taille: patient.height,
          dateExamen: patient.examDate,
          allergies: patient.allergies,
          antecedentsMedicaux: patient.medicalHistory,
          medicamentsActuels: patient.currentMedications
        },
        rapport: {
          motifConsultation: narrativeReport.chiefComplaint || 'Dermatological consultation with image analysis',
          anamnese: narrativeReport.historyPresentIllness || '',
          antecedents: narrativeReport.pastMedicalHistory || patient.medicalHistory,
          examenClinique: narrativeReport.examinationFindings || ocrAnalysis,
          syntheseDiagnostique: narrativeReport.diagnosis || '',
          conclusionDiagnostique: narrativeReport.diagnosis || '',
          diagnosticsDifferentiels: narrativeReport.differentialDiagnosis || '',
          priseEnCharge: narrativeReport.treatmentPlan || '',
          educationPatient: narrativeReport.patientEducation || '',
          surveillance: narrativeReport.followUp || '',
          conclusion: narrativeReport.conclusion || 'Complete dermatological consultation with image analysis and therapeutic recommendations.'
        },
        imageAnalysis: {
          summary: ocrAnalysisData?.summary || '',
          fullAnalysis: ocrAnalysis,
          observations: ocrAnalysisData?.observations || [],
          imagesCount: imageData?.images?.length || 0
        },
        metadata: {
          dateGeneration: currentDate.toISOString(),
          wordCount: JSON.stringify(narrativeReport).split(/\s+/).length,
          validationStatus: 'dermatology_professional_mauritian_v1.0',
          dataSource: 'ai_dermatology_specialist_gpt4o',
          imagesAnalyzed: imageData?.images?.length || 0
        }
      },

      // ===== PRESCRIPTIONS - MEDICATIONS =====
      ordonnances: {
        medicaments: medications.length > 0 ? {
          header: physician,
          patient: patient,
          prescription: {
            prescriptionDate: examDate,
            medications: medications.map((med, idx) => ({
              number: idx + 1,
              name: med.nom || med.name,
              genericName: med.denominationCommune || med.genericName || med.name,
              dosage: med.dosage,
              form: med.forme || med.form || 'cream',
              frequency: med.posologie || med.frequency,
              route: med.modeAdministration || med.route || 'Topical route',
              duration: med.dureeTraitement || med.duration,
              quantity: med.quantite || med.quantity,
              instructions: med.instructions,
              indication: med.indication || 'As per dermatological diagnosis',
              doNotSubstitute: med.nonSubstituable || false,
              fullDescription: `${med.nom} ${med.dosage} - ${med.posologie}`
            })),
            validity: "3 months unless otherwise specified",
            dispensationNote: "For pharmaceutical use only - Dermatological prescription"
          },
          authentication: {
            signature: "Medical Practitioner's Signature",
            physicianName: physician.name.toUpperCase(),
            registrationNumber: physician.medicalCouncilNumber,
            officialStamp: "Official Medical Stamp",
            date: examDate
          }
        } : null,

        // ===== LABORATORY TESTS =====
        biologie: labTests.length > 0 ? {
          header: physician,
          patient: patient,
          prescription: {
            prescriptionDate: examDate,
            clinicalIndication: "Dermatological investigation as per consultation findings",
            analyses: {
              hematology: labTests.filter(t => t.categorie === 'hematology' || t.category === 'hematology').map(t => ({
                name: t.nom || t.name,
                category: 'hematology',
                urgent: t.urgence || t.urgent || false,
                fasting: t.aJeun || t.fasting || false,
                sampleConditions: t.conditionsPrelevement || t.sampleConditions || '',
                clinicalIndication: t.motifClinique || t.clinicalIndication || '',
                sampleTube: t.tubePrelevement || t.sampleTube || 'As per laboratory protocol',
                turnaroundTime: t.delaiResultat || t.turnaroundTime || 'Standard (24-48h)'
              })),
              clinicalChemistry: labTests.filter(t => t.categorie === 'clinicalChemistry' || t.category === 'clinicalChemistry').map(t => ({
                name: t.nom || t.name,
                category: 'clinicalChemistry',
                urgent: t.urgence || t.urgent || false,
                fasting: t.aJeun || t.fasting || false,
                sampleConditions: t.conditionsPrelevement || t.sampleConditions || '',
                clinicalIndication: t.motifClinique || t.clinicalIndication || '',
                sampleTube: t.tubePrelevement || t.sampleTube || 'As per laboratory protocol',
                turnaroundTime: t.delaiResultat || t.turnaroundTime || 'Standard (24-48h)'
              })),
              immunology: labTests.filter(t => t.categorie === 'immunology' || t.category === 'immunology').map(t => ({
                name: t.nom || t.name,
                category: 'immunology',
                urgent: t.urgence || t.urgent || false,
                fasting: t.aJeun || t.fasting || false,
                sampleConditions: t.conditionsPrelevement || t.sampleConditions || '',
                clinicalIndication: t.motifClinique || t.clinicalIndication || '',
                sampleTube: t.tubePrelevement || t.sampleTube || 'As per laboratory protocol',
                turnaroundTime: t.delaiResultat || t.turnaroundTime || 'Standard (24-48h)'
              })),
              microbiology: labTests.filter(t => t.categorie === 'microbiology' || t.category === 'microbiology').map(t => ({
                name: t.nom || t.name,
                category: 'microbiology',
                urgent: t.urgence || t.urgent || false,
                fasting: t.aJeun || t.fasting || false,
                sampleConditions: t.conditionsPrelevement || t.sampleConditions || '',
                clinicalIndication: t.motifClinique || t.clinicalIndication || '',
                sampleTube: t.tubePrelevement || t.sampleTube || 'As per laboratory protocol',
                turnaroundTime: t.delaiResultat || t.turnaroundTime || 'Standard (24-48h)'
              })),
              other: labTests.filter(t => !['hematology', 'clinicalChemistry', 'immunology', 'microbiology'].includes(t.categorie || t.category)).map(t => ({
                name: t.nom || t.name,
                category: t.categorie || t.category || 'other',
                urgent: t.urgence || t.urgent || false,
                fasting: t.aJeun || t.fasting || false,
                sampleConditions: t.conditionsPrelevement || t.sampleConditions || '',
                clinicalIndication: t.motifClinique || t.clinicalIndication || '',
                sampleTube: t.tubePrelevement || t.sampleTube || 'As per laboratory protocol',
                turnaroundTime: t.delaiResultat || t.turnaroundTime || 'Standard (24-48h)'
              }))
            },
            specialInstructions: ["Inform laboratory staff about dermatological context", "Handle samples according to standard protocols"],
            recommendedLaboratory: ""
          },
          authentication: {
            signature: "Medical Practitioner's Signature",
            physicianName: physician.name.toUpperCase(),
            registrationNumber: physician.medicalCouncilNumber,
            date: examDate
          }
        } : null,

        // ===== IMAGING STUDIES =====
        imagerie: imagingStudies.length > 0 ? {
          header: physician,
          patient: patient,
          prescription: {
            prescriptionDate: examDate,
            examinations: imagingStudies.map((exam, idx) => ({
              number: idx + 1,
              type: exam.type,
              modalite: exam.modalite || exam.type,
              region: exam.region,
              clinicalIndication: exam.indicationClinique || exam.clinicalIndication,
              urgence: exam.urgence || exam.urgent || false,
              contrast: exam.contraste || exam.contrast || false,
              specificProtocol: exam.protocoleSpecifique || exam.specificProtocol || '',
              diagnosticQuestion: exam.questionDiagnostique || exam.diagnosticQuestion || ''
            })),
            clinicalInformation: "Dermatological evaluation - detailed findings in consultation report",
            imagingCenter: ""
          },
          authentication: {
            signature: "Medical Practitioner's Signature",
            physicianName: physician.name.toUpperCase(),
            registrationNumber: physician.medicalCouncilNumber,
            date: examDate
          }
        } : null
      },

      // ===== INVOICE =====
      invoice: {
        header: {
          invoiceNumber: `TIBOK-DERM-${currentDate.getFullYear()}-${String(Date.now()).slice(-6)}`,
          consultationDate: examDate,
          invoiceDate: examDate
        },
        provider: {
          companyName: "Digital Data Solutions Ltd",
          tradeName: "Tibok",
          registrationNumber: "C20173522",
          address: "Cybercity, Ebene, Mauritius",
          phone: "+230 5xxx xxxx",
          email: "contact@tibok.mu",
          website: "www.tibok.mu"
        },
        billTo: {
          name: patient.fullName,
          address: `${patient.address}, ${patient.city}, ${patient.country}`,
          phone: patient.phone,
          email: patient.email
        },
        services: {
          items: [{
            description: "Online dermatology consultation with image analysis via Tibok",
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
          "This invoice corresponds to a remote dermatology consultation with image analysis performed via the Tibok platform.",
          "The service was delivered by a registered medical professional specialized in dermatology.",
          "All images and data are securely hosted on a health data certified server (OVH – HDS compliant).",
          "Service available from 08:00 to 00:00 (Mauritius time), 7 days a week.",
          "Medication delivery included during daytime, with possible extra charges after 17:00."
        ],
        signature: {
          entity: "Digital Data Solutions Ltd",
          onBehalfOf: physician.name,
          title: "Registered Medical Practitioner - Dermatology Specialist (Mauritius)"
        }
      }
    }

    const endTime = Date.now()
    const processingTime = endTime - startTime

    console.log("\n✅ COMPLETE DERMATOLOGY REPORT GENERATED")
    console.log("📊 Final summary:")
    console.log(`   - Medications: ${medications.length}`)
    console.log(`   - Lab tests: ${labTests.length}`)
    console.log(`   - Imaging: ${imagingStudies.length}`)
    console.log(`   - Images analyzed: ${imageData?.images?.length || 0}`)
    console.log(`   - Processing time: ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      report: reportStructure,
      metadata: {
        type: "complete_dermatology_report_mauritian_v1.0",
        dataSource: "ai_dermatology_specialist_gpt4o",
        generatedAt: currentDate.toISOString(),
        processingTimeMs: processingTime,
        prescriptionsSummary: {
          medicaments: medications.length,
          biologie: labTests.length,
          imagerie: imagingStudies.length
        },
        imagesAnalyzed: imageData?.images?.length || 0,
        version: "1.0"
      }
    })

  } catch (error) {
    console.error("❌ API Error:", error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    )
  }
}

// ==================== AI EXTRACTION FUNCTIONS ====================

async function extractMedicationsAI(diagnosisText: string, patient: any): Promise<any[]> {
  try {
    const prompt = `Extract ALL medications from this dermatology diagnosis. Return ONLY a JSON array.

DIAGNOSIS:
${diagnosisText}

Return format:
[
  {
    "nom": "Hydrocortisone Cream",
    "denominationCommune": "Hydrocortisone",
    "dosage": "1%",
    "forme": "cream",
    "posologie": "Apply twice daily",
    "modeAdministration": "Topical route",
    "dureeTraitement": "14 days",
    "quantite": "1 tube (30g)",
    "instructions": "Apply to affected areas only"
  }
]

If no medications: return []`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract medications as JSON array only. No explanations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
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

async function extractLabTestsAI(diagnosisText: string, patient: any): Promise<any[]> {
  try {
    const prompt = `Extract ALL laboratory tests from RECOMMENDED INVESTIGATIONS. Return ONLY a JSON array.

DIAGNOSIS:
${diagnosisText}

Return format:
[
  {
    "nom": "Complete Blood Count",
    "categorie": "hematology",
    "urgence": false,
    "aJeun": false,
    "motifClinique": "Rule out infection"
  }
]

Categories: hematology, clinicalChemistry, immunology, microbiology, other
If no tests: return []`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract lab tests as JSON array only. No explanations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
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

async function extractImagingStudiesAI(diagnosisText: string, patient: any): Promise<any[]> {
  try {
    const prompt = `Extract ALL imaging studies from RECOMMENDED INVESTIGATIONS. Return ONLY a JSON array.

DIAGNOSIS:
${diagnosisText}

Return format:
[
  {
    "type": "Ultrasound",
    "region": "Soft tissue",
    "indicationClinique": "Assess lesion depth",
    "urgence": false
  }
]

Types: X-Ray, CT Scan, MRI, Ultrasound
If no imaging: return []`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract imaging as JSON array only. No explanations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const text = (completion.choices[0].message.content || '[]').trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (error) {
    console.error('Error extracting imaging:', error)
    return []
  }
}

async function generateNarrativeReportAI(
  patient: any,
  ocrAnalysis: string,
  questionsData: any,
  diagnosis: string,
  imageData: any
): Promise<any> {
  try {
    const prompt = `Generate a professional dermatology consultation report in ENGLISH with these sections as separate fields:

PATIENT: ${patient.name}, ${patient.age} years, ${patient.gender}
ALLERGIES: ${patient.allergies}
MEDICAL HISTORY: ${patient.medicalHistory}
CURRENT MEDICATIONS: ${patient.currentMedications}

IMAGE ANALYSIS:
${ocrAnalysis}

DIAGNOSIS:
${diagnosis}

Return JSON with these EXACT keys (ALL CONTENT IN ENGLISH):
{
  "chiefComplaint": "Chief complaint / reason for consultation",
  "historyPresentIllness": "History of present illness",
  "pastMedicalHistory": "Past medical history",
  "examinationFindings": "Examination findings with image analysis",
  "diagnosis": "Primary diagnosis",
  "differentialDiagnosis": "Differential diagnoses",
  "treatmentPlan": "Treatment plan",
  "patientEducation": "Patient education",
  "followUp": "Follow-up plan",
  "conclusion": "Conclusion"
}

IMPORTANT: Write ALL content in professional ENGLISH medical style. Do NOT use French.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a dermatology specialist. Generate professional ENGLISH medical report as JSON only. ALL content must be in ENGLISH." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    })

    const text = completion.choices[0].message.content || '{}'
    return JSON.parse(text)
  } catch (error) {
    console.error('Error generating narrative:', error)
    return {
      chiefComplaint: "Dermatological consultation with image analysis",
      historyPresentIllness: "Pending",
      pastMedicalHistory: patient.medicalHistory,
      examinationFindings: ocrAnalysis,
      diagnosis: diagnosis.substring(0, 500),
      differentialDiagnosis: "",
      treatmentPlan: "See prescription",
      patientEducation: "",
      followUp: "Follow-up in 2-4 weeks",
      conclusion: "Complete consultation"
    }
  }
}

// ==================== HELPER FORMATTING FUNCTIONS ====================
function formatMedicalHistory(patient: any): string {
  const history = [...getArray(patient.medicalHistory)]
  if (patient.otherMedicalHistory) {
    history.push(patient.otherMedicalHistory)
  }
  return history.length > 0 ? history.join(', ') : 'No significant medical history'
}

function formatAllergies(patient: any): string {
  const allergies = [...getArray(patient.allergies)]
  if (patient.otherAllergies) {
    allergies.push(patient.otherAllergies)
  }
  return allergies.length > 0 ? allergies.join(', ') : 'No known allergies'
}
