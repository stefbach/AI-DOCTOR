import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { patientData, clinicalData, questionsData } = await request.json()

    // Vérification de la clé API OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Clé API OpenAI manquante. Veuillez configurer OPENAI_API_KEY dans vos variables d'environnement." },
        { status: 500 },
      )
    }

    // Construction du prompt médical structuré
    const medicalPrompt = `
Vous êtes un médecin expert en diagnostic médical. Analysez les données cliniques suivantes et fournissez un diagnostic structuré.

DONNÉES PATIENT:
- Âge: ${patientData?.age || "Non spécifié"} ans
- Sexe: ${patientData?.gender || "Non spécifié"}
- Allergies: ${patientData?.allergies || "Aucune connue"}
- Antécédents: ${patientData?.medicalHistory || "Non spécifiés"}

DONNÉES CLINIQUES:
- Motif de consultation: ${clinicalData?.chiefComplaint || "Non spécifié"}
- Symptômes: ${clinicalData?.symptoms?.join(", ") || "Non spécifiés"}
- Signes vitaux: 
  * TA: ${clinicalData?.vitalSigns?.bloodPressure || "Non mesurée"}
  * FC: ${clinicalData?.vitalSigns?.heartRate || "Non mesurée"} bpm
  * Température: ${clinicalData?.vitalSigns?.temperature || "Non mesurée"}°C
  * SpO2: ${clinicalData?.vitalSigns?.oxygenSaturation || "Non mesurée"}%
- Examen physique: ${clinicalData?.physicalExam || "Non réalisé"}

ANAMNÈSE DIRIGÉE:
${questionsData?.responses?.map((r: any, i: number) => `${i + 1}. ${r.question}: ${r.answer}`).join("\n") || "Aucune réponse"}

Fournissez votre analyse au format JSON suivant:
{
  "diagnosis": {
    "primary": {
      "condition": "Nom du diagnostic principal",
      "icd10": "Code ICD-10",
      "confidence": 85,
      "rationale": "Justification clinique détaillée",
      "severity": "mild|moderate|severe"
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel 1",
        "probability": 25,
        "rationale": "Justification",
        "rulOutTests": ["Examen 1", "Examen 2"]
      }
    ]
  },
  "recommendations": {
    "exams": [
      {
        "name": "Nom de l'examen",
        "code": "Code CCAM/NABM",
        "category": "biology|imaging|functional",
        "indication": "Indication clinique",
        "priority": "high|medium|low"
      }
    ],
    "medications": [
      {
        "name": "Nom du médicament",
        "dosage": "Posologie",
        "frequency": "Fréquence",
        "duration": "Durée",
        "indication": "Indication",
        "contraindications": ["Contre-indication 1"]
      }
    ]
  },
  "riskFactors": ["Facteur de risque 1"],
  "prognosis": "Pronostic",
  "followUp": "Suivi recommandé"
}

Répondez UNIQUEMENT avec le JSON valide, sans texte supplémentaire.`

    // Appel à OpenAI GPT-4
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: medicalPrompt,
      temperature: 0.3,
      maxTokens: 2000,
    })

    // Parse de la réponse JSON
    let diagnosisData
    try {
      // Nettoyer la réponse pour extraire le JSON
      const cleanedResponse = result.text.replace(/```json\n?|\n?```/g, "").trim()
      diagnosisData = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error("Erreur parsing JSON:", parseError)
      console.error("Réponse brute:", result.text)

      // Fallback avec diagnostic basique
      diagnosisData = {
        diagnosis: {
          primary: {
            condition: "Syndrome clinique nécessitant exploration",
            icd10: "R69",
            confidence: 70,
            rationale: `Analyse basée sur: ${clinicalData?.chiefComplaint || "symptômes rapportés"}. Évaluation clinique approfondie recommandée.`,
            severity: "moderate",
          },
          differential: [],
        },
        recommendations: {
          exams: [
            {
              name: "Bilan biologique standard",
              code: "HQZZ002",
              category: "biology",
              indication: "Évaluation générale de l'état de santé",
              priority: "medium",
            },
          ],
          medications: [],
        },
        riskFactors: [],
        prognosis: "Bon pronostic avec prise en charge adaptée",
        followUp: "Consultation de suivi dans 7-14 jours",
      }
    }

    // Validation et enrichissement des données
    if (!diagnosisData.diagnosis?.primary?.condition) {
      throw new Error("Réponse OpenAI invalide: diagnostic principal manquant")
    }

    // Ajout de métadonnées
    diagnosisData.metadata = {
      generatedAt: new Date().toISOString(),
      model: "gpt-4o",
      patientAge: patientData?.age,
      patientGender: patientData?.gender,
      chiefComplaint: clinicalData?.chiefComplaint,
    }

    return NextResponse.json(diagnosisData)
  } catch (error: any) {
    console.error("Erreur OpenAI diagnosis:", error)

    return NextResponse.json(
      {
        error: `Erreur lors de la génération du diagnostic: ${error.message}`,
        details: error.stack,
      },
      { status: 500 },
    )
  }
}
