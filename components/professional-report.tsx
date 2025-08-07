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
import { DoctorSignature } from "@/components/doctor-signature"
import { useTibokDoctorData } from "@/hooks/use-tibok-doctor-data"
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
  Building,
  CreditCard,
  Receipt
} from "lucide-react"

// Types for Mauritian format
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
  invoice?: {
    header: {
      invoiceNumber: string
      consultationDate: string
      invoiceDate: string
    }
    provider: {
      companyName: string
      tradeName: string
      registrationNumber: string
      vatNumber: string
      registeredOffice: string
      phone: string
      email: string
      website: string
    }
    patient: {
      name: string
      email: string
      phone: string
      patientId: string
    }
    services: {
      items: Array<{
        description: string
        quantity: number
        unitPrice: number
        total: number
      }>
      subtotal: number
      vatRate: number
      vatAmount: number
      totalDue: number
    }
    payment: {
      method: string
      receivedDate: string
      status: 'pending' | 'paid' | 'cancelled'
    }
    physician: {
      name: string
      registrationNumber: string
    }
    notes: string[]
    signature: {
      entity: string
      onBehalfOf: string
      title: string
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

// Fonction utilitaire pour créer un rapport vide avec structure complète
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
      numeroEnregistrement: "[MCM Registration Required]",
      licencePratique: "[License Required]"
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
export default function ProfessionalReportEditable({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  editedDocuments,
  onComplete
}: ProfessionalReportProps) {
  // Main states
  const [report, setReport] = useState<MauritianReport | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("consultation")
  
  // Edit states
  const [editMode, setEditMode] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'draft' | 'validated'>('draft')
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showFullReport, setShowFullReport] = useState(false)
  
  // Display states
  const [includeFullPrescriptions, setIncludeFullPrescriptions] = useState(true)
  
  // Doctor information states
  const [doctorInfo, setDoctorInfo] = useState({
    nom: "Dr. [Name Required]",
    qualifications: "MBBS",
    specialite: "General Medicine",
    adresseCabinet: "Tibok Teleconsultation Platform",
    email: "[Email Required]",
    heuresConsultation: "Teleconsultation Hours: 8:00 AM - 8:00 PM",
    numeroEnregistrement: "[MCM Registration Required]",
    licencePratique: "[License Required]"
  })
  const [editingDoctor, setEditingDoctor] = useState(false)

  // Add state for signatures
  const [documentSignatures, setDocumentSignatures] = useState<{
    consultation?: string
    prescription?: string
    laboratory?: string
    imaging?: string
    invoice?: string
  }>({})

  // Function to generate doctor signature
  const generateDoctorSignature = async (doctorName: string): Promise<string> => {
    // This is a placeholder - implement actual signature generation
    return `Digital Signature: ${doctorName} - ${new Date().toISOString()}`
  }

// UPDATED: Load doctor information from Tibok with better field mapping and debugging
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const doctorDataParam = urlParams.get('doctorData')
  
  if (doctorDataParam) {
    try {
      const tibokDoctorData = JSON.parse(decodeURIComponent(doctorDataParam))
      console.log('👨‍⚕️ Loading Tibok Doctor Data:', tibokDoctorData)
      
      // Debug: Check what fields are actually present
      console.log('🔍 Doctor data fields:', {
        hasLicenseNumber: 'licenseNumber' in tibokDoctorData,
        hasLicense_number: 'license_number' in tibokDoctorData,
        licenseNumberValue: tibokDoctorData.licenseNumber,
        license_numberValue: tibokDoctorData.license_number,
        typeOfLicenseNumber: typeof tibokDoctorData.licenseNumber,
        typeOfLicense_number: typeof tibokDoctorData.license_number
      })
      
// Map all possible field names from database
const doctorInfoFromTibok = {
  nom: tibokDoctorData.fullName || tibokDoctorData.full_name ? 
    `Dr. ${tibokDoctorData.fullName || tibokDoctorData.full_name}` : 
    'Dr. [Name Required]',
  qualifications: tibokDoctorData.qualifications || 'MBBS',
  specialite: tibokDoctorData.specialty || 'General Medicine',
  adresseCabinet: tibokDoctorData.clinic_address || tibokDoctorData.clinicAddress || 'Tibok Teleconsultation Platform',
  telephone: '', // Keep this empty as requested
  email: tibokDoctorData.email || '[Email Required]',
  heuresConsultation: tibokDoctorData.consultation_hours || tibokDoctorData.consultationHours || 'Teleconsultation Hours: 8:00 AM - 8:00 PM',
  numeroEnregistrement: String(tibokDoctorData.medicalCouncilNumber || tibokDoctorData.medical_council_number || '[MCM Registration Required]'),
  // FIXED: Directly assign the license_number field
  licencePratique: tibokDoctorData.license_number ? 
    String(tibokDoctorData.license_number) : 
    '[License Required]'
}

console.log('🔍 License extraction:', {
  rawValue: tibokDoctorData.license_number,
  type: typeof tibokDoctorData.license_number,
  hasLicense: !!tibokDoctorData.license_number
});

console.log('✅ Doctor info prepared:', doctorInfoFromTibok)

setDoctorInfo(doctorInfoFromTibok)
sessionStorage.setItem('currentDoctorInfo', JSON.stringify(doctorInfoFromTibok))

} catch (error) {
  console.error('Error parsing Tibok doctor data:', error)
}
  
  // Also check sessionStorage as fallback
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

  // Update report when doctor info changes
  useEffect(() => {
    if (report && doctorInfo && doctorInfo.nom !== 'Dr. [DOCTOR NAME]') {
      setReport(prev => ({
        ...prev!,
        compteRendu: {
          ...prev!.compteRendu,
          praticien: doctorInfo
        },
        ordonnances: prev!.ordonnances ? {
          ...prev!.ordonnances,
          medicaments: prev!.ordonnances.medicaments ? {
            ...prev!.ordonnances.medicaments,
            enTete: doctorInfo,
            authentification: {
              ...prev!.ordonnances.medicaments.authentification,
              nomEnCapitales: doctorInfo.nom.toUpperCase(),
              numeroEnregistrement: doctorInfo.numeroEnregistrement
            }
          } : null,
          biologie: prev!.ordonnances.biologie ? {
            ...prev!.ordonnances.biologie,
            enTete: doctorInfo,
            authentification: {
              ...prev!.ordonnances.biologie.authentification,
              nomEnCapitales: doctorInfo.nom.toUpperCase(),
              numeroEnregistrement: doctorInfo.numeroEnregistrement
            }
          } : null,
          imagerie: prev!.ordonnances.imagerie ? {
            ...prev!.ordonnances.imagerie,
            enTete: doctorInfo,
            authentification: {
              ...prev!.ordonnances.imagerie.authentification,
              nomEnCapitales: doctorInfo.nom.toUpperCase(),
              numeroEnregistrement: doctorInfo.numeroEnregistrement
            }
          } : null
        } : prev!.ordonnances,
        invoice: prev!.invoice ? {
          ...prev!.invoice,
          physician: {
            name: doctorInfo.nom,
            registrationNumber: doctorInfo.numeroEnregistrement
          }
        } : prev!.invoice
      }))
      console.log('📝 Report updated with doctor information')
    }
  }, [doctorInfo, report?.compteRendu?.header])

  useEffect(() => {
    console.log("🚀 ProfessionalReportEditable mounted with data:", {
      hasPatientData: !!patientData,
      patientName: patientData?.name || `${patientData?.firstName} ${patientData?.lastName}`,
      hasClinicalData: !!clinicalData,
      hasDiagnosisData: !!diagnosisData,
      hasQuestionsData: !!questionsData
    })
    
    // Check if we have minimum required data
    if (patientData && (patientData.name || (patientData.firstName && patientData.lastName))) {
      checkExistingReport()
    } else {
      console.warn("Insufficient patient data, creating empty report")
      const emptyReport = createEmptyReport()
      if (patientData) {
        emptyReport.compteRendu.patient = {
          ...emptyReport.compteRendu.patient,
          nom: patientData.name || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim(),
          nomComplet: patientData.name || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim(),
          age: patientData.age?.toString() || '',
          dateNaissance: patientData.dateOfBirth || '',
          sexe: patientData.gender || '',
          adresse: patientData.address || '',
          telephone: patientData.phone || '',
          email: patientData.email || '',
          poids: patientData.weight?.toString() || ''
        }
      }
      setReport(emptyReport)
      setLoading(false)
    }
  }, [patientData, clinicalData, questionsData, diagnosisData])
  // Check for existing report
  const checkExistingReport = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const patientIdFromUrl = params.get('patientId')
      const actualPatientId = patientData?.id || patientIdFromUrl || (patientData ? 'patient_' + Date.now() : 'temp')
      
      if (!patientData || actualPatientId === 'temp') {
        console.log("No patient data, generating new report")
        generateProfessionalReport()
        return
      }
      
      const response = await fetch(`/api/save-medical-report?patientId=${actualPatientId}`)
      const result = await response.json()
      
      if (result.success && result.data?.content) {
        const reportContent = result.data.content
        if (reportContent?.compteRendu) {
          setReport(reportContent)
          setReportId(result.data.id)
          setValidationStatus(result.data.status || 'draft')
          
          if (reportContent.compteRendu.praticien) {
            setDoctorInfo(reportContent.compteRendu.praticien)
          }
          
          toast({
            title: "Existing report found",
            description: "Loading previous report"
          })
        } else {
          generateProfessionalReport()
        }
      } else {
        generateProfessionalReport()
      }
    } catch (error) {
      console.log("No existing report, generating new one")
      generateProfessionalReport()
    }
  }

  // Track modifications
  const trackModification = (section: string) => {
    if (validationStatus === 'validated') return
    setModifiedSections(prev => new Set(prev).add(section))
  }

  // UPDATED: Generate report with doctor data and auto-save
  const generateProfessionalReport = async () => {
    setLoading(true)
    setError(null)

    try {
      // Wait for doctor info to be loaded
      let currentDoctorInfo = doctorInfo
      if (currentDoctorInfo.nom === 'Dr. [DOCTOR NAME]' || currentDoctorInfo.nom === 'Dr. [Name Required]') {
        // Try to get from session if not loaded yet
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
      
      // Prepare doctor data for API
      const doctorDataForAPI = {
        fullName: currentDoctorInfo.nom.replace('Dr. ', ''),
        qualifications: currentDoctorInfo.qualifications,
        specialty: currentDoctorInfo.specialite,
        clinicAddress: currentDoctorInfo.adresseCabinet,
        email: currentDoctorInfo.email,
        consultationHours: currentDoctorInfo.heuresConsultation,
        medicalCouncilNumber: currentDoctorInfo.numeroEnregistrement,
        licenseNumber: currentDoctorInfo.licencePratique
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
        const reportData = data.report
        
        // Override the praticien data with actual doctor info
        reportData.compteRendu.praticien = currentDoctorInfo
        
        // Also update all prescription headers
        if (reportData.ordonnances?.medicaments) {
          reportData.ordonnances.medicaments.enTete = currentDoctorInfo
          reportData.ordonnances.medicaments.authentification.nomEnCapitales = currentDoctorInfo.nom.toUpperCase()
          reportData.ordonnances.medicaments.authentification.numeroEnregistrement = currentDoctorInfo.numeroEnregistrement
        }
        
        if (reportData.ordonnances?.biologie) {
          reportData.ordonnances.biologie.enTete = currentDoctorInfo
          reportData.ordonnances.biologie.authentification.nomEnCapitales = currentDoctorInfo.nom.toUpperCase()
          reportData.ordonnances.biologie.authentification.numeroEnregistrement = currentDoctorInfo.numeroEnregistrement
        }
        
        if (reportData.ordonnances?.imagerie) {
          reportData.ordonnances.imagerie.enTete = currentDoctorInfo
          reportData.ordonnances.imagerie.authentification.nomEnCapitales = currentDoctorInfo.nom.toUpperCase()
          reportData.ordonnances.imagerie.authentification.numeroEnregistrement = currentDoctorInfo.numeroEnregistrement
        }
        
        if (reportData.invoice?.physician) {
          reportData.invoice.physician.name = currentDoctorInfo.nom
          reportData.invoice.physician.registrationNumber = currentDoctorInfo.numeroEnregistrement
        }
        
        setReport(reportData)
        setValidationStatus('draft')
        
        // Auto-save the report immediately after generation
        const newReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        setReportId(newReportId)
        
        // Save to storage
        const params = new URLSearchParams(window.location.search)
        const consultationId = params.get('consultationId')
        const patientId = params.get('patientId') || patientData?.id
        
        if (consultationId && patientId) {
          const saveResponse = await fetch('/api/save-medical-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reportId: newReportId,
              patientId,
              report: reportData,
              action: 'save',
              consultationId,
              metadata: {
                lastModified: new Date().toISOString(),
                validationStatus: 'draft'
              }
            })
          })
          
          if (saveResponse.ok) {
            console.log('✅ Report auto-saved with ID:', newReportId)
          }
        }
        
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
      
      // Create fallback report with doctor info
      const emptyReport = createEmptyReport()
      emptyReport.compteRendu.praticien = doctorInfo
      if (patientData) {
        emptyReport.compteRendu.patient = {
          ...emptyReport.compteRendu.patient,
          nom: patientData.name || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient',
          nomComplet: patientData.name || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient',
          age: patientData.age?.toString() || '',
          dateNaissance: patientData.dateOfBirth || '',
          sexe: patientData.gender || '',
          adresse: patientData.address || '',
          telephone: patientData.phone || '',
          email: patientData.email || '',
          poids: patientData.weight?.toString() || ''
        }
      }
      setReport(emptyReport)
      
      toast({
        title: "Note",
        description: "Using default template. Please fill in the required information.",
        variant: "default"
      })
    } finally {
      setLoading(false)
    }
  }

  // Safe getter functions
  const getReportHeader = () => report?.compteRendu?.header || createEmptyReport().compteRendu.header
  const getReportPraticien = () => report?.compteRendu?.praticien || doctorInfo
  const getReportPatient = () => report?.compteRendu?.patient || createEmptyReport().compteRendu.patient
  const getReportRapport = () => report?.compteRendu?.rapport || createEmptyReport().compteRendu.rapport
  const getReportMetadata = () => report?.compteRendu?.metadata || createEmptyReport().compteRendu.metadata

  // Update narrative report section
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

  // Update doctor information
  const updateDoctorInfo = (field: string, value: string) => {
    setDoctorInfo(prev => ({
      ...prev,
      [field]: value
    }))
    trackModification(`praticien.${field}`)
    const updatedInfo = { ...doctorInfo, [field]: value }
    sessionStorage.setItem('currentDoctorInfo', JSON.stringify(updatedInfo))
  }
  // UPDATED: Enhanced validation with better report ID handling
  const handleValidation = async () => {
    // Check if doctor info is complete
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
    
    // Ensure we have a report ID
    let currentReportId = reportId
    if (!currentReportId) {
      currentReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setReportId(currentReportId)
      
      // Save the report first
      const params = new URLSearchParams(window.location.search)
      const consultationId = params.get('consultationId')
      const patientId = params.get('patientId') || patientData?.id
      
      const saveResponse = await fetch('/api/save-medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: currentReportId,
          patientId: patientId || 'temp',
          report: report,
          action: 'save',
          consultationId,
          metadata: {
            lastModified: new Date().toISOString(),
            validationStatus: 'draft'
          }
        })
      })
      
      if (!saveResponse.ok) {
        toast({
          title: "Error",
          description: "Failed to save report before validation",
          variant: "destructive"
        })
        return
      }
    }
    
    setSaving(true)
    try {
      // Generate signature for the doctor
      const doctorSignature = await generateDoctorSignature(doctorInfo.nom)
      
      // Add signatures to all documents
      const signatures = {
        consultation: doctorSignature,
        prescription: doctorSignature,
        laboratory: doctorSignature,
        imaging: doctorSignature,
        invoice: doctorSignature
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
            signatures
          }
        }
      }
      
      const params = new URLSearchParams(window.location.search)
      const consultationId = params.get('consultationId')
      const patientId = params.get('patientId') || patientData?.id
      const doctorId = params.get('doctorId')
      
      const response = await fetch('/api/save-medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: currentReportId,
          patientId: patientId || 'temp',
          consultationId,
          doctorId,
          doctorName: doctorInfo.nom,
          patientName: getReportPatient().nomComplet || getReportPatient().nom,
          report: updatedReport,
          action: 'validate',
          metadata: {
            validatedAt: new Date().toISOString(),
            validatedBy: doctorInfo.nom,
            validationStatus: 'validated',
            signatures,
            documentValidations: {
              consultation: true,
              prescription: !!report?.ordonnances?.medicaments,
              laboratory: !!report?.ordonnances?.biologie,
              imaging: !!report?.ordonnances?.imagerie,
              invoice: !!report?.invoice
            }
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setValidationStatus('validated')
        setEditMode(false)
        setReport(updatedReport)
        
        toast({
          title: "✅ Validation successful",
          description: "The report has been validated and digitally signed"
        })
        
        if (onComplete) {
          onComplete()
        }
      } else {
        throw new Error(result.error || "Validation failed")
      }
    } catch (error) {
      console.error("Validation error:", error)
      toast({
        title: "Validation error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Save report (for backward compatibility but redirects to validation)
  const handleSave = async () => {
    // Auto-save is handled by validation now
    await handleValidation()
  }

  // Update invoice
  const updateInvoice = (field: string, value: any) => {
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
  }

  // Update payment status
  const updatePaymentStatus = (status: 'pending' | 'paid' | 'cancelled') => {
    if (!report?.invoice) return
    
    updateInvoice('payment', {
      ...report.invoice.payment,
      status: status
    })
  }

  // Update payment method
  const updatePaymentMethod = (method: string) => {
    if (!report?.invoice) return
    
    updateInvoice('payment', {
      ...report.invoice.payment,
      method: method
    })
  }
  // Update medications
  const updateMedicament = (index: number, field: string, value: string) => {
    if (validationStatus === 'validated' || !report?.ordonnances?.medicaments) return
    
    setReport(prev => {
      if (!prev?.ordonnances?.medicaments?.prescription?.medicaments) return prev
      
      const newReport = { ...prev }
      const meds = [...newReport.ordonnances.medicaments.prescription.medicaments]
      const med = meds[index]
      if (!med) return prev
      
      med[field] = value
      
      med.ligneComplete = `${med.nom} ${med.dosage ? `- ${med.dosage}` : ''}\n` +
                         `${med.posologie} - ${med.modeAdministration}\n` +
                         `Duration: ${med.dureeTraitement} - Quantity: ${med.quantite}`
      
      newReport.ordonnances.medicaments.prescription.medicaments = meds
      return newReport
    })
    trackModification(`medicament.${index}.${field}`)
  }

  // Add medication
  const addMedicament = () => {
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
      
      // Initialize ordonnances if needed
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
  }

  // Remove medication
  const removeMedicament = (index: number) => {
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
  }

  // Add biology test
  const addBiologyTest = (category: string = 'clinicalChemistry') => {
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
      
      // Initialize structure if needed
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
  }

  // Update biology test
  const updateBiologyTest = (category: string, index: number, field: string, value: any) => {
    if (validationStatus === 'validated') return
    
    setReport(prev => {
      if (!prev?.ordonnances?.biologie?.prescription?.analyses?.[category]) return prev
      
      const newReport = { ...prev }
      const tests = [...newReport.ordonnances.biologie.prescription.analyses[category]]
      if (tests[index]) {
        tests[index][field] = value
      }
      
      newReport.ordonnances.biologie.prescription.analyses[category] = tests
      return newReport
    })
    trackModification(`biologie.${category}.${index}.${field}`)
  }

  // Remove biology test
  const removeBiologyTest = (category: string, index: number) => {
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
  }

  // Add imaging exam
  const addImagingExam = () => {
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
      
      // Initialize structure if needed
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
  }

  // Update imaging exam
  const updateImagingExam = (index: number, field: string, value: any) => {
    if (validationStatus === 'validated') return
    
    setReport(prev => {
      if (!prev?.ordonnances?.imagerie?.prescription?.examens) return prev
      
      const newReport = { ...prev }
      const exams = [...newReport.ordonnances.imagerie.prescription.examens]
      if (exams[index]) {
        exams[index][field] = value
      }
      
      newReport.ordonnances.imagerie.prescription.examens = exams
      return newReport
    })
    trackModification(`imagerie.${index}.${field}`)
  }

  // Remove imaging exam
  const removeImagingExam = (index: number) => {
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
  }
  // Enhanced PDF export - extracts only specific content
  const exportSectionToPDF = (sectionId: string, filename: string) => {
    const element = document.getElementById(sectionId)
    if (!element) return

    // Clone element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement
    
    // Remove unnecessary elements for printing
    const noExportElements = clonedElement.querySelectorAll('.print\\:hidden, .no-print')
    noExportElements.forEach(el => el.remove())

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Specific styles for each document type
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
        
        .grid {
          display: table;
          width: 100%;
          margin-bottom: 10pt;
        }
        .grid-row {
          display: table-row;
        }
        .grid-cell {
          display: table-cell;
          padding: 3pt 5pt;
          vertical-align: top;
        }
        
        .urgent { 
          color: #e74c3c; 
          font-weight: bold; 
          text-transform: uppercase;
        }
        
        strong { 
          font-weight: 600; 
        }
        
        .badge {
          display: inline-block;
          padding: 2pt 6pt;
          font-size: 10pt;
          font-weight: bold;
          border-radius: 3pt;
          margin-left: 5pt;
        }
        .badge-red {
          background: #fee;
          color: #c00;
          border: 1pt solid #fcc;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10pt 0;
        }
        
        th, td {
          padding: 8pt;
          text-align: left;
          border-bottom: 1pt solid #ddd;
        }
        
        th {
          font-weight: bold;
          background: #f5f5f5;
        }
        
        /* Hide interface elements */
        button, .button, input, select, textarea { display: none !important; }
        
        @media print {
          body { margin: 0; }
        }
      `
      
      if (sectionId === 'prescription-medicaments') {
        return baseStyles + `
          .prescription-item {
            border-left-color: #27ae60;
            background: #f8fdf9;
            padding: 8pt;
            margin: 12pt 0;
          }
          .header { border-bottom-color: #27ae60; }
        `
      } else if (sectionId === 'prescription-biologie') {
        return baseStyles + `
          .prescription-item {
            border-left-color: #8e44ad;
            background: #faf8fc;
            padding: 8pt;
            margin: 12pt 0;
          }
          .header { border-bottom-color: #8e44ad; }
          .category-header {
            color: #8e44ad;
            font-weight: bold;
            margin-top: 15pt;
            margin-bottom: 8pt;
          }
        `
      } else if (sectionId === 'prescription-imagerie') {
        return baseStyles + `
          .prescription-item {
            border-left-color: #3498db;
            background: #f7fafc;
            padding: 8pt;
            margin: 12pt 0;
          }
          .header { border-bottom-color: #3498db; }
        `
      } else if (sectionId === 'invoice-document') {
        return baseStyles + `
          .header { border-bottom-color: #e67e22; }
          .invoice-table {
            margin: 20pt 0;
          }
          .invoice-total {
            text-align: right;
            font-weight: bold;
            font-size: 14pt;
          }
          .payment-info {
            background: #e8f5e9;
            padding: 10pt;
            border-radius: 4pt;
            margin: 15pt 0;
          }
        `
      }
      
      return baseStyles
    }

    // Clean HTML for printing
    const cleanHTML = clonedElement.innerHTML
      .replace(/class="[^"]*"/g, (match) => {
        // Keep only important classes for styling
        const importantClasses = ['header', 'section', 'prescription-item', 'signature', 'info-box', 'urgent', 'badge', 'badge-red', 'grid', 'grid-row', 'grid-cell', 'category-header', 'invoice-table', 'invoice-total', 'payment-info']
        const classes = match.match(/class="([^"]*)"/)?.[1].split(' ') || []
        const filtered = classes.filter(c => importantClasses.some(ic => c.includes(ic)))
        return filtered.length > 0 ? `class="${filtered.join(' ')}"` : ''
      })
      .replace(/<button[^>]*>.*?<\/button>/gi, '') // Remove all buttons
      .replace(/<svg[^>]*>.*?<\/svg>/gi, '') // Remove SVG icons
      .replace(/<!--.*?-->/gs, '') // Remove comments

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
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Optional: close window after printing
        // printWindow.onafterprint = () => printWindow.close()
      }, 500)
    }
  }

  const handlePrint = () => window.print()

  // Loading and error states
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

  // Add debug information display
  if (!loading && !report && !error && !patientData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-center mb-4">No Patient Data Available</h3>
          <p className="text-center text-gray-600 mb-4">
            Patient information is required to generate the medical report.
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Debug Info:</p>
            <p>• Patient Data: {patientData ? 'Present' : 'Missing'}</p>
            <p>• Clinical Data: {clinicalData ? 'Present' : 'Missing'}</p>
            <p>• Questions Data: {questionsData ? 'Present' : 'Missing'}</p>
            <p>• Diagnosis Data: {diagnosisData ? 'Present' : 'Missing'}</p>
          </div>
          <Button 
            onClick={() => {
              const emptyReport = createEmptyReport()
              setReport(emptyReport)
            }}
            className="mt-4 w-full"
          >
            Create Empty Report Template
          </Button>
        </CardContent>
      </Card>
    )
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

  // Always check that report exists
  if (!report) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
            <p className="text-lg font-semibold">No report data available</p>
            <Button onClick={generateProfessionalReport} variant="outline">
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  // Doctor info editor component
  const DoctorInfoEditor = () => {
    const hasRequiredFields = doctorInfo.nom !== 'Dr. [Name Required]' && 
                             !doctorInfo.numeroEnregistrement.includes('[') &&
                             !doctorInfo.email.includes('[')
    
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
                  value={doctorInfo.nom}
                  onChange={(e) => updateDoctorInfo('nom', e.target.value)}
                  placeholder="Dr. Full Name"
                  className={doctorInfo.nom.includes('[') ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>Qualifications</Label>
                <Input
                  value={doctorInfo.qualifications}
                  onChange={(e) => updateDoctorInfo('qualifications', e.target.value)}
                  placeholder="MBBS, MD"
                />
              </div>
              <div>
                <Label>Speciality</Label>
                <Input
                  value={doctorInfo.specialite}
                  onChange={(e) => updateDoctorInfo('specialite', e.target.value)}
                  placeholder="General Medicine"
                />
              </div>
              <div>
                <Label>Medical Council Registration No. *</Label>
                <Input
                  value={doctorInfo.numeroEnregistrement}
                  onChange={(e) => updateDoctorInfo('numeroEnregistrement', e.target.value)}
                  placeholder="MCM/12345"
                  className={doctorInfo.numeroEnregistrement.includes('[') ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>Practice License No.</Label>
                <Input
                  value={doctorInfo.licencePratique}
                  onChange={(e) => updateDoctorInfo('licencePratique', e.target.value)}
                  placeholder="PL/2024/123"
                  className={doctorInfo.licencePratique.includes('[') ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  value={doctorInfo.email}
                  onChange={(e) => updateDoctorInfo('email', e.target.value)}
                  placeholder="doctor@email.com"
                  className={doctorInfo.email.includes('[') ? 'border-red-500' : ''}
                />
              </div>
              <div className="col-span-2">
                <Label>Clinic Address</Label>
                <Input
                  value={doctorInfo.adresseCabinet}
                  onChange={(e) => updateDoctorInfo('adresseCabinet', e.target.value)}
                  placeholder="Clinic address or Teleconsultation"
                />
              </div>
              <div className="col-span-2">
                <Label>Consultation Hours</Label>
                <Input
                  value={doctorInfo.heuresConsultation}
                  onChange={(e) => updateDoctorInfo('heuresConsultation', e.target.value)}
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
              <div><strong>License No.:</strong> {doctorInfo.licencePratique}</div>
              <div><strong>Email:</strong> {doctorInfo.email}</div>
              <div className="col-span-2"><strong>Clinic Address:</strong> {doctorInfo.adresseCabinet}</div>
              <div className="col-span-2"><strong>Consultation Hours:</strong> {doctorInfo.heuresConsultation}</div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Narrative report editing component
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
              <div>Practice License: {praticien.licencePratique}</div>
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
                    <Textarea
                      value={content}
                      onChange={(e) => updateRapportSection(section.key, e.target.value)}
                      className="min-h-[200px] font-sans text-gray-700"
                      placeholder="Enter text..."
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
              <p className="text-sm text-gray-600">License: {praticien.licencePratique}</p>
              <p className="text-sm text-gray-600">{praticien.adresseCabinet}</p>
              <div className="mt-8">
                <p className="text-sm">_______________________________</p>
                <p className="text-sm">Signature & Official Stamp</p>
                <p className="text-sm">Date: {patient.dateExamen || new Date().toLocaleDateString()}</p>
              </div>
              
              {validationStatus === 'validated' && (
                <div className="mt-4">
                  <DoctorSignature
                    doctorName={praticien.nom.replace('Dr. ', '')}
                    readonly={true}
                    existingSignature={documentSignatures.consultation}
                    documentType="consultation"
                  />
                </div>
              )}
              {validationStatus !== 'validated' && editMode && (
                <div className="mt-4">
                  <DoctorSignature
                    doctorName={praticien.nom.replace('Dr. ', '')}
                    onSignatureGenerated={(sig) => setDocumentSignatures(prev => ({ ...prev, consultation: sig }))}
                    documentType="consultation"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  // Medication editing component
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
              <div key={index} className="border-l-4 border-green-500 pl-4 py-2 prescription-item">
                {editMode && validationStatus !== 'validated' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Medication Name</Label>
                        <Input
                          value={med.nom}
                          onChange={(e) => updateMedicament(index, 'nom', e.target.value)}
                          placeholder="e.g., Paracetamol"
                        />
                      </div>
                      <div>
                        <Label>Generic Name (INN)</Label>
                        <Input
                          value={med.denominationCommune}
                          onChange={(e) => updateMedicament(index, 'denominationCommune', e.target.value)}
                          placeholder="e.g., Paracetamol"
                        />
                      </div>
                      <div>
                        <Label>Dosage</Label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => updateMedicament(index, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                        />
                      </div>
                      <div>
                        <Label>Form</Label>
                        <Select
                          value={med.forme}
                          onValueChange={(value) => updateMedicament(index, 'forme', value)}
                        >
                          <SelectTrigger>
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
                        <Label>Frequency</Label>
                        <Input
                          value={med.posologie}
                          onChange={(e) => updateMedicament(index, 'posologie', e.target.value)}
                          placeholder="e.g., 1 tablet 3 times daily"
                        />
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <Input
                          value={med.dureeTraitement}
                          onChange={(e) => updateMedicament(index, 'dureeTraitement', e.target.value)}
                          placeholder="e.g., 7 days"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          value={med.quantite}
                          onChange={(e) => updateMedicament(index, 'quantite', e.target.value)}
                          placeholder="e.g., 1 box"
                        />
                      </div>
                      <div>
                        <Label>Route of Administration</Label>
                        <Select
                          value={med.modeAdministration}
                          onValueChange={(value) => updateMedicament(index, 'modeAdministration', value)}
                        >
                          <SelectTrigger>
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
                      <Label>Special Instructions</Label>
                      <Input
                        value={med.instructions}
                        onChange={(e) => updateMedicament(index, 'instructions', e.target.value)}
                        placeholder="e.g., Take with food"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={med.nonSubstituable}
                          onCheckedChange={(checked) => updateMedicament(index, 'nonSubstituable', checked.toString())}
                        />
                        <Label>Non-substitutable</Label>
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
            <p className="text-sm text-gray-600">License: {praticien.licencePratique}</p>
            <div className="mt-8">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Official Medical Stamp</p>
              <p className="text-sm">Date: {patient.dateExamen}</p>
            </div>
            
            {validationStatus === 'validated' && (
              <div className="mt-4">
                <DoctorSignature
                  doctorName={praticien.nom.replace('Dr. ', '')}
                  readonly={true}
                  existingSignature={documentSignatures.prescription}
                  documentType="prescription"
                />
              </div>
            )}
            {validationStatus !== 'validated' && editMode && (
              <div className="mt-4">
                <DoctorSignature
                  doctorName={praticien.nom.replace('Dr. ', '')}
                  onSignatureGenerated={(sig) => setDocumentSignatures(prev => ({ ...prev, prescription: sig }))}
                  documentType="prescription"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Biology tests editing component
  const BiologyPrescription = () => {
    const analyses = report?.ordonnances?.biologie?.prescription?.analyses || {}
    const hasTests = Object.values(analyses).some((tests: any) => Array.isArray(tests) && tests.length > 0)
    const patient = getReportPatient()
    const praticien = getReportPraticien()
    const rapport = getReportRapport()
    
    const categories = [
      { key: 'haematology', label: 'HAEMATOLOGY' },
      { key: 'clinicalChemistry', label: 'CLINICAL CHEMISTRY' },
      { key: 'immunology', label: 'IMMUNOLOGY' },
      { key: 'microbiology', label: 'MICROBIOLOGY' },
      { key: 'endocrinology', label: 'ENDOCRINOLOGY' }
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
                          <div className="space-y-3 p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Test Name</Label>
                                <Input
                                  value={test.nom}
                                  onChange={(e) => updateBiologyTest(key, idx, 'nom', e.target.value)}
                                  placeholder="e.g., Complete Blood Count"
                                />
                              </div>
                              <div>
                                <Label>Clinical Indication</Label>
                                <Input
                                  value={test.motifClinique}
                                  onChange={(e) => updateBiologyTest(key, idx, 'motifClinique', e.target.value)}
                                  placeholder="e.g., Anemia evaluation"
                                />
                              </div>
                              <div>
                                <Label>Sample Type</Label>
                                <Select
                                  value={test.tubePrelevement}
                                  onValueChange={(value) => updateBiologyTest(key, idx, 'tubePrelevement', value)}
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
                                  value={test.delaiResultat}
                                  onValueChange={(value) => updateBiologyTest(key, idx, 'delaiResultat', value)}
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
                                value={test.conditionsPrelevement}
                                onChange={(e) => updateBiologyTest(key, idx, 'conditionsPrelevement', e.target.value)}
                                placeholder="e.g., Early morning sample required"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={test.urgence}
                                    onCheckedChange={(checked) => updateBiologyTest(key, idx, 'urgence', checked)}
                                  />
                                  <Label>Urgent</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={test.aJeun}
                                    onCheckedChange={(checked) => updateBiologyTest(key, idx, 'aJeun', checked)}
                                  />
                                  <Label>Fasting required</Label>
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeBiologyTest(key, idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
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
            <div className="mt-8">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Requesting Physician's Signature</p>
              <p className="text-sm">Date: {patient.dateExamen}</p>
            </div>
            
            {validationStatus === 'validated' && (
              <div className="mt-4">
                <DoctorSignature
                  doctorName={praticien.nom.replace('Dr. ', '')}
                  readonly={true}
                  existingSignature={documentSignatures.laboratory}
                  documentType="laboratory"
                />
              </div>
            )}
            {validationStatus !== 'validated' && editMode && (
              <div className="mt-4">
                <DoctorSignature
                  doctorName={praticien.nom.replace('Dr. ', '')}
                  onSignatureGenerated={(sig) => setDocumentSignatures(prev => ({ ...prev, laboratory: sig }))}
                  documentType="laboratory"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  // Imaging prescription editing component
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
                  <div className="space-y-3 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Imaging Type</Label>
                        <Select
                          value={exam.type || exam.modalite}
                          onValueChange={(value) => updateImagingExam(index, 'type', value)}
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
                          value={exam.region}
                          onChange={(e) => updateImagingExam(index, 'region', e.target.value)}
                          placeholder="e.g., Chest PA/Lateral"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Clinical Indication</Label>
                        <Input
                          value={exam.indicationClinique}
                          onChange={(e) => updateImagingExam(index, 'indicationClinique', e.target.value)}
                          placeholder="e.g., Rule out pneumonia"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Clinical Question</Label>
                        <Input
                          value={exam.questionDiagnostique}
                          onChange={(e) => updateImagingExam(index, 'questionDiagnostique', e.target.value)}
                          placeholder="e.g., Consolidation? Pleural effusion?"
                        />
                      </div>
                      <div>
                        <Label>Specific Protocol</Label>
                        <Input
                          value={exam.protocoleSpecifique}
                          onChange={(e) => updateImagingExam(index, 'protocoleSpecifique', e.target.value)}
                          placeholder="e.g., High resolution CT"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={exam.urgence}
                            onCheckedChange={(checked) => updateImagingExam(index, 'urgence', checked)}
                          />
                          <Label>Urgent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={exam.contraste}
                            onCheckedChange={(checked) => updateImagingExam(index, 'contraste', checked)}
                          />
                          <Label>Contrast required</Label>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImagingExam(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
            <div className="mt-8">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Requesting Physician's Signature</p>
              <p className="text-sm">Date: {patient.dateExamen}</p>
            </div>
            
            {validationStatus === 'validated' && (
              <div className="mt-4">
                <DoctorSignature
                  doctorName={praticien.nom.replace('Dr. ', '')}
                  readonly={true}
                  existingSignature={documentSignatures.imaging}
                  documentType="imaging"
                />
              </div>
            )}
            {validationStatus !== 'validated' && editMode && (
              <div className="mt-4">
                <DoctorSignature
                  doctorName={praticien.nom.replace('Dr. ', '')}
                  onSignatureGenerated={(sig) => setDocumentSignatures(prev => ({ ...prev, imaging: sig }))}
                  documentType="imaging"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Invoice Component
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
              {invoice.services.items.map((item, idx) => (
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

        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <h3 className="font-bold mb-2">Consulting Physician</h3>
          <div className="text-sm">
            <div><strong>Name:</strong> {invoice.physician.name}</div>
            <div><strong>Medical Council Registration No.:</strong> {invoice.physician.registrationNumber}</div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-bold mb-2">Notes</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            {invoice.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-300 text-center">
          <p className="font-bold">Electronic Signature:</p>
          <p className="mt-2">{invoice.signature.entity}</p>
          <p>on behalf of {invoice.signature.onBehalfOf}</p>
          <p className="text-sm text-gray-600">{invoice.signature.title}</p>
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
  // Actions Bar component
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

  // Unsaved changes warning
  const UnsavedChangesAlert = () => {
    if (modifiedSections.size === 0 || validationStatus === 'validated') return null

    return (
      <Alert className="print:hidden">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Changes will be saved automatically when you validate the document.
        </AlertDescription>
      </Alert>
    )
  }

  // Prescription stats
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

  // Main render
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
            onClick={onComplete}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Finalize and Archive Consultation
          </Button>
        </div>
      )}
    </div>
  )
}
