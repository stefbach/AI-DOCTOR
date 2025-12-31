"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Mic,
  Square,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileAudio,
  User,
  Stethoscope,
  Brain,
  FileSignature,
  ArrowRight
} from "lucide-react"
import { useRouter } from "next/navigation"
import DiagnosisForm from "@/components/diagnosis-form"
import ProfessionalReport from "@/components/professional-report"

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
}

// 4 ÉTAPES (comme consultation normale mais avec enregistrement audio au début)
const STEPS = [
  { id: 1, name: "Enregistrement Audio", icon: Mic, description: "Dicter la consultation" },
  { id: 2, name: "Révision des Données", icon: User, description: "Vérifier les données extraites" },
  { id: 3, name: "Diagnostic AI", icon: Brain, description: "Analyse diagnostique" },
  { id: 4, name: "Rapport Final", icon: FileSignature, description: "Génération du rapport" }
]

export default function VoiceDictationPage() {
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [patientData, setPatientData] = useState<any>(null)
  const [doctorData, setDoctorData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)
  const [diagnosisData, setDiagnosisData] = useState<any>(null)
  const [transcriptionText, setTranscriptionText] = useState<string>("")
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null
  })
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load patient and doctor data from sessionStorage
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('consultationPatientData')
    let savedDoctorData = sessionStorage.getItem('currentDoctorInfo')
    
    if (!savedDoctorData) {
      savedDoctorData = sessionStorage.getItem('dermatologyDoctorData')
    }
    if (!savedDoctorData) {
      savedDoctorData = sessionStorage.getItem('chronicDoctorData')
    }
    
    if (savedPatientData) {
      try {
        setPatientData(JSON.parse(savedPatientData))
      } catch (error) {
        console.error('Error parsing patient data:', error)
      }
    }
    
    if (savedDoctorData) {
      try {
        setDoctorData(JSON.parse(savedDoctorData))
        console.log('✅ Doctor data loaded for voice dictation')
      } catch (error) {
        console.error('Error parsing doctor data:', error)
      }
    } else {
      console.warn('⚠️ No doctor data found in session storage - will need to be provided in dictation')
    }
  }, [])

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
      
      console.log('🎤 Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Impossible d\'accéder au microphone. Vérifiez les permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      console.log('🎤 Recording stopped')
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
      // Create form data
      const formData = new FormData()
      const audioFile = new File(
        [audioBlob],
        `dictation_${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`,
        { type: audioBlob.type }
      )
      formData.append('audioFile', audioFile)
      
      // Add doctor info with fallback
      const doctorInfo = doctorData || {
        fullName: 'Dr. [À compléter]',
        qualifications: 'MBBS',
        specialty: 'General Medicine',
        medicalCouncilNumber: 'N/A'
      }
      formData.append('doctorInfo', JSON.stringify(doctorInfo))
      
      // Add patient ID if available
      if (patientData?.patientId) {
        formData.append('patientId', patientData.patientId)
      }

      console.log('📤 Uploading audio for transcription and extraction...')
      
      // Call the NEW transcribe-only API
      const response = await fetch('/api/voice-dictation-transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Erreur API: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      
      console.log('✅ Transcription and extraction completed:', result)
      
      // Store transcription text
      setTranscriptionText(result.transcription.text)
      
      // Build patientData from extracted info
      const extractedPatient = result.extractedData.patientInfo
      setPatientData({
        ...patientData,
        firstName: extractedPatient.firstName || patientData?.firstName || '',
        lastName: extractedPatient.lastName || patientData?.lastName || '',
        age: extractedPatient.age || patientData?.age || '',
        gender: extractedPatient.gender || patientData?.gender || '',
        email: extractedPatient.email || patientData?.email || '',
        phone: extractedPatient.phone || patientData?.phone || '',
      })
      
      // Build clinicalData from extracted info
      const extractedClinical = result.extractedData.clinicalData
      setClinicalData({
        chiefComplaint: extractedClinical.chiefComplaint || '',
        symptoms: extractedClinical.symptoms || [],
        duration: extractedClinical.duration || '',
        severity: extractedClinical.severity || '',
        medicalHistory: extractedClinical.medicalHistory || [],
        currentMedications: extractedClinical.currentMedications || [],
        allergies: extractedClinical.allergies || [],
        vitalSigns: extractedClinical.vitalSigns || {},
      })
      
      // Build questionsData from extracted info
      setQuestionsData(result.extractedData.aiQuestions || {})
      
      // Move to next step (Revision des données)
      setCurrentStep(2)
      
    } catch (error: any) {
      console.error('Error processing audio:', error)
      setError('Erreur lors du traitement de la dictée vocale: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const proceedToDiagnosis = () => {
    // User reviewed the data, proceed to DiagnosisForm
    setCurrentStep(3)
  }

  const handleDiagnosisComplete = (diagnosis: any) => {
    console.log('✅ Diagnosis completed:', diagnosis)
    setDiagnosisData(diagnosis)
    setCurrentStep(4)
  }

  const handleReportComplete = () => {
    console.log('✅ Report completed')
    // Navigate back to hub or show success
    router.push('/consultation-hub')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      router.push('/consultation-hub')
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dictée Vocale</h1>
              <p className="text-sm text-gray-600">Consultation médicale par dictée vocale</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {STEPS[currentStep - 1].name}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Progression</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between pt-2">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center gap-1 ${
                      step.id === currentStep
                        ? 'text-blue-600'
                        : step.id < currentStep
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                    <span className="text-xs font-medium hidden sm:block">{step.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1: Audio Recording */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-6 w-6 text-blue-600" />
                Enregistrement Audio
              </CardTitle>
              <CardDescription>
                Dictez la consultation médicale. Le système extraira automatiquement les données cliniques.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Patient Info Display */}
              {patientData && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Patient</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {patientData.firstName} {patientData.lastName}
                    {patientData.age && ` • ${patientData.age} ans`}
                    {patientData.gender && ` • ${patientData.gender}`}
                  </div>
                </div>
              )}

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
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      variant="destructive"
                    >
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
                        className="bg-blue-600 hover:bg-blue-700"
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
        )}

        {/* STEP 2: Review Extracted Data */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-blue-600" />
                Révision des Données Extraites
              </CardTitle>
              <CardDescription>
                Vérifiez les données extraites de la dictée vocale avant de continuer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Transcription */}
              <div>
                <h3 className="font-semibold mb-2">Transcription</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
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
                    <span className="text-gray-600">Email:</span>{' '}
                    <span className="font-medium">{patientData?.email || 'N/A'}</span>
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
                  <div>
                    <span className="text-gray-600">Sévérité:</span>{' '}
                    <span className="font-medium">{clinicalData?.severity}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Retour
                </Button>
                <Button onClick={proceedToDiagnosis} className="bg-blue-600 hover:bg-blue-700">
                  Continuer vers le Diagnostic
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Diagnosis (use existing DiagnosisForm component) */}
        {currentStep === 3 && patientData && clinicalData && (
          <DiagnosisForm
            patientData={patientData}
            clinicalData={clinicalData}
            questionsData={questionsData || {}}
            onDataChange={(data: any) => {
              console.log('✅ Diagnosis data updated:', data)
              setDiagnosisData(data)
            }}
            onNext={() => {
              console.log('✅ Moving to next step (Report)')
              handleDiagnosisComplete(diagnosisData)
            }}
            onPrevious={() => {
              console.log('✅ Going back to data review')
              setCurrentStep(2)
            }}
          />
        )}

        {/* STEP 4: Report (use existing ProfessionalReport component) */}
        {currentStep === 4 && diagnosisData && (
          <ProfessionalReport
            patientData={patientData}
            clinicalData={clinicalData}
            diagnosisData={diagnosisData}
            doctorData={doctorData}
            questionsData={questionsData}
            onComplete={handleReportComplete}
            onPrevious={() => setCurrentStep(3)}
          />
        )}
      </div>
    </div>
  )
}
