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

  // Initialize consultation record
  async initializeConsultation(consultationId: string, patientId: string, doctorId: string) {
    try {
      // Get consultation details including created_at
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('id, created_at')
        .eq('id', consultationId)
        .single()

      if (consultationError || !consultation) {
        console.error('Consultation not found')
        return null
      }

      // Check if record already exists
      const { data: existing } = await supabase
        .from('consultation_records')
        .select('*')
        .eq('consultation_id', consultationId)
        .single()

      if (existing) {
        return existing
      }

      // Create new record with consultation_date
      const { data, error } = await supabase
        .from('consultation_records')
        .insert({
          consultation_id: consultationId,
          patient_id: patientId,
          doctor_id: doctorId,
          consultation_date: consultation.created_at, // Add this line
          workflow_step: 0,
          completed_steps: []
        })
        .select()
        .single()

      if (error) throw error

      // Store consultation ID in session
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)
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
        dataKeys: Object.keys(data)
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

      // Get consultation details with better error handling
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('id, patient_id, doctor_id, created_at')
        .eq('id', consultationId)
        .single()

      console.log('Consultation lookup result:', { consultation, consultationError })

      if (consultationError) {
        console.error('Consultation lookup error:', consultationError)
        if (consultationError.message.includes('401')) {
          console.error('Authentication failed - check Supabase keys')
        }
        return false
      }

      if (!consultation) {
        console.error('Consultation not found:', consultationId)
        return false
      }

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
          [field]: data,
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
          patient_id: consultation.patient_id,
          doctor_id: consultation.doctor_id,
          consultation_date: consultation.created_at,
          [field]: data,
          workflow_step: stepNumber,
          completed_steps: [stepNumber],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const jsonbFields = ['patient_data', 'clinical_data', 'questions_data', 'diagnosis_data']
        jsonbFields.forEach(f => {
          if (f !== field && f !== 'documents_data') {
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
        .single()

      if (error) throw error

      if (data) {
        const consultationData: ConsultationData = {
          patientData: data.patient_data,
          clinicalData: data.clinical_data,
          questionsData: data.questions_data,
          diagnosisData: data.diagnosis_data,
          workflowResult: data.documents_data // Map to your workflow result
        }

        // Also save to session storage for quick access
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(consultationData))
          sessionStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)
        }

        return consultationData
      }

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
    }
  }

  // Get current consultation ID
  getCurrentConsultationId(): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null
    }
    return sessionStorage.getItem(this.CONSULTATION_ID_KEY)
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
        .single()

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
        .single()

      return data?.workflow_step || 0
    } catch (error) {
      console.error('Error getting current step:', error)
      return 0
    }
  }
}

// Export singleton instance
export const consultationDataService = new ConsultationDataService()
