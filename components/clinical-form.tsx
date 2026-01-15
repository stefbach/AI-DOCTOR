"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
 ArrowLeft,
 ArrowRight,
 Stethoscope,
 Thermometer,
 Activity,
 FileText,
 Clock,
 Heart,
 Search,
 XCircle,
 CheckCircle,
 AlertCircle,
 FlaskConical,
 ImageIcon,
 Download,
 Loader2,
 Info
} from "lucide-react"
import { useTibokPatientData } from "@/hooks/use-tibok-patient-data"
import { getTranslation, Language } from "@/lib/translations"
import { VoiceDictationButton } from "@/components/voice-dictation-button"

// ==================== INTERFACES & TYPES ====================
interface VitalSigns {
 temperature: string
 bloodPressureSystolic: string
 bloodPressureDiastolic: string
 bloodGlucose: string // Test de glycémie en g/L (optionnel)
}

interface WorkplaceIncident {
 illnessAtWork: boolean    // Patient got sick at workplace
 accidentAtWork: boolean   // Patient had accident/incident at workplace
}

interface ClinicalData {
 chiefComplaint: string
 diseaseHistory: string
 symptomDuration: string
 symptoms: string[]
 painScale: string
 vitalSigns: VitalSigns
 workplaceIncident: WorkplaceIncident
}

interface ClinicalFormProps {
 data?: Partial<ClinicalData>
 patientData?: any
 onDataChange: (data: ClinicalData) => void
 onNext: () => void
 onPrevious: () => void
 language?: Language
 consultationId?: string | null
}

interface ValidationErrors {
 [key: string]: string
}

// ==================== CONSTANTS ====================
const INITIAL_CLINICAL_DATA: ClinicalData = {
 chiefComplaint: "",
 diseaseHistory: "",
 symptomDuration: "",
 symptoms: [],
 painScale: "0",
 vitalSigns: {
 temperature: "",
 bloodPressureSystolic: "",
 bloodPressureDiastolic: "",
 bloodGlucose: "" // Test de glycémie optionnel
 },
 workplaceIncident: {
 illnessAtWork: false,
 accidentAtWork: false
 }
}

const PAIN_SCALE_LABELS = {
 0: { label: "No pain", color: "bg-teal-50 border-teal-200 text-teal-800" },
 1: { label: "Mild pain", color: "bg-teal-50 border-teal-200 text-teal-800" },
 2: { label: "Mild pain", color: "bg-teal-50 border-teal-200 text-teal-800" },
 3: { label: "Mild pain", color: "bg-teal-50 border-teal-200 text-teal-800" },
 4: { label: "Moderate pain", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
 5: { label: "Moderate pain", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
 6: { label: "Moderate pain", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
 7: { label: "Severe pain", color: "bg-blue-50 border-blue-200 text-blue-800" },
 8: { label: "Severe pain", color: "bg-blue-50 border-blue-200 text-blue-800" },
 9: { label: "Very severe pain", color: "bg-blue-100 border-blue-300 text-blue-900" },
 10: { label: "Unbearable pain", color: "bg-blue-100 border-blue-300 text-blue-900" }
}

const SECTIONS = [
 { id: "complaint", titleKey: 'clinicalForm.sections.complaint', icon: FileText },
 { id: "history", titleKey: 'clinicalForm.sections.history', icon: Heart },
 { id: "duration", titleKey: 'clinicalForm.sections.duration', icon: Clock },
 { id: "symptoms", titleKey: 'clinicalForm.sections.symptoms', icon: Activity },
 { id: "vitals", titleKey: 'clinicalForm.sections.vitals', icon: Stethoscope },
 { id: "workplace", titleKey: 'clinicalForm.sections.workplace', icon: AlertCircle },
]

// ==================== HELPER FUNCTIONS ====================
const mapSymptomToCommonStatic = (symptom: string, commonSymptoms: string[]): string => {
 console.log(' Mapping symptom:', symptom)
 
 const matchedSymptom = commonSymptoms.find(commonSymptom => 
 commonSymptom.toLowerCase().trim() === symptom.toLowerCase().trim()
 )
 
 if (matchedSymptom) {
 console.log('✅ Symptom matched:', symptom, '→', matchedSymptom)
 return matchedSymptom
 } else {
 console.warn('⚠️ Symptom not found, keeping original:', symptom)
 return symptom
 }
}

const validateTemperatureValue = (temp: any): string => {
 if (temp === null || temp === undefined || temp === '') {
 return ''
 }
 
 const tempNum = parseFloat(String(temp))
 
 // Check for unrealistic values (likely data error)
 if (isNaN(tempNum) || tempNum < 30 || tempNum > 45) {
 console.warn('⚠️ Invalid temperature value:', temp, '- resetting to empty')
 return ''
 }
 
 return String(tempNum)
}

// ==================== MAIN COMPONENT ====================
export default function ModernClinicalForm({ 
 data, 
 patientData, 
 onDataChange, 
 onNext, 
 onPrevious,
 language = 'en',
 consultationId
}: ClinicalFormProps) {
 // ========== Hooks ==========
 const { patientData: tibokPatient, isFromTibok } = useTibokPatientData()
 const t = useCallback((key: string) => getTranslation(key, language), [language])
 
 // CRITICAL FIX: Track if component has mounted to prevent initial render issues
 const isMounted = useRef(false)
 const hasLoadedTibokData = useRef(false)
 
 // ========== States ==========
 // Initialize with TIBOK data if available immediately
 const getInitialData = useCallback((): ClinicalData => {
 if (tibokPatient && isFromTibok && !hasLoadedTibokData.current) {
 console.log('🚀 Initializing with TIBOK data immediately')
 
 const mappedSymptoms = Array.isArray(tibokPatient.currentSymptoms) 
 ? tibokPatient.currentSymptoms.map(symptom => {
 const mapped = symptom === 'constipation' ? 'Constipation' : symptom
 return mapped
 }).filter(Boolean)
 : []

 const validatedTemperature = validateTemperatureValue(tibokPatient.vitalSigns?.temperature)

 hasLoadedTibokData.current = true
 
 return {
 chiefComplaint: tibokPatient.consultationReason || "",
 diseaseHistory: "",
 symptomDuration: tibokPatient.symptomDuration || "",
 symptoms: mappedSymptoms,
 painScale: tibokPatient.painLevel?.toString() || "0",
 vitalSigns: {
 temperature: validatedTemperature,
 bloodPressureSystolic: tibokPatient.vitalSigns?.bloodPressureSystolic?.toString() || "",
 bloodPressureDiastolic: tibokPatient.vitalSigns?.bloodPressureDiastolic?.toString() || ""
 },
 workplaceIncident: {
 illnessAtWork: false,
 accidentAtWork: false
 }
 }
 }

 if (data) {
 return {
 ...INITIAL_CLINICAL_DATA,
 ...data,
 symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
 vitalSigns: {
 ...INITIAL_CLINICAL_DATA.vitalSigns,
 ...data.vitalSigns
 },
 workplaceIncident: {
 ...INITIAL_CLINICAL_DATA.workplaceIncident,
 ...data.workplaceIncident
 }
 }
 }
 
 return INITIAL_CLINICAL_DATA
 }, [tibokPatient, isFromTibok, data])
 
 const [localData, setLocalData] = useState<ClinicalData>(getInitialData)
 const [errors, setErrors] = useState<ValidationErrors>({})
 const [symptomSearch, setSymptomSearch] = useState("")
 const [currentSection, setCurrentSection] = useState(0)
 const [bpNotApplicable, setBpNotApplicable] = useState(false)
 const [lastSaved, setLastSaved] = useState<Date | null>(null)
 const [isLoading, setIsLoading] = useState(false)

 // Lab and Radiology results import state
 const [labResults, setLabResults] = useState<any>(null)
 const [radiologyResults, setRadiologyResults] = useState<any>(null)
 const [isLoadingLabResults, setIsLoadingLabResults] = useState(false)
 const [isLoadingRadiologyResults, setIsLoadingRadiologyResults] = useState(false)
 const [labResultsError, setLabResultsError] = useState<string | null>(null)
 const [radiologyResultsError, setRadiologyResultsError] = useState<string | null>(null)

 // ========== Memoization of translated lists ==========
// Replace the COMMON_SYMPTOMS useMemo in your clinical-form.tsx (around line 139-163)
// with this complete list of 51 symptoms:

const COMMON_SYMPTOMS = useMemo(() => [
 "Chest pain",
 "Shortness of breath",
 "Palpitations",
 "Fatigue",
 "Nausea",
 "Vomiting",
 "Diarrhea",
 "Constipation",
 "Headache",
 "Dizziness",
 "Fever",
 "Chills",
 "Cough",
 "Abdominal pain",
 "Back pain",
 "Insomnia",
 "Anxiety",
 "Loss of appetite",
 "Weight loss",
 "Leg swelling",
 "Joint pain",
 "Rash",
 "Blurred vision",
 "Hearing problems",
 "Night sweats",
 "Wheezing",
 "Chest tightness",
 "Sore throat",
 "Runny nose",
 "Irregular heartbeat",
 "Bloating",
 "Heartburn",
 "Numbness",
 "Tingling",
 "Memory problems",
 "Confusion",
 "Muscle pain",
 "Neck pain",
 "Joint stiffness",
 "Muscle weakness",
 "Itching",
 "Skin lesions",
 "Dry skin",
 "Skin discoloration",
 "Depression",
 "Irritability",
 "Mood swings",
 "Ear pain",
 "Tinnitus",
 "Nasal congestion",
 "Sinus pain"
 ], [])

 const DURATION_OPTIONS = useMemo(() => [
 { value: 'less_hour', label: 'Less than 1 hour' },
 { value: '1_6_hours', label: '1 to 6 hours' },
 { value: '6_24_hours', label: '6 to 24 hours' },
 { value: '1_3_days', label: '1 to 3 days' },
 { value: '3_7_days', label: '3 to 7 days' },
 { value: '1_4_weeks', label: '1 to 4 weeks' },
 { value: '1_6_months', label: '1 to 6 months' },
 { value: 'more_6_months', label: 'More than 6 months' }
 ], [])

 const getDurationLabel = useCallback((value: string) => {
 const option = DURATION_OPTIONS.find(opt => opt.value === value)
 return option?.label || ""
 }, [DURATION_OPTIONS])

 // ========== Utility functions ==========
 const calculateProgress = useCallback((): number => {
 const fields = [
 localData.chiefComplaint,
 localData.diseaseHistory,
 localData.symptomDuration,
 localData.symptoms?.length > 0 ? "filled" : "",
 localData.painScale && localData.painScale !== "0" ? "filled" : ""
 ]
 
 const completed = fields.filter(field => field && field.toString().trim()).length
 return Math.round((completed / fields.length) * 100)
 }, [localData])

 const validateTemperature = useCallback((temp: string): string => {
 const temperature = parseFloat(temp)
 if (isNaN(temperature)) return ""
 
 if (temperature < 36.1) return "Hypothermia"
 if (temperature >= 36.1 && temperature <= 37.2) return "Normal"
 if (temperature > 37.2 && temperature <= 38) return "Mild fever"
 if (temperature > 38) return "Fever"
 
 return ""
 }, [])

 const validateBloodPressure = useCallback((systolic: string, diastolic: string): string => {
 const sys = parseInt(systolic)
 const dia = parseInt(diastolic)
 
 if (isNaN(sys) || isNaN(dia)) return ""
 
 if (sys < 90 || dia < 60) return "Hypotension"
 if (sys < 120 && dia < 80) return "Normal"
 if (sys >= 120 && sys < 140 && dia < 90) return "Pre-hypertension"
 if (sys >= 140 || dia >= 90) return "Hypertension"
 
 return ""
 }, [])

 const validateBloodGlucose = useCallback((glucose: string): string => {
 const bg = parseFloat(glucose)
 if (isNaN(bg)) return ""
 
 // Normes de glycémie en g/L
 if (bg < 0.7) return "Hypoglycémie sévère"
 if (bg >= 0.7 && bg < 1.0) return "Hypoglycémie"
 if (bg >= 1.0 && bg <= 1.26) return "Normal (à jeun)"
 if (bg > 1.26 && bg < 2.0) return "Hyperglycémie modérée"
 if (bg >= 2.0) return "Hyperglycémie sévère"
 
 return ""
 }, [])

 // ========== Event handlers ==========
 const updateData = useCallback((updates: Partial<ClinicalData>) => {
 // CRITICAL: Don't update if we're trying to clear TIBOK data
 if (hasLoadedTibokData.current && !isMounted.current) {
 console.warn('⚠️ Preventing early state clear of TIBOK data')
 return
 }
 
 setLocalData(prev => {
 const newData = { ...prev, ...updates }
 if ('symptoms' in updates && !Array.isArray(newData.symptoms)) {
 newData.symptoms = []
 }
 return newData
 })
 
 if (updates.chiefComplaint) setErrors(prev => ({ ...prev, chiefComplaint: "" }))
 if (updates.diseaseHistory) setErrors(prev => ({ ...prev, diseaseHistory: "" }))
 if (updates.symptomDuration) setErrors(prev => ({ ...prev, symptomDuration: "" }))
 }, [])

 const updateVitalSigns = useCallback((field: keyof VitalSigns, value: string) => {
 setLocalData(prev => ({
 ...prev,
 vitalSigns: { ...prev.vitalSigns, [field]: value }
 }))
 }, [])

 const updateWorkplaceIncident = useCallback((field: keyof WorkplaceIncident, value: boolean) => {
 setLocalData(prev => ({
 ...prev,
 workplaceIncident: { ...prev.workplaceIncident, [field]: value }
 }))
 }, [])

 const toggleSymptom = useCallback((symptom: string) => {
 setLocalData(prev => {
 const currentSymptoms = Array.isArray(prev.symptoms) ? prev.symptoms : []
 const newSymptoms = currentSymptoms.includes(symptom)
 ? currentSymptoms.filter(s => s !== symptom)
 : [...currentSymptoms, symptom]
 
 return { ...prev, symptoms: newSymptoms }
 })
 }, [])

 const toggleBPNotApplicable = useCallback(() => {
 setBpNotApplicable(prev => {
 const newValue = !prev
 
 if (newValue) {
 updateVitalSigns("bloodPressureSystolic", "N/A")
 updateVitalSigns("bloodPressureDiastolic", "N/A")
 } else {
 updateVitalSigns("bloodPressureSystolic", "")
 updateVitalSigns("bloodPressureDiastolic", "")
 }
 
 return newValue
 })
 }, [updateVitalSigns])

 // ========== Lab and Radiology Results Import ==========
 const getPatientIdentifier = useCallback((): { patientId: string | null, patientName: string | null } => {
   let patientId: string | null = null
   let patientName: string | null = null

   // Try to get patient ID from various sources
   // 1. From patientData prop
   if (patientData?.patientId) patientId = patientData.patientId
   if (patientData?.firstName && patientData?.lastName) {
     patientName = `${patientData.firstName} ${patientData.lastName}`
   } else if (patientData?.fullName) {
     patientName = patientData.fullName
   }

   // 2. From sessionStorage (consultationPatientData)
   try {
     const storedData = sessionStorage.getItem('consultationPatientData')
     if (storedData) {
       const parsed = JSON.parse(storedData)
       if (parsed.patientId && !patientId) patientId = parsed.patientId
       if (!patientName) {
         if (parsed.firstName && parsed.lastName) {
           patientName = `${parsed.firstName} ${parsed.lastName}`
         } else if (parsed.fullName) {
           patientName = parsed.fullName
         }
       }
     }
   } catch (e) {
     console.warn('Error parsing sessionStorage:', e)
   }

   // 3. From Tibok patient data
   if (tibokPatient?.patientId && !patientId) patientId = tibokPatient.patientId
   if (!patientName && tibokPatient) {
     if (tibokPatient.firstName && tibokPatient.lastName) {
       patientName = `${tibokPatient.firstName} ${tibokPatient.lastName}`
     } else if (tibokPatient.fullName) {
       patientName = tibokPatient.fullName
     }
   }

   return { patientId, patientName }
 }, [patientData, tibokPatient])

 const fetchLabResults = useCallback(async () => {
   const { patientId, patientName } = getPatientIdentifier()
   if (!patientId && !patientName) {
     setLabResultsError("Patient information not found - please fill in patient details first")
     return
   }

   setIsLoadingLabResults(true)
   setLabResultsError(null)

   try {
     // Build query params - prefer patientId, fallback to patientName
     const params = new URLSearchParams({ type: 'lab' })
     if (patientId) {
       params.append('patientId', patientId)
     } else if (patientName) {
       params.append('patientName', patientName)
     }

     const response = await fetch(`/api/patient-results?${params.toString()}`)
     const data = await response.json()

     // Log debug info to help diagnose issues
     console.log('📋 Lab Results API Response:', {
       success: data.success,
       hasLabResults: data.hasLabResults,
       debug: data.debug
     })

     if (!response.ok) {
       throw new Error(data.error || 'Failed to fetch lab results')
     }

     if (data.hasLabResults && data.labResults) {
       setLabResults(data.labResults)

       // Format lab results for disease history
       const labResultsText = formatLabResultsForHistory(data.labResults)
       if (labResultsText) {
         setLocalData(prev => ({
           ...prev,
           diseaseHistory: prev.diseaseHistory
             ? `${prev.diseaseHistory}\n\n--- LAST LAB RESULTS ---\n${labResultsText}`
             : `--- LAST LAB RESULTS ---\n${labResultsText}`
         }))
       }
     } else {
       // More detailed error based on debug info
       const debugInfo = data.debug || {}
       if (debugInfo.labOrdersCount === 0) {
         setLabResultsError("No lab orders found in the database")
       } else if (!debugInfo.matchedLabOrder) {
         setLabResultsError(`No matching lab order found for patient "${patientName || patientId}". Found ${debugInfo.labOrdersCount} orders.`)
       } else if (debugInfo.labResultsCount === 0) {
         setLabResultsError(`Lab order found but no results available yet for order #${debugInfo.matchedLabOrder.id}`)
       } else {
         setLabResultsError("No lab results found for this patient")
       }
     }
   } catch (error: any) {
     console.error('Error fetching lab results:', error)
     setLabResultsError(error.message || 'Failed to fetch lab results')
   } finally {
     setIsLoadingLabResults(false)
   }
 }, [getPatientIdentifier])

 const fetchRadiologyResults = useCallback(async () => {
   const { patientId, patientName } = getPatientIdentifier()
   if (!patientId && !patientName) {
     setRadiologyResultsError("Patient information not found - please fill in patient details first")
     return
   }

   setIsLoadingRadiologyResults(true)
   setRadiologyResultsError(null)

   try {
     // Build query params - prefer patientId, fallback to patientName
     const params = new URLSearchParams({ type: 'radiology' })
     if (patientId) {
       params.append('patientId', patientId)
     } else if (patientName) {
       params.append('patientName', patientName)
     }

     const response = await fetch(`/api/patient-results?${params.toString()}`)
     const data = await response.json()

     // Log debug info to help diagnose issues
     console.log('🩻 Radiology Results API Response:', {
       success: data.success,
       hasRadiologyResults: data.hasRadiologyResults,
       debug: data.debug
     })

     if (!response.ok) {
       throw new Error(data.error || 'Failed to fetch radiology results')
     }

     if (data.hasRadiologyResults && data.radiologyResults) {
       setRadiologyResults(data.radiologyResults)

       // Format radiology results for disease history
       const radiologyResultsText = formatRadiologyResultsForHistory(data.radiologyResults)
       if (radiologyResultsText) {
         setLocalData(prev => ({
           ...prev,
           diseaseHistory: prev.diseaseHistory
             ? `${prev.diseaseHistory}\n\n--- LAST RADIOLOGY RESULTS ---\n${radiologyResultsText}`
             : `--- LAST RADIOLOGY RESULTS ---\n${radiologyResultsText}`
         }))
       }
     } else {
       // More detailed error based on debug info
       const debugInfo = data.debug || {}
       if (debugInfo.radioOrdersCount === 0) {
         setRadiologyResultsError("No radiology orders found in the database")
       } else if (!debugInfo.matchedRadioOrder) {
         setRadiologyResultsError(`No matching radiology order found for patient "${patientName || patientId}". Found ${debugInfo.radioOrdersCount} orders.`)
       } else if (debugInfo.radioResultsCount === 0) {
         setRadiologyResultsError(`Radiology order found but no results available yet for order #${debugInfo.matchedRadioOrder.id}`)
       } else {
         setRadiologyResultsError("No radiology results found for this patient")
       }
     }
   } catch (error: any) {
     console.error('Error fetching radiology results:', error)
     setRadiologyResultsError(error.message || 'Failed to fetch radiology results')
   } finally {
     setIsLoadingRadiologyResults(false)
   }
 }, [getPatientIdentifier])

 // Format lab results for display in disease history
 const formatLabResultsForHistory = (labResult: any): string => {
   if (!labResult) return ''

   const lines: string[] = []
   const resultsData = labResult.results_data
   const order = labResult.lab_orders

   // Add date
   if (labResult.validated_at) {
     lines.push(`Date: ${new Date(labResult.validated_at).toLocaleDateString()}`)
   } else if (labResult.created_at) {
     lines.push(`Date: ${new Date(labResult.created_at).toLocaleDateString()}`)
   }

   // Add order number
   if (order?.order_number) {
     lines.push(`Order: ${order.order_number}`)
   }

   // Add test results
   if (resultsData?.tests && Array.isArray(resultsData.tests)) {
     lines.push('\nTest Results:')
     resultsData.tests.forEach((test: any) => {
       const abnormalFlag = test.is_abnormal ? ' ⚠️' : ''
       lines.push(`• ${test.test_name}: ${test.value} ${test.unit || ''}${abnormalFlag}`)
       if (test.reference_range) {
         lines.push(`  (Ref: ${test.reference_range})`)
       }
     })
   }

   // Add interpretation notes
   if (labResult.interpretation_notes) {
     lines.push(`\nInterpretation: ${labResult.interpretation_notes}`)
   }

   // Add validator
   if (labResult.validated_by) {
     lines.push(`\nValidated by: ${labResult.validated_by}`)
   }

   return lines.join('\n')
 }

 // Format radiology results for display in disease history
 const formatRadiologyResultsForHistory = (radioResult: any): string => {
   if (!radioResult) return ''

   const lines: string[] = []
   const resultsData = radioResult.results_data
   const order = radioResult.radiology_orders

   // Add date
   if (radioResult.validated_at) {
     lines.push(`Date: ${new Date(radioResult.validated_at).toLocaleDateString()}`)
   } else if (radioResult.created_at) {
     lines.push(`Date: ${new Date(radioResult.created_at).toLocaleDateString()}`)
   }

   // Add order number
   if (order?.order_number) {
     lines.push(`Order: ${order.order_number}`)
   }

   // Add exam type
   if (order?.exams_ordered) {
     const exams = Array.isArray(order.exams_ordered)
       ? order.exams_ordered.map((e: any) => e.name || e).join(', ')
       : order.exams_ordered
     lines.push(`Exam: ${exams}`)
   }

   // Add findings
   if (resultsData?.findings) {
     lines.push(`\nFindings: ${resultsData.findings}`)
   }

   // Add conclusion
   if (resultsData?.conclusion) {
     lines.push(`\nConclusion: ${resultsData.conclusion}`)
   }

   // Add recommendations
   if (resultsData?.recommendations) {
     lines.push(`\nRecommendations: ${resultsData.recommendations}`)
   }

   // Add radiologist notes
   if (radioResult.radiologist_notes) {
     lines.push(`\nRadiologist Notes: ${radioResult.radiologist_notes}`)
   }

   // Add radiologist name
   if (radioResult.radiologist_name) {
     lines.push(`\nRadiologist: ${radioResult.radiologist_name}`)
   }

   return lines.join('\n')
 }

 const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
 if (e.key === 'Enter' && e.currentTarget.tagName !== 'TEXTAREA') {
 e.preventDefault()
 const form = e.currentTarget.closest('form')
 if (form) {
 const elements = Array.from(form.elements) as HTMLElement[]
 const currentIndex = elements.indexOf(e.currentTarget as HTMLElement)
 const nextElement = elements[currentIndex + 1]
 if (nextElement && 'focus' in nextElement) {
 nextElement.focus()
 }
 }
 }
 }, [])

 // ========== Validation ==========
 const validateForm = useCallback((): boolean => {
 const newErrors: ValidationErrors = {}
 
 if (!localData.chiefComplaint.trim()) {
 newErrors.chiefComplaint = "Chief complaint is required"
 }
 
 if (!localData.diseaseHistory.trim()) {
 newErrors.diseaseHistory = "Disease history is required"
 }
 
 if (!localData.symptomDuration) {
 newErrors.symptomDuration = "Symptom duration is required"
 }
 
// const symptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
// if (symptoms.length === 0) {
// newErrors.symptoms = "At least one symptom must be selected"
// }
 
 setErrors(newErrors)
 return Object.keys(newErrors).length === 0
 }, [localData])

 const handleSubmit = useCallback(async () => {
 if (validateForm()) {
 // Save data immediately before calling onNext to prevent data loss
 console.log('💾 Clinical form: Saving data before unmounting')
 try {
 await consultationDataService.saveStepData(1, localData)
 onDataChange(localData)
 console.log('✅ Clinical data saved successfully before unmounting')
 } catch (error) {
 console.error('❌ Error saving clinical data:', error)
 }
 onNext()
 } else {
 const firstErrorField = Object.keys(errors)[0]
 const element = document.getElementById(firstErrorField)
 if (element) {
 element.scrollIntoView({ behavior: 'smooth', block: 'center' })
 element.focus()
 }
 }
 }, [validateForm, onNext, errors, localData, onDataChange])

 // ========== Effects ==========
 
 // Track mounted state
 useEffect(() => {
 isMounted.current = true
 return () => {
 isMounted.current = false
 }
 }, [])

 // Load TIBOK data if it arrives after initial render
 useEffect(() => {
 if (tibokPatient && isFromTibok && !hasLoadedTibokData.current && isMounted.current) {
 console.log('🔄 Loading TIBOK data after mount:', {
 patient: tibokPatient.firstName + ' ' + tibokPatient.lastName,
 hasSymptoms: !!tibokPatient.currentSymptoms,
 symptomCount: tibokPatient.currentSymptoms?.length,
 hasDuration: !!tibokPatient.symptomDuration,
 hasTemperature: !!tibokPatient.vitalSigns?.temperature
 })

 const mappedSymptoms = Array.isArray(tibokPatient.currentSymptoms) 
 ? tibokPatient.currentSymptoms.map(symptom => 
 mapSymptomToCommonStatic(symptom, COMMON_SYMPTOMS)
 ).filter(Boolean)
 : []

 const validatedTemperature = validateTemperatureValue(tibokPatient.vitalSigns?.temperature)

 const tibokClinicalData: ClinicalData = {
 chiefComplaint: tibokPatient.consultationReason || "",
 diseaseHistory: "",
 symptomDuration: tibokPatient.symptomDuration || "",
 symptoms: mappedSymptoms,
 painScale: tibokPatient.painLevel?.toString() || "0",
 vitalSigns: {
 temperature: validatedTemperature,
 bloodPressureSystolic: tibokPatient.vitalSigns?.bloodPressureSystolic?.toString() || "",
 bloodPressureDiastolic: tibokPatient.vitalSigns?.bloodPressureDiastolic?.toString() || ""
 },
 workplaceIncident: {
 illnessAtWork: false,
 accidentAtWork: false
 }
 }

 console.log('✅ Setting TIBOK data to state:', {
 duration: tibokClinicalData.symptomDuration,
 symptomsCount: tibokClinicalData.symptoms.length,
 symptoms: tibokClinicalData.symptoms,
 temperature: tibokClinicalData.vitalSigns.temperature,
 painScale: tibokClinicalData.painScale
 })

 setLocalData(tibokClinicalData)
 hasLoadedTibokData.current = true
 }
 }, [tibokPatient, isFromTibok, COMMON_SYMPTOMS])

 // Load from database only if no TIBOK data and no props data
 useEffect(() => {
 if (!hasLoadedTibokData.current && !data && consultationId && isMounted.current) {
 const loadFromDatabase = async () => {
 try {
 setIsLoading(true)
 console.log('📂 Loading saved clinical data from database')
 
 const savedData = await consultationDataService.getAllData()
 
 if (savedData?.clinicalData && !hasLoadedTibokData.current) {
 setLocalData(prev => ({
 ...prev,
 ...savedData.clinicalData,
 symptoms: Array.isArray(savedData.clinicalData.symptoms)
 ? savedData.clinicalData.symptoms
 : [],
 vitalSigns: {
 ...INITIAL_CLINICAL_DATA.vitalSigns,
 ...savedData.clinicalData.vitalSigns
 },
 workplaceIncident: {
 ...INITIAL_CLINICAL_DATA.workplaceIncident,
 ...savedData.clinicalData.workplaceIncident
 }
 }))
 }
 } catch (error) {
 console.error('Error loading clinical data:', error)
 } finally {
 setIsLoading(false)
 }
 }
 
 loadFromDatabase()
 }
 }, [consultationId, data])

 // Auto-save effect
 useEffect(() => {
 if (!isMounted.current || !hasLoadedTibokData.current) {
 return
 }

 const timer = setTimeout(async () => {
 if (localData.chiefComplaint || localData.diseaseHistory || localData.symptoms.length > 0) {
 try {
 await consultationDataService.saveStepData(1, localData)
 setLastSaved(new Date())
 onDataChange(localData)
 console.log('✅ Data saved for step 1')
 } catch (error) {
 console.error('Error saving clinical data:', error)
 }
 }
 }, 1000)
 
 return () => clearTimeout(timer)
 }, [localData, onDataChange])

 // Debug: Log state changes
 useEffect(() => {
 if (isMounted.current) {
 console.log(' Clinical Form State Updated:', {
 symptomDuration: localData.symptomDuration,
 symptomsCount: localData.symptoms.length,
 symptoms: localData.symptoms,
 temperature: localData.vitalSigns.temperature,
 hasLoadedTibokData: hasLoadedTibokData.current,
 isMounted: isMounted.current
 })
 }
 }, [localData])

 // ========== Calculated variables ==========
 const progress = calculateProgress()
 const painLevel = parseInt(localData.painScale || "0")
 const painInfo = PAIN_SCALE_LABELS[painLevel as keyof typeof PAIN_SCALE_LABELS]
 
 const filteredSymptoms = COMMON_SYMPTOMS.filter(symptom =>
 symptom.toLowerCase().includes(symptomSearch.toLowerCase())
 )

 const temperatureStatus = validateTemperature(localData.vitalSigns.temperature)
 const bpStatus = validateBloodPressure(
 localData.vitalSigns.bloodPressureSystolic,
 localData.vitalSigns.bloodPressureDiastolic
 )
 const bgStatus = validateBloodGlucose(localData.vitalSigns.bloodGlucose)

 const showTibokNotification = hasLoadedTibokData.current && isFromTibok && tibokPatient

 // ========== Render ==========
 return (
 <form 
 className="space-y-6" 
 onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
 >
 {/* TIBOK Notification - Removed per request */}

 {/* Header with progress */}
 <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
 <CardHeader className="text-center p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center justify-center gap-2 sm:gap-3 text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
 <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600" />
 Clinical Information
 </CardTitle>
 <div className="mt-3 sm:mt-4 space-y-2">
 <div className="flex justify-between text-xs sm:text-sm text-gray-600 !flex-row" style={{ flexDirection: 'row' }}>
 <span>Progress</span>
 <span className="font-semibold">{progress}%</span>
 </div>
 <Progress value={progress} className="h-1.5 sm:h-2" />
 </div>
 </CardHeader>
 </Card>

 {/* Quick navigation - Horizontal scroll on mobile */}
 <div className="flex overflow-x-auto pb-2 gap-2 justify-start sm:justify-center sm:flex-wrap sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0 !flex-row" style={{ flexDirection: 'row' }}>
 {SECTIONS.map((section, index) => (
 <button
 key={section.id}
 type="button"
 onClick={() => setCurrentSection(index)}
 className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200 flex-shrink-0 text-xs sm:text-sm ${
 currentSection === index
 ? "bg-blue-600 text-white shadow-lg"
 : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
 }`}
 >
 <section.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
 <span className="font-medium whitespace-nowrap">{t(section.titleKey)}</span>
 </button>
 ))}
 </div>

 {/* Section 1: Chief complaint */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
 Chief Complaint
 </CardTitle>
 </CardHeader>
 <CardContent className="p-3 sm:p-4 md:p-6">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label htmlFor="chiefComplaint" className="font-medium">
 What is the main reason for your consultation?
 </Label>
 <VoiceDictationButton
 onTranscript={(text) => {
 const currentText = localData.chiefComplaint
 const newText = currentText 
 ? `${currentText} ${text}` 
 : text
 updateData({ chiefComplaint: newText })
 }}
 language="en-US"
 />
 </div>
 <Textarea
 id="chiefComplaint"
 value={localData.chiefComplaint}
 onChange={(e) => updateData({ chiefComplaint: e.target.value })}
 onKeyDown={handleKeyDown}
 placeholder="Describe your main concern or symptom..."
 rows={3}
 className={`resize-none ${errors.chiefComplaint ? 'border-blue-500' : ''}`}
 />
 {errors.chiefComplaint && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <AlertCircle className="h-3 w-3" />
 {errors.chiefComplaint}
 </p>
 )}
 <p className="text-xs text-gray-500">
 Please provide a clear and concise summary of your main health concern.
 </p>
 </div>
 </CardContent>
 </Card>

 {/* Section 2: Disease history */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
 Disease History
 </CardTitle>
 </CardHeader>
 <CardContent className="p-3 sm:p-4 md:p-6">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label htmlFor="diseaseHistory" className="font-medium">
 How have your symptoms evolved?
 </Label>
 <VoiceDictationButton
 onTranscript={(text) => {
 const currentText = localData.diseaseHistory
 const newText = currentText 
 ? `${currentText} ${text}` 
 : text
 updateData({ diseaseHistory: newText })
 }}
 language="en-US"
 />
 </div>
 <Textarea
 id="diseaseHistory"
 value={localData.diseaseHistory}
 onChange={(e) => updateData({ diseaseHistory: e.target.value })}
 placeholder="Describe how your symptoms started and how they have progressed over time..."
 rows={5}
 className={`resize-none ${errors.diseaseHistory ? 'border-blue-500' : ''}`}
 />
 {errors.diseaseHistory && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <AlertCircle className="h-3 w-3" />
 {errors.diseaseHistory}
 </p>
 )}
 <p className="text-xs text-gray-500">
 Include details about when symptoms started, what makes them better or worse, and any treatments you've tried.
 </p>
 </div>

 {/* Import Lab/Radiology Results Buttons */}
 <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
   <div className="flex items-center gap-2 mb-3">
     <Download className="h-5 w-5 text-gray-600" />
     <p className="font-semibold text-gray-800">Import Previous Results</p>
   </div>
   <p className="text-xs text-gray-500 mb-3">
     Import the patient's last laboratory or radiology results to include in the disease history.
   </p>
   <div className="flex flex-wrap gap-3">
     {/* Lab Results Button */}
     <Button
       type="button"
       variant="outline"
       size="sm"
       onClick={fetchLabResults}
       disabled={isLoadingLabResults || !!labResults}
       className={`flex items-center gap-2 ${labResults ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
     >
       {isLoadingLabResults ? (
         <Loader2 className="h-4 w-4 animate-spin" />
       ) : labResults ? (
         <CheckCircle className="h-4 w-4" />
       ) : (
         <FlaskConical className="h-4 w-4" />
       )}
       {labResults ? 'Lab Results Imported' : 'Import Lab Results'}
     </Button>

     {/* Radiology Results Button */}
     <Button
       type="button"
       variant="outline"
       size="sm"
       onClick={fetchRadiologyResults}
       disabled={isLoadingRadiologyResults || !!radiologyResults}
       className={`flex items-center gap-2 ${radiologyResults ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
     >
       {isLoadingRadiologyResults ? (
         <Loader2 className="h-4 w-4 animate-spin" />
       ) : radiologyResults ? (
         <CheckCircle className="h-4 w-4" />
       ) : (
         <ImageIcon className="h-4 w-4" />
       )}
       {radiologyResults ? 'Radiology Results Imported' : 'Import Radiology Results'}
     </Button>
   </div>

   {/* Error/Info messages */}
   {labResultsError && (
     <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
       <div className="flex items-center gap-2">
         <Info className="h-4 w-4 text-amber-600" />
         <p className="text-sm text-amber-700">{labResultsError}</p>
       </div>
     </div>
   )}
   {radiologyResultsError && (
     <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
       <div className="flex items-center gap-2">
         <Info className="h-4 w-4 text-amber-600" />
         <p className="text-sm text-amber-700">{radiologyResultsError}</p>
       </div>
     </div>
   )}

   {/* Success indicators */}
   {(labResults || radiologyResults) && (
     <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
       <div className="flex items-center gap-2">
         <CheckCircle className="h-4 w-4 text-green-600" />
         <p className="text-sm text-green-700">
           Results have been added to the disease history above.
         </p>
       </div>
     </div>
   )}
 </div>

 {localData.diseaseHistory && (
 <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
 <div className="flex items-center gap-2">
 <CheckCircle className="h-4 w-4 text-blue-600" />
 <p className="font-semibold text-blue-800">
 History documented ({localData.diseaseHistory.length} characters)
 </p>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Section 3: Symptom duration - FIXED WITH SAFEGUARD */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
 Duration
 </CardTitle>
 </CardHeader>
 <CardContent className="p-3 sm:p-4 md:p-6">
 <div className="space-y-2">
 <Label htmlFor="symptomDuration" className="font-medium">
 How long have you been experiencing these symptoms?
 </Label>
 <Select
 value={localData.symptomDuration || ""}
 onValueChange={(value) => {
 // CRITICAL: Prevent empty value from clearing TIBOK data
 if (value || !hasLoadedTibokData.current) {
 console.log('Duration select changed to:', value)
 updateData({ symptomDuration: value })
 }
 }}
 >
 <SelectTrigger className={errors.symptomDuration ? 'border-blue-500' : ''}>
 <SelectValue placeholder="Select duration">
 {localData.symptomDuration ? getDurationLabel(localData.symptomDuration) : "Select duration"}
 </SelectValue>
 </SelectTrigger>
 <SelectContent>
 {DURATION_OPTIONS.map(option => (
 <SelectItem key={option.value} value={option.value}>
 {option.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {errors.symptomDuration && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <AlertCircle className="h-3 w-3" />
 {errors.symptomDuration}
 </p>
 )}
 
 {localData.symptomDuration && (
 <div className="mt-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
 <div className="flex items-center gap-2">
 <Clock className="h-4 w-4 text-teal-600" />
 <p className="font-semibold text-teal-800">
 Symptoms present for {getDurationLabel(localData.symptomDuration).toLowerCase()}
 </p>
 </div>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Section 3.5: Pain intensity */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
 Pain Intensity
 </CardTitle>
 </CardHeader>
 <CardContent className="p-3 sm:p-4 md:p-6">
 <div className="space-y-4">
 <Label className="font-medium">
 Rate your pain on a scale from 0 to 10
 </Label>
 <div className="space-y-4">
 <input
 type="range"
 min="0"
 max="10"
 step="1"
 value={localData.painScale}
 onChange={(e) => updateData({ painScale: e.target.value })}
 className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
 style={{
 background: `linear-gradient(to right, #10b981 0%, #eab308 50%, #ef4444 100%)`
 }}
 />
 <div className="flex justify-between text-xs text-gray-600 font-medium !flex-row" style={{ flexDirection: 'row' }}>
 {[...Array(11)].map((_, i) => (
 <span key={i} className="text-center" style={{ minWidth: '12px' }}>{i}</span>
 ))}
 </div>
 </div>
 
 {painLevel > 0 && (
 <div className={`mt-3 p-4 rounded-lg border-2 ${painInfo.color}`}>
 <p className="font-semibold text-lg">
 Pain level: {localData.painScale}/10
 </p>
 <p className="text-sm mt-1">
 {painInfo.label}
 </p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Section 4: Current symptoms */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
 Current Symptoms
 </CardTitle>
 </CardHeader>
 <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
 <div className="relative">
 <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
 <Input
 placeholder="Search symptoms..."
 value={symptomSearch}
 onChange={(e) => setSymptomSearch(e.target.value)}
 className="pl-10"
 />
 </div>

 {errors.symptoms && (
 <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
 <p className="text-sm text-blue-600 flex items-center gap-1">
 <AlertCircle className="h-4 w-4" />
 {errors.symptoms}
 </p>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
 {filteredSymptoms.map((symptom) => {
 const isSelected = localData.symptoms.some(s =>
 s.toLowerCase() === symptom.toLowerCase()
 )

 return (
 <label
 key={symptom}
 className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer ${
 isSelected
 ? "border-cyan-400 bg-cyan-50"
 : "border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50"
 }`}
 >
 <Checkbox
 checked={isSelected}
 onCheckedChange={() => toggleSymptom(symptom)}
 />
 <span className="text-xs sm:text-sm font-medium">{symptom}</span>
 </label>
 )
 })}
 </div>

 {localData.symptoms.length > 0 && (
 <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
 <div className="flex items-center gap-2 mb-3">
 <Activity className="h-5 w-5 text-cyan-600" />
 <p className="font-semibold text-cyan-800">
 Selected symptoms ({localData.symptoms.length})
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 {localData.symptoms.map((symptom) => (
 <Badge key={symptom} className="bg-cyan-100 text-cyan-800 text-xs">
 {symptom}
 </Badge>
 ))}
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Section 5: Vital signs */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
 Vital Signs
 </CardTitle>
 </CardHeader>
 <CardContent className="p-3 sm:p-4 md:p-6">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
 {/* Temperature */}
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <Thermometer className="h-5 w-5 text-blue-500" />
 <Label htmlFor="temperature" className="font-medium">
 Temperature (°C)
 </Label>
 </div>
 <Input
 id="temperature"
 type="number"
 step="0.1"
 min="35"
 max="42"
 value={localData.vitalSigns.temperature}
 onChange={(e) => updateVitalSigns("temperature", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="37.0"
 />
 {temperatureStatus && (
 <p className={`text-xs font-medium ${
 temperatureStatus === 'Normal' ? 'text-teal-600' :
 temperatureStatus === 'Hypothermia' ? 'text-blue-600' :
 'text-blue-600'
 }`}>
 {temperatureStatus === 'Normal' ? '✅' : 
 temperatureStatus === 'Hypothermia' ? '🟦' : '🔴'} {temperatureStatus}
 </p>
 )}
 </div>

 {/* Systolic blood pressure */}
 <div className="space-y-2">
 <Label htmlFor="bloodPressureSystolic" className="font-medium">
 Systolic BP (mmHg)
 </Label>
 <Input
 id="bloodPressureSystolic"
 type="number"
 min="70"
 max="250"
 value={bpNotApplicable ? "N/A" : localData.vitalSigns.bloodPressureSystolic}
 onChange={(e) => updateVitalSigns("bloodPressureSystolic", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="120"
 disabled={bpNotApplicable}
 className={bpNotApplicable ? 'opacity-50' : ''}
 />
 </div>

 {/* Diastolic blood pressure */}
 <div className="space-y-2">
 <Label htmlFor="bloodPressureDiastolic" className="font-medium">
 Diastolic BP (mmHg)
 </Label>
 <Input
 id="bloodPressureDiastolic"
 type="number"
 min="40"
 max="150"
 value={bpNotApplicable ? "N/A" : localData.vitalSigns.bloodPressureDiastolic}
 onChange={(e) => updateVitalSigns("bloodPressureDiastolic", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="80"
 disabled={bpNotApplicable}
 className={bpNotApplicable ? 'opacity-50' : ''}
 />
 </div>
 </div>

 {/* Not applicable button */}
 <div className="mt-4">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={toggleBPNotApplicable}
 className={bpNotApplicable ? 'bg-gray-100' : ''}
 >
 <XCircle className="h-4 w-4 mr-2" />
 Blood pressure not available
 </Button>
 </div>

 {/* Blood Glucose (optional) */}
 <div className="col-span-3 space-y-2 pt-4 border-t">
 <div className="flex items-center gap-2">
 <Activity className="h-5 w-5 text-blue-500" />
 <Label htmlFor="bloodGlucose" className="font-medium">
 Glycémie (g/L) - Test Glucomètre
 <span className="ml-2 text-xs text-gray-500 font-normal">(Optionnel)</span>
 </Label>
 </div>
 <Input
 id="bloodGlucose"
 type="number"
 step="0.01"
 min="0.3"
 max="6.0"
 value={localData.vitalSigns.bloodGlucose}
 onChange={(e) => updateVitalSigns("bloodGlucose", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="1.0"
 />
 {bgStatus && (
 <div className={`p-2 rounded-lg border text-sm font-medium ${
 bgStatus.includes('Normal') ? 'bg-teal-50 border-teal-200 text-teal-800' :
 bgStatus.includes('Hypoglycémie sévère') ? 'bg-blue-50 border-blue-200 text-blue-800' :
 bgStatus.includes('Hypoglycémie') ? 'bg-cyan-50 border-cyan-200 text-cyan-800' :
 bgStatus.includes('Hyperglycémie sévère') ? 'bg-blue-50 border-blue-200 text-blue-800' :
 'bg-cyan-50 border-cyan-200 text-cyan-800'
 }`}>
 {bgStatus.includes('Normal') ? '✅' :
 bgStatus.includes('sévère') ? '🔴' : '⚠️'} {bgStatus}
 </div>
 )}
 <p className="text-xs text-gray-500">
 Valeurs normales à jeun : 0.7 - 1.26 g/L
 </p>
 </div>

 {/* Blood pressure display */}
 {(localData.vitalSigns.bloodPressureSystolic && localData.vitalSigns.bloodPressureDiastolic && !bpNotApplicable) && (
 <div className={`mt-4 p-3 rounded-lg border ${
 bpStatus === 'Normal' ? 'bg-teal-50 border-teal-200' :
 bpStatus === 'Hypotension' ? 'bg-blue-50 border-blue-200' :
 bpStatus === 'Pre-hypertension' ? 'bg-cyan-50 border-cyan-200' :
 'bg-blue-50 border-blue-200'
 }`}>
 <div className="flex items-center gap-2">
 <Activity className={`h-4 w-4 ${
 bpStatus === 'Normal' ? 'text-teal-600' :
 bpStatus === 'Hypotension' ? 'text-blue-600' :
 bpStatus === 'Pre-hypertension' ? 'text-cyan-600' :
 'text-blue-600'
 }`} />
 <p className="font-semibold">
 Blood pressure: {localData.vitalSigns.bloodPressureSystolic}/{localData.vitalSigns.bloodPressureDiastolic} mmHg
 </p>
 </div>
 {bpStatus && (
 <p className="text-sm mt-1">
 {bpStatus === 'Normal' ? '✅' :
 bpStatus === 'Hypotension' ? '🟦' :
 bpStatus === 'Pre-hypertension' ? '🟡' : '⚠️'} {bpStatus}
 </p>
 )}
 </div>
 )}

 {bpNotApplicable && (
 <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
 <div className="flex items-center gap-2">
 <XCircle className="h-4 w-4 text-gray-600" />
 <p className="font-semibold text-gray-800">
 Blood pressure not measured
 </p>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Section 6: Workplace Incident */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
 <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl">
 <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
 Workplace Incident Assessment
 </CardTitle>
 </CardHeader>
 <CardContent className="p-3 sm:p-4 md:p-6">
 <div className="space-y-3 sm:space-y-4">
 <p className="text-xs sm:text-sm text-gray-600">
 Please indicate if the patient's condition is related to their workplace:
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 {/* Illness at Work */}
 <label
 className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 localData.workplaceIncident?.illnessAtWork
 ? "border-amber-400 bg-amber-50"
 : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
 }`}
 >
 <Checkbox
 checked={localData.workplaceIncident?.illnessAtWork || false}
 onCheckedChange={(checked) => updateWorkplaceIncident("illnessAtWork", checked as boolean)}
 className="h-5 w-5"
 />
 <div>
 <span className="font-medium text-gray-900">Illness at Workplace</span>
 <p className="text-xs text-gray-500 mt-1">
 Patient got sick at their working place
 </p>
 </div>
 </label>

 {/* Accident at Work */}
 <label
 className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 localData.workplaceIncident?.accidentAtWork
 ? "border-orange-400 bg-orange-50"
 : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
 }`}
 >
 <Checkbox
 checked={localData.workplaceIncident?.accidentAtWork || false}
 onCheckedChange={(checked) => updateWorkplaceIncident("accidentAtWork", checked as boolean)}
 className="h-5 w-5"
 />
 <div>
 <span className="font-medium text-gray-900">Accident / Incident at Workplace</span>
 <p className="text-xs text-gray-500 mt-1">
 Patient had an accident or incident at their working place
 </p>
 </div>
 </label>
 </div>

 {/* Summary display */}
 {(localData.workplaceIncident?.illnessAtWork || localData.workplaceIncident?.accidentAtWork) && (
 <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
 <div className="flex items-center gap-2 mb-2">
 <AlertCircle className="h-5 w-5 text-amber-600" />
 <p className="font-semibold text-amber-800">
 Workplace-Related Condition
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 {localData.workplaceIncident?.illnessAtWork && (
 <Badge className="bg-amber-100 text-amber-800 border-amber-300">
 🏥 Illness at Work
 </Badge>
 )}
 {localData.workplaceIncident?.accidentAtWork && (
 <Badge className="bg-orange-100 text-orange-800 border-orange-300">
 ⚠️ Accident at Work
 </Badge>
 )}
 </div>
 <p className="text-xs text-amber-700 mt-2">
 This information will be included in the medical report for occupational health documentation.
 </p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Auto-save indicator */}
 <div className="flex justify-center">
 <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
 <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
 <span className="text-sm text-gray-600">
 Auto-saving
 {lastSaved && (
 <span className="ml-2 text-xs text-gray-500">
 ({new Date(lastSaved).toLocaleTimeString()})
 </span>
 )}
 </span>
 </div>
 </div>

 {/* Navigation */}
 <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 onClick={onPrevious}
 className="px-4 sm:px-6 py-2 sm:py-3 shadow-md hover:shadow-lg transition-all duration-300 text-sm sm:text-base order-2 sm:order-1"
 >
 <ArrowLeft className="h-4 w-4 mr-2" />
 Previous
 </Button>
 <Button
 type="submit"
 className="bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base order-1 sm:order-2"
 >
 Continue to AI Analysis
 <ArrowRight className="h-4 w-4 ml-2" />
 </Button>
 </div>
 </form>
 )
}
