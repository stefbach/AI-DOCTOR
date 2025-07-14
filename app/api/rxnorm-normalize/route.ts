import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 RxNorm Normalize API - Début")

    let requestData: {
      medications?: string[]
      drugName?: string
    }

    try {
      requestData = await request.json()
      console.log("📝 Médicaments reçus RxNorm:", requestData.medications || requestData.drugName)
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON RxNorm:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { medications = [], drugName } = requestData

    // Normalisation des médicaments
    let drugList: string[] = []
    if (medications && Array.isArray(medications)) {
      drugList = medications.filter(Boolean)
    } else if (drugName && typeof drugName === "string") {
      drugList = [drugName]
    } else if (medications && typeof medications === "string") {
      drugList = [medications]
    }

    if (drugList.length === 0) {
      console.log("⚠️ Aucun médicament fourni")
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        normalizedDrugs: [],
        metadata: {
          totalDrugs: 0,
          source: "RxNorm NLM (simulé)",
          message: "Aucun médicament fourni",
        },
      })
    }

    console.log(`🔍 Normalisation RxNorm pour: ${drugList.join(", ")}`)

    // Normalisation RxNorm
    const normalizedDrugs = normalizeWithRxNorm(drugList)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      normalizedDrugs: normalizedDrugs,
      metadata: {
        totalDrugs: normalizedDrugs.length,
        searchedMedications: drugList,
        source: "RxNorm NLM (simulé)",
        searchDate: new Date().toISOString(),
        disclaimer: "Données simulées à des fins de démonstration",
      },
    }

    console.log(`✅ ${normalizedDrugs.length} médicaments RxNorm normalisés`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur RxNorm API:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la normalisation RxNorm",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function normalizeWithRxNorm(medications: string[]) {
  // Base de données RxNorm simulée avec codes RxCUI
  const rxnormDatabase = {
    // Antihypertenseurs
    amlodipine: {
      rxcui: "17767",
      name: "amlodipine",
      synonym: "Amlodipine",
      tty: "IN", // Ingredient
      brandNames: [
        { name: "Norvasc", rxcui: "308136" },
        { name: "Amlor", rxcui: "308137" },
      ],
      strength: ["2.5 MG", "5 MG", "10 MG"],
      doseForm: ["Oral Tablet"],
      route: ["Oral"],
      therapeuticClass: "Calcium Channel Blocker",
      pharmacologicClass: "Dihydropyridine",
    },
    lisinopril: {
      rxcui: "29046",
      name: "lisinopril",
      synonym: "Lisinopril",
      tty: "IN",
      brandNames: [
        { name: "Prinivil", rxcui: "104376" },
        { name: "Zestril", rxcui: "104377" },
      ],
      strength: ["2.5 MG", "5 MG", "10 MG", "20 MG", "40 MG"],
      doseForm: ["Oral Tablet"],
      route: ["Oral"],
      therapeuticClass: "ACE Inhibitor",
      pharmacologicClass: "Angiotensin Converting Enzyme Inhibitor",
    },

    // Antidiabétiques
    metformin: {
      rxcui: "6809",
      name: "metformin",
      synonym: "Metformin",
      tty: "IN",
      brandNames: [
        { name: "Glucophage", rxcui: "153821" },
        { name: "Stagid", rxcui: "153822" },
      ],
      strength: ["500 MG", "850 MG", "1000 MG"],
      doseForm: ["Oral Tablet", "Extended Release Oral Tablet"],
      route: ["Oral"],
      therapeuticClass: "Antidiabetic Agent",
      pharmacologicClass: "Biguanide",
    },

    // Antibiotiques
    amoxicillin: {
      rxcui: "723",
      name: "amoxicillin",
      synonym: "Amoxicillin",
      tty: "IN",
      brandNames: [
        { name: "Amoxil", rxcui: "308189" },
        { name: "Clamoxyl", rxcui: "308190" },
      ],
      strength: ["250 MG", "500 MG", "875 MG"],
      doseForm: ["Oral Capsule", "Oral Tablet", "Oral Suspension"],
      route: ["Oral"],
      therapeuticClass: "Antibiotic",
      pharmacologicClass: "Penicillin",
    },

    // Anti-inflammatoires
    ibuprofen: {
      rxcui: "5640",
      name: "ibuprofen",
      synonym: "Ibuprofen",
      tty: "IN",
      brandNames: [
        { name: "Advil", rxcui: "153165" },
        { name: "Nurofen", rxcui: "153166" },
        { name: "Brufen", rxcui: "153167" },
      ],
      strength: ["200 MG", "400 MG", "600 MG", "800 MG"],
      doseForm: ["Oral Tablet", "Oral Capsule", "Oral Suspension"],
      route: ["Oral"],
      therapeuticClass: "Anti-inflammatory Agent",
      pharmacologicClass: "Nonsteroidal Anti-inflammatory Drug",
    },

    // Statines
    atorvastatin: {
      rxcui: "83367",
      name: "atorvastatin",
      synonym: "Atorvastatin",
      tty: "IN",
      brandNames: [
        { name: "Lipitor", rxcui: "153842" },
        { name: "Tahor", rxcui: "153843" },
      ],
      strength: ["10 MG", "20 MG", "40 MG", "80 MG"],
      doseForm: ["Oral Tablet"],
      route: ["Oral"],
      therapeuticClass: "Antilipemic Agent",
      pharmacologicClass: "HMG-CoA Reductase Inhibitor",
    },

    // Antidépresseurs
    sertraline: {
      rxcui: "36437",
      name: "sertraline",
      synonym: "Sertraline",
      tty: "IN",
      brandNames: [
        { name: "Zoloft", rxcui: "104490" },
        { name: "Lustral", rxcui: "104491" },
      ],
      strength: ["25 MG", "50 MG", "100 MG"],
      doseForm: ["Oral Tablet", "Oral Concentrate"],
      route: ["Oral"],
      therapeuticClass: "Antidepressant",
      pharmacologicClass: "Selective Serotonin Reuptake Inhibitor",
    },

    // Anticoagulants
    warfarin: {
      rxcui: "11289",
      name: "warfarin",
      synonym: "Warfarin",
      tty: "IN",
      brandNames: [
        { name: "Coumadin", rxcui: "855288" },
        { name: "Warfilone", rxcui: "855289" },
      ],
      strength: ["1 MG", "2 MG", "2.5 MG", "3 MG", "4 MG", "5 MG", "6 MG", "7.5 MG", "10 MG"],
      doseForm: ["Oral Tablet"],
      route: ["Oral"],
      therapeuticClass: "Anticoagulant",
      pharmacologicClass: "Vitamin K Antagonist",
    },

    // Analgésiques
    acetaminophen: {
      rxcui: "161",
      name: "acetaminophen",
      synonym: "Acetaminophen",
      tty: "IN",
      brandNames: [
        { name: "Tylenol", rxcui: "209387" },
        { name: "Paracetamol", rxcui: "209388" },
      ],
      strength: ["325 MG", "500 MG", "650 MG"],
      doseForm: ["Oral Tablet", "Oral Capsule", "Oral Suspension"],
      route: ["Oral"],
      therapeuticClass: "Analgesic",
      pharmacologicClass: "Acetaminophen",
    },

    // Bronchodilatateurs
    albuterol: {
      rxcui: "435",
      name: "albuterol",
      synonym: "Albuterol",
      tty: "IN",
      brandNames: [
        { name: "Ventolin", rxcui: "745679" },
        { name: "ProAir", rxcui: "745680" },
      ],
      strength: ["90 MCG/ACTUAT", "108 MCG/ACTUAT"],
      doseForm: ["Metered Dose Inhaler", "Nebulization Solution"],
      route: ["Inhalation"],
      therapeuticClass: "Bronchodilator",
      pharmacologicClass: "Beta2 Agonist",
    },
  }

  const results = []

  for (const medication of medications) {
    const drugKey = medication.toLowerCase().trim()

    // Recherche exacte
    if (rxnormDatabase[drugKey]) {
      results.push({
        inputTerm: medication,
        found: true,
        normalized: true,
        ...rxnormDatabase[drugKey],
        lastUpdated: new Date().toISOString(),
        rxnormUrl: `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxnormDatabase[drugKey].rxcui}`,
      })
      continue
    }

    // Recherche partielle par nom générique ou commercial
    let found = false
    for (const [key, drugInfo] of Object.entries(rxnormDatabase)) {
      if (
        key.includes(drugKey) ||
        drugKey.includes(key) ||
        drugInfo.brandNames.some((brand) => brand.name.toLowerCase().includes(drugKey))
      ) {
        results.push({
          inputTerm: medication,
          found: true,
          normalized: true,
          matchType: "partial",
          ...drugInfo,
          lastUpdated: new Date().toISOString(),
          rxnormUrl: `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${drugInfo.rxcui}`,
        })
        found = true
        break
      }
    }

    // Si aucune correspondance trouvée
    if (!found) {
      results.push({
        inputTerm: medication,
        found: false,
        normalized: false,
        message: `Aucune normalisation RxNorm trouvée pour ${medication}`,
        suggestions: [
          "Vérifier l'orthographe du médicament",
          "Utiliser le nom générique (DCI)",
          "Consulter RxNav directement",
        ],
        rxnavSearchUrl: `https://mor.nlm.nih.gov/RxNav/search?searchBy=String&searchTerm=${encodeURIComponent(medication)}`,
      })
    }
  }

  return results
}
