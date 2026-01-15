"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void
  language?: string
  disabled?: boolean
}

export function VoiceDictationButton({
  onTranscript,
  language = "fr",
  disabled = false
}: VoiceDictationButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)

        // Stop and cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)

      toast({
        title: "🎤 Recording...",
        description: "Speak clearly into your microphone. Click again to stop.",
        duration: 2000
      })

      console.log('🎤 Recording started (Whisper mode)')
    } catch (error: any) {
      console.error('Error starting recording:', error)

      let errorMessage = "Could not start recording"
      if (error.name === 'NotAllowedError') {
        errorMessage = "Microphone access denied. Please allow microphone access in browser settings."
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No microphone found. Please check your device."
      }

      toast({
        title: "❌ Recording Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log('🎤 Recording stopped')
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)

    try {
      const audioFile = new File(
        [audioBlob],
        `voice_${Date.now()}.webm`,
        { type: 'audio/webm' }
      )

      const formData = new FormData()
      formData.append('audioFile', audioFile)
      formData.append('doctorInfo', JSON.stringify({}))

      console.log('📤 Sending audio to Whisper API...')

      const response = await fetch('/api/voice-dictation-transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      const result = await response.json()
      const transcribedText = result.transcription?.text || ''

      console.log('✅ Whisper transcription:', transcribedText)

      if (transcribedText) {
        onTranscript(transcribedText)
        toast({
          title: "✅ Transcription Complete",
          description: `${transcribedText.length} characters transcribed`,
          duration: 2000
        })
      } else {
        toast({
          title: "⚠️ No Speech Detected",
          description: "Please try again and speak clearly",
          duration: 3000
        })
      }
    } catch (error: any) {
      console.error('Error transcribing audio:', error)
      toast({
        title: "❌ Transcription Error",
        description: "Could not transcribe audio. Please try again.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      onClick={toggleRecording}
      disabled={disabled || isTranscribing}
      title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start voice dictation (Whisper)"}
      className={isRecording ? "animate-pulse" : ""}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
