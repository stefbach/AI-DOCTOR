"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  ArrowRight, 
  Stethoscope, 
  Thermometer, 
  Activity,
  FileText,
  Clock,
  Heart,
  Search,
  XCircle,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

// ==================== INTERFACES & TYPES ====================
interface VitalSigns {
  temperature: string
  bloodPressureSystolic: string
  bloodPressureDiastolic: string
}

interface ClinicalData {
  chiefComplaint: string
  diseaseHistory: string
  symptomDuration: string
  symptoms: string[]
  painScale: string
  vitalSigns: VitalSigns
}

interface ClinicalFormProps {
  data?: Partial<ClinicalData>
  patientData?: any
  onDataChange: (data: ClinicalData) => void
  onNext: () => void
  onPrevious: () => void
  language?: Language
  consultationId?: string | null
}

interface ValidationErrors {
  [key: string]: string
}

// ==================== CONSTANTES ====================
const INITIAL_CLINICAL_DATA: ClinicalData = {
  chiefComplaint: "",
  diseaseHistory: "",
  symptomDuration: "",
  symptoms: [],
  painScale: "0",
  vitalSigns: {
    temperature: "37.0",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: ""
  }
}

const PAIN_SCALE_LABELS = {
  0: { label: "Aucune douleur", color: "bg-green-50 border-green-200 text-green-800" },
  1: { label: "Douleur légère", color: "bg-green-50 border-green-200 text-green-800" },
  2: { label: "Douleur légère", color: "bg-green-50 border-green-200 text-green-800" },
  3: { label: "Douleur légère", color: "bg-green-50 border-green-200 text-green-800" },
  4: { label: "Douleur modérée", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  5: { label: "Douleur modérée", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  6: { label: "Douleur modérée", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  7: { label: "Douleur sévère", color: "bg-orange-50 border-orange-200 text-orange-800" },
  8: { label: "Douleur sévère", color: "bg-orange-50 border-orange-200 text-orange-800" },
  9: { label: "Douleur très sévère", color: "bg-red-50 border-red-200 text-red-800" },
  10: { label: "Douleur insupportable", color: "bg-red-50 border-red-200 text-red-800" }
}

const SECTIONS = [
  { id: "complaint", titleKey: 'clinicalForm.sections.complaint', icon: FileText },
  { id: "history", titleKey: 'clinicalForm.sections.history', icon: Heart },
  { id: "duration", titleKey: 'clinicalForm.sections.duration', icon: Clock },
  { id: "symptoms", titleKey: 'clinicalForm.sections.symptoms', icon: Activity },
  { id: "vitals", titleKey: 'clinicalForm.sections.vitals', icon: Stethoscope },
]

// ==================== COMPOSANT PRINCIPAL ====================
export default function ModernClinicalForm({ 
  data, 
  patientData, 
  onDataChange, 
  onNext, 
  onPrevious,
  language = 'fr',
  consultationId
}: ClinicalFormProps) {
  // ========== Hooks ==========
  const t = useCallback((key: string) => getTranslation(key, language), [language])
  
  // ========== États ==========
  const [localData, setLocalData] = useState<ClinicalData>(() => ({
    ...INITIAL_CLINICAL_DATA,
    ...data,
    // S'assurer que symptoms est toujours un tableau
    symptoms: Array.isArray(data?.symptoms) ? data.symptoms : INITIAL_CLINICAL_DATA.symptoms,
    // S'assurer que vitalSigns est correctement initialisé
    vitalSigns: {
      ...INITIAL_CLINICAL_DATA.vitalSigns,
      ...data?.vitalSigns
    }
  }))
  
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [symptomSearch, setSymptomSearch] = useState("")
  const [currentSection, setCurrentSection] = useState(0)
  const [bpNotApplicable, setBpNotApplicable] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // ========== Mémoïsation des listes traduites ==========
  const COMMON_SYMPTOMS = useMemo(() => [
    t('symptoms.chestPain'),
    t('symptoms.shortness'),
    t('symptoms.palpitations'),
    t('symptoms.fatigue'),
    t('symptoms.nausea'),
    t('symptoms.vomiting'),
    t('symptoms.diarrhea'),
    t('symptoms.constipation'),
    t('symptoms.headache'),
    t('symptoms.dizziness'),
    t('symptoms.fever'),
    t('symptoms.chills'),
    t('symptoms.cough'),
    t('symptoms.abdominalPain'),
    t('symptoms.backPain'),
    t('symptoms.insomnia'),
    t('symptoms.anxiety'),
    t('symptoms.lossAppetite'),
    t('symptoms.weightLoss'),
    t('symptoms.legSwelling'),
    t('symptoms.jointPain'),
    t('symptoms.rash'),
    t('symptoms.blurredVision'),
    t('symptoms.hearingProblems'),
  ], [t])

  const DURATION_OPTIONS = useMemo(() => [
    { value: 'less_hour', label: t('durationOptions.lessHour') },
    { value: '1_6_hours', label: t('durationOptions.oneToSixHours') },
    { value: '6_24_hours', label: t('durationOptions.sixToTwentyFourHours') },
    { value: '1_3_days', label: t('durationOptions.oneToThreeDays') },
    { value: '3_7_days', label: t('durationOptions.threeToSevenDays') },
    { value: '1_4_weeks', label: t('durationOptions.oneToFourWeeks') },
    { value: '1_6_months', label: t('durationOptions.oneToSixMonths') },
    { value: 'more_6_months', label: t('durationOptions.moreSixMonths') }
  ], [t])

  // ========== Fonctions utilitaires ==========
  const calculateProgress = useCallback((): number => {
    const fields = [
      localData.chiefComplaint,
      localData.diseaseHistory,
      localData.symptomDuration,
      localData.symptoms?.length > 0 ? "filled" : "", // Protection contre undefined
      localData.painScale && localData.painScale !== "0" ? "filled" : ""
    ]
    
    const completed = fields.filter(field => field && field.toString().trim()).length
    return Math.round((completed / fields.length) * 100)
  }, [localData])

  const validateTemperature = useCallback((temp: string): string => {
    const temperature = parseFloat(temp)
    if (isNaN(temperature)) return ""
    
    if (temperature < 36.1) return t('clinicalForm.hypothermia')
    if (temperature >= 36.1 && temperature <= 37.2) return t('clinicalForm.normal')
    if (temperature > 37.2 && temperature <= 38) return t('clinicalForm.mildFever')
    if (temperature > 38) return t('clinicalForm.fever')
    
    return ""
  }, [t])

  const validateBloodPressure = useCallback((systolic: string, diastolic: string): string => {
    const sys = parseInt(systolic)
    const dia = parseInt(diastolic)
    
    if (isNaN(sys) || isNaN(dia)) return ""
    
    if (sys < 90 || dia < 60) return t('clinicalForm.hypotension')
    if (sys < 120 && dia < 80) return t('clinicalForm.normal')
    if (sys >= 120 && sys < 140 && dia < 90) return t('clinicalForm.preHypertension')
    if (sys >= 140 || dia >= 90) return t('clinicalForm.hypertension')
    
    return ""
  }, [t])

  // ========== Gestionnaires d'événements ==========
  const updateData = useCallback((updates: Partial<ClinicalData>) => {
    setLocalData(prev => {
      const newData = { ...prev, ...updates }
      // S'assurer que symptoms est toujours un tableau
      if ('symptoms' in updates && !Array.isArray(newData.symptoms)) {
        newData.symptoms = []
      }
      return newData
    })
    
    // Effacer les erreurs associées
    if (updates.chiefComplaint) setErrors(prev => ({ ...prev, chiefComplaint: "" }))
    if (updates.diseaseHistory) setErrors(prev => ({ ...prev, diseaseHistory: "" }))
  }, [])

  const updateVitalSigns = useCallback((field: keyof VitalSigns, value: string) => {
    setLocalData(prev => ({
      ...prev,
      vitalSigns: { ...prev.vitalSigns, [field]: value }
    }))
  }, [])

  const toggleSymptom = useCallback((symptom: string) => {
    setLocalData(prev => {
      const currentSymptoms = Array.isArray(prev.symptoms) ? prev.symptoms : []
      const newSymptoms = currentSymptoms.includes(symptom)
        ? currentSymptoms.filter(s => s !== symptom)
        : [...currentSymptoms, symptom]
      
      return { ...prev, symptoms: newSymptoms }
    })
  }, [])

  const toggleBPNotApplicable = useCallback(() => {
    setBpNotApplicable(prev => {
      const newValue = !prev
      
      if (newValue) {
        updateVitalSigns("bloodPressureSystolic", "N/A")
        updateVitalSigns("bloodPressureDiastolic", "N/A")
      } else {
        updateVitalSigns("bloodPressureSystolic", "")
        updateVitalSigns("bloodPressureDiastolic", "")
      }
      
      return newValue
    })
  }, [updateVitalSigns])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.currentTarget.tagName !== 'TEXTAREA') {
      e.preventDefault()
      const form = e.currentTarget.closest('form')
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
    
    if (!localData.chiefComplaint.trim()) {
      newErrors.chiefComplaint = t('clinicalForm.errors.chiefComplaintRequired')
    }
    
    if (!localData.diseaseHistory.trim()) {
      newErrors.diseaseHistory = t('clinicalForm.errors.diseaseHistoryRequired')
    }
    
    if (!localData.symptomDuration) {
      newErrors.symptomDuration = t('clinicalForm.errors.durationRequired')
    }
    
    const symptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
    if (symptoms.length === 0) {
      newErrors.symptoms = t('clinicalForm.errors.symptomsRequired')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [localData, t])

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
  
  // Chargement initial des données sauvegardées
  useEffect(() => {
    const loadSavedData = async () => {
      if (!consultationId) return
      
      try {
        setIsLoading(true)
        const savedData = await consultationDataService.getAllData()
        
        if (savedData?.clinicalData) {
          setLocalData(prev => ({
            ...prev,
            ...savedData.clinicalData,
            // S'assurer que les tableaux et objets sont correctement initialisés
            symptoms: Array.isArray(savedData.clinicalData.symptoms) 
              ? savedData.clinicalData.symptoms 
              : [],
            vitalSigns: {
              ...INITIAL_CLINICAL_DATA.vitalSigns,
              ...savedData.clinicalData.vitalSigns
            }
          }))
        }
      } catch (error) {
        console.error('Erreur chargement données cliniques:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSavedData()
  }, [consultationId])

  // Mise à jour quand les props changent
  useEffect(() => {
    if (data) {
      setLocalData(prev => ({
        ...prev,
        ...data,
        symptoms: Array.isArray(data.symptoms) ? data.symptoms : prev.symptoms,
        vitalSigns: {
          ...prev.vitalSigns,
          ...data.vitalSigns
        }
      }))
    }
  }, [data])

  // Sauvegarde automatique
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (localData.chiefComplaint || localData.diseaseHistory || localData.symptoms.length > 0) {
        try {
          await consultationDataService.saveStepData(1, localData)
          setLastSaved(new Date())
          onDataChange(localData)
        } catch (error) {
          console.error('Erreur sauvegarde données cliniques:', error)
        }
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [localData, onDataChange])

  // ========== Variables calculées ==========
  const progress = calculateProgress()
  const painLevel = parseInt(localData.painScale || "0")
  const painInfo = PAIN_SCALE_LABELS[painLevel as keyof typeof PAIN_SCALE_LABELS]
  
  const filteredSymptoms = COMMON_SYMPTOMS.filter(symptom =>
    symptom.toLowerCase().includes(symptomSearch.toLowerCase())
  )

  const temperatureStatus = validateTemperature(localData.vitalSigns.temperature)
  const bpStatus = validateBloodPressure(
    localData.vitalSigns.bloodPressureSystolic,
    localData.vitalSigns.bloodPressureDiastolic
  )

  // ========== Rendu ==========
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {/* En-tête avec progression */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            <Stethoscope className="h-8 w-8 text-purple-600" />
            {t('clinicalForm.title')}
          </CardTitle>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('clinicalForm.progressTitle')}</span>
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
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{t(section.titleKey)}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Motif de consultation */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            {t('clinicalForm.chiefComplaint')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint" className="font-medium">
              {t('clinicalForm.mainReason')}
            </Label>
            <Textarea
              id="chiefComplaint"
              value={localData.chiefComplaint}
              onChange={(e) => updateData({ chiefComplaint: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder={t('clinicalForm.describePlaceholder')}
              rows={3}
              className={`resize-none ${errors.chiefComplaint ? 'border-red-500' : ''}`}
            />
            {errors.chiefComplaint && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.chiefComplaint}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {t('clinicalForm.summaryHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Histoire de la maladie */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Heart className="h-6 w-6" />
            {t('clinicalForm.diseaseHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="diseaseHistory" className="font-medium">
              {t('clinicalForm.symptomEvolution')}
            </Label>
            <Textarea
              id="diseaseHistory"
              value={localData.diseaseHistory}
              onChange={(e) => updateData({ diseaseHistory: e.target.value })}
              placeholder={t('clinicalForm.historyPlaceholder')}
              rows={5}
              className={`resize-none ${errors.diseaseHistory ? 'border-red-500' : ''}`}
            />
            {errors.diseaseHistory && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.diseaseHistory}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {t('clinicalForm.detailedHistory')}
            </p>
          </div>

          {localData.diseaseHistory && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <p className="font-semibold text-blue-800">
                  {t('clinicalForm.documentedHistory')} ({localData.diseaseHistory.length} {t('clinicalForm.characters')})
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Durée des symptômes */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            {t('clinicalForm.duration')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="symptomDuration" className="font-medium">
              {t('clinicalForm.symptomDuration')}
            </Label>
            <Select
              value={localData.symptomDuration}
              onValueChange={(value) => updateData({ symptomDuration: value })}
            >
              <SelectTrigger className={errors.symptomDuration ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('clinicalForm.selectDuration')} />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.symptomDuration && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.symptomDuration}
              </p>
            )}
            
            {localData.symptomDuration && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <p className="font-semibold text-green-800">
                    {t('clinicalForm.evolutionSince')} {
                      DURATION_OPTIONS.find(opt => opt.value === localData.symptomDuration)?.label
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3.5: Intensité de la douleur */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            {t('clinicalForm.painIntensity')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="font-medium">
              {t('clinicalForm.painScaleQuestion')}
            </Label>
            <div className="space-y-4">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={localData.painScale}
                onChange={(e) => updateData({ painScale: e.target.value })}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #eab308 50%, #ef4444 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-600 font-medium">
                {[...Array(11)].map((_, i) => (
                  <span key={i} className="text-center">{i}</span>
                ))}
              </div>
            </div>
            
            {painLevel > 0 && (
              <div className={`mt-3 p-4 rounded-lg border-2 ${painInfo.color}`}>
                <p className="font-semibold text-lg">
                  {t('clinicalForm.painLevel')}: {localData.painScale}/10
                </p>
                <p className="text-sm mt-1">
                  {painInfo.label}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Symptômes actuels */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            {t('clinicalForm.currentSymptoms')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('clinicalForm.searchSymptom')}
              value={symptomSearch}
              onChange={(e) => setSymptomSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {errors.symptoms && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.symptoms}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredSymptoms.map((symptom) => {
              const isSelected = localData.symptoms.includes(symptom)
              return (
                <label
                  key={symptom}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSymptom(symptom)}
                  />
                  <span className="text-sm font-medium">{symptom}</span>
                </label>
              )
            })}
          </div>

          {localData.symptoms.length > 0 && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-orange-600" />
                <p className="font-semibold text-orange-800">
                  {t('clinicalForm.selectedSymptoms')} ({localData.symptoms.length})
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {localData.symptoms.map((symptom) => (
                  <Badge key={symptom} className="bg-orange-100 text-orange-800 text-xs">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Signes vitaux */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6" />
            {t('clinicalForm.vitalSigns')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Température */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-red-500" />
                <Label htmlFor="temperature" className="font-medium">
                  {t('clinicalForm.temperature')}
                </Label>
              </div>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="35"
                max="42"
                value={localData.vitalSigns.temperature}
                onChange={(e) => updateVitalSigns("temperature", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="37.0"
              />
              {temperatureStatus && (
                <p className={`text-xs font-medium ${
                  temperatureStatus === t('clinicalForm.normal') ? 'text-green-600' :
                  temperatureStatus === t('clinicalForm.hypothermia') ? 'text-blue-600' :
                  'text-red-600'
                }`}>
                  {temperatureStatus === t('clinicalForm.normal') ? '✅' : 
                   temperatureStatus === t('clinicalForm.hypothermia') ? '🟦' : '🔴'} {temperatureStatus}
                </p>
              )}
            </div>

            {/* Tension systolique */}
            <div className="space-y-2">
              <Label htmlFor="bloodPressureSystolic" className="font-medium">
                {t('clinicalForm.systolicBP')}
              </Label>
              <Input
                id="bloodPressureSystolic"
                type="number"
                min="70"
                max="250"
                value={bpNotApplicable ? "N/A" : localData.vitalSigns.bloodPressureSystolic}
                onChange={(e) => updateVitalSigns("bloodPressureSystolic", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="120"
                disabled={bpNotApplicable}
                className={bpNotApplicable ? 'opacity-50' : ''}
              />
            </div>

            {/* Tension diastolique */}
            <div className="space-y-2">
              <Label htmlFor="bloodPressureDiastolic" className="font-medium">
                {t('clinicalForm.diastolicBP')}
              </Label>
              <Input
                id="bloodPressureDiastolic"
                type="number"
                min="40"
                max="150"
                value={bpNotApplicable ? "N/A" : localData.vitalSigns.bloodPressureDiastolic}
                onChange={(e) => updateVitalSigns("bloodPressureDiastolic", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="80"
                disabled={bpNotApplicable}
                className={bpNotApplicable ? 'opacity-50' : ''}
              />
            </div>
          </div>

          {/* Bouton Non applicable */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleBPNotApplicable}
              className={bpNotApplicable ? 'bg-gray-100' : ''}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('clinicalForm.bpNotApplicable')}
            </Button>
          </div>

          {/* Affichage de la tension */}
          {(localData.vitalSigns.bloodPressureSystolic && localData.vitalSigns.bloodPressureDiastolic && !bpNotApplicable) && (
            <div className={`mt-4 p-3 rounded-lg border ${
              bpStatus === t('clinicalForm.normal') ? 'bg-green-50 border-green-200' :
              bpStatus === t('clinicalForm.hypotension') ? 'bg-blue-50 border-blue-200' :
              bpStatus === t('clinicalForm.preHypertension') ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${
                  bpStatus === t('clinicalForm.normal') ? 'text-green-600' :
                  bpStatus === t('clinicalForm.hypotension') ? 'text-blue-600' :
                  bpStatus === t('clinicalForm.preHypertension') ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
                <p className="font-semibold">
                  {t('clinicalForm.bloodPressure')}: {localData.vitalSigns.bloodPressureSystolic}/{localData.vitalSigns.bloodPressureDiastolic} mmHg
                </p>
              </div>
              {bpStatus && (
                <p className="text-sm mt-1">
                  {bpStatus === t('clinicalForm.normal') ? '✅' :
                   bpStatus === t('clinicalForm.hypotension') ? '🟦' :
                   bpStatus === t('clinicalForm.preHypertension') ? '🟡' : '⚠️'} {bpStatus}
                </p>
              )}
            </div>
          )}

          {bpNotApplicable && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-600" />
                <p className="font-semibold text-gray-800">
                  {t('clinicalForm.bpNotMeasured')}
                </p>
              </div>
            </div>
          )}
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

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          type="button"
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('clinicalForm.backButton')}
        </Button>
        <Button 
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('clinicalForm.continueToAI')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  )
}