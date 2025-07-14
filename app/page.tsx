"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Stethoscope,
  MessageSquare,
  Brain,
  FileText,
  Pill,
  ClipboardList,
  CheckCircle,
  ArrowRight,
} from "lucide-react"

// Import des composants fonctionnels
import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import ParaclinicalExams from "@/components/paraclinical-exams"
import MedicationPrescription from "@/components/medication-prescription"
import ConsultationReport from "@/components/consultation-report"
import SystemCheck from "@/components/system-check"
import TestCases from "@/components/test-cases"

type Step = "patient" | "clinical" | "questions" | "diagnosis" | "exams" | "prescription" | "report"

interface FormData {
  patientData?: any
  clinicalData?: any
  questionsData?: any
  diagnosisData?: any
  examsData?: any
  prescriptionData?: any
  reportData?: any
}

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState<Step>("patient")
  const [formData, setFormData] = useState<FormData>({})
  const [activeTab, setActiveTab] = useState("workflow")

  // ✅ Configuration stable avec useMemo
  const steps = useMemo(() => [
    { id: "patient", label: "Patient", icon: User, completed: !!formData.patientData },
    { id: "clinical", label: "Examen Clinique", icon: Stethoscope, completed: !!formData.clinicalData },
    { id: "questions", label: "Questions IA", icon: MessageSquare, completed: !!formData.questionsData },
    { id: "diagnosis", label: "Diagnostic IA", icon: Brain, completed: !!formData.diagnosisData },
    { id: "exams", label: "Examens", icon: FileText, completed: !!formData.examsData },
    { id: "prescription", label: "Prescription", icon: Pill, completed: !!formData.prescriptionData },
    { id: "report", label: "Rapport", icon: ClipboardList, completed: !!formData.reportData },
  ], [formData])

  // ✅ Fonction stable avec useCallback - CORRECTION PRINCIPALE
  const handleStepData = useCallback((stepId: Step, data: any) => {
    console.log(`📝 Updating ${stepId} data:`, data)
    setFormData((prev) => ({ ...prev, [`${stepId}Data`]: data }))
  }, [])

  // ✅ Fonctions navigation stables
  const handleNext = useCallback(() => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as Step)
    }
  }, [currentStep, steps])

  const handlePrevious = useCallback(() => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step)
    }
  }, [currentStep, steps])

  // ✅ Fonctions utilitaires stables
  const getStepProgress = useCallback(() => {
    const completedSteps = steps.filter((step) => step.completed).length
    return (completedSteps / steps.length) * 100
  }, [steps])

  const getCurrentStepIndex = useCallback(() => {
    return steps.findIndex((step) => step.id === currentStep)
  }, [currentStep, steps])

  // ✅ Callback pour changement d'étape stable
  const handleStepChange = useCallback((stepId: Step) => {
    setCurrentStep(stepId)
  }, [])

  // ✅ Props communes stables avec useMemo - CORRECTION IMPORTANTE
  const commonProps = useMemo(() => ({
    data: formData[`${currentStep}Data`],
    allData: formData,
    onDataChange: (data: any) => handleStepData(currentStep, data),
    onNext: handleNext,
    onPrevious: handlePrevious,
  }), [formData, currentStep, handleStepData, handleNext, handlePrevious])

  // ✅ Rendu step courant stable
  const renderCurrentStep = useCallback(() => {
    switch (currentStep) {
      case "patient":
        return <PatientForm {...commonProps} />
      case "clinical":
        return <ClinicalForm {...commonProps} />
      case "questions":
        return <QuestionsForm {...commonProps} />
      case "diagnosis":
        return <DiagnosisForm {...commonProps} />
      case "exams":
        return <ParaclinicalExams {...commonProps} />
      case "prescription":
        return <MedicationPrescription {...commonProps} />
      case "report":
        return <ConsultationReport {...commonProps} />
      default:
        return <PatientForm {...commonProps} />
    }
  }, [currentStep, commonProps])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Medical AI Expert</h1>
          <p className="text-gray-600">Assistant médical intelligent avec intégration OpenAI, FDA, RxNorm et PubMed</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflow">Workflow Médical</TabsTrigger>
            <TabsTrigger value="system">Vérification Système</TabsTrigger>
            <TabsTrigger value="tests">Tests Cliniques</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-6">
            {/* Progress Bar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Progression du Workflow</span>
                  <Badge variant="outline">{Math.round(getStepProgress())}% Complété</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={getStepProgress()} className="mb-4" />
                <div className="flex flex-wrap gap-2">
                  {steps.map((step, index) => {
                    const Icon = step.icon
                    const isActive = step.id === currentStep
                    const isCompleted = step.completed

                    return (
                      <Button
                        key={step.id}
                        variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleStepChange(step.id as Step)}
                        className={`flex items-center gap-2 ${isActive ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      >
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        {step.label}
                        {index < steps.length - 1 && !isActive && <ArrowRight className="h-3 w-3 opacity-50" />}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Current Step Content */}
            <div className="min-h-[600px]">{renderCurrentStep()}</div>
          </TabsContent>

          <TabsContent value="system">
            <SystemCheck />
          </TabsContent>

          <TabsContent value="tests">
            <TestCases />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
