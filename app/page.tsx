"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Stethoscope, Settings, TestTube, FileText, User, Activity, HelpCircle, CheckCircle } from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import ParaclinicalExams from "@/components/paraclinical-exams"
import MedicationPrescription from "@/components/medication-prescription"
import ConsultationReport from "@/components/consultation-report"
import DiagnosisForm from "@/components/diagnosis-form"
import SystemCheck from "@/components/system-check"
import TestCases from "@/components/test-cases"

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [examsData, setExamsData] = useState<any>(null)
  const [prescriptionData, setPrescriptionData] = useState<any>(null)

  const steps = [
    {
      id: 0,
      title: "Vérification Système",
      icon: Settings,
      description: "Vérifier la configuration des APIs",
      component: SystemCheck,
    },
    {
      id: 1,
      title: "Cas de Test",
      icon: TestTube,
      description: "Tester avec des cas cliniques prédéfinis",
      component: TestCases,
    },
    {
      id: 2,
      title: "Données Patient",
      icon: User,
      description: "Informations démographiques et antécédents",
      component: PatientForm,
    },
    {
      id: 3,
      title: "Examen Clinique",
      icon: Stethoscope,
      description: "Signes vitaux et examen physique",
      component: ClinicalForm,
    },
    {
      id: 4,
      title: "Anamnèse Dirigée",
      icon: HelpCircle,
      description: "Questions spécifiques selon les symptômes",
      component: QuestionsForm,
    },
    {
      id: 5,
      title: "Diagnostic IA",
      icon: Activity,
      description: "Analyse et diagnostic par intelligence artificielle",
      component: DiagnosisForm,
    },
    {
      id: 6,
      title: "Examens Paracliniques",
      icon: TestTube,
      description: "Examens complémentaires recommandés",
      component: ParaclinicalExams,
    },
    {
      id: 7,
      title: "Ordonnances",
      icon: FileText,
      description: "Prescriptions médicamenteuses et examens",
      component: MedicationPrescription,
    },
    {
      id: 8,
      title: "Rapport de Consultation",
      icon: FileText,
      description: "Rapport médical complet",
      component: ConsultationReport,
    },
  ]

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return "completed"
    if (stepId === currentStep) return "current"
    return "upcoming"
  }

  const getStepData = (stepId: number) => {
    switch (stepId) {
      case 2:
        return patientData
      case 3:
        return clinicalData
      case 4:
        return questionsData
      case 5:
        return diagnosisData
      case 6:
        return examsData
      case 7:
        return prescriptionData
      default:
        return null
    }
  }

  const handleStepComplete = (stepId: number, data: any) => {
    switch (stepId) {
      case 2:
        setPatientData(data)
        break
      case 3:
        setClinicalData(data)
        break
      case 4:
        setQuestionsData(data)
        break
      case 5:
        setDiagnosisData(data)
        break
      case 6:
        setExamsData(data)
        break
      case 7:
        setPrescriptionData(data)
        break
    }

    if (stepId < steps.length - 1) {
      setCurrentStep(stepId + 1)
    }
  }

  const handleTestCaseLoad = (testCase: any) => {
    setPatientData(testCase.patientData)
    setClinicalData(testCase.clinicalData)
    setQuestionsData(testCase.questionsData)
    setCurrentStep(5) // Aller directement au diagnostic
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  const CurrentComponent = steps[currentStep]?.component

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Medical AI Expert</h1>
          <p className="text-xl text-gray-600 mb-4">
            Système d'aide au diagnostic médical par intelligence artificielle
          </p>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Badge variant="outline" className="bg-white">
              <Activity className="w-4 h-4 mr-1" />
              OpenAI GPT-4
            </Badge>
            <Badge variant="outline" className="bg-white">
              <TestTube className="w-4 h-4 mr-1" />
              APIs Médicales
            </Badge>
            <Badge variant="outline" className="bg-white">
              <FileText className="w-4 h-4 mr-1" />
              Rapports Automatisés
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Progression du Workflow</h3>
              <span className="text-sm text-gray-500">
                Étape {currentStep + 1} sur {steps.length}
              </span>
            </div>
            <Progress value={progress} className="mb-4" />
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {steps.map((step) => {
                const status = getStepStatus(step.id)
                const Icon = step.icon
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all ${
                      status === "completed"
                        ? "bg-green-100 text-green-700"
                        : status === "current"
                          ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                          : "bg-gray-100 text-gray-400"
                    }`}
                    onClick={() => {
                      if (step.id <= currentStep || step.id <= 1) {
                        setCurrentStep(step.id)
                      }
                    }}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs text-center font-medium">{step.title}</span>
                    {status === "completed" && <CheckCircle className="w-3 h-3 mt-1" />}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(steps[currentStep].icon, { className: "w-6 h-6" })}
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {CurrentComponent && (
              <CurrentComponent
                data={getStepData(currentStep)}
                patientData={patientData}
                clinicalData={clinicalData}
                questionsData={questionsData}
                diagnosisData={diagnosisData}
                examsData={examsData}
                prescriptionData={prescriptionData}
                onComplete={(data: any) => handleStepComplete(currentStep, data)}
                onNext={() => setCurrentStep(Math.min(currentStep + 1, steps.length - 1))}
                onPrevious={() => setCurrentStep(Math.max(currentStep - 1, 0))}
                onTestCaseLoad={handleTestCaseLoad}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(currentStep - 1, 0))}
            disabled={currentStep === 0}
          >
            Étape Précédente
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(0)}>
              Vérification Système
            </Button>
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Cas de Test
            </Button>
          </div>

          <Button
            onClick={() => setCurrentStep(Math.min(currentStep + 1, steps.length - 1))}
            disabled={currentStep === steps.length - 1}
          >
            Étape Suivante
          </Button>
        </div>
      </div>
    </div>
  )
}
