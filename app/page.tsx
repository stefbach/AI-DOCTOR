// app/page.tsx - Version complète avec intégration du système de test

<div>TEXTE DE TEST 123</div>

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
import DiagnosisForm from "@/components/diagnosis-form"
import MedicalWorkflow from "@/components/medical/main-medical-workflow"
import IntegratedMedicalConsultation from "@/components/integrated-medical-consultation"
import { PatientDataLoader } from "@/components/patient-data-loader"
import { getTranslation, Language } from "@/lib/translations"
import { consultationDataService } from '@/lib/consultation-data-service'
import { supabase } from '@/lib/supabase'

// 🆕 IMPORTS AJOUTÉS POUR LE SYSTÈME DE TEST
import { useTestMode } from '@/hooks/use-test-mode'
import TestModeToolbar from '@/components/test-mode-toolbar'
import TestPatientSelector from '@/components/test-patient-selector'

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  const [language, setLanguage] = useState<Language>('fr')
  
  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null)
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null)
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const {
  isTestMode,
  currentTestPatient,
  setTestPatient,
  clearTestMode,
  getTestDataForStep,
  testPatients,
} = useTestMode()

  // 🆕 HOOK DU SYSTÈME DE TEST
  <Button onClick={() => {
  const testPatient = testPatients[0] // Premier patient
  setTestPatient(testPatient)
  alert(`Mode test activé avec: ${testPatient.patientData.firstName}`)
}}>
  🧪 Activer Mode Test
</Button>

  // Load language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // 🆕 PRÉ-REMPLISSAGE AUTOMATIQUE DES DONNÉES DE TEST
  useEffect(() => {
    if (isTestMode && currentTestPatient) {
      if (currentStep === 0 && !patientData) {
        const testData = getTestDataForStep(0)
        if (testData) {
          setPatientData(testData)
        }
      }
      
      if (currentStep === 1 && !clinicalData) {
        const testData = getTestDataForStep(1)
        if (testData) {
          setClinicalData(testData)
        }
      }
    }
  }, [isTestMode, currentTestPatient, currentStep, patientData, clinicalData])

  // ... (tous vos autres useEffect existants restent identiques) ...

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('preferred-language', lang)
  }

  const t = (key: string) => getTranslation(key, language)

  const steps = [
    {
      id: 0,
      title: t('steps.patientInfo.title'),
      description: t('steps.patientInfo.description'),
      icon: <User className="h-5 w-5" />,
      component: PatientForm,
    },
    // ... (reste des steps identique) ...
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  // 🆕 MODIFICATION DE handleNext POUR LE MODE TEST
  const handleNext = async () => {
    // Save current step data before moving forward
    const consultationId = consultationDataService.getCurrentConsultationId()
    if (consultationId) {
      try {
        console.log(`Saving data for step ${currentStep}`)
        switch (currentStep) {
          case 0:
            if (patientData) {
              await consultationDataService.saveStepData(0, patientData)
            }
            break
          case 1:
            if (clinicalData) {
              await consultationDataService.saveStepData(1, clinicalData)
            }
            break
          case 2:
            if (questionsData) {
              await consultationDataService.saveStepData(2, questionsData)
            }
            break
          case 3:
            if (diagnosisData) {
              await consultationDataService.saveStepData(3, diagnosisData)
            }
            break
        }
        console.log(`Data saved for step ${currentStep}`)
      } catch (error) {
        console.error('Error saving step data:', error)
      }
    }
    
    // 🆕 EN MODE TEST, PRÉ-REMPLIR L'ÉTAPE SUIVANTE
    if (isTestMode && currentStep < steps.length - 1) {
      const nextStepData = getTestDataForStep(currentStep + 1)
      
      if (nextStepData) {
        switch (currentStep + 1) {
          case 1:
            setClinicalData(nextStepData)
            break
        }
      }
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // ... (handleWorkflowComplete et handleMedicalWorkflowComplete restent identiques) ...

  const handleStepClick = async (stepIndex: number) => {
    // ... (reste identique) ...
  }

  // 🆕 MODIFICATION DE getCurrentStepProps
  const getCurrentStepProps = () => {
    const consultationId = consultationDataService.getCurrentConsultationId() || currentConsultationId
    const commonProps = { 
      language, 
      consultationId,
      patientId: currentPatientId,
      doctorId: currentDoctorId
    }
    
    // 🆕 RÉCUPÉRER LES DONNÉES DE TEST
    const testData = isTestMode ? getTestDataForStep(currentStep) : null
    
    switch (currentStep) {
      case 0:
        return {
          ...commonProps,
          initialData: testData || patientData, // 🆕 MODIFIÉ
          onDataChange: setPatientData,
          onNext: handleNext,
        }
      case 1:
        return {
          ...commonProps,
          patientData,
          initialData: testData || clinicalData, // 🆕 MODIFIÉ
          onDataChange: setClinicalData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 2:
        return {
          ...commonProps,
          patientData,
          clinicalData,
          initialData: questionsData,
          onDataChange: setQuestionsData,
          onNext: handleNext,
          onPrevious: handlePrevious,
          expectedConditions: currentTestPatient?.expectedConditions // 🆕 AJOUTÉ
        }
      case 3:
        return {
          ...commonProps,
          patientData,
          clinicalData,
          questionsData,
          initialData: diagnosisData,
          onDataChange: setDiagnosisData,
          onNext: handleNext,
          onPrevious: handlePrevious,
          expectedConditions: currentTestPatient?.expectedConditions // 🆕 AJOUTÉ
        }
      case 4:
        return {
          ...commonProps,
          patientData,
          clinicalData,
          questionsData,
          diagnosisData,
          initialData: workflowResult,
          onComplete: handleMedicalWorkflowComplete,
          onBack: handlePrevious,
        }
      default:
        return commonProps
    }
  }

  const CurrentStepComponent = steps[currentStep]?.component

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Language Switcher */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('mainPage.title')}</h1>
              <p className="text-gray-600">{t('mainPage.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              
              {/* 🆕 BOUTON DE SÉLECTION DE PATIENT TEST */}
             {!isTestMode && testPatients?.length > 0 && (
  <Button
    onClick={() => {
      const testPatient = testPatients[0]
      setTestPatient(testPatient)
      alert(`🧪 Mode test activé avec : ${testPatient.patientData.firstName}`)
    }}
    variant="default"
  >
    🧪 Activer Mode Test
  </Button>
)}

              
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
              
              {/* Consultation ID Badge */}
              {(currentConsultationId || consultationDataService.getCurrentConsultationId()) && (
                <Badge variant="outline" className="text-xs">
                  ID: {(currentConsultationId || consultationDataService.getCurrentConsultationId())?.slice(-8)}
                </Badge>
              )}
            </div>
          </div>

          {/* 🆕 BARRE D'OUTILS DU MODE TEST */}
          {isTestMode && (
            <TestModeToolbar
              testPatient={currentTestPatient}
              onSelectPatient={setTestPatient}
              onClearTestMode={clearTestMode}
              currentStep={currentStep}
            />
          )}

          {/* Progress bar */}
          <Card>
            {/* ... (reste du code de la progress bar identique) ... */}
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
      </div>
    </div>
  )
}
