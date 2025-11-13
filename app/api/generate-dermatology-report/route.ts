import { type NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ==================== HELPER FUNCTIONS ====================
function getString(value: any): string {
  if (value === null || value === undefined) return ''
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
    const body = await request.json()
    const {
      patientData,
      imageData,
      ocrAnalysisData,
      questionsData,
      diagnosisData,
      doctorData
    } = body

    console.log('🔬 Generating comprehensive dermatology report')
    console.log(`👤 Patient: ${patientData.firstName} ${patientData.lastName}`)

    // ==================== PREPARE PATIENT INFO ====================
    const patient = {
      firstName: getString(patientData?.firstName),
      lastName: getString(patientData?.lastName),
      fullName: `${getString(patientData?.firstName)} ${getString(patientData?.lastName)}`.trim(),
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
      allergies: getArray(patientData?.allergies),
      otherAllergies: getString(patientData?.otherAllergies),
      medicalHistory: getArray(patientData?.medicalHistory),
      otherMedicalHistory: getString(patientData?.otherMedicalHistory),
      currentMedications: getString(patientData?.currentMedicationsText) || getString(patientData?.currentMedications),
      lifeHabits: patientData?.lifeHabits || {}
    }

    // ==================== PREPARE DOCTOR INFO ====================
    const doctor = {
      fullName: getString(doctorData?.fullName) || 'Dr. [Name Required]',
      qualifications: getString(doctorData?.qualifications) || 'MBBS',
      specialty: getString(doctorData?.specialty) || 'Dermatology',
      clinicAddress: getString(doctorData?.clinicAddress) || 'Tibok Teleconsultation Platform',
      email: getString(doctorData?.email) || '[Email Required]',
      consultationHours: getString(doctorData?.consultationHours) || 'Teleconsultation Hours: 8:00 AM - 8:00 PM',
      medicalCouncilNumber: getString(doctorData?.medicalCouncilNumber) || '[MCM Registration Required]'
    }

    // ==================== EXTRACT DATA ====================
    const ocrAnalysis = ocrAnalysisData?.analysis?.fullText || 'No image analysis available'
    const diagnosis = diagnosisData?.diagnosis?.fullText || 'Pending diagnosis'
    
    // Format questions and answers
    const questionsFormatted = formatQuestionsData(questionsData)

    // ==================== GENERATE COMPREHENSIVE REPORT WITH AI ====================
    const reportPrompt = `You are a medical documentation specialist creating a comprehensive dermatology consultation report.

PATIENT INFORMATION:
- Name: ${patient.fullName}
- Age: ${patient.age} years | Gender: ${patient.gender}
- Weight: ${patient.weight} | Height: ${patient.height}
- Medical History: ${formatMedicalHistory(patient)}
- Known Allergies: ${formatAllergies(patient)}
- Current Medications: ${patient.currentMedications || 'None'}

IMAGE ANALYSIS (OCR):
${ocrAnalysis}

CLINICAL HISTORY (Questions & Answers):
${questionsFormatted}

AI DERMATOLOGY DIAGNOSIS:
${diagnosis}

TASK: Generate a COMPLETE, PROFESSIONAL dermatology consultation report in FRENCH with the following structure:

1. COMPTE RENDU DE CONSULTATION (Narrative Format)
   - Write in professional medical narrative style
   - Include all patient information
   - Describe chief complaint and reason for dermatology consultation
   - Summarize visual examination findings from images
   - Present clinical history in narrative form
   - State the primary diagnosis with ICD-10 code if available
   - List differential diagnoses
   - Describe the treatment plan in narrative format
   - Include patient education points
   - State follow-up recommendations

2. ORDONNANCE MÉDICAMENTS (Structured Prescription)
   - Extract ALL medications from the treatment plan
   - For EACH medication provide:
     * Nom commercial (commercial name)
     * DCI (Dénomination Commune Internationale / Generic name)
     * Dosage (e.g., "1%", "500mg")
     * Forme (cream, ointment, lotion, gel, tablet, capsule)
     * Posologie (frequency: "Apply twice daily", "1 tablet 3 times daily")
     * Voie d'administration (Topical route, Oral route, Parenteral route)
     * Durée du traitement (duration: "14 days", "4 weeks")
     * Quantité (quantity: "1 tube", "1 box")
     * Instructions spéciales (special instructions)

3. EXAMENS DE LABORATOIRE (Laboratory Tests)
   - Extract ALL laboratory tests mentioned in RECOMMENDED INVESTIGATIONS
   - For EACH test provide:
     * Nom de l'examen (test name)
     * Catégorie (clinicalChemistry, hematology, immunology, microbiology, other)
     * Urgence (true/false - urgent or routine)
     * À jeun (true/false - fasting required)
     * Indication clinique (clinical indication)

4. EXAMENS D'IMAGERIE (Imaging Studies)
   - Extract any imaging studies recommended
   - For EACH exam provide:
     * Type (X-Ray, CT Scan, MRI, Ultrasound)
     * Région (anatomical region)
     * Indication clinique (clinical indication)
     * Urgence (true/false)

IMPORTANT FORMATTING REQUIREMENTS:
- Use professional French medical terminology
- Be concise but comprehensive
- Use clear section headings with "**SECTION:**" format
- For lists, use numbered format
- Include ICD-10 codes where applicable
- Ensure all medication details are complete
- Prioritize dermatology-specific medications (topical > oral when appropriate)

Return the response in JSON format with these exact keys:
{
  "compteRendu": "Full narrative consultation report in French",
  "medications": [array of medication objects],
  "laboratoryTests": [array of test objects],
  "imagingStudies": [array of imaging objects],
  "metadata": {
    "generatedAt": "ISO date",
    "patientAge": "age",
    "consultationType": "Dermatology",
    "imagesAnalyzed": number
  }
}`

    console.log('🤖 Sending request to OpenAI...')

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a medical documentation specialist with expertise in dermatology. You create comprehensive, professionally structured medical reports in French that comply with medical documentation standards. You extract structured data from diagnoses and format them appropriately for prescriptions and lab orders."
        },
        {
          role: "user",
          content: reportPrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })

    const responseText = completion.choices[0].message.content || '{}'
    console.log('✅ AI Response received')

    let reportData
    try {
      reportData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError)
      throw new Error('Failed to parse AI response')
    }

    // ==================== STRUCTURE THE COMPLETE REPORT ====================
    const structuredReport = {
      success: true,
      report: {
        // Header Information
        header: {
          title: "COMPTE RENDU DE CONSULTATION DERMATOLOGIQUE",
          subtitle: "Documentation Médicale Professionnelle",
          reference: `DERM-${Date.now()}`,
          date: new Date().toISOString()
        },

        // Patient Information
        patient: {
          fullName: patient.fullName,
          firstName: patient.firstName,
          lastName: patient.lastName,
          age: patient.age,
          birthDate: patient.birthDate,
          gender: patient.gender,
          weight: patient.weight,
          height: patient.height,
          phone: patient.phone,
          email: patient.email,
          address: `${patient.address}, ${patient.city}, ${patient.country}`,
          allergies: formatAllergies(patient),
          medicalHistory: formatMedicalHistory(patient),
          currentMedications: patient.currentMedications,
          dateExamen: new Date().toISOString().split('T')[0]
        },

        // Doctor Information
        doctor: {
          name: `Dr. ${doctor.fullName}`,
          qualifications: doctor.qualifications,
          specialty: doctor.specialty,
          clinicAddress: doctor.clinicAddress,
          email: doctor.email,
          consultationHours: doctor.consultationHours,
          medicalCouncilNumber: doctor.medicalCouncilNumber
        },

        // Consultation Report (Narrative)
        consultationReport: {
          fullText: reportData.compteRendu || generateFallbackReport(patient, ocrAnalysis, diagnosis),
          sections: extractReportSections(reportData.compteRendu || '')
        },

        // Image Analysis
        imageAnalysis: {
          summary: ocrAnalysisData?.summary || '',
          fullText: ocrAnalysis,
          observations: ocrAnalysisData?.observations || [],
          imagesCount: imageData?.images?.length || 0
        },

        // Clinical History
        clinicalHistory: {
          questions: questionsData?.questions || [],
          answers: questionsData?.answers || {},
          formatted: questionsFormatted
        },

        // Diagnosis
        diagnosis: {
          fullText: diagnosis,
          primary: extractPrimaryDiagnosis(diagnosis),
          differential: extractDifferentialDiagnoses(diagnosis),
          icd10: extractICD10Codes(diagnosis)
        },

        // Prescriptions - Medications
        prescriptions: {
          medications: reportData.medications || [],
          laboratoryTests: reportData.laboratoryTests || [],
          imagingStudies: reportData.imagingStudies || []
        },

        // Metadata
        metadata: {
          generatedAt: new Date().toISOString(),
          consultationType: 'Dermatology',
          imagesAnalyzed: imageData?.images?.length || 0,
          questionsAnswered: Object.keys(questionsData?.answers || {}).length,
          aiModel: 'gpt-4o',
          reportVersion: '1.0'
        }
      }
    }

    console.log('✅ Structured dermatology report generated successfully')
    console.log(`📊 Medications: ${structuredReport.report.prescriptions.medications.length}`)
    console.log(`📊 Lab Tests: ${structuredReport.report.prescriptions.laboratoryTests.length}`)
    console.log(`📊 Imaging: ${structuredReport.report.prescriptions.imagingStudies.length}`)

    return NextResponse.json(structuredReport)

  } catch (error: any) {
    console.error('❌ Error generating dermatology report:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate dermatology report',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

// ==================== HELPER FORMATTING FUNCTIONS ====================

function formatMedicalHistory(patient: any): string {
  const history = [...(patient.medicalHistory || [])]
  if (patient.otherMedicalHistory) {
    history.push(patient.otherMedicalHistory)
  }
  return history.length > 0 ? history.join(', ') : 'Aucun antécédent notable signalé'
}

function formatAllergies(patient: any): string {
  const allergies = [...(patient.allergies || [])]
  if (patient.otherAllergies) {
    allergies.push(patient.otherAllergies)
  }
  return allergies.length > 0 ? allergies.join(', ') : 'Aucune allergie connue'
}

function formatQuestionsData(questionsData: any): string {
  if (!questionsData?.answers || !questionsData?.questions) {
    return 'Interrogatoire complémentaire non disponible.'
  }
  
  const questions = questionsData.questions || []
  const answers = questionsData.answers || {}
  
  let formatted = ''
  questions.forEach((q: any, index: number) => {
    const answer = answers[q.id]
    if (answer) {
      const answerText = typeof answer === 'object' ? JSON.stringify(answer) : answer
      formatted += `${index + 1}. ${q.question}\n   Réponse: ${answerText}\n\n`
    }
  })
  
  return formatted || 'Interrogatoire complémentaire non disponible.'
}

function extractReportSections(reportText: string): any {
  return {
    motifConsultation: extractSection(reportText, /MOTIF DE CONSULTATION[:\s]+(.*?)(?=\n\n[A-Z]|\Z)/is),
    examenClinique: extractSection(reportText, /EXAMEN (?:VISUEL|CLINIQUE)[:\s]+(.*?)(?=\n\n[A-Z]|\Z)/is),
    diagnostic: extractSection(reportText, /DIAGNOSTIC[:\s]+(.*?)(?=\n\n[A-Z]|\Z)/is),
    planTherapeutique: extractSection(reportText, /PLAN THÉRAPEUTIQUE[:\s]+(.*?)(?=\n\n[A-Z]|\Z)/is),
    surveillance: extractSection(reportText, /SUIVI[:\s]+(.*?)(?=\n\n[A-Z]|\Z)/is)
  }
}

function extractSection(text: string, regex: RegExp): string {
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

function extractPrimaryDiagnosis(diagnosis: string): string {
  const match = diagnosis.match(/PRIMARY DIAGNOSIS[:\s]+(.*?)(?=\n\n|DIFFERENTIAL|\Z)/is)
  return match ? match[1].trim() : ''
}

function extractDifferentialDiagnoses(diagnosis: string): string[] {
  const match = diagnosis.match(/DIFFERENTIAL DIAGNOS[EI]S[:\s]+(.*?)(?=\n\n[A-Z]|\Z)/is)
  if (!match) return []
  
  const text = match[1]
  return text.split(/\n/).filter(line => line.trim().match(/^[\d\-•]/)).map(line => line.trim())
}

function extractICD10Codes(diagnosis: string): string[] {
  const codes: string[] = []
  const regex = /\b[A-Z]\d{2}(?:\.\d{1,2})?\b/g
  const matches = diagnosis.match(regex)
  if (matches) {
    codes.push(...matches)
  }
  return [...new Set(codes)] // Remove duplicates
}

function generateFallbackReport(patient: any, ocrAnalysis: string, diagnosis: string): string {
  return `COMPTE RENDU DE CONSULTATION DERMATOLOGIQUE

**INFORMATIONS PATIENT:**
Nom: ${patient.fullName}
Âge: ${patient.age} ans | Sexe: ${patient.gender}
Date: ${new Date().toLocaleDateString('fr-FR')}

**MOTIF DE CONSULTATION:**
Consultation dermatologique avec analyse d'images pour évaluation de lésions cutanées.

**EXAMEN VISUEL:**
${ocrAnalysis}

**DIAGNOSTIC:**
${diagnosis}

**PLAN DE SUIVI:**
Suivi recommandé dans 2-4 semaines. Consultation plus tôt si aggravation des symptômes.

Rapport généré le: ${new Date().toLocaleString('fr-FR')}
Mode: Téléconsultation avec analyse d'images assistée par IA
`
}
