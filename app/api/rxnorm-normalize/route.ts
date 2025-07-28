export async function POST(request: NextRequest) {
  try {
    const { drugName, dosage } = await request.json()

    if (!drugName) {
      return NextResponse.json({
        success: false,
        error: "Nom du médicament requis"
      })
    }

    const prompt = `
En tant qu'expert en pharmacologie, normalisez ce médicament selon les standards RxNorm : "${drugName}" ${dosage ? `dosage: ${dosage}` : ''}

Retournez UNIQUEMENT un JSON valide dans ce format :

{
  "rxcui": "123456",
  "name": "Nom standardisé du médicament",
  "genericName": "DCI (Dénomination Commune Internationale)",
  "brandNames": ["nom commercial 1", "nom commercial 2"],
  "dosageForms": ["tablet", "capsule", "injection"],
  "strengths": ["dose1", "dose2", "dose3"],
  "category": "classe thérapeutique",
  "indications": ["indication1", "indication2"],
  "contraindications": ["contre-indication1", "contre-indication2"],
  "interactions": ["interaction1", "interaction2"],
  "monitoring": ["paramètre à surveiller1", "paramètre2"],
  "normalizedForm": {
    "ingredient": "principe actif principal",
    "strength": "${dosage || 'dose standard'}",
    "doseForm": "tablet"
  },
  "safetyInfo": {
    "blackBoxWarning": false,
    "pregnancyCategory": "A/B/C/D/X",
    "controlledSubstance": false
  },
  "clinicalInfo": {
    "therapeuticClass": "classe thérapeutique détaillée",
    "mechanismOfAction": "mécanisme d'action principal",
    "pharmacokinetics": "absorption, distribution, métabolisme, élimination"
  }
}

INSTRUCTIONS:
- Utilisez vos connaissances pharmaceutiques les plus précises
- Le rxcui doit être un nombre réaliste
- Incluez toutes les informations de sécurité importantes
- Si le médicament n'est pas reconnu, utilisez rxcui: "unknown"

Répondez UNIQUEMENT avec du JSON valide.
    `

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.1,
      maxTokens: 2000,
    })

    let medicationData
    try {
      medicationData = JSON.parse(result.text.trim())
    } catch (parseError) {
      medicationData = {
        rxcui: "unknown",
        name: drugName,
        genericName: drugName,
        brandNames: [drugName],
        dosageForms: ["tablet"],
        strengths: [dosage || "dose standard"],
        category: "medication",
        normalizedForm: {
          ingredient: drugName,
          strength: dosage || "standard",
          doseForm: "tablet"
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: medicationData,
      metadata: {
        source: "OpenAI Medical Knowledge",
        model: "gpt-4o",
        lastUpdated: new Date().toISOString(),
        confidence: medicationData.rxcui !== "unknown" ? "high" : "medium"
      }
    })

  } catch (error: any) {
    console.error("❌ Erreur OpenAI RxNorm:", error)
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la normalisation",
      details: error.message
    }, { status: 500 })
  }
}
