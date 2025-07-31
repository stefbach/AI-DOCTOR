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
  
  // Extraire les informations pertinentes du contexte
  const motifConsultation = medicalContext.clinical?.chiefComplaint || 
                          medicalContext.clinical?.symptoms || 
                          "Consultation médicale"
  
  const symptomes = medicalContext.clinical?.symptoms || []
  const vitalSigns = medicalContext.clinical?.vitalSigns || {}
  const examenPhysique = medicalContext.clinical?.physicalExam || {}
  
  // Données du diagnostic
  const diagnosticPrincipal = medicalContext.diagnosis?.primaryDiagnosis || 
                             medicalContext.diagnosis?.diagnosis || 
                             medicalContext.diagnosis?.diagnosticHypothesis || ""
  
  const diagnosticsSecondaires = medicalContext.diagnosis?.secondaryDiagnoses || []
  const examensRealises = medicalContext.diagnosis?.performedExams || []
  const analyseDiagnostique = medicalContext.diagnosis?.analysis || ""
  
  // Traitement proposé
  const medicaments = medicalContext.editedDocuments?.medication?.prescriptions || 
                     medicalContext.diagnosis?.treatment?.medications || []
  
  const examsBio = medicalContext.editedDocuments?.biology?.examinations || 
                   medicalContext.diagnosis?.examinations?.laboratory || []
  
  const examsImaging = medicalContext.editedDocuments?.paraclinical?.examinations || 
                      medicalContext.diagnosis?.examinations?.imaging || []
  
  const prompt = `Tu es un médecin senior expérimenté rédigeant un compte rendu de consultation professionnel et détaillé.

DONNÉES DU PATIENT :
- Nom : ${formatPatientName(medicalContext.patient)}
- Âge : ${medicalContext.patient.age} ans
- Sexe : ${medicalContext.patient.sexe}
- Antécédents : ${JSON.stringify(medicalContext.patient.antecedents)}
- Allergies : ${JSON.stringify(medicalContext.patient.allergies)}

DONNÉES DE LA CONSULTATION :
- Motif : ${motifConsultation}
- Symptômes : ${JSON.stringify(symptomes)}
- Signes vitaux : ${JSON.stringify(vitalSigns)}
- Examen physique : ${JSON.stringify(examenPhysique)}

DONNÉES DU DIAGNOSTIC :
- Diagnostic principal : ${diagnosticPrincipal}
- Diagnostics secondaires : ${JSON.stringify(diagnosticsSecondaires)}
- Examens réalisés : ${JSON.stringify(examensRealises)}
- Analyse : ${analyseDiagnostique}

QUESTIONS/RÉPONSES DE L'IA :
${JSON.stringify(medicalContext.aiQuestions)}

DOCUMENTS ÉDITÉS :
${JSON.stringify(medicalContext.editedDocuments)}

INSTRUCTIONS IMPORTANTES :
1. Rédige un compte rendu COMPLET en prose narrative fluide et naturelle
2. Intègre TOUTES les données fournies de manière cohérente
3. Utilise un style médical professionnel mais clair
4. Pour chaque section du rapport, écris des paragraphes détaillés et complets
5. Remplis TOUTES les prescriptions avec les données réelles fournies
6. NE LAISSE AUCUN PLACEHOLDER - génère du contenu médical réaliste et pertinent

Génère le rapport au format JSON suivant, en t'assurant que CHAQUE section contient du texte narratif complet :

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
    "motifConsultation": "Rédige ici un paragraphe complet décrivant le motif principal de consultation basé sur : ${motifConsultation}",
    
    "anamnese": "Rédige ici l'histoire détaillée de la maladie actuelle en intégrant les symptômes (${JSON.stringify(symptomes)}), leur évolution, leur impact sur la vie quotidienne du patient",
    
    "antecedents": "Décris ici les antécédents médicaux pertinents du patient : ${JSON.stringify(medicalContext.patient.antecedents)}, ses allergies : ${JSON.stringify(medicalContext.patient.allergies)}, et tout autre élément du contexte médical",
    
    "examenClinique": "Décris ici l'examen clinique complet incluant l'état général, les signes vitaux (${JSON.stringify(vitalSigns)}), et l'examen physique systématique (${JSON.stringify(examenPhysique)})",
    
    "syntheseDiagnostique": "Rédige ici l'analyse diagnostique complète basée sur : ${analyseDiagnostique}, en expliquant le raisonnement médical et les hypothèses envisagées",
    
    "conclusionDiagnostique": "Énonce clairement le diagnostic principal retenu : ${diagnosticPrincipal}${diagnosticsSecondaires.length > 0 ? ' et les diagnostics secondaires : ' + JSON.stringify(diagnosticsSecondaires) : ''}",
    
    "priseEnCharge": "Détaille ici la stratégie thérapeutique complète incluant les médicaments prescrits, les examens demandés, et les mesures non médicamenteuses recommandées",
    
    "surveillance": "Décris le plan de suivi, les signes à surveiller, les consignes données au patient, et les modalités de réévaluation",
    
    "conclusion": "Rédige une synthèse finale résumant les points clés de la consultation et les prochaines étapes"
  },
  
  "prescriptions": {
    "medicaments": {
      "items": [
        ${medicaments.map((med: Medication) => `{
          "nom": "${med.medication || med.name || ''}",
          "dci": "${extractDCI(med.medication || med.name || '')}",
          "dosage": "${med.dosage || ''}",
          "forme": "${detectMedicationForm(med.medication || med.name || '')}",
          "posologie": "${med.frequency || med.posology || ''}",
          "duree": "${med.duration || ''}",
          "quantite": "${calculateQuantity(med)}",
          "remarques": "${med.instructions || ''}",
          "nonSubstituable": false
        }`).join(',\n        ')}
      ],
      "renouvellement": ${shouldAllowRenewal(medicalContext.diagnosis)},
      "dateValidite": "${getValidityDate()}"
    },
    "biologie": {
      "examens": [
        ${examsBio.map((exam: Examination) => `{
          "type": "${exam.name || exam.type || ''}",
          "code": "${getBiologyCode(exam.name || exam.type || '')}",
          "urgence": ${exam.urgency === 'Urgent'},
          "jeun": ${requiresFasting(exam.name || exam.type || '')},
          "remarques": "${exam.justification || ''}"
        }`).join(',\n        ')}
      ],
      "laboratoireRecommande": "Laboratoire d'analyses médicales agréé"
    },
    "imagerie": {
      "examens": [
        ${examsImaging.map((exam: Examination) => `{
          "type": "${exam.type || ''}",
          "region": "${exam.region || detectAnatomicalRegion(exam.type || '')}",
          "indication": "${exam.indication || exam.justification || ''}",
          "urgence": ${exam.urgency === 'Urgent'},
          "contraste": ${requiresContrast(exam.type || '')},
          "remarques": "${exam.details || ''}"
        }`).join(',\n        ')}
      ],
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
}

RAPPEL CRITIQUE : 
- Ne retourne QU'UN SEUL objet JSON valide
- Remplis TOUTES les sections avec du texte médical complet et naturel
- N'utilise AUCUN placeholder comme [PROSE] ou [À COMPLÉTER]
- Intègre TOUTES les données fournies dans le contexte`

  return prompt
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
    'augmentin': 'Amoxicilline + Acide clavulanique',
    'ventoline': 'Salbutamol',
    'spasfon': 'Phloroglucinol',
    'levothyrox': 'Lévothyroxine',
    'kardegic': 'Acide acétylsalicylique',
    'xarelto': 'Rivaroxaban',
    'metformine': 'Metformine'
  }
  
  const lowerName = medicationName.toLowerCase()
  for (const [brand, dci] of Object.entries(commonDCIs)) {
    if (lowerName.includes(brand)) return dci
  }
  
  // Si pas trouvé, essayer d'extraire le nom générique
  if (lowerName.includes('paracétamol')) return 'Paracétamol'
  if (lowerName.includes('ibuprofène')) return 'Ibuprofène'
  if (lowerName.includes('amoxicilline')) return 'Amoxicilline'
  
  return medicationName // Retourner le nom original si pas de DCI trouvée
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
  if (lowerName.includes('sachet')) return 'sachet'
  if (lowerName.includes('suppositoire')) return 'suppositoire'
  if (lowerName.includes('patch')) return 'patch'
  if (lowerName.includes('gouttes')) return 'gouttes'
  return 'comprimé'
}

function calculateQuantity(med: Medication): string {
  // Calcul basique de la quantité nécessaire
  const duration = med.duration || ''
  const frequency = med.frequency || med.posology || ''
  
  // Extraire le nombre de jours
  const daysMatch = duration.match(/(\d+)\s*(jours?|days?|semaines?|weeks?|mois|months?)/i)
  let days = 0
  
  if (daysMatch) {
    days = parseInt(daysMatch[1])
    if (duration.includes('semaine') || duration.includes('week')) {
      days *= 7
    } else if (duration.includes('mois') || duration.includes('month')) {
      days *= 30
    }
  }
  
  // Extraire la fréquence quotidienne
  let dailyDoses = 1
  if (frequency.includes('2 fois') || frequency.includes('twice') || frequency.includes('matin et soir')) {
    dailyDoses = 2
  } else if (frequency.includes('3 fois') || frequency.includes('three times')) {
    dailyDoses = 3
  } else if (frequency.includes('4 fois') || frequency.includes('four times')) {
    dailyDoses = 4
  }
  
  const totalDoses = days * dailyDoses
  
  if (totalDoses > 0) {
    // Adapter selon les conditionnements standards
    if (totalDoses <= 20) return '1 boîte'
    if (totalDoses <= 30) return '1 boîte de 30'
    if (totalDoses <= 60) return '2 boîtes de 30'
    if (totalDoses <= 90) return '3 boîtes de 30'
    return `${Math.ceil(totalDoses / 30)} boîtes`
  }
  
  return '1 boîte'
}

function getBiologyCode(examName: string): string {
  // Codes NABM simplifiés
  const codes: Record<string, string> = {
    'nfs': '1104',
    'numération formule sanguine': '1104',
    'glycémie': '1106',
    'glucose': '1106',
    'crp': '1803',
    'protéine c réactive': '1803',
    'tsh': '7217',
    'thyréostimuline': '7217',
    'créatinine': '1109',
    'urée': '1112',
    'transaminases': '0574',
    'asat': '0574',
    'alat': '0575',
    'cholestérol': '0996',
    'triglycérides': '1665',
    'ferritine': '0888',
    'vitamine d': '1810',
    'hba1c': '0997',
    'inr': '1605',
    'bilan hépatique': '0574-0575',
    'ionogramme': '1110-1111'
  }
  
  const lowerName = examName.toLowerCase()
  for (const [exam, code] of Object.entries(codes)) {
    if (lowerName.includes(exam)) return code
  }
  
  return ''
}

function requiresFasting(examName: string): boolean {
  const fastingExams = [
    'glycémie', 'glucose', 'bilan lipidique', 'cholestérol', 
    'triglycérides', 'hdl', 'ldl', 'glycémie à jeun',
    'insuline', 'peptide c', 'homa', 'bilan glucidique'
  ]
  const lowerName = examName.toLowerCase()
  return fastingExams.some(exam => lowerName.includes(exam))
}

function requiresContrast(examType: string): boolean {
  const contrastExams = [
    'scanner', 'tdm', 'tomodensitométrie', 'angioscanner', 
    'irm avec injection', 'arthroscanner', 'uroscanner',
    'coroscanner', 'angio-irm', 'bili-irm'
  ]
  const lowerType = examType.toLowerCase()
  return contrastExams.some(exam => lowerType.includes(exam))
}

function detectAnatomicalRegion(examType: string): string {
  const lowerType = examType.toLowerCase()
  
  const regions: Record<string, string> = {
    'thorax': 'Thorax',
    'thoracique': 'Thorax',
    'poumon': 'Thorax',
    'pulmonaire': 'Thorax',
    'cardiaque': 'Thorax',
    'coeur': 'Thorax',
    'médiastin': 'Thorax',
    'abdom': 'Abdomen',
    'ventre': 'Abdomen',
    'foie': 'Abdomen',
    'vésicule': 'Abdomen',
    'pancréas': 'Abdomen',
    'rate': 'Abdomen',
    'rein': 'Abdomen',
    'rénal': 'Abdomen',
    'crân': 'Crâne',
    'cérébr': 'Crâne',
    'tête': 'Crâne',
    'encéphal': 'Crâne',
    'rachis': 'Rachis',
    'colonne': 'Rachis',
    'vertébr': 'Rachis',
    'lombaire': 'Rachis lombaire',
    'cervical': 'Rachis cervical',
    'dorsal': 'Rachis dorsal',
    'genou': 'Genou',
    'épaule': 'Épaule',
    'hanche': 'Hanche',
    'cheville': 'Cheville',
    'poignet': 'Poignet',
    'coude': 'Coude',
    'bassin': 'Bassin',
    'pelvis': 'Bassin',
    'membre supérieur': 'Membre supérieur',
    'membre inférieur': 'Membre inférieur',
    'main': 'Main',
    'pied': 'Pied'
  }
  
  for (const [key, value] of Object.entries(regions)) {
    if (lowerType.includes(key)) return value
  }
  
  return 'Corps entier'
}

function shouldAllowRenewal(diagnosisData: any): boolean {
  const chronicConditions = [
    'hypertension', 'diabète', 'asthme', 'bpco', 'insuffisance cardiaque',
    'épilepsie', 'parkinson', 'alzheimer', 'polyarthrite', 'thyroïde',
    'dépression', 'anxiété', 'bipolaire', 'schizophrénie', 'cholestérol',
    'migraine', 'fibromyalgie', 'sclérose', 'arthrose', 'ostéoporose'
  ]
  
  // Recherche du diagnostic dans différentes propriétés possibles
  const possibleDiagnosisFields = [
    diagnosisData?.diagnosis,
    diagnosisData?.primaryDiagnosis,
    diagnosisData?.finalDiagnosis,
    diagnosisData?.diagnosticHypothesis,
    diagnosisData?.mainDiagnosis,
    diagnosisData?.treatment?.chronicCondition
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
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function parseAndValidateReport(responseText: string): any {
  try {
    // Nettoyer la réponse de tout formatage markdown
    let cleanedResponse = responseText.trim()
    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
    
    // Remplacer les retours à la ligne dans les chaînes JSON
    cleanedResponse = cleanedResponse.replace(/\n/g, '\\n')
    
    // Parser le JSON
    const parsed = JSON.parse(cleanedResponse)
    
    // Validation de la structure minimale
    if (!parsed.header || !parsed.identification || !parsed.rapport) {
      throw new Error('Structure du rapport invalide')
    }
    
    // Nettoyer les retours à la ligne échappés
    const cleanObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\\n/g, '\n')
      }
      if (Array.isArray(obj)) {
        return obj.map(cleanObject)
      }
      if (typeof obj === 'object' && obj !== null) {
        const cleaned: any = {}
        for (const key in obj) {
          cleaned[key] = cleanObject(obj[key])
        }
        return cleaned
      }
      return obj
    }
    
    return cleanObject(parsed)
  } catch (error) {
    console.error('Erreur de parsing:', error)
    console.error('Réponse brute:', responseText.substring(0, 500))
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
