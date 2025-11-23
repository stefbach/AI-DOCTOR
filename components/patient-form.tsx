"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { toast } from "@/components/ui/use-toast"
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
 ArrowRight,
 User, 
 Heart, 
 AlertTriangle, 
 Pill, 
 Activity, 
 Search,
 Check,
 X,
 CheckCircle,
 Loader2,
 Mail,
 Phone,
 MapPin,
 Home,
 Baby
} from "lucide-react"
import { useTibokPatientData } from "@/hooks/use-tibok-patient-data"
import { getTranslation, Language } from "@/lib/translations"

// ==================== INTERFACES & TYPES ====================
interface LifeHabits {
 smoking: string
 alcohol: string
 physicalActivity: string
}

interface PatientFormData {
 // Personal information
 firstName: string
 lastName: string
 birthDate: string
 age: string
 gender: string
 
 // Pregnancy information (NEW)
 pregnancyStatus?: string
 lastMenstrualPeriod?: string
 gestationalAge?: string
 
 // Physical data
 weight: string
 height: string
 
 // Contact
 phone: string
 email: string
 address: string
 city: string
 country: string
 
 // Medical information
 allergies: string[]
 otherAllergies: string
 medicalHistory: string[]
 otherMedicalHistory: string
 currentMedicationsText: string
 
 // Life habits
 lifeHabits: LifeHabits
}

interface PatientFormProps {
 onDataChange: (data: PatientFormData) => void
 onNext: () => void
 language?: Language
 consultationId?: string | null
 data?: Partial<PatientFormData>
}

interface ValidationErrors {
 [key: string]: string
}

// Helper function to translate medications
async function translateMedications(medications: string): Promise<string> {
 if (!medications || medications.trim() === '') return medications
 
 try {
 const response = await fetch('/api/translate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ text: medications })
 })
 
 if (response.ok) {
 const result = await response.json()
 console.log('💊 Medications translated:', {
 original: medications,
 translated: result.translatedText
 })
 return result.translatedText || medications
 }
 } catch (error) {
 console.error('Failed to translate medications:', error)
 }
 
 return medications
}

// ==================== CONSTANTS ====================
const INITIAL_FORM_DATA: PatientFormData = {
 firstName: "",
 lastName: "",
 birthDate: "",
 age: "",
 gender: "",
 pregnancyStatus: "",
 lastMenstrualPeriod: "",
 gestationalAge: "",
 weight: "",
 height: "",
 phone: "",
 email: "",
 address: "",
 city: "",
 country: "Mauritius",
 allergies: [],
 otherAllergies: "",
 medicalHistory: [],
 otherMedicalHistory: "",
 currentMedicationsText: "",
 lifeHabits: {
 smoking: "",
 alcohol: "",
 physicalActivity: ""
 }
}

const SECTIONS = [
 { id: "identity", titleKey: 'patientForm.personalInfo', icon: User },
 { id: "contact", titleKey: 'patientForm.contactInfo', icon: Phone },
 { id: "allergies", titleKey: 'patientForm.knownAllergies', icon: AlertTriangle },
 { id: "history", titleKey: 'patientForm.medicalHistory', icon: Heart },
 { id: "medications", titleKey: 'patientForm.currentMedications', icon: Pill },
 { id: "habits", titleKey: 'patientForm.lifestyle', icon: Activity },
]

const SMOKING_OPTIONS = [
 { value: "non", label: "Non-smoker" },
 { value: "actuel", label: "Current smoker" },
 { value: "ancien", label: "Ex-smoker" }
]

const ALCOHOL_OPTIONS = [
 { value: "jamais", label: "Never" },
 { value: "occasionnel", label: "Occasional" },
 { value: "regulier", label: "Regular" }
]

const ACTIVITY_OPTIONS = [
 { value: "sedentaire", label: "Sedentary" },
 { value: "moderee", label: "Moderate" },
 { value: "intense", label: "Intense" }
]

const PREGNANCY_STATUS_OPTIONS = [
 { value: "not_pregnant", label: "Not pregnant", color: "green" },
 { value: "pregnant", label: "Currently pregnant", color: "pink" },
 { value: "possibly_pregnant", label: "Possibly pregnant", color: "yellow" },
 { value: "breastfeeding", label: "Breastfeeding", color: "blue" },
 { value: "not_applicable", label: "Not applicable", color: "gray" }
]
// ==================== MAIN COMPONENT ====================
export default function ModernPatientForm({ 
 onDataChange, 
 onNext, 
 language = 'en',
 consultationId,
 data
}: PatientFormProps) {
 // ========== Hooks ==========
 const { patientData: tibokPatient, isFromTibok } = useTibokPatientData()
 const t = useCallback((key: string) => getTranslation(key, language), [language])
 
 // ========== States ==========
 const [isLoading, setIsLoading] = useState(true)
 const [dataInitialized, setDataInitialized] = useState(false)
 const [formData, setFormData] = useState<PatientFormData>(() => ({
 ...INITIAL_FORM_DATA,
 ...data
 }))
 const [errors, setErrors] = useState<ValidationErrors>({})
 const [consultationType, setConsultationType] = useState<'normal' | 'chronic' | 'dermatology' | ''>('')
 const [allergySearch, setAllergySearch] = useState("")
 const [historySearch, setHistorySearch] = useState("")
 const [currentSection, setCurrentSection] = useState(0)
 const [lastSaved, setLastSaved] = useState<Date | null>(null)

 // ========== Memoization ==========
 const COMMON_ALLERGIES = useMemo(() => [
 "Penicillin",
 "Aspirin",
 "NSAIDs (Ibuprofen, Diclofenac)",
 "Codeine",
 "Latex",
 "Iodine",
 "Local anesthetics",
 "Sulfonamides",
 ], [])

 const COMMON_MEDICAL_HISTORY = useMemo(() => [
 "Hypertension",
 "Type 2 Diabetes",
 "Type 1 Diabetes",
 "Asthma",
 "Heart disease",
 "Depression/Anxiety",
 "Arthritis",
 "Migraine",
 "GERD (Gastroesophageal reflux)",
 "High cholesterol",
 ], [])

 // Check if patient is female of childbearing age
 const isChildbearingAge = useMemo(() => {
 const age = parseInt(formData.age)
 return formData.gender === 'Female' && age >= 15 && age <= 50
 }, [formData.age, formData.gender])

 // ========== Utility functions ==========
 const calculateAge = useCallback((birthDate: string): string => {
 if (!birthDate) return ""
 
 const today = new Date()
 const birth = new Date(birthDate)
 let age = today.getFullYear() - birth.getFullYear()
 const monthDiff = today.getMonth() - birth.getMonth()
 
 if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
 age--
 }
 
 return age >= 0 ? age.toString() : ""
 }, [])

 const calculateGestationalAge = useCallback((lmp: string): string => {
 if (!lmp) return ""
 
 const today = new Date()
 const lastPeriod = new Date(lmp)
 const diffTime = Math.abs(today.getTime() - lastPeriod.getTime())
 const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
 
 if (diffWeeks > 0 && diffWeeks <= 42) {
 return `${diffWeeks} weeks`
 }
 return ""
 }, [])

 const calculateBMI = useCallback((): string | null => {
 const weight = parseFloat(formData.weight)
 const height = parseFloat(formData.height)
 
 if (!isNaN(weight) && !isNaN(height) && height > 0) {
 const heightInMeters = height / 100
 const bmi = weight / (heightInMeters * heightInMeters)
 return bmi.toFixed(1)
 }
 
 return null
 }, [formData.weight, formData.height])

 const getBMICategory = useCallback((bmi: number) => {
 if (bmi < 18.5) return { 
 text: "Underweight", 
 color: "bg-blue-100 text-blue-800 border-blue-200", 
 icon: "📉" 
 }
 if (bmi < 25) return { 
 text: "Normal weight", 
 color: "bg-teal-100 text-teal-800 border-teal-200", 
 icon: "✅" 
 }
 if (bmi < 30) return { 
 text: "Overweight", 
 color: "bg-cyan-100 text-cyan-800 border-cyan-200", 
 icon: "⚠️" 
 }
 return { 
 text: "Obesity", 
 color: "bg-blue-100 text-blue-800 border-blue-200", 
 icon: "🔴" 
 }
 }, [])

 const calculateProgress = useCallback((): number => {
 const requiredFields = [
 formData.firstName,
 formData.lastName,
 formData.birthDate,
 formData.gender,
 formData.weight,
 formData.height
 ]
 
 // Add pregnancy status if applicable
 if (isChildbearingAge) {
 requiredFields.push(formData.pregnancyStatus || '')
 }
 
 const optionalFields = [
 formData.phone,
 formData.email,
 formData.lifeHabits.smoking,
 formData.lifeHabits.alcohol,
 formData.lifeHabits.physicalActivity
 ]
 
 const requiredCompleted = requiredFields.filter(field => field && field.trim()).length
 const optionalCompleted = optionalFields.filter(field => field && field.trim()).length
 
 const totalFields = requiredFields.length + optionalFields.length
 const totalCompleted = requiredCompleted + optionalCompleted
 
 return Math.round((totalCompleted / totalFields) * 100)
 }, [formData, isChildbearingAge])

 const normalizeGender = useCallback((gender: any): string => {
 if (!gender) return ""
 
 const g = String(gender).toLowerCase().trim()
 const maleVariants = ['m', 'male', 'masculin', 'homme', 'man']
 const femaleVariants = ['f', 'female', 'féminin', 'femme', 'woman']
 
 if (maleVariants.includes(g)) return 'Male'
 if (femaleVariants.includes(g)) return 'Female'
 
 return gender
 }, [])
 const transformDataForAPI = useCallback((data: PatientFormData) => {
 const sexe = data.gender === 'Male' ? 'Male' : 
 data.gender === 'Female' ? 'Female' : 
 data.gender || 'Not specified'
 
 // Ensure allergies is always an array (handle edge cases where it might be string or undefined)
 const allergiesArray = Array.isArray(data.allergies) ? [...data.allergies] : 
 typeof data.allergies === 'string' ? [data.allergies] :
 []
 if (data.otherAllergies?.trim()) {
 allergiesArray.push(data.otherAllergies.trim())
 }
 
 const historyArray = [...data.medicalHistory]
 if (data.otherMedicalHistory?.trim()) {
 historyArray.push(data.otherMedicalHistory.trim())
 }
 
 // Calculate gestational age if pregnant
 let gestationalAge = ''
 if (data.pregnancyStatus === 'pregnant' && data.lastMenstrualPeriod) {
 gestationalAge = calculateGestationalAge(data.lastMenstrualPeriod)
 }
 
 return {
 // Personal information - Include all field name variations
 nom: data.lastName || '',
 prenom: data.firstName || '',
 firstName: data.firstName || '',
 lastName: data.lastName || '',
 first_name: data.firstName || '',
 last_name: data.lastName || '',
 birthDate: data.birthDate || '',
 dateNaissance: data.birthDate || '',
 dateOfBirth: data.birthDate || '',
 date_of_birth: data.birthDate || '',
 age: data.age || '',
 sexe: sexe,
 sex: sexe,
 gender: sexe,
 
 // Pregnancy information - Include all field name variations
 pregnancyStatus: data.pregnancyStatus || 'not_specified',
 pregnancy_status: data.pregnancyStatus || 'not_specified',
 lastMenstrualPeriod: data.lastMenstrualPeriod || '',
 last_menstrual_period: data.lastMenstrualPeriod || '',
 gestationalAge: gestationalAge,
 gestational_age: gestationalAge,
 
 // Contact - Include all field name variations
 telephone: data.phone || '',
 phone: data.phone || '',
 phone_number: data.phone || '',
 phoneNumber: data.phone || '',
 email: data.email || '',
 adresse: data.address || '',
 address: data.address || '',
 ville: data.city || '',
 city: data.city || '',
 pays: data.country || 'Mauritius',
 country: data.country || 'Mauritius',
 
 // Medical data - Include all field name variations
 poids: data.weight || '',
 weight: data.weight || '',
 taille: data.height || '',
 height: data.height || '',
 allergies: allergiesArray.length > 0 ? allergiesArray : [], // ✅ Keep as ARRAY for API
 allergiesText: allergiesArray.join(', ') || 'No known allergies', // Add text version for display
 otherAllergies: data.otherAllergies || '',
 other_allergies: data.otherAllergies || '',
 antecedents: historyArray.join(', ') || 'No significant history',
 medicalHistory: historyArray,
 medical_history: historyArray,
 otherMedicalHistory: data.otherMedicalHistory || '',
 other_medical_history: data.otherMedicalHistory || '',
 // Current medications - parse text into array for API
 medicamentsActuels: data.currentMedicationsText || 'None',
 currentMedicationsText: data.currentMedicationsText || 'None',
 current_medications_text: data.currentMedicationsText || 'None',
 // Parse medications text into array (split by line breaks, filter empty)
 currentMedications: (() => {
 const parsed = data.currentMedicationsText 
 ? data.currentMedicationsText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
 : []
 console.log(' CLIENT DEBUG - PATIENT FORM:')
 console.log(' 📝 Raw medications text:', data.currentMedicationsText)
 console.log(' 📋 Parsed medications array:', parsed)
 console.log(' ✅ Medications is Array?:', Array.isArray(parsed))
 console.log(' Medications length:', parsed.length)
 console.log(' 🩹 Allergies array:', allergiesArray)
 console.log(' ✅ Allergies is Array?:', Array.isArray(allergiesArray))
 console.log(' Allergies length:', allergiesArray.length)
 return parsed
 })(),
 current_medications: data.currentMedicationsText 
 ? data.currentMedicationsText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
 : [],
 
 // LIFESTYLE HABITS - Include all possible field names and structures
 // Flat structure (for direct field access)
 smokingStatus: data.lifeHabits.smoking || 'Not specified',
 smoking_status: data.lifeHabits.smoking || 'Not specified',
 alcoholConsumption: data.lifeHabits.alcohol || 'Not specified',
 alcohol_consumption: data.lifeHabits.alcohol || 'Not specified',
 physicalActivity: data.lifeHabits.physicalActivity || 'Not specified',
 physical_activity: data.lifeHabits.physicalActivity || 'Not specified',
 
 // Nested structure in French (for compatibility)
 habitudes: {
 tabac: data.lifeHabits.smoking || 'Not specified',
 alcool: data.lifeHabits.alcohol || 'Not specified',
 activitePhysique: data.lifeHabits.physicalActivity || 'Not specified'
 },
 
 // Nested structure in English (for compatibility)
 lifeHabits: {
 smoking: data.lifeHabits.smoking || 'Not specified',
 alcohol: data.lifeHabits.alcohol || 'Not specified',
 physicalActivity: data.lifeHabits.physicalActivity || 'Not specified'
 },
 
 // Also include snake_case nested structure
 life_habits: {
 smoking: data.lifeHabits.smoking || 'Not specified',
 alcohol: data.lifeHabits.alcohol || 'Not specified',
 physical_activity: data.lifeHabits.physicalActivity || 'Not specified'
 }
 }
 }, [calculateGestationalAge])

 // ========== Event handlers ==========
 const handleInputChange = useCallback((field: keyof PatientFormData, value: any) => {
 setFormData(prev => ({ ...prev, [field]: value }))
 
 if (errors[field]) {
 setErrors(prev => {
 const newErrors = { ...prev }
 delete newErrors[field]
 return newErrors
 })
 }
 }, [errors])

 const handleLifeHabitsChange = useCallback((field: keyof LifeHabits, value: string) => {
 setFormData(prev => ({
 ...prev,
 lifeHabits: { ...prev.lifeHabits, [field]: value }
 }))
 }, [])

 const handleAllergyToggle = useCallback((allergy: string) => {
 setFormData(prev => ({
 ...prev,
 allergies: prev.allergies.includes(allergy)
 ? prev.allergies.filter(a => a !== allergy)
 : [...prev.allergies, allergy]
 }))
 }, [])

 const handleMedicalHistoryToggle = useCallback((condition: string) => {
 setFormData(prev => ({
 ...prev,
 medicalHistory: prev.medicalHistory.includes(condition)
 ? prev.medicalHistory.filter(h => h !== condition)
 : [...prev.medicalHistory, condition]
 }))
 }, [])

 const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
 if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
 e.preventDefault()
 const form = e.currentTarget.form
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

 // Required fields
 if (!formData.firstName.trim()) {
 newErrors.firstName = "First name is required"
 }
 
 if (!formData.lastName.trim()) {
 newErrors.lastName = "Last name is required"
 }
 
 if (!formData.birthDate) {
 newErrors.birthDate = "Birth date is required"
 } else {
 const birthDate = new Date(formData.birthDate)
 const today = new Date()
 if (birthDate > today) {
 newErrors.birthDate = "Birth date cannot be in the future"
 }
 }
 
 if (!formData.gender) {
 newErrors.gender = "Gender is required"
 }
 
 // Pregnancy status validation for females of childbearing age
 if (isChildbearingAge && !formData.pregnancyStatus) {
 newErrors.pregnancyStatus = "Pregnancy status is required for females aged 15-50"
 }
 
 const weight = parseFloat(formData.weight)
 if (!formData.weight || isNaN(weight) || weight < 1 || weight > 500) {
 newErrors.weight = "Valid weight is required (1-500 kg)"
 }
 
 const height = parseFloat(formData.height)
 if (!formData.height || isNaN(height) || height < 50 || height > 250) {
 newErrors.height = "Valid height is required (50-250 cm)"
 }

 // Email validation if provided
 if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
 newErrors.email = "Invalid email format"
 }

 setErrors(newErrors)
 return Object.keys(newErrors).length === 0
 }, [formData, isChildbearingAge])

 const handleSubmit = useCallback(() => {
 if (validateForm()) {
 // Validate consultation type selection
 if (!consultationType) {
 toast({
 title: "⚠️ Selection Required",
 description: "Please select the type of consultation (Normal or Chronic Disease Follow-up)",
 variant: "destructive"
 })
 // Scroll to consultation type selection
 const element = document.getElementById('consultation-type-section')
 if (element) {
 element.scrollIntoView({ behavior: 'smooth', block: 'center' })
 }
 return
 }
 
 // ========== USER CHOICE: CHRONIC DISEASE WORKFLOW ==========
 if (consultationType === 'chronic') {
 console.log(' User selected Chronic Disease Follow-up, redirecting to specialized workflow...')
 console.log('📋 Medical History:', formData.medicalHistory)

 // Get IDs from URL params to preserve for chronic disease workflow
 const params = new URLSearchParams(window.location.search)
 const consultationId = params.get('consultationId')
 const patientId = params.get('patientId')
 const doctorId = params.get('doctorId')

 console.log('🔑 Preserving IDs for chronic disease workflow:', { consultationId, patientId, doctorId })

 // Store patient data with IDs for chronic disease workflow
 const chronicData = {
 ...formData,
 consultationId,
 patientId,
 doctorId
 }
 sessionStorage.setItem('chronicDiseasePatientData', JSON.stringify(chronicData))
 sessionStorage.setItem('isChronicDiseaseWorkflow', 'true')

 // Redirect to chronic disease workflow
 window.location.href = '/chronic-disease'
 return
 }
 
 // ========== USER CHOICE: DERMATOLOGY WORKFLOW ==========
 if (consultationType === 'dermatology') {
 console.log('🔬 User selected Dermatology Consultation, redirecting to dermatology workflow...')

 // Get IDs from URL params to preserve for dermatology workflow
 const dermaParams = new URLSearchParams(window.location.search)
 const consultationId = dermaParams.get('consultationId')
 const patientId = dermaParams.get('patientId')
 const doctorId = dermaParams.get('doctorId')

 console.log('🔑 Preserving IDs for dermatology workflow:', { consultationId, patientId, doctorId })

 // Store patient data with IDs for dermatology workflow
 const dermatologyData = {
 ...formData,
 consultationId,
 patientId,
 doctorId
 }
 sessionStorage.setItem('dermatologyPatientData', JSON.stringify(dermatologyData))
 sessionStorage.setItem('isDermatologyWorkflow', 'true')

 // Redirect to dermatology workflow
 window.location.href = '/dermatology'
 return
 }
 
 // ========== NORMAL WORKFLOW ==========
 console.log(' User selected Normal Consultation, continuing standard workflow...')
 onNext()
 } else {
 // Scroll to first error
 const firstErrorField = Object.keys(errors)[0]
 const element = document.getElementById(firstErrorField)
 if (element) {
 element.scrollIntoView({ behavior: 'smooth', block: 'center' })
 element.focus()
 }
 }
 }, [validateForm, onNext, errors, formData, consultationType, toast])

 // ========== Effects ==========
 
 // Update age when birth date changes
 useEffect(() => {
 if (formData.birthDate) {
 const newAge = calculateAge(formData.birthDate)
 if (newAge !== formData.age) {
 setFormData(prev => ({ ...prev, age: newAge }))
 }
 }
 }, [formData.birthDate, formData.age, calculateAge])

 // Update gestational age when LMP changes
 useEffect(() => {
 if (formData.lastMenstrualPeriod && formData.pregnancyStatus === 'pregnant') {
 const gestAge = calculateGestationalAge(formData.lastMenstrualPeriod)
 if (gestAge !== formData.gestationalAge) {
 setFormData(prev => ({ ...prev, gestationalAge: gestAge }))
 }
 }
 }, [formData.lastMenstrualPeriod, formData.pregnancyStatus, formData.gestationalAge, calculateGestationalAge])

// Initialize data - FIXED VERSION
useEffect(() => {
 const initializeData = async () => {
 if (dataInitialized) return
 
 try {
 setIsLoading(true)
 
 const urlParams = new URLSearchParams(window.location.search)
 const source = urlParams.get('source')
 
 // CRITICAL FIX: Check if we're from TIBOK and WAIT for tibokPatient data
 if (source === 'tibok') {
 // If tibokPatient is available, use it (it's already normalized/translated)
 if (tibokPatient && tibokPatient.firstName) {
 console.log('✅ Using NORMALIZED data from tibokPatient hook')
 
 // Simple mapping functions for lifestyle values
 const mapSmokingStatus = (value: string): string => {
 if (!value) return ""
 const lowerValue = value.toLowerCase().trim()
 if (lowerValue.includes('current') || lowerValue.includes('smoker')) return 'actuel'
 if (lowerValue.includes('non') || lowerValue === 'never') return 'non'
 if (lowerValue.includes('ex') || lowerValue.includes('former')) return 'ancien'
 return value === 'actuel' || value === 'non' || value === 'ancien' ? value : ""
 }
 
 const mapAlcoholStatus = (value: string): string => {
 if (!value) return ""
 const lowerValue = value.toLowerCase().trim()
 if (lowerValue === 'never' || lowerValue === 'none') return 'jamais'
 if (lowerValue === 'occasional') return 'occasionnel'
 if (lowerValue === 'regular' || lowerValue === 'daily') return 'regulier'
 return value === 'jamais' || value === 'occasionnel' || value === 'regulier' ? value : ""
 }
 
 const mapPhysicalActivity = (value: string): string => {
 if (!value) return ""
 const lowerValue = value.toLowerCase().trim()
 if (lowerValue === 'sedentary' || lowerValue === 'none') return 'sedentaire'
 if (lowerValue === 'moderate') return 'moderee'
 if (lowerValue === 'intense' || lowerValue === 'high') return 'intense'
 return value === 'sedentaire' || value === 'moderee' || value === 'intense' ? value : ""
 }
 
 // IMPORTANT: tibokPatient data is ALREADY TRANSLATED by the hook!
 // We just need to use it directly
 const newFormData: PatientFormData = {
 firstName: tibokPatient.firstName || "",
 lastName: tibokPatient.lastName || "",
 birthDate: (tibokPatient.dateOfBirth || "").split('T')[0],
 age: tibokPatient.age?.toString() || "",
 gender: normalizeGender(tibokPatient.gender),
 pregnancyStatus: tibokPatient.pregnancyStatus || "",
 lastMenstrualPeriod: (tibokPatient.lastMenstrualPeriod || "").split('T')[0],
 gestationalAge: tibokPatient.gestationalAge || "",
 weight: tibokPatient.weight?.toString() || "",
 height: tibokPatient.height?.toString() || "",
 phone: tibokPatient.phone || "",
 email: tibokPatient.email || "",
 address: tibokPatient.address || "",
 city: tibokPatient.city || "",
 country: tibokPatient.country || "Mauritius",
 
 // THESE ARE ALREADY IN ENGLISH FROM THE HOOK!
 // The hook has already translated:
 // - "Autre allergies test" → "Other allergies test"
 // - "hypertension" → "Hypertension"
 // - "migraine" → "Migraine"
 allergies: tibokPatient.allergies || [],
 otherAllergies: tibokPatient.otherAllergies || "",
 medicalHistory: tibokPatient.medicalHistory || [],
 otherMedicalHistory: tibokPatient.otherMedicalHistory || "",
 currentMedicationsText: (() => {
 console.log(' CLIENT DEBUG - LOADING TIBOK CURRENT MEDICATIONS:')
 console.log(' 📦 tibokPatient.currentMedications:', tibokPatient.currentMedications)
 console.log(' 📋 Type:', typeof tibokPatient.currentMedications)
 console.log(' ✅ Has value?:', !!tibokPatient.currentMedications)
 return tibokPatient.currentMedications || ""
 })(),
 
 // Map lifestyle values to form's expected format
 lifeHabits: {
 smoking: mapSmokingStatus(tibokPatient.smokingStatus || ""),
 alcohol: mapAlcoholStatus(tibokPatient.alcoholConsumption || ""),
 physicalActivity: mapPhysicalActivity(tibokPatient.physicalActivity || "")
 }
 }
 
 console.log(' Setting form with TRANSLATED data:', {
 allergies: newFormData.allergies,
 otherAllergies: newFormData.otherAllergies,
 medicalHistory: newFormData.medicalHistory,
 otherMedicalHistory: newFormData.otherMedicalHistory
 })
 
 setFormData(newFormData)
 setDataInitialized(true)
 
 // Save the properly formatted data
 await consultationDataService.saveStepData(0, newFormData)
 
 } else if (!tibokPatient) {
 // If tibokPatient is not ready yet, DON'T process raw data
 // Just wait for the next render when tibokPatient will be available
 console.log('⏳ Waiting for tibokPatient data from hook...')
 setIsLoading(false)
 return // Exit early and wait
 }
 
 } else if (consultationId) {
 // For NON-TIBOK sources, load saved data normally
 const savedData = await consultationDataService.getAllData()
 if (savedData?.patientData) {
 setFormData(prev => ({
 ...prev,
 ...savedData.patientData
 }))
 setDataInitialized(true)
 }
 }
 
 } catch (error) {
 console.error('❌ Error initializing data:', error)
 } finally {
 setIsLoading(false)
 }
 }
 
 initializeData()
}, [consultationId, tibokPatient, dataInitialized, normalizeGender])

 // Auto-save
 useEffect(() => {
 const timer = setTimeout(async () => {
 if (formData.firstName || formData.lastName) {
 try {
 // 🔴 CRITICAL FIX: Transform data before saving
 const transformedData = transformDataForAPI(formData)
 await consultationDataService.saveStepData(0, transformedData)
 setLastSaved(new Date())
 onDataChange(transformedData)
 
 // ========== DEBUG LOGGING FOR CURRENT MEDICATIONS ==========
 console.log('🚀 PATIENT FORM - onDataChange called with:')
 console.log('   📋 currentMedications:', transformedData.currentMedications)
 console.log('   📋 current_medications:', transformedData.current_medications)
 console.log('   📝 currentMedicationsText:', transformedData.currentMedicationsText)
 console.log('   ✅ currentMedications is Array?:', Array.isArray(transformedData.currentMedications))
 console.log('   ✅ currentMedications length:', transformedData.currentMedications?.length || 0)
 } catch (error) {
 console.error('Error saving:', error)
 }
 }
 }, 1000)
 
 return () => clearTimeout(timer)
 }, [formData, onDataChange, transformDataForAPI])
 // ========== Conditional rendering ==========
 if (isLoading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center">
 <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
 <p className="text-gray-600">Loading patient data...</p>
 </div>
 </div>
 )
 }

 // ========== Calculated variables ==========
 const bmi = calculateBMI()
 const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null
 const progress = calculateProgress()
 const showTibokNotification = dataInitialized && isFromTibok

 const filteredAllergies = COMMON_ALLERGIES.filter(allergy =>
 allergy.toLowerCase().includes(allergySearch.toLowerCase())
 )

 const filteredHistory = COMMON_MEDICAL_HISTORY.filter(condition =>
 condition.toLowerCase().includes(historySearch.toLowerCase())
 )

 // ========== Main render ==========
 return (
 <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
 {/* TIBOK Notification */}
 {showTibokNotification && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className="flex items-center gap-2">
 <CheckCircle className="h-5 w-5 text-blue-600" />
 <p className="text-sm font-medium text-blue-800">
 Patient information retrieved from TIBOK for {formData.firstName} {formData.lastName}
 </p>
 </div>
 </div>
 )}

 {/* Header with progress */}
 <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
 <CardHeader className="text-center">
 <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
 <User className="h-8 w-8 text-blue-600" />
 Patient Information
 </CardTitle>
 <div className="mt-4 space-y-2">
 <div className="flex justify-between text-sm text-gray-600">
 <span>Form Progress</span>
 <span className="font-semibold">{progress}%</span>
 </div>
 <Progress value={progress} className="h-2" />
 </div>
 </CardHeader>
 </Card>

 {/* Quick navigation */}
 <div className="flex flex-wrap gap-2 justify-center">
 {SECTIONS.map((section, index) => (
 <button
 key={section.id}
 type="button"
 onClick={() => setCurrentSection(index)}
 className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
 currentSection === index
 ? "bg-blue-600 text-white shadow-lg"
 : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
 }`}
 >
 <section.icon className="h-4 w-4" />
 <span className="text-sm font-medium">{t(section.titleKey)}</span>
 </button>
 ))}
 </div>
 {/* Section 1: Identity */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <User className="h-6 w-6" />
 Personal Information
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label htmlFor="firstName" className="flex items-center gap-2 font-medium">
 First Name <span className="text-blue-500">*</span>
 </Label>
 <Input
 id="firstName"
 value={formData.firstName}
 onChange={(e) => handleInputChange("firstName", e.target.value)}
 onKeyDown={handleKeyDown}
 className={errors.firstName ? "border-blue-500" : ""}
 placeholder="John"
 />
 {errors.firstName && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.firstName}
 </p>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="lastName" className="flex items-center gap-2 font-medium">
 Last Name <span className="text-blue-500">*</span>
 </Label>
 <Input
 id="lastName"
 value={formData.lastName}
 onChange={(e) => handleInputChange("lastName", e.target.value)}
 onKeyDown={handleKeyDown}
 className={errors.lastName ? "border-blue-500" : ""}
 placeholder="Doe"
 />
 {errors.lastName && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.lastName}
 </p>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label htmlFor="birthDate" className="flex items-center gap-2 font-medium">
 Birth Date <span className="text-blue-500">*</span>
 </Label>
 <Input
 id="birthDate"
 type="date"
 value={formData.birthDate}
 onChange={(e) => handleInputChange("birthDate", e.target.value)}
 onKeyDown={handleKeyDown}
 className={errors.birthDate ? "border-blue-500" : ""}
 max={new Date().toISOString().split('T')[0]}
 />
 {errors.birthDate && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.birthDate}
 </p>
 )}
 </div>

 <div className="space-y-2">
 <Label className="font-medium">Calculated Age</Label>
 <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-gray-50">
 <span className="text-gray-700 font-medium">
 {formData.age ? `${formData.age} years` : "—"}
 </span>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <Label className="flex items-center gap-2 font-medium">
 Gender <span className="text-blue-500">*</span>
 </Label>
 
 <RadioGroup
 value={formData.gender}
 onValueChange={(value) => handleInputChange("gender", value)}
 >
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <label 
 htmlFor="gender-male"
 className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 formData.gender === 'Male' 
 ? "border-blue-500 bg-blue-50" 
 : "border-gray-200 hover:border-blue-300"
 }`}
 >
 <RadioGroupItem value="Male" id="gender-male" />
 <span className="text-sm font-medium">Male</span>
 </label>

 <label 
 htmlFor="gender-female"
 className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 formData.gender === 'Female' 
 ? "border-blue-500 bg-cyan-50" 
 : "border-gray-200 hover:border-blue-300"
 }`}
 >
 <RadioGroupItem value="Female" id="gender-female" />
 <span className="text-sm font-medium">Female</span>
 </label>
 </div>
 </RadioGroup>

 {errors.gender && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.gender}
 </p>
 )}
 </div>

 {/* PREGNANCY STATUS SECTION - NEW */}
 {isChildbearingAge && (
 <div className="space-y-4 p-4 bg-cyan-50 rounded-lg border border-blue-200">
 <Label className="flex items-center gap-2 font-medium text-cyan-800">
 <Baby className="h-4 w-4" />
 Pregnancy Information <span className="text-blue-500">*</span>
 </Label>
 
 <RadioGroup
 id="pregnancyStatus"
 value={formData.pregnancyStatus}
 onValueChange={(value) => handleInputChange("pregnancyStatus", value)}
 >
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <label 
 htmlFor="pregnancy-not"
 className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 formData.pregnancyStatus === 'not_pregnant' 
 ? "border-teal-500 bg-teal-50" 
 : "border-gray-200 hover:border-teal-300"
 }`}
 >
 <RadioGroupItem value="not_pregnant" id="pregnancy-not" />
 <span className="text-sm font-medium">Not pregnant</span>
 </label>

 <label 
 htmlFor="pregnancy-yes"
 className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 formData.pregnancyStatus === 'pregnant' 
 ? "border-blue-500 bg-cyan-100" 
 : "border-gray-200 hover:border-blue-300"
 }`}
 >
 <RadioGroupItem value="pregnant" id="pregnancy-yes" />
 <span className="text-sm font-medium">Currently pregnant</span>
 </label>

 <label 
 htmlFor="pregnancy-maybe"
 className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 formData.pregnancyStatus === 'possibly_pregnant' 
 ? "border-cyan-500 bg-cyan-50" 
 : "border-gray-200 hover:border-cyan-300"
 }`}
 >
 <RadioGroupItem value="possibly_pregnant" id="pregnancy-maybe" />
 <span className="text-sm font-medium">Possibly pregnant</span>
 </label>

 <label 
 htmlFor="pregnancy-breastfeeding"
 className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
 formData.pregnancyStatus === 'breastfeeding' 
 ? "border-blue-500 bg-blue-50" 
 : "border-gray-200 hover:border-blue-300"
 }`}
 >
 <RadioGroupItem value="breastfeeding" id="pregnancy-breastfeeding" />
 <span className="text-sm font-medium">Breastfeeding</span>
 </label>
 </div>
 </RadioGroup>

 {errors.pregnancyStatus && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.pregnancyStatus}
 </p>
 )}

 {/* Last Menstrual Period */}
 {(formData.pregnancyStatus === 'not_pregnant' || 
 formData.pregnancyStatus === 'possibly_pregnant' ||
 formData.pregnancyStatus === 'pregnant') && (
 <div className="space-y-2 mt-4">
 <Label htmlFor="lastMenstrualPeriod" className="flex items-center gap-2 font-medium">
 Last Menstrual Period (LMP)
 </Label>
 <Input
 id="lastMenstrualPeriod"
 type="date"
 value={formData.lastMenstrualPeriod}
 onChange={(e) => handleInputChange("lastMenstrualPeriod", e.target.value)}
 max={new Date().toISOString().split('T')[0]}
 className="border-blue-200"
 />
 {formData.pregnancyStatus === 'pregnant' && formData.gestationalAge && (
 <p className="text-sm text-cyan-700 font-medium">
 Gestational age: {formData.gestationalAge}
 </p>
 )}
 <p className="text-xs text-gray-600">
 Important for medication safety and diagnostic considerations
 </p>
 </div>
 )}

 {/* Pregnancy warning */}
 {(formData.pregnancyStatus === 'pregnant' || 
 formData.pregnancyStatus === 'possibly_pregnant') && (
 <div className="mt-4 p-3 bg-cyan-100 border border-cyan-400 rounded-lg">
 <div className="flex items-start gap-2">
 <AlertTriangle className="h-5 w-5 text-cyan-600 mt-0.5" />
 <div className="text-sm">
 <p className="font-semibold text-cyan-800">Important Medical Notice</p>
 <p className="text-cyan-700 mt-1">
 Your pregnancy status will be taken into account for all medical recommendations. 
 Some medications and examinations may be contraindicated or require special precautions.
 </p>
 <ul className="mt-2 text-cyan-700 list-disc list-inside">
 <li>Medications will be reviewed for pregnancy safety</li>
 <li>X-rays and CT scans will be avoided unless absolutely necessary</li>
 <li>Safe alternatives will be prioritized</li>
 </ul>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label htmlFor="weight" className="flex items-center gap-2 font-medium">
 Weight (kg) <span className="text-blue-500">*</span>
 </Label>
 <Input
 id="weight"
 type="number"
 value={formData.weight}
 onChange={(e) => handleInputChange("weight", e.target.value)}
 onKeyDown={handleKeyDown}
 min="1"
 max="500"
 step="0.1"
 className={errors.weight ? "border-blue-500" : ""}
 placeholder="70.5"
 />
 {errors.weight && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.weight}
 </p>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="height" className="flex items-center gap-2 font-medium">
 Height (cm) <span className="text-blue-500">*</span>
 </Label>
 <Input
 id="height"
 type="number"
 value={formData.height}
 onChange={(e) => handleInputChange("height", e.target.value)}
 onKeyDown={handleKeyDown}
 min="50"
 max="250"
 className={errors.height ? "border-blue-500" : ""}
 placeholder="175"
 />
 {errors.height && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.height}
 </p>
 )}
 </div>
 </div>

 {bmi && bmiCategory && (
 <div className={`p-4 rounded-lg border-2 ${bmiCategory.color} transition-all`}>
 <div className="flex items-center gap-3">
 <span className="text-2xl">{bmiCategory.icon}</span>
 <div>
 <p className="font-semibold">BMI: {bmi} kg/m²</p>
 <p className="text-sm">{bmiCategory.text}</p>
 {formData.pregnancyStatus === 'pregnant' && (
 <p className="text-xs text-gray-600 mt-1">
 Note: BMI interpretation may vary during pregnancy
 </p>
 )}
 </div>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 {/* Section 2: Contact */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Phone className="h-6 w-6" />
 Contact Information
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label htmlFor="phone" className="flex items-center gap-2 font-medium">
 <Phone className="h-4 w-4" />
 Phone Number
 </Label>
 <Input
 id="phone"
 type="tel"
 value={formData.phone}
 onChange={(e) => handleInputChange("phone", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="+230 5XXX XXXX"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="email" className="flex items-center gap-2 font-medium">
 <Mail className="h-4 w-4" />
 Email Address
 </Label>
 <Input
 id="email"
 type="email"
 value={formData.email}
 onChange={(e) => handleInputChange("email", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="patient@example.com"
 className={errors.email ? "border-blue-500" : ""}
 />
 {errors.email && (
 <p className="text-sm text-blue-500 flex items-center gap-1">
 <X className="h-3 w-3" />
 {errors.email}
 </p>
 )}
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="address" className="flex items-center gap-2 font-medium">
 <Home className="h-4 w-4" />
 Address
 </Label>
 <Textarea
 id="address"
 value={formData.address}
 onChange={(e) => handleInputChange("address", e.target.value)}
 placeholder="Enter your full address..."
 rows={2}
 className="resize-none"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label htmlFor="city" className="flex items-center gap-2 font-medium">
 <MapPin className="h-4 w-4" />
 City
 </Label>
 <Input
 id="city"
 value={formData.city}
 onChange={(e) => handleInputChange("city", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Port Louis"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="country" className="flex items-center gap-2 font-medium">
 <MapPin className="h-4 w-4" />
 Country
 </Label>
 <Input
 id="country"
 value={formData.country}
 onChange={(e) => handleInputChange("country", e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Mauritius"
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Section 3: Allergies */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <AlertTriangle className="h-6 w-6" />
 Known Allergies
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="relative">
 <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
 <Input
 placeholder="Search allergies..."
 value={allergySearch}
 onChange={(e) => setAllergySearch(e.target.value)}
 className="pl-10"
 />
 </div>

 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {filteredAllergies.map((allergy) => (
 <label
 key={allergy}
 className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
 formData.allergies.includes(allergy)
 ? "border-blue-400 bg-blue-50"
 : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
 }`}
 >
 <Checkbox
 checked={formData.allergies.includes(allergy)}
 onCheckedChange={() => handleAllergyToggle(allergy)}
 />
 <span className="text-sm font-medium">{allergy}</span>
 </label>
 ))}
 </div>

 <div className="space-y-2">
 <Label htmlFor="otherAllergies">Other Allergies</Label>
 <Textarea
 id="otherAllergies"
 value={formData.otherAllergies}
 onChange={(e) => handleInputChange("otherAllergies", e.target.value)}
 placeholder="List any other allergies not mentioned above..."
 rows={3}
 className="resize-none"
 />
 </div>

 {(formData.allergies.length > 0 || formData.otherAllergies) && (
 <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
 <div className="flex items-center gap-2 mb-3">
 <AlertTriangle className="h-5 w-5 text-blue-600" />
 <p className="font-semibold text-blue-800">Declared Allergies</p>
 </div>
 <div className="flex flex-wrap gap-2">
 {formData.allergies.map((allergy) => (
 <Badge key={allergy} variant="destructive" className="text-xs">
 {allergy}
 </Badge>
 ))}
 {formData.otherAllergies && (
 <Badge variant="destructive" className="text-xs">
 {formData.otherAllergies}
 </Badge>
 )}
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Section 4: Medical History */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Heart className="h-6 w-6" />
 Medical History
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="relative">
 <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
 <Input
 placeholder="Search medical conditions..."
 value={historySearch}
 onChange={(e) => setHistorySearch(e.target.value)}
 className="pl-10"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {filteredHistory.map((condition) => (
 <label
 key={condition}
 className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
 formData.medicalHistory.includes(condition)
 ? "border-blue-400 bg-blue-50"
 : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
 }`}
 >
 <Checkbox
 checked={formData.medicalHistory.includes(condition)}
 onCheckedChange={() => handleMedicalHistoryToggle(condition)}
 />
 <span className="text-sm font-medium">{condition}</span>
 </label>
 ))}
 </div>

 <div className="space-y-2">
 <Label htmlFor="otherMedicalHistory">Other Medical History</Label>
 <Textarea
 id="otherMedicalHistory"
 value={formData.otherMedicalHistory}
 onChange={(e) => handleInputChange("otherMedicalHistory", e.target.value)}
 placeholder="List any other medical conditions, surgeries, or hospitalizations..."
 rows={3}
 className="resize-none"
 />
 </div>

 {(formData.medicalHistory.length > 0 || formData.otherMedicalHistory) && (
 <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
 <div className="flex items-center gap-2 mb-3">
 <Heart className="h-5 w-5 text-blue-600" />
 <p className="font-semibold text-blue-800">Declared Medical History</p>
 </div>
 <div className="flex flex-wrap gap-2">
 {formData.medicalHistory.map((condition) => (
 <Badge key={condition} className="bg-blue-100 text-blue-800 text-xs">
 {condition}
 </Badge>
 ))}
 {formData.otherMedicalHistory && (
 <Badge className="bg-blue-100 text-blue-800 text-xs">
 Other
 </Badge>
 )}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
{/* Section 5: Current Medications */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Pill className="h-6 w-6" />
 Current Medications
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-4">
 <div className="space-y-2">
 <Label htmlFor="currentMedicationsText">Ongoing Treatments</Label>
 <Textarea
 id="currentMedicationsText"
 value={formData.currentMedicationsText}
 onChange={(e) => handleInputChange("currentMedicationsText", e.target.value)}
 onBlur={async () => {
 // Auto-translate on blur if text contains French patterns
 const text = formData.currentMedicationsText
 const frenchPatterns = [
 /\bfois\b/i, /\bpar jour\b/i, /\bcomprimé/i, 
 /\bmatin\b/i, /\bsoir\b/i, /\bmidi\b/i,
 /\bavant\b/i, /\baprès\b/i, /\brepas\b/i
 ]
 
 if (text && frenchPatterns.some(pattern => pattern.test(text))) {
 console.log(' French medication detected, translating...')
 const translated = await translateMedications(text)
 if (translated !== text) {
 handleInputChange("currentMedicationsText", translated)
 toast({
 title: "✅ Medications Translated",
 description: "French medications have been translated to English",
 duration: 3000
 })
 }
 }
 }}
 placeholder="List all medications you are currently taking...
Example:
- Aspirin 100mg - once daily
- Metformin 500mg - twice daily"
 rows={6}
 className="font-mono text-sm"
 />
 <p className="text-xs text-gray-500">
 Please include medication name, dosage, and frequency
 {isFromTibok && (
 <span className="block text-blue-600 mt-1">
 ℹ️ Medications will be auto-translated from French if needed
 </span>
 )}
 </p>
 {formData.pregnancyStatus === 'pregnant' && (
 <p className="text-xs text-cyan-600 font-medium">
 ⚠️ Current medications will be reviewed for pregnancy safety
 </p>
 )}
 </div>

 {formData.currentMedicationsText && (
 <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
 <div className="flex items-center gap-2">
 <Check className="h-5 w-5 text-teal-600" />
 <p className="font-semibold text-teal-800">
 Treatments entered (
 {formData.currentMedicationsText.split('\n').filter(line => line.trim()).length} 
 {' '}lines)
 </p>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Section 6: Lifestyle */}
 <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
 <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-t-lg">
 <CardTitle className="flex items-center gap-3">
 <Activity className="h-6 w-6" />
 Lifestyle
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {/* Tobacco */}
 <div className="space-y-4">
 <Label className="font-medium text-lg flex items-center gap-2">
 🚬 Tobacco Use
 </Label>
 <RadioGroup
 value={formData.lifeHabits.smoking}
 onValueChange={(value) => handleLifeHabitsChange("smoking", value)}
 >
 {SMOKING_OPTIONS.map(option => (
 <label 
 key={option.value}
 className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
 formData.lifeHabits.smoking === option.value
 ? "border-cyan-400 bg-blue-50"
 : "border-gray-200 hover:border-cyan-300"
 }`}
 >
 <RadioGroupItem value={option.value} id={`smoking-${option.value}`} />
 <span className="text-sm font-medium">{option.label}</span>
 </label>
 ))}
 </RadioGroup>
 {formData.pregnancyStatus === 'pregnant' && formData.lifeHabits.smoking === 'actuel' && (
 <p className="text-xs text-blue-600 font-medium">
 ⚠️ Smoking during pregnancy increases health risks
 </p>
 )}
 </div>

 {/* Alcohol */}
 <div className="space-y-4">
 <Label className="font-medium text-lg flex items-center gap-2">
 🍷 Alcohol Consumption
 </Label>
 <RadioGroup
 value={formData.lifeHabits.alcohol}
 onValueChange={(value) => handleLifeHabitsChange("alcohol", value)}
 >
 {ALCOHOL_OPTIONS.map(option => (
 <label 
 key={option.value}
 className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
 formData.lifeHabits.alcohol === option.value
 ? "border-cyan-400 bg-blue-50"
 : "border-gray-200 hover:border-cyan-300"
 }`}
 >
 <RadioGroupItem value={option.value} id={`alcohol-${option.value}`} />
 <span className="text-sm font-medium">{option.label}</span>
 </label>
 ))}
 </RadioGroup>
 {formData.pregnancyStatus === 'pregnant' && 
 (formData.lifeHabits.alcohol === 'occasionnel' || formData.lifeHabits.alcohol === 'regulier') && (
 <p className="text-xs text-blue-600 font-medium">
 ⚠️ No safe level of alcohol during pregnancy
 </p>
 )}
 </div>

 {/* Physical Activity */}
 <div className="space-y-4">
 <Label className="font-medium text-lg flex items-center gap-2">
 🏃 Physical Activity
 </Label>
 <RadioGroup
 value={formData.lifeHabits.physicalActivity}
 onValueChange={(value) => handleLifeHabitsChange("physicalActivity", value)}
 >
 {ACTIVITY_OPTIONS.map(option => (
 <label 
 key={option.value}
 className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
 formData.lifeHabits.physicalActivity === option.value
 ? "border-cyan-400 bg-blue-50"
 : "border-gray-200 hover:border-cyan-300"
 }`}
 >
 <RadioGroupItem value={option.value} id={`activity-${option.value}`} />
 <span className="text-sm font-medium">{option.label}</span>
 </label>
 ))}
 </RadioGroup>
 {formData.pregnancyStatus === 'pregnant' && (
 <p className="text-xs text-blue-600 font-medium">
 Moderate exercise is generally safe during pregnancy
 </p>
 )}
 </div>
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

 {/* CONSULTATION TYPE SELECTION */}
 <Card id="consultation-type-section" className="shadow-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50">
 <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-600 text-white">
 <CardTitle className="flex items-center gap-3 text-2xl">
 <Activity className="h-7 w-7" />
 Type of Consultation
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8">
 <p className="text-gray-700 mb-6 text-lg font-medium">
 Please select the type of consultation you wish to perform:
 </p>
 
 <RadioGroup 
 value={consultationType} 
 onValueChange={(value) => setConsultationType(value as 'normal' | 'chronic' | 'dermatology')}
 className="space-y-4"
 >
 {/* Normal Consultation Option */}
 <label 
 className={`flex items-start gap-4 p-6 rounded-xl border-3 transition-all cursor-pointer ${
 consultationType === 'normal'
 ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]"
 : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
 }`}
 >
 <RadioGroupItem value="normal" id="consultation-normal" className="mt-1" />
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <span className="text-2xl"></span>
 <span className="font-bold text-xl text-blue-900">Normal Consultation</span>
 </div>
 <p className="text-gray-600 text-sm leading-relaxed">
 Standard medical consultation for acute symptoms, infections, injuries, or general health concerns.
 Suitable for new complaints, check-ups, and non-chronic conditions.
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
 <Badge variant="secondary" className="bg-blue-100 text-blue-800">
 Acute symptoms
 </Badge>
 <Badge variant="secondary" className="bg-blue-100 text-blue-800">
 Infections
 </Badge>
 <Badge variant="secondary" className="bg-blue-100 text-blue-800">
 General check-up
 </Badge>
 </div>
 </div>
 </label>

 {/* Chronic Disease Follow-up Option */}
 <label 
 className={`flex items-start gap-4 p-6 rounded-xl border-3 transition-all cursor-pointer ${
 consultationType === 'chronic'
 ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]"
 : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
 }`}
 >
 <RadioGroupItem value="chronic" id="consultation-chronic" className="mt-1" />
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <span className="text-2xl"></span>
 <span className="font-bold text-xl text-blue-900">Chronic Disease Follow-up</span>
 </div>
 <p className="text-gray-600 text-sm leading-relaxed">
 Specialized consultation for chronic disease management. Includes detailed assessment, 
 treatment plan optimization, lifestyle counseling, and long-term follow-up scheduling.
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
 <Badge variant="secondary" className="bg-blue-100 text-blue-800">
 Diabetes
 </Badge>
 <Badge variant="secondary" className="bg-blue-100 text-blue-800">
 Hypertension
 </Badge>
 <Badge variant="secondary" className="bg-blue-100 text-blue-800">
 Obesity
 </Badge>
 <Badge variant="secondary" className="bg-blue-100 text-blue-800">
 Dyslipidemia
 </Badge>
 </div>
 </div>
 </label>

 {/* Dermatology Consultation Option */}
 <label 
 className={`flex items-start gap-4 p-6 rounded-xl border-3 transition-all cursor-pointer ${
 consultationType === 'dermatology'
 ? "border-teal-500 bg-teal-50 shadow-lg scale-[1.02]"
 : "border-gray-300 hover:border-teal-400 hover:bg-teal-50/50"
 }`}
 >
 <RadioGroupItem value="dermatology" id="consultation-dermatology" className="mt-1" />
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <span className="text-2xl">🔬</span>
 <span className="font-bold text-xl text-teal-900">Dermatology Consultation</span>
 </div>
 <p className="text-gray-600 text-sm leading-relaxed">
 Specialized dermatological consultation with image analysis. Upload photos of skin conditions 
 for AI-powered analysis by a dermatology specialist, followed by comprehensive diagnosis and treatment plan.
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
 <Badge variant="secondary" className="bg-teal-100 text-teal-800">
 Skin lesions
 </Badge>
 <Badge variant="secondary" className="bg-teal-100 text-teal-800">
 Rashes
 </Badge>
 <Badge variant="secondary" className="bg-teal-100 text-teal-800">
 Image analysis
 </Badge>
 <Badge variant="secondary" className="bg-teal-100 text-teal-800">
 AI-powered OCR
 </Badge>
 </div>
 </div>
 </label>
 </RadioGroup>

 {consultationType && (
 <div className="mt-6 p-4 bg-white rounded-lg border-l-4 border-teal-500">
 <div className="flex items-center gap-2 text-teal-700">
 <Check className="h-5 w-5" />
 <span className="font-medium">
 {consultationType === 'normal' 
 ? '✅ Normal Consultation selected - Standard medical workflow'
 : consultationType === 'chronic'
 ? '✅ Chronic Disease Follow-up selected - Specialized management workflow'
 : '✅ Dermatology Consultation selected - Image analysis and specialized diagnosis'}
 </span>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Submit button */}
 <div className="flex justify-center pt-6">
 <Button 
 type="submit"
 size="lg"
 disabled={!consultationType}
 className={`px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 ${
 consultationType === 'chronic'
 ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
 : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700'
 } ${!consultationType ? 'opacity-50 cursor-not-allowed' : ''}`}
 >
 {consultationType === 'chronic' 
 ? 'Continue to Chronic Disease Management'
 : consultationType === 'dermatology'
 ? 'Continue to Dermatology Analysis'
 : 'Continue to Clinical Information'}
 <ArrowRight className="h-5 w-5 ml-2" />
 </Button>
 </div>
 </form>
 )
}
