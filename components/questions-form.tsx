"use client"

import React, { useState, useEffect } from "react"
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

// Types
type GenerationMode = 'fast' | 'balanced' | 'intelligent'

interface Question {
  id: number
  question: string
  type?: string
  options?: string[]
  priority?: string
  rationale?: string
  clinical_reasoning?: string
  diagnostic_impact?: {
    if_positive?: string
    if_negative?: string
  }
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

// Composant helper pour les icônes dynamiques
function DynamicIcon({ icon: Icon, className }: { icon: any, className?: string }) {
  return <Icon className={className} />
}

// Composants helpers
function QuestionBadges({ question }: { question: Question }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {question.priority && (
        <Badge 
          variant={question.priority === 'critical' || question.priority === 'high' ? 'destructive' : 'outline'}
        >
          Priorité: {question.priority}
        </Badge>
      )}
      {question.diagnostic_impact && (
        <Badge className="bg-blue-100 text-blue-800">
          <Brain className="h-3 w-3 mr-1" />
          Impact diagnostique
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

// Fonction helper pour obtenir la valeur par défaut selon le type
function getDefaultValueForType(type: string): string {
  switch (type) {
    case 'number':
      return ''
    case 'date':
      return new Date().toISOString().split('T')[0]
    default:
      return ''
  }
}

// Fonction helper pour valider et nettoyer une valeur selon son type
function validateAndCleanValue(value: any, type: string): string {
  if (value === undefined || value === null || value === 'N/A') {
    return getDefaultValueForType(type)
  }
  
  switch (type) {
    case 'number':
      const numValue = Number(value)
      if (isNaN(numValue)) {
        return ''
      }
      return value.toString()
    case 'date':
      // Vérifier si c'est une date valide
      const dateValue = new Date(value)
      if (isNaN(dateValue.getTime())) {
        return new Date().toISOString().split('T')[0]
      }
      return value.toString()
    default:
      return value.toString()
  }
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
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [metadata, setMetadata] = useState<any>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  
  // États pour les modes
  const [generationMode, setGenerationMode] = useState<GenerationMode>('balanced')
  const [generationTime, setGenerationTime] = useState<number | null>(null)

  // Helper pour les traductions
  const t = (key: string) => getTranslation(key, language)

  // Détection automatique du mode selon l'urgence
  const detectUrgencyMode = (): GenerationMode => {
    const symptoms = clinicalData?.symptoms?.toLowerCase() || ''
    const chiefComplaint = clinicalData?.chiefComplaint?.toLowerCase() || ''
    const combined = `${symptoms} ${chiefComplaint}`
    
    const urgentKeywords = ['douleur thoracique', 'dyspnée', 'syncope', 'confusion', 'malaise']
    if (urgentKeywords.some(keyword => combined.includes(keyword))) {
      return 'fast'
    }
    
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
            // Valider et nettoyer les réponses
            const cleanedResponses = savedData.questionsData.responses.map((response: QuestionResponse) => {
              const cleanAnswer = validateAndCleanValue(response.answer, response.type)
              
              return {
                ...response,
                answer: cleanAnswer
              }
            })
            
            console.log('💾 Found saved responses:', cleanedResponses.length)
            setResponses(cleanedResponses)
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
          mode,
        }),
      })

      console.log('📨 Response status:', response.status)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Error ${response.status}`)
      }

      if (data.questions && Array.isArray(data.questions)) {
        const endTime = Date.now()
        const totalTime = endTime - startTime
        setGenerationTime(totalTime)
        
        console.log(`✅ Generated ${data.questions.length} questions in ${totalTime}ms (${mode} mode)`)
        
        // Normaliser les questions pour avoir toujours un type
        const normalizedQuestions = data.questions.map((q: any) => ({
          ...q,
          type: q.type || (q.options ? 'multiple_choice' : 'text')
        }))
        
        setQuestions(normalizedQuestions)
        setMetadata({
          ...data.metadata,
          generationTime: totalTime
        })
        
        // Initialiser les réponses avec les bonnes valeurs par défaut
        const initialResponses = normalizedQuestions.map((q: Question) => {
          const type = q.type || 'text'
          const defaultAnswer = getDefaultValueForType(type)
          
          return {
            questionId: q.id,
            question: q.question,
            answer: defaultAnswer,
            type: type,
          }
        })
        
        setResponses(initialResponses)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error("❌ Error generating questions:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")

      // Questions de fallback
      const fallbackQuestions: Question[] = [
        {
          id: 1,
          question: "Depuis combien de temps avez-vous ces symptômes?",
          type: "multiple_choice",
          options: ["Moins de 24h", "2-7 jours", "1-4 semaines", "Plus d'un mois"],
          priority: "high"
        },
        {
          id: 2,
          question: "Comment vos symptômes évoluent-ils?",
          type: "multiple_choice",
          options: ["S'aggravent", "Stables", "S'améliorent", "Varient"],
          priority: "high"
        },
        {
          id: 3,
          question: "Votre état général vous inquiète-t-il?",
          type: "multiple_choice",
          options: ["Très inquiet", "Modérément", "Peu inquiet", "Pas du tout"],
          priority: "medium"
        }
      ]

      setQuestions(fallbackQuestions)
      const initialResponses = fallbackQuestions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: getDefaultValueForType(q.type || 'text'),
        type: q.type || 'text',
      }))
      setResponses(initialResponses)
    } finally {
      setLoading(false)
    }
  }

  const updateResponse = (questionId: number, answer: string | number) => {
    const question = questions.find(q => q.id === questionId)
    const type = question?.type || 'text'
    
    // Valider et nettoyer la valeur selon le type
    const validatedAnswer = validateAndCleanValue(answer, type)
    
    const newResponses = responses.map((response) =>
      response.questionId === questionId 
        ? { ...response, answer: validatedAnswer } 
        : response
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

  const renderQuestion = (question: Question) => {
    const response = responses.find((r) => r.questionId === question.id)
    const currentAnswer = response?.answer || ""

    // Si la question a des options, c'est un choix multiple
    if (question.options && question.options.length > 0) {
      return (
        <RadioGroup
          value={currentAnswer.toString()}
          onValueChange={(value) => updateResponse(question.id, value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {question.options.map((option) => (
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
    }

    // Champ numérique
    if (question.type === 'number') {
      return (
        <input
          type="number"
          value={currentAnswer.toString()}
          onChange={(e) => updateResponse(question.id, e.target.value)}
          placeholder="Entrez un nombre"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      )
    }

    // Champ date
    if (question.type === 'date') {
      return (
        <input
          type="date"
          value={currentAnswer.toString()}
          onChange={(e) => updateResponse(question.id, e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      )
    }

    // Sinon, c'est un champ texte
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
                <DynamicIcon icon={MODE_CONFIGS[generationMode].icon} className="h-3 w-3 mr-1" />
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
                  {generationMode === 'intelligent' && "Analyse approfondie..."}
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
              <Badge variant="outline">
                Pattern: {metadata.pattern || 'général'}
              </Badge>
              <Badge 
                className={`${MODE_CONFIGS[metadata.mode || 'balanced'].bgColor} ${MODE_CONFIGS[metadata.mode || 'balanced'].color}`}
              >
                <DynamicIcon icon={MODE_CONFIGS[metadata.mode || 'balanced'].icon} className="h-3 w-3 mr-1" />
                Mode {MODE_CONFIGS[metadata.mode || 'balanced'].label}
              </Badge>
              {metadata.responseTime && (
                <Badge variant="outline">
                  <Timer className="h-3 w-3 mr-1" />
                  {(metadata.responseTime / 1000).toFixed(1)}s
                </Badge>
              )}
              {metadata.fromCache && (
                <Badge className="bg-green-100 text-green-800">
                  <Gauge className="h-3 w-3 mr-1" />
                  Cache
                </Badge>
              )}
              {metadata.fallback && (
                <Badge variant="secondary">Mode fallback</Badge>
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
                  <DynamicIcon icon={config.icon} className="h-3 w-3 mr-1" />
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

            {/* Temps de génération */}
            {generationTime && (
              <p className="text-center text-sm text-gray-500">
                Généré en {(generationTime / 1000).toFixed(1)}s
              </p>
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
                {error} - {t('questionsForm.fallbackWarning')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation des questions */}
      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {questions.map((_, index) => {
            const isAnswered = responses[index] && responses[index].answer !== ""
            
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
                <SimpleTooltip content={t('questionsForm.aiGenerated')}>
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Lightbulb className="h-3 w-3" />
                  </Badge>
                </SimpleTooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Badges de la question */}
            <QuestionBadges question={question} />

            {/* Question */}
            <div>
              <Label className="text-lg font-semibold text-gray-800 leading-relaxed">
                {question.question}
              </Label>
              
              {/* Rationale (mode balanced) */}
              {question.rationale && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">{question.rationale}</p>
                  </div>
                </div>
              )}

              {/* Clinical reasoning (mode intelligent) */}
              {question.clinical_reasoning && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-2">
                    <Brain className="h-4 w-4 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-purple-800 mb-1">Raisonnement clinique :</p>
                      <p className="text-sm text-purple-700">{question.clinical_reasoning}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Diagnostic impact (mode intelligent) */}
              {question.diagnostic_impact && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-800 mb-1">Impact diagnostique :</p>
                      {question.diagnostic_impact.if_positive && (
                        <p className="text-green-700">
                          <span className="font-medium">Si positif :</span> {question.diagnostic_impact.if_positive}
                        </p>
                      )}
                      {question.diagnostic_impact.if_negative && (
                        <p className="text-green-700">
                          <span className="font-medium">Si négatif :</span> {question.diagnostic_impact.if_negative}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Input de la question */}
              <div className="mt-6">
                {renderQuestion(question)}
              </div>
            </div>

            {/* Confirmation de réponse */}
            {(() => {
              const response = responses.find((r) => r.questionId === question.id)
              const currentAnswer = response?.answer || ""
              const isAnswered = currentAnswer !== ""

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
