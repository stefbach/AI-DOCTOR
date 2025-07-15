import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { patientData, clinicalData, numberOfQuestions = 8, focusArea = "diagnostic général" } = await request.json()

    if (!patientData || !clinicalData) {
      return NextResponse.json({ success: false, error: "Données patient et cliniques requises" }, { status: 400 })
    }

    // Prompt optimisé avec plus de tokens pour des questions ultra-personnalisées
    const prompt = `Tu es un médecin expert spécialisé dans l'interrogatoire médical personnalisé. 

DONNÉES PATIENT:
- Nom: ${patientData.firstName} ${patientData.lastName}
- Âge: ${patientData.age} ans, Sexe: ${patientData.gender}
- Poids: ${patientData.weight}kg, Taille: ${patientData.height}cm
- Groupe sanguin: ${patientData.bloodType}
- Antécédents médicaux: ${patientData.medicalHistory?.join(", ") || "Aucun"}
- Médicaments actuels: ${patientData.currentMedications?.join(", ") || "Aucun"}
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"}
- Habitudes de vie: Tabac: ${patientData.lifeHabits?.smoking}, Alcool: ${patientData.lifeHabits?.alcohol}, Activité physique: ${patientData.lifeHabits?.physicalActivity}

DONNÉES CLINIQUES:
- Motif de consultation: ${clinicalData.chiefComplaint}
- Symptômes actuels: ${clinicalData.symptoms?.join(", ")}
- Durée des symptômes: ${clinicalData.symptomDuration}
- Signes vitaux: T°${clinicalData.vitalSigns?.temperature}°C, FC:${clinicalData.vitalSigns?.heartRate}/min, TA:${clinicalData.vitalSigns?.bloodPressureSystolic}/${clinicalData.vitalSigns?.bloodPressureDiastolic}mmHg
- Échelle de douleur: ${clinicalData.painScale}/10
- Impact fonctionnel: ${clinicalData.functionalStatus}
- Notes cliniques: ${clinicalData.notes}

MISSION: Génère ${numberOfQuestions} questions d'interrogatoire médical ULTRA-PERSONNALISÉES et STRATÉGIQUES pour ce patient spécifique.

CRITÈRES D'EXCELLENCE:
1. PERSONNALISATION MAXIMALE: Chaque question doit être adaptée à l'âge, sexe, antécédents, médicaments et contexte spécifique
2. PERTINENCE DIAGNOSTIQUE: Questions orientées vers les hypothèses diagnostiques les plus probables
3. HIÉRARCHISATION: Questions prioritaires d'abord (urgences, complications)
4. SPÉCIFICITÉ CLINIQUE: Éviter les questions génériques, privilégier la précision
5. APPROCHE SYSTÉMIQUE: Couvrir tous les aspects pertinents (symptômes, contexte, facteurs de risque)

TYPES DE QUESTIONS À PRIVILÉGIER:
- Questions de caractérisation symptomatique précise
- Questions sur les facteurs déclenchants/aggravants/améliorants
- Questions sur l'évolution temporelle détaillée
- Questions sur les signes associés spécifiques
- Questions sur l'impact fonctionnel et qualité de vie
- Questions sur les facteurs de risque personnalisés
- Questions sur l'observance thérapeutique si applicable
- Questions sur l'environnement et expositions
- Questions sur les antécédents familiaux pertinents
- Questions sur les habitudes de vie spécifiques

ADAPTATION SELON LE PROFIL:
- Patient âgé (>65 ans): Questions sur autonomie, cognition, chutes, polymédication
- Femme en âge de procréer: Questions gynéco-obstétricales, contraception, grossesse
- Patient diabétique: Questions sur contrôle glycémique, complications, observance
- Patient cardiaque: Questions sur tolérance à l'effort, œdèmes, douleurs thoraciques
- Patient psychiatrique: Questions sur humeur, sommeil, idées suicidaires, traitement

FORMAT DE RÉPONSE OBLIGATOIRE (JSON):
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "question": "Question ultra-personnalisée et précise",
      "type": "symptom_characterization|temporal_evolution|associated_signs|functional_impact|risk_factors|medication_compliance|environmental|family_history|lifestyle|emergency_signs",
      "category": "cardiovascular|respiratory|neurological|digestive|urogenital|musculoskeletal|dermatological|psychiatric|general|emergency",
      "priority": "high|medium|low",
      "rationale": "Justification médicale détaillée de pourquoi cette question est cruciale pour ce patient spécifique",
      "expectedAnswerType": "text|number|boolean|multiple_choice|scale",
      "options": ["option1", "option2", "option3"] // Si applicable
    }
  ],
  "metadata": {
    "patientProfile": "Profil clinique synthétique",
    "diagnosticHypotheses": ["Hypothèse 1", "Hypothèse 2", "Hypothèse 3"],
    "questioningStrategy": "Stratégie d'interrogatoire adoptée",
    "priorityFocus": "Focus prioritaire de l'interrogatoire"
  }
}

ATTENTION: Les questions doivent être formulées de manière professionnelle mais compréhensible pour le patient, en français médical adapté.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Tu es un médecin expert en interrogatoire médical personnalisé. Tu génères des questions ultra-spécifiques et pertinentes selon le profil patient.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 8000, // Augmenté pour des réponses plus détaillées
      temperature: 0.1,
      response_format: { type: "json_object" },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("Pas de réponse de OpenAI")
    }

    const parsedResponse = JSON.parse(response)

    if (!parsedResponse.success || !parsedResponse.questions) {
      throw new Error("Format de réponse invalide")
    }

    return NextResponse.json({
      success: true,
      questions: parsedResponse.questions,
      metadata: parsedResponse.metadata,
      usage: completion.usage,
    })
  } catch (error: any) {
    console.error("Erreur génération questions:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de la génération des questions",
      },
      { status: 500 },
    )
  }
}
