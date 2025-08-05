"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowRight,
  User, 
  Heart, 
  AlertTriangle, 
  Pill, 
  Activity, 
  Search,
  Check,
  X,
  CheckCircle,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Home
} from "lucide-react"
import { useTibokPatientData } from "@/hooks/use-tibok-patient-data"
import { getTranslation, Language } from "@/lib/translations"

// ==================== INTERFACES & TYPES ====================
interface LifeHabits {
  smoking: string
  alcohol: string
  physicalActivity: string
}

interface PatientFormData {
  // Personal information
  firstName: string
  lastName: string
  birthDate: string
  age: string
  gender: string
  
  // Physical data
  weight: string
  height: string
  
  // Contact
  phone: string
  email: string
  address: string
  city: string
  country: string
  
  // Medical information
  allergies: string[]
  otherAllergies: string
  medicalHistory: string[]
  otherMedicalHistory: string
  currentMedicationsText: string
  
  // Life habits
  lifeHabits: LifeHabits
}

interface PatientFormProps {
  onDataChange: (data: PatientFormData) => void
  onNext: () => void
  language?: Language
  consultationId?: string | null
  initialData?: Partial<PatientFormData>
}

interface ValidationErrors {
  [key: string]: string
}

// ==================== CONSTANTS ====================
const INITIAL_FORM_DATA: PatientFormData = {
  firstName: "",
  lastName: "",
  birthDate: "",
  age: "",
  gender: "",
  weight: "",
  height: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "Mauritius",
  allergies: [],
  otherAllergies: "",
  medicalHistory: [],
  otherMedicalHistory: "",
  currentMedicationsText: "",
  lifeHabits: {
    smoking: "",
    alcohol: "",
    physicalActivity: ""
  }
}

const SECTIONS = [
  { id: "identity", titleKey: 'patientForm.personalInfo', icon: User },
  { id: "contact", titleKey: 'patientForm.contactInfo', icon: Phone },
  { id: "allergies", titleKey: 'patientForm.knownAllergies', icon: AlertTriangle },
  { id: "history", titleKey: 'patientForm.medicalHistory', icon: Heart },
  { id: "medications", titleKey: 'patientForm.currentMedications', icon: Pill },
  { id: "habits", titleKey: 'patientForm.lifestyle', icon: Activity },
]

// ==================== MAIN COMPONENT ====================
export default function ModernPatientForm({ 
  onDataChange, 
  onNext, 
  language = 'en',
  consultationId,
  initialData
}: PatientFormProps) {
  // ========== Hooks ==========
  const { patientData: tibokPatient, isFromTibok } = useTibokPatientData()
  const t = useCallback((key: string) => getTranslation(key, language), [language])
  
  // ========== States ==========
  const [isLoading, setIsLoading] = useState(true)
  const [dataInitialized, setDataInitialized] = useState(false)
  const [formData, setFormData] = useState<PatientFormData>(() => ({
    ...INITIAL_FORM_DATA,
    ...initialData
  }))
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [allergySearch, setAllergySearch] = useState("")
  const [historySearch, setHistorySearch] = useState("")
  const [currentSection, setCurrentSection] = useState(0)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // ========== Memoization of translated lists ==========
  const COMMON_ALLERGIES = useMemo(() => [
    "Penicillin",
    "Aspirin",
    "NSAIDs (Ibuprofen, Diclofenac)",
    "Codeine",
    "Latex",
    "Iodine",
    "Local anesthetics",
    "Sulfonamides",
  ], [])

  const COMMON_MEDICAL_HISTORY = useMemo(() => [
    "Hypertension",
    "Type 2 Diabetes",
    "Type 1 Diabetes",
    "Asthma",
    "Heart disease",
    "Depression/Anxiety",
    "Arthritis",
    "Migraine",
    "GERD (Gastroesophageal reflux)",
    "High cholesterol",
  ], [])

  // ✅ ADD: Lifestyle mapping functions
  const mapSmokingStatus = useCallback((smokingStatus: string): string => {
    const statusLower = smokingStatus?.toLowerCase() || ''
    
    // Map English values from TIBOK hook normalization
    if (statusLower.includes('non-smoker') || statusLower.includes('never')) return 'non'
    if (statusLower.includes('current') || statusLower.includes('smoker')) return 'actuel'
    if (statusLower.includes('former') || statusLower.includes('ex')) return 'ancien'
    
    // Map French values (in case normalization didn't occur)
    if (statusLower.includes('non-fumeur')) return 'non'
    if (statusLower.includes('fumeur actuel')) return 'actuel'
    if (statusLower.includes('ex-fumeur')) return 'ancien'
    
    return ''
  }, [])

  const mapAlcoholConsumption = useCallback((alcoholConsumption: string): string => {
    const consumptionLower = alcoholConsumption?.toLowerCase() || ''
    
    // Map English values from TIBOK hook normalization
    if (consumptionLower.includes('never')) return 'jamais'
    if (consumptionLower.includes('occasional')) return 'occasionnel'
    if (consumptionLower.includes('regular')) return 'regulier'
    
    // Map French values (in case normalization didn't occur)
    if (consumptionLower.includes('jamais')) return 'jamais'
    if (consumptionLower.includes('occasionnel')) return 'occasionnel'
    if (consumptionLower.includes('régulier')) return 'regulier'
    
    return ''
  }, [])

  const mapPhysicalActivity = useCallback((physicalActivity: string): string => {
    const activityLower = physicalActivity?.toLowerCase() || ''
    
    // Map English values from TIBOK hook normalization
    if (activityLower.includes('sedentary')) return 'sedentaire'
    if (activityLower.includes('moderate')) return 'moderee'
    if (activityLower.includes('intense')) return 'intense'
    
    // Map French values (in case normalization didn't occur)
    if (activityLower.includes('sédentaire')) return 'sedentaire'
    if (activityLower.includes('modéré')) return 'moderee'
    if (activityLower.includes('intense')) return 'intense'
    
    return ''
  }, [])

  // ========== Utility functions ==========
  const calculateAge = useCallback((birthDate: string): string => {
    if (!birthDate) return ""
    
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age >= 0 ? age.toString() : ""
  }, [])

  const calculateBMI = useCallback((): string | null => {
    const weight = parseFloat(formData.weight)
    const height = parseFloat(formData.height)
    
    if (!isNaN(weight) && !isNaN(height) && height > 0) {
      const heightInMeters = height / 100
      const bmi = weight / (heightInMeters * heightInMeters)
      return bmi.toFixed(1)
    }
    
    return null
  }, [formData.weight, formData.height])

  const getBMICategory = useCallback((bmi: number) => {
    if (bmi < 18.5) return { 
      text: "Underweight", 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      icon: "📉" 
    }
    if (bmi < 25) return { 
      text: "Normal weight", 
      color: "bg-green-100 text-green-800 border-green-200", 
      icon: "✅" 
    }
    if (bmi < 30) return { 
      text: "Overweight", 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      icon: "⚠️" 
    }
    return { 
      text: "Obesity", 
      color: "bg-red-100 text-red-800 border-red-200", 
      icon: "🔴" 
    }
  }, [])

  const calculateProgress = useCallback((): number => {
    const requiredFields = [
      formData.firstName,
      formData.lastName,
      formData.birthDate,
      formData.gender,
      formData.weight,
      formData.height
    ]
    
    const optionalFields = [
      formData.phone,
      formData.email,
      formData.lifeHabits.smoking,
      formData.lifeHabits.alcohol,
      formData.lifeHabits.physicalActivity
    ]
    
    const requiredCompleted = requiredFields.filter(field => field && field.trim()).length
    const optionalCompleted = optionalFields.filter(field => field && field.trim()).length
    
    const totalFields = requiredFields.length + optionalFields.length
    const totalCompleted = requiredCompleted + optionalCompleted
    
    return Math.round((totalCompleted / totalFields) * 100)
  }, [formData])

  const normalizeGender = useCallback((gender: any): string => {
    if (!gender) return ""
    
    const g = String(gender).toLowerCase().trim()
    const maleVariants = ['m', 'male', 'masculin', 'homme', 'man']
    const femaleVariants = ['f', 'female', 'féminin', 'femme', 'woman']
    
    if (maleVariants.includes(g)) return 'Male'
    if (femaleVariants.includes(g)) return 'Female'
    
    return gender
  }, [])

  const transformDataForAPI = useCallback((data: PatientFormData) => {
    const sexe = data.gender === 'Male' ? 'Male' : 
                 data.gender === 'Female' ? 'Female' : 
                 data.gender || 'Not specified'

    const allergiesArray = [...data.allergies]
    if (data.otherAllergies?.trim()) {
      allergiesArray.push(data.otherAllergies.trim())
    }

    const historyArray = [...data.medicalHistory]
    if (data.otherMedicalHistory?.trim()) {
      historyArray.push(data.otherMedicalHistory.trim())
    }

    return {
      // Personal information
      nom: data.lastName || '',
      prenom: data.firstName || '',
      dateNaissance: data.birthDate || '',
      age: data.age || '',
      sexe: sexe,
      sex: sexe,
      gender: sexe,
      
      // Contact
      telephone: data.phone || '',
      email: data.email || '',
      adresse: data.address || '',
      ville: data.city || '',
      pays: data.country || 'Mauritius',
      
      // Medical data
      poids: data.weight || '',
      taille: data.height || '',
      allergies: allergiesArray.join(', ') || 'No known allergies',
      antecedents: historyArray.join(', ') || 'No significant history',
      medicamentsActuels: data.currentMedicationsText || 'None',
      
      // Life habits
      habitudes: {
        tabac: data.lifeHabits.smoking || 'Not specified',
        alcool: data.lifeHabits.alcohol || 'Not specified',
        activitePhysique: data.lifeHabits.physicalActivity || 'Not specified'
      }
    }
  }, [])

  // ========== Event handlers ==========
  const handleInputChange = useCallback((field: keyof PatientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [errors])

  const handleLifeHabitsChange = useCallback((field: keyof LifeHabits, value: string) => {
    setFormData(prev => ({
      ...prev,
      lifeHabits: { ...prev.lifeHabits, [field]: value }
    }))
  }, [])

  const handleAllergyToggle = useCallback((allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }))
  }, [])

  const handleMedicalHistoryToggle = useCallback((condition: string) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: prev.medicalHistory.includes(condition)
        ? prev.medicalHistory.filter(h => h !== condition)
        : [...prev.medicalHistory, condition]
    }))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) {
        const elements = Array.from(form.elements) as HTMLElement[]
        const currentIndex = elements.indexOf(e.currentTarget as HTMLElement)
        const nextElement = elements[currentIndex + 1]
        if (nextElement && 'focus' in nextElement) {
          nextElement.focus()
        }
      }
    }
  }, [])

  // ========== Validation ==========
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}

    // Required fields
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = "Birth date is required"
    } else {
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      if (birthDate > today) {
        newErrors.birthDate = "Birth date cannot be in the future"
      }
    }
    
    if (!formData.gender) {
      newErrors.gender = "Gender is required"
    }
    
    const weight = parseFloat(formData.weight)
    if (!formData.weight || isNaN(weight) || weight < 1 || weight > 500) {
      newErrors.weight = "Valid weight is required (1-500 kg)"
    }
    
    const height = parseFloat(formData.height)
    if (!formData.height || isNaN(height) || height < 50 || height > 250) {
      newErrors.height = "Valid height is required (50-250 cm)"
    }

    // Email validation if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onNext()
    } else {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus()
      }
    }
  }, [validateForm, onNext, errors])

  // ========== Effects ==========
  
  // Update age when birth date changes
  useEffect(() => {
    if (formData.birthDate) {
      const newAge = calculateAge(formData.birthDate)
      if (newAge !== formData.age) {
        setFormData(prev => ({ ...prev, age: newAge }))
      }
    }
  }, [formData.birthDate, formData.age, calculateAge])

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (dataInitialized) return
      
      try {
        setIsLoading(true)
        
        // 1. Check URL data
        const urlParams = new URLSearchParams(window.location.search)
        const source = urlParams.get('source')
        const patientDataParam = urlParams.get('patientData')
        
        let patientInfo = null
        
        // 2. Retrieve patient data (URL or TIBOK)
        if (source === 'tibok' && patientDataParam) {
          try {
            patientInfo = JSON.parse(decodeURIComponent(patientDataParam))
          } catch (e) {
            console.error('Error parsing URL data:', e)
          }
        } else if (tibokPatient) {
          patientInfo = tibokPatient
        }
        
        // 3. If we have patient data, use it
        if (patientInfo) {
          console.log('🔄 Auto-filling patient form with TIBOK data:', {
            allergies: patientInfo.allergies,
            medicalHistory: patientInfo.medicalHistory, 
            currentMedications: patientInfo.currentMedications,
            smokingStatus: patientInfo.smokingStatus,
            alcoholConsumption: patientInfo.alcoholConsumption,
            physicalActivity: patientInfo.physicalActivity
          })

          // ✅ NORMALIZE ALLERGIES - Map TIBOK values to form values
          const normalizedAllergies = Array.isArray(patientInfo.allergies) 
            ? patientInfo.allergies.map(allergy => {
                // DEBUG: Log what we're trying to map
                console.log('🔧 Mapping allergy:', allergy)
                
                // Map TIBOK allergy values to form values
                switch(allergy.toLowerCase().trim()) {
                  case 'aspirin': return 'Aspirin'
                  case 'aspirine': return 'Aspirin'
                  case 'penicillin': return 'Penicillin'
                  case 'pénicilline': return 'Penicillin'
                  case 'ibuprofen': return 'NSAIDs (Ibuprofen, Diclofenac)'
                  case 'ibuprofène': return 'NSAIDs (Ibuprofen, Diclofenac)'
                  case 'nsaids (ibuprofen, diclofenac)': return 'NSAIDs (Ibuprofen, Diclofenac)'
                  case 'anti-inflammatoires (ibuprofène, diclofénac)': return 'NSAIDs (Ibuprofen, Diclofenac)'
                  case 'codeine': return 'Codeine'
                  case 'codéine': return 'Codeine'
                  case 'latex': return 'Latex'
                  case 'iodine': return 'Iodine'
                  case 'iode': return 'Iodine'
                  case 'local anesthetics': return 'Local anesthetics'
                  case 'anesthésiques locaux': return 'Local anesthetics'
                  case 'sulfonamides': return 'Sulfonamides'
                  case 'sulfamides': return 'Sulfonamides'
                  default: 
                    console.warn('⚠️ Unknown allergy:', allergy)
                    return allergy // Keep original if no mapping found
                }
              })
            : []

          // ✅ FIXED MEDICAL HISTORY MAPPING - Handle diabete-t1 and other conditions
          const normalizedMedicalHistory = Array.isArray(patientInfo.medicalHistory)
            ? patientInfo.medicalHistory.map(condition => {
                // DEBUG: Log what we're trying to map
                console.log('🔧 Mapping medical condition:', condition)
                
                switch(condition.toLowerCase().trim()) {
                  case 'diabete-t1': return 'Type 1 Diabetes'
                  case 'diabete-t2': return 'Type 2 Diabetes'  
                  case 'type 1 diabetes': return 'Type 1 Diabetes'
                  case 'diabète de type 1': return 'Type 1 Diabetes'
                  case 'type 2 diabetes': return 'Type 2 Diabetes'
                  case 'diabète de type 2': return 'Type 2 Diabetes'
                  case 'hypertension': return 'Hypertension'
                  case 'asthma': return 'Asthma'
                  case 'asthme': return 'Asthma'
                  case 'heart disease': return 'Heart disease'
                  case 'maladie cardiaque': return 'Heart disease'
                  case 'depression': return 'Depression/Anxiety'
                  case 'dépression': return 'Depression/Anxiety'
                  case 'anxiety': return 'Depression/Anxiety'
                  case 'anxiété': return 'Depression/Anxiety'
                  case 'depression/anxiety': return 'Depression/Anxiety'
                  case 'dépression/anxiété': return 'Depression/Anxiety'
                  case 'arthritis': return 'Arthritis'
                  case 'arthrite': return 'Arthritis'
                  case 'migraine': return 'Migraine'
                  case 'gerd': return 'GERD (Gastroesophageal reflux)'
                  case 'reflux': return 'GERD (Gastroesophageal reflux)'
                  case 'gerd (gastroesophageal reflux)': return 'GERD (Gastroesophageal reflux)'
                  case 'reflux gastro-œsophagien': return 'GERD (Gastroesophageal reflux)'
                  case 'high cholesterol': return 'High cholesterol'
                  case 'cholestérol élevé': return 'High cholesterol'
                  default: 
                    console.warn('⚠️ Unknown medical condition:', condition)
                    return condition // Keep original if no mapping found
                }
              })
            : []

          // ✅ FIXED LIFESTYLE MAPPING with proper debugging
          const mappedLifestyle = {
            smoking: (() => {
              console.log('🔧 Mapping smoking status:', patientInfo.smokingStatus)
              switch(patientInfo.smokingStatus?.toLowerCase().trim()) {
                case 'fumeur-actuel': return 'actuel'
                case 'current-smoker': return 'actuel'
                case 'non-smoker': return 'non'
                case 'non': return 'non'
                case 'ex-smoker': return 'ancien'
                case 'ancien': return 'ancien'
                default: 
                  console.warn('⚠️ Unknown smoking status:', patientInfo.smokingStatus)
                  return patientInfo.smokingStatus || ""
              }
            })(),
            
            alcohol: (() => {
              console.log('🔧 Mapping alcohol consumption:', patientInfo.alcoholConsumption)
              switch(patientInfo.alcoholConsumption?.toLowerCase().trim()) {
                case 'occasional': return 'occasionnel'
                case 'occasionnel': return 'occasionnel'
                case 'never': return 'jamais'
                case 'jamais': return 'jamais'
                case 'regular': return 'regulier'
                case 'regulier': return 'regulier'
                default:
                  console.warn('⚠️ Unknown alcohol consumption:', patientInfo.alcoholConsumption)
                  return patientInfo.alcoholConsumption || ""
              }
            })(),
            
            physicalActivity: (() => {
              console.log('🔧 Mapping physical activity:', patientInfo.physicalActivity)
              switch(patientInfo.physicalActivity?.toLowerCase().trim()) {
                case 'sedentaire': return 'sedentaire'
                case 'sedentary': return 'sedentaire'
                case 'moderate': return 'moderee'
                case 'moderee': return 'moderee'
                case 'intense': return 'intense'
                default:
                  console.warn('⚠️ Unknown physical activity:', patientInfo.physicalActivity)
                  return patientInfo.physicalActivity || ""
              }
            })()
          }

          console.log('🔧 NORMALIZED DATA:', {
            originalAllergies: patientInfo.allergies,
            normalizedAllergies: normalizedAllergies,
            originalMedicalHistory: patientInfo.medicalHistory,
            normalizedMedicalHistory: normalizedMedicalHistory,
            originalLifestyle: {
              smoking: patientInfo.smokingStatus,
              alcohol: patientInfo.alcoholConsumption,
              activity: patientInfo.physicalActivity
            },
            mappedLifestyle: mappedLifestyle
          })

          const newFormData: PatientFormData = {
            firstName: patientInfo.firstName || patientInfo.first_name || "",
            lastName: patientInfo.lastName || patientInfo.last_name || "",
            birthDate: (patientInfo.dateOfBirth || patientInfo.date_of_birth || "").split('T')[0],
            age: patientInfo.age?.toString() || "",
            gender: normalizeGender(patientInfo.gender),
            weight: patientInfo.weight?.toString() || "",
            height: patientInfo.height?.toString() || "",
            phone: patientInfo.phone || patientInfo.phone_number || patientInfo.phoneNumber || "",
            email: patientInfo.email || "",
            address: patientInfo.address || "",
            city: patientInfo.city || "",
            country: patientInfo.country || "Mauritius",
            
            // ✅ FIXED AUTO-FILL MEDICAL DATA FROM TIBOK
            allergies: normalizedAllergies, // Use normalized allergies
            otherAllergies: patientInfo.otherAllergies || "",
            medicalHistory: normalizedMedicalHistory, // Use normalized medical history
            otherMedicalHistory: patientInfo.otherMedicalHistory || "",
            currentMedicationsText: patientInfo.currentMedications || "",
            
            // ✅ FIXED: Use mapped lifestyle data
            lifeHabits: mappedLifestyle
          }
          
          console.log('✅ Patient form auto-filled successfully:', {
            allergiesCount: newFormData.allergies.length,
            medicalHistoryCount: newFormData.medicalHistory.length,
            hasMedications: !!newFormData.currentMedicationsText,
            lifestyle: newFormData.lifeHabits
          })
          
          setFormData(newFormData)
          setDataInitialized(true)
        }
        // 4. Otherwise load from database
        else if (consultationId) {
          const savedData = await consultationDataService.getAllData()
          if (savedData?.patientData) {
            setFormData(prev => ({
              ...prev,
              ...savedData.patientData
            }))
            setDataInitialized(true)
          }
        }
        
      } catch (error) {
        console.error('Error initializing data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeData()
  }, [consultationId, tibokPatient, dataInitialized, normalizeGender, mapSmokingStatus, mapAlcoholConsumption, mapPhysicalActivity])

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.firstName || formData.lastName) {
        try {
          // Save data
          await consultationDataService.saveStepData(0, formData)
          setLastSaved(new Date())
          
          // Notify parent
          onDataChange(formData)
        } catch (error) {
          console.error('Error saving:', error)
        }
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [formData, onDataChange])

  // ========== Conditional rendering ==========
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    )
  }

  // ========== Calculated variables ==========
  const bmi = calculateBMI()
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null
  const progress = calculateProgress()
  const showTibokNotification = dataInitialized && isFromTibok

  const filteredAllergies = COMMON_ALLERGIES.filter(allergy =>
    allergy.toLowerCase().includes(allergySearch.toLowerCase())
  )

  const filteredHistory = COMMON_MEDICAL_HISTORY.filter(condition =>
    condition.toLowerCase().includes(historySearch.toLowerCase())
  )

  // ========== Main render ==========
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {/* TIBOK Notification */}
      {showTibokNotification && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Patient information retrieved from TIBOK for {formData.firstName} {formData.lastName}
            </p>
          </div>
        </div>
      )}

      {/* Header with progress */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            <User className="h-8 w-8 text-blue-600" />
            Patient Information
          </CardTitle>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Form Progress</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Quick navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SECTIONS.map((section, index) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setCurrentSection(index)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
              currentSection === index
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{t(section.titleKey)}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Identity */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <User className="h-6 w-6" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2 font-medium">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.firstName ? "border-red-500" : ""}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2 font-medium">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.lastName ? "border-red-500" : ""}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="birthDate" className="flex items-center gap-2 font-medium">
                Birth Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange("birthDate", e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.birthDate ? "border-red-500" : ""}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.birthDate && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.birthDate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Calculated Age</Label>
              <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-gray-50">
                <span className="text-gray-700 font-medium">
                  {formData.age ? `${formData.age} years` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2 font-medium">
              Gender <span className="text-red-500">*</span>
            </Label>
            
            <RadioGroup
              value={formData.gender}
              onValueChange={(value) => handleInputChange("gender", value)}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label 
                  htmlFor="gender-male"
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    formData.gender === 'Male' 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <RadioGroupItem value="Male" id="gender-male" />
                  <span className="text-sm font-medium">Male</span>
                </label>

                <label 
                  htmlFor="gender-female"
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    formData.gender === 'Female' 
                      ? "border-pink-500 bg-pink-50" 
                      : "border-gray-200 hover:border-pink-300"
                  }`}
                >
                  <RadioGroupItem value="Female" id="gender-female" />
                  <span className="text-sm font-medium">Female</span>
                </label>
              </div>
            </RadioGroup>

            {errors.gender && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" />
                {errors.gender}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2 font-medium">
                Weight (kg) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                onKeyDown={handleKeyDown}
                min="1"
                max="500"
                step="0.1"
                className={errors.weight ? "border-red-500" : ""}
                placeholder="70.5"
              />
              {errors.weight && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.weight}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="height" className="flex items-center gap-2 font-medium">
                Height (cm) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                onKeyDown={handleKeyDown}
                min="50"
                max="250"
                className={errors.height ? "border-red-500" : ""}
                placeholder="175"
              />
              {errors.height && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.height}
                </p>
              )}
            </div>
          </div>

          {bmi && bmiCategory && (
            <div className={`p-4 rounded-lg border-2 ${bmiCategory.color} transition-all`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bmiCategory.icon}</span>
                <div>
                  <p className="font-semibold">BMI: {bmi} kg/m²</p>
                  <p className="text-sm">{bmiCategory.text}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Contact */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Phone className="h-6 w-6" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 font-medium">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="+230 5XXX XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="patient@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2 font-medium">
              <Home className="h-4 w-4" />
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter your full address..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                City
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Port Louis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                Country
              </Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mauritius"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Allergies */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            Known Allergies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search allergies..."
              value={allergySearch}
              onChange={(e) => setAllergySearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredAllergies.map((allergy) => (
              <label
                key={allergy}
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  formData.allergies.includes(allergy)
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 hover:border-red-300 hover:bg-red-50/50"
                }`}
              >
                <Checkbox
                  checked={formData.allergies.includes(allergy)}
                  onCheckedChange={() => handleAllergyToggle(allergy)}
                />
                <span className="text-sm font-medium">{allergy}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherAllergies">Other Allergies</Label>
            <Textarea
              id="otherAllergies"
              value={formData.otherAllergies}
              onChange={(e) => handleInputChange("otherAllergies", e.target.value)}
              placeholder="List any other allergies not mentioned above..."
              rows={3}
              className="resize-none"
            />
          </div>

          {(formData.allergies.length > 0 || formData.otherAllergies) && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-red-800">Declared Allergies</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.allergies.map((allergy) => (
                  <Badge key={allergy} variant="destructive" className="text-xs">
                    {allergy}
                  </Badge>
                ))}
                {formData.otherAllergies && (
                  <Badge variant="destructive" className="text-xs">
                    {formData.otherAllergies}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Medical History */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Heart className="h-6 w-6" />
            Medical History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search medical conditions..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHistory.map((condition) => (
              <label
                key={condition}
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  formData.medicalHistory.includes(condition)
                    ? "border-purple-400 bg-purple-50"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                }`}
              >
                <Checkbox
                  checked={formData.medicalHistory.includes(condition)}
                  onCheckedChange={() => handleMedicalHistoryToggle(condition)}
                />
                <span className="text-sm font-medium">{condition}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherMedicalHistory">Other Medical History</Label>
            <Textarea
              id="otherMedicalHistory"
              value={formData.otherMedicalHistory}
              onChange={(e) => handleInputChange("otherMedicalHistory", e.target.value)}
              placeholder="List any other medical conditions, surgeries, or hospitalizations..."
              rows={3}
              className="resize-none"
            />
          </div>

          {(formData.medicalHistory.length > 0 || formData.otherMedicalHistory) && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-purple-600" />
                <p className="font-semibold text-purple-800">Declared Medical History</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.medicalHistory.map((condition) => (
                  <Badge key={condition} className="bg-purple-100 text-purple-800 text-xs">
                    {condition}
                  </Badge>
                ))}
                {formData.otherMedicalHistory && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    Other
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Current Medications */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Pill className="h-6 w-6" />
            Current Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentMedicationsText">Ongoing Treatments</Label>
            <Textarea
              id="currentMedicationsText"
              value={formData.currentMedicationsText}
              onChange={(e) => handleInputChange("currentMedicationsText", e.target.value)}
              placeholder="List all medications you are currently taking...
Example:
- Aspirin 100mg - once daily
- Metformin 500mg - twice daily"
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">Please include medication name, dosage, and frequency</p>
          </div>

          {formData.currentMedicationsText && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-800">
                  Treatments entered (
                  {formData.currentMedicationsText.split('\n').filter(line => line.trim()).length} 
                  {' '}lines)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Lifestyle */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            Lifestyle
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tobacco */}
            <div className="space-y-4">
              <Label className="font-medium text-lg flex items-center gap-2">
                🚬 Tobacco Use
              </Label>
              <RadioGroup
                value={formData.lifeHabits.smoking}
                onValueChange={(value) => handleLifeHabitsChange("smoking", value)}
              >
                {[
                  { value: 'non', label: 'Non-smoker' },
                  { value: 'actuel', label: 'Current smoker' },
                  { value: 'ancien', label: 'Ex-smoker' }
                ].map(option => (
                  <label 
                    key={option.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      formData.lifeHabits.smoking === option.value
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={`smoking-${option.value}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Alcohol */}
            <div className="space-y-4">
              <Label className="font-medium text-lg flex items-center gap-2">
                🍷 Alcohol Consumption
              </Label>
              <RadioGroup
                value={formData.lifeHabits.alcohol}
                onValueChange={(value) => handleLifeHabitsChange("alcohol", value)}
              >
                {[
                  { value: 'jamais', label: 'Never' },
                  { value: 'occasionnel', label: 'Occasional' },
                  { value: 'regulier', label: 'Regular' }
                ].map(option => (
                  <label 
                    key={option.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      formData.lifeHabits.alcohol === option.value
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={`alcohol-${option.value}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Physical Activity */}
            <div className="space-y-4">
              <Label className="font-medium text-lg flex items-center gap-2">
                🏃 Physical Activity
              </Label>
              <RadioGroup
                value={formData.lifeHabits.physicalActivity}
                onValueChange={(value) => handleLifeHabitsChange("physicalActivity", value)}
              >
                {[
                  { value: 'sedentaire', label: 'Sedentary' },
                  { value: 'moderee', label: 'Moderate' },
                  { value: 'intense', label: 'Intense' }
                ].map(option => (
                  <label 
                    key={option.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      formData.lifeHabits.physicalActivity === option.value
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={`activity-${option.value}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-save indicator */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">
            Auto-saving
            {lastSaved && (
              <span className="ml-2 text-xs text-gray-500">
                ({new Date(lastSaved).toLocaleTimeString()})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-center pt-4">
        <Button 
          type="submit"
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Continue to Clinical Information
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </form>
  )
}
