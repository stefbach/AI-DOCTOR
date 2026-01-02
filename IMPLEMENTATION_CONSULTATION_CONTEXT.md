# 🎯 IMPLÉMENTATION URGENTE - CONSULTATION_CONTEXT

**Date**: 2 Janvier 2026  
**Priorité**: 🔴 CRITIQUE  
**Objectif**: Adapter stratégie thérapeutique selon contexte (Téléconsultation vs Urgences)

---

## 🔴 PROBLÈME ACTUEL

**Le système NE FAIT PAS la différence entre**:

```
❌ Patient en TÉLÉCONSULTATION avec douleur thoracique
   → GPT-4 prescrit protocole complet ACS
   → IMPOSSIBLE: Patient est à domicile!

❌ Patient AUX URGENCES avec douleur thoracique  
   → GPT-4 dit juste "référence urgence"
   → PAS ASSEZ: Patient est déjà à l'hôpital!
```

---

## ✅ SOLUTION

### Ajouter `consultation_context` dans PatientContext

```typescript
interface PatientContext {
  // ... existing fields ...
  
  // NOUVEAU
  consultation_context?: {
    setting: 'teleconsultation' | 'emergency_department' | 'general_practice'
    location: string  // "Patient at home" | "Emergency room" | "Hospital"
    access_to_investigations: boolean  // false for teleconsultation, true for emergency
    access_to_iv_medications: boolean  // false for teleconsultation, true for emergency
  }
}
```

---

## 📝 MODIFICATIONS CONCRÈTES

### 1. Modifier `/app/api/openai-diagnosis/route.ts`

**Ligne 9-43: Ajouter dans interface PatientContext**

```typescript
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
  anonymousId?: string
  
  // ✅ NOUVEAU: CONTEXTE DE CONSULTATION
  consultation_context?: {
    setting: 'teleconsultation' | 'emergency_department' | 'general_practice'
    location: string
    access_to_investigations: boolean
    access_to_iv_medications: boolean
  }
}
```

---

### 2. Ajouter Section CONTEXTE dans le Prompt GPT-4

**Après ligne 154 (après CRITICAL DIRECTIVE), ajouter**:

```typescript
const CONSULTATION_CONTEXT_PROMPT = (context?: PatientContext['consultation_context']) => {
  if (!context) {
    return `
═══════════════════════════════════════════════════════════════════════════════
🏥 CONSULTATION CONTEXT: GENERAL PRACTICE (DEFAULT)
═══════════════════════════════════════════════════════════════════════════════

Setting: General practice / outpatient clinic
Location: Patient in clinic
Access to investigations: Basic (arrange external lab/imaging)
Access to IV medications: No (oral medications only)

🎯 ADAPT YOUR MANAGEMENT ACCORDINGLY:
- Prescribe oral medications appropriate for home use
- Order investigations to be done at external facilities
- Provide clear red flags for emergency referral
- If emergency suspected → IMMEDIATE EMERGENCY REFERRAL
`
  }

  const { setting, location, access_to_investigations, access_to_iv_medications } = context

  if (setting === 'teleconsultation') {
    return `
═══════════════════════════════════════════════════════════════════════════════
📱 CONSULTATION CONTEXT: TÉLÉCONSULTATION
═══════════════════════════════════════════════════════════════════════════════

Setting: Teleconsultation (remote)
Location: ${location}
Access to investigations: ${access_to_investigations ? 'Yes' : 'No (patient at home)'}
Access to IV medications: ${access_to_iv_medications ? 'Yes' : 'No (oral only)'}

🎯 CRITICAL ADAPTATION FOR TELECONSULTATION:

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🚨 IF EMERGENCY SUSPECTED (ACS, Stroke, Sepsis, Acute Abdomen):            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ✅ PROVIDE IN DIAGNOSIS:                                                    │
│    - Clinical assessment and suspected diagnosis                            │
│    - Differential diagnoses                                                 │
│    - Red flags identified                                                   │
│                                                                             │
│ ❌ DO NOT PROVIDE (patient at home):                                        │
│    - Detailed hospital investigation protocols                              │
│    - STAT medications (Aspirin STAT, Morphine IV, etc.)                    │
│    - Hospital-based procedures                                              │
│                                                                             │
│ ✅ INSTEAD, PROVIDE CLEAR EMERGENCY REFERRAL:                               │
│    - "⚠️⚠️⚠️ IMMEDIATE EMERGENCY REFERRAL REQUIRED"                        │
│    - "Call ambulance immediately: SAMU 114 (Mauritius) or 15 (France)"    │
│    - "Do NOT wait - this is a medical emergency"                           │
│    - "If Aspirin 300mg available at home and patient not allergic:        │
│       chew ONE tablet while waiting for ambulance"                          │
│    - Brief explanation of what will happen at hospital                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ✅ IF NON-EMERGENCY CONDITION (Pneumonia, UTI, Hypertension):              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ✅ PROVIDE NORMAL MANAGEMENT:                                               │
│    - Complete diagnosis                                                     │
│    - Oral medications with home dosing (BD, TDS, QDS)                      │
│    - Investigations to arrange at lab/imaging center (within 24-48h)       │
│    - Follow-up plan                                                         │
│    - Clear red flags for when to seek emergency care                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

EXAMPLES:
- ✅ Pneumonia → Amoxicillin 500mg TDS, CXR within 24h, phone f/u in 48h
- ✅ UTI → Nitrofurantoin 100mg BD, urine culture, red flags
- 🚨 Chest pain radiating to arm → "CALL AMBULANCE NOW - Suspected ACS"
- 🚨 Sudden weakness right side → "CALL AMBULANCE NOW - Suspected stroke"

═══════════════════════════════════════════════════════════════════════════════
`
  }

  if (setting === 'emergency_department') {
    return `
═══════════════════════════════════════════════════════════════════════════════
🏥 CONSULTATION CONTEXT: EMERGENCY DEPARTMENT
═══════════════════════════════════════════════════════════════════════════════

Setting: Emergency Department
Location: ${location}
Access to investigations: ${access_to_investigations ? 'Yes (STAT available)' : 'No'}
Access to IV medications: ${access_to_iv_medications ? 'Yes (IV/SC available)' : 'No'}

🎯 CRITICAL: FULL EMERGENCY PROTOCOL MODE

┌─────────────────────────────────────────────────────────────────────────────┐
│ ✅ PROVIDE COMPLETE EMERGENCY MANAGEMENT:                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. 🔬 IMMEDIATE INVESTIGATIONS (STAT):                                      │
│    - List ALL investigations with STAT timing                               │
│    - Exact timing: T0 (now), T1h (1 hour), T3h (3 hours)                   │
│    - Priority: STAT, Urgent, Routine                                        │
│    - Interpretation guidelines for each test                                │
│    - Example: "Troponin hs: T0 (now), T1h, T3h - Δ >50% = NSTEMI"        │
│                                                                             │
│ 2. 💊 STAT MEDICATIONS (Immediate):                                         │
│    - Loading doses with STAT timing                                         │
│    - Route: IV, SC, Oral with exact instructions                            │
│    - Example ACS:                                                           │
│      * "Aspirin 300mg STAT (chew and swallow)"                             │
│      * "Ticagrelor 180mg STAT loading dose"                                │
│      * "Fondaparinux 2.5mg SC STAT"                                        │
│      * "Morphine 2.5-5mg IV if severe pain"                                │
│      * "Atorvastatin 80mg STAT"                                            │
│                                                                             │
│ 3. 🏥 ONGOING HOSPITAL MANAGEMENT:                                          │
│    - Continuous monitoring protocols                                        │
│    - Serial assessments (ECG q30min if ongoing pain)                        │
│    - IV access requirements                                                 │
│    - Oxygen therapy if SpO2 <94%                                            │
│                                                                             │
│ 4. 👨‍⚕️ SPECIALIST REFERRAL (with urgency):                                   │
│    - Emergency: IMMEDIATE (within minutes)                                  │
│    - Urgent: Within 24 hours                                                │
│    - Routine: Within 1 week                                                 │
│    - Specific actions required by specialist                                │
│    - Example: "Contact on-call cardiologist NOW - PCI consideration"       │
│                                                                             │
│ 5. 🏥 ADMISSION PLANNING:                                                   │
│    - Ward: CCU, HDU, General ward                                           │
│    - Duration: 24-48h minimum for serial monitoring                         │
│    - Discharge criteria                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 EMERGENCY EXAMPLES TO FOLLOW:                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ACS/NSTEMI Protocol:                                                        │
│ ✅ Investigations:                                                           │
│    - "12-lead ECG STAT (within 10 minutes)"                                 │
│    - "Troponin hs: T0 (now), T1h (1 hour), T3h (3 hours)"                 │
│    - "U&E + eGFR STAT (for anticoagulation dosing)"                        │
│    - "Lipid profile, HbA1c, FBC, Coag screen STAT"                         │
│    - "Chest X-ray within 1 hour"                                           │
│                                                                             │
│ ✅ STAT Medications:                                                         │
│    - "Aspirin 300mg STAT (chew and swallow)"                               │
│    - "Ticagrelor 180mg STAT (preferred over Clopidogrel)"                 │
│    - "Fondaparinux 2.5mg SC STAT (preferred over Enoxaparin)"             │
│    - "Morphine 2.5-5mg IV PRN for severe pain"                             │
│    - "Atorvastatin 80mg STAT (high-intensity statin)"                     │
│                                                                             │
│ ✅ Monitoring:                                                               │
│    - "Continuous cardiac monitoring (telemetry)"                            │
│    - "Vital signs q15min for first hour"                                    │
│    - "IV access × 2 (large bore)"                                          │
│    - "Oxygen if SpO2 <94%"                                                  │
│                                                                             │
│ ✅ Specialist:                                                               │
│    - "Contact on-call cardiologist IMMEDIATELY"                             │
│    - "If STEMI: Immediate PCI (target <120 min)"                           │
│    - "If NSTEMI high-risk: PCI within 24h"                                 │
│                                                                             │
│ ✅ Admission:                                                                │
│    - "Coronary Care Unit (CCU) or HDU"                                     │
│    - "Minimum 24-48h for serial troponins"                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

⚠️ CONTRAINDICATIONS IN EMERGENCY:
- ❌ NSAIDs in ACS (Ibuprofen, Diclofenac) - Use Paracetamol only
- ❌ Beta-blockers in acute heart failure (wait until stable)

═══════════════════════════════════════════════════════════════════════════════
`
  }

  // general_practice
  return `
═══════════════════════════════════════════════════════════════════════════════
🏥 CONSULTATION CONTEXT: GENERAL PRACTICE
═══════════════════════════════════════════════════════════════════════════════

Setting: General practice / outpatient clinic
Location: ${location}
Access to investigations: ${access_to_investigations ? 'Basic available' : 'Arrange external'}
Access to IV medications: ${access_to_iv_medications ? 'Yes' : 'No (oral only)'}

🎯 PROVIDE STANDARD OUTPATIENT MANAGEMENT:
- Oral medications appropriate for home use
- Investigations to be arranged (lab/imaging)
- Follow-up plan (days/weeks)
- Clear red flags for emergency referral if condition worsens

IF EMERGENCY SUSPECTED → Immediate emergency referral (call ambulance)

═══════════════════════════════════════════════════════════════════════════════
`
}
```

---

### 3. Intégrer CONSULTATION_CONTEXT dans le Prompt Principal

**Ligne ~750-800 (dans POST function), modifier**:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const patientContext: PatientContext = body.patientData || body

    // Validation basique
    if (!patientContext.chief_complaint && !patientContext.symptoms?.length) {
      return NextResponse.json(
        { error: 'Missing required patient data' },
        { status: 400 }
      )
    }

    console.log('🏥 Generating diagnosis for patient:', {
      age: patientContext.age,
      sex: patientContext.sex,
      chief_complaint: patientContext.chief_complaint,
      // ✅ NOUVEAU: Logger le contexte
      consultation_context: patientContext.consultation_context
    })

    // Construire le prompt avec CONTEXTE
    const systemPrompt = `
${MAURITIUS_MEDICAL_PROMPT}

${CONSULTATION_CONTEXT_PROMPT(patientContext.consultation_context)}

${ENCYCLOPEDIC_MEDICAL_INTELLIGENCE_DIRECTIVE}

... (reste du prompt existant)
`

    // Reste du code inchangé...
  }
}
```

---

## 🧪 TESTS À FAIRE

### Test 1: ACS en Téléconsultation

**Input**:
```json
{
  "consultation_context": {
    "setting": "teleconsultation",
    "location": "Patient at home",
    "access_to_investigations": false,
    "access_to_iv_medications": false
  },
  "chief_complaint": "douleur thoracique importante",
  "symptoms": ["chest pain radiating to left arm", "sweating"],
  "age": 55,
  "sex": "male"
}
```

**Expected Output**:
```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Suspected Acute Coronary Syndrome",
      "urgency": "EMERGENCY"
    }
  },
  "investigation_strategy": {
    "clinical_justification": "⚠️ EMERGENCY - Patient requires immediate hospital assessment",
    "laboratory_tests": [],  // Vide car téléconsultation
    "imaging_studies": []     // Vide car téléconsultation
  },
  "treatment_plan": {
    "approach": "⚠️⚠️⚠️ IMMEDIATE EMERGENCY REFERRAL - Call ambulance NOW",
    "medications": [],  // Vide car urgence
    "emergency_instructions": [
      "Call SAMU 114 (Mauritius) immediately",
      "If Aspirin 300mg at home: chew ONE tablet while waiting",
      "Do NOT drive to hospital"
    ]
  }
}
```

---

### Test 2: ACS aux Urgences

**Input**:
```json
{
  "consultation_context": {
    "setting": "emergency_department",
    "location": "Emergency room",
    "access_to_investigations": true,
    "access_to_iv_medications": true
  },
  "chief_complaint": "douleur thoracique importante",
  "symptoms": ["chest pain radiating to left arm", "sweating"],
  "age": 55,
  "sex": "male"
}
```

**Expected Output**:
```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Acute Coronary Syndrome - NSTEMI/STEMI to confirm",
      "urgency": "EMERGENCY"
    }
  },
  "investigation_strategy": {
    "immediate_investigations": [
      {
        "test_name": "12-lead ECG",
        "timing": "STAT (within 10 minutes)",
        "urgency": "STAT"
      },
      {
        "test_name": "Troponin hs",
        "timing": "T0 (now), T1h (1 hour), T3h (3 hours)",
        "urgency": "STAT"
      },
      {
        "test_name": "U&E + eGFR",
        "timing": "STAT",
        "justification": "For anticoagulation dosing"
      }
      // ... autres examens STAT
    ]
  },
  "treatment_plan": {
    "immediate_medications": [
      {
        "drug": "Aspirin 300mg",
        "timing": "STAT (loading dose)",
        "route": "Oral (chew and swallow)"
      },
      {
        "drug": "Ticagrelor 180mg",
        "timing": "STAT (loading dose)",
        "route": "Oral"
      },
      {
        "drug": "Fondaparinux 2.5mg",
        "timing": "STAT",
        "route": "Subcutaneous"
      },
      {
        "drug": "Morphine 2.5-5mg",
        "timing": "IV if severe pain",
        "route": "Intravenous"
      }
    ],
    "monitoring": [
      "Continuous cardiac monitoring (telemetry)",
      "Vital signs q15min for first hour",
      "IV access × 2 (large bore)"
    ]
  },
  "specialist_referral": {
    "required": true,
    "specialty": "Cardiology",
    "urgency": "emergency",
    "timeframe": "IMMEDIATE",
    "actions": [
      "Contact on-call cardiologist NOW",
      "If STEMI: Immediate PCI (<120 min)",
      "If NSTEMI high-risk: PCI within 24h"
    ]
  }
}
```

---

### Test 3: Pneumonie en Téléconsultation (Non-urgence)

**Input**:
```json
{
  "consultation_context": {
    "setting": "teleconsultation",
    "location": "Patient at home",
    "access_to_investigations": false,
    "access_to_iv_medications": false
  },
  "chief_complaint": "toux productive depuis 3 jours",
  "symptoms": ["cough", "fever", "dyspnoea"],
  "age": 45,
  "sex": "male"
}
```

**Expected Output**:
```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Community-Acquired Pneumonia (CAP)",
      "severity": "Mild"
    }
  },
  "investigation_strategy": {
    "laboratory_tests": [
      {
        "test_name": "Chest X-ray",
        "timing": "Within 24-48 hours",
        "urgency": "routine",
        "location": "Patient to attend local radiology clinic"
      }
    ]
  },
  "treatment_plan": {
    "medications": [
      {
        "drug": "Amoxicillin 500mg TDS",
        "duration": "5 days",
        "route": "Oral"
      }
    ],
    "follow_up": "Phone consultation in 48 hours"
  }
}
```

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1: Modifications Code (2 heures)

- [ ] ✅ Modifier `interface PatientContext` (ligne 9-43)
- [ ] ✅ Ajouter fonction `CONSULTATION_CONTEXT_PROMPT`
- [ ] ✅ Intégrer dans `systemPrompt` (POST function)
- [ ] ✅ Commit: "feat: Add consultation_context for teleconsultation vs emergency adaptation"

### Phase 2: Tests (2 heures)

- [ ] ✅ Test ACS téléconsultation → Doit dire "CALL AMBULANCE"
- [ ] ✅ Test ACS urgences → Doit donner protocole STAT complet
- [ ] ✅ Test pneumonie téléconsultation → Traitement ambulatoire normal
- [ ] ✅ Vérifier JSON valide pour tous les cas

### Phase 3: Documentation (30 min)

- [ ] ✅ Documenter dans README.md
- [ ] ✅ Ajouter exemples dans WORKFLOWS_DOCUMENTATION.md

---

## 🎯 RÉSULTAT ATTENDU

### Avant (Problème)

```
Patient téléconsultation avec ACS:
→ GPT-4 prescrit "Aspirin 300mg STAT, Ticagrelor 180mg STAT..."
→ ❌ IMPOSSIBLE: Patient à domicile!

Patient urgences avec ACS:
→ GPT-4 dit "Référence urgence immédiate"
→ ❌ PAS ASSEZ: Patient est déjà à l'hôpital!
```

### Après (Solution)

```
Patient téléconsultation avec ACS:
→ GPT-4 détecte urgence
→ ✅ "⚠️⚠️⚠️ CALL AMBULANCE NOW - SAMU 114"
→ ✅ "If Aspirin at home: chew one tablet while waiting"
→ ✅ Pas de protocole hospitalier

Patient urgences avec ACS:
→ GPT-4 active mode EMERGENCY
→ ✅ "ECG STAT, Troponin T0/T1h/T3h"
→ ✅ "Aspirin 300mg STAT, Ticagrelor 180mg STAT, Fondaparinux 2.5mg SC"
→ ✅ "Contact cardio NOW, PCI within 24h"
→ ✅ Protocole hospitalier COMPLET
```

---

## 💬 CONCLUSION

**Cette modification est CRITIQUE et SIMPLE.**

**Temps**: 2-3 heures  
**Impact**: ÉNORME (cohérence clinique totale)  
**Complexité**: FAIBLE (juste ajouter contexte dans prompt)

**À faire MAINTENANT avant tout le reste.**

---

**Repository**: https://github.com/stefbach/AI-DOCTOR  
**Status**: Spécification technique complète - PRÊT pour implémentation  
**Priorité**: 🔴 CRITIQUE

🎯 **CONSULTATION_CONTEXT = Adaptation intelligente Téléconsultation vs Urgences** 🎯
