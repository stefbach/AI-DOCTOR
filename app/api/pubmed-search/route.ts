import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { diagnosis, symptoms } = body

    // Simulation des données PubMed pour la démonstration
    const mockPubMedData = generateMockPubMedResults(diagnosis, symptoms)

    return NextResponse.json(mockPubMedData)
  } catch (error) {
    console.error("Erreur PubMed API:", error)
    return NextResponse.json({ error: "Erreur lors de la recherche PubMed" }, { status: 500 })
  }
}

function generateMockPubMedResults(diagnosis: string, symptoms: string[]): any[] {
  const currentYear = new Date().getFullYear()

  const mockArticles = [
    {
      pmid: "38234567",
      title: `Clinical Management of ${diagnosis}: A Systematic Review and Meta-Analysis`,
      authors: ["Smith J", "Johnson M", "Brown A", "Davis R"],
      journal: "New England Journal of Medicine",
      year: currentYear,
      abstract: `Background: ${diagnosis} represents a significant clinical challenge in modern medicine. This systematic review aims to evaluate current diagnostic and therapeutic approaches. Methods: We conducted a comprehensive search of medical databases from 2020 to ${currentYear}. Results: Analysis of 45 studies involving 12,847 patients showed improved outcomes with early diagnosis and appropriate treatment. Conclusions: Evidence-based management of ${diagnosis} significantly improves patient outcomes and reduces healthcare costs.`,
      relevanceScore: 92,
    },
    {
      pmid: "38234568",
      title: `Diagnostic Accuracy in ${diagnosis}: Machine Learning Approaches`,
      authors: ["Wilson K", "Taylor L", "Anderson P"],
      journal: "The Lancet Digital Health",
      year: currentYear - 1,
      abstract: `Artificial intelligence and machine learning algorithms show promising results in the diagnosis of ${diagnosis}. Our study of 8,432 patients demonstrates 94% accuracy in diagnostic prediction using clinical symptoms and laboratory data. These findings suggest significant potential for AI-assisted diagnosis in clinical practice.`,
      relevanceScore: 88,
    },
    {
      pmid: "38234569",
      title: `Treatment Guidelines for ${diagnosis}: International Consensus`,
      authors: ["Garcia M", "Lee S", "Patel N", "Kumar R", "Zhang W"],
      journal: "Journal of Clinical Medicine",
      year: currentYear,
      abstract: `International expert consensus on the management of ${diagnosis} based on current evidence. This guideline provides recommendations for diagnosis, treatment selection, monitoring, and follow-up care. The recommendations are graded according to strength of evidence and clinical importance.`,
      relevanceScore: 95,
    },
    {
      pmid: "38234570",
      title: `Epidemiology and Risk Factors of ${diagnosis}: A Population-Based Study`,
      authors: ["Thompson R", "White C", "Miller D"],
      journal: "American Journal of Epidemiology",
      year: currentYear - 1,
      abstract: `Population-based cohort study examining the epidemiology of ${diagnosis} over a 10-year period. Analysis of 156,789 individuals identified key risk factors and demographic patterns. Incidence rates varied significantly by age, gender, and geographic location.`,
      relevanceScore: 85,
    },
    {
      pmid: "38234571",
      title: `Novel Biomarkers in ${diagnosis}: Diagnostic and Prognostic Value`,
      authors: ["Chen X", "Rodriguez A", "Kim J"],
      journal: "Clinical Chemistry",
      year: currentYear,
      abstract: `Investigation of novel biomarkers for ${diagnosis} diagnosis and prognosis. Multi-center study of 2,847 patients identified several promising biomarkers with high sensitivity and specificity. These biomarkers may improve early detection and risk stratification.`,
      relevanceScore: 90,
    },
  ]

  // Ajuster la pertinence basée sur les symptômes
  return mockArticles.map((article) => ({
    ...article,
    relevanceScore: Math.max(75, article.relevanceScore - Math.floor(Math.random() * 10)),
  }))
}
