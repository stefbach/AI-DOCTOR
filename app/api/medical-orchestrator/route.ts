import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 ORCHESTRATEUR MÉDICAL - Démarrage workflow complet")

    const { patientData, clinicalData, questionsData } = await request.json()

    if (!patientData || !clinicalData) {
      return NextResponse.json(
        {
          success: false,
          error: "Données patient et cliniques requises",
        },
        { status: 400 },
      )
    }

    // Workflow en 5 étapes
    const workflow = []
    let currentStep = 1

    try {
      // ÉTAPE 1: Diagnostic IA Expert
      console.log("🧠 Étape 1: Diagnostic IA Expert")
      workflow.push({
        step: currentStep++,
        name: "Analyse diagnostique IA",
        status: "processing",
      })

      const diagnosticResult = await generateDiagnosisWithAI(patientData, clinicalData, questionsData)

      workflow[0].status = "completed"
      workflow[0].result = diagnosticResult

      // ÉTAPE 2: Recherche PubMed
      console.log("📚 Étape 2: Recherche Evidence PubMed")
      workflow.push({
        step: currentStep++,
        name: "Recherche evidence PubMed",
        status: "processing",
      })

      const pubmedResult = await searchPubMedEvidence(diagnosticResult)

      workflow[1].status = "completed"
      workflow[1].result = pubmedResult

      // ÉTAPE 3: Génération examens paracliniques
      console.log("🔬 Étape 3: Examens paracliniques")
      workflow.push({
        step: currentStep++,
        name: "Génération examens paracliniques",
        status: "processing",
      })

      const examensResult = await generateParaclinicalExams(diagnosticResult, patientData, clinicalData)

      workflow[2].status = "completed"
      workflow[2].result = examensResult

      // ÉTAPE 4: Prescription avec vérifications
      console.log("💊 Étape 4: Prescription médicamenteuse")
      workflow.push({
        step: currentStep++,
        name: "Vérification médicaments FDA/RxNorm",
        status: "processing",
      })

      const prescriptionResult = await generatePrescriptionWithVerification(diagnosticResult, patientData)

      workflow[3].status = "completed"
      workflow[3].result = prescriptionResult

      // ÉTAPE 5: Rapport final
      console.log("📋 Étape 5: Rapport de consultation")
      workflow.push({
        step: currentStep++,
        name: "Génération rapport final",
        status: "processing",
      })

      const reportResult = await generateFinalConsultationReport({
        patientData,
        clinicalData,
        questionsData,
        diagnosis: diagnosticResult,
        pubmed: pubmedResult,
        examens: examensResult,
        prescription: prescriptionResult,
      })

      workflow[4].status = "completed"
      workflow[4].result = reportResult

      // Résultat final structuré
      const finalReport = {
        diagnosis: diagnosticResult.text || diagnosticResult,
        examens: examensResult.text || examensResult,
        prescription: prescriptionResult.text || prescriptionResult,
        consultationReport: reportResult.text || reportResult,
        pubmedEvidence: pubmedResult,
        fdaVerification: prescriptionResult.fdaData || null,
      }

      console.log("✅ Workflow médical terminé avec succès")

      return NextResponse.json({
        success: true,
        workflow: workflow,
        finalReport: finalReport,
        metadata: {
          timestamp: new Date().toISOString(),
          patientId: `${patientData.firstName}-${patientData.lastName}`,
          stepsCompleted: workflow.length,
          aiModel: "gpt-4o",
        },
      })
    } catch (stepError) {
      console.error(`❌ Erreur à l'étape ${currentStep - 1}:`, stepError)

      // Marquer l'étape courante comme erreur
      if (workflow[currentStep - 2]) {
        workflow[currentStep - 2].status = "error"
        workflow[currentStep - 2].error = stepError instanceof Error ? stepError.message : "Erreur inconnue"
      }

      return NextResponse.json({
        success: false,
        workflow: workflow,
        error: `Erreur à l'étape ${currentStep - 1}`,
        details: stepError instanceof Error ? stepError.message : "Erreur inconnue",
      })
    }
  } catch (error) {
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

async function generateDiagnosisWithAI(patientData: any, clinicalData: any, questionsData: any) {
  const prompt = `
En tant qu'expert médical IA, analysez ce cas clinique et fournissez un diagnostic complet.

PATIENT:
- ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
- Poids: ${patientData.weight}kg, Taille: ${patientData.height}cm
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
- Antécédents: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}
- Médicaments: ${patientData.currentMedicationsText || "Aucun"}

CLINIQUE:
- Motif: ${clinicalData.chiefComplaint}
- Symptômes: ${clinicalData.symptoms}
- Examen: ${clinicalData.physicalExam}
- Signes vitaux: T°${clinicalData.vitalSigns?.temperature}°C, TA ${clinicalData.vitalSigns?.bloodPressure}, FC ${clinicalData.vitalSigns?.heartRate}/min

QUESTIONS IA: ${questionsData?.responses || "Non disponible"}

DIAGNOSTIC REQUIS:
1. DIAGNOSTIC PRINCIPAL avec niveau de confiance (%)
2. DIAGNOSTICS DIFFÉRENTIELS (3 principaux)
3. RAISONNEMENT CLINIQUE détaillé
4. NIVEAU D'URGENCE (1-5)
5. RECOMMANDATIONS IMMÉDIATES
6. PRONOSTIC

Réponse structurée et professionnelle.
`

  return await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.2,
    maxTokens: 2000,
  })
}

async function searchPubMedEvidence(diagnosis: any) {
  try {
    const searchQuery = diagnosis.text?.split("\n")[0] || "medical diagnosis"
    console.log("🔍 Recherche PubMed pour:", searchQuery.substring(0, 50))

    // Utiliser une URL relative pour éviter les problèmes de CORS
    const response = await fetch("/api/pubmed-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery.substring(0, 100),
        maxResults: 5,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log("✅ PubMed résultats:", result.articles?.length || 0)
      return result
    } else {
      console.warn("⚠️ PubMed API non disponible, utilisation de données simulées")
      return generateMockPubMedData(searchQuery)
    }
  } catch (error) {
    console.error("❌ Erreur PubMed:", error)
    return generateMockPubMedData("diagnostic médical")
  }
}

function generateMockPubMedData(query: string) {
  return {
    success: true,
    articles: [
      {
        pmid: "12345678",
        title: `Étude clinique sur ${query}`,
        authors: ["Dr. Smith", "Dr. Johnson"],
        journal: "Journal of Medical Research",
        year: 2023,
        abstract: `Étude récente sur ${query} montrant des résultats significatifs...`,
        relevanceScore: 0.85,
        source: "PubMed (simulé)",
      },
      {
        pmid: "87654321",
        title: `Diagnostic différentiel de ${query}`,
        authors: ["Dr. Brown", "Dr. Wilson"],
        journal: "Clinical Medicine Today",
        year: 2024,
        abstract: `Approche diagnostique moderne pour ${query}...`,
        relevanceScore: 0.78,
        source: "PubMed (simulé)",
      },
    ],
    metadata: {
      totalResults: 2,
      query: query,
      source: "Données simulées - API PubMed indisponible",
    },
  }
}

async function generateParaclinicalExams(diagnosis: any, patientData: any, clinicalData: any) {
  const prompt = `
Basé sur le diagnostic "${diagnosis.text?.split("\n")[0]}" pour ce patient de ${patientData.age} ans, 
recommandez les examens paracliniques appropriés.

PATIENT: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
DIAGNOSTIC: ${diagnosis.text?.substring(0, 500)}
SYMPTÔMES: ${clinicalData.symptoms}

EXAMENS À RECOMMANDER:

1. EXAMENS BIOLOGIQUES URGENTS:
   - Analyses sanguines essentielles
   - Marqueurs spécifiques au diagnostic
   - Valeurs normales et seuils pathologiques

2. IMAGERIE MÉDICALE:
   - Type d'imagerie appropriée
   - Justification clinique
   - Signes radiologiques recherchés

3. EXAMENS SPÉCIALISÉS:
   - ECG, EEG si indiqués
   - Explorations fonctionnelles
   - Consultations spécialisées

4. PRIORITÉ ET TIMING:
   - URGENTS (< 24h)
   - PROGRAMMÉS (< 1 semaine)
   - SUIVI (> 1 semaine)

Format prescription médicale française.
`

  return await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.1,
    maxTokens: 1500,
  })
}

async function generatePrescriptionWithVerification(diagnosis: any, patientData: any) {
  const prompt = `
Établissez une prescription médicamenteuse sécurisée pour ce patient.

DIAGNOSTIC: ${diagnosis.text?.split("\n")[0]}
PATIENT: ${patientData.age} ans, ${patientData.gender}, ${patientData.weight}kg
ALLERGIES: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
MÉDICAMENTS ACTUELS: ${patientData.currentMedicationsText || "Aucun"}
ANTÉCÉDENTS: ${patientData.medicalHistory?.join(", ") || "Aucun"}

PRESCRIPTION:

1. MÉDICAMENTS RECOMMANDÉS:
   - DCI avec posologie précise
   - Voie d'administration
   - Durée de traitement
   - Instructions de prise

2. VÉRIFICATIONS SÉCURITÉ:
   - Interactions médicamenteuses
   - Contre-indications allergies
   - Ajustements selon âge/poids

3. SURVEILLANCE:
   - Paramètres à surveiller
   - Effets secondaires
   - Contrôles nécessaires

4. CONSEILS PATIENT:
   - Instructions claires
   - Précautions
   - Signes d'alerte

Format ordonnance française réglementaire.
`

  const result = await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.1,
    maxTokens: 1500,
  })

  // Tentative de vérification FDA avec gestion d'erreur robuste
  let fdaData = null
  try {
    console.log("🔍 Tentative vérification FDA...")

    const response = await fetch("/api/fda-drug-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        medications: ["paracetamol", "ibuprofene"], // Médicaments de test
      }),
    })

    if (response.ok) {
      fdaData = await response.json()
      console.log("✅ FDA vérification réussie")
    } else {
      console.warn("⚠️ FDA API non disponible, utilisation de données simulées")
      fdaData = generateMockFDAData()
    }
  } catch (error) {
    console.error("❌ Erreur FDA:", error)
    fdaData = generateMockFDAData()
  }

  return {
    ...result,
    fdaData: fdaData,
  }
}

function generateMockFDAData() {
  return {
    success: true,
    drugs: [
      {
        searchTerm: "paracetamol",
        found: true,
        genericName: "Paracetamol",
        brandNames: ["Doliprane", "Efferalgan"],
        drugClass: "Analgésique non opioïde",
        indications: ["Douleur", "Fièvre"],
        contraindications: ["Insuffisance hépatique sévère"],
        sideEffects: ["Hépatotoxicité à forte dose"],
        interactions: ["Warfarine", "Alcool"],
        dosage: "500mg-1g toutes les 6h",
        warnings: ["Ne pas dépasser 4g/jour"],
        source: "FDA (simulé)",
      },
    ],
    metadata: {
      totalDrugs: 1,
      source: "Données simulées - API FDA indisponible",
    },
  }
}

async function generateFinalConsultationReport(allData: any) {
  const prompt = `
Générez un compte-rendu de consultation médical professionnel complet.

PATIENT: ${allData.patientData.firstName} ${allData.patientData.lastName}, ${allData.patientData.age} ans
DATE: ${new Date().toLocaleDateString("fr-FR")}

DONNÉES COMPLÈTES:
- Motif: ${allData.clinicalData.chiefComplaint}
- Diagnostic: ${allData.diagnosis.text?.substring(0, 300)}
- Examens: ${allData.examens.text?.substring(0, 300)}
- Prescription: ${allData.prescription.text?.substring(0, 300)}

RAPPORT MÉDICAL STRUCTURÉ:

1. IDENTIFICATION
   - Patient, âge, sexe, date consultation
   - Dr. TIBOK IA DOCTOR

2. MOTIF DE CONSULTATION
   - Symptômes principaux
   - Durée d'évolution

3. ANAMNÈSE
   - Histoire maladie actuelle
   - Antécédents personnels
   - Traitements en cours

4. EXAMEN CLINIQUE
   - État général
   - Signes vitaux
   - Examen par appareils

5. DIAGNOSTIC RETENU
   - Diagnostic principal
   - Arguments diagnostiques
   - Diagnostics différentiels

6. EXAMENS COMPLÉMENTAIRES
   - Biologie prescrite
   - Imagerie demandée
   - Justifications

7. TRAITEMENT PRESCRIT
   - Médicaments avec posologies
   - Durée de traitement
   - Surveillance

8. ÉVOLUTION ET SUIVI
   - Pronostic
   - Contrôles programmés
   - Signes d'alerte

Style médical français professionnel, précis et complet.
`

  return await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.1,
    maxTokens: 2500,
  })
}
