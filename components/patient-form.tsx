"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  Info,
  CheckCircle,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Home,
  Keyboard
} from "lucide-react"
import { useTibokPatientData } from "@/hooks/use-tibok-patient-data"
import { getTranslation, Language } from "@/lib/translations"

// Types
interface LifeHabits {
  smoking: string
  alcohol: string
  physicalActivity: string
}

interface PatientFormData {
  firstName: string
  lastName: string
  birthDate: string
  age: string
  gender: string[]
  otherGender: string
  weight: string
  height: string
  allergies: string[]
  otherAllergies: string
  medicalHistory: string[]
  otherMedicalHistory: string
  currentMedicationsText: string
  lifeHabits: LifeHabits
  // Additional fields for complete patient data
  address?: string
  phone?: string
  phoneNumber?: string
  city?: string
  country?: string
  email?: string
}

interface PatientFormProps {
  onDataChange: (data: PatientFormData) => void
  onNext: () => void
  language?: Language
  consultationId?: string | null
  initialData?: PatientFormData
}

export default function ModernPatientForm({ 
  onDataChange, 
  onNext, 
  language = 'fr',
  consultationId,
  initialData
}: PatientFormProps) {
  const { patientData: tibokPatient, consultationData, isFromTibok } = useTibokPatientData()
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(true)
  const [dataProcessed, setDataProcessed] = useState(false)
  
  // Navigation refs
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})
  const [showKeyboardHint, setShowKeyboardHint] = useState(true)
  
  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)
  
  // Get translated arrays
  const COMMON_ALLERGIES = [
    t('allergies.penicillin'),
    t('allergies.aspirin'),
    t('allergies.nsaids'),
    t('allergies.codeine'),
    t('allergies.latex'),
    t('allergies.iodine'),
    t('allergies.localAnesthetics'),
    t('allergies.sulfonamides'),
  ]

  const COMMON_MEDICAL_HISTORY = [
    t('medicalConditions.hypertension'),
    t('medicalConditions.type2Diabetes'),
    t('medicalConditions.type1Diabetes'),
    t('medicalConditions.asthma'),
    t('medicalConditions.heartDisease'),
    t('medicalConditions.depressionAnxiety'),
    t('medicalConditions.arthritis'),
    t('medicalConditions.migraine'),
    t('medicalConditions.gerd'),
    t('medicalConditions.highCholesterol'),
  ]
  
  // Field navigation order - FIXED
  const FIELD_ORDER = [
    'firstName',
    'lastName', 
    'birthDate',
    'gender-male',  // Focus on first gender checkbox
    'otherGender',
    'weight',
    'height',
    'phone',
    'email',
    'address',
    'city',
    'country',
    'otherAllergies',
    'otherMedicalHistory',
    'currentMedicationsText'
  ]
  
  // Capture URL parameters immediately before they get cleared
  const [urlData] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const source = urlParams.get('source')
      const patientDataParam = urlParams.get('patientData')
      const doctorDataParam = urlParams.get('doctorData')
      const doctorId = urlParams.get('doctorId')
      
      // Store doctor data in sessionStorage for use by consultation report
      if (doctorDataParam) {
        try {
          const doctorData = JSON.parse(decodeURIComponent(doctorDataParam))
          console.log('Doctor data received from URL:', doctorData)
          
          // Store doctor data with ID if available
          const doctorInfo = {
            ...doctorData,
            id: doctorId || doctorData.id
          }
          
          sessionStorage.setItem('tibokDoctorData', JSON.stringify(doctorInfo))
          console.log('Doctor data stored in sessionStorage:', doctorInfo)
        } catch (error) {
          console.error('Error parsing doctor data from URL:', error)
        }
      }
      
      if (source === 'tibok' && patientDataParam) {
        try {
          return {
            source,
            patientData: JSON.parse(decodeURIComponent(patientDataParam))
          }
        } catch (e) {
          console.error('Error parsing URL data:', e)
        }
      }
    }
    return null
  })

  const [formData, setFormData] = useState<PatientFormData>({
    firstName: "",
    lastName: "",
    birthDate: "",
    age: "",
    gender: [],
    otherGender: "",
    weight: "",
    height: "",
    allergies: [],
    otherAllergies: "",
    medicalHistory: [],
    otherMedicalHistory: "",
    currentMedicationsText: "",
    lifeHabits: {
      smoking: "",
      alcohol: "", 
      physicalActivity: "",
    },
    // Initialize additional fields
    address: "",
    phone: "",
    phoneNumber: "",
    city: "",
    country: "Maurice",
    email: ""
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [allergySearch, setAllergySearch] = useState("")
  const [historySearch, setHistorySearch] = useState("")
  const [currentSection, setCurrentSection] = useState(0)

  // NAVIGATION FUNCTIONS
  const setFieldRef = useCallback((fieldName: string, element: HTMLElement | null) => {
    fieldRefs.current[fieldName] = element
  }, [])

  const focusNextField = useCallback((currentField: string) => {
    const currentIndex = FIELD_ORDER.indexOf(currentField)
    if (currentIndex >= 0 && currentIndex < FIELD_ORDER.length - 1) {
      const nextFieldName = FIELD_ORDER[currentIndex + 1]
      
      // Special handling for gender checkbox
      if (nextFieldName.startsWith('gender-')) {
        const genderCheckbox = document.getElementById(nextFieldName) as HTMLElement
        if (genderCheckbox) {
          genderCheckbox.focus()
          
          // Auto-scroll to the checkbox
          genderCheckbox.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          
          // Add visual highlight to parent div
          const parentDiv = genderCheckbox.closest('.border-2')
          if (parentDiv) {
            parentDiv.classList.add('ring-2', 'ring-blue-300')
            setTimeout(() => {
              parentDiv.classList.remove('ring-2', 'ring-blue-300')
            }, 1000)
          }
        }
      } else {
        const nextField = fieldRefs.current[nextFieldName]
        
        if (nextField) {
          nextField.focus()
          
          // Auto-scroll to the field
          nextField.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          
          // Add visual highlight
          nextField.classList.add('ring-2', 'ring-blue-300')
          setTimeout(() => {
            nextField.classList.remove('ring-2', 'ring-blue-300')
          }, 1000)
        }
      }
    } else if (currentIndex === FIELD_ORDER.length - 1) {
      // Last field, focus submit button or trigger validation
      handleSubmit()
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      focusNextField(fieldName)
      
      // Hide keyboard hint after first use
      if (showKeyboardHint) {
        setShowKeyboardHint(false)
      }
    }
  }, [focusNextField, showKeyboardHint])

  // Process data from URL or TIBOK hook
  useEffect(() => {
    const processPatientData = async () => {
      console.log('Starting to process patient data')
      console.log('URL data captured:', urlData)
      console.log('Hook data:', tibokPatient)
      
      let patientInfo = null
      let isTibok = false
      
      // Use captured URL data first
      if (urlData && urlData.patientData) {
        patientInfo = urlData.patientData
        isTibok = true
        console.log('Using patient data from captured URL:', patientInfo)
      }
      // If no URL data, try the hook data
      else if (tibokPatient) {
        patientInfo = tibokPatient
        isTibok = isFromTibok
        console.log('Using patient data from hook:', patientInfo)
      }
      
      // Process the data if we have it
      if (patientInfo && !dataProcessed) {
        console.log('Processing patient info:', patientInfo)
        
        // Try to get additional data from database
        let enhancedPatientInfo = { ...patientInfo }
        
        const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
        if (currentConsultationId) {
          try {
            // Get consultation data which includes height/weight
            const { data: consultation } = await supabase
              .from('consultations')
              .select('patient_id, patient_height, patient_weight')
              .eq('id', currentConsultationId)
              .single()
            
            if (consultation) {
              // Use consultation data for height/weight if available
              enhancedPatientInfo.height = consultation.patient_height || patientInfo.height || ''
              enhancedPatientInfo.weight = consultation.patient_weight || patientInfo.weight || ''
              
              // Also get full patient data if we have patient_id
              if (consultation.patient_id) {
                const { data: dbPatient } = await supabase
                  .from('patients')
                  .select('height, weight, address, phone_number, city, country, email')
                  .eq('id', consultation.patient_id)
                  .single()
                
                if (dbPatient) {
                  // Use consultation data first (most recent), then patient table, then original data
                  enhancedPatientInfo.height = consultation.patient_height || dbPatient.height || patientInfo.height || ''
                  enhancedPatientInfo.weight = consultation.patient_weight || dbPatient.weight || patientInfo.weight || ''
                  enhancedPatientInfo.address = dbPatient.address || patientInfo.address || ''
                  enhancedPatientInfo.phone = dbPatient.phone_number || patientInfo.phone || ''
                  enhancedPatientInfo.phoneNumber = dbPatient.phone_number || patientInfo.phone || ''
                  enhancedPatientInfo.city = dbPatient.city || patientInfo.city || ''
                  enhancedPatientInfo.country = dbPatient.country || patientInfo.country || ''
                  enhancedPatientInfo.email = dbPatient.email || patientInfo.email || ''
                }
              }
            }
          } catch (error) {
            console.error('Error fetching additional patient data:', error)
          }
        }
        
        // Process birth date
        let birthDateStr = ""
        if (enhancedPatientInfo.dateOfBirth) {
          birthDateStr = enhancedPatientInfo.dateOfBirth.split('T')[0]
        } else if (enhancedPatientInfo.date_of_birth) {
          birthDateStr = enhancedPatientInfo.date_of_birth.split('T')[0]
        }
        
        // Process gender
        const genderArray: string[] = []
        if (enhancedPatientInfo.gender) {
          const gender = enhancedPatientInfo.gender
          if (gender === 'Masculin' || gender === 'M' || gender.toLowerCase() === 'male' || gender.toLowerCase() === 'm') {
            genderArray.push(t('patientForm.male'))
          } else if (gender === 'Féminin' || gender === 'F' || gender.toLowerCase() === 'female' || gender.toLowerCase() === 'f') {
            genderArray.push(t('patientForm.female'))
          }
        }
        
        // Create new form data with enhanced info - FIXED VERSION
        const newFormData: PatientFormData = {
          firstName: enhancedPatientInfo.firstName || enhancedPatientInfo.first_name || "",
          lastName: enhancedPatientInfo.lastName || enhancedPatientInfo.last_name || "",
          birthDate: birthDateStr,
          age: enhancedPatientInfo.age ? enhancedPatientInfo.age.toString() : "",
          gender: genderArray,
          otherGender: "",
          weight: enhancedPatientInfo.weight ? enhancedPatientInfo.weight.toString() : "",
          height: enhancedPatientInfo.height ? enhancedPatientInfo.height.toString() : "",
          // Contact information - properly populated
          phone: enhancedPatientInfo.phone_number || enhancedPatientInfo.phone || enhancedPatientInfo.phoneNumber || "",
          phoneNumber: enhancedPatientInfo.phone_number || enhancedPatientInfo.phone || enhancedPatientInfo.phoneNumber || "",
          email: enhancedPatientInfo.email || "",
          address: enhancedPatientInfo.address || "",
          city: enhancedPatientInfo.city || "",
          country: enhancedPatientInfo.country || "Maurice",
          // Medical information
          allergies: [],
          otherAllergies: "",
          medicalHistory: [],
          otherMedicalHistory: "",
          currentMedicationsText: "",
          lifeHabits: {
            smoking: "",
            alcohol: "", 
            physicalActivity: "",
          },
        }
        
        console.log('Setting form data:', newFormData)
        setFormData(newFormData)
        setDataProcessed(true)
        setIsLoadingPatientData(false)
      } else if (!patientInfo) {
        console.log('No patient data available')
        setIsLoadingPatientData(false)
      }
    }
    
    // Process immediately
    processPatientData()
  }, [tibokPatient, isFromTibok, dataProcessed, urlData, t, consultationId])

  // Load saved data if available
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        if (dataProcessed) return
        
        const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
        
        if (currentConsultationId) {
          const savedData = await consultationDataService.getAllData()
          if (savedData?.patientData && !dataProcessed) {
            setFormData(savedData.patientData)
            setDataProcessed(true)
          }
        }
      } catch (error) {
        console.error('Error loading saved patient data:', error)
      } finally {
        setIsLoadingPatientData(false)
      }
    }
    
    if (!urlData && !tibokPatient) {
      loadSavedData()
    }
  }, [consultationId, urlData, tibokPatient, dataProcessed])

  // Save data when form changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await consultationDataService.saveStepData(0, formData)
      } catch (error) {
        console.error('Error saving patient data:', error)
      }
    }
    
    const timer = setTimeout(() => {
      if (formData.firstName && formData.lastName) {
        saveData()
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [formData])

  // Calculate form completion percentage
  const calculateProgress = () => {
    const fields = [
      formData.firstName,
      formData.lastName, 
      formData.birthDate,
      formData.gender.length > 0 ? "filled" : "",
      formData.weight,
      formData.height,
      formData.lifeHabits.smoking,
      formData.lifeHabits.alcohol,
      formData.lifeHabits.physicalActivity,
    ]
    
    const completed = fields.filter(field => field && field.toString().trim()).length
    return Math.round((completed / fields.length) * 100)
  }

  // Calculate age from birth date
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return ""
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age.toString()
  }

  // Update age when birth date changes
  useEffect(() => {
    if (formData.birthDate) {
      const calculatedAge = calculateAge(formData.birthDate)
      if (calculatedAge !== formData.age) {
        setFormData(prev => ({ ...prev, age: calculatedAge }))
      }
    }
  }, [formData.birthDate, formData.age])

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onDataChange(formData)
    }, 500)
    return () => clearTimeout(timer)
  }, [formData, onDataChange])

  const handleInputChange = (field: keyof PatientFormData, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)

    if (errors[field]) {
      setErrors({ ...errors, [field]: "" })
    }
  }

  const handleGenderChange = (genderOption: string, checked: boolean) => {
    const newGender = checked 
      ? [...formData.gender, genderOption] 
      : formData.gender.filter((g) => g !== genderOption)

    const newData = { ...formData, gender: newGender }
    setFormData(newData)
  }

  const handleLifeHabitsChange = (field: keyof LifeHabits, value: string) => {
    const newLifeHabits = { ...formData.lifeHabits, [field]: value }
    const newData = { ...formData, lifeHabits: newLifeHabits }
    setFormData(newData)
  }

  const handleAllergyChange = (allergy: string, checked: boolean) => {
    const newAllergies = checked 
      ? [...formData.allergies, allergy] 
      : formData.allergies.filter((a) => a !== allergy)

    const newData = { ...formData, allergies: newAllergies }
    setFormData(newData)
  }

  const handleMedicalHistoryChange = (condition: string, checked: boolean) => {
    const newHistory = checked
      ? [...formData.medicalHistory, condition]
      : formData.medicalHistory.filter((h) => h !== condition)

    const newData = { ...formData, medicalHistory: newHistory }
    setFormData(newData)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = t('patientForm.errors.firstNameRequired')
    if (!formData.lastName.trim()) newErrors.lastName = t('patientForm.errors.lastNameRequired')
    if (!formData.birthDate) {
      newErrors.birthDate = t('patientForm.errors.birthDateRequired')
    } else {
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      if (birthDate > today) {
        newErrors.birthDate = t('patientForm.errors.futureBirthDate')
      }
      const age = parseInt(formData.age)
      if (age < 0 || age > 120) {
        newErrors.birthDate = t('patientForm.errors.invalidAge')
      }
    }
    if (formData.gender.length === 0 && !formData.otherGender.trim()) {
      newErrors.gender = t('patientForm.errors.genderRequired')
    }
    if (!formData.weight || Number.parseFloat(formData.weight) < 1 || Number.parseFloat(formData.weight) > 300) {
      newErrors.weight = t('patientForm.errors.validWeightRequired')
    }
    if (!formData.height || Number.parseFloat(formData.height) < 50 || Number.parseFloat(formData.height) > 250) {
      newErrors.height = t('patientForm.errors.validHeightRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const calculateBMI = () => {
    if (formData.weight && formData.height) {
      const weight = Number.parseFloat(formData.weight)
      const height = Number.parseFloat(formData.height) / 100
      return (weight / (height * height)).toFixed(1)
    }
    return null
  }

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: t('patientForm.underweight'), color: "bg-blue-100 text-blue-800", icon: "📉" }
    if (bmi < 25) return { text: t('patientForm.normalWeight'), color: "bg-green-100 text-green-800", icon: "✅" }
    if (bmi < 30) return { text: t('patientForm.overweight'), color: "bg-yellow-100 text-yellow-800", icon: "⚠️" }
    return { text: t('patientForm.obesity'), color: "bg-red-100 text-red-800", icon: "🔴" }
  }

  const bmi = calculateBMI()
  const bmiCategory = bmi ? getBMICategory(Number.parseFloat(bmi)) : null
  const progress = calculateProgress()

  const filteredAllergies = COMMON_ALLERGIES.filter(allergy =>
    allergy.toLowerCase().includes(allergySearch.toLowerCase())
  )

  const filteredHistory = COMMON_MEDICAL_HISTORY.filter(condition =>
    condition.toLowerCase().includes(historySearch.toLowerCase())
  )

  const sections = [
    { id: "identity", title: t('patientForm.personalInfo'), icon: User },
    { id: "contact", title: t('patientForm.contactInfo'), icon: Phone },
    { id: "allergies", title: t('patientForm.knownAllergies'), icon: AlertTriangle },
    { id: "history", title: t('patientForm.medicalHistory'), icon: Heart },
    { id: "medications", title: t('patientForm.currentMedications'), icon: Pill },
    { id: "habits", title: t('patientForm.lifestyle'), icon: Activity },
  ]

  // Show loading state briefly
  if (isLoadingPatientData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('patientForm.loadingPatientData')}</p>
        </div>
      </div>
    )
  }

  const showTibokNotification = dataProcessed && (isFromTibok || urlData?.source === 'tibok')

  return (
    <div className="space-y-6">
      {/* Navigation Hint */}
      {showKeyboardHint && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              💡 {t('common.keyboardHint', 'Astuce : Appuyez sur Enter pour passer au champ suivant')}
            </p>
          </div>
        </div>
      )}

      {/* Show notification if data is from TIBOK */}
      {showTibokNotification && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              {t('patientForm.tibokNotification')} {formData.firstName} {formData.lastName}
            </p>
          </div>
        </div>
      )}

      {/* Header with Progress */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            <User className="h-8 w-8 text-blue-600" />
            {t('patientForm.title')}
          </CardTitle>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('patientForm.formProgress')}</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => setCurrentSection(index)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
              currentSection === index
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{section.title}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Identité */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <User className="h-6 w-6" />
            {t('patientForm.personalInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2 font-medium">
                {t('patientForm.firstName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'firstName')}
                ref={(el) => setFieldRef('firstName', el)}
                className={`transition-all duration-200 ${
                  errors.firstName 
                    ? "border-red-500 focus:ring-red-200" 
                    : "focus:ring-blue-200 border-gray-300"
                }`}
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
                {t('patientForm.lastName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'lastName')}
                ref={(el) => setFieldRef('lastName', el)}
                className={`transition-all duration-200 ${
                  errors.lastName 
                    ? "border-red-500 focus:ring-red-200" 
                    : "focus:ring-blue-200 border-gray-300"
                }`}
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
                {t('patientForm.birthDate')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange("birthDate", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'birthDate')}
                ref={(el) => setFieldRef('birthDate', el)}
                className={`transition-all duration-200 ${
                  errors.birthDate 
                    ? "border-red-500 focus:ring-red-200" 
                    : "focus:ring-blue-200 border-gray-300"
                }`}
              />
              {errors.birthDate && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.birthDate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-medium">
                {t('patientForm.calculatedAge')}
              </Label>
              <div className="flex items-center h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <span className="text-gray-700 font-medium">
                  {formData.age ? `${formData.age} ${t('patientForm.years')}` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2 font-medium">
              {t('patientForm.gender')} <span className="text-red-500">*</span>
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[t('patientForm.male'), t('patientForm.female')].map((genderOption, index) => (
                <div
                  key={genderOption}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    formData.gender.includes(genderOption)
                      ? "border-blue-300 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-blue-200 hover:bg-blue-25"
                  }`}
                  onClick={() => handleGenderChange(genderOption, !formData.gender.includes(genderOption))}
                >
                  <Checkbox
                    id={`gender-${index === 0 ? 'male' : 'female'}`}
                    checked={formData.gender.includes(genderOption)}
                    onCheckedChange={(checked) => handleGenderChange(genderOption, checked as boolean)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        focusNextField(`gender-${index === 0 ? 'male' : 'female'}`)
                      }
                    }}
                  />
                  <Label htmlFor={`gender-${index === 0 ? 'male' : 'female'}`} className="text-sm font-medium cursor-pointer">
                    {genderOption}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherGender" className="font-medium">{t('patientForm.otherSpecify')}</Label>
              <Input
                id="otherGender"
                name="otherGender"
                value={formData.otherGender}
                onChange={(e) => handleInputChange("otherGender", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'otherGender')}
                ref={(el) => setFieldRef('otherGender', el)}
                className="transition-all duration-200 focus:ring-blue-200"
              />
            </div>

            {(formData.gender.length > 0 || formData.otherGender) && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold text-blue-800">{t('patientForm.declaredGender')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.gender.map((gender) => (
                    <Badge key={gender} className="bg-blue-100 text-blue-800 text-xs">
                      {gender}
                    </Badge>
                  ))}
                  {formData.otherGender && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      {formData.otherGender}
                    </Badge>
                  )}
                </div>
              </div>
            )}

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
                {t('patientForm.weight')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'weight')}
                ref={(el) => setFieldRef('weight', el)}
                min="1"
                max="300"
                step="0.1"
                className={`transition-all duration-200 ${
                  errors.weight 
                    ? "border-red-500 focus:ring-red-200" 
                    : "focus:ring-blue-200 border-gray-300"
                }`}
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
                {t('patientForm.height')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="height"
                name="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'height')}
                ref={(el) => setFieldRef('height', el)}
                min="50"
                max="250"
                className={`transition-all duration-200 ${
                  errors.height 
                    ? "border-red-500 focus:ring-red-200" 
                    : "focus:ring-blue-200 border-gray-300"
                }`}
              />
              {errors.height && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.height}
                </p>
              )}
            </div>
          </div>

          {bmi && (
            <div className={`p-4 rounded-lg border-2 ${bmiCategory?.color} transition-all duration-300`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bmiCategory?.icon}</span>
                <div>
                  <p className="font-semibold">{t('patientForm.bmi')}: {bmi} kg/m²</p>
                  <p className="text-sm">{bmiCategory?.text}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Contact Information */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Phone className="h-6 w-6" />
            {t('patientForm.contactInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 font-medium">
                <Phone className="h-4 w-4" />
                {t('patientForm.phone')}
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'phone')}
                ref={(el) => setFieldRef('phone', el)}
                placeholder="+230 5XXX XXXX"
                className="transition-all duration-200 focus:ring-indigo-200 border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4" />
                {t('patientForm.email')}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'email')}
                ref={(el) => setFieldRef('email', el)}
                placeholder="email@example.com"
                className="transition-all duration-200 focus:ring-indigo-200 border-gray-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2 font-medium">
              <Home className="h-4 w-4" />
              {t('patientForm.address')}
            </Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address || ''}
              onChange={(e) => handleInputChange("address", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'address')}
              ref={(el) => setFieldRef('address', el)}
              placeholder={t('patientForm.addressPlaceholder')}
              rows={2}
              className="transition-all duration-200 focus:ring-indigo-200 border-gray-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                {t('patientForm.city')}
              </Label>
              <Input
                id="city"
                name="city"
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleInputChange("city", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'city')}
                ref={(el) => setFieldRef('city', el)}
                placeholder="Port Louis, Curepipe, etc."
                className="transition-all duration-200 focus:ring-indigo-200 border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                {t('patientForm.country')}
              </Label>
              <Input
                id="country"
                name="country"
                type="text"
                value={formData.country || ''}
                onChange={(e) => handleInputChange("country", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'country')}
                ref={(el) => setFieldRef('country', el)}
                className="transition-all duration-200 focus:ring-indigo-200 border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Allergies */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            {t('patientForm.knownAllergies')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('patientForm.searchAllergy')}
              value={allergySearch}
              onChange={(e) => setAllergySearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredAllergies.map((allergy) => (
              <div
                key={allergy}
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  formData.allergies.includes(allergy)
                    ? "border-red-300 bg-red-50 shadow-md"
                    : "border-gray-200 hover:border-red-200 hover:bg-red-25"
                }`}
                onClick={() => handleAllergyChange(allergy, !formData.allergies.includes(allergy))}
              >
                <Checkbox
                  id={`allergy-${allergy}`}
                  checked={formData.allergies.includes(allergy)}
                  onCheckedChange={(checked) => handleAllergyChange(allergy, checked as boolean)}
                />
                <Label htmlFor={`allergy-${allergy}`} className="text-sm font-medium cursor-pointer">
                  {allergy}
                </Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherAllergies" className="font-medium">{t('patientForm.otherAllergies')}</Label>
            <Textarea
              id="otherAllergies"
              value={formData.otherAllergies}
              onChange={(e) => handleInputChange("otherAllergies", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'otherAllergies')}
              ref={(el) => setFieldRef('otherAllergies', el)}
              rows={3}
              className="transition-all duration-200 focus:ring-red-200"
            />
          </div>

          {(formData.allergies.length > 0 || formData.otherAllergies) && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-red-800">{t('patientForm.declaredAllergies')}</p>
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

      {/* Section 4: Antécédents médicaux */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Heart className="h-6 w-6" />
            {t('patientForm.medicalHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('patientForm.searchMedicalHistory')}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHistory.map((condition) => (
              <div
                key={condition}
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  formData.medicalHistory.includes(condition)
                    ? "border-purple-300 bg-purple-50 shadow-md"
                    : "border-gray-200 hover:border-purple-200 hover:bg-purple-25"
                }`}
                onClick={() => handleMedicalHistoryChange(condition, !formData.medicalHistory.includes(condition))}
              >
                <Checkbox
                  id={`history-${condition}`}
                  checked={formData.medicalHistory.includes(condition)}
                  onCheckedChange={(checked) => handleMedicalHistoryChange(condition, checked as boolean)}
                />
                <Label htmlFor={`history-${condition}`} className="text-sm font-medium cursor-pointer">
                  {condition}
                </Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherMedicalHistory" className="font-medium">{t('patientForm.otherMedicalHistory')}</Label>
            <Textarea
              id="otherMedicalHistory"
              value={formData.otherMedicalHistory}
              onChange={(e) => handleInputChange("otherMedicalHistory", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'otherMedicalHistory')}
              ref={(el) => setFieldRef('otherMedicalHistory', el)}
              rows={3}
              className="transition-all duration-200 focus:ring-purple-200"
            />
          </div>

          {(formData.medicalHistory.length > 0 || formData.otherMedicalHistory) && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-purple-600" />
                <p className="font-semibold text-purple-800">{t('patientForm.declaredHistory')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.medicalHistory.map((condition) => (
                  <Badge key={condition} className="bg-purple-100 text-purple-800 text-xs">
                    {condition}
                  </Badge>
                ))}
                {formData.otherMedicalHistory && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    {t('patientForm.otherMedicalHistory')}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Médicaments */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Pill className="h-6 w-6" />
            {t('patientForm.currentMedications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentMedicationsText" className="font-medium">
              {t('patientForm.ongoingTreatments')}
            </Label>
            <Textarea
              id="currentMedicationsText"
              value={formData.currentMedicationsText}
              onChange={(e) => handleInputChange("currentMedicationsText", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'currentMedicationsText')}
              ref={(el) => setFieldRef('currentMedicationsText', el)}
              placeholder={t('patientForm.medicationPlaceholder')}
              rows={6}
              className="resize-y transition-all duration-200 focus:ring-green-200"
            />
          </div>

          {formData.currentMedicationsText && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-800">
                  {t('patientForm.treatmentsEntered')} ({formData.currentMedicationsText.split("\n").filter((line) => line.trim()).length} {t('patientForm.lines')})
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Habitudes de vie */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            {t('patientForm.lifestyle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <Label className="font-medium text-lg">🚬 {t('patientForm.tobacco')}</Label>
              <RadioGroup
                value={formData.lifeHabits.smoking}
                onValueChange={(value) => handleLifeHabitsChange("smoking", value)}
                className="space-y-3"
              >
                {[t('patientForm.nonSmoker'), t('patientForm.currentSmoker'), t('patientForm.exSmoker')].map((option) => (
                  <div
                    key={option}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                      formData.lifeHabits.smoking === option
                        ? "border-orange-300 bg-orange-50 shadow-md"
                        : "border-gray-200 hover:border-orange-200"
                    }`}
                  >
                    <RadioGroupItem value={option} id={`smoking-${option}`} />
                    <Label htmlFor={`smoking-${option}`} className="text-sm font-medium cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="font-medium text-lg">🍷 {t('patientForm.alcohol')}</Label>
              <RadioGroup
                value={formData.lifeHabits.alcohol}
                onValueChange={(value) => handleLifeHabitsChange("alcohol", value)}
                className="space-y-3"
              >
                {[t('patientForm.never'), t('patientForm.occasional'), t('patientForm.regular')].map((option) => (
                  <div
                    key={option}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                      formData.lifeHabits.alcohol === option
                        ? "border-orange-300 bg-orange-50 shadow-md"
                        : "border-gray-200 hover:border-orange-200"
                    }`}
                  >
                    <RadioGroupItem value={option} id={`alcohol-${option}`} />
                    <Label htmlFor={`alcohol-${option}`} className="text-sm font-medium cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="font-medium text-lg">🏃 {t('patientForm.physicalActivity')}</Label>
              <RadioGroup
                value={formData.lifeHabits.physicalActivity}
                onValueChange={(value) => handleLifeHabitsChange("physicalActivity", value)}
                className="space-y-3"
              >
                {[t('patientForm.sedentary'), t('patientForm.moderate'), t('patientForm.intense')].map((option) => (
                  <div
                    key={option}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                      formData.lifeHabits.physicalActivity === option
                        ? "border-orange-300 bg-orange-50 shadow-md"
                        : "border-gray-200 hover:border-orange-200"
                    }`}
                  >
                    <RadioGroupItem value={option} id={`activity-${option}`} />
                    <Label htmlFor={`activity-${option}`} className="text-sm font-medium cursor-pointer">
                      {option}
                    </Label>
                  </div>
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
          <span className="text-sm text-gray-600">{t('common.autoSave')}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit} 
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('patientForm.continueButton')}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
