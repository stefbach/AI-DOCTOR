"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  User,
  Stethoscope,
  MessageSquare,
  Target,
  TestTube,
  Pill,
  FileText,
  Activity,
  AlertCircle,
} from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import ParaclinicalExams from "@/components/paraclinical-exams"
import MedicationPrescription from "@/components/medication-prescription"
import ConsultationReport from "@/components/consultation-report"

type Step = "patient" | "clinical" | "questions" | "diagnosis" | "exams" | "medications" | "report"

interface StepInfo {
  id: Step
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
}

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState<Step>("patient")
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [examsData, setExamsData] = useState<any>(null)
  const [medicationsData, setMedicationsData] = useState<any>(null)
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const steps: StepInfo[] = [
    {
      id: "patient",
      title: "Informations Patient",
      description: "Données démographiques et administratives",
      icon: <User className="h-5 w-5" />,
      completed: !!patientData,
    },
    {
      id: "clinical",
      title: "Examen Clinique",
      description: "Motif de consultation et examen physique",
      icon: <Stethoscope className="h-5 w-5" />,
      completed: !!clinicalData,
    },
    {
      id: "questions",
      title: "Anamnèse Dirigée",
      description: "Questions spécialisées par l'IA",
      icon: <MessageSquare className="h-5 w-5" />,
      completed: !!questionsData,
    },
    {
      id: "diagnosis",
      title: "Diagnostic IA",
      description: "Génération du diagnostic par intelligence artificielle",
      icon: <Target className="h-5 w-5" />,
      completed: !!diagnosisData,
    },
    {
      id: "exams",
      title: "Examens Paracliniques",
      description: "Prescriptions et examens complémentaires",
      icon: <TestTube className="h-5 w-5" />,
      completed: !!examsData,
    },
    {
      id: "medications",
      title: "Prescriptions Médicamenteuses",
      description: "Ordonnances et traitements médicamenteux",
      icon: <Pill className="h-5 w-5" />,
      completed: !!medicationsData,
    },
    {
      id: "report",
      title: "Compte-rendu",
      description: "Synthèse et documents médicaux",
      icon: <FileText className="h-5 w-5" />,
      completed: false,
    },
  ]

  const getCurrentStepIndex = () => steps.findIndex((step) => step.id === currentStep)
  const getProgress = () => ((getCurrentStepIndex() + 1) / steps.length) * 100

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id)
    }
  }

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id)
    }
  }

  const handleStepClick = (stepId: Step) => {
    // Permettre la navigation uniquement vers les étapes précédentes ou la suivante
    const targetIndex = steps.findIndex((step) => step.id === stepId)
    const currentIndex = getCurrentStepIndex()

    if (targetIndex <= currentIndex + 1) {
      setCurrentStep(stepId)
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "patient":
        return (
          <PatientForm
            onNext={(data) => {
              setPatientData(data)
              handleNext()
            }}
            initialData={patientData}
          />
        )
      case "clinical":
        return (
          <ClinicalForm
            patientData={patientData}
            onNext={(data) => {
              setClinicalData(data)
              handleNext()
            }}
            onBack={handleBack}
            initialData={clinicalData}
          />
        )
      case "questions":
        return (
          <QuestionsForm
            patientData={patientData}
            clinicalData={clinicalData}
            onNext={(data) => {
              setQuestionsData(data)
              handleNext()
            }}
            onBack={handleBack}
            initialData={questionsData}
          />
        )
      case "diagnosis":
        return (
          <DiagnosisForm
            patientData={patientData}
            clinicalData={clinicalData}
            questionsData={questionsData}
            onNext={(data) => {
              setDiagnosisData(data)
              handleNext()
            }}
            onBack={handleBack}
          />
        )
      case "exams":
        return (
          <ParaclinicalExams
            patientData={patientData}
            clinicalData={clinicalData}
            questionsData={questionsData}
            diagnosisData={diagnosisData}
            onNext={(data) => {
              setExamsData(data)
              handleNext()
            }}
            onBack={handleBack}
          />
        )
      case "medications":
        return (
          <MedicationPrescription
            patientData={patientData}
            clinicalData={clinicalData}
            questionsData={questionsData}
            diagnosisData={diagnosisData}
            examsData={examsData}
            onNext={(data) => {
              setMedicationsData(data)
              handleNext()
            }}
            onBack={handleBack}
          />
        )
      case "report":
        return (
          <ConsultationReport
            patientData={patientData}
            clinicalData={clinicalData}
            questionsData={questionsData}
            diagnosisData={diagnosisData}
            examsData={examsData}
            medicationsData={medicationsData}
            onBack={handleBack}
            onComplete={() => {
              // Logique de finalisation
              console.log("Consultation terminée")
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Medical AI Expert</h1>
                <p className="text-sm text-gray-500">Assistant médical intelligent</p>
              </div>
            </div>

            {/* Statut API */}
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  apiStatus === "success"
                    ? "bg-green-500"
                    : apiStatus === "error"
                      ? "bg-red-500"
                      : apiStatus === "loading"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                }`}
              />
              <span className="text-sm text-gray-600">
                {apiStatus === "success"
                  ? "API Connectée"
                  : apiStatus === "error"
                    ? "Erreur API"
                    : apiStatus === "loading"
                      ? "Connexion..."
                      : "API Prête"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Navigation des étapes */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progression</CardTitle>
                <Progress value={getProgress()} className="w-full" />
                <p className="text-sm text-gray-600">
                  Étape {getCurrentStepIndex() + 1} sur {steps.length}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentStep === step.id
                        ? "bg-blue-100 border-2 border-blue-500"
                        : step.completed
                          ? "bg-green-50 border border-green-200 hover:bg-green-100"
                          : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    } ${index > getCurrentStepIndex() + 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    disabled={index > getCurrentStepIndex() + 1}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-1 rounded ${
                          currentStep === step.id
                            ? "bg-blue-600 text-white"
                            : step.completed
                              ? "bg-green-600 text-white"
                              : "bg-gray-400 text-white"
                        }`}
                      >
                        {step.completed ? <CheckCircle className="h-4 w-4" /> : step.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            currentStep === step.id ? "text-blue-900" : "text-gray-900"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className={`text-xs ${currentStep === step.id ? "text-blue-700" : "text-gray-500"}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Informations patient (si disponibles) */}
            {patientData && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Patient Actuel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="font-medium">
                      {patientData.firstName} {patientData.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{patientData.age} ans</p>
                  </div>
                  {patientData.socialSecurityNumber && (
                    <p className="text-xs text-gray-500">N° SS: {patientData.socialSecurityNumber}</p>
                  )}
                  {diagnosisData && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-medium text-blue-600">Diagnostic:</p>
                      <p className="text-xs text-gray-600">{diagnosisData.primaryDiagnosis?.condition}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">{renderCurrentStep()}</CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Messages d'erreur globaux */}
      {apiStatus === "error" && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur de connexion à l'API. Certaines fonctionnalités peuvent être limitées.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
