"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { useConsultationCache } from '@/hooks/useConsultationCache'
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
  Keyboard,
  CheckCircle,
  Target,
  RefreshCw,
  Cloud,
  CloudOff,
  AlertTriangle,
  Save,
  Database,
  Wifi,
  WifiOff
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

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
  consultationId?: string | null
}

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
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
  // Navigation refs and state
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})
  const [showKeyboardHint, setShowKeyboardHint] = useState(true)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [localErrors, setLocalErrors] = useState<string[]>([])
  
  // Helper function for translations
  const t = (key: string, fallback?: string) => getTranslation(key, language) || fallback || key

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

  // Field navigation order
  const FIELD_ORDER = [
    'chiefComplaint',
    'diseaseHistory', 
    'symptomDuration',
    'symptomSearch',
    'temperature',
    'bloodPressureSystolic',
    'bloodPressureDiastolic'
  ]

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

  const [localData, setLocalData] = useState<ClinicalData>(data || defaultClinicalData)
  const [symptomSearch, setSymptomSearch] = useState("")
  const [currentSection, setCurrentSection] = useState(0)

  // Use consultation cache hook
  const {
    data: cachedData,
    loading: cacheLoading,
    error: cacheError,
    lastSync,
    isSyncing,
    setData: setCacheData,
    refresh: refreshCache,
    sync: syncCache,
    clear: clearCache,
    cacheStats
  } = useConsultationCache({
    key: `clinical_form_${consultationId || 'current'}`,
    ttl: 30 * 60 * 1000, // 30 minutes
    autoSync: true,
    syncInterval: 3 * 60 * 1000, // 3 minutes for clinical form
    onSync: async (data) => {
      try {
        setSaveStatus('saving')
        const currentId = consultationId || consultationDataService.getCurrentConsultationId()
        
        if (currentId) {
          // Save to consultation data service
          await consultationDataService.saveStepData(1, data)
          
          // Sync with Supabase if online
          if (isOnline) {
            await consultationDataService.saveToSupabase(currentId)
          }
        }
        
        setSaveStatus('saved')
        setLastSaveTime(new Date())
        setLocalErrors([])
      } catch (error) {
        console.error('Sync error:', error)
        setSaveStatus('error')
        setLocalErrors(prev => [...prev, 'Erreur de synchronisation'])
        throw error
      }
    },
    onError: (error) => {
      console.error('Cache error:', error)
      setSaveStatus('error')
      setLocalErrors(prev => [...prev, error.message])
    }
  })

  // Debounced form data for auto-save
  const debouncedLocalData = useDebounce(localData, 1000)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Auto sync when coming back online
      syncCache()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setLocalErrors(prev => [...prev, 'Mode hors ligne - Les données seront synchronisées au retour de la connexion'])
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncCache])

  // NAVIGATION FUNCTIONS
  const setFieldRef = useCallback((fieldName: string, element: HTMLElement | null) => {
    fieldRefs.current[fieldName] = element
  }, [])

  const focusNextField = useCallback((currentField: string) => {
    const currentIndex = FIELD_ORDER.indexOf(currentField)
    if (currentIndex >= 0 && currentIndex < FIELD_ORDER.length - 1) {
      const nextFieldName = FIELD_ORDER[currentIndex + 1]
      const nextField = fieldRefs.current[nextFieldName]
      
      if (nextField) {
        nextField.focus()
        setFocusedField(nextFieldName)
        
        // Auto-scroll to the field
        nextField.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
        // Add visual highlight
        nextField.classList.add('ring-2', 'ring-purple-300', 'ring-opacity-75')
        setTimeout(() => {
          nextField.classList.remove('ring-2', 'ring-purple-300', 'ring-opacity-75')
        }, 1500)
      }
    } else if (currentIndex === FIELD_ORDER.length - 1) {
      // Last field, focus next button
      const nextButton = document.querySelector('[data-next-button="true"]') as HTMLElement
      if (nextButton) {
        nextButton.focus()
      }
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      
      // Special handling for textarea fields with Shift+Enter for new lines
      if (fieldName === 'chiefComplaint' || fieldName === 'diseaseHistory') {
        // For these fields, allow Shift+Enter for new lines, plain Enter to navigate
        focusNextField(fieldName)
      } else {
        focusNextField(fieldName)
      }
      
      // Hide keyboard hint after first use
      if (showKeyboardHint) {
        setShowKeyboardHint(false)
      }
    }
  }, [focusNextField, showKeyboardHint])

  // Special handler for Select component (duration)
  const handleDurationChange = useCallback((value: string) => {
    setLocalData(prev => ({
      ...prev,
      symptomDuration: value
    }))
    
    // Auto-focus next field after selection
    setTimeout(() => {
      focusNextField('symptomDuration')
    }, 100)
  }, [focusNextField])

  // Load cached data on mount
  useEffect(() => {
    if (cachedData && !data) {
      console.log('Loading clinical data from cache')
      setLocalData(cachedData)
    } else if (data) {
      console.log('Loading clinical data from props')
      setLocalData(data)
    }
  }, [cachedData, data])

  // Auto-save when debounced data changes
  useEffect(() => {
    const saveData = async () => {
      if (debouncedLocalData.chiefComplaint || debouncedLocalData.diseaseHistory || debouncedLocalData.symptoms.length > 0) {
        setSaveStatus('saving')
        
        try {
          // Save to cache
          await setCacheData(debouncedLocalData)
          
          // Save to consultation data service
          await consultationDataService.saveStepData(1, debouncedLocalData)
          
          // Call parent callback
          onDataChange(debouncedLocalData)
          
          setSaveStatus('saved')
          setLastSaveTime(new Date())
        } catch (error) {
          console.error('Error saving clinical data:', error)
          setSaveStatus('error')
        }
      }
    }
    
    saveData()
  }, [debouncedLocalData, setCacheData, onDataChange])

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
    setLocalData(prev => ({ ...prev, ...updates }))
  }

  const updateVitalSigns = (field: string, value: string) => {
    setLocalData(prev => ({
      ...prev,
      vitalSigns: { ...prev.vitalSigns, [field]: value }
    }))
  }

  const toggleSymptom = (symptom: string) => {
    const currentSymptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
    const newSymptoms = currentSymptoms.includes(symptom)
      ? currentSymptoms.filter((s) => s !== symptom)
      : [...currentSymptoms, symptom]
    updateData({ symptoms: newSymptoms })
  }

  // Helper function for blood pressure classification
  const getBloodPressureStatus = (systolic: string, diastolic: string) => {
    const sys = parseInt(systolic)
    const dia = parseInt(diastolic)
    
    if (isNaN(sys) || isNaN(dia)) return null
    
    if (sys >= 180 || dia >= 120) {
      return { status: 'hypertensiveCrisis', icon: '🚨', color: 'text-red-800' }
    } else if (sys >= 140 || dia >= 90) {
      return { status: 'hypertension2', icon: '🔴', color: 'text-red-600' }
    } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      return { status: 'hypertension1', icon: '⚠️', color: 'text-orange-600' }
    } else if (sys >= 120 && sys <= 129 && dia < 80) {
      return { status: 'elevated', icon: '🟡', color: 'text-yellow-600' }
    } else if (sys < 120 && dia < 80) {
      return { status: 'normal', icon: '✅', color: 'text-green-600' }
    }
    
    return null
  }

  // Manual refresh function
  const handleRefresh = async () => {
    setLocalErrors([])
    await refreshCache()
    if (isOnline) {
      await syncCache()
    }
  }

  // Handle navigation with sync
  const handleNext = async () => {
    // Force sync before navigation
    if (isOnline) {
      await syncCache()
    }
    onNext()
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

  // Auto-focus first field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstField = fieldRefs.current['chiefComplaint']
      if (firstField && !localData.chiefComplaint) {
        firstField.focus()
        setFocusedField('chiefComplaint')
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  // Status bar component
  const StatusBar = () => (
    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md">
      <div className="flex items-center gap-4">
        {/* Online/Offline status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">En ligne</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">Hors ligne</span>
            </>
          )}
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
              <span className="text-sm text-purple-600">Sauvegarde...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Sauvegardé</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Erreur</span>
            </>
          )}
        </div>

        {/* Last save time */}
        {lastSaveTime && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{lastSaveTime.toLocaleTimeString('fr-FR')}</span>
          </div>
        )}

        {/* Sync status */}
        {isSyncing && (
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-600 animate-pulse" />
            <span className="text-sm text-blue-600">Synchronisation...</span>
          </div>
        )}
      </div>

      {/* Cache info and actions */}
      <div className="flex items-center gap-4">
        {cacheStats.isStale && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Cache périmé
          </Badge>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={isSyncing || cacheLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing || cacheLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  )

  // Show loading state
  if (cacheLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données cliniques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <StatusBar />

      {/* Error display */}
      {(cacheError || localErrors.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {cacheError && (
                <p className="text-sm font-medium text-red-800">
                  Erreur de cache : {cacheError.message}
                </p>
              )}
              {localErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-700">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Hint */}
      {showKeyboardHint && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-purple-600" />
            <p className="text-sm font-medium text-purple-800">
              💡 {t('common.keyboardHint', 'Astuce : Appuyez sur Enter pour passer au champ suivant rapidement')}
            </p>
          </div>
        </div>
      )}

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
          {focusedField && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">
                Focus: {focusedField}
              </span>
            </div>
          )}
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
              onKeyDown={(e) => handleKeyDown(e, 'chiefComplaint')}
              onFocus={() => setFocusedField('chiefComplaint')}
              onBlur={() => setFocusedField(null)}
              ref={(el) => setFieldRef('chiefComplaint', el)}
              placeholder={t('clinicalForm.describePlaceholder')}
              rows={3}
              className={`transition-all duration-200 focus:ring-purple-200 resize-y ${
                focusedField === 'chiefComplaint' ? 'ring-2 ring-purple-300' : ''
              }`}
            />
            <p className="text-xs text-gray-500">
              {t('clinicalForm.summaryHint')}
              <span className="text-purple-600 ml-2">
                💡 Shift + Enter = nouvelle ligne, Enter = champ suivant
              </span>
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
              onKeyDown={(e) => handleKeyDown(e, 'diseaseHistory')}
              onFocus={() => setFocusedField('diseaseHistory')}
              onBlur={() => setFocusedField(null)}
              ref={(el) => setFieldRef('diseaseHistory', el)}
              placeholder={t('clinicalForm.historyPlaceholder')}
              rows={5}
              className={`transition-all duration-200 focus:ring-blue-200 resize-y ${
                focusedField === 'diseaseHistory' ? 'ring-2 ring-blue-300' : ''
              }`}
            />
            <p className="text-xs text-gray-500">
              {t('clinicalForm.detailedHistory')}
              <span className="text-blue-600 ml-2">
                💡 Shift + Enter = nouvelle ligne, Enter = champ suivant
              </span>
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
              onValueChange={handleDurationChange}
            >
              <SelectTrigger 
                className={`transition-all duration-200 focus:ring-green-200 ${
                  focusedField === 'symptomDuration' ? 'ring-2 ring-green-300' : ''
                }`}
                ref={(el) => setFieldRef('symptomDuration', el)}
                onFocus={() => setFocusedField('symptomDuration')}
                onBlur={() => setFocusedField(null)}
              >
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
              onKeyDown={(e) => handleKeyDown(e, 'symptomSearch')}
              onFocus={() => setFocusedField('symptomSearch')}
              onBlur={() => setFocusedField(null)}
              ref={(el) => setFieldRef('symptomSearch', el)}
              className={`pl-10 transition-all duration-200 ${
                focusedField === 'symptomSearch' ? 'ring-2 ring-orange-300' : ''
              }`}
            />
            <p className="text-xs text-orange-600 mt-1">
              💡 Tapez pour filtrer les symptômes, Enter = champ suivant
            </p>
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
                value={localData.vitalSigns?.temperature || ""}
                onChange={(e) => updateVitalSigns("temperature", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'temperature')}
                onFocus={() => setFocusedField('temperature')}
                onBlur={() => setFocusedField(null)}
                ref={(el) => setFieldRef('temperature', el)}
                placeholder="37.0"
                className={`transition-all duration-200 focus:ring-red-200 ${
                  focusedField === 'temperature' ? 'ring-2 ring-red-300' : ''
                }`}
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
              <Input
                id="bloodPressureSystolic"
                type="number"
                min="70"
                max="250"
                value={localData.vitalSigns?.bloodPressureSystolic || ""}
                onChange={(e) => updateVitalSigns("bloodPressureSystolic", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'bloodPressureSystolic')}
                onFocus={() => setFocusedField('bloodPressureSystolic')}
                onBlur={() => setFocusedField(null)}
                ref={(el) => setFieldRef('bloodPressureSystolic', el)}
                placeholder="120"
                className={`transition-all duration-200 focus:ring-red-200 ${
                  focusedField === 'bloodPressureSystolic' ? 'ring-2 ring-red-300' : ''
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodPressureDiastolic" className="font-medium">
                {t('clinicalForm.diastolicBP')}
              </Label>
              <Input
                id="bloodPressureDiastolic"
                type="number"
                min="40"
                max="150"
                value={localData.vitalSigns?.bloodPressureDiastolic || ""}
                onChange={(e) => updateVitalSigns("bloodPressureDiastolic", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'bloodPressureDiastolic')}
                onFocus={() => setFocusedField('bloodPressureDiastolic')}
                onBlur={() => setFocusedField(null)}
                ref={(el) => setFieldRef('bloodPressureDiastolic', el)}
                placeholder="80"
                className={`transition-all duration-200 focus:ring-red-200 ${
                  focusedField === 'bloodPressureDiastolic' ? 'ring-2 ring-red-300' : ''
                }`}
              />
            </div>
          </div>

          {(localData.vitalSigns?.bloodPressureSystolic || localData.vitalSigns?.bloodPressureDiastolic) && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-600" />
                <p className="font-semibold text-red-800">
                  {t('clinicalForm.bloodPressure')} {localData.vitalSigns?.bloodPressureSystolic || "—"} / {localData.vitalSigns?.bloodPressureDiastolic || "—"} mmHg
                </p>
              </div>
              {localData.vitalSigns?.bloodPressureSystolic && localData.vitalSigns?.bloodPressureDiastolic && (() => {
                const bpStatus = getBloodPressureStatus(
                  localData.vitalSigns.bloodPressureSystolic,
                  localData.vitalSigns.bloodPressureDiastolic
                )
                
                if (bpStatus) {
                  let message = ''
                  switch (bpStatus.status) {
                    case 'normal':
                      message = t('clinicalForm.normal')
                      break
                    case 'elevated':
                      message = t('clinicalForm.elevated', 'Tension élevée')
                      break
                    case 'hypertension1':
                      message = t('clinicalForm.hypertension1', 'Hypertension stade 1')
                      break
                    case 'hypertension2':
                      message = t('clinicalForm.hypertension2', 'Hypertension stade 2')
                      break
                    case 'hypertensiveCrisis':
                      message = t('clinicalForm.hypertensiveCrisis', 'Crise hypertensive - Consulter en urgence!')
                      break
                  }
                  
                  return (
                    <p className={`text-xs mt-1 ${bpStatus.color}`}>
                      {bpStatus.icon} {message}
                    </p>
                  )
                }
                return null
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion status */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">{t('common.autoSave')}</span>
          </div>
          
          {progress === 100 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full shadow-md">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Formulaire complet !</span>
            </div>
          )}
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
          onClick={handleNext}
          data-next-button="true"
          disabled={isSyncing}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {t('common.syncing', 'Synchronisation...')}
            </>
          ) : (
            <>
              {t('clinicalForm.continueToAI')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
