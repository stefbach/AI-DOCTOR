// app/api/generate-consultation-report/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Types pour une meilleure structure
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
  dosage?: string
  frequency?: string
  posology?: string
  duration?: string
  instructions?: string
}

interface Examination {
  name?: string
  type?: string
  urgency?: string
  justification?: string
  indication?: string
  region?: string
  details?: string
}

interface RequestBody {
  patientData: PatientData
  clinicalData: any
  questionsData?: any
  diagnosisData: any
  editedDocuments?: any
  includeFullPrescriptions?: boolean
}

export async function POST(request: NextRequest) {
  try {
    console.log("📋 Génération du compte rendu médical professionnel")
    
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

    // Validation des données requises
    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json(
        { success: false, error: "Données incomplètes" },
        { status: 400 }
      )
    }

    // Log pour debug de la structure
    console.log("📊 Structure diagnosisData:", JSON.stringify(diagnosisData, null, 2))

    // Préparation du contexte médical unifié
    const medicalContext = prepareMedicalContext({
      patientData,
      clinicalData,
      questionsData,
      diagnosisData,
      editedDocuments
    })

    // Génération du prompt structuré
    const prompt = generateProfessionalReportPrompt(medicalContext, patientData)

    console.log("🤖 Génération du rapport avec GPT-4...")
    
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt,
      maxTokens: 8000,
      temperature: 0.3,
    })

    console.log("✅ Rapport généré avec succès")

    // Parse et validation du rapport
    const reportData = parseAndValidateReport(result.text)
    
    // Enrichissement des métadonnées
    reportData.metadata.wordCount = calculateWordCount(reportData.rapport)
    
    // Gestion des prescriptions selon le format demandé
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
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("❌ Erreur lors de la génération du rapport:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    const statusCode = error instanceof SyntaxError ? 422 : 500
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: statusCode }
    )
  }
}

// Fonction pour préparer le contexte médical unifié
function prepareMedicalContext(data: {
  patientData: PatientData
  clinicalData: any
  questionsData?: any
  diagnosisData: any
  editedDocuments?: any
}) {
  // Normalisation des données patient
  const normalizedPatient = {
    nom: data.patientData.nom || data.patientData.lastName || '',
    prenom: data.patientData.prenom || data.patientData.firstName || '',
    age: data.patientData.age || '',
    sexe: data.patientData.sexe || data.patientData.gender || 'Non renseigné',
    dateNaissance: data.patientData.dateNaissance || data.patientData.birthDate || '',
    telephone: data.patientData.telephone || data.patientData.phone || '',
    adresse: data.patientData.adresse || data.patientData.address || '',
    email: data.patientData.email || '',
    allergies: data.patientData.allergies || data.patientData.medicalHistory?.allergies || [],
    antecedents: data.patientData.antecedents || data.patientData.medicalHistory || []
  }

  return {
    patient: normalizedPatient,
    clinical: data.clinicalData,
    aiQuestions: data.questionsData?.responses || [],
    diagnosis: data.diagnosisData,
    editedDocuments: data.editedDocuments || {}
  }
}

// Fonction pour générer le prompt structuré
function generateProfessionalReportPrompt(medicalContext: any, patientData: PatientData): string {
  const patientId = `${patientData.nom || patientData.lastName || 'PATIENT'}_${Date.now()}`
  
  return `Tu es un médecin senior expérimenté rédigeant un compte rendu de consultation professionnel.

CONTEXTE MÉDICAL COMPLET :
${JSON.stringify(medicalContext, null, 2)}

INSTRUCTIONS CRITIQUES :
1. Rédige un compte rendu en PROSE NARRATIVE fluide et professionnelle
2. Utilise la terminologie médicale française appropriée
3. Structure les prescriptions de manière détaillée et complète
4. Ne retourne QU'UN SEUL objet JSON valide, sans formatage markdown

GÉNÈRE LE RAPPORT SUIVANT :

{
  "header": {
    "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
    "subtitle": "Document médical confidentiel",
    "reference": "CR-${patientId}"
  },
  
  "identification": {
    "patient": "${formatPatientName(medicalContext.patient)}",
    "age": "${medicalContext.patient.age} ans",
    "sexe": "${medicalContext.patient.sexe}",
    "dateNaissance": "${formatDate(medicalContext.patient.dateNaissance)}",
    "adresse": "${medicalContext.patient.adresse || 'Non renseignée'}",
    "telephone": "${medicalContext.patient.telephone || 'Non renseigné'}",
    "email": "${medicalContext.patient.email || 'Non renseigné'}"
  },
  
  "rapport": {
    "motifConsultation": "[PROSE] Décrire le motif principal de consultation",
    "anamnese": "[PROSE NARRATIVE] Histoire détaillée de la maladie actuelle",
    "antecedents": "[PROSE] Antécédents médicaux et contexte du patient",
    "examenClinique": "[PROSE AU PRÉSENT] Description de l'examen clinique",
    "syntheseDiagnostique": "[PROSE] Analyse et raisonnement diagnostique",
    "conclusionDiagnostique": "[PROSE] Diagnostic principal retenu",
    "priseEnCharge": "[PROSE] Stratégie thérapeutique détaillée",
    "surveillance": "[PROSE] Plan de suivi et consignes",
    "conclusion": "[PROSE] Synthèse finale"
  },
  
  "prescriptions": {
    "medicaments": {
      "items": [${generateMedicationItems(medicalContext)}],
      "renouvellement": ${shouldAllowRenewal(medicalContext.diagnosis)},
      "dateValidite": "${getValidityDate()}"
    },
    "biologie": {
      "examens": [${generateBiologyItems(medicalContext)}],
      "laboratoireRecommande": "Laboratoire d'analyses médicales agréé"
    },
    "imagerie": {
      "examens": [${generateImagingItems(medicalContext)}],
      "centreRecommande": "Centre d'imagerie médicale"
    }
  },
  
  "signature": {
    "medecin": "Dr. [NOM DU MÉDECIN]",
    "qualification": "Médecin Généraliste",
    "rpps": "[NUMÉRO RPPS]",
    "etablissement": "Cabinet Médical"
  },
  
  "metadata": {
    "dateGeneration": "${new Date().toISOString()}",
    "wordCount": 0
  }
}`
}

// Génération des items de médicaments
function generateMedicationItems(context: any): string {
  const medications = context.editedDocuments?.medication?.prescriptions || 
                     context.diagnosis?.treatment?.medications || []

  if (medications.length === 0) return ''

  return medications.map((med: Medication) => {
    const medicationName = med.medication || med.name || ''
    return `{
      "nom": "${medicationName}",
      "dci": "${extractDCI(medicationName)}",
      "dosage": "${med.dosage || ''}",
      "forme": "${detectMedicationForm(medicationName)}",
      "posologie": "${med.frequency || med.posology || ''}",
      "duree": "${med.duration || ''}",
      "quantite": "${calculateQuantity(med)}",
      "remarques": "${med.instructions || ''}",
      "nonSubstituable": false
    }`
  }).join(',\n        ')
}

// Génération des examens biologiques
function generateBiologyItems(context: any): string {
  const exams = context.editedDocuments?.biology?.examinations || 
                context.diagnosis?.examinations?.laboratory || []

  if (exams.length === 0) return ''

  return exams.map((exam: Examination) => {
    const examName = exam.name || exam.type || ''
    return `{
      "type": "${examName}",
      "code": "${getBiologyCode(examName)}",
      "urgence": ${exam.urgency === 'Urgent'},
      "jeun": ${requiresFasting(examName)},
      "remarques": "${exam.justification || ''}"
    }`
  }).join(',\n        ')
}

// Génération des examens d'imagerie
function generateImagingItems(context: any): string {
  const exams = context.editedDocuments?.paraclinical?.examinations || 
                context.diagnosis?.examinations?.imaging || []

  if (exams.length === 0) return ''

  return exams.map((exam: Examination) => {
    const examType = exam.type || ''
    return `{
      "type": "${examType}",
      "region": "${exam.region || detectAnatomicalRegion(examType)}",
      "indication": "${exam.indication || exam.justification || ''}",
      "urgence": ${exam.urgency === 'Urgent'},
      "contraste": ${requiresContrast(examType)},
      "remarques": "${exam.details || ''}"
    }`
  }).join(',\n        ')
}

// Fonctions utilitaires
function formatPatientName(patient: any): string {
  const nom = patient.nom || ''
  const prenom = patient.prenom || ''
  return `${nom} ${prenom}`.trim() || 'Patient'
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Non renseignée'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR')
  } catch {
    return dateString
  }
}

function extractDCI(medicationName: string): string {
  // Logique simplifiée - en production, utiliser une base de données
  const commonDCIs: Record<string, string> = {
    'doliprane': 'Paracétamol',
    'efferalgan': 'Paracétamol',
    'advil': 'Ibuprofène',
    'augmentin': 'Amoxicilline + Acide clavulanique'
  }
  
  const lowerName = medicationName.toLowerCase()
  for (const [brand, dci] of Object.entries(commonDCIs)) {
    if (lowerName.includes(brand)) return dci
  }
  
  return 'À préciser'
}

function detectMedicationForm(name: string): string {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('sirop')) return 'sirop'
  if (lowerName.includes('gel') || lowerName.includes('gélule')) return 'gélule'
  if (lowerName.includes('injectable')) return 'solution injectable'
  if (lowerName.includes('crème')) return 'crème'
  if (lowerName.includes('pommade')) return 'pommade'
  if (lowerName.includes('collyre')) return 'collyre'
  if (lowerName.includes('spray')) return 'spray'
  return 'comprimé'
}

function calculateQuantity(med: Medication): string {
  // Calcul basique de la quantité nécessaire
  const duration = med.duration || ''
  const frequency = med.frequency || med.posology || ''
  
  // Logique simplifiée - à améliorer selon les besoins
  if (duration.includes('7 jours') && frequency.includes('3 fois')) {
    return '1 boîte de 21 comprimés'
  }
  
  return '1 boîte'
}

function getBiologyCode(examName: string): string {
  // Codes NABM simplifiés
  const codes: Record<string, string> = {
    'nfs': '1104',
    'glycémie': '1106',
    'crp': '1803',
    'tsh': '1234'
  }
  
  const lowerName = examName.toLowerCase()
  for (const [exam, code] of Object.entries(codes)) {
    if (lowerName.includes(exam)) return code
  }
  
  return ''
}

function requiresFasting(examName: string): boolean {
  const fastingExams = ['glycémie', 'bilan lipidique', 'cholestérol', 'triglycérides', 'hdl', 'ldl']
  const lowerName = examName.toLowerCase()
  return fastingExams.some(exam => lowerName.includes(exam))
}

function requiresContrast(examType: string): boolean {
  const contrastExams = ['scanner', 'angioscanner', 'irm avec injection', 'arthroscanner']
  const lowerType = examType.toLowerCase()
  return contrastExams.some(exam => lowerType.includes(exam))
}

function detectAnatomicalRegion(examType: string): string {
  const lowerType = examType.toLowerCase()
  
  const regions: Record<string, string> = {
    'thorax': 'Thorax',
    'poumon': 'Thorax',
    'thoracique': 'Thorax',
    'abdom': 'Abdomen',
    'ventre': 'Abdomen',
    'crân': 'Crâne',
    'cérébr': 'Crâne',
    'tête': 'Crâne',
    'rachis': 'Rachis',
    'colonne': 'Rachis',
    'genou': 'Genou',
    'épaule': 'Épaule',
    'hanche': 'Hanche',
    'cheville': 'Cheville'
  }
  
  for (const [key, value] of Object.entries(regions)) {
    if (lowerType.includes(key)) return value
  }
  
  return 'À préciser'
}

function shouldAllowRenewal(diagnosisData: any): boolean {
  const chronicConditions = ['hypertension', 'diabète', 'asthme', 'bpco', 'insuffisance cardiaque']
  
  // Recherche du diagnostic dans différentes propriétés possibles
  const possibleDiagnosisFields = [
    diagnosisData?.diagnosis,
    diagnosisData?.primaryDiagnosis,
    diagnosisData?.finalDiagnosis,
    diagnosisData?.diagnosticHypothesis,
    diagnosisData?.mainDiagnosis
  ]
  
  // Convertir en string et vérifier
  const diagnosisText = possibleDiagnosisFields
    .filter(field => field != null)
    .map(field => String(field).toLowerCase())
    .join(' ')
  
  return chronicConditions.some(condition => diagnosisText.includes(condition))
}

function getValidityDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 3) // 3 mois de validité standard
  return date.toLocaleDateString('fr-FR')
}

function parseAndValidateReport(responseText: string): any {
  try {
    // Nettoyer la réponse de tout formatage markdown
    let cleanedResponse = responseText.trim()
    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
    
    const parsed = JSON.parse(cleanedResponse)
    
    // Validation de la structure minimale
    if (!parsed.header || !parsed.identification || !parsed.rapport) {
      throw new Error('Structure du rapport invalide')
    }
    
    return parsed
  } catch (error) {
    console.error('Erreur de parsing:', error)
    throw new Error('Impossible de parser le rapport généré')
  }
}

function calculateWordCount(rapport: any): number {
  const allText = Object.values(rapport)
    .filter(value => typeof value === 'string')
    .join(' ')
  
  return allText.split(/\s+/).filter(word => word.length > 0).length
}

function formatSimplifiedExamsPrescription(reportData: any): string {
  const lines: string[] = ["ORDONNANCE - EXAMENS COMPLÉMENTAIRES\n"]
  
  // Examens biologiques
  if (reportData.prescriptions?.biologie?.examens?.length > 0) {
    lines.push("EXAMENS BIOLOGIQUES :")
    reportData.prescriptions.biologie.examens.forEach((exam: any, idx: number) => {
      lines.push(`${idx + 1}. ${exam.type}`)
      if (exam.urgence) lines.push("   → URGENT")
      if (exam.jeun) lines.push("   → À JEUN")
      if (exam.remarques) lines.push(`   → ${exam.remarques}`)
    })
    lines.push("")
  }
  
  // Examens d'imagerie
  if (reportData.prescriptions?.imagerie?.examens?.length > 0) {
    lines.push("EXAMENS D'IMAGERIE :")
    reportData.prescriptions.imagerie.examens.forEach((exam: any, idx: number) => {
      lines.push(`${idx + 1}. ${exam.type} - ${exam.region}`)
      if (exam.urgence) lines.push("   → URGENT")
      if (exam.contraste) lines.push("   → AVEC INJECTION DE PRODUIT DE CONTRASTE")
      if (exam.indication) lines.push(`   → Indication : ${exam.indication}`)
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
      if (med.quantite) lines.push(`   Quantité : ${med.quantite}`)
      if (med.remarques) lines.push(`   Remarques : ${med.remarques}`)
      lines.push("")
    })
    
    if (reportData.prescriptions.medicaments.renouvellement) {
      lines.push("Cette ordonnance peut être renouvelée")
    }
    
    lines.push(`\nOrdonnance valable jusqu'au : ${reportData.prescriptions.medicaments.dateValidite}`)
  }
  
  return lines.join("\n")
}
