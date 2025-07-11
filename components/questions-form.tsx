"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, ArrowLeft, ArrowRight, Brain, Loader2, CheckCircle } from "lucide-react"

interface QuestionsFormProps {
  patientData: any
  clinicalData: any
  initialData?: any
  onNext: (data: any) => void
  onBack: () => void
}

interface Question {
  id: string
  question: string
  category: string
  importance: "high" | "medium" | "low"
  followUp?: string
}

export default function QuestionsForm({
  patientData,
  clinicalData,
  initialData = {},
  onNext,
  onBack,
}: QuestionsFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>(initialData?.answers || {})
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [preliminaryAssessment, setPreliminaryAssessment] = useState("")
  const [isComplete, setIsComplete] = useState(false)

  // Simulation de génération de questions par IA
  const generateQuestionsWithAI = useCallback(async () => {
    setIsGeneratingQuestions(true)

    // Simulation d'appel API avec délai
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Questions générées basées sur les données cliniques
    const generatedQuestions: Question[] = [
      {
        id: "q1",
        question: "Avez-vous des antécédents familiaux de maladies cardiovasculaires ?",
        category: "Antécédents familiaux",
        importance: "high",
        followUp: "Si oui, précisez le type et l'âge de survenue",
      },
      {
        id: "q2",
        question: "Prenez-vous actuellement des médicaments anticoagulants ou antiagrégants ?",
        category: "Médicaments",
        importance: "high",
        followUp: "Précisez le nom et la posologie",
      },
      {
        id: "q3",
        question: "Avez-vous remarqué une aggravation des symptômes à l'effort ?",
        category: "Symptômes",
        importance: "medium",
        followUp: "Décrivez le type d'effort et l'intensité des symptômes",
      },
      {
        id: "q4",
        question: "Avez-vous des troubles du sommeil ou des réveils nocturnes ?",
        category: "Symptômes associés",
        importance: "medium",
        followUp: "Fréquence et nature des troubles",
      },
      {
        id: "q5",
        question: "Consommez-vous du tabac ou de l'alcool ?",
        category: "Habitudes de vie",
        importance: "high",
        followUp: "Quantité et fréquence",
      },
      {
        id: "q6",
        question: "Avez-vous voyagé récemment dans des zones à risque ?",
        category: "Exposition",
        importance: "low",
        followUp: "Destination et durée du voyage",
      },
    ]

    // Évaluation préliminaire basée sur les données
    const assessment = `Basé sur le motif de consultation "${clinicalData?.chiefComplaint}" et les symptômes décrits, 
    une évaluation approfondie est nécessaire pour écarter les diagnostics différentiels importants. 
    Les questions suivantes permettront d'affiner l'orientation diagnostique.`

    setQuestions(generatedQuestions)
    setPreliminaryAssessment(assessment)
    setIsGeneratingQuestions(false)
  }, [clinicalData])

  useEffect(() => {
    if (questions.length === 0 && !isGeneratingQuestions) {
      generateQuestionsWithAI()
    }
  }, [generateQuestionsWithAI, questions.length, isGeneratingQuestions])

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      setIsComplete(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = () => {
    const questionsData = {
      questions,
      answers,
      preliminaryAssessment,
      completedAt: new Date().toISOString(),
      totalQuestions: questions.length,
      answeredQuestions: Object.keys(answers).length,
    }
    onNext(questionsData)
  }

  const getAnsweredCount = () => Object.keys(answers).filter((key) => answers[key]?.trim()).length
  const getProgress = () => (getAnsweredCount() / questions.length) * 100

  if (isGeneratingQuestions) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Génération des questions par IA</h3>
            <p className="text-gray-600 text-center">
              L'IA analyse les données cliniques de {patientData?.firstName} {patientData?.lastName}
              pour générer des questions ciblées...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl text-green-600">
              <CheckCircle className="h-6 w-6 mr-3" />
              Anamnèse Terminée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                L'anamnèse dirigée par IA est terminée. {getAnsweredCount()} questions sur {questions.length} ont été
                répondues.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Évaluation Préliminaire</h4>
              <p className="text-sm text-gray-700">{preliminaryAssessment}</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Résumé des Réponses</h4>
              {questions.map((question, index) => (
                <div key={question.id} className="border-l-4 border-l-blue-500 pl-4 py-2">
                  <div className="font-medium text-sm">{question.question}</div>
                  <div className="text-sm text-gray-600 mt-1">{answers[question.id] || "Non répondu"}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-6">
              <Button onClick={() => setIsComplete(false)} variant="outline">
                Modifier les réponses
              </Button>
              <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                Continuer vers le Diagnostic IA
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <MessageSquare className="h-6 w-6 mr-3 text-purple-600" />
            Anamnèse Dirigée par IA
          </CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Question {currentQuestionIndex + 1} sur {questions.length} pour {patientData?.firstName}{" "}
              {patientData?.lastName}
            </p>
            <div className="text-sm text-gray-500">
              {getAnsweredCount()}/{questions.length} répondues ({Math.round(getProgress())}%)
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {preliminaryAssessment && (
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>{preliminaryAssessment}</AlertDescription>
            </Alert>
          )}

          {currentQuestion && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">{currentQuestion.question}</h3>
                    {currentQuestion.followUp && <p className="text-sm text-purple-700">{currentQuestion.followUp}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        currentQuestion.importance === "high"
                          ? "bg-red-100 text-red-800"
                          : currentQuestion.importance === "medium"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {currentQuestion.importance === "high"
                        ? "Priorité haute"
                        : currentQuestion.importance === "medium"
                          ? "Priorité moyenne"
                          : "Priorité basse"}
                    </span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                      {currentQuestion.category}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`answer-${currentQuestion.id}`}>Votre réponse</Label>
                  <Textarea
                    id={`answer-${currentQuestion.id}`}
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Saisissez votre réponse détaillée..."
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>

                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {currentQuestionIndex + 1} / {questions.length}
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                  {currentQuestionIndex === questions.length - 1 ? "Terminer" : "Suivant"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6 border-t">
            <Button onClick={onBack} variant="outline" className="px-6 py-3 bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour Clinique
            </Button>
            <Button onClick={() => setIsComplete(true)} variant="outline" disabled={getAnsweredCount() === 0}>
              Passer au diagnostic ({getAnsweredCount()} réponses)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
