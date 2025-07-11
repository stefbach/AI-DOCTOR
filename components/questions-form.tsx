"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, Brain, ArrowLeft, Target, AlertTriangle } from "lucide-react"

interface QuestionsFormProps {
  clinicalQuestions: any
  initialAnswers: any
  onAnswersChange: (answers: any) => void
  onNext: () => void
  onBack: () => void
  isLoading: boolean
  error: string | null
  apiStatus: any
}

export default function QuestionsForm({
  clinicalQuestions,
  initialAnswers,
  onAnswersChange,
  onNext,
  onBack,
  isLoading,
  error,
  apiStatus,
}: QuestionsFormProps) {
  const [answers, setAnswers] = useState(initialAnswers || {})
  const [errors, setErrors] = useState({})

  const handleAnswerChange = useCallback(
    (index: number, value: string) => {
      const newAnswers = { ...answers, [index]: value }
      setAnswers(newAnswers)
      onAnswersChange(newAnswers)

      if (errors[index]) {
        setErrors((prev) => ({ ...prev, [index]: null }))
      }
    },
    [answers, onAnswersChange, errors],
  )

  const validateAnswers = () => {
    const newErrors = {}
    const questions = clinicalQuestions?.questions || []

    questions.forEach((_, index) => {
      if (!answers[index]?.trim()) {
        newErrors[index] = "Réponse requise"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateAnswers()) {
      onNext()
    }
  }

  const getAnsweredCount = () => {
    return Object.keys(answers).filter((key) => answers[key]?.trim()).length
  }

  const getTotalQuestions = () => {
    return clinicalQuestions?.questions?.length || 0
  }

  if (!clinicalQuestions) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Questions cliniques en cours de génération...</h3>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <HelpCircle className="h-8 w-8 text-orange-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Questions Cliniques IA</h2>
            <p className="text-gray-600">Questions générées par l'IA pour affiner le diagnostic</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-600">
            {getAnsweredCount()}/{getTotalQuestions()}
          </div>
          <div className="text-sm text-gray-600">Réponses complétées</div>
        </div>
      </div>

      {/* Impression clinique préliminaire */}
      {clinicalQuestions.preliminary_assessment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Impression Clinique Préliminaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <p className="text-purple-800">{clinicalQuestions.preliminary_assessment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostics différentiels */}
      {clinicalQuestions.differential_diagnoses && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              Diagnostics Différentiels Considérés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {clinicalQuestions.differential_diagnoses.map((diagnosis, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                  {diagnosis}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions cliniques */}
      <div className="space-y-6">
        {clinicalQuestions.questions?.map((question, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-start">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold mr-3 mt-1">
                    Q{index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900 leading-relaxed">{question.question}</p>
                    {question.rationale && <p className="text-sm text-gray-600 mt-2 italic">💡 {question.rationale}</p>}
                  </div>
                </CardTitle>
                <div className="flex items-center space-x-2 ml-4">
                  <Badge
                    variant={
                      question.priority === "high"
                        ? "destructive"
                        : question.priority === "medium"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {question.priority}
                  </Badge>
                  <Badge variant="outline">{question.category}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Réponses attendues */}
              {question.expected_answers && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Exemples de réponses :</p>
                  <div className="flex flex-wrap gap-2">
                    {question.expected_answers.map((answer, answerIndex) => (
                      <Badge key={answerIndex} variant="outline" className="text-xs">
                        {answer}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone de réponse */}
              <div>
                <Label htmlFor={`answer-${index}`} className="text-sm font-medium">
                  Votre réponse *
                </Label>
                <Textarea
                  id={`answer-${index}`}
                  value={answers[index] || ""}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder="Décrivez en détail votre observation ou réponse..."
                  rows={4}
                  className={`mt-2 ${errors[index] ? "border-red-500" : ""}`}
                />
                {errors[index] && <p className="text-red-500 text-sm mt-1">{errors[index]}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Erreurs */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="font-semibold text-red-800">Erreur</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression</span>
          <span className="text-sm text-gray-600">
            {getAnsweredCount()}/{getTotalQuestions()} questions répondues
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(getAnsweredCount() / getTotalQuestions()) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline" className="flex items-center bg-transparent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour Clinique
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={getAnsweredCount() === 0 || isLoading}
          className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Génération Diagnostic...
            </>
          ) : (
            <>
              <Brain className="h-5 w-5 mr-2" />
              Générer Diagnostic IA →
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
