// app/api/openai-questions/route.ts - VERSION 3.1 ÉQUILIBRÉE - MAURICE MEDICAL API
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
    mosquitoExposure?: string // Mosquito exposure assessment
    waterContact?: string // Contact with stagnant water
    seasonalPatterns?: string // Seasonal activity patterns
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
  tropicalDiseaseRisk: TropicalDiseaseRisk
  mauritiusSeasonalContext: SeasonalContext
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
    tropical: 'low' | 'medium' | 'high'
  }
  
  lifestyle: {
    smoking: 'non' | 'current' | 'former' | 'unknown'
    alcohol: 'none' | 'occasional' | 'regular' | 'heavy' | 'unknown'
    exercise: 'sedentary' | 'moderate' | 'active' | 'unknown'
    mosquitoExposure: 'high' | 'medium' | 'low' | 'unknown'
    waterContact: 'frequent' | 'occasional' | 'rare' | 'unknown'
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

// TROPICAL DISEASE INTERFACES
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
  mauritiusSpecific?: boolean
}

interface DiagnosticQuestion {
  id: number
  question: string
  options: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  rationale?: string
  redFlagDetection?: boolean
  clinicalRelevance?: string
  tropicalDiseaseRelevance?: string
  mauritiusContext?: boolean
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
    tropicalDiseaseRisk: TropicalDiseaseRisk
    mauritiusContext: SeasonalContext
  }
  recommendations: {
    immediateAction?: string[]
    followUp?: string
    additionalTests?: string[]
    specialistReferral?: string
    tropicalDiseaseConsiderations?: string[]
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
    mauritiusAdaptation: boolean
  }
}

// ==================== SYSTÈME DE PRIORITÉS INTELLIGENTES ====================
interface QuestionPriority {
  category: string
  standardQuestions: number  // Questions médicales standard requises
  tropicalQuestions: number  // Questions tropicales complémentaires
  urgencyThreshold: number   // Seuil pour escalader vers tropical
}

const QUESTION_PRIORITY_MATRIX: Record<string, QuestionPriority> = {
  cardiovascular: {
    category: 'cardiovascular',
    standardQuestions: 4,     // Priorité aux questions cardio standard
    tropicalQuestions: 1,     // 1 seule question tropicale complémentaire
    urgencyThreshold: 6       // Seulement si score > 6
  },
  respiratory: {
    category: 'respiratory',
    standardQuestions: 3,
    tropicalQuestions: 2,     // Plus de tropical (pneumonie vs dengue pulmonaire)
    urgencyThreshold: 5
  },
  neurological: {
    category: 'neurological', 
    standardQuestions: 4,     // Stroke, migraine, etc. d'abord
    tropicalQuestions: 1,     // Paludisme cérébral si indiqué
    urgencyThreshold: 7
  },
  gastrointestinal: {
    category: 'gastrointestinal',
    standardQuestions: 3,
    tropicalQuestions: 2,     // GI + tropical overlap
    urgencyThreshold: 5
  },
  tropical_fever: {
    category: 'tropical_fever',
    standardQuestions: 2,     // Questions fever standard
    tropicalQuestions: 3,     // Focus tropical justifié
    urgencyThreshold: 3
  },
  constitutional: {
    category: 'constitutional',
    standardQuestions: 2,
    tropicalQuestions: 3,     // Fièvre = tropical important
    urgencyThreshold: 4
  },
  general: {
    category: 'general',
    standardQuestions: 4,
    tropicalQuestions: 1,
    urgencyThreshold: 8
  }
}

// ==================== QUESTIONS STANDARD MÉDICALES ====================
const STANDARD_MEDICAL_QUESTIONS = {
  cardiovascular: [
    {
      template: "Décrivez votre douleur thoracique - où elle irradie et son type",
      options: [
        "Douleur écrasante irradiant vers le bras gauche/mâchoire/dos",
        "Douleur aiguë localisée, aggravée par la respiration profonde", 
        "Douleur sourde, diffuse, sans irradiation claire",
        "Autre type de douleur ou irradiation différente"
      ],
      priority: "critical",
      clinicalRelevance: "Différentie syndrome coronaire aigu vs péricardite vs douleur pleurétique"
    },
    {
      template: "La douleur thoracique est-elle liée à l'effort physique ?",
      options: [
        "Oui, apparaît systématiquement à l'effort et cesse au repos (quelques minutes)",
        "Parfois liée à l'effort, mais pattern variable ou imprévisible",
        "Non, aucun lien avec l'effort physique - survient au repos", 
        "Incertain du lien avec l'effort ou douleur constante"
      ],
      priority: "critical",
      clinicalRelevance: "Angor d'effort stable vs angor instable vs origine non cardiaque"
    },
    {
      template: "Quels symptômes accompagnent votre douleur thoracique ?",
      options: [
        "Sueurs froides, nausées, essoufflement, sensation de mort imminente",
        "Essoufflement seul ou palpitations sans autres symptômes",
        "Aucun symptôme associé significatif",
        "Vertiges, fatigue extrême ou autres symptômes"
      ],
      priority: "high",
      clinicalRelevance: "Syndrome coronaire aigu vs autres causes cardiovasculaires"
    },
    {
      template: "Avez-vous des antécédents cardiovasculaires ou facteurs de risque ?",
      options: [
        "Antécédents personnels de maladie cardiaque ou AVC",
        "Facteurs de risque multiples: diabète, hypertension, tabac, cholestérol",
        "Un seul facteur de risque ou antécédents familiaux uniquement",
        "Aucun antécédent cardiovasculaire connu"
      ],
      priority: "medium",
      clinicalRelevance: "Stratification du risque cardiovasculaire global"
    }
  ],

  respiratory: [
    {
      template: "Décrivez votre essoufflement ou difficulté respiratoire",
      options: [
        "Essoufflement brutal de repos avec douleur thoracique aiguë",
        "Essoufflement progressif d'effort avec toux productive/flegmes",
        "Essoufflement avec sifflements/respiration bruyante",
        "Autre pattern respiratoire ou essoufflement variable"
      ],
      priority: "critical", 
      clinicalRelevance: "Embolie pulmonaire vs pneumonie vs asthme vs œdème aigu pulmonaire"
    },
    {
      template: "Comment ont évolué vos symptômes respiratoires ?",
      options: [
        "Début très brutal (quelques minutes à heures)",
        "Installation progressive sur plusieurs jours",
        "Symptômes chroniques avec aggravation récente soudaine",
        "Pattern intermittent ou crises répétées"
      ],
      priority: "high",
      clinicalRelevance: "Urgence respiratoire vs pathologie chronique décompensée"
    },
    {
      template: "Avez-vous de la toux et des expectorations ?",
      options: [
        "Toux avec expectorations purulentes/jaunâtres/verdâtres",
        "Toux avec expectorations teintées de sang",
        "Toux sèche irritative sans expectorations",
        "Peu ou pas de toux"
      ],
      priority: "medium",
      clinicalRelevance: "Infection respiratoire vs autres causes de dyspnée"
    }
  ],

  neurological: [
    {
      template: "Décrivez votre mal de tête et son début",
      options: [
        "Mal de tête brutal 'en coup de tonnerre', le pire de ma vie",
        "Mal de tête progressif avec raideur de nuque et gêne à la lumière", 
        "Mal de tête pulsatile d'un côté avec nausées/vomissements",
        "Mal de tête diffuse, type tension, sans caractère particulier"
      ],
      priority: "critical",
      clinicalRelevance: "Hémorragie sous-arachnoïdienne vs méningite vs migraine vs céphalée tension"
    },
    {
      template: "Avez-vous des signes neurologiques inhabituels ?",
      options: [
        "Faiblesse/engourdissement soudain d'un côté du corps",
        "Troubles de la vision, parole difficile ou compréhension altérée",
        "Vertiges importants avec déséquilibre ou chutes",
        "Aucun signe neurologique particulier"
      ],
      priority: "critical", 
      clinicalRelevance: "AVC/AIT vs vertige périphérique vs autres pathologies neurologiques"
    },
    {
      template: "Y a-t-il eu perte de connaissance ou confusion ?",
      options: [
        "Perte de connaissance brève avec confusion au réveil",
        "Confusion ou désorientation sans perte de connaissance",
        "Sensation de malaise/vertige sans perte de connaissance",
        "Aucune altération de la conscience"
      ],
      priority: "high",
      clinicalRelevance: "Syncope vs épilepsie vs hypoglycémie vs causes métaboliques"
    },
    {
      template: "Ces symptômes interfèrent-ils avec vos activités quotidiennes ?",
      options: [
        "Impossible de réaliser mes activités normales",
        "Gêne importante mais je peux encore fonctionner partiellement",
        "Gêne modérée mais je reste fonctionnel",
        "Impact minimal sur mes activités quotidiennes"
      ],
      priority: "medium",
      clinicalRelevance: "Évaluation fonctionnelle et sévérité des symptômes neurologiques"
    }
  ],

  gastrointestinal: [
    {
      template: "Localisez et décrivez votre douleur abdominale",
      options: [
        "Douleur abdominale généralisée très intense avec ventre dur",
        "Douleur localisée fosse iliaque droite (en bas à droite)",
        "Douleur épigastrique (haut ventre) irradiant dans le dos",
        "Douleur diffuse crampes/coliques ou autre localisation"
      ],
      priority: "critical",
      clinicalRelevance: "Urgence chirurgicale vs appendicite vs pancréatite vs autres causes"
    },
    {
      template: "Avez-vous des troubles du transit intestinal ?",
      options: [
        "Arrêt complet des selles et gaz avec ballonnement",
        "Diarrhée aqueuse profuse avec déshydratation",
        "Sang visible dans les selles (rouge ou noir)",
        "Transit normal ou constipation habituelle"
      ],
      priority: "high",
      clinicalRelevance: "Occlusion intestinale vs gastro-entérite vs saignement digestif"
    },
    {
      template: "Y a-t-il des vomissements associés ?",
      options: [
        "Vomissements incoercibles avec bile verdâtre",
        "Vomissements avec traces de sang",
        "Nausées et vomissements occasionnels",
        "Peu ou pas de nausées/vomissements"
      ],
      priority: "medium",
      clinicalRelevance: "Gravité et orientation diagnostique gastro-intestinale"
    }
  ]
}

// ==================== QUESTIONS TROPICALES COMPLÉMENTAIRES ====================
const TROPICAL_COMPLEMENT_QUESTIONS = {
  cardiovascular: [
    {
      template: "Dans le contexte de Maurice, avez-vous eu récemment de la fièvre ou une infection ?",
      options: [
        "Fièvre récente avec douleur thoracique (possible péricardite post-virale)",
        "Antécédent récent de dengue/chikungunya dans les 3 derniers mois",
        "Infection récente traitée par antibiotiques",
        "Aucun contexte infectieux ou tropical particulier"
      ],
      tropicalRelevance: "Péricardite post-dengue, myocardite virale tropicale, complications cardiaques"
    }
  ],

  respiratory: [
    {
      template: "Exposition récente à l'eau stagnante ou aux moustiques ?",
      options: [
        "Contact avec eau stagnante/boueuse + symptômes respiratoires",
        "Forte exposition aux moustiques dans les 2 dernières semaines", 
        "Activités aquatiques en eau douce (rivières, lacs)",
        "Pas d'exposition particulière aux vecteurs ou eau contaminée"
      ],
      tropicalRelevance: "Leptospirose pulmonaire, complications respiratoires dengue, infections d'origine hydrique"
    },
    {
      template: "Y a-t-il d'autres cas similaires dans votre entourage ?",
      options: [
        "Plusieurs personnes de la famille/quartier avec symptômes respiratoires",
        "Un ou deux proches avec symptômes similaires",
        "Cas isolé dans mon entourage proche",
        "Aucun cas similaire connu dans l'entourage"
      ],
      tropicalRelevance: "Épidémie dengue/chikungunya vs pathologie respiratoire standard"
    }
  ],

  neurological: [
    {
      template: "Dans le contexte mauricien, avez-vous eu de la fièvre avec ces symptômes neurologiques ?",
      options: [
        "Fièvre élevée suivie de confusion/maux de tête (possible paludisme cérébral)",
        "Fièvre avec maux de tête et éruption cutanée",
        "Fièvre légère sans rapport apparent avec les symptômes neurologiques",
        "Aucune fièvre associée aux symptômes neurologiques"
      ],
      tropicalRelevance: "Paludisme cérébral, méningite tropicale, complications neurologiques dengue"
    }
  ],

  gastrointestinal: [
    {
      template: "Avez-vous été exposé à de l'eau potentiellement contaminée ?",
      options: [
        "Consommation d'eau de source/puits ou contact avec eau de crue",
        "Repas en dehors du domicile dans les 3 derniers jours",
        "Eau du robinet uniquement avec précautions d'hygiène",
        "Aucune exposition particulière à l'eau contaminée"
      ],
      tropicalRelevance: "Leptospirose, gastro-entérite hydrique, infections d'origine alimentaire tropicales"
    },
    {
      template: "Pattern familial ou saisonnier de vos symptômes digestifs ?",
      options: [
        "Plusieurs membres de la famille avec symptômes similaires",
        "Symptômes coïncidant avec la saison des pluies/cyclones",
        "Cas isolé sans lien saisonnier apparent",
        "Première fois avec ce type de symptômes"
      ],
      tropicalRelevance: "Épidémie gastro-entérite, contamination hydrique saisonnière"
    }
  ]
}

// ==================== MAURITIUS MEDICAL KNOWLEDGE BASE ====================
const MAURITIUS_ENDEMIC_DISEASES = {
  dengue: {
    prevalence: 'high',
    seasonality: 'year-round with rainy season peaks (Nov-April)',
    vector: 'Aedes aegypti and Aedes albopictus',
    symptoms: ['fever', 'severe headache', 'retro-orbital pain', 'muscle pain', 'joint pain', 'nausea', 'vomiting', 'rash'],
    redFlags: ['plasma leakage', 'bleeding', 'thrombocytopenia', 'hepatomegaly', 'abdominal pain', 'persistent vomiting'],
    complications: ['dengue hemorrhagic fever', 'dengue shock syndrome'],
    diagnosis: ['NS1 antigen (days 1-7)', 'IgM serology (day 5+)', 'platelet count', 'hematocrit monitoring']
  },
  chikungunya: {
    prevalence: 'moderate to high',
    seasonality: 'year-round, same vectors as dengue',
    vector: 'Aedes aegypti and Aedes albopictus',
    symptoms: ['sudden high fever', 'severe arthralgia', 'myalgia', 'headache', 'maculopapular rash'],
    characteristic: 'severe joint pain, often incapacitating',
    redFlags: ['persistent arthritis >3 months', 'neurological complications', 'ocular involvement'],
    complications: ['chronic arthropathy', 'atypical presentations', 'mother-to-child transmission']
  },
  malaria: {
    prevalence: 'low but present',
    species: 'mainly P. vivax, rare P. falciparum',
    transmission: 'Anopheles mosquitoes, imported cases from Madagascar/Africa',
    symptoms: ['fever', 'chills', 'headache', 'vomiting', 'fatigue', 'periodic fever pattern'],
    redFlags: ['altered consciousness', 'severe anemia', 'respiratory distress', 'renal failure'],
    complications: ['cerebral malaria', 'severe anemia', 'multi-organ failure']
  },
  leptospirosis: {
    prevalence: 'moderate during rainy season',
    transmission: 'contaminated water/soil contact, rat urine',
    seasonality: 'peaks during heavy rains and floods',
    symptoms: ['fever', 'headache', 'muscle pain', 'conjunctival suffusion', 'jaundice'],
    redFlags: ['Weil disease (jaundice + renal failure)', 'meningitis', 'pulmonary hemorrhage'],
    treatment: 'early antibiotic treatment crucial'
  }
}

const MAURITIUS_SYMPTOM_CATEGORIES = {
  // Tropical categories
  tropical_fever: ['dengue-like syndrome', 'chikungunya-like syndrome', 'malaria-like syndrome', 'leptospirosis-like syndrome'],
  vector_borne: ['mosquito-borne diseases', 'post-rain outbreaks', 'community clusters'],
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
      mosquitoActivity: clinical.mosquitoActivity,
      seasonalOnset: clinical.seasonalOnset
    })
    
    let hash = 0
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    return `cache_${Math.abs(hash)}_${mode}_mauritius_balanced`
  }
}

const cache = new EnhancedCache()

// ==================== DATA PROCESSING FUNCTIONS ====================
function processPatientData(patient: PatientData): ProcessedPatientData {
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
  
  // Calculate risk profiles
  const riskProfile = calculateRiskProfile(age, chronicConditions, patient.lifeHabits, bmi)
  
  // Process lifestyle
  const lifestyle = processLifestyle(patient.lifeHabits || {
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
  const mainComplaint = typeof clinical.chiefComplaint === 'string' 
    ? clinical.chiefComplaint.trim() 
    : ''
    
  const symptomsList = Array.isArray(clinical.symptoms) 
    ? clinical.symptoms.filter(s => typeof s === 'string' && s.trim() !== '')
    : []
    
  const complaintCategory = categorizeComplaint(mainComplaint, symptomsList)
  
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
  
  // Mauritius specific processing
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
  
  // Temperature
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

// ==================== LOGIQUE DE GÉNÉRATION ÉQUILIBRÉE ====================
function generateBalancedQuestions(
  context: MedicalContext,
  mode: string
): DiagnosticQuestion[] {
  const { clinical, tropicalDiseaseRisk, criticalityScore } = context
  const category = clinical.complaintCategory
  
  // Récupérer la matrice de priorités
  const priority = QUESTION_PRIORITY_MATRIX[category] || QUESTION_PRIORITY_MATRIX.general
  
  const questions: DiagnosticQuestion[] = []
  let questionId = 1

  // ÉTAPE 1: Questions médicales standard (PRIORITÉ)
  const standardQuestions = STANDARD_MEDICAL_QUESTIONS[category] || []
  const numStandardQuestions = Math.min(standardQuestions.length, priority.standardQuestions)
  
  for (let i = 0; i < numStandardQuestions; i++) {
    const q = standardQuestions[i]
    questions.push({
      id: questionId++,
      question: q.template,
      options: q.options,
      priority: q.priority as any,
      rationale: `Question médicale standard essentielle pour ${category}`,
      clinicalRelevance: q.clinicalRelevance,
      redFlagDetection: q.priority === 'critical',
      mauritiusContext: false  // Standard medical question
    })
  }

  // ÉTAPE 2: Questions tropicales complémentaires (SI JUSTIFIÉES)
  const shouldAddTropical = (
    criticalityScore >= priority.urgencyThreshold ||
    tropicalDiseaseRisk.overallTropicalRisk >= 6 ||
    category.includes('tropical') ||
    category === 'constitutional' ||
    clinical.vitals.tempStatus === 'fever'
  )

  if (shouldAddTropical) {
    const tropicalQuestions = TROPICAL_COMPLEMENT_QUESTIONS[category] || []
    const numTropicalQuestions = Math.min(tropicalQuestions.length, priority.tropicalQuestions)
    
    for (let i = 0; i < numTropicalQuestions; i++) {
      const q = tropicalQuestions[i]
      questions.push({
        id: questionId++,
        question: q.template,
        options: q.options,
        priority: 'medium' as any,
        rationale: `Question tropicale complémentaire pour contexte Maurice`,
        tropicalDiseaseRelevance: q.tropicalRelevance,
        mauritiusContext: true
      })
    }
  }

  // ÉTAPE 3: Questions spécifiques selon le mode
  const totalQuestions = mode === 'fast' ? 3 : mode === 'balanced' ? 5 : 8
  
  // Si pas assez de questions, ajouter des questions génériques pertinentes
  while (questions.length < totalQuestions) {
    questions.push(generateGenericQuestion(questionId++, category, context))
  }

  return questions.slice(0, totalQuestions)
}

function generateGenericQuestion(
  id: number, 
  category: string, 
  context: MedicalContext
): DiagnosticQuestion {
  const genericQuestions = {
    cardiovascular: {
      question: "Quels facteurs déclenchent ou aggravent vos symptômes cardiaques ?",
      options: [
        "Stress émotionnel important ou effort physique intense",
        "Prise de nouveaux médicaments ou changement de traitement",
        "Changements d'activité ou modifications du mode de vie",
        "Aucun facteur déclenchant clairement identifié"
      ]
    },
    respiratory: {
      question: "Avez-vous été exposé récemment à des irritants respiratoires ?",
      options: [
        "Exposition à la fumée, poussière, pollution ou produits chimiques",
        "Contact avec animaux domestiques ou nouvelles substances allergènes",
        "Voyage récent ou changement d'environnement de vie/travail", 
        "Aucune exposition particulière identifiée"
      ]
    },
    neurological: {
      question: "Quel est l'impact de vos symptômes sur votre vie quotidienne ?",
      options: [
        "Impossibilité totale de réaliser mes activités habituelles",
        "Gêne importante mais je peux encore fonctionner partiellement",
        "Gêne modérée mais je reste globalement fonctionnel",
        "Impact minimal sur mes activités quotidiennes"
      ]
    }
  }

  const template = genericQuestions[category] || {
    question: "Comment évoluent globalement vos symptômes depuis leur début ?",
    options: [
      "Amélioration progressive et continue",
      "Stabilité relative des symptômes", 
      "Aggravation progressive et préoccupante",
      "Évolution variable et imprévisible"
    ]
  }

  return {
    id,
    question: template.question,
    options: template.options,
    priority: 'medium',
    rationale: `Question complémentaire pour évaluation globale`,
    clinicalRelevance: `Évaluation fonctionnelle et évolution pour ${category}`
  }
}

// ==================== MAURITIUS-SPECIFIC FUNCTIONS ====================
function calculateRiskProfile(
  age: number, 
  conditions: string[], 
  lifestyle?: PatientData['lifeHabits'],
  bmi?: number
) {
  const profile = {
    cardiovascular: 'low' as 'low' | 'medium' | 'high',
    diabetes: 'low' as 'low' | 'medium' | 'high',
    respiratory: 'low' as 'low' | 'medium' | 'high',
    tropical: 'low' as 'low' | 'medium' | 'high'
  }
  
  // Cardiovascular risk
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
  
  // Tropical disease risk
  let tropicalRisk = 0
  tropicalRisk += 1 // Base risk in Mauritius
  
  if (lifestyle?.mosquitoExposure === 'high') tropicalRisk += 2
  else if (lifestyle?.mosquitoExposure === 'medium') tropicalRisk += 1
  
  if (lifestyle?.waterContact === 'frequent') tropicalRisk += 2
  else if (lifestyle?.waterContact === 'occasional') tropicalRisk += 1
  
  if (age < 5 || age > 65) tropicalRisk += 1
  if (conditions.some(c => c.toLowerCase().includes('pregnan'))) tropicalRisk += 1
  
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

function categorizeComplaint(complaint: string, symptoms: string[]): string {
  const cleanComplaint = typeof complaint === 'string' ? complaint : ''
  const cleanSymptoms = Array.isArray(symptoms) 
    ? symptoms.filter(s => typeof s === 'string' && s.trim() !== '')
    : []
  
  const allText = `${cleanComplaint} ${cleanSymptoms.join(' ')}`.toLowerCase()
  
  // Check for fever + other symptoms = potential tropical disease
  if (allText.includes('fever') && (
    allText.includes('headache') || 
    allText.includes('joint pain') || 
    allText.includes('muscle pain') ||
    allText.includes('rash')
  )) {
    return 'tropical_fever'
  }
  
  // MAURITIUS-SPECIFIC CATEGORIES
  if (MAURITIUS_SYMPTOM_CATEGORIES.tropical_fever.some(keyword => allText.includes(keyword))) {
    return 'tropical_fever'
  }
  
  if (MAURITIUS_SYMPTOM_CATEGORIES.vector_borne.some(keyword => allText.includes(keyword))) {
    return 'vector_borne'
  }
  
  if (MAURITIUS_SYMPTOM_CATEGORIES.water_related.some(keyword => allText.includes(keyword))) {
    return 'water_related'
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
  
  // Vital signs
  if (clinical.vitals.tempStatus === 'high-fever') {
    score += 3
  } else if (clinical.vitals.tempStatus === 'fever') {
    score += 2
  } else if (clinical.vitals.tempStatus === 'hypothermia') {
    score += 3
  }
  
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
  
  // Tropical disease risk factors
  if (tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') score += 2
  else if (tropicalRisk.dengue === 'high' || tropicalRisk.chikungunya === 'high') score += 1
  
  if (tropicalRisk.malaria === 'high') score += 2
  if (tropicalRisk.leptospirosis === 'high') score += 1
  
  // Community outbreak
  if (clinical.communityPattern === 'neighborhood_outbreak') score += 2
  else if (clinical.communityPattern === 'family_cluster') score += 1
  
  // Risk factors
  if (patient.riskProfile.cardiovascular === 'high') score += 2
  else if (patient.riskProfile.cardiovascular === 'medium') score += 1
  
  if (patient.riskProfile.tropical === 'high') score += 1
  
  // Chronic conditions
  if (patient.hasChronicConditions) score += 1
  
  return Math.min(score, 10) // Cap at 10
}

// ==================== PROMPTS ÉQUILIBRÉS ====================
function generateEquilibratedPrompt(
  mode: string,
  context: MedicalContext
): string {
  const category = context.clinical.complaintCategory
  const priority = QUESTION_PRIORITY_MATRIX[category] || QUESTION_PRIORITY_MATRIX.general
  
  const needsBalancedApproach = (
    context.tropicalDiseaseRisk.overallTropicalRisk >= 6 ||
    context.clinical.vitals.tempStatus === 'fever' ||
    category.includes('tropical') ||
    context.criticalityScore >= priority.urgencyThreshold
  )
  
  if (needsBalancedApproach) {
    return generateBalancedPrompt(mode, context)
  } else {
    return generateStandardMedicalPrompt(mode, context)
  }
}

function generateStandardMedicalPrompt(
  mode: string,
  context: MedicalContext  
): string {
  const { patient, clinical } = context
  const category = clinical.complaintCategory

  return `ÉVALUATION MÉDICALE STANDARD - CONTEXTE MAURICE

PATIENT: ${patient.age}y ${patient.gender}${patient.isPregnant ? ' (ENCEINTE)' : ''}
PLAINTE: ${clinical.mainComplaint}
CATÉGORIE: ${category}

APPROCHE DIAGNOSTIQUE: Médecine standard avec contexte géographique Maurice

🎯 PRIORITÉ: Questions médicales essentielles pour ${category}
📍 CONTEXTE: Maurice (mention tropicale uniquement si cliniquement pertinente)

${getPrimaryMedicalFocus(category)}

Générer ${mode === 'fast' ? '3' : mode === 'balanced' ? '5' : '8'} questions focalisées sur l'évaluation médicale standard appropriée.

Mentionner contexte tropical UNIQUEMENT si:
- Fièvre présente 
- Exposition eau/vecteurs pertinente pour le diagnostic différentiel
- Complications tropicales possibles pour cette présentation

Format JSON standard avec questions médicales pertinentes.`
}

function generateBalancedPrompt(
  mode: string,
  context: MedicalContext
): string {
  const { patient, clinical, tropicalDiseaseRisk } = context
  const category = clinical.complaintCategory
  const priority = QUESTION_PRIORITY_MATRIX[category] || QUESTION_PRIORITY_MATRIX.general

  const isHighTropicalRisk = (
    tropicalDiseaseRisk.overallTropicalRisk >= 6 ||
    clinical.vitals.tempStatus === 'fever' ||
    category.includes('tropical')
  )

  return `ÉVALUATION MÉDICALE ÉQUILIBRÉE - MAURICE

CONTEXTE GÉOGRAPHIQUE: Île Maurice (contexte tropical)
CATÉGORIE MÉDICALE: ${category.toUpperCase()}

PATIENT: ${patient.age}y ${patient.gender}${patient.isPregnant ? ' (ENCEINTE)' : ''}
PLAINTE PRINCIPALE: ${clinical.mainComplaint}
DURÉE: ${clinical.duration.value}
DOULEUR: ${clinical.painLevel}/10
${clinical.vitals.temperature ? `TEMPÉRATURE: ${clinical.vitals.temperature}°C` : ''}

APPROCHE DIAGNOSTIQUE PRIORITAIRE:

${!isHighTropicalRisk ? `
🎯 PRIORITÉ MÉDICALE STANDARD:
Cette présentation nécessite d'abord une évaluation médicale standard rigoureuse.
Les questions tropicales ne sont complémentaires que si cliniquement justifiées.

FOCUS PRINCIPAL: ${category} - Diagnostic différentiel standard
Questions requises: ${priority.standardQuestions} standard + ${priority.tropicalQuestions} tropical (si indiqué)
` : `
🦟 CONTEXTE TROPICAL PERTINENT:
Risque tropical élevé détecté - Intégrer évaluation tropicale avec standard médical.
Approche équilibrée entre médecine standard et tropicale requise.

FOCUS ÉQUILIBRÉ: ${category} standard + maladies tropicales
`}

INSTRUCTIONS SPÉCIFIQUES:

✅ QUESTIONS MÉDICALES STANDARD (PRIORITÉ):
${getPrimaryMedicalFocus(category)}

${isHighTropicalRisk ? `
🏝️ QUESTIONS TROPICALES COMPLÉMENTAIRES:
- Uniquement si pertinentes pour le diagnostic différentiel
- Focus sur les complications tropicales spécifiques à ${category}
- Considérer exposition vecteurs/eau si pertinent
` : `
🏝️ CONSIDÉRATIONS TROPICALES LIMITÉES:
- Seulement si score criticité ≥ ${priority.urgencyThreshold}
- Ou si fièvre/contexte épidémiologique évident
- Éviter surinterprétation tropicale
`}

${patient.isPregnant ? `
⚠️ ADAPTATIONS GROSSESSE:
- Priorité absolue sécurité materno-fœtale
- Questions adaptées aux modifications physiologiques
- Considérer interactions grossesse + conditions tropicales
` : ''}

Format JSON attendu avec ${mode === 'fast' ? '3' : mode === 'balanced' ? '5' : '8'} questions équilibrées.`
}

function getPrimaryMedicalFocus(category: string): string {
  const focusMap = {
    cardiovascular: `
- Caractérisation douleur thoracique (type, irradiation, déclencheurs)
- Évaluation risque coronaire (effort, facteurs risque)
- Signes insuffisance cardiaque ou complications
- Diagnostic différentiel SCA vs autres causes`,
    
    respiratory: `
- Pattern dyspnée/toux (aigu vs chronique, productif vs sec)
- Signes détresse respiratoire ou hypoxémie
- Facteurs déclenchants/aggravants
- Diagnostic différentiel pneumonie vs EP vs asthme`,
    
    neurological: `
- Caractérisation céphalée/signes neuro (brutal vs progressif)
- Signes neurologiques focaux (déficit moteur/sensitif)
- Signes méningés ou hypertension intracrânienne
- Diagnostic différentiel AVC vs migraine vs infection`,
    
    gastrointestinal: `
- Localisation/caractère douleur abdominale
- Signes péritonéaux ou occlusion
- Troubles transit/saignements digestifs
- Diagnostic différentiel urgence chirurgicale vs médicale`
  }
  
  return focusMap[category] || `
- Évaluation symptômes principaux selon spécialité
- Identification signes d'alarme/urgence
- Facteurs déclenchants et évolution
- Diagnostic différentiel approprié`
}

// ==================== RISK ASSESSMENT AND SPECIALTY SUGGESTION ====================
function detectRedFlags(
  patient: ProcessedPatientData, 
  clinical: ProcessedClinicalData,
  tropicalRisk: TropicalDiseaseRisk
): string[] {
  const flags: string[] = []
  
  // Critical vital signs
  if (clinical.vitals.tempStatus === 'high-fever') {
    flags.push('HIGH: High fever (>38.5°C) - Urgent evaluation needed')
  }
  
  if (clinical.vitals.bpStatus === 'crisis') {
    flags.push('CRITICAL: Hypertensive crisis')
  } else if (clinical.vitals.bpStatus === 'hypotension') {
    flags.push('HIGH: Hypotension - Rule out shock')
  }
  
  // Pain red flags
  if (clinical.painLevel >= 9) {
    flags.push('HIGH: Extreme pain (9-10/10)')
  }
  
  // Category-specific red flags
  if (clinical.complaintCategory === 'cardiovascular') {
    if (clinical.symptomsList.some(s => s.toLowerCase().includes('chest pain'))) {
      flags.push('HIGH: Chest pain - Rule out acute coronary syndrome')
    }
  }
  
  if (clinical.complaintCategory === 'neurological') {
    if (clinical.symptomsList.some(s => s.toLowerCase().includes('headache'))) {
      flags.push('MEDIUM: Headache - Monitor for red flag features')
    }
  }
  
  // Tropical disease red flags
  if (tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') {
    flags.push('HIGH: Very high tropical disease risk - Urgent evaluation')
  }
  
  // Community outbreak
  if (clinical.communityPattern === 'neighborhood_outbreak') {
    flags.push('HIGH: Community outbreak pattern - Public health notification')
  }
  
  return flags
}

function suggestSpecialty(
  category: string, 
  redFlags: string[], 
  isPregnant: boolean = false,
  tropicalRisk: TropicalDiseaseRisk
): string | undefined {
  if (redFlags.some(f => f.includes('CRITICAL'))) {
    return 'Emergency Medicine'
  }
  
  if (isPregnant) {
    return 'Obstetrics/Gynecology'
  }
  
  // Tropical disease specialties
  if (category === 'tropical_fever' || category === 'vector_borne') {
    if (tropicalRisk.dengue === 'very_high' || tropicalRisk.chikungunya === 'very_high') {
      return 'Infectious Disease/Internal Medicine'
    }
    return 'Internal Medicine'
  }
  
  if (tropicalRisk.malaria === 'high') {
    return 'Infectious Disease'
  }
  
  // Standard specialties
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
  
  if (isPregnant) adjustedScore += 1
  
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

// ==================== RECOMMENDATIONS ====================
function generateRecommendations(
  context: MedicalContext,
  mode: string
): APIResponse['recommendations'] {
  const recommendations: APIResponse['recommendations'] = {}
  const { patient, clinical, tropicalDiseaseRisk } = context
  
  // Immediate actions for high criticality
  if (context.criticalityScore >= 7) {
    recommendations.immediateAction = [
      'Call emergency services or go to nearest emergency department immediately',
      'Do not drive yourself - arrange emergency transport',
      'Bring list of current medications and medical history'
    ]
    
    if (patient.isPregnant) {
      recommendations.immediateAction.push('Inform emergency services that you are pregnant')
    }
    
    if (tropicalDiseaseRisk.dengue === 'very_high' || tropicalDiseaseRisk.chikungunya === 'very_high') {
      recommendations.immediateAction.push('Mention possible tropical disease to medical team')
    }
  } else if (context.criticalityScore >= 5) {
    recommendations.immediateAction = [
      'Seek medical attention within 24 hours',
      'Monitor symptoms closely',
      'Maintain hydration'
    ]
    
    if (clinical.vitals.tempStatus === 'fever') {
      recommendations.immediateAction.push('Avoid aspirin if fever present (bleeding risk)')
    }
  }
  
  // Follow-up recommendations
  if (context.criticalityScore >= 4) {
    recommendations.followUp = patient.isPregnant 
      ? 'Urgent appointment with obstetrician and appropriate specialist'
      : 'Urgent appointment with appropriate specialist'
  } else {
    recommendations.followUp = 'Routine follow-up with primary care physician if symptoms persist'
  }
  
  // Additional tests
  const tests: string[] = []
  
  if (clinical.complaintCategory === 'cardiovascular') {
    tests.push('ECG', 'Troponin levels')
    if (!patient.isPregnant) {
      tests.push('Chest X-ray')
    }
  } else if (clinical.complaintCategory === 'respiratory') {
    tests.push('Pulse oximetry', 'Chest X-ray')
  }
  
  // Tropical disease tests if high risk
  if (tropicalDiseaseRisk.dengue === 'high' || tropicalDiseaseRisk.dengue === 'very_high') {
    tests.push('NS1 antigen test', 'Dengue serology', 'Full blood count with platelet count')
  }
  
  if (tropicalDiseaseRisk.malaria === 'high') {
    tests.push('Malaria rapid diagnostic test', 'Blood smear for malaria parasites')
  }
  
  if (tests.length > 0) {
    recommendations.additionalTests = tests
  }
  
  // Specialist referral
  if (context.suggestedSpecialty && context.criticalityScore >= 3) {
    recommendations.specialistReferral = context.suggestedSpecialty
  }
  
  // Tropical disease considerations
  const tropicalConsiderations: string[] = []
  
  if (clinical.vitals.tempStatus === 'fever') {
    tropicalConsiderations.push('Fever in tropical setting requires evaluation for endemic diseases')
    tropicalConsiderations.push('Monitor for warning signs of tropical diseases')
  }
  
  if (clinical.communityPattern === 'family_cluster' || clinical.communityPattern === 'neighborhood_outbreak') {
    tropicalConsiderations.push('Possible community outbreak - consider public health notification')
  }
  
  if (tropicalConsiderations.length > 0) {
    recommendations.tropicalDiseaseConsiderations = tropicalConsiderations
  }
  
  return recommendations
}

// ==================== DATA PROTECTION ====================
function anonymizeData(patient: PatientData): {
  anonymized: PatientData,
  anonymousId: string,
  removedFields: string[]
} {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const anonymousId = `MU-BALANCED-${timestamp}-${random}`
  
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
  if (mode === 'intelligent') confidence += 15
  else if (mode === 'balanced') confidence += 10
  else confidence += 5
  
  // Adjust based on criticality
  if (criticalityScore >= 7 && dataCompleteness < 80) {
    confidence -= 25
  }
  
  // Pregnancy considerations
  if (isPregnant && dataCompleteness < 90) {
    confidence -= 15
  }
  
  return Math.max(30, Math.min(95, confidence))
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
    
    console.log('🏝️ MAURITIUS BALANCED MEDICAL API - Processing request:', {
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
    const { anonymized, anonymousId } = anonymizeData(patientData)
    
    // 5. Process data
    const processedPatient = processPatientData(anonymized)
    const processedClinical = processClinicalData(clinicalData)
    
    console.log('✅ Balanced data processed:', {
      patient: {
        age: processedPatient.age,
        gender: processedPatient.gender,
        isPregnant: processedPatient.isPregnant,
        category: processedClinical.complaintCategory
      },
      clinical: {
        complaint: processedClinical.mainComplaint,
        category: processedClinical.complaintCategory,
        fever: processedClinical.vitals.tempStatus
      }
    })
    
    // 6. Risk assessment
    const mauritiusSeasonalContext = getCurrentSeasonalContext()
    const tropicalDiseaseRisk = calculateTropicalDiseaseRisk(processedPatient, processedClinical, mauritiusSeasonalContext)
    
    // Standard risk factors
    const riskFactors: RiskFactor[] = []
    
    if (processedPatient.riskProfile.cardiovascular !== 'low') {
      riskFactors.push({
        factor: 'Cardiovascular risk',
        severity: processedPatient.riskProfile.cardiovascular,
        relatedTo: 'Patient profile'
      })
    }
    
    if (processedPatient.isPregnant) {
      riskFactors.push({
        factor: 'Pregnancy',
        severity: 'high',
        relatedTo: 'Physiological state',
        mauritiusSpecific: true
      })
    }
    
    // 7. Calculate scores
    const criticalityScore = calculateCriticalityScore(processedPatient, processedClinical, tropicalDiseaseRisk)
    const redFlags = detectRedFlags(processedPatient, processedClinical, tropicalDiseaseRisk)
    const suggestedSpecialty = suggestSpecialty(
      processedClinical.complaintCategory, 
      redFlags, 
      processedPatient.isPregnant,
      tropicalDiseaseRisk
    )
    
    // 8. Auto-adjust mode for high criticality
    let adjustedMode = mode
    if (criticalityScore >= 8 && mode !== 'intelligent') {
      adjustedMode = 'intelligent'
      console.log(`⚠️ Auto-escalated to intelligent mode due to criticality: ${criticalityScore}`)
    }
    
    // 9. Create medical context
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
    
    // 10. Generate balanced questions directly
    const questions = generateBalancedQuestions(context, adjustedMode)
    
    // 11. Calculate metadata
    const dataCompleteness = calculateDataCompleteness(processedPatient, processedClinical)
    const confidenceLevel = calculateConfidenceLevel(
      dataCompleteness, 
      adjustedMode, 
      criticalityScore,
      processedPatient.isPregnant,
      tropicalDiseaseRisk
    )
    
    // 12. Generate recommendations
    const recommendations = generateRecommendations(context, adjustedMode)
    
    // 13. Build final response
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
        model: 'balanced_approach',
        processingTime: Date.now() - startTime,
        dataCompleteness,
        confidenceLevel,
        mauritiusAdaptation: true
      }
    }
    
    // 14. Cache response
    cache.set(cacheKey, response)
    
    console.log('✅ Balanced Mauritius API response generated:', {
      questionsCount: questions.length,
      criticalityScore,
      redFlagsCount: redFlags.length,
      mode: adjustedMode,
      category: processedClinical.complaintCategory,
      standardQuestions: questions.filter(q => !q.mauritiusContext).length,
      tropicalQuestions: questions.filter(q => q.mauritiusContext).length
    })
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('❌ Balanced Mauritius API Error:', error)
    
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
        confidenceLevel: 0,
        mauritiusAdaptation: false
      }
    }, { status: 500 })
  }
}

// ==================== TEST ENDPOINT ====================
export async function GET() {
  const currentSeason = getCurrentSeasonalContext()
  
  return NextResponse.json({
    status: '✅ Mauritius Balanced Medical API v3.1 Operational',
    version: '3.1.0 - ÉQUILIBRÉE - MAURICE MEDICAL API',
    
    improvements: {
      balancedApproach: 'Système de priorités intelligentes intégré',
      standardFirst: 'Questions médicales standard priorisées',
      tropicalComplement: 'Questions tropicales seulement si justifiées',
      categorySpecific: 'Matrice de priorités par spécialité médicale'
    },
    
    questionPriorities: {
      cardiovascular: 'Standard: 4 questions, Tropical: 1 question (seuil: 6)',
      respiratory: 'Standard: 3 questions, Tropical: 2 questions (seuil: 5)',
      neurological: 'Standard: 4 questions, Tropical: 1 question (seuil: 7)',
      gastrointestinal: 'Standard: 3 questions, Tropical: 2 questions (seuil: 5)',
      tropicalFever: 'Standard: 2 questions, Tropical: 3 questions (seuil: 3)'
    },
    
    mauritiusContext: {
      location: 'Republic of Mauritius (20.2°S, 57.5°E)',
      currentSeason: currentSeason.currentSeason,
      diseaseRiskLevel: currentSeason.diseaseRiskLevel,
      predominantDiseases: currentSeason.predominantDiseases,
      balancedApproach: 'Standard médical + tropical complémentaire'
    },
    
    features: [
      '🎯 Système de priorités intelligentes par spécialité',
      '🏥 Questions médicales standard priorisées',
      '🦟 Questions tropicales complémentaires justifiées',
      '⚖️ Approche équilibrée selon contexte clinique',
      '🩺 Évaluation cardiologique complète pour douleur thoracique',
      '🫁 Évaluation respiratoire standard pour dyspnée',
      '🧠 Évaluation neurologique prioritaire pour céphalées',
      '🏝️ Intégration contextuelle des maladies tropicales',
      '📊 Triage médical équilibré et approprié'
    ],
    
    modes: {
      fast: {
        description: 'Triage rapide avec priorités médicales',
        questions: 3,
        approach: 'Standard médical + tropical si urgent'
      },
      balanced: {
        description: 'Évaluation médicale équilibrée',
        questions: 5,
        approach: 'Standard prioritaire + tropical complémentaire'
      },
      intelligent: {
        description: 'Consultation spécialisée complète',
        questions: 8,
        approach: 'Évaluation expert standard + tropical'
      }
    }
  })
}
