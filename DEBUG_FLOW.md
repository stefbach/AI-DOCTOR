# 🔍 DEBUG FLOW - CE QUI DOIT SE PASSER

## 📍 FLUX DE DONNÉES COMPLET

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PATIENT-FORM (client)                                    │
├─────────────────────────────────────────────────────────────┤
│ Input utilisateur:                                          │
│   Textarea: "metfromin 500mg 2 fois par jour"              │
│                                                             │
│ Transformation (ligne 417-425):                            │
│   currentMedications: [                                     │
│     "metfromin 500mg 2 fois par jour"                      │
│   ]                                                         │
│                                                             │
│ ✅ VÉRIFIER: Array.isArray() = true                        │
└─────────────────────────────────────────────────────────────┘
                            ↓ POST /api/openai-diagnosis
┌─────────────────────────────────────────────────────────────┐
│ 2. OPENAI-DIAGNOSIS API (server)                           │
├─────────────────────────────────────────────────────────────┤
│ Reçoit:                                                     │
│   body.patientData.currentMedications: [                   │
│     "metfromin 500mg 2 fois par jour"                      │
│   ]                                                         │
│                                                             │
│ Debug logs (ligne 2512-2521):                              │
│   🔍 DEBUG - Raw patient data received:                    │
│      - Is Array?: true                                     │
│                                                             │
│ Prépare prompt (ligne 2561):                               │
│   MAURITIUS_MEDICAL_PROMPT avec instructions              │
│   → current_medications: ["metfromin 500mg 2 fois par jour"]│
│                                                             │
│ Appel OpenAI (ligne 2563-2567):                           │
│   callOpenAIWithMauritiusQuality()                        │
│                                                             │
│ Reçoit de OpenAI:                                          │
│   {                                                         │
│     current_medications_validated: [                       │
│       {                                                     │
│         medication_name: "Metformin 500mg",               │
│         dci: "Metformin",                                 │
│         how_to_take: "BD (twice daily)",                  │
│         validated_corrections: "metfromin→Metformin...",  │
│         original_input: "metfromin 500mg 2 fois par jour" │
│       }                                                     │
│     ]                                                       │
│   }                                                         │
│                                                             │
│ Debug logs (ligne 2572-2581):                              │
│   💊 CURRENT MEDICATIONS VALIDATED BY AI: 1                │
│      1. Metformin 500mg - BD (twice daily)                │
│                                                             │
│ Retourne (ligne 2909):                                     │
│   {                                                         │
│     currentMedicationsValidated: [{...}],                  │
│     medications: [],                                        │
│     combinedPrescription: [{...}]                          │
│   }                                                         │
│                                                             │
│ ✅ VÉRIFIER: currentMedicationsValidated existe            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DIAGNOSIS-FORM (client)                                  │
├─────────────────────────────────────────────────────────────┤
│ Stocke la réponse dans diagnosisData                       │
│                                                             │
│ ✅ VÉRIFIER: diagnosisData.currentMedicationsValidated     │
└─────────────────────────────────────────────────────────────┘
                            ↓ POST /api/generate-consultation-report
┌─────────────────────────────────────────────────────────────┐
│ 4. GENERATE-CONSULTATION-REPORT API (server)               │
├─────────────────────────────────────────────────────────────┤
│ Reçoit:                                                     │
│   diagnosisData: {                                          │
│     currentMedicationsValidated: [{...}]                   │
│   }                                                         │
│                                                             │
│ Extraction (ligne 570-663):                                │
│   extractPrescriptionsFromDiagnosisData()                  │
│                                                             │
│ Step 1: Extract current medications (ligne 580-625):       │
│   const validatedCurrentMeds =                             │
│     diagnosisData?.currentMedicationsValidated || []       │
│                                                             │
│   console.log(`📋 Current medications validated by AI: 1`)  │
│                                                             │
│   medications.push({                                        │
│     name: "Metformin 500mg",                               │
│     medication_type: 'current_continued',                  │
│     validated_by_ai: true,                                 │
│     ...                                                     │
│   })                                                        │
│                                                             │
│ Step 2: Extract newly prescribed (ligne 627-662):          │
│   const primaryTreatments = ...                            │
│   console.log(`💊 Newly prescribed medications: 0`)         │
│                                                             │
│ console.log(`✅ COMBINED: 1 current + 0 new = 1 total`)    │
│                                                             │
│ ✅ VÉRIFIER: medications array contient 1 élément          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PROFESSIONAL-REPORT (client)                             │
├─────────────────────────────────────────────────────────────┤
│ Reçoit:                                                     │
│   prescriptions: [                                          │
│     {                                                       │
│       name: "Metformin 500mg",                             │
│       medication_type: 'current_continued',                │
│       validated_by_ai: true,                               │
│       validated_corrections: "metfromin→Metformin...",     │
│       ...                                                   │
│     }                                                       │
│   ]                                                         │
│                                                             │
│ Affiche dans le rapport (ligne 1936-1971)                  │
│                                                             │
│ ✅ VÉRIFIER: Section "TRAITEMENTS ACTUELS" affichée        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 POINTS DE VÉRIFICATION

### Point 1: Patient Form - Parse Array
**Fichier:** `components/patient-form.tsx`  
**Ligne:** 417-425  
**Test:**
```typescript
console.log(typeof currentMedications) // Doit être "object"
console.log(Array.isArray(currentMedications)) // Doit être true
console.log(currentMedications.length) // Doit être > 0
```

### Point 2: OpenAI Diagnosis - Input
**Fichier:** `app/api/openai-diagnosis/route.ts`  
**Ligne:** 2512-2521  
**Logs à chercher:**
```
🔍 DEBUG - Raw patient data received:
   - Is Array?: true
```

### Point 3: OpenAI Diagnosis - Output
**Fichier:** `app/api/openai-diagnosis/route.ts`  
**Ligne:** 2572-2581  
**Logs à chercher:**
```
💊 CURRENT MEDICATIONS VALIDATED BY AI: 1
   1. Metformin 500mg - BD (twice daily)
```

**OU (si échec):**
```
⚠️ NO CURRENT MEDICATIONS VALIDATED - AI did not return current_medications_validated field!
```

### Point 4: Generate Report - Extraction
**Fichier:** `app/api/generate-consultation-report/route.ts`  
**Ligne:** 581  
**Logs à chercher:**
```
📋 Current medications validated by AI: 1
💊 Newly prescribed medications: 0
✅ COMBINED: 1 current + 0 new = 1 total
```

### Point 5: Professional Report - Display
**Fichier:** `components/professional-report.tsx`  
**Ligne:** 1936-1971  
**Visual:** Section "TRAITEMENTS ACTUELS (À CONTINUER)" doit être visible

---

## 🐛 DEBUGGING CHECKLIST

Pour chaque point de vérification, coche:

### ✅ Si le log apparaît → Passe au suivant
### ❌ Si le log n'apparaît pas → PROBLÈME ICI!

```
[ ] Point 1: Parse array dans patient-form
    ↓ Si ❌ → Le formulaire n'envoie pas un array
    
[ ] Point 2: API reçoit array
    ↓ Si ❌ → Transformation perdue en route
    
[ ] Point 3: OpenAI valide les médicaments
    ↓ Si ❌ → Le prompt ne fonctionne pas
    
[ ] Point 4: Report extrait les médicaments
    ↓ Si ❌ → L'extraction ne trouve pas les données
    
[ ] Point 5: UI affiche les médicaments
    ↓ Si ❌ → Le component ne render pas
```

---

## 🔧 COMMENT DÉBUGGER

### Méthode 1: Logs Vercel (Backend)
```bash
vercel logs --follow
```

**Cherche ces logs dans l'ordre:**
1. `🔍 DEBUG - Raw patient data received:`
2. `💊 CURRENT MEDICATIONS VALIDATED BY AI:`
3. `📋 Current medications validated by AI:`
4. `✅ COMBINED:`

**Si un log manque → STOP → Le problème est à cette étape**

### Méthode 2: Console Browser (Frontend)
```javascript
// Ouvre F12 → Console
// Dans l'onglet Network, cherche:

POST /api/openai-diagnosis
→ Request payload: patientData.currentMedications doit être []
→ Response: currentMedicationsValidated doit exister

POST /api/generate-consultation-report
→ Request payload: diagnosisData.currentMedicationsValidated doit exister
→ Response: prescriptions doit contenir medication_type: 'current_continued'
```

### Méthode 3: Breakpoints
1. Ouvre DevTools (F12)
2. Onglet "Sources"
3. Trouve `patient-form.tsx`
4. Mets un breakpoint ligne 417
5. Vérifie la valeur de `data.currentMedicationsText`

---

## 📋 CE QUE JE DOIS SAVOIR

Pour t'aider, dis-moi:

### 1. Quel point échoue?
- [ ] Les médicaments n'apparaissent PAS DU TOUT dans le rapport
- [ ] Les médicaments apparaissent mais PAS CORRIGÉS
- [ ] Les médicaments apparaissent mais DOUBLÉS
- [ ] Autre chose?

### 2. Logs Vercel
Copie-colle tous les logs qui commencent par:
- `🔍 DEBUG`
- `💊 CURRENT`
- `📋 Current`
- `✅ COMBINED`

### 3. Console Browser
Dans Network → openai-diagnosis → Response:
- Est-ce que `currentMedicationsValidated` existe?
- Est-ce que c'est un array?
- Combien d'éléments?

### 4. Rapport Final
- Est-ce que tu vois une section "TRAITEMENTS ACTUELS"?
- Si oui, qu'est-ce qui est affiché exactement?
- Si non, est-ce que tu vois "NOUVEAUX TRAITEMENTS"?

---

## 🚨 SCÉNARIOS D'ÉCHEC POSSIBLES

### Scénario A: Array non parsé
**Symptôme:** Log montre `Is Array?: false`  
**Cause:** patient-form ne parse pas correctement  
**Fix:** Vérifier ligne 417-425 de patient-form.tsx

### Scénario B: Prompt ne valide pas
**Symptôme:** Log montre `⚠️ NO CURRENT MEDICATIONS VALIDATED`  
**Cause:** OpenAI ne retourne pas current_medications_validated  
**Fix:** Vérifier le prompt et retry prompts

### Scénario C: Extraction échoue
**Symptôme:** Log montre `📋 Current medications validated by AI: 0`  
**Cause:** generate-consultation-report ne trouve pas les données  
**Fix:** Vérifier que diagnosisData contient currentMedicationsValidated

### Scénario D: UI ne render pas
**Symptôme:** Logs OK mais rien ne s'affiche  
**Cause:** professional-report ne rend pas la section  
**Fix:** Vérifier que prescriptions contient medication_type: 'current_continued'

---

**PROCHAINE ÉTAPE:**

Envoie-moi les logs Vercel et les réponses Network pour que je puisse identifier le point exact qui échoue!
