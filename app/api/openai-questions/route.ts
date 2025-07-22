import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🤖 API Questions IA - Début")

    let requestData: {
      patientData?: any
      clinicalData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour questions IA")
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON questions:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { patientData, clinicalData } = requestData

    if (!patientData || !clinicalData) {
      console.log("⚠️ Données manquantes pour générer les questions")
      return NextResponse.json(
        {
          error: "Données patient et cliniques requises",
          success: false,
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Génération questions pour: ${patientData.firstName} ${patientData.lastName}`)

    // Analyser les données pour éviter les redondances
    const askedElements = extractAlreadyAskedElements(patientData, clinicalData)
    
    const prompt = `
En tant que CLINICIEN EXPERT de haut niveau à l'île Maurice, générez des questions diagnostiques de NIVEAU SPÉCIALISTE basées sur une approche médicale avancée et evidence-based.

APPROCHE EXPERT REQUISE:
1. **Stratification du risque** immédiate (urgence vitale vs différée)
2. **Scores cliniques validés** (HEART, SIRS, qSOFA, IHS, Glasgow, ABCD2, etc.)  
3. **Diagnostic différentiel hiérarchisé** par probabilité et gravité
4. **Phénotypage précis** des symptômes selon physiopathologie
5. **Red flags** spécifiques nécessitant prise en charge immédiate
6. **Corrélations physiopathologiques** avancées
7. **Guidelines internationales** (ESC, AHA, IHS, IDSA)

PATIENT (Analyse complète du terrain):
- ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
- IMC: ${calculateBMI(patientData.weight, patientData.height)} (${getBMICategory(patientData.weight, patientData.height)})
- Facteurs de risque CV: ${getCardiovascularRisk(patientData)}
- Terrain immunologique: ${getImmuneStatus(patientData)}
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
- Antécédents stratifiés: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}
- Thérapeutiques: ${patientData.currentMedicationsText || "Aucun"}
- Facteurs de risque: Tabac: ${patientData.lifeHabits?.smoking || "Non renseigné"}, Alcool: ${patientData.lifeHabits?.alcohol || "Non renseigné"}

DONNÉES CLINIQUES (Analyse sémiologique avancée):
- Motif principal: ${clinicalData.chiefComplaint || "Non renseigné"}
- Sémiologie: ${clinicalData.symptoms || "Non renseigné"}
- Examen physique: ${clinicalData.physicalExam || "Non renseigné"}
- Paramètres vitaux: T°${clinicalData.vitalSigns?.temperature || "?"}°C, TA ${clinicalData.vitalSigns?.bloodPressure || "?"}, FC ${clinicalData.vitalSigns?.heartRate || "?"}/min

ÉLÉMENTS DOCUMENTÉS (ne pas redemander):
${askedElements.map(element => `- ${element}`).join('\n')}

CONTEXTE MAURICIEN (Épidémiologie locale intégrée):
- Pathologies endémiques dans le diagnostic différentiel: Dengue, chikungunya, paludisme, leptospirose, fièvre typhoïde
- Résistances locales connues, patterns épidémiologiques
- Facteurs environnementaux (climat tropical, saison cyclonique)

EXPERTISE CLINIQUE PAR SYNDROME:

**DOULEUR THORACIQUE** (Niveau cardiologique):
- Score HEART (History, ECG, Age, Risk factors, Troponin)
- Critères ESC pour SCA: douleur typique/atypique/non-angineuse  
- Stratification TIMI risk score si SCA
- Diagnostic différentiel: cardiaque (ICS, péricardite, dissection aortique) vs non-cardiaque

**SYNDROME FÉBRILE** (Niveau infectiologique):
- Critères SIRS (Systemic Inflammatory Response Syndrome) 
- qSOFA score si suspicion sepsis (pression systolique, échelle Glasgow, fréquence respiratoire)
- Pattern fébrile diagnostique: continu/intermittent/ondulant/récurrent
- Foyers infectieux selon terrain et contexte mauricien

**CÉPHALÉES** (Niveau neurologique):
- Red flags urgents: thunderclap, signes focaux, fièvre + raideur nucale
- Critères IHS (International Headache Society) pour diagnostic précis
- Stratification: primaire vs secondaire avec niveau de risque
- Score ABCD2 si suspicion AIT

**DYSPNÉE** (Niveau pneumologique/cardiologique):
- Classification NYHA si origine cardiaque
- Critères de Wells pour embolie pulmonaire  
- Scores de gravité selon contexte (CURB-65 si pneumonie)

GÉNÉRATION EXPERT - 5-8 QUESTIONS DE HAUT NIVEAU:

Format JSON expert requis:
{
  "questions": [
    {
      "id": 1,
      "question": "Question diagnostique précise utilisant terminologie médicale appropriée et scores validés",
      "type": "multiple_choice",
      "options": ["Réponse avec critères précis/scores", "Option basée guidelines", "Critère physiopathologique", "Élément pronostique/red flag"],
      "rationale": "Justification basée sur littérature médicale, guidelines internationales et scores validés",
      "category": "risk_stratification|phenotyping|differential_diagnosis|red_flags|prognostic_factors",
      "diagnostic_value": "high|medium|low",
      "clinical_score": "HEART|SIRS|qSOFA|IHS|TIMI|ABCD2|Wells|autre_score_validé",
      "evidence_level": "A|B|C selon guidelines ESC/AHA/IHS/IDSA",
      "clinical_pearls": "Élément clinique expert spécifique, piège diagnostique à éviter",
      "red_flags": "Signes d'alarme spécifiques nécessitant prise en charge urgente",
      "physiopathology": "Mécanisme physiopathologique sous-jacent"
    }
  ]
}

CRITÈRES NIVEAU EXPERT OBLIGATOIRES:
✓ Questions basées sur scores cliniques validés
✓ Stratification de risque immédiate (vital/urgent/différé)  
✓ Terminologie médicale précise de spécialiste
✓ Red flags spécifiques par syndrome
✓ Corrélations physiopathologiques avancées
✓ Clinical pearls et pièges diagnostiques
✓ Evidence level selon guidelines internationales
✓ Orientation examens complémentaires si pertinent
✓ Éléments pronostiques

RÈGLES EXPERT:
- Utiliser OBLIGATOIREMENT des scores cliniques reconnus  
- Stratifier SYSTÉMATIQUEMENT le risque
- Intégrer les red flags spécifiques
- Baser sur guidelines internationales
- Éviter questions génériques/basiques
- Niveau spécialiste en terminologie médicale
- Contexte mauricien intégré sans questions d'exposition
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.2, // Réduction pour plus de cohérence
      maxTokens: 2000,
    })

    console.log("🧠 Questions IA générées")

    // Tentative de parsing JSON avec fallback amélioré
    let questionsData
    try {
      let cleanedText = result.text.trim()
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      questionsData = JSON.parse(cleanedText)

      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        throw new Error("Structure JSON invalide")
      }

      // Validation et déduplication
      questionsData.questions = deduplicateQuestions(questionsData.questions, askedElements)
      
      console.log(`✅ ${questionsData.questions.length} questions non-redondantes parsées`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON, génération de questions de fallback ciblées")
      questionsData = generateSmartFallbackQuestions(patientData, clinicalData, askedElements)
    }

    const response = {
      success: true,
      questions: questionsData.questions,
      metadata: {
        // Données patient de base
        patientAge: patientData.age,
        patientGender: patientData.gender,
        patientBMI: calculateBMI(patientData.weight, patientData.height),
        patientBMICategory: getBMICategory(patientData.weight, patientData.height),
        
        // Stratification des risques
        cardiovascularRisk: getCardiovascularRisk(patientData),
        immuneStatus: getImmuneStatus(patientData),
        
        // Données cliniques
        chiefComplaint: clinicalData.chiefComplaint,
        vitalSigns: clinicalData.vitalSigns,
        
        // Métadonnées de génération
        questionsCount: questionsData.questions.length,
        generatedAt: new Date().toISOString(),
        aiModel: "gpt-4o",
        
        // Contexte et approche
        location: "Maurice",
        approach: "expert-level-evidence-based",
        medicalLevel: finalAssessment.level,
        medicalScore: finalAssessment.score,
        
        // Exclusions et filtres
        excludedElements: askedElements,
        tropicalExposureQuestionsExcluded: true,
        
        // Analyse qualité experte
        expertFeatures: {
          clinicalScoresUsed: questionsData.questions.filter(q => q.clinical_score).length,
          redFlagsIdentified: questionsData.questions.filter(q => q.red_flags).length,
          evidenceLevelA: questionsData.questions.filter(q => q.evidence_level === 'A').length,
          riskStratificationQuestions: questionsData.questions.filter(q => q.category === 'risk_stratification').length,
          physiopathologyExplained: questionsData.questions.filter(q => q.physiopathology).length,
          clinicalPearls: questionsData.questions.filter(q => q.clinical_pearls).length,
        },
        
        // Détails de l'évaluation
        qualityAssessment: finalAssessment.details,
        
        // Guidelines et scores utilisés
        clinicalScoresAvailable: ["HEART", "SIRS", "qSOFA", "IHS", "ABCD2", "Wells", "Framingham", "Charlson", "Karnofsky"],
        guidelinesReferenced: ["ESC", "AHA", "IHS", "IDSA", "European Stroke Organisation"],
      },
      
      // Recommandations cliniques pour le médecin
      clinicalRecommendations: {
        urgencyLevel: determineUrgencyLevel(questionsData.questions),
        suggestedWorkup: suggestWorkup(patientData, clinicalData),
        redFlagAlerts: extractRedFlags(questionsData.questions),
        followUpRecommendations: generateFollowUpRecommendations(finalAssessment, patientData)
      }
    }

    console.log(`✅ Questions niveau EXPERT générées: ${questionsData.questions.length} - Niveau médical: ${finalAssessment.level}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Questions IA:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions niveau expert",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Fonctions helper pour les recommandations cliniques expertes
function determineUrgencyLevel(questions: any[]): string {
  const redFlagCount = questions.filter(q => q.red_flags).length
  const riskStratCount = questions.filter(q => q.category === 'risk_stratification').length
  
  if (redFlagCount > 0) return "URGENT - Red flags identifiés"
  if (riskStratCount >= 2) return "PRIORITAIRE - Stratification de risque nécessaire"
  return "STANDARD - Surveillance clinique"
}

function suggestWorkup(patientData: any, clinicalData: any): string[] {
  const workup = []
  const symptoms = `${clinicalData.symptoms || ""} ${clinicalData.chiefComplaint || ""}`.toLowerCase()
  
  if (symptoms.includes("thorax") || symptoms.includes("poitrine")) {
    workup.push("ECG 12 dérivations + troponines", "Rx thorax", "Écho-cardiographie si clinique évocatrice")
  }
  
  if (symptoms.includes("fièvre") || (clinicalData.vitalSigns?.temperature && parseFloat(clinicalData.vitalSigns.temperature) > 37.5)) {
    workup.push("Hémocultures x2", "CRP + PCT", "ECBU", "NFS + CRP + ionogramme")
  }
  
  if (symptoms.includes("céphal") || symptoms.includes("tête")) {
    workup.push("Fond d'œil + examen neurologique", "TDM cérébrale si red flags", "PL si suspicion méningite")
  }
  
  // Bilan selon terrain
  if (getCardiovascularRisk(patientData).includes("Haut risque")) {
    workup.push("Bilan lipidique + HbA1c")
  }
  
  return workup.length > 0 ? workup : ["Bilan biologique standard selon orientation clinique"]
}

function extractRedFlags(questions: any[]): string[] {
  return questions
    .filter(q => q.red_flags)
    .map(q => q.red_flags)
    .filter((flag, index, array) => array.indexOf(flag) === index) // Déduplication
}

function generateFollowUpRecommendations(assessment: any, patientData: any): string[] {
  const recommendations = []
  
  if (assessment.score >= 7) {
    recommendations.push("Avis spécialisé recommandé selon orientation diagnostique")
  }
  
  if (patientData.age > 65 || getCardiovascularRisk(patientData).includes("Haut risque")) {
    recommendations.push("Surveillance rapprochée - Réévaluation sous 48-72h")
  }
  
  recommendations.push("Documentation complète des réponses aux questions pour suivi longitudinal")
  recommendations.push("Réévaluation clinique si aggravation des symptômes")
  
  return recommendations
}

function extractAlreadyAskedElements(patientData: any, clinicalData: any): string[] {
  const askedElements: string[] = []

  // Données patient disponibles
  if (patientData.age) askedElements.push("âge du patient")
  if (patientData.gender) askedElements.push("sexe du patient")
  if (patientData.weight && patientData.height) askedElements.push("poids et taille (IMC calculable)")
  if (patientData.allergies?.length) askedElements.push("allergies connues")
  if (patientData.medicalHistory?.length) askedElements.push("antécédents médicaux")
  if (patientData.currentMedicationsText) askedElements.push("médicaments actuels")
  if (patientData.lifeHabits?.smoking) askedElements.push("habitudes tabagiques")
  if (patientData.lifeHabits?.alcohol) askedElements.push("consommation d'alcool")

  // Données cliniques disponibles
  if (clinicalData.chiefComplaint) askedElements.push("motif de consultation")
  if (clinicalData.symptoms) askedElements.push("symptômes principaux")
  if (clinicalData.physicalExam) askedElements.push("données d'examen physique")
  if (clinicalData.vitalSigns?.temperature) askedElements.push("température")
  if (clinicalData.vitalSigns?.bloodPressure) askedElements.push("tension artérielle")
  if (clinicalData.vitalSigns?.heartRate) askedElements.push("fréquence cardiaque")

  return askedElements
}

function calculateBMI(weight: number, height: number): string {
  if (!weight || !height) return "non calculable"
  const heightM = height / 100
  const bmi = weight / (heightM * heightM)
  return bmi.toFixed(1)
}

function getBMICategory(weight: number, height: number): string {
  if (!weight || !height) return "non évaluable"
  const heightM = height / 100
  const bmi = weight / (heightM * heightM)
  
  if (bmi < 18.5) return "Insuffisance pondérale (facteur de risque)"
  if (bmi < 25) return "Poids normal"
  if (bmi < 30) return "Surpoids (facteur de risque CV)"
  if (bmi < 35) return "Obésité modérée (haut risque CV)"
  return "Obésité sévère (très haut risque CV)"
}

function getCardiovascularRisk(patientData: any): string {
  const risks = []
  const age = patientData.age
  const gender = patientData.gender
  
  // Facteurs de risque CV majeurs
  if (age > 45 && gender === "Masculin") risks.push("Âge + sexe masculin")
  if (age > 55 && gender === "Féminin") risks.push("Âge + sexe féminin")
  if (patientData.lifeHabits?.smoking === "Oui") risks.push("Tabagisme actif")
  if (patientData.medicalHistory?.includes("Diabète")) risks.push("Diabète")
  if (patientData.medicalHistory?.includes("HTA")) risks.push("HTA")
  if (patientData.medicalHistory?.includes("Hypercholestérolémie")) risks.push("Dyslipidémie")
  if (patientData.medicalHistory?.includes("Antécédents familiaux CV")) risks.push("ATCD familiaux CV")
  
  const bmi = calculateBMI(patientData.weight, patientData.height)
  if (parseFloat(bmi) >= 30) risks.push("Obésité")
  
  return risks.length > 0 ? risks.join(", ") : "Faible risque CV"
}

function getImmuneStatus(patientData: any): string {
  const immunoRisks = []
  
  if (patientData.age > 65) immunoRisks.push("Âge > 65 ans")
  if (patientData.medicalHistory?.includes("Diabète")) immunoRisks.push("Diabète")
  if (patientData.medicalHistory?.includes("Insuffisance rénale")) immunoRisks.push("IRC")
  if (patientData.medicalHistory?.includes("Cancer")) immunoRisks.push("Néoplasie")
  if (patientData.currentMedicationsText?.toLowerCase().includes("corticoïdes")) immunoRisks.push("Corticothérapie")
  if (patientData.currentMedicationsText?.toLowerCase().includes("immunosuppresseur")) immunoRisks.push("Immunosuppression")
  
  return immunoRisks.length > 0 ? `Terrain fragilisé: ${immunoRisks.join(", ")}` : "Terrain immunocompétent"
}

function deduplicateExpertQuestions(questions: any[], askedElements: string[]): any[] {
  return questions.filter(question => {
    const questionText = question.question.toLowerCase()
    
    // Éviter les questions redondantes avec approche experte
    const redundantKeywords = [
      { keywords: ["âge", "ans"], element: "âge du patient" },
      { keywords: ["poids", "pèse", "imc"], element: "poids et taille" },
      { keywords: ["taille", "mesure"], element: "poids et taille" },
      { keywords: ["allergique", "allergie"], element: "allergies connues" },
      { keywords: ["médicament", "traitement", "médication"], element: "médicaments actuels" },
      { keywords: ["fume", "tabac", "cigarette"], element: "habitudes tabagiques" },
      { keywords: ["boit", "alcool", "boisson"], element: "consommation d'alcool" },
      { keywords: ["température", "fièvre"], element: "température" },
      { keywords: ["tension", "pression"], element: "tension artérielle" },
      { keywords: ["exposition", "moustique", "piqûre", "tropical"], element: "contexte mauricien" },
    ]

    return !redundantKeywords.some(({ keywords, element }) => 
      keywords.some(keyword => questionText.includes(keyword)) && 
      (askedElements.includes(element) || element === "contexte mauricien")
    )
  })
}

// Fonction d'évaluation du niveau médical des questions générées
function assessMedicalExpertLevel(questions: any[]): {
  level: string;
  score: number;
  details: string[];
} {
  let expertScore = 0
  const totalQuestions = questions.length
  const details: string[] = []

  questions.forEach((q, index) => {
    let questionScore = 0
    
    // Critères niveau expert (scoring)
    if (q.clinical_score) {
      questionScore += 3
      details.push(`Q${index + 1}: Score clinique validé (${q.clinical_score})`)
    }
    if (q.evidence_level) {
      questionScore += 2
      details.push(`Q${index + 1}: Evidence level ${q.evidence_level}`)
    }
    if (q.clinical_pearls) {
      questionScore += 2
      details.push(`Q${index + 1}: Clinical pearls inclus`)
    }
    if (q.red_flags) {
      questionScore += 2
      details.push(`Q${index + 1}: Red flags spécifiés`)
    }
    if (q.physiopathology) {
      questionScore += 1
      details.push(`Q${index + 1}: Physiopathologie expliquée`)
    }
    if (q.category?.includes('risk_stratification')) {
      questionScore += 2
      details.push(`Q${index + 1}: Stratification de risque`)
    }
    if (q.rationale?.includes('validé') || q.rationale?.includes('guidelines')) {
      questionScore += 1
    }
    if (q.diagnostic_value === 'high') {
      questionScore += 1
    }

    expertScore += questionScore
  })

  const averageScore = expertScore / totalQuestions

  let level: string
  if (averageScore >= 10) level = "Expert+ (niveau professeur/chef de service)"
  else if (averageScore >= 7) level = "Expert (niveau spécialiste senior)"
  else if (averageScore >= 5) level = "Avancé (médecin expérimenté/spécialiste junior)"  
  else if (averageScore >= 3) level = "Intermédiaire (médecin généraliste)"
  else level = "Basique (médecin junior)"

  return {
    level,
    score: Math.round(averageScore * 10) / 10,
    details
  }
}

function generateSmartFallbackQuestions(patientData: any, clinicalData: any, askedElements: string[]) {
  const symptoms = clinicalData.symptoms?.toLowerCase() || ""
  const chiefComplaint = clinicalData.chiefComplaint?.toLowerCase() || ""
  const combinedSymptoms = `${symptoms} ${chiefComplaint}`

  let questions = []

  if (combinedSymptoms.includes("douleur") && (combinedSymptoms.includes("thorax") || combinedSymptoms.includes("poitrine"))) {
    questions = [
      {
        id: 1,
        question: "Comment décririez-vous la douleur thoracique (serrement, brûlure, coup de poignard)?",
        type: "multiple_choice",
        options: ["Serrement/étau", "Brûlure", "Coup de poignard", "Pression"],
        rationale: "Caractérisation de la douleur pour diagnostic différentiel cardio-pulmonaire",
        category: "symptom",
        diagnostic_value: "high"
      },
      {
        id: 2,
        question: "La douleur irradie-t-elle vers d'autres zones?",
        type: "multiple_choice",
        options: ["Bras gauche", "Mâchoire", "Dos/épaules", "Aucune irradiation"],
        rationale: "Pattern d'irradiation pour distinguer origine cardiaque vs autres",
        category: "differential",
        diagnostic_value: "high"
      },
      {
        id: 3,
        question: "Qu'est-ce qui améliore ou aggrave la douleur?",
        type: "multiple_choice",
        options: ["Repos améliore", "Position améliore", "Effort aggrave", "Aucun facteur"],
        rationale: "Facteurs modulateurs pour orientation diagnostique",
        category: "symptom",
        diagnostic_value: "medium"
      }
    ]
  } else if (combinedSymptoms.includes("fièvre") || clinicalData.vitalSigns?.temperature > 37.5) {
    questions = [
      {
        id: 1,
        question: "La fièvre est-elle continue ou intermittente?",
        type: "multiple_choice",
        options: ["Continue", "Intermittente/pic", "Ondulante", "Irrégulière"],
        rationale: "Pattern fébrile aide au diagnostic différentiel des infections",
        category: "symptom",
        diagnostic_value: "high"
      },
      {
        id: 2,
        question: "Avez-vous des signes associés à la fièvre?",
        type: "multiple_choice",
        options: ["Frissons intenses", "Sueurs profuses", "Courbatures", "Maux de tête"],
        rationale: "Signes associés orientent vers bactérien vs viral vs parasitaire",
        category: "differential",
        diagnostic_value: "high"
      },
      {
        id: 3,
        question: "Comment avez-vous répondu aux antipyrétiques (paracétamol)?",
        type: "multiple_choice",
        options: ["Très bien", "Partiellement", "Peu", "Pas pris"],
        rationale: "Réponse aux antipyrétiques aide au diagnostic différentiel",
        category: "evolution",
        diagnostic_value: "medium"
      }
    ]
  } else if (combinedSymptoms.includes("céphal") || combinedSymptoms.includes("tête")) {
    questions = [
      {
        id: 1,
        question: "Décrivez le type de douleur de tête?",
        type: "multiple_choice",
        options: ["Pulsatile/battant", "Serrement/étau", "Coup de marteau", "Brûlure"],
        rationale: "Type de céphalée oriente vers migraine, tension, ou cause secondaire",
        category: "symptom",
        diagnostic_value: "high"
      },
      {
        id: 2,
        question: "Y a-t-il des signes d'alarme associés?",
        type: "multiple_choice",
        options: ["Troubles vision", "Raideur nuque", "Vomissements", "Aucun"],
        rationale: "Signes d'alarme pour éliminer urgences neurologiques",
        category: "differential",
        diagnostic_value: "high"
      },
      {
        id: 3,
        question: "Qu'est-ce qui déclenche ou aggrave les maux de tête?",
        type: "multiple_choice",
        options: ["Stress", "Lumière/bruit", "Mouvement", "Position"],
        rationale: "Facteurs déclenchants pour diagnostic différentiel",
        category: "symptom",
        diagnostic_value: "medium"
      }
    ]
  } else {
    // Questions générales ciblées
    questions = [
      {
        id: 1,
        question: "Comment les symptômes ont-ils évolué depuis le début?",
        type: "multiple_choice",
        options: ["Aggravation progressive", "Amélioration", "Stable", "Fluctuant"],
        rationale: "Évolution des symptômes guide urgence et diagnostic",
        category: "evolution",
        diagnostic_value: "high"
      },
      {
        id: 2,
        question: "Quelle est l'intensité actuelle de vos symptômes sur 10?",
        type: "multiple_choice",
        options: ["1-3 (léger)", "4-6 (modéré)", "7-8 (intense)", "9-10 (insupportable)"],
        rationale: "Évaluation de la sévérité pour priorisation thérapeutique",
        category: "severity",
        diagnostic_value: "medium"
      },
      {
        id: 3,
        question: "Ces symptômes impactent-ils vos activités quotidiennes?",
        type: "multiple_choice",
        options: ["Pas d'impact", "Impact léger", "Impact modéré", "Impossibilité d'activité"],
        rationale: "Évaluation fonctionnelle pour adaptation thérapeutique",
        category: "functional",
        diagnostic_value: "medium"
      }
    ]
  }

  // Filtrer les questions redondantes
  questions = questions.filter(q => 
    !deduplicateQuestions([q], askedElements).length === 0
  )

  return { questions }
}
