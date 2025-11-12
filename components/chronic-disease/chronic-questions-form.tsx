"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Loader2, CheckCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ChronicQuestionsFormProps {
  patientData: any
  clinicalData: any
  onNext: (data: any) => void
  onBack: () => void
}

export default function ChronicQuestionsForm({ 
  patientData, 
  clinicalData, 
  onNext, 
  onBack 
}: ChronicQuestionsFormProps) {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    generateQuestions()
  }, [])

  const generateQuestions = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/chronic-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientData, clinicalData })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.questions) {
        setQuestions(data.questions)
        toast({
          title: "✅ AI Questions Generated",
          description: `${data.questions.length} specialized chronic disease questions ready`
        })
      } else {
        throw new Error(data.error || "Failed to generate questions")
      }
    } catch (err: any) {
      console.error("Error generating chronic questions:", err)
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to generate AI questions. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = () => {
    const questionsData = questions.map(q => ({
      question: q.question_en,
      answer: answers[q.id] || "",
      category: q.category,
      clinicalSignificance: q.clinicalSignificance
    }))

    onNext({ questions: questionsData, rawAnswers: answers })
  }

  if (loading) {
    return (
      <Card className="border-purple-200">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-lg text-gray-600">Generating specialized chronic disease questions...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <div className="flex gap-4">
            <Button onClick={onBack} variant="outline">Back</Button>
            <Button onClick={generateQuestions}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  return (
    <div className="space-y-6">
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-purple-600" />
              AI Specialized Questions
            </CardTitle>
            <Badge variant="secondary">
              {answeredCount} / {totalQuestions} answered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {questions.map((q, index) => (
            <div key={q.id} className="space-y-2 pb-4 border-b last:border-b-0">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">{index + 1}</Badge>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={q.id} className="text-base font-medium">
                    {q.question_en}
                  </Label>
                  {q.category && (
                    <Badge variant="secondary" className="text-xs">
                      {q.category.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  {q.type === "text" || q.type === "textarea" ? (
                    <Textarea
                      id={q.id}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Your answer..."
                      rows={3}
                      className="mt-2"
                    />
                  ) : q.type === "number" ? (
                    <Input
                      id={q.id}
                      type="number"
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Enter number..."
                      className="mt-2"
                    />
                  ) : (
                    <Input
                      id={q.id}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Your answer..."
                      className="mt-2"
                    />
                  )}
                  {answers[q.id] && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Answered
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
          disabled={answeredCount === 0}
        >
          Continue to Analysis ({answeredCount} answers)
        </Button>
      </div>
    </div>
  )
}
