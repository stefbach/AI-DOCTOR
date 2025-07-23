// lib/consultation-data-service.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      // Check if record already exists
      const { data: existing } = await supabase
        .from('consultation_records')
        .select('*')
        .eq('consultation_id', consultationId)
        .single()

      if (existing) {
        return existing
      }

      // Create new record
      const { data, error } = await supabase
        .from('consultation_records')
        .insert({
          consultation_id: consultationId,
          patient_id: patientId,
          doctor_id: doctorId,
          workflow_step: 0, // Start at 0 for your app
          completed_steps: []
        })
        .select()
        .single()

      if (error) throw error

      // Store consultation ID in session
      sessionStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)
      
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
      
      // Map step number to data field (adjusted for your 5-step workflow)
      const fieldMap: { [key: number]: keyof ConsultationData } = {
        0: 'patientData',      // Your step 0
        1: 'clinicalData',     // Your step 1
        2: 'questionsData',    // Your step 2
        3: 'diagnosisData',    // Your step 3
        4: 'workflowResult'    // Your step 4 (MedicalWorkflow)
      }

      const field = fieldMap[stepNumber]
      if (!field) return

      // Update session data
      const updatedData = {
        ...sessionData,
        [field]: data
      }
      
      // Save to session storage
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedData))
      
      // Save to database if consultation ID exists
      const consultationId = sessionStorage.getItem(this.CONSULTATION_ID_KEY)
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
      const fieldMap: { [key: number]: string } = {
        0: 'patient_data',
        1: 'clinical_data',
        2: 'questions_data',
        3: 'diagnosis_data',
        4: 'documents_data' // Save final workflow data here
      }

      const field = fieldMap[stepNumber]
      if (!field) return

      // Get current completed steps
      const { data: current } = await supabase
        .from('consultation_records')
        .select('completed_steps')
        .eq('consultation_id', consultationId)
        .single()

      const completedSteps = current?.completed_steps || []
      if (!completedSteps.includes(stepNumber)) {
        completedSteps.push(stepNumber)
      }

      // Update record
      const { error } = await supabase
        .from('consultation_records')
        .update({
          [field]: data,
          workflow_step: stepNumber,
          completed_steps: completedSteps,
          updated_at: new Date().toISOString()
        })
        .eq('consultation_id', consultationId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error saving to Supabase:', error)
      return false
    }
  }

  // Get all data for auto-fill
  getDataForAutoFill(): ConsultationData {
    // First try to get from session storage
    const sessionData = this.getSessionData()
    
    if (Object.keys(sessionData).length > 0) {
      return sessionData
    }

    // If no session data, return empty object
    return {}
  }

  // Get session data
  private getSessionData(): ConsultationData {
    try {
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
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(consultationData))
        sessionStorage.setItem(this.CONSULTATION_ID_KEY, consultationId)

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
    sessionStorage.removeItem(this.SESSION_KEY)
    sessionStorage.removeItem(this.CONSULTATION_ID_KEY)
  }

  // Get current consultation ID
  getCurrentConsultationId(): string | null {
    return sessionStorage.getItem(this.CONSULTATION_ID_KEY)
  }
}

// Export singleton instance
export const consultationDataService = new ConsultationDataService()
