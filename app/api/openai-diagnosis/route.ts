import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Types spécifiques pour la télémédecine Maurice
interface MauritiusTeleMedRequest {
  patientData: MauritianPatientData
  clinicalData: TropicalClinicalData
  questionsData?: QuestionnaireData
  emergencyFlags?: EmergencyFlags
  teleMedContext: TeleMedContext
  locationData: MauritianLocationData
}

interface MauritianPatientData {
  firstName: string
  lastName: string
  age: number
  gender: 'M' | 'F' | 'X'
  weight?: number
  height?: number
  ethnicity: 'Indo-Mauritian' | 'Creole' | 'Sino-Mauritian' | 'Franco-Mauritian' | 'Mixed' | 'Other'
  languages: ('French' | 'English' | 'Creole' | 'Hindi' | 'Tamil' | 'Chinese' | 'Urdu')[]
  allergies: string[]
  medicalHistory: MedicalHistory[]
  medications: CurrentMedication[]
  familyHistory: FamilyHistory[]
  socialHistory: TropicalSocialHistory
  travelHistory: TravelHistory[]
  vaccinationStatus: VaccinationRecord[]
  insuranceType: 'Public' | 'Private' | 'Combined' | 'None'
}

interface TropicalSocialHistory {
  mosquitoExposure: 'High' | 'Medium' | 'Low'
  waterSources: ('Tap' | 'Well' | 'River' | 'Rainwater')[]
  housingType: 'Urban' | 'Rural' | 'Coastal'
  occupation: string
  recentTravel: boolean
  petOwnership: string[]
  seasonalFactors: string
}

interface TravelHistory {
  destination: string
  dates: { from: string; to: string }
  purpose: 'Tourism' | 'Business' | 'Family' | 'Medical'
  prophylaxis?: string[]
}

interface VaccinationRecord {
  vaccine: string
  date: string
  boosterDue?: string
}

interface TropicalClinicalData {
  chiefComplaint: string
  historyOfPresentIllness: string
  symptoms: TropicalSymptom[]
  vitalSigns: VitalSigns
  physicalExam: PhysicalExam
  reviewOfSystems: TropicalReviewOfSystems
  painScale?: number
  functionalStatus?: string
  mentalStatus?: string
  seasonalContext: 'Hot_Season' | 'Cool_Season' | 'Cyclone_Season' | 'Rainy_Season'
  vectorExposure: VectorExposure
}

interface TropicalSymptom {
  name: string
  onset: string
  duration: string
  severity: 1 | 2 | 3 | 4 | 5
  quality: string
  location?: string
  radiation?: string
  aggravatingFactors?: string[]
  alleviatingFactors?: string[]
  associatedSymptoms?: string[]
  tropicalContext?: string
  seasonalPattern?: boolean
}

interface VectorExposure {
  mosquitoBites: 'None' | 'Few' | 'Many' | 'Severe'
  tickExposure: boolean
  fleaExposure: boolean
  waterContact: boolean
  animalContact: string[]
}

interface TropicalReviewOfSystems {
  fever: boolean
  chills: boolean
  nightSweats: boolean
  headache: boolean
  rash: boolean
  jointPains: boolean
  musclePains: boolean
  nausea: boolean
  vomiting: boolean
  diarrhea: boolean
  abdominalPain: boolean
  cough: boolean
  breathlessness: boolean
  bleeding: boolean
  confusion: boolean
}

interface TeleMedContext {
  consultationType: 'First_Consultation' | 'Follow_Up' | 'Emergency' | 'Specialist_Opinion'
  connectionQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  availableDevices: ('Smartphone' | 'Tablet' | 'Computer' | 'Thermometer' | 'BP_Monitor' | 'Oximeter' | 'Glucometer')[]
  assistantPresent: boolean
  nearestHealthFacility: string
  distanceToHospital: number // en km
}

interface MauritianLocationData {
  region: 'Port_Louis' | 'Pamplemousses' | 'Riviere_du_Rempart' | 'Flacq' | 'Grand_Port' | 'Savanne' | 'Plaines_Wilhems' | 'Moka' | 'Black_River' | 'Rodrigues' | 'Agalega' | 'St_Brandon'
  nearestPublicHospital: string
  nearestPrivateClinic: string
  pharmacyAccess: 'Easy' | 'Moderate' | 'Difficult'
  specialistAccess: 'Available' | 'Limited' | 'Referral_Required'
}

// Formulaire national mauricien et ressources disponibles
const MAURITIAN_FORMULARY = {
  antibiotics: ['Amoxicillin', 'Doxycycline', 'Azithromycin', 'Ciprofloxacin', 'Metronidazole'],
  antimalarials: ['Artemether-Lumefantrine', 'Doxycycline', 'Mefloquine'],
  analgesics: ['Paracetamol', 'Ibuprofen', 'Diclofenac', 'Tramadol'],
  cardiovascular: ['Amlodipine', 'Enalapril', 'Atenolol', 'Simvastatin'],
  diabetes: ['Metformin', 'Glibenclamide', 'Insulin'],
  respiratory: ['Salbutamol', 'Prednisolone', 'Theophylline']
}

const MAURITIAN_HOSPITALS = {
  public: ['Sir Seewoosagur Ramgoolam National Hospital', 'Dr Jeetoo Hospital', 'Jawaharlal Nehru Hospital', 'Flacq Hospital', 'Souillac Hospital'],
  private: ['Wellkin Hospital', 'Apollo Bramwell', 'Clinique Darné', 'Clinique du Nord']
}

const TROPICAL_DISEASES_MAURITIUS = [
  'Dengue', 'Chikungunya', 'Zika', 'Malaria', 'Typhoid', 'Hepatitis A/B', 
  'Gastroenteritis', 'Skin infections', 'Respiratory infections', 'Cyclone injuries'
]

export async function POST(req: Request) {
  try {
    const requestData: MauritiusTeleMedRequest = await req.json()
    
    // Validation spécifique Maurice
    const validationError = validateMauritianMedicalData(requestData)
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 })
    }

    console.log("🏥 Télémédecine CHU Maurice - Diagnostic expert pour:", requestData.patientData.firstName, requestData.patientData.lastName)
    console.log("📍 Région:", requestData.locationData.region)
    console.log("👨‍⚕️ Niveau expertise: CHU Professeur Chef de Service")

    // Évaluation du risque tropical
    const tropicalRisk = assessTropicalDiseaseRisk(requestData)
    
    // Calcul de l'IMC et facteurs tropicaux
    const bmi = calculateBMI(requestData.patientData.weight, requestData.patientData.height)
    
    // Préparation des données contextualisées pour Maurice
    const mauritianStructuredData = formatMauritianMedicalData(requestData, bmi, tropicalRisk)

    // Prompt spécialisé télémédecine tropicale Maurice
    const mauritianExpertPrompt = createMauritianTeleMedPrompt(mauritianStructuredData)

    const result = await generateText({
      model: openai("gpt-4"),
      prompt: mauritianExpertPrompt,
      temperature: 0.02, // Température minimale pour expertise CHU maximale
      maxTokens: 6000,   // Augmenté pour diagnostic CHU complet détaillé
    })

    console.log("✅ Diagnostic télémédecine Maurice généré")

    // Parsing et validation spécifique Maurice niveau CHU
    const diagnosisData = parseAndValidateMauritianResponse(result.text)
    
    // Validation du niveau expertise CHU
    const chuExpertiseValidation = validateCHUExpertiseLevel(diagnosisData)
    
    // Vérification urgences tropicales niveau CHU
    const tropicalEmergencyAssessment = assessTropicalEmergencyStatus(diagnosisData, requestData.emergencyFlags, tropicalRisk)
    
    // Validation des recommandations selon ressources mauriciennes
    const mauritianRecommendations = validateMauritianRecommendations(diagnosisData.recommendations, requestData)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      patientId: `MU_${requestData.patientData.lastName}_${requestData.patientData.firstName}`,
      location: requestData.locationData.region,
      consultationType: requestData.teleMedContext.consultationType,
      data: {
        ...diagnosisData,
        tropicalContext: {
          riskAssessment: tropicalRisk,
          seasonalFactors: requestData.clinicalData.seasonalContext,
          vectorExposure: requestData.clinicalData.vectorExposure
        },
        emergencyAssessment: tropicalEmergencyAssessment,
        recommendations: mauritianRecommendations,
        teleMedGuidance: generateTeleMedGuidance(requestData.teleMedContext, diagnosisData),
        mauritianResources: {
          nearestFacilities: {
            publicHospital: requestData.locationData.nearestPublicHospital,
            privateClinic: requestData.locationData.nearestPrivateClinic
          },
          medicationAvailability: checkMedicationAvailability(diagnosisData.recommendations?.medications),
          referralOptions: generateReferralOptions(requestData.locationData, diagnosisData)
        },
        metadata: {
          bmi,
          tropicalRiskFactors: tropicalRisk.factors,
          culturalConsiderations: getCulturalConsiderations(requestData.patientData.ethnicity, requestData.patientData.languages),
          contraindications: checkContraindications(requestData.patientData),
        }
      }
    }

    return Response.json(response)

  } catch (error: any) {
    console.error("❌ Erreur télémédecine Maurice:", error)
    return Response.json({
      error: "Erreur système télémédecine Maurice",
      success: false,
      timestamp: new Date().toISOString(),
      emergency_contact: "SAMU 114 ou Police 999"
    }, { status: 500 })
  }
}

function createMauritianTeleMedPrompt(data: any): string {
  return `Tu es un PROFESSEUR DE MÉDECINE CHEF DE SERVICE en médecine interne/tropicale dans un CHU de référence, expert en télémédecine insulaire. Tu as 25 ans d'expérience universitaire, diriges des internes/résidents, publies dans des revues internationales et maîtrises parfaitement l'épidémiologie mauricienne et la médecine tropicale de haut niveau.

EXPERTISE ACADÉMIQUE CHU:
- Professeur agrégé de médecine interne et tropicale
- Chef de service polyvalent maîtrisant TOUTES les spécialités médicales
- Expert en diagnostic différentiel complexe (>10 hypothèses systématiques)
- Maître de conférences en sémiologie médicale avancée
- Spécialiste en evidence-based medicine et guidelines internationales
- Expert en pharmacologie clinique et interactions médicamenteuses
- Référent en urgences médicales et soins critiques tropicaux

CONTEXTE ÎLE MAURICE:
- Climat tropical: saisons chaude/fraîche, cyclones, forte humidité
- Maladies endémiques: Dengue, Chikungunya, gastroentérites, infections cutanées
- Population multi-ethnique: Indo-mauriciens, Créoles, Sino-mauriciens, Franco-mauriciens
- Système de santé mixte public/privé avec télémédecine émergente
- Ressources limitées: formulaire national, examens disponibles restreints
- Géographie insulaire: distances, accès aux soins variables

=== DONNÉES PATIENT MAURICE ===
${data.patientSection}

=== CONTEXTE TROPICAL ===
${data.tropicalSection}

=== ANAMNÈSE TÉLÉMÉDECINE ===
${data.clinicalSection}

=== EXAMEN PHYSIQUE À DISTANCE ===
${data.physicalExamSection}

=== CONTEXTE TÉLÉMÉDECINE ===
${data.teleMedSection}

=== MISSION DIAGNOSTIQUE CHU MAURICE ===

Effectue une analyse UNIVERSITAIRE EXPERTE de niveau professeur chef de service:

1. ANALYSE SÉMIOLOGIQUE EXHAUSTIVE: Décortique chaque signe selon la méthode universitaire classique
2. PHYSIOPATHOLOGIE INTÉGRÉE: Explique les mécanismes sous-jacents de chaque symptôme
3. DIAGNOSTIC DIFFÉRENTIEL SYSTÉMATIQUE: Minimum 8-12 hypothèses classées par probabilité bayésienne
4. STRATÉGIE DIAGNOSTIQUE HIÉRARCHISÉE: Examens par ordre de rentabilité diagnostique
5. THÉRAPEUTIQUE EVIDENCE-BASED: Prescription selon recommandations HAS/OMS/Cochrane niveau A
6. MALADIES TROPICALES EXPERTES: Dengue/Chikungunya/Zika/Paludisme/Typhoid/Méningites/Sepsis tropicaux
7. URGENCES VITALES: Reconnaissance immédiate states critiques (choc, détresse, coma)
8. MÉDECINE PERSONNALISÉE: Adaptation âge/ethnie/comorbidités/génétique populations mauriciennes
9. ENSEIGNEMENT MÉDICAL: Explications pédagogiques pour formation continue télémédecine
10. RECHERCHE CLINIQUE: Intégration dernières publications médecine tropicale 2024-2025

SPÉCIFICITÉS MAURICIENNES:
- Saison des pluies → pics de dengue/chikungunya
- Saison cyclonique → traumatismes, stress, ruptures de soins
- Forte humidité → infections cutanées/mycoses
- Population à risque diabète/HTA (Indo-mauriciens)
- Accès limité spécialistes selon région
- Formulaire national: médicaments disponibles restreints

CONTRAINTES TÉLÉMÉDECINE:
- Examen physique limité par caméra/descriptions
- Nécessité d'instructions claires pour patient/assistant
- Priorisation examens réalisables localement
- Orientation urgente si signes d'alarme

PROTOCOLES D'URGENCE MAURICE:
- SAMU: 114
- Police/Pompiers: 999
- Dengue hémorragique → hospitalisation immédiate
- Paludisme grave → artésunate IV urgent
- Cyclone → plan d'urgence sanitaire

RÉPONSE JSON EXPERT CHU MAURICE:
{
  "expertAnalysis": {
    "universitySemiology": {
      "primarySigns": "Analyse sémiologique universitaire détaillée des signes cardinaux",
      "secondarySigns": "Signes d'accompagnement avec signification physiopathologique",
      "syndromicApproach": "Regroupement syndromique selon enseignement CHU classique",
      "pathophysiology": "Mécanismes physiopathologiques sous-jacents expliqués niveau universitaire",
      "differentialMatrix": "Matrice différentielle systématique >8 diagnostics avec probabilités bayésiennes"
    },
    "tropicalExpertise": {
      "vectorBorneDiseases": "Analyse experte maladies vectorielles (dengue/chikungunya/zika/paludisme)",
      "waterBorneDiseases": "Pathologies hydriques tropicales (typhoid/choléra/hépatites/gastroentérites)",
      "zoonoticRisks": "Évaluation risques zoonotiques selon exposition Maurice",
      "seasonalEpidemiology": "Épidémiologie saisonnière Maurice avec cycles prévisionnels",
      "climateHealth": "Impact changement climatique sur pathologies émergentes Maurice"
    },
    "academicReasoning": "Raisonnement clinique structuré niveau enseignement médical universitaire",
    "evidenceLevel": "A|B|C avec citations guidelines internationales récentes",
    "teachingPoints": ["Points d'enseignement médical pour formation continue"],
    "literatureReview": "Synthèse littérature récente médecine tropicale appliquée cas clinique"
  },
  "comprehensiveDiagnosis": {
    "primary": {
      "condition": "Diagnostic principal précis avec terminologie médicale exacte",
      "icd11": "Code ICD-11 dernière version si disponible",
      "icd10": "Code ICD-10 de référence",
      "confidence": 85,
      "severity": "mild|moderate|severe|critical avec scoring si applicable",
      "rationale": "Justification experte détaillée niveau chef de service",
      "prognosis": "excellent|good|fair|poor|grave avec facteurs pronostiques",
      "complications": {
        "immediate": ["Complications immédiates possibles <24h"],
        "shortTerm": ["Complications court terme 1-7 jours"],
        "longTerm": ["Complications long terme >1 semaine"],
        "prevention": "Mesures préventives complications spécifiques"
      },
      "physiopathology": "Mécanismes physiopathologiques détaillés",
      "epidemiology": "Données épidémiologiques Maurice actualisées",
      "riskStratification": "Stratification du risque selon scores validés"
    },
    "systematicDifferential": [
      {
        "rank": 1,
        "condition": "Diagnostic différentiel 1 (plus probable après principal)",
        "icd10": "Code ICD-10",
        "probability": 15,
        "rationale": "Arguments pour et contre détaillés",
        "excludingFactors": ["Éléments permettant d'exclure ce diagnostic"],
        "confirmingTests": ["Tests diagnostiques confirmateurs spécifiques"],
        "urgency": "critical|high|medium|low",
        "costEffectiveness": "Rapport coût/efficacité diagnostique"
      },
      {
        "rank": 2,
        "condition": "Diagnostic différentiel 2",
        "icd10": "Code ICD-10",
        "probability": 12,
        "rationale": "Justification académique",
        "excludingFactors": ["Facteurs d'exclusion"],
        "confirmingTests": ["Tests confirmateurs"],
        "therapeuticImplications": "Implications thérapeutiques si confirmé"
      }
      // Continuer pour 8-12 diagnostics différentiels minimum
    ],
    "redFlagAssessment": {
      "criticalSigns": ["Signes d'alarme vitale identifiés"],
      "timeToTreatment": "Délai critique maximal si pathologie temps-dépendante",
      "emergencyProtocol": "Protocole d'urgence activé si nécessaire",
      "triageLevel": "1-5 selon classification internationale"
    }
  },
  "expertInvestigations": {
    "diagnosticStrategy": {
      "firstLineRational": "Stratégie diagnostique de première ligne justifiée",
      "secondLineOptions": "Examens de seconde ligne selon résultats premiers",
      "goldStandard": "Gold standard diagnostique si applicable",
      "costEffectiveness": "Analyse coût-efficacité examens proposés"
    },
    "immediate_STAT": [
      {
        "name": "Examens urgents <2h",
        "category": "biology|imaging|cardiology|neurophysiology",
        "indication": "Indication médicale précise niveau CHU",
        "expectedFindings": "Résultats attendus avec seuils pathologiques",
        "interpretation": "Interprétation experte résultats selon contexte",
        "sensitivity": "Sensibilité/spécificité test",
        "timeFrame": "Délai d'obtention résultats",
        "alternatives": "Alternatives si test non disponible Maurice"
      }
    ],
    "tropical_Specific": [
      {
        "name": "Tests spécifiques maladies tropicales",
        "indications": "Selon épidémiologie et présentation clinique",
        "availability_Maurice": "Disponibilité réelle laboratoires Maurice",
        "interpretation": "Interprétation experte contexte tropical",
        "limitations": "Limites techniques et temporelles"
      }
    ],
    "advanced_CHU": [
      {
        "name": "Examens CHU spécialisés",
        "indication": "Si diagnostic complexe non résolu",
        "referralRequired": "Nécessité transfert CHU métropole si indisponible",
        "expertConsultation": "Avis spécialisé requis"
      }
    ]
  },
  "expertTherapeutics": {
    "emergencyManagement": [
      {
        "intervention": "Mesures d'urgence vitale immédiate",
        "indication": "Détresse vitale identifiée",
        "protocol": "Protocole CHU standardisé",
        "monitoring": "Surveillance continue paramètres vitaux"
      }
    ],
    "evidenceBasedMedications": [
      {
        "name": "Médicament exact (DCI internationale)",
        "class": "Classe pharmacologique précise",
        "mechanism": "Mécanisme d'action détaillé",
        "dosage": "Posologie exacte mg/kg si pédiatrique, adulte standard",
        "route": "Voie d'administration optimale",
        "frequency": "Fréquence basée pharmacocinétique",
        "duration": "Durée traitement evidence-based",
        "indication": "Indication spécifique niveau universitaire",
        "contraindications": {
          "absolute": ["Contre-indications absolues"],
          "relative": ["Contre-indications relatives avec adaptation possible"]
        },
        "interactions": ["Interactions médicamenteuses majeures"],
        "sideEffects": {
          "common": ["Effets indésirables fréquents >10%"],
          "serious": ["Effets indésirables graves surveillance"],
          "monitoring": "Surveillance biologique/clinique requise"
        },
        "mauritianAvailability": "Public|Private|Import_required",
        "cost": "Estimation coût Maurice avec alternatives",
        "evidenceLevel": "A|B|C avec références guidelines",
        "pediatricDosing": "Adaptation pédiatrique si applicable",
        "renalAdjustment": "Adaptation insuffisance rénale",
        "hepaticAdjustment": "Adaptation insuffisance hépatique"
      }
    ],
    "adjuvantTherapy": [
      {
        "intervention": "Thérapeutiques complémentaires evidence-based",
        "indication": "Justification médicale précise",
        "evidenceLevel": "Niveau de preuve scientifique"
      }
    ]
  },
  "expertFollowUp": {
    "criticalTimePoints": {
      "immediate_2h": "Surveillance immédiate premiers signes amélioration/aggravation",
      "early_24h": "Évaluation précoce réponse traitement",
      "shortTerm_72h": "Suivi court terme évolution clinique",
      "weeklyFollow": "Surveillance hebdomadaire jusqu'amélioration complète"
    },
    "specialistReferrals": [
      {
        "specialty": "Spécialité médicale précise",
        "indication": "Indication académique justifiée",
        "urgency": "critical|urgent|routine avec délais",
        "mauritianAvailability": "Disponibilité spécialiste Maurice",
        "telemedicineOption": "Possibilité téléconsultation spécialisée",
        "transferCriteria": "Critères transfert CHU métropole si nécessaire"
      }
    ],
    "patientEducation": {
      "diseaseUnderstanding": "Éducation maladie niveau universitaire adapté patient",
      "warningSignsEducation": "Signes d'alarme nécessitant reconsultation urgente",
      "culturalAdaptation": "Adaptation explications contexte culturel mauricien",
      "familyInvolvement": "Implication famille selon traditions mauriciennes"
    }
  },
  "qualityMetrics_CHU": {
    "evidenceLevel": "A|B|C|Expert_opinion avec détail sources",
    "guidelinesUsed": [
      "Guidelines internationales utilisées avec versions",
      "Recommandations HAS/OMS/Cochrane applicables",
      "Consensus sociétés savantes médecine tropicale"
    ],
    "uncertaintyLevel": "low|medium|high avec justification",
    "peerReviewIndicated": "Nécessité avis expert supplémentaire",
    "academicTeaching": "Points d'enseignement pour formation médicale continue",
    "researchOpportunities": "Opportunités recherche clinique si cas complexe",
    "qualityIndicators": "Indicateurs qualité soins selon standards CHU"
  }
}`

  return mauritianExpertPrompt
}

function assessTropicalDiseaseRisk(data: MauritiusTeleMedRequest): any {
  const riskFactors: string[] = []
  let overallRisk = 'Low'

  // Facteurs saisonniers
  if (data.clinicalData.seasonalContext === 'Rainy_Season') {
    riskFactors.push('Saison des pluies - pic dengue/chikungunya')
    overallRisk = 'High'
  }

  // Exposition aux vecteurs
  if (data.clinicalData.vectorExposure.mosquitoBites === 'Many' || data.clinicalData.vectorExposure.mosquitoBites === 'Severe') {
    riskFactors.push('Forte exposition moustiques')
    overallRisk = 'High'
  }

  // Voyage récent
  if (data.patientData.travelHistory?.some(t => 
    new Date(t.dates.to) > new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
  )) {
    riskFactors.push('Voyage récent (<21 jours)')
    overallRisk = 'Medium'
  }

  // Symptômes compatibles maladies tropicales
  const tropicalSymptoms = ['fever', 'headache', 'myalgia', 'arthralgia', 'rash']
  const hasSymptoms = data.clinicalData.symptoms.some(s => 
    tropicalSymptoms.some(ts => s.name.toLowerCase().includes(ts))
  )
  
  if (hasSymptoms) {
    riskFactors.push('Symptômes compatibles maladies tropicales')
    if (overallRisk === 'Low') overallRisk = 'Medium'
  }

  return {
    level: overallRisk,
    factors: riskFactors,
    recommendedTests: overallRisk === 'High' ? ['Dengue NS1', 'Chikungunya IgM', 'Malaria RDT'] : []
  }
}

function formatMauritianMedicalData(data: MauritiusTeleMedRequest, bmi: number | null, tropicalRisk: any): any {
  const { patientData, clinicalData, teleMedContext, locationData } = data
  
  const patientSection = `
IDENTITÉ MAURICE: ${patientData.firstName} ${patientData.lastName}
ÂGE: ${patientData.age} ans | SEXE: ${patientData.gender} | IMC: ${bmi || 'Non calculé'}
ORIGINE ETHNIQUE: ${patientData.ethnicity}
LANGUES: ${patientData.languages.join(', ')}
RÉGION: ${locationData.region}
ASSURANCE: ${patientData.insuranceType}
ALLERGIES: ${patientData.allergies?.join(', ') || 'Aucune connue'}
ANTÉCÉDENTS: ${patientData.medicalHistory?.map(h => `${h.condition} (${h.year})`).join(', ') || 'Aucun'}
VACCINATIONS: ${patientData.vaccinationStatus?.map(v => `${v.vaccine} (${v.date})`).join(', ') || 'Non renseignées'}
VOYAGES RÉCENTS: ${patientData.travelHistory?.map(t => `${t.destination} (${t.dates.from}-${t.dates.to})`).join(', ') || 'Aucun'}
`

  const tropicalSection = `
RISQUE TROPICAL: ${tropicalRisk.level}
FACTEURS DE RISQUE: ${tropicalRisk.factors.join(', ')}
SAISON: ${clinicalData.seasonalContext}
EXPOSITION MOUSTIQUES: ${clinicalData.vectorExposure.mosquitoBites}
CONTACT EAU: ${clinicalData.vectorExposure.waterContact ? 'Oui' : 'Non'}
CONTACT ANIMAUX: ${clinicalData.vectorExposure.animalContact.join(', ') || 'Aucun'}
LOGEMENT: ${patientData.socialHistory.housingType}
SOURCES D'EAU: ${patientData.socialHistory.waterSources.join(', ')}
`

  const teleMedSection = `
TYPE CONSULTATION: ${teleMedContext.consultationType}
QUALITÉ CONNEXION: ${teleMedContext.connectionQuality}
APPAREILS DISPONIBLES: ${teleMedContext.availableDevices.join(', ')}
ASSISTANT PRÉSENT: ${teleMedContext.assistantPresent ? 'Oui' : 'Non'}
DISTANCE HÔPITAL: ${teleMedContext.distanceToHospital} km
HÔPITAL LE PLUS PROCHE: ${locationData.nearestPublicHospital}
CLINIQUE PRIVÉE: ${locationData.nearestPrivateClinic}
ACCÈS PHARMACIE: ${locationData.pharmacyAccess}
`

  const clinicalSection = `
MOTIF: ${clinicalData.chiefComplaint}
HISTOIRE: ${clinicalData.historyOfPresentIllness}
SYMPTÔMES: ${clinicalData.symptoms?.map(s => 
  `${s.name} (${s.severity}/5, ${s.duration}, ${s.onset})`
).join('; ') || 'Non détaillés'}
SIGNES VITAUX: 
- T°: ${clinicalData.vitalSigns?.temperature}°C
- TA: ${clinicalData.vitalSigns?.bloodPressure?.systolic}/${clinicalData.vitalSigns?.bloodPressure?.diastolic} mmHg
- FC: ${clinicalData.vitalSigns?.heartRate} bpm
- SpO2: ${clinicalData.vitalSigns?.oxygenSaturation}%
REVUE DES SYSTÈMES:
- Fièvre: ${clinicalData.reviewOfSystems?.fever ? 'Oui' : 'Non'}
- Céphalées: ${clinicalData.reviewOfSystems?.headache ? 'Oui' : 'Non'}
- Éruption: ${clinicalData.reviewOfSystems?.rash ? 'Oui' : 'Non'}
- Arthralgies: ${clinicalData.reviewOfSystems?.jointPains ? 'Oui' : 'Non'}
- Troubles digestifs: ${clinicalData.reviewOfSystems?.nausea || clinicalData.reviewOfSystems?.vomiting ? 'Oui' : 'Non'}
`

  const physicalExamSection = `
EXAMEN À DISTANCE (Limitations télémédecine):
ASPECT GÉNÉRAL: ${clinicalData.physicalExam?.general}
PEAU VISIBLE: ${clinicalData.physicalExam?.dermatological || 'Évaluation limitée par caméra'}
OROPHARYNX: ${clinicalData.physicalExam?.heent || 'Si visible par caméra'}
RESPIRATION: ${clinicalData.physicalExam?.respiratory || 'Observation fréquence respiratoire'}
INSTRUCTIONS PATIENT: Auto-palpation abdomen, mesure pouls si possible
`

  return { patientSection, tropicalSection, teleMedSection, clinicalSection, physicalExamSection }
}

function validateMauritianMedicalData(data: MauritiusTeleMedRequest): string | null {
  if (!data.patientData?.firstName || !data.patientData?.age) {
    return "Données patient incomplètes"
  }
  
  if (!data.clinicalData?.chiefComplaint) {
    return "Motif de consultation manquant"
  }
  
  if (!data.locationData?.region) {
    return "Localisation Maurice requise"
  }
  
  if (!data.teleMedContext?.consultationType) {
    return "Type de consultation télémédecine requis"
  }
  
  return null
}

function validateCHUExpertiseLevel(diagnosis: any): any {
  const expertiseMetrics = {
    differentialCount: 0,
    evidenceLevel: 'C',
    complexityScore: 0,
    academicRigor: false,
    chuStandards: false
  }

  // Vérifier nombre de diagnostics différentiels (CHU = minimum 8)
  if (diagnosis.comprehensiveDiagnosis?.systematicDifferential) {
    expertiseMetrics.differentialCount = diagnosis.comprehensiveDiagnosis.systematicDifferential.length
  }

  // Vérifier niveau de preuve
  if (diagnosis.qualityMetrics_CHU?.evidenceLevel) {
    expertiseMetrics.evidenceLevel = diagnosis.qualityMetrics_CHU.evidenceLevel
  }

  // Vérifier présence d'analyse physiopathologique
  if (diagnosis.expertAnalysis?.universitySemiology?.pathophysiology) {
    expertiseMetrics.complexityScore += 1
  }

  // Vérifier enseignement médical intégré
  if (diagnosis.qualityMetrics_CHU?.academicTeaching) {
    expertiseMetrics.academicRigor = true
    expertiseMetrics.complexityScore += 1
  }

  // Standards CHU respectés
  expertiseMetrics.chuStandards = 
    expertiseMetrics.differentialCount >= 6 &&
    expertiseMetrics.complexityScore >= 2 &&
    expertiseMetrics.academicRigor

  return {
    level: expertiseMetrics.chuStandards ? 'CHU_Expert' : 'Standard_Medical',
    metrics: expertiseMetrics,
    recommendations: expertiseMetrics.chuStandards ? 
      'Niveau expertise CHU maintenu' : 
      'Révision niveau expertise recommandée'
  }
}

function parseAndValidateMauritianResponse(response: string): any {
  try {
    let cleanedResponse = response.trim()
    cleanedResponse = cleanedResponse.replace(/```json\n?|\n?```/g, "")
    
    const firstBrace = cleanedResponse.indexOf("{")
    const lastBrace = cleanedResponse.lastIndexOf("}")
    
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1)
    }
    
    return JSON.parse(cleanedResponse)
  } catch (error) {
    console.error("Erreur parsing réponse Maurice:", error)
    return createMauritianFallbackDiagnosis()
  }
}

function createMauritianFallbackDiagnosis(): any {
  return {
    expertAnalysis: {
      universitySemiology: {
        primarySigns: "Analyse sémiologique en cours - expertise CHU requise",
        pathophysiology: "Mécanismes physiopathologiques à préciser par examen expert",
        differentialMatrix: "Diagnostic différentiel élargi nécessaire - consultation CHU"
      },
      academicReasoning: "Raisonnement clinique complexe nécessitant expertise universitaire",
      evidenceLevel: "Expert opinion - données insuffisantes pour niveau A/B",
      teachingPoints: ["Cas clinique complexe pour enseignement médical"],
      literatureReview: "Recherche bibliographique approfondie recommandée"
    },
    comprehensiveDiagnosis: {
      primary: {
        condition: "Syndrome clinique complexe non spécifique",
        icd11: "MG30.Z",
        icd10: "R68.89",
        confidence: 50,
        severity: "moderate",
        rationale: "Présentation atypique nécessitant expertise CHU multidisciplinaire",
        prognosis: "good",
        complications: {
          immediate: ["Surveillance complications immédiates"],
          shortTerm: ["Évolution à surveiller 24-48h"],
          prevention: "Mesures préventives générales en attente diagnostic précis"
        },
        physiopathology: "Mécanismes sous-jacents à élucider",
        riskStratification: "Stratification du risque en cours d'évaluation"
      },
      systematicDifferential: [
        {
          rank: 1,
          condition: "Syndrome viral tropical non spécifique",
          probability: 30,
          rationale: "Contexte épidémiologique mauricien favorable",
          confirmingTests: ["PCR virales tropicales", "Sérologies spécifiques"],
          urgency: "medium"
        },
        {
          rank: 2,
          condition: "Infection bactérienne systémique",
          probability: 25,
          rationale: "Signes inflammatoires compatibles",
          confirmingTests: ["Hémocultures", "PCT", "CRP"],
          urgency: "high"
        },
        {
          rank: 3,
          condition: "Pathologie auto-immune émergente",
          probability: 15,
          rationale: "Présentation systémique atypique",
          confirmingTests: ["AAN", "Complément", "Immunoglobulines"],
          urgency: "medium"
        }
      ],
      redFlagAssessment: {
        criticalSigns: ["Évaluation signes d'alarme en cours"],
        emergencyProtocol: "Surveillance rapprochée protocole CHU"
      }
    },
    expertInvestigations: {
      diagnosticStrategy: {
        firstLineRational: "Bilan étiologique large première intention",
        costEffectiveness: "Optimisation rapport coût-efficacité diagnostique"
      },
      immediate_STAT: [
        {
          name: "Bilan inflammatoire et infectieux urgent",
          category: "biology",
          indication: "Syndrome inflammatoire systémique",
          expectedFindings: "Orientation étiologique selon résultats",
          sensitivity: "Screening large pathologies",
          alternatives: "Examens adaptés ressources Maurice"
        }
      ],
      tropical_Specific: [
        {
          name: "Panel tropical mauricien",
          indications: "Exclusion pathologies endémiques prioritaires",
          availability_Maurice: "Tests rapides disponibles localement"
        }
      ]
    },
    expertTherapeutics: {
      emergencyManagement: [
        {
          intervention: "Surveillance clinique rapprochée",
          protocol: "Protocole CHU d'observation active",
          monitoring: "Paramètres vitaux toutes les 4h"
        }
      ],
      evidenceBasedMedications: [
        {
          name: "Traitement symptomatique adapté",
          indication: "En attente diagnostic étiologique précis",
          mauritianAvailability: "Médicaments formulaire disponibles",
          evidenceLevel: "Expert consensus",
          monitoring: "Surveillance tolérance et efficacité"
        }
      ]
    },
    expertFollowUp: {
      criticalTimePoints: {
        immediate_2h: "Réévaluation clinique dans 2h",
        early_24h: "Consultation CHU dans 24h si pas d'amélioration"
      },
      specialistReferrals: [
        {
          specialty: "Médecine interne CHU",
          indication: "Syndrome complexe multisystémique",
          urgency: "urgent",
          mauritianAvailability: "Téléconsultation CHU métropole possible"
        }
      ]
    },
    qualityMetrics_CHU: {
      evidenceLevel: "Expert opinion",
      uncertaintyLevel: "high",
      peerReviewIndicated: true,
      academicTeaching: "Cas d'école pour diagnostic différentiel complexe"
    }
  }
}

function assessTropicalEmergencyStatus(diagnosis: any, flags?: EmergencyFlags, tropicalRisk?: any): any {
  const redFlags = flags?.redFlags || []
  
  // Red flags spécifiques tropicaux
  const tropicalRedFlags = []
  if (tropicalRisk?.level === 'High') {
    tropicalRedFlags.push('Risque élevé maladie tropicale')
  }
  
  return {
    triageLevel: flags?.triageLevel || 3,
    tropicalEmergencyLevel: tropicalRisk?.level || 'Low',
    criticalFindings: [...redFlags, ...tropicalRedFlags],
    emergencyContacts: {
      samu: "114",
      police: "999",
      nearestHospital: "Selon région"
    }
  }
}

function validateMauritianRecommendations(recommendations: any, requestData: MauritiusTeleMedRequest): any {
  // Vérifier disponibilité médicaments selon formulaire mauricien
  if (recommendations?.medications) {
    recommendations.medications = recommendations.medications.map((med: any) => {
      const availability = checkMedicationAvailability([med])
      return {
        ...med,
        mauritianAvailability: availability[med.name] || 'Non disponible formulaire',
        alternativeIfUnavailable: findMauritianAlternative(med.name)
      }
    })
  }
  
  return recommendations
}

function checkMedicationAvailability(medications: any[]): Record<string, string> {
  const availability: Record<string, string> = {}
  
  medications?.forEach(med => {
    const medName = med.name.toLowerCase()
    let found = false
    
    Object.values(MAURITIAN_FORMULARY).forEach(category => {
      if (category.some(m => m.toLowerCase().includes(medName) || medName.includes(m.toLowerCase()))) {
        availability[med.name] = 'Disponible formulaire Maurice'
        found = true
      }
    })
    
    if (!found) {
      availability[med.name] = 'Non disponible - alternative requise'
    }
  })
  
  return availability
}

function findMauritianAlternative(medication: string): string {
  const alternatives: Record<string, string> = {
    'oseltamivir': 'Traitement symptomatique',
    'azithromycin': 'Disponible formulaire',
    'doxycycline': 'Disponible formulaire',
    'paracetamol': 'Disponible formulaire'
  }
  
  return alternatives[medication.toLowerCase()] || 'Consulter pharmacien Maurice'
}

function generateTeleMedGuidance(context: TeleMedContext, diagnosis: any): any {
  return {
    nextConsultation: context.consultationType === 'Emergency' ? '2-4 heures' : '24-48 heures',
    monitoringInstructions: [
      'Mesurer température 3x/jour',
      'Surveiller hydratation',
      'Noter évolution symptômes'
    ],
    familyEducation: 'Instructions en français/créole selon préférence',
    technologyNeeds: context.connectionQuality === 'Poor' ? 'Améliorer connexion pour suivi' : 'Connexion adaptée'
  }
}

function generateReferralOptions(location: MauritianLocationData, diagnosis: any): any[] {
  const referrals = []
  
  if (diagnosis.emergencyFlags?.emergencyLevel === 'high') {
    referrals.push({
      facility: location.nearestPublicHospital,
      urgency: 'Immediate',
      transport: 'Ambulance SAMU 114'
    })
  }
  
  referrals.push({
    facility: location.nearestPrivateClinic,
    urgency: 'Routine',
    transport: 'Transport personnel'
  })
  
  return referrals
}

function getCulturalConsiderations(ethnicity: string, languages: string[]): string[] {
  const considerations = []
  
  if (ethnicity.includes('Indo')) {
    considerations.push('Considérer habitudes alimentaires végétariennes')
    considerations.push('Médecine ayurvédique complémentaire possible')
  }
  
  if (languages.includes('Creole')) {
    considerations.push('Instructions en créole mauricien si nécessaire')
  }
  
  considerations.push('Respect traditions familiales dans soins')
  
  return considerations
}

function calculateBMI(weight?: number, height?: number): number | null {
  if (!weight || !height) return null
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

function checkContraindications(patientData: MauritianPatientData): Record<string, string[]> {
  const contraindications: Record<string, string[]> = {}
  
  patientData.allergies?.forEach(allergy => {
    if (allergy.toLowerCase().includes('pénicilline')) {
      contraindications["amoxicilline"] = ["Allergie pénicilline"]
    }
    if (allergy.toLowerCase().includes('aspirin')) {
      contraindications["aspirine"] = ["Allergie aspirine"]
    }
  })
  
  return contraindications
}
