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
  
  // Dietary on-demand generation state
  const [dietaryLoading, setDietaryLoading] = useState(false)
  const [dietaryError, setDietaryError] = useState<string | null>(null)
  const [detailedDietaryGenerated, setDetailedDietaryGenerated] = useState(false)
  
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
              diagnosisData 
            })
          }),
          fetch("/api/chronic-prescription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              patientData: normalizedPatientData, 
              clinicalData,
              diagnosisData 
            })
          }),
          fetch("/api/chronic-examens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              patientData: normalizedPatientData, 
              clinicalData,
              diagnosisData 
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
            // Extract the narrative text from the report structure
            const narrativeText = reportData.report.narrativeReport?.fullText || 
                                 reportData.report.narrativeReport || 
                                 (typeof reportData.report === 'string' ? reportData.report : JSON.stringify(reportData.report, null, 2))
            
            updatedReport.medicalReport.narrative = narrativeText
            updatedReport.medicalReport.metadata.wordCount = typeof narrativeText === 'string' 
              ? narrativeText.split(/\s+/).length 
              : 0
          }
          
          // Update medication prescription from chronic-prescription API
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
  
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) {
      toast({
        title: "No Changes",
        description: "There are no unsaved changes to save.",
      })
      return
    }
    
    setSaving(true)
    try {
      // Validate report data before saving
      const validationErrors: string[] = []
      
      // Validate medical report
      if (!report.medicalReport.narrative || report.medicalReport.narrative.trim() === '') {
        validationErrors.push("Medical report narrative cannot be empty")
      }
      
      // Validate medications
      if (report.medicationPrescription) {
        report.medicationPrescription.prescription.medications.forEach((med, index) => {
          if (!med.nom || med.nom.trim() === '') {
            validationErrors.push(`Medication ${index + 1}: Brand name is required`)
          }
          if (!med.posologie || med.posologie.trim() === '') {
            validationErrors.push(`Medication ${index + 1}: Frequency is required`)
          }
          if (!med.dureeTraitement || med.dureeTraitement.trim() === '') {
            validationErrors.push(`Medication ${index + 1}: Duration is required`)
          }
        })
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
      
      // Here you would typically save to database/backend
      // For now, we'll simulate a save operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Save to sessionStorage for persistence
      sessionStorage.setItem('chronicDiseaseReport', JSON.stringify(report))
      
      setHasUnsavedChanges(false)
      toast({
        title: "Changes Saved",
        description: "All modifications have been saved successfully.",
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
  }, [hasUnsavedChanges, report])
  
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
          diagnosisData
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
          <div className="mb-6 p-4 bg-teal-50 rounded">
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
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              Comprehensive Medical Report
              {editMode && <Badge variant="outline">Editable</Badge>}
            </h3>
            {editMode ? (
              <Textarea
                value={medicalReport.narrative}
                onChange={(e) => {
                  setReport(prev => {
                    if (!prev) return null
                    return {
                      ...prev,
                      medicalReport: {
                        ...prev.medicalReport,
                        narrative: e.target.value
                      }
                    }
                  })
                  setHasUnsavedChanges(true)
                }}
                className="min-h-[400px] text-base font-mono"
                placeholder="Enter comprehensive medical report..."
              />
            ) : (
              <div className="text-base whitespace-pre-wrap leading-relaxed">
                {medicalReport.narrative}
              </div>
            )}
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
    
    const handleAddMedication = () => {
      setReport(prev => {
        if (!prev || !prev.medicationPrescription) return prev
        return {
          ...prev,
          medicationPrescription: {
            ...prev.medicationPrescription,
            prescription: {
              ...prev.medicationPrescription.prescription,
              medications: [
                ...prev.medicationPrescription.prescription.medications,
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
        }
      })
      setHasUnsavedChanges(true)
    }
    
    const handleRemoveMedication = (index: number) => {
      setReport(prev => {
        if (!prev || !prev.medicationPrescription) return prev
        return {
          ...prev,
          medicationPrescription: {
            ...prev.medicationPrescription,
            prescription: {
              ...prev.medicationPrescription.prescription,
              medications: prev.medicationPrescription.prescription.medications.filter((_, i) => i !== index)
            }
          }
        }
      })
      setHasUnsavedChanges(true)
    }
    
    const handleUpdateMedication = (index: number, field: string, value: any) => {
      setReport(prev => {
        if (!prev || !prev.medicationPrescription) return prev
        const updatedMeds = [...prev.medicationPrescription.prescription.medications]
        updatedMeds[index] = { ...updatedMeds[index], [field]: value }
        return {
          ...prev,
          medicationPrescription: {
            ...prev.medicationPrescription,
            prescription: {
              ...prev.medicationPrescription.prescription,
              medications: updatedMeds
            }
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

    const handleLabTestEdit = (categoryKey: string, testIdx: number, field: string, value: any) => {
      const updatedReport = { ...report }
      updatedReport.laboratoryTests.prescription.tests[categoryKey][testIdx][field] = value
      setReport(updatedReport)
      setHasUnsavedChanges(true)
    }

    const handleDeleteLabTest = (categoryKey: string, testIdx: number) => {
      if (confirm('Delete this laboratory test?')) {
        const updatedReport = { ...report }
        updatedReport.laboratoryTests.prescription.tests[categoryKey].splice(testIdx, 1)
        setReport(updatedReport)
        setHasUnsavedChanges(true)
      }
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
              value={laboratoryTests.prescription.clinicalIndication || ''}
              onChange={(e) => {
                const updatedReport = { ...report }
                updatedReport.laboratoryTests.prescription.clinicalIndication = e.target.value
                setReport(updatedReport)
                setHasUnsavedChanges(true)
              }}
              className="text-sm"
              rows={3}
            />
          ) : (
            <p className="text-sm">{laboratoryTests.prescription.clinicalIndication}</p>
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

    const handleParaclinicalEdit = (examIdx: number, field: string, value: any) => {
      const updatedReport = { ...report }
      updatedReport.paraclinicalExams.prescription.exams[examIdx][field] = value
      setReport(updatedReport)
      setHasUnsavedChanges(true)
    }

    const handleDeleteParaclinicalExam = (examIdx: number) => {
      if (confirm('Delete this paraclinical examination?')) {
        const updatedReport = { ...report }
        updatedReport.paraclinicalExams.prescription.exams.splice(examIdx, 1)
        setReport(updatedReport)
        setHasUnsavedChanges(true)
      }
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
        
        {/* Patient Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Patient:</strong> {report.medicalReport.patient.fullName}</div>
            <div><strong>Date:</strong> {dietaryProtocol.header.date}</div>
            <div><strong>Age:</strong> {report.medicalReport.patient.age}</div>
            <div><strong>Gender:</strong> {report.medicalReport.patient.gender}</div>
            {report.medicalReport.patient.nationalId && (
              <div><strong>National ID:</strong> {report.medicalReport.patient.nationalId}</div>
            )}
            <div><strong>Address:</strong> {report.medicalReport.patient.address}</div>
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
              <div className="mb-2">
                <p className="border-b-2 border-gray-400 w-64 mb-1"></p>
              </div>
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
