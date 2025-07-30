// /app/api/openai-diagnosis/route.ts - VERSION INTELLIGENTE ENRICHIE
import { NextRequest, NextResponse } from 'next/server'

// ==================== CONTEXTE MINIMAL MAURICE ====================

const MAURITIUS_HEALTHCARE_CONTEXT = {
  // Infrastructure essentielle seulement
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

// ==================== FONCTION PRINCIPALE INTELLIGENTE ENRICHIE ====================

export async function POST(request: NextRequest) {
  console.log('🏥 MAURITIUS INTELLIGENT MEDICAL AI - STARTING')
  console.log('🧠 Model: GPT-4o | Approach: Enhanced Diagnostic Logic')
  
  try {
    const body = await request.json()
    const { patientData, clinicalData, questionsData, language = 'bilingual' } = body
    
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY missing')
    
    // Données patient essentielles
    const patientContext = {
      age: patientData?.age || 'unknown',
      sex: patientData?.sex || 'unknown',
      weight: patientData?.weight || 'unknown',
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
    
    console.log('🎯 GENERATING INTELLIGENT DIAGNOSIS WITH ENHANCED LOGIC')
    
    // PROMPT ENRICHI AVEC LA LOGIQUE DIAGNOSTIQUE AMÉLIORÉE
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
     ${patientContext.ai_questions.map((q: any) => `Q: ${q.question} → A: ${q.answer}`).join('\n')}

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
      // 2-3 more differentials
    ]
  },
  
  "investigation_strategy": {
    "diagnostic_approach": {
      "fr": "Pour confirmer ${primary_diagnosis} et exclure ${differentials}, voici la stratégie:",
      "en": "To confirm ${primary_diagnosis} and exclude ${differentials}, here's the strategy:"
    },
    
    "tests_by_purpose": {
      "to_confirm_primary": [
        {
          "test": { "fr": "[Test name]", "en": "[Test name]" },
          "rationale": {
            "fr": "Ce test confirmera ${diagnosis} si ${expected_result}",
            "en": "This test will confirm ${diagnosis} if ${expected_result}"
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
            "fr": "Normal → exclut ${differential}",
            "en": "Normal → excludes ${differential}"
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
      "fr": "Stratégie diagnostique adaptée pour confirmer [diagnostic] et exclure [différentiels]",
      "en": "Diagnostic strategy adapted to confirm [diagnosis] and exclude [differentials]"
    },
    
    "laboratory_tests": [
      // GENERATE APPROPRIATE TESTS BASED ON DIAGNOSTIC STRATEGY
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
      // ONLY IF CLINICALLY INDICATED
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
    
    "specialized_tests": [
      // ONLY IF TRULY NEEDED (cardiac cath, endoscopy, etc.)
    ]
  },
  
  "treatment_plan": {
    "approach": {
      "fr": "[MINIMUM 100 MOTS] Stratégie thérapeutique globale...",
      "en": "[MINIMUM 100 WORDS] Overall therapeutic strategy..."
    },
    
    "medications": [
      // PRESCRIBE BASED ON GUIDELINES AND CLINICAL JUDGMENT
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
          "public_free": [true/false],
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
      "pathophysiology": { "fr": [count], "en": [count] },
      "clinical_reasoning": { "fr": [count], "en": [count] },
      "total_words": [total]
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

    console.log('📡 CALLING GPT-4o FOR ENHANCED DIAGNOSTIC GENERATION')
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
        temperature: 0.4,  // Low enough for medical consistency
        max_tokens: 10000,  // Increased for more detailed content with diagnostic reasoning
        response_format: { type: "json_object" }  // Force JSON response
      }),
    })
    
    if (!openaiResponse.ok) {
      throw new Error(`OpenAI Error ${openaiResponse.status}: ${await openaiResponse.text()}`)
    }
    
    const openaiData = await openaiResponse.json()
    const medicalAnalysis = JSON.parse(openaiData.choices[0]?.message?.content || '{}')
    
    console.log('✅ Enhanced diagnostic analysis generated')
    console.log(`📊 Quality check - Total words: ${medicalAnalysis.quality_metrics?.total_words || 'calculating...'}`)
    console.log(`🔍 Diagnostic reasoning applied: ${medicalAnalysis.diagnostic_reasoning?.syndrome_identification?.clinical_syndrome || 'N/A'}`)
    
    // Generate professional documents from the analysis
    const professionalDocuments = generateMedicalDocuments(
      medicalAnalysis,
      patientContext,
      MAURITIUS_HEALTHCARE_CONTEXT
    )
    
    console.log('✅ COMPLETE MEDICAL PACKAGE READY WITH ENHANCED DIAGNOSTIC LOGIC')
    
    // Return in format compatible with existing UI
    return NextResponse.json({
      success: true,
      
      // NEW: Diagnostic reasoning data
      diagnosticReasoning: medicalAnalysis.diagnostic_reasoning,
      
      // Compatible with diagnosis-form.tsx
      diagnosis: {
        primary: {
          condition: medicalAnalysis.clinical_analysis.primary_diagnosis.condition.fr,
          condition_bilingual: medicalAnalysis.clinical_analysis.primary_diagnosis.condition,
          icd10: medicalAnalysis.clinical_analysis.primary_diagnosis.icd10_code,
          confidence: medicalAnalysis.clinical_analysis.primary_diagnosis.confidence_level,
          severity: medicalAnalysis.clinical_analysis.primary_diagnosis.severity.fr,
          severity_bilingual: medicalAnalysis.clinical_analysis.primary_diagnosis.severity,
          detailedAnalysis: medicalAnalysis.clinical_analysis.primary_diagnosis.pathophysiology.fr,
          detailedAnalysis_bilingual: medicalAnalysis.clinical_analysis.primary_diagnosis.pathophysiology,
          clinicalRationale: medicalAnalysis.clinical_analysis.primary_diagnosis.clinical_reasoning.fr,
          clinicalRationale_bilingual: medicalAnalysis.clinical_analysis.primary_diagnosis.clinical_reasoning,
          prognosis: medicalAnalysis.clinical_analysis.primary_diagnosis.prognosis.fr,
          prognosis_bilingual: medicalAnalysis.clinical_analysis.primary_diagnosis.prognosis,
          diagnosticCriteriaMet: medicalAnalysis.clinical_analysis.primary_diagnosis.diagnostic_criteria_met,
          certaintyLevel: medicalAnalysis.clinical_analysis.primary_diagnosis.certainty_level
        },
        differential: medicalAnalysis.clinical_analysis.differential_diagnoses
      },
      
      // Expert analysis with investigations and treatments
      expertAnalysis: {
        expert_investigations: {
          investigation_strategy: medicalAnalysis.investigation_strategy,
          immediate_priority: [
            ...medicalAnalysis.investigation_strategy.laboratory_tests.map((test: any) => ({
              category: 'biology',
              examination: test.test_name.en,
              examination_bilingual: test.test_name,
              specific_indication: test.clinical_justification.en,
              indication_bilingual: test.clinical_justification,
              urgency: test.urgency,
              mauritius_availability: test.mauritius_logistics
            })),
            ...medicalAnalysis.investigation_strategy.imaging_studies.map((img: any) => ({
              category: 'imaging',
              examination: img.study_name.en,
              examination_bilingual: img.study_name,
              specific_indication: img.indication.en,
              indication_bilingual: img.indication,
              mauritius_availability: img.mauritius_availability
            }))
          ],
          tests_by_purpose: medicalAnalysis.investigation_strategy.tests_by_purpose,
          test_sequence: medicalAnalysis.investigation_strategy.test_sequence
        },
        expert_therapeutics: {
          primary_treatments: medicalAnalysis.treatment_plan.medications.map((med: any) => ({
            medication_dci: med.drug.en,
            medication_bilingual: med.drug,
            therapeutic_class: med.indication.en,
            precise_indication: med.indication.en,
            indication_bilingual: med.indication,
            mechanism: med.mechanism.en,
            mechanism_bilingual: med.mechanism,
            dosing_regimen: med.dosing,
            mauritius_availability: med.mauritius_availability
          }))
        }
      },
      
      // Generated medical documents
      mauritianDocuments: professionalDocuments,
      
      // Metadata
      metadata: {
        ai_model: 'GPT-4o',
        approach: 'Enhanced Diagnostic Reasoning',
        medical_guidelines: medicalAnalysis.quality_metrics?.guidelines_followed,
        mauritius_adapted: true,
        generation_timestamp: new Date().toISOString(),
        quality_metrics: medicalAnalysis.quality_metrics,
        diagnostic_logic_applied: true
      }
    })
    
  } catch (error) {
    console.error('❌ ERROR:', error)
    
    // Fallback response
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnosis: generateEmergencyFallbackDiagnosis(patientData, clinicalData)
    })
  }
}

// ==================== DOCUMENT GENERATION (SIMPLIFIED) ====================

function generateMedicalDocuments(
  analysis: any,
  patient: any,
  infrastructure: any
): any {
  const currentDate = new Date()
  const consultationId = `TC-MU-${currentDate.getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  
  return {
    // CONSULTATION REPORT
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
      
      // NEW: Include diagnostic reasoning in report
      diagnostic_reasoning: analysis.diagnostic_reasoning,
      
      clinical_summary: {
        chief_complaint: {
          fr: patient.chief_complaint,
          en: patient.chief_complaint  // Could translate if needed
        },
        diagnosis: analysis.clinical_analysis.primary_diagnosis.condition,
        severity: analysis.clinical_analysis.primary_diagnosis.severity,
        confidence: analysis.clinical_analysis.primary_diagnosis.confidence_level + '%',
        clinical_reasoning: analysis.clinical_analysis.primary_diagnosis.clinical_reasoning,
        prognosis: analysis.clinical_analysis.primary_diagnosis.prognosis,
        diagnostic_criteria: analysis.clinical_analysis.primary_diagnosis.diagnostic_criteria_met
      },
      
      management_plan: {
        investigations: analysis.investigation_strategy,
        treatment: analysis.treatment_plan,
        follow_up: analysis.follow_up_plan
      },
      
      patient_education: analysis.patient_education
    },
    
    // LAB PRESCRIPTION
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
      
      examinations: analysis.investigation_strategy.laboratory_tests.map((test: any, idx: number) => ({
        number: idx + 1,
        test: test.test_name,
        justification: test.clinical_justification,
        urgency: test.urgency,
        preparation: {
          fr: test.urgency === 'STAT' ? 'Aucune' : 'Selon protocole laboratoire',
          en: test.urgency === 'STAT' ? 'None' : 'As per laboratory protocol'
        },
        where_to_go: {
          recommended: test.mauritius_logistics.where,
          cost_estimate: test.mauritius_logistics.cost,
          turnaround: test.mauritius_logistics.turnaround
        }
      }))
    },
    
    // IMAGING REQUESTS (if any)
    imaging: analysis.investigation_strategy.imaging_studies.length > 0 ? {
      header: {
        title: {
          fr: "DEMANDE D'EXAMENS D'IMAGERIE",
          en: "IMAGING REQUEST"
        }
      },
      studies: analysis.investigation_strategy.imaging_studies
    } : null,
    
    // MEDICATION PRESCRIPTION
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
      
      prescriptions: analysis.treatment_plan.medications.map((med: any, idx: number) => ({
        number: idx + 1,
        medication: med.drug,
        indication: med.indication,
        dosing: med.dosing,
        duration: med.duration,
        instructions: {
          fr: "Prendre selon prescription. Ne pas arrêter sans avis médical.",
          en: "Take as prescribed. Do not stop without medical advice."
        },
        availability: med.mauritius_availability
      })),
      
      non_pharmacological: analysis.treatment_plan.non_pharmacological,
      
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

// ==================== EMERGENCY FALLBACK ====================

function generateEmergencyFallbackDiagnosis(patient: any, clinical: any): any {
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
      detailedAnalysis: "Analyse en cours. Consultation physique recommandée pour évaluation complète.",
      clinicalRationale: "Données insuffisantes pour diagnostic définitif en téléconsultation."
    },
    differential: []
  }
}

// ==================== EXPORTS ====================

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
