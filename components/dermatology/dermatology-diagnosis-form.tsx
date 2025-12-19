"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Loader2, Brain } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Props {
  patientData: any
  imageData: any
  ocrAnalysisData: any
  questionsData: any
  onNext: (data: any) => void
  onBack: () => void
}

export default function DermatologyDiagnosisForm(props: Props) {
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editedDiagnosis, setEditedDiagnosis] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const startProgressSimulation = () => {
    setProgress(0)
    setProgressMessage('Analyzing skin condition images...')

    const stages = [
      { progress: 15, message: 'Analyzing skin condition images...' },
      { progress: 30, message: 'Processing patient history...' },
      { progress: 45, message: 'Evaluating symptoms and patterns...' },
      { progress: 60, message: 'Generating differential diagnosis...' },
      { progress: 75, message: 'Creating treatment recommendations...' },
      { progress: 85, message: 'Finalizing diagnosis report...' },
    ]

    let stageIndex = 0
    progressInterval.current = setInterval(() => {
      if (stageIndex < stages.length) {
        setProgress(stages[stageIndex].progress)
        setProgressMessage(stages[stageIndex].message)
        stageIndex++
      }
    }, 3000) // Change stage every 3 seconds
  }

  const stopProgressSimulation = (success: boolean) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    if (success) {
      setProgress(100)
      setProgressMessage('Diagnosis complete!')
    }
  }

  const generateDiagnosis = async () => {
    setIsGenerating(true)
    startProgressSimulation()

    try {
      const response = await fetch('/api/dermatology-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props)
      })
      const data = await response.json()
      stopProgressSimulation(true)

      // Small delay to show 100% before transitioning
      await new Promise(resolve => setTimeout(resolve, 500))

      setDiagnosis(data)
      setEditedDiagnosis(data.diagnosis?.fullText || '')
      toast({ title: "Success", description: "Diagnosis generated successfully" })
    } catch (error) {
      stopProgressSimulation(false)
      toast({ title: "Error", description: "Failed to generate diagnosis", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  // Auto-generate diagnosis on component mount
  useEffect(() => {
    if (!diagnosis && !isGenerating) {
      generateDiagnosis()
    }

    // Cleanup interval on unmount
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {!diagnosis ? (
        <Card className="border-teal-200">
          <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Dermatology AI Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-md space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{progressMessage}</span>
                  <span className="font-medium text-teal-600">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                <span>Generating AI Diagnosis...</span>
              </div>

              <p className="text-xs text-gray-400 text-center max-w-sm">
                Our AI is analyzing the skin condition images and patient data to provide a comprehensive diagnosis.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-teal-200">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle>Dermatological Diagnosis</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea value={editedDiagnosis} onChange={(e) => setEditedDiagnosis(e.target.value)} className="min-h-[400px] font-mono text-sm" />
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={props.onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            <Button onClick={() => props.onNext({ ...diagnosis, diagnosis: { ...diagnosis.diagnosis, fullText: editedDiagnosis } })} className="bg-gradient-to-r from-teal-600 to-cyan-600">
              Continue to Report<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
