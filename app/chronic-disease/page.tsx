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
  ArrowLeft,
  User
} from "lucide-react"
import { useRouter } from "next/navigation"

// Import patient form (shared with normal consultation)
import PatientForm from "@/components/patient-form"
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
  const [isExistingPatient, setIsExistingPatient] = useState(false)
  const [chronicHistory, setChronicHistory] = useState<any[]>([])

  // Load patient data from sessionStorage
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('chronicDiseasePatientData')
    const isChronicWorkflow = sessionStorage.getItem('isChronicDiseaseWorkflow')
    const existingPatient = sessionStorage.getItem('isExistingPatientChronic')
    const history = sessionStorage.getItem('chronicDiseaseHistory')

    // Check if we're in a test environment
    const isTestEnvironment = typeof window !== 'undefined' && (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    )

    if (!savedPatientData || isChronicWorkflow !== 'true') {
      // If in test environment and no data, use test data instead of redirecting
      if (isTestEnvironment) {
        console.log('🧪 No patient data found in test environment - using TEST data')
        const testData = {
          firstName: 'Megane',
          lastName: 'Quenette',
          email: 'megane-quenette@obesity-care-clinic.com',
          phone: '+23059452424',
          birthDate: '1980-03-17',
          age: '45',
          gender: 'Female',
          weight: '150',
          height: '120',
          address: 'Ave des Lataniers, Morc St Jacques',
          city: 'Flic en Flac',
          country: 'Maurice',
          medicalHistory: ['Obesity'],
          allergies: [],
          consultationId: '94cf134b-32bc-49a1-8168-37f85355e27d',
          patientId: '4c42a303-ee2e-49ad-b156-8348f75c1375',
          doctorId: 'e152c622-abe3-410e-a0ff-75902edaf739',
          pregnancyStatus: 'not_pregnant',
          currentMedicationsText: ''
        }
        sessionStorage.setItem('chronicDiseasePatientData', JSON.stringify(testData))
        sessionStorage.setItem('isChronicDiseaseWorkflow', 'true')
        setPatientData(testData)

        // Also set test clinical and diagnosis data, and skip to report step
        const testClinicalData = {
          chiefComplaint: 'Chronic disease follow-up',
          chronicDiseases: ['Obesity'],
          currentSymptoms: ['Fatigue'],
          visitReasons: ['Follow-up'],
          vitalSigns: {
            bloodPressureSystolic: '140',
            bloodPressureDiastolic: '90',
            bloodPressure: '140/90',
            heartRate: '80',
            bloodGlucose: '5.5',
            temperature: '37'
          }
        }

        const testDiagnosisData = {
          overallAssessment: {
            globalControl: 'Fair',
            mainConcerns: ['Obesity management'],
            priorityActions: ['Weight loss program']
          },
          detailedMealPlan: {
            breakfast: {},
            lunch: {},
            dinner: {},
            snacks: {},
            hydration: '2 liters daily'
          }
        }

        setClinicalData(testClinicalData)
        setDiagnosisData(testDiagnosisData)
        setCurrentStep(4) // Skip directly to report (now step 4 after adding PatientForm)

        console.log('✅ Test patient data loaded:', testData)
        console.log('🧪 Auto-populated test clinical and diagnosis data, skipping to report')
        return
      }

      // Redirect back to consultation hub if no chronic disease data
      console.log('❌ No chronic disease patient data found, redirecting to consultation hub')
      router.push('/consultation-hub')
      return
    }

    try {
      const data = JSON.parse(savedPatientData)
      setPatientData(data)
      setIsExistingPatient(existingPatient === 'true')
      console.log('✅ Chronic disease patient data loaded:', data)
      console.log('👤 Existing patient:', existingPatient === 'true')

      if (history) {
        const parsedHistory = JSON.parse(history)
        setChronicHistory(parsedHistory)
        console.log('📋 Chronic history loaded:', parsedHistory.length, 'entries')
      }

      // Clean up flags after reading
      sessionStorage.removeItem('isExistingPatientChronic')
      sessionStorage.removeItem('chronicDiseaseHistory')
    } catch (error) {
      console.error('Error parsing patient data:', error)
      router.push('/consultation-hub')
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
      icon: User,
      title: "Patient Information",
      description: "Review and confirm patient details",
      status: currentStep === 0 ? "current" : currentStep > 0 ? "complete" : "upcoming"
    },
    {
      icon: Stethoscope,
      title: "Clinical Examination",
      description: "Chronic disease specific vitals & symptoms",
      status: currentStep === 1 ? "current" : currentStep > 1 ? "complete" : "upcoming"
    },
    {
      icon: ClipboardList,
      title: "AI Specialized Questions",
      description: "Chronic disease targeted questions",
      status: currentStep === 2 ? "current" : currentStep > 2 ? "complete" : "upcoming"
    },
    {
      icon: Brain,
      title: "Chronic Disease Analysis",
      description: "AI-powered chronic disease assessment",
      status: currentStep === 3 ? "current" : currentStep > 3 ? "complete" : "upcoming"
    },
    {
      icon: FileSignature,
      title: "Chronic Disease Report",
      description: "Follow-up plan & monitoring",
      status: currentStep === 4 ? "current" : currentStep > 4 ? "complete" : "upcoming"
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
              <img 
                src="/tibok-logo.svg" 
                alt="TIBOK Logo" 
                className="h-12 w-auto object-contain"
              />
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

        {/* Existing Patient with Chronic History Banner */}
        {isExistingPatient && chronicHistory.length > 0 && (
          <Card className="mb-6 bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-2">
                    🏥 Patient avec Historique de Maladies Chroniques
                  </h4>
                  <p className="text-sm text-amber-800 mb-2">
                    <strong>{patientData.firstName} {patientData.lastName}</strong> a les pathologies chroniques suivantes :
                  </p>
                  <ul className="space-y-1 mb-2">
                    {chronicHistory.map((c, i) => (
                      <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="text-amber-600">•</span>
                        <span>
                          <strong>{c.diagnosis}</strong> 
                          {c.date && (
                            <span className="text-xs text-amber-600 ml-1">
                              (diagnostiqué le {new Date(c.date).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
                    💡 <strong>Cette consultation est pour :</strong> Évaluer une nouvelle pathologie chronique ou réévaluation complète avec plan diététique personnalisé
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          {/* Step 0: Patient Information */}
          {currentStep === 0 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-6 w-6" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <PatientForm
                  data={patientData}
                  onDataChange={(data) => {
                    console.log('✅ Patient data updated:', data)
                    // Merge new data with existing patientData to preserve IDs
                    setPatientData((prev: any) => ({
                      ...prev,
                      ...data,
                      // Ensure IDs are preserved
                      consultationId: prev?.consultationId || data.consultationId,
                      patientId: prev?.patientId || data.patientId,
                      doctorId: prev?.doctorId || data.doctorId
                    }))
                    // Update sessionStorage with merged data
                    const updatedData = {
                      ...patientData,
                      ...data,
                      consultationId: patientData?.consultationId || data.consultationId,
                      patientId: patientData?.patientId || data.patientId,
                      doctorId: patientData?.doctorId || data.doctorId
                    }
                    sessionStorage.setItem('chronicDiseasePatientData', JSON.stringify(updatedData))
                  }}
                  onNext={() => setCurrentStep(1)}
                  workflowType="chronic"
                />
              </CardContent>
            </Card>
          )}

          {/* Step 1: Clinical Examination */}
          {currentStep === 1 && (
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
                    setCurrentStep(2)
                  }}
                  onBack={() => setCurrentStep(0)}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: AI Questions */}
          {currentStep === 2 && (
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
                    setCurrentStep(3)
                  }}
                  onBack={() => setCurrentStep(1)}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Diagnosis/Analysis */}
          {currentStep === 3 && (
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
                    setCurrentStep(4)
                  }}
                  onBack={() => setCurrentStep(2)}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 4: Professional Report */}
          {currentStep === 4 && (
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
