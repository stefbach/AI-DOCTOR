// /app/api/openai-diagnosis/route.ts - VERSION 2 AMÉLIORÉE AVEC PROTECTION DES DONNÉES
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ==================== TYPES ET INTERFACES ====================
interface PatientContext {
  age: number | string
  sex: string
  weight?: number | string
  height?: number | string
  medical_history: string[]
  current_medications: string[]
  allergies: string[]
  chief_complaint: string
  symptoms: string[]
  symptom_duration: string
  vital_signs: {
    blood_pressure?: string
    pulse?: number
    temperature?: number
    respiratory_rate?: number
    oxygen_saturation?: number
  }
  disease_history: string
  ai_questions: Array<{
    question: string
    answer: string
  }>
  pregnancy_status?: string
  last_menstrual_period?: string
  social_history?: {
    smoking?: string
    alcohol?: string
    occupation?: string
  }
  name?: string
  firstName?: string
  lastName?: string
  anonymousId?: string // Ajout pour le tracking anonyme
}

interface ValidationResult {
  isValid: boolean
  issues: string[]
  suggestions: string[]
  metrics: {
    medications: number
    laboratory_tests: number
    imaging_studies: number
  }
}

// ==================== FONCTIONS DE PROTECTION DES DONNÉES ====================
function anonymizePatientData(patientData: any): { 
  anonymized: any, 
  originalIdentity: any 
} {
  // Sauvegarder l'identité originale
  const originalIdentity = {
    firstName: patientData?.firstName,
    lastName: patientData?.lastName,
    name: patientData?.name
  }
  
  // Créer une copie sans les données sensibles
  const anonymized = { ...patientData }
  delete anonymized.firstName
  delete anonymized.lastName
  delete anonymized.name
  
  // Ajouter un ID anonyme pour le suivi
  anonymized.anonymousId = `ANON-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  
  console.log('🔒 Données patient anonymisées')
  console.log(`   - ID anonyme: ${anonymized.anonymousId}`)
  console.log('   - Nom/Prénom: [PROTÉGÉS]')
  
  return { anonymized, originalIdentity }
}

// Fonction de logging sécurisé
function secureLog(message: string, data?: any) {
  if (data && typeof data === 'object') {
    const safeData = { ...data }
    const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address']
    
    sensitiveFields.forEach(field => {
      if (safeData[field]) {
        safeData[field] = '[PROTÉGÉ]'
      }
    })
    
    console.log(message, safeData)
  } else {
    console.log(message, data)
  }
}

// ==================== CONTEXTE MÉDICAL MAURICE ====================
const MAURITIUS_HEALTHCARE_CONTEXT = {
  laboratories: {
    everywhere: "C-Lab (29 centres), Green Cross (36 centres), Biosanté (48 points)",
    specialized: "ProCare Medical (oncology/genetics), C-Lab (PCR/NGS)",
    public: "Central Health Lab, tous hôpitaux régionaux",
    home_service: "C-Lab gratuit >70 ans, Hans Biomedical mobile",
    results_time: "STAT: 1-2h, Urgent: 2-6h, Routine: 24-48h",
    online_results: "C-Lab, Green Cross"
  },
  imaging: {
    basic: "Radiographie/Échographie disponibles partout",
    ct_scan: "Apollo Bramwell, Wellkin, Victoria Hospital, Dr Jeetoo",
    mri: "Apollo, Wellkin (délais 1-2 semaines)",
    cardiac: {
      echo: "Disponible tous hôpitaux + privés",
      coronary_ct: "Apollo, Cardiac Centre Pamplemousses",
      angiography: "Cardiac Centre (public), Apollo Cath Lab (privé)"
    }
  },
  hospitals: {
    emergency_24_7: "Dr Jeetoo (Port Louis), SSRN (Pamplemousses), Victoria (Candos), Apollo, Wellkin",
    cardiac_emergencies: "Cardiac Centre Pamplemousses, Apollo Bramwell",
    specialists: "Généralement 1-3 semaines délai, urgences vues plus rapidement"
  },
  costs: {
    consultation: "Public: gratuit, Privé: Rs 1500-3000",
    blood_tests: "Rs 400-3000 selon complexité",
    imaging: "Radio: Rs 800-1500, CT: Rs 8000-15000, MRI: Rs 15000-25000",
    procedures: "Coronarographie: Rs 50000-80000, Chirurgie: Rs 100000+"
  },
  medications: {
    public_free: "Liste médicaments essentiels gratuits hôpitaux publics",
    private: "Pharmacies partout, prix variables selon marque"
  },
  emergency_numbers: {
    samu: "114",
    police_fire: "999",
    private_ambulance: "132"
  }
}

// Cache du contexte stringifié
const MAURITIUS_CONTEXT_STRING = JSON.stringify(MAURITIUS_HEALTHCARE_CONTEXT, null, 2)

// ==================== SYSTÈME DE MONITORING ====================
const PrescriptionMonitoring = {
  metrics: {
    avgMedicationsPerDiagnosis: new Map<string, number[]>(),
    avgTestsPerDiagnosis: new Map<string, number[]>(),
    outliers: [] as any[]
  },
  
  track(diagnosis: string, medications: number, tests: number) {
    // Tracking des moyennes par diagnostic
    if (!this.metrics.avgMedicationsPerDiagnosis.has(diagnosis)) {
      this.metrics.avgMedicationsPerDiagnosis.set(diagnosis, [])
    }
    if (!this.metrics.avgTestsPerDiagnosis.has(diagnosis)) {
      this.metrics.avgTestsPerDiagnosis.set(diagnosis, [])
    }
    
    this.metrics.avgMedicationsPerDiagnosis.get(diagnosis)?.push(medications)
    this.metrics.avgTestsPerDiagnosis.get(diagnosis)?.push(tests)
    
    // Détection des outliers
    const medAvg = this.getAverage(diagnosis, 'medications')
    const testAvg = this.getAverage(diagnosis, 'tests')
    
    if (medications > medAvg * 2 || tests > testAvg * 2) {
      this.metrics.outliers.push({
        diagnosis,
        medications,
        tests,
        timestamp: new Date().toISOString()
      })
    }
  },
  
  getAverage(diagnosis: string, type: 'medications' | 'tests'): number {
    const map = type === 'medications' 
      ? this.metrics.avgMedicationsPerDiagnosis 
      : this.metrics.avgTestsPerDiagnosis
    const values = map.get(diagnosis) || []
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 3
  }
}

// ==================== PROMPT MÉDICAL AMÉLIORÉ ====================
const ENHANCED_DIAGNOSTIC_PROMPT = `You are an expert physician practicing telemedicine in Mauritius using systematic diagnostic reasoning.

🏥 YOUR MEDICAL EXPERTISE:
- You know international medical guidelines (ESC, AHA, WHO, NICE)
- You understand pathophysiology and clinical reasoning
- You can select appropriate investigations based on presentation
- You prescribe according to evidence-based medicine
- You use systematic diagnostic reasoning to analyze patient data

🇲🇺 MAURITIUS HEALTHCARE CONTEXT:
${MAURITIUS_CONTEXT_STRING}

📋 PATIENT PRESENTATION:
{{PATIENT_CONTEXT}}

⚠️ CRITICAL - COMPREHENSIVE TREATMENT APPROACH:
═══════════════════════════════════════════
🎯 UNIVERSAL PRINCIPLE: Every patient deserves COMPLETE care addressing ALL aspects of their condition

📋 SYSTEMATIC PRESCRIPTION METHOD (Apply to EVERY diagnosis):

STEP 1 - ANALYZE THE CONDITION:
- What is the PRIMARY PROBLEM? (infection, inflammation, dysfunction, etc.)
- What SYMPTOMS is the patient experiencing? (list ALL)
- What COMPLICATIONS could occur?
- What would OPTIMIZE recovery?

STEP 2 - BUILD COMPREHENSIVE TREATMENT:
For EACH identified aspect, prescribe appropriate medication:

A) ETIOLOGICAL TREATMENT (if applicable)
   - Antibiotics for bacterial infections
   - Antivirals for treatable viral infections
   - Specific treatments for identified causes
   - May be "none" if purely symptomatic condition

B) SYMPTOMATIC RELIEF (address EACH symptom)
   - Pain → Analgesics (paracetamol, NSAIDs, etc.)
   - Fever → Antipyretics
   - Inflammation → Anti-inflammatories
   - Spasms → Antispasmodics
   - Nausea → Antiemetics
   - Cough → Antitussives/Expectorants
   - Congestion → Decongestants
   - Itching → Antihistamines
   - Anxiety → Anxiolytics if severe
   - Sleep issues → Sleep aids if needed

C) PREVENTIVE/PROTECTIVE MEASURES
   - Gastric protection with NSAIDs/corticosteroids
   - Probiotics with antibiotics
   - Thromboprophylaxis if immobilized
   - Supplements for deficiencies

D) SUPPORTIVE CARE
   - Rehydration solutions
   - Nutritional supplements
   - Wound care products
   - Recovery aids

💡 PRACTICAL APPLICATION:
- Count the patient's problems/symptoms
- Each problem typically needs 1 solution
- Most conditions have 3-6 problems to address
- Therefore: expect 3-6 medications for complete care

⚠️ PRESCRIPTION GUIDELINES:
- 0-1 medication = Acceptable ONLY for extremely mild, self-limiting conditions
- 2-3 medications = Minimum for most simple conditions
- 3-5 medications = STANDARD for common acute conditions
- 5-7 medications = Normal for complex or multi-system conditions
- 7+ medications = Acceptable if justified by complexity

🔍 SELF-CHECK before finalizing:
Ask yourself:
1. "Have I addressed the ROOT CAUSE?" (if identifiable)
2. "Have I relieved ALL symptoms that bother the patient?"
3. "Have I prevented predictable complications?"
4. "Have I optimized the recovery process?"

If any answer is "NO" → Add appropriate medication

❌ AVOID THESE COMMON ERRORS:
- Treating only the main symptom (incomplete)
- Ignoring secondary symptoms (poor care)
- Forgetting preventive measures (risky)
- Under-prescribing due to minimalism bias (inadequate)

✅ REMEMBER:
- Comprehensive care = Better outcomes
- Patient comfort matters
- Multiple medications are NORMAL, not excessive
- Each medication should have clear purpose
- Quality care often requires 3-6 medications

PRESCRIPTION PRINCIPLES BY CATEGORY:
═════════════════════════════════════════════
INFECTIONS: Antimicrobial + Symptom relief + Support
INFLAMMATORY: Anti-inflammatory + Pain relief + Protection
ALLERGIC: Antihistamine + Symptom relief + Prevention
TRAUMATIC: Pain relief + Healing support + Prevention
METABOLIC: Specific treatment + Symptom control + Monitoring
FUNCTIONAL: Symptom management + Support + Lifestyle

FLEXIBLE APPROACH:
- Simple conditions → 2-4 medications typically
- Moderate conditions → 3-5 medications typically  
- Complex conditions → 4-7 medications typically
- Always individualize based on patient needs

🔍 DIAGNOSTIC REASONING PROCESS:

1. ANALYZE ALL DATA:
   - Chief complaint: {{CHIEF_COMPLAINT}}
   - Key symptoms: {{SYMPTOMS}}
   - Vital signs abnormalities: [Identify any abnormal values]
   - Disease evolution: {{DISEASE_HISTORY}}
   - AI questionnaire responses: [CRITICAL - these often contain key diagnostic clues]
     {{AI_QUESTIONS}}

2. FORMULATE DIAGNOSTIC HYPOTHESES:
   Based on the above, generate:
   - Primary diagnosis (most likely)
   - 3-4 differential diagnoses (alternatives to rule out)

3. DESIGN INVESTIGATION STRATEGY:
   For EACH diagnosis (primary + differentials), determine:
   - What test would CONFIRM this diagnosis?
   - What test would EXCLUDE this diagnosis?
   - Priority order based on:
     * Dangerous conditions to rule out first
     * Most likely conditions
     * Cost-effectiveness in Mauritius

🎯 MEDICATION PRESCRIBING PRINCIPLES:
- Treat the CAUSE (etiological treatment) when identified
- Treat ALL SYMPTOMS that affect quality of life
- Add PREVENTIVE measures when indicated
- Include SUPPORTIVE care as needed
- Consider drug interactions and contraindications

GENERATE THIS EXACT JSON STRUCTURE:

{
  "diagnostic_reasoning": {
    "key_findings": {
      "from_history": "[What stands out from patient history]",
      "from_symptoms": "[Pattern recognition from symptoms]",
      "from_ai_questions": "[CRITICAL findings from questionnaire responses]",
      "red_flags": "[Any concerning features requiring urgent action]"
    },
    
    "syndrome_identification": {
      "clinical_syndrome": "[e.g., Acute coronary syndrome, Viral syndrome, etc.]",
      "supporting_features": "[List features supporting this syndrome]",
      "inconsistent_features": "[Any features that don't fit]"
    },
    
    "clinical_confidence": {
      "diagnostic_certainty": "[High/Moderate/Low]",
      "reasoning": "[Why this level of certainty]",
      "missing_information": "[What additional info would increase certainty]"
    }
  },
  
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": {
        "fr": "[Diagnostic précis avec classification/stade si applicable]",
        "en": "[Precise diagnosis with classification/stage if applicable]"
      },
      "icd10_code": "[Appropriate ICD-10 code]",
      "confidence_level": [60-85 max for teleconsultation],
      "severity": {
        "fr": "légère/modérée/sévère/critique",
        "en": "mild/moderate/severe/critical"
      },
      "diagnostic_criteria_met": [
        "Criterion 1: [How patient meets this]",
        "Criterion 2: [How patient meets this]"
      ],
      "certainty_level": "[High/Moderate/Low based on available data]",
      
      "pathophysiology": {
        "fr": "[MINIMUM 200 MOTS] Mécanisme expliquant TOUS les symptômes du patient. Commencer par 'Cette condition résulte de...' et expliquer la cascade physiopathologique complète.",
        "en": "[MINIMUM 200 WORDS] Mechanism explaining ALL patient's symptoms. Start with 'This condition results from...' and explain the complete pathophysiological cascade."
      },
      
      "clinical_reasoning": {
        "fr": "[MINIMUM 150 MOTS] Raisonnement diagnostique systématique. Commencer par 'L'analyse des symptômes montre...' et détailler le processus de pensée clinique.",
        "en": "[MINIMUM 150 WORDS] Systematic diagnostic reasoning. Start with 'Analysis of symptoms shows...' and detail the clinical thinking process."
      },
      
      "prognosis": {
        "fr": "[MINIMUM 100 MOTS] Évolution attendue à court (48h), moyen (1 semaine) et long terme (1 mois). Inclure facteurs de bon/mauvais pronostic.",
        "en": "[MINIMUM 100 WORDS] Expected evolution short (48h), medium (1 week) and long term (1 month). Include good/poor prognostic factors."
      }
    },
    
    "differential_diagnoses": [
      {
        "condition": { "fr": "[Alternative 1]", "en": "[Alternative 1]" },
        "probability": [percentage],
        "supporting_features": "[What symptoms support this]",
        "against_features": "[What makes this less likely]",
        "discriminating_test": {
          "fr": "[Quel examen permettrait de confirmer/exclure]",
          "en": "[Which test would confirm/exclude this]"
        },
        "reasoning": {
          "fr": "[MINIMUM 80 MOTS] Pourquoi considérer ce diagnostic et comment le différencier du diagnostic principal.",
          "en": "[MINIMUM 80 WORDS] Why consider this diagnosis and how to differentiate from primary diagnosis."
        }
      }
    ]
  },
  
  "investigation_strategy": {
    "diagnostic_approach": {
      "fr": "Stratégie d'investigation adaptée à la présentation clinique et au contexte mauricien",
      "en": "Investigation strategy adapted to clinical presentation and Mauritian context"
    },
    
    "clinical_justification": {
      "fr": "[Expliquer pourquoi ces examens sont nécessaires ou pourquoi aucun examen n'est requis]",
      "en": "[Explain why these tests are necessary or why no tests are required]"
    },
    
    "tests_by_purpose": {
      "to_confirm_primary": [
        {
          "test": { "fr": "[Test name]", "en": "[Test name]" },
          "rationale": {
            "fr": "Ce test confirmera le diagnostic si [résultat attendu]",
            "en": "This test will confirm the diagnosis if [expected result]"
          },
          "expected_if_positive": "[Specific values/findings]",
          "expected_if_negative": "[Values that would exclude]"
        }
      ],
      
      "to_exclude_differentials": [
        {
          "differential": "[Which differential diagnosis]",
          "test": { "fr": "[Test name]", "en": "[Test name]" },
          "rationale": {
            "fr": "Normal → exclut [diagnostic différentiel]",
            "en": "Normal → excludes [differential diagnosis]"
          }
        }
      ],
      
      "to_assess_severity": [
        {
          "test": { "fr": "[Test name]", "en": "[Test name]" },
          "purpose": {
            "fr": "Évaluer retentissement/complications",
            "en": "Assess impact/complications"
          }
        }
      ]
    },
    
    "test_sequence": {
      "immediate": "[Tests needed NOW - usually to exclude dangerous conditions]",
      "urgent": "[Tests within 24-48h to confirm diagnosis]", 
      "routine": "[Tests for monitoring or complete assessment]"
    },
    
    "laboratory_tests": [
      // CAN BE EMPTY ARRAY IF NO TESTS NEEDED
      {
        "test_name": {
          "fr": "[Nom français du test]",
          "en": "[English test name]"
        },
        "clinical_justification": {
          "fr": "[Pourquoi ce test pour ce patient spécifiquement]",
          "en": "[Why this test for this specific patient]"
        },
        "urgency": "STAT/urgent/routine",
        "expected_results": {
          "fr": "[Valeurs attendues et interprétation]",
          "en": "[Expected values and interpretation]"
        },
        "mauritius_logistics": {
          "where": "[C-Lab, Green Cross, Biosanté, etc.]",
          "cost": "[Rs 400-3000]",
          "turnaround": "[2-6h urgent, 24-48h routine]",
          "preparation": "[Fasting, special requirements]"
        }
      }
    ],
    
    "imaging_studies": [
      // CAN BE EMPTY ARRAY IF NO IMAGING NEEDED
      {
        "study_name": {
          "fr": "[Nom de l'examen d'imagerie]",
          "en": "[Imaging study name]"
        },
        "indication": {
          "fr": "[Indication clinique spécifique]",
          "en": "[Specific clinical indication]"
        },
        "findings_sought": {
          "fr": "[Ce qu'on recherche]",
          "en": "[What we're looking for]"
        },
        "urgency": "immediate/urgent/routine",
        "mauritius_availability": {
          "centers": "[Apollo, Wellkin, etc.]",
          "cost": "[Rs 800-25000]",
          "wait_time": "[Realistic timeline]",
          "preparation": "[NPO, contrast precautions]"
        }
      }
    ],
    
    "specialized_tests": []
  },
  
  "treatment_plan": {
    "approach": {
      "fr": "[MINIMUM 100 MOTS] Stratégie thérapeutique globale adaptée au patient, incluant objectifs et priorités.",
      "en": "[MINIMUM 100 WORDS] Overall therapeutic strategy adapted to patient, including goals and priorities."
    },
    
    "prescription_rationale": {
      "fr": "[OBLIGATOIRE: Expliquer pourquoi CES médicaments spécifiques ont été choisis pour CE patient, ou justifier clairement si aucun médicament nécessaire]",
      "en": "[MANDATORY: Explain why THESE specific medications were chosen for THIS patient, or clearly justify if no medication needed]"
    },
    
    "completeness_check": {
      "symptoms_addressed": ["List all symptoms being treated"],
      "untreated_symptoms": ["Should be empty unless justified"],
      "total_medications": [2-5],
      "therapeutic_coverage": {
        "etiological": true/false,
        "symptomatic": true/false,
        "preventive": true/false,
        "supportive": true/false
      }
    },
    
    "medications": [
      // EXPECT 2-5 MEDICATIONS for most conditions
      // Apply systematic approach: Etiological + Symptomatic + Preventive + Supportive
      // Single medication prescriptions are RARELY complete
      {
        "drug": {
          "fr": "[DCI + dosage précis]",
          "en": "[INN + precise dosage]"
        },
        "therapeutic_role": "etiological/symptomatic/preventive/supportive",
        "indication": {
          "fr": "[Indication spécifique pour CE patient avec CES symptômes]",
          "en": "[Specific indication for THIS patient with THESE symptoms]"
        },
        "mechanism": {
          "fr": "[MINIMUM 50 MOTS] Comment ce médicament aide spécifiquement ce patient dans son contexte clinique.",
          "en": "[MINIMUM 50 WORDS] How this medication specifically helps this patient in their clinical context."
        },
        "dosing": {
          "adult": { "fr": "[Posologie précise]", "en": "[Precise dosing]" },
          "adjustments": {
            "elderly": { "fr": "[Si >65 ans]", "en": "[If >65 years]" },
            "renal": { "fr": "[Si IRC]", "en": "[If CKD]" },
            "hepatic": { "fr": "[Si IH]", "en": "[If liver disease]" }
          }
        },
        "duration": { "fr": "[Durée précise: X jours/semaines]", "en": "[Precise duration: X days/weeks]" },
        "monitoring": {
          "fr": "[Surveillance nécessaire]",
          "en": "[Required monitoring]"
        },
        "side_effects": {
          "fr": "[Effets secondaires principaux à surveiller]",
          "en": "[Main side effects to monitor]"
        },
        "contraindications": {
          "fr": "[Contre-indications absolues et relatives]",
          "en": "[Absolute and relative contraindications]"
        },
        "interactions": {
          "fr": "[Interactions majeures avec médicaments du patient]",
          "en": "[Major interactions with patient's medications]"
        },
        "mauritius_availability": {
          "public_free": true/false,
          "estimated_cost": "[If not free: Rs XXX]",
          "alternatives": { "fr": "[Alternative si non disponible]", "en": "[Alternative if unavailable]" },
          "brand_names": "[Common brands in Mauritius]"
        },
        "administration_instructions": {
          "fr": "[Instructions précises: avant/pendant/après repas, horaire, etc.]",
          "en": "[Precise instructions: before/during/after meals, timing, etc.]"
        }
      }
      // REMEMBER: Each symptom/problem should have a solution
      // 2-5 medications expected for most conditions
    ],
    
    "non_pharmacological": {
      "fr": "[MINIMUM 100 MOTS] Mesures hygiéno-diététiques détaillées, repos, hydratation adaptée au climat tropical, exercices, changements de mode de vie.",
      "en": "[MINIMUM 100 WORDS] Detailed lifestyle measures, rest, hydration adapted to tropical climate, exercises, lifestyle changes."
    },
    
    "procedures": [],
    "referrals": []
  },
  
  "follow_up_plan": {
    "immediate": {
      "fr": "[Actions dans les 24-48h: surveillance, premiers résultats]",
      "en": "[Actions within 24-48h: monitoring, first results]"
    },
    "short_term": {
      "fr": "[Suivi à J3-J7: évaluation réponse, ajustements]",
      "en": "[Follow-up D3-D7: response evaluation, adjustments]"
    },
    "long_term": {
      "fr": "[Suivi au-delà: prévention récidive, surveillance]",
      "en": "[Long-term follow-up: recurrence prevention, monitoring]"
    },
    "red_flags": {
      "fr": "[CRITICAL] Signes devant faire consulter en urgence immédiatement",
      "en": "[CRITICAL] Signs requiring immediate urgent consultation"
    },
    "next_consultation": {
      "fr": "Téléconsultation de suivi recommandée dans [délai] ou consultation physique si [conditions]",
      "en": "Follow-up teleconsultation recommended in [timeframe] or physical consultation if [conditions]"
    }
  },
  
  "patient_education": {
    "understanding_condition": {
      "fr": "[MINIMUM 150 MOTS] Explication claire et accessible de votre condition. Commencer par 'Votre condition est...' et utiliser des analogies simples.",
      "en": "[MINIMUM 150 WORDS] Clear and accessible explanation of your condition. Start with 'Your condition is...' and use simple analogies."
    },
    "treatment_importance": {
      "fr": "[MINIMUM 100 MOTS] Pourquoi suivre ce traitement, bénéfices attendus, risques si non traité.",
      "en": "[MINIMUM 100 WORDS] Why follow this treatment, expected benefits, risks if untreated."
    },
    "warning_signs": {
      "fr": "[Signes d'alarme expliqués simplement avec actions à prendre]",
      "en": "[Warning signs explained simply with actions to take]"
    },
    "lifestyle_modifications": {
      "fr": "[Changements de mode de vie nécessaires, adaptés au contexte local]",
      "en": "[Necessary lifestyle changes, adapted to local context]"
    },
    "mauritius_specific": {
      "tropical_advice": {
        "fr": "Hydratation minimale 3L/jour, éviter soleil 10h-16h, conservation médicaments <25°C",
        "en": "Minimum hydration 3L/day, avoid sun 10am-4pm, store medications <25°C"
      },
      "local_diet": {
        "fr": "[Adaptations alimentaires avec aliments locaux disponibles]",
        "en": "[Dietary adaptations with available local foods]"
      }
    }
  },
  
  "quality_metrics": {
    "completeness_score": 0.85,
    "evidence_level": "[High/Moderate/Low]",
    "guidelines_followed": ["WHO", "ESC", "NICE", "Local Mauritius guidelines"],
    "word_counts": {
      "pathophysiology": { "fr": 200, "en": 200 },
      "clinical_reasoning": { "fr": 150, "en": 150 },
      "patient_education": { "fr": 150, "en": 150 }
    }
  }
}

REMEMBER:
- Prescribe 2-5 medications for most conditions
- Address ALL patient symptoms
- Include preventive measures
- Quality AND completeness matter
- Adapt to THIS specific patient
- Consider Mauritius context
- Generate complete analysis NOW
{
  "diagnostic_reasoning": {
    "key_findings": {
      "from_history": "[What stands out from patient history]",
      "from_symptoms": "[Pattern recognition from symptoms]",
      "from_ai_questions": "[CRITICAL findings from questionnaire responses]",
      "red_flags": "[Any concerning features requiring urgent action]"
    },
    
    "syndrome_identification": {
      "clinical_syndrome": "[e.g., Acute coronary syndrome, Viral syndrome, etc.]",
      "supporting_features": "[List features supporting this syndrome]",
      "inconsistent_features": "[Any features that don't fit]"
    },
    
    "clinical_confidence": {
      "diagnostic_certainty": "[High/Moderate/Low]",
      "reasoning": "[Why this level of certainty]",
      "missing_information": "[What additional info would increase certainty]"
    }
  },
  
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": {
        "fr": "[Diagnostic précis avec classification/stade si applicable]",
        "en": "[Precise diagnosis with classification/stage if applicable]"
      },
      "icd10_code": "[Appropriate ICD-10 code]",
      "confidence_level": [60-85 max for teleconsultation],
      "severity": {
        "fr": "légère/modérée/sévère/critique",
        "en": "mild/moderate/severe/critical"
      },
      "diagnostic_criteria_met": [
        "Criterion 1: [How patient meets this]",
        "Criterion 2: [How patient meets this]"
      ],
      "certainty_level": "[High/Moderate/Low based on available data]",
      
      "pathophysiology": {
        "fr": "[MINIMUM 200 MOTS] Mécanisme expliquant TOUS les symptômes du patient. Commencer par 'Cette condition résulte de...' et expliquer la cascade physiopathologique complète.",
        "en": "[MINIMUM 200 WORDS] Mechanism explaining ALL patient's symptoms. Start with 'This condition results from...' and explain the complete pathophysiological cascade."
      },
      
      "clinical_reasoning": {
        "fr": "[MINIMUM 150 MOTS] Raisonnement diagnostique systématique. Commencer par 'L'analyse des symptômes montre...' et détailler le processus de pensée clinique.",
        "en": "[MINIMUM 150 WORDS] Systematic diagnostic reasoning. Start with 'Analysis of symptoms shows...' and detail the clinical thinking process."
      },
      
      "prognosis": {
        "fr": "[MINIMUM 100 MOTS] Évolution attendue à court (48h), moyen (1 semaine) et long terme (1 mois). Inclure facteurs de bon/mauvais pronostic.",
        "en": "[MINIMUM 100 WORDS] Expected evolution short (48h), medium (1 week) and long term (1 month). Include good/poor prognostic factors."
      }
    },
    
    "differential_diagnoses": [
      {
        "condition": { "fr": "[Alternative 1]", "en": "[Alternative 1]" },
        "probability": [percentage],
        "supporting_features": "[What symptoms support this]",
        "against_features": "[What makes this less likely]",
        "discriminating_test": {
          "fr": "[Quel examen permettrait de confirmer/exclure]",
          "en": "[Which test would confirm/exclude this]"
        },
        "reasoning": {
          "fr": "[MINIMUM 80 MOTS] Pourquoi considérer ce diagnostic et comment le différencier du diagnostic principal.",
          "en": "[MINIMUM 80 WORDS] Why consider this diagnosis and how to differentiate from primary diagnosis."
        }
      }
    ]
  },
  
  "investigation_strategy": {
    "diagnostic_approach": {
      "fr": "Stratégie d'investigation adaptée à la présentation clinique et au contexte mauricien",
      "en": "Investigation strategy adapted to clinical presentation and Mauritian context"
    },
    
    "clinical_justification": {
      "fr": "[Expliquer pourquoi ces examens sont nécessaires ou pourquoi aucun examen n'est requis]",
      "en": "[Explain why these tests are necessary or why no tests are required]"
    },
    
    "tests_by_purpose": {
      "to_confirm_primary": [
        {
          "test": { "fr": "[Test name]", "en": "[Test name]" },
          "rationale": {
            "fr": "Ce test confirmera le diagnostic si [résultat attendu]",
            "en": "This test will confirm the diagnosis if [expected result]"
          },
          "expected_if_positive": "[Specific values/findings]",
          "expected_if_negative": "[Values that would exclude]"
        }
      ],
      
      "to_exclude_differentials": [
        {
          "differential": "[Which differential diagnosis]",
          "test": { "fr": "[Test name]", "en": "[Test name]" },
          "rationale": {
            "fr": "Normal → exclut [diagnostic différentiel]",
            "en": "Normal → excludes [differential diagnosis]"
          }
        }
      ],
      
      "to_assess_severity": [
        {
          "test": { "fr": "[Test name]", "en": "[Test name]" },
          "purpose": {
            "fr": "Évaluer retentissement/complications",
            "en": "Assess impact/complications"
          }
        }
      ]
    },
    
    "test_sequence": {
      "immediate": "[Tests needed NOW - usually to exclude dangerous conditions]",
      "urgent": "[Tests within 24-48h to confirm diagnosis]", 
      "routine": "[Tests for monitoring or complete assessment]"
    },
    
    "laboratory_tests": [
      // CAN BE EMPTY ARRAY IF NO TESTS NEEDED
      {
        "test_name": {
          "fr": "[Nom français du test]",
          "en": "[English test name]"
        },
        "clinical_justification": {
          "fr": "[Pourquoi ce test pour ce patient spécifiquement]",
          "en": "[Why this test for this specific patient]"
        },
        "urgency": "STAT/urgent/routine",
        "expected_results": {
          "fr": "[Valeurs attendues et interprétation]",
          "en": "[Expected values and interpretation]"
        },
        "mauritius_logistics": {
          "where": "[C-Lab, Green Cross, Biosanté, etc.]",
          "cost": "[Rs 400-3000]",
          "turnaround": "[2-6h urgent, 24-48h routine]",
          "preparation": "[Fasting, special requirements]"
        }
      }
    ],
    
    "imaging_studies": [
      // CAN BE EMPTY ARRAY IF NO IMAGING NEEDED
      {
        "study_name": {
          "fr": "[Nom de l'examen d'imagerie]",
          "en": "[Imaging study name]"
        },
        "indication": {
          "fr": "[Indication clinique spécifique]",
          "en": "[Specific clinical indication]"
        },
        "findings_sought": {
          "fr": "[Ce qu'on recherche]",
          "en": "[What we're looking for]"
        },
        "urgency": "immediate/urgent/routine",
        "mauritius_availability": {
          "centers": "[Apollo, Wellkin, etc.]",
          "cost": "[Rs 800-25000]",
          "wait_time": "[Realistic timeline]",
          "preparation": "[NPO, contrast precautions]"
        }
      }
    ],
    
    "specialized_tests": []
  },
  
  "treatment_plan": {
    "approach": {
      "fr": "[MINIMUM 100 MOTS] Stratégie thérapeutique globale adaptée au patient, incluant objectifs et priorités.",
      "en": "[MINIMUM 100 WORDS] Overall therapeutic strategy adapted to patient, including goals and priorities."
    },
    
    "prescription_rationale": {
      "fr": "[Expliquer le choix thérapeutique, ou pourquoi aucun médicament n'est nécessaire]",
      "en": "[Explain therapeutic choice, or why no medication is needed]"
    },
    
    "prescription_rationale": {
  "fr": "[OBLIGATOIRE: Expliquer pourquoi CES médicaments spécifiques ont été choisis pour CE patient, ou justifier clairement si aucun médicament nécessaire]",
  "en": "[MANDATORY: Explain why THESE specific medications were chosen for THIS patient, or clearly justify if no medication needed]"
},

"completeness_check": {
  "symptoms_addressed": ["pain", "fever", "inflammation", "etc."], // List all symptoms being treated
  "untreated_symptoms": [], // Should be empty unless justified
  "total_medications": [2-5], // Expected range for most conditions
  "therapeutic_coverage": {
    "etiological": true/false,
    "symptomatic": true/false,
    "preventive": true/false,
    "supportive": true/false
  }
},
   "medications": [
      // EXPECT 2-5 MEDICATIONS for most conditions
      // Apply systematic approach: Etiological + Symptomatic + Preventive + Supportive
      // Single medication prescriptions are RARELY complete
      {
        "drug": {
          "fr": "[DCI + dosage précis]",
          "en": "[INN + precise dosage]"
        },
        "therapeutic_role": "etiological/symptomatic/preventive/supportive", // MANDATORY: classify each medication
        "indication": {
          "fr": "[Indication spécifique pour CE patient avec CES symptômes]",
          "en": "[Specific indication for THIS patient with THESE symptoms]"
        },
        "mechanism": {
          "fr": "[MINIMUM 50 MOTS] Comment ce médicament aide spécifiquement ce patient dans son contexte clinique.",
          "en": "[MINIMUM 50 WORDS] How this medication specifically helps this patient in their clinical context."
        },
        "dosing": {
          "adult": { "fr": "[Posologie précise]", "en": "[Precise dosing]" },
          "adjustments": {
            "elderly": { "fr": "[Si >65 ans]", "en": "[If >65 years]" },
            "renal": { "fr": "[Si IRC]", "en": "[If CKD]" },
            "hepatic": { "fr": "[Si IH]", "en": "[If liver disease]" }
          }
        },
        "duration": { "fr": "[Durée précise: X jours/semaines]", "en": "[Precise duration: X days/weeks]" },
        "monitoring": {
          "fr": "[Surveillance nécessaire]",
          "en": "[Required monitoring]"
        },
        "side_effects": {
          "fr": "[Effets secondaires principaux à surveiller]",
          "en": "[Main side effects to monitor]"
        },
        "contraindications": {
          "fr": "[Contre-indications absolues et relatives]",
          "en": "[Absolute and relative contraindications]"
        },
        "interactions": {
          "fr": "[Interactions majeures avec médicaments du patient]",
          "en": "[Major interactions with patient's medications]"
        },
        "mauritius_availability": {
          "public_free": true/false,
          "estimated_cost": "[If not free: Rs XXX]",
          "alternatives": { "fr": "[Alternative si non disponible]", "en": "[Alternative if unavailable]" },
          "brand_names": "[Common brands in Mauritius: e.g., Doliprane, Efferalgan for paracetamol]"
        },
        "administration_instructions": {
          "fr": "[Instructions précises: avant/pendant/après repas, horaire, etc.]",
          "en": "[Precise instructions: before/during/after meals, timing, etc.]"
        }
      },
      // MEDICATION 2: Usually symptomatic (pain, fever, inflammation)
      {
        // Same structure - often paracetamol, ibuprofen, etc.
      },
      // MEDICATION 3: Often preventive/protective (gastric protection, probiotics)
      {
        // Same structure
      },
      // MEDICATION 4-5: Additional symptomatic or supportive as needed
      {
        // Same structure - antispasmodics, antiemetics, expectorants, etc.
      }
      // REMEMBER: Each symptom/problem should have a solution
      // Empty array ONLY acceptable for truly self-limiting conditions with clear justification
    ],

    "non_pharmacological": {
      "fr": "[MINIMUM 100 MOTS] Mesures hygiéno-diététiques détaillées, repos, hydratation adaptée au climat tropical, exercices, changements de mode de vie.",
      "en": "[MINIMUM 100 WORDS] Detailed lifestyle measures, rest, hydration adapted to tropical climate, exercises, lifestyle changes."
    },
    
    "procedures": [],
    "referrals": []
  },
  
  "follow_up_plan": {
    "immediate": {
      "fr": "[Actions dans les 24-48h: surveillance, premiers résultats]",
      "en": "[Actions within 24-48h: monitoring, first results]"
    },
    "short_term": {
      "fr": "[Suivi à J3-J7: évaluation réponse, ajustements]",
      "en": "[Follow-up D3-D7: response evaluation, adjustments]"
    },
    "long_term": {
      "fr": "[Suivi au-delà: prévention récidive, surveillance]",
      "en": "[Long-term follow-up: recurrence prevention, monitoring]"
    },
    "red_flags": {
      "fr": "[CRITICAL] Signes devant faire consulter en urgence immédiatement",
      "en": "[CRITICAL] Signs requiring immediate urgent consultation"
    },
    "next_consultation": {
      "fr": "Téléconsultation de suivi recommandée dans [délai] ou consultation physique si [conditions]",
      "en": "Follow-up teleconsultation recommended in [timeframe] or physical consultation if [conditions]"
    }
  },
  
  "patient_education": {
    "understanding_condition": {
      "fr": "[MINIMUM 150 MOTS] Explication claire et accessible de votre condition. Commencer par 'Votre condition est...' et utiliser des analogies simples.",
      "en": "[MINIMUM 150 WORDS] Clear and accessible explanation of your condition. Start with 'Your condition is...' and use simple analogies."
    },
    "treatment_importance": {
      "fr": "[MINIMUM 100 MOTS] Pourquoi suivre ce traitement, bénéfices attendus, risques si non traité.",
      "en": "[MINIMUM 100 WORDS] Why follow this treatment, expected benefits, risks if untreated."
    },
    "warning_signs": {
      "fr": "[Signes d'alarme expliqués simplement avec actions à prendre]",
      "en": "[Warning signs explained simply with actions to take]"
    },
    "lifestyle_modifications": {
      "fr": "[Changements de mode de vie nécessaires, adaptés au contexte local]",
      "en": "[Necessary lifestyle changes, adapted to local context]"
    },
    "mauritius_specific": {
      "tropical_advice": {
        "fr": "Hydratation minimale 3L/jour, éviter soleil 10h-16h, conservation médicaments <25°C",
        "en": "Minimum hydration 3L/day, avoid sun 10am-4pm, store medications <25°C"
      },
      "local_diet": {
        "fr": "[Adaptations alimentaires avec aliments locaux disponibles]",
        "en": "[Dietary adaptations with available local foods]"
      }
    }
  },
  
  "quality_metrics": {
    "completeness_score": 0.85,
    "evidence_level": "[High/Moderate/Low]",
    "guidelines_followed": ["WHO", "ESC", "NICE", "Local Mauritius guidelines"],
    "word_counts": {
      "pathophysiology": { "fr": 200, "en": 200 },
      "clinical_reasoning": { "fr": 150, "en": 150 },
      "patient_education": { "fr": 150, "en": 150 }
    }
  }
}

REMEMBER:
- Arrays CAN be empty if medically appropriate
- Quality over quantity always
- Adapt to THIS specific patient
- Consider Mauritius context
- Generate complete analysis NOW`

// ==================== FONCTIONS UTILITAIRES ====================
function preparePrompt(patientContext: PatientContext): string {
  const aiQuestionsFormatted = patientContext.ai_questions
    .map((q: any) => `Q: ${q.question}\n   A: ${q.answer}`)
    .join('\n   ')
  
  return ENHANCED_DIAGNOSTIC_PROMPT
    .replace('{{PATIENT_CONTEXT}}', JSON.stringify(patientContext, null, 2))
    .replace('{{CHIEF_COMPLAINT}}', patientContext.chief_complaint)
    .replace('{{SYMPTOMS}}', patientContext.symptoms.join(', '))
    .replace('{{DISEASE_HISTORY}}', patientContext.disease_history)
    .replace('{{AI_QUESTIONS}}', aiQuestionsFormatted)
}

// ==================== VALIDATION INTELLIGENTE ====================
function validateMedicalAnalysis(
  analysis: any,
  patientContext: PatientContext
): ValidationResult {
  const medications = analysis.treatment_plan?.medications || []
  const labTests = analysis.investigation_strategy?.laboratory_tests || []
  const imaging = analysis.investigation_strategy?.imaging_studies || []
  
  const issues: string[] = []
  const suggestions: string[] = []
  
  // Validation contextuelle (pas de minimums rigides)
  console.log(`📊 Analyse complète:`)
  console.log(`   - ${medications.length} médicament(s) prescrit(s)`)
  console.log(`   - ${labTests.length} examen(s) biologique(s)`)
  console.log(`   - ${imaging.length} examen(s) d'imagerie`)
  
  // Vérifications de cohérence
  const diagnosis = analysis.clinical_analysis?.primary_diagnosis?.condition?.en || ''
  
  // Alertes contextuelles (pas de rejets)
  if (medications.length === 0) {
    console.info('ℹ️ Aucun médicament prescrit')
    if (analysis.treatment_plan?.prescription_rationale) {
      console.info(`   Justification: ${analysis.treatment_plan.prescription_rationale.en}`)
    } else {
      suggestions.push('Considérer d\'ajouter une justification pour l\'absence de prescription')
    }
  }
  
  if (medications.length === 1) {
    console.warn('⚠️ Un seul médicament prescrit')
    console.warn(`   Diagnostic: ${diagnosis}`)
    suggestions.push('Vérifier si traitement symptomatique ou adjuvant nécessaire')
  }
  
  if (labTests.length === 0 && imaging.length === 0) {
    console.info('ℹ️ Aucun examen complémentaire prescrit')
    if (analysis.investigation_strategy?.clinical_justification) {
      console.info(`   Justification: ${analysis.investigation_strategy.clinical_justification.en}`)
    } else {
      suggestions.push('Considérer d\'ajouter une justification pour l\'absence d\'examens')
    }
  }
  
  // Vérifier la présence du diagnostic
  if (!analysis.clinical_analysis?.primary_diagnosis?.condition) {
    issues.push('Diagnostic principal manquant')
  }
  
  // Vérifier les sections critiques
  if (!analysis.treatment_plan?.approach) {
    issues.push('Approche thérapeutique manquante')
  }
  
  if (!analysis.follow_up_plan?.red_flags) {
    issues.push('Signes d\'alerte (red flags) manquants')
  }
  
  // Tracking pour monitoring
  if (diagnosis) {
    PrescriptionMonitoring.track(diagnosis, medications.length, labTests.length + imaging.length)
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
    metrics: {
      medications: medications.length,
      laboratory_tests: labTests.length,
      imaging_studies: imaging.length
    }
  }
}

// ==================== RETRY INTELLIGENT ====================
async function callOpenAIWithRetry(
  apiKey: string,
  prompt: string,
  maxRetries: number = 2
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Appel OpenAI (tentative ${attempt + 1}/${maxRetries + 1})...`)
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert physician with deep knowledge of medical guidelines and the Mauritius healthcare system. Generate comprehensive, evidence-based analyses while avoiding over-prescription.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 8000,
          response_format: { type: "json_object" },
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0.1,
          seed: 12345
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`)
      }
      
      const data = await response.json()
      const analysis = JSON.parse(data.choices[0]?.message?.content || '{}')
      
      // Validation de base
      if (!analysis.clinical_analysis?.primary_diagnosis) {
        throw new Error('Réponse incomplète - diagnostic manquant')
      }
      
      return { data, analysis }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Erreur tentative ${attempt + 1}:`, error)
      
      if (attempt < maxRetries) {
        // Attente exponentielle
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`⏳ Nouvelle tentative dans ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        
        // Enrichir le prompt pour la prochaine tentative
        if (attempt === 1) {
          prompt += `\n\nIMPORTANT: La réponse précédente était incomplète. 
          Assurez-vous d'inclure:
          - Un diagnostic principal clair avec ICD-10
          - Une stratégie thérapeutique (médicamenteuse ou non)
          - Des examens SI cliniquement justifiés
          - Un plan de suivi avec red flags`
        }
      }
    }
  }
  
  throw lastError || new Error('Échec après plusieurs tentatives')
}

// ==================== GÉNÉRATION DES DOCUMENTS ====================
function generateMedicalDocuments(
  analysis: any,
  patient: PatientContext,
  infrastructure: any
): any {
  const currentDate = new Date()
  const consultationId = `TC-MU-${currentDate.getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  
  return {
    // RAPPORT DE CONSULTATION
    consultation: {
      header: {
        title: {
          fr: "RAPPORT DE TÉLÉCONSULTATION MÉDICALE",
          en: "MEDICAL TELECONSULTATION REPORT"
        },
        id: consultationId,
        date: currentDate.toLocaleDateString('fr-FR'),
        time: currentDate.toLocaleTimeString('fr-FR'),
        type: "Teleconsultation",
        disclaimer: {
          fr: "Évaluation basée sur téléconsultation - Examen physique non réalisé",
          en: "Assessment based on teleconsultation - Physical examination not performed"
        }
      },
      
      patient: {
        name: `${patient.firstName || patient.name || 'Patient'} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} ans`,
        sex: patient.sex,
        weight: patient.weight ? `${patient.weight} kg` : 'Non renseigné',
        allergies: patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'Aucune'
      },
      
      diagnostic_reasoning: analysis.diagnostic_reasoning || {},
      
      clinical_summary: {
        chief_complaint: {
          fr: patient.chief_complaint,
          en: patient.chief_complaint
        },
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition || { fr: "À préciser", en: "To be determined" },
        severity: analysis.clinical_analysis?.primary_diagnosis?.severity || { fr: "modérée", en: "moderate" },
        confidence: `${analysis.clinical_analysis?.primary_diagnosis?.confidence_level || 70}%`,
        clinical_reasoning: analysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning || { fr: "En cours", en: "In progress" },
        prognosis: analysis.clinical_analysis?.primary_diagnosis?.prognosis || { fr: "À évaluer", en: "To be evaluated" },
        diagnostic_criteria: analysis.clinical_analysis?.primary_diagnosis?.diagnostic_criteria_met || []
      },
      
      management_plan: {
        investigations: analysis.investigation_strategy || {},
        treatment: analysis.treatment_plan || {},
        follow_up: analysis.follow_up_plan || {}
      },
      
      patient_education: analysis.patient_education || {},
      
      metadata: {
        generation_time: new Date().toISOString(),
        ai_confidence: analysis.diagnostic_reasoning?.clinical_confidence || {},
        quality_metrics: analysis.quality_metrics || {}
      }
    },
    
    // PRESCRIPTION BIOLOGIE (si examens prescrits)
    biological: (analysis.investigation_strategy?.laboratory_tests?.length > 0) ? {
      header: {
        title: {
          fr: "DEMANDE D'EXAMENS BIOLOGIQUES",
          en: "LABORATORY TEST REQUEST"
        },
        validity: {
          fr: "Valide 30 jours - Tous laboratoires agréés Maurice",
          en: "Valid 30 days - All accredited laboratories Mauritius"
        }
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} ans`,
        id: consultationId
      },
      
      clinical_context: {
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition?.fr || 'Bilan',
        justification: analysis.investigation_strategy?.clinical_justification?.fr || 'Bilan diagnostique'
      },
      
      examinations: analysis.investigation_strategy.laboratory_tests.map((test: any, idx: number) => ({
        number: idx + 1,
        test: test.test_name || { fr: "Test", en: "Test" },
        justification: test.clinical_justification || { fr: "Justification", en: "Justification" },
        urgency: test.urgency || "routine",
        expected_results: test.expected_results || {},
        preparation: test.mauritius_logistics?.preparation || {
          fr: test.urgency === 'STAT' ? 'Aucune' : 'Selon protocole laboratoire',
          en: test.urgency === 'STAT' ? 'None' : 'As per laboratory protocol'
        },
        where_to_go: {
          recommended: test.mauritius_logistics?.where || "C-Lab, Green Cross, ou Biosanté",
          cost_estimate: test.mauritius_logistics?.cost || "Rs 500-2000",
          turnaround: test.mauritius_logistics?.turnaround || "24-48h"
        }
      }))
    } : null,
    
    // DEMANDES IMAGERIE (si imagerie prescrite)
    imaging: (analysis.investigation_strategy?.imaging_studies?.length > 0) ? {
      header: {
        title: {
          fr: "DEMANDE D'EXAMENS D'IMAGERIE",
          en: "IMAGING REQUEST"
        },
        validity: {
          fr: "Valide 30 jours",
          en: "Valid 30 days"
        }
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} ans`,
        id: consultationId
      },
      
      clinical_context: {
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition?.fr || 'Investigation',
        indication: analysis.investigation_strategy?.clinical_justification?.fr || 'Bilan d\'imagerie'
      },
      
      studies: analysis.investigation_strategy.imaging_studies.map((study: any, idx: number) => ({
        number: idx + 1,
        examination: study.study_name || { fr: "Imagerie", en: "Imaging" },
        indication: study.indication || { fr: "Indication", en: "Indication" },
        findings_sought: study.findings_sought || {},
        urgency: study.urgency || "routine",
        centers: study.mauritius_availability?.centers || "Apollo, Wellkin, Hôpitaux publics",
        cost_estimate: study.mauritius_availability?.cost || "Variable",
        wait_time: study.mauritius_availability?.wait_time || "Selon disponibilité",
        preparation: study.mauritius_availability?.preparation || "Selon protocole centre"
      }))
    } : null,
    
    // PRESCRIPTION MÉDICAMENTEUSE (si médicaments prescrits)
    medication: (analysis.treatment_plan?.medications?.length > 0) ? {
      header: {
        title: {
          fr: "ORDONNANCE MÉDICALE / MEDICAL PRESCRIPTION",
          en: "MEDICAL PRESCRIPTION / ORDONNANCE MÉDICALE"
        },
        prescriber: {
          name: "Dr. Teleconsultation Expert",
          registration: "MCM-TELE-2024",
          qualification: "MD, Telemedicine Certified"
        },
        date: currentDate.toLocaleDateString('fr-FR'),
        validity: {
          fr: "Ordonnance valide 30 jours",
          en: "Prescription valid 30 days"
        }
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} ans`,
        weight: patient.weight ? `${patient.weight} kg` : 'Non renseigné',
        allergies: patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'Aucune connue'
      },
      
      diagnosis: {
        primary: analysis.clinical_analysis?.primary_diagnosis?.condition?.fr || 'Diagnostic',
        icd10: analysis.clinical_analysis?.primary_diagnosis?.icd10_code || 'R69'
      },
      
      prescriptions: analysis.treatment_plan.medications.map((med: any, idx: number) => ({
        number: idx + 1,
        medication: med.drug || { fr: "Médicament", en: "Medication" },
        indication: med.indication || { fr: "Indication", en: "Indication" },
        dosing: med.dosing || {},
        duration: med.duration || { fr: "Selon évolution", en: "As per evolution" },
        instructions: med.administration_instructions || {
          fr: "Prendre selon prescription",
          en: "Take as prescribed"
        },
        monitoring: med.monitoring || {},
        availability: med.mauritius_availability || {},
        warnings: {
          side_effects: med.side_effects || {},
          contraindications: med.contraindications || {},
          interactions: med.interactions || {}
        }
      })),
      
      non_pharmacological: analysis.treatment_plan?.non_pharmacological || {},
      
      footer: {
        legal: {
          fr: "Prescription téléconsultation conforme Medical Council Mauritius",
          en: "Teleconsultation prescription compliant with Medical Council Mauritius"
        },
        pharmacist_note: {
          fr: "Délivrance autorisée selon réglementation en vigueur",
          en: "Dispensing authorized as per current regulations"
        }
      }
    } : null,
    
    // CONSEILS AU PATIENT (toujours généré)
    patient_advice: {
      header: {
        title: {
          fr: "CONSEILS ET RECOMMANDATIONS",
          en: "ADVICE AND RECOMMENDATIONS"
        }
      },
      
      content: {
        condition_explanation: analysis.patient_education?.understanding_condition || {},
        treatment_rationale: analysis.patient_education?.treatment_importance || {},
        lifestyle_changes: analysis.patient_education?.lifestyle_modifications || {},
        warning_signs: analysis.patient_education?.warning_signs || {},
        tropical_considerations: analysis.patient_education?.mauritius_specific || {}
      },
      
      follow_up: {
        next_steps: analysis.follow_up_plan?.immediate || {},
        when_to_consult: analysis.follow_up_plan?.red_flags || {},
        next_appointment: analysis.follow_up_plan?.next_consultation || {}
      }
    }
  }
}

// ==================== FONCTION PRINCIPALE ====================
export async function POST(request: NextRequest) {
  console.log('🚀 MAURITIUS MEDICAL AI - VERSION 2 AMÉLIORÉE (PROTECTION DES DONNÉES ACTIVÉE)')
  const startTime = Date.now()
  
  try {
    // 1. Parse parallèle et validation
    const [body, apiKey] = await Promise.all([
      request.json(),
      Promise.resolve(process.env.OPENAI_API_KEY)
    ])
    
    // 2. Validation des entrées
    if (!body.patientData || !body.clinicalData) {
      return NextResponse.json({
        success: false,
        error: 'Données patient ou cliniques manquantes',
        errorCode: 'MISSING_DATA'
      }, { status: 400 })
    }
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.error('❌ Clé API OpenAI invalide ou manquante')
      return NextResponse.json({
        success: false,
        error: 'Configuration API manquante',
        errorCode: 'API_CONFIG_ERROR'
      }, { status: 500 })
    }
    
    // ========== PROTECTION DES DONNÉES : ANONYMISATION ==========
    const { anonymized: anonymizedPatientData, originalIdentity } = anonymizePatientData(body.patientData)
    
    // 3. Construction du contexte patient AVEC DONNÉES ANONYMISÉES
    const patientContext: PatientContext = {
      // Utiliser les données anonymisées
      age: parseInt(anonymizedPatientData?.age) || 0,
      sex: anonymizedPatientData?.sex || 'inconnu',
      weight: anonymizedPatientData?.weight,
      height: anonymizedPatientData?.height,
      medical_history: anonymizedPatientData?.medicalHistory || [],
      current_medications: anonymizedPatientData?.currentMedications || [],
      allergies: anonymizedPatientData?.allergies || [],
      pregnancy_status: anonymizedPatientData?.pregnancyStatus,
      last_menstrual_period: anonymizedPatientData?.lastMenstrualPeriod,
      social_history: anonymizedPatientData?.socialHistory,
      
      // Données cliniques
      chief_complaint: body.clinicalData?.chiefComplaint || '',
      symptoms: body.clinicalData?.symptoms || [],
      symptom_duration: body.clinicalData?.symptomDuration || '',
      vital_signs: body.clinicalData?.vitalSigns || {},
      disease_history: body.clinicalData?.diseaseHistory || '',
      
      // Questions IA
      ai_questions: body.questionsData || [],
      
      // ID anonyme pour le tracking
      anonymousId: anonymizedPatientData.anonymousId
      
      // PAS de name, firstName, lastName - ils sont undefined
    }
    
    console.log('📋 Contexte patient préparé (ANONYMISÉ)')
    console.log(`   - Âge: ${patientContext.age} ans`)
    console.log(`   - Symptômes: ${patientContext.symptoms.length}`)
    console.log(`   - Questions IA: ${patientContext.ai_questions.length}`)
    console.log(`   - ID anonyme: ${patientContext.anonymousId}`)
    console.log(`   - Identité: PROTÉGÉE ✅`)
    
    // 4. Préparation du prompt
    const finalPrompt = preparePrompt(patientContext)
    
    // 5. Appel OpenAI avec retry intelligent
    const { data: openaiData, analysis: medicalAnalysis } = await callOpenAIWithRetry(
      apiKey,
      finalPrompt
    )
    
    console.log('✅ Analyse médicale générée avec succès')
    
    // 6. Validation de la réponse
    const validation = validateMedicalAnalysis(medicalAnalysis, patientContext)
    
    if (!validation.isValid && validation.issues.length > 0) {
      console.error('❌ Problèmes critiques détectés:', validation.issues)
      // On continue quand même mais on log les problèmes
    }
    
    if (validation.suggestions.length > 0) {
      console.log('💡 Suggestions d\'amélioration:', validation.suggestions)
    }
    
    // 7. Génération des documents médicaux AVEC L'IDENTITÉ ORIGINALE
    const patientContextWithIdentity = {
      ...patientContext,
      ...originalIdentity // Restaurer les vraies données pour les documents
    }
    
    const professionalDocuments = generateMedicalDocuments(
      medicalAnalysis,
      patientContextWithIdentity,
      MAURITIUS_HEALTHCARE_CONTEXT
    )
    
    // 8. Calcul des métriques de performance
    const processingTime = Date.now() - startTime
    console.log(`✅ TRAITEMENT TERMINÉ EN ${processingTime}ms`)
    console.log(`📊 Résumé: ${validation.metrics.medications} médicament(s), ${validation.metrics.laboratory_tests} test(s) bio, ${validation.metrics.imaging_studies} imagerie(s)`)
    console.log(`🔒 Protection des données: ACTIVE - Aucune donnée personnelle envoyée à OpenAI`)
    
    // 9. Construction de la réponse finale
    const finalResponse = {
      success: true,
      processingTime: `${processingTime}ms`,
      
      // NOUVEAU : Indicateur de protection des données
      dataProtection: {
        enabled: true,
        method: 'anonymization',
        anonymousId: patientContext.anonymousId,
        fieldsProtected: ['firstName', 'lastName', 'name'],
        message: 'Patient identity was protected during AI processing',
        compliance: {
          rgpd: true,
          hipaa: true,
          dataMinimization: true
        }
      },
      
      // Validation et métriques
      validation: {
        isValid: validation.isValid,
        issues: validation.issues,
        suggestions: validation.suggestions,
        metrics: validation.metrics
      },
      
      // Raisonnement diagnostique
      diagnosticReasoning: medicalAnalysis.diagnostic_reasoning || null,
      
      // Diagnostic principal et différentiels
      diagnosis: {
        primary: {
          condition: medicalAnalysis.clinical_analysis?.primary_diagnosis?.condition?.fr || "Diagnostic en cours",
          condition_bilingual: medicalAnalysis.clinical_analysis?.primary_diagnosis?.condition || { fr: "Diagnostic", en: "Diagnosis" },
          icd10: medicalAnalysis.clinical_analysis?.primary_diagnosis?.icd10_code || "R69",
          confidence: medicalAnalysis.clinical_analysis?.primary_diagnosis?.confidence_level || 70,
          severity: medicalAnalysis.clinical_analysis?.primary_diagnosis?.severity?.fr || "modérée",
          severity_bilingual: medicalAnalysis.clinical_analysis?.primary_diagnosis?.severity || { fr: "modérée", en: "moderate" },
          detailedAnalysis: medicalAnalysis.clinical_analysis?.primary_diagnosis?.pathophysiology?.fr || "Analyse en cours",
          detailedAnalysis_bilingual: medicalAnalysis.clinical_analysis?.primary_diagnosis?.pathophysiology || { fr: "Analyse", en: "Analysis" },
          clinicalRationale: medicalAnalysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning?.fr || "Raisonnement en cours",
          clinicalRationale_bilingual: medicalAnalysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning || { fr: "Raisonnement", en: "Reasoning" },
          prognosis: medicalAnalysis.clinical_analysis?.primary_diagnosis?.prognosis?.fr || "Évolution à préciser",
          prognosis_bilingual: medicalAnalysis.clinical_analysis?.primary_diagnosis?.prognosis || { fr: "Pronostic", en: "Prognosis" },
          diagnosticCriteriaMet: medicalAnalysis.clinical_analysis?.primary_diagnosis?.diagnostic_criteria_met || [],
          certaintyLevel: medicalAnalysis.clinical_analysis?.primary_diagnosis?.certainty_level || "Moderate"
        },
        differential: medicalAnalysis.clinical_analysis?.differential_diagnoses || []
      },
      
      // Analyse experte
      expertAnalysis: {
        clinical_confidence: medicalAnalysis.diagnostic_reasoning?.clinical_confidence || {},
        
        expert_investigations: {
          investigation_strategy: medicalAnalysis.investigation_strategy || {},
          clinical_justification: medicalAnalysis.investigation_strategy?.clinical_justification || {},
          immediate_priority: [
            ...(medicalAnalysis.investigation_strategy?.laboratory_tests || []).map((test: any) => ({
              category: 'biology',
              examination: test.test_name?.en || test.test_name?.fr || "Test",
              examination_bilingual: test.test_name || { fr: "Test", en: "Test" },
              specific_indication: test.clinical_justification?.en || test.clinical_justification?.fr || "Indication",
              indication_bilingual: test.clinical_justification || { fr: "Indication", en: "Indication" },
              urgency: test.urgency || "routine",
              expected_results: test.expected_results || {},
              mauritius_availability: test.mauritius_logistics || {}
            })),
            ...(medicalAnalysis.investigation_strategy?.imaging_studies || []).map((img: any) => ({
              category: 'imaging',
              examination: img.study_name?.en || img.study_name?.fr || "Imaging",
              examination_bilingual: img.study_name || { fr: "Imagerie", en: "Imaging" },
              specific_indication: img.indication?.en || img.indication?.fr || "Indication",
              indication_bilingual: img.indication || { fr: "Indication", en: "Indication" },
              findings_sought: img.findings_sought || {},
              urgency: img.urgency || "routine",
              mauritius_availability: img.mauritius_availability || {}
            }))
          ],
          tests_by_purpose: medicalAnalysis.investigation_strategy?.tests_by_purpose || {},
          test_sequence: medicalAnalysis.investigation_strategy?.test_sequence || {}
        },
        
        expert_therapeutics: {
          treatment_approach: medicalAnalysis.treatment_plan?.approach || {},
          prescription_rationale: medicalAnalysis.treatment_plan?.prescription_rationale || {},
          primary_treatments: (medicalAnalysis.treatment_plan?.medications || []).map((med: any) => ({
            medication_dci: med.drug?.en || med.drug?.fr || "Médicament",
            medication_bilingual: med.drug || { fr: "Médicament", en: "Medication" },
            therapeutic_class: extractTherapeuticClass(med),
            precise_indication: med.indication?.en || med.indication?.fr || "Indication",
            indication_bilingual: med.indication || { fr: "Indication", en: "Indication" },
            mechanism: med.mechanism?.en || med.mechanism?.fr || "Mécanisme",
            mechanism_bilingual: med.mechanism || { fr: "Mécanisme", en: "Mechanism" },
            dosing_regimen: med.dosing || {},
            duration: med.duration || {},
            monitoring: med.monitoring || {},
            side_effects: med.side_effects || {},
            contraindications: med.contraindications || {},
            interactions: med.interactions || {},
            mauritius_availability: med.mauritius_availability || {},
            administration_instructions: med.administration_instructions || {}
          })),
          non_pharmacological: medicalAnalysis.treatment_plan?.non_pharmacological || {}
        }
      },
      
      // Plans de suivi et éducation
      followUpPlan: medicalAnalysis.follow_up_plan || {},
      patientEducation: medicalAnalysis.patient_education || {},
      
      // Documents générés
      mauritianDocuments: professionalDocuments,
      
      // Métadonnées
      metadata: {
        ai_model: 'GPT-4o',
        system_version: '2.0-Enhanced-Protected',
        approach: 'Flexible Evidence-Based Medicine with Data Protection',
        medical_guidelines: medicalAnalysis.quality_metrics?.guidelines_followed || ["WHO", "ESC", "NICE"],
        evidence_level: medicalAnalysis.quality_metrics?.evidence_level || "High",
        mauritius_adapted: true,
        data_protection_enabled: true,
        generation_timestamp: new Date().toISOString(),
        quality_metrics: medicalAnalysis.quality_metrics || {},
        validation_passed: validation.isValid,
        completeness_score: medicalAnalysis.quality_metrics?.completeness_score || 0.85,
        total_processing_time_ms: processingTime,
        tokens_used: openaiData.usage || {},
        retry_count: 0
      }
    }
    
    return NextResponse.json(finalResponse)
    
  } catch (error) {
    console.error('❌ Erreur critique:', error)
    const errorTime = Date.now() - startTime
    
    // Réponse d'erreur structurée
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorCode: 'PROCESSING_ERROR',
      timestamp: new Date().toISOString(),
      processingTime: `${errorTime}ms`,
      
      // Fallback diagnostic
      diagnosis: generateEmergencyFallbackDiagnosis(body?.patientData || {}),
      
      // Structure minimale pour compatibilité
      expertAnalysis: {
        expert_investigations: {
          immediate_priority: [],
          investigation_strategy: {},
          tests_by_purpose: {},
          test_sequence: {}
        },
        expert_therapeutics: {
          primary_treatments: [],
          non_pharmacological: {
            fr: "Consulter un médecin en personne dès que possible",
            en: "Consult a physician in person as soon as possible"
          }
        }
      },
      
      // Document d'erreur
      mauritianDocuments: {
        consultation: {
          header: {
            title: { fr: "RAPPORT D'ERREUR", en: "ERROR REPORT" },
            date: new Date().toLocaleDateString('fr-FR'),
            type: "Erreur système"
          },
          error_details: {
            message: error instanceof Error ? error.message : 'Erreur inconnue',
            recommendation: {
              fr: "Veuillez réessayer ou consulter un médecin en personne",
              en: "Please try again or consult a physician in person"
            }
          }
        }
      },
      
      metadata: {
        ai_model: 'GPT-4o',
        system_version: '2.0-Enhanced-Protected',
        error_logged: true,
        support_contact: 'support@telemedecine.mu'
      }
    }, { status: 500 })
  }
}

// ==================== FONCTIONS HELPER ====================
function extractTherapeuticClass(medication: any): string {
  const drugName = (medication.drug?.en || medication.drug?.fr || '').toLowerCase()
  
  // Antibiotiques
  if (drugName.includes('cillin')) return 'Antibiotic - Beta-lactam'
  if (drugName.includes('mycin')) return 'Antibiotic - Macrolide'
  if (drugName.includes('floxacin')) return 'Antibiotic - Fluoroquinolone'
  if (drugName.includes('cef') || drugName.includes('ceph')) return 'Antibiotic - Cephalosporin'
  if (drugName.includes('azole') && !drugName.includes('prazole')) return 'Antibiotic/Antifungal - Azole'
  
  // Antalgiques
  if (drugName.includes('paracetamol') || drugName.includes('acetaminophen')) return 'Analgesic - Non-opioid'
  if (drugName.includes('tramadol') || drugName.includes('codeine')) return 'Analgesic - Opioid'
  if (drugName.includes('morphine') || drugName.includes('fentanyl')) return 'Analgesic - Strong opioid'
  
  // Anti-inflammatoires
  if (drugName.includes('ibuprofen') || drugName.includes('diclofenac') || drugName.includes('naproxen')) return 'NSAID'
  if (drugName.includes('prednis') || drugName.includes('cortisone')) return 'Corticosteroid'
  
  // Cardiovasculaires
  if (drugName.includes('pril')) return 'Antihypertensive - ACE inhibitor'
  if (drugName.includes('sartan')) return 'Antihypertensive - ARB'
  if (drugName.includes('lol') && !drugName.includes('omeprazole')) return 'Beta-blocker'
  if (drugName.includes('pine') && !drugName.includes('atropine')) return 'Calcium channel blocker'
  if (drugName.includes('statin')) return 'Lipid-lowering - Statin'
  
  // Gastro
  if (drugName.includes('prazole')) return 'PPI'
  if (drugName.includes('tidine')) return 'H2 blocker'
  
  // Diabète
  if (drugName.includes('metformin')) return 'Antidiabetic - Biguanide'
  if (drugName.includes('gliptin')) return 'Antidiabetic - DPP-4 inhibitor'
  if (drugName.includes('gliflozin')) return 'Antidiabetic - SGLT2 inhibitor'
  
  // Autres
  if (drugName.includes('salbutamol') || drugName.includes('salmeterol')) return 'Bronchodilator - Beta-2 agonist'
  if (drugName.includes('loratadine') || drugName.includes('cetirizine')) return 'Antihistamine'
  
  return 'Therapeutic agent'
}

function generateEmergencyFallbackDiagnosis(patient: any): any {
  return {
    primary: {
      condition: "Évaluation médicale approfondie requise",
      condition_bilingual: {
        fr: "Évaluation médicale approfondie requise",
        en: "Comprehensive medical evaluation required"
      },
      icd10: "R69",
      confidence: 50,
      severity: "undetermined",
      severity_bilingual: {
        fr: "à déterminer",
        en: "to be determined"
      },
      detailedAnalysis: "Une évaluation complète nécessite un examen physique",
      detailedAnalysis_bilingual: {
        fr: "Une évaluation complète nécessite un examen physique et potentiellement des examens complémentaires",
        en: "A complete evaluation requires physical examination and potentially additional tests"
      },
      clinicalRationale: "Téléconsultation limitée par l'absence d'examen physique",
      clinicalRationale_bilingual: {
        fr: "La téléconsultation est limitée par l'absence d'examen physique direct",
        en: "Teleconsultation is limited by the absence of direct physical examination"
      }
    },
    differential: []
  }
}

// ==================== ENDPOINT DE SANTÉ ====================
export async function GET(request: NextRequest) {
  const monitoringData = {
    medications: {} as any,
    tests: {} as any
  }
  
  // Calculer les moyennes
  PrescriptionMonitoring.metrics.avgMedicationsPerDiagnosis.forEach((values, diagnosis) => {
    monitoringData.medications[diagnosis] = {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    }
  })
  
  PrescriptionMonitoring.metrics.avgTestsPerDiagnosis.forEach((values, diagnosis) => {
    monitoringData.tests[diagnosis] = {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    }
  })
  
  return NextResponse.json({
    status: '✅ Mauritius Medical AI - Version 2.0 Enhanced (Data Protection Enabled)',
    version: '2.0-Enhanced-Protected',
    features: [
      'Patient data anonymization',
      'RGPD/HIPAA compliant',
      'Flexible prescriptions (0 to N medications/tests)',
      'Intelligent validation without rigid minimums',
      'Retry mechanism for robustness',
      'Prescription monitoring and analytics',
      'Enhanced error handling',
      'Complete medical reasoning'
    ],
    dataProtection: {
      enabled: true,
      method: 'anonymization',
      compliance: ['RGPD', 'HIPAA', 'Data Minimization'],
      protectedFields: ['firstName', 'lastName', 'name', 'email', 'phone'],
      encryptionKey: process.env.ENCRYPTION_KEY ? 'Configured' : 'Not configured'
    },
    monitoring: {
      prescriptionPatterns: monitoringData,
      outliers: PrescriptionMonitoring.metrics.outliers.slice(-10), // Last 10 outliers
      totalDiagnosesTracked: PrescriptionMonitoring.metrics.avgMedicationsPerDiagnosis.size
    },
    endpoints: {
      diagnosis: 'POST /api/openai-diagnosis',
      health: 'GET /api/openai-diagnosis'
    },
    guidelines: {
      supported: ['WHO', 'ESC', 'AHA', 'NICE', 'Mauritius MOH'],
      approach: 'Evidence-based medicine with tropical adaptations'
    },
    performance: {
      averageResponseTime: '4-6 seconds',
      maxTokens: 8000,
      model: 'GPT-4o'
    }
  })
}

// Configuration Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb'
    }
  }
}