# 🏥 Support des Consultations de Correspondants Spécialistes - Voice Dictation Workflow

## Vue d'ensemble

Le **Voice Dictation Workflow** supporte maintenant **automatiquement** les consultations de correspondants spécialistes. Le système détecte intelligemment si la dictée provient d'un spécialiste qui reçoit un patient référé par un autre médecin.

## 🎯 Fonctionnalités Clés

### Détection Automatique

Le système identifie automatiquement une consultation de correspondant grâce à des **mots-clés** et au **contexte** de la dictée :

**Mots-clés détectés** :
- "référé par..."
- "envoyé par..."
- "sur demande de..."
- "pour avis spécialisé"
- "correspondant"
- "médecin traitant"
- "médecin référent"

**Contexte analysé** :
- Mention d'examens déjà réalisés
- Référence à un autre médecin
- Objectif d'avis spécialisé
- Plan de retour vers le médecin référent

### Informations Extraites

Pour chaque consultation de correspondant, le système extrait :

1. **Médecin référent**
   - Nom complet (ex: "Dr. Martin", "Docteur Marie Dubois")
   - Spécialité (si mentionnée)

2. **Motif de la référence**
   - Raison précise de l'envoi au spécialiste
   - Question clinique posée

3. **Examens déjà réalisés**
   - Liste des investigations faites par le médecin référent
   - Résultats disponibles

4. **Date de référence**
   - Date d'envoi (si mentionnée)

5. **Urgence**
   - `routine` : Consultation programmée normale
   - `urgent` : Nécessite une prise en charge rapide
   - `emergency` : Urgence médicale

## 📋 Structure des Données

### Format JSON de Réponse

```json
{
  "success": true,
  "consultationType": "specialist_referral",
  "workflow": {
    "step2_extraction": {
      "referralInfo": {
        "referringPhysician": "Dr. Martin",
        "referralReason": "Avis cardiologique pour douleurs thoraciques atypiques",
        "previousInvestigations": [
          "ECG normal",
          "Troponines normales"
        ],
        "referralDate": "2025-12-28",
        "urgency": "routine"
      },
      "consultationType": "specialist_referral"
    }
  }
}
```

### Intégration dans le Rapport

Les informations de correspondant sont intégrées automatiquement dans :

1. **Section "Chief Complaint"**
   - Mentionne le médecin référent
   - Indique le motif de la référence

2. **Section "History of Present Illness"**
   - Inclut les investigations précédentes
   - Contexte de la référence

3. **Section "Diagnostic Conclusion"**
   - Avis du spécialiste
   - Recommandations pour le médecin traitant

4. **Section "Follow-up Plan"**
   - Plan de communication avec le médecin référent
   - Retour prévu vers le médecin traitant

## 🎬 Exemples Pratiques

### Exemple 1 : Consultation Cardiologique

**Dictée**:
```
"Homme de 58 ans référé par Dr. Martin pour avis cardiologique concernant 
douleurs thoraciques atypiques. Patient a déjà fait ECG et troponines qui sont 
normaux selon son médecin traitant. 

Examen d'aujourd'hui : tension 145/85, auscultation cardiaque normale, 
souffle 2/6 systolique au foyer mitral. Pas de signes d'insuffisance cardiaque. 

Mon impression : Je pense qu'il s'agit plutôt de douleurs musculo-squelettiques 
d'origine pariétale. Les examens cardiaques sont rassurants. 

Recommandations : Je recommande test d'effort de dépistage à faire dans les 3 mois. 
Pas de traitement cardiologique immédiat nécessaire. 

Je renvoie le patient à son médecin traitant Dr. Martin avec ces conclusions 
et mes recommandations."
```

**Extraction Automatique**:
```json
{
  "referralInfo": {
    "referringPhysician": "Dr. Martin",
    "referralReason": "Avis cardiologique pour douleurs thoraciques atypiques",
    "previousInvestigations": [
      "ECG normal",
      "Troponines normales"
    ],
    "urgency": "routine"
  }
}
```

**Rapport Généré** :
- ✅ Identification claire du médecin référent
- ✅ Contexte de la référence expliqué
- ✅ Examens précédents documentés
- ✅ Avis du cardiologue détaillé
- ✅ Recommandations claires pour le médecin traitant
- ✅ Plan de communication établi

---

### Exemple 2 : Consultation Dermatologique

**Dictée**:
```
"Femme de 42 ans envoyée par Dr. Dubois pour lésions cutanées persistantes 
depuis 6 mois. Sa médecin traitante a déjà essayé corticoïdes locaux pendant 
3 semaines sans succès.

Examen dermatologique : multiples plaques érythémato-squameuses bien délimitées 
sur coudes et genoux, zones de friction. Signe d'Auspitz positif. 
Pas d'atteinte unguéale. Pas d'atteinte articulaire.

Diagnostic : psoriasis en plaques modéré.

Traitement : Je débute Méthotrexate 15mg par semaine en comprimés avec 
surveillance hépatique mensuelle. Acide folique 5mg la veille. 
Continuer hydratation cutanée.

Lettre de réponse à Dr. Dubois à suivre avec plan de traitement et surveillance."
```

**Extraction Automatique**:
```json
{
  "referralInfo": {
    "referringPhysician": "Dr. Dubois",
    "referralReason": "Lésions cutanées persistantes sans amélioration",
    "previousInvestigations": [
      "Corticoïdes locaux pendant 3 semaines - échec thérapeutique"
    ],
    "urgency": "routine"
  }
}
```

**Rapport Généré** :
- ✅ Médecin traitant identifié : Dr. Dubois
- ✅ Échec thérapeutique précédent documenté
- ✅ Diagnostic spécialisé établi (psoriasis en plaques)
- ✅ Nouveau traitement systémique initié
- ✅ Plan de surveillance détaillé
- ✅ Communication prévue avec le médecin traitant

---

### Exemple 3 : Consultation Endocrinologique Urgente

**Dictée**:
```
"Monsieur 65 ans référé en URGENCE par Dr. Lee pour diabète gravement déséquilibré. 
Dernière HbA1c à 12% il y a 2 semaines malgré bithérapie orale maximale 
Metformine 2g par jour + Gliclazide 160mg deux fois par jour.

Patient présente également une neuropathie diabétique débutante aux pieds 
avec picotements nocturnes. Perte de poids de 5 kg en 2 mois malgré appétit 
conservé.

Glycémie à jeun aujourd'hui : 18 mmol/L. Tension 155/90. Pas de cétonurie.

Décision thérapeutique : Échec de la bithérapie orale. Je débute 
insulinothérapie basale avec Lantus 20 unités le soir à 21h. 
Patient éduqué sur technique d'injection et autosurveillance glycémique.

Plan de suivi : Revoir dans 2 semaines avec carnet glycémique. 
Lettre URGENTE à Dr. Lee pour coordination du suivi et adaptation progressive 
des doses d'insuline."
```

**Extraction Automatique**:
```json
{
  "referralInfo": {
    "referringPhysician": "Dr. Lee",
    "referralReason": "Diabète gravement déséquilibré malgré bithérapie orale",
    "previousInvestigations": [
      "HbA1c 12% (il y a 2 semaines)",
      "Bithérapie orale : Metformine 2g/jour + Gliclazide 160mg BD"
    ],
    "urgency": "urgent"
  }
}
```

**Rapport Généré** :
- ✅ Urgence détectée et documentée
- ✅ Médecin référent : Dr. Lee
- ✅ Historique thérapeutique complet
- ✅ Échec de traitement documenté
- ✅ Nouvelle insulinothérapie initiée
- ✅ Éducation patient documentée
- ✅ Plan de suivi rapproché (2 semaines)
- ✅ Communication urgente avec médecin traitant

---

## 🔧 Utilisation Technique

### Appel API Standard

```javascript
const formData = new FormData();
formData.append('audioFile', audioBlob, 'consultation.mp3');
formData.append('doctorInfo', JSON.stringify({
  fullName: 'Dr. Sophie Cardiologist',
  qualifications: 'MBBS, MD Cardiology',
  specialty: 'Cardiology',
  medicalCouncilNumber: 'MCM98765'
}));

// Pas besoin de spécifier le type - détection automatique !
const response = await fetch('/api/voice-dictation-workflow', {
  method: 'POST',
  body: formData
});

const result = await response.json();

// Vérifier si c'est une consultation de correspondant
if (result.consultationType === 'specialist_referral') {
  const referralInfo = result.workflow.step2_extraction.referralInfo;
  console.log('Médecin référent:', referralInfo.referringPhysician);
  console.log('Motif:', referralInfo.referralReason);
  console.log('Examens précédents:', referralInfo.previousInvestigations);
}
```

### Appel API avec Type Explicite (optionnel)

```javascript
const formData = new FormData();
formData.append('audioFile', audioBlob, 'consultation.mp3');
formData.append('doctorInfo', JSON.stringify({
  fullName: 'Dr. Sophie Cardiologist',
  specialty: 'Cardiology'
}));

// Spécifier explicitement le type de consultation
formData.append('consultationType', 'specialist_referral');

// Ajouter les informations du médecin référent (optionnel)
formData.append('referringPhysician', JSON.stringify({
  name: 'Dr. Martin',
  specialty: 'General Practice',
  contact: '+230 5123 4567'
}));

const response = await fetch('/api/voice-dictation-workflow', {
  method: 'POST',
  body: formData
});
```

## 🎨 Intégration UI

### Exemple de Composant React

```tsx
import { useState } from 'react';

function SpecialistConsultationDictation() {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleDictation = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audioFile', audioBlob, 'specialist-consultation.mp3');
    formData.append('doctorInfo', JSON.stringify({
      fullName: 'Dr. Cardiologist',
      specialty: 'Cardiology'
    }));
    
    const response = await fetch('/api/voice-dictation-workflow', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    setResult(data);
    
    // Afficher les infos de correspondant si présentes
    if (data.consultationType === 'specialist_referral') {
      const referral = data.workflow.step2_extraction.referralInfo;
      console.log('🔍 Consultation de correspondant détectée');
      console.log(`   Référent: ${referral.referringPhysician}`);
      console.log(`   Motif: ${referral.referralReason}`);
    }
  };
  
  return (
    <div>
      <h2>Consultation de Correspondant</h2>
      
      {/* UI d'enregistrement */}
      <button onClick={() => setIsRecording(!isRecording)}>
        {isRecording ? '⏹ Arrêter' : '🎤 Dicter Consultation'}
      </button>
      
      {/* Affichage des résultats */}
      {result && result.consultationType === 'specialist_referral' && (
        <div className="referral-info">
          <h3>📋 Informations de Correspondant</h3>
          <p><strong>Médecin référent:</strong> {result.workflow.step2_extraction.referralInfo.referringPhysician}</p>
          <p><strong>Motif:</strong> {result.workflow.step2_extraction.referralInfo.referralReason}</p>
          <p><strong>Urgence:</strong> {result.workflow.step2_extraction.referralInfo.urgency}</p>
          
          {result.workflow.step2_extraction.referralInfo.previousInvestigations?.length > 0 && (
            <div>
              <strong>Examens déjà réalisés:</strong>
              <ul>
                {result.workflow.step2_extraction.referralInfo.previousInvestigations.map((inv, i) => (
                  <li key={i}>{inv}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🌟 Avantages

### Pour les Spécialistes

1. **Gain de temps**
   - Pas besoin de répéter les informations du médecin référent
   - Extraction automatique du contexte
   - Historique des examens déjà faits automatiquement documenté

2. **Meilleure traçabilité**
   - Communication médecin référent ↔ spécialiste documentée
   - Historique complet des investigations
   - Plan de retour vers le médecin traitant clair

3. **Qualité médicale**
   - Continuité des soins assurée
   - Coordination entre médecins facilitée
   - Pas de perte d'information

### Pour les Médecins Référents

1. **Réponse structurée**
   - Avis du spécialiste clair
   - Recommandations précises
   - Plan de suivi défini

2. **Communication facilitée**
   - Rapport automatiquement généré
   - Format standardisé
   - Informations complètes

3. **Suivi patient amélioré**
   - Traçabilité complète du parcours
   - Recommandations documentées
   - Plan d'action défini

## 📊 Statistiques et Monitoring

Le système track automatiquement :

```json
{
  "metadata": {
    "consultationType": "specialist_referral",
    "referralDetected": true,
    "referringPhysician": "Dr. Martin",
    "specialty": "Cardiology",
    "urgency": "routine",
    "processingTime": "87000ms"
  }
}
```

Ces données permettent :
- ✅ Analyse du flux de référencement
- ✅ Temps de traitement par spécialité
- ✅ Taux d'urgence par type de référence
- ✅ Qualité de la communication inter-médecins

## 🚀 Évolutions Futures Possibles

1. **Notification automatique**
   - Email au médecin référent quand le rapport est prêt
   - SMS d'alerte pour les urgences

2. **Intégration EMR**
   - Envoi automatique du rapport dans le dossier du médecin traitant
   - Mise à jour bidirectionnelle

3. **Analyse de patterns**
   - Identification des motifs de référence fréquents
   - Optimisation des parcours de soins

4. **Lettre de réponse automatique**
   - Génération automatique d'une lettre formelle
   - Format adapté au médecin référent

---

**Version**: 1.0  
**Date**: 30 Décembre 2025  
**Auteur**: Système Tibok Medical AI  
**Statut**: ✅ Production Ready
