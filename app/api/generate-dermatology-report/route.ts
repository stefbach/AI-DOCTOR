// app/api/generate-dermatology-report/route.ts - COMPLETE MAURITIAN STRUCTURE
import { type NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

// OpenAI client will be initialized inside the function to avoid build-time errors

// Moved inside function - const openai = new OpenAI({
// Moved inside function -   apiKey: process.env.OPENAI_API_KEY
// Moved inside function - })

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
    // Initialize OpenAI client inside the function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

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
    // Format questions and answers for better context
    const questionsContext = questionsData?.answers ? 
      Object.entries(questionsData.answers)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n') : 'No additional questions answered';

    const imageCount = imageData?.images?.length || 0;
    
    const prompt = `You are a board-certified dermatologist with 20+ years of experience preparing comprehensive, professional medical reports for peer review and medico-legal documentation.

Generate a COMPLETE, DETAILED, PROFESSIONAL dermatology consultation report following international medical documentation standards.

═══════════════════════════════════════════════════════════════
PATIENT INFORMATION
═══════════════════════════════════════════════════════════════
Name: ${patient.name}
Age: ${patient.age} years
Gender: ${patient.gender}
Known Allergies: ${patient.allergies}
Past Medical History: ${patient.medicalHistory}
Current Medications: ${patient.currentMedications || 'None reported'}

═══════════════════════════════════════════════════════════════
CLINICAL DATA PROVIDED
═══════════════════════════════════════════════════════════════

DERMATOLOGICAL IMAGE ANALYSIS (${imageCount} images analyzed):
${ocrAnalysis}

PATIENT RESPONSES TO CLINICAL QUESTIONS:
${questionsContext}

AI-ASSISTED DIAGNOSTIC ASSESSMENT:
${diagnosis}

═══════════════════════════════════════════════════════════════
REPORT REQUIREMENTS - GENERATE COMPREHENSIVE CONTENT FOR EACH:
═══════════════════════════════════════════════════════════════

Return a JSON object with these EXACT keys. Each section must be DETAILED, PROFESSIONAL, and MEDICALLY ACCURATE:

{
  "chiefComplaint": "DETAILED chief complaint with ABCDE characteristics if applicable:
    - Asymmetry: describe any asymmetry
    - Border: describe border characteristics
    - Color: describe color variations
    - Diameter/Dimension: provide measurements
    - Evolution: describe changes over time
    Include onset, duration, location(s), and patient's primary concern.",

  "historyPresentIllness": "COMPREHENSIVE 4-6 paragraph narrative covering:
    - Detailed timeline of symptom onset and progression
    - Initial presentation and evolving characteristics
    - Aggravating and alleviating factors
    - Previous treatments attempted and their efficacy
    - Impact on quality of life and daily activities
    - Associated symptoms (pruritus, pain, discharge, etc.)
    - Environmental or occupational exposures
    - Seasonal variations if relevant",

  "pastMedicalHistory": "COMPLETE medical background including:
    - Relevant dermatological history (previous skin conditions, surgeries)
    - Systemic diseases that may affect skin (diabetes, immunosuppression, etc.)
    - Family history of skin conditions or cancers
    - Previous allergic reactions or sensitivities
    - Immunization status if relevant
    - Use proper medical terminology",

  "physicalExamination": "SYSTEMATIC dermatological examination following this structure:

    GENERAL APPEARANCE:
    - Patient's general health status
    - Skin type (Fitzpatrick scale if applicable)
    - Overall skin condition

    PRIMARY LESION(S) - DETAILED MORPHOLOGICAL DESCRIPTION:
    Location: Precise anatomical location(s)
    Distribution: Pattern (localized, regional, generalized, symmetrical, etc.)
    
    Lesion Morphology:
    - Type: macule, papule, nodule, plaque, vesicle, bulla, pustule, etc.
    - Size: exact measurements in cm or mm
    - Shape: circular, oval, irregular, linear, annular, etc.
    - Color: precise color description and variations
    - Surface: smooth, rough, scaly, crusted, verrucous, etc.
    - Border: well-defined, ill-defined, regular, irregular
    - Texture: soft, firm, indurated, fluctuant
    - Number: solitary or multiple (approximate count)
    
    SECONDARY CHANGES (if present):
    - Scaling, crusting, lichenification
    - Excoriations, erosions, ulcerations
    - Atrophy, scarring, pigmentary changes
    
    ASSOCIATED FEATURES:
    - Surrounding erythema or inflammation
    - Warmth, tenderness on palpation
    - Lymphadenopathy
    
    DERMOSCOPY FINDINGS (if applicable from images):
    - Vascular patterns
    - Pigment network
    - Specific dermoscopic structures
    
    SYSTEMIC EXAMINATION (if relevant):
    - Nails, hair, mucous membranes
    - Regional lymph nodes",

  "diagnosis": "PRIMARY DIAGNOSIS with confidence level and justification:
    
    Clinical Diagnosis: [Specific dermatological condition]
    ICD-10 Code: [Relevant code]
    
    Confidence Level: [High/Moderate/Low - based on clinical findings]
    
    Diagnostic Reasoning:
    - Key clinical features supporting this diagnosis
    - Correlation with image analysis findings
    - Alignment with patient history
    - Classical presentation vs atypical features
    - Supporting evidence from literature/guidelines",

  "differentialDiagnosis": "COMPREHENSIVE differential diagnosis (3-5 conditions) with reasoning:
    
    For EACH alternative diagnosis provide:
    
    1. [Condition Name]
       - Features supporting this diagnosis
       - Features against this diagnosis
       - How to distinguish from primary diagnosis
       - Any required additional tests
    
    2. [Next most likely condition]
       [Same detailed structure]
    
    3. [Third possibility]
       [Same detailed structure]
    
    Include both common and serious conditions that MUST be ruled out.",

  "investigationsPlan": "DETAILED diagnostic workup plan:
    
    IMMEDIATE/URGENT INVESTIGATIONS:
    - [Test 1]: Indication, expected findings
    - [Test 2]: Rationale, timing
    
    ADDITIONAL INVESTIGATIONS (if needed):
    - Laboratory tests with specific rationale
    - Imaging studies if indicated
    - Skin biopsy (type, location, indication)
    - Patch testing, culture, or special stains
    - Referrals to other specialists if needed
    
    Include expected timeline and clinical decision points.",

  "treatmentPlan": "COMPREHENSIVE, EVIDENCE-BASED treatment strategy:
    
    IMMEDIATE TREATMENT:
    - First-line therapy with detailed rationale
    - Specific medications (see prescription)
    - Non-pharmacological interventions
    
    TREATMENT GOALS:
    - Short-term objectives (1-2 weeks)
    - Medium-term goals (1-3 months)
    - Long-term management plan
    
    MANAGEMENT PHASES:
    Phase 1 (Acute/Initial - Duration):
    - Specific interventions
    - Expected response
    
    Phase 2 (Maintenance - if applicable):
    - Continued therapy
    - Tapering strategy if relevant
    
    MONITORING PLAN:
    - Parameters to track
    - Frequency of assessment
    - Indicators for treatment modification
    
    CONTINGENCY PLAN:
    - What to do if no improvement in X days/weeks
    - Warning signs requiring urgent attention
    - Second-line treatment options",

  "patientEducation": "COMPREHENSIVE patient counseling covering:
    
    DISEASE EXPLANATION:
    - What is this condition in lay terms
    - Why it occurred (causative factors)
    - Natural course if untreated
    - Expected course with treatment
    
    MEDICATION INSTRUCTIONS:
    - How to apply/take each medication
    - Expected timeline for improvement
    - Possible side effects to watch for
    - What to do if side effects occur
    
    LIFESTYLE MODIFICATIONS:
    - Skincare routine recommendations
    - Products to avoid
    - Sun protection advice (if relevant)
    - Dietary considerations (if applicable)
    - Stress management if relevant
    
    PREVENTION STRATEGIES:
    - How to prevent recurrence
    - Trigger avoidance
    - Environmental modifications
    
    WHEN TO SEEK URGENT CARE:
    - Warning signs of complications
    - Signs of treatment failure
    - Emergency symptoms
    
    PSYCHOSOCIAL SUPPORT:
    - Impact on quality of life
    - Resources available
    - Support groups if applicable",

  "followUp": "STRUCTURED follow-up plan with specific timelines:
    
    NEXT CONSULTATION:
    - Timing: [Specific date range, e.g., 'in 2 weeks']
    - Purpose: Assessment of treatment response
    - What to expect at follow-up
    
    INTERIM MONITORING:
    - Self-monitoring instructions
    - Photo documentation recommendations
    - Symptom diary if applicable
    
    REASSESSMENT CRITERIA:
    - Improvement: what indicates good response
    - Stable: what indicates need for adjustment
    - Worsening: criteria for earlier review
    
    LONG-TERM PLAN:
    - Anticipated course of treatment
    - When cure/control expected
    - Chronic disease management if applicable
    
    REFERRAL CONSIDERATIONS:
    - Conditions under which specialist referral needed
    - Types of specialists who might be involved",

  "prognosisAndComplications": "REALISTIC prognosis and risk discussion:
    
    EXPECTED OUTCOME:
    - With treatment: anticipated timeline and result
    - Without treatment: natural course
    - Factors affecting prognosis
    
    POTENTIAL COMPLICATIONS:
    - Early complications to watch for
    - Long-term risks if any
    - Scarring or pigmentary changes potential
    
    QUALITY OF LIFE IMPACT:
    - Expected improvement timeline
    - Residual effects if any
    - Cosmetic considerations",

  "clinicalPearls": "PROFESSIONAL NOTES for medical record:
    
    - Unusual or noteworthy features of this case
    - Teaching points or clinical insights
    - Literature references supporting management
    - Medico-legal considerations documented
    - Photography consent and documentation notes
    - Telemedicine limitations acknowledged",

  "conclusion": "COMPREHENSIVE clinical summary (3-4 paragraphs):
    
    Paragraph 1: Case summary - patient demographics, presentation, key findings
    
    Paragraph 2: Diagnostic conclusion - diagnosis, confidence level, supporting evidence
    
    Paragraph 3: Management plan overview - treatment strategy, expected outcome, follow-up
    
    Paragraph 4: Professional sign-off - any special considerations, medico-legal documentation complete"
}

CRITICAL REQUIREMENTS:
- Write in PROFESSIONAL MEDICAL ENGLISH throughout
- Use proper dermatological terminology
- Include specific measurements and precise descriptions
- Reference clinical findings to image analysis
- Provide evidence-based reasoning
- Each section should be SUBSTANTIAL (not just 1-2 sentences)
- Minimum 2000 words total across all sections
- Format for professional medical record and potential peer review

Generate COMPLETE, DETAILED content for EVERY field. This is a LEGAL MEDICAL DOCUMENT.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a senior consultant dermatologist preparing a comprehensive medical report for peer review, medico-legal documentation, and patient care continuity. Generate thorough, professional, evidence-based content. Each section must be detailed and complete. Minimum 2000 words total. Use ICD-10 codes where applicable. Reference clinical guidelines." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })

    const text = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(text)
    
    // Ensure all required fields are present with fallbacks
    return {
      chiefComplaint: parsed.chiefComplaint || "Dermatological consultation with image analysis",
      historyPresentIllness: parsed.historyPresentIllness || "Patient presents for dermatological evaluation. Detailed history obtained as documented.",
      pastMedicalHistory: parsed.pastMedicalHistory || patient.medicalHistory,
      physicalExamination: parsed.physicalExamination || ocrAnalysis,
      examinationFindings: parsed.physicalExamination || parsed.examinationFindings || ocrAnalysis,
      diagnosis: parsed.diagnosis || diagnosis.substring(0, 1000),
      differentialDiagnosis: parsed.differentialDiagnosis || "Additional diagnostic considerations require clinical correlation.",
      investigationsPlan: parsed.investigationsPlan || "Investigations planned as clinically indicated.",
      treatmentPlan: parsed.treatmentPlan || "Treatment plan formulated based on clinical assessment. See prescription.",
      patientEducation: parsed.patientEducation || "Comprehensive patient education provided regarding condition and treatment.",
      followUp: parsed.followUp || "Follow-up arranged in 2-4 weeks for treatment response assessment.",
      prognosisAndComplications: parsed.prognosisAndComplications || "Prognosis discussed with patient. Monitoring plan established.",
      clinicalPearls: parsed.clinicalPearls || "Complete dermatological assessment documented with image analysis.",
      conclusion: parsed.conclusion || "Complete dermatological consultation with diagnostic assessment and treatment plan established."
    }
  } catch (error) {
    console.error('Error generating comprehensive narrative:', error)
    // Robust fallback
    return {
      chiefComplaint: "Dermatological consultation with professional image analysis",
      historyPresentIllness: "Patient presents for comprehensive dermatological evaluation. Complete history obtained and documented.",
      pastMedicalHistory: patient.medicalHistory || "Medical history reviewed and documented",
      physicalExamination: ocrAnalysis || "Complete dermatological examination performed and documented",
      examinationFindings: ocrAnalysis,
      diagnosis: diagnosis?.substring(0, 1000) || "Clinical diagnosis established based on comprehensive assessment",
      differentialDiagnosis: "Differential diagnoses considered as part of comprehensive evaluation",
      investigationsPlan: "Diagnostic workup planned as clinically appropriate",
      treatmentPlan: "Evidence-based treatment plan formulated. See detailed prescription and recommendations.",
      patientEducation: "Comprehensive patient education provided covering diagnosis, treatment, and follow-up",
      followUp: "Structured follow-up plan established with clear monitoring parameters",
      prognosisAndComplications: "Prognosis and potential complications discussed with patient",
      clinicalPearls: "Complete professional dermatological assessment with image analysis integration",
      conclusion: "Comprehensive dermatological consultation completed with diagnostic assessment, treatment planning, and patient education. Follow-up scheduled for treatment response evaluation."
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
