import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ===== DIAGNOSTIC OPENAI SIMPLIFIÉ =====
async function testOpenAI() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey?.startsWith('sk-')) {
      return { working: false, error: "Clé API manquante ou invalide" }
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: "Répondez: OK",
      temperature: 0,
      maxTokens: 5,
    })

    return { 
      working: true, 
      response: text.trim(),
      keyPreview: `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
    }
    
  } catch (error: any) {
    return { 
      working: false, 
      error: error.message
    }
  }
}

export async function POST(request: NextRequest) {
  console.log("🏥 === GÉNÉRATEUR QUESTIONS TÉLÉMÉDECINE ROBUSTE ===")
  
  try {
    // 1. PARSE REQUEST
    let requestData: any
    try {
      requestData = await request.json()
      console.log("📝 Données reçues:", Object.keys(requestData))
      console.log("📊 PatientData:", requestData.patientData)
      console.log("📊 ClinicalData:", requestData.clinicalData)
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON:", parseError)
      return NextResponse.json({
        success: false,
        error: "Format JSON invalide",
        ai_suggestions: generateDefaultQuestions()
      }, { status: 400 })
    }

    // 2. EXTRACTION ET VALIDATION DONNÉES
    const patientInfo = extractPatientInfo(requestData)
    console.log("👤 Informations patient extraites:", patientInfo)

    // 3. TEST OPENAI
    const openaiStatus = await testOpenAI()
    console.log("🤖 OpenAI Status:", openaiStatus.working ? "✅ OK" : `❌ ${openaiStatus.error}`)

    // 4. GÉNÉRATION QUESTIONS
    let questions = []
    let method = "fallback"

    if (openaiStatus.working && patientInfo.hasValidData) {
      try {
        console.log("🤖 Tentative génération IA...")
        questions = await generateQuestionsWithOpenAI(patientInfo)
        method = "openai"
        console.log(`✅ ${questions.length} questions IA générées`)
      } catch (aiError: any) {
        console.error("❌ Erreur IA:", aiError.message)
        questions = generateSmartFallbackQuestions(patientInfo)
        method = "fallback_smart"
      }
    } else {
      console.log("🔄 Génération questions robustes...")
      questions = generateSmartFallbackQuestions(patientInfo)
      method = "fallback_smart"
    }

    // 5. VALIDATION FINALE
    if (questions.length === 0) {
      console.log("⚠️ Aucune question générée, utilisation questions par défaut")
      questions = generateDefaultQuestions()
      method = "default"
    }

    // 6. FORMATAGE RÉPONSE
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      ai_suggestions: questions,
      questions: questions,
      metadata: {
        aiGenerated: method === "openai",
        generationMethod: method,
        openaiWorking: openaiStatus.working,
        patientInfo: patientInfo,
        questionCount: questions.length,
        hasSpecificQuestions: questions.filter(q => q.isSpecific).length,
        diagnostic: {
          openaiStatus: openaiStatus.working ? "✅ Fonctionnel" : `❌ ${openaiStatus.error}`,
          dataQuality: patientInfo.dataQuality,
          fallbackReason: method !== "openai" ? "IA indisponible ou données insuffisantes" : null
        }
      }
    }

    console.log(`🎯 SUCCÈS: ${questions.length} questions générées via ${method}`)
    console.log("📋 Questions générées:", questions.map(q => q.question.substring(0, 50) + "..."))
    
    return NextResponse.json(response)

  } catch (globalError: any) {
    console.error("❌ ERREUR GLOBALE:", globalError)
    
    return NextResponse.json({
      success: false,
      error: "Erreur génération questions",
      details: globalError.message,
      ai_suggestions: generateDefaultQuestions(),
      questions: generateDefaultQuestions(),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// ===== EXTRACTION INFORMATIONS PATIENT =====
function extractPatientInfo(requestData: any) {
  const patientData = requestData?.patientData || {}
  const clinicalData = requestData?.clinicalData || {}
  
  // Extraction avec valeurs par défaut
  const age = patientData?.age || 0
  const gender = patientData?.gender || ""
  const complaint = clinicalData?.chiefComplaint || ""
  const painScale = clinicalData?.painScale || 0
  const antecedents = patientData?.medicalHistory || []
  const medications = patientData?.currentMedications || []
  const symptoms = clinicalData?.symptoms || []

  // Catégorisation
  let ageGroup = "adult"
  if (age > 0) {
    if (age < 18) ageGroup = "pediatric"
    else if (age > 65) ageGroup = "geriatric"
    else if (age <= 35) ageGroup = "young_adult"
  }

  // Évaluation qualité des données
  let dataQuality = "minimal"
  let hasValidData = false
  
  if (age > 0 && gender && complaint) {
    dataQuality = "complete"
    hasValidData = true
  } else if (age > 0 || gender || complaint) {
    dataQuality = "partial"
    hasValidData = true
  }

  return {
    age,
    gender,
    complaint,
    painScale,
    antecedents,
    medications,
    symptoms,
    ageGroup,
    dataQuality,
    hasValidData,
    // Informations dérivées
    isUrgent: painScale > 8 || complaint.toLowerCase().includes('thoracique'),
    requiresSpecialCare: age > 75 || antecedents.length > 2,
    isWoman: gender.toLowerCase().includes('fém'),
    isMan: gender.toLowerCase().includes('mas'),
    hasPain: complaint.toLowerCase().includes('douleur') || painScale > 0,
    hasFatigue: complaint.toLowerCase().includes('fatigue'),
    hasBreathing: complaint.toLowerCase().includes('essouf') || complaint.toLowerCase().includes('respir')
  }
}

// ===== GÉNÉRATION QUESTIONS AVEC OPENAI =====
async function generateQuestionsWithOpenAI(patientInfo: any) {
  const prompt = `Générez 6 questions médicales ULTRA-SPÉCIFIQUES pour ce patient en téléconsultation:

PROFIL PATIENT:
- Âge: ${patientInfo.age} ans
- Sexe: ${patientInfo.gender}
- Motif: "${patientInfo.complaint}"
- Antécédents: ${patientInfo.antecedents.length > 0 ? patientInfo.antecedents.join(', ') : 'Aucun'}

RÈGLES ABSOLUES:
1. Chaque question DOIT mentionner l'âge (${patientInfo.age} ans) OU le sexe OU le symptôme spécifique
2. Questions adaptées télémédecine (pas d'examen physique)
3. Réponses sous forme de choix multiples précis
4. Aucune question générique

EXEMPLES:
"Cette douleur thoracique chez un homme de 45 ans irradie-t-elle vers le bras gauche ?"
"À 67 ans, cette fatigue vous empêche-t-elle de monter les escaliers ?"

FORMAT JSON:
[
  {
    "id": 1,
    "question": "Question spécifique mentionnant âge/sexe/symptôme",
    "type": "multiple_choice",
    "options": ["Option précise 1", "Option précise 2", "Option précise 3", "Autre"],
    "category": "specific_category",
    "priority": "high"
  }
]

Générez maintenant pour ${patientInfo.gender} de ${patientInfo.age} ans avec "${patientInfo.complaint}".
RÉPONDEZ UNIQUEMENT LE JSON.`

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.1,
    maxTokens: 2000,
  })

  console.log("📄 Réponse OpenAI:", text.substring(0, 150) + "...")

  // Parse JSON
  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const jsonMatch = cleanText.match(/\[[\s\S]*\]/)

  if (jsonMatch) {
    const aiQuestions = JSON.parse(jsonMatch[0])
    return aiQuestions.map((q, index) => ({
      ...q,
      id: index + 1,
      isSpecific: true,
      aiGenerated: true,
      specificityScore: 90
    })).slice(0, 6)
  }

  throw new Error("JSON non trouvé dans réponse IA")
}

// ===== GÉNÉRATION QUESTIONS FALLBACK INTELLIGENTES =====
function generateSmartFallbackQuestions(patientInfo: any) {
  console.log("🔄 Génération questions fallback intelligentes pour:", {
    age: patientInfo.age,
    gender: patientInfo.gender,
    complaint: patientInfo.complaint
  })
  
  const questions = []
  const { age, gender, complaint, ageGroup, isWoman, hasPain, hasFatigue, hasBreathing } = patientInfo

  // === QUESTIONS SPÉCIFIQUES PAR DONNÉES DISPONIBLES ===

  // Question 1: Spécifique à l'âge
  if (age > 0) {
    if (ageGroup === 'pediatric') {
      questions.push({
        id: 1,
        question: `À ${age} ans, ces symptômes t'empêchent-ils de jouer ou d'aller à l'école comme d'habitude ?`,
        type: "multiple_choice",
        options: ["Je ne peux plus jouer du tout", "Je joue beaucoup moins", "Un peu moins qu'avant", "Ça va, je joue normalement"],
        category: "pediatric_impact",
        priority: "high",
        isSpecific: true,
        specificityScore: 95
      })
    } else if (ageGroup === 'geriatric') {
      questions.push({
        id: 1,
        question: `À ${age} ans, ces symptômes affectent-ils votre autonomie pour les activités quotidiennes ?`,
        type: "multiple_choice",
        options: ["Je ne peux plus rien faire seul(e)", "J'ai besoin d'aide pour certaines choses", "C'est plus difficile mais je me débrouille", "Aucun impact sur mon autonomie"],
        category: "geriatric_autonomy",
        priority: "high",
        isSpecific: true,
        specificityScore: 90
      })
    } else {
      questions.push({
        id: 1,
        question: `Ces symptômes limitent-ils votre capacité à travailler ou à faire vos activités habituelles ?`,
        type: "multiple_choice",
        options: ["Impossible de travailler", "Forte limitation au travail", "Quelques difficultés", "Aucun impact professionnel"],
        category: "functional_impact",
        priority: "high",
        isSpecific: true,
        specificityScore: 85
      })
    }
  }

  // Question 2: Spécifique au symptôme principal
  if (complaint) {
    if (complaint.toLowerCase().includes('douleur thoracique')) {
      questions.push({
        id: 2,
        question: "Cette douleur thoracique ressemble-t-elle à une sensation de serrement, brûlure, piqûre ou pression ?",
        type: "multiple_choice",
        options: ["Serrement comme un étau", "Brûlure intense", "Piqûre ou coup de poignard", "Pression ou poids lourd"],
        category: "chest_pain_quality",
        priority: "high",
        isSpecific: true,
        specificityScore: 95
      })
    } else if (complaint.toLowerCase().includes('douleur abdominale')) {
      questions.push({
        id: 2,
        question: "Cette douleur abdominale est-elle localisée à un endroit précis ou diffuse dans tout le ventre ?",
        type: "multiple_choice",
        options: ["Point très précis que je peux montrer du doigt", "Zone de la taille d'une main", "Diffuse dans une grande partie du ventre", "Se déplace d'un endroit à l'autre"],
        category: "abdominal_pain_location",
        priority: "high",
        isSpecific: true,
        specificityScore: 90
      })
    } else if (hasFatigue) {
      questions.push({
        id: 2,
        question: "Cette fatigue est-elle présente dès le réveil ou apparaît-elle progressivement dans la journée ?",
        type: "multiple_choice",
        options: ["Épuisé(e) dès le réveil", "Fatigue qui s'installe dans la matinée", "Surtout l'après-midi", "Principalement le soir"],
        category: "fatigue_timing",
        priority: "high",
        isSpecific: true,
        specificityScore: 85
      })
    } else if (hasBreathing) {
      questions.push({
        id: 2,
        question: "Cet essoufflement survient-il au repos, à l'effort léger, ou seulement lors d'efforts importants ?",
        type: "multiple_choice",
        options: ["Même au repos", "Dès le moindre effort (marcher)", "Effort modéré (monter escaliers)", "Seulement gros efforts"],
        category: "dyspnea_severity",
        priority: "high",
        isSpecific: true,
        specificityScore: 90
      })
    } else {
      questions.push({
        id: 2,
        question: `Comment cette ${complaint.toLowerCase()} a-t-elle commencé ?`,
        type: "multiple_choice",
        options: ["Brutalement en quelques minutes", "Progressivement sur quelques heures", "Graduellement sur plusieurs jours", "Impossible à déterminer"],
        category: "symptom_onset",
        priority: "high",
        isSpecific: true,
        specificityScore: 80
      })
    }
  }

  // Question 3: Spécifique au genre si pertinent
  if (isWoman && age >= 18 && age <= 50) {
    questions.push({
      id: 3,
      question: `Chez une femme de ${age} ans, ces symptômes sont-ils liés à votre cycle menstruel ?`,
      type: "multiple_choice",
      options: ["Clairement liés à mes règles", "Surviennent avant mes règles", "Plutôt au milieu du cycle", "Aucun lien avec le cycle"],
      category: "hormonal_correlation",
      priority: "medium",
      isSpecific: true,
      specificityScore: 85
    })
  } else if (gender && age > 0) {
    questions.push({
      id: 3,
      question: `Ces symptômes vous empêchent-ils de faire des activités que vous faisiez facilement avant ?`,
      type: "multiple_choice",
      options: ["Je ne peux plus faire ce que j'aimais", "C'est beaucoup plus difficile", "Un peu plus pénible", "Aucun changement"],
      category: "activity_limitation",
      priority: "medium",
      isSpecific: true,
      specificityScore: 70
    })
  }

  // Question 4: Intensité et impact
  questions.push({
    id: 4,
    question: "Sur une échelle de 0 à 10, à combien évaluez-vous l'intensité de vos symptômes actuellement ?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: ["Aucun symptôme", "Symptômes insupportables"],
    category: "symptom_intensity",
    priority: "high",
    isSpecific: false,
    specificityScore: 70
  })

  // Question 5: Facteurs déclenchants
  questions.push({
    id: 5,
    question: "Y a-t-il des situations, activités ou moments qui déclenchent ou aggravent ces symptômes ?",
    type: "multiple_choice",
    options: ["L'effort physique", "Le stress ou les émotions", "Certaines positions", "La nourriture", "Aucun facteur identifié"],
    category: "trigger_factors",
    priority: "medium",
    isSpecific: false,
    specificityScore: 75
  })

  // Question 6: Évolution temporelle
  questions.push({
    id: 6,
    question: "Comment évoluent ces symptômes depuis leur apparition ?",
    type: "multiple_choice",
    options: ["Ils s'aggravent progressivement", "Ils restent stables", "Ils s'améliorent lentement", "Ils varient d'un jour à l'autre"],
    category: "symptom_evolution",
    priority: "medium",
    isSpecific: false,
    specificityScore: 65
  })

  console.log(`✅ ${questions.length} questions fallback générées`)
  return questions.slice(0, 6)
}

// ===== QUESTIONS PAR DÉFAUT (URGENCE) =====
function generateDefaultQuestions() {
  console.log("🆘 Génération questions par défaut")
  
  return [
    {
      id: 1,
      question: "Pouvez-vous décrire vos symptômes principaux en quelques mots ?",
      type: "text",
      placeholder: "Décrivez ce que vous ressentez...",
      category: "basic_description",
      priority: "high",
      isSpecific: false,
      specificityScore: 50
    },
    {
      id: 2,
      question: "Sur une échelle de 1 à 10, quelle est l'intensité de votre gêne ou douleur ?",
      type: "scale",
      scaleMin: 1,
      scaleMax: 10,
      scaleLabels: ["Très légère", "Insupportable"],
      category: "pain_scale",
      priority: "high",
      isSpecific: false,
      specificityScore: 60
    },
    {
      id: 3,
      question: "Depuis quand ressentez-vous ces symptômes ?",
      type: "multiple_choice",
      options: ["Quelques heures", "1-2 jours", "Une semaine", "Plus d'une semaine"],
      category: "symptom_duration",
      priority: "high",
      isSpecific: false,
      specificityScore: 55
    },
    {
      id: 4,
      question: "Ces symptômes vous empêchent-ils de faire vos activités normales ?",
      type: "multiple_choice",
      options: ["Complètement", "Partiellement", "Un peu", "Pas du tout"],
      category: "functional_impact",
      priority: "medium",
      isSpecific: false,
      specificityScore: 60
    },
    {
      id: 5,
      question: "Avez-vous déjà eu des symptômes similaires dans le passé ?",
      type: "yes_no",
      category: "history_comparison",
      priority: "medium",
      isSpecific: false,
      specificityScore: 45
    },
    {
      id: 6,
      question: "Y a-t-il autre chose d'important que vous souhaitez mentionner ?",
      type: "text",
      placeholder: "Informations complémentaires...",
      category: "additional_info",
      priority: "low",
      isSpecific: false,
      specificityScore: 40
    }
  ]
}

// ===== ROUTE DE TEST =====
export async function GET() {
  const openaiStatus = await testOpenAI()
  
  return NextResponse.json({
    service: "Générateur Questions Télémédecine Robuste",
    timestamp: new Date().toISOString(),
    openai: openaiStatus,
    status: openaiStatus.working 
      ? "✅ Service opérationnel"
      : `⚠️ Mode fallback: ${openaiStatus.error}`,
    example_request: {
      patientData: { age: 45, gender: "Féminin", medicalHistory: ["hypertension"] },
      clinicalData: { chiefComplaint: "douleur thoracique", painScale: 6 }
    }
  })
}
