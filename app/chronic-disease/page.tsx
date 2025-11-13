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

// Import chronic disease specific components
import ChronicClinicalForm from "@/components/chronic-disease/chronic-clinical-form"
import ChronicQuestionsForm from "@/components/chronic-disease/chronic-questions-form"
import ChronicDiagnosisForm from "@/components/chronic-disease/chronic-diagnosis-form"
import ChronicProfessionalReport from "@/components/chronic-disease/chronic-professional-report"

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <Card className="glass-card w-full max-w-md shadow-2xl border-0">
          <CardContent className="p-6">
            <p className="text-center">Loading chronic disease workflow...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Modern Header with Gradient */}
      <div className="gradient-secondary text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="h-8 w-8 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Gestion des Maladies Chroniques
                </h1>
                <p className="text-teal-100 text-sm">Suivi spécialisé et plan de traitement</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleBackToHome}
              className="flex items-center gap-2 bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Patient Info Banner - Modern Design */}
        <Card className="glass-card mb-6 shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-500 h-2"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Patient</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-600 bg-clip-text text-transparent">
                  {patientData.firstName} {patientData.lastName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground font-medium mb-2">Maladies Chroniques</p>
                <div className="flex gap-2 flex-wrap justify-end">
                  {patientData.medicalHistory.map((condition: string, idx: number) => (
                    <Badge 
                      key={idx} 
                      className="bg-gradient-to-r from-teal-500 to-teal-500 text-white border-0 shadow-md"
                    >
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress - Modern Design */}
        <Card className="glass-card mb-6 shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Progression
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Suivi de votre consultation</p>
              </div>
              <Badge className="gradient-secondary text-white border-0 px-4 py-2 shadow-md">
                Étape {currentStep + 1}/{steps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Progress value={progress} className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div
                    key={index}
                    onClick={() => handleStepClick(index)}
                    className={`p-5 rounded-xl smooth-transition cursor-pointer transform
                      ${step.status === "current" 
                        ? "bg-gradient-to-br from-teal-500 to-teal-500 text-white shadow-xl scale-105 step-active" 
                        : step.status === "complete" 
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg hover:scale-105 hover:shadow-xl" 
                        : "bg-white/50 backdrop-blur-sm border-2 border-gray-200 opacity-70 cursor-not-allowed"}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                        ${step.status === "current" || step.status === "complete"
                          ? "bg-white/20 backdrop-blur-sm"
                          : "bg-gray-200"
                        }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-sm flex-1">{step.title}</h3>
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
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-6 w-6" />
                  Chronic Disease Clinical Examination
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ChronicClinicalForm
                  patientData={patientData}
                  onNext={(data) => {
                    console.log('✅ Clinical data captured:', data)
                    setClinicalData(data)
                    setCurrentStep(1)
                  }}
                  onBack={handleBackToHome}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-6 w-6" />
                  AI Specialized Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ChronicQuestionsForm
                  patientData={patientData}
                  clinicalData={clinicalData}
                  onNext={(data) => {
                    console.log('✅ Questions answered:', data)
                    setQuestionsData(data)
                    setCurrentStep(2)
                  }}
                  onBack={() => setCurrentStep(0)}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-6 w-6" />
                  Chronic Disease Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ChronicDiagnosisForm
                  patientData={patientData}
                  clinicalData={clinicalData}
                  questionsData={questionsData}
                  onNext={(data) => {
                    console.log('✅ Diagnosis generated:', data)
                    setDiagnosisData(data)
                    setCurrentStep(3)
                  }}
                  onBack={() => setCurrentStep(1)}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-6 w-6" />
                  Professional Chronic Disease Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ChronicProfessionalReport
                  patientData={patientData}
                  clinicalData={clinicalData}
                  questionsData={questionsData}
                  diagnosisData={diagnosisData}
                  onComplete={handleBackToHome}
                />
                <div className="mt-4 flex justify-start">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(2)}
                  >
                    Back to Diagnosis
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
