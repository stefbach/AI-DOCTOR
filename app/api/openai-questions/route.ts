// app/api/openai-questions/route.ts - VERSION 3.1 CORRIGÉE
import { type NextRequest, NextResponse } from "next/server"

// ==================== CONFIGURATION ====================
export const runtime = 'edge'
export const preferredRegion = 'auto'

// ==================== INTERFACES & TYPES ====================
interface PatientData {
  firstName?: string
  lastName?: string
  age: string | number
  gender: string
  weight?: string | number
  height?: string | number
  pregnancyStatus?: string
  lastMenstrualPeriod?: string
  gestationalAge?: string
  allergies?: string[]
  medicalHistory?: string[]
  currentMedications?: string
  currentMedicationsText?: string
  lifeHabits?: {
    smoking?: string
    alcohol?: string
    physicalActivity?: string
  }
  smokingStatus?: string
  alcoholConsumption?: string
  physicalActivity?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
}

interface ClinicalData {
  chiefComplaint: string
  diseaseHistory?: string
  symptomDuration?: string
  symptoms?: string[]
  painScale?: string | number
  vitalSigns?: {
    temperature?: string | number
    bloodPressureSystolic?: string | number
    bloodPressureDiastolic?: string | number
  }
}

interface DiseaseHistoryAnalysis {
  timeline: {
    onset: 'sudden' | 'gradual' | 'chronic' | 'unknown'
    progression: 'worsening' | 'stable' | 'improving' | 'fluctuating' | 'unknown'
    recurrence: boolean
    firstEpisode: boolean
  }
  triggers: {
    effort: boolean
    rest: boolean
    food: boolean
    stress: boolean
    position: boolean
    weather: boolean
    medication: boolean
    sleep: boolean
  }
  relievingFactors: {
    rest: boolean
    medication: boolean
    position: boolean
    heat: boolean
    cold: boolean
    nothing: boolean
  }
  characteristics: {
    quality: string[]
    radiation: string[]
    associated: string[]
  }
  redFlags: {
    flag: string
    severity: 'critical' | 'high' | 'medium'
    category: string
    confidence: number
    description: string
  }[]
  criticalityModifiers: {
    reason: string
    points: number
  }[]
  inconsistencies: {
    type: string
    description: string
    fields: string[]
  }[]
  clinicalPatterns: {
    pattern: string
    confidence: number
    specialty: string
    urgency: 'immediate' | 'urgent' | 'routine'
    description: string
  }[]
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
  }
  evolution?: string
  historyAnalysis: DiseaseHistoryAnalysis
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

interface MedicalContext {
  patient: ProcessedPatientData
  clinical: ProcessedClinicalData
  riskFactors: RiskFactor[]
  criticalityScore: number
  redFlags: string[]
  suggestedSpecialty?: string
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
    historyAnalysis: {
      patternsDetected: number
      redFlagsFromHistory: number
      criticalityBonus: number
      inconsistencies: number
    }
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
  private maxAge = 3600000

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
      history: clinical.diseaseHistory,
      mode
    })
    
    let hash = 0
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    return `cache_${Math.abs(hash)}_${mode}`
  }
}

const cache = new EnhancedCache()

// ==================== UTILITY FUNCTIONS ====================
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function containsAny(text: string, keywords: string[]): boolean {
  const normalizedText = normalizeText(text)
  return keywords.some(keyword => normalizedText.includes(normalizeText(keyword)))
}

function containsAll(text: string, keywords: string[]): boolean {
  const normalizedText = normalizeText(text)
  return keywords.every(keyword => normalizedText.includes(normalizeText(keyword)))
}

// ==================== ANALYSE HISTOIRE DE LA MALADIE ====================
function analyzeDiseaseHistory(
  diseaseHistory: string,
  patientData: ProcessedPatientData,
  clinicalData: Partial<ProcessedClinicalData>
): DiseaseHistoryAnalysis {
  
  if (!diseaseHistory || !diseaseHistory.trim()) {
    return getEmptyHistoryAnalysis()
  }
  
  const text = normalizeText(diseaseHistory)
  
  const analysis: DiseaseHistoryAnalysis = {
    timeline: analyzeTimeline(text),
    triggers: analyzeTriggers(text),
    relievingFactors: analyzeRelievingFactors(text),
    characteristics: analyzeCharacteristics(text),
    redFlags: [],
    criticalityModifiers: [],
    inconsistencies: [],
    clinicalPatterns: []
  }
  
  analysis.redFlags = detectRedFlagsFromHistory(text, patientData)
  analysis.criticalityModifiers = calculateHistoryCriticalityModifiers(analysis)
  
  if (clinicalData.duration) {
    analysis.inconsistencies = detectInconsistencies(diseaseHistory, clinicalData)
  }
  
  analysis.clinicalPatterns = identifyClinicalPatterns(text, patientData)
  
  console.log('History Analysis Results:', {
    redFlags: analysis.redFlags.length,
    patterns: analysis.clinicalPatterns.length,
    criticalityBonus: analysis.criticalityModifiers.reduce((sum, m) => sum + m.points, 0),
    inconsistencies: analysis.inconsistencies.length
  })
  
  return analysis
}

function getEmptyHistoryAnalysis(): DiseaseHistoryAnalysis {
  return {
    timeline: { onset: 'unknown', progression: 'unknown', recurrence: false, firstEpisode: false },
    triggers: { effort: false, rest: false, food: false, stress: false, position: false, weather: false, medication: false, sleep: false },
    relievingFactors: { rest: false, medication: false, position: false, heat: false, cold: false, nothing: false },
    characteristics: { quality: [], radiation: [], associated: [] },
    redFlags: [],
    criticalityModifiers: [],
    inconsistencies: [],
    clinicalPatterns: []
  }
}

function analyzeTimeline(text: string) {
  let onset: 'sudden' | 'gradual' | 'chronic' | 'unknown' = 'unknown'
  let progression: 'worsening' | 'stable' | 'improving' | 'fluctuating' | 'unknown' = 'unknown'
  let recurrence = false
  let firstEpisode = false
  
  // Detection onset - using contains instead of regex
  const suddenKeywords = ['soudain', 'brutal', 'subitement', 'tout a coup', 'dun coup', 'instantane', 'suddenly', 'sudden', 'abrupt']
  const gradualKeywords = ['progressif', 'graduellement', 'petit a petit', 'lentement', 'gradual', 'progressive']
  const worseningKeywords = ['empire', 'aggrave', 'pire', 'sintensifie', 'augmente', 'worsening', 'worse', 'getting worse']
  const improvingKeywords = ['ameliore', 'mieux', 'diminue', 'reduit', 'sattenue', 'improving', 'better']
  
  if (containsAny(text, suddenKeywords)) {
    onset = 'sudden'
  } else if (containsAny(text, gradualKeywords)) {
    onset = 'gradual'
  }
  
  if (containsAny(text, worseningKeywords)) {
    progression = 'worsening'
  } else if (containsAny(text, improvingKeywords)) {
    progression = 'improving'
  }
  
  // Recurrence detection
  const recurrenceKeywords = ['deja eu', 'deja ressenti', 'recurrent', 'habituel', 'comme dhabitude', 'recurrent', 'usual', 'typical']
  if (containsAny(text, recurrenceKeywords)) {
    recurrence = true
  }
  
  // First episode detection
  const firstEpisodeKeywords = ['jamais', 'premiere fois', 'nouveau', 'inhabituel', 'never', 'first time', 'new', 'unusual']
  if (containsAny(text, firstEpisodeKeywords)) {
    firstEpisode = true
  }
  
  return { onset, progression, recurrence, firstEpisode }
}

function analyzeTriggers(text: string) {
  const triggers: any = {}
  
  triggers.effort = containsAny(text, ['effort', 'exercice', 'marche', 'montee', 'escalier', 'course', 'sport', 'exercise', 'exertion', 'walking'])
  triggers.rest = containsAny(text, ['repos', 'allonge', 'assis', 'immobile', 'nuit', 'sommeil', 'rest', 'lying', 'sitting', 'night'])
  triggers.food = containsAny(text, ['manger', 'repas', 'nourriture', 'apres avoir mange', 'estomac', 'eating', 'food', 'meal'])
  triggers.stress = containsAny(text, ['stress', 'anxiete', 'tension', 'anxiety', 'worry'])
  triggers.position = containsAny(text, ['position', 'penche', 'debout', 'couche', 'lying', 'standing', 'bending'])
  triggers.weather = containsAny(text, ['froid', 'chaud', 'temps', 'weather', 'cold', 'hot'])
  triggers.medication = containsAny(text, ['medicament', 'pilule', 'comprime', 'medication', 'pill', 'drug'])
  triggers.sleep = containsAny(text, ['sommeil', 'nuit', 'dormir', 'sleep', 'night', 'sleeping'])
  
  return triggers
}

function analyzeRelievingFactors(text: string) {
  return {
    rest: containsAny(text, ['repos', 'allonge', 'assis', 'rest', 'lying', 'sitting']),
    medication: containsAny(text, ['medicament', 'comprime', 'antalgique', 'aspirine', 'medication', 'pill', 'painkiller']),
    position: containsAny(text, ['position', 'penche', 'debout', 'couche', 'posture']),
    heat: containsAny(text, ['chaud', 'chaleur', 'bouillotte', 'heat', 'warm']),
    cold: containsAny(text, ['froid', 'glace', 'fraicheur', 'cold', 'ice']),
    nothing: containsAny(text, ['rien', 'aucun', 'pas de soulagement', 'nothing', 'no relief'])
  }
}

function analyzeCharacteristics(text: string) {
  const quality = []
  const radiation = []
  const associated = []
  
  // Quality of pain
  if (containsAny(text, ['aigu', 'aigue', 'pointu', 'percant', 'sharp', 'piercing'])) {
    quality.push('sharp')
  }
  if (containsAny(text, ['sourd', 'profond', 'dull', 'deep'])) {
    quality.push('dull')
  }
  if (containsAny(text, ['brulure', 'brulant', 'burning'])) {
    quality.push('burning')
  }
  if (containsAny(text, ['crampe', 'spasme', 'cramping'])) {
    quality.push('cramping')
  }
  if (containsAny(text, ['serrement', 'etau', 'oppression', 'crushing', 'squeezing', 'pressure'])) {
    quality.push('crushing')
  }
  if (containsAny(text, ['lancinant', 'pulsatile', 'throbbing', 'pounding'])) {
    quality.push('throbbing')
  }
  
  // Radiation
  if (containsAny(text, ['bras', 'membre superieur', 'arm'])) {
    radiation.push('arm')
  }
  if (containsAny(text, ['dos', 'dorsale', 'back'])) {
    radiation.push('back')
  }
  if (containsAny(text, ['machoire', 'jaw'])) {
    radiation.push('jaw')
  }
  if (containsAny(text, ['abdomen', 'ventre', 'stomach'])) {
    radiation.push('abdomen')
  }
  if (containsAny(text, ['cou', 'cervical', 'neck'])) {
    radiation.push('neck')
  }
  
  // Associated symptoms
  if (containsAny(text, ['nausee', 'envie de vomir', 'nausea'])) {
    associated.push('nausea')
  }
  if (containsAny(text, ['sueur', 'transpiration', 'sweating', 'diaphoresis'])) {
    associated.push('sweating')
  }
  if (containsAny(text, ['essoufflement', 'dyspnee']) || containsAll(text, ['difficulte', 'respirer']) || containsAll(text, ['shortness', 'breath']) || containsAny(text, ['difficulty breathing'])) {
    associated.push('dyspnea')
  }
  if (containsAny(text, ['etourdissement', 'vertige', 'dizziness', 'vertigo'])) {
    associated.push('dizziness')
  }
  if (containsAny(text, ['palpitation', 'palpitations']) || containsAll(text, ['coeur', 'bat']) || containsAll(text, ['heart', 'racing'])) {
    associated.push('palpitations')
  }
  
  return { quality, radiation, associated }
}

function detectRedFlagsFromHistory(text: string, patient: ProcessedPatientData) {
  const redFlags: DiseaseHistoryAnalysis['redFlags'] = []
  
  // Cardiac red flags
  if ((containsAny(text, ['douleur']) && containsAny(text, ['irradiant', 'irradie']) && containsAny(text, ['bras', 'machoire', 'dos', 'jaw', 'arm', 'back']))) {
    redFlags.push({
      flag: 'RADIATION_PATTERN',
      severity: 'critical',
      category: 'cardiac',
      confidence: 0.9,
      description: 'Chest pain with radiation - suggests ACS'
    })
  }
  
  if ((containsAny(text, ['reveille', 'reveille', 'woke', 'awakened']) && containsAny(text, ['douleur', 'mal', 'pain']))) {
    redFlags.push({
      flag: 'NOCTURNAL_CHEST_PAIN',
      severity: 'high',
      category: 'cardiac',
      confidence: 0.8,
      description: 'Nocturnal chest pain - unstable angina risk'
    })
  }
  
  if (containsAny(text, ['douleur']) && containsAny(text, ['dechirante', 'arrachante', 'comme un couteau', 'tearing', 'ripping'])) {
    redFlags.push({
      flag: 'TEARING_CHEST_PAIN',
      severity: 'critical',
      category: 'cardiac',
      confidence: 0.85,
      description: 'Tearing chest pain - aortic dissection risk'
    })
  }
  
  // Neurological red flags
  if (containsAny(text, ['mal de tete', 'cephalee', 'headache']) && containsAny(text, ['pire', 'jamais', 'violent', 'insupportable', 'worst', 'severe', 'never'])) {
    redFlags.push({
      flag: 'THUNDERCLAP_HEADACHE',
      severity: 'critical',
      category: 'neurological',
      confidence: 0.9,
      description: 'Worst headache ever - SAH risk'
    })
  }
  
  // Obstetric red flags (if pregnant)
  if (patient.isPregnant) {
    if (containsAny(text, ['saignement', 'perte de sang', 'bleeding']) && containsAny(text, ['grossesse', 'enceinte', 'pregnant'])) {
      redFlags.push({
        flag: 'PREGNANCY_BLEEDING',
        severity: 'critical',
        category: 'obstetric',
        confidence: 0.95,
        description: 'Bleeding in pregnancy - multiple serious causes'
      })
    }
  }
  
  // General red flags
  if (containsAny(text, ['jamais', 'premiere fois', 'nouveau', 'never', 'first time', 'new'])) {
    redFlags.push({
      flag: 'NEW_SYMPTOM',
      severity: 'medium',
      category: 'general',
      confidence: 0.7,
      description: 'New symptom - requires careful evaluation'
    })
  }
  
  if (containsAny(text, ['perte de conscience', 'evanouissement', 'syncope', 'unconscious', 'fainted', 'passed out'])) {
    redFlags.push({
      flag: 'LOSS_OF_CONSCIOUSNESS',
      severity: 'high',
      category: 'general',
      confidence: 0.9,
      description: 'Loss of consciousness - multiple serious causes'
    })
  }
  
  // Boost severity for pregnancy
  if (patient.isPregnant) {
    redFlags.forEach(flag => {
      if (flag.category !== 'obstetric' && flag.severity === 'medium') {
        flag.severity = 'high'
      } else if (flag.category !== 'obstetric' && flag.severity === 'high') {
        flag.severity = 'critical'
      }
    })
  }
  
  return redFlags
}

function calculateHistoryCriticalityModifiers(analysis: DiseaseHistoryAnalysis) {
  const modifiers: { reason: string; points: number }[] = []
  
  if (analysis.timeline.onset === 'sudden') {
    modifiers.push({ reason: 'Sudden onset (from history)', points: 2 })
  }
  
  if (analysis.timeline.progression === 'worsening') {
    modifiers.push({ reason: 'Worsening course (from history)', points: 1 })
  }
  
  if (analysis.timeline.firstEpisode) {
    modifiers.push({ reason: 'First episode (from history)', points: 1 })
  }
  
  analysis.redFlags.forEach(flag => {
    const points = flag.severity === 'critical' ? 3 : flag.severity === 'high' ? 2 : 1
    modifiers.push({ reason: `Red flag: ${flag.flag} (from history)`, points })
  })
  
  if (analysis.triggers.effort) {
    modifiers.push({ reason: 'Effort-triggered symptoms (from history)', points: 1 })
  }
  
  if (analysis.characteristics.radiation.includes('arm') || analysis.characteristics.radiation.includes('jaw')) {
    modifiers.push({ reason: 'Classic cardiac radiation (from history)', points: 2 })
  }
  
  if (analysis.characteristics.associated.includes('dyspnea') && analysis.characteristics.associated.includes('sweating')) {
    modifiers.push({ reason: 'High-risk associated symptoms (from history)', points: 2 })
  }
  
  return modifiers
}

function detectInconsistencies(diseaseHistory: string, clinical: Partial<ProcessedClinicalData>) {
  const inconsistencies: DiseaseHistoryAnalysis['inconsistencies'] = []
  
  const historyDuration = extractDurationFromHistory(diseaseHistory)
  if (historyDuration && clinical.duration?.value) {
    if (isInconsistentDuration(historyDuration, clinical.duration.value)) {
      inconsistencies.push({
        type: 'DURATION_MISMATCH',
        description: `History mentions "${historyDuration}" but duration selected is "${clinical.duration.value}"`,
        fields: ['diseaseHistory', 'symptomDuration']
      })
    }
  }
  
  const historyPainLevel = extractPainFromHistory(diseaseHistory)
  if (historyPainLevel !== null && clinical.painLevel !== undefined) {
    if (Math.abs(historyPainLevel - clinical.painLevel) > 3) {
      inconsistencies.push({
        type: 'PAIN_LEVEL_MISMATCH',
        description: `History suggests pain level ${historyPainLevel}/10 but reported ${clinical.painLevel}/10`,
        fields: ['diseaseHistory', 'painScale']
      })
    }
  }
  
  return inconsistencies
}

function identifyClinicalPatterns(text: string, patient: ProcessedPatientData) {
  const patterns: DiseaseHistoryAnalysis['clinicalPatterns'] = []
  
  // Stable angina pattern
  if (containsAny(text, ['douleur']) && containsAny(text, ['effort']) && containsAny(text, ['repos']) && containsAny(text, ['soulage'])) {
    let confidence = 0.6
    if (containsAny(text, ['oppression', 'serrement', 'etau', 'pressure', 'squeezing'])) {
      confidence += 0.2
    }
    
    patterns.push({
      pattern: 'angina_stable',
      confidence: Math.min(confidence, 1.0),
      specialty: 'Cardiology',
      urgency: 'routine',
      description: 'Stable angina pattern'
    })
  }
  
  // Acute coronary syndrome
  if ((containsAny(text, ['douleur', 'poitrine', 'chest pain']) && containsAny(text, ['brutal', 'soudain', 'intense', 'sudden', 'severe'])) && !containsAny(text, ['effort'])) {
    let confidence = 0.5
    if (containsAny(text, ['irradiation', 'bras', 'machoire', 'sueur', 'nausee', 'radiation', 'arm', 'jaw', 'sweat', 'nausea'])) {
      confidence += 0.3
    }
    if (patient.riskProfile.cardiovascular === 'high') {
      confidence += 0.2
    }
    if (patient.age > 50) {
      confidence += 0.15
    }
    
    patterns.push({
      pattern: 'acute_coronary',
      confidence: Math.min(confidence, 1.0),
      specialty: 'Emergency Cardiology',
      urgency: 'immediate',
      description: 'Acute coronary syndrome pattern'
    })
  }
  
  // Migraine pattern
  if (containsAny(text, ['mal de tete', 'cephalee', 'headache']) && containsAny(text, ['pulsatile', 'lancinant', 'throbbing']) && containsAny(text, ['lumiere', 'bruit', 'light', 'sound'])) {
    let confidence = 0.6
    if (containsAny(text, ['nausee', 'vomissement', 'aura', 'nausea', 'vomiting'])) {
      confidence += 0.2
    }
    
    patterns.push({
      pattern: 'migraine',
      confidence: Math.min(confidence, 1.0),
      specialty: 'Neurology',
      urgency: 'routine',
      description: 'Migraine pattern'
    })
  }
  
  // Preeclampsia pattern (if pregnant)
  if (patient.isPregnant && (containsAny(text, ['mal de tete', 'cephalee', 'headache', 'vision']) && containsAny(text, ['grossesse', 'enceinte', 'pregnant']))) {
    let confidence = 0.7
    if (containsAny(text, ['oedeme', 'gonflement', 'pression', 'swelling', 'edema', 'pressure'])) {
      confidence += 0.3
    }
    
    patterns.push({
      pattern: 'preeclampsia',
      confidence: Math.min(confidence, 1.0),
      specialty: 'Obstetrics',
      urgency: 'urgent',
      description: 'Preeclampsia pattern'
    })
  }
  
  return patterns.sort((a, b) => b.confidence - a.confidence)
}

function extractDurationFromHistory(history: string): string | null {
  const text = normalizeText(history)
  
  if (text.includes('heure') || text.includes('hour')) {
    const match = text.match(/(\d+)\s*heure/i) || text.match(/(\d+)\s*hour/i)
    if (match) return `${match[1]} hours`
  }
  
  if (text.includes('jour') || text.includes('day')) {
    const match = text.match(/(\d+)\s*jour/i) || text.match(/(\d+)\s*day/i)
    if (match) return `${match[1]} days`
  }
  
  if (text.includes('semaine') || text.includes('week')) {
    const match = text.match(/(\d+)\s*semaine/i) || text.match(/(\d+)\s*week/i)
    if (match) return `${match[1]} weeks`
  }
  
  if (text.includes('mois') || text.includes('month')) {
    const match = text.match(/(\d+)\s*mois/i) || text.match(/(\d+)\s*month/i)
    if (match) return `${match[1]} months`
  }
  
  return null
}

function extractPainFromHistory(history: string): number | null {
  const match = history.match(/(\d{1,2})\s*\/\s*10/) || history.match(/douleur.*(\d{1,2})/) || history.match(/(\d{1,2}).*sur.*10/)
  
  if (match) {
    const painLevel = parseInt(match[1] || match[2] || match[3])
    return isNaN(painLevel) ? null : Math.min(Math.max(painLevel, 0), 10)
  }
  
  return null
}

function isInconsistentDuration(historyDuration: string, reportedDuration: string): boolean {
  const historyHours = parseDurationToHours(historyDuration)
  const reportedHours = parseDurationToHours(reportedDuration)
  
  if (historyHours && reportedHours) {
    return Math.abs(Math.log10(historyHours) - Math.log10(reportedHours)) > 1
  }
  
  return false
}

function parseDurationToHours(duration: string): number | null {
  if (duration.includes('hour')) return parseInt(duration)
  if (duration.includes('day')) return parseInt(duration) * 24
  if (duration.includes('week')) return parseInt(duration) * 24 * 7
  if (duration.includes('month')) return parseInt(duration) * 24 * 30
  
  const durationMap: Record<string, number> = {
    'less_hour': 0.5,
    '1_6_hours': 3,
    '6_24_hours': 15,
    '1_3_days': 48,
    '3_7_days': 120,
    '1_4_weeks': 336,
    '1_6_months': 2880,
    'more_6_months': 8760
  }
  
  return durationMap[duration] || null
}

// ==================== DATA PROCESSING FUNCTIONS ====================
function processPatientData(patient: PatientData): ProcessedPatientData {
  const age = typeof patient.age === 'string' ? parseInt(patient.age) || 0 : patient.age || 0
  const weight = typeof patient.weight === 'string' ? parseFloat(patient.weight) || 0 : patient.weight || 0
  const height = typeof patient.height === 'string' ? parseFloat(patient.height) || 0 : patient.height || 0
  
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
  
  const chronicConditions = Array.isArray(patient.medicalHistory) 
    ? patient.medicalHistory.filter(h => typeof h === 'string' && h.trim() !== '')
    : []
  const hasChronicConditions = chronicConditions.length > 0
  
  const allergiesList = Array.isArray(patient.allergies)
    ? patient.allergies.filter(a => typeof a === 'string' && a.trim() !== '')
    : []
  const hasAllergies = allergiesList.length > 0
  
  let medicationsText = patient.currentMedications || patient.currentMedicationsText || ''
  if (typeof medicationsText !== 'string') {
    medicationsText = ''
  }
  
  const medicationsList = medicationsText 
    ? medicationsText.split(/[,\n]/).map(m => m.trim()).filter(Boolean)
    : []
  const onMedications = medicationsList.length > 0
  
  const riskProfile = calculateRiskProfile(age, chronicConditions, patient.lifeHabits, bmi)
  const lifestyle = processLifestyle(patient.lifeHabits || {
    smoking: patient.smokingStatus,
    alcohol: patient.alcoholConsumption,
    physicalActivity: patient.physicalActivity
  })
  
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

function processClinicalData(clinical: ClinicalData, patient: ProcessedPatientData): ProcessedClinicalData {
  const mainComplaint = typeof clinical.chiefComplaint === 'string' 
    ? clinical.chiefComplaint.trim() 
    : ''
    
  const symptomsList = Array.isArray(clinical.symptoms) 
    ? clinical.symptoms.filter(s => typeof s === 'string' && s.trim() !== '')
    : []
    
  const complaintCategory = categorizeComplaint(mainComplaint, symptomsList)
  
  const durationValue = typeof clinical.symptomDuration === 'string' 
    ? clinical.symptomDuration 
    : 'unknown'
    
  const duration = {
    value: durationValue,
    urgency: DURATION_URGENCY_MAP[durationValue] || 'semi-urgent' as const
  }
  
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
  
  const vitals = processVitalSigns(clinical.vitalSigns)
  
  const historyAnalysis = analyzeDiseaseHistory(
    clinical.diseaseHistory || '',
    patient,
    { duration, painLevel, vitals }
  )
  
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
    historyAnalysis
  }
}

function processVitalSigns(vitals?: ClinicalData['vitalSigns']) {
  if (!vitals) return {}
  
  const result: ProcessedClinicalData['vitals'] = {}
  
  if (vitals.temperature !== null && vitals.temperature !== undefined) {
    const temp = typeof vitals.temperature === 'string' 
      ? parseFloat(vitals.temperature) 
      : vitals.temperature
    
    if (!isNaN(temp) && temp > 30 && temp < 45) {
      result.temperature = temp
      
      if (temp < 36.1) result.tempStatus = 'hypothermia'      
      else if (temp <= 37.2) result.tempStatus = 'normal'     
      else if (temp <= 38.5) result.tempStatus = 'fever'      
      else result.tempStatus = 'high-fever'                   
    }
  }
  
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
  
  let cvRisk = 0
  if (age > 65) cvRisk++
  if (age > 75) cvRisk++
  if (conditions.some(c => normalizeText(c).includes('hypertension'))) cvRisk += 2
  if (conditions.some(c => normalizeText(c).includes('heart'))) cvRisk += 3
  if (conditions.some(c => normalizeText(c).includes('diabetes'))) cvRisk++
  
  if (lifestyle?.smoking === 'actuel' || lifestyle?.smoking === 'current') cvRisk += 2
  if (bmi && bmi > 30) cvRisk++
  
  if (cvRisk >= 4) profile.cardiovascular = 'high'
  else if (cvRisk >= 2) profile.cardiovascular = 'medium'
  
  let dmRisk = 0
  if (conditions.some(c => normalizeText(c).includes('diabetes'))) dmRisk += 5
  if (age > 45) dmRisk++
  if (bmi && bmi > 25) dmRisk++
  if (bmi && bmi > 30) dmRisk++
  if (lifestyle?.physicalActivity === 'sedentaire' || lifestyle?.physicalActivity === 'sedentary') dmRisk++
  
  if (dmRisk >= 4) profile.diabetes = 'high'
  else if (dmRisk >= 2) profile.diabetes = 'medium'
  
  let respRisk = 0
  if (conditions.some(c => normalizeText(c).includes('asthma'))) respRisk += 3
  if (conditions.some(c => normalizeText(c).includes('copd'))) respRisk += 3
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
  
  if (patient.age > 75) score += 2
  else if (patient.age > 65) score += 1
  else if (patient.age < 2) score += 2
  
  if (patient.isPregnant) score += 1
  
  if (clinical.vitals.tempStatus === 'high-fever') score += 2
  else if (clinical.vitals.tempStatus === 'fever') score += 1
  else if (clinical.vitals.tempStatus === 'hypothermia') score += 3
  
  if (clinical.vitals.bpStatus === 'crisis') score += 4
  else if (clinical.vitals.bpStatus === 'hypertension') score += 2
  else if (clinical.vitals.bpStatus === 'hypotension') score += 3
  
  if (clinical.painLevel >= 9) score += 3
  else if (clinical.painLevel >= 7) score += 2
  else if (clinical.painLevel >= 5) score += 1
  
  if (clinical.duration.urgency === 'immediate') score += 3
  else if (clinical.duration.urgency === 'urgent') score += 2
  else if (clinical.duration.urgency === 'semi-urgent') score += 1
  
  const criticalSymptoms = [
    'chest pain', 'difficulty breathing', 'confusion', 'syncope',
    'severe bleeding', 'unconscious', 'seizure'
  ]
  
  clinical.symptomsList.forEach(symptom => {
    if (typeof symptom === 'string') {
      if (criticalSymptoms.some(cs => normalizeText(symptom).includes(normalizeText(cs)))) {
        score += 2
      }
    }
  })
  
  if (patient.riskProfile.cardiovascular === 'high') score += 2
  else if (patient.riskProfile.cardiovascular === 'medium') score += 1
  
  if (patient.hasChronicConditions) score += 1
  
  const historyBonus = clinical.historyAnalysis.criticalityModifiers
    .reduce((sum, modifier) => sum + modifier.points, 0)
  
  score += historyBonus
  
  console.log('Criticality Score Calculation:', {
    baseScore: score - historyBonus,
    historyBonus,
    finalScore: Math.min(score, 10),
    redFlagsFromHistory: clinical.historyAnalysis.redFlags.length
  })
  
  return Math.min(score, 10)
}

function detectRedFlags(
  patient: ProcessedPatientData, 
  clinical: ProcessedClinicalData
): string[] {
  const flags: string[] = []
  
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
    obstetric: [
      { symptom: 'severe abdominal pain in pregnancy', severity: 'critical' },
      { symptom: 'vaginal bleeding in pregnancy', severity: 'critical' },
      { symptom: 'severe headache with visual changes in pregnancy', severity: 'critical' },
      { symptom: 'persistent vomiting in pregnancy', severity: 'high' }
    ]
  }
  
  Object.entries(RED_FLAGS).forEach(([category, categoryFlags]) => {
    categoryFlags.forEach(flag => {
      const hasSymptom = clinical.symptomsList.some(s => 
        typeof s === 'string' && normalizeText(s).includes(normalizeText(flag.symptom))
      ) || (typeof clinical.mainComplaint === 'string' && 
           normalizeText(clinical.mainComplaint).includes(normalizeText(flag.symptom)))
      
      if (hasSymptom) {
        flags.push(`${flag.severity.toUpperCase()}: ${flag.symptom}`)
      }
    })
  })
  
  if (patient.isPregnant) {
    if (clinical.symptomsList.some(s => 
      typeof s === 'string' && normalizeText(s).includes('bleeding'))) {
      flags.push('CRITICAL: Bleeding in pregnancy')
    }
    
    if (clinical.painLevel >= 7 && clinical.complaintCategory === 'gastrointestinal') {
      flags.push('HIGH: Severe abdominal pain in pregnancy')
    }
    
    if (clinical.vitals.bpStatus === 'hypertension' || clinical.vitals.bpStatus === 'crisis') {
      flags.push('HIGH: Hypertension in pregnancy (preeclampsia risk)')
    }
  }
  
  if (clinical.vitals.tempStatus === 'high-fever') {
    flags.push('HIGH: High fever (>38.5°C)')
  }
  
  if (clinical.vitals.bpStatus === 'crisis') {
    flags.push('CRITICAL: Hypertensive crisis')
  } else if (clinical.vitals.bpStatus === 'hypotension') {
    flags.push('HIGH: Hypotension')
  }
  
  if (clinical.painLevel >= 9) {
    flags.push('HIGH: Extreme pain (9-10/10)')
  }
  
  if (clinical.duration.urgency === 'immediate' && clinical.painLevel >= 7) {
    flags.push('CRITICAL: Acute severe pain')
  }
  
  const historyFlags = clinical.historyAnalysis.redFlags.map(flag => 
    `${flag.severity.toUpperCase()}: ${flag.flag.replace('_', ' ')} (from history)`
  )
  
  return [...flags, ...historyFlags]
}

function normalizeGender(gender: string): 'Male' | 'Female' | 'Other' {
  if (!gender || typeof gender !== 'string') return 'Other'
  
  const g = normalizeText(gender)
  if (['m', 'male', 'homme', 'man'].includes(g)) return 'Male'
  if (['f', 'female', 'femme', 'woman'].includes(g)) return 'Female'
  
  return 'Other'
}

function processLifestyle(habits?: PatientData['lifeHabits']): ProcessedPatientData['lifestyle'] {
  const mapSmoking = (value?: string): 'non' | 'current' | 'former' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = normalizeText(value)
    
    if (['non', 'non-smoker', 'never'].includes(v)) return 'non'
    if (['actuel', 'current', 'current-smoker', 'smoker'].includes(v)) return 'current'
    if (['ancien', 'ex-smoker', 'former', 'former-smoker'].includes(v)) return 'former'
    
    return 'unknown'
  }
  
  const mapAlcohol = (value?: string): 'none' | 'occasional' | 'regular' | 'heavy' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = normalizeText(value)
    
    if (['jamais', 'never', 'none'].includes(v)) return 'none'
    if (['occasionnel', 'occasional', 'sometimes'].includes(v)) return 'occasional'
    if (['regulier', 'regular', 'daily'].includes(v)) return 'regular'
    if (['heavy', 'excessive'].includes(v)) return 'heavy'
    
    return 'unknown'
  }
  
  const mapExercise = (value?: string): 'sedentary' | 'moderate' | 'active' | 'unknown' => {
    if (!value || typeof value !== 'string') return 'unknown'
    const v = normalizeText(value)
    
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
  const cleanComplaint = typeof complaint === 'string' ? complaint : ''
  const cleanSymptoms = Array.isArray(symptoms) 
    ? symptoms.filter(s => typeof s === 'string' && s.trim() !== '')
    : []
  
  const allText = normalizeText(`${cleanComplaint} ${cleanSymptoms.join(' ')}`)
  
  for (const [category, keywords] of Object.entries(SYMPTOM_CATEGORIES)) {
    if (keywords.some(keyword => allText.includes(normalizeText(keyword)))) {
      return category
    }
  }
  
  return 'general'
}

function suggestSpecialty(
  category: string, 
  redFlags: string[], 
  historyPatterns: DiseaseHistoryAnalysis['clinicalPatterns'],
  isPregnant: boolean = false
): string | undefined {
  if (redFlags.some(f => f.includes('CRITICAL'))) {
    return 'Emergency Medicine'
  }
  
  if (historyPatterns.length > 0) {
    const highConfidencePattern = historyPatterns.find(p => p.confidence > 0.7)
    if (highConfidencePattern) {
      return highConfidencePattern.specialty
    }
  }
  
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
function generateModeSpecificPrompt(mode: string, context: MedicalContext): string {
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

function generateFastModePrompt(patient: ProcessedPatientData, clinical: ProcessedClinicalData, context: MedicalContext): string {
  const pregnancyAlert = patient.isPregnant ? '\nPatient is PREGNANT - Consider obstetric emergencies' : ''
  const historyAlert = clinical.historyAnalysis.redFlags.length > 0 
    ? `\nHISTORY RED FLAGS: ${clinical.historyAnalysis.redFlags.map(f => f.flag).join(', ')}`
    : ''
  
  return `EMERGENCY TRIAGE ASSESSMENT - RAPID MODE

PATIENT: ${patient.age}y ${patient.gender}${patient.isPregnant ? ' (PREGNANT)' : ''}
CHIEF COMPLAINT: ${clinical.mainComplaint}
DURATION: ${clinical.duration.value}
PAIN: ${clinical.painLevel}/10
RED FLAGS: ${context.redFlags.length > 0 ? context.redFlags.join(', ') : 'None identified'}${pregnancyAlert}${historyAlert}

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

function generateBalancedModePrompt(patient: ProcessedPatientData, clinical: ProcessedClinicalData, context: MedicalContext): string {
  const medicalHistoryStr = patient.hasChronicConditions 
    ? `\nCHRONIC CONDITIONS: ${patient.chronicConditions.join(', ')}`
    : ''
  
  const medicationsStr = patient.onMedications
    ? `\nCURRENT MEDICATIONS: ${patient.medicationsList.join(', ')}`
    : ''
  
  const pregnancyStr = patient.isPregnant && patient.gender === 'Female'
    ? `\nPREGNANCY STATUS: ${patient.pregnancyStatus}${
        patient.lastMenstrualPeriod ? `, LMP: ${patient.lastMenstrualPeriod}` : ''
      }${
        patient.gestationalAge ? `, Gestational age: ${patient.gestationalAge}` : ''
      }`
    : ''
  
  const vitalsStr = clinical.vitals.temperature || clinical.vitals.bloodPressure
    ? `\nVITALS: Temp: ${clinical.vitals.temperature}°C (${clinical.vitals.tempStatus}), BP: ${clinical.vitals.bloodPressure} (${clinical.vitals.bpStatus})`
    : ''
    
  const historySection = `
HISTORY ANALYSIS:
${clinical.historyAnalysis.redFlags.length > 0 
  ? `RED FLAGS FROM HISTORY: ${clinical.historyAnalysis.redFlags.map(f => `${f.flag} (${f.severity})`).join(', ')}`
  : 'No critical patterns detected in history'}
${clinical.historyAnalysis.clinicalPatterns.length > 0
  ? `CLINICAL PATTERNS: ${clinical.historyAnalysis.clinicalPatterns.map(p => `${p.pattern} (${Math.round(p.confidence*100)}%)`).join(', ')}`
  : ''}
${clinical.historyAnalysis.inconsistencies.length > 0
  ? `INCONSISTENCIES: ${clinical.historyAnalysis.inconsistencies.map(i => i.description).join('; ')}`
  : ''}
Timeline: ${clinical.historyAnalysis.timeline.onset} onset, ${clinical.historyAnalysis.timeline.progression} progression
Triggers: ${Object.entries(clinical.historyAnalysis.triggers).filter(([_, v]) => v).map(([k, _]) => k).join(', ') || 'None'}
Relief: ${Object.entries(clinical.historyAnalysis.relievingFactors).filter(([_, v]) => v).map(([k, _]) => k).join(', ') || 'None'}`
    
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

${historySection}

ASSESSMENT:
- Criticality Score: ${context.criticalityScore}/10
- Red Flags: ${context.redFlags.join(', ') || 'None'}
- Risk Factors: ${context.riskFactors.map(r => `${r.factor}(${r.severity})`).join(', ')}

${patient.isPregnant ? `
PREGNANCY CONSIDERATIONS:
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

function generateIntelligentModePrompt(patient: ProcessedPatientData, clinical: ProcessedClinicalData, context: MedicalContext): string {
  return `COMPREHENSIVE SPECIALIST CONSULTATION - EXPERT MODE

COMPLETE PATIENT ASSESSMENT:
- Age: ${patient.age} years
- Gender: ${patient.gender}
- BMI: ${patient.bmi?.toFixed(2)} kg/m² (${patient.bmiCategory})

MEDICAL HISTORY:
${patient.chronicConditions.length > 0 ? patient.chronicConditions.map(c => `• ${c}`).join('\n') : 'No significant past medical history'}

MEDICATIONS:
${patient.medicationsList.length > 0 ? patient.medicationsList.map(m => `• ${m}`).join('\n') : 'No current medications'}

ALLERGIES: ${patient.hasAllergies ? patient.allergiesList.join(', ') : 'None known'}

SOCIAL HISTORY:
- Tobacco: ${patient.lifestyle.smoking} ${patient.lifestyle.smoking === 'current' ? '(ACTIVE SMOKER)' : ''}
- Alcohol: ${patient.lifestyle.alcohol}
- Physical Activity: ${patient.lifestyle.exercise}

${patient.isPregnant ? `
PREGNANCY STATUS - CRITICAL MEDICAL CONSIDERATIONS:
- Status: ${patient.pregnancyStatus}
- Last Menstrual Period: ${patient.lastMenstrualPeriod || 'Not provided'}
- Gestational Age: ${patient.gestationalAge || 'To be calculated'}
- Pregnancy Category for Medications: MUST be considered for ALL drugs
- Teratogenic Risk Assessment: Required for any diagnostic procedures
- Pregnancy-Specific Conditions to Rule Out:
  • Preeclampsia/HELLP syndrome
  • Gestational diabetes
  • Placental abruption
  • Ectopic pregnancy (if early)
  • Hyperemesis gravidarum
  • Deep vein thrombosis (increased risk)
  • Pulmonary embolism (increased risk)
` : ''}

COMPREHENSIVE HISTORY ANALYSIS:
Timeline Analysis:
- Onset: ${clinical.historyAnalysis.timeline.onset}
- Progression: ${clinical.historyAnalysis.timeline.progression}
- Recurrence: ${clinical.historyAnalysis.timeline.recurrence ? 'Yes' : 'No'}
- First Episode: ${clinical.historyAnalysis.timeline.firstEpisode ? 'Yes' : 'No'}

CRITICAL FINDINGS FROM HISTORY:
${clinical.historyAnalysis.redFlags.map(flag => 
  `${flag.severity.toUpperCase()}: ${flag.flag} (${Math.round(flag.confidence*100)}% confidence) - ${flag.description}`
).join('\n') || 'No critical findings detected'}

IDENTIFIED CLINICAL PATTERNS:
${clinical.historyAnalysis.clinicalPatterns.map(pattern =>
  `${pattern.pattern.toUpperCase()} → ${pattern.specialty} (${Math.round(pattern.confidence*100)}% confidence, ${pattern.urgency} priority)`
).join('\n') || 'No specific patterns identified'}

CRITICALITY IMPACT FROM HISTORY:
Total Bonus Points: ${clinical.historyAnalysis.criticalityModifiers.reduce((sum, m) => sum + m.points, 0)}
${clinical.historyAnalysis.criticalityModifiers.map(mod => 
  `• ${mod.reason}: +${mod.points} points`
).join('\n')}

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
- INTEGRATE findings from history analysis where relevant

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
      "rationale": "Detailed clinical reasoning including history analysis insights",
      "redFlagDetection": true/false,
      "clinicalRelevance": "How this changes management based on full patient context"
    }
  ]
}

Generate exactly 8 expert-level questions. Response must be valid JSON only.`
}

// ==================== RECOMMENDATION & UTILITY FUNCTIONS ====================
function generateRecommendations(context: MedicalContext, mode: string): APIResponse['recommendations'] {
  const recommendations: APIResponse['recommendations'] = {}
  const { patient, clinical } = context
  
  if (context.criticalityScore >= 7) {
    recommendations.immediateAction = [
      'Call emergency services if symptoms worsen',
      'Do not drive yourself to the hospital',
      'Have someone stay with you',
      'Prepare list of current medications'
    ]
    
    if (patient.isPregnant) {
      recommendations.immediateAction.push('Inform emergency services that you are pregnant')
    }
    
    if (clinical.historyAnalysis.redFlags.some(f => f.severity === 'critical')) {
      recommendations.immediateAction.push('Mention to medical staff: ' + 
        clinical.historyAnalysis.redFlags
          .filter(f => f.severity === 'critical')
          .map(f => f.description)
          .join(', '))
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
  
  if (context.criticalityScore >= 4) {
    recommendations.followUp = patient.isPregnant 
      ? 'Schedule urgent appointment with obstetrician and primary care'
      : 'Schedule urgent appointment with primary care or specialist'
  } else {
    recommendations.followUp = patient.isPregnant
      ? 'Schedule routine follow-up with obstetrician if symptoms persist'
      : 'Schedule routine follow-up if symptoms persist or worsen'
  }
  
  const tests: string[] = []
  if (clinical.complaintCategory === 'cardiovascular') {
    tests.push('ECG', 'Troponin', 'Chest X-ray')
    if (!patient.isPregnant) {
      tests.push('D-dimer if PE suspected')
    } else {
      tests.push('Consider ultrasound instead of X-ray if possible')
    }
  }
  
  if (patient.isPregnant) {
    tests.push('Urine dipstick for protein/glucose', 'Blood pressure monitoring')
  }
  
  if (clinical.historyAnalysis.clinicalPatterns.length > 0) {
    const highConfidencePattern = clinical.historyAnalysis.clinicalPatterns[0]
    if (highConfidencePattern.confidence > 0.7) {
      if (highConfidencePattern.pattern.includes('coronary')) {
        tests.push('Serial troponins', 'Stress testing if stable')
      } else if (highConfidencePattern.pattern.includes('preeclampsia')) {
        tests.push('24-hour urine protein', 'Liver enzymes', 'Platelet count')
      }
    }
  }
  
  if (tests.length > 0) {
    recommendations.additionalTests = tests
  }
  
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
  
  const patientFields = ['age', 'gender', 'bmi', 'chronicConditions', 'allergiesList', 'medicationsList']
  patientFields.forEach(field => {
    totalFields++
    if ((patient as any)[field]) fieldsProvided++
  })
  
  const clinicalFields = ['mainComplaint', 'symptomsList', 'duration', 'painLevel', 'vitals']
  clinicalFields.forEach(field => {
    totalFields++
    if ((clinical as any)[field]) fieldsProvided++
  })
  
  if (patient.isChildbearingAge && patient.gender === 'Female') {
    totalFields++
    if (patient.pregnancyStatus) fieldsProvided++
  }
  
  if (clinical.historyAnalysis.redFlags.length > 0 || 
      clinical.historyAnalysis.clinicalPatterns.length > 0) {
    fieldsProvided += 2
  }
  
  return Math.round((fieldsProvided / totalFields) * 100)
}

function calculateConfidenceLevel(
  dataCompleteness: number,
  mode: string,
  criticalityScore: number,
  historyAnalysis: DiseaseHistoryAnalysis,
  isPregnant: boolean = false
): number {
  let confidence = dataCompleteness
  
  if (mode === 'intelligent') confidence += 10
  else if (mode === 'balanced') confidence += 5
  
  if (criticalityScore >= 7 && dataCompleteness < 80) {
    confidence -= 20
  }
  
  if (isPregnant && dataCompleteness < 90) {
    confidence -= 10
  }
  
  if (historyAnalysis.redFlags.length > 0) confidence += 5
  if (historyAnalysis.clinicalPatterns.length > 0) confidence += 5
  if (historyAnalysis.inconsistencies.length === 0) confidence += 3
  
  return Math.max(20, Math.min(95, confidence))
}

function anonymizeData(patient: PatientData): {
  anonymized: PatientData,
  anonymousId: string,
  removedFields: string[]
} {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const anonymousId = `ANON-${timestamp}-${random}`
  
  const anonymized = { ...patient }
  const removedFields: string[] = []
  
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
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Invalid or missing OpenAI API key')
    }
    
    const body = await request.json()
    const { patientData, clinicalData, mode = 'balanced' } = body
    
    console.log('ENHANCED API Input Analysis:', {
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      hasHistory: !!(clinicalData?.diseaseHistory),
      historyLength: clinicalData?.diseaseHistory?.length || 0,
      mode
    })
    
    if (!patientData || !clinicalData) {
      return NextResponse.json(
        { error: 'Missing required data: patientData and clinicalData are required', success: false },
        { status: 400 }
      )
    }
    
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
    
    const { anonymized, anonymousId, removedFields } = anonymizeData(patientData)
    
    const processedPatient = processPatientData(anonymized)
    const processedClinical = processClinicalData(clinicalData, processedPatient)
    
    console.log('Enhanced Processing Results:', {
      patient: {
        age: processedPatient.age,
        gender: processedPatient.gender,
        isPregnant: processedPatient.isPregnant,
        riskProfile: processedPatient.riskProfile
      },
      clinical: {
        complaint: processedClinical.mainComplaint,
        category: processedClinical.complaintCategory,
        criticalityFromHistory: processedClinical.historyAnalysis.criticalityModifiers.reduce((s, m) => s + m.points, 0),
        redFlagsFromHistory: processedClinical.historyAnalysis.redFlags.length,
        patternsDetected: processedClinical.historyAnalysis.clinicalPatterns.length,
        inconsistencies: processedClinical.historyAnalysis.inconsistencies.length
      }
    })
    
    const riskFactors: RiskFactor[] = []
    
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
        factor: 'Pregnancy status',
        severity: 'medium',
        relatedTo: 'Physiological state'
      })
    }
    
    processedClinical.historyAnalysis.redFlags.forEach(flag => {
      if (flag.severity === 'critical') {
        riskFactors.push({
          factor: `History: ${flag.flag}`,
          severity: 'critical',
          relatedTo: 'Disease history analysis'
        })
      }
    })
    
    const criticalityScore = calculateCriticalityScore(processedPatient, processedClinical)
    const redFlags = detectRedFlags(processedPatient, processedClinical)
    const suggestedSpecialty = suggestSpecialty(
      processedClinical.complaintCategory, 
      redFlags,
      processedClinical.historyAnalysis.clinicalPatterns,
      processedPatient.isPregnant
    )
    
    let adjustedMode = mode
    if (criticalityScore >= 8 && mode !== 'intelligent') {
      adjustedMode = 'intelligent'
      console.log(`Auto-escalated to intelligent mode due to criticality: ${criticalityScore}`)
    } else if (criticalityScore <= 2 && mode === 'intelligent' && !processedPatient.isPregnant) {
      adjustedMode = 'balanced'
      console.log(`Optimized to balanced mode for routine case`)
    }
    
    if (processedClinical.historyAnalysis.redFlags.some(f => f.severity === 'critical') && adjustedMode === 'fast') {
      adjustedMode = 'balanced'
      console.log(`Upgraded to balanced mode due to critical history patterns`)
    }
    
    if (processedPatient.isPregnant && adjustedMode === 'fast') {
      adjustedMode = 'balanced'
      console.log(`Upgraded to balanced mode due to pregnancy`)
    }
    
    const context: MedicalContext = {
      patient: processedPatient,
      clinical: processedClinical,
      riskFactors,
      criticalityScore,
      redFlags,
      suggestedSpecialty
    }
    
    const prompt = generateModeSpecificPrompt(adjustedMode, context)
    
    const aiConfig = {
      fast: { model: 'gpt-3.5-turbo', temperature: 0.1, maxTokens: 600 },
      balanced: { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 1200 },
      intelligent: { model: 'gpt-4o', temperature: 0.3, maxTokens: 1800 }
    }[adjustedMode] || { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 1200 }
    
    console.log(`Calling ${aiConfig.model} with ${adjustedMode} mode (history-enhanced)`)
    
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
            content: `You are an expert physician conducting a thorough clinical assessment with advanced history analysis capabilities. Generate diagnostic questions based on evidence-based medicine. Always respond with valid JSON only. ${processedPatient.isPregnant ? 'IMPORTANT: This patient is pregnant - consider pregnancy-specific conditions and medication safety.' : ''} Pay special attention to history analysis findings when crafting questions.`
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
    
    const dataCompleteness = calculateDataCompleteness(processedPatient, processedClinical)
    const confidenceLevel = calculateConfidenceLevel(
      dataCompleteness, 
      adjustedMode, 
      criticalityScore,
      processedClinical.historyAnalysis,
      processedPatient.isPregnant
    )
    
    const recommendations = generateRecommendations(context, adjustedMode)
    
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
        triageCategory: getTriageCategory(criticalityScore, processedPatient.isPregnant),
        historyAnalysis: {
          patternsDetected: processedClinical.historyAnalysis.clinicalPatterns.length,
          redFlagsFromHistory: processedClinical.historyAnalysis.redFlags.length,
          criticalityBonus: processedClinical.historyAnalysis.criticalityModifiers.reduce((sum, m) => sum + m.points, 0),
          inconsistencies: processedClinical.historyAnalysis.inconsistencies.length
        }
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
    
    cache.set(cacheKey, response)
    
    console.log('ENHANCED API Response Generated:', {
      questionsCount: questions.length,
      criticalityScore,
      historyBonus: processedClinical.historyAnalysis.criticalityModifiers.reduce((sum, m) => sum + m.points, 0),
      redFlagsTotal: redFlags.length,
      redFlagsFromHistory: processedClinical.historyAnalysis.redFlags.length,
      patternsDetected: processedClinical.historyAnalysis.clinicalPatterns.length,
      mode: adjustedMode,
      isPregnant: processedPatient.isPregnant
    })
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('Enhanced API Error:', error)
    
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
        historyAnalysis: {
          patternsDetected: 0,
          redFlagsFromHistory: 0,
          criticalityBonus: 0,
          inconsistencies: 0
        }
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

export async function GET() {
  return NextResponse.json({
    status: 'API v3.1 Operational - Complete Refactor with Enhanced History Analysis (Fixed)',
    version: '3.1.0',
    features: [
      'REVOLUTIONARY: Intelligent disease history analysis',
      'Advanced pattern recognition (angina, ACS, preeclampsia, etc.)',
      'Automatic red flag detection from patient narratives',
      'Timeline and progression analysis',
      'Trigger and relief factor identification',
      'Data inconsistency detection and validation',
      'Enhanced criticality scoring with history integration',
      'Smart mode escalation based on history patterns',
      'Comprehensive clinical pattern matching',
      'Pregnancy-specific history considerations',
      'Medical terminology extraction and analysis',
      'Context-aware prompt generation',
      'Enhanced confidence scoring with history quality',
      'Integrated medical knowledge base',
      'Advanced caching with history consideration',
      'Complete GDPR/HIPAA compliance',
      'FIXED: Compilation errors resolved'
    ]
  })
}
