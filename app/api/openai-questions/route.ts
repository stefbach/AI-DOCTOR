// app/api/openai-questions/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Configuration pour différents modes de vitesse
export const runtime = 'edge'
export const preferredRegion = 'auto'

// Types
interface QuestionMode {
  speed: 'fast' | 'balanced' | 'intelligent'
}

// Cache LRU simple pour les patterns fréquents
class SimpleCache {
  private cache = new Map<string, any>()
  private maxSize = 50

  get(key: string): any | null {
    return this.cache.get(key) || null
  }

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
}

const patternCache = new SimpleCache()

// Patterns de diagnostic pour télémédecine
const DIAGNOSTIC_PATTERNS = {
  chest_pain: {
    keywords: ["thorax", "poitrine", "cardiaque", "oppression"],
    questions: [
      {
        question: "Où ressentez-vous exactement la douleur?",
        options: [
          "Centre de la poitrine",
          "Côté gauche", 
          "Dos",
          "Partout"
        ],
        priority: "high"
      },
      {
        question: "La douleur apparaît-elle à l'effort?",
        options: ["Oui", "Non", "Parfois", "Je ne sais pas"],
        priority: "high"
      }
    ]
  },
  headache: {
    keywords: ["tête", "céphalée", "migraine", "mal de tête"],
    questions: [
      {
        question: "Comment décririez-vous votre mal de tête?",
        options: [
          "Pulsatile (battements)",
          "En étau",
          "Comme un coup de poignard",
          "Diffus"
        ],
        priority: "high"
      }
    ]
  }
}

// Détection rapide du pattern principal
function detectMainPattern(symptoms: string | undefined | null): string {
  const symptomsLower = String(symptoms || '').toLowerCase()
  
  for (const [pattern, data] of Object.entries(DIAGNOSTIC_PATTERNS)) {
    if (data.keywords.some(keyword => symptomsLower.includes(keyword))) {
      return pattern
    }
  }
  
  return 'general'
}

// Génération de prompt selon le mode - SIMPLIFIÉ
function generatePromptByMode(
  mode: string,
  patientData: any,
  clinicalData: any,
  pattern: string
): string {
  const age = patientData?.age || 'Âge inconnu'
  const gender = patientData?.gender || 'Genre non spécifié'
  const symptoms = String(clinicalData?.symptoms || clinicalData?.chiefComplaint || 'Symptômes non spécifiés')
  
  // Prompt TRÈS SIMPLE pour faciliter le parsing
  const simplePrompt = `Patient: ${age} ans, ${gender}. Symptômes: ${symptoms}.

Génère un JSON avec 5 questions diagnostiques. Format:
{"questions":[{"id":1,"question":"...","options":["...","...","...","..."],"priority":"high"}]}

Réponds UNIQUEMENT avec le JSON, rien d'autre.`

  return simplePrompt
}

// Questions de fallback pré-générées
const FALLBACK_QUESTIONS = {
  general: [
    {
      id: 1,
      question: "Depuis combien de temps avez-vous ces symptômes?",
      options: ["Moins de 24h", "2-7 jours", "1-4 semaines", "Plus d'un mois"],
      priority: "high"
    },
    {
      id: 2,
      question: "Comment vos symptômes évoluent-ils?",
      options: ["S'aggravent", "Stables", "S'améliorent", "Varient"],
      priority: "high"
    },
    {
      id: 3,
      question: "Qu'est-ce qui déclenche ou aggrave vos symptômes?",
      options: ["Effort/mouvement", "Stress", "Alimentation", "Rien de particulier"],
      priority: "medium"
    },
    {
      id: 4,
      question: "Avez-vous de la fièvre?",
      options: ["Oui, mesurée >38°C", "Je me sens fiévreux", "Non", "Je ne sais pas"],
      priority: "high"
    },
    {
      id: 5,
      question: "Votre état général vous inquiète-t-il?",
      options: ["Très inquiet", "Modérément", "Peu inquiet", "Pas du tout"],
      priority: "medium"
    }
  ],
  chest_pain: [
    {
      id: 1,
      question: "Où ressentez-vous exactement la douleur?",
      options: ["Centre de la poitrine", "Côté gauche", "Dos", "Partout"],
      priority: "high"
    },
    {
      id: 2,
      question: "La douleur apparaît-elle à l'effort?",
      options: ["Oui", "Non", "Parfois", "Je ne sais pas"],
      priority: "high"
    },
    {
      id: 3,
      question: "La douleur irradie-t-elle?",
      options: ["Vers le bras gauche", "Vers la mâchoire", "Vers le dos", "Non"],
      priority: "high"
    }
  ],
  headache: [
    {
      id: 1,
      question: "Comment décririez-vous votre mal de tête?",
      options: ["Pulsatile (battements)", "En étau", "Comme un coup de poignard", "Diffus"],
      priority: "high"
    },
    {
      id: 2,
      question: "Avez-vous des symptômes associés?",
      options: ["Nausées", "Sensibilité à la lumière", "Troubles visuels", "Aucun"],
      priority: "high"
    }
  ]
}

// Configuration des modèles IA
const AI_CONFIGS = {
  fast: {
    model: "gpt-3.5-turbo",
    temperature: 0.1,
    maxTokens: 500
  },
  balanced: {
    model: "gpt-4o-mini", 
    temperature: 0.2,
    maxTokens: 800
  },
  intelligent: {
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 1200
  }
}

// Fonction principale avec DÉBOGAGE COMPLET
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("🚀 Début requête POST /api/openai-questions")
  
  try {
    // Parser la requête
    const body = await request.json()
    console.log("📝 Body reçu:", JSON.stringify(body, null, 2))
    
    const { 
      patientData, 
      clinicalData, 
      mode = 'balanced'
    } = body

    // Validation des données
    if (!patientData || !clinicalData) {
      console.error("❌ Données manquantes")
      return NextResponse.json(
        { error: "Données patient et cliniques requises", success: false },
        { status: 400 }
      )
    }

    // Validation et normalisation des données
    const validatedPatientData = {
      age: patientData.age || 'Non spécifié',
      gender: patientData.gender || 'Non spécifié',
      ...patientData
    }

    const validatedClinicalData = {
      symptoms: clinicalData.symptoms || '',
      chiefComplaint: clinicalData.chiefComplaint || '',
      ...clinicalData
    }

    // Vérifier le cache
    const symptomsString = String(validatedClinicalData.symptoms || validatedClinicalData.chiefComplaint || '')
    const cacheKey = `${symptomsString}_${validatedPatientData.age}_${validatedPatientData.gender}_${mode}`
    const cached = patternCache.get(cacheKey)
    if (cached) {
      console.log(`✅ Cache hit: ${Date.now() - startTime}ms`)
      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          fromCache: true,
          responseTime: Date.now() - startTime
        }
      })
    }

    // Détecter le pattern principal
    const pattern = detectMainPattern(symptomsString)
    console.log(`🔍 Pattern détecté: ${pattern}`)

    // Générer le prompt
    const prompt = generatePromptByMode(mode, validatedPatientData, validatedClinicalData, pattern)
    console.log(`📄 Prompt généré (${prompt.length} caractères)`)

    // Configuration selon le mode
    const aiConfig = AI_CONFIGS[mode as keyof typeof AI_CONFIGS] || AI_CONFIGS.balanced
    console.log(`⚙️ Config IA: ${JSON.stringify(aiConfig)}`)

    try {
      console.log(`🤖 Appel OpenAI ${aiConfig.model}...`)
      const aiStartTime = Date.now()
      
      // APPEL SANS TIMEOUT pour voir le temps réel
      const result = await generateText({
        model: openai(aiConfig.model),
        prompt,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      })
      
      const aiTime = Date.now() - aiStartTime
      console.log(`✅ Réponse OpenAI en ${aiTime}ms`)
      console.log(`📄 Réponse brute (${result.text.length} caractères):`)
      console.log(result.text.substring(0, 500) + (result.text.length > 500 ? '...' : ''))

      // Parser la réponse
      let questions = []
      try {
        // Nettoyer et parser
        const cleanText = result.text.trim()
        // Essayer de parser directement
        let parsed
        try {
          parsed = JSON.parse(cleanText)
        } catch (e) {
          // Si échec, extraire entre { et }
          const start = cleanText.indexOf('{')
          const end = cleanText.lastIndexOf('}')
          if (start !== -1 && end !== -1) {
            const jsonPart = cleanText.substring(start, end + 1)
            parsed = JSON.parse(jsonPart)
          } else {
            throw new Error("Pas de JSON trouvé")
          }
        }
        
        questions = parsed.questions || []
        console.log(`✅ ${questions.length} questions extraites`)
        
      } catch (parseError) {
        console.error("❌ Erreur parsing:", parseError)
        console.error("Texte complet reçu:", result.text)
        throw parseError
      }

      // Valider les questions
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Pas de questions valides")
      }

      // Préparer la réponse
      const response = {
        success: true,
        questions: questions.slice(0, 8),
        metadata: {
          mode,
          pattern,
          patientAge: validatedPatientData.age,
          responseTime: Date.now() - startTime,
          aiResponseTime: aiTime,
          fromCache: false,
          model: aiConfig.model
        }
      }

      // Mettre en cache
      patternCache.set(cacheKey, response)

      console.log(`✅ Succès total: ${response.metadata.responseTime}ms`)
      return NextResponse.json(response)

    } catch (error: any) {
      console.error(`❌ Erreur OpenAI:`, error)
      console.error("Stack:", error.stack)
      
      // Retourner fallback avec détails d'erreur
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS[pattern as keyof typeof FALLBACK_QUESTIONS] || FALLBACK_QUESTIONS.general,
        metadata: {
          mode,
          pattern,
          responseTime: Date.now() - startTime,
          fallback: true,
          fallbackReason: error.message,
          errorType: error.name,
          model: 'fallback'
        }
      })
    }

  } catch (error: any) {
    console.error("❌ Erreur générale:", error)
    return NextResponse.json(
      { 
        error: "Erreur génération questions",
        success: false,
        questions: FALLBACK_QUESTIONS.general,
        metadata: {
          fallback: true,
          error: error.message,
          errorType: error.name
        }
      },
      { status: 500 }
    )
  }
}

// Endpoint de test pour vérifier la connexion OpenAI
export async function GET(request: NextRequest) {
  console.log("🧪 Test connexion OpenAI...")
  
  try {
    // Test simple
    const testStart = Date.now()
    const result = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: "Réponds uniquement avec le JSON: {\"test\":\"ok\"}",
      temperature: 0,
      maxTokens: 50,
    })
    const testTime = Date.now() - testStart
    
    return NextResponse.json({
      status: "✅ OpenAI connecté",
      responseTime: `${testTime}ms`,
      response: result.text,
      modes: {
        fast: {
          description: "Ultra-rapide",
          model: "gpt-3.5-turbo",
          useCase: "Triage initial"
        },
        balanced: {
          description: "Équilibré",
          model: "gpt-4o-mini",
          useCase: "Usage standard"
        },
        intelligent: {
          description: "Intelligence maximale",
          model: "gpt-4o",
          useCase: "Cas complexes"
        }
      }
    })
  } catch (error: any) {
    console.error("❌ Erreur test:", error)
    return NextResponse.json({
      status: "❌ Erreur OpenAI",
      error: error.message,
      errorType: error.name
    }, { status: 500 })
  }
}
