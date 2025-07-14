import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API RxNorm Normalization - Normalisation pharmaceutique avancée")

    const requestData = await request.json()
    console.log("📝 Données reçues:", JSON.stringify(requestData, null, 2))

    const { medication, context, searchDepth } = requestData

    if (!medication) {
      return NextResponse.json({ error: "Nom de médicament requis", success: false }, { status: 400 })
    }

    // Appel à l'API RxNorm de base
    const baseNormalization = await callRxNormAPI(medication)

    // Enrichissement avec données contextuelles
    const enrichedData = await enrichNormalizationData(baseNormalization, context)

    // Analyse des alternatives thérapeutiques
    const therapeuticAlternatives = await findTherapeuticAlternatives(baseNormalization, context)

    // Données spécifiques au contexte (Maurice, tropical, etc.)
    const contextualData = generateContextualData(baseNormalization, context)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        originalMedication: medication,
        normalizedMedication: {
          rxcui: baseNormalization.rxcui,
          internationalName: baseNormalization.name,
          synonyms: baseNormalization.synonym,
          classification: {
            atcCode: enrichedData.atcCode,
            therapeuticClass: enrichedData.therapeuticClass,
            pharmacologicClass: enrichedData.pharmacologicClass,
          },
          regulatory: {
            fdaApproved: enrichedData.fdaApproved,
            formularyStatus: enrichedData.formularyStatus,
            prescriptionStatus: enrichedData.prescriptionStatus,
          },
          dosageForms: enrichedData.dosageForms || [],
          strengths: enrichedData.strengths || [],
          evidenceLevel: enrichedData.evidenceLevel || "B",
        },
        therapeuticAlternatives: therapeuticAlternatives,
        contextualInformation: contextualData,
        clinicalGuidance: {
          indications: enrichedData.indications || [],
          contraindications: enrichedData.contraindications || [],
          monitoring: enrichedData.monitoring || [],
          interactions: enrichedData.interactions || [],
        },
      },
      metadata: {
        searchDepth: searchDepth || "comprehensive",
        confidence: calculateConfidence(baseNormalization, medication),
        lastUpdated: new Date().toISOString(),
      },
    }

    console.log("✅ Normalisation RxNorm complétée")
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur RxNorm Normalization:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la normalisation RxNorm",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

async function callRxNormAPI(medication: string): Promise<any> {
  try {
    const response = await fetch("/api/rxnorm-normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drugName: medication }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.normalized || data.data
    }
  } catch (error) {
    console.error("Erreur appel RxNorm de base:", error)
  }

  // Fallback local
  return {
    rxcui: "UNKNOWN",
    name: medication,
    synonym: [medication],
    tty: "UNKNOWN",
    suppress: "N",
    source: "Local fallback",
  }
}

async function enrichNormalizationData(baseData: any, context: any): Promise<any> {
  // Enrichissement avec données supplémentaires
  const enriched = {
    atcCode: null,
    therapeuticClass: "À déterminer",
    pharmacologicClass: "À déterminer",
    fdaApproved: false,
    formularyStatus: "Supplementary",
    prescriptionStatus: "Prescription",
    dosageForms: [],
    strengths: [],
    evidenceLevel: "B",
    indications: [],
    contraindications: [],
    monitoring: [],
    interactions: [],
  }

  // Logique d'enrichissement basée sur le nom du médicament
  const medicationLower = baseData.name.toLowerCase()

  if (medicationLower.includes("paracetamol") || medicationLower.includes("acetaminophen")) {
    enriched.atcCode = "N02BE01"
    enriched.therapeuticClass = "Analgésiques non narcotiques"
    enriched.pharmacologicClass = "Inhibiteur COX-3"
    enriched.fdaApproved = true
    enriched.formularyStatus = "Essential"
    enriched.prescriptionStatus = "OTC"
    enriched.indications = ["Douleur légère à modérée", "Fièvre"]
    enriched.contraindications = ["Insuffisance hépatique sévère"]
    enriched.monitoring = ["Fonction hépatique si usage prolongé"]
  }

  // Adaptation selon le contexte
  if (context?.region === "Maurice" || context?.region === "Tropical") {
    enriched.tropicalMedicine = {
      endemicRelevance: medicationLower.includes("artemether") || medicationLower.includes("doxycycline"),
      seasonalUsage: "Variable selon pathologie",
      vectorBorneIndication: medicationLower.includes("doxycycline"),
    }
  }

  return enriched
}

async function findTherapeuticAlternatives(baseData: any, context: any): Promise<any[]> {
  const alternatives: any[] = []

  // Logique de recherche d'alternatives basée sur la classe thérapeutique
  const medicationLower = baseData.name.toLowerCase()

  if (medicationLower.includes("paracetamol")) {
    alternatives.push({
      name: "Ibuprofène",
      rxcui: "5640",
      relationship: "Alternative thérapeutique",
      indication: "Si contre-indication au paracétamol",
      advantages: ["Anti-inflammatoire"],
      disadvantages: ["Risque gastro-intestinal"],
    })
  }

  if (medicationLower.includes("ibuprofen")) {
    alternatives.push({
      name: "Paracétamol",
      rxcui: "161",
      relationship: "Alternative plus sûre",
      indication: "Si contre-indication aux AINS",
      advantages: ["Meilleur profil de sécurité"],
      disadvantages: ["Pas d'effet anti-inflammatoire"],
    })
  }

  return alternatives
}

function generateContextualData(baseData: any, context: any): any {
  const contextualData: any = {
    availability: {
      global: true,
      regional: true,
      local: true,
    },
    cost: {
      category: "Low",
      insurance: "Covered",
      patientCost: "Minimal",
    },
    cultural: {
      acceptance: "High",
      traditionalAlternatives: [],
    },
  }

  // Adaptation selon le contexte géographique
  if (context?.region === "Maurice") {
    contextualData.mauritianSpecifics = {
      formularyStatus: "Essential",
      publicAvailability: true,
      importRequirements: false,
      localManufacturing: false,
      traditionalAlternatives: [],
    }
  }

  // Adaptation selon l'âge du patient
  if (context?.patientAge) {
    if (context.patientAge > 65) {
      contextualData.geriatricConsiderations = {
        doseAdjustment: "Recommended",
        monitoring: "Enhanced",
        alternatives: "Consider safer options",
      }
    }

    if (context.patientAge < 18) {
      contextualData.pediatricConsiderations = {
        approved: "Check pediatric indications",
        dosing: "Weight-based",
        formulations: "Pediatric formulations preferred",
      }
    }
  }

  return contextualData
}

function calculateConfidence(baseData: any, originalMedication: string): number {
  if (!baseData || baseData.rxcui === "UNKNOWN") {
    return 30
  }

  const original = originalMedication.toLowerCase()
  const normalized = baseData.name.toLowerCase()

  if (original === normalized) {
    return 100
  }

  if (baseData.synonym?.some((syn: string) => syn.toLowerCase() === original)) {
    return 95
  }

  if (
    baseData.synonym?.some(
      (syn: string) => syn.toLowerCase().includes(original) || original.includes(syn.toLowerCase()),
    )
  ) {
    return 80
  }

  return 60
}
