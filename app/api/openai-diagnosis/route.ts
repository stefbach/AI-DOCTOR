import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🩺 API Diagnostic IA - Début")

    let requestData: {
      patientData?: any
      clinicalData?: any
      questionsData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour diagnostic IA")
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON diagnostic:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { patientData, clinicalData, questionsData } = requestData

    if (!patientData || !clinicalData) {
      console.log("⚠️ Données manquantes pour le diagnostic")
      return NextResponse.json(
        {
          error: "Données patient et cliniques requises",
          success: false,
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Diagnostic IA pour: ${patientData.firstName} ${patientData.lastName}`)

    const prompt = `
En tant qu'expert médical IA spécialisé en diagnostic, analysez ce cas clinique complet et fournissez un diagnostic structuré.

PATIENT:
- Identité: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
- Morphologie: ${patientData.weight}kg, ${patientData.height}cm (IMC: ${(patientData.weight / (patientData.height / 100) ** 2).toFixed(1)})
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
- Antécédents: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}
- Médicaments actuels: ${patientData.currentMedicationsText || "Aucun"}
- Habitudes: Tabac: ${patientData.lifeHabits?.smoking || "Non renseigné"}, Alcool: ${patientData.lifeHabits?.alcohol || "Non renseigné"}

DONNÉES CLINIQUES:
- Motif de consultation: ${clinicalData.chiefComplaint || "Non renseigné"}
- Symptômes détaillés: ${clinicalData.symptoms || "Non renseigné"}
- Examen physique: ${clinicalData.physicalExam || "Non renseigné"}
- Signes vitaux: 
  * Température: ${clinicalData.vitalSigns?.temperature || "?"}°C
  * Tension artérielle: ${clinicalData.vitalSigns?.bloodPressure || "?"}
  * Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate || "?"}/min
  * Fréquence respiratoire: ${clinicalData.vitalSigns?.respiratoryRate || "?"}/min
  * Saturation O2: ${clinicalData.vitalSigns?.oxygenSaturation || "?"}%

RÉPONSES AUX QUESTIONS IA:
${questionsData?.responses ? JSON.stringify(questionsData.responses, null, 2) : "Aucune réponse disponible"}

ANALYSE DIAGNOSTIQUE REQUISE:

Fournissez un diagnostic médical structuré au format JSON suivant:

{
  "diagnosis": {
    "primary": {
      "condition": "Nom exact de la pathologie principale",
      "icd10": "Code CIM-10 correspondant",
      "confidence": 85,
      "rationale": "Raisonnement médical détaillé expliquant pourquoi ce diagnostic est le plus probable",
      "severity": "mild|moderate|severe"
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel 1",
        "probability": 15,
        "rationale": "Pourquoi ce diagnostic est possible mais moins probable",
        "ruleOutTests": ["Examen 1", "Examen 2"]
      },
      {
        "condition": "Diagnostic différentiel 2", 
        "probability": 10,
        "rationale": "Arguments pour et contre ce diagnostic",
        "ruleOutTests": ["Examen 3"]
      }
    ]
  },
  "recommendations": {
    "exams": [
      {
        "name": "Nom de l'examen",
        "code": "Code NABM si applicable",
        "category": "biologie|imagerie|fonctionnel|spécialisé",
        "indication": "Justification médicale",
        "priority": "high|medium|low"
      }
    ],
    "medications": [
      {
        "name": "DCI du médicament",
        "dosage": "Posologie précise",
        "frequency": "Fréquence de prise",
        "duration": "Durée de traitement",
        "indication": "Indication thérapeutique",
        "contraindications": ["Contre-indication 1", "Contre-indication 2"]
      }
    ]
  },
  "riskFactors": ["Facteur de risque 1", "Facteur de risque 2"],
  "prognosis": "Pronostic détaillé avec évolution attendue",
  "followUp": "Plan de suivi avec échéances",
  "urgencyLevel": 3,
  "redFlags": ["Signe d'alarme 1", "Signe d'alarme 2"]
}

Analysez méticuleusement tous les éléments fournis et fournissez un diagnostic précis, evidence-based et adapté au contexte mauricien.
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.2,
      maxTokens: 3000,
    })

    console.log("🧠 Diagnostic IA généré")

    // Tentative de parsing JSON avec fallback robuste
    let diagnosticData
    try {
      // Nettoyer le texte avant parsing
      let cleanedText = result.text.trim()

      // Extraire le JSON s'il est entouré de texte
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      diagnosticData = JSON.parse(cleanedText)

      // Validation de la structure minimale
      if (!diagnosticData.diagnosis || !diagnosticData.diagnosis.primary) {
        throw new Error("Structure diagnostic invalide")
      }

      console.log(`✅ Diagnostic parsé: ${diagnosticData.diagnosis.primary.condition}`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON diagnostic, génération de fallback")

      // Diagnostic de fallback basé sur les symptômes
      diagnosticData = generateFallbackDiagnosis(patientData, clinicalData, result.text)
    }

    const response = {
      success: true,
      diagnosis: diagnosticData.diagnosis,
      recommendations: diagnosticData.recommendations || {
        exams: [],
        medications: [],
      },
      riskFactors: diagnosticData.riskFactors || [],
      prognosis: diagnosticData.prognosis || "Pronostic à évaluer selon l'évolution",
      followUp: diagnosticData.followUp || "Suivi à programmer selon les résultats",
      urgencyLevel: diagnosticData.urgencyLevel || 3,
      redFlags: diagnosticData.redFlags || [],
      metadata: {
        patientAge: patientData.age,
        patientGender: patientData.gender,
        chiefComplaint: clinicalData.chiefComplaint,
        aiModel: "gpt-4o",
        confidence: diagnosticData.diagnosis?.primary?.confidence || 75,
        generatedAt: new Date().toISOString(),
      },
      rawAiResponse: result.text, // Pour debug
    }

    console.log(`✅ Diagnostic IA retourné: ${diagnosticData.diagnosis.primary.condition}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Diagnostic IA:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du diagnostic",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function generateFallbackDiagnosis(patientData: any, clinicalData: any, aiText: string) {
  // Diagnostic de fallback basé sur des patterns communs
  const symptoms = clinicalData.symptoms?.toLowerCase() || ""
  const age = patientData.age || 0

  let primaryCondition = "Syndrome clinique à préciser"
  let icd10 = "R69"
  let confidence = 60
  const severity = "moderate"

  // Patterns symptomatiques courants
  if (symptoms.includes("fièvre") && symptoms.includes("toux")) {
    primaryCondition = "Infection respiratoire haute"
    icd10 = "J06.9"
    confidence = 75
  } else if (symptoms.includes("douleur") && symptoms.includes("abdomen")) {
    primaryCondition = "Douleur abdominale non spécifique"
    icd10 = "R10.9"
    confidence = 70
  } else if (symptoms.includes("céphalée") || symptoms.includes("mal de tête")) {
    primaryCondition = "Céphalée de tension"
    icd10 = "G44.2"
    confidence = 65
  } else if (symptoms.includes("fatigue") || symptoms.includes("asthénie")) {
    primaryCondition = "Asthénie non spécifique"
    icd10 = "R53"
    confidence = 60
  }

  // Ajustements selon l'âge
  if (age > 65 && symptoms.includes("confusion")) {
    primaryCondition = "Syndrome confusionnel du sujet âgé"
    icd10 = "F05.9"
    confidence = 70
  }

  return {
    diagnosis: {
      primary: {
        condition: primaryCondition,
        icd10: icd10,
        confidence: confidence,
        rationale: `Diagnostic de fallback basé sur les symptômes rapportés: ${symptoms.substring(0, 100)}...`,
        severity: severity,
      },
      differential: [
        {
          condition: "Pathologie organique à éliminer",
          probability: 25,
          rationale: "Nécessite des examens complémentaires pour éliminer une cause organique",
          ruleOutTests: ["Biologie standard", "Imagerie selon orientation"],
        },
        {
          condition: "Cause fonctionnelle",
          probability: 15,
          rationale: "Possible origine fonctionnelle si examens normaux",
          ruleOutTests: ["Bilan biologique"],
        },
      ],
    },
    recommendations: {
      exams: [
        {
          name: "Bilan biologique standard",
          code: "BIOL001",
          category: "biologie",
          indication: "Bilan de débrouillage",
          priority: "medium",
        },
      ],
      medications: [
        {
          name: "Traitement symptomatique",
          dosage: "Selon symptômes",
          frequency: "Selon besoin",
          duration: "Court terme",
          indication: "Traitement symptomatique",
          contraindications: ["Allergie connue"],
        },
      ],
    },
    riskFactors: ["Âge", "Antécédents médicaux"],
    prognosis: "Pronostic généralement favorable avec prise en charge adaptée",
    followUp: "Réévaluation dans 48-72h si pas d'amélioration",
    urgencyLevel: 3,
    redFlags: ["Aggravation des symptômes", "Nouveaux symptômes"],
  }
}
