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

// ✅ ADD: Data normalization function to translate French to English
function normalizeLifestyleData(data: any): any {
  // Translation mappings
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
    'Intense': 'intense'
  }

  const medicalConditionsMap: Record<string, string> = {
    'Hypertension': 'Hypertension',
    'Diabète de type 2': 'Type 2 Diabetes',
    'Diabète de type 1': 'Type 1 Diabetes',
    'Asthme': 'Asthma',
    'Maladie cardiaque': 'Heart disease',
    'Dépression/Anxiété': 'Depression/Anxiety',
    'Arthrite': 'Arthritis',
    'Migraine': 'Migraine',
    'Reflux gastro-œsophagien': 'GERD (Gastroesophageal reflux)',
    'Cholestérol élevé': 'High cholesterol'
  }

  const allergiesMap: Record<string, string> = {
    'Pénicilline': 'Penicillin',
    'Aspirine': 'Aspirin',
    'Anti-inflammatoires (Ibuprofène, Diclofénac)': 'NSAIDs (Ibuprofen, Diclofenac)',
    'Codéine': 'Codeine',
    'Latex': 'Latex',
    'Iode': 'Iodine',
    'Anesthésiques locaux': 'Local anesthetics',
    'Sulfamides': 'Sulfonamides'
  }

  const symptomsMap: Record<string, string> = {
    'Douleur thoracique': 'Chest pain',
    'Essoufflement': 'Shortness of breath',
    'Palpitations': 'Palpitations',
    'Fatigue': 'Fatigue',
    'Nausées': 'Nausea',
    'Vomissements': 'Vomiting',
    'Diarrhée': 'Diarrhea',
    'Constipation': 'Constipation',
    'Maux de tête': 'Headache',
    'Vertiges': 'Dizziness',
    'Fièvre': 'Fever',
    'Frissons': 'Chills',
    'Toux': 'Cough',
    'Douleur abdominale': 'Abdominal pain',
    'Mal de dos': 'Back pain',
    'Insomnie': 'Insomnia',
    'Anxiété': 'Anxiety',
    'Perte d\'appétit': 'Loss of appetite',
    'Perte de poids': 'Weight loss',
    'Gonflement des jambes': 'Leg swelling',
    'Douleur articulaire': 'Joint pain',
    'Éruption cutanée': 'Rash',
    'Vision floue': 'Blurred vision',
    'Problèmes d\'audition': 'Hearing problems'
  }

  const symptomDurationMap: Record<string, string> = {
    'quelques-heures': 'a few hours',
    '1-jour': '1 day',
    '2-3-jours': '2-3 days',
    '1-semaine': '1 week',
    '2-semaines': '2 weeks',
    '1-mois': '1 month',
    'plusieurs-mois': 'several months',
    'plus-6-mois': 'more than 6 months'
  }

  // ADD THIS NEW MAPPING for consultation reasons
  const consultationReasonMap: Record<string, string> = {
    'Consultation générale': 'General consultation',
    'Bilan de santé': 'Health check-up',
    'Fièvre': 'Fever',
    'Grippe': 'Flu',
    'Symptômes grippaux': 'Flu-like symptoms',
    'Douleurs abdominales': 'Abdominal pain',
    'Troubles digestifs': 'Digestive problems',
    'Maux de tête': 'Headache',
    'Migraine': 'Migraine',
    'Toux': 'Cough',
    'Problèmes respiratoires': 'Respiratory problems',
    'Mal de dos': 'Back pain',
    'Douleurs musculaires': 'Muscle pain',
    'Douleur à l\'oreille': 'Ear pain',
    'Problèmes auditifs': 'Hearing problems',
    'Problèmes de vue': 'Vision problems',
    'Irritation oculaire': 'Eye irritation',
    'Problème de peau': 'Skin problem',
    'Éruption cutanée': 'Skin rash',
    'Stress': 'Stress',
    'Anxiété': 'Anxiety',
    'Santé mentale': 'Mental health',
    'Renouvellement d\'ordonnance': 'Prescription renewal',
    'Consultation pédiatrique': 'Pediatric consultation',
    'Autre motif (préciser)': 'Other reason (specify)'
  }

  // Helper function to translate array values
  const translateArray = (arr: string[], map: Record<string, string>): string[] => {
    return arr.map(item => map[item] || item).filter(item => item.trim() !== '')
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

  // Medical history
  if (Array.isArray(data.medicalHistory)) {
    normalized.medicalHistory = translateArray(data.medicalHistory, medicalConditionsMap)
  }

  // Allergies
  if (Array.isArray(data.allergies)) {
    normalized.allergies = translateArray(data.allergies, allergiesMap)
  }

  // Current symptoms
  if (Array.isArray(data.currentSymptoms)) {
    normalized.currentSymptoms = translateArray(data.currentSymptoms, symptomsMap)
  }

  // Symptom duration
  if (data.symptomDuration) {
    normalized.symptomDuration = symptomDurationMap[data.symptomDuration] || data.symptomDuration
  }

  // ADD THIS: Translate consultation reason
  if (data.consultationReason) {
    // Check if it starts with "Autre motif" and contains custom text
    const autreMotifPattern = /^Autre motif \(préciser\)[\s::\-]*(.+)$/i
    const match = data.consultationReason.match(autreMotifPattern)
    
    if (match && match[1]) {
      // It's a custom reason - keep the pattern but note it needs further translation
      normalized.consultationReason = `Other reason (specify): ${match[1].trim()}`
      console.log('🔄 Found custom consultation reason:', data.consultationReason, '→', normalized.consultationReason)
    } else if (consultationReasonMap[data.consultationReason]) {
      // Standard reason - translate directly
      normalized.consultationReason = consultationReasonMap[data.consultationReason]
    } else {
      // Unknown format - keep as is but log for debugging
      normalized.consultationReason = data.consultationReason
      console.warn('⚠️ Unknown consultation reason format:', data.consultationReason)
    }
  }

  console.log('🔄 Data normalization completed:', {
    original: {
      smoking: data.smokingStatus,
      alcohol: data.alcoholConsumption,
      activity: data.physicalActivity,
      symptoms: data.currentSymptoms,
      duration: data.symptomDuration,
      consultationReason: data.consultationReason
    },
    normalized: {
      smoking: normalized.smokingStatus,
      alcohol: normalized.alcoholConsumption,
      activity: normalized.physicalActivity,
      symptoms: normalized.currentSymptoms,
      duration: normalized.symptomDuration,
      consultationReason: normalized.consultationReason
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
        
        // ✅ APPLY NORMALIZATION: Translate French values to English
        const normalizedPatientData = normalizeLifestyleData(parsedPatientData)
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

    // Also listen for custom events (fallback)
    const handlePatientData = (event: CustomEvent) => {
      console.log('📡 Received patient data via custom event:', event.detail)
      
      // Apply normalization to event data as well
      let normalizedEventData = event.detail
      if (event.detail.patient) {
        normalizedEventData.patient = normalizeLifestyleData(event.detail.patient)
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
