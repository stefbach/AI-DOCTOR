# 🐛 DIAGNOSTIC DES PROBLÈMES IDENTIFIÉS - 31 Décembre 2025

## ✅ PROBLÈMES DÉJÀ RÉSOLUS (commits récents)

### 1️⃣ ✅ Préservation des hypothèses du médecin
- **Commit:** `8d8cc39` 
- **Statut:** RÉSOLU
- **Solution:** Ajout de `doctorNotes` dans l'extraction et le workflow complet

### 2️⃣ ✅ Dosages détaillés des prescriptions  
- **Commit:** `bdcd8d8`
- **Statut:** RÉSOLU
- **Solution:** Ajout de `dosing_details` avec dose individuelle, fréquence et total quotidien

### 3️⃣ ✅ Dictée vocale dans l'assistant AI
- **Commit:** `06db56d`
- **Statut:** RÉSOLU
- **Solution:** Ajout du bouton micro dans `medical-report-chat-assistant.tsx`

---

## 🔴 NOUVEAUX PROBLÈMES À RÉSOUDRE

### 4️⃣ 🔴 Médicaments présents dans Management Plan mais absents de l'ordonnance

**Description du problème:**
- Les médicaments sont listés dans le texte du "Management Plan" (priseEnCharge)
- MAIS l'ordonnance structurée (`ordonnances.medicaments`) est VIDE
- Le médecin voit les médicaments mentionnés dans le rapport mais ne peut pas les prescrire

**Analyse technique:**
1. **API `/api/generate-consultation-report`:**
   - Fonction `extractPrescriptionsFromDiagnosisData()` existe (ligne 815)
   - Extrait les médicaments de `diagnosisData.currentMedicationsValidated` ✅
   - Extrait les médicaments de `diagnosisData.expertAnalysis.expert_therapeutics.primary_treatments` ✅
   - Retourne dans `reportStructure.prescriptions.medications` ✅

2. **Frontend `professional-report.tsx`:**
   - Mappe `apiReport.prescriptions.medications` vers `reportData.ordonnances.medicaments` ✅
   - Affiche les médicaments depuis `report.ordonnances.medicaments.prescription.medicaments` ✅

**Hypothèses sur la cause:**
- ❓ `diagnosisData.expertAnalysis.expert_therapeutics.primary_treatments` est vide ou undefined
- ❓ Format de données incompatible entre l'API diagnosis et l'API report
- ❓ Les médicaments sont dans un autre champ (`medications` au lieu de `primary_treatments`)

**Solution proposée:**
1. ✅ LOGS DÉJÀ EN PLACE pour diagnostic (ligne 820-841)
2. Vérifier les logs de production pour voir où les médicaments se perdent
3. Option de fallback: extraire aussi de `diagnosisData.medications` si `primary_treatments` est vide

**Code à ajouter (fallback):**
```typescript
// Ligne ~933, après primary_treatments
const primaryTreatments = diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments || 
                          diagnosisData?.medications || // FALLBACK
                          []
```

---

### 5️⃣ 🔴 Dictée vocale de l'assistant AI n'apparaît pas

**Description du problème:**
- Le bouton micro a été ajouté au composant `medical-report-chat-assistant.tsx`
- MAIS il n'apparaît pas dans l'interface utilisateur

**Analyse technique:**
1. **Code ajouté:** ✅ Commit `06db56d` 
   - States: `isRecording`, `isTranscribing`
   - Fonctions: `startRecording()`, `stopRecording()`, `transcribeAudio()`
   - Bouton micro ajouté dans l'UI (ligne ~418)

2. **Possibles causes:**
   - Le composant n'est pas utilisé dans la page du rapport
   - Un autre composant d'assistant est utilisé à la place
   - Le composant est conditionnel et la condition n'est pas remplie

**Solution proposée:**
1. Vérifier quel composant d'assistant est réellement utilisé dans `professional-report.tsx`
2. S'assurer que `medical-report-chat-assistant.tsx` est bien importé et rendu
3. Vérifier les conditions d'affichage du composant

**Code à vérifier:**
```bash
# Chercher où l'assistant est utilisé
grep -r "MedicalReportChatAssistant\|medical.*assistant" components/professional-report.tsx
```

---

### 6️⃣ 🔴 Identifier en rouge les points importants/urgents

**Description du problème:**
- Les points urgents et importants doivent être visuellement mis en évidence
- Actuellement, tout le texte est uniforme
- Le médecin doit pouvoir repérer rapidement:
  - 🔴 Red flags (signes d'alarme)
  - ⚠️ Contre-indications critiques
  - 🚨 Actions urgentes à effectuer
  - 💊 Interactions médicamenteuses dangereuses

**Solution proposée:**

1. **Dans l'API `/api/openai-diagnosis`:**
   - Marquer les éléments urgents avec un flag `urgency: 'critical' | 'important' | 'routine'`

2. **Dans l'API `/api/generate-consultation-report`:**
   - Détecter automatiquement les mots-clés urgents dans le texte
   - Ajouter des balises HTML `<span class="urgent">...</span>`

3. **Dans `professional-report.tsx`:**
   - Créer des composants visuels pour les alertes
   - Styles CSS:
     ```css
     .urgent-critical { color: #dc2626; font-weight: bold; }
     .urgent-important { color: #f59e0b; font-weight: 600; }
     .urgent-routine { color: inherit; }
     ```

**Mots-clés à détecter:**
- **CRITIQUE:** "urgent", "immediately", "emergency", "critical", "danger", "life-threatening"
- **IMPORTANT:** "important", "caution", "warning", "attention", "contraindicated", "avoid"

**Code à ajouter:**
```typescript
// Fonction pour détecter et marquer l'urgence
function markUrgentContent(text: string): { text: string, urgency: 'critical' | 'important' | 'routine' } {
  const criticalKeywords = /urgent|immediately|emergency|critical|danger|life-threatening/i
  const importantKeywords = /important|caution|warning|attention|contraindicated|avoid|must not/i
  
  if (criticalKeywords.test(text)) {
    return { text, urgency: 'critical' }
  } else if (importantKeywords.test(text)) {
    return { text, urgency: 'important' }
  }
  return { text, urgency: 'routine' }
}
```

---

## 📋 PLAN D'ACTION

### Priorité 1 (URGENT):
1. ✅ Comprendre pourquoi les médicaments ne s'affichent pas dans l'ordonnance
2. ✅ Vérifier les logs de production
3. ✅ Ajouter le fallback pour `diagnosisData.medications`

### Priorité 2 (IMPORTANT):
4. ✅ Vérifier quel composant d'assistant est utilisé
5. ✅ S'assurer que le bouton micro est visible

### Priorité 3 (AMÉLIORATION):
6. ✅ Implémenter le système de marquage visuel des éléments urgents
7. ✅ Ajouter les styles CSS pour les alertes
8. ✅ Tester avec un rapport réel

---

## 🔧 COMMANDES UTILES POUR LE DIAGNOSTIC

```bash
# Vérifier les médicaments dans diagnosisData
cd /home/user/webapp
grep -r "primary_treatments\|medications" app/api/openai-diagnosis/route.ts | head -20

# Vérifier l'assistant utilisé
grep -r "assistant\|Assistant" components/professional-report.tsx | head -20

# Tester l'extraction des médicaments
node -e "const data = require('./test-diagnosis-data.json'); console.log(data.medications)"
```

---

## 📊 STATUT GLOBAL

| Problème | Statut | Commit | Fichiers modifiés |
|----------|--------|--------|-------------------|
| 1. Hypothèses médecin | ✅ RÉSOLU | 8d8cc39 | 4 fichiers |
| 2. Dosages détaillés | ✅ RÉSOLU | bdcd8d8 | 2 fichiers |
| 3. Dictée vocale assistant | ✅ RÉSOLU | 06db56d | 1 fichier |
| 4. Médicaments ordonnance | 🔴 À RÉSOUDRE | - | - |
| 5. Bouton micro invisible | 🔴 À RÉSOUDRE | - | - |
| 6. Points urgents en rouge | 🔴 À IMPLÉMENTER | - | - |

**Total:** 3/6 résolus (50%)

---

**Date:** 31 Décembre 2025  
**Branche:** main  
**Dernier commit:** 06db56d
