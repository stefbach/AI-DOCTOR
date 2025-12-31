"use client"
// import MedicalAIAssistant from './MedicalAIAssistant'
import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { consultationDataService } from '@/lib/consultation-data-service'
import { 
 FileText, Download, Printer, CheckCircle, Loader2, Share2, Pill, TestTube, 
 Scan, AlertTriangle, XCircle, Eye, EyeOff, Edit, Save, FileCheck, Plus, 
 Trash2, AlertCircle, Lock, Unlock, Copy, ClipboardCheck, Stethoscope, 
 Calendar, User, Building, CreditCard, Receipt, Brain
} from "lucide-react"
import TibokMedicalAssistant from './tibok-medical-assistant'

// ==================== HELPER FUNCTIONS ====================
// Helper function to safely handle DCI fields
function sanitizeMedications(medications: any[]): any[] {
 if (!medications || !Array.isArray(medications)) return []
 
 return medications.map(med => {
 // Ensure dci is always a string
 if (med && typeof med === 'object') {
 return {
 ...med,
 dci: String(med.dci || med.denominationCommune || med.nom || ''),
 // Also ensure other fields that might cause issues
 nom: String(med.nom || med.drug || med.medication_name || ''),
 dosage: String(med.dosage || ''),
 forme: String(med.forme || 'tablet'),
 posologie: String(med.posologie || ''),
 modeAdministration: String(med.modeAdministration || 'Oral route'),
 dureeTraitement: String(med.dureeTraitement || '7 days'),
 quantite: String(med.quantite || '1 box'),
 instructions: String(med.instructions || ''),
 justification: String(med.justification || ''),
 surveillanceParticuliere: String(med.surveillanceParticuliere || ''),
 ligneComplete: String(med.ligneComplete || '')
 }
 }
 return med
 })
}

// Helper function to highlight urgent/critical keywords in red
function highlightUrgentContent(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text
  
  // Keywords that should be highlighted in red
  const urgentKeywords = [
    // English
    'URGENT', 'EMERGENCY', 'IMMEDIATE', 'CRITICAL', 'SEVERE', 'ACUTE', 
    'RED FLAG', 'WARNING', 'DANGER', 'LIFE-THREATENING', 'RISK', 
    'CONTRAINDICATED', 'AVOID', 'DO NOT', 'STOP IMMEDIATELY',
    'IMMEDIATELY', 'AS SOON AS POSSIBLE', 'ASAP', 'STAT',
    // French
    'URGENT', 'URGENCE', 'IMMÉDIAT', 'IMMÉDIATE', 'CRITIQUE', 'GRAVE', 
    'SÉVÈRE', 'AIGU', 'AIGUË', 'SIGNAL D\'ALARME', 'ALERTE', 
    'AVERTISSEMENT', 'DANGER', 'RISQUE VITAL', 'RISQUE', 
    'CONTRE-INDIQUÉ', 'ÉVITER', 'NE PAS', 'ARRÊTER IMMÉDIATEMENT',
    'IMMÉDIATEMENT', 'DÈS QUE POSSIBLE'
  ]
  
  // Create a regex pattern to match any of the keywords (case-insensitive)
  const pattern = urgentKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')
  
  // Split text by the pattern and wrap matches in red spans
  const parts = text.split(regex)
  
  return (
    <>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <span key={index} className="text-red-600 font-bold urgent-highlight">
              {part}
            </span>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

// ==================== TYPES ====================
interface MauritianReport {
 compteRendu: {
 header: {
 title: string
 subtitle: string
 reference: string
 }
 praticien: {
 nom: string
 qualifications: string
 specialite: string
 adresseCabinet: string
 email: string
 heuresConsultation: string
 numeroEnregistrement: string
 }
 patient: {
 nom: string
 nomComplet: string
 age: string
 dateNaissance: string
 sexe: string
 adresse: string
 telephone: string
 email: string
 poids: string
 taille?: string
 identifiantNational?: string
 dateExamen: string
 // Vital Signs
 temperature?: string
 bloodPressureSystolic?: string
 bloodPressureDiastolic?: string
 bloodGlucose?: string
 // Medical Profile
 allergies?: string
 medicalHistory?: string
 currentMedications?: string
 // Gynecological Status
 pregnancyStatus?: string
 gestationalAge?: string
 lastMenstrualPeriod?: string
 }
 rapport: {
 motifConsultation: string
 anamnese: string
 antecedents: string
 examenClinique: string
 syntheseDiagnostique: string
 conclusionDiagnostique: string
 priseEnCharge: string
 surveillance: string
 conclusion: string
 }
 metadata: {
 dateGeneration: string
 wordCount: number
 lastModified?: string
 modifiedSections?: string[]
 validationStatus?: 'draft' | 'validated'
 validatedAt?: string
 validatedBy?: string
 complianceNote?: string
 signatures?: any
 signatureDataUrl?: string
 finalized?: boolean
 finalizedAt?: string
 }
 }
 ordonnances?: {
 medicaments?: any
 biologie?: any
 imagerie?: any
 }
 invoice?: any
 prescriptionsResume?: {
 medicaments: string
 examens: string
 }
 mentionsLegales?: any
}

interface ProfessionalReportProps {
 patientData: any
 clinicalData: any
 questionsData: any
 diagnosisData: any
 editedDocuments?: any
 onComplete?: () => void
 // IDs for document sending (passed from parent when coming from hub)
 consultationId?: string | null
 patientId?: string | null
 doctorId?: string | null
}

// ==================== HELPER FUNCTIONS ====================
const createEmptyReport = (): MauritianReport => ({
 compteRendu: {
 header: {
 title: "Medical Consultation Report",
 subtitle: "Professional Medical Documentation",
 reference: `REF-${new Date().getTime()}`
 },
 praticien: {
 nom: "Dr. [Name Required]",
 qualifications: "MBBS",
 specialite: "General Medicine",
 adresseCabinet: "",
 email: "[Email Required]",
 heuresConsultation: "",
 numeroEnregistrement: "[MCM Registration Required]"
 },
 patient: {
 nom: "",
 nomComplet: "",
 age: "",
 dateNaissance: "",
 sexe: "",
 adresse: "",
 telephone: "",
 email: "",
 poids: "",
 dateExamen: new Date().toISOString().split('T')[0],
 // Vital Signs
 temperature: "",
 bloodPressureSystolic: "",
 bloodPressureDiastolic: "",
 bloodGlucose: "",
 // Medical Profile
 allergies: "",
 medicalHistory: "",
 currentMedications: "",
 // Gynecological Status
 pregnancyStatus: "",
 gestationalAge: "",
 lastMenstrualPeriod: ""
 },
 rapport: {
 motifConsultation: "",
 anamnese: "",
 antecedents: "",
 examenClinique: "",
 syntheseDiagnostique: "",
 conclusionDiagnostique: "",
 priseEnCharge: "",
 surveillance: "",
 conclusion: ""
 },
 metadata: {
 dateGeneration: new Date().toISOString(),
 wordCount: 0,
 validationStatus: 'draft',
 complianceNote: "This document complies with Medical Council of Mauritius guidelines"
 }
 }
})
// ==================== MEMOIZED COMPONENTS (OUTSIDE MAIN COMPONENT) ====================
// 1. DebouncedTextarea Component
const DebouncedTextarea = memo(({
 value,
 onUpdate,
 className,
 placeholder,
 sectionKey,
 onLocalChange
}: {
 value: string
 onUpdate: (value: string) => void
 className?: string
 placeholder?: string
 sectionKey?: string
 onLocalChange?: () => void
}) => {
 // Initialize local state from props
 const [localValue, setLocalValue] = useState(value)
 const [hasLocalChanges, setHasLocalChanges] = useState(false)
 const saveTimeoutRef = useRef<NodeJS.Timeout>()
 
 // Handle text changes - update locally immediately
 const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
 setLocalValue(e.target.value)
 setHasLocalChanges(true)
 if (onLocalChange) onLocalChange()
 }, [onLocalChange])
 
 // Auto-save with debouncing - exactly like MedicationEditForm
 useEffect(() => {
 if (!hasLocalChanges) return
 
 // Clear existing timeout
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }
 
 // Set new timeout for auto-save
 saveTimeoutRef.current = setTimeout(() => {
 onUpdate(localValue) // Update parent after delay
 setHasLocalChanges(false)
 }, 3000) // 3 seconds
 
 // Cleanup
 return () => {
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }
 }
 }, [localValue, onUpdate, hasLocalChanges])
 
 // Save on unmount if there are pending changes
 useEffect(() => {
 return () => {
 if (hasLocalChanges && saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 onUpdate(localValue)
 }
 }
 }, []) // FIXED: Empty dependency array for unmount effect
 
 // Update local value if parent value changes (but only if we're not editing)
 useEffect(() => {
 if (value !== localValue && !hasLocalChanges) {
 setLocalValue(value)
 }
 }, [value, hasLocalChanges]) // FIXED: Removed localValue to prevent loops
 
 return (
 <div className="space-y-2">
 {hasLocalChanges && (
 <div className="text-xs text-cyan-600 flex items-center gap-1">
 <Loader2 className="h-3 w-3 animate-spin" />
 Auto-saving...
 </div>
 )}
 <Textarea
 value={localValue}
 onChange={handleChange}
 className={className}
 placeholder={placeholder}
 data-section={sectionKey}
 autoComplete="off"
 />
 </div>
 )
}, (prevProps, nextProps) => {
 return (
 prevProps.value === nextProps.value &&
 prevProps.sectionKey === nextProps.sectionKey
 )
})

DebouncedTextarea.displayName = 'DebouncedTextarea'

const MedicationEditForm = memo(({
 medication,
 index,
 onUpdate,
 onRemove,
 onLocalChange
}: {
 medication: any
 index: number
 onUpdate: (index: number, updatedMedication: any) => void
 onRemove: (index: number) => void
 onLocalChange?: () => void
}) => {
 // Initialize state from props only once
 const [localMed, setLocalMed] = useState(() => ({
 nom: medication.nom || '',
 denominationCommune: medication.denominationCommune || '',
 dosage: medication.dosage || '',
 forme: medication.forme || 'tablet',
 posologie: medication.posologie || '',
 modeAdministration: medication.modeAdministration || 'Oral route',
 dureeTraitement: medication.dureeTraitement || '7 days',
 quantite: medication.quantite || '1 box',
 instructions: medication.instructions || '',
 justification: medication.justification || '',
 surveillanceParticuliere: medication.surveillanceParticuliere || '',
 nonSubstituable: medication.nonSubstituable || false
 }))
 
 const [hasLocalChanges, setHasLocalChanges] = useState(false)
 const saveTimeoutRef = useRef<NodeJS.Timeout>()

 // Handle field changes - DON'T call onUpdate immediately
 const handleFieldChange = useCallback((field: string, value: any) => {
 setLocalMed(prev => ({ ...prev, [field]: value }))
 setHasLocalChanges(true)
 if (onLocalChange) onLocalChange()
 }, [onLocalChange])

 // Auto-save with debouncing - THIS is where we update the parent
 useEffect(() => {
 if (!hasLocalChanges) return

 // Clear existing timeout
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }

 // Set new timeout for auto-save
 saveTimeoutRef.current = setTimeout(() => {
 onUpdate(index, localMed) // Update parent after delay
 setHasLocalChanges(false)
 }, 3000) // 3 seconds

 // Cleanup
 return () => {
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }
 }
 }, [localMed, index, onUpdate, hasLocalChanges])

 // Save on unmount if there are pending changes
 useEffect(() => {
 return () => {
 if (hasLocalChanges && saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 onUpdate(index, localMed)
 }
 }
 }, [])

 return (
 <div className="space-y-3" data-medication-index={index}>
 <div style={{ height: '20px', minHeight: '20px' }}>
 {hasLocalChanges && (
 <div className="text-xs text-cyan-600 flex items-center gap-1">
 <Loader2 className="h-3 w-3 animate-spin" />
 Auto-saving...
 </div>
 )}
 </div>
 
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label htmlFor={`med-nom-${index}`}>Medication Name</Label>
 <Input
 id={`med-nom-${index}`}
 name={`med-nom-${index}`}
 value={localMed.nom}
 onChange={(e) => handleFieldChange('nom', e.target.value)}
 placeholder="e.g., Paracetamol"
 autoComplete="off"
 />
 </div>
 <div>
 <Label htmlFor={`med-generic-${index}`}>Generic Name (INN)</Label>
 <Input
 id={`med-generic-${index}`}
 name={`med-generic-${index}`}
 value={localMed.denominationCommune}
 onChange={(e) => handleFieldChange('denominationCommune', e.target.value)}
 placeholder="e.g., Paracetamol"
 autoComplete="off"
 />
 </div>
 <div>
 <Label htmlFor={`med-dosage-${index}`}>Dosage</Label>
 <Input
 id={`med-dosage-${index}`}
 name={`med-dosage-${index}`}
 value={localMed.dosage}
 onChange={(e) => handleFieldChange('dosage', e.target.value)}
 placeholder="e.g., 500mg"
 autoComplete="off"
 />
 </div>
 <div>
 <Label htmlFor={`med-form-${index}`}>Form</Label>
 <Select
 value={localMed.forme}
 onValueChange={(value) => handleFieldChange('forme', value)}
 >
 <SelectTrigger id={`med-form-${index}`}>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="tablet">Tablet</SelectItem>
 <SelectItem value="capsule">Capsule</SelectItem>
 <SelectItem value="syrup">Syrup</SelectItem>
 <SelectItem value="injection">Injection</SelectItem>
 <SelectItem value="cream">Cream</SelectItem>
 <SelectItem value="ointment">Ointment</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label htmlFor={`med-frequency-${index}`}>Frequency</Label>
 <Input
 id={`med-frequency-${index}`}
 name={`med-frequency-${index}`}
 value={localMed.posologie}
 onChange={(e) => handleFieldChange('posologie', e.target.value)}
 placeholder="e.g., 1 tablet 3 times daily"
 autoComplete="off"
 />
 </div>
 <div>
 <Label htmlFor={`med-duration-${index}`}>Duration</Label>
 <Input
 id={`med-duration-${index}`}
 name={`med-duration-${index}`}
 value={localMed.dureeTraitement}
 onChange={(e) => handleFieldChange('dureeTraitement', e.target.value)}
 placeholder="e.g., 7 days"
 autoComplete="off"
 />
 </div>
 <div>
 <Label htmlFor={`med-quantity-${index}`}>Quantity</Label>
 <Input
 id={`med-quantity-${index}`}
 name={`med-quantity-${index}`}
 value={localMed.quantite}
 onChange={(e) => handleFieldChange('quantite', e.target.value)}
 placeholder="e.g., 1 box"
 autoComplete="off"
 />
 </div>
 <div>
 <Label htmlFor={`med-route-${index}`}>Route of Administration</Label>
 <Select
 value={localMed.modeAdministration}
 onValueChange={(value) => handleFieldChange('modeAdministration', value)}
 >
 <SelectTrigger id={`med-route-${index}`}>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Oral route">Oral route</SelectItem>
 <SelectItem value="Sublingual route">Sublingual route</SelectItem>
 <SelectItem value="Topical route">Topical route</SelectItem>
 <SelectItem value="Parenteral route">Parenteral route</SelectItem>
 <SelectItem value="Rectal route">Rectal route</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label htmlFor={`med-instructions-${index}`}>Special Instructions</Label>
 <Input
 id={`med-instructions-${index}`}
 name={`med-instructions-${index}`}
 value={localMed.instructions}
 onChange={(e) => handleFieldChange('instructions', e.target.value)}
 placeholder="e.g., Take with food"
 autoComplete="off"
 />
 </div>
 <div className="flex justify-between items-center">
 <div className="flex items-center space-x-2">
 <Switch
 id={`med-nonsubstitutable-${index}`}
 checked={localMed.nonSubstituable}
 onCheckedChange={(checked) => handleFieldChange('nonSubstituable', checked)}
 />
 <Label htmlFor={`med-nonsubstitutable-${index}`}>Non-substitutable</Label>
 </div>
 <div className="flex gap-2">
<Button
 variant="destructive"
 size="sm"
 onClick={() => onRemove(index)} // ✅ Correct
 type="button"
>
 <Trash2 className="h-4 w-4" />
</Button>
 </div>
 </div>
 </div>
 )
}, (prevProps, nextProps) => {
 // IMPORTANT: Prevent re-renders when callbacks change
 return prevProps.index === nextProps.index && 
 JSON.stringify(prevProps.medication) === JSON.stringify(nextProps.medication)
})

// 3. BiologyTestEditForm Component - SAVE ON BLUR
const BiologyTestEditForm = memo(({
 test,
 category,
 index,
 onUpdate,
 onRemove,
 onLocalChange
}: {
 test: any
 category: string
 index: number
 onUpdate: (category: string, index: number, updatedTest: any) => void
 onRemove: (category: string, index: number) => void
 onLocalChange?: () => void
}) => {
 const [localTest, setLocalTest] = useState({
 nom: test.nom || '',
 categorie: test.categorie || category,
 urgence: test.urgence || false,
 aJeun: test.aJeun || false,
 conditionsPrelevement: test.conditionsPrelevement || '',
 motifClinique: test.motifClinique || '',
 renseignementsCliniques: test.renseignementsCliniques || '',
 tubePrelevement: test.tubePrelevement || 'As per laboratory protocol',
 delaiResultat: test.delaiResultat || 'Standard'
 })

 const [hasLocalChanges, setHasLocalChanges] = useState(false)
 const saveTimeoutRef = useRef<NodeJS.Timeout>()

 // Handle field changes locally only
 const handleFieldChange = useCallback((field: string, value: any) => {
 setLocalTest(prev => ({ ...prev, [field]: value }))
 setHasLocalChanges(true)
 if (onLocalChange) onLocalChange()
 }, [onLocalChange])

 // Auto-save with debouncing
 useEffect(() => {
 if (!hasLocalChanges) return

 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }

 saveTimeoutRef.current = setTimeout(() => {
 onUpdate(category, index, localTest)
 setHasLocalChanges(false)
 }, 3000) // 3 seconds

 return () => {
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }
 }
 }, [localTest, category, index, onUpdate, hasLocalChanges])

 // Save on unmount
 useEffect(() => {
 return () => {
 if (hasLocalChanges && saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 onUpdate(category, index, localTest)
 }
 }
 }, [])

 return (
 <div className="space-y-3 p-3" data-biology-test={`${category}-${index}`}>
 {hasLocalChanges && (
 <div className="text-xs text-cyan-600 flex items-center gap-1">
 <Loader2 className="h-3 w-3 animate-spin" />
 Auto-saving...
 </div>
 )}
 
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Test Name</Label>
 <Input
 value={localTest.nom}
 onChange={(e) => handleFieldChange('nom', e.target.value)}
 placeholder="e.g., Complete Blood Count"
 />
 </div>
 <div>
 <Label>Clinical Indication</Label>
 <Input
 value={localTest.motifClinique}
 onChange={(e) => handleFieldChange('motifClinique', e.target.value)}
 placeholder="e.g., Anemia evaluation"
 />
 </div>
 <div>
 <Label>Sample Type</Label>
 <Select
 value={localTest.tubePrelevement}
 onValueChange={(value) => handleFieldChange('tubePrelevement', value)}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="As per laboratory protocol">Lab Protocol</SelectItem>
 <SelectItem value="EDTA (Purple top)">EDTA (Purple)</SelectItem>
 <SelectItem value="SST (Gold top)">SST (Gold)</SelectItem>
 <SelectItem value="Sodium Citrate (Blue top)">Citrate (Blue)</SelectItem>
 <SelectItem value="Heparin (Green top)">Heparin (Green)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>Turnaround Time</Label>
 <Select
 value={localTest.delaiResultat}
 onValueChange={(value) => handleFieldChange('delaiResultat', value)}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Standard">Standard (24-48h)</SelectItem>
 <SelectItem value="Urgent">Urgent (2-4h)</SelectItem>
 <SelectItem value="STAT">STAT (&lt;1h)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>Special Conditions</Label>
 <Input
 value={localTest.conditionsPrelevement}
 onChange={(e) => handleFieldChange('conditionsPrelevement', e.target.value)}
 placeholder="e.g., Early morning sample required"
 />
 </div>
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-4">
 <div className="flex items-center space-x-2">
 <Switch
 checked={localTest.urgence}
 onCheckedChange={(checked) => handleFieldChange('urgence', checked)}
 />
 <Label>Urgent</Label>
 </div>
 <div className="flex items-center space-x-2">
 <Switch
 checked={localTest.aJeun}
 onCheckedChange={(checked) => handleFieldChange('aJeun', checked)}
 />
 <Label>Fasting required</Label>
 </div>
 </div>
 <Button
 variant="destructive"
 size="sm"
 onClick={() => onRemove(category, index)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 )
}, (prevProps, nextProps) => {
 return prevProps.index === nextProps.index && 
 prevProps.category === nextProps.category &&
 JSON.stringify(prevProps.test) === JSON.stringify(nextProps.test)
})

// 4. ImagingExamEditForm Component - CORRECTED VERSION
const ImagingExamEditForm = memo(({
 exam,
 index,
 onUpdate,
 onRemove,
 onLocalChange
}: {
 exam: any
 index: number
 onUpdate: (index: number, updatedExam: any) => void
 onRemove: (index: number) => void
 onLocalChange?: () => void
}) => {
 const [localExam, setLocalExam] = useState({
 type: exam.type || exam.modalite || '',
 modalite: exam.modalite || '',
 region: exam.region || '',
 indicationClinique: exam.indicationClinique || '',
 urgence: exam.urgence || false,
 contraste: exam.contraste || false,
 protocoleSpecifique: exam.protocoleSpecifique || '',
 questionDiagnostique: exam.questionDiagnostique || ''
 })

 const [hasLocalChanges, setHasLocalChanges] = useState(false)
 const saveTimeoutRef = useRef<NodeJS.Timeout>()

 // Handle field changes locally only
 const handleFieldChange = useCallback((field: string, value: any) => {
 setLocalExam(prev => ({ ...prev, [field]: value }))
 setHasLocalChanges(true)
 if (onLocalChange) onLocalChange()
 }, [onLocalChange])

 // Auto-save with debouncing
 useEffect(() => {
 if (!hasLocalChanges) return

 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }

 saveTimeoutRef.current = setTimeout(() => {
 onUpdate(index, localExam)
 setHasLocalChanges(false)
 }, 3000) // 3 seconds

 return () => {
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }
 }
 }, [localExam, index, onUpdate, hasLocalChanges])

 // Save on unmount
 useEffect(() => {
 return () => {
 if (hasLocalChanges && saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 onUpdate(index, localExam)
 }
 }
 }, [])

 return (
 <div className="space-y-3 p-3" data-imaging-exam={index}>
 {hasLocalChanges && (
 <div className="text-xs text-cyan-600 flex items-center gap-1">
 <Loader2 className="h-3 w-3 animate-spin" />
 Auto-saving...
 </div>
 )}
 
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Imaging Type</Label>
 <Select
 value={localExam.type || localExam.modalite}
 onValueChange={(value) => handleFieldChange('type', value)}
 >
 <SelectTrigger>
 <SelectValue placeholder="Select type" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="X-Ray">X-Ray</SelectItem>
 <SelectItem value="CT Scan">CT Scan</SelectItem>
 <SelectItem value="MRI">MRI</SelectItem>
 <SelectItem value="Ultrasound">Ultrasound</SelectItem>
 <SelectItem value="Mammography">Mammography</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>Anatomical Region</Label>
 <Input
 value={localExam.region}
 onChange={(e) => handleFieldChange('region', e.target.value)}
 placeholder="e.g., Chest PA/Lateral"
 />
 </div>
 <div className="col-span-2">
 <Label>Clinical Indication</Label>
 <Input
 value={localExam.indicationClinique}
 onChange={(e) => handleFieldChange('indicationClinique', e.target.value)}
 placeholder="e.g., Rule out pneumonia"
 />
 </div>
 <div className="col-span-2">
 <Label>Clinical Question</Label>
 <Input
 value={localExam.questionDiagnostique}
 onChange={(e) => handleFieldChange('questionDiagnostique', e.target.value)}
 placeholder="e.g., Consolidation? Pleural effusion?"
 />
 </div>
 <div>
 <Label>Specific Protocol</Label>
 <Input
 value={localExam.protocoleSpecifique}
 onChange={(e) => handleFieldChange('protocoleSpecifique', e.target.value)}
 placeholder="e.g., High resolution CT"
 />
 </div>
 </div>
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-4">
 <div className="flex items-center space-x-2">
 <Switch
 checked={localExam.urgence}
 onCheckedChange={(checked) => handleFieldChange('urgence', checked)}
 />
 <Label>Urgent</Label>
 </div>
 <div className="flex items-center space-x-2">
 <Switch
 checked={localExam.contraste}
 onCheckedChange={(checked) => handleFieldChange('contraste', checked)}
 />
 <Label>Contrast required</Label>
 </div>
 </div>
 <Button
 variant="destructive"
 size="sm"
 onClick={() => onRemove(index)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 )
}, (prevProps, nextProps) => {
 return prevProps.index === nextProps.index && 
 JSON.stringify(prevProps.exam) === JSON.stringify(nextProps.exam)
})

// Set display names for debugging
DebouncedTextarea.displayName = 'DebouncedTextarea'
MedicationEditForm.displayName = 'MedicationEditForm'
BiologyTestEditForm.displayName = 'BiologyTestEditForm'
ImagingExamEditForm.displayName = 'ImagingExamEditForm'
// ==================== MAIN COMPONENT ====================
export default function ProfessionalReportEditable({
 patientData,
 clinicalData,
 questionsData,
 diagnosisData,
 editedDocuments,
 onComplete,
 consultationId: propConsultationId,
 patientId: propPatientId,
 doctorId: propDoctorId
}: ProfessionalReportProps) {

// ==================== STATE MANAGEMENT ====================
 const [report, setReport] = useState<MauritianReport | null>(null)
 const [reportId, setReportId] = useState<string | null>(null)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [activeTab, setActiveTab] = useState(() => {
 // Check if this is a prescription renewal
 const isRenewal = sessionStorage.getItem('prescriptionRenewal') === 'true'
 return isRenewal ? "medicaments" : "consultation"
 })
 const [editMode, setEditMode] = useState(false)
 const [validationStatus, setValidationStatus] = useState<'draft' | 'validated'>('draft')
 const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set())
 const [saving, setSaving] = useState(false)
 const [isSendingDocuments, setIsSendingDocuments] = useState(false)
 const [showFullReport, setShowFullReport] = useState(false)
 const [includeFullPrescriptions, setIncludeFullPrescriptions] = useState(true)
 
 // Manual save states
 const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
 const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

 // Loading states
 const [isLoadingFromDb, setIsLoadingFromDb] = useState(true)
 const [dbCheckComplete, setDbCheckComplete] = useState(false)
 const [shouldGenerateReport, setShouldGenerateReport] = useState(false)

 const [doctorInfo, setDoctorInfo] = useState({
 nom: "Dr. [Name Required]",
 qualifications: "MBBS",
 specialite: "General Medicine",
 adresseCabinet: "",
 email: "[Email Required]",
 heuresConsultation: "",
 numeroEnregistrement: "[MCM Registration Required]",
 signatureUrl: null,
 digitalSignature: null
 })
 const [editingDoctor, setEditingDoctor] = useState(false)
 const [documentSignatures, setDocumentSignatures] = useState<{
 consultation?: string
 prescription?: string
 laboratory?: string
 imaging?: string
 invoice?: string
 }>({})

 const [sickLeaveData, setSickLeaveData] = useState({
 startDate: '',
 endDate: '',
 numberOfDays: 0,
 medicalReason: '',
 remarks: '',
 workRestrictions: '',
 returnToWork: ''
})

// Helper function to get full Supabase storage URL
const getFullSignatureUrl = (signatureUrl: string | null): string | null => {
 if (!signatureUrl) return null;
 
 // If it's already a full URL, return it as is
 if (signatureUrl.startsWith('http://') || signatureUrl.startsWith('https://')) {
 console.log('✅ Signature URL is already complete:', signatureUrl);
 return signatureUrl;
 }
 
 // If it's a data URL (base64), return as is
 if (signatureUrl.startsWith('data:')) {
 console.log('✅ Using base64 signature');
 return signatureUrl;
 }
 
 // Get Supabase URL from environment variable
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
 
 if (!supabaseUrl) {
 console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined');
 return null;
 }
 
 // Build the correct path for documents/doctor-signatures bucket
 // Handle different possible formats the signatureUrl might be stored as
 
 // If it's just the filename (e.g., "1344d47c-91c2-4466-ab89-d635d5d8c62b-1757419582535.png")
 if (!signatureUrl.includes('/')) {
 const fullUrl = `${supabaseUrl}/storage/v1/object/public/documents/doctor-signatures/${signatureUrl}`;
 console.log('📎 Built signature URL from filename:', fullUrl);
 return fullUrl;
 }
 
 // If it includes the bucket path (e.g., "documents/doctor-signatures/filename.png")
 if (signatureUrl.startsWith('documents/doctor-signatures/')) {
 const fullUrl = `${supabaseUrl}/storage/v1/object/public/${signatureUrl}`;
 console.log('📎 Built signature URL from bucket path:', fullUrl);
 return fullUrl;
 }
 
 // If it includes partial path (e.g., "doctor-signatures/filename.png")
 if (signatureUrl.startsWith('doctor-signatures/')) {
 const fullUrl = `${supabaseUrl}/storage/v1/object/public/documents/${signatureUrl}`;
 console.log('📎 Built signature URL from partial path:', fullUrl);
 return fullUrl;
 }
 
 // If it starts with /storage/ (relative path)
 if (signatureUrl.startsWith('/storage/')) {
 const fullUrl = `${supabaseUrl}${signatureUrl}`;
 console.log('📎 Built signature URL from relative path:', fullUrl);
 return fullUrl;
 }
 
 // Default case - assume it needs the full path
 const fullUrl = `${supabaseUrl}/storage/v1/object/public/documents/doctor-signatures/${signatureUrl}`;
 console.log('📎 Built signature URL (default):', fullUrl);
 return fullUrl;
}

 // ==================== SAFE GETTERS ====================
 const getReportHeader = () => report?.compteRendu?.header || createEmptyReport().compteRendu.header
 const getReportPraticien = () => report?.compteRendu?.praticien || doctorInfo
 const getReportPatient = () => report?.compteRendu?.patient || createEmptyReport().compteRendu.patient
 const getReportRapport = () => report?.compteRendu?.rapport || createEmptyReport().compteRendu.rapport
 const getReportMetadata = () => report?.compteRendu?.metadata || createEmptyReport().compteRendu.metadata

// ==================== TRACKING & UPDATES ====================
const trackModification = useCallback((section: string) => {
 if (validationStatus === 'validated') return
 setModifiedSections(prev => new Set(prev).add(section))
 setHasUnsavedChanges(true)
}, [validationStatus])

const updateRapportSection = useCallback((section: string, value: string) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev) return null
 
 const newReport = {
 ...prev,
 compteRendu: {
 ...prev.compteRendu,
 rapport: {
 ...prev.compteRendu.rapport,
 [section]: value
 }
 }
 }
 
 return newReport
 })
 trackModification(`rapport.${section}`)
}, [validationStatus, trackModification])

// ==================== UPDATE PATIENT FIELDS ====================
const updatePatientField = useCallback((field: string, value: string) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev) return null
 
 const newReport = {
 ...prev,
 compteRendu: {
 ...prev.compteRendu,
 patient: {
 ...prev.compteRendu.patient,
 [field]: value
 }
 }
 }
 
 return newReport
 })
 trackModification(`patient.${field}`)
 setHasUnsavedChanges(true)
}, [validationStatus, trackModification])

// ==================== ADD FUNCTIONS ====================
const addMedicament = useCallback(() => {
 if (validationStatus === 'validated') return
 
 const newMed = {
 nom: '',
 denominationCommune: '',
 dosage: '',
 forme: 'tablet',
 posologie: '',
 modeAdministration: 'Oral route',
 dureeTraitement: '7 days',
 quantite: '1 box',
 instructions: '',
 justification: '',
 surveillanceParticuliere: '',
 nonSubstituable: false,
 ligneComplete: ''
 }
 
 setReport(prev => {
 if (!prev) return null
 
 const newReport = { ...prev }
 
 if (!newReport.ordonnances) {
 newReport.ordonnances = {}
 }
 
 if (!newReport.ordonnances.medicaments) {
 const praticien = getReportPraticien()
 const patient = getReportPatient()
 
 newReport.ordonnances.medicaments = {
 enTete: praticien,
 patient: patient,
 prescription: { 
 datePrescription: patient.dateExamen || new Date().toISOString().split('T')[0],
 medicaments: [],
 validite: "3 months unless otherwise specified"
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: praticien.nom.toUpperCase(),
 numeroEnregistrement: praticien.numeroEnregistrement,
 cachetProfessionnel: "Official Medical Stamp",
 date: patient.dateExamen || new Date().toISOString().split('T')[0]
 }
 }
 }
 
 newReport.ordonnances.medicaments.prescription.medicaments = [
 ...(newReport.ordonnances.medicaments.prescription.medicaments || []), 
 newMed
 ]
 
 return newReport
 })
 trackModification('medicaments.new')
}, [validationStatus, getReportPraticien, getReportPatient, trackModification])

const addBiologyTest = useCallback((category: string = 'clinicalChemistry') => {
 if (validationStatus === 'validated') return
 
 const newTest = {
 nom: '',
 categorie: category,
 urgence: false,
 aJeun: false,
 conditionsPrelevement: '',
 motifClinique: '',
 renseignementsCliniques: '',
 tubePrelevement: 'As per laboratory protocol',
 delaiResultat: 'Standard'
 }
 
 setReport(prev => {
 if (!prev) return null
 
 const newReport = { ...prev }
 
 if (!newReport.ordonnances) newReport.ordonnances = {}
 
 if (!newReport.ordonnances.biologie) {
 const praticien = getReportPraticien()
 const patient = getReportPatient()
 
 newReport.ordonnances.biologie = {
 enTete: praticien,
 patient: patient,
 prescription: {
 datePrescription: patient.dateExamen || new Date().toISOString().split('T')[0],
 motifClinique: '',
 analyses: {},
 instructionsSpeciales: [],
 laboratoireRecommande: ''
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: praticien.nom.toUpperCase(),
 numeroEnregistrement: praticien.numeroEnregistrement,
 date: patient.dateExamen || new Date().toISOString().split('T')[0]
 }
 }
 }
 
 if (!newReport.ordonnances.biologie.prescription.analyses) {
 newReport.ordonnances.biologie.prescription.analyses = {}
 }
 
 if (!newReport.ordonnances.biologie.prescription.analyses[category]) {
 newReport.ordonnances.biologie.prescription.analyses[category] = []
 }
 
 newReport.ordonnances.biologie.prescription.analyses[category] = [
 ...newReport.ordonnances.biologie.prescription.analyses[category], 
 newTest
 ]
 
 return newReport
 })
 trackModification(`biologie.new.${category}`)
}, [validationStatus, getReportPraticien, getReportPatient, trackModification])

const addImagingExam = useCallback(() => {
 if (validationStatus === 'validated') return
 
 const newExam = {
 type: '',
 modalite: '',
 region: '',
 indicationClinique: '',
 urgence: false,
 contraste: false,
 protocoleSpecifique: '',
 questionDiagnostique: ''
 }
 
 setReport(prev => {
 if (!prev) return null
 
 const newReport = { ...prev }
 
 if (!newReport.ordonnances) newReport.ordonnances = {}
 
 if (!newReport.ordonnances.imagerie) {
 const praticien = getReportPraticien()
 const patient = getReportPatient()
 
 newReport.ordonnances.imagerie = {
 enTete: praticien,
 patient: patient,
 prescription: {
 datePrescription: patient.dateExamen || new Date().toISOString().split('T')[0],
 examens: [],
 renseignementsCliniques: '',
 centreImagerie: ''
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: praticien.nom.toUpperCase(),
 numeroEnregistrement: praticien.numeroEnregistrement,
 date: patient.dateExamen || new Date().toISOString().split('T')[0]
 }
 }
 }
 
 newReport.ordonnances.imagerie.prescription.examens = [
 ...(newReport.ordonnances.imagerie.prescription.examens || []), 
 newExam
 ]
 
 return newReport
 })
 trackModification('imagerie.new')
}, [validationStatus, getReportPraticien, getReportPatient, trackModification])

// ==================== REMOVE FUNCTIONS ====================
const removeMedicament = useCallback((index: number) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev?.ordonnances?.medicaments?.prescription?.medicaments) return prev
 
 return {
 ...prev,
 ordonnances: {
 ...prev.ordonnances,
 medicaments: {
 ...prev.ordonnances.medicaments,
 prescription: {
 ...prev.ordonnances.medicaments.prescription,
 medicaments: prev.ordonnances.medicaments.prescription.medicaments.filter((_, i) => i !== index)
 }
 }
 }
 }
 })
 trackModification(`medicament.remove.${index}`)
}, [validationStatus, trackModification])

const removeBiologyTest = useCallback((category: string, index: number) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev?.ordonnances?.biologie?.prescription?.analyses?.[category]) return prev
 
 return {
 ...prev,
 ordonnances: {
 ...prev.ordonnances,
 biologie: {
 ...prev.ordonnances.biologie,
 prescription: {
 ...prev.ordonnances.biologie.prescription,
 analyses: {
 ...prev.ordonnances.biologie.prescription.analyses,
 [category]: prev.ordonnances.biologie.prescription.analyses[category].filter((_, i) => i !== index)
 }
 }
 }
 }
 }
 })
 trackModification(`biologie.remove.${category}.${index}`)
}, [validationStatus, trackModification])

const removeImagingExam = useCallback((index: number) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev?.ordonnances?.imagerie?.prescription?.examens) return prev
 
 return {
 ...prev,
 ordonnances: {
 ...prev.ordonnances,
 imagerie: {
 ...prev.ordonnances.imagerie,
 prescription: {
 ...prev.ordonnances.imagerie.prescription,
 examens: prev.ordonnances.imagerie.prescription.examens.filter((_, i) => i !== index)
 }
 }
 }
 }
 })
 trackModification(`imagerie.remove.${index}`)
}, [validationStatus, trackModification])

// ==================== BATCH UPDATE FUNCTIONS ====================
const updateMedicamentBatch = useCallback((index: number, updatedMedication: any) => {
 if (validationStatus === 'validated' || !report?.ordonnances?.medicaments) return
 
 setReport(prev => {
 if (!prev?.ordonnances?.medicaments?.prescription?.medicaments) return prev
 
 const newMedicaments = [...prev.ordonnances.medicaments.prescription.medicaments]
 newMedicaments[index] = updatedMedication
 
 return {
 ...prev,
 ordonnances: {
 ...prev.ordonnances,
 medicaments: {
 ...prev.ordonnances.medicaments,
 prescription: {
 ...prev.ordonnances.medicaments.prescription,
 medicaments: newMedicaments
 }
 }
 }
 }
 })
 
 trackModification(`medicament.${index}`)
}, [validationStatus, report?.ordonnances?.medicaments, trackModification])

const updateBiologyTestBatch = useCallback((category: string, index: number, updatedTest: any) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev?.ordonnances?.biologie?.prescription?.analyses?.[category]) return prev
 
 const newAnalyses = { ...prev.ordonnances.biologie.prescription.analyses }
 const categoryTests = [...newAnalyses[category]]
 categoryTests[index] = updatedTest
 newAnalyses[category] = categoryTests
 
 return {
 ...prev,
 ordonnances: {
 ...prev.ordonnances,
 biologie: {
 ...prev.ordonnances.biologie,
 prescription: {
 ...prev.ordonnances.biologie.prescription,
 analyses: newAnalyses
 }
 }
 }
 }
 })
 
 trackModification(`biologie.${category}.${index}`)
}, [validationStatus, trackModification])

const updateImagingExamBatch = useCallback((index: number, updatedExam: any) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev?.ordonnances?.imagerie?.prescription?.examens) return prev
 
 const newExamens = [...prev.ordonnances.imagerie.prescription.examens]
 newExamens[index] = updatedExam
 
 return {
 ...prev,
 ordonnances: {
 ...prev.ordonnances,
 imagerie: {
 ...prev.ordonnances.imagerie,
 prescription: {
 ...prev.ordonnances.imagerie.prescription,
 examens: newExamens
 }
 }
 }
 }
 })
 
 trackModification(`imagerie.${index}`)
}, [validationStatus, trackModification])

// ==================== CREATE REFS ====================
const updateMedicamentBatchRef = useRef(updateMedicamentBatch)
const updateBiologyTestBatchRef = useRef(updateBiologyTestBatch)
const updateImagingExamBatchRef = useRef(updateImagingExamBatch)

// Keep refs updated
useEffect(() => {
 updateMedicamentBatchRef.current = updateMedicamentBatch
}, [updateMedicamentBatch])

useEffect(() => {
 updateBiologyTestBatchRef.current = updateBiologyTestBatch
}, [updateBiologyTestBatch])

useEffect(() => {
 updateImagingExamBatchRef.current = updateImagingExamBatch
}, [updateImagingExamBatch])

// ==================== STABLE CALLBACKS ====================
const stableUpdateMedication = useCallback((index: number, updatedMedication: any) => {
 updateMedicamentBatchRef.current(index, updatedMedication)
}, [])

const stableUpdateBiologyTest = useCallback((category: string, index: number, updatedTest: any) => {
 updateBiologyTestBatchRef.current(category, index, updatedTest)
}, [])

const stableUpdateImagingExam = useCallback((index: number, updatedExam: any) => {
 updateImagingExamBatchRef.current(index, updatedExam)
}, [])

const stableTrackModification = useCallback(() => {
 setHasUnsavedChanges(true)
}, [])

const stableRemoveMedication = useCallback((index: number) => {
 removeMedicament(index)
}, [removeMedicament])

const stableRemoveBiologyTest = useCallback((category: string, index: number) => {
 removeBiologyTest(category, index)
}, [removeBiologyTest])

const stableRemoveImagingExam = useCallback((index: number) => {
 removeImagingExam(index)
}, [removeImagingExam])

// ==================== OTHER UPDATE FUNCTIONS ====================
const updateInvoice = useCallback((field: string, value: any) => {
 if (validationStatus === 'validated') return
 
 setReport(prev => {
 if (!prev) return null
 
 return {
 ...prev,
 invoice: {
 ...prev.invoice!,
 [field]: value
 }
 }
 })
 trackModification(`invoice.${field}`)
}, [validationStatus, trackModification])

const updatePaymentStatus = useCallback((status: 'pending' | 'paid' | 'cancelled') => {
 if (!report?.invoice) return
 
 updateInvoice('payment', {
 ...report.invoice.payment,
 status: status
 })
}, [report?.invoice, updateInvoice])

const updatePaymentMethod = useCallback((method: string) => {
 if (!report?.invoice) return
 
 updateInvoice('payment', {
 ...report.invoice.payment,
 method: method
 })
}, [report?.invoice, updateInvoice])

const updateDoctorInfo = useCallback((field: string, value: string) => {
 const updatedInfo = { ...doctorInfo, [field]: value }
 
 setDoctorInfo(updatedInfo)
 trackModification(`praticien.${field}`)
 sessionStorage.setItem('currentDoctorInfo', JSON.stringify(updatedInfo))
 setHasUnsavedChanges(true)
 
 setReport(prev => {
 if (!prev) return prev
 return {
 ...prev,
 compteRendu: {
 ...prev.compteRendu,
 praticien: updatedInfo
 }
 }
 })
}, [doctorInfo, trackModification])

// ==================== AI ASSISTANT HANDLERS ====================
const handleUpdateSectionImmediate = useCallback((section: string, value: string) => {
 updateRapportSection(section, value)
}, [updateRapportSection])

const handleAIAddMedication = useCallback((medication: any) => {
 addMedicament()
 const lastIndex = report?.ordonnances?.medicaments?.prescription?.medicaments?.length || 0
 setTimeout(() => {
 updateMedicamentBatch(lastIndex, medication)
 }, 100)
}, [addMedicament, updateMedicamentBatch, report])

const handleAIAddLabTest = useCallback((category: string, test: any) => {
 addBiologyTest(category)
 const lastIndex = report?.ordonnances?.biologie?.prescription?.analyses?.[category]?.length || 0
 setTimeout(() => {
 updateBiologyTestBatch(category, lastIndex, test)
 }, 100)
}, [addBiologyTest, updateBiologyTestBatch, report])

const handleAIAddImaging = useCallback((exam: any) => {
 addImagingExam()
 const lastIndex = report?.ordonnances?.imagerie?.prescription?.examens?.length || 0
 setTimeout(() => {
 updateImagingExamBatch(lastIndex, exam)
 }, 100)
}, [addImagingExam, updateImagingExamBatch, report])

// ==================== MANUAL SAVE FUNCTION ====================
const handleManualSave = useCallback(async () => {
 const params = new URLSearchParams(window.location.search)
 const consultationId = params.get('consultationId')
 
 if (!consultationId || !report) {
 toast({
 title: "Cannot save",
 description: "Missing consultation ID or report data",
 variant: "destructive"
 })
 return
 }
 
 setSaveStatus('saving')
 
 try {
 const response = await fetch('/api/save-draft', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 consultationId,
 reportContent: report,
 doctorInfo,
 modifiedSections: Array.from(modifiedSections),
 validationStatus
 })
 })
 
 const result = await response.json()
 
 if (result.success) {
 setSaveStatus('saved')
 setHasUnsavedChanges(false)
 setModifiedSections(new Set())
 
 toast({
 title: "✅ Saved successfully",
 description: "Your changes have been saved",
 duration: 2000
 })
 
 setTimeout(() => setSaveStatus('idle'), 3000)
 } else {
 throw new Error(result.error || 'Failed to save')
 }
 } catch (error) {
 console.error('Save error:', error)
 setSaveStatus('idle')
 toast({
 title: "Save failed",
 description: error instanceof Error ? error.message : "Failed to save changes",
 variant: "destructive"
 })
 }
}, [report, doctorInfo, modifiedSections, validationStatus])
 
 // ==================== LOAD DOCTOR DATA ====================
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

 console.log('👨‍⚕️ Decoded doctor data:', decodedDoctorData.substring(0, 100) + '...')

 const tibokDoctorData = JSON.parse(decodedDoctorData)
 console.log(' Loading Tibok Doctor Data:', tibokDoctorData)
 
// In the useEffect that processes doctorDataParam
const doctorInfoFromTibok = {
 nom: tibokDoctorData.fullName || tibokDoctorData.full_name ? 
 `Dr. ${tibokDoctorData.fullName || tibokDoctorData.full_name}` : 
 'Dr. [Name Required]',
 qualifications: tibokDoctorData.qualifications || 'MBBS',
 specialite: tibokDoctorData.specialty || 'General Medicine',
 adresseCabinet: tibokDoctorData.clinic_address || tibokDoctorData.clinicAddress || '',
 email: tibokDoctorData.email || '[Email Required]',
 heuresConsultation: tibokDoctorData.consultation_hours || tibokDoctorData.consultationHours || '',
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
 signatureUrl: tibokDoctorData.signature_url || null, // ADD THIS
 digitalSignature: tibokDoctorData.digital_signature || null // ADD THIS
}

 console.log('✅ Doctor info prepared:', doctorInfoFromTibok)
 setDoctorInfo(doctorInfoFromTibok)
 sessionStorage.setItem('currentDoctorInfo', JSON.stringify(doctorInfoFromTibok))
 
 } catch (error) {
 console.error('Error parsing Tibok doctor data:', error)
 }
 }
 
 const storedDoctorInfo = sessionStorage.getItem('currentDoctorInfo')
 if (!doctorDataParam && storedDoctorInfo) {
 try {
 const doctorData = JSON.parse(storedDoctorInfo)
 setDoctorInfo(doctorData)
 console.log('✅ Doctor information loaded from session')
 } catch (error) {
 console.error('Error loading doctor data from storage:', error)
 }
 }
 }, [])

// ==================== LOAD DRAFT FROM DATABASE ====================
useEffect(() => {
 // Prevent multiple loads
 const params = new URLSearchParams(window.location.search)
 const consultationId = params.get('consultationId')
 
 if (!consultationId) {
 setIsLoadingFromDb(false)
 setDbCheckComplete(true)

 // Check if we have valid patient data to generate a new report
 const hasValidPatientData = patientData &&
 patientData.name !== 'Patient' &&
 patientData.name !== 'Non spécifié' &&
 patientData.name !== '1 janvier 1970' &&
 !patientData.name?.includes('1970')

 console.log('📋 No consultationId in URL, checking for valid patient data:', hasValidPatientData)
 setShouldGenerateReport(hasValidPatientData)
 return
 }
 
 const loadDraft = async () => {
 setIsLoadingFromDb(true)
 
 try {
 const response = await fetch(`/api/save-draft?consultationId=${consultationId}`)
 const result = await response.json()
 
 if (result.success && result.data) {
 console.log('📂 Loading draft from database')
 
 setReport(result.data.report_content)
 
 // Only update doctor info if it exists in the draft
 if (result.data.doctor_info) {
 setDoctorInfo(result.data.doctor_info)
 }
 
 setModifiedSections(new Set(result.data.modified_sections || []))
 setValidationStatus(result.data.validation_status || 'draft')
 
 toast({
 title: "Draft loaded",
 description: "Your previous edits have been restored",
 duration: 3000
 })
 
 setShouldGenerateReport(false)
 } else {
 console.log('No draft found, will generate new report if patient data is valid')
 
 const hasValidPatientData = patientData && 
 patientData.name !== 'Patient' &&
 patientData.name !== 'Non spécifié' &&
 patientData.name !== '1 janvier 1970' &&
 !patientData.name?.includes('1970')
 
 setShouldGenerateReport(hasValidPatientData)
 }
 } catch (error) {
 console.error('Error loading draft:', error)
 
 const hasValidPatientData = patientData && 
 patientData.name !== 'Patient' &&
 patientData.name !== 'Non spécifié' &&
 !patientData.name?.includes('1970')
 
 setShouldGenerateReport(hasValidPatientData)
 } finally {
 setIsLoadingFromDb(false)
 setDbCheckComplete(true)
 }
 }
 
 loadDraft()
}, [patientData]) // Remove doctorInfo from dependencies

 // ==================== INITIAL DATA LOAD ====================
 useEffect(() => {
 console.log("🚀 ProfessionalReportEditable mounted with data:", {
 hasPatientData: !!patientData,
 hasClinicalData: !!clinicalData,
 hasDiagnosisData: !!diagnosisData,
 hasQuestionsData: !!questionsData
 })
 }, [])

// ==================== GENERATE REPORT WHEN NEEDED ====================
useEffect(() => {
 // Only proceed if DB check is complete and we should generate
 if (!dbCheckComplete || !shouldGenerateReport) {
 return
 }
 
 // Don't generate if we already have a report OR if editing doctor info
 if (report || editingDoctor) { // ADD editingDoctor check here
 console.log(' Report already exists or editing doctor, skipping generation')
 return
 }
 
 // Validate we have real patient data
 const hasValidPatientData = patientData && 
 (patientData.name || (patientData.firstName && patientData.lastName)) &&
 patientData.name !== 'Patient' &&
 patientData.name !== 'Non spécifié' &&
 patientData.name !== '1 janvier 1970' &&
 !patientData.name?.includes('1970')
 
 if (!hasValidPatientData) {
 console.log('❌ No valid patient data, not generating report')
 setLoading(false)
 return
 }
 
 console.log('✅ Valid patient data found, generating report...')
 generateProfessionalReport()
 setShouldGenerateReport(false) // Reset flag after generation
 
}, [dbCheckComplete, shouldGenerateReport, report, patientData, editingDoctor]) // ADD editingDoctor to dependencies

// Helper function to parse medication text into structured format
const parseMedicationText = (medicationText: string): any[] => {
 if (!medicationText) return []
 
 // Safety check: ensure medicationText is actually a string
 if (typeof medicationText !== 'string') {
 console.warn('⚠️ parseMedicationText received non-string:', typeof medicationText, medicationText)
 // If it's an array, try to join it
 if (Array.isArray(medicationText)) {
 medicationText = medicationText.join('\n')
 } else {
 // Convert to string as last resort
 medicationText = String(medicationText || '')
 }
 }
 
 const lines = medicationText.split('\n').filter(line => line.trim())
 const medications = []
 
 for (const line of lines) {
 // Remove leading dashes, numbers, or bullet points
 const cleanLine = line.replace(/^[-•\d.)\s]+/, '').trim()
 if (!cleanLine) continue
 
 // Parse medication name and dosage
 const match = cleanLine.match(/^(.+?)\s+(\d+\s*mg|\d+mg)\s+(.+)$/)
 
 if (match) {
 const [_, name, dosage, frequency] = match
 
 // Convert frequency patterns to standard format
 let standardFrequency = frequency
 .replace(/1\/day|1 time per day/gi, '1 tablet OD')
 .replace(/2\/day|2 times per day/gi, '1 tablet BD')
 .replace(/3\/day|3 times per day/gi, '1 tablet TDS')
 .replace(/4\/day|4 times per day/gi, '1 tablet QDS')
 .replace(/7\/day/gi, '1 tablet OD') // Daily medication
 
 medications.push({
 nom: `${name} ${dosage}`,
 denominationCommune: name,
 dosage: dosage,
 forme: 'tablet',
 posologie: standardFrequency,
 modeAdministration: 'Oral route',
 dureeTraitement: '30 days', // Default for renewal
 quantite: '1 month supply',
 instructions: '',
 justification: 'Prescription renewal - Continuation of chronic treatment',
 surveillanceParticuliere: '',
 nonSubstituable: false,
 ligneComplete: cleanLine
 })
 } else {
 // Fallback for medications that don't match the pattern
 medications.push({
 nom: cleanLine,
 denominationCommune: cleanLine.split(' ')[0],
 dosage: '',
 forme: 'tablet',
 posologie: 'As prescribed',
 modeAdministration: 'Oral route',
 dureeTraitement: '30 days',
 quantite: '1 month supply',
 instructions: '',
 justification: 'Prescription renewal',
 surveillanceParticuliere: '',
 nonSubstituable: false,
 ligneComplete: cleanLine
 })
 }
 }
 
 return medications
}
 
// ==================== GENERATE REPORT ====================
 const generateProfessionalReport = async () => {
 // CHECK IF THIS IS A PRESCRIPTION RENEWAL - ADD THIS BLOCK
 const isRenewal = consultationDataService?.isPrescriptionRenewal?.() || 
 sessionStorage.getItem('prescriptionRenewal') === 'true' ||
 clinicalData?.chiefComplaint?.toLowerCase().includes('renewal') ||
 clinicalData?.chiefComplaint?.toLowerCase().includes('ordonnance') ||
 clinicalData?.chiefComplaint?.toLowerCase().includes('prescription') ||
 clinicalData?.chiefComplaint?.toLowerCase().includes('renouvellement')
 
if (isRenewal) {
 console.log('💊 Prescription renewal mode - generating simplified report')
 
 // Set medications tab as active
 setActiveTab("medicaments")
 
 // PRIORITY 1: Use validated medications from diagnosisData (already structured by AI)
 const validatedMeds = diagnosisData?.currentMedicationsValidated || []
 
 if (validatedMeds && validatedMeds.length > 0) {
 console.log('✅ Using AI-validated current medications for renewal:', validatedMeds)
 
 // Convert AI-validated medications to prescription format
 const structuredMedications = validatedMeds.map((med: any) => ({
 nom: med.name || med.medication_name || '',
 denominationCommune: med.generic_name || med.name || med.medication_name || '',
 dci: med.generic_name || med.name || med.medication_name || '',
 dosage: med.dosage || '',
 forme: med.form || 'tablet',
 posologie: med.frequency || med.posology || '',
 modeAdministration: med.route || 'Oral route',
 dureeTraitement: '30 days', // Default renewal duration
 quantite: '1 month supply',
 instructions: med.instructions || '',
 justification: 'Prescription renewal - Continuation of chronic treatment',
 surveillanceParticuliere: '',
 nonSubstituable: false,
 ligneComplete: `${med.name || med.medication_name} ${med.dosage || ''} ${med.frequency || ''}`
 }))
 
 sessionStorage.setItem('renewalMedications', JSON.stringify(structuredMedications))
 
 toast({
 title: "💊 Mode Renouvellement d'Ordonnance",
 description: `${structuredMedications.length} médicament(s) validé(s) par IA seront automatiquement ajoutés`,
 duration: 5000
 })
 } else {
 // FALLBACK: Parse from text if validated medications not available
 const currentMeds = patientData?.currentMedicationsText || 
 patientData?.currentMedications || 
 clinicalData?.currentMedications || ''
 
 if (currentMeds) {
 console.log('📋 Auto-parsing current medications text for renewal:', currentMeds)
 
 // Convert to string if it's an array
 const currentMedsText = Array.isArray(currentMeds) 
 ? currentMeds.join('\n') 
 : (typeof currentMeds === 'string' ? currentMeds : '')
 
 // Parse medications from text
 const parsedMedications = parseMedicationText(currentMedsText)
 
 if (parsedMedications.length > 0) {
 // Store parsed medications to be added to report
 sessionStorage.setItem('renewalMedications', JSON.stringify(parsedMedications))
 
 toast({
 title: "💊 Prescription Renewal Mode",
 description: `${parsedMedications.length} medication(s) detected and will be auto-filled`,
 duration: 5000
 })
 }
 } else {
 toast({
 title: "Mode Renouvellement d'Ordonnance",
 description: "Rapport simplifié généré. Veuillez ajouter les médicaments manuellement.",
 duration: 5000
 })
 }
 }
}

 // VALIDATE PATIENT DATA AT THE START
 const hasValidPatientData = patientData && 
 (patientData.name || (patientData.firstName && patientData.lastName)) &&
 patientData.name !== 'Patient' &&
 patientData.name !== 'Non spécifié' &&
 patientData.name !== '1 janvier 1970' &&
 !patientData.name?.includes('1970')
 
 if (!hasValidPatientData) {
 console.error('❌ Cannot generate report without valid patient data')
 toast({
 title: "Cannot Generate Report",
 description: "Valid patient data is required",
 variant: "destructive"
 })
 setLoading(false)
 return
 }
 
 setLoading(true)
 setError(null)
 setValidationStatus('draft')
 setDocumentSignatures({})
 setHasUnsavedChanges(false)

 try {
 let currentDoctorInfo = doctorInfo
 if (currentDoctorInfo.nom === 'Dr. [DOCTOR NAME]' || currentDoctorInfo.nom === 'Dr. [Name Required]') {
 const storedInfo = sessionStorage.getItem('currentDoctorInfo')
 if (storedInfo) {
 currentDoctorInfo = JSON.parse(storedInfo)
 setDoctorInfo(currentDoctorInfo)
 }
 }
 
 console.log("📤 Generating report with doctor info:", currentDoctorInfo)
 
 const validPatientData = patientData || {
 name: 'Patient',
 age: '',
 gender: '',
 dateOfBirth: '',
 address: '',
 phone: '',
 email: '',
 weight: ''
 }
 
 const doctorDataForAPI = {
 fullName: currentDoctorInfo.nom.replace('Dr. ', ''),
 qualifications: currentDoctorInfo.qualifications,
 specialty: currentDoctorInfo.specialite,
 clinicAddress: currentDoctorInfo.adresseCabinet,
 email: currentDoctorInfo.email,
 consultationHours: currentDoctorInfo.heuresConsultation,
 medicalCouncilNumber: currentDoctorInfo.numeroEnregistrement
 }
 
 // CLIENT DEBUG - Check diagnosisData before API call
 console.log('🔍 ========== PROFESSIONAL REPORT - BEFORE API CALL ==========')
 console.log(' 📦 diagnosisData:', diagnosisData)
 console.log(' 💊 currentMedicationsValidated:', diagnosisData?.currentMedicationsValidated)
 console.log(' 💊 Length:', diagnosisData?.currentMedicationsValidated?.length || 0)
 
 if (diagnosisData?.currentMedicationsValidated && diagnosisData.currentMedicationsValidated.length > 0) {
   console.log(' ✅ CURRENT MEDICATIONS PRESENT IN diagnosisData:')
   diagnosisData.currentMedicationsValidated.forEach((med: any, idx: number) => {
     console.log(`    ${idx + 1}. ${med.name || med.medication_name} - ${med.dosage} - ${med.frequency || med.posology}`)
   })
 } else {
   console.log(' ⚠️ WARNING: currentMedicationsValidated is EMPTY or UNDEFINED in diagnosisData!')
   console.log(' 📋 medications field:', diagnosisData?.medications)
   console.log(' 📋 combinedPrescription field:', diagnosisData?.combinedPrescription)
 }
 
 const response = await fetch("/api/generate-consultation-report", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 patientData: validPatientData,
 clinicalData: clinicalData || {},
 questionsData: questionsData || {},
 diagnosisData: diagnosisData || {},
 editedDocuments: editedDocuments || {},
 doctorData: doctorDataForAPI,
 includeFullPrescriptions,
 isPrescriptionRenewal: isRenewal,
 skipDetailedSections: isRenewal
 })
 })

 if (!response.ok) {
 const errorText = await response.text()
 console.error("API Error:", errorText)
 throw new Error(`HTTP Error ${response.status}: ${errorText}`)
 }

 const data = await response.json()
 console.log("📥 Report received:", data)
 
 // CLIENT DEBUG - Check API response
 console.log(' CLIENT DEBUG - API RESPONSE:')
 console.log(' ✅ Success:', data.success)
 console.log(' 💊 Prescriptions medications:', data.report?.prescriptions?.medications)
 console.log(' 📋 Medications array:', data.report?.prescriptions?.medications?.prescription?.medications)
 console.log(' Medications count:', data.report?.prescriptions?.medications?.prescription?.medications?.length || 0)

 if (data.success && data.report) {
 const apiReport = data.report
 
 console.log("🔄 Mapping API structure to component structure...")
 
 const reportData: MauritianReport = {
 compteRendu: {
 header: apiReport.medicalReport?.header || {
 title: "Medical Consultation Report",
 subtitle: "Professional Medical Documentation",
 reference: `REF-${Date.now()}`
 },
 praticien: currentDoctorInfo,
 patient: {
 nom: apiReport.medicalReport?.patient?.name || validPatientData.name || 'Patient',
 nomComplet: apiReport.medicalReport?.patient?.fullName || apiReport.medicalReport?.patient?.name || validPatientData.name || 'Patient',
 age: apiReport.medicalReport?.patient?.age || validPatientData.age || '',
 dateNaissance: apiReport.medicalReport?.patient?.birthDate || validPatientData.dateOfBirth || '',
 sexe: apiReport.medicalReport?.patient?.gender || validPatientData.gender || '',
 adresse: apiReport.medicalReport?.patient?.address || validPatientData.address || '',
 telephone: apiReport.medicalReport?.patient?.phone || validPatientData.phone || '',
 email: apiReport.medicalReport?.patient?.email || validPatientData.email || '',
 poids: apiReport.medicalReport?.patient?.weight || validPatientData.weight || '',
 taille: apiReport.medicalReport?.patient?.height || validPatientData.height || '',
 identifiantNational: apiReport.medicalReport?.patient?.nationalId || '',
 dateExamen: apiReport.medicalReport?.patient?.examinationDate || new Date().toISOString().split('T')[0],
 // Vital Signs from clinical data
 temperature: clinicalData?.vitalSigns?.temperature || '',
 bloodPressureSystolic: clinicalData?.vitalSigns?.bloodPressureSystolic || '',
 bloodPressureDiastolic: clinicalData?.vitalSigns?.bloodPressureDiastolic || '',
 bloodGlucose: clinicalData?.vitalSigns?.bloodGlucose || '',
 // Medical Profile
 allergies: (() => {
 const allergies = validPatientData?.allergies || []
 if (Array.isArray(allergies) && allergies.length > 0) {
 return allergies.join(', ')
 }
 return 'NKDA (No Known Drug Allergies)'
 })(),
 medicalHistory: (() => {
 const history = validPatientData?.medicalHistory || []
 if (Array.isArray(history) && history.length > 0) {
 return history.join(', ')
 }
 return 'No significant medical history'
 })(),
 currentMedications: (() => {
 const meds = diagnosisData?.currentMedicationsValidated || []
 if (Array.isArray(meds) && meds.length > 0) {
 return meds.map((med: any, idx: number) => {
 const name = med.name || med.medication_name || ''
 const dosage = med.dosage || ''
 // Avoid duplicate dosage if name already contains it
 const dosageStr = dosage && !name.toLowerCase().includes(dosage.toLowerCase()) ? ` - ${dosage}` : ''
 const frequencyStr = med.frequency ? ` - ${med.frequency}` : ''
 return `${idx + 1}. ${name}${dosageStr}${frequencyStr}`
 }).join('\n')
 }
 return validPatientData?.currentMedicationsText || 'No current medications'
 })(),
 // Gynecological Status
 pregnancyStatus: validPatientData?.pregnancyStatus || '',
 gestationalAge: validPatientData?.gestationalAge || '',
 lastMenstrualPeriod: validPatientData?.lastMenstrualPeriod || ''
 },
 rapport: {
 motifConsultation: apiReport.medicalReport?.report?.chiefComplaint || '',
 anamnese: apiReport.medicalReport?.report?.historyOfPresentIllness || '',
 antecedents: apiReport.medicalReport?.report?.pastMedicalHistory || '',
 examenClinique: apiReport.medicalReport?.report?.physicalExamination || '',
 syntheseDiagnostique: apiReport.medicalReport?.report?.diagnosticSynthesis || '',
 conclusionDiagnostique: apiReport.medicalReport?.report?.diagnosticConclusion || '',
 priseEnCharge: apiReport.medicalReport?.report?.managementPlan || '',
 surveillance: apiReport.medicalReport?.report?.followUpPlan || '',
 conclusion: apiReport.medicalReport?.report?.conclusion || ''
 },
 metadata: {
 dateGeneration: apiReport.medicalReport?.metadata?.generatedAt || new Date().toISOString(),
 wordCount: apiReport.medicalReport?.metadata?.wordCount || 0,
 validationStatus: 'draft' as const,
 complianceNote: apiReport.medicalReport?.metadata?.complianceNote || "This document complies with Medical Council of Mauritius guidelines"
 }
 },
 ordonnances: {
 medicaments: null as any,
 biologie: null as any,
 imagerie: null as any
 },
 invoice: null as any
 }
 
 // Map medications with sanitization
 if (apiReport.prescriptions?.medications) {
 reportData.ordonnances!.medicaments = {
 enTete: currentDoctorInfo,
 patient: reportData.compteRendu.patient,
 prescription: {
 datePrescription: apiReport.prescriptions.medications.prescription?.prescriptionDate || new Date().toISOString().split('T')[0],
 // APPLY SANITIZATION HERE - NOW INCLUDING medication_type
 medicaments: sanitizeMedications(
 apiReport.prescriptions.medications.prescription?.medications?.map((med: any) => ({
 nom: med.name || '',
 denominationCommune: med.genericName || med.name || '',
 dosage: med.dosage || '',
 forme: med.form || 'tablet',
 posologie: med.frequency || '',
 modeAdministration: med.route || 'Oral route',
 dureeTraitement: med.duration || '7 days',
 quantite: med.quantity || '1 box',
 instructions: med.instructions || '',
 justification: med.indication || '',
 surveillanceParticuliere: med.monitoring || '',
 nonSubstituable: med.doNotSubstitute || false,
 medication_type: med.medication_type || 'newly_prescribed',  // ⭐ CRITICAL FIELD
 validated_by_ai: med.validated_by_ai || false,
 original_input: med.original_input || '',
 ligneComplete: med.fullDescription || ''
 })) || []
 ),
 validite: apiReport.prescriptions.medications.prescription?.validity || "3 months unless otherwise specified",
 dispensationNote: apiReport.prescriptions.medications.prescription?.dispensationNote
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: currentDoctorInfo.nom.toUpperCase(),
 numeroEnregistrement: currentDoctorInfo.numeroEnregistrement,
 cachetProfessionnel: "Official Medical Stamp",
 date: apiReport.prescriptions.medications.prescription?.prescriptionDate || new Date().toISOString().split('T')[0]
 }
 }
 }
 
 // Map laboratory tests
 if (apiReport.prescriptions?.laboratoryTests) {
 const labData = apiReport.prescriptions.laboratoryTests
 
 reportData.ordonnances!.biologie = {
 enTete: currentDoctorInfo,
 patient: reportData.compteRendu.patient,
 prescription: {
 datePrescription: labData.prescription?.prescriptionDate || new Date().toISOString().split('T')[0],
 motifClinique: labData.prescription?.clinicalIndication || '',
 analyses: {
 hematology: (labData.prescription?.analyses?.hematology || []).map((test: any) => ({
 nom: test.name || '',
 categorie: test.category || 'hematology',
 urgence: test.urgent || false,
 aJeun: test.fasting || false,
 conditionsPrelevement: test.sampleConditions || '',
 motifClinique: test.clinicalIndication || '',
 renseignementsCliniques: test.clinicalInformation || '',
 tubePrelevement: test.sampleTube || 'As per laboratory protocol',
 delaiResultat: test.turnaroundTime || 'Standard'
 })),
 clinicalChemistry: (labData.prescription?.analyses?.clinicalChemistry || []).map((test: any) => ({
 nom: test.name || '',
 categorie: test.category || 'Clinical Chemistry',
 urgence: test.urgent || false,
 aJeun: test.fasting || false,
 conditionsPrelevement: test.sampleConditions || '',
 motifClinique: test.clinicalIndication || '',
 renseignementsCliniques: test.clinicalInformation || '',
 tubePrelevement: test.sampleTube || 'As per laboratory protocol',
 delaiResultat: test.turnaroundTime || 'Standard'
 })),
 immunology: (labData.prescription?.analyses?.immunology || []).map((test: any) => ({
 nom: test.name || '',
 categorie: test.category || 'Immunology',
 urgence: test.urgent || false,
 aJeun: test.fasting || false,
 conditionsPrelevement: test.sampleConditions || '',
 motifClinique: test.clinicalIndication || '',
 renseignementsCliniques: test.clinicalInformation || '',
 tubePrelevement: test.sampleTube || 'As per laboratory protocol',
 delaiResultat: test.turnaroundTime || 'Standard'
 })),
 microbiology: (labData.prescription?.analyses?.microbiology || []).map((test: any) => ({
 nom: test.name || '',
 categorie: test.category || 'Microbiology',
 urgence: test.urgent || false,
 aJeun: test.fasting || false,
 conditionsPrelevement: test.sampleConditions || '',
 motifClinique: test.clinicalIndication || '',
 renseignementsCliniques: test.clinicalInformation || '',
 tubePrelevement: test.sampleTube || 'As per laboratory protocol',
 delaiResultat: test.turnaroundTime || 'Standard'
 })),
 endocrinology: (labData.prescription?.analyses?.endocrinology || []).map((test: any) => ({
 nom: test.name || '',
 categorie: test.category || 'Endocrinology',
 urgence: test.urgent || false,
 aJeun: test.fasting || false,
 conditionsPrelevement: test.sampleConditions || '',
 motifClinique: test.clinicalIndication || '',
 renseignementsCliniques: test.clinicalInformation || '',
 tubePrelevement: test.sampleTube || 'As per laboratory protocol',
 delaiResultat: test.turnaroundTime || 'Standard'
 })),
 general: (labData.prescription?.analyses?.general || []).map((test: any) => ({
 nom: test.name || '',
 categorie: test.category || 'General Laboratory',
 urgence: test.urgent || false,
 aJeun: test.fasting || false,
 conditionsPrelevement: test.sampleConditions || '',
 motifClinique: test.clinicalIndication || '',
 renseignementsCliniques: test.clinicalInformation || '',
 tubePrelevement: test.sampleTube || 'As per laboratory protocol',
 delaiResultat: test.turnaroundTime || 'Standard'
 }))
 },
 instructionsSpeciales: labData.prescription?.specialInstructions || [],
 laboratoireRecommande: labData.prescription?.recommendedLaboratory || ''
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: currentDoctorInfo.nom.toUpperCase(),
 numeroEnregistrement: currentDoctorInfo.numeroEnregistrement,
 date: labData.prescription?.prescriptionDate || new Date().toISOString().split('T')[0]
 }
 }
 }
 
 // Map imaging studies
 if (apiReport.prescriptions?.imagingStudies) {
 const imagingData = apiReport.prescriptions.imagingStudies
 reportData.ordonnances!.imagerie = {
 enTete: currentDoctorInfo,
 patient: reportData.compteRendu.patient,
 prescription: {
 datePrescription: imagingData.prescription?.prescriptionDate || new Date().toISOString().split('T')[0],
 examens: imagingData.prescription?.studies?.map((study: any) => ({
 type: study.type || study.modality || '',
 modalite: study.modality || '',
 region: study.region || '',
 indicationClinique: study.clinicalIndication || '',
 urgence: study.urgent || false,
 contraste: study.contrast || false,
 protocoleSpecifique: study.specificProtocol || '',
 questionDiagnostique: study.diagnosticQuestion || ''
 })) || [],
 renseignementsCliniques: imagingData.prescription?.clinicalInformation || '',
 centreImagerie: imagingData.prescription?.imagingCenter || ''
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: currentDoctorInfo.nom.toUpperCase(),
 numeroEnregistrement: currentDoctorInfo.numeroEnregistrement,
 date: imagingData.prescription?.prescriptionDate || new Date().toISOString().split('T')[0]
 }
 }
 }
 
// Map invoice
 if (apiReport.invoice) {
 reportData.invoice = apiReport.invoice
 if (reportData.invoice.physician) {
 reportData.invoice.physician.name = currentDoctorInfo.nom
 reportData.invoice.physician.registrationNumber = currentDoctorInfo.numeroEnregistrement
 }
 }
 
 console.log("✅ Structure mapping complete")
 
 setReport(reportData)
 setValidationStatus('draft')
 setDocumentSignatures({})
 
 // Check for renewal medications to auto-fill
 const renewalMedications = sessionStorage.getItem('renewalMedications')
 if (isRenewal && renewalMedications) {
 const medsToAdd = JSON.parse(renewalMedications)
 console.log('💊 Auto-filling renewal medications:', medsToAdd)
 
 // Apply sanitization to the medications
 const sanitizedMeds = sanitizeMedications(medsToAdd)
 
 // Update the report with auto-filled medications
 setReport(prev => {
 if (!prev) return prev
 
 const updatedReport = { ...prev }
 
 if (!updatedReport.ordonnances) {
 updatedReport.ordonnances = {}
 }
 
 if (!updatedReport.ordonnances.medicaments) {
 updatedReport.ordonnances.medicaments = {
 enTete: currentDoctorInfo,
 patient: updatedReport.compteRendu.patient,
 prescription: {
 datePrescription: new Date().toISOString().split('T')[0],
 medicaments: sanitizedMeds,
 validite: "3 months unless otherwise specified"
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: currentDoctorInfo.nom.toUpperCase(),
 numeroEnregistrement: currentDoctorInfo.numeroEnregistrement,
 cachetProfessionnel: "Official Medical Stamp",
 date: new Date().toISOString().split('T')[0]
 }
 }
 } else {
 // Merge with existing medications
 updatedReport.ordonnances.medicaments.prescription.medicaments = [
 ...sanitizedMeds,
 ...(updatedReport.ordonnances.medicaments.prescription.medicaments || [])
 ]
 }
 
 return updatedReport
 })
 
 // Clear session storage
 sessionStorage.removeItem('renewalMedications')
 
 console.log('✅ Medications auto-filled for renewal')
 }
 
 const newReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
 setReportId(newReportId)
 
 console.log('✅ Report generated with ID:', newReportId)
 
 toast({
 title: "Report generated successfully",
 description: "Report is ready for editing and validation"
 })
 } else {
 throw new Error(data.error || "Generation error")
 }
 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : "Unknown error"
 console.error("Report generation error:", errorMessage)
 setError(errorMessage)
 
 toast({
 title: "Generation Error",
 description: errorMessage,
 variant: "destructive"
 })
 } finally {
 setLoading(false)
 }
 }
 
 // ==================== VALIDATION & SIGNATURE ====================
 const handleValidation = async () => {
 const requiredFieldsMissing = []
 if (doctorInfo.nom.includes('[')) requiredFieldsMissing.push('Doctor name')
 if (doctorInfo.numeroEnregistrement.includes('[')) requiredFieldsMissing.push('Registration number')
 if (doctorInfo.email.includes('[')) requiredFieldsMissing.push('Email')
 
 if (requiredFieldsMissing.length > 0) {
 toast({
 title: "Cannot Validate",
 description: `Please complete doctor profile. Missing: ${requiredFieldsMissing.join(', ')}`,
 variant: "destructive"
 })
 setEditingDoctor(true)
 return
 }
 
 if (!report) {
 toast({
 title: "Error",
 description: "No report to validate",
 variant: "destructive"
 })
 return
 }
 
 // Save any unsaved changes before validation
 if (hasUnsavedChanges) {
 await handleManualSave()
 }
 
 let currentReportId = reportId
 if (!currentReportId) {
 currentReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
 setReportId(currentReportId)
 }
 
setSaving(true)
try {
 let signatureDataUrl = null;
 
 // Try to use real signature first
 const realSignatureUrl = doctorInfo.signatureUrl || doctorInfo.digitalSignature;
 
 if (realSignatureUrl) {
 console.log('🖊️ Attempting to use real doctor signature...');
 
 // Process the URL to ensure it's complete
 const fullSignatureUrl = getFullSignatureUrl(realSignatureUrl);
 
 if (fullSignatureUrl) {
 // If it's a data URL (base64), use it directly
 if (fullSignatureUrl.startsWith('data:')) {
 signatureDataUrl = fullSignatureUrl;
 console.log('✅ Using stored digital signature (base64)');
 } 
 // If it's an HTTP URL, use it directly without trying to convert
 else if (fullSignatureUrl.startsWith('http')) {
 // Simply use the URL directly - no canvas conversion needed
 signatureDataUrl = fullSignatureUrl;
 console.log('✅ Using signature URL directly (no conversion):', signatureDataUrl);
 
 // Optional: Test if the image is accessible (without blocking)
 const img = new Image();
 img.onload = () => console.log('✅ Signature image verified as accessible');
 img.onerror = () => console.warn('⚠️ Signature image may not be accessible, but will try to use it anyway');
 img.src = fullSignatureUrl;
 }
 }
 }
 
 // If no real signature or it wasn't usable, generate one
 if (!signatureDataUrl) {
 console.log('📝 Generating fallback signature...');
 
 const signatureSeed = `${doctorInfo.nom}_${doctorInfo.numeroEnregistrement}_signature`;
 
 const canvas = document.createElement('canvas');
 canvas.width = 300;
 canvas.height = 80;
 const ctx = canvas.getContext('2d');
 
 if (ctx) {
 ctx.fillStyle = '#ffffff'
 ctx.fillRect(0, 0, 300, 80)
 
 const nameParts = doctorInfo.nom.replace('Dr. ', '').split(' ')
 const fullName = nameParts.join(' ')
 
 const nameHash = doctorInfo.nom.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
 const signatureStyle = nameHash % 3
 
 ctx.save()
 ctx.translate(50, 40)
 
 ctx.strokeStyle = '#1a1a2e'
 ctx.fillStyle = '#1a1a2e'
 ctx.lineWidth = 2.2
 ctx.lineCap = 'round'
 ctx.lineJoin = 'round'
 
 if (signatureStyle === 0) {
 ctx.font = 'italic 28px "Brush Script MT", "Lucida Handwriting", cursive'
 ctx.fillText(fullName, 0, 0)
 ctx.beginPath()
 ctx.moveTo(-5, 12)
 ctx.quadraticCurveTo(100, 16, 205, 10)
 ctx.lineWidth = 1.8
 ctx.stroke()
 } else if (signatureStyle === 1) {
 ctx.font = 'italic bold 32px "Brush Script MT", cursive'
 const firstLetter = nameParts[0]?.[0] || 'D'
 ctx.fillText(firstLetter, 0, 0)
 ctx.font = 'italic 26px "Lucida Handwriting", cursive'
 const restOfName = nameParts[0]?.substring(1) + ' ' + (nameParts[1] || '')
 ctx.fillText(restOfName, 28, 2)
 ctx.beginPath()
 ctx.moveTo(0, 14)
 ctx.bezierCurveTo(50, 16, 150, 14, 200, 12)
 ctx.lineWidth = 1.5
 ctx.stroke()
 } else {
 ctx.font = 'italic 30px "Segoe Script", "Brush Script MT", cursive'
 let xOffset = 0
 for (let i = 0; i < fullName.length; i++) {
 const char = fullName[i]
 const charWidth = ctx.measureText(char).width
 const yOffset = Math.sin(i * 0.5) * 2
 ctx.fillText(char, xOffset, yOffset)
 xOffset += charWidth * 0.85
 }
 ctx.beginPath()
 ctx.moveTo(0, 15)
 ctx.quadraticCurveTo(xOffset/2, 18, xOffset, 13)
 ctx.lineWidth = 1.6
 ctx.stroke()
 }
 
 ctx.font = '9px Arial'
 ctx.fillStyle = '#9ca3af'
 ctx.textAlign = 'left'
 const date = new Date().toLocaleDateString('en-GB', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric'
 })
 ctx.fillText(`Signed: ${date}`, 0, 35)
 ctx.restore()
 
 signatureDataUrl = canvas.toDataURL('image/png');
 }
 }
 
const signatures = {
 consultation: signatureDataUrl,
 prescription: signatureDataUrl,
 laboratory: signatureDataUrl,
 imaging: signatureDataUrl,
 sickLeave: signatureDataUrl,
 invoice: signatureDataUrl
}
 
 setDocumentSignatures(signatures)
 
 const updatedReport = {
 ...report,
 compteRendu: {
 ...report.compteRendu,
 praticien: doctorInfo,
 metadata: {
 ...getReportMetadata(),
 validatedAt: new Date().toISOString(),
 validatedBy: doctorInfo.nom,
 validationStatus: 'validated' as const,
 signatures: signatures,
 signatureDataUrl: signatureDataUrl
 }
 },
 ordonnances: report.ordonnances ? {
 ...report.ordonnances,
 medicaments: report.ordonnances.medicaments ? {
 ...report.ordonnances.medicaments,
 authentification: {
 ...report.ordonnances.medicaments.authentification,
 signatureImage: signatureDataUrl,
 signedAt: new Date().toISOString()
 }
 } : null,
 biologie: report.ordonnances.biologie ? {
 ...report.ordonnances.biologie,
 authentification: {
 ...report.ordonnances.biologie.authentification,
 signatureImage: signatureDataUrl,
 signedAt: new Date().toISOString()
 }
 } : null,
 imagerie: report.ordonnances.imagerie ? {
 ...report.ordonnances.imagerie,
 authentification: {
 ...report.ordonnances.imagerie.authentification,
 signatureImage: signatureDataUrl,
 signedAt: new Date().toISOString()
 }
 } : null
 } : report.ordonnances,
 invoice: report.invoice ? {
 ...report.invoice,
 signature: {
 ...report.invoice.signature,
 signatureImage: signatureDataUrl,
 signedAt: new Date().toISOString()
 }
 } : report.invoice
 }
 
 setReport(updatedReport)
 setValidationStatus('validated')
 setModifiedSections(new Set())
 setHasUnsavedChanges(false)
 
 toast({
 title: "✅ Document Validated",
 description: "All documents have been validated and digitally signed. Click 'Send documents' to finalize."
 })
 
} catch (error) {
 console.error('Validation error:', error)
 toast({
 title: "Validation Error",
 description: error instanceof Error ? error.message : "Failed to validate document",
 variant: "destructive"
 })
} finally {
 setSaving(false)
}
 }

// ==================== SEND DOCUMENTS ====================
const handleSendDocuments = async () => {
 console.log('📤 Starting handleSendDocuments...')
 setIsSendingDocuments(true)
 
 // Check if report is validated
 if (!report || validationStatus !== 'validated') {
 console.log('❌ Report not validated', { hasReport: !!report, validationStatus })
 toast({
 title: "Cannot send documents",
 description: "Please validate the documents first",
 variant: "destructive"
 })
 return
 }
 
 // Get patient data with safe access
 const patient = getReportPatient()
 let patientName = patient?.nomComplet || patient?.nom || ''
 
 console.log('📋 Patient data:', {
 name: patientName,
 email: patient?.email,
 phone: patient?.telephone,
 address: patient?.adresse
 })
 
 // More lenient patient name validation - just ensure we have something
 if (!patientName || patientName.trim() === '') {
 // Try to get from patientData as fallback
 patientName = patientData?.name || patientData?.firstName + ' ' + patientData?.lastName || 'Patient'
 console.log('⚠️ Using fallback patient name:', patientName)
 }
 
 // Remove strict validation that blocks test data
 // Just ensure the name isn't completely empty or placeholder
 if (patientName === '[Name Required]' || patientName === '') {
 patientName = 'Patient' // Use generic fallback
 }
 
 // Email validation with fallback
 let patientEmail = patient?.email || ''
 if (!patientEmail || patientEmail === '' || !patientEmail.includes('@')) {
 // Try to get from patientData
 patientEmail = patientData?.email || ''
 
 if (!patientEmail || !patientEmail.includes('@')) {
 // Use a placeholder email if absolutely necessary
 patientEmail = `patient_${Date.now()}@tibok.mu`
 console.log('⚠️ Using fallback email:', patientEmail)
 }
 }
 
 // Phone validation with fallback
 let patientPhone = patient?.telephone || ''
 if (!patientPhone || patientPhone === '') {
 // Try to get from patientData
 patientPhone = patientData?.phone || patientData?.phoneNumber || ''
 
 if (!patientPhone) {
 // Use a placeholder phone
 patientPhone = '+230 0000 0000'
 console.log('⚠️ Using fallback phone:', patientPhone)
 }
 }
 
 // Address validation with fallback
 let patientAddress = patient?.adresse || ''
 if (!patientAddress || patientAddress === '' || patientAddress.includes('[')) {
 // Try to get from patientData
 patientAddress = patientData?.address || patientData?.deliveryAddress || 'Mauritius'
 console.log('⚠️ Using fallback address:', patientAddress)
 }
 
 // Doctor validation - more lenient
 if (!doctorInfo?.nom || doctorInfo.nom === 'Dr. [Name Required]') {
 console.log('❌ Invalid doctor name')
 toast({
 title: "❌ Incomplete Doctor Information",
 description: "Please complete doctor profile before sending",
 variant: "destructive"
 })
 setEditingDoctor(true)
 return
 }
 
 // Check for MCM registration with fallback
 let mcmNumber = doctorInfo?.numeroEnregistrement || ''
 if (mcmNumber.includes('[') || mcmNumber === '[MCM Registration Required]') {
 // Try to use any available number
 mcmNumber = doctorInfo?.medicalCouncilNumber || doctorInfo?.mcm_reg_no || 'PENDING'
 console.log('⚠️ Using fallback MCM number:', mcmNumber)
 }
 
 // Check medical content exists - more lenient
 const rapport = getReportRapport()
 if (!rapport?.motifConsultation || rapport.motifConsultation.trim().length < 3) {
 console.log('❌ Missing chief complaint')
 toast({
 title: "❌ Incomplete Medical Report",
 description: "Please add a chief complaint to the report",
 variant: "destructive"
 })
 setActiveTab('consultation')
 return
 }
 
 if (!rapport?.conclusionDiagnostique || rapport.conclusionDiagnostique.trim().length < 3) {
 console.log('❌ Missing diagnosis')
 toast({
 title: "❌ Missing Diagnosis",
 description: "Please add a diagnostic conclusion",
 variant: "destructive"
 })
 setActiveTab('consultation')
 return
 }
 
 // Now proceed with sending
 try {
 console.log('✅ All validations passed, proceeding to send...')
 
 toast({
 title: "📤 Sending documents...",
 description: "Preparing documents for patient dashboard"
 })
 
 // Get IDs from multiple sources with priority: props > consultationDataService > sessionStorage > URL params
 const params = new URLSearchParams(window.location.search)

 // Get consultationId: props > consultationDataService > sessionStorage > URL
 let consultationId = propConsultationId || consultationDataService.getCurrentConsultationId()
 if (!consultationId) {
   const storedData = sessionStorage.getItem('consultationPatientData')
   if (storedData) {
     try {
       const parsed = JSON.parse(storedData)
       consultationId = parsed.consultationId
     } catch (e) { /* ignore */ }
   }
 }
 if (!consultationId) {
   consultationId = params.get('consultationId')
 }

 // Get patientId: props > patientData > sessionStorage > URL
 let patientId = propPatientId || patientData?.id || patientData?.patientId
 if (!patientId) {
   const storedData = sessionStorage.getItem('consultationPatientData')
   if (storedData) {
     try {
       const parsed = JSON.parse(storedData)
       patientId = parsed.patientId
     } catch (e) { /* ignore */ }
   }
 }
 if (!patientId) {
   patientId = params.get('patientId')
 }

 // Get doctorId: props > sessionStorage > URL
 let doctorId = propDoctorId
 if (!doctorId) {
   const storedData = sessionStorage.getItem('consultationPatientData')
   if (storedData) {
     try {
       const parsed = JSON.parse(storedData)
       doctorId = parsed.doctorId
     } catch (e) { /* ignore */ }
   }
 }
 if (!doctorId) {
   doctorId = params.get('doctorId')
 }

 console.log('📍 IDs found:', { consultationId, patientId, doctorId, sources: { props: { propConsultationId, propPatientId, propDoctorId }, service: consultationDataService.getCurrentConsultationId() } })

 if (!consultationId || !patientId || !doctorId) {
 console.log('❌ Missing required IDs')
 toast({
 title: "Error",
 description: `Missing IDs - Consultation: ${consultationId}, Patient: ${patientId}, Doctor: ${doctorId}`,
 variant: "destructive"
 })
 return
 }

 // Prepare doctor info with fallbacks
 const finalDoctorInfo = {
 ...doctorInfo,
 numeroEnregistrement: mcmNumber,
 email: doctorInfo.email.includes('[') ? 'doctor@tibok.mu' : doctorInfo.email
 }

 console.log('📝 Saving to database...')
 
 // Save final version to consultation_records table
 const saveResponse = await fetch('/api/save-medical-report', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 consultationId,
 patientId,
 doctorId,
 doctorName: finalDoctorInfo.nom,
 patientName: patientName,
 report: report,
 action: 'finalize',
 metadata: {
 wordCount: getReportMetadata().wordCount,
 signatures: documentSignatures,
 validationStatus: 'validated',
 finalizedAt: new Date().toISOString(),
 documentValidations: {
 consultation: true,
 prescription: !!report?.ordonnances?.medicaments,
 laboratory: !!report?.ordonnances?.biologie,
 imaging: !!report?.ordonnances?.imagerie,
 invoice: !!report?.invoice
 }
 },
 patientData: {
 ...patientData,
 name: patientName,
 email: patientEmail,
 phone: patientPhone,
 address: patientAddress
 },
 clinicalData: clinicalData || {},
 diagnosisData: diagnosisData || {}
 })
 })

 const saveResult = await saveResponse.json()
 console.log('💾 Save response:', { status: saveResponse.status, result: saveResult })

 if (!saveResponse.ok) {
 console.log('❌ Save failed:', saveResult)
 
 if (saveResult.validationError) {
 toast({
 title: "❌ Validation Failed",
 description: saveResult.error || "Document validation failed",
 variant: "destructive"
 })
 } else {
 toast({
 title: "❌ Save Failed",
 description: saveResult.error || 'Failed to save report',
 variant: "destructive"
 })
 }
 return
 }

 console.log('✅ Report saved successfully')

 // Update draft as finalized
 console.log('📝 Marking draft as finalized...')
 
 await fetch('/api/save-draft', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 consultationId,
 reportContent: {
 ...report,
 compteRendu: {
 ...report.compteRendu,
 metadata: {
 ...report.compteRendu.metadata,
 finalized: true,
 finalizedAt: new Date().toISOString()
 }
 }
 },
 doctorInfo: finalDoctorInfo,
 modifiedSections: []
 })
 })

 // Get Tibok URL
 const getTibokUrl = () => {
 const urlParam = params.get('tibokUrl')
 if (urlParam) {
 console.log('📍 Using Tibok URL from parameter:', decodeURIComponent(urlParam))
 return decodeURIComponent(urlParam)
 }

 if (document.referrer) {
 try {
 const referrerUrl = new URL(document.referrer)
 const knownTibokDomains = ['tibok.mu', 'v0-tibokmain2.vercel.app', 'localhost']
 if (knownTibokDomains.some(domain => referrerUrl.hostname.includes(domain))) {
 console.log('📍 Using Tibok URL from referrer:', referrerUrl.origin)
 return referrerUrl.origin
 }
 } catch (e) {
 console.log('Could not parse referrer')
 }
 }

 console.log('📍 Using default Tibok URL: https://tibok.mu')
 return 'https://tibok.mu'
 }

 const tibokUrl = getTibokUrl()

 // Prepare documents payload
 console.log('📦 Preparing documents payload...')
 
 const documentsPayload = {
 consultationId,
 patientId,
 doctorId,
 doctorName: finalDoctorInfo.nom,
 patientName: patientName,
 patientEmail: patientEmail,
 patientPhone: patientPhone,
 generatedAt: new Date().toISOString(),
 documents: {
 consultationReport: report?.compteRendu ? {
 type: 'consultation_report',
 title: 'Medical Consultation Report',
 content: report.compteRendu,
 validated: true,
 validatedAt: report.compteRendu.metadata?.validatedAt || new Date().toISOString(),
 signature: documentSignatures?.consultation || null
 } : null,
 prescriptions: report?.ordonnances?.medicaments ? {
 type: 'prescription',
 title: 'Medical Prescription',
 medications: report.ordonnances.medicaments.prescription?.medicaments || [],
 validity: report.ordonnances.medicaments.prescription?.validite || '3 months',
 signature: documentSignatures?.prescription || null,
 content: report.ordonnances.medicaments
 } : null,
 laboratoryRequests: report?.ordonnances?.biologie ? {
 type: 'laboratory_request',
 title: 'Laboratory Request Form',
 tests: report.ordonnances.biologie.prescription?.analyses || {},
 signature: documentSignatures?.laboratory || null,
 content: report.ordonnances.biologie
 } : null,
imagingRequests: report?.ordonnances?.imagerie ? {
 type: 'imaging_request',
 title: 'Radiology Request Form',
 examinations: report.ordonnances.imagerie.prescription?.examens || [],
 signature: documentSignatures?.imaging || null,
 content: report.ordonnances.imagerie
 } : null,
sickLeaveCertificate: report?.ordonnances?.arretMaladie ? {
 type: 'sick_leave',
 title: 'Sick Leave Certificate',
 certificate: {
 dateDebut: report.ordonnances.arretMaladie.certificat?.dateDebut || '',
 dateFin: report.ordonnances.arretMaladie.certificat?.dateFin || '',
 nombreJours: report.ordonnances.arretMaladie.certificat?.nombreJours || 0,
 motifMedical: report.ordonnances.arretMaladie.certificat?.motifMedical || 
 report?.compteRendu?.rapport?.conclusionDiagnostique || 
 'Medical condition requiring rest',
 remarques: report.ordonnances.arretMaladie.certificat?.remarques || '',
 restrictionsTravail: report.ordonnances.arretMaladie.certificat?.restrictionsTravail || '',
 repriseAutorisee: report.ordonnances.arretMaladie.certificat?.repriseAutorisee || ''
 },
 signature: documentSignatures?.sickLeave || null,
 content: report.ordonnances.arretMaladie
} : null,
 invoice: report?.invoice ? {
 type: 'invoice',
 title: `Invoice ${report.invoice.header?.invoiceNumber || 'N/A'}`,
 content: report.invoice,
 signature: documentSignatures?.invoice || null
 } : null
 }
 }

 console.log('📨 Sending to Tibok at:', tibokUrl)
 console.log('📦 Payload size:', JSON.stringify(documentsPayload).length, 'bytes')

 const response = await fetch(`${tibokUrl}/api/send-to-patient-dashboard`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(documentsPayload)
 })

 console.log('📨 Tibok response status:', response.status)

 let responseText = ''
 try {
 responseText = await response.text()
 console.log('📨 Raw response:', responseText.substring(0, 200))
 } catch (e) {
 console.error('Failed to read response text:', e)
 }

 let result
 if (responseText) {
 try {
 result = JSON.parse(responseText)
 console.log('✅ Parsed response:', result)
 } catch (e) {
 console.error('Failed to parse response as JSON:', responseText)
 
 // If it's not JSON, check if it's an HTML error page
 if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
 throw new Error('Received HTML instead of JSON - API endpoint might not exist')
 } else {
 throw new Error(`Invalid response: ${responseText.substring(0, 100)}`)
 }
 }
 }

 if (!response.ok) {
 console.error('❌ Tibok API error:', result || responseText)
 throw new Error(result?.error || `Failed to send documents: ${response.status}`)
 }

 if (result?.success) {
 console.log('🎉 Documents sent successfully!')
 setIsSendingDocuments(false)
 
 toast({
 title: "✅ Documents envoyés avec succès",
 description: "Les documents sont maintenant disponibles dans le tableau de bord du patient"
 })

 // Show success modal
 showSuccessModal()
 
 } else {
 throw new Error(result?.error || "Failed to send documents - no success flag")
 }
 
 } catch (error) {
 console.error("❌ Error in handleSendDocuments:", error)
 setIsSendingDocuments(false)
 toast({
 title: "Error sending documents",
 description: error instanceof Error ? error.message : "An error occurred while sending documents",
 variant: "destructive"
 })
 }
}
 const showSuccessModal = () => {
 const modalContainer = document.createElement('div')
 modalContainer.id = 'success-modal'
 modalContainer.style.cssText = `
 position: fixed;
 inset: 0;
 background: rgba(0, 0, 0, 0.5);
 display: flex;
 align-items: center;
 justify-content: center;
 z-index: 9999;
 animation: fadeIn 0.3s ease-out;
 `

 const modalContent = document.createElement('div')
 modalContent.style.cssText = `
 background: white;
 padding: 2rem;
 border-radius: 1rem;
 max-width: 500px;
 margin: 1rem;
 box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
 animation: slideUp 0.3s ease-out;
 position: relative;
 `

 modalContent.innerHTML = `
 <button id="close-x-btn" style="
 position: absolute;
 top: 1rem;
 right: 1rem;
 width: 32px;
 height: 32px;
 border-radius: 50%;
 border: none;
 background: #f3f4f6;
 cursor: pointer;
 display: flex;
 align-items: center;
 justify-content: center;
 transition: all 0.2s;
 " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
 <svg width="20" height="20" fill="#6b7280" viewBox="0 0 20 20">
 <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
 </svg>
 </button>
 
 <div style="text-align: center;">
 <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; animation: scaleIn 0.5s ease-out;">
 <svg width="40" height="40" fill="white" viewBox="0 0 20 20">
 <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
 </svg>
 </div>
 
 <h2 style="font-size: 1.5rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem;">
 Documents envoyés avec succès!
 </h2>
 
 <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.5;">
 Les documents médicaux ont été transmis au tableau de bord du patient.<br>
 Le patient recevra une notification pour valider son ordonnance.
 </p>
 
 <div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid #e5e7eb;">
 <p style="font-size: 0.875rem; color: #4b5563; margin: 0 0 0.5rem 0;">
 <strong>Prochaines étapes:</strong>
 </p>
 <ul style="text-align: left; font-size: 0.875rem; color: #6b7280; margin: 0; padding-left: 1.5rem;">
 <li>Le patient validera son ordonnance</li>
 <li>La pharmacie préparera les médicaments</li>
 <li>Livraison selon l'option choisie par le patient</li>
 </ul>
 </div>
 
 <div style="background: #d1fae5; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid #a7f3d0;">
 <p style="font-size: 0.875rem; color: #065f46; margin: 0; font-weight: 500;">
 ✅ Tous les documents ont été envoyés avec succès
 </p>
 <p style="font-size: 0.75rem; color: #047857; margin: 0.25rem 0 0 0;">
 Consultation ID: ${reportId}
 </p>
 </div>
 
 <button id="close-tab-btn" style="
 width: 100%;
 padding: 0.75rem 1.5rem;
 background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
 color: white;
 border: none;
 border-radius: 0.5rem;
 font-weight: 600;
 font-size: 1rem;
 cursor: pointer;
 transition: all 0.2s;
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 0.5rem;
 " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
 <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
 <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
 </svg>
 Cliquez ici pour fermer cet onglet si vous avez terminé
 </button>
 
 <div style="margin-top: 1rem;">
 <p style="font-size: 0.75rem; color: #9ca3af; margin: 0;">
 Vous pouvez également garder cet onglet ouvert pour traiter d'autres consultations
 </p>
 </div>
 </div>
 `

 modalContainer.appendChild(modalContent)
 document.body.appendChild(modalContainer)

 const style = document.createElement('style')
 style.textContent = `
 @keyframes fadeIn {
 from { opacity: 0; }
 to { opacity: 1; }
 }
 @keyframes slideUp {
 from {
 transform: translateY(20px);
 opacity: 0;
 }
 to {
 transform: translateY(0);
 opacity: 1;
 }
 }
 @keyframes scaleIn {
 from { transform: scale(0); }
 to { transform: scale(1); }
 }
 @keyframes fadeOut {
 from { opacity: 1; }
 to { opacity: 0; }
 }
 `
 document.head.appendChild(style)

 const closeTab = () => {
 sessionStorage.removeItem('currentDoctorInfo')
 
 if (window.opener) {
 window.close()
 } else {
 window.close()
 
 setTimeout(() => {
 const modal = document.getElementById('success-modal')
 if (modal) {
 modal.innerHTML = `
 <div style="background: white; padding: 2rem; border-radius: 1rem; max-width: 400px; margin: auto;">
 <div style="text-align: center;">
 <div style="width: 60px; height: 60px; background: #fbbf24; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
 <svg width="30" height="30" fill="white" viewBox="0 0 20 20">
 <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
 </svg>
 </div>
 <h3 style="font-size: 1.25rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem;">
 Impossible de fermer automatiquement
 </h3>
 <p style="color: #6b7280; margin-bottom: 1rem;">
 Votre navigateur empêche la fermeture automatique des onglets.
 </p>
 <p style="color: #4b5563; font-weight: 500;">
 Veuillez fermer manuellement cet onglet.
 </p>
 <button onclick="document.getElementById('success-modal').remove()" style="
 margin-top: 1rem;
 padding: 0.5rem 1rem;
 background: #3b82f6;
 color: white;
 border: none;
 border-radius: 0.5rem;
 cursor: pointer;
 ">
 OK, Compris
 </button>
 </div>
 </div>
 `
 }
 }, 100)
 }
 }

 const closeModal = () => {
 const modal = document.getElementById('success-modal')
 if (modal) {
 modal.style.animation = 'fadeOut 0.3s ease-out'
 setTimeout(() => {
 modal.remove()
 }, 300)
 }
 }

 document.getElementById('close-x-btn')?.addEventListener('click', closeModal)
 document.getElementById('close-tab-btn')?.addEventListener('click', closeTab)

 modalContainer.addEventListener('click', (e) => {
 if (e.target === modalContainer) {
 closeModal()
 }
 })
 }

 // ==================== PDF EXPORT ====================
 const exportSectionToPDF = (sectionId: string, filename: string) => {
 const element = document.getElementById(sectionId)
 if (!element) return

 const clonedElement = element.cloneNode(true) as HTMLElement
 
 const noExportElements = clonedElement.querySelectorAll('.print\\:hidden, .no-print')
 noExportElements.forEach(el => el.remove())

 const printWindow = window.open('', '_blank')
 if (!printWindow) return

 const getDocumentStyles = () => {
 const baseStyles = `
 @page { 
 margin: 15mm; 
 size: A4 portrait;
 }
 * {
 margin: 0;
 padding: 0;
 box-sizing: border-box;
 }
 body { 
 font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
 line-height: 1.6;
 color: #333;
 font-size: 12pt;
 padding: 0;
 margin: 0;
 }
 h1 { font-size: 20pt; margin-bottom: 10pt; color: #2c3e50; }
 h2 { font-size: 16pt; margin-bottom: 8pt; color: #2c3e50; margin-top: 15pt; }
 h3 { font-size: 14pt; margin-bottom: 6pt; color: #34495e; }
 p { margin-bottom: 8pt; text-align: justify; }
 
 .header { 
 text-align: center; 
 margin-bottom: 20pt;
 border-bottom: 2pt solid #3498db;
 padding-bottom: 15pt;
 }
 
 .section { 
 margin-bottom: 15pt;
 page-break-inside: avoid;
 }
 
 .info-box {
 background: #f8f9fa;
 padding: 10pt;
 border-radius: 4pt;
 margin-bottom: 15pt;
 border: 1pt solid #e9ecef;
 }
 
 .prescription-item { 
 border-left: 3pt solid #3498db; 
 padding-left: 10pt; 
 margin: 10pt 0;
 page-break-inside: avoid;
 }
 
 .signature {
 margin-top: 40pt;
 text-align: right;
 page-break-inside: avoid;
 }
 
 .signature img {
 max-width: 300px;
 height: auto;
 margin-top: 10pt;
 }
 
 .urgent-highlight {
 color: #dc2626 !important;
 font-weight: bold !important;
 background-color: #fee2e2;
 padding: 2px 4px;
 border-radius: 2px;
 }
 
 button, .button, input, select, textarea { display: none !important; }
 
 @media print {
 body { margin: 0; }
 .urgent-highlight {
 color: #dc2626 !important;
 font-weight: bold !important;
 text-decoration: underline;
 }
 }
 `
 
 return baseStyles
 }

 const cleanHTML = clonedElement.innerHTML
 .replace(/class="[^"]*"/g, (match) => {
 const importantClasses = ['header', 'section', 'prescription-item', 'signature', 'info-box', 'urgent', 'badge', 'badge-red']
 const classes = match.match(/class="([^"]*)"/)?.[1].split(' ') || []
 const filtered = classes.filter(c => importantClasses.some(ic => c.includes(ic)))
 return filtered.length > 0 ? `class="${filtered.join(' ')}"` : ''
 })
 .replace(/<button[^>]*>.*?<\/button>/gi, '')
 .replace(/<svg[^>]*>.*?<\/svg>/gi, '')
 .replace(/<!--.*?-->/gs, '')

 const content = `
 <!DOCTYPE html>
 <html lang="en">
 <head>
 <meta charset="UTF-8">
 <title>${filename}</title>
 <style>
 ${getDocumentStyles()}
 </style>
 </head>
 <body>
 ${cleanHTML}
 </body>
 </html>
 `

 printWindow.document.write(content)
 printWindow.document.close()
 
 printWindow.onload = () => {
 setTimeout(() => {
 printWindow.print()
 }, 500)
 }
 }

 const handlePrint = () => window.print()
 // ==================== RENDER STATES ====================
 // Loading from database
 if (isLoadingFromDb) {
 return (
 <Card className="w-full">
 <CardContent className="flex items-center justify-center py-20">
 <div className="text-center space-y-4">
 <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
 <p className="text-lg font-semibold">Checking for existing reports...</p>
 <p className="text-sm text-gray-600">Please wait while we load your data</p>
 </div>
 </CardContent>
 </Card>
 )
 }

 if (loading) {
 return (
 <Card className="w-full">
 <CardContent className="flex items-center justify-center py-20">
 <div className="text-center space-y-4">
 <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
 <p className="text-lg font-semibold">Generating professional medical report...</p>
 <p className="text-sm text-gray-600">Format compliant with Medical Council of Mauritius regulations</p>
 </div>
 </CardContent>
 </Card>
 )
 }

 // Show appropriate message when no data is available
 if (!loading && !isLoadingFromDb && !report && dbCheckComplete) {
 const hasValidPatientData = patientData && 
 (patientData.name || (patientData.firstName && patientData.lastName)) &&
 patientData.name !== 'Patient' &&
 patientData.name !== 'Non spécifié' &&
 patientData.name !== '1 janvier 1970' &&
 !patientData.name?.includes('1970')
 
 if (!hasValidPatientData) {
 return (
 <Card className="w-full">
 <CardContent className="p-6">
 <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-center mb-4">No Patient Data Available</h3>
 <p className="text-center text-gray-600 mb-4">
 Valid patient information is required to generate the medical report.
 </p>
 <p className="text-center text-gray-500 text-sm">
 Please ensure patient data is properly loaded before attempting to generate a report.
 </p>
 </CardContent>
 </Card>
 )
 }
 }

 if (error && !report) {
 return (
 <Card className="border-blue-200 w-full">
 <CardContent className="text-center py-10">
 <XCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
 <p className="text-blue-600 font-semibold mb-2">Error during generation</p>
 <p className="text-gray-600 text-sm mb-4">{error}</p>
 <Button onClick={generateProfessionalReport} variant="outline">
 Try again
 </Button>
 </CardContent>
 </Card>
 )
 }

 if (!report) {
 return (
 <Card className="w-full">
 <CardContent className="flex items-center justify-center py-20">
 <div className="text-center space-y-4">
 <AlertCircle className="h-12 w-12 text-blue-500 mx-auto" />
 <p className="text-lg font-semibold">No report data available</p>
 <p className="text-sm text-gray-500">Waiting for valid data...</p>
 </div>
 </CardContent>
 </Card>
 )
 }
 // ==================== DOCTOR INFO EDITOR ====================
 const DoctorInfoEditor = memo(() => {
 const hasRequiredFields = doctorInfo.nom !== 'Dr. [Name Required]' && 
 !doctorInfo.numeroEnregistrement.includes('[') &&
 !doctorInfo.email.includes('[')
 
 const [localDoctorInfo, setLocalDoctorInfo] = useState(doctorInfo)
 const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
 
 useEffect(() => {
 const timer = setTimeout(() => {
 if (editingDoctor && JSON.stringify(localDoctorInfo) !== JSON.stringify(doctorInfo)) {
 Object.keys(localDoctorInfo).forEach(key => {
 if (localDoctorInfo[key as keyof typeof localDoctorInfo] !== doctorInfo[key as keyof typeof doctorInfo]) {
 updateDoctorInfo(key, localDoctorInfo[key as keyof typeof localDoctorInfo])
 }
 })
 }
 }, 3000) // 3 seconds
 
 return () => clearTimeout(timer)
 }, [localDoctorInfo, editingDoctor])
 
const handleDoctorFieldChange = useCallback((field: string, value: string) => {
 setLocalDoctorInfo(prev => ({ ...prev, [field]: value }))
 setHasUnsavedChanges(true)
 }, [])
 
 return (
 <Card className="mb-6 print:hidden">
 <CardHeader>
 <CardTitle className="flex items-center justify-between">
 <span className="flex items-center">
 <Stethoscope className="h-5 w-5 mr-2" />
 Doctor Information
 {!hasRequiredFields && (
 <Badge variant="destructive" className="ml-2">
 Incomplete Profile
 </Badge>
 )}
 {/* ADD THIS BADGE FOR PRESCRIPTION RENEWAL */}
 {(sessionStorage.getItem('prescriptionRenewal') === 'true' || 
 clinicalData?.chiefComplaint?.toLowerCase().includes('renewal') ||
 clinicalData?.chiefComplaint?.toLowerCase().includes('renouvellement') ||
 clinicalData?.chiefComplaint?.toLowerCase().includes('ordonnance')) && (
 <Badge className="ml-2 bg-blue-100 text-blue-800">
 Prescription Renewal
 </Badge>
 )}
 </span>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setEditingDoctor(!editingDoctor)}
 >
 {editingDoctor ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
 {editingDoctor ? 'Done' : 'Complete Profile'}
 </Button>
 </CardTitle>
 </CardHeader>
 <CardContent>
 {!hasRequiredFields && !editingDoctor && (
 <Alert className="mb-4">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>
 Doctor profile is incomplete. Please click "Complete Profile" to add required information.
 </AlertDescription>
 </Alert>
 )}
 
 {editingDoctor ? (
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>Full name *</Label>
 <Input
 ref={(el) => { inputRefs.current['nom'] = el }}
 value={localDoctorInfo.nom}
 onChange={(e) => handleDoctorFieldChange('nom', e.target.value)}
 placeholder="Dr. Full Name"
 className={localDoctorInfo.nom.includes('[') ? 'border-blue-500' : ''}
 />
 </div>
 <div>
 <Label>Qualifications</Label>
 <Input
 ref={(el) => { inputRefs.current['qualifications'] = el }}
 value={localDoctorInfo.qualifications}
 onChange={(e) => handleDoctorFieldChange('qualifications', e.target.value)}
 placeholder="MBBS, MD"
 />
 </div>
 <div>
 <Label>Speciality</Label>
 <Input
 ref={(el) => { inputRefs.current['specialite'] = el }}
 value={localDoctorInfo.specialite}
 onChange={(e) => handleDoctorFieldChange('specialite', e.target.value)}
 placeholder="General Medicine"
 />
 </div>
 <div>
 <Label>Medical Council Registration No. *</Label>
 <Input
 ref={(el) => { inputRefs.current['numeroEnregistrement'] = el }}
 value={localDoctorInfo.numeroEnregistrement}
 onChange={(e) => handleDoctorFieldChange('numeroEnregistrement', e.target.value)}
 placeholder="MCM/12345"
 className={localDoctorInfo.numeroEnregistrement.includes('[') ? 'border-blue-500' : ''}
 />
 </div>
 <div>
 <Label>Email *</Label>
 <Input
 ref={(el) => { inputRefs.current['email'] = el }}
 value={localDoctorInfo.email}
 onChange={(e) => handleDoctorFieldChange('email', e.target.value)}
 placeholder="doctor@email.com"
 className={localDoctorInfo.email.includes('[') ? 'border-blue-500' : ''}
 />
 </div>
 <div className="col-span-2">
 <Label>Clinic Address</Label>
 <Input
 ref={(el) => { inputRefs.current['adresseCabinet'] = el }}
 value={localDoctorInfo.adresseCabinet}
 onChange={(e) => handleDoctorFieldChange('adresseCabinet', e.target.value)}
 placeholder="Clinic address or Teleconsultation"
 />
 </div>
 <div className="col-span-2">
 <Label>Consultation Hours</Label>
 <Input
 ref={(el) => { inputRefs.current['heuresConsultation'] = el }}
 value={localDoctorInfo.heuresConsultation}
 onChange={(e) => handleDoctorFieldChange('heuresConsultation', e.target.value)}
 placeholder="Teleconsultation Hours: 8:00 AM - 8:00 PM"
 />
 </div>
 <div className="col-span-2">
 <p className="text-sm text-blue-600">* Required fields must be completed before validation</p>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><strong>Name:</strong> {doctorInfo.nom}</div>
 <div><strong>Qualifications:</strong> {doctorInfo.qualifications}</div>
 <div><strong>Speciality:</strong> {doctorInfo.specialite}</div>
 <div><strong>Medical Council No.:</strong> {doctorInfo.numeroEnregistrement}</div>
 <div><strong>Email:</strong> {doctorInfo.email}</div>
 {doctorInfo.adresseCabinet && !doctorInfo.adresseCabinet.toLowerCase().includes('tibok') && (
 <div className="col-span-2"><strong>Clinic Address:</strong> {doctorInfo.adresseCabinet}</div>
 )}
 {doctorInfo.heuresConsultation && (
 <div className="col-span-2"><strong>Consultation Hours:</strong> {doctorInfo.heuresConsultation.replace(/^Teleconsultation Hours:\s*/i, '').replace(/8:00\s*PM/gi, '00:00')}</div>
 )}
 </div>
 )}
 </CardContent>
 </Card>
 )
 })

DoctorInfoEditor.displayName = 'DoctorInfoEditor'

const ConsultationReport = () => {
 const sections = [
 { key: 'motifConsultation', title: 'CHIEF COMPLAINT' },
 { key: 'anamnese', title: 'HISTORY OF PRESENT ILLNESS' },
 { key: 'antecedents', title: 'PAST MEDICAL HISTORY' },
 { key: 'examenClinique', title: 'PHYSICAL EXAMINATION' },
 { key: 'syntheseDiagnostique', title: 'DIAGNOSTIC SYNTHESIS' },
 { key: 'conclusionDiagnostique', title: 'DIAGNOSTIC CONCLUSION' },
 { key: 'priseEnCharge', title: 'MANAGEMENT PLAN' },
 { key: 'surveillance', title: 'FOLLOW-UP PLAN' },
 { key: 'conclusion', title: 'FINAL REMARKS' }
 ]
 
 const header = getReportHeader()
 const praticien = getReportPraticien()
 const patient = getReportPatient()
 const rapport = getReportRapport()
 const metadata = getReportMetadata()

 // Create stable handlers for each section
 const stableUpdateHandlers = useMemo(() => {
 const handlers: { [key: string]: (value: string) => void } = {}
 sections.forEach(section => {
 handlers[section.key] = (value: string) => updateRapportSection(section.key, value)
 })
 return handlers
 }, [updateRapportSection])

 // ADD THIS: Create stable local change handler
 const stableLocalChangeHandler = useCallback(() => {
 setHasUnsavedChanges(true)
 }, [])

 return (
 <Card className="shadow-xl print:shadow-none">
 <CardContent className="p-8 print:p-12" id="consultation-report">
 <div className="text-center mb-8 print:mb-12 header">
 <h1 className="text-2xl font-bold mb-2">{header.title}</h1>
 <p className="text-gray-600">{header.subtitle}</p>
 <p className="text-sm text-gray-500 mt-2">Reference: {header.reference}</p>
 </div>

 <div className="mb-6 p-4 bg-blue-50 rounded-lg print:bg-transparent print:border print:border-gray-300 info-box">
 <h3 className="font-bold mb-2">Medical Practitioner</h3>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div>{praticien.nom}</div>
 <div>{praticien.qualifications}</div>
 <div>{praticien.specialite}</div>
 <div>Medical Council Reg: {praticien.numeroEnregistrement}</div>
 <div>{praticien.email}</div>
 {praticien.heuresConsultation && (
 <div className="col-span-2">Consultation Hours: {praticien.heuresConsultation.replace(/^Teleconsultation Hours:\s*/i, '').replace(/8:00\s*PM/gi, '00:00')}</div>
 )}
 </div>
 </div>

 <div className="mb-8 p-4 bg-gray-50 rounded-lg info-box print:bg-transparent print:border print:border-gray-300">
 <div className="flex items-center justify-between mb-3">
 <h3 className="font-bold">Patient Identification & Medical Profile</h3>
 {editMode && validationStatus !== 'validated' && (
 <span className="text-xs text-blue-600">✏️ Editable</span>
 )}
 </div>
 
 {/* Section 1: Identification */}
 <div className="mb-4 pb-3 border-b border-gray-200">
 <h4 className="font-semibold text-sm text-gray-700 mb-2">Personal Information</h4>
 <div className="grid grid-cols-2 gap-3 text-sm">
 <div><span className="font-medium">Patient:</span> {patient.nomComplet || patient.nom}</div>
 <div><span className="font-medium">Age:</span> {patient.age}</div>
 <div><span className="font-medium">Gender:</span> {patient.sexe}</div>
 <div><span className="font-medium">DOB:</span> {patient.dateNaissance}</div>
 {patient.identifiantNational && (
 <div><span className="font-medium">NID:</span> {patient.identifiantNational}</div>
 )}
 <div><span className="font-medium">Examination Date:</span> {patient.dateExamen}</div>
 </div>
 </div>

 {/* Section 1b: Gynecological Status - EDITABLE (for females only) */}
 {patient.sexe && (patient.sexe.toLowerCase() === 'female' || patient.sexe.toLowerCase() === 'f' || patient.sexe.toLowerCase() === 'femme') && (
 <div className="mb-4 pb-3 border-b border-gray-200">
 <h4 className="font-semibold text-sm text-gray-700 mb-2">🤰 Gynecological Status</h4>
 {editMode && validationStatus !== 'validated' ? (
 <div className="space-y-3">
 {/* Pregnancy Status - Editable */}
 <div>
 <Label htmlFor="patient-pregnancy-status" className="text-xs">Pregnancy Status</Label>
 <select
 id="patient-pregnancy-status"
 value={patient.pregnancyStatus || ''}
 onChange={(e) => updatePatientField('pregnancyStatus', e.target.value)}
 className="w-full h-8 text-sm border border-gray-300 rounded px-2"
 >
 <option value="">Not specified</option>
 <option value="not_pregnant">Not Pregnant</option>
 <option value="pregnant">Pregnant</option>
 <option value="possibly_pregnant">Possibly Pregnant</option>
 <option value="postpartum">Postpartum</option>
 <option value="breastfeeding">Breastfeeding</option>
 </select>
 </div>
 
 {/* Gestational Age - Editable (if pregnant) */}
 {patient.pregnancyStatus === 'pregnant' && (
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label htmlFor="patient-gestational-age" className="text-xs">Gestational Age</Label>
 <Input
 id="patient-gestational-age"
 type="text"
 value={patient.gestationalAge || ''}
 onChange={(e) => updatePatientField('gestationalAge', e.target.value)}
 placeholder="12 weeks"
 className="h-8 text-sm"
 />
 </div>
 <div>
 <Label htmlFor="patient-lmp" className="text-xs">Last Menstrual Period</Label>
 <Input
 id="patient-lmp"
 type="date"
 value={patient.lastMenstrualPeriod || ''}
 onChange={(e) => updatePatientField('lastMenstrualPeriod', e.target.value)}
 className="h-8 text-sm"
 />
 </div>
 </div>
 )}
 </div>
 ) : (
 <div className="text-sm space-y-1">
 {patient.pregnancyStatus ? (
 <>
 <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
 patient.pregnancyStatus === 'pregnant' ? 'bg-cyan-100 text-cyan-800' :
 patient.pregnancyStatus === 'possibly_pregnant' ? 'bg-cyan-100 text-cyan-800' :
 patient.pregnancyStatus === 'postpartum' ? 'bg-blue-100 text-blue-800' :
 patient.pregnancyStatus === 'breastfeeding' ? 'bg-blue-100 text-blue-800' :
 'bg-teal-100 text-teal-800'
 }`}>
 {patient.pregnancyStatus === 'not_pregnant' && '✓ Not Pregnant'}
 {patient.pregnancyStatus === 'pregnant' && '🤰 Pregnant'}
 {patient.pregnancyStatus === 'possibly_pregnant' && '⚠️ Possibly Pregnant'}
 {patient.pregnancyStatus === 'postpartum' && '👶 Postpartum'}
 {patient.pregnancyStatus === 'breastfeeding' && '🤱 Breastfeeding'}
 </div>
 
 {patient.pregnancyStatus === 'pregnant' && patient.gestationalAge && (
 <div className="mt-2">
 <span className="font-medium">Gestational Age:</span> {patient.gestationalAge}
 </div>
 )}
 {patient.pregnancyStatus === 'pregnant' && patient.lastMenstrualPeriod && (
 <div>
 <span className="font-medium">Last Menstrual Period:</span> {new Date(patient.lastMenstrualPeriod).toLocaleDateString()}
 </div>
 )}
 </>
 ) : (
 <span className="text-gray-500">Not specified</span>
 )}
 </div>
 )}
 </div>
 )}

 {/* Section 2: Vital Signs & Measurements - EDITABLE */}
 <div className="mb-4 pb-3 border-b border-gray-200">
 <h4 className="font-semibold text-sm text-gray-700 mb-2">Vital Signs & Measurements</h4>
 {editMode && validationStatus !== 'validated' ? (
 <div className="grid grid-cols-2 gap-3">
 {/* Poids - Editable */}
 <div>
 <Label htmlFor="patient-weight" className="text-xs">Weight (kg)</Label>
 <Input
 id="patient-weight"
 type="number"
 step="0.1"
 value={patient.poids || ''}
 onChange={(e) => updatePatientField('poids', e.target.value)}
 placeholder="75"
 className="h-8 text-sm"
 />
 </div>
 
 {/* Taille - Editable */}
 <div>
 <Label htmlFor="patient-height" className="text-xs">Height (cm)</Label>
 <Input
 id="patient-height"
 type="number"
 step="0.1"
 value={patient.taille || ''}
 onChange={(e) => updatePatientField('taille', e.target.value)}
 placeholder="175"
 className="h-8 text-sm"
 />
 </div>
 
 {/* Température - Editable */}
 <div>
 <Label htmlFor="patient-temperature" className="text-xs">Temperature (°C)</Label>
 <Input
 id="patient-temperature"
 type="number"
 step="0.1"
 value={patient.temperature || ''}
 onChange={(e) => updatePatientField('temperature', e.target.value)}
 placeholder="37.0"
 className="h-8 text-sm"
 />
 </div>
 
 {/* Tension Systolique - Editable */}
 <div>
 <Label htmlFor="patient-bp-systolic" className="text-xs">BP Systolic (mmHg)</Label>
 <Input
 id="patient-bp-systolic"
 type="number"
 value={patient.bloodPressureSystolic || ''}
 onChange={(e) => updatePatientField('bloodPressureSystolic', e.target.value)}
 placeholder="120"
 className="h-8 text-sm"
 />
 </div>
 
 {/* Tension Diastolique - Editable */}
 <div>
 <Label htmlFor="patient-bp-diastolic" className="text-xs">BP Diastolic (mmHg)</Label>
 <Input
 id="patient-bp-diastolic"
 type="number"
 value={patient.bloodPressureDiastolic || ''}
 onChange={(e) => updatePatientField('bloodPressureDiastolic', e.target.value)}
 placeholder="80"
 className="h-8 text-sm"
 />
 </div>
 
 {/* Glycémie - Editable */}
 <div>
 <Label htmlFor="patient-glucose" className="text-xs">Blood Glucose (g/L)</Label>
 <Input
 id="patient-glucose"
 type="number"
 step="0.01"
 value={patient.bloodGlucose || ''}
 onChange={(e) => updatePatientField('bloodGlucose', e.target.value)}
 placeholder="1.0"
 className="h-8 text-sm"
 />
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-2 text-sm">
 {/* Display mode */}
 {patient.poids && (
 <div><span className="font-medium">Weight:</span> {patient.poids} kg</div>
 )}
 {patient.taille && (
 <div><span className="font-medium">Height:</span> {patient.taille} cm</div>
 )}
 {patient.poids && patient.taille && (
 <div><span className="font-medium">BMI:</span> {(parseFloat(patient.poids) / Math.pow(parseFloat(patient.taille) / 100, 2)).toFixed(1)} kg/m²</div>
 )}
 {patient.temperature && (
 <div>
 <span className="font-medium">Temperature:</span> {patient.temperature}°C
 {parseFloat(patient.temperature) > 37.2 && ' ⚠️'}
 </div>
 )}
 {patient.bloodPressureSystolic && patient.bloodPressureDiastolic && (
 <div className="col-span-2">
 <span className="font-medium">Blood Pressure:</span> {patient.bloodPressureSystolic}/{patient.bloodPressureDiastolic} mmHg
 {(parseInt(patient.bloodPressureSystolic) >= 140 || parseInt(patient.bloodPressureDiastolic) >= 90) && ' ⚠️'}
 </div>
 )}
 {patient.bloodGlucose && (
 <div className="col-span-2">
 <span className="font-medium">Blood Glucose:</span> {patient.bloodGlucose} g/L
 {(parseFloat(patient.bloodGlucose) < 0.7 || parseFloat(patient.bloodGlucose) > 1.26) && ' ⚠️'}
 {parseFloat(patient.bloodGlucose) < 0.7 && ' (Hypoglycemia)'}
 {parseFloat(patient.bloodGlucose) > 1.26 && parseFloat(patient.bloodGlucose) < 2.0 && ' (Moderate hyperglycemia)'}
 {parseFloat(patient.bloodGlucose) >= 2.0 && ' (Severe hyperglycemia)'}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Section 3: Allergies - EDITABLE */}
 <div className="mb-4 pb-3 border-b border-gray-200">
 <h4 className="font-semibold text-sm text-gray-700 mb-2">Allergies</h4>
 {editMode && validationStatus !== 'validated' ? (
 <div>
 <Label htmlFor="patient-allergies" className="text-xs">Allergies (comma separated or "NKDA")</Label>
 <Textarea
 id="patient-allergies"
 value={patient.allergies || ''}
 onChange={(e) => updatePatientField('allergies', e.target.value)}
 placeholder="Penicillin, Sulfa, Aspirin or NKDA"
 className="min-h-[60px] text-sm"
 />
 </div>
 ) : (
 <div className="text-sm">
 {patient.allergies && patient.allergies !== 'NKDA (No Known Drug Allergies)' && patient.allergies !== 'NKDA' ? (
 <div className="flex flex-wrap gap-2">
 {patient.allergies.split(',').map((allergy: string, idx: number) => (
 <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded">
 ⚠️ {allergy.trim()}
 </span>
 ))}
 </div>
 ) : (
 <span className="text-teal-700">✅ {patient.allergies || 'NKDA (No Known Drug Allergies)'}</span>
 )}
 </div>
 )}
 </div>

 {/* Section 4: Medical History / Antécédents - EDITABLE */}
 <div className="mb-4 pb-3 border-b border-gray-200">
 <h4 className="font-semibold text-sm text-gray-700 mb-2">Medical History (Antécédents)</h4>
 {editMode && validationStatus !== 'validated' ? (
 <div>
 <Label htmlFor="patient-history" className="text-xs">Medical History (comma separated)</Label>
 <Textarea
 id="patient-history"
 value={patient.medicalHistory || ''}
 onChange={(e) => updatePatientField('medicalHistory', e.target.value)}
 placeholder="Hypertension, Diabetes Type 2, Asthma"
 className="min-h-[60px] text-sm"
 />
 </div>
 ) : (
 <div className="text-sm">
 {patient.medicalHistory && patient.medicalHistory !== 'No significant medical history' ? (
 <div className="flex flex-wrap gap-2">
 {patient.medicalHistory.split(',').map((condition: string, idx: number) => (
 <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded">
 {condition.trim()}
 </span>
 ))}
 </div>
 ) : (
 <span className="text-gray-600">{patient.medicalHistory || 'No significant medical history recorded'}</span>
 )}
 </div>
 )}
 </div>

 {/* Section 5: Current Medications / Traitement Actuel - EDITABLE */}
 <div>
 <h4 className="font-semibold text-sm text-gray-700 mb-2">Current Medications (Traitement Actuel)</h4>
 {editMode && validationStatus !== 'validated' ? (
 <div>
 <Label htmlFor="patient-medications" className="text-xs">Current Medications (one per line)</Label>
 <Textarea
 id="patient-medications"
 value={patient.currentMedications || ''}
 onChange={(e) => updatePatientField('currentMedications', e.target.value)}
 placeholder="1. Metformin 500mg - BD&#10;2. Aspirin 100mg - OD"
 className="min-h-[100px] text-sm font-mono"
 />
 </div>
 ) : (
 <div className="text-sm">
 {patient.currentMedications && patient.currentMedications !== 'No current medications' ? (
 <div className="whitespace-pre-wrap text-gray-700 p-3 bg-teal-50 border border-teal-200 rounded">
 {patient.currentMedications}
 </div>
 ) : (
 <span className="text-gray-600">{patient.currentMedications || 'No current medications'}</span>
 )}
 </div>
 )}
 </div>
 </div>

 <div className="mb-4 print:hidden">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setShowFullReport(!showFullReport)}
 >
 {showFullReport ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
 {showFullReport ? "Hide detailed report" : "Show full report"}
 </Button>
 </div>

 <div className={`space-y-6 ${!showFullReport && !editMode ? 'max-h-96 overflow-hidden relative' : ''} print:max-h-none`}>
 {sections.map((section) => {
 const content = rapport[section.key as keyof typeof rapport]
 if (!content) return null
 
 return (
 <section key={section.key} className="space-y-2 section">
 <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
 {editMode && validationStatus !== 'validated' ? (
 <DebouncedTextarea
 value={content}
 onUpdate={stableUpdateHandlers[section.key]}
 onLocalChange={stableLocalChangeHandler} // Use the local stable handler
 className="min-h-[200px] font-sans text-gray-700"
 placeholder="Enter text..."
 sectionKey={section.key}
 />
 ) : (
 <div className="prose pcyan-lg max-w-none">
 <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
 {highlightUrgentContent(content)}
 </p>
 </div>
 )}
 </section>
 )
 })}
 
 {!showFullReport && !editMode && (
 <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent print:hidden" />
 )}
 </div>

 
 <div className="mt-12 pt-8 border-t border-gray-300 signature">
 <div className="text-right">
 <p className="font-semibold">{praticien.nom}</p>
 <p className="text-sm text-gray-600">{praticien.qualifications}</p>
 <p className="text-sm text-gray-600">Medical Council Reg: {praticien.numeroEnregistrement}</p>

 {validationStatus === 'validated' && documentSignatures.consultation ? (
 <div className="mt-4">
 <img 
 src={documentSignatures.consultation} 
 alt="Doctor's Signature" 
 className="ml-auto h-20 w-auto"
 style={{ maxWidth: '300px' }}
 />
 <p className="text-sm text-gray-600 mt-2">
 Digitally signed on {new Date().toLocaleDateString()}
 </p>
 </div>
 ) : (
 <div className="mt-8">
 <p className="text-sm">_______________________________</p>
 <p className="text-sm">Signature & Official Stamp</p>
 <p className="text-sm">Date: {patient.dateExamen || new Date().toLocaleDateString()}</p>
 </div>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 )
 }
 const MedicationPrescription = () => {
 const medications = report?.ordonnances?.medicaments?.prescription?.medicaments || []
 const patient = getReportPatient()
 const praticien = getReportPraticien()
 
 if (!includeFullPrescriptions && report?.prescriptionsResume) {
 return (
 <Card>
 <CardContent className="p-6">
 <h3 className="font-bold mb-4">Prescription Summary</h3>
 <p>{report.prescriptionsResume.medicaments}</p>
 </CardContent>
 </Card>
 )
 }

 return (
 <div id="prescription-medicaments" className="bg-white p-8 rounded-lg shadow print:shadow-none">
 <div className="border-b-2 border-teal-600 pb-4 mb-6 header">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-2xl font-bold">MEDICAL PRESCRIPTION</h2>
 <p className="text-gray-600 mt-1">Compliant with Medical Council & Pharmacy Act of Mauritius</p>
 <p className="text-sm text-gray-500 mt-1">
 {medications.length} medication{medications.length !== 1 ? 's' : ''} prescribed
 </p>
 </div>
 <div className="flex gap-2 print:hidden">
 {editMode && validationStatus !== 'validated' && (
 <Button onClick={addMedicament} size="sm" variant="outline">
 <Plus className="h-4 w-4 mr-2" />
 Add Medication
 </Button>
 )}
 <Button
 variant="outline"
 size="sm"
 onClick={() => exportSectionToPDF('prescription-medicaments', `prescription_${patient.nom}_${new Date().toISOString().split('T')[0]}.pdf`)}
 >
 <Download className="h-4 w-4 mr-2" />
 Export PDF
 </Button>
 </div>
 </div>
 </div>

 <div className="mb-6 p-4 bg-gray-50 rounded info-box">
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><strong>Patient:</strong> {patient.nomComplet || patient.nom}</div>
 <div><strong>Date:</strong> {patient.dateExamen}</div>
 <div><strong>Address:</strong> {patient.adresse}</div>
 {patient.identifiantNational && (
 <div><strong>NID:</strong> {patient.identifiantNational}</div>
 )}
 </div>
 </div>

 <div className="space-y-6">
{medications.length > 0 ? (
 medications.map((med: any, index: number) => (
 <div 
 key={`medication-${index}`} // CHANGED: Better key
 className="border-l-4 border-teal-500 pl-4 py-2 prescription-item"
 >
{editMode && validationStatus !== 'validated' ? (
<MedicationEditForm
 key={`med-edit-${index}`}
 medication={med}
 index={index}
 onUpdate={stableUpdateMedication}
 onRemove={stableRemoveMedication}
 onLocalChange={stableTrackModification}
/>
) : (
 <div>
 <div className="font-bold text-lg">
 {index + 1}. {med.nom}
 {med.nonSubstituable && (
 <Badge className="ml-2 bg-blue-100 text-blue-800 badge badge-red">Non-substitutable</Badge>
 )}
 </div>
 {med.denominationCommune && med.denominationCommune !== med.nom && (
 <p className="text-sm text-gray-600">Generic (INN): {med.denominationCommune}</p>
 )}
 <p className="mt-1">
 <span className="font-medium">Form:</span> {med.forme} - {med.dosage}
 </p>
 <p className="mt-1">
 <span className="font-medium">Frequency:</span> {med.posologie}
 </p>
 <p className="mt-1">
 <span className="font-medium">Route:</span> {med.modeAdministration}
 </p>
 <p className="mt-1">
 <span className="font-medium">Duration:</span> {med.dureeTraitement}
 </p>
 {med.quantite && (
 <p className="mt-1">
 <span className="font-medium">Quantity:</span> {med.quantite}
 </p>
 )}
 {med.instructions && (
 <p className="mt-2 text-sm text-gray-600 italic">
 ℹ️ {med.instructions}
 </p>
 )}
 {med.justification && (
 <p className="mt-1 text-sm text-gray-600">
 <span className="font-medium">Indication:</span> {med.justification}
 </p>
 )}
 </div>
 )}
 </div>
 ))
 ) : (
 <div className="text-center py-8 text-gray-500">
 <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
 <p>No medications prescribed</p>
 {diagnosisData?.noMedicationsReason && (
 <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-2xl mx-auto">
 <p className="text-sm text-blue-800">
 <strong>ℹ️ Medical Note:</strong> {diagnosisData.noMedicationsReason}
 </p>
 </div>
 )}
 {editMode && (
 <Button onClick={addMedicament} className="mt-4" variant="outline">
 <Plus className="h-4 w-4 mr-2" />
 Add First Medication
 </Button>
 )}
 </div>
 )}
 </div>

 <div className="mt-8 pt-6 border-t border-gray-300">
 <p className="text-sm text-gray-600 mb-4">
 Validity: {report?.ordonnances?.medicaments?.prescription?.validite || "3 months unless otherwise specified"}
 </p>
 <div className="text-right signature">
 <p className="font-semibold">{praticien.nom}</p>
 <p className="text-sm text-gray-600">{praticien.qualifications}</p>
 <p className="text-sm text-gray-600">Medical Council Reg: {praticien.numeroEnregistrement}</p>
 
 {validationStatus === 'validated' && documentSignatures.prescription ? (
 <div className="mt-4">
 <img 
 src={documentSignatures.prescription} 
 alt="Doctor's Signature" 
 className="ml-auto h-20 w-auto"
 style={{ maxWidth: '300px' }}
 />
 <p className="text-sm text-gray-600 mt-2">
 Digitally signed on {new Date().toLocaleDateString()}
 </p>
 </div>
 ) : (
 <div className="mt-8">
 <p className="text-sm">_______________________________</p>
 <p className="text-sm">Medical Practitioner's Signature</p>
 <p className="text-sm">Official Medical Stamp</p>
 <p className="text-sm">Date: {patient.dateExamen}</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )
 }
 const BiologyPrescription = () => {
 const analyses = report?.ordonnances?.biologie?.prescription?.analyses || {}
 const hasTests = Object.values(analyses).some((tests: any) => Array.isArray(tests) && tests.length > 0)
 const patient = getReportPatient()
 const praticien = getReportPraticien()
 const rapport = getReportRapport()
 
 const categories = [
 { key: 'hematology', label: 'HEMATOLOGY' },
 { key: 'clinicalChemistry', label: 'CLINICAL CHEMISTRY' },
 { key: 'immunology', label: 'IMMUNOLOGY' },
 { key: 'microbiology', label: 'MICROBIOLOGY' },
 { key: 'endocrinology', label: 'ENDOCRINOLOGY' },
 { key: 'general', label: 'GENERAL LABORATORY' }
 ]
 
 if (!includeFullPrescriptions && report?.prescriptionsResume) {
 return (
 <Card>
 <CardContent className="p-6">
 <h3 className="font-bold mb-4">Laboratory Tests Summary</h3>
 <p>{report.prescriptionsResume.examens}</p>
 </CardContent>
 </Card>
 )
 }

 return (
 <div id="prescription-biologie" className="bg-white p-8 rounded-lg shadow print:shadow-none">
 <div className="border-b-2 border-blue-600 pb-4 mb-6 header">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-2xl font-bold">LABORATORY REQUEST FORM</h2>
 <p className="text-gray-600 mt-1">Compliant with MoH Laboratory Standards</p>
 </div>
 <div className="flex gap-2 print:hidden">
 {editMode && validationStatus !== 'validated' && (
 <Select onValueChange={(value) => addBiologyTest(value)}>
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder="Add Test Category" />
 </SelectTrigger>
 <SelectContent>
 {categories.map(cat => (
 <SelectItem key={cat.key} value={cat.key}>
 {cat.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 <Button
 variant="outline"
 size="sm"
 onClick={() => exportSectionToPDF('prescription-biologie', `lab_request_${patient.nom}_${new Date().toISOString().split('T')[0]}.pdf`)}
 >
 <Download className="h-4 w-4 mr-2" />
 Export PDF
 </Button>
 </div>
 </div>
 </div>

 <div className="mb-6 p-4 bg-blue-50 rounded info-box">
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><strong>Patient:</strong> {patient.nomComplet || patient.nom}</div>
 <div><strong>Date:</strong> {patient.dateExamen}</div>
 <div><strong>Clinical Information:</strong> {report?.ordonnances?.biologie?.patient?.diagnosticProvisoire || rapport.conclusionDiagnostique?.substring(0, 100) + '...' || 'N/A'}</div>
 </div>
 </div>

 {hasTests ? (
 <div className="space-y-6">
 {categories.map(({ key, label }) => {
 const tests = analyses[key]
 if (!Array.isArray(tests) || tests.length === 0) return null
 
 return (
 <div key={key} className="border-l-4 border-blue-500 pl-4">
 <h3 className="font-bold text-lg mb-3 text-blue-800 category-header">
 {label}
 </h3>
 <div className="space-y-2">
 {tests.map((test: any, idx: number) => (
 <div key={`${key}-test-${idx}`} className="prescription-item">
 {editMode && validationStatus !== 'validated' ? (
<BiologyTestEditForm
 key={`bio-edit-${key}-${idx}`}
 test={test}
 category={key}
 index={idx}
 onUpdate={stableUpdateBiologyTest}
 onRemove={stableRemoveBiologyTest} // <- Use the stable version
 onLocalChange={stableTrackModification}
/>
 ) : (
 <div className="flex items-start justify-between p-2 hover:bg-gray-50 rounded">
 <div className="flex-1">
 <p className="font-medium">
 {test.nom}
 {test.urgence && <Badge className="ml-2 bg-blue-100 text-blue-800 urgent badge badge-red">URGENT</Badge>}
 </p>
 {test.aJeun && (
 <p className="text-sm text-blue-600 mt-1">⚠️ Fasting required</p>
 )}
 {test.conditionsPrelevement && (
 <p className="text-sm text-gray-600 mt-1">
 Conditions: {test.conditionsPrelevement}
 </p>
 )}
 {test.motifClinique && (
 <p className="text-sm text-gray-600 mt-1">
 Indication: {test.motifClinique}
 </p>
 )}
 </div>
 <div className="text-sm text-gray-500">
 <p>Tube: {test.tubePrelevement}</p>
 <p>TAT: {test.delaiResultat}</p>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 )
 })}
 
 {report?.ordonnances?.biologie?.prescription?.instructionsSpeciales?.length > 0 && (
 <div className="mt-6 p-4 bg-cyan-50 rounded">
 <h4 className="font-bold mb-2">Special Instructions</h4>
 <ul className="list-disc list-inside text-sm">
 {report.ordonnances.biologie.prescription.instructionsSpeciales.map((instruction: string, idx: number) => (
 <li key={idx}>{instruction}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
 <p>No laboratory tests ordered</p>
 {diagnosisData?.noMedicationsReason && (
 <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-2xl mx-auto">
 <p className="text-sm text-blue-800">
 <strong>ℹ️ Medical Note:</strong> Biopsy and specialist evaluation required first.
 </p>
 </div>
 )}
 {editMode && (
 <div className="mt-4">
 <Select onValueChange={(value) => addBiologyTest(value)}>
 <SelectTrigger className="w-[250px] mx-auto">
 <SelectValue placeholder="Select test category" />
 </SelectTrigger>
 <SelectContent>
 {categories.map(cat => (
 <SelectItem key={cat.key} value={cat.key}>
 {cat.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}
 </div>
 )}

 <div className="mt-8 pt-6 border-t border-gray-300">
 <p className="text-sm text-gray-600 mb-4">
 Laboratory: {report?.ordonnances?.biologie?.prescription?.laboratoireRecommande || "Any MoH approved laboratory"}
 </p>
 <div className="text-right signature">
 <p className="font-semibold">{praticien.nom}</p>
 <p className="text-sm text-gray-600">Medical Council Reg: {praticien.numeroEnregistrement}</p>
 
 {validationStatus === 'validated' && documentSignatures.laboratory ? (
 <div className="mt-4">
 <img 
 src={documentSignatures.laboratory} 
 alt="Doctor's Signature" 
 className="ml-auto h-20 w-auto"
 style={{ maxWidth: '300px' }}
 />
 <p className="text-sm text-gray-600 mt-2">
 Digitally signed on {new Date().toLocaleDateString()}
 </p>
 </div>
 ) : (
 <div className="mt-8">
 <p className="text-sm">_______________________________</p>
 <p className="text-sm">Requesting Physician's Signature</p>
 <p className="text-sm">Date: {patient.dateExamen}</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )
 }

 const ImagingPrescription = () => {
 const examens = report?.ordonnances?.imagerie?.prescription?.examens || []
 const patient = getReportPatient()
 const praticien = getReportPraticien()
 
 return (
 <div id="prescription-imagerie" className="bg-white p-8 rounded-lg shadow print:shadow-none">
 <div className="border-b-2 border-blue-600 pb-4 mb-6 header">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-2xl font-bold">RADIOLOGY REQUEST FORM</h2>
 <p className="text-gray-600 mt-1">Compliant with MoH Radiology Standards</p>
 </div>
 <div className="flex gap-2 print:hidden">
 {editMode && validationStatus !== 'validated' && (
 <Button onClick={addImagingExam} size="sm" variant="outline">
 <Plus className="h-4 w-4 mr-2" />
 Add Imaging
 </Button>
 )}
 <Button
 variant="outline"
 size="sm"
 onClick={() => exportSectionToPDF('prescription-imagerie', `imaging_request_${patient.nom}_${new Date().toISOString().split('T')[0]}.pdf`)}
 >
 <Download className="h-4 w-4 mr-2" />
 Export PDF
 </Button>
 </div>
 </div>
 </div>

 <div className="mb-6 p-4 bg-blue-50 rounded info-box">
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><strong>Patient:</strong> {patient.nomComplet || patient.nom}</div>
 <div><strong>Weight:</strong> {patient.poids}</div>
 <div><strong>Clinical Diagnosis:</strong> {report?.ordonnances?.imagerie?.prescription?.renseignementsCliniques || 'N/A'}</div>
 {report?.ordonnances?.imagerie?.patient?.allergiesConnues && (
 <div><strong>Known Allergies:</strong> {report.ordonnances.imagerie.patient.allergiesConnues}</div>
 )}
 </div>
 </div>

 {examens.length > 0 ? (
 <div className="space-y-6">
 {examens.map((exam: any, index: number) => (
 <div key={`imaging-exam-${index}`} className="border-l-4 border-blue-500 pl-4 py-2 prescription-item">
 {editMode && validationStatus !== 'validated' ? (
<ImagingExamEditForm
 key={`imaging-edit-${index}`}
 exam={exam}
 index={index}
 onUpdate={stableUpdateImagingExam}
 onRemove={stableRemoveImagingExam} // <- Use the stable version
 onLocalChange={stableTrackModification}
/>
 ) : (
 <div>
 <div className="font-bold text-lg">
 {index + 1}. {exam.type || exam.modalite}
 {exam.urgence && <Badge className="ml-2 bg-blue-100 text-blue-800 urgent badge badge-red">URGENT</Badge>}
 </div>
 {/* Only show Region if it exists and is not "To be specified" */}
 {exam.region && exam.region !== 'To be specified' && exam.region !== '' && (
 <p className="mt-1">
 <span className="font-medium">Region:</span> {exam.region}
 </p>
 )}
 <p className="mt-1">
 <span className="font-medium">Clinical Indication:</span> {exam.indicationClinique}
 </p>
 {exam.contraste && (
 <p className="mt-1 text-blue-600">
 ⚠️ <span className="font-medium">Contrast required</span>
 </p>
 )}
 {exam.protocoleSpecifique && (
 <p className="mt-1">
 <span className="font-medium">Protocol:</span> {exam.protocoleSpecifique}
 </p>
 )}
 {exam.questionDiagnostique && (
 <p className="mt-1 text-sm text-gray-600">
 <span className="font-medium">Clinical Question:</span> {exam.questionDiagnostique}
 </p>
 )}
 </div>
 )}
 </div>
))}
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 <Scan className="h-12 w-12 mx-auto mb-4 text-gray-300" />
 <p>No imaging studies ordered</p>
 {editMode && (
 <Button onClick={addImagingExam} className="mt-4" variant="outline">
 <Plus className="h-4 w-4 mr-2" />
 Add First Imaging Study
 </Button>
 )}
 </div>
 )}

 <div className="mt-8 pt-6 border-t border-gray-300">
 <p className="text-sm text-gray-600 mb-4">
 Imaging Center: {report?.ordonnances?.imagerie?.prescription?.centreImagerie || "Any MoH approved imaging center"}
 </p>
 <div className="text-right signature">
 <p className="font-semibold">{praticien.nom}</p>
 <p className="text-sm text-gray-600">Medical Council Reg: {praticien.numeroEnregistrement}</p>
 
 {validationStatus === 'validated' && documentSignatures.imaging ? (
 <div className="mt-4">
 <img 
 src={documentSignatures.imaging} 
 alt="Doctor's Signature" 
 className="ml-auto h-20 w-auto"
 style={{ maxWidth: '300px' }}
 />
 <p className="text-sm text-gray-600 mt-2">
 Digitally signed on {new Date().toLocaleDateString()}
 </p>
 </div>
 ) : (
 <div className="mt-8">
 <p className="text-sm">_______________________________</p>
 <p className="text-sm">Requesting Physician's Signature</p>
 <p className="text-sm">Date: {patient.dateExamen}</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )
 }

const SickLeaveCertificate = () => {
 const patient = getReportPatient()
 const praticien = getReportPraticien()
 const certificat = report?.ordonnances?.arretMaladie?.certificat
 
 // Use local state for form fields
const rapport = getReportRapport()
const [localSickLeave, setLocalSickLeave] = useState({
 dateDebut: certificat?.dateDebut || '',
 dateFin: certificat?.dateFin || '',
 nombreJours: certificat?.nombreJours || 0,
 motifMedical: certificat?.motifMedical || rapport?.conclusionDiagnostique || '',
 remarques: certificat?.remarques || '',
 restrictionsTravail: certificat?.restrictionsTravail || '',
 repriseAutorisee: certificat?.repriseAutorisee || ''
})
 
 // Track if there are unsaved changes
 const [hasLocalChanges, setHasLocalChanges] = useState(false)
 const saveTimeoutRef = useRef<NodeJS.Timeout>()
 
 // Handle field changes locally
 const handleFieldChange = useCallback((field: string, value: any) => {
 setLocalSickLeave(prev => {
 const updated = { ...prev, [field]: value }
 
 // Auto-calculate days if both dates are set
 if (field === 'dateDebut' || field === 'dateFin') {
 const startDate = field === 'dateDebut' ? value : prev.dateDebut
 const endDate = field === 'dateFin' ? value : prev.dateFin
 
 if (startDate && endDate) {
 const start = new Date(startDate)
 const end = new Date(endDate)
 const diffTime = Math.abs(end.getTime() - start.getTime())
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
 updated.nombreJours = diffDays
 }
 }
 
 return updated
 })
 setHasLocalChanges(true)
 }, [])
 
 // Auto-save with debouncing
 useEffect(() => {
 if (!hasLocalChanges || validationStatus === 'validated') return
 
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }
 
 saveTimeoutRef.current = setTimeout(() => {
 // Update the main report
 setReport(prev => {
 if (!prev) return null
 
 const newReport = { ...prev }
 
 if (!newReport.ordonnances) newReport.ordonnances = {}
 
 if (!newReport.ordonnances.arretMaladie) {
 newReport.ordonnances.arretMaladie = {
 enTete: praticien,
 patient: patient,
 certificat: localSickLeave,
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: praticien.nom.toUpperCase(),
 numeroEnregistrement: praticien.numeroEnregistrement,
 cachetProfessionnel: "Official Medical Stamp",
 date: new Date().toISOString().split('T')[0]
 }
 }
 } else {
 newReport.ordonnances.arretMaladie.certificat = localSickLeave
 }
 
 return newReport
 })
 
 trackModification('arretMaladie')
 setHasUnsavedChanges(true)
 setHasLocalChanges(false)
 }, 3000) // 3 seconds
 
 return () => {
 if (saveTimeoutRef.current) {
 clearTimeout(saveTimeoutRef.current)
 }
 }
 }, [localSickLeave, hasLocalChanges, validationStatus, praticien, patient, trackModification])
 
 return (
 <div id="sick-leave-certificate" className="bg-white p-8 rounded-lg shadow print:shadow-none">
 <div className="border-b-2 border-cyan-600 pb-4 mb-6 header">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-2xl font-bold">SICK LEAVE CERTIFICATE</h2>
 <p className="text-gray-600 mt-1">Medical Leave Certificate</p>
 </div>
 <div className="flex gap-2 print:hidden">
 <Button
 variant="outline"
 size="sm"
 onClick={() => exportSectionToPDF('sick-leave-certificate', `sick_leave_${patient.nom}_${new Date().toISOString().split('T')[0]}.pdf`)}
 >
 <Download className="h-4 w-4 mr-2" />
 Export PDF
 </Button>
 </div>
 </div>
 </div>

 <div className="mb-6 p-4 bg-cyan-50 rounded info-box">
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><strong>Patient:</strong> {patient.nomComplet || patient.nom}</div>
 <div><strong>Date of Birth:</strong> {patient.dateNaissance}</div>
 <div><strong>Address:</strong> {patient.adresse}</div>
 <div><strong>Examination Date:</strong> {patient.dateExamen}</div>
 </div>
 </div>

 {editMode && validationStatus !== 'validated' ? (
 <div className="space-y-4">
 {hasLocalChanges && (
 <div className="text-xs text-cyan-600 flex items-center gap-1">
 <Loader2 className="h-3 w-3 animate-spin" />
 Auto-saving...
 </div>
 )}
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>Start Date *</Label>
 <Input
 type="date"
 value={localSickLeave.dateDebut}
 onChange={(e) => handleFieldChange('dateDebut', e.target.value)}
 />
 </div>
 <div>
 <Label>End Date *</Label>
 <Input
 type="date"
 value={localSickLeave.dateFin}
 onChange={(e) => handleFieldChange('dateFin', e.target.value)}
 min={localSickLeave.dateDebut}
 />
 </div>
 <div>
 <Label>Number of Days</Label>
 <Input
 type="number"
 value={localSickLeave.nombreJours}
 readOnly
 className="bg-gray-50"
 />
 </div>
 </div>
 
 <div>
 <Label>Medical Reason *</Label>
 <Textarea
 value={localSickLeave.motifMedical}
 onChange={(e) => handleFieldChange('motifMedical', e.target.value)}
 placeholder="E.g., Acute gastroenteritis, Influenza, etc."
 className="min-h-[80px]"
 />
 </div>
 
 </div>
 ) : certificat ? (
 <div className="space-y-4">
 <div className="p-4 bg-cyan-100 rounded-lg border-2 border-cyan-400">
 <p className="text-lg font-bold mb-2">
 SICK LEAVE FOR {certificat.nombreJours} DAY{certificat.nombreJours > 1 ? 'S' : ''}
 </p>
 <p className="text-sm">
 From <strong>{new Date(certificat.dateDebut).toLocaleDateString('en-GB')}</strong> to{' '}
 <strong>{new Date(certificat.dateFin).toLocaleDateString('en-GB')}</strong> inclusive
 </p>
 </div>
 
 <div className="space-y-2">
 <p><strong>Medical reason:</strong> {certificat.motifMedical}</p>
 
 </div>
 
 <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
 <p className="font-medium">MEDICAL CERTIFICATE</p>
 <p className="mt-2">
 I, the undersigned, {praticien.nom}, {praticien.qualifications}, certify that I have examined {patient.nomComplet || patient.nom} today
 and confirm that their health condition requires sick leave for {certificat.nombreJours} day{certificat.nombreJours > 1 ? 's' : ''}.
 </p>
 </div>
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
 <p>No sick leave prescribed</p>
 {editMode && (
 <p className="text-sm mt-2">Fill in the fields above to create a certificate</p>
 )}
 </div>
 )}

 {(certificat?.dateDebut || (editMode && validationStatus !== 'validated')) && (
 <div className="mt-8 pt-6 border-t border-gray-300">
 <div className="text-right signature">
 <p className="text-sm mb-2">Issued in Mauritius, on {new Date().toLocaleDateString('en-GB')}</p>
 <p className="font-semibold">{praticien.nom}</p>
 <p className="text-sm text-gray-600">{praticien.qualifications}</p>
 <p className="text-sm text-gray-600">Medical Council No.: {praticien.numeroEnregistrement}</p>
 
 {validationStatus === 'validated' && documentSignatures.sickLeave ? (
 <div className="mt-4">
 <img 
 src={documentSignatures.sickLeave} 
 alt="Doctor's Signature" 
 className="ml-auto h-20 w-auto"
 style={{ maxWidth: '300px' }}
 />
 <p className="text-sm text-gray-600 mt-2">
 Digitally signed on {new Date().toLocaleDateString('en-GB')}
 </p>
 </div>
 ) : (
 <div className="mt-8">
 <p className="text-sm">_______________________________</p>
 <p className="text-sm">Doctor's Signature and Stamp</p>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 )
 }
 
 const InvoiceComponent = () => {
 const invoice = report?.invoice
 if (!invoice) return null

 return (
 <div id="invoice-document" className="bg-white p-8 rounded-lg shadow print:shadow-none">
 <div className="text-center mb-8 header">
 <h1 className="text-2xl font-bold mb-2">INVOICE</h1>
 <p className="text-lg">No.: {invoice.header.invoiceNumber}</p>
 <p className="text-sm text-gray-600">
 Consultation Date: {invoice.header.consultationDate} | 
 Invoice Date: {invoice.header.invoiceDate}
 </p>
 </div>

 <div className="mb-6 p-4 bg-blue-50 rounded-lg info-box">
 <h3 className="font-bold mb-2">Service Provider</h3>
 <p className="font-bold">{invoice.provider.companyName}</p>
 <p className="text-sm">Private company incorporated under Mauritian law</p>
 <div className="grid grid-cols-2 gap-2 text-sm mt-2">
 <div>Company Reg. No.: {invoice.provider.registrationNumber}</div>
 <div>VAT No.: {invoice.provider.vatNumber}</div>
 <div className="col-span-2">Registered Office: {invoice.provider.registeredOffice}</div>
 <div>Phone: {invoice.provider.phone}</div>
 <div>Email: {invoice.provider.email}</div>
 <div>Website: {invoice.provider.website}</div>
 <div className="col-span-2 font-medium">Trade Name: {invoice.provider.tradeName}</div>
 </div>
 <p className="text-sm mt-2 italic">
 Medical consultations provided by licensed physicians registered with the Medical Council of Mauritius
 </p>
 </div>

 <div className="mb-6 p-4 bg-gray-50 rounded-lg info-box">
 <h3 className="font-bold mb-2">Patient Information</h3>
 <div className="grid grid-cols-1 gap-1 text-sm">
 <div><strong>Name:</strong> {invoice.patient.name}</div>
 <div><strong>Email:</strong> {invoice.patient.email}</div>
 <div><strong>Phone Number:</strong> {invoice.patient.phone}</div>
 <div><strong>Tibok Patient ID:</strong> {invoice.patient.patientId}</div>
 </div>
 </div>

 <div className="mb-6">
 <h3 className="font-bold mb-4">Service Details</h3>
 <table className="w-full border-collapse invoice-table">
 <thead>
 <tr className="border-b-2 border-gray-300">
 <th className="text-left py-2">Description</th>
 <th className="text-center py-2">Quantity</th>
 <th className="text-right py-2">Unit Price (MUR)</th>
 <th className="text-right py-2">Total (MUR)</th>
 </tr>
 </thead>
 <tbody>
 {invoice.services.items.map((item: any, idx: number) => (
 <tr key={idx} className="border-b border-gray-200">
 <td className="py-2">{item.description}</td>
 <td className="text-center py-2">{item.quantity}</td>
 <td className="text-right py-2">{item.unitPrice.toLocaleString()}</td>
 <td className="text-right py-2 font-medium">{item.total.toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="border-t-2 border-gray-300">
 <td colSpan={3} className="text-right py-2">Subtotal (Excl. VAT):</td>
 <td className="text-right py-2">MUR {invoice.services.subtotal.toLocaleString()}</td>
 </tr>
 <tr>
 <td colSpan={3} className="text-right py-2">
 VAT ({(invoice.services.vatRate * 100).toFixed(0)}%):
 </td>
 <td className="text-right py-2">
 MUR {invoice.services.vatAmount.toLocaleString()}
 {invoice.services.vatAmount === 0 && (
 <span className="text-xs text-gray-600 block">
 (Exempt - medical services)
 </span>
 )}
 </td>
 </tr>
 <tr className="font-bold text-lg invoice-total">
 <td colSpan={3} className="text-right py-2">Total Due:</td>
 <td className="text-right py-2">MUR {invoice.services.totalDue.toLocaleString()}</td>
 </tr>
 </tfoot>
 </table>
 </div>

 <div className="mb-6 p-4 bg-teal-50 rounded-lg payment-info">
 <h3 className="font-bold mb-2">Payment Information</h3>
 {editMode && validationStatus !== 'validated' ? (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Payment Method</Label>
 <Select value={invoice.payment.method} onValueChange={updatePaymentMethod}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Credit Card">Credit Card</SelectItem>
 <SelectItem value="MCB Juice">MCB Juice</SelectItem>
 <SelectItem value="MyT Money">MyT Money</SelectItem>
 <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
 <SelectItem value="Cash">Cash</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>Payment Status</Label>
 <Select value={invoice.payment.status} onValueChange={updatePaymentStatus}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="pending">Pending</SelectItem>
 <SelectItem value="paid">Paid</SelectItem>
 <SelectItem value="cancelled">Cancelled</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><strong>Payment Method:</strong> {invoice.payment.method}</div>
 <div><strong>Payment Received On:</strong> {invoice.payment.receivedDate}</div>
 <div className="col-span-2">
 <strong>Status:</strong> 
 <Badge className={`ml-2 ${
 invoice.payment.status === 'paid' ? 'bg-teal-100 text-teal-800' :
 invoice.payment.status === 'pending' ? 'bg-cyan-100 text-cyan-800' :
 'bg-blue-100 text-blue-800'
 }`}>
 {invoice.payment.status.toUpperCase()}
 </Badge>
 </div>
 </div>
 )}
 </div>

 <div className="mt-6 flex justify-center print:hidden">
 <Button
 variant="outline"
 size="sm"
 onClick={() => exportSectionToPDF('invoice-document', `invoice_${invoice.header.invoiceNumber}.pdf`)}
 >
 <Download className="h-4 w-4 mr-2" />
 Export Invoice
 </Button>
 </div>
 </div>
 )
 }

 const ActionsBar = () => {
 const metadata = getReportMetadata()
 
 return (
 <Card className="print:hidden">
 <CardContent className="p-4">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-4">
 <Badge className={validationStatus === 'validated' ? 'bg-teal-100 text-teal-800' : 'bg-cyan-100 text-cyan-800'}>
 {validationStatus === 'validated' ? (
 <>
 <Lock className="h-3 w-3 mr-1" />
 Document validated & signed
 </>
 ) : (
 <>
 <Unlock className="h-3 w-3 mr-1" />
 Draft - awaiting validation
 </>
 )}
 </Badge>
 <span className="text-sm text-gray-600">
 {metadata.wordCount} words
 </span>
 </div>
 <div className="flex gap-2">
 <Button
 variant={editMode ? 'default' : 'outline'}
 size="sm"
 onClick={() => setEditMode(!editMode)}
 disabled={validationStatus === 'validated'}
 >
 {editMode ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
 {editMode ? 'Preview' : 'Edit'}
 </Button>
 
 <Button
 variant="default"
 size="sm"
 onClick={handleValidation}
 disabled={saving || validationStatus === 'validated'}
 >
 {saving ? (
 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
 ) : (
 <FileCheck className="h-4 w-4 mr-2" />
 )}
 {validationStatus === 'validated' ? 'Validated' : 'Validate & Sign'}
 </Button>
 
 <Button variant="outline" size="sm" onClick={handlePrint}>
 <Printer className="h-4 w-4 mr-2" />
 Print all
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 )
 }

 const UnsavedChangesAlert = () => {
 if (!hasUnsavedChanges || validationStatus === 'validated') return null

 return (
 <Alert className="print:hidden">
 <AlertTriangle className="h-4 w-4" />
 <AlertDescription>
 You have unsaved changes. Click the Save button or press Ctrl+S to save.
 </AlertDescription>
 </Alert>
 )
 }

 const PrescriptionStats = () => {
 const medicamentCount = report?.ordonnances?.medicaments?.prescription?.medicaments?.length || 0
 const bioCount = Object.values(report?.ordonnances?.biologie?.prescription?.analyses || {})
 .reduce((acc: number, tests: any) => acc + (Array.isArray(tests) ? tests.length : 0), 0)
 const imagingCount = report?.ordonnances?.imagerie?.prescription?.examens?.length || 0

 return (
 <Card className="print:hidden">
 <CardHeader>
 <CardTitle className="text-lg">Prescription Summary</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-3 gap-4 text-center">
 <div className="p-4 bg-teal-50 rounded">
 <Pill className="h-8 w-8 mx-auto mb-2 text-teal-600" />
 <p className="text-2xl font-bold text-teal-600">{medicamentCount}</p>
 <p className="text-sm text-gray-600">Medications</p>
 </div>
 <div className="p-4 bg-blue-50 rounded">
 <TestTube className="h-8 w-8 mx-auto mb-2 text-blue-600" />
 <p className="text-2xl font-bold text-blue-600">{bioCount}</p>
 <p className="text-sm text-gray-600">Lab Tests</p>
 </div>
 <div className="p-4 bg-blue-50 rounded">
 <Scan className="h-8 w-8 mx-auto mb-2 text-blue-600" />
 <p className="text-2xl font-bold text-blue-600">{imagingCount}</p>
 <p className="text-sm text-gray-600">Imaging</p>
 </div>
 </div>
 </CardContent>
 </Card>
 )
 }

 // ==================== MAIN RENDER ====================
 return (
 <div className="space-y-6 print:space-y-4">
 <ActionsBar />
 <UnsavedChangesAlert />
 <DoctorInfoEditor />
 <PrescriptionStats />

 <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
 <TabsList className="flex flex-wrap w-full gap-1">
 <TabsTrigger value="consultation">
 <FileText className="h-4 w-4 mr-2" />
 Report
 </TabsTrigger>
 <TabsTrigger value="medicaments">
 <Pill className="h-4 w-4 mr-2" />
 Medications
 {report?.ordonnances?.medicaments?.prescription?.medicaments?.length > 0 && (
 <Badge variant="secondary" className="ml-2">
 {report.ordonnances.medicaments.prescription.medicaments.length}
 </Badge>
 )}
 </TabsTrigger>
 <TabsTrigger value="biologie">
 <TestTube className="h-4 w-4 mr-2" />
 Laboratory
 {report?.ordonnances?.biologie && (
 <Badge variant="secondary" className="ml-2">
 {Object.values(report.ordonnances.biologie.prescription.analyses || {})
 .reduce((acc: number, tests: any) => acc + (Array.isArray(tests) ? tests.length : 0), 0)}
 </Badge>
 )}
 </TabsTrigger>
<TabsTrigger value="imagerie">
 <Scan className="h-4 w-4 mr-2" />
 Imaging
 {report?.ordonnances?.imagerie?.prescription?.examens?.length > 0 && (
 <Badge variant="secondary" className="ml-2">
 {report.ordonnances.imagerie.prescription.examens.length}
 </Badge>
 )}
 </TabsTrigger>
 <TabsTrigger value="sickleave">
 <Calendar className="h-4 w-4 mr-2" />
 Sick Leave
 {report?.ordonnances?.arretMaladie && (
 <Badge variant="secondary" className="ml-2">1</Badge>
 )}
 </TabsTrigger>
 <TabsTrigger value="invoice">
 <Receipt className="h-4 w-4 mr-2" />
 Invoice
 </TabsTrigger>
 <TabsTrigger value="ai-assistant" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold shadow-lg hover:from-teal-600 hover:to-cyan-600 data-[state=active]:ring-2 data-[state=active]:ring-yellow-400">
 <Brain className="h-4 w-4 mr-2 animate-pulse" />
 🤖 AI Assistant
 </TabsTrigger>
 </TabsList>

 <TabsContent value="consultation">
 <ConsultationReport />
 </TabsContent>
 
 <TabsContent value="medicaments">
 <MedicationPrescription />
 </TabsContent>
 
 <TabsContent value="biologie">
 <BiologyPrescription />
 </TabsContent>
 
<TabsContent value="imagerie">
 <ImagingPrescription />
 </TabsContent>
 
 <TabsContent value="sickleave">
 <SickLeaveCertificate />
 </TabsContent>

 <TabsContent value="invoice">
 <InvoiceComponent />
 </TabsContent>
 
 <TabsContent value="ai-assistant">
 <TibokMedicalAssistant
 reportData={report}
 onUpdateSection={(section, value) => {
 updateRapportSection(section, value)
 }}
 onAddMedication={(medication) => {
 // Direct creation: no add+update pattern - create complete medication immediately
 console.log('💊 CALLBACK onAddMedication called:', medication)
 if (validationStatus === 'validated') {
 console.log('⚠️ CALLBACK onAddMedication BLOCKED - document validated')
 return
 }
 
 const medicationWithDefaults = {
 nom: medication.nom || medication.name || '',
 denominationCommune: medication.denominationCommune || medication.generic_name || medication.dci || '',
 dosage: medication.dosage || '',
 forme: medication.forme || medication.form || 'tablet',
 posologie: medication.posologie || medication.dosing || '',
 modeAdministration: medication.voieAdministration || medication.modeAdministration || medication.route || 'Oral route',
 dureeTraitement: medication.dureeTraitement || medication.duration || '7 days',
 quantite: medication.quantite || medication.quantity || '1 box',
 instructions: medication.instructions || '',
 justification: medication.justification || medication.indication || '',
 surveillanceParticuliere: medication.surveillanceParticuliere || medication.monitoring || '',
 nonSubstituable: medication.nonSubstituable || false,
 ligneComplete: ''
 }
 
 setReport(prev => {
 if (!prev) return prev
 
 const newReport = JSON.parse(JSON.stringify(prev))
 
 // Ensure ordonnances structure exists
 if (!newReport.ordonnances) newReport.ordonnances = {}
 if (!newReport.ordonnances.medicaments) newReport.ordonnances.medicaments = {}
 if (!newReport.ordonnances.medicaments.prescription) {
 newReport.ordonnances.medicaments.prescription = {
 praticien: { nom: '', prenom: '', qualite: '' },
 patient: { nom: '', prenom: '', dateNaissance: '', numeroSecuriteSociale: '' },
 date: new Date().toISOString(),
 medicaments: []
 }
 }
 
 // Add medication directly to the array
 newReport.ordonnances.medicaments.prescription.medicaments.push(medicationWithDefaults)
 
 console.log('💊 Medication added directly:', medicationWithDefaults)
 return newReport
 })
 }}
 onUpdateMedication={(index, medication) => {
 updateMedicamentBatch(index, medication)
 }}
 onRemoveMedication={(index) => {
 removeMedicament(index)
 }}
 onAddLabTest={(category, test) => {
 // Direct creation: no add+update pattern - create complete line immediately
 console.log('📋 CALLBACK onAddLabTest called:', {category, test})
 if (validationStatus === 'validated') {
 console.log('⚠️ CALLBACK onAddLabTest BLOCKED - document validated')
 return
 }
 
 const testWithDefaults = {
 nom: test.nom || '',
 code: test.code || '',
 categorie: category,
 urgence: test.urgence || false,
 aJeun: test.aJeun || false,
 conditionsPrelevement: test.conditionsPrelevement || '',
 motifClinique: test.motifClinique || test.indication || '',
 renseignementsCliniques: test.renseignementsCliniques || '',
 tubePrelevement: test.tubePrelevement || 'As per laboratory protocol',
 delaiResultat: test.delaiResultat || 'Standard'
 }
 
 setReport(prev => {
 if (!prev) return null
 const newReport = { ...prev }
 
 // Initialize biologie section if needed
 if (!newReport.ordonnances) newReport.ordonnances = {}
 if (!newReport.ordonnances.biologie) {
 const praticien = getReportPraticien()
 const patient = getReportPatient()
 newReport.ordonnances.biologie = {
 enTete: praticien,
 patient: patient,
 prescription: {
 datePrescription: patient.dateExamen || new Date().toISOString().split('T')[0],
 motifClinique: '',
 analyses: {},
 instructionsSpeciales: [],
 laboratoireRecommande: ''
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: praticien.nom.toUpperCase(),
 numeroEnregistrement: praticien.numeroEnregistrement,
 date: patient.dateExamen || new Date().toISOString().split('T')[0]
 }
 }
 }
 
 // Initialize category if needed
 if (!newReport.ordonnances.biologie.prescription.analyses) {
 newReport.ordonnances.biologie.prescription.analyses = {}
 }
 if (!newReport.ordonnances.biologie.prescription.analyses[category]) {
 newReport.ordonnances.biologie.prescription.analyses[category] = []
 }
 
 // Add complete test directly
 newReport.ordonnances.biologie.prescription.analyses[category] = [
 ...newReport.ordonnances.biologie.prescription.analyses[category], 
 testWithDefaults
 ]
 
 console.log('✅ CALLBACK onAddLabTest - Test added to biologie.prescription.analyses.' + category, testWithDefaults)
 return newReport
 })
 trackModification(`biologie.add.${category}.${test.nom}`)
 console.log('🎉 CALLBACK onAddLabTest - Complete!')
 }}
 onUpdateLabTest={(category, index, test) => {
 updateBiologyTestBatch(category, index, test)
 }}
 onRemoveLabTest={(category, index) => {
 removeBiologyTest(category, index)
 }}
 onAddImaging={(exam) => {
 // Direct creation: no add+update pattern - create complete line immediately
 console.log('🖼️ CALLBACK onAddImaging called:', exam)
 if (validationStatus === 'validated') {
 console.log('⚠️ CALLBACK onAddImaging BLOCKED - document validated')
 return
 }
 
 const examWithDefaults = {
 type: exam.type || exam.modalite || '',
 modalite: exam.modalite || exam.type || '',
 region: exam.region || exam.area || '',
 indicationClinique: exam.indicationClinique || exam.indication || '',
 urgence: exam.urgence || false,
 contraste: exam.contraste || false,
 instructions: exam.instructions || '',
 preparationPatient: exam.preparationPatient || '',
 delaiResultat: exam.delaiResultat || 'Standard',
 protocoleSpecifique: exam.protocoleSpecifique || '',
 questionDiagnostique: exam.questionDiagnostique || ''
 }
 
 setReport(prev => {
 if (!prev) return null
 const newReport = { ...prev }
 
 // Initialize imagerie section if needed
 if (!newReport.ordonnances) newReport.ordonnances = {}
 if (!newReport.ordonnances.imagerie) {
 const praticien = getReportPraticien()
 const patient = getReportPatient()
 newReport.ordonnances.imagerie = {
 enTete: praticien,
 patient: patient,
 prescription: {
 datePrescription: patient.dateExamen || new Date().toISOString().split('T')[0],
 examens: [],
 renseignementsCliniques: '',
 centreImagerie: ''
 },
 authentification: {
 signature: "Medical Practitioner's Signature",
 nomEnCapitales: praticien.nom.toUpperCase(),
 numeroEnregistrement: praticien.numeroEnregistrement,
 date: patient.dateExamen || new Date().toISOString().split('T')[0]
 }
 }
 }
 
 // Add complete exam directly
 newReport.ordonnances.imagerie.prescription.examens = [
 ...(newReport.ordonnances.imagerie.prescription.examens || []),
 examWithDefaults
 ]
 
 console.log('✅ CALLBACK onAddImaging - Exam added to imagerie.prescription.examens', examWithDefaults)
 return newReport
 })
 trackModification(`imagerie.add.${exam.type}`)
 console.log('🎉 CALLBACK onAddImaging - Complete!')
 }}
 onUpdateImaging={(index, exam) => {
 updateImagingExamBatch(index, exam)
 }}
 onRemoveImaging={(index) => {
 removeImagingExam(index)
 }}
 />
 </TabsContent>
 </Tabs>

 <div className="hidden print:block">
 <ConsultationReport />
 {includeFullPrescriptions && report?.ordonnances && (
 <>
 {report.ordonnances.medicaments && (
 <div className="page-break-before mt-8">
 <MedicationPrescription />
 </div>
 )}
 {report.ordonnances.biologie && (
 <div className="page-break-before mt-8">
 <BiologyPrescription />
 </div>
 )}
{report.ordonnances.imagerie && (
 <div className="page-break-before mt-8">
 <ImagingPrescription />
 </div>
 )}
 {report.ordonnances.arretMaladie && (
 <div className="page-break-before mt-8">
 <SickLeaveCertificate />
 </div>
 )}
 </>
 )}
 {report?.invoice && (
 <div className="page-break-before mt-8">
 <InvoiceComponent />
 </div>
 )}
 </div>

{validationStatus === 'validated' && (
 <div className="flex justify-center print:hidden mt-8">
 <Button 
 size="lg"
 onClick={handleSendDocuments}
 disabled={isSendingDocuments}
 className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSendingDocuments ? (
 <>
 <Loader2 className="h-5 w-5 mr-2 animate-spin" />
 Sending documents...
 </>
 ) : (
 <>
 <CheckCircle className="h-5 w-5 mr-2" />
 Finalize and Send documents
 </>
 )}
 </Button>
 </div>
)}

 {/* Manual Save Button (positioned left) */}
 {hasUnsavedChanges && (
 <div className="fixed bottom-4 left-4 z-50">
 <Button
 onClick={handleManualSave}
 className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
 size="lg"
 >
 <Save className="h-5 w-5 mr-2" />
 Save Changes
 </Button>
 </div>
 )}

 {/* Save Status Indicators (positioned left) */}
 {saveStatus === 'saving' && (
 <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
 <Loader2 className="h-4 w-4 animate-spin" />
 Saving...
 </div>
 )}
 {saveStatus === 'saved' && (
 <div className="fixed bottom-4 left-4 bg-teal-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
 <CheckCircle className="h-4 w-4" />
 Saved!
 </div>
 )}

 {/* Unsaved Changes Indicator (positioned top-left) */}
 {hasUnsavedChanges && (
 <div className="fixed top-4 left-4 bg-cyan-500 text-white px-3 py-1 rounded-full text-sm z-50">
 Unsaved changes
 </div>
 )}

{/* TIBOK Medical Assistant is now integrated as a tab - see AI Assistant tab */}
 </div>
 )
}
