# 🏥 DESCRIPTION EXACTE DES 3 OPTIONS DE CONTEXTE CONSULTATION

**Date**: 2 Janvier 2026  
**Objectif**: Expliquer clairement les 3 modes de consultation du système AI-DOCTOR  
**Repository**: https://github.com/stefbach/AI-DOCTOR

---

## 🎯 VUE D'ENSEMBLE

Le système AI-DOCTOR doit s'adapter à **3 contextes de consultation différents** :

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  OPTION 1: TÉLÉCONSULTATION                            │
│  (Patient à domicile, médecin à distance)              │
│                                                         │
│  OPTION 2: SERVICE D'URGENCES                          │
│  (Patient à l'hôpital, urgences)                       │
│                                                         │
│  OPTION 3: RÉFÉRENCE SPÉCIALISÉE                       │
│  (Orientation vers un spécialiste)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 📱 OPTION 1: TÉLÉCONSULTATION

## Définition

**Patient à domicile** consultant un médecin à distance (vidéo, téléphone, app mobile).

## Caractéristiques Techniques

```typescript
{
  consultation_context: {
    setting: "teleconsultation",
    location: "Patient at home",
    access_to_investigations: false,  // Pas d'accès immédiat aux examens
    access_to_iv_medications: false   // Pas de médicaments IV
  }
}
```

## Capacités du Système

### ✅ CE QUE GPT-4 PEUT FAIRE

1. **Évaluation Clinique Complète**
   - Analyse des symptômes
   - Diagnostic différentiel
   - Évaluation de la gravité
   - Identification des red flags

2. **Prescriptions Ambulatoires Simples**
   - Médicaments oraux uniquement
   - Dosages pour prise à domicile
   - Renouvellement d'ordonnances chroniques

3. **Examens de Laboratoire à Programmer**
   - Bilans sanguins (patient ira au labo)
   - Imageries (orientation vers radiologie)
   - Tests spécifiques non urgents

4. **Éducation du Patient**
   - Conseils lifestyle
   - Surveillance des symptômes
   - Signes d'alerte

### ❌ CE QUE GPT-4 NE DOIT PAS FAIRE

1. **Pas de Protocoles d'Urgence Hospitaliers**
   - Pas de "Aspirin 300mg STAT"
   - Pas de "Troponin T0/T1h/T3h"
   - Pas de "Morphine IV"

2. **Pas d'Examens Immédiats**
   - Pas de "STAT ECG"
   - Pas de "Immediate troponin"
   - Pas de "Urgent CT scan"

3. **Pas de Médicaments IV ou STAT**
   - Pas de médicaments d'urgence
   - Pas d'injections immédiates

---

## Exemple Concret 1: Pneumonie Simple

### Input
```json
{
  "consultation_context": {
    "setting": "teleconsultation"
  },
  "chief_complaint": "toux productive depuis 3 jours",
  "symptoms": ["toux", "fièvre 38.5°C", "dyspnée légère"],
  "vital_signs": {
    "temperature": "38.5",
    "oxygen_saturation": "96%"
  }
}
```

### Output GPT-4 (Adapté pour Téléconsultation)

```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Community-Acquired Pneumonia (CAP)",
      "icd_code": "J18.9",
      "severity": "Mild",
      "confidence": "80%"
    }
  },
  
  "investigation_strategy": {
    "clinical_justification": "Mild pneumonia can be managed in community with oral antibiotics. Chest X-ray to confirm diagnosis.",
    "laboratory_tests": [
      {
        "test_name": "Chest X-ray (posteroanterior and lateral)",
        "timing": "Within 24-48 hours",
        "urgency": "routine",
        "location": "Patient to attend local radiology clinic",
        "justification": "Confirm pneumonia, rule out complications"
      },
      {
        "test_name": "Full Blood Count (FBC)",
        "timing": "Within 24 hours",
        "urgency": "routine",
        "location": "Patient to attend laboratory",
        "justification": "Check white cell count and inflammatory markers"
      }
    ]
  },
  
  "treatment_plan": {
    "approach": "Oral antibiotics with home monitoring. No hospital admission required.",
    "medications": [
      {
        "drug": "Amoxicillin 500mg",
        "dosage": "500mg three times daily (TDS)",
        "duration": "5 days",
        "route": "Oral",
        "dci": "Amoxicillin",
        "uk_format": "500mg TDS",
        "justification": "First-line antibiotic for CAP per BNF 2024"
      },
      {
        "drug": "Paracetamol 1g",
        "dosage": "1g four times daily (QDS) when needed",
        "duration": "As needed",
        "route": "Oral",
        "dci": "Paracetamol",
        "uk_format": "1g QDS PRN",
        "justification": "Fever and pain management"
      }
    ]
  },
  
  "follow_up_plan": {
    "red_flags": "⚠️ Seek emergency care if: breathing difficulty worsens, oxygen saturation drops below 92%, confusion, chest pain, fever >39°C persistent after 48h",
    "routine_follow_up": "Phone consultation in 48 hours to assess response to antibiotics",
    "specialist_referral": {
      "required": false
    }
  }
}
```

### Rapport Généré

```markdown
# TELECONSULTATION REPORT

**Date**: 2 January 2026  
**Consultation Type**: Remote Teleconsultation

## DIAGNOSIS
**Community-Acquired Pneumonia (Mild)**

## TREATMENT PLAN

### Antibiotics
- **Amoxicillin 500mg** - Take 3 times daily for 5 days
- Complete the full course even if feeling better

### Fever Management
- **Paracetamol 1g** - Take up to 4 times daily when needed
- Maximum 4g per day

## INVESTIGATIONS TO ARRANGE

Please arrange these tests at your local clinic/laboratory:

1. **Chest X-ray** - Within 24-48 hours
   - Location: Local radiology clinic
   - To confirm pneumonia diagnosis

2. **Blood Test (FBC)** - Within 24 hours
   - Location: Local laboratory
   - To check infection markers

## HOME MONITORING

Monitor yourself daily:
- Temperature (record twice daily)
- Breathing rate
- General condition

## ⚠️ RED FLAGS - SEEK EMERGENCY CARE IF:
- Breathing difficulty worsens
- Oxygen saturation drops below 92% (if you have a pulse oximeter)
- Confusion or drowsiness
- Chest pain
- Fever >39°C persistent after 48 hours of antibiotics

## FOLLOW-UP
Phone consultation in 48 hours to check response to treatment.

---

📱 This is a TELECONSULTATION report
Patient location: Home
No hospital admission required
```

---

## Exemple Concret 2: ACS Suspecté (URGENCE)

### Input
```json
{
  "consultation_context": {
    "setting": "teleconsultation"
  },
  "chief_complaint": "douleur thoracique importante",
  "symptoms": ["chest pain radiating to left arm", "sweating", "dyspnoea"],
  "vital_signs": {
    "blood_pressure": "160/95",
    "pulse": "110"
  }
}
```

### Output GPT-4 (Adapté pour Téléconsultation)

```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Suspected Acute Coronary Syndrome (ACS)",
      "icd_code": "I24.9",
      "severity": "EMERGENCY",
      "confidence": "High probability"
    },
    "red_flags": "⚠️⚠️⚠️ CARDIAC EMERGENCY - Classic angina symptoms with radiation to arm"
  },
  
  "investigation_strategy": {
    "clinical_justification": "⚠️ EMERGENCY - This patient requires IMMEDIATE hospital assessment. DO NOT attempt home investigations.",
    "laboratory_tests": [],  // Vide car urgence
    "imaging_studies": []    // Vide car urgence
  },
  
  "treatment_plan": {
    "approach": "⚠️⚠️⚠️ IMMEDIATE EMERGENCY TRANSFER - DO NOT ATTEMPT HOME TREATMENT",
    "medications": [],  // Vide car urgence hospitalière
    "emergency_actions": [
      "Call ambulance immediately - SAMU 114 (Mauritius) or 15 (France)",
      "Do NOT drive to hospital",
      "Patient should sit upright or semi-recumbent",
      "Loosen tight clothing",
      "If Aspirin 300mg available at home and patient not allergic: chew ONE tablet while waiting for ambulance",
      "Stay with patient until ambulance arrives"
    ]
  },
  
  "follow_up_plan": {
    "immediate": "⚠️ CALL AMBULANCE NOW - Do not wait",
    "specialist_referral": {
      "required": true,
      "specialty": "Emergency Medicine / Cardiology",
      "urgency": "emergency",
      "timeframe": "IMMEDIATE (within minutes)",
      "reason": "Suspected ACS requiring emergency hospital assessment with ECG, troponin, and possible PCI"
    }
  }
}
```

### Rapport Généré

```markdown
# TELECONSULTATION REPORT - EMERGENCY

⚠️⚠️⚠️ **URGENT MEDICAL EMERGENCY** ⚠️⚠️⚠️

**Date**: 2 January 2026  
**Consultation Type**: Remote Teleconsultation

## 🚨 SUSPECTED DIAGNOSIS
**Acute Coronary Syndrome (Heart Attack)**

## 🚨 IMMEDIATE ACTION REQUIRED

### CALL AMBULANCE NOW
- **Mauritius**: SAMU 114 or 999
- **France**: SAMU 15
- **UK**: 999

### DO NOT WAIT - DO NOT DRIVE TO HOSPITAL

## EMERGENCY INSTRUCTIONS (While Waiting for Ambulance)

1. **Position**: Sit upright or semi-recumbent (half-sitting)
2. **Clothing**: Loosen any tight clothing
3. **Aspirin**: If you have Aspirin 300mg at home and are NOT allergic:
   - Chew ONE tablet (do not swallow whole)
   - This may reduce heart damage
4. **Stay Calm**: Someone should stay with you until ambulance arrives
5. **Prepare**: Have your medications list ready for paramedics

## WHAT WILL HAPPEN AT THE HOSPITAL

The emergency team will:
- Perform urgent ECG (heart tracing)
- Blood tests (Troponin to detect heart damage)
- Immediate cardiology assessment
- Possible emergency coronary angiography (PCI)
- Medications to prevent further heart damage

## ⚠️ THIS CONDITION CANNOT BE SAFELY MANAGED AT HOME

This is a **TIME-CRITICAL EMERGENCY**. Every minute counts for heart muscle survival.

---

📱 This is a TELECONSULTATION report  
Patient location: Home  
**Recommendation: IMMEDIATE EMERGENCY TRANSFER**  

🚨 DO NOT DELAY - CALL AMBULANCE NOW 🚨
```

---

# 🏥 OPTION 2: SERVICE D'URGENCES

## Définition

**Patient présent à l'hôpital** dans le service d'urgences avec accès immédiat aux examens et médicaments.

## Caractéristiques Techniques

```typescript
{
  consultation_context: {
    setting: "emergency_department",
    location: "Emergency room",
    access_to_investigations: true,   // Accès immédiat aux examens
    access_to_iv_medications: true    // Médicaments IV disponibles
  }
}
```

## Capacités du Système

### ✅ CE QUE GPT-4 PEUT FAIRE

1. **Protocoles d'Urgence Complets**
   - STAT medications (Aspirin, Ticagrelor, Morphine)
   - Timing précis (T0/T1h/T3h)
   - Dosages d'urgence (loading doses)

2. **Examens Immédiats**
   - ECG 12 dérivations STAT
   - Troponin hs T0/T1h/T3h
   - Scanner d'urgence
   - Échographies

3. **Médicaments IV et Parentéraux**
   - Morphine IV
   - Anticoagulants SC/IV
   - Antibiotiques IV

4. **Monitoring Hospitalier**
   - Surveillance continue
   - Admission CCU/ICU
   - Protocoles de monitoring

---

## Exemple Concret: ACS aux Urgences

### Input
```json
{
  "consultation_context": {
    "setting": "emergency_department",
    "location": "Emergency room",
    "access_to_investigations": true,
    "access_to_iv_medications": true
  },
  "chief_complaint": "douleur thoracique importante",
  "symptoms": ["chest pain radiating to left arm", "sweating", "dyspnoea"],
  "vital_signs": {
    "blood_pressure": "160/95",
    "pulse": "110",
    "oxygen_saturation": "97%"
  }
}
```

### Output GPT-4 (Adapté pour Urgences)

```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Acute Coronary Syndrome (ACS) - NSTEMI/STEMI to be confirmed",
      "icd_code": "I24.9",
      "severity": "EMERGENCY",
      "confidence": "High probability - requires immediate ECG and troponin"
    }
  },
  
  "investigation_strategy": {
    "clinical_justification": "Emergency ACS protocol. Immediate ECG and troponin to differentiate STEMI from NSTEMI. PCI consideration based on ECG findings.",
    
    "immediate_investigations": [
      {
        "test_name": "12-lead ECG",
        "timing": "STAT (immediate - within 10 minutes)",
        "urgency": "STAT",
        "interpretation_guide": "• ST elevation ≥1mm in ≥2 contiguous leads = STEMI → Immediate PCI (target <120 min)\n• ST depression or T-wave inversion = NSTEMI → Troponin-based diagnosis\n• New LBBB with chest pain = STEMI equivalent"
      },
      {
        "test_name": "High-Sensitivity Troponin T",
        "timing": "T0 (immediately), T1h (1 hour), T3h (3 hours)",
        "urgency": "STAT",
        "interpretation_guide": "• Baseline >14 ng/L = abnormal\n• Δ (change) >50% = acute MI\n• Rule-out if T0 <5 ng/L and Δ <2 ng/L at 1h"
      },
      {
        "test_name": "U&E + eGFR",
        "timing": "STAT",
        "justification": "Renal function for anticoagulation dosing (Fondaparinux/Enoxaparin)"
      },
      {
        "test_name": "Lipid Profile (Total cholesterol, HDL, LDL, Triglycerides)",
        "timing": "STAT",
        "justification": "Baseline lipids for statin therapy"
      },
      {
        "test_name": "HbA1c + Random Glucose",
        "timing": "STAT",
        "justification": "Assess diabetes control"
      },
      {
        "test_name": "Full Blood Count (FBC)",
        "timing": "STAT",
        "justification": "Baseline hemoglobin before anticoagulation"
      },
      {
        "test_name": "Coagulation Screen (PT/INR, APTT)",
        "timing": "STAT",
        "justification": "Baseline before anticoagulation therapy"
      },
      {
        "test_name": "Chest X-ray (posteroanterior)",
        "timing": "Within 1 hour",
        "justification": "Rule out pulmonary edema, pneumothorax, aortic dissection"
      }
    ]
  },
  
  "treatment_plan": {
    "approach": "⚠️ EMERGENCY ACS PROTOCOL per ESC Guidelines 2024. Dual antiplatelet therapy (DAPT) + anticoagulation + statin. PCI consideration based on ECG/troponin.",
    
    "immediate_medications": [
      {
        "drug": "Aspirin 300mg",
        "timing": "STAT (loading dose)",
        "route": "Oral (chew and swallow) or IV if unable to swallow",
        "dci": "Aspirin (Acetylsalicylic acid)",
        "uk_format": "300mg STAT",
        "justification": "Immediate antiplatelet therapy per ESC 2024 Guidelines",
        "safety_checks": "✅ No active bleeding, ✅ No aspirin allergy"
      },
      {
        "drug": "Ticagrelor 180mg",
        "timing": "STAT (loading dose)",
        "route": "Oral",
        "dci": "Ticagrelor",
        "uk_format": "180mg STAT",
        "justification": "Dual antiplatelet therapy (DAPT). Preferred over Clopidogrel per PLATO trial - 21% reduction in CV death",
        "safety_checks": "✅ No active bleeding, ✅ No prior ICH"
      },
      {
        "drug": "Fondaparinux 2.5mg",
        "timing": "STAT (subcutaneous)",
        "route": "Subcutaneous injection",
        "dci": "Fondaparinux sodium",
        "uk_format": "2.5mg SC STAT, then OD",
        "justification": "Anticoagulation - preferred over Enoxaparin per OASIS-5 trial (lower bleeding risk)",
        "safety_checks": "✅ eGFR >20 ml/min, ✅ No active bleeding",
        "alternative": "If eGFR <20: Enoxaparin 1mg/kg SC BD"
      },
      {
        "drug": "Morphine 2.5-5mg IV",
        "timing": "If severe chest pain persists",
        "route": "Intravenous (slow push over 2-3 minutes)",
        "dci": "Morphine sulfate",
        "uk_format": "2.5-5mg IV PRN",
        "justification": "Analgesia for severe chest pain",
        "safety_checks": "⚠️ Monitor respiratory rate, ⚠️ Naloxone available",
        "caution": "May delay P2Y12 inhibitor absorption"
      },
      {
        "drug": "Atorvastatin 80mg",
        "timing": "STAT (high-intensity statin)",
        "route": "Oral",
        "dci": "Atorvastatin calcium",
        "uk_format": "80mg STAT then OD",
        "justification": "High-intensity statin per ESC 2024. Target LDL <1.4 mmol/L",
        "safety_checks": "✅ LFTs baseline, ⚠️ Monitor for myopathy"
      }
    ],
    
    "ongoing_management": [
      {
        "drug": "Bisoprolol 2.5mg",
        "timing": "Once stable (after 24h if no acute heart failure)",
        "route": "Oral",
        "dci": "Bisoprolol fumarate",
        "uk_format": "2.5mg OD (start low, titrate up)",
        "justification": "Beta-blocker for secondary prevention",
        "target_dose": "10mg OD (titrate over weeks)"
      },
      {
        "drug": "Ramipril 2.5mg",
        "timing": "Once stable (if LVEF <40% or heart failure)",
        "route": "Oral",
        "dci": "Ramipril",
        "uk_format": "2.5mg OD (start low, titrate up)",
        "justification": "ACE inhibitor for LV dysfunction",
        "target_dose": "10mg OD (titrate over weeks)"
      }
    ],
    
    "contraindicated_medications": [
      {
        "drug": "NSAIDs (Ibuprofen, Diclofenac, Naproxen)",
        "reason": "⚠️ CONTRAINDICATED in ACS - Increase CV mortality and recurrent MI risk per ESC 2024",
        "alternative": "Use Paracetamol 1g QDS for pain if needed"
      },
      {
        "drug": "COX-2 Inhibitors (Celecoxib, Etoricoxib)",
        "reason": "⚠️ CONTRAINDICATED in ACS - Increase thrombotic risk",
        "alternative": "Use Paracetamol"
      }
    ]
  },
  
  "monitoring_plan": {
    "immediate": [
      "Continuous cardiac monitoring (telemetry)",
      "Vital signs every 15 minutes for first hour",
      "Oxygen therapy if SpO2 <94%",
      "IV access × 2 (large bore)"
    ],
    "serial_assessments": [
      "Troponin hs at T0, T1h, T3h",
      "12-lead ECG every 30 minutes if ongoing chest pain",
      "Clinical reassessment hourly"
    ]
  },
  
  "follow_up_plan": {
    "admission": {
      "ward": "Coronary Care Unit (CCU) or High Dependency Unit (HDU)",
      "duration": "Minimum 24-48 hours for serial troponins and monitoring"
    },
    "specialist_referral": {
      "required": true,
      "specialty": "Cardiology",
      "urgency": "emergency",
      "timeframe": "IMMEDIATE - Contact on-call cardiologist now",
      "reason": "ACS requiring risk stratification and PCI consideration",
      "actions": [
        "If STEMI: Immediate PCI (target door-to-balloon <120 min)",
        "If NSTEMI high-risk (GRACE >140): PCI within 24 hours",
        "If NSTEMI intermediate-risk: PCI within 72 hours",
        "Echocardiography to assess LV function"
      ]
    }
  }
}
```

### Rapport Généré

```markdown
# EMERGENCY DEPARTMENT REPORT

⚠️ **ACUTE CORONARY SYNDROME - EMERGENCY PROTOCOL ACTIVATED** ⚠️

**Date**: 2 January 2026  
**Location**: Emergency Department  
**Protocol**: ACS Emergency Management per ESC Guidelines 2024

---

## DIAGNOSIS
**Acute Coronary Syndrome (ACS) - STEMI/NSTEMI to be confirmed**

## 🚨 IMMEDIATE ACTIONS (STAT)

### Priority 1: Urgent Investigations (Within 10 minutes)

1. **12-lead ECG** - STAT
   - **Interpretation Guide**:
     - ST elevation ≥1mm in ≥2 contiguous leads = **STEMI** → Immediate PCI (<120 min)
     - ST depression or T-wave inversion = **NSTEMI** → Troponin-based diagnosis
     - New LBBB with chest pain = STEMI equivalent

2. **High-Sensitivity Troponin T**
   - **T0 (now)**: Immediate
   - **T1h (1 hour)**: Repeat in 1 hour
   - **T3h (3 hours)**: Repeat in 3 hours
   - **Interpretation**: Δ >50% = Acute MI

### Priority 2: Emergency Medications (STAT)

✅ **GIVE IMMEDIATELY:**

1. **Aspirin 300mg** - STAT
   - Route: Oral (chew and swallow) or IV
   - Rationale: Immediate antiplatelet therapy

2. **Ticagrelor 180mg** - STAT
   - Route: Oral
   - Rationale: Dual antiplatelet therapy (DAPT)
   - Note: Preferred over Clopidogrel (21% reduction in CV death)

3. **Fondaparinux 2.5mg** - STAT
   - Route: Subcutaneous injection
   - Rationale: Anticoagulation (lower bleeding risk than Enoxaparin)
   - Check: eGFR >20 ml/min

4. **Morphine 2.5-5mg IV** - If severe pain
   - Route: IV slow push over 2-3 minutes
   - Caution: Monitor respiratory rate, Naloxone available

5. **Atorvastatin 80mg** - STAT
   - Route: Oral
   - Rationale: High-intensity statin (target LDL <1.4 mmol/L)

---

## LABORATORY TESTS (STAT)

Send immediately:
- ✅ Troponin hs (T0, T1h, T3h)
- ✅ U&E + eGFR (for anticoagulation dosing)
- ✅ Lipid Profile (baseline for statin therapy)
- ✅ HbA1c + Glucose (assess diabetes)
- ✅ Full Blood Count (FBC)
- ✅ Coagulation Screen (PT/INR, APTT)

## IMAGING

- ✅ Chest X-ray (within 1 hour) - Rule out pulmonary edema, pneumothorax, aortic dissection

---

## ⚠️ CONTRAINDICATED MEDICATIONS

**DO NOT GIVE:**
- ❌ NSAIDs (Ibuprofen, Diclofenac) - Increase CV mortality in ACS
- ❌ COX-2 Inhibitors (Celecoxib) - Increase thrombotic risk
- ✅ Alternative for pain: Paracetamol 1g QDS

---

## MONITORING

### Immediate Monitoring
- Continuous cardiac monitoring (telemetry)
- Vital signs every 15 minutes for first hour
- Oxygen therapy if SpO2 <94%
- IV access × 2 (large bore)

### Serial Assessments
- Troponin hs at T0, T1h, T3h
- 12-lead ECG every 30 minutes if ongoing chest pain
- Clinical reassessment hourly

---

## CARDIOLOGY REFERRAL - EMERGENCY

**Contact on-call cardiologist immediately**

### Actions Based on ECG/Troponin:
- **If STEMI**: Immediate PCI (target door-to-balloon <120 minutes)
- **If NSTEMI high-risk (GRACE >140)**: PCI within 24 hours
- **If NSTEMI intermediate-risk**: PCI within 72 hours
- **Echocardiography**: Assess LV function

---

## ADMISSION

**Coronary Care Unit (CCU) or High Dependency Unit (HDU)**
- Duration: Minimum 24-48 hours for serial troponins and monitoring

---

## DISCHARGE MEDICATIONS (Once Stabilized)

1. Aspirin 75mg OD (lifelong)
2. Ticagrelor 90mg BD (12 months minimum)
3. Atorvastatin 80mg OD (lifelong)
4. Bisoprolol 2.5mg OD (titrate to 10mg)
5. Ramipril 2.5mg OD if LVEF <40% (titrate to 10mg)

---

⚠️ This is an EMERGENCY DEPARTMENT report  
Patient location: Emergency Room  
Protocol: Full ACS Emergency Management per ESC 2024  
Time-critical condition: Every minute counts
```

---

# 🩺 OPTION 3: RÉFÉRENCE SPÉCIALISÉE

## Définition

**Orientation du patient vers un spécialiste** pour évaluation ou prise en charge spécifique.

## Caractéristiques Techniques

```typescript
{
  specialist_referral: {
    required: true,
    specialty: "Cardiology" | "Neurology" | "Endocrinology" | "Gastroenterology" | ...,
    urgency: "emergency" | "urgent" | "routine",
    timeframe: "IMMEDIATE" | "Within 24h" | "Within 1 week" | "Within 4 weeks",
    reason: "Detailed clinical reason for referral",
    investigations_before_referral: [
      // Examens à faire AVANT la consultation spécialisée
    ]
  }
}
```

## Niveaux d'Urgence

### 1. Emergency (URGENCE)
```typescript
{
  specialty: "Cardiology",
  urgency: "emergency",
  timeframe: "IMMEDIATE (within minutes)",
  reason: "Suspected ACS requiring immediate PCI"
}
```

**Exemples**:
- ACS (Acute Coronary Syndrome)
- Stroke
- Acute abdomen requiring surgery
- Severe pulmonary embolism

### 2. Urgent
```typescript
{
  specialty: "Neurology",
  urgency: "urgent",
  timeframe: "Within 24-48 hours",
  reason: "Suspected TIA requiring stroke prevention"
}
```

**Exemples**:
- TIA (Transient Ischemic Attack)
- New seizure
- Severe uncontrolled hypertension
- Rapid weight loss with malignancy concern

### 3. Routine
```typescript
{
  specialty: "Endocrinology",
  urgency: "routine",
  timeframe: "Within 4-6 weeks",
  reason: "Difficult to control Type 2 diabetes despite optimal oral therapy"
}
```

**Exemples**:
- Difficult-to-control diabetes
- Thyroid nodule
- Chronic stable conditions
- Screening follow-ups

---

## Exemple Concret: Référence Cardio Urgente

### Cas: Patient avec TIA (Mini-AVC)

**Input**:
```json
{
  "consultation_context": {
    "setting": "general_practice"
  },
  "chief_complaint": "épisode de faiblesse bras droit ce matin",
  "symptoms": [
    "right arm weakness for 30 minutes (resolved)",
    "difficulty speaking (resolved)",
    "no current symptoms"
  ],
  "vital_signs": {
    "blood_pressure": "165/95"
  }
}
```

**Output GPT-4**:

```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Transient Ischaemic Attack (TIA)",
      "icd_code": "G45.9",
      "severity": "URGENT",
      "confidence": "High - classic TIA presentation"
    },
    "differential_diagnoses": [
      {
        "condition": "Stroke (ischaemic)",
        "probability": "20%",
        "reasoning": "Symptoms resolved but stroke risk very high in next 48h"
      }
    ]
  },
  
  "investigation_strategy": {
    "clinical_justification": "TIA is a stroke warning. High risk of completed stroke within 48 hours (ABCD2 score likely high). Urgent imaging and specialist assessment required.",
    
    "investigations_before_referral": [
      {
        "test_name": "CT Brain (non-contrast)",
        "timing": "Within 24 hours (before neurology appointment)",
        "urgency": "urgent",
        "justification": "Rule out hemorrhage or early ischemic changes"
      },
      {
        "test_name": "Carotid Doppler Ultrasound",
        "timing": "Within 48 hours",
        "urgency": "urgent",
        "justification": "Assess carotid stenosis (may require urgent endarterectomy if >70%)"
      },
      {
        "test_name": "ECG 12-lead",
        "timing": "Immediate (in clinic today)",
        "urgency": "urgent",
        "justification": "Rule out atrial fibrillation (cardioembolic source)"
      },
      {
        "test_name": "Full Blood Count + ESR",
        "timing": "Within 24 hours",
        "justification": "Rule out polycythemia, thrombocytosis"
      },
      {
        "test_name": "Lipid Profile + HbA1c",
        "timing": "Within 24 hours",
        "justification": "Assess vascular risk factors"
      }
    ]
  },
  
  "treatment_plan": {
    "approach": "Immediate stroke prevention while awaiting urgent neurology assessment",
    
    "medications": [
      {
        "drug": "Aspirin 300mg",
        "timing": "STAT (loading dose)",
        "duration": "Continue daily until specialist review",
        "dci": "Aspirin",
        "uk_format": "300mg STAT, then 75mg OD",
        "justification": "Immediate antiplatelet therapy to prevent stroke recurrence per NICE Guidelines"
      },
      {
        "drug": "Atorvastatin 80mg",
        "timing": "Start immediately",
        "duration": "Ongoing",
        "dci": "Atorvastatin",
        "uk_format": "80mg OD",
        "justification": "High-intensity statin for stroke prevention"
      }
    ]
  },
  
  "follow_up_plan": {
    "red_flags": "⚠️ Call 999/SAMU immediately if: new weakness, speech difficulty, facial droop, vision loss, severe headache, confusion",
    
    "specialist_referral": {
      "required": true,
      "specialty": "Neurology / Stroke Medicine",
      "urgency": "urgent",
      "timeframe": "Within 24 hours",
      "reason": "TIA requiring urgent stroke prevention. High risk of completed stroke within 48 hours (estimated ABCD2 score ≥4).",
      
      "clinical_details_for_specialist": {
        "abcd2_score": "Estimated ≥4 (Age ≥60: 1pt, BP 165/95: 1pt, Clinical features unilateral weakness + speech: 2pts, Duration 30min: 1pt)",
        "stroke_risk": "High risk - 8-12% within 7 days without urgent intervention",
        "investigations_arranged": [
          "CT Brain within 24h",
          "Carotid Doppler within 48h",
          "ECG done today",
          "Blood tests sent"
        ],
        "medications_started": [
          "Aspirin 300mg STAT, then 75mg OD",
          "Atorvastatin 80mg OD"
        ]
      },
      
      "actions_required_by_specialist": [
        "Review imaging (CT brain, carotid doppler)",
        "Consider MRI brain + DWI if diagnosis uncertain",
        "Consider echocardiography if AF suspected",
        "Assess for carotid endarterectomy if stenosis >70%",
        "Consider dual antiplatelet therapy (Aspirin + Clopidogrel) for 21 days",
        "Long-term secondary prevention plan"
      ]
    }
  }
}
```

**Rapport de Référence Généré**:

```markdown
# URGENT SPECIALIST REFERRAL

**Date**: 2 January 2026  
**Referral to**: Neurology / Stroke Medicine  
**Urgency**: URGENT (Within 24 hours)

---

## REFERRAL REASON
**Transient Ischaemic Attack (TIA) - High Stroke Risk**

Patient presented with:
- Right arm weakness (30 minutes duration, now resolved)
- Speech difficulty (resolved)
- No current neurological deficit

---

## CLINICAL URGENCY

⚠️ **HIGH STROKE RISK**

**ABCD2 Score**: Estimated ≥4
- Age ≥60: 1 point
- BP 165/95: 1 point
- Clinical features (unilateral weakness + speech): 2 points
- Duration 30 minutes: 1 point

**Stroke Risk**: 8-12% within 7 days without urgent intervention

---

## INVESTIGATIONS ARRANGED BEFORE APPOINTMENT

✅ **Arranged**:
1. CT Brain (non-contrast) - Urgent, within 24 hours
2. Carotid Doppler Ultrasound - Urgent, within 48 hours
3. ECG 12-lead - Done today (awaiting result)
4. Blood tests sent:
   - Full Blood Count + ESR
   - Lipid Profile + HbA1c

---

## MEDICATIONS STARTED

1. **Aspirin**
   - Loading dose 300mg given today
   - Continuing 75mg daily

2. **Atorvastatin 80mg** daily
   - High-intensity statin for stroke prevention

---

## ACTIONS REQUIRED BY SPECIALIST

Please assess for:
1. Review CT brain and carotid doppler results
2. Consider MRI brain + DWI if diagnosis uncertain
3. Assess for carotid endarterectomy if stenosis >70%
4. Consider echocardiography if atrial fibrillation suspected
5. Dual antiplatelet therapy decision (Aspirin + Clopidogrel for 21 days)
6. Long-term secondary stroke prevention plan

---

## PATIENT INFORMATION

Patient has been advised:
- ⚠️ Call 999/SAMU immediately if: new weakness, speech difficulty, facial droop, vision loss, severe headache, confusion
- Continue Aspirin 75mg and Atorvastatin 80mg daily
- Attend urgent neurology appointment within 24 hours

---

**Referring Physician**: Dr. [Name]  
**Contact**: [Phone/Email]  
**Urgency**: URGENT - Within 24 hours
```

---

# 📊 TABLEAU COMPARATIF DES 3 OPTIONS

| Critère | TÉLÉCONSULTATION | URGENCES | RÉFÉRENCE SPÉCIALISÉE |
|---------|------------------|----------|----------------------|
| **Setting** | Patient à domicile | Patient à l'hôpital | Orientation vers spécialiste |
| **Examens immédiats** | ❌ Non (à programmer) | ✅ Oui (STAT) | Selon urgence |
| **Médicaments IV** | ❌ Non | ✅ Oui | Non pertinent |
| **Protocoles urgence** | ❌ Référence si urgence | ✅ Protocoles complets | Selon urgence |
| **Timing examens** | "Dans 24-48h" | "STAT" / "T0/T1h/T3h" | "Avant consultation" |
| **Prescriptions** | Ambulatoires simples | Hospitalières complètes | Pré-spécialiste |
| **Exemple rapport** | "Appeler ambulance" | "STAT Aspirin 300mg" | "Urgent référence neuro" |

---

# 🎯 INTÉGRATION DANS LE CODE

## Structure TypeScript

```typescript
interface ConsultationContext {
  // OPTION 1, 2 ou 3
  setting: 'teleconsultation' | 'emergency_department' | 'general_practice' | 'hospital_ward'
  
  // Localisation patient
  location: string  // "Patient at home" | "Emergency room" | "Hospital ward"
  
  // Capacités disponibles
  access_to_investigations: boolean  // false = téléconsultation, true = urgences
  access_to_iv_medications: boolean  // false = ambulatoire, true = hospitalier
}

interface SpecialistReferral {
  required: boolean
  specialty?: 'Cardiology' | 'Neurology' | 'Endocrinology' | 'Gastroenterology' | 'Orthopedics' | 'Rheumatology' | 'Dermatology' | 'ENT' | 'Ophthalmology'
  urgency?: 'emergency' | 'urgent' | 'routine'
  timeframe?: string  // "IMMEDIATE" | "Within 24h" | "Within 1 week" | "Within 4 weeks"
  reason?: string
  investigations_before_referral?: Array<{
    test_name: string
    timing: string
    justification: string
  }>
  actions_required_by_specialist?: string[]
}
```

---

# ✅ RÉSUMÉ FINAL

## Les 3 Options Expliquées Simplement

### 📱 OPTION 1: TÉLÉCONSULTATION
- **Patient**: À domicile
- **GPT-4 fait**: Diagnostic + prescriptions ambulatoires simples
- **GPT-4 NE fait PAS**: Protocoles urgences, examens STAT, médicaments IV
- **Si urgence détectée**: "Appeler ambulance" + référence urgences

### 🏥 OPTION 2: URGENCES
- **Patient**: À l'hôpital (urgences)
- **GPT-4 fait**: Protocoles urgences complets + examens STAT + médicaments IV
- **Exemples**: "Aspirin 300mg STAT", "Troponin T0/T1h/T3h", "Morphine IV"

### 🩺 OPTION 3: RÉFÉRENCE SPÉCIALISÉE
- **Objectif**: Orienter vers spécialiste (cardio, neuro, etc.)
- **GPT-4 fait**: Évaluation + examens pré-spécialiste + référence détaillée
- **Urgence**: emergency / urgent / routine selon gravité

---

**Repository**: https://github.com/stefbach/AI-DOCTOR  
**Commit**: À venir (implémentation)  
**Date**: 2 Janvier 2026  
**Statut**: Spécification complète - Prêt pour implémentation

🎯 **GPT-4 DOIT S'ADAPTER AU CONTEXTE MÉDICAL RÉEL** 🎯
