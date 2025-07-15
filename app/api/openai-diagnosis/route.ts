import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API DIAGNOSTIC IA - Début de l'analyse")

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "Clé API OpenAI manquante",
          success: false,
        },
        { status: 500 },
      )
    }

    const requestData = await request.json()
    console.log("📝 Données reçues:", {
      hasPatient: !!requestData.patientData,
      hasClinical: !!requestData.clinicalData,
      hasQuestions: !!requestData.questionsData,
    })

    const { patientData, clinicalData, questionsData } = requestData

    // Validation des données minimales
    if (!patientData && !clinicalData) {
      return NextResponse.json(
        {
          error: "Données patient ou cliniques requises",
          success: false,
        },
        { status: 400 },
      )
    }

    // Construction du prompt de diagnostic
    const diagnosticPrompt = createDiagnosticPrompt(patientData, clinicalData, questionsData)

    console.log("🧠 Génération du diagnostic avec OpenAI...")
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: diagnosticPrompt,
      system: `Vous êtes un médecin expert spécialisé en diagnostic médical avec une expertise approfondie en médecine interne, urgences et médecine tropicale.
  
  INSTRUCTIONS DÉTAILLÉES:
  - Analysez méticuleusement TOUTES les données fournies (anamnèse, examen clinique, questionnaire)
  - Proposez un diagnostic principal avec niveau de confiance basé sur l'evidence-based medicine
  - Développez un raisonnement diagnostique structuré et détaillé
  - Listez les diagnostics différentiels avec probabilités et justifications
  - Recommandez des examens complémentaires spécifiques et justifiés
  - Suggérez un plan thérapeutique détaillé avec posologies et durées
  - Identifiez les facteurs de risque et les complications potentielles
  - Proposez un plan de surveillance adapté
  - Intégrez les spécificités liées à l'âge, au sexe et aux antécédents
  - Répondez UNIQUEMENT en JSON valide avec un maximum de détails cliniques
  - Soyez précis, professionnel et basé sur les guidelines internationales`,
      temperature: 0.1, // Plus déterministe pour la précision diagnostique
      maxTokens: 12000, // Considérablement augmenté pour des diagnostics très détaillés
    })

    let diagnosticData
    try {
      // Nettoyage de la réponse
      let cleanResponse = result.text.trim()
      cleanResponse = cleanResponse.replace(/```json\n?|\n?```/g, "")

      const firstBrace = cleanResponse.indexOf("{")
      const lastBrace = cleanResponse.lastIndexOf("}")

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1)
      }

      diagnosticData = JSON.parse(cleanResponse)
      console.log("✅ Diagnostic parsé avec succès")
    } catch (parseError) {
      console.error("❌ Erreur parsing:", parseError)
      console.log("Réponse brute:", result.text)

      // Fallback avec diagnostic de base
      diagnosticData = generateFallbackDiagnosis(patientData, clinicalData, questionsData)
    }

    // Structuration de la réponse
    const response = {
      success: true,
      timestamp: new Date().toISOString(),

      // Diagnostic principal
      primaryDiagnosis: {
        condition: diagnosticData.primaryDiagnosis?.condition || "Syndrome clinique nécessitant évaluation",
        confidence: diagnosticData.primaryDiagnosis?.confidence || 70,
        reasoning: diagnosticData.primaryDiagnosis?.reasoning || "Basé sur les données cliniques disponibles",
        supportingEvidence: diagnosticData.primaryDiagnosis?.supportingEvidence || [],
        contradictingEvidence: diagnosticData.primaryDiagnosis?.contradictingEvidence || [],
        nextSteps: diagnosticData.primaryDiagnosis?.nextSteps || ["Examens complémentaires"],
      },

      // Diagnostics différentiels
      differentialDiagnoses: diagnosticData.differentialDiagnoses || [],

      // Recommandations
      recommendedTests: diagnosticData.recommendedTests || ["Bilan biologique de base"],
      treatmentSuggestions: diagnosticData.treatmentSuggestions || ["Traitement symptomatique"],

      // Suivi
      followUpPlan: diagnosticData.followUpPlan || "Réévaluation clinique recommandée",
      riskFactors: diagnosticData.riskFactors || [],
      prognosisNotes: diagnosticData.prognosisNotes || "Pronostic à déterminer",

      // Métadonnées
      confidence: diagnosticData.confidence || diagnosticData.primaryDiagnosis?.confidence || 70,

      metadata: {
        generatedAt: new Date().toISOString(),
        model: "gpt-4o",
        dataCompleteness: calculateDataCompleteness(patientData, clinicalData, questionsData),
      },
    }

    console.log("✅ Diagnostic généré avec succès")
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur API Diagnostic:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la génération du diagnostic",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function createDiagnosticPrompt(patientData: any, clinicalData: any, questionsData: any): string {
  return `
ANALYSE DIAGNOSTIQUE MÉDICALE

=== DONNÉES PATIENT ===
${JSON.stringify(patientData, null, 2)}

=== DONNÉES CLINIQUES ===
${JSON.stringify(clinicalData, null, 2)}

=== RÉPONSES QUESTIONNAIRE ===
${JSON.stringify(questionsData, null, 2)}

=== MISSION DIAGNOSTIQUE ===

Analysez ces données médicales et fournissez un diagnostic complet.

RÉPONDEZ UNIQUEMENT AVEC CE FORMAT JSON ÉTENDU:
{
  "primaryDiagnosis": {
    "condition": "Nom précis du diagnostic principal avec code CIM-10 si applicable",
    "confidence": 85,
    "reasoning": "Raisonnement diagnostique détaillé étape par étape avec analyse des signes cliniques",
    "supportingEvidence": [
      "Élément clinique supportant 1 avec justification physiopathologique",
      "Élément clinique supportant 2 avec corrélation sémiologique",
      "Élément anamnestique pertinent avec contexte clinique"
    ],
    "contradictingEvidence": [
      "Élément contre le diagnostic avec explication de l'écart"
    ],
    "nextSteps": [
      "Examen complémentaire prioritaire avec justification",
      "Surveillance clinique spécifique avec critères",
      "Consultation spécialisée si nécessaire avec délai"
    ],
    "severity": "mild|moderate|severe|critical",
    "prognosis": "Pronostic détaillé à court et moyen terme",
    "complications": ["Complication potentielle 1", "Complication potentielle 2"],
    "pathophysiology": "Explication physiopathologique concise"
  },
  "differentialDiagnoses": [
    {
      "condition": "Diagnostic différentiel 1 avec code CIM-10",
      "probability": 60,
      "reasoning": "Justification détaillée avec analyse comparative",
      "investigationNeeded": "Examens spécifiques pour confirmer/infirmer avec seuils décisionnels",
      "clinicalPearls": "Points clés diagnostiques et pièges à éviter"
    }
  ],
  "recommendedTests": [
    {
      "test": "Nom de l'examen",
      "indication": "Justification médicale précise",
      "priority": "urgent|high|medium|low",
      "expectedResults": "Résultats attendus selon l'hypothèse diagnostique",
      "interpretation": "Comment interpréter les résultats"
    }
  ],
  "treatmentSuggestions": [
    {
      "medication": "Nom du médicament",
      "dosage": "Posologie précise",
      "duration": "Durée avec justification",
      "indication": "Justification thérapeutique",
      "contraindications": ["Contre-indication 1", "Contre-indication 2"],
      "monitoring": "Surveillance nécessaire",
      "alternatives": "Alternatives thérapeutiques si échec"
    }
  ],
  "followUpPlan": {
    "shortTerm": "Plan de suivi à 24-48h avec critères de réévaluation",
    "mediumTerm": "Suivi à 1-2 semaines avec objectifs thérapeutiques",
    "longTerm": "Surveillance à long terme et prévention",
    "redFlags": ["Signal d'alarme 1", "Signal d'alarme 2"],
    "patientEducation": "Points clés d'éducation thérapeutique"
  },
  "riskFactors": [
    {
      "factor": "Facteur de risque identifié",
      "impact": "Impact sur le pronostic",
      "management": "Prise en charge spécifique"
    }
  ],
  "prognosisNotes": "Analyse pronostique détaillée avec facteurs influençant l'évolution",
  "confidence": 85,
  "evidenceLevel": "Niveau de preuve des recommandations (A, B, C)",
  "guidelines": ["Référence guideline 1", "Référence guideline 1"],
  "specialConsiderations": {
    "age": "Considérations spécifiques à l'âge",
    "gender": "Considérations liées au sexe",
    "comorbidities": "Impact des comorbidités",
    "drugInteractions": "Interactions médicamenteuses potentielles"
  }
}

EXIGENCES:
- Analysez TOUTES les données fournies
- Soyez précis et professionnel
- Basez-vous sur des connaissances médicales établies
- Adaptez le niveau de confiance selon la qualité des données
- Répondez UNIQUEMENT en JSON valide
`
}

function generateFallbackDiagnosis(patientData: any, clinicalData: any, questionsData: any) {
  const chiefComplaint = clinicalData?.chiefComplaint || "Symptômes non spécifiés"
  const age = patientData?.age || 0

  let primaryCondition = "Syndrome clinique nécessitant évaluation médicale"
  let confidence = 60

  // Diagnostic basé sur le motif de consultation
  if (chiefComplaint.toLowerCase().includes("douleur")) {
    primaryCondition = "Syndrome douloureux - évaluation nécessaire"
    confidence = 65
  } else if (chiefComplaint.toLowerCase().includes("fièvre")) {
    primaryCondition = "Syndrome fébrile"
    confidence = 70
  } else if (chiefComplaint.toLowerCase().includes("fatigue")) {
    primaryCondition = "Syndrome asthénique"
    confidence = 60
  }

  return {
    primaryDiagnosis: {
      condition: primaryCondition,
      confidence: confidence,
      reasoning: `Analyse basée sur le motif de consultation: "${chiefComplaint}". Évaluation médicale complète recommandée.`,
      supportingEvidence: [
        `Motif de consultation: ${chiefComplaint}`,
        `Patient de ${age} ans`,
        "Données cliniques collectées",
      ],
      contradictingEvidence: [],
      nextSteps: ["Examen clinique complet", "Examens complémentaires selon orientation", "Réévaluation clinique"],
    },
    differentialDiagnoses: [
      {
        condition: "Pathologie organique spécifique",
        probability: 50,
        reasoning: "À explorer selon les symptômes présentés",
        investigationNeeded: "Examens biologiques et imagerie orientés",
      },
      {
        condition: "Pathologie fonctionnelle",
        probability: 40,
        reasoning: "En l'absence d'éléments organiques évidents",
        investigationNeeded: "Évaluation psychosomatique",
      },
    ],
    recommendedTests: [
      "Bilan biologique standard (NFS, CRP, ionogramme)",
      "Examens d'imagerie selon orientation clinique",
      "Consultations spécialisées si nécessaire",
    ],
    treatmentSuggestions: [
      "Traitement symptomatique adapté",
      "Mesures générales (repos, hydratation)",
      "Surveillance évolution clinique",
    ],
    followUpPlan: "Réévaluation clinique dans 48-72h ou selon évolution des symptômes",
    riskFactors: [],
    prognosisNotes: "Pronostic à déterminer après évaluation médicale complète",
    confidence: confidence,
  }
}

function calculateDataCompleteness(patientData: any, clinicalData: any, questionsData: any): number {
  let score = 0
  let maxScore = 0

  // Données patient (30%)
  maxScore += 30
  if (patientData?.age) score += 10
  if (patientData?.gender) score += 5
  if (patientData?.medicalHistory?.length > 0) score += 10
  if (patientData?.currentMedications?.length > 0) score += 5

  // Données cliniques (50%)
  maxScore += 50
  if (clinicalData?.chiefComplaint) score += 20
  if (clinicalData?.symptoms?.length > 0) score += 15
  if (clinicalData?.vitalSigns) score += 10
  if (clinicalData?.symptomDuration) score += 5

  // Questions (20%)
  maxScore += 20
  if (questionsData?.responses?.length > 0) score += 20

  return Math.round((score / maxScore) * 100)
}
