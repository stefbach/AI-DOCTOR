// app/api/openai-questions/route.ts - VERSION 2.1 ADAPTÉE POUR START-CONSULTATION
import { type NextRequest, NextResponse } from "next/server"

// Configuration
export const runtime = 'edge'
export const preferredRegion = 'auto'

// ==================== TYPES & INTERFACES ====================
// ADAPTÉES AUX DONNÉES DE START-CONSULTATION
interface PatientData {
  // Demographics
  firstName?: string
  lastName?: string
  age: string | number
  gender: string
  weight?: string | number
  height?: string | number
  
  // NEW: Pregnancy information
  pregnancyStatus?: string
  lastMenstrualPeriod?: string
  gestationalAge?: string
  
  // Medical History
  allergies?: string[]
  medicalHistory?: string[]
  currentMedications?: string
  currentMedicationsText?: string // Alternative field name
  
  // Lifestyle - STRUCTURE DE START-CONSULTATION
  lifeHabits?: {
    smoking?: string
    alcohol?: string
    physicalActivity?: string
  }
  // Alternative naming for compatibility
  smokingStatus?: string
  alcoholConsumption?: string
  physicalActivity?: string
  
  // Contact info (optional)
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
}

interface ClinicalData {
  // Chief Complaint
  chiefComplaint: string
  diseaseHistory?: string
  symptomDuration?: string
  symptoms?: string[]
  painScale?: string | number
  
  // Vital Signs
  vitalSigns?: {
    temperature?: string | number
    bloodPressureSystolic?: string | number
    bloodPressureDiastolic?: string | number
  }
}

interface MedicalContext {
  patient: ProcessedPatientData
  clinical: ProcessedClinicalData
  riskFactors: RiskFactor[]
  criticalityScore: number
  redFlags: string[]
  suggestedSpecialty?: string
}

interface ProcessedPatientData {
  age: number
  gender: 'Male' | 'Female' | 'Other'
  bmi?: number
  bmiCategory?: string
  
  hasChronicConditions: boolean
  chronicConditions: string[]
  
  hasAllergies: boolean
  allergiesList: string[]
  
  onMedications: boolean
  medicationsList: string[]
  
  riskProfile: {
    cardiovascular: 'low' | 'medium' | 'high'
    diabetes: 'low' | 'medium' | 'high'
    respiratory: 'low' | 'medium' | 'high'
  }
  
  lifestyle: {
    smoking: 'non' | 'current' | 'former' | 'unknown'
    alcohol: 'none' | 'occasional' | 'regular' | 'heavy' | 'unknown'
    exercise: 'sedentary' | 'moderate' | 'active' | 'unknown'
  }
  
  // NEW: Pregnancy data
  pregnancyStatus?: string
  lastMenstrualPeriod?: string
  gestationalAge?: string
  isPregnant?: boolean
  isChildbearingAge?: boolean
}

interface ProcessedClinicalData {
  mainComplaint: string
  complaintCategory: string
  symptomsList: string[]
  duration: {
    value: string
    urgency: 'immediate' | 'urgent' | 'semi-urgent' | 'routine'
  }
  
  painLevel: number
  painCategory: 'none' | 'mild' | 'moderate' | 'severe' | 'extreme'
  
  vitals: {
    temperature?: number
    tempStatus?: 'hypothermia' | 'normal' | 'fever' | 'high-fever'
    bloodPressure?: string
    bpStatus?: 'hypotension' | 'normal' | 'pre-hypertension' | 'hypertension' | 'crisis'
    heartRate?: number
    hrStatus?: 'bradycardia' | 'normal' | 'tachycardia'
  }
  
  evolution?: string
  aggravatingFactors?: string[]
  relievingFactors?: string[]
}

interface RiskFactor {
  factor: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  relatedTo: string
}

interface DiagnosticQuestion {
  id: number
  question: string
  options: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  rationale?: string
  redFlagDetection?: boolean
  clinicalRelevance?: string
}

interface APIResponse {
  success: boolean
  questions: DiagnosticQuestion[]
  analysis: {
    mode: string
    adjustedMode?: string
    criticalityScore: number
    redFlags: string[]
    riskFactors: RiskFactor[]
    suggestedSpecialty?: string
    urgencyLevel: string
    triageCategory: string
  }
  recommendations: {
    immediateAction?: string[]
    followUp?: string
    additionalTests?: string[]
    specialistReferral?: string
  }
  dataProtection: {
    enabled: boolean
    anonymousId: string
    method: string
    compliance: string[]
  }
  metadata: {
    model: string
    processingTime: number
    dataCompleteness: number
    confidenceLevel: number
  }
}

// ==================== MEDICAL KNOWLEDGE BASE ====================
const SYMPTOM_CATEGORIES = {
  cardiovascular: ['chest pain', 'palpitations', 'shortness of breath', 'leg swelling', 'irregular heartbeat'],
  respiratory: ['cough', 'wheezing', 'difficulty breathing', 'chest tightness', 'sputum'],
  neurological: ['headache', 'dizziness', 'confusion', 'numbness', 'tingling', 'memory problems'],
  gastrointestinal: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating'],
  musculoskeletal: ['back pain', 'joint pain', 'muscle pain', 'joint stiffness', 'muscle weakness'],
  dermatological: ['rash', 'itching', 'skin lesions', 'dry skin', 'skin discoloration'],
  psychiatric: ['anxiety', 'depression', 'insomnia', 'mood swings', 'irritability'],
  constitutional: ['fever', 'fatigue', 'weight loss', 'night sweats', 'chills', 'loss of appetite']
}

const RED_FLAGS = {
  cardiovascular: [
    { symptom: 'chest pain with exertion', severity: 'critical' },
    { symptom: 'radiating chest pain', severity: 'critical' },
    { symptom: 'chest pain with dyspnea', severity: 'critical' },
    { symptom: 'syncope', severity: 'high' }
  ],
  neurological: [
    { symptom: 'thunderclap headache', severity: 'critical' },
    { symptom: 'headache with fever and neck stiffness', severity: 'critical' },
    { symptom: 'sudden confusion', severity: 'high' },
    { symptom: 'sudden numbness or weakness', severity: 'high' }
  ],
  gastrointestinal: [
    { symptom: 'rigid abdomen', severity: 'critical' },
    { symptom: 'blood in stool', severity: 'high' },
    { symptom: 'persistent vomiting', severity: 'high' },
    { symptom: 'severe dehydration', severity: 'high' }
  ],
  // NEW: Pregnancy-specific red flags
  obstetric: [
    { symptom: 'severe abdominal pain in pregnancy', severity: 'critical' },
    { symptom: 'vaginal bleeding in pregnancy', severity: 'critical' },
    { symptom: 'severe headache with visual changes in pregnancy', severity: 'critical' },
    { symptom: 'persistent vomiting in pregnancy', severity: 'high' }
  ]
}

const DURATION_URGENCY_MAP: Record<string, 'immediate' | 'urgent' | 'semi-urgent' | 'routine'> = {
  'less_hour': 'immediate',
  '1_6_hours': 'urgent',
  '6_24_hours': 'urgent',
  '1_3_days': 'semi-urgent',
  '3_7_days': 'semi-urgent',
  '1_4_weeks': 'routine',
  '1_6_months': 'routine',
  'more_6_months': 'routine'
}

// ==================== ENHANCED CACHE SYSTEM ====================
class EnhancedCache {
  private cache = new Map<string, { data: any, timestamp: number }>()
  private maxSize = 100
  private maxAge = 3600000 // 1 hour

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    })
  }

  generateKey(patient: PatientData, clinical: ClinicalData, mode: string): string {
    const dataStr = JSON.stringify({
      age: patient.age,
      gender: patient.gender,
      complaint: clinical.chiefComplaint,
      symptoms: clinical.symptoms,
      duration: clinical.symptomDuration,
      mode
    })
    
    // Simple hash function for Edge Runtime (no crypto module)
    let hash = 0
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `cache_${Math.abs(hash)}_${mode}`
  }
}

const cache = new EnhancedCache()

// ==================== DATA PROCESSING FUNCTIONS ====================
function processPatientData(patient: PatientData): ProcessedPatientData {
  // SAFE TYPE CONVERSION
  const age = typeof patient.age === 'string' ? parseInt(patient.age) || 0 : patient.age || 0
  const weight = typeof patient.weight === 'string' ? parseFloat(patient.weight) || 0 : patient.weight || 0
  const height = typeof patient.height === 'string' ? parseFloat(patient.height) || 0 : patient.height || 0
  
  // Calculate BMI
  let bmi: number | undefined
  let bmiCategory: string | undefined
  if (weight > 0 && height > 0) {
    const heightInMeters = height / 100
    bmi = weight / (heightInMeters * heightInMeters)
    
    if (bmi < 18.5) bmiCategory = 'underweight'
    else if (bmi < 25) bmiCategory = 'normal'
    else if (bmi < 30) bmiCategory = 'overweight'
    else bmiCategory = 'obese'
  }
  
  // Process chronic conditions - SÉCURISÉ
  const chronicConditions = Array.isArray(patient.medicalHistory) 
    ? patient.medicalHistory.filter(h => typeof h === 'string' && h.trim() !== '')
    : []
  const hasChronicConditions = chronicConditions.length > 0
  
  // Process allergies - SÉCURISÉ
  const allergiesList = Array.isArray(patient.allergies)
    ? patient.allergies.filter(a => typeof a === 'string' && a.trim() !== '')
    : []
  const hasAllergies = allergiesList.length > 0
  
  // Process medications - GESTION DES DEUX FORMATS
  let medicationsText = patient.currentMedications || patient.currentMedicationsText || ''
  if (typeof medicationsText !== 'string') {
    medicationsText = ''
  }
  
  const medicationsList = medicationsText 
    ? medicationsText.split(/[,\n]/).map(m => m.trim()).filter(Boolean)
    : []
  const onMedications = medicationsList.length > 0
  
  // Calculate risk profiles
  const riskProfile = calculateRiskProfile(age, chronicConditions, patient.lifeHabits, bmi)
  
  // Process lifestyle - ADAPTÉ À START-CONSULTATION
  const lifestyle = processLifestyle(patient.lifeHabits || {
    smoking: patient.smokingStatus,
    alcohol: patient.alcoholConsumption,
    physicalActivity: patient.physicalActivity
  })
  
  // PREGNANCY PROCESSING
  const isChildbearingAge = age >= 15 && age <= 50
  const isPregnant = patient.pregnancyStatus === 'pregnant' || 
                    patient.pregnancyStatus === 'currently_pregnant' ||
                    patient.pregnancyStatus === 'possibly_pregnant'
  
  return {
    age,
    gender: normalizeGender(patient.gender),
    bmi,
    bmiCategory,
    hasChronicConditions,
    chronicConditions,
    hasAllergies,
    allergiesList,
    onMedications,
    medicationsList,
    riskProfile,
    lifestyle,
    // NEW: Pregnancy fields
    pregnancyStatus: patient.pregnancyStatus,
    lastMenstrualPeriod: patient.lastMenstrualPeriod,
    gestationalAge: patient.gestationalAge,
    isPregnant,
    isChildbearingAge
  }
}

function processClinicalData(clinical: ClinicalData): ProcessedClinicalData {
  // SAFE STRING PROCESSING
  const mainComplaint = typeof clinical.chiefComplaint === 'string' 
    ? clinical.chiefComplaint.trim() 
    : ''
    
  const symptomsList = Array.isArray(clinical.symptoms) 
    ? clinical.symptoms.filter(s => typeof s === 'string' && s.trim() !== '')
    : []
    
  const complaintCategory = categorizeComplaint(mainComplaint, symptomsList)
  
  // Process duration - SAFE
  const durationValue = typeof clinical.symptomDuration === 'string' 
    ? clinical.symptomDuration 
    : 'unknown'
    
  const duration = {
    value: durationValue,
    urgency: DURATION_URGENCY_MAP[durationValue] || 'semi-urgent' as const
  }
  
  // Process pain - SAFE CONVERSION
  let painLevel = 0
  if (typeof clinical.painScale === 'string') {
    const parsed = parseInt(clinical.painScale)
    painLevel = isNaN(parsed) ? 0 : Math.max(0, Math.min(10, parsed))
  } else if (typeof clinical.painScale === 'number') {
    painLevel = Math.max(0, Math.min(10, clinical.painScale))
  }
  
  let painCategory: 'none' | 'mild' | 'moderate' | 'severe' | 'extreme'
  if (painLevel === 0) painCategory = 'none'
  else if (painLevel <= 3) painCategory = 'mild'
  else if (painLevel <= 6) painCategory = 'moderate'
  else if (painLevel <= 8) painCategory = 'severe'
  else painCategory = 'extreme'
  
  // Process vitals
  const vitals = processVitalSigns(clinical.vitalSigns)
  
  return {
    mainComplaint,
    complaintCategory,
    symptomsList,
    duration,
    painLevel,
    painCategory,
    vitals,
    evolution: typeof clinical.diseaseHistory === 'string' 
      ? clinical.diseaseHistory 
      : undefined
  }
}

function processVitalSigns(vitals?: ClinicalData['vitalSigns']) {
  if (!vitals) return {}
  
  const result: ProcessedClinicalData['vitals'] = {}
  
  // Temperature (ALL VALUES IN CELSIUS)
  if (vitals.temperature !== null && vitals.temperature !== undefined) {
    const temp = typeof vitals.temperature === 'string' 
      ? parseFloat(vitals.temperature) 
      : vitals.temperature
    
    if (!isNaN(temp) && temp > 30 && temp < 45) {
      result.temperature = temp
      
      // Temperature thresholds in Celsius:
      if (temp < 36.1) result.tempStatus = 'hypothermia'      
      else if (temp <= 37.2) result.tempStatus = 'normal'     
      else if (temp <= 38.5) result.tempStatus = 'fever'      
      else result.tempStatus = 'high-fever'                   
    }
  }
  
  // Blood pressure
  if (vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic) {
    const sys = typeof vitals.bloodPressureSystolic === 'string' 
      ? parseInt(vitals.bloodPressureSystolic) 
      : vitals.bloodPressureSystolic
    
    const dia = typeof vitals.bloodPressureDiastolic === 'string' 
      ? parseInt(vitals.bloodPressureDiastolic) 
      : vitals.bloodPressureDiastolic
    
    if (!isNaN(sys) && !isNaN(dia)) {
      result.bloodPressure = `${sys}/${dia}`
      
      if (sys < 90 || dia < 60) result.bpStatus = 'hypotension'
      else if (sys < 120 && dia < 80) result.bpStatus = 'normal'
      else if (sys < 140 && dia < 90) result.bpStatus = 'pre-hypertension'
      else if (sys < 180 && dia < 120) result.bpStatus = 'hypertension'
      else result.bpStatus = 'crisis'
    }
  }
  
  return result
}

// ==================== RISK ASSESSMENT ====================
function calculateRiskProfile(
  age: number, 
  conditions: string[], 
  lifestyle?: PatientData['lifeHabits'],
  bmi?: number
) {
  const profile = {
    cardiovascular: 'low' as 'low' | 'medium' | 'high',
    diabetes: 'low' as 'low' | 'medium' | 'high',
    respiratory: 'low' as 'low' | 'medium' | 'high'
  }
  
  // Cardiovascular risk
  let cvRisk = 0
  if (age > 65) cvRisk++
  if (age > 75) cvRisk++
  if (conditions.some(c => c.toLowerCase().includes('hypertension'))) cvRisk += 2
  if (conditions.some(c => c.toLowerCase().includes('heart'))) cvRisk += 3
  if (conditions.some(c => c.toLowerCase().includes('diabetes'))) cvRisk++
  
  // LIFESTYLE RISK - SAFE ACCESS
  if (lifestyle?.smoking === 'actuel' || lifestyle?.smoking === 'current') cvRisk += 2
  if (bmi && bmi > 30) cvRisk++
  
  if (cvRisk >= 4) profile.cardiovascular = 'high'
  else if (cvRisk >= 2) profile.cardiovascular = 'medium'
  
  // Diabetes risk
  let dmRisk = 0
  if (conditions.some(c => c.toLowerCase().includes('diabetes'))) dmRisk += 5
  if (age > 45) dmRisk++
  if (bmi && bmi > 25) dmRisk++
  if (bmi && bmi > 30) dmRisk++
  if (lifestyle?.physicalActivity === 'sedentaire' || lifestyle?.physicalActivity === 'sedentary') dmRisk++
  
  if (dmRisk >= 4) profile.diabetes = 'high'
  else if (dmRisk >= 2) profile.diabetes = 'medium'
  
  // Respiratory risk
  let respRisk = 0
  if (conditions.some(c => c.toLowerCase().includes('asthma'))) respRisk += 3
  if (conditions.some(c => c.toLowerCase().includes('copd'))) respRisk += 3
  if (lifestyle?.smoking === 'actuel' || lifestyle?.smoking === 'current') respRisk += 3
  if (lifestyle?.smoking === 'ancien' || lifestyle?.smoking === 'former') respRisk++
  
  if (respRisk >= 3) profile.respiratory = 'high'
  else if (respRisk >= 2) profile.respiratory = 'medium'
  
  return profile
}

function calculateCriticalityScore(
  patient: ProcessedPatientData, 
  clinical: ProcessedClinicalData
): number {
  let score = 0
  
  // Age factor
  if (patient.age > 75) score += 2
  else if (patient.age > 65) score += 1
  else if (patient.age < 2) score += 2
  
  // Pregnancy factor
  if (patient.isPregnant) score += 1
  
  // Vital signs
  if (clinical.vitals.tempStatus === 'high-fever') score += 2
  else if (clinical.vitals.tempStatus === 'fever') score += 1
  else if (clinical.vitals.tempStatus === 'hypothermia') score += 3
  
  if (clinical.vitals.bpStatus === 'crisis') score += 4
  else if (clinical.vitals.bpStatus === 'hypertension') score += 2
  else if (clinical.vitals.bpStatus === 'hypotension') score += 3
  
  // Pain level
  if (clinical.painLevel >= 9) score += 3
  else if (clinical.painLevel >= 7) score += 2
  else if (clinical.painLevel >= 5) score += 1
  
  // Duration urgency
  if (clinical.duration.urgency === 'immediate') score += 3
  else if (clinical.duration.urgency === 'urgent') score += 2
  else if (clinical.duration.urgency === 'semi-urgent') score += 1
  
  // Symptoms severity
  const criticalSymptoms = [
    'chest pain', 'difficulty breathing', 'confusion', 'syncope',
    'severe bleeding', 'unconscious', 'seizure'
  ]
  
  clinical.symptomsList.forEach(symptom => {
    if (typeof symptom === 'string') {
      if (criticalSymptoms.some(cs => symptom.toLowerCase().includes(cs))) {
        score += 2
      }
    }
  })
  
  // Risk factors
  if (patient.riskProfile.cardiovascular === 'high') score += 2
  else if (patient.riskProfile.cardiovascular === 'medium') score += 1
  
  // Chronic conditions
  if (patient.hasChronicConditions) score += 1
  
  return Math.min(score, 10) // Cap at 10
}

function detectRedFlags(
  patient: ProcessedPatientData, 
  clinical: ProcessedClinicalData
): string[] {
  const flags: string[] = []
  
  // Check symptom-based red flags
  Object.entries(RED_FLAGS).forEach(([category, categoryFlags]) => {
    categoryFlags.forEach(flag => {
      const hasSymptom = clinical.symptomsList.some(s => 
        typeof s === 'string' && s.toLowerCase().includes(flag.symptom.toLowerCase())
      ) || (typeof clinical.mainComplaint === 'string' && 
           clinical.mainComplaint.toLowerCase().includes(flag.symptom.toLowerCase()))
      
      if (hasSymptom) {
        flags.push(`${flag.severity.toUpperCase()}: ${flag.symptom}`)
      }
    })
  })
  
  // PREGNANCY-SPECIFIC RED FLAGS
  if (patient.isPregnant) {
    if (clinical.symptomsList.some(s => 
      typeof s === 'string' && s.toLowerCase().includes('bleeding'))) {
      flags.push('CRITICAL: Bleeding in pregnancy')
    }
    
    if (clinical.painLevel >= 7 && clinical.complaintCategory === 'gastrointestinal') {
      flags.push('HIGH: Severe abdominal pain in pregnancy')
    }
    
    if (clinical.vitals.bpStatus === 'hypertension' || clinical.vitals.bpStatus === 'crisis') {
      flags.push('HIGH: Hypertension in pregnancy (preeclampsia risk)')
    }
  }
  
  // Check vital signs red flags
  if (clinical.vitals.tempStatus === 'high-fever') {
    flags.push('HIGH: High fever (>38.5°C)')
  }
  
  if (clinical.vitals.bpStatus === 'crisis') {
    flags.push('CRITICAL: Hypertensive crisis')
  } else if (clinical.vitals.bpStatus === 'hypotension') {
    flags.push('HIGH: Hypotension')
  }
  
  // Check pain red flags
  if (clinical.painLevel >= 9) {
    flags.push('HIGH: Extreme pain (9-10/10)')
  }
  
  // Check duration red flags
  if (clinical.duration.urgency === 'immediate' && clinical.painLevel >= 7) {
    flags.push('CRITICAL: Acute severe pain')
  }
  
  return flags
}

// ==================== HELPER FUNCTIONS ====================
function normalizeGender(gender: string): 'Male' | 'Female' | 'Other' {
  if (!gender || typeof gender !== 'string') return 'Other'
  
  const g = gender.toLowerCase().trim()
  if (['m', 'male', 'homme', 'man'].includes(g)) return 'Male'
  if (['f', 'female', 'femme', 'woman'].includes(g)) return 'Female'
  
  return 'Other'
}

function processLifestyle(habits?: PatientData['lifeHabits']): ProcessedPatientData['lifestyle'] {
  const mapSmoking = (value?: string): 'non' | 'current' | 'former' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = value.toLowerCase().trim()
    
    if (['non', 'non-smoker', 'never'].includes(v)) return 'non'
    if (['actuel', 'current', 'current-smoker', 'smoker'].includes(v)) return 'current'
    if (['ancien', 'ex-smoker', 'former', 'former-smoker'].includes(v)) return 'former'
    
    return 'unknown'
  }
  
  const mapAlcohol = (value?: string): 'none' | 'occasional' | 'regular' | 'heavy' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = value.toLowerCase().trim()
    
    if (['jamais', 'never', 'none'].includes(v)) return 'none'
    if (['occasionnel', 'occasional', 'sometimes'].includes(v)) return 'occasional'
    if (['regulier', 'regular', 'daily'].includes(v)) return 'regular'
    if (['heavy', 'excessive'].includes(v)) return 'heavy'
    
    return 'unknown'
  }
  
  const mapExercise = (value?: string): 'sedentary' | 'moderate' | 'active' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = value.toLowerCase().trim()
    
    if (['sedentaire', 'sedentary', 'none'].includes(v)) return 'sedentary'
    if (['moderee', 'moderate', 'regular'].includes(v)) return 'moderate'
    if (['intense', 'active', 'high'].includes(v)) return 'active'
    
    return 'unknown'
  }
  
  return {
    smoking: mapSmoking(habits?.smoking),
    alcohol: mapAlcohol(habits?.alcohol),
    exercise: mapExercise(habits?.physicalActivity)
  }
}

function categorizeComplaint(complaint: string, symptoms: string[]): string {
  // SAFE STRING PROCESSING
  const cleanComplaint = typeof complaint === 'string' ? complaint : ''
  const cleanSymptoms = Array.isArray(symptoms) 
    ? symptoms.filter(s => typeof s === 'string' && s.trim() !== '')
    : []
  
  const allText = `${cleanComplaint} ${cleanSymptoms.join(' ')}`.toLowerCase()
  
  for (const [category, keywords] of Object.entries(SYMPTOM_CATEGORIES)) {
    if (keywords.some(keyword => allText.includes(keyword))) {
      return category
    }
  }
  
  return 'general'
}

function suggestSpecialty(category: string, redFlags: string[], isPregnant: boolean = false): string | undefined {
  if (redFlags.some(f => f.includes('CRITICAL'))) {
    return 'Emergency Medicine'
  }
  
  // Pregnancy takes priority
  if (isPregnant) {
    return 'Obstetrics/Gynecology'
  }
  
  const specialtyMap: Record<string, string> = {
    cardiovascular: 'Cardiology',
    respiratory: 'Pulmonology',
    neurological: 'Neurology',
    gastrointestinal: 'Gastroenterology',
    musculoskeletal: 'Orthopedics/Rheumatology',
    dermatological: 'Dermatology',
    psychiatric: 'Psychiatry',
    constitutional: 'Internal Medicine'
  }
  
  return specialtyMap[category] || 'Internal Medicine'
}

function calculateUrgencyLevel(criticalityScore: number, isPregnant: boolean = false): string {
  // Pregnancy adjustment
  let adjustedScore = criticalityScore
  if (isPregnant) adjustedScore += 1
  
  if (adjustedScore >= 8) return 'IMMEDIATE - Emergency care required'
  if (adjustedScore >= 6) return 'URGENT - See provider within 24 hours'
  if (adjustedScore >= 4) return 'SEMI-URGENT - See provider within 48-72 hours'
  if (adjustedScore >= 2) return 'ROUTINE - Schedule appointment'
  return 'ROUTINE - Telehealth appropriate'
}

function getTriageCategory(criticalityScore: number, isPregnant: boolean = false): string {
  let adjustedScore = criticalityScore
  if (isPregnant) adjustedScore += 1
  
  if (adjustedScore >= 8) return 'ESI-1: Resuscitation'
  if (adjustedScore >= 6) return 'ESI-2: Emergent'
  if (adjustedScore >= 4) return 'ESI-3: Urgent'
  if (adjustedScore >= 2) return 'ESI-4: Semi-urgent'
  return 'ESI-5: Non-urgent'
}

// ==================== PROMPT GENERATION ====================
function generateModeSpecificPrompt(
  mode: string,
  context: MedicalContext
): string {
  const { patient, clinical } = context
  
  switch (mode) {
    case 'fast':
      return generateFastModePrompt(patient, clinical, context)
    case 'balanced':
      return generateBalancedModePrompt(patient, clinical, context)
    case 'intelligent':
      return generateIntelligentModePrompt(patient, clinical, context)
    default:
      return generateBalancedModePrompt(patient, clinical, context)
  }
}

function generateFastModePrompt(
  patient: ProcessedPatientData,
  clinical: ProcessedClinicalData,
  context: MedicalContext
): string {
  const pregnancyAlert = patient.isPregnant ? '\n⚠️ PATIENT IS PREGNANT - Consider obstetric emergencies' : ''
  
  return `EMERGENCY TRIAGE ASSESSMENT - RAPID MODE

PATIENT: ${patient.age}y ${patient.gender}${patient.isPregnant ? ' (PREGNANT)' : ''}
CHIEF COMPLAINT: ${clinical.mainComplaint}
DURATION: ${clinical.duration.value}
PAIN: ${clinical.painLevel}/10
RED FLAGS: ${context.redFlags.length > 0 ? context.redFlags.join(', ') : 'None identified'}${pregnancyAlert}

Generate 3 CRITICAL triage questions to rapidly identify life-threatening conditions.

Focus ONLY on:
1. Ruling out immediate life threats
2. Identifying need for emergency intervention
3. Detecting critical red flags
${patient.isPregnant ? '4. Pregnancy-specific emergencies (preeclampsia, placental abruption, ectopic pregnancy)' : ''}

Each question must:
- Be answerable with simple yes/no or quick selection
- Target specific emergency conditions
- Help determine if immediate medical attention needed
${patient.isPregnant ? '- Consider pregnancy safety' : ''}

Format:
{
  "questions": [
    {
      "id": 1,
      "question": "Direct question targeting critical symptom",
      "options": ["Yes", "No", "Not sure", "Sometimes"],
      "priority": "critical",
      "redFlagDetection": true,
      "clinicalRelevance": "Why this matters for immediate triage"
    }
  ]
}

Generate exactly 3 questions. Response must be valid JSON only.`
}

function generateBalancedModePrompt(
  patient: ProcessedPatientData,
  clinical: ProcessedClinicalData,
  context: MedicalContext
): string {
  const medicalHistoryStr = patient.hasChronicConditions 
    ? `\nCHRONIC CONDITIONS: ${patient.chronicConditions.join(', ')}`
    : ''
  
  const medicationsStr = patient.onMedications
    ? `\nCURRENT MEDICATIONS: ${patient.medicationsList.join(', ')}`
    : ''
  
  // PREGNANCY INFORMATION
  const pregnancyStr = patient.isPregnant && patient.gender === 'Female'
    ? `\n⚠️ PREGNANCY STATUS: ${patient.pregnancyStatus}${
        patient.lastMenstrualPeriod ? `, LMP: ${patient.lastMenstrualPeriod}` : ''
      }${
        patient.gestationalAge ? `, Gestational age: ${patient.gestationalAge}` : ''
      }`
    : ''
  
  const vitalsStr = clinical.vitals.temperature || clinical.vitals.bloodPressure
    ? `\nVITALS: Temp: ${clinical.vitals.temperature}°C (${clinical.vitals.tempStatus}), BP: ${clinical.vitals.bloodPressure} (${clinical.vitals.bpStatus})`
    : ''
    
  return `CLINICAL DIAGNOSTIC ASSESSMENT - STANDARD MODE

PATIENT PROFILE:
- Demographics: ${patient.age}y ${patient.gender}, BMI: ${patient.bmi?.toFixed(1)} (${patient.bmiCategory})
- Risk Profile: CV-${patient.riskProfile.cardiovascular}, DM-${patient.riskProfile.diabetes}, Resp-${patient.riskProfile.respiratory}${medicalHistoryStr}${medicationsStr}${pregnancyStr}
- Lifestyle: Smoking-${patient.lifestyle.smoking}, Alcohol-${patient.lifestyle.alcohol}, Exercise-${patient.lifestyle.exercise}

CLINICAL PRESENTATION:
- Chief Complaint: ${clinical.mainComplaint}
- Category: ${clinical.complaintCategory}
- Duration: ${clinical.duration.value} (${clinical.duration.urgency})
- Symptoms: ${clinical.symptomsList.join(', ')}
- Pain: ${clinical.painLevel}/10 (${clinical.painCategory})${vitalsStr}
- Evolution: ${clinical.evolution || 'Not specified'}

ASSESSMENT:
- Criticality Score: ${context.criticalityScore}/10
- Red Flags: ${context.redFlags.join(', ') || 'None'}
- Risk Factors: ${context.riskFactors.map(r => `${r.factor}(${r.severity})`).join(', ')}

${patient.isPregnant ? `
⚠️ PREGNANCY CONSIDERATIONS:
- All medications must be pregnancy-safe (Category A/B preferred)
- Avoid teratogenic drugs and procedures
- Consider physiological changes of pregnancy
- Assess for pregnancy-specific conditions (preeclampsia, gestational diabetes, etc.)
- Normal pregnancy symptoms vs pathological conditions
` : ''}

Generate 5 diagnostic questions following standard clinical protocol:

1. ONE question to characterize the primary symptom (OPQRST method)
2. ONE question to screen for serious complications
3. TWO questions to differentiate between likely diagnoses
4. ONE question about functional impact or associated symptoms

${patient.isPregnant ? 'IMPORTANT: Include pregnancy-specific considerations in your questions.' : ''}

Each question must:
- Be clinically relevant to the presentation
- Help narrow the differential diagnosis
- Use appropriate medical terminology with lay explanations
- Include 4 specific answer options
${patient.isPregnant ? '- Consider pregnancy safety when relevant' : ''}

Format:
{
  "questions": [
    {
      "id": 1,
      "question": "Clear clinical question",
      "options": ["Specific option 1", "Specific option 2", "Specific option 3", "None of these"],
      "priority": "high",
      "rationale": "Clinical reasoning for this question",
      "clinicalRelevance": "How this helps diagnosis"
    }
  ]
}

Generate exactly 5 questions. Response must be valid JSON only.`
}

function generateIntelligentModePrompt(
  patient: ProcessedPatientData,
  clinical: ProcessedClinicalData,
  context: MedicalContext
): string {
  const allergiesStr = patient.hasAllergies
    ? `\nALLERGIES: ${patient.allergiesList.join(', ')}`
    : '\nALLERGIES: None known'
    
  const fullMedicalHistory = patient.chronicConditions.length > 0
    ? patient.chronicConditions.map(c => `• ${c}`).join('\n')
    : 'No significant past medical history'
    
  const fullMedications = patient.medicationsList.length > 0
    ? patient.medicationsList.map(m => `• ${m}`).join('\n')
    : 'No current medications'
  
  // DETAILED PREGNANCY SECTION
  const pregnancySection = patient.isPregnant ? `

⚠️ ═══════════════════════════════════════════════════════════
PREGNANCY STATUS - CRITICAL MEDICAL CONSIDERATIONS
═══════════════════════════════════════════════════════════
- Status: ${patient.pregnancyStatus}
- Last Menstrual Period: ${patient.lastMenstrualPeriod || 'Not provided'}
- Gestational Age: ${patient.gestationalAge || 'To be calculated'}
- Pregnancy Category for Medications: MUST be considered for ALL drugs
- Teratogenic Risk Assessment: Required for any diagnostic procedures
- Physiological Changes: Cardiovascular, respiratory, renal adaptations
- Pregnancy-Specific Conditions to Rule Out:
  • Preeclampsia/HELLP syndrome
  • Gestational diabetes
  • Placental abruption
  • Ectopic pregnancy (if early)
  • Hyperemesis gravidarum
  • Deep vein thrombosis (increased risk)
  • Pulmonary embolism (increased risk)
═══════════════════════════════════════════════════════════
` : ''
  
  return `COMPREHENSIVE SPECIALIST CONSULTATION - EXPERT MODE

═══════════════════════════════════════════════════════════
COMPLETE PATIENT ASSESSMENT
═══════════════════════════════════════════════════════════

DEMOGRAPHICS & ANTHROPOMETRICS:
- Age: ${patient.age} years
- Sex/Gender: ${patient.gender}
- BMI: ${patient.bmi?.toFixed(2)} kg/m² (${patient.bmiCategory})
- Body Surface Area (est): ${patient.bmi ? Math.sqrt((patient.age * 70) / 3600).toFixed(2) : 'N/A'} m²

PAST MEDICAL HISTORY:
${fullMedicalHistory}

MEDICATIONS:
${fullMedications}
${allergiesStr}

SOCIAL HISTORY:
- Tobacco: ${patient.lifestyle.smoking} ${patient.lifestyle.smoking === 'current' ? '⚠️ ACTIVE SMOKER' : ''}
- Alcohol: ${patient.lifestyle.alcohol}
- Physical Activity: ${patient.lifestyle.exercise}
- Occupation/Stress: To be assessed

FAMILY HISTORY: To be assessed

CURRENT PRESENTATION:
═══════════════════════════════════════════════════════════
Chief Complaint: "${clinical.mainComplaint}"
Onset: ${clinical.duration.value} ago
Character: ${clinical.painCategory} pain (${clinical.painLevel}/10)
Course: ${clinical.evolution || 'Progressive'}

REVIEW OF SYSTEMS:
${clinical.symptomsList.map(s => `• ${s}`).join('\n')}

VITAL SIGNS:
- Temperature: ${clinical.vitals.temperature || 'Not measured'}°C ${clinical.vitals.tempStatus ? `(${clinical.vitals.tempStatus})` : ''}
- Blood Pressure: ${clinical.vitals.bloodPressure || 'Not measured'} ${clinical.vitals.bpStatus ? `(${clinical.vitals.bpStatus})` : ''}
- Heart Rate: ${clinical.vitals.heartRate || 'Not measured'} bpm
- Respiratory Rate: Not measured
- O2 Saturation: Not measured

RISK STRATIFICATION:
═══════════════════════════════════════════════════════════
Criticality Score: ${context.criticalityScore}/10
Cardiovascular Risk: ${patient.riskProfile.cardiovascular.toUpperCase()}
Diabetes Risk: ${patient.riskProfile.diabetes.toUpperCase()}
Respiratory Risk: ${patient.riskProfile.respiratory.toUpperCase()}

IDENTIFIED RED FLAGS:
${context.redFlags.length > 0 ? context.redFlags.map(f => `⚠️ ${f}`).join('\n') : '✓ No immediate red flags identified'}

DIFFERENTIAL DIAGNOSIS CONSIDERATIONS:
Based on presentation, consider:
${generateDifferentialDiagnosis(clinical.complaintCategory, clinical.symptomsList, patient.isPregnant)}${pregnancySection}

═══════════════════════════════════════════════════════════
EXPERT DIAGNOSTIC QUESTIONING REQUIRED
═══════════════════════════════════════════════════════════

Generate 8 sophisticated diagnostic questions that:

1. MUST explore rare but serious conditions (zebras)
2. MUST assess for systemic/autoimmune conditions
3. MUST evaluate medication side effects if applicable
4. MUST screen for psychiatric comorbidities
5. MUST investigate genetic/familial patterns
6. MUST assess functional status and quality of life
7. MUST identify reversible causes
8. MUST determine need for urgent vs routine evaluation
${patient.isPregnant ? '9. MUST consider pregnancy-specific conditions and safety' : ''}

Requirements for each question:
- Use precise medical terminology WITH patient-friendly explanations
- Include 4 highly specific differential options
- Explain the diagnostic value of each question
- Indicate if positive response requires urgent action
- Consider age and gender-specific conditions
- Account for existing comorbidities
${patient.isPregnant ? '- ALWAYS consider pregnancy safety and specific conditions' : ''}

Format:
{
  "questions": [
    {
      "id": 1,
      "question": "Sophisticated clinical question with explanation",
      "options": [
        "Very specific option 1",
        "Very specific option 2", 
        "Very specific option 3",
        "None of the above/Not applicable"
      ],
      "priority": "high",
      "rationale": "Detailed clinical reasoning",
      "redFlagDetection": true/false,
      "clinicalRelevance": "How this changes management"
    }
  ]
}

Generate exactly 8 expert-level questions. Response must be valid JSON only.`
}

function generateDifferentialDiagnosis(category: string, symptoms: string[], isPregnant: boolean = false): string {
  const differentials: string[] = []
  
  // Add pregnancy-specific differentials first if applicable
  if (isPregnant) {
    differentials.push('0. Pregnancy-related conditions (preeclampsia, gestational diabetes, etc.)')
  }
  
  // Add category-specific differentials
  switch (category) {
    case 'cardiovascular':
      differentials.push(
        '1. Acute Coronary Syndrome (STEMI/NSTEMI/UA)',
        '2. Pulmonary Embolism',
        '3. Aortic Dissection',
        '4. Pericarditis/Myocarditis',
        '5. Congestive Heart Failure exacerbation'
      )
      break
    case 'respiratory':
      differentials.push(
        '1. Community-Acquired Pneumonia',
        '2. Acute Bronchitis',
        '3. COPD/Asthma Exacerbation',
        '4. Pulmonary Embolism',
        '5. Pneumothorax'
      )
      break
    case 'neurological':
      differentials.push(
        '1. Migraine vs Tension Headache',
        '2. Subarachnoid Hemorrhage',
        '3. Meningitis/Encephalitis',
        '4. Temporal Arteritis',
        '5. Space-Occupying Lesion'
      )
      break
    case 'gastrointestinal':
      differentials.push(
        '1. Acute Gastroenteritis',
        '2. Inflammatory Bowel Disease',
        '3. Peptic Ulcer Disease',
        '4. Gallbladder Disease',
        '5. Appendicitis'
      )
      if (isPregnant) {
        differentials.push('6. Hyperemesis Gravidarum')
      }
      break
    default:
      differentials.push(
        '1. Most likely diagnosis based on symptoms',
        '2. Common alternative diagnosis',
        '3. Serious condition to rule out',
        '4. Rare but possible diagnosis'
      )
  }
  
  return differentials.join('\n')
}

// ==================== RECOMMENDATION FUNCTIONS ====================
function generateRecommendations(
  context: MedicalContext,
  mode: string
): APIResponse['recommendations'] {
  const recommendations: APIResponse['recommendations'] = {}
  const { patient, clinical } = context
  
  // Immediate actions for high criticality
  if (context.criticalityScore >= 7) {
    recommendations.immediateAction = [
      'Call emergency services (911) if symptoms worsen',
      'Do not drive yourself to the hospital',
      'Have someone stay with you',
      'Prepare list of current medications'
    ]
    
    if (patient.isPregnant) {
      recommendations.immediateAction.push('Inform emergency services that you are pregnant')
    }
  } else if (context.criticalityScore >= 5) {
    recommendations.immediateAction = [
      'Seek medical attention within 24 hours',
      'Monitor symptoms closely',
      'Rest and avoid strenuous activity'
    ]
    
    if (patient.isPregnant) {
      recommendations.immediateAction.push('Contact your obstetrician or midwife')
    }
  }
  
  // Follow-up recommendations
  if (context.criticalityScore >= 4) {
    recommendations.followUp = patient.isPregnant 
      ? 'Schedule urgent appointment with obstetrician and primary care'
      : 'Schedule urgent appointment with primary care or specialist'
  } else {
    recommendations.followUp = patient.isPregnant
      ? 'Schedule routine follow-up with obstetrician if symptoms persist'
      : 'Schedule routine follow-up if symptoms persist or worsen'
  }
  
  // Additional tests based on presentation
  const tests: string[] = []
  if (clinical.complaintCategory === 'cardiovascular') {
    tests.push('ECG', 'Troponin', 'Chest X-ray')
    if (!patient.isPregnant) {
      tests.push('D-dimer if PE suspected')
    } else {
      tests.push('Consider ultrasound instead of X-ray if possible')
    }
  } else if (clinical.complaintCategory === 'respiratory') {
    tests.push('Pulse oximetry', 'Peak flow if asthma')
    if (!patient.isPregnant) {
      tests.push('Chest X-ray')
    } else {
      tests.push('Chest X-ray only if essential (with abdominal shielding)')
    }
  } else if (clinical.complaintCategory === 'neurological' && !patient.isPregnant) {
    tests.push('CT head if trauma', 'MRI if persistent symptoms')
  }
  
  if (patient.isPregnant) {
    tests.push('Urine dipstick for protein/glucose', 'Blood pressure monitoring')
  }
  
  if (tests.length > 0) {
    recommendations.additionalTests = tests
  }
  
  // Specialist referral
  if (context.suggestedSpecialty && context.criticalityScore >= 3) {
    recommendations.specialistReferral = patient.isPregnant && context.suggestedSpecialty !== 'Emergency Medicine'
      ? 'Obstetrics/Gynecology + ' + context.suggestedSpecialty
      : context.suggestedSpecialty
  }
  
  return recommendations
}

function calculateDataCompleteness(patient: ProcessedPatientData, clinical: ProcessedClinicalData): number {
  let fieldsProvided = 0
  let totalFields = 0
  
  // Check patient data
  const patientFields = ['age', 'gender', 'bmi', 'chronicConditions', 'allergiesList', 'medicationsList']
  patientFields.forEach(field => {
    totalFields++
    if ((patient as any)[field]) fieldsProvided++
  })
  
  // Check clinical data
  const clinicalFields = ['mainComplaint', 'symptomsList', 'duration', 'painLevel', 'vitals']
  clinicalFields.forEach(field => {
    totalFields++
    if ((clinical as any)[field]) fieldsProvided++
  })
  
  // Pregnancy fields if applicable
  if (patient.isChildbearingAge && patient.gender === 'Female') {
    totalFields++
    if (patient.pregnancyStatus) fieldsProvided++
  }
  
  return Math.round((fieldsProvided / totalFields) * 100)
}

function calculateConfidenceLevel(
  dataCompleteness: number,
  mode: string,
  criticalityScore: number,
  isPregnant: boolean = false
): number {
  let confidence = dataCompleteness
  
  // Adjust based on mode
  if (mode === 'intelligent') confidence += 10
  else if (mode === 'balanced') confidence += 5
  
  // Adjust based on criticality (lower confidence for critical cases without full data)
  if (criticalityScore >= 7 && dataCompleteness < 80) {
    confidence -= 20
  }
  
  // Pregnancy considerations
  if (isPregnant && dataCompleteness < 90) {
    confidence -= 10 // Higher data requirements for pregnant patients
  }
  
  return Math.max(20, Math.min(95, confidence))
}

// ==================== DATA PROTECTION ====================
function anonymizeData(patient: PatientData): {
  anonymized: PatientData,
  anonymousId: string,
  removedFields: string[]
} {
  // Generate anonymous ID without crypto module
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const anonymousId = `ANON-${timestamp}-${random}`
  
  const anonymized = { ...patient }
  const removedFields: string[] = []
  
  // Remove PII
  const sensitiveFields = ['firstName', 'lastName', 'email', 'phone', 'address']
  sensitiveFields.forEach(field => {
    if ((anonymized as any)[field]) {
      delete (anonymized as any)[field]
      removedFields.push(field)
    }
  })
  
  return { anonymized, anonymousId, removedFields }
}

// ==================== MAIN API HANDLER ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Validate API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Invalid or missing OpenAI API key')
    }
    
    // 2. Parse request
    const body = await request.json()
    const { patientData, clinicalData, mode = 'balanced' } = body
    
    // ENHANCED DEBUG LOGGING
    console.log('🔍 COMPREHENSIVE DEBUG - API Input:', {
      patientData: {
        type: typeof patientData,
        keys: patientData ? Object.keys(patientData) : null,
        firstName: patientData?.firstName,
        gender: patientData?.gender,
        pregnancyStatus: patientData?.pregnancyStatus,
        lifeHabits: patientData?.lifeHabits,
        smokingStatus: patientData?.smokingStatus
      },
      clinicalData: {
        type: typeof clinicalData,
        keys: clinicalData ? Object.keys(clinicalData) : null,
        chiefComplaint: {
          type: typeof clinicalData?.chiefComplaint,
          value: clinicalData?.chiefComplaint
        },
        symptoms: {
          isArray: Array.isArray(clinicalData?.symptoms),
          type: typeof clinicalData?.symptoms,
          length: clinicalData?.symptoms?.length,
          sample: clinicalData?.symptoms?.slice(0, 2)
        }
      }
    })
    
    if (!patientData || !clinicalData) {
      return NextResponse.json(
        { error: 'Missing required data: patientData and clinicalData are required', success: false },
        { status: 400 }
      )
    }
    
    // 3. Check cache
    const cacheKey = cache.generateKey(patientData, clinicalData, mode)
    const cached = cache.get(cacheKey)
    if (cached) {
      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          fromCache: true,
          processingTime: Date.now() - startTime
        }
      })
    }
    
    // 4. Anonymize data
    const { anonymized, anonymousId, removedFields } = anonymizeData(patientData)
    
    // 5. Process data
    const processedPatient = processPatientData(anonymized)
    const processedClinical = processClinicalData(clinicalData)
    
    console.log('✅ Processed data:', {
      patient: {
        age: processedPatient.age,
        gender: processedPatient.gender,
        isPregnant: processedPatient.isPregnant,
        pregnancyStatus: processedPatient.pregnancyStatus
      },
      clinical: {
        complaint: processedClinical.mainComplaint,
        symptoms: processedClinical.symptomsList.length,
        category: processedClinical.complaintCategory
      }
    })
    
    // 6. Risk assessment
    const riskFactors: RiskFactor[] = []
    
    // Add risk factors based on patient profile
    if (processedPatient.riskProfile.cardiovascular !== 'low') {
      riskFactors.push({
        factor: 'Cardiovascular risk',
        severity: processedPatient.riskProfile.cardiovascular,
        relatedTo: 'Patient profile'
      })
    }
    
    if (processedPatient.lifestyle.smoking === 'current') {
      riskFactors.push({
        factor: 'Active smoking',
        severity: processedPatient.isPregnant ? 'critical' : 'high',
        relatedTo: 'Lifestyle'
      })
    }
    
    if (processedPatient.bmiCategory === 'obese') {
      riskFactors.push({
        factor: 'Obesity',
        severity: 'medium',
        relatedTo: 'Physical health'
      })
    }
    
    // Pregnancy-specific risk factors
    if (processedPatient.isPregnant) {
      riskFactors.push({
        factor: 'Pregnancy status',
        severity: 'medium',
        relatedTo: 'Physiological state'
      })
      
      if (processedPatient.lifestyle.alcohol !== 'none') {
        riskFactors.push({
          factor: 'Alcohol use in pregnancy',
          severity: 'critical',
          relatedTo: 'Lifestyle'
        })
      }
    }
    
    // 7. Calculate scores
    const criticalityScore = calculateCriticalityScore(processedPatient, processedClinical)
    const redFlags = detectRedFlags(processedPatient, processedClinical)
    const suggestedSpecialty = suggestSpecialty(
      processedClinical.complaintCategory, 
      redFlags, 
      processedPatient.isPregnant
    )
    
    // 8. Auto-adjust mode if critical
    let adjustedMode = mode
    if (criticalityScore >= 8 && mode !== 'intelligent') {
      adjustedMode = 'intelligent'
      console.log(`⚠️ Auto-escalated to intelligent mode due to criticality: ${criticalityScore}`)
    } else if (criticalityScore <= 2 && mode === 'intelligent' && !processedPatient.isPregnant) {
      adjustedMode = 'balanced'
      console.log(`📉 Optimized to balanced mode for routine case`)
    }
    
    // Pregnancy always gets at least balanced mode
    if (processedPatient.isPregnant && adjustedMode === 'fast') {
      adjustedMode = 'balanced'
      console.log(`👶 Upgraded to balanced mode due to pregnancy`)
    }
    
    // 9. Create context
    const context: MedicalContext = {
      patient: processedPatient,
      clinical: processedClinical,
      riskFactors,
      criticalityScore,
      redFlags,
      suggestedSpecialty
    }
    
    // 10. Generate prompt
    const prompt = generateModeSpecificPrompt(adjustedMode, context)
    
    // 11. Call OpenAI
    const aiConfig = {
      fast: { model: 'gpt-3.5-turbo', temperature: 0.1, maxTokens: 600 },
      balanced: { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 1000 },
      intelligent: { model: 'gpt-4o', temperature: 0.3, maxTokens: 1500 }
    }[adjustedMode] || { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 1000 }
    
    console.log(`🤖 Calling ${aiConfig.model} with ${adjustedMode} mode`)
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert physician conducting a thorough clinical assessment. Generate diagnostic questions based on evidence-based medicine. Always respond with valid JSON only. ${processedPatient.isPregnant ? 'IMPORTANT: This patient is pregnant - consider pregnancy-specific conditions and medication safety.' : ''}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: { type: 'json_object' }
      }),
    })
    
    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }
    
    const aiData = await openaiResponse.json()
    const content = aiData.choices[0]?.message?.content || '{}'
    
    let parsed
    try {
      parsed = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      throw new Error('Invalid response format from AI')
    }
    
    const questions = parsed.questions || []
    
    // 12. Calculate metadata
    const dataCompleteness = calculateDataCompleteness(processedPatient, processedClinical)
    const confidenceLevel = calculateConfidenceLevel(
      dataCompleteness, 
      adjustedMode, 
      criticalityScore,
      processedPatient.isPregnant
    )
    
    // 13. Generate recommendations
    const recommendations = generateRecommendations(context, adjustedMode)
    
    // 14. Build response
    const response: APIResponse = {
      success: true,
      questions,
      analysis: {
        mode,
        adjustedMode: adjustedMode !== mode ? adjustedMode : undefined,
        criticalityScore,
        redFlags,
        riskFactors,
        suggestedSpecialty,
        urgencyLevel: calculateUrgencyLevel(criticalityScore, processedPatient.isPregnant),
        triageCategory: getTriageCategory(criticalityScore, processedPatient.isPregnant)
      },
      recommendations,
      dataProtection: {
        enabled: true,
        anonymousId,
        method: 'field_removal',
        compliance: ['GDPR', 'HIPAA']
      },
      metadata: {
        model: aiConfig.model,
        processingTime: Date.now() - startTime,
        dataCompleteness,
        confidenceLevel
      }
    }
    
    // 15. Cache response
    cache.set(cacheKey, response)
    
    console.log('✅ API Response generated successfully:', {
      questionsCount: questions.length,
      criticalityScore,
      redFlagsCount: redFlags.length,
      mode: adjustedMode,
      isPregnant: processedPatient.isPregnant
    })
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('❌ API Error:', error)
    
    // Return fallback for errors
    return NextResponse.json({
      success: false,
      error: error.message,
      questions: [],
      analysis: {
        mode: 'fallback',
        criticalityScore: 0,
        redFlags: [],
        riskFactors: [],
        urgencyLevel: 'Unable to assess',
        triageCategory: 'Requires manual review'
      },
      recommendations: {
        followUp: 'Please consult with a healthcare provider for proper assessment'
      },
      dataProtection: {
        enabled: true,
        anonymousId: 'ERROR',
        method: 'fallback',
        compliance: ['GDPR', 'HIPAA']
      },
      metadata: {
        model: 'none',
        processingTime: Date.now() - startTime,
        dataCompleteness: 0,
        confidenceLevel: 0
      }
    }, { status: 500 })
  }
}

// ==================== TEST ENDPOINT ====================
export async function GET() {
  return NextResponse.json({
    status: '✅ API v2.1 Operational - Adapted for Start-Consultation',
    version: '2.1.0',
    features: [
      'Three differentiated AI modes (fast/balanced/intelligent)',
      'Complete medical data utilization from start-consultation',
      'Pregnancy-specific assessments and safety considerations',
      'Advanced risk assessment and triage',
      'Red flag detection system with pregnancy alerts',
      'Automatic mode escalation for critical cases and pregnancy',
      'GDPR/HIPAA compliant data protection',
      'Comprehensive clinical recommendations',
      'Evidence-based diagnostic questioning',
      'Enhanced type safety and error handling',
      'Full compatibility with start-consultation data structure'
    ],
    modes: {
      fast: {
        description: 'Rapid triage for emergency assessment',
        questions: 3,
        focusOn: 'Life-threatening conditions + pregnancy emergencies',
        model: 'gpt-3.5-turbo'
      },
      balanced: {
        description: 'Standard clinical assessment with pregnancy considerations',
        questions: 5,
        focusOn: 'Differential diagnosis + pregnancy safety',
        model: 'gpt-4o-mini'
      },
      intelligent: {
        description: 'Comprehensive specialist consultation',
        questions: 8,
        focusOn: 'Complex cases + pregnancy management + rare conditions',
        model: 'gpt-4o'
      }
    },
    pregnancySupport: {
      enabled: true,
      features: [
        'Automatic pregnancy detection and mode adjustment',
        'Pregnancy-specific red flags and risk assessment',
        'Medication safety considerations',
        'Obstetric emergency screening',
        'Gestational age calculation',
        'Specialized recommendations for pregnant patients'
      ]
    },
    compliance: {
      dataProtection: 'Full PII anonymization',
      standards: ['GDPR', 'HIPAA'],
      encryption: 'In transit and at rest'
    }
  })
}
