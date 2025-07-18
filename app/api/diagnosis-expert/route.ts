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
Tu es un médecin expert spécialisé en médecine interne. Analyse ce cas clinique et fournis un diagnostic expert DÉTAILLÉ.

${fullContext}

INSTRUCTIONS POUR L'ANALYSE DIAGNOSTIQUE APPROFONDIE:

Génère un diagnostic médical COMPLET avec cette structure JSON exacte :

{
  "clinicalReasoning": {
    "semiology": "Analyse sémiologique DÉTAILLÉE (200+ mots) : description précise des symptômes, signification clinique, corrélations anatomiques, mécanismes physiopathologiques",
    "syndromes": [
      {
        "name": "Nom du syndrome clinique",
        "description": "Description complète avec critères diagnostiques",
        "presence": "Arguments cliniques justifiant ce syndrome",
        "significance": "Signification pronostique et thérapeutique"
      }
    ],
    "pathophysiology": "Mécanismes physiopathologiques APPROFONDIS (150+ mots) : cascade d'événements, voies métaboliques, facteurs déclenchants",
    "riskFactors": {
      "present": ["Facteurs de risque identifiés avec justification"],
      "absent": ["Facteurs classiques non retrouvés"],
      "protective": ["Facteurs protecteurs éventuels"]
    }
  },
  "primaryDiagnosis": {
    "condition": "Nom précis de la condition médicale",
    "icd10": "Code CIM-10 exact",
    "probability": 85,
    "detailedDescription": "Description médicale COMPLÈTE (250+ mots) : définition, épidémiologie, physiopathologie, présentation clinique, évolution",
    "clinicalPresentation": "Description DÉTAILLÉE de la manifestation chez ce patient (150+ mots)",
    "arguments": [
      {
        "type": "Anamnestique/Clinique/Épidémiologique",
        "evidence": "Élément précis supportant le diagnostic",
        "significance": "Valeur diagnostique de cet élément",
        "weight": "Fort/Modéré/Faible"
      }
    ],
    "severity": "Légère/Modérée/Sévère",
    "severityJustification": "Justification DÉTAILLÉE du degré de sévérité",
    "prognosis": {
      "shortTerm": "Évolution 24-48h avec justification",
      "mediumTerm": "Évolution 1-4 semaines",
      "longTerm": "Pronostic long terme",
      "complications": ["Complications possibles avec probabilité"]
    }
  },
  "differentialDiagnosis": [
    {
      "condition": "Diagnostic différentiel principal",
      "icd10": "Code CIM-10",
      "probability": 60,
      "detailedDescription": "Description COMPLÈTE (200+ mots) de cette pathologie alternative",
      "argumentsFor": [
        {
          "evidence": "Élément supportant ce diagnostic",
          "significance": "Pourquoi cet élément est en faveur",
          "strength": "Fort/Modéré/Faible"
        }
      ],
      "argumentsAgainst": [
        {
          "evidence": "Élément contre ce diagnostic",
          "significance": "Pourquoi cet élément va à l'encontre",
          "strength": "Fort/Modéré/Faible"
        }
      ],
      "differentiatingFeatures": "Éléments clés pour distinguer du diagnostic principal",
      "additionalTestsNeeded": "Examens pour confirmer/infirmer"
    }
  ],
  "recommendedExams": [
    {
      "category": "Biologie/Imagerie/Fonctionnel",
      "exam": "Nom précis de l'examen",
      "indication": "Justification médicale DÉTAILLÉE",
      "expectedFindings": {
        "ifPositive": "Résultats si diagnostic correct",
        "ifNegative": "Signification si normal",
        "alternativeFindings": "Autres résultats possibles"
      },
      "urgency": "Immédiate/Semi-urgente/Programmée",
      "urgencyJustification": "Justification du degré d'urgence",
      "practicalConsiderations": "Préparation, contre-indications, limites"
    }
  ],
  "therapeuticStrategy": {
    "immediate": [
      {
        "type": "Symptomatique/Étiologique",
        "treatment": "Traitement avec posologie",
        "indication": "Justification DÉTAILLÉE",
        "mechanism": "Mécanisme d'action",
        "duration": "Durée avec justification",
        "monitoring": "Surveillance requise",
        "contraindications": "Contre-indications à vérifier",
        "alternatives": "Alternatives si échec"
      }
    ],
    "etiological": [
      {
        "type": "Traitement de la cause",
        "rationale": "Justification du traitement étiologique",
        "evidence": "Niveau de preuve",
        "longTermPlan": "Plan thérapeutique long terme"
      }
    ]
  },
  "prognosis": {
    "shortTerm": "Pronostic immédiat DÉTAILLÉ",
    "longTerm": "Pronostic long terme avec facteurs pronostiques",
    "complications": [
      {
        "complication": "Nom complication",
        "probability": "Risque %",
        "timeframe": "Délai apparition",
        "prevention": "Mesures préventives",
        "earlyDetection": "Signes d'alerte"
      }
    ],
    "followUp": "Plan de suivi DÉTAILLÉ",
    "patientEducation": "Points clés éducation patient"
  },
  "aiConfidence": 85,
  "redFlags": [
    {
      "sign": "Signe d'alarme précis",
      "significance": "Pourquoi préoccupant",
      "action": "Conduite à tenir immédiate"
    }
  ],
  "clinicalPearls": [
    "Points cliniques importants",
    "Pièges diagnostiques à éviter",
    "Astuces thérapeutiques"
  ],
  "metadata": {
    "analysisDate": "${new Date().toISOString()}",
    "model": "gpt-4o",
    "evidenceLevel": "Grade A/B/C",
    "guidelines": ["Recommandations utilisées"],
    "confidenceFactors": {
      "strengths": ["Éléments renforçant confiance"],
      "limitations": ["Éléments limitant certitude"],
      "additionalDataNeeded": ["Infos supplémentaires utiles"]
    }
  }
}

EXIGENCES :
- Minimum 150-250 mots par section principale
- Langage médical précis et professionnel
- Spécifique au cas présenté
- Evidence-based medicine

Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après.

try {
      console.log("Génération du diagnostic expert...")

      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: diagnosticPrompt,
        maxTokens: 8000,
        temperature: 0.1,
      })

      console.log("Réponse diagnostic reçue:", result.text.substring(0, 500) + "...")

      // Extraction et parsing du JSON AMÉLIORÉ
      let diagnosticData
      try {
        // Nettoyer la réponse avant parsing
        let cleanText = result.text.trim()
        
        // Enlever les backticks markdown si présents
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim()
        
        diagnosticData = JSON.parse(cleanText)
      } catch (parseError) {
        console.log("❌ Parsing direct échoué, tentative extraction JSON...")

        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            let cleanMatch = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim()
            diagnosticData = JSON.parse(cleanMatch)
          } catch (regexParseError) {
            console.error("❌ Erreur parsing regex:", regexParseError)
            console.error("📝 Texte problématique:", result.text.substring(0, 1000))
            throw new Error("Format JSON invalide dans la réponse IA")
          }
        } else {
          console.error("❌ Aucun JSON trouvé dans:", result.text.substring(0, 1000))
          throw new Error("Aucun JSON valide trouvé dans la réponse")
        }
      }

      // Validation de la structure
      if (!diagnosticData || !diagnosticData.primaryDiagnosis) {
        console.error("❌ Structure invalide:", diagnosticData)
        throw new Error("Structure de diagnostic invalide")
      }

      console.log("✅ Diagnostic généré avec succès")

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
          tokens: 8000,
        },
      })
      
    } catch (error) {
      console.error("❌ Erreur lors de la génération du diagnostic:", error)

      // Retourner erreur HTTP 500 avec détails
      return NextResponse.json({
        success: false,
        error: "Erreur lors de la génération du diagnostic",
        details: error instanceof Error ? error.message : "Erreur inconnue",
        timestamp: new Date().toISOString()
      }, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
  } catch (error: any) {
    console.error("❌ Erreur orchestrateur médical:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du traitement médical",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
`
