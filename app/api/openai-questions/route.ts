import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🤖 API Questions IA - Début")

    let requestData: {
      patientData?: any
      clinicalData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour questions IA")
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON questions:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { patientData, clinicalData } = requestData

    if (!patientData || !clinicalData) {
      console.log("⚠️ Données manquantes pour générer les questions")
      return NextResponse.json(
        {
          error: "Données patient et cliniques requises",
          success: false,
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Génération questions pour: ${patientData.firstName} ${patientData.lastName}`)

    const prompt = `
En tant qu'expert médical IA, générez des questions diagnostiques pertinentes pour ce cas clinique.

PATIENT:
- ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
- Poids: ${patientData.weight}kg, Taille: ${patientData.height}cm
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
- Antécédents: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}
- Médicaments: ${patientData.currentMedicationsText || "Aucun"}
- Habitudes: Tabac: ${patientData.lifeHabits?.smoking || "Non renseigné"}, Alcool: ${patientData.lifeHabits?.alcohol || "Non renseigné"}

DONNÉES CLINIQUES:
- Motif: ${clinicalData.chiefComplaint || "Non renseigné"}
- Symptômes: ${clinicalData.symptoms || "Non renseigné"}
- Examen physique: ${clinicalData.physicalExam || "Non renseigné"}
- Signes vitaux: T°${clinicalData.vitalSigns?.temperature || "?"}°C, TA ${clinicalData.vitalSigns?.bloodPressure || "?"}, FC ${clinicalData.vitalSigns?.heartRate || "?"}/min

GÉNÉREZ 5-8 QUESTIONS DIAGNOSTIQUES CIBLÉES:

Basé sur les symptômes et l'examen, posez des questions spécifiques pour:
1. Préciser la chronologie des symptômes
2. Identifier les facteurs déclenchants
3. Évaluer la sévérité et l'évolution
4. Rechercher des signes associés
5. Éliminer les diagnostics différentiels
6. Évaluer l'impact fonctionnel

Format JSON requis:
{
  "questions": [
    {
      "id": 1,
      "question": "Question précise et médicalement pertinente?",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "rationale": "Justification médicale de cette question",
      "category": "chronologie|déclenchants|sévérité|signes_associés|différentiel|fonctionnel"
    }
  ]
}

Questions en français, précises et adaptées au cas clinique présenté.
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 2000,
    })

    console.log("🧠 Questions IA générées")

    // Tentative de parsing JSON avec fallback
    let questionsData
    try {
      // Nettoyer le texte avant parsing
      let cleanedText = result.text.trim()

      // Extraire le JSON s'il est entouré de texte
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      questionsData = JSON.parse(cleanedText)

      // Validation de la structure
      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        throw new Error("Structure JSON invalide")
      }

      console.log(`✅ ${questionsData.questions.length} questions parsées avec succès`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON, génération de questions de fallback")

      // Questions de fallback basées sur les données cliniques
      questionsData = generateFallbackQuestions(patientData, clinicalData)
    }

    const response = {
      success: true,
      questions: questionsData.questions,
      metadata: {
        patientAge: patientData.age,
        patientGender: patientData.gender,
        chiefComplaint: clinicalData.chiefComplaint,
        questionsCount: questionsData.questions.length,
        generatedAt: new Date().toISOString(),
        aiModel: "gpt-4o",
      },
    }

    console.log(`✅ Questions IA retournées: ${questionsData.questions.length}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Questions IA:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function generateFallbackQuestions(patientData: any, clinicalData: any) {
  const baseQuestions = [
    {
      id: 1,
      question: "Depuis quand ressentez-vous ces symptômes?",
      type: "multiple_choice",
      options: ["Moins de 24h", "1-7 jours", "1-4 semaines", "Plus d'un mois"],
      rationale: "La chronologie aide à différencier les causes aiguës des chroniques",
      category: "chronologie",
    },
    {
      id: 2,
      question: "Les symptômes sont-ils constants ou intermittents?",
      type: "multiple_choice",
      options: ["Constants", "Intermittents", "Progressifs", "Variables"],
      rationale: "Le pattern temporel oriente vers certains diagnostics",
      category: "sévérité",
    },
    {
      id: 3,
      question: "Y a-t-il des facteurs qui aggravent ou soulagent les symptômes?",
      type: "multiple_choice",
      options: ["Effort physique", "Repos", "Alimentation", "Position", "Aucun facteur identifié"],
      rationale: "Les facteurs modulateurs sont diagnostiques",
      category: "déclenchants",
    },
    {
      id: 4,
      question: "Avez-vous remarqué d'autres symptômes associés?",
      type: "multiple_choice",
      options: ["Fièvre", "Fatigue", "Perte d'appétit", "Troubles du sommeil", "Aucun"],
      rationale: "Les signes associés complètent le tableau clinique",
      category: "signes_associés",
    },
    {
      id: 5,
      question: "Ces symptômes impactent-ils vos activités quotidiennes?",
      type: "multiple_choice",
      options: ["Pas du tout", "Légèrement", "Modérément", "Sévèrement"],
      rationale: "L'impact fonctionnel évalue la sévérité",
      category: "fonctionnel",
    },
  ]

  // Personnaliser selon l'âge
  if (patientData.age > 65) {
    baseQuestions.push({
      id: 6,
      question: "Avez-vous eu des chutes récentes ou des troubles de l'équilibre?",
      type: "multiple_choice",
      options: ["Oui, plusieurs fois", "Oui, une fois", "Non", "Troubles d'équilibre sans chute"],
      rationale: "Important chez la personne âgée pour évaluer les risques",
      category: "signes_associés",
    })
  }

  // Personnaliser selon le sexe
  if (patientData.gender === "Femme" && patientData.age >= 15 && patientData.age <= 50) {
    baseQuestions.push({
      id: 7,
      question: "Ces symptômes sont-ils liés à votre cycle menstruel?",
      type: "multiple_choice",
      options: ["Oui, clairement", "Peut-être", "Non", "Non applicable"],
      rationale: "Certains symptômes peuvent être hormonaux",
      category: "déclenchants",
    })
  }

  return { questions: baseQuestions }
}
