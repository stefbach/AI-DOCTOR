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
En tant qu'expert médical, générez des questions diagnostiques PERTINENTES pour ce cas clinique spécifique.

PRIORITÉ: Questions basées sur les SYMPTÔMES et le DIAGNOSTIC DIFFÉRENTIEL d'abord, puis contexte géographique si pertinent.

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

CONTEXTE GÉOGRAPHIQUE (secondaire):
- Localisation: Île Maurice (climat tropical)
- Pathologies possibles selon le contexte: Dengue, chikungunya, paludisme, leptospirose, fièvre typhoïde

LOGIQUE DIAGNOSTIQUE:
1. ANALYSEZ les symptômes présentés
2. IDENTIFIEZ le diagnostic différentiel principal
3. GÉNÉREZ des questions pour distinguer entre les hypothèses diagnostiques
4. INTÉGREZ le contexte tropical UNIQUEMENT si cliniquement pertinent

GÉNÉREZ 5-8 QUESTIONS ADAPTÉES AU CAS CLINIQUE:

Instructions spécifiques:
- Si douleur thoracique → questions cardio/pulmonaires d'abord, puis contexte si nécessaire
- Si fièvre → diagnostic différentiel standard, puis arboviroses si pertinent
- Si troubles digestifs → causes communes puis pathologies hydriques si approprié
- Si céphalées → causes neurologiques/vasculaires avant pathologies tropicales
- Si symptômes dermatologiques → diagnostic dermatologique avant piqûres/vecteurs

Questions ciblées pour:
- Préciser les caractéristiques des symptômes
- Distinguer les hypothèses diagnostiques principales
- Identifier les facteurs déclenchants/aggravants
- Évaluer la chronologie et l'évolution
- Rechercher les signes associés
- Contexte tropical UNIQUEMENT si cliniquement justifié

Format JSON requis:
{
  "questions": [
    {
      "id": 1,
      "question": "Question spécifique au diagnostic différentiel?",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "rationale": "Justification médicale basée sur le diagnostic différentiel",
      "category": "symptom|differential|chronology|associated|context"
    }
  ]
}

IMPORTANT: Adaptez les questions aux symptômes spécifiques présentés, pas à une liste générale de pathologies tropicales.
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
      console.warn("⚠️ Erreur parsing JSON, génération de questions de fallback ciblées")

      // Questions de fallback adaptées au cas clinique
      questionsData = generateTargetedFallbackQuestions(patientData, clinicalData)
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
        approach: "symptom-based",
      },
    }

    console.log(`✅ Questions IA ciblées retournées: ${questionsData.questions.length}`)
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

function generateTargetedFallbackQuestions(patientData: any, clinicalData: any) {
  const symptoms = clinicalData.symptoms?.toLowerCase() || ""
  const chiefComplaint = clinicalData.chiefComplaint?.toLowerCase() || ""
  const combinedSymptoms = `${symptoms} ${chiefComplaint}`

  let questions = []

  // Questions basées sur les symptômes spécifiques
  if (combinedSymptoms.includes("douleur") && combinedSymptoms.includes("thorax")) {
    questions = [
      {
        id: 1,
        question: "La douleur thoracique irradie-t-elle vers le bras gauche, la mâchoire ou le dos?",
        type: "multiple_choice",
        options: ["Oui, vers le bras gauche", "Oui, vers la mâchoire", "Oui, vers le dos", "Non, localisée"],
        rationale: "Distinction entre douleur cardiaque et autres étiologies",
        category: "differential",
      },
      {
        id: 2,
        question: "La douleur est-elle déclenchée par l'effort physique?",
        type: "multiple_choice",
        options: ["Oui, à chaque effort", "Parfois", "Non", "Je ne sais pas"],
        rationale: "Recherche d'une origine coronarienne",
        category: "symptom",
      },
      {
        id: 3,
        question: "Avez-vous des difficultés respiratoires associées?",
        type: "multiple_choice",
        options: ["Oui, dyspnée importante", "Oui, légère", "Non", "Seulement au repos"],
        rationale: "Évaluation de l'atteinte cardio-pulmonaire",
        category: "associated",
      },
    ]
  } else if (combinedSymptoms.includes("fièvre")) {
    questions = [
      {
        id: 1,
        question: "Depuis combien de temps avez-vous de la fièvre?",
        type: "multiple_choice",
        options: ["Moins de 24h", "1-3 jours", "3-7 jours", "Plus d'une semaine"],
        rationale: "Chronologie importante pour le diagnostic différentiel",
        category: "chronology",
      },
      {
        id: 2,
        question: "La fièvre s'accompagne-t-elle de frissons?",
        type: "multiple_choice",
        options: ["Oui, frissons intenses", "Oui, modérés", "Non", "Sensation de froid"],
        rationale: "Distinction entre infections bactériennes et virales",
        category: "symptom",
      },
      {
        id: 3,
        question: "Avez-vous des courbatures ou douleurs musculaires?",
        type: "multiple_choice",
        options: ["Oui, généralisées", "Oui, localisées", "Non", "Douleurs articulaires"],
        rationale: "Orientation vers syndrome grippal ou arboviroses",
        category: "associated",
      },
      // Contexte tropical UNIQUEMENT après les questions générales
      {
        id: 4,
        question: "Avez-vous été exposé à des moustiques dans les derniers jours?",
        type: "multiple_choice",
        options: ["Oui, beaucoup", "Oui, quelques-uns", "Non", "Je ne sais pas"],
        rationale: "Recherche d'arboviroses (dengue, chikungunya) après exclusion des causes communes",
        category: "context",
      },
    ]
  } else if (combinedSymptoms.includes("céphal") || combinedSymptoms.includes("tête")) {
    questions = [
      {
        id: 1,
        question: "Où se situe exactement la douleur dans la tête?",
        type: "multiple_choice",
        options: ["Front/tempes", "Vertex", "Occipital", "Hémicrânie"],
        rationale: "Localisation pour diagnostic différentiel des céphalées",
        category: "symptom",
      },
      {
        id: 2,
        question: "La douleur est-elle pulsatile ou constante?",
        type: "multiple_choice",
        options: ["Pulsatile", "Constante", "En étau", "Variable"],
        rationale: "Distinction migraine/céphalée de tension/cause secondaire",
        category: "symptom",
      },
      {
        id: 3,
        question: "Y a-t-il des signes neurologiques associés?",
        type: "multiple_choice",
        options: ["Troubles visuels", "Nausées/vomissements", "Raideur nuque", "Aucun"],
        rationale: "Recherche de signes d'alarme neurologique",
        category: "associated",
      },
    ]
  } else {
    // Questions générales si symptômes non spécifiques
    questions = [
      {
        id: 1,
        question: "Depuis quand ces symptômes ont-ils commencé?",
        type: "multiple_choice",
        options: ["Moins de 24h", "1-3 jours", "Une semaine", "Plus d'une semaine"],
        rationale: "Chronologie essentielle pour tout diagnostic",
        category: "chronology",
      },
      {
        id: 2,
        question: "Les symptômes s'aggravent-ils, s'améliorent-ils ou restent-ils stables?",
        type: "multiple_choice",
        options: ["S'aggravent", "S'améliorent", "Stables", "Fluctuent"],
        rationale: "Évolution des symptômes guide le diagnostic",
        category: "chronology",
      },
      {
        id: 3,
        question: "Avez-vous identifié des facteurs déclenchants?",
        type: "multiple_choice",
        options: ["Effort physique", "Stress", "Alimentation", "Aucun identifié"],
        rationale: "Facteurs déclenchants orientent le diagnostic",
        category: "symptom",
      },
    ]
  }

  return { questions }
}
