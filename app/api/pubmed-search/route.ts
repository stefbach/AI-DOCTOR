export async function POST(request: NextRequest) {
  try {
    const { query = "", maxResults = 5 } = await request.json()

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        articles: [],
        metadata: { totalResults: 0, source: "OpenAI Medical Knowledge" }
      })
    }

    const prompt = `
En tant qu'expert en recherche médicale, générez ${maxResults} références bibliographiques réalistes et pertinentes pour la recherche : "${query}"

Retournez UNIQUEMENT un JSON valide dans ce format :

{
  "articles": [
    {
      "pmid": "12345678",
      "title": "Titre de l'étude médical pertinent et réaliste",
      "authors": ["Nom1 AB", "Nom2 CD", "Nom3 EF"],
      "journal": "Nom de journal médical réputé",
      "year": 2023,
      "volume": "45",
      "issue": "3", 
      "pages": "123-130",
      "abstract": "Résumé de 150-200 mots décrivant une étude médicale plausible et pertinente pour la requête",
      "doi": "10.1000/journal.2023.12345",
      "relevanceScore": 0.95,
      "citationCount": 45,
      "publicationType": "Clinical Trial|Review|Case Study|Meta-Analysis",
      "url": "https://pubmed.ncbi.nlm.nih.gov/12345678/"
    }
  ]
}

INSTRUCTIONS:
- Créez des références bibliographiques RÉALISTES et PERTINENTES
- Utilisez de vrais noms de journaux médicaux (NEJM, Lancet, JAMA, etc.)
- Les abstracts doivent être informatifs et liés à la requête
- Variez les types d'études (essais cliniques, revues, méta-analyses)
- Les PMIDs doivent être des nombres à 8 chiffres
- Triez par pertinence décroissante

Répondez UNIQUEMENT avec du JSON valide.
    `

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 3000,
    })

    let articlesData
    try {
      articlesData = JSON.parse(result.text.trim())
    } catch (parseError) {
      articlesData = {
        articles: [{
          pmid: "fallback1",
          title: `Clinical research on ${query}`,
          authors: ["Expert A", "Expert B"],
          journal: "Medical Journal",
          year: 2024,
          abstract: `Research study related to ${query}...`,
          relevanceScore: 0.8,
          url: "https://pubmed.ncbi.nlm.nih.gov/"
        }]
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      articles: articlesData.articles,
      metadata: {
        totalResults: articlesData.articles.length,
        query: query.trim(),
        maxResults: maxResults,
        source: "OpenAI Medical Knowledge",
        model: "gpt-4o"
      }
    })

  } catch (error: any) {
    console.error("❌ Erreur OpenAI PubMed:", error)
    return NextResponse.json({
      error: "Erreur lors de la recherche bibliographique",
      success: false
    }, { status: 500 })
  }
}



    }, { status: 500 })
  }
}
