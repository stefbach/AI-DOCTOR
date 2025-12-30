# 🎤 WORKFLOW DICTÉE VOCALE - DOCUMENTATION TECHNIQUE

## Vue d'ensemble

Le **Voice Dictation Workflow** est un système complet qui transforme une dictée vocale médicale en un rapport de consultation professionnel complet avec diagnostic et prescriptions.

### Architecture du workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    VOICE DICTATION WORKFLOW                              │
│                                                                           │
│  INPUT                                                                    │
│  ┌─────────────┐                                                         │
│  │ Audio File  │ (MP3, WAV, M4A, FLAC...)                               │
│  │ Doctor Info │                                                         │
│  └──────┬──────┘                                                         │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ STEP 1: TRANSCRIPTION WHISPER                                │       │
│  │ - Modèle: whisper-1                                          │       │
│  │ - Auto-détection langue (FR/EN)                              │       │
│  │ - Format: verbose_json                                       │       │
│  │ - Output: Texte + durée + langue                            │       │
│  └──────┬───────────────────────────────────────────────────────┘       │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ STEP 2: EXTRACTION DONNÉES CLINIQUES (GPT-4o)               │       │
│  │ - Extraction structurée des infos patient                    │       │
│  │ - Extraction motif de consultation                           │       │
│  │ - Extraction symptômes + durée                               │       │
│  │ - Extraction signes vitaux                                   │       │
│  │ - Extraction antécédents + médicaments actuels               │       │
│  │ - Output: JSON structuré complet                             │       │
│  └──────┬───────────────────────────────────────────────────────┘       │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ STEP 3: PRÉPARATION POUR DIAGNOSTIC                         │       │
│  │ - Transformation au format openai-diagnosis                  │       │
│  │ - Normalisation des données                                  │       │
│  │ - Structuration patientData + clinicalData                   │       │
│  └──────┬───────────────────────────────────────────────────────┘       │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ STEP 4: APPEL API OPENAI-DIAGNOSIS                          │       │
│  │ - Analyse diagnostique complète                              │       │
│  │ - Raisonnement clinique expert                               │       │
│  │ - Plan thérapeutique avec prescriptions                      │       │
│  │ - Investigations recommandées                                │       │
│  │ - Validation médicale + DCI précis                           │       │
│  └──────┬───────────────────────────────────────────────────────┘       │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ STEP 5: APPEL API GENERATE-CONSULTATION-REPORT              │       │
│  │ - Génération rapport complet                                 │       │
│  │ - Sections narratives professionnelles                       │       │
│  │ - Ordonnances formatées                                      │       │
│  │ - Examens de laboratoire                                     │       │
│  │ - Imagerie médicale                                          │       │
│  └──────┬───────────────────────────────────────────────────────┘       │
│         │                                                                 │
│         ▼                                                                 │
│  OUTPUT                                                                   │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ ✅ Rapport de consultation professionnel complet         │            │
│  │ ✅ Prescriptions médicamenteuses                          │            │
│  │ ✅ Ordonnances d'examens biologiques                      │            │
│  │ ✅ Prescriptions d'imagerie                               │            │
│  │ ✅ Plan de suivi                                          │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Endpoint API

### URL
```
POST /api/voice-dictation-workflow
```

### Méthode HTTP
`POST` avec `multipart/form-data`

### Paramètres d'entrée

#### Champs requis

1. **audioFile** (File)
   - Fichier audio de la dictée vocale
   - Formats supportés: MP3, WAV, M4A, FLAC, WebM
   - Taille maximale recommandée: 25 MB
   - Durée recommandée: 1-10 minutes

2. **doctorInfo** (JSON string)
   ```json
   {
     "fullName": "Dr. Jean Dupont",
     "qualifications": "MBBS, MD",
     "specialty": "General Medicine",
     "medicalCouncilNumber": "MCM12345"
   }
   ```

#### Champs optionnels

3. **patientId** (string)
   - Identifiant du patient (si disponible)

### Exemple d'appel avec curl

```bash
curl -X POST http://localhost:3000/api/voice-dictation-workflow \
  -F "audioFile=@dictee_medicale.mp3" \
  -F 'doctorInfo={"fullName":"Dr. Marie Martin","qualifications":"MBBS","specialty":"General Medicine","medicalCouncilNumber":"MCM67890"}' \
  -F "patientId=PATIENT123"
```

### Exemple d'appel avec JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('audioFile', audioFileBlob, 'dictation.mp3');
formData.append('doctorInfo', JSON.stringify({
  fullName: 'Dr. Jean Dupont',
  qualifications: 'MBBS, MD',
  specialty: 'General Medicine',
  medicalCouncilNumber: 'MCM12345'
}));
formData.append('patientId', 'PATIENT123');

const response = await fetch('/api/voice-dictation-workflow', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

## Structure de la réponse

### Succès (200 OK)

```json
{
  "success": true,
  "workflow": {
    "step1_transcription": {
      "text": "Transcription complète de la dictée...",
      "duration": "45s",
      "language": "fr"
    },
    "step2_extraction": {
      "patientInfo": {
        "age": 52,
        "sex": "M",
        "weight": 78,
        "allergies": ["Pénicilline"],
        "currentMedications": ["Amlodipine 5mg OD"],
        "medicalHistory": ["Hypertension"]
      },
      "clinicalData": {
        "chiefComplaint": "Douleurs thoraciques",
        "symptoms": ["douleurs thoraciques", "dyspnée"],
        "symptomDuration": "2 heures",
        "diseaseHistory": "Patient de 52 ans consulte pour...",
        "vitalSigns": {
          "bloodPressure": "150/95",
          "pulse": 88
        }
      }
    },
    "step3_diagnosis": {
      "primaryDiagnosis": "Syndrome coronarien aigu - Possible angine instable",
      "confidence": 85,
      "medications": 4,
      "investigations": 6
    },
    "step4_report": {
      "reportGenerated": true,
      "sections": [
        "chiefComplaint",
        "historyOfPresentIllness",
        "pastMedicalHistory",
        "physicalExamination",
        "diagnosticSynthesis",
        "diagnosticConclusion",
        "pregnancyConsiderations",
        "managementPlan",
        "followUpPlan",
        "conclusion"
      ],
      "prescriptionMedications": 4
    }
  },
  "finalReport": {
    "medicalReport": { /* Rapport complet */ },
    "prescriptions": {
      "medications": { /* Ordonnances médicaments */ },
      "laboratoryTests": { /* Ordonnances examens */ },
      "imagingStudies": { /* Ordonnances imagerie */ }
    },
    "invoice": { /* Facture */ }
  },
  "metadata": {
    "workflowType": "voice_dictation_to_consultation_report",
    "totalProcessingTime": "85000ms",
    "stepsCompleted": [
      "1. Audio transcription (Whisper)",
      "2. Clinical data extraction (GPT-4o)",
      "3. Medical diagnosis (openai-diagnosis API)",
      "4. Report generation (generate-consultation-report API)"
    ],
    "timestamp": "2025-12-30T14:30:00.000Z"
  }
}
```

### Erreur (400/500)

```json
{
  "success": false,
  "error": "Description de l'erreur",
  "errorDetails": "Stack trace (en développement)"
}
```

## Détails des étapes

### Étape 1: Transcription Whisper

**Modèle utilisé**: `whisper-1` (OpenAI)

**Configuration**:
- `language`: 'fr' (auto-détection français/anglais)
- `response_format`: 'verbose_json' (pour avoir durée et métadonnées)
- `temperature`: 0.2 (transcription précise)

**Durée estimée**: 5-15 secondes

**Output**:
```json
{
  "text": "Patient masculin de 45 ans se présentant pour...",
  "duration": 45.3,
  "language": "fr"
}
```

### Étape 2: Extraction des données cliniques

**Modèle utilisé**: `gpt-4o` (OpenAI)

**Prompt système**: Extraction structurée intelligente avec prompt médical spécialisé

**Configuration**:
- `temperature`: 0.1 (extraction précise)
- `max_tokens`: 3000
- `response_format`: json_object

**Durée estimée**: 10-20 secondes

**Capacités d'extraction**:
- ✅ Informations démographiques (âge, sexe, poids, taille)
- ✅ Allergies et contre-indications
- ✅ Médicaments actuels avec dosages
- ✅ Antécédents médicaux
- ✅ Motif de consultation
- ✅ Symptômes (liste complète)
- ✅ Durée des symptômes
- ✅ Histoire de la maladie (narrative cohérente)
- ✅ Signes vitaux (TA, pouls, température, FR, SpO2)
- ✅ Examen clinique (si dicté)
- ✅ Impressions diagnostiques (si mentionnées)

### Étape 3: Préparation pour diagnostic

**Transformation de format**:

```javascript
// Format extrait → Format openai-diagnosis
{
  patientData: {
    age, sex, weight, height,
    medicalHistory: [],
    currentMedications: [],
    allergies: []
  },
  clinicalData: {
    chiefComplaint: "",
    symptoms: [],
    symptomDuration: "",
    diseaseHistory: "",
    vitalSigns: {}
  },
  aiQuestions: []
}
```

**Durée estimée**: < 1 seconde

### Étape 4: Appel API openai-diagnosis

**Endpoint interne**: `POST /api/openai-diagnosis`

**Fonctionnalités**:
- ✅ Analyse diagnostique encyclopédique (GPT-4o)
- ✅ Raisonnement clinique détaillé
- ✅ Physiopathologie expliquée
- ✅ Diagnostics différentiels avec probabilités
- ✅ Plan thérapeutique complet
- ✅ Prescriptions avec DCI précis
- ✅ Posologie UK format (OD/BD/TDS/QDS)
- ✅ Investigations biologiques + imagerie
- ✅ Validation sécurité médicale
- ✅ Interactions médicamenteuses
- ✅ Contre-indications vérifiées

**Durée estimée**: 20-40 secondes

### Étape 5: Génération du rapport

**Endpoint interne**: `POST /api/generate-consultation-report`

**Fonctionnalités**:
- ✅ Rapport professionnel narratif
- ✅ Traduction pragmatique français → anglais
- ✅ Sections médicales complètes (150-200 mots minimum)
- ✅ Ordonnances médicaments formatées
- ✅ Ordonnances examens biologiques
- ✅ Prescriptions imagerie
- ✅ Plan de suivi détaillé
- ✅ Éducation patient
- ✅ Signes d'alarme
- ✅ Facture générée

**Durée estimée**: 15-30 secondes

## Temps de traitement total

**Estimation globale**: 60-120 secondes

**Décomposition**:
- Transcription Whisper: 10-15s
- Extraction clinique: 15-25s
- Diagnostic médical: 25-40s
- Génération rapport: 20-35s
- Overhead réseau: 5-10s

**Maximum autorisé**: 180 secondes (3 minutes)

## Cas d'usage

### 1. Consultation d'urgence

**Exemple de dictée**:
```
"Patient masculin de 62 ans admis pour douleurs thoraciques constrictives 
depuis 30 minutes. Tension 165/100, pouls 95 irrégulier, SpO2 93%. 
Antécédent d'infarctus il y a 5 ans, sous Aspirin 100mg et Atorvastatin 40mg. 
Auscultation: souffle systolique. ECG montre sus-décalage de ST en V2-V4. 
Je suspecte STEMI antérieur. Urgence cardiologique."
```

**Output**: Rapport complet avec diagnostic "STEMI antérieur", recommandation transfert en cardiologie interventionnelle immédiate, prescriptions anticoagulation, etc.

### 2. Consultation de médecine générale

**Exemple de dictée**:
```
"Femme de 35 ans consulte pour toux productive avec expectorations verdâtres 
depuis 5 jours, fièvre à 38.2°C, dyspnée à l'effort. Pas d'allergie connue. 
Auscultation pulmonaire: râles crépitants base gauche. SpO2 96%. 
Diagnostic probable: pneumonie lobe inférieur gauche. 
Prescrire Amoxicilline-acide clavulanique 1g deux fois par jour 7 jours, 
Paracétamol 1g si fièvre. Faire NFS, CRP, radio thorax. Revoir dans 3 jours."
```

**Output**: Rapport complet avec diagnostic "Pneumonie communautaire lobe inférieur gauche", prescriptions antibiotiques, ordonnances examens (NFS, CRP, radio thorax), plan de suivi.

### 3. Renouvellement d'ordonnance avec ajustement

**Exemple de dictée**:
```
"Monsieur 58 ans, diabétique type 2 sous Metformine 1g deux fois par jour. 
HbA1c dernière à 8.2%, pas d'objectif atteint. Tension 145/90 malgré Ramipril 5mg. 
Patient adhérent au traitement. Augmenter Metformine à 1g matin et 1.5g soir. 
Ajouter Dapagliflozine 10mg le matin. Augmenter Ramipril à 10mg. 
Contrôle HbA1c et créatinine dans 3 mois."
```

**Output**: Rapport complet avec ajustements posologiques, nouvelles prescriptions, ordonnances examens biologiques (HbA1c, créatinine, etc.), plan de suivi à 3 mois.

## Sécurité et validation

### Validation médicale automatique

1. **Vérification des allergies**
   - Cross-checking médicaments vs allergies
   - Alerte si pénicilline prescrite alors allergie pénicilline

2. **Interactions médicamenteuses**
   - Vérification automatique entre médicaments actuels et nouveaux
   - Base de données interactions majeures

3. **Posologie**
   - Validation des doses selon âge, poids, fonction rénale
   - Format standardisé UK (OD/BD/TDS/QDS)

4. **Contre-indications**
   - Vérification contre-indications absolues
   - Signalement conditions particulières (grossesse, allaitement, insuffisance organique)

5. **Nomenclature médicale**
   - DCI précis pour chaque médicament
   - Nomenclature UK/Mauritius pour examens
   - ICD-10 pour diagnostics

## Limitations et considérations

### Limitations actuelles

1. **Qualité audio**
   - La transcription dépend de la qualité audio
   - Bruit de fond peut affecter la précision

2. **Langue**
   - Optimisé pour français et anglais
   - Meilleure performance en français médical

3. **Terminologie médicale**
   - Acronymes peuvent nécessiter clarification
   - Noms de médicaments doivent être prononcés clairement

4. **Examen physique**
   - Système ne peut pas effectuer d'examen physique réel
   - Se base uniquement sur ce qui est dicté

### Recommandations d'utilisation

1. **Qualité de la dictée**
   - ✅ Environnement calme
   - ✅ Microphone de bonne qualité
   - ✅ Élocution claire
   - ✅ Vitesse modérée

2. **Structure de la dictée**
   - ✅ Commencer par informations patient (âge, sexe)
   - ✅ Mentionner allergies et médicaments actuels
   - ✅ Décrire symptômes et signes vitaux
   - ✅ Énoncer diagnostic et plan thérapeutique
   - ✅ Préciser prescriptions avec dosages exacts

3. **Sécurité médicale**
   - ⚠️ Toujours vérifier le rapport généré
   - ⚠️ Valider prescriptions et posologies
   - ⚠️ Confirmer interactions et contre-indications
   - ⚠️ Système est une aide, pas un remplacement du jugement clinique

## Intégration dans l'application

### Frontend - Composant React

```tsx
// Example usage in Next.js/React
import { useState } from 'react';

function VoiceDictationComponent() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleDictation = async (audioBlob: Blob) => {
    setProcessing(true);
    
    const formData = new FormData();
    formData.append('audioFile', audioBlob, 'dictation.mp3');
    formData.append('doctorInfo', JSON.stringify({
      fullName: 'Dr. Jean Dupont',
      qualifications: 'MBBS, MD',
      specialty: 'General Medicine',
      medicalCouncilNumber: 'MCM12345'
    }));
    
    try {
      const response = await fetch('/api/voice-dictation-workflow', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        console.log('Workflow completed:', data);
        // Display final report, prescriptions, etc.
      } else {
        console.error('Workflow failed:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div>
      <button 
        onClick={() => setRecording(!recording)}
        disabled={processing}
      >
        {recording ? '⏹ Stop Recording' : '🎤 Start Dictation'}
      </button>
      
      {processing && (
        <div>Processing voice dictation... (may take 1-2 minutes)</div>
      )}
      
      {result && (
        <div>
          <h3>Consultation Report Generated</h3>
          {/* Display report sections, prescriptions, etc. */}
        </div>
      )}
    </div>
  );
}
```

## Monitoring et logs

Le workflow génère des logs détaillés à chaque étape :

```
🎤 ======================================== 
   VOICE DICTATION WORKFLOW STARTED
========================================
📁 Audio file received: dictation.mp3 (2458923 bytes)
👨‍⚕️ Doctor: Dr. Jean Dupont
🌐 Base URL: http://localhost:3000

🎤 Step 1: Transcribing audio with Whisper...
✅ Transcription completed
   Duration: 45s
   Language: fr
   Text length: 523 chars

🧠 Step 2: Extracting clinical data with GPT-4o...
✅ Clinical data extracted
   Patient age: 52
   Chief complaint: Douleurs thoraciques
   Symptoms: 3

📋 Step 3: Preparing data for openai-diagnosis API...

🔬 Step 4: Calling openai-diagnosis API...
✅ Diagnosis API completed
   Primary diagnosis: Syndrome coronarien aigu
   Medications: 4

📄 Step 5: Calling generate-consultation-report API...
✅ Report generation completed
   Report sections: 10
   Medications in prescription: 4

✅ ========================================
   WORKFLOW COMPLETED SUCCESSFULLY
   Total processing time: 87543ms
========================================
```

## Troubleshooting

### Erreur: "Audio file is required"
**Solution**: Vérifier que le fichier audio est bien envoyé dans le champ `audioFile` du FormData.

### Erreur: "Diagnosis API failed"
**Solution**: Vérifier que l'API `openai-diagnosis` est accessible et fonctionne. Tester l'endpoint séparément.

### Erreur: "Report generation API failed"
**Solution**: Vérifier que l'API `generate-consultation-report` est accessible et fonctionne.

### Transcription vide ou incomplète
**Solution**:
- Vérifier la qualité audio
- Augmenter le volume
- Réduire le bruit de fond
- Parler plus clairement

### Données cliniques mal extraites
**Solution**:
- Structurer la dictée de manière plus claire
- Mentionner explicitement les éléments importants
- Utiliser une terminologie médicale standard

## Tests

### Test manuel

```bash
# 1. Créer un fichier audio de test
# Enregistrer une dictée médicale simple

# 2. Tester l'endpoint
curl -X POST http://localhost:3000/api/voice-dictation-workflow \
  -F "audioFile=@test_dictation.mp3" \
  -F 'doctorInfo={"fullName":"Dr. Test","qualifications":"MBBS","specialty":"General Medicine","medicalCouncilNumber":"TEST123"}'

# 3. Vérifier la réponse JSON
```

### Health check

```bash
curl http://localhost:3000/api/voice-dictation-workflow
```

## Prochaines évolutions possibles

1. **Support multilingue étendu**
   - Langues additionnelles (créole mauricien, hindi, etc.)

2. **Amélioration de l'extraction**
   - Reconnaissance automatique de prescriptions complexes
   - Extraction de résultats d'examens précédents

3. **Intégration dossier patient**
   - Récupération automatique des antécédents
   - Mise à jour du dossier médical électronique

4. **Mode temps réel**
   - Transcription en streaming
   - Génération progressive du rapport

5. **Validation avancée**
   - Checks de cohérence clinique automatiques
   - Suggestions d'examens complémentaires

6. **Export formats additionnels**
   - PDF haute qualité
   - HL7 FHIR pour interopérabilité
   - Export vers systèmes EMR

---

**Version**: 1.0  
**Date**: 30 Décembre 2025  
**Auteur**: Système Tibok Medical AI  
**Contact**: support@tibok.mu
