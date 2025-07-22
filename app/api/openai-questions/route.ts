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
  // Utilisation de la fonction helper sécurisée
  const symptoms = safeStringConversion(clinicalData.symptoms)
  const chiefComplaint = safeStringConversion(clinicalData.chiefComplaint)
  const combinedSymptoms = `${symptoms} ${chiefComplaint}`

  let questions = []

  if (combinedSymptoms.includes("douleur") && (combinedSymptoms.includes("thorax") || combinedSymptoms.includes("poitrine"))) {
    // Questions niveau expert cardiologique
    questions = [
      {
        id: 1,
        question: "Selon les critères du score HEART, cette douleur thoracique présente-t-elle les caractéristiques d'une douleur angineuse typique?",
        type: "multiple_choice",
        options: [
          "Typique: constrictive, rétrosternale, déclenchée par l'effort (2 points)", 
          "Atypique: 2 critères sur 3 seulement (1 point)",
          "Non-angineuse: 1 critère ou moins (0 point)",
          "Douleur pleurétique/positionnelle (0 point)"
        ],
        rationale: "Score HEART validé (History, ECG, Age, Risk, Troponin) pour stratification du risque de SCA avec VPP >95% si score ≥7",
        category: "risk_stratification",
        diagnostic_value: "high",
        clinical_score: "HEART",
        evidence_level: "A",
        clinical_pearls: "Douleur typique + FR CV multiples = score HEART élevé → hospitalisation systématique",
        red_flags: "Douleur déchirante irradiant dans le dos = suspicion dissection aortique",
        physiopathology: "Ischémie myocardique par déséquilibre offre/demande en O2"
      },
      {
        id: 2,
        question: "Y a-t-il des signes cliniques d'insuffisance cardiaque aiguë selon les critères de Framingham modifiés?",
        type: "multiple_choice",
        options: [
          "Critères majeurs: orthopnée + DPN + œdèmes + râles crépitants",
          "Critères mineurs: tachycardie + galop + turgescence jugulaire", 
          "Signe isolé: dyspnée d'effort ou œdèmes déclives",
          "Aucun signe d'insuffisance cardiaque"
        ],
        rationale: "IC aiguë sur SCA = facteur pronostique majeur nécessitant prise en charge spécialisée immédiate",
        category: "prognostic_factors",
        diagnostic_value: "high",
        clinical_score: "Framingham",
        evidence_level: "A",
        clinical_pearls: "IC + SCA = Killip >II → mortalité >30% sans revascularisation urgente",
        red_flags: "OAP + douleur thoracique = urgence cardiologique absolue"
      },
      {
        id: 3,
        question: "Évaluation de la probabilité pré-test d'embolie pulmonaire selon le score de Wells révisé?",
        type: "multiple_choice",
        options: [
          "Probabilité forte >6 points: TVP + tachycardie + hémoptysie",
          "Probabilité intermédiaire 2-6 points: FR isolés ou symptômes frustes", 
          "Probabilité faible <2 points: diagnostic alternatif plus probable",
          "Score non applicable au contexte clinique"
        ],
        rationale: "Wells score pour EP validé avec D-dimères pour exclure EP si probabilité faible",
        category: "differential_diagnosis",
        diagnostic_value: "high", 
        clinical_score: "Wells",
        evidence_level: "A",
        clinical_pearls: "Wells faible + D-dimères normaux = EP exclue (VPN >99%)"
      }
    ]
  } else if (combinedSymptoms.includes("fièvre") || (clinicalData.vitalSigns?.temperature && parseFloat(String(clinicalData.vitalSigns.temperature)) > 37.5)) {
    // Questions niveau expert infectiologique
    questions = [
      {
        id: 1,
        question: "Le patient présente-t-il des critères SIRS (Systemic Inflammatory Response Syndrome) évoquant un sepsis?",
        type: "multiple_choice",
        options: [
          "≥2 critères SIRS: T°>38°C ou <36°C, FC>90, FR>20, GB>12000 ou <4000",
          "1 seul critère SIRS présent",
          "Aucun critère SIRS (fièvre isolée)", 
          "SIRS + dysfonction d'organe (sepsis sévère)"
        ],
        rationale: "SIRS ≥2 critères + foyer infectieux suspecté = sepsis nécessitant surveillance rapprochée et antibiothérapie précoce",
        category: "risk_stratification", 
        diagnostic_value: "high",
        clinical_score: "SIRS",
        evidence_level: "A",
        clinical_pearls: "SIRS + lactates >2mmol/L ou PAS <90mmHg = sepsis sévère → réanimation",
        red_flags: "Choc septique si hypotension réfractaire + dysfonction multi-organe",
        physiopathology: "Réponse inflammatoire systémique à l'infection avec libération de cytokines"
      },
      {
        id: 2,
        question: "Quel pattern temporal fébrile présente le patient (valeur diagnostique différentielle)?",
        type: "multiple_choice",
        options: [
          "Continue (variation <1°C): infections bactériennes, virales classiques",
          "Intermittente (retour à normale): abcès profonds, paludisme, pyélonéphrite",
          "Ondulante type Pel-Ebstein: lymphomes, brucellose", 
          "Récurrente périodique: fièvres héréditaires auto-inflammatoires"
        ],
        rationale: "Pattern fébrile spécifique oriente vers étiologies précises selon physiopathologie sous-jacente",
        category: "phenotyping",
        diagnostic_value: "high",
        clinical_pearls: "Fièvre ondulante + splénomégalie + adénopathies = suspicion hématologique urgente",
        evidence_level: "B",
        physiopathology: "Cinétique de libération des pyrogènes selon le pathogène et l'hôte"
      },
      {
        id: 3,
        question: "Évaluation qSOFA (quick Sequential Organ Failure Assessment) pour détection rapide du sepsis?",
        type: "multiple_choice",
        options: [
          "qSOFA ≥2: PAS ≤100mmHg + FR ≥22/min + Glasgow <15",
          "qSOFA = 1: un seul critère présent",
          "qSOFA = 0: aucun critère de dysfonction d'organe", 
          "Évaluation impossible (données manquantes)"
        ],
        rationale: "qSOFA ≥2 = risque de mortalité >10% nécessitant prise en charge intensive immédiate",
        category: "risk_stratification",
        diagnostic_value: "high",
        clinical_score: "qSOFA", 
        evidence_level: "A",
        clinical_pearls: "qSOFA plus prédictif de mortalité que SIRS chez patient infecté",
        red_flags: "qSOFA ≥2 = sepsis sévère jusqu'à preuve du contraire"
      }
    ]
  } else if (combinedSymptoms.includes("céphal") || combinedSymptoms.includes("tête")) {
    // Questions niveau expert neurologique
    questions = [
      {
        id: 1,
        question: "Cette céphalée présente-t-elle des red flags nécessitant une imagerie cérébrale urgente?",
        type: "multiple_choice",
        options: [
          "Thunderclap headache (début brutal maximal) = suspicion HSA",
          "Céphalée + fièvre + raideur nucale = suspicion méningite",
          "Céphalée progressive + signes focaux = processus expansif", 
          "Aucun red flag identifié (céphalée primaire probable)"
        ],
        rationale: "Red flags neurologiques = urgence diagnostique avec imagerie cérébrale en urgence selon guidelines internationales",
        category: "red_flags",
        diagnostic_value: "high",
        evidence_level: "A",
        clinical_pearls: "Thunderclap headache = angioscanner en urgence (HSA jusqu'à preuve du contraire), PL si angioscanner normal",
        red_flags: "Céphalée inhabituelle chez >50 ans + signes focaux = AVC/processus expansif",
        physiopathology: "Augmentation pression intracrânienne ou irritation méningée"
      },
      {
        id: 2, 
        question: "Classification selon critères IHS (International Headache Society) - type de céphalée primaire?",
        type: "multiple_choice",
        options: [
          "Migraine avec aura: troubles visuels >5min précédant céphalée pulsatile",
          "Migraine sans aura: 4-72h, pulsatile, unilatérale, phono/photophobie + nausées",
          "Céphalée de tension: bilatérale, non-pulsatile, pression/serrement", 
          "Algie vasculaire: périorbitaire, courte (15min-3h), larmoiement + rhinorrhée"
        ],
        rationale: "Classification IHS permet diagnostic précis et traitement spécifique adapté selon mécanisme physiopathologique",
        category: "phenotyping", 
        diagnostic_value: "high",
        clinical_score: "IHS",
        evidence_level: "A",
        clinical_pearls: "Aura >60min ou déficit moteur = migraine compliquée → imagerie",
        physiopathology: "Dysfonction neuro-vasculaire avec activation trigémino-vasculaire"
      },
      {
        id: 3,
        question: "Si suspicion d'AIT (Accident Ischémique Transitoire), évaluation du score ABCD2?",
        type: "multiple_choice",
        options: [
          "Score élevé ≥4: âge ≥60 + TA ≥140/90 + signes focaux unilatéraux + durée ≥60min",
          "Score modéré 2-3: quelques facteurs de risque présents",
          "Score faible 0-1: faible risque de récidive AVC", 
          "Pas de suspicion d'AIT (symptomatologie non compatible)"
        ],
        rationale: "Score ABCD2 stratifie le risque de récidive d'AVC à 48h (score ≥4 = risque >8%)",
        category: "risk_stratification",
        diagnostic_value: "high",
        clinical_score: "ABCD2", 
        evidence_level: "A",
        clinical_pearls: "ABCD2 ≥4 = hospitalisation + bilan étiologique urgent + antiagrégant",
        red_flags: "AIT répétés = urgence neuro-vasculaire (risque AVC constitué très élevé)"
      }
    ]
  } else {
    // Questions expertes générales avec stratification de risque
    questions = [
      {
        id: 1,
        question: "Stratification de l'urgence selon la gravité clinique et l'évolution temporelle?",
        type: "multiple_choice",
        options: [
          "Urgence vitale: détérioration rapide + signes de choc/détresse",
          "Urgence vraie: risque d'évolution défavorable sans prise en charge <6h", 
          "Urgence relative: surveillance possible, risque différé >24h",
          "Consultation programmée: symptômes stables, pas de red flags"
        ],
        rationale: "Triage clinique expert basé sur la cinétique d'évolution et les signes de gravité",
        category: "risk_stratification",
        diagnostic_value: "high",
        evidence_level: "A",
        clinical_pearls: "Tout changement rapide d'état = réévaluation immédiate du niveau d'urgence",
        red_flags: "Altération conscience + instabilité hémodynamique = urgence vitale"
      },
      {
        id: 2,
        question: "Évaluation de l'impact fonctionnel selon l'échelle de Karnofsky modifiée?",
        type: "multiple_choice",
        options: [
          "Impact majeur: impossibilité activités quotidiennes (score <50)",
          "Impact modéré: activités limitées mais autonomie préservée (50-70)", 
          "Impact mineur: gêne occasionnelle, activités normales possibles (70-90)",
          "Aucun impact fonctionnel: activités habituelles maintenues (90-100)"
        ],
        rationale: "Évaluation fonctionnelle guide l'intensité thérapeutique et le pronostic à court terme",
        category: "prognostic_factors",
        diagnostic_value: "medium",
        clinical_score: "Karnofsky",
        evidence_level: "B",
        clinical_pearls: "Déclin fonctionnel rapide = facteur pronostique péjoratif nécessitant bilan étiologique"
      },
      {
        id: 3,
        question: "Analyse des comorbidités selon l'index de Charlson pour stratification pronostique?",
        type: "multiple_choice",
        options: [
          "Score élevé ≥5: comorbidités multiples (diabète + IRC + cardiopathie)",
          "Score modéré 2-4: quelques comorbidités significatives", 
          "Score faible 0-1: terrain peu fragilisé",
          "Évaluation non pertinente (patient jeune sans comorbidité)"
        ],
        rationale: "Index de Charlson prédit la mortalité à 10 ans et guide les décisions thérapeutiques",
        category: "prognostic_factors",
        diagnostic_value: "medium",
        clinical_score: "Charlson",
        evidence_level: "A", 
        clinical_pearls: "Charlson élevé modifie le rapport bénéfice/risque des interventions diagnostiques/thérapeutiques"
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
