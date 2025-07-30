// /app/api/openai-diagnosis/route.ts - VERSION COMPLÈTE CORRIGÉE
import { NextRequest, NextResponse } from 'next/server'

// ==================== CONTEXTE MEDICAL MAURICE ====================
const MAURITIUS_HEALTHCARE_CONTEXT = {
  // Infrastructure médicale essentielle
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

// ==================== FONCTION PRINCIPALE API ====================
export async function POST(request: NextRequest) {
  console.log('🏥 ========== MAURITIUS MEDICAL AI - DÉMARRAGE ==========')
  console.log('🧠 Modèle: GPT-4o | Approche: Raisonnement Diagnostique Amélioré')
  console.log('📅 Timestamp:', new Date().toISOString())
  
  let patientData: any = null
  let clinicalData: any = null
  let questionsData: any = null
  let language: string = 'bilingual'
  
  try {
    // 1. Parse et validation du body
    let body
    try {
      body = await request.json()
      console.log('📦 REQUÊTE REÇUE:', {
        hasPatientData: !!body.patientData,
        hasClinicalData: !!body.clinicalData,
        hasQuestionsData: !!body.questionsData,
        language: body.language || 'bilingual'
      })
      
      // Extraction des données
      patientData = body.patientData
      clinicalData = body.clinicalData
      questionsData = body.questionsData
      language = body.language || 'bilingual'
      
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Format JSON invalide dans la requête'
      }, { status: 400 })
    }
    
    // 2. Validation des données requises
    if (!patientData || !clinicalData) {
      console.error('❌ Données manquantes:', { 
        hasPatientData: !!patientData, 
        hasClinicalData: !!clinicalData 
      })
      return NextResponse.json({
        success: false,
        error: 'Données patient ou cliniques manquantes'
      }, { status: 400 })
    }
    
    // 3. Vérification de la clé API
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY non configurée')
      return NextResponse.json({
        success: false,
        error: 'Configuration API manquante - Contactez l\'administrateur'
      }, { status: 500 })
    }
    
    console.log('✅ Clé API trouvée, longueur:', apiKey.length)
    
    // 4. Préparation du contexte patient
    const patientContext = {
      age: patientData?.age || 'inconnu',
      sex: patientData?.sex || 'inconnu',
      weight: patientData?.weight || 'inconnu',
      medical_history: patientData?.medicalHistory || [],
      current_medications: patientData?.currentMedications || [],
      allergies: patientData?.allergies || [],
      chief_complaint: clinicalData?.chiefComplaint || '',
      symptoms: clinicalData?.symptoms || [],
      duration: clinicalData?.symptomDuration || '',
      vital_signs: clinicalData?.vitalSigns || {},
      disease_history: clinicalData?.diseaseHistory || '',
      ai_questions: questionsData || []
    }
    
    console.log('📋 CONTEXTE PATIENT PRÉPARÉ:', {
      age: patientContext.age,
      sex: patientContext.sex,
      chiefComplaint: patientContext.chief_complaint,
      symptomsCount: patientContext.symptoms.length,
      aiQuestionsCount: patientContext.ai_questions.length
    })
    
    // 5. Construction du prompt enrichi
    const enhancedDiagnosticPrompt = `
You are an expert physician practicing telemedicine in Mauritius using systematic diagnostic reasoning.

🏥 YOUR MEDICAL EXPERTISE:
- You know international medical guidelines (ESC, AHA, WHO, NICE)
- You understand pathophysiology and clinical reasoning
- You can select appropriate investigations based on presentation
- You prescribe according to evidence-based medicine
- You use systematic diagnostic reasoning to analyze patient data

🇲🇺 MAURITIUS HEALTHCARE CONTEXT:
${JSON.stringify(MAURITIUS_HEALTHCARE_CONTEXT, null, 2)}

📋 PATIENT PRESENTATION:
${JSON.stringify(patientContext, null, 2)}

🔍 DIAGNOSTIC REASONING PROCESS:

1. ANALYZE ALL DATA:
   - Chief complaint: ${patientContext.chief_complaint}
   - Key symptoms: ${patientContext.symptoms.join(', ')}
   - Vital signs abnormalities: [Identify any abnormal values]
   - Disease evolution: ${patientContext.disease_history}
   - AI questionnaire responses: [CRITICAL - these often contain key diagnostic clues]
     ${patientContext.ai_questions.map((q: any) => `Q: ${q.question} → A: ${q.answer}`).join('\n     ')}

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

🎯 YOUR TASK:
Based on this presentation and using systematic diagnostic reasoning, generate a COMPLETE analysis in the following JSON structure.

⚠️ CRITICAL REQUIREMENTS:
1. BILINGUAL: Provide ALL text in both French and English
2. DETAILED: Each section minimum 150-200 words per language
3. EVIDENCE-BASED: Follow current medical guidelines
4. MAURITIUS-ADAPTED: Consider local resources and tropical context
5. PERSONALIZED: Adapt to THIS specific patient
6. DIAGNOSTIC LOGIC: Use systematic reasoning to justify every decision

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
        "fr": "[MINIMUM 200 MOTS] Mécanisme expliquant TOUS les symptômes du patient...",
        "en": "[MINIMUM 200 WORDS] Mechanism explaining ALL patient's symptoms..."
      },
      
      "clinical_reasoning": {
        "fr": "[MINIMUM 150 MOTS] Raisonnement diagnostique basé sur les symptômes...",
        "en": "[MINIMUM 150 WORDS] Diagnostic reasoning based on symptoms..."
      },
      
      "prognosis": {
        "fr": "[MINIMUM 100 MOTS] Évolution attendue à court, moyen et long terme...",
        "en": "[MINIMUM 100 WORDS] Expected evolution short, medium and long term..."
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
          "fr": "[MINIMUM 80 MOTS] Pourquoi considérer et comment différencier...",
          "en": "[MINIMUM 80 WORDS] Why consider and how to differentiate..."
        }
      }
    ]
  },
  
  "investigation_strategy": {
    "diagnostic_approach": {
      "fr": "Pour confirmer le diagnostic principal et exclure les diagnostics différentiels, voici la stratégie:",
      "en": "To confirm the primary diagnosis and exclude differential diagnoses, here's the strategy:"
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
            "fr": "Normal → exclut le diagnostic différentiel",
            "en": "Normal → excludes the differential diagnosis"
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
    
    "rationale": {
      "fr": "Stratégie diagnostique adaptée pour confirmer le diagnostic principal et exclure les différentiels",
      "en": "Diagnostic strategy adapted to confirm primary diagnosis and exclude differentials"
    },
    
    "laboratory_tests": [
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
          "where": "[Use context: C-Lab, Green Cross, Biosanté, etc.]",
          "cost": "[Estimate from context: Rs 400-3000]",
          "turnaround": "[From context: 2-6h urgent, 24-48h routine]"
        }
      }
    ],
    
    "imaging_studies": [
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
        "mauritius_availability": {
          "centers": "[From context: Apollo, Wellkin, etc.]",
          "cost": "[From context: Rs 800-25000]",
          "wait_time": "[Realistic timeline]"
        }
      }
    ],
    
    "specialized_tests": []
  },
  
  "treatment_plan": {
    "approach": {
      "fr": "[MINIMUM 100 MOTS] Stratégie thérapeutique globale...",
      "en": "[MINIMUM 100 WORDS] Overall therapeutic strategy..."
    },
    
    "medications": [
      {
        "drug": {
          "fr": "[DCI + dosage]",
          "en": "[INN + dosage]"
        },
        "indication": {
          "fr": "[Indication spécifique pour ce patient]",
          "en": "[Specific indication for this patient]"
        },
        "mechanism": {
          "fr": "[MINIMUM 50 MOTS] Comment ce médicament aide...",
          "en": "[MINIMUM 50 WORDS] How this medication helps..."
        },
        "dosing": {
          "adult": { "fr": "[Posologie]", "en": "[Dosing]" },
          "adjustments": {
            "elderly": { "fr": "[Si >65 ans]", "en": "[If >65 years]" },
            "renal": { "fr": "[Si IRC]", "en": "[If CKD]" },
            "hepatic": { "fr": "[Si IH]", "en": "[If liver disease]" }
          }
        },
        "duration": { "fr": "[Durée]", "en": "[Duration]" },
        "monitoring": {
          "fr": "[Surveillance nécessaire]",
          "en": "[Required monitoring]"
        },
        "mauritius_availability": {
          "public_free": true,
          "estimated_cost": "[If not free: Rs XXX]",
          "alternatives": { "fr": "[Si non disponible]", "en": "[If unavailable]" }
        }
      }
    ],
    
    "non_pharmacological": {
      "fr": "[MINIMUM 100 MOTS] Mesures hygiéno-diététiques, repos, hydratation tropicale...",
      "en": "[MINIMUM 100 WORDS] Lifestyle measures, rest, tropical hydration..."
    }
  },
  
  "follow_up_plan": {
    "immediate": {
      "fr": "[Que faire dans les 24-48h]",
      "en": "[What to do in 24-48h]"
    },
    "short_term": {
      "fr": "[Suivi à J3-J7]",
      "en": "[Follow-up D3-D7]"
    },
    "red_flags": {
      "fr": "[CRITICAL] Signes nécessitant consultation urgente",
      "en": "[CRITICAL] Signs requiring urgent consultation"
    },
    "next_consultation": {
      "fr": "Téléconsultation de suivi pour résultats / Consultation physique si...",
      "en": "Follow-up teleconsultation for results / Physical consultation if..."
    }
  },
  
  "patient_education": {
    "understanding_condition": {
      "fr": "[MINIMUM 150 MOTS] Explication simple de votre condition...",
      "en": "[MINIMUM 150 WORDS] Simple explanation of your condition..."
    },
    "treatment_importance": {
      "fr": "[MINIMUM 100 MOTS] Pourquoi suivre ce traitement...",
      "en": "[MINIMUM 100 WORDS] Why follow this treatment..."
    },
    "mauritius_specific": {
      "tropical_advice": {
        "fr": "Hydratation 3L/jour, éviter soleil 10h-16h, conservation médicaments...",
        "en": "Hydration 3L/day, avoid sun 10am-4pm, medication storage..."
      },
      "local_diet": {
        "fr": "[Adaptations alimentaires locales]",
        "en": "[Local dietary adaptations]"
      }
    },
    "warning_signs": {
      "fr": "[Signes d'alarme expliqués simplement]",
      "en": "[Warning signs explained simply]"
    }
  },
  
  "quality_metrics": {
    "word_counts": {
      "pathophysiology": { "fr": 200, "en": 200 },
      "clinical_reasoning": { "fr": 150, "en": 150 },
      "total_words": 2000
    },
    "guidelines_followed": "[Which international guidelines applied]",
    "mauritius_adaptations": "[How adapted to local context]"
  }
}

🎯 CRITICAL RULES:
1. EVERY test must have a SPECIFIC diagnostic purpose
2. Don't order "routine panels" - each test must be justified
3. Consider pre-test probability based on clinical presentation
4. Adapt to Mauritius resources (costs, availability)
5. AI questionnaire responses often contain DIAGNOSTIC KEYS - analyze carefully!
6. Use systematic diagnostic reasoning for every decision
7. Keep teleconsultation limitations in mind (max 85% confidence)

EXAMPLE OF DIAGNOSTIC REASONING:
Patient: 45yo male, chest pain, diabetic
AI Question: "Pain worse with exertion?" → "Yes"
AI Question: "Relief with rest?" → "Yes"
→ High probability of angina
→ Need: Troponins (exclude MI), ECG (ischemia), Stress test or CT coronary

Generate a complete, professional medical analysis NOW.`

    console.log('📡 APPEL API GPT-4o...')
    console.log('🔑 Utilisation clé API:', apiKey.substring(0, 10) + '...')
    
    // 6. Appel à l'API OpenAI
    let openaiResponse
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are an expert physician with deep knowledge of international medical guidelines, systematic diagnostic reasoning, and the Mauritius healthcare system. Generate detailed, evidence-based medical analyses using logical diagnostic approaches.'
            },
            {
              role: 'user',
              content: enhancedDiagnosticPrompt
            }
          ],
          temperature: 0.4,
          max_tokens: 10000,
          response_format: { type: "json_object" }
        }),
      })
      
      console.log('📨 Statut réponse OpenAI:', openaiResponse.status)
      console.log('📨 Réponse OK:', openaiResponse.ok)
      
    } catch (fetchError) {
      console.error('❌ Erreur réseau:', fetchError)
      throw new Error(`Erreur réseau appel OpenAI: ${fetchError}`)
    }
    
    // 7. Gestion de la réponse OpenAI
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ Erreur API OpenAI:', {
        status: openaiResponse.status,
        errorText: errorText.substring(0, 500)
      })
      throw new Error(`Erreur OpenAI ${openaiResponse.status}: ${errorText.substring(0, 200)}`)
    }
    
    // 8. Parse de la réponse
    let openaiData
    try {
      openaiData = await openaiResponse.json()
      console.log('✅ Réponse OpenAI parsée avec succès')
      console.log('📊 Usage:', openaiData.usage)
    } catch (parseError) {
      console.error('❌ Erreur parsing réponse OpenAI:', parseError)
      throw new Error('Réponse invalide de OpenAI')
    }
    
    // 9. Extraction de l'analyse médicale
    let medicalAnalysis
    try {
      const content = openaiData.choices[0]?.message?.content
      if (!content) {
        throw new Error('Pas de contenu dans la réponse OpenAI')
      }
      medicalAnalysis = JSON.parse(content)
      console.log('✅ Analyse médicale parsée avec succès')
      console.log('🔍 L\'analyse inclut:', {
        hasDiagnosticReasoning: !!medicalAnalysis.diagnostic_reasoning,
        hasClinicalAnalysis: !!medicalAnalysis.clinical_analysis,
        hasInvestigationStrategy: !!medicalAnalysis.investigation_strategy,
        hasTreatmentPlan: !!medicalAnalysis.treatment_plan
      })
    } catch (parseError) {
      console.error('❌ Erreur parsing analyse médicale:', parseError)
      throw new Error('Format d\'analyse médicale invalide de l\'IA')
    }
    
    // 10. Génération des documents professionnels
    const professionalDocuments = generateMedicalDocuments(
      medicalAnalysis,
      patientContext,
      MAURITIUS_HEALTHCARE_CONTEXT
    )
    
    console.log('✅ Documents générés avec succès')
    
    // 11. Préparation de la réponse finale
    const finalResponse = {
      success: true,
      
      // Données de raisonnement diagnostique
      diagnosticReasoning: medicalAnalysis.diagnostic_reasoning || null,
      
      // Format diagnostic compatible
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
        expert_investigations: {
          investigation_strategy: medicalAnalysis.investigation_strategy || {},
          immediate_priority: [
            ...(medicalAnalysis.investigation_strategy?.laboratory_tests || []).map((test: any) => ({
              category: 'biology',
              examination: test.test_name?.en || test.test_name?.fr || "Test",
              examination_bilingual: test.test_name || { fr: "Test", en: "Test" },
              specific_indication: test.clinical_justification?.en || test.clinical_justification?.fr || "Indication",
              indication_bilingual: test.clinical_justification || { fr: "Indication", en: "Indication" },
              urgency: test.urgency || "routine",
              mauritius_availability: test.mauritius_logistics || {}
            })),
            ...(medicalAnalysis.investigation_strategy?.imaging_studies || []).map((img: any) => ({
              category: 'imaging',
              examination: img.study_name?.en || img.study_name?.fr || "Imaging",
              examination_bilingual: img.study_name || { fr: "Imagerie", en: "Imaging" },
              specific_indication: img.indication?.en || img.indication?.fr || "Indication",
              indication_bilingual: img.indication || { fr: "Indication", en: "Indication" },
              mauritius_availability: img.mauritius_availability || {}
            }))
          ],
          tests_by_purpose: medicalAnalysis.investigation_strategy?.tests_by_purpose || {},
          test_sequence: medicalAnalysis.investigation_strategy?.test_sequence || {}
        },
        expert_therapeutics: {
          primary_treatments: (medicalAnalysis.treatment_plan?.medications || []).map((med: any) => ({
            medication_dci: med.drug?.en || med.drug?.fr || "Médicament",
            medication_bilingual: med.drug || { fr: "Médicament", en: "Medication" },
            therapeutic_class: med.indication?.en || med.indication?.fr || "Classe",
            precise_indication: med.indication?.en || med.indication?.fr || "Indication",
            indication_bilingual: med.indication || { fr: "Indication", en: "Indication" },
            mechanism: med.mechanism?.en || med.mechanism?.fr || "Mécanisme",
            mechanism_bilingual: med.mechanism || { fr: "Mécanisme", en: "Mechanism" },
            dosing_regimen: med.dosing || {},
            mauritius_availability: med.mauritius_availability || {}
          }))
        }
      },
      
      // Documents générés
      mauritianDocuments: professionalDocuments,
      
      // Métadonnées
      metadata: {
        ai_model: 'GPT-4o',
        approach: 'Enhanced Diagnostic Reasoning',
        medical_guidelines: medicalAnalysis.quality_metrics?.guidelines_followed || "International",
        mauritius_adapted: true,
        generation_timestamp: new Date().toISOString(),
        quality_metrics: medicalAnalysis.quality_metrics || {},
        diagnostic_logic_applied: true
      }
    }
    
    console.log('✅ ========== RÉPONSE API PRÊTE ==========')
    console.log('📊 Résumé réponse:', {
      success: finalResponse.success,
      hasDiagnosis: !!finalResponse.diagnosis,
      hasExpertAnalysis: !!finalResponse.expertAnalysis,
      hasDocuments: !!finalResponse.mauritianDocuments,
      primaryCondition: finalResponse.diagnosis.primary.condition
    })
    
    return NextResponse.json(finalResponse)
    
  } catch (error) {
    console.error('❌ ========== ERREUR CRITIQUE ==========')
    console.error('Détails erreur:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace')
    
    // Retourner une réponse d'erreur détaillée avec fallback
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      errorType: error instanceof Error ? error.name : 'UnknownError',
      timestamp: new Date().toISOString(),
      // Fournir des données de fallback pour que l'UI ne plante pas
      diagnosis: generateEmergencyFallbackDiagnosis(patientData, clinicalData),
      expertAnalysis: {
        expert_investigations: {
          immediate_priority: [],
          investigation_strategy: {},
          tests_by_purpose: {},
          test_sequence: {}
        },
        expert_therapeutics: {
          primary_treatments: []
        }
      },
      mauritianDocuments: {
        consultation: {
          header: {
            title: { fr: "RAPPORT D'ERREUR", en: "ERROR REPORT" },
            date: new Date().toLocaleDateString('fr-FR')
          }
        }
      }
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// ==================== GÉNÉRATION DES DOCUMENTS ====================
function generateMedicalDocuments(
  analysis: any,
  patient: any,
  infrastructure: any
): any {
  const currentDate = new Date()
  const consultationId = `TC-MU-${currentDate.getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  
  console.log('📄 Génération des documents médicaux...')
  
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
        type: "Teleconsultation",
        disclaimer: {
          fr: "Évaluation basée sur téléconsultation - Examen physique non réalisé",
          en: "Assessment based on teleconsultation - Physical examination not performed"
        }
      },
      
      patient: {
        name: `${patient.firstName || 'Patient'} ${patient.lastName || ''}`,
        age: patient.age,
        sex: patient.sex
      },
      
      // Inclure le raisonnement diagnostique
      diagnostic_reasoning: analysis.diagnostic_reasoning || {},
      
      clinical_summary: {
        chief_complaint: {
          fr: patient.chief_complaint,
          en: patient.chief_complaint
        },
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition || { fr: "À préciser", en: "To be determined" },
        severity: analysis.clinical_analysis?.primary_diagnosis?.severity || { fr: "modérée", en: "moderate" },
        confidence: (analysis.clinical_analysis?.primary_diagnosis?.confidence_level || 70) + '%',
        clinical_reasoning: analysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning || { fr: "En cours", en: "In progress" },
        prognosis: analysis.clinical_analysis?.primary_diagnosis?.prognosis || { fr: "À évaluer", en: "To be evaluated" },
        diagnostic_criteria: analysis.clinical_analysis?.primary_diagnosis?.diagnostic_criteria_met || []
      },
      
      management_plan: {
        investigations: analysis.investigation_strategy || {},
        treatment: analysis.treatment_plan || {},
        follow_up: analysis.follow_up_plan || {}
      },
      
      patient_education: analysis.patient_education || {}
    },
    
    // PRESCRIPTION BIOLOGIE
    biological: {
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
        name: `${patient.firstName || ''} ${patient.lastName || ''}`,
        age: patient.age,
        id: patient.id || 'N/A'
      },
      
      examinations: (analysis.investigation_strategy?.laboratory_tests || []).map((test: any, idx: number) => ({
        number: idx + 1,
        test: test.test_name || { fr: "Test", en: "Test" },
        justification: test.clinical_justification || { fr: "Justification", en: "Justification" },
        urgency: test.urgency || "routine",
        preparation: {
          fr: test.urgency === 'STAT' ? 'Aucune' : 'Selon protocole laboratoire',
          en: test.urgency === 'STAT' ? 'None' : 'As per laboratory protocol'
        },
        where_to_go: {
          recommended: test.mauritius_logistics?.where || "C-Lab ou Green Cross",
          cost_estimate: test.mauritius_logistics?.cost || "Rs 500-2000",
          turnaround: test.mauritius_logistics?.turnaround || "24-48h"
        }
      }))
    },
    
    // DEMANDES IMAGERIE
    imaging: (analysis.investigation_strategy?.imaging_studies?.length || 0) > 0 ? {
      header: {
        title: {
          fr: "DEMANDE D'EXAMENS D'IMAGERIE",
          en: "IMAGING REQUEST"
        }
      },
      studies: analysis.investigation_strategy.imaging_studies
    } : null,
    
    // PRESCRIPTION MÉDICAMENTEUSE
    medication: {
      header: {
        title: {
          fr: "ORDONNANCE MÉDICALE / MEDICAL PRESCRIPTION",
          en: "MEDICAL PRESCRIPTION / ORDONNANCE MÉDICALE"
        },
        prescriber: {
          name: "Dr. Expert Physician",
          registration: "MCM-TELE-2024",
          qualification: "MD, Telemedicine Certified"
        }
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`,
        age: patient.age,
        weight: patient.weight ? `${patient.weight}kg` : 'N/A',
        allergies: patient.allergies?.join(', ') || 'None reported'
      },
      
      prescriptions: (analysis.treatment_plan?.medications || []).map((med: any, idx: number) => ({
        number: idx + 1,
        medication: med.drug || { fr: "Médicament", en: "Medication" },
        indication: med.indication || { fr: "Indication", en: "Indication" },
        dosing: med.dosing || {},
        duration: med.duration || { fr: "Selon évolution", en: "As per evolution" },
        instructions: {
          fr: "Prendre selon prescription. Ne pas arrêter sans avis médical.",
          en: "Take as prescribed. Do not stop without medical advice."
        },
        availability: med.mauritius_availability || {}
      })),
      
      non_pharmacological: analysis.treatment_plan?.non_pharmacological || { fr: "Repos et hydratation", en: "Rest and hydration" },
      
      footer: {
        validity: {
          fr: "Ordonnance valide 30 jours",
          en: "Prescription valid 30 days"
        },
        legal: {
          fr: "Prescription téléconsultation conforme Medical Council Mauritius",
          en: "Teleconsultation prescription compliant with Medical Council Mauritius"
        }
      }
    }
  }
}

// ==================== DIAGNOSTIC DE SECOURS ====================
function generateEmergencyFallbackDiagnosis(patient: any, clinical: any): any {
  console.log('⚠️ Génération diagnostic de secours...')
  
  return {
    primary: {
      condition: "Évaluation médicale requise",
      condition_bilingual: {
        fr: "Évaluation médicale requise",
        en: "Medical evaluation required"
      },
      icd10: "R69",
      confidence: 60,
      severity: "moderate",
      severity_bilingual: {
        fr: "modérée",
        en: "moderate"
      },
      detailedAnalysis: "Analyse en cours. Consultation physique recommandée pour évaluation complète.",
      detailedAnalysis_bilingual: {
        fr: "Analyse en cours. Consultation physique recommandée pour évaluation complète.",
        en: "Analysis in progress. Physical consultation recommended for complete evaluation."
      },
      clinicalRationale: "Données insuffisantes pour diagnostic définitif en téléconsultation.",
      clinicalRationale_bilingual: {
        fr: "Données insuffisantes pour diagnostic définitif en téléconsultation.",
        en: "Insufficient data for definitive diagnosis via teleconsultation."
      },
      prognosis: "À évaluer selon résultats examens complémentaires",
      prognosis_bilingual: {
        fr: "À évaluer selon résultats examens complémentaires",
        en: "To be evaluated based on additional test results"
      },
      diagnosticCriteriaMet: [],
      certaintyLevel: "Low"
    },
    differential: []
  }
}

// ==================== CONFIGURATION ====================
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
