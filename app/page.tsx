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
import KycVerificationDialog from "@/components/kyc-verification-dialog"
import { consultationDataService } from '@/lib/consultation-data-service'
import { supabase } from '@/lib/supabase'
import { useTibokBridge } from '@/hooks/use-tibok-bridge'

export type Language = 'fr' | 'en'

export default function MedicalAIExpert() {
  // Phase 2.D.B: nurse-led gating. When TIBOK marks the iframe as nurse-led,
  // hide steps 3-4 from the chip list and block navigation past step 2.
  const tibokBridge = useTibokBridge()
  const isNurse = tibokBridge.role === 'nurse'

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
  // Track workflow type when coming from consultation hub (to skip type selection in PatientForm)
  const [hubWorkflowType, setHubWorkflowType] = useState<'normal' | 'chronic' | 'dermatology' | undefined>(undefined)
  // Track IDs from consultation hub for document sending
  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null)
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null)
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null)
  const [isSimulation, setIsSimulation] = useState(false)
  // KYC (patient identity) gate — mandatory at the start of every consultation
  const [kycApproved, setKycApproved] = useState<boolean>(false)

  // Load doctor data from URL params (from Tibok) and save to sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const doctorDataParam = urlParams.get('doctorData')

    if (doctorDataParam) {
      try {
        // Handle double-encoded URLs (e.g., from Tibok where %257B = double-encoded {)
        let decodedDoctorData = doctorDataParam

        // Try to decode - keep decoding while it looks encoded
        let attempts = 0
        while (attempts < 3 && (decodedDoctorData.includes('%7B') || decodedDoctorData.includes('%22') || decodedDoctorData.includes('%7D'))) {
          console.log(`👨‍⚕️ Decoding doctor data (attempt ${attempts + 1})...`)
          decodedDoctorData = decodeURIComponent(decodedDoctorData)
          attempts++
        }

        // Fix: Tibok sometimes appends extra URL after the JSON - extract just the JSON
        if (decodedDoctorData.startsWith('{')) {
          const lastBrace = decodedDoctorData.lastIndexOf('}')
          if (lastBrace !== -1 && lastBrace < decodedDoctorData.length - 1) {
            console.log('👨‍⚕️ Found extra content after JSON, trimming from position', lastBrace + 1)
            decodedDoctorData = decodedDoctorData.substring(0, lastBrace + 1)
          }
        }

        console.log('👨‍⚕️ Decoded doctor data:', decodedDoctorData.substring(0, 100) + '...')

        const tibokDoctorData = JSON.parse(decodedDoctorData)
        console.log('👨‍⚕️ Loading doctor data from Tibok:', tibokDoctorData)

        const doctorInfoFromTibok = {
          nom: tibokDoctorData.fullName || tibokDoctorData.full_name ?
            `Dr. ${tibokDoctorData.fullName || tibokDoctorData.full_name}` :
            'Dr. [Name Required]',
          qualifications: tibokDoctorData.qualifications || 'MBBS',
          specialite: tibokDoctorData.specialty || 'General Medicine',
          adresseCabinet: tibokDoctorData.clinic_address || tibokDoctorData.clinicAddress || 'Tibok Teleconsultation Platform',
          email: tibokDoctorData.email || 'Email',
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

        // CRITICAL: Clear old consultation data to start fresh
        // This prevents old localStorage data from contaminating the new consultation
        console.log('🧹 Clearing old consultation data for fresh start...')
        await consultationDataService.clearCurrentConsultation()

        // Phase 2.D.C — doctor handoff hydration.
        // The hub staged a tibokHandoffPayload in sessionStorage when it
        // detected role=doctor + handoff_state=awaiting_doctor. Sequence
        // matters: we run AFTER the localStorage clear above so we rebuild
        // a clean state, and BEFORE setCheckingReturningPatient(false) so
        // the L325 loadSavedData useEffect picks up our writes on the
        // next render. Single-shot: the payload is removed after use.
        try {
          const handoffRaw = sessionStorage.getItem('tibokHandoffPayload')
          if (handoffRaw) {
            const payload = JSON.parse(handoffRaw)
            if (payload?.consultationId) {
              console.log('🩺 [Page] Hydrating from nurse handoff:', payload.consultationId)
              consultationDataService.setCurrentConsultationId(payload.consultationId)
              if (payload.patientData) {
                await consultationDataService.saveStepData(0, payload.patientData)
              }
              if (payload.clinicalData) {
                await consultationDataService.saveStepData(1, payload.clinicalData)
              }
              if (payload.questionsData) {
                await consultationDataService.saveStepData(2, payload.questionsData)
              }
              // Map semantic targetStep → live steps array index. The 5-step
              // workflow has Diagnosis at id=3; if the array ever changes
              // (e.g. workflow split), this lookup keeps the jump correct.
              const targetIndex = steps.findIndex(s =>
                s.title?.toLowerCase().includes(String(payload.targetStep || 'diagnosis').toLowerCase())
              )
              const safeIndex = targetIndex >= 0 ? targetIndex : 3
              setCurrentStep(safeIndex)
              console.log('🩺 [Page] Jumped to step index', safeIndex, '(', payload.targetStep, ')')
              // Phase 2.D.D — single-shot signal to diagnosis-form.tsx so it
              // bypasses the chiefComplaint guard on this mount only. The
              // form clears the flag after triggering the auto-gen.
              sessionStorage.setItem('tibokHandoffJustHydrated', payload.consultationId)
            }
            // Single-shot: clear regardless so a refresh doesn't re-hydrate.
            sessionStorage.removeItem('tibokHandoffPayload')
          }
        } catch (err) {
          console.warn('⚠️ [Page] Failed to hydrate handoff payload:', err)
          sessionStorage.removeItem('tibokHandoffPayload')
        }

        setCheckingReturningPatient(false)
        return
      }

      const urlParams = new URLSearchParams(window.location.search)
      let patientId = urlParams.get('patientId')
      let patientEmail = urlParams.get('patientEmail')
      let patientPhone = urlParams.get('patientPhone')
      const consultationId = urlParams.get('consultationId')
      const doctorId = urlParams.get('doctorId')
      const isSimulation = urlParams.get('mode') === 'simulation'

      // SIMULATION: Store flag early so it propagates through the redirect
      if (isSimulation) {
        console.log('🎮 SIMULATION MODE detected at main page')
        sessionStorage.setItem('isSimulation', 'true')
      }

      // Also extract Tibok patient data from URL if available
      const patientDataParam = urlParams.get('patientData')
      let tibokPatientInfo = null
      if (patientDataParam) {
        try {
          tibokPatientInfo = JSON.parse(decodeURIComponent(patientDataParam))
          console.log('👤 Tibok patient info from URL:', tibokPatientInfo)

          // Extract patient identifiers from tibokPatientInfo if not in URL directly
          if (!patientId && tibokPatientInfo.id) {
            patientId = tibokPatientInfo.id
            console.log('📋 Using patientId from patientData:', patientId)
          }
          if (!patientEmail && tibokPatientInfo.email) {
            patientEmail = tibokPatientInfo.email
            console.log('📋 Using email from patientData:', patientEmail)
          }
          if (!patientPhone && tibokPatientInfo.phone) {
            patientPhone = tibokPatientInfo.phone
            console.log('📋 Using phone from patientData:', patientPhone)
          }
        } catch (e) {
          console.log('⚠️ Could not parse patientData from URL')
        }
      }

      // Need at least one identifier to check history (including consultationId)
      if (!patientId && !patientEmail && !patientPhone && !consultationId) {
        console.log('ℹ️ No patient identifier in URL, proceeding with normal flow')
        setCheckingReturningPatient(false)
        return
      }

      console.log('🔍 Checking if returning patient...', { patientId, patientEmail, patientPhone, consultationId })

      try {
        // Query patient history
        console.log('📡 Calling /api/patient-history...')
        const response = await fetch('/api/patient-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            consultationId,
            email: patientEmail,
            phone: patientPhone
          })
        })

        console.log('📡 Response status:', response.status)

        let consultations: any[] = []
        if (response.ok) {
          const data = await response.json()
          console.log('📡 API response:', data)
          consultations = (data.success && data.consultations) ? data.consultations : []
        } else {
          console.log('⚠️ Could not fetch patient history, status:', response.status)
        }

        // Always redirect to hub for patients coming from Tibok (with consultationId)
        // The hub will handle both new and returning patients
        if (consultationId) {
          console.log(`📋 Patient from Tibok - redirecting to hub (${consultations.length} consultation(s))`)

          // Store patient data for the hub - include Tibok patient info
          sessionStorage.setItem('returningPatientData', JSON.stringify({
            searchCriteria: { patientId, consultationId, doctorId, email: patientEmail, phone: patientPhone },
            consultations: consultations,
            totalConsultations: consultations.length,
            tibokPatientInfo: tibokPatientInfo // Include the Tibok patient data
          }))

          // Preserve URL params for the hub
          const currentParams = window.location.search
          window.location.href = `/consultation-hub${currentParams}&returning=true`
          // Don't set checkingReturningPatient to false - we're redirecting
          return
        } else if (consultations.length >= 1) {
          // Non-Tibok returning patients (searched by email/phone)
          console.log(`📋 Returning patient detected with ${consultations.length} consultation(s) - redirecting to hub`)

          sessionStorage.setItem('returningPatientData', JSON.stringify({
            searchCriteria: { patientId, consultationId, doctorId, email: patientEmail, phone: patientPhone },
            consultations: consultations,
            totalConsultations: consultations.length,
            tibokPatientInfo: tibokPatientInfo
          }))

          const currentParams = window.location.search
          window.location.href = `/consultation-hub${currentParams}&returning=true`
          return
        } else {
          console.log('👤 New patient without consultationId - proceeding with normal flow')
        }
      } catch (error) {
        console.error('❌ Error checking patient history:', error)
        // If we have consultationId, still redirect to hub even on error
        if (consultationId) {
          console.log('📋 Error occurred but have consultationId - redirecting to hub anyway')
          sessionStorage.setItem('returningPatientData', JSON.stringify({
            searchCriteria: { patientId, consultationId, doctorId, email: patientEmail, phone: patientPhone },
            consultations: [],
            totalConsultations: 0,
            tibokPatientInfo: tibokPatientInfo
          }))
          const currentParams = window.location.search
          window.location.href = `/consultation-hub${currentParams}&returning=true`
          return
        }
      }

      setCheckingReturningPatient(false)
    }

    checkReturningPatient()
  }, [])

  // Load prefill data from sessionStorage for existing patient consultation
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('consultationPatientData')
    const isExistingPatient = sessionStorage.getItem('isExistingPatientConsultation')

    // Check simulation mode
    if (sessionStorage.getItem('isSimulation') === 'true') {
      setIsSimulation(true)
      console.log('🎮 Normal consultation page: SIMULATION MODE active')
    }

    if (savedPatientData && isExistingPatient === 'true') {
      try {
        console.log('📋 Loading prefill data from sessionStorage...')
        const patientData = JSON.parse(savedPatientData)
        setPrefillData(patientData)
        console.log('✅ Prefill data loaded:', patientData)

        // Extract and set IDs for document sending at the end of the flow
        if (patientData.consultationId) {
          setCurrentConsultationId(patientData.consultationId)
          // CRITICAL: Also set the consultationDataService ID so it's used throughout the flow
          consultationDataService.setCurrentConsultationId(patientData.consultationId)
          console.log('✅ ConsultationId set from hub:', patientData.consultationId)
        }
        if (patientData.patientId) {
          setCurrentPatientId(patientData.patientId)
          console.log('✅ PatientId set from hub:', patientData.patientId)
        }
        if (patientData.doctorId) {
          setCurrentDoctorId(patientData.doctorId)
          console.log('✅ DoctorId set from hub:', patientData.doctorId)
        }

        // Set workflow type to 'normal' since doctor already selected it in the hub
        // This will skip the consultation type selection in PatientForm
        setHubWorkflowType('normal')
        console.log('✅ Workflow type set to "normal" from hub selection')

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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

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

  // IDs are now managed as state variables above (lines 44-46)

  const handleStepClick = (index: number) => {
    // Phase 2.D.B: nurse may revisit her completed steps but cannot enter
    // the doctor-only steps 3-4 even if she clicks the (hidden) chips.
    if (isNurse && index > 2) {
      console.log(`🚫 Step ${index} access blocked (role=nurse)`)
      return
    }
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

  // Phase 2.D.B: nurse only sees the first three steps (Patient Info,
  // Clinical Data, AI Questions). Step 3 (Diagnosis) and step 4 (Medical
  // Record) are doctor-only. The full `steps` array stays intact so
  // `steps[currentStep]` lookups still work — we just filter the chips.
  const visibleSteps = isNurse ? steps.slice(0, 3) : steps
  const progress = ((Math.min(currentStep, visibleSteps.length - 1) + 1) / visibleSteps.length) * 100

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

  // Phase 2.D.B: nurse cannot advance past step 2. Step 2's submit handler
  // already pushed the questions draft to TIBOK; from here the TIBOK overlay
  // takes over (handoff to doctor).
  if (isNurse && currentStep >= 2) {
    console.log('🚫 Step 3/4 access blocked (role=nurse)')
    return
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
          // Pass workflowType to skip consultation type selection when coming from hub
          workflowType: hubWorkflowType,
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
          isSimulation,
        }
      default:
        return commonProps
    }
  }

  const CurrentStepComponent = steps[currentStep]?.component

  // ===== KYC gate =====
  const kycConsultationId = consultationDataService.getCurrentConsultationId() || currentConsultationId

  // Remember approval for the session so the modal doesn't reappear on step navigation
  useEffect(() => {
    if (typeof window === 'undefined' || !kycConsultationId) return
    if (sessionStorage.getItem(`kyc-approved-${kycConsultationId}`) === 'true') {
      setKycApproved(true)
    }
  }, [kycConsultationId])

  const handleKycConfirmed = () => {
    setKycApproved(true)
    if (typeof window !== 'undefined' && kycConsultationId) {
      sessionStorage.setItem(`kyc-approved-${kycConsultationId}`, 'true')
    }
  }

  // Only gate consultations that were initiated by a patient (have a consultation
  // context) and have identity data to verify against — avoids interrupting a
  // doctor manually creating a brand-new patient.
  const patientHasIdentity = !!(patientData && (patientData.firstName || patientData.lastName))
  const showKyc = !kycApproved && patientHasIdentity && !!kycConsultationId

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
      {/* Mandatory KYC identity verification at consultation start */}
      <KycVerificationDialog
        open={showKyc}
        patientData={patientData}
        consultationId={kycConsultationId}
        patientId={currentPatientId}
        doctorId={currentDoctorId}
        consultationType="general"
        language={language}
        onConfirmed={handleKycConfirmed}
      />
      {/* Simulation Banner */}
      {isSimulation && (
        <div className="bg-purple-100 text-purple-800 text-center py-2 text-sm font-medium sticky top-0 z-50 border-b border-purple-200">
          Mode Simulation — Aucune donnée réelle ne sera affectée
        </div>
      )}
      {/* Modern Header with Gradient */}
      <div className="gradient-primary text-white shadow-xl">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <img
                src="/tibok-logo.png.png"
                alt="TIBOK Logo"
                className="h-8 sm:h-10 w-auto object-contain"
              />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">TIBOK IA DOCTOR</h1>
                <p className="text-blue-100 text-xs sm:text-sm">Assistant Médical Intelligent</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-4"
                onClick={() => window.location.href = '/consultation-hub'}
              >
                <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Consultation</span> Hub
              </Button>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm">
                v2.0
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Progress Section - Modern Design */}
        <Card className="glass-card shadow-2xl border-0 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8 smooth-transition hover-lift">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {t('progress.title')}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Consultation médicale guidée</p>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                {Math.min(currentStep, visibleSteps.length - 1) + 1}/{visibleSteps.length}
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                Étapes
              </span>
            </div>
          </div>

          <Progress value={progress} className="mb-4 sm:mb-6 md:mb-8 h-2 sm:h-3 bg-blue-100" />

          {/* Mobile: Horizontal scroll, Tablet+: Grid */}
          <div className={`flex overflow-x-auto pb-2 gap-3 sm:grid ${isNurse ? 'sm:grid-cols-3 md:grid-cols-3' : 'sm:grid-cols-3 md:grid-cols-5'} sm:gap-4 sm:overflow-visible sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0`}>
            {visibleSteps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`relative flex flex-col items-center text-center p-3 sm:p-4 md:p-5 rounded-xl smooth-transition cursor-pointer transform min-w-[120px] sm:min-w-0 flex-shrink-0 sm:flex-shrink
                  ${index === currentStep
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl sm:scale-105 step-active'
                    : index < currentStep
                    ? 'bg-gradient-to-br from-teal-500 to-teal-500 text-white shadow-lg hover:scale-105 hover:shadow-xl'
                    : 'bg-white/50 backdrop-blur-sm border-2 border-gray-200 opacity-70 cursor-not-allowed'
                  }`}
              >
                {/* Step Number Badge */}
                <div className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg
                  ${index === currentStep
                    ? 'bg-white text-blue-600 ring-2 sm:ring-4 ring-blue-200'
                    : index < currentStep
                    ? 'bg-white text-teal-600 ring-2 sm:ring-4 ring-teal-200'
                    : 'bg-gray-300 text-gray-600'
                  }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>

                {/* Icon Circle */}
                <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4 smooth-transition
                  ${index === currentStep
                    ? 'bg-white/20 backdrop-blur-sm shadow-inner'
                    : index < currentStep
                    ? 'bg-white/20 backdrop-blur-sm'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                  {React.cloneElement(step.icon, { className: "h-6 w-6 sm:h-7 sm:w-7 md:h-9 md:w-9" })}
                </div>

                {/* Title */}
                <h3 className={`font-bold mb-1 sm:mb-2 text-[11px] sm:text-xs md:text-sm leading-tight
                  ${index === currentStep || index < currentStep
                    ? 'text-white'
                    : 'text-gray-600'
                  }`}>
                  {step.title}
                </h3>

                {/* Description - Hidden on mobile */}
                <p className={`text-[10px] sm:text-xs leading-relaxed hidden sm:block
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
                  <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full shadow-lg"></div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Current Step Content - Modern Card */}
        <Card className="glass-card shadow-2xl border-0 overflow-hidden smooth-transition hover-lift">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                  {React.cloneElement(steps[currentStep]?.icon, { className: "h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" })}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {steps[currentStep]?.title}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{steps[currentStep]?.description}</p>
                </div>
              </div>
              <Badge className="gradient-primary text-white border-0 px-3 sm:px-4 py-1.5 sm:py-2 shadow-md text-xs sm:text-sm self-start sm:self-auto flex-shrink-0">
                Étape {currentStep + 1}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8">
            {CurrentStepComponent && <CurrentStepComponent {...getCurrentStepProps()} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
