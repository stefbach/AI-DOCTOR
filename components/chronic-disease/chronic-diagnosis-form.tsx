"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Loader2, Activity, Heart, TrendingUp } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ChronicDiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onNext: (data: any) => void
  onBack: () => void
}

export default function ChronicDiagnosisForm({ 
  patientData, 
  clinicalData, 
  questionsData, 
  onNext, 
  onBack 
}: ChronicDiagnosisFormProps) {
  const [assessment, setAssessment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    generateAssessment()
  }, [])

  const generateAssessment = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/chronic-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientData, clinicalData, questionsData })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate assessment: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.assessment) {
        setAssessment(data.assessment)
        toast({
          title: "✅ AI Analysis Complete",
          description: "Chronic disease assessment generated successfully"
        })
      } else {
        throw new Error(data.error || "Failed to generate assessment")
      }
    } catch (err: any) {
      console.error("Error generating assessment:", err)
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to generate assessment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    onNext(assessment)
  }

  if (loading) {
    return (
      <Card className="border-purple-200">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-lg text-gray-600">Analyzing chronic disease status...</p>
          <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
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
            <Button onClick={generateAssessment}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!assessment) return null

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Overall Chronic Disease Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Disease Control Status:</Label>
              <Badge className="ml-2" variant={
                assessment.overallAssessment?.diseaseControl === "Excellent" ? "default" :
                assessment.overallAssessment?.diseaseControl === "Good" ? "secondary" : "destructive"
              }>
                {assessment.overallAssessment?.diseaseControl || "Under Review"}
              </Badge>
            </div>
            {assessment.overallAssessment?.complications?.length > 0 && (
              <div>
                <Label className="font-semibold">Complications/Concerns:</Label>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {assessment.overallAssessment.complications.map((comp: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-700">{comp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diabetes Assessment */}
      {assessment.chronicDiseaseAssessment?.diabetes?.present && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Activity className="h-5 w-5" />
              Diabetes Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Control Status:</Label>
                <Badge variant="secondary">{assessment.chronicDiseaseAssessment.diabetes.controlStatus}</Badge>
              </div>
              <div>
                <Label className="text-sm text-gray-600">HbA1c:</Label>
                <p className="font-medium">{assessment.chronicDiseaseAssessment.diabetes.currentHbA1c}</p>
              </div>
            </div>
            {assessment.chronicDiseaseAssessment.diabetes.medicationChanges && (
              <div className="mt-4">
                <Label className="font-semibold">Medication Recommendations:</Label>
                <p className="text-sm mt-1">{assessment.chronicDiseaseAssessment.diabetes.medicationChanges}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hypertension Assessment */}
      {assessment.chronicDiseaseAssessment?.hypertension?.present && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Heart className="h-5 w-5" />
              Hypertension Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Control Status:</Label>
                <Badge variant="secondary">{assessment.chronicDiseaseAssessment.hypertension.controlStatus}</Badge>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Current BP:</Label>
                <p className="font-medium">{assessment.chronicDiseaseAssessment.hypertension.currentBP}</p>
              </div>
            </div>
            {assessment.chronicDiseaseAssessment.hypertension.medicationChanges && (
              <div className="mt-4">
                <Label className="font-semibold">Medication Recommendations:</Label>
                <p className="text-sm mt-1">{assessment.chronicDiseaseAssessment.hypertension.medicationChanges}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Treatment Plan */}
      {assessment.treatmentPlan && (
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <TrendingUp className="h-5 w-5" />
              Treatment & Lifestyle Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {assessment.treatmentPlan.lifestyle?.diet && (
              <div>
                <Label className="font-semibold">Dietary Recommendations:</Label>
                <p className="text-sm mt-1">{assessment.treatmentPlan.lifestyle.diet}</p>
              </div>
            )}
            {assessment.treatmentPlan.lifestyle?.exercise && (
              <div>
                <Label className="font-semibold">Exercise Plan:</Label>
                <p className="text-sm mt-1">{assessment.treatmentPlan.lifestyle.exercise}</p>
              </div>
            )}
            {assessment.treatmentPlan.monitoring?.labTests?.length > 0 && (
              <div>
                <Label className="font-semibold">Laboratory Monitoring:</Label>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {assessment.treatmentPlan.monitoring.labTests.map((test: any, idx: number) => (
                    <li key={idx} className="text-sm">{test}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
        >
          Generate Report
        </Button>
      </div>
    </div>
  )
}

function Label({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}>{children}</label>
}
