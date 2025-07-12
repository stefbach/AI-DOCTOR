import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { drugName } = body

    // Simulation des données RxNorm pour la démonstration
    const mockRxNormData = {
      rxcui: generateRxCUI(drugName),
      name: drugName,
      synonym: getSynonyms(drugName),
      tty: "SCD", // Semantic Clinical Drug
      suppress: "N",
    }

    return NextResponse.json(mockRxNormData)
  } catch (error) {
    console.error("Erreur RxNorm API:", error)
    return NextResponse.json({ error: "Erreur lors de la normalisation RxNorm" }, { status: 500 })
  }
}

function generateRxCUI(drugName: string): string {
  // Simulation de RxCUI basée sur le nom du médicament
  const rxcuis: { [key: string]: string } = {
    Paracétamol: "161",
    Ibuprofène: "5640",
    Aspirine: "1191",
    Amoxicilline: "723",
    Doliprane: "161",
    Advil: "5640",
    Efferalgan: "161",
    Dafalgan: "161",
  }

  return rxcuis[drugName] || Math.floor(Math.random() * 10000).toString()
}

function getSynonyms(drugName: string): string[] {
  const synonyms: { [key: string]: string[] } = {
    Paracétamol: ["Acetaminophen", "Doliprane", "Efferalgan", "Dafalgan", "Tylenol"],
    Ibuprofène: ["Advil", "Nurofen", "Spedifen", "Ibuprofen"],
    Aspirine: ["Aspirin", "Kardegic", "Aspégic", "Acetylsalicylic acid"],
    Amoxicilline: ["Amoxicillin", "Clamoxyl", "Augmentin"],
    Doliprane: ["Paracétamol", "Acetaminophen", "Efferalgan"],
    Advil: ["Ibuprofène", "Ibuprofen", "Nurofen"],
  }

  return synonyms[drugName] || [drugName]
}
