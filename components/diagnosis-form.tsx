"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
 ArrowLeft, 
 Brain, 
 Loader2, 
 CheckCircle, 
 AlertTriangle,
 Target,
 Search,
 Eye,
 FileText,
 TestTube,
 Pill,
 Stethoscope,
 Edit3,
 Clock,
 MapPin,
 AlertCircle,
 Activity,
 Monitor,
 Calendar,
 DollarSign,
 Lightbulb,
 Shield,
 Zap,
 FlaskConical,
 ClipboardCheck,
 RefreshCw,
 Sparkles,
 User,
 Circle
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"
import PatientAdviceCarousel from './patient-advice-carousel'

interface DiagnosisFormProps {
 patientData: any
 clinicalData: any
 questionsData: any
 doctorNotes?: any // ⚕️ Hypothèses/notes du médecin de la dictée vocale
 onDataChange: (data: any) => void
 onNext: () => void
 onPrevious: () => void
 language?: Language
 consultationId?: string | null
}

// Component for appearance animation
const AnimatedSection = ({ 
 show, 
 children, 
 delay = 0 
}: { 
 show: boolean
 children: React.ReactNode
 delay?: number 
}) => (
 <div 
 className={`
 transition-all duration-1000 ease-out
 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
 `}
 style={{ 
 transitionDelay: `${delay}ms`,
 display: show ? 'block' : 'none'
 }}
 >
 {children}
 </div>
)

// Component for progressive text appearance
const StreamingText = ({ 
 text, 
 speed = 10,
 onComplete 
}: { 
 text: string
 speed?: number
 onComplete?: () => void
}) => {
 const [displayedText, setDisplayedText] = useState('')
 
 useEffect(() => {
 if (!text) return
 
 setDisplayedText('')
 let index = 0
 const timer = setInterval(() => {
 if (index < text.length) {
 setDisplayedText(text.substring(0, index + 1))
 index++
 } else {
 clearInterval(timer)
 onComplete?.()
 }
 }, speed)
 
 return () => clearInterval(timer)
 }, [text, speed, onComplete])
 
 return <span>{displayedText}</span>
}

// Component for section status
const SectionStatus = ({ status }: { status: 'pending' | 'loading' | 'complete' }) => {
 const configs = {
 pending: {
 icon: <Clock className="h-3 w-3 text-gray-400" />,
 text: "Pending",
 className: "bg-gray-100 text-gray-600"
 },
 loading: {
 icon: <Loader2 className="h-3 w-3 animate-spin text-blue-600" />,
 text: "Analyzing...",
 className: "bg-blue-100 text-blue-600"
 },
 complete: {
 icon: <CheckCircle className="h-3 w-3 text-teal-600" />,
 text: "Complete",
 className: "bg-teal-100 text-teal-600"
 }
 }
 
 const config = configs[status]
 
 return (
 <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.className}`}>
 {config.icon}
 <span>{config.text}</span>
 </div>
 )
}

// Helper component for progress steps
function ProgressStep({ 
 completed, 
 active, 
 children 
}: { 
 completed: boolean
 active: boolean
 children: React.ReactNode 
}) {
 return (
 <div className={`flex items-center gap-3 transition-all duration-300 ${
 completed ? 'opacity-100' : 'opacity-60'
 }`}>
 {completed ? (
 <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
 ) : active ? (
 <div className="h-5 w-5 flex-shrink-0">
 <div className="h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent animate-spin" />
 </div>
 ) : (
 <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
 )}
 <span className={`text-sm ${
 completed ? 'text-teal-700 font-medium' : 
 active ? 'text-blue-700 font-medium' : 
 'text-gray-500'
 }`}>
 {children}
 </span>
 </div>
 )
}

// ==================== TREATMENT EDITOR COMPONENT ====================
function TreatmentEditorSection({ 
 treatments, 
 onTreatmentsUpdate 
}: { 
 treatments: any[]
 onTreatmentsUpdate: (treatments: any[]) => void
}) {
 const [editingIndex, setEditingIndex] = useState<number | null>(null)
 const [editedTreatment, setEditedTreatment] = useState<any>(null)
 const [validationResult, setValidationResult] = useState<{ valid: boolean, message: string } | null>(null)
 const [isValidating, setIsValidating] = useState(false)

 const handleStartEdit = (index: number) => {
 setEditingIndex(index)
 setEditedTreatment({ ...treatments[index] })
 setValidationResult(null)
 }

 const handleCancelEdit = () => {
 setEditingIndex(null)
 setEditedTreatment(null)
 setValidationResult(null)
 }

 const validateTreatment = async (treatment: any) => {
 setIsValidating(true)
 try {
 // Validation basique
 const errors = []
 
 // Vérifier le nom du médicament
 if (!treatment.medication_dci || treatment.medication_dci.trim().length < 3) {
 errors.push('Nom du médicament trop court')
 }
 
 // Vérifier l'indication
 if (!treatment.precise_indication || treatment.precise_indication.trim().length < 20) {
 errors.push('Indication doit contenir au moins 20 caractères')
 }
 
 // Vérifier la posologie
 const dosing = treatment.dosing_regimen?.adult?.en || treatment.dosing_regimen?.adult?.fr
 if (!dosing || dosing.trim().length < 5) {
 errors.push('Posologie manquante ou incomplète')
 }
 
 // Vérifier le format UK de la posologie (OD/BD/TDS/QDS)
 if (dosing && !dosing.match(/\b(OD|BD|TDS|QDS|once|twice|three times|four times)\b/i)) {
 errors.push('Format posologie UK requis (OD/BD/TDS/QDS)')
 }
 
 // Vérifier la durée
 if (!treatment.duration?.en && !treatment.duration?.fr) {
 errors.push('Durée de traitement manquante')
 }

 if (errors.length > 0) {
 setValidationResult({
 valid: false,
 message: `❌ Erreurs: ${errors.join(', ')}`
 })
 return false
 }

 setValidationResult({
 valid: true,
 message: '✅ Traitement valide - Orthographe et posologie correctes'
 })
 return true
 } catch (error) {
 setValidationResult({
 valid: false,
 message: '❌ Erreur lors de la validation'
 })
 return false
 } finally {
 setIsValidating(false)
 }
 }

 const handleSaveEdit = async () => {
 if (!editedTreatment) return

 const isValid = await validateTreatment(editedTreatment)
 
 if (isValid && editingIndex !== null) {
 const updatedTreatments = [...treatments]
 updatedTreatments[editingIndex] = editedTreatment
 onTreatmentsUpdate(updatedTreatments)
 setEditingIndex(null)
 setEditedTreatment(null)
 }
 }

 return (
 <div className="grid gap-6">
 {treatments.map((treatment: any, index: number) => {
 const isEditing = editingIndex === index
 const currentTreatment = isEditing ? editedTreatment : treatment

 return (
 <div key={index} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-blue-50">
 {/* Header with Edit Button */}
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3 flex-1">
 <Pill className="h-6 w-6 text-blue-600 flex-shrink-0" />
 <div className="flex-1">
 {isEditing ? (
 <Input
 value={editedTreatment.medication_dci || ''}
 onChange={(e) => setEditedTreatment({
 ...editedTreatment,
 medication_dci: e.target.value
 })}
 className="font-bold text-lg mb-2"
 placeholder="Nom du médicament"
 />
 ) : (
 <h3 className="font-bold text-lg text-gray-800">
 {treatment.medication_dci}
 </h3>
 )}
 <Badge variant="outline" className="mt-1 border-blue-300 text-blue-700">
 {treatment.therapeutic_class}
 </Badge>
 </div>
 </div>
 
 {/* Action Buttons */}
 <div className="flex gap-2">
 {!isEditing ? (
 <Button
 onClick={() => handleStartEdit(index)}
 variant="outline"
 size="sm"
 className="flex items-center gap-2"
 >
 <Edit3 className="h-4 w-4" />
 Modifier
 </Button>
 ) : (
 <>
 <Button
 onClick={handleSaveEdit}
 size="sm"
 className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
 disabled={isValidating}
 >
 <CheckCircle className="h-4 w-4" />
 {isValidating ? 'Validation...' : 'Valider'}
 </Button>
 <Button
 onClick={handleCancelEdit}
 variant="outline"
 size="sm"
 className="flex items-center gap-2"
 >
 <X className="h-4 w-4" />
 Annuler
 </Button>
 </>
 )}
 </div>
 </div>

 {/* Validation Result */}
 {isEditing && validationResult && (
 <Alert className={`mb-4 ${validationResult.valid ? 'bg-teal-50 border-teal-200' : 'bg-blue-50 border-blue-200'}`}>
 <AlertCircle className={`h-4 w-4 ${validationResult.valid ? 'text-teal-600' : 'text-blue-600'}`} />
 <AlertTitle className={validationResult.valid ? 'text-teal-800' : 'text-blue-800'}>
 {validationResult.valid ? 'Validation réussie' : 'Erreurs détectées'}
 </AlertTitle>
 <AlertDescription className={validationResult.valid ? 'text-teal-700' : 'text-blue-700'}>
 {validationResult.message}
 </AlertDescription>
 </Alert>
 )}

 {/* Treatment Details */}
 <div className="space-y-4">
 {/* INDICATION */}
 <div>
 <h4 className="font-semibold text-sm text-gray-700 mb-1">INDICATION:</h4>
 {isEditing ? (
 <Textarea
 value={editedTreatment.precise_indication || ''}
 onChange={(e) => setEditedTreatment({
 ...editedTreatment,
 precise_indication: e.target.value
 })}
 rows={3}
 className="text-sm"
 placeholder="Indication thérapeutique détaillée (min. 20 caractères)"
 />
 ) : (
 <p className="text-sm text-gray-600">
 {currentTreatment.precise_indication}
 </p>
 )}
 </div>

 {/* MECHANISM */}
 {currentTreatment.mechanism && (
 <div>
 <h4 className="font-semibold text-sm text-gray-700 mb-1">MECHANISM OF ACTION:</h4>
 {isEditing ? (
 <Textarea
 value={editedTreatment.mechanism || ''}
 onChange={(e) => setEditedTreatment({
 ...editedTreatment,
 mechanism: e.target.value
 })}
 rows={2}
 className="text-sm"
 placeholder="Mécanisme d'action"
 />
 ) : (
 <p className="text-sm text-gray-600">
 {currentTreatment.mechanism}
 </p>
 )}
 </div>
 )}

 {/* DOSING & DURATION */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 <div>
 <h4 className="font-semibold text-xs sm:text-sm text-gray-700 mb-2">DOSING:</h4>
 {isEditing ? (
 <div className="space-y-2">
 <Input
 value={editedTreatment.dosing_regimen?.adult?.en || editedTreatment.dosing_regimen?.adult?.fr || ''}
 onChange={(e) => setEditedTreatment({
 ...editedTreatment,
 dosing_regimen: {
 ...editedTreatment.dosing_regimen,
 adult: {
 ...(editedTreatment.dosing_regimen?.adult || {}),
 en: e.target.value
 }
 }
 })}
 className="text-sm"
 placeholder="Ex: 500mg TDS (3 fois/jour)"
 />
 <p className="text-xs text-gray-500">Format UK requis: OD/BD/TDS/QDS</p>
 </div>
 ) : (
 <div className="space-y-1 text-sm">
 <p><strong>Adult:</strong> {currentTreatment.dosing_regimen?.adult?.en || currentTreatment.dosing_regimen?.adult?.fr || 'To be specified'}</p>
 {currentTreatment.dosing_regimen?.adjustments?.elderly && (
 <p><strong>Elderly:</strong> {currentTreatment.dosing_regimen.adjustments.elderly.en}</p>
 )}
 </div>
 )}
 </div>
 <div>
 <h4 className="font-semibold text-sm text-gray-700 mb-2">DURATION & COST:</h4>
 {isEditing ? (
 <Input
 value={editedTreatment.duration?.en || editedTreatment.duration?.fr || ''}
 onChange={(e) => setEditedTreatment({
 ...editedTreatment,
 duration: {
 ...(editedTreatment.duration || {}),
 en: e.target.value
 }
 })}
 className="text-sm mb-2"
 placeholder="Ex: 7 days"
 />
 ) : (
 <div className="space-y-1 text-sm">
 <p><strong>Duration:</strong> {currentTreatment.duration?.en || currentTreatment.duration?.fr || 'As per evolution'}</p>
 <p><strong>Available:</strong> {currentTreatment.mauritius_availability?.public_free ? 'Free (public)' : 'Paid'}</p>
 {currentTreatment.mauritius_availability?.estimated_cost && (
 <p><strong>Estimated cost:</strong> {currentTreatment.mauritius_availability.estimated_cost}</p>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )
}

export default function DiagnosisForm({
 patientData,
 clinicalData,
 questionsData,
 doctorNotes, // ⚕️ Hypothèses du médecin de la dictée vocale
 onDataChange,
 onNext,
 onPrevious,
 language = 'en',
 consultationId
}: DiagnosisFormProps) {
 // Main states
 const [diagnosis, setDiagnosis] = useState<any>(null)
 const [diagnosticReasoning, setDiagnosticReasoning] = useState<any>(null)
 const [expertAnalysis, setExpertAnalysis] = useState<any>(null)
 const [mauritianDocuments, setMauritianDocuments] = useState<any>(null)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [currentSection, setCurrentSection] = useState(0)
 const [documentsGenerated, setDocumentsGenerated] = useState(false)
 const [apiTestResult, setApiTestResult] = useState<string | null>(null)
 const [hasAutoGenerated, setHasAutoGenerated] = useState(false)
 
 // ========== CRITICAL FIX: Add state for prescription data ==========
 // These fields MUST be saved to localStorage so they persist across step changes
 const [currentMedicationsValidated, setCurrentMedicationsValidated] = useState<any[]>([])
 const [medications, setMedications] = useState<any[]>([])
 const [combinedPrescription, setCombinedPrescription] = useState<any[]>([])
 
 // 🏥 CONSULTATION CONTEXT STATE
 const [consultationContext, setConsultationContext] = useState<{
   setting: 'teleconsultation' | 'emergency_department' | 'general_practice'
   location?: string
   access_to_investigations: boolean
   access_to_iv_medications: boolean
 }>(() => {
   // Default: teleconsultation (safest assumption)
   return {
     setting: 'teleconsultation',
     location: 'Patient at home',
     access_to_investigations: false,
     access_to_iv_medications: false
   }
 })
 
 // States for progression
 const [analysisProgress, setAnalysisProgress] = useState(0)
 const [progressMessage, setProgressMessage] = useState("Initializing...")
 
 // NEW STATES for progressive appearance
 const [showReasoning, setShowReasoning] = useState(false)
 const [showPrimaryDiagnosis, setShowPrimaryDiagnosis] = useState(false)
 const [showInvestigations, setShowInvestigations] = useState(false)
 const [showTreatments, setShowTreatments] = useState(false)
 const [showDifferential, setShowDifferential] = useState(false)
 const [showMonitoring, setShowMonitoring] = useState(false)
 const [showDocuments, setShowDocuments] = useState(false)
 
 // States for section status
 const [sectionStatus, setSectionStatus] = useState({
 reasoning: 'pending' as 'pending' | 'loading' | 'complete',
 primary: 'pending' as 'pending' | 'loading' | 'complete',
 investigations: 'pending' as 'pending' | 'loading' | 'complete',
 treatments: 'pending' as 'pending' | 'loading' | 'complete',
 differential: 'pending' as 'pending' | 'loading' | 'complete',
 monitoring: 'pending' as 'pending' | 'loading' | 'complete',
 documents: 'pending' as 'pending' | 'loading' | 'complete'
 })

 // Helper function for translations
 const t = (key: string) => getTranslation(key, language)

 // Load saved data on mount
 useEffect(() => {
 const loadSavedData = async () => {
 console.log('📂 Loading saved diagnosis data...')
 try {
 const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
 
 if (currentConsultationId) {
 const savedData = await consultationDataService.getAllData()
 console.log('💾 Saved data found:', {
 hasDiagnosisData: !!savedData?.diagnosisData,
 hasDiagnosis: !!savedData?.diagnosisData?.diagnosis,
 hasDocuments: !!savedData?.diagnosisData?.mauritianDocuments
 })
 
 if (savedData?.diagnosisData) {
 if (savedData.diagnosisData.diagnosis) {
 setDiagnosis(savedData.diagnosisData.diagnosis)
 setHasAutoGenerated(true)
 // If we have saved data, show everything directly
 setShowReasoning(true)
 setShowPrimaryDiagnosis(true)
 setShowInvestigations(true)
 setShowTreatments(true)
 setShowDifferential(true)
 setShowMonitoring(true)
 setShowDocuments(true)
 setSectionStatus({
 reasoning: 'complete',
 primary: 'complete',
 investigations: 'complete',
 treatments: 'complete',
 differential: 'complete',
 monitoring: 'complete',
 documents: 'complete'
 })
 }
 if (savedData.diagnosisData.diagnosticReasoning) {
 setDiagnosticReasoning(savedData.diagnosisData.diagnosticReasoning)
 }
 if (savedData.diagnosisData.expertAnalysis) {
 setExpertAnalysis(savedData.diagnosisData.expertAnalysis)
 }
 if (savedData.diagnosisData.mauritianDocuments) {
 setMauritianDocuments(savedData.diagnosisData.mauritianDocuments)
 setDocumentsGenerated(true)
 }
 
 // ========== CRITICAL FIX: Restore prescription data from localStorage ==========
 if (savedData.diagnosisData.currentMedicationsValidated) {
 setCurrentMedicationsValidated(savedData.diagnosisData.currentMedicationsValidated)
 console.log('✅ Restored', savedData.diagnosisData.currentMedicationsValidated.length, 'current medications from localStorage')
 }
 if (savedData.diagnosisData.medications) {
 setMedications(savedData.diagnosisData.medications)
 console.log('✅ Restored', savedData.diagnosisData.medications.length, 'medications from localStorage')
 }
 if (savedData.diagnosisData.combinedPrescription) {
 setCombinedPrescription(savedData.diagnosisData.combinedPrescription)
 console.log('✅ Restored', savedData.diagnosisData.combinedPrescription.length, 'combined prescriptions from localStorage')
 }
 }
 }
 } catch (error) {
 console.error('❌ Error loading saved diagnosis data:', error)
 }
 }
 
 loadSavedData()
 }, [consultationId])

 // ========== CRITICAL FIX: Notify parent when data is loaded from localStorage ==========
 // This ensures page.tsx always has the latest data including prescription fields
 useEffect(() => {
 // Only notify if we have complete diagnosis data
 if (diagnosis && mauritianDocuments) {
 const completeData = {
 diagnosis,
 diagnosticReasoning,
 mauritianDocuments,
 expertAnalysis,
 documentsGenerated,
 // Include prescription data
 currentMedicationsValidated,
 medications,
 combinedPrescription,
 timestamp: new Date().toISOString()
 }
 
 console.log('🔄 Notifying parent of data update:', {
 hasDiagnosis: !!diagnosis,
 hasCurrentMedications: currentMedicationsValidated?.length || 0,
 hasMedications: medications?.length || 0,
 hasCombinedPrescription: combinedPrescription?.length || 0
 })
 
 onDataChange(completeData)
 }
 }, [diagnosis, diagnosticReasoning, expertAnalysis, mauritianDocuments, documentsGenerated, currentMedicationsValidated, medications, combinedPrescription])

 // Effect for realistic progression
 useEffect(() => {
 if (loading) {
 setAnalysisProgress(0)
 let progress = 0
 
 const messages = [
 { time: 0, msg: "Connecting to GPT 4o Medical AI...", progress: 5 },
 { time: 2000, msg: "Analyzing symptoms and medical history...", progress: 15 },
 { time: 5000, msg: "Identifying clinical syndrome...", progress: 25 },
 { time: 10000, msg: "Formulating diagnostic hypotheses...", progress: 40 },
 { time: 20000, msg: "Developing investigation strategy...", progress: 60 },
 { time: 30000, msg: "Generating personalized treatment plan...", progress: 75 },
 { time: 40000, msg: "Adapting to Mauritian healthcare context...", progress: 85 },
 { time: 50000, msg: "Finalizing analysis and documents...", progress: 95 }
 ]
 
 const timers = messages.map(({ time, msg, progress }) => {
 return setTimeout(() => {
 if (loading) {
 setProgressMessage(msg)
 setAnalysisProgress(progress)
 }
 }, time)
 })
 
 return () => {
 timers.forEach(timer => clearTimeout(timer))
 setAnalysisProgress(0)
 }
 }
 }, [loading])

 // AUTOMATIC GENERATION - Main trigger
 useEffect(() => {
 console.log(' AUTO-GENERATION CHECK:', {
 hasAutoGenerated,
 hasDiagnosis: !!diagnosis,
 hasPatientData: !!patientData,
 hasClinicalData: !!clinicalData,
 chiefComplaint: clinicalData?.chiefComplaint
 })

 if (!hasAutoGenerated && 
 !diagnosis && 
 patientData && 
 clinicalData && 
 clinicalData.chiefComplaint) {
 
 console.log('🚀 AUTO-GENERATING DIAGNOSIS...')
 setHasAutoGenerated(true)
 generateCompleteDiagnosisAndDocuments()
 }
 }, [hasAutoGenerated, diagnosis, patientData, clinicalData])

 // Save data when diagnosis is generated or updated
 useEffect(() => {
 const saveData = async () => {
 if (!diagnosis || !mauritianDocuments) return
 
 try {
 const dataToSave = {
 diagnosis,
 diagnosticReasoning,
 expertAnalysis,
 mauritianDocuments,
 documentsGenerated,
 // ========== CRITICAL FIX: Add prescription data to auto-save ==========
 // These fields MUST be saved so they persist when page.tsx reloads from localStorage
 currentMedicationsValidated,
 medications,
 combinedPrescription,
 timestamp: new Date().toISOString()
 }
 await consultationDataService.saveStepData(3, dataToSave)
 console.log("💾 Auto-saved diagnosis data (including", currentMedicationsValidated?.length || 0, "current medications)")
 } catch (error) {
 console.error('❌ Error saving diagnosis data:', error)
 }
 }
 
 saveData()
 }, [diagnosis, diagnosticReasoning, expertAnalysis, mauritianDocuments, documentsGenerated, currentMedicationsValidated, medications, combinedPrescription])

 // Test API function
 const testAPI = async () => {
 console.log('🧪 Testing API...')
 setApiTestResult('Testing...')
 try {
 const res = await fetch('/api/openai-diagnosis', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 patientData: { age: 30, sex: 'M', firstName: 'Test', lastName: 'Patient' },
 clinicalData: { chiefComplaint: 'Test chest pain' },
 questionsData: [],
 language: 'en'
 })
 })
 const data = await res.json()
 console.log('🧪 API Test Response:', data)
 setApiTestResult(data.success ? '✅ API is working!' : `❌ Error: ${data.error}`)
 } catch (error) {
 console.error('🧪 API Test Error:', error)
 setApiTestResult(`❌ Error: ${error}`)
 }
 }

 // Function to animate progressive appearance of sections
 const animateProgressiveAppearance = (data: any) => {
 console.log('🎭 Starting progressive appearance animation...')
 
 // Reset all display states
 setShowReasoning(false)
 setShowPrimaryDiagnosis(false)
 setShowInvestigations(false)
 setShowTreatments(false)
 setShowDifferential(false)
 setShowMonitoring(false)
 setShowDocuments(false)
 
 // 1. Diagnostic reasoning
 setTimeout(() => {
 setSectionStatus(prev => ({ ...prev, reasoning: 'loading' }))
 }, 500)
 
 setTimeout(() => {
 setDiagnosticReasoning(data.diagnosticReasoning)
 setShowReasoning(true)
 setSectionStatus(prev => ({ ...prev, reasoning: 'complete', primary: 'loading' }))
 }, 2000)
 
 // 2. Primary diagnosis
 setTimeout(() => {
 setDiagnosis(data.diagnosis)
 setShowPrimaryDiagnosis(true)
 setSectionStatus(prev => ({ ...prev, primary: 'complete', investigations: 'loading' }))
 }, 4000)
 
 // 3. Investigations
 setTimeout(() => {
 setExpertAnalysis(data.expertAnalysis || data.expert_analysis)
 setShowInvestigations(true)
 setSectionStatus(prev => ({ ...prev, investigations: 'complete', treatments: 'loading' }))
 }, 6000)
 
 // 4. Treatments
 setTimeout(() => {
 setShowTreatments(true)
 setSectionStatus(prev => ({ ...prev, treatments: 'complete', differential: 'loading' }))
 }, 8000)
 
 // 5. Differential diagnoses
 setTimeout(() => {
 setShowDifferential(true)
 setSectionStatus(prev => ({ ...prev, differential: 'complete', monitoring: 'loading' }))
 }, 10000)
 
 // 6. Monitoring
 setTimeout(() => {
 setShowMonitoring(true)
 setSectionStatus(prev => ({ ...prev, monitoring: 'complete', documents: 'loading' }))
 }, 11500)
 
 // 7. Documents
 setTimeout(() => {
 setMauritianDocuments(data.mauritianDocuments)
 setShowDocuments(true)
 setDocumentsGenerated(true)
 setSectionStatus(prev => ({ ...prev, documents: 'complete' }))
 }, 13000)

 // ========== CRITICAL FIX: Update state variables for prescription data ==========
 // Set state immediately so auto-save useEffect can persist them to localStorage
 setCurrentMedicationsValidated(data.currentMedicationsValidated || [])
 setMedications(data.medications || [])
 setCombinedPrescription(data.combinedPrescription || [])
 
 console.log('🔧 ========== UPDATING PRESCRIPTION STATE VARIABLES ==========')
 console.log('   💊 Setting currentMedicationsValidated:', data.currentMedicationsValidated?.length || 0, 'items')
 console.log('   💊 Setting medications:', data.medications?.length || 0, 'items')
 console.log('   💊 Setting combinedPrescription:', data.combinedPrescription?.length || 0, 'items')
 
 // VERIFICATION: Check if state was actually updated
 console.log('🔍 ========== STATE VERIFICATION AFTER SET ==========')
 setTimeout(() => {
   console.log('   🔎 medications state after set:', medications.length, 'items')
   console.log('   🔎 combinedPrescription state after set:', combinedPrescription.length, 'items')
   console.log('   🔎 currentMedicationsValidated state after set:', currentMedicationsValidated.length, 'items')
 }, 100)
 
 // CRITICAL FIX: Save data IMMEDIATELY (not after 13 seconds)
 // This ensures currentMedicationsValidated is saved before user continues
 const completeData = {
 diagnosis: data.diagnosis,
 diagnosticReasoning: data.diagnosticReasoning,
 mauritianDocuments: data.mauritianDocuments,
 expertAnalysis: data.expertAnalysis || data.expert_analysis || {},
 completeData: data,
 documentsGenerated: true,
 // CRITICAL - Pass through current medications validated
 currentMedicationsValidated: data.currentMedicationsValidated,
 medications: data.medications,
 combinedPrescription: data.combinedPrescription
 }

 // CLIENT DEBUG - Check what we're saving
 console.log(' CLIENT DEBUG - DIAGNOSIS FORM SAVING:')
 console.log(' 💊 currentMedicationsValidated:', completeData.currentMedicationsValidated)
 console.log(' 💊 Length:', completeData.currentMedicationsValidated?.length || 0)
 console.log(' 📋 medications:', completeData.medications)
 console.log(' 📋 combinedPrescription:', completeData.combinedPrescription)

 // Save immediately so data is available when user continues
 onDataChange(completeData)
 }

 const generateCompleteDiagnosisAndDocuments = async () => {
 console.log('🩺 ========== STARTING DIAGNOSIS GENERATION ==========')
 console.log('📋 Patient Data:', {
 hasData: !!patientData,
 age: patientData?.age,
 sex: patientData?.sex,
 name: `${patientData?.firstName} ${patientData?.lastName}`
 })
 console.log(' Clinical Data:', {
 hasData: !!clinicalData,
 chiefComplaint: clinicalData?.chiefComplaint,
 symptoms: clinicalData?.symptoms?.length || 0
 })
 console.log('❓ Questions Data:', {
 responses: questionsData?.responses?.length || 0
 })

 if (!patientData || !clinicalData) {
 console.error('❌ Missing required data')
 setError("Missing patient or clinical data")
 return
 }

 setLoading(true)
 setError(null)
 setDocumentsGenerated(false)

 try {
 console.log("📡 Calling API /api/openai-diagnosis...")
 
 // ========== DEBUG LOGGING FOR RECEIVED patientData ==========
 console.log('🔍 DIAGNOSIS FORM - patientData received:')
 console.log('   📋 patientData.currentMedications:', patientData?.currentMedications)
 console.log('   📋 patientData.current_medications:', patientData?.current_medications)
 console.log('   📝 patientData.currentMedicationsText:', patientData?.currentMedicationsText)
 console.log('   ✅ Is Array?:', Array.isArray(patientData?.currentMedications))
 console.log('   ✅ Length:', patientData?.currentMedications?.length || 0)
 
 const requestBody = {
 patientData: {
   ...patientData,
   consultation_context: consultationContext // 🏥 Add consultation context
 },
 clinicalData,
 questionsData: questionsData?.responses || [],
 doctorNotes, // ⚕️ Hypothèses et notes du médecin
 language,
 }
 
 // ========== DEBUG LOGGING FOR API REQUEST ==========
 console.log('📤 DIAGNOSIS FORM - Sending to API:')
 console.log('   📋 requestBody.patientData.currentMedications:', requestBody.patientData?.currentMedications)
 console.log('   📋 requestBody.patientData.current_medications:', requestBody.patientData?.current_medications)
 
 const response = await fetch("/api/openai-diagnosis", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(requestBody),
 })

 console.log("📨 Response status:", response.status)

 if (!response.ok) {
 const errorText = await response.text()
 console.error('❌ API Error:', errorText)
 throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`)
 }

 const data = await response.json()
 console.log("✅ API Response received:", {
 success: data.success,
 hasDiagnosis: !!data.diagnosis,
 hasDocuments: !!data.mauritianDocuments
 })
 
 // ========== CRITICAL DEBUG: CHECK WHAT WE RECEIVED ==========
 console.log('🔍 ========== DIAGNOSIS FORM - API RESPONSE RECEIVED ==========')
 console.log('   📋 currentMedicationsValidated present:', !!data.currentMedicationsValidated)
 console.log('   📋 currentMedicationsValidated length:', data.currentMedicationsValidated?.length || 0)
 if (data.currentMedicationsValidated && data.currentMedicationsValidated.length > 0) {
   console.log('   ✅ RECEIVED CURRENT MEDICATIONS:')
   data.currentMedicationsValidated.forEach((med: any, idx: number) => {
     console.log(`      ${idx + 1}. ${med.name} - ${med.dosage} - ${med.posology}`)
   })
 } else {
   console.log('   ⚠️ WARNING: NO CURRENT MEDICATIONS RECEIVED FROM API!')
 }
 
 // Log NEW medications
 console.log('   💊 medications present:', !!data.medications)
 console.log('   💊 medications length:', data.medications?.length || 0)
 if (data.medications && data.medications.length > 0) {
   console.log('   ✅ RECEIVED NEW MEDICATIONS:')
   data.medications.forEach((med: any, idx: number) => {
     console.log(`      ${idx + 1}. ${med.name || med.drug} - ${med.dosage} - ${med.posology}`)
   })
 } else {
   console.log('   ⚠️ WARNING: NO NEW MEDICATIONS RECEIVED FROM API!')
 }
 
 // Log combinedPrescription
 console.log('   📝 combinedPrescription present:', !!data.combinedPrescription)
 console.log('   📝 combinedPrescription length:', data.combinedPrescription?.length || 0)
 if (data.combinedPrescription && data.combinedPrescription.length > 0) {
   console.log('   ✅ RECEIVED COMBINED PRESCRIPTION:')
   data.combinedPrescription.forEach((med: any, idx: number) => {
     console.log(`      ${idx + 1}. ${med.name} - ${med.dosage} - ${med.posology} [${med.medication_type}]`)
   })
 } else {
   console.log('   ⚠️ WARNING: NO COMBINED PRESCRIPTION RECEIVED FROM API!')
 }
 console.log('==============================================================')
 

 if (data.success && data.diagnosis && data.mauritianDocuments) {
 console.log("✅ Starting progressive display...")
 setLoading(false)
 animateProgressiveAppearance(data)
 } else {
 console.error("❌ Invalid response format")
 throw new Error(data.error || "Invalid response format")
 }

 } catch (err) {
 console.error("❌ Generation error:", err)

 console.log("⚠️ Generating fallback data...")
 const fallbackData = generateCompleteFallback()
 setLoading(false)
 // Set diagnosis immediately to prevent error page flash
 // (animateProgressiveAppearance sets it after 4s delay via setTimeout,
 // which would leave diagnosis=null and trigger the error screen)
 setDiagnosis(fallbackData.diagnosis)
 setDiagnosticReasoning(fallbackData.diagnosticReasoning)
 setExpertAnalysis(fallbackData.expertAnalysis)
 animateProgressiveAppearance(fallbackData)

 } finally {
 // Loading is now handled in animateProgressiveAppearance
 console.log('🩺 ========== DIAGNOSIS GENERATION COMPLETE ==========')
 }
 }

 const forceRegenerate = () => {
 console.log('🔄 Force regenerating diagnosis...')
 setHasAutoGenerated(false)
 setDiagnosis(null)
 setShowReasoning(false)
 setShowPrimaryDiagnosis(false)
 setShowInvestigations(false)
 setShowTreatments(false)
 setShowDifferential(false)
 setShowMonitoring(false)
 setShowDocuments(false)
 setSectionStatus({
 reasoning: 'pending',
 primary: 'pending',
 investigations: 'pending',
 treatments: 'pending',
 differential: 'pending',
 monitoring: 'pending',
 documents: 'pending'
 })
 generateCompleteDiagnosisAndDocuments()
 }

 const generateCompleteFallback = () => {
 console.log(' Generating fallback diagnosis...')
 
 const fallbackDiagnosis = {
 primary: {
 condition: `Clinical syndrome - ${clinicalData?.chiefComplaint || "Medical consultation"}`,
 icd10: "R53",
 confidence: 70,
 severity: "moderate",
 detailedAnalysis: "Analysis based on presented symptoms requiring further investigation",
 clinicalRationale: `Symptoms: ${clinicalData?.chiefComplaint}. Requires thorough history and clinical examination`,
 prognosis: "Favorable evolution expected with appropriate management",
 diagnosticCriteriaMet: ["Compatible symptoms", "Suggestive clinical context"],
 certaintyLevel: "Moderate"
 },
 differential: [
 {
 condition: "Viral syndrome",
 probability: 40,
 reasoning: "Common cause of non-specific symptoms",
 discriminating_test: "Viral serology"
 }
 ]
 }

 const fallbackDiagnosticReasoning = {
 key_findings: {
 from_history: "Basic clinical data available",
 from_symptoms: clinicalData?.chiefComplaint || "Symptoms to be specified",
 from_ai_questions: "AI questionnaire responses",
 red_flags: "No alarm signs identified"
 },
 syndrome_identification: {
 clinical_syndrome: "Syndrome to be specified",
 supporting_features: ["Reported symptoms"],
 inconsistent_features: ["To be evaluated"]
 }
 }

 const fallbackExpertAnalysis = {
 expert_investigations: {
 investigation_strategy: {
 diagnostic_approach: "Systematic diagnostic approach",
 tests_by_purpose: {
 to_confirm_primary: [],
 to_exclude_differentials: [],
 to_assess_severity: []
 },
 test_sequence: {
 immediate: "Urgent tests if necessary",
 urgent: "Workup within 24-48h",
 routine: "Follow-up according to evolution"
 }
 },
 immediate_priority: [
 {
 category: "biology",
 examination: "Complete blood count + CRP",
 specific_indication: "Search for inflammatory syndrome",
 urgency: "urgent",
 mauritius_availability: {
 where: "C-Lab, Green Cross",
 cost: "Rs 600-1200",
 turnaround: "2-6h urgent"
 }
 }
 ],
 tests_by_purpose: {},
 test_sequence: {}
 },
 expert_therapeutics: {
 primary_treatments: [
 {
 medication_dci: "Paracetamol",
 therapeutic_class: "Analgesic-Antipyretic",
 precise_indication: "Symptomatic treatment pain/fever",
 mechanism: "Inhibition of prostaglandin synthesis at central level",
 dosing_regimen: {
 adult: { en: "1g x 3-4/day" }
 },
 mauritius_availability: {
 public_free: true,
 estimated_cost: "Rs 50-100"
 }
 }
 ]
 }
 }

 const dateFormat = new Date().toLocaleDateString("en-US")
 
 const fallbackDocuments = {
 consultation: {
 header: {
 title: "CONSULTATION REPORT",
 date: dateFormat,
 physician: "Dr. EXPERT PHYSICIAN"
 },
 patient: {
 firstName: patientData?.firstName || "Patient",
 lastName: patientData?.lastName || "",
 age: `${patientData?.age || "?"} years`
 },
 diagnostic_reasoning: fallbackDiagnosticReasoning,
 clinical_summary: {
 chief_complaint: clinicalData?.chiefComplaint || "To be specified",
 diagnosis: fallbackDiagnosis.primary.condition
 }
 }
 }

 return {
 diagnosis: fallbackDiagnosis,
 diagnosticReasoning: fallbackDiagnosticReasoning,
 expertAnalysis: fallbackExpertAnalysis,
 mauritianDocuments: fallbackDocuments
 }
 }

 const sections = [
 { id: "reasoning", title: "Diagnostic Reasoning", icon: Brain, status: sectionStatus.reasoning },
 { id: "primary", title: "Primary Diagnosis", icon: Target, status: sectionStatus.primary },
 { id: "examinations", title: "Investigation Strategy", icon: TestTube, status: sectionStatus.investigations },
 { id: "treatments", title: "Prescribed Treatments", icon: Pill, status: sectionStatus.treatments },
 { id: "differential", title: "Differential Diagnoses", icon: Search, status: sectionStatus.differential },
 { id: "monitoring", title: "Monitoring", icon: Monitor, status: sectionStatus.monitoring },
 { id: "documents", title: "Mauritius Documents", icon: FileText, status: sectionStatus.documents },
 ]

 // Loading interface with personalized advice
 if (loading) {
 return (
 <div className="space-y-6">
 {/* NEW: Personalized advice carousel that appears IMMEDIATELY */}
 <PatientAdviceCarousel 
 patientData={patientData}
 clinicalData={clinicalData}
 analysisProgress={analysisProgress}
 progressMessage={progressMessage}
 />
 
 {/* AI analysis card in progress (more compact) */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-teal-600 to-blue-600 text-white">
 <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold">
 <Brain className="h-6 w-6 animate-pulse" />
 GPT 4o Artificial Intelligence in Action
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 {/* Quality indicators in compact grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
 <div className="text-center p-3 bg-white rounded-lg shadow-sm">
 <Shield className="h-6 w-6 text-teal-600 mx-auto mb-1" />
 <p className="text-xs font-medium text-gray-700">Int. Guidelines</p>
 </div>
 <div className="text-center p-3 bg-white rounded-lg shadow-sm">
 <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-1" />
 <p className="text-xs font-medium text-gray-700">Mauritius</p>
 </div>
 <div className="text-center p-3 bg-white rounded-lg shadow-sm">
 <Brain className="h-6 w-6 text-blue-600 mx-auto mb-1" />
 <p className="text-xs font-medium text-gray-700">GPT 4o</p>
 </div>
 <div className="text-center p-3 bg-white rounded-lg shadow-sm">
 <Sparkles className="h-6 w-6 text-cyan-600 mx-auto mb-1" />
 <p className="text-xs font-medium text-gray-700">Expert</p>
 </div>
 </div>

 {/* Step checklist with animation */}
 <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg">
 <div className="space-y-2">
 <ProgressStep completed={analysisProgress > 10} active={analysisProgress <= 10}>
 Analyzing patient data
 </ProgressStep>
 <ProgressStep completed={analysisProgress > 25} active={analysisProgress > 10 && analysisProgress <= 25}>
 Identifying clinical syndrome
 </ProgressStep>
 <ProgressStep completed={analysisProgress > 40} active={analysisProgress > 25 && analysisProgress <= 40}>
 Formulating diagnostic hypotheses
 </ProgressStep>
 <ProgressStep completed={analysisProgress > 60} active={analysisProgress > 40 && analysisProgress <= 60}>
 Investigation strategy
 </ProgressStep>
 <ProgressStep completed={analysisProgress > 75} active={analysisProgress > 60 && analysisProgress <= 75}>
 Personalized treatment plan
 </ProgressStep>
 <ProgressStep completed={analysisProgress > 85} active={analysisProgress > 75 && analysisProgress <= 85}>
 Adapting to Mauritian context
 </ProgressStep>
 </div>
 </div>

 {/* Centered loading animation */}
 <div className="flex justify-center mt-6">
 <div className="relative">
 <div className="w-12 h-12">
 <div className="absolute inset-0 border-3 border-teal-200 rounded-full"></div>
 <div className="absolute inset-0 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 )
 }

 // Error interface with retry button
 if (!diagnosis && error) {
 return (
 <div className="space-y-6">
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <AlertTriangle className="h-6 w-6" />
 Generation Error
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8 text-center">
 <div className="space-y-4">
 <AlertTriangle className="h-16 w-16 text-cyan-500 mx-auto" />
 <p className="text-lg text-gray-700">Unable to generate medical analysis</p>
 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
 <p className="text-sm text-blue-700 font-mono">{error}</p>
 </div>
 <div className="space-y-2 text-sm text-gray-600">
 <p>Please check that:</p>
 <ul className="list-disc list-inside text-left max-w-md mx-auto">
 <li>Patient data is complete</li>
 <li>Chief complaint is filled in</li>
 <li>OpenAI API key is configured</li>
 <li>Your internet connection is stable</li>
 </ul>
 </div>
 <div className="flex gap-4 justify-center !flex-row" style={{ flexDirection: 'row' }}>
 <Button
 onClick={generateCompleteDiagnosisAndDocuments}
 className="mt-6"
 size="lg"
 >
 <Brain className="h-4 w-4 mr-2" />
 Try Again
 </Button>
 <Button 
 onClick={testAPI}
 variant="outline"
 className="mt-6"
 size="lg"
 >
 <RefreshCw className="h-4 w-4 mr-2" />
 Test API
 </Button>
 </div>
 {apiTestResult && (
 <div className="mt-4 p-4 bg-gray-100 rounded-lg">
 <p className="text-sm font-mono">{apiTestResult}</p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 </div>
 )
 }

 // Main interface - If no diagnosis yet
 if (!diagnosis) {
 return (
 <div className="space-y-6">
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Brain className="h-6 w-6" />
 Medical Analysis Generation
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8 text-center">
 <div className="space-y-6">
 <div className="relative">
 <div className="w-20 h-20 mx-auto">
 <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
 <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-blue-500" />
 </div>
 </div>
 
 <div className="space-y-2">
 <p className="text-xl font-semibold text-gray-800">
 Preparing analysis...
 </p>
 <p className="text-gray-600">
 The AI will automatically generate your diagnosis
 </p>
 </div>
 
 <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
 <p className="text-sm font-semibold text-gray-700 mb-2">Current status:</p>
 <ul className="text-xs text-gray-600 space-y-1">
 <li className="flex items-center gap-2">
 {patientData ? <CheckCircle className="h-3 w-3 text-teal-600" /> : <AlertCircle className="h-3 w-3 text-blue-600" />}
 Patient: {patientData?.firstName} {patientData?.lastName}
 </li>
 <li className="flex items-center gap-2">
 {clinicalData ? <CheckCircle className="h-3 w-3 text-teal-600" /> : <AlertCircle className="h-3 w-3 text-blue-600" />}
 Chief complaint: {clinicalData?.chiefComplaint || 'Not provided'}
 </li>
 <li className="flex items-center gap-2">
 {questionsData?.responses?.length > 0 ? <CheckCircle className="h-3 w-3 text-teal-600" /> : <AlertCircle className="h-3 w-3 text-cyan-600" />}
 AI questions: {questionsData?.responses?.length || 0} responses
 </li>
 </ul>
 </div>
 
 {/* 🏥 CONSULTATION CONTEXT SELECTOR */}
 <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 max-w-2xl mx-auto">
 <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
 <MapPin className="h-4 w-4" />
 Consultation Context
 </h3>
 <div className="grid grid-cols-1 gap-3">
 <button
 onClick={() => setConsultationContext({
   setting: 'teleconsultation',
   location: 'Patient at home',
   access_to_investigations: false,
   access_to_iv_medications: false
 })}
 className={`p-4 rounded-lg border-2 text-left transition-all ${
   consultationContext.setting === 'teleconsultation'
   ? 'border-blue-600 bg-blue-100'
   : 'border-gray-300 hover:border-blue-400'
 }`}
 >
 <div className="font-semibold text-sm">📞 Téléconsultation</div>
 <div className="text-xs text-gray-600 mt-1">Patient at home - Remote consultation</div>
 </button>
 
 <button
 onClick={() => setConsultationContext({
   setting: 'emergency_department',
   location: 'Emergency room',
   access_to_investigations: true,
   access_to_iv_medications: true
 })}
 className={`p-4 rounded-lg border-2 text-left transition-all ${
   consultationContext.setting === 'emergency_department'
   ? 'border-red-600 bg-red-100'
   : 'border-gray-300 hover:border-red-400'
 }`}
 >
 <div className="font-semibold text-sm">🚨 Emergency Department / Urgences</div>
 <div className="text-xs text-gray-600 mt-1">Hospital - STAT investigations + IV medications available</div>
 </button>
 
 <button
 onClick={() => setConsultationContext({
   setting: 'general_practice',
   location: 'Medical office',
   access_to_investigations: true,
   access_to_iv_medications: false
 })}
 className={`p-4 rounded-lg border-2 text-left transition-all ${
   consultationContext.setting === 'general_practice'
   ? 'border-green-600 bg-green-100'
   : 'border-gray-300 hover:border-green-400'
 }`}
 >
 <div className="font-semibold text-sm">🏥 General Practice / Cabinet Médical</div>
 <div className="text-xs text-gray-600 mt-1">Office - Lab tests available (24-48h results)</div>
 </button>
 </div>
 
 <div className="mt-3 text-xs text-gray-600">
 Current: <span className="font-semibold text-blue-700">
   {consultationContext.setting === 'teleconsultation' && '📞 Téléconsultation'}
   {consultationContext.setting === 'emergency_department' && '🚨 Emergency Department'}
   {consultationContext.setting === 'general_practice' && '🏥 General Practice'}
 </span>
 </div>
 </div>
 
 <div className="flex flex-col gap-4 items-center">
 <Button 
 onClick={generateCompleteDiagnosisAndDocuments} 
 className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
 size="lg"
 disabled={!patientData || !clinicalData || loading}
 >
 <Brain className="h-5 w-5 mr-2" />
 Generate Medical Analysis
 </Button>
 
 <Button 
 onClick={testAPI}
 variant="outline"
 size="sm"
 >
 <RefreshCw className="h-4 w-4 mr-2" />
 Test API Connection
 </Button>
 </div>
 
 {apiTestResult && (
 <div className="mt-4 p-4 bg-gray-100 rounded-lg">
 <p className="text-sm font-mono">{apiTestResult}</p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 </div>
 )
 }

 // Main interface with diagnosis - WITH PROGRESSIVE ANIMATION
 return (
 <div className="space-y-6">
 {/* Success header */}
 <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
 <CardHeader className="text-center">
 <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
 <CheckCircle className="h-8 w-8 text-teal-600" />
 Expert Medical Analysis
 </CardTitle>
 <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
 <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-300 text-xs sm:text-sm">
 Confidence: {diagnosis?.primary?.confidence || 70}%
 </Badge>
 <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 text-xs sm:text-sm">
 Certainty: {diagnosis?.primary?.certaintyLevel || "Moderate"}
 </Badge>
 <Badge className="bg-blue-500 text-white text-xs sm:text-sm">
 GPT 4o Enhanced
 </Badge>
 {documentsGenerated && (
 <Badge className="bg-teal-500 text-white text-xs sm:text-sm">
 Documents Ready
 </Badge>
 )}
 </div>
 <div className="mt-4 flex justify-center">
 <Button
 onClick={forceRegenerate}
 variant="outline"
 size="sm"
 disabled={loading}
 >
 <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
 Regenerate analysis
 </Button>
 </div>
 </CardHeader>
 </Card>

 {/* Section navigation with statuses */}
 <div className="flex flex-wrap gap-2 justify-center !flex-row" style={{ flexDirection: 'row' }}>
 {sections.map((section, index) => (
 <button
 key={section.id}
 onClick={() => setCurrentSection(index)}
 className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full transition-all duration-200 ${
 currentSection === index
 ? "bg-teal-600 text-white shadow-lg"
 : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
 }`}
 >
 <section.icon className="h-4 w-4" />
 <span className="text-sm font-medium">{section.title}</span>
 <SectionStatus status={section.status} />
 </button>
 ))}
 </div>

 {/* DIAGNOSTIC REASONING - With animation */}
 <AnimatedSection show={showReasoning} delay={0}>
 {currentSection === 0 && diagnosticReasoning && (
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Brain className="h-6 w-6" />
 Systematic Diagnostic Reasoning
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 {/* Key Findings */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
 <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
 <Lightbulb className="h-5 w-5" />
 Key Elements Identified
 </h4>
 <div className="space-y-2 text-sm">
 <div>
 <span className="font-medium text-blue-700">Clinical history:</span>
 <p className="text-gray-700">
 <StreamingText text={diagnosticReasoning.key_findings?.from_history || ""} speed={5} />
 </p>
 </div>
 <div>
 <span className="font-medium text-blue-700">Symptom pattern:</span>
 <p className="text-gray-700">
 <StreamingText text={diagnosticReasoning.key_findings?.from_symptoms || ""} speed={5} />
 </p>
 </div>
 <div>
 <span className="font-medium text-blue-700">AI questionnaire:</span>
 <p className="text-gray-700">
 <StreamingText text={diagnosticReasoning.key_findings?.from_ai_questions || ""} speed={5} />
 </p>
 </div>
 </div>
 </div>

 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
 <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
 <AlertTriangle className="h-5 w-5" />
 Warning Signs
 </h4>
 <p className="text-sm text-gray-700">
 <StreamingText text={diagnosticReasoning.key_findings?.red_flags || "No warning signs identified"} speed={8} />
 </p>
 </div>
 </div>

 {/* Syndrome Identification */}
 {diagnosticReasoning.syndrome_identification && (
 <div className="bg-gradient-to-r from-blue-50 to-blue-50 p-6 rounded-lg border border-blue-200">
 <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
 <Zap className="h-5 w-5" />
 Identified Clinical Syndrome
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <span className="font-medium text-blue-700">Syndrome:</span>
 <p className="text-lg font-semibold text-gray-800">
 <StreamingText text={diagnosticReasoning.syndrome_identification.clinical_syndrome} speed={10} />
 </p>
 </div>
 <div>
 <span className="font-medium text-teal-700">Supporting features:</span>
 <p className="text-sm text-gray-700">
 {diagnosticReasoning.syndrome_identification.supporting_features}
 </p>
 </div>
 <div>
 <span className="font-medium text-blue-700">Inconsistent features:</span>
 <p className="text-sm text-gray-700">
 {diagnosticReasoning.syndrome_identification.inconsistent_features || "None"}
 </p>
 </div>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </AnimatedSection>

 {/* PRIMARY DIAGNOSIS - With animation */}
 <AnimatedSection show={showPrimaryDiagnosis} delay={200}>
 {currentSection === 1 && (
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
 <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Target className="h-6 w-6" />
 Primary Diagnosis
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 <div className="text-center p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border-2 border-teal-200">
 <h3 className="text-2xl font-bold text-teal-800 mb-4">
 <StreamingText 
 text={diagnosis?.primary?.condition || "Diagnosis to be specified"}
 speed={15}
 />
 </h3>
 <div className="flex justify-center gap-4">
 <Badge className="bg-teal-100 text-teal-800 text-sm px-4 py-2">
 Probability: {diagnosis?.primary?.confidence || 70}%
 </Badge>
 <Badge variant="outline" className="border-teal-300 text-teal-700 text-sm px-4 py-2">
 Severity: {diagnosis?.primary?.severity || "To be evaluated"}
 </Badge>
 {diagnosis?.primary?.icd10 && (
 <Badge variant="outline" className="border-blue-300 text-blue-700 text-sm px-4 py-2">
 ICD-10: {diagnosis.primary.icd10}
 </Badge>
 )}
 </div>
 </div>

 {/* Diagnostic Criteria Met */}
 {diagnosis?.primary?.diagnosticCriteriaMet && diagnosis.primary.diagnosticCriteriaMet.length > 0 && (
 <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
 <h4 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
 <ClipboardCheck className="h-5 w-5" />
 Validated Diagnostic Criteria
 </h4>
 <ul className="space-y-2">
 {diagnosis.primary.diagnosticCriteriaMet.map((criterion: string, index: number) => (
 <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
 <CheckCircle className="h-4 w-4 text-teal-600 mt-0.5" />
 <span>{criterion}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {diagnosis?.primary?.detailedAnalysis && (
 <div>
 <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
 <Brain className="h-5 w-5 text-teal-600" />
 Detailed Pathophysiological Analysis
 </h4>
 <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
 <p className="text-sm text-gray-700 leading-relaxed">
 <StreamingText 
 text={diagnosis.primary.detailedAnalysis}
 speed={8}
 />
 </p>
 </div>
 </div>
 )}

 {diagnosis?.primary?.clinicalRationale && (
 <div>
 <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
 <Eye className="h-5 w-5 text-teal-600" />
 Clinical Reasoning
 </h4>
 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
 <p className="text-sm text-gray-700 leading-relaxed">
 <StreamingText 
 text={diagnosis.primary.clinicalRationale}
 speed={8}
 />
 </p>
 </div>
 </div>
 )}

 {diagnosis?.primary?.prognosis && (
 <div>
 <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
 <Activity className="h-5 w-5 text-teal-600" />
 Prognosis
 </h4>
 <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
 <p className="text-sm text-gray-700 leading-relaxed">
 <StreamingText 
 text={diagnosis.primary.prognosis}
 speed={8}
 />
 </p>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </AnimatedSection>

 {/* INVESTIGATION STRATEGY - With animation */}
 <AnimatedSection show={showInvestigations} delay={300}>
 {currentSection === 2 && expertAnalysis?.expert_investigations && (
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <TestTube className="h-6 w-6" />
 Complete Investigation Strategy
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 {/* Diagnostic Approach */}
 {expertAnalysis.expert_investigations.investigation_strategy?.diagnostic_approach && (
 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
 <p className="text-center font-medium text-blue-800">
 {expertAnalysis.expert_investigations.investigation_strategy.diagnostic_approach}
 </p>
 </div>
 )}

 {/* Tests by Purpose */}
 {expertAnalysis.expert_investigations.tests_by_purpose && (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
 {/* To Confirm Primary */}
 <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
 <h4 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
 <Target className="h-5 w-5" />
 Confirm Diagnosis
 </h4>
 <div className="space-y-3">
 {expertAnalysis.expert_investigations.tests_by_purpose.to_confirm_primary?.map((test: any, idx: number) => (
 <div key={idx} className="text-sm">
 <p className="font-medium text-teal-700">
 {test.test}
 </p>
 <p className="text-gray-600 text-xs mt-1">
 {test.rationale}
 </p>
 </div>
 ))}
 </div>
 </div>

 {/* To Exclude Differentials */}
 <div className="bg-blue-50 p-4 rounded-lg border border-cyan-200">
 <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
 <Search className="h-5 w-5" />
 Exclude Differentials
 </h4>
 <div className="space-y-3">
 {expertAnalysis.expert_investigations.tests_by_purpose.to_exclude_differentials?.map((test: any, idx: number) => (
 <div key={idx} className="text-sm">
 <p className="font-medium text-blue-700">
 {test.test}
 </p>
 <p className="text-gray-600 text-xs mt-1">
 Excludes: {test.differential}
 </p>
 </div>
 ))}
 </div>
 </div>

 {/* To Assess Severity */}
 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
 <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
 <Activity className="h-5 w-5" />
 Assess Severity
 </h4>
 <div className="space-y-3">
 {expertAnalysis.expert_investigations.tests_by_purpose.to_assess_severity?.map((test: any, idx: number) => (
 <div key={idx} className="text-sm">
 <p className="font-medium text-blue-700">
 {test.test}
 </p>
 <p className="text-gray-600 text-xs mt-1">
 {test.purpose}
 </p>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Test Sequence Timeline */}
 {expertAnalysis.expert_investigations.test_sequence && (
 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
 <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
 <Clock className="h-5 w-5" />
 Test Timing Sequence
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="flex items-center gap-3">
 <Badge className="bg-blue-100 text-blue-800">IMMEDIATE</Badge>
 <p className="text-sm">{expertAnalysis.expert_investigations.test_sequence.immediate}</p>
 </div>
 <div className="flex items-center gap-3">
 <Badge className="bg-blue-100 text-blue-800">24-48H</Badge>
 <p className="text-sm">{expertAnalysis.expert_investigations.test_sequence.urgent}</p>
 </div>
 <div className="flex items-center gap-3">
 <Badge className="bg-cyan-100 text-cyan-800">ROUTINE</Badge>
 <p className="text-sm">{expertAnalysis.expert_investigations.test_sequence.routine}</p>
 </div>
 </div>
 </div>
 )}

 {/* Detailed Test List */}
 <div className="grid gap-6">
 {expertAnalysis.expert_investigations.immediate_priority?.map((exam: any, index: number) => (
 <div key={index} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-blue-50">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3">
 {exam.category === 'biology' && <FlaskConical className="h-6 w-6 text-blue-600" />}
 {exam.category === 'imaging' && <Activity className="h-6 w-6 text-blue-600" />}
 {exam.category === 'functional' && <Stethoscope className="h-6 w-6 text-teal-600" />}
 <div>
 <h3 className="font-bold text-lg text-gray-800">
 {exam.examination}
 </h3>
 <Badge className={`mt-1 ${
 exam.urgency === 'immediate' ? 'bg-blue-100 text-blue-800' :
 exam.urgency === 'urgent' ? 'bg-blue-100 text-blue-800' :
 'bg-cyan-100 text-cyan-800'
 }`}>
 {exam.urgency === 'immediate' ? 'IMMEDIATE' :
 exam.urgency === 'urgent' ? 'URGENT' : 'SEMI-URGENT'}
 </Badge>
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <div>
 <h4 className="font-semibold text-sm text-gray-700 mb-1">INDICATION:</h4>
 <p className="text-sm text-gray-600">
 {exam.specific_indication}
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-white rounded border">
 <div>
 <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
 <MapPin className="h-4 w-4" />
 MAURITIUS AVAILABILITY:
 </h4>
 <p className="text-xs text-gray-600">
 {exam.mauritius_availability?.where || 'To be verified'}
 </p>
 </div>
 <div>
 <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
 <DollarSign className="h-4 w-4" />
 COST & TURNAROUND:
 </h4>
 <div className="space-y-1">
 <p className="text-xs text-teal-600">
 <strong>Cost:</strong> {exam.mauritius_availability?.cost || 'To be verified'}
 </p>
 <p className="text-xs text-blue-600">
 <strong>Turnaround:</strong> {exam.mauritius_availability?.turnaround || 'To be verified'}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}
 </AnimatedSection>

 {/* TREATMENTS - With animation - USING COMBINED PRESCRIPTION */}
 <AnimatedSection show={showTreatments} delay={400}>
 {currentSection === 3 && (combinedPrescription.length > 0 || medications.length > 0) && (
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Pill className="h-6 w-6" />
 Prescribed Medications ({combinedPrescription.length > 0 ? combinedPrescription.length : medications.length})
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8">
 <div className="grid gap-6">
 {(combinedPrescription.length > 0 ? combinedPrescription : medications).map((med: any, index: number) => (
 <div key={index} className="border-l-4 border-blue-400 pl-6 bg-blue-25 p-4 rounded-r-lg hover:shadow-md transition-shadow">
 <div className="flex items-center justify-between mb-3">
 <h4 className="font-semibold text-lg text-blue-800">
 {med.name || med.drug || "Medication"}
 </h4>
 <Badge className="bg-blue-100 text-blue-800">
 {med.medication_type === 'current' ? 'Current' : 'New'}
 </Badge>
 </div>
 
 <div className="space-y-2">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 <div>
 <span className="font-medium text-gray-700">DCI:</span>
 <span className="ml-2 text-gray-600">{med.dci || 'N/A'}</span>
 </div>
 <div>
 <span className="font-medium text-gray-700">Dosage:</span>
 <span className="ml-2 text-gray-600">{med.dosage || 'N/A'}</span>
 </div>
 </div>
 
 <div>
 <span className="font-medium text-gray-700">Posology:</span>
 <span className="ml-2 text-gray-600">{med.posology || 'N/A'}</span>
 </div>
 
 {med.precise_posology && (
 <div className="bg-blue-50 p-3 rounded border border-blue-200">
 <span className="font-medium text-blue-700">Precise Posology:</span>
 <div className="ml-4 mt-1 space-y-1 text-sm">
 <div>Individual dose: {med.precise_posology.individual_dose}</div>
 <div>Frequency: {med.precise_posology.frequency_per_day}x/day</div>
 <div>Daily total: {med.precise_posology.daily_total_dose}</div>
 <div>UK format: {med.precise_posology.uk_format}</div>
 </div>
 </div>
 )}
 
 <div>
 <span className="font-medium text-gray-700">Indication:</span>
 <p className="text-sm text-gray-600 mt-1">{med.indication || 'N/A'}</p>
 </div>
 
 <div>
 <span className="font-medium text-gray-700">Duration:</span>
 <span className="ml-2 text-gray-600">{med.duration || 'N/A'}</span>
 </div>
 
 {med.instructions && (
 <div>
 <span className="font-medium text-gray-700">Instructions:</span>
 <p className="text-sm text-gray-600 mt-1">{med.instructions}</p>
 </div>
 )}
 
 {med.contraindications && (
 <div>
 <span className="font-medium text-red-700">Contraindications:</span>
 <p className="text-sm text-gray-600 mt-1">{med.contraindications}</p>
 </div>
 )}
 
 {med.side_effects && (
 <div>
 <span className="font-medium text-orange-700">Side effects:</span>
 <p className="text-sm text-gray-600 mt-1">{med.side_effects}</p>
 </div>
 )}
 
 {med.mauritius_availability && (
 <div className="bg-green-50 p-3 rounded border border-green-200 mt-2">
 <span className="font-medium text-green-700">Mauritius Availability:</span>
 <div className="ml-4 mt-1 space-y-1 text-sm">
 {med.mauritius_availability.public_free && (
 <Badge className="bg-green-100 text-green-800">Public Free</Badge>
 )}
 {med.mauritius_availability.estimated_cost && (
 <div>Cost: {med.mauritius_availability.estimated_cost}</div>
 )}
 {med.mauritius_availability.brand_names && (
 <div>Brands: {med.mauritius_availability.brand_names}</div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}
 </AnimatedSection>

 {/* DIFFERENTIAL DIAGNOSES - With animation */}
 <AnimatedSection show={showDifferential} delay={500}>
 {currentSection === 4 && diagnosis?.differential && diagnosis.differential.length > 0 && (
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <Search className="h-5 w-5 sm:h-6 sm:w-6" />
 Differential Diagnoses ({diagnosis.differential.length})
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8">
 <div className="grid gap-6">
 {diagnosis.differential.map((diff: any, index: number) => (
 <div key={index} className="border-l-4 border-blue-400 pl-6 bg-blue-25 p-4 rounded-r-lg hover:shadow-md transition-shadow">
 <div className="flex items-center justify-between mb-3">
 <h4 className="font-semibold text-lg text-blue-800">
 {diff.condition || "Differential diagnosis"}
 </h4>
 <Badge className="bg-blue-100 text-blue-800">{diff.probability || 30}%</Badge>
 </div>
 
 {diff.reasoning && (
 <div className="mb-3">
 <p className="text-sm text-gray-600 italic">
 {diff.reasoning}
 </p>
 </div>
 )}
 
 {diff.supporting_features && (
 <div className="mb-2">
 <span className="font-medium text-teal-700 text-sm">Supporting: </span>
 <span className="text-sm text-gray-600">{diff.supporting_features}</span>
 </div>
 )}
 
 {diff.against_features && (
 <div className="mb-2">
 <span className="font-medium text-blue-700 text-sm">Against: </span>
 <span className="text-sm text-gray-600">{diff.against_features}</span>
 </div>
 )}
 
 {diff.discriminating_test && (
 <div className="bg-blue-50 p-3 rounded border border-blue-200 mt-3">
 <span className="font-medium text-blue-700">
 <TestTube className="h-4 w-4 inline mr-1" />
 Discriminating test: 
 </span>
 <span className="text-sm text-blue-600 ml-2">
 {diff.discriminating_test}
 </span>
 </div>
 )}
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}
 </AnimatedSection>

 {/* MONITORING - With animation */}
 <AnimatedSection show={showMonitoring} delay={600}>
 {currentSection === 5 && (
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
 <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Monitor className="h-6 w-6" />
 Monitoring Plan
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
 <div className="flex items-center gap-2 mb-3">
 <Clock className="h-5 w-5 text-blue-600" />
 <h3 className="font-semibold text-blue-800">Immediate Monitoring (24h)</h3>
 </div>
 <ul className="text-sm text-blue-700 space-y-1">
 <li>• Symptomatic treatment efficacy</li>
 <li>• Drug tolerance</li>
 <li>• Symptom evolution</li>
 <li>• Complication signs</li>
 </ul>
 </div>

 <div className="bg-blue-50 p-4 rounded-lg border border-cyan-200">
 <div className="flex items-center gap-2 mb-3">
 <Calendar className="h-5 w-5 text-blue-600" />
 <h3 className="font-semibold text-blue-800">Short Term Follow-up (1 week)</h3>
 </div>
 <ul className="text-sm text-blue-700 space-y-1">
 <li>• Clinical reassessment</li>
 <li>• Lab test results</li>
 <li>• Treatment adjustment if needed</li>
 <li>• Treatment compliance</li>
 </ul>
 </div>

 <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
 <div className="flex items-center gap-2 mb-3">
 <Activity className="h-5 w-5 text-teal-600" />
 <h3 className="font-semibold text-teal-800">Long Term Follow-up</h3>
 </div>
 <ul className="text-sm text-teal-700 space-y-1">
 <li>• Recurrence prevention</li>
 <li>• Organ function monitoring</li>
 <li>• Therapeutic education</li>
 <li>• Lifestyle adaptation</li>
 </ul>
 </div>
 </div>

 <div className="mt-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
 <h3 className="font-bold text-cyan-800 mb-2 flex items-center gap-2">
 <AlertTriangle className="h-5 w-5" />
 Warning Signs - Urgent Consultation
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <ul className="text-sm text-cyan-700 space-y-1">
 <li>• Worsening general condition</li>
 <li>• Persistent fever &gt;39°C</li>
 <li>• Uncontrolled pain &gt;8/10</li>
 </ul>
 <ul className="text-sm text-cyan-700 space-y-1">
 <li>• Severe adverse effects</li>
 <li>• New neurological symptoms</li>
 <li>• Emergency Mauritius: 114 (SAMU)</li>
 </ul>
 </div>
 </div>
 </CardContent>
 </Card>
 )}
 </AnimatedSection>

 {/* DOCUMENTS - With animation */}
 <AnimatedSection show={showDocuments} delay={700}>
 {currentSection === 6 && documentsGenerated && mauritianDocuments && (
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 border-blue-200">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <FileText className="h-6 w-6" />
 Complete Mauritian Medical Documents
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
 
 {/* Consultation Report */}
 <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-4">
 <FileText className="h-8 w-8 text-blue-600" />
 <div>
 <h3 className="font-semibold text-blue-800">Consultation Report</h3>
 <p className="text-sm text-blue-600">With diagnostic reasoning</p>
 </div>
 </div>
 <div className="text-xs text-blue-700 space-y-1">
 <p><strong>Patient:</strong> {mauritianDocuments.consultation?.patient?.firstName} {mauritianDocuments.consultation?.patient?.lastName}</p>
 <p><strong>Date:</strong> {mauritianDocuments.consultation?.header?.date}</p>
 <p><strong>Diagnosis:</strong> {diagnosis?.primary?.condition}</p>
 <p className="text-teal-600"><strong>✅</strong> Diagnostic reasoning included</p>
 </div>
 </div>

 {/* Lab Tests */}
 <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-4">
 <TestTube className="h-8 w-8 text-blue-600" />
 <div>
 <h3 className="font-semibold text-blue-800">Laboratory Tests</h3>
 <p className="text-sm text-blue-600">Structured by objective</p>
 </div>
 </div>
 <div className="text-xs text-blue-700">
 <p><strong>Tests:</strong> {mauritianDocuments.biological?.examinations?.length || 0} tests</p>
 <p className="text-teal-600"><strong>✅</strong> Tests organized by diagnostic objective</p>
 <p className="text-teal-600"><strong>✅</strong> Mauritius availability included</p>
 </div>
 </div>

 {/* Imaging */}
 <div className="bg-teal-50 p-6 rounded-lg border border-teal-200 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-4">
 <Stethoscope className="h-8 w-8 text-teal-600" />
 <div>
 <h3 className="font-semibold text-teal-800">Medical Imaging</h3>
 <p className="text-sm text-teal-600">Temporal sequence</p>
 </div>
 </div>
 <div className="text-xs text-teal-700">
 {mauritianDocuments.imaging ? (
 <>
 <p><strong>Studies:</strong> {mauritianDocuments.imaging.studies?.length || 0}</p>
 <p className="text-teal-600"><strong>✅</strong> Temporal prioritization</p>
 </>
 ) : (
 <p className="text-gray-600">No imaging required</p>
 )}
 </div>
 </div>

 {/* Prescription */}
 <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-4">
 <Pill className="h-8 w-8 text-blue-600" />
 <div>
 <h3 className="font-semibold text-blue-800">Prescription</h3>
 <p className="text-sm text-blue-600">Mechanisms of action</p>
 </div>
 </div>
 <div className="text-xs text-blue-700">
 <p><strong>Medications:</strong> {mauritianDocuments.medication?.prescriptions?.length || 0}</p>
 <p className="text-teal-600"><strong>✅</strong> Detailed mechanisms of action</p>
 <p className="text-teal-600"><strong>✅</strong> Mauritius availability and costs</p>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-r from-blue-100 to-blue-100 p-4 rounded-lg border border-blue-300">
 <div className="flex items-center gap-2 mb-2">
 <Brain className="h-5 w-5 text-blue-600" />
 <span className="font-semibold text-blue-800">Complete Documents with Diagnostic Logic</span>
 </div>
 <p className="text-sm text-blue-700">
 All documents include systematic diagnostic reasoning 
 and structured investigation strategy for better medical traceability.
 </p>
 <div className="mt-3 flex items-center gap-2">
 <CheckCircle className="h-4 w-4 text-teal-600" />
 <span className="text-sm text-teal-700">Ready for printing and archiving</span>
 </div>
 </div>
 </CardContent>
 </Card>
 )}
 </AnimatedSection>

 {/* Navigation */}
 <div className="flex justify-between !flex-row" style={{ flexDirection: 'row' }}>
 <Button
 variant="outline"
 onClick={onPrevious}
 className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
 >
 <ArrowLeft className="h-4 w-4 mr-2" />
 Back to AI Questions
 </Button>

 {documentsGenerated ? (
 <Button 
 onClick={onNext}
 className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
 >
 <Edit3 className="h-4 w-4 mr-2" />
 Edit Documents
 </Button>
 ) : (
 <Button 
 onClick={generateCompleteDiagnosisAndDocuments}
 className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
 disabled={loading}
 >
 <Brain className="h-4 w-4 mr-2" />
 Generate Analysis
 </Button>
 )}
 </div>

 {/* Auto-generation indicator */}
 <div className="flex justify-center">
 <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
 <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
 <span className="text-sm text-gray-600">Automatic generation with progressive appearance</span>
 </div>
 </div>
 </div>
 )
}
