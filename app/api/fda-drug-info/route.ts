import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { medications = [], drugName } = await request.json()
    
    let drugList: string[] = []
    if (medications && Array.isArray(medications)) {
      drugList = medications.filter(Boolean)
    } else if (drugName) {
      drugList = [drugName]
    }

    if (drugList.length === 0) {
      return NextResponse.json({
        success: true,
        drugs: [],
        metadata: { totalDrugs: 0, source: "OpenAI Medical Knowledge" }
      })
    }

    const prompt = `
En tant qu'expert pharmaceutique, fournissez des informations médicales complètes et précises pour ces médicaments : ${drugList.join(", ")}

Pour CHAQUE médicament, retournez UNIQUEMENT un JSON valide dans ce format exact :

{
  "drugs": [
    {
      "searchTerm": "nom du médicament recherché",
      "found": true,
      "genericName": "DCI (Dénomination Commune Internationale)",
      "brandNames": ["nom commercial 1", "nom commercial 2"],
      "drugClass": "classe thérapeutique",
      "indications": ["indication 1", "indication 2"],
      "contraindications": ["contre-indication 1", "contre-indication 2"],
      "sideEffects": ["effet secondaire 1", "effet secondaire 2"],
      "interactions": ["interaction 1", "interaction 2"],
      "dosage": "posologie standard",
      "warnings": ["avertissement 1", "avertissement 2"],
      "pregnancyCategory": "A/B/C/D/X",
      "lastUpdated": "${new Date().toISOString()}"
    }
  ]
}

IMPORTANT: 
- Répondez UNIQUEMENT avec du JSON valide
- Basez-vous sur vos connaissances médicales les plus récentes
- Incluez les informations de sécurité essentielles
- Si un médicament n'est pas reconnu, marquez "found": false

Ne jamais inclure de texte en dehors du JSON.
    `

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.1,
      maxTokens: 4000,
    })

    // Parser la réponse JSON
    let drugData
    try {
      drugData = JSON.parse(result.text.trim())
    } catch (parseError) {
      // Fallback si parsing échoue
      drugData = {
        drugs: drugList.map(drug => ({
          searchTerm: drug,
          found: false,
          genericName: drug,
          brandNames: [drug],
          drugClass: "À vérifier avec un professionnel",
          indications: ["Consulter la notice"],
          contraindications: ["Hypersensibilité"],
          sideEffects: ["Voir notice"],
          interactions: ["Consulter un pharmacien"],
          dosage: "Selon prescription",
          warnings: ["Lire attentivement la notice"],
          pregnancyCategory: "C",
          lastUpdated: new Date().toISOString()
        }))
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      drugs: drugData.drugs,
      medications: drugData.drugs, // Compatibilité
      metadata: {
        totalDrugs: drugData.drugs.length,
        source: "OpenAI Medical Knowledge",
        model: "gpt-4o",
        searchDate: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error("❌ Erreur OpenAI FDA:", error)
    return NextResponse.json({
      error: "Erreur lors de la recherche médicamenteuse",
      details: error.message,
      success: false
    }, { status: 500 })
  }
}
