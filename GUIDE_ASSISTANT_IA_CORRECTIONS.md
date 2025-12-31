# 🤖 Guide : Assistant IA pour Corrections du Rapport Médical

**Date**: 31 décembre 2025  
**Version**: 1.0  
**Statut**: ✅ Pleinement Fonctionnel

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités disponibles](#fonctionnalités-disponibles)
3. [Comment utiliser l'assistant](#comment-utiliser-lassistant)
4. [Exemples de commandes](#exemples-de-commandes)
5. [Types d'actions supportées](#types-dactions-supportées)
6. [Dictée vocale dans le chat](#dictée-vocale-dans-le-chat)
7. [Limitations et bonnes pratiques](#limitations-et-bonnes-pratiques)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que l'Assistant IA ?

L'**Assistant IA TIBOK** (TibokMedicalAssistant) est un chatbot intelligent intégré dans chaque rapport médical généré. Il permet au médecin de :

✅ **Demander des corrections** du rapport par simple chat  
✅ **Ajouter/modifier des médicaments** via des commandes naturelles  
✅ **Suggérer des examens** de laboratoire ou d'imagerie  
✅ **Vérifier les interactions** médicamenteuses  
✅ **Améliorer le contenu** du rapport médical  
✅ **Utiliser la dictée vocale** pour dicter les demandes  

### Où le trouver ?

L'assistant se trouve dans **l'onglet "AI Assistant"** du rapport de consultation :
```
Rapport Médical
└── Onglets : Report | Prescriptions | Lab Tests | Imaging | AI Assistant ← ICI
```

---

## 🚀 Fonctionnalités disponibles

### 1️⃣ Chat Textuel
- Tapez vos demandes directement dans le chat
- L'IA comprend le **langage naturel** (français ou anglais)
- Répond en **anglais** avec des actions applicables

### 2️⃣ Dictée Vocale 🎤
- Cliquez sur le **bouton micro** 🎤
- Dictez votre demande
- Le texte est **transcrit automatiquement**
- Envoyez comme un message normal

### 3️⃣ Actions Rapides
Boutons prédéfinis pour les tâches courantes :
- 🧪 **Suggest Lab Tests** - Suggérer analyses biologiques
- 📊 **Suggest Imaging** - Suggérer examens paracliniques
- 📝 **Improve Report** - Améliorer le rapport
- ⚠️ **Check Interactions** - Vérifier interactions médicamenteuses
- 💊 **Optimize Medication** - Optimiser les prescriptions

### 4️⃣ Application Automatique
- Les suggestions apparaissent sous forme de **cartes d'action**
- Cliquez sur **"Apply"** pour appliquer directement au rapport
- **Toast de confirmation** après application
- **Undo possible** via les fonctions d'édition standard

---

## 💡 Comment utiliser l'assistant

### Workflow Standard

```
1. Générez le rapport médical
   ↓
2. Allez dans l'onglet "AI Assistant"
   ↓
3. Demandez une correction (texte ou voix)
   ↓
4. L'IA propose des actions structurées
   ↓
5. Cliquez "Apply" pour appliquer
   ↓
6. Vérifiez le rapport mis à jour
```

### Interface du Chat

```
┌─────────────────────────────────────────┐
│  AI ASSISTANT                      [−]  │ ← Minimiser
├─────────────────────────────────────────┤
│  👨‍⚕️ Docteur: "Ajouter Metformin 500mg" │
│  🤖 Assistant: "✅ Action proposée"     │
│     [📋 Apply: Add Metformin 500mg]     │ ← Cliquer pour appliquer
├─────────────────────────────────────────┤
│  [🎤] [Type message...] [Send]          │ ← Micro + Input + Envoi
└─────────────────────────────────────────┘
```

---

## 📝 Exemples de Commandes

### ✅ Ajouter un Médicament

**Commande** :
```
"Ajouter Metformin 500mg BD pour diabète"
```

**Réponse IA** :
```json
{
  "type": "modify_medication_prescription",
  "action": "add",
  "content": {
    "name": "Metformin 500mg",
    "generic_name": "Metformin",
    "dosage": "500mg",
    "dosing": "BD (twice daily)",
    "indication": "Type 2 diabetes management",
    "duration": "Ongoing treatment"
  },
  "reasoning": "Add Metformin for diabetes control"
}
```

**Bouton Action** : `Apply: Add Metformin 500mg`  
**Résultat** : Médicament ajouté à l'ordonnance ✅

---

### ✅ Modifier un Médicament

**Commande** :
```
"Augmenter Amlodipine à 10mg"
```

**Réponse IA** :
```json
{
  "type": "modify_medication_prescription",
  "action": "update",
  "content": {
    "index": 0,
    "name": "Amlodipine 10mg",
    "dosage": "10mg"
  },
  "reasoning": "Increase Amlodipine dose to 10mg"
}
```

---

### ✅ Ajouter un Test de Laboratoire

**Commande** :
```
"Prescrire HbA1c pour surveillance diabète"
```

**Réponse IA** :
```json
{
  "type": "modify_lab_prescription",
  "action": "add",
  "content": {
    "category": "Biochemistry",
    "test_name": "HbA1c (Glycated Hemoglobin)",
    "clinical_indication": "Diabetes monitoring - assessment of glycemic control over 3 months",
    "fasting_required": false,
    "urgent": false
  },
  "reasoning": "Monitor diabetes control"
}
```

---

### ✅ Ajouter un Examen d'Imagerie

**Commande** :
```
"Prescrire ECG pour suspicion d'arythmie"
```

**Réponse IA** :
```json
{
  "type": "modify_paraclinical_prescription",
  "action": "add",
  "content": {
    "exam_name": "12-lead Electrocardiogram (ECG)",
    "clinical_indication": "Suspected cardiac arrhythmia - rhythm assessment",
    "urgency": "routine",
    "special_instructions": "Perform at rest"
  },
  "reasoning": "ECG for arrhythmia assessment"
}
```

---

### ✅ Modifier le Rapport Médical

**Commande** :
```
"Ajouter dans le plan de suivi : contrôle tension artérielle dans 2 semaines"
```

**Réponse IA** :
```json
{
  "type": "modify_medical_report",
  "section": "surveillance",
  "content": {
    "value": "Blood pressure monitoring in 2 weeks. Target: <140/90 mmHg. Adjust medication if BP remains elevated."
  },
  "reasoning": "Add BP follow-up plan"
}
```

---

### ✅ Vérifier les Interactions

**Commande** :
```
"Vérifier interactions entre Warfarin et Ibuprofen"
```

**Réponse IA** :
```
⚠️ MAJOR INTERACTION DETECTED:
Warfarin + Ibuprofen (NSAID) → Increased bleeding risk

Recommendation:
- Avoid NSAIDs with warfarin if possible
- Alternative: Paracetamol 1g QDS for pain
- If NSAID essential: Use PPI gastroprotection + close INR monitoring
```

**Action Suggérée** :
```json
{
  "type": "modify_medication_prescription",
  "action": "add",
  "content": {
    "name": "Paracetamol 1g",
    "dosing": "QDS PRN",
    "indication": "Pain relief - safer alternative to NSAIDs with warfarin"
  },
  "reasoning": "Replace Ibuprofen with Paracetamol (safer with warfarin)"
}
```

---

## 🎯 Types d'Actions Supportées

### 1. `modify_medication_prescription`
**Permet** :
- ✅ Ajouter un médicament (`action: "add"`)
- ✅ Modifier un médicament (`action: "update"`)
- ✅ Supprimer un médicament (`action: "remove"`)

**Champs** :
- `name` - Nom du médicament avec dose
- `generic_name` / `dci` - DCI (International Non-proprietary Name)
- `dosage` - Dosage (ex: "500mg")
- `form` / `forme` - Forme (tablet, capsule, syrup, etc.)
- `dosing` / `posologie` - Posologie UK format (OD, BD, TDS, QDS)
- `route` / `modeAdministration` - Voie (Oral, IV, IM, etc.)
- `duration` / `dureeTraitement` - Durée (ex: "7 days", "Ongoing")
- `indication` / `justification` - Indication médicale
- `instructions` - Instructions spécifiques

---

### 2. `modify_lab_prescription`
**Permet** :
- ✅ Ajouter un test biologique
- ✅ Modifier un test
- ✅ Supprimer un test

**Catégories** :
- `Hematology` - NFS, Hémoglobine, Plaquettes
- `Biochemistry` - Glycémie, HbA1c, Créatinine, Ionogramme
- `Immunology` - Sérologies, Auto-anticorps
- `Microbiology` - Cultures, Antibiogrammes
- `Hormones` - TSH, T4, Cortisol
- `Tumor_Markers` - PSA, CA 19-9, CEA
- `Toxicology` - Dosage médicaments, Métaux lourds

**Champs** :
- `category` - Catégorie du test
- `test_name` - Nom exact du test
- `clinical_indication` - Indication clinique
- `fasting_required` - Jeûne requis (true/false)
- `urgent` - Urgence (true/false)
- `special_instructions` - Instructions spéciales

---

### 3. `modify_paraclinical_prescription`
**Permet** :
- ✅ Ajouter un examen d'imagerie/paraclinique
- ✅ Modifier un examen
- ✅ Supprimer un examen

**Types d'examens** :
- **Imagerie** : X-Ray, CT Scan, MRI, Ultrasound, PET Scan
- **Cardiologie** : ECG, Echocardiography, Stress Test, Holter Monitor
- **Endoscopies** : Gastroscopy, Colonoscopy, Bronchoscopy
- **Explorations fonctionnelles** : EFR (Pulmonary Function), EEG, EMG
- **Biopsies** : Skin, Lymph Node, Liver, etc.

**Champs** :
- `exam_name` - Nom de l'examen
- `clinical_indication` - Indication clinique
- `urgency` - Urgence (`routine`, `urgent`, `emergency`)
- `contrast_required` - Contraste requis (true/false)
- `special_instructions` - Instructions spéciales
- `preparation_instructions` - Préparation du patient

---

### 4. `modify_medical_report`
**Permet** :
- ✅ Modifier une section du rapport

**Sections modifiables** :
- `motifConsultation` - Motif de consultation
- `anamnese` - Anamnèse et histoire
- `examenClinique` - Examen clinique
- `syntheseDiagnostique` - Synthèse diagnostique
- `conclusionDiagnostique` - Conclusion diagnostique
- `priseEnCharge` - Plan de traitement
- `surveillance` - Plan de suivi
- `conclusion` - Remarques finales

**Format** :
```json
{
  "type": "modify_medical_report",
  "section": "surveillance",
  "content": {
    "value": "Updated text for the section"
  }
}
```

---

## 🎤 Dictée Vocale dans le Chat

### Comment Activer

1. **Cliquez sur le bouton micro** 🎤 à gauche du champ de texte
2. Le bouton devient **rouge** 🔴 → enregistrement en cours
3. **Dictez votre demande** clairement
4. **Cliquez à nouveau** pour arrêter
5. Le texte apparaît **automatiquement** dans l'input
6. **Cliquez "Send"** ou appuyez sur Entrée

### États du Bouton Micro

```
🎤 Gris     → Prêt à enregistrer
🔴 Rouge    → Enregistrement en cours
⏳ Spinner  → Transcription Whisper en cours
✅ Texte    → Transcription complétée dans l'input
```

### Exemples de Dictée

**Dictée** :
> "Ajouter Metformin cinq cents milligrammes deux fois par jour pour diabète type deux"

**Transcription** :
```
"Ajouter Metformin 500mg 2 fois par jour pour diabète type 2"
```

**Résultat** : L'IA comprend et génère l'action appropriée ✅

---

### Astuces pour une Bonne Transcription

✅ **Parlez clairement** et distinctement  
✅ **Utilisez des chiffres** : "cinq cents" ou "500"  
✅ **Précisez les unités** : "milligrammes", "mg"  
✅ **Énoncez la fréquence** : "deux fois par jour", "1/j"  
✅ **Évitez le bruit ambiant** pour une meilleure qualité  

---

## ⚡ Actions Rapides (Quick Actions)

### Liste des Actions Prédéfinies

| Icône | Action | Description |
|-------|--------|-------------|
| 🧪 | **Suggest Lab Tests** | Suggère 1-2 tests biologiques adaptés au diagnostic |
| 📊 | **Suggest Imaging** | Suggère 1-2 examens d'imagerie pertinents |
| 📝 | **Improve Report** | Améliore les sections du rapport médical |
| ⚠️ | **Check Interactions** | Vérifie interactions entre médicaments prescrits |
| 💊 | **Optimize Medication** | Optimise les prescriptions médicamenteuses |

### Comment Utiliser

1. Cliquez sur le bouton d'une **Quick Action**
2. La demande est **envoyée automatiquement** à l'IA
3. L'IA **analyse le rapport** et propose des actions
4. **Cliquez "Apply"** sur les suggestions pertinentes

---

## 🔧 Limitations et Bonnes Pratiques

### Limitations

⚠️ **Maximum 2 actions par réponse**
- L'IA génère au maximum 2 actions à la fois
- Si vous avez besoin de plus, faites plusieurs demandes

⚠️ **Réponse limitée à 300 caractères**
- L'IA est concise pour économiser les tokens
- Les détails sont dans les actions structurées

⚠️ **Pas d'analyse longue**
- L'IA ne fait pas de longs résumés
- Elle se concentre sur les actions concrètes

⚠️ **Langue des réponses en anglais**
- L'IA répond en anglais (standard médical international)
- Mais comprend les demandes en français

---

### Bonnes Pratiques

✅ **Soyez spécifique** :
```
❌ "Ajouter un médicament"
✅ "Ajouter Metformin 500mg BD pour diabète"
```

✅ **Une demande à la fois** :
```
❌ "Ajouter 5 médicaments : Metformin, Amlodipine, Aspirin, Atorvastatin, Omeprazole"
✅ "Ajouter Metformin 500mg BD" → Apply → "Ajouter Amlodipine 5mg OD" → Apply
```

✅ **Vérifiez avant d'appliquer** :
```
1. Lisez l'action proposée
2. Vérifiez les dosages
3. Confirmez la pertinence clinique
4. Cliquez "Apply" si correct
```

✅ **Utilisez les actions rapides** :
```
Pour des tâches courantes, les Quick Actions sont plus rapides que de taper
```

✅ **Profitez de la dictée vocale** :
```
Plus rapide que taper, surtout pour des demandes longues
```

---

## 📊 Exemples de Cas d'Usage

### Cas 1 : Diabète Type 2 Nouvellement Diagnostiqué

**Situation** : Rapport généré, mais manque HbA1c et Metformin

**Actions du Médecin** :
1. Chat : "Ajouter Metformin 500mg BD"
2. Click "Apply"
3. Chat : "Prescrire HbA1c baseline"
4. Click "Apply"

**Résultat** :
- ✅ Metformin ajouté à l'ordonnance
- ✅ HbA1c ajouté aux examens biologiques
- ✅ Rapport complet et cohérent

---

### Cas 2 : Hypertension Non Contrôlée

**Situation** : Patient sous Amlodipine 5mg, TA toujours élevée

**Actions du Médecin** :
1. Chat : "Augmenter Amlodipine à 10mg"
2. Click "Apply"
3. Chat : "Ajouter suivi TA dans 2 semaines"
4. Click "Apply"

**Résultat** :
- ✅ Posologie Amlodipine modifiée
- ✅ Plan de suivi ajouté au rapport

---

### Cas 3 : Suspicion d'Infarctus

**Situation** : Douleur thoracique, besoin d'investigations urgentes

**Actions du Médecin** :
1. Quick Action : "Suggest Lab Tests"
2. IA propose : Troponin, CK-MB
3. Click "Apply"
4. Quick Action : "Suggest Imaging"
5. IA propose : ECG 12-lead urgent
6. Click "Apply"

**Résultat** :
- ✅ Troponin et CK-MB prescrits (urgent)
- ✅ ECG prescrit (urgent)
- ✅ Investigations appropriées pour ACS

---

## 🎓 Formation Recommandée

### Pour les Nouveaux Utilisateurs

1. **Générez un rapport test**
2. **Ouvrez l'onglet AI Assistant**
3. **Essayez les Quick Actions** d'abord
4. **Testez la dictée vocale** avec des demandes simples
5. **Pratiquez avec différents types de demandes**

### Progression d'Apprentissage

```
Niveau 1: Quick Actions (1 jour)
   ↓
Niveau 2: Chat textuel simple (2-3 jours)
   ↓
Niveau 3: Dictée vocale (1 semaine)
   ↓
Niveau 4: Demandes complexes (2 semaines)
   ↓
Expert: Utilisation fluide et efficace
```

---

## ✅ Checklist de Validation

Après avoir appliqué une action, vérifiez :

- [ ] **L'action a été appliquée** (toast de confirmation)
- [ ] **Les données sont correctes** (dosage, indication, etc.)
- [ ] **Pas de duplication** (médicament déjà présent ?)
- [ ] **Cohérence clinique** (compatible avec diagnostic ?)
- [ ] **Interactions vérifiées** (si nouveau médicament)

---

## 🆘 Dépannage

### Problème : L'IA ne répond pas

**Solutions** :
1. Vérifiez votre connexion Internet
2. Rafraîchissez la page
3. Réessayez la demande

---

### Problème : Action ne s'applique pas

**Solutions** :
1. Vérifiez les logs de la console (F12)
2. Assurez-vous que le rapport n'est pas validé (locked)
3. Vérifiez les permissions

---

### Problème : Dictée vocale ne fonctionne pas

**Solutions** :
1. Autorisez l'accès au micro dans votre navigateur
2. Vérifiez que le micro fonctionne (paramètres système)
3. Utilisez Chrome/Edge (meilleur support WebRTC)

---

## 📚 Ressources Complémentaires

- **Documentation API** : `/api/tibok-medical-assistant`
- **Code Source** : `components/tibok-medical-assistant.tsx`
- **Prompt System** : Voir code API ligne 61+
- **Actions Schema** : Voir interface ligne 51+

---

## 🎉 Conclusion

L'**Assistant IA TIBOK** est un outil puissant qui permet au médecin de :

✅ **Gagner du temps** sur les corrections manuelles  
✅ **Améliorer la qualité** des rapports médicaux  
✅ **Éviter les oublis** (tests, médicaments)  
✅ **Vérifier les interactions** automatiquement  
✅ **Utiliser la voix** pour encore plus de rapidité  

**Utilisez-le régulièrement pour optimiser votre workflow ! 🚀**

---

*Guide créé le 31 décembre 2025*  
*Version: 1.0*  
*Status: Production Ready ✅*
