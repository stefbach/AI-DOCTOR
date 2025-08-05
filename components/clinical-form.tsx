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
import { useTibokPatientData } from "@/hooks/use-tibok-patient-data"
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

// ==================== CONSTANTS ====================
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
  0: { label: "No pain", color: "bg-green-50 border-green-200 text-green-800" },
  1: { label: "Mild pain", color: "bg-green-50 border-green-200 text-green-800" },
  2: { label: "Mild pain", color: "bg-green-50 border-green-200 text-green-800" },
  3: { label: "Mild pain", color: "bg-green-50 border-green-200 text-green-800" },
  4: { label: "Moderate pain", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  5: { label: "Moderate pain", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  6: { label: "Moderate pain", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  7: { label: "Severe pain", color: "bg-orange-50 border-orange-200 text-orange-800" },
  8: { label: "Severe pain", color: "bg-orange-50 border-orange-200 text-orange-800" },
  9: { label: "Very severe pain", color: "bg-red-50 border-red-200 text-red-800" },
  10: { label: "Unbearable pain", color: "bg-red-50 border-red-200 text-red-800" }
}

const SECTIONS = [
  { id: "complaint", titleKey: 'clinicalForm.sections.complaint', icon: FileText },
  { id: "history", titleKey: 'clinicalForm.sections.history', icon: Heart },
  { id: "duration", titleKey: 'clinicalForm.sections.duration', icon: Clock },
  { id: "symptoms", titleKey: 'clinicalForm.sections.symptoms', icon: Activity },
  { id: "vitals", titleKey: 'clinicalForm.sections.vitals', icon: Stethoscope },
]

// ==================== MAIN COMPONENT ====================
export default function ModernClinicalForm({ 
  data, 
  patientData, 
  onDataChange, 
  onNext, 
  onPrevious,
  language = 'en',
  consultationId
}: ClinicalFormProps) {
  // ========== Hooks ==========
  const { patientData: tibokPatient, isFromTibok } = useTibokPatientData()
  const t = useCallback((key: string) => getTranslation(key, language), [language])
  
  // ========== States ==========
  const [localData, setLocalData] = useState<ClinicalData>(() => ({
    ...INITIAL_CLINICAL_DATA,
    ...data,
    // Ensure symptoms is always an array
    symptoms: Array.isArray(data?.symptoms) ? data.symptoms : INITIAL_CLINICAL_DATA.symptoms,
    // Ensure vitalSigns is properly initialized
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
  const [dataInitialized, setDataInitialized] = useState(false)

  // ========== Memoization of translated lists ==========
  const COMMON_SYMPTOMS = useMemo(() => [
    "Chest pain",
    "Shortness of breath",
    "Palpitations",
    "Fatigue",
    "Nausea",
    "Vomiting",
    "Diarrhea",
    "Constipation",
    "Headache",
    "Dizziness",
    "Fever",
    "Chills",
    "Cough",
    "Abdominal pain",
    "Back pain",
    "Insomnia",
    "Anxiety",
    "Loss of appetite",
    "Weight loss",
    "Leg swelling",
    "Joint pain",
    "Rash",
    "Blurred vision",
    "Hearing problems",
  ], [])

  const DURATION_OPTIONS = useMemo(() => [
    { value: 'less_hour', label: 'Less than 1 hour' },
    { value: '1_6_hours', label: '1 to 6 hours' },
    { value: '6_24_hours', label: '6 to 24 hours' },
    { value: '1_3_days', label: '1 to 3 days' },
    { value: '3_7_days', label: '3 to 7 days' },
    { value: '1_4_weeks', label: '1 to 4 weeks' },
    { value: '1_6_months', label: '1 to 6 months' },
    { value: 'more_6_months', label: 'More than 6 months' }
  ], [])

  // ========== Utility functions ==========
  const calculateProgress = useCallback((): number => {
    const fields = [
      localData.chiefComplaint,
      localData.diseaseHistory,
      localData.symptomDuration,
      localData.symptoms?.length > 0 ? "filled" : "", // Protection against undefined
      localData.painScale && localData.painScale !== "0" ? "filled" : ""
    ]
    
    const completed = fields.filter(field => field && field.toString().trim()).length
    return Math.round((completed / fields.length) * 100)
  }, [localData])

  const validateTemperature = useCallback((temp: string): string => {
    const temperature = parseFloat(temp)
    if (isNaN(temperature)) return ""
    
    if (temperature < 36.1) return "Hypothermia"
    if (temperature >= 36.1 && temperature <= 37.2) return "Normal"
    if (temperature > 37.2 && temperature <= 38) return "Mild fever"
    if (temperature > 38) return "Fever"
    
    return ""
  }, [])

  const validateBloodPressure = useCallback((systolic: string, diastolic: string): string => {
    const sys = parseInt(systolic)
    const dia = parseInt(diastolic)
    
    if (isNaN(sys) || isNaN(dia)) return ""
    
    if (sys < 90 || dia < 60) return "Hypotension"
    if (sys < 120 && dia < 80) return "Normal"
    if (sys >= 120 && sys < 140 && dia < 90) return "Pre-hypertension"
    if (sys >= 140 || dia >= 90) return "Hypertension"
    
    return ""
  }, [])

  // ========== Event handlers ==========
  const updateData = useCallback((updates: Partial<ClinicalData>) => {
    setLocalData(prev => {
      const newData = { ...prev, ...updates }
      // Ensure symptoms is always an array
      if ('symptoms' in updates && !Array.isArray(newData.symptoms)) {
        newData.symptoms = []
      }
      return newData
    })
    
    // Clear associated errors
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
      newErrors.chiefComplaint = "Chief complaint is required"
    }
    
    if (!localData.diseaseHistory.trim()) {
      newErrors.diseaseHistory = "Disease history is required"
    }
    
    if (!localData.symptomDuration) {
      newErrors.symptomDuration = "Symptom duration is required"
    }
    
    const symptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
    if (symptoms.length === 0) {
      newErrors.symptoms = "At least one symptom must be selected"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [localData])

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onNext()
    } else {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0]
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus()
      }
    }
  }, [validateForm, onNext, errors])

  // ========== Effects ==========
  
  // Initial loading of saved data
  useEffect(() => {
    const loadSavedData = async () => {
      if (!consultationId) return
      
      try {
        setIsLoading(true)
        
        // 🎯 FIRST: Check for TIBOK data and auto-fill
        if (tibokPatient && !dataInitialized) {
          console.log('🔄 Auto-filling clinical form with TIBOK data:', {
            symptoms: tibokPatient.currentSymptoms,
            consultationReason: tibokPatient.consultationReason,
            vitalSigns: tibokPatient.vitalSigns,
            currentMedications: tibokPatient.currentMedications
          })

          const tibokClinicalData = {
            // 🎯 AUTO-FILL SYMPTOMS FROM TIBOK
            symptoms: Array.isArray(tibokPatient.currentSymptoms) ? tibokPatient.currentSymptoms : [],
            
            // 🎯 AUTO-FILL CONSULTATION REASON FROM TIBOK
            chiefComplaint: tibokPatient.consultationReason || "",
            
            // 🎯 AUTO-FILL VITAL SIGNS FROM TIBOK  
            vitalSigns: {
              temperature: tibokPatient.vitalSigns?.temperature?.toString() || "37.0",
              bloodPressureSystolic: tibokPatient.vitalSigns?.bloodPressureSystolic?.toString() || "",
              bloodPressureDiastolic: tibokPatient.vitalSigns?.bloodPressureDiastolic?.toString() || ""
            },
            
            // Keep existing values or defaults for other fields
            diseaseHistory: "",
            symptomDuration: "",
            painScale: "0"
          }

          setLocalData(prev => ({
            ...prev,
            ...tibokClinicalData
          }))

          console.log('✅ Clinical form auto-filled successfully:', {
            symptomsCount: tibokClinicalData.symptoms.length,
            hasComplaint: !!tibokClinicalData.chiefComplaint,
            hasVitalSigns: !!(tibokClinicalData.vitalSigns.temperature && tibokClinicalData.vitalSigns.temperature !== "37.0")
          })

          setDataInitialized(true)
          setIsLoading(false)
          return
        }
        
        // SECOND: Try to load saved data from database
        const savedData = await consultationDataService.getAllData()
        
        if (savedData?.clinicalData) {
          setLocalData(prev => ({
            ...prev,
            ...savedData.clinicalData,
            // Ensure arrays and objects are properly initialized
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
        console.error('Error loading clinical data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSavedData()
  }, [consultationId, tibokPatient, dataInitialized])

  // Update when props change
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

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (localData.chiefComplaint || localData.diseaseHistory || localData.symptoms.length > 0) {
        try {
          await consultationDataService.saveStepData(1, localData)
          setLastSaved(new Date())
          onDataChange(localData)
        } catch (error) {
          console.error('Error saving clinical data:', error)
        }
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [localData, onDataChange])

  // ========== Calculated variables ==========
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

  // Show TIBOK notification when data was auto-filled
  const showTibokNotification = dataInitialized && isFromTibok && tibokPatient

  // ========== Render ==========
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {/* TIBOK Notification */}
      {showTibokNotification && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Clinical information retrieved from TIBOK for {tibokPatient.firstName} {tibokPatient.lastName}
              {localData.symptoms.length > 0 && (
                <span className="ml-2">
                  • {localData.symptoms.length} symptoms auto-filled
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Header with progress */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            <Stethoscope className="h-8 w-8 text-purple-600" />
            Clinical Information
          </CardTitle>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
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
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{t(section.titleKey)}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Chief complaint */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            Chief Complaint
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint" className="font-medium">
              What is the main reason for your consultation?
            </Label>
            <Textarea
              id="chiefComplaint"
              value={localData.chiefComplaint}
              onChange={(e) => updateData({ chiefComplaint: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Describe your main concern or symptom..."
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
              Please provide a clear and concise summary of your main health concern.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Disease history */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Heart className="h-6 w-6" />
            Disease History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="diseaseHistory" className="font-medium">
              How have your symptoms evolved?
            </Label>
            <Textarea
              id="diseaseHistory"
              value={localData.diseaseHistory}
              onChange={(e) => updateData({ diseaseHistory: e.target.value })}
              placeholder="Describe how your symptoms started and how they have progressed over time..."
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
              Include details about when symptoms started, what makes them better or worse, and any treatments you've tried.
            </p>
          </div>

          {localData.diseaseHistory && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <p className="font-semibold text-blue-800">
                  History documented ({localData.diseaseHistory.length} characters)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Symptom duration */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="symptomDuration" className="font-medium">
              How long have you been experiencing these symptoms?
            </Label>
            <Select
              value={localData.symptomDuration}
              onValueChange={(value) => updateData({ symptomDuration: value })}
            >
              <SelectTrigger className={errors.symptomDuration ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select duration" />
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
                    Symptoms present for {
                      DURATION_OPTIONS.find(opt => opt.value === localData.symptomDuration)?.label.toLowerCase()
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3.5: Pain intensity */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            Pain Intensity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="font-medium">
              Rate your pain on a scale from 0 to 10
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
                  Pain level: {localData.painScale}/10
                </p>
                <p className="text-sm mt-1">
                  {painInfo.label}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Current symptoms */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            Current Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search symptoms..."
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
                  Selected symptoms ({localData.symptoms.length})
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

      {/* Section 5: Vital signs */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6" />
            Vital Signs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-red-500" />
                <Label htmlFor="temperature" className="font-medium">
                  Temperature (°C)
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
                  temperatureStatus === 'Normal' ? 'text-green-600' :
                  temperatureStatus === 'Hypothermia' ? 'text-blue-600' :
                  'text-red-600'
                }`}>
                  {temperatureStatus === 'Normal' ? '✅' : 
                   temperatureStatus === 'Hypothermia' ? '🟦' : '🔴'} {temperatureStatus}
                </p>
              )}
            </div>

            {/* Systolic blood pressure */}
            <div className="space-y-2">
              <Label htmlFor="bloodPressureSystolic" className="font-medium">
                Systolic BP (mmHg)
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

            {/* Diastolic blood pressure */}
            <div className="space-y-2">
              <Label htmlFor="bloodPressureDiastolic" className="font-medium">
                Diastolic BP (mmHg)
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

          {/* Not applicable button */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleBPNotApplicable}
              className={bpNotApplicable ? 'bg-gray-100' : ''}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Blood pressure not available
            </Button>
          </div>

          {/* Blood pressure display */}
          {(localData.vitalSigns.bloodPressureSystolic && localData.vitalSigns.bloodPressureDiastolic && !bpNotApplicable) && (
            <div className={`mt-4 p-3 rounded-lg border ${
              bpStatus === 'Normal' ? 'bg-green-50 border-green-200' :
              bpStatus === 'Hypotension' ? 'bg-blue-50 border-blue-200' :
              bpStatus === 'Pre-hypertension' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${
                  bpStatus === 'Normal' ? 'text-green-600' :
                  bpStatus === 'Hypotension' ? 'text-blue-600' :
                  bpStatus === 'Pre-hypertension' ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
                <p className="font-semibold">
                  Blood pressure: {localData.vitalSigns.bloodPressureSystolic}/{localData.vitalSigns.bloodPressureDiastolic} mmHg
                </p>
              </div>
              {bpStatus && (
                <p className="text-sm mt-1">
                  {bpStatus === 'Normal' ? '✅' :
                   bpStatus === 'Hypotension' ? '🟦' :
                   bpStatus === 'Pre-hypertension' ? '🟡' : '⚠️'} {bpStatus}
                </p>
              )}
            </div>
          )}

          {bpNotApplicable && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-600" />
                <p className="font-semibold text-gray-800">
                  Blood pressure not measured
                </p>
              </div>
            </div>
          )}
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

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          type="button"
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button 
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Continue to AI Analysis
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  )
}
