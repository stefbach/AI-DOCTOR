"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Pill,
  FlaskConical,
  Scan,
  FileText,
  Mic,
  Square
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: any[]
}

interface ReportContext {
  patientInfo?: any
  diagnosis?: any
  medications?: any[]
  labTests?: any[]
  imagingStudies?: any[]
  narrativeContent?: any
  consultationType?: 'general' | 'dermatology' | 'chronic'
}

interface MedicalReportChatAssistantProps {
  reportContext: ReportContext
  onApplyAction: (action: any) => void
  onUpdateReport: (updates: any) => void
  mode?: 'assistant' | 'correction' | 'suggestion'
}

export default function MedicalReportChatAssistant({ 
  reportContext, 
  onApplyAction,
  onUpdateReport,
  mode = 'assistant'
}: MedicalReportChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Bonjour Docteur ! Je suis votre assistant AI pour la révision du rapport médical. 

Je peux vous aider à :
✅ Corriger ou modifier les prescriptions (médicaments, examens)
✅ Ajouter ou supprimer des éléments du rapport
✅ Répondre à vos questions sur le diagnostic
✅ Suggérer des améliorations basées sur les meilleures pratiques
🎤 Utiliser la dictée vocale pour vos questions

Comment puis-je vous assister aujourd'hui ?`,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState('')
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Voice Recording Functions
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
        title: "🎤 Enregistrement en cours",
        description: "Parlez maintenant, cliquez à nouveau pour arrêter"
      })
    } catch (error: any) {
      console.error('Error starting recording:', error)
      toast({
        title: "❌ Erreur d'enregistrement",
        description: error.message,
        variant: "destructive"
      })
    }
  }
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }
  
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    
    try {
      // Convert to File
      const audioFile = new File([audioBlob], `chat_voice_${Date.now()}.webm`, { type: 'audio/webm' })
      
      const formData = new FormData()
      formData.append('audioFile', audioFile)
      formData.append('doctorInfo', JSON.stringify({})) // Empty for transcription only
      
      const response = await fetch('/api/voice-dictation-transcribe', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }
      
      const result = await response.json()
      const transcribedText = result.transcription?.text || ''
      
      if (transcribedText) {
        setInputMessage(transcribedText)
        inputRef.current?.focus()
        
        toast({
          title: "✅ Transcription réussie",
          description: `Texte: "${transcribedText.substring(0, 50)}..."`
        })
      }
    } catch (error: any) {
      console.error('Error transcribing audio:', error)
      toast({
        title: "❌ Erreur de transcription",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/medical-report-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          conversationHistory: messages.slice(-10), // Last 10 messages
          reportContext,
          conversationId,
          mode
        })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          actions: data.actions || []
        }

        setMessages(prev => [...prev, assistantMessage])
        
        if (!conversationId) {
          setConversationId(data.conversationId)
        }

        // Show toast for actions
        if (data.actions && data.actions.length > 0) {
          toast({
            title: `${data.actions.length} action(s) proposée(s)`,
            description: "Cliquez sur les actions pour les appliquer au rapport"
          })
        }
      } else {
        throw new Error(data.message || 'Failed to get response')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "Erreur",
        description: "Impossible de communiquer avec l'assistant",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const applyAction = (action: any) => {
    console.log('Applying action:', action)
    onApplyAction(action)
    
    toast({
      title: "✅ Action appliquée",
      description: action.explanation || "Modification effectuée avec succès"
    })
  }

  const getActionIcon = (target: string) => {
    switch (target) {
      case 'medication': return <Pill className="h-4 w-4" />
      case 'lab_test': return <FlaskConical className="h-4 w-4" />
      case 'imaging': return <Scan className="h-4 w-4" />
      case 'narrative': return <FileText className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  const getActionColor = (type: string) => {
    switch (type) {
      case 'add': return 'bg-green-500'
      case 'modify': return 'bg-blue-500'
      case 'delete': return 'bg-red-500'
      case 'suggest': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'add': return 'Ajouter'
      case 'modify': return 'Modifier'
      case 'delete': return 'Supprimer'
      case 'suggest': return 'Suggestion'
      default: return 'Action'
    }
  }

  return (
    <Card className="w-full h-[600px] flex flex-col shadow-2xl border-2 border-cyan-200">
      <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Assistant Médical AI</CardTitle>
              <p className="text-sm text-cyan-100 mt-1">
                Mode: {mode === 'assistant' ? '🤖 Assistant' : mode === 'correction' ? '✏️ Correction' : '💡 Suggestions'}
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-0">
            {messages.length - 1} messages
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-5 w-5 text-white" />
                  ) : (
                    <Bot className="h-5 w-5 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white ml-auto'
                      : 'bg-gray-100 border border-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>

                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.actions.map((action: any, actionIndex: number) => (
                        <div 
                          key={actionIndex}
                          className="flex items-start gap-2 p-3 bg-white border-2 border-cyan-200 rounded-xl hover:border-cyan-400 transition-all"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${getActionColor(action.type)} text-white`}>
                                {getActionIcon(action.target)}
                                <span className="ml-1">{getActionLabel(action.type)}</span>
                              </Badge>
                              {action.target && (
                                <span className="text-xs text-gray-600 font-medium">
                                  {action.target.replace('_', ' ').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">
                              {action.explanation}
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => applyAction(action)}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Appliquer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl p-4 bg-gray-100 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                      <span className="text-sm text-gray-600">L'assistant réfléchit...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez une question ou demandez une modification..."
              disabled={isLoading || isTranscribing}
              className="flex-1"
            />
            
            {/* Voice Recording Button */}
            <Button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing}
              variant={isRecording ? "destructive" : "outline"}
              className={isRecording ? "animate-pulse" : ""}
              title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
            >
              {isTranscribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isRecording ? (
                <Square className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            
            {/* Send Button */}
            <Button 
              onClick={sendMessage}
              disabled={isLoading || isTranscribing || !inputMessage.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Peux-tu vérifier si toutes les prescriptions sont correctes ?")}
              disabled={isLoading}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Vérifier prescriptions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Suggère des examens complémentaires basés sur le diagnostic")}
              disabled={isLoading}
              className="text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Suggérer examens
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Y a-t-il des contre-indications ou interactions médicamenteuses ?")}
              disabled={isLoading}
              className="text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Vérifier interactions
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
