"use client"

import { useState, useEffect } from "react"
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
  Search
} from "lucide-react"
import { Language, getTranslation } from "@/lib/translations"

interface ClinicalData {
  chiefComplaint: string
  diseaseHistory: string
  symptomDuration: string
  symptoms: string[]
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
}

const defaultClinicalData: ClinicalData = {
  chiefComplaint: "",
  diseaseHistory: "",
  symptomDuration: "",
  symptoms: [],
  vitalSigns: {
    temperature: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
  },
}

export default function ModernClinicalForm({ 
  data, 
  patientData, 
  onDataChange, 
  onNext, 
  onPrevious,
  language = 'fr' 
}: ClinicalFormProps) {
  const t = (key: string) => getTranslation(key, language)
  
  // Common symptoms with translations
  const COMMON_SYMPTOMS = [
    t('symptoms.chestPain'),
    t('symptoms.shortnessOfBreath'),
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
    t('symptoms.lossOfAppetite'),
    t('symptoms.weightLoss'),
    t('symptoms.legSwelling'),
    t('symptoms.jointPain'),
    t('symptoms.rash'),
    t('symptoms.blurredVision'),
    t('symptoms.hearingProblems'),
  ]

  // Duration options with translations
  const DURATION_OPTIONS = [
    { value: "less_than_1_hour", label: t('duration.lessThan1Hour') },
    { value: "1_to_6_hours", label: t('duration.1to6Hours') },
    { value: "6_to_24_hours", label: t('duration.6to24Hours') },
    { value: "1_to_3_days", label: t('duration.1to3Days') },
    { value: "3_to_7_days", label: t('duration.3to7Days') },
    { value: "1_to_4_weeks", label: t('duration.1to4Weeks') },
    { value: "1_to_6_months", label: t('duration.1to6Months') },
    { value: "more_than_6_months", label: t('duration.moreThan6Months') },
  ]

  const [localData, setLocalData] = useState<ClinicalData>(data || defaultClinicalData)
  const [symptomSearch, setSymptomSearch] = useState("")
  const [currentSection, setCurrentSection] = useState(0)

  useEffect(() => {
    if (data) {
      setLocalData({
        chiefComplaint: data.chiefComplaint || "",
        diseaseHistory: data.diseaseHistory || "",
        symptomDuration: data.symptomDuration || "",
        symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
        vitalSigns: {
          temperature: data.vitalSigns?.temperature || "",
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

  // Helper function to get temperature status
  const getTemperatureStatus = (temp: string) => {
    const tempValue = parseFloat(temp)
    if (tempValue < 36.1) return `🟦 ${t('clinicalForm.vitals.hypothermia')}`
    if (tempValue >= 36.1 && tempValue <= 37.2) return `✅ ${t('clinicalForm.vitals.normal')}`
    if (tempValue > 37.2) return `🔴 ${t('clinicalForm.vitals.fever')}`
    return ""
  }

  // Helper function to get blood pressure status
  const getBloodPressureStatus = (systolic: string, diastolic: string) => {
    const sys = parseInt(systolic)
    const dia = parseInt(diastolic)
    
    if (sys >= 140 || dia >= 90) return `⚠️ ${t('clinicalForm.vitals.hypertension')}`
    if (sys < 140 && dia < 90 && sys >= 120) return `🟡 ${t('clinicalForm.vitals.preHypertension')}`
    if (sys < 120 && dia < 80) return `✅ ${t('clinicalForm.vitals.normal')}`
    return ""
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Progress */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              <Stethoscope className="h-8 w-8 text-purple-600" />
              {t('clinicalForm.title')}
            </CardTitle>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('clinicalForm.progress')}</span>
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
              {t('clinicalForm.chiefComplaint.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label htmlFor="chiefComplaint" className="font-medium">
                {t('clinicalForm.chiefComplaint.label')}
              </Label>
              <Textarea
                id="chiefComplaint"
                value={localData.chiefComplaint || ""}
                onChange={(e) => updateData({ chiefComplaint: e.target.value })}
                placeholder={t('clinicalForm.chiefComplaint.placeholder')}
                rows={3}
                className="transition-all duration-200 focus:ring-purple-200 resize-y"
              />
              <p className="text-xs text-gray-500">
                {t('clinicalForm.chiefComplaint.helper')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Disease History */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Heart className="h-6 w-6" />
              {t('clinicalForm.diseaseHistory.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label htmlFor="diseaseHistory" className="font-medium">
                {t('clinicalForm.diseaseHistory.label')}
              </Label>
              <Textarea
                id="diseaseHistory"
                value={localData.diseaseHistory || ""}
                onChange={(e) => updateData({ diseaseHistory: e.target.value })}
                placeholder={t('clinicalForm.diseaseHistory.placeholder')}
                rows={5}
                className="transition-all duration-200 focus:ring-blue-200 resize-y"
              />
              <p className="text-xs text-gray-500">
                {t('clinicalForm.diseaseHistory.helper')}
              </p>
            </div>

            {localData.diseaseHistory && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold text-blue-800">
                    {t('clinicalForm.diseaseHistory.documented', { count: localData.diseaseHistory.length })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Symptom Duration */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Clock className="h-6 w-6" />
              {t('clinicalForm.duration.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label htmlFor="symptomDuration" className="font-medium">
                {t('clinicalForm.duration.label')}
              </Label>
              <Select
                value={localData.symptomDuration || ""}
                onValueChange={(value) => updateData({ symptomDuration: value })}
              >
                <SelectTrigger className="transition-all duration-200 focus:ring-green-200">
                  <SelectValue placeholder={t('clinicalForm.duration.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {localData.symptomDuration && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <p className="font-semibold text-green-800">
                      {t('clinicalForm.duration.since')}: {DURATION_OPTIONS.find(opt => opt.value === localData.symptomDuration)?.label}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Present Symptoms */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Activity className="h-6 w-6" />
              {t('clinicalForm.symptoms.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('clinicalForm.symptoms.search')}
                value={symptomSearch}
                onChange={(e) => setSymptomSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredSymptoms.map((symptom) => {
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
                  >
                    <Checkbox
                      id={symptom}
                      checked={currentSymptoms.includes(symptom)}
                      onCheckedChange={() => toggleSymptom(symptom)}
                    />
                    <Label htmlFor={symptom} className="text-sm font-medium cursor-pointer">
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
                    {t('clinicalForm.symptoms.selected', { count: localData.symptoms.length })}:
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
              {t('clinicalForm.vitals.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-red-500" />
                  <Label htmlFor="temperature" className="font-medium">
                    {t('clinicalForm.vitals.temperature')}
                  </Label>
                </div>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="35"
                  max="42"
                  value={localData.vitalSigns?.temperature || ""}
                  onChange={(e) => updateVitalSigns("temperature", e.target.value)}
                  placeholder="37.0"
                  className="transition-all duration-200 focus:ring-red-200"
                />
                {localData.vitalSigns?.temperature && (
                  <p className="text-xs text-gray-500">
                    {getTemperatureStatus(localData.vitalSigns.temperature)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodPressureSystolic" className="font-medium">
                  {t('clinicalForm.vitals.systolic')}
                </Label>
                <Input
                  id="bloodPressureSystolic"
                  type="number"
                  min="70"
                  max="250"
                  value={localData.vitalSigns?.bloodPressureSystolic || ""}
                  onChange={(e) => updateVitalSigns("bloodPressureSystolic", e.target.value)}
                  placeholder="120"
                  className="transition-all duration-200 focus:ring-red-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodPressureDiastolic" className="font-medium">
                  {t('clinicalForm.vitals.diastolic')}
                </Label>
                <Input
                  id="bloodPressureDiastolic"
                  type="number"
                  min="40"
                  max="150"
                  value={localData.vitalSigns?.bloodPressureDiastolic || ""}
                  onChange={(e) => updateVitalSigns("bloodPressureDiastolic", e.target.value)}
                  placeholder="80"
                  className="transition-all duration-200 focus:ring-red-200"
                />
              </div>
            </div>

            {(localData.vitalSigns?.bloodPressureSystolic || localData.vitalSigns?.bloodPressureDiastolic) && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-600" />
                  <p className="font-semibold text-red-800">
                    {t('clinicalForm.vitals.bloodPressure')}: {localData.vitalSigns?.bloodPressureSystolic || "—"} / {localData.vitalSigns?.bloodPressureDiastolic || "—"} mmHg
                  </p>
                </div>
                {localData.vitalSigns?.bloodPressureSystolic && localData.vitalSigns?.bloodPressureDiastolic && (
                  <p className="text-xs text-red-600 mt-1">
                    {getBloodPressureStatus(localData.vitalSigns.bloodPressureSystolic, localData.vitalSigns.bloodPressureDiastolic)}
                  </p>
                )}
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
            {t('navigation.backToPatient')}
          </Button>
          <Button 
            onClick={onNext}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {t('navigation.continueToAI')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
