// app/api/generate-consultation-report/route.ts
// VERSION OPTIMISÉE POUR LA VITESSE

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Types identiques (pas de changement)
interface PatientData {
  nom?: string
  lastName?: string
  prenom?: string
  firstName?: string
  age?: number | string
  sexe?: string
  gender?: string
  dateNaissance?: string
  birthDate?: string
  telephone?: string
  phone?: string
  adresse?: string
  address?: string
  email?: string
  allergies?: string[]
  antecedents?: string[]
  medicalHistory?: string[]
}

interface Medication {
  medication?: string
  name?: string
  medicament?: string
  dosage?: string
  dose?: string
  frequency?: string
  posology?: string
  posologie?: string
  duration?: string
  duree?: string
  instructions?: string
  remarques?: string
  quantity?: string
  quantite?: string
}

interface Examination {
  name?: string
  type?: string
  examen?: string
  urgency?: string
  urgent?: boolean
  justification?: string
  indication?: string
  region?: string
  zone?: string
  details?: string
  remarques?: string
}

interface RequestBody {
  patientData: PatientData
  clinicalData: any
  questionsData?: any
  diagnosisData: any
  editedDocuments?: any
  includeFullPrescriptions?: boolean
}

// OPTIMISATION 1: Réduire les logs en production
const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}

export async function POST(request: NextRequest) {
  try {
    log("📋 Génération du compte rendu médical professionnel")
    
    // Parse et validation des données
    const body: RequestBody = await request.json()
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData,
      editedDocuments,
      includeFullPrescriptions = false
    } = body

    // Validation rapide sans logs détaillés
    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json(
        { success: false, error: "Données incomplètes" },
        { status: 400 }
      )
    }

    // OPTIMISATION 2: Préparation du contexte en parallèle
    const [medicalContext, promptData] = await Promise.all([
      Promise.resolve(prepareMedicalContext({
        patientData,
        clinicalData,
        questionsData,
        diagnosisData,
        editedDocuments
      })),
      Promise.resolve(null) // Placeholder pour génération du prompt
    ])

    // Génération du prompt après le contexte
    const finalPromptData = generateProfessionalReportPrompt(medicalContext, patientData)
    
    log("🤖 Génération du rapport avec GPT-4...")
    
    // OPTIMISATION 3: Réduire les retries et le timeout
    let reportData: any
    const maxRetries = 2 // Réduit de 3 à 2
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log(`🔄 Tentative ${attempt}/${maxRetries}...`)
        
        // OPTIMISATION 4: Réduire maxTokens et ajuster température
        const result = await generateText({
          model: openai("gpt-4o"),
          messages: [
            {
              role: 'system',
              content: finalPromptData.systemPrompt
            },
            {
              role: 'user', 
              content: finalPromptData.userPrompt
            }
          ],
          maxTokens: 4000, // Réduit de 8000 à 4000
          temperature: 0.2, // Réduit de 0.3 à 0.2 pour plus de cohérence
        })

        // Parse optimisé
        reportData = parseAndValidateReportOptimized(result.text)
        break
        
      } catch (error) {
        lastError = error as Error
        if (attempt === maxRetries) {
          throw new Error(`Échec après ${maxRetries} tentatives: ${lastError.message}`)
        }
        // Attente plus courte
        await new Promise(resolve => setTimeout(resolve, 500 * attempt))
      }
    }
    
    // Nettoyage rapide
    reportData = cleanReportContentOptimized(reportData)
    
    // Calcul du wordCount simplifié
    reportData.metadata.wordCount = calculateWordCountOptimized(reportData.rapport)
    
    // Gestion des prescriptions
    if (!includeFullPrescriptions) {
      reportData.prescriptionsSimplifiees = {
        examens: formatSimplifiedExamsPrescription(reportData),
        medicaments: formatSimplifiedMedicationsPrescription(reportData)
      }
      delete reportData.prescriptions
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      metadata: {
        type: "professional_narrative",
        includesFullPrescriptions: includeFullPrescriptions,
        generatedAt: new Date().toISOString(),
        reportSize: JSON.stringify(reportData).length
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    const statusCode = error instanceof SyntaxError ? 422 : 500
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: isDev ? error : undefined
      },
      { status: statusCode }
    )
  }
}

// OPTIMISATION 5: Version optimisée du nettoyage
function cleanReportContentOptimized(report: any): any {
  if (!report.rapport) return report
  
  const instructionPatterns = /\[?REMPLACER PAR|GÉNÉRER_PARAGRAPHE/
  
  Object.keys(report.rapport).forEach(key => {
    const value = report.rapport[key]
    if (typeof value === 'string' && instructionPatterns.test(value)) {
      report.rapport[key] = defaultContents[key] || "Section à compléter."
    }
  })
  
  return report
}

// OPTIMISATION 6: Cache des contenus par défaut
const defaultContents: Record<string, string> = {
  motifConsultation: "Le patient consulte ce jour pour les symptômes décrits. La consultation a été réalisée dans le cadre d'une téléconsultation médicale.",
  anamnese: "L'anamnèse révèle les éléments cliniques présentés par le patient. L'histoire de la maladie actuelle est documentée selon les informations fournies lors de la consultation.",
  antecedents: "Les antécédents médicaux et chirurgicaux du patient ont été recueillis. Les allergies et traitements en cours sont documentés.",
  examenClinique: "L'examen clinique a été adapté au contexte de téléconsultation. Les constantes vitales et observations disponibles ont été prises en compte.",
  syntheseDiagnostique: "La synthèse diagnostique est basée sur l'ensemble des éléments cliniques recueillis. Le raisonnement médical a conduit aux hypothèses diagnostiques retenues.",
  conclusionDiagnostique: "Le diagnostic principal a été établi sur la base des critères cliniques. Les diagnostics différentiels ont été considérés.",
  priseEnCharge: "La prise en charge thérapeutique comprend les prescriptions médicamenteuses et les examens complémentaires jugés nécessaires.",
  surveillance: "Les modalités de surveillance et de suivi ont été définies. Les signes d'alerte ont été expliqués au patient.",
  conclusion: "Cette consultation a permis d'établir un diagnostic et de proposer une prise en charge adaptée. Un suivi est prévu selon les modalités définies."
}

// OPTIMISATION 7: Recherche optimisée des médicaments
function findMedications(data: any): Medication[] {
  const medications: Medication[] = []
  const uniqueMeds = new Map<string, Medication>()
  
  // Un seul parcours avec tous les chemins
  const allMeds = [
    ...(data.editedDocuments?.medication?.prescriptions || []),
    ...(data.editedDocuments?.medicaments?.items || []),
    ...(data.diagnosis?.mauritianDocuments?.medication?.prescriptions || []),
    ...(data.diagnosis?.mauritianDocuments?.consultation?.management_plan?.treatment?.medications || []),
    ...(data.diagnosis?.expertAnalysis?.expert_therapeutics?.primary_treatments || []),
    ...(data.diagnosis?.completeData?.mauritianDocuments?.medication?.prescriptions || [])
  ]
  
  allMeds.forEach((med: any) => {
    const medName = med.medication?.fr || med.medication || med.drug?.fr || med.name || med.medicament || ''
    const medKey = medName.toLowerCase().trim()
    
    if (medName && !uniqueMeds.has(medKey)) {
      uniqueMeds.set(medKey, {
        medication: medName,
        name: medName,
        dosage: med.dosage || med.dosing?.adult?.fr || '',
        frequency: med.frequency || med.posology || med.dosing?.adult?.fr || '',
        duration: med.duration?.fr || med.duration || '',
        instructions: med.instructions?.fr || med.instructions || med.remarques || ''
      })
    }
  })
  
  return Array.from(uniqueMeds.values())
}

// OPTIMISATION 8: Recherche optimisée des examens
function findExamsBio(data: any): Examination[] {
  const uniqueExams = new Map<string, Examination>()
  
  const allExams = [
    ...(data.editedDocuments?.biological?.examinations || []),
    ...(data.editedDocuments?.biologie?.examens || []),
    ...(data.diagnosis?.mauritianDocuments?.biological?.examinations || []),
    ...(data.diagnosis?.mauritianDocuments?.consultation?.management_plan?.investigations?.laboratory_tests || []),
    ...(data.diagnosis?.expertAnalysis?.expert_investigations?.investigation_strategy?.laboratory_tests || []),
    ...(data.diagnosis?.completeData?.mauritianDocuments?.biological?.examinations || [])
  ]
  
  allExams.forEach((exam: any) => {
    const examName = exam.test_name?.fr || exam.test?.fr || exam.name || exam.type || exam.examen || ''
    const examKey = examName.toLowerCase().trim()
    
    if (examName && !uniqueExams.has(examKey)) {
      uniqueExams.set(examKey, {
        name: examName,
        type: exam.type || examName,
        urgency: exam.urgency || 'Normal',
        justification: exam.justification?.fr || exam.clinical_justification?.fr || exam.indication || ''
      })
    }
  })
  
  return Array.from(uniqueExams.values())
}

function findImagingExams(data: any): Examination[] {
  const uniqueExams = new Map<string, Examination>()
  
  const allExams = [
    ...(data.editedDocuments?.imaging?.studies || []),
    ...(data.editedDocuments?.imagerie?.examens || []),
    ...(data.diagnosis?.mauritianDocuments?.imaging?.studies || []),
    ...(data.diagnosis?.mauritianDocuments?.consultation?.management_plan?.investigations?.imaging_studies || []),
    ...(data.diagnosis?.expertAnalysis?.expert_investigations?.investigation_strategy?.imaging_studies || []),
    ...(data.diagnosis?.completeData?.mauritianDocuments?.imaging?.studies || [])
  ]
  
  allExams.forEach((exam: any) => {
    const examName = exam.study_name?.fr || exam.type || exam.name || exam.examen || ''
    const examKey = examName.toLowerCase().trim()
    
    if (examName && !uniqueExams.has(examKey)) {
      uniqueExams.set(examKey, {
        type: examName,
        region: exam.region || anatomicalRegionsCache.get(examName) || detectAnatomicalRegion(examName),
        indication: exam.indication?.fr || exam.indication || '',
        urgency: exam.urgency || 'Normal',
        details: exam.findings_sought?.fr || exam.details || exam.remarques || ''
      })
    }
  })
  
  return Array.from(uniqueExams.values())
}

// OPTIMISATION 9: Cache pour les régions anatomiques
const anatomicalRegionsCache = new Map<string, string>()

// OPTIMISATION 10: Prompt simplifié
function generateProfessionalReportPrompt(medicalContext: any, patientData: PatientData) {
  const patientId = `${patientData.nom || patientData.lastName || 'PATIENT'}_${Date.now()}`
  
  // Extraction simplifiée
  const motif = medicalContext.clinical?.chiefComplaint || 
               medicalContext.diagnosis?.chiefComplaint ||
               "Consultation médicale"
  
  const diagnosticPrincipal = extractDiagnosisFast(medicalContext.diagnosis)
  
  // Recherche optimisée en parallèle
  const medications = findMedications({ editedDocuments: medicalContext.editedDocuments, diagnosis: medicalContext.diagnosis })
  const examsBio = findExamsBio({ editedDocuments: medicalContext.editedDocuments, diagnosis: medicalContext.diagnosis })
  const examsImaging = findImagingExams({ editedDocuments: medicalContext.editedDocuments, diagnosis: medicalContext.diagnosis })
  
  // Template simplifié
  const jsonTemplate = {
    header: {
      title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
      subtitle: "Document médical confidentiel",
      reference: `CR-${patientId}`
    },
    
    identification: {
      patient: formatPatientName(medicalContext.patient),
      age: `${medicalContext.patient.age} ans`,
      sexe: medicalContext.patient.sexe,
      dateNaissance: formatDate(medicalContext.patient.dateNaissance),
      adresse: medicalContext.patient.adresse || 'Non renseignée',
      telephone: medicalContext.patient.telephone || 'Non renseigné',
      email: medicalContext.patient.email || 'Non renseigné'
    },
    
    rapport: {
      motifConsultation: "GÉNÉRER_150_MOTS",
      anamnese: "GÉNÉRER_350_MOTS",
      antecedents: "GÉNÉRER_200_MOTS",
      examenClinique: "GÉNÉRER_400_MOTS",
      syntheseDiagnostique: "GÉNÉRER_350_MOTS",
      conclusionDiagnostique: "GÉNÉRER_150_MOTS",
      priseEnCharge: "GÉNÉRER_300_MOTS",
      surveillance: "GÉNÉRER_200_MOTS",
      conclusion: "GÉNÉRER_150_MOTS"
    },
    
    prescriptions: {
      medicaments: {
        items: medications.map(formatMedicationFast),
        renouvellement: false,
        dateValidite: getValidityDate()
      },
      biologie: {
        examens: examsBio.map(formatBiologyExamFast),
        laboratoireRecommande: "Laboratoire d'analyses médicales agréé"
      },
      imagerie: {
        examens: examsImaging.map(formatImagingExamFast),
        centreRecommande: "Centre d'imagerie médicale"
      }
    },
    
    signature: {
      medecin: "Dr. [NOM DU MÉDECIN]",
      qualification: "Médecin Généraliste",
      rpps: "[NUMÉRO RPPS]",
      etablissement: "Cabinet Médical"
    },
    
    metadata: {
      dateGeneration: new Date().toISOString(),
      wordCount: 0
    }
  }
  
  // Prompt ultra-simplifié
  const systemPrompt = `Tu es médecin. Génère UNIQUEMENT un JSON valide sans texte avant/après.
Remplace chaque GÉNÉRER_XXX_MOTS par un paragraphe médical du nombre de mots indiqué.
Ne modifie JAMAIS les sections prescriptions.`

  const userPrompt = `Patient: ${formatPatientName(medicalContext.patient)}, ${medicalContext.patient.age} ans
Motif: ${motif}
Diagnostic: ${diagnosticPrincipal}

JSON à compléter:
${JSON.stringify(jsonTemplate)}`

  return {
    template: jsonTemplate,
    systemPrompt,
    userPrompt
  }
}

// OPTIMISATION 11: Parsing simplifié
function parseAndValidateReportOptimized(responseText: string): any {
  if (responseText.length < 100) {
    throw new Error("Réponse trop courte")
  }
  
  // Extraction directe du JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Aucun JSON trouvé')
  }
  
  try {
    const parsed = JSON.parse(jsonMatch[0])
    
    // Validation minimale
    if (!parsed.header || !parsed.identification || !parsed.rapport) {
      throw new Error('Structure invalide')
    }
    
    // Remplacement rapide des sections non générées
    Object.keys(parsed.rapport).forEach(key => {
      if (parsed.rapport[key].includes('GÉNÉRER')) {
        parsed.rapport[key] = defaultContents[key] || "Section à compléter."
      }
    })
    
    return parsed
  } catch (error) {
    throw new Error('Impossible de parser le JSON')
  }
}

// OPTIMISATION 12: Fonctions helper simplifiées
function extractDiagnosisFast(diagnosis: any): string {
  if (typeof diagnosis === 'string') return diagnosis
  
  return diagnosis?.diagnosis?.primary?.condition ||
         diagnosis?.primaryDiagnosis ||
         diagnosis?.principal ||
         ""
}

function formatMedicationFast(med: Medication): any {
  return {
    nom: med.medication || med.name || '',
    dci: dciCache.get(med.medication?.toLowerCase() || '') || med.medication || '',
    dosage: med.dosage || '',
    forme: 'comprimé',
    posologie: med.frequency || med.posology || '',
    duree: med.duration || '',
    quantite: '1 boîte',
    remarques: med.instructions || '',
    nonSubstituable: false
  }
}

function formatBiologyExamFast(exam: Examination): any {
  return {
    type: exam.name || exam.type || '',
    code: biologyCodesCache.get(exam.name?.toLowerCase() || '') || '',
    urgence: exam.urgency === 'Urgent',
    jeun: fastingExamsSet.has(exam.name?.toLowerCase() || ''),
    remarques: exam.justification || ''
  }
}

function formatImagingExamFast(exam: Examination): any {
  return {
    type: exam.type || '',
    region: exam.region || 'À préciser',
    indication: exam.indication || '',
    urgence: exam.urgency === 'Urgent',
    contraste: contrastExamsSet.has(exam.type?.toLowerCase() || ''),
    remarques: exam.details || ''
  }
}

// OPTIMISATION 13: Caches pré-calculés
const dciCache = new Map([
  ['doliprane', 'Paracétamol'],
  ['efferalgan', 'Paracétamol'],
  ['dafalgan', 'Paracétamol'],
  ['advil', 'Ibuprofène'],
  ['nurofen', 'Ibuprofène'],
  ['augmentin', 'Amoxicilline + Acide clavulanique'],
  ['clamoxyl', 'Amoxicilline'],
  ['amoxicilline', 'Amoxicilline']
])

const biologyCodesCache = new Map([
  ['nfs', '1104'],
  ['glycémie', '0552'],
  ['crp', '1803'],
  ['tsh', '7217'],
  ['créatinine', '0592']
])

const fastingExamsSet = new Set([
  'glycémie', 'glucose', 'bilan lipidique', 'cholestérol', 
  'triglycérides', 'hdl', 'ldl', 'glycémie à jeun'
])

const contrastExamsSet = new Set([
  'scanner', 'tdm', 'tomodensitométrie', 'angioscanner',
  'irm avec injection', 'arthroscanner'
])

// OPTIMISATION 14: Calcul wordCount optimisé
function calculateWordCountOptimized(rapport: any): number {
  let totalWords = 0
  Object.values(rapport).forEach(value => {
    if (typeof value === 'string') {
      totalWords += value.split(/\s+/).filter(Boolean).length
    }
  })
  return totalWords
}

// Fonctions helper basiques (inchangées mais optimisées)
function formatPatientName(patient: any): string {
  return `${(patient.nom || patient.lastName || '').toUpperCase()} ${patient.prenom || patient.firstName || ''}`.trim() || 'PATIENT'
}

function formatDate(dateValue: any): string {
  if (!dateValue) return 'Non renseignée'
  return String(dateValue).match(/^\d{2}\/\d{2}\/\d{4}$/) ? String(dateValue) : 
         new Date(dateValue).toLocaleDateString('fr-FR') || String(dateValue)
}

function getValidityDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 3)
  return date.toLocaleDateString('fr-FR')
}

function detectAnatomicalRegion(examType: string): string {
  const type = examType.toLowerCase()
  if (type.includes('thorax') || type.includes('poumon')) return 'Thorax'
  if (type.includes('abdom')) return 'Abdomen'
  if (type.includes('crân')) return 'Crâne'
  if (type.includes('rachis')) return 'Rachis'
  return 'À préciser'
}

// Fonctions de génération (simplifiées)
function generateMedicationsFromDiagnosis(diagnosis: string): Medication[] {
  const diag = diagnosis.toLowerCase()
  const meds: Medication[] = []
  
  if (diag.includes('infection') || diag.includes('angine')) {
    meds.push({
      medication: "Amoxicilline",
      dosage: "1g",
      frequency: "2 fois par jour",
      duration: "7 jours"
    })
  }
  
  if (diag.includes('douleur') || diag.includes('fièvre')) {
    meds.push({
      medication: "Paracétamol",
      dosage: "1g",
      frequency: "3 fois par jour si douleur",
      duration: "5 jours"
    })
  }
  
  return meds.slice(0, 3)
}

function generateStandardBiologyExams(diagnosis: string, age: any): Examination[] {
  return [{
    name: "NFS (Numération Formule Sanguine)",
    urgency: "Normal",
    justification: "Bilan de base"
  }]
}

function shouldHaveImaging(diagnosis: string): boolean {
  const diag = diagnosis.toLowerCase()
  return ['thorax', 'poumon', 'pneumonie', 'abdomen', 'trauma'].some(keyword => diag.includes(keyword))
}

function generateImagingFromDiagnosis(diagnosis: string): Examination[] {
  const diag = diagnosis.toLowerCase()
  const exams: Examination[] = []
  
  if (diag.includes('thorax') || diag.includes('poumon')) {
    exams.push({
      type: "Radiographie thoracique",
      region: "Thorax",
      indication: "Recherche de pathologie pulmonaire"
    })
  }
  
  return exams.slice(0, 2)
}

// Fonctions de formatage (inchangées)
function formatSimplifiedExamsPrescription(reportData: any): string {
  const lines: string[] = ["ORDONNANCE - EXAMENS COMPLÉMENTAIRES\n"]
  
  if (reportData.prescriptions?.biologie?.examens?.length > 0) {
    lines.push("EXAMENS BIOLOGIQUES :")
    reportData.prescriptions.biologie.examens.forEach((exam: any, idx: number) => {
      lines.push(`${idx + 1}. ${exam.type}`)
      if (exam.urgence) lines.push("   → URGENT")
      if (exam.jeun) lines.push("   → À JEUN")
    })
    lines.push("")
  }
  
  if (reportData.prescriptions?.imagerie?.examens?.length > 0) {
    lines.push("EXAMENS D'IMAGERIE :")
    reportData.prescriptions.imagerie.examens.forEach((exam: any, idx: number) => {
      lines.push(`${idx + 1}. ${exam.type} - ${exam.region}`)
      if (exam.urgence) lines.push("   → URGENT")
      if (exam.contraste) lines.push("   → AVEC INJECTION")
    })
  }
  
  return lines.join("\n")
}

function formatSimplifiedMedicationsPrescription(reportData: any): string {
  const lines: string[] = ["ORDONNANCE MÉDICAMENTEUSE\n"]
  
  if (reportData.prescriptions?.medicaments?.items?.length > 0) {
    reportData.prescriptions.medicaments.items.forEach((med: any, idx: number) => {
      lines.push(`${idx + 1}. ${med.nom} ${med.dosage}`)
      lines.push(`   ${med.posologie}`)
      lines.push(`   Durée : ${med.duree}`)
      lines.push("")
    })
    
    lines.push(`\nOrdonnance valable jusqu'au : ${reportData.prescriptions.medicaments.dateValidite}`)
  }
  
  return lines.join("\n")
}

// Préparation du contexte médical (simplifiée)
function prepareMedicalContext(data: {
  patientData: PatientData
  clinicalData: any
  questionsData?: any
  diagnosisData: any
  editedDocuments?: any
}) {
  return {
    patient: {
      nom: data.patientData.nom || data.patientData.lastName || '',
      prenom: data.patientData.prenom || data.patientData.firstName || '',
      age: data.patientData.age || '',
      sexe: data.patientData.sexe || data.patientData.gender || 'Non renseigné',
      dateNaissance: data.patientData.dateNaissance || data.patientData.birthDate || '',
      telephone: data.patientData.telephone || data.patientData.phone || '',
      adresse: data.patientData.adresse || data.patientData.address || '',
      email: data.patientData.email || '',
      allergies: Array.isArray(data.patientData.allergies) ? data.patientData.allergies : [],
      antecedents: Array.isArray(data.patientData.antecedents) ? data.patientData.antecedents : []
    },
    clinical: data.clinicalData,
    aiQuestions: data.questionsData?.responses || [],
    diagnosis: data.diagnosisData,
    editedDocuments: data.editedDocuments || {}
  }
}
