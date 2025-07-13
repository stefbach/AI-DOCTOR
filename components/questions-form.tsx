"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  MessageSquare,
  Brain,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react"

interface Question {
  id: string
  question: string
  type: "text" | "boolean" | "scale" | "multiple"
  category: string
  importance: "high" | "medium" | "low"
  options?: string[]
}

interface QuestionsFormProps {
  data?: any
  allData?: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function QuestionsForm({ data, allData, onDataChange, onNext, onPrevious }: QuestionsFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Charger les données existantes
  useEffect(() => {
    if (data?.questions) {
      setQuestions(data.questions)
    }
    if (data?.answers) {
      setAnswers(data.answers)
    }
  }, [data])

  // Générer les questions automatiquement si pas encore fait
  useEffect(() => {
    if (questions.length === 0 && allData?.patientData && allData?.clinicalData) {
      generateQuestions()
    }
  }, [allData])

  const generateQuestions = async () => {
    setIsLoading(true)
    setError(null)
    setProgress(0)

    try {
      setProgress(30)
      console.log("🚀 Génération des questions IA...")

      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: allData.patientData,
          clinicalData: allData.clinicalData,
        }),
      })

      setProgress(70)

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`)
      }

      const result = await response.json()
      setProgress(100)

      if (result.success && result.data?.questions) {
        setQuestions(result.data.questions)
        console.log("✅ Questions générées:", result.data.questions.length)
      } else {
        throw new Error(result.error || "Erreur lors de la génération des questions")
      }
    } catch (err: any) {
      console.error("❌ Erreur génération questions:", err)
      setError(err.message)

      // Questions de fallback
      const fallbackQuestions: Question[] = [
        {
          id: "pain_intensity",
          question: "Sur une échelle de 1 à 10, comment évaluez-vous l'intensité de vos symptômes ?",
          type: "scale",
          category: "Symptômes",
          importance: "high",
        },
        {
          id: "symptom_duration",
          question: "Depuis combien de temps ressentez-vous ces symptômes ?",
          type: "text",
          category: "Chronologie",
          importance: "high",
        },
        {
          id: "triggers",
          question: "Avez-vous identifié des facteurs déclenchants ?",
          type: "text",
          category: "Facteurs",
          importance: "medium",
        },
        {
          id: "family_history",
          question: "Y a-t-il des antécédents familiaux similaires ?",
          type: "boolean",
          category: "Antécédents",
          importance: "medium",
        },
        {
          id: "current_medications",
          question: "Prenez-vous actuellement des médicaments ?",
          type: "text",
          category: "Traitements",
          importance: "high",
        },
      ]

      setQuestions(fallbackQuestions)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)

    // Sauvegarder automatiquement
    const questionsData = {
      questions,
      answers: newAnswers,
      completedAt: new Date().toISOString(),
    }
    onDataChange(questionsData)
  }

  const renderQuestion = (question: Question) => {
    const currentAnswer = answers[question.id] || ""

    switch (question.type) {
      case "text":
        return (
          <Textarea
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Votre réponse..."
            className="min-h-[80px]"
          />
        )

      case "boolean":
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id={`${question.id}-oui`} />
              <Label htmlFor={`${question.id}-oui`}>Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non" id={`${question.id}-non`} />
              <Label htmlFor={`${question.id}-non`}>Non</Label>
            </div>
          </RadioGroup>
        )

      case "scale":
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>1 (Très faible)</span>
              <span>10 (Très élevé)</span>
            </div>
            <RadioGroup
              value={currentAnswer}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="flex justify-between"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <div key={num} className="flex flex-col items-center space-y-2">
                  <RadioGroupItem value={num.toString()} id={`${question.id}-${num}`} />
                  <Label htmlFor={`${question.id}-${num}`} className="text-xs">
                    {num}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case "multiple":
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={currentAnswer.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentOptions = currentAnswer ? currentAnswer.split(",") : []
                    let newOptions
                    if (checked) {
                      newOptions = [...currentOptions, option]
                    } else {
                      newOptions = currentOptions.filter((opt) => opt !== option)
                    }
                    handleAnswerChange(question.id, newOptions.join(","))
                  }}
                />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        )

      default:
        return (
          <Input
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Votre réponse..."
          />
        )
    }
  }

  const getCompletionRate = () => {
    if (questions.length === 0) return 0
    const answeredQuestions = Object.keys(answers).filter((key) => answers[key]?.trim()).length
    return (answeredQuestions / questions.length) * 100
  }

  const canProceed = () => {
    const highPriorityQuestions = questions.filter((q) => q.importance === "high")
    const answeredHighPriority = highPriorityQuestions.filter((q) => answers[q.id]?.trim()).length
    return answeredHighPriority >= Math.ceil(highPriorityQuestions.length * 0.8) // 80% des questions importantes
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Anamnèse Dirigée par IA
          </CardTitle>
          <p className="text-gray-600">
            Questions personnalisées générées par l'IA basées sur les données cliniques du patient
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression des réponses</span>
              <span>{Math.round(getCompletionRate())}% complété</span>
            </div>
            <Progress value={getCompletionRate()} className="w-full" />
          </div>

          {/* Génération en cours */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium">Génération des questions par IA...</p>
                    <p className="text-sm text-gray-500">Analyse des données cliniques en cours</p>
                  </div>
                </div>
                <Progress value={progress} className="mt-4" />
              </CardContent>
            </Card>
          )}

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button variant="outline" size="sm" onClick={generateQuestions} className="ml-4 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Questions d'anamnèse</h3>
                <div className="flex gap-2">
                  <Badge variant="outline">{questions.length} questions</Badge>
                  <Badge variant="secondary">
                    {Object.keys(answers).filter((key) => answers[key]?.trim()).length} réponses
                  </Badge>
                </div>
              </div>

              {questions.map((question, index) => {
                const isAnswered = answers[question.id]?.trim()
                const importanceColor =
                  question.importance === "high"
                    ? "text-red-600"
                    : question.importance === "medium"
                      ? "text-orange-600"
                      : "text-gray-600"

                return (
                  <Card key={question.id} className={`${isAnswered ? "border-green-200 bg-green-50" : ""}`}>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Question {index + 1}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {question.category}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${importanceColor}`}>
                              {question.importance === "high"
                                ? "Importante"
                                : question.importance === "medium"
                                  ? "Modérée"
                                  : "Optionnelle"}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-gray-900">{question.question}</h4>
                        </div>
                        {isAnswered && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                      </div>
                    </CardHeader>
                    <CardContent>{renderQuestion(question)}</CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={onPrevious} className="px-6 py-3 bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour Clinique
            </Button>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={generateQuestions} disabled={isLoading}>
                <Brain className="h-4 w-4 mr-2" />
                Régénérer Questions
              </Button>
              <Button onClick={onNext} disabled={!canProceed()} className="bg-blue-600 hover:bg-blue-700 px-6 py-3">
                Continuer vers Diagnostic
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Aide */}
          {!canProceed() && questions.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Veuillez répondre à au moins 80% des questions importantes (marquées en rouge) pour continuer.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
