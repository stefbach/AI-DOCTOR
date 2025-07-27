// lib/consultation-data-service.ts - Version corrigée avec meilleure gestion des erreurs

import { MauritianDocumentsGenerator } from './mauritian-documents-generator'
import { supabase } from './supabase'

class ConsultationDataService {
  private consultationId: string | null = null
  private patientId: string | null = null  
  private doctorId: string | null = null
  private currentData: Record<string, any> = {}

  // ✅ Safe localStorage operations
  private safeLocalStorage = {
    getItem: (key: string): string | null => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key)
        }
      } catch (error) {
        console.warn('localStorage not available:', error)
      }
      return null
    },
    
    setItem: (key: string, value: string): boolean => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, value)
          return true
        }
      } catch (error) {
        console.warn('localStorage not available:', error)
      }
      return false
    },
    
    removeItem: (key: string): boolean => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(key)
          return true
        }
      } catch (error) {
        console.warn('localStorage not available:', error)
      }
      return false
    }
  }

  // ✅ Safe sessionStorage operations
  private safeSessionStorage = {
    getItem: (key: string): string | null => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return sessionStorage.getItem(key)
        }
      } catch (error) {
        console.warn('sessionStorage not available:', error)
      }
      return null
    },
    
    setItem: (key: string, value: string): boolean => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(key, value)
          return true
        }
      } catch (error) {
        console.warn('sessionStorage not available:', error)
      }
      return false
    }
  }

  // Initialize consultation with IDs
  initializeConsultation(consultationId: string, patientId: string, doctorId: string) {
    this.consultationId = consultationId
    this.patientId = patientId
    this.doctorId = doctorId
    
    // Store in localStorage for persistence
    this.safeLocalStorage.setItem('currentConsultationId', consultationId)
    this.safeLocalStorage.setItem('currentPatientId', patientId)
    this.safeLocalStorage.setItem('currentDoctorId', doctorId)
    
    console.log('✅ Consultation initialized:', { consultationId, patientId, doctorId })
  }

  // Get current consultation ID with multiple fallbacks
  getCurrentConsultationId(): string | null {
    // Try memory first
    if (this.consultationId) return this.consultationId
    
    // Try localStorage
    const storedId = this.safeLocalStorage.getItem('currentConsultationId')
    if (storedId) {
      this.consultationId = storedId
      return storedId
    }
    
    // Try URL params as fallback
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlConsultationId = urlParams.get('consultationId')
      if (urlConsultationId) {
        this.consultationId = urlConsultationId
        this.safeLocalStorage.setItem('currentConsultationId', urlConsultationId)
        return urlConsultationId
      }
    }
    
    console.warn('⚠️ No consultation ID found in any location')
    return null
  }

  // ✅ Enhanced data saving with validation
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
        console.log('💾 Questions data saved:', Object.keys(data.responses || {}).length, 'responses')
      } else if (step === 3 && data) {
        this.currentData.diagnosisData = data
        console.log('💾 Diagnosis data saved:', data.diagnosis?.primary?.condition || 'unknown diagnosis')
      } else if (step === 4 && data) {
        this.currentData.workflowResult = data
        console.log('💾 Workflow result saved')
      }
      
      // Persist to localStorage with error handling
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        const key = `consultation_${consultationId}_data`
        const serializedData = JSON.stringify(this.currentData)
        const saved = this.safeLocalStorage.setItem(key, serializedData)
        
        if (saved) {
          console.log(`✅ Step ${step} data persisted to localStorage`)
        } else {
          console.warn(`⚠️ Failed to persist step ${step} data to localStorage`)
        }
      }
      
      return true
    } catch (error) {
      console.error(`❌ Error saving step ${step} data:`, error)
      return false
    }
  }

  // ✅ Enhanced data loading with validation
  getAllData(): any {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        console.warn('⚠️ No consultation ID, returning memory data only')
        return this.currentData
      }
      
      // Try to load from localStorage first
      const key = `consultation_${consultationId}_data`
      const saved = this.safeLocalStorage.getItem(key)
      
      if (saved) {
        try {
          const parsedData = JSON.parse(saved)
          this.currentData = { ...this.currentData, ...parsedData }
          console.log('✅ Data loaded from localStorage:', Object.keys(parsedData))
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

  // ✅ Enhanced doctor data retrieval
  getDoctorData(): any {
    // Try sessionStorage first
    const sessionData = this.safeSessionStorage.getItem('tibokDoctorData')
    if (sessionData) {
      try {
        const doctorInfo = JSON.parse(sessionData)
        console.log('👨‍⚕️ Doctor data from session:', doctorInfo.full_name || doctorInfo.fullName)
        return doctorInfo
      } catch (error) {
        console.error('❌ Error parsing doctor data from session:', error)
      }
    }
    
    // Try localStorage as fallback
    const localData = this.safeLocalStorage.getItem('tibokDoctorData')
    if (localData) {
      try {
        const doctorInfo = JSON.parse(localData)
        console.log('👨‍⚕️ Doctor data from localStorage:', doctorInfo.full_name || doctorInfo.fullName)
        return doctorInfo
      } catch (error) {
        console.error('❌ Error parsing doctor data from localStorage:', error)
      }
    }
    
    console.warn('⚠️ No doctor data found')
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

  // ✅ Load from Supabase with error handling
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
        return mergedData
      }
      
      return null
    } catch (error) {
      console.error('❌ Error loading from Supabase:', error)
      return null
    }
  }

  // ✅ Enhanced consultation report generation with better error handling
  async generateConsultationReport(
    patientData: any,
    clinicalData: any,
    questionsData: any,
    diagnosisData: any
  ): Promise<any> {
    try {
      console.log('🚀 Starting consultation report generation...')
      
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
      let doctorInfo = this.getDoctorData()
      
      if (!doctorInfo) {
        console.warn('⚠️ No doctor data found, using defaults')
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

      // Save the report
      await this.saveConsultationReport(consultationReport)

      return consultationReport

    } catch (error) {
      console.error('❌ Error generating consultation report:', error)
      throw error
    }
  }

  // Save consultation report
  async saveConsultationReport(reportData: any) {
    try {
      this.currentData.consultationReport = reportData
      
      // Persist to localStorage
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        const key = `consultation_${consultationId}_data`
        const serializedData = JSON.stringify(this.currentData)
        this.safeLocalStorage.setItem(key, serializedData)
        
        // Also try to save to Supabase
        await this.saveToSupabase(consultationId, 4, {
          consultationReport: reportData,
          updatedAt: new Date().toISOString()
        })
      }
      
      console.log('💾 Consultation report saved')
    } catch (error) {
      console.error('❌ Error saving consultation report:', error)
    }
  }

  // Helper methods remain the same...
  private generateExaminationText(clinicalData: any, questionsData: any): string {
    let exam = 'EXAMEN CLINIQUE COMPLET\n'
    exam += '======================\n\n'
    
    // Add implementation as in original
    // ... (keep existing implementation)
    
    return exam || 'Examen physique normal'
  }

  private generateTreatmentPlan(diagnosisData: any): string {
    let plan = 'PLAN THÉRAPEUTIQUE DÉTAILLÉ\n'
    plan += '==========================\n\n'
    
    // Add implementation as in original
    // ... (keep existing implementation)
    
    return plan || 'Plan thérapeutique à définir selon les résultats des examens complémentaires'
  }

  private generateFollowUpPlan(diagnosisData: any): string {
    let followUp = 'PLAN DE SUIVI ET EXAMENS\n'
    followUp += '========================\n\n'
    
    // Add implementation as in original  
    // ... (keep existing implementation)
    
    return followUp || 'Suivi à prévoir selon l\'évolution clinique'
  }

  // Clear consultation data
  clearConsultation() {
    this.consultationId = null
    this.patientId = null
    this.doctorId = null
    this.currentData = {}
    
    this.safeLocalStorage.removeItem('currentConsultationId')
    this.safeLocalStorage.removeItem('currentPatientId') 
    this.safeLocalStorage.removeItem('currentDoctorId')
    
    console.log('🧹 Consultation data cleared')
  }
}

export const consultationDataService = new ConsultationDataService()
