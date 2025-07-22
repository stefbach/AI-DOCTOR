"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Stethoscope, User, ClipboardList, Brain, FileText, Activity } from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form" // 👈 GARDÉ L'ORIGINAL
import MedicalWorkflow from "@/components/medical/main-medical-workflow" // 👈 NOUVEAU
import IntegratedMedicalConsultation from "@/components/integrated-medical-consultation"
import { PatientDataLoader } from "@/components/patient-data-loader"
import { getTranslation, Language } from "@/lib/translations"

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  const [language, setLanguage] = useState<Language>('fr')

  // Load language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('preferred-language', lang)
  }

  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)

  const steps = [
    {
      id: 0,
      title: t('steps.patientInfo.title'),
      description: t('steps.patientInfo.description'),
      icon: <User className="h-5 w-5" />,
      component: PatientForm,
    },
    {
      id: 1,
      title: t('steps.clinicalExam.title'),
      description: t('steps.clinicalExam.description'),
      icon: <Stethoscope className="h-5 w-5" />,
      component: ClinicalForm,
    },
    {
      id: 2,
      title: t('steps.aiQuestions.title'),
      description: t('steps.aiQuestions.description'),
      icon: <Brain className="h-5 w-5" />,
      component: QuestionsForm,
    },
    {
      id: 3,
      title: t('steps.aiDiagnosis.title'),
      description: t('steps.aiDiagnosis.description'),
      icon: <ClipboardList className="h-5 w-5" />,
      component: DiagnosisForm, // 👈 GARDER L'ORIGINAL
    },
    {
      id: 4,
      title: "Documents Mauriciens",
      description: "Édition des documents médicaux",
      icon: <Activity className="h-5 w-5" />,
      component: MedicalWorkflow, // 👈 NOUVEAU - ÉTAPE FINALE
    },
    // ÉTAPE 6 SUPPRIMÉE - était redondante
    /*
    {
      id: 5,
      title: t('steps.completeConsultation.title'),
      description: t('steps.completeConsultation.description'),
      icon: <FileText className="h-5 w-5" />,
      component: IntegratedMedicalConsultation,
    },
    */
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
    // Plus besoin de rediriger vers une étape 6 - le workflow se termine ici
    console.log('Workflow terminé:', result)
  }

  // 👈 FONCTION MODIFIÉE - plus besoin de rediriger vers étape 5
  const handleMedicalWorkflowComplete = (result: any) => {
    setWorkflowResult(result)
    // Le workflow se termine ici - l'étape 4 est maintenant la finale
    console.log('Workflow médical terminé:', result)
  }

  // 👈 NOUVELLE FONCTION - Navigation directe vers une étape
  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  const getCurrentStepProps = () => {
    const commonProps = { language }
    
    switch (currentStep) {
      case 0:
        return {
          ...commonProps,
          onDataChange: setPatientData,
          onNext: handleNext,
        }
      case 1:
        return {
          ...commonProps,
          patientData,
          onDataChange: setClinicalData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 2:
        return {
          ...commonProps,
          patientData,
          clinicalData,
          onDataChange: setQuestionsData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 3: // 👈 DIAGNOSTIC FORM (votre original)
        return {
          ...commonProps,
          patientData,
          clinicalData,
          questionsData,
          onDataChange: setDiagnosisData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 4: // 👈 MEDICAL WORKFLOW (nouveau) - ÉTAPE FINALE
        return {
          ...commonProps,
          patientData,
          clinicalData,
          questionsData,
          diagnosisData, // 👈 Données du diagnostic
          onComplete: handleMedicalWorkflowComplete,
          onBack: handlePrevious,
        }
      // SUPPRIMÉ: case 5 - Était redondant
      default:
        return commonProps
    }
  }

  const CurrentStepComponent = steps[currentStep]?.component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Temporarily disabled to prevent URL clearing
      <PatientDataLoader />
      */}
      
      <div className="container mx-auto px-4 py-8">
        {/* Header with Language Switcher */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('mainPage.title')}</h1>
              <p className="text-gray-600">{t('mainPage.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Switcher with black background */}
              <div className="flex items-center gap-2 mr-4 bg-black rounded-md p-1">
                <Button
                  variant={language === 'fr' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSetLanguage('fr')}
                  className={language === 'fr' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-transparent'
                  }
                >
                  FR
                </Button>
                <Button
                  variant={language === 'en' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSetLanguage('en')}
                  className={language === 'en' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-transparent'
                  }
                >
                  EN
                </Button>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                GPT-4o + APIs {t('mainPage.medical')}
              </Badge>
            </div>
          </div>

          {/* Progress bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {t('mainPage.progress')}
                </span>
                <span className="text-sm text-gray-600">
                  {t('mainPage.step')} {currentStep + 1} {t('mainPage.of')} {steps.length}
                </span>
              </div>
              <Progress value={progress} className="mb-4" />

              {/* Steps - Cliquables pour navigation directe */}
              <div className="flex justify-between">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    className={`flex flex-col items-center text-center cursor-pointer transition-all duration-200 hover:scale-105 ${
                      index <= currentStep ? "text-blue-600" : "text-gray-400"
                    } ${
                      index === currentStep ? "transform scale-110" : ""
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full mb-2 transition-all duration-200 ${
                        index === currentStep 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : index < currentStep 
                            ? "bg-blue-100 hover:bg-blue-200" 
                            : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="hidden md:block">
                      <p className={`text-xs font-medium ${
                        index === currentStep ? "font-bold" : ""
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current step */}
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

        {/* Step content */}
        {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}

        {/* SECTION SYSTEM INFORMATION SUPPRIMÉE - Était redondante */}
        {/*
        <div className="mt-8">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">GPT-4o</div>
                  <div className="text-sm text-gray-600">{t('mainPage.aiModel')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">5</div>
                  <div className="text-sm text-gray-600">APIs {t('mainPage.integrated')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">EBM</div>
                  <div className="text-sm text-gray-600">Evidence-Based</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">24/7</div>
                  <div className="text-sm text-gray-600">{t('mainPage.available')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        */}
      </div>
    </div>
  )
}
