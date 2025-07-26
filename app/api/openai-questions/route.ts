import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ===== CONFIGURATION ET DIAGNOSTIC OPENAI =====
async function validateAndTestOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  
  // Validation de base
  if (!apiKey) {
    return { 
      isValid: false, 
      error: "OPENAI_API_KEY non définie dans l'environnement",
      keyPreview: "Aucune clé"
    }
  }
  
  if (!apiKey.startsWith('sk-')) {
    return { 
      isValid: false, 
      error: "Clé API invalide - doit commencer par 'sk-'",
      keyPreview: apiKey.substring(0, 10) + "..."
    }
  }
  
  if (apiKey.length < 50) {
    return { 
      isValid: false, 
      error: "Clé API trop courte",
      keyPreview: apiKey.substring(0, 10) + "..."
    }
  }

  // Test de connexion réel
  try {
    console.log("🧪 Test connexion OpenAI...")
    
    const { text, usage } = await generateText({
      model: openai("gpt-4o"),
      prompt: "Répondez exactement: CONNEXION_OK_2024",
      temperature: 0,
      maxTokens: 10,
    })

    console.log("✅ Test OpenAI réussi:", text.trim())
    
    return {
      isValid: true,
      testResponse: text.trim(),
      usage: usage,
      keyPreview: `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`,
      model: "gpt-4o"
    }
    
  } catch (error: any) {
    console.error("❌ Test OpenAI échoué:", error.message)
    
    return {
      isValid: false,
      error: error.message,
      errorType: error.name,
      errorCode: error.code || "UNKNOWN",
      keyPreview: `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
    }
  }
}

export async function POST(request: NextRequest) {
  console.log("🏥 === GÉNÉRATEUR QUESTIONS TÉLÉMÉDECINE IA ===")
  
  try {
    // 1. PARSE ET VALIDATION REQUEST
    let requestData: {
      patientData?: any
      clinicalData?: any
      language?: string
      patient_discourse_real_time?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données patient reçues:", Object.keys(requestData))
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON:", parseError)
      return NextResponse.json({
        success: false,
        error: "Format JSON invalide",
        ai_suggestions: []
      }, { status: 400 })
    }

    const { patientData, clinicalData } = requestData

    // 2. VALIDATION ET TEST OPENAI
    const openaiStatus = await validateAndTestOpenAI()
    console.log("🤖 Status OpenAI:", openaiStatus.isValid ? "✅ FONCTIONNEL" : `❌ ${openaiStatus.error}`)

    // 3. ANALYSE PROFIL PATIENT
    const patientProfile = analyzePatientForTelemedicine(patientData, clinicalData)
    console.log("👤 Profil patient analysé:", {
      age: patientProfile.age,
      gender: patientProfile.gender,
      complaint: patientProfile.primaryComplaint,
      complexity: patientProfile.complexityLevel
    })

    // 4. GÉNÉRATION QUESTIONS
    let questions = []
    let generationMethod = "fallback"
    let aiError = null

    if (openaiStatus.isValid) {
      try {
        console.log("🤖 Génération questions IA télémédecine...")
        questions = await generateTelemedicineQuestionsWithAI(patientProfile, openaiStatus)
        generationMethod = "ai_telemedicine"
        console.log(`✅ ${questions.length} questions IA télémédecine générées`)
      } catch (aiGenerationError: any) {
        console.error("❌ Erreur génération IA:", aiGenerationError.message)
        aiError = aiGenerationError.message
        questions = generateTelemedicineFallbackQuestions(patientProfile)
        generationMethod = "fallback_telemedicine"
      }
    } else {
      console.log("⚠️ OpenAI indisponible, utilisation questions télémédecine optimisées")
      aiError = openaiStatus.error
      questions = generateTelemedicineFallbackQuestions(patientProfile)
      generationMethod = "fallback_telemedicine"
    }

    // 5. VALIDATION ET OPTIMISATION QUESTIONS
    questions = optimizeQuestionsForTelemedicine(questions, patientProfile)
    
    // 6. FORMATAGE RÉPONSE FINALE
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      ai_suggestions: questions,
      questions: questions, // Compatibilité
      metadata: {
        aiGenerated: generationMethod === "ai_telemedicine",
        generationMethod: generationMethod,
        openaiWorking: openaiStatus.isValid,
        patientProfile: {
          ageGroup: patientProfile.ageGroup,
          complexityLevel: patientProfile.complexityLevel,
          telemedicineAdapted: true
        },
        questionStats: {
          total: questions.length,
          highPriority: questions.filter(q => q.priority === "high").length,
          specificToPatient: questions.filter(q => q.patientSpecific).length,
          avgSpecificityScore: Math.round(questions.reduce((sum, q) => sum + (q.specificityScore || 0), 0) / questions.length)
        },
        diagnostic: {
          openaiStatus: openaiStatus.isValid ? "✅ Fonctionnel" : `❌ ${openaiStatus.error}`,
          keyPreview: openaiStatus.keyPreview,
          testResponse: openaiStatus.testResponse,
          aiError: aiError
        }
      }
    }

    console.log(`🎯 SUCCÈS: ${questions.length} questions télémédecine générées via ${generationMethod}`)
    console.log(`📊 Spécificité moyenne: ${response.metadata.questionStats.avgSpecificityScore}/100`)
    
    return NextResponse.json(response)

  } catch (globalError: any) {
    console.error("❌ ERREUR GLOBALE:", globalError)
    
    return NextResponse.json({
      success: false,
      error: "Erreur génération questions télémédecine",
      details: globalError.message,
      ai_suggestions: generateEmergencyQuestions(),
      questions: generateEmergencyQuestions(),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// ===== ANALYSE PROFIL PATIENT POUR TÉLÉMÉDECINE =====
function analyzePatientForTelemedicine(patientData: any, clinicalData: any) {
  const age = patientData?.age || 0
  const gender = patientData?.gender || ""
  const primaryComplaint = clinicalData?.chiefComplaint || ""
  const painScale = clinicalData?.painScale || 0
  const symptoms = clinicalData?.symptoms || []
  const antecedents = patientData?.medicalHistory || []
  const medications = patientData?.currentMedications || []

  // Catégorisation âge
  let ageGroup = "adult"
  if (age < 18) ageGroup = "pediatric"
  else if (age > 65) ageGroup = "geriatric"
  else if (age >= 18 && age <= 35) ageGroup = "young_adult"

  // Niveau de complexité pour télémédecine
  let complexityLevel = "standard"
  if (painScale > 8 || primaryComplaint.toLowerCase().includes('thoracique') || 
      primaryComplaint.toLowerCase().includes('conscience') || 
      primaryComplaint.toLowerCase().includes('urgence')) {
    complexityLevel = "urgent"
  } else if (antecedents.length > 2 || medications.length > 3) {
    complexityLevel = "complex"
  }

  // Spécialités pertinentes
  const relevantSpecialties = []
  if (primaryComplaint.toLowerCase().includes('cardiaque') || primaryComplaint.toLowerCase().includes('thoracique')) {
    relevantSpecialties.push('cardiologie')
  }
  if (age > 65) relevantSpecialties.push('gériatrie')
  if (age < 18) relevantSpecialties.push('pédiatrie')
  if (gender === "Féminin" && age >= 18 && age <= 50) {
    relevantSpecialties.push('gynécologie')
  }

  return {
    age,
    gender,
    ageGroup,
    primaryComplaint,
    painScale,
    symptoms,
    antecedents,
    medications,
    complexityLevel,
    relevantSpecialties,
    telemedicineContext: {
      requiresVisualExam: assessVisualExamNeed(primaryComplaint),
      requiresImmediateAttention: complexityLevel === "urgent",
      suitableForRemoteConsult: assessRemoteSuitability(primaryComplaint, painScale)
    }
  }
}

function assessVisualExamNeed(complaint: string): boolean {
  const visualRequiredPatterns = ['eruption', 'rash', 'plaie', 'blessure', 'gonflement', 'rougeur']
  return visualRequiredPatterns.some(pattern => complaint.toLowerCase().includes(pattern))
}

function assessRemoteSuitability(complaint: string, painScale: number): boolean {
  if (painScale > 8) return false
  const unsuitable = ['douleur thoracique', 'essoufflement sévère', 'perte de conscience']
  return !unsuitable.some(pattern => complaint.toLowerCase().includes(pattern))
}

// ===== GÉNÉRATION QUESTIONS IA TÉLÉMÉDECINE =====
async function generateTelemedicineQuestionsWithAI(patientProfile: any, openaiStatus: any) {
  const prompt = buildTelemedicinePrompt(patientProfile)
  
  console.log("📝 Envoi prompt télémédecine à OpenAI...")
  
  try {
    const { text, usage } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.2, // Légèrement plus créatif pour la médecine
      maxTokens: 3000,
    })

    console.log("📄 Réponse OpenAI reçue:", text.substring(0, 100) + "...")
    console.log("📊 Usage:", usage)

    // Nettoyage et parsing
    const cleanText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^\s*```\s*/, "")
      .replace(/\s*```\s*$/, "")
      .trim()

    // Recherche du JSON
    let jsonMatch = cleanText.match(/\[[\s\S]*?\]/)
    
    if (!jsonMatch) {
      // Tentative avec recherche plus large
      jsonMatch = cleanText.match(/\[[\s\S]*\]/)
    }

    if (jsonMatch) {
      const aiQuestions = JSON.parse(jsonMatch[0])
      console.log(`✅ ${aiQuestions.length} questions AI parsées`)
      
      // Enrichissement et validation
      return aiQuestions
        .filter(q => q.question && q.question.length > 15)
        .map((q, index) => ({
          ...q,
          id: index + 1,
          aiGenerated: true,
          telemedicineOptimized: true,
          patientSpecific: isPatientSpecific(q, patientProfile),
          specificityScore: calculateTelemedicineSpecificity(q, patientProfile),
          remoteConsultSuitable: true
        }))
        .slice(0, 8)
    } else {
      throw new Error("Aucun JSON valide trouvé dans la réponse OpenAI")
    }
    
  } catch (error: any) {
    console.error("❌ Erreur détaillée génération IA:", {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 300)
    })
    throw error
  }
}

function buildTelemedicinePrompt(patientProfile: any): string {
  const { age, gender, primaryComplaint, ageGroup, complexityLevel, antecedents } = patientProfile

  return `# GÉNÉRATION QUESTIONS TÉLÉMÉDECINE IA

## PROFIL PATIENT UNIQUE
- ${gender} de ${age} ans (${ageGroup})
- Motif principal: "${primaryComplaint}"
- Antécédents: ${antecedents.length > 0 ? antecedents.join(', ') : 'Aucun connu'}
- Complexité: ${complexityLevel}
- Contexte: CONSULTATION À DISTANCE

## DIRECTIVES TÉLÉMÉDECINE SPÉCIFIQUES

🎯 **SPÉCIFICITÉ MAXIMALE REQUISE:**
1. Chaque question DOIT exploiter l'âge exact (${age} ans), le sexe (${gender}) OU le symptôme ("${primaryComplaint}")
2. Questions adaptées à la consultation à DISTANCE (pas d'examen physique direct)
3. Focus sur l'histoire clinique, symptômes décrits, contexte personnel
4. Éviter questions nécessitant examen physique direct

🏥 **ADAPTATION TÉLÉMÉDECINE:**
- Questions permettant évaluation à distance
- Descriptions détaillées des symptômes
- Facteurs déclenchants, chronologie précise
- Impact fonctionnel quantifiable
- Signes d'alarme à rechercher

## EXEMPLES TRANSFORMATION TÉLÉMÉDECINE

❌ **INADAPTÉ:** "Montrez-moi où vous avez mal"
✅ **TÉLÉMÉDECINE:** "Sur une silhouette du corps, cette douleur se situe-t-elle plutôt côté droit, gauche, au centre ou diffuse ?"

❌ **GÉNÉRIQUE:** "Comment vous sentez-vous ?"
✅ **SPÉCIFIQUE:** "Chez un ${gender.toLowerCase()} de ${age} ans, cette ${primaryComplaint.toLowerCase()} vous empêche-t-elle de monter un étage d'escalier ?"

❌ **INADAPTÉ:** "Je vais palper votre abdomen"
✅ **TÉLÉMÉDECINE:** "Cette douleur abdominale augmente-t-elle quand vous toussez ou quand vous appuyez légèrement dessus ?"

## ADAPTATIONS OBLIGATOIRES PAR ÂGE

${ageGroup === 'pediatric' ? `### PÉDIATRIE (${age} ans):
- Questions simples, compréhensibles par l'enfant/parents
- Symptômes décrits par observation parentale
- Impact sur jeu, école, sommeil
- Comparaison avec états antérieurs` : ''}

${ageGroup === 'young_adult' ? `### JEUNE ADULTE (${age} ans):
- Facteurs stress, travail, études
- ${gender === 'Féminin' ? 'Cycles menstruels, contraception' : 'Activité physique intense'}
- Habitudes vie (sommeil, alimentation, écrans)` : ''}

${ageGroup === 'geriatric' ? `### GÉRIATRIE (${age} ans):
- Autonomie, chutes, confusion
- Observance médicamenteuse
- Isolement social, moral
- Capacités fonctionnelles précises` : ''}

## ADAPTATION SYMPTÔME "${primaryComplaint}"

${primaryComplaint.toLowerCase().includes('douleur') ? `### DOULEUR:
- Localisation précise (anatomie), irradiation
- Qualité (brûlure, crampe, piqûre, serrement)
- Facteurs déclenchants/soulageants précis
- Échelle 0-10 + impact fonctionnel` : ''}

${primaryComplaint.toLowerCase().includes('fatigue') ? `### FATIGUE:
- Matinale vs vespérale
- Liée effort vs permanente
- Récupération avec repos
- Impact activités quotidiennes mesurable` : ''}

## FORMAT JSON STRICT TÉLÉMÉDECINE

[
  {
    "id": 1,
    "question": "Question ULTRA-spécifique mentionnant ${age} ans/${gender}/${primaryComplaint} et adaptée télémédecine",
    "type": "multiple_choice",
    "options": ["Réponse médicalement précise 1", "Réponse précise 2", "Réponse précise 3", "Autre/Ne sais pas"],
    "category": "telemedicine_${complexityLevel}",
    "priority": "high",
    "rationale": "Pourquoi cette question est cruciale pour CE patient de ${age} ans en téléconsultation",
    "telemedicine_adapted": true
  }
]

## CONTRAINTES ABSOLUES
- 6 questions maximum
- Chaque question adaptée consultation à distance
- Aucune question générique applicable à tous
- Exploitation obligatoire: âge ${age} ans + sexe ${gender} + symptôme "${primaryComplaint}"
- Questions permettant diagnostic différentiel à distance

Générez maintenant 6 questions ULTRA-SPÉCIFIQUES pour ce ${gender.toLowerCase()} de ${age} ans avec "${primaryComplaint}" en téléconsultation.

RÉPONDEZ UNIQUEMENT AVEC LE JSON, rien d'autre.`
}

// ===== GÉNÉRATION FALLBACK TÉLÉMÉDECINE =====
function generateTelemedicineFallbackQuestions(patientProfile: any) {
  console.log("🔄 Génération questions fallback télémédecine spécialisées")
  
  const { age, gender, primaryComplaint, ageGroup, complexityLevel, antecedents } = patientProfile
  const questions = []

  // Question 1: Spécifique âge + télémédecine
  if (ageGroup === 'pediatric') {
    questions.push({
      id: 1,
      question: `À ${age} ans, peux-tu me dire si cette ${primaryComplaint.toLowerCase()} t'empêche de jouer comme d'habitude ?`,
      type: "multiple_choice",
      options: ["Je ne peux plus jouer du tout", "Je joue moins qu'avant", "Je joue un peu moins", "Je joue normalement"],
      category: "pediatric_functional_telemedicine",
      priority: "high",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 95
    })
  } else if (ageGroup === 'geriatric') {
    questions.push({
      id: 1,
      question: `À ${age} ans, cette ${primaryComplaint.toLowerCase()} affecte-t-elle votre capacité à vous lever d'une chaise sans aide ?`,
      type: "multiple_choice",
      options: ["Impossible sans aide", "Très difficile", "Légèrement difficile", "Aucune difficulté"],
      category: "geriatric_autonomy_telemedicine",
      priority: "high",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 90
    })
  } else {
    questions.push({
      id: 1,
      question: `Cette ${primaryComplaint.toLowerCase()} limite-t-elle votre capacité à effectuer votre travail habituel ?`,
      type: "multiple_choice",
      options: ["Arrêt de travail nécessaire", "Limitation importante", "Gêne légère au travail", "Aucun impact professionnel"],
      category: "adult_occupational_impact_telemedicine",
      priority: "high",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 85
    })
  }

  // Question 2: Spécifique symptôme + télémédecine
  if (primaryComplaint.toLowerCase().includes('douleur thoracique')) {
    questions.push({
      id: 2,
      question: "Cette douleur thoracique ressemble-t-elle à une sensation de serrement, brûlure, piqûre ou pression ?",
      type: "multiple_choice",
      options: ["Serrement/étau", "Brûlure intense", "Piqûre/coup de poignard", "Pression/poids", "Autre sensation"],
      category: "chest_pain_quality_telemedicine",
      priority: "high",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 95
    })
  } else if (primaryComplaint.toLowerCase().includes('douleur abdominale')) {
    questions.push({
      id: 2,
      question: "Cette douleur abdominale est-elle localisée en un point précis ou diffuse dans plusieurs zones ?",
      type: "multiple_choice",
      options: ["Point très précis (1 doigt)", "Zone de la taille d'une main", "Diffuse dans tout le ventre", "Change d'endroit"],
      category: "abdominal_pain_localization_telemedicine",
      priority: "high",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 90
    })
  } else if (primaryComplaint.toLowerCase().includes('fatigue')) {
    questions.push({
      id: 2,
      question: "Cette fatigue est-elle présente dès le réveil ou apparaît-elle au cours de la journée ?",
      type: "multiple_choice",
      options: ["Fatigue intense dès le réveil", "Apparaît dans la matinée", "Se développe l'après-midi", "Surtout le soir"],
      category: "fatigue_chronology_telemedicine",
      priority: "high",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 85
    })
  } else {
    questions.push({
      id: 2,
      question: `Pouvez-vous décrire précisément comment cette ${primaryComplaint.toLowerCase()} a commencé ?`,
      type: "multiple_choice",
      options: ["Brutalement en quelques minutes", "Progressivement sur quelques heures", "Graduellement sur plusieurs jours", "Impossible à déterminer"],
      category: "symptom_onset_telemedicine",
      priority: "high",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 80
    })
  }

  // Question 3: Genre + âge spécifique pour télémédecine
  if (gender === "Féminin" && age >= 18 && age <= 50) {
    questions.push({
      id: 3,
      question: `Chez une femme de ${age} ans, ces symptômes surviennent-ils à des moments spécifiques de votre cycle menstruel ?`,
      type: "multiple_choice",
      options: ["Juste avant les règles", "Pendant les règles", "À l'ovulation (milieu cycle)", "Aucun lien avec le cycle"],
      category: "hormonal_correlation_telemedicine",
      priority: "medium",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 85
    })
  } else if (gender === "Masculin" && age > 50) {
    questions.push({
      id: 3,
      question: `Ces symptômes s'accompagnent-ils de difficultés urinaires ou de changements dans vos habitudes mictionnelles ?`,
      type: "multiple_choice",
      options: ["Difficulté à uriner", "Envies plus fréquentes", "Réveil nocturne pour uriner", "Aucun problème urinaire"],
      category: "male_urogenital_screening_telemedicine",
      priority: "medium",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 80
    })
  }

  // Question 4: Antécédents spécifiques télémédecine
  if (antecedents.length > 0) {
    const mainAntecedent = antecedents[0]
    questions.push({
      id: questions.length + 1,
      question: `Avec votre antécédent de ${mainAntecedent}, ces nouveaux symptômes ressemblent-ils à ce que vous avez déjà vécu ?`,
      type: "multiple_choice",
      options: ["Identiques aux épisodes passés", "Similaires mais plus intenses", "Similaires mais différents", "Complètement nouveaux"],
      category: "antecedent_comparison_telemedicine",
      priority: "medium",
      patientSpecific: true,
      telemedicineOptimized: true,
      specificityScore: 85
    })
  }

  // Question 5: Impact fonctionnel quantifiable télémédecine
  questions.push({
    id: questions.length + 1,
    question: "Sur une échelle de 0 à 10, à combien évaluez-vous l'impact de ces symptômes sur votre qualité de vie quotidienne ?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: ["Aucun impact", "Impact maximal"],
    category: "functional_impact_scale_telemedicine",
    priority: "medium",
    patientSpecific: true,
    telemedicineOptimized: true,
    specificityScore: 75
  })

  // Question 6: Facteurs déclenchants télémédecine
  questions.push({
    id: questions.length + 1,
    question: "Y a-t-il des activités, aliments, positions ou situations qui déclenchent ou aggravent ces symptômes ?",
    type: "text",
    placeholder: "Décrivez les facteurs déclenchants si vous en avez identifiés...",
    category: "trigger_identification_telemedicine",
    priority: "medium",
    patientSpecific: false,
    telemedicineOptimized: true,
    specificityScore: 70
  })

  return questions.slice(0, 8)
}

// ===== OPTIMISATION QUESTIONS TÉLÉMÉDECINE =====
function optimizeQuestionsForTelemedicine(questions: any[], patientProfile: any) {
  return questions.map(q => ({
    ...q,
    // S'assurer que toutes les questions sont optimisées télémédecine
    telemedicineOptimized: true,
    remoteConsultSuitable: true,
    // Recalculer spécificité si nécessaire
    specificityScore: q.specificityScore || calculateTelemedicineSpecificity(q, patientProfile),
    // Ajouter métadonnées télémédecine
    requiresVisualExam: assessQuestionVisualNeed(q.question),
    criticalForDiagnosis: q.priority === "high"
  }))
}

function assessQuestionVisualNeed(question: string): boolean {
  const visualKeywords = ['couleur', 'aspect', 'forme', 'apparence', 'voir', 'montrer']
  return visualKeywords.some(keyword => question.toLowerCase().includes(keyword))
}

// ===== FONCTIONS UTILITAIRES =====
function isPatientSpecific(question: any, patientProfile: any): boolean {
  const questionText = question.question.toLowerCase()
  
  return questionText.includes(`${patientProfile.age} ans`) ||
         questionText.includes(patientProfile.gender.toLowerCase()) ||
         questionText.includes(patientProfile.primaryComplaint.toLowerCase()) ||
         (question.ageSpecific || question.genderSpecific || question.symptomSpecific) === true
}

function calculateTelemedicineSpecificity(question: any, patientProfile: any): number {
  let score = 40 // Base pour télémédecine
  
  const questionText = question.question.toLowerCase()
  
  // Bonus spécificité patient
  if (questionText.includes(`${patientProfile.age} ans`)) score += 25
  if (questionText.includes(patientProfile.gender.toLowerCase())) score += 20
  if (questionText.includes(patientProfile.primaryComplaint.toLowerCase())) score += 25
  
  // Bonus adaptation télémédecine
  if (question.telemedicineOptimized) score += 10
  if (question.type === "multiple_choice" && question.options?.length > 3) score += 5
  if (question.category?.includes('telemedicine')) score += 5
  
  // Bonus complexité
  if (question.question.length > 50) score += 5
  
  return Math.min(score, 100)
}

function generateEmergencyQuestions() {
  return [
    {
      id: 1,
      question: "Pouvez-vous décrire vos symptômes principaux ?",
      type: "text",
      category: "emergency_basic",
      priority: "high",
      specificityScore: 50
    },
    {
      id: 2,
      question: "Sur une échelle de 1 à 10, évaluez l'intensité de vos symptômes",
      type: "scale",
      category: "emergency_severity",
      priority: "high",
      specificityScore: 60
    }
  ]
}

// ===== ROUTE DE TEST =====
export async function GET() {
  console.log("🧪 Test diagnostic télémédecine...")
  
  const openaiStatus = await validateAndTestOpenAI()
  
  return NextResponse.json({
    service: "Générateur Questions Télémédecine IA",
    timestamp: new Date().toISOString(),
    openai_status: openaiStatus,
    recommendation: openaiStatus.isValid 
      ? "✅ Service opérationnel - Questions IA disponibles"
      : `❌ Mode fallback - ${openaiStatus.error}`,
    test_endpoint: "POST avec patientData et clinicalData"
  })
}
