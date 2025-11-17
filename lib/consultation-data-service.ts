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
  private prescriptionRenewalFlag: boolean = false // ADD THIS LINE
  
  constructor() {
    // Load existing data on startup
    this.loadFromStorage()
  }

  // Get current consultation ID
  getCurrentConsultationId(): string | null {
    if (!this.currentConsultationId) {
      // Generate a new ID if necessary
      this.currentConsultationId = `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    return this.currentConsultationId
  }

  // Set current consultation ID
  setCurrentConsultationId(id: string): void {
    this.currentConsultationId = id
    console.log(`📋 Consultation ID set: ${id}`)
  }

  // ADD THESE NEW METHODS AFTER setCurrentConsultationId
  // Set prescription renewal flag
  setPrescriptionRenewalFlag(isRenewal: boolean): void {
    this.prescriptionRenewalFlag = isRenewal
    console.log(`💊 Prescription renewal flag set to: ${isRenewal}`)
    
    // Store in sessionStorage as well for persistence
    if (isRenewal) {
      sessionStorage.setItem('prescriptionRenewal', 'true')
    } else {
      sessionStorage.removeItem('prescriptionRenewal')
    }
  }

  // Check if current consultation is prescription renewal
  isPrescriptionRenewal(): boolean {
    // Check both flag and session storage
    return this.prescriptionRenewalFlag || sessionStorage.getItem('prescriptionRenewal') === 'true'
  }

  // Clear renewal flag
  clearRenewalFlag(): void {
    this.prescriptionRenewalFlag = false
    sessionStorage.removeItem('prescriptionRenewal')
  }
  // END OF NEW METHODS

  // Save step data
  async saveStepData(step: number, data: any): Promise<void> {
    const consultationData: ConsultationData = {
      step,
      data,
      timestamp: new Date()
    }
    
    this.currentConsultation.set(step, consultationData)
    await this.persistToStorage()
    
    console.log(`✅ Data saved for step ${step}`)
  }

  // Retrieve step data
  getStepData(step: number): any {
    const consultationData = this.currentConsultation.get(step)
    return consultationData?.data || null
  }

  // Get all consultation data
  getAllData(): Record<string, any> {
    const allData: Record<string, any> = {}

    // Map steps to data names
    const stepMapping: Record<number, string> = {
      0: 'patientData',
      1: 'clinicalData',
      2: 'questionsData',
      3: 'diagnosisData',
      4: 'reportData'
    }
    
    this.currentConsultation.forEach((consultationData, step) => {
      const dataKey = stepMapping[step] || `step${step}`
      allData[dataKey] = consultationData.data
    })
    
    return allData
  }

  // Mark consultation as complete
  async markConsultationComplete(): Promise<void> {
    const allData = this.getAllData()
    
    // Save with completion timestamp
    const completedConsultation = {
      id: this.getCurrentConsultationId(),
      ...allData,
      completedAt: new Date().toISOString(),
      status: 'completed'
    }
    
    // Save to history
    await this.saveToHistory(completedConsultation)
    
    // Clear current consultation
    await this.clearCurrentConsultation()
    
    console.log('✅ Consultation marked as complete and archived')
  }

  // Save to consultation history
  private async saveToHistory(consultation: any): Promise<void> {
    const historyKey = 'mauritius_medical_consultation_history'
    
    try {
      // Retrieve existing history
      const existingHistory = localStorage.getItem(historyKey)
      const history = existingHistory ? JSON.parse(existingHistory) : []
      
      // Add new consultation (it already has an ID)
      history.push(consultation)
      
      // Limit history to last 50 consultations
      if (history.length > 50) {
        history.splice(0, history.length - 50)
      }
      
      // Save
      localStorage.setItem(historyKey, JSON.stringify(history))
      
      console.log(`📋 Consultation ${consultation.id} added to history (${history.length} consultations total)`)
    } catch (error) {
      console.error('Error saving to history:', error)
    }
  }

  // Clear current consultation
  async clearCurrentConsultation(): Promise<void> {
    this.currentConsultation.clear()
    this.currentConsultationId = null
    this.clearRenewalFlag() // ADD THIS LINE - Reset renewal flag when clearing
    localStorage.removeItem(this.storageKey)
    console.log('🧹 Current consultation cleared')
  }

  // Check if a step is completed
  isStepCompleted(step: number): boolean {
    return this.currentConsultation.has(step)
  }

  // Get progress status
  getProgress(): {
    currentStep: number
    completedSteps: number[]
    totalSteps: number
    percentage: number
  } {
    const completedSteps = Array.from(this.currentConsultation.keys()).sort()
    const currentStep = completedSteps.length > 0 ? Math.max(...completedSteps) + 1 : 0
    const totalSteps = 5 // Total number of steps (0-4)
    const percentage = (completedSteps.length / totalSteps) * 100

    return {
      currentStep,
      completedSteps,
      totalSteps,
      percentage
    }
  }

  // Persist data to localStorage
  private async persistToStorage(): Promise<void> {
    try {
      const dataToStore = {
        consultationId: this.currentConsultationId,
        consultationData: Array.from(this.currentConsultation.entries()),
        lastUpdated: new Date().toISOString()
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore))
    } catch (error) {
      console.error('Error saving:', error)
      
      // If localStorage is full, try to clean up
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.log('⚠️ localStorage full, cleaning up...')
        this.cleanupOldData()
        
        // Retry
        try {
          const dataToStore = {
            consultationId: this.currentConsultationId,
            consultationData: Array.from(this.currentConsultation.entries()),
            lastUpdated: new Date().toISOString()
          }
          localStorage.setItem(this.storageKey, JSON.stringify(dataToStore))
        } catch (retryError) {
          console.error('Unable to save even after cleanup:', retryError)
        }
      }
    }
  }

  // Load data from localStorage
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.storageKey)
      
      if (storedData) {
        const parsed = JSON.parse(storedData)
        
        // Retrieve consultation ID
        if (parsed.consultationId) {
          this.currentConsultationId = parsed.consultationId
        }
        
        // Rebuild Map from stored data
        if (parsed.consultationData && Array.isArray(parsed.consultationData)) {
          this.currentConsultation = new Map(parsed.consultationData)
          console.log(`📂 ${this.currentConsultation.size} step(s) loaded from storage`)
          console.log(`📋 Consultation ID loaded: ${this.currentConsultationId}`)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      this.currentConsultation = new Map()
      this.currentConsultationId = null
    }
  }

  // Clean up old data
  private cleanupOldData(): void {
    try {
      // Clean history keeping only last 20 consultations
      const historyKey = 'mauritius_medical_consultation_history'
      const existingHistory = localStorage.getItem(historyKey)
      
      if (existingHistory) {
        const history = JSON.parse(existingHistory)
        if (history.length > 20) {
          const reducedHistory = history.slice(-20)
          localStorage.setItem(historyKey, JSON.stringify(reducedHistory))
          console.log(`🧹 History reduced to ${reducedHistory.length} consultations`)
        }
      }
      
      // Clean other potentially large keys
      const keysToCheck = ['medical_reports_cache', 'diagnosis_cache', 'temp_medical_data']
      keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
          console.log(`🧹 Key ${key} removed`)
        }
      })
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  // Create a new consultation
  createNewConsultation(): string {
    // Save old consultation if it exists
    if (this.currentConsultation.size > 0) {
      console.log('⚠️ Current consultation detected, auto-saving...')
      this.markConsultationComplete()
    }
    
    // Create new ID
    this.currentConsultationId = `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.currentConsultation.clear()
    
    console.log(`📋 New consultation created: ${this.currentConsultationId}`)
    return this.currentConsultationId
  }

  // ADD THIS METHOD - it's missing in the original
  private getConsultationFromHistory(consultationId: string): any {
    const historyKey = 'mauritius_medical_consultation_history'
    try {
      const existingHistory = localStorage.getItem(historyKey)
      if (existingHistory) {
        const history = JSON.parse(existingHistory)
        return history.find((consultation: any) => consultation.id === consultationId) || null
      }
    } catch (error) {
      console.error('Error retrieving consultation from history:', error)
    }
    return null
  }

  // Load consultation from history
  async loadConsultationFromHistory(consultationId: string): Promise<boolean> {
    try {
      const consultation = this.getConsultationFromHistory(consultationId)
      
      if (!consultation) {
        console.error(`❌ Consultation ${consultationId} not found in history`)
        return false
      }
      
      // Clear current consultation
      this.currentConsultation.clear()
      this.currentConsultationId = consultationId
      
      // Load data by step
      if (consultation.patientData) {
        await this.saveStepData(0, consultation.patientData)
      }
      if (consultation.clinicalData) {
        await this.saveStepData(1, consultation.clinicalData)
      }
      if (consultation.questionsData) {
        await this.saveStepData(2, consultation.questionsData)
      }
      if (consultation.diagnosisData) {
        await this.saveStepData(3, consultation.diagnosisData)
      }
      if (consultation.reportData) {
        await this.saveStepData(4, consultation.reportData)
      }
      
      console.log(`✅ Consultation ${consultationId} loaded from history`)
      return true
    } catch (error) {
      console.error('Error loading consultation:', error)
      return false
    }
  }

  // Get current consultation summary
  getConsultationSummary(): {
    id: string | null
    progress: number
    patient: string | null
    lastUpdate: Date | null
  } {
    const progress = this.getProgress()
    const patientData = this.getStepData(0)
    let lastUpdate: Date | null = null
    
    // Find last update
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

  // Export consultation data
  exportConsultationData(consultationId?: string): string {
    let dataToExport: any
    
    if (consultationId) {
      // Export specific consultation from history
      dataToExport = this.getConsultationFromHistory(consultationId)
    } else {
      // Export current consultation
      dataToExport = {
        id: this.getCurrentConsultationId(),
        ...this.getAllData(),
        exportedAt: new Date().toISOString()
      }
    }
    
    if (!dataToExport) {
      throw new Error('No data to export')
    }
    
    return JSON.stringify(dataToExport, null, 2)
  }

  // Import consultation data
  async importConsultationData(jsonData: string): Promise<void> {
    try {
      const parsedData = JSON.parse(jsonData)
      
      // Reset current consultation
      this.currentConsultation.clear()
      
      // Import data by step
      if (parsedData.patientData) {
        await this.saveStepData(0, parsedData.patientData)
      }
      if (parsedData.clinicalData) {
        await this.saveStepData(1, parsedData.clinicalData)
      }
      if (parsedData.questionsData) {
        await this.saveStepData(2, parsedData.questionsData)
      }
      if (parsedData.diagnosisData) {
        await this.saveStepData(3, parsedData.diagnosisData)
      }
      if (parsedData.reportData) {
        await this.saveStepData(4, parsedData.reportData)
      }
      
      console.log('✅ Data imported successfully')
    } catch (error) {
      console.error('Error during import:', error)
      throw new Error('Invalid data format')
    }
  }
}

// Singleton instance
const consultationDataService = new ConsultationDataService()

export { consultationDataService, type ConsultationData }
