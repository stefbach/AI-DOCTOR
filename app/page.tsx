"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, User, ClipboardList, Brain, FileText, Activity } from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import MedicalWorkflowManager from "@/components/medical-workflow-manager"
import IntegratedMedicalConsultation from "@/components/integrated-medical-consultation"
import { PatientDataLoader } from "@/components/patient-data-loader"

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [workflowResult, setWorkflowResult] = useState<any>(null)

  const steps = [
    {
      id: 0,
      title: "Informations Patient",
      description: "Identité, antécédents, allergies",
      icon: <User className="h-5 w-5" />,
      component: PatientForm,
    },
    {
      id: 1,
      title: "Examen Clinique",
      description: "Symptômes, signes vitaux, examen physique",
      icon: <Stethoscope className="h-5 w-5" />,
      component: ClinicalForm,
    },
    {
      id: 2,
      title: "Questions IA",
      description: "Questions personnalisées générées par l'IA",
      icon: <Brain className="h-5 w-5" />,
      component: QuestionsForm,
    },
    {
      id: 3,
      title: "Diagnostic IA",
      description: "Analyse diagnostique par intelligence artificielle",
      icon: <ClipboardList className="h-5 w-5" />,
      component: DiagnosisForm,
    },
    {
      id: 4,
      title: "Workflow Médical",
      description: "Traitement complet avec APIs médicales",
      icon: <Activity className="h-5 w-5" />,
      component: MedicalWorkflowManager,
    },
    {
      id: 5,
      title: "Consultation Complète",
      description: "Rapport final et prescriptions",
      icon: <FileText className="h-5 w-5" />,
      component: IntegratedMedicalConsultation,
    },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleWorkflowComplete = (result: any) => {
    setWorkflowResult(result)
    setCurrentStep(5) // Aller à la consultation complète
  }

  const getCurrentStepProps = () => {
    switch (currentStep) {
      case 0:
        return {
          onDataChange: setPatientData,
          onNext: handleNext,
        }
      case 1:
        return {
          patientData,
          onDataChange: setClinicalData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 2:
        return {
          patientData,
          clinicalData,
          onDataChange: setQuestionsData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 3:
        return {
          patientData,
          clinicalData,
          questionsData,
          onDataChange: setDiagnosisData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 4:
        return {
          patientData,
          clinicalData,
          questions: questionsData?.responses || "",
          onComplete: handleWorkflowComplete,
        }
      case 5:
        return {
          patientData,
          result: workflowResult,
        }
      default:
        return {}
    }
  }

  const CurrentStepComponent = steps[currentStep]?.component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Include the patient data loader */}
      <PatientDataLoader />
      
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TIBOK IA DOCTOR</h1>
              <p className="text-gray-600">Système Expert de Diagnostic Médical par Intelligence Artificielle</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              GPT-4o + APIs Médicales
            </Badge>
          </div>

          {/* Barre de progression */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression</span>
                <span className="text-sm text-gray-600">
                  Étape {currentStep + 1} sur {steps.length}
                </span>
              </div>
              <Progress value={progress} className="mb-4" />

              {/* Étapes */}
              <div className="flex justify-between">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center text-center ${
                      index <= currentStep ? "text-blue-600" : "text-gray-400"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
                        index <= currentStep ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs font-medium">{step.title}</p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Étape actuelle */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {steps[currentStep]?.icon}
                {steps[currentStep]?.title}
              </CardTitle>
              <p className="text-gray-600">{steps[currentStep]?.description}</p>
            </CardHeader>
          </Card>
        </div>

        {/* Contenu de l'étape */}
        {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}

        {/* Informations système */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">GPT-4o</div>
                  <div className="text-sm text-gray-600">Modèle IA</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">5</div>
                  <div className="text-sm text-gray-600">APIs Intégrées</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">EBM</div>
                  <div className="text-sm text-gray-600">Evidence-Based</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">24/7</div>
                  <div className="text-sm text-gray-600">Disponible</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
