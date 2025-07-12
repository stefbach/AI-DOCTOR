import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { medications } = body

    // Simulation des données FDA pour la démonstration
    const mockFDAData = medications.map((drugName: string) => ({
      drugName: drugName,
      activeIngredient: getActiveIngredient(drugName),
      interactions: getDrugInteractions(drugName),
      contraindications: getContraindications(drugName),
      warnings: getWarnings(drugName),
      fdaApproved: true,
    }))

    return NextResponse.json(mockFDAData)
  } catch (error) {
    console.error("Erreur FDA API:", error)
    return NextResponse.json({ error: "Erreur lors de la vérification FDA" }, { status: 500 })
  }
}

function getActiveIngredient(drugName: string): string {
  const ingredients: { [key: string]: string } = {
    Paracétamol: "Acetaminophen",
    Ibuprofène: "Ibuprofen",
    Aspirine: "Acetylsalicylic acid",
    Amoxicilline: "Amoxicillin",
    Doliprane: "Acetaminophen",
    Advil: "Ibuprofen",
    Efferalgan: "Acetaminophen",
  }

  return ingredients[drugName] || drugName
}

function getDrugInteractions(drugName: string): Array<{
  drug: string
  severity: "major" | "moderate" | "minor"
  description: string
}> {
  const interactions: { [key: string]: any[] } = {
    Paracétamol: [
      {
        drug: "Warfarine",
        severity: "moderate",
        description: "Risque d'augmentation de l'effet anticoagulant",
      },
      {
        drug: "Alcool",
        severity: "major",
        description: "Risque d'hépatotoxicité majoré",
      },
    ],
    Ibuprofène: [
      {
        drug: "Aspirine",
        severity: "moderate",
        description: "Risque d'ulcération gastro-intestinale",
      },
      {
        drug: "Warfarine",
        severity: "major",
        description: "Risque hémorragique majoré",
      },
      {
        drug: "Méthotrexate",
        severity: "major",
        description: "Risque de toxicité du méthotrexate",
      },
    ],
    Aspirine: [
      {
        drug: "Warfarine",
        severity: "major",
        description: "Risque hémorragique très élevé",
      },
      {
        drug: "Méthotrexate",
        severity: "major",
        description: "Risque de toxicité hématologique",
      },
    ],
  }

  return interactions[drugName] || []
}

function getContraindications(drugName: string): string[] {
  const contraindications: { [key: string]: string[] } = {
    Paracétamol: ["Insuffisance hépatique sévère", "Allergie au paracétamol", "Déficit en G6PD (fortes doses)"],
    Ibuprofène: [
      "Insuffisance rénale sévère",
      "Insuffisance cardiaque sévère",
      "Ulcère gastroduodénal évolutif",
      "Allergie aux AINS",
      "3ème trimestre de grossesse",
    ],
    Aspirine: [
      "Allergie aux salicylés",
      "Ulcère gastroduodénal",
      "Insuffisance rénale sévère",
      "Enfant < 16 ans (syndrome de Reye)",
      "3ème trimestre de grossesse",
    ],
  }

  return contraindications[drugName] || ["Allergie connue au médicament"]
}

function getWarnings(drugName: string): string[] {
  const warnings: { [key: string]: string[] } = {
    Paracétamol: [
      "Ne pas dépasser 4g/jour chez l'adulte",
      "Surveiller la fonction hépatique en cas d'usage prolongé",
      "Attention aux associations contenant du paracétamol",
    ],
    Ibuprofène: [
      "Prendre pendant les repas",
      "Surveiller la fonction rénale",
      "Arrêter en cas de signes digestifs",
      "Éviter l'exposition solaire prolongée",
    ],
    Aspirine: ["Risque hémorragique", "Surveiller les signes d'ulcération", "Interaction avec de nombreux médicaments"],
  }

  return warnings[drugName] || ["Respecter la posologie prescrite"]
}
