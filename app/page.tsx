// app/page.tsx - Modified version with only 5 steps - FIXED

"use client"

import { useState, useEffect, useRef } from "react"
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

import { readLocalIdentity } from "@/lib/consultation-identity"
import NavigationGuard from "@/components/navigation-guard"
import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import ProfessionalReport from "@/components/professional-report"
import KycVerificationDialog from "@/components/kyc-verification-dialog"
import { consultationDataService } from '@/lib/consultation-data-service'
import { supabase } from '@/lib/supabase'
import { useTibokBridge } from '@/hooks/use-tibok-bridge'
import ConsultationTimerBar from '@/components/consultation-timer-bar'
import ViewportLayer from '@/components/viewport-layer'
import {
  type TimerState,
  SECTION_BY_STEP,
  TOTAL_BUDGET_SECONDS,
  allSectionSeconds,
  clearState,
  emptyState,
  enterSection,
  loadState,
  saveState,
  stopTimer,
  subscribeAiBusy,
  subscribeAiElapsed,
  totalSeconds,
} from '@/lib/consultation-timer'

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

  // ==================== CONSULTATION CLOCK ====================
  //
  // Driven from `currentStep` rather than from each navigation handler: the
  // step is set from six different places, including the restore path that
  // reopens a consultation where the doctor left it, and a clock that missed
  // one of them would quietly under-report.
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const timerRef = React.useRef<TimerState | null>(null)
  timerRef.current = timer

  /**
   * Send the current measurement. Called at every transition, not only at the
   * end: a consultation abandoned halfway is exactly the one worth seeing, and
   * writing only at signature would leave no trace of it at all.
   */
  const reportTiming = React.useCallback((state: TimerState, supersedes?: string) => {
    fetch('/api/consultation-timings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultationId: state.consultationId,
        doctorId: currentDoctorId,
        patientId: currentPatientId,
        consultationType: 'general',
        startedAt: new Date(state.startedAt).toISOString(),
        endedAt: state.endedAt ? new Date(state.endedAt).toISOString() : null,
        totalSeconds: totalSeconds(state),
        aiWaitSeconds: state.aiWaitSeconds,
        sectionSeconds: allSectionSeconds(state),
        questionCount: state.questionCount,
        budgetSeconds: TOTAL_BUDGET_SECONDS,
        // The row written under the temporary id describes the same
        // consultation and must not survive as a phantom "abandoned at 49s".
        supersedes: supersedes || null,
      }),
      keepalive: true,
      // A measurement must never take a consultation down with it.
    }).catch(() => {})
  }, [currentDoctorId, currentPatientId])

  /** Where the doctor was, per consultation. See the restore effect below. */
  const STEP_KEY = 'consultation-step-'

  // Replaying the same consultation on a test bench inherits the clock from the
  // previous run, because it is meant to survive a reload. `?resetTimer=1`
  // starts it over; done once per page load, not on every step.
  const timerResetRef = React.useRef(false)

  useEffect(() => {
    const consultationId =
      consultationDataService.getCurrentConsultationId() || currentConsultationId
    if (!consultationId) return

    const section = SECTION_BY_STEP[currentStep]
    if (!section) return

    if (!timerResetRef.current) {
      timerResetRef.current = true
      const params = new URLSearchParams(window.location.search)
      // `?fresh=1` restarts a test consultation from nothing: the clock AND
      // the saved position. `?resetTimer=1` is kept for the clock alone.
      // Both exist for the test bench, where the same consultation is replayed
      // over and over and inherits its own previous run — which is right in
      // production and useless here.
      const fresh = params.get('fresh') === '1'
      if (fresh || params.get('resetTimer') === '1') {
        console.log('⏱️ Timer reset requested for', consultationId)
        clearState(consultationId)
      }
      if (fresh) {
        try {
          localStorage.removeItem(STEP_KEY + consultationId)
          console.log('↩️ Saved position cleared for', consultationId)
        } catch {
          // Nothing to do: an unreadable store has nothing to clear.
        }
      }
    }

    setTimer((prev) => {
      let base: TimerState
      let supersededId: string | undefined

      if (prev && prev.consultationId === consultationId) {
        base = prev
      } else if (
        prev &&
        prev.endedAt == null &&
        // ONLY from a temporary identifier to a real one.
        //
        // The consultation is given its TIBOK identifier only when the doctor
        // leaves the first step, so the clock starts under a locally generated
        // id and finds itself under another. Read as a different consultation
        // that would restart the total on the way into Clinical Data, which is
        // the one number the doctor is meant to be able to trust — hence the
        // re-key.
        //
        // But re-keying on ANY change of id was wrong, and it showed: a doctor
        // opening a new consultation while an earlier one was still running in
        // the same browser had the old clock adopted by the new consultation.
        // 34bc481b was created at 11:54 and recorded as started at 09:44 —
        // two hours and ten minutes before it existed. One real identifier
        // giving way to another is not a hand-over, it is a different patient.
        prev.consultationId.startsWith('consultation_') &&
        !consultationId.startsWith('consultation_')
      ) {
        console.log('⏱️ Consultation re-keyed:', prev.consultationId, '→', consultationId)
        clearState(prev.consultationId)
        supersededId = prev.consultationId
        base = { ...prev, consultationId }
      } else {
        // Fresh mount: resume what was stored, or start. Reload picks the clock
        // back up rather than restarting it — losing it on a refresh would make
        // every measurement a guess, and refreshes happen.
        base = loadState(consultationId) || emptyState(consultationId)
      }

      if (base.endedAt != null) return base
      const next = enterSection(base, section)
      // `enterSection` returns the same object when the section has not
      // changed, which happens on a plain re-key — but the new id still has to
      // be persisted, or a reload would find nothing under it.
      if (next === base && base === prev) return base

      saveState(next)
      reportTiming(next, supersededId)
      return next
    })
  }, [currentStep, currentConsultationId, reportTiming])

  // The clock does not stop for the models, so the bar says when they are the
  // reason it is moving; their share is banked separately so a slow model can
  // be told apart from a slow doctor.
  useEffect(() => subscribeAiBusy(setAiBusy), [])
  useEffect(
    () =>
      subscribeAiElapsed((seconds) => {
        setTimer((prev) => {
          if (!prev || prev.endedAt != null) return prev
          const next = { ...prev, aiWaitSeconds: prev.aiWaitSeconds + seconds }
          saveState(next)
          return next
        })
      }),
    [],
  )

  // The number of questions sets the budget for that step: one minute each,
  // and the case produces three or five of them.
  //
  // The questions step reports `{ responses: [...] }` — neither of the two
  // shapes this first guessed at, so the count never resolved and every
  // consultation was recorded with zero questions, leaving the budget for
  // that step uncomputable on the dashboard.
  useEffect(() => {
    const list = Array.isArray(questionsData?.responses)
      ? questionsData.responses
      : Array.isArray(questionsData?.questions)
        ? questionsData.questions
        : Array.isArray(questionsData)
          ? questionsData
          : null
    // Zero is not a count, it is the state before the questions exist.
    const count = list && list.length > 0 ? list.length : null
    if (count == null) return
    setTimer((prev) => {
      if (!prev || prev.questionCount === count) return prev
      const next = { ...prev, questionCount: count }
      saveState(next)
      return next
    })
  }, [questionsData])

  /** The report was signed: freeze the clock and write the final record. */
  const stopConsultationTimer = React.useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.endedAt != null) return prev
      const next = stopTimer(prev)
      saveState(next)
      reportTiming(next)
      return next
    })
  }, [reportTiming])

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

  // ==================== WHERE THE DOCTOR WAS ====================
  //
  // The step index lived in React state and nowhere else, so any reload — a
  // pull-to-refresh reaching TIBOK through our iframe, a browser reclaiming
  // memory on a phone, a crash — sent the doctor back to "Patient information"
  // with a consultation half done. The data survived in storage; only the
  // position was thrown away, which is the one part that cannot be retyped
  // from memory.
  //
  // Keyed by consultation so one consultation cannot restore into another,
  // and only restored when the step it names has data behind it: a saved
  // index of 4 on a consultation whose clinical data was cleared would open
  // the medical record on nothing.
  const stepRestoredRef = useRef(false)

  useEffect(() => {
    if (checkingReturningPatient) return
    if (stepRestoredRef.current) return
    stepRestoredRef.current = true

    const restore = async () => {
      try {
        const { consultationId } = readLocalIdentity()
        if (!consultationId) return

        const raw = localStorage.getItem(STEP_KEY + consultationId)
        const saved = raw === null ? NaN : Number(raw)
        if (!Number.isFinite(saved) || saved <= 0) return

        // How far the data actually goes. Restoring past it would open a step
        // on an empty form and look like the work had been lost anyway.
        const savedData = await consultationDataService.getAllData()
        let reachable = 0
        if (savedData?.patientData) reachable = 1
        if (savedData?.clinicalData) reachable = 2
        if (savedData?.questionsData) reachable = 3
        if (savedData?.diagnosisData) reachable = 4

        const target = Math.min(Math.round(saved), reachable, steps.length - 1)
        if (target > 0) {
          console.log(`↩️ Restoring the consultation at step ${target} (saved ${saved}, data reaches ${reachable})`)
          setCurrentStep(target)
        }
      } catch (error) {
        console.warn('↩️ Could not restore the workflow position:', error)
      }
    }

    void restore()
  }, [checkingReturningPatient])

  useEffect(() => {
    // Written after the restore has had its chance, so the initial 0 of a
    // fresh mount cannot overwrite the position it is about to read.
    if (!stepRestoredRef.current) return
    try {
      const { consultationId } = readLocalIdentity()
      if (consultationId) {
        localStorage.setItem(STEP_KEY + consultationId, String(currentStep))
      }
    } catch {
      // A full or unavailable store costs the restore, not the consultation.
    }
  }, [currentStep])

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
  // Step 3 runs the diagnosis engine and is no longer a screen the doctor
  // reads: it produced a page that repeated, uneditable, what the medical
  // record shows next. The step still exists — it is what builds the
  // prescriptions, the investigations and the triage — but it hands over on
  // its own, so it is not offered as somewhere to go.
  const HIDDEN_STEP_IDS = isNurse ? [] : [3]
  const visibleSteps = (isNurse ? steps.slice(0, 3) : steps).filter(
    (step) => !HIDDEN_STEP_IDS.includes(step.id),
  )

  // While the hidden step runs, the destination is what to highlight: the
  // doctor is on their way to the record, not stalled between two chips.
  const activeStepId = HIDDEN_STEP_IDS.includes(currentStep) ? currentStep + 1 : currentStep
  const activePosition = Math.max(0, visibleSteps.findIndex((step) => step.id === activeStepId))
  const progress = ((activePosition + 1) / visibleSteps.length) * 100

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
    // Before anything else: the consultation is over, and how long it took
    // should not include whatever the completion handler does next.
    stopConsultationTimer()
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
          // Runs and hands over; the doctor reads the medical record, not this.
          autoAdvance: true,
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
          onSigned: stopConsultationTimer,
          onPrevious: handlePrevious,
          isSimulation,
        }
      default:
        return commonProps
    }
  }

  const CurrentStepComponent = steps[currentStep]?.component

  // ===== KYC gate =====
  // TEST-ONLY: append ?kycTest=1 to the URL to preview the KYC popup without
  // coming from TIBOK (seeds a fake patient and bypasses the consultation gate).
  const kycTestMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('kycTest') === '1'

  useEffect(() => {
    if (!kycTestMode) return
    if (!patientData || !(patientData.firstName || patientData.lastName)) {
      setPatientData((prev: any) => ({
        firstName: 'Jean',
        lastName: 'Dupont',
        birthDate: '1983-05-14',
        age: '42',
        gender: 'Male',
        ...(prev || {}),
      }))
    }
  }, [kycTestMode])

  const kycConsultationId =
    consultationDataService.getCurrentConsultationId() ||
    currentConsultationId ||
    (kycTestMode ? 'kyc-test-preview' : null)

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
  const showKyc = !kycApproved && patientHasIdentity && (!!kycConsultationId || kycTestMode)

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
                {activePosition + 1}/{visibleSteps.length}
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                Étapes
              </span>
            </div>
          </div>

          <Progress value={progress} className="mb-3 sm:mb-4 h-2 sm:h-3 bg-blue-100" />

          {/* Pinned to the top of the viewport, so it stays in sight while the
              doctor scrolls through a long form. It carries no controls and
              the layer takes no pointer events, so it cannot intercept a
              click meant for the page beneath it. */}
          {/* Pushed below the simulation banner when there is one.
              That banner is `sticky top-0 z-50` — above this layer and at the
              same place — so in simulation mode it sat squarely on top of the
              clock and the doctor could not see the time at all. */}
          {timer && (
            <ViewportLayer
              className={`left-1/2 -translate-x-1/2 max-w-[96vw] ${isSimulation ? 'top-12' : 'top-2'}`}
            >
              <ConsultationTimerBar state={timer} aiBusy={aiBusy} language="fr" />
            </ViewportLayer>
          )}

          {/* Armed once there is work to lose. On step 0 an accidental reload
              costs nothing, and a browser confirmation on an empty form is
              noise the doctor will learn to dismiss without reading — which is
              exactly how it stops working on the step where it matters. */}
          <NavigationGuard
            active={currentStep > 0}
            language="fr"
            topClass={isSimulation ? 'top-24' : 'top-14'}
          />

          {/* Mobile: Horizontal scroll, Tablet+: Grid */}
          <div className={`flex overflow-x-auto pb-2 gap-3 sm:grid ${isNurse ? 'sm:grid-cols-3 md:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-4'} sm:gap-4 sm:overflow-visible sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0`}>
            {visibleSteps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={`relative flex flex-col items-center text-center p-3 sm:p-4 md:p-5 rounded-xl smooth-transition cursor-pointer transform min-w-[120px] sm:min-w-0 flex-shrink-0 sm:flex-shrink
                  ${step.id === activeStepId
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl sm:scale-105 step-active'
                    : step.id < activeStepId
                    ? 'bg-gradient-to-br from-teal-500 to-teal-500 text-white shadow-lg hover:scale-105 hover:shadow-xl'
                    : 'bg-white/50 backdrop-blur-sm border-2 border-gray-200 opacity-70 cursor-not-allowed'
                  }`}
              >
                {/* Step Number Badge */}
                <div className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg
                  ${step.id === activeStepId
                    ? 'bg-white text-blue-600 ring-2 sm:ring-4 ring-blue-200'
                    : step.id < activeStepId
                    ? 'bg-white text-teal-600 ring-2 sm:ring-4 ring-teal-200'
                    : 'bg-gray-300 text-gray-600'
                  }`}>
                  {step.id < activeStepId ? '✓' : index + 1}
                </div>

                {/* Icon Circle */}
                <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4 smooth-transition
                  ${step.id === activeStepId
                    ? 'bg-white/20 backdrop-blur-sm shadow-inner'
                    : step.id < activeStepId
                    ? 'bg-white/20 backdrop-blur-sm'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                  {React.cloneElement(step.icon, { className: "h-6 w-6 sm:h-7 sm:w-7 md:h-9 md:w-9" })}
                </div>

                {/* Title */}
                <h3 className={`font-bold mb-1 sm:mb-2 text-[11px] sm:text-xs md:text-sm leading-tight
                  ${step.id === activeStepId || step.id < activeStepId
                    ? 'text-white'
                    : 'text-gray-600'
                  }`}>
                  {step.title}
                </h3>

                {/* Description - Hidden on mobile */}
                <p className={`text-[10px] sm:text-xs leading-relaxed hidden sm:block
                  ${step.id === activeStepId
                    ? 'text-blue-100'
                    : step.id < activeStepId
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
