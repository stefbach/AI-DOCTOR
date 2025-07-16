import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { patientData, clinicalData, questionsData } = await request.json()

    // Validation des données d'entrée
    if (!patientData || !clinicalData) {
      return NextResponse.json({ success: false, error: "Données patient ou cliniques manquantes" }, { status: 400 })
    }

    // Construction du contexte complet
    const fullContext = `
PROFIL PATIENT COMPLET:
- Identité: ${patientData.firstName || "N/A"} ${patientData.lastName || "N/A"}
- Âge: ${patientData.age || "N/A"} ans
- Sexe: ${patientData.gender || "N/A"}
- Poids: ${patientData.weight || "N/A"} kg, Taille: ${patientData.height || "N/A"} cm
- IMC: ${patientData.weight && patientData.height ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : "N/A"}
- Groupe sanguin: ${patientData.bloodType || "N/A"}
- Allergies: ${(patientData.allergies || []).join(", ") || "Aucune connue"}
- Antécédents médicaux: ${(patientData.medicalHistory || []).join(", ") || "Aucun"}
- Médicaments actuels: ${(patientData.currentMedications || []).join(", ") || "Aucun"}
- Habitudes de vie:
  * Tabac: ${patientData.lifeHabits?.smoking || "N/A"}
  * Alcool: ${patientData.lifeHabits?.alcohol || "N/A"}
  * Activité physique: ${patientData.lifeHabits?.physicalActivity || "N/A"}

PRÉSENTATION CLINIQUE:
- Motif de consultation: ${clinicalData.chiefComplaint || "N/A"}
- Symptômes présents: ${(clinicalData.symptoms || []).join(", ") || "Aucun"}
- Durée d'évolution: ${clinicalData.symptomDuration || "N/A"}
- Signes vitaux:
  * Température: ${clinicalData.vitalSigns?.temperature || "N/A"}°C
  * Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate || "N/A"} bpm
  * Tension artérielle: ${clinicalData.vitalSigns?.bloodPressureSystolic || "N/A"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "N/A"} mmHg
- Échelle de douleur: ${clinicalData.painScale || 0}/10
- Impact fonctionnel: ${clinicalData.functionalStatus || "N/A"}
- Notes cliniques: ${clinicalData.notes || "Aucune"}

RÉPONSES AUX QUESTIONS SPÉCIALISÉES:
${
  questionsData?.responses
    ? questionsData.responses.map((r: any) => `- ${r.question}: ${r.answer}`).join("\n")
    : "Aucune question supplémentaire posée"
}
    `.trim()

    const diagnosticPrompt = `
Tu es un médecin expert spécialisé en médecine interne. Analyse ce cas clinique complet et fournis un diagnostic expert structuré.

${fullContext}

INSTRUCTIONS POUR L'ANALYSE DIAGNOSTIQUE:

1. RAISONNEMENT CLINIQUE STRUCTURÉ
   - Analyse sémiologique détaillée
   - Identification des syndromes cliniques
   - Corrélations anatomo-cliniques

2. DIAGNOSTIC DIFFÉRENTIEL HIÉRARCHISÉ
   - Diagnostic principal le plus probable (avec probabilité %)
   - 3-5 diagnostics différentiels classés par probabilité
   - Arguments pour et contre chaque diagnostic

3. EXAMENS COMPLÉMENTAIRES CIBLÉS
   - Examens biologiques spécifiques
   - Imagerie médicale appropriée
   - Explorations fonctionnelles si nécessaire

4. STRATÉGIE THÉRAPEUTIQUE BASÉE SUR LES PREUVES
   - Traitement symptomatique immédiat
   - Thérapeutique étiologique
   - Surveillance et suivi

5. PRONOSTIC ET ÉVOLUTION
   - Facteurs pronostiques
   - Complications potentielles
   - Plan de suivi

Réponds UNIQUEMENT avec un objet JSON structuré dans ce format exact:

{
  "clinicalReasoning": {
    "semiology": "Analyse sémiologique détaillée",
    "syndromes": ["Syndrome 1", "Syndrome 2"],
    "pathophysiology": "Mécanismes physiopathologiques"
  },
  "primaryDiagnosis": {
    "condition": "Diagnostic principal",
    "icd10": "Code CIM-10",
    "probability": 85,
    "arguments": ["Argument 1", "Argument 2", "Argument 3"],
    "severity": "Légère/Modérée/Sévère"
  },
  "differentialDiagnosis": [
    {
      "condition": "Diagnostic différentiel 1",
      "icd10": "Code CIM-10",
      "probability": 60,
      "arguments": ["Argument pour", "Argument contre"]
    }
  ],
  "recommendedExams": [
    {
      "category": "Biologie",
      "exam": "NFS, CRP, VS",
      "indication": "Recherche syndrome inflammatoire",
      "urgency": "Immédiate/Programmée"
    },
    {
      "category": "Imagerie",
      "exam": "Radiographie thoracique",
      "indication": "Éliminer pathologie pulmonaire",
      "urgency": "Immédiate"
    }
  ],
  "therapeuticStrategy": {
    "immediate": [
      {
        "type": "Symptomatique",
        "treatment": "Paracétamol 1g x3/j",
        "indication": "Antalgique",
        "duration": "5 jours"
      }
    ],
    "etiological": [
      {
        "type": "Étiologique",
        "treatment": "Selon résultats examens",
        "indication": "Traitement de la cause",
        "duration": "À définir"
      }
    ]
  },
  "prognosis": {
    "shortTerm": "Favorable sous traitement",
    "longTerm": "Excellent avec prise en charge adaptée",
    "complications": ["Complication 1", "Complication 2"],
    "followUp": "Consultation de contrôle à 1 semaine"
  },
  "aiConfidence": 85,
  "redFlags": ["Signe d'alarme 1", "Signe d'alarme 2"],
  "metadata": {
    "analysisDate": "${new Date().toISOString()}",
    "model": "gpt-4o",
    "evidenceLevel": "Grade A/B/C"
  }
}

Génère maintenant l'analyse diagnostique complète en JSON:
    `.trim()

    console.log("Génération du diagnostic expert...")

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: diagnosticPrompt,
      maxTokens: 12000,
      temperature: 0.1,
    })

    console.log("Réponse diagnostic reçue:", result.text.substring(0, 500) + "...")

    // Extraction et parsing du JSON
    let diagnosticData
    try {
      diagnosticData = JSON.parse(result.text.trim())
    } catch (parseError) {
      console.log("Parsing direct échoué, extraction JSON...")

      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          diagnosticData = JSON.parse(jsonMatch[0])
        } catch (regexParseError) {
          console.error("Erreur parsing regex:", regexParseError)
          throw new Error("Format JSON invalide")
        }
      } else {
        throw new Error("Aucun JSON trouvé dans la réponse")
      }
    }

    // Validation de la structure
    if (!diagnosticData || !diagnosticData.primaryDiagnosis) {
      throw new Error("Structure de diagnostic invalide")
    }

    console.log("Diagnostic généré avec succès")

    return NextResponse.json({
      success: true,
      diagnosis: diagnosticData,
      metadata: {
        patientAge: patientData.age,
        patientGender: patientData.gender,
        symptomsAnalyzed: (clinicalData.symptoms || []).length,
        questionsAnswered: questionsData?.responses?.length || 0,
        generatedAt: new Date().toISOString(),
        model: "gpt-4o",
        tokens: 12000,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la génération du diagnostic:", error)

    // Fallback diagnostic générique
    const fallbackDiagnosis = {
      clinicalReasoning: {
        semiology: "Analyse en cours - données insuffisantes pour analyse complète",
        syndromes: ["Syndrome à préciser"],
        pathophysiology: "Mécanismes à élucider par examens complémentaires",
      },
      primaryDiagnosis: {
        condition: "Diagnostic à préciser",
        icd10: "R06.9",
        probability: 50,
        arguments: ["Symptômes non spécifiques", "Nécessité d'examens complémentaires"],
        severity: "À évaluer",
      },
      differentialDiagnosis: [
        {
          condition: "Pathologie fonctionnelle",
          icd10: "F45.9",
          probability: 30,
          arguments: ["Symptômes sans substrat organique évident"],
        },
      ],
      recommendedExams: [
        {
          category: "Biologie",
          exam: "Bilan biologique standard",
          indication: "Dépistage anomalies biologiques",
          urgency: "Programmée",
        },
      ],
      therapeuticStrategy: {
        immediate: [
          {
            type: "Symptomatique",
            treatment: "Traitement symptomatique adapté",
            indication: "Soulagement des symptômes",
            duration: "Selon évolution",
          },
        ],
        etiological: [],
      },
      prognosis: {
        shortTerm: "À réévaluer après examens",
        longTerm: "Dépendant du diagnostic final",
        complications: ["À surveiller"],
        followUp: "Consultation de réévaluation nécessaire",
      },
      aiConfidence: 30,
      redFlags: ["Évolution défavorable", "Nouveaux symptômes"],
      metadata: {
        analysisDate: new Date().toISOString(),
        model: "fallback",
        evidenceLevel: "Insuffisant",
      },
    }

    return NextResponse.json({
      success: true,
      diagnosis: fallbackDiagnosis,
      fallback: true,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      metadata: {
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
      },
    })
  }
}
