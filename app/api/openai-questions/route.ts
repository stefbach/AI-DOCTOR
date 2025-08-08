"use client"

import React, { useState, useEffect } from "react"
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
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Timer
} from "lucide-react"

interface Question {
  id: number
  question: string
  type?: string
  options?: string[]
  priority?: string
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
  language?: string
  consultationId?: string | null
}

export default function QuestionsFormFixed({
  patientData,
  clinicalData,
  onDataChange,
  onNext,
  onPrevious,
  language = 'en',
  consultationId
}: QuestionsFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [metadata, setMetadata] = useState<any>(null)
  const [apiCallCount, setApiCallCount] = useState(0)
  
  // 🔧 FIX: Pas de hasGenerated qui bloque !
  
  // 🚨 DEBUG: Log à chaque render
  console.log('🔄 QuestionsForm render:', {
    hasPatientData: !!patientData,
    hasClinicalData: !!clinicalData,
    questionsCount: questions.length,
    loading,
    apiCallCount
  })

  // 📡 Fonction pour appeler l'API
  const generateQuestions = async (forceRegenerate = false) => {
    console.log('🚀 generateQuestions called:', {
      forceRegenerate,
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      apiCallCount
    })
    
    // Vérification des données
    if (!patientData || !clinicalData) {
      console.error('❌ Missing data:', { patientData, clinicalData })
      setError('Missing patient or clinical data')
      
      // Utiliser des questions par défaut
      const defaultQuestions = [
        {
          id: 1,
          question: "How long have you had these symptoms?",
          type: "multiple_choice",
          options: ["Less than 24h", "2-7 days", "1-4 weeks", "More than a month"],
          priority: "high"
        },
        {
          id: 2,
          question: "Are your symptoms getting worse?",
          type: "multiple_choice",
          options: ["Yes", "No", "Stable", "Variable"],
          priority: "high"
        },
        {
          id: 3,
          question: "Rate your pain level (0-10)",
          type: "multiple_choice",
          options: ["0-2 (Mild)", "3-5 (Moderate)", "6-8 (Severe)", "9-10 (Critical)"],
          priority: "high"
        }
      ]
      
      setQuestions(defaultQuestions)
      const initialResponses = defaultQuestions.map(q => ({
        questionId: q.id,
        question: q.question,
        answer: "",
        type: q.type || 'text'
      }))
      setResponses(initialResponses)
      return
    }

    setLoading(true)
    setError(null)
    setApiCallCount(prev => prev + 1)
    
    const startTime = Date.now()

    try {
      console.log('📡 Calling API /api/openai-questions...')
      
      const requestBody = {
        patientData: {
          age: patientData.age || "Unknown",
          gender: patientData.gender || "Unknown",
          weight: patientData.weight,
          height: patientData.height
        },
        clinicalData: {
          chiefComplaint: clinicalData.chiefComplaint || clinicalData.symptoms || "",
          symptoms: clinicalData.symptoms || clinicalData.chiefComplaint || "",
          symptomDuration: clinicalData.symptomDuration || "",
          painScale: clinicalData.painScale || "0"
        },
        mode: 'balanced'
      }
      
      console.log('📤 Request body:', requestBody)
      
      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📨 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Response data:', data)

      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        const endTime = Date.now()
        console.log(`✅ Generated ${data.questions.length} questions in ${endTime - startTime}ms`)
        
        setQuestions(data.questions)
        setMetadata(data.metadata || {})
        
        // Initialize responses
        const initialResponses = data.questions.map((q: Question) => ({
          questionId: q.id,
          question: q.question,
          answer: "",
          type: q.type || (q.options ? 'multiple_choice' : 'text')
        }))
        
        setResponses(initialResponses)
      } else {
        throw new Error('No questions in response')
      }
      
    } catch (err) {
      console.error("❌ Error generating questions:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      
      // Fallback questions
      const fallbackQuestions: Question[] = [
        {
          id: 1,
          question: "How long have you had these symptoms?",
          type: "multiple_choice",
          options: ["Less than 24h", "2-7 days", "1-4 weeks", "More than a month"],
          priority: "high"
        },
        {
          id: 2,
          question: "How are your symptoms evolving?",
          type: "multiple_choice",
          options: ["Getting worse", "Stable", "Improving", "Variable"],
          priority: "high"
        },
        {
          id: 3,
          question: "How concerned are you?",
          type: "multiple_choice",
          options: ["Very concerned", "Moderately", "Slightly", "Not at all"],
          priority: "medium"
        }
      ]
      
      setQuestions(fallbackQuestions)
      const initialResponses = fallbackQuestions.map(q => ({
        questionId: q.id,
        question: q.question,
        answer: "",
        type: q.type || 'text'
      }))
      setResponses(initialResponses)
      
    } finally {
      setLoading(false)
    }
  }

  // 🔧 FIX: useEffect simplifié qui se déclenche toujours
  useEffect(() => {
    console.log('📌 useEffect triggered:', {
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      questionsLength: questions.length
    })
    
    // Générer les questions si on n'en a pas encore
    if (questions.length === 0) {
      console.log('🎯 No questions yet, generating...')
      generateQuestions()
    }
  }, []) // Dépendances vides = s'exécute une fois au montage

  // Fonction pour mettre à jour les réponses
  const updateResponse = (questionId: number, answer: string | number) => {
    setResponses(prev => prev.map(response =>
      response.questionId === questionId 
        ? { ...response, answer: String(answer) } 
        : response
    ))
  }

  // Calculer le progrès
  const getAnsweredCount = () => {
    return responses.filter(r => r.answer && r.answer.toString().trim() !== "").length
  }

  const calculateProgress = () => {
    if (questions.length === 0) return 0
    return Math.round((getAnsweredCount() / questions.length) * 100)
  }

  const isFormValid = () => {
    return responses.every(r => r.answer && r.answer.toString().trim() !== "")
  }

  const progress = calculateProgress()

  // Rendu de la question
  const renderQuestion = (question: Question) => {
    const response = responses.find(r => r.questionId === question.id)
    const currentAnswer = response?.answer?.toString() || ""

    if (question.options && question.options.length > 0) {
      return (
        <RadioGroup
          value={currentAnswer}
          onValueChange={(value) => updateResponse(question.id, value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {question.options.map((option) => (
            <div
              key={option}
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
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

    return (
      <Textarea
        value={currentAnswer}
        onChange={(e) => updateResponse(question.id, e.target.value)}
        placeholder="Enter your answer here..."
        rows={3}
        className="transition-all duration-200 focus:ring-blue-200"
      />
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xl font-semibold text-gray-800">Generating Questions...</p>
              <p className="text-sm text-gray-600">Analyzing your symptoms...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Debug info */}
      <div className="bg-gray-100 p-2 rounded text-xs">
        API Calls: {apiCallCount} | Questions: {questions.length} | Answered: {getAnsweredCount()}
      </div>

      {/* Header */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold">
            <Brain className="h-8 w-8 text-blue-600" />
            Clinical Questions
          </CardTitle>
          
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-center gap-4">
              <Badge variant="outline">
                {getAnsweredCount()} / {questions.length} answered
              </Badge>
              {error && <Badge variant="destructive">Error: {error}</Badge>}
            </div>
          </div>

          {/* Regenerate button */}
          <Button
            onClick={() => generateQuestions(true)}
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Regenerate Questions
          </Button>
        </CardHeader>
      </Card>

      {/* Questions */}
      {questions.length > 0 ? (
        <>
          {/* Navigation dots */}
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((_, index) => {
              const isAnswered = responses[index]?.answer !== ""
              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    currentQuestionIndex === index
                      ? "bg-blue-600 text-white scale-110"
                      : isAnswered
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isAnswered ? <CheckCircle className="h-4 w-4 mx-auto" /> : index + 1}
                </button>
              )
            })}
          </div>

          {/* Current question */}
          {questions.map((question, index) => (
            <Card 
              key={question.id}
              className={`${index !== currentQuestionIndex ? 'hidden' : ''}`}
            >
              <CardHeader>
                <CardTitle>Question {index + 1} of {questions.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-lg font-semibold mb-4 block">
                  {question.question}
                </Label>
                {renderQuestion(question)}
              </CardContent>
            </Card>
          ))}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={onNext}
                disabled={!isFormValid()}
                className="bg-green-600 hover:bg-green-700"
              >
                Continue to Diagnosis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </>
      ) : (
        // No questions state
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">No questions generated</p>
            <p className="text-gray-600 mb-4">Click the button below to generate questions</p>
            <Button onClick={() => generateQuestions(true)}>
              Generate Questions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bottom navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isFormValid()}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
