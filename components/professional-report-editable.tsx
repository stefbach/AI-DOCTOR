// components/professional-report-editable.tsx
"use client"

import { useState, useEffect } from "react"
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
  FileText, 
  Download, 
  Printer, 
  CheckCircle,
  Loader2,
  Share2,
  Pill,
  TestTube,
  Scan,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Edit,
  Save,
  FileCheck,
  Plus,
  Trash2,
  AlertCircle,
  Lock,
  Unlock,
  Copy,
  ClipboardCheck,
  Stethoscope,
  Calendar,
  User,
  Building
} from "lucide-react"

// Types pour le format mauricien
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
      telephone: string
      email: string
      heuresConsultation: string
      numeroEnregistrement: string // Remplace RPPS
      licencePratique: string
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
      identifiantNational?: string // NID
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
    }
  }
  ordonnances?: {
    medicaments?: {
      enTete: any
      patient: any
      prescription: {
        datePrescription: string
        medicaments: any[]
        validite: string
        dispensationNote?: string
      }
      authentification: any
    }
    biologie?: {
      enTete: any
      patient: any
      prescription: {
        datePrescription: string
        motifClinique: string
        analyses: {
          haematology?: any[]
          clinicalChemistry?: any[]
          immunology?: any[]
          microbiology?: any[]
          endocrinology?: any[]
        }
        instructionsSpeciales: string[]
        laboratoireRecommande?: string
      }
      authentification: any
    }
    imagerie?: {
      enTete: any
      patient: any
      prescription: {
        datePrescription: string
        examens: any[]
        renseignementsCliniques: string
        centreImagerie?: string
      }
      authentification: any
    }
  }
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

export default function ProfessionalReportEditable({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  editedDocuments,
  onComplete
}: ProfessionalReportProps) {
  // États principaux
  const [report, setReport] = useState<MauritianReport | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("consultation")
  
  // États d'édition
  const [editMode, setEditMode] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'draft' | 'validated'>('draft')
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showFullReport, setShowFullReport] = useState(false)
  
  // États pour l'affichage
  const [includeFullPrescriptions, setIncludeFullPrescriptions] = useState(true)
  
  // États pour les informations du médecin
  const [doctorInfo, setDoctorInfo] = useState({
    nom: "Dr. [NOM DU MÉDECIN]",
    qualifications: "MBBS, MD (Medicine)",
    specialite: "Médecine Générale",
    adresseCabinet: "[Adresse complète du cabinet]",
    telephone: "[+230 XXX XXXX]",
    email: "[Email professionnel]",
    heuresConsultation: "Lun-Ven: 8h30-17h30, Sam: 8h30-12h30",
    numeroEnregistrement: "[Medical Council Registration No.]",
    licencePratique: "[Practice License No.]"
  })
  const [editingDoctor, setEditingDoctor] = useState(false)

  // Fonction helper pour gérer les objets bilingues
  const getString = (value: any): string => {
    if (!value) return ''
    
    // Si c'est déjà une chaîne
    if (typeof value === 'string') return value
    
    // Si c'est un objet bilingue
    if (typeof value === 'object') {
      // Priorité au français
      if (value.fr) return value.fr
      if (value.en) return value.en
      
      // Si c'est un autre type d'objet, essayer de le convertir
      return JSON.stringify(value)
    }
    
    // Pour tout autre type
    return String(value)
  }

  useEffect(() => {
    console.log("🚀 ProfessionalReportEditable mounted")
    console.log("📋 Données reçues:", {
      patientData,
      clinicalData,
      diagnosisData,
      editedDocuments
    })
    checkExistingReport()
  }, [])

  // Vérifier s'il existe déjà un rapport
  const checkExistingReport = async () => {
    try {
      const response = await fetch(`/api/save-medical-report?patientId=${patientData.id || 'temp'}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setReport(result.data.content)
        setReportId(result.data.id)
        setValidationStatus(result.data.status || 'draft')
        // Récupérer les infos du médecin si disponibles
        if (result.data.content.compteRendu.praticien) {
          setDoctorInfo(result.data.content.compteRendu.praticien)
        }
        toast({
          title: "Rapport existant trouvé",
          description: "Chargement du rapport précédent"
        })
      } else {
        // Pas de rapport existant, générer un nouveau
        generateProfessionalReport()
      }
    } catch (error) {
      console.log("Pas de rapport existant, génération d'un nouveau")
      generateProfessionalReport()
    }
  }

  // Suivre les modifications
  const trackModification = (section: string) => {
    if (validationStatus === 'validated') return
    setModifiedSections(prev => new Set(prev).add(section))
  }

  // Générer le rapport initial
  const generateProfessionalReport = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("📤 Génération du rapport avec format mauricien")
      
      const response = await fetch("/api/generate-consultation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
          diagnosisData,
          editedDocuments,
          includeFullPrescriptions
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("📥 Rapport reçu:", data)

      if (data.success && data.report) {
        const reportData = data.report
        
        // Mettre à jour les infos du médecin avec les données sauvegardées
        if (reportData.compteRendu?.praticien) {
          reportData.compteRendu.praticien = {
            ...doctorInfo,
            ...reportData.compteRendu.praticien
          }
        }
        
        setReport(reportData)
        setValidationStatus('draft')
        
        // Log pour debug
        console.log("📊 Prescriptions dans le rapport:", {
          medicaments: reportData.ordonnances?.medicaments?.prescription?.medicaments,
          biologie: reportData.ordonnances?.biologie?.prescription?.analyses,
          imagerie: reportData.ordonnances?.imagerie?.prescription?.examens
        })
        
        toast({
          title: "Rapport généré avec succès",
          description: `${data.metadata?.prescriptionsSummary?.medications || 0} médicaments, ${data.metadata?.prescriptionsSummary?.laboratoryTests || 0} analyses, ${data.metadata?.prescriptionsSummary?.imagingStudies || 0} imageries`
        })
      } else {
        throw new Error(data.error || "Erreur de génération")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue"
      setError(errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Mise à jour du rapport narratif
  const updateRapportSection = (section: string, value: string) => {
    if (validationStatus === 'validated') return
    
    setReport(prev => {
      if (!prev) return null
      return {
        ...prev,
        compteRendu: {
          ...prev.compteRendu,
          rapport: {
            ...prev.compteRendu.rapport,
            [section]: value
          }
        }
      }
    })
    trackModification(`rapport.${section}`)
  }

  // Mise à jour des informations du médecin
  const updateDoctorInfo = (field: string, value: string) => {
    setDoctorInfo(prev => ({
      ...prev,
      [field]: value
    }))
    trackModification(`praticien.${field}`)
  }

  // Mise à jour des médicaments
  const updateMedicament = (index: number, field: string, value: string) => {
    if (validationStatus === 'validated' || !report?.ordonnances?.medicaments) return
    
    setReport(prev => {
      if (!prev?.ordonnances?.medicaments) return prev
      
      const newReport = { ...prev }
      const meds = [...newReport.ordonnances.medicaments.prescription.medicaments]
      const med = meds[index]
      if (!med) return prev
      
      med[field] = value
      
      // Reconstruire la ligne complète pour l'affichage
      med.ligneComplete = `${med.nom} ${med.dosage ? `- ${med.dosage}` : ''}\n` +
                         `${med.posologie} - ${med.modeAdministration}\n` +
                         `Durée : ${med.dureeTraitement} - Quantité : ${med.quantite}`
      
      newReport.ordonnances.medicaments.prescription.medicaments = meds
      return newReport
    })
    trackModification(`medicament.${index}.${field}`)
  }

  // Ajouter un médicament
  const addMedicament = () => {
    if (validationStatus === 'validated') return
    
    const newMed = {
      nom: '',
      denominationCommune: '',
      dosage: '',
      forme: 'comprimé',
      posologie: '',
      modeAdministration: 'Voie orale',
      dureeTraitement: '7 jours',
      quantite: '1 boîte',
      instructions: '',
      justification: '',
      surveillanceParticuliere: '',
      nonSubstituable: false,
      ligneComplete: ''
    }
    
    setReport(prev => {
      if (!prev) return null
      
      // S'assurer que la structure existe
      if (!prev.ordonnances) {
        prev.ordonnances = {
          medicaments: {
            enTete: prev.compteRendu.praticien,
            patient: prev.compteRendu.patient,
            prescription: { 
              datePrescription: prev.compteRendu.patient.dateExamen,
              medicaments: [],
              validite: "3 months unless otherwise specified"
            },
            authentification: {
              signature: "Medical Practitioner's Signature",
              nomEnCapitales: prev.compteRendu.praticien.nom.toUpperCase(),
              numeroEnregistrement: prev.compteRendu.praticien.numeroEnregistrement,
              cachetProfessionnel: "Official Medical Stamp",
              date: prev.compteRendu.patient.dateExamen
            }
          }
        }
      }
      
      return {
        ...prev,
        ordonnances: {
          ...prev.ordonnances,
          medicaments: {
            ...prev.ordonnances.medicaments,
            prescription: {
              ...prev.ordonnances.medicaments.prescription,
              medicaments: [...(prev.ordonnances.medicaments.prescription.medicaments || []), newMed]
            }
          }
        }
      }
    })
    trackModification('medicaments.new')
  }

  // Supprimer un médicament
  const removeMedicament = (index: number) => {
    if (validationStatus === 'validated') return
    
    setReport(prev => {
      if (!prev?.ordonnances?.medicaments) return prev
      
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
  }

  // Ajouter un examen biologique
  const addBiologyTest = () => {
    if (validationStatus === 'validated') return
    
    const newTest = {
      nom: '',
      categorie: 'Clinical Chemistry',
      urgence: false,
      aJeun: false,
      conditionsPrelevement: '',
      motifClinique: '',
      renseignementsCliniques: '',
      tubePrelevement: 'Selon protocole laboratoire',
      delaiResultat: 'Standard'
    }
    
    // Implémenter l'ajout...
    toast({
      title: "Fonction en développement",
      description: "L'ajout d'examens biologiques sera disponible prochainement"
    })
  }

  // Sauvegarder le rapport
  const handleSave = async () => {
    if (!report) return
    
    setSaving(true)
    try {
      // Mettre à jour les infos du médecin dans le rapport
      const updatedReport = {
        ...report,
        compteRendu: {
          ...report.compteRendu,
          praticien: doctorInfo,
          metadata: {
            ...report.compteRendu.metadata,
            lastModified: new Date().toISOString(),
            modifiedSections: Array.from(modifiedSections),
            validationStatus
          }
        }
      }
      
      const response = await fetch('/api/save-medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          patientId: patientData.id || 'temp',
          report: updatedReport,
          action: 'save',
          metadata: {
            lastModified: new Date().toISOString(),
            modifiedSections: Array.from(modifiedSections),
            validationStatus
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setReportId(result.data.reportId)
        setModifiedSections(new Set())
        setReport(updatedReport)
        toast({
          title: "Sauvegarde réussie",
          description: "Les modifications ont été enregistrées"
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Valider le rapport
  const handleValidation = async () => {
    if (!report || modifiedSections.size > 0) {
      toast({
        title: "Attention",
        description: "Veuillez sauvegarder les modifications avant de valider",
        variant: "destructive"
      })
      return
    }
    
    setSaving(true)
    try {
      const updatedReport = {
        ...report,
        compteRendu: {
          ...report.compteRendu,
          praticien: doctorInfo,
          metadata: {
            ...report.compteRendu.metadata,
            validatedAt: new Date().toISOString(),
            validatedBy: doctorInfo.nom,
            validationStatus: 'validated' as const
          }
        }
      }
      
      const response = await fetch('/api/save-medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          patientId: patientData.id || 'temp',
          report: updatedReport,
          action: 'validate',
          metadata: {
            validatedAt: new Date().toISOString(),
            validatedBy: doctorInfo.nom,
            validationStatus: 'validated'
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setValidationStatus('validated')
        setEditMode(false)
        setReport(updatedReport)
        toast({
          title: "Validation réussie",
          description: "Le rapport a été validé et finalisé"
        })
        
        if (onComplete) {
          onComplete()
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Erreur de validation",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Exporter en PDF
  const exportSectionToPDF = (sectionId: string, filename: string) => {
    const element = document.getElementById(sectionId)
    if (!element) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            @page { 
              margin: 20mm; 
              size: A4 portrait;
            }
            body { 
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3 { color: #2c3e50; }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #3498db;
              padding-bottom: 20px;
            }
            .section { 
              margin-bottom: 20px;
              text-align: justify;
            }
            .prescription-item { 
              border-left: 4px solid #3498db; 
              padding-left: 15px; 
              margin: 15px 0;
              page-break-inside: avoid;
            }
            .urgent { 
              color: #e74c3c; 
              font-weight: bold; 
              text-transform: uppercase;
            }
            .info { 
              color: #7f8c8d; 
              font-style: italic; 
            }
            .patient-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .doctor-info {
              background: #e3f2fd;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .signature {
              margin-top: 50px;
              text-align: right;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .bilingual {
              font-style: italic;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  }

  const handlePrint = () => window.print()

  // États de chargement et erreur
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-lg font-semibold">Génération du compte rendu professionnel...</p>
            <p className="text-sm text-gray-600">Format conforme aux réglementations du Medical Council of Mauritius</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !report) {
    return (
      <Card className="border-red-200 w-full">
        <CardContent className="text-center py-10">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Erreur lors de la génération</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <Button onClick={generateProfessionalReport} variant="outline">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!report) return null

  // Composant pour l'édition des informations du médecin
  const DoctorInfoEditor = () => (
    <Card className="mb-6 print:hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Stethoscope className="h-5 w-5 mr-2" />
            Informations du Médecin
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingDoctor(!editingDoctor)}
          >
            {editingDoctor ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {editingDoctor ? 'Terminer' : 'Modifier'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editingDoctor ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom complet</Label>
              <Input
                value={doctorInfo.nom}
                onChange={(e) => updateDoctorInfo('nom', e.target.value)}
                placeholder="Dr. Jean DUPONT"
              />
            </div>
            <div>
              <Label>Qualifications</Label>
              <Input
                value={doctorInfo.qualifications}
                onChange={(e) => updateDoctorInfo('qualifications', e.target.value)}
                placeholder="MBBS, MD (Medicine)"
              />
            </div>
            <div>
              <Label>Spécialité</Label>
              <Input
                value={doctorInfo.specialite}
                onChange={(e) => updateDoctorInfo('specialite', e.target.value)}
                placeholder="Médecine Générale"
              />
            </div>
            <div>
              <Label>N° Enregistrement Medical Council</Label>
              <Input
                value={doctorInfo.numeroEnregistrement}
                onChange={(e) => updateDoctorInfo('numeroEnregistrement', e.target.value)}
                placeholder="MC/MD/12345"
              />
            </div>
            <div>
              <Label>N° Licence de Pratique</Label>
              <Input
                value={doctorInfo.licencePratique}
                onChange={(e) => updateDoctorInfo('licencePratique', e.target.value)}
                placeholder="PL/2024/123"
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={doctorInfo.telephone}
                onChange={(e) => updateDoctorInfo('telephone', e.target.value)}
                placeholder="+230 XXX XXXX"
              />
            </div>
            <div className="col-span-2">
              <Label>Adresse du Cabinet</Label>
              <Input
                value={doctorInfo.adresseCabinet}
                onChange={(e) => updateDoctorInfo('adresseCabinet', e.target.value)}
                placeholder="123 Royal Road, Port Louis"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Nom :</strong> {doctorInfo.nom}</div>
            <div><strong>Qualifications :</strong> {doctorInfo.qualifications}</div>
            <div><strong>Spécialité :</strong> {doctorInfo.specialite}</div>
            <div><strong>N° Medical Council :</strong> {doctorInfo.numeroEnregistrement}</div>
            <div><strong>N° Licence :</strong> {doctorInfo.licencePratique}</div>
            <div><strong>Téléphone :</strong> {doctorInfo.telephone}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Composant pour l'édition du rapport narratif
  const ConsultationReport = () => {
    const sections = [
      { key: 'motifConsultation', title: 'MOTIF DE CONSULTATION / CHIEF COMPLAINT' },
      { key: 'anamnese', title: 'ANAMNÈSE / HISTORY OF PRESENT ILLNESS' },
      { key: 'antecedents', title: 'ANTÉCÉDENTS / PAST MEDICAL HISTORY' },
      { key: 'examenClinique', title: 'EXAMEN CLINIQUE / PHYSICAL EXAMINATION' },
      { key: 'syntheseDiagnostique', title: 'SYNTHÈSE DIAGNOSTIQUE / DIAGNOSTIC SYNTHESIS' },
      { key: 'conclusionDiagnostique', title: 'CONCLUSION DIAGNOSTIQUE / DIAGNOSTIC CONCLUSION' },
      { key: 'priseEnCharge', title: 'PRISE EN CHARGE / MANAGEMENT PLAN' },
      { key: 'surveillance', title: 'SURVEILLANCE / FOLLOW-UP PLAN' },
      { key: 'conclusion', title: 'CONCLUSION / FINAL REMARKS' }
    ]

    return (
      <Card className="shadow-xl print:shadow-none">
        <CardContent className="p-8 print:p-12" id="consultation-report">
          {/* En-tête bilingue */}
          <div className="text-center mb-8 print:mb-12">
            <h1 className="text-2xl font-bold mb-2">{report.compteRendu.header.title}</h1>
            <p className="text-gray-600">{report.compteRendu.header.subtitle}</p>
            <p className="text-sm text-gray-500 mt-2">Reference / Référence : {report.compteRendu.header.reference}</p>
          </div>

          {/* Informations praticien */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg print:bg-transparent print:border print:border-gray-300 doctor-info">
            <h3 className="font-bold mb-2">Medical Practitioner / Praticien</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>{report.compteRendu.praticien.nom}</div>
              <div>{report.compteRendu.praticien.qualifications}</div>
              <div>{report.compteRendu.praticien.specialite}</div>
              <div>Medical Council Reg: {report.compteRendu.praticien.numeroEnregistrement}</div>
              <div>Practice License: {report.compteRendu.praticien.licencePratique}</div>
              <div>{report.compteRendu.praticien.telephone}</div>
            </div>
          </div>

          {/* Identification du patient */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg patient-info">
            <h3 className="font-bold mb-2">Patient Identification / Identification du patient</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Patient :</span> {report.compteRendu.patient.nomComplet}</div>
              <div><span className="font-medium">Age / Âge :</span> {report.compteRendu.patient.age}</div>
              <div><span className="font-medium">Gender / Sexe :</span> {report.compteRendu.patient.sexe}</div>
              <div><span className="font-medium">DOB / Date de naissance :</span> {report.compteRendu.patient.dateNaissance}</div>
              {report.compteRendu.patient.identifiantNational && (
                <div><span className="font-medium">NID :</span> {report.compteRendu.patient.identifiantNational}</div>
              )}
              <div><span className="font-medium">Examination Date / Date d'examen :</span> {report.compteRendu.patient.dateExamen}</div>
            </div>
          </div>

          {/* Bouton pour afficher/masquer le rapport complet */}
          <div className="mb-4 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullReport(!showFullReport)}
            >
              {showFullReport ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showFullReport ? "Masquer le rapport détaillé" : "Afficher le rapport complet"}
            </Button>
          </div>

          {/* Contenu du rapport médical */}
          <div className={`space-y-6 ${!showFullReport && !editMode ? 'max-h-96 overflow-hidden relative' : ''} print:max-h-none`}>
            {sections.map((section) => (
              report.compteRendu.rapport[section.key] && (
                <section key={section.key} className="space-y-2">
                  <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                  {editMode && validationStatus !== 'validated' ? (
                    <Textarea
                      value={report.compteRendu.rapport[section.key]}
                      onChange={(e) => updateRapportSection(section.key, e.target.value)}
                      className="min-h-[200px] font-sans text-gray-700"
                      placeholder="Saisir le texte..."
                    />
                  ) : (
                    <div className="prose prose-lg max-w-none">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {report.compteRendu.rapport[section.key]}
                      </p>
                    </div>
                  )}
                </section>
              )
            ))}
            
            {!showFullReport && !editMode && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent print:hidden" />
            )}
          </div>

          {/* Métadonnées */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
            <p>{report.compteRendu.metadata.complianceNote}</p>
            <p>Word count / Nombre de mots : {report.compteRendu.metadata.wordCount}</p>
          </div>

          {/* Signature */}
          <div className="mt-12 pt-8 border-t border-gray-300 signature">
            <div className="text-right">
              <p className="font-semibold">{report.compteRendu.praticien.nom}</p>
              <p className="text-sm text-gray-600">{report.compteRendu.praticien.qualifications}</p>
              <p className="text-sm text-gray-600">Medical Council Reg: {report.compteRendu.praticien.numeroEnregistrement}</p>
              <p className="text-sm text-gray-600">License: {report.compteRendu.praticien.licencePratique}</p>
              <p className="text-sm text-gray-600">{report.compteRendu.praticien.adresseCabinet}</p>
              <div className="mt-8">
                <p className="text-sm">_______________________________</p>
                <p className="text-sm">Signature & Official Stamp</p>
                <p className="text-sm">Date: {report.compteRendu.patient.dateExamen}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Composant pour l'édition des médicaments
  const MedicationPrescription = () => {
    const medications = report.ordonnances?.medicaments?.prescription?.medicaments || []
    
    if (!includeFullPrescriptions && report.prescriptionsResume) {
      return (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold mb-4">Prescription Summary / Résumé des prescriptions</h3>
            <p>{report.prescriptionsResume.medicaments}</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div id="prescription-medicaments" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">MEDICAL PRESCRIPTION / ORDONNANCE MÉDICAMENTEUSE</h2>
              <p className="text-gray-600 mt-1">Compliant with Medical Council & Pharmacy Act of Mauritius</p>
              <p className="text-sm text-gray-500 mt-1">
                {medications.length} medication{medications.length > 1 ? 's' : ''} prescribed
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
                onClick={() => exportSectionToPDF('prescription-medicaments', `prescription_${report.compteRendu.patient.nom}_${new Date().toISOString().split('T')[0]}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Informations patient pour l'ordonnance */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Patient :</strong> {report.compteRendu.patient.nomComplet}</div>
            <div><strong>Date :</strong> {report.compteRendu.patient.dateExamen}</div>
            <div><strong>Address / Adresse :</strong> {report.compteRendu.patient.adresse}</div>
            {report.compteRendu.patient.identifiantNational && (
              <div><strong>NID :</strong> {report.compteRendu.patient.identifiantNational}</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {medications.length > 0 ? (
            medications.map((med: any, index: number) => (
              <div key={index} className="border-l-4 border-green-500 pl-4 py-2 prescription-item">
                {editMode && validationStatus !== 'validated' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Medication Name / Nom du médicament</Label>
                        <Input
                          value={getString(med.nom)}
                          onChange={(e) => updateMedicament(index, 'nom', e.target.value)}
                          placeholder="Ex: Paracetamol"
                        />
                      </div>
                      <div>
                        <Label>Generic Name / DCI</Label>
                        <Input
                          value={getString(med.denominationCommune)}
                          onChange={(e) => updateMedicament(index, 'denominationCommune', e.target.value)}
                          placeholder="Ex: Paracetamol"
                        />
                      </div>
                      <div>
                        <Label>Dosage / Dosage</Label>
                        <Input
                          value={getString(med.dosage)}
                          onChange={(e) => updateMedicament(index, 'dosage', e.target.value)}
                          placeholder="Ex: 500mg"
                        />
                      </div>
                      <div>
                        <Label>Form / Forme</Label>
                        <Select
                          value={getString(med.forme)}
                          onValueChange={(value) => updateMedicament(index, 'forme', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comprimé">Tablet / Comprimé</SelectItem>
                            <SelectItem value="gélule">Capsule / Gélule</SelectItem>
                            <SelectItem value="sirop">Syrup / Sirop</SelectItem>
                            <SelectItem value="injection">Injection</SelectItem>
                            <SelectItem value="crème">Cream / Crème</SelectItem>
                            <SelectItem value="pommade">Ointment / Pommade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Frequency / Posologie</Label>
                        <Input
                          value={getString(med.posologie)}
                          onChange={(e) => updateMedicament(index, 'posologie', e.target.value)}
                          placeholder="Ex: 1 tablet 3 times daily"
                        />
                      </div>
                      <div>
                        <Label>Duration / Durée</Label>
                        <Input
                          value={getString(med.dureeTraitement)}
                          onChange={(e) => updateMedicament(index, 'dureeTraitement', e.target.value)}
                          placeholder="Ex: 7 days"
                        />
                      </div>
                      <div>
                        <Label>Quantity / Quantité</Label>
                        <Input
                          value={getString(med.quantite)}
                          onChange={(e) => updateMedicament(index, 'quantite', e.target.value)}
                          placeholder="Ex: 1 box"
                        />
                      </div>
                      <div>
                        <Label>Route / Voie d'administration</Label>
                        <Select
                          value={getString(med.modeAdministration)}
                          onValueChange={(value) => updateMedicament(index, 'modeAdministration', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Voie orale">Oral / Voie orale</SelectItem>
                            <SelectItem value="Voie sublinguale">Sublingual / Voie sublinguale</SelectItem>
                            <SelectItem value="Voie topique">Topical / Voie topique</SelectItem>
                            <SelectItem value="Voie parentérale">Parenteral / Voie parentérale</SelectItem>
                            <SelectItem value="Voie rectale">Rectal / Voie rectale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Special Instructions / Instructions spéciales</Label>
                      <Input
                        value={getString(med.instructions)}
                        onChange={(e) => updateMedicament(index, 'instructions', e.target.value)}
                        placeholder="Ex: Take with food"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={med.nonSubstituable}
                          onCheckedChange={(checked) => updateMedicament(index, 'nonSubstituable', checked.toString())}
                        />
                        <Label>Non-substitutable / Non substituable</Label>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMedicament(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-lg">
                      {index + 1}. {getString(med.nom)}
                      {med.nonSubstituable && (
                        <Badge className="ml-2 bg-red-100 text-red-800">Non-substitutable</Badge>
                      )}
                    </div>
                    {med.denominationCommune && getString(med.denominationCommune) !== getString(med.nom) && (
                      <p className="text-sm text-gray-600">Generic / DCI : {getString(med.denominationCommune)}</p>
                    )}
                    <p className="mt-1">
                      <span className="font-medium">Form / Forme :</span> {getString(med.forme)} - {getString(med.dosage)}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Frequency / Posologie :</span> {getString(med.posologie)}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Route / Voie :</span> {getString(med.modeAdministration)}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Duration / Durée :</span> {getString(med.dureeTraitement)}
                    </p>
                    {med.quantite && (
                      <p className="mt-1">
                        <span className="font-medium">Quantity / Quantité :</span> {getString(med.quantite)}
                      </p>
                    )}
                    {med.instructions && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        ℹ️ {getString(med.instructions)}
                      </p>
                    )}
                    {med.justification && (
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Indication :</span> {getString(med.justification)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No medications prescribed / Aucun médicament prescrit</p>
              {editMode && (
                <Button onClick={addMedicament} className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Medication
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Validity and signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <p className="text-sm text-gray-600 mb-4">
            Validity / Validité : {report.ordonnances?.medicaments?.prescription?.validite || "3 months unless otherwise specified"}
          </p>
          <div className="text-right signature">
            <p className="font-semibold">{report.compteRendu.praticien.nom}</p>
            <p className="text-sm text-gray-600">{report.compteRendu.praticien.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {report.compteRendu.praticien.numeroEnregistrement}</p>
            <p className="text-sm text-gray-600">License: {report.compteRendu.praticien.licencePratique}</p>
            <div className="mt-8">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Official Medical Stamp</p>
              <p className="text-sm">Date: {report.compteRendu.patient.dateExamen}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Composant pour les examens biologiques
  const BiologyPrescription = () => {
    const analyses = report.ordonnances?.biologie?.prescription?.analyses || {}
    const hasTests = Object.values(analyses).some((tests: any) => Array.isArray(tests) && tests.length > 0)
    
    if (!includeFullPrescriptions && report.prescriptionsResume) {
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
        <div className="border-b-2 border-purple-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">LABORATORY REQUEST FORM / DEMANDE D'ANALYSES</h2>
              <p className="text-gray-600 mt-1">Compliant with MoH Laboratory Standards</p>
            </div>
            <div className="flex gap-2 print:hidden">
              {editMode && validationStatus !== 'validated' && (
                <Button onClick={addBiologyTest} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSectionToPDF('prescription-biologie', `lab_request_${report.compteRendu.patient.nom}_${new Date().toISOString().split('T')[0]}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Patient info */}
        <div className="mb-6 p-4 bg-purple-50 rounded">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Patient :</strong> {report.compteRendu.patient.nomComplet}</div>
            <div><strong>Date :</strong> {report.compteRendu.patient.dateExamen}</div>
            <div><strong>Clinical Information :</strong> {getString(report.ordonnances?.biologie?.patient?.diagnosticProvisoire) || report.compteRendu.rapport.conclusionDiagnostique.substring(0, 100) + '...'}</div>
          </div>
        </div>

        {hasTests ? (
          <div className="space-y-6">
            {Object.entries(analyses).map(([category, tests]: [string, any]) => {
              if (!Array.isArray(tests) || tests.length === 0) return null
              
              return (
                <div key={category} className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-bold text-lg mb-3 text-purple-800">
                    {category.toUpperCase()}
                  </h3>
                  <div className="space-y-2">
                    {tests.map((test: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium">
                            {getString(test.nom)}
                            {test.urgence && <Badge className="ml-2 bg-red-100 text-red-800">URGENT</Badge>}
                          </p>
                          {test.aJeun && (
                            <p className="text-sm text-orange-600 mt-1">⚠️ Fasting required / À jeun requis</p>
                          )}
                          {test.conditionsPrelevement && (
                            <p className="text-sm text-gray-600 mt-1">
                              Conditions: {getString(test.conditionsPrelevement)}
                            </p>
                          )}
                          {test.motifClinique && (
                            <p className="text-sm text-gray-600 mt-1">
                              Indication: {getString(test.motifClinique)}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          <p>Tube: {getString(test.tubePrelevement)}</p>
                          <p>TAT: {getString(test.delaiResultat)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {/* Special instructions */}
            {report.ordonnances?.biologie?.prescription?.instructionsSpeciales?.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 rounded">
                <h4 className="font-bold mb-2">Special Instructions / Instructions spéciales</h4>
                <ul className="list-disc list-inside text-sm">
                  {report.ordonnances.biologie.prescription.instructionsSpeciales.map((instruction: string, idx: number) => (
                    <li key={idx}>{getString(instruction)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No laboratory tests ordered / Aucune analyse prescrite</p>
            {editMode && (
              <Button onClick={addBiologyTest} className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Test
              </Button>
            )}
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <p className="text-sm text-gray-600 mb-4">
            Laboratory / Laboratoire : {getString(report.ordonnances?.biologie?.prescription?.laboratoireRecommande) || "Any MoH approved laboratory"}
          </p>
          <div className="text-right signature">
            <p className="font-semibold">{report.compteRendu.praticien.nom}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {report.compteRendu.praticien.numeroEnregistrement}</p>
            <div className="mt-8">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Requesting Physician's Signature</p>
              <p className="text-sm">Date: {report.compteRendu.patient.dateExamen}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Composant pour l'imagerie
  const ImagingPrescription = () => {
    const examens = report.ordonnances?.imagerie?.prescription?.examens || []
    
    return (
      <div id="prescription-imagerie" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-indigo-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">RADIOLOGY REQUEST FORM / DEMANDE D'IMAGERIE</h2>
              <p className="text-gray-600 mt-1">Compliant with MoH Radiology Standards</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSectionToPDF('prescription-imagerie', `imaging_request_${report.compteRendu.patient.nom}_${new Date().toISOString().split('T')[0]}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Patient info */}
        <div className="mb-6 p-4 bg-indigo-50 rounded">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Patient :</strong> {report.compteRendu.patient.nomComplet}</div>
            <div><strong>Weight / Poids :</strong> {report.compteRendu.patient.poids}</div>
            <div><strong>Clinical Diagnosis :</strong> {report.ordonnances?.imagerie?.prescription?.renseignementsCliniques}</div>
            {report.ordonnances?.imagerie?.patient?.allergiesConnues && (
              <div><strong>Known Allergies :</strong> {report.ordonnances.imagerie.patient.allergiesConnues}</div>
            )}
          </div>
        </div>

        {examens.length > 0 ? (
          <div className="space-y-6">
            {examens.map((exam: any, index: number) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                <div className="font-bold text-lg">
                  {index + 1}. {getString(exam.type || exam.modalite)}
                  {exam.urgence && <Badge className="ml-2 bg-red-100 text-red-800">URGENT</Badge>}
                </div>
                <p className="mt-1">
                  <span className="font-medium">Region / Région :</span> {getString(exam.region)}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Clinical Indication :</span> {getString(exam.indicationClinique)}
                </p>
                {exam.contraste && (
                  <p className="mt-1 text-orange-600">
                    ⚠️ <span className="font-medium">Contrast required / Contraste requis</span>
                  </p>
                )}
                {exam.protocoleSpecifique && (
                  <p className="mt-1">
                    <span className="font-medium">Protocol :</span> {getString(exam.protocoleSpecifique)}
                  </p>
                )}
                {exam.questionDiagnostique && (
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Clinical Question :</span> {getString(exam.questionDiagnostique)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Scan className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No imaging studies ordered / Aucun examen d'imagerie prescrit</p>
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <p className="text-sm text-gray-600 mb-4">
            Imaging Center / Centre d'imagerie : {report.ordonnances?.imagerie?.prescription?.centreImagerie || "Any MoH approved imaging center"}
          </p>
          <div className="text-right signature">
            <p className="font-semibold">{report.compteRendu.praticien.nom}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {report.compteRendu.praticien.numeroEnregistrement}</p>
            <div className="mt-8">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Requesting Physician's Signature</p>
              <p className="text-sm">Date: {report.compteRendu.patient.dateExamen}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Actions Bar avec statut de validation
  const ActionsBar = () => (
    <Card className="print:hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Badge className={validationStatus === 'validated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {validationStatus === 'validated' ? (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Document validé
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  Brouillon / Draft
                </>
              )}
            </Badge>
            {modifiedSections.size > 0 && (
              <Badge variant="outline" className="text-orange-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                {modifiedSections.size} modification(s) non sauvegardée(s)
              </Badge>
            )}
            <span className="text-sm text-gray-600">
              {report.compteRendu.metadata?.wordCount || 0} mots
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
              {editMode ? 'Aperçu' : 'Éditer'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || modifiedSections.size === 0}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleValidation}
              disabled={saving || validationStatus === 'validated' || modifiedSections.size > 0}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Valider
            </Button>
            
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer tout
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Avertissement modifications non sauvegardées
  const UnsavedChangesAlert = () => {
    if (modifiedSections.size === 0) return null

    return (
      <Alert className="print:hidden">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Vous avez des modifications non sauvegardées. 
          Pensez à sauvegarder avant de valider ou quitter.
        </AlertDescription>
      </Alert>
    )
  }

  // Stats des prescriptions
  const PrescriptionStats = () => {
    const medicamentCount = report.ordonnances?.medicaments?.prescription?.medicaments?.length || 0
    const bioCount = Object.values(report.ordonnances?.biologie?.prescription?.analyses || {})
      .reduce((acc: number, tests: any) => acc + (Array.isArray(tests) ? tests.length : 0), 0)
    const imagingCount = report.ordonnances?.imagerie?.prescription?.examens?.length || 0

    return (
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Résumé des prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-50 rounded">
              <Pill className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{medicamentCount}</p>
              <p className="text-sm text-gray-600">Médicaments</p>
            </div>
            <div className="p-4 bg-purple-50 rounded">
              <TestTube className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{bioCount}</p>
              <p className="text-sm text-gray-600">Analyses</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded">
              <Scan className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
              <p className="text-2xl font-bold text-indigo-600">{imagingCount}</p>
              <p className="text-sm text-gray-600">Imageries</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Rendu principal
  return (
    <div className="space-y-6 print:space-y-4">
      <ActionsBar />
      <UnsavedChangesAlert />
      <DoctorInfoEditor />
      <PrescriptionStats />

      {/* Navigation par onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultation">
            <FileText className="h-4 w-4 mr-2" />
            Compte rendu
          </TabsTrigger>
          <TabsTrigger value="medicaments">
            <Pill className="h-4 w-4 mr-2" />
            Médicaments
            {report.ordonnances?.medicaments?.prescription?.medicaments?.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {report.ordonnances.medicaments.prescription.medicaments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="biologie">
            <TestTube className="h-4 w-4 mr-2" />
            Biologie
            {report.ordonnances?.biologie && (
              <Badge variant="secondary" className="ml-2">
                {Object.values(report.ordonnances.biologie.prescription.analyses || {})
                  .reduce((acc: number, tests: any) => acc + (Array.isArray(tests) ? tests.length : 0), 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="imagerie">
            <Scan className="h-4 w-4 mr-2" />
            Imagerie
            {report.ordonnances?.imagerie?.prescription?.examens?.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {report.ordonnances.imagerie.prescription.examens.length}
              </Badge>
            )}
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
      </Tabs>

      {/* Version d'impression complète */}
      <div className="hidden print:block">
        <ConsultationReport />
        {includeFullPrescriptions && report.ordonnances && (
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
      </div>

      {/* Bouton de finalisation */}
      {validationStatus === 'validated' && (
        <div className="flex justify-center print:hidden mt-8">
          <Button 
            size="lg"
            onClick={onComplete}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Finaliser et Archiver la Consultation
          </Button>
        </div>
      )}
    </div>
  )
}