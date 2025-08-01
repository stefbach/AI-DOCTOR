"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  ArrowRight, 
  Brain, 
  Loader2, 
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Search,
  Lightbulb,
  Sparkles,
  Info,
  Calculator,
  GraduationCap,
  Stethoscope,
  Heart,
  Activity,
  FileText,
  ExternalLink,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Zap,
  Timer,
  Gauge
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

// Types et interfaces
type GenerationMode = 'fast' | 'balanced' | 'intelligent'

interface ClinicalScore {
  name: string
  fullName: string
  explanation: string
  calculation: string
  interpretation: string | object
  action: string
  reference: string
  calculator?: string
}

interface EnhancedQuestion {
  id: number
  question: string
  type: string
  options?: string[]
  rationale?: string
  category?: 'accessible' | 'technical' | 'global'
  complexity_level?: 'simple' | 'moderate' | 'advanced'
  specialty?: string
  medical_explanation?: string
  clinical_score?: string
  score_full_name?: string
  score_explanation?: string
  score_calculation?: string
  score_interpretation?: string
  score_clinical_action?: string
  score_reference?: string
  score_calculator_link?: string
  patient_benefit?: string
  diagnostic_value?: 'high' | 'medium' | 'low'
  guidelines_reference?: string
  red_flags?: string
  differential_diagnosis?: string[]
  next_steps?: string
  score_critical_info?: string
}

interface QuestionResponse {
  questionId: number
  question: string
  answer: string | number
  type: string
}

interface QuestionsData {
  responses: QuestionResponse[]
}

interface QuestionsFormProps {
  patientData: any
  clinicalData: any
  onDataChange: (data: QuestionsData) => void
  onNext: () => void
  onPrevious: () => void
  language?: Language
  consultationId?: string | null
}

// Configuration des modes
const MODE_CONFIGS = {
  fast: {
    label: 'Rapide',
    duration: '1-2s',
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Triage initial, urgences'
  },
  balanced: {
    label: 'Équilibré',
    duration: '2-3s',
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Usage standard'
  },
  intelligent: {
    label: 'Intelligent',
    duration: '3-5s',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Cas complexes'
  }
}

// Composants helpers
function ScoreEducationCard({ question }: { question: EnhancedQuestion }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!question.clinical_score) return null

  return (
    <div className="mt-4">
      <Button 
        variant="outline" 
        className="w-full justify-between bg-blue-50 hover:bg-blue-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          <span className="font-semibold">Score {question.clinical_score}</span>
        </div>
        <span className="text-sm text-gray-600">
          {isOpen ? "Masquer" : "En savoir plus"}
        </span>
      </Button>
      
      {isOpen && (
        <div className="mt-4 space-y-4">
          {question.score_full_name && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Nom complet</h4>
              <p className="text-gray-700">{question.score_full_name}</p>
            </div>
          )}

          {question.score_explanation && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Qu'est-ce que ce score ?</h4>
              <p className="text-blue-700">{question.score_explanation}</p>
            </div>
          )}

          {question.score_calculation && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Comment le calculer ?</h4>
              <p className="text-green-700">{question.score_calculation}</p>
            </div>
          )}

          {question.score_interpretation && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Interprétation</h4>
              <div className="text-purple-700">
                {typeof question.score_interpretation === 'string' ? (
                  <p className="whitespace-pre-wrap">{question.score_interpretation}</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(question.score_interpretation).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium">{key}:</span>
                        <span>{value as string}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {question.score_clinical_action && (
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">Action clinique</h4>
              <p className="text-orange-700">{question.score_clinical_action}</p>
            </div>
          )}

          {question.score_critical_info && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Information critique</AlertTitle>
              <AlertDescription className="text-red-700">
                {question.score_critical_info}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            {question.score_calculator_link && (
              
                href={question.score_calculator_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                <Calculator className="h-4 w-4" />
                Calculateur en ligne
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {question.score_reference && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <FileText className="h-4 w-4" />
                {question.score_reference}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionMetadataBadges({ question }: { question: EnhancedQuestion }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {question.category && (
        <Badge 
          variant={
            question.category === 'technical' ? 'default' : 
            question.category === 'accessible' ? 'secondary' : 
            'outline'
          }
          className="flex items-center gap-1"
        >
          {question.category === 'technical' && <Stethoscope className="h-3 w-3" />}
          {question.category === 'accessible' && <Heart className="h-3 w-3" />}
          {question.category === 'global' && <Activity className="h-3 w-3" />}
          {question.category}
        </Badge>
      )}
      
      {question.complexity_level && (
        <Badge variant="outline" className="capitalize">
          Niveau: {question.complexity_level}
        </Badge>
      )}
      
      {question.specialty && (
        <Badge className="bg-purple-100 text-purple-800">
          {question.specialty}
        </Badge>
      )}
      
      {question.diagnostic_value && (
        <Badge 
          className={
            question.diagnostic_value === 'high' ? 'bg-green-100 text-green-800' :
            question.diagnostic_value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }
        >
          Valeur: {question.diagnostic_value}
        </Badge>
      )}

      {question.clinical_score && (
        <Badge className="bg-blue-100 text-blue-800">
          <Calculator className="h-3 w-3 mr-1" />
          Score clinique
        </Badge>
      )}
    </div>
  )
}

function SimpleTooltip({ children, content }: { children: React.ReactNode, content: string }) {
  const [show, setShow] = useState(false)
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-10 px-3 py-1 text-sm text-white bg-gray-900 rounded-md shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {content}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant principal
export default function QuestionsForm({
  patientData,
  clinicalData,
  onDataChange,
  onNext,
  onPrevious,
  language = 'fr',
  consultationId
}: QuestionsFormProps) {
  // États
  const [questions, setQuestions] = useState<EnhancedQuestion[]>([])
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showEducation, setShowEducation] = useState(true)
  const [metadata, setMetadata] = useState<any>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  
  // Nouveaux états pour les modes
  const [generationMode, setGenerationMode] = useState<GenerationMode>('balanced')
  const [generationTime, setGenerationTime] = useState<number | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)

  // Helper pour les traductions
  const t = (key: string) => getTranslation(key, language)

  // Détection automatique du mode selon l'urgence
  const detectUrgencyMode = (): GenerationMode => {
    const symptoms = clinicalData?.symptoms?.toLowerCase() || ''
    const chiefComplaint = clinicalData?.chiefComplaint?.toLowerCase() || ''
    const combined = `${symptoms} ${chiefComplaint}`
    
    // Mots-clés d'urgence = mode rapide
    const urgentKeywords = ['douleur thoracique', 'dyspnée', 'syncope', 'confusion', 'malaise']
    if (urgentKeywords.some(keyword => combined.includes(keyword))) {
      return 'fast'
    }
    
    // Cas complexes = mode intelligent
    const complexKeywords = ['multiple', 'chronique', 'récidivant', 'plusieurs']
    if (complexKeywords.some(keyword => combined.includes(keyword))) {
      return 'intelligent'
    }
    
    return 'balanced'
  }

  // Chargement des données sauvegardées
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('📂 Loading saved questions data...')
      try {
        const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
        
        if (currentConsultationId) {
          const savedData = await consultationDataService.getAllData()
          if (savedData?.questionsData?.responses && savedData.questionsData.responses.length > 0) {
            console.log('💾 Found saved responses:', savedData.questionsData.responses.length)
            setResponses(savedData.questionsData.responses)
            setHasGenerated(true)
          }
        }
      } catch (error) {
        console.error('❌ Error loading saved questions data:', error)
      }
    }
    
    loadSavedData()
  }, [consultationId])

  // Sauvegarde automatique
  useEffect(() => {
    const saveData = async () => {
      if (responses.length === 0) return
      
      try {
        await consultationDataService.saveStepData(2, { responses })
        console.log('💾 Auto-saved questions data')
      } catch (error) {
        console.error('❌ Error saving questions data:', error)
      }
    }
    
    const timer = setTimeout(() => {
      saveData()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [responses])

  // Génération automatique systématique
  useEffect(() => {
    if (patientData && clinicalData && !hasGenerated) {
      const detectedMode = detectUrgencyMode()
      setGenerationMode(detectedMode)
      
      console.log('🎯 SYSTEMATIC GENERATION TRIGGERED')
      console.log('📋 Patient:', patientData?.firstName, patientData?.lastName)
      console.log('🏥 Chief Complaint:', clinicalData?.chiefComplaint)
      console.log('⚡ Auto-detected mode:', detectedMode)
      
      generateQuestions(detectedMode)
      setHasGenerated(true)
    }
  }, [patientData, clinicalData, hasGenerated])

  // Auto-save effet
  useEffect(() => {
    const timer = setTimeout(() => {
      onDataChange({ responses })
    }, 500)
    return () => clearTimeout(timer)
  }, [responses, onDataChange])

  // Fonction de génération optimisée
  const generateQuestions = async (mode: GenerationMode = generationMode) => {
    console.log(`🚀 generateQuestions() called with mode: ${mode}`)
    console.log('📊 Patient data:', !!patientData, patientData?.firstName)
    console.log('📊 Clinical data:', !!clinicalData, clinicalData?.chiefComplaint)
    
    if (!patientData || !clinicalData) {
      console.log('⚠️ Missing required data for question generation')
      return
    }

    setLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      console.log(`📡 Calling API /api/openai-questions in ${mode} mode...`)
      
      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
          language,
          mode, // Mode de génération
        }),
      })

      console.log('📨 Response status:', response.status)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`)
      }

      if (data.success && Array.isArray(data.questions)) {
        const endTime = Date.now()
        const totalTime = endTime - startTime
        
        setGenerationTime(totalTime)
        setPerformanceMetrics({
          mode,
          totalTime,
          questionsCount: data.questions.length,
          cacheHit: data.metadata?.fromCache || false,
          model: data.metadata?.model || 'unknown'
        })
        
        console.log(`✅ Generated ${data.questions.length} questions in ${totalTime}ms (${mode} mode)`)
        
        setQuestions(data.questions)
        setMetadata({
          ...data.metadata,
          mode,
          generationTime: totalTime
        })
        
        const initialResponses = data.questions.map((q: EnhancedQuestion) => ({
          questionId: q.id,
          question: q.question,
          answer: "",
          type: q.type,
        }))
        setResponses(initialResponses)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error("❌ Error generating questions:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")

      // Questions de fallback
      const fallbackQuestions = [
        {
          id: 1,
          question: "Avez-vous déjà eu des symptômes similaires par le passé ?",
          type: "boolean",
          options: ["Oui", "Non"],
          category: "accessible" as const,
          complexity_level: "simple" as const,
          rationale: "Les antécédents de symptômes similaires orientent le diagnostic",
          diagnostic_value: "high" as const
        },
        {
          id: 2,
          question: "Les symptômes s'aggravent-ils avec l'effort physique ?",
          type: "boolean",
          options: ["Oui", "Non"],
          category: "accessible" as const,
          complexity_level: "simple" as const,
          rationale: "L'aggravation à l'effort oriente vers une cause cardiaque ou respiratoire",
          diagnostic_value: "high" as const
        },
        {
          id: 3,
          question: "Sur une échelle de 1 à 5, comment évaluez-vous l'impact sur votre qualité de vie ?",
          type: "scale",
          options: ["1", "2", "3", "4", "5"],
          category: "global" as const,
          complexity_level: "simple" as const,
          rationale: "L'impact fonctionnel guide l'urgence et l'intensité du traitement",
          patient_benefit: "Permet d'adapter le traitement à vos besoins réels",
          diagnostic_value: "medium" as const
        }
      ]

      setQuestions(fallbackQuestions)
      const initialResponses = fallbackQuestions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: "",
        type: q.type,
      }))
      setResponses(initialResponses)
    } finally {
      setLoading(false)
    }
  }

  const updateResponse = (questionId: number, answer: string | number) => {
    const newResponses = responses.map((response) =>
      response.questionId === questionId ? { ...response, answer } : response,
    )
    setResponses(newResponses)
  }

  const getAnsweredCount = () => {
    return responses.filter((response) => {
      const answer = response.answer
      if (typeof answer === "string") {
        return answer.trim() !== ""
      }
      return answer !== "" && answer !== null && answer !== undefined
    }).length
  }

  const calculateProgress = () => {
    if (questions.length === 0) return 0
    return Math.round((getAnsweredCount() / questions.length) * 100)
  }

  const isFormValid = () => {
    return responses.every((response) => {
      const answer = response.answer
      if (typeof answer === "string") {
        return answer.trim() !== ""
      }
      return answer !== "" && answer !== null && answer !== undefined
    })
  }

  const isLastQuestion = () => {
    return currentQuestionIndex === questions.length - 1
  }

  const renderQuestion = (question: EnhancedQuestion) => {
    const response = responses.find((r) => r.questionId === question.id)
    const currentAnswer = response?.answer || ""

    switch (question.type) {
      case "boolean":
        return (
          <RadioGroup
            value={currentAnswer.toString()}
            onValueChange={(value) => updateResponse(question.id, value)}
            className="flex gap-6"
          >
            {(question.options || [t('common.yes'), t('common.no')]).map((option) => (
              <div
                key={option}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  currentAnswer === option
                    ? "border-blue-300 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-blue-200 hover:bg-blue-25"
                }`}
                onClick={() => updateResponse(question.id, option)}
              >
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`} className="font-medium cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "multiple_choice":
        return (
          <RadioGroup
            value={currentAnswer.toString()}
            onValueChange={(value) => updateResponse(question.id, value)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {(question.options || []).map((option) => (
              <div
                key={option}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  currentAnswer === option
                    ? "border-purple-300 bg-purple-50 shadow-md"
                    : "border-gray-200 hover:border-purple-200 hover:bg-purple-25"
                }`}
                onClick={() => updateResponse(question.id, option)}
              >
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`} className="font-medium cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "scale":
        return (
          <div className="space-y-4">
            <RadioGroup
              value={currentAnswer.toString()}
              onValueChange={(value) => updateResponse(question.id, Number.parseInt(value))}
              className="flex justify-between"
            >
              {(question.options || ["1", "2", "3", "4", "5"]).map((option) => (
                <div
                  key={option}
                  className={`flex flex-col items-center space-y-2 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer min-w-[60px] ${
                    currentAnswer.toString() === option
                      ? "border-green-300 bg-green-50 shadow-md"
                      : "border-gray-200 hover:border-green-200 hover:bg-green-25"
                  }`}
                  onClick={() => updateResponse(question.id, Number.parseInt(option))}
                >
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`} className="font-bold text-lg cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <div className="flex justify-between text-xs text-gray-500 px-4">
              <span>{t('questionsForm.lowImpact')}</span>
              <span>{t('questionsForm.majorImpact')}</span>
            </div>
          </div>
        )

      case "text":
        return (
          <Textarea
            value={currentAnswer.toString()}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder={t('questionsForm.describePlaceholder')}
            rows={4}
            className="transition-all duration-200 focus:ring-blue-200 resize-y"
          />
        )

      default:
        return (
          <Textarea
            value={currentAnswer.toString()}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder={t('questionsForm.yourAnswerPlaceholder')}
            rows={3}
            className="transition-all duration-200 focus:ring-blue-200"
          />
        )
    }
  }

  const progress = calculateProgress()

  // État de chargement
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <Brain className="h-8 w-8 text-blue-600" />
              {t('questionsForm.title')}
            </CardTitle>
            <div className="mt-4">
              <Badge className={`${MODE_CONFIGS[generationMode].bgColor} ${MODE_CONFIGS[generationMode].color}`}>
                {React.createElement(MODE_CONFIGS[generationMode].icon, { className: "h-3 w-3 mr-1" })}
                Mode {MODE_CONFIGS[generationMode].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-800">{t('questionsForm.generating')}</p>
                <p className="text-sm text-gray-600">
                  {generationMode === 'fast' && "Génération rapide pour triage..."}
                  {generationMode === 'balanced' && "Analyse équilibrée en cours..."}
                  {generationMode === 'intelligent' && "Analyse approfondie multi-spécialités..."}
                </p>
                <p className="text-xs text-gray-500">
                  Temps estimé : {MODE_CONFIGS[generationMode].duration}
                </p>
              </div>
              <Progress value={75} className="w-80 mx-auto h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec Progress et Mode Selector */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Brain className="h-8 w-8 text-blue-600" />
            {t('questionsForm.title')}
          </CardTitle>
          
          {/* Metadata badges */}
          {metadata && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {metadata.detectedSpecialties?.map((specialty: string) => (
                <Badge key={specialty} className="bg-purple-100 text-purple-800">
                  <Stethoscope className="h-3 w-3 mr-1" />
                  {specialty}
                </Badge>
              ))}
              <Badge variant="outline">
                {metadata.approach || "multi-specialty-expert"}
              </Badge>
              {/* Badge du mode */}
              <Badge 
                className={`${MODE_CONFIGS[metadata.mode || 'balanced'].bgColor} ${MODE_CONFIGS[metadata.mode || 'balanced'].color}`}
              >
                {React.createElement(MODE_CONFIGS[metadata.mode || 'balanced'].icon, { className: "h-3 w-3 mr-1" })}
                Mode {MODE_CONFIGS[metadata.mode || 'balanced'].label}
              </Badge>
              {/* Temps de génération */}
              {metadata.generationTime && (
                <Badge variant="outline">
                  <Timer className="h-3 w-3 mr-1" />
                  {(metadata.generationTime / 1000).toFixed(1)}s
                </Badge>
              )}
              {/* Cache hit */}
              {metadata.fromCache && (
                <Badge className="bg-green-100 text-green-800">
                  <Gauge className="h-3 w-3 mr-1" />
                  Cache
                </Badge>
              )}
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('questionsForm.progressTitle')}</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status badges */}
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="outline" className="bg-blue-50">
              {getAnsweredCount()} / {questions.length} {t('questionsForm.answered')}
            </Badge>
            {error && <Badge variant="destructive">{t('questionsForm.fallbackMode')}</Badge>}
          </div>
          
          {/* Mode selector et bouton régénérer */}
          <div className="mt-6 space-y-4">
            {/* Sélecteur de mode */}
            <div className="flex justify-center gap-2">
              {Object.entries(MODE_CONFIGS).map(([mode, config]) => (
                <Button
                  key={mode}
                  variant={generationMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGenerationMode(mode as GenerationMode)}
                  className={generationMode === mode ? config.bgColor : ''}
                >
                  {React.createElement(config.icon, { className: "h-3 w-3 mr-1" })}
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs ml-1 opacity-70">({config.duration})</span>
                </Button>
              ))}
            </div>

            {/* Description du mode sélectionné */}
            <p className="text-sm text-gray-600">
              {MODE_CONFIGS[generationMode].description}
            </p>

            {/* Bouton régénérer */}
            <Button
              onClick={() => generateQuestions(generationMode)}
              variant="outline"
              size="sm"
              disabled={loading}
              className="mx-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Génération...' : `Régénérer (mode ${MODE_CONFIGS[generationMode].label})`}
            </Button>

            {/* Métriques de performance */}
            {performanceMetrics && (
              <div className="text-center space-y-1 text-xs text-gray-500">
                <p>
                  Généré {performanceMetrics.questionsCount} questions en {(performanceMetrics.totalTime / 1000).toFixed(1)}s
                </p>
                <p>
                  Modèle : {performanceMetrics.model} {performanceMetrics.cacheHit && '(depuis cache)'}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Alerte d'erreur */}
      {error && (
        <Card className="bg-amber-50/80 backdrop-blur-sm border-amber-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t('questionsForm.fallbackWarning')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation des questions */}
      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {questions.map((_, index) => {
            const isAnswered = responses[index] && (() => {
              const answer = responses[index].answer
              if (typeof answer === "string") {
                return answer.trim() !== ""
              }
              return answer !== "" && answer !== null && answer !== undefined
            })()
            
            return (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-full transition-all duration-200 font-semibold ${
                  currentQuestionIndex === index
                    ? "bg-blue-600 text-white shadow-lg scale-110"
                    : isAnswered
                    ? "bg-green-100 text-green-800 border-2 border-green-300"
                    : "bg-white/70 text-gray-600 border-2 border-gray-200 hover:bg-white hover:shadow-md"
                }`}
              >
                {isAnswered ? <CheckCircle className="h-4 w-4 mx-auto" /> : index + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* Cartes de questions */}
      {questions.map((question, index) => (
        <Card 
          key={question.id} 
          className={`bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 ${
            index !== currentQuestionIndex ? 'hidden' : ''
          }`}
        >
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6" />
                {t('questionsForm.question')} {index + 1} / {questions.length}
              </CardTitle>
              <div className="flex items-center gap-2">
                {question.clinical_score && (
                  <SimpleTooltip content={`Cette question utilise le score ${question.clinical_score}`}>
                    <Badge className="bg-white/20 text-white border-white/30">
                      <Calculator className="h-3 w-3 mr-1" />
                      Score clinique
                    </Badge>
                  </SimpleTooltip>
                )}
                <SimpleTooltip content={t('questionsForm.aiGenerated')}>
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Lightbulb className="h-3 w-3" />
                  </Badge>
                </SimpleTooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Métadonnées de la question */}
            <QuestionMetadataBadges question={question} />

            {/* Question */}
            <div>
              <Label className="text-lg font-semibold text-gray-800 leading-relaxed">
                {question.question}
              </Label>
              
              {/* Rationale */}
              {question.rationale && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">{question.rationale}</p>
                  </div>
                </div>
              )}

              {/* Bénéfice patient */}
              {question.patient_benefit && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <Heart className="h-4 w-4 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-800">
                      <strong>Pour vous :</strong> {question.patient_benefit}
                    </p>
                  </div>
                </div>
              )}

              {/* Input de la question */}
              <div className="mt-6">
                {renderQuestion(question)}
              </div>
            </div>

            {/* Éducation sur le score clinique */}
            <ScoreEducationCard question={question} />

            {/* Explication médicale */}
            {question.medical_explanation && showEducation && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2">
                  <Stethoscope className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Pour le médecin :</p>
                    <p className="text-sm text-gray-600">{question.medical_explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Red flags */}
            {question.red_flags && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Signes d'alerte</AlertTitle>
                <AlertDescription className="text-red-700">
                  {question.red_flags}
                </AlertDescription>
              </Alert>
            )}

            {/* Confirmation de réponse */}
            {(() => {
              const response = responses.find((r) => r.questionId === question.id)
              const currentAnswer = response?.answer || ""
              const isAnswered = typeof currentAnswer === "string" ? 
                currentAnswer.trim() !== "" : 
                currentAnswer !== "" && currentAnswer !== null && currentAnswer !== undefined

              return isAnswered && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-800">{t('questionsForm.answerRecorded')}</p>
                  </div>
                  <p className="text-sm text-green-700">
                    <span className="font-medium">{t('questionsForm.yourAnswer')}</span> {currentAnswer}
                  </p>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      ))}

      {/* Navigation entre questions */}
      {questions.length > 0 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('questionsForm.previousQuestion')}
          </Button>
          
          {!isLastQuestion() ? (
            <Button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              className="px-6 py-3"
            >
              {t('questionsForm.nextQuestion')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={onNext} 
              disabled={!isFormValid()}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 font-semibold"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {t('questionsForm.launchAIDiagnosis')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* Bouton diagnostic IA fixe */}
      {isFormValid() && (
        <div className="sticky bottom-4 flex justify-center">
          <Button 
            onClick={onNext}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300 font-semibold text-lg rounded-full animate-pulse"
          >
            <Zap className="h-6 w-6 mr-3" />
            {t('questionsForm.aiDiagnosisReady')}
            <ArrowRight className="h-5 w-5 ml-3" />
          </Button>
        </div>
      )}

      {/* Basculer l'éducation */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEducation(!showEducation)}
          className="flex items-center gap-2"
        >
          <GraduationCap className="h-4 w-4" />
          {showEducation ? "Masquer" : "Afficher"} les explications médicales
        </Button>
      </div>

      {/* Indicateur de sauvegarde automatique */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">{t('common.autoSave')}</span>
        </div>
      </div>

      {/* Navigation principale */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('questionsForm.backToClinical')}
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!isFormValid()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
        >
          {t('questionsForm.continueToDiagnosis')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
