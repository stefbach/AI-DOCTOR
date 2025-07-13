import { type NextRequest, NextResponse } from "next/server"

// Types avancés pour normalisation CHU Maurice
interface MauritianRxNormResponse {
  // Standards internationaux
  rxcui: string
  atcCode?: string // Code ATC OMS
  icd11Code?: string // Classification ICD-11
  
  // Nomenclature standardisée
  internationalName: string // DCI (Dénomination Commune Internationale)
  rxNormName: string // Nom RxNorm standard
  synonym: string[]
  
  // Spécificités Maurice
  mauritianNames: {
    french: string[]
    english: string[]
    creole?: string[]
    commercial: string[] // Noms commerciaux Maurice
  }
  
  // Classification pharmaceutique
  pharmacology: {
    therapeuticClass: string
    pharmacologicClass: string
    mechanism: string
    indication: string[]
  }
  
  // Formes et dosages
  formulations: Array<{
    strength: string
    dosageForm: string
    route: string
    manufacturer?: string
    mauritianAvailability: boolean
  }>
  
  // Contexte réglementaire
  regulatory: {
    fdaApproved: boolean
    emaApproved: boolean
    mauritianApproved: boolean
    formularyStatus: 'Essential' | 'Supplementary' | 'Hospital_Only' | 'Import_Required'
    prescriptionStatus: 'OTC' | 'Prescription' | 'Hospital_Only' | 'Controlled'
  }
  
  // Spécificités tropicales
  tropicalMedicine: {
    vectorBorne: boolean
    tropicalIndication: string[]
    seasonalUsage?: string
    endemicRelevance: boolean
  }
  
  // Métadonnées
  source: string
  lastUpdated: string
  confidence: number // 0-100%
  expertValidation: boolean
  
  // Niveau expertise CHU
  chuClassification: {
    complexityLevel: 'Basic' | 'Intermediate' | 'Advanced' | 'Expert'
    specialtyRelevance: string[]
    universityTeaching: boolean
    researchIndications?: string[]
  }
}

interface NormalizationRequest {
  medication: string
  context?: {
    indication?: string
    patientAge?: number
    ethnicity?: string
    region?: string
    language?: 'french' | 'english' | 'creole'
  }
  searchDepth?: 'basic' | 'comprehensive' | 'expert'
}

// Base de données étendue CHU Maurice (Formulaire National + International)
const mauritianRxNormDatabase: Record<string, MauritianRxNormResponse> = {
  paracetamol: {
    rxcui: "161",
    atcCode: "N02BE01",
    icd11Code: "XM4PE2",
    internationalName: "Paracetamol",
    rxNormName: "Acetaminophen",
    synonym: ["Paracetamol", "APAP", "N-acetyl-p-aminophenol", "Acetaminophen"],
    mauritianNames: {
      french: ["Paracétamol", "Acétaminophène"],
      english: ["Acetaminophen", "Paracetamol"],
      creole: ["Panadol", "Medicament la fievre"],
      commercial: ["Panadol", "Doliprane", "Efferalgan", "Pharmadol Maurice"]
    },
    pharmacology: {
      therapeuticClass: "Analgésiques non narcotiques",
      pharmacologicClass: "Inhibiteur sélectif COX-3",
      mechanism: "Inhibition prostaglandines centrales + action hypothalamique",
      indication: ["Douleur légère à modérée", "Fièvre", "Céphalées", "Douleurs dentaires"]
    },
    formulations: [
      {
        strength: "500mg",
        dosageForm: "Comprimé",
        route: "Oral",
        manufacturer: "Pharma Maurice Ltd",
        mauritianAvailability: true
      },
      {
        strength: "1000mg",
        dosageForm: "Comprimé effervescent",
        route: "Oral",
        manufacturer: "Import France",
        mauritianAvailability: true
      },
      {
        strength: "120mg/5ml",
        dosageForm: "Sirop",
        route: "Oral",
        manufacturer: "Local Maurice",
        mauritianAvailability: true
      }
    ],
    regulatory: {
      fdaApproved: true,
      emaApproved: true,
      mauritianApproved: true,
      formularyStatus: 'Essential',
      prescriptionStatus: 'OTC'
    },
    tropicalMedicine: {
      vectorBorne: false,
      tropicalIndication: ["Fièvre dengue (symptomatic)", "Paludisme (antipyrétique adjuvant)"],
      seasonalUsage: "Pic utilisation saison chaude",
      endemicRelevance: true
    },
    source: "Formulaire National Maurice 2024 + RxNorm + OMS",
    lastUpdated: "2024-12-01",
    confidence: 95,
    expertValidation: true,
    chuClassification: {
      complexityLevel: 'Basic',
      specialtyRelevance: ["Médecine Générale", "Pédiatrie", "Médecine Tropicale"],
      universityTeaching: true,
      researchIndications: ["Sécurité pédiatrique", "Dosage ethnique spécifique"]
    }
  },

  doxycycline: {
    rxcui: "3247",
    atcCode: "J01AA02",
    icd11Code: "XM7RW3",
    internationalName: "Doxycycline",
    rxNormName: "Doxycycline",
    synonym: ["Doxycycline", "Doxycyclin", "Vibramycin"],
    mauritianNames: {
      french: ["Doxycycline", "Doxycyclin"],
      english: ["Doxycycline"],
      creole: ["Medicament moustique", "Pilule malaria"],
      commercial: ["Vibramycin", "Doxypalu", "Granudoxy"]
    },
    pharmacology: {
      therapeuticClass: "Antibiotiques tétracyclines",
      pharmacologicClass: "Inhibiteur synthèse protéique bactérienne",
      mechanism: "Liaison sous-unité 30S ribosome bactérien",
      indication: ["Paludisme prophylaxie", "Infections respiratoires", "IST", "Acné", "Infections cutanées tropicales"]
    },
    formulations: [
      {
        strength: "100mg",
        dosageForm: "Gélule",
        route: "Oral",
        manufacturer: "Import Inde",
        mauritianAvailability: true
      }
    ],
    regulatory: {
      fdaApproved: true,
      emaApproved: true,
      mauritianApproved: true,
      formularyStatus: 'Essential',
      prescriptionStatus: 'Prescription'
    },
    tropicalMedicine: {
      vectorBorne: true,
      tropicalIndication: ["Prophylaxie paludisme", "Rickettsioses", "Leptospirose", "Infections cutanées tropicales"],
      seasonalUsage: "Augmentation saison des pluies",
      endemicRelevance: true
    },
    source: "OMS Paludisme + CDC + Formulaire Maurice",
    lastUpdated: "2024-12-01",
    confidence: 98,
    expertValidation: true,
    chuClassification: {
      complexityLevel: 'Advanced',
      specialtyRelevance: ["Médecine Tropicale", "Infectiologie", "Médecine du Voyage"],
      universityTeaching: true,
      researchIndications: ["Résistance paludique Maurice", "Photosensibilité populations"]
    }
  },

  artemether_lumefantrine: {
    rxcui: "2057151",
    atcCode: "P01BF01",
    icd11Code: "XM8QZ1",
    internationalName: "Artemether + Lumefantrine",
    rxNormName: "Artemether/Lumefantrine",
    synonym: ["Coartem", "Riamet", "ALU", "ACT"],
    mauritianNames: {
      french: ["Artéméther-Luméfantrine", "Coartem"],
      english: ["Artemether-Lumefantrine"],
      creole: ["Medicament malaria", "Coartem"],
      commercial: ["Coartem", "Riamet"]
    },
    pharmacology: {
      therapeuticClass: "Antipaludiques - ACT",
      pharmacologicClass: "Artemisinine + Amino-alcool",
      mechanism: "Artémether: radicaux libres parasiticides + Luméfantrine: inhibition hémozoine",
      indication: ["Paludisme P. falciparum non compliqué", "Paludisme P. vivax"]
    },
    formulations: [
      {
        strength: "20mg/120mg",
        dosageForm: "Comprimé",
        route: "Oral",
        manufacturer: "Novartis (Import)",
        mauritianAvailability: true
      }
    ],
    regulatory: {
      fdaApproved: true,
      emaApproved: true,
      mauritianApproved: true,
      formularyStatus: 'Essential',
      prescriptionStatus: 'Hospital_Only'
    },
    tropicalMedicine: {
      vectorBorne: true,
      tropicalIndication: ["Paludisme P. falciparum", "Paludisme mixte"],
      seasonalUsage: "Disponibilité continue - urgence vitale",
      endemicRelevance: true
    },
    source: "OMS Malaria Treatment Guidelines 2023 + Programme National Antipaludique Maurice",
    lastUpdated: "2024-12-01",
    confidence: 100,
    expertValidation: true,
    chuClassification: {
      complexityLevel: 'Expert',
      specialtyRelevance: ["Médecine Tropicale", "Urgences", "Réanimation"],
      universityTeaching: true,
      researchIndications: ["Résistance artemisinine Maurice", "Efficacité populations locales"]
    }
  },

  enalapril: {
    rxcui: "3827",
    atcCode: "C09AA02",
    icd11Code: "XM95T4",
    internationalName: "Enalapril",
    rxNormName: "Enalapril",
    synonym: ["Enalapril", "Enalaprilat", "MK-421"],
    mauritianNames: {
      french: ["Énalapril", "Enalapril"],
      english: ["Enalapril"],
      creole: ["Medicament tension", "Pilule coeur"],
      commercial: ["Renitec", "Enaladex", "Enap"]
    },
    pharmacology: {
      therapeuticClass: "Inhibiteurs ECA",
      pharmacologicClass: "Inhibiteur enzyme conversion angiotensine",
      mechanism: "Inhibition conversion angiotensine I→II + dégradation bradykinine",
      indication: ["Hypertension artérielle", "Insuffisance cardiaque", "Protection rénale diabétique"]
    },
    formulations: [
      {
        strength: "5mg",
        dosageForm: "Comprimé",
        route: "Oral",
        manufacturer: "ABC Pharmaceuticals Maurice",
        mauritianAvailability: true
      },
      {
        strength: "10mg",
        dosageForm: "Comprimé",
        route: "Oral",
        manufacturer: "ABC Pharmaceuticals Maurice",
        mauritianAvailability: true
      }
    ],
    regulatory: {
      fdaApproved: true,
      emaApproved: true,
      mauritianApproved: true,
      formularyStatus: 'Essential',
      prescriptionStatus: 'Prescription'
    },
    tropicalMedicine: {
      vectorBorne: false,
      tropicalIndication: ["HTA tropicale", "Néphropathie diabétique", "Cardiopathie climatique"],
      seasonalUsage: "Surveillance renforcée saison chaude (déshydratation)",
      endemicRelevance: false
    },
    source: "ESC Guidelines 2023 + Programme National HTA Maurice",
    lastUpdated: "2024-12-01",
    confidence: 95,
    expertValidation: true,
    chuClassification: {
      complexityLevel: 'Intermediate',
      specialtyRelevance: ["Cardiologie", "Médecine Interne", "Néphrologie"],
      universityTeaching: true,
      researchIndications: ["Efficacité ethnies mauriciennes", "Adaptation climatique"]
    }
  },

  // Médicaments traditionnels mauriciens standardisés
  ayapana_extract: {
    rxcui: "MU001", // Code local Maurice
    atcCode: "V12", // Plantes médicinales
    internationalName: "Ayapana triplinervis extract",
    rxNormName: "Ayapana extract",
    synonym: ["Ayapana", "Thé de l'île", "Eupatorium triplinerve"],
    mauritianNames: {
      french: ["Ayapana", "Thé de l'île"],
      english: ["Ayapana tea"],
      creole: ["Ayapana", "Dite ayapana"],
      commercial: ["Thé Ayapana Maurice Bio"]
    },
    pharmacology: {
      therapeuticClass: "Plantes médicinales digestives",
      pharmacologicClass: "Anti-spasmodique naturel",
      mechanism: "Flavonoïdes + tanins anti-inflammatoires",
      indication: ["Troubles digestifs", "Diarrhées", "Crampes abdominales", "Nausées"]
    },
    formulations: [
      {
        strength: "Variable",
        dosageForm: "Tisane",
        route: "Oral",
        manufacturer: "Producteurs locaux Maurice",
        mauritianAvailability: true
      }
    ],
    regulatory: {
      fdaApproved: false,
      emaApproved: false,
      mauritianApproved: true,
      formularyStatus: 'Supplementary',
      prescriptionStatus: 'OTC'
    },
    tropicalMedicine: {
      vectorBorne: false,
      tropicalIndication: ["Gastroentérites tropicales", "Troubles digestifs climatiques"],
      seasonalUsage: "Utilisation accrue saison chaude",
      endemicRelevance: true
    },
    source: "Pharmacopée Traditionnelle Maurice + Recherches Université Maurice",
    lastUpdated: "2024-12-01",
    confidence: 75,
    expertValidation: true,
    chuClassification: {
      complexityLevel: 'Basic',
      specialtyRelevance: ["Médecine Traditionnelle", "Gastroentérologie"],
      universityTeaching: true,
      researchIndications: ["Validation scientifique", "Standardisation extraits"]
    }
  }
}

// Tables de correspondance linguistique
const mauritianLinguisticMapping = {
  creole_to_french: {
    "medicament la fievre": "paracétamol",
    "medicament tension": "enalapril",
    "medicament moustique": "doxycycline",
    "medicament malaria": "artemether_lumefantrine",
    "pilule diabete": "metformin",
    "ayapana": "ayapana_extract"
  },
  commercial_to_generic: {
    "panadol": "paracetamol",
    "doliprane": "paracetamol",
    "efferalgan": "paracetamol",
    "vibramycin": "doxycycline",
    "coartem": "artemether_lumefantrine",
    "renitec": "enalapril"
  }
}

// Aliases spécifiques contexte Maurice
const mauritianContextualAliases = {
  tropical: {
    "malaria": "artemether_lumefantrine",
    "dengue": "paracetamol",
    "chikungunya": "paracetamol",
    "gastro": "ayapana_extract"
  },
  seasonal: {
    rainy_season: ["artemether_lumefantrine", "doxycycline", "paracetamol"],
    hot_season: ["paracetamol", "oral_rehydration"],
    cyclone_season: ["emergency_medications"]
  }
}

export async function POST(req: NextRequest) {
  try {
    const requestData: NormalizationRequest = await req.json()
    
    if (!requestData.medication) {
      return NextResponse.json({ 
        error: "Nom de médicament requis" 
      }, { status: 400 })
    }

    console.log("🏥 Normalisation CHU Maurice pour:", requestData.medication)
    console.log("🌍 Contexte:", requestData.context)

    // Normalisation multi-étapes CHU
    const normalizationResult = await performCHUNormalization(
      requestData.medication,
      requestData.context,
      requestData.searchDepth || 'comprehensive'
    )

    // Enrichissement contextuel mauricien
    const mauritianEnrichment = await enrichWithMauritianContext(
      normalizationResult,
      requestData.context
    )

    // Validation niveau expertise CHU
    const chuValidation = validateCHUExpertise(mauritianEnrichment)

    // Recommandations d'usage contextuelles
    const usageRecommendations = generateUsageRecommendations(
      mauritianEnrichment,
      requestData.context
    )

    console.log("✅ Normalisation CHU complétée:", mauritianEnrichment.confidence + "%")

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        normalizedMedication: mauritianEnrichment,
        chuValidation,
        usageRecommendations,
        alternativeNames: generateAlternativeNames(requestData.medication),
        mauritianContext: {
          availability: mauritianEnrichment.regulatory.formularyStatus,
          localNames: mauritianEnrichment.mauritianNames,
          tropicalRelevance: mauritianEnrichment.tropicalMedicine.endemicRelevance
        }
      },
      metadata: {
        searchDepth: requestData.searchDepth,
        expertLevel: "CHU_Professor",
        mauritianFormularyVersion: "2024.12",
        confidence: mauritianEnrichment.confidence,
        sources: mauritianEnrichment.source.split(' + ')
      }
    })

  } catch (error: any) {
    console.error("❌ Erreur normalisation CHU:", error)
    
    // Fallback intelligent avec suggestions
    const fallbackSuggestions = generateFallbackSuggestions(requestData.medication)
    
    return NextResponse.json({
      error: "Erreur normalisation - suggestions disponibles",
      success: false,
      suggestions: fallbackSuggestions,
      fallbackAdvice: "Consulter pharmacien clinicien pour identification précise"
    }, { status: 500 })
  }
}

async function performCHUNormalization(
  medication: string, 
  context?: any,
  searchDepth: string = 'comprehensive'
): Promise<MauritianRxNormResponse> {
  
  // Préprocessing du terme de recherche
  const cleanedMedication = preprocessMedicationName(medication, context?.language)
  
  // Recherche directe
  let result = mauritianRxNormDatabase[cleanedMedication.toLowerCase()]
  
  if (!result) {
    // Recherche par synonymes
    result = findBySynonym(cleanedMedication)
  }
  
  if (!result) {
    // Recherche par noms commerciaux
    result = findByCommercialName(cleanedMedication)
  }
  
  if (!result) {
    // Recherche fuzzy avancée
    result = findByFuzzyMatching(cleanedMedication, searchDepth)
  }
  
  if (!result) {
    // Création entrée générique si searchDepth = 'expert'
    if (searchDepth === 'expert') {
      result = createGenericEntry(medication)
    } else {
      throw new Error(`Médicament non trouvé: ${medication}`)
    }
  }
  
  return result
}

function preprocessMedicationName(medication: string, language?: string): string {
  let cleaned = medication.toLowerCase().trim()
  
  // Suppression des dosages
  cleaned = cleaned.replace(/\d+\s*(mg|g|ml|l|%|ui|iu)\b/gi, '')
  
  // Suppression des formes
  cleaned = cleaned.replace(/\b(comprimé|gélule|sirop|injection|crème|pommade|gouttes)\b/gi, '')
  
  // Normalisation créole → français
  if (language === 'creole' || !language) {
    const creoleMapping = mauritianLinguisticMapping.creole_to_french[cleaned]
    if (creoleMapping) {
      cleaned = creoleMapping
    }
  }
  
  // Normalisation commercial → générique
  const commercialMapping = mauritianLinguisticMapping.commercial_to_generic[cleaned]
  if (commercialMapping) {
    cleaned = commercialMapping
  }
  
  return cleaned.trim()
}

function findBySynonym(medication: string): MauritianRxNormResponse | null {
  for (const entry of Object.values(mauritianRxNormDatabase)) {
    if (entry.synonym.some(syn => syn.toLowerCase() === medication.toLowerCase())) {
      return entry
    }
  }
  return null
}

function findByCommercialName(medication: string): MauritianRxNormResponse | null {
  for (const entry of Object.values(mauritianRxNormDatabase)) {
    const allCommercialNames = entry.mauritianNames.commercial.map(name => name.toLowerCase())
    if (allCommercialNames.includes(medication.toLowerCase())) {
      return entry
    }
  }
  return null
}

function findByFuzzyMatching(medication: string, searchDepth: string): MauritianRxNormResponse | null {
  if (searchDepth === 'basic') return null
  
  const threshold = searchDepth === 'expert' ? 0.7 : 0.8
  
  for (const [key, entry] of Object.entries(mauritianRxNormDatabase)) {
    // Comparaison avec le nom principal
    if (calculateSimilarity(medication, key) > threshold) {
      return entry
    }
    
    // Comparaison avec les synonymes
    for (const synonym of entry.synonym) {
      if (calculateSimilarity(medication, synonym) > threshold) {
        return entry
      }
    }
  }
  
  return null
}

function calculateSimilarity(str1: string, str2: string): number {
  // Implémentation Levenshtein distance optimisée
  const matrix = []
  const len1 = str1.length
  const len2 = str2.length

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return 1 - matrix[len2][len1] / Math.max(len1, len2)
}

function createGenericEntry(medication: string): MauritianRxNormResponse {
  return {
    rxcui: `UNKNOWN_${Date.now()}`,
    internationalName: medication,
    rxNormName: medication,
    synonym: [medication],
    mauritianNames: {
      french: [medication],
      english: [medication],
      commercial: []
    },
    pharmacology: {
      therapeuticClass: "Classification en cours",
      pharmacologicClass: "Mécanisme à déterminer",
      mechanism: "Non documenté",
      indication: ["Indication à préciser"]
    },
    formulations: [{
      strength: "Non spécifié",
      dosageForm: "Non spécifié",
      route: "Non spécifié",
      mauritianAvailability: false
    }],
    regulatory: {
      fdaApproved: false,
      emaApproved: false,
      mauritianApproved: false,
      formularyStatus: 'Import_Required',
      prescriptionStatus: 'Prescription'
    },
    tropicalMedicine: {
      vectorBorne: false,
      tropicalIndication: [],
      endemicRelevance: false
    },
    source: "Entrée générée - validation expert requise",
    lastUpdated: new Date().toISOString(),
    confidence: 25,
    expertValidation: false,
    chuClassification: {
      complexityLevel: 'Expert',
      specialtyRelevance: ["Expertise pharmacologique requise"],
      universityTeaching: false
    }
  }
}

async function enrichWithMauritianContext(
  medication: MauritianRxNormResponse,
  context?: any
): Promise<MauritianRxNormResponse> {
  
  let enriched = { ...medication }
  
  // Enrichissement selon indication
  if (context?.indication) {
    const indication = context.indication.toLowerCase()
    
    if (indication.includes('malaria') || indication.includes('paludisme')) {
      enriched.tropicalMedicine.seasonalUsage = "Surveillance accrue saison des pluies"
      enriched.tropicalMedicine.endemicRelevance = true
    }
    
    if (indication.includes('dengue') || indication.includes('chikungunya')) {
      enriched.tropicalMedicine.seasonalUsage = "Pic utilisation épidémies vectorielles"
    }
  }
  
  // Enrichissement selon âge patient
  if (context?.patientAge) {
    if (context.patientAge < 18) {
      // Ajouter considérations pédiatriques
      enriched.chuClassification.specialtyRelevance.push("Pédiatrie")
    } else if (context.patientAge >= 65) {
      // Ajouter considérations gériatriques  
      enriched.chuClassification.specialtyRelevance.push("Gériatrie")
    }
  }
  
  // Enrichissement selon région Maurice
  if (context?.region) {
    if (context.region === 'Rodrigues') {
      enriched.regulatory.formularyStatus = 'Import_Required'
      enriched.formulations.forEach(form => {
        form.mauritianAvailability = false
      })
    }
  }
  
  return enriched
}

function validateCHUExpertise(medication: MauritianRxNormResponse): any {
  const validation = {
    expertiseLevel: medication.chuClassification.complexityLevel,
    teachingValue: medication.chuClassification.universityTeaching,
    researchPotential: medication.chuClassification.researchIndications?.length > 0,
    clinicalComplexity: calculateClinicalComplexity(medication),
    mauritianRelevance: calculateMauritianRelevance(medication)
  }
  
  return {
    ...validation,
    overallCHUScore: calculateCHUScore(validation),
    recommendation: generateCHURecommendation(validation)
  }
}

function calculateClinicalComplexity(medication: MauritianRxNormResponse): number {
  let complexity = 0
  
  // Complexité pharmacologique
  if (medication.pharmacology.mechanism !== "Non documenté") complexity += 2
  if (medication.pharmacology.indication.length > 3) complexity += 1
  
  // Complexité réglementaire
  if (medication.regulatory.prescriptionStatus === 'Hospital_Only') complexity += 2
  if (medication.regulatory.formularyStatus === 'Import_Required') complexity += 1
  
  // Complexité tropicale
  if (medication.tropicalMedicine.vectorBorne) complexity += 2
  if (medication.tropicalMedicine.endemicRelevance) complexity += 1
  
  return Math.min(complexity, 10) // Score max 10
}

function calculateMauritianRelevance(medication: MauritianRxNormResponse): number {
  let relevance = 0
  
  // Disponibilité locale
  if (medication.regulatory.mauritianApproved) relevance += 3
  if (medication.formulations.some(f => f.mauritianAvailability)) relevance += 2
  
  // Pertinence tropicale
  if (medication.tropicalMedicine.endemicRelevance) relevance += 3
  if (medication.tropicalMedicine.vectorBorne) relevance += 2
  
  // Noms locaux
  if (medication.mauritianNames.creole && medication.mauritianNames.creole.length > 0) relevance += 1
  if (medication.mauritianNames.commercial.length > 0) relevance += 1
  
  return Math.min(relevance, 10)
}

function calculateCHUScore(validation: any): number {
  let score = 0
  
  const complexityWeights = { Basic: 1, Intermediate: 2, Advanced: 3, Expert: 4 }
  score += complexityWeights[validation.expertiseLevel] || 0
  
  if (validation.teachingValue) score += 2
  if (validation.researchPotential) score += 2
  
  score += validation.clinicalComplexity * 0.5
  score += validation.mauritianRelevance * 0.3
  
  return Math.round(score * 10) / 10
}

function generateCHURecommendation(validation: any): string {
  if (validation.overallCHUScore >= 8) {
    return "Médicament haute complexité - enseignement CHU avancé recommandé"
  } else if (validation.overallCHUScore >= 6) {
    return "Médicament complexité modérée - adapté formation médicale continue"
  } else if (validation.overallCHUScore >= 4) {
    return "Médicament complexité standard - formation généraliste suffisante"
  } else {
    return "Médicament simple - formation de base adequata"
  }
}

function generateUsageRecommendations(
  medication: MauritianRxNormResponse,
  context?: any
): any {
  const recommendations: any = {
    prescribing: [],
    monitoring: [],
    patient_education: [],
    mauritianSpecific: []
  }
  
  // Recommandations prescription
  if (medication.regulatory.prescriptionStatus === 'Hospital_Only') {
    recommendations.prescribing.push("Prescription hospitalière uniquement")
  }
  
  if (medication.tropicalMedicine.vectorBorne) {
    recommendations.prescribing.push("Considérer exposition vectorielle dans indication")
  }
  
  // Recommandations surveillance
  if (medication.chuClassification.complexityLevel === 'Expert') {
    recommendations.monitoring.push("Surveillance expert requise")
  }
  
  if (medication.tropicalMedicine.seasonalUsage) {
    recommendations.monitoring.push(medication.tropicalMedicine.seasonalUsage)
  }
  
  // Éducation patient
  if (medication.mauritianNames.creole && medication.mauritianNames.creole.length > 0) {
    recommendations.patient_education.push("Explication disponible en créole mauricien")
  }
  
  // Spécificités mauriciennes
  if (!medication.formulations.some(f => f.mauritianAvailability)) {
    recommendations.mauritianSpecific.push("Importation requise - prévoir délais")
  }
  
  if (medication.regulatory.formularyStatus === 'Essential') {
    recommendations.mauritianSpecific.push("Disponible secteur public Maurice")
  }
  
  return recommendations
}

function generateAlternativeNames(originalMedication: string): string[] {
  const alternatives: string[] = []
  
  // Recherche dans les synonymes de tous les médicaments
  for (const entry of Object.values(mauritianRxNormDatabase)) {
    if (entry.synonym.some(syn => 
      syn.toLowerCase().includes(originalMedication.toLowerCase()) ||
      originalMedication.toLowerCase().includes(syn.toLowerCase())
    )) {
      alternatives.push(...entry.synonym)
      alternatives.push(...entry.mauritianNames.french)
      alternatives.push(...entry.mauritianNames.commercial)
    }
  }
  
  // Supprimer doublons et retourner
  return [...new Set(alternatives)].filter(alt => 
    alt.toLowerCase() !== originalMedication.toLowerCase()
  )
}

function generateFallbackSuggestions(medication: string): string[] {
  const suggestions: string[] = []
  
  // Suggestions basées sur mots-clés
  const keywords = medication.toLowerCase().split(/\s+/)
  
  for (const keyword of keywords) {
    for (const [key, entry] of Object.entries(mauritianRxNormDatabase)) {
      if (key.includes(keyword) || 
          entry.synonym.some(syn => syn.toLowerCase().includes(keyword)) ||
          entry.mauritianNames.commercial.some(com => com.toLowerCase().includes(keyword))) {
        suggestions.push(entry.internationalName)
      }
    }
  }
  
  // Supprimer doublons et limiter à 5 suggestions
  return [...new Set(suggestions)].slice(0, 5)
}
