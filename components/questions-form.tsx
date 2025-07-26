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
  Sparkles,
  Stethoscope,
  Clock,
  Target
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

interface Question {
  id: number
  question: string
  type: string
  options?: string[]
  category?: string
  priority?: string
  isSpecific?: boolean
  aiGenerated?: boolean
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
  const [generationMethod, setGenerationMethod] = useState<string>("")

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
      console.log('🚀 Génération questions avec données:', { patientData, clinicalData })
      
      // Construction du payload pour l'API
      const apiPayload = {
        patientData: {
          age: patientData.age || 0,
          gender: patientData.gender || "",
          medicalHistory: patientData.medicalHistory || [],
          currentMedications: patientData.currentMedications || []
        },
        clinicalData: {
          chiefComplaint: clinicalData.chiefComplaint || "",
          symptomDuration: clinicalData.symptomDuration || "",
          symptoms: clinicalData.symptoms || [],
          painScale: clinicalData.painScale || 0
        },
        language: language
      }

      console.log('📤 Payload API:', JSON.stringify(apiPayload, null, 2))

      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiPayload),
      })

      const data = await response.json()
      console.log('📥 Réponse API complète:', data)

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status, data)
        throw new Error(data.error || "Erreur lors de la génération des questions")
      }

      // TRAITEMENT DE LA RÉPONSE API
      if (data.success && data.ai_suggestions && Array.isArray(data.ai_suggestions)) {
        console.log('✅ Questions reçues de l\'API:', data.ai_suggestions.length)
        
        // Validation et formatage des questions
        const validQuestions = data.ai_suggestions
          .filter((q: any) => q && typeof q === 'object')
          .map((apiQuestion: any, index: number) => {
            console.log(`🔍 Traitement question ${index + 1}:`, apiQuestion)
            
            // Extraction sécurisée des propriétés
            const questionText = apiQuestion.question || `Question ${index + 1} - Veuillez décrire vos symptômes`
            const questionType = apiQuestion.type || "text"
            const questionOptions = Array.isArray(apiQuestion.options) ? apiQuestion.options : []
            
            // Validation du contenu de la question
            if (!questionText || questionText.trim().length < 10) {
              console.warn(`⚠️ Question ${index + 1} trop courte:`, questionText)
              return null
            }

            // Construction de la question formatée
            const formattedQuestion: Question = {
              id: index + 1,
              question: questionText.trim(),
              type: questionType,
              options: questionOptions.length > 0 ? questionOptions : undefined,
              category: apiQuestion.category || "general",
              priority: apiQuestion.priority || "medium",
              isSpecific: apiQuestion.isSpecific || false,
              aiGenerated: apiQuestion.aiGenerated || false
            }

            console.log(`✅ Question ${index + 1} formatée:`, formattedQuestion)
            return formattedQuestion
          })
          .filter((q: Question | null) => q !== null) as Question[]

        if (validQuestions.length > 0) {
          console.log(`🎯 ${validQuestions.length} questions valides extraites`)
          
          // Mise à jour de l'état
          setQuestions(validQuestions)
          setGenerationMethod(data.metadata?.generationMethod || "unknown")
          
          // Initialisation des réponses
          const initialResponses = validQuestions.map((q: Question) => ({
            questionId: q.id,
            question: q.question,
            answer: "",
            type: q.type,
          }))
          
          setResponses(initialResponses)
          
          console.log('✅ Interface mise à jour avec succès')
          console.log('📋 Questions affichées:')
          validQuestions.forEach((q, i) => {
            console.log(`  ${i+1}. ${q.question.substring(0, 100)}...`)
          })
          
        } else {
          console.warn('⚠️ Aucune question valide trouvée')
          throw new Error("Questions reçues invalides")
        }
        
      } else {
        console.error('❌ Format réponse API invalide:', {
          success: data.success,
          ai_suggestions: data.ai_suggestions,
          type: typeof data.ai_suggestions,
          isArray: Array.isArray(data.ai_suggestions)
        })
        throw new Error("Format de réponse API invalide")
      }

    } catch (err) {
      console.error("❌ Erreur génération questions:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")
      setGenerationMethod("fallback")

      // QUESTIONS FALLBACK GARANTIES
      const fallbackQuestions: Question[] = [
        {
          id: 1,
          question: "Sur une échelle de 0 à 10, comment évaluez-vous l'intensité de vos symptômes actuels ?",
          type: "scale",
          options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
          category: "intensity_assessment",
          priority: "high",
          isSpecific: false,
          aiGenerated: false
        },
        {
          id: 2,
          question: "Ces symptômes vous empêchent-ils de réaliser vos activités quotidiennes habituelles ?",
          type: "multiple_choice",
          options: ["Complètement", "Partiellement", "Un peu", "Pas du tout"],
          category: "functional_impact",
          priority: "high",
          isSpecific: false,
          aiGenerated: false
        },
        {
          id: 3,
          question: "À quel moment de la journée vos symptômes sont-ils les plus intenses ?",
          type: "multiple_choice",
          options: ["Matin", "Après-midi", "Soir", "Nuit", "Variable"],
          category: "timing_pattern",
          priority: "medium",
          isSpecific: false,
          aiGenerated: false
        },
        {
          id: 4,
          question: "Depuis combien de temps ressentez-vous ces symptômes ?",
          type: "multiple_choice",
          options: ["Quelques heures", "1-2 jours", "Une semaine", "Plus longtemps"],
          category: "duration",
          priority: "medium",
          isSpecific: false,
          aiGenerated: false
        },
        {
          id: 5,
          question: "Y a-t-il des facteurs qui soulagent ou aggravent vos symptômes ? Décrivez-les.",
          type: "text",
          category: "modifying_factors",
          priority: "medium",
          isSpecific: false,
          aiGenerated: false
        },
        {
          id: 6,
          question: "Avez-vous déjà eu des symptômes similaires par le passé ?",
          type: "boolean",
          options: ["Oui", "Non"],
          category: "previous_episodes",
          priority: "low",
          isSpecific: false,
          aiGenerated: false
        }
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
    return responses.length > 0 && responses.every((response) => {
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
            {(question.options || ["Oui", "Non"]).map((option) => (
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
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  currentAnswer === option
                    ? "border-purple-300 bg-purple-50 shadow-md"
                    : "border-gray-200 hover:border-purple-200 hover:bg-purple-25"
                }`}
                onClick={() => updateResponse(question.id, option)}
              >
                <RadioGroupItem value={option} id={`${question.id}-${option}`} className="mt-1" />
                <Label htmlFor={`${question.id}-${option}`} className="font-medium cursor-pointer leading-relaxed">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "scale":
        const scaleOptions = question.options || ["1", "2", "3", "4", "5"]
        const isZeroToTen = scaleOptions.length === 11 && scaleOptions[0] === "0"
        
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
              <span>{isZeroToTen ? "Aucun symptôme" : "Très faible"}</span>
              <span>{isZeroToTen ? "Symptôme maximum" : "Très fort"}</span>
            </div>
          </div>
        )

      case "text":
        return (
          <Textarea
            value={currentAnswer.toString()}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder="Décrivez en détail vos symptômes, sensations, et tout ce qui vous semble important..."
            rows={4}
            className="transition-all duration-200 focus:ring-blue-200 resize-y"
          />
        )

      default:
        return (
          <Textarea
            value={currentAnswer.toString()}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder="Votre réponse..."
            rows={3}
            className="transition-all duration-200 focus:ring-blue-200"
          />
        )
    }
  }

  const progress = calculateProgress()

  // ÉCRAN DE CHARGEMENT
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <Brain className="h-8 w-8 text-blue-600 animate-pulse" />
              Génération Questions Médicales IA
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <Stethoscope className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-blue-600" />
              </div>
              <div className="space-y-3">
                <p className="text-xl font-semibold text-gray-800">Analyse de votre profil médical</p>
                <p className="text-sm text-gray-600">Génération de questions ultra-spécifiques...</p>
                <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
                  <Clock className="h-4 w-4" />
                  <span>IA médicale en cours d'analyse</span>
                </div>
              </div>
              <Progress value={85} className="w-80 mx-auto h-3" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // INTERFACE PRINCIPALE
  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Brain className="h-8 w-8 text-blue-600" />
            Questions Médicales Personnalisées
          </CardTitle>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progression</span>
              <span className="font-semibold">{getAnsweredCount()} / {questions.length} répondues ({progress}%)</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            <Badge variant="outline" className="bg-blue-50 border-blue-200">
              <Target className="h-3 w-3 mr-1" />
              {questions.length} questions ciblées
            </Badge>
            {generationMethod === "openai_medical" && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Sparkles className="h-3 w-3 mr-1" />
                IA Médicale Ultra-Spécifique
              </Badge>
            )}
            {error && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Mode Secours
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Alert pour mode fallback */}
      {error && (
        <Card className="bg-amber-50/80 backdrop-blur-sm border-amber-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium">
                  Questions de secours activées
                </span>
                <p className="text-xs text-amber-600 mt-1">
                  L'IA médicale n'est pas disponible. Questions génériques utilisées.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation entre questions */}
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
                className={`w-12 h-12 rounded-full transition-all duration-200 font-semibold ${
                  currentQuestionIndex === index
                    ? "bg-blue-600 text-white shadow-lg scale-110"
                    : isAnswered
                    ? "bg-green-100 text-green-800 border-2 border-green-300"
                    : "bg-white/70 text-gray-600 border-2 border-gray-200 hover:bg-white hover:shadow-md"
                }`}
              >
                {isAnswered ? <CheckCircle className="h-5 w-5 mx-auto" /> : index + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* Questions Cards */}
      {questions.map((question, index) => (
        <Card 
          key={question.id} 
          className={`bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 ${
            index !== currentQuestionIndex ? 'hidden' : ''
          }`}
        >
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6" />
              Question {index + 1} sur {questions.length}
            </CardTitle>
            <div className="text-blue-100 text-sm mt-2 flex items-center gap-2">
              {question.aiGenerated ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générée par IA médicale
                </>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4" />
                  Question médicale standard
                </>
              )}
              {question.priority === "high" && (
                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                  Priorité élevée
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div>
              <Label className="text-lg font-semibold text-gray-800 leading-relaxed block mb-6">
                {question.question}
              </Label>
              <div className="mt-6">
                {renderQuestion(question)}
              </div>
            </div>

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
                    <p className="font-semibold text-green-800">Réponse enregistrée</p>
                  </div>
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Votre réponse :</span> {currentAnswer}
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
            Question précédente
          </Button>
          
          {!isLastQuestion() ? (
            <Button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              className="px-6 py-3"
            >
              Question suivante
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={onNext} 
              disabled={!isFormValid()}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 font-semibold"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Lancer le Diagnostic IA
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* Bouton Diagnostic IA fixe quand toutes questions répondues */}
      {isFormValid() && (
        <div className="sticky bottom-4 flex justify-center">
          <Button 
            onClick={onNext}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300 font-semibold text-lg rounded-full animate-pulse"
          >
            <Sparkles className="h-6 w-6 mr-3" />
            Diagnostic IA Prêt ({getAnsweredCount()}/{questions.length})
            <ArrowRight className="h-5 w-5 ml-3" />
          </Button>
        </div>
      )}

      {/* Résumé des réponses */}
      {getAnsweredCount() > 0 && (
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6" />
              Résumé de vos réponses ({getAnsweredCount()}/{questions.length})
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
                        <p className="text-sm text-gray-600 bg-white p-3 rounded border">
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

      {/* Indicateur de sauvegarde automatique */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Sauvegarde automatique</span>
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
          Retour aux données cliniques
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!isFormValid()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
        >
          Continuer vers le diagnostic
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
