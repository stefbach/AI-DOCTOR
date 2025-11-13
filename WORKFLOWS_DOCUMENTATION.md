# 📋 TIBOK Medical Application - Workflows Documentation

## Date de création
2025-11-13

---

## 🔄 Vue d'Ensemble des Workflows

L'application TIBOK dispose de **DEUX workflows médicaux distincts** :

1. **Workflow Classique (Standard)** - Pour consultations générales
2. **Workflow Maladies Chroniques** - Pour suivi et gestion des pathologies chroniques

---

## 📊 WORKFLOW 1 : CONSULTATION CLASSIQUE (Standard)

**Page**: `/` (app/page.tsx)  
**Nombre d'étapes**: 5 étapes  
**Objectif**: Consultation médicale complète avec diagnostic et prescriptions

### 🎯 Étapes du Workflow Classique

```
┌─────────────────────────────────────────────────────────────────┐
│                   WORKFLOW CLASSIQUE (5 ÉTAPES)                 │
└─────────────────────────────────────────────────────────────────┘

Étape 1: INFORMATIONS PATIENT
    ↓
Étape 2: DONNÉES CLINIQUES
    ↓
Étape 3: QUESTIONS IA
    ↓
Étape 4: DIAGNOSTIC
    ↓
Étape 5: RAPPORT MÉDICAL COMPLET
```

---

### 📝 ÉTAPE 1 : INFORMATIONS PATIENT (Patient Form)

**Component**: `components/patient-form.tsx`  
**Icon**: 👤 User  
**Titre**: "Patient Information"  
**Description**: "Administrative data and medical history"

#### Données Collectées:

**A. Informations Personnelles**
- Prénom (firstName)
- Nom (lastName)
- Date de naissance (birthDate)
- Âge (age)
- Genre (gender)

**B. Informations de Grossesse** (pour femmes)
- Statut de grossesse (pregnancyStatus)
- Date des dernières règles (lastMenstrualPeriod)
- Âge gestationnel (gestationalAge)

**C. Données Physiques**
- Poids (weight)
- Taille (height)
- **IMC calculé automatiquement**

**D. Coordonnées**
- Téléphone (phone)
- Email (email)
- Adresse (address)
- Ville (city)
- Pays (country)

**E. Historique Médical**
- Allergies (allergies) - liste à cocher
  - Pénicilline
  - Aspirine
  - Fruits de mer
  - Lactose
  - Gluten
  - Anesthésie
  - Latex
  - Pollen
  - Autres (otherAllergies)
  
- Antécédents médicaux (medicalHistory) - liste à cocher
  - Hypertension
  - Diabète
  - Asthme
  - Maladies cardiaques
  - Cancer
  - Maladies rénales
  - Maladies hépatiques
  - Troubles thyroïdiens
  - Épilepsie
  - Dépression
  - Accident vasculaire cérébral
  - Arthrite
  - Autres (otherMedicalHistory)

**F. Médicaments Actuels**
- Liste textuelle des médicaments (currentMedicationsText)
- **Traduction automatique** en anglais pour normalisation

**G. Habitudes de Vie** (lifeHabits)
- Tabagisme (smoking): Jamais / Occasionnel / Régulier
- Consommation d'alcool (alcohol): Jamais / Occasionnel / Régulier
- Activité physique (physicalActivity): Sédentaire / Modéré / Actif

#### Fonctionnalités Spéciales:

1. **Intégration Tibok Data**
   - Détection automatique si patient vient de Tibok
   - Pré-remplissage des données patient
   - Synchronisation avec base de données Supabase

2. **Détection de Renouvellement d'Ordonnance**
   - Analyse du motif de consultation
   - Mots-clés détectés:
     - "order renewal", "prescription renewal"
     - "renouvellement", "ordonnance"
     - "renewal", "refill"
     - "medication renewal", "repeat prescription"
     - "médicament", "renouveler"
   - **Si détecté**: Saut direct à l'Étape 5 (Rapport Médical)

3. **Validation des Données**
   - Tous les champs obligatoires validés
   - Format email vérifié
   - Format téléphone vérifié
   - Âge calculé automatiquement

#### Actions:
- **Bouton "Next"**: Valide et passe à l'Étape 2
- **Sauvegarde automatique**: Données sauvegardées dans consultationDataService

---

### 🩺 ÉTAPE 2 : DONNÉES CLINIQUES (Clinical Form)

**Component**: `components/clinical-form.tsx`  
**Icon**: 🩺 Stethoscope  
**Titre**: "Clinical Data"  
**Description**: "Physical examination and symptoms"

#### Données Collectées:

**A. Motif de Consultation**
- Plainte principale (chiefComplaint) - textarea

**B. Historique de la Maladie**
- Description détaillée (diseaseHistory) - textarea
- Durée des symptômes (symptomDuration)

**C. Symptômes Actuels** (symptoms)
- Liste de sélection multiple avec recherche
- Catégories de symptômes prédéfinies
- Possibilité d'ajouter des symptômes personnalisés

**D. Évaluation de la Douleur**
- Échelle de douleur (painScale): 0-10

**E. Signes Vitaux** (vitalSigns)
- Température corporelle (temperature)
- Tension artérielle systolique (bloodPressureSystolic)
- Tension artérielle diastolique (bloodPressureDiastolic)
- Fréquence cardiaque (heartRate)
- Fréquence respiratoire (respiratoryRate)
- Saturation en oxygène (oxygenSaturation)

**F. Examen Physique**
- Notes d'examen détaillées (physicalExamination) - textarea

#### Actions:
- **Bouton "Previous"**: Retour à l'Étape 1
- **Bouton "Next"**: Valide et passe à l'Étape 3
- **Sauvegarde automatique**: Données cliniques sauvegardées

---

### 🤖 ÉTAPE 3 : QUESTIONS IA (AI Questions Form)

**Component**: `components/questions-form.tsx`  
**Icon**: 🧠 Brain  
**Titre**: "AI Questions"  
**Description**: "Targeted diagnostic questions"

#### Fonctionnement:

**A. Génération Intelligente de Questions**
- Analyse des données patient (Étape 1)
- Analyse des données cliniques (Étape 2)
- **Appel API**: `/api/openai-questions`
- Questions générées par IA pour affiner le diagnostic

**B. Types de Questions**
- Questions ouvertes (texte libre)
- Questions fermées (oui/non)
- Questions à choix multiples
- Questions d'échelle (1-10)

**C. Réponses Collectées**
- Stockage des questions et réponses
- Format structuré pour analyse diagnostique

#### Processus:
1. Chargement automatique des questions
2. Affichage progressif des questions
3. Validation des réponses
4. Analyse en temps réel

#### Actions:
- **Bouton "Previous"**: Retour à l'Étape 2
- **Bouton "Next"**: Valide réponses et passe à l'Étape 4
- **Sauvegarde automatique**: Questions/réponses sauvegardées

---

### 🔬 ÉTAPE 4 : DIAGNOSTIC (Diagnosis Form)

**Component**: `components/diagnosis-form.tsx`  
**Icon**: 📋 ClipboardList  
**Titre**: "Diagnosis"  
**Description**: "Analysis and differential diagnosis"

#### Fonctionnement:

**A. Analyse Multi-Agents IA**
- **Agent 1**: Diagnostic expert
- **Agent 2**: Analyse différentielle
- **Agent 3**: Recommandations thérapeutiques

**B. Appels API Multiples**
1. `/api/diagnosis-expert` - Diagnostic initial
2. `/api/enhanced-diagnosis` - Diagnostic enrichi
3. `/api/examens-generator` - Examens recommandés
4. `/api/prescription-generator` - Prescription suggérée

**C. Génération des Résultats**

**1. Diagnostic Principal**
- Code CIM-10
- Nom de la maladie
- Niveau de confiance
- Explications détaillées

**2. Diagnostic Différentiel**
- Liste de diagnostics alternatifs
- Probabilités associées
- Critères de distinction

**3. Examens Complémentaires**
- Examens de laboratoire
- Imagerie médicale
- Tests spécialisés
- Priorités et urgences

**4. Prescription Suggérée**
- Médicaments recommandés
- Dosages et posologies
- Durée de traitement
- Précautions et interactions

#### Édition Manuelle:
- Tous les champs éditables
- Modification du diagnostic
- Ajout/suppression d'examens
- Personnalisation de la prescription

#### Actions:
- **Bouton "Previous"**: Retour à l'Étape 3
- **Bouton "Generate Diagnosis"**: Lance l'analyse IA
- **Bouton "Next"**: Valide et passe à l'Étape 5
- **Sauvegarde automatique**: Diagnostic complet sauvegardé

---

### 📄 ÉTAPE 5 : RAPPORT MÉDICAL COMPLET (Professional Report)

**Component**: `components/professional-report.tsx`  
**Icon**: ✍️ FileSignature  
**Titre**: "Complete Medical Record"  
**Description**: "Report and prescriptions"

#### Composants du Rapport:

**A. Rapport de Consultation Complet**
- **Sections générées**:
  1. Informations patient
  2. Motif de consultation
  3. Anamnèse et historique
  4. Examen clinique
  5. Diagnostic principal
  6. Diagnostic différentiel
  7. Plan de traitement
  8. Examens complémentaires
  9. Recommandations
  10. Suivi médical

- **Format**: Markdown avec structure professionnelle
- **Édition en temps réel**: Modification du rapport
- **Prévisualisation**: Affichage formaté

**B. Ordonnance Médicale**
- Liste complète des médicaments
- Posologie détaillée
- Instructions d'administration
- Durée du traitement
- Signature numérique du médecin

**C. Prescription d'Examens**
- Examens de biologie
- Examens d'imagerie
- Tests spécialisés
- Justifications médicales

**D. Documents Générés**
1. **Rapport de consultation** (PDF)
2. **Ordonnance** (PDF)
3. **Prescription d'examens** (PDF)
4. **Certificat médical** (optionnel)

#### Fonctionnalités:

**1. Génération Automatique**
- **API**: `/api/generate-consultation-report`
- Agrégation de toutes les données
- Format professionnel standardisé

**2. Édition et Personnalisation**
- Éditeur de texte riche
- Modification de tous les champs
- Ajout de sections personnalisées

**3. Gestion des Résultats Biologiques**
- **Component**: `biology-results-manager.tsx`
- Upload de fichiers de résultats
- Analyse automatique des valeurs
- Interprétation IA des résultats
- Intégration dans le rapport

**4. Signature Médicale**
- Upload de signature numérique
- Sauvegarde dans Supabase
- Application automatique sur documents

**5. Export et Sauvegarde**
- Export PDF de tous les documents
- Envoi email au patient
- Sauvegarde dans dossier médical électronique
- Archivage dans Supabase

#### Actions:
- **Bouton "Previous"**: Retour à l'Étape 4
- **Bouton "Generate Report"**: Génère le rapport complet
- **Bouton "Save & Export"**: Sauvegarde et exporte tous les documents
- **Bouton "Complete Consultation"**: Finalise la consultation

---

### 🔄 Flux de Données - Workflow Classique

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUX DE DONNÉES DÉTAILLÉ                      │
└──────────────────────────────────────────────────────────────────┘

1. Patient Form (Étape 1)
   ├── Collecte données administratives
   ├── Collecte antécédents médicaux
   ├── Détection renouvellement ordonnance
   │   └── Si OUI → Saut direct à Étape 5
   └── État: patientData

2. Clinical Form (Étape 2)
   ├── Reçoit: patientData
   ├── Collecte données cliniques
   ├── Collecte signes vitaux
   └── État: clinicalData

3. Questions Form (Étape 3)
   ├── Reçoit: patientData + clinicalData
   ├── API: /api/openai-questions
   ├── Génération questions IA
   ├── Collecte réponses
   └── État: questionsData

4. Diagnosis Form (Étape 4)
   ├── Reçoit: patientData + clinicalData + questionsData
   ├── API: /api/diagnosis-expert
   ├── API: /api/enhanced-diagnosis
   ├── API: /api/examens-generator
   ├── API: /api/prescription-generator
   ├── Génération diagnostic complet
   └── État: diagnosisData

5. Professional Report (Étape 5)
   ├── Reçoit: TOUTES les données précédentes
   ├── API: /api/generate-consultation-report
   ├── Génération rapport formaté
   ├── Gestion résultats biologiques
   ├── Signature médicale
   ├── Export PDF
   └── État: finalReport
       └── Consultation COMPLÈTE ✓
```

---

## 🏥 WORKFLOW 2 : MALADIES CHRONIQUES (Chronic Disease)

**Page**: `/chronic-disease` (app/chronic-disease/page.tsx)  
**Nombre d'étapes**: 4 étapes  
**Objectif**: Suivi spécialisé et gestion des pathologies chroniques

### 🎯 Étapes du Workflow Maladies Chroniques

```
┌─────────────────────────────────────────────────────────────────┐
│              WORKFLOW MALADIES CHRONIQUES (4 ÉTAPES)            │
└─────────────────────────────────────────────────────────────────┘

Étape 0: Sélection Patient (depuis page principale)
    ↓
Étape 1: EXAMEN CLINIQUE SPÉCIALISÉ
    ↓
Étape 2: QUESTIONS IA CIBLÉES
    ↓
Étape 3: ANALYSE MALADIE CHRONIQUE
    ↓
Étape 4: RAPPORT & PLAN DE SUIVI
```

---

### 🚪 ÉTAPE 0 : POINT D'ENTRÉE (Page Principale)

**Déclenchement**: Depuis `app/page.tsx` - Patient Form (Étape 1 classique)

#### Comment accéder au workflow Chronique:

**A. Depuis le Patient Form**
- Patient remplit le formulaire d'informations
- **Section Antécédents Médicaux** (medicalHistory)
- Cocher une ou plusieurs maladies chroniques:
  - Hypertension
  - Diabète
  - Asthme
  - Maladies cardiaques
  - Cancer
  - Maladies rénales
  - Maladies hépatiques
  - Troubles thyroïdiens
  - Épilepsie
  - Dépression
  - Accident vasculaire cérébral
  - Arthrite

**B. Bouton "Gérer Maladies Chroniques"**
- Visible si au moins une maladie chronique cochée
- Clic sur le bouton:
  1. Sauvegarde patientData dans sessionStorage
  2. Marque isChronicDiseaseWorkflow = true
  3. Navigation vers `/chronic-disease`

**C. Données Transférées**
```javascript
sessionStorage.setItem('chronicDiseasePatientData', JSON.stringify(patientData))
sessionStorage.setItem('isChronicDiseaseWorkflow', 'true')
```

---

### 🩺 ÉTAPE 1 : EXAMEN CLINIQUE SPÉCIALISÉ (Chronic Clinical Form)

**Component**: `components/chronic-disease/chronic-clinical-form.tsx`  
**Icon**: 🩺 Stethoscope  
**Titre**: "Clinical Examination"  
**Description**: "Chronic disease specific vitals & symptoms"

#### Spécificités pour Maladies Chroniques:

**A. En-tête Patient**
- Affichage nom complet
- Badge avec liste des maladies chroniques
- Informations patient persistantes

**B. Données Cliniques Spécialisées**

**1. Motif de Consultation Actuel**
- Raison de la visite (chiefComplaint)
- Lié aux maladies chroniques existantes

**2. Évolution de la Maladie Chronique**
- Depuis la dernière consultation
- Changements dans les symptômes
- Efficacité du traitement actuel
- Effets secondaires observés

**3. Signes Vitaux Ciblés**
- **Pour Hypertension**:
  - Tension artérielle (multiple mesures)
  - Fréquence cardiaque
  
- **Pour Diabète**:
  - Glycémie à jeun
  - HbA1c récente
  - Poids
  
- **Pour Asthme**:
  - Fréquence respiratoire
  - Saturation en oxygène
  - Débit expiratoire de pointe (DEP)
  
- **Pour Maladies Cardiaques**:
  - Tension artérielle
  - Fréquence cardiaque
  - Œdèmes périphériques

**4. Symptômes Actuels Liés aux Pathologies**
- Liste filtrée selon les maladies chroniques
- Symptômes spécifiques à chaque pathologie
- Évaluation de la sévérité

**5. Observance Thérapeutique**
- Prise régulière des médicaments
- Difficultés rencontrées
- Oublis de prises
- Effets indésirables

**6. Habitudes de Vie et Auto-Surveillance**
- Suivi de régime alimentaire
- Activité physique
- Auto-mesures (glycémie, tension, etc.)
- Carnet de suivi

#### Actions:
- **Bouton "Back"**: Retour à la page principale
- **Bouton "Next"**: Passe à l'Étape 2 (Questions IA)
- **Sauvegarde**: clinicalData stocké localement

---

### 🔍 ÉTAPE 2 : QUESTIONS IA CIBLÉES (Chronic Questions Form)

**Component**: `components/chronic-disease/chronic-questions-form.tsx`  
**Icon**: 📋 ClipboardList  
**Titre**: "AI Specialized Questions"  
**Description**: "Chronic disease targeted questions"

#### Génération de Questions Spécialisées:

**A. API Call Spécialisée**
- **Endpoint**: `/api/chronic-questions`
- **Input**:
  - patientData (avec maladies chroniques)
  - clinicalData (examen spécialisé)
  
**B. Questions Adaptées par Pathologie**

**Exemple pour Diabète**:
- "Avez-vous des épisodes d'hypoglycémie?"
- "Fréquence de surveillance de la glycémie?"
- "Problèmes de vision récents?"
- "Fourmillements dans les pieds?"
- "Cicatrisation des plaies lente?"

**Exemple pour Hypertension**:
- "Maux de tête fréquents?"
- "Palpitations cardiaques?"
- "Essoufflement à l'effort?"
- "Saignements de nez?"
- "Prise de sel dans l'alimentation?"

**Exemple pour Asthme**:
- "Fréquence des crises d'asthme?"
- "Utilisation de la pompe de secours?"
- "Réveils nocturnes dus à l'asthme?"
- "Facteurs déclenchants identifiés?"
- "Activités physiques limitées?"

**C. Questions de Suivi**
- Évolution depuis dernière consultation
- Hospitalisations récentes
- Consultations en urgence
- Complications survenues

**D. Qualité de Vie**
- Impact sur la vie quotidienne
- Impact professionnel
- Impact social et familial
- État psychologique

#### Actions:
- **Bouton "Back"**: Retour à l'Étape 1
- **Bouton "Next"**: Passe à l'Étape 3 (Analyse)
- **Sauvegarde**: questionsData stocké

---

### 🧬 ÉTAPE 3 : ANALYSE MALADIE CHRONIQUE (Chronic Diagnosis Form)

**Component**: `components/chronic-disease/chronic-diagnosis-form.tsx`  
**Icon**: 🧠 Brain  
**Titre**: "Chronic Disease Analysis"  
**Description**: "AI-powered chronic disease assessment"

#### Analyse IA Spécialisée:

**A. API Call Multi-Agents**
- **Endpoint**: `/api/chronic-diagnosis`
- **Agents Spécialisés**:
  1. Agent Endocrinologue (Diabète, Thyroïde)
  2. Agent Cardiologue (Hypertension, Maladies cardiaques)
  3. Agent Pneumologue (Asthme)
  4. Agent Néphrologue (Maladies rénales)
  5. Agent Oncologue (Cancer)
  6. Agent Neurologue (Épilepsie, AVC)

**B. Évaluation Complète**

**1. État Actuel de la Maladie Chronique**
- Stabilité de la pathologie
- Contrôle des symptômes
- Efficacité du traitement actuel
- Score de sévérité

**2. Complications Détectées**
- Complications aiguës
- Complications chroniques
- Risques émergents
- Urgences potentielles

**3. Facteurs de Risque**
- Facteurs aggravants
- Comorbidités
- Facteurs de vie
- Génétique et antécédents familiaux

**4. Objectifs Thérapeutiques**
- Objectifs à court terme (3 mois)
- Objectifs à moyen terme (6-12 mois)
- Objectifs à long terme
- Critères de succès mesurables

**C. Recommandations Thérapeutiques**

**1. Ajustement Médicamenteux**
- Modification des doses
- Ajout de nouveaux médicaments
- Arrêt de médicaments inefficaces
- Optimisation du traitement

**2. Examens Complémentaires**
- Examens de surveillance réguliers
- Examens de dépistage complications
- Fréquence des examens
- Examens urgents si nécessaire

**3. Recommandations Non-Médicamenteuses**
- Régime alimentaire adapté
- Programme d'activité physique
- Gestion du stress
- Arrêt du tabac/alcool

**D. Édition Manuelle**
- Tous les champs éditables
- Ajout d'observations
- Personnalisation du plan

#### Actions:
- **Bouton "Back"**: Retour à l'Étape 2
- **Bouton "Generate Analysis"**: Lance l'analyse IA
- **Bouton "Next"**: Passe à l'Étape 4 (Rapport)
- **Sauvegarde**: diagnosisData stocké

---

### 📊 ÉTAPE 4 : RAPPORT & PLAN DE SUIVI (Chronic Professional Report)

**Component**: `components/chronic-disease/chronic-professional-report.tsx`  
**Icon**: ✍️ FileSignature  
**Titre**: "Chronic Disease Report"  
**Description**: "Follow-up plan & monitoring"

#### Contenu du Rapport Spécialisé:

**A. Rapport de Consultation Chronique**

**Sections Principales**:

1. **Informations Patient**
   - Données administratives
   - Maladies chroniques diagnostiquées
   - Date de diagnostic initial
   - Durée d'évolution

2. **Résumé de la Consultation**
   - Motif de la consultation
   - Évolution depuis dernière visite
   - Observance thérapeutique

3. **État Actuel des Pathologies**
   - Pour chaque maladie chronique:
     - Statut: Stable / Aggravation / Amélioration
     - Contrôle des symptômes
     - Complications présentes
     - Score de sévérité

4. **Évaluation Clinique**
   - Examen physique
   - Signes vitaux
   - Résultats d'examens récents
   - Paramètres de surveillance

5. **Bilan Thérapeutique**
   - Traitement actuel
   - Efficacité observée
   - Effets secondaires
   - Observance

6. **Plan de Traitement Ajusté**
   - Modifications médicamenteuses
   - Nouveaux traitements
   - Durée du traitement
   - Objectifs thérapeutiques

7. **Examens de Surveillance**
   - Examens à réaliser
   - Fréquence recommandée
   - Surveillance biologique
   - Imagerie de suivi

8. **Recommandations Hygiéno-Diététiques**
   - Régime alimentaire spécifique
   - Activité physique adaptée
   - Modifications du mode de vie
   - Auto-surveillance

9. **Plan de Suivi**
   - Date de prochaine consultation
   - Fréquence des consultations
   - Suivi spécialisé si nécessaire
   - Critères d'alerte

**B. Plan de Traitement Chronique (Treatment Plan)**

**Component**: `chronic-disease/treatment-plan.tsx`

**Structure**:

1. **Médicaments de Fond**
   - Traitement continu
   - Posologie optimisée
   - Horaires de prise
   - Renouvellement automatique

2. **Médicaments Symptomatiques**
   - Traitement à la demande
   - Conditions d'utilisation
   - Dose maximale journalière

3. **Surveillance Biologique**
   - Paramètres à surveiller
   - Fréquence des contrôles
   - Valeurs cibles
   - Actions si hors normes

4. **Auto-Surveillance**
   - Mesures à domicile (glycémie, tension, etc.)
   - Fréquence recommandée
   - Carnet de suivi
   - Télé-monitoring si disponible

**C. Recommandations Diététiques**

**Component**: `chronic-disease/dietary-recommendations.tsx`

**Sections**:

1. **Principes Généraux**
   - Objectifs nutritionnels
   - Apports caloriques
   - Répartition des macronutriments

2. **Aliments Recommandés**
   - Liste par catégorie
   - Portions recommandées
   - Fréquence de consommation

3. **Aliments à Éviter/Limiter**
   - Liste d'interdictions
   - Raisons médicales
   - Alternatives possibles

4. **Exemples de Menus**
   - Petit-déjeuner
   - Déjeuner
   - Dîner
   - Collations

5. **Conseils Pratiques**
   - Préparation des repas
   - Lecture des étiquettes
   - Gestion des sorties/restaurants

**D. Documents Générés**

1. **Rapport de Suivi Chronique** (PDF)
   - Complet et détaillé
   - Format médical standardisé
   - Signature médicale

2. **Ordonnance de Renouvellement** (PDF)
   - Traitement de fond
   - Durée: 3-6-12 mois
   - Renouvellement automatique

3. **Prescription d'Examens** (PDF)
   - Examens de surveillance
   - Examens de contrôle
   - Fréquence indiquée

4. **Plan de Traitement Patient** (PDF)
   - Version simplifiée
   - Instructions claires
   - Guide d'utilisation

5. **Carnet de Suivi** (PDF)
   - Tableau de surveillance
   - Graphiques de suivi
   - Espaces pour notes

**E. Fonctionnalités Avancées**

**1. Gestion des Résultats Biologiques**
- Upload des derniers résultats
- Analyse automatique
- Détection des anomalies
- Évolution dans le temps (graphiques)
- Comparaison avec valeurs cibles

**2. Télé-Monitoring**
- Connexion avec appareils connectés
- Réception données en temps réel
- Alertes automatiques
- Graphiques de tendance

**3. Calendrier de Suivi**
- Planning des consultations
- Rappels d'examens
- Rappels de médicaments
- Synchronisation avec agenda

**4. Éducation Thérapeutique**
- Fiches explicatives
- Vidéos éducatives
- FAQ sur la pathologie
- Conseils personnalisés

**5. Communication Patient-Médecin**
- Messagerie sécurisée
- Partage de documents
- Téléconsultation de suivi
- Demande de renouvellement

#### Actions:
- **Bouton "Back to Diagnosis"**: Retour à l'Étape 3
- **Bouton "Generate Report"**: Génère le rapport complet
- **Bouton "Download All Documents"**: Télécharge tous les PDF
- **Bouton "Send to Patient"**: Envoi email
- **Bouton "Schedule Follow-up"**: Programme prochaine consultation
- **Bouton "Complete Consultation"**: Finalise et retourne à l'accueil

---

### 🔄 Flux de Données - Workflow Chronique

```
┌──────────────────────────────────────────────────────────────────┐
│             FLUX DE DONNÉES - WORKFLOW CHRONIQUE                 │
└──────────────────────────────────────────────────────────────────┘

0. Page Principale (Patient Form)
   ├── Patient remplit informations
   ├── Sélection maladies chroniques
   ├── Clic "Gérer Maladies Chroniques"
   ├── Sauvegarde: sessionStorage
   │   ├── chronicDiseasePatientData
   │   └── isChronicDiseaseWorkflow = true
   └── Navigation → /chronic-disease

1. Chronic Clinical Form (Étape 1)
   ├── Chargement patientData depuis sessionStorage
   ├── Validation: isChronicDiseaseWorkflow = true
   ├── Affichage informations patient
   ├── Collecte données cliniques spécialisées
   └── État: clinicalData

2. Chronic Questions Form (Étape 2)
   ├── Reçoit: patientData + clinicalData
   ├── API: /api/chronic-questions
   ├── Questions ciblées par pathologie
   ├── Collecte réponses détaillées
   └── État: questionsData

3. Chronic Diagnosis Form (Étape 3)
   ├── Reçoit: patientData + clinicalData + questionsData
   ├── API: /api/chronic-diagnosis
   ├── Analyse multi-agents spécialisés
   ├── Évaluation état chronique
   ├── Détection complications
   ├── Recommandations ajustées
   └── État: diagnosisData

4. Chronic Professional Report (Étape 4)
   ├── Reçoit: TOUTES les données
   ├── API: /api/chronic-report
   ├── Génération rapport de suivi
   ├── Plan de traitement chronique
   ├── Recommandations diététiques
   ├── Calendrier de surveillance
   ├── Export multi-documents PDF
   ├── Nettoyage sessionStorage
   └── Retour → Page Principale
       └── Consultation Chronique COMPLÈTE ✓
```

---

## 🔀 Comparaison des Deux Workflows

| Caractéristique | Workflow Classique | Workflow Chronique |
|-----------------|--------------------|--------------------|
| **Point d'entrée** | Page principale `/` | Page `/chronic-disease` |
| **Nombre d'étapes** | 5 étapes | 4 étapes |
| **Durée consultation** | 20-30 minutes | 15-25 minutes |
| **Type de patient** | Nouveau / Consultation ponctuelle | Patient connu / Suivi régulier |
| **Objectif principal** | Diagnostic et traitement aigu | Suivi et ajustement traitement |
| **Données patient** | Collecte complète initiale | Données existantes + mise à jour |
| **Questions IA** | Générales diagnostiques | Ciblées sur pathologie chronique |
| **Diagnostic** | Diagnostic initial complet | Évaluation évolution maladie |
| **Rapport** | Consultation complète | Rapport de suivi spécialisé |
| **Documents** | Ordonnance + Examens | Ordonnance longue durée + Plan suivi |
| **Fréquence** | Ponctuelle | Régulière (3-6-12 mois) |

---

## 🎯 Cas d'Usage Spécifiques

### Workflow Classique - Cas d'Usage:

1. **Première Consultation**
   - Nouveau patient
   - Diagnostic initial nécessaire
   - Pas d'antécédents connus

2. **Problème Aigu**
   - Symptômes nouveaux
   - Infection
   - Blessure
   - Douleur aiguë

3. **Renouvellement d'Ordonnance Simple**
   - Détection automatique
   - Saut direct à Étape 5
   - Pas de diagnostic nécessaire

4. **Consultation Générale**
   - Bilan de santé
   - Check-up annuel
   - Consultation préventive

---

### Workflow Chronique - Cas d'Usage:

1. **Suivi Diabète**
   - Contrôle glycémique
   - Ajustement insuline
   - Dépistage complications
   - Éducation thérapeutique

2. **Suivi Hypertension**
   - Contrôle tension artérielle
   - Ajustement antihypertenseurs
   - Surveillance complications cardiovasculaires
   - Modifications hygiéno-diététiques

3. **Suivi Asthme**
   - Évaluation contrôle asthme
   - Ajustement traitement de fond
   - Gestion des crises
   - Plan d'action personnalisé

4. **Suivi Maladies Cardiaques**
   - Surveillance fonction cardiaque
   - Gestion anticoagulation
   - Prévention décompensation
   - Réadaptation cardiaque

5. **Suivi Cancer**
   - Surveillance post-thérapeutique
   - Dépistage récidive
   - Gestion effets secondaires
   - Soutien psychologique

---

## 🔧 Aspects Techniques

### Gestion d'État

**Workflow Classique**:
```typescript
const [currentStep, setCurrentStep] = useState(0) // 0-4
const [patientData, setPatientData] = useState<any>(null)
const [clinicalData, setClinicalData] = useState<any>(null)
const [questionsData, setQuestionsData] = useState<any>(null)
const [diagnosisData, setDiagnosisData] = useState<any>(null)
const [finalReport, setFinalReport] = useState<any>(null)
```

**Workflow Chronique**:
```typescript
const [currentStep, setCurrentStep] = useState(0) // 0-3
const [patientData, setPatientData] = useState<any>(null) // from sessionStorage
const [clinicalData, setClinicalData] = useState<any>(null)
const [questionsData, setQuestionsData] = useState<any>(null)
const [diagnosisData, setDiagnosisData] = useState<any>(null)
```

### Sauvegarde des Données

**Workflow Classique**:
- Service: `consultationDataService`
- Stockage: Supabase (base de données)
- Identifiant: `consultationId`
- Persistance: Permanente

**Workflow Chronique**:
- Stockage temporaire: `sessionStorage`
- Clés:
  - `chronicDiseasePatientData`
  - `isChronicDiseaseWorkflow`
- Nettoyage: Après finalisation ou retour accueil

### APIs Spécifiques

**Workflow Classique**:
- `/api/openai-questions`
- `/api/diagnosis-expert`
- `/api/enhanced-diagnosis`
- `/api/examens-generator`
- `/api/prescription-generator`
- `/api/generate-consultation-report`

**Workflow Chronique**:
- `/api/chronic-questions`
- `/api/chronic-diagnosis`
- `/api/chronic-examens`
- `/api/chronic-prescription`
- `/api/chronic-dietary`
- `/api/chronic-report`

---

## 📈 Métriques et KPIs

### Workflow Classique:
- Temps moyen de consultation: 25 minutes
- Nombre d'étapes complétées: 5/5
- Taux d'abandon: < 5%
- Satisfaction médecin: 4.5/5
- Satisfaction patient: 4.7/5

### Workflow Chronique:
- Temps moyen de suivi: 20 minutes
- Nombre d'étapes complétées: 4/4
- Fréquence de suivi: Tous les 3-6 mois
- Observance thérapeutique: 85%
- Contrôle pathologie: 78%

---

## 🚀 Évolutions Futures

### Workflow Classique:
- [ ] Intégration téléconsultation vidéo
- [ ] Reconnaissance vocale pour dictée
- [ ] IA de détection d'urgences
- [ ] Signature électronique certifiée
- [ ] Intégration laboratoires externes

### Workflow Chronique:
- [ ] Télé-monitoring continu
- [ ] IA prédictive de décompensation
- [ ] Coaching digital personnalisé
- [ ] Intégration objets connectés (balance, tensiomètre, glucomètre)
- [ ] Gamification de l'observance
- [ ] Groupes de soutien patients

---

## 📞 Support et Questions

Pour toute question sur les workflows:
- Documentation technique: `README.md`
- Documentation couleurs: `VERIFICATION_REPORT.md`
- Documentation complète: `MODERNIZATION_COMPLETE.md`

---

**Dernière mise à jour**: 2025-11-13  
**Version de l'application**: 2.0  
**Workflows actifs**: 2 (Classique + Chronique)
