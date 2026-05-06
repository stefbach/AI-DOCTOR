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
    // Handle multi-line text by splitting and translating each line
    if (text.includes('\n')) {
      console.log('📝 Translating multi-line text with', text.split('\n').filter(line => line.trim()).length, 'lines')
      
      const lines = text.split('\n').filter(line => line.trim() !== '')
      const translatedLines = await Promise.all(
        lines.map(async (line) => {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: line.trim() })
          })
          
          if (response.ok) {
            const result = await response.json()
            let translatedText = result.translatedText || line
            
            // Fix common medical abbreviation translations
            translatedText = translatedText
              .replace(/(\d+)\s*\/\s*J\b/gi, '$1/day')  // Fix "7/J" -> "7/day"
              .replace(/(\d+)\s*\/\s*j\b/gi, '$1/day')  // Fix "7/j" -> "7/day"
              .replace(/(\d+)\s*\/\s*d\b/gi, '$1/day')  // Fix "1/d" -> "1/day"
              .replace(/\bfois par jour\b/gi, 'times per day')
              .replace(/\bpar jour\b/gi, 'per day')
              .replace(/\b1 time a day\b/gi, '1 time per day')
              .replace(/\b(\d+) time a day\b/gi, '$1 times per day')
            
            console.log('  Line translated:', line.trim(), '→', translatedText)
            return translatedText
          }
          return line
        })
      )
      
      const result = translatedLines.join('\n')
      console.log('✅ Multi-line translation complete:', result)
      return result
    }
    
    // Single line translation
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    
    if (response.ok) {
      const result = await response.json()
      let translatedText = result.translatedText || text
      
      // Apply the same fixes for single line
      translatedText = translatedText
        .replace(/(\d+)\s*\/\s*J\b/gi, '$1/day')
        .replace(/(\d+)\s*\/\s*j\b/gi, '$1/day')
        .replace(/(\d+)\s*\/\s*d\b/gi, '$1/day')
        .replace(/\bfois par jour\b/gi, 'times per day')
        .replace(/\bpar jour\b/gi, 'per day')
        .replace(/\b1 time a day\b/gi, '1 time per day')
        .replace(/\b(\d+) time a day\b/gi, '$1 times per day')
      
      return translatedText
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

  // Translate current medications with improved logging
  if (data.currentMedications) {
    console.log('💊 BEFORE translation - Current medications:', {
      original: data.currentMedications,
      lineCount: data.currentMedications.split('\n').filter(line => line.trim()).length,
      length: data.currentMedications.length
    })
    
    normalized.currentMedications = await translateText(data.currentMedications)
    
    console.log('💊 AFTER translation - Current medications:', {
      translated: normalized.currentMedications,
      lineCount: normalized.currentMedications.split('\n').filter(line => line.trim()).length,
      length: normalized.currentMedications.length
    })
  }

  // Symptom duration
  if (data.symptomDuration) {
    normalized.symptomDuration = data.symptomDuration
  }

  console.log('🔄 Data normalization completed:', {
    original: {
      otherAllergies: data.otherAllergies,
      otherMedicalHistory: data.otherMedicalHistory,
      medicalHistory: data.medicalHistory,
      currentMedications: data.currentMedications
    },
    normalized: {
      otherAllergies: normalized.otherAllergies,
      otherMedicalHistory: normalized.otherMedicalHistory,
      medicalHistory: normalized.medicalHistory,
      currentMedications: normalized.currentMedications
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

      // Phase 1 hybrid: read consultation mode + presential actor from URL.
      // Persist consultationMode in sessionStorage so the report components can
      // forward it in the final TIBOK payload without re-parsing the URL.
      // Defaults: 'telemedicine' (back-compat with TIBOK URLs that predate the
      // hybrid feature) and presentialActor=null when absent.
      const consultationModeParam = urlParams.get('consultationMode')
      const presentialActorParam = urlParams.get('presentialActor')
      if (consultationModeParam) {
        sessionStorage.setItem('tibokConsultationMode', consultationModeParam)
        console.log('🏥 TIBOK consultation mode:', consultationModeParam,
          presentialActorParam ? `(actor=${presentialActorParam})` : '')
      }
      if (presentialActorParam) {
        sessionStorage.setItem('tibokPresentialActor', presentialActorParam)
      }

      console.log('🔍 TIBOK Data Check:', {
        source,
        hasPatientData: !!patientDataParam,
        hasDoctorData: !!doctorDataParam,
        consultationId,
        patientId,
        doctorId,
        consultationMode: consultationModeParam || '(default telemedicine)',
        presentialActor: presentialActorParam || null,
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
          
          // ADD THIS NEW CODE BLOCK - Check for prescription renewal
          if (normalizedPatientData.consultationReason) {
            const lowerReason = normalizedPatientData.consultationReason.toLowerCase()
            const isRenewal = lowerReason.includes('renewal') || 
                              lowerReason.includes('renouvellement') ||
                              lowerReason.includes('ordonnance') ||
                              lowerReason.includes('prescription') ||
                              lowerReason.includes('refill') ||
                              lowerReason.includes('order renewal')
            
            if (isRenewal) {
              console.log('💊 Prescription renewal detected from Tibok:', normalizedPatientData.consultationReason)
              
              // Dispatch event to notify the main component
              window.dispatchEvent(new CustomEvent('prescription-renewal-detected', {
                detail: { 
                  consultationReason: normalizedPatientData.consultationReason,
                  isRenewal: true 
                }
              }))
            }
          }
          // END OF NEW CODE BLOCK
          
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
