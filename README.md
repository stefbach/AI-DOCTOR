# Medical AI Expert

Système de diagnostic médical assisté par Intelligence Artificielle utilisant OpenAI GPT-4, FDA Database, RxNorm et PubMed.

## 🚀 Fonctionnalités

- **Diagnostic IA** avec OpenAI GPT-4 spécialisé en médecine
- **Vérification FDA** des interactions médicamenteuses
- **Normalisation RxNorm** des prescriptions
- **Références PubMed** scientifiques en temps réel
- **Interface intuitive** pour consultation médicale complète
- **Génération de rapports** médicaux détaillés

## 📋 Prérequis

- Node.js 18+ 
- npm ou yarn
- Clé API OpenAI (obligatoire)

## ⚙️ Installation

1. **Clonez le projet**
   \`\`\`bash
   git clone <repository-url>
   cd medical-ai-expert
   \`\`\`

2. **Installez les dépendances**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configurez les variables d'environnement**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

4. **Ajoutez votre clé API OpenAI** dans `.env.local`
   \`\`\`env
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   \`\`\`

5. **Lancez l'application**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Ouvrez votre navigateur** sur `http://localhost:3000`

## 🔑 Configuration OpenAI

### Obtenir votre clé API OpenAI

1. Allez sur [OpenAI Platform](https://platform.openai.com/)
2. Créez un compte ou connectez-vous
3. Naviguez vers [API Keys](https://platform.openai.com/api-keys)
4. Cliquez sur "Create new secret key"
5. Copiez la clé générée (elle commence par `sk-`)
6. Ajoutez-la dans votre fichier `.env.local`

### Coût estimé

- **GPT-4o** : ~$0.03 par diagnostic complet
- **APIs médicales** : Gratuites (FDA, RxNorm, PubMed)

## 🏥 APIs Intégrées

### 1. OpenAI GPT-4
- **Usage** : Diagnostic médical intelligent
- **Coût** : Payant (~$0.03/diagnostic)
- **Configuration** : Clé API requise

### 2. FDA Database
- **Usage** : Informations médicamenteuses officielles
- **Coût** : Gratuit
- **URL** : `api.fda.gov/drug/label.json`

### 3. RxNorm API
- **Usage** : Normalisation des noms de médicaments
- **Coût** : Gratuit  
- **URL** : `rxnav.nlm.nih.gov/REST/drugs.json`

### 4. PubMed API
- **Usage** : Recherche d'articles scientifiques
- **Coût** : Gratuit
- **URL** : `eutils.ncbi.nlm.nih.gov`

## 🧪 Tests avec Cas Cliniques

### Cas Test 1: Syndrome Fébrile
\`\`\`json
{
  "patient": {
    "age": 35,
    "gender": "Femme",
    "allergies": "Aucune"
  },
  "clinical": {
    "chiefComplaint": "Fièvre depuis 3 jours avec maux de tête",
    "vitalSigns": {
      "temperature": "38.5",
      "heartRate": "95",
      "bloodPressure": "120/80"
    }
  }
}
\`\`\`

### Cas Test 2: Douleur Thoracique
\`\`\`json
{
  "patient": {
    "age": 55,
    "gender": "Homme",
    "medicalHistory": "Hypertension"
  },
  "clinical": {
    "chiefComplaint": "Douleur thoracique à l'effort",
    "vitalSigns": {
      "heartRate": "110",
      "bloodPressure": "150/95"
    }
  }
}
\`\`\`

## 📊 Structure du Projet

\`\`\`
medical-ai-expert/
├── app/
│   ├── api/
│   │   ├── openai-diagnosis/     # Diagnostic IA
│   │   ├── fda-drug-info/        # Infos médicaments
│   │   ├── rxnorm-normalize/     # Normalisation
│   │   └── pubmed-search/        # Recherche scientifique
│   ├── page.tsx                  # Interface principale
│   └── layout.tsx
├── components/
│   ├── patient-form.tsx          # Formulaire patient
│   ├── clinical-form.tsx         # Examen clinique
│   ├── diagnosis-form.tsx        # Diagnostic IA
│   └── consultation-report.tsx   # Rapport final
├── lib/
│   └── api-services.ts           # Services API
└── .env.example                  # Configuration
\`\`\`

## 🔒 Sécurité

- **Clés API** : Stockées côté serveur uniquement
- **Données patient** : Chiffrées en transit
- **Conformité** : Respect des standards médicaux
- **Audit** : Logs des diagnostics générés

## ⚠️ Avertissements

- **Usage médical** : Outil d'aide au diagnostic uniquement
- **Responsabilité** : Ne remplace pas l'expertise médicale
- **Validation** : Toujours confirmer avec un professionnel
- **Données** : Ne pas stocker d'informations sensibles

## 🛠️ Développement

### Scripts disponibles
\`\`\`bash
npm run dev          # Développement
npm run build        # Production
npm run start        # Serveur production
npm run lint         # Vérification code
\`\`\`

### Tests
\`\`\`bash
npm run test         # Tests unitaires
npm run test:e2e     # Tests end-to-end
\`\`\`

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## 📞 Support

- **Documentation** : Voir ce README
- **Issues** : Utilisez GitHub Issues
- **Email** : support@medical-ai-expert.com

---

**⚠️ Disclaimer médical** : Cet outil est destiné à l'aide au diagnostic médical et ne doit pas remplacer l'avis d'un professionnel de santé qualifié.
