"use client"

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
  FileText, Download, Printer, CheckCircle, Loader2, Pill, TestTube, 
  Scan, AlertTriangle, Eye, EyeOff, Edit, Save, FileCheck, Plus, 
  Trash2, AlertCircle, Lock, Unlock, Calendar, User, Stethoscope,
  Activity, Utensils, ClipboardList, HeartPulse
} from "lucide-react"

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
      consultationPlatform: "Tibok Teleconsultation Platform"
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
  
  // ==================== DATA GENERATION ====================
  
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
          if (diagnosisData.mealPlan || diagnosisData.nutritionPlan) {
            const mealPlanData = diagnosisData.mealPlan || diagnosisData.nutritionPlan
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
                breakfast: mealPlanData.breakfast || [],
                lunch: mealPlanData.lunch || [],
                dinner: mealPlanData.dinner || [],
                snacks: mealPlanData.snacks || []
              },
              nutritionalGuidelines: {
                caloriesTarget: mealPlanData.caloriesTarget || mealPlanData.dailyCalories,
                macronutrients: mealPlanData.macronutrients || {},
                micronutrients: mealPlanData.micronutrients || [],
                hydration: mealPlanData.hydration || "8-10 glasses of water daily"
              },
              forbiddenFoods: mealPlanData.forbiddenFoods || mealPlanData.foodsToAvoid || [],
              recommendedFoods: mealPlanData.recommendedFoods || [],
              specialInstructions: mealPlanData.specialInstructions || [],
              followUpSchedule: mealPlanData.followUpSchedule || "Monthly nutritional assessment"
            }
          }
          
          // Extract follow-up plan
          if (diagnosisData.followUpPlan || diagnosisData.managementPlan) {
            const followUpData = diagnosisData.followUpPlan || diagnosisData.managementPlan
            initialReport.followUpPlan = {
              header: {
                title: "Chronic Disease Management & Follow-Up Plan",
                patientName: initialReport.medicalReport.patient.fullName,
                date: new Date().toISOString().split('T')[0]
              },
              shortTermGoals: followUpData.shortTermGoals || [],
              longTermGoals: followUpData.longTermGoals || [],
              monitoringSchedule: {
                nextAppointment: followUpData.nextAppointment || "",
                followUpFrequency: followUpData.followUpFrequency || "Monthly",
                monitoringParameters: followUpData.monitoringParameters || []
              },
              lifestyleModifications: {
                physicalActivity: followUpData.physicalActivity || followUpData.exercise || [],
                dietaryChanges: followUpData.dietaryChanges || [],
                stressManagement: followUpData.stressManagement || [],
                sleepHygiene: followUpData.sleepHygiene || [],
                substanceUse: followUpData.substanceUse || []
              },
              educationalResources: followUpData.educationalResources || [],
              emergencyProtocol: followUpData.emergencyProtocol || {
                warningSigns: [],
                emergencyContacts: [],
                actionSteps: []
              },
              specialInstructions: followUpData.specialInstructions || []
            }
          }
        }
        
        setReport(initialReport)
        
        // Now fetch the three API responses in parallel
        const [reportResponse, prescriptionResponse, examensResponse] = await Promise.all([
          fetch("/api/chronic-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientData, clinicalData, questionsData, diagnosisData })
          }),
          fetch("/api/chronic-prescription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientData, diagnosisData })
          }),
          fetch("/api/chronic-examens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientData, diagnosisData })
          })
        ])
        
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
        
        // Update report with API responses
        setReport(prev => {
          if (!prev) return null
          
          const updatedReport = { ...prev }
          
          // Update narrative from chronic-report API
          if (reportData.report) {
            updatedReport.medicalReport.narrative = reportData.report
            updatedReport.medicalReport.metadata.wordCount = reportData.report.split(/\s+/).length
          }
          
          // Update medication prescription from chronic-prescription API
          if (prescriptionData.ordonnance || prescriptionData.prescription) {
            const presData = prescriptionData.ordonnance || prescriptionData.prescription
            updatedReport.medicationPrescription = {
              header: prev.medicalReport.practitioner,
              patient: prev.medicalReport.patient,
              prescription: {
                datePrescription: new Date().toISOString().split('T')[0],
                medications: sanitizeMedications(presData.medicaments || presData.medications || []),
                specialInstructions: presData.instructionsSpeciales || presData.specialInstructions || [],
                validity: "3 months unless otherwise specified"
              },
              authentication: {
                signature: "Medical Practitioner's Signature",
                practitionerName: prev.medicalReport.practitioner.name,
                registrationNumber: prev.medicalReport.practitioner.registrationNumber,
                date: new Date().toISOString().split('T')[0]
              }
            }
          }
          
          // Update laboratory tests and paraclinical exams from chronic-examens API
          if (examensData.examens || examensData.exams) {
            const examData = examensData.examens || examensData.exams
            
            // Laboratory tests
            if (examData.biologie || examData.laboratoryTests) {
              const bioData = examData.biologie || examData.laboratoryTests
              updatedReport.laboratoryTests = {
                header: prev.medicalReport.practitioner,
                patient: prev.medicalReport.patient,
                prescription: {
                  datePrescription: new Date().toISOString().split('T')[0],
                  clinicalIndication: bioData.indicationClinique || bioData.clinicalIndication || "",
                  tests: bioData.analyses || bioData.tests || {},
                  specialInstructions: bioData.instructionsSpeciales || [],
                  recommendedLaboratory: bioData.laboratoireRecommande || ""
                },
                authentication: {
                  signature: "Medical Practitioner's Signature",
                  practitionerName: prev.medicalReport.practitioner.name,
                  registrationNumber: prev.medicalReport.practitioner.registrationNumber,
                  date: new Date().toISOString().split('T')[0]
                }
              }
            }
            
            // Paraclinical exams (imaging, etc.)
            if (examData.imagerie || examData.paraclinicalExams || examData.imaging) {
              const imagData = examData.imagerie || examData.paraclinicalExams || examData.imaging
              updatedReport.paraclinicalExams = {
                header: prev.medicalReport.practitioner,
                patient: prev.medicalReport.patient,
                prescription: {
                  datePrescription: new Date().toISOString().split('T')[0],
                  exams: imagData.examens || imagData.exams || [],
                  specialInstructions: imagData.instructionsSpeciales || []
                },
                authentication: {
                  signature: "Medical Practitioner's Signature",
                  practitionerName: prev.medicalReport.practitioner.name,
                  registrationNumber: prev.medicalReport.practitioner.registrationNumber,
                  date: new Date().toISOString().split('T')[0]
                }
              }
            }
          }
          
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
    
    if (patientData && diagnosisData) {
      generateReport()
    }
  }, [patientData, clinicalData, questionsData, diagnosisData])
  
  // ==================== EVENT HANDLERS ====================
  
  const handlePrint = useCallback(() => {
    window.print()
  }, [])
  
  const handleValidation = useCallback(async () => {
    if (validationStatus === 'validated') return
    
    setSaving(true)
    try {
      // Here you would typically save to database
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
      
      toast({
        title: "Document Validated",
        description: "The chronic disease report has been validated and signed.",
      })
      
      if (onComplete) {
        onComplete()
      }
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
  }, [validationStatus, onComplete])
  
  const exportToPDF = useCallback((elementId: string, filename: string) => {
    // Simple print-based PDF export
    window.print()
  }, [])
  
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
        
        {/* Practitioner Information */}
        <div className="mb-6 p-4 bg-blue-50 rounded">
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
        
        {/* Patient Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Name:</strong> {medicalReport.patient.fullName}</div>
            <div><strong>Age:</strong> {medicalReport.patient.age}</div>
            <div><strong>Gender:</strong> {medicalReport.patient.gender}</div>
            <div><strong>Date of Birth:</strong> {medicalReport.patient.dateOfBirth}</div>
            {medicalReport.patient.nationalId && (
              <div><strong>NID:</strong> {medicalReport.patient.nationalId}</div>
            )}
            <div><strong>Phone:</strong> {medicalReport.patient.phone}</div>
            <div className="col-span-2"><strong>Address:</strong> {medicalReport.patient.address}</div>
          </div>
        </div>
        
        {/* Vital Signs */}
        {(medicalReport.patient.bloodPressureSystolic || medicalReport.patient.temperature || medicalReport.patient.bloodGlucose) && (
          <div className="mb-6 p-4 bg-green-50 rounded">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vital Signs
            </h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {medicalReport.patient.bloodPressureSystolic && (
                <div>
                  <strong>Blood Pressure:</strong> {medicalReport.patient.bloodPressureSystolic}/{medicalReport.patient.bloodPressureDiastolic} mmHg
                </div>
              )}
              {medicalReport.patient.temperature && (
                <div><strong>Temperature:</strong> {medicalReport.patient.temperature}°C</div>
              )}
              {medicalReport.patient.bloodGlucose && (
                <div><strong>Blood Glucose:</strong> {medicalReport.patient.bloodGlucose} mmol/L</div>
              )}
              {medicalReport.patient.weight && (
                <div><strong>Weight:</strong> {medicalReport.patient.weight} kg</div>
              )}
              {medicalReport.patient.height && (
                <div><strong>Height:</strong> {medicalReport.patient.height} cm</div>
              )}
            </div>
          </div>
        )}
        
        {/* Chronic Disease Assessment */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            Chronic Disease Assessment
          </h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm text-gray-700">Primary Diagnosis:</h4>
              <p className="text-base">{medicalReport.chronicDiseaseAssessment.primaryDiagnosis}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-700">Disease Category:</h4>
              <p className="text-base">{medicalReport.chronicDiseaseAssessment.diseaseCategory}</p>
            </div>
            {medicalReport.chronicDiseaseAssessment.diseaseStage && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Disease Stage:</h4>
                <p className="text-base">{medicalReport.chronicDiseaseAssessment.diseaseStage}</p>
              </div>
            )}
            {medicalReport.chronicDiseaseAssessment.comorbidities && medicalReport.chronicDiseaseAssessment.comorbidities.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Comorbidities:</h4>
                <ul className="list-disc list-inside text-base">
                  {medicalReport.chronicDiseaseAssessment.comorbidities.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {medicalReport.chronicDiseaseAssessment.riskFactors && medicalReport.chronicDiseaseAssessment.riskFactors.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Risk Factors:</h4>
                <ul className="list-disc list-inside text-base">
                  {medicalReport.chronicDiseaseAssessment.riskFactors.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* Clinical Evaluation */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3">Clinical Evaluation</h3>
          <div className="space-y-4">
            {medicalReport.clinicalEvaluation.chiefComplaint && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Chief Complaint:</h4>
                <p className="text-base whitespace-pre-wrap">{medicalReport.clinicalEvaluation.chiefComplaint}</p>
              </div>
            )}
            {medicalReport.clinicalEvaluation.historyOfPresentIllness && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">History of Present Illness:</h4>
                <p className="text-base whitespace-pre-wrap">{medicalReport.clinicalEvaluation.historyOfPresentIllness}</p>
              </div>
            )}
            {medicalReport.clinicalEvaluation.physicalExamination && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Physical Examination:</h4>
                <p className="text-base whitespace-pre-wrap">{medicalReport.clinicalEvaluation.physicalExamination}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Narrative Report from API */}
        {medicalReport.narrative && (
          <div className="mb-6 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-lg mb-3">Comprehensive Medical Report</h3>
            <div className="text-base whitespace-pre-wrap leading-relaxed">
              {medicalReport.narrative}
            </div>
          </div>
        )}
        
        {/* Diagnostic Summary */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3">Diagnostic Summary & Management Goals</h3>
          <div className="space-y-3">
            {medicalReport.diagnosticSummary.diagnosticConclusion && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Diagnostic Conclusion:</h4>
                <p className="text-base whitespace-pre-wrap">{medicalReport.diagnosticSummary.diagnosticConclusion}</p>
              </div>
            )}
            {medicalReport.diagnosticSummary.prognosticAssessment && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Prognostic Assessment:</h4>
                <p className="text-base whitespace-pre-wrap">{medicalReport.diagnosticSummary.prognosticAssessment}</p>
              </div>
            )}
            {medicalReport.diagnosticSummary.diseaseManagementGoals && medicalReport.diagnosticSummary.diseaseManagementGoals.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Disease Management Goals:</h4>
                <ul className="list-disc list-inside text-base">
                  {medicalReport.diagnosticSummary.diseaseManagementGoals.map((goal, idx) => (
                    <li key={idx}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{medicalReport.practitioner.name}</p>
            <p className="text-sm text-gray-600">{medicalReport.practitioner.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {medicalReport.practitioner.registrationNumber}</p>
            <div className="mt-6">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Date: {medicalReport.header.reportDate}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
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
    
    const { medicationPrescription } = report
    const medications = medicationPrescription.prescription.medications || []
    
    return (
      <div id="medication-prescription-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-green-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">MEDICATION PRESCRIPTION</h2>
              <p className="text-gray-600 mt-1">Compliant with Medical Council & Pharmacy Act of Mauritius</p>
              <p className="text-sm text-gray-500 mt-1">
                {medications.length} medication{medications.length !== 1 ? 's' : ''} prescribed
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
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
              <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="font-bold text-lg">
                  {index + 1}. {med.nom}
                  {med.nonSubstituable && (
                    <Badge className="ml-2 bg-red-100 text-red-800">Non-substitutable</Badge>
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
                  <p className="mt-1 text-sm text-orange-600">
                    <span className="font-medium">⚠️ Monitoring:</span> {med.surveillanceParticuliere}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No medications prescribed</p>
            </div>
          )}
        </div>
        
        {/* Special Instructions */}
        {medicationPrescription.prescription.specialInstructions && medicationPrescription.prescription.specialInstructions.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 rounded">
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
            <div className="mt-6">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Official Medical Stamp</p>
              <p className="text-sm">Date: {medicationPrescription.authentication.date}</p>
            </div>
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
    
    const { laboratoryTests } = report
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
    
    return (
      <div id="laboratory-tests-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-purple-600 pb-4 mb-6">
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
        {laboratoryTests.prescription.clinicalIndication && (
          <div className="mb-6 p-4 bg-purple-50 rounded">
            <h3 className="font-bold mb-2">Clinical Indication:</h3>
            <p className="text-sm">{laboratoryTests.prescription.clinicalIndication}</p>
          </div>
        )}
        
        {/* Tests by Category */}
        {hasTests ? (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryTests = tests[category.key]
              if (!categoryTests || categoryTests.length === 0) return null
              
              return (
                <div key={category.key} className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3 text-purple-700">{category.label}</h3>
                  <div className="space-y-3">
                    {categoryTests.map((test: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-purple-400 pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div>
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
                          </div>
                          <div className="flex gap-2">
                            {test.urgence && (
                              <Badge className="bg-red-100 text-red-800">URGENT</Badge>
                            )}
                            {test.aJeun && (
                              <Badge className="bg-orange-100 text-orange-800">FASTING</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
        
        {/* Special Instructions */}
        {laboratoryTests.prescription.specialInstructions && laboratoryTests.prescription.specialInstructions.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 rounded">
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
            <div className="mt-6">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Date: {laboratoryTests.authentication.date}</p>
            </div>
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
    
    const { paraclinicalExams } = report
    const exams = paraclinicalExams.prescription.exams || []
    
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
                  <div>
                    <div className="font-bold text-lg">
                      {index + 1}. {exam.type}
                      {exam.urgency && (
                        <Badge className="ml-2 bg-red-100 text-red-800">URGENT</Badge>
                      )}
                      {exam.contrast && (
                        <Badge className="ml-2 bg-orange-100 text-orange-800">WITH CONTRAST</Badge>
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
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Scan className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No paraclinical examinations ordered</p>
            </div>
          )}
        </div>
        
        {/* Special Instructions */}
        {paraclinicalExams.prescription.specialInstructions && paraclinicalExams.prescription.specialInstructions.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 rounded">
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
            <div className="mt-6">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Date: {paraclinicalExams.authentication.date}</p>
            </div>
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
            <p className="text-gray-600">No dietary protocol available</p>
          </CardContent>
        </Card>
      )
    }
    
    const { dietaryProtocol } = report
    
    return (
      <div id="dietary-protocol-section" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-orange-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Utensils className="h-6 w-6" />
                {dietaryProtocol.header.title}
              </h2>
              <p className="text-gray-600 mt-1">Personalized Nutrition Plan</p>
              <p className="text-sm text-gray-500 mt-1">Patient: {dietaryProtocol.header.patientName}</p>
            </div>
            <div className="flex gap-2 print:hidden">
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
          <div className="mb-6 p-4 bg-orange-50 rounded">
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
        
        {/* Meal Plans */}
        {dietaryProtocol.mealPlans && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">Meal Plans</h3>
            <div className="space-y-4">
              {dietaryProtocol.mealPlans.breakfast && dietaryProtocol.mealPlans.breakfast.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Breakfast Options:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {dietaryProtocol.mealPlans.breakfast.map((item, idx) => (
                      <li key={idx}>{typeof item === 'string' ? item : item.description || item.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {dietaryProtocol.mealPlans.lunch && dietaryProtocol.mealPlans.lunch.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Lunch Options:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {dietaryProtocol.mealPlans.lunch.map((item, idx) => (
                      <li key={idx}>{typeof item === 'string' ? item : item.description || item.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {dietaryProtocol.mealPlans.dinner && dietaryProtocol.mealPlans.dinner.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Dinner Options:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {dietaryProtocol.mealPlans.dinner.map((item, idx) => (
                      <li key={idx}>{typeof item === 'string' ? item : item.description || item.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {dietaryProtocol.mealPlans.snacks && dietaryProtocol.mealPlans.snacks.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Snack Options:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {dietaryProtocol.mealPlans.snacks.map((item, idx) => (
                      <li key={idx}>{typeof item === 'string' ? item : item.description || item.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Foods to Avoid & Recommended */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {dietaryProtocol.forbiddenFoods && dietaryProtocol.forbiddenFoods.length > 0 && (
            <div className="p-4 bg-red-50 rounded">
              <h4 className="font-semibold mb-2 text-red-700">Foods to Avoid:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {dietaryProtocol.forbiddenFoods.map((food, idx) => (
                  <li key={idx}>{food}</li>
                ))}
              </ul>
            </div>
          )}
          {dietaryProtocol.recommendedFoods && dietaryProtocol.recommendedFoods.length > 0 && (
            <div className="p-4 bg-green-50 rounded">
              <h4 className="font-semibold mb-2 text-green-700">Recommended Foods:</h4>
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
          <div className="p-4 bg-yellow-50 rounded mb-6">
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
            <div className="mt-6">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Date: {dietaryProtocol.header.date}</p>
            </div>
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
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-6 w-6" />
                {followUpPlan.header.title}
              </h2>
              <p className="text-gray-600 mt-1">Comprehensive Care & Monitoring Strategy</p>
              <p className="text-sm text-gray-500 mt-1">Patient: {followUpPlan.header.patientName}</p>
            </div>
            <div className="flex gap-2 print:hidden">
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
        </div>
        
        {/* Treatment Goals */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {followUpPlan.shortTermGoals && followUpPlan.shortTermGoals.length > 0 && (
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Short-Term Goals (0-3 months)
              </h3>
              <div className="space-y-3">
                {followUpPlan.shortTermGoals.map((goal, idx) => (
                  <div key={idx} className="border-l-4 border-green-500 pl-3">
                    <p className="font-semibold text-sm">{goal.goal}</p>
                    <p className="text-xs text-gray-600">Timeline: {goal.timeline}</p>
                    {goal.metrics && goal.metrics.length > 0 && (
                      <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                        {goal.metrics.map((metric, midx) => (
                          <li key={midx}>{metric}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {followUpPlan.longTermGoals && followUpPlan.longTermGoals.length > 0 && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Long-Term Goals (3-12 months)
              </h3>
              <div className="space-y-3">
                {followUpPlan.longTermGoals.map((goal, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-3">
                    <p className="font-semibold text-sm">{goal.goal}</p>
                    <p className="text-xs text-gray-600">Timeline: {goal.timeline}</p>
                    {goal.metrics && goal.metrics.length > 0 && (
                      <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                        {goal.metrics.map((metric, midx) => (
                          <li key={midx}>{metric}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Monitoring Schedule */}
        {followUpPlan.monitoringSchedule && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <h3 className="font-bold mb-3">Monitoring Schedule</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {followUpPlan.monitoringSchedule.nextAppointment && (
                <div>
                  <strong>Next Appointment:</strong> {followUpPlan.monitoringSchedule.nextAppointment}
                </div>
              )}
              {followUpPlan.monitoringSchedule.followUpFrequency && (
                <div>
                  <strong>Follow-up Frequency:</strong> {followUpPlan.monitoringSchedule.followUpFrequency}
                </div>
              )}
            </div>
            {followUpPlan.monitoringSchedule.monitoringParameters && followUpPlan.monitoringSchedule.monitoringParameters.length > 0 && (
              <div className="mt-3">
                <strong className="text-sm">Parameters to Monitor:</strong>
                <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                  {followUpPlan.monitoringSchedule.monitoringParameters.map((param, idx) => (
                    <li key={idx}>{param}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Lifestyle Modifications */}
        {followUpPlan.lifestyleModifications && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">Lifestyle Modifications</h3>
            <div className="grid grid-cols-2 gap-4">
              {followUpPlan.lifestyleModifications.physicalActivity && followUpPlan.lifestyleModifications.physicalActivity.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2 text-sm">Physical Activity:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {followUpPlan.lifestyleModifications.physicalActivity.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {followUpPlan.lifestyleModifications.dietaryChanges && followUpPlan.lifestyleModifications.dietaryChanges.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2 text-sm">Dietary Changes:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {followUpPlan.lifestyleModifications.dietaryChanges.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {followUpPlan.lifestyleModifications.stressManagement && followUpPlan.lifestyleModifications.stressManagement.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2 text-sm">Stress Management:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {followUpPlan.lifestyleModifications.stressManagement.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {followUpPlan.lifestyleModifications.sleepHygiene && followUpPlan.lifestyleModifications.sleepHygiene.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2 text-sm">Sleep Hygiene:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {followUpPlan.lifestyleModifications.sleepHygiene.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Emergency Protocol */}
        {followUpPlan.emergencyProtocol && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border-2 border-red-200">
            <h3 className="font-bold mb-3 text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Emergency Protocol
            </h3>
            {followUpPlan.emergencyProtocol.warningSigns && followUpPlan.emergencyProtocol.warningSigns.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold text-sm">Warning Signs:</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {followUpPlan.emergencyProtocol.warningSigns.map((sign, idx) => (
                    <li key={idx}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}
            {followUpPlan.emergencyProtocol.actionSteps && followUpPlan.emergencyProtocol.actionSteps.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold text-sm">Action Steps:</h4>
                <ol className="list-decimal list-inside text-sm space-y-1">
                  {followUpPlan.emergencyProtocol.actionSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            {followUpPlan.emergencyProtocol.emergencyContacts && followUpPlan.emergencyProtocol.emergencyContacts.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm">Emergency Contacts:</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {followUpPlan.emergencyProtocol.emergencyContacts.map((contact, idx) => (
                    <li key={idx}>{contact}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Educational Resources */}
        {followUpPlan.educationalResources && followUpPlan.educationalResources.length > 0 && (
          <div className="p-4 bg-yellow-50 rounded mb-6">
            <h4 className="font-semibold mb-2">Educational Resources:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {followUpPlan.educationalResources.map((resource, idx) => (
                <li key={idx}>{resource}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Special Instructions */}
        {followUpPlan.specialInstructions && followUpPlan.specialInstructions.length > 0 && (
          <div className="p-4 bg-blue-50 rounded">
            <h4 className="font-semibold mb-2">Special Instructions:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {followUpPlan.specialInstructions.map((instruction, idx) => (
                <li key={idx}>{instruction}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{report.medicalReport.practitioner.name}</p>
            <p className="text-sm text-gray-600">{report.medicalReport.practitioner.qualifications}</p>
            <p className="text-sm text-gray-600">Medical Council Reg: {report.medicalReport.practitioner.registrationNumber}</p>
            <div className="mt-6">
              <p className="text-sm">_______________________________</p>
              <p className="text-sm">Medical Practitioner's Signature</p>
              <p className="text-sm">Date: {followUpPlan.header.date}</p>
            </div>
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
            <div className="p-4 bg-green-50 rounded">
              <Pill className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{medicationCount}</p>
              <p className="text-sm text-gray-600">Medications</p>
            </div>
            <div className="p-4 bg-purple-50 rounded">
              <TestTube className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{labTestsCount}</p>
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
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="followup">
            <ClipboardList className="h-4 w-4 mr-2" />
            Follow-Up
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
        
        <TabsContent value="followup">
          <FollowUpPlanSection />
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
