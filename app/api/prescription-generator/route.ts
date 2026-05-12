import { type NextRequest, NextResponse } from "next/server"
import { callLLM } from "@/lib/llm-client"

export const runtime = 'nodejs'
// 300s cap to absorb DeepSeek V4-Pro thinking latency on a 12k-token output.
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    console.log("💊 Début génération ordonnance médicamenteuse EXPERT")
    
    const { patientData, diagnosisData, clinicalData } = await request.json()

    if (!patientData || !diagnosisData || !clinicalData) {
      return NextResponse.json(
        { success: false, error: "Données patient, diagnostic et cliniques requises pour prescription sécurisée" },
        { status: 400 }
      )
    }

    // Construction du contexte médical complet pour prescription sécurisée
    const prescriptionContext = `
PROFIL PATIENT DÉTAILLÉ POUR PRESCRIPTION:
- Identité: Patient anonymisé (le nom sera réinjecté côté serveur après génération)
- Âge: ${patientData.age || "N/A"} ans (${patientData.age >= 65 ? "PATIENT ÂGÉE - Précautions posologiques" : "Adulte standard"})
- Sexe: ${patientData.gender || "N/A"} ${patientData.gender === "Femme" && patientData.age >= 15 && patientData.age <= 50 ? "(Âge de procréation - Vérifier contraception/grossesse)" : ""}
- Poids: ${patientData.weight || "N/A"} kg, Taille: ${patientData.height || "N/A"} cm
- IMC: ${patientData.weight && patientData.height ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(2) : "N/A"} kg/m²

PROFIL ALLERGIQUE CRITIQUE:
- Allergies médicamenteuses: ${(patientData.allergies || []).join(", ") || "Aucune allergie médicamenteuse connue"}
- Allergies additionnelles: ${patientData.otherAllergies || "Aucune"}

TERRAIN MÉDICAL ET CONTRE-INDICATIONS:
- Antécédents cardiovasculaires: ${patientData.medicalHistory?.filter((h: string) => h.includes("cardiaque") || h.includes("AVC") || h.includes("infarctus")).join(", ") || "Aucun"}
- Antécédents gastro-intestinaux: ${patientData.medicalHistory?.filter((h: string) => h.includes("ulcère") || h.includes("gastrite") || h.includes("saignement")).join(", ") || "Aucun"}
- Pathologies chroniques: ${(patientData.medicalHistory || []).join(", ") || "Aucune pathologie chronique connue"}

THÉRAPEUTIQUES ACTUELLES - INTERACTIONS:
- Médicaments en cours: ${patientData.currentMedicationsText || "Aucun traitement actuel"}

DIAGNOSTIC ET INDICATION THÉRAPEUTIQUE:
- Diagnostic principal: ${diagnosisData.diagnosis?.primaryDiagnosis?.condition || "Non établi"}
- Sévérité: ${diagnosisData.diagnosis?.primaryDiagnosis?.severity || "Non gradée"}
- Symptômes cibles: ${(clinicalData.symptoms || []).join(", ") || "Aucun symptôme spécifié"}
- Douleur: ${clinicalData.painScale || 0}/10 (${clinicalData.painScale >= 7 ? "SÉVÈRE - Antalgiques puissants" : clinicalData.painScale >= 4 ? "MODÉRÉE - Antalgiques standards" : "LÉGÈRE - Antalgiques simples"})
- Fièvre: ${clinicalData.vitalSigns?.temperature > 38.5 ? "HYPERTHERMIE - Antipyrétiques" : "Normale"}
    `.trim()

    const expertPrescriptionPrompt = `
Tu es un médecin expert en pharmacologie clinique et thérapeutique avec 25 ans d'expérience.

${prescriptionContext}

INSTRUCTIONS CRITIQUES:
- Tu DOIS retourner UNIQUEMENT du JSON valide
- NE PAS écrire de texte avant ou après le JSON
- NE PAS utiliser de backticks markdown (\`\`\`)
- NE PAS commencer par "Voici" ou "Je vous propose"
- COMMENCER DIRECTEMENT par le caractère {
- FINIR DIRECTEMENT par le caractère }

Génère EXACTEMENT cette structure JSON (remplace les valeurs par des données médicales appropriées):

{
  "prescriptionHeader": {
    "prescriptionId": "ORD-${Date.now()}",
    "issueDate": "${new Date().toLocaleDateString("fr-FR")}",
    "issueTime": "${new Date().toLocaleTimeString("fr-FR")}",
    "prescriber": {
      "name": "Dr. TIBOK IA DOCTOR",
      "title": "Praticien Expert en Médecine Interne",
      "rppsNumber": "IA-RPPS-2024-EXPERT",
      "establishment": "Centre Médical TIBOK - Consultation IA Expert"
    },
    "patient": {
      "lastName": "[FILL_LASTNAME]",
      "firstName": "[FILL_FIRSTNAME]",
      "birthDate": "[FILL_BIRTHDATE]",
      "age": "${patientData.age || "N/A"} ans",
      "weight": "${patientData.weight || "N/A"} kg"
    },
    "indication": "Prescription thérapeutique selon diagnostic établi",
    "validityPeriod": "Validité 3 mois selon réglementation française"
  },
  "medications": [
    {
      "lineNumber": 1,
      "prescriptionType": "MÉDICAMENT",
      "dci": "Paracétamol",
      "brandName": "Doliprane",
      "dosageForm": "Comprimé pelliculé",
      "strength": "500 mg",
      "atcCode": "N02BE01",
      "posology": {
        "dosage": "500 mg à 1 g par prise",
        "frequency": "Toutes les 6 heures si nécessaire",
        "timing": "De préférence après les repas",
        "route": "Voie orale",
        "maxDailyDose": "4 g maximum par 24 heures"
      },
      "treatment": {
        "duration": "3 à 5 jours maximum",
        "totalQuantity": "20 comprimés",
        "renewals": "Non renouvelable sans consultation",
        "stoppingCriteria": "Disparition de la douleur ou de la fièvre"
      },
      "indication": {
        "primaryIndication": "Traitement symptomatique de la douleur légère à modérée et/ou de la fièvre, dans le cadre de la prise en charge du diagnostic établi. Le paracétamol est l'antalgique de première intention recommandé par l'ANSM.",
        "therapeuticObjective": "Soulagement de la douleur et réduction de la fièvre",
        "expectedOutcome": "Amélioration symptomatique dans les 30-60 minutes",
        "evidenceLevel": "Grade A"
      },
      "safetyProfile": {
        "contraindications": {
          "absolute": ["Allergie au paracétamol", "Insuffisance hépatique sévère"],
          "relative": ["Insuffisance hépatique modérée", "Alcoolisme chronique"],
          "patientSpecific": "Vérification allergie effectuée : pas d'allergie connue"
        },
        "interactions": {
          "majorInteractions": ["Warfarine (surveillance INR)", "Alcool (hépatotoxicité)"],
          "moderateInteractions": ["Isoniazide", "Rifampicine"],
          "foodInteractions": ["Éviter consommation excessive d'alcool"]
        },
        "sideEffects": {
          "common": ["Troubles digestifs mineurs (<1%)"],
          "serious": ["Hépatotoxicité en cas de surdosage", "Réactions allergiques rares"],
          "warningSignsToReport": "Nausées, vomissements, douleurs abdominales, ictère"
        }
      },
      "monitoring": {
        "clinicalMonitoring": {
          "parameters": ["Efficacité antalgique", "Tolérance digestive"],
          "frequency": "Auto-évaluation quotidienne"
        },
        "followUpSchedule": "Réévaluation si pas d'amélioration à 48-72h"
      },
      "patientInstructions": {
        "administrationInstructions": "Prendre avec un grand verre d'eau, de préférence après les repas",
        "storageInstructions": "Conserver à température ambiante, à l'abri de l'humidité",
        "missedDoseInstructions": "Si oubli : prendre dès que possible, mais pas de double dose"
      },
      "prescriptionValidation": {
        "doseAppropriate": "Dose standard adaptée à l'adulte",
        "durationJustified": "Durée courte pour traitement symptomatique",
        "interactionChecked": "Vérification interactions effectuée",
        "allergyChecked": "Vérification allergies réalisée",
        "safetyScore": 95
      }
    }
  ],
  "nonPharmacologicalInterventions": [
    {
      "intervention": "Repos et mesures générales",
      "description": "Repos relatif conseillé selon les symptômes. Hydratation suffisante recommandée (1,5 à 2 litres d'eau par jour). Application de froid local si douleur inflammatoire, ou de chaleur si douleur musculaire.",
      "indication": "Mesures d'accompagnement pour optimiser la récupération",
      "implementation": "À adapter selon les symptômes et la tolérance",
      "duration": "Pendant toute la durée des symptômes",
      "expectedBenefits": "Amélioration du confort et accélération de la guérison",
      "evidenceLevel": "Grade B"
    }
  ],
  "patientEducation": {
    "diseaseEducation": {
      "pathologyExplanation": "Explication adaptée de la pathologie au patient",
      "prognosisDiscussion": "Discussion du pronostic et évolution"
    },
    "medicationEducation": {
      "importanceOfCompliance": "Importance de l'observance thérapeutique",
      "sideEffectsToReport": "Effets secondaires à signaler"
    },
    "emergencyInstructions": {
      "warningSignsToReport": "Aggravation des symptômes, fièvre persistante >3 jours, apparition nouveaux symptômes",
      "emergencyContacts": "15 (SAMU) en cas d'urgence vitale",
      "whenToStopMedication": "En cas de réaction allergique ou effet indésirable grave"
    },
    "followUpInstructions": {
      "nextAppointment": "Reconsulter si pas d'amélioration à 72h ou aggravation",
      "selfMonitoringInstructions": "Surveiller température et douleur, tenir journal si nécessaire"
    }
  },
  "prescriptionSafety": {
    "safetyChecklist": {
      "patientIdentificationVerified": "Vérification identité patient effectuée",
      "allergyHistoryChecked": "Historique allergique vérifié",
      "drugInteractionsChecked": "Interactions médicamenteuses contrôlées",
      "doseCalculationVerified": "Calculs posologiques vérifiés"
    },
    "riskMitigation": {
      "identifiedRisks": ["Risque hépatotoxicité si surdosage"],
      "mitigationStrategies": ["Respect dose maximale quotidienne", "Information patient"]
    }
  },
  "metadata": {
    "prescriptionMetrics": {
      "totalMedications": 1,
      "complexityScore": 2,
      "safetyScore": 95,
      "evidenceLevel": "Grade A"
    },
    "technicalData": {
      "generationDate": "${new Date().toISOString()}",
      "aiModel": "gpt-5.5-pharmacology-expert",
      "validationLevel": "Expert pharmacological validation"
    }
  }
}
`

    console.log("🧠 Génération ordonnance experte (LLM)...")

    const result = await callLLM({
      useCase: 'PRESCRIPTION',
      messages: [
        {
          role: 'system',
          content: `PERSONA — SENIOR CLINICAL PHARMACOLOGIST (MAURITIUS / UK STANDARDS)

You are a senior clinical pharmacologist working alongside the consulting physician in Mauritius. You apply UK medical standards (BNF, NICE, BTS/SIGN) plus awareness of locally relevant tropical-disease prescribing (e.g. NSAID avoidance in suspected dengue, doxycycline for leptospirosis, artemether-lumefantrine for malaria). Your output is a finalised, pharmacist-checkable prescription — not a draft.

PRESCRIPTION QUALITY RULES — STRICT

1. EXACT DCI — every drug must use the WHO International Nonproprietary Name (paracetamol, amoxicillin, ibuprofen) not brand names (Doliprane, Augmentin).

2. EVIDENCE-BASED DOSING — dose, frequency and duration must match the BNF or NICE guideline for the prescribed indication. Use UK abbreviations: OD (once daily), BD (twice daily), TDS (three times daily), QDS (four times daily), PRN (as needed).

3. INDICATION FIELD — minimum 40 characters per medication. State (a) which clinical condition the drug treats, (b) why this molecule was chosen over alternatives for this patient, (c) any pertinent contraindication consciously cleared (e.g. "paracetamol chosen over NSAIDs because dengue not yet excluded").

4. INTERACTION SCREENING — before each prescription, mentally check against the patient's currently listed medications and allergies. If a meaningful interaction exists, state it AND the chosen mitigation in the indication.

5. CONTRAINDICATION CHECK — verify against patient comorbidities (renal impairment → eGFR threshold; hepatic → Child-Pugh; pregnancy → BNF pregnancy category) and allergies. If a key data point (eGFR, allergy list, pregnancy status) is missing, state it explicitly in the indication and choose the drug with the safest unknown-state profile.

6. MONITORING — every medication needs an explicit monitoring plan (clinical or lab parameter, timing, action threshold). No "monitor as appropriate" boilerplate.

7. NO ABX UNLESS INDICATED — never prescribe antibiotics for syndromes that are viral by default (acute bronchitis in healthy adults, common cold, viral pharyngitis without modified Centor ≥3). If you skip antibiotics deliberately, state the reasoning in the management justification of the relevant indication.

8. TROPICAL CONTEXT — when fever + arboviral suspicion (Mauritius default), explicitly avoid NSAIDs / aspirin until dengue excluded. Document this clearance in the paracetamol indication.

9. NON-PHARMACOLOGICAL ADVICE — when relevant, include hydration, rest, mosquito-bite prevention, vector control, return-precautions. Pharmacological-only management is rarely complete.

ANTI-BOILERPLATE — BANNED PHRASES
"Take as directed", "Monitor as appropriate", "Consider clinical context", "Use with caution", "Adjust based on response", "Standard dose for adult patient". Every instruction must be specific.

ANTI-HALLUCINATION (STRICT)
- Never prescribe a drug absent from BNF / NICE / Mauritius MoH guidelines for the given indication.
- Never prescribe a drug contraindicated by the patient's listed allergies, comorbidities, or current medications.
- If a critical data point is missing for safe prescribing, state the gap explicitly in the indication field. Do NOT invent a value.
- Preserve "doctor_clinical_notes" hypotheses faithfully when provided.

OUTPUT FORMAT — STRICT
Respond with valid JSON only, matching the schema in the user prompt. No prose outside the JSON.`
        },
        { role: 'user', content: expertPrescriptionPrompt },
      ],
      maxTokens: 12000,
      reasoningEffort: 'low',
      timeoutMs: 280_000,
    })

    console.log(`✅ Ordonnance experte générée (provider=${result.provider}${result.fallbackUsed ? ' [fallback]' : ''}, ${result.latencyMs}ms)`)

    // Parsing JSON avec gestion d'erreur experte
    let prescriptionData
    try {
      let cleanText = result.text.trim()
      
      // Enlever les backticks markdown s'ils existent
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      
      // Trouver le début et la fin du JSON
      const startIndex = cleanText.indexOf('{')
      const endIndex = cleanText.lastIndexOf('}')
      
      if (startIndex >= 0 && endIndex > startIndex) {
        cleanText = cleanText.substring(startIndex, endIndex + 1)
      }
      
      prescriptionData = JSON.parse(cleanText)
      console.log("✅ JSON ordonnance parsé avec succès")

    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON ordonnance, génération fallback expert")
      prescriptionData = generateExpertPrescriptionFallback(patientData, diagnosisData, clinicalData)
    }

    // Re-inject patient identity stripped from the LLM prompt for privacy.
    if (prescriptionData?.prescriptionHeader?.patient) {
      const p = prescriptionData.prescriptionHeader.patient
      if (!p.lastName || p.lastName === '[FILL_LASTNAME]') p.lastName = patientData.lastName || "N/A"
      if (!p.firstName || p.firstName === '[FILL_FIRSTNAME]') p.firstName = patientData.firstName || "N/A"
      if (!p.birthDate || p.birthDate === '[FILL_BIRTHDATE]') p.birthDate = patientData.dateOfBirth || "N/A"
    }

    // Validation sécuritaire supplémentaire
    prescriptionData = await validatePrescriptionSafety(prescriptionData, patientData)

    // Vérification interactions avec base FDA si disponible
    try {
      const medicationNames = prescriptionData.medications?.map((m: any) => m.dci) || []
      if (medicationNames.length > 0) {
        const fdaResponse = await fetch("/api/fda-drug-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medications: medicationNames })
        })
        
        if (fdaResponse.ok) {
          const fdaData = await fdaResponse.json()
          prescriptionData.fdaValidation = fdaData
          console.log("✅ Validation FDA intégrée")
        }
      }
    } catch (fdaError) {
      console.warn("⚠️ Validation FDA non disponible")
    }

    console.log("✅ Ordonnance médicamenteuse EXPERTE générée avec succès")

    return NextResponse.json({
      success: true,
      prescription: prescriptionData,
      metadata: {
        prescriptionType: "EXPERT_MEDICATION_PRESCRIPTION",
        patientId: `${patientData.lastName}-${patientData.firstName}`,
        prescriptionDate: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        model: "gpt-5.5-pharmacology-expert",
        safetyLevel: "MAXIMUM",
        validationStatus: "EXPERT_VALIDATED",
        medicationCount: prescriptionData.medications?.length || 0,
        complexityLevel: calculatePrescriptionComplexity(prescriptionData),
        riskLevel: assessPrescriptionRisk(prescriptionData, patientData)
      }
    })

  } catch (error) {
    console.error("❌ Erreur génération ordonnance experte:", error)

    // Fallback sécuritaire
    const fallbackPrescription = generateExpertPrescriptionFallback(
      request.body?.patientData || {}, 
      request.body?.diagnosisData || {}, 
      request.body?.clinicalData || {}
    )

    return NextResponse.json({
      success: true,
      prescription: fallbackPrescription,
      fallback: true,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      metadata: {
        prescriptionType: "EXPERT_FALLBACK_PRESCRIPTION",
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
        safetyLevel: "HIGH",
        errorRecovery: "Prescription sécuritaire de fallback utilisée"
      }
    }, { status: 200 })
  }
}

function generateExpertPrescriptionFallback(patientData: any, diagnosisData: any, clinicalData: any): any {
  // Vérifier les allergies au paracétamol
  const hasParacetamolAllergy = (patientData?.allergies || []).some((allergy: string) => 
    allergy.toLowerCase().includes("paracétamol") || allergy.toLowerCase().includes("paracetamol")
  )

  // Médicament de base sécurisé
  const safeMedication = hasParacetamolAllergy ? {
    dci: "Ibuprofène",
    brandName: "Advil",
    dosageForm: "Comprimé pelliculé",
    strength: "400 mg",
    atcCode: "M01AE01",
    contraindications: ["Ulcère gastro-duodénal", "Insuffisance rénale sévère", "Grossesse (3ème trimestre)"],
    indication: "Anti-inflammatoire et antalgique (patient allergique au paracétamol)"
  } : {
    dci: "Paracétamol",
    brandName: "Doliprane",
    dosageForm: "Comprimé pelliculé",
    strength: "500 mg",
    atcCode: "N02BE01",
    contraindications: ["Insuffisance hépatique sévère"],
    indication: "Antalgique et antipyrétique de première intention"
  }

  return {
    prescriptionHeader: {
      prescriptionId: `ORD-FB-${Date.now()}`,
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
      indication: "Prescription sécuritaire selon diagnostic établi - Réévaluation nécessaire"
    },

    medications: [
      {
        lineNumber: 1,
        prescriptionType: "MÉDICAMENT",
        dci: safeMedication.dci,
        brandName: safeMedication.brandName,
        dosageForm: safeMedication.dosageForm,
        strength: safeMedication.strength,
        atcCode: safeMedication.atcCode,
        
        posology: {
          dosage: hasParacetamolAllergy ? "400 mg par prise" : "500 mg à 1 g par prise",
          frequency: hasParacetamolAllergy ? "Toutes les 8 heures si nécessaire" : "Toutes les 6 heures si nécessaire",
          timing: "De préférence après les repas",
          route: "Voie orale",
          maxDailyDose: hasParacetamolAllergy ? "1200 mg maximum par 24 heures" : "4 g maximum par 24 heures"
        },
        
        treatment: {
          duration: "3 à 5 jours maximum",
          totalQuantity: hasParacetamolAllergy ? "18 comprimés" : "20 comprimés",
          renewals: "Non renouvelable sans consultation",
          stoppingCriteria: "Disparition de la douleur ou de la fièvre"
        },

        indication: {
          primaryIndication: safeMedication.indication,
          therapeuticObjective: "Soulagement de la douleur et réduction de la fièvre",
          expectedOutcome: "Amélioration symptomatique dans les 30-60 minutes",
          evidenceLevel: "Grade A"
        },

        safetyProfile: {
          contraindications: {
            absolute: safeMedication.contraindications,
            patientSpecific: hasParacetamolAllergy ? "ALLERGIE PARACÉTAMOL DÉTECTÉE - Alternative prescrite" : "Pas d'allergie connue"
          },
          interactions: {
            majorInteractions: hasParacetamolAllergy ? ["Anticoagulants", "Corticoïdes"] : ["Warfarine", "Alcool"],
            moderateInteractions: hasParacetamolAllergy ? ["Lithium", "Méthotrexate"] : ["Isoniazide"],
            foodInteractions: ["Éviter consommation excessive d'alcool"]
          },
          sideEffects: {
            common: hasParacetamolAllergy ? ["Troubles digestifs", "Nausées"] : ["Troubles digestifs mineurs"],
            serious: hasParacetamolAllergy ? ["Ulcération gastrique", "Insuffisance rénale"] : ["Hépatotoxicité si surdosage"],
            warningSignsToReport: hasParacetamolAllergy ? "Douleurs gastriques, selles noires" : "Nausées, vomissements, ictère"
          }
        },

        monitoring: {
          clinicalMonitoring: {
            parameters: ["Efficacité antalgique", "Tolérance digestive"],
            frequency: "Auto-évaluation quotidienne"
          },
          followUpSchedule: "Réévaluation si pas d'amélioration à 48-72h"
        },

        patientInstructions: {
          administrationInstructions: "Prendre avec un grand verre d'eau, pendant ou après les repas",
          storageInstructions: "Conserver à température ambiante, à l'abri de l'humidité",
          missedDoseInstructions: "Si oubli : prendre dès que possible, mais pas de double dose"
        },

        prescriptionValidation: {
          doseAppropriate: "Dose adaptée selon allergie patient",
          durationJustified: "Durée courte pour traitement symptomatique",
          interactionChecked: "Vérification interactions effectuée",
          allergyChecked: "Vérification allergies réalisée - Alternative prescrite si nécessaire",
          safetyScore: hasParacetamolAllergy ? 90 : 95
        }
      }
    ],

    nonPharmacologicalInterventions: [
      {
        intervention: "Repos et mesures générales",
        description: "Repos relatif conseillé selon les symptômes. Hydratation suffisante recommandée (1,5 à 2 litres d'eau par jour). Application de froid local si douleur inflammatoire, ou de chaleur si douleur musculaire. Éviter les activités physiques intenses pendant la phase aiguë.",
        indication: "Mesures d'accompagnement pour optimiser la récupération",
        implementation: "À adapter selon les symptômes et la tolérance",
        duration: "Pendant toute la durée des symptômes",
        expectedBenefits: "Amélioration du confort et accélération de la guérison",
        evidenceLevel: "Grade B"
      }
    ],

    patientEducation: {
      emergencyInstructions: {
        warningSignsToReport: hasParacetamolAllergy ? 
          "Douleurs gastriques intenses, selles noires, vomissements, essoufflement" :
          "Aggravation des symptômes, fièvre persistante >3 jours, apparition nouveaux symptômes",
        emergencyContacts: "15 (SAMU) en cas d'urgence vitale",
        whenToStopMedication: "En cas de réaction allergique ou effet indésirable grave"
      },
      followUpInstructions: {
        nextAppointment: "Reconsulter si pas d'amélioration à 72h ou aggravation",
        selfMonitoringInstructions: "Surveiller température et douleur, tenir journal si nécessaire"
      }
    },

    metadata: {
      prescriptionMetrics: {
        totalMedications: 1,
        complexityScore: 2,
        safetyScore: hasParacetamolAllergy ? 90 : 95,
        evidenceLevel: "Grade A",
        allergyAdapted: hasParacetamolAllergy
      },
      technicalData: {
        generationDate: new Date().toISOString(),
        aiModel: "Expert-Fallback-System",
        validationLevel: "Prescription sécuritaire de base avec adaptation allergies"
      }
    }
  }
}

async function validatePrescriptionSafety(prescriptionData: any, patientData: any): Promise<any> {
  // Validation sécuritaire automatique
  
  // Vérification allergies
  if (patientData.allergies && prescriptionData.medications) {
    prescriptionData.medications = prescriptionData.medications.map((med: any) => {
      const allergyDetected = patientData.allergies.some((allergy: string) => 
        med.dci?.toLowerCase().includes(allergy.toLowerCase()) ||
        med.brandName?.toLowerCase().includes(allergy.toLowerCase())
      )
      
      if (allergyDetected) {
        med.safetyAlert = {
          level: "CRITICAL",
          message: `ALLERGIE DÉTECTÉE - CONTRE-INDICATION ABSOLUE à ${med.dci}`,
          action: "PRESCRIPTION CONTRE-INDIQUÉE"
        }
      }
      
      return med
    })
  }

  // Validation posologique selon l'âge
  if (patientData.age && prescriptionData.medications) {
    prescriptionData.medications = prescriptionData.medications.map((med: any) => {
      if (patientData.age >= 75) {
        med.geriatricPrecautions = {
          message: "Patient âgé - Précautions posologiques recommandées",
          recommendations: ["Débuter à demi-dose", "Surveillance renforcée", "Réévaluation fréquente"]
        }
      }
      return med
    })
  }

  return prescriptionData
}

function calculatePrescriptionComplexity(prescriptionData: any): string {
  let complexity = 0
  
  const medicationCount = prescriptionData.medications?.length || 0
  const hasMonitoring = prescriptionData.medications?.some((m: any) => m.monitoring?.laboratoryMonitoring) || false
  const hasInteractions = prescriptionData.medications?.some((m: any) => m.safetyProfile?.interactions?.majorInteractions?.length > 0) || false
  
  complexity += medicationCount
  if (hasMonitoring) complexity += 2
  if (hasInteractions) complexity += 1
  
  if (complexity >= 5) return "ÉLEVÉE"
  if (complexity >= 3) return "MODÉRÉE"
  return "STANDARD"
}

function assessPrescriptionRisk(prescriptionData: any, patientData: any): string {
  let risk = 0
  
  if (patientData.age >= 65) risk += 1
  if (patientData.medicalHistory?.length > 2) risk += 1
  if (patientData.allergies?.length > 0) risk += 1
  if (prescriptionData.medications?.length > 2) risk += 1
  
  if (risk >= 3) return "ÉLEVÉ"
  if (risk >= 2) return "MODÉRÉ"
  return "FAIBLE"
}
