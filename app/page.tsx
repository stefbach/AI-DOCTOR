"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, ClipboardList, Brain, FileText, Activity } from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import MedicalWorkflow from "@/components/medical/main-medical-workflow"

import { useTestMode } from "@/hooks/use-test-mode"
import TestModeToolbar from "@/components/test-mode-toolbar"
import { getTranslation, Language } from "@/lib/translations"
import { consultationDataService } from "@/lib/consultation-data-service"

export default function MedicalAIExpert() {
  // États principaux
  const [currentStep, setCurrentStep] = useState(0)
  const [language, setLanguage] = useState<Language>("fr")
  const [patientData, setPatientData] = useState(null)
  const [clinicalData, setClinicalData] = useState(null)
  const [questionsData, setQuestionsData] = useState(null)
  const [diagnosisData, setDiagnosisData] = useState(null)
  const [workflowResult, setWorkflowResult] = useState(null)

  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null)

  // Mode test
  const {
    isTestMode,
    currentTestPatient,
    setTestPatient,
    clearTestMode,
    getTestDataForStep,
    testPatients,
  } = useTestMode()

  // Langue
  const t = (key: string) => getTranslation(key, language)

  useEffect(() => {
    const saved = localStorage.getItem("preferred-language") as Language
    if (saved) setLanguage(saved)
  }, [])

  // Remplissage test automatique
  useEffect(() => {
    if (isTestMode && currentTestPatient) {
      const data = getTestDataForStep(currentStep)
      if (currentStep === 0 && !patientData) setPatientData(data)
      if (currentStep === 1 && !clinicalData) setClinicalData(data)
    }
  }, [isTestMode, currentTestPatient, currentStep])

  const steps = [
    { id: 0, title: t("steps.patientInfo.title"), description: t("steps.patientInfo.description"), icon: <User className="h-5 w-5" />, component: PatientForm },
    { id: 1, title: t("steps.clinical.title"), description: t("steps.clinical.description"), icon: <ClipboardList className="h-5 w-5" />, component: ClinicalForm },
    { id: 2, title: t("steps.questions.title"), description: t("steps.questions.description"), icon: <Brain className="h-5 w-5" />, component: QuestionsForm },
    { id: 3, title: t("steps.diagnosis.title"), description: t("steps.diagnosis.description"), icon: <FileText className="h-5 w-5" />, component: DiagnosisForm },
    { id: 4, title: t("steps.workflow.title"), description: t("steps.workflow.description"), icon: <Activity className="h-5 w-5" />, component: MedicalWorkflow },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100
  const CurrentStepComponent = steps[currentStep].component

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("preferred-language", lang)
  }

  const getCurrentStepProps = () => {
    const testData = isTestMode ? getTestDataForStep(currentStep) : null
    const common = {
      language,
      consultationId: currentConsultationId || consultationDataService.getCurrentConsultationId(),
    }

    switch (currentStep) {
      case 0:
        return { ...common, initialData: testData || patientData, onDataChange: setPatientData, onNext: handleNext }
      case 1:
        return { ...common, patientData, initialData: testData || clinicalData, onDataChange: setClinicalData, onNext: handleNext, onPrevious: handlePrevious }
      case 2:
        return { ...common, patientData, clinicalData, initialData: questionsData, onDataChange: setQuestionsData, onNext: handleNext, onPrevious: handlePrevious }
      case 3:
        return { ...common, patientData, clinicalData, questionsData, initialData: diagnosisData, onDataChange: setDiagnosisData, onNext: handleNext, onPrevious: handlePrevious }
      case 4:
        return { ...common, patientData, clinicalData, questionsData, diagnosisData, initialData: workflowResult, onBack: handlePrevious }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t("mainPage.title")}</h1>
            <p className="text-gray-600">{t("mainPage.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton de test */}
            {!isTestMode && testPatients?.length > 0 && (
              <Button
                onClick={() => {
                  const patient = testPatients[0]
                  setTestPatient(patient)
                  alert(`🧪 Mode test activé : ${patient.patientData.firstName}`)
                }}
              >
                🧪 Activer Mode Test
              </Button>
            )}

            {/* Langue */}
            <div className="bg-black rounded-md p-1 flex gap-1">
              <Button
                size="sm"
                variant={language === "fr" ? "default" : "ghost"}
                className={language === "fr" ? "bg-blue-600 text-white" : "text-gray-300"}
                onClick={() => handleSetLanguage("fr")}
              >
                FR
              </Button>
              <Button
                size="sm"
                variant={language === "en" ? "default" : "ghost"}
                className={language === "en" ? "bg-blue-600 text-white" : "text-gray-300"}
                onClick={() => handleSetLanguage("en")}
              >
                EN
              </Button>
            </div>

            {/* Badge ID */}
            {(currentConsultationId || consultationDataService.getCurrentConsultationId()) && (
              <Badge variant="outline">
                ID: {(currentConsultationId || consultationDataService.getCurrentConsultationId())?.slice(-8)}
              </Badge>
            )}
          </div>
        </div>

        {/* Barre outils test */}
        {isTestMode && (
          <TestModeToolbar
            testPatient={currentTestPatient}
            onSelectPatient={setTestPatient}
            onClearTestMode={clearTestMode}
            currentStep={currentStep}
          />
        )}

        {/* Étape en cours */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {steps[currentStep].icon}
              {steps[currentStep].title}
            </CardTitle>
            <p className="text-gray-500">{steps[currentStep].description}</p>
          </CardHeader>
        </Card>

        {/* Formulaire en cours */}
        {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}
      </div>
    </div>
  )
}

