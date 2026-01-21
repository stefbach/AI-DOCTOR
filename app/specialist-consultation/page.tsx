'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Mic,
  Square,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Phone,
  Calendar,
  Stethoscope,
  Brain,
  FileSignature,
  ArrowRight,
  Clock,
  FileText,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronUp,
  History,
  Download,
  FlaskConical,
  Image as ImageIcon,
  Info
} from 'lucide-react'
import { HistoryList } from '@/lib/follow-up/shared/components/history-list'
import { ConsultationDetailModal } from '@/lib/follow-up/shared/components/consultation-detail-modal'
import { ConsultationHistoryItem } from '@/lib/follow-up/shared/utils/history-fetcher'
import DiagnosisForm from '@/components/diagnosis-form'
import ProfessionalReport from '@/components/professional-report'

// Referral interface
interface Referral {
  id: string
  patient_name: string
  patient_phone: string | null
  patient_age: number | null
  patient_gender: string | null
  patient_id: string | null
  reason: string
  tibok_diagnosis: string | null
  tibok_notes: string | null
  priority: string
  specialty_requested: string
  status: string
  created_at: string
  referring_doctor_id: string | null
}

// Steps for voice dictation
const STEPS = [
  { id: 1, name: 'Enregistrement', icon: Mic, description: 'Dicter la consultation' },
  { id: 2, name: 'Révision', icon: User, description: 'Vérifier les données' },
  { id: 3, name: 'Diagnostic AI', icon: Brain, description: 'Analyse diagnostique' },
  { id: 4, name: 'Rapport Final', icon: FileSignature, description: 'Génération du rapport' }
]

export default function SpecialistConsultationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralId = searchParams.get('referral_id')

  // Supabase client
  const getSupabaseClient = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      return createClient(url, key)
    }
    return null
  }, [])

  // State for referral data
  const [referral, setReferral] = useState<Referral | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for consultation history
  const [consultationHistory, setConsultationHistory] = useState<ConsultationHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationHistoryItem | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isReferralExpanded, setIsReferralExpanded] = useState(true)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyTotalCount, setHistoryTotalCount] = useState(0)
  const [historyOffset, setHistoryOffset] = useState(0)
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null)
  const [currentPatientPhone, setCurrentPatientPhone] = useState<string | null>(null)

  // State for voice dictation (right panel)
  const [currentStep, setCurrentStep] = useState(1)
  const [patientData, setPatientData] = useState<any>(null)
  const [doctorData, setDoctorData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [doctorNotes, setDoctorNotes] = useState<any>(null)
  const [transcriptionText, setTranscriptionText] = useState<string>('')

  // Recording state
  const [recordingState, setRecordingState] = useState({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null as Blob | null
  })
  const [isProcessing, setIsProcessing] = useState(false)

  // State for imported lab/radiology results
  const [labResults, setLabResults] = useState<any>(null)
  const [radiologyResults, setRadiologyResults] = useState<any>(null)
  const [isLoadingLabResults, setIsLoadingLabResults] = useState(false)
  const [isLoadingRadiologyResults, setIsLoadingRadiologyResults] = useState(false)
  const [labResultsError, setLabResultsError] = useState<string | null>(null)
  const [radiologyResultsError, setRadiologyResultsError] = useState<string | null>(null)
  const [importedResultsText, setImportedResultsText] = useState<string>('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load referral data on mount
  useEffect(() => {
    if (!referralId) {
      setError('ID de référence manquant')
      setLoading(false)
      return
    }
    loadReferralData()
  }, [referralId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  async function loadReferralData() {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setError('Configuration Supabase manquante')
      setLoading(false)
      return
    }

    try {
      // 1. Load referral details
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single()

      if (referralError || !referralData) {
        setError('Référence non trouvée')
        setLoading(false)
        return
      }

      setReferral(referralData)

      // 2. Load specialist (doctor) data
      if (referralData.specialist_id) {
        const { data: specialistData, error: specialistError } = await supabase
          .from('specialists')
          .select('id, full_name, phone, email, specialties, medical_license_number, clinic_name, signature_url')
          .eq('id', referralData.specialist_id)
          .single()

        if (!specialistError && specialistData) {
          const doctorFullName = specialistData.full_name ? `Dr. ${specialistData.full_name}` : 'Dr. (Nom non disponible)'
          setDoctorData({
            fullName: doctorFullName,
            nom: doctorFullName,
            qualifications: specialistData.specialties?.join(', ') || '',
            specialty: referralData.specialty_requested,
            specialite: referralData.specialty_requested,
            medicalCouncilNumber: specialistData.medical_license_number || '',
            numeroEnregistrement: specialistData.medical_license_number || '',
            email: specialistData.email || '',
            phone: specialistData.phone || '',
            clinicName: specialistData.clinic_name || '',
            signatureUrl: specialistData.signature_url || null
          })
          console.log('✅ Specialist data loaded:', specialistData)
        } else {
          console.warn('⚠️ Could not load specialist data:', specialistError)
        }
      }

      // 3. Set patient data for the consultation
      setPatientData({
        name: referralData.patient_name || '',
        firstName: referralData.patient_name?.split(' ')[0] || '',
        lastName: referralData.patient_name?.split(' ').slice(1).join(' ') || '',
        age: referralData.patient_age,
        gender: referralData.patient_gender,
        phone: referralData.patient_phone,
        patientId: referralData.patient_id
      })

      // 4. Mark referral as in_progress if pending
      if (referralData.status === 'pending') {
        await supabase
          .from('referrals')
          .update({
            status: 'in_progress',
            specialist_consultation_started_at: new Date().toISOString()
          })
          .eq('id', referralId)
      }

      // 5. Load consultation history via patient_id or phone
      await loadConsultationHistory(referralData.patient_id, referralData.patient_phone)

      setLoading(false)
    } catch (err) {
      console.error('Error loading referral:', err)
      setError('Erreur lors du chargement')
      setLoading(false)
    }
  }

  async function loadConsultationHistory(patientId: string | null, patientPhone: string | null, offset: number = 0) {
    setLoadingHistory(true)
    // Store for pagination
    setCurrentPatientId(patientId)
    setCurrentPatientPhone(patientPhone)

    try {
      // Try with patient_id first, then phone
      const searchCriteria: any = { limit: 10, offset }
      if (patientId) {
        searchCriteria.patientId = patientId
      } else if (patientPhone) {
        searchCriteria.phone = patientPhone
      } else {
        setLoadingHistory(false)
        return
      }

      console.log('🔍 Loading consultation history with:', searchCriteria)

      const response = await fetch('/api/patient-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchCriteria)
      })

      const data = await response.json()
      console.log('📋 History response:', data)

      if (data.success && data.consultations) {
        if (offset === 0) {
          setConsultationHistory(data.consultations)
        } else {
          setConsultationHistory(prev => [...prev, ...data.consultations])
        }
        setHistoryHasMore(data.hasMore || false)
        setHistoryTotalCount(data.totalCount || 0)
        setHistoryOffset(offset + data.consultations.length)
      }
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function loadMoreHistory() {
    if (loadingHistory || !historyHasMore) return
    await loadConsultationHistory(currentPatientId, currentPatientPhone, historyOffset)
  }

  // Format lab results for display
  const formatLabResultsForHistory = (labResult: any): string => {
    if (!labResult) return ''
    const lines: string[] = []
    const resultsData = labResult.results_data
    const order = labResult.lab_orders

    if (labResult.validated_at) {
      lines.push(`Date: ${new Date(labResult.validated_at).toLocaleDateString()}`)
    } else if (labResult.created_at) {
      lines.push(`Date: ${new Date(labResult.created_at).toLocaleDateString()}`)
    }

    if (order?.order_number) {
      lines.push(`Order: ${order.order_number}`)
    }

    if (resultsData?.tests && Array.isArray(resultsData.tests)) {
      lines.push('\nTest Results:')
      resultsData.tests.forEach((test: any) => {
        const abnormalFlag = test.is_abnormal ? ' ⚠️' : ''
        lines.push(`• ${test.test_name}: ${test.value} ${test.unit || ''}${abnormalFlag}`)
        if (test.reference_range) {
          lines.push(`  (Ref: ${test.reference_range})`)
        }
      })
    }

    if (labResult.interpretation_notes) {
      lines.push(`\nInterpretation: ${labResult.interpretation_notes}`)
    }

    return lines.join('\n')
  }

  // Format radiology results for display
  const formatRadiologyResultsForHistory = (radioResult: any): string => {
    if (!radioResult) return ''
    const lines: string[] = []
    const resultsData = radioResult.results_data
    const order = radioResult.radiology_orders

    if (radioResult.validated_at) {
      lines.push(`Date: ${new Date(radioResult.validated_at).toLocaleDateString()}`)
    } else if (radioResult.created_at) {
      lines.push(`Date: ${new Date(radioResult.created_at).toLocaleDateString()}`)
    }

    if (order?.order_number) {
      lines.push(`Order: ${order.order_number}`)
    }

    if (order?.exams_ordered) {
      const exams = Array.isArray(order.exams_ordered)
        ? order.exams_ordered.map((e: any) => e.name || e).join(', ')
        : order.exams_ordered
      lines.push(`Exam: ${exams}`)
    }

    if (resultsData?.findings) {
      lines.push(`\nFindings: ${resultsData.findings}`)
    }

    if (resultsData?.conclusion) {
      lines.push(`\nConclusion: ${resultsData.conclusion}`)
    }

    return lines.join('\n')
  }

  // Fetch lab results for the patient
  const fetchLabResults = async () => {
    if (!referral?.patient_id && !referral?.patient_name) {
      setLabResultsError("Informations patient non disponibles")
      return
    }

    setIsLoadingLabResults(true)
    setLabResultsError(null)

    try {
      const params = new URLSearchParams({ type: 'lab' })
      if (referral.patient_id) {
        params.append('patientId', referral.patient_id)
      } else if (referral.patient_name) {
        params.append('patientName', referral.patient_name)
      }

      const response = await fetch(`/api/patient-results?${params.toString()}`)
      const data = await response.json()

      console.log('📋 Lab Results API Response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Échec de la récupération des résultats')
      }

      if (data.hasLabResults && data.labResults) {
        setLabResults(data.labResults)
        const labText = formatLabResultsForHistory(data.labResults)
        if (labText) {
          setImportedResultsText(prev =>
            prev ? `${prev}\n\n--- RÉSULTATS LABORATOIRE ---\n${labText}`
                 : `--- RÉSULTATS LABORATOIRE ---\n${labText}`
          )
        }
      } else {
        setLabResultsError("Aucun résultat de laboratoire trouvé pour ce patient")
      }
    } catch (error: any) {
      console.error('Error fetching lab results:', error)
      setLabResultsError(error.message || 'Échec de la récupération')
    } finally {
      setIsLoadingLabResults(false)
    }
  }

  // Fetch radiology results for the patient
  const fetchRadiologyResults = async () => {
    if (!referral?.patient_id && !referral?.patient_name) {
      setRadiologyResultsError("Informations patient non disponibles")
      return
    }

    setIsLoadingRadiologyResults(true)
    setRadiologyResultsError(null)

    try {
      const params = new URLSearchParams({ type: 'radiology' })
      if (referral.patient_id) {
        params.append('patientId', referral.patient_id)
      } else if (referral.patient_name) {
        params.append('patientName', referral.patient_name)
      }

      const response = await fetch(`/api/patient-results?${params.toString()}`)
      const data = await response.json()

      console.log('🩻 Radiology Results API Response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Échec de la récupération des résultats')
      }

      if (data.hasRadiologyResults && data.radiologyResults) {
        setRadiologyResults(data.radiologyResults)
        const radioText = formatRadiologyResultsForHistory(data.radiologyResults)
        if (radioText) {
          setImportedResultsText(prev =>
            prev ? `${prev}\n\n--- RÉSULTATS RADIOLOGIE ---\n${radioText}`
                 : `--- RÉSULTATS RADIOLOGIE ---\n${radioText}`
          )
        }
      } else {
        setRadiologyResultsError("Aucun résultat de radiologie trouvé pour ce patient")
      }
    } catch (error: any) {
      console.error('Error fetching radiology results:', error)
      setRadiologyResultsError(error.message || 'Échec de la récupération')
    } finally {
      setIsLoadingRadiologyResults(false)
    }
  }

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecordingState(prev => ({ ...prev, audioBlob, isRecording: false }))

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

      mediaRecorder.start()
      setRecordingState(prev => ({ ...prev, isRecording: true, duration: 0 }))

      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Impossible d\'accéder au microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const processAudio = async () => {
    const { audioBlob } = recordingState
    if (!audioBlob) {
      setError('Aucun enregistrement audio disponible')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      const audioFile = new File(
        [audioBlob],
        `dictation_${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`,
        { type: audioBlob.type }
      )
      formData.append('audioFile', audioFile)
      formData.append('doctorInfo', JSON.stringify(doctorData || {}))
      if (patientData?.patientId) {
        formData.append('patientId', patientData.patientId)
      }

      const response = await fetch('/api/voice-dictation-transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors du traitement')
      }

      const result = await response.json()

      setTranscriptionText(result.transcription.text)

      // Merge extracted data with referral patient data
      // Only use extracted values if they are meaningful (not placeholders)
      const extractedPatient = result.extractedData.patientInfo
      const isValidValue = (val: string | undefined) => {
        if (!val) return false
        const lower = val.toLowerCase().trim()
        return lower !== '' &&
               lower !== 'not provided' &&
               lower !== 'n/a' &&
               lower !== 'unknown' &&
               lower !== 'non spécifié' &&
               lower !== 'non fourni'
      }

      setPatientData(prev => ({
        ...prev,
        // Keep referral data if extracted data is a placeholder
        firstName: isValidValue(extractedPatient.firstName) ? extractedPatient.firstName : (prev?.firstName || ''),
        lastName: isValidValue(extractedPatient.lastName) ? extractedPatient.lastName : (prev?.lastName || ''),
        age: extractedPatient.age || prev?.age || '',
        gender: isValidValue(extractedPatient.gender) ? extractedPatient.gender : (prev?.gender || ''),
        email: isValidValue(extractedPatient.email) ? extractedPatient.email : (prev?.email || ''),
        phone: isValidValue(extractedPatient.phone) ? extractedPatient.phone : (prev?.phone || ''),
      }))

      const extractedClinical = result.extractedData.clinicalData

      // Combine imported results with disease history if available
      let combinedHistory = extractedClinical.diseaseHistory || ''
      if (importedResultsText) {
        combinedHistory = combinedHistory
          ? `${combinedHistory}\n\n${importedResultsText}`
          : importedResultsText
      }

      setClinicalData({
        chiefComplaint: extractedClinical.chiefComplaint || referral?.reason || '',
        symptoms: extractedClinical.symptoms || [],
        duration: extractedClinical.duration || '',
        severity: extractedClinical.severity || '',
        medicalHistory: extractedClinical.medicalHistory || [],
        currentMedications: extractedClinical.currentMedications || [],
        allergies: extractedClinical.allergies || [],
        vitalSigns: extractedClinical.vitalSigns || {},
        diseaseHistory: combinedHistory,
        // Store imported results separately for reference
        importedLabResults: labResults,
        importedRadiologyResults: radiologyResults,
      })

      setQuestionsData(result.extractedData.aiQuestions || {})
      setDoctorNotes(result.extractedData.doctorNotes || {})

      setCurrentStep(2)
    } catch (error: any) {
      console.error('Error processing audio:', error)
      setError('Erreur lors du traitement: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDiagnosisComplete = (diagnosis: any) => {
    setDiagnosisData(diagnosis)
    setCurrentStep(4)
  }

  const handleReportComplete = async () => {
    // This will be called when the report is finalized
    // Update the referrals table with the specialist report
    const supabase = getSupabaseClient()
    if (!supabase || !referralId) return

    try {
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          specialist_report: {
            transcription: transcriptionText,
            clinicalData: clinicalData,
            diagnosis: diagnosisData
          },
          specialist_diagnosis: diagnosisData?.primaryDiagnosis || diagnosisData?.diagnosis || '',
          specialist_notes: diagnosisData?.recommendations || '',
          specialist_consultation_ended_at: new Date().toISOString(),
          report_sent_to_tibok: true,
          report_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', referralId)

      if (updateError) {
        console.error('Error updating referral:', updateError)
      } else {
        console.log('Referral updated successfully')
      }
    } catch (err) {
      console.error('Error completing referral:', err)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = (currentStep / STEPS.length) * 100

  // Handle consultation selection from history
  const handleSelectConsultation = (consultation: ConsultationHistoryItem) => {
    setSelectedConsultation(consultation)
    setShowDetailModal(true)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement de la référence...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !referral) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-50 to-white">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.close()} variant="outline">
              Fermer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
      {/* ========== LEFT PANEL - Referral Details + Hub ========== */}
      {/* Mobile: Full width, collapsible | Tablet: 35% | Desktop: 40% */}
      <div className="w-full lg:w-[35%] xl:w-[40%] flex flex-col border-b lg:border-b-0 lg:border-r border-gray-300 lg:h-screen lg:overflow-hidden">
        {/* Referral Details Section - Collapsible on mobile */}
        <div className="bg-white border-b shadow-sm">
          {/* Header - Always visible, clickable on mobile */}
          <div
            className="p-3 md:p-4 flex items-center justify-between cursor-pointer lg:cursor-default"
            onClick={() => setIsReferralExpanded(!isReferralExpanded)}
          >
            <h2 className="text-base md:text-lg font-semibold text-purple-800 flex items-center gap-2">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
              Détails de la Référence
            </h2>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${
                referral?.priority === 'urgent' ? 'bg-red-500' :
                referral?.priority === 'high' ? 'bg-orange-500' :
                'bg-green-500'
              }`}>
                {referral?.priority === 'urgent' ? 'Urgent' :
                 referral?.priority === 'high' ? 'Haute priorité' : 'Normal'}
              </Badge>
              {/* Collapse toggle - only visible on mobile */}
              <button className="lg:hidden p-1 rounded hover:bg-gray-100">
                {isReferralExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible content */}
          <div className={`px-3 md:px-4 pb-3 md:pb-4 ${isReferralExpanded ? 'block' : 'hidden'} lg:block`}>
            {/* Patient info grid - responsive columns */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-500 text-xs">Patient:</span>
                  <p className="font-medium truncate">{referral?.patient_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-500 text-xs">Téléphone:</span>
                  <p className="font-medium truncate">{referral?.patient_phone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Âge:</span>
                <p className="font-medium">{referral?.patient_age || 'N/A'} ans</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Genre:</span>
                <p className="font-medium">
                  {referral?.patient_gender === 'male' ? 'Homme' :
                   referral?.patient_gender === 'female' ? 'Femme' :
                   referral?.patient_gender || 'N/A'}
                </p>
              </div>
            </div>

            <Separator className="my-2 md:my-3" />

            {/* Referral reason - scrollable container */}
            <div>
              <span className="text-gray-500 text-xs md:text-sm flex items-center gap-1 mb-1">
                <Stethoscope className="h-4 w-4" />
                Motif de référence:
              </span>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 md:p-3 max-h-32 md:max-h-40 overflow-y-auto overscroll-contain touch-pan-y">
                <p className="font-medium text-gray-800 text-sm whitespace-pre-wrap">
                  {referral?.reason}
                </p>
              </div>
            </div>

            {referral?.tibok_diagnosis && (
              <div className="mt-2 md:mt-3 p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-blue-700 text-xs md:text-sm font-medium flex items-center gap-1 mb-1">
                  <Brain className="h-4 w-4" />
                  Diagnostic Tibok:
                </span>
                <div className="max-h-24 md:max-h-32 overflow-y-auto overscroll-contain touch-pan-y">
                  <p className="text-blue-900 text-xs md:text-sm whitespace-pre-wrap">
                    {referral.tibok_diagnosis}
                  </p>
                </div>
              </div>
            )}

            {referral?.tibok_notes && (
              <div className="mt-2 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-600 text-xs md:text-sm font-medium mb-1 block">Notes Tibok:</span>
                <div className="max-h-20 overflow-y-auto overscroll-contain touch-pan-y">
                  <p className="text-gray-700 text-xs md:text-sm whitespace-pre-wrap">{referral.tibok_notes}</p>
                </div>
              </div>
            )}

            <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Référé le {new Date(referral?.created_at || '').toLocaleDateString('fr-FR')}
              </div>
              <Badge variant="outline" className="text-xs">
                {referral?.specialty_requested}
              </Badge>
            </div>
          </div>
        </div>

        {/* Consultation History Section - Collapsible on mobile */}
        <div className="flex-1 lg:overflow-y-auto bg-gray-50">
          {/* History Header - Clickable on mobile */}
          <div
            className="p-3 md:p-4 flex items-center justify-between cursor-pointer lg:cursor-default bg-gray-100 border-b"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          >
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique des Consultations
              {historyTotalCount > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {consultationHistory.length}/{historyTotalCount}
                </Badge>
              )}
            </h3>
            {/* Collapse toggle - only visible on mobile */}
            <button className="lg:hidden p-1 rounded hover:bg-gray-200">
              {isHistoryExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>

          {/* History content - collapsible on mobile */}
          <div className={`p-3 md:p-4 ${isHistoryExpanded ? 'block' : 'hidden'} lg:block max-h-[40vh] lg:max-h-none overflow-y-auto`}>
            {loadingHistory && consultationHistory.length === 0 ? (
              <div className="flex items-center justify-center py-6 md:py-8">
                <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600 text-sm">Chargement...</span>
              </div>
            ) : consultationHistory.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                Aucun historique de consultation
              </div>
            ) : (
              <>
                <HistoryList
                  history={consultationHistory}
                  onSelectConsultation={handleSelectConsultation}
                  selectedId={selectedConsultation?.id}
                  showTimeline={true}
                />

                {/* Load More Button */}
                {historyHasMore && (
                  <div className="flex justify-center mt-3 md:mt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreHistory}
                      disabled={loadingHistory}
                      size="sm"
                      className="w-full max-w-xs text-sm"
                    >
                      {loadingHistory ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          Charger plus ({historyTotalCount - consultationHistory.length} restants)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========== RIGHT PANEL - Voice Dictation ========== */}
      {/* Mobile: Full width | Tablet: 65% | Desktop: 60% */}
      <div className="w-full lg:w-[65%] xl:w-[60%] flex flex-col bg-white lg:h-screen lg:overflow-hidden">
        {/* Header */}
        <div className="p-3 md:p-4 border-b bg-purple-50">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-semibold text-purple-800 truncate">
                Consultation Spécialiste
              </h2>
              <p className="text-xs md:text-sm text-purple-600 truncate">
                {referral?.specialty_requested} - Dictée Vocale
              </p>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs flex-shrink-0">
              {STEPS[currentStep - 1].name}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 md:mt-4 space-y-2">
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-gray-600">Progression</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {/* Step indicators - icons only on mobile, with labels on larger screens */}
            <div className="flex justify-between pt-1">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 ${
                    step.id === currentStep
                      ? 'text-purple-600'
                      : step.id < currentStep
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  <step.icon className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-[10px] md:text-xs hidden sm:block">{step.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mx-3 md:mx-4 mt-3 md:mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: Audio Recording */}
          {currentStep === 1 && (
            <div className="p-3 md:p-6 space-y-4 md:space-y-6">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Mic className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    Enregistrement Audio
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Dictez votre consultation. Le système extraira automatiquement les données cliniques.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
                  {/* Recording Controls - Responsive sizes */}
                  <div className="flex flex-col items-center gap-4 md:gap-6 py-4 md:py-8">
                    {!recordingState.isRecording && !recordingState.audioBlob && (
                      <Button
                        onClick={startRecording}
                        size="lg"
                        className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-blue-500 hover:bg-blue-600"
                      >
                        <Mic className="h-7 w-7 md:h-8 md:w-8" />
                      </Button>
                    )}

                    {recordingState.isRecording && (
                      <>
                        <div className="flex flex-col items-center gap-3 md:gap-4">
                          <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                            <Square className="h-7 w-7 md:h-8 md:w-8 text-white" />
                          </div>
                          <div className="text-2xl md:text-3xl font-mono font-bold">
                            {formatTime(recordingState.duration)}
                          </div>
                        </div>
                        <Button onClick={stopRecording} size="default" variant="destructive" className="text-sm md:text-base">
                          <Square className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                          Arrêter l'enregistrement
                        </Button>
                      </>
                    )}

                    {recordingState.audioBlob && !recordingState.isRecording && (
                      <div className="w-full space-y-3 md:space-y-4">
                        <div className="flex items-center justify-center gap-2 md:gap-3 text-green-600">
                          <CheckCircle className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="font-medium text-sm md:text-base">
                            Enregistrement terminé ({formatTime(recordingState.duration)})
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center">
                          <Button
                            onClick={() => {
                              setRecordingState({
                                isRecording: false,
                                isPaused: false,
                                duration: 0,
                                audioBlob: null
                              })
                            }}
                            variant="outline"
                            size="sm"
                            className="text-sm"
                          >
                            Réenregistrer
                          </Button>
                          <Button
                            onClick={processAudio}
                            disabled={isProcessing}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-sm"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="h-4 w-4 md:h-5 md:w-5 mr-2 animate-spin" />
                                <span className="hidden sm:inline">Traitement en cours...</span>
                                <span className="sm:hidden">Traitement...</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">Traiter l'audio</span>
                                <span className="sm:hidden">Traiter</span>
                                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Import Previous Results Card */}
              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <p className="font-semibold text-gray-800 text-sm md:text-base">Importer Résultats Précédents</p>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 mb-4">
                    Importez les derniers résultats de laboratoire ou radiologie du patient pour les inclure dans l'analyse.
                  </p>

                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {/* Lab Results Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchLabResults}
                      disabled={isLoadingLabResults || !!labResults}
                      className={`flex items-center gap-2 text-xs md:text-sm ${labResults ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                    >
                      {isLoadingLabResults ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : labResults ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <FlaskConical className="h-4 w-4" />
                      )}
                      {labResults ? 'Labo importé' : 'Importer Labo'}
                    </Button>

                    {/* Radiology Results Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchRadiologyResults}
                      disabled={isLoadingRadiologyResults || !!radiologyResults}
                      className={`flex items-center gap-2 text-xs md:text-sm ${radiologyResults ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                    >
                      {isLoadingRadiologyResults ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : radiologyResults ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {radiologyResults ? 'Radio importé' : 'Importer Radio'}
                    </Button>
                  </div>

                  {/* Error messages */}
                  {labResultsError && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs md:text-sm text-amber-700">{labResultsError}</p>
                      </div>
                    </div>
                  )}
                  {radiologyResultsError && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs md:text-sm text-amber-700">{radiologyResultsError}</p>
                      </div>
                    </div>
                  )}

                  {/* Success indicator with full results view */}
                  {(labResults || radiologyResults) && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-green-700">
                          Résultats importés avec succès
                        </p>
                      </div>
                      {importedResultsText && (
                        <div className="mt-2 max-h-64 md:max-h-80 overflow-y-auto overscroll-contain touch-pan-y border border-gray-200 rounded">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white p-3">
                            {importedResultsText}
                          </pre>
                        </div>
                      )}
                      <p className="text-xs text-green-600 mt-2">
                        Ces résultats seront inclus dans l'analyse diagnostique.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 2: Review Extracted Data */}
          {currentStep === 2 && (
            <div className="p-3 md:p-6">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <User className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    Révision des Données Extraites
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Vérifiez les données extraites de la dictée vocale.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
                  {/* Transcription */}
                  <div>
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Transcription</h3>
                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg text-xs md:text-sm text-gray-700 max-h-24 md:max-h-32 overflow-y-auto">
                      {transcriptionText}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div>
                    <h3 className="font-semibold mb-2">Informations Patient</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Nom:</span>{' '}
                        <span className="font-medium">
                          {patientData?.name || `${patientData?.firstName || ''} ${patientData?.lastName || ''}`.trim() || referral?.patient_name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Âge:</span>{' '}
                        <span className="font-medium">{patientData?.age || referral?.patient_age || 'N/A'} ans</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Genre:</span>{' '}
                        <span className="font-medium">{patientData?.gender || referral?.patient_gender || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Téléphone:</span>{' '}
                        <span className="font-medium">{patientData?.phone || referral?.patient_phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Data */}
                  <div>
                    <h3 className="font-semibold mb-2">Données Cliniques</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Motif:</span>{' '}
                        <span className="font-medium">{clinicalData?.chiefComplaint}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Symptômes:</span>{' '}
                        <span className="font-medium">{clinicalData?.symptoms?.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Durée:</span>{' '}
                        <span className="font-medium">{clinicalData?.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-4">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      Retour
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Continuer vers le Diagnostic
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 3: Diagnosis */}
          {currentStep === 3 && patientData && clinicalData && (
            <div className="p-4">
              <DiagnosisForm
                patientData={patientData}
                clinicalData={clinicalData}
                questionsData={questionsData || {}}
                doctorNotes={doctorNotes}
                onDataChange={(data: any) => setDiagnosisData(data)}
                onNext={() => handleDiagnosisComplete(diagnosisData)}
                onPrevious={() => setCurrentStep(2)}
              />
            </div>
          )}

          {/* STEP 4: Report */}
          {currentStep === 4 && diagnosisData && (
            <div className="p-4">
              <ProfessionalReport
                patientData={patientData}
                clinicalData={clinicalData}
                diagnosisData={diagnosisData}
                doctorData={doctorData}
                questionsData={questionsData}
                onComplete={handleReportComplete}
                onPrevious={() => setCurrentStep(3)}
                specialistMode={true}
                referralId={referralId || undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Consultation Detail Modal */}
      <ConsultationDetailModal
        consultation={selectedConsultation}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />
    </div>
  )
}
