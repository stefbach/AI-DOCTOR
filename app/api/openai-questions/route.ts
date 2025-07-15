import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { patientData, clinicalData } = await request.json()

    if (!patientData || !clinicalData) {
      return NextResponse.json({ error: "Données patient et cliniques requises" }, { status: 400 })
    }

    const prompt = `
Tu es un médecin expert spécialisé dans l'interrogatoire médical. Génère exactement 8 questions personnalisées et pertinentes pour ce patient.

DONNÉES PATIENT:
- Nom: ${patientData.firstName} ${patientData.lastName}
- Âge: ${patientData.age} ans
- Sexe: ${patientData.gender}
- Poids: ${patientData.weight} kg
- Taille: ${patientData.height} cm
- Antécédents: ${patientData.medicalHistory?.join(", ") || "Aucun"}
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"}
- Médicaments actuels: ${patientData.currentMedications?.join(", ") || "Aucun"}
- Habitudes de vie:
  * Tabac: ${patientData.lifeHabits?.smoking || "Non renseigné"}
  * Alcool: ${patientData.lifeHabits?.alcohol || "Non renseigné"}
  * Activité physique: ${patientData.lifeHabits?.physicalActivity || "Non renseigné"}

DONNÉES CLINIQUES:
- Motif de consultation: ${clinicalData.chiefComplaint}
- Symptômes présents: ${clinicalData.symptoms?.join(", ") || "Aucun"}
- Durée des symptômes: ${clinicalData.symptomDuration}
- Signes vitaux:
  * Température: ${clinicalData.vitalSigns?.temperature || "Non prise"}°C
  * Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate || "Non prise"} bpm
  * Tension artérielle: ${clinicalData.vitalSigns?.bloodPressureSystolic || "Non prise"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "Non prise"} mmHg
- Échelle de douleur: ${clinicalData.painScale}/10
- Impact fonctionnel: ${clinicalData.functionalStatus}
- Notes cliniques: ${clinicalData.notes || "Aucune"}

INSTRUCTIONS POUR LES QUESTIONS:
1. Génère exactement 8 questions spécifiques à ce cas clinique
2. Adapte les questions à l'âge, au sexe et aux antécédents du patient
3. Priorise les questions qui aideront au diagnostic différentiel
4. Inclus des questions sur les facteurs déclenchants, aggravants et améliorants
5. Pose des questions sur l'évolution temporelle des symptômes
6. Inclus des questions sur les signes associés non mentionnés
7. Adapte le vocabulaire à un interrogatoire médical professionnel
8. Évite les questions redondantes avec les données déjà collectées

TYPES DE QUESTIONS À PRIVILÉGIER:
- Questions fermées (oui/non) pour les signes spécifiques
- Questions à choix multiples pour les caractéristiques (intensité, fréquence, etc.)
- Questions ouvertes courtes pour les descriptions précises
- Questions sur l'historique familial si pertinent
- Questions sur les facteurs environnementaux ou professionnels

FORMAT DE RÉPONSE REQUIS (JSON strict):
{
  "questions": [
    {
      "id": 1,
      "question": "Question précise et médicalement pertinente?",
      "type": "yes_no",
      "category": "symptomatologie",
      "priority": "high",
      "rationale": "Justification médicale de cette question"
    },
    {
      "id": 2,
      "question": "Autre question adaptée au cas?",
      "type": "multiple_choice",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "category": "antécédents",
      "priority": "medium",
      "rationale": "Pourquoi cette question est importante"
    },
    {
      "id": 3,
      "question": "Question ouverte courte?",
      "type": "short_text",
      "category": "évolution",
      "priority": "high",
      "rationale": "Justification clinique"
    }
  ],
  "clinical_context": {
    "suspected_conditions": ["Condition 1", "Condition 2"],
    "key_differentials": ["Diagnostic différentiel 1", "Diagnostic différentiel 2"],
    "red_flags_to_explore": ["Signe d'alarme 1", "Signe d'alarme 2"]
  },
  "personalization_factors": {
    "age_specific": "Considérations liées à l'âge",
    "gender_specific": "Considérations liées au sexe",
    "comorbidity_focus": "Focus sur les comorbidités"
  }
}

TYPES AUTORISÉS: "yes_no", "multiple_choice", "short_text", "scale_1_10"
CATÉGORIES: "symptomatologie", "antécédents", "évolution", "facteurs_risque", "signes_associés", "impact_fonctionnel"
PRIORITÉS: "high", "medium", "low"

Génère maintenant les 8 questions personnalisées pour ce patient en JSON strict.
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt,
      maxTokens: 8000,
      temperature: 0.1,
    })

    // Parse du JSON avec gestion d'erreur robuste
    let questionsData
    try {
      // Nettoyer le texte avant parsing
      const cleanedText = result.text.trim()
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        questionsData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Format JSON non trouvé")
      }
    } catch (parseError) {
      console.error("Erreur parsing JSON:", parseError)

      // Fallback avec questions génériques
      questionsData = {
        questions: [
          {
            id: 1,
            question: "Avez-vous déjà ressenti ces symptômes auparavant?",
            type: "yes_no",
            category: "antécédents",
            priority: "high",
            rationale: "Évaluer la récurrence des symptômes",
          },
          {
            id: 2,
            question: "Les symptômes s'aggravent-ils à un moment particulier de la journée?",
            type: "multiple_choice",
            options: ["Matin", "Après-midi", "Soir", "Nuit", "Aucun moment particulier"],
            category: "évolution",
            priority: "medium",
            rationale: "Identifier les patterns temporels",
          },
          {
            id: 3,
            question: "Qu'est-ce qui améliore ou aggrave vos symptômes?",
            type: "short_text",
            category: "facteurs_risque",
            priority: "high",
            rationale: "Identifier les facteurs modulateurs",
          },
          {
            id: 4,
            question: "Avez-vous des antécédents familiaux de maladies similaires?",
            type: "yes_no",
            category: "antécédents",
            priority: "medium",
            rationale: "Évaluer les facteurs génétiques",
          },
          {
            id: 5,
            question: "Sur une échelle de 1 à 10, comment évaluez-vous l'impact sur votre qualité de vie?",
            type: "scale_1_10",
            category: "impact_fonctionnel",
            priority: "medium",
            rationale: "Mesurer l'impact fonctionnel",
          },
          {
            id: 6,
            question: "Avez-vous remarqué d'autres symptômes associés?",
            type: "short_text",
            category: "signes_associés",
            priority: "high",
            rationale: "Identifier les signes associés non mentionnés",
          },
          {
            id: 7,
            question: "Avez-vous récemment voyagé ou été exposé à des environnements particuliers?",
            type: "yes_no",
            category: "facteurs_risque",
            priority: "medium",
            rationale: "Évaluer les expositions environnementales",
          },
          {
            id: 8,
            question: "Prenez-vous actuellement des médicaments en vente libre ou des suppléments?",
            type: "yes_no",
            category: "antécédents",
            priority: "medium",
            rationale: "Compléter l'anamnèse médicamenteuse",
          },
        ],
        clinical_context: {
          suspected_conditions: ["À déterminer selon les symptômes"],
          key_differentials: ["Diagnostic différentiel à préciser"],
          red_flags_to_explore: ["Signes d'alarme à surveiller"],
        },
        personalization_factors: {
          age_specific: `Adapté à un patient de ${patientData.age} ans`,
          gender_specific: `Considérations pour le sexe ${patientData.gender}`,
          comorbidity_focus: "Basé sur les antécédents mentionnés",
        },
      }
    }

    // Validation des données
    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      throw new Error("Format de questions invalide")
    }

    // S'assurer qu'on a exactement 8 questions
    if (questionsData.questions.length !== 8) {
      questionsData.questions = questionsData.questions.slice(0, 8)
      while (questionsData.questions.length < 8) {
        questionsData.questions.push({
          id: questionsData.questions.length + 1,
          question: `Question complémentaire ${questionsData.questions.length + 1}?`,
          type: "yes_no",
          category: "symptomatologie",
          priority: "medium",
          rationale: "Question générée automatiquement",
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: questionsData,
      metadata: {
        generatedAt: new Date().toISOString(),
        patientAge: patientData.age,
        patientGender: patientData.gender,
        chiefComplaint: clinicalData.chiefComplaint,
        tokensUsed: result.usage?.totalTokens || 0,
      },
    })
  } catch (error) {
    console.error("Erreur génération questions:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
