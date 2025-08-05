// FILE: hooks/use-tibok-patient-data.ts (Medical Platform)
// REPLACE the entire file with this updated version:

import { useEffect, useState } from 'react'

// Complete patient data interface matching what TIBOK sends
interface PatientData {
  // Basic Demographics
  id?: string
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  gender: string
  height: number
  weight: number
  
  // Contact Information
  phone: string
  email: string
  address: string
  city: string
  country: string
  
  // Emergency Contact
  emergencyContactName: string
  emergencyContactPhone: string
  
  // Lifestyle Factors (English values after translation)
  smokingStatus: string
  alcoholConsumption: string
  physicalActivity: string
  
  // Medical History (English values after translation)
  medicalHistory: string[]
  otherMedicalHistory: string
  allergies: string[]
  otherAllergies: string
  
  // Current Medications
  currentMedications: string
  
  // Vital Signs
  vitalSigns: {
    temperature: number | null
    pulse: number | null
    bloodPressureSystolic: number | null
    bloodPressureDiastolic: number | null
    respiratoryRate: number | null
    oxygenSaturation: number | null
    bmi: number | null
  }
  
  // Current Consultation Data (English values after translation)
  consultationReason: string
  currentSymptoms: string[]
  painLevel: number | null
  symptomDuration: string
  
  // Delivery & Tourist Info
  deliveryAddress: string
  isTourist: boolean
  accommodationType: string
  hotelName: string
  
  // Consultation Metadata
  consultationId: string
  consultationType: string
  consultationDate: string
  priorityLevel: string
  preferredLanguage: string
}

// Doctor data interface
interface DoctorData {
  id: string
  fullName: string
  email: string
  phone: string
  medicalCouncilNumber: string
  specialty: string
  experience: string
  languages: string[]
  description: string
}

// Consultation data interface
interface ConsultationData {
  id: string
  patient_id: string
  doctor_id: string
  status: string
}

export function useTibokPatientData() {
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null)
  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null)
  const [isFromTibok, setIsFromTibok] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check URL parameters for TIBOK data
    const urlParams = new URLSearchParams(window.location.search)
    const source = urlParams.get('source')
    const patientDataParam = urlParams.get('patientData')
    const doctorDataParam = urlParams.get('doctorData')
    const consultationId = urlParams.get('consultationId')
    const patientId = urlParams.get('patientId')
    const doctorId = urlParams.get('doctorId')

    console.log('🔍 TIBOK Data Check:', {
      source,
      hasPatientData: !!patientDataParam,
      hasDoctorData: !!doctorDataParam,
      consultationId,
      patientId,
      doctorId
    })

    if (source === 'tibok' && patientDataParam && doctorDataParam) {
      try {
        // Parse patient data
        const parsedPatientData = JSON.parse(decodeURIComponent(patientDataParam))
        console.log('📋 Parsed TIBOK Patient Data:', parsedPatientData)
        
        // Parse doctor data
        const parsedDoctorData = JSON.parse(decodeURIComponent(doctorDataParam))
        console.log('👨‍⚕️ Parsed TIBOK Doctor Data:', parsedDoctorData)

        // Set consultation data
        const consultation = {
          id: consultationId || '',
          patient_id: patientId || '',
          doctor_id: doctorId || '',
          status: 'in_progress'
        }

        // Validate critical patient data
        if (!parsedPatientData.firstName || !parsedPatientData.lastName) {
          console.error('❌ Missing critical patient data (name)')
          setLoading(false)
          return
        }

        // Log medical data specifically
        console.log('🏥 Medical Data Received:', {
          symptoms: parsedPatientData.currentSymptoms,
          medicalHistory: parsedPatientData.medicalHistory,
          allergies: parsedPatientData.allergies,
          consultationReason: parsedPatientData.consultationReason,
          vitalSigns: parsedPatientData.vitalSigns,
          currentMedications: parsedPatientData.currentMedications
        })

        setPatientData(parsedPatientData)
        setDoctorData(parsedDoctorData)
        setConsultationData(consultation)
        setIsFromTibok(true)
        
        console.log('✅ TIBOK data loaded successfully')
        
      } catch (error) {
        console.error('❌ Error parsing TIBOK data:', error)
        console.error('Raw patient data:', patientDataParam?.substring(0, 200) + '...')
        console.error('Raw doctor data:', doctorDataParam?.substring(0, 200) + '...')
      }
    } else {
      console.log('ℹ️ Not from TIBOK or missing data parameters')
    }

    setLoading(false)

    // Also listen for custom events (fallback)
    const handlePatientData = (event: CustomEvent) => {
      console.log('📡 Received patient data via custom event:', event.detail)
      if (event.detail.patient) setPatientData(event.detail.patient)
      if (event.detail.doctor) setDoctorData(event.detail.doctor)
      if (event.detail.consultation) setConsultationData(event.detail.consultation)
      setIsFromTibok(true)
    }

    window.addEventListener('tibok-patient-data', handlePatientData as EventListener)

    return () => {
      window.removeEventListener('tibok-patient-data', handlePatientData as EventListener)
    }
  }, [])

  // Helper functions to access specific data easily
  const getVitalSigns = () => patientData?.vitalSigns || {}
  const getCurrentSymptoms = () => patientData?.currentSymptoms || []
  const getMedicalHistory = () => patientData?.medicalHistory || []
  const getAllergies = () => patientData?.allergies || []
  const getConsultationReason = () => patientData?.consultationReason || ''
  const getCurrentMedications = () => patientData?.currentMedications || ''

  return {
    // Data
    patientData,
    doctorData,
    consultationData,
    
    // Status
    isFromTibok,
    loading,
    
    // Helper functions
    getVitalSigns,
    getCurrentSymptoms,
    getMedicalHistory,
    getAllergies,
    getConsultationReason,
    getCurrentMedications,
    
    // Quick access to common data
    patientName: patientData ? `${patientData.firstName} ${patientData.lastName}` : '',
    doctorName: doctorData?.fullName || '',
    hasVitalSigns: !!patientData?.vitalSigns && Object.values(patientData.vitalSigns).some(v => v !== null),
    hasMedicalHistory: (patientData?.medicalHistory?.length || 0) > 0,
    hasAllergies: (patientData?.allergies?.length || 0) > 0,
    hasSymptoms: (patientData?.currentSymptoms?.length || 0) > 0
  }
}
