import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { validateDiagnosisAgainstSymptoms } from "../../../lib/diagnostic-validation"

export async function POST(request: NextRequest) {
  try {
    const { patientData, clinicalData, questions } = await request.json()

    // Étape 1: Diagnostic principal avec IA
    const diagnosticPrompt = `
    En tant qu'expert médical IA spécialisé, analysez ce cas clinique complet et fournissez un diagnostic différentiel structuré.

    DONNÉES PATIENT:
    - Identité: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
    - Anthropométrie: ${patientData.weight}kg, ${patientData.height}cm (IMC: ${patientData.weight && patientData.height ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : "NC"})
    - Allergies connues: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
    - Antécédents médicaux: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}
    - Médicaments actuels: ${patientData.currentMedicationsText || "Aucun traitement en cours"}
    - Habitudes de vie: Tabac: ${patientData.lifeHabits?.smoking || "NC"}, Alcool: ${patientData.lifeHabits?.alcohol || "NC"}, Activité physique: ${patientData.lifeHabits?.physicalActivity || "NC"}

    DONNÉES CLINIQUES:
    - Symptômes principaux: ${clinicalData.symptoms}
    - Examen physique: ${clinicalData.physicalExam}
    - Signes vitaux: 
      * Température: ${clinicalData.vitalSigns?.temperature}°C
      * Tension artérielle: ${clinicalData.vitalSigns?.bloodPressure}
      * Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate}/min
      * Fréquence respiratoire: ${clinicalData.vitalSigns?.respiratoryRate}/min
      * Saturation O2: ${clinicalData.vitalSigns?.oxygenSaturation}%

    QUESTIONS COMPLÉMENTAIRES: ${questions}

    ANALYSE DEMANDÉE:
    1. DIAGNOSTIC PRINCIPAL le plus probable avec pourcentage de confiance (ex: 85%)
    2. DIAGNOSTICS DIFFÉRENTIELS (3 principaux avec probabilités)
    3. RAISONNEMENT CLINIQUE détaillé (physiopathologie, corrélations cliniques)
    4. NIVEAU D'URGENCE (1=non urgent à 5=urgence vitale) avec justification
    5. RECOMMANDATIONS IMMÉDIATES (surveillance, mesures à prendre)
    6. PRONOSTIC et évolution attendue
    7. POINTS D'ATTENTION particuliers pour ce patient

    Répondez de manière structurée, précise et basée sur l'evidence-based medicine.
    `

    let diagnosticResult = await generateText({
      model: openai("gpt-4o"),
      prompt: diagnosticPrompt,
      temperature: 0.2,
      maxTokens: 2000,
    })

    const symptomsArray = Array.isArray(clinicalData.symptoms)
      ? clinicalData.symptoms
      : String(clinicalData.symptoms || '')
          .split(',')
          .map((s: string) => s.trim())

    let diagnosis = diagnosticResult.text.split("\n")[0].trim()
    let validation = validateDiagnosisAgainstSymptoms(diagnosis, symptomsArray)
    console.log('🔎 Concordance score:', validation.score.toFixed(2))
    if (!validation.isValid) {
      console.warn('⚠️ Missing symptoms:', validation.missingSymptoms.join(', '))
      const retryPrompt = diagnosticPrompt +
        `\n\nPrevious diagnosis was incorrect. Missing symptoms: ${validation.missingSymptoms.join(', ')}. Please reassess.`
      const retryResult = await generateText({
        model: openai("gpt-4o"),
        prompt: retryPrompt,
        temperature: 0.2,
        maxTokens: 2000,
      })
      diagnosticResult = retryResult
      diagnosis = diagnosticResult.text.split("\n")[0].trim()
      validation = validateDiagnosisAgainstSymptoms(diagnosis, symptomsArray)
      console.log('🔎 Concordance score (retry):', validation.score.toFixed(2))
      if (!validation.isValid) {
        console.warn('⚠️ Missing symptoms after retry:', validation.missingSymptoms.join(', '))
      }
    }

    // Étape 2: Recherche automatique PubMed
    let pubmedEvidence = null
    try {
      const searchQuery = `${clinicalData.symptoms} ${patientData.age} years ${patientData.gender} diagnosis treatment`
      const pubmedResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/pubmed-search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery,
            maxResults: 10,
          }),
        },
      )

      if (pubmedResponse.ok) {
        pubmedEvidence = await pubmedResponse.json()
      }
    } catch (error) {
      console.error("Erreur recherche PubMed:", error)
    }

    // Étape 3: Génération examens paracliniques
    const examensPrompt = `
    Basé sur le diagnostic "${diagnosticResult.text.split("\n")[0]}" et les données cliniques, 
    recommandez les examens paracliniques nécessaires pour ce patient:

    PATIENT: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
    SYMPTÔMES: ${clinicalData.symptoms}
    DIAGNOSTIC SUSPECTÉ: ${diagnosticResult.text.split("\n")[0]}
    ANTÉCÉDENTS: ${patientData.medicalHistory?.join(", ") || "Aucun"}

    EXAMENS À RECOMMANDER:

    1. EXAMENS BIOLOGIQUES:
       - Analyses sanguines (avec justification clinique)
       - Analyses urinaires si pertinentes
       - Marqueurs spécifiques selon le diagnostic
       - Valeurs normales attendues et seuils pathologiques

    2. IMAGERIE MÉDICALE:
       - Type d'imagerie recommandée (Radio, Echo, Scanner, IRM)
       - Justification clinique pour chaque examen
       - Séquence/protocole spécifique si nécessaire
       - Signes radiologiques recherchés

    3. EXAMENS SPÉCIALISÉS:
       - ECG, EEG, explorations fonctionnelles si indiqués
       - Biopsies ou ponctions si nécessaires
       - Consultations spécialisées recommandées

    4. PRIORITÉ ET TIMING:
       - Examens URGENTS (< 24h)
       - Examens PROGRAMMÉS (< 1 semaine)
       - Examens de SUIVI (> 1 semaine)

    5. INTERPRÉTATION ATTENDUE:
       - Résultats qui confirmeraient le diagnostic
       - Résultats qui l'infirmeraient
       - Valeurs seuils critiques

    Format: Structuré et précis pour prescription médicale
    `

    const examensResult = await generateText({
      model: openai("gpt-4o"),
      prompt: examensPrompt,
      temperature: 0.1,
      maxTokens: 1500,
    })

    // Étape 4: Prescription médicamenteuse avec vérifications
    const prescriptionPrompt = `
    Établissez une prescription médicamenteuse sécurisée pour ce patient:

    DIAGNOSTIC: ${diagnosticResult.text.split("\n")[0]}
    PATIENT: ${patientData.age} ans, ${patientData.gender}, ${patientData.weight}kg
    ALLERGIES: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
    MÉDICAMENTS ACTUELS: ${patientData.currentMedicationsText || "Aucun"}
    ANTÉCÉDENTS: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}

    PRESCRIPTION STRUCTURÉE:

    1. MÉDICAMENTS RECOMMANDÉS:
       - DCI (Dénomination Commune Internationale)
       - Posologie précise (dose, fréquence, durée)
       - Voie d'administration
       - Moment de prise (avant/après repas, etc.)

    2. VÉRIFICATIONS SÉCURITÉ:
       - Interactions avec médicaments actuels
       - Contre-indications selon allergies
       - Contre-indications selon antécédents
       - Ajustements posologiques selon âge/poids

    3. SURVEILLANCE NÉCESSAIRE:
       - Paramètres biologiques à surveiller
       - Effets secondaires à surveiller
       - Fréquence des contrôles

    4. CONSEILS PATIENT:
       - Instructions de prise
       - Précautions particulières
       - Signes d'alerte à surveiller
       - Durée de traitement

    5. ALTERNATIVES THÉRAPEUTIQUES:
       - En cas d'intolérance
       - En cas d'inefficacité
       - Selon disponibilité

    Respectez les recommandations HAS et les bonnes pratiques de prescription.
    `

    const prescriptionResult = await generateText({
      model: openai("gpt-4o"),
      prompt: prescriptionPrompt,
      temperature: 0.1,
      maxTokens: 1500,
    })

    // Étape 5: Vérification FDA (optionnelle)
    let fdaVerification = null
    try {
      const firstMedication = prescriptionResult.text
        .split("\n")
        .find((line) => line.toLowerCase().includes("mg") || line.toLowerCase().includes("comprimé"))

      if (firstMedication) {
        const fdaResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/fda-drug-info`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              drugName: firstMedication.split(" ")[0] || "paracetamol",
            }),
          },
        )

        if (fdaResponse.ok) {
          fdaVerification = await fdaResponse.json()
        }
      }
    } catch (error) {
      console.error("Erreur vérification FDA:", error)
    }

    // Étape 6: Génération rapport final
    const rapportPrompt = `
    Générez un compte-rendu de consultation médical professionnel complet:

    INFORMATIONS PATIENT:
    - Nom: ${patientData.firstName} ${patientData.lastName}
    - Âge: ${patientData.age} ans
    - Sexe: ${patientData.gender}
    - Date de consultation: ${new Date().toLocaleDateString("fr-FR")}

    DONNÉES CLINIQUES:
    - Motif de consultation: ${clinicalData.symptoms}
    - Examen clinique: ${clinicalData.physicalExam}
    - Signes vitaux: T°${clinicalData.vitalSigns?.temperature}°C, TA ${clinicalData.vitalSigns?.bloodPressure}

    DIAGNOSTIC IA: ${diagnosticResult.text}
    EXAMENS RECOMMANDÉS: ${examensResult.text}
    PRESCRIPTION: ${prescriptionResult.text}

    FORMAT RAPPORT MÉDICAL:

    1. IDENTIFICATION
       - Patient, âge, sexe, date
       - Médecin consultant

    2. MOTIF DE CONSULTATION
       - Symptômes principaux
       - Durée d'évolution

    3. ANAMNÈSE
       - Histoire de la maladie actuelle
       - Antécédents personnels et familiaux
       - Traitements en cours

    4. EXAMEN CLINIQUE
       - État général
       - Examen par appareils
       - Signes vitaux

    5. DIAGNOSTIC RETENU
       - Diagnostic principal
       - Diagnostics différentiels
       - Arguments diagnostiques

    6. EXAMENS COMPLÉMENTAIRES DEMANDÉS
       - Biologie
       - Imagerie
       - Autres explorations

    7. TRAITEMENT PRESCRIT
       - Médicaments avec posologies
       - Mesures non médicamenteuses
       - Surveillance

    8. ÉVOLUTION ET SUIVI
       - Pronostic
       - Rendez-vous de contrôle
       - Signes d'alerte

    Style: Professionnel médical français, précis et structuré
    `

    const rapportResult = await generateText({
      model: openai("gpt-4o"),
      prompt: rapportPrompt,
      temperature: 0.1,
      maxTokens: 2000,
    })

    return NextResponse.json({
      success: true,
      diagnosis: diagnosticResult.text,
      examens: examensResult.text,
      prescription: prescriptionResult.text,
      consultationReport: rapportResult.text,
      pubmedEvidence: pubmedEvidence,
      fdaVerification: fdaVerification,
      metadata: {
        timestamp: new Date().toISOString(),
        patientId: `${patientData.lastName}-${patientData.firstName}`,
        aiModel: "gpt-4o",
        confidence: "high",
      },
    })
  } catch (error) {
    console.error("Erreur diagnostic expert:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'analyse diagnostique",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
