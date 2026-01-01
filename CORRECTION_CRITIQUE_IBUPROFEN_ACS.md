# 🚨 CORRECTION CRITIQUE - ERREUR IBUPROFEN DANS ACS

**Date**: 31 Décembre 2025  
**Gravité**: 🔴 CRITIQUE - RISQUE MORTEL  
**Problème**: Prescription d'Ibuprofen dans un cas de suspicion ACS

---

## ❌ ERREUR IDENTIFIÉE

### Cas Clinique
- **Patient**: Homme, 62 ans
- **Symptômes**: Douleur thoracique avec irradiation au bras gauche et à la mâchoire
- **Diagnostic**: Suspicion d'Acute Coronary Syndrome (ACS)

### Prescription Erronée Générée
```
"The patient will be administered ibuprofen for pain management and 
anti-inflammatory treatment, with a dosage of 400mg three times daily 
with food for 5 to 7 days."
```

---

## 🚨 POURQUOI C'EST MORTEL?

### Contre-indication Absolue: NSAIDs dans ACS

| Risque | Impact |
|--------|--------|
| **Augmentation risque MI** | +30-50% |
| **Effet pro-coagulant** | Favorise thrombose |
| **Réduit efficacité aspirine** | Annule protection |
| **Aggrave pronostic cardiovasculaire** | Mortalité accrue |

### Mécanisme d'Action Délétère

1. **Inhibition COX-2** → Réduction prostacycline vasculaire
2. **Déséquilibre thrombogène** → Favorise formation thrombus
3. **Interaction aspirine** → Compétition site COX-1
4. **Rétention hydrosodée** → Aggrave insuffisance cardiaque

---

## ✅ TRAITEMENT CORRECT POUR ACS

### Protocole Emergency ACS

| Étape | Traitement | Dosage | Timing |
|-------|------------|--------|--------|
| 1️⃣ | **Aspirin** | 300mg STAT | Immédiat |
| 2️⃣ | **Ticagrelor** | 180mg loading | Immédiat |
| 3️⃣ | **Fondaparinux** | 2.5mg SC OD | NSTEMI |
| 4️⃣ | **Primary PCI** | - | STEMI <120min |

### Analgésie Sûre

| Douleur | Médicament | Dosage |
|---------|------------|--------|
| **Légère** | Paracetamol | 1g QDS (max 4g/day) |
| **Modérée** | Paracetamol | + Tramadol 50mg QDS |
| **Sévère** | Morphine IV | 2.5-5mg (en urgences) |
| **JAMAIS** | ❌ Ibuprofen | CONTRE-INDIQUÉ |

---

## 🔧 CORRECTIONS APPORTÉES

### 1️⃣ Schema JSON (ligne ~340)

**Ajout d'un bloc de sécurité AVANT medications**:

```typescript
"⚠️🚨 CRITICAL MEDICATION SAFETY CHECK BEFORE PRESCRIBING 🚨⚠️": {
  "cardiac_symptoms_present": "MANDATORY CHECK - Chest pain?",
  "if_YES_cardiac_symptoms": "🚫 NEVER NSAIDs. USE: Paracetamol OR Morphine",
  "gi_bleeding_risk": "CHECK - Ulcer, GI bleeding, anticoagulants?",
  "if_YES_gi_risk": "🚫 AVOID NSAIDs. USE: Paracetamol",
  "renal_impairment": "CHECK - CKD stage 4-5?",
  "if_YES_renal": "🚫 AVOID NSAIDs",
  "age_over_65": "CHECK - Age >65?",
  "if_YES_elderly": "⚠️ PREFER Paracetamol"
}
```

---

### 2️⃣ Règles Ultra-Visibles (ligne ~488)

**Ajout d'une section dédiée**:

```
═══════════════════════════════════════════════════════════════════════════════
🚫🚨 ABSOLUTE MEDICATION BAN - CARDIAC PATIENTS 🚨🚫
═══════════════════════════════════════════════════════════════════════════════

⛔ NEVER PRESCRIBE NSAIDs IF:
   1. ❌ Chest pain / Angina symptoms
   2. ❌ Suspected or confirmed ACS
   3. ❌ Recent MI
   4. ❌ ANY cardiac symptoms
   5. ❌ Known CAD
   6. ❌ Heart failure
   7. ❌ Stroke / TIA history
   8. ❌ Age >65 years

🚨 WHY THIS IS CRITICAL:
   - NSAIDs ↑ MI risk by 30-50%
   - NSAIDs worsen CV outcomes
   - NSAIDs promote thrombosis
   - NSAIDs ↓ aspirin effectiveness

✅ SAFE ALTERNATIVES:
   1. Paracetamol 1g QDS
   2. IF ACS: Aspirin 300mg + Ticagrelor 180mg
   3. IF SEVERE PAIN: Morphine IV
   4. NEVER: NSAIDs

🚨 EMERGENCY PROTOCOL FOR ACS:
   - IMMEDIATE HOSPITAL REFERRAL
   - Aspirin 300mg STAT
   - Ticagrelor 180mg STAT
   - NO NSAIDs EVER!
```

---

## 📊 ANALYSE RACINE DU PROBLÈME

### Pourquoi l'IA a prescrit Ibuprofen?

| Cause | Explication |
|-------|-------------|
| **1. Réflexe automatique** | "Pain management" → IA pense "NSAID" |
| **2. Règles noyées** | Contre-indications perdues dans 5000+ lignes |
| **3. Pas de hard block** | Aucune validation pré-génération |
| **4. Manque de checklist** | Pas de vérification systématique |

### Solutions Implémentées

| Solution | Ligne | Description |
|----------|-------|-------------|
| **Safety check intégré** | ~340 | Checklist dans schema JSON |
| **Banner ultra-visible** | ~488 | Section dédiée NSAIDs |
| **Protocole ACS explicit** | ~510 | Traitement correct détaillé |
| **Alternatives claires** | ~520 | Paracetamol en priorité |

---

## 🧪 TEST DE VALIDATION

### Cas de Test: ACS

**Input**:
```json
{
  "chiefComplaint": "Chest pain radiating to left arm and jaw",
  "patientAge": 62,
  "patientSex": "male"
}
```

**Output Attendu**:
```json
{
  "diagnosis": "Acute Coronary Syndrome (suspected)",
  "specialist_referral": {
    "required": true,
    "urgency": "emergency",
    "specialty": "Cardiology"
  },
  "medications": [
    {
      "medication_name": "Aspirin 300mg",
      "why_prescribed": "Antiplatelet therapy for suspected ACS",
      "how_to_take": "STAT (immediate single dose)"
    },
    {
      "medication_name": "Ticagrelor 180mg",
      "why_prescribed": "Dual antiplatelet therapy for ACS",
      "how_to_take": "STAT loading dose"
    }
  ]
}
```

**Output Interdit**:
```json
{
  "medications": [
    {
      "medication_name": "Ibuprofen 400mg",  // ❌ ERREUR MORTELLE
      "how_to_take": "TDS"
    }
  ]
}
```

---

## 📚 RÉFÉRENCES MÉDICALES

### Guidelines

1. **ESC 2023 ACS Guidelines**
   - Aspirin 300mg loading dose
   - Ticagrelor 180mg loading dose
   - Primary PCI <120min if STEMI

2. **NICE CG185 - Chest Pain**
   - Immediate hospital transfer if ACS suspected
   - NSAIDs contraindicated in cardiac patients

3. **BNF (British National Formulary)**
   - NSAIDs: "Caution in cardiovascular disease"
   - "Avoid in patients with ischemic heart disease"

4. **FDA Warning (2015)**
   - NSAIDs increase heart attack and stroke risk
   - Risk increases with higher doses and longer use

---

## 🎯 IMPACT DES CORRECTIONS

### Avant Correction

- ❌ Risque prescription Ibuprofen dans ACS
- ❌ Pas de checklist pré-prescription
- ❌ Règles NSAIDs noyées dans le texte
- ❌ Pas de validation automatique

### Après Correction

- ✅ Safety check intégré au schema
- ✅ Banner ultra-visible NSAIDs
- ✅ Protocole ACS explicite
- ✅ Alternatives sûres listées
- ✅ Checklist avant chaque prescription

---

## 📋 CHECKLIST MÉDECIN

Avant de valider toute prescription, vérifier:

- [ ] Patient a-t-il des symptômes cardiaques?
- [ ] Patient a-t-il un antécédent cardiovasculaire?
- [ ] Patient a-t-il >65 ans?
- [ ] NSAIDs prescrits? → Vérifier contre-indications
- [ ] Si douleur thoracique → JAMAIS d'Ibuprofen
- [ ] Si ACS → Aspirin + Ticagrelor + Référence urgences
- [ ] Analgésie nécessaire? → Paracetamol en priorité

---

## 🏆 CONCLUSION

### Erreur Corrigée

**Problème**: Prescription mortellement dangereuse d'Ibuprofen dans ACS  
**Solution**: Double couche de sécurité dans le prompt  
**Résultat**: Protection renforcée contre prescriptions inappropriées

### Fichiers Modifiés

| Fichier | Modifications | Lignes |
|---------|---------------|--------|
| `app/api/openai-diagnosis/route.ts` | Safety check + Banner NSAIDs | ~60 |

### Score Sécurité

| Aspect | Avant | Après |
|--------|-------|-------|
| **Safety check** | ❌ | ✅ |
| **NSAIDs warning** | ⚠️ | 🚨 |
| **ACS protocol** | ⚠️ | ✅ |
| **Alternatives claires** | ❌ | ✅ |

---

**Repository**: https://github.com/stefbach/AI-DOCTOR  
**Date**: 31 Décembre 2025  
**Statut**: ✅ **CORRECTION CRITIQUE APPLIQUÉE**

---

**🚨 SÉCURITÉ PATIENT = PRIORITÉ ABSOLUE 🚨**
