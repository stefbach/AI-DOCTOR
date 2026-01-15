"use client"

// TIBOK Medical Assistant Component
// Expert AI for Professional Report Analysis & Modification
// Integrated with all 4 medical documents: Report, Prescription, Laboratory, Imaging

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Brain,
  Shield,
  Mic,
  Square,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Activity,
  ClipboardList,
  Zap
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// ==================== TYPES ====================
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: AssistantAction[]
  alerts?: AssistantAlert[]
  suggestions?: AssistantSuggestion[]
}

interface AssistantAction {
  type: string
  section?: string
  action?: 'add' | 'update' | 'remove'
  content?: any
  reasoning?: string
}

interface AssistantAlert {
  type: 'critical' | 'warning' | 'info'
  message: string
}

interface AssistantSuggestion {
  category: string
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  reasoning: string
}

interface DocumentContext {
  medicalReport?: any
  prescription?: any
  laboratoryTests?: any
  imagingStudies?: any
  patientInfo?: any
  vitalSigns?: any
}

interface TibokMedicalAssistantProps {
  reportData: any
  onUpdateSection: (section: string, value: string) => void
  onUpdateMedication: (index: number, medication: any) => void
  onAddMedication: (medication: any) => void
  onRemoveMedication: (index: number) => void
  onUpdateLabTest: (category: string, index: number, test: any) => void
  onAddLabTest: (category: string, test: any) => void
  onRemoveLabTest: (category: string, index: number) => void
  onUpdateImaging: (index: number, exam: any) => void
  onAddImaging: (exam: any) => void
  onRemoveImaging: (index: number) => void
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

// ==================== QUICK ACTIONS ====================
const QUICK_ACTIONS = [
  {
    id: 'suggest_lab_tests',
    label: 'Suggest Lab Tests',
    icon: FlaskConical,
    prompt: 'Based on the diagnosis and treatment, what laboratory tests should I add for optimal monitoring? Suggest 1-2 specific tests with clear clinical indications.',
    color: 'bg-purple-500'
  },
  {
    id: 'suggest_imaging',
    label: 'Suggest Imaging',
    icon: Activity,
    prompt: 'Based on the clinical presentation, what imaging studies should I add? Suggest 1-2 relevant exams (ECG, X-ray, CT, etc.) with clinical indications.',
    color: 'bg-blue-500'
  },
  {
    id: 'improve_report',
    label: 'Improve Report',
    icon: FileText,
    prompt: 'Review the medical report sections. Suggest improvements or additions to: diagnostic conclusion, management plan, or follow-up recommendations. Max 1-2 modifications.',
    color: 'bg-indigo-500'
  },
  {
    id: 'check_interactions',
    label: 'Check Interactions',
    icon: AlertTriangle,
    prompt: 'Check for drug interactions between prescribed medications. If issues found, suggest alternatives.',
    color: 'bg-orange-500'
  },
  {
    id: 'optimize_medication',
    label: 'Optimize Medication',
    icon: Pill,
    prompt: 'Review prescribed medications. Suggest dosage adjustments or additions based on NICE/BNF guidelines. Max 1-2 suggestions.',
    color: 'bg-green-500'
  },
  {
    id: 'safety_monitoring',
    label: 'Safety Monitoring',
    icon: Shield,
    prompt: 'What monitoring tests are required for the prescribed medications? Suggest essential lab tests for drug safety.',
    color: 'bg-red-500'
  }
]

// ==================== MAIN COMPONENT ====================
export default function TibokMedicalAssistant({
  reportData,
  onUpdateSection,
  onUpdateMedication,
  onAddMedication,
  onRemoveMedication,
  onUpdateLabTest,
  onAddLabTest,
  onRemoveLabTest,
  onUpdateImaging,
  onAddImaging,
  onRemoveImaging,
  isMinimized = false,
  onToggleMinimize
}: TibokMedicalAssistantProps) {
  
  // ==================== STATE ====================
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `🏥 **TIBOK Medical Assistant**

Hello Doctor! I am your AI expert to **suggest additions and improvements** to your consultation.

**I have access to your generated documents:**
📄 Medical Report (Chief Complaint, History, Examination, Diagnosis, Management, Recommendations)
💊 Medication Prescription
🔬 Laboratory Tests
🩻 Imaging Studies

**I can suggest:**
✅ Missing lab tests (HbA1c, Creatinine, Lipid profile, etc.)
✅ Additional imaging exams (ECG, X-ray, CT scan, etc.)
✅ **Medical report improvements** - Enhance any section with clinical details
✅ Medication adjustments (dosage optimization, new prescriptions)
✅ Safety checks (drug interactions, contraindications)

**📝 To modify medical report sections, just ask me:**
• "Add more details to the diagnostic conclusion"
• "Improve the management plan with specific targets"
• "Enhance follow-up recommendations"
• "Complete the physical examination findings"

I will suggest precise improvements that you can review and apply!`,
      timestamp: new Date()
    }
  ])
  
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'chat' | 'alerts' | 'suggestions'>('chat')
  const [pendingAlerts, setPendingAlerts] = useState<AssistantAlert[]>([])
  const [pendingSuggestions, setPendingSuggestions] = useState<AssistantSuggestion[]>([])
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // ==================== AUTO-SCROLL ====================
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // ==================== BUILD DOCUMENT CONTEXT ====================
  const buildDocumentContext = useCallback((): DocumentContext => {
    if (!reportData) return {}

    return {
      patientInfo: reportData.compteRendu?.patient || {},
      vitalSigns: {
        bloodPressureSystolic: reportData.compteRendu?.patient?.bloodPressureSystolic,
        bloodPressureDiastolic: reportData.compteRendu?.patient?.bloodPressureDiastolic,
        temperature: reportData.compteRendu?.patient?.temperature,
        bloodGlucose: reportData.compteRendu?.patient?.bloodGlucose
      },
      medicalReport: reportData.compteRendu?.rapport || {},
      prescription: {
        medicaments: reportData.ordonnances?.medicaments?.prescription?.medicaments || []
      },
      laboratoryTests: {
        analyses: reportData.ordonnances?.biologie?.prescription?.analyses || {}
      },
      imagingStudies: {
        examens: reportData.ordonnances?.imagerie?.prescription?.examens || []
      }
    }
  }, [reportData])

  // ==================== VOICE RECORDING FUNCTIONS ====================
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
    } catch (error: any) {
      console.error('Error starting recording:', error)
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
      const audioFile = new File([audioBlob], `tibok_voice_${Date.now()}.webm`, { type: 'audio/webm' })

      const formData = new FormData()
      formData.append('audioFile', audioFile)
      formData.append('doctorInfo', JSON.stringify({}))

      console.log('🎤 AI Assistant: Sending audio for transcription...')

      const response = await fetch('/api/voice-dictation-transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('🎤 AI Assistant: Transcription result:', result)

      // Use normalized text if available, otherwise use raw text
      const transcribedText = result.transcription?.normalizedText || result.transcription?.text || ''

      console.log('🎤 AI Assistant: Transcribed text:', transcribedText)

      if (transcribedText) {
        setInputMessage(transcribedText)
        inputRef.current?.focus()
        toast({
          title: "✅ Transcription réussie",
          description: transcribedText.length > 50 ? transcribedText.substring(0, 50) + '...' : transcribedText,
          duration: 3000
        })
      } else {
        toast({
          title: "⚠️ Aucun texte détecté",
          description: "Veuillez parler plus clairement et réessayer",
          duration: 3000
        })
      }
    } catch (error: any) {
      console.error('Error transcribing audio:', error)
      toast({
        title: "❌ Erreur de transcription",
        description: "Impossible de transcrire l'audio. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  // ==================== SEND MESSAGE ====================
  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || inputMessage
    if (!messageToSend.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const documentContext = buildDocumentContext()

      const response = await fetch('/api/tibok-medical-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          documentContext,
          conversationId
        })
      })

      const data = await response.json()
      
      console.log('📥 TIBOK API Response:', {
        success: data.success,
        responseLength: data.response?.length || 0,
        responsePreview: data.response?.substring(0, 200) || 'empty',
        actionsCount: data.actions?.length || 0,
        alertsCount: data.alerts?.length || 0
      })

      if (data.success) {
        // CRITICAL: Clean response client-side as additional security
        let cleanedResponse = data.response || ''
        
        // Remove any JSON that might have slipped through
        if (cleanedResponse.includes('"type":') || cleanedResponse.includes('"action":') || cleanedResponse.includes('{"response"')) {
          console.warn('🧹 Client-side JSON detected in response, cleaning...')
          cleanedResponse = "✅ Analyse effectuée avec succès.\n\nVeuillez consulter les actions proposées ci-dessous pour appliquer les modifications recommandées."
        }
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: cleanedResponse,
          timestamp: new Date(),
          actions: data.actions || [],
          alerts: data.alerts || [],
          suggestions: data.suggestions || []
        }

        setMessages(prev => [...prev, assistantMessage])

        if (!conversationId) {
          setConversationId(data.conversationId)
        }

        // Update pending alerts and suggestions
        if (data.alerts && data.alerts.length > 0) {
          setPendingAlerts(prev => [...prev, ...data.alerts])
        }
        if (data.suggestions && data.suggestions.length > 0) {
          setPendingSuggestions(prev => [...prev, ...data.suggestions])
        }

        // Show toast for critical alerts
        const criticalAlerts = data.alerts?.filter((a: AssistantAlert) => a.type === 'critical') || []
        if (criticalAlerts.length > 0) {
          toast({
            title: "⚠️ Alerte critique",
            description: criticalAlerts[0].message,
            variant: "destructive"
          })
        }

        // Show toast for actions
        if (data.actions && data.actions.length > 0) {
          toast({
            title: `${data.actions.length} action(s) proposée(s)`,
            description: "Cliquez sur les actions pour les appliquer"
          })
        }
      } else {
        throw new Error(data.message || 'Failed to get response')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "Erreur",
        description: "Impossible de communiquer avec l'assistant TIBOK",
        variant: "destructive"
      })
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "❌ Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // ==================== APPLY ACTION ====================
  const applyAction = useCallback((action: AssistantAction) => {
    console.log('🎯 ====== APPLYING TIBOK ACTION ======')
    console.log('🎯 Action type:', action.type)
    console.log('🎯 Action.action:', action.action)
    console.log('🎯 Full action:', JSON.stringify(action, null, 2))

    try {
      switch (action.type) {
        case 'modify_medical_report':
          if (action.section && action.content) {
            const value = action.content.value || action.content.text || action.content ||
                         (typeof action.content === 'string' ? action.content : JSON.stringify(action.content))
            onUpdateSection(action.section, value)
            toast({
              title: "✅ Medical report updated",
              description: action.reasoning || `Section "${action.section}" modified`
            })
          } else {
            toast({
              title: "⚠️ Incomplete action",
              description: "Section or content is missing",
              variant: "destructive"
            })
          }
          break

        case 'modify_medication_prescription':
          if (action.action === 'add' || (action.action === 'update' && action.content?.index === undefined)) {
            // Map English fields (from AI) to French fields (expected by system)
            const medication = {
              nom: action.content?.name || action.content?.nom || 'New medication',
              denominationCommune: action.content?.generic_name || action.content?.denominationCommune || action.content?.dci || action.content?.name || '',
              dosage: action.content?.dosage || '',
              forme: action.content?.form || action.content?.forme || 'tablet',
              posologie: action.content?.dosing || action.content?.posologie || '',
              voieAdministration: action.content?.route || action.content?.voieAdministration || 'oral',
              dureeTraitement: action.content?.duration || action.content?.dureeTraitement || '',
              quantite: action.content?.quantity || action.content?.quantite || '',
              instructions: action.content?.instructions || '',
              justification: action.content?.indication || action.content?.justification || action.reasoning || '',
              medication_type: action.content?.medication_type || 'prescription'
            }
            console.log('💊 Adding/Updating medication:', medication)
            onAddMedication(medication)
            toast({
              title: action.action === 'update' ? "✅ Medication added (modification)" : "✅ Medication added",
              description: `${medication.nom} ${medication.dosage ? `(${medication.dosage})` : ''} added to prescription`
            })
          } else if (action.action === 'remove') {
            const index = action.content?.index ?? 0
            onRemoveMedication(index)
            toast({
              title: "✅ Médicament retiré",
              description: action.reasoning || "Médicament retiré de l'ordonnance"
            })
          } else if (action.action === 'update' && action.content?.index !== undefined) {
            // Only do true update if index is provided
            const index = action.content.index
            const medication = action.content?.medication || action.content
            onUpdateMedication(index, medication)
            toast({
              title: "✅ Médicament modifié",
              description: action.reasoning || "Prescription mise à jour"
            })
          }
          break

        case 'modify_lab_prescription':
          if (action.action === 'add') {
            console.log('🔬 LAB ACTION - Raw content:', JSON.stringify(action.content, null, 2))
            const category = action.content?.category || 'clinicalChemistry'
            // Map English fields (from AI) to French fields (expected by system)
            const testData = action.content?.test || action.content
            const test = {
              nom: testData?.name || testData?.nom || 'New test',
              code: testData?.code || '',
              motifClinique: testData?.clinical_indication || testData?.motifClinique || testData?.indication || action.reasoning || '',
              urgence: testData?.urgent || testData?.urgence || false,
              aJeun: testData?.fasting || testData?.aJeun || false
            }
            console.log('🔬 LAB ACTION - Calling onAddLabTest with:', {category, test})
            onAddLabTest(category, test)
            console.log('✅ LAB ACTION - onAddLabTest called successfully')
            toast({
              title: "✅ Biological exam added",
              description: `${test.nom} added to Laboratory (${category})`
            })
          } else if (action.action === 'remove') {
            const category = action.content?.category || 'clinicalChemistry'
            const index = action.content?.index ?? 0
            onRemoveLabTest(category, index)
            toast({
              title: "✅ Examen biologique retiré",
              description: action.reasoning || "Test retiré de la prescription"
            })
          }
          break

        case 'modify_paraclinical_prescription':
          if (action.action === 'add') {
            console.log('🩻 IMAGING ACTION - Raw content:', JSON.stringify(action.content, null, 2))
            // Map English fields (from AI) to French fields (expected by system)
            const exam = {
              type: action.content?.type || action.content?.modalite || 'Imaging',
              modalite: action.content?.modality || action.content?.modalite || action.content?.type || '',
              region: action.content?.region || action.content?.area || '',
              indicationClinique: action.content?.clinical_indication || action.content?.indicationClinique || action.content?.indication || action.reasoning || '',
              urgence: action.content?.urgent || action.content?.urgence || false,
              contraste: action.content?.contrast || action.content?.contraste || false,
              instructions: action.content?.instructions || ''
            }
            console.log('🩻 IMAGING ACTION - Calling onAddImaging with:', exam)
            onAddImaging(exam)
            toast({
              title: "✅ Imaging exam added",
              description: `${exam.type} ${exam.region ? `- ${exam.region}` : ''} added to Imaging`
            })
          } else if (action.action === 'remove') {
            const index = action.content?.index ?? 0
            onRemoveImaging(index)
            toast({
              title: "✅ Examen paraclinique retiré",
              description: action.reasoning || "Examen retiré"
            })
          }
          break

        case 'analyze_document_coherence':
        case 'none':
          // Just informational, no action needed
          toast({
            title: "ℹ️ Information",
            description: action.reasoning || "Analyse terminée"
          })
          break

        default:
          console.log('⚠️ Action type not handled:', action.type)
          toast({
            title: "⚠️ Action non reconnue",
            description: `Type d'action "${action.type}" non géré`,
            variant: "destructive"
          })
      }
    } catch (error) {
      console.error('❌ Error applying action:', error)
      toast({
        title: "Erreur",
        description: `Impossible d'appliquer cette action: ${error}`,
        variant: "destructive"
      })
    }
  }, [onUpdateSection, onAddMedication, onRemoveMedication, onUpdateMedication, onAddLabTest, onRemoveLabTest, onAddImaging, onRemoveImaging])

  // ==================== GET ICON FOR ACTION ====================
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'modify_medication_prescription': return <Pill className="h-4 w-4" />
      case 'modify_lab_prescription': return <FlaskConical className="h-4 w-4" />
      case 'modify_paraclinical_prescription': return <Scan className="h-4 w-4" />
      case 'modify_medical_report': return <FileText className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  // ==================== GET COLOR FOR PRIORITY ====================
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // ==================== GET ALERT STYLE ====================
  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-300 text-red-800'
      case 'warning': return 'bg-yellow-50 border-yellow-300 text-yellow-800'
      case 'info': return 'bg-blue-50 border-blue-300 text-blue-800'
      default: return 'bg-gray-50 border-gray-300 text-gray-800'
    }
  }

  // ==================== RENDER MINIMIZED ====================
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={onToggleMinimize}
      >
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform">
          <Brain className="h-8 w-8" />
        </div>
        {pendingAlerts.length > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {pendingAlerts.length}
          </div>
        )}
      </div>
    )
  }

  // ==================== MAIN RENDER ====================
  return (
    <Card className="w-full h-[700px] flex flex-col shadow-2xl border-2 border-teal-200 overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Assistant Médical TIBOK
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  GPT-4 Encyclopédique
                </Badge>
              </CardTitle>
              <p className="text-sm text-teal-100 mt-1">
                Analyse & optimisation des 4 documents de consultation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0">
              <Activity className="h-3 w-3 mr-1" />
              {messages.length - 1} échanges
            </Badge>
            {onToggleMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMinimize}
                className="text-white hover:bg-white/20"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Quick Actions Bar */}
        <div className="border-b border-gray-200 bg-gray-50 p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              Actions rapides
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="text-gray-500"
            >
              {showQuickActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          
          {showQuickActions && (
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(action.prompt)}
                  disabled={isLoading}
                  className={`text-xs hover:text-white hover:${action.color} transition-colors`}
                >
                  <action.icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs for Chat/Alerts/Suggestions */}
        <Tabs value={activeAnalysisTab} onValueChange={(v) => setActiveAnalysisTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="chat" className="text-sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              Conversation
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-sm relative">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Alertes
              {pendingAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingAlerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-sm relative">
              <Lightbulb className="h-4 w-4 mr-1" />
              Suggestions
              {pendingSuggestions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingSuggestions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                        : 'bg-gradient-to-br from-teal-500 to-emerald-500'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <Brain className="h-5 w-5 text-white" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'items-end' : ''}`}>
                      <div className={`rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white ml-auto'
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: message.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br/>')
                          }}
                        />
                      </div>

                      {/* Actions */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-teal-500" />
                            {message.actions.length} action(s) proposée(s) :
                          </p>
                          {message.actions.map((action, actionIndex) => (
                            <div 
                              key={actionIndex}
                              className="flex items-start gap-2 p-3 bg-white border-2 border-teal-200 rounded-xl hover:border-teal-400 hover:shadow-md transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-teal-500 text-white px-2 py-1">
                                    {getActionIcon(action.type)}
                                    <span className="ml-1 capitalize">{action.action || 'Modifier'}</span>
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {action.type?.replace('modify_', '').replace(/_/g, ' ') || 'action'}
                                  </Badge>
                                  {action.section && (
                                    <span className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-0.5 rounded">
                                      {action.section}
                                    </span>
                                  )}
                                </div>
                                {/* Show content details */}
                                {action.content && (
                                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-2">
                                    {action.content.nom && <p><strong>Médicament:</strong> {action.content.nom}</p>}
                                    {action.content.denominationCommune && <p><strong>DCI:</strong> {action.content.denominationCommune}</p>}
                                    {action.content.dosage && <p><strong>Dosage:</strong> {action.content.dosage}</p>}
                                    {action.content.posologie && <p><strong>Posologie:</strong> {action.content.posologie}</p>}
                                    {action.content.dureeTraitement && <p><strong>Durée:</strong> {action.content.dureeTraitement}</p>}
                                    {action.content.test?.nom && <p><strong>Test:</strong> {action.content.test.nom}</p>}
                                    {action.content.type && <p><strong>Examen:</strong> {action.content.type}</p>}
                                    {action.content.description && <p><strong>Description:</strong> {action.content.description}</p>}
                                    {action.content.value && <p><strong>Valeur:</strong> {typeof action.content.value === 'string' ? action.content.value.substring(0, 100) + '...' : JSON.stringify(action.content.value).substring(0, 100)}</p>}
                                  </div>
                                )}
                                {action.reasoning && (
                                  <p className="text-sm text-gray-700 italic">
                                    💡 {action.reasoning}
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm"
                                onClick={() => applyAction(action)}
                                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-md"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Appliquer
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline Alerts */}
                      {message.alerts && message.alerts.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                            {message.alerts.length} alerte(s) :
                          </p>
                          {message.alerts.map((alert, alertIndex) => (
                            <Alert key={alertIndex} className={`${getAlertStyle(alert.type)} border-l-4`}>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="font-medium">{alert.message}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}

                      {/* Inline Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3 text-yellow-500" />
                            {message.suggestions.length} suggestion(s) :
                          </p>
                          {message.suggestions.map((suggestion, sugIndex) => (
                            <div key={sugIndex} className={`p-3 rounded-lg border-l-4 ${getPriorityColor(suggestion.priority)}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                                  {suggestion.priority?.toUpperCase() || 'INFO'}
                                </Badge>
                                <span className="text-xs text-gray-500 capitalize">{suggestion.category || 'général'}</span>
                              </div>
                              <p className="text-sm font-medium">{suggestion.suggestion}</p>
                              {suggestion.reasoning && (
                                <p className="text-xs text-gray-600 mt-1 italic">💡 {suggestion.reasoning}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-500 to-emerald-500">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="rounded-2xl p-4 bg-gray-100 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                          <span className="text-sm text-gray-600">
                            Analyse en cours avec mon expertise encyclopédique...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="flex-1 overflow-auto p-4 m-0">
            {pendingAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Shield className="h-12 w-12 mb-4 text-green-300" />
                <p className="text-lg font-medium">Aucune alerte</p>
                <p className="text-sm">Tout semble conforme</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAlerts.map((alert, index) => (
                  <Alert key={index} className={`${getAlertStyle(alert.type)}`}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex justify-between items-start">
                      <span>{alert.message}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingAlerts(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingAlerts([])}
                  className="w-full"
                >
                  Effacer toutes les alertes
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="flex-1 overflow-auto p-4 m-0">
            {pendingSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Lightbulb className="h-12 w-12 mb-4 text-yellow-300" />
                <p className="text-lg font-medium">Aucune suggestion</p>
                <p className="text-sm">Utilisez l'assistant pour générer des suggestions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSuggestions.map((suggestion, index) => (
                  <Card key={index} className={`border-2 ${getPriorityColor(suggestion.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getPriorityColor(suggestion.priority)}>
                              {suggestion.priority.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500 capitalize">{suggestion.category}</span>
                          </div>
                          <p className="text-sm font-medium">{suggestion.suggestion}</p>
                          {suggestion.reasoning && (
                            <p className="text-xs text-gray-600 mt-1">{suggestion.reasoning}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingSuggestions(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingSuggestions([])}
                  className="w-full"
                >
                  Effacer toutes les suggestions
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-3 bg-gray-50 flex-shrink-0">
          <div className="flex flex-col gap-2">
            {/* Text input - larger and more readable */}
            <Textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Posez une question ou demandez une modification..."
              disabled={isLoading || isTranscribing}
              className="w-full min-h-[60px] max-h-[120px] text-base resize-none"
              rows={2}
            />

            {/* Action buttons row */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={() => sendMessage(QUICK_ACTIONS[0].prompt)}
                disabled={isLoading || isTranscribing}
                title="Analyser la cohérence"
                className="h-10 w-10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              {/* Voice Recording Button */}
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isTranscribing}
                className={`h-10 w-10 ${isRecording ? "animate-pulse" : ""}`}
                title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || isTranscribing || !inputMessage.trim()}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 h-10 px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
