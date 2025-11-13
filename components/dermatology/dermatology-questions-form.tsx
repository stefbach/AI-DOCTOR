"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Props {
  patientData: any
  imageData: any
  ocrAnalysisData: any
  onNext: (data: any) => void
  onBack: () => void
}

export default function DermatologyQuestionsForm({ patientData, imageData, ocrAnalysisData, onNext, onBack }: Props) {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/dermatology-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientData, imageData, ocrAnalysisData })
      })
      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
      toast({ title: "Error", description: "Failed to load questions", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = () => {
    onNext({ questions, answers })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {questions.map((q, index) => (
        <Card key={q.id} className="border-teal-200">
          <CardContent className="p-6">
            <Label className="text-base font-semibold mb-4 block">
              {index + 1}. {q.question}
            </Label>
            
            {q.type === 'open' && (
              <Textarea
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                placeholder="Your answer..."
                className="min-h-[100px]"
              />
            )}

            {q.type === 'closed' && (
              <RadioGroup value={answers[q.id]} onValueChange={(val) => handleAnswer(q.id, val)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${q.id}-yes`} />
                  <Label htmlFor={`${q.id}-yes`}>Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${q.id}-no`} />
                  <Label htmlFor={`${q.id}-no`}>No</Label>
                </div>
              </RadioGroup>
            )}

            {q.type === 'multiple_choice' && q.options && (
              <div className="space-y-2">
                {q.options.map((option: string) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${q.id}-${option}`}
                      checked={(answers[q.id] || []).includes(option)}
                      onCheckedChange={(checked) => {
                        const current = answers[q.id] || []
                        handleAnswer(q.id, checked ? [...current, option] : current.filter((o: string) => o !== option))
                      }}
                    />
                    <Label htmlFor={`${q.id}-${option}`}>{option}</Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSubmit} className="bg-gradient-to-r from-teal-600 to-cyan-600">
          Continue to Diagnosis
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
