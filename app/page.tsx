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
import { supabase } from '@/lib/supabase' // Adjust this path to match your setup

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  const [language, setLanguage] = useState<Language>('fr')
  
  // Add state to track the consultation
  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null)
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null)
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Initialize consultation from URL or create new one
  useEffect(() => {
    const initializeFromUrl = async () => {
      try {
        setIsLoading(true)
        const urlParams = new URLSearchParams(window.location.search)
        const consultationId = urlParams.get('consultationId')
        const patientId = urlParams.get('patientId')
        
        if (consultationId) {
          // Load existing consultation
          const { data: consultation } = await supabase
            .from('consultations')
            .select('*')
            .eq('id', consultationId)
            .single()
          
          if (consultation) {
            setCurrentConsultationId(consultation.id)
            setCurrentPatientId(consultation.patient_id)
            setCurrentDoctorId(consultation.doctor_id)
            
            // Load existing consultation data
            const loadedData = await consultationDataService.loadConsultationData(consultationId)
            
            if (loadedData) {
              // Restore saved data
              if (loadedData.patientInfo) setPatientData(loadedData.patientInfo)
              if (loadedData.clinicalExam) setClinicalData(loadedData.clinicalExam)
              if (loadedData.aiQuestions) setQuestionsData(loadedData.aiQuestions)
              if (loadedData.diagnosis) setDiagnosisData(loadedData.diagnosis)
              if (loadedData.documents) setWorkflowResult(loadedData.documents)
              
              // Find the last completed step
              const stepData = [
                loadedData.patientInfo,
                loadedData.clinicalExam,
                loadedData.aiQuestions,
                loadedData.diagnosis,
                loadedData.documents
              ]
              
              let lastCompletedStep = -1
              stepData.forEach((data, index) => {
                if (data) {
                  lastCompletedStep = index
                }
              })
              
              // Set current step to the next uncompleted step
              if (lastCompletedStep < stepData.length - 1) {
                setCurrentStep(lastCompletedStep + 1)
              } else {
                setCurrentStep(lastCompletedStep)
              }
            }
          }
        } else if (patientId) {
          // Create new consultation for existing patient
          setCurrentPatientId(patientId)
          
          // Get current doctor (from auth or session)
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: doctor } = await supabase
              .from('doctors')
              .select('id')
              .eq('user_id', user.id)
              .single()
            
            if (doctor) {
              setCurrentDoctorId(doctor.id)
            }
          }
        } else {
          // Get current doctor for new consultation
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: doctor } = await supabase
              .from('doctors')
              .select('id')
              .eq('user_id', user.id)
              .single()
            
            if (doctor) {
              setCurrentDoctorId(doctor.id)
            }
          }
        }
      } catch (error) {
        console.error('Error initializing from URL:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeFromUrl()
  }, [])

  // Create or update consultation when we have patient data
  useEffect(() => {
    const handleConsultation = async () => {
      // Need patient data from form and IDs
      if (!patientData || !patientData.firstName || isLoading) return
      
      let patientId = currentPatientId
      let consultationId = currentConsultationId
      
      try {
        // If no patient ID, create or find patient
        if (!patientId) {
          // Check if patient exists by email
          if (patientData.email) {
            const { data: existingPatient } = await supabase
              .from('patients')
              .select('id')
              .eq('email', patientData.email)
              .single()
            
            if (existingPatient) {
              patientId = existingPatient.id
            }
          }
          
          // Create new patient if needed
          if (!patientId) {
            const { data: newPatient, error } = await supabase
              .from('patients')
              .insert({
                first_name: patientData.firstName,
                last_name: patientData.lastName,
                email: patientData.email,
                phone_number: patientData.phone,
                date_of_birth: patientData.dateOfBirth,
                gender: patientData.gender,
                age: patientData.age,
                height: patientData.height,
                weight: patientData.weight,
                address: patientData.address,
                city: patientData.city,
                country: patientData.country || 'Mauritius',
                emergency_contact_name: patientData.emergencyContact,
                emergency_contact_phone: patientData.emergencyPhone
              })
              .select()
              .single()
            
            if (error) {
              console.error('Error creating patient:', error)
              return
            }
            
            if (newPatient) {
              patientId = newPatient.id
              setCurrentPatientId(patientId)
            }
          }
        }
        
        // If no consultation ID, create new consultation
        if (!consultationId && patientId && currentDoctorId) {
          // Get next queue number
          const { data: lastConsultation } = await supabase
            .from('consultations')
            .select('queue_number')
            .eq('doctor_id', currentDoctorId)
            .eq('status', 'waiting')
            .order('queue_number', { ascending: false })
            .limit(1)
            .single()
          
          const nextQueueNumber = lastConsultation ? lastConsultation.queue_number + 1 : 1
          
          // Create new consultation
          const { data: newConsultation, error } = await supabase
            .from('consultations')
            .insert({
              patient_id: patientId,
              doctor_id: currentDoctorId,
              queue_number: nextQueueNumber,
              status: 'in_progress',
              patient_first_name: patientData.firstName,
              patient_last_name: patientData.lastName,
              patient_age: patientData.age,
              patient_gender: patientData.gender,
              patient_height: patientData.height,
              patient_weight: patientData.weight,
              patient_date_of_birth: patientData.dateOfBirth
            })
            .select()
            .single()
          
          if (error) {
            console.error('Error creating consultation:', error)
            return
          }
          
          if (newConsultation) {
            consultationId = newConsultation.id
            setCurrentConsultationId(consultationId)
            
            // Initialize consultation record
            await consultationDataService.initializeConsultation(
              consultationId,
              patientId,
              currentDoctorId
            )
            
            // Update URL with consultation ID
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.set('consultationId', consultationId)
            window.history.replaceState({}, '', newUrl.toString())
          }
        }
        
        // Save current step data
        if (consultationId) {
          await consultationDataService.saveStepData(0, patientData)
        }
      } catch (error) {
        console.error('Error handling consultation:', error)
      }
    }
    
    handleConsultation()
  }, [patientData, currentPatientId, currentDoctorId, isLoading])

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
      component: DiagnosisForm,
    },
    {
      id: 4,
      title: "Édition des documents médicaux",
      description: "Génération et personnalisation des rapports",
      icon: <Activity className="h-5 w-5" />,
      component: MedicalWorkflow,
    },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = async () => {
    // Save current step data before moving forward
    if (currentConsultationId) {
      try {
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

  const handleWorkflowComplete = (result: any) => {
    setWorkflowResult(result)
    console.log('Workflow terminé:', result)
  }

  const handleMedicalWorkflowComplete = async (result: any) => {
    setWorkflowResult(result)
    
    // Save the final workflow result
    if (currentConsultationId) {
      try {
        await consultationDataService.saveStepData(4, result)
        
        // Update consultation status to completed
        await supabase
          .from('consultations')
          .update({ 
            status: 'completed',
            actual_end_time: new Date().toISOString()
          })
          .eq('id', currentConsultationId)
      } catch (error) {
        console.error('Error completing workflow:', error)
      }
    }
    
    console.log('Workflow médical terminé:', result)
  }

  // Navigation directe vers une étape
  const handleStepClick = async (stepIndex: number) => {
    // Save current step data before navigating
    if (currentConsultationId) {
      try {
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
        }
      } catch (error) {
        console.error('Error saving current step data:', error)
      }
    }
    
    setCurrentStep(stepIndex)
  }

  const getCurrentStepProps = () => {
    const commonProps = { 
      language, 
      consultationId: currentConsultationId,
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
              {/* Consultation ID Badge */}
              {currentConsultationId && (
                <Badge variant="outline" className="text-xs">
                  ID: {currentConsultationId.slice(-8)}
                </Badge>
              )}
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
      </div>
    </div>
  )
}
