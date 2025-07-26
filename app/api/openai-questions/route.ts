import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ===== DIAGNOSTIC ULTRA-DÉTAILLÉ =====
async function performUltraDetailedDiagnostic() {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: {},
    openai: {},
    network: {},
    errors: []
  }

  try {
    // 1. DIAGNOSTIC ENVIRONNEMENT
    console.log("🔍 === DIAGNOSTIC ENVIRONNEMENT ===")
    
    const apiKey = process.env.OPENAI_API_KEY
    diagnostic.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      hasOpenAIKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyFormat: apiKey?.startsWith('sk-') ? 'correct' : 'incorrect',
      keyPreview: apiKey ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` : 'none'
    }
    
    console.log("📊 Environnement:", diagnostic.environment)

    // 2. TEST CONFIGURATION OPENAI
    console.log("🔍 === TEST CONFIGURATION OPENAI ===")
    
    if (!apiKey) {
      throw new Error("❌ OPENAI_API_KEY non définie")
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error("❌ OPENAI_API_KEY ne commence pas par 'sk-'")
    }

    if (apiKey.length < 50) {
      throw new Error("❌ OPENAI_API_KEY trop courte")
    }

    // 3. TEST INITIALISATION SDK
    console.log("🔍 === TEST SDK VERCEL AI ===")
    
    try {
      const model = openai("gpt-4o")
      diagnostic.openai.sdkInitialization = "success"
      console.log("✅ SDK Vercel AI initialisé")
    } catch (sdkError: any) {
      diagnostic.openai.sdkInitialization = "failed"
      diagnostic.errors.push(`SDK Error: ${sdkError.message}`)
      throw sdkError
    }

    // 4. TEST CONNEXION SIMPLE
    console.log("🔍 === TEST CONNEXION SIMPLE ===")
    
    const startTime = Date.now()
    
    try {
      const { text, usage, finishReason } = await generateText({
        model: openai("gpt-4o"),
        prompt: "Répondez simplement: TEST_OK_2024",
        temperature: 0,
        maxTokens: 10,
      })

      const endTime = Date.now()
      
      diagnostic.openai.simpleTest = {
        success: true,
        responseTime: endTime - startTime,
        response: text,
        usage: usage,
        finishReason: finishReason,
        responseLength: text.length
      }
      
      console.log("✅ Test connexion simple réussi:", {
        response: text,
        time: endTime - startTime + "ms",
        usage: usage
      })

    } catch (connectionError: any) {
      diagnostic.openai.simpleTest = {
        success: false,
        error: connectionError.message,
        errorType: connectionError.name,
        errorCode: connectionError.code,
        responseTime: Date.now() - startTime
      }
      
      console.error("❌ Test connexion simple échoué:", {
        message: connectionError.message,
        name: connectionError.name,
        code: connectionError.code
      })
      
      throw connectionError
    }

    // 5. TEST GÉNÉRATION COMPLEXE
    console.log("🔍 === TEST GÉNÉRATION COMPLEXE ===")
    
    const complexStartTime = Date.now()
    
    try {
      const complexPrompt = `Générez un JSON simple avec une question médicale:
      
[{"id": 1, "question": "Test question", "type": "yes_no"}]

Répondez UNIQUEMENT avec le JSON.`

      const { text: complexText } = await generateText({
        model: openai("gpt-4o"),
        prompt: complexPrompt,
        temperature: 0.1,
        maxTokens: 200,
      })

      const complexEndTime = Date.now()
      
      // Test parsing JSON
      let jsonParsed = false
      let parsedData = null
      
      try {
        const cleanText = complexText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0])
          jsonParsed = true
        }
      } catch (parseError) {
        console.log("⚠️ Erreur parsing JSON:", parseError)
      }

      diagnostic.openai.complexTest = {
        success: true,
        responseTime: complexEndTime - complexStartTime,
        response: complexText.substring(0, 200),
        fullResponseLength: complexText.length,
        jsonParsed: jsonParsed,
        parsedQuestions: parsedData?.length || 0
      }
      
      console.log("✅ Test génération complexe réussi:", {
        time: complexEndTime - complexStartTime + "ms",
        jsonParsed: jsonParsed,
        questions: parsedData?.length || 0
      })

    } catch (complexError: any) {
      diagnostic.openai.complexTest = {
        success: false,
        error: complexError.message,
        errorType: complexError.name,
        responseTime: Date.now() - complexStartTime
      }
      
      console.error("❌ Test génération complexe échoué:", complexError.message)
      throw complexError
    }

    return diagnostic

  } catch (error: any) {
    diagnostic.errors.push(`Global Error: ${error.message}`)
    console.error("❌ Diagnostic échoué:", error.message)
    return diagnostic
  }
}

export async function POST(request: NextRequest) {
  console.log("🚀 === DÉBUT DIAGNOSTIC ULTRA-DÉTAILLÉ ===")
  
  // ÉTAPE 0: DIAGNOSTIC COMPLET
  const diagnostic = await performUltraDetailedDiagnostic()
  
  try {
    let requestData: {
      patientData?: any
      clinicalData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues:", Object.keys(requestData))
    } catch (parseError) {
      return NextResponse.json({
        error: "Format JSON invalide",
        success: false,
        diagnostic: diagnostic
      }, { status: 400 })
    }

    const { patientData, clinicalData } = requestData

    // Analyse des données (version simplifiée pour le diagnostic)
    const knownInfo = {
      demographics: {
        hasAge: !!patientData?.age,
        hasGender: !!patientData?.gender,
        age: patientData?.age,
        gender: patientData?.gender
      },
      currentSymptoms: {
        hasChiefComplaint: !!clinicalData?.chiefComplaint,
        chiefComplaint: clinicalData?.chiefComplaint || ""
      },
      medicalHistory: {
        hasAntecedents: !!(patientData?.medicalHistory?.length > 0),
        specificConditions: patientData?.medicalHistory || []
      }
    }

    let questions = []
    let generationMethod = "none"
    let generationError = null

    // ÉTAPE 1: Tentative génération IA (seulement si diagnostic OK)
    if (diagnostic.openai.simpleTest?.success && diagnostic.openai.complexTest?.success) {
      try {
        console.log("🤖 Tentative génération IA (diagnostic OK)...")
        
        const prompt = buildSimplePrompt(patientData, clinicalData, knownInfo)
        
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: prompt,
          temperature: 0.1,
          maxTokens: 2000,
        })

        console.log("📝 Réponse IA reçue:", text.substring(0, 200))

        // Parse JSON
        const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/)

        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0])
          generationMethod = "openai_success"
          console.log(`✅ ${questions.length} questions IA générées`)
        } else {
          throw new Error("Pas de JSON valide dans la réponse")
        }

      } catch (aiGenerationError: any) {
        console.error("❌ Erreur génération IA:", aiGenerationError.message)
        generationError = aiGenerationError.message
        generationMethod = "ai_failed"
        questions = generateSimpleFallbackQuestions(patientData, clinicalData, knownInfo)
      }
    } else {
      console.log("⚠️ Diagnostic IA échoué, utilisation fallback direct")
      generationMethod = "diagnostic_failed"
      questions = generateSimpleFallbackQuestions(patientData, clinicalData, knownInfo)
    }

    // ÉTAPE 2: Assurer un minimum de questions
    if (questions.length === 0) {
      console.log("🔄 Génération questions de secours...")
      questions = [
        {
          id: 1,
          question: "Sur une échelle de 1 à 10, comment évaluez-vous l'intensité de vos symptômes actuels ?",
          type: "scale",
          category: "symptom_severity",
          priority: "high"
        },
        {
          id: 2,
          question: "Ces symptômes interfèrent-ils avec vos activités quotidiennes ?",
          type: "yes_no",
          category: "functional_impact",
          priority: "high"
        }
      ]
      generationMethod = "emergency_fallback"
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      questions: questions.slice(0, 8),
      diagnostic: diagnostic,
      generation: {
        method: generationMethod,
        error: generationError,
        questionCount: questions.length,
        aiWorking: diagnostic.openai.simpleTest?.success || false
      },
      metadata: {
        personalizationLevel: generationMethod.includes('openai') ? "IA Ultra-Personnalisé" : "Fallback Structuré",
        aiGenerated: generationMethod === "openai_success"
      }
    }

    console.log(`🎯 RÉSULTAT: ${questions.length} questions générées via ${generationMethod}`)
    
    return NextResponse.json(response)

  } catch (globalError: any) {
    console.error("❌ ERREUR GLOBALE:", globalError)
    
    return NextResponse.json({
      error: "Erreur lors de la génération des questions",
      details: globalError.message,
      success: false,
      diagnostic: diagnostic,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// ===== FONCTIONS AUXILIAIRES SIMPLIFIÉES =====

function buildSimplePrompt(patientData: any, clinicalData: any, knownInfo: any): string {
  const age = patientData?.age || "non spécifié"
  const gender = patientData?.gender || "non spécifié"
  const complaint = clinicalData?.chiefComplaint || "non spécifié"

  return `Générez exactement 6 questions médicales ultra-spécifiques pour ce patient:

PROFIL PATIENT:
- Âge: ${age} ans
- Sexe: ${gender}  
- Motif: ${complaint}

CONSIGNES:
1. Questions spécifiques à l'âge, sexe et symptôme
2. Pas de questions génériques
3. Format JSON uniquement
4. Réponse UNIQUEMENT le JSON, rien d'autre

FORMAT:
[
  {
    "id": 1,
    "question": "Question spécifique mentionnant âge/sexe/symptôme",
    "type": "multiple_choice",
    "options": ["Option 1", "Option 2", "Option 3"],
    "category": "specific_category",
    "priority": "high"
  }
]

Générez maintenant le JSON pour ce patient de ${age} ans avec "${complaint}".`
}

function generateSimpleFallbackQuestions(patientData: any, clinicalData: any, knownInfo: any) {
  const age = patientData?.age || 0
  const gender = patientData?.gender || ""
  const complaint = clinicalData?.chiefComplaint || ""

  const questions = []

  // Question 1: Adaptée à l'âge
  if (age > 0) {
    if (age <= 18) {
      questions.push({
        id: 1,
        question: `À ${age} ans, ces symptômes t'empêchent-ils de jouer ou d'aller à l'école normalement ?`,
        type: "yes_no",
        category: "pediatric_impact",
        priority: "high",
        ageSpecific: `${age} ans`
      })
    } else if (age > 65) {
      questions.push({
        id: 1,
        question: `À ${age} ans, ces symptômes affectent-ils votre autonomie au quotidien ?`,
        type: "multiple_choice",
        options: ["Beaucoup", "Modérément", "Peu", "Pas du tout"],
        category: "geriatric_autonomy",
        priority: "high",
        ageSpecific: `${age} ans`
      })
    } else {
      questions.push({
        id: 1,
        question: `Ces symptômes impactent-ils votre travail ou vos activités habituelles ?`,
        type: "multiple_choice",
        options: ["Impossibilité totale", "Limitation importante", "Gêne modérée", "Aucun impact"],
        category: "functional_impact",
        priority: "high"
      })
    }
  }

  // Question 2: Spécifique au symptôme
  if (complaint) {
    if (complaint.toLowerCase().includes('douleur')) {
      questions.push({
        id: 2,
        question: "Cette douleur est-elle constante ou survient-elle par épisodes ?",
        type: "multiple_choice",
        options: ["Constante", "Par épisodes", "Variable selon l'activité", "Autre pattern"],
        category: "pain_pattern",
        priority: "high",
        symptomSpecific: complaint
      })
    } else if (complaint.toLowerCase().includes('fatigue')) {
      questions.push({
        id: 2,
        question: "Cette fatigue s'améliore-t-elle avec le repos ?",
        type: "yes_no",
        category: "fatigue_pattern",
        priority: "high",
        symptomSpecific: complaint
      })
    } else {
      questions.push({
        id: 2,
        question: `Concernant votre ${complaint.toLowerCase()}, dans quelles circonstances est-ce le plus gênant ?`,
        type: "text",
        category: "symptom_context",
        priority: "high",
        symptomSpecific: complaint
      })
    }
  }

  // Question 3: Spécifique au genre si pertinent
  if (gender === "Féminin" && age >= 18 && age <= 50) {
    questions.push({
      id: 3,
      question: "Ces symptômes sont-ils liés à votre cycle menstruel ?",
      type: "multiple_choice",
      options: ["Oui, clairement liés", "Possiblement liés", "Aucun lien", "Je ne sais pas"],
      category: "hormonal_correlation",
      priority: "medium",
      genderSpecific: "Féminin"
    })
  }

  // Compléter avec des questions génériques de haute qualité si nécessaire
  while (questions.length < 6) {
    const genericQuestions = [
      {
        id: questions.length + 1,
        question: "Ces symptômes s'aggravent-ils à des moments particuliers de la journée ?",
        type: "multiple_choice",
        options: ["Matin", "Après-midi", "Soir", "Nuit", "Aucun pattern"],
        category: "temporal_pattern",
        priority: "medium"
      },
      {
        id: questions.length + 1,
        question: "Avez-vous identifié des facteurs qui déclenchent ou aggravent ces symptômes ?",
        type: "text",
        category: "trigger_factors",
        priority: "medium"
      },
      {
        id: questions.length + 1,
        question: "Ces symptômes ressemblent-ils à quelque chose que vous avez déjà vécu ?",
        type: "yes_no",
        category: "symptom_history",
        priority: "low"
      }
    ]
    
    questions.push(genericQuestions[questions.length - 3] || genericQuestions[0])
  }

  return questions.slice(0, 6)
}

// ===== ROUTE DE TEST SIMPLE =====
export async function GET() {
  console.log("🧪 Test simple OpenAI...")
  const diagnostic = await performUltraDetailedDiagnostic()
  
  return NextResponse.json({
    status: "Diagnostic OpenAI",
    timestamp: new Date().toISOString(),
    diagnostic: diagnostic,
    recommendation: diagnostic.openai.simpleTest?.success 
      ? "✅ OpenAI fonctionne correctement"
      : "❌ Problème détecté avec OpenAI"
  })
}
