import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const allData = await request.json()

    if (!allData || !allData.patientData || !allData.clinicalData) {
      return NextResponse.json(
        { success: false, error: "Données insuffisantes pour générer le rapport" },
        { status: 400 },
      )
    }

    const { patientData, clinicalData, questionsData, diagnosisData } = allData

    // Construction du contexte complet pour le rapport
    const reportContext = `
DONNÉES PATIENT:
- Nom: ${patientData.firstName || "N/A"} ${patientData.lastName || "N/A"}
- Âge: ${patientData.age || "N/A"} ans
- Sexe: ${patientData.gender || "N/A"}
- Poids: ${patientData.weight || "N/A"} kg, Taille: ${patientData.height || "N/A"} cm
- Groupe sanguin: ${patientData.bloodType || "N/A"}
- Allergies: ${(patientData.allergies || []).join(", ") || "Aucune"}
- Antécédents: ${(patientData.medicalHistory || []).join(", ") || "Aucun"}
- Traitements actuels: ${(patientData.currentMedications || []).join(", ") || "Aucun"}

CONSULTATION:
- Motif: ${clinicalData.chiefComplaint || "N/A"}
- Symptômes: ${(clinicalData.symptoms || []).join(", ") || "Aucun"}
- Durée: ${clinicalData.symptomDuration || "N/A"}
- Signes vitaux: T°${clinicalData.vitalSigns?.temperature || "N/A"}°C, FC${clinicalData.vitalSigns?.heartRate || "N/A"}bpm, TA${clinicalData.vitalSigns?.bloodPressureSystolic || "N/A"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "N/A"}mmHg
- Douleur: ${clinicalData.painScale || 0}/10
- Impact fonctionnel: ${clinicalData.functionalStatus || "N/A"}

DIAGNOSTIC IA:
${
  diagnosisData?.diagnosis
    ? `
- Diagnostic principal: ${diagnosisData.diagnosis.primaryDiagnosis?.condition || "Non déterminé"}
- Probabilité: ${diagnosisData.diagnosis.primaryDiagnosis?.probability || 0}%
- Examens recommandés: ${diagnosisData.diagnosis.recommendedExams?.map((e: any) => e.exam).join(", ") || "Aucun"}
- Traitement: ${diagnosisData.diagnosis.therapeuticStrategy?.immediate?.map((t: any) => t.treatment).join(", ") || "Aucun"}
`
    : "Diagnostic non généré"
}

QUESTIONS SPÉCIALISÉES:
${
  questionsData?.responses
    ? questionsData.responses.map((r: any) => `- ${r.question}: ${r.answer}`).join("\n")
    : "Aucune question supplémentaire"
}
    `.trim()

    const reportPrompt = `
Tu es un médecin expert qui doit rédiger un compte-rendu de consultation médical professionnel et structuré.

${reportContext}

INSTRUCTIONS POUR LE RAPPORT:

1. Respecte la structure hospitalière française standard
2. Utilise un langage médical précis et professionnel
3. Inclus toutes les informations pertinentes
4. Propose des recommandations de suivi
5. Assure la traçabilité et la qualité du dossier médical

Génère un rapport complet au format JSON avec cette structure exacte:

{
  "header": {
    "title": "COMPTE-RENDU DE CONSULTATION",
    "date": "${new Date().toLocaleDateString("fr-FR")}",
    "time": "${new Date().toLocaleTimeString("fr-FR")}",
    "physician": "Dr. TIBOK IA DOCTOR",
    "service": "Médecine Générale - Consultation IA",
    "establishment": "Centre Médical TIBOK"
  },
  "patientIdentification": {
    "lastName": "${patientData.lastName || "N/A"}",
    "firstName": "${patientData.firstName || "N/A"}",
    "birthDate": "${patientData.dateOfBirth || "N/A"}",
    "age": "${patientData.age || "N/A"} ans",
    "gender": "${patientData.gender || "N/A"}",
    "weight": "${patientData.weight || "N/A"} kg",
    "height": "${patientData.height || "N/A"} cm",
    "bloodType": "${patientData.bloodType || "N/A"}"
  },
  "anamnesis": {
    "chiefComplaint": "Motif de consultation détaillé",
    "historyOfPresentIllness": "Histoire de la maladie actuelle structurée",
    "reviewOfSystems": "Revue des systèmes pertinente",
    "pastMedicalHistory": "Antécédents médicaux significatifs",
    "medications": "Traitements actuels et observance",
    "allergies": "Allergies connues et réactions",
    "socialHistory": "Habitudes de vie et facteurs de risque"
  },
  "physicalExamination": {
    "vitalSigns": "Signes vitaux complets et interprétation",
    "generalAppearance": "État général et aspect clinique",
    "systemicExamination": "Examen clinique par appareils",
    "painAssessment": "Évaluation de la douleur et retentissement",
    "functionalStatus": "Impact sur les activités quotidiennes"
  },
  "diagnosticAssessment": {
    "clinicalImpression": "Impression clinique structurée",
    "primaryDiagnosis": "Diagnostic principal retenu",
    "differentialDiagnosis": "Diagnostics différentiels à considérer",
    "diagnosticConfidence": "Niveau de certitude diagnostique",
    "prognosticFactors": "Facteurs pronostiques identifiés"
  },
  "investigationsPlan": {
    "laboratoryTests": "Examens biologiques recommandés avec indications",
    "imagingStudies": "Imagerie médicale nécessaire",
    "specialistReferrals": "Avis spécialisés à demander",
    "urgency": "Degré d'urgence des investigations"
  },
  "therapeuticPlan": {
    "immediateManagement": "Prise en charge immédiate",
    "pharmacotherapy": "Thérapeutique médicamenteuse détaillée",
    "nonPharmacological": "Mesures non médicamenteuses",
    "patientEducation": "Éducation et conseils au patient"
  },
  "followUpPlan": {
    "nextAppointment": "Prochaine consultation programmée",
    "monitoringParameters": "Paramètres à surveiller",
    "warningSignsToReport": "Signes d'alarme à signaler",
    "emergencyInstructions": "Conduite à tenir en urgence"
  },
  "qualityMetrics": {
    "aiConfidence": "${diagnosisData?.diagnosis?.aiConfidence || 0}%",
    "evidenceLevel": "Niveau de preuve des recommandations",
    "clinicalGuidelines": "Référentiels utilisés",
    "riskStratification": "Stratification du risque patient"
  },
  "metadata": {
    "reportId": "CR-${Date.now()}",
    "generatedBy": "TIBOK IA DOCTOR v2.0",
    "generationDate": "${new Date().toISOString()}",
    "dataQuality": "Score de qualité des données",
    "version": "1.0",
    "digitalSignature": "Signature électronique IA"
  }
}

Génère maintenant le rapport médical complet en JSON:
    `.trim()

    console.log("Génération du rapport de consultation...")

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: reportPrompt,
      maxTokens: 16000,
      temperature: 0.1,
    })

    console.log("Rapport généré:", result.text.substring(0, 500) + "...")

    // Extraction et parsing du JSON
    let reportData
    try {
      reportData = JSON.parse(result.text.trim())
    } catch (parseError) {
      console.log("Parsing direct échoué, extraction JSON...")

      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          reportData = JSON.parse(jsonMatch[0])
        } catch (regexParseError) {
          console.error("Erreur parsing regex:", regexParseError)
          throw new Error("Format JSON invalide")
        }
      } else {
        throw new Error("Aucun JSON trouvé dans la réponse")
      }
    }

    // Validation de la structure
    if (!reportData || !reportData.header) {
      throw new Error("Structure de rapport invalide")
    }

    console.log("Rapport de consultation généré avec succès")

    return NextResponse.json({
      success: true,
      report: reportData,
      metadata: {
        patientId: `${patientData.lastName}-${patientData.firstName}`,
        consultationDate: new Date().toISOString(),
        reportLength: result.text.length,
        generatedAt: new Date().toISOString(),
        model: "gpt-4o",
        tokens: 16000,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error)

    // Fallback rapport minimal
    const fallbackReport = {
      header: {
        title: "COMPTE-RENDU DE CONSULTATION",
        date: new Date().toLocaleDateString("fr-FR"),
        time: new Date().toLocaleTimeString("fr-FR"),
        physician: "Dr. TIBOK IA DOCTOR",
        service: "Médecine Générale - Consultation IA",
        establishment: "Centre Médical TIBOK",
      },
      patientIdentification: {
        lastName: allData.patientData?.lastName || "N/A",
        firstName: allData.patientData?.firstName || "N/A",
        age: `${allData.patientData?.age || "N/A"} ans`,
        gender: allData.patientData?.gender || "N/A",
      },
      anamnesis: {
        chiefComplaint: allData.clinicalData?.chiefComplaint || "Motif non spécifié",
        historyOfPresentIllness: "Histoire à compléter lors de la prochaine consultation",
      },
      diagnosticAssessment: {
        clinicalImpression: "Évaluation en cours - données insuffisantes",
        primaryDiagnosis: "Diagnostic à préciser",
      },
      therapeuticPlan: {
        immediateManagement: "Prise en charge symptomatique",
        followUp: "Réévaluation nécessaire",
      },
      metadata: {
        reportId: `CR-${Date.now()}`,
        generatedBy: "TIBOK IA DOCTOR v2.0 (Fallback)",
        generationDate: new Date().toISOString(),
        version: "1.0-fallback",
      },
    }

    return NextResponse.json({
      success: true,
      report: fallbackReport,
      fallback: true,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      metadata: {
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
      },
    })
  }
}
