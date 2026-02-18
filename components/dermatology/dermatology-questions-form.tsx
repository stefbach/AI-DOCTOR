"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { VoiceDictationButton } from "@/components/voice-dictation-button"

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
  const [progress, setProgress] = useState(0)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchQuestions()
    // Progress bar: ramp up to 90% over ~60s, then slow down
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev < 60) return prev + 2       // 0-60% in ~30s
        if (prev < 85) return prev + 0.5     // 60-85% in ~50s
        if (prev < 95) return prev + 0.1     // slow crawl to 95%
        return prev
      })
    }, 1000)
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [])

  const fetchQuestions = async () => {
    try {
      console.log('🔍 FRONTEND: Fetching dermatology questions...')
      const response = await fetch('/api/dermatology-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientData, imageData, ocrAnalysisData })
      })
      
      console.log('🔍 FRONTEND: Response status:', response.status)
      
      const data = await response.json()
      console.log('🔍 FRONTEND: Response data keys:', Object.keys(data))
      console.log('🔍 FRONTEND: data.questions exists?:', !!data.questions)
      console.log('🔍 FRONTEND: data.questions length:', data.questions?.length || 0)
      
      if (data.questions && Array.isArray(data.questions)) {
        console.log('✅ FRONTEND: Setting questions:', data.questions.length)
        console.log('   First question:', data.questions[0])
        setQuestions(data.questions)
      } else {
        console.error('❌ FRONTEND: No questions array in response')
        console.error('   Response data:', data)
        setQuestions([])
      }
    } catch (error) {
      console.error('❌ FRONTEND: Error fetching questions:', error)
      toast({ title: "Error", description: "Failed to load questions", variant: "destructive" })
      setQuestions([])
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
    console.log('🔄 FRONTEND: Still loading questions...')
    const displayProgress = Math.round(progress)
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-teal-700">Generating AI Questions</p>
          <p className="text-sm text-gray-500">
            Analyzing your images and clinical data to generate targeted dermatology questions. This may take a moment...
          </p>
        </div>
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Progress</span>
            <span>{displayProgress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  console.log('🎨 FRONTEND: Rendering questions form')
  console.log('   Questions count:', questions.length)
  console.log('   Questions:', questions)

  if (questions.length === 0) {
    console.warn('⚠️ FRONTEND: No questions to display')
    return (
      <div className="text-center p-12">
        <p className="text-gray-600 mb-4">No questions available</p>
        <Button onClick={fetchQuestions}>Retry</Button>
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
              <div className="space-y-2">
                <div className="flex items-center justify-end">
                  <VoiceDictationButton
                    onTranscript={(text) => {
                      const currentText = answers[q.id] || ''
                      const newText = currentText ? `${currentText} ${text}` : text
                      handleAnswer(q.id, newText)
                    }}
                    language="auto"
                  />
                </div>
                <Textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder="Your answer..."
                  className="min-h-[100px]"
                />
              </div>
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
              <RadioGroup value={answers[q.id]} onValueChange={(val) => handleAnswer(q.id, val)}>
                {q.options.map((option: string) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                    <Label htmlFor={`${q.id}-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
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
