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

    // Log détaillé pour debug
    console.log("📊 DONNÉES REÇUES PAR L'API:")
    console.log("- Patient:", JSON.stringify(patientData, null, 2))
    console.log("- Clinical:", JSON.stringify(clinicalData, null, 2))
    console.log("- Diagnosis:", JSON.stringify(diagnosisData, null, 2))
    console.log("- EditedDocuments COMPLET:", JSON.stringify(editedDocuments, null, 2))

    // Préparation du contexte médical unifié
    console.log("🔧 Préparation du contexte médical...")
    const medicalContext = prepareMedicalContext({
      patientData,
      clinicalData,
      questionsData,
      diagnosisData,
      editedDocuments
    })

    // Génération du prompt structuré
    console.log("✍️ Génération du prompt...")
    let jsonTemplate: any
    let systemPrompt: string
    let userPrompt: string
    
    try {
      const promptData = generateProfessionalReportPrompt(medicalContext, patientData)
      jsonTemplate = promptData.template
      systemPrompt = promptData.systemPrompt
      userPrompt = promptData.userPrompt
    } catch (promptError) {
      console.error("❌ Erreur lors de la génération du prompt:", promptError)
      throw new Error(`Erreur de génération du prompt: ${promptError instanceof Error ? promptError.message : 'Erreur inconnue'}`)
    }

    console.log("🤖 Génération du rapport avec GPT-4...")
    console.log("📝 Longueur du prompt:", userPrompt.length, "caractères")
    
    // Génération avec retry et meilleure gestion d'erreur
    let reportData: any
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative ${attempt}/${maxRetries}...`)
        
        const result = await generateText({
          model: openai("gpt-4o"),
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user', 
              content: userPrompt
            }
          ],
          maxTokens: 12000,
          temperature: 0.3,
        })

        console.log(`✅ Réponse GPT-4 reçue (tentative ${attempt}), longueur: ${result.text.length} caractères`)
        
        // Parse et validation du rapport
        reportData = parseAndValidateReport(result.text)
        
        // Si on arrive ici, le parsing a réussi
        break
        
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Erreur tentative ${attempt}:`, error)
        
        if (attempt === maxRetries) {
          throw new Error(`Échec après ${maxRetries} tentatives: ${lastError.message}`)
        }
        
        // Attendre un peu avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    // Vérifier que les sections ne contiennent plus d'instructions
    reportData = cleanReportContent(reportData)
    
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

    // Log final des prescriptions générées
    console.log("✅ PRESCRIPTIONS FINALES GÉNÉRÉES:")
    console.log("- Médicaments:", reportData.prescriptions?.medicaments?.items?.length || 0)
    console.log("- Examens bio:", reportData.prescriptions?.biologie?.examens?.length || 0)
    console.log("- Examens imagerie:", reportData.prescriptions?.imagerie?.examens?.length || 0)

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

// Fonction améliorée pour nettoyer le contenu du rapport
function cleanReportContent(report: any): any {
  if (!report.rapport) return report
  
  for (const [key, value] of Object.entries(report.rapport)) {
    if (typeof value === 'string') {
      // Vérifier si le texte contient encore des instructions
      if (value.includes('[REMPLACER PAR') || value.includes('REMPLACER PAR')) {
        console.warn(`⚠️ Section "${key}" contient encore des instructions`)
        // Générer un contenu par défaut basé sur la section
        report.rapport[key] = generateDefaultContent(key)
      }
    }
  }
  
  return report
}

// Générer du contenu par défaut si GPT-4 n'a pas remplacé les instructions
function generateDefaultContent(sectionName: string): string {
  const defaults: Record<string, string> = {
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
  
  return defaults[sectionName] || "Section à compléter."
}

// Fonction pour rechercher récursivement dans un objet
function findInObject(obj: any, searchKeys: string[], path: string = ''): any[] {
  const results: any[] = []
  
  if (!obj || typeof obj !== 'object') return results
  
  // Si c'est un tableau, le retourner directement
  if (Array.isArray(obj)) {
    console.log(`  ✓ Tableau trouvé à ${path || 'racine'}: ${obj.length} éléments`)
    return obj
  }
  
  // Parcourir les clés de l'objet
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key
    
    // Vérifier si la clé correspond à l'un des patterns recherchés
    if (searchKeys.some(searchKey => key.toLowerCase().includes(searchKey))) {
      if (Array.isArray(value) && value.length > 0) {
        console.log(`  ✓ Données trouvées à ${currentPath}: ${value.length} éléments`)
        results.push(...value)
      } else if (typeof value === 'object' && value !== null) {
        // Explorer récursivement
        const nested = findInObject(value, searchKeys, currentPath)
        if (nested.length > 0) {
          results.push(...nested)
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Continuer la recherche récursive même si la clé ne correspond pas
      const nested = findInObject(value, searchKeys, currentPath)
      if (nested.length > 0) {
        results.push(...nested)
      }
    }
  }
  
  return results
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
    allergies: Array.isArray(data.patientData.allergies) ? data.patientData.allergies :
               Array.isArray(data.patientData.medicalHistory?.allergies) ? data.patientData.medicalHistory.allergies : [],
    antecedents: Array.isArray(data.patientData.antecedents) ? data.patientData.antecedents :
                 Array.isArray(data.patientData.medicalHistory) ? data.patientData.medicalHistory : []
  }

  return {
    patient: normalizedPatient,
    clinical: data.clinicalData,
    aiQuestions: data.questionsData?.responses || [],
    diagnosis: data.diagnosisData,
    editedDocuments: data.editedDocuments || {}
  }
}

// Fonction améliorée pour générer le prompt structuré
function generateProfessionalReportPrompt(medicalContext: any, patientData: PatientData) {
  try {
    const patientId = `${patientData.nom || patientData.lastName || 'PATIENT'}_${Date.now()}`
    
    // Extraire les informations pertinentes du contexte
    const motifConsultation = medicalContext.clinical?.chiefComplaint || 
                            (Array.isArray(medicalContext.clinical?.symptoms) ? medicalContext.clinical.symptoms.join(', ') : medicalContext.clinical?.symptoms) || 
                            medicalContext.diagnosis?.chiefComplaint ||
                            medicalContext.diagnosis?.reason ||
                            "Consultation médicale"
    
    const symptomes = Array.isArray(medicalContext.clinical?.symptoms) ? medicalContext.clinical.symptoms :
                     Array.isArray(medicalContext.diagnosis?.symptoms) ? medicalContext.diagnosis.symptoms :
                     Array.isArray(medicalContext.clinical?.presentingComplaints) ? medicalContext.clinical.presentingComplaints : []
    
    const vitalSigns = medicalContext.clinical?.vitalSigns || 
                      medicalContext.clinical?.vitals || 
                      medicalContext.diagnosis?.vitalSigns || {}
    
    const examenPhysique = medicalContext.clinical?.physicalExam || 
                          medicalContext.clinical?.examination ||
                          medicalContext.diagnosis?.physicalExamination || 
                          medicalContext.diagnosis?.clinicalExamination || {}
    
    // Données du diagnostic
    const diagnosticPrincipal = medicalContext.diagnosis?.primaryDiagnosis || 
                               medicalContext.diagnosis?.diagnosis || 
                               medicalContext.diagnosis?.mainDiagnosis ||
                               medicalContext.diagnosis?.principal ||
                               medicalContext.diagnosis?.diagnosticHypothesis?.primary || 
                               medicalContext.diagnosis?.diagnosticHypothesis || 
                               (typeof medicalContext.diagnosis === 'string' ? medicalContext.diagnosis : "") ||
                               ""
    
    const diagnosticsSecondaires = Array.isArray(medicalContext.diagnosis?.secondaryDiagnoses) ? medicalContext.diagnosis.secondaryDiagnoses :
                                   Array.isArray(medicalContext.diagnosis?.diagnosticHypothesis?.secondary) ? medicalContext.diagnosis.diagnosticHypothesis.secondary : []
    
    const examensRealises = Array.isArray(medicalContext.diagnosis?.performedExams) ? medicalContext.diagnosis.performedExams :
                           Array.isArray(medicalContext.diagnosis?.examsPerformed) ? medicalContext.diagnosis.examsPerformed : []
    
    const analyseDiagnostique = medicalContext.diagnosis?.analysis || 
                               medicalContext.diagnosis?.clinicalAnalysis || 
                               medicalContext.diagnosis?.diagnosticAnalysis || ""
    
    // EXTRACTION ROBUSTE DES PRESCRIPTIONS
    console.log("🔍 RECHERCHE DES PRESCRIPTIONS...")
    
    // 1. Recherche des médicaments
    console.log("💊 Recherche des médicaments...")
    let medicaments = findInObject(
      { editedDocuments: medicalContext.editedDocuments, diagnosis: medicalContext.diagnosis },
      ['medic', 'prescr', 'treatment', 'traitement', 'drug', 'therap']
    )
    
    // Normaliser les médicaments trouvés
    medicaments = medicaments.map((med: any) => ({
      medication: med.medication || med.name || med.medicament || med.nom || '',
      name: med.name || med.medication || med.medicament || med.nom || '',
      dosage: med.dosage || med.dose || med.posologie || '',
      frequency: med.frequency || med.posology || med.posologie || med.frequence || '',
      posology: med.posology || med.frequency || med.posologie || med.frequence || '',
      duration: med.duration || med.duree || '',
      instructions: med.instructions || med.remarques || med.conseil || ''
    })).filter((med: any) => med.medication || med.name)
    
    console.log(`✓ ${medicaments.length} médicaments trouvés`)
    
    // 2. Recherche des examens biologiques
    console.log("🔬 Recherche des examens biologiques...")
    let examsBio = findInObject(
      { editedDocuments: medicalContext.editedDocuments, diagnosis: medicalContext.diagnosis },
      ['bio', 'lab', 'sang', 'urin', 'analy']
    )
    
    // Normaliser les examens bio
    examsBio = examsBio.map((exam: any) => ({
      name: exam.name || exam.type || exam.examen || exam.test || '',
      type: exam.type || exam.name || exam.examen || exam.test || '',
      urgency: exam.urgency || exam.urgent || 'Normal',
      justification: exam.justification || exam.indication || exam.remarques || ''
    })).filter((exam: any) => exam.name || exam.type)
    
    console.log(`✓ ${examsBio.length} examens biologiques trouvés`)
    
    // 3. Recherche des examens d'imagerie
    console.log("🏥 Recherche des examens d'imagerie...")
    let examsImaging = findInObject(
      { editedDocuments: medicalContext.editedDocuments, diagnosis: medicalContext.diagnosis },
      ['imag', 'radio', 'scan', 'irm', 'echo', 'paraclin', 'rx', 'tdm']
    )
    
    // Normaliser les examens imagerie
    examsImaging = examsImaging.map((exam: any) => ({
      type: exam.type || exam.name || exam.examen || exam.modalite || '',
      region: exam.region || exam.zone || exam.localisation || detectAnatomicalRegion(exam.type || exam.name || ''),
      indication: exam.indication || exam.justification || exam.motif || '',
      urgency: exam.urgency || exam.urgent || 'Normal',
      details: exam.details || exam.remarques || exam.precisions || ''
    })).filter((exam: any) => exam.type)
    
    console.log(`✓ ${examsImaging.length} examens d'imagerie trouvés`)
    
    // GÉNÉRATION AUTOMATIQUE SI AUCUNE PRESCRIPTION
    if (medicaments.length === 0 && diagnosticPrincipal) {
      console.log("⚠️ Aucun médicament trouvé, génération basée sur le diagnostic...")
      medicaments = generateMedicationsFromDiagnosis(diagnosticPrincipal)
    }
    
    if (examsBio.length === 0) {
      console.log("⚠️ Aucun examen biologique trouvé, génération d'un bilan standard...")
      examsBio = generateStandardBiologyExams(diagnosticPrincipal, medicalContext.patient.age)
    }
    
    if (examsImaging.length === 0 && shouldHaveImaging(diagnosticPrincipal)) {
      console.log("⚠️ Aucun examen d'imagerie trouvé, génération basée sur le diagnostic...")
      examsImaging = generateImagingFromDiagnosis(diagnosticPrincipal)
    }
    
    // Log final
    console.log("📊 RÉSUMÉ DES PRESCRIPTIONS À INCLURE:")
    console.log(`- ${medicaments.length} médicaments`)
    console.log(`- ${examsBio.length} examens biologiques`)
    console.log(`- ${examsImaging.length} examens d'imagerie`)
    
    // Extraire des informations supplémentaires des questions/réponses IA
    let aiInsights = ""
    if (medicalContext.aiQuestions && medicalContext.aiQuestions.length > 0) {
      aiInsights = medicalContext.aiQuestions.map((q: any) => 
        `${q.question || ''}: ${q.answer || q.response || ''}`
      ).join('. ')
    }
    
    // Créer le template JSON avec du contenu réel
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
        motifConsultation: "GÉNÉRER_PARAGRAPHE_150_200_MOTS",
        anamnese: "GÉNÉRER_PARAGRAPHE_300_400_MOTS",
        antecedents: "GÉNÉRER_PARAGRAPHE_200_250_MOTS",
        examenClinique: "GÉNÉRER_PARAGRAPHE_350_450_MOTS",
        syntheseDiagnostique: "GÉNÉRER_PARAGRAPHE_300_400_MOTS",
        conclusionDiagnostique: "GÉNÉRER_PARAGRAPHE_150_200_MOTS",
        priseEnCharge: "GÉNÉRER_PARAGRAPHE_250_350_MOTS",
        surveillance: "GÉNÉRER_PARAGRAPHE_200_250_MOTS",
        conclusion: "GÉNÉRER_PARAGRAPHE_150_200_MOTS"
      },
      
      prescriptions: {
        medicaments: {
          items: medicaments.map((med: Medication) => ({
            nom: med.medication || med.name || '',
            dci: extractDCI(med.medication || med.name || ''),
            dosage: med.dosage || '',
            forme: detectMedicationForm(med.medication || med.name || ''),
            posologie: med.frequency || med.posology || '',
            duree: med.duration || '',
            quantite: calculateQuantity(med),
            remarques: med.instructions || '',
            nonSubstituable: false
          })),
          renouvellement: shouldAllowRenewal(medicalContext.diagnosis),
          dateValidite: getValidityDate()
        },
        biologie: {
          examens: examsBio.map((exam: Examination) => ({
            type: exam.name || exam.type || '',
            code: getBiologyCode(exam.name || exam.type || ''),
            urgence: exam.urgency === 'Urgent' || exam.urgency === true,
            jeun: requiresFasting(exam.name || exam.type || ''),
            remarques: exam.justification || ''
          })),
          laboratoireRecommande: "Laboratoire d'analyses médicales agréé"
        },
        imagerie: {
          examens: examsImaging.map((exam: Examination) => ({
            type: exam.type || '',
            region: exam.region || detectAnatomicalRegion(exam.type || ''),
            indication: exam.indication || exam.justification || '',
            urgence: exam.urgency === 'Urgent' || exam.urgency === true,
            contraste: requiresContrast(exam.type || ''),
            remarques: exam.details || ''
          })),
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
    
    // Prompts séparés pour meilleur contrôle
    const systemPrompt = `Tu es un médecin senior expérimenté qui génère des comptes rendus médicaux.

RÈGLES ABSOLUES:
1. Tu DOIS répondre UNIQUEMENT avec un objet JSON valide
2. PAS de texte avant ou après le JSON
3. PAS de backticks ou de formatage markdown
4. PAS d'explication ou de commentaire
5. Commence directement par { et termine par }
6. Le JSON doit être valide et parsable

Dans la section "rapport", tu DOIS:
- Remplacer CHAQUE "GÉNÉRER_PARAGRAPHE_XXX_MOTS" par un vrai paragraphe médical
- Respecter les longueurs demandées (nombre de mots)
- Utiliser un vocabulaire médical professionnel
- Être cohérent avec les données du patient

IMPORTANT: Ne modifie JAMAIS les sections "prescriptions", garde-les exactement comme fournies.`

    const userPrompt = `Voici les données pour générer le compte rendu:

PATIENT:
- Nom: ${formatPatientName(medicalContext.patient)}
- Âge: ${medicalContext.patient.age} ans
- Sexe: ${medicalContext.patient.sexe}
- Antécédents: ${JSON.stringify(medicalContext.patient.antecedents)}
- Allergies: ${JSON.stringify(medicalContext.patient.allergies)}

CONSULTATION:
- Motif: ${motifConsultation}
- Symptômes: ${JSON.stringify(symptomes)}
- Signes vitaux: ${JSON.stringify(vitalSigns)}
- Examen physique: ${JSON.stringify(examenPhysique)}

DIAGNOSTIC:
- Principal: ${diagnosticPrincipal}
- Secondaires: ${JSON.stringify(diagnosticsSecondaires)}
- Analyse: ${analyseDiagnostique}

${aiInsights ? `INFORMATIONS COMPLÉMENTAIRES: ${aiInsights}` : ''}

Génère le JSON complet en remplaçant tous les "GÉNÉRER_PARAGRAPHE_XXX_MOTS" par du contenu médical réel:

${JSON.stringify(jsonTemplate, null, 2)}`

    return {
      template: jsonTemplate,
      systemPrompt,
      userPrompt
    }
  } catch (error) {
    console.error("❌ Erreur dans generateProfessionalReportPrompt:", error)
    throw error
  }
}

// Fonction améliorée de parsing avec meilleure gestion d'erreur
function parseAndValidateReport(responseText: string): any {
  try {
    console.log("🔍 Début du parsing de la réponse GPT-4...")
    
    // Si la réponse est trop courte, c'est probablement une erreur
    if (responseText.length < 100) {
      console.error("❌ Réponse trop courte:", responseText)
      throw new Error("La réponse de GPT-4 est trop courte pour être un rapport valide")
    }
    
    let cleanedResponse = responseText.trim()
    
    // Log des premiers caractères pour debug
    console.log("📝 Premiers caractères de la réponse:", cleanedResponse.substring(0, 100))
    
    // Vérifier si la réponse commence par du texte au lieu de JSON
    if (!cleanedResponse.startsWith('{') && !cleanedResponse.includes('{')) {
      console.error("❌ La réponse ne contient pas de JSON:", cleanedResponse.substring(0, 200))
      throw new Error("GPT-4 n'a pas retourné de JSON valide")
    }
    
    // Essayer d'extraire le JSON même s'il y a du texte avant/après
    const jsonStart = cleanedResponse.indexOf('{')
    const jsonEnd = cleanedResponse.lastIndexOf('}')
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error('Aucun JSON valide trouvé dans la réponse')
    }
    
    cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1)
    
    // Supprimer les backticks s'il y en a
    cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
    
    // Parser le JSON
    let parsed: any
    try {
      parsed = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error("❌ Erreur de parsing JSON:", parseError)
      console.error("📝 JSON à parser:", cleanedResponse.substring(0, 500))
      
      // Tentative de réparation du JSON
      try {
        // Remplacer les sauts de ligne non échappés dans les strings
        const repairedJson = cleanedResponse
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
        
        parsed = JSON.parse(repairedJson)
      } catch (repairError) {
        throw new Error('Impossible de parser le JSON même après réparation')
      }
    }
    
    // Validation de la structure
    if (!parsed.header || !parsed.identification || !parsed.rapport) {
      console.error("❌ Structure invalide:", Object.keys(parsed))
      throw new Error('Structure du rapport invalide: sections manquantes')
    }
    
    // Vérifier que les sections ont été générées
    const rapportSections = ['motifConsultation', 'anamnese', 'antecedents', 'examenClinique', 
                            'syntheseDiagnostique', 'conclusionDiagnostique', 'priseEnCharge', 
                            'surveillance', 'conclusion']
    
    for (const section of rapportSections) {
      if (!parsed.rapport[section] || parsed.rapport[section].includes('GÉNÉRER_PARAGRAPHE')) {
        console.warn(`⚠️ Section non générée: ${section}`)
        // Remplacer par un contenu par défaut
        parsed.rapport[section] = generateDefaultContent(section)
      }
    }
    
    console.log("✅ Parsing réussi!")
    return parsed
    
  } catch (error) {
    console.error('❌ Erreur complète de parsing:', error)
    throw error
  }
}

// Fonctions de génération automatique de prescriptions
function generateMedicationsFromDiagnosis(diagnosis: any): Medication[] {
  // Convertir le diagnosis en string s'il s'agit d'un objet
  let diagText = ''
  
  if (typeof diagnosis === 'string') {
    diagText = diagnosis
  } else if (diagnosis && typeof diagnosis === 'object') {
    diagText = [
      diagnosis.condition,
      diagnosis.primary?.condition,
      diagnosis.diagnosis,
      diagnosis.detailedAnalysis
    ].filter(Boolean).join(' ')
  }
  
  const diag = diagText.toLowerCase()
  const medications: Medication[] = []
  
  // Infections
  if (diag.includes('infection') || diag.includes('angine') || diag.includes('otite') || 
      diag.includes('sinusite') || diag.includes('bronchite')) {
    medications.push({
      medication: "Amoxicilline",
      dosage: "1g",
      frequency: "2 fois par jour",
      duration: "7 jours",
      instructions: "À prendre au milieu du repas"
    })
  }
  
  // Douleur/Fièvre
  if (diag.includes('douleur') || diag.includes('fièvre') || diag.includes('céphalée') || 
      diag.includes('migraine')) {
    medications.push({
      medication: "Paracétamol",
      dosage: "1g",
      frequency: "3 fois par jour si douleur",
      duration: "5 jours",
      instructions: "Maximum 3g par jour. Espacer de 6 heures minimum"
    })
  }
  
  // Inflammation
  if (diag.includes('inflamm') || diag.includes('arthrite') || diag.includes('tendinite')) {
    medications.push({
      medication: "Ibuprofène",
      dosage: "400mg",
      frequency: "3 fois par jour",
      duration: "5 jours",
      instructions: "Pendant les repas. Contre-indiqué si ulcère"
    })
  }
  
  // Hypertension
  if (diag.includes('hypertension') || diag.includes('hta')) {
    medications.push({
      medication: "Ramipril",
      dosage: "5mg",
      frequency: "1 comprimé le matin",
      duration: "3 mois",
      instructions: "Surveillance tension et fonction rénale"
    })
  }
  
  // Diabète
  if (diag.includes('diabète') || diag.includes('diabete')) {
    medications.push({
      medication: "Metformine",
      dosage: "500mg",
      frequency: "2 fois par jour",
      duration: "3 mois",
      instructions: "Pendant ou après les repas"
    })
  }
  
  // Si aucun médicament spécifique, ajouter un antalgique de base
  if (medications.length === 0) {
    medications.push({
      medication: "Paracétamol",
      dosage: "500mg",
      frequency: "Si besoin, jusqu'à 3 fois par jour",
      duration: "Selon besoin",
      instructions: "Maximum 3g par jour"
    })
  }
  
  return medications
}

function generateStandardBiologyExams(diagnosis: any, age: any): Examination[] {
  const exams: Examination[] = [
    {
      name: "NFS (Numération Formule Sanguine)",
      urgency: "Normal",
      justification: "Bilan de base, recherche d'anomalies hématologiques"
    }
  ]
  
  // Convertir le diagnosis en string
  let diagText = ''
  if (typeof diagnosis === 'string') {
    diagText = diagnosis
  } else if (diagnosis && typeof diagnosis === 'object') {
    diagText = [
      diagnosis.condition,
      diagnosis.primary?.condition,
      diagnosis.diagnosis
    ].filter(Boolean).join(' ')
  }
  
  const diag = diagText.toLowerCase()
  const patientAge = parseInt(String(age)) || 0
  
  // Marqueurs inflammatoires
  if (diag.includes('inflam') || diag.includes('infection') || diag.includes('fièvre')) {
    exams.push({
      name: "CRP (Protéine C-Réactive)",
      urgency: "Normal",
      justification: "Recherche de syndrome inflammatoire"
    })
  }
  
  // Bilan rénal/hépatique si > 50 ans ou certaines pathologies
  if (patientAge > 50 || diag.includes('hypertension') || diag.includes('diabète')) {
    exams.push({
      name: "Créatinine avec DFG",
      urgency: "Normal",
      justification: "Évaluation de la fonction rénale"
    })
    exams.push({
      name: "Transaminases (ASAT/ALAT)",
      urgency: "Normal",
      justification: "Bilan hépatique de base"
    })
  }
  
  // Glycémie
  if (diag.includes('diabète') || patientAge > 45) {
    exams.push({
      name: "Glycémie à jeun",
      urgency: "Normal",
      justification: "Dépistage ou suivi diabétique"
    })
  }
  
  // Bilan lipidique
  if (diag.includes('cardio') || diag.includes('vasculaire') || patientAge > 50) {
    exams.push({
      name: "Bilan lipidique complet",
      urgency: "Normal",
      justification: "Évaluation du risque cardiovasculaire"
    })
  }
  
  return exams
}

function shouldHaveImaging(diagnosis: any): boolean {
  // Convertir le diagnosis en string s'il s'agit d'un objet
  let diagText = ''
  
  if (typeof diagnosis === 'string') {
    diagText = diagnosis
  } else if (diagnosis && typeof diagnosis === 'object') {
    // Extraire le texte de toutes les propriétés possibles
    diagText = [
      diagnosis.condition,
      diagnosis.primary?.condition,
      diagnosis.diagnosis,
      diagnosis.detailedAnalysis,
      diagnosis.clinicalRationale
    ].filter(Boolean).join(' ')
  }
  
  const diag = diagText.toLowerCase()
  const imagingKeywords = [
    'thorax', 'poumon', 'pneumonie', 'bronchite', 'toux',
    'abdomen', 'ventre', 'douleur abdominale',
    'trauma', 'fracture', 'entorse',
    'céphalée', 'migraine', 'vertige',
    'rachis', 'lombalgie', 'dorsalgie'
  ]
  
  return imagingKeywords.some(keyword => diag.includes(keyword))
}

function generateImagingFromDiagnosis(diagnosis: any): Examination[] {
  // Convertir le diagnosis en string
  let diagText = ''
  if (typeof diagnosis === 'string') {
    diagText = diagnosis
  } else if (diagnosis && typeof diagnosis === 'object') {
    diagText = [
      diagnosis.condition,
      diagnosis.primary?.condition,
      diagnosis.diagnosis
    ].filter(Boolean).join(' ')
  }
  
  const diag = diagText.toLowerCase()
  const exams: Examination[] = []
  
  // Pathologies thoraciques
  if (diag.includes('thorax') || diag.includes('poumon') || diag.includes('toux') || 
      diag.includes('dyspnée') || diag.includes('pneumonie')) {
    exams.push({
      type: "Radiographie thoracique",
      region: "Thorax",
      indication: "Recherche de pathologie pulmonaire",
      urgency: "Normal"
    })
  }
  
  // Pathologies abdominales
  if (diag.includes('abdom') || diag.includes('ventre')) {
    exams.push({
      type: "Échographie abdominale",
      region: "Abdomen",
      indication: "Exploration douleur abdominale",
      urgency: "Normal"
    })
  }
  
  // Pathologies ostéo-articulaires
  if (diag.includes('fracture') || diag.includes('trauma') || diag.includes('entorse')) {
    exams.push({
      type: "Radiographie standard",
      region: "Zone douloureuse",
      indication: "Recherche de lésion osseuse",
      urgency: "Normal"
    })
  }
  
  return exams
}

// Fonctions utilitaires
function formatPatientName(patient: any): string {
  const nom = (patient.nom || patient.lastName || '').toUpperCase()
  const prenom = (patient.prenom || patient.firstName || '')
  const fullName = `${nom} ${prenom}`.trim()
  return fullName || 'PATIENT'
}

function formatDate(dateValue: any): string {
  if (!dateValue) return 'Non renseignée'
  
  try {
    const dateString = String(dateValue)
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString
    }
    
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) {
      return dateString
    }
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return String(dateValue)
  }
}

function extractDCI(medicationName: any): string {
  const name = String(medicationName || '')
  if (!name) return 'À préciser'
  
  const commonDCIs: Record<string, string> = {
    'doliprane': 'Paracétamol',
    'efferalgan': 'Paracétamol',
    'dafalgan': 'Paracétamol',
    'advil': 'Ibuprofène',
    'nurofen': 'Ibuprofène',
    'augmentin': 'Amoxicilline + Acide clavulanique',
    'clamoxyl': 'Amoxicilline',
    'ventoline': 'Salbutamol',
    'spasfon': 'Phloroglucinol',
    'levothyrox': 'Lévothyroxine',
    'kardegic': 'Acide acétylsalicylique',
    'xarelto': 'Rivaroxaban',
    'metformine': 'Metformine',
    'ramipril': 'Ramipril',
    'lexomil': 'Bromazépam',
    'xanax': 'Alprazolam',
    'inexium': 'Esoméprazole',
    'omeprazole': 'Oméprazole'
  }
  
  const lowerName = name.toLowerCase()
  
  for (const [brand, dci] of Object.entries(commonDCIs)) {
    if (lowerName === brand || lowerName.startsWith(brand + ' ')) return dci
  }
  
  for (const [brand, dci] of Object.entries(commonDCIs)) {
    if (lowerName.includes(brand)) return dci
  }
  
  return name
}

function detectMedicationForm(name: any): string {
  const lowerName = String(name || '').toLowerCase()
  if (!lowerName) return 'comprimé'
  
  if (lowerName.includes('sirop')) return 'sirop'
  if (lowerName.includes('gélule')) return 'gélule'
  if (lowerName.includes('comprimé effervescent')) return 'comprimé effervescent'
  if (lowerName.includes('comprimé orodispersible')) return 'comprimé orodispersible'
  if (lowerName.includes('sachet')) return 'poudre en sachet'
  if (lowerName.includes('injectable')) return 'solution injectable'
  if (lowerName.includes('crème')) return 'crème'
  if (lowerName.includes('pommade')) return 'pommade'
  if (lowerName.includes('gel')) return 'gel'
  if (lowerName.includes('collyre')) return 'collyre'
  if (lowerName.includes('spray')) return 'spray'
  if (lowerName.includes('suppositoire')) return 'suppositoire'
  if (lowerName.includes('patch')) return 'patch transdermique'
  if (lowerName.includes('gouttes')) return 'solution en gouttes'
  
  return 'comprimé'
}

function calculateQuantity(med: Medication): string {
  const duration = String(med.duration || '')
  const frequency = String(med.frequency || med.posology || '')
  
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
  
  let dailyDoses = 1
  const freqMatch = frequency.match(/(\d+)\s*fois/i)
  if (freqMatch) {
    dailyDoses = parseInt(freqMatch[1])
  } else if (frequency.includes('matin et soir')) {
    dailyDoses = 2
  } else if (frequency.includes('matin, midi et soir')) {
    dailyDoses = 3
  }
  
  const totalDoses = days * dailyDoses
  
  if (totalDoses > 0) {
    if (totalDoses <= 30) return '1 boîte'
    if (totalDoses <= 60) return '2 boîtes'
    if (totalDoses <= 90) return '3 boîtes'
    return `${Math.ceil(totalDoses / 30)} boîtes`
  }
  
  return '1 boîte'
}

function getBiologyCode(examName: any): string {
  const name = String(examName || '').toLowerCase()
  if (!name) return ''
  
  const codes: Record<string, string> = {
    'nfs': '1104',
    'numération formule sanguine': '1104',
    'glycémie': '0552',
    'glucose': '0552',
    'crp': '1803',
    'protéine c réactive': '1803',
    'tsh': '7217',
    'créatinine': '0592',
    'transaminases': '0522-0523',
    'asat': '0522',
    'alat': '0523',
    'cholestérol': '0585',
    'bilan lipidique': '0585-0586-0587-1320',
    'ferritine': '0888',
    'vitamine d': '1810',
    'hba1c': '0997',
    'inr': '1605',
    'ionogramme': '1610-1611'
  }
  
  for (const [exam, code] of Object.entries(codes)) {
    if (name.includes(exam)) return code
  }
  
  return ''
}

function requiresFasting(examName: any): boolean {
  const name = String(examName || '').toLowerCase()
  if (!name) return false
  
  const fastingExams = [
    'glycémie', 'glucose', 'bilan lipidique', 'cholestérol', 
    'triglycérides', 'hdl', 'ldl', 'glycémie à jeun',
    'insuline', 'peptide c', 'homa'
  ]
  
  return fastingExams.some(exam => name.includes(exam))
}

function requiresContrast(examType: any): boolean {
  const type = String(examType || '').toLowerCase()
  if (!type) return false
  
  const contrastExams = [
    'scanner', 'tdm', 'tomodensitométrie', 'angioscanner',
    'irm avec injection', 'arthroscanner', 'uroscanner',
    'coroscanner', 'angio-irm', 'bili-irm'
  ]
  
  return contrastExams.some(exam => type.includes(exam))
}

function detectAnatomicalRegion(examType: any): string {
  const type = String(examType || '').toLowerCase()
  if (!type) return 'Corps entier'
  
  const regions: Record<string, string> = {
    'thorax': 'Thorax',
    'thoracique': 'Thorax',
    'poumon': 'Thorax',
    'pulmonaire': 'Thorax',
    'abdom': 'Abdomen',
    'ventre': 'Abdomen',
    'foie': 'Abdomen',
    'crân': 'Crâne',
    'cérébr': 'Crâne',
    'rachis': 'Rachis',
    'lombaire': 'Rachis lombaire',
    'cervical': 'Rachis cervical',
    'genou': 'Genou',
    'épaule': 'Épaule',
    'hanche': 'Hanche',
    'cheville': 'Cheville',
    'main': 'Main',
    'pied': 'Pied'
  }
  
  for (const [key, value] of Object.entries(regions)) {
    if (type.includes(key)) return value
  }
  
  return 'À préciser'
}

function shouldAllowRenewal(diagnosisData: any): boolean {
  const chronicConditions = [
    'hypertension', 'diabète', 'asthme', 'bpco', 'insuffisance cardiaque',
    'épilepsie', 'parkinson', 'alzheimer', 'polyarthrite', 'thyroïde',
    'dépression', 'anxiété', 'cholestérol', 'migraine chronique'
  ]
  
  const diagnosisText = [
    diagnosisData?.diagnosis,
    diagnosisData?.primaryDiagnosis,
    diagnosisData?.mainDiagnosis
  ].filter(Boolean).join(' ').toLowerCase()
  
  return chronicConditions.some(condition => diagnosisText.includes(condition))
}

function getValidityDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 3)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function calculateWordCount(rapport: any): number {
  const allText = Object.values(rapport)
    .filter(value => typeof value === 'string')
    .join(' ')
  
  return allText.split(/\s+/).filter(word => word.length > 0).length
}

function formatSimplifiedExamsPrescription(reportData: any): string {
  const lines: string[] = ["ORDONNANCE - EXAMENS COMPLÉMENTAIRES\n"]
  
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
