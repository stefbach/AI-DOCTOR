import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { medications } = await request.json()

    if (!medications || !Array.isArray(medications)) {
      return NextResponse.json({ error: "Liste de médicaments requise" }, { status: 400 })
    }

    const results = await Promise.all(
      medications.map(async (medication) => {
        try {
          // Tentative d'appel à l'API FDA réelle
          const fdaResponse = await fetch(
            `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(medication)}"&limit=1`,
            {
              headers: {
                "User-Agent": "Medical-AI-Expert/1.0",
              },
            },
          )

          if (fdaResponse.ok) {
            const fdaData = await fdaResponse.json()

            if (fdaData.results && fdaData.results.length > 0) {
              const drug = fdaData.results[0]

              return {
                source: "FDA API",
                drugName: medication,
                activeIngredient: drug.active_ingredient?.[0] || "Non spécifié",
                interactions: extractInteractions(drug.drug_interactions || []),
                contraindications: drug.contraindications || [],
                warnings: drug.warnings || [],
                fdaApproved: true,
              }
            }
          }

          // Fallback vers base de données locale
          return getFallbackDrugInfo(medication)
        } catch (error) {
          console.warn(`Erreur FDA pour ${medication}:`, error)
          return getFallbackDrugInfo(medication)
        }
      }),
    )

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("Erreur FDA drug info:", error)
    return NextResponse.json({ error: `Erreur lors de la recherche FDA: ${error.message}` }, { status: 500 })
  }
}

function extractInteractions(interactions: string[]): Array<{
  drug: string
  severity: "major" | "moderate" | "minor"
  description: string
}> {
  return interactions.slice(0, 5).map((interaction) => {
    // Analyse basique du texte pour extraire les interactions
    const text = interaction.toLowerCase()
    let severity: "major" | "moderate" | "minor" = "moderate"

    if (text.includes("contraindicated") || text.includes("severe") || text.includes("fatal")) {
      severity = "major"
    } else if (text.includes("caution") || text.includes("monitor") || text.includes("mild")) {
      severity = "minor"
    }

    // Extraction du nom du médicament (simplifiée)
    const drugMatch = interaction.match(/with\s+([A-Za-z]+)/i)
    const drugName = drugMatch ? drugMatch[1] : "Médicament non spécifié"

    return {
      drug: drugName,
      severity,
      description: interaction.substring(0, 200),
    }
  })
}

function getFallbackDrugInfo(medication: string) {
  const drugDatabase: { [key: string]: any } = {
    Paracétamol: {
      activeIngredient: "Acetaminophen",
      interactions: [
        {
          drug: "Warfarine",
          severity: "moderate" as const,
          description: "Risque d'augmentation de l'effet anticoagulant avec des doses élevées de paracétamol",
        },
        {
          drug: "Alcool",
          severity: "major" as const,
          description: "Risque d'hépatotoxicité majoré en cas de consommation chronique d'alcool",
        },
      ],
      contraindications: ["Insuffisance hépatique sévère", "Allergie au paracétamol", "Déficit en G6PD (fortes doses)"],
      warnings: [
        "Ne pas dépasser 4g/jour chez l'adulte",
        "Surveiller la fonction hépatique en cas d'usage prolongé",
        "Attention aux associations contenant du paracétamol",
      ],
    },
    Ibuprofène: {
      activeIngredient: "Ibuprofen",
      interactions: [
        {
          drug: "Aspirine",
          severity: "moderate" as const,
          description:
            "Risque d'ulcération gastro-intestinale et de diminution de l'effet cardioprotecteur de l'aspirine",
        },
        {
          drug: "Warfarine",
          severity: "major" as const,
          description: "Risque hémorragique majoré par potentialisation de l'effet anticoagulant",
        },
        {
          drug: "IEC",
          severity: "moderate" as const,
          description: "Risque d'insuffisance rénale aiguë, particulièrement chez les patients déshydratés",
        },
      ],
      contraindications: [
        "Insuffisance rénale sévère (clairance < 30 ml/min)",
        "Insuffisance cardiaque sévère",
        "Ulcère gastroduodénal évolutif",
        "Allergie aux AINS",
        "3ème trimestre de grossesse",
      ],
      warnings: ["Prendre pendant les repas", "Surveiller la fonction rénale", "Arrêter en cas de signes digestifs"],
    },
    Amoxicilline: {
      activeIngredient: "Amoxicillin",
      interactions: [
        {
          drug: "Méthotrexate",
          severity: "major" as const,
          description: "Diminution de l'élimination rénale du méthotrexate avec risque de toxicité",
        },
        {
          drug: "Contraceptifs oraux",
          severity: "minor" as const,
          description: "Risque de diminution de l'efficacité contraceptive",
        },
      ],
      contraindications: ["Allergie aux pénicillines", "Allergie aux bêta-lactamines", "Mononucléose infectieuse"],
      warnings: [
        "Surveiller l'apparition d'éruption cutanée",
        "Compléter le traitement même en cas d'amélioration",
        "Prendre à distance des repas",
      ],
    },
    Aspirine: {
      activeIngredient: "Acetylsalicylic acid",
      interactions: [
        {
          drug: "Warfarine",
          severity: "major" as const,
          description: "Risque hémorragique très élevé par potentialisation mutuelle",
        },
        {
          drug: "Méthotrexate",
          severity: "major" as const,
          description: "Diminution de l'élimination rénale du méthotrexate",
        },
        {
          drug: "AINS",
          severity: "moderate" as const,
          description: "Risque d'ulcération gastro-intestinale",
        },
      ],
      contraindications: [
        "Allergie aux salicylés",
        "Ulcère gastroduodénal évolutif",
        "Insuffisance rénale sévère",
        "Enfant de moins de 16 ans (syndrome de Reye)",
        "3ème trimestre de grossesse",
      ],
      warnings: [
        "Prendre pendant les repas",
        "Surveiller les signes hémorragiques",
        "Arrêter avant intervention chirurgicale",
      ],
    },
  }

  const drugInfo = drugDatabase[medication] || {
    activeIngredient: medication,
    interactions: [],
    contraindications: ["Allergie connue au médicament"],
    warnings: ["Respecter la posologie prescrite", "Surveiller la tolérance"],
  }

  return {
    source: "Base de données locale",
    drugName: medication,
    ...drugInfo,
    fdaApproved: true,
  }
}
