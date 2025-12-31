"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Mic,
  Square,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileAudio,
  User,
  Stethoscope
} from "lucide-react"
import { useRouter } from "next/navigation"

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
}

export default function VoiceDictationPage() {
  const router = useRouter()
  
  const [patientData, setPatientData] = useState<any>(null)
  const [doctorData, setDoctorData] = useState<any>(null)
  const [isExistingPatient, setIsExistingPatient] = useState(false)
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null
  })
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load patient and doctor data from sessionStorage
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('consultationPatientData')
    let savedDoctorData = sessionStorage.getItem('currentDoctorInfo')
    
    // Fallback: try to get doctor info from other sources
    if (!savedDoctorData) {
      // Try dermatology workflow
      savedDoctorData = sessionStorage.getItem('dermatologyDoctorData')
    }
    if (!savedDoctorData) {
      // Try chronic workflow
      savedDoctorData = sessionStorage.getItem('chronicDoctorData')
    }
    
    const existingPatient = sessionStorage.getItem('isExistingPatientConsultation')
    
    if (savedPatientData) {
      try {
        const data = JSON.parse(savedPatientData)
        setPatientData(data)
        setIsExistingPatient(existingPatient === 'true')
        console.log('✅ Patient data loaded for voice dictation:', data)
      } catch (error) {
        console.error('Error parsing patient data:', error)
      }
    }
    
    if (savedDoctorData) {
      try {
        const data = JSON.parse(savedDoctorData)
        setDoctorData(data)
        console.log('✅ Doctor data loaded:', data)
      } catch (error) {
        console.error('Error parsing doctor data:', error)
      }
    } else {
      console.warn('⚠️ No doctor data found in session storage - will need to be provided in dictation')
    }
    
    // Clean up on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [router])

  const startRecording = async () => {
    try {
      setError(null)
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        })
        setRecordingState(prev => ({ ...prev, audioBlob, isRecording: false }))
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }
      
      mediaRecorder.start()
      setRecordingState(prev => ({ ...prev, isRecording: true, duration: 0 }))
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
      
      console.log('🎤 Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Erreur lors du démarrage de l\'enregistrement. Vérifiez les permissions du microphone.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop()
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      console.log('🎤 Recording stopped')
    }
  }

  const discardRecording = () => {
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null
    })
    audioChunksRef.current = []
    setError(null)
    setSuccess(false)
  }

  const processAudio = async () => {
    if (!recordingState.audioBlob) {
      setError('Aucun enregistrement audio disponible')
      return
    }
    
    setIsProcessing(true)
    setError(null)
    setSuccess(false)
    setProcessingProgress(0)
    setProcessingStep("Préparation de l'audio...")
    
    try {
      // Create FormData
      const formData = new FormData()
      
      // Convert audio blob to file
      const audioFile = new File(
        [recordingState.audioBlob], 
        `dictation_${Date.now()}.${recordingState.audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`,
        { type: recordingState.audioBlob.type }
      )
      
      formData.append('audioFile', audioFile)
      
      // Add doctor info (optional - can be provided in dictation)
      const doctorInfo = doctorData ? {
        fullName: doctorData.nom || 'Dr. Unknown',
        qualifications: doctorData.qualifications || 'MBBS',
        specialty: doctorData.specialite || 'General Medicine',
        medicalCouncilNumber: doctorData.numeroEnregistrement || 'N/A'
      } : {
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
      
      console.log('📤 Uploading audio for processing...')
      setProcessingStep("Transcription de l'audio (Whisper)...")
      setProcessingProgress(10)
      
      // Call voice dictation API
      const response = await fetch('/api/voice-dictation-workflow', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Erreur API: ${response.status} - ${errorData}`)
      }
      
      setProcessingStep("Extraction des données cliniques (GPT-4o)...")
      setProcessingProgress(30)
      
      // Wait for the actual API response (this takes time!)
      console.log('⏳ Waiting for voice dictation workflow to complete...')
      setProcessingStep("Traitement en cours (Whisper + GPT-4o + Diagnosis + Report)...")
      setProcessingProgress(40)
      
      const result = await response.json()
      
      console.log('📦 Received workflow result:', result)
      console.log('   Step 1 (Transcription):', result.workflow?.step1_transcription ? '✅' : '❌')
      console.log('   Step 2 (Extraction):', result.workflow?.step2_extraction ? '✅' : '❌')
      console.log('   Step 3 (Diagnosis):', result.workflow?.step3_diagnosis ? '✅' : '❌')
      console.log('   Step 4 (Report):', result.workflow?.step4_report ? '✅' : '❌')
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du traitement de la dictée')
      }
      
      // Show real workflow steps from backend
      if (result.workflow?.step3_diagnosis) {
        setProcessingStep(`Analyse diagnostique terminée: ${result.workflow.step3_diagnosis.primaryDiagnosis || 'Diagnostic en cours'}`)
        setProcessingProgress(70)
      }
      
      if (result.workflow?.step4_report) {
        setProcessingStep(`Rapport généré avec succès (${result.workflow.step4_report.prescriptionMedications || 0} médicaments)`)
        setProcessingProgress(90)
      }
      
      setProcessingProgress(100)
      setProcessingStep("✅ Workflow complet terminé: Transcription → Extraction → Diagnostic → Rapport")
      
      console.log('✅ Voice dictation processing completed:', result)
      console.log('📊 Final Report Structure:', {
        hasFinalReport: !!result.finalReport,
        hasConsultationId: !!result.finalReport?.consultationId,
        finalReportKeys: result.finalReport ? Object.keys(result.finalReport) : [],
        consultationId: result.finalReport?.consultationId || 'NOT FOUND'
      })
      
      // Store consultation ID for follow-up
      if (result.finalReport?.consultationId) {
        sessionStorage.setItem('lastConsultationId', result.finalReport.consultationId)
      } else {
        console.warn('⚠️ No consultationId found in finalReport!')
        console.warn('   Checking alternative locations...')
        
        // Try to find consultationId in other locations
        const alternativeId = 
          result.consultationId ||
          result.finalReport?.medicalReport?.consultationId ||
          result.finalReport?.report?.consultationId ||
          result.metadata?.consultationId
        
        if (alternativeId) {
          console.log('✅ Found consultationId in alternative location:', alternativeId)
          sessionStorage.setItem('lastConsultationId', alternativeId)
        } else {
          console.error('❌ No consultationId found anywhere in the response!')
          console.error('   Full result structure:', JSON.stringify(result, null, 2))
        }
      }
      
      setSuccess(true)
      
      // Redirect to report view after 2 seconds
      setTimeout(() => {
        // Try to find consultationId in multiple locations
        const consultationId = 
          result.finalReport?.consultationId ||
          result.consultationId ||
          result.finalReport?.medicalReport?.consultationId ||
          result.finalReport?.report?.consultationId ||
          result.metadata?.consultationId ||
          sessionStorage.getItem('lastConsultationId')
        
        if (consultationId) {
          console.log('🔄 Redirecting to report:', consultationId)
          router.push(`/view-report/${consultationId}`)
        } else {
          console.warn('⚠️ No consultationId found - storing report in session and redirecting to hub')
          
          // Store the full report in sessionStorage for later retrieval
          if (result.finalReport) {
            sessionStorage.setItem('lastVoiceDictationReport', JSON.stringify(result.finalReport))
          }
          
          router.push('/consultation-hub')
        }
      }, 2000)
      
    } catch (error) {
      console.error('❌ Error processing audio:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du traitement de la dictée vocale')
      setProcessingProgress(0)
      setProcessingStep("")
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleBackToHub = () => {
    router.push('/consultation-hub')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/tibok-logo.png.png"
            alt="TIBOK Logo"
            className="h-12 w-auto object-contain"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Mic className="h-8 w-8 text-purple-600" />
              Dictée Vocale Médicale
            </h1>
            <p className="text-gray-600 mt-1">
              Enregistrez votre consultation vocalement pour génération automatique du rapport
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                ✅ Consultations normales
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                🚨 Urgences
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                🏥 Spécialistes
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                📋 Correspondants
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleBackToHub}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour Hub
          </Button>
        </div>
      </div>

      {/* Patient Info Card */}
      {patientData && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <User className="h-5 w-5" />
              Patient
              {isExistingPatient && (
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  Patient existant
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {(patientData.firstName || patientData.lastName) && (
                <div>
                  <span className="text-blue-700 font-medium">Nom:</span>
                  <p className="text-blue-900">{patientData.firstName} {patientData.lastName}</p>
                </div>
              )}
              {patientData.age && (
                <div>
                  <span className="text-blue-700 font-medium">Âge:</span>
                  <p className="text-blue-900">{patientData.age} ans</p>
                </div>
              )}
              {patientData.gender && (
                <div>
                  <span className="text-blue-700 font-medium">Genre:</span>
                  <p className="text-blue-900">{patientData.gender === 'Male' ? 'Homme' : 'Femme'}</p>
                </div>
              )}
              {patientData.phone && (
                <div>
                  <span className="text-blue-700 font-medium">Téléphone:</span>
                  <p className="text-blue-900">{patientData.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor Info Card */}
      {doctorData ? (
        <Card className="mb-6 border-teal-200 bg-teal-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-900">
              <Stethoscope className="h-5 w-5" />
              Médecin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-teal-700 font-medium">Nom:</span>
                <p className="text-teal-900">{doctorData.nom}</p>
              </div>
              <div>
                <span className="text-teal-700 font-medium">Qualifications:</span>
                <p className="text-teal-900">{doctorData.qualifications}</p>
              </div>
              <div>
                <span className="text-teal-700 font-medium">Spécialité:</span>
                <p className="text-teal-900">{doctorData.specialite}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert className="mb-6 border-yellow-300 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>Informations médecin non disponibles.</strong> Veuillez inclure vos informations (nom, qualifications, spécialité) dans la dictée vocale.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Recording Card */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-purple-600" />
            Enregistrement de la Dictée
          </CardTitle>
          <CardDescription>
            Enregistrez votre consultation médicale. Le système transcrit automatiquement et génère un rapport complet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Instructions */}
            {!recordingState.audioBlob && !recordingState.isRecording && (
              <Alert className="border-purple-200 bg-purple-50">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-900">
                  <strong>Instructions:</strong> Cliquez sur "Démarrer l'enregistrement" et dictez votre consultation.
                  <br />
                  <strong>Incluez:</strong> Informations patient, symptômes, signes vitaux, examen clinique, diagnostic, prescriptions.
                  <br />
                  <strong>Types supportés:</strong> Consultations normales, urgences, spécialistes, correspondants, maladies chroniques.
                  {!doctorData && (
                    <>
                      <br />
                      <strong>⚠️ Important:</strong> Mentionnez vos informations (nom, spécialité, qualifications) au début de la dictée.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Recording Status */}
            {recordingState.isRecording && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-red-50 border-2 border-red-500 rounded-full">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-2xl font-bold text-red-600 font-mono">
                    {formatDuration(recordingState.duration)}
                  </span>
                </div>
                <p className="text-gray-600 mt-4">Enregistrement en cours...</p>
              </div>
            )}

            {/* Audio Ready */}
            {recordingState.audioBlob && !recordingState.isRecording && (
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-green-50 border-2 border-green-500 rounded-lg">
                  <FileAudio className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-semibold text-green-900">Enregistrement prêt</p>
                    <p className="text-sm text-green-700">Durée: {formatDuration(recordingState.duration)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex justify-center gap-4">
              {!recordingState.isRecording && !recordingState.audioBlob && (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 px-8"
                  disabled={isProcessing}
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Démarrer l'Enregistrement
                </Button>
              )}

              {recordingState.isRecording && (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="px-8"
                >
                  <Square className="mr-2 h-5 w-5" />
                  Arrêter l'Enregistrement
                </Button>
              )}

              {recordingState.audioBlob && !isProcessing && (
                <>
                  <Button
                    onClick={processAudio}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 px-8"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Traiter la Dictée
                  </Button>
                  <Button
                    onClick={discardRecording}
                    size="lg"
                    variant="outline"
                    className="px-8"
                  >
                    Recommencer
                  </Button>
                </>
              )}
            </div>

            {/* Processing Progress */}
            {isProcessing && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">{processingStep}</span>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                        Progression
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-purple-600">
                        {processingProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                    <div 
                      style={{ width: `${processingProgress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-600 transition-all duration-500"
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Succès!</strong> Rapport de consultation généré. Redirection en cours...
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📝 Contenu Recommandé</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Identité patient (âge, sexe, poids, taille)</li>
              <li>• Motif de consultation</li>
              <li>• Symptômes et leur durée</li>
              <li>• Signes vitaux (TA, pouls, température, SpO2)</li>
              <li>• Examen clinique</li>
              <li>• Diagnostic et différentiels</li>
              <li>• Prescriptions et posologie</li>
              <li>• Plan de suivi</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🏥 Types Supportés</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Consultations normales</li>
              <li>🚨 Urgences médicales</li>
              <li>🩺 Consultations spécialistes</li>
              <li>📋 Consultations de correspondants</li>
              <li>💊 Suivi maladies chroniques</li>
              <li>🔄 Renouvellements ordonnances</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Le système détecte automatiquement le type de consultation à partir de votre dictée.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚡ Workflow Automatique</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Transcription Whisper (FR/EN)</li>
              <li>✅ Extraction GPT-4o (données cliniques)</li>
              <li>✅ Analyse diagnostique (API Diagnosis)</li>
              <li>✅ Génération rapport (API Report)</li>
              <li>✅ Validation DCI & interactions</li>
              <li>✅ Format UK/Maurice</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
