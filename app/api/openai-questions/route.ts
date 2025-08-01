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

// Génération de prompt selon le mode - AMÉLIORÉ
function generatePromptByMode(
  mode: string,
  patientData: any,
  clinicalData: any,
  pattern: string
): string {
  const age = patientData?.age || 'Âge inconnu'
  const gender = patientData?.gender || 'Genre non spécifié'
  const symptoms = String(clinicalData?.symptoms || clinicalData?.chiefComplaint || 'Symptômes non spécifiés')
  
  const baseInfo = `
Patient: ${age}ans, ${gender}
Symptômes: ${symptoms}
Pattern: ${pattern}`

  // Ajout d'instructions plus claires pour obtenir UNIQUEMENT du JSON
  const jsonInstruction = "\n\nIMPORTANT: Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après."

  switch (mode) {
    case 'fast':
      return `${baseInfo}
Génère 5 questions diagnostiques télémédecine.

Format JSON EXACT à retourner:
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["option1", "option2", "option3", "option4"],
      "priority": "high"
    }
  ]
}${jsonInstruction}`

    case 'balanced':
      return `${baseInfo}
Génère 6 questions diagnostiques avec raisonnement clinique.

Format JSON EXACT à retourner:
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["option1", "option2", "option3", "option4"],
      "rationale": "...",
      "priority": "high"
    }
  ]
}${jsonInstruction}`

    case 'intelligent':
      return `${baseInfo}
MISSION: Questions diagnostiques intelligentes maximisant le gain d'information.

Format JSON EXACT à retourner:
{
  "reasoning": "Raisonnement clinique",
  "differential": ["diagnostic1", "diagnostic2"],
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["option1", "option2", "option3", "option4"],
      "clinical_reasoning": "...",
      "diagnostic_impact": {
        "if_positive": "...",
        "if_negative": "..."
      },
      "priority": "high"
    }
  ]
}${jsonInstruction}`

    default:
      return generatePromptByMode('balanced', patientData, clinicalData, pattern)
  }
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

// Configuration des modèles IA - TIMEOUTS AUGMENTÉS
const AI_CONFIGS = {
  fast: {
    model: "gpt-3.5-turbo",
    temperature: 0.1,
    maxTokens: 800,
    timeout: 5000 // Augmenté de 3s à 5s
  },
  balanced: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 1500,
    timeout: 8000 // Augmenté de 5s à 8s
  },
  intelligent: {
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 2500,
    timeout: 12000 // Augmenté de 5s à 12s
  }
}

// Fonction de parsing JSON améliorée
function parseAIResponse(text: string, mode: string): any {
  try {
    // Essayer de parser directement
    return JSON.parse(text)
  } catch (e) {
    // Si échec, essayer d'extraire le JSON
    console.log("Première tentative de parsing échouée, extraction du JSON...")
    
    // Nettoyer le texte
    let cleanedText = text.trim()
    
    // Rechercher le premier { et le dernier }
    const firstBrace = cleanedText.indexOf('{')
    const lastBrace = cleanedText.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonString = cleanedText.substring(firstBrace, lastBrace + 1)
      try {
        return JSON.parse(jsonString)
      } catch (parseError) {
        console.error("Échec du parsing après extraction:", parseError)
        console.log("Texte reçu:", text.substring(0, 500) + "...")
        throw parseError
      }
    }
    
    throw new Error("Aucun JSON valide trouvé dans la réponse")
  }
}

// Fonction principale
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parser la requête
    const body = await request.json()
    const { 
      patientData, 
      clinicalData, 
      mode = 'balanced'
    } = body

    // Validation des données
    if (!patientData || !clinicalData) {
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
    const ageString = String(validatedPatientData.age)
    const genderString = String(validatedPatientData.gender)
    const cacheKey = `${symptomsString}_${ageString}_${genderString}_${mode}`
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
    const pattern = detectMainPattern(
      validatedClinicalData.symptoms || validatedClinicalData.chiefComplaint || ""
    )

    // Générer le prompt selon le mode
    const prompt = generatePromptByMode(mode, validatedPatientData, validatedClinicalData, pattern)

    // Configuration selon le mode
    const aiConfig = AI_CONFIGS[mode as keyof typeof AI_CONFIGS] || AI_CONFIGS.balanced

    // Timeout avec durée adaptée au mode
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), aiConfig.timeout)
    )

    try {
      console.log(`🚀 Appel OpenAI ${mode} (timeout: ${aiConfig.timeout}ms)`)
      
      // Génération IA avec timeout
      const result = await Promise.race([
        generateText({
          model: openai(aiConfig.model),
          prompt,
          temperature: aiConfig.temperature,
          maxTokens: aiConfig.maxTokens,
        }),
        timeoutPromise
      ]) as any

      console.log("✅ Réponse OpenAI reçue")

      // Parser la réponse avec fonction améliorée
      let parsed
      try {
        parsed = parseAIResponse(result.text, mode)
      } catch (parseError) {
        console.error("❌ Erreur de parsing JSON:", parseError)
        throw parseError
      }

      // Extraire les données selon le mode
      const questions = parsed.questions || []
      const reasoning = parsed.reasoning || null
      const differential = parsed.differential || null

      // Valider que nous avons des questions
      if (!Array.isArray(questions) || questions.length === 0) {
        console.warn("⚠️ Pas de questions valides dans la réponse")
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
          fromCache: false,
          model: aiConfig.model,
          reasoning,
          differential
        }
      }

      // Mettre en cache si réponse rapide
      if (response.metadata.responseTime < 10000) {
        patternCache.set(cacheKey, response)
      }

      console.log(`✅ Succès ${mode}: ${response.metadata.responseTime}ms`)
      return NextResponse.json(response)

    } catch (error: any) {
      // Log détaillé de l'erreur
      console.error(`❌ Erreur dans génération ${mode}:`, error.message)
      
      // Utiliser fallback
      console.log("📌 Utilisation du fallback")
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS[pattern as keyof typeof FALLBACK_QUESTIONS] || FALLBACK_QUESTIONS.general,
        metadata: {
          mode,
          pattern,
          responseTime: Date.now() - startTime,
          fallback: true,
          fallbackReason: error.message,
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
          error: error.message
        }
      },
      { status: 500 }
    )
  }
}

// Endpoint pour obtenir les modes disponibles
export async function GET(request: NextRequest) {
  return NextResponse.json({
    modes: {
      fast: {
        description: "Ultra-rapide (1-2s)",
        model: "gpt-3.5-turbo",
        useCase: "Triage initial, urgences",
        timeout: "5s"
      },
      balanced: {
        description: "Équilibré (2-4s)",
        model: "gpt-4o-mini",
        useCase: "Usage standard",
        timeout: "8s"
      },
      intelligent: {
        description: "Intelligence maximale (3-8s)",
        model: "gpt-4o",
        useCase: "Cas complexes",
        timeout: "12s"
      }
    },
    defaultMode: "balanced",
    cacheEnabled: true
  })
}
