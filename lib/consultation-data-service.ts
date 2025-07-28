// lib/consultation-data-service.ts - Version améliorée avec Cache API

import { MauritianDocumentsGenerator } from './mauritian-documents-generator'
import { supabase } from './supabase'

// Cache configuration
const CACHE_NAME = 'consultation-cache-v1'
const CACHE_EXPIRY_HOURS = 24 // Cache expires after 24 hours

interface CachedData {
  data: any
  timestamp: number
  consultationId: string
  version: string
}

class ConsultationDataService {
  private consultationId: string | null = null
  private patientId: string | null = null  
  private doctorId: string | null = null
  private currentData: Record<string, any> = {}
  private cacheAvailable: boolean = false
  
  // In-memory storage for browser compatibility
  private memoryStorage: Record<string, string> = {}
  private CONSULTATION_ID_KEY = 'tibokConsultationId'

  constructor() {
    // Check if Cache API is available
    this.checkCacheAvailability()
  }

  // Check if Cache API is available
  private async checkCacheAvailability() {
    if ('caches' in window) {
      try {
        await caches.open(CACHE_NAME)
        this.cacheAvailable = true
        console.log('✅ Cache API available')
      } catch (error) {
        console.warn('⚠️ Cache API not available:', error)
        this.cacheAvailable = false
      }
    } else {
      console.warn('⚠️ Cache API not supported')
      this.cacheAvailable = false
    }
  }

  // ✅ Safe in-memory storage operations (replacement for localStorage/sessionStorage)
  private safeMemoryStorage = {
    getItem: (key: string): string | null => {
      return this.memoryStorage[key] || null
    },
    
    setItem: (key: string, value: string): boolean => {
      this.memoryStorage[key] = value
      return true
    },
    
    removeItem: (key: string): boolean => {
      delete this.memoryStorage[key]
      return true
    }
  }

  // ✅ Cache API operations
  private async saveToCache(key: string, data: any): Promise<boolean> {
    if (!this.cacheAvailable) return false

    try {
      const cache = await caches.open(CACHE_NAME)
      
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
        consultationId: this.consultationId || '',
        version: '1.0'
      }

      const response = new Response(JSON.stringify(cachedData), {
        headers: { 'Content-Type': 'application/json' }
      })

      await cache.put(key, response)
      console.log(`✅ Data saved to cache: ${key}`)
      return true
    } catch (error) {
      console.error('❌ Error saving to cache:', error)
      return false
    }
  }

  private async getFromCache(key: string): Promise<any | null> {
    if (!this.cacheAvailable) return null

    try {
      const cache = await caches.open(CACHE_NAME)
      const response = await cache.match(key)
      
      if (!response) {
        console.log(`❌ No cache entry found for: ${key}`)
        return null
      }

      const cachedData: CachedData = await response.json()
      
      // Check if cache is expired
      const hoursOld = (Date.now() - cachedData.timestamp) / (1000 * 60 * 60)
      if (hoursOld > CACHE_EXPIRY_HOURS) {
        console.log(`⚠️ Cache expired for: ${key}`)
        await cache.delete(key)
        return null
      }

      console.log(`✅ Data retrieved from cache: ${key}`)
      return cachedData.data
    } catch (error) {
      console.error('❌ Error getting from cache:', error)
      return null
    }
  }

  private async clearCache(): Promise<boolean> {
    if (!this.cacheAvailable) return false

    try {
      await caches.delete(CACHE_NAME)
      console.log('✅ Cache cleared')
      return true
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
      return false
    }
  }

  // Initialize consultation with IDs
  async initializeConsultation(consultationId: string, patientId: string, doctorId: string) {
    this.consultationId = consultationId
    this.patientId = patientId
    this.doctorId = doctorId
    
    // Store in memory storage for persistence during session
    this.safeMemoryStorage.setItem('currentConsultationId', consultationId)
    this.safeMemoryStorage.setItem('currentPatientId', patientId)
    this.safeMemoryStorage.setItem('currentDoctorId', doctorId)
    
    console.log('✅ Consultation initialized:', { consultationId, patientId, doctorId })
    
    // Return the initialized data
    return { consultationId, patientId, doctorId }
  }

  // ✅ New method: Initialize from URL parameters
  async initializeFromURL() {
    if (typeof window === 'undefined') return null
    
    const urlParams = new URLSearchParams(window.location.search)
    const consultationId = urlParams.get('consultationId')
    const patientId = urlParams.get('patientId')
    const doctorId = urlParams.get('doctorId')
    
    console.log('Initializing from URL:', { consultationId, patientId, doctorId })
    
    // Make this optional - don't require all three
    if (consultationId && patientId && doctorId) {
      // Store in memory
      this.safeMemoryStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)
      this.safeMemoryStorage.setItem('tibokConsultationId', consultationId)
      this.safeMemoryStorage.setItem('tibokPatientId', patientId)
      this.safeMemoryStorage.setItem('tibokDoctorId', doctorId)
      
      // Initialize consultation
      return await this.initializeConsultation(consultationId, patientId, doctorId)
    }
    
    // Return null instead of failing - this is OK!
    console.log('No consultation ID in URL, starting fresh')
    return null
  }

  // Get current consultation ID with multiple fallbacks
  getCurrentConsultationId(): string | null {
    // Try memory first
    if (this.consultationId) return this.consultationId
    
    // Try URL params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlConsultationId = urlParams.get('consultationId')
      if (urlConsultationId) {
        console.log('Got consultation ID from URL:', urlConsultationId)
        // Store it for future use
        this.consultationId = urlConsultationId
        this.safeMemoryStorage.setItem(this.CONSULTATION_ID_KEY, urlConsultationId)
        this.safeMemoryStorage.setItem('tibokConsultationId', urlConsultationId)
        return urlConsultationId
      }
    }
    
    // Try memory storage
    const storedId = this.safeMemoryStorage.getItem('currentConsultationId') || 
                    this.safeMemoryStorage.getItem(this.CONSULTATION_ID_KEY) ||
                    this.safeMemoryStorage.getItem('tibokConsultationId')
    if (storedId) {
      console.log('Got consultation ID from memory:', storedId)
      this.consultationId = storedId
      return storedId
    }
    
    // Don't warn - it's OK to not have a consultation ID when starting fresh
    return null
  }

  // ✅ Enhanced data saving with cache support
  async saveStepData(step: number, data: any) {
    try {
      if (!data) {
        console.warn(`⚠️ No data provided for step ${step}`)
        return false
      }

      const stepKey = `step_${step}`
      this.currentData[stepKey] = data
      
      // Also save specific data types with validation
      if (step === 0 && data) {
        this.currentData.patientData = data
        console.log('💾 Patient data saved:', data.firstName, data.lastName)
      } else if (step === 1 && data) {
        this.currentData.clinicalData = data
        console.log('💾 Clinical data saved:', data.chiefComplaint ? 'with complaint' : 'basic')
      } else if (step === 2 && data) {
        this.currentData.questionsData = data
        console.log('💾 Questions data saved:', data.responses?.length || 0, 'responses')
      } else if (step === 3 && data) {
        this.currentData.diagnosisData = data
        console.log('💾 Diagnosis data saved:', data.diagnosis?.primary?.condition || 'unknown diagnosis')
      } else if (step === 4 && data) {
        this.currentData.workflowResult = data
        console.log('💾 Workflow result saved')
      }
      
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        // Save to memory storage
        const localKey = `consultation_${consultationId}_data`
        const serializedData = JSON.stringify(this.currentData)
        const memorySaved = this.safeMemoryStorage.setItem(localKey, serializedData)
        
        // Save to Cache API
        const cacheKey = `/api/consultation/${consultationId}/data`
        const cacheSaved = await this.saveToCache(cacheKey, this.currentData)
        
        // Save individual step to cache for quick access
        const stepCacheKey = `/api/consultation/${consultationId}/step/${step}`
        await this.saveToCache(stepCacheKey, data)
        
        if (memorySaved || cacheSaved) {
          console.log(`✅ Step ${step} data persisted (memory: ${memorySaved}, cache: ${cacheSaved})`)
        } else {
          console.warn(`⚠️ Failed to persist step ${step} data`)
        }
      }
      
      return true
    } catch (error) {
      console.error(`❌ Error saving step ${step} data:`, error)
      return false
    }
  }

  // ✅ Enhanced data loading with cache support
  async getAllData(): Promise<any> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        console.log('ℹ️ No consultation ID, returning memory data only')
        return this.currentData
      }
      
      // Try Cache API first
      const cacheKey = `/api/consultation/${consultationId}/data`
      const cachedData = await this.getFromCache(cacheKey)
      
      if (cachedData) {
        this.currentData = { ...this.currentData, ...cachedData }
        console.log('✅ Data loaded from cache:', Object.keys(cachedData))
        return this.currentData
      }
      
      // Fallback to memory storage
      const localKey = `consultation_${consultationId}_data`
      const saved = this.safeMemoryStorage.getItem(localKey)
      
      if (saved) {
        try {
          const parsedData = JSON.parse(saved)
          this.currentData = { ...this.currentData, ...parsedData }
          console.log('✅ Data loaded from memory:', Object.keys(parsedData))
          
          // Save to cache for next time
          await this.saveToCache(cacheKey, this.currentData)
        } catch (parseError) {
          console.error('❌ Error parsing saved data:', parseError)
        }
      }
      
      // Validate essential data
      const hasPatient = !!(this.currentData.patientData || this.currentData.step_0)
      const hasClinical = !!(this.currentData.clinicalData || this.currentData.step_1)
      const hasDiagnosis = !!(this.currentData.diagnosisData || this.currentData.step_3)
      
      console.log('📋 Data status:', { hasPatient, hasClinical, hasDiagnosis })
      
      return this.currentData
    } catch (error) {
      console.error('❌ Error loading all data:', error)
      return this.currentData
    }
  }

  // ✅ Get specific step data from cache
  async getStepData(step: number): Promise<any | null> {
    const consultationId = this.getCurrentConsultationId()
    if (!consultationId) return null
    
    const stepCacheKey = `/api/consultation/${consultationId}/step/${step}`
    const cachedStepData = await this.getFromCache(stepCacheKey)
    
    if (cachedStepData) {
      return cachedStepData
    }
    
    // Fallback to complete data
    const allData = await this.getAllData()
    return allData[`step_${step}`] || null
  }

  // ✅ Export all consultation data for backup
  async exportConsultationData(): Promise<Blob> {
    const allData = await this.getAllData()
    const exportData = {
      ...allData,
      exportDate: new Date().toISOString(),
      consultationId: this.getCurrentConsultationId(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    
    return blob
  }

  // ✅ Import consultation data from backup
  async importConsultationData(jsonData: string): Promise<boolean> {
    try {
      const importedData = JSON.parse(jsonData)
      
      // Validate imported data
      if (!importedData.consultationId) {
        throw new Error('Invalid consultation data: missing consultationId')
      }
      
      // Set consultation ID
      this.consultationId = importedData.consultationId
      this.safeMemoryStorage.setItem('currentConsultationId', importedData.consultationId)
      
      // Remove metadata
      delete importedData.exportDate
      delete importedData.consultationId
      delete importedData.version
      
      // Import the data
      this.currentData = importedData
      
      // Save to all storage locations
      const localKey = `consultation_${this.consultationId}_data`
      this.safeMemoryStorage.setItem(localKey, JSON.stringify(this.currentData))
      
      const cacheKey = `/api/consultation/${this.consultationId}/data`
      await this.saveToCache(cacheKey, this.currentData)
      
      console.log('✅ Consultation data imported successfully')
      return true
    } catch (error) {
      console.error('❌ Error importing consultation data:', error)
      return false
    }
  }

  // ✅ Enhanced doctor data retrieval with cache
  async getDoctorData(): Promise<any> {
    // Try cache first
    const cacheKey = '/api/doctor/current'
    const cachedDoctor = await this.getFromCache(cacheKey)
    if (cachedDoctor) {
      console.log('👨‍⚕️ Doctor data from cache')
      return cachedDoctor
    }
    
    // Try memory storage
    const memoryData = this.safeMemoryStorage.getItem('tibokDoctorData')
    if (memoryData) {
      try {
        const doctorInfo = JSON.parse(memoryData)
        console.log('👨‍⚕️ Doctor data from memory:', doctorInfo.full_name || doctorInfo.fullName)
        
        // Save to cache
        await this.saveToCache(cacheKey, doctorInfo)
        return doctorInfo
      } catch (error) {
        console.error('❌ Error parsing doctor data from memory:', error)
      }
    }
    
    console.log('ℹ️ No doctor data found, using defaults')
    return null
  }

  // ✅ Enhanced Supabase saving method
  async saveToSupabase(consultationId: string, stepNumber: number, data: any): Promise<boolean> {
    try {
      if (!consultationId || !data) {
        console.error('❌ Missing consultationId or data for Supabase save')
        return false
      }

      console.log(`💾 Saving to Supabase - Consultation: ${consultationId}, Step: ${stepNumber}`)
      
      // Prepare the data based on step number
      let updateData: any = {}
      
      switch (stepNumber) {
        case 0:
          updateData.patient_data = data
          break
        case 1:
          updateData.clinical_data = data
          break
        case 2:
          updateData.questions_data = data
          break
        case 3:
          updateData.diagnosis_data = data
          break
        case 4:
          updateData.documents_data = data
          break
        default:
          updateData.additional_data = data
      }
      
      // Add timestamp
      updateData.updated_at = new Date().toISOString()
      
      // Save to Supabase
      const { data: result, error } = await supabase
        .from('consultations')
        .update(updateData)
        .eq('id', consultationId)
        .select()
      
      if (error) {
        console.error('❌ Supabase save error:', error)
        return false
      }
      
      if (result && result.length > 0) {
        console.log('✅ Successfully saved to Supabase')
        
        // Update cache with latest data
        await this.refreshCacheFromSupabase(consultationId)
        
        return true
      } else {
        console.warn('⚠️ No rows updated in Supabase')
        return false
      }
      
    } catch (error) {
      console.error('❌ Error saving to Supabase:', error)
      return false
    }
  }

  // ✅ Load from Supabase with cache update
  async loadFromSupabase(consultationId: string): Promise<any> {
    try {
      if (!consultationId) {
        console.error('❌ No consultation ID provided for Supabase load')
        return null
      }

      console.log(`📥 Loading from Supabase - Consultation: ${consultationId}`)
      
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultationId)
        .single()
      
      if (error) {
        console.error('❌ Supabase load error:', error)
        return null
      }
      
      if (data) {
        console.log('✅ Successfully loaded from Supabase')
        
        // Merge the loaded data into current data
        const mergedData = {
          patientData: data.patient_data,
          clinicalData: data.clinical_data,
          questionsData: data.questions_data,
          diagnosisData: data.diagnosis_data,
          workflowResult: data.documents_data,
          consultationReport: data.consultation_report
        }
        
        this.currentData = { ...this.currentData, ...mergedData }
        
        // Update cache with fresh data
        const cacheKey = `/api/consultation/${consultationId}/data`
        await this.saveToCache(cacheKey, this.currentData)
        
        return mergedData
      }
      
      return null
    } catch (error) {
      console.error('❌ Error loading from Supabase:', error)
      return null
    }
  }

  // ✅ Refresh cache from Supabase
  private async refreshCacheFromSupabase(consultationId: string): Promise<void> {
    const data = await this.loadFromSupabase(consultationId)
    if (data) {
      console.log('✅ Cache refreshed from Supabase')
    }
  }

  // ✅ Enhanced consultation report generation with caching
  async generateConsultationReport(
    patientData: any,
    clinicalData: any,
    questionsData: any,
    diagnosisData: any
  ): Promise<any> {
    try {
      console.log('🚀 Starting consultation report generation...')
      
      // Check cache first
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        const cacheKey = `/api/consultation/${consultationId}/report`
        const cachedReport = await this.getFromCache(cacheKey)
        
        if (cachedReport) {
          console.log('✅ Using cached consultation report')
          return cachedReport
        }
      }
      
      // Validate required data
      if (!patientData || !diagnosisData) {
        throw new Error('Patient data and diagnosis data are required for report generation')
      }

      if (!patientData.firstName || !patientData.lastName) {
        throw new Error('Patient first name and last name are required')
      }

      if (!diagnosisData.diagnosis?.primary?.condition) {
        throw new Error('Primary diagnosis is required')
      }

      console.log('✅ Data validation passed')
      console.log('📋 Generating for patient:', `${patientData.firstName} ${patientData.lastName}`)
      console.log('🏥 Primary diagnosis:', diagnosisData.diagnosis.primary.condition)

      // Get doctor data with fallbacks
      let doctorInfo = await this.getDoctorData()
      
      if (!doctorInfo) {
        console.log('ℹ️ No doctor data found, using defaults')
        doctorInfo = {
          full_name: "Dr. MÉDECIN EXPERT",
          specialty: "Médecine générale",
          address: "Cabinet médical, Maurice",
          city: "Port-Louis, Maurice",
          phone: "+230 xxx xxx xxx",
          email: "contact@cabinet.mu",
          medical_council_number: "Medical Council of Mauritius - Reg. No. XXXXX"
        }
      }

      // Prepare doctor info for generator
      const doctor = {
        fullName: doctorInfo.full_name || doctorInfo.fullName || "Dr. MÉDECIN EXPERT",
        specialty: doctorInfo.specialty || "Médecine générale",
        address: doctorInfo.address || "Cabinet médical, Maurice",
        city: doctorInfo.city || "Port-Louis, Maurice",
        phone: doctorInfo.phone || "+230 xxx xxx xxx",
        email: doctorInfo.email || "contact@cabinet.mu",
        registrationNumber: doctorInfo.medical_council_number || doctorInfo.medicalCouncilNumber || "Medical Council of Mauritius - Reg. No. XXXXX"
      }

      // Create comprehensive consultation data structure
      const consultationData = {
        // Patient information
        patientInfo: {
          name: `${patientData.firstName} ${patientData.lastName}`,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: patientData.age,
          birthDate: patientData.birthDate,
          gender: Array.isArray(patientData.gender) ? patientData.gender[0] : patientData.gender,
          weight: patientData.weight,
          height: patientData.height,
          bmi: patientData.weight && patientData.height ? 
            (patientData.weight / Math.pow(patientData.height/100, 2)).toFixed(1) : null,
          date: new Date().toLocaleDateString('fr-FR'),
          address: patientData.address || '',
          phone: patientData.phone || patientData.phoneNumber || '',
          email: patientData.email || '',
          allergies: Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : (patientData.allergies || 'Aucune'),
          medicalHistory: Array.isArray(patientData.medicalHistory) ? patientData.medicalHistory.join(', ') : (patientData.medicalHistory || 'Aucun'),
          currentMedications: patientData.currentMedicationsText || 'Aucun',
          lifeHabits: patientData.lifeHabits || {}
        },
        
        // Clinical information
        chiefComplaint: clinicalData?.chiefComplaint || 'Consultation de contrôle',
        diseaseHistory: clinicalData?.diseaseHistory || '',
        symptomDuration: clinicalData?.symptomDuration || '',
        symptoms: clinicalData?.symptoms || [],
        vitalSigns: {
          temperature: clinicalData?.vitalSigns?.temperature || '',
          bloodPressureSystolic: clinicalData?.vitalSigns?.bloodPressureSystolic || '',
          bloodPressureDiastolic: clinicalData?.vitalSigns?.bloodPressureDiastolic || '',
          bloodPressure: clinicalData?.vitalSigns?.bloodPressureSystolic && 
                        clinicalData?.vitalSigns?.bloodPressureDiastolic ? 
                        `${clinicalData.vitalSigns.bloodPressureSystolic}/${clinicalData.vitalSigns.bloodPressureDiastolic} mmHg` : ''
        },
        
        // AI Questions responses
        questionsResponses: questionsData?.responses || {},
        questionsAnswered: questionsData?.questions || [],
        
        // Complete diagnosis information
        diagnosis: diagnosisData.diagnosis.primary.condition,
        diagnosticConfidence: diagnosisData.diagnosis.primary.confidence || 0,
        diagnosticReasoning: diagnosisData.diagnosis.primary.reasoning || '',
        
        // Differential diagnoses
        differentialDiagnoses: diagnosisData.diagnosis.differential || [],
        
        // Treatment plan
        treatmentPlan: diagnosisData.treatmentPlan || {},
        medications: diagnosisData.treatmentPlan?.medications || [],
        recommendations: diagnosisData.treatmentPlan?.recommendations || [],
        
        // Examinations
        suggestedExams: diagnosisData.suggestedExams || {},
        labTests: diagnosisData.suggestedExams?.lab || [],
        imagingTests: diagnosisData.suggestedExams?.imaging || [],
        
        // Red flags and monitoring
        redFlags: diagnosisData.redFlags || [],
        monitoring: diagnosisData.monitoring || [],
        
        // Follow-up
        followUp: diagnosisData.followUp || {},
        nextVisit: diagnosisData.followUp?.nextVisit || '',
        
        // Generated examination text
        examination: this.generateExaminationText(clinicalData, questionsData),
        treatment: this.generateTreatmentPlan(diagnosisData),
        followUpPlan: this.generateFollowUpPlan(diagnosisData)
      }

      console.log('📋 Consultation data prepared successfully')

      // Generate Mauritian documents using the generator
      const mauritianDocuments = MauritianDocumentsGenerator.generateMauritianDocuments(
        { consultationData },
        doctor,
        patientData,
        diagnosisData
      )

      // Create complete consultation report
      const consultationReport = {
        consultationData,
        mauritianDocuments,
        generatedAt: new Date().toISOString(),
        doctorInfo: doctor,
        // Include original data for reference
        originalData: {
          patientData,
          clinicalData,
          questionsData,
          diagnosisData
        },
        success: true
      }

      console.log('✅ Consultation report generated successfully')

      // Save the report to cache
      if (consultationId) {
        const cacheKey = `/api/consultation/${consultationId}/report`
        await this.saveToCache(cacheKey, consultationReport)
      }

      // Save the report
      await this.saveConsultationReport(consultationReport)

      return consultationReport

    } catch (error) {
      console.error('❌ Error generating consultation report:', error)
      throw error
    }
  }

  // Save consultation report with cache
  async saveConsultationReport(reportData: any) {
    try {
      this.currentData.consultationReport = reportData
      
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        // Save to memory storage
        const localKey = `consultation_${consultationId}_data`
        const serializedData = JSON.stringify(this.currentData)
        this.safeMemoryStorage.setItem(localKey, serializedData)
        
        // Save to cache
        const cacheKey = `/api/consultation/${consultationId}/data`
        await this.saveToCache(cacheKey, this.currentData)
        
        // Save report specifically to cache
        const reportCacheKey = `/api/consultation/${consultationId}/report`
        await this.saveToCache(reportCacheKey, reportData)
        
        // Also try to save to Supabase
        await this.saveToSupabase(consultationId, 4, {
          consultationReport: reportData,
          updatedAt: new Date().toISOString()
        })
      }
      
      console.log('💾 Consultation report saved to all storage locations')
    } catch (error) {
      console.error('❌ Error saving consultation report:', error)
    }
  }

  // Helper methods
  private generateExaminationText(clinicalData: any, questionsData: any): string {
    let exam = 'EXAMEN CLINIQUE COMPLET\n'
    exam += '======================\n\n'
    
    // État général
    exam += 'ÉTAT GÉNÉRAL:\n'
    exam += '- Patient conscient, orienté dans le temps et l\'espace\n'
    exam += '- État nutritionnel satisfaisant\n'
    exam += '- Pas de signe de déshydratation\n\n'
    
    // Constantes vitales si disponibles
    if (clinicalData?.vitalSigns) {
      exam += 'CONSTANTES VITALES:\n'
      if (clinicalData.vitalSigns.temperature) {
        exam += `- Température: ${clinicalData.vitalSigns.temperature}°C\n`
      }
      if (clinicalData.vitalSigns.bloodPressureSystolic && clinicalData.vitalSigns.bloodPressureDiastolic) {
        exam += `- Tension artérielle: ${clinicalData.vitalSigns.bloodPressureSystolic}/${clinicalData.vitalSigns.bloodPressureDiastolic} mmHg\n`
      }
      exam += '\n'
    }
    
    // Examen par appareil basé sur les symptômes
    if (clinicalData?.symptoms && clinicalData.symptoms.length > 0) {
      exam += 'EXAMEN PAR APPAREIL:\n'
      
      // Cardiovasculaire
      if (clinicalData.symptoms.some((s: string) => s.toLowerCase().includes('cardia') || s.toLowerCase().includes('chest'))) {
        exam += '- Cardiovasculaire: Bruits du cœur réguliers, pas de souffle audible\n'
      }
      
      // Respiratoire
      if (clinicalData.symptoms.some((s: string) => s.toLowerCase().includes('toux') || s.toLowerCase().includes('respir'))) {
        exam += '- Respiratoire: Murmure vésiculaire bilatéral symétrique, pas de râles\n'
      }
      
      // Digestif
      if (clinicalData.symptoms.some((s: string) => s.toLowerCase().includes('abdom') || s.toLowerCase().includes('digest'))) {
        exam += '- Digestif: Abdomen souple, dépressible, indolore à la palpation\n'
      }
      
      exam += '\n'
    }
    
    return exam || 'Examen physique normal'
  }

  private generateTreatmentPlan(diagnosisData: any): string {
    let plan = 'PLAN THÉRAPEUTIQUE DÉTAILLÉ\n'
    plan += '==========================\n\n'
    
    if (diagnosisData?.treatmentPlan?.medications && diagnosisData.treatmentPlan.medications.length > 0) {
      plan += 'TRAITEMENT MÉDICAMENTEUX:\n'
      diagnosisData.treatmentPlan.medications.forEach((med: any, index: number) => {
        plan += `${index + 1}. ${med.name || med}\n`
        if (med.dosage) plan += `   Posologie: ${med.dosage}\n`
        if (med.duration) plan += `   Durée: ${med.duration}\n`
        plan += '\n'
      })
    }
    
    if (diagnosisData?.treatmentPlan?.recommendations && diagnosisData.treatmentPlan.recommendations.length > 0) {
      plan += '\nMESURES GÉNÉRALES:\n'
      diagnosisData.treatmentPlan.recommendations.forEach((rec: string, index: number) => {
        plan += `${index + 1}. ${rec}\n`
      })
    }
    
    return plan || 'Plan thérapeutique à définir selon les résultats des examens complémentaires'
  }

  private generateFollowUpPlan(diagnosisData: any): string {
    let followUp = 'PLAN DE SUIVI ET EXAMENS\n'
    followUp += '========================\n\n'
    
    if (diagnosisData?.suggestedExams?.lab && diagnosisData.suggestedExams.lab.length > 0) {
      followUp += 'EXAMENS BIOLOGIQUES:\n'
      diagnosisData.suggestedExams.lab.forEach((exam: string, index: number) => {
        followUp += `${index + 1}. ${exam}\n`
      })
      followUp += '\n'
    }
    
    if (diagnosisData?.suggestedExams?.imaging && diagnosisData.suggestedExams.imaging.length > 0) {
      followUp += 'EXAMENS D\'IMAGERIE:\n'
      diagnosisData.suggestedExams.imaging.forEach((exam: string, index: number) => {
        followUp += `${index + 1}. ${exam}\n`
      })
      followUp += '\n'
    }
    
    if (diagnosisData?.followUp?.nextVisit) {
      followUp += `\nPROCHAINE CONSULTATION: ${diagnosisData.followUp.nextVisit}\n`
    }
    
    return followUp || 'Suivi à prévoir selon l\'évolution clinique'
  }

  // Clear consultation data and cache
  async clearConsultation() {
    this.consultationId = null
    this.patientId = null
    this.doctorId = null
    this.currentData = {}
    
    this.safeMemoryStorage.removeItem('currentConsultationId')
    this.safeMemoryStorage.removeItem('currentPatientId') 
    this.safeMemoryStorage.removeItem('currentDoctorId')
    
    // Clear cache
    await this.clearCache()
    
    console.log('🧹 Consultation data and cache cleared')
  }

  // ✅ Preload all consultation data into cache
  async preloadConsultationData(consultationId: string): Promise<boolean> {
    try {
      console.log('⏳ Preloading consultation data into cache...')
      
      // Load from Supabase
      const data = await this.loadFromSupabase(consultationId)
      
      if (data) {
        // Cache is already updated by loadFromSupabase
        console.log('✅ Consultation data preloaded into cache')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Error preloading consultation data:', error)
      return false
    }
  }

  // ✅ Get cache status
  async getCacheStatus(): Promise<{
    available: boolean
    consultationsCached: number
    sizeEstimate?: number
  }> {
    if (!this.cacheAvailable) {
      return { available: false, consultationsCached: 0 }
    }

    try {
      const cache = await caches.open(CACHE_NAME)
      const keys = await cache.keys()
      
      // Estimate size (rough calculation)
      let totalSize = 0
      for (const request of keys) {
        const response = await cache.match(request)
        if (response) {
          const blob = await response.blob()
          totalSize += blob.size
        }
      }

      return {
        available: true,
        consultationsCached: keys.length,
        sizeEstimate: totalSize
      }
    } catch (error) {
      console.error('❌ Error getting cache status:', error)
      return { available: false, consultationsCached: 0 }
    }
  }
}

export const consultationDataService = new ConsultationDataService()
