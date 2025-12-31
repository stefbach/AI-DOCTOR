# 📊 GUIDE COMPLET - Workflows et APIs

**Date:** 2025-12-31  
**Statut:** ✅ Documentation Complète  
**Repository:** https://github.com/stefbach/AI-DOCTOR

---

## 🎯 VUE D'ENSEMBLE

Le système AI-DOCTOR propose **4 workflows principaux** accessibles depuis le **Hub de Consultation** (`/consultation-hub`), chacun utilisant des APIs spécialisées pour générer des rapports médicaux complets.

---

## 🏥 WORKFLOWS ET LEURS PAGES FRONTEND

### 1. 📋 **Consultation Normale** ✅

**Route:** `/` (page d'accueil)  
**Fichier:** `app/page.tsx`  
**Accès:** Hub → "Consultation Normale" (bleu)

#### **Étapes (5)**

| Étape | Composant | Fichier | Description |
|-------|-----------|---------|-------------|
| **1** | PatientForm | `components/patient-form.tsx` | Données démographiques patient |
| **2** | ClinicalForm | `components/clinical-form.tsx` | Données cliniques (symptômes, antécédents) |
| **3** | QuestionsForm | `components/questions-form.tsx` | Questions d'anamnèse détaillées |
| **4** | **DiagnosisForm** | `components/diagnosis-form.tsx` | **Analyse diagnostique AI** |
| **5** | **ProfessionalReport** | `components/professional-report.tsx` | **Génération du rapport** |

#### **APIs Utilisées**

1. **`POST /api/openai-diagnosis`** (Étape 4)
   - **Composant:** `DiagnosisForm`
   - **Entrée:** patientData, clinicalData, aiQuestions
   - **Sortie:** Diagnostic principal, différentiels, médicaments, examens
   - **Modèle:** GPT-4 avec validation DCI
   - **Ligne:** `components/diagnosis-form.tsx:XXX`

2. **`POST /api/generate-consultation-report`** (Étape 5)
   - **Composant:** `ProfessionalReport`
   - **Entrée:** patientData, clinicalData, diagnosisData, doctorData
   - **Sortie:** Rapport médical complet formaté
   - **Format:** UK/Mauritius standard
   - **Ligne:** `components/professional-report.tsx:XXX`

#### **Flux de Données**

```
Hub → "Consultation Normale" → /
  ↓
PatientForm (step 1) → patientData
  ↓
ClinicalForm (step 2) → clinicalData
  ↓
QuestionsForm (step 3) → questionsData (aiQuestions)
  ↓
DiagnosisForm (step 4) → POST /api/openai-diagnosis → diagnosisData
  ↓
ProfessionalReport (step 5) → POST /api/generate-consultation-report → finalReport
  ↓
Affichage rapport complet
```

---

### 2. 💊 **Maladie Chronique** ✅

**Route:** `/chronic-disease`  
**Fichier:** `app/chronic-disease/page.tsx`  
**Accès:** Hub → "Maladie Chronique" (rouge)

#### **Étapes (4)**

| Étape | Composant | Description |
|-------|-----------|-------------|
| **1** | Chronic Patient Form | Données patient + maladies chroniques connues |
| **2** | Chronic Questions | Questions spécifiques aux maladies chroniques |
| **3** | Chronic Diagnosis | Analyse diagnostique pour suivi chronique |
| **4** | **Chronic Professional Report** | **Génération du rapport de suivi** |

#### **APIs Utilisées**

1. **`POST /api/generate-consultation-report`** (Étape 4)
   - **Composant:** `chronic-professional-report-v2.tsx`
   - **Spécificité:** Adapté pour les suivis de maladies chroniques
   - **Fichier:** `components/chronic-disease/chronic-professional-report-v2.tsx`

#### **Flux de Données**

```
Hub → "Maladie Chronique" → /chronic-disease
  ↓
Chronic patient data + known diseases
  ↓
Chronic-specific questions
  ↓
POST /api/generate-consultation-report (chronic mode) → finalReport
  ↓
Affichage rapport de suivi chronique
```

---

### 3. 🎤 **Dictée Vocale** ✅ (NOUVEAU)

**Route:** `/voice-dictation`  
**Fichier:** `app/voice-dictation/page.tsx`  
**Accès:** Hub → "Dictée Vocale" (violet, badge NOUVEAU)

#### **Étapes (6)**

| Étape | Description | Durée |
|-------|-------------|-------|
| **1** | Enregistrement Audio | 1-5 min |
| **2** | Transcription (Whisper) | 5-15s |
| **3** | Extraction GPT-4o | 3-8s |
| **4** | Préparation données | <1s |
| **5** | **Diagnostic (API)** | 20-40s |
| **6** | **Rapport (API)** | 15-30s |

#### **APIs Utilisées**

**API Principale:**

`POST /api/voice-dictation-workflow`
- **Fichier:** `app/api/voice-dictation-workflow/route.ts`
- **Entrée:** audioFile (WebM/MP4), doctorInfo, patientId
- **Sortie:** finalReport, consultationId

**APIs Appelées Internement (par le workflow):**

1. **Whisper (Transcription)**
   - OpenAI Whisper-1
   - FR/EN auto-detect

2. **GPT-4o (Extraction)**
   - Extraction données cliniques structurées

3. **`POST /api/openai-diagnosis` (Étape 5)**
   - Analyse diagnostique complète
   - **Ligne:** `app/api/voice-dictation-workflow/route.ts:654`

4. **`POST /api/generate-consultation-report` (Étape 6)**
   - Génération du rapport final
   - **Ligne:** `app/api/voice-dictation-workflow/route.ts:667`

5. **Supabase (Sauvegarde)**
   - Table: `consultation_records`
   - Retourne consultationId

#### **Flux de Données**

```
Hub → "Dictée Vocale" → /voice-dictation
  ↓
Enregistrement audio (MediaRecorder)
  ↓
POST /api/voice-dictation-workflow
  ├─ Step 1: Whisper transcription
  ├─ Step 2: GPT-4o extraction
  ├─ Step 3: Data preparation
  ├─ Step 4: POST /api/openai-diagnosis (internal) → diagnosisData
  ├─ Step 5: POST /api/generate-consultation-report (internal) → reportData
  └─ Step 6: Save to Supabase → consultationId
  ↓
Redirection → /view-report/[consultationId]
  ↓
Affichage rapport complet
```

---

### 4. 🩺 **Dermatologie**

**Route:** `/dermatology`  
**Fichier:** `app/dermatology/page.tsx`  
**Accès:** (Pas dans le hub principal - workflow spécialisé)

#### **Étapes (4)**

| Étape | Description |
|-------|-------------|
| **1** | Patient Information |
| **2** | Image Upload (photos dermatologiques) |
| **3** | AI Analysis Questions |
| **4** | Dermatology Diagnosis |

#### **APIs Utilisées**

- **Dermatology-specific API** (non documenté ici)
- Format différent des consultations standard

---

## 🔌 APIs BACKEND DÉTAILLÉES

### API 1: **Diagnosis AI**

**Endpoint:** `POST /api/openai-diagnosis`  
**Fichier:** `app/api/openai-diagnosis/route.ts`  
**Modèle:** GPT-4 avec validation DCI

#### **Entrée (Request Body)**

```typescript
{
  patientData: {
    age: number,
    gender: string,
    weight?: number,
    height?: number,
    allergies?: string[],
    currentMedications?: string[],
    medicalHistory?: string[]
  },
  clinicalData: {
    chiefComplaint: string,
    symptoms: string[],
    symptomDuration: string,
    vitalSigns?: {
      bloodPressure?: string,
      heartRate?: number,
      temperature?: number,
      respiratoryRate?: number,
      oxygenSaturation?: number
    },
    physicalExamination?: string
  },
  aiQuestions: {
    [key: string]: any
  }
}
```

#### **Sortie (Response)**

```typescript
{
  success: boolean,
  analysis: {
    clinical_analysis: {
      primary_diagnosis: {
        condition: string,
        icd10_code: string,
        confidence_level: "high" | "medium" | "low"
      },
      differential_diagnoses: [...]
    },
    treatment_plan: {
      medications: [
        {
          name: string,
          dci: string,
          dosage: string,
          frequency: string,
          duration: string
        }
      ]
    },
    investigation_strategy: {
      laboratory_tests: [...],
      imaging_studies: [...]
    }
  }
}
```

#### **Utilisé Par**

1. **DiagnosisForm** (`components/diagnosis-form.tsx`) - Consultation normale
2. **Voice Dictation Workflow** (étape 5) - Appel interne

---

### API 2: **Generate Consultation Report**

**Endpoint:** `POST /api/generate-consultation-report`  
**Fichier:** `app/api/generate-consultation-report/route.ts`  
**Format:** UK/Mauritius standard

#### **Entrée (Request Body)**

```typescript
{
  patientData: {
    // Données démographiques complètes
  },
  clinicalData: {
    // Données cliniques complètes
  },
  diagnosisData: {
    // Résultat de /api/openai-diagnosis
    analysis: {
      clinical_analysis: {...},
      treatment_plan: {...},
      investigation_strategy: {...}
    }
  },
  doctorData: {
    nom: string,
    qualifications: string,
    specialite: string,
    numeroEnregistrement: string,
    adresseCabinet?: string,
    signatureUrl?: string
  },
  includeFullPrescriptions?: boolean  // Pour dictée vocale
}
```

#### **Sortie (Response)**

```typescript
{
  success: boolean,
  report: {
    medicalReport: {
      report: {
        patientDemographics: {...},
        medicalHistory: {...},
        presentingComplaint: {...},
        physicalExamination: {...},
        clinicalAssessment: {
          primaryDiagnosis: string,
          differentialDiagnoses: [...]
        },
        investigationsOrdered: {
          laboratoryTests: [...],
          imagingStudies: [...]
        },
        treatmentPlan: {...},
        followUpPlan: {...}
      },
      narrative: string  // Texte complet du rapport
    },
    prescriptions: {
      medications: {
        prescription: {
          medications: [...]
        }
      }
    },
    labOrders: {...},
    imagingOrders: {...}
  }
}
```

#### **Utilisé Par**

1. **ProfessionalReport** (`components/professional-report.tsx`) - Consultation normale
2. **Chronic Professional Report** (`components/chronic-disease/chronic-professional-report-v2.tsx`) - Suivi chronique
3. **Voice Dictation Workflow** (étape 6) - Appel interne

---

### API 3: **Voice Dictation Workflow**

**Endpoint:** `POST /api/voice-dictation-workflow`  
**Fichier:** `app/api/voice-dictation-workflow/route.ts`  
**Max Duration:** 180 secondes (3 minutes)

#### **Entrée (FormData)**

```typescript
{
  audioFile: File,  // WebM, MP4, WAV, OGG, M4A
  doctorInfo: string (JSON),  // Optionnel
  patientId?: string  // Optionnel
}
```

#### **Sortie (Response)**

```typescript
{
  success: boolean,
  consultationId: string,  // Ex: "VOICE_1767162898601_q6axo"
  consultationType: "standard" | "specialist_referral",
  workflow: {
    step1_transcription: {
      text: string,
      duration: string,
      language: "fr" | "en"
    },
    step2_extraction: {
      patientInfo: {...},
      clinicalData: {...},
      aiQuestions: {...},
      referralInfo?: {...}
    },
    step3_diagnosis: {
      primaryDiagnosis: string,
      confidence: string,
      medications: number
    },
    step4_report: {
      reportGenerated: boolean,
      sections: string[],
      prescriptionMedications: number
    },
    step5_save: {
      saved: boolean,
      consultationId: string
    }
  },
  finalReport: {
    medicalReport: {...},
    prescriptions: {...},
    labOrders: {...},
    imagingOrders: {...},
    consultationId: string
  },
  metadata: {
    consultationId: string,
    workflowType: "voice_dictation_to_consultation_report",
    totalProcessingTime: string,
    stepsCompleted: string[],
    timestamp: string
  }
}
```

#### **Utilisé Par**

- **Voice Dictation Page** (`app/voice-dictation/page.tsx`)

---

## 🗄️ SUPABASE - PERSISTENCE

### Table: `consultation_records`

**Utilisée par:**
- Voice Dictation Workflow (sauvegarde des rapports)
- Patient History API (récupération des consultations)
- View Report Page (affichage des rapports)

**Colonnes Clés:**

```sql
consultation_id VARCHAR PRIMARY KEY  -- Ex: "VOICE_1767162898601_q6axo"
patient_id VARCHAR
patient_name VARCHAR
patient_email VARCHAR
patient_phone VARCHAR
consultation_type VARCHAR  -- "standard", "specialist_referral", "chronic", etc.
consultation_date TIMESTAMP
created_at TIMESTAMP
chief_complaint TEXT
diagnosis TEXT
medical_report JSONB  -- Rapport médical complet
prescriptions JSONB  -- Prescriptions détaillées
lab_orders JSONB  -- Ordonnances de laboratoire
imaging_orders JSONB  -- Ordonnances d'imagerie
transcription_text TEXT  -- Pour dictée vocale
workflow_metadata JSONB  -- Métadonnées du workflow
```

---

## 🔄 FLUX DE NAVIGATION

### Depuis le Hub de Consultation

```
/consultation-hub (Hub)
  │
  ├─► "Consultation Normale" (bleu)
  │     └─► / (page.tsx)
  │           ├─ Étape 1-3: Collecte données
  │           ├─ Étape 4: POST /api/openai-diagnosis
  │           └─ Étape 5: POST /api/generate-consultation-report
  │
  ├─► "Maladie Chronique" (rouge)
  │     └─► /chronic-disease
  │           ├─ Collecte données chroniques
  │           └─ POST /api/generate-consultation-report (chronic)
  │
  └─► "Dictée Vocale" (violet, NOUVEAU)
        └─► /voice-dictation
              ├─ Enregistrement audio
              ├─ POST /api/voice-dictation-workflow
              │   ├─ Whisper transcription
              │   ├─ GPT-4o extraction
              │   ├─ POST /api/openai-diagnosis (internal)
              │   ├─ POST /api/generate-consultation-report (internal)
              │   └─ Save to Supabase
              └─ Redirect → /view-report/[consultationId]
```

---

## 📊 RÉSUMÉ DES UTILISATIONS DES APIs

### `/api/openai-diagnosis` (Diagnosis AI)

| Utilisateur | Type | Appel |
|-------------|------|-------|
| DiagnosisForm | Direct | Étape 4 de consultation normale |
| Voice Dictation | Interne | Étape 5 du workflow |

### `/api/generate-consultation-report` (Generate Report)

| Utilisateur | Type | Appel |
|-------------|------|-------|
| ProfessionalReport | Direct | Étape 5 de consultation normale |
| Chronic Professional Report | Direct | Étape 4 de consultation chronique |
| Voice Dictation | Interne | Étape 6 du workflow |

---

## ✅ STATUT ACTUEL

| Workflow | Route | Status | APIs | Sauvegarde DB |
|----------|-------|--------|------|---------------|
| Consultation Normale | `/` | ✅ Opérationnel | diagnosis + report | ✅ Via workflow normal |
| Maladie Chronique | `/chronic-disease` | ✅ Opérationnel | report (chronic) | ✅ Via workflow chronic |
| Dictée Vocale | `/voice-dictation` | ✅ **NOUVEAU** | diagnosis + report (internal) | ✅ Supabase direct |
| Dermatologie | `/dermatology` | ✅ Opérationnel | dermatology | ✅ Via workflow dermato |

---

## 🎯 POINTS CLÉS

### ✅ **OUI, LES PAGES FRONTEND EXISTENT !**

- **DiagnosisForm** = Page frontend pour `/api/openai-diagnosis`
- **ProfessionalReport** = Page frontend pour `/api/generate-consultation-report`

### ✅ **Réutilisation dans Voice Dictation**

Le workflow de dictée vocale **réutilise** les mêmes APIs backend que la consultation normale, mais les appelle **de manière interne** (serveur-à-serveur) au lieu de passer par le frontend.

### ✅ **Architecture Cohérente**

```
Frontend (UI) ──► APIs Backend ──► GPT-4 / Whisper
                                  │
                                  └──► Supabase
```

---

## 📝 FICHIERS IMPORTANTS

### Pages Frontend

- `app/page.tsx` - Consultation normale (5 étapes)
- `app/chronic-disease/page.tsx` - Maladie chronique
- `app/voice-dictation/page.tsx` - Dictée vocale
- `app/dermatology/page.tsx` - Dermatologie
- `app/consultation-hub/page.tsx` - Hub principal

### Composants

- `components/diagnosis-form.tsx` - Appelle `/api/openai-diagnosis`
- `components/professional-report.tsx` - Appelle `/api/generate-consultation-report`
- `components/chronic-disease/chronic-professional-report-v2.tsx` - Appelle `/api/generate-consultation-report`
- `components/consultation-hub/hub-workflow-selector.tsx` - Sélection du workflow

### APIs Backend

- `app/api/openai-diagnosis/route.ts` - Diagnosis AI
- `app/api/generate-consultation-report/route.ts` - Generate Report
- `app/api/voice-dictation-workflow/route.ts` - Voice Dictation (appelle les 2 APIs)
- `app/api/patient-history/route.ts` - Récupération consultations
- `app/api/consultation-detail/route.ts` - Détails consultation

---

## 🚀 PRÊT POUR LA PRODUCTION

**Date:** 2025-12-31  
**Status:** ✅ **COMPLET ET OPÉRATIONNEL**

Tous les workflows utilisent les APIs appropriées et génèrent des rapports médicaux complets avec validation DCI, format UK/Mauritius, et sauvegarde dans Supabase.

---

**Repository:** https://github.com/stefbach/AI-DOCTOR  
**Branch:** main  
**Documentation:** WORKFLOWS_AND_APIS_COMPLETE.md
