"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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

  const generateDiagnosis = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/dermatology-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props)
      })
      const data = await response.json()
      setDiagnosis(data)
      setEditedDiagnosis(data.diagnosis?.fullText || '')
      toast({ title: "Success", description: "Diagnosis generated successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate diagnosis", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {!diagnosis ? (
        <div className="text-center py-12">
          <Button onClick={generateDiagnosis} disabled={isGenerating} size="lg" className="bg-gradient-to-r from-teal-600 to-cyan-600">
            {isGenerating ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generating Diagnosis...</> : <><Brain className="h-5 w-5 mr-2" />Generate AI Diagnosis</>}
          </Button>
        </div>
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
