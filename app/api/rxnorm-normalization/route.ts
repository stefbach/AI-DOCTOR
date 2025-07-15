import { type NextRequest, NextResponse } from "next/server"

// Base de données locale simplifiée pour la normalisation RxNorm
const RXNORM_DATABASE = {
  // Médicaments cardiovasculaires
  aspirine: {
    rxcui: "1191",
    tty: "IN",
    name: "Aspirin",
    synonym: "Acetylsalicylic acid",
  },
  "acetylsalicylic acid": {
    rxcui: "1191",
    tty: "IN",
    name: "Aspirin",
    synonym: "Acetylsalicylic acid",
  },
  clopidogrel: {
    rxcui: "32968",
    tty: "IN",
    name: "Clopidogrel",
    synonym: "Clopidogrel bisulfate",
  },
  metoprolol: {
    rxcui: "6918",
    tty: "IN",
    name: "Metoprolol",
    synonym: "Metoprolol tartrate",
  },
  atorvastatine: {
    rxcui: "83367",
    tty: "IN",
    name: "Atorvastatin",
    synonym: "Atorvastatin calcium",
  },

  // Antibiotiques
  amoxicilline: {
    rxcui: "723",
    tty: "IN",
    name: "Amoxicillin",
    synonym: "Amoxicillin trihydrate",
  },
  amoxicillin: {
    rxcui: "723",
    tty: "IN",
    name: "Amoxicillin",
    synonym: "Amoxicillin trihydrate",
  },
  azithromycine: {
    rxcui: "18631",
    tty: "IN",
    name: "Azithromycin",
    synonym: "Azithromycin dihydrate",
  },

  // Antidiabétiques
  metformine: {
    rxcui: "6809",
    tty: "IN",
    name: "Metformin",
    synonym: "Metformin hydrochloride",
  },
  metformin: {
    rxcui: "6809",
    tty: "IN",
    name: "Metformin",
    synonym: "Metformin hydrochloride",
  },
  insuline: {
    rxcui: "5856",
    tty: "IN",
    name: "Insulin",
    synonym: "Human insulin",
  },

  // Bronchodilatateurs
  salbutamol: {
    rxcui: "9332",
    tty: "IN",
    name: "Salbutamol",
    synonym: "Salbutamol sulfate",
  },
  albuterol: {
    rxcui: "9332",
    tty: "IN",
    name: "Salbutamol",
    synonym: "Salbutamol sulfate",
  },

  // Analgésiques
  paracetamol: {
    rxcui: "161",
    tty: "IN",
    name: "Acetaminophen",
    synonym: "Paracetamol",
  },
  acetaminophen: {
    rxcui: "161",
    tty: "IN",
    name: "Acetaminophen",
    synonym: "Paracetamol",
  },
  ibuprofen: {
    rxcui: "5640",
    tty: "IN",
    name: "Ibuprofen",
    synonym: "Ibuprofen",
  },
  ibuprofene: {
    rxcui: "5640",
    tty: "IN",
    name: "Ibuprofen",
    synonym: "Ibuprofen",
  },

  // Neurologie
  sumatriptan: {
    rxcui: "37617",
    tty: "IN",
    name: "Sumatriptan",
    synonym: "Sumatriptan succinate",
  },

  // Psychiatrie
  sertraline: {
    rxcui: "36437",
    tty: "IN",
    name: "Sertraline",
    synonym: "Sertraline hydrochloride",
  },

  // Gastro-entérologie
  omeprazole: {
    rxcui: "7646",
    tty: "IN",
    name: "Omeprazole",
    synonym: "Omeprazole",
  },
  omeprazole: {
    rxcui: "7646",
    tty: "IN",
    name: "Omeprazole",
    synonym: "Omeprazole",
  },

  // Urologie
  fosfomycine: {
    rxcui: "4316",
    tty: "IN",
    name: "Fosfomycin",
    synonym: "Fosfomycin tromethamine",
  },
}

export async function POST(request: NextRequest) {
  try {
    const { term } = await request.json()

    console.log("🔍 RxNorm Normalization - Terme:", term)

    if (!term) {
      return NextResponse.json({
        success: false,
        error: "Terme de recherche requis",
      })
    }

    // Normalisation du terme de recherche
    const normalizedTerm = term.toLowerCase().trim()

    // Recherche dans la base de données locale
    const results = []

    // Recherche exacte
    if (RXNORM_DATABASE[normalizedTerm]) {
      results.push(RXNORM_DATABASE[normalizedTerm])
    }

    // Recherche approximative si pas de résultat exact
    if (results.length === 0) {
      for (const [key, data] of Object.entries(RXNORM_DATABASE)) {
        if (
          key.includes(normalizedTerm) ||
          normalizedTerm.includes(key) ||
          data.name.toLowerCase().includes(normalizedTerm) ||
          data.synonym.toLowerCase().includes(normalizedTerm)
        ) {
          results.push(data)
        }
      }
    }

    // Fallback si aucun résultat
    if (results.length === 0) {
      results.push({
        rxcui: "unknown",
        tty: "IN",
        name: term,
        synonym: term,
      })
    }

    const response = {
      success: true,
      data: {
        approximateGroup: {
          inputTerm: term,
          comment: "Normalisation RxNorm locale",
          candidate: results.map((result) => ({
            rxcui: result.rxcui,
            rxaui: `A${result.rxcui}`,
            score: result.rxcui !== "unknown" ? "100" : "50",
            rank: "1",
          })),
        },
        concepts: results.map((result) => ({
          rxcui: result.rxcui,
          name: result.name,
          synonym: result.synonym,
          tty: result.tty,
          language: "ENG",
          suppress: "N",
        })),
      },
      metadata: {
        source: "Local RxNorm Database",
        version: "1.0",
        lastUpdated: new Date().toISOString(),
        totalResults: results.length,
      },
    }

    console.log("✅ RxNorm normalisé:", results.length, "résultats")
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur RxNorm Normalization:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la normalisation RxNorm",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
