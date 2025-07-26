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
  Sparkles
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

interface Question {
  id: number
  question: string
  type: string
  options?: string[]
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

export default function ModernQuestionsForm({
  patientData,
  clinicalData,
  onDataChange,
  onNext,
  onPrevious,
  language = 'fr',
  consultationId
}: QuestionsFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
        
        if (currentConsultationId) {
          const savedData = await consultationDataService.getAllData()
          if (savedData?.questionsData?.responses) {
            setResponses(savedData.questionsData.responses)
          }
        }
      } catch (error) {
        console.error('Error loading saved questions data:', error)
      }
    }
    
    loadSavedData()
  }, [consultationId])

  // Save data when responses change
  useEffect(() => {
    const saveData = async () => {
      try {
        await consultationDataService.saveStepData(2, { responses })
      } catch (error) {
        console.error('Error saving questions data:', error)
      }
    }
    
    const timer = setTimeout(() => {
      if (responses.length > 0) {
        saveData()
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [responses])

  useEffect(() => {
    generateQuestions()
  }, [patientData, clinicalData])

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onDataChange({ responses })
    }, 500)
    return () => clearTimeout(timer)
  }, [responses, onDataChange])

  const generateQuestions = async () => {
    if (!patientData || !clinicalData) return

    setLoading(true)
    setError(null)

    try {
      console.log('🚀 Appel API questions avec données:', { patientData, clinicalData })
      
      // Construction du discourse patient
      const patientDiscourse = [
        clinicalData?.chiefComplaint,
        clinicalData?.diseaseHistory, 
        Array.isArray(clinicalData?.symptoms) ? clinicalData.symptoms.join(', ') : '',
        clinicalData?.symptomDuration
      ].filter(Boolean).join(' - ')

      console.log('📝 Discourse patient construit:', patientDiscourse)

      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_discourse_real_time: patientDiscourse || "Patient consultation médicale",
          patientData,
          clinicalData,
          language,
        }),
      })

      const data = await response.json()
      console.log('📥 Réponse complète API questions:', data)

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status, data)
        throw new Error(data.error || (language === 'fr' ? "Erreur lors de la génération des questions" : "Error generating questions"))
      }

      // ========== CORRECTION PRINCIPALE: Utilisation correcte de data.ai_suggestions ==========
      if (data.success && Array.isArray(data.ai_suggestions) && data.ai_suggestions.length > 0) {
        console.log('✅ Questions AI reçues:', data.ai_suggestions.length)
        console.log('📋 Détail questions brutes:', data.ai_suggestions)
        
        // ✅ CORRECTION: Utiliser directement les propriétés de l'API
        const formattedQuestions = data.ai_suggestions.map((aiQ: any, index: number) => {
          // Utiliser directement aiQ.question (qui contient la vraie question)
          const questionText = aiQ.question || `Question ${index + 1} - Données manquantes`
          
          // Utiliser directement aiQ.type et aiQ.options de l'API
          let questionType = aiQ.type || "text"
          let options: string[] | undefined = aiQ.options || undefined

          // Conversion des types pour compatibilité interface
          if (questionType === "yes_no") {
            questionType = "boolean"
            options = language === 'fr' ? ["Oui", "Non"] : ["Yes", "No"]
          } else if (questionType === "multiple_choice") {
            // Utiliser les options de l'API ou créer des options par défaut
            if (!options || options.length === 0) {
              options = language === 'fr' ? 
                ["Option 1", "Option 2", "Option 3", "Autre"] : 
                ["Option 1", "Option 2", "Option 3", "Other"]
            }
          } else if (questionType === "scale") {
            // Pour les échelles, utiliser les options de l'API ou créer 1-10
            if (!options || options.length === 0) {
              if (questionText.toLowerCase().includes('0') && questionText.toLowerCase().includes('10')) {
                options = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
              } else {
                options = ["1", "2", "3", "4", "5"]
              }
            }
          }

          console.log(`📝 Question ${index + 1} formatée:`, {
            original: aiQ,
            questionText: questionText,
            type: questionType,
            options: options
          })

          return {
            id: index + 1,
            question: questionText,
            type: questionType,
            options: options
          }
        })
        
        console.log('✅ Questions formatées pour interface:', formattedQuestions)
        
        // Vérifier que les questions ont du contenu
        const validQuestions = formattedQuestions.filter(q => 
          q.question && 
          q.question.trim() !== "" && 
          !q.question.includes("Question") && 
          !q.question.includes("générée par IA")
        )

        if (validQuestions.length > 0) {
          setQuestions(validQuestions)
          const initialResponses = validQuestions.map((q: Question) => ({
            questionId: q.id,
            question: q.question,
            answer: "",
            type: q.type,
          }))
          setResponses(initialResponses)
          
          console.log('✅ Interface mise à jour avec', validQuestions.length, 'questions valides')
        } else {
          console.warn('⚠️ Aucune question valide trouvée, utilisation fallback')
          throw new Error("Questions générées invalides")
        }
        
      } else {
        console.warn('⚠️ Format réponse API inattendu:', data)
        console.warn('⚠️ data.success:', data.success)
        console.warn('⚠️ data.ai_suggestions type:', typeof data.ai_suggestions)
        console.warn('⚠️ data.ai_suggestions array?:', Array.isArray(data.ai_suggestions))
        console.warn('⚠️ data.ai_suggestions length:', data.ai_suggestions?.length)
        throw new Error(language === 'fr' ? "Format de réponse invalide de l'API" : "Invalid API response format")
      }
    } catch (err) {
      console.error("❌ Erreur génération questions:", err)
      setError(err instanceof Error ? err.message : (language === 'fr' ? "Erreur inconnue" : "Unknown error"))

      // ========== QUESTIONS FALLBACK AMÉLIORÉES ==========
      const fallbackQuestions = language === 'fr' ? [
        {
          id: 1,
          question: "Sur une échelle de 0 à 10, comment évaluez-vous l'intensité de vos symptômes actuels ?",
          type: "scale",
          options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        },
        {
          id: 2,
          question: "Ces symptômes vous empêchent-ils de réaliser vos activités quotidiennes habituelles ?",
          type: "multiple_choice",
          options: ["Complètement", "Partiellement", "Un peu", "Pas du tout"],
        },
        {
          id: 3,
          question: "Avez-vous déjà eu des symptômes similaires par le passé ?",
          type: "boolean",
          options: ["Oui", "Non"],
        },
        {
          id: 4,
          question: "À quel moment de la journée vos symptômes sont-ils les plus intenses ?",
          type: "multiple_choice",
          options: ["Matin", "Après-midi", "Soir", "Nuit", "Variable"],
        },
        {
          id: 5,
          question: "Y a-t-il des facteurs qui soulagent ou aggravent vos symptômes ? Décrivez-les.",
          type: "text",
        },
        {
          id: 6,
          question: "Prenez-vous actuellement des médicaments pour traiter ces symptômes ?",
          type: "boolean",
          options: ["Oui", "Non"],
        },
      ] : [
        {
          id: 1,
          question: "On a scale of 0 to 10, how would you rate the intensity of your current symptoms?",
          type: "scale",
          options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        },
        {
          id: 2,
          question: "Do these symptoms prevent you from carrying out your usual daily activities?",
          type: "multiple_choice",
          options: ["Completely", "Partially", "A little", "Not at all"],
        },
        {
          id: 3,
          question: "Have you experienced similar symptoms in the past?",
          type: "boolean",
          options: ["Yes", "No"],
        },
        {
          id: 4,
          question: "At what time of day are your symptoms most intense?",
          type: "multiple_choice",
          options: ["Morning", "Afternoon", "Evening", "Night", "Variable"],
        },
        {
          id: 5,
          question: "Are there any factors that relieve or worsen your symptoms? Please describe them.",
          type: "text",
        },
        {
          id: 6,
          question: "Are you currently taking any medications to treat these symptoms?",
          type: "boolean",
          options: ["Yes", "No"],
        },
      ]

      console.log('🔄 Utilisation questions fallback:', fallbackQuestions.length)
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

  const renderQuestion = (question: Question) => {
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
        const scaleOptions = question.options || ["1", "2", "3", "4", "5"]
        return (
          <div className="space-y-4">
            <RadioGroup
              value={currentAnswer.toString()}
              onValueChange={(value) => updateResponse(question.id, Number.parseInt(value))}
              className="flex justify-between flex-wrap gap-2"
            >
              {scaleOptions.map((option) => (
                <div
                  key={option}
                  className={`flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer min-w-[50px] ${
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
              <span>{scaleOptions[0] === "0" ? "Aucun" : "Faible"}</span>
              <span>{scaleOptions.length > 5 ? "Maximum" : "Élevé"}</span>
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <Brain className="h-8 w-8 text-blue-600" />
              {t('questionsForm.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-800">{t('questionsForm.generating')}</p>
                <p className="text-sm text-gray-600">{t('questionsForm.analyzingProfile')}</p>
                <p className="text-xs text-blue-600">Génération questions ultra-spécifiques en cours...</p>
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
      {/* Header with Progress */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Brain className="h-8 w-8 text-blue-600" />
            {t('questionsForm.title')}
          </CardTitle>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('questionsForm.progressTitle')}</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="outline" className="bg-blue-50">
              {getAnsweredCount()} / {questions.length} {t('questionsForm.answered')}
            </Badge>
            {error && <Badge variant="destructive">{t('questionsForm.fallbackMode')}</Badge>}
            {!error && questions.length > 0 && <Badge variant="default" className="bg-green-100 text-green-800">IA Ultra-Spécifique ✨</Badge>}
          </div>
        </CardHeader>
      </Card>

      {/* Alert for fallback mode */}
      {error && (
        <Card className="bg-amber-50/80 backdrop-blur-sm border-amber-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium">
                  Mode Questions de Secours Activé
                </span>
                <p className="text-xs text-amber-600 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Navigation */}
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

      {/* Questions Cards */}
      {questions.map((question, index) => (
        <Card 
          key={question.id} 
          className={`bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 ${
            index !== currentQuestionIndex ? 'hidden' : ''
          }`}
        >
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6" />
              {t('questionsForm.question')} {index + 1} / {questions.length}
            </CardTitle>
            <div className="text-blue-100 text-sm mt-2">
              <Lightbulb className="h-4 w-4 inline mr-2" />
              {error ? "Questions de Secours" : "Généré par IA Médicale"}
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div>
              <Label className="text-lg font-semibold text-gray-800 leading-relaxed">
                {question.question}
              </Label>
              <div className="mt-6">
                {renderQuestion(question)}
              </div>
            </div>

            {/* Answer confirmation */}
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

      {/* Navigation between questions */}
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
          
          {/* Conditional button: Next Question OR AI Diagnosis */}
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

      {/* Fixed AI Diagnosis button when all questions are answered */}
      {isFormValid() && (
        <div className="sticky bottom-4 flex justify-center">
          <Button 
            onClick={onNext}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300 font-semibold text-lg rounded-full animate-pulse"
          >
            <Sparkles className="h-6 w-6 mr-3" />
            Diagnostic IA Prêt
            <ArrowRight className="h-5 w-5 ml-3" />
          </Button>
        </div>
      )}

      {/* Summary of answers */}
      {getAnsweredCount() > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6" />
              {t('questionsForm.summaryAnswers')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4">
              {responses
                .filter((response) => {
                  const answer = response.answer
                  if (typeof answer === "string") {
                    return answer.trim() !== ""
                  }
                  return answer !== "" && answer !== null && answer !== undefined
                })
                .map((response, index) => (
                  <div key={response.questionId} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">Q{response.questionId}</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 mb-2">{response.question}</p>
                        <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                          {response.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-save indicator */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">{t('common.autoSave')}</span>
        </div>
      </div>

      {/* Main Navigation */}
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
