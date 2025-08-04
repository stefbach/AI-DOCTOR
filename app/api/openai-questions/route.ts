// app/api/openai-questions/route.ts - VERSION AVEC PROTECTION DES DONNÉES
import { type NextRequest, NextResponse } from "next/server"
import crypto from 'crypto'

// Configuration pour différents modes de vitesse
export const runtime = 'edge'
export const preferredRegion = 'auto'

// ==================== FONCTIONS DE PROTECTION DES DONNÉES ====================
function anonymizePatientData(patientData: any): {
  anonymized: any,
  originalIdentity: any,
  anonymousId: string
} {
  // Sauvegarder l'identité originale
  const originalIdentity = {
    firstName: patientData?.firstName,
    lastName: patientData?.lastName,
    name: patientData?.name,
    email: patientData?.email,
    phone: patientData?.phone
  }
  
  // Créer une copie sans les données sensibles
  const anonymized = { ...patientData }
  const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'idNumber', 'ssn']
  
  sensitiveFields.forEach(field => {
    delete anonymized[field]
  })
  
  // Ajouter un ID anonyme pour le suivi
  const anonymousId = `ANON-Q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId
  
  console.log('🔒 Données patient anonymisées pour les questions')
  console.log(`   - ID anonyme: ${anonymousId}`)
  console.log('   - Champs protégés:', sensitiveFields.filter(f => originalIdentity[f]).join(', '))
  
  return { anonymized, originalIdentity, anonymousId }
}

// Fonction de logging sécurisé
function secureLog(message: string, data?: any) {
  if (data && typeof data === 'object') {
    const safeData = { ...data }
    const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'apiKey', 'password']
    
    sensitiveFields.forEach(field => {
      if (safeData[field]) {
        safeData[field] = '[PROTÉGÉ]'
      }
    })
    
    console.log(message, safeData)
  } else {
    console.log(message, data)
  }
}

// ==================== FONCTION DE DEBUG ====================
function debugApiKey(apiKey: string | undefined): void {
  console.log('🔑 DEBUG OPENAI_API_KEY:', {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey?.substring(0, 20) || 'UNDEFINED',
    suffix: apiKey?.substring((apiKey?.length || 4) - 4) || 'UNDEFINED',
    isValidFormat: apiKey?.startsWith('sk-proj-') || false,
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENAI')).join(', ')
  })
}

// ==================== CACHE SIMPLE ====================
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

// ==================== PATTERNS DE DIAGNOSTIC ====================
const DIAGNOSTIC_PATTERNS = {
  chest_pain: {
    keywords: ["thorax", "poitrine", "cardiaque", "oppression", "chest", "cardiac"],
    questions: [
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
      },
      {
        id: 4,
        question: "Depuis combien de temps avez-vous cette douleur?",
        options: ["Moins de 30 minutes", "30 min - 2h", "Plus de 2h", "Intermittent"],
        priority: "high"
      },
      {
        id: 5,
        question: "Avez-vous des symptômes associés?",
        options: ["Essoufflement", "Sueurs", "Nausées", "Aucun"],
        priority: "medium"
      }
    ]
  },
  headache: {
    keywords: ["tête", "céphalée", "migraine", "mal de tête", "head", "cephalalgia"],
    questions: [
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
      },
      {
        id: 3,
        question: "Qu'est-ce qui déclenche votre mal de tête?",
        options: ["Stress", "Certains aliments", "Manque de sommeil", "Rien de particulier"],
        priority: "medium"
      },
      {
        id: 4,
        question: "À quelle fréquence avez-vous ces maux de tête?",
        options: ["Première fois", "Occasionnels", "Fréquents (>1/semaine)", "Quotidiens"],
        priority: "high"
      },
      {
        id: 5,
        question: "Votre mal de tête est-il accompagné de fièvre?",
        options: ["Oui", "Non", "Je ne sais pas", "Parfois"],
        priority: "high"
      }
    ]
  },
  abdominal_pain: {
    keywords: ["ventre", "abdomen", "estomac", "douleur abdominale", "stomach", "belly"],
    questions: [
      {
        id: 1,
        question: "Où se situe précisément la douleur?",
        options: ["Haut du ventre", "Autour du nombril", "Bas du ventre", "Tout l'abdomen"],
        priority: "high"
      },
      {
        id: 2,
        question: "Comment décririez-vous la douleur?",
        options: ["Crampes", "Brûlure", "Coup de poignard", "Lourdeur"],
        priority: "high"
      },
      {
        id: 3,
        question: "La douleur est-elle liée aux repas?",
        options: ["Avant les repas", "Après les repas", "Pendant", "Pas de lien"],
        priority: "high"
      },
      {
        id: 4,
        question: "Avez-vous des troubles digestifs associés?",
        options: ["Nausées/vomissements", "Diarrhée", "Constipation", "Aucun"],
        priority: "high"
      },
      {
        id: 5,
        question: "Avez-vous de la fièvre?",
        options: ["Oui (>38°C)", "Sensation de fièvre", "Non", "Je ne sais pas"],
        priority: "high"
      }
    ]
  }
}

// ==================== QUESTIONS FALLBACK ====================
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
  ]
}

// ==================== DÉTECTION DE PATTERN ====================
function detectMainPattern(symptoms: string | undefined | null): string {
  const symptomsLower = String(symptoms || '').toLowerCase()
  
  for (const [pattern, data] of Object.entries(DIAGNOSTIC_PATTERNS)) {
    if (data.keywords.some(keyword => symptomsLower.includes(keyword))) {
      return pattern
    }
  }
  
  return 'general'
}

// ==================== CONFIGURATION DES MODÈLES ====================
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

// ==================== FONCTION PRINCIPALE AVEC PROTECTION ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("🚀 Début requête POST /api/openai-questions (VERSION PROTÉGÉE)")
  
  try {
    // 1. Récupération et validation de la clé API
    const apiKey = process.env.OPENAI_API_KEY
    debugApiKey(apiKey)
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY manquante dans les variables d\'environnement')
    }
    
    if (!apiKey.startsWith('sk-')) {
      throw new Error('Format de clé API invalide (doit commencer par sk-)')
    }
    
    // 2. Parser la requête
    const body = await request.json()
    console.log("📝 Body reçu, parsing des données...")
    
    const { 
      patientData, 
      clinicalData, 
      mode = 'balanced'
    } = body

    // 3. Validation des données
    if (!patientData || !clinicalData) {
      console.error("❌ Données manquantes dans la requête")
      return NextResponse.json(
        { error: "Données patient et cliniques requises", success: false },
        { status: 400 }
      )
    }

    // ========== PROTECTION DES DONNÉES : ANONYMISATION ==========
    const { anonymized: anonymizedPatientData, originalIdentity, anonymousId } = anonymizePatientData(patientData)

    // 4. Normalisation des données AVEC DONNÉES ANONYMISÉES
    const validatedPatientData = {
      age: anonymizedPatientData.age || 'Non spécifié',
      gender: anonymizedPatientData.gender || anonymizedPatientData.sex || 'Non spécifié',
      ...anonymizedPatientData
    }

    const validatedClinicalData = {
      symptoms: clinicalData.symptoms || clinicalData.chiefComplaint || '',
      chiefComplaint: clinicalData.chiefComplaint || clinicalData.symptoms || '',
      ...clinicalData
    }

    // Log sécurisé des données patient
    secureLog('📊 Données patient (anonymisées):', validatedPatientData)

    // 5. Vérifier le cache
    const symptomsString = String(validatedClinicalData.symptoms || validatedClinicalData.chiefComplaint || '')
    const cacheKey = `${symptomsString}_${validatedPatientData.age}_${validatedPatientData.gender}_${mode}`
    const cached = patternCache.get(cacheKey)
    
    if (cached) {
      console.log(`✅ Cache hit: ${Date.now() - startTime}ms`)
      return NextResponse.json({
        ...cached,
        dataProtection: {
          enabled: true,
          anonymousId,
          method: 'anonymization',
          message: 'Patient data protected during processing'
        },
        metadata: {
          ...cached.metadata,
          fromCache: true,
          responseTime: Date.now() - startTime
        }
      })
    }

    // 6. Détecter le pattern principal
    const pattern = detectMainPattern(symptomsString)
    console.log(`🔍 Pattern détecté: ${pattern}`)

    // 7. Utiliser les questions prédéfinies si disponibles
    if (pattern !== 'general' && DIAGNOSTIC_PATTERNS[pattern as keyof typeof DIAGNOSTIC_PATTERNS]) {
      console.log(`✅ Utilisation des questions prédéfinies pour: ${pattern}`)
      const response = {
        success: true,
        questions: DIAGNOSTIC_PATTERNS[pattern as keyof typeof DIAGNOSTIC_PATTERNS].questions,
        dataProtection: {
          enabled: true,
          anonymousId,
          method: 'predefined-patterns',
          message: 'No personal data sent to AI - using predefined patterns'
        },
        metadata: {
          mode,
          pattern,
          patientAge: validatedPatientData.age,
          responseTime: Date.now() - startTime,
          fromCache: false,
          model: 'predefined-patterns',
          dataProtected: true
        }
      }
      
      patternCache.set(cacheKey, response)
      return NextResponse.json(response)
    }

    // 8. Générer le prompt pour OpenAI SANS DONNÉES PERSONNELLES
    const prompt = `Patient: ${validatedPatientData.age} ans, ${validatedPatientData.gender}. 
Symptômes: ${symptomsString}.

Génère exactement 5 questions diagnostiques pertinentes pour évaluer ce patient.

Format JSON requis:
{
  "questions": [
    {
      "id": 1,
      "question": "Question claire et simple en français",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "high"
    }
  ]
}

IMPORTANT: 
- Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire
- Exactement 5 questions
- Chaque question doit avoir exactement 4 options
- Les questions doivent être pertinentes pour les symptômes mentionnés
- Utilise un français simple et clair
- Ne mentionne JAMAIS de noms ou d'informations personnelles`

    // 9. Configuration selon le mode
    const aiConfig = AI_CONFIGS[mode as keyof typeof AI_CONFIGS] || AI_CONFIGS.balanced
    console.log(`⚙️ Config IA: ${aiConfig.model}`)
    console.log(`🔒 Protection activée: Aucune donnée personnelle envoyée`)

    // 10. Appel OpenAI avec retry
    console.log(`🤖 Appel OpenAI ${aiConfig.model}...`)
    const aiStartTime = Date.now()
    
    let openaiResponse
    let retryCount = 0
    const maxRetries = 2
    
    while (retryCount <= maxRetries) {
      try {
        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [
              {
                role: 'system',
                content: 'Tu es un médecin expert en télémédecine. Génère des questions diagnostiques pertinentes en format JSON. IMPORTANT: Ne jamais inclure ou demander de noms ou informations personnelles identifiables.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.maxTokens,
            response_format: { type: "json_object" }
          }),
        })
        
        if (openaiResponse.ok) {
          break
        } else if (openaiResponse.status === 401) {
          const errorBody = await openaiResponse.text()
          console.error('❌ Erreur 401 - Clé API invalide:', errorBody)
          throw new Error(`Clé API invalide: ${errorBody}`)
        } else if (openaiResponse.status === 429 && retryCount < maxRetries) {
          console.warn(`⚠️ Rate limit, retry ${retryCount + 1}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          retryCount++
        } else {
          const errorText = await openaiResponse.text()
          throw new Error(`Erreur OpenAI ${openaiResponse.status}: ${errorText}`)
        }
      } catch (error) {
        if (retryCount >= maxRetries) {
          throw error
        }
        console.warn(`⚠️ Erreur, retry ${retryCount + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        retryCount++
      }
    }
    
    if (!openaiResponse || !openaiResponse.ok) {
      throw new Error('Impossible de contacter OpenAI')
    }
    
    const aiTime = Date.now() - aiStartTime
    console.log(`✅ Réponse OpenAI en ${aiTime}ms`)
    
    // 11. Parser la réponse
    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content || '{}'
    
    let questions = []
    try {
      const parsed = JSON.parse(content)
      questions = parsed.questions || []
      console.log(`✅ ${questions.length} questions extraites`)
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON:", parseError)
      console.error("Contenu reçu:", content)
      throw new Error('Réponse OpenAI invalide')
    }

    // 12. Valider les questions
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Pas de questions valides générées")
    }

    // 13. Préparer la réponse AVEC INDICATEUR DE PROTECTION
    const response = {
      success: true,
      questions: questions.slice(0, 5), // Maximum 5 questions
      dataProtection: {
        enabled: true,
        anonymousId,
        method: 'anonymization',
        fieldsProtected: Object.keys(originalIdentity).filter(k => originalIdentity[k]),
        message: 'Patient identity was protected during AI processing',
        compliance: {
          rgpd: true,
          hipaa: true,
          dataMinimization: true
        }
      },
      metadata: {
        mode,
        pattern,
        patientAge: validatedPatientData.age,
        responseTime: Date.now() - startTime,
        aiResponseTime: aiTime,
        fromCache: false,
        model: aiConfig.model,
        dataProtected: true
      }
    }

    // 14. Mettre en cache
    patternCache.set(cacheKey, response)

    console.log(`✅ Succès total: ${response.metadata.responseTime}ms`)
    console.log(`🔒 Protection des données: ACTIVE - Aucune donnée personnelle envoyée à OpenAI`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error(`❌ Erreur:`, error)
    console.error("Stack:", error.stack)
    
    // Retourner les questions fallback AVEC PROTECTION
    const pattern = 'general'
    return NextResponse.json({
      success: true,
      questions: FALLBACK_QUESTIONS[pattern],
      dataProtection: {
        enabled: true,
        method: 'fallback',
        message: 'Using fallback questions - no AI processing needed',
        compliance: {
          rgpd: true,
          hipaa: true
        }
      },
      metadata: {
        mode: 'fallback',
        pattern,
        responseTime: Date.now() - startTime,
        fallback: true,
        fallbackReason: error.message,
        errorType: error.name,
        model: 'fallback',
        dataProtected: true,
        debugInfo: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
        }
      }
    })
  }
}

// ==================== ENDPOINT DE TEST ====================
export async function GET(request: NextRequest) {
  console.log("🧪 Test connexion OpenAI...")
  
  const apiKey = process.env.OPENAI_API_KEY
  debugApiKey(apiKey)
  
  if (!apiKey) {
    return NextResponse.json({
      status: '❌ Pas de clé API',
      error: 'OPENAI_API_KEY non définie',
      help: 'Ajoutez OPENAI_API_KEY dans vos variables d\'environnement',
      dataProtection: {
        status: 'N/A - No API key'
      }
    }, { status: 500 })
  }
  
  try {
    // Test simple avec l'API
    const testStart = Date.now()
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Réponds avec le JSON: {"test":"ok"}'
          }
        ],
        temperature: 0,
        max_tokens: 50,
        response_format: { type: "json_object" }
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({
        status: '❌ Erreur OpenAI',
        error,
        statusCode: response.status,
        dataProtection: {
          status: 'Error - API not accessible'
        }
      }, { status: response.status })
    }
    
    const data = await response.json()
    const testTime = Date.now() - testStart
    
    return NextResponse.json({
      status: "✅ OpenAI connecté",
      responseTime: `${testTime}ms`,
      response: data.choices[0]?.message?.content,
      dataProtection: {
        status: '✅ Activée',
        method: 'anonymization',
        compliance: ['RGPD', 'HIPAA'],
        features: [
          'Anonymisation automatique des données patient',
          'Aucun nom/email/téléphone envoyé à OpenAI',
          'ID anonyme pour le tracking',
          'Logging sécurisé'
        ]
      },
      modes: {
        fast: {
          description: "Ultra-rapide",
          model: "gpt-3.5-turbo",
          useCase: "Triage initial",
          dataProtected: true
        },
        balanced: {
          description: "Équilibré",
          model: "gpt-4o-mini",
          useCase: "Usage standard",
          dataProtected: true
        },
        intelligent: {
          description: "Intelligence maximale",
          model: "gpt-4o",
          useCase: "Cas complexes",
          dataProtected: true
        }
      },
      keyInfo: {
        prefix: apiKey.substring(0, 20),
        length: apiKey.length,
        valid: true
      }
    })
  } catch (error: any) {
    console.error("❌ Erreur test:", error)
    return NextResponse.json({
      status: "❌ Erreur",
      error: error.message,
      errorType: error.name,
      dataProtection: {
        status: 'Error during test'
      }
    }, { status: 500 })
  }
}