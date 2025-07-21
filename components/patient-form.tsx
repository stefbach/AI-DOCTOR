"use client"

import { useState, useEffect } from "react"
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
  Loader2
} from "lucide-react"

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
}

interface PatientFormProps {
  onDataChange: (data: PatientFormData) => void
  onNext: () => void
}

// Constants
const COMMON_ALLERGIES = [
  "Pénicilline",
  "Aspirine", 
  "Anti-inflammatoires (AINS)",
  "Codéine",
  "Latex",
  "Iode",
  "Anesthésiques locaux",
  "Sulfamides",
]

const COMMON_MEDICAL_HISTORY = [
  "Hypertension artérielle",
  "Diabète type 2",
  "Diabète type 1", 
  "Asthme",
  "Maladie cardiaque",
  "Dépression/Anxiété",
  "Arthrose",
  "Migraine",
  "Reflux gastro-œsophagien",
  "Hypercholestérolémie",
]

export default function ModernPatientForm({ onDataChange, onNext }: PatientFormProps) {
  const [isFromTibok, setIsFromTibok] = useState(false)
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(true)

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
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [allergySearch, setAllergySearch] = useState("")
  const [historySearch, setHistorySearch] = useState("")
  const [currentSection, setCurrentSection] = useState(0)

  // Load patient data from URL on component mount
  useEffect(() => {
    const loadPatientDataFromURL = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const source = urlParams.get('source')
        const patientDataParam = urlParams.get('patientData')
        
        console.log('URL params:', { source, hasPatientData: !!patientDataParam })
        
        if (source === 'tibok' && patientDataParam) {
          const decodedData = JSON.parse(decodeURIComponent(patientDataParam))
          console.log('Decoded patient data:', decodedData)
          
          setIsFromTibok(true)
          
          // Process birth date
          let birthDateStr = ""
          if (decodedData.dateOfBirth) {
            birthDateStr = decodedData.dateOfBirth.split('T')[0]
          } else if (decodedData.date_of_birth) {
            birthDateStr = decodedData.date_of_birth.split('T')[0]
          }
          
          // Process gender
          const genderArray: string[] = []
          if (decodedData.gender) {
            if (decodedData.gender === 'Masculin' || decodedData.gender === 'M' || decodedData.gender.toLowerCase() === 'male') {
              genderArray.push('Masculin')
            } else if (decodedData.gender === 'Féminin' || decodedData.gender === 'F' || decodedData.gender.toLowerCase() === 'female') {
              genderArray.push('Féminin')
            }
          }
          
          // Update form data
          const newFormData: PatientFormData = {
            firstName: decodedData.firstName || "",
            lastName: decodedData.lastName || "",
            birthDate: birthDateStr,
            age: decodedData.age ? decodedData.age.toString() : "",
            gender: genderArray,
            otherGender: "",
            weight: decodedData.weight ? decodedData.weight.toString() : "",
            height: decodedData.height ? decodedData.height.toString() : "",
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
        }
      } catch (error) {
        console.error('Error loading patient data from URL:', error)
      } finally {
        setIsLoadingPatientData(false)
      }
    }
    
    // Small delay to ensure component is mounted
    setTimeout(loadPatientDataFromURL, 100)
  }, [])

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

    if (!formData.firstName.trim()) newErrors.firstName = "Prénom requis"
    if (!formData.lastName.trim()) newErrors.lastName = "Nom requis"
    if (!formData.birthDate) {
      newErrors.birthDate = "Date de naissance requise"
    } else {
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      if (birthDate > today) {
        newErrors.birthDate = "La date de naissance ne peut pas être dans le futur"
      }
      const age = parseInt(formData.age)
      if (age < 0 || age > 120) {
        newErrors.birthDate = "Âge calculé invalide (0-120 ans)"
      }
    }
    if (formData.gender.length === 0 && !formData.otherGender.trim()) {
      newErrors.gender = "Veuillez sélectionner un sexe ou remplir le champ libre"
    }
    if (!formData.weight || Number.parseFloat(formData.weight) < 1 || Number.parseFloat(formData.weight) > 300) {
      newErrors.weight = "Poids valide requis (1-300 kg)"
    }
    if (!formData.height || Number.parseFloat(formData.height) < 50 || Number.parseFloat(formData.height) > 250) {
      newErrors.height = "Taille valide requise (50-250 cm)"
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
    if (bmi < 18.5) return { text: "Insuffisance pondérale", color: "bg-blue-100 text-blue-800", icon: "📉" }
    if (bmi < 25) return { text: "Poids normal", color: "bg-green-100 text-green-800", icon: "✅" }
    if (bmi < 30) return { text: "Surpoids", color: "bg-yellow-100 text-yellow-800", icon: "⚠️" }
    return { text: "Obésité", color: "bg-red-100 text-red-800", icon: "🔴" }
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
    { id: "identity", title: "Identité", icon: User },
    { id: "allergies", title: "Allergies", icon: AlertTriangle },
    { id: "history", title: "Antécédents", icon: Heart },
    { id: "medications", title: "Médicaments", icon: Pill },
    { id: "habits", title: "Habitudes", icon: Activity },
  ]

  if (isLoadingPatientData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données patient...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Show notification if data is from TIBOK */}
      {isFromTibok && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Consultation TIBOK - Patient: {formData.firstName} {formData.lastName}
            </p>
          </div>
        </div>
      )}

      {/* Header with Progress */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            <User className="h-8 w-8 text-blue-600" />
            Dossier Patient
          </CardTitle>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progression du formulaire</span>
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
            Informations Personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2 font-medium">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
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
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="birthDate" className="flex items-center gap-2 font-medium">
                Date de naissance <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange("birthDate", e.target.value)}
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
                Âge calculé
              </Label>
              <div className="flex items-center h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <span className="text-gray-700 font-medium">
                  {formData.age ? `${formData.age} ans` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2 font-medium">
              Sexe <span className="text-red-500">*</span>
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Masculin", "Féminin"].map((genderOption) => (
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
                    id={`gender-${genderOption}`}
                    checked={formData.gender.includes(genderOption)}
                    onCheckedChange={(checked) => handleGenderChange(genderOption, checked as boolean)}
                  />
                  <Label htmlFor={`gender-${genderOption}`} className="text-sm font-medium cursor-pointer">
                    {genderOption}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherGender" className="font-medium">Autre (préciser)</Label>
              <Input
                id="otherGender"
                name="otherGender"
                value={formData.otherGender}
                onChange={(e) => handleInputChange("otherGender", e.target.value)}
                className="transition-all duration-200 focus:ring-blue-200"
              />
            </div>

            {(formData.gender.length > 0 || formData.otherGender) && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold text-blue-800">Sexe déclaré:</p>
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
                Poids (kg) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
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
                Taille (cm) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="height"
                name="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
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
                  <p className="font-semibold">IMC: {bmi} kg/m²</p>
                  <p className="text-sm">{bmiCategory?.text}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Allergies */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            Allergies Connues
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une allergie..."
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
            <Label htmlFor="otherAllergies" className="font-medium">Autres allergies</Label>
            <Textarea
              id="otherAllergies"
              value={formData.otherAllergies}
              onChange={(e) => handleInputChange("otherAllergies", e.target.value)}
              rows={3}
              className="transition-all duration-200 focus:ring-red-200"
            />
          </div>

          {(formData.allergies.length > 0 || formData.otherAllergies) && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-red-800">Allergies déclarées:</p>
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

      {/* Section 3: Antécédents médicaux */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Heart className="h-6 w-6" />
            Antécédents Médicaux
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un antécédent médical..."
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
            <Label htmlFor="otherMedicalHistory" className="font-medium">Autres antécédents</Label>
            <Textarea
              id="otherMedicalHistory"
              value={formData.otherMedicalHistory}
              onChange={(e) => handleInputChange("otherMedicalHistory", e.target.value)}
              rows={3}
              className="transition-all duration-200 focus:ring-purple-200"
            />
          </div>

          {(formData.medicalHistory.length > 0 || formData.otherMedicalHistory) && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-purple-600" />
                <p className="font-semibold text-purple-800">Antécédents déclarés:</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.medicalHistory.map((condition) => (
                  <Badge key={condition} className="bg-purple-100 text-purple-800 text-xs">
                    {condition}
                  </Badge>
                ))}
                {formData.otherMedicalHistory && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    Autres antécédents
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Médicaments */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Pill className="h-6 w-6" />
            Médicaments Actuels
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentMedicationsText" className="font-medium">
              Traitements en cours
            </Label>
            <Textarea
              id="currentMedicationsText"
              value={formData.currentMedicationsText}
              onChange={(e) => handleInputChange("currentMedicationsText", e.target.value)}
              placeholder="Listez tous les médicaments actuels avec posologies...
Exemple: 
- Paracétamol 1g 3 fois par jour
- Lisinopril 10mg 1 fois le matin"
              rows={6}
              className="resize-y transition-all duration-200 focus:ring-green-200"
            />
          </div>

          {formData.currentMedicationsText && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-800">
                  Traitements renseignés ({formData.currentMedicationsText.split("\n").filter((line) => line.trim()).length} lignes)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Habitudes de vie */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            Habitudes de Vie
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <Label className="font-medium text-lg">🚬 Tabac</Label>
              <RadioGroup
                value={formData.lifeHabits.smoking}
                onValueChange={(value) => handleLifeHabitsChange("smoking", value)}
                className="space-y-3"
              >
                {["Non-fumeur", "Fumeur actuel", "Ex-fumeur"].map((option) => (
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
              <Label className="font-medium text-lg">🍷 Alcool</Label>
              <RadioGroup
                value={formData.lifeHabits.alcohol}
                onValueChange={(value) => handleLifeHabitsChange("alcohol", value)}
                className="space-y-3"
              >
                {["Jamais", "Occasionnel", "Régulier"].map((option) => (
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
              <Label className="font-medium text-lg">🏃 Activité physique</Label>
              <RadioGroup
                value={formData.lifeHabits.physicalActivity}
                onValueChange={(value) => handleLifeHabitsChange("physicalActivity", value)}
                className="space-y-3"
              >
                {["Sédentaire", "Modérée", "Intense"].map((option) => (
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
          <span className="text-sm text-gray-600">Sauvegarde automatique</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit} 
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Continuer vers l'Examen Clinique
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
