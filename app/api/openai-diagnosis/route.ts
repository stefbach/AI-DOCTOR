import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🩺 API Diagnostic IA Complète - Génération tous documents mauriciens")

    let requestData: {
      patientData?: any
      clinicalData?: any
      questionsData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour diagnostic complet")
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON:", parseError)
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

    console.log(`🔍 Diagnostic IA complet pour: ${patientData.firstName} ${patientData.lastName}`)

    // ═══════════════════════════════════════════════════════════════════════════════
    // GÉNÉRATION DIAGNOSTIQUE ET DOCUMENTS EN UNE SEULE ÉTAPE
    // ═══════════════════════════════════════════════════════════════════════════════

    const patientContext = `
PATIENT: ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
ANTHROPOMÉTRIE: ${patientData.weight}kg, ${patientData.height}cm (IMC: ${calculateBMI(patientData)})
MOTIF: ${clinicalData.chiefComplaint || "Consultation"}
SYMPTÔMES: ${(clinicalData.symptoms || []).join(", ") || "Non spécifiés"}
DOULEUR: ${clinicalData.painScale || 0}/10
CONSTANTES: T°${clinicalData.vitalSigns?.temperature}°C, FC ${clinicalData.vitalSigns?.heartRate}bpm, TA ${clinicalData.vitalSigns?.bloodPressureSystolic}/${clinicalData.vitalSigns?.bloodPressureDiastolic}mmHg
ANTÉCÉDENTS: ${(patientData.medicalHistory || []).join(", ") || "Aucun"}
ALLERGIES: ${(patientData.allergies || []).join(", ") || "Aucune"}
TRAITEMENTS: ${patientData.currentMedicationsText || "Aucun"}
ANAMNÈSE: ${questionsData?.responses?.map((r: any) => `${r.question}: ${r.answer}`).join(", ") || "Non réalisée"}
    `.trim()

    const completePrompt = `
Tu es un médecin expert mauricien. Génère un diagnostic COMPLET avec TOUS les documents médicaux mauriciens modifiables.

${patientContext}

GÉNÈRE EXACTEMENT ce JSON avec TOUTES les sections :

{
  "success": true,
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic principal précis",
      "icd10": "Code CIM-10",
      "confidence": 85,
      "severity": "mild|moderate|severe",
      "detailedAnalysis": "Analyse approfondie de la pathologie, physiopathologie, présentation clinique",
      "clinicalRationale": "Raisonnement clinique détaillé symptôme par symptôme",
      "prognosis": "Évolution attendue détaillée"
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel",
        "probability": 25,
        "rationale": "Arguments pour ce diagnostic",
        "distinguishingFeatures": "Éléments distinctifs"
      }
    ]
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        "subtitle": "République de Maurice - Médecine Générale",
        "date": "${new Date().toLocaleDateString("fr-FR")}",
        "time": "${new Date().toLocaleTimeString("fr-FR")}",
        "physician": "Dr. TIBOK IA DOCTOR",
        "registration": "COUNCIL-2024-IA-001"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser",
        "weight": "${patientData.weight}kg",
        "height": "${patientData.height}cm"
      },
      "content": {
        "chiefComplaint": "${clinicalData.chiefComplaint || "Motif de consultation à préciser"}",
        "history": "Histoire détaillée de la maladie actuelle avec chronologie, symptômes associés, facteurs déclenchants",
        "examination": "Examen clinique complet : constantes vitales, examen général, examen orienté selon symptômes",
        "diagnosis": "Diagnostic retenu avec argumentaire clinique",
        "plan": "Plan thérapeutique détaillé, examens complémentaires, suivi"
      }
    },
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
        "date": "${new Date().toLocaleDateString("fr-FR")}",
        "number": "BIO-${Date.now()}-MU",
        "physician": "Dr. TIBOK IA DOCTOR",
        "registration": "COUNCIL-2024-IA-001"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser"
      },
      "prescriptions": [
        {
          "id": 1,
          "exam": "Examen biologique adapté au diagnostic",
          "indication": "Indication médicale précise",
          "urgency": "Semi-urgent|Urgent|Programmé",
          "fasting": "Oui|Non",
          "expectedResults": "Résultats attendus",
          "sampleType": "Type d'échantillon",
          "contraindications": "Contre-indications spécifiques"
        }
      ]
    },
    "paraclinical": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS PARACLINIQUES",
        "date": "${new Date().toLocaleDateString("fr-FR")}",
        "number": "PARA-${Date.now()}-MU",
        "physician": "Dr. TIBOK IA DOCTOR",
        "registration": "COUNCIL-2024-IA-001"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser"
      },
      "prescriptions": [
        {
          "id": 1,
          "exam": "Examen paraclinique adapté",
          "indication": "Indication médicale précise",
          "urgency": "Semi-urgent|Urgent|Programmé",
          "preparation": "Préparation nécessaire",
          "contraindications": "Contre-indications",
          "duration": "Durée estimée"
        }
      ]
    },
    "medication": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION MÉDICAMENTEUSE",
        "date": "${new Date().toLocaleDateString("fr-FR")}",
        "number": "MED-${Date.now()}-MU",
        "physician": "Dr. TIBOK IA DOCTOR",
        "registration": "COUNCIL-2024-IA-001"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser",
        "allergies": "${(patientData.allergies || []).join(", ") || "Aucune"}"
      },
      "prescriptions": [
        {
          "id": 1,
          "dci": "DCI médicament",
          "brand": "Marque disponible Maurice",
          "dosage": "Posologie adaptée",
          "frequency": "Fréquence de prise",
          "duration": "Durée traitement",
          "indication": "Indication thérapeutique",
          "contraindications": "Contre-indications patient",
          "monitoring": "Surveillance nécessaire",
          "mauritianAvailability": "Disponibilité Maurice"
        }
      ]
    }
  },
  "editableFields": {
    "consultation": [
      "patient.address",
      "patient.idNumber", 
      "content.history",
      "content.examination",
      "content.diagnosis",
      "content.plan"
    ],
    "biology": [
      "patient.address",
      "patient.idNumber",
      "prescriptions[].indication",
      "prescriptions[].urgency"
    ],
    "paraclinical": [
      "patient.address", 
      "patient.idNumber",
      "prescriptions[].indication",
      "prescriptions[].urgency"
    ],
    "medication": [
      "patient.address",
      "patient.idNumber",
      "prescriptions[].dosage",
      "prescriptions[].frequency",
      "prescriptions[].duration"
    ]
  },
  "clinicalConsiderations": {
    "symptomAnalysis": "Analyse détaillée des symptômes",
    "riskFactors": "Facteurs de risque identifiés",
    "prognosticFactors": "Éléments pronostiques",
    "geographicContext": "Spécificités Maurice (climat tropical, pathologies endémiques)",
    "urgencyLevel": 1-5,
    "redFlags": ["Signes d'alarme à surveiller"]
  },
  "metadata": {
    "patientAge": ${patientData.age},
    "patientGender": "${patientData.gender}",
    "chiefComplaint": "${clinicalData.chiefComplaint}",
    "aiModel": "gpt-4o",
    "confidence": 85,
    "generatedAt": "${new Date().toISOString()}",
    "location": "Maurice",
    "approach": "complete-mauritian-documents",
    "documentsGenerated": 4,
    "allEditable": true,
    "legallyCompliant": true
  }
}

IMPORTANT: 
- Adapte TOUS les champs au cas clinique spécifique
- Prescris des examens/médicaments PERTINENTS pour le diagnostic
- Respecte la réglementation mauricienne
- Tous les documents doivent être cohérents entre eux
- Les prescriptions doivent être sécurisées (vérification allergies, interactions)
- Utilise les codes CIM-10 appropriés
`

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: completePrompt,
      temperature: 0.2,
      maxTokens: 4000,
    })

    console.log("🧠 Diagnostic IA complet avec documents mauriciens généré")

    // Parsing robuste avec fallback
    let completeData
    try {
      let cleanedText = result.text.trim()
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      completeData = JSON.parse(cleanedText)

      if (!completeData.diagnosis || !completeData.mauritianDocuments) {
        throw new Error("Structure incomplète")
      }

      console.log(`✅ Diagnostic complet parsé: ${completeData.diagnosis.primary.condition}`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON, génération fallback")
      completeData = generateCompleteFallback(patientData, clinicalData, questionsData, result.text)
    }

    // Structure finale compatible avec l'interface d'édition
    const finalResponse = {
      success: true,
      diagnosis: completeData.diagnosis,
      mauritianDocuments: completeData.mauritianDocuments,
      editableFields: completeData.editableFields,
      clinicalConsiderations: completeData.clinicalConsiderations || {},
      metadata: completeData.metadata || {
        patientAge: patientData.age,
        patientGender: patientData.gender,
        generatedAt: new Date().toISOString(),
        documentsGenerated: 4,
        allEditable: true
      },
      rawAiResponse: result.text // Pour debug
    }

    console.log(`✅ Diagnostic IA complet retourné avec 4 documents mauriciens modifiables`)
    return NextResponse.json(finalResponse)

  } catch (error: any) {
    console.error("❌ Erreur Diagnostic IA Complet:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du diagnostic complet",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

function calculateBMI(patientData: any): string {
  if (patientData?.weight && patientData?.height) {
    const bmi = patientData.weight / Math.pow(patientData.height / 100, 2)
    return bmi.toFixed(1)
  }
  return "N/A"
}

function generateCompleteFallback(patientData: any, clinicalData: any, questionsData: any, aiText: string) {
  const symptoms = clinicalData.symptoms?.join(", ").toLowerCase() || ""
  const chiefComplaint = clinicalData.chiefComplaint?.toLowerCase() || ""
  
  return {
    success: true,
    diagnosis: {
      primary: {
        condition: determineFallbackDiagnosis(symptoms, chiefComplaint),
        icd10: "R53",
        confidence: 70,
        severity: "moderate",
        detailedAnalysis: "Analyse basée sur les symptômes présentés nécessitant exploration complémentaire",
        clinicalRationale: `Symptômes: ${chiefComplaint}. Nécessite anamnèse et examen clinique approfondis`,
        prognosis: "Évolution favorable attendue avec prise en charge appropriée"
      },
      differential: [
        {
          condition: "Syndrome viral",
          probability: 40,
          rationale: "Cause fréquente de symptômes non spécifiques",
          distinguishingFeatures: "Évolution spontanément favorable"
        },
        {
          condition: "Troubles fonctionnels",
          probability: 30,
          rationale: "Absence de signes organiques évidents",
          distinguishingFeatures: "Examens complémentaires normaux"
        }
      ]
    },
    mauritianDocuments: {
      consultation: {
        header: {
          title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
          subtitle: "République de Maurice - Médecine Générale",
          date: new Date().toLocaleDateString("fr-FR"),
          time: new Date().toLocaleTimeString("fr-FR"),
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser",
          weight: `${patientData.weight}kg`,
          height: `${patientData.height}cm`
        },
        content: {
          chiefComplaint: clinicalData.chiefComplaint || "Motif de consultation à préciser",
          history: `Patient de ${patientData.age} ans consultant pour ${clinicalData.chiefComplaint || "symptômes"}. Évolution depuis ${clinicalData.symptomDuration || "durée non précisée"}. ${symptoms || "Symptômes à détailler"}. Retentissement fonctionnel à évaluer.`,
          examination: `Constantes: TA ${clinicalData.vitalSigns?.bloodPressureSystolic || "?"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "?"}mmHg, FC ${clinicalData.vitalSigns?.heartRate || "?"}bpm, T° ${clinicalData.vitalSigns?.temperature || "?"}°C. Douleur ${clinicalData.painScale || 0}/10. Examen général: état général ${patientData.age < 65 ? "conservé" : "à préciser"}. Examen orienté selon symptômes à compléter.`,
          diagnosis: determineFallbackDiagnosis(symptoms, chiefComplaint),
          plan: "Traitement symptomatique adapté. Examens complémentaires si nécessaire. Réévaluation programmée selon évolution. Conseils hygiéno-diététiques."
        }
      },
      biology: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
          date: new Date().toLocaleDateString("fr-FR"),
          number: `BIO-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser"
        },
        prescriptions: generateFallbackBiologyExams(symptoms, chiefComplaint, clinicalData)
      },
      paraclinical: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION D'EXAMENS PARACLINIQUES",
          date: new Date().toLocaleDateString("fr-FR"),
          number: `PARA-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser"
        },
        prescriptions: generateFallbackParaclinicalExams(symptoms, chiefComplaint, clinicalData)
      },
      medication: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION MÉDICAMENTEUSE",
          date: new Date().toLocaleDateString("fr-FR"),
          number: `MED-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser",
          allergies: (patientData.allergies || []).join(", ") || "Aucune"
        },
        prescriptions: generateFallbackMedications(symptoms, chiefComplaint, patientData, clinicalData)
      }
    },
    editableFields: {
      consultation: [
        "patient.address",
        "patient.idNumber",
        "content.history",
        "content.examination",
        "content.diagnosis",
        "content.plan"
      ],
      biology: [
        "patient.address",
        "patient.idNumber",
        "prescriptions[].indication",
        "prescriptions[].urgency"
      ],
      paraclinical: [
        "patient.address",
        "patient.idNumber",
        "prescriptions[].indication",
        "prescriptions[].urgency"
      ],
      medication: [
        "patient.address",
        "patient.idNumber",
        "prescriptions[].dosage",
        "prescriptions[].frequency",
        "prescriptions[].duration"
      ]
    },
    clinicalConsiderations: {
      symptomAnalysis: `Symptômes principaux: ${chiefComplaint}. Nécessite évaluation approfondie.`,
      riskFactors: `Âge: ${patientData.age} ans. Antécédents: ${(patientData.medicalHistory || []).join(", ") || "Aucun"}`,
      prognosticFactors: "Pronostic généralement favorable avec prise en charge adaptée",
      geographicContext: "Contexte tropical mauricien - Attention pathologies endémiques",
      urgencyLevel: 2,
      redFlags: ["Aggravation des symptômes", "Fièvre persistante", "Altération état général"]
    },
    metadata: {
      patientAge: patientData.age,
      patientGender: patientData.gender,
      chiefComplaint: clinicalData.chiefComplaint,
      aiModel: "gpt-4o-fallback",
      confidence: 70,
      generatedAt: new Date().toISOString(),
      location: "Maurice",
      approach: "fallback-complete-documents",
      documentsGenerated: 4,
      allEditable: true,
      legallyCompliant: true
    }
  }
}

function determineFallbackDiagnosis(symptoms: string, chiefComplaint: string): string {
  const combined = `${symptoms} ${chiefComplaint}`.toLowerCase()
  
  if (combined.includes("douleur") && combined.includes("thorax")) {
    return "Douleur thoracique - à préciser (cardiaque vs non cardiaque)"
  }
  if (combined.includes("fièvre") || combined.includes("température")) {
    return "Syndrome fébrile - origine à déterminer"
  }
  if (combined.includes("céphal") || combined.includes("tête")) {
    return "Céphalées - à caractériser"
  }
  if (combined.includes("douleur") && combined.includes("abdomen")) {
    return "Douleur abdominale - à localiser et caractériser"
  }
  if (combined.includes("toux") || combined.includes("respiratoire")) {
    return "Syndrome respiratoire - à explorer"
  }
  
  return "Syndrome clinique à préciser - évaluation en cours"
}

function generateFallbackBiologyExams(symptoms: string, chiefComplaint: string, clinicalData: any) {
  const combined = `${symptoms} ${chiefComplaint}`.toLowerCase()
  const exams = []
  
  // Bilan de base
  exams.push({
    id: 1,
    exam: "NFS + Plaquettes",
    indication: "Bilan hématologique de base",
    urgency: "Semi-urgent",
    fasting: "Non",
    expectedResults: "Recherche anémie, infection, troubles hématologiques",
    sampleType: "Sang veineux",
    contraindications: "Aucune"
  })
  
  exams.push({
    id: 2,
    exam: "CRP + VS",
    indication: "Syndrome inflammatoire",
    urgency: "Semi-urgent",
    fasting: "Non",
    expectedResults: "Élévation si processus inflammatoire",
    sampleType: "Sang veineux",
    contraindications: "Aucune"
  })
  
  // Examens spécifiques selon symptômes
  if (combined.includes("douleur") && combined.includes("thorax")) {
    exams.push({
      id: 3,
      exam: "Troponines + CK-MB",
      indication: "Marqueurs cardiaques - élimination syndrome coronarien",
      urgency: "Urgent",
      fasting: "Non",
      expectedResults: "Normaux si pas de nécrose myocardique",
      sampleType: "Sang veineux",
      contraindications: "Aucune"
    })
  }
  
  if (combined.includes("fièvre") || (clinicalData.vitalSigns?.temperature && clinicalData.vitalSigns.temperature > 37.5)) {
    exams.push({
      id: exams.length + 1,
      exam: "Hémocultures x2",
      indication: "Recherche bactériémie",
      urgency: "Urgent",
      fasting: "Non",
      expectedResults: "Identification germe si bactériémie",
      sampleType: "Sang veineux",
      contraindications: "Aucune"
    })
  }
  
  return exams
}

function generateFallbackParaclinicalExams(symptoms: string, chiefComplaint: string, clinicalData: any) {
  const combined = `${symptoms} ${chiefComplaint}`.toLowerCase()
  const exams = []
  
  if (combined.includes("douleur") && combined.includes("thorax")) {
    exams.push({
      id: 1,
      exam: "ECG",
      indication: "Élimination trouble rythme/conduction, ischémie",
      urgency: "Urgent",
      preparation: "Repos 10 minutes, déshabillage thorax",
      contraindications: "Aucune",
      duration: "5 minutes"
    })
    
    exams.push({
      id: 2,
      exam: "Radiographie thoracique face",
      indication: "Élimination pathologie pulmonaire/cardiaque",
      urgency: "Semi-urgent",
      preparation: "Retirer objets métalliques",
      contraindications: "Grossesse (protection)",
      duration: "5 minutes"
    })
  }
  
  if (combined.includes("céphal") || combined.includes("tête")) {
    exams.push({
      id: exams.length + 1,
      exam: "Scanner cérébral sans injection",
      indication: "Élimination lésion intracrânienne",
      urgency: "Selon contexte",
      preparation: "Aucune",
      contraindications: "Grossesse sans indication vitale",
      duration: "10 minutes"
    })
  }
  
  if (combined.includes("abdomen") || combined.includes("digestif")) {
    exams.push({
      id: exams.length + 1,
      exam: "Échographie abdominale",
      indication: "Exploration douleur abdominale",
      urgency: "Semi-urgent",
      preparation: "À jeun 6 heures",
      contraindications: "Aucune",
      duration: "20 minutes"
    })
  }
  
  return exams
}

function generateFallbackMedications(symptoms: string, chiefComplaint: string, patientData: any, clinicalData: any) {
  const combined = `${symptoms} ${chiefComplaint}`.toLowerCase()
  const medications = []
  const allergies = (patientData.allergies || []).map((a: string) => a.toLowerCase())
  
  // Traitement symptomatique de base
  if (!allergies.includes("paracétamol")) {
    medications.push({
      id: 1,
      dci: "Paracétamol",
      brand: "Doliprane / Efferalgan",
      dosage: patientData.age >= 65 ? "500mg" : "1g",
      frequency: "3 fois par jour si nécessaire",
      duration: "5 jours maximum",
      indication: "Traitement symptomatique douleur/fièvre",
      contraindications: allergies.includes("paracétamol") ? "ALLERGIE PATIENT" : "Insuffisance hépatique sévère",
      monitoring: "Surveillance hépatique si traitement prolongé",
      mauritianAvailability: "Disponible toutes pharmacies Maurice"
    })
  }
  
  // Traitements spécifiques selon symptômes
  if (combined.includes("douleur") && !allergies.includes("ibuprofène") && patientData.age < 65) {
    medications.push({
      id: 2,
      dci: "Ibuprofène",
      brand: "Advil / Brufen",
      dosage: "400mg",
      frequency: "2 fois par jour pendant les repas",
      duration: "3 jours maximum",
      indication: "Anti-inflammatoire pour douleur",
      contraindications: allergies.includes("ibuprofène") ? "ALLERGIE PATIENT" : "Ulcère gastro-duodénal, insuffisance rénale",
      monitoring: "Surveillance digestive et rénale",
      mauritianAvailability: "Disponible pharmacies Maurice"
    })
  }
  
  if (combined.includes("toux")) {
    medications.push({
      id: medications.length + 1,
      dci: "Sirop simple",
      brand: "Sirop antitussif",
      dosage: "15ml",
      frequency: "3 fois par jour",
      duration: "7 jours",
      indication: "Toux sèche irritative",
      contraindications: "Aucune connue",
      monitoring: "Efficacité clinique",
      mauritianAvailability: "Disponible pharmacies Maurice"
    })
  }
  
  return medications
}
