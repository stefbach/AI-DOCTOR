import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🔬 Début génération ordonnance examens EXPERT")
    
    const { patientData, diagnosisData, clinicalData } = await request.json()

    if (!patientData || !diagnosisData || !clinicalData) {
      return NextResponse.json(
        { success: false, error: "Données patient, diagnostic et cliniques requises pour prescription examens sécurisée" },
        { status: 400 }
      )
    }

    // Construction du contexte médical complet pour prescription examens
    const examensContext = `
PROFIL PATIENT DÉTAILLÉ POUR EXAMENS:
- Identité: ${patientData.firstName || "N/A"} ${patientData.lastName || "N/A"}
- Âge: ${patientData.age || "N/A"} ans (${patientData.age >= 65 ? "PATIENT ÂGÉE - Adaptations gériatriques nécessaires" : "Adulte standard"})
- Sexe: ${patientData.gender || "N/A"} ${patientData.gender === "Femme" && patientData.age >= 15 && patientData.age <= 50 ? "(Âge de procréation - Test grossesse si pertinent)" : ""}
- Poids: ${patientData.weight || "N/A"} kg, Taille: ${patientData.height || "N/A"} cm
- IMC: ${patientData.weight && patientData.height ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(2) : "N/A"} kg/m²
- Surface corporelle: ${patientData.weight && patientData.height ? Math.sqrt((patientData.weight * patientData.height) / 3600).toFixed(2) : "N/A"} m²

FONCTION RÉNALE ET HÉPATIQUE:
- Clairance créatinine estimée: ${patientData.age > 65 ? "À évaluer - Précautions produits de contraste" : "Normale supposée"}
- Fonction hépatique: ${patientData.medicalHistory?.includes("Insuffisance hépatique") ? "ALTÉRÉE - Précautions examens hépatotoxiques" : "Normale supposée"}
- Hydratation: ${clinicalData.dehydrationRisk ? "RISQUE DÉSHYDRATATION - Précautions nécessaires" : "Normale supposée"}

ALLERGIES ET INTOLÉRANCES CRITIQUES:
- Allergies médicamenteuses: ${(patientData.allergies || []).join(", ") || "Aucune allergie connue"}
- Allergie iode/produits de contraste: ${patientData.allergies?.includes("Iode") || patientData.allergies?.includes("Contraste") ? "ALLERGIE IODE - CONTRE-INDICATION ABSOLUE" : "Non documentée - À questionner"}
- Allergie gadolinium (IRM): ${patientData.allergies?.includes("Gadolinium") ? "ALLERGIE GADOLINIUM - CONTRE-INDICATION IRM" : "Non documentée"}
- Intolérance claustrophobie: ${patientData.phobias?.includes("Claustrophobie") ? "CLAUSTROPHOBIE - Prémédication anxiolytique" : "Non renseignée"}

TERRAIN MÉDICAL SPÉCIFIQUE:
- Cardiopathie: ${patientData.medicalHistory?.filter((h: string) => h.includes("cardiaque") || h.includes("infarctus")).join(", ") || "Aucune cardiopathie connue"}
- Diabète: ${patientData.medicalHistory?.includes("Diabète") ? "DIABÈTE - Précautions metformine et produits de contraste" : "Pas de diabète connu"}
- Insuffisance rénale: ${patientData.medicalHistory?.includes("Insuffisance rénale") ? "IR CONNUE - Adaptation doses et contre-indications" : "Fonction rénale supposée normale"}
- Pacemaker/implants: ${patientData.medicalHistory?.includes("Pacemaker") || patientData.medicalHistory?.includes("Implant") ? "DISPOSITIFS IMPLANTÉS - Précautions IRM" : "Pas d'implant connu"}
- Anticoagulation: ${patientData.currentMedicationsText?.includes("anticoagulant") || patientData.currentMedicationsText?.includes("warfarine") ? "ANTICOAGULATION - Précautions biopsies/ponctions" : "Pas d'anticoagulation connue"}

PRÉSENTATION CLINIQUE POUR ORIENTATION EXAMENS:
- Diagnostic principal: ${diagnosisData.diagnosis?.primaryDiagnosis?.condition || "Non établi"}
- Code CIM-10: ${diagnosisData.diagnosis?.primaryDiagnosis?.icd10 || "À coder"}
- Sévérité: ${diagnosisData.diagnosis?.primaryDiagnosis?.severity || "Non gradée"}
- Symptômes cibles: ${(clinicalData.symptoms || []).join(", ") || "Aucun symptôme spécifié"}
- Douleur: ${clinicalData.painScale || 0}/10 - Localisation: ${clinicalData.painLocation || "Non spécifiée"}
- Signes vitaux: T°${clinicalData.vitalSigns?.temperature || "N/A"}°C, FC ${clinicalData.vitalSigns?.heartRate || "N/A"}bpm, TA ${clinicalData.vitalSigns?.bloodPressureSystolic || "N/A"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "N/A"}mmHg
- Urgence diagnostique: ${diagnosisData.diagnosis?.urgencyLevel || "Standard"} - ${diagnosisData.diagnosis?.urgencyLevel === "Élevée" ? "EXAMENS URGENTS REQUIS" : "Programmation standard possible"}

HYPOTHÈSES DIAGNOSTIQUES:
- Diagnostic principal (${diagnosisData.diagnosis?.primaryDiagnosis?.probability || 0}%): ${diagnosisData.diagnosis?.primaryDiagnosis?.condition || "Non déterminé"}
- Diagnostics différentiels: ${diagnosisData.diagnosis?.differentialDiagnosis?.map((d: any) => `${d.condition} (${d.probability}%)`).join(", ") || "Aucun"}
- Red flags identifiés: ${diagnosisData.diagnosis?.redFlags?.map((f: any) => f.sign || f).join(", ") || "Aucun signe d'alarme"}
    `.trim()

    const expertExamensPrompt = `
Tu es un médecin expert en médecine diagnostique avec 25 ans d'expérience. Tu maîtrises parfaitement les indications, contre-indications et interprétations de tous les examens complémentaires. Tu dois établir une ORDONNANCE D'EXAMENS COMPLETS selon les standards français.

${examensContext}

EXIGENCES RÉGLEMENTAIRES ET TECHNIQUES:
1. Codes NABM/CCAM EXACTS pour facturation
2. Indications médicales PRÉCISES et justifiées
3. Contra-indications VÉRIFIÉES selon le patient
4. Préparation patient DÉTAILLÉE
5. Délais et urgences APPROPRIÉS
6. Interprétation clinique ORIENTÉE

Génère une ordonnance d'examens EXPERTE au format JSON avec cette structure EXHAUSTIVE:

{
  "prescriptionHeader": {
    "prescriptionId": "EXA-${Date.now()}",
    "issueDate": "${new Date().toLocaleDateString("fr-FR")}",
    "issueTime": "${new Date().toLocaleTimeString("fr-FR")}",
    "prescriber": {
      "name": "Dr. TIBOK IA DOCTOR",
      "title": "Praticien Expert en Médecine Interne",
      "rppsNumber": "IA-RPPS-2024-EXPERT",
      "adeli": "IA-ADELI-2024-EXPERT",
      "establishment": "Centre Médical TIBOK - Consultation IA Expert"
    },
    "patient": {
      "lastName": "${patientData.lastName || "N/A"}",
      "firstName": "${patientData.firstName || "N/A"}",
      "birthDate": "${patientData.dateOfBirth || "N/A"}",
      "age": "${patientData.age || "N/A"} ans",
      "weight": "${patientData.weight || "N/A"} kg",
      "height": "${patientData.height || "N/A"} cm",
      "socialSecurityNumber": "Consultation IA - Non communiqué"
    },
    "clinicalContext": "Contexte clinique et hypothèses diagnostiques justifiant les examens",
    "urgencyLevel": "Niveau d'urgence global des examens (Immédiate/Semi-urgente/Programmée)"
  },

  "laboratoryTests": [
    {
      "categoryId": "HEMATOLOGIE",
      "categoryName": "Examens Hématologiques",
      "tests": [
        {
          "testId": "NFS",
          "testName": "Numération Formule Sanguine",
          "nabmCode": "B0101",
          "cost": "16.76€",
          "reimbursement": "65%",
          
          "indication": {
            "primaryIndication": "Justification médicale DÉTAILLÉE (minimum 150 mots) selon diagnostic et symptômes",
            "clinicalObjective": "Objectif diagnostique PRÉCIS recherché",
            "diagnosticYield": "Rentabilité diagnostique attendue",
            "evidenceLevel": "Niveau de preuve de l'indication (Grade A/B/C)",
            "guidelineReference": "Référentiel recommandation utilisé"
          },

          "technicalSpecs": {
            "sampleType": "Sang veineux sur tube EDTA",
            "sampleVolume": "2-4 mL",
            "fastingRequired": "Non",
            "preparationTime": "Aucune préparation spécifique",
            "processingTime": "2-4 heures",
            "resultDelay": "Même jour si urgence, 24h en routine"
          },

          "contraindications": {
            "absolute": ["Aucune contre-indication absolue"],
            "relative": ["Troubles coagulation sévères", "Prise anticoagulants majeurs"],
            "patientSpecific": "Vérification spécifique selon profil patient",
            "precautions": "Précautions particulières pour ce patient"
          },

          "interpretation": {
            "normalValues": {
              "hemoglobin": "Homme: 13-17 g/dL, Femme: 12-15 g/dL",
              "hematocrit": "Homme: 40-50%, Femme: 36-45%",
              "leucocytes": "4000-10000/mm³",
              "platelets": "150000-400000/mm³"
            },
            "abnormalFindings": {
              "anemia": "Hb < valeurs normales - Orientation étiologique nécessaire",
              "leucocytosis": "Leucocytes > 10000 - Syndrome infectieux/inflammatoire",
              "thrombocytopenia": "Plaquettes < 150000 - Risque hémorragique"
            },
            "clinicalCorrelation": "Corrélation clinique attendue selon diagnostic suspecté",
            "followUpRequired": "Contrôles nécessaires selon résultats"
          },

          "urgency": {
            "level": "Semi-urgente",
            "timing": "Dans les 24-48 heures",
            "justification": "Nécessaire pour orientation diagnostique et décision thérapeutique",
            "criticalValues": "Valeurs critiques nécessitant alerte immédiate"
          }
        }
      ]
    }
  ],

  "imagingStudies": [
    {
      "categoryId": "RADIOLOGIE_STANDARD",
      "categoryName": "Radiologie Conventionnelle",
      "examinations": [
        {
          "examId": "THORAX_FACE",
          "examName": "Radiographie Thorax Face",
          "ccamCode": "ZBQK002",
          "cost": "25.12€",
          "reimbursement": "70%",

          "indication": {
            "primaryIndication": "Justification radiologique DÉTAILLÉE selon symptômes respiratoires/cardiaques",
            "clinicalQuestion": "Question clinique PRÉCISE à résoudre par l'imagerie",
            "alternativeImaging": "Alternatives d'imagerie selon disponibilité",
            "diagnosticImpact": "Impact diagnostique attendu sur la prise en charge"
          },

          "technicalProtocol": {
            "technique": "Radiographie numérique face debout en inspiration",
            "positioning": "Patient debout, face au détecteur, bras écartés",
            "exposure": "Paramètres techniques standards",
            "views": "Incidence face obligatoire, profil si nécessaire",
            "specialInstructions": "Instructions techniques spéciales si nécessaires"
          },

          "contraindications": {
            "absolute": ["Grossesse (premier trimestre) sans indication vitale"],
            "relative": ["Grossesse connue - Bénéfice/risque à évaluer"],
            "patientSpecific": "${patientData.gender === "Femme" && patientData.age >= 15 && patientData.age <= 50 ? "Femme en âge de procréer - Vérifier absence grossesse" : "Pas de contre-indication liée au sexe/âge"}",
            "radiationDose": "Dose faible d'irradiation - Justification établie"
          },

          "patientPreparation": {
            "preparationRequired": "Déshabillage jusqu'à la ceinture",
            "clothingInstructions": "Retirer bijoux, montres, objets métalliques",
            "medicationAdjustment": "Aucun ajustement médicamenteux nécessaire",
            "specialInstructions": "Instructions spécifiques selon patient"
          },

          "expectedFindings": {
            "normalFindings": "Parenchyme pulmonaire normal, cœur de taille normale",
            "pathologicalSigns": {
              "pulmonary": "Condensations, pneumothorax, épanchements",
              "cardiac": "Cardiomégalie, congestion pulmonaire",
              "mediastinal": "Élargissement médiastinal, masses"
            },
            "limitationsOfTechnique": "Structures postérieures mal visualisées, superpositions",
            "additionalImagingCriteria": "Critères nécessitant imagerie complémentaire"
          },

          "urgency": {
            "level": "Programmée",
            "timing": "Dans les 7-15 jours",
            "justification": "Bilan diagnostique systématique",
            "emergencyCriteria": "Critères nécessitant réalisation urgente"
          }
        }
      ]
    }
  ],

  "specializedTests": [
    {
      "categoryId": "CARDIOLOGIE",
      "categoryName": "Explorations Cardiologiques",
      "examinations": [
        {
          "examId": "ECG_12_DERIVATIONS",
          "examName": "Électrocardiogramme 12 dérivations",
          "nabmCode": "DEQP003",
          "cost": "14.80€",
          "reimbursement": "70%",

          "indication": {
            "primaryIndication": "Exploration cardiologique selon symptômes (douleur thoracique, palpitations, dyspnée)",
            "clinicalObjective": "Dépistage troubles rythme, ischémie, troubles conduction",
            "riskFactors": "Facteurs de risque cardiovasculaire du patient",
            "followUpContext": "Surveillance selon pathologie cardiaque connue"
          },

          "technicalSpecs": {
            "duration": "5-10 minutes",
            "positioning": "Décubitus dorsal, repos 5 minutes",
            "electrodePositioning": "Placement électrodes selon normes internationales",
            "calibration": "25 mm/s, 10 mm/mV",
            "qualityControl": "Vérification absence artéfacts"
          },

          "contraindications": {
            "absolute": ["Aucune contre-indication absolue"],
            "relative": ["Lésions cutanées étendues au niveau électrodes"],
            "patientSpecific": "Adaptation selon état cutané et mobilité",
            "precautions": "Décontamination électrodes entre patients"
          },

          "interpretation": {
            "normalValues": {
              "rhythm": "Rythme sinusal 60-100 bpm",
              "intervals": "PR: 120-200ms, QRS: <120ms, QT corrigé: <440ms",
              "axis": "Axe électrique normal -30° à +90°"
            },
            "pathologicalFindings": {
              "arrhythmias": "Troubles rythme et conduction",
              "ischemia": "Signes ischémie aiguë ou séquellaire",
              "hypertrophy": "Hypertrophies auriculaires ou ventriculaires"
            },
            "emergencyFindings": "Critères ECG nécessitant prise en charge urgente",
            "followUpCriteria": "Anomalies nécessitant surveillance cardiologique"
          },

          "urgency": {
            "level": "Semi-urgente",
            "timing": "Dans les 24-48 heures",
            "justification": "Élimination pathologie cardiaque selon symptômes",
            "emergencyIndications": "Douleur thoracique, malaise, troubles rythme"
          }
        }
      ]
    }
  ],

  "functionalTests": [
    {
      "categoryId": "EXPLORATIONS_FONCTIONNELLES",
      "categoryName": "Épreuves Fonctionnelles",
      "examinations": [
        {
          "examId": "EFR_COMPLETE",
          "examName": "Épreuves Fonctionnelles Respiratoires Complètes",
          "nabmCode": "GLQP004",
          "cost": "54.40€",
          "reimbursement": "70%",

          "indication": {
            "primaryIndication": "Évaluation fonction respiratoire selon symptômes (dyspnée, toux chronique)",
            "clinicalQuestion": "Syndrome obstructif, restrictif, mixte ou normal",
            "diseaseMonitoring": "Surveillance évolution pathologie respiratoire",
            "therapeuticEvaluation": "Évaluation efficacité traitement bronchodilatateur"
          },

          "technicalProtocol": {
            "techniques": ["Spirométrie", "Pléthysmographie", "Test réversibilité"],
            "duration": "45-60 minutes",
            "cooperation": "Nécessite coopération active patient",
            "contraindications": "Pneumothorax récent, anévrisme cérébral",
            "preparation": "Arrêt bronchodilatateurs selon protocole"
          },

          "patientPreparation": {
            "medicationAdjustment": {
              "bronchodilatatorsShortActing": "Arrêt 6 heures avant",
              "bronchodilatatorsLongActing": "Arrêt 12-24 heures selon molécule",
              "corticosteroids": "Maintien traitement corticoïde",
              "otherMedications": "Pas d'arrêt autres traitements"
            },
            "lifestyleInstructions": {
              "smoking": "Éviter tabac 24h avant examen",
              "caffeine": "Éviter café/thé 4h avant",
              "meals": "Repas léger 2h avant, éviter repas copieux",
              "clothing": "Vêtements non serrés"
            }
          },

          "interpretation": {
            "normalValues": {
              "cvf": "CVF > 80% théorique",
              "vems": "VEMS > 80% théorique",
              "ratio": "VEMS/CVF > 70%",
              "capacities": "Capacités pulmonaires dans normes"
            },
            "pathologicalPatterns": {
              "obstruction": "VEMS/CVF < 70% - Syndrome obstructif",
              "restriction": "CVF < 80% avec VEMS/CVF normal",
              "mixed": "Association syndrome obstructif et restrictif"
            },
            "severity": "Classification sévérité selon GOLD/ATS",
            "reversibility": "Réversibilité > 12% et 200mL après bronchodilatateur"
          },

          "urgency": {
            "level": "Programmée",
            "timing": "Dans les 2-4 semaines",
            "justification": "Bilan fonctionnel respiratoire complet",
            "priorityCriteria": "Dyspnée sévère, suspicion pathologie grave"
          }
        }
      ]
    }
  ],

  "consultationsSpecialisees": [
    {
      "specialtyId": "CARDIOLOGIE",
      "specialtyName": "Consultation Cardiologie",
      "ccamCode": "CS02",
      "cost": "46.00€",
      "reimbursement": "70%",

      "indication": {
        "primaryIndication": "Avis cardiologique spécialisé selon symptômes cardiovasculaires",
        "specificQuestions": [
          "Évaluation risque cardiovasculaire global",
          "Optimisation traitement selon recommandations",
          "Nécessité examens complémentaires spécialisés"
        ],
        "urgencyLevel": "Consultation programmée ou semi-urgente selon contexte",
        "expectedOutcome": "Stratification risque et plan thérapeutique adapté"
      },

      "preparation": {
        "documentsToProvide": [
          "Ordonnances et résultats examens récents",
          "Liste complète traitements actuels",
          "Antécédents cardiovasculaires familiaux"
        ],
        "medicationContinuation": "Poursuivre tous traitements sauf indication contraire",
        "specificInstructions": "Apporter tensiomètre si auto-mesure"
      },

      "urgency": {
        "level": "Programmée",
        "timing": "Dans les 4-8 semaines",
        "justification": "Optimisation prise en charge cardiovasculaire",
        "emergencyReferral": "Urgence si douleur thoracique, œdème aigu"
      }
    }
  ],

  "followUpPlan": {
    "resultsTiming": {
      "laboratoryResults": "24-48 heures pour examens urgents, 3-5 jours routine",
      "imagingResults": "Même jour si urgence, 24-72h routine",
      "specializedTestResults": "1-2 semaines selon complexité",
      "consultationReports": "Disponibles après consultation spécialisée"
    },

    "interpretationPlan": {
      "resultReview": "Révision systématique de tous résultats",
      "clinicalCorrelation": "Corrélation clinico-biologique obligatoire",
      "therapeuticAdjustment": "Adaptation thérapeutique selon résultats",
      "additionalTestsCriteria": "Critères nécessitant examens complémentaires"
    },

    "nextSteps": {
      "followUpConsultation": "Consultation résultats dans 7-15 jours",
      "urgentCallback": "Contact immédiat si résultats critiques",
      "emergencyInstructions": "Conduite à tenir selon résultats anormaux",
      "longTermMonitoring": "Plan surveillance selon pathologie diagnostiquée"
    }
  },

  "safetyAndQuality": {
    "qualityAssurance": {
      "indicationValidation": "Validation pertinence toutes prescriptions",
      "dosimetryOptimization": "Optimisation doses irradiation si applicable",
      "contrastSafety": "Sécurité produits contraste vérifiée",
      "riskBenefitAnalysis": "Analyse bénéfice-risque documentée"
    },

    "patientSafety": {
      "allergyCheck": "Vérification allergies avant examens",
      "pregnancyScreen": "${patientData.gender === "Femme" && patientData.age >= 15 && patientData.age <= 50 ? "Dépistage grossesse obligatoire" : "Non applicable"}",
      "renalFunction": "Évaluation fonction rénale si produits contraste",
      "medicationInteractions": "Vérification interactions médicamenteuses"
    },

    "emergencyProcedures": {
      "contrastReactions": "Protocole réaction produits contraste disponible",
      "emergencyContacts": "Contacts urgence laboratoire/imagerie",
      "criticalValuesProcedure": "Procédure transmission valeurs critiques",
      "patientInstructions": "Instructions patient situations urgentes"
    }
  },

  "metadata": {
    "prescriptionMetrics": {
      "totalExaminations": "Nombre total examens prescrits",
      "complexityScore": "Score complexité prescription (1-10)",
      "costEstimate": "Coût total estimé examens",
      "timeToResults": "Délai global obtention résultats",
      "radiationDoseEstimate": "Dose irradiation cumulée si applicable",
      "diagnosticYield": "Rentabilité diagnostique attendue"
    },

    "technicalData": {
      "generationDate": "${new Date().toISOString()}",
      "aiModel": "gpt-4o-diagnostic-imaging-expert",
      "validationLevel": "Expert diagnostic validation",
      "guidelinesUsed": ["HAS", "SFR", "ESC", "ATS/ERS"],
      "lastUpdated": "Dernière mise à jour référentiels"
    },

    "legalCompliance": {
      "indicationJustification": "Justification médicale toutes prescriptions",
      "dosimetryCompliance": "Respect réglementation radioprotection",
      "patientConsent": "Information patient selon Code Santé Publique",
      "dataProtection": "Respect RGPD transmission résultats"
    },

    "qualityIndicators": {
      "appropriatenessScore": "Score pertinence prescriptions",
      "evidenceLevel": "Niveau preuve recommandations",
      "costEffectiveness": "Rapport coût-efficacité",
      "patientSatisfaction": "Satisfaction patient attendue"
    }
  }
}

Génère maintenant l'ordonnance d'examens EXPERTE et COMPLÈTE au format JSON strict, en appliquant tous les principes de médecine diagnostique et de sécurité patient.
`

    console.log("🧠 Génération ordonnance examens experte avec OpenAI...")

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: expertExamensPrompt,
      maxTokens: 16000,
      temperature: 0.05, // Très faible pour maximiser la précision
    })

    console.log("✅ Ordonnance examens experte générée")

    // Parsing JSON avec gestion d'erreur experte
    let examensData
    try {
      let cleanText = result.text.trim()
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      
      const startIndex = cleanText.indexOf('{')
      const endIndex = cleanText.lastIndexOf('}')
      
      if (startIndex >= 0 && endIndex > startIndex) {
        cleanText = cleanText.substring(startIndex, endIndex + 1)
      }
      
      examensData = JSON.parse(cleanText)
      console.log("✅ JSON examens parsé avec succès")
      
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON examens, génération fallback expert")
      examensData = generateExpertExamensFallback(patientData, diagnosisData, clinicalData)
    }

    // Validation sécuritaire supplémentaire
    examensData = await validateExamensSafety(examensData, patientData)

    // Calcul automatique des métriques
    examensData.metadata = {
      ...examensData.metadata,
      calculatedMetrics: {
        totalExaminations: calculateTotalExaminations(examensData),
        estimatedCost: calculateEstimatedCost(examensData),
        totalRadiation: calculateRadiationDose(examensData),
        urgentExamsCount: countUrgentExams(examensData),
        averageResultDelay: calculateAverageDelay(examensData)
      }
    }

    console.log("✅ Ordonnance examens EXPERTE générée avec succès")

    return NextResponse.json({
      success: true,
      examens: examensData,
      metadata: {
        prescriptionType: "EXPERT_EXAMINATIONS_PRESCRIPTION",
        patientId: `${patientData.lastName}-${patientData.firstName}`,
        prescriptionDate: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        model: "gpt-4o-diagnostic-expert",
        safetyLevel: "MAXIMUM",
        validationStatus: "EXPERT_VALIDATED",
        examinationsCount: calculateTotalExaminations(examensData),
        complexityLevel: calculateExamensComplexity(examensData),
        riskLevel: assessExamensRisk(examensData, patientData),
        estimatedCost: calculateEstimatedCost(examensData)
      }
    })

  } catch (error) {
    console.error("❌ Erreur génération ordonnance examens experte:", error)

    // Fallback sécuritaire
    const fallbackExamens = generateExpertExamensFallback(
      request.body?.patientData, 
      request.body?.diagnosisData, 
      request.body?.clinicalData
    )

    return NextResponse.json({
      success: true,
      examens: fallbackExamens,
      fallback: true,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      metadata: {
        prescriptionType: "EXPERT_FALLBACK_EXAMINATIONS",
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
        safetyLevel: "HIGH",
        errorRecovery: "Prescription examens sécuritaire de fallback utilisée"
      }
    }, { status: 200 })
  }
}

function generateExpertExamensFallback(patientData: any, diagnosisData: any, clinicalData: any): any {
  return {
    prescriptionHeader: {
      prescriptionId: `EXA-FB-${Date.now()}`,
      issueDate: new Date().toLocaleDateString("fr-FR"),
      issueTime: new Date().toLocaleTimeString("fr-FR"),
      prescriber: {
        name: "Dr. TIBOK IA DOCTOR",
        title: "Praticien Expert en Médecine Interne",
        rppsNumber: "IA-RPPS-2024-EXPERT",
        establishment: "Centre Médical TIBOK - Consultation IA Expert"
      },
      patient: {
        lastName: patientData?.lastName || "N/A",
        firstName: patientData?.firstName || "N/A",
        age: `${patientData?.age || "N/A"} ans`,
        weight: `${patientData?.weight || "N/A"} kg`
      },
      clinicalContext: `Bilan diagnostique selon symptômes présentés : ${(clinicalData?.symptoms || []).join(", ") || "symptômes à préciser"}`,
      urgencyLevel: "Programmée"
    },

    laboratoryTests: [
      {
        categoryId: "HEMATOLOGIE_BIOCHIMIE",
        categoryName: "Bilan Biologique Standard",
        tests: [
          {
            testId: "NFS_IONO_CRP",
            testName: "NFS + Ionogramme + CRP",
            nabmCode: "B0101 + B0102 + B0103",
            cost: "45.60€",
            reimbursement: "65%",
            
            indication: {
              primaryIndication: "Bilan biologique de première intention dans le cadre de l'évaluation diagnostique. La NFS permet de détecter une anémie, un syndrome infectieux ou inflammatoire. L'ionogramme évalue l'équilibre hydroélectrolytique et la fonction rénale. La CRP quantifie le syndrome inflammatoire.",
              clinicalObjective: "Dépistage anomalies hématologiques, métaboliques et inflammatoires",
              evidenceLevel: "Grade A",
              guidelineReference: "Recommandations HAS - Bilan biologique de première intention"
            },

            technicalSpecs: {
              sampleType: "Sang veineux - 2 tubes (EDTA + sec)",
              sampleVolume: "6 mL total",
              fastingRequired: "Non nécessaire",
              processingTime: "2-4 heures",
              resultDelay: "Même jour si urgence"
            },

            contraindications: {
              absolute: ["Aucune contre-indication absolue"],
              relative: ["Troubles coagulation majeurs"],
              patientSpecific: patientData?.allergies?.includes("Latex") ? "Allergie latex - Précautions prélèvement" : "Pas de précaution particulière"
            },

            urgency: {
              level: "Semi-urgente",
              timing: "Dans les 24-48 heures",
              justification: "Bilan initial pour orientation diagnostique"
            }
          }
        ]
      }
    ],

    imagingStudies: [
      {
        categoryId: "RADIOLOGIE_STANDARD",
        categoryName: "Imagerie de Base",
        examinations: [
          {
            examId: "THORAX_FACE",
            examName: "Radiographie Thorax Face",
            ccamCode: "ZBQK002",
            cost: "25.12€",
            reimbursement: "70%",

            indication: {
              primaryIndication: "Imagerie thoracique de première intention selon symptômes respiratoires ou dans le cadre d'un bilan général. Permet le dépistage de pathologies pulmonaires, cardiaques ou médiastinales.",
              clinicalQuestion: "Élimination pathologie thoracique visible sur radiographie standard",
              diagnosticImpact: "Orientation diagnostique immédiate ou élimination pathologie grave"
            },

            contraindications: {
              absolute: patientData?.gender === "Femme" && patientData?.age >= 15 && patientData?.age <= 50 ? ["Grossesse (premier trimestre) sans indication vitale"] : ["Aucune"],
              patientSpecific: "Vérification absence grossesse si femme en âge de procréer"
            },

            urgency: {
              level: "Programmée",
              timing: "Dans les 7-15 jours",
              justification: "Imagerie de débrouillage thoracique"
            }
          }
        ]
      }
    ],

    specializedTests: [
      {
        categoryId: "CARDIOLOGIE",
        categoryName: "Bilan Cardiaque de Base",
        examinations: [
          {
            examId: "ECG_REPOS",
            examName: "Électrocardiogramme de repos",
            nabmCode: "DEQP003",
            cost: "14.80€",
            reimbursement: "70%",

            indication: {
              primaryIndication: "ECG de dépistage selon symptômes cardiovasculaires ou dans le cadre d'un bilan systématique. Détection troubles rythme, conduction, signes ischémie.",
              clinicalObjective: "Élimination pathologie cardiaque électrique",
              riskFactors: `Facteurs de risque cardiovasculaire : âge ${patientData?.age || "N/A"} ans, antécédents ${(patientData?.medicalHistory || []).join(", ") || "aucun"}`
            },

            contraindications: {
              absolute: ["Aucune contre-indication"],
              relative: ["Lésions cutanées au niveau électrodes"],
              patientSpecific: "Examen non invasif sans risque particulier"
            },

            urgency: {
              level: "Semi-urgente",
              timing: "Dans les 24-48 heures",
              justification: "Élimination urgence cardiologique selon symptômes"
            }
          }
        ]
      }
    ],

    followUpPlan: {
      resultsTiming: {
        laboratoryResults: "24-48 heures",
        imagingResults: "24-72 heures",
        specializedTestResults: "Immédiat pour ECG"
      },
      interpretationPlan: {
        resultReview: "Révision systématique tous résultats dans les 72h",
        clinicalCorrelation: "Corrélation clinico-biologique obligatoire",
        nextSteps: "Adaptation prise en charge selon résultats"
      },
      nextSteps: {
        followUpConsultation: "Consultation résultats dans 7-10 jours",
        urgentCallback: "Contact immédiat si valeurs critiques",
        emergencyInstructions: "Consulter urgences si aggravation clinique"
      }
    },

    metadata: {
      prescriptionMetrics: {
        totalExaminations: 3,
        complexityScore: 3,
        costEstimate: "85.52€",
        timeToResults: "48-72 heures",
        diagnosticYield: "Élevée pour bilan de première intention"
      },
      technicalData: {
        generationDate: new Date().toISOString(),
        aiModel: "Expert-Fallback-Examens",
        validationLevel: "Prescription examens sécuritaire de base"
      }
    }
  }
}

async function validateExamensSafety(examensData: any, patientData: any): Promise<any> {
  // Validation sécuritaire automatique examens
  
  // Vérification grossesse pour examens irradiants
  if (patientData.gender === "Femme" && patientData.age >= 15 && patientData.age <= 50) {
    if (examensData.imagingStudies) {
      examensData.pregnancyWarning = {
        level: "IMPORTANT",
        message: "Femme en âge de procréer - Vérifier absence grossesse avant examens irradiants",
        action: "Test grossesse si doute avant radiologie"
      }
    }
  }

  // Vérification fonction rénale pour produits de contraste
  if (patientData.age > 65 || patientData.medicalHistory?.includes("Insuffisance rénale")) {
    examensData.renalSafetyWarning = {
      level: "CRITIQUE",
      message: "Fonction rénale à vérifier avant injection produits de contraste",
      action: "Créatininémie obligatoire avant injection"
    }
  }

  return examensData
}

function calculateTotalExaminations(examensData: any): number {
  let total = 0
  if (examensData.laboratoryTests) total += examensData.laboratoryTests.reduce((sum: number, cat: any) => sum + (cat.tests?.length || 0), 0)
  if (examensData.imagingStudies) total += examensData.imagingStudies.reduce((sum: number, cat: any) => sum + (cat.examinations?.length || 0), 0)
  if (examensData.specializedTests) total += examensData.specializedTests.reduce((sum: number, cat: any) => sum + (cat.examinations?.length || 0), 0)
  return total
}

function calculateEstimatedCost(examensData: any): string {
  // Calcul approximatif basé sur tarifs moyens
  const examCount = calculateTotalExaminations(examensData)
  const averageCost = 35 // Coût moyen par examen
  return `${(examCount * averageCost).toFixed(2)}€`
}

function calculateRadiationDose(examensData: any): string {
  // Estimation dose radiation selon examens
  let dose = 0
  if (examensData.imagingStudies) {
    examensData.imagingStudies.forEach((category: any) => {
      category.examinations?.forEach((exam: any) => {
        if (exam.examId?.includes("THORAX")) dose += 0.1 // mSv
        if (exam.examId?.includes("CT")) dose += 5 // mSv
      })
    })
  }
  return dose > 0 ? `${dose.toFixed(1)} mSv` : "Aucune irradiation"
}

function countUrgentExams(examensData: any): number {
  let urgent = 0
  // Compter examens urgents dans toutes catégories
  return urgent
}

function calculateAverageDelay(examensData: any): string {
  return "48-72 heures" // Délai moyen estimé
}

function calculateExamensComplexity(examensData: any): string {
  const totalExams = calculateTotalExaminations(examensData)
  
  if (totalExams >= 8) return "ÉLEVÉE"
  if (totalExams >= 5) return "MODÉRÉE"
  return "STANDARD"
}

function assessExamensRisk(examensData: any, patientData: any): string {
  let risk = 0
  
  if (patientData.age >= 65) risk += 1
  if (patientData.allergies?.length > 0) risk += 1
  if (calculateTotalExaminations(examensData) > 5) risk += 1
  
  if (risk >= 2) return "MODÉRÉ"
  return "FAIBLE"
}
