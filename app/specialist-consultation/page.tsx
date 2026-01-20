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
  Send
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

      // 2. Set patient data for the consultation
      setPatientData({
        firstName: referralData.patient_name?.split(' ')[0] || '',
        lastName: referralData.patient_name?.split(' ').slice(1).join(' ') || '',
        age: referralData.patient_age,
        gender: referralData.patient_gender,
        phone: referralData.patient_phone,
        patientId: referralData.patient_id
      })

      // 3. Mark referral as in_progress if pending
      if (referralData.status === 'pending') {
        await supabase
          .from('referrals')
          .update({
            status: 'in_progress',
            specialist_consultation_started_at: new Date().toISOString()
          })
          .eq('id', referralId)
      }

      // 4. Load consultation history via patient phone
      if (referralData.patient_phone) {
        await loadConsultationHistory(referralData.patient_phone)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading referral:', err)
      setError('Erreur lors du chargement')
      setLoading(false)
    }
  }

  async function loadConsultationHistory(patientPhone: string) {
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/patient-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: patientPhone, limit: 20 })
      })

      const data = await response.json()
      if (data.success && data.consultations) {
        setConsultationHistory(data.consultations)
      }
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoadingHistory(false)
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
      const extractedPatient = result.extractedData.patientInfo
      setPatientData(prev => ({
        ...prev,
        firstName: extractedPatient.firstName || prev?.firstName || '',
        lastName: extractedPatient.lastName || prev?.lastName || '',
        age: extractedPatient.age || prev?.age || '',
        gender: extractedPatient.gender || prev?.gender || '',
        email: extractedPatient.email || prev?.email || '',
        phone: extractedPatient.phone || prev?.phone || '',
      }))

      const extractedClinical = result.extractedData.clinicalData
      setClinicalData({
        chiefComplaint: extractedClinical.chiefComplaint || referral?.reason || '',
        symptoms: extractedClinical.symptoms || [],
        duration: extractedClinical.duration || '',
        severity: extractedClinical.severity || '',
        medicalHistory: extractedClinical.medicalHistory || [],
        currentMedications: extractedClinical.currentMedications || [],
        allergies: extractedClinical.allergies || [],
        vitalSigns: extractedClinical.vitalSigns || {},
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
    <div className="flex h-screen bg-gray-100">
      {/* ========== LEFT PANEL (50%) - Referral Details + Hub ========== */}
      <div className="w-1/2 flex flex-col border-r border-gray-300 overflow-hidden">
        {/* Referral Details Section */}
        <div className="p-4 bg-white border-b shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Détails de la Référence
            </h2>
            <Badge className={
              referral?.priority === 'urgent' ? 'bg-red-500' :
              referral?.priority === 'high' ? 'bg-orange-500' :
              'bg-green-500'
            }>
              {referral?.priority === 'urgent' ? 'Urgent' :
               referral?.priority === 'high' ? 'Haute priorité' : 'Normal'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Patient:</span>
                <p className="font-medium">{referral?.patient_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Téléphone:</span>
                <p className="font-medium">{referral?.patient_phone || 'N/A'}</p>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Âge:</span>
              <p className="font-medium">{referral?.patient_age || 'N/A'} ans</p>
            </div>
            <div>
              <span className="text-gray-500">Genre:</span>
              <p className="font-medium">
                {referral?.patient_gender === 'male' ? 'Homme' :
                 referral?.patient_gender === 'female' ? 'Femme' :
                 referral?.patient_gender || 'N/A'}
              </p>
            </div>
          </div>

          <Separator className="my-3" />

          <div>
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <Stethoscope className="h-4 w-4" />
              Motif de référence:
            </span>
            <p className="font-medium text-gray-800 mt-1">{referral?.reason}</p>
          </div>

          {referral?.tibok_diagnosis && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-700 text-sm font-medium flex items-center gap-1">
                <Brain className="h-4 w-4" />
                Diagnostic Tibok:
              </span>
              <p className="text-blue-900 mt-1 text-sm">{referral.tibok_diagnosis}</p>
            </div>
          )}

          {referral?.tibok_notes && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 text-sm font-medium">Notes Tibok:</span>
              <p className="text-gray-700 mt-1 text-sm">{referral.tibok_notes}</p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            Référé le {new Date(referral?.created_at || '').toLocaleDateString('fr-FR')}
            <span className="mx-1">•</span>
            <Badge variant="outline" className="text-xs">
              {referral?.specialty_requested}
            </Badge>
          </div>
        </div>

        {/* Consultation History Section */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Chargement de l'historique...</span>
            </div>
          ) : (
            <HistoryList
              history={consultationHistory}
              onSelectConsultation={handleSelectConsultation}
              selectedId={selectedConsultation?.id}
              showTimeline={true}
            />
          )}
        </div>
      </div>

      {/* ========== RIGHT PANEL (50%) - Voice Dictation ========== */}
      <div className="w-1/2 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-purple-800">
                Consultation Spécialiste
              </h2>
              <p className="text-sm text-purple-600">
                {referral?.specialty_requested} - Dictée Vocale
              </p>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              {STEPS[currentStep - 1].name}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Progression</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
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
                  <step.icon className="h-4 w-4" />
                  <span className="text-xs hidden sm:block">{step.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: Audio Recording */}
          {currentStep === 1 && (
            <div className="p-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-6 w-6 text-purple-600" />
                    Enregistrement Audio
                  </CardTitle>
                  <CardDescription>
                    Dictez votre consultation. Le système extraira automatiquement les données cliniques.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recording Controls */}
                  <div className="flex flex-col items-center gap-6 py-8">
                    {!recordingState.isRecording && !recordingState.audioBlob && (
                      <Button
                        onClick={startRecording}
                        size="lg"
                        className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600"
                      >
                        <Mic className="h-8 w-8" />
                      </Button>
                    )}

                    {recordingState.isRecording && (
                      <>
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-24 w-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                            <Square className="h-8 w-8 text-white" />
                          </div>
                          <div className="text-3xl font-mono font-bold">
                            {formatTime(recordingState.duration)}
                          </div>
                        </div>
                        <Button onClick={stopRecording} size="lg" variant="destructive">
                          <Square className="h-5 w-5 mr-2" />
                          Arrêter l'enregistrement
                        </Button>
                      </>
                    )}

                    {recordingState.audioBlob && !recordingState.isRecording && (
                      <div className="w-full space-y-4">
                        <div className="flex items-center justify-center gap-3 text-green-600">
                          <CheckCircle className="h-6 w-6" />
                          <span className="font-medium">
                            Enregistrement terminé ({formatTime(recordingState.duration)})
                          </span>
                        </div>

                        <div className="flex gap-3 justify-center">
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
                          >
                            Réenregistrer
                          </Button>
                          <Button
                            onClick={processAudio}
                            disabled={isProcessing}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Traitement en cours...
                              </>
                            ) : (
                              <>
                                Traiter l'audio
                                <ArrowRight className="h-5 w-5 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 2: Review Extracted Data */}
          {currentStep === 2 && (
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-6 w-6 text-purple-600" />
                    Révision des Données Extraites
                  </CardTitle>
                  <CardDescription>
                    Vérifiez les données extraites de la dictée vocale.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Transcription */}
                  <div>
                    <h3 className="font-semibold mb-2">Transcription</h3>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {transcriptionText}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div>
                    <h3 className="font-semibold mb-2">Informations Patient</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Nom:</span>{' '}
                        <span className="font-medium">{patientData?.firstName} {patientData?.lastName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Âge:</span>{' '}
                        <span className="font-medium">{patientData?.age} ans</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Genre:</span>{' '}
                        <span className="font-medium">{patientData?.gender}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Téléphone:</span>{' '}
                        <span className="font-medium">{patientData?.phone || 'N/A'}</span>
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
