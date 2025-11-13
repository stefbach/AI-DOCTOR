# 📋 TIBOK - Résumé des Workflows

## 🎯 Vue d'Ensemble

L'application TIBOK dispose de **2 workflows médicaux distincts**:

1. **Workflow Classique** - Consultations générales (5 étapes)
2. **Workflow Maladies Chroniques** - Suivi spécialisé (4 étapes)

---

## 🔄 Workflow 1: Consultation Classique

### Point d'Entrée
- **URL**: `/` (Page principale)
- **Durée**: 20-30 minutes
- **Pour**: Nouveaux patients, consultations ponctuelles, diagnostics initiaux

### Les 5 Étapes

#### Étape 1: 👤 Informations Patient
**Collecte**:
- Identité et coordonnées
- Antécédents médicaux
- Allergies
- Médicaments actuels
- Habitudes de vie

**Fonctionnalités spéciales**:
- Détection automatique de renouvellement d'ordonnance → saut direct à l'étape 5
- Intégration avec données Tibok existantes

#### Étape 2: 🩺 Données Cliniques
**Collecte**:
- Motif de consultation
- Historique de la maladie actuelle
- Symptômes (liste interactive)
- Échelle de douleur (0-10)
- Signes vitaux complets (température, tension, fréquence cardiaque, etc.)
- Notes d'examen physique

#### Étape 3: 🧠 Questions IA
**Fonctionnement**:
- L'IA analyse les données patient et cliniques
- Génération de questions diagnostiques ciblées
- Types: ouvertes, fermées, choix multiples, échelles
- API: `/api/openai-questions`

#### Étape 4: 📋 Diagnostic
**Génération par IA multi-agents**:
- Diagnostic principal avec code CIM-10
- Diagnostic différentiel
- Examens complémentaires recommandés
- Prescription médicamenteuse suggérée
- Tout est éditable manuellement

**APIs utilisées**:
- `/api/diagnosis-expert`
- `/api/enhanced-diagnosis`
- `/api/examens-generator`
- `/api/prescription-generator`

#### Étape 5: ✍️ Rapport Médical Complet
**Documents générés (PDF)**:
1. Rapport de consultation complet (10 sections)
2. Ordonnance médicale avec signature
3. Prescription d'examens
4. Certificat médical (optionnel)

**Fonctionnalités**:
- Éditeur de texte riche
- Gestion des résultats biologiques
- Signature numérique du médecin
- Envoi email au patient
- Sauvegarde dans le dossier médical

---

## 🏥 Workflow 2: Maladies Chroniques

### Point d'Entrée
- **URL**: `/chronic-disease`
- **Durée**: 15-25 minutes
- **Pour**: Patients connus avec pathologies chroniques (diabète, hypertension, asthme, etc.)

### Comment y accéder?
1. Patient remplit le formulaire d'informations (étape 1 classique)
2. Coche une ou plusieurs maladies chroniques dans "Antécédents médicaux"
3. Clic sur le bouton **"Gérer Maladies Chroniques"**
4. Navigation automatique vers `/chronic-disease`

### Les 4 Étapes

#### Étape 1: 🩺 Examen Clinique Spécialisé
**Spécificités par pathologie**:

**Diabète**:
- Glycémie à jeun
- HbA1c récente
- Poids

**Hypertension**:
- Tension artérielle (mesures multiples)
- Fréquence cardiaque

**Asthme**:
- Fréquence respiratoire
- Saturation en oxygène
- Débit expiratoire de pointe (DEP)

**Collecte supplémentaire**:
- Évolution depuis dernière consultation
- Observance thérapeutique
- Effets secondaires
- Auto-surveillance à domicile

#### Étape 2: 📋 Questions IA Ciblées
**Questions adaptées par pathologie**:

**Exemple Diabète**:
- Épisodes d'hypoglycémie?
- Fréquence de surveillance glycémie?
- Problèmes de vision récents?
- Fourmillements dans les pieds?

**Exemple Hypertension**:
- Maux de tête fréquents?
- Palpitations cardiaques?
- Essoufflement à l'effort?
- Prise de sel dans l'alimentation?

**API**: `/api/chronic-questions`

#### Étape 3: 🧠 Analyse Maladie Chronique
**Agents IA spécialisés**:
- 🏥 Endocrinologue (Diabète, Thyroïde)
- ❤️ Cardiologue (Hypertension, Maladies cardiaques)
- 🫁 Pneumologue (Asthme)
- 🩺 Néphrologue (Maladies rénales)
- 🎗️ Oncologue (Cancer)
- 🧠 Neurologue (Épilepsie, AVC)

**Évaluation complète**:
- État actuel de chaque pathologie (stable/aggravation/amélioration)
- Complications détectées
- Facteurs de risque
- Objectifs thérapeutiques (court/moyen/long terme)
- Recommandations d'ajustement du traitement

**API**: `/api/chronic-diagnosis`

#### Étape 4: ✍️ Rapport & Plan de Suivi
**Documents générés (PDF)**:
1. **Rapport de suivi chronique** - État des pathologies, évolution, plan
2. **Ordonnance longue durée** - Traitement de fond (3-6-12 mois)
3. **Plan de traitement** - Médicaments, surveillance biologique, auto-surveillance
4. **Recommandations diététiques** - Aliments, portions, menus, conseils
5. **Carnet de suivi** - Tableaux, graphiques, calendrier

**Fonctionnalités avancées**:
- Analyse des résultats biologiques avec évolution graphique
- Télé-monitoring (connexion appareils connectés)
- Calendrier de suivi automatique
- Modules d'éducation thérapeutique
- Communication patient-médecin

---

## 🎯 Quand Utiliser Quel Workflow?

### ✅ Utilisez le Workflow Classique pour:
- Nouveau patient sans dossier
- Symptômes aigus (fièvre, douleur, infection)
- Blessure ou traumatisme
- Diagnostic initial
- Consultation ponctuelle
- Bilan de santé annuel
- Renouvellement simple d'ordonnance

### ✅ Utilisez le Workflow Chronique pour:
- Patient connu avec maladie(s) chronique(s)
- Suivi régulier programmé
- Contrôle de l'efficacité du traitement
- Ajustement des médicaments
- Surveillance des complications
- Éducation thérapeutique
- Gestion à long terme

---

## 📊 Comparaison Rapide

| Critère | Classique | Chronique |
|---------|-----------|-----------|
| **Étapes** | 5 | 4 |
| **Durée** | 20-30 min | 15-25 min |
| **Patient** | Nouveau/ponctuel | Connu/suivi |
| **Objectif** | Diagnostic initial | Suivi évolution |
| **Questions IA** | Générales | Spécifiques pathologie |
| **Agents IA** | Généralistes | Spécialisés |
| **Ordonnance** | Standard | Longue durée |
| **Documents** | 1-3 | 5+ |
| **Fréquence** | Ponctuelle | Régulière (3-6-12 mois) |

---

## 🔧 Composants Techniques

### Workflow Classique
```
app/page.tsx
├── components/patient-form.tsx
├── components/clinical-form.tsx
├── components/questions-form.tsx
├── components/diagnosis-form.tsx
├── components/professional-report.tsx
└── components/biology-results-manager.tsx
```

### Workflow Chronique
```
app/chronic-disease/page.tsx
└── components/chronic-disease/
    ├── chronic-clinical-form.tsx
    ├── chronic-questions-form.tsx
    ├── chronic-diagnosis-form.tsx
    ├── chronic-professional-report.tsx
    ├── treatment-plan.tsx
    └── dietary-recommendations.tsx
```

---

## 🔗 APIs Principales

### Classique
- `/api/openai-questions` - Génération questions diagnostiques
- `/api/diagnosis-expert` - Diagnostic expert
- `/api/enhanced-diagnosis` - Diagnostic enrichi
- `/api/examens-generator` - Examens recommandés
- `/api/prescription-generator` - Prescription suggérée
- `/api/generate-consultation-report` - Rapport final

### Chronique
- `/api/chronic-questions` - Questions ciblées pathologie
- `/api/chronic-diagnosis` - Analyse spécialisée
- `/api/chronic-examens` - Examens de surveillance
- `/api/chronic-prescription` - Prescription longue durée
- `/api/chronic-dietary` - Recommandations diététiques
- `/api/chronic-report` - Rapport de suivi

---

## 📚 Documentation Complète

Pour plus de détails, consultez:

1. **WORKFLOWS_DOCUMENTATION.md** (30 KB)
   - Descriptions exhaustives de chaque étape
   - Flux de données détaillés
   - Cas d'usage complets
   - Métriques et KPIs

2. **WORKFLOWS_VISUAL_GUIDE.md** (42 KB)
   - Diagrammes ASCII art
   - Arbres de décision
   - Flux de navigation
   - Comparaisons visuelles

---

## 🎯 Points Clés à Retenir

1. **Deux workflows distincts** pour deux types de consultations
2. **Détection intelligente** du renouvellement d'ordonnance dans le workflow classique
3. **Agents IA spécialisés** pour les maladies chroniques
4. **Navigation fluide** entre les deux workflows
5. **Documents professionnels** générés automatiquement
6. **Tout est éditable** - l'IA suggère, le médecin décide

---

**Date de création**: 2025-11-13  
**Version**: TIBOK v2.0  
**Statut**: Production Ready ✓
