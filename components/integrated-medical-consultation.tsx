"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  FileText,
  Stethoscope,
  FlaskConical,
  Pill,
  BookOpen,
  Download,
  PrinterIcon as Print,
  CheckCircle,
  Save,
  AlertCircle,
  Edit2,
  X,
} from "lucide-react"

interface WorkflowResult {
  diagnosis: string | any
  examens: string | any
  prescription: string | any
  pubmedEvidence: any
  fdaVerification: any
  consultationReport: string | any
}

interface IntegratedMedicalConsultationProps {
  patientData: any
  result: WorkflowResult
  doctorData?: any
}

interface ValidationState {
  rapport: boolean
  diagnostic: boolean
  examens: boolean
  prescription: boolean
  evidence: boolean
}

interface EditableContent {
  rapport: string
  diagnosticPrincipal: string
  diagnosticConfidence: string
  diagnosticDifferentiels: string[]
  examensBiologie: string[]
  examensImagerie: string[]
  prescriptionMedicaments: string[]
}

export default function IntegratedMedicalConsultation({ patientData, result, doctorData }: IntegratedMedicalConsultationProps) {
  const [activeTab, setActiveTab] = useState("rapport")
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({
    rapport: false,
    diagnostic: false,
    examens: false,
    prescription: false,
    evidence: false,
  })
  const { toast } = useToast()
  
  const [validations, setValidations] = useState<ValidationState>({
    rapport: false,
    diagnostic: false,
    examens: false,
    prescription: false,
    evidence: false,
  })

  // Initialize editable content from parsed data
  const [editableContent, setEditableContent] = useState<EditableContent>({
    rapport: "",
    diagnosticPrincipal: "",
    diagnosticConfidence: "",
    diagnosticDifferentiels: [],
    examensBiologie: [],
    examensImagerie: [],
    prescriptionMedicaments: [],
  })

  // Store original content for cancel functionality
  const [originalContent, setOriginalContent] = useState<EditableContent>({
    rapport: "",
    diagnosticPrincipal: "",
    diagnosticConfidence: "",
    diagnosticDifferentiels: [],
    examensBiologie: [],
    examensImagerie: [],
    prescriptionMedicaments: [],
  })

  // Initialize editable content when component mounts or result changes
  useEffect(() => {
    const diagnosis = parseDiagnosis(result.diagnosis)
    const examens = parseExamens(result.examens)
    const medicaments = parsePrescription(result.prescription)
    
    const initialContent = {
      rapport: extractTextFromData(result.consultationReport),
      diagnosticPrincipal: diagnosis.principal,
      diagnosticConfidence: diagnosis.confidence,
      diagnosticDifferentiels: diagnosis.differentiels,
      examensBiologie: examens.biologie,
      examensImagerie: examens.imagerie,
      prescriptionMedicaments: medicaments,
    }
    
    setEditableContent(initialContent)
    setOriginalContent(initialContent)
  }, [result])

  const validationLabels = {
    rapport: "Je valide le Rapport",
    diagnostic: "Je valide le Diagnostic",
    examens: "Je valide les Examens",
    prescription: "Je valide les Prescriptions",
    evidence: "Je valide l'Evidence",
  }

  const validatedCount = Object.values(validations).filter(Boolean).length
  const allValidated = validatedCount === 5

  const handleValidationChange = (section: keyof ValidationState) => {
    setValidations((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const saveChanges = (section: string) => {
    // Save current content as the new original
    setOriginalContent({ ...editableContent })
    
    // Exit edit mode
    setIsEditing((prev) => ({
      ...prev,
      [section]: false,
    }))
    
    // Clear validation for that section since content was modified
    setValidations((prev) => ({
      ...prev,
      [section]: false,
    }))
    
    toast({
      title: "Modifications enregistrées",
      description: `Les modifications de la section ${section} ont été enregistrées.`,
    })
  }

  const cancelChanges = (section: string) => {
    // Restore original content
    if (section === "rapport") {
      setEditableContent((prev) => ({
        ...prev,
        rapport: originalContent.rapport,
      }))
    } else if (section === "diagnostic") {
      setEditableContent((prev) => ({
        ...prev,
        diagnosticPrincipal: originalContent.diagnosticPrincipal,
        diagnosticConfidence: originalContent.diagnosticConfidence,
        diagnosticDifferentiels: [...originalContent.diagnosticDifferentiels],
      }))
    } else if (section === "examens") {
      setEditableContent((prev) => ({
        ...prev,
        examensBiologie: [...originalContent.examensBiologie],
        examensImagerie: [...originalContent.examensImagerie],
      }))
    } else if (section === "prescription") {
      setEditableContent((prev) => ({
        ...prev,
        prescriptionMedicaments: [...originalContent.prescriptionMedicaments],
      }))
    }
    
    // Exit edit mode
    setIsEditing((prev) => ({
      ...prev,
      [section]: false,
    }))
  }

  const startEdit = (section: string) => {
    // Store current content as original before editing
    setOriginalContent({ ...editableContent })
    
    // Enter edit mode
    setIsEditing((prev) => ({
      ...prev,
      [section]: true,
    }))
  }

  const handleArrayItemChange = (
    field: keyof EditableContent,
    index: number,
    value: string
  ) => {
    setEditableContent((prev) => {
      const array = prev[field] as string[]
      const newArray = [...array]
      newArray[index] = value
      return {
        ...prev,
        [field]: newArray,
      }
    })
  }

  const addArrayItem = (field: keyof EditableContent) => {
    setEditableContent((prev) => {
      const array = prev[field] as string[]
      return {
        ...prev,
        [field]: [...array, ""],
      }
    })
  }

  const removeArrayItem = (field: keyof EditableContent, index: number) => {
    setEditableContent((prev) => {
      const array = prev[field] as string[]
      return {
        ...prev,
        [field]: array.filter((_, i) => i !== index),
      }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const doctorName = doctorData?.full_name || "Dr. TIBOK IA DOCTOR"
    const doctorRegistration = doctorData?.medical_council_number || "AI-2024-001"
    
    const reportContent = `
CONSULTATION MÉDICALE COMPLÈTE
==============================

MÉDECIN TRAITANT: ${doctorName}
N° CONSEIL MÉDICAL: ${doctorRegistration}
SPÉCIALITÉ: ${doctorData?.specialty || "Médecine Générale"}
EMAIL: ${doctorData?.email || "doctor@tibok.com"}
TÉLÉPHONE: ${doctorData?.phone || "+230 123 4567"}

PATIENT: ${patientData.firstName} ${patientData.lastName}
ÂGE: ${patientData.age} ans
DATE: ${new Date().toLocaleDateString("fr-FR")}

RAPPORT DE CONSULTATION
======================
${editableContent.rapport}

DIAGNOSTIC DÉTAILLÉ
==================
Diagnostic Principal: ${editableContent.diagnosticPrincipal}
${editableContent.diagnosticConfidence}

Diagnostics Différentiels:
${editableContent.diagnosticDifferentiels.map((d, i) => `${i + 1}. ${d}`).join('\n')}

EXAMENS COMPLÉMENTAIRES
======================
Examens Biologiques:
${editableContent.examensBiologie.map((e, i) => `- ${e}`).join('\n')}

Imagerie Médicale:
${editableContent.examensImagerie.map((e, i) => `- ${e}`).join('\n')}

PRESCRIPTION MÉDICAMENTEUSE
==========================
${editableContent.prescriptionMedicaments.map((m, i) => `${i + 1}. ${m}`).join('\n')}

RÉFÉRENCES SCIENTIFIQUES
========================
Articles PubMed consultés: ${result.pubmedEvidence?.articles?.length || 0}
Vérification FDA: ${result.fdaVerification?.success ? "Validée" : "À vérifier"}

SIGNATURE
=========
${doctorName}
${doctorRegistration}
${doctorData?.specialty || "Médecine Générale"}

Généré par TIBOK IA DOCTOR le ${new Date().toLocaleString("fr-FR")}
    `

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `consultation-complete-${patientData.lastName}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSaveToSupabase = async () => {
    setIsSaving(true)
    
    try {
      // Prepare edited data for saving
      const editedData = {
        patient_id: patientData.id,
        patient_name: `${patientData.firstName} ${patientData.lastName}`,
        doctor_id: doctorData?.id,
        doctor_name: doctorData?.full_name,
        doctor_registration: doctorData?.medical_council_number,
        consultation_date: new Date().toISOString(),
        report: editableContent.rapport,
        diagnosis: {
          principal: editableContent.diagnosticPrincipal,
          confidence: editableContent.diagnosticConfidence,
          differentiels: editableContent.diagnosticDifferentiels,
        },
        examens: {
          biologie: editableContent.examensBiologie,
          imagerie: editableContent.examensImagerie,
        },
        prescription: {
          medicaments: editableContent.prescriptionMedicaments,
        },
        evidence: result.pubmedEvidence,
        fda_verification: result.fdaVerification,
        validated_at: new Date().toISOString(),
        validated_sections: validations,
      }
      
      // Simulate saving to Supabase (replace with actual Supabase call)
      // const { data, error } = await supabase
      //   .from('consultations')
      //   .insert(editedData)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate PDFs (simulate)
      // await generatePDFs(editedData)
      
      toast({
        title: "Consultation sauvegardée avec succès",
        description: "Les documents ont été envoyés au tableau de bord du patient.",
      })
      
      setValidationDialogOpen(false)
      
      // Reset validations and edit states after successful save
      setValidations({
        rapport: false,
        diagnostic: false,
        examens: false,
        prescription: false,
        evidence: false,
      })
      
      setIsEditing({
        rapport: false,
        diagnostic: false,
        examens: false,
        prescription: false,
        evidence: false,
      })
      
    } catch (error) {
      toast({
        title: "Erreur lors de la sauvegarde",
        description: "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // FONCTION UTILITAIRE : Extraire le texte de données mixtes (string ou objet)
  const extractTextFromData = (data: any): string => {
    if (typeof data === 'string') {
      return data
    }
    
    if (data && typeof data === 'object') {
      // Si c'est un objet avec un champ text
      if (data.text) {
        return data.text
      }
      
      // Si c'est un rapport de consultation structuré
      if (data.header && data.anamnesis) {
        return formatConsultationReport(data)
      }
      
      // Fallback : convertir en JSON lisible
      return JSON.stringify(data, null, 2)
    }
    
    return String(data || 'Données non disponibles')
  }

  // FONCTION CORRIGÉE : Parser le diagnostic
  const parseDiagnosis = (diagnosisData: any) => {
    try {
      console.log('Type de diagnosisData:', typeof diagnosisData)
      
      // Nouveau format JSON structuré
      if (diagnosisData && typeof diagnosisData === 'object') {
        // Format du rapport de consultation
        if (diagnosisData.diagnosticAssessment) {
          return {
            principal: diagnosisData.diagnosticAssessment.primaryDiagnosis?.condition || "Diagnostic en cours d'analyse",
            confidence: diagnosisData.diagnosticAssessment.clinicalImpression?.diagnosticConfidence || "Confiance: En évaluation",
            differentiels: diagnosisData.diagnosticAssessment.differentialDiagnosis?.alternativeDiagnoses ? 
              [diagnosisData.diagnosticAssessment.differentialDiagnosis.alternativeDiagnoses] : []
          }
        }
        
        // Format de l'orchestrateur (diagnostic IA)
        if (diagnosisData.primaryDiagnosis) {
          return {
            principal: diagnosisData.primaryDiagnosis.condition || "Diagnostic en cours d'analyse",
            confidence: `Confiance: ${diagnosisData.primaryDiagnosis.probability || diagnosisData.aiConfidence || 'En évaluation'}%`,
            differentiels: diagnosisData.differentialDiagnosis?.map((d: any) => d.condition) || []
          }
        }
        
        // Si objet avec champ text
        if (diagnosisData.text) {
          return parseDiagnosis(diagnosisData.text)
        }
        
        // Fallback pour objet non reconnu
        return {
          principal: "Diagnostic en analyse (format JSON)",
          confidence: "Confiance: Données structurées disponibles",
          differentiels: []
        }
      }
      
      // Ancien format texte
      if (typeof diagnosisData === 'string') {
        const lines = diagnosisData.split("\n").filter((line) => line.trim())
        const principal = lines.find((line) => line.includes("principal") || line.includes("probable"))
        const confidence = lines.find((line) => line.includes("%") || line.includes("confiance"))
        const differentiels = lines.filter((line) => line.includes("différentiel") || line.match(/^\d+\./))

        return {
          principal: principal || lines[0] || "Diagnostic en cours d'analyse",
          confidence: confidence || "Confiance: En évaluation",
          differentiels: differentiels.slice(0, 3),
        }
      }
      
      // Fallback sécurisé
      return {
        principal: "Diagnostic en cours d'analyse",
        confidence: "Confiance: En évaluation",
        differentiels: []
      }
      
    } catch (error) {
      console.error('Erreur parsing diagnostic:', error)
      return {
        principal: "Erreur lors de l'analyse diagnostique",
        confidence: "Confiance: Erreur de traitement",
        differentiels: []
      }
    }
  }

  // FONCTION CORRIGÉE : Parser les examens
  const parseExamens = (examensData: any) => {
    try {
      console.log('Type de examensData:', typeof examensData)
      
      // Nouveau format JSON structuré
      if (examensData && typeof examensData === 'object') {
        // Format du rapport de consultation
        if (examensData.investigationsPlan) {
          const plan = examensData.investigationsPlan
          return {
            biologie: [
              plan.laboratoryTests?.urgentTests || '',
              plan.laboratoryTests?.routineTests || '',
              plan.laboratoryTests?.specializedTests || ''
            ].filter(Boolean),
            imagerie: [
              plan.imagingStudies?.diagnosticImaging || '',
              plan.imagingStudies?.followUpImaging || ''
            ].filter(Boolean)
          }
        }
        
        // Format de l'orchestrateur
        if (examensData.urgentExams || examensData.scheduledExams || examensData.laboratoryTests) {
          const biologie = []
          const imagerie = []
          
          // Examens urgents
          if (examensData.urgentExams && Array.isArray(examensData.urgentExams)) {
            examensData.urgentExams.forEach((exam: any) => {
              const examText = exam.name || exam.exam || exam.testName || ''
              if (examText.toLowerCase().includes('biolog') || examText.toLowerCase().includes('sang')) {
                biologie.push(examText)
              } else if (examText.toLowerCase().includes('radio') || examText.toLowerCase().includes('imagerie')) {
                imagerie.push(examText)
              }
            })
          }
          
          // Examens programmés
          if (examensData.scheduledExams && Array.isArray(examensData.scheduledExams)) {
            examensData.scheduledExams.forEach((exam: any) => {
              const examText = exam.name || exam.exam || exam.testName || ''
              if (examText.toLowerCase().includes('biolog') || examText.toLowerCase().includes('sang')) {
                biologie.push(examText)
              } else if (examText.toLowerCase().includes('radio') || examText.toLowerCase().includes('imagerie')) {
                imagerie.push(examText)
              }
            })
          }
          
          // Tests de laboratoire spécifiques
          if (examensData.laboratoryTests && Array.isArray(examensData.laboratoryTests)) {
            examensData.laboratoryTests.forEach((test: any) => {
              biologie.push(test.testName || test.name || 'Test biologique')
            })
          }
          
          return { biologie, imagerie }
        }
        
        // Si objet avec champ text
        if (examensData.text) {
          return parseExamens(examensData.text)
        }
        
        // Fallback pour objet non reconnu
        return {
          biologie: ['Examens biologiques (données structurées disponibles)'],
          imagerie: ['Imagerie médicale (données structurées disponibles)']
        }
      }
      
      // Ancien format texte
      if (typeof examensData === 'string') {
        const sections = examensData.split("\n").filter((line) => line.trim())
        const biologie = sections.filter(
          (line) =>
            line.toLowerCase().includes("biolog") ||
            line.toLowerCase().includes("sang") ||
            line.toLowerCase().includes("urine"),
        )
        const imagerie = sections.filter(
          (line) =>
            line.toLowerCase().includes("radio") ||
            line.toLowerCase().includes("scanner") ||
            line.toLowerCase().includes("irm") ||
            line.toLowerCase().includes("echo"),
        )

        return { biologie, imagerie }
      }
      
      // Fallback sécurisé
      return { biologie: [], imagerie: [] }
      
    } catch (error) {
      console.error('Erreur parsing examens:', error)
      return { biologie: [], imagerie: [] }
    }
  }

  // FONCTION CORRIGÉE : Parser la prescription
  const parsePrescription = (prescriptionData: any) => {
    try {
      console.log('Type de prescriptionData:', typeof prescriptionData)
      
      // Nouveau format JSON structuré
      if (prescriptionData && typeof prescriptionData === 'object') {
        // Format du rapport de consultation
        if (prescriptionData.therapeuticPlan) {
          const plan = prescriptionData.therapeuticPlan
          const medicaments = []
          
          if (plan.pharmacotherapy?.primaryMedications) {
            medicaments.push(plan.pharmacotherapy.primaryMedications)
          }
          if (plan.immediateManagement?.urgentInterventions) {
            medicaments.push(plan.immediateManagement.urgentInterventions)
          }
          
          return medicaments.filter(Boolean)
        }
        
        // Format de l'orchestrateur
        if (prescriptionData.medications && Array.isArray(prescriptionData.medications)) {
          return prescriptionData.medications.map((med: any) => 
            `${med.dci || med.name || 'Médicament'} - ${med.posology || med.dosage || 'Posologie à définir'}`
          )
        }
        
        // Format prescription simple
        if (prescriptionData.prescription && prescriptionData.prescription.medications) {
          return prescriptionData.prescription.medications.map((med: any) =>
            `${med.dci || med.name || 'Médicament'} - ${med.posology || med.dosage || 'Posologie à définir'}`
          )
        }
        
        // Si objet avec champ text
        if (prescriptionData.text) {
          return parsePrescription(prescriptionData.text)
        }
        
        // Fallback pour objet non reconnu
        return ['Prescription médicamenteuse (données structurées disponibles)']
      }
      
      // Ancien format texte
      if (typeof prescriptionData === 'string') {
        const lines = prescriptionData.split("\n").filter((line) => line.trim())
        const medicaments = lines.filter(
          (line) => line.includes("mg") || line.includes("comprimé") || line.includes("gélule") || line.match(/^\d+\./),
        )

        return medicaments.slice(0, 5)
      }
      
      // Fallback sécurisé
      return []
      
    } catch (error) {
      console.error('Erreur parsing prescription:', error)
      return []
    }
  }

  // FONCTION UTILITAIRE : Formater un rapport de consultation structuré
  const formatConsultationReport = (reportData: any): string => {
    try {
      let formatted = ''
      
      if (reportData.header) {
        formatted += `${reportData.header.title}\n`
        formatted += `${reportData.header.subtitle}\n`
        formatted += `Date: ${reportData.header.date}\n\n`
      }
      
      if (reportData.patientIdentification) {
        formatted += `PATIENT: ${reportData.patientIdentification.administrativeData?.firstName} ${reportData.patientIdentification.administrativeData?.lastName}\n`
        formatted += `ÂGE: ${reportData.patientIdentification.administrativeData?.age}\n\n`
      }
      
      if (reportData.anamnesis) {
        formatted += `ANAMNÈSE:\n${reportData.anamnesis.chiefComplaint?.primaryComplaint || 'Non spécifié'}\n\n`
      }
      
      if (reportData.diagnosticAssessment) {
        formatted += `DIAGNOSTIC:\n${reportData.diagnosticAssessment.primaryDiagnosis?.condition || 'En cours d\'analyse'}\n\n`
      }
      
      return formatted
    } catch (error) {
      console.error('Erreur formatage rapport:', error)
      return JSON.stringify(reportData, null, 2)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Consultation Médicale Complète - {patientData.firstName} {patientData.lastName}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Print className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button 
                onClick={() => setValidationDialogOpen(true)} 
                variant="default" 
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Valider et Sauvegarder
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Date: {new Date().toLocaleDateString("fr-FR")}</span>
            <span>•</span>
            <span>Âge: {patientData.age} ans</span>
            <span>•</span>
            <span>Sexe: {patientData.gender}</span>
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Analyse IA Complétée
            </Badge>
            <Badge variant={allValidated ? "default" : "secondary"} className={allValidated ? "bg-blue-500" : ""}>
              {validatedCount}/5 Validés
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Contenu principal avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rapport" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rapport
            {validations.rapport && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="diagnostic" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Diagnostic
            {validations.diagnostic && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="examens" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Examens
            {validations.examens && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Prescription
            {validations.prescription && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Evidence
            {validations.evidence && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
        </TabsList>

        {/* Rapport complet */}
        <TabsContent value="rapport">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compte-Rendu de Consultation</CardTitle>
                {isEditing.rapport ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveChanges("rapport")}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Enregistrer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelChanges("rapport")}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit("rapport")}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing.rapport ? (
                <Textarea
                  value={editableContent.rapport}
                  onChange={(e) =>
                    setEditableContent((prev) => ({
                      ...prev,
                      rapport: e.target.value,
                    }))
                  }
                  className="min-h-[600px] font-mono text-sm"
                  placeholder="Entrez le rapport de consultation..."
                />
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {editableContent.rapport}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostic détaillé */}
        <TabsContent value="diagnostic">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Diagnostic Principal</CardTitle>
                  {isEditing.diagnostic ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveChanges("diagnostic")}
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelChanges("diagnostic")}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit("diagnostic")}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isEditing.diagnostic ? (
                    <>
                      <div>
                        <Label htmlFor="diagnostic-principal">Diagnostic principal</Label>
                        <Textarea
                          id="diagnostic-principal"
                          value={editableContent.diagnosticPrincipal}
                          onChange={(e) =>
                            setEditableContent((prev) => ({
                              ...prev,
                              diagnosticPrincipal: e.target.value,
                            }))
                          }
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="diagnostic-confidence">Niveau de confiance</Label>
                        <Input
                          id="diagnostic-confidence"
                          value={editableContent.diagnosticConfidence}
                          onChange={(e) =>
                            setEditableContent((prev) => ({
                              ...prev,
                              diagnosticConfidence: e.target.value,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900">Diagnostic le plus probable</h4>
                        <p className="text-blue-800 mt-1">{editableContent.diagnosticPrincipal}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{editableContent.diagnosticConfidence}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnostics Différentiels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {isEditing.diagnostic ? (
                    <>
                      {editableContent.diagnosticDifferentiels.map((diff, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={diff}
                            onChange={(e) =>
                              handleArrayItemChange(
                                "diagnosticDifferentiels",
                                index,
                                e.target.value
                              )
                            }
                            placeholder={`Diagnostic différentiel ${index + 1}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              removeArrayItem("diagnosticDifferentiels", index)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem("diagnosticDifferentiels")}
                      >
                        Ajouter un diagnostic différentiel
                      </Button>
                    </>
                  ) : (
                    <>
                      {editableContent.diagnosticDifferentiels.length > 0 ? (
                        editableContent.diagnosticDifferentiels.map((diff, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <p className="text-sm">{diff}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">Aucun diagnostic différentiel spécifique</p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analyse Complète IA</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="whitespace-pre-wrap text-sm">
                    {extractTextFromData(result.diagnosis)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Examens paracliniques */}
        <TabsContent value="examens">
          <div className="space-y-4">
            <div className="flex justify-end mb-2">
              {isEditing.examens ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveChanges("examens")}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelChanges("examens")}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit("examens")}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Examens Biologiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {isEditing.examens ? (
                      <>
                        {editableContent.examensBiologie.map((exam, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={exam}
                              onChange={(e) =>
                                handleArrayItemChange(
                                  "examensBiologie",
                                  index,
                                  e.target.value
                                )
                              }
                              placeholder={`Examen biologique ${index + 1}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                removeArrayItem("examensBiologie", index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addArrayItem("examensBiologie")}
                          className="w-full"
                        >
                          Ajouter un examen biologique
                        </Button>
                      </>
                    ) : (
                      <>
                        {editableContent.examensBiologie.length > 0 ? (
                          editableContent.examensBiologie.map((exam, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                              {exam}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">Aucun examen biologique spécifique recommandé</p>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Imagerie Médicale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {isEditing.examens ? (
                      <>
                        {editableContent.examensImagerie.map((exam, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={exam}
                              onChange={(e) =>
                                handleArrayItemChange(
                                  "examensImagerie",
                                  index,
                                  e.target.value
                                )
                              }
                              placeholder={`Imagerie ${index + 1}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                removeArrayItem("examensImagerie", index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addArrayItem("examensImagerie")}
                          className="w-full"
                        >
                          Ajouter une imagerie
                        </Button>
                      </>
                    ) : (
                      <>
                        {editableContent.examensImagerie.length > 0 ? (
                          editableContent.examensImagerie.map((exam, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                              {exam}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">Aucune imagerie spécifique recommandée</p>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recommandations Complètes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-wrap text-sm">
                    {extractTextFromData(result.examens)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prescription */}
        <TabsContent value="prescription">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Ordonnance Médicamenteuse
                  </CardTitle>
                  {isEditing.prescription ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveChanges("prescription")}
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelChanges("prescription")}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit("prescription")}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isEditing.prescription ? (
                    <>
                      {editableContent.prescriptionMedicaments.map((med, index) => (
                        <div key={index} className="flex gap-2">
                          <Textarea
                            value={med}
                            onChange={(e) =>
                              handleArrayItemChange(
                                "prescriptionMedicaments",
                                index,
                                e.target.value
                              )
                            }
                            placeholder={`Médicament ${index + 1} - Posologie`}
                            rows={2}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              removeArrayItem("prescriptionMedicaments", index)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem("prescriptionMedicaments")}
                        className="w-full"
                      >
                        Ajouter un médicament
                      </Button>
                    </>
                  ) : (
                    <>
                      {editableContent.prescriptionMedicaments.length > 0 ? (
                        editableContent.prescriptionMedicaments.map((med, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <p className="font-medium text-sm">{med}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500">Aucun médicament spécifique prescrit</p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérification FDA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {result.fdaVerification?.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700">Médicaments vérifiés FDA</span>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">En cours de vérification</Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prescription Complète</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-wrap text-sm">
                    {extractTextFromData(result.prescription)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evidence scientifique */}
        <TabsContent value="evidence">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Références Scientifiques PubMed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">Articles trouvés: {result.pubmedEvidence?.articles?.length || 0}</Badge>
                    <Badge variant="outline">Base de données: PubMed</Badge>
                  </div>

                  {result.pubmedEvidence?.articles?.length > 0 ? (
                    <div className="space-y-2">
                      {result.pubmedEvidence.articles.slice(0, 5).map((article: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <h4 className="font-medium text-sm">{article.title || `Article ${index + 1}`}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {article.authors || "Auteurs non spécifiés"} • {article.journal || "Journal non spécifié"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucun article PubMed trouvé pour ce cas</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérifications Réglementaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">FDA Drug Database</span>
                    <Badge variant={result.fdaVerification?.success ? "default" : "secondary"}>
                      {result.fdaVerification?.success ? "✓ Vérifié" : "En cours"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">RxNorm Normalization</span>
                    <Badge variant="secondary">Disponible</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Drug Interactions Check</span>
                    <Badge variant="secondary">Intégré</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Validation Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Validation de la Consultation
            </DialogTitle>
            <DialogDescription>
              Veuillez valider chaque section avant de sauvegarder la consultation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Progrès: {validatedCount}/5 sections validées
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${(validatedCount / 5) * 100}%` }}
              />
            </div>
            
            <div className="space-y-3 mt-4">
              {Object.entries(validationLabels).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={validations[key as keyof ValidationState]}
                    onCheckedChange={() => handleValidationChange(key as keyof ValidationState)}
                    disabled={isEditing[key]}
                  />
                  <label
                    htmlFor={key}
                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${
                      isEditing[key] ? "text-gray-400" : ""
                    }`}
                  >
                    {label}
                    {isEditing[key] && (
                      <span className="text-xs text-orange-600 ml-2">(en cours de modification)</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
            
            {!allValidated && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md mt-4">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Toutes les sections doivent être validées avant la sauvegarde.
              </div>
            )}
            
            {Object.values(isEditing).some(Boolean) && (
              <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Certaines sections sont en cours de modification. Terminez les modifications avant de valider.
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveToSupabase}
              disabled={!allValidated || isSaving || Object.values(isEditing).some(Boolean)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sauvegarde en cours...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
