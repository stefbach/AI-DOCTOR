// lib/consultation-data-service.ts
import { supabase } from '@/lib/supabase'

export interface ConsultationData {
  patientData?: any
  clinicalData?: any
  questionsData?: any
  diagnosisData?: any
  workflowResult?: any // Instead of separate prescription and documents
}

export interface ConsultationRecord {
  id?: string
  consultation_id?: string
  patient_id?: string
  doctor_id?: string
  patient_data: any
  clinical_data: any
  questions_data: any
  diagnosis_data: any
  prescription_data: any
  documents_data: any
  workflow_step: number
  completed_steps: number[]
}

class ConsultationDataService {
  private SESSION_KEY = 'consultation_data'
  private CONSULTATION_ID_KEY = 'current_consultation_id'

  // Check authentication status
  async checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) {
      console.error('Not authenticated:', error)
      return false
    }
    return true
  }

  // Initialize from URL parameters
  async initializeFromURL() {
    if (typeof window === 'undefined') return null
    
    const urlParams = new URLSearchParams(window.location.search)
    const consultationId = urlParams.get('consultationId')
    const patientId = urlParams.get('patientId')
    const doctorId = urlParams.get('doctorId')
    
    console.log('Initializing from URL:', { consultationId, patientId, doctorId })
    
    if (consultationId && patientId && doctorId) {
      // Store in session
      sessionStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)
      sessionStorage.setItem('tibokConsultationId', consultationId)
      sessionStorage.setItem('tibokPatientId', patientId)
      sessionStorage.setItem('tibokDoctorId', doctorId)
      
      // Initialize consultation
      return await this.initializeConsultation(consultationId, patientId, doctorId)
    }
    
    return null
  }

  // Check if consultation exists in consultations table
  async checkConsultationExists(consultationId: string) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('consultations')
        .select('id, created_at, patient_id, doctor_id')
        .eq('id', consultationId)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        // Only log real errors, not "no rows" errors
        console.error('Error checking consultation:', checkError)
        return { exists: false, error: checkError }
      }

      if (existing) {
        console.log('Consultation found:', existing.id)
        return { exists: true, consultation: existing }
      }

      console.error('Consultation not found:', consultationId)
      return { exists: false, error: new Error('Consultation not found') }
    } catch (error) {
      console.error('Error in checkConsultationExists:', error)
      return { exists: false, error }
    }
  }

  // Initialize consultation record
  async initializeConsultation(consultationId: string, patientId: string, doctorId: string) {
    try {
      // Check if the consultation exists first - use maybeSingle to avoid 406
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('id, created_at, patient_id, doctor_id')
        .eq('id', consultationId)
        .maybeSingle()

      if (consultationError && consultationError.code !== 'PGRST116') {
        console.error('Error fetching consultation:', consultationError)
        if (consultationError.message?.includes('401')) {
          console.error('Authentication error - check if user is logged in')
        }
        return null
      }
      
      if (!consultation) {
        console.error('Consultation does not exist in database:', consultationId)
        console.error('The consultation must be created by TIBOK before starting the medical workflow')
        return null
      }

      console.log('Consultation found:', consultation)

      // Check if record already exists
      const { data: existing, error: existingError } = await supabase
        .from('consultation_records')
        .select('*')
        .eq('consultation_id', consultationId)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing record:', existingError)
      }

      if (existing) {
        console.log('Found existing consultation record:', existing.id)
        return existing
      }

      // Create new record with consultation_date
      console.log('Creating new consultation record...')
      const { data, error } = await supabase
        .from('consultation_records')
        .insert({
          consultation_id: consultationId,
          patient_id: consultation.patient_id || patientId,
          doctor_id: consultation.doctor_id || doctorId,
          consultation_date: consultation.created_at,
          workflow_step: 0,
          completed_steps: [],
          patient_data: {},
          clinical_data: {},
          questions_data: {},
          diagnosis_data: {},
          documents_data: {},
          prescription_data: {} // Add this field as it's in your schema
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating consultation record:', error)
        if (error.code === '23505') {
          console.error('Record already exists - this might be a race condition')
        }
        throw error
      }

      console.log('Created new consultation record:', data?.id)

      // Store consultation ID in session
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)
        sessionStorage.setItem('tibokConsultationId', consultationId)
      }
      
      return data
    } catch (error) {
      console.error('Error initializing consultation:', error)
      return null
    }
  }

  // Save step data to both session storage and database
  async saveStepData(stepNumber: number, data: any) {
    try {
      // Get current session data
      const sessionData = this.getSessionData()
      
      // Map step number to data field
      const fieldMap: { [key: number]: keyof ConsultationData } = {
        0: 'patientData',
        1: 'clinicalData',
        2: 'questionsData',
        3: 'diagnosisData',
        4: 'workflowResult'
      }

      const field = fieldMap[stepNumber]
      if (!field) return

      // Update session data
      const updatedData = {
        ...sessionData,
        [field]: data
      }
      
      // Save to session storage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedData))
      }
      
      // Save to database if consultation ID exists
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        await this.saveToSupabase(consultationId, stepNumber, data)
      }
      
      return updatedData
    } catch (error) {
      console.error('Error saving step data:', error)
      return null
    }
  }

  // Save specific step data to Supabase
  async saveToSupabase(consultationId: string, stepNumber: number, data: any) {
    try {
      console.log('saveToSupabase called with:', {
        consultationId,
        stepNumber,
        dataKeys: Object.keys(data || {})
      })

      const fieldMap: { [key: number]: string } = {
        0: 'patient_data',
        1: 'clinical_data',
        2: 'questions_data',
        3: 'diagnosis_data',
        4: 'documents_data'
      }

      const field = fieldMap[stepNumber]
      if (!field) {
        console.error('Invalid step number:', stepNumber)
        return false
      }

      // First check if the consultation exists - use maybeSingle() to avoid 406 error
      const { data: consultationCheck, error: consultationCheckError } = await supabase
        .from('consultations')
        .select('id, patient_id, doctor_id, created_at')
        .eq('id', consultationId)
        .maybeSingle()

      if (consultationCheckError && consultationCheckError.code !== 'PGRST116') {
        // Only log real errors, not "no rows" errors
        console.error('Error checking consultation:', consultationCheckError)
        return false
      }

      if (!consultationCheck) {
        console.error('Consultation does not exist:', consultationId)
        console.error('Please ensure the consultation is created in TIBOK before starting the medical workflow')
        return false
      }

      console.log('Consultation found:', consultationCheck)

      // Use the patient and doctor IDs from the consultation
      const patientId = consultationCheck.patient_id
      const doctorId = consultationCheck.doctor_id
      const consultation = consultationCheck

      // Check if record exists - use maybeSingle to avoid error
      const { data: existingRecord, error: checkError } = await supabase
        .from('consultation_records')
        .select('id, completed_steps')
        .eq('consultation_id', consultationId)
        .maybeSingle()

      console.log('Existing record check:', { existingRecord, checkError })

      let result
      
      if (existingRecord) {
        // Update existing record
        console.log('Updating existing record')
        
        const completedSteps = existingRecord.completed_steps || []
        if (!completedSteps.includes(stepNumber)) {
          completedSteps.push(stepNumber)
        }

        const updateData: any = {
          [field]: data || {},
          workflow_step: stepNumber,
          completed_steps: completedSteps,
          updated_at: new Date().toISOString()
        }

        if (stepNumber === 4) {
          updateData.consultation_date = consultation.created_at
        }

        const { data: updateResult, error: updateError } = await supabase
          .from('consultation_records')
          .update(updateData)
          .eq('consultation_id', consultationId)
          .select()
          .single()

        console.log('Update result:', { updateResult, updateError })
        
        if (updateError) {
          console.error('Update error:', updateError)
          return false
        }
        
        result = updateResult
      } else {
        // Create new record
        console.log('Creating new record')
        
        const insertData: any = {
          consultation_id: consultationId,
          patient_id: patientId,
          doctor_id: doctorId,
          consultation_date: consultation.created_at,
          [field]: data || {},
          workflow_step: stepNumber,
          completed_steps: [stepNumber],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Initialize all JSONB fields with empty objects
        const jsonbFields = ['patient_data', 'clinical_data', 'questions_data', 'diagnosis_data', 'documents_data', 'prescription_data']
        jsonbFields.forEach(f => {
          if (!(f in insertData)) {
            insertData[f] = {}
          }
        })

        const { data: insertResult, error: insertError } = await supabase
          .from('consultation_records')
          .insert(insertData)
          .select()
          .single()

        console.log('Insert result:', { insertResult, insertError })
        
        if (insertError) {
          console.error('Insert error:', insertError)
          return false
        }
        
        result = insertResult
      }

      console.log('✅ Successfully saved to Supabase')
      return true
    } catch (error) {
      console.error('❌ Error in saveToSupabase:', error)
      return false
    }
  }

  // Get all data for the current consultation
  async getAllData(): Promise<ConsultationData | null> {
    const consultationId = this.getCurrentConsultationId()
    if (!consultationId) {
      console.log('No consultation ID, returning session data')
      return this.getSessionData()
    }
    
    return await this.loadConsultationData(consultationId)
  }

  // Get all data for auto-fill
  async getDataForAutoFill(): Promise<ConsultationData> {
    try {
      // First try to get consultation ID
      const consultationId = this.getCurrentConsultationId()
      
      if (consultationId) {
        // Try to load from database
        const dbData = await this.loadConsultationData(consultationId)
        if (dbData && Object.keys(dbData).length > 0) {
          return dbData
        }
      }
      
      // Fall back to session storage
      const sessionData = this.getSessionData()
      if (Object.keys(sessionData).length > 0) {
        return sessionData
      }

      // If no data anywhere, return empty object
      return {}
    } catch (error) {
      console.error('Error getting data for auto-fill:', error)
      return {}
    }
  }

  // Get session data
  private getSessionData(): ConsultationData {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return {}
      }
      const data = sessionStorage.getItem(this.SESSION_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('Error getting session data:', error)
      return {}
    }
  }

  // Load consultation data from database
  async loadConsultationData(consultationId: string): Promise<ConsultationData | null> {
    try {
      const { data, error } = await supabase
        .from('consultation_records')
        .select('*')
        .eq('consultation_id', consultationId)
        .maybeSingle()

      if (error) {
        console.error('Error loading consultation data:', error)
        throw error
      }

      if (data) {
        const consultationData: ConsultationData = {
          patientData: data.patient_data || {},
          clinicalData: data.clinical_data || {},
          questionsData: data.questions_data || {},
          diagnosisData: data.diagnosis_data || {},
          workflowResult: data.documents_data || {} // Map to your workflow result
        }

        // Also save to session storage for quick access
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(consultationData))
          sessionStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)
        }

        console.log('Loaded consultation data from DB')
        return consultationData
      }

      console.log('No consultation data found in DB')
      return null
    } catch (error) {
      console.error('Error loading consultation data:', error)
      return null
    }
  }

  // Clear session data
  clearSession() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(this.SESSION_KEY)
      sessionStorage.removeItem(this.CONSULTATION_ID_KEY)
      sessionStorage.removeItem('tibokConsultationId')
      sessionStorage.removeItem('tibokPatientId')
      sessionStorage.removeItem('tibokDoctorId')
    }
  }

  // Get current consultation ID with multiple fallbacks
  getCurrentConsultationId(): string | null {
    // Try URL first
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlConsultationId = urlParams.get('consultationId')
      if (urlConsultationId) {
        console.log('Got consultation ID from URL:', urlConsultationId)
        // Store it for future use
        if (window.sessionStorage) {
          sessionStorage.setItem(this.CONSULTATION_ID_KEY, urlConsultationId)
          sessionStorage.setItem('tibokConsultationId', urlConsultationId)
        }
        return urlConsultationId
      }
    }
    
    // Try session storage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionId = sessionStorage.getItem(this.CONSULTATION_ID_KEY) || 
                       sessionStorage.getItem('tibokConsultationId')
      if (sessionId) {
        console.log('Got consultation ID from session:', sessionId)
        return sessionId
      }
    }
    
    console.warn('No consultation ID found!')
    return null
  }

  // Check if all steps are completed
  async isConsultationComplete(): Promise<boolean> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) return false

      const { data } = await supabase
        .from('consultation_records')
        .select('completed_steps')
        .eq('consultation_id', consultationId)
        .maybeSingle()

      if (!data) return false

      // Check if all 5 steps (0-4) are completed
      const requiredSteps = [0, 1, 2, 3, 4]
      return requiredSteps.every(step => data.completed_steps?.includes(step))
    } catch (error) {
      console.error('Error checking consultation completion:', error)
      return false
    }
  }

  // Get current workflow step
  async getCurrentStep(): Promise<number> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) return 0

      const { data } = await supabase
        .from('consultation_records')
        .select('workflow_step')
        .eq('consultation_id', consultationId)
        .maybeSingle()

      return data?.workflow_step || 0
    } catch (error) {
      console.error('Error getting current step:', error)
      return 0
    }
  }
}

// Export singleton instance
export const consultationDataService = new ConsultationDataService()
