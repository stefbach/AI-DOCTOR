// FILE: hooks/use-tibok-patient-data.ts (Medical Platform)
// Updated version with Google Translate integration

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

// Helper function to translate text using Google Translate API
async function translateText(text: string): Promise<string> {
  if (!text) return text
  
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.translatedText || text
    }
  } catch (error) {
    console.error('Translation failed for:', text, error)
  }
  
  return text
}

// Data normalization function to translate French to English
async function normalizeLifestyleData(data: any): Promise<any> {
  // Translation mappings for known values
  const smokingMap: Record<string, string> = {
    'non-smoker': 'non-smoker',
    'current-smoker': 'current smoker',
    'ex-smoker': 'former smoker',
    'Non-fumeur': 'non-smoker',
    'Fumeur actuel': 'current smoker',
    'Ex-fumeur': 'former smoker'
  }

  const alcoholMap: Record<string, string> = {
    'never': 'never',
    'occasional': 'occasional',
    'regular': 'regular',
    'Jamais': 'never',
    'Occasionnel': 'occasional',
    'Régulier': 'regular'
  }

  const activityMap: Record<string, string> = {
    'sedentary': 'sedentary',
    'moderate': 'moderate',
    'intense': 'intense',
    'Sédentaire': 'sedentary',
    'Modéré': 'moderate',
    'Modérée': 'moderate',
    'Intense': 'intense'
  }

  const medicalConditionsMap: Record<string, string> = {
    'Hypertension': 'Hypertension',
    'hypertension': 'Hypertension',
    'Type 2 Diabetes': 'Type 2 Diabetes',
    'Type 1 Diabetes': 'Type 1 Diabetes',
    'Asthma': 'Asthma',
    'asthma': 'Asthma',
    'Heart disease': 'Heart disease',
    'heart disease': 'Heart disease',
    'Depression/Anxiety': 'Depression/Anxiety',
    'depression/anxiety': 'Depression/Anxiety',
    'Arthritis': 'Arthritis',
    'arthritis': 'Arthritis',
    'Migraine': 'Migraine',
    'migraine': 'Migraine',
    'GERD (Gastroesophageal reflux)': 'GERD (Gastroesophageal reflux)',
    'gerd (gastroesophageal reflux)': 'GERD (Gastroesophageal reflux)',
    'High cholesterol': 'High cholesterol',
    'high cholesterol': 'High cholesterol',
    'Diabète de type 2': 'Type 2 Diabetes',
    'Diabète de type 1': 'Type 1 Diabetes',
    'Asthme': 'Asthma',
    'Maladie cardiaque': 'Heart disease',
    'Dépression/Anxiété': 'Depression/Anxiety',
    'Arthrite': 'Arthritis',
    'Reflux gastro-œsophagien': 'GERD (Gastroesophageal reflux)',
    'Cholestérol élevé': 'High cholesterol'
  }

  const allergiesMap: Record<string, string> = {
    'Penicillin': 'Penicillin',
    'Aspirin': 'Aspirin',
    'NSAIDs (Ibuprofen, Diclofenac)': 'NSAIDs (Ibuprofen, Diclofenac)',
    'Codeine': 'Codeine',
    'Latex': 'Latex',
    'Iodine': 'Iodine',
    'Local anesthetics': 'Local anesthetics',
    'Sulfonamides': 'Sulfonamides',
    'Pénicilline': 'Penicillin',
    'Aspirine': 'Aspirin',
    'Anti-inflammatoires (Ibuprofène, Diclofénac)': 'NSAIDs (Ibuprofen, Diclofenac)',
    'Codéine': 'Codeine',
    'Iode': 'Iodine',
    'Anesthésiques locaux': 'Local anesthetics',
    'Sulfamides': 'Sulfonamides'
  }

  // Helper function to translate array values
  const translateArray = (arr: string[], map: Record<string, string>): string[] => {
    return arr.map(item => {
      const trimmedItem = item.trim()
      // Check for exact match (case-insensitive)
      for (const [key, value] of Object.entries(map)) {
        if (key.toLowerCase() === trimmedItem.toLowerCase()) {
          return value
        }
      }
      return map[trimmedItem] || trimmedItem
    }).filter(item => item.trim() !== '')
  }

  // Normalize the data
  const normalized = { ...data }

  // Lifestyle factors
  if (data.smokingStatus) {
    normalized.smokingStatus = smokingMap[data.smokingStatus] || data.smokingStatus
  }
  if (data.alcoholConsumption) {
    normalized.alcoholConsumption = alcoholMap[data.alcoholConsumption] || data.alcoholConsumption
  }
  if (data.physicalActivity) {
    normalized.physicalActivity = activityMap[data.physicalActivity] || data.physicalActivity
  }

  // Medical history with proper capitalization
  if (Array.isArray(data.medicalHistory)) {
    normalized.medicalHistory = translateArray(data.medicalHistory, medicalConditionsMap)
  }

  // Allergies
  if (Array.isArray(data.allergies)) {
    normalized.allergies = translateArray(data.allergies, allergiesMap)
  }

  // Translate "other" fields using Google Translate API
  if (data.otherAllergies) {
    normalized.otherAllergies = await translateText(data.otherAllergies)
  }
  
  if (data.otherMedicalHistory) {
    normalized.otherMedicalHistory = await translateText(data.otherMedicalHistory)
  }

  // Translate consultation reason (chief complaint)
    if (data.consultationReason) {
    normalized.consultationReason = await translateText(data.consultationReason)
  }
  
  // Current symptoms
  if (Array.isArray(data.currentSymptoms)) {
    normalized.currentSymptoms = data.currentSymptoms
  }

  // Symptom duration
  if (data.symptomDuration) {
    normalized.symptomDuration = data.symptomDuration
  }

  console.log('🔄 Data normalization completed:', {
    original: {
      otherAllergies: data.otherAllergies,
      otherMedicalHistory: data.otherMedicalHistory,
      medicalHistory: data.medicalHistory
    },
    normalized: {
      otherAllergies: normalized.otherAllergies,
      otherMedicalHistory: normalized.otherMedicalHistory,
      medicalHistory: normalized.medicalHistory
    }
  })

  return normalized
}

export function useTibokPatientData() {
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null)
  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null)
  const [isFromTibok, setIsFromTibok] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
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
          console.log('📋 Parsed TIBOK Patient Data (before normalization):', parsedPatientData)
          
          // Apply normalization with translation
          const normalizedPatientData = await normalizeLifestyleData(parsedPatientData)
          console.log('🔄 Normalized Patient Data (after translation):', normalizedPatientData)
          
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
          if (!normalizedPatientData.firstName || !normalizedPatientData.lastName) {
            console.error('❌ Missing critical patient data (name)')
            setLoading(false)
            return
          }

          // Log medical data specifically (now in English)
          console.log('🏥 Medical Data Received (English):', {
            symptoms: normalizedPatientData.currentSymptoms,
            medicalHistory: normalizedPatientData.medicalHistory,
            allergies: normalizedPatientData.allergies,
            otherAllergies: normalizedPatientData.otherAllergies,
            otherMedicalHistory: normalizedPatientData.otherMedicalHistory,
            consultationReason: normalizedPatientData.consultationReason,
            vitalSigns: normalizedPatientData.vitalSigns,
            currentMedications: normalizedPatientData.currentMedications,
            lifestyle: {
              smoking: normalizedPatientData.smokingStatus,
              alcohol: normalizedPatientData.alcoholConsumption,
              activity: normalizedPatientData.physicalActivity
            }
          })

          // Use normalized data
          setPatientData(normalizedPatientData)
          setDoctorData(parsedDoctorData)
          setConsultationData(consultation)
          setIsFromTibok(true)
          
          console.log('✅ TIBOK data loaded and normalized successfully')
          
        } catch (error) {
          console.error('❌ Error parsing TIBOK data:', error)
          console.error('Raw patient data:', patientDataParam?.substring(0, 200) + '...')
          console.error('Raw doctor data:', doctorDataParam?.substring(0, 200) + '...')
        }
      } else {
        console.log('ℹ️ Not from TIBOK or missing data parameters')
      }

      setLoading(false)
    }

    loadData()

    // Also listen for custom events (fallback)
    const handlePatientData = async (event: CustomEvent) => {
      console.log('📡 Received patient data via custom event:', event.detail)
      
      // Apply normalization to event data as well
      let normalizedEventData = event.detail
      if (event.detail.patient) {
        normalizedEventData.patient = await normalizeLifestyleData(event.detail.patient)
      }
      
      if (normalizedEventData.patient) setPatientData(normalizedEventData.patient)
      if (normalizedEventData.doctor) setDoctorData(normalizedEventData.doctor)
      if (normalizedEventData.consultation) setConsultationData(normalizedEventData.consultation)
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
