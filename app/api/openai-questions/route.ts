import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ===== DIAGNOSTIC ET CONFIGURATION OPENAI =====
function validateOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY
  console.log("🔍 Diagnostic OpenAI Configuration:")
  console.log("- API Key exists:", !!apiKey)
  console.log("- API Key length:", apiKey?.length || 0)
  console.log("- API Key starts with 'sk-':", apiKey?.startsWith('sk-') || false)
  
  if (!apiKey) {
    throw new Error("❌ OPENAI_API_KEY non définie dans les variables d'environnement")
  }
  
  if (!apiKey.startsWith('sk-')) {
    throw new Error("❌ OPENAI_API_KEY invalide - doit commencer par 'sk-'")
  }
  
  if (apiKey.length < 50) {
    throw new Error("❌ OPENAI_API_KEY semble trop courte")
  }
  
  console.log("✅ Configuration OpenAI validée")
  return apiKey
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API Questions Ultra-Personnalisées v2.0 - Début analyse avancée")

    // ===== VALIDATION OPENAI EN PREMIER =====
    let openaiConfigured = false
    let openaiError = null
    
    try {
      validateOpenAIConfig()
      openaiConfigured = true
      console.log("✅ OpenAI correctement configuré")
    } catch (configError: any) {
      openaiError = configError.message
      console.error("❌ Erreur configuration OpenAI:", configError.message)
    }

    let requestData: {
      patientData?: any
      clinicalData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour analyse:", Object.keys(requestData))
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

    // 1. ANALYSE EXHAUSTIVE DES DONNÉES DISPONIBLES
    console.log("🧠 Analyse exhaustive des données disponibles...")
    const knownInfo = analyzeAvailableDataEnhanced(patientData, clinicalData)
    
    // 2. VALIDATION DE LA QUALITÉ DES DONNÉES LUES
    const dataQuality = validateDataQuality(knownInfo, patientData, clinicalData)
    console.log("📊 Qualité des données:", dataQuality)

    // 3. GÉNÉRATION QUESTIONS AVEC DIAGNOSTIC DÉTAILLÉ
    let questions
    let aiUsed = false
    let errorDetails = null

    if (openaiConfigured) {
      try {
        console.log("🤖 Tentative génération questions IA ultra-spécifiques...")
        questions = await generateUltraSpecificQuestionsWithAIFixed(patientData, clinicalData, knownInfo)
        aiUsed = true
        console.log("✅ Questions IA générées avec succès")
      } catch (aiError: any) {
        console.error("❌ Erreur détaillée OpenAI:", {
          message: aiError.message,
          name: aiError.name,
          stack: aiError.stack?.substring(0, 500),
          response: aiError.response?.data || "Pas de données de réponse"
        })
        errorDetails = {
          type: "OpenAI API Error",
          message: aiError.message,
          details: aiError.toString()
        }
        questions = generateUltraSpecificFallbackQuestions(patientData, clinicalData, knownInfo)
      }
    } else {
      console.log("⚠️ OpenAI non configuré, utilisation du fallback")
      errorDetails = {
        type: "Configuration Error",
        message: openaiError || "OpenAI non configuré"
      }
      questions = generateUltraSpecificFallbackQuestions(patientData, clinicalData, knownInfo)
    }

    // 4. POST-TRAITEMENT AVEC SYSTÈME ANTI-REDONDANCE AVANCÉ
    questions = postProcessQuestionsWithAdvancedFiltering(questions, knownInfo, patientData, clinicalData)

    // 5. VALIDATION FINALE DE LA SPÉCIFICITÉ
    const finalValidation = validateQuestionSpecificity(questions, patientData, clinicalData, knownInfo)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      questions,
      metadata: {
        aiGenerated: aiUsed,
        openaiConfigured: openaiConfigured,
        openaiError: errorDetails,
        dataQuality,
        dataAnalysis: knownInfo,
        questionTypes: questions.map(q => q.category),
        specificityScore: calculateAdvancedSpecificityScore(questions),
        avgPriority: calculateAveragePriority(questions),
        personalizationLevel: "Ultra-Personnalisé v2.0",
        antiRedundancyApplied: true,
        antiGenericFiltersApplied: true,
        ageSpecificCount: questions.filter(q => q.ageSpecific).length,
        symptomSpecificCount: questions.filter(q => q.symptomSpecific).length,
        antecedentSpecificCount: questions.filter(q => q.antecedentSpecific).length,
        genderSpecificCount: questions.filter(q => q.genderSpecific).length,
        validationResults: finalValidation,
        generationTime: new Date().toISOString(),
        // DIAGNOSTIC DÉTAILLÉ
        diagnostic: {
          openaiApiKeyExists: !!process.env.OPENAI_API_KEY,
          openaiApiKeyValid: openaiConfigured,
          aiGenerationAttempted: openaiConfigured,
          aiGenerationSucceeded: aiUsed,
          fallbackUsed: !aiUsed,
          errorIfAny: errorDetails
        }
      },
    }

    console.log(`✅ ${questions.length} questions ultra-spécifiques générées (spécificité: ${response.metadata.specificityScore}/10)`)
    console.log(`🤖 IA utilisée: ${aiUsed ? 'OUI' : 'NON'}`)
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur complète questions ultra-personnalisées:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions ultra-personnalisées",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
        diagnostic: {
          openaiConfigured: !!process.env.OPENAI_API_KEY,
          errorType: error.name,
          errorMessage: error.message
        }
      },
      { status: 500 },
    )
  }
}

// ===== GÉNÉRATION IA AVEC GESTION D'ERREUR AMÉLIORÉE =====
async function generateUltraSpecificQuestionsWithAIFixed(patientData: any, clinicalData: any, knownInfo: any) {
  const prompt = buildUltraSpecificPromptEnhanced(patientData, clinicalData, knownInfo)

  console.log("🔄 Envoi de la requête à OpenAI...")
  console.log("📝 Prompt length:", prompt.length)

  try {
    // Configuration explicite du modèle OpenAI avec gestion d'erreur
    const model = openai("gpt-4o", {
      // On peut ajouter des options de configuration ici si nécessaire
    })

    const { text } = await generateText({
      model: model,
      prompt: prompt,
      temperature: 0.1,
      maxTokens: 3500,
    })

    console.log("✅ Réponse OpenAI reçue, length:", text.length)
    console.log("📄 Début de la réponse:", text.substring(0, 200))

    // Nettoyage et parsing de la réponse
    const cleanText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    console.log("🧹 Texte nettoyé, length:", cleanText.length)

    const jsonMatch = cleanText.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      console.log("✅ JSON trouvé dans la réponse")
      let aiQuestions = JSON.parse(jsonMatch[0])
      
      console.log(`📊 ${aiQuestions.length} questions IA parsées`)
      
      // Filtrage ultra-strict
      aiQuestions = eliminateGenericQuestionsEnhanced(aiQuestions, patientData, clinicalData, knownInfo)
      console.log(`✅ Après filtrage: ${aiQuestions.length} questions`)
      
      // Validation de spécificité pour chaque question IA
      aiQuestions = aiQuestions.filter(q => validateQuestionUltraSpecificity(q, patientData, clinicalData, knownInfo))
      console.log(`✅ Après validation spécificité: ${aiQuestions.length} questions`)
      
      // Compléter avec des questions ultra-spécifiques si nécessaire
      if (aiQuestions.length < 6) {
        console.log("🔄 Complément avec questions fallback...")
        const enhancedQuestions = generateUltraSpecificFallbackQuestions(patientData, clinicalData, knownInfo)
        const additionalQuestions = enhancedQuestions.slice(0, 8 - aiQuestions.length)
        aiQuestions.push(...additionalQuestions)
      }
      
      return aiQuestions.slice(0, 8)
    } else {
      throw new Error("❌ Aucun JSON valide trouvé dans la réponse OpenAI")
    }
  } catch (parseError: any) {
    console.error("❌ Erreur parsing réponse OpenAI:", parseError)
    throw new Error(`Erreur parsing OpenAI: ${parseError.message}`)
  }
}

// ===== TEST DE CONNEXION OPENAI (fonction utilitaire) =====
export async function testOpenAIConnection() {
  try {
    validateOpenAIConfig()
    
    console.log("🧪 Test de connexion OpenAI...")
    
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: "Répondez simplement 'TEST OK' si vous me recevez.",
      temperature: 0,
      maxTokens: 10,
    })
    
    console.log("✅ Test OpenAI réussi:", text)
    return { success: true, response: text }
  } catch (error: any) {
    console.error("❌ Test OpenAI échoué:", error)
    return { success: false, error: error.message }
  }
}

// Toutes les autres fonctions restent identiques...
// (je garde seulement les signatures pour éviter la répétition)

function analyzeAvailableDataEnhanced(patientData: any, clinicalData: any) {
  // ... code existant identique
}

function validateDataQuality(knownInfo: any, patientData: any, clinicalData: any) {
  // ... code existant identique
}

function eliminateGenericQuestionsEnhanced(questions: any[], patientData: any, clinicalData: any, knownInfo: any) {
  // ... code existant identique
}

function validateQuestionUltraSpecificity(question: any, patientData: any, clinicalData: any, knownInfo: any): boolean {
  // ... code existant identique
}

function generateUltraSpecificFallbackQuestions(patientData: any, clinicalData: any, knownInfo: any) {
  // ... code existant identique
}

function postProcessQuestionsWithAdvancedFiltering(questions: any[], knownInfo: any, patientData: any, clinicalData: any) {
  // ... code existant identique
}

function validateQuestionSpecificity(questions: any[], patientData: any, clinicalData: any, knownInfo: any) {
  // ... code existant identique
}

function calculateAdvancedSpecificityScore(questions: any[]): number {
  // ... code existant identique
}

function calculateAveragePriority(questions: any[]) {
  // ... code existant identique
}

function buildUltraSpecificPromptEnhanced(patientData: any, clinicalData: any, knownInfo: any): string {
  // ... code existant identique
}
