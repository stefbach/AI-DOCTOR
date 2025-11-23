# 🤖 Guide d'utilisation - Assistant Médical AI

## Vue d'ensemble

L'**Assistant Médical AI** est un outil conversationnel intelligent qui aide les médecins à réviser, corriger et améliorer leurs rapports de consultation médicale en temps réel.

## Caractéristiques principales

### ✅ Modifications intelligentes
- **Médicaments**: Ajouter, modifier (dosage, fréquence, durée), ou supprimer
- **Examens de laboratoire**: Suggérer ou ajouter tests pertinents selon diagnostic
- **Imagerie médicale**: Recommander radiologie, échographie, scanner, IRM, etc.
- **Sections narratives**: Compléter ou corriger le compte-rendu médical

### 🧠 Intelligence contextuelle
- Comprend le diagnostic et l'historique du patient
- Considère le statut de grossesse si applicable
- Vérifie les contre-indications médicamenteuses
- Alerte sur les interactions médicamenteuses
- Suggère des examens basés sur les meilleures pratiques

### 🔒 Sécurité médicale
- Nomenclature DCI (Dénomination Commune Internationale) obligatoire
- Format de dosage UK: OD (1x/jour), BD (2x/jour), TDS (3x/jour), QDS (4x/jour)
- Validation des doses maximales
- Vérification des contre-indications

---

## 📖 Exemples d'utilisation

### 1. Ajouter un médicament

**Commande docteur:**
```
Ajoute Paracétamol 1g TDS pendant 5 jours pour la fièvre
```

**Réponse assistant:**
```
✅ Médicament ajouté:
- Nom: Paracétamol 1g
- DCI: Paracetamol
- Dosage: 1g
- Fréquence: TDS (3 fois par jour)
- Durée: 5 jours
- Indication: Traitement symptomatique de la fièvre

⚠️ Dose maximale: 4g/jour respectée ✅

[Bouton: Appliquer]
```

---

### 2. Modifier un médicament existant

**Commande docteur:**
```
Change le dosage de l'Amoxicilline à 1g BD au lieu de 500mg TDS
```

**Réponse assistant:**
```
✅ Modification proposée:
Médicament #3: Amoxicillin

AVANT:
- Dosage: 500mg
- Fréquence: TDS (3 fois par jour)
- Dose journalière: 1500mg

APRÈS:
- Dosage: 1g
- Fréquence: BD (2 fois par jour)
- Dose journalière: 2000mg

📋 Raisonnement: Dosage augmenté pour infections plus sévères, 
fréquence réduite pour améliorer l'observance

[Bouton: Appliquer]
```

---

### 3. Supprimer une prescription

**Commande docteur:**
```
Retire l'Ibuprofène, patient allergique aux AINS
```

**Réponse assistant:**
```
⚠️ Suppression recommandée:
Médicament #2: Ibuprofen 400mg TDS

Raison: Allergie documentée aux AINS (Anti-Inflammatoires Non Stéroïdiens)

💡 Alternative suggérée:
- Paracétamol 1g TDS (analgésique non-AINS)
- Dose max: 4g/jour

[Bouton: Supprimer]
```

---

### 4. Suggérer des examens complémentaires

**Commande docteur:**
```
Suggère des examens pour ce patient diabétique
```

**Réponse assistant:**
```
📋 Examens recommandés pour suivi diabétique:

LABORATOIRE (Priorité HAUTE):
1. HbA1c (Hémoglobine glyquée)
   - Indication: Contrôle glycémique sur 3 mois
   - Fréquence: Tous les 3-6 mois
   - Tube: EDTA (violet)

2. Glycémie à jeun
   - Indication: Évaluation du contrôle glycémique actuel
   - Jeûne: 8-12 heures requis

3. Profil lipidique complet
   - Indication: Dépistage complications cardiovasculaires
   - Inclut: Cholestérol total, LDL, HDL, Triglycérides

4. Créatinine + DFG
   - Indication: Fonction rénale (néphropathie diabétique)

5. Microalbuminurie
   - Indication: Dépistage précoce atteinte rénale

IMAGERIE (Priorité MOYENNE):
1. Échographie rénale
   - Si anomalies fonction rénale

[Bouton: Ajouter tous les examens]
[Bouton: Sélectionner individuellement]
```

---

### 5. Vérifier interactions médicamenteuses

**Commande docteur:**
```
Vérifie s'il y a des interactions entre les médicaments prescrits
```

**Réponse assistant:**
```
🔍 Analyse des interactions médicamenteuses:

✅ Aucune interaction majeure détectée

⚠️ ATTENTION - Interaction modérée:
Médicament A: Metformin 1g BD
Médicament B: Furosemide 40mg OD

Type: Interaction pharmacodynamique
Effet: Le furosémide peut augmenter la glycémie
Recommandation: Surveillance glycémique renforcée

💡 SUGGESTION:
Ajuster si besoin la dose de Metformin selon glycémie

Références: BNF (British National Formulary)
```

---

### 6. Compléter une section narrative

**Commande docteur:**
```
Améliore la section "Examen physique" pour la dermatologie
```

**Réponse assistant:**
```
📝 Section "Examen Physique" - Amélioration suggérée:

AVANT:
"Lésion pigmentée observée sur l'avant-bras"

APRÈS (Version détaillée):
"EXAMEN DERMATOLOGIQUE:

Inspection visuelle:
- Localisation: Face dorsale avant-bras droit, tiers moyen
- Morphologie: Macule pigmentée irrégulière de 8mm de diamètre
- Critères ABCDE:
  * Asymétrie: Présente (score 1/1)
  * Bordure: Irrégulière avec indentation (score 1/1)
  * Couleur: Hétérogène (brun, noir, zones claires) (score 1/1)
  * Diamètre: 8mm (> 6mm) (score 1/1)
  * Évolution: Changement taille et couleur 3 derniers mois (score 1/1)

Score ABCDE total: 5/5 → SUSPICION ÉLEVÉE de mélanome

Palpation: Légèrement surélevée, surface lisse
Adénopathies: Absence adénopathie axillaire ou épitrochléenne palpable

CONCLUSION: Lésion suspecte nécessitant biopsie excisionnelle urgente"

[Bouton: Appliquer]
```

---

## 🎯 Modes d'utilisation

### Mode Assistant (par défaut)
```typescript
<MedicalReportChatAssistant 
  mode="assistant"
  reportContext={reportContext}
  onApplyAction={handleApplyAction}
  onUpdateReport={handleUpdateReport}
/>
```
- Réponse à toutes questions
- Assistance générale
- Modifications à la demande

### Mode Correction
```typescript
mode="correction"
```
- Focus sur détection d'erreurs
- Vérification cohérence médicale
- Validation dosages et contre-indications

### Mode Suggestion
```typescript
mode="suggestion"
```
- Suggestions proactives d'amélioration
- Examens complémentaires recommandés
- Optimisation du rapport

---

## 🔧 Intégration dans un rapport

### Exemple: Rapport de dermatologie

```typescript
import MedicalReportChatAssistant from "@/components/medical-report-chat-assistant"

// Dans votre composant de rapport
const [medications, setMedications] = useState([...])
const [labTests, setLabTests] = useState([...])
const [imagingStudies, setImagingStudies] = useState([...])
const [narrativeContent, setNarrativeContent] = useState({...})

// Préparer le contexte
const reportContext = {
  patientInfo: {
    age: patientData.age,
    gender: patientData.gender,
    pregnancyStatus: patientData.pregnancyStatus
  },
  diagnosis: {
    primary: diagnosisData.primaryDiagnosis?.name,
    differentials: diagnosisData.differentialDiagnoses?.map(d => d.condition)
  },
  medications: medications,
  labTests: labTests,
  imagingStudies: imagingStudies,
  narrativeContent: narrativeContent,
  consultationType: 'dermatology' // ou 'general', 'chronic'
}

// Handler pour appliquer les actions
const handleApplyAction = (action) => {
  switch (action.type) {
    case 'add':
      if (action.target === 'medication') {
        setMedications([...medications, action.data])
      } else if (action.target === 'lab_test') {
        setLabTests([...labTests, action.data])
      }
      break
      
    case 'modify':
      if (action.target === 'medication') {
        const updated = [...medications]
        updated[action.data.index] = {
          ...updated[action.data.index],
          ...action.data.changes
        }
        setMedications(updated)
      }
      break
      
    case 'delete':
      if (action.target === 'medication') {
        setMedications(medications.filter((_, i) => i !== action.data.index))
      }
      break
      
    case 'modify':
      if (action.target === 'narrative') {
        setNarrativeContent({
          ...narrativeContent,
          [action.data.section]: action.data.content
        })
      }
      break
  }
  
  // Sauvegarder les modifications
  saveReportDraft()
}

// Render
return (
  <div className="grid grid-cols-2 gap-6">
    {/* Rapport médical à gauche */}
    <div>
      <MedicalReportContent {...reportData} />
    </div>
    
    {/* Assistant AI à droite */}
    <div>
      <MedicalReportChatAssistant 
        reportContext={reportContext}
        onApplyAction={handleApplyAction}
        onUpdateReport={handleUpdateReport}
        mode="assistant"
      />
    </div>
  </div>
)
```

---

## 📊 Exemples de commandes rapides

### Médicaments
- ✅ "Ajoute Amoxicilline 1g BD pendant 7 jours"
- ✅ "Change le dosage de Paracétamol à 1g QDS"
- ✅ "Retire l'Ibuprofène"
- ✅ "Remplace Amoxicilline par Azithromycine (allergie pénicilline)"

### Examens de laboratoire
- ✅ "Ajoute une NFS avec formule"
- ✅ "Suggère des tests pour une infection urinaire"
- ✅ "Ajoute HbA1c et glycémie à jeun"
- ✅ "Vérifie la fonction rénale"

### Imagerie
- ✅ "Demande une radiographie thoracique"
- ✅ "Ajoute une échographie abdominale"
- ✅ "Suggère imagerie pour douleur abdominale aiguë"

### Corrections narratives
- ✅ "Améliore la description de l'examen physique"
- ✅ "Complète l'histoire de la maladie actuelle"
- ✅ "Ajoute des détails sur le plan de suivi"

### Vérifications
- ✅ "Vérifie toutes les prescriptions"
- ✅ "Y a-t-il des contre-indications ?"
- ✅ "Contrôle les interactions médicamenteuses"
- ✅ "Le rapport est-il complet ?"

---

## 🚀 Prochaines étapes

1. ✅ API créée et fonctionnelle
2. ✅ Composant UI chat moderne
3. ⏳ Intégration dans dermatology-professional-report
4. ⏳ Intégration dans rapport général
5. ⏳ Tests avec utilisateurs réels (médecins)

---

## 💡 Conseils d'utilisation

### Pour obtenir les meilleurs résultats:

1. **Soyez spécifique**: "Ajoute Paracétamol 1g TDS" au lieu de "Ajoute un antalgique"

2. **Utilisez le contexte**: L'assistant connaît le diagnostic et l'historique

3. **Posez des questions**: "Pourquoi suggères-tu ce test ?" pour comprendre le raisonnement

4. **Vérifiez toujours**: Même si l'IA est intelligente, validation médicale finale requise

5. **Actions rapides**: Utilisez les boutons pré-définis pour tâches courantes

---

## 🛠️ Support technique

Pour toute question ou problème:
- Consulter les logs console du navigateur
- Vérifier les réponses de l'API `/api/medical-report-assistant`
- Tester avec différents modes (assistant/correction/suggestion)

---

**Version**: 1.0  
**Date**: 2025-11-23  
**Status**: ✅ Production Ready
