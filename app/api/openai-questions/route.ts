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
En tant que CLINICIEN EXPERT à l'île Maurice, générez des questions diagnostiques ÉQUILIBRÉES et DIDACTIQUES combinant expertise médicale et accessibilité patient.

APPROCHE EXPERTE ÉQUILIBRÉE:
1. **Questions accessibles** (70%) : Compréhensibles par tous, langage simple
2. **Questions techniques** (30%) : Scores cliniques avec EXPLICATIONS claires
3. **Pédagogie médicale** : Expliquer POURQUOI chaque question est importante
4. **Diagnostic différentiel** par probabilité mais expliqué simplement
5. **Red flags** décrits en termes compréhensibles
6. **Équilibre** : Pas que des scores, mais aussi ressenti patient

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

EXPERTISE CLINIQUE ÉQUILIBRÉE PAR SYNDROME:

**DOULEUR THORACIQUE** (Approche mixte):
- Questions accessibles: intensité, localisation, déclencheurs, ressenti
- Questions techniques: Score HEART (EXPLIQUÉ = évaluation du risque cardiaque en 5 critères)
- Explication : "Ce score nous aide à évaluer si votre douleur pourrait venir du cœur"

**SYNDROME FÉBRILE** (Approche mixte):
- Questions accessibles: début, évolution, symptômes associés, impact
- Questions techniques: Critères SIRS (EXPLIQUÉ = signes d'infection générale grave)
- Explication : "Ces signes nous disent si l'infection s'étend dans votre corps"

**CÉPHALÉES** (Approche mixte):
- Questions accessibles: type de douleur, déclencheurs, fréquence
- Questions techniques: Red flags (EXPLIQUÉS = signes d'urgence neurologique)
- Explication : "Ces questions identifient les maux de tête qui nécessitent une attention immédiate"

**AUTRES SYNDROMES / SYMPTÔMES** (Approche dynamique) :
- Identifiez le système concerné (digestif, respiratoire, urinaire, neurologique, musculo‑squelettique, dermatologique, etc.) à partir du motif de consultation et des symptômes.
- Questions accessibles : localisation du symptôme, nature (douleur, gêne, modification d’une fonction), durée et évolution, facteurs déclenchants ou aggravants, symptômes associés (fièvre, diarrhée, dyspnée, vomissements, éruption, etc.), contexte (voyage, alimentation, prise de médicaments).
- Questions techniques : scores ou critères spécifiques seulement lorsqu’ils sont pertinents (p. ex. score de Ranson pour pancréatite, qSOFA pour infection sévère), avec explications simples ; n’utilisez un score que si les symptômes en suggèrent la nécessité.
- Explication : ces questions servent à distinguer les causes fréquentes et bénignes des pathologies graves ; commencez par explorer les causes courantes avant d’évoquer des diagnostics sévères.


GÉNÉRATION ÉQUILIBRÉE - 5-8 QUESTIONS MIXTES:

RÉPARTITION OBLIGATOIRE:
- 3-4 questions ACCESSIBLES (langage simple, expérience patient)
- 2-3 questions TECHNIQUES (scores expliqués, orientées diagnostic)
- 1 question GLOBALE (impact, inquiétudes, attentes)

Format JSON didactique requis:
{
  "questions": [
    {
      "id": 1,
      "question": "Question en langage accessible ou technique selon le type",
      "type": "multiple_choice",
      "options": ["Option claire", "Option compréhensible", "Option explicite", "Option accessible"],
      "rationale": "Justification SIMPLE et CLAIRE du pourquoi de cette question",
      "category": "accessible|technical|global",
      "complexity_level": "simple|moderate|advanced",
      "medical_explanation": "Explication didactique de l'intérêt médical",
      "clinical_score": "HEART|SIRS|qSOFA - UNIQUEMENT si question technique",
      "score_explanation": "Explication claire et simple de ce qu'est ce score",
      "patient_benefit": "Pourquoi cette question aide le patient",
      "diagnostic_value": "high|medium|low"
    }
  ]
}

RÈGLES ÉQUILIBRE OBLIGATOIRES:
✓ 70% questions simples et accessibles
✓ 30% questions techniques AVEC explications
✓ Scores cliniques EXPLIQUÉS en termes simples
✓ Rationale TOUJOURS compréhensible par le patient
✓ Éviter le jargon médical non expliqué
✓ Inclure questions sur ressenti/inquiétudes patient
✓ Équilibrer expertise et humanité

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

CRITÈRES EXPERT ÉQUILIBRÉS OBLIGATOIRES:
✓ Questions accessibles en langage simple (majorité)
✓ Questions techniques avec explications didactiques (minorité)
✓ Scores cliniques EXPLIQUÉS quand utilisés
✓ Rationale compréhensible par patient non-médecin
✓ Équilibre expertise/humanité/accessibilité
✓ Red flags décrits simplement mais précisément
✓ Éviter jargon médical non expliqué
✓ Inclure ressenti et impact sur qualité de vie
✓ Questions pratiques et concrètes

RÈGLES EXPERT DIDACTIQUE:
- Adapter les questions au syndrome principal : pour chaque symptôme, commencez par explorer les causes courantes et bénignes (infections virales, intoxications alimentaires, effets médicamenteux, troubles fonctionnels, etc.) et n’aborder des pathologies graves que si des signes d’alarme cliniques ou des résultats paracliniques l’exigent.
- Utiliser scores cliniques UNIQUEMENT si nécessaire ET expliqués
- Privilégier questions compréhensibles par tous
- Expliquer POURQUOI chaque question est utile
- Équilibrer technique et humain
- Éviter questions trop complexes sans bénéfice
- Contexte mauricien intégré naturellement
- Pas de questions d'exposition tropicale
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.2,
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

      // Validation et déduplication avec approche experte
      questionsData.questions = deduplicateExpertQuestions(questionsData.questions, askedElements)
      
      // Évaluation du niveau médical
      const medicalAssessment = assessMedicalExpertLevel(questionsData.questions)
      
      console.log(`✅ ${questionsData.questions.length} questions expertes parsées - Niveau: ${medicalAssessment.level}`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON, génération de questions de fallback niveau expert")
      questionsData = generateSmartFallbackQuestions(patientData, clinicalData, askedElements)
      
      // Évaluation du fallback
      const medicalAssessment = assessMedicalExpertLevel(questionsData.questions)
      questionsData.medicalAssessment = medicalAssessment
    }

    // Évaluation finale du niveau médical si pas déjà fait
    const finalAssessment = questionsData.medicalAssessment || assessMedicalExpertLevel(questionsData.questions)

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
        approach: "expert-balanced-didactic",
        medicalLevel: finalAssessment.level,
        medicalScore: finalAssessment.score,
        questionBalance: finalAssessment.balance,
        
        // Exclusions et filtres
        excludedElements: askedElements,
        tropicalExposureQuestionsExcluded: true,
        
        // Analyse qualité experte équilibrée
        expertFeatures: {
          accessibleQuestions: questionsData.questions.filter(q => q.category === 'accessible').length,
          technicalQuestionsExplained: questionsData.questions.filter(q => q.category === 'technical' && q.score_explanation).length,
          globalQuestions: questionsData.questions.filter(q => q.category === 'global').length,
          clinicalScoresUsed: questionsData.questions.filter(q => q.clinical_score).length,
          explainedScores: questionsData.questions.filter(q => q.score_explanation).length,
          patientBenefitExplained: questionsData.questions.filter(q => q.patient_benefit).length,
          medicalExplanations: questionsData.questions.filter(q => q.medical_explanation).length,
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

    console.log(`✅ Questions niveau EXPERT ÉQUILIBRÉ générées: ${questionsData.questions.length} - Niveau: ${finalAssessment.level} - Équilibre: ${finalAssessment.balance.accessible}A/${finalAssessment.balance.technical}T/${finalAssessment.balance.global}G`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Questions IA:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions niveau expert équilibré",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
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

// Helper pour sécuriser les données textuelles
function safeStringConversion(data: any): string {
  try {
    if (!data) return ""
    if (typeof data === 'string') return data.toLowerCase()
    if (Array.isArray(data)) return data.join(' ').toLowerCase()
    if (typeof data === 'object') return Object.values(data).join(' ').toLowerCase()
    return String(data).toLowerCase()
  } catch (error) {
    console.warn("Erreur lors de la conversion de données:", error)
    return ""
  }
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
  
  const medications = safeStringConversion(patientData.currentMedicationsText)
  if (medications.includes("corticoïdes")) immunoRisks.push("Corticothérapie")
  if (medications.includes("immunosuppresseur")) immunoRisks.push("Immunosuppression")
  
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

// Fonction d'évaluation du niveau médical des questions générées - approche équilibrée
function assessMedicalExpertLevel(questions: any[]): {
  level: string;
  score: number;
  details: string[];
  balance: { accessible: number; technical: number; global: number };
} {
  let expertScore = 0
  const totalQuestions = questions.length
  const details: string[] = []
  const balance = { accessible: 0, technical: 0, global: 0 }

  questions.forEach((q, index) => {
    let questionScore = 0
    
    // Comptage pour équilibre
    if (q.category === 'accessible') balance.accessible++
    else if (q.category === 'technical') balance.technical++
    else if (q.category === 'global') balance.global++
    
    // Critères niveau expert équilibré (scoring)
    if (q.clinical_score && q.score_explanation) {
      questionScore += 3
      details.push(`Q${index + 1}: Score clinique expliqué (${q.clinical_score})`)
    }
    if (q.medical_explanation) {
      questionScore += 2
      details.push(`Q${index + 1}: Explication médicale didactique`)
    }
    if (q.patient_benefit) {
      questionScore += 2
      details.push(`Q${index + 1}: Bénéfice patient expliqué`)
    }
    if (q.complexity_level === 'simple' && q.rationale) {
      questionScore += 2
      details.push(`Q${index + 1}: Question accessible avec rationale claire`)
    }
    if (q.category === 'technical' && q.score_explanation) {
      questionScore += 2
      details.push(`Q${index + 1}: Question technique avec explication`)
    }
    if (q.category === 'global') {
      questionScore += 1
      details.push(`Q${index + 1}: Dimension humaine/globale`)
    }
    if (q.diagnostic_value === 'high') {
      questionScore += 1
    }

    expertScore += questionScore
  })

  const averageScore = expertScore / totalQuestions
  
  // Évaluation de l'équilibre
  const accessibleRatio = balance.accessible / totalQuestions
  const technicalRatio = balance.technical / totalQuestions
  const globalRatio = balance.global / totalQuestions
  
  // Bonus pour équilibre idéal (70% accessible, 30% technique/global)
  let balanceBonus = 0
  if (accessibleRatio >= 0.6 && accessibleRatio <= 0.8) balanceBonus += 1
  if (technicalRatio >= 0.2 && technicalRatio <= 0.4) balanceBonus += 1
  if (globalRatio >= 0.1) balanceBonus += 0.5

  const finalScore = averageScore + balanceBonus

  let level: string
  if (finalScore >= 10) level = "Expert équilibré+ (niveau professeur patient-centré)"
  else if (finalScore >= 8) level = "Expert équilibré (spécialiste didactique)"
  else if (finalScore >= 6) level = "Avancé équilibré (médecin expérimenté accessible)"  
  else if (finalScore >= 4) level = "Intermédiaire équilibré (médecin généraliste didactique)"
  else level = "Basique (questions simples)"

  return {
    level,
    score: Math.round(finalScore * 10) / 10,
    details,
    balance
  }
}

function generateSmartFallbackQuestions(patientData: any, clinicalData: any, askedElements: string[]) {
  // Utilisation de la fonction helper sécurisée
  const symptoms = safeStringConversion(clinicalData.symptoms)
  const chiefComplaint = safeStringConversion(clinicalData.chiefComplaint)
  const combinedSymptoms = `${symptoms} ${chiefComplaint}`

  let questions = []

  if (combinedSymptoms.includes("douleur") && (combinedSymptoms.includes("thorax") || combinedSymptoms.includes("poitrine"))) {
    // Questions équilibrées cardiologiques (accessibles + techniques)
    questions = [
      {
        id: 1,
        question: "Comment décririez-vous votre douleur thoracique en quelques mots simples?",
        type: "multiple_choice",
        options: [
          "Comme un poids ou une pression sur la poitrine", 
          "Comme une brûlure ou des picotements",
          "Comme un coup de poignard ou une déchirure",
          "Difficile à décrire, sensation bizarre"
        ],
        rationale: "La façon dont vous décrivez votre douleur nous aide à comprendre d'où elle pourrait venir",
        category: "accessible",
        complexity_level: "simple",
        medical_explanation: "Les différents types de douleur thoracique orientent vers différentes causes possibles",
        patient_benefit: "Aide le médecin à mieux comprendre votre ressenti et orienter le diagnostic",
        diagnostic_value: "high"
      },
      {
        id: 2,
        question: "Selon l'évaluation HEART (un score médical d'évaluation du risque cardiaque), votre douleur présente-t-elle des caractéristiques inquiétantes?",
        type: "multiple_choice",
        options: [
          "Douleur typique: oppressante, au centre, déclenchée par l'effort",
          "Douleur atypique: quelques caractéristiques seulement", 
          "Douleur non-cardiaque: localisée, positionnelle",
          "Je ne sais pas comment la caractériser"
        ],
        rationale: "Le score HEART nous aide à évaluer rapidement si votre douleur pourrait venir du cœur",
        category: "technical",
        complexity_level: "moderate",
        clinical_score: "HEART",
        score_explanation: "HEART est un score simple qui évalue 5 critères pour déterminer le risque que la douleur vienne du cœur",
        medical_explanation: "Ce score validé permet une évaluation standardisée du risque cardiaque",
        patient_benefit: "Permet de déterminer rapidement si des examens cardiaques urgents sont nécessaires",
        diagnostic_value: "high"
      },
      {
        id: 3,
        question: "Comment cette douleur impacte-t-elle votre vie quotidienne en ce moment?",
        type: "multiple_choice",
        options: [
          "Je peux faire toutes mes activités normalement",
          "Je dois ralentir ou éviter certains efforts", 
          "J'ai du mal à faire mes activités habituelles",
          "Je suis très limité(e) dans mes mouvements"
        ],
        rationale: "Comprendre l'impact sur votre quotidien nous aide à évaluer la gravité et l'urgence",
        category: "global",
        complexity_level: "simple",
        medical_explanation: "L'évaluation fonctionnelle est essentielle pour adapter la prise en charge",
        patient_benefit: "Assure que votre qualité de vie est prise en compte dans le traitement",
        diagnostic_value: "medium"
      }
    ]
  } else if (combinedSymptoms.includes("fièvre") || (clinicalData.vitalSigns?.temperature && parseFloat(String(clinicalData.vitalSigns.temperature)) > 37.5)) {
    // Questions équilibrées infectiologiques (accessibles + techniques)
    questions = [
      {
        id: 1,
        question: "Comment votre fièvre évolue-t-elle depuis qu'elle a commencé?",
        type: "multiple_choice",
        options: [
          "Elle reste haute en permanence",
          "Elle monte et descend plusieurs fois par jour",
          "Elle apparaît par épisodes puis disparaît complètement", 
          "Elle diminue progressivement depuis le début"
        ],
        rationale: "Le comportement de la fièvre nous donne des indices importants sur le type d'infection",
        category: "accessible",
        complexity_level: "simple",
        medical_explanation: "Les patterns fébriles différents suggèrent différents types d'infections",
        patient_benefit: "Aide à identifier le type d'infection pour mieux la traiter",
        diagnostic_value: "high"
      },
      {
        id: 2,
        question: "Présentez-vous des signes SIRS (signes d'infection généralisée) qui pourraient indiquer une infection sévère?",
        type: "multiple_choice",
        options: [
          "Oui: fièvre élevée + cœur qui bat vite + respiration rapide",
          "Partiellement: seulement un ou deux de ces signes",
          "Non: juste de la fièvre sans autres signes", 
          "Je ne sais pas reconnaître ces signes"
        ],
        rationale: "Les critères SIRS nous aident à détecter rapidement si l'infection devient grave",
        category: "technical", 
        complexity_level: "moderate",
        clinical_score: "SIRS",
        score_explanation: "SIRS = Syndrome de Réponse Inflammatoire Systémique, soit des signes que l'infection s'étend dans tout le corps",
        medical_explanation: "Ces critères permettent de détecter précocement un sepsis nécessitant une prise en charge urgente",
        patient_benefit: "Détection rapide des infections graves pour un traitement adapté",
        diagnostic_value: "high"
      },
      {
        id: 3,
        question: "Quelles sont vos principales inquiétudes concernant cette fièvre?",
        type: "multiple_choice",
        options: [
          "J'ai peur que ce soit grave et que ça s'aggrave",
          "Je m'inquiète de ne pas pouvoir travailler/m'occuper de ma famille",
          "Je crains les complications ou la contagion", 
          "Je ne suis pas particulièrement inquiet(e)"
        ],
        rationale: "Vos inquiétudes nous aident à adapter notre approche et nos explications",
        category: "global",
        complexity_level: "simple",
        medical_explanation: "La dimension psychologique et sociale est importante dans la prise en charge",
        patient_benefit: "Permet d'adapter les soins à vos préoccupations personnelles",
        diagnostic_value: "medium"
      }
    ]
  } else if (combinedSymptoms.includes("céphal") || combinedSymptoms.includes("tête")) {
    // Questions équilibrées neurologiques (accessibles + techniques)
    questions = [
      {
        id: 1,
        question: "Si vous deviez expliquer votre mal de tête à un proche, comment le décririez-vous?",
        type: "multiple_choice",
        options: [
          "Comme si ma tête allait exploser, très intense",
          "Comme un marteau qui tape régulièrement",
          "Comme un étau qui serre tout autour", 
          "Une douleur sourde et constante"
        ],
        rationale: "La description de votre douleur nous aide à comprendre quel type de mal de tête vous avez",
        category: "accessible",
        complexity_level: "simple",
        medical_explanation: "Les différents types de céphalées ont des caractéristiques spécifiques",
        patient_benefit: "Aide à identifier le type de mal de tête pour un traitement adapté",
        diagnostic_value: "high"
      },
      {
        id: 2, 
        question: "Votre mal de tête présente-t-il des 'red flags' (signes d'alarme) qui nécessiteraient une attention médicale urgente?",
        type: "multiple_choice",
        options: [
          "Oui: début très brutal + fièvre + raideur dans la nuque",
          "Oui: mal de tête inhabituel + troubles de la vision/parole",
          "Non: mal de tête 'normal' sans signes inquiétants", 
          "Je ne sais pas identifier ces signes d'alarme"
        ],
        rationale: "Ces signes d'alarme nous disent si votre mal de tête nécessite des examens urgents",
        category: "technical",
        complexity_level: "moderate",
        score_explanation: "Red flags = signes qui peuvent indiquer une urgence neurologique nécessitant des examens immédiats",
        medical_explanation: "Certains maux de tête peuvent révéler des problèmes graves nécessitant une prise en charge urgente",
        patient_benefit: "Détection rapide des maux de tête dangereux pour un traitement d'urgence si nécessaire",
        diagnostic_value: "high"
      },
      {
        id: 3,
        question: "Comment ce mal de tête affecte-t-il votre capacité à fonctionner au quotidien?",
        type: "multiple_choice",
        options: [
          "Je peux continuer mes activités sans problème",
          "Je dois adapter ou réduire certaines activités",
          "J'ai beaucoup de difficultés à faire mes tâches habituelles", 
          "Je suis complètement bloqué(e), incapable de faire quoi que ce soit"
        ],
        rationale: "L'impact sur votre vie quotidienne nous aide à adapter l'intensité du traitement",
        category: "global",
        complexity_level: "simple",
        medical_explanation: "L'évaluation fonctionnelle guide les décisions thérapeutiques",
        patient_benefit: "S'assure que le traitement prend en compte votre qualité de vie",
        diagnostic_value: "medium"
      }
    ]
  } else {
    // Questions équilibrées générales (accessibles + techniques)
    questions = [
      {
        id: 1,
        question: "Si vous deviez décrire vos symptômes à quelqu'un qui ne vous connaît pas, que diriez-vous?",
        type: "multiple_choice",
        options: [
          "C'est quelque chose de nouveau et d'inquiétant",
          "C'est familier, j'ai déjà eu ça avant", 
          "C'est difficile à expliquer, c'est bizarre",
          "C'est gênant mais pas dramatique"
        ],
        rationale: "Votre propre perception nous aide à mieux comprendre ce que vous ressentez",
        category: "accessible",
        complexity_level: "simple",
        medical_explanation: "Le ressenti du patient est un élément diagnostique important",
        patient_benefit: "Permet de partir de votre expérience personnelle",
        diagnostic_value: "medium"
      },
      {
        id: 2,
        question: "Selon une évaluation médicale globale de votre état, dans quelle catégorie d'urgence vous situeriez-vous?",
        type: "multiple_choice",
        options: [
          "Urgence vitale: ça se dégrade vite, j'ai besoin d'aide tout de suite",
          "Urgent: ça m'inquiète, je ne veux pas que ça empire", 
          "Peut attendre: c'est gênant mais pas dramatique",
          "Consultation normale: je veux juste comprendre ce qui se passe"
        ],
        rationale: "Votre perception de l'urgence nous aide à prioriser votre prise en charge",
        category: "technical",
        complexity_level: "moderate",
        score_explanation: "Classification médicale standard pour évaluer le niveau d'urgence des symptômes",
        medical_explanation: "L'auto-évaluation du patient complète l'évaluation médicale objective",
        patient_benefit: "Assure que vos préoccupations sont entendues et prises en compte",
        diagnostic_value: "high"
      },
      {
        id: 3,
        question: "Qu'attendez-vous le plus de cette consultation médicale?",
        type: "multiple_choice",
        options: [
          "Être rassuré(e) que ce n'est rien de grave",
          "Obtenir un diagnostic clair et des explications", 
          "Recevoir un traitement efficace rapidement",
          "Comprendre comment éviter que ça recommence"
        ],
        rationale: "Vos attentes nous aident à adapter notre approche pour mieux vous aider",
        category: "global",
        complexity_level: "simple",
        medical_explanation: "La prise en compte des attentes du patient améliore la satisfaction et l'observance",
        patient_benefit: "Garantit que la consultation répond à vos besoins spécifiques",
        diagnostic_value: "low"
      }
    ]
  }

  // Filtrer les questions redondantes avec approche experte
  questions = deduplicateExpertQuestions(questions, askedElements)

  return { questions }
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
  
  // Utilisation de la fonction helper sécurisée  
  const symptoms = safeStringConversion(clinicalData.symptoms)
  const chiefComplaint = safeStringConversion(clinicalData.chiefComplaint)
  const combinedSymptoms = `${symptoms} ${chiefComplaint}`
  
  if (combinedSymptoms.includes("thorax") || combinedSymptoms.includes("poitrine")) {
    workup.push("ECG 12 dérivations + troponines", "Rx thorax", "Écho-cardiographie si clinique évocatrice")
  }
  
  if (combinedSymptoms.includes("fièvre") || (clinicalData.vitalSigns?.temperature && parseFloat(String(clinicalData.vitalSigns.temperature)) > 37.5)) {
    workup.push("Hémocultures x2", "CRP + PCT", "ECBU", "NFS + CRP + ionogramme")
  }
  
  if (combinedSymptoms.includes("céphal") || combinedSymptoms.includes("tête")) {
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
