# 🧪 GUIDE DE TEST: Renouvellement d'Ordonnance avec Auto-Remplissage

## 🎯 OBJECTIF DU TEST

Vérifier que les médicaments actuels du patient sont **automatiquement récupérés et remplis** dans la prescription de renouvellement.

---

## 📋 SCÉNARIO DE TEST COMPLET

### ✅ Prérequis
- Patient avec médicaments actuels dans TIBOK
- Console F12 ouverte (pour voir les logs)
- Navigateur en mode normal (pas incognito)

---

### ÉTAPE 1: Patient Form

1. **Ouvrir** une nouvelle consultation
2. **Sélectionner** un patient existant depuis TIBOK (exemple: "TIBOK YANN")
3. **Vérifier** que le champ "Current Medications" contient des médicaments:
   ```
   METFORMIN 500 2/J
   ASPIRIN 100 1/J
   ```
4. **Cliquer** "Next" pour passer à l'étape suivante

**✅ Checkpoint Console**:
```
🔍 CLIENT DEBUG - PATIENT FORM:
   📦 Medications parsed: ['METFORMIN 500 2/J', 'ASPIRIN 100 1/J']
```

---

### ÉTAPE 2: Clinical Form

**MÉTHODE A - Renouvellement Explicite (Recommandé)**:

1. **Chief Complaint**: Taper "Renouvellement d'ordonnance"
2. **OU**: Taper "Prescription renewal"  
3. **OU**: Utiliser le bouton spécial "Prescription Renewal" (si disponible)
4. Remplir les autres champs (optionnel pour test)
5. **Cliquer** "Next"

**MÉTHODE B - Détection Automatique**:
- Le système détecte automatiquement via `sessionStorage.getItem('prescriptionRenewal') === 'true'`

**✅ Checkpoint SessionStorage**:
```javascript
// Dans Console F12:
sessionStorage.getItem('prescriptionRenewal')
// Doit retourner: "true"
```

---

### ÉTAPE 3: Diagnosis Form

1. L'IA génère le diagnostic basé sur les données
2. **IMPORTANT**: L'IA valide et structure automatiquement les médicaments actuels

**✅ Checkpoint Console** (CRITIQUE):
```
🔍 CLIENT DEBUG - DIAGNOSIS FORM:
   💊 currentMedicationsValidated: (2) [{...}, {...}]
   💊 Length: 2

Détails des médicaments validés:
[
  {
    name: "METFORMIN",
    generic_name: "Metformin", 
    dosage: "500mg",
    form: "tablet",
    frequency: "2 times daily",
    route: "Oral"
  },
  {
    name: "ASPIRIN",
    generic_name: "Acetylsalicylic acid",
    dosage: "100mg", 
    form: "tablet",
    frequency: "Once daily",
    route: "Oral"
  }
]
```

3. **Vérifier** que `currentMedicationsValidated` contient bien les médicaments
4. **Cliquer** "Generate Professional Report"

---

### ÉTAPE 4: Professional Report (AUTO-FILL)

**🎉 C'EST ICI QUE LA MAGIE OPÈRE!**

#### A. Notification Toast

**✅ Vérifier** qu'un toast apparaît:

```
💊 Mode Renouvellement d'Ordonnance
2 médicament(s) validé(s) par IA seront automatiquement ajoutés
```

**OU** (si fallback texte):
```
💊 Prescription Renewal Mode
2 medication(s) detected and will be auto-filled
```

#### B. Onglet Automatique

**✅ Vérifier**:
- L'onglet **"Prescription Médicaments"** s'ouvre automatiquement
- (Pas besoin de cliquer dessus manuellement)

#### C. Médicaments Pré-Remplis

**✅ Vérifier** dans le tableau de médicaments:

| Nom Commercial | DCI | Dosage | Forme | Posologie | Durée | Quantité |
|----------------|-----|--------|-------|-----------|-------|----------|
| METFORMIN 500mg | Metformin | 500mg | tablet | 2 times daily | 30 days | 1 month supply |
| ASPIRIN 100mg | Acetylsalicylic acid | 100mg | tablet | Once daily | 30 days | 1 month supply |

**Points à vérifier**:
- ✅ **Nom**: METFORMIN 500mg (combiné nom + dosage)
- ✅ **DCI**: Metformin (dénomination commune internationale)
- ✅ **Dosage**: 500mg
- ✅ **Forme**: tablet
- ✅ **Posologie**: 2 times daily
- ✅ **Mode d'Administration**: Oral route
- ✅ **Durée**: 30 days (défaut renouvellement)
- ✅ **Quantité**: 1 month supply (défaut renouvellement)
- ✅ **Justification**: "Prescription renewal - Continuation of chronic treatment"

#### D. Logs Console (Détaillés)

**✅ Checkpoint Console Final**:

```
💊 Prescription renewal mode - generating simplified report

✅ Using AI-validated current medications for renewal: 
[
  {
    name: "METFORMIN",
    generic_name: "Metformin",
    dosage: "500mg",
    form: "tablet",
    frequency: "2 times daily",
    route: "Oral",
    instructions: "Take with meals"
  },
  {
    name: "ASPIRIN",
    generic_name: "Acetylsalicylic acid", 
    dosage: "100mg",
    form: "tablet",
    frequency: "Once daily",
    route: "Oral",
    instructions: "Take in the morning"
  }
]

🔍 CLIENT DEBUG - PROFESSIONAL REPORT:
   💊 currentMedicationsValidated: (2) [{...}, {...}]
   💊 Length: 2

📥 Report received: {...}
   ✅ Success: true
   📋 Medications array: (0) []  ← API n'ajoute pas encore
   
💊 Auto-filling renewal medications: (2) [{...}, {...}]

✅ Medications auto-filled for renewal
```

**⚠️ Note**: Il est NORMAL que l'API retourne `(0) []` car l'API génère seulement le compte-rendu. Les médicaments de renouvellement sont ajoutés **APRÈS** par le client via `sessionStorage`.

---

## 🔍 TESTS DE VALIDATION

### Test 1: Vérifier SessionStorage

**Dans Console F12**:
```javascript
// Avant auto-fill
sessionStorage.getItem('renewalMedications')
// Doit retourner: "[{...},{...}]"

// Après auto-fill (devrait être supprimé)
sessionStorage.getItem('renewalMedications')
// Doit retourner: null
```

### Test 2: Vérifier État du Report

**Dans Console F12**:
```javascript
// Accéder à l'état React (avec React DevTools)
// OU vérifier visuellement dans l'interface

// Les médicaments doivent apparaître dans:
report.ordonnances.medicaments.prescription.medicaments
// Array de 2 objets avec tous les champs remplis
```

### Test 3: Éditer et Valider

1. **Éditer** un médicament (modifier dosage par exemple)
2. **Cliquer** "Save" (💾)
3. **Valider** le rapport complet
4. **Télécharger** le PDF
5. **Vérifier** que les médicaments apparaissent correctement dans le PDF

---

## 🚨 PROBLÈMES POSSIBLES ET SOLUTIONS

### Problème 1: Toast "Rapport simplifié généré. Veuillez ajouter les médicaments manuellement"

**Cause**: `currentMedicationsValidated` est vide ou non disponible

**Solutions**:
1. Vérifier dans Diagnosis Form console: `💊 Length: 0`
2. Si Length = 0, le problème est dans l'API de diagnostic
3. Vérifier que le patient a bien des médicaments dans TIBOK
4. Essayer avec texte brut dans patient-form

### Problème 2: Aucun médicament auto-rempli

**Causes possibles**:
1. `isRenewal` = false (pas détecté comme renouvellement)
2. `sessionStorage.getItem('renewalMedications')` = null
3. Erreur JavaScript bloquante

**Debug**:
```javascript
// Console F12
sessionStorage.getItem('prescriptionRenewal')  // Doit être "true"
sessionStorage.getItem('renewalMedications')   // Doit contenir les meds

// Si null, vérifier logs:
// "💊 Prescription renewal mode" doit apparaître
```

### Problème 3: Format des médicaments incorrect

**Vérifier**:
- DCI doit être rempli (pas vide)
- Dosage doit être présent
- Posologie doit être standardisée
- Durée doit être "30 days"

**Si incorrect**: Partager les logs console complets

---

## 📊 CHECKLIST DE VALIDATION FINALE

Avant de considérer le test comme réussi, vérifier:

- [ ] Toast notification apparaît avec le bon nombre de médicaments
- [ ] Onglet "Prescription Médicaments" s'ouvre automatiquement
- [ ] Médicaments pré-remplis dans le tableau (2 lignes pour 2 meds)
- [ ] Chaque médicament a: nom, DCI, dosage, forme, posologie
- [ ] Durée = "30 days" pour tous
- [ ] Quantité = "1 month supply" pour tous
- [ ] Justification = "Prescription renewal..." pour tous
- [ ] Logs console montrent: "✅ Using AI-validated current medications"
- [ ] Logs console montrent: "✅ Medications auto-filled for renewal"
- [ ] SessionStorage 'renewalMedications' supprimé après auto-fill
- [ ] Édition et validation fonctionnent normalement
- [ ] PDF contient les médicaments correctement

---

## 📞 SUPPORT

Si un test échoue:

1. **Copier** tous les logs console (depuis le début de la consultation)
2. **Faire** une capture d'écran de l'interface
3. **Vérifier** les valeurs SessionStorage
4. **Partager** les informations pour debugging

---

## ✅ RÉSULTAT ATTENDU

**SUCCÈS** = Tous les médicaments du patient sont automatiquement récupérés, validés par l'IA, et pré-remplis dans la prescription de renouvellement sans aucune saisie manuelle.

**TEMPS GAIN** = 2-3 minutes par renouvellement d'ordonnance

**ERREURS ÉVITÉES** = Fautes de frappe, dosages incorrects, DCI manquants

---

**VERSION**: Commit `edb459c`  
**DATE**: 2025-11-12  
**STATUS**: ✅ DÉPLOYÉ
