"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Brain, Loader2 } from "lucide-react"

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
}

export default function QuestionsForm({
  patientData,
  clinicalData,
  onDataChange,
  onNext,
  onPrevious,
}: QuestionsFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateQuestions()
  }, [patientData, clinicalData])

  const generateQuestions = async () => {
    if (!patientData || !clinicalData) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération des questions")
      }

      if (data.success && Array.isArray(data.questions)) {
        setQuestions(data.questions)
        // Initialiser les réponses vides
        const initialResponses = data.questions.map((q: Question) => ({
          questionId: q.id,
          question: q.question,
          answer: "",
          type: q.type,
        }))
        setResponses(initialResponses)
      } else {
        throw new Error("Format de réponse invalide")
      }
    } catch (err) {
      console.error("Erreur génération questions:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")

      // Questions de fallback
      const fallbackQuestions = [
        {
          id: 1,
          question: "Avez-vous déjà eu des symptômes similaires par le passé ?",
          type: "boolean",
          options: ["Oui", "Non"],
        },
        {
          id: 2,
          question: "Les symptômes s'aggravent-ils avec l'effort physique ?",
          type: "boolean",
          options: ["Oui", "Non"],
        },
        {
          id: 3,
          question: "À quel moment de la journée les symptômes sont-ils les plus intenses ?",
          type: "multiple_choice",
          options: ["Matin", "Après-midi", "Soir", "Nuit"],
        },
        {
          id: 4,
          question: "Y a-t-il des facteurs qui soulagent vos symptômes ?",
          type: "boolean",
          options: ["Oui", "Non"],
        },
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
    onDataChange({ responses: newResponses })
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
            className="flex space-x-4"
          >
            {(question.options || ["Oui", "Non"]).map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "multiple_choice":
        return (
          <RadioGroup
            value={currentAnswer.toString()}
            onValueChange={(value) => updateResponse(question.id, value)}
            className="space-y-2"
          >
            {(question.options || []).map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "scale":
        return (
          <RadioGroup
            value={currentAnswer.toString()}
            onValueChange={(value) => updateResponse(question.id, Number.parseInt(value))}
            className="flex space-x-4"
          >
            {(question.options || ["1", "2", "3", "4", "5"]).map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "text":
        return (
          <Textarea
            value={currentAnswer.toString()}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder="Votre réponse..."
            rows={3}
          />
        )

      default:
        return (
          <Textarea
            value={currentAnswer.toString()}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder="Votre réponse..."
            rows={2}
          />
        )
    }
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

  const getAnsweredCount = () => {
    return responses.filter((response) => {
      const answer = response.answer
      if (typeof answer === "string") {
        return answer.trim() !== ""
      }
      return answer !== "" && answer !== null && answer !== undefined
    }).length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Questions IA Personnalisées
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Génération des questions personnalisées...</p>
              <p className="text-sm text-gray-600 mt-2">L'IA analyse votre profil pour créer des questions adaptées</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Questions IA Personnalisées
          </CardTitle>
          <div className="flex items-center justify-between mt-4">
            <Badge variant="outline">
              {getAnsweredCount()} / {questions.length} questions répondues
            </Badge>
            {error && <Badge variant="destructive">Mode fallback activé</Badge>}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <span className="text-sm">⚠️ Génération IA indisponible. Questions génériques utilisées.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              Question {index + 1} / {questions.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base font-medium">{question.question}</Label>
              <div className="mt-3">{renderQuestion(question)}</div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Résumé des réponses */}
      {getAnsweredCount() > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé de vos réponses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {responses
                .filter((response) => {
                  const answer = response.answer
                  if (typeof answer === "string") {
                    return answer.trim() !== ""
                  }
                  return answer !== "" && answer !== null && answer !== undefined
                })
                .map((response) => (
                  <div key={response.questionId} className="text-sm">
                    <span className="font-medium">Q{response.questionId}:</span>{" "}
                    <span className="text-gray-600">{response.answer}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'Examen Clinique
        </Button>
        <Button onClick={onNext} disabled={!isFormValid()}>
          Continuer vers le Diagnostic IA
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
