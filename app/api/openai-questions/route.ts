// app/api/openai-questions/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Configuration pour différents modes de vitesse
export const runtime = 'edge' // Pour des réponses plus rapides
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
function detectMainPattern(symptoms: string): string {
  const symptomsLower = symptoms.toLowerCase()
  
  for (const [pattern, data] of Object.entries(DIAGNOSTIC_PATTERNS)) {
    if (data.keywords.some(keyword => symptomsLower.includes(keyword))) {
      return pattern
    }
  }
  
  return 'general'
}

// Génération de prompt selon le mode
function generatePromptByMode(
  mode: string,
  patientData: any,
  clinicalData: any,
  pattern: string
): string {
  const baseInfo = `
Patient: ${patientData.age}ans, ${patientData.gender}
Symptômes: ${clinicalData.symptoms || clinicalData.chiefComplaint}
Pattern: ${pattern}`

  switch (mode) {
    case 'fast':
      return `${baseInfo}
Génère 5 questions diagnostiques télémédecine.
Format JSON: {"questions":[{"id":1,"question":"...","options":["..."],"priority":"high"}]}
JSON uniquement.`

    case 'balanced':
      return `${baseInfo}
Génère 6 questions diagnostiques avec raisonnement clinique.
Inclure: questions discriminantes, red flags, chronologie.
Format JSON avec rationale pour chaque question.
{"questions":[{"id":1,"question":"...","options":["..."],"rationale":"...","priority":"..."}]}`

    case 'intelligent':
      return `${baseInfo}
MISSION: Questions diagnostiques intelligentes maximisant le gain d'information.
Utilise le raisonnement bayésien pour discriminer entre diagnostics possibles.

Format JSON complet:
{
  "reasoning": "Raisonnement clinique",
  "differential": ["diagnostic1", "diagnostic2"],
  "questions": [{
    "id": 1,
    "question": "...",
    "options": ["..."],
    "clinical_reasoning": "...",
    "diagnostic_impact": {
      "if_positive": "...",
      "if_negative": "..."
    },
    "priority": "critical|high|medium"
  }]
}`

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

// Configuration des modèles IA
const AI_CONFIGS = {
  fast: {
    model: "gpt-3.5-turbo",
    temperature: 0.1,
    maxTokens: 800
  },
  balanced: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 1500
  },
  intelligent: {
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 2500
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
      mode = 'balanced' // Par défaut: mode équilibré
    } = body

    if (!patientData || !clinicalData) {
      return NextResponse.json(
        { error: "Données patient et cliniques requises", success: false },
        { status: 400 }
      )
    }

    // Vérifier le cache
    const cacheKey = `${clinicalData.symptoms}_${patientData.age}_${patientData.gender}_${mode}`
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
      clinicalData.symptoms || clinicalData.chiefComplaint || ""
    )

    // Générer le prompt selon le mode
    const prompt = generatePromptByMode(mode, patientData, clinicalData, pattern)

    // Configuration selon le mode (corrigé)
    const aiConfig = AI_CONFIGS[mode as keyof typeof AI_CONFIGS] || AI_CONFIGS.balanced

    // Timeout pour forcer fallback si trop lent
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), mode === 'fast' ? 3000 : 5000)
    )

    try {
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

      // Parser la réponse
      let questions
      let reasoning = null
      let differential = null
      
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          questions = parsed.questions || []
          reasoning = parsed.reasoning || null
          differential = parsed.differential || null
        } else {
          throw new Error("Pas de JSON trouvé")
        }
      } catch (parseError) {
        console.warn("Erreur parsing, utilisation fallback")
        questions = FALLBACK_QUESTIONS[pattern as keyof typeof FALLBACK_QUESTIONS] || FALLBACK_QUESTIONS.general
      }

      // Préparer la réponse
      const response = {
        success: true,
        questions: questions.slice(0, 8), // Limiter à 8 questions
        metadata: {
          mode,
          pattern,
          patientAge: patientData.age,
          responseTime: Date.now() - startTime,
          fromCache: false,
          model: aiConfig.model,
          reasoning,
          differential
        }
      }

      // Mettre en cache si réponse rapide
      if (response.metadata.responseTime < 4000) {
        patternCache.set(cacheKey, response)
      }

      console.log(`✅ Succès ${mode}: ${response.metadata.responseTime}ms`)
      return NextResponse.json(response)

    } catch (timeoutError) {
      // Fallback si timeout
      console.warn(`⚠️ Timeout, utilisation fallback`)
      return NextResponse.json({
        success: true,
        questions: FALLBACK_QUESTIONS[pattern as keyof typeof FALLBACK_QUESTIONS] || FALLBACK_QUESTIONS.general,
        metadata: {
          mode,
          pattern,
          responseTime: Date.now() - startTime,
          fallback: true,
          model: 'fallback'
        }
      })
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error)
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
        useCase: "Triage initial, urgences"
      },
      balanced: {
        description: "Équilibré (2-3s)",
        model: "gpt-4o-mini",
        useCase: "Usage standard"
      },
      intelligent: {
        description: "Intelligence maximale (3-5s)",
        model: "gpt-4o",
        useCase: "Cas complexes"
      }
    },
    defaultMode: "balanced",
    cacheEnabled: true
  })
}
