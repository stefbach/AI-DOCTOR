// Services d'intégration des APIs médicales - Client Side

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
      indication: string
      contraindications: string[]
    }>
  }
  references: string[]
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
}

interface RxNormResponse {
  rxcui: string
  name: string
  synonym: string[]
  tty: string
  suppress: string
}

interface PubMedArticle {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: number
  abstract: string
  relevanceScore: number
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
    try {
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
        throw new Error("Erreur API OpenAI")
      }

      return await response.json()
    } catch (error) {
      console.error("Erreur génération diagnostic:", error)
      throw error
    }
  }

  async checkDrugInteractionsFDA(medications: string[]): Promise<FDADrugInfo[]> {
    try {
      const response = await fetch(`/api/fda-drug-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ medications }),
      })

      if (!response.ok) {
        throw new Error("Erreur FDA API")
      }

      return await response.json()
    } catch (error) {
      console.error("Erreur vérification FDA:", error)
      throw error
    }
  }

  async normalizeWithRxNorm(drugName: string): Promise<RxNormResponse> {
    try {
      const response = await fetch(`/api/rxnorm-normalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drugName }),
      })

      if (!response.ok) {
        throw new Error("Erreur RxNorm API")
      }

      return await response.json()
    } catch (error) {
      console.error("Erreur normalisation RxNorm:", error)
      throw error
    }
  }

  async searchPubMedReferences(diagnosis: string, symptoms: string[]): Promise<PubMedArticle[]> {
    try {
      const response = await fetch(`/api/pubmed-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          diagnosis,
          symptoms,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur PubMed API")
      }

      return await response.json()
    } catch (error) {
      console.error("Erreur recherche PubMed:", error)
      throw error
    }
  }
}
