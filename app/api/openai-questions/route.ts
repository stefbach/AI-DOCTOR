import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ===== DIAGNOSTIC SIMPLIFIÉ =====
async function quickOpenAIDiagnostic() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return { working: false, error: "Clé API manquante" }
    }
    
    if (!apiKey.startsWith('sk-')) {
      return { working: false, error: "Format clé API invalide" }
    }

    // Test simple
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: "Répondez: TEST_OK",
      temperature: 0,
      maxTokens: 10,
    })

    return { 
      working: true, 
      response: text,
      keyPreview: `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
    }
    
  } catch (error: any) {
    return { 
      working: false, 
      error: error.message,
      errorType: error.name
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API Questions Ultra-Personnalisées - Début")

    // 1. PARSE REQUEST
    let requestData: {
      patientData?: any
      clinicalData?: any
      language?: string
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues:", Object.keys(requestData))
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: "Format JSON invalide",
        ai_suggestions: []
      }, { status: 400 })
    }

    const { patientData, clinicalData } = requestData

    // 2. DIAGNOSTIC OPENAI RAPIDE
    const aiDiagnostic = await quickOpenAIDiagnostic()
    console.log("🤖 Diagnostic OpenAI:", aiDiagnostic.working ? "✅ OK" : `❌ ${aiDiagnostic.error}`)

    // 3. ANALYSE DONNÉES PATIENT
    const knownInfo = analyzePatientData(patientData, clinicalData)

    // 4. GÉNÉRATION QUESTIONS
    let questions = []
    let generationMethod = "fallback"
    let errorDetails = null

    if (aiDiagnostic.working) {
      try {
        console.log("🤖 Génération questions IA...")
        questions = await generateQuestionsWithAI(patientData, clinicalData, knownInfo)
        generationMethod = "openai"
        console.log(`✅ ${questions.length} questions IA générées`)
      } catch (aiError: any) {
        console.error("❌ Erreur génération IA:", aiError.message)
        errorDetails = aiError.message
        questions = generateFallbackQuestions(patientData, clinicalData, knownInfo)
      }
    } else {
      console.log("⚠️ OpenAI indisponible, utilisation fallback")
      errorDetails = aiDiagnostic.error
      questions = generateFallbackQuestions(patientData, clinicalData, knownInfo)
    }

    // 5. FORMATAGE RÉPONSE COMPATIBLE CLIENT
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      ai_suggestions: questions, // ← FORMAT ATTENDU PAR LE CLIENT
      questions: questions, // ← Garde aussi l'ancien format
      metadata: {
        aiGenerated: generationMethod === "openai",
        generationMethod: generationMethod,
        openaiWorking: aiDiagnostic.working,
        error: errorDetails,
        questionCount: questions.length,
        specificityLevel: "Ultra-Personnalisé",
        diagnostic: {
          openaiStatus: aiDiagnostic.working ? "✅ Fonctionnel" : `❌ ${aiDiagnostic.error}`,
          keyPreview: aiDiagnostic.keyPreview
        }
      }
    }

    console.log(`🎯 SUCCÈS: ${questions.length} questions générées via ${generationMethod}`)
    
    return NextResponse.json(response)

  } catch (globalError: any) {
    console.error("❌ ERREUR GLOBALE:", globalError.message)
    
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la génération des questions",
      details: globalError.message,
      ai_suggestions: [], // ← FORMAT COMPATIBLE MÊME EN ERREUR
      questions: [],
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// ===== FONCTIONS AUXILIAIRES =====

function analyzePatientData(patientData: any, clinicalData: any) {
  return {
    age: patientData?.age || 0,
    gender: patientData?.gender || "",
    complaint: clinicalData?.chiefComplaint || "",
    hasAntecedents: !!(patientData?.medicalHistory?.length > 0),
    antecedents: patientData?.medicalHistory || [],
    urgencyLevel: assessUrgency(clinicalData)
  }
}

function assessUrgency(clinicalData: any): string {
  const complaint = (clinicalData?.chiefComplaint || "").toLowerCase()
  
  if (complaint.includes('douleur thoracique') || 
      complaint.includes('essoufflement sévère') || 
      complaint.includes('perte de conscience')) {
    return "urgent"
  }
  
  if (clinicalData?.painScale > 8) return "urgent"
  if (clinicalData?.painScale > 6) return "semi-urgent"
  
  return "standard"
}

async function generateQuestionsWithAI(patientData: any, clinicalData: any, knownInfo: any) {
  const prompt = buildPrompt(patientData, clinicalData, knownInfo)

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.1,
    maxTokens: 2500,
  })

  // Parse JSON
  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const jsonMatch = cleanText.match(/\[[\s\S]*\]/)

  if (jsonMatch) {
    const aiQuestions = JSON.parse(jsonMatch[0])
    
    // Filtrer et améliorer
    return aiQuestions
      .filter(q => q.question && q.question.length > 20) // Éviter questions trop courtes
      .map((q, index) => ({
        ...q,
        id: index + 1,
        aiGenerated: true,
        specificityScore: calculateSpecificity(q, knownInfo)
      }))
      .slice(0, 8)
  }

  throw new Error("Aucun JSON valide trouvé dans la réponse IA")
}

function buildPrompt(patientData: any, clinicalData: any, knownInfo: any): string {
  const age = knownInfo.age
  const gender = knownInfo.gender
  const complaint = knownInfo.complaint

  return `Générez 6 questions médicales ULTRA-SPÉCIFIQUES pour ce patient:

PROFIL UNIQUE:
- ${gender} de ${age} ans
- Motif: "${complaint}"
- Antécédents: ${knownInfo.antecedents.join(', ') || 'Aucun'}

🎯 EXIGENCES ABSOLUES:
1. Chaque question DOIT mentionner l'âge, le sexe OU le symptôme spécifique
2. Aucune question générique type "Comment vous sentez-vous ?"
3. Questions adaptées à l'âge (pédiatrique si <18, gériatrique si >65)
4. Exploiter le symptôme "${complaint}" pour diagnostic différentiel

EXEMPLES TRANSFORMATION:
❌ "Avez-vous des douleurs ?"
✅ "Cette douleur abdominale chez un ${gender.toLowerCase()} de ${age} ans irradie-t-elle vers le dos ?"

❌ "Comment ça va ?"
✅ "À ${age} ans, cette fatigue vous empêche-t-elle de monter les escaliers ?"

FORMAT JSON STRICT:
[
  {
    "id": 1,
    "question": "Question ULTRA-spécifique mentionnant âge/sexe/symptôme précis",
    "type": "multiple_choice",
    "options": ["Option médicalement précise 1", "Option 2", "Option 3"],
    "category": "diagnostic_specifique",
    "priority": "high",
    "rationale": "Pourquoi cruciale pour CE patient de ${age} ans"
  }
]

Générez maintenant pour ce ${gender.toLowerCase()} de ${age} ans avec "${complaint}".
RÉPONDEZ UNIQUEMENT LE JSON, rien d'autre.`
}

function generateFallbackQuestions(patientData: any, clinicalData: any, knownInfo: any) {
  const age = knownInfo.age
  const gender = knownInfo.gender
  const complaint = knownInfo.complaint

  const questions = []

  // Question 1: Spécifique à l'âge
  if (age > 0) {
    if (age <= 18) {
      questions.push({
        id: 1,
        question: `À ${age} ans, ces symptômes t'empêchent-ils de jouer ou d'aller à l'école ?`,
        type: "yes_no",
        category: "pediatric_impact",
        priority: "high",
        ageSpecific: true,
        specificityScore: 90
      })
    } else if (age > 65) {
      questions.push({
        id: 1,
        question: `À ${age} ans, ces symptômes affectent-ils votre autonomie quotidienne ?`,
        type: "multiple_choice",
        options: ["Beaucoup", "Modérément", "Peu", "Pas du tout"],
        category: "geriatric_autonomy",
        priority: "high",
        ageSpecific: true,
        specificityScore: 85
      })
    } else {
      questions.push({
        id: 1,
        question: `Ces symptômes limitent-ils votre capacité de travail ou vos activités quotidiennes ?`,
        type: "multiple_choice",
        options: ["Arrêt complet", "Limitation importante", "Gêne légère", "Aucun impact"],
        category: "functional_impact",
        priority: "high",
        specificityScore: 70
      })
    }
  }

  // Question 2: Spécifique au symptôme
  if (complaint) {
    if (complaint.toLowerCase().includes('douleur thoracique')) {
      questions.push({
        id: 2,
        question: "Cette douleur thoracique irradie-t-elle vers le bras gauche, la mâchoire ou le dos ?",
        type: "multiple_choice",
        options: ["Bras gauche", "Mâchoire", "Dos", "Plusieurs zones", "Aucune irradiation"],
        category: "chest_pain_radiation",
        priority: "high",
        symptomSpecific: true,
        specificityScore: 95
      })
    } else if (complaint.toLowerCase().includes('douleur abdominale')) {
      questions.push({
        id: 2,
        question: "Cette douleur abdominale est-elle localisée ou diffuse dans tout le ventre ?",
        type: "multiple_choice",
        options: ["Très localisée (point précis)", "Zone délimitée", "Diffuse", "Change d'endroit"],
        category: "abdominal_pain_localization",
        priority: "high",
        symptomSpecific: true,
        specificityScore: 90
      })
    } else if (complaint.toLowerCase().includes('fatigue')) {
      questions.push({
        id: 2,
        question: "Cette fatigue s'améliore-t-elle avec le repos ou persiste-t-elle même au réveil ?",
        type: "multiple_choice",
        options: ["S'améliore avec repos", "Persiste au réveil", "Variable", "Empire avec repos"],
        category: "fatigue_pattern",
        priority: "high",
        symptomSpecific: true,
        specificityScore: 85
      })
    } else {
      questions.push({
        id: 2,
        question: `Concernant votre ${complaint.toLowerCase()}, à quel moment est-ce le plus intense ?`,
        type: "multiple_choice",
        options: ["Au réveil", "En journée", "Le soir", "La nuit", "Variable"],
        category: "symptom_timing",
        priority: "high",
        symptomSpecific: true,
        specificityScore: 75
      })
    }
  }

  // Question 3: Spécifique au genre si pertinent
  if (gender === "Féminin" && age >= 18 && age <= 50) {
    questions.push({
      id: 3,
      question: "Ces symptômes sont-ils liés à votre cycle menstruel ou à des changements hormonaux ?",
      type: "multiple_choice",
      options: ["Clairement liés au cycle", "Possiblement liés", "Aggravés par hormones", "Aucun lien"],
      category: "hormonal_correlation",
      priority: "medium",
      genderSpecific: true,
      specificityScore: 80
    })
  }

  // Questions d'approfondissement spécifiques
  questions.push({
    id: questions.length + 1,
    question: "Ces symptômes ressemblent-ils exactement à quelque chose que vous avez déjà vécu ?",
    type: "multiple_choice",
    options: ["Identiques à un épisode passé", "Similaires mais différents", "Complètement nouveaux", "Je ne sais pas"],
    category: "symptom_history_comparison",
    priority: "medium",
    specificityScore: 70
  })

  questions.push({
    id: questions.length + 1,
    question: "Y a-t-il des facteurs précis qui déclenchent ou aggravent ces symptômes ?",
    type: "text",
    category: "trigger_identification",
    priority: "medium",
    specificityScore: 65
  })

  questions.push({
    id: questions.length + 1,
    question: "Sur une échelle de 1 à 10, comment ces symptômes affectent-ils votre qualité de vie ?",
    type: "scale",
    category: "quality_of_life_impact",
    priority: "medium",
    specificityScore: 60
  })

  return questions.slice(0, 8)
}

function calculateSpecificity(question: any, knownInfo: any): number {
  let score = 50 // Base
  
  const questionText = question.question.toLowerCase()
  
  // Bonus spécificité
  if (questionText.includes(`${knownInfo.age} ans`)) score += 20
  if (questionText.includes(knownInfo.gender.toLowerCase())) score += 15
  if (questionText.includes(knownInfo.complaint.toLowerCase())) score += 20
  if (question.options && question.options.length > 2) score += 10
  
  return Math.min(score, 100)
}

// ===== ROUTE DE TEST =====
export async function GET() {
  const diagnostic = await quickOpenAIDiagnostic()
  
  return NextResponse.json({
    status: "Test OpenAI",
    timestamp: new Date().toISOString(),
    openai: diagnostic,
    recommendation: diagnostic.working 
      ? "✅ OpenAI fonctionne - Clé API valide"
      : `❌ Problème OpenAI: ${diagnostic.error}`
  })
}
