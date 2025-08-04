// lib/consultation-data-service.ts

interface ConsultationData {
  step: number
  data: any
  timestamp: Date
  completed?: boolean
}

class ConsultationDataService {
  private storageKey = 'mauritius_medical_consultation'
  private currentConsultation: Map<number, ConsultationData> = new Map()
  private currentConsultationId: string | null = null
  
  constructor() {
    // Charger les données existantes au démarrage
    this.loadFromStorage()
  }

  // Obtenir l'ID de la consultation en cours
  getCurrentConsultationId(): string | null {
    if (!this.currentConsultationId) {
      // Générer un nouvel ID si nécessaire
      this.currentConsultationId = `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    return this.currentConsultationId
  }

  // Définir l'ID de la consultation en cours
  setCurrentConsultationId(id: string): void {
    this.currentConsultationId = id
    console.log(`📋 ID de consultation défini: ${id}`)
  }

  // Sauvegarder les données d'une étape
  async saveStepData(step: number, data: any): Promise<void> {
    const consultationData: ConsultationData = {
      step,
      data,
      timestamp: new Date()
    }
    
    this.currentConsultation.set(step, consultationData)
    await this.persistToStorage()
    
    console.log(`✅ Données sauvegardées pour l'étape ${step}`)
  }

  // Récupérer les données d'une étape
  getStepData(step: number): any {
    const consultationData = this.currentConsultation.get(step)
    return consultationData?.data || null
  }

  // Récupérer toutes les données de la consultation
  getAllData(): Record<string, any> {
    const allData: Record<string, any> = {}
    
    // Mapper les étapes aux noms de données
    const stepMapping: Record<number, string> = {
      1: 'patientData',
      2: 'clinicalData',
      3: 'diagnosisData',
      4: 'reportData'
    }
    
    this.currentConsultation.forEach((consultationData, step) => {
      const dataKey = stepMapping[step] || `step${step}`
      allData[dataKey] = consultationData.data
    })
    
    return allData
  }

  // Marquer la consultation comme complète
  async markConsultationComplete(): Promise<void> {
    const allData = this.getAllData()
    
    // Sauvegarder avec un timestamp de complétion
    const completedConsultation = {
      id: this.getCurrentConsultationId(),
      ...allData,
      completedAt: new Date().toISOString(),
      status: 'completed'
    }
    
    // Sauvegarder dans l'historique
    await this.saveToHistory(completedConsultation)
    
    // Nettoyer la consultation en cours
    await this.clearCurrentConsultation()
    
    console.log('✅ Consultation marquée comme complète et archivée')
  }

  // Sauvegarder dans l'historique des consultations
  private async saveToHistory(consultation: any): Promise<void> {
    const historyKey = 'mauritius_medical_consultation_history'
    
    try {
      // Récupérer l'historique existant
      const existingHistory = localStorage.getItem(historyKey)
      const history = existingHistory ? JSON.parse(existingHistory) : []
      
      // Ajouter la nouvelle consultation (elle a déjà un ID)
      history.push(consultation)
      
      // Limiter l'historique aux 50 dernières consultations
      if (history.length > 50) {
        history.splice(0, history.length - 50)
      }
      
      // Sauvegarder
      localStorage.setItem(historyKey, JSON.stringify(history))
      
      console.log(`📋 Consultation ${consultation.id} ajoutée à l'historique (${history.length} consultations au total)`)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans l\'historique:', error)
    }
  }

  // Nettoyer la consultation en cours
  async clearCurrentConsultation(): Promise<void> {
    this.currentConsultation.clear()
    this.currentConsultationId = null
    localStorage.removeItem(this.storageKey)
    console.log('🧹 Consultation en cours nettoyée')
  }

  // Vérifier si une étape est complétée
  isStepCompleted(step: number): boolean {
    return this.currentConsultation.has(step)
  }

  // Obtenir l'état de progression
  getProgress(): {
    currentStep: number
    completedSteps: number[]
    totalSteps: number
    percentage: number
  } {
    const completedSteps = Array.from(this.currentConsultation.keys()).sort()
    const currentStep = completedSteps.length > 0 ? Math.max(...completedSteps) + 1 : 1
    const totalSteps = 4 // Nombre total d'étapes
    const percentage = (completedSteps.length / totalSteps) * 100

    return {
      currentStep,
      completedSteps,
      totalSteps,
      percentage
    }
  }

  // Persister les données dans le localStorage
  private async persistToStorage(): Promise<void> {
    try {
      const dataToStore = {
        consultationId: this.currentConsultationId,
        consultationData: Array.from(this.currentConsultation.entries()),
        lastUpdated: new Date().toISOString()
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore))
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      
      // Si le localStorage est plein, essayer de nettoyer
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.log('⚠️ localStorage plein, nettoyage en cours...')
        this.cleanupOldData()
        
        // Réessayer
        try {
          const dataToStore = {
            consultationId: this.currentConsultationId,
            consultationData: Array.from(this.currentConsultation.entries()),
            lastUpdated: new Date().toISOString()
          }
          localStorage.setItem(this.storageKey, JSON.stringify(dataToStore))
        } catch (retryError) {
          console.error('Impossible de sauvegarder même après nettoyage:', retryError)
        }
      }
    }
  }

  // Charger les données depuis le localStorage
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.storageKey)
      
      if (storedData) {
        const parsed = JSON.parse(storedData)
        
        // Récupérer l'ID de consultation
        if (parsed.consultationId) {
          this.currentConsultationId = parsed.consultationId
        }
        
        // Reconstruire la Map depuis les données stockées
        if (parsed.consultationData && Array.isArray(parsed.consultationData)) {
          this.currentConsultation = new Map(parsed.consultationData)
          console.log(`📂 ${this.currentConsultation.size} étape(s) chargée(s) depuis le stockage`)
          console.log(`📋 ID de consultation chargé: ${this.currentConsultationId}`)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      this.currentConsultation = new Map()
      this.currentConsultationId = null
    }
  }

  // Nettoyer les anciennes données
  private cleanupOldData(): void {
    try {
      // Nettoyer l'historique en gardant seulement les 20 dernières consultations
      const historyKey = 'mauritius_medical_consultation_history'
      const existingHistory = localStorage.getItem(historyKey)
      
      if (existingHistory) {
        const history = JSON.parse(existingHistory)
        if (history.length > 20) {
          const reducedHistory = history.slice(-20)
          localStorage.setItem(historyKey, JSON.stringify(reducedHistory))
          console.log(`🧹 Historique réduit à ${reducedHistory.length} consultations`)
        }
      }
      
      // Nettoyer d'autres clés potentiellement volumineuses
      const keysToCheck = ['medical_reports_cache', 'diagnosis_cache', 'temp_medical_data']
      keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
          console.log(`🧹 Clé ${key} supprimée`)
        }
      })
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error)
    }
  }

  // Créer une nouvelle consultation
  createNewConsultation(): string {
    // Sauvegarder l'ancienne consultation si elle existe
    if (this.currentConsultation.size > 0) {
      console.log('⚠️ Consultation en cours détectée, sauvegarde automatique...')
      this.markConsultationComplete()
    }
    
    // Créer un nouvel ID
    this.currentConsultationId = `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.currentConsultation.clear()
    
    console.log(`📋 Nouvelle consultation créée: ${this.currentConsultationId}`)
    return this.currentConsultationId
  }

  // Charger une consultation depuis l'historique
  async loadConsultationFromHistory(consultationId: string): Promise<boolean> {
    try {
      const consultation = this.getConsultationFromHistory(consultationId)
      
      if (!consultation) {
        console.error(`❌ Consultation ${consultationId} non trouvée dans l'historique`)
        return false
      }
      
      // Nettoyer la consultation actuelle
      this.currentConsultation.clear()
      this.currentConsultationId = consultationId
      
      // Charger les données par étape
      if (consultation.patientData) {
        await this.saveStepData(1, consultation.patientData)
      }
      if (consultation.clinicalData) {
        await this.saveStepData(2, consultation.clinicalData)
      }
      if (consultation.diagnosisData) {
        await this.saveStepData(3, consultation.diagnosisData)
      }
      if (consultation.reportData) {
        await this.saveStepData(4, consultation.reportData)
      }
      
      console.log(`✅ Consultation ${consultationId} chargée depuis l'historique`)
      return true
    } catch (error) {
      console.error('Erreur lors du chargement de la consultation:', error)
      return false
    }
  }

  // Obtenir un résumé de la consultation en cours
  getConsultationSummary(): {
    id: string | null
    progress: number
    patient: string | null
    lastUpdate: Date | null
  } {
    const progress = this.getProgress()
    const patientData = this.getStepData(1)
    let lastUpdate: Date | null = null
    
    // Trouver la dernière mise à jour
    this.currentConsultation.forEach((data) => {
      if (!lastUpdate || data.timestamp > lastUpdate) {
        lastUpdate = data.timestamp
      }
    })
    
    return {
      id: this.currentConsultationId,
      progress: progress.percentage,
      patient: patientData ? `${patientData.nom || ''} ${patientData.prenom || ''}`.trim() : null,
      lastUpdate
    }
  }

  // Exporter les données de consultation
  exportConsultationData(consultationId?: string): string {
    let dataToExport: any
    
    if (consultationId) {
      // Exporter une consultation spécifique de l'historique
      dataToExport = this.getConsultationFromHistory(consultationId)
    } else {
      // Exporter la consultation en cours
      dataToExport = {
        id: this.getCurrentConsultationId(),
        ...this.getAllData(),
        exportedAt: new Date().toISOString()
      }
    }
    
    if (!dataToExport) {
      throw new Error('Aucune donnée à exporter')
    }
    
    return JSON.stringify(dataToExport, null, 2)
  }

  // Importer des données de consultation
  async importConsultationData(jsonData: string): Promise<void> {
    try {
      const parsedData = JSON.parse(jsonData)
      
      // Réinitialiser la consultation en cours
      this.currentConsultation.clear()
      
      // Importer les données par étape
      if (parsedData.patientData) {
        await this.saveStepData(1, parsedData.patientData)
      }
      if (parsedData.clinicalData) {
        await this.saveStepData(2, parsedData.clinicalData)
      }
      if (parsedData.diagnosisData) {
        await this.saveStepData(3, parsedData.diagnosisData)
      }
      if (parsedData.reportData) {
        await this.saveStepData(4, parsedData.reportData)
      }
      
      console.log('✅ Données importées avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error)
      throw new Error('Format de données invalide')
    }
  }
}

// Instance singleton
const consultationDataService = new ConsultationDataService()

export { consultationDataService, type ConsultationData }