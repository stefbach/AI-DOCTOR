# 🌍 NORMALISATION ANGLO-SAXONNE - DICTÉE VOCALE WHISPER

**Date:** 1er Janvier 2026  
**Feature:** Normalisation automatique en nomenclature anglo-saxonne (UK/US)  
**Fichiers:** `lib/medical-terminology-normalizer.ts` + `app/api/voice-dictation-transcribe/route.ts`

---

## 🎯 OBJECTIF

**Problème:**
Quand un médecin dicte une consultation en français (ou autre langue), Whisper transcrit avec:
- ❌ Noms de médicaments en français: "Amoxicilline", "Ibuprofène"
- ❌ Termes médicaux en français: "douleur thoracique", "syndrome coronarien aigu"
- ❌ Dosages en français: "trois fois par jour", "avant les repas"
- ❌ Orthographe variable: "amoxicilin", "ibuprofen", "paracétamol"

**Solution:**
Ajouter une **couche de normalisation automatique** pour convertir TOUT en nomenclature anglo-saxonne standard (UK/US):
- ✅ DCI en anglais: "Amoxicillin", "Ibuprofen"
- ✅ Termes médicaux en anglais: "chest pain", "acute coronary syndrome"
- ✅ Dosages standardisés: "TDS" (three times daily), "before meals"
- ✅ Orthographe correcte selon BNF/INN

---

## 🏗️ ARCHITECTURE

###

 **Flow complet:**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: TRANSCRIPTION WHISPER                                   │
│ ├─ Input: Audio dictée (français ou anglais)                    │
│ ├─ Output: Texte transcrit (mélange français/anglais/erreurs)   │
│ └─ Exemple: "Patient 62 ans, douleur thoracique, amoxicilline"  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: NORMALISATION ANGLO-SAXONNE ⭐ NOUVEAU                  │
│ ├─ Input: Texte transcrit                                       │
│ ├─ Process: Normalisation en nomenclature UK/US                 │
│ │   • Médicaments: "amoxicilline" → "Amoxicillin"              │
│ │   • Termes: "douleur thoracique" → "chest pain"              │
│ │   • Dosages: "trois fois par jour" → "TDS"                   │
│ │   • Corrections orthographiques                               │
│ ├─ Output: Texte normalisé en anglais médical                   │
│ └─ Exemple: "Patient 62 years old, chest pain, Amoxicillin"    │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: EXTRACTION DONNÉES CLINIQUES                            │
│ ├─ Input: Texte normalisé                                       │
│ ├─ Process: GPT-4o extrait données structurées EN ANGLAIS       │
│ ├─ Output: JSON structuré avec nomenclature anglo-saxonne       │
│ └─ Exemple: { chiefComplaint: "chest pain", ...}               │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: DIAGNOSTIC AI (GPT-4)                                   │
│ ├─ Input: Données cliniques en anglais                          │
│ ├─ Process: Analyse diagnostique en nomenclature internationale │
│ ├─ Output: Diagnostic, traitement, examens EN ANGLAIS           │
│ └─ Exemple: { primary_diagnosis: "ACS", medications: [...] }   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 DICTIONNAIRES DE NORMALISATION

### **1. Médicaments (DCI Anglais)**

**Format:**
```typescript
'amoxicillin': {
  correctDCI: 'Amoxicillin',
  brandNames: ['Amoxil', 'Flemoxin', 'Trimox'],
  commonMisspellings: ['amoxicilline', 'amoxicilin', 'amoxycillin']
}
```

**Couverture:**
- ✅ **Antibiotiques:** Amoxicillin, Azithromycin, Ciprofloxacin, Metronidazole
- ✅ **Analgésiques/AINS:** Paracetamol, Ibuprofen, Diclofenac, Naproxen, Aspirin
- ✅ **Cardiovasculaires:** Atenolol, Amlodipine, Enalapril, Simvastatin, Atorvastatin, Clopidogrel, Ticagrelor
- ✅ **Diabète:** Metformin, Glibenclamide, Insulin
- ✅ **Gastro-intestinaux:** Omeprazole, Ranitidine, Metoclopramide
- ✅ **Respiratoires:** Salbutamol, Prednisolone
- ✅ **Neurologiques:** Amitriptyline, Diazepam, Carbamazepine

**Total:** 25+ médicaments communs

### **2. Termes Médicaux (Français → Anglais)**

**Exemples:**
| Français | Anglais |
|----------|---------|
| douleur thoracique | chest pain |
| essoufflement | shortness of breath |
| céphalée | headache |
| syndrome coronarien aigu | acute coronary syndrome |
| accident vasculaire cérébral | stroke |
| embolie pulmonaire | pulmonary embolism |
| tension artérielle | blood pressure |

**Total:** 50+ termes médicaux

### **3. Dosages (Français → Anglais/Latin)**

**Exemples:**
| Français | Anglais |
|----------|---------|
| une fois par jour | once daily (OD) |
| deux fois par jour | twice daily (BD) |
| trois fois par jour | three times daily (TDS) |
| quatre fois par jour | four times daily (QDS) |
| avant les repas | before meals |
| au coucher | at bedtime |

---

## 🔧 FONCTIONS PRINCIPALES

### **1. `normalizeTranscriptionToEnglish(text: string)`**

**Description:** Normalise le texte transcrit en nomenclature anglo-saxonne

**Input:**
```typescript
"Patient 62 ans, douleur thoracique, prescrit amoxicilline 500mg trois fois par jour"
```

**Output:**
```typescript
{
  originalText: "Patient 62 ans, douleur thoracique, prescrit amoxicilline 500mg trois fois par jour",
  normalizedText: "Patient 62 years old, chest pain, prescribed Amoxicillin 500mg TDS",
  corrections: [
    { type: 'medical_term', original: 'douleur thoracique', corrected: 'chest pain' },
    { type: 'medication', original: 'amoxicilline', corrected: 'Amoxicillin' },
    { type: 'dosage', original: 'trois fois par jour', corrected: 'TDS' }
  ],
  confidence: 92.5
}
```

### **2. `normalizeMedicationName(name: string)`**

**Description:** Normalise un nom de médicament individuel

**Exemples:**
```typescript
normalizeMedicationName("amoxicilline") 
// → { normalized: "Amoxicillin", originalWasIncorrect: true }

normalizeMedicationName("Brufen")
// → { normalized: "Ibuprofen", originalWasIncorrect: false, brandName: "Brufen" }

normalizeMedicationName("paracétamol")
// → { normalized: "Paracetamol", originalWasIncorrect: true }
```

### **3. `normalizeMedicationList(medications: string[])`**

**Description:** Normalise une liste de médicaments avec niveau de confiance

**Input:**
```typescript
["amoxicilline", "Brufen", "paracétamol", "Mysterious Drug"]
```

**Output:**
```typescript
[
  { original: "amoxicilline", normalized: "Amoxicillin", confidence: "medium", warning: "Corrected from \"amoxicilline\" to \"Amoxicillin\"" },
  { original: "Brufen", normalized: "Ibuprofen", confidence: "high" },
  { original: "paracétamol", normalized: "Paracetamol", confidence: "medium", warning: "Corrected..." },
  { original: "Mysterious Drug", normalized: "Mysterious Drug", confidence: "low", warning: "Not in standard dictionary" }
]
```

---

## 📊 EXEMPLE COMPLET

### **Input (Whisper Transcription):**
```
"Patient de 62 ans, présente douleur thoracique depuis 2 heures, 
irradiation bras gauche. Antécédents: hypertension, diabète type 2. 
Traitement actuel: amoxicilline 500mg trois fois par jour, 
paracétamol si douleur. PA 145/90, FC 95. 
Hypothèse: syndrome coronarien aigu à exclure."
```

### **Output (After Normalization):**
```
"Patient 62 years old, presents chest pain for 2 hours, 
radiating to left arm. History: hypertension, type 2 diabetes. 
Current treatment: Amoxicillin 500mg TDS, 
Paracetamol PRN for pain. BP 145/90, HR 95. 
Hypothesis: acute coronary syndrome to rule out."
```

### **Corrections Applied:**
```json
{
  "corrections": [
    { "type": "medical_term", "original": "douleur thoracique", "corrected": "chest pain" },
    { "type": "medical_term", "original": "hypertension", "corrected": "hypertension" },
    { "type": "medical_term", "original": "diabète type 2", "corrected": "type 2 diabetes" },
    { "type": "medication", "original": "amoxicilline", "corrected": "Amoxicillin" },
    { "type": "dosage", "original": "trois fois par jour", "corrected": "TDS" },
    { "type": "medication", "original": "paracétamol", "corrected": "Paracetamol" },
    { "type": "dosage", "original": "si douleur", "corrected": "PRN for pain" },
    { "type": "medical_term", "original": "PA", "corrected": "BP" },
    { "type": "medical_term", "original": "FC", "corrected": "HR" },
    { "type": "medical_term", "original": "syndrome coronarien aigu", "corrected": "acute coronary syndrome" }
  ],
  "confidence": 95.2
}
```

---

## ✅ AVANTAGES

### **1. Cohérence Globale:**
- ✅ TOUT le système utilise la même nomenclature (anglo-saxonne)
- ✅ Médicaments en DCI anglais (INN)
- ✅ Termes médicaux standardisés UK/US
- ✅ Pas de mélange français/anglais

### **2. Compatibilité Internationale:**
- ✅ Compatible avec BNF (British National Formulary)
- ✅ Compatible avec WHO INN (International Nonproprietary Names)
- ✅ Compatible avec bases de données médicales internationales
- ✅ Compatible avec publications scientifiques

### **3. Qualité Diagnostic:**
- ✅ GPT-4 comprend mieux les termes en anglais
- ✅ Références médicales disponibles en anglais
- ✅ Guidelines internationales en anglais (ESC, AHA, etc.)
- ✅ Meilleure précision diagnostique

### **4. Correction Automatique:**
- ✅ Corrige fautes d'orthographe: "amoxicilin" → "Amoxicillin"
- ✅ Convertit noms commerciaux: "Brufen" → "Ibuprofen"
- ✅ Standardise dosages: "3x/jour" → "TDS"
- ✅ Log des corrections pour transparence

---

## 🚀 INTÉGRATION

### **API Voice Dictation Transcribe:**

**Avant (2 étapes):**
```
1. Transcription Whisper
2. Extraction GPT-4
```

**Après (3 étapes):**
```
1. Transcription Whisper
2. Normalisation Anglo-Saxonne ⭐ NOUVEAU
3. Extraction GPT-4
```

### **Response JSON:**

```json
{
  "success": true,
  "transcription": {
    "text": "...",
    "originalText": "Patient 62 ans, douleur thoracique...",
    "normalizedText": "Patient 62 years old, chest pain...",
    "duration": 45.2,
    "language": "fr"
  },
  "normalization": {
    "corrections": [...],
    "confidence": 95.2,
    "correctionsByType": {
      "medication": 2,
      "medicalTerm": 8,
      "dosage": 3,
      "spelling": 0
    }
  },
  "extractedData": {
    "patientInfo": {...},
    "clinicalData": {
      "chiefComplaint": "chest pain",  // EN ANGLAIS
      "symptoms": ["chest pain", "left arm radiation"],  // EN ANGLAIS
      "currentMedications": ["Amoxicillin", "Paracetamol"]  // DCI ANGLAIS
    },
    ...
  }
}
```

---

## 📝 LOGS EXEMPLE

```
🎤 ========================================
   VOICE DICTATION TRANSCRIBE API
   (Transcription + Normalization + Extraction)
========================================

📝 STEP 1/3: Audio Transcription
🔊 Starting audio transcription...
   Audio file: consultation_1704120000.webm (1245678 bytes)
✅ Transcription completed
   Text length: 452 characters
   Duration: 45.2 seconds
   Language: fr

🔄 STEP 2/3: Normalization to Anglo-Saxon Nomenclature
🔄 Starting transcription normalization to English...
✅ Normalization completed: 13 corrections made
   Confidence: 95.2%
   → Medications: 2 corrections
   → Medical terms: 8 corrections
   → Dosages: 3 corrections

📝 STEP 3/3: Clinical Data Extraction
📊 Extracting clinical data with GPT-4o...
✅ Extraction completed
   Patient: John Doe
   Chief complaint: chest pain
   ⚕️ Doctor's hypotheses preserved: 2 hypotheses
   💊 Normalizing 3 medications...
   ✅ Corrected 1 medication names:
      "amoxicilline" → "Amoxicillin"

✅ ========================================
   TRANSCRIPTION + NORMALIZATION + EXTRACTION COMPLETE
   Total time: 8520ms
   Normalization confidence: 95.2%
   Corrections applied: 13
========================================
```

---

## 🎯 PROCHAINES ÉTAPES

### **1. Extension Dictionnaire (1-2h):**
- Ajouter 50+ médicaments supplémentaires
- Ajouter termes spécialisés (cardio, dermato, etc.)
- Ajouter abréviations médicales communes

### **2. Machine Learning (optionnel):**
- Apprendre des corrections les plus fréquentes
- S'adapter au vocabulaire du médecin
- Améliorer la confiance au fil du temps

### **3. Interface Utilisateur (1h):**
- Afficher corrections dans l'UI
- Permettre au médecin de valider/corriger
- Statistiques de normalisation

---

## ✅ CONCLUSION

### **Status:**
- ✅ **Normalisation implémentée**
- ✅ **Intégrée dans l'API transcription**
- ✅ **25+ médicaments dans le dictionnaire**
- ✅ **50+ termes médicaux**
- ✅ **Logs détaillés des corrections**

### **Impact:**
- 🟢 **Cohérence globale** du système
- 🟢 **Qualité diagnostique** améliorée
- 🟢 **Compatibilité internationale**
- 🟢 **Correction automatique** des erreurs

### **Repository:**
- **URL:** https://github.com/stefbach/AI-DOCTOR
- **Fichiers:**
  - `lib/medical-terminology-normalizer.ts` (nouveau)
  - `app/api/voice-dictation-transcribe/route.ts` (modifié)

---

**🌍 SYSTÈME MAINTENANT CONFORME À LA NOMENCLATURE ANGLO-SAXONNE (UK/US)**  
**✅ READY FOR INTERNATIONAL USE**
