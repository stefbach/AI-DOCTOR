# 🏥 SOLUTION CONTEXTE - Téléconsultation vs Urgences

**Date**: 1er Janvier 2026  
**Priorité**: 🔴 **IMPORTANTE**  
**Statut**: 📋 **SPÉCIFICATION**

---

## 🎯 PRINCIPE CORRECT (L'UTILISATEUR A RAISON)

### Flux Médical Réel

```
┌─────────────────────────────────────────────────────────┐
│ TÉLÉCONSULTATION (À distance)                           │
├─────────────────────────────────────────────────────────┤
│ Patient: Douleur thoracique + radiation bras            │
│         ↓                                               │
│ GPT-4: DÉTECTE URGENCE ACS                              │
│         ↓                                               │
│ RAPPORT:                                                │
│   ✅ "Suspicion ACS"                                     │
│   ✅ "RÉFÉRENCE URGENCE IMMÉDIATE"                      │
│   ❌ PAS de prescription ambulatoire                     │
│   ❌ PAS d'examens détaillés (patient va aux urgences)  │
│         ↓                                               │
│ Patient → Urgences hospitalières                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ AUX URGENCES (À l'hôpital)                              │
├─────────────────────────────────────────────────────────┤
│ Médecin urgentiste examine le patient                   │
│         ↓                                               │
│ GPT-4: PROTOCOLE ACS COMPLET                            │
│         ↓                                               │
│ RAPPORT D'URGENCE:                                      │
│   ✅ Troponin hs T0/T1h/T3h                             │
│   ✅ ECG 12 dérivations                                 │
│   ✅ U&E + eGFR, Lipids, HbA1c                          │
│   ✅ Aspirin 300mg STAT                                 │
│   ✅ Ticagrelor 180mg STAT                              │
│   ✅ Morphine si douleur sévère                         │
│   ✅ Fondaparinux 2.5mg SC                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔴 PROBLÈME ACTUEL

Le système **NE FAIT PAS LA DISTINCTION** entre:
- **Téléconsultation** (patient à domicile)
- **Consultation aux urgences** (patient à l'hôpital)

**Résultat**: 
- Soit il prescrit trop (téléconsultation avec protocole urgences)
- Soit il ne prescrit pas assez (urgences sans protocole)

---

## ✅ SOLUTION

### 1. Ajouter `consultationContext` dans le PatientContext

**Fichier**: `app/api/openai-diagnosis/route.ts`

**Ajouter dans l'interface**:
```typescript
interface PatientContext {
  // ... existing fields ...
  
  // NOUVEAU
  consultation_context?: {
    setting: 'teleconsultation' | 'emergency_department' | 'hospital_ward' | 'general_practice'
    location: string  // "Patient at home" | "Emergency room" | "Hospital"
    access_to_investigations: boolean  // true if hospital/emergency
    access_to_iv_medications: boolean  // true if hospital/emergency
  }
}
```

---

### 2. Modifier le Prompt GPT-4

**Ajouter section AVANT génération**:

```typescript
const CONTEXT_PROMPT = `
═══════════════════════════════════════════════════════════
🏥 CONSULTATION CONTEXT
═══════════════════════════════════════════════════════════

Setting: {{CONSULTATION_SETTING}}
Location: {{PATIENT_LOCATION}}
Access to investigations: {{ACCESS_INVESTIGATIONS}}
Access to IV medications: {{ACCESS_IV_MEDS}}

🎯 ADAPT YOUR RECOMMENDATIONS BASED ON SETTING:

┌─────────────────────────────────────────────────────────┐
│ IF TELECONSULTATION (Patient at home):                  │
├─────────────────────────────────────────────────────────┤
│ ✅ PROVIDE:                                              │
│    - Clinical assessment                                 │
│    - Differential diagnosis                              │
│    - Urgency level                                       │
│    - Red flags                                           │
│                                                          │
│ ❌ DO NOT PROVIDE IF EMERGENCY:                          │
│    - Detailed investigation protocols                    │
│    - Hospital-based medications (IV, STAT)               │
│    - Immediate PCI protocols                             │
│                                                          │
│ ✅ INSTEAD:                                              │
│    - "IMMEDIATE EMERGENCY REFERRAL REQUIRED"             │
│    - "Call ambulance / SAMU 114"                         │
│    - "Do not wait - this is an emergency"                │
│    - Brief ambulatory medications ONLY if safe to wait   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ IF EMERGENCY DEPARTMENT (Patient in hospital):          │
├─────────────────────────────────────────────────────────┤
│ ✅ PROVIDE FULL PROTOCOL:                                │
│    - Complete investigation strategy                     │
│      * Troponin hs T0/T1h/T3h                            │
│      * ECG, U&E, Lipids, HbA1c, Coagulation              │
│    - Hospital medications with timing                    │
│      * Aspirin 300mg STAT                                │
│      * Ticagrelor 180mg STAT                             │
│      * Morphine 2.5-5mg IV if severe pain                │
│      * Fondaparinux 2.5mg SC                             │
│    - Specialist referral (Cardiology)                    │
│    - Monitoring protocols                                │
└─────────────────────────────────────────────────────────┘

CRITICAL: Adjust your recommendations to match the setting!
═══════════════════════════════════════════════════════════
`
```

---

### 3. Exemple Concret

#### Cas ACS - Téléconsultation

**Input**:
```json
{
  "consultation_context": {
    "setting": "teleconsultation",
    "location": "Patient at home",
    "access_to_investigations": false,
    "access_to_iv_medications": false
  },
  "symptoms": ["chest pain", "arm radiation"],
  "chief_complaint": "douleur thoracique importante"
}
```

**GPT-4 Output (adapté)**:
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
    "imaging_studies": []  // Vide car téléconsultation
  },
  "treatment_plan": {
    "approach": "⚠️ IMMEDIATE EMERGENCY REFERRAL - Do NOT attempt home treatment",
    "medications": []  // Vide car urgence
  },
  "follow_up_plan": {
    "red_flags": "CURRENT SITUATION IS A RED FLAG - EMERGENCY",
    "immediate": "Call ambulance immediately / SAMU 114",
    "specialist_referral": {
      "required": true,
      "specialty": "Emergency Medicine / Cardiology",
      "urgency": "emergency",
      "timeframe": "IMMEDIATE (within minutes)",
      "reason": "Suspected ACS requiring emergency hospital assessment"
    }
  }
}
```

**Rapport Généré**:
```markdown
# MEDICAL CONSULTATION REPORT

## DIAGNOSIS
**Suspected Acute Coronary Syndrome (ACS)**

⚠️⚠️⚠️ EMERGENCY SITUATION ⚠️⚠️⚠️

## URGENT ACTION REQUIRED

🚨 This patient requires IMMEDIATE emergency care.

DO NOT WAIT - CALL AMBULANCE NOW
- Mauritius: Call SAMU 114 or 999
- France: Call SAMU 15

## CLINICAL ASSESSMENT
Patient presents with:
- Chest pain radiating to left arm and jaw
- Classic signs of myocardial ischemia
- HIGH RISK for myocardial infarction

## WHAT WILL HAPPEN AT THE HOSPITAL
The emergency team will:
- Perform urgent ECG (electrocardiogram)
- Blood tests (Troponin to detect heart damage)
- Immediate cardiology assessment
- Possible emergency coronary angiography

## DO NOT ATTEMPT HOME TREATMENT
This condition CANNOT be safely managed at home.

---

⚠️ This is a TELECONSULTATION report
Patient location: Home
Recommendation: IMMEDIATE EMERGENCY TRANSFER
```

---

#### Cas ACS - Urgences

**Input**:
```json
{
  "consultation_context": {
    "setting": "emergency_department",
    "location": "Emergency room",
    "access_to_investigations": true,
    "access_to_iv_medications": true
  },
  "symptoms": ["chest pain", "arm radiation"],
  "chief_complaint": "douleur thoracique importante"
}
```

**GPT-4 Output (adapté)**:
```json
{
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "Acute Coronary Syndrome (ACS)",
      "urgency": "EMERGENCY"
    }
  },
  "investigation_strategy": {
    "laboratory_tests": [
      {
        "test_name": "Troponin hs (high-sensitivity)",
        "timing": "T0 (now), T1h (1 hour), T3h (3 hours)",
        "urgency": "STAT",
        "interpretation": "Δ >50% increase = NSTEMI"
      },
      {
        "test_name": "12-lead ECG",
        "timing": "STAT (immediate)",
        "interpretation": "ST elevation ≥1mm = STEMI → PCI within 120 min"
      },
      {
        "test_name": "U&E + eGFR",
        "timing": "STAT",
        "justification": "Renal function for Fondaparinux/LMWH dosing"
      },
      // ... tous les examens
    ]
  },
  "treatment_plan": {
    "medications": [
      {
        "drug": "Aspirin 300mg",
        "timing": "STAT (loading dose)",
        "route": "Oral or IV",
        "justification": "ESC Guidelines 2023 - Immediate antiplatelet"
      },
      {
        "drug": "Ticagrelor 180mg",
        "timing": "STAT (loading dose)",
        "route": "Oral",
        "justification": "Dual antiplatelet therapy (DAPT)"
      },
      {
        "drug": "Morphine 2.5-5mg",
        "timing": "IV if severe pain",
        "justification": "Analgesia for severe chest pain"
      },
      // ... tous les médicaments
    ]
  }
}
```

**Rapport Généré**:
```markdown
# EMERGENCY DEPARTMENT REPORT

## DIAGNOSIS
**Acute Coronary Syndrome (ACS) - STEMI/NSTEMI**

⚠️ EMERGENCY PROTOCOL ACTIVATED ⚠️

## IMMEDIATE INVESTIGATIONS (STAT)

### Cardiac Biomarkers
- **Troponin hs**: T0 (now), T1h, T3h
  * Interpretation: Δ >50% = NSTEMI
  
### ECG
- **12-lead ECG**: STAT
  * STEMI if ST elevation ≥1mm → PCI within 120 min

### Laboratory
- U&E + eGFR (renal function)
- Lipid profile
- HbA1c + Glucose
- FBC
- Coagulation (PT/INR, APTT)

## IMMEDIATE TREATMENT

### STAT Medications
1. **Aspirin 300mg** - STAT loading dose (oral/IV)
2. **Ticagrelor 180mg** - STAT loading dose (oral)
3. **Morphine 2.5-5mg IV** - if severe pain

### Ongoing Management
- Oxygen if SpO2 <94%
- Continuous cardiac monitoring
- IV access × 2

## CARDIOLOGY REFERRAL
**EMERGENCY** - Contact on-call cardiologist immediately
- Consider PCI if STEMI
- Risk stratification for NSTEMI

---

⚠️ This is an EMERGENCY DEPARTMENT report
Patient location: Emergency room
Protocol: Full ACS management
```

---

## 📊 COMPARAISON

| Élément | TÉLÉCONSULTATION | URGENCES |
|---------|------------------|----------|
| **Diagnostic** | Suspicion ACS ✅ | ACS confirmé ✅ |
| **Examens** | ❌ Aucun (patient va aux urgences) | ✅ Troponin hs, ECG, U&E, etc. |
| **Médicaments** | ❌ Aucun (urgence) | ✅ Aspirin, Ticagrelor, Morphine |
| **Action** | 🚨 Appeler ambulance | ✅ Protocole ACS complet |
| **Rapport** | "RÉFÉRENCE URGENCE" | "PROTOCOLE URGENCE ACTIVÉ" |

---

## 🚀 IMPLÉMENTATION

### Phase 1: Ajouter `consultation_context` (1 heure)

**Fichiers à modifier**:
1. `app/api/openai-diagnosis/route.ts` (interface PatientContext)
2. `components/diagnosis-form.tsx` (ajouter sélection contexte)

### Phase 2: Modifier Prompt GPT-4 (1 heure)

**Ajouter**:
- Section CONSULTATION CONTEXT
- Instructions conditionnelles (IF teleconsultation / IF emergency)

### Phase 3: Tests (2 heures)

**Tester**:
- ACS en téléconsultation → Rapport "URGENCE" sans prescriptions
- ACS aux urgences → Protocole complet
- Headache en téléconsultation → Prescription Paracetamol normale

---

## 🎯 BÉNÉFICES

### Avant (Sans Contexte)
```
Même rapport pour:
- Téléconsultation (patient à domicile)
- Urgences (patient à l'hôpital)

→ Incohérent ❌
```

### Après (Avec Contexte)
```
Rapport adapté au contexte:
- Téléconsultation → "URGENCE, appeler ambulance"
- Urgences → Protocole ACS complet

→ Cohérent ✅
```

---

## 💬 CONCLUSION

**L'utilisateur a raison**:
> "DANS L'ABSOLU GPT4 SI URGENCE FAIT RAPPORT MÉDICAL ET ENSUITE DIT URGENCES. ENSUITE LE MÉDECIN POURRA AJOUTER LES EXAMENS. PAR CONTRE SI ON EST AUX URGENCES ET QUE L'ON FAIT UN RAPPORT ON SAURA IDENTIFIER CELA."

**Solution**:
1. ✅ Ajouter `consultation_context` (téléconsultation vs urgences)
2. ✅ Adapter le prompt GPT-4 selon le contexte
3. ✅ Générer des rapports **COHÉRENTS** avec la situation

**Résultat**:
- Téléconsultation ACS → "URGENCE" sans prescriptions ✅
- Urgences ACS → Protocole complet ✅
- **GPT-4 S'ADAPTE AU CONTEXTE** ✅

---

**Repository**: https://github.com/stefbach/AI-DOCTOR  
**Date**: 1er Janvier 2026  
**Statut**: Spécification créée - Implémentation requise

🏥 **GPT-4 DOIT S'ADAPTER AU CONTEXTE DE CONSULTATION** 🏥
