"use client"
import MedicalAIAssistant from './MedicalAIAssistant'
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
import { 
  FileText, Download, Printer, CheckCircle, Loader2, Share2, Pill, TestTube, 
  Scan, AlertTriangle, XCircle, Eye, EyeOff, Edit, Save, FileCheck, Plus, 
  Trash2, AlertCircle, Lock, Unlock, Copy, ClipboardCheck, Stethoscope, 
  Calendar, User, Building, CreditCard, Receipt
} from "lucide-react"

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
      adresseCabinet: "Tibok Teleconsultation Platform",
      email: "[Email Required]",
      heuresConsultation: "Teleconsultation Hours: 8:00 AM - 8:00 PM",
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
      dateExamen: new Date().toISOString().split('T')[0]
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
  const [localValue, setLocalValue] = useState(value)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Update local value when parent value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Debounce the parent update
    timeoutRef.current = setTimeout(() => {
      onUpdate(newValue)
      if (onLocalChange) {
        onLocalChange()
      }
    }, 3000)
  }, [onUpdate, onLocalChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <Textarea
      value={localValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      data-section={sectionKey}
    />
  )
})

// 2. MedicationEditForm Component - CORRECTED VERSION
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
  const [localMed, setLocalMed] = useState({
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
  })

  // 🔧 ADD THIS: Track if there are changes
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  const handleFieldChange = useCallback((field: string, value: any) => {
    setLocalMed(prev => ({ ...prev, [field]: value }))
    setHasLocalChanges(true)
    if (onLocalChange) onLocalChange()
  }, [onLocalChange])

  // 🔧 ADD THIS: Auto-save effect with debouncing
  useEffect(() => {
    if (!hasLocalChanges) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      console.log(`Auto-saving medication ${index}...`)
      onUpdate(index, localMed)
      setHasLocalChanges(false)
    }, 2000) // Save after 2 seconds of inactivity

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [localMed, index, onUpdate, hasLocalChanges])

  // 🔧 ADD THIS: Save on unmount if there are pending changes
  useEffect(() => {
    return () => {
      if (hasLocalChanges) {
        console.log(`Saving medication ${index} on unmount...`)
        onUpdate(index, localMed)
      }
    }
  }, [])

  // Store the pending data for manual save (keep this as backup)
  useEffect(() => {
    const element = document.querySelector(`[data-medication-index="${index}"]`)
    if (element) {
      element.setAttribute('data-pending-medication', JSON.stringify(localMed))
    }
  }, [localMed, index])

  return (
    <div className="space-y-3" data-medication-index={index}>
      {/* 🔧 ADD THIS: Visual indicator of unsaved changes */}
      {hasLocalChanges && (
        <div className="text-xs text-yellow-600 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Auto-saving...
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`med-nom-${index}`}>Medication Name</Label>
          <Input
            id={`med-nom-${index}`}
            value={localMed.nom}
            onChange={(e) => handleFieldChange('nom', e.target.value)}
            placeholder="e.g., Paracetamol"
          />
        </div>
        <div>
          <Label htmlFor={`med-generic-${index}`}>Generic Name (INN)</Label>
          <Input
            id={`med-generic-${index}`}
            value={localMed.denominationCommune}
            onChange={(e) => handleFieldChange('denominationCommune', e.target.value)}
            placeholder="e.g., Paracetamol"
          />
        </div>
        <div>
          <Label htmlFor={`med-dosage-${index}`}>Dosage</Label>
          <Input
            id={`med-dosage-${index}`}
            value={localMed.dosage}
            onChange={(e) => handleFieldChange('dosage', e.target.value)}
            placeholder="e.g., 500mg"
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
            value={localMed.posologie}
            onChange={(e) => handleFieldChange('posologie', e.target.value)}
            placeholder="e.g., 1 tablet 3 times daily"
          />
        </div>
        <div>
          <Label htmlFor={`med-duration-${index}`}>Duration</Label>
          <Input
            id={`med-duration-${index}`}
            value={localMed.dureeTraitement}
            onChange={(e) => handleFieldChange('dureeTraitement', e.target.value)}
            placeholder="e.g., 7 days"
          />
        </div>
        <div>
          <Label htmlFor={`med-quantity-${index}`}>Quantity</Label>
          <Input
            id={`med-quantity-${index}`}
            value={localMed.quantite}
            onChange={(e) => handleFieldChange('quantite', e.target.value)}
            placeholder="e.g., 1 box"
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
          value={localMed.instructions}
          onChange={(e) => handleFieldChange('instructions', e.target.value)}
          placeholder="e.g., Take with food"
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
          {/* 🔧 ADD THIS: Manual save button as backup */}
          {hasLocalChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onUpdate(index, localMed)
                setHasLocalChanges(false)
                toast({
                  title: "Medication saved",
                  description: "Changes have been saved",
                  duration: 2000
                })
              }}
              type="button"
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove(index)}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
})

// 3. BiologyTestEditForm Component
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

  const handleFieldChange = useCallback((field: string, value: any) => {
    setLocalTest(prev => ({ ...prev, [field]: value }))
    if (onLocalChange) onLocalChange()
  }, [onLocalChange])

  // Store the pending data for manual save
  useEffect(() => {
    const element = document.querySelector(`[data-biology-test="${category}-${index}"]`)
    if (element) {
      element.setAttribute('data-pending-test', JSON.stringify(localTest))
    }
  }, [localTest, category, index])

  return (
    <div className="space-y-3 p-3" data-biology-test={`${category}-${index}`}>
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

  // 🔧 ADD THIS: Track if there are changes
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  const handleFieldChange = useCallback((field: string, value: any) => {
    setLocalExam(prev => ({ ...prev, [field]: value }))
    setHasLocalChanges(true)
    if (onLocalChange) onLocalChange()
  }, [onLocalChange])

  // 🔧 ADD THIS: Auto-save effect with debouncing
  useEffect(() => {
    if (!hasLocalChanges) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      console.log(`Auto-saving imaging exam ${index}...`)
      onUpdate(index, localExam)
      setHasLocalChanges(false)
    }, 2000) // Save after 2 seconds of inactivity

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [localExam, index, onUpdate, hasLocalChanges])

  // 🔧 ADD THIS: Save on unmount if there are pending changes
  useEffect(() => {
    return () => {
      if (hasLocalChanges) {
        console.log(`Saving imaging exam ${index} on unmount...`)
        onUpdate(index, localExam)
      }
    }
  }, [])

  // Store the pending data for manual save (keep this as backup)
  useEffect(() => {
    const element = document.querySelector(`[data-imaging-exam="${index}"]`)
    if (element) {
      element.setAttribute('data-pending-exam', JSON.stringify(localExam))
    }
  }, [localExam, index])

  return (
    <div className="space-y-3 p-3" data-imaging-exam={index}>
      {/* 🔧 ADD THIS: Visual indicator of unsaved changes */}
      {hasLocalChanges && (
        <div className="text-xs text-yellow-600 flex items-center gap-1">
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
        <div className="flex gap-2">
          {/* 🔧 ADD THIS: Manual save button as backup */}
          {hasLocalChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onUpdate(index, localExam)
                setHasLocalChanges(false)
                toast({
                  title: "Imaging exam saved",
                  description: "Changes have been saved",
                  duration: 2000
                })
              }}
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
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
  onComplete
}: ProfessionalReportProps) {

  // ==================== STATE MANAGEMENT ====================
  const [report, setReport] = useState<MauritianReport | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("consultation")

  const [editMode, setEditMode] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'draft' | 'validated'>('draft')
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showFullReport, setShowFullReport] = useState(false)
  const [includeFullPrescriptions, setIncludeFullPrescriptions] = useState(true)
  
  // 🔧 NEW: Manual save states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 🆕 ADD THESE THREE NEW STATE VARIABLES:
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true) // NEW: Track DB loading
  const [dbCheckComplete, setDbCheckComplete] = useState(false) // NEW: Track if DB check is done
  const [shouldGenerateReport, setShouldGenerateReport] = useState(false) // NEW: Control generation

  const [doctorInfo, setDoctorInfo] = useState({
    nom: "Dr. [Name Required]",
    qualifications: "MBBS",
    specialite: "General Medicine",
    adresseCabinet: "Tibok Teleconsultation Platform",
    email: "[Email Required]",
    heuresConsultation: "Teleconsultation Hours: 8:00 AM - 8:00 PM",
    numeroEnregistrement: "[MCM Registration Required]"
  })
  const [editingDoctor, setEditingDoctor] = useState(false)
  const [documentSignatures, setDocumentSignatures] = useState<{
    consultation?: string
    prescription?: string
    laboratory?: string
    imaging?: string
    invoice?: string
  }>({})

  // NOTE: Removed the sessionStorage.removeItem('reportLoaded') useEffect

  // ==================== SAFE GETTERS ====================
  const getReportHeader = () => report?.compteRendu?.header || createEmptyReport().compteRendu.header
  const getReportPraticien = () => report?.compteRendu?.praticien || doctorInfo
  const getReportPatient = () => report?.compteRendu?.patient || createEmptyReport().compteRendu.patient
  const getReportRapport = () => report?.compteRendu?.rapport || createEmptyReport().compteRendu.rapport
  const getReportMetadata = () => report?.compteRendu?.metadata || createEmptyReport().compteRendu.metadata
  // ==================== TRACKING & UPDATES (MUST BE FIRST) ====================
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

// ==================== BATCH UPDATE FUNCTIONS (AFTER trackModification) ====================
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
    newAnalyses[category] = [...newAnalyses[category]]
    newAnalyses[category][index] = updatedTest
    
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

// ==================== MANUAL SAVE FUNCTION (AFTER ALL DEPENDENCIES) ====================
const handleManualSave = useCallback(async () => {
  if (!hasUnsavedChanges) return
  
  setSaveStatus('saving')
  
  // Get consultation ID from URL params
  const params = new URLSearchParams(window.location.search)
  const consultationId = params.get('consultationId')
  const patientId = params.get('patientId') || patientData?.id
  const doctorId = params.get('doctorId')
  
  if (!consultationId || !patientId) {
    toast({
      title: "Error",
      description: "Missing consultation or patient information",
      variant: "destructive"
    })
    setSaveStatus('idle')
    return
  }
  
  // Just use the current report state - it already has all the updated text!
  let currentReport = report
  
  // Save all medications with updated report
  const medicationElements = document.querySelectorAll('[data-medication-index][data-pending-medication]')
  if (medicationElements.length > 0 && currentReport?.ordonnances?.medicaments) {
    const updatedMedications = [...(currentReport.ordonnances.medicaments.prescription.medicaments || [])]
    
    medicationElements.forEach((element: any) => {
      const index = parseInt(element.getAttribute('data-medication-index'))
      const pendingData = element.getAttribute('data-pending-medication')
      if (pendingData) {
        try {
          const medicationData = JSON.parse(pendingData)
          updatedMedications[index] = medicationData
        } catch (e) {
          console.error('Error parsing medication data:', e)
        }
      }
    })
    
    currentReport = {
      ...currentReport,
      ordonnances: {
        ...currentReport.ordonnances,
        medicaments: {
          ...currentReport.ordonnances.medicaments,
          prescription: {
            ...currentReport.ordonnances.medicaments.prescription,
            medicaments: updatedMedications
          }
        }
      }
    }
  }
  
  // Save all biology tests with updated report
  const biologyElements = document.querySelectorAll('[data-biology-test][data-pending-test]')
  if (biologyElements.length > 0 && currentReport?.ordonnances?.biologie) {
    const updatedAnalyses = { ...(currentReport.ordonnances.biologie.prescription.analyses || {}) }
    
    biologyElements.forEach((element: any) => {
      const testId = element.getAttribute('data-biology-test')
      const [category, index] = testId.split('-')
      const pendingData = element.getAttribute('data-pending-test')
      if (pendingData) {
        try {
          const testData = JSON.parse(pendingData)
          if (!updatedAnalyses[category]) {
            updatedAnalyses[category] = []
          }
          updatedAnalyses[category][parseInt(index)] = testData
        } catch (e) {
          console.error('Error parsing biology test data:', e)
        }
      }
    })
    
    currentReport = {
      ...currentReport,
      ordonnances: {
        ...currentReport.ordonnances,
        biologie: {
          ...currentReport.ordonnances.biologie,
          prescription: {
            ...currentReport.ordonnances.biologie.prescription,
            analyses: updatedAnalyses
          }
        }
      }
    }
  }
  
  // Save all imaging exams with updated report
  const imagingElements = document.querySelectorAll('[data-imaging-exam][data-pending-exam]')
  if (imagingElements.length > 0 && currentReport?.ordonnances?.imagerie) {
    const updatedExamens = [...(currentReport.ordonnances.imagerie.prescription.examens || [])]
    
    imagingElements.forEach((element: any) => {
      const index = parseInt(element.getAttribute('data-imaging-exam'))
      const pendingData = element.getAttribute('data-pending-exam')
      if (pendingData) {
        try {
          const examData = JSON.parse(pendingData)
          updatedExamens[index] = examData
        } catch (e) {
          console.error('Error parsing imaging exam data:', e)
        }
      }
    })
    
    currentReport = {
      ...currentReport,
      ordonnances: {
        ...currentReport.ordonnances,
        imagerie: {
          ...currentReport.ordonnances.imagerie,
          prescription: {
            ...currentReport.ordonnances.imagerie.prescription,
            examens: updatedExamens
          }
        }
      }
    }
  }
  
// Save to Supabase with the updated report
try {
  // Validate patient name before saving
  const patientName = getReportPatient().nomComplet || getReportPatient().nom || ''
  
  // List of invalid patient names to reject
  const invalidNames = [
    'Patient', 
    'Non spécifié', 
    '1 janvier 1970', 
    '01/01/1970',
    '1 January 1970',
    ''
  ]
  
  // Check if the name looks like a date (e.g., "1 janvier 1970" or "01/01/1970")
  const looksLikeDate = /^\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}$/.test(patientName) || 
                        /^\d{4}[\-\/]\d{2}[\-\/]\d{2}$/.test(patientName) ||
                        /^\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4}$/.test(patientName)
  
  if (!patientName || invalidNames.includes(patientName) || looksLikeDate) {
    console.error('❌ Invalid patient name detected:', patientName)
    toast({
      title: "Cannot save report",
      description: "Valid patient information is required. Please update patient details.",
      variant: "destructive"
    })
    setSaveStatus('idle')
    setHasUnsavedChanges(false) // Reset to prevent auto-save loop
    return // Stop execution here
  }

  // Also validate doctor name doesn't have duplicate "Dr."
  let validatedDoctorName = doctorInfo.nom
  if (validatedDoctorName.startsWith('Dr. Dr.')) {
    validatedDoctorName = validatedDoctorName.replace('Dr. Dr.', 'Dr.')
  }

  const response = await fetch('/api/save-medical-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consultationId,
      patientId,
      doctorId,
      doctorName: validatedDoctorName, // Use cleaned doctor name
      patientName: patientName, // Now validated
      report: currentReport,
      action: 'save',
      metadata: {
        wordCount: getReportMetadata().wordCount,
        signatures: documentSignatures,
        documentValidations: {},
        modifiedSections: Array.from(modifiedSections)
      },
      // Include the original data for complete storage
      patientData: patientData,
      clinicalData: clinicalData,
      diagnosisData: diagnosisData
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save report')
  }
  
  const result = await response.json()
  console.log('✅ Save successful:', result)
  
  setHasUnsavedChanges(false)
  setSaveStatus('saved')
  
  setTimeout(() => {
    setSaveStatus('idle')
  }, 3000)
  
  toast({
    title: "✅ Changes Saved",
    description: "Your changes have been saved to the database",
    duration: 3000
  })
  
} catch (error) {
  console.error('Save error:', error)
  setSaveStatus('idle')
  toast({
    title: "Error",
    description: error instanceof Error ? error.message : "Failed to save changes",
    variant: "destructive"
  })
}
}, [hasUnsavedChanges, report, doctorInfo, patientData, clinicalData, diagnosisData, documentSignatures, modifiedSections, getReportPatient, getReportMetadata])
  
  // ==================== KEYBOARD SHORTCUT FOR SAVE ====================
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (hasUnsavedChanges) {
        handleManualSave()
      }
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [hasUnsavedChanges, handleManualSave])

// Auto-save every 30 seconds if there are unsaved changes
useEffect(() => {
  const autoSaveInterval = setInterval(() => {
    if (hasUnsavedChanges && !saving && validationStatus !== 'validated') {
      console.log('⏰ Auto-saving changes...')
      handleManualSave()
    }
  }, 30000) // 30 seconds
  
  return () => clearInterval(autoSaveInterval)
}, [hasUnsavedChanges, saving, validationStatus, handleManualSave])

// ==================== AI ASSISTANT CALLBACK FUNCTIONS ====================
// Immediate update function for AI (no debounce)
const handleUpdateSectionImmediate = useCallback((section: string, content: string) => {
  console.log('🚀 AI Assistant updating section immediately:', section, 'with content length:', content.length)
  
  if (validationStatus === 'validated') {
    toast({
      title: "❌ Document validé",
      description: "Impossible de modifier un document validé",
      variant: "destructive"
    })
    return
  }
  
  setSaveStatus('saving')
  
  // Main report sections
  const reportSections = [
    'motifConsultation', 'anamnese', 'antecedents', 'examenClinique',
    'syntheseDiagnostique', 'conclusionDiagnostique', 'priseEnCharge',
    'surveillance', 'conclusion'
  ]
  
  if (reportSections.includes(section)) {
    updateRapportSection(section, content)
    toast({
      title: "✅ Section mise à jour",
      description: `${section} a été améliorée par l'IA médicale`,
      duration: 3000
    })
    
    // Auto-save after AI update
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
    return
  }
  
  // Handle other sections
  switch (section) {
    case 'diagnosticConclusion':
      updateRapportSection('conclusionDiagnostique', content)
      break
    case 'managementPlan':
      updateRapportSection('priseEnCharge', content)
      break
    case 'followUpPlan':
      updateRapportSection('surveillance', content)
      break
    default:
      console.warn('Section non reconnue:', section)
      toast({
        title: "⚠️ Section non reconnue",
        description: `La section "${section}" n'a pas pu être mise à jour automatiquement`,
        variant: "destructive"
      })
  }
  
  setTimeout(() => {
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, 500)
}, [validationStatus, updateRapportSection])

// Add medication via AI
const handleAIAddMedication = useCallback((medicationData: any) => {
  console.log('🤖 AI Assistant adding medication:', medicationData)
  
  if (validationStatus === 'validated') {
    toast({
      title: "❌ Document validé",
      description: "Impossible de modifier un document validé",
      variant: "destructive"
    })
    return
  }

  setSaveStatus('saving')

  try {
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
        medicationData
      ]
      
      return newReport
    })
    
    trackModification('medicaments.ai_add')
    
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
    
    toast({
      title: "✅ Médicament ajouté",
      description: `${medicationData.nom} ajouté à la prescription par l'IA`,
      duration: 4000
    })
    
    console.log('✅ Medication added successfully via AI')
  } catch (error) {
    console.error('❌ Error adding medication via AI:', error)
    setSaveStatus('idle')
    throw error
  }
}, [validationStatus, getReportPraticien, getReportPatient, trackModification])

// Add lab test via AI
const handleAIAddLabTest = useCallback((category: string, testData: any) => {
  console.log('🤖 AI Assistant adding lab test:', { category, testData })
  
  if (validationStatus === 'validated') {
    toast({
      title: "❌ Document validé",
      description: "Impossible de modifier un document validé",
      variant: "destructive"
    })
    return
  }

  setSaveStatus('saving')

  try {
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
        testData
      ]
      
      return newReport
    })
    
    trackModification(`biologie.ai_add.${category}`)
    
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
    
    toast({
      title: "✅ Analyse ajoutée",
      description: `${testData.nom} ajouté aux analyses biologiques par l'IA`,
      duration: 4000
    })
    
    console.log('✅ Lab test added successfully via AI')
  } catch (error) {
    console.error('❌ Error adding lab test via AI:', error)
    setSaveStatus('idle')
    throw error
  }
}, [validationStatus, getReportPraticien, getReportPatient, trackModification])

// Add imaging exam via AI
const handleAIAddImaging = useCallback((examData: any) => {
  console.log('🤖 AI Assistant adding imaging exam:', examData)
  
  if (validationStatus === 'validated') {
    toast({
      title: "❌ Document validé",
      description: "Impossible de modifier un document validé",
      variant: "destructive"
    })
    return
  }

  setSaveStatus('saving')

  try {
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
        examData
      ]
      
      return newReport
    })
    
    trackModification('imagerie.ai_add')
    
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
    
    toast({
      title: "✅ Imagerie ajoutée",
      description: `${examData.type} ajouté aux examens d'imagerie par l'IA`,
      duration: 4000
    })
    
    console.log('✅ Imaging exam added successfully via AI')
  } catch (error) {
    console.error('❌ Error adding imaging exam via AI:', error)
    setSaveStatus('idle')
    throw error
  }
}, [validationStatus, getReportPraticien, getReportPatient, trackModification])
  const updateDoctorInfo = useCallback((field: string, value: string) => {
  setDoctorInfo(prev => ({
    ...prev,
    [field]: value
  }))
  trackModification(`praticien.${field}`)
  const updatedInfo = { ...doctorInfo, [field]: value }
  sessionStorage.setItem('currentDoctorInfo', JSON.stringify(updatedInfo))
}, [doctorInfo, trackModification])

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

// ==================== LOAD DOCTOR DATA ====================
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const doctorDataParam = urlParams.get('doctorData')
  
  if (doctorDataParam) {
    try {
      const tibokDoctorData = JSON.parse(decodeURIComponent(doctorDataParam))
      console.log('👨‍⚕️ Loading Tibok Doctor Data:', tibokDoctorData)
      
      const doctorInfoFromTibok = {
        nom: tibokDoctorData.fullName || tibokDoctorData.full_name ? 
          `Dr. ${tibokDoctorData.fullName || tibokDoctorData.full_name}` : 
          'Dr. [Name Required]',
        qualifications: tibokDoctorData.qualifications || 'MBBS',
        specialite: tibokDoctorData.specialty || 'General Medicine',
        adresseCabinet: tibokDoctorData.clinic_address || tibokDoctorData.clinicAddress || 'Tibok Teleconsultation Platform',
        email: tibokDoctorData.email || '[Email Required]',
        heuresConsultation: tibokDoctorData.consultation_hours || tibokDoctorData.consultationHours || 'Teleconsultation Hours: 8:00 AM - 8:00 PM',
        numeroEnregistrement: String(tibokDoctorData.medicalCouncilNumber || 
                            tibokDoctorData.medical_council_number || 
                            tibokDoctorData.mcm_reg_no ||  // Add this line
                            '[MCM Registration Required]')
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
  // 🆕 UPDATED: Load existing report from database
useEffect(() => {
  const loadExistingReport = async () => {
    const params = new URLSearchParams(window.location.search)
    const consultationId = params.get('consultationId')
    
    // Start loading
    setIsLoadingFromDb(true)
    setDbCheckComplete(false)
    
    if (!consultationId) {
      console.log('No consultationId provided')
      setIsLoadingFromDb(false)
      setDbCheckComplete(true)
      setShouldGenerateReport(false) // No consultation ID = don't generate
      return
    }
    
    try {
      console.log('🔍 Checking database for existing report...')
      const response = await fetch(`/api/save-medical-report?consultationId=${consultationId}`)
      
      if (!response.ok) {
        console.log('❌ Failed to fetch from database')
        setIsLoadingFromDb(false)
        setDbCheckComplete(true)
       
        // Only generate if we have patient data
        if (patientData && (patientData.name || (patientData.firstName && patientData.lastName))) {
          setShouldGenerateReport(true)
        }
        return
      }
      
      const result = await response.json()
      
      // Check if we have actual data
      if (result.success && result.data && result.data.content && Object.keys(result.data.content).length > 0) {
        console.log('✅ Found existing report in database')
        
        const loadedContent = result.data.content
        
        // Check if there's actual report content
        if (loadedContent.consultationReport && loadedContent.consultationReport.rapport) {
          const loadedReport = {
            compteRendu: loadedContent.consultationReport,
            ordonnances: loadedContent.prescriptions || {},
            invoice: loadedContent.invoice || null
          }
          
          // Apply the loaded report
          setReport(loadedReport)
          
          // Load doctor info if available
          if (loadedContent.consultationReport?.praticien) {
            setDoctorInfo(loadedContent.consultationReport.praticien)
            sessionStorage.setItem('currentDoctorInfo', JSON.stringify(loadedContent.consultationReport.praticien))
          }
          
          // Load other metadata
          if (loadedContent.editedSections) {
            setModifiedSections(new Set(loadedContent.editedSections))
          }
          
          setValidationStatus(result.data.status === 'validated' ? 'validated' : 'draft')
          setDocumentSignatures(result.data.signatures || {})
          
          setShouldGenerateReport(false) // Don't generate, we have a report
          
          toast({
            title: "Report loaded",
            description: "Previous report data has been restored",
            duration: 3000
          })
        } else {
          console.log('📄 No valid report content in database')
          // Only generate if we have real patient data
          if (patientData && (patientData.name || (patientData.firstName && patientData.lastName))) {
            setShouldGenerateReport(true)
          }
        }
      } else {
        console.log('📄 No report found in database')
        // Only generate if we have real patient data
        if (patientData && (patientData.name || (patientData.firstName && patientData.lastName))) {
          setShouldGenerateReport(true)
        }
      }
      
    } catch (error) {
      console.error('Error loading report:', error)
      // Only generate on error if we have real patient data
      if (patientData && (patientData.name || (patientData.firstName && patientData.lastName))) {
        setShouldGenerateReport(true)
      }
    } finally {
      setIsLoadingFromDb(false)
      setDbCheckComplete(true)
    }
  }
  
  loadExistingReport()
}, [patientData]) // Add patientData as dependency

// ==================== INITIAL DATA LOAD ====================
useEffect(() => {
  console.log("🚀 ProfessionalReportEditable mounted with data:", {
    hasPatientData: !!patientData,
    hasClinicalData: !!clinicalData,
    hasDiagnosisData: !!diagnosisData,
    hasQuestionsData: !!questionsData
  })
}, [])

// 🆕 UPDATED: Generate report only when explicitly told to
useEffect(() => {
  // Only proceed if DB check is complete and we should generate
  if (!dbCheckComplete || !shouldGenerateReport) {
    return
  }
  
  // Don't generate if we already have a report
  if (report) {
    console.log('📄 Report already exists, skipping generation')
    return
  }
  
  // Validate we have real patient data
  const hasValidPatientData = patientData && 
    (patientData.name || (patientData.firstName && patientData.lastName)) &&
    patientData.name !== 'Patient' &&
    patientData.name !== 'Non spécifié'
  
  if (!hasValidPatientData) {
    console.log('❌ No valid patient data, not generating report')
    setLoading(false)
    return
  }
  
  console.log('✅ Valid patient data found, generating report...')
  generateProfessionalReport()
  setShouldGenerateReport(false) // Reset flag after generation
  
}, [dbCheckComplete, shouldGenerateReport, report, patientData])
  // ==================== GENERATE REPORT ====================
const generateProfessionalReport = async () => {
  // 🆕 ADD THIS VALIDATION BLOCK AT THE START:
  const hasValidPatientData = patientData && 
    (patientData.name || (patientData.firstName && patientData.lastName)) &&
    patientData.name !== 'Patient' &&
    patientData.name !== 'Non spécifié'
  
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
  
  // EXISTING CODE CONTINUES HERE:
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
        includeFullPrescriptions
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", errorText)
      throw new Error(`HTTP Error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log("📥 Report received:", data)

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
            taille: apiReport.medicalReport?.patient?.height || '',
            identifiantNational: apiReport.medicalReport?.patient?.nationalId || '',
            dateExamen: apiReport.medicalReport?.patient?.examinationDate || new Date().toISOString().split('T')[0]
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
      
      // Map medications
      if (apiReport.prescriptions?.medications) {
        reportData.ordonnances!.medicaments = {
          enTete: currentDoctorInfo,
          patient: reportData.compteRendu.patient,
          prescription: {
            datePrescription: apiReport.prescriptions.medications.prescription?.prescriptionDate || new Date().toISOString().split('T')[0],
            medicaments: apiReport.prescriptions.medications.prescription?.medications?.map((med: any) => ({
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
              ligneComplete: med.fullDescription || ''
            })) || [],
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
    handleManualSave()
  }
  
  let currentReportId = reportId
  if (!currentReportId) {
    currentReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setReportId(currentReportId)
  }
  
  setSaving(true)
  try {
    const signatureSeed = `${doctorInfo.nom}_${doctorInfo.numeroEnregistrement}_signature`
    
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 80
    const ctx = canvas.getContext('2d')
    
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
    }
    
    const signatureDataUrl = canvas.toDataURL('image/png')
    
    const signatures = {
      consultation: signatureDataUrl,
      prescription: signatureDataUrl,
      laboratory: signatureDataUrl,
      imaging: signatureDataUrl,
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
  if (!report || validationStatus !== 'validated') {
    toast({
      title: "Cannot send documents",
      description: "Please validate the documents first",
      variant: "destructive"
    })
    return
  }
  
  try {
    toast({
      title: "📤 Sending documents...",
      description: "Preparing documents for patient dashboard"
    })
    
    const params = new URLSearchParams(window.location.search)
    const consultationId = params.get('consultationId')
    const patientId = params.get('patientId') || patientData?.id
    const doctorId = params.get('doctorId')

    if (!consultationId || !patientId) {
      toast({
        title: "Error",
        description: "Missing consultation or patient information",
        variant: "destructive"
      })
      return
    }

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

      if (process.env.NEXT_PUBLIC_TIBOK_URL) {
        console.log('📍 Using Tibok URL from environment:', process.env.NEXT_PUBLIC_TIBOK_URL)
        return process.env.NEXT_PUBLIC_TIBOK_URL
      }

      console.log('📍 Using default Tibok URL: https://tibok.mu')
      return 'https://tibok.mu'
    }

    const tibokUrl = getTibokUrl()

    const documentsPayload = {
      consultationId,
      patientId,
      doctorId,
      doctorName: doctorInfo.nom,
      patientName: getReportPatient().nomComplet || getReportPatient().nom,
      generatedAt: new Date().toISOString(),
      documents: {
        consultationReport: report.compteRendu ? {
          type: 'consultation_report',
          title: 'Medical Consultation Report',
          content: report.compteRendu,
          validated: true,
          validatedAt: report.compteRendu.metadata.validatedAt,
          signature: documentSignatures.consultation
        } : null,
        prescriptions: report.ordonnances?.medicaments ? {
          type: 'prescription',
          title: 'Medical Prescription',
          medications: report.ordonnances.medicaments.prescription.medicaments,
          validity: report.ordonnances.medicaments.prescription.validite,
          signature: documentSignatures.prescription,
          content: report.ordonnances.medicaments
        } : null,
        laboratoryRequests: report.ordonnances?.biologie ? {
          type: 'laboratory_request',
          title: 'Laboratory Request Form',
          tests: report.ordonnances.biologie.prescription.analyses,
          signature: documentSignatures.laboratory,
          content: report.ordonnances.biologie
        } : null,
        imagingRequests: report.ordonnances?.imagerie ? {
          type: 'imaging_request',
          title: 'Radiology Request Form',
          examinations: report.ordonnances.imagerie.prescription.examens,
          signature: documentSignatures.imaging,
          content: report.ordonnances.imagerie
        } : null,
        invoice: report.invoice ? {
          type: 'invoice',
          title: `Invoice ${report.invoice.header.invoiceNumber}`,
          content: report.invoice,
          signature: documentSignatures.invoice
        } : null
      }
    }

    console.log('📦 Sending documents payload to:', tibokUrl)

    const response = await fetch(`${tibokUrl}/api/send-to-patient-dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documentsPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Tibok API error:', errorText)
      throw new Error(`Failed to send documents: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ API Response:', result)

    if (result.success) {
      toast({
        title: "✅ Documents envoyés avec succès",
        description: "Les documents sont maintenant disponibles dans le tableau de bord du patient"
      })

      showSuccessModal()
      
    } else {
      throw new Error(result.error || "Failed to send documents")
    }
  } catch (error) {
    console.error("❌ Error sending documents:", error)
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
      
      button, .button, input, select, textarea { display: none !important; }
      
      @media print {
        body { margin: 0; }
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
// 🆕 UPDATED RENDER STATES WITH NEW LOADING CHECK
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
    patientData.name !== 'Non spécifié'
    
  if (!hasValidPatientData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
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
    <Card className="border-red-200 w-full">
      <CardContent className="text-center py-10">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 font-semibold mb-2">Error during generation</p>
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
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
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
    }, 5000)
    
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
                className={localDoctorInfo.nom.includes('[') ? 'border-red-500' : ''}
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
                className={localDoctorInfo.numeroEnregistrement.includes('[') ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                ref={(el) => { inputRefs.current['email'] = el }}
                value={localDoctorInfo.email}
                onChange={(e) => handleDoctorFieldChange('email', e.target.value)}
                placeholder="doctor@email.com"
                className={localDoctorInfo.email.includes('[') ? 'border-red-500' : ''}
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
              <p className="text-sm text-red-600">* Required fields must be completed before validation</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Name:</strong> {doctorInfo.nom}</div>
            <div><strong>Qualifications:</strong> {doctorInfo.qualifications}</div>
            <div><strong>Speciality:</strong> {doctorInfo.specialite}</div>
            <div><strong>Medical Council No.:</strong> {doctorInfo.numeroEnregistrement}</div>
            <div><strong>Email:</strong> {doctorInfo.email}</div>
            <div className="col-span-2"><strong>Clinic Address:</strong> {doctorInfo.adresseCabinet}</div>
            <div className="col-span-2"><strong>Consultation Hours:</strong> {doctorInfo.heuresConsultation}</div>
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
            <div className="col-span-2">{praticien.adresseCabinet}</div>
            <div className="col-span-2">{praticien.heuresConsultation}</div>
          </div>
        </div>

        <div className="mb-8 p-4 bg-gray-50 rounded-lg info-box">
          <h3 className="font-bold mb-2">Patient Identification</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Patient:</span> {patient.nomComplet || patient.nom || patientData?.name || 'N/A'}</div>
            <div><span className="font-medium">Age:</span> {patient.age || patientData?.age || 'N/A'}</div>
            <div><span className="font-medium">Gender:</span> {patient.sexe || patientData?.gender || 'N/A'}</div>
            <div><span className="font-medium">DOB:</span> {patient.dateNaissance || patientData?.dateOfBirth || 'N/A'}</div>
            {patient.identifiantNational && (
              <div><span className="font-medium">NID:</span> {patient.identifiantNational}</div>
            )}
            <div><span className="font-medium">Examination Date:</span> {patient.dateExamen || new Date().toLocaleDateString()}</div>
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
                    onUpdate={(value) => updateRapportSection(section.key, value)}
                    onLocalChange={() => setHasUnsavedChanges(true)}
                    className="min-h-[200px] font-sans text-gray-700"
                    placeholder="Enter text..."
                    sectionKey={section.key}
                  />
                ) : (
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {content}
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

        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <p>{metadata.complianceNote}</p>
          <p>Word count: {metadata.wordCount}</p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-300 signature">
          <div className="text-right">
            <p className="font-semibold">{praticien.nom}</p>
            <p className="text-sm text-gray-600">{praticien.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {praticien.numeroEnregistrement}</p>
            <p className="text-sm text-gray-600">{praticien.adresseCabinet}</p>
            
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
      <div className="border-b-2 border-green-600 pb-4 mb-6 header">
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
              key={index}
              className="border-l-4 border-green-500 pl-4 py-2 prescription-item"
            >
              {editMode && validationStatus !== 'validated' ? (
                <MedicationEditForm
                  medication={med}
                  index={index}
                  onUpdate={updateMedicamentBatch}
                  onRemove={removeMedicament}
                  onLocalChange={() => setHasUnsavedChanges(true)}
                />
              ) : (
                <div>
                  <div className="font-bold text-lg">
                    {index + 1}. {med.nom}
                    {med.nonSubstituable && (
                      <Badge className="ml-2 bg-red-100 text-red-800 badge badge-red">Non-substitutable</Badge>
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
      <div className="border-b-2 border-purple-600 pb-4 mb-6 header">
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

      <div className="mb-6 p-4 bg-purple-50 rounded info-box">
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
              <div key={key} className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-bold text-lg mb-3 text-purple-800 category-header">
                  {label}
                </h3>
                <div className="space-y-2">
                  {tests.map((test: any, idx: number) => (
                    <div key={idx} className="prescription-item">
                      {editMode && validationStatus !== 'validated' ? (
                        <BiologyTestEditForm
                          test={test}
                          category={key}
                          index={idx}
                          onUpdate={updateBiologyTestBatch}
                          onRemove={removeBiologyTest}
                          onLocalChange={() => setHasUnsavedChanges(true)}
                        />
                      ) : (
                        <div className="flex items-start justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium">
                              {test.nom}
                              {test.urgence && <Badge className="ml-2 bg-red-100 text-red-800 urgent badge badge-red">URGENT</Badge>}
                            </p>
                            {test.aJeun && (
                              <p className="text-sm text-orange-600 mt-1">⚠️ Fasting required</p>
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
            <div className="mt-6 p-4 bg-yellow-50 rounded">
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
      <div className="border-b-2 border-indigo-600 pb-4 mb-6 header">
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

      <div className="mb-6 p-4 bg-indigo-50 rounded info-box">
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
            <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2 prescription-item">
              {editMode && validationStatus !== 'validated' ? (
                <ImagingExamEditForm
                  exam={exam}
                  index={index}
                  onUpdate={updateImagingExamBatch}
                  onRemove={removeImagingExam}
                  onLocalChange={() => setHasUnsavedChanges(true)}
                />
              ) : (
                <div>
                  <div className="font-bold text-lg">
                    {index + 1}. {exam.type || exam.modalite}
                    {exam.urgence && <Badge className="ml-2 bg-red-100 text-red-800 urgent badge badge-red">URGENT</Badge>}
                  </div>
                  <p className="mt-1">
                    <span className="font-medium">Region:</span> {exam.region}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Clinical Indication:</span> {exam.indicationClinique}
                  </p>
                  {exam.contraste && (
                    <p className="mt-1 text-orange-600">
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

      <div className="mb-6 p-4 bg-green-50 rounded-lg payment-info">
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
                invoice.payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
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
            <Badge className={validationStatus === 'validated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
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
          <div className="p-4 bg-green-50 rounded">
            <Pill className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{medicamentCount}</p>
            <p className="text-sm text-gray-600">Medications</p>
          </div>
          <div className="p-4 bg-purple-50 rounded">
            <TestTube className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{bioCount}</p>
            <p className="text-sm text-gray-600">Lab Tests</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded">
            <Scan className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
            <p className="text-2xl font-bold text-indigo-600">{imagingCount}</p>
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
      <TabsList className="grid w-full grid-cols-5">
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
        <TabsTrigger value="invoice">
          <Receipt className="h-4 w-4 mr-2" />
          Invoice
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

      <TabsContent value="invoice">
        <InvoiceComponent />
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
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Finalize and Send documents
        </Button>
      </div>
    )}

    {/* 🔧 Manual Save Button (positioned left) */}
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

    {/* 🔧 Save Status Indicators (positioned left) */}
    {saveStatus === 'saving' && (
      <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Saving...
      </div>
    )}
    {saveStatus === 'saved' && (
      <div className="fixed bottom-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
        <CheckCircle className="h-4 w-4" />
        Saved!
      </div>
    )}

    {/* 🔧 Unsaved Changes Indicator (positioned top-left) */}
    {hasUnsavedChanges && (
      <div className="fixed top-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm z-50">
        Unsaved changes
      </div>
    )}

    {/* 🤖 AI Medical Assistant with all capabilities */}
    <MedicalAIAssistant
      reportData={report}
      onUpdateSection={handleUpdateSectionImmediate}
      onUpdateMedication={updateMedicamentBatch}
      onAddMedication={handleAIAddMedication}
      onUpdateLabTest={updateBiologyTestBatch}
      onAddLabTest={handleAIAddLabTest}
      onUpdateImaging={updateImagingExamBatch}
      onAddImaging={handleAIAddImaging}
      currentSection={activeTab === 'consultation' ? 'motifConsultation' : activeTab}
    />
  </div>
)
}
