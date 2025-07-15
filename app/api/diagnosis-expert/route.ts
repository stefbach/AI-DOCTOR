import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { patientData, clinicalData, questionsData } = await request.json()

    if (!patientData || !clinicalData) {
      return NextResponse.json({ success: false, error: "Données patient et cliniques requises" }, { status: 400 })
    }

    // Prompt ultra-détaillé avec plus de tokens pour un diagnostic expert
    const prompt = `Tu es un médecin expert en diagnostic différentiel et médecine basée sur les preuves. Tu dois fournir une analyse diagnostique complète et approfondie.

PROFIL PATIENT COMPLET:
- Identité: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
- Morphologie: ${patientData.weight}kg, ${patientData.height}cm, IMC: ${(patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1)}
- Groupe sanguin: ${patientData.bloodType}
- Antécédents médicaux: ${patientData.medicalHistory?.join(", ") || "Aucun"}
- Traitements actuels: ${patientData.currentMedications?.join(", ") || "Aucun"}
- Allergies connues: ${patientData.allergies?.join(", ") || "Aucune"}
- Habitudes de vie: 
  * Tabagisme: ${patientData.lifeHabits?.smoking}
  * Consommation d'alcool: ${patientData.lifeHabits?.alcohol}
  * Activité physique: ${patientData.lifeHabits?.physicalActivity}
- Assurance: ${patientData.insuranceInfo?.provider} (${patientData.insuranceInfo?.policyNumber})

PRÉSENTATION CLINIQUE:
- Motif principal: ${clinicalData.chiefComplaint}
- Symptômes actuels: ${clinicalData.symptoms?.join(", ")}
- Chronologie: ${clinicalData.symptomDuration}
- Signes vitaux:
  * Température: ${clinicalData.vitalSigns?.temperature}°C
  * Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate}/min
  * Tension artérielle: ${clinicalData.vitalSigns?.bloodPressureSystolic}/${clinicalData.vitalSigns?.bloodPressureDiastolic} mmHg
- Douleur: ${clinicalData.painScale}/10
- Retentissement fonctionnel: ${clinicalData.functionalStatus}
- Observations cliniques: ${clinicalData.notes}

RÉPONSES AUX QUESTIONS SPÉCIALISÉES:
${questionsData?.responses?.map((r: any) => `- ${r.question}: ${r.answer}`).join("\n") || "Aucune question supplémentaire posée"}

MISSION DIAGNOSTIQUE EXPERTE:
Fournis une analyse diagnostique complète, structurée et basée sur les preuves scientifiques actuelles.

STRUCTURE OBLIGATOIRE DE RÉPONSE (JSON):
{
  "success": true,
  "diagnosticAnalysis": {
    "clinicalSynthesis": {
      "patientProfile": "Synthèse du profil patient (âge, sexe, terrain, facteurs de risque)",
      "clinicalPresentation": "Présentation clinique structurée et hiérarchisée",
      "keyFindings": ["Élément clinique majeur 1", "Élément clinique majeur 2", "..."],
      "redFlags": ["Signe d'alarme 1", "Signe d'alarme 2", "..."] // Si applicable
    },
    "primaryDiagnosis": {
      "condition": "Diagnostic principal le plus probable",
      "icd10Code": "Code CIM-10",
      "confidence": 85, // Pourcentage de confiance
      "clinicalReasoning": "Raisonnement clinique détaillé justifiant ce diagnostic",
      "supportingEvidence": ["Argument 1", "Argument 2", "Argument 3"],
      "severity": "mild|moderate|severe|critical",
      "urgency": "immediate|urgent|semi_urgent|non_urgent"
    },
    "differentialDiagnoses": [
      {
        "condition": "Diagnostic différentiel 1",
        "icd10Code": "Code CIM-10",
        "probability": 15, // Pourcentage de probabilité
        "reasoning": "Pourquoi ce diagnostic est possible",
        "distinguishingFeatures": "Éléments qui permettraient de confirmer/infirmer"
      }
      // 3-5 diagnostics différentiels
    ],
    "riskStratification": {
      "immediateRisks": ["Risque immédiat 1", "Risque immédiat 2"],
      "shortTermRisks": ["Risque à court terme 1", "Risque à court terme 2"],
      "longTermRisks": ["Risque à long terme 1", "Risque à long terme 2"],
      "prognosticFactors": ["Facteur pronostique 1", "Facteur pronostique 2"]
    }
  },
  "recommendedExams": [
    {
      "category": "biology|imaging|functional|specialized",
      "exam": "Nom de l'examen",
      "indication": "Indication précise",
      "priority": "immediate|urgent|routine",
      "expectedFindings": "Résultats attendus si diagnostic confirmé",
      "costBenefit": "Justification coût-bénéfice"
    }
  ],
  "expertTherapeutics": {
    "immediateManagement": {
      "actions": ["Action immédiate 1", "Action immédiate 2"],
      "monitoring": ["Surveillance 1", "Surveillance 2"],
      "contraindications": ["Contre-indication 1", "Contre-indication 2"]
    },
    "evidenceBasedMedications": [
      {
        "medication": "Nom du médicament",
        "indication": "Indication précise",
        "dosage": "Posologie détaillée",
        "duration": "Durée de traitement",
        "evidenceLevel": "A|B|C", // Niveau de preuve
        "sideEffects": ["Effet indésirable 1", "Effet indésirable 2"],
        "interactions": ["Interaction 1", "Interaction 2"],
        "monitoring": "Surveillance nécessaire"
      }
    ],
    "nonPharmacological": [
      {
        "intervention": "Intervention non médicamenteuse",
        "rationale": "Justification",
        "implementation": "Modalités de mise en œuvre"
      }
    ]
  },
  "followUpPlan": {
    "immediate": {
      "timeframe": "24-48h|1 semaine|2 semaines",
      "objectives": ["Objectif 1", "Objectif 2"],
      "assessments": ["Évaluation 1", "Évaluation 2"]
    },
    "shortTerm": {
      "timeframe": "1 mois|3 mois|6 mois",
      "objectives": ["Objectif 1", "Objectif 2"],
      "assessments": ["Évaluation 1", "Évaluation 2"]
    },
    "longTerm": {
      "timeframe": "6 mois|1 an|suivi chronique",
      "objectives": ["Objectif 1", "Objectif 2"],
      "assessments": ["Évaluation 1", "Évaluation 2"]
    }
  },
  "patientEducation": {
    "keyMessages": ["Message éducatif 1", "Message éducatif 2"],
    "warningSignsToWatch": ["Signe d'alarme 1", "Signe d'alarme 2"],
    "lifestyleModifications": ["Modification 1", "Modification 2"],
    "resources": ["Ressource 1", "Ressource 2"]
  },
  "qualityMetrics": {
    "diagnosticConfidence": 85, // Pourcentage
    "evidenceQuality": "high|moderate|low",
    "clinicalComplexity": "low|moderate|high|very_high",
    "recommendationStrength": "strong|moderate|weak"
  },
  "externalData": {
    "pubmedReferences": ["Référence 1", "Référence 2", "Référence 3"],
    "guidelinesUsed": ["Guideline 1", "Guideline 2"],
    "apisUsed": ["OpenAI GPT-4o", "Diagnostic Expert System"]
  }
}

EXIGENCES QUALITÉ:
1. Diagnostic basé sur les preuves scientifiques actuelles
2. Raisonnement clinique structuré et transparent
3. Prise en compte des spécificités du patient (âge, sexe, terrain)
4. Évaluation des risques et bénéfices
5. Recommandations graduées selon l'urgence
6. Approche holistique (bio-psycho-sociale)
7. Considération des aspects médico-légaux
8. Intégration des données de médecine personnalisée

ATTENTION: Réponse en français médical professionnel, précise et complète.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Tu es un médecin expert en diagnostic différentiel et médecine basée sur les preuves. Tu fournis des analyses diagnostiques complètes et structurées.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 12000, // Augmenté pour une analyse diagnostique complète
      temperature: 0.1,
      response_format: { type: "json_object" },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("Pas de réponse de OpenAI")
    }

    const parsedResponse = JSON.parse(response)

    if (!parsedResponse.success) {
      throw new Error("Erreur dans la génération du diagnostic")
    }

    return NextResponse.json({
      success: true,
      ...parsedResponse,
      usage: completion.usage,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Erreur diagnostic expert:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de la génération du diagnostic",
      },
      { status: 500 },
    )
  }
}
