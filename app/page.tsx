// app/page.tsx - Modified version with only 5 steps - FIXED

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
  FileSignature
} from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import ProfessionalReport from "@/components/professional-report"
import { consultationDataService } from '@/lib/consultation-data-service'
import { supabase } from '@/lib/supabase'

export type Language = 'fr' | 'en'

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [finalReport, setFinalReport] = useState<any>(null)
  const [language, setLanguage] = useState<Language>('en')

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [prefillData, setPrefillData] = useState<any>({})
  const [checkingReturningPatient, setCheckingReturningPatient] = useState<boolean>(true)

  // Load doctor data from URL params (from Tibok) and save to sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const doctorDataParam = urlParams.get('doctorData')

    if (doctorDataParam) {
      try {
        const tibokDoctorData = JSON.parse(decodeURIComponent(doctorDataParam))
        console.log('👨‍⚕️ Loading doctor data from Tibok:', tibokDoctorData)

        const doctorInfoFromTibok = {
          nom: tibokDoctorData.fullName || tibokDoctorData.full_name ?
            `Dr. ${tibokDoctorData.fullName || tibokDoctorData.full_name}` :
            'Dr. [Name Required]',
          qualifications: tibokDoctorData.qualifications || 'MBBS',
          specialite: tibokDoctorData.specialty || 'General Medicine',
          adresseCabinet: tibokDoctorData.clinic_address || tibokDoctorData.clinicAddress || 'Tibok Teleconsultation Platform',
          email: tibokDoctorData.email || '[Email Required]',
          heuresConsultation: tibokDoctorData.consultation_hours || tibokDoctorData.consultationHours || 'Teleconsultation Hours: 8:00 AM - 8:00 PM',
          numeroEnregistrement: (() => {
            const mcmNumber = tibokDoctorData.mcm_reg_no ||
              tibokDoctorData.medicalCouncilNumber ||
              tibokDoctorData.medical_council_number ||
              tibokDoctorData.license_number ||
              ''
            return mcmNumber && mcmNumber.trim() !== ''
              ? String(mcmNumber)
              : '[MCM Registration Required]'
          })(),
          signatureUrl: tibokDoctorData.signature_url || null,
          digitalSignature: tibokDoctorData.digital_signature || null
        }

        console.log('✅ Doctor info prepared and saving to sessionStorage:', doctorInfoFromTibok)
        sessionStorage.setItem('currentDoctorInfo', JSON.stringify(doctorInfoFromTibok))
      } catch (error) {
        console.error('❌ Error parsing doctor data:', error)
      }
    } else {
      console.log('ℹ️ No doctor data in URL params, checking sessionStorage...')
      const storedDoctorInfo = sessionStorage.getItem('currentDoctorInfo')
      if (storedDoctorInfo) {
        console.log('✅ Doctor info already in sessionStorage')
      } else {
        console.warn('⚠️ No doctor info available')
      }
    }
  }, [])

  // Check for returning patient and redirect to consultation hub if they have history
  useEffect(() => {
    const checkReturningPatient = async () => {
      // Skip if coming from consultation hub (already processed)
      const fromHub = sessionStorage.getItem('fromConsultationHub')
      if (fromHub === 'true') {
        sessionStorage.removeItem('fromConsultationHub')
        console.log('📋 Coming from consultation hub, skipping redirect check')
        setCheckingReturningPatient(false)
        return
      }

      const urlParams = new URLSearchParams(window.location.search)
      const patientId = urlParams.get('patientId')
      const patientEmail = urlParams.get('patientEmail')
      const patientPhone = urlParams.get('patientPhone')

      // Need at least one identifier to check history
      if (!patientId && !patientEmail && !patientPhone) {
        console.log('ℹ️ No patient identifier in URL, proceeding with normal flow')
        setCheckingReturningPatient(false)
        return
      }

      console.log('🔍 Checking if returning patient...', { patientId, patientEmail, patientPhone })

      try {
        // Query patient history
        console.log('📡 Calling /api/patient-history...')
        const response = await fetch('/api/patient-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            email: patientEmail,
            phone: patientPhone
          })
        })

        console.log('📡 Response status:', response.status)

        if (!response.ok) {
          console.log('⚠️ Could not fetch patient history, proceeding with normal flow. Status:', response.status)
          setCheckingReturningPatient(false)
          return
        }

        const data = await response.json()
        console.log('📡 API response:', data)

        if (data.success && data.consultations && data.consultations.length >= 1) {
          console.log(`📋 Returning patient detected with ${data.consultations.length} consultation(s) - redirecting to hub`)

          // Store patient data for the hub
          sessionStorage.setItem('returningPatientData', JSON.stringify({
            searchCriteria: { patientId, email: patientEmail, phone: patientPhone },
            consultations: data.consultations,
            totalConsultations: data.consultations.length
          }))

          // Preserve URL params for the hub
          const currentParams = window.location.search
          window.location.href = `/consultation-hub${currentParams}&returning=true`
          // Don't set checkingReturningPatient to false - we're redirecting
          return
        } else {
          console.log('👤 New patient - proceeding with normal flow')
        }
      } catch (error) {
        console.error('❌ Error checking patient history:', error)
        // Continue with normal flow on error
      }

      setCheckingReturningPatient(false)
    }

    checkReturningPatient()
  }, [])

  // Load prefill data from sessionStorage for existing patient consultation
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('consultationPatientData')
    const isExistingPatient = sessionStorage.getItem('isExistingPatientConsultation')

    if (savedPatientData && isExistingPatient === 'true') {
      try {
        console.log('📋 Loading prefill data from sessionStorage...')
        const patientData = JSON.parse(savedPatientData)
        setPrefillData(patientData)
        console.log('✅ Prefill data loaded:', patientData)

        // Clean up sessionStorage after reading
        sessionStorage.removeItem('consultationPatientData')
        sessionStorage.removeItem('isExistingPatientConsultation')
      } catch (error) {
        console.error('❌ Error loading prefill data:', error)
      }
    }
  }, [])

  // Load saved consultation data into parent state whenever step changes
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await consultationDataService.getAllData()
        console.log('📦 Loading saved consultation data into parent state (step', currentStep, '):', savedData)

        // Only load patientData if we don't have prefillData (to avoid overriding consultation hub data)
        if (savedData?.patientData && Object.keys(prefillData).length === 0) {
          console.log('✅ Loading saved patient data into parent state')
          setPatientData(savedData.patientData)
        }

        // Always load clinical, questions, and diagnosis data
        if (savedData?.clinicalData) {
          console.log('✅ Loading saved clinical data into parent state')
          setClinicalData(savedData.clinicalData)
        }

        if (savedData?.questionsData) {
          console.log('✅ Loading saved questions data into parent state')
          setQuestionsData(savedData.questionsData)
        }

        if (savedData?.diagnosisData) {
          console.log('✅ Loading saved diagnosis data into parent state')
          setDiagnosisData(savedData.diagnosisData)
        }
      } catch (error) {
        console.error('❌ Error loading saved consultation data:', error)
      }
    }

    loadSavedData()
  }, [currentStep, prefillData])

  // Listen for prescription renewal detection from Tibok data
useEffect(() => {
  const handleRenewalDetected = (event: CustomEvent) => {
    console.log('💊 Prescription renewal event received:', event.detail)

    // Update clinical data with the consultation reason
    setClinicalData(prev => ({
      ...prev,
      chiefComplaint: event.detail.consultationReason
    }))
  }

  window.addEventListener('prescription-renewal-detected', handleRenewalDetected as EventListener)

  return () => {
    window.removeEventListener('prescription-renewal-detected', handleRenewalDetected as EventListener)
  }
}, [])

  const currentConsultationId: string | null = null
  const currentPatientId: string | null = null
  const currentDoctorId: string | null = null

  const handleStepClick = (index: number) => {
    if (index <= currentStep) {
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
      // Step 4: Complete medical record (report + prescriptions)
      id: 4,
      title: t('steps.finalReport.title'),
      description: t('steps.finalReport.description'),
      icon: <FileSignature className="h-5 w-5" />,
      component: ProfessionalReport,
    }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

const handleNext = async () => {
  const consultationId = consultationDataService.getCurrentConsultationId()

  if (consultationId) {
    try {
      console.log(`✅ Moving from step ${currentStep} to step ${currentStep + 1}`)

      // Reload latest data from localStorage (forms save synchronously before calling onNext)
      const savedData = await consultationDataService.getAllData()
      console.log('🔍 Data in localStorage:', {
        hasPatientData: !!savedData?.patientData,
        hasClinicalData: !!savedData?.clinicalData,
        hasQuestionsData: !!savedData?.questionsData,
        hasDiagnosisData: !!savedData?.diagnosisData
      })

      // Update state with loaded data
      if (savedData?.patientData) setPatientData(savedData.patientData)
      if (savedData?.clinicalData) setClinicalData(savedData.clinicalData)
      if (savedData?.questionsData) setQuestionsData(savedData.questionsData)
      if (savedData?.diagnosisData) setDiagnosisData(savedData.diagnosisData)

      // Special handling for step 0 (Patient Form)
      if (currentStep === 0) {
        if (savedData?.patientData) {
          await consultationDataService.saveStepData(0, savedData.patientData)
          
          // Check if chief complaint indicates prescription renewal
          const chiefComplaint = clinicalData?.chiefComplaint || ''
          const lowerComplaint = chiefComplaint.toLowerCase()
          
          // Check for ALL possible variations
          const renewalKeywords = [
            'order renewal',
            'prescription renewal',
            'renouvellement',
            'ordonnance',
            'renewal',
            'refill',
            'medication renewal',
            'repeat prescription',
            'médicament',
            'renouveler'
          ]
          
          const isRenewal = renewalKeywords.some(keyword => 
            lowerComplaint.includes(keyword)
          )
          
          if (isRenewal) {
            console.log('💊 Prescription renewal detected:', chiefComplaint)
            console.log('💊 Jumping directly to Professional Report (step 4)')
            
            // Set a flag for renewal mode
            consultationDataService.setPrescriptionRenewalFlag(true)
            
            // Save minimal clinical data for prescription renewal
            const renewalClinicalData = {
              chiefComplaint: chiefComplaint,
              diseaseHistory: "Patient requesting prescription renewal",
              symptomDuration: "ongoing",
              symptoms: [],
              painScale: "0",
              vitalSigns: {
                temperature: "",
                bloodPressureSystolic: "",
                bloodPressureDiastolic: ""
              }
            }
            await consultationDataService.saveStepData(1, renewalClinicalData)
            
            // Jump directly to step 4 (Professional Report)
            setCurrentStep(4)
            return
          }
        }
      }
      
      // Forms now save synchronously before calling onNext
      // Data should already be in localStorage
      console.log(`✅ Step ${currentStep} data verified in localStorage`)
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
  
  const handleFinalReportComplete = async (data: any) => {
    console.log('Final report and documents completed:', data)
    setFinalReport(data)
    
    const consultationId = consultationDataService.getCurrentConsultationId()
    if (consultationId) {
      try {
        // Save complete medical record
        await consultationDataService.saveStepData(4, data)
        // Mark consultation as complete
        await consultationDataService.markConsultationComplete()
        console.log('Consultation completed successfully')
        
        // Optional: redirect or success message
        // router.push('/consultation-complete')
      } catch (error) {
        console.error('Error saving final report:', error)
      }
    }
  }

  // CRITICAL FIX: Changed all 'initialData' to 'data' to match component prop expectations
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
          // Merge prefillData with patientData - prefillData takes priority if exists
          data: Object.keys(prefillData).length > 0 ? { ...patientData, ...prefillData } : patientData,
          onDataChange: setPatientData,
          onNext: handleNext,
        }
      case 1:
        return {
          ...commonProps,
          patientData,
          data: clinicalData,  // ✅ FIXED: Changed from initialData to data
          onDataChange: setClinicalData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 2:
        return {
          ...commonProps,
          patientData,
          clinicalData,
          data: questionsData,  // ✅ FIXED: Changed from initialData to data
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
          data: diagnosisData,  // ✅ FIXED: Changed from initialData to data
          onDataChange: setDiagnosisData,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }
      case 4:
        // Final step: generation and editing of complete record
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 opacity-20 blur-xl animate-pulse"></div>
          </div>
          <p className="mt-6 text-lg font-medium bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {t('loading')}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Préparation de votre consultation...</p>
        </div>
      </div>
    )
  }

  // Show loading screen while checking for returning patient
  if (checkingReturningPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading consultation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Modern Header with Gradient */}
      <div className="gradient-primary text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/tibok-logo.svg" 
                alt="TIBOK Logo" 
                className="h-10 w-auto object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">TIBOK IA DOCTOR</h1>
                <p className="text-blue-100 text-sm">Assistant Médical Intelligent</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
                onClick={() => window.location.href = '/consultation-hub'}
              >
                <Stethoscope className="h-4 w-4 mr-2" />
                Consultation Hub
              </Button>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
                Version 2.0
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Navigation Card */}
        <Card className="glass-card shadow-xl border-0 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Accès Rapide aux Consultations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 hover:bg-blue-50 hover:border-blue-300"
              onClick={() => window.location.href = '/consultation-hub'}
            >
              <div className="flex items-center gap-2 w-full">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Consultation Hub</span>
              </div>
              <span className="text-xs text-gray-600 text-left">
                Routage intelligent • Historique patient • Suivi automatique
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => window.location.href = '/dermatology'}
            >
              <div className="flex items-center gap-2 w-full">
                <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-semibold">Dermatologie</span>
              </div>
              <span className="text-xs text-gray-600 text-left">
                Analyse d'images • OCR • Diagnostic dermatologique
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 hover:bg-red-50 hover:border-red-300"
              onClick={() => window.location.href = '/chronic-disease'}
            >
              <div className="flex items-center gap-2 w-full">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="font-semibold">Maladies Chroniques</span>
              </div>
              <span className="text-xs text-gray-600 text-left">
                Diabète • Hypertension • Suivi long terme
              </span>
            </Button>
          </div>
        </Card>

        {/* Progress Section - Modern Design */}
        <Card className="glass-card shadow-2xl border-0 p-6 mb-8 smooth-transition hover-lift">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {t('progress.title')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Consultation médicale guidée</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {currentStep + 1}/{steps.length}
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Étapes
              </span>
            </div>
          </div>
          
          <Progress value={progress} className="mb-8 h-3 bg-blue-100" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`relative flex flex-col items-center text-center p-5 rounded-xl smooth-transition cursor-pointer transform
                  ${index === currentStep 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl scale-105 step-active' 
                    : index < currentStep 
                    ? 'bg-gradient-to-br from-teal-500 to-teal-500 text-white shadow-lg hover:scale-105 hover:shadow-xl' 
                    : 'bg-white/50 backdrop-blur-sm border-2 border-gray-200 opacity-70 cursor-not-allowed'
                  }`}
              >
                {/* Step Number Badge */}
                <div className={`absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg
                  ${index === currentStep 
                    ? 'bg-white text-blue-600 ring-4 ring-blue-200' 
                    : index < currentStep 
                    ? 'bg-white text-teal-600 ring-4 ring-teal-200' 
                    : 'bg-gray-300 text-gray-600'
                  }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                
                {/* Icon Circle */}
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 smooth-transition
                  ${index === currentStep 
                    ? 'bg-white/20 backdrop-blur-sm shadow-inner' 
                    : index < currentStep 
                    ? 'bg-white/20 backdrop-blur-sm' 
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                  {React.cloneElement(step.icon, { className: "h-9 w-9" })}
                </div>
                
                {/* Title */}
                <h3 className={`font-bold mb-2 text-sm leading-tight
                  ${index === currentStep || index < currentStep
                    ? 'text-white' 
                    : 'text-gray-600'
                  }`}>
                  {step.title}
                </h3>
                
                {/* Description */}
                <p className={`text-xs leading-relaxed
                  ${index === currentStep 
                    ? 'text-blue-100' 
                    : index < currentStep 
                    ? 'text-teal-100' 
                    : 'text-gray-500'
                  }`}>
                  {step.description}
                </p>
                
                {/* Active Indicator */}
                {index === currentStep && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Current Step Content - Modern Card */}
        <Card className="glass-card shadow-2xl border-0 overflow-hidden smooth-transition hover-lift">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                {React.cloneElement(steps[currentStep]?.icon, { className: "h-7 w-7 text-white" })}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {steps[currentStep]?.title}
                </CardTitle>
                <p className="text-muted-foreground mt-1">{steps[currentStep]?.description}</p>
              </div>
              <Badge className="gradient-primary text-white border-0 px-4 py-2 shadow-md">
                Étape {currentStep + 1}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
