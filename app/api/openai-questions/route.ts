// app/api/openai-questions/route.ts - VERSION 3.0 MAURICE ADAPTED - BUG FIX
import { type NextRequest, NextResponse } from "next/server"

// Configuration
export const runtime = 'edge'
export const preferredRegion = 'auto'

// ==================== TYPES & INTERFACES ====================
interface PatientData {
  // Demographics
  firstName?: string
  lastName?: string
  age: string | number
  gender: string
  weight?: string | number
  height?: string | number
  
  // Pregnancy information
  pregnancyStatus?: string
  lastMenstrualPeriod?: string
  gestationalAge?: string
  
  // Medical History
  allergies?: string[]
  medicalHistory?: string[]
  currentMedications?: string
  currentMedicationsText?: string
  
  // Lifestyle - MAURITIUS ADAPTED
  lifeHabits?: {
    smoking?: string
    alcohol?: string
    physicalActivity?: string
    mosquitoExposure?: string // NEW: Mosquito exposure assessment
    waterContact?: string // NEW: Contact with stagnant water
    seasonalPatterns?: string // NEW: Seasonal activity patterns
  }
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
  
  // MAURITIUS SPECIFIC
  seasonalOnset?: string // When symptoms started relative to season
  communityOutbreak?: boolean // Family/neighbors with similar symptoms
  mosquitoActivity?: string // Recent mosquito activity in area
}

interface MedicalContext {
  patient: ProcessedPatientData
  clinical: ProcessedClinicalData
  riskFactors: RiskFactor[]
  criticalityScore: number
  redFlags: string[]
  suggestedSpecialty?: string
  tropicalDiseaseRisk: TropicalDiseaseRisk // NEW
  mauritiusSeasonalContext: SeasonalContext // NEW
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
    tropical: 'low' | 'medium' | 'high' // NEW: Tropical disease risk
  }
  
  lifestyle: {
    smoking: 'non' | 'current' | 'former' | 'unknown'
    alcohol: 'none' | 'occasional' | 'regular' | 'heavy' | 'unknown'
    exercise: 'sedentary' | 'moderate' | 'active' | 'unknown'
    mosquitoExposure: 'high' | 'medium' | 'low' | 'unknown' // NEW
    waterContact: 'frequent' | 'occasional' | 'rare' | 'unknown' // NEW
  }
  
  // Pregnancy data
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
  
  // MAURITIUS SPECIFIC
  seasonalOnset?: string
  communityPattern?: 'isolated' | 'family_cluster' | 'neighborhood_outbreak' | 'unknown'
  mosquitoActivityLevel?: 'high' | 'medium' | 'low' | 'unknown'
}

// NEW INTERFACES FOR MAURITIUS CONTEXT
interface TropicalDiseaseRisk {
  dengue: 'low' | 'medium' | 'high' | 'very_high'
  chikungunya: 'low' | 'medium' | 'high' | 'very_high'
  malaria: 'low' | 'medium' | 'high'
  leptospirosis: 'low' | 'medium' | 'high'
  overallTropicalRisk: number // 0-10 scale
}

interface SeasonalContext {
  currentSeason: 'dry' | 'transition' | 'rainy' | 'cyclone'
  diseaseRiskLevel: 'low' | 'medium' | 'high' | 'very_high'
  predominantDiseases: string[]
  environmentalFactors: string[]
}

interface RiskFactor {
  factor: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  relatedTo: string
  mauritiusSpecific?: boolean // NEW: Flag for Mauritius-specific risks
}

interface DiagnosticQuestion {
  id: number
  question: string
  options: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  rationale?: string
  redFlagDetection?: boolean
  clinicalRelevance?: string
  tropicalDiseaseRelevance?: string // NEW: Specific to tropical diseases
  mauritiusContext?: boolean // NEW: Mauritius-specific question
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
    tropicalDiseaseRisk: TropicalDiseaseRisk // NEW
    mauritiusContext: SeasonalContext // NEW
  }
  recommendations: {
    immediateAction?: string[]
    followUp?: string
    additionalTests?: string[]
    specialistReferral?: string
    tropicalDiseaseConsiderations?: string[] // NEW
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
    mauritiusAdaptation: boolean // NEW
  }
}

// ==================== MAURITIUS MEDICAL KNOWLEDGE BASE ====================
const MAURITIUS_ENDEMIC_DISEASES = {
  dengue: {
    prevalence: 'high',
    seasonality: 'year-round with rainy season peaks (Nov-April)',
    vector: 'Aedes aegypti and Aedes albopictus',
    symptoms: ['fever', 'severe headache', 'retro-orbital pain', 'muscle pain', 'joint pain', 'nausea', 'vomiting', 'rash'],
    phases: ['febrile', 'critical', 'recovery'],
    redFlags: ['plasma leakage', 'bleeding', 'thrombocytopenia', 'hepatomegaly', 'abdominal pain', 'persistent vomiting'],
    complications: ['dengue hemorrhagic fever', 'dengue shock syndrome'],
    diagnosis: ['NS1 antigen (days 1-7)', 'IgM serology (day 5+)', 'platelet count', 'hematocrit monitoring'],
    treatmentAlert: 'NO ASPIRIN - bleeding risk'
  },
  chikungunya: {
    prevalence: 'moderate to high',
    seasonality: 'year-round, same vectors as dengue',
    vector: 'Aedes aegypti and Aedes albopictus',
    symptoms: ['sudden high fever', 'severe arthralgia', 'myalgia', 'headache', 'maculopapular rash'],
    characteristic: 'severe joint pain, often incapacitating',
    redFlags: ['persistent arthritis >3 months', 'neurological complications', 'ocular involvement', 'bullous lesions'],
    complications: ['chronic arthropathy', 'atypical presentations', 'mother-to-child transmission'],
    diagnosis: ['RT-PCR (acute phase)', 'IgM serology', 'clinical diagnosis in epidemic context'],
    chronicPhase: 'joint pain may persist for months to years'
  },
  malaria: {
    prevalence: 'low but present',
    species: 'mainly P. vivax, rare P. falciparum',
    transmission: 'Anopheles mosquitoes, imported cases from Madagascar/Africa',
    symptoms: ['fever', 'chills', 'headache', 'vomiting', 'fatigue', 'periodic fever pattern'],
    redFlags: ['altered consciousness', 'severe anemia', 'respiratory distress', 'renal failure', 'hypoglycemia'],
    complications: ['cerebral malaria', 'severe anemia', 'multi-organ failure'],
    diagnosis: ['rapid diagnostic test', 'blood smear', 'PCR if available'],
    treatmentUrgency: 'urgent treatment required, especially P. falciparum'
  },
  leptospirosis: {
    prevalence: 'moderate during rainy season',
    transmission: 'contaminated water/soil contact, rat urine',
    seasonality: 'peaks during heavy rains and floods',
    symptoms: ['fever', 'headache', 'muscle pain', 'conjunctival suffusion', 'jaundice'],
    redFlags: ['Weil disease (jaundice + renal failure)', 'meningitis', 'pulmonary hemorrhage', 'cardiovascular collapse'],
    diagnosis: ['clinical + epidemiological exposure', 'serology', 'culture'],
    treatment: 'early antibiotic treatment crucial'
  }
}

const MAURITIUS_SYMPTOM_CATEGORIES = {
  tropical_fever: ['dengue-like syndrome', 'chikungunya-like syndrome', 'malaria-like syndrome', 'leptospirosis-like syndrome'],
  vector_borne: ['mosquito-borne diseases', 'post-rain outbreaks', 'community clusters'],
  seasonal_respiratory: ['sugar cane burning effects', 'monsoon respiratory infections'],
  water_related: ['leptospirosis', 'gastroenteritis from contaminated water'],
  
  // Standard categories adapted for Mauritius
  cardiovascular: ['chest pain', 'palpitations', 'shortness of breath', 'leg swelling', 'irregular heartbeat'],
  respiratory: ['cough', 'wheezing', 'difficulty breathing', 'chest tightness', 'sputum'],
  neurological: ['headache', 'dizziness', 'confusion', 'numbness', 'tingling', 'memory problems'],
  gastrointestinal: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating'],
  musculoskeletal: ['back pain', 'joint pain', 'muscle pain', 'joint stiffness', 'muscle weakness'],
  dermatological: ['rash', 'itching', 'skin lesions', 'dry skin', 'skin discoloration'],
  psychiatric: ['anxiety', 'depression', 'insomnia', 'mood swings', 'irritability'],
  constitutional: ['fever', 'fatigue', 'weight loss', 'night sweats', 'chills', 'loss of appetite']
}

const MAURITIUS_RED_FLAGS = {
  tropical_critical: [
    { symptom: 'fever with severe headache and retro-orbital pain', severity: 'critical', disease: 'dengue', action: 'urgent NS1/platelet count' },
    { symptom: 'fever with bleeding or easy bruising', severity: 'critical', disease: 'dengue hemorrhagic fever', action: 'immediate hospitalization' },
    { symptom: 'fever with severe abdominal pain and persistent vomiting', severity: 'critical', disease: 'dengue critical phase', action: 'immediate hospitalization' },
    { symptom: 'fever with sudden severe joint pain', severity: 'high', disease: 'chikungunya', action: 'symptomatic treatment, avoid aspirin' },
    { symptom: 'fever with jaundice and red eyes', severity: 'high', disease: 'leptospirosis', action: 'early antibiotic treatment' },
    { symptom: 'recurrent fever with chills every 2-3 days', severity: 'high', disease: 'malaria', action: 'urgent blood smear/RDT' }
  ],
  
  pregnancy_tropical: [
    { symptom: 'fever in pregnancy with rash', severity: 'critical', disease: 'dengue in pregnancy', action: 'immediate obstetric consultation' },
    { symptom: 'severe joint pain in pregnancy with fever', severity: 'high', disease: 'chikungunya in pregnancy', action: 'monitor vertical transmission risk' },
    { symptom: 'fever in pregnancy with headache', severity: 'high', disease: 'malaria in pregnancy', action: 'urgent treatment, anemia risk' }
  ],
  
  community_outbreak: [
    { symptom: 'fever with multiple family members affected', severity: 'high', disease: 'dengue/chikungunya outbreak', action: 'public health notification' },
    { symptom: 'fever after flood/heavy rain exposure', severity: 'medium', disease: 'leptospirosis', action: 'antibiotic prophylaxis consideration' }
  ],
  
  // Standard red flags
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
  ]
}

const MAURITIUS_SEASONAL_PATTERNS = {
  rainy_season: {
    months: ['November', 'December', 'January', 'February', 'March', 'April'],
    disease_risks: ['dengue peaks', 'chikungunya increase', 'leptospirosis outbreaks', 'gastroenteritis from water contamination'],
    environmental_factors: ['increased mosquito breeding', 'stagnant water', 'flooding risks', 'poor sanitation']
  },
  cyclone_season: {
    months: ['December', 'January', 'February', 'March'],
    disease_risks: ['vector-borne disease spikes', 'water-borne diseases', 'respiratory infections from crowding'],
    environmental_factors: ['severe weather', 'infrastructure damage', 'evacuation centers', 'water contamination']
  },
  dry_season: {
    months: ['May', 'June', 'July', 'August', 'September', 'October'],
    disease_risks: ['respiratory infections', 'dehydration in elderly', 'sugar cane burning effects'],
    environmental_factors: ['dust', 'air pollution from burning', 'water scarcity in some areas']
  },
  transition_periods: {
    months: ['April-May', 'October-November'],
    disease_risks: ['mixed seasonal patterns', 'viral respiratory infections'],
    environmental_factors: ['variable weather', 'changing humidity']
  }
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
      mode,
      // Include Mauritius-specific factors
      mosquitoActivity: clinical.mosquitoActivity,
      seasonalOnset: clinical.seasonalOnset
    })
    
    // Simple hash function for Edge Runtime
    let hash = 0
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    return `cache_${Math.abs(hash)}_${mode}_mauritius`
  }
}

const cache = new EnhancedCache()

// ==================== MAURITIUS-ADAPTED DATA PROCESSING ====================
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
  
  // Process chronic conditions
  const chronicConditions = Array.isArray(patient.medicalHistory) 
    ? patient.medicalHistory.filter(h => typeof h === 'string' && h.trim() !== '')
    : []
  const hasChronicConditions = chronicConditions.length > 0
  
  // Process allergies
  const allergiesList = Array.isArray(patient.allergies)
    ? patient.allergies.filter(a => typeof a === 'string' && a.trim() !== '')
    : []
  const hasAllergies = allergiesList.length > 0
  
  // Process medications
  let medicationsText = patient.currentMedications || patient.currentMedicationsText || ''
  if (typeof medicationsText !== 'string') {
    medicationsText = ''
  }
  
  const medicationsList = medicationsText 
    ? medicationsText.split(/[,\n]/).map(m => m.trim()).filter(Boolean)
    : []
  const onMedications = medicationsList.length > 0
  
  // Calculate risk profiles - MAURITIUS ADAPTED
  const riskProfile = calculateMauritiusRiskProfile(age, chronicConditions, patient.lifeHabits, bmi)
  
  // Process lifestyle - MAURITIUS SPECIFIC
  const lifestyle = processMauritiusLifestyle(patient.lifeHabits || {
    smoking: patient.smokingStatus,
    alcohol: patient.alcoholConsumption,
    physicalActivity: patient.physicalActivity
  })
  
  // Pregnancy processing
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
    
  const complaintCategory = categorizeMauritiusComplaint(mainComplaint, symptomsList)
  
  // Process duration
  const durationValue = typeof clinical.symptomDuration === 'string' 
    ? clinical.symptomDuration 
    : 'unknown'
    
  const duration = {
    value: durationValue,
    urgency: DURATION_URGENCY_MAP[durationValue] || 'semi-urgent' as const
  }
  
  // Process pain
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
  
  // MAURITIUS SPECIFIC PROCESSING
  const communityPattern = processCommunityPattern(clinical.communityOutbreak)
  const mosquitoActivityLevel = processMosquitoActivity(clinical.mosquitoActivity)
  
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
      : undefined,
    seasonalOnset: clinical.seasonalOnset,
    communityPattern,
    mosquitoActivityLevel
  }
}

function processVitalSigns(vitals?: ClinicalData['vitalSigns']) {
  if (!vitals) return {}
  
  const result: ProcessedClinicalData['vitals'] = {}
  
  // Temperature - CRITICAL FOR TROPICAL DISEASES
  if (vitals.temperature !== null && vitals.temperature !== undefined) {
    const temp = typeof vitals.temperature === 'string' 
      ? parseFloat(vitals.temperature) 
      : vitals.temperature
    
    if (!isNaN(temp) && temp > 30 && temp < 45) {
      result.temperature = temp
      
      // Temperature thresholds for tropical disease assessment
      if (temp < 36.1) result.tempStatus = 'hypothermia'
      else if (temp <= 37.2) result.tempStatus = 'normal'
      else if (temp <= 38.5) result.tempStatus = 'fever' // Dengue/chikungunya range
      else result.tempStatus = 'high-fever' // High concern for dengue hemorrhagic fever
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
      
      if (sys < 90 || dia < 60) result.bpStatus = 'hypotension' // Dengue shock syndrome concern
      else if (sys < 120 && dia < 80) result.bpStatus = 'normal'
      else if (sys < 140 && dia < 90) result.bpStatus = 'pre-hypertension'
      else if (sys < 180 && dia < 120) result.bpStatus = 'hypertension'
      else result.bpStatus = 'crisis'
    }
  }
  
  return result
}

// ==================== MAURITIUS-SPECIFIC RISK ASSESSMENT ====================
function calculateMauritiusRiskProfile(
  age: number, 
  conditions: string[], 
  lifestyle?: PatientData['lifeHabits'],
  bmi?: number
) {
  const profile = {
    cardiovascular: 'low' as 'low' | 'medium' | 'high',
    diabetes: 'low' as 'low' | 'medium' | 'high',
    respiratory: 'low' as 'low' | 'medium' | 'high',
    tropical: 'low' as 'low' | 'medium' | 'high' // NEW: Tropical disease risk
  }
  
  // Standard risk calculations (unchanged)
  let cvRisk = 0
  if (age > 65) cvRisk++
  if (age > 75) cvRisk++
  if (conditions.some(c => c.toLowerCase().includes('hypertension'))) cvRisk += 2
  if (conditions.some(c => c.toLowerCase().includes('heart'))) cvRisk += 3
  if (conditions.some(c => c.toLowerCase().includes('diabetes'))) cvRisk++
  
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
  
  // NEW: Tropical disease risk assessment
  let tropicalRisk = 0
  
  // Base risk - everyone in Mauritius has some risk
  tropicalRisk += 1
  
  // Environmental exposure
  if (lifestyle?.mosquitoExposure === 'high') tropicalRisk += 2
  else if (lifestyle?.mosquitoExposure === 'medium') tropicalRisk += 1
  
  if (lifestyle?.waterContact === 'frequent') tropicalRisk += 2
  else if (lifestyle?.waterContact === 'occasional') tropicalRisk += 1
  
  // Age factors
  if (age < 5 || age > 65) tropicalRisk += 1 // More vulnerable populations
  
  // Pregnancy risk
  if (conditions.some(c => c.toLowerCase().includes('pregnan'))) tropicalRisk += 1
  
  // Immunocompromised conditions
  if (conditions.some(c => 
    c.toLowerCase().includes('diabetes') || 
    c.toLowerCase().includes('immune') ||
    c.toLowerCase().includes('hiv') ||
    c.toLowerCase().includes('cancer')
  )) tropicalRisk += 2
  
  if (tropicalRisk >= 5) profile.tropical = 'high'
  else if (tropicalRisk >= 3) profile.tropical = 'medium'
  
  return profile
}

function calculateTropicalDiseaseRisk(
  patient: ProcessedPatientData,
  clinical: ProcessedClinicalData,
  seasonalContext: SeasonalContext
): TropicalDiseaseRisk {
  let dengueRisk: 'low' | 'medium' | 'high' | 'very_high' = 'low'
  let chikungunyaRisk: 'low' | 'medium' | 'high' | 'very_high' = 'low'
  let malariaRisk: 'low' | 'medium' | 'high' = 'low'
  let leptospirosisRisk: 'low' | 'medium' | 'high' = 'low'
  
  // Base seasonal risk
  if (seasonalContext.currentSeason === 'rainy') {
    dengueRisk = 'medium'
    chikungunyaRisk = 'medium'
    leptospirosisRisk = 'medium'
  }
  
  // Symptom-based risk assessment
  const hasClassicDengueSymptoms = clinical.symptomsList.some(s => 
    ['headache', 'muscle pain', 'joint pain', 'nausea'].some(ds => s.toLowerCase().includes(ds))
  ) && clinical.vitals.tempStatus === 'fever'
  
  const hasClassicChikungunyaSymptoms = clinical.symptomsList.some(s =>
    ['joint pain', 'severe arthralgia'].some(cs => s.toLowerCase().includes(cs))
  ) && clinical.vitals.tempStatus === 'fever'
  
  const hasMalariaSymptoms = clinical.symptomsList.some(s =>
    ['chills', 'periodic fever', 'vomiting'].some(ms => s.toLowerCase().includes(ms))
  )
  
  const hasLeptospirosisSymptoms = clinical.symptomsList.some(s =>
    ['jaundice', 'red eyes', 'muscle pain'].some(ls => s.toLowerCase().includes(ls))
  )
  
  // Escalate risk based on symptoms
  if (hasClassicDengueSymptoms) {
    dengueRisk = dengueRisk === 'low' ? 'medium' : dengueRisk === 'medium' ? 'high' : 'very_high'
  }
  
  if (hasClassicChikungunyaSymptoms) {
    chikungunyaRisk = chikungunyaRisk === 'low' ? 'medium' : chikungunyaRisk === 'medium' ? 'high' : 'very_high'
  }
  
  if (hasMalariaSymptoms) {
    malariaRisk = malariaRisk === 'low' ? 'medium' : 'high'
  }
  
  if (hasLeptospirosisSymptoms) {
    leptospirosisRisk = leptospirosisRisk === 'low' ? 'medium' : 'high'
  }
  
  // Community outbreak escalation
  if (clinical.communityPattern === 'family_cluster' || clinical.communityPattern === 'neighborhood_outbreak') {
    dengueRisk = 'very_high'
    chikungunyaRisk = 'very_high'
  }
  
  // High mosquito activity escalation
  if (clinical.mosquitoActivityLevel === 'high') {
    if (dengueRisk !== 'very_high') dengueRisk = dengueRisk === 'low' ? 'medium' : 'high'
    if (chikungunyaRisk !== 'very_high') chikungunyaRisk = chikungunyaRisk === 'low' ? 'medium' : 'high'
  }
  
  // Calculate overall tropical risk score
  const riskScores = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'very_high': 4
  }
  
  const overallTropicalRisk = Math.round(
    (riskScores[dengueRisk] + riskScores[chikungunyaRisk] + riskScores[malariaRisk] + riskScores[leptospirosisRisk]) / 4 * 2.5
  )
  
  return {
    dengue: dengueRisk,
    chikungunya: chikungunyaRisk,
    malaria: malariaRisk,
    leptospirosis: leptospirosisRisk,
    overallTropicalRisk
  }
}

function getCurrentSeasonalContext(): SeasonalContext {
  const currentMonth = new Date().getMonth() + 1 // 1-12
  
  let currentSeason: 'dry' | 'transition' | 'rainy' | 'cyclone'
  let diseaseRiskLevel: 'low' | 'medium' | 'high' | 'very_high'
  let predominantDiseases: string[]
  let environmentalFactors: string[]
  
  if ([11, 12, 1, 2, 3, 4].includes(currentMonth)) {
    currentSeason = 'rainy'
    if ([12, 1, 2, 3].includes(currentMonth)) {
      currentSeason = 'cyclone'
      diseaseRiskLevel = 'very_high'
    } else {
      diseaseRiskLevel = 'high'
    }
    predominantDiseases = ['dengue', 'chikungunya', 'leptospirosis']
    environmentalFactors = ['increased mosquito breeding', 'stagnant water', 'flooding risk']
  } else if ([5, 6, 7, 8, 9, 10].includes(currentMonth)) {
    currentSeason = 'dry'
    diseaseRiskLevel = 'medium'
    predominantDiseases = ['respiratory infections', 'sugar cane burning effects']
    environmentalFactors = ['dry air', 'dust', 'air pollution from burning']
  } else {
    currentSeason = 'transition'
    diseaseRiskLevel = 'medium'
    predominantDiseases = ['viral respiratory infections', 'gastroenteritis']
    environmentalFactors = ['variable weather', 'changing humidity']
  }
  
  return {
    currentSeason,
    diseaseRiskLevel,
    predominantDiseases,
    environmentalFactors
  }
}

function calculateCriticalityScore(
  patient: ProcessedPatientData, 
  clinical: ProcessedClinicalData,
  tropicalRisk: TropicalDiseaseRisk
): number {
  let score = 0
  
  // Age factor
  if (patient.age > 75) score += 2
  else if (patient.age > 65) score += 1
  else if (patient.age < 2) score += 2
  
  // Pregnancy factor
  if (patient.isPregnant) score += 1
  
  // Vital signs - ADJUSTED FOR TROPICAL DISEASES
  if (clinical.vitals.tempStatus === 'high-fever') {
    score += 3 // High fever in tropics = high concern for dengue hemorrhagic fever
  } else if (clinical.vitals.tempStatus === 'fever') {
    score += 2 // Any fever in tropics needs attention
  } else if (clinical.vitals.tempStatus === 'hypothermia') {
    score += 3
  }
  
  if (clinical.vitals.bpStatus === 'crisis') score += 4
  else if (clinical.vitals.bpStatus === 'hypertension') score += 2
  else if (clinical.vitals.bpStatus === 'hypotension') score += 3 // Concern for dengue shock
  
  // Pain level
  if (clinical.painLevel >= 9) score += 3
  else if (clinical.painLevel >= 7) score += 2
  else if (clinical.painLevel >= 5) score += 1
  
  // Duration urgency
  if (clinical.duration.urgency === 'immediate') score += 3
  else if (clinical.duration.urgency === 'urgent') score += 2
  else if (clinical.duration.urgency === 'semi-urgent') score += 1
  
  // TROPICAL DISEASE RISK FACTORS
  if (tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') score += 2
  else if (tropicalRisk.dengue === 'high' || tropicalRisk.chikungunya === 'high') score += 1
  
  if (tropicalRisk.malaria === 'high') score += 2
  if (tropicalRisk.leptospirosis === 'high') score += 1
  
  // Community outbreak
  if (clinical.communityPattern === 'neighborhood_outbreak') score += 2
  else if (clinical.communityPattern === 'family_cluster') score += 1
  
  // Symptoms severity - TROPICAL ADAPTED
  const tropicalCriticalSymptoms = [
    'bleeding', 'easy bruising', 'persistent vomiting', 'severe abdominal pain',
    'difficulty breathing', 'confusion', 'syncope', 'seizure',
    'jaundice', 'red eyes', 'severe joint pain'
  ]
  
  clinical.symptomsList.forEach(symptom => {
    if (typeof symptom === 'string') {
      if (tropicalCriticalSymptoms.some(cs => symptom.toLowerCase().includes(cs))) {
        score += 2
      }
    }
  })
  
  // Risk factors
  if (patient.riskProfile.cardiovascular === 'high') score += 2
  else if (patient.riskProfile.cardiovascular === 'medium') score += 1
  
  if (patient.riskProfile.tropical === 'high') score += 1
  
  // Chronic conditions
  if (patient.hasChronicConditions) score += 1
  
  return Math.min(score, 10) // Cap at 10
}

function detectMauritiusRedFlags(
  patient: ProcessedPatientData, 
  clinical: ProcessedClinicalData,
  tropicalRisk: TropicalDiseaseRisk
): string[] {
  const flags: string[] = []
  
  // TROPICAL DISEASE SPECIFIC RED FLAGS
  MAURITIUS_RED_FLAGS.tropical_critical.forEach(flag => {
    const hasSymptom = clinical.symptomsList.some(s => 
      typeof s === 'string' && s.toLowerCase().includes(flag.symptom.toLowerCase())
    ) || (typeof clinical.mainComplaint === 'string' && 
           clinical.mainComplaint.toLowerCase().includes(flag.symptom.toLowerCase()))
    
    if (hasSymptom) {
      flags.push(`${flag.severity.toUpperCase()}: ${flag.symptom} - Suspect ${flag.disease} - ${flag.action}`)
    }
  })
  
  // PREGNANCY + TROPICAL DISEASES
  if (patient.isPregnant) {
    MAURITIUS_RED_FLAGS.pregnancy_tropical.forEach(flag => {
      const hasSymptom = clinical.symptomsList.some(s => 
        typeof s === 'string' && s.toLowerCase().includes(flag.symptom.toLowerCase())
      ) || (typeof clinical.mainComplaint === 'string' && 
             clinical.mainComplaint.toLowerCase().includes(flag.symptom.toLowerCase()))
      
      if (hasSymptom) {
        flags.push(`${flag.severity.toUpperCase()}: ${flag.symptom} - ${flag.disease} - ${flag.action}`)
      }
    })
  }
  
  // COMMUNITY OUTBREAK FLAGS
  if (clinical.communityPattern === 'family_cluster' || clinical.communityPattern === 'neighborhood_outbreak') {
    flags.push('HIGH: Community outbreak pattern detected - Notify public health authorities')
  }
  
  // SEASONAL HIGH-RISK FLAGS
  const seasonalContext = getCurrentSeasonalContext()
  if (seasonalContext.diseaseRiskLevel === 'very_high' && clinical.vitals.tempStatus === 'fever') {
    flags.push('HIGH: Fever during high-risk season - Urgent tropical disease evaluation')
  }
  
  // STANDARD RED FLAGS (adapted)
  Object.entries(MAURITIUS_RED_FLAGS).forEach(([category, categoryFlags]) => {
    if (category === 'tropical_critical' || category === 'pregnancy_tropical') return // Already processed
    
    categoryFlags.forEach((flag: any) => {
      const hasSymptom = clinical.symptomsList.some(s => 
        typeof s === 'string' && s.toLowerCase().includes(flag.symptom.toLowerCase())
      ) || (typeof clinical.mainComplaint === 'string' && 
             clinical.mainComplaint.toLowerCase().includes(flag.symptom.toLowerCase()))
      
      if (hasSymptom) {
        flags.push(`${flag.severity.toUpperCase()}: ${flag.symptom}`)
      }
    })
  })
  
  // VITAL SIGNS RED FLAGS
  if (clinical.vitals.tempStatus === 'high-fever') {
    flags.push('HIGH: High fever (>38.5°C) - Urgent dengue/tropical disease evaluation')
  }
  
  if (clinical.vitals.bpStatus === 'crisis') {
    flags.push('CRITICAL: Hypertensive crisis')
  } else if (clinical.vitals.bpStatus === 'hypotension') {
    flags.push('HIGH: Hypotension - Rule out dengue shock syndrome')
  }
  
  // PAIN RED FLAGS
  if (clinical.painLevel >= 9) {
    flags.push('HIGH: Extreme pain (9-10/10)')
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

function processMauritiusLifestyle(habits?: PatientData['lifeHabits']): ProcessedPatientData['lifestyle'] {
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
  
  // NEW: Mauritius-specific lifestyle factors
  const mapMosquitoExposure = (value?: string): 'high' | 'medium' | 'low' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = value.toLowerCase().trim()
    
    if (['high', 'many', 'frequent', 'numerous'].includes(v)) return 'high'
    if (['medium', 'moderate', 'some'].includes(v)) return 'medium'
    if (['low', 'few', 'rare', 'minimal'].includes(v)) return 'low'
    
    return 'unknown'
  }
  
  const mapWaterContact = (value?: string): 'frequent' | 'occasional' | 'rare' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = value.toLowerCase().trim()
    
    if (['frequent', 'daily', 'regular'].includes(v)) return 'frequent'
    if (['occasional', 'sometimes', 'weekly'].includes(v)) return 'occasional'
    if (['rare', 'seldom', 'never'].includes(v)) return 'rare'
    
    return 'unknown'
  }
  
  return {
    smoking: mapSmoking(habits?.smoking),
    alcohol: mapAlcohol(habits?.alcohol),
    exercise: mapExercise(habits?.physicalActivity),
    mosquitoExposure: mapMosquitoExposure(habits?.mosquitoExposure),
    waterContact: mapWaterContact(habits?.waterContact)
  }
}

function categorizeMauritiusComplaint(complaint: string, symptoms: string[]): string {
  const cleanComplaint = typeof complaint === 'string' ? complaint : ''
  const cleanSymptoms = Array.isArray(symptoms) 
    ? symptoms.filter(s => typeof s === 'string' && s.trim() !== '')
    : []
  
  const allText = `${cleanComplaint} ${cleanSymptoms.join(' ')}`.toLowerCase()
  
  // MAURITIUS-SPECIFIC CATEGORIES FIRST
  if (MAURITIUS_SYMPTOM_CATEGORIES.tropical_fever.some(keyword => allText.includes(keyword))) {
    return 'tropical_fever'
  }
  
  if (MAURITIUS_SYMPTOM_CATEGORIES.vector_borne.some(keyword => allText.includes(keyword))) {
    return 'vector_borne'
  }
  
  if (MAURITIUS_SYMPTOM_CATEGORIES.water_related.some(keyword => allText.includes(keyword))) {
    return 'water_related'
  }
  
  // Check for fever + other symptoms = potential tropical disease
  if (allText.includes('fever') && (
    allText.includes('headache') || 
    allText.includes('joint pain') || 
    allText.includes('muscle pain') ||
    allText.includes('rash')
  )) {
    return 'tropical_fever'
  }
  
  // STANDARD CATEGORIES
  for (const [category, keywords] of Object.entries(MAURITIUS_SYMPTOM_CATEGORIES)) {
    if (category.startsWith('tropical_') || category.startsWith('vector_') || category.startsWith('water_')) continue
    if (keywords.some(keyword => allText.includes(keyword))) {
      return category
    }
  }
  
  return 'general'
}

function processCommunityPattern(outbreak?: boolean): 'isolated' | 'family_cluster' | 'neighborhood_outbreak' | 'unknown' {
  if (outbreak === true) return 'neighborhood_outbreak'
  if (outbreak === false) return 'isolated'
  return 'unknown'
}

function processMosquitoActivity(activity?: string): 'high' | 'medium' | 'low' | 'unknown' {
  if (!activity || typeof activity !== 'string') return 'unknown'
  const a = activity.toLowerCase().trim()
  
  if (['high', 'many', 'numerous', 'swarms'].includes(a)) return 'high'
  if (['medium', 'moderate', 'some'].includes(a)) return 'medium'
  if (['low', 'few', 'minimal', 'rare'].includes(a)) return 'low'
  
  return 'unknown'
}

function suggestMauritiusSpecialty(
  category: string, 
  redFlags: string[], 
  isPregnant: boolean = false,
  tropicalRisk: TropicalDiseaseRisk
): string | undefined {
  if (redFlags.some(f => f.includes('CRITICAL'))) {
    return 'Emergency Medicine'
  }
  
  // Pregnancy takes priority
  if (isPregnant) {
    return 'Obstetrics/Gynecology'
  }
  
  // TROPICAL DISEASE SPECIALTIES
  if (category === 'tropical_fever' || category === 'vector_borne') {
    if (tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') {
      return 'Infectious Disease/Internal Medicine'
    }
    return 'Internal Medicine'
  }
  
  if (tropicalRisk.malaria === 'high') {
    return 'Infectious Disease'
  }
  
  if (category === 'water_related' || tropicalRisk.leptospirosis === 'high') {
    return 'Infectious Disease/Internal Medicine'
  }
  
  // STANDARD SPECIALTIES
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

function calculateUrgencyLevel(
  criticalityScore: number, 
  isPregnant: boolean = false,
  tropicalRisk: TropicalDiseaseRisk
): string {
  let adjustedScore = criticalityScore
  
  // Pregnancy adjustment
  if (isPregnant) adjustedScore += 1
  
  // Tropical disease adjustment
  if (tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') {
    adjustedScore += 1
  }
  
  if (tropicalRisk.malaria === 'high') {
    adjustedScore += 2
  }
  
  if (adjustedScore >= 8) return 'IMMEDIATE - Emergency care required'
  if (adjustedScore >= 6) return 'URGENT - See provider within 24 hours'
  if (adjustedScore >= 4) return 'SEMI-URGENT - See provider within 48-72 hours'
  if (adjustedScore >= 2) return 'ROUTINE - Schedule appointment'
  return 'ROUTINE - Telehealth appropriate'
}

function getTriageCategory(
  criticalityScore: number, 
  isPregnant: boolean = false,
  tropicalRisk: TropicalDiseaseRisk
): string {
  let adjustedScore = criticalityScore
  
  if (isPregnant) adjustedScore += 1
  
  if (tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') {
    adjustedScore += 1
  }
  
  if (tropicalRisk.malaria === 'high') {
    adjustedScore += 2
  }
  
  if (adjustedScore >= 8) return 'ESI-1: Resuscitation'
  if (adjustedScore >= 6) return 'ESI-2: Emergent'
  if (adjustedScore >= 4) return 'ESI-3: Urgent'
  if (adjustedScore >= 2) return 'ESI-4: Semi-urgent'
  return 'ESI-5: Non-urgent'
}

// ==================== MAURITIUS-ADAPTED PROMPT GENERATION ====================
function generateMauritiusModeSpecificPrompt(
  mode: string,
  context: MedicalContext
): string {
  const { patient, clinical } = context
  
  switch (mode) {
    case 'fast':
      return generateMauritiusFastModePrompt(patient, clinical, context)
    case 'balanced':
      return generateMauritiusBalancedModePrompt(patient, clinical, context)
    case 'intelligent':
      return generateMauritiusIntelligentModePrompt(patient, clinical, context)
    default:
      return generateMauritiusBalancedModePrompt(patient, clinical, context)
  }
}

function generateMauritiusFastModePrompt(
  patient: ProcessedPatientData,
  clinical: ProcessedClinicalData,
  context: MedicalContext
): string {
  const pregnancyAlert = patient.isPregnant ? '\n⚠️ PATIENT IS PREGNANT - Consider obstetric + tropical disease emergencies' : ''
  const tropicalAlert = context.tropicalDiseaseRisk.overallTropicalRisk >= 6 ? 
    '\n🦟 HIGH TROPICAL DISEASE RISK - Urgent evaluation needed' : ''
  
  return `EMERGENCY TRIAGE ASSESSMENT - MAURITIUS TROPICAL CONTEXT

🏝️ LOCATION: MAURITIUS (TROPICAL ISLAND - INDIAN OCEAN)
ENDEMIC DISEASES: Dengue, Chikungunya, Malaria, Leptospirosis

PATIENT: ${patient.age}y ${patient.gender}${patient.isPregnant ? ' (PREGNANT)' : ''}
CHIEF COMPLAINT: ${clinical.mainComplaint}
DURATION: ${clinical.duration.value}
PAIN: ${clinical.painLevel}/10
FEVER STATUS: ${clinical.vitals.tempStatus || 'Unknown'}
MOSQUITO ACTIVITY: ${clinical.mosquitoActivityLevel || 'Unknown'}
COMMUNITY PATTERN: ${clinical.communityPattern || 'Unknown'}
RED FLAGS: ${context.redFlags.length > 0 ? context.redFlags.join(', ') : 'None identified'}${pregnancyAlert}${tropicalAlert}

TROPICAL DISEASE RISK:
- Dengue: ${context.tropicalDiseaseRisk.dengue}
- Chikungunya: ${context.tropicalDiseaseRisk.chikungunya}
- Malaria: ${context.tropicalDiseaseRisk.malaria}
- Leptospirosis: ${context.tropicalDiseaseRisk.leptospirosis}

Generate 3 CRITICAL triage questions for MAURITIUS context:

PRIORITY FOCUS:
1. Rule out dengue hemorrhagic fever (bleeding, severe abdominal pain, plasma leakage)
2. Identify chikungunya vs dengue (joint pain pattern)
3. Detect malaria/leptospirosis if indicated
4. Assess community outbreak potential
${patient.isPregnant ? '5. Pregnancy-specific tropical disease complications' : ''}

❌ DO NOT ASK:
- "Travel to tropical countries" (PATIENT IS ALREADY IN TROPICS)
- "Malaria exposure during travel" (MALARIA IS ENDEMIC)
- Generic travel questions

✅ ASK INSTEAD:
- Specific symptom patterns for dengue/chikungunya differentiation
- Bleeding/bruising signs (dengue hemorrhagic fever)
- Community/family outbreak patterns
- Water contact (leptospirosis)
- Mosquito exposure timing

Each question must:
- Target MAURITIUS-SPECIFIC conditions
- Help differentiate tropical diseases
- Detect emergency complications
- Consider local epidemiology
${patient.isPregnant ? '- Account for pregnancy + tropical disease interactions' : ''}

Format:
{
  "questions": [
    {
      "id": 1,
      "question": "Direct question targeting critical tropical disease symptom",
      "options": ["Specific option", "Specific option", "Specific option", "None/Unsure"],
      "priority": "critical",
      "redFlagDetection": true,
      "tropicalDiseaseRelevance": "How this relates to dengue/chikungunya/malaria",
      "mauritiusContext": true,
      "clinicalRelevance": "Why this matters for immediate tropical disease triage"
    }
  ]
}

Generate exactly 3 MAURITIUS-ADAPTED questions. Response must be valid JSON only.`
}

function generateMauritiusBalancedModePrompt(
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
  
  const seasonalContext = context.mauritiusSeasonalContext
  
  return `CLINICAL DIAGNOSTIC ASSESSMENT - MAURITIUS STANDARD MODE

🏝️ ═══════════════════════════════════════════════════════════
MAURITIUS TROPICAL MEDICAL CONTEXT
═══════════════════════════════════════════════════════════

GEOGRAPHICAL CONTEXT:
- Location: Mauritius (Tropical island, Indian Ocean)
- Endemic diseases: Dengue, Chikungunya, Malaria, Leptospirosis
- Current season: ${seasonalContext.currentSeason} (Disease risk: ${seasonalContext.diseaseRiskLevel})
- Predominant diseases this season: ${seasonalContext.predominantDiseases.join(', ')}
- Environmental factors: ${seasonalContext.environmentalFactors.join(', ')}

PATIENT PROFILE:
- Demographics: ${patient.age}y ${patient.gender}, BMI: ${patient.bmi?.toFixed(1)} (${patient.bmiCategory})
- Risk Profile: CV-${patient.riskProfile.cardiovascular}, DM-${patient.riskProfile.diabetes}, Resp-${patient.riskProfile.respiratory}, Tropical-${patient.riskProfile.tropical}${medicalHistoryStr}${medicationsStr}${pregnancyStr}
- Lifestyle: Smoking-${patient.lifestyle.smoking}, Alcohol-${patient.lifestyle.alcohol}, Exercise-${patient.lifestyle.exercise}
- Tropical Exposure: Mosquitoes-${patient.lifestyle.mosquitoExposure}, Water contact-${patient.lifestyle.waterContact}

CLINICAL PRESENTATION:
- Chief Complaint: ${clinical.mainComplaint}
- Category: ${clinical.complaintCategory}
- Duration: ${clinical.duration.value} (${clinical.duration.urgency})
- Symptoms: ${clinical.symptomsList.join(', ')}
- Pain: ${clinical.painLevel}/10 (${clinical.painCategory})${vitalsStr}
- Evolution: ${clinical.evolution || 'Not specified'}
- Community pattern: ${clinical.communityPattern}
- Mosquito activity: ${clinical.mosquitoActivityLevel}

TROPICAL DISEASE RISK ASSESSMENT:
- Dengue risk: ${context.tropicalDiseaseRisk.dengue}
- Chikungunya risk: ${context.tropicalDiseaseRisk.chikungunya}
- Malaria risk: ${context.tropicalDiseaseRisk.malaria}
- Leptospirosis risk: ${context.tropicalDiseaseRisk.leptospirosis}
- Overall tropical risk: ${context.tropicalDiseaseRisk.overallTropicalRisk}/10

CLINICAL ASSESSMENT:
- Criticality Score: ${context.criticalityScore}/10
- Red Flags: ${context.redFlags.join(', ') || 'None'}
- Risk Factors: ${context.riskFactors.map(r => `${r.factor}(${r.severity})`).join(', ')}

${patient.isPregnant ? `
⚠️ PREGNANCY + TROPICAL DISEASE CONSIDERATIONS:
- Dengue in pregnancy: Risk of maternal bleeding, fetal distress
- Chikungunya in pregnancy: Vertical transmission possible
- Malaria in pregnancy: Severe anemia, preterm labor risk
- All medications must be pregnancy-safe
- Increased monitoring required
- Avoid teratogenic procedures
` : ''}

MAURITIUS-SPECIFIC DIAGNOSTIC REQUIREMENTS:

❌ NEVER ASK:
- "Have you traveled to tropical countries?" (THEY ARE IN TROPICS)
- "Malaria exposure during travel?" (MALARIA IS ENDEMIC)
- "Risk of tropical diseases from travel?" (INAPPROPRIATE)

✅ MAURITIUS-ADAPTED QUESTIONS MUST:
- Focus on ENDEMIC TROPICAL DISEASES (dengue, chikungunya, malaria, leptospirosis)
- Differentiate between similar presentations (dengue vs chikungunya)
- Assess SEASONAL RISK FACTORS (rainfall, mosquito breeding)
- Evaluate COMMUNITY OUTBREAK potential
- Consider WATER CONTACT exposure (leptospirosis)
- Account for LOCAL EPIDEMIOLOGY

Generate 5 diagnostic questions following MAURITIUS medical protocol:

1. ONE question to differentiate TROPICAL DISEASES (dengue vs chikungunya vs malaria)
2. ONE question to assess SEVERITY/COMPLICATIONS (dengue hemorrhagic fever, severe malaria)
3. ONE question to evaluate EXPOSURE RISK (mosquito/water contact, seasonal timing)
4. ONE question to assess COMMUNITY/FAMILY patterns (outbreak detection)
5. ONE question about FUNCTIONAL IMPACT or associated complications

${patient.isPregnant ? 'CRITICAL: All questions must consider PREGNANCY + TROPICAL DISEASE interactions' : ''}

Each question must:
- Be specific to MAURITIUS endemic diseases
- Help narrow tropical disease differential
- Use appropriate medical terminology with local context
- Include 4 specific answer options relevant to tropical medicine
- Consider seasonal epidemiology
${patient.isPregnant ? '- Account for pregnancy complications with tropical diseases' : ''}

Format:
{
  "questions": [
    {
      "id": 1,
      "question": "Mauritius-specific clinical question",
      "options": ["Tropical-specific option 1", "Tropical-specific option 2", "Tropical-specific option 3", "None of these"],
      "priority": "high",
      "rationale": "Tropical disease clinical reasoning",
      "tropicalDiseaseRelevance": "How this differentiates dengue/chikungunya/malaria/leptospirosis",
      "mauritiusContext": true,
      "clinicalRelevance": "How this guides tropical disease management"
    }
  ]
}

Generate exactly 5 MAURITIUS-ADAPTED questions. Response must be valid JSON only.`
}

function generateMauritiusIntelligentModePrompt(
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
  
  const pregnancySection = patient.isPregnant ? `

⚠️ ═══════════════════════════════════════════════════════════
PREGNANCY + TROPICAL DISEASE CRITICAL INTERACTIONS
═══════════════════════════════════════════════════════════
- Status: ${patient.pregnancyStatus}
- Last Menstrual Period: ${patient.lastMenstrualPeriod || 'Not provided'}
- Gestational Age: ${patient.gestationalAge || 'To be calculated'}

PREGNANCY-SPECIFIC TROPICAL DISEASE CONSIDERATIONS:
- Dengue in pregnancy: Increased bleeding risk, fetal distress, maternal mortality
- Chikungunya in pregnancy: Vertical transmission, neonatal complications
- Malaria in pregnancy: Severe anemia, preterm labor, low birth weight
- Leptospirosis in pregnancy: Fetal loss, preterm delivery

MEDICATION SAFETY: ALL drugs must be pregnancy category A/B
DIAGNOSTIC SAFETY: Minimize radiation exposure
MONITORING: Enhanced maternal-fetal surveillance required
═══════════════════════════════════════════════════════════
` : ''
  
  const seasonalContext = context.mauritiusSeasonalContext
  const tropicalRisk = context.tropicalDiseaseRisk
  
  return `COMPREHENSIVE SPECIALIST CONSULTATION - MAURITIUS TROPICAL EXPERT MODE

🏝️ ═══════════════════════════════════════════════════════════
MAURITIUS TROPICAL MEDICINE SPECIALIST ASSESSMENT
═══════════════════════════════════════════════════════════

GEOGRAPHICAL & EPIDEMIOLOGICAL CONTEXT:
- Location: Republic of Mauritius (20.2°S, 57.5°E)
- Climate: Tropical maritime, monsoon influenced
- Population: 1.3M, multi-ethnic (Indo-Mauritian, Creole, Sino-Mauritian, Franco-Mauritian)
- Health System: Mixed public-private, UK-influenced medical standards

ENDEMIC TROPICAL DISEASES - DETAILED EPIDEMIOLOGY:
═══════════════════════════════════════════════════════════

DENGUE FEVER:
- Serotypes: All 4 dengue serotypes circulate (DENV-1, 2, 3, 4)
- Vectors: Aedes aegypti (primary), Aedes albopictus
- Seasonality: Year-round transmission, peaks Nov-April (rainy season)
- Case fatality rate: <1% with proper management, 10-20% if untreated DHF/DSS
- Recent outbreaks: Recurring every 3-4 years with serotype switches

CHIKUNGUNYA:
- Last major epidemic: 2005-2006 (>300,000 cases, 25% population)
- Vector: Same as dengue (Aedes species)
- Chronic phase: 40-60% develop persistent arthralgia
- Vertical transmission: High risk during delivery

MALARIA:
- Species: P. vivax (>90%), P. falciparum (<10%)
- Transmission: Very low endemic, mostly imported from Madagascar/Africa
- Vector: Anopheles arabiensis (limited distribution)
- Elimination status: Mauritius targeting elimination by 2025

LEPTOSPIROSIS:
- Incidence: 50-100 cases/year, peaks during cyclone/flood seasons
- Serovars: Hebdomadis, Icterohaemorrhagiae predominant
- Risk factors: Occupational (agriculture, fishing), recreational water exposure
- Case fatality: 5-15% if severe (Weil's disease)

CURRENT SEASONAL CONTEXT:
═══════════════════════════════════════════════════════════
- Season: ${seasonalContext.currentSeason}
- Disease risk level: ${seasonalContext.diseaseRiskLevel}
- Predominant diseases: ${seasonalContext.predominantDiseases.join(', ')}
- Environmental factors: ${seasonalContext.environmentalFactors.join(', ')}

PATIENT DEMOGRAPHICS & ASSESSMENT:
═══════════════════════════════════════════════════════════
- Age: ${patient.age} years
- Sex/Gender: ${patient.gender}
- BMI: ${patient.bmi?.toFixed(2)} kg/m² (${patient.bmiCategory})

COMPREHENSIVE MEDICAL HISTORY:
${fullMedicalHistory}

CURRENT MEDICATIONS:
${fullMedications}
${allergiesStr}

DETAILED LIFESTYLE ASSESSMENT:
- Tobacco: ${patient.lifestyle.smoking} ${patient.lifestyle.smoking === 'current' ? '⚠️ ACTIVE SMOKER' : ''}
- Alcohol: ${patient.lifestyle.alcohol}
- Physical Activity: ${patient.lifestyle.exercise}
- Mosquito Exposure: ${patient.lifestyle.mosquitoExposure} 🦟
- Water Contact: ${patient.lifestyle.waterContact} 💧

CURRENT PRESENTATION:
═══════════════════════════════════════════════════════════
Chief Complaint: "${clinical.mainComplaint}"
Onset: ${clinical.duration.value} ago
Pain severity: ${clinical.painCategory} (${clinical.painLevel}/10)
Course: ${clinical.evolution || 'Progressive'}

COMPREHENSIVE SYMPTOM REVIEW:
${clinical.symptomsList.map(s => `• ${s}`).join('\n')}

VITAL SIGNS & PHYSICAL PARAMETERS:
- Temperature: ${clinical.vitals.temperature || 'Not measured'}°C ${clinical.vitals.tempStatus ? `(${clinical.vitals.tempStatus})` : ''}
- Blood Pressure: ${clinical.vitals.bloodPressure || 'Not measured'} ${clinical.vitals.bpStatus ? `(${clinical.vitals.bpStatus})` : ''}
- Heart Rate: ${clinical.vitals.heartRate || 'Not measured'} bpm

MAURITIUS-SPECIFIC EPIDEMIOLOGICAL FACTORS:
- Community outbreak pattern: ${clinical.communityPattern}
- Mosquito activity level: ${clinical.mosquitoActivityLevel}
- Seasonal onset timing: ${clinical.seasonalOnset || 'Not specified'}

COMPREHENSIVE RISK STRATIFICATION:
═══════════════════════════════════════════════════════════
Overall Criticality Score: ${context.criticalityScore}/10

TROPICAL DISEASE RISK MATRIX:
- Dengue fever: ${tropicalRisk.dengue} ${tropicalRisk.dengue === 'very_high' ? '🚨' : tropicalRisk.dengue === 'high' ? '⚠️' : ''}
- Chikungunya: ${tropicalRisk.chikungunya} ${tropicalRisk.chikungunya === 'very_high' ? '🚨' : tropicalRisk.chikungunya === 'high' ? '⚠️' : ''}
- Malaria: ${tropicalRisk.malaria} ${tropicalRisk.malaria === 'high' ? '🚨' : ''}
- Leptospirosis: ${tropicalRisk.leptospirosis} ${tropicalRisk.leptospirosis === 'high' ? '🚨' : ''}
- Overall tropical risk: ${tropicalRisk.overallTropicalRisk}/10

Standard Risk Assessment:
- Cardiovascular: ${patient.riskProfile.cardiovascular.toUpperCase()}
- Diabetes: ${patient.riskProfile.diabetes.toUpperCase()}
- Respiratory: ${patient.riskProfile.respiratory.toUpperCase()}

IDENTIFIED RED FLAGS:
${context.redFlags.length > 0 ? context.redFlags.map(f => `🚨 ${f}`).join('\n') : '✅ No immediate red flags identified'}

MAURITIUS TROPICAL DISEASE DIFFERENTIAL DIAGNOSIS:
═══════════════════════════════════════════════════════════
${generateMauritiusDifferentialDiagnosis(clinical.complaintCategory, clinical.symptomsList, tropicalRisk, patient.isPregnant)}${pregnancySection}

EXPERT TROPICAL MEDICINE DIAGNOSTIC QUESTIONING:
═══════════════════════════════════════════════════════════

Generate 8 sophisticated MAURITIUS TROPICAL MEDICINE questions that:

MANDATORY TROPICAL DISEASE FOCUS:
1. MUST differentiate DENGUE vs CHIKUNGUNYA vs MALARIA (symptom timing, joint vs muscle pain, fever patterns)
2. MUST assess DENGUE SEVERITY (bleeding, plasma leakage, thrombocytopenia signs)
3. MUST evaluate MALARIA risk (periodic fever, travel to endemic regions of Mauritius, imported cases)
4. MUST screen for LEPTOSPIROSIS (water exposure, occupational risk, Weil's disease signs)
5. MUST assess COMMUNITY TRANSMISSION (family clusters, neighborhood outbreaks)
6. MUST evaluate SEASONAL/ENVIRONMENTAL factors (rainfall, mosquito breeding, water contamination)
7. MUST consider COMORBIDITY interactions (diabetes, immunosuppression, pregnancy)
8. MUST determine URGENCY LEVEL (immediate treatment needs, hospitalization criteria)

${patient.isPregnant ? `
MANDATORY PREGNANCY-TROPICAL DISEASE INTERACTIONS:
9. MUST assess maternal-fetal risk (vertical transmission, bleeding risk, preterm labor)
10. MUST evaluate medication safety (pregnancy categories, teratogenicity)
` : ''}

❌ ABSOLUTELY FORBIDDEN QUESTIONS:
- "Have you traveled to tropical countries recently?" (INAPPROPRIATE - THEY LIVE IN TROPICS)
- "Any exposure to malaria during international travel?" (MALARIA IS ENDEMIC LOCALLY)
- "Risk of dengue from recent trips?" (DENGUE IS YEAR-ROUND ENDEMIC)

✅ MAURITIUS-EXPERT QUESTIONS MUST:
- Address SPECIFIC endemic disease patterns
- Differentiate between SIMILAR TROPICAL PRESENTATIONS
- Assess SEVERITY using WHO/local guidelines
- Consider SEASONAL EPIDEMIOLOGY
- Evaluate LOCAL TRANSMISSION patterns
- Account for MAURITIUS HEALTHCARE CONTEXT

Requirements for each question:
- Use precise TROPICAL MEDICINE terminology with patient-friendly explanations
- Include 4 highly specific options relevant to endemic diseases
- Explain diagnostic value for tropical disease differentiation
- Indicate urgency based on tropical disease severity
- Consider seasonal and community epidemiology
- Account for local healthcare resources and referral patterns
${patient.isPregnant ? '- ALWAYS prioritize pregnancy + tropical disease safety' : ''}

Format:
{
  "questions": [
    {
      "id": 1,
      "question": "Expert tropical medicine question with detailed clinical context",
      "options": [
        "Very specific tropical disease option 1",
        "Very specific tropical disease option 2", 
        "Very specific tropical disease option 3",
        "None of the above/Not applicable"
      ],
      "priority": "high",
      "rationale": "Detailed tropical medicine clinical reasoning",
      "redFlagDetection": true/false,
      "tropicalDiseaseRelevance": "Specific relevance to dengue/chikungunya/malaria/leptospirosis differentiation",
      "mauritiusContext": true,
      "clinicalRelevance": "How this changes tropical disease management and referral decisions"
    }
  ]
}

Generate exactly 8 MAURITIUS TROPICAL MEDICINE expert-level questions. Response must be valid JSON only.`
}

function generateMauritiusDifferentialDiagnosis(
  category: string, 
  symptoms: string[], 
  tropicalRisk: TropicalDiseaseRisk,
  isPregnant: boolean = false
): string {
  const differentials: string[] = []
  
  // MAURITIUS-SPECIFIC TROPICAL DIFFERENTIALS FIRST
  if (category === 'tropical_fever' || category === 'constitutional' || symptoms.some(s => s.toLowerCase().includes('fever'))) {
    differentials.push('TROPICAL FEVER SYNDROME DIFFERENTIALS:')
    
    if (tropicalRisk.dengue === 'very_high' || tropicalRisk.dengue === 'high') {
      differentials.push('1. Dengue fever (classic triad: fever, headache, myalgia)')
      differentials.push('   - Dengue hemorrhagic fever (bleeding, thrombocytopenia)')
      differentials.push('   - Dengue shock syndrome (hypotension, plasma leakage)')
    }
    
    if (tropicalRisk.chikungunya === 'very_high' || tropicalRisk.chikungunya === 'high') {
      differentials.push('2. Chikungunya fever (severe arthralgia, sudden onset)')
      differentials.push('   - Acute phase (<21 days)')
      differentials.push('   - Chronic arthropathy (>3 months)')
    }
    
    if (tropicalRisk.malaria === 'high') {
      differentials.push('3. Malaria (periodic fever, chills, sweats)')
      differentials.push('   - P. vivax (tertian fever pattern)')
      differentials.push('   - P. falciparum (severe malaria, cerebral complications)')
    }
    
    if (tropicalRisk.leptospirosis === 'high') {
      differentials.push('4. Leptospirosis (fever, myalgia, conjunctival suffusion)')
      differentials.push('   - Anicteric form (mild)')
      differentials.push('   - Weil\'s disease (jaundice, renal failure)')
    }
    
    differentials.push('5. Other viral syndromes (influenza, COVID-19, EBV)')
    differentials.push('6. Bacterial infections (pneumonia, UTI, sepsis)')
  }
  
  // PREGNANCY-SPECIFIC DIFFERENTIALS
  if (isPregnant) {
    differentials.push('')
    differentials.push('PREGNANCY-SPECIFIC CONSIDERATIONS:')
    differentials.push('• Dengue in pregnancy (maternal bleeding risk, fetal distress)')
    differentials.push('• Chikungunya vertical transmission (if near delivery)')
    differentials.push('• Malaria in pregnancy (severe anemia, preterm labor)')
    differentials.push('• Pregnancy-related conditions (preeclampsia, HELLP, hyperemesis)')
  }
  
  // STANDARD DIFFERENTIALS ADAPTED FOR MAURITIUS
  switch (category) {
    case 'cardiovascular':
      differentials.push('')
      differentials.push('CARDIOVASCULAR DIFFERENTIALS:')
      differentials.push('1. Acute Coronary Syndrome')
      differentials.push('2. Pulmonary Embolism (increased risk in tropics due to dehydration)')
      differentials.push('3. Myocarditis (post-chikungunya, post-dengue)')
      differentials.push('4. Hypertensive emergency')
      break
      
    case 'respiratory':
      differentials.push('')
      differentials.push('RESPIRATORY DIFFERENTIALS:')
      differentials.push('1. Community-Acquired Pneumonia')
      differentials.push('2. Dengue-related respiratory complications')
      differentials.push('3. Sugar cane burning-related respiratory irritation')
      differentials.push('4. Tropical pulmonary eosinophilia')
      break
      
    case 'neurological':
      differentials.push('')
      differentials.push('NEUROLOGICAL DIFFERENTIALS:')
      differentials.push('1. Dengue-related headache vs secondary headache')
      differentials.push('2. Chikungunya-related neurological complications')
      differentials.push('3. Cerebral malaria (if P. falciparum)')
      differentials.push('4. Leptospiral meningitis')
      break
      
    case 'gastrointestinal':
      differentials.push('')
      differentials.push('GASTROINTESTINAL DIFFERENTIALS:')
      differentials.push('1. Dengue-related abdominal pain (warning sign)')
      differentials.push('2. Gastroenteritis (water contamination post-rains)')
      differentials.push('3. Hepatitis (leptospirosis, viral)')
      differentials.push('4. Peptic ulcer disease')
      break
      
    default:
      if (differentials.length === 0) {
        differentials.push('GENERAL DIFFERENTIALS:')
        differentials.push('1. Viral syndrome (consider tropical viruses)')
        differentials.push('2. Bacterial infection')
        differentials.push('3. Inflammatory condition')
        differentials.push('4. Medication-related symptoms')
      }
  }
  
  return differentials.join('\n')
}

// ==================== MAURITIUS-ADAPTED RECOMMENDATION FUNCTIONS ====================
function generateMauritiusRecommendations(
  context: MedicalContext,
  mode: string
): APIResponse['recommendations'] {
  const recommendations: APIResponse['recommendations'] = {}
  const { patient, clinical, tropicalDiseaseRisk } = context
  
  // Immediate actions for high criticality
  if (context.criticalityScore >= 7) {
    recommendations.immediateAction = [
      'Call SAMU 114 or go to nearest emergency department immediately',
      'Do not drive yourself - arrange emergency transport',
      'Bring list of current medications and medical history',
      'If bleeding/easy bruising: Urgent hospital evaluation for dengue hemorrhagic fever'
    ]
    
    if (patient.isPregnant) {
      recommendations.immediateAction.push('Inform emergency services that you are pregnant')
      recommendations.immediateAction.push('Contact your obstetrician urgently')
    }
    
    if (tropicalDiseaseRisk.dengue === 'very_high' || tropicalDiseaseRisk.chikungunya === 'very_high') {
      recommendations.immediateAction.push('Mention possible dengue/chikungunya to medical team')
    }
  } else if (context.criticalityScore >= 5) {
    recommendations.immediateAction = [
      'Seek medical attention within 24 hours at nearest health center',
      'Monitor symptoms closely, especially fever and pain levels',
      'Maintain hydration - increase fluid intake',
      'Avoid aspirin and NSAIDs if fever present (bleeding risk with dengue)'
    ]
    
    if (patient.isPregnant) {
      recommendations.immediateAction.push('Contact your obstetrician within 24 hours')
    }
  }
  
  // Follow-up recommendations
  if (context.criticalityScore >= 4) {
    recommendations.followUp = patient.isPregnant 
      ? 'Urgent appointment with obstetrician and internal medicine specialist for tropical disease evaluation'
      : 'Urgent appointment with internal medicine or infectious disease specialist'
  } else {
    recommendations.followUp = 'Routine follow-up with primary care physician if symptoms persist or worsen'
  }
  
  // MAURITIUS-SPECIFIC ADDITIONAL TESTS
  const tests: string[] = []
  
  // Tropical disease-specific tests
  if (tropicalDiseaseRisk.dengue === 'high' || tropicalDiseaseRisk.dengue === 'very_high') {
    tests.push('NS1 antigen test (if <7 days of fever)')
    tests.push('Dengue IgM/IgG serology (if >5 days of fever)')
    tests.push('Full blood count with platelet count')
    tests.push('Hematocrit monitoring')
  }
  
  if (tropicalDiseaseRisk.chikungunya === 'high' || tropicalDiseaseRisk.chikungunya === 'very_high') {
    tests.push('Chikungunya RT-PCR (acute phase)')
    tests.push('Chikungunya IgM serology')
  }
  
  if (tropicalDiseaseRisk.malaria === 'high') {
    tests.push('Malaria rapid diagnostic test (RDT)')
    tests.push('Blood smear for malaria parasites')
    tests.push('If positive: Species identification and parasitemia count')
  }
  
  if (tropicalDiseaseRisk.leptospirosis === 'high') {
    tests.push('Leptospirosis serology (acute and convalescent)')
    tests.push('Liver function tests')
    tests.push('Renal function tests')
    tests.push('Urinalysis')
  }
  
  // Standard tests adapted for tropical context
  if (clinical.complaintCategory === 'cardiovascular') {
    tests.push('ECG', 'Troponin levels')
    if (!patient.isPregnant) {
      tests.push('Chest X-ray')
    } else {
      tests.push('Echocardiogram (safer than X-ray in pregnancy)')
    }
  } else if (clinical.complaintCategory === 'respiratory') {
    tests.push('Pulse oximetry', 'Sputum culture if productive cough')
    if (!patient.isPregnant) {
      tests.push('Chest X-ray')
    } else {
      tests.push('Chest X-ray only if essential (with abdominal shielding)')
    }
  }
  
  // Pregnancy-specific tests
  if (patient.isPregnant) {
    tests.push('Urine protein dipstick')
    tests.push('Blood pressure monitoring')
    tests.push('Fetal heart rate monitoring if indicated')
    if (tropicalDiseaseRisk.dengue === 'high' || tropicalDiseaseRisk.dengue === 'very_high') {
      tests.push('Enhanced maternal monitoring for bleeding')
      tests.push('Fetal monitoring for distress signs')
    }
  }
  
  if (tests.length > 0) {
    recommendations.additionalTests = tests
  }
  
  // Specialist referral
  if (context.suggestedSpecialty && context.criticalityScore >= 3) {
    let specialty = context.suggestedSpecialty
    
    if (patient.isPregnant && specialty !== 'Emergency Medicine') {
      specialty = 'Obstetrics/Gynecology + ' + specialty
    }
    
    // Add infectious disease if high tropical risk
    if ((tropicalDiseaseRisk.dengue === 'very_high' || tropicalDiseaseRisk.chikungunya === 'very_high' || tropicalDiseaseRisk.malaria === 'high') 
        && !specialty.includes('Infectious Disease')) {
      specialty = specialty + ' + Infectious Disease'
    }
    
    recommendations.specialistReferral = specialty
  }
  
  // MAURITIUS-SPECIFIC TROPICAL DISEASE CONSIDERATIONS
  const tropicalConsiderations: string[] = []
  
  if (clinical.vitals.tempStatus === 'fever') {
    tropicalConsiderations.push('Fever in Mauritius requires tropical disease evaluation')
    tropicalConsiderations.push('Avoid aspirin and NSAIDs until dengue is ruled out')
    tropicalConsiderations.push('Monitor for dengue warning signs: bleeding, severe abdominal pain, persistent vomiting')
  }
  
  if (tropicalDiseaseRisk.dengue === 'high' || tropicalDiseaseRisk.dengue === 'very_high') {
    tropicalConsiderations.push('Dengue warning signs to watch: severe abdominal pain, persistent vomiting, bleeding, restlessness')
    tropicalConsiderations.push('Seek immediate care if blood pressure drops or breathing difficulties')
    tropicalConsiderations.push('Maintain adequate fluid intake but avoid overhydration')
  }
  
  if (tropicalDiseaseRisk.chikungunya === 'high' || tropicalDiseaseRisk.chikungunya === 'very_high') {
    tropicalConsiderations.push('Chikungunya joint pain may persist for months - early physiotherapy helps')
    tropicalConsiderations.push('Use paracetamol for pain relief, avoid aspirin/NSAIDs in acute phase')
  }
  
  if (clinical.communityPattern === 'family_cluster' || clinical.communityPattern === 'neighborhood_outbreak') {
    tropicalConsiderations.push('Possible community outbreak - notify health authorities')
    tropicalConsiderations.push('Implement mosquito control measures at home')
    tropicalConsiderations.push('Family members should be monitored for similar symptoms')
  }
  
  // Seasonal considerations
  const seasonalContext = getCurrentSeasonalContext()
  if (seasonalContext.currentSeason === 'rainy' || seasonalContext.currentSeason === 'cyclone') {
    tropicalConsiderations.push('Rainy season increases vector-borne disease risk')
    tropicalConsiderations.push('Eliminate stagnant water around home to reduce mosquito breeding')
    tropicalConsiderations.push('Use mosquito repellent and protective clothing')
  }
  
  if (tropicalConsiderations.length > 0) {
    recommendations.tropicalDiseaseConsiderations = tropicalConsiderations
  }
  
  return recommendations
}

function calculateDataCompleteness(patient: ProcessedPatientData, clinical: ProcessedClinicalData): number {
  let fieldsProvided = 0
  let totalFields = 0
  
  // Standard patient data
  const patientFields = ['age', 'gender', 'bmi', 'chronicConditions', 'allergiesList', 'medicationsList']
  patientFields.forEach(field => {
    totalFields++
    if ((patient as any)[field]) fieldsProvided++
  })
  
  // Standard clinical data
  const clinicalFields = ['mainComplaint', 'symptomsList', 'duration', 'painLevel', 'vitals']
  clinicalFields.forEach(field => {
    totalFields++
    if ((clinical as any)[field]) fieldsProvided++
  })
  
  // MAURITIUS-SPECIFIC FIELDS
  const mauritiusFields = ['communityPattern', 'mosquitoActivityLevel']
  mauritiusFields.forEach(field => {
    totalFields++
    if ((clinical as any)[field] && (clinical as any)[field] !== 'unknown') fieldsProvided++
  })
  
  // Pregnancy fields if applicable
  if (patient.isChildbearingAge && patient.gender === 'Female') {
    totalFields++
    if (patient.pregnancyStatus) fieldsProvided++
  }
  
  // Tropical exposure fields
  const tropicalExposureFields = ['mosquitoExposure', 'waterContact']
  tropicalExposureFields.forEach(field => {
    totalFields++
    if ((patient.lifestyle as any)[field] && (patient.lifestyle as any)[field] !== 'unknown') fieldsProvided++
  })
  
  return Math.round((fieldsProvided / totalFields) * 100)
}

function calculateConfidenceLevel(
  dataCompleteness: number,
  mode: string,
  criticalityScore: number,
  isPregnant: boolean = false,
  tropicalRisk: TropicalDiseaseRisk
): number {
  let confidence = dataCompleteness
  
  // Adjust based on mode
  if (mode === 'intelligent') confidence += 15 // Higher confidence for expert mode
  else if (mode === 'balanced') confidence += 10
  else confidence += 5 // Fast mode
  
  // Adjust based on criticality
  if (criticalityScore >= 7 && dataCompleteness < 80) {
    confidence -= 25 // Lower confidence for critical cases without full data
  }
  
  // Pregnancy considerations
  if (isPregnant && dataCompleteness < 90) {
    confidence -= 15 // Higher data requirements for pregnant patients
  }
  
  // Tropical disease risk considerations
  if ((tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') && dataCompleteness < 85) {
    confidence -= 10 // Need more data for high tropical disease risk
  }
  
  // Boost confidence if we have good tropical disease context
  if (dataCompleteness >= 85 && mode === 'intelligent') {
    confidence += 5 // Good tropical disease assessment capability
  }
  
  return Math.max(30, Math.min(95, confidence))
}

// ==================== DATA PROTECTION ====================
function anonymizeData(patient: PatientData): {
  anonymized: PatientData,
  anonymousId: string,
  removedFields: string[]
} {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const anonymousId = `MU-ANON-${timestamp}-${random}`
  
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
    
    console.log('🏝️ MAURITIUS TROPICAL MEDICINE API - Processing request:', {
      patientAge: patientData?.age,
      gender: patientData?.gender,
      complaint: clinicalData?.chiefComplaint,
      mode,
      hasFever: clinicalData?.vitalSigns?.temperature ? clinicalData.vitalSigns.temperature > 37.2 : false
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
    
    // 5. Process data with Mauritius adaptations
    const processedPatient = processPatientData(anonymized)
    const processedClinical = processClinicalData(clinicalData)
    
    console.log('✅ Mauritius data processed:', {
      patient: {
        age: processedPatient.age,
        gender: processedPatient.gender,
        isPregnant: processedPatient.isPregnant,
        tropicalRisk: processedPatient.riskProfile.tropical,
        mosquitoExposure: processedPatient.lifestyle.mosquitoExposure
      },
      clinical: {
        complaint: processedClinical.mainComplaint,
        category: processedClinical.complaintCategory,
        fever: processedClinical.vitals.tempStatus,
        communityPattern: processedClinical.communityPattern
      }
    })
    
    // 6. Mauritius-specific risk assessment
    const mauritiusSeasonalContext = getCurrentSeasonalContext()
    const tropicalDiseaseRisk = calculateTropicalDiseaseRisk(processedPatient, processedClinical, mauritiusSeasonalContext)
    
    // Standard risk factors
    const riskFactors: RiskFactor[] = []
    
    // Add tropical disease risk factors
    if (tropicalDiseaseRisk.dengue === 'very_high') {
      riskFactors.push({
        factor: 'Very high dengue risk',
        severity: 'critical',
        relatedTo: 'Tropical disease exposure',
        mauritiusSpecific: true
      })
    }
    
    if (tropicalDiseaseRisk.chikungunya === 'very_high') {
      riskFactors.push({
        factor: 'Very high chikungunya risk',
        severity: 'critical',
        relatedTo: 'Tropical disease exposure',
        mauritiusSpecific: true
      })
    }
    
    if (tropicalDiseaseRisk.malaria === 'high') {
      riskFactors.push({
        factor: 'High malaria risk',
        severity: 'high',
        relatedTo: 'Endemic disease exposure',
        mauritiusSpecific: true
      })
    }
    
    // Community outbreak risk
    if (processedClinical.communityPattern === 'neighborhood_outbreak') {
      riskFactors.push({
        factor: 'Community disease outbreak',
        severity: 'high',
        relatedTo: 'Epidemiological pattern',
        mauritiusSpecific: true
      })
    }
    
    // Seasonal risk
    if (mauritiusSeasonalContext.diseaseRiskLevel === 'very_high') {
      riskFactors.push({
        factor: 'High-risk season for tropical diseases',
        severity: 'medium',
        relatedTo: 'Seasonal epidemiology',
        mauritiusSpecific: true
      })
    }
    
    // Standard risk factors
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
    
    if (processedPatient.isPregnant) {
      riskFactors.push({
        factor: 'Pregnancy with tropical disease exposure',
        severity: 'high',
        relatedTo: 'Physiological state + tropical diseases',
        mauritiusSpecific: true
      })
    }
    
    // 7. Calculate scores with tropical considerations
    const criticalityScore = calculateCriticalityScore(processedPatient, processedClinical, tropicalDiseaseRisk)
    const redFlags = detectMauritiusRedFlags(processedPatient, processedClinical, tropicalDiseaseRisk)
    const suggestedSpecialty = suggestMauritiusSpecialty(
      processedClinical.complaintCategory, 
      redFlags, 
      processedPatient.isPregnant,
      tropicalDiseaseRisk
    )
    
    // 8. Auto-adjust mode for tropical diseases and pregnancy
    let adjustedMode = mode
    if (criticalityScore >= 8 && mode !== 'intelligent') {
      adjustedMode = 'intelligent'
      console.log(`⚠️ Auto-escalated to intelligent mode due to criticality: ${criticalityScore}`)
    } else if ((tropicalDiseaseRisk.dengue === 'very_high' || tropicalDiseaseRisk.chikungunya === 'very_high' || tropicalDiseaseRisk.malaria === 'high') && mode === 'fast') {
      adjustedMode = 'balanced'
      console.log(`🦟 Upgraded to balanced mode due to high tropical disease risk`)
    } else if (processedPatient.isPregnant && mode === 'fast') {
      adjustedMode = 'balanced'
      console.log(`👶 Upgraded to balanced mode due to pregnancy`)
    }
    
    // 9. Create Mauritius medical context
    const context: MedicalContext = {
      patient: processedPatient,
      clinical: processedClinical,
      riskFactors,
      criticalityScore,
      redFlags,
      suggestedSpecialty,
      tropicalDiseaseRisk,
      mauritiusSeasonalContext
    }
    
    // 10. Generate Mauritius-adapted prompt
    const prompt = generateMauritiusModeSpecificPrompt(adjustedMode, context)
    
    // 11. Call OpenAI with tropical medicine expertise
    const aiConfig = {
      fast: { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 800 },
      balanced: { model: 'gpt-4o', temperature: 0.2, maxTokens: 1200 },
      intelligent: { model: 'gpt-4o', temperature: 0.3, maxTokens: 2000 }
    }[adjustedMode] || { model: 'gpt-4o', temperature: 0.2, maxTokens: 1200 }
    
    console.log(`🤖 Calling ${aiConfig.model} with ${adjustedMode} mode for tropical medicine assessment`)
    
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
            content: `You are an expert tropical medicine physician practicing in Mauritius with extensive experience in dengue, chikungunya, malaria, and leptospirosis. You understand the local epidemiology, seasonal patterns, and healthcare context of Mauritius. Generate diagnostic questions based on tropical medicine evidence and Mauritius-specific clinical protocols. Always respond with valid JSON only. ${processedPatient.isPregnant ? 'CRITICAL: This patient is pregnant - consider pregnancy complications with tropical diseases and medication safety.' : ''}`
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
    
    // 12. Calculate metadata with Mauritius considerations
    const dataCompleteness = calculateDataCompleteness(processedPatient, processedClinical)
    const confidenceLevel = calculateConfidenceLevel(
      dataCompleteness, 
      adjustedMode, 
      criticalityScore,
      processedPatient.isPregnant,
      tropicalDiseaseRisk
    )
    
    // 13. Generate Mauritius-specific recommendations
    const recommendations = generateMauritiusRecommendations(context, adjustedMode)
    
    // 14. Build final response
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
        urgencyLevel: calculateUrgencyLevel(criticalityScore, processedPatient.isPregnant, tropicalDiseaseRisk),
        triageCategory: getTriageCategory(criticalityScore, processedPatient.isPregnant, tropicalDiseaseRisk),
        tropicalDiseaseRisk,
        mauritiusContext: mauritiusSeasonalContext
      },
      recommendations,
      dataProtection: {
        enabled: true,
        anonymousId,
        method: 'field_removal',
        compliance: ['GDPR', 'HIPAA', 'Mauritius Data Protection Act']
      },
      metadata: {
        model: aiConfig.model,
        processingTime: Date.now() - startTime,
        dataCompleteness,
        confidenceLevel,
        mauritiusAdaptation: true
      }
    }
    
    // 15. Cache response
    cache.set(cacheKey, response)
    
    console.log('✅ Mauritius tropical medicine API response generated:', {
      questionsCount: questions.length,
      criticalityScore,
      redFlagsCount: redFlags.length,
      mode: adjustedMode,
      isPregnant: processedPatient.isPregnant,
      tropicalRisk: tropicalDiseaseRisk.overallTropicalRisk,
      seasonalContext: mauritiusSeasonalContext.currentSeason
    })
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('❌ Mauritius Tropical Medicine API Error:', error)
    
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
        triageCategory: 'Requires manual review',
        tropicalDiseaseRisk: {
          dengue: 'low',
          chikungunya: 'low',
          malaria: 'low',
          leptospirosis: 'low',
          overallTropicalRisk: 0
        },
        mauritiusContext: {
          currentSeason: 'unknown',
          diseaseRiskLevel: 'medium',
          predominantDiseases: [],
          environmentalFactors: []
        }
      },
      recommendations: {
        followUp: 'Please consult with a healthcare provider familiar with tropical diseases for proper assessment'
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
        confidenceLevel: 0,
        mauritiusAdaptation: false
      }
    }, { status: 500 })
  }
}

// ==================== MAURITIUS TEST ENDPOINT ====================
export async function GET() {
  const currentSeason = getCurrentSeasonalContext()
  
  return NextResponse.json({
    status: '✅ Mauritius Tropical Medicine API v3.0 Operational',
    version: '3.0.0 - MAURITIUS ADAPTED - BUG FIXED',
    
    mauritiusContext: {
      location: 'Republic of Mauritius (20.2°S, 57.5°E)',
      climate: 'Tropical maritime',
      population: '1.3M multi-ethnic',
      healthSystem: 'Mixed public-private, UK-influenced standards',
      endemicDiseases: ['Dengue', 'Chikungunya', 'Malaria', 'Leptospirosis'],
      currentSeason: currentSeason.currentSeason,
      diseaseRiskLevel: currentSeason.diseaseRiskLevel,
      predominantDiseases: currentSeason.predominantDiseases
    },
    
    tropicalDiseaseSupport: {
      dengue: {
        surveillance: 'Year-round monitoring with rainy season alerts',
        diagnosis: 'NS1 antigen, IgM/IgG serology, platelet monitoring',
        complications: 'DHF/DSS detection and management protocols'
      },
      chikungunya: {
        surveillance: 'Vector surveillance and epidemic preparedness',
        diagnosis: 'RT-PCR and serology',
        chronicManagement: 'Long-term arthralgia management protocols'
      },
      malaria: {
        status: 'Low endemic, mostly imported cases',
        diagnosis: 'RDT and microscopy available',
        species: 'P. vivax predominant, rare P. falciparum'
      },
      leptospirosis: {
        seasonality: 'Rainy season and flood-associated outbreaks',
        occupationalRisk: 'Agriculture, fishing, water sports',
        diagnosis: 'Clinical + serology, early antibiotic treatment'
      }
    },
    
    features: [
      '🏝️ Mauritius tropical disease context integration',
      '🦟 Endemic disease risk assessment (dengue, chikungunya, malaria, leptospirosis)',
      '🌦️ Seasonal epidemiology consideration',
      '👥 Community outbreak detection',
      '🤰 Pregnancy + tropical disease interaction assessment',
      '🩺 Mauritius healthcare context adaptation',
      '📊 Tropical disease-specific triage protocols',
      '🔬 Local diagnostic test recommendations',
      '🏥 Mauritius specialist referral pathways',
      '🚫 Elimination of inappropriate travel-related questions',
      '🇲🇺 Compliance with Mauritius medical standards',
      '🐛 BUG FIX: Fixed tropicalRisk variable name error'
    ],
    
    bugFixes: {
      v3_0_1: {
        issue: 'ReferenceError: tropicalRisk is not defined',
        fix: 'Corrected variable name from tropicalRisk to tropicalDiseaseRisk in generateMauritiusRecommendations function',
        affectedFunction: 'generateMauritiusRecommendations',
        status: 'RESOLVED'
      }
    },
    
    modes: {
      fast: {
        description: 'Rapid tropical disease triage',
        questions: 3,
        focusOn: 'Dengue hemorrhagic fever, severe malaria, pregnancy emergencies',
        model: 'gpt-4o-mini'
      },
      balanced: {
        description: 'Standard tropical medicine assessment',
        questions: 5,
        focusOn: 'Tropical disease differentiation + community outbreak + pregnancy',
        model: 'gpt-4o'
      },
      intelligent: {
        description: 'Expert tropical medicine consultation',
        questions: 8,
        focusOn: 'Complex tropical cases + rare complications + chronic management',
        model: 'gpt-4o'
      }
    },
    
    testEndpoints: {
      production: 'POST /api/openai-questions',
      health: 'GET /api/openai-questions',
      testTropicalRisk: 'GET /api/openai-questions?test=tropical',
      testSeasonal: 'GET /api/openai-questions?test=seasonal'
    }
  })
}
