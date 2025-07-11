"use client"

import { useState, useCallback } from "react"
import { HelpCircle, Brain, Globe, Loader, AlertTriangle } from "lucide-react"

interface QuestionsFormProps {
  clinicalQuestions: any
  initialAnswers: any
  onAnswersChange: (answers: any) => void
  onNext: () => void
  onBack: () => void
  isLoading: boolean
  error?: string
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
  const [answers, setAnswers] = useState(initialAnswers)

  const updateAnswer = useCallback(
    (index: number, value: string) => {
      const newAnswers = { ...answers, [index]: value }
      setAnswers(newAnswers)
      onAnswersChange(newAnswers)
    },
    [answers, onAnswersChange],
  )

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <HelpCircle className="h-6 w-6 mr-3 text-orange-600" />
        Questions Cliniques OpenAI
      </h2>

      {clinicalQuestions?.preliminary_assessment && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-orange-800 mb-2 flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Impression Clinique Préliminaire
          </h3>
          <p className="text-sm text-orange-700">{clinicalQuestions.preliminary_assessment}</p>
        </div>
      )}

      {clinicalQuestions?.differential_diagnoses && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">🎯 Diagnostics Différentiels à Explorer</h3>
          <div className="flex flex-wrap gap-2">
            {clinicalQuestions.differential_diagnoses.map((diagnosis, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {diagnosis}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {clinicalQuestions?.questions?.map((q, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{q.question}</h4>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      q.priority === "high"
                        ? "bg-red-100 text-red-800"
                        : q.priority === "medium"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {q.priority}
                  </span>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">{q.category}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Justification:</strong> {q.rationale}
              </div>
              {q.expected_answers && (
                <div className="text-xs text-gray-500 mb-2">
                  <strong>Réponses possibles:</strong> {q.expected_answers.join(", ")}
                </div>
              )}
            </div>

            <textarea
              value={answers[index] || ""}
              onChange={(e) => updateAnswer(index, e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Réponse détaillée à cette question clinique..."
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5 inline mr-2" />
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center font-semibold transition-colors"
        >
          Retour Présentation Clinique
        </button>

        <button
          onClick={onNext}
          disabled={Object.keys(answers).length === 0 || isLoading || !apiStatus.openai}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold transition-colors"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin h-5 w-5 mr-2" />
              Analyse avec APIs réelles...
            </>
          ) : (
            <>
              <Globe className="h-5 w-5 mr-2" />
              Lancer Diagnostic avec APIs Réelles
            </>
          )}
        </button>
      </div>
    </div>
  )
}
