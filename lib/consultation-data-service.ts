// lib/consultation-data-service.ts

interface ConsultationData {
  consultationId: string
  timestamp: string
  currentStep: number
  completedSteps: number[]
  patientData?: any
  clinicalData?: any
  questionsData?: any
  aiDiagnosisData?: any
  consultationReportData?: any
  treatmentData?: any
  prescriptionData?: any
}

class ConsultationDataService {
  private readonly STORAGE_KEY = 'consultation_data'
  private readonly CONSULTATION_ID_KEY = 'current_consultation_id'
  private currentConsultationId: string | null = null

  constructor() {
    // Initialiser ou récupérer l'ID de consultation au démarrage
    this.initializeConsultationId()
  }

  // Générer un ID unique sans dépendance externe
  private generateUniqueId(): string {
    // Méthode 1: Utiliser crypto.randomUUID si disponible (navigateurs modernes)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID()
    }
    
    // Méthode 2: Fallback avec timestamp et random
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 15)
    const randomStr2 = Math.random().toString(36).substring(2, 15)
    return `${timestamp}-${randomStr}-${randomStr2}`
  }

  // Initialiser l'ID de consultation
  private initializeConsultationId(): void {
    // D'abord, essayer de récupérer depuis localStorage
    const storedId = this.getStoredConsultationId()
    
    if (storedId) {
      this.currentConsultationId = storedId
      console.log('📋 Consultation ID récupéré:', storedId)
    } else {
      // Si pas d'ID, en créer un nouveau
      this.createNewConsultation()
    }
  }

  // Récupérer l'ID stocké
  private getStoredConsultationId(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(this.CONSULTATION_ID_KEY)
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID de consultation:', error)
      return null
    }
  }

  // Stocker l'ID de consultation
  private storeConsultationId(id: string): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.CONSULTATION_ID_KEY, id)
    } catch (error) {
      console.error('Erreur lors du stockage de l\'ID de consultation:', error)
    }
  }

  // Créer une nouvelle consultation
  createNewConsultation(): string {
    const newId = this.generateUniqueId()
    this.currentConsultationId = newId
    this.storeConsultationId(newId)
    
    // Initialiser les données de base
    const initialData: ConsultationData = {
      consultationId: newId,
      timestamp: new Date().toISOString(),
      currentStep: 0,
      completedSteps: []
    }
    
    this.saveAllData(initialData)
    console.log('✨ Nouvelle consultation créée:', newId)
    
    return newId
  }

  // Obtenir l'ID de consultation actuel
  getCurrentConsultationId(): string | null {
    // Si pas d'ID en mémoire, essayer de le récupérer ou en créer un
    if (!this.currentConsultationId) {
      this.initializeConsultationId()
    }
    return this.currentConsultationId
  }

  // Définir un ID de consultation spécifique
  setConsultationId(id: string): void {
    this.currentConsultationId = id
    this.storeConsultationId(id)
    console.log('📋 Consultation ID défini:', id)
  }

  // Charger les données d'une consultation
  async loadConsultation(consultationId: string): Promise<ConsultationData | null> {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${consultationId}`)
      if (stored) {
        const data = JSON.parse(stored)
        this.currentConsultationId = consultationId
        this.storeConsultationId(consultationId)
        console.log('📂 Consultation chargée:', consultationId)
        return data
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la consultation:', error)
    }
    
    return null
  }

  // Sauvegarder toutes les données
  async saveAllData(data: Partial<ConsultationData>): Promise<void> {
    if (typeof window === 'undefined') return
    
    // S'assurer qu'on a un ID de consultation
    const consultationId = this.currentConsultationId || this.createNewConsultation()
    
    try {
      // Récupérer les données existantes
      const existingData = await this.getAllData() || {}
      
      // Fusionner avec les nouvelles données
      const updatedData: ConsultationData = {
        ...existingData,
        ...data,
        consultationId,
        timestamp: new Date().toISOString()
      }
      
      // Sauvegarder
      localStorage.setItem(
        `${this.STORAGE_KEY}_${consultationId}`,
        JSON.stringify(updatedData)
      )
      
      console.log('💾 Données sauvegardées pour consultation:', consultationId)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      throw error
    }
  }

  // Sauvegarder les données d'une étape spécifique
  async saveStepData(step: number, data: any): Promise<void> {
    const stepDataMap: { [key: number]: keyof ConsultationData } = {
      0: 'patientData',
      1: 'clinicalData',
      2: 'questionsData',
      3: 'aiDiagnosisData',
      4: 'consultationReportData',
      5: 'treatmentData',
      6: 'prescriptionData'
    }
    
    const dataKey = stepDataMap[step]
    if (!dataKey) {
      console.error('Étape invalide:', step)
      return
    }
    
    await this.saveAllData({ [dataKey]: data })
    await this.updateProgress(step)
  }

  // Mettre à jour la progression
  async updateProgress(completedStep: number): Promise<void> {
    const currentData = await this.getAllData() || {}
    const completedSteps = currentData.completedSteps || []
    
    if (!completedSteps.includes(completedStep)) {
      completedSteps.push(completedStep)
    }
    
    await this.saveAllData({
      currentStep: completedStep + 1,
      completedSteps
    })
  }

  // Récupérer toutes les données
  async getAllData(): Promise<ConsultationData | null> {
    if (typeof window === 'undefined') return null
    
    const consultationId = this.getCurrentConsultationId()
    if (!consultationId) {
      console.warn('⚠️ Pas d\'ID de consultation disponible')
      return null
    }
    
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${consultationId}`)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error)
      return null
    }
  }

  // Récupérer les données d'une étape
  async getStepData(step: number): Promise<any> {
    const allData = await this.getAllData()
    if (!allData) return null
    
    const stepDataMap: { [key: number]: keyof ConsultationData } = {
      0: 'patientData',
      1: 'clinicalData',
      2: 'questionsData',
      3: 'aiDiagnosisData',
      4: 'consultationReportData',
      5: 'treatmentData',
      6: 'prescriptionData'
    }
    
    const dataKey = stepDataMap[step]
    return dataKey ? allData[dataKey] : null
  }

  // Réinitialiser la consultation actuelle
  clearCurrentConsultation(): void {
    if (typeof window === 'undefined') return
    
    try {
      // Supprimer l'ID de consultation actuel
      localStorage.removeItem(this.CONSULTATION_ID_KEY)
      
      // Supprimer les données de la consultation si elle existe
      if (this.currentConsultationId) {
        localStorage.removeItem(`${this.STORAGE_KEY}_${this.currentConsultationId}`)
      }
      
      // Réinitialiser l'ID en mémoire
      this.currentConsultationId = null
      
      console.log('🗑️ Consultation réinitialisée')
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error)
    }
  }

  // Lister toutes les consultations
  getAllConsultations(): string[] {
    if (typeof window === 'undefined') return []
    
    const consultations: string[] = []
    const prefix = `${this.STORAGE_KEY}_`
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          const consultationId = key.replace(prefix, '')
          consultations.push(consultationId)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des consultations:', error)
    }
    
    return consultations
  }

  // Supprimer une consultation
  deleteConsultation(consultationId: string): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${consultationId}`)
      
      // Si c'est la consultation actuelle, réinitialiser
      if (this.currentConsultationId === consultationId) {
        this.clearCurrentConsultation()
      }
      
      console.log('🗑️ Consultation supprimée:', consultationId)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  // Exporter les données d'une consultation
  async exportConsultation(consultationId?: string): Promise<string> {
    const id = consultationId || this.getCurrentConsultationId()
    if (!id) throw new Error('Aucune consultation à exporter')
    
    const data = await this.loadConsultation(id)
    if (!data) throw new Error('Données de consultation non trouvées')
    
    return JSON.stringify(data, null, 2)
  }

  // Importer des données de consultation
  async importConsultation(jsonData: string): Promise<string> {
    try {
      const data = JSON.parse(jsonData) as ConsultationData
      
      // Valider que c'est bien des données de consultation
      if (!data.consultationId || !data.timestamp) {
        throw new Error('Format de données invalide')
      }
      
      // Sauvegarder les données
      const consultationId = data.consultationId
      this.setConsultationId(consultationId)
      await this.saveAllData(data)
      
      return consultationId
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      throw new Error('Impossible d\'importer les données')
    }
  }
}

// Export d'une instance unique (singleton)
export const consultationDataService = new ConsultationDataService()

// Export du type pour TypeScript
export type { ConsultationData }
