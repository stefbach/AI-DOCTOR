"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity,
  Stethoscope,
  ClipboardList,
  Brain,
  FileSignature,
  ArrowLeft
} from "lucide-react"
import { useRouter } from "next/navigation"

// Import chronic disease specific components (to be created)
// import ChronicClinicalForm from "@/components/chronic-disease/chronic-clinical-form"
// import ChronicQuestionsForm from "@/components/chronic-disease/chronic-questions-form"
// import ChronicDiagnosisForm from "@/components/chronic-disease/chronic-diagnosis-form"
// import ChronicReport from "@/components/chronic-disease/chronic-report"

export default function ChronicDiseaseWorkflow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Load patient data from sessionStorage
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('chronicDiseasePatientData')
    const isChronicWorkflow = sessionStorage.getItem('isChronicDiseaseWorkflow')
    
    if (!savedPatientData || isChronicWorkflow !== 'true') {
      // Redirect back to home if no chronic disease data
      console.log('❌ No chronic disease patient data found, redirecting to home')
      router.push('/')
      return
    }
    
    try {
      const data = JSON.parse(savedPatientData)
      setPatientData(data)
      console.log('✅ Chronic disease patient data loaded:', data)
    } catch (error) {
      console.error('Error parsing patient data:', error)
      router.push('/')
    }
  }, [router])

  const handleBackToHome = () => {
    // Clear chronic disease workflow data
    sessionStorage.removeItem('chronicDiseasePatientData')
    sessionStorage.removeItem('isChronicDiseaseWorkflow')
    router.push('/')
  }

  const handleStepClick = (index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index)
    }
  }

  const steps = [
    {
      icon: Stethoscope,
      title: "Clinical Examination",
      description: "Chronic disease specific vitals & symptoms",
      status: currentStep === 0 ? "current" : currentStep > 0 ? "complete" : "upcoming"
    },
    {
      icon: ClipboardList,
      title: "AI Specialized Questions",
      description: "Chronic disease targeted questions",
      status: currentStep === 1 ? "current" : currentStep > 1 ? "complete" : "upcoming"
    },
    {
      icon: Brain,
      title: "Chronic Disease Analysis",
      description: "AI-powered chronic disease assessment",
      status: currentStep === 2 ? "current" : currentStep > 2 ? "complete" : "upcoming"
    },
    {
      icon: FileSignature,
      title: "Chronic Disease Report",
      description: "Follow-up plan & monitoring",
      status: currentStep === 3 ? "current" : currentStep > 3 ? "complete" : "upcoming"
    }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  if (!patientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center">Loading chronic disease workflow...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-800">
                Chronic Disease Management
              </h1>
            </div>
            <p className="text-gray-600">
              Specialized workflow for chronic disease follow-up
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleBackToHome}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Normal Workflow
          </Button>
        </div>

        {/* Patient Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-800 font-medium">Patient</p>
                <p className="text-lg font-bold text-purple-900">
                  {patientData.firstName} {patientData.lastName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-800 font-medium">Chronic Diseases Detected</p>
                <div className="flex gap-2 mt-1">
                  {patientData.medicalHistory.map((condition: string, idx: number) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="bg-purple-200 text-purple-900"
                    >
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="mb-6 shadow-lg border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Progress</CardTitle>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Step {currentStep + 1} of {steps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div
                    key={index}
                    onClick={() => handleStepClick(index)}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer
                      ${step.status === "current" 
                        ? "border-purple-500 bg-purple-50 shadow-md" 
                        : step.status === "complete" 
                        ? "border-green-300 bg-green-50 cursor-pointer hover:shadow-md" 
                        : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon
                        className={`h-5 w-5 ${
                          step.status === "current"
                            ? "text-purple-600"
                            : step.status === "complete"
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      />
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                    </div>
                    <p className="text-xs text-gray-600">{step.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="space-y-6">
          {currentStep === 0 && (
            <Card className="shadow-xl border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-6 w-6" />
                  Chronic Disease Clinical Examination
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-center text-gray-600 py-12">
                  Chronic Clinical Form Component (To be implemented)
                </p>
                <div className="flex justify-end gap-4 mt-6">
                  <Button onClick={handleBackToHome} variant="outline">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(1)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Continue to AI Questions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card className="shadow-xl border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-6 w-6" />
                  AI Specialized Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-center text-gray-600 py-12">
                  Chronic Questions Form Component (To be implemented)
                </p>
                <div className="flex justify-between mt-6">
                  <Button onClick={() => setCurrentStep(0)} variant="outline">
                    Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(2)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Continue to Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="shadow-xl border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-6 w-6" />
                  Chronic Disease Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-center text-gray-600 py-12">
                  Chronic Diagnosis Form Component (To be implemented)
                </p>
                <div className="flex justify-between mt-6">
                  <Button onClick={() => setCurrentStep(1)} variant="outline">
                    Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(3)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="shadow-xl border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-6 w-6" />
                  Chronic Disease Follow-Up Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-center text-gray-600 py-12">
                  Chronic Report Component (To be implemented)
                </p>
                <div className="flex justify-between mt-6">
                  <Button onClick={() => setCurrentStep(2)} variant="outline">
                    Back
                  </Button>
                  <Button 
                    onClick={handleBackToHome}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete & Return to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
