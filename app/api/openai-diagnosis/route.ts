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
En tant qu'expert médical, analysez ce cas clinique en suivant une démarche diagnostique rigoureuse.

PRIORITÉ: Diagnostic différentiel basé sur les SYMPTÔMES et l'EXAMEN CLINIQUE d'abord, puis contexte géographique si pertinent.

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

RÉPONSES AUX QUESTIONS DIAGNOSTIQUES:
${questionsData?.responses ? JSON.stringify(questionsData.responses, null, 2) : "Aucune réponse disponible"}

CONTEXTE GÉOGRAPHIQUE (secondaire):
- Localisation: Île Maurice (climat tropical)
- Pathologies endémiques possibles: Dengue, chikungunya, paludisme (importé), leptospirose, fièvre typhoïde
- Saisons et vecteurs: Considérer selon pertinence clinique

DÉMARCHE DIAGNOSTIQUE:
1. ANALYSEZ les symptômes et signes cliniques
2. ÉTABLISSEZ le diagnostic différentiel classique
3. INTÉGREZ les réponses aux questions pour affiner
4. CONSIDÉREZ le contexte géographique UNIQUEMENT si cliniquement pertinent
5. PRIORISEZ selon la probabilité clinique

Instructions spécifiques:
- Douleur thoracique → Étiologies cardio-pulmonaires D'ABORD, puis contexte si fièvre associée
- Fièvre isolée → Causes infectieuses courantes, puis arboviroses si exposition/saisonnalité
- Troubles digestifs → Causes gastro-entérologiques, puis pathologies hydriques si contexte
- Céphalées → Causes neurologiques/vasculaires, puis pathologies tropicales si fièvre
- Symptômes respiratoires → Pneumopathies classiques avant pathologies exotiques

DIAGNOSTIC DIFFÉRENTIEL ADAPTÉ:
- Prioriser les pathologies FRÉQUENTES correspondant aux symptômes
- Intégrer les pathologies tropicales SEULEMENT si:
  * Fièvre + exposition vectorielle documentée
  * Voyage récent + syndrome compatible
  * Symptômes évocateurs + saisonnalité
  * Échec des traitements classiques

Format JSON requis:
{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic le plus probable basé sur les symptômes",
      "icd10": "Code CIM-10 correspondant",
      "confidence": 85,
      "rationale": "Raisonnement médical basé sur symptômes → diagnostic différentiel → contexte",
      "severity": "mild|moderate|severe",
      "clinicalEvidence": "Éléments cliniques supportant ce diagnostic"
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel principal",
        "probability": 25,
        "rationale": "Justification basée sur les symptômes et l'examen",
        "ruleOutTests": ["Examens pour confirmer/infirmer"]
      },
      {
        "condition": "Pathologie tropicale SI pertinente cliniquement",
        "probability": 15,
        "rationale": "Justification du contexte tropical UNIQUEMENT si symptômes compatibles",
        "ruleOutTests": ["Tests spécifiques si indiqués"]
      }
    ]
  },
  "recommendations": {
    "exams": [
      {
        "name": "Examen ciblé selon symptômes",
        "code": "CODE",
        "category": "biologie|imagerie|spécialisé",
        "indication": "Justification clinique précise",
        "priority": "high|medium|low"
      }
    ],
    "medications": [
      {
        "name": "Traitement adapté au diagnostic",
        "dosage": "Posologie appropriée",
        "frequency": "Fréquence",
        "duration": "Durée",
        "indication": "Justification thérapeutique",
        "contraindications": ["Contre-indications pertinentes"]
      }
    ]
  },
  "clinicalConsiderations": {
    "symptomAnalysis": "Analyse des symptômes principaux",
    "riskFactors": "Facteurs de risque identifiés",
    "prognosticFactors": "Éléments pronostiques",
    "geographicContext": "Contexte géographique SI pertinent",
    "seasonalFactors": "Facteurs saisonniers SI applicables"
  },
  "prognosis": "Pronostic basé sur le diagnostic retenu",
  "followUp": "Suivi adapté au diagnostic",
  "urgencyLevel": 3,
  "redFlags": ["Signes d'alarme spécifiques au diagnostic"]
}

IMPORTANT: 
- Priorisez les diagnostics FRÉQUENTS correspondant aux symptômes
- N'invoquez le contexte tropical que si cliniquement justifié
- Évitez de forcer les pathologies exotiques pour des symptômes banals
- Restez dans une démarche médicale classique enrichie du contexte géographique

Analysez comme un clinicien expérimenté qui considère TOUS les éléments dans l'ordre de pertinence clinique.
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.2,
      maxTokens: 3000,
    })

    console.log("🧠 Diagnostic IA symptômes-first généré")

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

      console.log(`✅ Diagnostic symptômes-first parsé: ${diagnosticData.diagnosis.primary.condition}`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON diagnostic, génération de fallback ciblé")

      // Diagnostic de fallback adapté aux symptômes
      diagnosticData = generateSymptomBasedFallbackDiagnosis(patientData, clinicalData, questionsData, result.text)
    }

    const response = {
      success: true,
      diagnosis: diagnosticData.diagnosis,
      recommendations: diagnosticData.recommendations || {
        exams: [],
        medications: [],
      },
      clinicalConsiderations: diagnosticData.clinicalConsiderations || {},
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
        approach: "symptom-based",
        diagnosticMethod: "symptoms_first_then_context",
      },
      rawAiResponse: result.text, // Pour debug
    }

    console.log(`✅ Diagnostic IA symptômes-first retourné: ${diagnosticData.diagnosis.primary.condition}`)
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

function generateSymptomBasedFallbackDiagnosis(patientData: any, clinicalData: any, questionsData: any, aiText: string) {
  const symptoms = clinicalData.symptoms?.toLowerCase() || ""
  const chiefComplaint = clinicalData.chiefComplaint?.toLowerCase() || ""
  const combinedSymptoms = `${symptoms} ${chiefComplaint}`
  const age = patientData.age || 0
  const temperature = clinicalData.vitalSigns?.temperature || 0

  let primaryCondition = "Syndrome clinique à préciser"
  let icd10 = "R53"
  let confidence = 70
  let severity = "moderate"
  let clinicalEvidence = "Symptômes non spécifiques nécessitant exploration"

  // Diagnostic basé sur les SYMPTÔMES d'abord
  if (combinedSymptoms.includes("douleur") && combinedSymptoms.includes("thorax")) {
    // DOULEUR THORACIQUE - Approche cardiologique classique
    primaryCondition = "Douleur thoracique - à préciser (cardiaque vs non cardiaque)"
    icd10 = "R07.89"
    confidence = 75
    clinicalEvidence = "Douleur thoracique nécessitant élimination d'une origine cardiaque"
    
    const differential = [
      {
        condition: "Syndrome coronarien aigu",
        probability: 35,
        rationale: "Douleur thoracique - élimination prioritaire",
        ruleOutTests: ["ECG", "Troponines", "Radiographie thoracique"]
      },
      {
        condition: "Douleur musculo-squelettique",
        probability: 25,
        rationale: "Cause fréquente de douleur thoracique",
        ruleOutTests: ["Examen clinique", "Antalgiques test"]
      },
      {
        condition: "Reflux gastro-œsophagien",
        probability: 20,
        rationale: "Diagnostic différentiel classique",
        ruleOutTests: ["IPP test", "Fibroscopie si nécessaire"]
      }
    ]
    
    if (temperature > 38) {
      differential.push({
        condition: "Infection respiratoire",
        probability: 15,
        rationale: "Fièvre associée - pneumopathie possible",
        ruleOutTests: ["Radiographie thoracique", "CRP", "Hémocultures"]
      })
    }
    
    return buildFallbackResponse(primaryCondition, icd10, confidence, severity, clinicalEvidence, differential, "cardiac")
    
  } else if (combinedSymptoms.includes("fièvre") || temperature > 37.5) {
    // FIÈVRE - Approche infectieuse classique puis tropicale
    primaryCondition = "Syndrome fébrile - origine à déterminer"
    icd10 = "R50.9"
    confidence = 75
    clinicalEvidence = `Fièvre ${temperature}°C nécessitant recherche étiologique`
    
    const differential = [
      {
        condition: "Infection respiratoire",
        probability: 30,
        rationale: "Cause fréquente de fièvre",
        ruleOutTests: ["Radiographie thoracique", "CRP", "Hémocultures"]
      },
      {
        condition: "Infection urinaire",
        probability: 25,
        rationale: "Cause commune selon âge et sexe",
        ruleOutTests: ["ECBU", "Bandelette urinaire"]
      },
      {
        condition: "Gastro-entérite infectieuse",
        probability: 20,
        rationale: "Si troubles digestifs associés",
        ruleOutTests: ["Coproculture", "Parasitologie"]
      }
    ]
    
    // Contexte tropical APRÈS les causes classiques
    if (combinedSymptoms.includes("articul") || combinedSymptoms.includes("douleur")) {
      differential.push({
        condition: "Arbovirose (dengue/chikungunya)",
        probability: 15,
        rationale: "Fièvre + arthralgies en contexte tropical",
        ruleOutTests: ["NS1 dengue", "IgM chikungunya", "Plaquettes"]
      })
    }
    
    return buildFallbackResponse(primaryCondition, icd10, confidence, severity, clinicalEvidence, differential, "infectious")
    
  } else if (combinedSymptoms.includes("céphal") || combinedSymptoms.includes("tête")) {
    // CÉPHALÉES - Approche neurologique classique
    primaryCondition = "Céphalées - à caractériser"
    icd10 = "R51"
    confidence = 70
    clinicalEvidence = "Céphalées nécessitant caractérisation et recherche de signes d'alarme"
    
    const differential = [
      {
        condition: "Céphalée de tension",
        probability: 40,
        rationale: "Cause la plus fréquente de céphalées",
        ruleOutTests: ["Examen neurologique", "Antalgiques test"]
      },
      {
        condition: "Migraine",
        probability: 25,
        rationale: "Surtout chez la femme jeune",
        ruleOutTests: ["Anamnèse détaillée", "Calendrier migraineux"]
      },
      {
        condition: "Sinusite",
        probability: 20,
        rationale: "Céphalées + contexte infectieux",
        ruleOutTests: ["Examen ORL", "Scanner sinus si nécessaire"]
      }
    ]
    
    if (temperature > 38) {
      differential.push({
        condition: "Méningite",
        probability: 10,
        rationale: "Céphalées + fièvre - urgence diagnostique",
        ruleOutTests: ["Examen neurologique", "Ponction lombaire si indiquée"]
      })
    }
    
    return buildFallbackResponse(primaryCondition, icd10, confidence, severity, clinicalEvidence, differential, "neurological")
    
  } else if (combinedSymptoms.includes("douleur") && combinedSymptoms.includes("abdomen")) {
    // DOULEUR ABDOMINALE - Approche gastro-entérologique
    primaryCondition = "Douleur abdominale - à localiser et caractériser"
    icd10 = "R10.9"
    confidence = 70
    clinicalEvidence = "Douleur abdominale nécessitant localisation et recherche de signes de gravité"
    
    const differential = [
      {
        condition: "Gastrite/Ulcère gastro-duodénal",
        probability: 30,
        rationale: "Cause fréquente de douleur épigastrique",
        ruleOutTests: ["Fibroscopie", "Recherche H. pylori"]
      },
      {
        condition: "Colique néphrétique",
        probability: 25,
        rationale: "Douleur lombaire irradiant vers les organes génitaux",
        ruleOutTests: ["Scanner abdominal", "ECBU"]
      },
      {
        condition: "Appendicite",
        probability: 20,
        rationale: "Urgence chirurgicale à éliminer",
        ruleOutTests: ["Examen clinique", "Échographie/Scanner"]
      }
    ]
    
    return buildFallbackResponse(primaryCondition, icd10, confidence, severity, clinicalEvidence, differential, "gastrointestinal")
    
  } else {
    // SYMPTÔMES NON SPÉCIFIQUES
    return buildFallbackResponse(
      "Syndrome clinique non spécifique",
      "R53",
      60,
      "mild",
      "Symptômes nécessitant anamnèse et examen clinique approfondis",
      [
        {
          condition: "Syndrome viral",
          probability: 40,
          rationale: "Cause fréquente de symptômes non spécifiques",
          ruleOutTests: ["Observation clinique", "Biologie si nécessaire"]
        },
        {
          condition: "Troubles fonctionnels",
          probability: 30,
          rationale: "Absence de signes organiques",
          ruleOutTests: ["Élimination causes organiques"]
        }
      ],
      "general"
    )
  }
}

function buildFallbackResponse(condition: string, icd10: string, confidence: number, severity: string, evidence: string, differential: any[], category: string) {
  return {
    diagnosis: {
      primary: {
        condition: condition,
        icd10: icd10,
        confidence: confidence,
        rationale: `Diagnostic de fallback basé sur l'analyse symptomatique: ${evidence}`,
        severity: severity,
        clinicalEvidence: evidence,
      },
      differential: differential,
    },
    recommendations: {
      exams: getExamsForCategory(category),
      medications: getMedicationsForCategory(category),
    },
    clinicalConsiderations: {
      symptomAnalysis: "Analyse basée sur les symptômes présentés",
      riskFactors: "Facteurs de risque à évaluer selon le diagnostic",
      prognosticFactors: "Pronostic dépendant de la cause sous-jacente",
      geographicContext: "Contexte tropical considéré selon pertinence clinique",
      seasonalFactors: "Facteurs saisonniers évalués si applicable",
    },
    prognosis: "Pronostic généralement favorable avec diagnostic et traitement appropriés",
    followUp: "Réévaluation selon évolution clinique et résultats examens",
    urgencyLevel: category === "cardiac" ? 4 : 3,
    redFlags: getRedFlagsForCategory(category),
  }
}

function getExamsForCategory(category: string) {
  switch (category) {
    case "cardiac":
      return [
        {
          name: "ECG",
          code: "ECG001",
          category: "cardiologie",
          indication: "Élimination syndrome coronarien aigu",
          priority: "high",
        },
        {
          name: "Troponines",
          code: "TROP001",
          category: "biologie",
          indication: "Marqueurs de nécrose myocardique",
          priority: "high",
        },
      ]
    case "infectious":
      return [
        {
          name: "CRP",
          code: "CRP001",
          category: "biologie",
          indication: "Syndrome inflammatoire",
          priority: "medium",
        },
        {
          name: "Hémocultures",
          code: "HEMOC001",
          category: "biologie",
          indication: "Recherche bactériémie",
          priority: "medium",
        },
      ]
    case "neurological":
      return [
        {
          name: "Examen neurologique",
          code: "NEURO001",
          category: "clinique",
          indication: "Recherche signes neurologiques",
          priority: "high",
        },
      ]
    default:
      return [
        {
          name: "Bilan biologique standard",
          code: "BIO001",
          category: "biologie",
          indication: "Évaluation générale",
          priority: "medium",
        },
      ]
  }
}

function getMedicationsForCategory(category: string) {
  switch (category) {
    case "cardiac":
      return [
        {
          name: "Aspirine",
          dosage: "75-100mg",
          frequency: "1x/jour",
          duration: "Selon diagnostic",
          indication: "Prévention secondaire si syndrome coronarien",
          contraindications: ["Allergie", "Troubles coagulation"],
        },
      ]
    case "infectious":
      return [
        {
          name: "Paracétamol",
          dosage: "1g",
          frequency: "3x/jour",
          duration: "Selon symptômes",
          indication: "Antipyrétique et antalgique",
          contraindications: ["Allergie", "Insuffisance hépatique"],
        },
      ]
    default:
      return [
        {
          name: "Traitement symptomatique",
          dosage: "Selon symptômes",
          frequency: "Selon besoin",
          duration: "Selon évolution",
          indication: "Traitement adapté au diagnostic",
          contraindications: ["Selon médicament choisi"],
        },
      ]
  }
}

function getRedFlagsForCategory(category: string) {
  switch (category) {
    case "cardiac":
      return ["Douleur constrictive", "Irradiation bras gauche", "Dyspnée", "Sueurs profuses"]
    case "infectious":
      return ["Fièvre >39°C", "Altération état général", "Signes sepsis", "Purpura"]
    case "neurological":
      return ["Céphalées brutales", "Raideur nuque", "Troubles conscience", "Déficit neurologique"]
    default:
      return ["Altération état général", "Fièvre élevée", "Douleur intense"]
  }
}
