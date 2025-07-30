"use client"

import { useState, useEffect } from "react"
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
  XCircle
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

interface ClinicalData {
  chiefComplaint: string
  diseaseHistory: string
  symptomDuration: string
  symptoms: string[]
  painScale: string
  vitalSigns: {
    temperature: string
    bloodPressureSystolic: string
    bloodPressureDiastolic: string
  }
}

interface ClinicalFormProps {
  data?: ClinicalData
  patientData?: any
  onDataChange: (data: ClinicalData) => void
  onNext: () => void
  onPrevious: () => void
  language?: Language
  consultationId?: string | null
}

export default function ModernClinicalForm({ 
  data, 
  patientData, 
  onDataChange, 
  onNext, 
  onPrevious,
  language = 'fr',
  consultationId
}: ClinicalFormProps) {
  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)

  // Get translated arrays
  const COMMON_SYMPTOMS = [
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
  ]

  const defaultClinicalData: ClinicalData = {
    chiefComplaint: "",
    diseaseHistory: "",
    symptomDuration: "",
    symptoms: [],
    painScale: "",
    vitalSigns: {
      temperature: "37",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
    },
  }

  const [localData, setLocalData] = useState<ClinicalData>(data || defaultClinicalData)
  const [symptomSearch, setSymptomSearch] = useState("")
  const [currentSection, setCurrentSection] = useState(0)
  const [bpNotApplicable, setBpNotApplicable] = useState(false)

  // Function to handle Enter key navigation
  const handleEnterKeyNavigation = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.currentTarget.tagName !== 'TEXTAREA') {
      e.preventDefault()
      
      // Get all focusable elements
      const focusableElements = document.querySelectorAll(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      
      const currentIndex = Array.from(focusableElements).indexOf(e.currentTarget)
      
      if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1] as HTMLElement
        nextElement.focus()
      }
    }
  }

  // Function to handle double click on checkboxes
  const handleCheckboxDoubleClick = (symptom: string, nextFocusId?: string) => {
    toggleSymptom(symptom)
    if (nextFocusId) {
      setTimeout(() => {
        const nextElement = document.getElementById(nextFocusId)
        if (nextElement) {
          nextElement.focus()
        }
      }, 100)
    }
  }

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
        
        if (currentConsultationId) {
          const savedData = await consultationDataService.getAllData()
          if (savedData?.clinicalData) {
            setLocalData({
              ...savedData.clinicalData,
              vitalSigns: {
                ...savedData.clinicalData.vitalSigns,
                temperature: savedData.clinicalData.vitalSigns?.temperature || "37"
              }
            })
          }
        }
      } catch (error) {
        console.error('Error loading saved clinical data:', error)
      }
    }
    
    loadSavedData()
  }, [consultationId])

  // Save data when it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await consultationDataService.saveStepData(1, localData)
      } catch (error) {
        console.error('Error saving clinical data:', error)
      }
    }
    
    const timer = setTimeout(() => {
      if (localData.chiefComplaint || localData.diseaseHistory || localData.symptoms.length > 0) {
        saveData()
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [localData])

  useEffect(() => {
    if (data) {
      setLocalData({
        chiefComplaint: data.chiefComplaint || "",
        diseaseHistory: data.diseaseHistory || "",
        symptomDuration: data.symptomDuration || "",
        symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
        painScale: data.painScale || "",
        vitalSigns: {
          temperature: data.vitalSigns?.temperature || "37",
          bloodPressureSystolic: data.vitalSigns?.bloodPressureSystolic || "",
          bloodPressureDiastolic: data.vitalSigns?.bloodPressureDiastolic || "",
        },
      })
    }
  }, [data])

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onDataChange(localData)
    }, 500)
    return () => clearTimeout(timer)
  }, [localData, onDataChange])

  // Calculate progress
  const calculateProgress = () => {
    const fields = [
      localData.chiefComplaint,
      localData.diseaseHistory,
      localData.symptomDuration,
      localData.symptoms.length > 0 ? "filled" : "",
      localData.painScale,
    ]
    
    const completed = fields.filter(field => field && field.toString().trim()).length
    return Math.round((completed / fields.length) * 100)
  }

  const updateData = (updates: Partial<ClinicalData>) => {
    const newData = { ...localData, ...updates }
    setLocalData(newData)
  }

  const updateVitalSigns = (field: string, value: string) => {
    const newVitalSigns = { ...localData.vitalSigns, [field]: value }
    updateData({ vitalSigns: newVitalSigns })
  }

  const toggleSymptom = (symptom: string) => {
    const currentSymptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
    const newSymptoms = currentSymptoms.includes(symptom)
      ? currentSymptoms.filter((s) => s !== symptom)
      : [...currentSymptoms, symptom]
    updateData({ symptoms: newSymptoms })
  }

  const toggleBPNotApplicable = () => {
    const newBpNotApplicable = !bpNotApplicable
    setBpNotApplicable(newBpNotApplicable)
    
    if (newBpNotApplicable) {
      updateVitalSigns("bloodPressureSystolic", "N/A")
      updateVitalSigns("bloodPressureDiastolic", "N/A")
    } else {
      updateVitalSigns("bloodPressureSystolic", "")
      updateVitalSigns("bloodPressureDiastolic", "")
    }
  }

  const progress = calculateProgress()

  const filteredSymptoms = COMMON_SYMPTOMS.filter(symptom =>
    symptom.toLowerCase().includes(symptomSearch.toLowerCase())
  )

  const sections = [
    { id: "complaint", title: t('clinicalForm.sections.complaint'), icon: FileText },
    { id: "history", title: t('clinicalForm.sections.history'), icon: Heart },
    { id: "duration", title: t('clinicalForm.sections.duration'), icon: Clock },
    { id: "symptoms", title: t('clinicalForm.sections.symptoms'), icon: Activity },
    { id: "vitals", title: t('clinicalForm.sections.vitals'), icon: Stethoscope },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
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

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => setCurrentSection(index)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
              currentSection === index
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{section.title}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Chief Complaint */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
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
              value={localData.chiefComplaint || ""}
              onChange={(e) => updateData({ chiefComplaint: e.target.value })}
              onKeyDown={handleEnterKeyNavigation}
              placeholder={t('clinicalForm.describePlaceholder')}
              rows={3}
              className="transition-all duration-200 focus:ring-purple-200 resize-y"
            />
            <p className="text-xs text-gray-500">
              {t('clinicalForm.summaryHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Disease History */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
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
              value={localData.diseaseHistory || ""}
              onChange={(e) => updateData({ diseaseHistory: e.target.value })}
              onKeyDown={handleEnterKeyNavigation}
              placeholder={t('clinicalForm.historyPlaceholder')}
              rows={5}
              className="transition-all duration-200 focus:ring-blue-200 resize-y"
            />
            <p className="text-xs text-gray-500">
              {t('clinicalForm.detailedHistory')}
            </p>
          </div>

          {localData.diseaseHistory && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-blue-600" />
                <p className="font-semibold text-blue-800">
                  {t('clinicalForm.documentedHistory')} ({localData.diseaseHistory.length} {t('clinicalForm.characters')})
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Duration */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
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
              value={localData.symptomDuration || ""}
              onValueChange={(value) => updateData({ symptomDuration: value })}
            >
              <SelectTrigger className="transition-all duration-200 focus:ring-green-200">
                <SelectValue placeholder={t('clinicalForm.selectDuration')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={t('durationOptions.lessHour')}>{t('durationOptions.lessHour')}</SelectItem>
                <SelectItem value={t('durationOptions.oneToSixHours')}>{t('durationOptions.oneToSixHours')}</SelectItem>
                <SelectItem value={t('durationOptions.sixToTwentyFourHours')}>{t('durationOptions.sixToTwentyFourHours')}</SelectItem>
                <SelectItem value={t('durationOptions.oneToThreeDays')}>{t('durationOptions.oneToThreeDays')}</SelectItem>
                <SelectItem value={t('durationOptions.threeToSevenDays')}>{t('durationOptions.threeToSevenDays')}</SelectItem>
                <SelectItem value={t('durationOptions.oneToFourWeeks')}>{t('durationOptions.oneToFourWeeks')}</SelectItem>
                <SelectItem value={t('durationOptions.oneToSixMonths')}>{t('durationOptions.oneToSixMonths')}</SelectItem>
                <SelectItem value={t('durationOptions.moreSixMonths')}>{t('durationOptions.moreSixMonths')}</SelectItem>
              </SelectContent>
            </Select>
            
            {localData.symptomDuration && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <p className="font-semibold text-green-800">
                    {t('clinicalForm.evolutionSince')} {localData.symptomDuration}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3.5: Intensité de la douleur */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            Intensité de la douleur
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="font-medium">
              Sur une échelle de 0 à 10, quelle est l'intensité de votre douleur ?
            </Label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={localData.painScale || "0"}
                onChange={(e) => updateData({ painScale: e.target.value })}
                onKeyDown={handleEnterKeyNavigation}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>10</span>
              </div>
            </div>
            {localData.painScale && (
              <div className={`mt-3 p-3 rounded-lg border ${
                parseInt(localData.painScale) <= 3 ? "bg-green-50 border-green-200" :
                parseInt(localData.painScale) <= 6 ? "bg-orange-50 border-orange-200" :
                "bg-red-50 border-red-200"
              }`}>
                <p className="font-semibold">
                  Niveau de douleur: {localData.painScale}/10
                  {parseInt(localData.painScale) === 0 && " - Aucune douleur"}
                  {parseInt(localData.painScale) >= 1 && parseInt(localData.painScale) <= 3 && " - Douleur légère"}
                  {parseInt(localData.painScale) >= 4 && parseInt(localData.painScale) <= 6 && " - Douleur modérée"}
                  {parseInt(localData.painScale) >= 7 && " - Douleur sévère"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Current Symptoms */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
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
              onKeyDown={handleEnterKeyNavigation}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredSymptoms.map((symptom, index) => {
              const currentSymptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
              return (
                <div
                  key={symptom}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    currentSymptoms.includes(symptom)
                      ? "border-orange-300 bg-orange-50 shadow-md"
                      : "border-gray-200 hover:border-orange-200 hover:bg-orange-25"
                  }`}
                  onClick={() => toggleSymptom(symptom)}
                  onDoubleClick={() => handleCheckboxDoubleClick(
                    symptom,
                    index < filteredSymptoms.length - 1 ? `symptom-${filteredSymptoms[index + 1]}` : "temperature"
                  )}
                >
                  <Checkbox
                    id={`symptom-${symptom}`}
                    checked={currentSymptoms.includes(symptom)}
                    onCheckedChange={() => toggleSymptom(symptom)}
                  />
                  <Label htmlFor={`symptom-${symptom}`} className="text-sm font-medium cursor-pointer">
                    {symptom}
                  </Label>
                </div>
              )
            })}
          </div>

          {Array.isArray(localData.symptoms) && localData.symptoms.length > 0 && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-orange-600" />
                <p className="font-semibold text-orange-800">
                  {t('clinicalForm.selectedSymptoms')} ({localData.symptoms.length}) :
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

      {/* Section 5: Vital Signs */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6" />
            {t('clinicalForm.vitalSigns')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                value={localData.vitalSigns?.temperature || "37"}
                onChange={(e) => updateVitalSigns("temperature", e.target.value)}
                onKeyDown={handleEnterKeyNavigation}
                placeholder="37.0"
                className="transition-all duration-200 focus:ring-red-200"
              />
              {localData.vitalSigns?.temperature && (
                <p className="text-xs text-gray-500">
                  {parseFloat(localData.vitalSigns.temperature) < 36.1 && `🟦 ${t('clinicalForm.hypothermia')}`}
                  {parseFloat(localData.vitalSigns.temperature) >= 36.1 && parseFloat(localData.vitalSigns.temperature) <= 37.2 && `✅ ${t('clinicalForm.normal')}`}
                  {parseFloat(localData.vitalSigns.temperature) > 37.2 && `🔴 ${t('clinicalForm.fever')}`}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodPressureSystolic" className="font-medium">
                {t('clinicalForm.systolicBP')}
              </Label>
              <div className="space-y-2">
                <Input
                  id="bloodPressureSystolic"
                  type="number"
                  min="70"
                  max="250"
                  value={localData.vitalSigns?.bloodPressureSystolic || ""}
                  onChange={(e) => updateVitalSigns("bloodPressureSystolic", e.target.value)}
                  onKeyDown={handleEnterKeyNavigation}
                  placeholder="120"
                  disabled={bpNotApplicable}
                  className={`transition-all duration-200 focus:ring-red-200 ${bpNotApplicable ? 'opacity-50' : ''}`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodPressureDiastolic" className="font-medium">
                {t('clinicalForm.diastolicBP')}
              </Label>
              <div className="space-y-2">
                <Input
                  id="bloodPressureDiastolic"
                  type="number"
                  min="40"
                  max="150"
                  value={localData.vitalSigns?.bloodPressureDiastolic || ""}
                  onChange={(e) => updateVitalSigns("bloodPressureDiastolic", e.target.value)}
                  onKeyDown={handleEnterKeyNavigation}
                  placeholder="80"
                  disabled={bpNotApplicable}
                  className={`transition-all duration-200 focus:ring-red-200 ${bpNotApplicable ? 'opacity-50' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Not Applicable Button for Blood Pressure */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleBPNotApplicable}
              className={`${bpNotApplicable ? 'bg-gray-100' : ''}`}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Tension artérielle non applicable
            </Button>
          </div>

          {(localData.vitalSigns?.bloodPressureSystolic || localData.vitalSigns?.bloodPressureDiastolic) && !bpNotApplicable && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-600" />
                <p className="font-semibold text-red-800">
                  {t('clinicalForm.bloodPressure')} {localData.vitalSigns?.bloodPressureSystolic || "—"} / {localData.vitalSigns?.bloodPressureDiastolic || "—"} mmHg
                </p>
              </div>
              {localData.vitalSigns?.bloodPressureSystolic && localData.vitalSigns?.bloodPressureDiastolic && (
                <p className="text-xs text-red-600 mt-1">
                  {(parseInt(localData.vitalSigns.bloodPressureSystolic) >= 140 || parseInt(localData.vitalSigns.bloodPressureDiastolic) >= 90) && `⚠️ ${t('clinicalForm.hypertension')}`}
                  {(parseInt(localData.vitalSigns.bloodPressureSystolic) < 140 && parseInt(localData.vitalSigns.bloodPressureDiastolic) < 90 && parseInt(localData.vitalSigns.bloodPressureSystolic) >= 120) && `🟡 ${t('clinicalForm.preHypertension')}`}
                  {(parseInt(localData.vitalSigns.bloodPressureSystolic) < 120 && parseInt(localData.vitalSigns.bloodPressureDiastolic) < 80) && `✅ ${t('clinicalForm.normal')}`}
                </p>
              )}
            </div>
          )}

          {bpNotApplicable && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-600" />
                <p className="font-semibold text-gray-800">
                  Tension artérielle non mesurée
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
          <span className="text-sm text-gray-600">{t('common.autoSave')}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('clinicalForm.backButton')}
        </Button>
        <Button 
          onClick={onNext}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('clinicalForm.continueToAI')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
