import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API Drug Verification - Analyse sécurité médicamenteuse")

    const requestData = await request.json()
    console.log("📝 Données reçues:", JSON.stringify(requestData, null, 2))

    const { medications, patientProfile, checkTraditionalMedicine, mauritianContext } = requestData

    if (!medications || !Array.isArray(medications)) {
      return NextResponse.json({ error: "Liste de médicaments requise", success: false }, { status: 400 })
    }

    // Appel aux APIs FDA et RxNorm pour chaque médicament
    const medicationAnalysis = await Promise.all(
      medications.map(async (medication: string) => {
        const analysis = {
          medication: medication,
          fdaData: null,
          rxNormData: null,
          safetyProfile: {},
          contraindications: { applicable: [], potential: [] },
          monitoring: { clinicalSigns: [], laboratoryTests: [] },
          interactionMatrix: { interactions: [] },
          mauritianSpecifics: {},
          clinicalNotes: [],
        }

        // Appel FDA
        try {
          const fdaResponse = await fetch("/api/fda-drug-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ medications: [medication] }),
          })

          if (fdaResponse.ok) {
            const fdaData = await fdaResponse.json()
            analysis.fdaData = fdaData

            // Extraction des données de sécurité
            if (fdaData.medications && fdaData.medications.length > 0) {
              const drugInfo = fdaData.medications[0]
              analysis.contraindications.applicable = drugInfo.contraindications || []
              analysis.monitoring.clinicalSigns = drugInfo.warnings || []
              analysis.interactionMatrix.interactions = drugInfo.interactions || []
            }
          }
        } catch (error) {
          console.error(`Erreur FDA pour ${medication}:`, error)
        }

        // Appel RxNorm
        try {
          const rxNormResponse = await fetch("/api/rxnorm-normalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ drugName: medication }),
          })

          if (rxNormResponse.ok) {
            analysis.rxNormData = await rxNormResponse.json()
          }
        } catch (error) {
          console.error(`Erreur RxNorm pour ${medication}:`, error)
        }

        // Analyse spécifique au profil patient
        if (patientProfile) {
          analysis.clinicalNotes = generateClinicalNotes(medication, patientProfile, analysis.fdaData)
          analysis.mauritianSpecifics = generateMauritianSpecifics(medication, mauritianContext)
        }

        return analysis
      }),
    )

    // Analyse des interactions croisées
    const crossInteractions = analyzeCrossInteractions(medicationAnalysis)

    // Recommandations de sécurité globales
    const safetyRecommendations = generateSafetyRecommendations(medicationAnalysis, patientProfile)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        medications: medicationAnalysis,
        crossInteractions: crossInteractions,
        safetyRecommendations: safetyRecommendations,
        patientSpecificWarnings: generatePatientWarnings(patientProfile, medicationAnalysis),
        monitoringPlan: generateMonitoringPlan(medicationAnalysis, patientProfile),
      },
      metadata: {
        apisUsed: ["FDA", "RxNorm"],
        analysisLevel: "Expert",
        mauritianContext: mauritianContext || false,
      },
    }

    console.log("✅ Analyse sécurité médicamenteuse complétée")
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Drug Verification:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la vérification médicamenteuse",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function generateClinicalNotes(medication: string, patientProfile: any, fdaData: any): string[] {
  const notes: string[] = []

  // Notes basées sur l'âge
  if (patientProfile.age > 65) {
    notes.push(`Ajustement posologique recommandé chez le sujet âgé pour ${medication}`)
    notes.push("Surveillance renforcée des effets indésirables")
  }

  // Notes basées sur les comorbidités
  if (patientProfile.comorbidities?.includes("insuffisance rénale")) {
    notes.push(`Adaptation posologique nécessaire selon fonction rénale pour ${medication}`)
  }

  if (patientProfile.comorbidities?.includes("insuffisance hépatique")) {
    notes.push(`Surveillance hépatique renforcée avec ${medication}`)
  }

  // Notes basées sur les données FDA
  if (fdaData?.medications?.[0]?.warnings) {
    notes.push(`Avertissements FDA: ${fdaData.medications[0].warnings.join(", ")}`)
  }

  return notes
}

function generateMauritianSpecifics(medication: string, mauritianContext: boolean): any {
  if (!mauritianContext) return {}

  return {
    availability: "Public", // À déterminer selon le médicament
    cost: "Low",
    formularyStatus: "Essential",
    localAlternatives: [],
    importRequirements: false,
    tropicalConsiderations: [],
  }
}

function analyzeCrossInteractions(medicationAnalysis: any[]): any[] {
  const interactions: any[] = []

  for (let i = 0; i < medicationAnalysis.length; i++) {
    for (let j = i + 1; j < medicationAnalysis.length; j++) {
      const med1 = medicationAnalysis[i]
      const med2 = medicationAnalysis[j]

      // Recherche d'interactions entre med1 et med2
      const interaction = findInteraction(med1, med2)
      if (interaction) {
        interactions.push(interaction)
      }
    }
  }

  return interactions
}

function findInteraction(med1: any, med2: any): any | null {
  // Logique de recherche d'interactions basée sur les données FDA
  if (med1.fdaData?.medications?.[0]?.interactions) {
    const interactions = med1.fdaData.medications[0].interactions
    const relevantInteraction = interactions.find(
      (int: any) =>
        int.drug.toLowerCase().includes(med2.medication.toLowerCase()) ||
        med2.medication.toLowerCase().includes(int.drug.toLowerCase()),
    )

    if (relevantInteraction) {
      return {
        medication1: med1.medication,
        medication2: med2.medication,
        severity: relevantInteraction.severity,
        description: relevantInteraction.description,
        management: "Surveillance clinique renforcée",
        source: "FDA Database",
      }
    }
  }

  return null
}

function generateSafetyRecommendations(medicationAnalysis: any[], patientProfile: any): string[] {
  const recommendations: string[] = []

  // Recommandations générales
  recommendations.push("Surveillance clinique régulière recommandée")
  recommendations.push("Informer le patient des effets indésirables possibles")

  // Recommandations spécifiques selon l'âge
  if (patientProfile?.age > 65) {
    recommendations.push("Débuter par les doses les plus faibles chez le sujet âgé")
    recommendations.push("Surveillance renforcée des interactions médicamenteuses")
  }

  // Recommandations selon les comorbidités
  if (patientProfile?.comorbidities?.includes("insuffisance rénale")) {
    recommendations.push("Surveillance de la fonction rénale obligatoire")
    recommendations.push("Adaptation posologique selon clairance créatinine")
  }

  return recommendations
}

function generatePatientWarnings(patientProfile: any, medicationAnalysis: any[]): string[] {
  const warnings: string[] = []

  // Avertissements basés sur les allergies
  if (patientProfile?.allergies?.length > 0) {
    warnings.push("Vérifier les allergies croisées avec les médicaments prescrits")
  }

  // Avertissements basés sur l'âge
  if (patientProfile?.age > 75) {
    warnings.push("Risque accru d'effets indésirables chez le sujet très âgé")
  }

  return warnings
}

function generateMonitoringPlan(medicationAnalysis: any[], patientProfile: any): any {
  return {
    clinical: [
      "Surveillance des signes vitaux",
      "Évaluation de l'efficacité thérapeutique",
      "Recherche d'effets indésirables",
    ],
    laboratory: [
      "Bilan hépatique si médicaments hépatotoxiques",
      "Fonction rénale si médicaments néphrotoxiques",
      "Ionogramme selon médicaments",
    ],
    frequency: "Selon recommandations spécifiques à chaque médicament",
    duration: "Pendant toute la durée du traitement",
  }
}
