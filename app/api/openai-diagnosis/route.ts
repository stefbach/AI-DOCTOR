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
En tant que médecin expert avec expertise en médecine interne et tropicale, analysez ce cas clinique avec un niveau de DÉTAIL HOSPITALIER.

${/* insérer les données patient/cliniques */}

GÉNÈRE un diagnostic médical APPROFONDI et COMPLET :

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic principal précis",
      "icd10": "Code CIM-10 exact",
      "confidence": 85,
      "detailedAnalysis": "Analyse APPROFONDIE (minimum 300 mots) : description complète de la pathologie, physiopathologie détaillée, présentation clinique typique vs présentation chez ce patient, facteurs de risque présents, mécanismes déclenchants, évolution naturelle attendue",
      "clinicalRationale": "Raisonnement clinique DÉTAILLÉ (minimum 250 mots) : pourquoi ce diagnostic est le plus probable, analyse symptôme par symptôme, corrélations anatomo-cliniques, chronologie évocatrice, signes pathognomoniques",
      "severity": "mild|moderate|severe",
      "severityAnalysis": "Analyse DÉTAILLÉE de la sévérité : critères objectifs utilisés, scores cliniques applicables, impact fonctionnel, retentissement systémique, facteurs de gravité présents/absents",
      "clinicalEvidence": "Preuves cliniques DÉTAILLÉES supportant ce diagnostic avec analyse critique de chaque élément",
      "physiopathology": "Mécanismes physiopathologiques COMPLETS : cascade d'événements, voies biochimiques, interaction organes/systèmes, facteurs aggravants",
      "epidemiology": "Contexte épidémiologique : prévalence, facteurs de risque population, spécificités géographiques (Maurice), variations saisonnières",
      "prognosis": {
        "immediate": "Évolution attendue 24-72h avec facteurs influençant",
        "shortTerm": "Pronostic 1-4 semaines avec critères d'amélioration",
        "longTerm": "Pronostic à long terme, séquelles potentielles, qualité de vie",
        "mortality": "Risque vital si applicable avec facteurs pronostiques"
      }
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel principal",
        "probability": 25,
        "detailedDescription": "Description COMPLÈTE (minimum 200 mots) : définition, physiopathologie, présentation clinique classique, particularités évolutives",
        "rationale": "Justification APPROFONDIE : éléments cliniques en faveur, similitudes avec le cas présenté, mécanismes physiopathologiques communs",
        "distinguishingFeatures": "Caractéristiques SPÉCIFIQUES permettant de différencier ce diagnostic du principal : signes pathognomoniques, chronologie différente, réponse thérapeutique, examens discriminants",
        "ruleOutStrategy": "Stratégie DÉTAILLÉE pour éliminer ce diagnostic : examens spécifiques, critères d'exclusion, évolution surveillance"
      }
    ]
  },
  "recommendations": {
    "exams": [
      {
        "name": "Examen spécifique",
        "code": "CODE",
        "category": "biologie|imagerie|fonctionnel|anatomopathologie",
        "detailedIndication": "Indication COMPLÈTE (minimum 100 mots) : pourquoi cet examen dans ce contexte précis, objectifs diagnostiques, timing optimal, alternative si non disponible",
        "expectedResults": {
          "diagnostic": "Résultats attendus si diagnostic principal correct",
          "differential": "Résultats orientant vers diagnostics différentiels",
          "normal": "Signification si examen normal",
          "pathological": "Interprétation des anomalies possibles"
        },
        "priority": "high|medium|low",
        "urgency": "immediate|urgent|scheduled|elective",
        "practicalAspects": "Considérations pratiques : préparation, contre-indications, disponibilité, coût, acceptabilité patient"
      }
    ],
    "medications": [
      {
        "name": "Médicament précis",
        "dosage": "Posologie exacte adaptée au patient",
        "frequency": "Fréquence avec justification",
        "duration": "Durée avec critères d'arrêt",
        "detailedIndication": "Indication APPROFONDIE : mécanisme thérapeutique, objectifs précis, critères d'efficacité attendus",
        "mechanism": "Mécanisme d'action DÉTAILLÉ dans ce contexte pathologique spécifique",
        "monitoring": {
          "efficacy": "Critères de surveillance de l'efficacité",
          "safety": "Surveillance des effets indésirables",
          "laboratory": "Bilans biologiques de suivi",
          "clinical": "Signes cliniques à surveiller"
        },
        "contraindications": "Contre-indications SPÉCIFIQUES à ce patient",
        "interactions": "Interactions PERTINENTES avec traitements actuels",
        "alternatives": "Alternatives thérapeutiques si échec/intolérance avec justification"
      }
    ]
  },
  "clinicalConsiderations": {
    "symptomAnalysis": "Analyse EXHAUSTIVE de chaque symptôme : signification sémiologique, valeur diagnostique, mécanismes sous-jacents, corrélations temporelles",
    "riskFactors": "Analyse DÉTAILLÉE des facteurs de risque : présents, absents, modifiables, impact sur le pronostic, mesures préventives",
    "prognosticFactors": "Facteurs pronostiques SPÉCIFIQUES : favorables, défavorables, modifiables, impact sur la prise en charge",
    "geographicContext": "Contexte géographique Maurice PERTINENT : pathologies endémiques, facteurs environnementaux, disponibilité thérapeutique, spécificités populationnelles",
    "seasonalFactors": "Facteurs saisonniers APPLICABLES : variations épidémiologiques, vecteurs, conditions climatiques influençant la pathologie"
  },
  "managementPlan": {
    "immediate": "Plan de prise en charge IMMÉDIATE : mesures urgentes, surveillance rapprochée, critères d'hospitalisation, traitements symptomatiques",
    "shortTerm": "Prise en charge à COURT TERME : traitements étiologiques, réévaluations programmées, adaptations thérapeutiques, prévention complications",
    "longTerm": "Suivi à LONG TERME : surveillance évolutive, prévention récidives, réhabilitation, éducation thérapeutique, qualité de vie"
  }
}

EXIGENCES QUALITÉ MAXIMALE :
- Minimum 200-300 mots par section principale
- Langage médical expert et précis
- Références aux recommandations actuelles
- Spécificité au cas présenté (éviter généralités)
- Justification de chaque décision diagnostique/thérapeutique
- Intégration du contexte géographique Maurice si pertinent
- Evidence-based medicine systématique

Analysez comme un EXPERT HOSPITALO-UNIVERSITAIRE
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
