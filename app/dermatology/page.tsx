"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Camera,
  Image as ImageIcon,
  Brain,
  FileSignature,
  ArrowLeft,
  ClipboardList,
  User
} from "lucide-react"
import { useRouter } from "next/navigation"

// Import dermatology specific components
import DermatologyImageUpload from "@/components/dermatology/dermatology-image-upload"
import DermatologyQuestionsForm from "@/components/dermatology/dermatology-questions-form"
import DermatologyDiagnosisForm from "@/components/dermatology/dermatology-diagnosis-form"
import DermatologyProfessionalReport from "@/components/dermatology/dermatology-professional-report"
import PatientForm from "@/components/patient-form"

export default function DermatologyWorkflow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [imageData, setImageData] = useState<any>(null)
  const [ocrAnalysisData, setOcrAnalysisData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [isExistingPatient, setIsExistingPatient] = useState(false)

  // Load patient data from sessionStorage
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('dermatologyPatientData')
    const isDermatologyWorkflow = sessionStorage.getItem('isDermatologyWorkflow')
    const existingPatient = sessionStorage.getItem('isExistingPatientDermatology')
    
    if (!savedPatientData || isDermatologyWorkflow !== 'true') {
      // Redirect back to consultation hub if no dermatology data
      console.log('❌ No dermatology patient data found, redirecting to consultation hub')
      router.push('/consultation-hub')
      return
    }
    
    try {
      const data = JSON.parse(savedPatientData)
      setPatientData(data)
      setIsExistingPatient(existingPatient === 'true')
      console.log('✅ Dermatology patient data loaded:', data)
      console.log('👤 Existing patient:', existingPatient === 'true')
      
      // Clean up the flag after reading
      sessionStorage.removeItem('isExistingPatientDermatology')
    } catch (error) {
      console.error('Error parsing patient data:', error)
      router.push('/consultation-hub')
    }
  }, [router])

  const handleBackToHome = () => {
    // Clear dermatology workflow data
    sessionStorage.removeItem('dermatologyPatientData')
    sessionStorage.removeItem('isDermatologyWorkflow')
    router.push('/')
  }

  const handleStepClick = (index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index)
    }
  }

  const steps = [
    {
      icon: User,
      title: "Patient Information",
      description: "Patient details & history",
      status: currentStep === 0 ? "current" : currentStep > 0 ? "complete" : "upcoming"
    },
    {
      icon: Camera,
      title: "Image Upload",
      description: "Upload skin condition photos",
      status: currentStep === 1 ? "current" : currentStep > 1 ? "complete" : "upcoming"
    },
    {
      icon: ClipboardList,
      title: "AI Analysis Questions",
      description: "Dermatology-specific questions",
      status: currentStep === 2 ? "current" : currentStep > 2 ? "complete" : "upcoming"
    },
    {
      icon: Brain,
      title: "Dermatology Diagnosis",
      description: "AI-powered skin condition analysis",
      status: currentStep === 3 ? "current" : currentStep > 3 ? "complete" : "upcoming"
    },
    {
      icon: FileSignature,
      title: "Professional Report",
      description: "Treatment plan & recommendations",
      status: currentStep === 4 ? "current" : currentStep > 4 ? "complete" : "upcoming"
    }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  if (!patientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <Card className="glass-card w-full max-w-md shadow-2xl border-0">
          <CardContent className="p-6">
            <p className="text-center">Loading dermatology workflow...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Modern Header with Gradient */}
      <div className="gradient-accent text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/tibok-logo.svg" 
                alt="TIBOK Logo" 
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Dermatology Consultation
                </h1>
                <p className="text-cyan-100 text-sm">AI-Powered Skin Analysis & Diagnosis</p>
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

        {/* Patient Info Banner */}
        <Card className="glass-card mb-6 shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Patient</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {patientData.firstName} {patientData.lastName}
                </p>
              </div>
              <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 shadow-md">
                Consultation Dermatologie
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Existing Patient Banner */}
        {isExistingPatient && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">
                    👤 Patient Existant - Nouvelle Consultation Complète
                  </h4>
                  <p className="text-sm text-blue-800">
                    <strong>{patientData.firstName} {patientData.lastName}</strong> a déjà des consultations dans notre système.
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Cette consultation est pour un <strong>nouveau problème cutané</strong> avec analyse complète : 
                    Upload d'images → OCR Analysis → Questions IA → Diagnostic approfondi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <Card className="glass-card mb-6 shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Progression
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Analyse dermatologique</p>
              </div>
              <Badge className="gradient-accent text-white border-0 px-4 py-2 shadow-md">
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
                        ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl scale-105 step-active" 
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
                    <p className={`text-xs ${
                      step.status === "current" || step.status === "complete"
                        ? "text-white/80"
                        : "text-gray-600"
                    }`}>{step.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Step 0: Patient Information */}
          {currentStep === 0 && (
            <Card className="shadow-xl border-teal-200">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-6 w-6" />
                  Informations Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <PatientForm
                  data={patientData}
                  onDataChange={(data) => {
                    console.log('✅ Patient data updated:', data)
                    setPatientData(data)
                  }}
                  onNext={() => {
                    console.log('✅ Patient info completed, moving to image upload')
                    setCurrentStep(1)
                  }}
                  language="fr"
                  workflowType="dermatology"
                />
              </CardContent>
            </Card>
          )}

          {/* Step 1: Image Upload */}
          {currentStep === 1 && (
            <Card className="shadow-xl border-teal-200">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-6 w-6" />
                  Upload Skin Condition Images
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DermatologyImageUpload
                  patientData={patientData}
                  onNext={(data) => {
                    console.log('✅ Image data captured:', data)
                    setImageData(data.images)
                    setOcrAnalysisData(data.ocrAnalysis)
                    setCurrentStep(2)
                  }}
                  onBack={() => setCurrentStep(0)}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: AI Analysis Questions */}
          {currentStep === 2 && (
            <Card className="shadow-xl border-teal-200">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-6 w-6" />
                  AI Dermatology Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DermatologyQuestionsForm
                  patientData={patientData}
                  imageData={imageData}
                  ocrAnalysisData={ocrAnalysisData}
                  onNext={(data) => {
                    console.log('✅ Questions answered:', data)
                    setQuestionsData(data)
                    setCurrentStep(3)
                  }}
                  onBack={() => setCurrentStep(1)}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Dermatology Diagnosis */}
          {currentStep === 3 && (
            <Card className="shadow-xl border-teal-200">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-6 w-6" />
                  Dermatology AI Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DermatologyDiagnosisForm
                  patientData={patientData}
                  imageData={imageData}
                  ocrAnalysisData={ocrAnalysisData}
                  questionsData={questionsData}
                  onNext={(data) => {
                    console.log('✅ Diagnosis generated:', data)
                    console.log('🔍 CRITICAL: diagnosisData keys:', Object.keys(data || {}))
                    console.log('🔍 CRITICAL: expertAnalysis exists?:', !!data?.expertAnalysis)
                    console.log('🔍 CRITICAL: medications exists?:', !!data?.medications)
                    if (data?.expertAnalysis) {
                      console.log('🔍 CRITICAL: expertAnalysis content:', JSON.stringify(data.expertAnalysis, null, 2))
                    }
                    setDiagnosisData(data)
                    setCurrentStep(4)
                  }}
                  onBack={() => setCurrentStep(2)}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 4: Professional Report */}
          {currentStep === 4 && (
            <Card className="shadow-xl border-teal-200">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-6 w-6" />
                  Professional Dermatology Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DermatologyProfessionalReport
                  patientData={patientData}
                  imageData={imageData}
                  ocrAnalysisData={ocrAnalysisData}
                  questionsData={questionsData}
                  diagnosisData={diagnosisData}
                  onComplete={handleBackToHome}
                />
                <div className="mt-4 flex justify-start">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
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
