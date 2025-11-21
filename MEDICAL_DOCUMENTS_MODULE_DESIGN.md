# Module d'Analyse de Documents Médicaux (Biologie/Radiologie)
## Document de Conception et Architecture

---

## 📋 Vue d'ensemble

Ce module permet l'analyse intelligente de documents d'examens de biologie et de radiologie dans le cadre du suivi patient. Il s'intègre de manière transparente avec les workflows existants (consultation normale, dermatologie, maladies chroniques).

---

## 🎯 Objectifs

1. **Analyser automatiquement** des documents d'examens médicaux (PDF, images, scans)
2. **Extraire les données structurées** (résultats de laboratoire, rapports radiologiques)
3. **Intégrer les résultats** dans le dossier patient existant
4. **S'adapter aux différents types de suivi** (normal, dermato, chronique)
5. **Générer des insights cliniques** basés sur l'analyse IA

---

## 🏗️ Architecture du Module

### Structure Inspirée du Module Dermatologie

```
app/
├── medical-documents/           # Page principale workflow nouveau document
│   └── page.tsx
├── api/
│   ├── medical-document-ocr/    # OCR + extraction des données
│   │   └── route.ts
│   ├── medical-document-analysis/ # Analyse IA du document
│   │   └── route.ts
│   └── medical-document-followup/ # Intégration follow-up
│       └── route.ts

components/
└── medical-documents/
    ├── document-upload.tsx           # Upload de documents
    ├── document-type-selector.tsx    # Sélection type (bio/radio)
    ├── document-preview.tsx          # Prévisualisation
    ├── extracted-data-review.tsx     # Révision des données extraites
    └── document-analysis-report.tsx  # Rapport d'analyse

lib/
└── follow-up/
    └── medical-documents/
        ├── components/
        │   ├── document-comparison.tsx    # Comparaison avec résultats précédents
        │   ├── document-clinical-form.tsx # Formulaire clinique contextuel
        │   └── document-report-display.tsx # Affichage rapport final
        └── types/
            └── document-types.ts          # Types TypeScript
```

---

## 🔄 Workflow Principal (Nouveau Document)

### Étape 1 : Upload & Classification
```tsx
<DocumentUpload>
  - Upload fichier (PDF/Image/Scan)
  - Détection automatique du type (biologie/radiologie)
  - Validation et prévisualisation
  - Options : notes cliniques additionnelles
</DocumentUpload>
```

### Étape 2 : OCR & Extraction
```tsx
<ExtractedDataReview>
  - OCR du document
  - Extraction structurée :
    * Biologie : nom test, valeur, unité, plage normale, statut
    * Radiologie : type examen, technique, observations, conclusion
  - Révision et correction manuelle si nécessaire
  - Validation des données extraites
</ExtractedDataReview>
```

### Étape 3 : Analyse IA
```tsx
<DocumentAnalysisReport>
  - Analyse intelligente par GPT-4
  - Identification des anomalies
  - Corrélation avec données patient
  - Recommandations cliniques
  - Urgence et alertes
</DocumentAnalysisReport>
```

### Étape 4 : Intégration Dossier
```tsx
<DocumentIntegration>
  - Ajout au dossier patient
  - Association au type de suivi
  - Timeline des résultats
  - Génération notification médecin
</DocumentIntegration>
```

---

## 🔗 Intégration Follow-Up

### Architecture Follow-Up (Similaire à Dermatology/Normal)

```
app/follow-up/
└── medical-documents/
    └── page.tsx  # Workflow follow-up avec documents
```

### Workflow Follow-Up avec Documents

#### Tab 1 : Recherche Patient
```tsx
<PatientSearch>
  - Recherche par nom/email/téléphone
  - Affichage historique consultations
  - Affichage historique documents médicaux
  - Filtrage par type de document
</PatientSearch>
```

#### Tab 2 : Comparaison Documents
```tsx
<DocumentComparison>
  - Sélection document précédent
  - Upload nouveau document
  - Analyse comparative automatique
  - Visualisation tendances (pour biologie)
  - Évolution radiologique (description textuelle)
</DocumentComparison>
```

#### Tab 3 : Données Cliniques
```tsx
<DocumentClinicalForm>
  - Examen clinique actuel
  - Symptômes depuis dernier document
  - Traitements en cours
  - Comparaison avec précédent
</DocumentClinicalForm>
```

#### Tab 4 : Rapport Follow-Up
```tsx
<DocumentReportDisplay>
  - Synthèse évolution
  - Analyse comparative
  - Recommandations ajustées
  - Plan de suivi
</DocumentReportDisplay>
```

#### Tab 5 : Documents Additionnels
```tsx
<FollowUpDocuments>
  - Prescriptions ajustées
  - Nouveaux examens à prescrire
  - Arrêt de travail si nécessaire
  - Courrier médecin traitant
</FollowUpDocuments>
```

---

## 📊 Types de Documents Supportés

### 1. Examens de Biologie

**Extraction de données :**
- Nom du test/analyse
- Valeur mesurée
- Unité de mesure
- Plage de référence (normale)
- Statut : Normal / Bas / Élevé / Critique
- Date du prélèvement
- Laboratoire

**Exemples :**
- Numération Formule Sanguine (NFS)
- Bilan lipidique
- Bilan rénal/hépatique
- Glycémie, HbA1c
- TSH, hormones
- Marqueurs tumoraux
- Tests infectieux

**Analyse IA :**
```typescript
{
  type: "biology",
  testName: "Bilan Lipidique",
  date: "2024-11-18",
  results: [
    {
      parameter: "Cholestérol Total",
      value: 2.45,
      unit: "g/L",
      normalRange: "1.50-2.00",
      status: "elevated",
      interpretation: "Hypercholestérolémie modérée"
    },
    // ...
  ],
  clinicalSignificance: "...",
  recommendations: ["..."],
  urgency: "routine" | "priority" | "urgent"
}
```

### 2. Examens de Radiologie

**Extraction de données :**
- Type d'examen (Radio, Scanner, IRM, Échographie)
- Région anatomique
- Technique utilisée
- Observations descriptives
- Conclusion radiologique
- Comparaison si examen antérieur
- Date de l'examen
- Radiologue

**Exemples :**
- Radiographie thorax/os
- Scanner (toutes régions)
- IRM cérébrale/rachidienne
- Échographie abdominale/cardiaque
- Mammographie
- Doppler vasculaire

**Analyse IA :**
```typescript
{
  type: "radiology",
  examType: "Scanner Thoracique",
  date: "2024-11-18",
  technique: "Scanner multi-barrettes sans injection",
  region: "Thorax",
  findings: [
    {
      location: "Lobe inférieur droit",
      description: "Opacité nodulaire de 8mm",
      significance: "À surveiller - contrôle recommandé"
    },
    // ...
  ],
  conclusion: "...",
  comparison: "Par rapport au scanner du 2024-06-15...",
  recommendations: ["..."],
  urgency: "routine" | "priority" | "urgent"
}
```

---

## 🤖 API d'Analyse Intelligente

### 1. API OCR Document Médical

**Endpoint:** `/api/medical-document-ocr`

```typescript
POST /api/medical-document-ocr
{
  document: {
    name: string,
    type: "pdf" | "image",
    dataUrl: string  // base64
  },
  documentType: "biology" | "radiology" | "auto",
  patientData: {
    firstName: string,
    lastName: string,
    age: number,
    gender: string
  }
}

Response:
{
  success: boolean,
  documentId: string,
  extractedText: string,
  detectedType: "biology" | "radiology",
  structuredData: BiologyData | RadiologyData,
  confidence: number,
  needsReview: boolean
}
```

**Logique :**
1. OCR avec Vision AI (GPT-4 Vision ou Gemini Vision)
2. Classification automatique du type de document
3. Extraction structurée selon le type
4. Validation des données extraites
5. Flag si révision manuelle nécessaire

### 2. API Analyse Document Médical

**Endpoint:** `/api/medical-document-analysis`

```typescript
POST /api/medical-document-analysis
{
  patientData: PatientData,
  documentData: StructuredData,
  documentType: "biology" | "radiology",
  clinicalContext?: string,
  previousDocuments?: Array<Document>  // pour comparaison
}

Response:
{
  success: boolean,
  analysisId: string,
  analysis: {
    summary: string,
    keyFindings: Array<Finding>,
    abnormalities: Array<Abnormality>,
    clinicalSignificance: string,
    recommendations: Array<string>,
    urgency: "routine" | "priority" | "urgent",
    comparison?: ComparisonAnalysis,
    actionItems: Array<Action>
  },
  generatedAt: string
}
```

**Prompt GPT-4 pour Biologie :**
```
Vous êtes un biologiste médical expert. Analysez ces résultats de laboratoire :

PATIENT: {patientData}
RÉSULTATS: {structuredBiologyData}
CONTEXTE CLINIQUE: {clinicalContext}
RÉSULTATS PRÉCÉDENTS: {previousResults}

Fournissez :
1. Résumé global
2. Valeurs anormales et signification clinique
3. Tendances évolutives (si historique)
4. Corrélations entre paramètres
5. Hypothèses diagnostiques
6. Examens complémentaires suggérés
7. Urgence de la prise en charge
8. Recommandations cliniques
```

**Prompt GPT-4 pour Radiologie :**
```
Vous êtes un radiologue expert. Analysez ce rapport radiologique :

PATIENT: {patientData}
EXAMEN: {radiologyData}
CONTEXTE CLINIQUE: {clinicalContext}
EXAMENS ANTÉRIEURS: {previousExams}

Fournissez :
1. Résumé des observations principales
2. Analyse de la signification clinique
3. Évolution par rapport aux examens précédents
4. Corrélation avec le contexte clinique
5. Diagnostic différentiel radiologique
6. Examens complémentaires suggérés
7. Urgence et surveillance recommandée
8. Recommandations thérapeutiques
```

### 3. API Follow-Up avec Documents

**Endpoint:** `/api/medical-document-followup`

```typescript
POST /api/medical-document-followup
{
  patientDemographics: PatientDemographics,
  currentDocument: AnalyzedDocument,
  previousDocument?: AnalyzedDocument,
  clinicalData: ClinicalFormData,
  consultationHistory: Array<Consultation>,
  consultationType: "normal" | "dermatology" | "chronic"
}

Response:
{
  success: boolean,
  followUpReport: {
    summary: string,
    comparativeAnalysis: string,
    trends: Array<Trend>,
    recommendations: Array<string>,
    adjustedTreatment?: string,
    nextSteps: Array<string>,
    urgency: string
  },
  generatedAt: string
}
```

---

## 🎨 Composants UI Réutilisables

### 1. DocumentUpload Component

```tsx
interface DocumentUploadProps {
  patientData: PatientData
  onNext: (data: { document: File, documentType: string, notes: string }) => void
  onBack: () => void
}

// Features:
// - Drag & drop
// - PDF/Image support
// - Type auto-detection
// - Preview
// - Notes cliniques
```

### 2. ExtractedDataReview Component

```tsx
interface ExtractedDataReviewProps {
  documentData: ExtractedData
  documentType: "biology" | "radiology"
  onValidate: (validated: StructuredData) => void
  onBack: () => void
}

// Features:
// - Tableau éditable pour biologie
// - Texte éditable pour radiologie
// - Validation par champ
// - Correction assistée IA
// - Confidence indicators
```

### 3. DocumentComparison Component

```tsx
interface DocumentComparisonProps {
  patientDemographics: PatientDemographics
  previousDocument: AnalyzedDocument | null
  currentDocument: AnalyzedDocument
  onComplete: (comparison: ComparisonData) => void
}

// Features:
// - Side-by-side view
// - Trends visualization (biology)
// - Evolution narrative (radiology)
// - AI-generated comparison
// - Highlight changes
```

---

## 🔧 Réutilisation de l'Infrastructure Existante

### Composants Partagés à Réutiliser

```typescript
// De lib/follow-up/shared
import {
  PatientSearch,           // Recherche patient
  HistoryList,             // Liste historique
  ComparisonCard,          // Carte de comparaison
  ConsultationDetailModal, // Modal détails
  FollowUpDocuments,       // Documents additionnels
  usePatientHistory        // Hook historique patient
} from '@/lib/follow-up/shared'
```

### APIs Existantes à Utiliser

```typescript
// Patient history
POST /api/patient-history
// Existing patient search functionality

// Follow-up documents
POST /api/generate-follow-up-documents
// Prescriptions, lab orders, sick leave

// Consultation complete
POST /api/consultation-complete
// Final consultation save
```

---

## 📱 Interface Utilisateur

### Page Principale : Medical Documents Upload

```tsx
// app/medical-documents/page.tsx

export default function MedicalDocumentsWorkflow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [documentData, setDocumentData] = useState<any>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)

  const steps = [
    {
      icon: Upload,
      title: "Upload Document",
      description: "Upload biology or radiology document"
    },
    {
      icon: FileSearch,
      title: "Extract & Review",
      description: "AI extraction and manual review"
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Intelligent clinical analysis"
    },
    {
      icon: FileSignature,
      title: "Integration",
      description: "Add to patient record"
    }
  ]

  // Similar structure to dermatology workflow
  // ...
}
```

### Page Follow-Up : Medical Documents

```tsx
// app/follow-up/medical-documents/page.tsx

export default function MedicalDocumentsFollowUpPage() {
  const {
    history,
    mostRecent,
    patientDemographics,
    loading,
    error,
    searchPatient
  } = usePatientHistory()

  const [activeTab, setActiveTab] = useState<TabType>('search')
  
  // 5 tabs workflow like dermatology follow-up
  // 1. Search
  // 2. Compare Documents
  // 3. Clinical Data
  // 4. Generate Report
  // 5. Additional Documents
  
  // ...
}
```

---

## 🗄️ Structure de Données

### Type Definitions

```typescript
// lib/follow-up/medical-documents/types/document-types.ts

export type DocumentType = 'biology' | 'radiology'

export interface BiologyResult {
  parameter: string
  value: number | string
  unit: string
  normalRange: string
  status: 'normal' | 'low' | 'high' | 'critical'
  interpretation?: string
}

export interface BiologyDocument {
  type: 'biology'
  testName: string
  laboratory: string
  date: string
  results: BiologyResult[]
}

export interface RadiologyFinding {
  location: string
  description: string
  significance: string
}

export interface RadiologyDocument {
  type: 'radiology'
  examType: string
  technique: string
  region: string
  date: string
  findings: RadiologyFinding[]
  conclusion: string
  radiologist?: string
}

export interface AnalyzedDocument {
  id: string
  patientId: string
  documentType: DocumentType
  uploadDate: string
  originalDocument: {
    name: string
    dataUrl: string
  }
  extractedData: BiologyDocument | RadiologyDocument
  analysis: {
    summary: string
    keyFindings: Array<any>
    abnormalities: Array<any>
    recommendations: string[]
    urgency: 'routine' | 'priority' | 'urgent'
  }
  associatedConsultation?: string
}

export interface DocumentComparisonData {
  previousDocument: AnalyzedDocument
  currentDocument: AnalyzedDocument
  comparison: {
    summary: string
    trends?: Array<Trend>  // For biology
    evolution?: string      // For radiology
    clinicalSignificance: string
    recommendations: string[]
  }
}
```

---

## 🚀 Plan de Mise en Œuvre

### Phase 1 : Structure de Base
- [ ] Créer structure de dossiers
- [ ] Définir types TypeScript
- [ ] Créer composants UI de base
- [ ] Implémenter workflow upload simple

### Phase 2 : OCR & Extraction
- [ ] API OCR document médical
- [ ] Extraction structurée biologie
- [ ] Extraction structurée radiologie
- [ ] Interface de révision données

### Phase 3 : Analyse IA
- [ ] API analyse documents
- [ ] Prompts GPT-4 biologie
- [ ] Prompts GPT-4 radiologie
- [ ] Génération recommandations

### Phase 4 : Intégration Follow-Up
- [ ] Page follow-up documents
- [ ] Comparaison documents
- [ ] Workflow complet 5 tabs
- [ ] Réutilisation composants shared

### Phase 5 : Intégration Multi-Workflow
- [ ] Intégration consultation normale
- [ ] Intégration dermatologie
- [ ] Intégration maladies chroniques
- [ ] Tests end-to-end

---

## 🎯 Points d'Intégration avec Workflows Existants

### 1. Consultation Normale
```tsx
// Bouton dans normal consultation workflow
<Button onClick={() => handleAddMedicalDocument()}>
  <FileText className="mr-2" />
  Add Lab Results / Radiology Report
</Button>

// Opens modal or redirects to document upload
// Document is associated with current consultation
```

### 2. Consultation Dermatologie
```tsx
// Dans le rapport final dermatologie
<Section title="Additional Medical Documents">
  <DocumentsList documents={attachedDocuments} />
  <Button onClick={() => handleAddDocument()}>
    Add Biology/Radiology Report
  </Button>
</Section>
```

### 3. Maladies Chroniques
```tsx
// Tab additionnel dans chronic follow-up
<TabsTrigger value="documents">
  <FileText className="h-4 w-4" />
  Medical Documents
</TabsTrigger>

<TabsContent value="documents">
  <MedicalDocumentsSection
    patientId={patientId}
    diseaseType={diseaseType}
  />
</TabsContent>
```

---

## 🔐 Sécurité & Conformité

### Protection des Données
- Chiffrement des documents uploadés
- Stockage sécurisé base64/blob
- Pas de stockage permanent sur serveur
- Nettoyage automatique après traitement

### Validation Médicale
- Avertissement : analyse IA = aide à la décision
- Toujours nécessite validation médecin
- Traçabilité des modifications
- Logs d'audit

### RGPD
- Consentement patient pour analyse IA
- Droit à l'effacement
- Portabilité des données
- Transparence du traitement

---

## 📊 Métriques de Succès

- Taux de précision extraction OCR > 95%
- Temps de traitement document < 30 secondes
- Satisfaction utilisateur > 4/5
- Réduction temps saisie manuelle > 70%
- Taux d'adoption par médecins > 80%

---

## 📚 Ressources & Références

### Technologies
- **OpenAI GPT-4 Vision** : OCR et analyse
- **Next.js 14** : Framework React
- **TypeScript** : Type safety
- **Tailwind CSS** : Styling
- **Shadcn/ui** : Component library

### APIs Médicales Potentielles
- **LOINC** : Codes standardisés pour tests biologiques
- **SNOMED CT** : Terminologie clinique
- **ICD-10** : Codes diagnostics

---

## ✅ Checklist de Développement

### Étapes Immédiates
1. ✅ Analyser architecture existante (FAIT)
2. ✅ Créer document de conception (CE DOCUMENT)
3. ⏳ Validation conception avec équipe
4. ⏳ Créer structure de dossiers
5. ⏳ Développer composants de base
6. ⏳ Implémenter API OCR
7. ⏳ Implémenter API analyse
8. ⏳ Tester workflow complet
9. ⏳ Intégrer avec workflows existants
10. ⏳ Tests utilisateurs

---

## 📝 Notes Importantes

### Réutilisation Maximum
Ce module **DOIT** réutiliser au maximum les composants et la logique existants :
- ✅ Structure de workflow en steps (comme dermato)
- ✅ Composants shared de follow-up
- ✅ Hook `usePatientHistory`
- ✅ APIs patient-history et generate-follow-up-documents
- ✅ Système de tabs pour follow-up
- ✅ Modal détails consultation

### Différences vs Dermatologie
- **Dermatologie** : Upload d'images de peau
- **Medical Documents** : Upload de documents PDF/scans
- **Dermatologie** : Analyse visuelle
- **Medical Documents** : Extraction de texte structuré
- **Dermatologie** : Comparaison d'images
- **Medical Documents** : Comparaison de valeurs/résultats

### Adaptabilité
Le module doit être **flexible** pour s'adapter à :
- Différents types de documents
- Différents formats (PDF, images, scans)
- Différentes langues (FR, EN)
- Différents laboratoires/formats de rapport

---

## 🎉 Conclusion

Ce module complète l'écosystème médical existant en ajoutant la capacité d'analyser et d'intégrer des documents d'examens médicaux. Il s'intègre parfaitement avec les workflows existants tout en maintenant la même qualité d'expérience utilisateur et d'analyse IA.

**Prochaines étapes :** Valider cette conception et commencer l'implémentation de la Phase 1.
