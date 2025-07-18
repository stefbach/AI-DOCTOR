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
Tu es un médecin expert en médecine interne avec 20 ans d'expérience hospitalière. 
Analyse ce cas clinique de manière APPROFONDIE et fournis un diagnostic expert DÉTAILLÉ.

${fullContext}

INSTRUCTIONS POUR L'ANALYSE DIAGNOSTIQUE COMPLÈTE:

GÉNÈRE un diagnostic médical COMPLET et DÉTAILLÉ avec cette structure JSON exacte :

{
  "clinicalReasoning": {
    "semiology": "Analyse sémiologique DÉTAILLÉE (minimum 200 mots) : description précise de chaque symptôme, sa signification clinique, les corrélations anatomiques, les mécanismes physiopathologiques sous-jacents",
    "syndromes": [
      {
        "name": "Nom du syndrome clinique",
        "description": "Description complète du syndrome avec définition, critères diagnostiques, signes cardinaux",
        "presence": "Arguments cliniques précis justifiant la présence de ce syndrome chez ce patient",
        "significance": "Signification pronostique et thérapeutique de ce syndrome"
      }
    ],
    "pathophysiology": "Explication APPROFONDIE des mécanismes physiopathologiques (minimum 150 mots) : cascade d'événements, voies métaboliques impliquées, facteurs déclenchants, progression de la maladie",
    "riskFactors": {
      "present": ["Facteurs de risque identifiés chez ce patient avec justification"],
      "absent": ["Facteurs de risque classiques non retrouvés"],
      "protective": ["Facteurs protecteurs éventuels"]
    }
  },
  "primaryDiagnosis": {
    "condition": "Nom précis de la condition médicale",
    "icd10": "Code CIM-10 exact",
    "probability": 85,
    "detailedDescription": "Description médicale COMPLÈTE de cette pathologie (minimum 250 mots) : définition, épidémiologie, facteurs de risque, physiopathologie, présentation clinique typique, évolution naturelle, complications possibles",
    "clinicalPresentation": "Description DÉTAILLÉE de comment cette pathologie se manifeste chez CE patient spécifique (minimum 150 mots) : symptômes spécifiques, signes cliniques, chronologie, facteurs aggravants/atténuants",
    "arguments": [
      {
        "type": "Anamnestique",
        "evidence": "Élément précis de l'histoire",
        "significance": "Pourquoi cet élément oriente vers ce diagnostic",
        "weight": "Fort/Modéré/Faible"
      },
      {
        "type": "Clinique", 
        "evidence": "Signe clinique objectif",
        "significance": "Valeur diagnostique de ce signe",
        "weight": "Fort/Modéré/Faible"
      },
      {
        "type": "Épidémiologique",
        "evidence": "Facteur épidémiologique pertinent",
        "significance": "Impact sur la probabilité diagnostique",
        "weight": "Fort/Modéré/Faible"
      }
    ],
    "severity": "Légère/Modérée/Sévère",
    "severityJustification": "Justification DÉTAILLÉE du degré de sévérité basée sur les critères cliniques objectifs, échelles validées, impact fonctionnel",
    "prognosis": {
      "shortTerm": "Évolution attendue à 24-48h avec justification",
      "mediumTerm": "Évolution à 1-4 semaines avec facteurs influençant",
      "longTerm": "Pronostic à long terme et facteurs pronostiques",
      "complications": ["Complications possibles avec probabilité et délai"]
    }
  },
  "differentialDiagnosis": [
    {
      "condition": "Diagnostic différentiel 1",
      "icd10": "Code CIM-10",
      "probability": 60,
      "detailedDescription": "Description COMPLÈTE de cette pathologie alternative (minimum 200 mots) : caractéristiques, présentation typique, différences avec le diagnostic principal",
      "argumentsFor": [
        {
          "evidence": "Élément clinique supportant ce diagnostic",
          "significance": "Pourquoi cet élément est en faveur",
          "strength": "Argument fort/modéré/faible"
        }
      ],
      "argumentsAgainst": [
        {
          "evidence": "Élément clinique ne supportant pas ce diagnostic",
          "significance": "Pourquoi cet élément va à l'encontre",
          "strength": "Contre-argument fort/modéré/faible"
        }
      ],
      "differentiatingFeatures": "Éléments clés permettant de distinguer ce diagnostic du diagnostic principal",
      "additionalTestsNeeded": "Examens spécifiques pour confirmer/infirmer ce diagnostic"
    }
  ],
  "recommendedExams": [
    {
      "category": "Biologie/Imagerie/Fonctionnel/Anatomopathologie",
      "exam": "Nom précis de l'examen",
      "indication": "Justification médicale DÉTAILLÉE de pourquoi cet examen est nécessaire dans ce contexte clinique précis",
      "expectedFindings": {
        "ifPositive": "Résultats attendus si le diagnostic principal est correct",
        "ifNegative": "Signification si l'examen est normal/négatif",
        "alternativeFindings": "Autres résultats possibles et leur interprétation"
      },
      "urgency": "Immédiate/Semi-urgente/Programmée/Différée",
      "urgencyJustification": "Justification précise du degré d'urgence",
      "practicalConsiderations": "Considérations pratiques : préparation, contre-indications, limites"
    }
  ],
  "therapeuticStrategy": {
    "immediate": [
      {
        "type": "Symptomatique/Étiologique/Préventif",
        "treatment": "Traitement précis avec posologie",
        "indication": "Justification DÉTAILLÉE du choix thérapeutique",
        "mechanism": "Mécanisme d'action et pourquoi efficace dans ce cas",
        "duration": "Durée avec justification",
        "monitoring": "Surveillance spécifique requise",
        "contraindications": "Contre-indications à vérifier",
        "alternatives": "Alternatives thérapeutiques si échec/intolérance"
      }
    ],
    "etiological": [
      {
        "type": "Traitement de la cause",
        "rationale": "Justification APPROFONDIE du traitement étiologique",
        "evidence": "Niveau de preuve (Grade A/B/C) et références",
        "longTermPlan": "Plan thérapeutique à long terme"
      }
    ]
  },
  "prognosis": {
    "shortTerm": "Pronostic immédiat DÉTAILLÉ avec facteurs influençant l'évolution à court terme",
    "longTerm": "Pronostic à long terme avec facteurs pronostiques précis, qualité de vie attendue, impact sur l'espérance de vie",
    "complications": [
      {
        "complication": "Nom de la complication",
        "probability": "Risque estimé (%)",
        "timeframe": "Délai d'apparition possible",
        "prevention": "Mesures préventives spécifiques",
        "earlyDetection": "Signes d'alerte à surveiller"
      }
    ],
    "followUp": "Plan de suivi DÉTAILLÉ : fréquence des consultations, examens de surveillance, critères d'amélioration/aggravation",
    "patientEducation": "Points clés d'éducation thérapeutique à transmettre au patient"
  },
  "aiConfidence": 85,
  "redFlags": [
    {
      "sign": "Signe d'alarme précis",
      "significance": "Pourquoi ce signe est préoccupant",
      "action": "Conduite à tenir immédiate si ce signe apparaît"
    }
  ],
  "clinicalPearls": [
    "Points cliniques importants à retenir pour ce diagnostic",
    "Pièges diagnostiques à éviter",
    "Astuces thérapeutiques basées sur l'expérience clinique"
  ],
  "metadata": {
    "analysisDate": "${new Date().toISOString()}",
    "model": "gpt-4o",
    "evidenceLevel": "Grade A/B/C selon les recommandations",
    "guidelines": ["Références aux recommandations utilisées"],
    "confidenceFactors": {
      "strengths": ["Éléments renforçant la confiance diagnostique"],
      "limitations": ["Éléments limitant la certitude diagnostique"],
      "additionalDataNeeded": ["Informations supplémentaires qui amélioreraient le diagnostic"]
    }
  }
}

EXIGENCES DE QUALITÉ :
- Chaque section doit contenir un minimum de mots indiqué
- Utilise un langage médical précis et professionnel
- Référence-toi aux dernières recommandations médicales
- Adapte l'analyse au contexte géographique (Maurice) si pertinent
- Reste factuel et basé sur l'evidence-based medicine
- Évite les généralités, sois spécifique au cas présenté

Génère maintenant l'analyse diagnostique COMPLÈTE et DÉTAILLÉE en JSON :
`
