import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🩺 API Diagnostic IA - Début")

    let requestData: {
      patientData?: any
      clinicalData?: any
      questionsData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour diagnostic IA")
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON diagnostic:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { patientData, clinicalData, questionsData } = requestData

    if (!patientData || !clinicalData) {
      console.log("⚠️ Données manquantes pour le diagnostic")
      return NextResponse.json(
        {
          error: "Données patient et cliniques requises",
          success: false,
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Diagnostic IA pour: ${patientData.firstName} ${patientData.lastName}`)

    const prompt = `
En tant qu'expert médical IA spécialisé en médecine tropicale pratiquant à l'île Maurice, analysez ce cas clinique en tenant compte du contexte géographique, climatique et épidémiologique local.

CONTEXTE MÉDICAL MAURICIEN:
- PATHOLOGIES ENDÉMIQUES: Dengue, chikungunya, paludisme (importé), leptospirose, fièvre typhoïde
- VECTEURS: Aedes aegypti/albopictus (dengue, chikungunya, Zika)
- SAISONS: Été cyclonique (nov-avril) = pic arboviroses, Hiver sec (mai-oct) = moins de vecteurs
- POPULATION: Multiethnique avec prédispositions génétiques variables
- ENVIRONNEMENT: Île tropicale, eaux stagnantes, forte humidité, cyclones
- VOYAGES: Proximité Madagascar (paludisme), Inde, Afrique

PATIENT:
- Identité: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
- Morphologie: ${patientData.weight}kg, ${patientData.height}cm (IMC: ${(patientData.weight / (patientData.height / 100) ** 2).toFixed(1)})
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
- Antécédents: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}
- Médicaments actuels: ${patientData.currentMedicationsText || "Aucun"}
- Habitudes: Tabac: ${patientData.lifeHabits?.smoking || "Non renseigné"}, Alcool: ${patientData.lifeHabits?.alcohol || "Non renseigné"}

DONNÉES CLINIQUES:
- Motif de consultation: ${clinicalData.chiefComplaint || "Non renseigné"}
- Symptômes détaillés: ${clinicalData.symptoms || "Non renseigné"}
- Examen physique: ${clinicalData.physicalExam || "Non renseigné"}
- Signes vitaux: 
  * Température: ${clinicalData.vitalSigns?.temperature || "?"}°C
  * Tension artérielle: ${clinicalData.vitalSigns?.bloodPressure || "?"}
  * Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate || "?"}/min
  * Fréquence respiratoire: ${clinicalData.vitalSigns?.respiratoryRate || "?"}/min
  * Saturation O2: ${clinicalData.vitalSigns?.oxygenSaturation || "?"}%

RÉPONSES AUX QUESTIONS IA:
${questionsData?.responses ? JSON.stringify(questionsData.responses, null, 2) : "Aucune réponse disponible"}

ANALYSE DIAGNOSTIQUE TROPICALE REQUISE:

Considérez PRIORITAIREMENT les pathologies tropicales mauriciennes:

1. ARBOVIROSES: Dengue (classique/hémorragique), Chikungunya, Zika
2. PALUDISME: Importé (voyage Madagascar/Afrique)
3. LEPTOSPIROSE: Contact eau contaminée, saison des pluies
4. FIÈVRE TYPHOÏDE: Eau/aliments contaminés
5. PATHOLOGIES MARINES: Intoxications, blessures corail
6. PATHOLOGIES SAISONNIÈRES: Liées aux cyclones, inondations

Format JSON requis avec focus tropical:

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic principal (privilégier pathologies tropicales si compatible)",
      "icd10": "Code CIM-10 correspondant",
      "confidence": 85,
      "rationale": "Raisonnement incluant contexte mauricien et épidémiologie tropicale",
      "severity": "mild|moderate|severe",
      "tropicalContext": "Spécificités liées au contexte tropical mauricien"
    },
    "differential": [
      {
        "condition": "Arbovirose (dengue/chikungunya) si fièvre + arthralgies",
        "probability": 25,
        "rationale": "Endémique à Maurice, transmission par Aedes",
        "ruleOutTests": ["NS1 dengue", "IgM chikungunya", "Plaquettes"]
      },
      {
        "condition": "Leptospirose si contact hydrique", 
        "probability": 15,
        "rationale": "Fréquente après inondations/cyclones à Maurice",
        "ruleOutTests": ["Sérologie leptospirose", "Créatinine"]
      },
      {
        "condition": "Paludisme si voyage récent",
        "probability": 10,
        "rationale": "Importé de Madagascar/Afrique",
        "ruleOutTests": ["Frottis sanguin", "Test rapide paludisme"]
      }
    ]
  },
  "recommendations": {
    "exams": [
      {
        "name": "Tests arboviroses (NS1, IgM dengue/chikungunya)",
        "code": "ARBO001",
        "category": "biologie",
        "indication": "Suspicion arbovirose en contexte tropical",
        "priority": "high"
      },
      {
        "name": "Numération plaquettaire",
        "code": "PLAQ001", 
        "category": "biologie",
        "indication": "Surveillance dengue (thrombopénie)",
        "priority": "high"
      }
    ],
    "medications": [
      {
        "name": "Paracétamol (éviter aspirine si suspicion dengue)",
        "dosage": "1g x 3/jour",
        "frequency": "Toutes les 8h",
        "duration": "Selon symptômes",
        "indication": "Antalgique/antipyrétique sûr en contexte tropical",
        "contraindications": ["Allergie paracétamol", "Insuffisance hépatique"]
      }
    ]
  },
  "tropicalConsiderations": {
    "seasonalFactors": "Impact saison actuelle sur pathologies vectorielles",
    "vectorExposure": "Évaluation exposition moustiques Aedes",
    "travelHistory": "Risque importation pathologies (paludisme)",
    "environmentalRisks": "Eau stagnante, inondations, cyclones",
    "endemicDiseases": "Pathologies spécifiques à Maurice"
  },
  "riskFactors": ["Facteurs tropicaux spécifiques", "Exposition vectorielle", "Saisonnalité"],
  "prognosis": "Pronostic adapté aux pathologies tropicales",
  "followUp": "Suivi spécialisé si pathologie tropicale confirmée",
  "urgencyLevel": 3,
  "redFlags": ["Signes dengue hémorragique", "Ictère (leptospirose)", "Convulsions (paludisme)"]
}

PRIORITÉS DIAGNOSTIQUES MAURICIENNES:
- Si fièvre + arthralgies = Chikungunya jusqu'à preuve du contraire
- Si fièvre + thrombopénie = Dengue à éliminer en urgence
- Si contact eau + fièvre = Leptospirose possible
- Si voyage récent + fièvre = Paludisme à éliminer
- Toujours considérer les pathologies tropicales AVANT les diagnostics tempérés

Analysez avec l'expertise d'un médecin tropicaliste mauricien expérimenté.
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.2,
      maxTokens: 3000,
    })

    console.log("🧠 Diagnostic IA tropical généré")

    // Tentative de parsing JSON avec fallback robuste
    let diagnosticData
    try {
      // Nettoyer le texte avant parsing
      let cleanedText = result.text.trim()

      // Extraire le JSON s'il est entouré de texte
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      diagnosticData = JSON.parse(cleanedText)

      // Validation de la structure minimale
      if (!diagnosticData.diagnosis || !diagnosticData.diagnosis.primary) {
        throw new Error("Structure diagnostic invalide")
      }

      console.log(`✅ Diagnostic tropical parsé: ${diagnosticData.diagnosis.primary.condition}`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON diagnostic, génération de fallback tropical")

      // Diagnostic de fallback adapté au contexte mauricien
      diagnosticData = generateMauritianFallbackDiagnosis(patientData, clinicalData, result.text)
    }

    const response = {
      success: true,
      diagnosis: diagnosticData.diagnosis,
      recommendations: diagnosticData.recommendations || {
        exams: [],
        medications: [],
      },
      tropicalConsiderations: diagnosticData.tropicalConsiderations || {},
      riskFactors: diagnosticData.riskFactors || [],
      prognosis: diagnosticData.prognosis || "Pronostic à évaluer selon l'évolution",
      followUp: diagnosticData.followUp || "Suivi à programmer selon les résultats",
      urgencyLevel: diagnosticData.urgencyLevel || 3,
      redFlags: diagnosticData.redFlags || [],
      metadata: {
        patientAge: patientData.age,
        patientGender: patientData.gender,
        chiefComplaint: clinicalData.chiefComplaint,
        aiModel: "gpt-4o",
        confidence: diagnosticData.diagnosis?.primary?.confidence || 75,
        generatedAt: new Date().toISOString(),
        location: "Maurice",
        climate: "tropical",
        medicalContext: "tropical_medicine",
      },
      rawAiResponse: result.text, // Pour debug
    }

    console.log(`✅ Diagnostic IA tropical retourné: ${diagnosticData.diagnosis.primary.condition}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Diagnostic IA:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du diagnostic",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function generateMauritianFallbackDiagnosis(patientData: any, clinicalData: any, aiText: string) {
  // Diagnostic de fallback adapté au contexte tropical mauricien
  const symptoms = clinicalData.symptoms?.toLowerCase() || ""
  const age = patientData.age || 0

  let primaryCondition = "Syndrome fébrile tropical à préciser"
  let icd10 = "R50.9"
  let confidence = 70
  const severity = "moderate"

  // Patterns symptomatiques tropicaux mauriciens
  if (symptoms.includes("fièvre") && symptoms.includes("douleur") && symptoms.includes("articul")) {
    primaryCondition = "Suspicion chikungunya"
    icd10 = "A92.0"
    confidence = 80
  } else if (symptoms.includes("fièvre") && (symptoms.includes("maux de tête") || symptoms.includes("céphalée"))) {
    primaryCondition = "Suspicion dengue"
    icd10 = "A90"
    confidence = 75
  } else if (symptoms.includes("fièvre") && symptoms.includes("diarrhée")) {
    primaryCondition = "Suspicion fièvre typhoïde"
    icd10 = "A01.0"
    confidence = 70
  } else if (symptoms.includes("fièvre") && symptoms.includes("ictère")) {
    primaryCondition = "Suspicion leptospirose"
    icd10 = "A27.9"
    confidence = 75
  }

  return {
    diagnosis: {
      primary: {
        condition: primaryCondition,
        icd10: icd10,
        confidence: confidence,
        rationale: `Diagnostic de fallback basé sur les symptômes en contexte tropical mauricien: ${symptoms.substring(0, 100)}...`,
        severity: severity,
        tropicalContext: "Pathologie compatible avec l'épidémiologie mauricienne",
      },
      differential: [
        {
          condition: "Arbovirose (dengue/chikungunya)",
          probability: 30,
          rationale: "Endémiques à Maurice, transmission par Aedes aegypti",
          ruleOutTests: ["NS1 dengue", "IgM chikungunya", "Plaquettes"],
        },
        {
          condition: "Leptospirose",
          probability: 20,
          rationale: "Fréquente après contact avec eau contaminée",
          ruleOutTests: ["Sérologie leptospirose", "Créatinine"],
        },
        {
          condition: "Paludisme importé",
          probability: 15,
          rationale: "Si voyage récent Madagascar/Afrique",
          ruleOutTests: ["Frottis sanguin", "Test rapide paludisme"],
        },
      ],
    },
    recommendations: {
      exams: [
        {
          name: "Tests arboviroses (NS1, IgM dengue/chikungunya)",
          code: "ARBO001",
          category: "biologie",
          indication: "Éliminer arboviroses endémiques",
          priority: "high",
        },
        {
          name: "Numération plaquettaire",
          code: "PLAQ001",
          category: "biologie",
          indication: "Surveillance dengue (thrombopénie)",
          priority: "high",
        },
      ],
      medications: [
        {
          name: "Paracétamol",
          dosage: "1g x 3/jour",
          frequency: "Toutes les 8h",
          duration: "Selon symptômes",
          indication: "Antalgique/antipyrétique (éviter aspirine si suspicion dengue)",
          contraindications: ["Allergie paracétamol"],
        },
      ],
    },
    tropicalConsiderations: {
      seasonalFactors: "Considérer la saison actuelle pour les pathologies vectorielles",
      vectorExposure: "Évaluer l'exposition aux moustiques Aedes",
      travelHistory: "Rechercher voyage récent (risque paludisme)",
      environmentalRisks: "Contact avec eau stagnante, inondations",
      endemicDiseases: "Pathologies tropicales mauriciennes courantes",
    },
    riskFactors: ["Exposition vectorielle", "Saison cyclonique", "Contact hydrique"],
    prognosis: "Pronostic généralement favorable avec prise en charge adaptée aux pathologies tropicales",
    followUp: "Réévaluation dans 24-48h, surveillance complications spécifiques (dengue hémorragique)",
    urgencyLevel: 3,
    redFlags: ["Thrombopénie sévère", "Ictère", "Convulsions", "Hémorragies"],
  }
}
