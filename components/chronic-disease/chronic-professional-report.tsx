"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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
import TibokMedicalAssistant from '../tibok-medical-assistant'
import {
  FileText, Download, Printer, CheckCircle, Loader2, Pill, TestTube,
  Scan, AlertTriangle, Eye, EyeOff, Edit, Save, FileCheck, Plus,
  Trash2, AlertCircle, Lock, Unlock, Calendar, User, Stethoscope,
  Activity, Utensils, ClipboardList, HeartPulse, Send
} from "lucide-react"
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for fetching consultation IDs
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ==================== TYPES & INTERFACES ====================

interface ChronicProfessionalReportData {
  medicalReport: {
    header: {
      title: string
      subtitle: string
      reference: string
      reportDate: string
    }
    practitioner: {
      name: string
      qualifications: string
      specialty: string
      registrationNumber: string
      email: string
      consultationPlatform: string
      facility?: string
      contact?: string
    }
    patient: {
      fullName: string
      age: string
      dateOfBirth: string
      gender: string
      address: string
      phone: string
      email: string
      weight: string
      height?: string
      nationalId?: string
      // Vital Signs
      temperature?: string
      bloodPressureSystolic?: string
      bloodPressureDiastolic?: string
      bloodGlucose?: string
      // Medical Profile
      allergies?: string
      medicalHistory?: string
      currentMedications?: string
    }
    chronicDiseaseAssessment: {
      primaryDiagnosis: string
      diseaseCategory: string
      diseaseStage?: string
      comorbidities?: string[]
      riskFactors?: string[]
      complications?: string[]
    }
    clinicalEvaluation: {
      chiefComplaint: string
      historyOfPresentIllness: string
      reviewOfSystems: string
      physicalExamination: string
      vitalSignsAnalysis: string
    }
    diagnosticSummary: {
      diagnosticConclusion: string
      prognosticAssessment: string
      diseaseManagementGoals: string[]
    }
    narrative: string // Full professional report from API
    metadata: {
      generatedDate: string
      wordCount: number
      validationStatus: 'draft' | 'validated'
      validatedAt?: string
      validatedBy?: string
    }
  }
  medicationPrescription?: {
    header: any
    patient: any
    prescription: {
      datePrescription: string
      medications: Array<{
        nom: string
        denominationCommune?: string
        dosage: string
        forme: string
        posologie: string
        modeAdministration: string
        dureeTraitement: string
        quantite: string
        instructions?: string
        justification?: string
        surveillanceParticuliere?: string
        nonSubstituable?: boolean
      }>
      specialInstructions?: string[]
      validity: string
    }
    authentication: {
      signature: string
      practitionerName: string
      registrationNumber: string
      date: string
    }
  }
  laboratoryTests?: {
    header: any
    patient: any
    prescription: {
      datePrescription: string
      clinicalIndication: string
      tests: {
        hematology?: any[]
        clinicalChemistry?: any[]
        immunology?: any[]
        microbiology?: any[]
        endocrinology?: any[]
        general?: any[]
      }
      specialInstructions?: string[]
      recommendedLaboratory?: string
    }
    authentication: {
      signature: string
      practitionerName: string
      registrationNumber: string
      date: string
    }
  }
  paraclinicalExams?: {
    header: any
    patient: any
    prescription: {
      datePrescription: string
      exams: Array<{
        type: string
        modality: string
        region: string
        clinicalIndication: string
        urgency: boolean
        contrast: boolean
        specificProtocol?: string
        diagnosticQuestion?: string
      }>
      specialInstructions?: string[]
    }
    authentication: {
      signature: string
      practitionerName: string
      registrationNumber: string
      date: string
    }
  }
  dietaryProtocol?: {
    header: {
      title: string
      patientName: string
      date: string
    }
    nutritionalAssessment: {
      currentDiet: string
      nutritionalDeficiencies?: string[]
      dietaryRestrictions?: string[]
      culturalConsiderations?: string
    }
    mealPlans: {
      breakfast?: any[]
      lunch?: any[]
      dinner?: any[]
      snacks?: any[]
    }
    nutritionalGuidelines: {
      caloriesTarget?: string
      macronutrients?: {
        proteins?: string
        carbohydrates?: string
        fats?: string
      }
      micronutrients?: string[]
      hydration?: string
    }
    forbiddenFoods?: string[]
    recommendedFoods?: string[]
    specialInstructions?: string[]
    followUpSchedule?: string
  }
  followUpPlan?: {
    header: {
      title: string
      patientName: string
      date: string
    }
    shortTermGoals: Array<{
      goal: string
      timeline: string
      metrics?: string[]
    }>
    longTermGoals: Array<{
      goal: string
      timeline: string
      metrics?: string[]
    }>
    monitoringSchedule: {
      nextAppointment?: string
      followUpFrequency: string
      monitoringParameters: string[]
    }
    lifestyleModifications: {
      physicalActivity?: string[]
      dietaryChanges?: string[]
      stressManagement?: string[]
      sleepHygiene?: string[]
      substanceUse?: string[]
    }
    educationalResources?: string[]
    emergencyProtocol?: {
      warningSigns: string[]
      emergencyContacts: string[]
      actionSteps: string[]
    }
    specialInstructions?: string[]
  }
}

interface ChronicProfessionalReportProps {
  patientData: any
  clinicalData: any
  questionsData: any
  diagnosisData: any
  onComplete?: () => void
}

// ==================== HELPER FUNCTIONS ====================

const createEmptyReport = (): ChronicProfessionalReportData => ({
  medicalReport: {
    header: {
      title: "Chronic Disease Management Report",
      subtitle: "Comprehensive Medical Documentation",
      reference: `REF-CHR-${new Date().getTime()}`,
      reportDate: new Date().toISOString().split('T')[0]
    },
    practitioner: {
      name: "Dr. [Name Required]",
      qualifications: "MBBS",
      specialty: "Internal Medicine / Chronic Disease Management",
      registrationNumber: "[MCM Registration Required]",
      email: "[Email Required]",
      consultationPlatform: "Tibok Teleconsultation Platform",
      facility: "Tibok Teleconsultation Platform",
      contact: "+230 XXX XXXX"
    },
    patient: {
      fullName: "",
      age: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      phone: "",
      email: "",
      weight: "",
      height: "",
      nationalId: ""
    },
    chronicDiseaseAssessment: {
      primaryDiagnosis: "",
      diseaseCategory: "",
      comorbidities: [],
      riskFactors: [],
      complications: []
    },
    clinicalEvaluation: {
      chiefComplaint: "",
      historyOfPresentIllness: "",
      reviewOfSystems: "",
      physicalExamination: "",
      vitalSignsAnalysis: ""
    },
    diagnosticSummary: {
      diagnosticConclusion: "",
      prognosticAssessment: "",
      diseaseManagementGoals: []
    },
    narrative: "",
    metadata: {
      generatedDate: new Date().toISOString(),
      wordCount: 0,
      validationStatus: 'draft'
    }
  }
})

// Helper to format narrative text with bold section headers
function formatNarrativeWithBoldHeaders(narrative: string): string {
  if (!narrative) return ''

  // Define section headers that should be bold (from the API format)
  const sectionHeaders = [
    'CHRONIC DISEASE FOLLOW-UP CONSULTATION REPORT',
    'DOCUMENT INFORMATION',
    'PATIENT IDENTIFICATION',
    'CHIEF COMPLAINT',
    'HISTORY OF PRESENT ILLNESS',
    'PAST MEDICAL HISTORY',
    'PHYSICAL EXAMINATION',
    'REVIEW OF SYSTEMS',
    'CLINICAL ASSESSMENT',
    'CHRONIC DISEASE MANAGEMENT',
    'DIAGNOSTIC SUMMARY',
    'TREATMENT PLAN',
    'PRESCRIPTIONS',
    'ORDONNANCE',
    'LABORATORY INVESTIGATIONS',
    'BIOLOGIE',
    'PARACLINICAL EXAMINATIONS',
    'PARACLINIQUE',
    'DIETARY RECOMMENDATIONS',
    'PATIENT EDUCATION',
    'FOLLOW-UP PLAN',
    'PROGNOSIS',
    'SIGNATURE',
    'MEDICAL CERTIFICATION'
  ]

  // Remove the PHYSICIAN AUTHENTICATION section from the narrative
  // This section will be added separately with the actual signature
  let processedNarrative = narrative

  // Pattern to match PHYSICIAN AUTHENTICATION section and everything after it
  const physicianAuthPattern = /\n*═+\n*PHYSICIAN AUTHENTICATION[\s\S]*$/i
  processedNarrative = processedNarrative.replace(physicianAuthPattern, '')

  // Also try alternative patterns
  const altPattern = /\nPHYSICIAN AUTHENTICATION[\s\S]*$/i
  processedNarrative = processedNarrative.replace(altPattern, '')

  // Split into lines
  const lines = processedNarrative.split('\n')

  // Process each line
  const formattedLines = lines.map(line => {
    const trimmedLine = line.trim()

    // Skip separator lines (preserve them as-is)
    if (trimmedLine.match(/^═+$/)) {
      return line
    }

    // Check if this line is a section header
    if (sectionHeaders.includes(trimmedLine)) {
      // Make it bold using HTML
      return `<strong>${line}</strong>`
    }

    // Regular line - escape HTML special chars to prevent XSS
    return line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  })

  return formattedLines.join('\n')
}

// Helper to normalize patient data from form to API format
function normalizePatientData(patientData: any): any {
  if (!patientData) return null
  
  return {
    // Normalize name fields
    firstName: patientData.firstName || '',
    lastName: patientData.lastName || '',
    fullName: patientData.fullName || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim(),
    name: patientData.name || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim(),
    
    // Other fields
    age: patientData.age || '',
    dateOfBirth: patientData.birthDate || patientData.dateOfBirth || '',
    gender: patientData.gender || '',
    weight: patientData.weight || '',
    height: patientData.height || '',
    phone: patientData.phone || '',
    email: patientData.email || '',
    address: patientData.address || '',
    nationalId: patientData.nationalId || '',
    
    // Normalize allergies (form has array + otherAllergies)
    allergies: Array.isArray(patientData.allergies) 
      ? patientData.allergies.join(', ') + (patientData.otherAllergies ? `, ${patientData.otherAllergies}` : '')
      : (patientData.allergies || ''),
    
    // Normalize medical history (form has array + otherMedicalHistory)
    medicalHistory: Array.isArray(patientData.medicalHistory)
      ? patientData.medicalHistory
      : (patientData.medicalHistory || []),
    
    // Normalize current medications
    currentMedications: patientData.currentMedications || patientData.currentMedicationsText || '',
    
    // Pregnancy info
    pregnancyStatus: patientData.pregnancyStatus || '',
    gestationalAge: patientData.gestationalAge || '',
    lastMenstrualPeriod: patientData.lastMenstrualPeriod || '',
    
    // Pass through any other fields
    ...patientData
  }
}

// Helper to sanitize medications
function sanitizeMedications(medications: any[]): any[] {
  if (!medications || !Array.isArray(medications)) return []
  
  return medications.map(med => {
    if (med && typeof med === 'object') {
      return {
        ...med,
        nom: String(med.nom || med.drug || med.medication_name || ''),
        denominationCommune: String(med.denominationCommune || med.dci || med.genericName || ''),
        dosage: String(med.dosage || ''),
        forme: String(med.forme || med.form || 'tablet'),
        posologie: String(med.posologie || med.frequency || ''),
        modeAdministration: String(med.modeAdministration || med.route || 'Oral route'),
        dureeTraitement: String(med.dureeTraitement || med.duration || '7 days'),
        quantite: String(med.quantite || med.quantity || '1 box'),
        instructions: String(med.instructions || ''),
        justification: String(med.justification || med.indication || ''),
        surveillanceParticuliere: String(med.surveillanceParticuliere || med.monitoring || ''),
        nonSubstituable: Boolean(med.nonSubstituable || false)
      }
    }
    return med
  })
}

// ==================== MAIN COMPONENT ====================

export default function ChronicProfessionalReport({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  onComplete
}: ChronicProfessionalReportProps) {
  
  // ==================== STATE MANAGEMENT ====================
  const [report, setReport] = useState<ChronicProfessionalReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("medical-report")
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'draft' | 'validated'>('draft')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSendingDocuments, setIsSendingDocuments] = useState(false)

  // Sick leave state
  const [sickLeaveData, setSickLeaveData] = useState({
    startDate: '',
    endDate: '',
    numberOfDays: 0,
    medicalReason: '',
    remarks: ''
  })

  // Invoice state with complete structure
  const [invoiceData, setInvoiceData] = useState({
    header: {
      invoiceNumber: '',
      consultationDate: '',
      invoiceDate: ''
    },
    provider: {
      companyName: 'Digital Data Solutions Ltd',
      registrationNumber: 'C20173522',
      vatNumber: '27816949',
      registeredOffice: 'Bourdet Road, Grand Baie, Mauritius',
      phone: '+230 4687377/78',
      email: 'contact@tibok.mu',
      website: 'www.tibok.mu',
      tradeName: 'Tibok'
    },
    patient: {
      name: '',
      email: '',
      phone: '',
      patientId: ''
    },
    services: {
      items: [] as any[],
      subtotal: 0,
      vatRate: 0.15,
      vatAmount: 0,
      totalDue: 0
    },
    payment: {
      method: 'Credit Card',
      status: 'pending',
      receivedDate: ''
    },
    consultationFee: 0
  })

  // Document signatures state for displaying validated signatures
  const [documentSignatures, setDocumentSignatures] = useState<{
    consultation?: string
    prescription?: string
    laboratory?: string
    imaging?: string
    sickLeave?: string
    invoice?: string
  }>({})

  // Local state for narrative text (completely independent like sick leave)
  const [editableNarrative, setEditableNarrative] = useState('')

  // Local state for editable medications (independent, no auto-sync)
  const [localMedications, setLocalMedications] = useState<any>(null)

  // Local state for editable laboratory tests (independent, no auto-sync)
  const [localLabTests, setLocalLabTests] = useState<any>(null)

  // Local state for editable paraclinical exams (independent, no auto-sync)
  const [localParaclinicalExams, setLocalParaclinicalExams] = useState<any>(null)

  // Doctor info state - loaded from sessionStorage (shared with normal consultation)
  const [doctorInfo, setDoctorInfo] = useState({
    nom: "Dr. [Name Required]",
    qualifications: "MBBS",
    specialite: "Internal Medicine / Chronic Disease Management",
    numeroEnregistrement: "[MCM Registration Required]",
    email: "[Email Required]",
    adresseCabinet: "Tibok Teleconsultation Platform",
    telephone: "+230 XXX XXXX",
    heuresConsultation: "Teleconsultation Hours: 8:00 AM - 8:00 PM",
    signatureUrl: null as string | null,
    digitalSignature: null as string | null
  })

  // Consultation IDs from URL params (from Tibok)
  const [consultationId, setConsultationId] = useState<string>('')
  const [tibokPatientId, setTibokPatientId] = useState<string>('')
  const [tibokDoctorId, setTibokDoctorId] = useState<string>('')

  // Dietary on-demand generation state
  const [dietaryLoading, setDietaryLoading] = useState(false)
  const [dietaryError, setDietaryError] = useState<string | null>(null)
  const [detailedDietaryGenerated, setDetailedDietaryGenerated] = useState(false)

  // Initialize editable narrative once when report loads
  useEffect(() => {
    if (report?.medicalReport?.narrative && editableNarrative === '') {
      setEditableNarrative(report.medicalReport.narrative)
    }
  }, [report?.medicalReport?.narrative])

  // Initialize local medications from report (one-time sync)
  useEffect(() => {
    if (report?.medicationPrescription && !localMedications) {
      setLocalMedications(JSON.parse(JSON.stringify(report.medicationPrescription)))
    }
  }, [report?.medicationPrescription])

  // Initialize local lab tests from report (one-time sync)
  useEffect(() => {
    if (report?.laboratoryTests && !localLabTests) {
      setLocalLabTests(JSON.parse(JSON.stringify(report.laboratoryTests)))
    }
  }, [report?.laboratoryTests])

  // Initialize local paraclinical exams from report (one-time sync)
  useEffect(() => {
    if (report?.paraclinicalExams && !localParaclinicalExams) {
      setLocalParaclinicalExams(JSON.parse(JSON.stringify(report.paraclinicalExams)))
    }
  }, [report?.paraclinicalExams])

  // Load doctor info from sessionStorage (shared with normal consultation)
  useEffect(() => {
    const storedDoctorInfo = sessionStorage.getItem('currentDoctorInfo')
    if (storedDoctorInfo) {
      try {
        const doctorData = JSON.parse(storedDoctorInfo)
        console.log('✅ Loaded doctor info from sessionStorage:', doctorData)
        setDoctorInfo(doctorData)
      } catch (error) {
        console.error('❌ Error parsing stored doctor info:', error)
      }
    } else {
      console.warn('⚠️ No doctor info found in sessionStorage - using placeholders')
    }
  }, [])

  // Load consultation IDs from patientData (passed via sessionStorage from main page)
  useEffect(() => {
    // IDs are included in patientData from the main page when chronic disease was selected
    const sessionConsultationId = patientData?.consultationId
    const sessionPatientId = patientData?.patientId
    const sessionDoctorId = patientData?.doctorId

    console.log('🔑 Loading IDs from patientData (sessionStorage):', { sessionConsultationId, sessionPatientId, sessionDoctorId })

    // Test IDs for development/testing on Vercel
    const isTestEnvironment = typeof window !== 'undefined' && (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    )

    const TEST_IDS = {
      consultationId: '94cf134b-32bc-49a1-8168-37f85355e27d',
      patientId: '4c42a303-ee2e-49ad-b156-8348f75c1375',
      doctorId: 'e152c622-abe3-410e-a0ff-75902edaf739'
    }

    if (sessionConsultationId) {
      setConsultationId(sessionConsultationId)
      console.log('✅ Using consultation ID from Tibok:', sessionConsultationId)
    } else if (isTestEnvironment && !sessionConsultationId) {
      // Use test ID in development/test environments
      setConsultationId(TEST_IDS.consultationId)
      console.log('🧪 Using TEST consultation ID:', TEST_IDS.consultationId)
    } else {
      // Fallback to generating local ID if not provided
      const fallbackId = `chronic_disease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setConsultationId(fallbackId)
      console.warn('⚠️ No consultation ID from Tibok, using fallback:', fallbackId)
    }

    if (sessionPatientId) {
      setTibokPatientId(sessionPatientId)
      console.log('✅ Using patient ID from Tibok:', sessionPatientId)
    } else if (isTestEnvironment && !sessionPatientId) {
      setTibokPatientId(TEST_IDS.patientId)
      console.log('🧪 Using TEST patient ID:', TEST_IDS.patientId)
    } else {
      console.warn('⚠️ No patient ID in patientData')
    }

    if (sessionDoctorId) {
      setTibokDoctorId(sessionDoctorId)
      console.log('✅ Using doctor ID from Tibok:', sessionDoctorId)
    } else if (isTestEnvironment && !sessionDoctorId) {
      setTibokDoctorId(TEST_IDS.doctorId)
      console.log('🧪 Using TEST doctor ID:', TEST_IDS.doctorId)
    } else {
      console.warn('⚠️ No doctor ID in patientData')
    }
  }, [patientData])

  // Auto-fill sick leave medical reason from diagnosis when report is generated
  useEffect(() => {
    if (report && !sickLeaveData.medicalReason) {
      // Use full detailed text from consultation report
      const historyOfPresentIllness = report.medicalReport?.clinicalEvaluation?.historyOfPresentIllness || ''
      const diagnosticConclusion = report.medicalReport?.diagnosticSummary?.diagnosticConclusion || ''

      console.log('🏥 Auto-filling sick leave medical reason:')
      console.log('  - historyOfPresentIllness:', historyOfPresentIllness ? `${historyOfPresentIllness.substring(0, 100)}...` : 'EMPTY')
      console.log('  - diagnosticConclusion:', diagnosticConclusion ? `${diagnosticConclusion.substring(0, 100)}...` : 'EMPTY')

      // Combine full text from both sections with a blank line separator
      const sections = []
      if (historyOfPresentIllness) sections.push(historyOfPresentIllness)
      if (diagnosticConclusion) sections.push(diagnosticConclusion)

      if (sections.length > 0) {
        console.log('  ✅ Using detailed text (both or one field available)')
        setSickLeaveData(prev => ({ ...prev, medicalReason: sections.join('\n\n') }))
      } else {
        // Fallback to shorter fields if detailed ones don't exist
        const chiefComplaint = report.medicalReport?.clinicalEvaluation?.chiefComplaint || ''
        const primaryDiagnosis = report.medicalReport?.chronicDiseaseAssessment?.primaryDiagnosis || ''

        console.log('  ⚠️ No detailed text found, using fallback:')
        console.log('    - chiefComplaint:', chiefComplaint)
        console.log('    - primaryDiagnosis:', primaryDiagnosis)

        if (chiefComplaint && primaryDiagnosis) {
          setSickLeaveData(prev => ({ ...prev, medicalReason: `${chiefComplaint}\n\n${primaryDiagnosis}` }))
        } else {
          const diagnosis = chiefComplaint || primaryDiagnosis
          if (diagnosis) {
            setSickLeaveData(prev => ({ ...prev, medicalReason: diagnosis }))
          }
        }
      }
    }
  }, [report, sickLeaveData.medicalReason])

  // Initialize invoice data when report is generated
  useEffect(() => {
    if (report && !invoiceData.header.invoiceNumber) {
      const today = new Date().toLocaleDateString('en-US')
      const invoiceNumber = `TIBOK-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`
      const patientId = `ANON-RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

      const defaultFee = 950
      const subtotal = defaultFee
      const vatAmount = 0 // Medical services are VAT exempt
      const totalDue = subtotal + vatAmount

      setInvoiceData(prev => ({
        ...prev,
        header: {
          invoiceNumber,
          consultationDate: today,
          invoiceDate: today
        },
        patient: {
          name: report.medicalReport.patient.fullName || '',
          email: report.medicalReport.patient.email || '',
          phone: report.medicalReport.patient.phone || '',
          patientId
        },
        consultationFee: defaultFee,
        services: {
          ...prev.services,
          items: [{
            description: 'Online Chronic Disease consultation via Tibok',
            quantity: 1,
            unitPrice: defaultFee,
            total: defaultFee
          }],
          subtotal,
          vatAmount,
          totalDue
        }
      }))
    }
  }, [report, invoiceData.header.invoiceNumber])
  
  // ==================== DATA GENERATION ====================
  
  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])
  
  useEffect(() => {
    const generateReport = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Initialize empty report structure
        const initialReport = createEmptyReport()
        
        // Populate patient data
        if (patientData) {
          initialReport.medicalReport.patient = {
            fullName: patientData.fullName || patientData.name || "",
            age: patientData.age || "",
            dateOfBirth: patientData.dateOfBirth || "",
            gender: patientData.gender || "",
            address: patientData.address || "",
            phone: patientData.phone || "",
            email: patientData.email || "",
            weight: patientData.weight || "",
            height: patientData.height || "",
            nationalId: patientData.nationalId || "",
            temperature: patientData.temperature || "",
            bloodPressureSystolic: patientData.bloodPressureSystolic || "",
            bloodPressureDiastolic: patientData.bloodPressureDiastolic || "",
            bloodGlucose: patientData.bloodGlucose || "",
            allergies: patientData.allergies || "",
            medicalHistory: patientData.medicalHistory || "",
            currentMedications: patientData.currentMedications || ""
          }
        }

        // Populate doctor/practitioner data from sessionStorage
        initialReport.medicalReport.practitioner = {
          name: doctorInfo.nom,
          qualifications: doctorInfo.qualifications,
          specialty: doctorInfo.specialite,
          registrationNumber: doctorInfo.numeroEnregistrement,
          email: doctorInfo.email,
          consultationPlatform: "Tibok Teleconsultation Platform",
          facility: doctorInfo.adresseCabinet || "Tibok Teleconsultation Platform",
          contact: doctorInfo.telephone || doctorInfo.email
        }
        console.log('👨‍⚕️ Doctor info populated:', initialReport.medicalReport.practitioner)

        // Populate disease assessment from diagnosisData
        if (diagnosisData) {
          initialReport.medicalReport.chronicDiseaseAssessment = {
            primaryDiagnosis: diagnosisData.primaryDiagnosis || diagnosisData.diagnosis || "",
            diseaseCategory: diagnosisData.category || diagnosisData.diseaseCategory || "",
            diseaseStage: diagnosisData.stage || diagnosisData.diseaseStage,
            comorbidities: diagnosisData.comorbidities || [],
            riskFactors: diagnosisData.riskFactors || diagnosisData.risk_factors || [],
            complications: diagnosisData.complications || []
          }
          
          // Extract clinical evaluation
          initialReport.medicalReport.clinicalEvaluation = {
            chiefComplaint: diagnosisData.chiefComplaint || diagnosisData.presentingComplaint || "",
            historyOfPresentIllness: diagnosisData.historyOfPresentIllness || diagnosisData.history || "",
            reviewOfSystems: diagnosisData.reviewOfSystems || "",
            physicalExamination: diagnosisData.physicalExamination || diagnosisData.examination || "",
            vitalSignsAnalysis: diagnosisData.vitalSignsAnalysis || ""
          }
          
          // Extract diagnostic summary
          initialReport.medicalReport.diagnosticSummary = {
            diagnosticConclusion: diagnosisData.diagnosticConclusion || diagnosisData.conclusion || "",
            prognosticAssessment: diagnosisData.prognosis || diagnosisData.prognosticAssessment || "",
            diseaseManagementGoals: diagnosisData.managementGoals || diagnosisData.treatmentGoals || []
          }
          
          // Extract dietary protocol from meal plans
          console.log('🍽️ Diagnosis Data for Dietary Protocol:', diagnosisData)
          if (diagnosisData.detailedMealPlan || diagnosisData.mealPlan || diagnosisData.nutritionPlan) {
            const mealPlanData = diagnosisData.detailedMealPlan || diagnosisData.mealPlan || diagnosisData.nutritionPlan
            console.log('✅ Meal Plan Data Found:', mealPlanData)
            initialReport.dietaryProtocol = {
              header: {
                title: "Dietary Protocol for Chronic Disease Management",
                patientName: initialReport.medicalReport.patient.fullName,
                date: new Date().toISOString().split('T')[0]
              },
              nutritionalAssessment: {
                currentDiet: mealPlanData.currentDiet || "",
                nutritionalDeficiencies: mealPlanData.deficiencies || [],
                dietaryRestrictions: mealPlanData.restrictions || [],
                culturalConsiderations: mealPlanData.culturalConsiderations || ""
              },
              mealPlans: {
                breakfast: Array.isArray(mealPlanData.breakfast) 
                  ? mealPlanData.breakfast 
                  : (mealPlanData.breakfast ? [mealPlanData.breakfast] : []),
                lunch: Array.isArray(mealPlanData.lunch)
                  ? mealPlanData.lunch
                  : (mealPlanData.lunch ? [mealPlanData.lunch] : []),
                dinner: Array.isArray(mealPlanData.dinner)
                  ? mealPlanData.dinner
                  : (mealPlanData.dinner ? [mealPlanData.dinner] : []),
                snacks: Array.isArray(mealPlanData.snacks)
                  ? mealPlanData.snacks
                  : (mealPlanData.snacks ? [mealPlanData.snacks] : [])
              },
              nutritionalGuidelines: {
                caloriesTarget: mealPlanData.caloriesTarget || mealPlanData.dailyCalories,
                macronutrients: mealPlanData.macronutrients || {},
                micronutrients: mealPlanData.micronutrients || [],
                hydration: mealPlanData.hydration || "8-10 glasses of water daily"
              },
              forbiddenFoods: mealPlanData.forbiddenFoods || mealPlanData.foodsToAvoid || [],
              recommendedFoods: mealPlanData.recommendedFoods || mealPlanData.foodsToFavor || [],
              specialInstructions: mealPlanData.specialInstructions || mealPlanData.portionControlTips || [],
              followUpSchedule: mealPlanData.followUpSchedule || "Monthly nutritional assessment"
            }
          }
          
          // Extract and build follow-up plan from diagnosis data
          if (diagnosisData.followUpPlan || diagnosisData.diseaseAssessment) {
            const followUpData = diagnosisData.followUpPlan || {}
            const assessment = diagnosisData.diseaseAssessment || {}
            
            // Calculate BMI for follow-up goals
            const weight = parseFloat(patientData.weight) || 0
            const heightInMeters = (parseFloat(patientData.height) || 0) / 100
            const bmi = (weight > 0 && heightInMeters > 0) 
              ? weight / (heightInMeters * heightInMeters) 
              : 0
            
            // Build short-term goals from diagnosis
            const shortTermGoals = []
            if (assessment.diabetesControl?.currentHbA1c) {
              shortTermGoals.push({
                goal: `Improve glycemic control - Target HbA1c <7%`,
                timeline: "0-3 months",
                metrics: [
                  `Current: ${assessment.diabetesControl.currentHbA1c}`,
                  `Target: <7% (good control)`,
                  `Monitor: Fasting glucose, post-prandial glucose`
                ]
              })
            }
            if (assessment.hypertensionAssessment?.currentBP) {
              shortTermGoals.push({
                goal: `Control blood pressure - Target <130/80 mmHg`,
                timeline: "0-3 months",
                metrics: [
                  `Current: ${assessment.hypertensionAssessment.currentBP}`,
                  `Target: <130/80 mmHg`,
                  `Monitor: Daily BP readings`
                ]
              })
            }
            if (patientData.weight && bmi > 25) {
              const targetWeight = Math.round(patientData.weight * 0.95) // 5% reduction
              shortTermGoals.push({
                goal: `Weight reduction - Lose 5% of body weight`,
                timeline: "0-3 months",
                metrics: [
                  `Current: ${patientData.weight} kg (BMI: ${bmi.toFixed(1)})`,
                  `Target: ${targetWeight} kg`,
                  `Monitor: Weekly weigh-ins`
                ]
              })
            }
            
            // Build long-term goals
            const longTermGoals = []
            if (assessment.diabetesControl) {
              longTermGoals.push({
                goal: `Prevent diabetes complications`,
                timeline: "6-12 months",
                metrics: [
                  `HbA1c maintained <7%`,
                  `No retinopathy progression`,
                  `No nephropathy (microalbuminuria screening)`,
                  `No neuropathy symptoms`
                ]
              })
            }
            if (assessment.hypertensionAssessment) {
              longTermGoals.push({
                goal: `Reduce cardiovascular risk`,
                timeline: "6-12 months",
                metrics: [
                  `BP controlled <130/80 mmHg`,
                  `LDL cholesterol <1.0 g/L`,
                  `No cardiac events`
                ]
              })
            }
            if (bmi > 25) {
              longTermGoals.push({
                goal: `Achieve healthy weight`,
                timeline: "6-12 months",
                metrics: [
                  `Target BMI: 22-25`,
                  `Sustained weight loss`,
                  `Improved metabolic parameters`
                ]
              })
            }
            
            // Build monitoring parameters
            const monitoringParameters = []
            if (assessment.diabetesControl) {
              monitoringParameters.push(
                "HbA1c every 3 months",
                "Fasting glucose weekly",
                "Post-prandial glucose as needed",
                "Annual eye exam (retinopathy screening)",
                "Annual foot exam",
                "Annual kidney function (creatinine, microalbuminuria)"
              )
            }
            if (assessment.hypertensionAssessment) {
              monitoringParameters.push(
                "Blood pressure daily at home",
                "Lipid panel every 6 months",
                "ECG annually",
                "Cardiovascular risk assessment"
              )
            }
            monitoringParameters.push(
              "Weight weekly",
              "Medication adherence check",
              "Side effects monitoring"
            )
            
            // Build lifestyle modifications
            const lifestyleModifications = {
              physicalActivity: [
                "30 minutes of moderate exercise 5 days per week",
                "Walking, swimming, or cycling recommended",
                "Gradually increase intensity",
                "Avoid sedentary lifestyle - move every hour"
              ],
              dietaryChanges: [
                "Follow prescribed 7-day meal plan",
                "Reduce sodium intake (<2300mg/day)",
                "Increase fiber intake (25-35g/day)",
                "Limit simple sugars and refined carbohydrates",
                "Portion control - use smaller plates"
              ],
              stressManagement: [
                "Practice relaxation techniques daily",
                "Yoga or meditation 15 minutes/day",
                "Adequate sleep (7-8 hours/night)",
                "Seek support from family/friends",
                "Consider counseling if needed"
              ],
              sleepHygiene: [
                "Consistent sleep schedule (same bedtime/wake time)",
                "Avoid screens 1 hour before bed",
                "Keep bedroom cool and dark",
                "Limit caffeine after 2 PM",
                "Avoid heavy meals before bedtime"
              ]
            }
            
            // Build emergency protocol
            const emergencyProtocol = {
              warningSigns: [],
              emergencyContacts: [
                "Emergency Services: 114 or 999",
                "Your Doctor: [Phone number from medical record]",
                "Nearest Hospital: [Location based hospital]"
              ],
              actionSteps: []
            }
            
            if (assessment.diabetesControl) {
              emergencyProtocol.warningSigns.push(
                "Severe hypoglycemia: Confusion, sweating, tremors, loss of consciousness",
                "Severe hyperglycemia: Blood glucose >3.0 g/L with nausea, vomiting",
                "Diabetic ketoacidosis: Fruity breath, rapid breathing, confusion"
              )
              emergencyProtocol.actionSteps.push(
                "If hypoglycemia: Take 15g fast-acting sugar, recheck in 15 min",
                "If severe hyperglycemia: Drink water, take prescribed medication, call doctor",
                "If unconscious or severe symptoms: Call 114 immediately"
              )
            }
            
            if (assessment.hypertensionAssessment) {
              emergencyProtocol.warningSigns.push(
                "Hypertensive crisis: BP >180/120 mmHg",
                "Chest pain or pressure",
                "Severe headache",
                "Shortness of breath",
                "Vision changes"
              )
              emergencyProtocol.actionSteps.push(
                "If BP >180/120: Rest, recheck in 5 minutes",
                "If chest pain: Call 114 immediately - possible heart attack",
                "If stroke symptoms (FAST): Call 114 immediately"
              )
            }
            
            initialReport.followUpPlan = {
              header: {
                title: "Chronic Disease Management & Follow-Up Plan",
                patientName: initialReport.medicalReport.patient.fullName,
                date: new Date().toISOString().split('T')[0]
              },
              shortTermGoals: shortTermGoals.length > 0 ? shortTermGoals : followUpData.shortTermGoals || [],
              longTermGoals: longTermGoals.length > 0 ? longTermGoals : followUpData.longTermGoals || [],
              monitoringSchedule: {
                nextAppointment: followUpData.nextAppointment || "To be scheduled within 4 weeks",
                followUpFrequency: "Monthly for first 3 months, then quarterly",
                monitoringParameters: monitoringParameters
              },
              lifestyleModifications: lifestyleModifications,
              educationalResources: followUpData.educationalResources || [
                "Diabetes education program enrollment recommended",
                "Nutritional counseling sessions",
                "Patient support groups",
                "Online resources: mauritiusdiabetes.org"
              ],
              emergencyProtocol: emergencyProtocol,
              specialInstructions: followUpData.specialInstructions || [
                "Keep a health diary: track glucose, BP, weight, medications",
                "Bring all medications to each appointment",
                "Report any new symptoms immediately",
                "Maintain regular meal times",
                "Stay hydrated (8-10 glasses water daily)"
              ]
            }
          }
        }
        
        setReport(initialReport)
        
        // Normalize patient data BEFORE sending to APIs
        const normalizedPatientData = normalizePatientData(patientData)
        console.log('✅ Normalized patient data:', normalizedPatientData)
        
        // Now fetch only the THREE critical API responses in parallel (report, prescription, examens)
        // Dietary plan will be generated ON-DEMAND when user clicks button
        const [reportResponse, prescriptionResponse, examensResponse] = await Promise.all([
          fetch("/api/chronic-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientData: normalizedPatientData,
              clinicalData,
              questionsData,
              diagnosisData,
              doctorData: {
                fullName: doctorInfo.nom.replace(/^Dr\.\s*/i, ''),
                qualifications: doctorInfo.qualifications,
                specialty: doctorInfo.specialite,
                medicalCouncilNumber: doctorInfo.numeroEnregistrement,
                email: doctorInfo.email,
                clinicAddress: doctorInfo.adresseCabinet,
                consultationHours: doctorInfo.heuresConsultation
              }
            })
          }),
          fetch("/api/chronic-prescription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientData: normalizedPatientData,
              clinicalData,
              diagnosisData,
              doctorData: {
                fullName: doctorInfo.nom.replace(/^Dr\.\s*/i, ''),
                qualifications: doctorInfo.qualifications,
                specialty: doctorInfo.specialite,
                medicalCouncilNumber: doctorInfo.numeroEnregistrement,
                email: doctorInfo.email,
                clinicAddress: doctorInfo.adresseCabinet,
                consultationHours: doctorInfo.heuresConsultation
              }
            })
          }),
          fetch("/api/chronic-examens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientData: normalizedPatientData,
              clinicalData,
              diagnosisData,
              doctorData: {
                fullName: doctorInfo.nom.replace(/^Dr\.\s*/i, ''),
                qualifications: doctorInfo.qualifications,
                specialty: doctorInfo.specialite,
                medicalCouncilNumber: doctorInfo.numeroEnregistrement,
                email: doctorInfo.email,
                clinicAddress: doctorInfo.adresseCabinet,
                consultationHours: doctorInfo.heuresConsultation
              }
            })
          })
        ])
        
        // Check all critical APIs
        if (!reportResponse.ok) {
          throw new Error(`Report API failed: ${reportResponse.statusText}`)
        }
        if (!prescriptionResponse.ok) {
          throw new Error(`Prescription API failed: ${prescriptionResponse.statusText}`)
        }
        if (!examensResponse.ok) {
          throw new Error(`Examens API failed: ${examensResponse.statusText}`)
        }
        
        const reportData = await reportResponse.json()
        const prescriptionData = await prescriptionResponse.json()
        const examensData = await examensResponse.json()
        
        // NO dietary API call here - will be called on-demand via button
        
        console.log('📊 API Response - Report:', reportData)
        console.log('💊 API Response - Prescription:', prescriptionData)
        console.log('🧪 API Response - Examens:', examensData)
        console.log('ℹ️ Dietary will be generated on-demand via button')
        
        // Update report with API responses
        setReport(prev => {
          if (!prev) return null
          
          const updatedReport = { ...prev }
          
          // Update narrative from chronic-report API
          if (reportData.report) {
            // NEW STRUCTURE: API now returns medicalReport directly
            if (reportData.report.medicalReport) {
              // Update entire medicalReport structure from API
              updatedReport.medicalReport = {
                ...updatedReport.medicalReport,
                ...reportData.report.medicalReport
              }
              console.log('✅ Medical report updated from API structure')
            } else {
              // FALLBACK: Old structure or string
              const narrativeText = reportData.report.narrativeReport?.fullText || 
                                   reportData.report.narrativeReport || 
                                   (typeof reportData.report === 'string' ? reportData.report : JSON.stringify(reportData.report, null, 2))
              
              updatedReport.medicalReport.narrative = narrativeText
              updatedReport.medicalReport.metadata.wordCount = typeof narrativeText === 'string' 
                ? narrativeText.split(/\s+/).length 
                : 0
              console.log('⚠️ Using fallback narrative extraction')
            }
          }
          
          // Update prescriptions from chronic-report API if available
          if (reportData.report && reportData.report.medicationPrescription) {
            updatedReport.medicationPrescription = reportData.report.medicationPrescription
            console.log('💊 Medication prescription from chronic-report API')
          }
          if (reportData.report && reportData.report.laboratoryTests) {
            updatedReport.laboratoryTests = reportData.report.laboratoryTests
            console.log('🧪 Laboratory tests from chronic-report API')
          }
          if (reportData.report && reportData.report.paraclinicalExams) {
            updatedReport.paraclinicalExams = reportData.report.paraclinicalExams
            console.log('📷 Paraclinical exams from chronic-report API')
          }
          
          // Update medication prescription from chronic-prescription API (fallback or additional)
          // API returns: { success: true, prescription: { chronicMedications: [...], ... } }
          if (prescriptionData.success && prescriptionData.prescription) {
            const presData = prescriptionData.prescription
            console.log('💊 Prescription Data Structure:', presData)
            
            // Transform chronicMedications to match expected structure
            const medications = presData.chronicMedications || []
            const transformedMeds = medications.map((med: any) => ({
              nom: med.brandName || med.dci || '',
              denominationCommune: med.dci || med.genericName || '',
              dosage: med.strength || '',
              forme: med.dosageForm || 'tablet',
              posologie: med.posology?.frequency || med.posology?.dosage || '',
              modeAdministration: med.posology?.route || 'Oral route',
              dureeTraitement: med.treatment?.duration || 'Long-term chronic treatment',
              quantite: med.treatment?.totalQuantity || '1 box',
              instructions: med.posology?.specificInstructions || '',
              justification: med.indication?.chronicDisease || '',
              surveillanceParticuliere: med.monitoring?.clinicalMonitoring || '',
              nonSubstituable: false
            }))
            
            // Ensure specialInstructions is always an array
            const counselingPoints = presData.pharmacistNotes?.counselingPoints
            let specialInstructions: string[] = []
            if (Array.isArray(counselingPoints)) {
              specialInstructions = counselingPoints
            } else if (typeof counselingPoints === 'string' && counselingPoints.trim()) {
              specialInstructions = [counselingPoints]
            }
            
            updatedReport.medicationPrescription = {
              header: prev.medicalReport.practitioner,
              patient: prev.medicalReport.patient,
              prescription: {
                datePrescription: new Date().toISOString().split('T')[0],
                medications: transformedMeds,
                specialInstructions: specialInstructions,
                validity: presData.prescriptionHeader?.validityPeriod || "3 months unless otherwise specified"
              },
              authentication: {
                signature: "Medical Practitioner's Signature",
                practitionerName: prev.medicalReport.practitioner.name,
                registrationNumber: prev.medicalReport.practitioner.registrationNumber,
                date: new Date().toISOString().split('T')[0]
              }
            }
            console.log('💊 Transformed Medications:', transformedMeds.length, 'medications')
          }
          
          // Update laboratory tests and paraclinical exams from chronic-examens API
          // API returns: { success: true, examOrders: { laboratoryTests: [...], paraclinicalExams: [...] } }
          if (examensData.success && examensData.examOrders) {
            const examOrders = examensData.examOrders
            console.log('🧪 Exam Orders Structure:', examOrders)
            
            // Laboratory tests
            if (examOrders.laboratoryTests && examOrders.laboratoryTests.length > 0) {
              const labTests = examOrders.laboratoryTests
              
              // Group tests by category
              const groupedTests: any = {
                hematology: [],
                clinicalChemistry: [],
                immunology: [],
                microbiology: [],
                endocrinology: [],
                general: []
              }
              
              labTests.forEach((test: any) => {
                const testObj = {
                  nom: test.testName || '',
                  indication: test.clinicalIndication || '',
                  urgence: test.urgency === 'URGENT',
                  aJeun: test.preparation?.fasting || false,
                  instructions: test.preparation?.otherInstructions || ''
                }
                
                const category = test.category?.toLowerCase() || ''
                if (category.includes('hémat') || category.includes('hemat')) {
                  groupedTests.hematology.push(testObj)
                } else if (category.includes('biochi') || category.includes('chemistry')) {
                  groupedTests.clinicalChemistry.push(testObj)
                } else if (category.includes('immun')) {
                  groupedTests.immunology.push(testObj)
                } else if (category.includes('micro')) {
                  groupedTests.microbiology.push(testObj)
                } else if (category.includes('endocrin')) {
                  groupedTests.endocrinology.push(testObj)
                } else {
                  groupedTests.general.push(testObj)
                }
              })
              
              updatedReport.laboratoryTests = {
                header: prev.medicalReport.practitioner,
                patient: prev.medicalReport.patient,
                prescription: {
                  datePrescription: new Date().toISOString().split('T')[0],
                  clinicalIndication: examOrders.orderHeader?.clinicalContext || "Chronic disease monitoring",
                  tests: groupedTests,
                  specialInstructions: [],
                  recommendedLaboratory: ""
                },
                authentication: {
                  signature: "Medical Practitioner's Signature",
                  practitionerName: prev.medicalReport.practitioner.name,
                  registrationNumber: prev.medicalReport.practitioner.registrationNumber,
                  date: new Date().toISOString().split('T')[0]
                }
              }
              console.log('🧪 Laboratory Tests Grouped:', Object.keys(groupedTests).map(k => `${k}: ${groupedTests[k].length}`).join(', '))
            }
            
            // Paraclinical exams (imaging, etc.)
            if (examOrders.paraclinicalExams && examOrders.paraclinicalExams.length > 0) {
              const paraclinicalExams = examOrders.paraclinicalExams.map((exam: any) => ({
                type: exam.examName || exam.examType || '',
                modality: exam.category || 'IMAGING',
                region: exam.technicalSpecifications?.views || '',
                clinicalIndication: exam.clinicalIndication || '',
                urgency: exam.urgency === 'URGENT',
                contrast: exam.preparation?.contrastAllergy !== undefined,
                specificProtocol: exam.technicalSpecifications?.specificProtocol || '',
                diagnosticQuestion: exam.expectedFindings?.concerningFindings || ''
              }))
              
              updatedReport.paraclinicalExams = {
                header: prev.medicalReport.practitioner,
                patient: prev.medicalReport.patient,
                prescription: {
                  datePrescription: new Date().toISOString().split('T')[0],
                  exams: paraclinicalExams,
                  specialInstructions: []
                },
                authentication: {
                  signature: "Medical Practitioner's Signature",
                  practitionerName: prev.medicalReport.practitioner.name,
                  registrationNumber: prev.medicalReport.practitioner.registrationNumber,
                  date: new Date().toISOString().split('T')[0]
                }
              }
              console.log('🏥 Paraclinical Exams:', paraclinicalExams.length, 'exams')
            }
          }
          
          // Dietary protocol will be generated on-demand via button
          // No dietary data from initial load - user will click button to generate
          console.log('ℹ️ Dietary protocol will be generated on-demand via button click')
          
          console.log('✅ Updated Report Structure:', {
            hasMedicationPrescription: !!updatedReport.medicationPrescription,
            hasLaboratoryTests: !!updatedReport.laboratoryTests,
            hasParaclinicalExams: !!updatedReport.paraclinicalExams,
            hasDietaryProtocol: !!updatedReport.dietaryProtocol,
            medicationCount: updatedReport.medicationPrescription?.prescription?.medications?.length || 0,
            labTestCategories: Object.keys(updatedReport.laboratoryTests?.prescription?.tests || {}),
            paraclinicalExamCount: updatedReport.paraclinicalExams?.prescription?.exams?.length || 0,
            dietaryMealsCount: updatedReport.dietaryProtocol ? 
              (updatedReport.dietaryProtocol.mealPlans?.breakfast?.length || 0) + 
              (updatedReport.dietaryProtocol.mealPlans?.lunch?.length || 0) + 
              (updatedReport.dietaryProtocol.mealPlans?.dinner?.length || 0) : 0
          })
          
          return updatedReport
        })
        
        toast({
          title: "Success",
          description: "Professional chronic disease report generated successfully",
        })
        
      } catch (err: any) {
        console.error("Error generating chronic professional report:", err)
        setError(err.message || "Failed to generate report")
        toast({
          title: "Error",
          description: err.message || "Failed to generate report",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    if (patientData && diagnosisData && doctorInfo.nom !== "Dr. [Name Required]") {
      generateReport()
    }
  }, [patientData, clinicalData, questionsData, diagnosisData, doctorInfo])
  
  // ==================== EVENT HANDLERS ====================
  
  const handlePrint = useCallback(() => {
    window.print()
  }, [])
  
  const handleValidation = useCallback(async () => {
    if (validationStatus === 'validated') return

    if (!consultationId) {
      toast({
        title: "Validation Error",
        description: "No consultation ID available",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Generate signature for validation
      let signatureDataUrl: string | null = null;

      // Try to use real signature first
      const realSignatureUrl = doctorInfo.signatureUrl || doctorInfo.digitalSignature;

      if (realSignatureUrl) {
        console.log('🖊️ Attempting to use real doctor signature...');

        // Process the URL to ensure it's complete
        if (realSignatureUrl.startsWith('data:')) {
          signatureDataUrl = realSignatureUrl;
          console.log('✅ Using stored digital signature (base64)');
        } else if (realSignatureUrl.startsWith('http://') || realSignatureUrl.startsWith('https://')) {
          signatureDataUrl = realSignatureUrl;
          console.log('✅ Using signature URL directly:', signatureDataUrl);
        } else {
          // Build full URL from Supabase
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            if (!realSignatureUrl.includes('/')) {
              signatureDataUrl = `${supabaseUrl}/storage/v1/object/public/documents/doctor-signatures/${realSignatureUrl}`;
            } else if (realSignatureUrl.startsWith('documents/doctor-signatures/')) {
              signatureDataUrl = `${supabaseUrl}/storage/v1/object/public/${realSignatureUrl}`;
            } else if (realSignatureUrl.startsWith('doctor-signatures/')) {
              signatureDataUrl = `${supabaseUrl}/storage/v1/object/public/documents/${realSignatureUrl}`;
            } else {
              signatureDataUrl = `${supabaseUrl}/storage/v1/object/public/documents/doctor-signatures/${realSignatureUrl}`;
            }
            console.log('📎 Built signature URL:', signatureDataUrl);
          }
        }
      }

      // If no real signature, generate a fallback
      if (!signatureDataUrl) {
        console.log('📝 Generating fallback signature...');

        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 300, 80);

          const nameParts = doctorInfo.nom.replace('Dr. ', '').split(' ');
          const nameHash = doctorInfo.nom.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const signatureStyle = nameHash % 3;

          ctx.save();
          ctx.translate(50, 40);

          ctx.strokeStyle = '#1a1a2e';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (signatureStyle === 0) {
            // Cursive style
            ctx.font = 'italic 24px "Brush Script MT", cursive';
            ctx.fillStyle = '#1a1a2e';
            ctx.fillText(nameParts.join(' '), 0, 0);
          } else if (signatureStyle === 1) {
            // Initial style
            ctx.font = 'bold 28px Georgia';
            ctx.fillStyle = '#1a1a2e';
            const initials = nameParts.map(p => p.charAt(0)).join('');
            ctx.fillText(initials, 0, 0);
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(60, 8);
            ctx.stroke();
          } else {
            // Flowing style
            ctx.beginPath();
            let xOffset = 0;
            for (const part of nameParts) {
              const charWidth = 12;
              for (let i = 0; i < part.length; i++) {
                const x = xOffset + i * charWidth;
                const y = Math.sin(i * 0.5) * 5;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              xOffset += part.length * charWidth + 8;
            }
            ctx.stroke();
          }

          // Add date
          ctx.font = '9px Arial';
          ctx.fillStyle = '#9ca3af';
          ctx.textAlign = 'left';
          const date = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          ctx.fillText(`Signed: ${date}`, 0, 35);
          ctx.restore();

          signatureDataUrl = canvas.toDataURL('image/png');
          console.log('✅ Generated fallback signature');
        }
      }

      // Create signatures object for all document types
      const signatures = {
        consultation: signatureDataUrl,
        prescription: signatureDataUrl,
        laboratory: signatureDataUrl,
        imaging: signatureDataUrl,
        sickLeave: signatureDataUrl,
        invoice: signatureDataUrl
      };

      // Update document signatures state for UI display
      setDocumentSignatures(signatures);

      // Sync all local state back to report (same pattern as sickLeaveData)
      const updatedReport = {
        ...report,
        medicalReport: {
          ...report.medicalReport,
          narrative: editableNarrative
        },
        ...(localMedications && { medicationPrescription: localMedications }),
        ...(localLabTests && { laboratoryTests: localLabTests }),
        ...(localParaclinicalExams && { paraclinicalExams: localParaclinicalExams })
      }

      // Format report for save-medical-report API
      const formattedReport = {
        compteRendu: {
          praticien: {
            nom: updatedReport.medicalReport.practitioner.name,
            qualifications: updatedReport.medicalReport.practitioner.qualifications,
            specialite: updatedReport.medicalReport.practitioner.specialty,
            numeroEnregistrement: updatedReport.medicalReport.practitioner.registrationNumber,
            email: updatedReport.medicalReport.practitioner.email,
            adresseCabinet: "Medical Clinic",
            telephone: "+230 XXX XXXX",
            heuresConsultation: "Mon-Fri: 9:00-17:00"
          },
          patient: {
            nom: updatedReport.medicalReport.patient.fullName,
            age: updatedReport.medicalReport.patient.age,
            dateNaissance: updatedReport.medicalReport.patient.dateOfBirth,
            sexe: updatedReport.medicalReport.patient.gender,
            adresse: updatedReport.medicalReport.patient.address || '',
            telephone: updatedReport.medicalReport.patient.phone || '',
            email: updatedReport.medicalReport.patient.email || ''
          },
          rapport: {
            motifConsultation: updatedReport.medicalReport.chronicDiseaseAssessment.primaryDiagnosis,
            antecedentsMedicaux: updatedReport.medicalReport.patient.medicalHistory || '',
            examenClinique: updatedReport.medicalReport.clinicalEvaluation.physicalExamination,
            conclusionDiagnostique: updatedReport.medicalReport.diagnosticSummary.diagnosticConclusion,
            planTraitement: updatedReport.medicalReport.narrative,
            recommandations: '',
            planSuivi: ''
          },
          metadata: {
            dateGeneration: new Date().toISOString(),
            typeConsultation: 'chronic_disease',
            validationStatus: 'validated'
          }
        },
        ordonnances: {
          ...(updatedReport.medicationPrescription && {
            medicaments: updatedReport.medicationPrescription
          }),
          ...(updatedReport.laboratoryTests && {
            biologie: updatedReport.laboratoryTests
          }),
          ...(updatedReport.paraclinicalExams && {
            imagerie: updatedReport.paraclinicalExams
          }),
          ...(sickLeaveData.numberOfDays > 0 && {
            arretMaladie: {
              enTete: {
                nom: updatedReport.medicalReport.practitioner.name,
                numeroEnregistrement: updatedReport.medicalReport.practitioner.registrationNumber
              },
              patient: {
                nom: updatedReport.medicalReport.patient.fullName,
                age: updatedReport.medicalReport.patient.age,
                dateNaissance: updatedReport.medicalReport.patient.dateOfBirth || '',
                adresse: updatedReport.medicalReport.patient.address || ''
              },
              certificat: {
                dateDebut: sickLeaveData.startDate,
                dateFin: sickLeaveData.endDate,
                nombreJours: sickLeaveData.numberOfDays,
                motifMedical: sickLeaveData.medicalReason,
                remarques: sickLeaveData.remarks
              },
              authentification: {
                signature: "Medical Practitioner's Signature",
                nomEnCapitales: updatedReport.medicalReport.practitioner.name.toUpperCase(),
                numeroEnregistrement: updatedReport.medicalReport.practitioner.registrationNumber,
                date: new Date().toISOString().split('T')[0]
              }
            }
          })
        },
        ...(invoiceData.services.totalDue > 0 && {
          invoice: {
            header: invoiceData.header,
            provider: invoiceData.provider,
            patient: invoiceData.patient,
            services: invoiceData.services,
            payment: invoiceData.payment
          }
        })
      }

      // Save to consultation_records table
      const response = await fetch('/api/save-medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          patientId: tibokPatientId || patientData?.patientId || 'unknown',
          doctorId: tibokDoctorId || updatedReport.medicalReport.practitioner.registrationNumber,
          doctorName: updatedReport.medicalReport.practitioner.name,
          patientName: updatedReport.medicalReport.patient.fullName,
          report: formattedReport,
          action: 'finalize',
          metadata: {
            signatures: signatures,
            documentValidations: {
              consultation: true,
              prescription: !!updatedReport.medicationPrescription,
              laboratory: !!updatedReport.laboratoryTests,
              imaging: !!updatedReport.paraclinicalExams,
              sickLeave: sickLeaveData.numberOfDays > 0,
              invoice: invoiceData.services.totalDue > 0
            }
          },
          patientData: {
            name: updatedReport.medicalReport.patient.fullName,
            age: updatedReport.medicalReport.patient.age,
            gender: updatedReport.medicalReport.patient.gender,
            email: updatedReport.medicalReport.patient.email,
            phone: updatedReport.medicalReport.patient.phone,
            birthDate: updatedReport.medicalReport.patient.dateOfBirth
          },
          clinicalData: clinicalData || {},
          diagnosisData: diagnosisData || {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to validate report')
      }

      setValidationStatus('validated')
      setReport(prev => {
        if (!prev) return null
        return {
          ...prev,
          medicalReport: {
            ...prev.medicalReport,
            metadata: {
              ...prev.medicalReport.metadata,
              validationStatus: 'validated',
              validatedAt: new Date().toISOString(),
              validatedBy: prev.medicalReport.practitioner.name
            }
          }
        }
      })

      setHasUnsavedChanges(false)

      toast({
        title: "Document Validated",
        description: "Report has been validated and signed. You can now review or print the documents.",
        duration: 5000
      })

      // Note: onComplete should be called separately after user reviews the validated documents
      // Do not call onComplete here to allow user to see the signed documents
    } catch (err: any) {
      console.error("Validation error:", err)
      toast({
        title: "Validation Error",
        description: err.message || "Failed to validate document",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [validationStatus, consultationId, report, sickLeaveData, invoiceData, patientData, clinicalData, diagnosisData, editableNarrative, localMedications, localLabTests, localParaclinicalExams, doctorInfo])

  // ==================== SEND DOCUMENTS ====================
  const handleSendDocuments = async () => {
    console.log('📤 Starting handleSendDocuments for chronic disease...')
    setIsSendingDocuments(true)

    // Check if report is validated
    if (!report || validationStatus !== 'validated') {
      console.log('❌ Report not validated', { hasReport: !!report, validationStatus })
      toast({
        title: "Cannot send documents",
        description: "Please validate the documents first",
        variant: "destructive"
      })
      setIsSendingDocuments(false)
      return
    }

    // Get patient data
    const patient = report.medicalReport?.patient
    let patientName = patient?.fullName || `${patientData?.firstName || ''} ${patientData?.lastName || ''}`.trim() || 'Patient'
    let patientEmail = patient?.email || patientData?.email || ''
    let patientPhone = patient?.phone || patientData?.phone || patientData?.phoneNumber || ''
    let patientAddress = patient?.address || patientData?.address || patientData?.deliveryAddress || 'Mauritius'

    console.log('📋 Patient data:', { name: patientName, email: patientEmail, phone: patientPhone })

    // Email validation with fallback
    if (!patientEmail || !patientEmail.includes('@')) {
      patientEmail = `patient_${Date.now()}@tibok.mu`
      console.log('⚠️ Using fallback email:', patientEmail)
    }

    // Phone validation with fallback
    if (!patientPhone) {
      patientPhone = '+230 0000 0000'
      console.log('⚠️ Using fallback phone:', patientPhone)
    }

    // Doctor validation
    if (!doctorInfo?.nom || doctorInfo.nom === 'Dr. [Name Required]') {
      console.log('❌ Invalid doctor name')
      toast({
        title: "Incomplete Doctor Information",
        description: "Please complete doctor profile before sending",
        variant: "destructive"
      })
      setIsSendingDocuments(false)
      return
    }

    // MCM number validation
    let mcmNumber = doctorInfo?.numeroEnregistrement || ''
    if (mcmNumber.includes('[') || mcmNumber === '[MCM Registration Required]') {
      mcmNumber = 'PENDING'
      console.log('⚠️ Using fallback MCM number:', mcmNumber)
    }

    try {
      console.log('✅ All validations passed, proceeding to send...')

      toast({
        title: "Sending documents...",
        description: "Preparing documents for patient dashboard"
      })

      // Use the IDs loaded from URL params at component mount
      const patientId = tibokPatientId || patientData?.id || patientData?.patientId
      const doctorId = tibokDoctorId

      console.log('📍 IDs for sending:', { consultationId, patientId, doctorId })

      if (!consultationId || !patientId || !doctorId) {
        console.log('❌ Missing required IDs')
        toast({
          title: "Error",
          description: `Missing IDs - Please ensure this consultation was started from Tibok with proper URL parameters. Consultation: ${consultationId || 'missing'}, Patient: ${patientId || 'missing'}, Doctor: ${doctorId || 'missing'}`,
          variant: "destructive"
        })
        setIsSendingDocuments(false)
        return
      }

      // Use the consultation ID from Tibok (or fallback)
      const finalConsultationId = consultationId

      // Prepare doctor info with fallbacks
      const finalDoctorInfo = {
        ...doctorInfo,
        numeroEnregistrement: mcmNumber,
        email: doctorInfo.email?.includes('[') ? 'doctor@tibok.mu' : doctorInfo.email
      }

      console.log('📝 Saving to database...')

      // Format report for save-medical-report API (same structure as handleValidateDocument)
      const formattedReport = {
        compteRendu: {
          praticien: {
            nom: report.medicalReport.practitioner.name,
            qualifications: report.medicalReport.practitioner.qualifications,
            specialite: report.medicalReport.practitioner.specialty,
            numeroEnregistrement: report.medicalReport.practitioner.registrationNumber,
            email: report.medicalReport.practitioner.email,
            adresseCabinet: "Tibok Teleconsultation Platform",
            telephone: "+230 XXX XXXX",
            heuresConsultation: "Teleconsultation Hours: 8:00 AM - 8:00 PM"
          },
          patient: {
            nom: report.medicalReport.patient.fullName,
            age: report.medicalReport.patient.age,
            dateNaissance: report.medicalReport.patient.dateOfBirth,
            sexe: report.medicalReport.patient.gender,
            adresse: report.medicalReport.patient.address || '',
            telephone: report.medicalReport.patient.phone || '',
            email: report.medicalReport.patient.email || ''
          },
          rapport: {
            motifConsultation: report.medicalReport.chronicDiseaseAssessment?.primaryDiagnosis || clinicalData?.chiefComplaint || '',
            antecedentsMedicaux: report.medicalReport.patient.medicalHistory || '',
            examenClinique: report.medicalReport.clinicalEvaluation?.physicalExamination || '',
            conclusionDiagnostique: report.medicalReport.diagnosticSummary?.diagnosticConclusion || '',
            planTraitement: report.medicalReport.narrative || '',
            recommandations: '',
            planSuivi: ''
          },
          metadata: {
            dateGeneration: new Date().toISOString(),
            typeConsultation: 'chronic_disease',
            validationStatus: 'validated'
          }
        },
        medicalReport: report.medicalReport,
        ordonnances: {
          ...(report.medicationPrescription && {
            medicaments: report.medicationPrescription
          }),
          ...(report.laboratoryTests && {
            biologie: report.laboratoryTests
          }),
          ...(report.paraclinicalExams && {
            imagerie: report.paraclinicalExams
          }),
          ...(sickLeaveData.numberOfDays > 0 && {
            arretMaladie: {
              enTete: {
                nom: report.medicalReport.practitioner.name,
                numeroEnregistrement: report.medicalReport.practitioner.registrationNumber
              },
              patient: {
                nom: report.medicalReport.patient.fullName,
                age: report.medicalReport.patient.age,
                dateNaissance: report.medicalReport.patient.dateOfBirth || '',
                adresse: report.medicalReport.patient.address || ''
              },
              certificat: {
                dateDebut: sickLeaveData.startDate,
                dateFin: sickLeaveData.endDate,
                nombreJours: sickLeaveData.numberOfDays,
                motifMedical: sickLeaveData.medicalReason,
                remarques: sickLeaveData.remarks
              },
              authentification: {
                signature: "Medical Practitioner's Signature",
                nomEnCapitales: report.medicalReport.practitioner.name.toUpperCase(),
                numeroEnregistrement: report.medicalReport.practitioner.registrationNumber,
                date: new Date().toISOString().split('T')[0]
              }
            }
          })
        },
        dietaryProtocol: report.dietaryProtocol || null,
        followUpPlan: report.followUpPlan || null,
        ...(invoiceData.services.totalDue > 0 && {
          invoice: {
            header: invoiceData.header,
            provider: invoiceData.provider,
            patient: invoiceData.patient,
            services: invoiceData.services,
            payment: invoiceData.payment
          }
        })
      }

      // Save final version to consultation_records table
      const saveResponse = await fetch('/api/save-medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: finalConsultationId,
          patientId,
          doctorId,
          doctorName: finalDoctorInfo.nom,
          patientName: patientName,
          report: formattedReport,
          action: 'finalize',
          metadata: {
            wordCount: report.medicalReport?.narrative?.split(' ').length || 0,
            signatures: documentSignatures,
            validationStatus: 'validated',
            finalizedAt: new Date().toISOString(),
            documentValidations: {
              consultation: true,
              prescription: !!report?.medicationPrescription,
              laboratory: !!report?.laboratoryTests,
              imaging: !!report?.paraclinicalExams,
              dietPlan: !!report?.dietaryProtocol,
              sickLeave: !!(sickLeaveData?.startDate && sickLeaveData?.endDate),
              followUp: !!report?.followUpPlan,
              invoice: !!invoiceData?.header?.invoiceNumber
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
        toast({
          title: "Save Failed",
          description: saveResult.error || 'Failed to save report',
          variant: "destructive"
        })
        setIsSendingDocuments(false)
        return
      }

      console.log('✅ Report saved successfully')

      // Update draft as finalized
      console.log('📝 Marking draft as finalized...')

      await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: finalConsultationId,
          reportContent: {
            ...report,
            metadata: {
              finalized: true,
              finalizedAt: new Date().toISOString()
            }
          },
          doctorInfo: finalDoctorInfo,
          modifiedSections: []
        })
      })

      // Get Tibok URL based on environment
      const getTibokUrl = () => {
        // First check URL parameter (highest priority)
        const urlParams = new URLSearchParams(window.location.search)
        const urlParam = urlParams.get('tibokUrl')
        if (urlParam) {
          console.log('📍 Using Tibok URL from parameter:', decodeURIComponent(urlParam))
          return decodeURIComponent(urlParam)
        }

        // Check referrer
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

        // Environment-based mapping
        const hostname = window.location.hostname

        // Test/Development environment
        if (hostname.includes('v0-medical')) {
          console.log('📍 Using Tibok development URL for v0-medical')
          return 'https://v0-tibokmain2.vercel.app'
        }

        // Staging environment
        if (hostname.includes('staging') || hostname.includes('test')) {
          console.log('📍 Using Tibok staging URL')
          return 'https://staging.tibok.mu'
        }

        // Production
        if (hostname.includes('medical-ai-expert.vercel.app')) {
          console.log('📍 Using Tibok production URL')
          return 'https://tibok.mu'
        }

        // Local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          console.log('📍 Using Tibok local development URL')
          return 'http://localhost:3000'
        }

        console.log('📍 Using default Tibok URL: https://tibok.mu')
        return 'https://tibok.mu'
      }

      const tibokUrl = getTibokUrl()

      // Prepare documents payload for chronic disease
      console.log('📦 Preparing documents payload...')

      const documentsPayload = {
        consultationId: finalConsultationId,
        patientId,
        doctorId,
        doctorName: finalDoctorInfo.nom,
        generatedAt: new Date().toISOString(),
        consultationType: 'chronic_disease',
        // Patient data for Tibok chronic-disease-documents endpoint
        patientData: {
          name: patientName,
          email: patientEmail,
          phone: patientPhone,
          address: patientAddress,
          birthDate: patient?.dateOfBirth || '',
          age: patient?.age || '',
          gender: patient?.gender || '',
          weight: patient?.weight || ''
        },
        documents: {
          consultationReport: report?.medicalReport ? {
            type: 'chronic_disease_report',
            title: 'Chronic Disease Follow-up Consultation Report',
            content: report.medicalReport,
            validated: true,
            validatedAt: new Date().toISOString(),
            signature: documentSignatures?.consultation || null
          } : null,
          prescriptions: report?.medicationPrescription ? {
            type: 'prescription',
            title: 'Medication Prescription',
            medications: report.medicationPrescription.prescription?.medications || [],
            validity: report.medicationPrescription.prescription?.validity || '3 months',
            signature: documentSignatures?.prescription || null,
            content: report.medicationPrescription
          } : null,
          laboratoryRequests: report?.laboratoryTests ? {
            type: 'laboratory_request',
            title: 'Laboratory Request Form',
            tests: report.laboratoryTests.prescription?.tests || {},
            signature: documentSignatures?.laboratory || null,
            content: report.laboratoryTests
          } : null,
          imagingRequests: report?.paraclinicalExams ? {
            type: 'paraclinical_request',
            title: 'Paraclinical Examination Request',
            examinations: report.paraclinicalExams.prescription?.exams || [],
            signature: documentSignatures?.imaging || null,
            content: report.paraclinicalExams
          } : null,
          dietaryPlan: report?.dietaryProtocol ? {
            type: 'dietary_plan',
            title: 'Dietary Protocol for Chronic Disease Management',
            content: report.dietaryProtocol,
            signature: documentSignatures?.prescription || null
          } : null,
          sickLeaveCertificate: (sickLeaveData?.startDate && sickLeaveData?.endDate) ? {
            type: 'sick_leave',
            title: 'Medical Certificate / Sick Leave',
            certificate: {
              dateDebut: sickLeaveData.startDate,
              dateFin: sickLeaveData.endDate,
              nombreJours: sickLeaveData.numberOfDays,
              motifMedical: sickLeaveData.medicalReason || (() => {
                // Build detailed medical reason from consultation report
                const historyOfPresentIllness = report?.medicalReport?.clinicalEvaluation?.historyOfPresentIllness || ''
                const diagnosticConclusion = report?.medicalReport?.diagnosticSummary?.diagnosticConclusion || ''

                // Combine full text from both sections with a blank line separator
                const sections = [];
                if (historyOfPresentIllness) sections.push(historyOfPresentIllness);
                if (diagnosticConclusion) sections.push(diagnosticConclusion);

                if (sections.length > 0) {
                  return sections.join('\n\n');
                }

                // Fallback to shorter fields if detailed ones don't exist
                const chiefComplaint = report?.medicalReport?.clinicalEvaluation?.chiefComplaint || ''
                const primaryDiagnosis = report?.medicalReport?.chronicDiseaseAssessment?.primaryDiagnosis || ''

                if (chiefComplaint && primaryDiagnosis) {
                  return `${chiefComplaint}\n\n${primaryDiagnosis}`
                }
                return chiefComplaint || primaryDiagnosis || 'Medical condition requiring rest'
              })(),
              remarques: sickLeaveData.remarks || ''
            },
            signature: documentSignatures?.sickLeave || null
          } : null,
          followUpPlan: report?.followUpPlan ? {
            type: 'follow_up_plan',
            title: 'Chronic Disease Management / Follow-up Care Plan',
            content: report.followUpPlan,
            signature: documentSignatures?.consultation || null
          } : null,
          invoice: invoiceData?.header?.invoiceNumber ? {
            type: 'invoice',
            title: `Invoice ${invoiceData.header.invoiceNumber}`,
            content: invoiceData,
            signature: documentSignatures?.invoice || null
          } : null
        }
      }

      console.log('📨 Sending chronic disease documents to Tibok at:', tibokUrl)
      console.log('📦 Payload size:', JSON.stringify(documentsPayload).length, 'bytes')

      // Send to dedicated chronic disease documents endpoint
      const response = await fetch(`${tibokUrl}/api/chronic-disease-documents`, {
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
          title: "Documents sent successfully",
          description: "The documents are now available in the patient dashboard"
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
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        ">
          <svg width="40" height="40" fill="white" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #111827;">
          Consultation Complete!
        </h2>
        <p style="color: #6b7280; margin-bottom: 1.5rem;">
          All documents have been successfully sent to the patient's Tibok dashboard. The patient can now access their chronic disease management documents.
        </p>
        <button id="close-modal-btn" style="
          background: linear-gradient(135deg, #10b981, #3b82f6);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          Close
        </button>
      </div>
    `

    modalContainer.appendChild(modalContent)
    document.body.appendChild(modalContainer)

    // Close handlers
    const closeModal = () => {
      modalContainer.remove()
    }

    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal)
    document.getElementById('close-x-btn')?.addEventListener('click', closeModal)
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) closeModal()
    })
  }

  const exportToPDF = useCallback((elementId: string, filename: string) => {
    // Simple print-based PDF export
    window.print()
  }, [])
  
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) {
      toast({
        title: "No Changes",
        description: "There are no unsaved changes to save.",
      })
      return
    }

    if (!consultationId) {
      toast({
        title: "Save Error",
        description: "No consultation ID available",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Sync all local state back to report (same pattern as sickLeaveData)
      const updatedReport = {
        ...report,
        medicalReport: {
          ...report.medicalReport,
          narrative: editableNarrative
        },
        ...(localMedications && { medicationPrescription: localMedications }),
        ...(localLabTests && { laboratoryTests: localLabTests }),
        ...(localParaclinicalExams && { paraclinicalExams: localParaclinicalExams })
      }

      // Validate report data before saving
      const validationErrors: string[] = []

      // Validate medical report
      if (!editableNarrative || editableNarrative.trim() === '') {
        validationErrors.push("Medical report narrative cannot be empty")
      }

      if (validationErrors.length > 0) {
        toast({
          title: "Validation Errors",
          description: validationErrors.join(". "),
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      // Save to consultation_drafts table via API
      const response = await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          reportContent: {
            ...updatedReport,
            sickLeave: sickLeaveData,
            invoice: invoiceData
          },
          doctorInfo: {
            nom: updatedReport.medicalReport.practitioner.name,
            specialite: updatedReport.medicalReport.practitioner.specialty,
            numeroEnregistrement: updatedReport.medicalReport.practitioner.registrationNumber,
            email: updatedReport.medicalReport.practitioner.email
          },
          modifiedSections: [],
          validationStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      // Also save to sessionStorage for local persistence
      sessionStorage.setItem('chronicDiseaseReport', JSON.stringify({
        ...updatedReport,
        sickLeave: sickLeaveData,
        invoice: invoiceData
      }))

      setHasUnsavedChanges(false)
      toast({
        title: "Changes Saved",
        description: "Draft saved to database successfully.",
      })

    } catch (err: any) {
      console.error("Save error:", err)
      toast({
        title: "Save Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [hasUnsavedChanges, report, consultationId, sickLeaveData, invoiceData, validationStatus, editableNarrative, localMedications, localLabTests, localParaclinicalExams])
  
  // Handle on-demand dietary plan generation
  const handleGenerateDietaryPlan = useCallback(async () => {
    setDietaryLoading(true)
    setDietaryError(null)
    
    try {
      console.log('🍽️ Starting on-demand dietary plan generation...')
      
      // Normalize patient data before sending
      const normalizedPatientData = normalizePatientData(patientData)
      
      // Call dietary API without AbortController (like other working APIs)
      const response = await fetch("/api/chronic-dietary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: normalizedPatientData,
          clinicalData,
          diagnosisData,
          doctorData: {
            fullName: doctorInfo.nom.replace(/^Dr\.\s*/i, ''),
            qualifications: doctorInfo.qualifications,
            specialty: doctorInfo.specialite,
            medicalCouncilNumber: doctorInfo.numeroEnregistrement,
            email: doctorInfo.email,
            clinicAddress: doctorInfo.adresseCabinet,
            consultationHours: doctorInfo.heuresConsultation
          }
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        throw new Error(`Dietary API failed (${response.status}): ${response.statusText}. ${errorText.substring(0, 200)}`)
      }
      
      const dietaryData = await response.json()
      console.log('✅ Dietary data received:', dietaryData)
      
      if (dietaryData.success && dietaryData.dietaryProtocol) {
        const dietary = dietaryData.dietaryProtocol
        
        // Update report with detailed dietary protocol
        setReport(prev => {
          if (!prev) return null
          
          return {
            ...prev,
            dietaryProtocol: {
              header: {
                title: dietary.protocolHeader?.protocolType || "Detailed Dietary Protocol for Chronic Disease Management",
                patientName: prev.medicalReport.patient.fullName,
                date: dietary.protocolHeader?.issueDate || new Date().toISOString().split('T')[0]
              },
              nutritionalAssessment: {
                currentDiet: dietary.nutritionalAssessment?.currentWeight 
                  ? `Weight: ${dietary.nutritionalAssessment.currentWeight} kg, BMI: ${dietary.nutritionalAssessment.bmi}, Target: ${dietary.nutritionalAssessment.targetWeight} kg`
                  : dietary.nutritionalAssessment?.currentDiet || "",
                nutritionalDeficiencies: dietary.nutritionalAssessment?.diseaseSpecificGoals || [],
                dietaryRestrictions: [],
                culturalConsiderations: "Mauritius cultural adaptations included"
              },
              // Store the full weekly meal plan
              weeklyMealPlan: dietary.weeklyMealPlan || {},
              practicalGuidance: dietary.practicalGuidance || {},
              mealPlans: {
                breakfast: dietary.weeklyMealPlan?.day1?.breakfast?.foods?.map((f: any) => 
                  `${f.item} (${f.quantity}) - ${f.calories} kcal`
                ) || [],
                lunch: dietary.weeklyMealPlan?.day1?.lunch?.foods?.map((f: any) => 
                  `${f.item} (${f.quantity}) - ${f.calories} kcal`
                ) || [],
                dinner: dietary.weeklyMealPlan?.day1?.dinner?.foods?.map((f: any) => 
                  `${f.item} (${f.quantity}) - ${f.calories} kcal`
                ) || [],
                snacks: dietary.weeklyMealPlan?.day1?.midMorningSnack?.foods?.map((f: any) => 
                  `${f.item} (${f.quantity}) - ${f.calories} kcal`
                ) || []
              },
              nutritionalGuidelines: {
                caloriesTarget: dietary.nutritionalAssessment?.dailyCaloricNeeds?.targetCalories || "1600 kcal",
                macronutrients: dietary.nutritionalAssessment?.dailyCaloricNeeds?.macroDistribution || {},
                micronutrients: [],
                hydration: "8-10 glasses of water daily"
              },
              forbiddenFoods: dietary.practicalGuidance?.cookingMethods?.avoid || [],
              recommendedFoods: dietary.practicalGuidance?.groceryList?.proteins || [],
              specialInstructions: dietary.practicalGuidance?.mealPrepTips || [],
              followUpSchedule: dietary.monitoringAndAdjustments?.progressMilestones?.week4 || "Monthly nutritional assessment"
            }
          }
        })
        
        setDetailedDietaryGenerated(true)
        setHasUnsavedChanges(true)
        
        toast({
          title: "Success",
          description: "Detailed 7-day dietary plan generated successfully!",
        })
        
        console.log('✅ Detailed dietary plan generated and integrated')
      } else {
        throw new Error("Invalid dietary data received from API")
      }
      
    } catch (err: any) {
      console.error('❌ Dietary generation error:', err)
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to generate dietary plan"
      if (err.message.includes('Failed to fetch')) {
        errorMessage = "Network error: Could not reach the server. Please check your connection and try again."
      } else {
        errorMessage = err.message || errorMessage
      }
      
      setDietaryError(errorMessage)
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDietaryLoading(false)
    }
  }, [patientData, clinicalData, diagnosisData])
  
  // ==================== RENDER HELPERS ====================
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Generating comprehensive chronic disease report...</p>
          <p className="text-sm text-gray-600 mt-2">
            This may take 30-60 seconds as we generate multiple professional documents
          </p>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  if (!report) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No report data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  // ==================== SECTION COMPONENTS ====================
  
  // Medical report section component
  const MedicalReportSection = () => {
    const { medicalReport } = report

    return (
      <div id="medical-report-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{medicalReport.header.title}</h2>
              <p className="text-gray-600 mt-1">{medicalReport.header.subtitle}</p>
              <p className="text-sm text-gray-500 mt-1">Reference: {medicalReport.header.reference}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToPDF('medical-report-section', `chronic_report_${medicalReport.patient.fullName}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* NARRATIVE REPORT - PROFESSIONAL FORMAT FROM API */}
        {medicalReport.narrative && (
          <div className="mb-6">
            {editMode ? (
              // EDIT MODE - Editable Textarea
              <div className="space-y-2">
                <Label htmlFor="narrative-edit" className="text-sm font-medium">Medical Report Narrative</Label>
                <Textarea
                  id="narrative-edit"
                  value={editableNarrative}
                  onChange={(e) => {
                    setEditableNarrative(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  className="min-h-[600px] font-mono text-sm bg-white"
                  disabled={validationStatus === 'validated'}
                />
              </div>
            ) : (
              // VIEW MODE - Formatted display
              <>
                <style jsx>{`
                  .professional-narrative {
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                  }
                  /* Make section headers bold - targets ALL CAPS lines after separator */
                  .professional-narrative::before {
                    content: '';
                    display: block;
                  }
                  /* Target lines that are section headers (ALL CAPS, no colon at start) */
                  .professional-narrative {
                    /* This will be handled by processing the text */
                  }
                `}</style>
                <div
                  className="prose prose-sm max-w-none bg-white p-8 rounded border border-gray-200 professional-narrative"
                  dangerouslySetInnerHTML={{
                    __html: formatNarrativeWithBoldHeaders(medicalReport.narrative)
                  }}
                />

                {/* Signature Section for Main Report */}
                <div className="mt-8 pt-6 border-t-2 border-gray-800 bg-white p-8 rounded border border-gray-200">
                  <div className="text-right">
                    <p className="font-bold text-lg mb-4">PHYSICIAN AUTHENTICATION</p>
                    <p className="font-semibold">{medicalReport.practitioner.name}</p>
                    <p className="text-sm text-gray-600">{medicalReport.practitioner.qualifications}</p>
                    <p className="text-sm text-gray-600">{medicalReport.practitioner.specialty}</p>
                    <p className="text-sm text-gray-600">MCM Registration: {medicalReport.practitioner.registrationNumber}</p>

                    {validationStatus === 'validated' && documentSignatures.consultation ? (
                      <div className="mt-4">
                        <img
                          src={documentSignatures.consultation}
                          alt="Doctor's Signature"
                          className="ml-auto h-20 w-auto"
                          style={{ maxWidth: '300px' }}
                        />
                        <p className="text-sm text-gray-600 mt-2">
                          Digitally signed on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <p className="text-sm">_______________________________</p>
                        <p className="text-sm">Medical Practitioner's Signature</p>
                        <p className="text-sm mt-2">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* HIDE ALL REDUNDANT SECTIONS - They are already in narrative */}
        {false && (
        <>
        {/* Practitioner Information - REMOVED (in narrative) */}
        <div className="mb-6 p-4 bg-blue-50 rounded" style={{display: 'none'}}>
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Practitioner Information
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Name:</strong> {medicalReport.practitioner.name}</div>
            <div><strong>Specialty:</strong> {medicalReport.practitioner.specialty}</div>
            <div><strong>Qualifications:</strong> {medicalReport.practitioner.qualifications}</div>
            <div><strong>Registration:</strong> {medicalReport.practitioner.registrationNumber}</div>
            <div className="col-span-2"><strong>Platform:</strong> {medicalReport.practitioner.consultationPlatform}</div>
          </div>
        </div>
        
        {/* Comprehensive Patient Information - REMOVED (in narrative) */}
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border-2 border-blue-200" style={{display: 'none'}}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-800">
            <User className="h-6 w-6" />
            COMPREHENSIVE PATIENT INFORMATION
          </h3>
          
          {/* Demographics Section */}
          <div className="mb-4 pb-4 border-b border-blue-200">
            <h4 className="font-semibold text-sm text-blue-700 mb-2">Patient Demographics</h4>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div><strong>Nom complet / Full Name:</strong> {medicalReport.patient.fullName}</div>
              <div><strong>Date de naissance / Date of Birth:</strong> {medicalReport.patient.dateOfBirth}</div>
              <div><strong>Âge / Age:</strong> {medicalReport.patient.age} years</div>
              <div><strong>Genre / Gender:</strong> {medicalReport.patient.gender}</div>
              <div><strong>Téléphone / Phone:</strong> {medicalReport.patient.phone}</div>
              {medicalReport.patient.nationalId && (
                <div><strong>NID:</strong> {medicalReport.patient.nationalId}</div>
              )}
              <div className="col-span-3"><strong>Adresse / Address:</strong> {medicalReport.patient.address}</div>
            </div>
          </div>
          
          {/* Anthropometric Measurements */}
          <div className="mb-4 pb-4 border-b border-blue-200">
            <h4 className="font-semibold text-sm text-blue-700 mb-2">📏 Anthropometric Measurements</h4>
            <div className="grid grid-cols-4 gap-x-6 gap-y-2 text-sm">
              {medicalReport.patient.weight && (
                <div><strong>Poids / Weight:</strong> {medicalReport.patient.weight} kg</div>
              )}
              {medicalReport.patient.height && (
                <div><strong>Taille / Height:</strong> {medicalReport.patient.height} cm</div>
              )}
              {medicalReport.patient.weight && medicalReport.patient.height && (() => {
                const weight = parseFloat(medicalReport.patient.weight)
                const heightInMeters = parseFloat(medicalReport.patient.height) / 100
                const bmi = weight / (heightInMeters * heightInMeters)
                let bmiCategory = ''
                if (bmi < 18.5) bmiCategory = 'Underweight'
                else if (bmi < 25) bmiCategory = 'Normal'
                else if (bmi < 30) bmiCategory = 'Overweight'
                else if (bmi < 35) bmiCategory = 'Obese I'
                else bmiCategory = 'Obese II+'
                return (
                  <>
                    <div><strong>BMI / IMC:</strong> {bmi.toFixed(1)} kg/m²</div>
                    <div><strong>Category:</strong> <span className={bmi >= 25 ? 'text-orange-600 font-semibold' : 'text-green-600'}>{bmiCategory}</span></div>
                  </>
                )
              })()}
            </div>
          </div>
          
          {/* Vital Signs */}
          {(medicalReport.patient.bloodPressureSystolic || medicalReport.patient.temperature || medicalReport.patient.bloodGlucose) && (
            <div className="mb-4 pb-4 border-b border-blue-200">
              <h4 className="font-semibold text-sm text-blue-700 mb-2">💓 Vital Signs & Clinical Parameters</h4>
              <div className="grid grid-cols-4 gap-x-6 gap-y-2 text-sm">
                {medicalReport.patient.bloodPressureSystolic && medicalReport.patient.bloodPressureDiastolic && (
                  <div>
                    <strong>Tension artérielle / Blood Pressure:</strong>{' '}
                    <span className={
                      parseInt(medicalReport.patient.bloodPressureSystolic) >= 140 || 
                      parseInt(medicalReport.patient.bloodPressureDiastolic) >= 90
                        ? 'text-red-600 font-semibold'
                        : 'text-green-600'
                    }>
                      {medicalReport.patient.bloodPressureSystolic}/{medicalReport.patient.bloodPressureDiastolic} mmHg
                    </span>
                  </div>
                )}
                {medicalReport.patient.bloodGlucose && (
                  <div>
                    <strong>Glycémie / Blood Glucose:</strong>{' '}
                    <span className={
                      parseFloat(medicalReport.patient.bloodGlucose) > 7.0
                        ? 'text-red-600 font-semibold'
                        : 'text-green-600'
                    }>
                      {medicalReport.patient.bloodGlucose} mmol/L
                    </span>
                  </div>
                )}
                {medicalReport.patient.temperature && (
                  <div><strong>Temperature:</strong> {medicalReport.patient.temperature}°C</div>
                )}
              </div>
            </div>
          )}
          
          {/* Medical History & Allergies */}
          <div className="mb-4 pb-4 border-b border-blue-200">
            <h4 className="font-semibold text-sm text-blue-700 mb-2">🏥 Medical Profile</h4>
            <div className="space-y-2 text-sm">
              {medicalReport.patient.medicalHistory && (
                <div>
                  <strong>ATCD médicaux / Medical History:</strong>{' '}
                  <span className="text-gray-800">
                    {Array.isArray(medicalReport.patient.medicalHistory)
                      ? medicalReport.patient.medicalHistory.join(', ')
                      : medicalReport.patient.medicalHistory}
                  </span>
                </div>
              )}
              {medicalReport.patient.allergies && (
                <div>
                  <strong className="text-red-700">⚠️ Allergies:</strong>{' '}
                  <span className="text-red-600 font-medium">
                    {medicalReport.patient.allergies}
                  </span>
                </div>
              )}
              {medicalReport.patient.currentMedications && (
                <div>
                  <strong>Current Medications:</strong>{' '}
                  <span className="text-gray-800">{medicalReport.patient.currentMedications}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Lifestyle Habits */}
          {(patientData?.smokingStatus || patientData?.tabac || patientData?.alcoholConsumption || 
            patientData?.alcool || patientData?.physicalActivity || patientData?.activitePhysique) && (
            <div>
              <h4 className="font-semibold text-sm text-blue-700 mb-2">🚶 Habitudes de vie / Lifestyle Habits</h4>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                {(patientData?.smokingStatus || patientData?.tabac) && (
                  <div>
                    <strong>Tabac / Smoking:</strong>{' '}
                    {patientData?.smokingStatus || patientData?.tabac}
                  </div>
                )}
                {(patientData?.alcoholConsumption || patientData?.alcool) && (
                  <div>
                    <strong>Alcool / Alcohol:</strong>{' '}
                    {patientData?.alcoholConsumption || patientData?.alcool}
                  </div>
                )}
                {(patientData?.physicalActivity || patientData?.activitePhysique) && (
                  <div>
                    <strong>Activité physique / Physical Activity:</strong>{' '}
                    {patientData?.physicalActivity || patientData?.activitePhysique}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Chronic Disease Assessment - HIDDEN (in narrative) */}
        <div className="mb-6" style={{display: 'none'}}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-pink-900">
            <HeartPulse className="h-6 w-6" />
            Chronic Disease Assessment
          </h3>
          <div className="space-y-6">
            <div className="border-l-4 border-pink-500 pl-4 py-2 bg-pink-50">
              <h4 className="font-bold text-base mb-1 text-pink-900">PRIMARY DIAGNOSIS</h4>
              <p className="text-gray-700">{medicalReport.chronicDiseaseAssessment.primaryDiagnosis}</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h4 className="font-bold text-base mb-1 text-purple-900">DISEASE CATEGORY</h4>
              <p className="text-gray-700">{medicalReport.chronicDiseaseAssessment.diseaseCategory}</p>
            </div>
            {medicalReport.chronicDiseaseAssessment.diseaseStage && (
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-bold text-base mb-1 text-blue-900">DISEASE STAGE</h4>
                <p className="text-gray-700">{medicalReport.chronicDiseaseAssessment.diseaseStage}</p>
              </div>
            )}
            {medicalReport.chronicDiseaseAssessment.comorbidities && medicalReport.chronicDiseaseAssessment.comorbidities.length > 0 && (
              <div className="border-l-4 border-orange-500 pl-4 py-2">
                <h4 className="font-bold text-base mb-2 text-orange-900">⚠️ COMORBIDITIES</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {medicalReport.chronicDiseaseAssessment.comorbidities.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {medicalReport.chronicDiseaseAssessment.riskFactors && medicalReport.chronicDiseaseAssessment.riskFactors.length > 0 && (
              <div className="border-l-4 border-red-500 pl-4 py-2">
                <h4 className="font-bold text-base mb-2 text-red-900">🚨 RISK FACTORS</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {medicalReport.chronicDiseaseAssessment.riskFactors.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {medicalReport.chronicDiseaseAssessment.complications && medicalReport.chronicDiseaseAssessment.complications.length > 0 && (
              <div className="border-l-4 border-red-600 pl-4 py-2 bg-red-50">
                <h4 className="font-bold text-base mb-2 text-red-900">⛔ COMPLICATIONS</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {medicalReport.chronicDiseaseAssessment.complications.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* Clinical Evaluation - HIDDEN (in narrative) */}
        <div className="mb-6" style={{display: 'none'}}>
          <h3 className="font-bold text-lg mb-4 text-blue-900">Clinical Evaluation</h3>
          <div className="space-y-6">
            {medicalReport.clinicalEvaluation.chiefComplaint && (
              <div className="border-l-4 border-teal-500 pl-4 py-2">
                <h4 className="font-bold text-lg mb-2 text-teal-900">🔍 CHIEF COMPLAINT</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.clinicalEvaluation.chiefComplaint}</p>
              </div>
            )}
            {medicalReport.clinicalEvaluation.historyOfPresentIllness && (
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-bold text-lg mb-2 text-blue-900">🩺 HISTORY OF PRESENT ILLNESS</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.clinicalEvaluation.historyOfPresentIllness}</p>
              </div>
            )}
            {medicalReport.clinicalEvaluation.reviewOfSystems && (
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <h4 className="font-bold text-lg mb-2 text-purple-900">📋 REVIEW OF SYSTEMS</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.clinicalEvaluation.reviewOfSystems}</p>
              </div>
            )}
            {medicalReport.clinicalEvaluation.physicalExamination && (
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-bold text-lg mb-2 text-green-900">👁️ PHYSICAL EXAMINATION</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.clinicalEvaluation.physicalExamination}</p>
              </div>
            )}
            {medicalReport.clinicalEvaluation.vitalSignsAnalysis && (
              <div className="border-l-4 border-cyan-500 pl-4 py-2">
                <h4 className="font-bold text-lg mb-2 text-cyan-900">💓 VITAL SIGNS ANALYSIS</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.clinicalEvaluation.vitalSignsAnalysis}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* OLD Narrative Display - HIDDEN (replaced by new one above) */}
        
        {/* Diagnostic Summary - HIDDEN (in narrative) */}
        <div className="mb-6" style={{display: 'none'}}>
          <h3 className="font-bold text-lg mb-4 text-red-900">Diagnostic Summary & Management Goals</h3>
          <div className="space-y-6">
            {medicalReport.diagnosticSummary.diagnosticConclusion && (
              <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50">
                <h4 className="font-bold text-lg mb-2 text-red-900">🎯 DIAGNOSTIC CONCLUSION</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.diagnosticSummary.diagnosticConclusion}</p>
              </div>
            )}
            {medicalReport.diagnosticSummary.prognosticAssessment && (
              <div className="border-l-4 border-orange-500 pl-4 py-2">
                <h4 className="font-bold text-lg mb-2 text-orange-900">📊 PROGNOSTIC ASSESSMENT</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.diagnosticSummary.prognosticAssessment}</p>
              </div>
            )}
            {medicalReport.diagnosticSummary.diseaseManagementGoals && medicalReport.diagnosticSummary.diseaseManagementGoals.length > 0 && (
              <div className="border-l-4 border-indigo-500 pl-4 py-2">
                <h4 className="font-bold text-lg mb-2 text-indigo-900">🎯 DISEASE MANAGEMENT GOALS</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {medicalReport.diagnosticSummary.diseaseManagementGoals.map((goal, idx) => (
                    <li key={idx}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* End of hidden redundant sections */}
        </>
        )}
        
        {/* Signature - REMOVED because already in narrative text */}
      </div>
    )
  }

  // Medication prescription section component
  const MedicationPrescriptionSection = () => {
    if (!report.medicationPrescription) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No medication prescription available</p>
          </CardContent>
        </Card>
      )
    }

    // Use local state if available, otherwise use report (for display before editing)
    const medicationPrescription = localMedications || report.medicationPrescription
    const medications = medicationPrescription.prescription.medications || []

    const handleAddMedication = () => {
      // Update local state only - no setReport call
      setLocalMedications(prev => {
        if (!prev) return prev
        return {
          ...prev,
          prescription: {
            ...prev.prescription,
            medications: [
              ...prev.prescription.medications,
              {
                nom: '',
                denominationCommune: '',
                dosage: '',
                forme: 'tablet',
                posologie: '',
                modeAdministration: 'Oral route',
                dureeTraitement: '',
                quantite: '',
                instructions: '',
                justification: '',
                surveillanceParticuliere: '',
                nonSubstituable: false
              }
            ]
          }
        }
      })
      setHasUnsavedChanges(true)
    }

    const handleRemoveMedication = (index: number) => {
      // Update local state only - no setReport call
      setLocalMedications(prev => {
        if (!prev) return prev
        return {
          ...prev,
          prescription: {
            ...prev.prescription,
            medications: prev.prescription.medications.filter((_, i) => i !== index)
          }
        }
      })
      setHasUnsavedChanges(true)
    }

    const handleUpdateMedication = (index: number, field: string, value: any) => {
      // Update local state only - no setReport call
      setLocalMedications(prev => {
        if (!prev) return prev
        const updatedMeds = [...prev.prescription.medications]
        updatedMeds[index] = { ...updatedMeds[index], [field]: value }
        return {
          ...prev,
          prescription: {
            ...prev.prescription,
            medications: updatedMeds
          }
        }
      })
      setHasUnsavedChanges(true)
    }
    
    return (
      <div id="medication-prescription-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-teal-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                MEDICATION PRESCRIPTION
                {editMode && <Badge variant="outline">Editable</Badge>}
              </h2>
              <p className="text-gray-600 mt-1">Compliant with Medical Council & Pharmacy Act of Mauritius</p>
              <p className="text-sm text-gray-500 mt-1">
                {medications.length} medication{medications.length !== 1 ? 's' : ''} prescribed
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              {editMode && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddMedication}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToPDF('medication-prescription-section', `prescription_${report.medicalReport.patient.fullName}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* Patient Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Patient:</strong> {report.medicalReport.patient.fullName}</div>
            <div><strong>Date:</strong> {medicationPrescription.prescription.datePrescription}</div>
            <div><strong>Address:</strong> {report.medicalReport.patient.address}</div>
            {report.medicalReport.patient.nationalId && (
              <div><strong>NID:</strong> {report.medicalReport.patient.nationalId}</div>
            )}
          </div>
        </div>
        
        {/* Medications List */}
        <div className="space-y-6">
          {medications.length > 0 ? (
            medications.map((med: any, index: number) => (
              <div key={index} className="border-l-4 border-teal-500 pl-4 py-2 relative">
                {editMode ? (
                  // EDIT MODE - Editable fields
                  <div className="space-y-3 bg-gray-50 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold">Medication {index + 1}</h4>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveMedication(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Brand Name *</Label>
                        <Input
                          value={med.nom}
                          onChange={(e) => handleUpdateMedication(index, 'nom', e.target.value)}
                          placeholder="e.g., Metformin"
                        />
                      </div>
                      <div>
                        <Label>Generic Name (INN)</Label>
                        <Input
                          value={med.denominationCommune}
                          onChange={(e) => handleUpdateMedication(index, 'denominationCommune', e.target.value)}
                          placeholder="e.g., Metformin hydrochloride"
                        />
                      </div>
                      <div>
                        <Label>Form</Label>
                        <Input
                          value={med.forme}
                          onChange={(e) => handleUpdateMedication(index, 'forme', e.target.value)}
                          placeholder="e.g., Tablet"
                        />
                      </div>
                      <div>
                        <Label>Strength/Dosage</Label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => handleUpdateMedication(index, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                        />
                      </div>
                      <div>
                        <Label>Frequency *</Label>
                        <Input
                          value={med.posologie}
                          onChange={(e) => handleUpdateMedication(index, 'posologie', e.target.value)}
                          placeholder="e.g., 1 tablet twice daily"
                        />
                      </div>
                      <div>
                        <Label>Route</Label>
                        <Input
                          value={med.modeAdministration}
                          onChange={(e) => handleUpdateMedication(index, 'modeAdministration', e.target.value)}
                          placeholder="e.g., Oral route"
                        />
                      </div>
                      <div>
                        <Label>Duration *</Label>
                        <Input
                          value={med.dureeTraitement}
                          onChange={(e) => handleUpdateMedication(index, 'dureeTraitement', e.target.value)}
                          placeholder="e.g., 3 months"
                        />
                      </div>
                      <div>
                        <Label>Quantity to Dispense</Label>
                        <Input
                          value={med.quantite}
                          onChange={(e) => handleUpdateMedication(index, 'quantite', e.target.value)}
                          placeholder="e.g., 180 tablets"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Indication</Label>
                        <Input
                          value={med.justification}
                          onChange={(e) => handleUpdateMedication(index, 'justification', e.target.value)}
                          placeholder="e.g., Type 2 Diabetes management"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Instructions for Patient</Label>
                        <Textarea
                          value={med.instructions}
                          onChange={(e) => handleUpdateMedication(index, 'instructions', e.target.value)}
                          placeholder="Special instructions..."
                          rows={2}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Monitoring Requirements</Label>
                        <Textarea
                          value={med.surveillanceParticuliere}
                          onChange={(e) => handleUpdateMedication(index, 'surveillanceParticuliere', e.target.value)}
                          placeholder="e.g., Monitor blood glucose, check HbA1c every 3 months"
                          rows={2}
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <Switch
                          checked={med.nonSubstituable}
                          onCheckedChange={(checked) => handleUpdateMedication(index, 'nonSubstituable', checked)}
                        />
                        <Label>Non-substitutable (brand-specific required)</Label>
                      </div>
                    </div>
                  </div>
                ) : (
                  // VIEW MODE - Display only
                  <>
                    <div className="font-bold text-lg">
                      {index + 1}. {med.nom}
                      {med.nonSubstituable && (
                        <Badge className="ml-2 bg-blue-100 text-blue-800">Non-substitutable</Badge>
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
                    {med.surveillanceParticuliere && (
                      <p className="mt-1 text-sm text-cyan-600">
                        <span className="font-medium">⚠️ Monitoring:</span> {med.surveillanceParticuliere}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No medications prescribed</p>
              {editMode && (
                <Button onClick={handleAddMedication} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Medication
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Special Instructions */}
        {medicationPrescription.prescription.specialInstructions && medicationPrescription.prescription.specialInstructions.length > 0 && (
          <div className="mt-6 p-4 bg-cyan-50 rounded">
            <h3 className="font-bold mb-2">Special Instructions:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {medicationPrescription.prescription.specialInstructions.map((instruction, idx) => (
                <li key={idx}>{instruction}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Validity & Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <p className="text-sm text-gray-600 mb-4">
            Validity: {medicationPrescription.prescription.validity}
          </p>
          <div className="text-right">
            <p className="font-semibold">{medicationPrescription.authentication.practitionerName}</p>
            <p className="text-sm text-gray-600">{report.medicalReport.practitioner.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {medicationPrescription.authentication.registrationNumber}</p>

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
              <div className="mt-6">
                <p className="text-sm">_______________________________</p>
                <p className="text-sm">Medical Practitioner's Signature</p>
                <p className="text-sm">Date: {medicationPrescription.authentication.date}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const LaboratoryTestsSection = () => {
    if (!report.laboratoryTests) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No laboratory tests ordered</p>
          </CardContent>
        </Card>
      )
    }
    
    // Use local state if available, otherwise use report (for display before editing)
    const laboratoryTests = localLabTests || report.laboratoryTests
    const tests = laboratoryTests.prescription.tests || {}
    const hasTests = Object.values(tests).some((testArray: any) => Array.isArray(testArray) && testArray.length > 0)
    
    const categories = [
      { key: 'hematology', label: 'HEMATOLOGY' },
      { key: 'clinicalChemistry', label: 'CLINICAL CHEMISTRY' },
      { key: 'immunology', label: 'IMMUNOLOGY' },
      { key: 'microbiology', label: 'MICROBIOLOGY' },
      { key: 'endocrinology', label: 'ENDOCRINOLOGY' },
      { key: 'general', label: 'GENERAL LABORATORY' }
    ]

    const handleLabTestEdit = (categoryKey: string, testIdx: number, field: string, value: any) => {
      // Update local state only - no setReport call
      setLocalLabTests(prev => {
        if (!prev) return prev
        const updated = JSON.parse(JSON.stringify(prev))
        updated.prescription.tests[categoryKey][testIdx][field] = value
        return updated
      })
      setHasUnsavedChanges(true)
    }

    const handleDeleteLabTest = (categoryKey: string, testIdx: number) => {
      if (confirm('Delete this laboratory test?')) {
        // Update local state only - no setReport call
        setLocalLabTests(prev => {
          if (!prev) return prev
          const updated = JSON.parse(JSON.stringify(prev))
          updated.prescription.tests[categoryKey].splice(testIdx, 1)
          return updated
        })
        setHasUnsavedChanges(true)
      }
    }

    const handleAddLabTest = (categoryKey: string) => {
      // Update local state only - no setReport call
      setLocalLabTests(prev => {
        if (!prev) return prev
        const updated = JSON.parse(JSON.stringify(prev))
        if (!updated.prescription.tests[categoryKey]) {
          updated.prescription.tests[categoryKey] = []
        }
        const newTest = {
          nom: 'New Laboratory Test',
          motifClinique: '',
          conditionsPrelevement: '',
          tubePrelevement: '',
          urgence: false,
          aJeun: false
        }
        updated.prescription.tests[categoryKey].push(newTest)
        return updated
      })
      setHasUnsavedChanges(true)
      toast({
        title: "Test Added",
        description: "New laboratory test added. Please edit the details.",
      })
    }
    
    return (
      <div id="laboratory-tests-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">LABORATORY REQUEST FORM</h2>
              <p className="text-gray-600 mt-1">Compliant with MoH Laboratory Standards</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToPDF('laboratory-tests-section', `lab_tests_${report.medicalReport.patient.fullName}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* Patient Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Patient:</strong> {report.medicalReport.patient.fullName}</div>
            <div><strong>Date:</strong> {laboratoryTests.prescription.datePrescription}</div>
            <div><strong>Age:</strong> {report.medicalReport.patient.age}</div>
            <div><strong>Gender:</strong> {report.medicalReport.patient.gender}</div>
          </div>
        </div>
        
        {/* Clinical Indication */}
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h3 className="font-bold mb-2">Clinical Indication:</h3>
          {editMode ? (
            <Textarea
              value={localLabTests?.prescription.clinicalIndication || ''}
              onChange={(e) => {
                // Update local state only - no setReport call
                setLocalLabTests(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    prescription: {
                      ...prev.prescription,
                      clinicalIndication: e.target.value
                    }
                  }
                })
                setHasUnsavedChanges(true)
              }}
              className="text-sm"
              rows={3}
            />
          ) : (
            <p className="text-sm">{localLabTests?.prescription.clinicalIndication}</p>
          )}
        </div>
        
        {/* Tests by Category */}
        {hasTests ? (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryTests = tests[category.key]
              if (!categoryTests || categoryTests.length === 0) return null
              
              return (
                <div key={category.key} className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3 text-blue-700">{category.label}</h3>
                  <div className="space-y-3">
                    {categoryTests.map((test: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {editMode ? (
                              <div className="space-y-2">
                                <div>
                                  <Label>Test Name</Label>
                                  <Input
                                    value={test.nom || test.name || ''}
                                    onChange={(e) => handleLabTestEdit(category.key, idx, 'nom', e.target.value)}
                                    className="font-semibold"
                                  />
                                </div>
                                <div>
                                  <Label>Clinical Indication</Label>
                                  <Input
                                    value={test.motifClinique || ''}
                                    onChange={(e) => handleLabTestEdit(category.key, idx, 'motifClinique', e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label>Sample Conditions</Label>
                                  <Input
                                    value={test.conditionsPrelevement || ''}
                                    onChange={(e) => handleLabTestEdit(category.key, idx, 'conditionsPrelevement', e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label>Sample Type</Label>
                                  <Input
                                    value={test.tubePrelevement || ''}
                                    onChange={(e) => handleLabTestEdit(category.key, idx, 'tubePrelevement', e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={test.urgence || false}
                                      onChange={(e) => handleLabTestEdit(category.key, idx, 'urgence', e.target.checked)}
                                      className="rounded"
                                    />
                                    <span className="text-sm">Urgent</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={test.aJeun || false}
                                      onChange={(e) => handleLabTestEdit(category.key, idx, 'aJeun', e.target.checked)}
                                      className="rounded"
                                    />
                                    <span className="text-sm">Fasting Required</span>
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="font-semibold">{test.nom || test.name}</p>
                                {test.motifClinique && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Indication:</span> {test.motifClinique}
                                  </p>
                                )}
                                {test.conditionsPrelevement && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Conditions:</span> {test.conditionsPrelevement}
                                  </p>
                                )}
                                {test.tubePrelevement && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Sample Type:</span> {test.tubePrelevement}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            {editMode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLabTest(category.key, idx)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!editMode && (
                              <>
                                {test.urgence && (
                                  <Badge className="bg-blue-100 text-blue-800">URGENT</Badge>
                                )}
                                {test.aJeun && (
                                  <Badge className="bg-cyan-100 text-cyan-800">FASTING</Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {editMode && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddLabTest(category.key)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Test to {category.label}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No laboratory tests ordered</p>
          </div>
        )}
        
        {/* Add New Category Tests */}
        {editMode && hasTests && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-3">Add Test to Category:</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(category => (
                <Button
                  key={category.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddLabTest(category.key)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Special Instructions */}
        {laboratoryTests.prescription.specialInstructions && laboratoryTests.prescription.specialInstructions.length > 0 && (
          <div className="mt-6 p-4 bg-cyan-50 rounded">
            <h3 className="font-bold mb-2">Special Instructions:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {laboratoryTests.prescription.specialInstructions.map((instruction, idx) => (
                <li key={idx}>{instruction}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Recommended Laboratory */}
        {laboratoryTests.prescription.recommendedLaboratory && (
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-bold mb-2">Recommended Laboratory:</h3>
            <p className="text-sm">{laboratoryTests.prescription.recommendedLaboratory}</p>
          </div>
        )}
        
        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{laboratoryTests.authentication.practitionerName}</p>
            <p className="text-sm text-gray-600">{report.medicalReport.practitioner.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {laboratoryTests.authentication.registrationNumber}</p>

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
              <div className="mt-6">
                <p className="text-sm">_______________________________</p>
                <p className="text-sm">Medical Practitioner's Signature</p>
                <p className="text-sm">Date: {laboratoryTests.authentication.date}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const ParaclinicalExamsSection = () => {
    if (!report.paraclinicalExams) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Scan className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No paraclinical exams ordered</p>
          </CardContent>
        </Card>
      )
    }

    // Use local state if available, otherwise use report (for display before editing)
    const paraclinicalExams = localParaclinicalExams || report.paraclinicalExams
    const exams = paraclinicalExams.prescription.exams || []

    const handleParaclinicalEdit = (examIdx: number, field: string, value: any) => {
      // Update local state only - no setReport call
      setLocalParaclinicalExams(prev => {
        if (!prev) return prev
        const updated = JSON.parse(JSON.stringify(prev))
        updated.prescription.exams[examIdx][field] = value
        return updated
      })
      setHasUnsavedChanges(true)
    }

    const handleDeleteParaclinicalExam = (examIdx: number) => {
      if (confirm('Delete this paraclinical examination?')) {
        // Update local state only - no setReport call
        setLocalParaclinicalExams(prev => {
          if (!prev) return prev
          const updated = JSON.parse(JSON.stringify(prev))
          updated.prescription.exams.splice(examIdx, 1)
          return updated
        })
        setHasUnsavedChanges(true)
      }
    }

    const handleAddParaclinicalExam = () => {
      // Update local state only - no setReport call
      setLocalParaclinicalExams(prev => {
        if (!prev) return prev
        const updated = JSON.parse(JSON.stringify(prev))
        const newExam = {
          type: 'New Examination',
          modality: '',
          region: '',
          clinicalIndication: '',
          diagnosticQuestion: '',
          specificProtocol: '',
          urgency: false,
          contrast: false
        }
        updated.prescription.exams.push(newExam)
        return updated
      })
      setHasUnsavedChanges(true)
      toast({
        title: "Exam Added",
        description: "New paraclinical examination added. Please edit the details.",
      })
    }
    
    return (
      <div id="paraclinical-exams-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-indigo-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">PARACLINICAL EXAMINATION REQUEST</h2>
              <p className="text-gray-600 mt-1">Imaging & Diagnostic Procedures</p>
              <p className="text-sm text-gray-500 mt-1">
                {exams.length} examination{exams.length !== 1 ? 's' : ''} requested
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToPDF('paraclinical-exams-section', `paraclinical_${report.medicalReport.patient.fullName}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* Patient Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Patient:</strong> {report.medicalReport.patient.fullName}</div>
            <div><strong>Date:</strong> {paraclinicalExams.prescription.datePrescription}</div>
            <div><strong>Age:</strong> {report.medicalReport.patient.age}</div>
            <div><strong>Gender:</strong> {report.medicalReport.patient.gender}</div>
          </div>
        </div>
        
        {/* Exams List */}
        <div className="space-y-6">
          {exams.length > 0 ? (
            exams.map((exam: any, index: number) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editMode ? (
                      <div className="space-y-3">
                        <div>
                          <Label>Examination Type</Label>
                          <Input
                            value={exam.type || ''}
                            onChange={(e) => handleParaclinicalEdit(index, 'type', e.target.value)}
                            className="font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Modality</Label>
                            <Input
                              value={exam.modality || ''}
                              onChange={(e) => handleParaclinicalEdit(index, 'modality', e.target.value)}
                              placeholder="e.g., X-Ray, CT, MRI, Ultrasound"
                            />
                          </div>
                          <div>
                            <Label>Region/Body Part</Label>
                            <Input
                              value={exam.region || ''}
                              onChange={(e) => handleParaclinicalEdit(index, 'region', e.target.value)}
                              placeholder="e.g., Chest, Abdomen, Brain"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Clinical Indication</Label>
                          <Textarea
                            value={exam.clinicalIndication || ''}
                            onChange={(e) => handleParaclinicalEdit(index, 'clinicalIndication', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Diagnostic Question</Label>
                          <Textarea
                            value={exam.diagnosticQuestion || ''}
                            onChange={(e) => handleParaclinicalEdit(index, 'diagnosticQuestion', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Specific Protocol</Label>
                          <Input
                            value={exam.specificProtocol || ''}
                            onChange={(e) => handleParaclinicalEdit(index, 'specificProtocol', e.target.value)}
                            placeholder="Special imaging protocol if needed"
                          />
                        </div>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={exam.urgency || false}
                              onChange={(e) => handleParaclinicalEdit(index, 'urgency', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm">Urgent</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={exam.contrast || false}
                              onChange={(e) => handleParaclinicalEdit(index, 'contrast', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm">With Contrast</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-lg">
                          {index + 1}. {exam.type}
                          {exam.urgency && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800">URGENT</Badge>
                          )}
                          {exam.contrast && (
                            <Badge className="ml-2 bg-cyan-100 text-cyan-800">WITH CONTRAST</Badge>
                          )}
                        </div>
                        {exam.modality && (
                          <p className="mt-1 text-sm">
                            <span className="font-medium">Modality:</span> {exam.modality}
                          </p>
                        )}
                        {exam.region && (
                          <p className="mt-1 text-sm">
                            <span className="font-medium">Region:</span> {exam.region}
                          </p>
                        )}
                        {exam.clinicalIndication && (
                          <p className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Clinical Indication:</span> {exam.clinicalIndication}
                          </p>
                        )}
                        {exam.diagnosticQuestion && (
                          <p className="mt-1 text-sm text-gray-600">
                            <span className="font-medium">Diagnostic Question:</span> {exam.diagnosticQuestion}
                          </p>
                        )}
                        {exam.specificProtocol && (
                          <p className="mt-1 text-sm text-blue-600">
                            <span className="font-medium">Protocol:</span> {exam.specificProtocol}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {editMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteParaclinicalExam(index)}
                      className="text-red-600 hover:text-red-700 ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Scan className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No paraclinical examinations ordered</p>
            </div>
          )}
          
          {/* Add New Examination Button */}
          {editMode && (
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddParaclinicalExam}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Paraclinical Examination
              </Button>
            </div>
          )}
        </div>
        
        {/* Special Instructions */}
        {paraclinicalExams.prescription.specialInstructions && paraclinicalExams.prescription.specialInstructions.length > 0 && (
          <div className="mt-6 p-4 bg-cyan-50 rounded">
            <h3 className="font-bold mb-2">Special Instructions:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {paraclinicalExams.prescription.specialInstructions.map((instruction, idx) => (
                <li key={idx}>{instruction}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{paraclinicalExams.authentication.practitionerName}</p>
            <p className="text-sm text-gray-600">{report.medicalReport.practitioner.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {paraclinicalExams.authentication.registrationNumber}</p>

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
              <div className="mt-6">
                <p className="text-sm">_______________________________</p>
                <p className="text-sm">Medical Practitioner's Signature</p>
                <p className="text-sm">Date: {paraclinicalExams.authentication.date}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const DietaryProtocolSection = () => {
    if (!report.dietaryProtocol) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Utensils className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-4">No dietary protocol available</p>
            <Button
              onClick={handleGenerateDietaryPlan}
              disabled={dietaryLoading}
              size="lg"
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {dietaryLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Detailed Plan...
                </>
              ) : (
                <>
                  <Utensils className="h-4 w-4 mr-2" />
                  Generate Detailed 7-Day Meal Plan
                </>
              )}
            </Button>
            {dietaryError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{dietaryError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )
    }
    
    const { dietaryProtocol } = report
    
    return (
      <div id="dietary-protocol-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-cyan-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Utensils className="h-6 w-6" />
                {dietaryProtocol.header.title}
              </h2>
              <p className="text-gray-600 mt-1">Personalized Nutrition Plan</p>
              {!detailedDietaryGenerated && (
                <p className="text-sm text-cyan-600 mt-1 font-medium">
                  📋 Basic meal plan from diagnosis. Click button to generate detailed 7-day plan.
                </p>
              )}
              {detailedDietaryGenerated && (
                <p className="text-sm text-teal-600 mt-1 font-medium">
                  ✓ Detailed 7-day meal plan generated with exact portions and nutrition
                </p>
              )}
            </div>
            <div className="flex gap-2 print:hidden">
              {!detailedDietaryGenerated && !dietaryLoading && (
                <Button
                  onClick={handleGenerateDietaryPlan}
                  variant="default"
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Utensils className="h-4 w-4 mr-2" />
                  Generate Detailed 7-Day Plan
                </Button>
              )}
              {dietaryLoading && (
                <Button disabled size="sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </Button>
              )}
              {detailedDietaryGenerated && (
                <Button
                  onClick={handleGenerateDietaryPlan}
                  variant="outline"
                  size="sm"
                >
                  <Utensils className="h-4 w-4 mr-2" />
                  Regenerate Plan
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToPDF('dietary-protocol-section', `dietary_plan_${report.medicalReport.patient.fullName}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* Comprehensive Patient Information */}
        <div className="mb-6 p-5 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg border-2 border-cyan-200">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-cyan-800">
            <User className="h-6 w-6" />
            COMPREHENSIVE PATIENT INFORMATION
          </h3>
          
          {/* Demographics Section */}
          <div className="mb-4 pb-4 border-b border-cyan-200">
            <h4 className="font-semibold text-sm text-cyan-700 mb-2">👤 Patient Demographics</h4>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div><strong>Nom complet / Full Name:</strong> {report.medicalReport.patient.fullName}</div>
              <div><strong>Date de naissance / Date of Birth:</strong> {report.medicalReport.patient.dateOfBirth}</div>
              <div><strong>Âge / Age:</strong> {report.medicalReport.patient.age} years</div>
              <div><strong>Genre / Gender:</strong> {report.medicalReport.patient.gender}</div>
              <div><strong>Téléphone / Phone:</strong> {report.medicalReport.patient.phone}</div>
              {report.medicalReport.patient.nationalId && (
                <div><strong>NID:</strong> {report.medicalReport.patient.nationalId}</div>
              )}
              <div className="col-span-3"><strong>Adresse / Address:</strong> {report.medicalReport.patient.address}</div>
            </div>
          </div>
          
          {/* Anthropometric Measurements */}
          <div className="mb-4 pb-4 border-b border-cyan-200">
            <h4 className="font-semibold text-sm text-cyan-700 mb-2">📏 Anthropometric Measurements</h4>
            <div className="grid grid-cols-4 gap-x-6 gap-y-2 text-sm">
              {report.medicalReport.patient.weight && (
                <div><strong>Poids / Weight:</strong> {report.medicalReport.patient.weight} kg</div>
              )}
              {report.medicalReport.patient.height && (
                <div><strong>Taille / Height:</strong> {report.medicalReport.patient.height} cm</div>
              )}
              {report.medicalReport.patient.weight && report.medicalReport.patient.height && (() => {
                const weight = parseFloat(report.medicalReport.patient.weight)
                const heightInMeters = parseFloat(report.medicalReport.patient.height) / 100
                const bmi = weight / (heightInMeters * heightInMeters)
                let bmiCategory = ''
                if (bmi < 18.5) bmiCategory = 'Underweight'
                else if (bmi < 25) bmiCategory = 'Normal'
                else if (bmi < 30) bmiCategory = 'Overweight'
                else if (bmi < 35) bmiCategory = 'Obese I'
                else bmiCategory = 'Obese II+'
                return (
                  <>
                    <div><strong>BMI / IMC:</strong> {bmi.toFixed(1)} kg/m²</div>
                    <div><strong>Category:</strong> <span className={bmi >= 25 ? 'text-orange-600 font-semibold' : 'text-green-600'}>{bmiCategory}</span></div>
                  </>
                )
              })()}
            </div>
          </div>
          
          {/* Vital Signs */}
          {(report.medicalReport.patient.bloodPressureSystolic || report.medicalReport.patient.temperature || report.medicalReport.patient.bloodGlucose) && (
            <div className="mb-4 pb-4 border-b border-cyan-200">
              <h4 className="font-semibold text-sm text-cyan-700 mb-2">💓 Vital Signs & Clinical Parameters</h4>
              <div className="grid grid-cols-4 gap-x-6 gap-y-2 text-sm">
                {report.medicalReport.patient.bloodPressureSystolic && report.medicalReport.patient.bloodPressureDiastolic && (
                  <div>
                    <strong>Tension artérielle / Blood Pressure:</strong>{' '}
                    <span className={
                      parseInt(report.medicalReport.patient.bloodPressureSystolic) >= 140 || 
                      parseInt(report.medicalReport.patient.bloodPressureDiastolic) >= 90
                        ? 'text-red-600 font-semibold'
                        : 'text-green-600'
                    }>
                      {report.medicalReport.patient.bloodPressureSystolic}/{report.medicalReport.patient.bloodPressureDiastolic} mmHg
                    </span>
                  </div>
                )}
                {report.medicalReport.patient.bloodGlucose && (
                  <div>
                    <strong>Glycémie / Blood Glucose:</strong>{' '}
                    <span className={
                      parseFloat(report.medicalReport.patient.bloodGlucose) > 7.0
                        ? 'text-red-600 font-semibold'
                        : 'text-green-600'
                    }>
                      {report.medicalReport.patient.bloodGlucose} mmol/L
                    </span>
                  </div>
                )}
                {report.medicalReport.patient.temperature && (
                  <div><strong>Temperature:</strong> {report.medicalReport.patient.temperature}°C</div>
                )}
              </div>
            </div>
          )}
          
          {/* Medical History & Allergies */}
          <div className="mb-4 pb-4 border-b border-cyan-200">
            <h4 className="font-semibold text-sm text-cyan-700 mb-2">🏥 Medical Profile</h4>
            <div className="space-y-2 text-sm">
              {report.medicalReport.patient.medicalHistory && (
                <div>
                  <strong>ATCD médicaux / Medical History:</strong>{' '}
                  <span className="text-gray-800">
                    {Array.isArray(report.medicalReport.patient.medicalHistory)
                      ? report.medicalReport.patient.medicalHistory.join(', ')
                      : report.medicalReport.patient.medicalHistory}
                  </span>
                </div>
              )}
              {report.medicalReport.patient.allergies && (
                <div>
                  <strong className="text-red-700">⚠️ Allergies:</strong>{' '}
                  <span className="text-red-600 font-medium">
                    {report.medicalReport.patient.allergies}
                  </span>
                </div>
              )}
              {report.medicalReport.patient.currentMedications && (
                <div>
                  <strong>Current Medications:</strong>{' '}
                  <span className="text-gray-800">{report.medicalReport.patient.currentMedications}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Lifestyle Habits */}
          {(patientData?.smokingStatus || patientData?.tabac || patientData?.alcoholConsumption || 
            patientData?.alcool || patientData?.physicalActivity || patientData?.activitePhysique) && (
            <div>
              <h4 className="font-semibold text-sm text-cyan-700 mb-2">🚶 Habitudes de vie / Lifestyle Habits</h4>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                {(patientData?.smokingStatus || patientData?.tabac) && (
                  <div>
                    <strong>Tabac / Smoking:</strong>{' '}
                    {patientData?.smokingStatus || patientData?.tabac}
                  </div>
                )}
                {(patientData?.alcoholConsumption || patientData?.alcool) && (
                  <div>
                    <strong>Alcool / Alcohol:</strong>{' '}
                    {patientData?.alcoholConsumption || patientData?.alcool}
                  </div>
                )}
                {(patientData?.physicalActivity || patientData?.activitePhysique) && (
                  <div>
                    <strong>Activité physique / Physical Activity:</strong>{' '}
                    {patientData?.physicalActivity || patientData?.activitePhysique}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Report Date */}
          <div className="mt-4 pt-4 border-t border-cyan-200">
            <div className="text-sm">
              <strong>📅 Report Date / Date du rapport:</strong> {dietaryProtocol.header.date}
            </div>
          </div>
        </div>
        
        {/* Show error if dietary generation failed */}
        {dietaryError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{dietaryError}</AlertDescription>
          </Alert>
        )}
        
        {/* Nutritional Assessment */}
        {dietaryProtocol.nutritionalAssessment && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">Nutritional Assessment</h3>
            <div className="space-y-3">
              {dietaryProtocol.nutritionalAssessment.currentDiet && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Current Diet:</h4>
                  <p className="text-base">{dietaryProtocol.nutritionalAssessment.currentDiet}</p>
                </div>
              )}
              {dietaryProtocol.nutritionalAssessment.nutritionalDeficiencies && dietaryProtocol.nutritionalAssessment.nutritionalDeficiencies.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Nutritional Deficiencies:</h4>
                  <ul className="list-disc list-inside text-base">
                    {dietaryProtocol.nutritionalAssessment.nutritionalDeficiencies.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {dietaryProtocol.nutritionalAssessment.dietaryRestrictions && dietaryProtocol.nutritionalAssessment.dietaryRestrictions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Dietary Restrictions:</h4>
                  <ul className="list-disc list-inside text-base">
                    {dietaryProtocol.nutritionalAssessment.dietaryRestrictions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Nutritional Guidelines */}
        {dietaryProtocol.nutritionalGuidelines && (
          <div className="mb-6 p-4 bg-cyan-50 rounded">
            <h3 className="font-bold mb-3">Nutritional Guidelines</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {dietaryProtocol.nutritionalGuidelines.caloriesTarget && (
                <div>
                  <strong>Daily Calories Target:</strong> {dietaryProtocol.nutritionalGuidelines.caloriesTarget}
                </div>
              )}
              {dietaryProtocol.nutritionalGuidelines.hydration && (
                <div>
                  <strong>Hydration:</strong> {dietaryProtocol.nutritionalGuidelines.hydration}
                </div>
              )}
            </div>
            {dietaryProtocol.nutritionalGuidelines.macronutrients && (
              <div className="mt-3">
                <strong>Macronutrients:</strong>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  {dietaryProtocol.nutritionalGuidelines.macronutrients.proteins && (
                    <div>Proteins: {dietaryProtocol.nutritionalGuidelines.macronutrients.proteins}</div>
                  )}
                  {dietaryProtocol.nutritionalGuidelines.macronutrients.carbohydrates && (
                    <div>Carbs: {dietaryProtocol.nutritionalGuidelines.macronutrients.carbohydrates}</div>
                  )}
                  {dietaryProtocol.nutritionalGuidelines.macronutrients.fats && (
                    <div>Fats: {dietaryProtocol.nutritionalGuidelines.macronutrients.fats}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 7-Day Weekly Meal Plan */}
        {dietaryProtocol.weeklyMealPlan && (
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-4 text-center border-b-2 border-cyan-600 pb-2">
              7-DAY MEAL PLAN
            </h3>
            
            {/* Iterate through each day */}
            {['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'].map((dayKey, dayIndex) => {
              const dayData = dietaryProtocol.weeklyMealPlan[dayKey]
              if (!dayData) return null
              
              const dayNumber = dayIndex + 1
              const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex]
              
              return (
                <div key={dayKey} className="mb-6 border-2 border-cyan-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-white print:page-break-inside-avoid">
                  {/* Day Header */}
                  <div className="mb-4 pb-3 border-b-2 border-cyan-300">
                    <h4 className="text-xl font-bold text-cyan-800">
                      DAY {dayNumber} - {dayName}
                    </h4>
                  </div>
                  
                  {/* Breakfast */}
                  {dayData.breakfast && (
                    <div className="mb-4 bg-white rounded p-3 border-l-4 border-cyan-500">
                      <h5 className="font-bold text-cyan-700 mb-2">🌅 BREAKFAST ({dayData.breakfast.totalCalories} kcal)</h5>
                      <ul className="space-y-1 text-sm">
                        {dayData.breakfast.foods && dayData.breakfast.foods.map((food: any, idx: number) => (
                          <li key={idx} className="ml-4">
                            • <strong>{food.item}</strong> - {food.quantity} - <span className="text-cyan-600">{food.calories} kcal</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Mid-Morning Snack */}
                  {dayData.midMorningSnack && (
                    <div className="mb-4 bg-white rounded p-3 border-l-4 border-teal-500">
                      <h5 className="font-bold text-teal-700 mb-2">☕ MID-MORNING SNACK ({dayData.midMorningSnack.totalCalories} kcal)</h5>
                      <ul className="space-y-1 text-sm">
                        {dayData.midMorningSnack.foods && dayData.midMorningSnack.foods.map((food: any, idx: number) => (
                          <li key={idx} className="ml-4">
                            • <strong>{food.item}</strong> - {food.quantity} - <span className="text-cyan-600">{food.calories} kcal</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Lunch */}
                  {dayData.lunch && (
                    <div className="mb-4 bg-white rounded p-3 border-l-4 border-blue-500">
                      <h5 className="font-bold text-blue-700 mb-2">🍽️ LUNCH ({dayData.lunch.totalCalories} kcal)</h5>
                      <ul className="space-y-1 text-sm">
                        {dayData.lunch.foods && dayData.lunch.foods.map((food: any, idx: number) => (
                          <li key={idx} className="ml-4">
                            • <strong>{food.item}</strong> - {food.quantity} - <span className="text-cyan-600">{food.calories} kcal</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Afternoon Snack */}
                  {dayData.afternoonSnack && (
                    <div className="mb-4 bg-white rounded p-3 border-l-4 border-blue-500">
                      <h5 className="font-bold text-blue-700 mb-2">🍎 AFTERNOON SNACK ({dayData.afternoonSnack.totalCalories} kcal)</h5>
                      <ul className="space-y-1 text-sm">
                        {dayData.afternoonSnack.foods && dayData.afternoonSnack.foods.map((food: any, idx: number) => (
                          <li key={idx} className="ml-4">
                            • <strong>{food.item}</strong> - {food.quantity} - <span className="text-cyan-600">{food.calories} kcal</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Dinner */}
                  {dayData.dinner && (
                    <div className="mb-4 bg-white rounded p-3 border-l-4 border-indigo-500">
                      <h5 className="font-bold text-indigo-700 mb-2">🌙 DINNER ({dayData.dinner.totalCalories} kcal)</h5>
                      <ul className="space-y-1 text-sm">
                        {dayData.dinner.foods && dayData.dinner.foods.map((food: any, idx: number) => (
                          <li key={idx} className="ml-4">
                            • <strong>{food.item}</strong> - {food.quantity} - <span className="text-cyan-600">{food.calories} kcal</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Daily Total */}
                  <div className="mt-3 pt-3 border-t border-cyan-300">
                    <p className="text-right font-bold text-lg text-cyan-800">
                      📊 DAILY TOTAL: {
                        (dayData.breakfast?.totalCalories || 0) +
                        (dayData.midMorningSnack?.totalCalories || 0) +
                        (dayData.lunch?.totalCalories || 0) +
                        (dayData.afternoonSnack?.totalCalories || 0) +
                        (dayData.dinner?.totalCalories || 0)
                      } kcal
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Practical Guidance */}
        {dietaryProtocol.practicalGuidance && (
          <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-lg mb-4 text-blue-800">📋 PRACTICAL GUIDANCE</h3>
            
            {/* Grocery List */}
            {dietaryProtocol.practicalGuidance.groceryList && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-blue-700">🛒 Grocery Shopping List:</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {dietaryProtocol.practicalGuidance.groceryList.proteins && (
                    <div>
                      <p className="font-semibold text-blue-700">Proteins:</p>
                      <ul className="list-disc list-inside ml-2">
                        {dietaryProtocol.practicalGuidance.groceryList.proteins.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dietaryProtocol.practicalGuidance.groceryList.vegetables && (
                    <div>
                      <p className="font-semibold text-teal-700">Vegetables:</p>
                      <ul className="list-disc list-inside ml-2">
                        {dietaryProtocol.practicalGuidance.groceryList.vegetables.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dietaryProtocol.practicalGuidance.groceryList.grains && (
                    <div>
                      <p className="font-semibold text-cyan-700">Grains:</p>
                      <ul className="list-disc list-inside ml-2">
                        {dietaryProtocol.practicalGuidance.groceryList.grains.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Meal Prep Tips */}
            {dietaryProtocol.practicalGuidance.mealPrepTips && dietaryProtocol.practicalGuidance.mealPrepTips.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-blue-700">💡 Meal Preparation Tips:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  {dietaryProtocol.practicalGuidance.mealPrepTips.map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Cooking Methods */}
            {dietaryProtocol.practicalGuidance.cookingMethods && (
              <div>
                <h4 className="font-semibold mb-2 text-blue-700">👨‍🍳 Cooking Methods:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {dietaryProtocol.practicalGuidance.cookingMethods.recommended && (
                    <div className="bg-teal-50 p-3 rounded">
                      <p className="font-semibold text-teal-700 mb-1">✅ Recommended:</p>
                      <ul className="list-disc list-inside ml-2">
                        {dietaryProtocol.practicalGuidance.cookingMethods.recommended.map((method: string, idx: number) => (
                          <li key={idx}>{method}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dietaryProtocol.practicalGuidance.cookingMethods.avoid && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="font-semibold text-blue-700 mb-1">❌ Avoid:</p>
                      <ul className="list-disc list-inside ml-2">
                        {dietaryProtocol.practicalGuidance.cookingMethods.avoid.map((method: string, idx: number) => (
                          <li key={idx}>{method}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Foods to Avoid & Recommended */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {dietaryProtocol.forbiddenFoods && dietaryProtocol.forbiddenFoods.length > 0 && (
            <div className="p-4 bg-blue-50 rounded">
              <h4 className="font-semibold mb-2 text-blue-700">Foods to Avoid:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {dietaryProtocol.forbiddenFoods.map((food, idx) => (
                  <li key={idx}>{food}</li>
                ))}
              </ul>
            </div>
          )}
          {dietaryProtocol.recommendedFoods && dietaryProtocol.recommendedFoods.length > 0 && (
            <div className="p-4 bg-teal-50 rounded">
              <h4 className="font-semibold mb-2 text-teal-700">Recommended Foods:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {dietaryProtocol.recommendedFoods.map((food, idx) => (
                  <li key={idx}>{food}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Special Instructions */}
        {dietaryProtocol.specialInstructions && dietaryProtocol.specialInstructions.length > 0 && (
          <div className="p-4 bg-cyan-50 rounded mb-6">
            <h4 className="font-semibold mb-2">Special Instructions:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {dietaryProtocol.specialInstructions.map((instruction, idx) => (
                <li key={idx}>{instruction}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Follow-up */}
        {dietaryProtocol.followUpSchedule && (
          <div className="p-4 bg-blue-50 rounded">
            <h4 className="font-semibold mb-2">Follow-up Schedule:</h4>
            <p className="text-sm">{dietaryProtocol.followUpSchedule}</p>
          </div>
        )}
        
        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{report.medicalReport.practitioner.name}</p>
            <p className="text-sm text-gray-600">{report.medicalReport.practitioner.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {report.medicalReport.practitioner.registrationNumber}</p>

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
              <div className="mt-6">
                <p className="text-sm">_______________________________</p>
                <p className="text-sm">Medical Practitioner's Signature</p>
                <p className="text-sm">Date: {dietaryProtocol.header.date}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const FollowUpPlanSection = () => {
    if (!report.followUpPlan) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No follow-up plan available</p>
          </CardContent>
        </Card>
      )
    }
    
    const { followUpPlan } = report
    
    return (
      <div id="followup-plan-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        {/* Professional Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold mb-4">CHRONIC DISEASE MANAGEMENT</h1>
          <h2 className="text-xl font-semibold mb-6">FOLLOW-UP CARE PLAN</h2>
          
          {/* Medical Practitioner Info */}
          <div className="bg-gray-100 p-4 rounded mb-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm max-w-3xl mx-auto">
              <div className="text-left">
                <strong>Medical Practitioner:</strong> {report.medicalReport.practitioner.name}
              </div>
              <div className="text-left">
                <strong>Qualifications:</strong> {report.medicalReport.practitioner.qualifications}
              </div>
              <div className="text-left">
                <strong>Registration Number:</strong> {report.medicalReport.practitioner.registrationNumber}
              </div>
              <div className="text-left">
                <strong>Facility:</strong> {report.medicalReport.practitioner.facility}
              </div>
              <div className="text-left">
                <strong>Contact:</strong> {report.medicalReport.practitioner.contact}
              </div>
              <div className="text-left">
                <strong>Date:</strong> {followUpPlan.header.date}
              </div>
            </div>
          </div>
          
          {/* Export Button */}
          <div className="flex justify-center print:hidden mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF('followup-plan-section', `followup_${report.medicalReport.patient.fullName}.pdf`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
        
        {/* Patient Identification Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">PATIENT IDENTIFICATION & MEDICAL PROFILE</h3>
          <div className="bg-gray-50 p-4 rounded">
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="font-semibold">Full Name:</span> {report.medicalReport.patient.fullName}
              </div>
              <div>
                <span className="font-semibold">Age:</span> {report.medicalReport.patient.age} years
              </div>
              <div>
                <span className="font-semibold">Gender:</span> {report.medicalReport.patient.gender}
              </div>
              {report.medicalReport.patient.nationalId && (
                <div>
                  <span className="font-semibold">National ID:</span> {report.medicalReport.patient.nationalId}
                </div>
              )}
              <div>
                <span className="font-semibold">Contact:</span> {report.medicalReport.patient.contact}
              </div>
              <div>
                <span className="font-semibold">Address:</span> {report.medicalReport.patient.address}
              </div>
            </div>
          </div>
        </div>
        
        {/* Treatment Goals Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">TREATMENT GOALS & OBJECTIVES</h3>
          
          {/* Short-Term Goals */}
          {followUpPlan.shortTermGoals && followUpPlan.shortTermGoals.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-base mb-3 text-teal-700">
                SHORT-TERM GOALS (0-3 months)
              </h4>
              <div className="space-y-4">
                {followUpPlan.shortTermGoals.map((goal, idx) => (
                  <div key={idx} className="bg-teal-50 border-l-4 border-teal-600 p-4">
                    <p className="font-semibold mb-1">{idx + 1}. {goal.goal}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Timeline:</span> {goal.timeline}
                    </p>
                    {goal.metrics && goal.metrics.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Success Metrics:</span>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                          {goal.metrics.map((metric, midx) => (
                            <li key={midx}>{metric}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Long-Term Goals */}
          {followUpPlan.longTermGoals && followUpPlan.longTermGoals.length > 0 && (
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-700">
                LONG-TERM GOALS (3-12 months)
              </h4>
              <div className="space-y-4">
                {followUpPlan.longTermGoals.map((goal, idx) => (
                  <div key={idx} className="bg-blue-50 border-l-4 border-blue-600 p-4">
                    <p className="font-semibold mb-1">{idx + 1}. {goal.goal}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Timeline:</span> {goal.timeline}
                    </p>
                    {goal.metrics && goal.metrics.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Success Metrics:</span>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                          {goal.metrics.map((metric, midx) => (
                            <li key={midx}>{metric}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Monitoring Schedule Section */}
        {followUpPlan.monitoringSchedule && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">MONITORING & FOLLOW-UP SCHEDULE</h3>
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                {followUpPlan.monitoringSchedule.nextAppointment && (
                  <div>
                    <span className="font-semibold">Next Appointment:</span>
                    <p className="ml-4">{followUpPlan.monitoringSchedule.nextAppointment}</p>
                  </div>
                )}
                {followUpPlan.monitoringSchedule.followUpFrequency && (
                  <div>
                    <span className="font-semibold">Follow-up Frequency:</span>
                    <p className="ml-4">{followUpPlan.monitoringSchedule.followUpFrequency}</p>
                  </div>
                )}
              </div>
              {followUpPlan.monitoringSchedule.monitoringParameters && followUpPlan.monitoringSchedule.monitoringParameters.length > 0 && (
                <div className="text-sm">
                  <span className="font-semibold">Parameters to Monitor:</span>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    {followUpPlan.monitoringSchedule.monitoringParameters.map((param, idx) => (
                      <li key={idx}>{param}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Lifestyle Modifications Section */}
        {followUpPlan.lifestyleModifications && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">LIFESTYLE MODIFICATIONS & RECOMMENDATIONS</h3>
            
            {/* Physical Activity */}
            {followUpPlan.lifestyleModifications.physicalActivity && followUpPlan.lifestyleModifications.physicalActivity.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Physical Activity Recommendations:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    {followUpPlan.lifestyleModifications.physicalActivity.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Dietary Changes */}
            {followUpPlan.lifestyleModifications.dietaryChanges && followUpPlan.lifestyleModifications.dietaryChanges.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Dietary Modifications:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    {followUpPlan.lifestyleModifications.dietaryChanges.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Stress Management */}
            {followUpPlan.lifestyleModifications.stressManagement && followUpPlan.lifestyleModifications.stressManagement.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Stress Management:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    {followUpPlan.lifestyleModifications.stressManagement.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Sleep Hygiene */}
            {followUpPlan.lifestyleModifications.sleepHygiene && followUpPlan.lifestyleModifications.sleepHygiene.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Sleep Hygiene:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    {followUpPlan.lifestyleModifications.sleepHygiene.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Emergency Protocol Section */}
        {followUpPlan.emergencyProtocol && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400 text-blue-700">EMERGENCY PROTOCOL</h3>
            <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded">
              {followUpPlan.emergencyProtocol.warningSigns && followUpPlan.emergencyProtocol.warningSigns.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warning Signs - Seek Immediate Medical Attention:
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    {followUpPlan.emergencyProtocol.warningSigns.map((sign, idx) => (
                      <li key={idx}>{sign}</li>
                    ))}
                  </ul>
                </div>
              )}
              {followUpPlan.emergencyProtocol.actionSteps && followUpPlan.emergencyProtocol.actionSteps.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Immediate Action Steps:</h4>
                  <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                    {followUpPlan.emergencyProtocol.actionSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {followUpPlan.emergencyProtocol.emergencyContacts && followUpPlan.emergencyProtocol.emergencyContacts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Emergency Contact Numbers:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    {followUpPlan.emergencyProtocol.emergencyContacts.map((contact, idx) => (
                      <li key={idx} className="font-medium">{contact}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Educational Resources Section */}
        {followUpPlan.educationalResources && followUpPlan.educationalResources.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">PATIENT EDUCATION & RESOURCES</h3>
            <div className="bg-cyan-50 p-4 rounded border border-cyan-200">
              <ul className="list-disc list-inside text-sm space-y-2">
                {followUpPlan.educationalResources.map((resource, idx) => (
                  <li key={idx}>{resource}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Special Instructions Section */}
        {followUpPlan.specialInstructions && followUpPlan.specialInstructions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">SPECIAL INSTRUCTIONS & PRECAUTIONS</h3>
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <ul className="list-disc list-inside text-sm space-y-2">
                {followUpPlan.specialInstructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Professional Footer with Signature */}
        <div className="mt-12 pt-6 border-t-2 border-gray-800">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <p className="text-sm text-gray-600 mb-2">This follow-up care plan has been prepared for:</p>
              <p className="font-semibold">{report.medicalReport.patient.fullName}</p>
              <p className="text-sm text-gray-600">Date: {followUpPlan.header.date}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-4">Medical Practitioner's Signature:</p>
              {validationStatus === 'validated' && documentSignatures.consultation ? (
                <div className="mt-4">
                  <img
                    src={documentSignatures.consultation}
                    alt="Doctor's Signature"
                    className="ml-auto h-20 w-auto"
                    style={{ maxWidth: '300px' }}
                  />
                </div>
              ) : (
                <div className="mb-2">
                  <p className="border-b-2 border-gray-400 w-64 mb-1"></p>
                </div>
              )}
              <p className="font-semibold">{report.medicalReport.practitioner.name}</p>
              <p className="text-sm text-gray-600">{report.medicalReport.practitioner.qualifications}</p>
              <p className="text-sm text-gray-600">Registration: {report.medicalReport.practitioner.registrationNumber}</p>
              <p className="text-sm text-gray-600 mt-2">Date: {followUpPlan.header.date}</p>
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>This document is confidential and intended solely for the use of the patient and authorized healthcare providers.</p>
            <p className="mt-1">© {new Date().getFullYear()} {report.medicalReport.practitioner.facility} - All Rights Reserved</p>
          </div>
        </div>
      </div>
    )
  }
  
  // ==================== ACTIONS BAR ====================
  
  const ActionsBar = () => {
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
                {report.medicalReport.metadata.wordCount} words
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
              
              {hasUnsavedChanges && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || validationStatus === 'validated'}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              )}
              
              <Button
                variant="default"
                size="sm"
                onClick={handleValidation}
                disabled={saving || validationStatus === 'validated' || hasUnsavedChanges}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4 mr-2" />
                )}
                {validationStatus === 'validated' ? 'Validated' : 'Validate & Sign'}
              </Button>

              {validationStatus === 'validated' && (
                <Button
                  size="sm"
                  onClick={handleSendDocuments}
                  disabled={isSendingDocuments}
                  className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingDocuments ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Documents
                    </>
                  )}
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // ==================== PRESCRIPTION STATS ====================
  
  const PrescriptionStats = () => {
    const medicationCount = report.medicationPrescription?.prescription.medications?.length || 0
    const labTestsCount = report.laboratoryTests ? 
      Object.values(report.laboratoryTests.prescription.tests || {})
        .reduce((acc: number, tests: any) => acc + (Array.isArray(tests) ? tests.length : 0), 0) : 0
    const paraclinicalCount = report.paraclinicalExams?.prescription.exams?.length || 0
    
    return (
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Prescription Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-teal-50 rounded">
              <Pill className="h-8 w-8 mx-auto mb-2 text-teal-600" />
              <p className="text-2xl font-bold text-teal-600">{medicationCount}</p>
              <p className="text-sm text-gray-600">Medications</p>
            </div>
            <div className="p-4 bg-blue-50 rounded">
              <TestTube className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{labTestsCount}</p>
              <p className="text-sm text-gray-600">Lab Tests</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded">
              <Scan className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
              <p className="text-2xl font-bold text-indigo-600">{paraclinicalCount}</p>
              <p className="text-sm text-gray-600">Paraclinical</p>
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
      <PrescriptionStats />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="medical-report">
            <FileText className="h-4 w-4 mr-2" />
            Report
          </TabsTrigger>
          <TabsTrigger value="medications">
            <Pill className="h-4 w-4 mr-2" />
            Medications
            {report.medicationPrescription && (
              <Badge variant="secondary" className="ml-2">
                {report.medicationPrescription.prescription.medications?.length || 0}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="laboratory">
            <TestTube className="h-4 w-4 mr-2" />
            Lab Tests
            {report.laboratoryTests && (
              <Badge variant="secondary" className="ml-2">
                {Object.values(report.laboratoryTests.prescription.tests || {})
                  .reduce((acc: number, tests: any) => acc + (Array.isArray(tests) ? tests.length : 0), 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paraclinical">
            <Scan className="h-4 w-4 mr-2" />
            Paraclinical
            {report.paraclinicalExams && (
              <Badge variant="secondary" className="ml-2">
                {report.paraclinicalExams.prescription.exams?.length || 0}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dietary">
            <Utensils className="h-4 w-4 mr-2" />
            Diet Plan
          </TabsTrigger>
          <TabsTrigger value="sick-leave">
            <Calendar className="h-4 w-4 mr-2" />
            Sick Leave
            {sickLeaveData.numberOfDays > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sickLeaveData.numberOfDays}d
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoice">
            <Activity className="h-4 w-4 mr-2" />
            Invoice
            {invoiceData.services.totalDue > 0 && (
              <Badge variant="secondary" className="ml-2">
                Rs {invoiceData.services.totalDue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="followup">
            <ClipboardList className="h-4 w-4 mr-2" />
            Follow-Up
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold shadow-lg hover:from-teal-600 hover:to-cyan-600 data-[state=active]:ring-2 data-[state=active]:ring-yellow-400">
            <Stethoscope className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="medical-report">
          <MedicalReportSection />
        </TabsContent>
        
        <TabsContent value="medications">
          <MedicationPrescriptionSection />
        </TabsContent>

        <TabsContent value="laboratory">
          <LaboratoryTestsSection />
        </TabsContent>

        <TabsContent value="paraclinical">
          <ParaclinicalExamsSection />
        </TabsContent>
        
        <TabsContent value="dietary">
          <DietaryProtocolSection />
        </TabsContent>

        <TabsContent value="sick-leave">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Medical Certificate / Sick Leave (Arrêt Maladie)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date (Date Début)</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={sickLeaveData.startDate}
                    onChange={(e) => {
                      setSickLeaveData(prev => ({ ...prev, startDate: e.target.value }))
                      setHasUnsavedChanges(true)
                      // Auto-calculate days
                      if (sickLeaveData.endDate && e.target.value) {
                        const start = new Date(e.target.value)
                        const end = new Date(sickLeaveData.endDate)
                        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1
                        setSickLeaveData(prev => ({ ...prev, numberOfDays: days > 0 ? days : 0 }))
                      }
                    }}
                    disabled={validationStatus === 'validated'}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date (Date Fin)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={sickLeaveData.endDate}
                    onChange={(e) => {
                      setSickLeaveData(prev => ({ ...prev, endDate: e.target.value }))
                      setHasUnsavedChanges(true)
                      // Auto-calculate days
                      if (sickLeaveData.startDate && e.target.value) {
                        const start = new Date(sickLeaveData.startDate)
                        const end = new Date(e.target.value)
                        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1
                        setSickLeaveData(prev => ({ ...prev, numberOfDays: days > 0 ? days : 0 }))
                      }
                    }}
                    disabled={validationStatus === 'validated'}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="numberOfDays">Number of Days (Nombre de Jours)</Label>
                <Input
                  id="numberOfDays"
                  type="number"
                  value={sickLeaveData.numberOfDays}
                  onChange={(e) => {
                    setSickLeaveData(prev => ({ ...prev, numberOfDays: parseInt(e.target.value) || 0 }))
                    setHasUnsavedChanges(true)
                  }}
                  disabled={validationStatus === 'validated'}
                />
              </div>

              <div>
                <Label htmlFor="medicalReason">Medical Reason (Motif Médical)</Label>
                <Textarea
                  id="medicalReason"
                  value={sickLeaveData.medicalReason}
                  onChange={(e) => {
                    setSickLeaveData(prev => ({ ...prev, medicalReason: e.target.value }))
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="Medical reason for sick leave..."
                  className="min-h-[100px]"
                  disabled={validationStatus === 'validated'}
                />
              </div>

              <div>
                <Label htmlFor="remarks">Additional Remarks (Remarques)</Label>
                <Textarea
                  id="remarks"
                  value={sickLeaveData.remarks}
                  onChange={(e) => {
                    setSickLeaveData(prev => ({ ...prev, remarks: e.target.value }))
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="Any additional remarks..."
                  disabled={validationStatus === 'validated'}
                />
              </div>

              {sickLeaveData.numberOfDays > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Sick leave certificate for <strong>{sickLeaveData.numberOfDays} days</strong> will be included in the final report.
                  </AlertDescription>
                </Alert>
              )}

              {/* Medical Certificate Document Preview */}
              {sickLeaveData.numberOfDays > 0 && sickLeaveData.startDate && sickLeaveData.endDate && (
                <div id="sick-leave-certificate" className="mt-6 bg-white p-8 rounded-lg border-2 border-gray-300 print:shadow-none">
                  {/* Certificate Header */}
                  <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
                    <h1 className="text-2xl font-bold mb-2">MEDICAL CERTIFICATE</h1>
                    <h2 className="text-lg font-semibold mb-4">CERTIFICAT D'ARRÊT DE TRAVAIL</h2>
                    <p className="text-sm text-gray-600">Sick Leave Certificate / Certificat Médical</p>

                    {/* Medical Practitioner Info Header */}
                    <div className="bg-gray-100 p-4 rounded mt-4">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm max-w-3xl mx-auto">
                        <div className="text-left">
                          <strong>Medical Practitioner:</strong> {report.medicalReport.practitioner.name}
                        </div>
                        <div className="text-left">
                          <strong>Qualifications:</strong> {report.medicalReport.practitioner.qualifications}
                        </div>
                        <div className="text-left">
                          <strong>Registration Number:</strong> {report.medicalReport.practitioner.registrationNumber}
                        </div>
                        <div className="text-left">
                          <strong>Specialty:</strong> {report.medicalReport.practitioner.specialty}
                        </div>
                        <div className="text-left">
                          <strong>Facility:</strong> {report.medicalReport.practitioner.facility}
                        </div>
                        <div className="text-left">
                          <strong>Contact:</strong> {report.medicalReport.practitioner.contact}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Patient Information */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">PATIENT INFORMATION / INFORMATIONS DU PATIENT</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div>
                          <span className="font-semibold">Full Name / Nom complet:</span> {report.medicalReport.patient.fullName}
                        </div>
                        <div>
                          <span className="font-semibold">Age / Âge:</span> {report.medicalReport.patient.age} years
                        </div>
                        <div>
                          <span className="font-semibold">Date of Birth / Date de naissance:</span> {report.medicalReport.patient.dateOfBirth}
                        </div>
                        <div>
                          <span className="font-semibold">Gender / Sexe:</span> {report.medicalReport.patient.gender}
                        </div>
                        <div className="col-span-2">
                          <span className="font-semibold">Address / Adresse:</span> {report.medicalReport.patient.address}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 pb-2 border-b border-gray-400">CERTIFICATE DETAILS / DÉTAILS DU CERTIFICAT</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm mb-2">
                          <strong>I, the undersigned medical practitioner, hereby certify that:</strong>
                        </p>
                        <p className="text-sm italic mb-2">
                          Je soussigné(e), médecin, certifie que:
                        </p>
                        <p className="text-base font-medium mt-3">
                          <strong>{report.medicalReport.patient.fullName}</strong>
                        </p>
                        <p className="text-sm mt-2">
                          is medically unfit for work and requires rest for a period of:
                        </p>
                        <p className="text-sm italic">
                          est médicalement inapte au travail et nécessite un repos de:
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
                        <div className="text-center">
                          <p className="font-semibold text-sm">Start Date / Date Début</p>
                          <p className="text-lg font-bold text-blue-600">{sickLeaveData.startDate}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">End Date / Date Fin</p>
                          <p className="text-lg font-bold text-blue-600">{sickLeaveData.endDate}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">Duration / Durée</p>
                          <p className="text-lg font-bold text-blue-600">{sickLeaveData.numberOfDays} days / jours</p>
                        </div>
                      </div>

                      {sickLeaveData.medicalReason && (
                        <div className="p-4 bg-gray-50 rounded">
                          <p className="font-semibold text-sm mb-2">Medical Reason / Motif Médical:</p>
                          <p className="text-sm">{sickLeaveData.medicalReason}</p>
                        </div>
                      )}

                      {sickLeaveData.remarks && (
                        <div className="p-4 bg-gray-50 rounded">
                          <p className="font-semibold text-sm mb-2">Additional Remarks / Remarques:</p>
                          <p className="text-sm">{sickLeaveData.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate Footer with Doctor Signature */}
                  <div className="mt-8 pt-6 border-t-2 border-gray-800">
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <p className="text-sm font-semibold mb-2">Certificate issued on / Certificat délivré le:</p>
                        <p className="text-sm">{new Date().toLocaleDateString('en-GB')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-4">Medical Practitioner's Signature / Signature du Médecin:</p>
                        {validationStatus === 'validated' && documentSignatures.sickLeave ? (
                          <div className="mt-4">
                            <img
                              src={documentSignatures.sickLeave}
                              alt="Doctor's Signature"
                              className="ml-auto h-20 w-auto"
                              style={{ maxWidth: '300px' }}
                            />
                          </div>
                        ) : (
                          <div className="mb-2">
                            <p className="border-b-2 border-gray-400 w-64 mb-1"></p>
                          </div>
                        )}
                        <p className="font-semibold">{report.medicalReport.practitioner.name}</p>
                        <p className="text-sm text-gray-600">{report.medicalReport.practitioner.qualifications}</p>
                        <p className="text-sm text-gray-600">Registration: {report.medicalReport.practitioner.registrationNumber}</p>
                        <p className="text-sm text-gray-600 mt-2">Date: {new Date().toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Document Footer */}
                  <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                    <p>This certificate is issued for work absence purposes only and is valid for the duration specified above.</p>
                    <p className="mt-1">Ce certificat est délivré uniquement à des fins d'absence au travail et est valable pour la durée indiquée ci-dessus.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice">
          <div id="invoice-document" className="bg-white p-8 rounded-lg shadow print:shadow-none">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold mb-2">INVOICE</h1>
              <p className="text-lg">No.: {invoiceData.header.invoiceNumber}</p>
              <p className="text-sm text-gray-600">
                Consultation Date: {invoiceData.header.consultationDate} |
                Invoice Date: {invoiceData.header.invoiceDate}
              </p>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold mb-2">Service Provider</h3>
              <p className="font-bold">{invoiceData.provider.companyName}</p>
              <p className="text-sm">Private company incorporated under Mauritian law</p>
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div>Company Reg. No.: {invoiceData.provider.registrationNumber}</div>
                <div>VAT No.: {invoiceData.provider.vatNumber}</div>
                <div className="col-span-2">Registered Office: {invoiceData.provider.registeredOffice}</div>
                <div>Phone: {invoiceData.provider.phone}</div>
                <div>Email: {invoiceData.provider.email}</div>
                <div>Website: {invoiceData.provider.website}</div>
                <div className="col-span-2 font-medium">Trade Name: {invoiceData.provider.tradeName}</div>
              </div>
              <p className="text-sm mt-2 italic">
                Medical consultations provided by licensed physicians registered with the Medical Council of Mauritius
              </p>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-2">Patient Information</h3>
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div><strong>Name:</strong> {invoiceData.patient.name}</div>
                <div><strong>Email:</strong> {invoiceData.patient.email}</div>
                <div><strong>Phone Number:</strong> {invoiceData.patient.phone}</div>
                <div><strong>Tibok Patient ID:</strong> {invoiceData.patient.patientId}</div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Standard Chronic Disease Consultation Fee:</strong> MUR 950
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This is the standard rate for chronic disease consultations via Tibok.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-4">Service Details</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2">Description</th>
                    <th className="text-center py-2">Quantity</th>
                    <th className="text-right py-2">Unit Price (MUR)</th>
                    <th className="text-right py-2">Total (MUR)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.services.items.length > 0 ? (
                    invoiceData.services.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-2">{item.description}</td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">{item.unitPrice.toLocaleString()}</td>
                        <td className="text-right py-2 font-medium">{item.total.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500 italic">
                        No services added yet. Set consultation fee above to generate invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="text-right py-2">Subtotal (Excl. VAT):</td>
                    <td className="text-right py-2">MUR {invoiceData.services.subtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="text-right py-2">
                      VAT ({(invoiceData.services.vatRate * 100).toFixed(0)}%):
                    </td>
                    <td className="text-right py-2">
                      MUR {invoiceData.services.vatAmount.toLocaleString()}
                      {invoiceData.services.vatAmount === 0 && (
                        <span className="text-xs text-gray-600 block">
                          (Exempt - medical services)
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="font-bold text-lg">
                    <td colSpan={3} className="text-right py-2">Total Due:</td>
                    <td className="text-right py-2">MUR {invoiceData.services.totalDue.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mb-6 p-4 bg-teal-50 rounded-lg">
              <h3 className="font-bold mb-2">Payment Information</h3>
              {editMode && validationStatus !== 'validated' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Payment Method</Label>
                      <Select
                        value={invoiceData.payment.method}
                        onValueChange={(value) => {
                          setInvoiceData(prev => ({
                            ...prev,
                            payment: { ...prev.payment, method: value }
                          }))
                          setHasUnsavedChanges(true)
                        }}
                      >
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
                      <Select
                        value={invoiceData.payment.status}
                        onValueChange={(value) => {
                          setInvoiceData(prev => ({
                            ...prev,
                            payment: { ...prev.payment, status: value }
                          }))
                          setHasUnsavedChanges(true)
                        }}
                      >
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
                  <div><strong>Payment Method:</strong> {invoiceData.payment.method}</div>
                  <div><strong>Payment Received On:</strong> {invoiceData.payment.receivedDate || invoiceData.header.invoiceDate}</div>
                  <div className="col-span-2">
                    <strong>Status:</strong>
                    <Badge className={`ml-2 ${
                      invoiceData.payment.status === 'paid' ? 'bg-teal-100 text-teal-800' :
                      invoiceData.payment.status === 'pending' ? 'bg-cyan-100 text-cyan-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {invoiceData.payment.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Invoice
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="followup">
          <FollowUpPlanSection />
        </TabsContent>
        
        <TabsContent value="ai-assistant">
          <TibokMedicalAssistant
            reportData={{
              compteRendu: {
                patient: report.medicalReport?.patient || {},
                rapport: report.medicalReport?.clinicalEvaluation || {}
              },
              ordonnances: {
                medicaments: {
                  prescription: {
                    medicaments: report.medicationPrescription?.prescription?.medications || []
                  }
                },
                biologie: {
                  prescription: {
                    analyses: report.laboratoryTests?.prescription?.tests || {}
                  }
                },
                imagerie: {
                  prescription: {
                    examens: report.paraclinicalExams?.prescription?.exams || []
                  }
                }
              }
            }}
            onUpdateSection={(section, value) => {
              setReport(prev => {
                if (!prev) return prev
                return {
                  ...prev,
                  medicalReport: {
                    ...prev.medicalReport,
                    clinicalEvaluation: {
                      ...prev.medicalReport.clinicalEvaluation,
                      [section]: value
                    }
                  }
                }
              })
            }}
            onAddMedication={(medication) => {
              console.log('💊 CALLBACK onAddMedication called:', medication)
              if (validationStatus === 'validated') {
                console.log('⚠️ CALLBACK onAddMedication BLOCKED - document validated')
                return
              }
              
              const medicationWithDefaults = {
                name: medication.name || medication.nom || '',
                genericName: medication.generic_name || medication.denominationCommune || medication.dci || '',
                dosage: medication.dosage || '',
                form: medication.form || medication.forme || 'tablet',
                dosing: medication.dosing || medication.posologie || '',
                route: medication.route || medication.modeAdministration || medication.voieAdministration || 'Oral route',
                duration: medication.duration || medication.dureeTraitement || '7 days',
                quantity: medication.quantity || medication.quantite || '1 box',
                instructions: medication.instructions || '',
                indication: medication.indication || medication.justification || '',
                monitoring: medication.monitoring || medication.surveillanceParticuliere || '',
                nonSubstitutable: medication.nonSubstituable || false
              }
              
              setReport(prev => {
                if (!prev) return prev
                
                const newReport = JSON.parse(JSON.stringify(prev))
                
                // Ensure medicationPrescription structure exists
                if (!newReport.medicationPrescription) {
                  newReport.medicationPrescription = {
                    header: {
                      doctorName: prev.medicalReport?.practitioner?.name || '',
                      doctorQualification: prev.medicalReport?.practitioner?.qualification || '',
                      clinicAddress: prev.medicalReport?.practitioner?.address || '',
                      phoneNumber: prev.medicalReport?.practitioner?.phone || '',
                      registrationNumber: prev.medicalReport?.practitioner?.registrationNumber || '',
                      patientName: prev.medicalReport?.patient?.fullName || '',
                      patientAge: prev.medicalReport?.patient?.age || 0,
                      patientGender: prev.medicalReport?.patient?.gender || '',
                      date: new Date().toISOString().split('T')[0]
                    },
                    prescription: {
                      medications: []
                    }
                  }
                }
                
                if (!newReport.medicationPrescription.prescription) {
                  newReport.medicationPrescription.prescription = { medications: [] }
                }
                
                if (!newReport.medicationPrescription.prescription.medications) {
                  newReport.medicationPrescription.prescription.medications = []
                }
                
                // Add medication directly to the array
                newReport.medicationPrescription.prescription.medications.push(medicationWithDefaults)
                
                console.log('💊 Medication added directly:', medicationWithDefaults)
                return newReport
              })
            }}
            onUpdateMedication={(index, medication) => {
              setReport(prev => {
                if (!prev?.medicationPrescription?.prescription?.medications) return prev
                const newMedications = [...prev.medicationPrescription.prescription.medications]
                newMedications[index] = { ...newMedications[index], ...medication }
                return {
                  ...prev,
                  medicationPrescription: {
                    ...prev.medicationPrescription,
                    prescription: {
                      ...prev.medicationPrescription.prescription,
                      medications: newMedications
                    }
                  }
                }
              })
            }}
            onRemoveMedication={(index) => {
              setReport(prev => {
                if (!prev?.medicationPrescription?.prescription?.medications) return prev
                const newMedications = prev.medicationPrescription.prescription.medications.filter((_, i) => i !== index)
                return {
                  ...prev,
                  medicationPrescription: {
                    ...prev.medicationPrescription,
                    prescription: {
                      ...prev.medicationPrescription.prescription,
                      medications: newMedications
                    }
                  }
                }
              })
            }}
            onAddLabTest={(category, test) => {
              console.log('📋 CALLBACK onAddLabTest called:', {category, test})
              if (validationStatus === 'validated') {
                console.log('⚠️ CALLBACK onAddLabTest BLOCKED - document validated')
                return
              }
              
              const testWithDefaults = {
                name: test.name || test.nom || '',
                code: test.code || '',
                category: category,
                urgent: test.urgent || test.urgence || false,
                fasting: test.fasting || test.aJeun || false,
                specimenCollectionConditions: test.specimenCollectionConditions || test.conditionsPrelevement || '',
                clinicalIndication: test.clinicalIndication || test.motifClinique || test.indication || '',
                clinicalNotes: test.clinicalNotes || test.renseignementsCliniques || '',
                specimenType: test.specimenType || test.tubePrelevement || 'As per laboratory protocol',
                turnaroundTime: test.turnaroundTime || test.delaiResultat || 'Standard'
              }
              
              setReport(prev => {
                if (!prev) return null
                const newReport = JSON.parse(JSON.stringify(prev))
                
                // Initialize laboratoryTests section if needed
                if (!newReport.laboratoryTests) {
                  newReport.laboratoryTests = {
                    header: {
                      doctorName: prev.medicalReport?.practitioner?.name || '',
                      doctorQualification: prev.medicalReport?.practitioner?.qualification || '',
                      clinicAddress: prev.medicalReport?.practitioner?.address || '',
                      registrationNumber: prev.medicalReport?.practitioner?.registrationNumber || '',
                      patientName: prev.medicalReport?.patient?.fullName || '',
                      patientAge: prev.medicalReport?.patient?.age || 0,
                      patientGender: prev.medicalReport?.patient?.gender || '',
                      date: new Date().toISOString().split('T')[0]
                    },
                    prescription: {
                      clinicalIndication: '',
                      tests: {}
                    }
                  }
                }
                
                // Initialize category if needed
                if (!newReport.laboratoryTests.prescription.tests) {
                  newReport.laboratoryTests.prescription.tests = {}
                }
                if (!newReport.laboratoryTests.prescription.tests[category]) {
                  newReport.laboratoryTests.prescription.tests[category] = []
                }
                
                // Add complete test directly
                newReport.laboratoryTests.prescription.tests[category].push(testWithDefaults)
                
                console.log('✅ CALLBACK onAddLabTest - Test added to laboratoryTests.prescription.tests.' + category, testWithDefaults)
                return newReport
              })
              console.log('🎉 CALLBACK onAddLabTest - Complete!')
            }}
            onUpdateLabTest={(category, index, test) => {
              setReport(prev => {
                if (!prev?.laboratoryTests?.prescription?.tests?.[category]) return prev
                const newTests = [...prev.laboratoryTests.prescription.tests[category]]
                newTests[index] = { ...newTests[index], ...test }
                return {
                  ...prev,
                  laboratoryTests: {
                    ...prev.laboratoryTests,
                    prescription: {
                      ...prev.laboratoryTests.prescription,
                      tests: {
                        ...prev.laboratoryTests.prescription.tests,
                        [category]: newTests
                      }
                    }
                  }
                }
              })
            }}
            onRemoveLabTest={(category, index) => {
              setReport(prev => {
                if (!prev?.laboratoryTests?.prescription?.tests?.[category]) return prev
                const newTests = prev.laboratoryTests.prescription.tests[category].filter((_, i) => i !== index)
                return {
                  ...prev,
                  laboratoryTests: {
                    ...prev.laboratoryTests,
                    prescription: {
                      ...prev.laboratoryTests.prescription,
                      tests: {
                        ...prev.laboratoryTests.prescription.tests,
                        [category]: newTests
                      }
                    }
                  }
                }
              })
            }}
            onAddImaging={(exam) => {
              console.log('🖼️ CALLBACK onAddImaging called:', exam)
              if (validationStatus === 'validated') {
                console.log('⚠️ CALLBACK onAddImaging BLOCKED - document validated')
                return
              }
              
              const examWithDefaults = {
                type: exam.type || exam.modalite || '',
                modality: exam.modality || exam.modalite || exam.type || '',
                region: exam.region || exam.area || '',
                clinicalIndication: exam.clinicalIndication || exam.indicationClinique || exam.indication || '',
                urgent: exam.urgent || exam.urgence || false,
                contrast: exam.contrast || exam.contraste || false,
                instructions: exam.instructions || '',
                patientPreparation: exam.patientPreparation || exam.preparationPatient || '',
                turnaroundTime: exam.turnaroundTime || exam.delaiResultat || 'Standard',
                specificProtocol: exam.specificProtocol || exam.protocoleSpecifique || '',
                diagnosticQuestion: exam.diagnosticQuestion || exam.questionDiagnostique || ''
              }
              
              setReport(prev => {
                if (!prev) return null
                const newReport = JSON.parse(JSON.stringify(prev))
                
                // Initialize paraclinicalExams section if needed
                if (!newReport.paraclinicalExams) {
                  newReport.paraclinicalExams = {
                    header: {
                      doctorName: prev.medicalReport?.practitioner?.name || '',
                      doctorQualification: prev.medicalReport?.practitioner?.qualification || '',
                      clinicAddress: prev.medicalReport?.practitioner?.address || '',
                      registrationNumber: prev.medicalReport?.practitioner?.registrationNumber || '',
                      patientName: prev.medicalReport?.patient?.fullName || '',
                      patientAge: prev.medicalReport?.patient?.age || 0,
                      patientGender: prev.medicalReport?.patient?.gender || '',
                      date: new Date().toISOString().split('T')[0]
                    },
                    prescription: {
                      clinicalIndication: '',
                      exams: []
                    }
                  }
                }
                
                // Initialize exams array if needed
                if (!newReport.paraclinicalExams.prescription.exams) {
                  newReport.paraclinicalExams.prescription.exams = []
                }
                
                // Add complete exam directly
                newReport.paraclinicalExams.prescription.exams.push(examWithDefaults)
                
                console.log('✅ CALLBACK onAddImaging - Exam added to paraclinicalExams.prescription.exams', examWithDefaults)
                return newReport
              })
              console.log('🎉 CALLBACK onAddImaging - Complete!')
            }}
            onUpdateImaging={(index, exam) => {
              setReport(prev => {
                if (!prev?.paraclinicalExams?.prescription?.exams) return prev
                const newExams = [...prev.paraclinicalExams.prescription.exams]
                newExams[index] = { ...newExams[index], ...exam }
                return {
                  ...prev,
                  paraclinicalExams: {
                    ...prev.paraclinicalExams,
                    prescription: {
                      ...prev.paraclinicalExams.prescription,
                      exams: newExams
                    }
                  }
                }
              })
            }}
            onRemoveImaging={(index) => {
              setReport(prev => {
                if (!prev?.paraclinicalExams?.prescription?.exams) return prev
                const newExams = prev.paraclinicalExams.prescription.exams.filter((_, i) => i !== index)
                return {
                  ...prev,
                  paraclinicalExams: {
                    ...prev.paraclinicalExams,
                    prescription: {
                      ...prev.paraclinicalExams.prescription,
                      exams: newExams
                    }
                  }
                }
              })
            }}
          />
        </TabsContent>
      </Tabs>
      
      {/* Print View - All Sections */}
      <div className="hidden print:block">
        <MedicalReportSection />
        {report.medicationPrescription && (
          <div className="page-break-before mt-8">
            <MedicationPrescriptionSection />
          </div>
        )}
        {report.laboratoryTests && (
          <div className="page-break-before mt-8">
            <LaboratoryTestsSection />
          </div>
        )}
        {report.paraclinicalExams && (
          <div className="page-break-before mt-8">
            <ParaclinicalExamsSection />
          </div>
        )}
        {report.dietaryProtocol && (
          <div className="page-break-before mt-8">
            <DietaryProtocolSection />
          </div>
        )}
        {report.followUpPlan && (
          <div className="page-break-before mt-8">
            <FollowUpPlanSection />
          </div>
        )}
      </div>
    </div>
  )
}
