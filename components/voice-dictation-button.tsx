"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void
  language?: string
  continuous?: boolean
  disabled?: boolean
}

// Check if browser supports Web Speech API
const isSpeechRecognitionSupported = () => {
  if (typeof window === 'undefined') return false
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

export function VoiceDictationButton({
  onTranscript,
  language = "en-US",
  continuous = true,
  disabled = false
}: VoiceDictationButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const interimTranscriptRef = useRef<string>("")

  useEffect(() => {
    // Check browser support on mount
    setIsSupported(isSpeechRecognitionSupported())

    if (!isSpeechRecognitionSupported()) {
      return
    }

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started')
      setIsListening(true)
      toast({
        title: "🎤 Listening...",
        description: "Speak clearly into your microphone",
        duration: 2000
      })
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // Store interim transcript
      interimTranscriptRef.current = interimTranscript

      // Send final transcript to parent
      if (finalTranscript) {
        console.log('📝 Final transcript:', finalTranscript)
        onTranscript(finalTranscript.trim())
      }
    }

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error)
      
      let errorMessage = "An error occurred during voice recognition"
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = "No speech detected. Please try again."
          break
        case 'audio-capture':
          errorMessage = "No microphone found. Please check your device."
          break
        case 'not-allowed':
          errorMessage = "Microphone access denied. Please allow microphone access in browser settings."
          break
        case 'network':
          errorMessage = "Network error. Please check your internet connection."
          break
        case 'aborted':
          // User stopped recording, don't show error
          return
        default:
          errorMessage = `Voice recognition error: ${event.error}`
      }

      toast({
        title: "❌ Voice Recognition Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })
      
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('🎤 Voice recognition ended')
      setIsListening(false)
      
      // Auto-restart if continuous and user didn't stop manually
      if (continuous && recognitionRef.current && isListening) {
        try {
          recognition.start()
        } catch (err) {
          console.log('Recognition already started or error:', err)
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (err) {
          console.log('Error stopping recognition:', err)
        }
      }
    }
  }, [language, continuous, onTranscript, isListening])

  const startListening = () => {
    if (!recognitionRef.current || !isSupported) {
      toast({
        title: "❌ Not Supported",
        description: "Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
        duration: 5000
      })
      return
    }

    try {
      recognitionRef.current.start()
    } catch (err) {
      console.error('Error starting recognition:', err)
      toast({
        title: "❌ Error",
        description: "Could not start voice recognition. Please try again.",
        variant: "destructive",
        duration: 3000
      })
    }
  }

  const stopListening = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
      setIsListening(false)
      
      toast({
        title: "✅ Recording Stopped",
        description: "Voice dictation has been stopped",
        duration: 2000
      })
    } catch (err) {
      console.error('Error stopping recognition:', err)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (!isSupported) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled
        title="Voice recognition not supported in this browser"
      >
        <MicOff className="h-4 w-4 text-gray-400" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size="icon"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Stop voice dictation" : "Start voice dictation"}
      className={isListening ? "animate-pulse" : ""}
    >
      {isListening ? (
        <Mic className="h-4 w-4 animate-pulse" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
