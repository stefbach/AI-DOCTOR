// Medical APIs Integration Services - REAL APIs ONLY

interface OpenAIResponse {
  diagnosis: {
    primary: {
      condition: string
      icd10: string
      confidence: number
      rationale: string
      severity: "mild" | "moderate" | "severe"
    }
    differential: Array<{
      condition: string
      probability: number
      rationale: string
      rulOutTests: string[]
    }>
  }
  recommendations: {
    exams: Array<{
      name: string
      code: string
      category: string
      indication: string
      priority: "high" | "medium" | "low"
    }>
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      duration?: string
      indication: string
      contraindications: string[]
    }>
  }
  riskFactors?: string[]
  prognosis?: string
  followUp?: string
}

interface FDADrugInfo {
  drugName: string
  activeIngredient: string
  interactions: Array<{
    drug: string
    severity: "major" | "moderate" | "minor"
    description: string
  }>
  contraindications: string[]
  warnings: string[]
  fdaApproved: boolean
  source: string
}

interface RxNormResponse {
  rxcui: string
  name: string
  synonym: string[]
  tty: string
  suppress: string
  source: string
}

interface PubMedArticle {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: number
  abstract: string
  relevanceScore: number
  url?: string
  source: string
}

export class MedicalAPIService {
  private static instance: MedicalAPIService

  static getInstance(): MedicalAPIService {
    if (!MedicalAPIService.instance) {
      MedicalAPIService.instance = new MedicalAPIService()
    }
    return MedicalAPIService.instance
  }

  async generateDiagnosisWithOpenAI(patientData: any, clinicalData: any, questionsData: any): Promise<OpenAIResponse> {
    const response = await fetch("/api/openai-diagnosis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientData,
        clinicalData,
        questionsData,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `OpenAI API Error: ${response.status}`)
    }

    const result = await response.json()
    if (result.error) {
      throw new Error(result.error)
    }

    return result
  }

  async checkDrugInteractionsFDA(medications: string[]): Promise<FDADrugInfo[]> {
    const response = await fetch("/api/fda-drug-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ medications }),
    })

    if (!response.ok) {
      throw new Error(`FDA API Error: ${response.status}`)
    }

    return await response.json()
  }

  async normalizeWithRxNorm(drugName: string): Promise<RxNormResponse> {
    const response = await fetch("/api/rxnorm-normalize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ drugName }),
    })

    if (!response.ok) {
      throw new Error(`RxNorm API Error: ${response.status}`)
    }

    return await response.json()
  }

  async searchPubMedReferences(diagnosis: string, symptoms: string[]): Promise<PubMedArticle[]> {
    const response = await fetch("/api/pubmed-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        diagnosis,
        symptoms,
        maxResults: 5,
        yearLimit: 5,
      }),
    })

    if (!response.ok) {
      throw new Error(`PubMed API Error: ${response.status}`)
    }

    return await response.json()
  }
}

export type { OpenAIResponse, FDADrugInfo, RxNormResponse, PubMedArticle }