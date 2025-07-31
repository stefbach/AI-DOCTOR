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
    let prompt: string
    try {
      prompt = generateProfessionalReportPrompt(medicalContext, patientData)
    } catch (promptError) {
      console.error("❌ Erreur lors de la génération du prompt:", promptError)
      throw new Error(`Erreur de génération du prompt: ${promptError instanceof Error ? promptError.message : 'Erreur inconnue'}`)
    }

    console.log("🤖 Génération du rapport avec GPT-4...")
    console.log("📝 Longueur du prompt:", prompt.length, "caractères")
    
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt,
      maxTokens: 12000,
      temperature: 0.3,
      systemPrompt: "Tu es un assistant médical expert qui génère UNIQUEMENT du JSON valide sans aucun formatage markdown. Ne jamais utiliser de backticks ou de formatage de code. Génère des textes médicaux détaillés et complets pour chaque section en respectant les longueurs minimales demandées. Remplace complètement les instructions par du contenu médical réel."
    })

    console.log("✅ Réponse GPT-4 reçue, longueur:", result.text.length, "caractères")

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

// Fonction pour générer le prompt structuré
function generateProfessionalReportPrompt(medicalContext: any, patientData: PatientData): string {
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
    
    // Créer le template JSON
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
        motifConsultation: `[REMPLACER PAR UN PARAGRAPHE DE 150-200 MOTS] Décrire en détail le motif principal de consultation basé sur : ${motifConsultation}. Inclure la durée des symptômes, leur évolution, les facteurs déclenchants et aggravants, l'impact sur les activités quotidiennes, les traitements déjà essayés.`,
        anamnese: `[REMPLACER PAR UN PARAGRAPHE DE 300-400 MOTS] Détailler l'histoire complète de la maladie actuelle en intégrant : ${JSON.stringify(symptomes)}. Décrire la chronologie précise des symptômes, leur caractère (type de douleur, localisation, irradiation), leur intensité (échelle de douleur), leur évolution dans le temps (amélioration/aggravation), les facteurs déclenchants et soulageants, les traitements déjà essayés et leur efficacité, l'impact sur le sommeil et l'alimentation. ${aiInsights ? 'Informations complémentaires issues de l\'interrogatoire : ' + aiInsights : ''}`,
        antecedents: `[REMPLACER PAR UN PARAGRAPHE DE 200-250 MOTS] Présenter les antécédents médicaux du patient : ${JSON.stringify(medicalContext.patient.antecedents)}, allergies : ${JSON.stringify(medicalContext.patient.allergies)}. Inclure les antécédents médicaux personnels (maladies chroniques, hospitalisations, interventions chirurgicales), les antécédents familiaux pertinents (maladies héréditaires, cancers, maladies cardiovasculaires), les habitudes de vie (tabac, alcool, activité physique), les traitements au long cours, les allergies médicamenteuses et alimentaires avec leurs manifestations.`,
        examenClinique: `[REMPLACER PAR UN PARAGRAPHE DE 350-450 MOTS] Décrire l'examen clinique systématique et complet. État général (conscient, orienté, état nutritionnel), constantes vitales : ${JSON.stringify(vitalSigns)}. Examen physique par appareil : ${JSON.stringify(examenPhysique)}. Détailler l'inspection (morphologie, coloration cutanée, œdèmes), la palpation (masses, points douloureux, organomégalie), la percussion (matité, tympanisme) et l'auscultation (bruits cardiaques, murmure vésiculaire, bruits surajoutés) pour chaque système. Inclure l'examen neurologique sommaire si pertinent.`,
        syntheseDiagnostique: `[REMPLACER PAR UN PARAGRAPHE DE 300-400 MOTS] Analyser les données cliniques : ${analyseDiagnostique}. Discuter le raisonnement diagnostique en corrélant les symptômes avec les signes cliniques, évoquer les hypothèses diagnostiques principales et secondaires, argumenter les diagnostics différentiels écartés et pourquoi (critères cliniques manquants), expliquer la cohérence entre l'anamnèse et l'examen clinique, justifier les examens complémentaires demandés pour confirmer ou infirmer les hypothèses.`,
        conclusionDiagnostique: `[REMPLACER PAR UN PARAGRAPHE DE 150-200 MOTS] Diagnostic principal retenu : ${diagnosticPrincipal}. ${diagnosticsSecondaires.length > 0 ? 'Diagnostics secondaires : ' + JSON.stringify(diagnosticsSecondaires) : ''}. Justifier le diagnostic retenu par les éléments cliniques positifs (symptômes caractéristiques, signes pathognomoniques), les critères diagnostiques remplis, la cohérence avec l'évolution naturelle de la pathologie, et éventuellement les résultats des examens complémentaires déjà disponibles.`,
        priseEnCharge: `[REMPLACER PAR UN PARAGRAPHE DE 250-350 MOTS] Détailler la stratégie thérapeutique complète : traitement médicamenteux prescrit (${medicaments.length} médicaments avec leurs objectifs thérapeutiques), examens complémentaires demandés (${examsBio.length} examens biologiques pour évaluer quoi, ${examsImaging.length} examens d'imagerie pour explorer quoi), mesures hygiéno-diététiques adaptées à la pathologie (régime, activité physique, arrêt tabac si pertinent), kinésithérapie ou rééducation si nécessaire, orientation éventuelle vers un spécialiste avec le degré d'urgence.`,
        surveillance: `[REMPLACER PAR UN PARAGRAPHE DE 200-250 MOTS] Préciser le plan de suivi détaillé : signes d'alarme à surveiller (aggravation des symptômes, apparition de nouveaux signes), consignes précises données au patient (quand reconsulter, comment prendre le traitement), modalités de réévaluation (délai de contrôle, examens de suivi), critères objectifs de bonne évolution (diminution de la douleur, normalisation des constantes), conduite à tenir en cas d'aggravation ou d'effets secondaires, numéros d'urgence si nécessaire.`,
        conclusion: `[REMPLACER PAR UN PARAGRAPHE DE 150-200 MOTS] Synthétiser les points clés de la consultation : diagnostic principal et sa gravité, pronostic attendu à court et moyen terme, points essentiels du traitement et leur importance, prochaines étapes du parcours de soins, importance de l'observance thérapeutique et du suivi, éléments de réassurance pour le patient, rappel des signes d'alerte principaux.`
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
    
    // Construire le prompt
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

INSTRUCTIONS CRITIQUES :
1. Génère UNIQUEMENT un objet JSON valide, sans aucun formatage markdown
2. Dans la section "rapport", REMPLACE COMPLÈTEMENT chaque instruction [REMPLACER PAR...] par du contenu médical réel
3. Chaque section doit respecter la longueur minimale indiquée
4. CONSERVE EXACTEMENT les données de prescriptions fournies sans les modifier
5. N'utilise AUCUN placeholder ou instruction dans le résultat final

Génère le rapport au format JSON suivant :

${JSON.stringify(jsonTemplate, null, 2)}

RAPPEL : Remplace TOUTES les instructions par du contenu médical pertinent et détaillé.`

    return prompt
  } catch (error) {
    console.error("❌ Erreur dans generateProfessionalReportPrompt:", error)
    throw error
  }
}

// Fonctions de génération automatique de prescriptions
function generateMedicationsFromDiagnosis(diagnosis: any): Medication[] {
  // Convertir le diagnostic en string s'il s'agit d'un objet
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
  
  // Convertir le diagnostic en string
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
  // Convertir le diagnostic en string s'il s'agit d'un objet
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

// Fonctions utilitaires (gardées de la version originale)
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

function parseAndValidateReport(responseText: string): any {
  try {
    let cleanedResponse = responseText.trim()
    
    // Supprimer les backticks
    cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
    
    // Parser avec gestion des retours à la ligne
    const lines = cleanedResponse.split('\n')
    let inString = false
    let escapeNext = false
    let result = ''
    let currentQuoteChar = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        const prevChar = j > 0 ? line[j - 1] : ''
        
        if (escapeNext) {
          result += char
          escapeNext = false
          continue
        }
        
        if (char === '\\') {
          escapeNext = true
          result += char
          continue
        }
        
        if ((char === '"' || char === "'") && !inString) {
          inString = true
          currentQuoteChar = char
          result += char
        } else if (char === currentQuoteChar && inString && prevChar !== '\\') {
          inString = false
          currentQuoteChar = ''
          result += char
        } else {
          result += char
        }
      }
      
      if (inString && i < lines.length - 1) {
        result += ' '
      } else if (!inString && i < lines.length - 1) {
        result += '\n'
      }
    }
    
    // Parser le JSON
    const parsed = JSON.parse(result)
    
    // Validation minimale
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
