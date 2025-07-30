// app/page.tsx - Version avec rapport professionnel intégré

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
  FileText,
  Activity,
  Edit3,
  FileSignature // Nouvelle icône pour le rapport final
} from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import MedicalWorkflow from "@/components/medical/main-medical-workflow"
import ProfessionalReport from "@/components/professional-report" // NOUVEAU
import { consultationDataService } from '@/lib/consultation-data-service'
import { supabase } from '@/lib/supabase'

export type Language = 'fr' | 'en'

// ...

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  const [finalReport, setFinalReport] = useState<any>(null) // NOUVEAU
  const [language, setLanguage] = useState<Language>('fr')
  
  // ... (gardez tous les autres states)

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
      icon: <Activity className="h-5 w-5" />,
      component: MedicalWorkflow,
    },
    {
      id: 5,
      title: "Compte Rendu Final", // À traduire
      description: "Rapport médical professionnel complet", // À traduire
      icon: <FileSignature className="h-5 w-5" />,
      component: ProfessionalReport,
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
          case 4:
            if (workflowResult) {
              await consultationDataService.saveStepData(4, workflowResult)
            }
            break
          case 5:
            if (finalReport) {
              await consultationDataService.saveStepData(5, finalReport)
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
        console.log('Workflow data saved')
      } catch (error) {
        console.error('Error saving workflow data:', error)
      }
    }
  }

  const handleFinalReportComplete = async (reportData: any) => {
    console.log('Final professional report completed:', reportData)
    setFinalReport(reportData)
    
    const consultationId = consultationDataService.getCurrentConsultationId()
    if (consultationId) {
      try {
        await consultationDataService.saveStepData(5, reportData)
        await consultationDataService.markConsultationComplete()
        console.log('Consultation fully completed and archived')
        
        // Optionnel : rediriger vers une page de confirmation
        // router.push('/consultation-complete')
      } catch (error) {
        console.error('Error finalizing consultation:', error)
      }
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
          onComplete: handleWorkflowComplete,
          onBack: handlePrevious,
        }
      case 5: // NOUVELLE ÉTAPE
        return {
          ...commonProps,
          patientData,
          clinicalData,
          questionsData,
          diagnosisData,
          editedDocuments: workflowResult, // Documents édités à l'étape 4
          onComplete: handleFinalReportComplete,
          onPrevious: handlePrevious,
        }
      default:
        return commonProps
    }
  }

  // ... (gardez tout le reste du code existant pour l'interface utilisateur, tel que le header, la progression et l'affichage des étapes)

  const CurrentStepComponent = steps[currentStep]?.component

  // Suppose isLoading, handleStepClick, currentConsultationId, currentPatientId and currentDoctorId are defined elsewhere in your codebase.

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
        {/* Header with Language Switcher */}
        {/* ... */}

        {/* Progress Section - Mise à jour pour 6 étapes */}
        <Card className="bg-white shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t('progress.title')}</h2>
            <span className="text-sm text-gray-600">
              {t('progress.stepOf').replace('{current}', String(currentStep + 1)).replace('{total}', String(steps.length))}
            </span>
          </div>
          
          <Progress value={progress} className="mb-6 h-3" />
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                {/* Step indicator */}
                <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${index === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : index < currentStep 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-400 text-white'
                  }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                
                {/* Icon */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3
                  ${index === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : index < currentStep 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                  }`}>
                  {React.cloneElement(step.icon, { className: "h-8 w-8" })}
                </div>
                
                {/* Title */}
                <h3 className={`font-semibold mb-1 text-sm
                  ${index === currentStep 
                    ? 'text-blue-900' 
                    : index < currentStep 
                    ? 'text-green-900' 
                    : 'text-gray-600'
                  }`}>
                  {step.title}
                </h3>
                
                {/* Description */}
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
            {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
