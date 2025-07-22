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
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')

  // Load language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as 'fr' | 'en'
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  const handleSetLanguage = (lang: 'fr' | 'en') => {
    setLanguage(lang)
    localStorage.setItem('preferred-language', lang)
  }

  const steps = [
    {
      id: 0,
      title: language === 'fr' ? "Informations Patient" : "Patient Information",
      description: language === 'fr' ? "Identité, antécédents, allergies" : "Identity, history, allergies",
      icon: <User className="h-5 w-5" />,
      component: PatientForm,
    },
    {
      id: 1,
      title: language === 'fr' ? "Examen Clinique" : "Clinical Examination",
      description: language === 'fr' ? "Symptômes, signes vitaux, examen physique" : "Symptoms, vital signs, physical exam",
      icon: <Stethoscope className="h-5 w-5" />,
      component: ClinicalForm,
    },
    {
      id: 2,
      title: language === 'fr' ? "Questions IA" : "AI Questions",
      description: language === 'fr' ? "Questions personnalisées générées par l'IA" : "Personalized AI-generated questions",
      icon: <Brain className="h-5 w-5" />,
      component: QuestionsForm,
    },
    {
      id: 3,
      title: language === 'fr' ? "Diagnostic IA" : "AI Diagnosis",
      description: language === 'fr' ? "Analyse diagnostique par intelligence artificielle" : "Diagnostic analysis by artificial intelligence",
      icon: <ClipboardList className="h-5 w-5" />,
      component: DiagnosisForm,
    },
    {
      id: 4,
      title: language === 'fr' ? "Workflow Médical" : "Medical Workflow",
      description: language === 'fr' ? "Traitement complet avec APIs médicales" : "Complete processing with medical APIs",
      icon: <Activity className="h-5 w-5" />,
      component: MedicalWorkflowManager,
    },
    {
      id: 5,
      title: language === 'fr' ? "Consultation Complète" : "Complete Consultation",
      description: language === 'fr' ? "Rapport final et prescriptions" : "Final report and prescriptions",
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
    <div className="min-h-screen bg-black text-white">
      {/* Temporarily disabled to prevent URL clearing
      <PatientDataLoader />
      */}
      
      <div className="container mx-auto px-4 py-8">
        {/* En-tête with Language Switcher */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">TIBOK IA DOCTOR</h1>
              <p className="text-gray-400">
                {language === 'fr' 
                  ? "Système Expert de Diagnostic Médical par Intelligence Artificielle"
                  : "Expert Medical Diagnostic System by Artificial Intelligence"
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="flex items-center gap-2 mr-4">
                <Button
                  variant={language === 'fr' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSetLanguage('fr')}
                  className={language === 'fr' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                >
                  EN
                </Button>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2 text-white border-gray-600">
                GPT-4o + APIs {language === 'fr' ? 'Médicales' : 'Medical'}
              </Badge>
            </div>
          </div>

          {/* Barre de progression */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  {language === 'fr' ? 'Progression' : 'Progress'}
                </span>
                <span className="text-sm text-gray-400">
                  {language === 'fr' ? 'Étape' : 'Step'} {currentStep + 1} {language === 'fr' ? 'sur' : 'of'} {steps.length}
                </span>
              </div>
              <Progress value={progress} className="mb-4 bg-gray-700" />

              {/* Étapes */}
              <div className="flex justify-between">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center text-center ${
                      index <= currentStep ? "text-blue-400" : "text-gray-500"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
                        index <= currentStep ? "bg-blue-900" : "bg-gray-700"
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
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                {steps[currentStep]?.icon}
                {steps[currentStep]?.title}
              </CardTitle>
              <p className="text-gray-400">{steps[currentStep]?.description}</p>
            </CardHeader>
          </Card>
        </div>

        {/* Contenu de l'étape */}
        <div className="[&_*]:bg-gray-900 [&_*]:border-gray-800 [&_*]:text-white">
          {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}
        </div>

        {/* Informations système */}
        <div className="mt-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">GPT-4o</div>
                  <div className="text-sm text-gray-400">{language === 'fr' ? 'Modèle IA' : 'AI Model'}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">5</div>
                  <div className="text-sm text-gray-400">APIs {language === 'fr' ? 'Intégrées' : 'Integrated'}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">EBM</div>
                  <div className="text-sm text-gray-400">Evidence-Based</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">24/7</div>
                  <div className="text-sm text-gray-400">{language === 'fr' ? 'Disponible' : 'Available'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
