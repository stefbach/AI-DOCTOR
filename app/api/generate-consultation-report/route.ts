import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("📋 Génération consultation report compatible consultation-editor")
    
    const requestData = await request.json()
    console.log("📥 Données reçues:", requestData)

    if (!requestData || !requestData.patientData || !requestData.clinicalData) {
      return NextResponse.json(
        { success: false, error: "Données insuffisantes" },
        { status: 400 },
      )
    }

    const { patientData, clinicalData, questionsData, diagnosisData } = requestData

    // Construction du prompt pour générer des données compatibles
    const comprehensivePrompt = `
Tu es un médecin expert mauricien. Génère UNIQUEMENT du JSON valide compatible avec consultation-editor.tsx.

DONNÉES PATIENT:
- Nom: ${patientData.firstName || "N/A"} ${patientData.lastName || "N/A"}
- Âge: ${patientData.age || "N/A"} ans, Sexe: ${patientData.gender || "N/A"}
- Poids: ${patientData.weight || "N/A"}kg, Taille: ${patientData.height || "N/A"}cm
- Antécédents: ${(patientData.medicalHistory || []).join(", ") || "Aucun"}
- Traitements: ${patientData.currentMedicationsText || "Aucun"}
- Allergies: ${(patientData.allergies || []).join(", ") || "Aucune"}

DONNÉES CLINIQUES:
- Motif: ${clinicalData.chiefComplaint || "Non spécifié"}
- Symptômes: ${(clinicalData.symptoms || []).join(", ") || "Aucun"}
- Durée: ${clinicalData.symptomDuration || "Non précisée"}
- Constantes: T°${clinicalData.vitalSigns?.temperature || "?"}°C, TA ${clinicalData.vitalSigns?.bloodPressureSystolic || "?"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "?"}mmHg

DIAGNOSTIC IA:
${diagnosisData?.diagnosis ? `
- Diagnostic: ${diagnosisData.diagnosis.primary?.condition || "Non déterminé"}
- Confiance: ${diagnosisData.diagnosis.primary?.confidence || 70}%
- Examens recommandés: ${diagnosisData.expertAnalysis?.expert_investigations?.immediate_priority?.map(e => e.examination).join(", ") || "À définir"}
- Traitements: ${diagnosisData.expertAnalysis?.expert_therapeutics?.primary_treatments?.map(t => t.medication_dci).join(", ") || "À définir"}
` : "Diagnostic non généré"}

GÉNÈRE EXACTEMENT cette structure JSON (remplace les valeurs par des données médicales appropriées):

{
  "consultationData": {
    "header": {
      "title": "COMPTE-RENDU DE CONSULTATION",
      "date": "${new Date().toLocaleDateString('fr-FR')}",
      "physician": "Dr. ${patientData.physicianName || 'MÉDECIN EXPERT'}",
      "patient": {
        "firstName": "${patientData.firstName || 'Patient'}",
        "lastName": "${patientData.lastName || 'X'}",
        "age": "${patientData.age || '?'} ans"
      }
    },
    "anamnesis": {
      "chiefComplaint": "${clinicalData.chiefComplaint || 'Motif de consultation'}",
      "historyOfDisease": "Histoire détaillée de la maladie actuelle basée sur les symptômes présentés",
      "duration": "${clinicalData.symptomDuration || 'Durée non précisée'}",
      "physicalExam": "Examen physique réalisé avec constantes vitales documentées"
    },
    "diagnosticAssessment": {
      "primaryDiagnosis": {
        "condition": "${diagnosisData?.diagnosis?.primary?.condition || 'Diagnostic à confirmer'}",
        "severity": "${diagnosisData?.diagnosis?.primary?.severity || 'modérée'}",
        "probability": ${diagnosisData?.diagnosis?.primary?.confidence || 75},
        "clinical_rationale": "Arguments cliniques basés sur la présentation symptomatique et l'examen"
      },
      "differentialDiagnosis": [
        ${diagnosisData?.diagnosis?.differential?.map((diff, i) => `{
          "condition": "${diff.condition || `Diagnostic différentiel ${i+1}`}",
          "probability": ${diff.probability || 20},
          "rationale": "${diff.rationale || 'Arguments à considérer'}"
        }`).join(',') || `{
          "condition": "Syndrome à préciser",
          "probability": 20,
          "rationale": "Nécessite investigation complémentaire"
        }`}
      ]
    },
    "investigationsPlan": {
      "laboratoryTests": {
        "urgentTests": [${diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority?.filter(e => e.category === 'biology')?.map(e => `"${e.examination}"`).join(',') || '"Hémogramme + CRP"'}],
        "routineTests": ["Bilan métabolique complet", "Fonction hépatique"]
      },
      "imaging": {
        "urgent": [${diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority?.filter(e => e.category === 'imaging')?.map(e => `"${e.examination}"`).join(',') || '"Radiographie thoracique"'}],
        "routine": []
      }
    },
    "therapeuticPlan": {
      "immediateManagement": {
        "urgentInterventions": [${diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments?.slice(0,1)?.map(t => `"${t.medication_dci} - ${t.dosing_regimen?.standard_adult || 'selon RCP'}"`).join(',') || '"Traitement symptomatique adapté"'}],
        "symptomaticTreatment": ["Traitement antalgique", "Surveillance clinique"]
      },
      "nonPharmacological": {
        "lifestyleModifications": ["Repos adapté", "Hydratation renforcée"],
        "patientEducation": ["Information sur la pathologie", "Conseils de surveillance"]
      }
    }
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "CONSULTATION MÉDICALE - RÉPUBLIQUE DE MAURICE",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "physician": "Dr. ${patientData.physicianName || 'MÉDECIN EXPERT'}",
        "registration": "MEDICAL-MU-${new Date().getFullYear()}"
      },
      "content": {
        "chiefComplaint": "${clinicalData.chiefComplaint || 'Motif de consultation'}",
        "clinicalSynthesis": "Synthèse clinique basée sur l'anamnèse et l'examen physique réalisés",
        "diagnosticReasoning": "Raisonnement diagnostique expert tenant compte du contexte mauricien",
        "therapeuticPlan": "Plan thérapeutique adapté aux ressources disponibles à Maurice",
        "mauritianRecommendations": "Recommandations spécifiques au système de santé mauricien"
      }
    },
    "biological": {
      "header": { "title": "PRESCRIPTION EXAMENS BIOLOGIQUES" },
      "examinations": [${diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority?.filter(e => e.category === 'biology')?.map(e => `{
        "name": "${e.examination}",
        "indication": "${e.specific_indication || 'Investigation diagnostique'}",
        "urgency": "${e.urgency || 'routine'}",
        "mauritianAvailability": {
          "publicCenters": "Dr Jeetoo, Candos",
          "privateCenters": "Apollo Bramwell, Lancet",
          "cost": "Rs 500-2000",
          "waitingTime": "24-48h"
        }
      }`).join(',') || `{
        "name": "Hémogramme complet + CRP",
        "indication": "Recherche syndrome inflammatoire",
        "urgency": "urgent",
        "mauritianAvailability": {
          "publicCenters": "Tous centres santé",
          "privateCenters": "Tous laboratoires",
          "cost": "Rs 600-1200",
          "waitingTime": "2-6h"
        }
      }`}]
    },
    "imaging": {
      "header": { "title": "PRESCRIPTION IMAGERIE" },
      "examinations": [${diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority?.filter(e => e.category === 'imaging')?.map(e => `{
        "name": "${e.examination}",
        "indication": "${e.specific_indication || 'Investigation diagnostique'}",
        "urgency": "${e.urgency || 'routine'}",
        "mauritianAvailability": {
          "publicCenters": "Dr Jeetoo Imagerie",
          "privateCenters": "Apollo Bramwell",
          "cost": "Rs 2000-8000",
          "waitingTime": "24-72h"
        }
      }`).join(',') || `{
        "name": "Radiographie thoracique",
        "indication": "Exclusion pathologie pleuro-pulmonaire",
        "urgency": "semi-urgent",
        "mauritianAvailability": {
          "publicCenters": "Dr Jeetoo Imagerie",
          "privateCenters": "Apollo Bramwell",
          "cost": "Rs 400-800",
          "waitingTime": "2-4h"
        }
      }`}]
    },
    "medication": {
      "header": { "title": "ORDONNANCE MÉDICALE" },
      "prescriptions": [${diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments?.map(t => `{
        "dci": "${t.medication_dci}",
        "indication": "${t.precise_indication || 'Traitement symptomatique'}",
        "posology": "${t.dosing_regimen?.standard_adult || 'Selon RCP'}",
        "duration": "${t.treatment_duration || '5-7 jours'}",
        "mauritianAvailability": {
          "available": ${t.mauritius_availability?.locally_available || true},
          "cost": "${t.mauritius_availability?.private_sector_cost || 'Rs 100-500'}"
        }
      }`).join(',') || `{
        "dci": "Paracétamol",
        "indication": "Traitement symptomatique douleur/fièvre",
        "posology": "1000mg x 3/jour",
        "duration": "3-5 jours",
        "mauritianAvailability": {
          "available": true,
          "cost": "Rs 50-200"
        }
      }`}]
    }
  }
}
`

    console.log("🧠 Génération avec OpenAI...")

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: comprehensivePrompt,
      maxTokens: 12000,
      temperature: 0.1,
    })

    console.log("✅ Réponse OpenAI reçue")

    // Parsing JSON robuste
    let consultationReport
    try {
      let cleanText = result.text.trim()
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      
      const startIndex = cleanText.indexOf('{')
      const endIndex = cleanText.lastIndexOf('}')
      
      if (startIndex >= 0 && endIndex > startIndex) {
        cleanText = cleanText.substring(startIndex, endIndex + 1)
      }
      
      consultationReport = JSON.parse(cleanText)
      console.log("✅ JSON parsé avec succès")
      
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing, génération fallback")
      consultationReport = generateCompatibleFallback(requestData)
    }

    // Validation structure
    if (!consultationReport.consultationData || !consultationReport.mauritianDocuments) {
      console.warn("⚠️ Structure invalide, utilisation fallback")
      consultationReport = generateCompatibleFallback(requestData)
    }

    console.log("✅ Consultation report généré avec succès")

    return NextResponse.json({
      success: true,
      data: consultationReport, // Structure compatible avec consultation-editor
      metadata: {
        generatedAt: new Date().toISOString(),
        model: "gpt-4o",
        compatible: "consultation-editor.tsx",
        patientId: `${patientData.lastName}-${patientData.firstName}`,
        consultationDate: new Date().toLocaleDateString('fr-FR')
      },
    })

  } catch (error) {
    console.error("❌ Erreur génération:", error)

    // Fallback ultime
    const fallbackReport = generateCompatibleFallback(requestData || {})

    return NextResponse.json({
      success: true,
      data: fallbackReport,
      fallback: true,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}

function generateCompatibleFallback(requestData: any) {
  const { patientData = {}, clinicalData = {}, diagnosisData = {} } = requestData

  return {
    consultationData: {
      header: {
        title: "COMPTE-RENDU DE CONSULTATION",
        date: new Date().toLocaleDateString('fr-FR'),
        physician: `Dr. ${patientData.physicianName || 'MÉDECIN EXPERT'}`,
        patient: {
          firstName: patientData.firstName || 'Patient',
          lastName: patientData.lastName || 'X',
          age: `${patientData.age || '?'} ans`
        }
      },
      anamnesis: {
        chiefComplaint: clinicalData.chiefComplaint || 'Motif de consultation à préciser',
        historyOfDisease: `Le patient présente ${clinicalData.chiefComplaint || 'des symptômes'} évoluant depuis ${clinicalData.symptomDuration || 'une durée non précisée'}. L'anamnèse révèle ${(clinicalData.symptoms || []).join(', ') || 'une symptomatologie'} nécessitant une évaluation médicale approfondie.`,
        duration: clinicalData.symptomDuration || 'Durée non précisée',
        physicalExam: `Examen physique : état général correct, constantes vitales stables. T° ${clinicalData.vitalSigns?.temperature || '37'}°C, TA ${clinicalData.vitalSigns?.bloodPressureSystolic || '120'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || '80'} mmHg. Examen clinique orienté selon la symptomatologie.`
      },
      diagnosticAssessment: {
        primaryDiagnosis: {
          condition: diagnosisData?.diagnosis?.primary?.condition || `Syndrome clinique - ${clinicalData.chiefComplaint || 'à préciser'}`,
          severity: diagnosisData?.diagnosis?.primary?.severity || 'modérée',
          probability: diagnosisData?.diagnosis?.primary?.confidence || 75,
          clinical_rationale: `Arguments cliniques : présentation compatible avec ${diagnosisData?.diagnosis?.primary?.condition || 'un syndrome clinique'}. Symptomatologie évocatrice avec ${(clinicalData.symptoms || ['symptômes généraux']).join(', ')}. Nécessite investigation complémentaire pour confirmation diagnostique.`
        },
        differentialDiagnosis: diagnosisData?.diagnosis?.differential || [
          {
            condition: "Syndrome viral",
            probability: 30,
            rationale: "Présentation clinique compatible, contexte épidémiologique"
          },
          {
            condition: "Syndrome inflammatoire",
            probability: 25,
            rationale: "Symptomatologie pouvant évoquer un processus inflammatoire"
          }
        ]
      },
      investigationsPlan: {
        laboratoryTests: {
          urgentTests: diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority?.filter(e => e.category === 'biology')?.map(e => e.examination) || ["Hémogramme complet + CRP", "Ionogramme sanguin"],
          routineTests: ["Bilan hépatique", "Fonction rénale", "Glycémie à jeun"]
        },
        imaging: {
          urgent: diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority?.filter(e => e.category === 'imaging')?.map(e => e.examination) || ["Radiographie thoracique"],
          routine: ["Échographie abdominale si indiquée"]
        }
      },
      therapeuticPlan: {
        immediateManagement: {
          urgentInterventions: diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments?.slice(0,2)?.map(t => `${t.medication_dci} - ${t.dosing_regimen?.standard_adult || 'selon RCP'}`) || ["Paracétamol 1000mg x 3/jour", "Surveillance clinique"],
          symptomaticTreatment: ["Repos", "Hydratation", "Antalgiques selon besoin"]
        },
        nonPharmacological: {
          lifestyleModifications: ["Repos adapté selon symptômes", "Hydratation renforcée (2-3L/jour)", "Évitement activités intenses"],
          patientEducation: ["Information sur la pathologie", "Signes d'alarme à surveiller", "Importance du suivi médical"]
        }
      }
    },
    mauritianDocuments: {
      consultation: {
        header: {
          title: "CONSULTATION MÉDICALE - RÉPUBLIQUE DE MAURICE",
          date: new Date().toLocaleDateString('fr-FR'),
          physician: `Dr. ${patientData.physicianName || 'MÉDECIN EXPERT'}`,
          registration: `MEDICAL-MU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        },
        content: {
          chiefComplaint: clinicalData.chiefComplaint || 'Motif de consultation à préciser',
          clinicalSynthesis: `Patient de ${patientData.age || '?'} ans consultant pour ${clinicalData.chiefComplaint || 'motif médical'}. Examen clinique compatible avec ${diagnosisData?.diagnosis?.primary?.condition || 'un syndrome clinique'}. Plan de prise en charge adapté selon recommandations.`,
          diagnosticReasoning: `Diagnostic retenu : ${diagnosisData?.diagnosis?.primary?.condition || 'à confirmer'}. Arguments : présentation clinique évocatrice, contexte anamnestique compatible. Investigation complémentaire programmée selon protocole.`,
          therapeuticPlan: `Traitement symptomatique instauré. Surveillance clinique programmée. Examens complémentaires selon indication. Réévaluation dans 7-10 jours ou plus tôt si aggravation.`,
          mauritianRecommendations: "Adaptation aux ressources système santé mauricien. Accès facilité centres publics (Dr Jeetoo, Candos) et privés (Apollo Bramwell). Urgences 999. Suivi médical programmé."
        }
      },
      biological: {
        header: { 
          title: "PRESCRIPTION EXAMENS BIOLOGIQUES - RÉPUBLIQUE DE MAURICE",
          date: new Date().toLocaleDateString('fr-FR'),
          physician: `Dr. ${patientData.physicianName || 'MÉDECIN EXPERT'}`
        },
        examinations: [
          {
            name: "Hémogramme complet + CRP + VS",
            indication: "Recherche syndrome anémique, infectieux, inflammatoire",
            urgency: "urgent",
            mauritianAvailability: {
              publicCenters: "Dr Jeetoo Hospital, Candos Hospital, Tous centres santé",
              privateCenters: "Lancet Laboratories, Cerba, Apollo Bramwell",
              cost: "Rs 600-1200",
              waitingTime: "2-6h urgence, 24h routine"
            }
          },
          {
            name: "Ionogramme sanguin + Créatinine + Urée",
            indication: "Bilan métabolique, fonction rénale",
            urgency: "routine",
            mauritianAvailability: {
              publicCenters: "Tous centres santé publics",
              privateCenters: "Tous laboratoires privés",
              cost: "Rs 800-1500",
              waitingTime: "24-48h"
            }
          }
        ]
      },
      imaging: {
        header: { 
          title: "PRESCRIPTION IMAGERIE MÉDICALE - RÉPUBLIQUE DE MAURICE",
          date: new Date().toLocaleDateString('fr-FR'),
          physician: `Dr. ${patientData.physicianName || 'MÉDECIN EXPERT'}`
        },
        examinations: [
          {
            name: "Radiographie thoracique face + profil",
            indication: "Exclusion pathologie pleuro-pulmonaire, cardiomégalie",
            urgency: "semi-urgent",
            mauritianAvailability: {
              publicCenters: "Dr Jeetoo Imagerie, Candos, Flacq Hospital",
              privateCenters: "Apollo Bramwell, Wellkin, Clinique Darné",
              cost: "Rs 400-800",
              waitingTime: "2-4h urgence, 1-3 jours routine"
            }
          }
        ]
      },
      medication: {
        header: { 
          title: "ORDONNANCE MÉDICALE - RÉPUBLIQUE DE MAURICE",
          date: new Date().toLocaleDateString('fr-FR'),
          physician: `Dr. ${patientData.physicianName || 'MÉDECIN EXPERT'}`,
          validity: "Ordonnance valable 6 mois"
        },
        prescriptions: [
          {
            dci: "Paracétamol",
            indication: "Traitement symptomatique douleur et fièvre",
            posology: "1000mg x 3-4/jour per os (max 4g/24h)",
            duration: "3-5 jours selon symptômes",
            mauritianAvailability: {
              available: true,
              cost: "Rs 50-200/semaine"
            }
          }
        ]
      }
    }
  }
}
