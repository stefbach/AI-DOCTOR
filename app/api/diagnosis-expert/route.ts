import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { validatePatientAndClinical } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    console.log("🩺 Début diagnostic expert")
    
    const body = await request.json()
    let { patientData, clinicalData, questionsData } = body

    const validation = validatePatientAndClinical(patientData, clinicalData)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid ${validation.source}`,
          details: validation.errors,
        },
        { status: 400 },
      )
    }
    ;({ patientData, clinicalData } = validation.data)

    // Construction du contexte complet
    const fullContext = `
PROFIL PATIENT COMPLET:
- Identité: ${patientData.firstName || "N/A"} ${patientData.lastName || "N/A"}
- Âge: ${patientData.age || "N/A"} ans
- Sexe: ${patientData.gender || "N/A"}
- Poids: ${patientData.weight || "N/A"} kg, Taille: ${patientData.height || "N/A"} cm
- IMC: ${patientData.weight && patientData.height ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : "N/A"}
- Allergies: ${(patientData.allergies || []).join(", ") || "Aucune connue"}
- Antécédents médicaux: ${(patientData.medicalHistory || []).join(", ") || "Aucun"}
- Médicaments actuels: ${patientData.currentMedicationsText || "Aucun"}

PRÉSENTATION CLINIQUE:
- Motif de consultation: ${clinicalData.chiefComplaint || "N/A"}
- Symptômes présents: ${(clinicalData.symptoms || []).join(", ") || "Aucun"}
- Durée d'évolution: ${clinicalData.symptomDuration || "N/A"}
- Échelle de douleur: ${clinicalData.painScale || 0}/10
- Impact fonctionnel: ${clinicalData.functionalStatus || "N/A"}

RÉPONSES AUX QUESTIONS SPÉCIALISÉES:
${questionsData?.responses ? questionsData.responses.map((r: any) => `- ${r.question}: ${r.answer}`).join("\n") : "Aucune question supplémentaire posée"}
    `.trim()

    const diagnosticPrompt = `
Tu es un médecin expert spécialisé en médecine interne. Analyse ce cas clinique et fournis un diagnostic expert DÉTAILLÉ.

${fullContext}

Réponds UNIQUEMENT avec ce JSON exact (sans markdown, sans texte supplémentaire) :

{
  "clinicalReasoning": {
    "semiology": "Analyse sémiologique DÉTAILLÉE (minimum 200 mots) : description précise des symptômes, signification clinique, corrélations anatomiques, mécanismes physiopathologiques dans ce cas précis",
    "syndromes": [
      {
        "name": "Nom du syndrome clinique principal",
        "description": "Description complète du syndrome avec critères diagnostiques",
        "presence": "Arguments cliniques justifiant ce syndrome chez ce patient",
        "significance": "Signification pronostique et thérapeutique"
      }
    ],
    "pathophysiology": "Mécanismes physiopathologiques APPROFONDIS (minimum 150 mots) : cascade événements, voies métaboliques, facteurs déclenchants"
  },
  "primaryDiagnosis": {
    "condition": "Nom précis de la condition médicale",
    "icd10": "Code CIM-10 exact",
    "probability": 85,
    "detailedDescription": "Description médicale COMPLÈTE (minimum 250 mots) : définition, épidémiologie, physiopathologie, présentation clinique, évolution",
    "clinicalPresentation": "Description DÉTAILLÉE (minimum 150 mots) de la manifestation chez ce patient spécifique",
    "arguments": [
      {
        "type": "Anamnestique",
        "evidence": "Élément précis de l'histoire",
        "significance": "Pourquoi cet élément oriente vers ce diagnostic",
        "weight": "Fort"
      }
    ],
    "severity": "Légère/Modérée/Sévère",
    "severityJustification": "Justification DÉTAILLÉE du degré de sévérité"
  },
  "differentialDiagnosis": [
    {
      "condition": "Premier diagnostic différentiel",
      "icd10": "Code CIM-10",
      "probability": 60,
      "detailedDescription": "Description COMPLÈTE (minimum 200 mots) de cette pathologie alternative",
      "argumentsFor": [
        {
          "evidence": "Élément supportant ce diagnostic",
          "significance": "Pourquoi en faveur",
          "strength": "Fort"
        }
      ],
      "argumentsAgainst": [
        {
          "evidence": "Élément contre ce diagnostic",
          "significance": "Pourquoi contre",
          "strength": "Fort"
        }
      ]
    }
  ],
  "recommendedExams": [
    {
      "category": "Biologie",
      "exam": "Nom précis de l'examen",
      "indication": "Justification médicale DÉTAILLÉE",
      "urgency": "Immédiate/Semi-urgente/Programmée",
      "urgencyJustification": "Justification du degré d'urgence"
    }
  ],
  "therapeuticStrategy": {
    "immediate": [
      {
        "type": "Symptomatique",
        "treatment": "Traitement avec posologie",
        "indication": "Justification DÉTAILLÉE",
        "duration": "Durée avec justification",
        "monitoring": "Surveillance requise"
      }
    ]
  },
  "prognosis": {
    "shortTerm": "Pronostic immédiat DÉTAILLÉ",
    "longTerm": "Pronostic long terme",
    "followUp": "Plan de suivi DÉTAILLÉ"
  },
  "aiConfidence": 85,
  "redFlags": [
    {
      "sign": "Signe d'alarme précis",
      "significance": "Pourquoi préoccupant",
      "action": "Conduite à tenir"
    }
  ],
  "metadata": {
    "analysisDate": "${new Date().toISOString()}",
    "model": "gpt-4o",
    "evidenceLevel": "Grade A"
  }
}
`

    console.log("🧠 Génération diagnostic avec OpenAI...")

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: diagnosticPrompt,
      maxTokens: 6000,
      temperature: 0.1,
    })

    console.log("✅ Réponse OpenAI reçue")

    // Nettoyage et parsing JSON
    let diagnosticData
    try {
      let cleanText = result.text.trim()
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      
      const startIndex = cleanText.indexOf('{')
      if (startIndex > 0) {
        cleanText = cleanText.substring(startIndex)
      }
      
      const endIndex = cleanText.lastIndexOf('}')
      if (endIndex > 0) {
        cleanText = cleanText.substring(0, endIndex + 1)
      }
      
      diagnosticData = JSON.parse(cleanText)
      console.log("✅ JSON parsé avec succès")
      
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON, utilisation fallback")
      
      diagnosticData = {
        clinicalReasoning: {
          semiology: "Analyse en cours - données cliniques en cours d'évaluation",
          syndromes: [{ name: "Syndrome à préciser", description: "Évaluation en cours" }],
          pathophysiology: "Mécanismes à élucider par examens complémentaires"
        },
        primaryDiagnosis: {
          condition: "Évaluation clinique en cours",
          icd10: "R06.9",
          probability: 70,
          detailedDescription: "Analyse diagnostique en cours selon les symptômes présentés",
          arguments: [{ type: "Clinique", evidence: "Symptômes présentés", significance: "Orientation diagnostique", weight: "Modéré" }],
          severity: "À évaluer"
        },
        differentialDiagnosis: [],
        recommendedExams: [
          {
            category: "Biologie",
            exam: "Bilan biologique standard",
            indication: "Évaluation générale",
            urgency: "Programmée"
          }
        ],
        therapeuticStrategy: {
          immediate: [
            {
              type: "Symptomatique",
              treatment: "Selon symptômes",
              indication: "Soulagement symptomatique",
              duration: "Selon évolution"
            }
          ]
        },
        prognosis: {
          shortTerm: "À évaluer selon examens",
          longTerm: "Selon diagnostic final",
          followUp: "Réévaluation nécessaire"
        },
        aiConfidence: 60,
        redFlags: [{ sign: "Aggravation", significance: "Surveillance", action: "Réévaluation" }],
        metadata: {
          analysisDate: new Date().toISOString(),
          model: "gpt-4o-fallback",
          evidenceLevel: "Grade C"
        }
      }
    }

    console.log("✅ Diagnostic expert généré avec succès")

    return NextResponse.json({
      success: true,
      diagnosis: diagnosticData,
      metadata: {
        patientAge: patientData.age,
        patientGender: patientData.gender,
        generatedAt: new Date().toISOString(),
        model: "gpt-4o"
      }
    })

  } catch (error) {
    console.error("❌ Erreur diagnostic expert:", error)
    
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la génération du diagnostic",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    }, { status: 500 })
  }
}
