// lib/consultation-data-service.ts - Version complète mise à jour

import { supabase } from './supabase'

class ConsultationDataService {
  private currentConsultationId: string | null = null
  private currentPatientId: string | null = null
  private currentDoctorId: string | null = null

  // ✅ Initialize from URL parameters
  async initializeFromURL(): Promise<void> {
    try {
      if (typeof window === 'undefined') return

      const urlParams = new URLSearchParams(window.location.search)
      const consultationId = urlParams.get('consultationId')
      const patientId = urlParams.get('patientId')
      const doctorId = urlParams.get('doctorId')

      console.log('Initializing from URL:', { consultationId, patientId, doctorId })

      if (consultationId) {
        this.currentConsultationId = consultationId
        // Store in session storage
        sessionStorage.setItem('current_consultation_id', consultationId)
        sessionStorage.setItem('tibokConsultationId', consultationId)
      }

      if (patientId) {
        this.currentPatientId = patientId
        sessionStorage.setItem('current_patient_id', patientId)
      }

      if (doctorId) {
        this.currentDoctorId = doctorId
        sessionStorage.setItem('current_doctor_id', doctorId)
      }

      // Also try to get from session storage if not in URL
      if (!this.currentConsultationId) {
        this.currentConsultationId = sessionStorage.getItem('current_consultation_id') || 
                                     sessionStorage.getItem('tibokConsultationId')
      }

      if (!this.currentPatientId) {
        this.currentPatientId = sessionStorage.getItem('current_patient_id')
      }

      if (!this.currentDoctorId) {
        this.currentDoctorId = sessionStorage.getItem('current_doctor_id')
      }

      console.log('Initialized consultation service:', {
        consultationId: this.currentConsultationId,
        patientId: this.currentPatientId,
        doctorId: this.currentDoctorId
      })

    } catch (error) {
      console.error('Error initializing from URL:', error)
    }
  }

  // ✅ Initialize consultation
  async initializeConsultation(consultationId: string, patientId: string, doctorId: string): Promise<void> {
    try {
      this.currentConsultationId = consultationId
      this.currentPatientId = patientId
      this.currentDoctorId = doctorId

      // Store in session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('current_consultation_id', consultationId)
        sessionStorage.setItem('tibokConsultationId', consultationId)
        sessionStorage.setItem('current_patient_id', patientId)
        sessionStorage.setItem('current_doctor_id', doctorId)
      }

      console.log('Consultation initialized:', { consultationId, patientId, doctorId })

    } catch (error) {
      console.error('Error initializing consultation:', error)
      throw error
    }
  }

  // ✅ Get current consultation ID
  getCurrentConsultationId(): string | null {
    if (this.currentConsultationId) {
      return this.currentConsultationId
    }

    // Try to get from session storage
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('current_consultation_id') || 
             sessionStorage.getItem('tibokConsultationId')
    }

    return null
  }

  // ✅ Save step data
  async saveStepData(step: number, data: any): Promise<void> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        throw new Error('No active consultation')
      }

      console.log(`💾 Saving step ${step} data:`, data)

      // Define the column mapping for each step
      const stepColumnMap: Record<number, string> = {
        0: 'patient_data',
        1: 'clinical_data',
        2: 'questions_data',
        3: 'diagnosis_data',
        4: 'workflow_result'
      }

      const columnName = stepColumnMap[step]
      if (!columnName) {
        throw new Error(`Invalid step number: ${step}`)
      }

      // Update the specific column
      const updateData = {
        [columnName]: data,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('consultations')
        .update(updateData)
        .eq('id', consultationId)

      if (error) {
        console.error(`Error saving step ${step}:`, error)
        throw error
      }

      console.log(`✅ Step ${step} data saved successfully`)

    } catch (error) {
      console.error(`❌ Error saving step ${step} data:`, error)
      throw error
    }
  }

  // ✅ Save consultation report
  async saveConsultationReport(reportData: any): Promise<void> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        throw new Error('No active consultation')
      }

      console.log('💾 Saving consultation report:', consultationId)

      // Save to Supabase
      const { error } = await supabase
        .from('consultations')
        .update({
          consultation_report: reportData,
          report_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', consultationId)

      if (error) {
        console.error('Error saving consultation report:', error)
        throw error
      }

      // Also save in session storage for quick access
      if (typeof window !== 'undefined') {
        const sessionKey = `consultation_report_${consultationId}`
        sessionStorage.setItem(sessionKey, JSON.stringify(reportData))
      }

      console.log('✅ Consultation report saved successfully')

    } catch (error) {
      console.error('❌ Error saving consultation report:', error)
      throw error
    }
  }

  // ✅ Get consultation report
  async getConsultationReport(): Promise<any | null> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        return null
      }

      // Try session storage first for speed
      if (typeof window !== 'undefined') {
        const sessionKey = `consultation_report_${consultationId}`
        const sessionData = sessionStorage.getItem(sessionKey)
        if (sessionData) {
          return JSON.parse(sessionData)
        }
      }

      // Get from Supabase
      const { data, error } = await supabase
        .from('consultations')
        .select('consultation_report')
        .eq('id', consultationId)
        .single()

      if (error) {
        console.error('Error getting consultation report:', error)
        return null
      }

      return data?.consultation_report || null

    } catch (error) {
      console.error('❌ Error getting consultation report:', error)
      return null
    }
  }

  // ✅ Get all data for auto-fill
  async getDataForAutoFill(): Promise<any | null> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        console.log('No consultation ID for auto-fill')
        return null
      }

      // Get all consultation data
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultationId)
        .single()

      if (error) {
        console.error('Error getting data for auto-fill:', error)
        return null
      }

      if (!data) {
        console.log('No data found for auto-fill')
        return null
      }

      // Structure the data for auto-fill
      const autoFillData = {
        consultationId: data.id,
        patientData: data.patient_data || this.extractPatientDataFromConsultation(data),
        clinicalData: data.clinical_data,
        questionsData: data.questions_data,
        diagnosisData: data.diagnosis_data,
        workflowResult: data.workflow_result,
        consultationReport: data.consultation_report
      }

      console.log('✅ Auto-fill data retrieved:', {
        hasPatient: !!autoFillData.patientData,
        hasClinical: !!autoFillData.clinicalData,
        hasQuestions: !!autoFillData.questionsData,
        hasDiagnosis: !!autoFillData.diagnosisData,
        hasWorkflow: !!autoFillData.workflowResult,
        hasReport: !!autoFillData.consultationReport
      })

      return autoFillData

    } catch (error) {
      console.error('❌ Error getting auto-fill data:', error)
      return null
    }
  }

  // ✅ Get all data (comprehensive version)
  async getAllData(): Promise<any | null> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        console.log('No consultation ID available')
        return null
      }

      // Get all consultation data from Supabase
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultationId)
        .single()

      if (error) {
        console.error('Error getting all data:', error)
        return null
      }

      if (!data) {
        console.log('No consultation data found')
        return null
      }

      // Structure all the data
      const allData = {
        consultationId: data.id,
        patientData: data.patient_data || this.extractPatientDataFromConsultation(data),
        clinicalData: data.clinical_data,
        questionsData: data.questions_data,
        diagnosisData: data.diagnosis_data,
        workflowResult: data.workflow_result,
        consultationReport: data.consultation_report,
        consultation: data, // Full consultation record
        stepData: {
          step0: data.patient_data,
          step1: data.clinical_data,
          step2: data.questions_data,
          step3: data.diagnosis_data,
          step4: data.workflow_result
        }
      }

      console.log('✅ All data retrieved:', {
        hasPatient: !!allData.patientData,
        hasClinical: !!allData.clinicalData,
        hasQuestions: !!allData.questionsData,
        hasDiagnosis: !!allData.diagnosisData,
        hasWorkflow: !!allData.workflowResult,
        hasReport: !!allData.consultationReport
      })

      return allData

    } catch (error) {
      console.error('❌ Error getting all data:', error)
      return null
    }
  }

  // ✅ Extract patient data from consultation record
  private extractPatientDataFromConsultation(consultationData: any): any {
    return {
      firstName: consultationData.patient_first_name,
      lastName: consultationData.patient_last_name,
      age: consultationData.patient_age,
      gender: consultationData.patient_gender,
      weight: consultationData.patient_weight,
      height: consultationData.patient_height,
      dateOfBirth: consultationData.patient_date_of_birth,
      // Add other fields as needed
    }
  }

  // ✅ Clear consultation report
  async clearConsultationReport(): Promise<void> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        return
      }

      // Clear from Supabase
      const { error } = await supabase
        .from('consultations')
        .update({
          consultation_report: null,
          report_generated_at: null
        })
        .eq('id', consultationId)

      if (error) {
        console.error('Error clearing consultation report:', error)
      }

      // Clear from session storage
      if (typeof window !== 'undefined') {
        const sessionKey = `consultation_report_${consultationId}`
        sessionStorage.removeItem(sessionKey)
      }

      console.log('✅ Consultation report cleared')

    } catch (error) {
      console.error('❌ Error clearing consultation report:', error)
    }
  }

  // ✅ Clear all session data
  clearSession(): void {
    this.currentConsultationId = null
    this.currentPatientId = null
    this.currentDoctorId = null

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('current_consultation_id')
      sessionStorage.removeItem('tibokConsultationId')
      sessionStorage.removeItem('current_patient_id')
      sessionStorage.removeItem('current_doctor_id')
    }

    console.log('✅ Session cleared')
  }

  // ✅ Get current IDs
  getCurrentIds(): { consultationId: string | null, patientId: string | null, doctorId: string | null } {
    return {
      consultationId: this.getCurrentConsultationId(),
      patientId: this.currentPatientId || (typeof window !== 'undefined' ? sessionStorage.getItem('current_patient_id') : null),
      doctorId: this.currentDoctorId || (typeof window !== 'undefined' ? sessionStorage.getItem('current_doctor_id') : null)
    }
  }
}

// Export singleton instance
export const consultationDataService = new ConsultationDataService()
