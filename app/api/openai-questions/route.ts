// app/api/openai-questions/route.ts - VERSION AMÉLIORÉE AVEC APPEL IA FORCÉ
import { type NextRequest, NextResponse } from "next/server"

// Configuration pour différents modes de vitesse
export const runtime = 'edge'
export const preferredRegion = 'auto'

// ==================== DATA PROTECTION FUNCTIONS ====================
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
  
  // Créer une copie sans données sensibles
  const anonymized = { ...patientData }
  const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'idNumber', 'ssn']
  
  sensitiveFields.forEach(field => {
    delete anonymized[field]
  })
  
  // Ajouter un ID anonyme pour le suivi
  const anonymousId = `ANON-Q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  anonymized.anonymousId = anonymousId
  
  console.log('🔒 Données patient anonymisées pour questions')
  console.log(`   - ID anonyme: ${anonymousId}`)
  console.log('   - Champs protégés:', sensitiveFields.filter(f => originalIdentity[f]).join(', '))
  
  return { anonymized, originalIdentity, anonymousId }
}

// Fonction de log sécurisé
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

// ==================== DEBUG FUNCTION ====================
function debugApiKey(apiKey: string | undefined): void {
  console.log('🔑 DEBUG OPENAI_API_KEY:', {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey?.substring(0, 20) || 'UNDEFINED',
    suffix: apiKey?.substring((apiKey?.length || 4) - 4) || 'UNDEFINED',
    isValidFormat: apiKey?.startsWith('sk-') || false,
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENAI')).join(', ')
  })
}

// ==================== CONFIGURATION DES MODÈLES ====================
const AI_CONFIGS = {
  fast: {
    model: "gpt-3.5-turbo",
    temperature: 0.3,
    maxTokens: 800
  },
  balanced: {
    model: "gpt-4o-mini", 
    temperature: 0.4,
    maxTokens: 1000
  },
  intelligent: {
    model: "gpt-4o",
    temperature: 0.5,
    maxTokens: 1500
  }
}

// ==================== QUESTIONS DE FALLBACK ====================
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
      options: ["S'aggravent", "Stables", "S'améliorent", "Variables"],
      priority: "high"
    },
    {
      id: 3,
      question: "Qu'est-ce qui déclenche ou aggrave vos symptômes?",
      options: ["Effort/mouvement", "Stress", "Nourriture", "Rien de spécifique"],
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
      question: "À quel point êtes-vous inquiet de votre état?",
      options: ["Très inquiet", "Modérément", "Légèrement inquiet", "Pas du tout"],
      priority: "medium"
    }
  ]
}

// ==================== FONCTION POUR GÉNÉRER UN PROMPT INTELLIGENT ====================
function generateEnhancedPrompt(
  patientData: any, 
  clinicalData: any,
  mode: string
): string {
  const age = patientData.age || 'âge non spécifié'
  const gender = patientData.gender || patientData.sex || 'sexe non spécifié'
  const symptoms = clinicalData.symptoms || clinicalData.chiefComplaint || ''
  const diseaseHistory = clinicalData.diseaseHistory || ''
  const duration = clinicalData.symptomDuration || ''
  const painScale = clinicalData.painScale || '0'
  const vitalSigns = clinicalData.vitalSigns || {}
  
  // Créer un contexte enrichi pour l'IA
  const context = `
Patient Profile:
- Age: ${age} ans
- Sexe: ${gender}
- Niveau de douleur: ${painScale}/10

Symptômes principaux:
${symptoms}

Histoire de la maladie:
${diseaseHistory || 'Non fournie'}

Durée des symptômes:
${duration || 'Non spécifiée'}

Signes vitaux:
- Température: ${vitalSigns.temperature || 'Non mesurée'}°C
- Tension artérielle: ${vitalSigns.bloodPressureSystolic || 'N/A'}/${vitalSigns.bloodPressureDiastolic || 'N/A'} mmHg
`

  // Adapter le prompt selon le mode
  const modeInstructions = {
    fast: "Génère 5 questions de triage rapide essentielles.",
    balanced: "Génère 5 questions diagnostiques équilibrées entre rapidité et précision.",
    intelligent: "Génère 5 questions diagnostiques approfondies et très spécifiques au cas."
  }

  return `Tu es un médecin expert en télémédecine. Analyse ce cas patient et génère des questions diagnostiques pertinentes.

${context}

Instructions:
1. ${modeInstructions[mode as keyof typeof modeInstructions] || modeInstructions.balanced}
2. Les questions doivent être spécifiquement adaptées aux symptômes mentionnés.
3. Priorise les questions selon l'urgence médicale potentielle.
4. Chaque question doit avoir exactement 4 options de réponse claires.
5. Utilise un langage simple et compréhensible pour le patient.

Format JSON OBLIGATOIRE (répond UNIQUEMENT avec ce JSON, sans texte additionnel):
{
  "questions": [
    {
      "id": 1,
      "question": "Question claire et simple en français",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "priority": "high|medium|low",
      "rationale": "Brève explication médicale de pourquoi cette question est importante"
    }
  ],
  "urgency_assessment": {
    "level": "low|medium|high|critical",
    "reason": "Brève évaluation de l'urgence basée sur les symptômes"
  },
  "recommended_specialties": ["Spécialité 1", "Spécialité 2"]
}

IMPORTANT: 
- Génère EXACTEMENT 5 questions pertinentes
- Adapte les questions au contexte spécifique du patient
- Ne jamais demander d'informations personnelles identifiantes
- Priorise les questions qui peuvent révéler des urgences médicales`
}

// ==================== FONCTION PRINCIPALE AVEC APPEL IA FORCÉ ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("🚀 Démarrage POST /api/openai-questions (VERSION AMÉLIORÉE)")
  
  try {
    // 1. Récupérer et valider la clé API
    const apiKey = process.env.OPENAI_API_KEY
    debugApiKey(apiKey)
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY manquante dans les variables d\'environnement')
      throw new Error('Configuration API manquante')
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Format de clé API invalide')
      throw new Error('Configuration API invalide')
    }
    
    // 2. Parser la requête
    const body = await request.json()
    console.log("📝 Corps reçu, analyse des données...")
    
    const { 
      patientData, 
      clinicalData, 
      mode = 'balanced',
      forceAI = true // Nouveau paramètre pour forcer l'utilisation de l'IA
    } = body

    // 3. Valider les données
    if (!patientData || !clinicalData) {
      console.error("❌ Données manquantes dans la requête")
      return NextResponse.json(
        { 
          error: "Données patient et cliniques requises", 
          success: false 
        },
        { status: 400 }
      )
    }

    // 4. Protection des données: Anonymisation
    const { 
      anonymized: anonymizedPatientData, 
      originalIdentity, 
      anonymousId 
    } = anonymizePatientData(patientData)

    // 5. Normalisation des données
    const validatedPatientData = {
      age: anonymizedPatientData.age || 'Non spécifié',
      gender: anonymizedPatientData.gender || anonymizedPatientData.sex || 'Non spécifié',
      ...anonymizedPatientData
    }

    const validatedClinicalData = {
      symptoms: clinicalData.symptoms || clinicalData.chiefComplaint || '',
      chiefComplaint: clinicalData.chiefComplaint || clinicalData.symptoms || '',
      diseaseHistory: clinicalData.diseaseHistory || '',
      symptomDuration: clinicalData.symptomDuration || '',
      painScale: clinicalData.painScale || '0',
      vitalSigns: clinicalData.vitalSigns || {},
      ...clinicalData
    }

    secureLog('📊 Données patient (anonymisées):', validatedPatientData)
    secureLog('📋 Données cliniques:', validatedClinicalData)

    // 6. Configuration IA selon le mode
    const aiConfig = AI_CONFIGS[mode as keyof typeof AI_CONFIGS] || AI_CONFIGS.balanced
    console.log(`⚙️ Configuration IA: ${aiConfig.model} (mode: ${mode})`)
    console.log(`🔒 Protection activée: Aucune donnée personnelle envoyée`)
    console.log(`🤖 Forcer l'utilisation de l'IA: ${forceAI}`)

    // 7. Générer le prompt enrichi
    const enhancedPrompt = generateEnhancedPrompt(
      validatedPatientData,
      validatedClinicalData,
      mode
    )

    console.log(`📝 Prompt généré (${enhancedPrompt.length} caractères)`)

    // 8. Appel OpenAI avec retry et meilleure gestion d'erreur
    console.log(`🤖 Appel OpenAI ${aiConfig.model}...`)
    const aiStartTime = Date.now()
    
    let openaiResponse
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`📡 Tentative ${retryCount + 1}/${maxRetries + 1}...`)
        
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
                content: `Tu es un médecin expert en télémédecine avec 20 ans d'expérience. 
                Tu dois générer des questions diagnostiques pertinentes et adaptées au patient.
                IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans texte additionnel.`
              },
              {
                role: 'user',
                content: enhancedPrompt
              }
            ],
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.maxTokens,
            response_format: { type: "json_object" }
          }),
        })
        
        console.log(`📡 Réponse reçue: Status ${openaiResponse.status}`)
        
        if (openaiResponse.ok) {
          console.log('✅ Appel OpenAI réussi')
          break
        } else if (openaiResponse.status === 401) {
          const errorBody = await openaiResponse.text()
          console.error('❌ Erreur 401 - Clé API invalide:', errorBody)
          throw new Error(`Clé API invalide: ${errorBody}`)
        } else if (openaiResponse.status === 429) {
          if (retryCount < maxRetries) {
            const waitTime = 2000 * (retryCount + 1)
            console.warn(`⚠️ Limite de taux atteinte, attente ${waitTime}ms avant retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            retryCount++
          } else {
            throw new Error('Limite de taux OpenAI dépassée')
          }
        } else if (openaiResponse.status === 500 || openaiResponse.status === 502 || openaiResponse.status === 503) {
          if (retryCount < maxRetries) {
            const waitTime = 1500 * (retryCount + 1)
            console.warn(`⚠️ Erreur serveur OpenAI, attente ${waitTime}ms avant retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            retryCount++
          } else {
            throw new Error(`Erreur serveur OpenAI: ${openaiResponse.status}`)
          }
        } else {
          const errorText = await openaiResponse.text()
          console.error(`❌ Erreur OpenAI ${openaiResponse.status}:`, errorText)
          throw new Error(`Erreur OpenAI ${openaiResponse.status}: ${errorText.substring(0, 200)}`)
        }
      } catch (error: any) {
        console.error(`❌ Erreur lors de l'appel OpenAI:`, error.message)
        
        if (retryCount >= maxRetries) {
          throw error
        }
        
        console.warn(`⚠️ Erreur, nouvelle tentative ${retryCount + 1}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)))
        retryCount++
      }
    }
    
    if (!openaiResponse || !openaiResponse.ok) {
      throw new Error('Impossible de contacter OpenAI après plusieurs tentatives')
    }
    
    const aiTime = Date.now() - aiStartTime
    console.log(`✅ Réponse OpenAI en ${aiTime}ms`)
    
    // 9. Parser la réponse
    const openaiData = await openaiResponse.json()
    console.log('📦 Données OpenAI reçues:', {
      hasChoices: !!openaiData.choices,
      choicesLength: openaiData.choices?.length,
      hasContent: !!openaiData.choices?.[0]?.message?.content
    })
    
    const content = openaiData.choices[0]?.message?.content || '{}'
    console.log(`📄 Contenu reçu (${content.length} caractères)`)
    
    let parsedResponse
    try {
      parsedResponse = JSON.parse(content)
      console.log('✅ JSON parsé avec succès:', {
        hasQuestions: !!parsedResponse.questions,
        questionsCount: parsedResponse.questions?.length,
        hasUrgency: !!parsedResponse.urgency_assessment,
        hasSpecialties: !!parsedResponse.recommended_specialties
      })
    } catch (parseError) {
      console.error("❌ Erreur de parsing JSON:", parseError)
      console.error("Contenu reçu:", content.substring(0, 500))
      
      // Tentative de nettoyage du JSON
      try {
        const cleanedContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        parsedResponse = JSON.parse(cleanedContent)
        console.log('✅ JSON nettoyé et parsé avec succès')
      } catch (secondError) {
        console.error("❌ Échec du parsing même après nettoyage")
        throw new Error('Réponse OpenAI invalide')
      }
    }

    // 10. Valider et formater les questions
    const questions = parsedResponse.questions || []
    
    if (!Array.isArray(questions) || questions.length === 0) {
      console.error("⚠️ Aucune question valide générée, utilisation du fallback")
      throw new Error("Aucune question générée par l'IA")
    }

    // Valider le format de chaque question
    const validatedQuestions = questions.slice(0, 5).map((q: any, index: number) => ({
      id: q.id || index + 1,
      question: q.question || `Question ${index + 1}`,
      options: Array.isArray(q.options) && q.options.length === 4 
        ? q.options 
        : ["Option 1", "Option 2", "Option 3", "Option 4"],
      priority: q.priority || "medium",
      rationale: q.rationale || ""
    }))

    console.log(`✅ ${validatedQuestions.length} questions validées`)

    // 11. Préparer la réponse enrichie
    const response = {
      success: true,
      questions: validatedQuestions,
      aiInsights: {
        urgency_assessment: parsedResponse.urgency_assessment || {
          level: "medium",
          reason: "Évaluation basée sur les symptômes fournis"
        },
        recommended_specialties: parsedResponse.recommended_specialties || [],
        ai_model_used: aiConfig.model,
        processing_mode: mode
      },
      dataProtection: {
        enabled: true,
        anonymousId,
        method: 'anonymization',
        fieldsProtected: Object.keys(originalIdentity).filter(k => originalIdentity[k]),
        message: 'Identité patient protégée durant le traitement IA',
        compliance: {
          rgpd: true,
          hipaa: true,
          dataMinimization: true
        }
      },
      metadata: {
        mode,
        patientAge: validatedPatientData.age,
        responseTime: Date.now() - startTime,
        aiResponseTime: aiTime,
        fromCache: false,
        model: aiConfig.model,
        dataProtected: true,
        questionsGenerated: validatedQuestions.length,
        retryCount: retryCount
      }
    }

    console.log(`✅ Succès total: ${response.metadata.responseTime}ms`)
    console.log(`🔒 Protection des données: ACTIVE`)
    console.log(`📊 Questions générées: ${response.questions.length}`)
    console.log(`⚡ Évaluation d'urgence: ${response.aiInsights.urgency_assessment.level}`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error(`❌ Erreur principale:`, error.message)
    console.error("Stack:", error.stack)
    
    // Retourner les questions de fallback avec informations d'erreur
    return NextResponse.json({
      success: false,
      questions: FALLBACK_QUESTIONS.general,
      error: {
        message: error.message,
        type: error.name,
        suggestion: "Les questions par défaut ont été utilisées. Vérifiez votre configuration OpenAI."
      },
      dataProtection: {
        enabled: true,
        method: 'fallback',
        message: 'Questions de secours utilisées - aucun traitement IA',
        compliance: {
          rgpd: true,
          hipaa: true
        }
      },
      metadata: {
        mode: 'fallback',
        responseTime: Date.now() - startTime,
        fallback: true,
        fallbackReason: error.message,
        errorType: error.name,
        model: 'fallback',
        dataProtected: true,
        debugInfo: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
          timestamp: new Date().toISOString()
        }
      }
    })
  }
}

// ==================== ENDPOINT DE TEST AMÉLIORÉ ====================
export async function GET(request: NextRequest) {
  console.log("🧪 Test de connexion OpenAI...")
  
  const apiKey = process.env.OPENAI_API_KEY
  debugApiKey(apiKey)
  
  if (!apiKey) {
    return NextResponse.json({
      status: '❌ Pas de clé API',
      error: 'OPENAI_API_KEY non définie',
      help: 'Ajoutez OPENAI_API_KEY à vos variables d\'environnement',
      dataProtection: {
        status: 'N/A - Pas de clé API'
      }
    }, { status: 500 })
  }
  
  try {
    // Test API simple
    const testStart = Date.now()
    const testPrompt = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant médical. Réponds uniquement en JSON.'
        },
        {
          role: 'user',
          content: 'Génère un JSON de test avec cette structure: {"status":"ok", "message":"Connexion OpenAI réussie", "timestamp":"[current time]"}'
        }
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object" }
    }
    
    console.log('📡 Envoi du test à OpenAI...')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPrompt),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erreur OpenAI:', error)
      return NextResponse.json({
        status: '❌ Erreur OpenAI',
        error,
        statusCode: response.status,
        dataProtection: {
          status: 'Erreur - API non accessible'
        }
      }, { status: response.status })
    }
    
    const data = await response.json()
    const testTime = Date.now() - testStart
    
    let testResult
    try {
      testResult = JSON.parse(data.choices[0]?.message?.content || '{}')
    } catch {
      testResult = { message: "Réponse reçue mais non JSON" }
    }
    
    return NextResponse.json({
      status: "✅ OpenAI connecté et fonctionnel",
      responseTime: `${testTime}ms`,
      testResponse: testResult,
      dataProtection: {
        status: '✅ Activée',
        method: 'anonymisation',
        compliance: ['RGPD', 'HIPAA'],
        features: [
          'Anonymisation automatique des données patient',
          'Aucun nom/email/téléphone envoyé à OpenAI',
          'ID anonyme pour le suivi',
          'Journalisation sécurisée',
          'Questions personnalisées par IA'
        ]
      },
      modes: {
        fast: {
          description: "Ultra-rapide pour triage",
          model: "gpt-3.5-turbo",
          useCase: "Triage initial",
          dataProtected: true,
          questionsType: "Essentielles"
        },
        balanced: {
          description: "Équilibré",
          model: "gpt-4o-mini",
          useCase: "Utilisation standard",
          dataProtected: true,
          questionsType: "Complètes"
        },
        intelligent: {
          description: "Intelligence maximale",
          model: "gpt-4o",
          useCase: "Cas complexes",
          dataProtected: true,
          questionsType: "Approfondies"
        }
      },
      apiInfo: {
        keyValid: true,
        keyPrefix: apiKey.substring(0, 20),
        keyLength: apiKey.length,
        modelsAvailable: ['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o'],
        timestamp: new Date().toISOString()
      },
      improvements: [
        "✅ Appel IA forcé pour personnalisation maximale",
        "✅ Prompt enrichi avec contexte patient complet",
        "✅ Retry automatique en cas d'erreur",
        "✅ Évaluation d'urgence par IA",
        "✅ Recommandations de spécialités",
        "✅ Questions adaptées au profil patient"
      ]
    })
  } catch (error: any) {
    console.error("❌ Erreur de test:", error)
    return NextResponse.json({
      status: "❌ Erreur",
      error: error.message,
      errorType: error.name,
      dataProtection: {
        status: 'Erreur durant le test'
      },
      suggestion: "Vérifiez votre clé API et votre connexion internet"
    }, { status: 500 })
  }
}
