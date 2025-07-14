import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 PubMed Search API - Début")

    let requestData: {
      query?: string
      maxResults?: number
    }

    try {
      requestData = await request.json()
      console.log("📝 Requête PubMed:", requestData.query)
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON PubMed:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { query = "", maxResults = 5 } = requestData

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      console.log("⚠️ Aucune requête fournie")
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        articles: [],
        metadata: {
          totalResults: 0,
          query: "",
          source: "PubMed NCBI (simulé)",
          message: "Aucune requête de recherche fournie",
        },
      })
    }

    console.log(`🔍 Recherche PubMed pour: "${query}"`)

    // Recherche d'articles PubMed
    const articles = searchPubMedArticles(query.trim(), maxResults)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      articles: articles,
      metadata: {
        totalResults: articles.length,
        query: query.trim(),
        maxResults: maxResults,
        source: "PubMed NCBI (simulé)",
        searchDate: new Date().toISOString(),
        disclaimer: "Données simulées à des fins de démonstration",
      },
    }

    console.log(`✅ ${articles.length} articles PubMed trouvés`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur PubMed API:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la recherche PubMed",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function searchPubMedArticles(query: string, maxResults: number) {
  const searchTerms = query.toLowerCase()

  // Base de données d'articles PubMed simulée
  const pubmedDatabase = [
    // Cardiologie
    {
      pmid: "37123456",
      title: "Acute Chest Pain Evaluation in Emergency Department: A Systematic Approach",
      authors: ["Smith JA", "Johnson MB", "Brown KC", "Wilson RD"],
      journal: "Emergency Medicine Journal",
      year: "2023",
      volume: "40",
      issue: "8",
      pages: "567-574",
      abstract:
        "Background: Chest pain is one of the most common presenting complaints in emergency departments worldwide. Objective: To provide a systematic approach for the evaluation of acute chest pain in the emergency setting. Methods: We reviewed current literature and guidelines for chest pain evaluation including risk stratification tools, diagnostic testing, and decision-making algorithms. Results: A structured approach using validated risk scores (HEART, TIMI, GRACE) combined with appropriate diagnostic testing (ECG, troponins, imaging) can effectively stratify patients and guide management decisions. Conclusion: Implementation of systematic chest pain protocols improves patient outcomes and reduces unnecessary admissions.",
      doi: "10.1136/emermed-2023-213456",
      keywords: ["chest pain", "emergency department", "diagnosis", "cardiac", "risk stratification"],
      relevanceScore: 0.95,
      citationCount: 45,
      publicationType: "Review",
    },
    {
      pmid: "37123457",
      title: "Hypertension Management in Elderly Patients: Updated Guidelines and Evidence",
      authors: ["Garcia ML", "Thompson RS", "Lee HK"],
      journal: "Journal of Hypertension",
      year: "2023",
      volume: "41",
      issue: "6",
      pages: "1123-1135",
      abstract:
        "Hypertension affects over 70% of adults aged 65 and older, making it a critical public health concern. This comprehensive review examines the latest evidence for blood pressure management in elderly patients, including optimal targets, medication selection, and monitoring strategies. Recent trials suggest that intensive blood pressure control (target <130/80 mmHg) may benefit selected elderly patients, but individualized approaches considering frailty, comorbidities, and life expectancy are essential. First-line therapies include ACE inhibitors, ARBs, calcium channel blockers, and thiazide diuretics, with careful attention to drug interactions and side effects.",
      doi: "10.1097/HJH.0000000000003234",
      keywords: ["hypertension", "elderly", "blood pressure", "cardiovascular", "guidelines"],
      relevanceScore: 0.92,
      citationCount: 67,
      publicationType: "Review",
    },

    // Respiratoire
    {
      pmid: "37123458",
      title: "Chronic Cough: Etiology, Evaluation, and Management Strategies",
      authors: ["Anderson PK", "Taylor SM", "White MJ"],
      journal: "Respiratory Medicine",
      year: "2023",
      volume: "210",
      pages: "107123",
      abstract:
        "Chronic cough, defined as cough lasting more than 8 weeks, affects 10-15% of the population and significantly impacts quality of life. The most common causes include gastroesophageal reflux disease (GERD), asthma, and upper airway cough syndrome (previously post-nasal drip). A systematic approach to evaluation includes detailed history, physical examination, chest imaging, and targeted testing based on clinical suspicion. Treatment should address underlying causes with proton pump inhibitors for GERD, bronchodilators for asthma, and antihistamines for upper airway cough syndrome. Refractory cases may benefit from neuromodulators or speech therapy.",
      doi: "10.1016/j.rmed.2023.107123",
      keywords: ["chronic cough", "GERD", "asthma", "upper airway", "treatment"],
      relevanceScore: 0.88,
      citationCount: 34,
      publicationType: "Review",
    },
    {
      pmid: "37123459",
      title: "Asthma Exacerbation Management: Evidence-Based Approach",
      authors: ["Kumar AS", "Patel NR", "Davis LM"],
      journal: "Allergy and Asthma Proceedings",
      year: "2023",
      volume: "44",
      issue: "4",
      pages: "245-256",
      abstract:
        "Asthma exacerbations are acute episodes of worsening symptoms that require prompt recognition and treatment. This review provides evidence-based recommendations for the management of acute asthma in both emergency and outpatient settings. Key interventions include rapid-acting bronchodilators (albuterol), systemic corticosteroids, and oxygen therapy when indicated. Severity assessment using peak flow measurements and clinical criteria guides treatment intensity. Discharge planning should include action plans, medication reconciliation, and follow-up arrangements to prevent future exacerbations.",
      doi: "10.2500/aap.2023.44.230045",
      keywords: ["asthma", "exacerbation", "bronchodilator", "corticosteroids", "emergency"],
      relevanceScore: 0.9,
      citationCount: 28,
      publicationType: "Review",
    },

    // Gastroentérologie
    {
      pmid: "37123460",
      title: "Abdominal Pain in Adults: Diagnostic Approach and Red Flag Symptoms",
      authors: ["Martinez CR", "Rodriguez JL", "Kim SH"],
      journal: "Gastroenterology",
      year: "2023",
      volume: "164",
      issue: "7",
      pages: "1456-1468",
      abstract:
        "Abdominal pain is a common presenting complaint that requires systematic evaluation to identify serious underlying conditions. This review outlines a structured approach to adult abdominal pain assessment, including history taking, physical examination, and appropriate diagnostic testing. Red flag symptoms include severe pain, hematemesis, melena, weight loss, and fever, which may indicate conditions requiring urgent intervention such as appendicitis, bowel obstruction, or perforation. Laboratory tests and imaging should be guided by clinical suspicion and pain characteristics.",
      doi: "10.1053/j.gastro.2023.04.012",
      keywords: ["abdominal pain", "diagnosis", "red flags", "emergency", "gastroenterology"],
      relevanceScore: 0.87,
      citationCount: 52,
      publicationType: "Review",
    },

    // Neurologie
    {
      pmid: "37123461",
      title: "Headache Disorders: Updated Classification and Treatment Guidelines",
      authors: ["Chen LW", "Patel NK", "Johnson DR"],
      journal: "Neurology",
      year: "2023",
      volume: "100",
      issue: "15",
      pages: "e1567-e1580",
      abstract:
        "Headache disorders affect over 3 billion people worldwide and are a leading cause of disability. This comprehensive review presents the updated International Classification of Headache Disorders (ICHD-3) criteria and evidence-based treatment recommendations. Primary headaches include migraine, tension-type headache, and cluster headache, each with distinct clinical features and treatment approaches. Secondary headaches may indicate serious underlying conditions and require careful evaluation. Treatment strategies encompass both acute and preventive therapies, with emphasis on individualized care and lifestyle modifications.",
      doi: "10.1212/WNL.0000000000207234",
      keywords: ["headache", "migraine", "classification", "treatment", "neurology"],
      relevanceScore: 0.89,
      citationCount: 78,
      publicationType: "Review",
    },
    {
      pmid: "37123462",
      title: "Dizziness and Vertigo: Differential Diagnosis and Management",
      authors: ["Singh RA", "Williams TJ", "Brown KL"],
      journal: "Journal of Neurology",
      year: "2023",
      volume: "270",
      issue: "9",
      pages: "4321-4335",
      abstract:
        "Dizziness and vertigo are common symptoms that can significantly impact patient quality of life. This review provides a systematic approach to differential diagnosis, distinguishing between peripheral and central causes. Benign paroxysmal positional vertigo (BPPV) is the most common peripheral cause, while vestibular neuritis and Meniere's disease are also frequently encountered. Central causes include stroke, multiple sclerosis, and brain tumors. Diagnostic evaluation includes history, physical examination with focus on neurological and otological findings, and appropriate testing including audiometry and imaging when indicated.",
      doi: "10.1007/s00415-023-11789-2",
      keywords: ["dizziness", "vertigo", "BPPV", "vestibular", "diagnosis"],
      relevanceScore: 0.86,
      citationCount: 41,
      publicationType: "Review",
    },

    // Infectiologie
    {
      pmid: "37123463",
      title: "Fever in Adults: Diagnostic Workup and Management Principles",
      authors: ["Brown MK", "Jones PL", "Davis KR"],
      journal: "Infectious Diseases Clinics of North America",
      year: "2023",
      volume: "37",
      issue: "3",
      pages: "567-585",
      abstract:
        "Fever is a common presenting symptom that may indicate various underlying conditions ranging from benign viral infections to life-threatening bacterial diseases. This review outlines a systematic approach to fever evaluation in adults, including comprehensive history taking, physical examination, and appropriate laboratory and imaging studies. Key considerations include patient age, immunocompromised status, travel history, and associated symptoms. Empirical antibiotic therapy should be reserved for patients with evidence of bacterial infection or those at high risk for serious complications.",
      doi: "10.1016/j.idc.2023.02.008",
      keywords: ["fever", "infection", "diagnosis", "antibiotics", "workup"],
      relevanceScore: 0.84,
      citationCount: 36,
      publicationType: "Review",
    },

    // Gériatrie
    {
      pmid: "37123464",
      title: "Polypharmacy in Elderly Patients: Risks, Assessment, and Management",
      authors: ["Green SL", "Black RM", "Gray AJ"],
      journal: "Geriatrics",
      year: "2023",
      volume: "8",
      issue: "3",
      pages: "45",
      abstract:
        "Polypharmacy, typically defined as the use of five or more medications, affects up to 40% of elderly patients and is associated with increased risks of adverse drug events, drug interactions, and poor adherence. This review examines strategies for polypharmacy management including comprehensive medication review, deprescribing inappropriate medications, and optimizing therapeutic regimens. Tools such as the Beers Criteria and STOPP/START criteria can guide medication optimization. Regular medication reconciliation and patient education are essential components of safe prescribing in older adults.",
      doi: "10.3390/geriatrics8030045",
      keywords: ["polypharmacy", "elderly", "drug interactions", "deprescribing", "medication review"],
      relevanceScore: 0.83,
      citationCount: 29,
      publicationType: "Review",
    },

    // Médecine générale
    {
      pmid: "37123465",
      title: "Fatigue in Primary Care: Systematic Approach to Evaluation and Management",
      authors: ["White PJ", "Blue RK", "Purple SL"],
      journal: "Family Medicine",
      year: "2023",
      volume: "55",
      issue: "4",
      pages: "234-245",
      abstract:
        "Fatigue is one of the most common complaints in primary care, affecting up to 25% of patients. This review provides a systematic approach to fatigue evaluation, including assessment of duration, associated symptoms, and impact on daily functioning. Common causes include sleep disorders, depression, anemia, thyroid dysfunction, and chronic medical conditions. Initial evaluation should include comprehensive history, physical examination, and targeted laboratory testing. Management focuses on treating underlying conditions and providing supportive care including sleep hygiene, exercise, and stress management.",
      doi: "10.22454/FamMed.2023.456789",
      keywords: ["fatigue", "primary care", "diagnosis", "chronic fatigue", "evaluation"],
      relevanceScore: 0.79,
      citationCount: 22,
      publicationType: "Review",
    },

    // Pédiatrie
    {
      pmid: "37123466",
      title: "Pediatric Fever Management: Evidence-Based Guidelines for Primary Care",
      authors: ["Young LM", "Clark MR", "Hall JK"],
      journal: "Pediatrics",
      year: "2023",
      volume: "151",
      issue: "5",
      pages: "e2023061234",
      abstract:
        "Fever is the most common reason for pediatric healthcare visits and parental concern. This guideline provides evidence-based recommendations for fever management in children, including when to treat fever, appropriate antipyretic medications, and indications for medical evaluation. Fever itself is generally beneficial and does not require treatment unless causing discomfort. Acetaminophen and ibuprofen are safe and effective antipyretics when used appropriately. Parents should be educated about fever myths and provided clear instructions for when to seek medical care.",
      doi: "10.1542/peds.2023-061234",
      keywords: ["pediatric fever", "children", "antipyretics", "parent education", "guidelines"],
      relevanceScore: 0.81,
      citationCount: 33,
      publicationType: "Clinical Practice Guideline",
    },
  ]

  // Filtrage basé sur les termes de recherche
  const queryWords = searchTerms.split(/\s+/).filter((word) => word.length > 2)

  const relevantArticles = pubmedDatabase.filter((article) => {
    const searchableText = `${article.title} ${article.abstract} ${article.keywords.join(" ")}`.toLowerCase()

    return queryWords.some(
      (word) => searchableText.includes(word) || article.keywords.some((keyword) => keyword.includes(word)),
    )
  })

  // Si aucun article trouvé avec les mots-clés, retourner les articles les plus généraux
  if (relevantArticles.length === 0) {
    return pubmedDatabase.slice(0, Math.min(maxResults, 3)).map((article) => ({
      ...article,
      url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
      relevanceNote: "Article général - aucune correspondance spécifique trouvée",
    }))
  }

  // Tri par score de pertinence et limitation des résultats
  const sortedArticles = relevantArticles
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults)
    .map((article) => ({
      ...article,
      url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
      searchRelevance: calculateRelevance(article, queryWords),
    }))

  return sortedArticles
}

function calculateRelevance(article: any, queryWords: string[]): number {
  let score = 0
  const searchableText = `${article.title} ${article.abstract} ${article.keywords.join(" ")}`.toLowerCase()

  queryWords.forEach((word) => {
    if (article.title.toLowerCase().includes(word)) score += 3
    if (article.keywords.some((keyword: string) => keyword.toLowerCase().includes(word))) score += 2
    if (article.abstract.toLowerCase().includes(word)) score += 1
  })

  return score
}
