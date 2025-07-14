"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, CheckCircle, AlertCircle, Loader2, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react"

interface Question {
  id: number
  question: string
  type: "open" | "multiple_choice" | "yes_no" | "scale" | "text"
  options?: string[]
  rationale?: string
  priority?: "high" | "medium" | "low"
  category?: string
}

interface QuestionResponse {
  questionId: number
  question: string
  answer: string | number
  type: string
}

interface QuestionsFormProps {
  patientData?: any
  clinicalData?: any
  allData?: any
  onDataChange: (data: { responses: QuestionResponse[] }) => void
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState("")

  // Fonction de génération des questions avec gestion d'erreur robuste
  const generateQuestions = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setGenerationStatus("Analyse du dossier patient...")

    try {
      console.log("🤖 Génération des questions IA...")
      console.log("📝 Données patient:", !!patientData)
      console.log("📝 Données cliniques:", !!clinicalData)

      setGenerationStatus("Génération des questions personnalisées...")

      const requestBody = {
        patientData: patientData || {},
        clinicalData: clinicalData || {},
        numberOfQuestions: 8,
        focusArea: "diagnostic différentiel",
      }

      console.log("📡 Envoi requête API...")

      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📡 Réponse API reçue:", response.status, response.statusText)

      // Vérification du statut de la réponse
      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`

        try {
          const errorText = await response.text()
          console.error("❌ Réponse d'erreur:", errorText)

          // Tentative de parsing JSON de l'erreur
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch {
            // Si ce n'est pas du JSON, utiliser le texte brut
            if (errorText.includes("Internal Server Error")) {
              errorMessage = "Erreur interne du serveur"
            } else {
              errorMessage = errorText.substring(0, 100) + "..."
            }
          }
        } catch {
          // Si on ne peut pas lire la réponse d'erreur
          errorMessage = `Erreur ${response.status}`
        }

        throw new Error(errorMessage)
      }

      // Lecture de la réponse
      let responseText: string
      try {
        responseText = await response.text()
        console.log("📄 Réponse brute reçue (premiers 200 chars):", responseText.substring(0, 200))
      } catch (readError) {
        console.error("❌ Erreur lecture réponse:", readError)
        throw new Error("Impossible de lire la réponse du serveur")
      }

      // Parsing JSON
      let data: any
      try {
        data = JSON.parse(responseText)
        console.log("✅ JSON parsé avec succès")
      } catch (parseError) {
        console.error("❌ Erreur parsing JSON:", parseError)
        console.error("❌ Contenu reçu:", responseText.substring(0, 500))
        throw new Error("Réponse du serveur invalide (format JSON incorrect)")
      }

      // Validation de la structure de données
      if (!data.success) {
        throw new Error(data.error || "Échec de génération des questions")
      }

      if (!data.questions || !Array.isArray(data.questions)) {
        console.error("❌ Structure de données invalide:", data)
        throw new Error("Format de réponse invalide (questions manquantes)")
      }

      if (data.questions.length === 0) {
        throw new Error("Aucune question générée")
      }

      console.log(`✅ ${data.questions.length} questions reçues`)

      // Validation et nettoyage des questions
      const validQuestions = data.questions.map((q: any, index: number) => ({
        id: q.id || index + 1,
        question: q.question || "Question non définie",
        type: q.type || "open",
        options: q.options || undefined,
        rationale: q.rationale || "Question générée",
        priority: q.priority || "medium",
        category: q.category || "general",
      }))

      setQuestions(validQuestions)
      setGenerationStatus(`${validQuestions.length} questions générées avec succès`)

      // Initialiser les réponses
      const initialResponses = validQuestions.map((q: Question) => ({
        questionId: q.id,
        question: q.question,
        answer: "",
        type: q.type,
      }))
      setResponses(initialResponses)

      console.log("✅ Questions initialisées avec succès")
    } catch (error: any) {
      console.error("❌ Erreur génération questions:", error)
      setError(`Erreur lors de la génération des questions: ${error.message}`)

      // Questions de fallback en cas d'erreur
      const fallbackQuestions = generateFallbackQuestions()
      setQuestions(fallbackQuestions)
      const initialResponses = fallbackQuestions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: "",
        type: q.type,
      }))
      setResponses(initialResponses)
      setGenerationStatus("Questions de base générées (mode dégradé)")
    } finally {
      setIsGenerating(false)
    }
  }, [patientData, clinicalData])

  // Génération des questions au chargement
  useEffect(() => {
    generateQuestions()
  }, [generateQuestions])

  // Mise à jour des données parent quand les réponses changent
  useEffect(() => {
    if (responses.length > 0) {
      onDataChange({ responses })
    }
  }, [responses, onDataChange])

  const generateFallbackQuestions = (): Question[] => {
    return [
      {
        id: 1,
        question: "Depuis quand ressentez-vous ces symptômes ?",
        type: "open",
        priority: "high",
        category: "timeline",
        rationale: "Établissement de la chronologie",
      },
      {
        id: 2,
        question: "Vos symptômes sont-ils constants ou intermittents ?",
        type: "multiple_choice",
        options: ["Constants", "Intermittents", "Par crises", "Variables"],
        priority: "high",
        category: "pattern",
        rationale: "Caractérisation du pattern symptomatique",
      },
      {
        id: 3,
        question: "Sur une échelle de 1 à 10, quelle est l'intensité de vos symptômes ?",
        type: "scale",
        priority: "medium",
        category: "intensity",
        rationale: "Quantification de l'intensité",
      },
      {
        id: 4,
        question: "Qu'est-ce qui déclenche ou aggrave vos symptômes ?",
        type: "open",
        priority: "high",
        category: "triggers",
        rationale: "Identification des facteurs déclenchants",
      },
      {
        id: 5,
        question: "Qu'est-ce qui soulage vos symptômes ?",
        type: "open",
        priority: "high",
        category: "relief",
        rationale: "Identification des facteurs soulageants",
      },
      {
        id: 6,
        question: "Avez-vous des antécédents familiaux de maladies similaires ?",
        type: "yes_no",
        priority: "medium",
        category: "family_history",
        rationale: "Évaluation des facteurs héréditaires",
      },
      {
        id: 7,
        question: "Vos symptômes vous empêchent-ils de faire vos activités habituelles ?",
        type: "multiple_choice",
        options: ["Pas du tout", "Un peu", "Modérément", "Beaucoup", "Complètement"],
        priority: "medium",
        category: "functional_impact",
        rationale: "Évaluation de l'impact fonctionnel",
      },
      {
        id: 8,
        question: "Y a-t-il autre chose d'important que vous souhaitez mentionner ?",
        type: "open",
        priority: "low",
        category: "additional",
        rationale: "Informations supplémentaires",
      },
    ]
  }

  const handleResponseChange = (questionId: number, answer: string | number) => {
    setResponses((prev) =>
      prev.map((response) => (response.questionId === questionId ? { ...response, answer } : response)),
    )
  }

  const getCurrentQuestion = () => questions[currentQuestionIndex]
  const getCurrentResponse = () => responses.find((r) => r.questionId === getCurrentQuestion()?.id)

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const getProgress = () => {
    if (questions.length === 0) return 0
    const answeredQuestions = responses.filter((r) => r.answer !== "").length
    return (answeredQuestions / questions.length) * 100
  }

  const canProceed = () => {
    const answeredQuestions = responses.filter((r) => r.answer !== "").length
    return answeredQuestions >= Math.ceil(questions.length * 0.7) // Au moins 70% des questions répondues
  }

  const renderQuestion = (question: Question) => {
    const response = getCurrentResponse()
    const currentAnswer = response?.answer || ""

    switch (question.type) {
      case "open":
      case "text":
        return (
          <Textarea
            value={currentAnswer as string}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Votre réponse..."
            rows={4}
            className="w-full"
          />
        )

      case "multiple_choice":
        return (
          <RadioGroup
            value={currentAnswer as string}
            onValueChange={(value) => handleResponseChange(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "yes_no":
        return (
          <RadioGroup
            value={currentAnswer as string}
            onValueChange={(value) => handleResponseChange(question.id, value)}
            className="flex space-x-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Oui" id="yes" />
              <Label htmlFor="yes" className="cursor-pointer">
                Oui
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Non" id="no" />
              <Label htmlFor="no" className="cursor-pointer">
                Non
              </Label>
            </div>
          </RadioGroup>
        )

      case "scale":
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>1 (Très faible)</span>
              <span>10 (Très fort)</span>
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <Button
                  key={value}
                  variant={currentAnswer === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleResponseChange(question.id, value)}
                  className="w-10 h-10"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (isGenerating) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Génération des Questions IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Génération en cours...</span>
            </div>
            <div className="text-center text-sm text-gray-600">{generationStatus}</div>
            <Progress value={50} className="w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Button onClick={generateQuestions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p>Aucune question générée. Veuillez réessayer.</p>
              <Button onClick={generateQuestions} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Générer les questions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = getCurrentQuestion()

  return (
    <div className="space-y-6">
      {/* En-tête avec progression */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Questions Diagnostiques IA
            </CardTitle>
            <Badge variant="outline">
              {currentQuestionIndex + 1} / {questions.length}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progression</span>
              <span>{Math.round(getProgress())}% complété</span>
            </div>
            <Progress value={getProgress()} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      {/* Question actuelle */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    currentQuestion?.priority === "high"
                      ? "destructive"
                      : currentQuestion?.priority === "medium"
                        ? "default"
                        : "secondary"
                  }
                >
                  {currentQuestion?.priority || "medium"}
                </Badge>
                {currentQuestion?.category && <Badge variant="outline">{currentQuestion.category}</Badge>}
              </div>
              <h3 className="text-lg font-semibold">{currentQuestion?.question}</h3>
              {currentQuestion?.rationale && <p className="text-sm text-gray-600">{currentQuestion.rationale}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">{renderQuestion(currentQuestion)}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'Examen
          </Button>
          {currentQuestionIndex > 0 && (
            <Button variant="outline" onClick={previousQuestion}>
              Question Précédente
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={nextQuestion}>
              Question Suivante
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={onNext} disabled={!canProceed()}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Générer le Diagnostic
            </Button>
          )}
        </div>
      </div>

      {/* Résumé des réponses */}
      {responses.filter((r) => r.answer !== "").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Résumé des Réponses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responses
                .filter((r) => r.answer !== "")
                .slice(0, 6)
                .map((response, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-xs text-gray-600 truncate">{response.question}</p>
                    <p className="text-sm font-medium truncate">
                      {String(response.answer).substring(0, 50)}
                      {String(response.answer).length > 50 ? "..." : ""}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
