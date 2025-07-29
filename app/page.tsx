// app/page.tsx - Version complète sans système de test

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

  // Load language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Initialize consultation
  useEffect(() => {
    const initializeConsultation = async () => {
      try {
        setIsLoading(true)
        
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.log('No authenticated user, proceeding without user context')
          setCurrentDoctorId(null)
        } else {
          setCurrentDoctorId(user.id)
        }
        
        let consultationId = consultationDataService.getCurrentConsultationId()
        
        if (!consultationId) {
          const newConsultation = consultationDataService.createNewConsultation(user?.id || null)
          consultationId = newConsultation.id
          setCurrentConsultationId(consultationId)
          console.log('Created new consultation:', consultationId)
        } else {
          setCurrentConsultationId(consultationId)
          console.log('Using existing consultation:', consultationId)
          
          const savedData = consultationDataService.getConsultationData()
          if (savedData && savedData.steps) {
            if (savedData.steps[0]) setPatientData(savedData.steps[0])
            if (savedData.steps[1]) setClinicalData(savedData.steps[1])
            if (savedData.steps[2]) setQuestionsData(savedData.steps[2])
            if (savedData.steps[3]) setDiagnosisData(savedData.steps[3])
            if (savedData.steps[4]) setWorkflowResult(savedData.steps[4])
            
            const lastCompletedStep = Object.keys(savedData.steps)
              .map(Number)
              .filter(step => savedData.steps[step] !== null)
              .sort((a, b) => b - a)[0]
            
            if (lastCompletedStep !== undefined) {
              setCurrentStep(Math.min(lastCompletedStep + 1, 4))
            }
          }
        }
        
        if (user?.id) {
          const patientId = await consultationDataService.getOrCreatePatientId(user.id)
          setCurrentPatientId(patientId)
        }
        
        setIsInitialized(true)
      } catch (error) {
        console.error('Error initializing consultation:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeConsultation()
  }, [])

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
    {
      id: 1,
      title: t('steps.clinicalData.title'),
      description: t('steps.clinicalData.description'),
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
      title: t('steps.diagnosis.title'),
      description: t('steps.diagnosis.description'),
      icon: <ClipboardList className="h-5 w-5" />,
      component: DiagnosisForm,
    },
    {
      id: 4,
      title: t('steps.documents.title'),
      description: t('steps.documents.description'),
      icon: <FileText className="h-5 w-5" />,
      component: MedicalWorkflow,
    },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

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
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleWorkflowComplete = async (data: any) => {
    console.log('Medical workflow completed:', data)
    setWorkflowResult(data)
    
    const consultationId = consultationDataService.getCurrentConsultationId()
    if (consultationId) {
      try {
        await consultationDataService.saveStepData(4, data)
        await consultationDataService.markConsultationComplete()
        console.log('Consultation marked as complete')
      } catch (error) {
        console.error('Error saving workflow data:', error)
      }
    }
  }

  const handleMedicalWorkflowComplete = async (data: any) => {
    console.log('Medical workflow completed with data:', data)
    await handleWorkflowComplete(data)
  }

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex)
    } else if (stepIndex === currentStep + 1) {
      await handleNext()
    }
  }

  const getCurrentStepProps = () => {
    const consultationId = consultationDataService.getCurrentConsultationId() || currentConsultationId
    const commonProps = { 
      language, 
      consultationId,
      patientId: currentPatientId,
      doctorId: currentDoctorId
    }
    
    switch (currentStep) {
      case 0:
        return {
          ...commonProps,
          initialData: patientData,
          onDataChange: setPatientData,
          onNext: handleNext,
        }
      case 1:
        return {
          ...commonProps,
          patientData,
          initialData: clinicalData,
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

          {/* Progress and Steps */}
          <div className="mb-8">
            <Progress value={progress} className="mb-4 h-2" />
            
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  className={`flex flex-col items-center cursor-pointer transition-all ${
                    index <= currentStep
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      index < currentStep
                        ? 'bg-green-600 text-white'
                        : index === currentStep
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span className="text-xs text-center font-medium hidden md:block">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {steps[currentStep]?.icon}
              <span>{steps[currentStep]?.title}</span>
            </CardTitle>
            <p className="text-gray-600">{steps[currentStep]?.description}</p>
          </CardHeader>
          <CardContent>
            {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
