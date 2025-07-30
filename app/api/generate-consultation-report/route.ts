// app/api/generate-consultation-report/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Types pour une meilleure sécurité
interface PatientInfo {
  nom: string
  age: string | number
  sexe: string
  poids: string | number
  taille: string | number
  allergies: string
  antecedents: string
  adresse: string
  telephone: string
  dateNaissance?: string
}

interface ClinicalInfo {
  motif: string
  duree: string
  symptomes: string
  signesVitaux: any
  examenPhysique: string
}

interface DiagnosticInfo {
  principal: string
  differentiel: any[]
  investigations: any
  traitements: any
}

export async function POST(request: NextRequest) {
  try {
    console.log("📋 API: Génération du dossier médical complet")
    
    const body = await request.json()
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData,
      editedDocuments,
      generateAllDocuments = false,
      generateDocuments = false // Support ancien flag aussi
    } = body

    // Validation des données requises
    if (!patientData || !clinicalData || !diagnosisData) {
      console.error("❌ Données manquantes:", { 
        hasPatient: !!patientData, 
        hasClinical: !!clinicalData, 
        hasDiagnosis: !!diagnosisData 
      })
      return NextResponse.json(
        { success: false, error: "Données patient, cliniques ou diagnostic manquantes" },
        { status: 400 }
      )
    }

    // Si on doit générer tous les documents
    if (generateAllDocuments || generateDocuments) {
      console.log("🤖 Mode génération complète activé")
      return await generateCompleteDocumentation(
        patientData, 
        clinicalData, 
        questionsData, 
        diagnosisData
      )
    } else {
      console.log("📄 Mode génération rapport seul")
      return await generateReportOnly(
        patientData, 
        clinicalData, 
        questionsData, 
        diagnosisData,
        editedDocuments
      )
    }

  } catch (error) {
    console.error("❌ Erreur API génération:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue lors de la génération"
      },
      { status: 500 }
    )
  }
}

// Génération complète (rapport + ordonnances)
async function generateCompleteDocumentation(
  patientData: any, 
  clinicalData: any, 
  questionsData: any, 
  diagnosisData: any
) {
  console.log("📊 Préparation des données pour génération complète")
  
  // Préparer les données patient
  const patientInfo: PatientInfo = {
    nom: `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient X',
    age: patientData.age || 'Non renseigné',
    sexe: normalizeGender(patientData.gender),
    poids: patientData.weight || 'Non renseigné',
    taille: patientData.height || 'Non renseigné',
    allergies: formatAllergies(patientData.allergies),
    antecedents: formatMedicalHistory(patientData.medicalHistory),
    adresse: patientData.address || 'Adresse non renseignée - Maurice',
    telephone: patientData.phone || patientData.phoneNumber || 'Non renseigné',
    dateNaissance: patientData.birthDate || 'Non renseignée'
  }

  // Préparer les données cliniques
  const clinicalInfo: ClinicalInfo = {
    motif: clinicalData.chiefComplaint || 'Non précisé',
    duree: clinicalData.symptomDuration || 'Non précisée',
    symptomes: formatSymptoms(clinicalData.symptoms),
    signesVitaux: clinicalData.vitalSigns || {},
    examenPhysique: clinicalData.physicalExamDetails || 'Non documenté'
  }

  // Préparer les données diagnostiques
  const diagnosticInfo: DiagnosticInfo = {
    principal: extractPrimaryDiagnosis(diagnosisData),
    differentiel: diagnosisData?.diagnosis?.differential || [],
    investigations: diagnosisData?.expertAnalysis?.expert_investigations || {},
    traitements: diagnosisData?.expertAnalysis?.expert_therapeutics || {}
  }

  // Construire le prompt structuré
  const structuredPrompt = buildCompleteGenerationPrompt(
    patientInfo,
    clinicalInfo,
    diagnosticInfo,
    questionsData
  )

  console.log("🤖 Appel GPT-4 pour génération complète...")
  
  try {
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: structuredPrompt,
      maxTokens: 12000,
      temperature: 0.3,
    })

    console.log("✅ Génération GPT-4 terminée")

    // Parser et valider la réponse
    const responseData = parseAIResponse(result.text)
    
    // Enrichir avec les métadonnées
    if (responseData.report) {
      responseData.report.metadata = {
        ...responseData.report.metadata,
        wordCount: countWords(JSON.stringify(responseData.report.rapport)),
        generatedAt: new Date().toISOString(),
        version: "2.0"
      }
    }

    // Valider la structure des documents
    validateDocumentStructure(responseData.documents)

    return NextResponse.json({
      success: true,
      report: responseData.report,
      documents: responseData.documents,
      metadata: {
        generationType: "complete",
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("❌ Erreur lors de la génération GPT-4:", error)
    throw new Error("Échec de la génération du dossier médical complet")
  }
}

// Génération du rapport seul
async function generateReportOnly(
  patientData: any, 
  clinicalData: any, 
  questionsData: any, 
  diagnosisData: any,
  editedDocuments: any
) {
  const simplePrompt = buildReportOnlyPrompt(
    patientData,
    clinicalData,
    questionsData,
    diagnosisData,
    editedDocuments
  )

  const result = await generateText({
    model: openai("gpt-4o"),
    prompt: simplePrompt,
    maxTokens: 6000,
    temperature: 0.3,
  })

  const reportData = parseAIResponse(result.text)

  return NextResponse.json({
    success: true,
    report: reportData,
    metadata: {
      generationType: "report-only",
      timestamp: new Date().toISOString()
    }
  })
}

// Construction du prompt pour génération complète
function buildCompleteGenerationPrompt(
  patientInfo: PatientInfo,
  clinicalInfo: ClinicalInfo,
  diagnosticInfo: DiagnosticInfo,
  questionsData: any
): string {
  // Construire les prescriptions à partir du diagnostic
  const biologyPrescriptions = buildBiologyPrescriptionsData(diagnosticInfo)
  const paraclinicalPrescriptions = buildParaclinicalPrescriptionsData(diagnosticInfo)
  const medicationPrescriptions = buildMedicationPrescriptionsData(diagnosticInfo, patientInfo)

  return `
Tu es un médecin senior expérimenté à Maurice créant un dossier médical complet.
Tu dois générer un compte rendu professionnel ET toutes les ordonnances nécessaires.

CONTEXTE PATIENT:
- Nom: ${patientInfo.nom}
- Âge: ${patientInfo.age} ans
- Sexe: ${patientInfo.sexe}
- Poids: ${patientInfo.poids} kg
- Taille: ${patientInfo.taille} cm
- Allergies: ${patientInfo.allergies}
- Antécédents: ${patientInfo.antecedents}
- Adresse: ${patientInfo.adresse}
- Téléphone: ${patientInfo.telephone}

DONNÉES CLINIQUES:
- Motif de consultation: ${clinicalInfo.motif}
- Durée des symptômes: ${clinicalInfo.duree}
- Symptômes: ${clinicalInfo.symptomes}
- Signes vitaux: ${JSON.stringify(clinicalInfo.signesVitaux, null, 2)}
- Examen physique: ${clinicalInfo.examenPhysique}

DIAGNOSTIC:
- Principal: ${diagnosticInfo.principal}
- Différentiel: ${JSON.stringify(diagnosticInfo.differentiel)}

QUESTIONS IA ET RÉPONSES:
${formatQuestionsData(questionsData)}

INSTRUCTIONS CRITIQUES:
1. Génère un compte rendu en PROSE NARRATIVE fluide et professionnelle
2. Crée des ordonnances complètes et détaillées basées sur le diagnostic
3. Utilise UNIQUEMENT la terminologie médicale française
4. Adapte TOUT au contexte mauricien (disponibilités, centres, médicaments locaux)
5. Intègre les recommandations diagnostiques de manière cohérente

STRUCTURE JSON À RETOURNER (SANS MARKDOWN, SANS BACKTICKS):

{
  "report": {
    "header": {
      "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
      "subtitle": "Médecine Générale - Consultation du ${new Date().toLocaleDateString('fr-FR')}",
      "reference": "CR-${Date.now()}"
    },
    "identification": {
      "patient": "${patientInfo.nom}",
      "age": "${patientInfo.age} ans",
      "dateNaissance": "${patientInfo.dateNaissance}",
      "sexe": "${patientInfo.sexe}",
      "adresse": "${patientInfo.adresse}",
      "telephone": "${patientInfo.telephone}"
    },
    "rapport": {
      "motifConsultation": "Le patient consulte ce jour pour... [PROSE fluide intégrant le contexte]",
      "anamnese": "L'histoire de la maladie débute... [PROSE NARRATIVE chronologique détaillée]",
      "antecedents": "Sur le plan des antécédents... [PROSE décrivant tout l'historique médical]",
      "examenClinique": "À l'examen, le patient présente... [PROSE MÉDICALE AU PRÉSENT]",
      "syntheseDiagnostique": "L'analyse des éléments cliniques... [PROSE du raisonnement]",
      "conclusionDiagnostique": "Au terme de cette consultation... [PROSE de la conclusion]",
      "priseEnCharge": "La prise en charge comprend... [PROSE du plan thérapeutique]",
      "surveillance": "Le plan de surveillance prévoit... [PROSE du suivi]",
      "conclusion": "En conclusion... [PROSE résumant tout]"
    },
    "signature": {
      "medecin": "Dr. MÉDECIN EXPERT",
      "qualification": "Médecin Généraliste",
      "rpps": "",
      "etablissement": "Cabinet Médical - Maurice"
    }
  },
  
  "documents": {
    "consultation": ${JSON.stringify(buildConsultationDocument(patientInfo, clinicalInfo, diagnosticInfo))},
    "biology": ${JSON.stringify(buildBiologyDocument(patientInfo, biologyPrescriptions))},
    "paraclinical": ${JSON.stringify(buildParaclinicalDocument(patientInfo, paraclinicalPrescriptions))},
    "medication": ${JSON.stringify(buildMedicationDocument(patientInfo, medicationPrescriptions))}
  }
}

RAPPEL: Génère un JSON valide SANS formatage markdown. Remplis TOUS les champs avec du contenu médical approprié.`
}

// Construction du prompt pour rapport seul
function buildReportOnlyPrompt(
  patientData: any,
  clinicalData: any,
  questionsData: any,
  diagnosisData: any,
  editedDocuments: any
): string {
  return `
Tu es un médecin senior rédigeant un compte rendu professionnel détaillé.

DONNÉES COMPLÈTES:
${JSON.stringify({ patientData, clinicalData, questionsData, diagnosisData }, null, 2)}

${editedDocuments ? `DOCUMENTS ÉDITÉS:
${JSON.stringify(editedDocuments, null, 2)}` : ''}

Génère UNIQUEMENT un compte rendu narratif professionnel.
Utilise une prose médicale fluide et complète.

RETOURNE UN JSON VALIDE SANS MARKDOWN:
{
  "header": {
    "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
    "subtitle": "Médecine Générale - Consultation du ${new Date().toLocaleDateString('fr-FR')}",
    "reference": "CR-${Date.now()}"
  },
  "identification": {
    "patient": "[Nom complet]",
    "age": "[Age] ans",
    "dateNaissance": "[Date]",
    "sexe": "[Sexe]",
    "adresse": "[Adresse complète]",
    "telephone": "[Téléphone]"
  },
  "rapport": {
    "motifConsultation": "[PROSE fluide et détaillée]",
    "anamnese": "[PROSE NARRATIVE chronologique complète]",
    "antecedents": "[PROSE des antécédents]",
    "examenClinique": "[PROSE MÉDICALE AU PRÉSENT]",
    "syntheseDiagnostique": "[PROSE du raisonnement]",
    "conclusionDiagnostique": "[PROSE de conclusion]",
    "priseEnCharge": "[PROSE du plan]",
    "surveillance": "[PROSE du suivi]",
    "conclusion": "[PROSE finale]"
  },
  "signature": {
    "medecin": "Dr. MÉDECIN",
    "qualification": "Médecin Généraliste",
    "etablissement": "Cabinet Médical"
  }
}`
}

// Fonctions de construction des documents
function buildConsultationDocument(patientInfo: PatientInfo, clinicalInfo: ClinicalInfo, diagnosticInfo: DiagnosticInfo) {
  return {
    header: {
      title: "COMPTE-RENDU DE CONSULTATION",
      subtitle: "Médecine Générale",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      physician: "Dr. MÉDECIN EXPERT",
      registration: "COUNCIL-MU-2024-001",
      institution: "Centre Médical Maurice"
    },
    patient: {
      firstName: patientInfo.nom.split(' ')[0] || '',
      lastName: patientInfo.nom.split(' ').slice(1).join(' ') || '',
      age: `${patientInfo.age} ans`,
      sex: patientInfo.sexe === 'Masculin' ? 'M' : 'F',
      address: patientInfo.adresse,
      phone: patientInfo.telephone,
      weight: patientInfo.poids.toString(),
      height: patientInfo.taille.toString(),
      allergies: patientInfo.allergies
    },
    content: {
      chiefComplaint: clinicalInfo.motif,
      history: "À compléter par l'IA",
      examination: "À compléter par l'IA",
      diagnosis: diagnosticInfo.principal,
      plan: "À compléter par l'IA"
    }
  }
}

function buildBiologyDocument(patientInfo: PatientInfo, prescriptions: any[]) {
  return {
    header: {
      title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
      subtitle: "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
      date: new Date().toISOString().split('T')[0],
      number: `BIO-MU-${Date.now()}`,
      physician: "Dr. MÉDECIN EXPERT",
      registration: "COUNCIL-MU-2024-001"
    },
    patient: {
      firstName: patientInfo.nom.split(' ')[0] || '',
      lastName: patientInfo.nom.split(' ').slice(1).join(' ') || '',
      age: `${patientInfo.age} ans`,
      address: patientInfo.adresse
    },
    prescriptions: prescriptions
  }
}

function buildParaclinicalDocument(patientInfo: PatientInfo, prescriptions: any[]) {
  return {
    header: {
      title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
      subtitle: "PRESCRIPTION D'EXAMENS PARACLINIQUES",
      date: new Date().toISOString().split('T')[0],
      number: `PARA-MU-${Date.now()}`,
      physician: "Dr. MÉDECIN EXPERT",
      registration: "COUNCIL-MU-2024-001"
    },
    patient: {
      firstName: patientInfo.nom.split(' ')[0] || '',
      lastName: patientInfo.nom.split(' ').slice(1).join(' ') || '',
      age: `${patientInfo.age} ans`,
      address: patientInfo.adresse
    },
    prescriptions: prescriptions
  }
}

function buildMedicationDocument(patientInfo: PatientInfo, prescriptions: any[]) {
  return {
    header: {
      title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
      subtitle: "PRESCRIPTION THÉRAPEUTIQUE",
      date: new Date().toISOString().split('T')[0],
      number: `MED-MU-${Date.now()}`,
      physician: "Dr. MÉDECIN EXPERT",
      registration: "COUNCIL-MU-2024-001",
      validity: "Ordonnance valable 3 mois"
    },
    patient: {
      firstName: patientInfo.nom.split(' ')[0] || '',
      lastName: patientInfo.nom.split(' ').slice(1).join(' ') || '',
      age: `${patientInfo.age} ans`,
      weight: patientInfo.poids.toString(),
      allergies: patientInfo.allergies,
      address: patientInfo.adresse,
      pregnancy: "Non applicable"
    },
    prescriptions: prescriptions,
    clinicalAdvice: {
      hydration: "Hydratation renforcée (2-3L/jour) adaptée au climat tropical de Maurice",
      activity: "Repos relatif selon symptômes, éviter efforts intenses aux heures chaudes",
      diet: "Alimentation équilibrée, privilégier fruits et légumes locaux",
      mosquitoProtection: "Protection anti-moustiques INDISPENSABLE (dengue/chikungunya endémiques)",
      followUp: "Consultation de contrôle si pas d'amélioration sous 48-72h",
      emergency: "Urgences Maurice: 999 (SAMU) ou 114"
    }
  }
}

// Construction des prescriptions biologiques
function buildBiologyPrescriptionsData(diagnosticInfo: DiagnosticInfo): any[] {
  const prescriptions: any[] = []
  
  if (diagnosticInfo.investigations?.immediate_priority) {
    const biologyExams = diagnosticInfo.investigations.immediate_priority
      .filter((exam: any) => exam.category === 'biology')
    
    biologyExams.forEach((exam: any, index: number) => {
      prescriptions.push({
        id: Date.now() + index,
        exam: exam.examination || 'Examen biologique',
        indication: exam.specific_indication || 'Selon contexte clinique',
        urgency: mapUrgency(exam.urgency),
        fasting: exam.fasting_required ? 'Oui - 8h' : 'Non',
        expectedResults: exam.interpretation_keys || 'Résultats à interpréter',
        sampleType: exam.sample_type || 'Sang veineux',
        contraindications: "Aucune",
        mauritianAvailability: formatAvailability(exam.mauritius_availability),
        cost: exam.mauritius_availability?.estimated_cost || 'À vérifier'
      })
    })
  }
  
  // Template par défaut si aucun examen
  if (prescriptions.length === 0) {
    prescriptions.push({
      id: Date.now(),
      exam: "",
      indication: "",
      urgency: "Semi-urgent (24-48h)",
      fasting: "Non",
      expectedResults: "",
      sampleType: "Sang veineux",
      contraindications: "Aucune",
      mauritianAvailability: "Disponible laboratoires Maurice",
      cost: "À vérifier"
    })
  }
  
  return prescriptions
}

// Construction des prescriptions paracliniques
function buildParaclinicalPrescriptionsData(diagnosticInfo: DiagnosticInfo): any[] {
  const prescriptions: any[] = []
  
  if (diagnosticInfo.investigations?.immediate_priority) {
    const paraclinicalExams = diagnosticInfo.investigations.immediate_priority
      .filter((exam: any) => exam.category === 'imaging' || exam.category === 'functional')
    
    paraclinicalExams.forEach((exam: any, index: number) => {
      prescriptions.push({
        id: Date.now() + index + 100,
        category: mapExamCategory(exam.examination),
        exam: exam.examination || 'Examen paraclinique',
        indication: exam.specific_indication || 'Exploration complémentaire',
        urgency: mapUrgency(exam.urgency),
        preparation: exam.patient_preparation || 'Aucune préparation spéciale',
        contraindications: exam.contraindications || 'Aucune',
        duration: exam.duration || '15-30 minutes',
        mauritianAvailability: formatAvailability(exam.mauritius_availability),
        cost: exam.mauritius_availability?.estimated_cost || 'Variable'
      })
    })
  }
  
  if (prescriptions.length === 0) {
    prescriptions.push({
      id: Date.now() + 100,
      category: "",
      exam: "",
      indication: "",
      urgency: "Programmé (1-2 semaines)",
      preparation: "Aucune",
      contraindications: "Aucune",
      duration: "Variable",
      mauritianAvailability: "Centres publics et privés",
      cost: "À vérifier"
    })
  }
  
  return prescriptions
}

// Construction des prescriptions médicamenteuses
function buildMedicationPrescriptionsData(diagnosticInfo: DiagnosticInfo, patientInfo: PatientInfo): any[] {
  const prescriptions: any[] = []
  const isElderly = typeof patientInfo.age === 'number' ? patientInfo.age >= 65 : false
  
  if (diagnosticInfo.traitements?.primary_treatments) {
    diagnosticInfo.traitements.primary_treatments.forEach((treatment: any, index: number) => {
      const dosing = treatment.dosing_regimen?.standard_adult || ""
      const elderlyDosing = treatment.dosing_regimen?.elderly_adjustment || dosing
      
      prescriptions.push({
        id: Date.now() + index + 200,
        class: mapTherapeuticClass(treatment.therapeutic_class),
        dci: treatment.medication_dci || '',
        brand: treatment.mauritius_availability?.brand_names?.join(' / ') || 'Marques locales',
        dosage: isElderly && elderlyDosing ? elderlyDosing : dosing,
        frequency: extractFrequency(dosing),
        duration: treatment.treatment_duration || '7 jours',
        totalQuantity: calculateQuantity(dosing, treatment.treatment_duration),
        indication: treatment.precise_indication || '',
        administration: treatment.administration_route || 'Per os',
        contraindications: treatment.contraindications_absolute?.join(', ') || 'À vérifier',
        precautions: treatment.precautions || 'Respecter posologie',
        monitoring: treatment.monitoring_parameters?.join(', ') || 'Efficacité et tolérance',
        mauritianAvailability: treatment.mauritius_availability?.locally_available ? 'Disponible' : 'À commander',
        cost: treatment.mauritius_availability?.private_sector_cost || 'À préciser'
      })
    })
  }
  
  if (prescriptions.length === 0) {
    prescriptions.push({
      id: Date.now() + 200,
      class: "",
      dci: "",
      brand: "",
      dosage: "",
      frequency: "",
      duration: "",
      totalQuantity: "",
      indication: "",
      administration: "Per os",
      contraindications: "À vérifier",
      precautions: "Respecter posologie",
      monitoring: "Efficacité et tolérance",
      mauritianAvailability: "À vérifier",
      cost: "À préciser"
    })
  }
  
  return prescriptions
}

// Fonctions utilitaires

function parseAIResponse(responseText: string): any {
  try {
    // Nettoyer la réponse
    let cleanedResponse = responseText.trim()
    
    // Retirer tout formatage markdown
    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
    cleanedResponse = cleanedResponse.trim()
    
    // Parser le JSON
    return JSON.parse(cleanedResponse)
  } catch (error) {
    console.error("❌ Erreur parsing JSON:", error)
    console.error("Réponse brute (200 premiers caractères):", responseText.substring(0, 200))
    throw new Error("Format de réponse invalide - impossible de parser le JSON")
  }
}

function validateDocumentStructure(documents: any) {
  const requiredDocs = ['consultation', 'biology', 'paraclinical', 'medication']
  
  for (const doc of requiredDocs) {
    if (!documents[doc]) {
      throw new Error(`Document manquant: ${doc}`)
    }
    
    if (!documents[doc].header || !documents[doc].patient) {
      throw new Error(`Structure invalide pour le document: ${doc}`)
    }
  }
  
  return true
}

function normalizeGender(gender: any): string {
  if (!gender) return 'Non renseigné'
  
  const genderStr = Array.isArray(gender) ? gender[0] : gender.toString()
  const normalized = genderStr.toLowerCase()
  
  if (normalized.includes('mas') || normalized === 'm' || normalized === 'homme') {
    return 'Masculin'
  } else if (normalized.includes('fém') || normalized === 'f' || normalized === 'femme') {
    return 'Féminin'
  }
  
  return genderStr
}

function formatAllergies(allergies: any): string {
  if (!allergies) return 'Aucune allergie connue'
  
  if (Array.isArray(allergies)) {
    return allergies.length > 0 ? allergies.join(', ') : 'Aucune allergie connue'
  }
  
  return allergies.toString() || 'Aucune allergie connue'
}

function formatMedicalHistory(history: any): string {
  if (!history) return 'Aucun antécédent notable'
  
  if (Array.isArray(history)) {
    return history.length > 0 ? history.join(', ') : 'Aucun antécédent notable'
  }
  
  return history.toString() || 'Aucun antécédent notable'
}

function formatSymptoms(symptoms: any): string {
  if (!symptoms) return 'Non précisés'
  
  if (Array.isArray(symptoms)) {
    return symptoms.length > 0 ? symptoms.join(', ') : 'Non précisés'
  }
  
  return symptoms.toString() || 'Non précisés'
}

function formatQuestionsData(questionsData: any): string {
  if (!questionsData || !questionsData.responses) {
    return 'Aucune question IA documentée'
  }
  
  return questionsData.responses
    .map((r: any, i: number) => `Q${i + 1}: ${r.question}\nR: ${r.answer}`)
    .join('\n\n')
}

function extractPrimaryDiagnosis(diagnosisData: any): string {
  return diagnosisData?.diagnosis?.primary?.condition || 
         diagnosisData?.primary?.condition || 
         'Diagnostic à préciser'
}

function mapUrgency(urgency: string): string {
  switch(urgency?.toLowerCase()) {
    case 'immediate': return "Urgent (dans les heures)"
    case 'urgent': return "Semi-urgent (24-48h)"
    case 'routine': return "Programmé (1-2 semaines)"
    default: return "Programmé (1-2 semaines)"
  }
}

function mapExamCategory(examName: string): string {
  if (!examName) return "Autres examens"
  
  const name = examName.toLowerCase()
  
  if (name.includes('echo') || name.includes('écho')) return "Échographie"
  if (name.includes('ecg') || name.includes('électrocardiogramme')) return "Explorations cardiologiques"
  if (name.includes('scanner') || name.includes('tdm')) return "Scanner (TDM)"
  if (name.includes('irm')) return "IRM"
  if (name.includes('radio')) {
    if (name.includes('thorax') || name.includes('poumon')) return "Imagerie thoracique"
    if (name.includes('abdom')) return "Imagerie abdominale"
    return "Imagerie standard"
  }
  if (name.includes('endoscopie')) return "Endoscopie"
  
  return "Autres examens"
}

function mapTherapeuticClass(classes: string[]): string {
  if (!classes || classes.length === 0) return "Autre"
  
  const classStr = classes.join(' ').toLowerCase()
  
  if (classStr.includes('antalgique') || classStr.includes('antipyrétique') || classStr.includes('paracétamol')) {
    return "Antalgique non opioïde"
  }
  if (classStr.includes('ains') || classStr.includes('anti-inflammatoire') || classStr.includes('ibuprofène')) {
    return "Anti-inflammatoire non stéroïdien (AINS)"
  }
  if (classStr.includes('antibiotique') || classStr.includes('antibactérien')) {
    return "Antibiotique"
  }
  if (classStr.includes('corticoïde') || classStr.includes('corticostéroïde')) {
    return "Corticoïde"
  }
  if (classStr.includes('antihistaminique')) {
    return "Antihistaminique"
  }
  if (classStr.includes('ipp') || classStr.includes('pompe à protons')) {
    return "Inhibiteur de la pompe à protons"
  }
  
  return "Autre"
}

function formatAvailability(availability: any): string {
  if (!availability) return "Disponible Maurice"
  
  if (availability.public_centers && Array.isArray(availability.public_centers)) {
    const centers = availability.public_centers.slice(0, 3).join(', ')
    return centers ? `Disponible: ${centers}` : "Disponible secteur public"
  }
  
  return availability.locally_available ? 
    "Disponible secteur public et privé" : 
    "À commander / Centres spécialisés"
}

function extractFrequency(dosing: string): string {
  if (!dosing) return "3 fois par jour"
  
  const dosingLower = dosing.toLowerCase()
  
  if (dosingLower.includes('x 1/jour') || dosingLower.includes('1 fois')) return "1 fois par jour"
  if (dosingLower.includes('x 2/jour') || dosingLower.includes('2 fois')) return "2 fois par jour"
  if (dosingLower.includes('x 3/jour') || dosingLower.includes('3 fois')) return "3 fois par jour"
  if (dosingLower.includes('x 4/jour') || dosingLower.includes('4 fois')) return "4 fois par jour"
  if (dosingLower.includes('matin et soir')) return "Matin et soir"
  if (dosingLower.includes('au coucher')) return "Au coucher"
  
  return "3 fois par jour"
}

function calculateQuantity(dosing: string, duration: string): string {
  const daysMatch = duration?.match(/(\d+)\s*(jour|day)/i)
  const days = daysMatch ? parseInt(daysMatch[1]) : 7
  
  let dailyDoses = 3
  const dosingLower = dosing?.toLowerCase() || ''
  
  if (dosingLower.includes('x 1/jour') || dosingLower.includes('1 fois')) dailyDoses = 1
  else if (dosingLower.includes('x 2/jour') || dosingLower.includes('2 fois')) dailyDoses = 2
  else if (dosingLower.includes('x 4/jour') || dosingLower.includes('4 fois')) dailyDoses = 4
  
  const total = days * dailyDoses
  
  // Arrondir à la boîte supérieure si nécessaire
  if (total <= 20) return `${total} comprimés`
  if (total <= 30) return "1 boîte de 30"
  if (total <= 60) return "2 boîtes de 30"
  
  return `${Math.ceil(total / 30)} boîtes de 30`
}

function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(word => word.length > 0).length
}
