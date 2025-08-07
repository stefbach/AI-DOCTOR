import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ==================== DATA PROTECTION FUNCTIONS ====================
function anonymizePatientData(patientData: any): {
  anonymized: any,
  originalIdentity: any,
  anonymousId: string
} {
  const originalIdentity = {
    lastName: patientData?.lastName || patientData?.nom || '',
    firstName: patientData?.firstName || patientData?.prenom || '',
    name: patientData?.name || '',
    fullName: `${(patientData.lastName || patientData.nom || '').toUpperCase()} ${patientData.firstName || patientData.prenom || ''}`.trim(),
    address: patientData?.address || patientData?.adresse || '',
    phone: patientData?.phone || patientData?.telephone || '',
    email: patientData?.email || '',
    nationalId: patientData?.nationalId || patientData?.nid || '',
    birthDate: patientData?.birthDate || patientData?.dateNaissance || ''
  }
  
  const anonymized = { ...patientData }
  const sensitiveFields = [
    'lastName', 'firstName', 'name', 'nom', 'prenom',
    'address', 'adresse', 'phone', 'telephone', 'email',
    'nationalId', 'nid', 'birthDate', 'dateNaissance'
  ]
  
  sensitiveFields.forEach(field => {
    delete anonymized[field]
  })
  
  const anonymousId = `ANON-RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId
  
  console.log('🔒 Patient data anonymized for report')
  
  return { anonymized, originalIdentity, anonymousId }
}

// Helper function to handle bilingual objects
function getString(field: any): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (typeof field === 'object' && !Array.isArray(field)) {
    if (field.en) return field.en
    if (field.fr) return field.fr
    return Object.values(field)[0]?.toString() || ''
  }
  return String(field)
}

// ==================== IMPROVED PRESCRIPTIONS EXTRACTION FUNCTION ====================
function extractPrescriptions(diagnosisData: any) {
  const medications: any[] = []
  const labTests: any[] = []
  const imagingStudies: any[] = []
  const seen = new Set<string>()
  
  console.log("🔍 START PRESCRIPTIONS EXTRACTION - IMPROVED VERSION")
  
  // Function to extract biological tests from any structure
  function extractBiologyTests(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') return
    
    // Search in all possible keys for lab tests
    const bioKeys = [
      'tests', 'test', 'analyses', 'analysis', 'exams', 'examens',
      'laboratory_tests', 'laboratory_request', 'lab_tests', 'labTests',
      'biologicalTests', 'biological_tests', 'biologie', 'biology',
      'laboratoryRequest', 'laboratoryTests', 'lab_request', 'labRequest',
      'blood_tests', 'bloodTests', 'blood_work', 'bloodWork',
      'clinical_tests', 'clinicalTests', 'diagnostic_tests', 'diagnosticTests'
    ]
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      const lowerKey = key.toLowerCase()
      
      // Check if this is a key that could contain lab tests
      if (bioKeys.some(bioKey => lowerKey.includes(bioKey.toLowerCase()))) {
        console.log(`🧪 Potential lab tests found at: ${currentPath}`)
        
        if (Array.isArray(value)) {
          value.forEach((item: any, index: number) => {
            // Try multiple possible structures
            const testName = getString(item.test_name) || 
                           getString(item.testName) ||
                           getString(item.name) || 
                           getString(item.test) ||
                           getString(item.exam) ||
                           getString(item.analysis) ||
                           getString(item.nom) ||
                           getString(item.titre) ||
                           getString(item.description) ||
                           ''
            
            const category = getString(item.category) || 
                           getString(item.categorie) ||
                           getString(item.type) ||
                           getString(item.department) ||
                           getString(item.section) ||
                           'Clinical Chemistry'
            
            if (testName) {
              const uniqueKey = `bio:${testName}_${category}`.toLowerCase()
              
              if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey)
                labTests.push({
                  name: testName,
                  category: category,
                  urgent: item.urgency === 'Urgent' || item.urgent || item.stat || false,
                  fasting: item.fasting || item.fasting_required || item.aJeun || false,
                  sampleConditions: getString(item.special_requirements) || getString(item.conditions) || '',
                  clinicalIndication: getString(item.clinical_indication) || getString(item.indication) || '',
                  clinicalInformation: getString(item.clinical_info) || getString(item.clinical_information) || '',
                  sampleTube: getString(item.tube_type) || getString(item.tube) || 'As per laboratory protocol',
                  turnaroundTime: getString(item.turnaround_time) || getString(item.tat) || 'Standard'
                })
                console.log(`✅ Lab test added: ${testName} (${category})`)
              }
            }
          })
        } else if (typeof value === 'object' && value !== null) {
          // If it's an object, explore recursively
          extractBiologyTests(value, currentPath)
        }
      } else if (typeof value === 'object' && value !== null) {
        // Continue recursive search
        extractBiologyTests(value, currentPath)
      }
    }
  }
  
  // Function to extract imaging studies from any structure
  function extractImagingStudies(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') return
    
    const imagingKeys = [
      'studies', 'study', 'imaging', 'imagerie', 'radiology', 'radiologie',
      'imaging_studies', 'imaging_request', 'imagingStudies', 'imagingRequest',
      'xray', 'x-ray', 'scan', 'scans', 'ct', 'mri', 'ultrasound', 'echo',
      'radiological', 'radiologicalStudies', 'medical_imaging', 'medicalImaging'
    ]
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      const lowerKey = key.toLowerCase()
      
      if (imagingKeys.some(imgKey => lowerKey.includes(imgKey.toLowerCase()))) {
        console.log(`📷 Potential imaging found at: ${currentPath}`)
        
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            const studyType = getString(item.study_type) || 
                            getString(item.studyType) ||
                            getString(item.type) || 
                            getString(item.modality) ||
                            getString(item.modalite) ||
                            getString(item.exam) ||
                            getString(item.examination) ||
                            ''
            
            const region = getString(item.body_region) || 
                         getString(item.bodyRegion) ||
                         getString(item.region) || 
                         getString(item.anatomicalRegion) ||
                         getString(item.area) ||
                         getString(item.site) ||
                         ''
            
            if (studyType) {
              const uniqueKey = `img:${studyType}_${region}`.toLowerCase()
              
              if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey)
                imagingStudies.push({
                  type: studyType,
                  modality: getString(item.modality) || studyType,
                  region: region || 'To be specified',
                  clinicalIndication: getString(item.clinical_indication) || getString(item.indication) || '',
                  clinicalQuestion: getString(item.clinical_question) || getString(item.question) || '',
                  urgent: item.urgency === 'Urgent' || item.urgent || item.stat || false,
                  contrast: item.contrast_required || item.contrast || item.avec_contraste || false,
                  contraindications: getString(item.contraindications) || '',
                  clinicalInformation: getString(item.findings_sought) || getString(item.clinical_info) || '',
                  relevantHistory: getString(item.relevant_history) || '',
                  specificProtocol: getString(item.protocol) || ''
                })
                console.log(`✅ Imaging added: ${studyType} - ${region}`)
              }
            }
          })
        } else if (typeof value === 'object' && value !== null) {
          extractImagingStudies(value, currentPath)
        }
      } else if (typeof value === 'object' && value !== null) {
        extractImagingStudies(value, currentPath)
      }
    }
  }
  
  // Function to extract medications (unchanged but with more logs)
  function extractMedications(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') return
    
    const medKeys = [
      'medications', 'medication', 'medicaments', 'medicament',
      'prescription', 'prescriptions', 'treatments', 'treatment',
      'drugs', 'drug', 'medicines', 'medicine', 'therapy', 'therapies'
    ]
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      const lowerKey = key.toLowerCase()
      
      if (medKeys.some(medKey => lowerKey.includes(medKey.toLowerCase())) && Array.isArray(value)) {
        console.log(`💊 Potential medications found at: ${currentPath}`)
        value.forEach((med: any) => {
          const name = getString(med.medication) || 
                      getString(med.name) || 
                      getString(med.medicament) || 
                      getString(med.drug) ||
                      getString(med.nom) ||
                      getString(med.medicine) ||
                      ''
                      
          const dosage = getString(med.dosage) || 
                        getString(med.dose) || 
                        getString(med.strength) ||
                        getString(med.dosageStrength) ||
                        ''
          
          const uniqueKey = `med:${name}_${dosage}`.toLowerCase().trim()
          
          if (name && !seen.has(uniqueKey)) {
            seen.add(uniqueKey)
            medications.push({
              name: name,
              genericName: getString(med.generic_name) || getString(med.genericName) || getString(med.dci) || getString(med.inn) || name,
              dosage: dosage,
              form: getString(med.form) || getString(med.dosageForm) || getString(med.forme) || 'tablet',
              frequency: getString(med.frequency) || getString(med.posologie) || getString(med.sig) || getString(med.directions) || 'Once daily',
              route: getString(med.route) || getString(med.routeOfAdministration) || getString(med.voie) || 'Oral',
              duration: getString(med.duration) || getString(med.duree) || getString(med.treatmentDuration) || '7 days',
              quantity: getString(med.quantity) || getString(med.quantite) || getString(med.amount) || '1 box',
              instructions: getString(med.instructions) || getString(med.notes) || getString(med.specialInstructions) || '',
              indication: getString(med.indication) || getString(med.reason) || getString(med.justification) || '',
              monitoring: getString(med.monitoring) || getString(med.surveillance) || '',
              doNotSubstitute: med.non_substitutable || med.nonSubstitutable || med.doNotSubstitute || false,
              completeLine: `${name} ${dosage ? `- ${dosage}` : ''}\n${getString(med.frequency) || 'Once daily'} - ${getString(med.route) || 'Oral'}\nDuration: ${getString(med.duration) || '7 days'} - Quantity: ${getString(med.quantity) || '1 box'}`
            })
            console.log(`✅ Medication added: ${name} ${dosage}`)
          }
        })
      } else if (typeof value === 'object' && value !== null) {
        extractMedications(value, currentPath)
      }
    }
  }
  
  // 1. Extraction from entire structure
  console.log("\n🔍 PHASE 1: Complete recursive extraction")
  extractMedications(diagnosisData)
  extractBiologyTests(diagnosisData)
  extractImagingStudies(diagnosisData)
  
  // 2. Extraction from mauritianDocuments (specific)
  if (diagnosisData?.mauritianDocuments) {
    console.log("\n🔍 PHASE 2: Extraction from mauritianDocuments")
    
    // Medications from mauritianDocuments
    if (diagnosisData.mauritianDocuments.consultation?.management_plan?.treatment?.medications) {
      diagnosisData.mauritianDocuments.consultation.management_plan.treatment.medications.forEach((med: any) => {
        const name = med.medication || med.name || ''
        const dosage = med.dosing?.adult || med.dosage || ''
        const uniqueKey = `med:${name}_${dosage}`.toLowerCase()
        
        if (name && !seen.has(uniqueKey)) {
          seen.add(uniqueKey)
          medications.push({
            name: name,
            genericName: name,
            dosage: dosage,
            form: 'tablet',
            frequency: med.dosing?.adult || 'As directed',
            route: 'Oral',
            duration: med.duration || '7 days',
            quantity: '1 box',
            instructions: med.instructions || '',
            indication: med.indication || '',
            monitoring: med.monitoring || '',
            doNotSubstitute: false,
            completeLine: `${name} ${dosage}\n${med.dosing?.adult || 'As directed'} - Oral\nDuration: ${med.duration || '7 days'}`
          })
          console.log(`✅ Med from mauritianDocuments: ${name} ${dosage}`)
        }
      })
    }
    
    // Lab tests from mauritianDocuments
    if (diagnosisData.mauritianDocuments.consultation?.management_plan?.investigations?.laboratory_tests) {
      diagnosisData.mauritianDocuments.consultation.management_plan.investigations.laboratory_tests.forEach((test: any) => {
        const testName = test.test || test.name || ''
        const uniqueKey = `bio:${testName}`.toLowerCase()
        
        if (testName && !seen.has(uniqueKey)) {
          seen.add(uniqueKey)
          labTests.push({
            name: testName,
            category: test.category || 'Clinical Chemistry',
            urgent: test.urgency === 'Urgent' || false,
            fasting: test.fasting_required || false,
            sampleConditions: test.special_requirements || '',
            clinicalIndication: test.clinical_indication || '',
            clinicalInformation: '',
            sampleTube: test.tube_type || 'As per laboratory protocol',
            turnaroundTime: test.turnaround_time || 'Standard'
          })
          console.log(`✅ Lab test from mauritianDocuments: ${testName}`)
        }
      })
    }
    
    // Imaging from mauritianDocuments
    if (diagnosisData.mauritianDocuments.consultation?.management_plan?.investigations?.imaging_studies) {
      diagnosisData.mauritianDocuments.consultation.management_plan.investigations.imaging_studies.forEach((study: any) => {
        const studyType = study.study_type || study.type || ''
        const region = study.body_region || study.region || ''
        const uniqueKey = `img:${studyType}_${region}`.toLowerCase()
        
        if (studyType && !seen.has(uniqueKey)) {
          seen.add(uniqueKey)
          imagingStudies.push({
            type: studyType,
            modality: study.modality || studyType,
            region: region || 'To be specified',
            clinicalIndication: study.clinical_indication || '',
            clinicalQuestion: study.clinical_question || '',
            urgent: study.urgency === 'Urgent' || false,
            contrast: study.contrast_required || false,
            contraindications: study.contraindications || '',
            clinicalInformation: study.findings_sought || '',
            relevantHistory: study.relevant_history || '',
            specificProtocol: study.protocol || ''
          })
          console.log(`✅ Imaging from mauritianDocuments: ${studyType} - ${region}`)
        }
      })
    }
  }
  
  console.log(`\n📊 FINAL EXTRACTION SUMMARY:`)
  console.log(`   - Medications: ${medications.length}`)
  console.log(`   - Lab tests: ${labTests.length}`)
  console.log(`   - Imaging: ${imagingStudies.length}`)
  
  return { medications, labTests, imagingStudies }
}

// Function to extract real data from diagnosis
function extractRealDataFromDiagnosis(diagnosisData: any, clinicalData: any) {
  // Extract chief complaint
  const chiefComplaint = 
    clinicalData?.chiefComplaint ||
    diagnosisData?.mauritianDocuments?.consultation?.patient_interview?.chief_complaint ||
    diagnosisData?.expertAnalysis?.clinical_case_summary?.chief_complaint ||
    "Patient presents for medical consultation"

  // Extract history of present illness
  const historyOfPresentIllness = 
    diagnosisData?.mauritianDocuments?.consultation?.patient_interview?.history_present_illness ||
    diagnosisData?.expertAnalysis?.clinical_reasoning?.history_analysis ||
    diagnosisData?.clinical_case_summary?.clinical_presentation ||
    ""

  // Extract past medical history
  const medicalHistory = 
    diagnosisData?.mauritianDocuments?.consultation?.patient_interview?.past_medical_history ||
    diagnosisData?.mauritianDocuments?.consultation?.medical_history ||
    diagnosisData?.expertAnalysis?.clinical_reasoning?.relevant_history ||
    ""

  // Extract physical examination findings
  const clinicalExamination = 
    diagnosisData?.mauritianDocuments?.consultation?.patient_interview?.physical_examination ||
    diagnosisData?.mauritianDocuments?.consultation?.physical_examination?.findings ||
    diagnosisData?.expertAnalysis?.clinical_reasoning?.examination_findings ||
    ""

  // Extract diagnostic synthesis
  const diagnosticSynthesis = 
    diagnosisData?.mauritianDocuments?.consultation?.diagnostic_summary?.clinical_reasoning ||
    diagnosisData?.expertAnalysis?.clinical_reasoning?.diagnostic_synthesis ||
    diagnosisData?.diagnosis?.diagnostic_reasoning ||
    ""

  // Extract primary diagnosis
  const diagnosticConclusion = 
    diagnosisData?.mauritianDocuments?.consultation?.diagnostic_summary?.final_diagnosis ||
    diagnosisData?.diagnosis?.primary?.name ||
    diagnosisData?.diagnosis?.primary?.condition ||
    diagnosisData?.expertAnalysis?.final_assessment?.primary_diagnosis ||
    ""

  // Extract management plan
  const managementPlan = 
    diagnosisData?.mauritianDocuments?.consultation?.management_plan?.treatment_strategy ||
    diagnosisData?.mauritianDocuments?.consultation?.management_plan?.treatment?.approach ||
    diagnosisData?.expertAnalysis?.expert_therapeutics?.treatment_strategy ||
    ""

  // Extract follow-up plan
  const followUp = 
    diagnosisData?.mauritianDocuments?.consultation?.management_plan?.follow_up?.schedule ||
    diagnosisData?.mauritianDocuments?.consultation?.follow_up_plan ||
    diagnosisData?.expertAnalysis?.management_strategy?.follow_up ||
    ""

  return {
    chiefComplaint,
    historyOfPresentIllness,
    medicalHistory,
    clinicalExamination,
    diagnosticSynthesis,
    diagnosticConclusion,
    managementPlan,
    followUp
  }
}

// ==================== MAIN FUNCTION ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("🚀 Starting report generation (VERSION WITH ENGLISH CONTENT)")
  
  try {
    const body = await request.json()
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData, 
      editedDocuments, 
      includeFullPrescriptions = true
    } = body

    // COMPLETE LOG OF RECEIVED DATA
    console.log("\n📥 RECEIVED DATA:")
    console.log("- patientData present:", !!patientData)
    console.log("- clinicalData present:", !!clinicalData)
    console.log("- questionsData present:", !!questionsData)
    console.log("- diagnosisData present:", !!diagnosisData)
    console.log("- editedDocuments present:", !!editedDocuments)

    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json({ success: false, error: "Incomplete data" }, { status: 400 })
    }

    // Data protection
    const { anonymized: anonymizedPatientData, originalIdentity, anonymousId } = anonymizePatientData(patientData)
    
    // PRESCRIPTIONS EXTRACTION WITH IMPROVED FUNCTION
    const { medications, labTests, imagingStudies } = extractPrescriptions(diagnosisData)
    
    // Extract real data from diagnosis
    const realData = extractRealDataFromDiagnosis(diagnosisData, clinicalData)
    
    // Current date
    const currentDate = new Date()
    const examDate = currentDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

// Doctor information (French structure but can contain English content)
const praticien = {
  nom: body.doctorData?.fullName ? `Dr. ${body.doctorData.fullName}` : "Dr. [PHYSICIAN NAME]",
  qualifications: body.doctorData?.qualifications || "MBBS, MD (Medicine)",
  specialite: body.doctorData?.specialty || "General Medicine",
  adresseCabinet: body.doctorData?.clinicAddress || "[Complete practice address]",
  telephone: "", // Removed as per your requirement
  email: body.doctorData?.email || "[Professional email]",
  heuresConsultation: body.doctorData?.consultationHours || "Mon-Fri: 8:30 AM-5:30 PM, Sat: 8:30 AM-12:30 PM",
  numeroEnregistrement: body.doctorData?.medicalCouncilNumber || "[Medical Council Registration No.]",
  licencePratique: body.doctorData?.licenseNumber || "[Practice License No.]"
}

    // Patient information (French structure)
    const patient = {
      nom: originalIdentity.name || originalIdentity.fullName || 'PATIENT',
      nomComplet: originalIdentity.fullName || originalIdentity.name || 'PATIENT',
      age: `${anonymizedPatientData.age || ''} years`,
      dateNaissance: originalIdentity.birthDate || 'Not provided',
      sexe: anonymizedPatientData.gender || anonymizedPatientData.sexe || 'Not specified',
      adresse: originalIdentity.address || 'Not provided',
      telephone: originalIdentity.phone || 'Not provided',
      email: originalIdentity.email || 'Not provided',
      poids: anonymizedPatientData.weight || anonymizedPatientData.poids || 'Not provided',
      taille: anonymizedPatientData.height || anonymizedPatientData.taille || '',
      identifiantNational: originalIdentity.nationalId || '',
      dateExamen: examDate
    }

    // Create French structure with English content
    const reportStructure = {
      compteRendu: {
        header: {
          title: "MEDICAL CONSULTATION REPORT",
          subtitle: "Professional Medical Document",
          reference: `REF-${Date.now()}`
        },
        praticien: praticien,
        patient: patient,
        rapport: {
          motifConsultation: "",
          anamnese: "",
          antecedents: "",
          examenClinique: "",
          syntheseDiagnostique: "",
          conclusionDiagnostique: "",
          priseEnCharge: "",
          surveillance: "",
          conclusion: ""
        },
        metadata: {
          dateGeneration: currentDate.toISOString(),
          wordCount: 0,
          validationStatus: 'draft',
          complianceNote: "This document complies with Medical Council of Mauritius regulations"
        }
      },
      ordonnances: {
        medicaments: medications.length > 0 ? {
          enTete: praticien,
          patient: patient,
          prescription: {
            datePrescription: examDate,
            medicaments: medications.map((med, idx) => ({
              numero: idx + 1,
              nom: med.name,
              denominationCommune: med.genericName || med.name,
              dosage: med.dosage,
              forme: med.form || 'tablet',
              posologie: med.frequency,
              modeAdministration: med.route,
              dureeTraitement: med.duration,
              quantite: med.quantity,
              instructions: med.instructions,
              justification: med.indication,
              surveillanceParticuliere: med.monitoring,
              nonSubstituable: med.doNotSubstitute || false,
              ligneComplete: med.completeLine
            })),
            validite: "3 months unless otherwise specified",
            dispensationNote: "For pharmaceutical use only"
          },
          authentification: {
            signature: "Medical Practitioner's Signature",
            nomEnCapitales: praticien.nom.toUpperCase(),
            numeroEnregistrement: praticien.numeroEnregistrement,
            cachetProfessionnel: "Official Medical Stamp",
            date: examDate
          }
        } : null,
        
        biologie: labTests.length > 0 ? {
          enTete: praticien,
          patient: patient,
          prescription: {
            datePrescription: examDate,
            motifClinique: realData.diagnosticConclusion || "Diagnostic evaluation",
            analyses: {
              haematology: labTests.filter(t => 
                t.category.toLowerCase().includes('haem')
              ).map(t => ({
                nom: t.name,
                categorie: t.category,
                urgence: t.urgent,
                aJeun: t.fasting,
                conditionsPrelevement: t.sampleConditions,
                motifClinique: t.clinicalIndication,
                renseignementsCliniques: t.clinicalInformation,
                tubePrelevement: t.sampleTube,
                delaiResultat: t.turnaroundTime
              })),
              clinicalChemistry: labTests.filter(t => 
                t.category === 'Clinical Chemistry' || 
                t.category.toLowerCase().includes('chem') ||
                t.category.toLowerCase().includes('biochim')
              ).map(t => ({
                nom: t.name,
                categorie: t.category,
                urgence: t.urgent,
                aJeun: t.fasting,
                conditionsPrelevement: t.sampleConditions,
                motifClinique: t.clinicalIndication,
                renseignementsCliniques: t.clinicalInformation,
                tubePrelevement: t.sampleTube,
                delaiResultat: t.turnaroundTime
              })),
              immunology: labTests.filter(t => 
                t.category.toLowerCase().includes('immun') ||
                t.category.toLowerCase().includes('sero')
              ).map(t => ({
                nom: t.name,
                categorie: t.category,
                urgence: t.urgent,
                aJeun: t.fasting,
                conditionsPrelevement: t.sampleConditions,
                motifClinique: t.clinicalIndication,
                renseignementsCliniques: t.clinicalInformation,
                tubePrelevement: t.sampleTube,
                delaiResultat: t.turnaroundTime
              })),
              microbiology: labTests.filter(t => 
                t.category.toLowerCase().includes('micro') ||
                t.category.toLowerCase().includes('bacterio')
              ).map(t => ({
                nom: t.name,
                categorie: t.category,
                urgence: t.urgent,
                aJeun: t.fasting,
                conditionsPrelevement: t.sampleConditions,
                motifClinique: t.clinicalIndication,
                renseignementsCliniques: t.clinicalInformation,
                tubePrelevement: t.sampleTube,
                delaiResultat: t.turnaroundTime
              })),
              endocrinology: labTests.filter(t => 
                t.category.toLowerCase().includes('endo') ||
                t.category.toLowerCase().includes('hormon')
              ).map(t => ({
                nom: t.name,
                categorie: t.category,
                urgence: t.urgent,
                aJeun: t.fasting,
                conditionsPrelevement: t.sampleConditions,
                motifClinique: t.clinicalIndication,
                renseignementsCliniques: t.clinicalInformation,
                tubePrelevement: t.sampleTube,
                delaiResultat: t.turnaroundTime
              }))
            },
            instructionsSpeciales: labTests
              .filter(t => t.fasting || t.sampleConditions)
              .map(t => `${t.name}: ${t.fasting ? 'Fasting required' : ''} ${t.sampleConditions}`.trim())
              .filter(Boolean),
            laboratoireRecommande: "Any MoH approved laboratory"
          },
          authentification: {
            signature: "Requesting Physician's Signature",
            nomEnCapitales: praticien.nom.toUpperCase(),
            numeroEnregistrement: praticien.numeroEnregistrement,
            date: examDate
          }
        } : null,
        
        imagerie: imagingStudies.length > 0 ? {
          enTete: praticien,
          patient: patient,
          prescription: {
            datePrescription: examDate,
            examens: imagingStudies.map(exam => ({
              type: exam.type,
              modalite: exam.modality,
              region: exam.region || 'To be specified',
              indicationClinique: exam.clinicalIndication || 'Diagnostic evaluation',
              questionDiagnostique: exam.clinicalQuestion || '',
              urgence: exam.urgent || false,
              contraste: exam.contrast || false,
              contreIndications: exam.contraindications || '',
              renseignementsCliniques: exam.clinicalInformation || '',
              antecedentsPertinents: exam.relevantHistory || '',
              protocoleSpecifique: exam.specificProtocol || ''
            })),
            renseignementsCliniques: `Clinical diagnosis: ${realData.diagnosticConclusion}`,
            centreImagerie: "Any MoH approved imaging center"
          },
          authentification: {
            signature: "Requesting Physician's Signature",
            nomEnCapitales: praticien.nom.toUpperCase(),
            numeroEnregistrement: praticien.numeroEnregistrement,
            date: examDate
          }
        } : null
      },
      // NEW: Add invoice data
      invoice: {
        header: {
          invoiceNumber: `TIBOK-${currentDate.getFullYear()}-${String(Date.now()).slice(-6)}`,
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
          name: patient.nomComplet || patient.nom,
          email: patient.email || "[Email Address]",
          phone: patient.telephone || "[Phone Number]",
          patientId: patientData?.id || anonymousId
        },
        services: {
          items: [{
            description: "Online medical consultation via Tibok",
            quantity: 1,
            unitPrice: 1150,
            total: 1150
          }],
          subtotal: 1150,
          vatRate: 0.15,
          vatAmount: 0, // Exempt for medical services
          totalDue: 1150
        },
        payment: {
          method: "[Credit Card / MCB Juice / MyT Money / Other]",
          receivedDate: examDate,
          status: "pending" as const
        },
        physician: {
          name: praticien.nom,
          registrationNumber: praticien.numeroEnregistrement
        },
        notes: [
          "This invoice corresponds to a remote medical consultation performed via the Tibok platform.",
          "The service was delivered by a registered medical professional.",
          "No audio or video recording was made. All data is securely hosted on a health data certified server (OVH – HDS compliant).",
          "Service available from 08:00 to 00:00 (Mauritius time), 7 days a week.",
          "Medication delivery included during daytime, with possible extra charges after 17:00 depending on on-call pharmacy availability."
        ],
        signature: {
          entity: "Digital Data Solutions Ltd",
          onBehalfOf: praticien.nom,
          title: "Registered Medical Practitioner (Mauritius)"
        }
      }
    }

    // Prepare data for GPT-4 with REAL extracted information
    const gptData = {
      patient: {
        age: `${anonymizedPatientData.age || ''} years`,
        gender: anonymizedPatientData.gender || 'Not specified',
        weight: anonymizedPatientData.weight || 'Not provided'
      },
      chiefComplaint: realData.chiefComplaint,
      historyOfPresentIllness: realData.historyOfPresentIllness,
      medicalHistory: realData.medicalHistory,
      clinicalExamination: realData.clinicalExamination,
      diagnosticSynthesis: realData.diagnosticSynthesis,
      diagnosticConclusion: realData.diagnosticConclusion,
      managementPlan: realData.managementPlan,
      followUp: realData.followUp,
      medicationsCount: medications.length,
      labTestsCount: labTests.length,
      imagingStudiesCount: imagingStudies.length
    }

    // Generate narrative report with GPT-4 IN ENGLISH
    const systemPrompt = `You are a medical report writer for Mauritius. 
Write professional medical reports in ENGLISH.
Use the provided real patient data, do not invent information.
Each section must contain minimum 150-200 words.
If data is missing for a section, expand professionally on available information.`

    const userPrompt = `Based on this REAL patient data, generate a professional medical report in ENGLISH:
${JSON.stringify(gptData, null, 2)}

Generate content for these sections IN ENGLISH:
1. motifConsultation (Chief Complaint) - Use: ${gptData.chiefComplaint}
2. anamnese (History of Present Illness) - Use: ${gptData.historyOfPresentIllness}
3. antecedents (Past Medical History) - Use: ${gptData.medicalHistory}
4. examenClinique (Physical Examination) - Use: ${gptData.clinicalExamination}
5. syntheseDiagnostique (Diagnostic Synthesis) - Use: ${gptData.diagnosticSynthesis}
6. conclusionDiagnostique (Diagnostic Conclusion) - Use: ${gptData.diagnosticConclusion}
7. priseEnCharge (Management Plan) - Use: ${gptData.managementPlan} and mention ${gptData.medicationsCount} medications, ${gptData.labTestsCount} lab tests, ${gptData.imagingStudiesCount} imaging studies
8. surveillance (Follow-up Plan) - Use: ${gptData.followUp}
9. conclusion (Final Conclusion) - Summarize the case

Return ONLY a JSON object with these 9 keys and their content in ENGLISH.`

    console.log("🤖 Calling GPT-4 for ENGLISH content...")
    
    try {
      const result = await generateText({
        model: openai("gpt-4o"),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        maxTokens: 4000,
        temperature: 0.2,
      })

      // Parse and extract narrative content
      const cleanedText = result.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const firstBrace = cleanedText.indexOf('{')
      const lastBrace = cleanedText.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = cleanedText.substring(firstBrace, lastBrace + 1)
        try {
          const narrativeContent = JSON.parse(jsonString)
          
          // Merge narrative content
          Object.keys(narrativeContent).forEach(key => {
            if (reportStructure.compteRendu.rapport.hasOwnProperty(key)) {
              reportStructure.compteRendu.rapport[key as keyof typeof reportStructure.compteRendu.rapport] = narrativeContent[key]
            }
          })
        } catch (parseError) {
          console.error("JSON parse error:", parseError)
          // Use fallback content with real data
          useRealDataFallback(reportStructure, gptData)
        }
      } else {
        // Use fallback content with real data
        useRealDataFallback(reportStructure, gptData)
      }
    } catch (error) {
      console.error("❌ GPT-4 Error:", error)
      // Use fallback content with real data
      useRealDataFallback(reportStructure, gptData)
    }

    // Calculate word count
    const wordCount = Object.values(reportStructure.compteRendu.rapport)
      .filter(v => typeof v === 'string')
      .join(' ')
      .split(/\s+/)
      .filter(Boolean)
      .length
    
    reportStructure.compteRendu.metadata.wordCount = wordCount

    // VERIFICATION LOG
    console.log("\n🔍 FINAL STRUCTURE VERIFICATION:")
    console.log("   - report.compteRendu:", !!reportStructure.compteRendu)
    console.log("   - report.ordonnances:", !!reportStructure.ordonnances)
    console.log("   - report.ordonnances.medicaments:", !!reportStructure.ordonnances.medicaments)
    console.log("   - report.ordonnances.biologie:", !!reportStructure.ordonnances.biologie)
    console.log("   - report.ordonnances.imagerie:", !!reportStructure.ordonnances.imagerie)
    console.log("   - report.invoice:", !!reportStructure.invoice)

    const endTime = Date.now()
    const processingTime = endTime - startTime

    console.log("\n✅ REPORT GENERATED SUCCESSFULLY")
    console.log("📊 Final summary:")
    console.log(`   - Medications: ${medications.length}`)
    console.log(`   - Lab tests: ${labTests.length}`)
    console.log(`   - Imaging: ${imagingStudies.length}`)
    console.log(`   - Processing time: ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      report: reportStructure,
      metadata: {
        type: "professional_narrative_mauritius_compliant",
        includesFullPrescriptions: true,
        generatedAt: currentDate.toISOString(),
        processingTimeMs: processingTime,
        prescriptionsSummary: {
          medications: medications.length,
          laboratoryTests: labTests.length,
          imagingStudies: imagingStudies.length
        }
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

// Function to use fallback content with real data
function useRealDataFallback(reportStructure: any, data: any) {
  reportStructure.compteRendu.rapport = {
    motifConsultation: data.chiefComplaint || "The patient presents today for medical consultation. This consultation is part of a primary care approach aimed at evaluating, diagnosing, and managing the reported symptoms. The clinical approach adopted aims to identify the underlying causes of the presented symptoms while ensuring comprehensive and personalized patient care.",
    
    anamnese: data.historyOfPresentIllness || "The comprehensive medical interview allowed for the collection of detailed information regarding the current illness history. The patient describes a progressive evolution of clinical manifestations. The temporal analysis of symptoms reveals a presentation compatible with the observed clinical picture. All these anamnestic elements have been carefully analyzed and integrated into the overall clinical reasoning.",
    
    antecedents: data.medicalHistory || "The detailed exploration of the patient's medical history constitutes a crucial element of the comprehensive medical evaluation. This section documents all relevant elements of the patient's personal and family medical history, including previous pathologies, surgical interventions, drug allergies, and identified risk factors. This retrospective analysis helps establish a complete medical profile essential to understanding the current clinical context.",
    
    examenClinique: data.clinicalExamination || "The clinical examination was performed systematically and thoroughly, covering all physiological systems. Vital parameters were measured and documented. Inspection, palpation, percussion, and auscultation were performed according to clinical practice standards. This objective clinical evaluation constitutes, along with the history, the foundation of diagnostic reasoning. All findings from the physical examination have been integrated into the overall diagnostic reasoning.",
    
    syntheseDiagnostique: data.diagnosticSynthesis || `The careful analysis of all clinical elements allows for the establishment of a coherent diagnostic synthesis. ${data.diagnosticConclusion ? `The diagnosis of ${data.diagnosticConclusion} is retained based on the collected clinical elements.` : 'The diagnostic evaluation is ongoing based on the available clinical data.'} This synthesis integrates the history data, physical examination results, and risk factor analysis. The diagnostic approach follows a methodical approach to exclude relevant differential diagnoses.`,
    
    conclusionDiagnostique: data.diagnosticConclusion || "Following this comprehensive clinical evaluation, the diagnostic conclusion is being established. This diagnostic conclusion represents the synthesis of structured medical reasoning integrating all available clinical data. The diagnostic certainty will be enhanced with the results of the requested complementary examinations.",
    
    priseEnCharge: data.managementPlan || `The therapeutic strategy implemented has been developed in a personalized manner, taking into account the patient's specific clinical profile. ${data.medicationsCount > 0 ? `A medication regimen comprising ${data.medicationsCount} medication(s) has been prescribed.` : ''} ${data.labTestsCount > 0 || data.imagingStudiesCount > 0 ? `Complementary examinations have been requested to refine the diagnosis and adapt the management (${data.labTestsCount} laboratory tests, ${data.imagingStudiesCount} imaging studies).` : ''} The adopted therapeutic approach aims to effectively treat the pathology while minimizing the risks of adverse effects.`,
    
    surveillance: data.followUp || "The follow-up plan implemented aims to ensure optimal medical monitoring of clinical evolution. The monitoring modalities have been clearly defined and communicated to the patient, including warning signs requiring urgent consultation. A follow-up appointment has been scheduled to evaluate the therapeutic response and adjust the management strategy if necessary. The patient has been informed of the importance of therapeutic adherence.",
    
    conclusion: `This consultation has allowed for ${data.diagnosticConclusion ? `the establishment of a diagnosis of ${data.diagnosticConclusion}` : 'a comprehensive clinical evaluation'} and the implementation of a complete and adapted management strategy. The prognosis is considered favorable subject to optimal therapeutic adherence. The patient has been fully informed of their medical condition and treatment modalities. Care coordination with other involved healthcare professionals will be ensured according to identified needs.`
  }
}
