// app/test/page.tsx - Version corrigée avec debug et gestion d'état améliorée

"use client"

import { useState, useEffect } from "react"
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Stethoscope,
  User,
  ClipboardList,
  Brain,
  FileSignature,
  AlertCircle,
  CheckCircle
} from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import ProfessionalReport from "@/components/professional-report"
import { consultationDataService } from '@/lib/consultation-data-service'

export type Language = 'fr' | 'en'

export default function MedicalAIExpertDebug() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [finalReport, setFinalReport] = useState<any>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [debugMode, setDebugMode] = useState<boolean>(true)

  // Initialize consultation on mount
  useEffect(() => {
    const initConsultation = async () => {
      try {
        console.log('🚀 Initializing consultation...')
        const id = await consultationDataService.initializeConsultation()
        setConsultationId(id)
        console.log('✅ Consultation initialized with ID:', id)
        
        // Try to load existing data
        const savedData = await consultationDataService.getAllData()
        if (savedData) {
          console.log('📂 Found saved data:', savedData)
          if (savedData.patientData) {
            setPatientData(savedData.patientData)
            console.log('✅ Loaded patient data')
          }
          if (savedData.clinicalData) {
            setClinicalData(savedData.clinicalData)
            console.log('✅ Loaded clinical data')
          }
          if (savedData.questionsData) {
            setQuestionsData(savedData.questionsData)
            console.log('✅ Loaded questions data')
          }
        }
      } catch (error) {
        console.error('❌ Error initializing consultation:', error)
      }
    }
    
    initConsultation()
  }, [])

  const handleStepClick = (index: number) => {
    // Only allow going back or to completed steps
    if (index <= currentStep) {
      console.log(`📍 Navigating to step ${index}`)
      setCurrentStep(index)
    }
  }

  const t = (key: string): string => {
    const translations: Record<string, any> = {
      en: {
        steps: {
          patientInfo: {
            title: "Patient Information",
            description: "Administrative data and medical history"
          },
          clinicalData: {
            title: "Clinical Data",
            description: "Physical examination and symptoms"
          },
          aiQuestions: {
            title: "AI Questions",
            description: "Targeted diagnostic questions"
          },
          diagnosis: {
            title: "Diagnosis",
            description: "Analysis and differential diagnosis"
          },
          finalReport: {
            title: "Complete Medical Record",
            description: "Report and prescriptions"
          }
        },
        mainPage: {
          title: "Medical AI Expert",
          subtitle: "Consultation assistant"
        },
        progress: {
          title: "Progress",
          stepOf: "Step {current} of {total}"
        },
        loading: "Loading..."
      }
    };
    const keys = key.split('.');
    let value: any = translations[language] ?? translations['en'];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

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
      title: t('steps.finalReport.title'),
      description: t('steps.finalReport.description'),
      icon: <FileSignature className="h-5 w-5" />,
      component: ProfessionalReport,
    }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  // Enhanced data change handlers with logging
  const handlePatientDataChange = (data: any) => {
    console.log('📊 PATIENT DATA UPDATED:', {
      firstName: data?.firstName,
      lastName: data?.lastName,
      age: data?.age,
      gender: data?.gender,
      hasData: !!data
    })
    setPatientData(data)
  }

  const handleClinicalDataChange = (data: any) => {
    console.log('🏥 CLINICAL DATA UPDATED:', {
      chiefComplaint: data?.chiefComplaint?.substring(0, 50),
      symptoms: data?.symptoms,
      symptomDuration: data?.symptomDuration,
      hasData: !!data
    })
    setClinicalData(data)
  }

  const handleQuestionsDataChange = (data: any) => {
    console.log('❓ QUESTIONS DATA UPDATED:', {
      responsesCount: data?.responses?.length,
      hasData: !!data
    })
    setQuestionsData(data)
  }

  const handleNext = async () => {
    console.log(`➡️ NEXT clicked at step ${currentStep}`)
    
    // Log current state before navigation
    console.log('Current state:', {
      patientData: !!patientData,
      clinicalData: !!clinicalData,
      questionsData: !!questionsData
    })
    
    // Save data for current step
    if (consultationId) {
      try {
        console.log(`💾 Saving data for step ${currentStep}`)
        switch (currentStep) {
          case 0:
            if (patientData) {
              await consultationDataService.saveStepData(0, patientData)
              console.log('✅ Patient data saved')
            }
            break
          case 1:
            if (clinicalData) {
              await consultationDataService.saveStepData(1, clinicalData)
              console.log('✅ Clinical data saved')
            }
            break
          case 2:
            if (questionsData) {
              await consultationDataService.saveStepData(2, questionsData)
              console.log('✅ Questions data saved')
            }
            break
        }
      } catch (error) {
        console.error('❌ Error saving step data:', error)
      }
    }
    
    // Special check before going to Questions step
    if (currentStep === 1) {
      console.log('🔍 CHECKING DATA BEFORE QUESTIONS STEP:')
      console.log('Patient Data exists:', !!patientData)
      console.log('Clinical Data exists:', !!clinicalData)
      
      if (!patientData || !clinicalData) {
        console.error('❌ Missing required data for Questions step!')
        alert('Missing required data! Please complete previous steps.')
        return
      }
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    console.log(`⬅️ PREVIOUS clicked at step ${currentStep}`)
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinalReportComplete = async (data: any) => {
    console.log('✅ Final report completed:', data)
    setFinalReport(data)
    
    if (consultationId) {
      try {
        await consultationDataService.saveStepData(4, data)
        await consultationDataService.markConsultationComplete()
        console.log('🎉 Consultation completed successfully')
      } catch (error) {
        console.error('❌ Error saving final report:', error)
      }
    }
  }

  const getCurrentStepProps = () => {
    const commonProps = { 
      language, 
      consultationId
    }
    
    switch (currentStep) {
      case 0:
        return {
          ...commonProps,
          data: patientData,
          onDataChange: handlePatientDataChange,
          onNext: handleNext,
        }
      case 1:
        return {
          ...commonProps,
          patientData,
          data: clinicalData,
          onDataChange: handleClinicalDataChange,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 2:
        // CRITICAL: Ensure data exists before rendering
        return {
          ...commonProps,
          patientData: patientData || {},
          clinicalData: clinicalData || {},
          data: questionsData,
          onDataChange: handleQuestionsDataChange,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 3:
        return {
          ...commonProps,
          patientData,
          clinicalData,
          questionsData,
          data: diagnosisData,
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
          onComplete: handleFinalReportComplete,
          onPrevious: handlePrevious,
        }
      default:
        return commonProps
    }
  }

  const CurrentStepComponent = steps[currentStep]?.component

  // Debug Panel
  const DebugPanel = () => {
    if (!debugMode) return null
    
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md z-50 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-yellow-400">🔍 DEBUG PANEL</span>
          <button 
            onClick={() => setDebugMode(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-1">
          <div>📍 Current Step: <span className="text-cyan-400">{currentStep}</span></div>
          <div>🆔 Consultation ID: <span className="text-cyan-400">{consultationId || 'None'}</span></div>
          
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="font-semibold mb-1">Data Status:</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                {patientData ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-400" />
                )}
                <span>Patient Data</span>
              </div>
              <div className="flex items-center gap-1">
                {clinicalData ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-400" />
                )}
                <span>Clinical Data</span>
              </div>
              <div className="flex items-center gap-1">
                {questionsData ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-400" />
                )}
                <span>Questions Data</span>
              </div>
              <div className="flex items-center gap-1">
                {diagnosisData ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-400" />
                )}
                <span>Diagnosis Data</span>
              </div>
            </div>
          </div>
          
          {patientData && (
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="font-semibold mb-1">Patient:</div>
              <div className="text-gray-300">
                {patientData.firstName} {patientData.lastName}
                {patientData.age && ` (${patientData.age} years)`}
              </div>
            </div>
          )}
          
          {clinicalData && (
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="font-semibold mb-1">Chief Complaint:</div>
              <div className="text-gray-300 truncate">
                {clinicalData.chiefComplaint?.substring(0, 50)}...
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-700 pt-2 mt-2">
          <button
            onClick={() => console.log('Full State:', {
              patientData,
              clinicalData,
              questionsData,
              diagnosisData
            })}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            Log Full State to Console
          </button>
        </div>
      </div>
    )
  }

  // Data validation warning for Questions step
  const DataWarning = () => {
    if (currentStep === 2 && (!patientData || !clinicalData)) {
      return (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Missing Required Data</p>
              <p className="text-sm mt-1">
                {!patientData && "❌ Patient data is missing. "}
                {!clinicalData && "❌ Clinical data is missing. "}
                Please complete the previous steps first.
              </p>
              <button
                onClick={handlePrevious}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Debug Mode Toggle */}
        {!debugMode && (
          <button
            onClick={() => setDebugMode(true)}
            className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full z-50"
            title="Show Debug Panel"
          >
            🔍
          </button>
        )}
        
        {/* Progress Section */}
        <Card className="bg-white shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t('progress.title')}</h2>
            <span className="text-sm text-gray-600">
              {t('progress.stepOf').replace('{current}', String(currentStep + 1)).replace('{total}', String(steps.length))}
            </span>
          </div>
          
          <Progress value={progress} className="mb-6 h-3" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`relative flex flex-col items-center text-center p-4 rounded-lg transition-all cursor-pointer
                  ${index === currentStep 
                    ? 'bg-blue-50 border-2 border-blue-500' 
                    : index < currentStep 
                    ? 'bg-green-50 border-2 border-green-500 hover:bg-green-100' 
                    : 'bg-gray-50 border-2 border-gray-300 opacity-60 cursor-not-allowed'
                  }`}
              >
                <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${index === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : index < currentStep 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-400 text-white'
                  }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3
                  ${index === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : index < currentStep 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                  }`}>
                  {React.cloneElement(step.icon, { className: "h-8 w-8" })}
                </div>
                
                <h3 className={`font-semibold mb-1 text-sm
                  ${index === currentStep 
                    ? 'text-blue-900' 
                    : index < currentStep 
                    ? 'text-green-900' 
                    : 'text-gray-600'
                  }`}>
                  {step.title}
                </h3>
                
                <p className={`text-xs
                  ${index === currentStep 
                    ? 'text-blue-700' 
                    : index < currentStep 
                    ? 'text-green-700' 
                    : 'text-gray-500'
                  }`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

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
            <DataWarning />
            {CurrentStepComponent && (
              currentStep === 2 && (!patientData || !clinicalData) ? null : (
                <CurrentStepComponent {...getCurrentStepProps()} />
              )
            )}
          </CardContent>
        </Card>
      </div>
      
      <DebugPanel />
    </div>
  )
}
