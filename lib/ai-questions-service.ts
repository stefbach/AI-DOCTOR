// lib/ai-questions-service.ts - Service pour l'appel API Questions IA

interface PatientData {
  firstName?: string
  lastName?: string
  age?: string | number
  gender?: string
  weight?: string | number
  height?: string | number
  allergies?: string[]
  medicalHistory?: string[]
  currentMedicationsText?: string
  lifeHabits?: {
    smoking?: string
    alcohol?: string
    physicalActivity?: string
  }
}

interface ClinicalData {
  chiefComplaint?: string
  diseaseHistory?: string
  symptomDuration?: string
  symptoms?: string[]
  painScale?: string | number
  vitalSigns?: {
    temperature?: string
    bloodPressureSystolic?: string
    bloodPressureDiastolic?: string
  }
}

interface AIQuestion {
  id: number
  question: string
  options: string[]
  priority: 'high' | 'medium' | 'low'
  rationale?: string
}

interface AIInsights {
  urgency_assessment?: {
    level: 'low' | 'medium' | 'high' | 'critical'
    reason: string
  }
  recommended_specialties?: string[]
  ai_model_used?: string
  processing_mode?: string
}

interface AIQuestionsResponse {
  success: boolean
  questions: AIQuestion[]
  aiInsights?: AIInsights
  dataProtection?: any
  metadata?: any
  error?: {
    message: string
    type: string
    suggestion: string
  }
}

export type AIMode = 'fast' | 'balanced' | 'intelligent'

class AIQuestionsService {
  private readonly apiEndpoint = '/api/openai-questions'
  private readonly maxRetries = 3
  private readonly retryDelay = 2000

  /**
   * Obtenir des questions diagnostiques personnalisées de l'IA
   */
  async getAIQuestions(
    patientData: PatientData,
    clinicalData: ClinicalData,
    mode: AIMode = 'balanced',
    forceAI: boolean = true
  ): Promise<AIQuestionsResponse> {
    console.log('🤖 AI Questions Service: Début de la requête')
    console.log('📋 Mode:', mode)
    console.log('🔄 Force AI:', forceAI)

    // Validation des données minimales
    if (!this.validateMinimalData(patientData, clinicalData)) {
      console.error('❌ Données insuffisantes pour générer des questions')
      return {
        success: false,
        questions: this.getDefaultQuestions(),
        error: {
          message: 'Données patient ou cliniques insuffisantes',
          type: 'ValidationError',
          suggestion: 'Veuillez remplir au minimum l\'âge, le sexe et les symptômes principaux'
        }
      }
    }

    // Préparer les données pour l'envoi
    const requestData = this.prepareRequestData(patientData, clinicalData, mode, forceAI)
    
    // Appel API avec retry
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📡 Tentative ${attempt}/${this.maxRetries}...`)
        
        const response = await this.makeAPICall(requestData)
        
        if (response.success) {
          console.log('✅ Questions IA obtenues avec succès')
          this.logAIInsights(response)
          return response
        } else {
          console.warn('⚠️ Réponse non réussie:', response.error)
          lastError = new Error(response.error?.message || 'Échec de génération des questions')
        }
        
      } catch (error) {
        console.error(`❌ Erreur tentative ${attempt}:`, error)
        lastError = error as Error
        
        if (attempt < this.maxRetries) {
          console.log(`⏳ Attente ${this.retryDelay}ms avant nouvelle tentative...`)
          await this.delay(this.retryDelay * attempt)
        }
      }
    }

    // Si toutes les tentatives échouent, retourner les questions par défaut
    console.error('❌ Toutes les tentatives ont échoué, utilisation des questions par défaut')
    
    return {
      success: false,
      questions: this.getDefaultQuestions(),
      error: {
        message: lastError?.message || 'Impossible de générer des questions personnalisées',
        type: 'APIError',
        suggestion: 'Les questions standard ont été utilisées. L\'IA sera disponible lors de votre prochaine consultation.'
      }
    }
  }

  /**
   * Faire l'appel API réel
   */
  private async makeAPICall(requestData: any): Promise<AIQuestionsResponse> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur HTTP:', response.status, errorText)
      
      // Essayer de parser l'erreur JSON si possible
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.questions && Array.isArray(errorJson.questions)) {
          // L'API a retourné des questions de fallback
          return errorJson
        }
        throw new Error(errorJson.error || `HTTP ${response.status}`)
      } catch {
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`)
      }
    }

    const data = await response.json()
    
    // Valider la structure de la réponse
    if (!this.validateResponse(data)) {
      console.warn('⚠️ Structure de réponse invalide:', data)
      throw new Error('Structure de réponse invalide')
    }

    return data
  }

  /**
   * Valider les données minimales requises
   */
  private validateMinimalData(patientData: PatientData, clinicalData: ClinicalData): boolean {
    // Au minimum, on a besoin de l'âge et des symptômes
    const hasAge = patientData.age && patientData.age !== ''
    const hasSymptoms = 
      (clinicalData.symptoms && clinicalData.symptoms.length > 0) ||
      (clinicalData.chiefComplaint && clinicalData.chiefComplaint.trim() !== '')
    
    return !!(hasAge && hasSymptoms)
  }

  /**
   * Préparer les données pour l'envoi à l'API
   */
  private prepareRequestData(
    patientData: PatientData,
    clinicalData: ClinicalData,
    mode: AIMode,
    forceAI: boolean
  ): any {
    // Nettoyer et préparer les données patient
    const cleanedPatientData = {
      ...patientData,
      age: patientData.age || 'Non spécifié',
      gender: patientData.gender || 'Non spécifié',
      weight: patientData.weight || '',
      height: patientData.height || '',
    }

    // Préparer les données cliniques avec tous les détails
    const enrichedClinicalData = {
      ...clinicalData,
      chiefComplaint: clinicalData.chiefComplaint || '',
      diseaseHistory: clinicalData.diseaseHistory || '',
      symptomDuration: clinicalData.symptomDuration || '',
      symptoms: clinicalData.symptoms || [],
      painScale: clinicalData.painScale || '0',
      vitalSigns: clinicalData.vitalSigns || {},
    }

    console.log('📊 Données préparées:', {
      patientAge: cleanedPatientData.age,
      symptomsCount: enrichedClinicalData.symptoms.length,
      hasChiefComplaint: !!enrichedClinicalData.chiefComplaint,
      painLevel: enrichedClinicalData.painScale,
      mode: mode,
      forceAI: forceAI
    })

    return {
      patientData: cleanedPatientData,
      clinicalData: enrichedClinicalData,
      mode: mode,
      forceAI: forceAI
    }
  }

  /**
   * Valider la structure de la réponse
   */
  private validateResponse(data: any): boolean {
    return !!(
      data &&
      Array.isArray(data.questions) &&
      data.questions.length > 0 &&
      data.questions.every((q: any) => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length > 0
      )
    )
  }

  /**
   * Logger les insights de l'IA
   */
  private logAIInsights(response: AIQuestionsResponse): void {
    if (response.aiInsights) {
      console.log('🔍 Insights IA:')
      
      if (response.aiInsights.urgency_assessment) {
        const urgency = response.aiInsights.urgency_assessment
        const urgencyEmoji = {
          low: '🟢',
          medium: '🟡',
          high: '🟠',
          critical: '🔴'
        }
        console.log(`${urgencyEmoji[urgency.level]} Urgence: ${urgency.level} - ${urgency.reason}`)
      }
      
      if (response.aiInsights.recommended_specialties?.length) {
        console.log('👨‍⚕️ Spécialités recommandées:', response.aiInsights.recommended_specialties.join(', '))
      }
      
      if (response.aiInsights.ai_model_used) {
        console.log('🤖 Modèle utilisé:', response.aiInsights.ai_model_used)
      }
    }

    if (response.metadata) {
      console.log('📊 Métadonnées:', {
        tempsRéponse: `${response.metadata.responseTime}ms`,
        tempsIA: `${response.metadata.aiResponseTime}ms`,
        questionsGénérées: response.metadata.questionsGenerated,
        mode: response.metadata.mode
      })
    }
  }

  /**
   * Obtenir les questions par défaut en cas d'échec
   */
  private getDefaultQuestions(): AIQuestion[] {
    return [
      {
        id: 1,
        question: "Depuis combien de temps avez-vous ces symptômes?",
        options: [
          "Moins de 24 heures",
          "2 à 7 jours",
          "1 à 4 semaines",
          "Plus d'un mois"
        ],
        priority: "high"
      },
      {
        id: 2,
        question: "Comment vos symptômes évoluent-ils?",
        options: [
          "Ils s'aggravent",
          "Ils restent stables",
          "Ils s'améliorent",
          "Ils varient dans la journée"
        ],
        priority: "high"
      },
      {
        id: 3,
        question: "Avez-vous de la fièvre?",
        options: [
          "Oui, mesurée > 38°C",
          "Je me sens fiévreux mais n'ai pas mesuré",
          "Non",
          "Je ne sais pas"
        ],
        priority: "high"
      },
      {
        id: 4,
        question: "Avez-vous des difficultés respiratoires?",
        options: [
          "Oui, au repos",
          "Oui, à l'effort",
          "Non",
          "Légère gêne occasionnelle"
        ],
        priority: "high"
      },
      {
        id: 5,
        question: "Avez-vous consulté pour ces symptômes récemment?",
        options: [
          "Non, première consultation",
          "Oui, il y a moins d'une semaine",
          "Oui, il y a plus d'une semaine",
          "J'ai été aux urgences"
        ],
        priority: "medium"
      }
    ]
  }

  /**
   * Utilitaire de délai
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Tester la connexion à l'API
   */
  async testConnection(): Promise<{
    connected: boolean
    details?: any
    error?: string
  }> {
    try {
      console.log('🧪 Test de connexion à l\'API Questions IA...')
      
      const response = await fetch(this.apiEndpoint, {
        method: 'GET',
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          connected: false,
          error: `Erreur HTTP ${response.status}: ${error}`
        }
      }

      const data = await response.json()
      
      return {
        connected: data.status?.includes('✅') || false,
        details: data
      }
      
    } catch (error) {
      console.error('❌ Erreur de test:', error)
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }
  }
}

// Créer une instance unique du service
const aiQuestionsService = new AIQuestionsService()

export default aiQuestionsService

// Hook React pour utiliser le service facilement
export function useAIQuestions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<AIQuestion[]>([])
  const [insights, setInsights] = useState<AIInsights | null>(null)

  const fetchQuestions = async (
    patientData: PatientData,
    clinicalData: ClinicalData,
    mode: AIMode = 'balanced'
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await aiQuestionsService.getAIQuestions(
        patientData,
        clinicalData,
        mode,
        true // forceAI
      )
      
      if (response.success) {
        setQuestions(response.questions)
        setInsights(response.aiInsights || null)
      } else {
        setError(response.error?.message || 'Erreur lors de la génération des questions')
        setQuestions(response.questions) // Utiliser les questions de fallback
      }
      
      return response
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)
      setQuestions(aiQuestionsService['getDefaultQuestions']())
      
      return {
        success: false,
        questions: questions,
        error: {
          message: errorMessage,
          type: 'UnexpectedError',
          suggestion: 'Veuillez réessayer'
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    const result = await aiQuestionsService.testConnection()
    return result
  }

  return {
    questions,
    insights,
    loading,
    error,
    fetchQuestions,
    testConnection
  }
}
