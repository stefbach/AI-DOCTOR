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
  // Informations personnelles
  firstName: string
  lastName: string
  birthDate: string
  age: string
  gender: string
  
  // Données physiques
  weight: string
  height: string
  
  // Contact
  phone: string
  email: string
  address: string
  city: string
  country: string
  
  // Informations médicales
  allergies: string[]
  otherAllergies: string
  medicalHistory: string[]
  otherMedicalHistory: string
  currentMedicationsText: string
  
  // Habitudes de vie
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

// ==================== CONSTANTES ====================
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
  country: "Maurice",
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

// ==================== COMPOSANT PRINCIPAL ====================
export default function ModernPatientForm({ 
  onDataChange, 
  onNext, 
  language = 'fr',
  consultationId,
  initialData
}: PatientFormProps) {
  // ========== Hooks ==========
  const { patientData: tibokPatient, isFromTibok } = useTibokPatientData()
  const t = useCallback((key: string) => getTranslation(key, language), [language])
  
  // ========== États ==========
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

  // ========== Mémoïsation des listes traduites ==========
  const COMMON_ALLERGIES = useMemo(() => [
    t('allergies.penicillin'),
    t('allergies.aspirin'),
    t('allergies.nsaids'),
    t('allergies.codeine'),
    t('allergies.latex'),
    t('allergies.iodine'),
    t('allergies.localAnesthetics'),
    t('allergies.sulfonamides'),
  ], [t])

  const COMMON_MEDICAL_HISTORY = useMemo(() => [
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
  ], [t])

  // ========== Fonctions utilitaires ==========
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
      text: t('patientForm.underweight'), 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      icon: "📉" 
    }
    if (bmi < 25) return { 
      text: t('patientForm.normalWeight'), 
      color: "bg-green-100 text-green-800 border-green-200", 
      icon: "✅" 
    }
    if (bmi < 30) return { 
      text: t('patientForm.overweight'), 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      icon: "⚠️" 
    }
    return { 
      text: t('patientForm.obesity'), 
      color: "bg-red-100 text-red-800 border-red-200", 
      icon: "🔴" 
    }
  }, [t])

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
    
    if (maleVariants.includes(g)) return 'Masculin'
    if (femaleVariants.includes(g)) return 'Féminin'
    
    return gender
  }, [])

  const transformDataForAPI = useCallback((data: PatientFormData) => {
    const sexe = data.gender === 'Masculin' ? 'Masculin' : 
                 data.gender === 'Féminin' ? 'Féminin' : 
                 data.gender || 'Non renseigné'

    const allergiesArray = [...data.allergies]
    if (data.otherAllergies?.trim()) {
      allergiesArray.push(data.otherAllergies.trim())
    }

    const historyArray = [...data.medicalHistory]
    if (data.otherMedicalHistory?.trim()) {
      historyArray.push(data.otherMedicalHistory.trim())
    }

    return {
      // Informations personnelles
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
      pays: data.country || 'Maurice',
      
      // Données médicales
      poids: data.weight || '',
      taille: data.height || '',
      allergies: allergiesArray.join(', ') || 'Aucune allergie connue',
      antecedents: historyArray.join(', ') || 'Aucun antécédent notable',
      medicamentsActuels: data.currentMedicationsText || 'Aucun',
      
      // Habitudes de vie
      habitudes: {
        tabac: data.lifeHabits.smoking || 'Non renseigné',
        alcool: data.lifeHabits.alcohol || 'Non renseigné',
        activitePhysique: data.lifeHabits.physicalActivity || 'Non renseignée'
      }
    }
  }, [])

  // ========== Gestionnaires d'événements ==========
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

    // Champs obligatoires
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('patientForm.errors.firstNameRequired')
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('patientForm.errors.lastNameRequired')
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = t('patientForm.errors.birthDateRequired')
    } else {
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      if (birthDate > today) {
        newErrors.birthDate = t('patientForm.errors.futureBirthDate')
      }
    }
    
    if (!formData.gender) {
      newErrors.gender = t('patientForm.errors.genderRequired')
    }
    
    const weight = parseFloat(formData.weight)
    if (!formData.weight || isNaN(weight) || weight < 1 || weight > 500) {
      newErrors.weight = t('patientForm.errors.validWeightRequired')
    }
    
    const height = parseFloat(formData.height)
    if (!formData.height || isNaN(height) || height < 50 || height > 250) {
      newErrors.height = t('patientForm.errors.validHeightRequired')
    }

    // Email validation si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('patientForm.errors.invalidEmail')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, t])

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onNext()
    } else {
      // Faire défiler jusqu'à la première erreur
      const firstErrorField = Object.keys(errors)[0]
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus()
      }
    }
  }, [validateForm, onNext, errors])

  // ========== Effets ==========
  
  // Mise à jour de l'âge quand la date de naissance change
  useEffect(() => {
    if (formData.birthDate) {
      const newAge = calculateAge(formData.birthDate)
      if (newAge !== formData.age) {
        setFormData(prev => ({ ...prev, age: newAge }))
      }
    }
  }, [formData.birthDate, formData.age, calculateAge])

  // Initialisation des données
  useEffect(() => {
    const initializeData = async () => {
      if (dataInitialized) return
      
      try {
        setIsLoading(true)
        
        // 1. Vérifier les données de l'URL
        const urlParams = new URLSearchParams(window.location.search)
        const source = urlParams.get('source')
        const patientDataParam = urlParams.get('patientData')
        
        let patientInfo = null
        
        // 2. Récupérer les données patient (URL ou TIBOK)
        if (source === 'tibok' && patientDataParam) {
          try {
            patientInfo = JSON.parse(decodeURIComponent(patientDataParam))
          } catch (e) {
            console.error('Erreur parsing données URL:', e)
          }
        } else if (tibokPatient) {
          patientInfo = tibokPatient
        }
        
        // 3. Si on a des données patient, les utiliser
        if (patientInfo) {
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
            country: patientInfo.country || "Maurice",
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
          
          setFormData(newFormData)
          setDataInitialized(true)
        }
        // 4. Sinon charger depuis la base de données
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
        console.error('Erreur initialisation données:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeData()
  }, [consultationId, tibokPatient, dataInitialized, normalizeGender])

  // Sauvegarde automatique
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.firstName || formData.lastName) {
        try {
          // Sauvegarder les données
          await consultationDataService.saveStepData(0, formData)
          setLastSaved(new Date())
          
          // Notifier le parent
          onDataChange(formData)
        } catch (error) {
          console.error('Erreur sauvegarde:', error)
        }
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [formData, onDataChange])

  // ========== Rendu conditionnel ==========
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('patientForm.loadingPatientData')}</p>
        </div>
      </div>
    )
  }

  // ========== Variables calculées ==========
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

  // ========== Rendu principal ==========
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {/* Notification TIBOK */}
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

      {/* En-tête avec progression */}
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

      {/* Navigation rapide */}
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

      {/* Section 1: Identité */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
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
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.firstName ? "border-red-500" : ""}
                placeholder={t('patientForm.firstNamePlaceholder')}
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
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.lastName ? "border-red-500" : ""}
                placeholder={t('patientForm.lastNamePlaceholder')}
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
              <Label className="font-medium">{t('patientForm.calculatedAge')}</Label>
              <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-gray-50">
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
            
            <RadioGroup
              value={formData.gender}
              onValueChange={(value) => handleInputChange("gender", value)}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label 
                  htmlFor="gender-male"
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    formData.gender === 'Masculin' 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <RadioGroupItem value="Masculin" id="gender-male" />
                  <span className="text-sm font-medium">{t('patientForm.male')}</span>
                </label>

                <label 
                  htmlFor="gender-female"
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    formData.gender === 'Féminin' 
                      ? "border-pink-500 bg-pink-50" 
                      : "border-gray-200 hover:border-pink-300"
                  }`}
                >
                  <RadioGroupItem value="Féminin" id="gender-female" />
                  <span className="text-sm font-medium">{t('patientForm.female')}</span>
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
                {t('patientForm.weight')} <span className="text-red-500">*</span>
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
                {t('patientForm.height')} <span className="text-red-500">*</span>
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
                  <p className="font-semibold">{t('patientForm.bmi')}: {bmi} kg/m²</p>
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
                {t('patientForm.email')}
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
              {t('patientForm.address')}
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder={t('patientForm.addressPlaceholder')}
              rows={2}
              className="resize-none"
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
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Port Louis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                {t('patientForm.country')}
              </Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Maurice"
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
            <Label htmlFor="otherAllergies">{t('patientForm.otherAllergies')}</Label>
            <Textarea
              id="otherAllergies"
              value={formData.otherAllergies}
              onChange={(e) => handleInputChange("otherAllergies", e.target.value)}
              placeholder={t('patientForm.otherAllergiesPlaceholder')}
              rows={3}
              className="resize-none"
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
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
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
            <Label htmlFor="otherMedicalHistory">{t('patientForm.otherMedicalHistory')}</Label>
            <Textarea
              id="otherMedicalHistory"
              value={formData.otherMedicalHistory}
              onChange={(e) => handleInputChange("otherMedicalHistory", e.target.value)}
              placeholder={t('patientForm.otherMedicalHistoryPlaceholder')}
              rows={3}
              className="resize-none"
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
                    {t('patientForm.other')}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Médicaments actuels */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Pill className="h-6 w-6" />
            {t('patientForm.currentMedications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentMedicationsText">{t('patientForm.ongoingTreatments')}</Label>
            <Textarea
              id="currentMedicationsText"
              value={formData.currentMedicationsText}
              onChange={(e) => handleInputChange("currentMedicationsText", e.target.value)}
              placeholder={t('patientForm.medicationPlaceholder')}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">{t('patientForm.medicationHelp')}</p>
          </div>

          {formData.currentMedicationsText && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-800">
                  {t('patientForm.treatmentsEntered')} (
                  {formData.currentMedicationsText.split('\n').filter(line => line.trim()).length} 
                  {' '}{t('patientForm.lines')})
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Habitudes de vie */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            {t('patientForm.lifestyle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tabac */}
            <div className="space-y-4">
              <Label className="font-medium text-lg flex items-center gap-2">
                🚬 {t('patientForm.tobacco')}
              </Label>
              <RadioGroup
                value={formData.lifeHabits.smoking}
                onValueChange={(value) => handleLifeHabitsChange("smoking", value)}
              >
                {[
                  { value: 'non', label: t('patientForm.nonSmoker') },
                  { value: 'actuel', label: t('patientForm.currentSmoker') },
                  { value: 'ancien', label: t('patientForm.exSmoker') }
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

            {/* Alcool */}
            <div className="space-y-4">
              <Label className="font-medium text-lg flex items-center gap-2">
                🍷 {t('patientForm.alcohol')}
              </Label>
              <RadioGroup
                value={formData.lifeHabits.alcohol}
                onValueChange={(value) => handleLifeHabitsChange("alcohol", value)}
              >
                {[
                  { value: 'jamais', label: t('patientForm.never') },
                  { value: 'occasionnel', label: t('patientForm.occasional') },
                  { value: 'regulier', label: t('patientForm.regular') }
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

            {/* Activité physique */}
            <div className="space-y-4">
              <Label className="font-medium text-lg flex items-center gap-2">
                🏃 {t('patientForm.physicalActivity')}
              </Label>
              <RadioGroup
                value={formData.lifeHabits.physicalActivity}
                onValueChange={(value) => handleLifeHabitsChange("physicalActivity", value)}
              >
                {[
                  { value: 'sedentaire', label: t('patientForm.sedentary') },
                  { value: 'moderee', label: t('patientForm.moderate') },
                  { value: 'intense', label: t('patientForm.intense') }
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

      {/* Indicateur de sauvegarde automatique */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">
            {t('common.autoSave')}
            {lastSaved && (
              <span className="ml-2 text-xs text-gray-500">
                ({new Date(lastSaved).toLocaleTimeString()})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Bouton de soumission */}
      <div className="flex justify-center pt-4">
        <Button 
          type="submit"
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('patientForm.continueButton')}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </form>
  )
}