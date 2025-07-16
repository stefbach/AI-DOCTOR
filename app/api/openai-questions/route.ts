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
En tant qu'expert médical IA spécialisé en médecine tropicale et pratiquant à l'île Maurice, générez des questions diagnostiques pertinentes pour ce cas clinique.

CONTEXTE GÉOGRAPHIQUE ET CLIMATIQUE:
- Localisation: Île Maurice (océan Indien, climat tropical)
- Pathologies endémiques: Paludisme, dengue, chikungunya, fièvre typhoïde, leptospirose
- Saisons: Été chaud et humide (nov-avril), hiver sec (mai-oct)
- Population: Multiethnique (Indo-mauricien, Créole, Sino-mauricien, Franco-mauricien)
- Facteurs environnementaux: Moustiques vecteurs, eau stagnante, cyclones

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

GÉNÉREZ 5-8 QUESTIONS DIAGNOSTIQUES ADAPTÉES AU CONTEXTE MAURICIEN:

Considérez spécifiquement:
1. PATHOLOGIES TROPICALES: Dengue, chikungunya, paludisme, leptospirose, fièvre typhoïde
2. FACTEURS ENVIRONNEMENTAUX: Exposition aux moustiques, eau contaminée, saison cyclonique
3. HABITUDES LOCALES: Alimentation créole, médecine traditionnelle, activités en plein air
4. VOYAGES: Déplacements inter-îles, Madagascar, Afrique, Inde
5. SAISON ACTUELLE: Impact du climat tropical sur les symptômes
6. POPULATION: Prédispositions génétiques selon l'origine ethnique

Questions ciblées pour:
- Éliminer les arboviroses (dengue, chikungunya, Zika)
- Rechercher une exposition paludique
- Évaluer les risques hydriques (leptospirose, typhoïde)
- Identifier les facteurs saisonniers
- Préciser l'exposition aux vecteurs
- Évaluer les voyages récents

Format JSON requis:
{
  "questions": [
    {
      "id": 1,
      "question": "Question précise adaptée au contexte mauricien?",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "rationale": "Justification médicale incluant le contexte tropical",
      "category": "tropical|environnemental|saisonnier|voyage|vecteur|hydrique"
    }
  ]
}

Adaptez les questions aux spécificités épidémiologiques de l'île Maurice et aux pathologies tropicales courantes.
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
      console.warn("⚠️ Erreur parsing JSON, génération de questions de fallback mauriciennes")

      // Questions de fallback adaptées au contexte mauricien
      questionsData = generateMauritianFallbackQuestions(patientData, clinicalData)
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
        location: "Maurice",
        climate: "tropical",
      },
    }

    console.log(`✅ Questions IA mauriciennes retournées: ${questionsData.questions.length}`)
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

function generateMauritianFallbackQuestions(patientData: any, clinicalData: any) {
  const baseQuestions = [
    {
      id: 1,
      question: "Avez-vous été piqué(e) par des moustiques récemment?",
      type: "multiple_choice",
      options: ["Oui, beaucoup", "Oui, quelques piqûres", "Non, pas particulièrement", "Je ne sais pas"],
      rationale: "Les arboviroses (dengue, chikungunya) sont endémiques à Maurice et transmises par Aedes",
      category: "vecteur",
    },
    {
      id: 2,
      question: "Avez-vous voyagé récemment (Madagascar, Afrique, Inde)?",
      type: "multiple_choice",
      options: ["Oui, dans les 15 derniers jours", "Oui, dans le mois", "Non, pas récemment", "Jamais voyagé"],
      rationale: "Risque d'importation de paludisme ou autres pathologies tropicales",
      category: "voyage",
    },
    {
      id: 3,
      question: "Avez-vous été en contact avec de l'eau stagnante ou des inondations?",
      type: "multiple_choice",
      options: ["Oui, contact direct", "Oui, proximité", "Non", "Pendant la saison cyclonique"],
      rationale: "Risque de leptospirose, fréquente à Maurice après les pluies",
      category: "hydrique",
    },
    {
      id: 4,
      question: "Vos symptômes ont-ils commencé pendant la saison chaude et humide?",
      type: "multiple_choice",
      options: ["Oui, en été (nov-avril)", "Non, en hiver (mai-oct)", "Je ne sais pas", "Symptômes constants"],
      rationale: "Saisonnalité des arboviroses et pathologies liées aux moustiques",
      category: "saisonnier",
    },
    {
      id: 5,
      question: "Avez-vous consommé de l'eau ou des aliments suspects récemment?",
      type: "multiple_choice",
      options: ["Eau non traitée", "Street food", "Fruits de mer", "Rien de suspect"],
      rationale: "Risque de fièvre typhoïde, gastro-entérites tropicales",
      category: "hydrique",
    },
  ]

  // Questions spécifiques selon les symptômes
  const symptoms = clinicalData.symptoms?.toLowerCase() || ""

  if (symptoms.includes("fièvre")) {
    baseQuestions.push({
      id: 6,
      question: "La fièvre s'accompagne-t-elle de douleurs articulaires intenses?",
      type: "multiple_choice",
      options: ["Oui, très intenses", "Oui, modérées", "Non", "Douleurs musculaires seulement"],
      rationale: "Chikungunya typique avec arthralgie sévère, endémique à Maurice",
      category: "tropical",
    })
  }

  if (symptoms.includes("douleur") && symptoms.includes("abdomen")) {
    baseQuestions.push({
      id: 7,
      question: "Avez-vous mangé des fruits de mer ou du poisson récemment?",
      type: "multiple_choice",
      options: ["Oui, dans les 24h", "Oui, cette semaine", "Non", "Régulièrement"],
      rationale: "Intoxication alimentaire marine fréquente dans les îles tropicales",
      category: "environnemental",
    })
  }

  return { questions: baseQuestions }
}
