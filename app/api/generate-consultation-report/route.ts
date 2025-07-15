import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { allData } = await request.json()

    if (!allData || !allData.patientData || !allData.clinicalData) {
      return NextResponse.json({ error: "Données complètes requises pour générer le rapport" }, { status: 400 })
    }

    const { patientData, clinicalData, questionsData, diagnosisData, examsData, medicationData } = allData

    // Préparer les données pour le prompt
    const questionsResponses =
      questionsData?.responses?.map((r: any) => `${r.question}: ${r.answer}`).join("\n") ||
      "Aucune question supplémentaire"

    const selectedExams =
      examsData?.selectedExams?.map((exam: any) => `${exam.name} - ${exam.justification}`).join("\n") ||
      "Aucun examen prescrit"

    const selectedMedications =
      medicationData?.selectedMedications
        ?.map((med: any) => `${med.name} ${med.dosage} - ${med.indication}`)
        .join("\n") || "Aucun médicament prescrit"

    const prompt = `
Tu es un médecin expert rédigeant un compte-rendu de consultation médical complet et professionnel. Génère un rapport structuré selon les standards hospitaliers français.

DONNÉES COMPLÈTES DU PATIENT:

IDENTITÉ ET DONNÉES DÉMOGRAPHIQUES:
- Nom: ${patientData.lastName}
- Prénom: ${patientData.firstName}
- Date de naissance: ${patientData.dateOfBirth}
- Âge: ${patientData.age} ans
- Sexe: ${patientData.gender}
- Poids: ${patientData.weight} kg
- Taille: ${patientData.height} cm
- IMC: ${(patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1)} kg/m²
- Groupe sanguin: ${patientData.bloodType || "Non déterminé"}
- Assurance: ${patientData.insuranceInfo?.provider || "Non renseigné"} - ${patientData.insuranceInfo?.policyNumber || ""}

ANTÉCÉDENTS ET CONTEXTE MÉDICAL:
- Antécédents médicaux: ${patientData.medicalHistory?.join(", ") || "Aucun antécédent notable"}
- Allergies connues: ${patientData.allergies?.join(", ") || "Aucune allergie connue"}
- Traitements habituels: ${patientData.currentMedications?.join(", ") || "Aucun traitement habituel"}
- Habitudes de vie:
  * Tabagisme: ${patientData.lifeHabits?.smoking || "Non renseigné"}
  * Consommation d'alcool: ${patientData.lifeHabits?.alcohol || "Non renseigné"}
  * Activité physique: ${patientData.lifeHabits?.physicalActivity || "Non renseigné"}

MOTIF DE CONSULTATION ET ANAMNÈSE:
- Motif principal: ${clinicalData.chiefComplaint}
- Symptômes présents: ${clinicalData.symptoms?.join(", ") || "Aucun symptôme spécifique"}
- Durée d'évolution: ${clinicalData.symptomDuration}
- Échelle de douleur: ${clinicalData.painScale}/10
- Retentissement fonctionnel: ${clinicalData.functionalStatus || "Non évalué"}
- Notes cliniques: ${clinicalData.notes || "Aucune observation particulière"}

EXAMEN CLINIQUE:
- Température: ${clinicalData.vitalSigns?.temperature || "Non prise"}°C
- Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate || "Non prise"} bpm
- Tension artérielle: ${clinicalData.vitalSigns?.bloodPressureSystolic || "Non prise"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "Non prise"} mmHg

INTERROGATOIRE COMPLÉMENTAIRE:
${questionsResponses}

DIAGNOSTIC ET ANALYSE MÉDICALE:
- Diagnostic principal: ${diagnosisData?.data?.primary_diagnosis?.condition || "En cours d'établissement"}
- Code CIM-10: ${diagnosisData?.data?.primary_diagnosis?.icd10_code || "À préciser"}
- Niveau de confiance diagnostique: ${diagnosisData?.data?.quality_indicators?.diagnostic_confidence || 0}%
- Diagnostics différentiels: ${diagnosisData?.data?.differential_diagnoses?.map((d: any) => d.condition).join(", ") || "À préciser"}

EXAMENS COMPLÉMENTAIRES PRESCRITS:
${selectedExams}

TRAITEMENT PRESCRIT:
${selectedMedications}

INSTRUCTIONS POUR LE RAPPORT:
1. Génère un compte-rendu médical professionnel et structuré
2. Utilise la terminologie médicale appropriée
3. Respecte la structure standard des comptes-rendus hospitaliers français
4. Inclus toutes les sections pertinentes avec détails cliniques
5. Ajoute des recommandations de suivi et surveillance
6. Mentionne les éléments de traçabilité et qualité
7. Adapte le niveau de détail à un rapport de consultation spécialisée
8. Inclus les références aux examens et traitements prescrits

FORMAT DE RÉPONSE REQUIS (JSON strict):
{
  "header": {
    "document_type": "Compte-rendu de consultation médicale",
    "establishment": "TIBOK IA DOCTOR - Système d'aide au diagnostic",
    "date": "Date de consultation",
    "doctor": "Dr. Assistant IA",
    "specialty": "Médecine générale assistée par IA"
  },
  "patient_identification": {
    "last_name": "Nom du patient",
    "first_name": "Prénom du patient",
    "birth_date": "Date de naissance",
    "age": "Âge en années",
    "gender": "Sexe",
    "weight": "Poids en kg",
    "height": "Taille en cm",
    "bmi": "IMC calculé",
    "blood_type": "Groupe sanguin",
    "insurance": "Informations d'assurance"
  },
  "medical_history": {
    "past_medical_history": "Antécédents médicaux détaillés",
    "allergies": "Allergies connues",
    "current_medications": "Traitements en cours",
    "lifestyle_factors": {
      "smoking": "Statut tabagique",
      "alcohol": "Consommation d'alcool",
      "physical_activity": "Activité physique"
    }
  },
  "consultation_details": {
    "chief_complaint": "Motif principal de consultation",
    "history_of_present_illness": "Histoire de la maladie actuelle détaillée",
    "symptom_timeline": "Chronologie des symptômes",
    "functional_impact": "Impact sur les activités quotidiennes",
    "pain_assessment": "Évaluation de la douleur"
  },
  "physical_examination": {
    "vital_signs": {
      "temperature": "Température corporelle",
      "heart_rate": "Fréquence cardiaque",
      "blood_pressure": "Tension artérielle",
      "general_condition": "État général"
    },
    "clinical_findings": "Résultats de l'examen physique",
    "additional_observations": "Observations cliniques supplémentaires"
  },
  "complementary_questioning": {
    "targeted_questions": "Questions spécifiques posées",
    "patient_responses": "Réponses du patient",
    "clinical_relevance": "Pertinence clinique des réponses"
  },
  "diagnostic_assessment": {
    "primary_diagnosis": {
      "condition": "Diagnostic principal",
      "icd10_code": "Code CIM-10",
      "confidence_level": "Niveau de certitude",
      "clinical_rationale": "Justification clinique"
    },
    "differential_diagnoses": "Diagnostics différentiels considérés",
    "clinical_reasoning": "Raisonnement clinique détaillé"
  },
  "prescribed_examinations": {
    "laboratory_tests": "Examens biologiques prescrits",
    "imaging_studies": "Examens d'imagerie prescrits",
    "specialized_tests": "Examens spécialisés",
    "clinical_justifications": "Justifications médicales"
  },
  "therapeutic_management": {
    "immediate_treatment": "Traitement immédiat",
    "prescribed_medications": "Médicaments prescrits avec posologie",
    "non_pharmacological_measures": "Mesures non médicamenteuses",
    "lifestyle_recommendations": "Recommandations hygiéno-diététiques"
  },
  "follow_up_plan": {
    "next_appointment": "Prochaine consultation",
    "monitoring_parameters": "Paramètres à surveiller",
    "warning_signs": "Signes d'alarme",
    "specialist_referral": "Orientation spécialisée si nécessaire"
  },
  "prognosis_and_recommendations": {
    "short_term_prognosis": "Pronostic à court terme",
    "long_term_outlook": "Perspectives à long terme",
    "patient_education": "Éducation du patient",
    "prevention_measures": "Mesures préventives"
  },
  "quality_and_traceability": {
    "ai_assistance_level": "Niveau d'assistance IA utilisé",
    "diagnostic_confidence": "Confiance diagnostique",
    "evidence_quality": "Qualité des preuves",
    "clinical_complexity": "Complexité clinique du cas",
    "generation_timestamp": "Horodatage de génération",
    "data_sources": "Sources de données utilisées"
  },
  "medical_signatures": {
    "consulting_physician": "Médecin consultant (IA)",
    "validation_status": "Statut de validation",
    "document_version": "Version du document"
  }
}

Génère maintenant le compte-rendu médical complet en JSON strict.
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt,
      maxTokens: 16000,
      temperature: 0.1,
    })

    // Parse du JSON avec gestion d'erreur robuste
    let reportData
    try {
      const cleanedText = result.text.trim()
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Format JSON non trouvé")
      }
    } catch (parseError) {
      console.error("Erreur parsing JSON rapport:", parseError)

      // Fallback avec rapport générique
      reportData = {
        header: {
          document_type: "Compte-rendu de consultation médicale",
          establishment: "TIBOK IA DOCTOR - Système d'aide au diagnostic",
          date: new Date().toLocaleDateString("fr-FR"),
          doctor: "Dr. Assistant IA",
          specialty: "Médecine générale assistée par IA",
        },
        patient_identification: {
          last_name: patientData.lastName,
          first_name: patientData.firstName,
          birth_date: patientData.dateOfBirth,
          age: `${patientData.age} ans`,
          gender: patientData.gender,
          weight: `${patientData.weight} kg`,
          height: `${patientData.height} cm`,
          bmi: `${(patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1)} kg/m²`,
          blood_type: patientData.bloodType || "Non déterminé",
          insurance: patientData.insuranceInfo?.provider || "Non renseigné",
        },
        consultation_details: {
          chief_complaint: clinicalData.chiefComplaint,
          history_of_present_illness: `Patient de ${patientData.age} ans consultant pour ${clinicalData.chiefComplaint}`,
          symptom_timeline: clinicalData.symptomDuration,
          functional_impact: clinicalData.functionalStatus,
          pain_assessment: `${clinicalData.painScale}/10`,
        },
        diagnostic_assessment: {
          primary_diagnosis: {
            condition: diagnosisData?.data?.primary_diagnosis?.condition || "En cours d'établissement",
            icd10_code: diagnosisData?.data?.primary_diagnosis?.icd10_code || "À préciser",
            confidence_level: `${diagnosisData?.data?.quality_indicators?.diagnostic_confidence || 0}%`,
            clinical_rationale: "Diagnostic basé sur l'analyse IA des données cliniques",
          },
        },
        quality_and_traceability: {
          ai_assistance_level: "Diagnostic expert avec IA avancée",
          diagnostic_confidence: `${diagnosisData?.data?.quality_indicators?.diagnostic_confidence || 0}%`,
          evidence_quality: diagnosisData?.data?.quality_indicators?.evidence_quality || "medium",
          clinical_complexity: diagnosisData?.data?.quality_indicators?.clinical_complexity || "medium",
          generation_timestamp: new Date().toISOString(),
          data_sources: ["TIBOK IA DOCTOR", "OpenAI GPT-4o", "Base de données médicales"],
        },
      }
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      metadata: {
        generatedAt: new Date().toISOString(),
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        consultationDate: new Date().toLocaleDateString("fr-FR"),
        tokensUsed: result.usage?.totalTokens || 0,
        reportSections: Object.keys(reportData).length,
      },
    })
  } catch (error) {
    console.error("Erreur génération rapport:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du rapport",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
