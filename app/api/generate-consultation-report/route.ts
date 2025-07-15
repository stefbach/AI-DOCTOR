import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { allData } = await request.json()

    if (!allData) {
      return NextResponse.json({ success: false, error: "Données complètes requises" }, { status: 400 })
    }

    const { patientData, clinicalData, questionsData, diagnosisData, examsData, medicationData } = allData

    // Prompt ultra-détaillé pour un rapport de consultation complet
    const prompt = `Tu es un médecin expert rédacteur de comptes-rendus de consultation. Tu dois générer un rapport médical complet, structuré et professionnel.

DONNÉES COMPLÈTES DE LA CONSULTATION:

PATIENT:
- Nom: ${patientData.firstName} ${patientData.lastName}
- Âge: ${patientData.age} ans, Sexe: ${patientData.gender}
- Poids: ${patientData.weight}kg, Taille: ${patientData.height}cm
- Groupe sanguin: ${patientData.bloodType}
- Antécédents: ${patientData.medicalHistory?.join(", ") || "Aucun"}
- Traitements: ${patientData.currentMedications?.join(", ") || "Aucun"}
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"}
- Habitudes: Tabac: ${patientData.lifeHabits?.smoking}, Alcool: ${patientData.lifeHabits?.alcohol}

CONSULTATION:
- Motif: ${clinicalData.chiefComplaint}
- Symptômes: ${clinicalData.symptoms?.join(", ")}
- Durée: ${clinicalData.symptomDuration}
- Signes vitaux: T°${clinicalData.vitalSigns?.temperature}°C, FC:${clinicalData.vitalSigns?.heartRate}, TA:${clinicalData.vitalSigns?.bloodPressureSystolic}/${clinicalData.vitalSigns?.bloodPressureDiastolic}
- Douleur: ${clinicalData.painScale}/10
- Impact: ${clinicalData.functionalStatus}

INTERROGATOIRE COMPLÉMENTAIRE:
${questionsData?.responses?.map((r: any) => `- ${r.question}: ${r.answer}`).join("\n") || "Non réalisé"}

DIAGNOSTIC IA:
- Principal: ${diagnosisData?.data?.diagnosticAnalysis?.primaryDiagnosis?.condition || "Non généré"}
- Confiance: ${diagnosisData?.data?.diagnosticAnalysis?.primaryDiagnosis?.confidence || 0}%
- Différentiels: ${diagnosisData?.data?.diagnosticAnalysis?.differentialDiagnoses?.map((d: any) => d.condition).join(", ") || "Non générés"}

EXAMENS PRESCRITS:
${examsData?.selectedExams?.map((e: any) => `- ${e.exam}: ${e.indication}`).join("\n") || "Aucun"}

TRAITEMENTS PRESCRITS:
${medicationData?.selectedMedications?.map((m: any) => `- ${m.medication}: ${m.dosage}`).join("\n") || "Aucun"}

MISSION: Génère un compte-rendu de consultation médical complet, professionnel et structuré selon les standards hospitaliers.

FORMAT OBLIGATOIRE (JSON):
{
  "success": true,
  "consultationReport": {
    "header": {
      "reportType": "Compte-rendu de consultation",
      "date": "${new Date().toLocaleDateString("fr-FR")}",
      "time": "${new Date().toLocaleTimeString("fr-FR")}",
      "physician": "Dr. TIBOK IA DOCTOR",
      "service": "Médecine Générale - Diagnostic IA",
      "reportId": "CR-${Date.now()}"
    },
    "patientIdentification": {
      "lastName": "${patientData.lastName}",
      "firstName": "${patientData.firstName}",
      "dateOfBirth": "${patientData.dateOfBirth}",
      "age": "${patientData.age} ans",
      "gender": "${patientData.gender}",
      "bloodType": "${patientData.bloodType}",
      "insurance": "${patientData.insuranceInfo?.provider} - ${patientData.insuranceInfo?.policyNumber}"
    },
    "consultationContext": {
      "consultationType": "Consultation de médecine générale",
      "referringPhysician": "Auto-consultation",
      "consultationReason": "${clinicalData.chiefComplaint}",
      "consultationDate": "${new Date().toLocaleDateString("fr-FR")}"
    },
    "medicalHistory": {
      "personalHistory": ${JSON.stringify(patientData.medicalHistory || [])},
      "currentMedications": ${JSON.stringify(patientData.currentMedications || [])},
      "allergies": ${JSON.stringify(patientData.allergies || [])},
      "lifeHabits": {
        "smoking": "${patientData.lifeHabits?.smoking}",
        "alcohol": "${patientData.lifeHabits?.alcohol}",
        "physicalActivity": "${patientData.lifeHabits?.physicalActivity}"
      }
    },
    "clinicalExamination": {
      "chiefComplaint": "${clinicalData.chiefComplaint}",
      "historyOfPresentIllness": "Synthèse narrative détaillée de l'histoire de la maladie actuelle",
      "reviewOfSystems": "Revue des systèmes basée sur les symptômes rapportés",
      "physicalExamination": {
        "generalAppearance": "Description de l'état général du patient",
        "vitalSigns": {
          "temperature": "${clinicalData.vitalSigns?.temperature}°C",
          "heartRate": "${clinicalData.vitalSigns?.heartRate}/min",
          "bloodPressure": "${clinicalData.vitalSigns?.bloodPressureSystolic}/${clinicalData.vitalSigns?.bloodPressureDiastolic} mmHg",
          "bmi": "${(patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1)}"
        },
        "systemicExamination": "Examen systémique détaillé par appareil",
        "painAssessment": "${clinicalData.painScale}/10",
        "functionalStatus": "${clinicalData.functionalStatus}"
      }
    },
    "diagnosticAssessment": {
      "clinicalImpression": "Impression clinique synthétique",
      "primaryDiagnosis": {
        "diagnosis": "${diagnosisData?.data?.diagnosticAnalysis?.primaryDiagnosis?.condition || "À préciser"}",
        "icd10Code": "${diagnosisData?.data?.diagnosticAnalysis?.primaryDiagnosis?.icd10Code || ""}",
        "confidence": "${diagnosisData?.data?.diagnosticAnalysis?.primaryDiagnosis?.confidence || 0}%",
        "severity": "${diagnosisData?.data?.diagnosticAnalysis?.primaryDiagnosis?.severity || "À évaluer"}",
        "clinicalReasoning": "Raisonnement clinique détaillé justifiant le diagnostic"
      },
      "differentialDiagnoses": "Liste des diagnostics différentiels avec probabilités",
      "riskAssessment": "Évaluation des risques immédiats et à long terme"
    },
    "investigationsAndResults": {
      "orderedTests": "Liste des examens prescrits avec indications",
      "pendingResults": "Examens en attente de résultats",
      "interpretations": "Interprétation des résultats disponibles"
    },
    "therapeuticPlan": {
      "immediateManagement": "Prise en charge immédiate",
      "medications": "Prescriptions médicamenteuses détaillées",
      "nonPharmacological": "Interventions non médicamenteuses",
      "lifestyle": "Recommandations hygiéno-diététiques"
    },
    "followUpPlan": {
      "nextAppointment": "Prochaine consultation programmée",
      "monitoring": "Surveillance nécessaire",
      "warningSignsToWatch": "Signes d'alarme à surveiller",
      "emergencyInstructions": "Instructions en cas d'urgence"
    },
    "patientEducation": {
      "diseaseExplanation": "Explication de la pathologie au patient",
      "treatmentExplanation": "Explication du traitement",
      "lifestyleAdvice": "Conseils de mode de vie",
      "resources": "Ressources éducatives fournies"
    },
    "professionalNotes": {
      "clinicalComplexity": "Évaluation de la complexité du cas",
      "aiAssistance": "Utilisation de l'IA dans le diagnostic",
      "qualityIndicators": "Indicateurs de qualité de la consultation",
      "continuityOfCare": "Éléments pour la continuité des soins"
    },
    "signatures": {
      "physician": "Dr. TIBOK IA DOCTOR",
      "date": "${new Date().toLocaleDateString("fr-FR")}",
      "electronicSignature": "Signature électronique validée",
      "medicalLicense": "Système IA certifié médical"
    }
  },
  "metadata": {
    "generationTimestamp": "${new Date().toISOString()}",
    "aiModel": "GPT-4o",
    "reportVersion": "1.0",
    "dataIntegrity": "Vérifiée",
    "confidentiality": "Confidentiel médical"
  }
}

EXIGENCES QUALITÉ:
1. Rapport médical professionnel et structuré
2. Terminologie médicale appropriée
3. Synthèse narrative fluide et cohérente
4. Respect des standards de documentation médicale
5. Intégration harmonieuse de toutes les données
6. Recommandations pratiques et réalisables
7. Considération des aspects médico-légaux
8. Format adapté à l'archivage et au partage

ATTENTION: Réponse en français médical professionnel, complète et détaillée.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Tu es un médecin expert en rédaction de comptes-rendus médicaux. Tu génères des rapports complets, structurés et professionnels.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 16000, // Augmenté pour un rapport complet et détaillé
      temperature: 0.1,
      response_format: { type: "json_object" },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("Pas de réponse de OpenAI")
    }

    const parsedResponse = JSON.parse(response)

    if (!parsedResponse.success) {
      throw new Error("Erreur dans la génération du rapport")
    }

    return NextResponse.json({
      success: true,
      ...parsedResponse,
      usage: completion.usage,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Erreur génération rapport:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de la génération du rapport",
      },
      { status: 500 },
    )
  }
}
