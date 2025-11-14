// lib/follow-up/shared/utils/history-fetcher.ts
// Utility for fetching patient consultation history from database

export interface ConsultationHistoryItem {
  id: string
  consultationId: string
  consultationType: 'normal' | 'dermatology' | 'chronic'
  date: string
  chiefComplaint: string
  diagnosis?: string
  medications?: any[]
  vitalSigns?: {
    bloodPressureSystolic?: number
    bloodPressureDiastolic?: number
    bloodGlucose?: number
    weight?: number
    height?: number
    temperature?: number
    heartRate?: number
  }
  labTests?: any[]
  imagingStudies?: any[]
  images?: string[]
  dietaryPlan?: any
  fullReport: any
}

export interface PatientSearchCriteria {
  name?: string
  email?: string
  phone?: string
  nationalId?: string
  dateOfBirth?: string
}

/**
 * Fetch consultation history for a patient
 * @param criteria - Search criteria to identify the patient
 * @returns Array of consultation history items, sorted by date (most recent first)
 */
export async function fetchPatientHistory(
  criteria: PatientSearchCriteria
): Promise<ConsultationHistoryItem[]> {
  try {
    console.log('🔍 Fetching patient history with criteria:', criteria)
    
    const response = await fetch('/api/patient-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(criteria)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch patient history')
    }
    
    console.log(`✅ Found ${data.consultations?.length || 0} consultations`)
    
    return data.consultations || []
  } catch (error) {
    console.error('❌ Error fetching patient history:', error)
    throw error
  }
}

/**
 * Get the most recent consultation for a patient
 * @param criteria - Search criteria
 * @returns Most recent consultation or null
 */
export async function fetchMostRecentConsultation(
  criteria: PatientSearchCriteria
): Promise<ConsultationHistoryItem | null> {
  const history = await fetchPatientHistory(criteria)
  return history.length > 0 ? history[0] : null
}

/**
 * Get consultations of a specific type
 * @param criteria - Search criteria
 * @param type - Consultation type to filter
 * @returns Filtered consultations
 */
export async function fetchConsultationsByType(
  criteria: PatientSearchCriteria,
  type: 'normal' | 'dermatology' | 'chronic'
): Promise<ConsultationHistoryItem[]> {
  const history = await fetchPatientHistory(criteria)
  return history.filter(item => item.consultationType === type)
}

/**
 * Extract patient demographics from most recent consultation
 * @param criteria - Search criteria
 * @returns Patient demographic data
 */
export async function extractPatientDemographics(
  criteria: PatientSearchCriteria
): Promise<any> {
  const mostRecent = await fetchMostRecentConsultation(criteria)
  
  if (!mostRecent) {
    return null
  }
  
  const report = mostRecent.fullReport
  
  // Try to extract from Mauritian structure (compteRendu)
  if (report?.compteRendu?.patient) {
    const patient = report.compteRendu.patient
    return {
      fullName: patient.nomComplet || patient.nom || '',
      firstName: patient.prenom || '',
      lastName: patient.nom || '',
      age: patient.age || '',
      dateOfBirth: patient.dateNaissance || patient.dateOfBirth || '',
      gender: patient.sexe || patient.gender || '',
      address: patient.adresse || patient.address || '',
      phone: patient.telephone || patient.phone || '',
      email: patient.email || '',
      weight: patient.poids || patient.weight || '',
      height: patient.taille || patient.height || '',
      allergies: patient.allergies || [],
      medicalHistory: patient.antecedentsMedicaux || patient.medicalHistory || [],
      currentMedications: patient.medicamentsActuels || patient.currentMedications || ''
    }
  }
  
  // Try to extract from medicalReport structure
  if (report?.medicalReport?.patient) {
    const patient = report.medicalReport.patient
    return {
      fullName: patient.fullName || '',
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      age: patient.age || '',
      dateOfBirth: patient.dateOfBirth || '',
      gender: patient.gender || '',
      address: patient.address || '',
      phone: patient.phone || '',
      email: patient.email || '',
      weight: patient.weight || '',
      height: patient.height || '',
      allergies: patient.allergies || [],
      medicalHistory: patient.medicalHistory || [],
      currentMedications: patient.currentMedications || ''
    }
  }
  
  return null
}
