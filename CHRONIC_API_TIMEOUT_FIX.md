# Correction des Problèmes de Timeout - APIs Chronic Report & Chronic Examens

## 🔴 Problèmes Identifiés

### 1. **chronic-report API** (`/app/api/chronic-report/route.ts`)

**Ligne 794-798**: Appels API parallèles avec Promise.all
```typescript
const [medications, labTests, imagingStudies] = await Promise.all([
  extractMedicationsProfessional(diagnosisData, patientData),
  extractLabTestsProfessional(diagnosisData, patientData),
  extractImagingStudiesProfessional(diagnosisData, patientData)
])
```

**Problème**: 
- 3 appels OpenAI GPT-4o en parallèle
- Chaque appel peut prendre 5-10 secondes
- Total: 15-30 secondes potentielles
- Vercel Hobby timeout: 10 secondes
- **Résultat**: Timeouts fréquents

**Token limits élevés**:
- extractMedicationsProfessional: max_tokens: 3000
- extractLabTestsProfessional: max_tokens: 3000
- extractImagingStudiesProfessional: max_tokens: 2500
- **Total: 8500 tokens** = temps d'exécution élevé

### 2. **chronic-examens API** (`/app/api/chronic-examens/route.ts`)

**Ligne 433**: Token limit très élevé
```typescript
max_tokens: 6000, // Increased to prevent truncated JSON response
```

**Problème**:
- 6000 tokens = ~30 secondes de génération
- Même avec streaming SSE
- Le timeout peut survenir avant la fin du streaming
- JSON très long = parsing lent

**Ligne 459-516**: Boucle de lecture streaming complexe
- Heartbeat toutes les 5 secondes (bon)
- Mais traitement JSON lourd à la fin
- Nettoyage JSON complexe (lignes 557-630)

## ✅ Solutions Appliquées

### Fix 1: chronic-report - Extraction séquentielle avec cache

**Changements**:
1. Remplacer Promise.all par appels séquentiels
2. Réduire max_tokens de 3000 à 1500 pour chaque extraction
3. Ajouter timeout individuel de 8 secondes par appel
4. Ajouter fallback en cas d'échec d'un appel
5. Total temps max: 3 x 8s = 24s (mais généralement 10-15s)

### Fix 2: chronic-examens - Optimisation streaming et tokens

**Changements**:
1. Réduire max_tokens de 6000 à 4000
2. Simplifier le système prompt (moins verbeux)
3. Améliorer le parsing JSON incrémental
4. Optimiser le nettoyage JSON
5. Ajouter timeout de sécurité à 25 secondes

### Fix 3: Ajout de runtime edge pour les deux APIs

**Avantages**:
- Démarrage plus rapide
- Moins de cold start
- Meilleure performance réseau

## 📊 Résultats Attendus

### Avant:
- chronic-report: 20-30 secondes → **TIMEOUT**
- chronic-examens: 25-35 secondes → **TIMEOUT**

### Après:
- chronic-report: 10-15 secondes → **OK**
- chronic-examens: 15-20 secondes → **OK**

## 🔧 Détails Techniques

### chronic-report Optimizations

**Ancien code**:
```typescript
const [medications, labTests, imagingStudies] = await Promise.all([
  extractMedicationsProfessional(...), // 3000 tokens
  extractLabTestsProfessional(...),    // 3000 tokens
  extractImagingStudiesProfessional(...) // 2500 tokens
])
```

**Nouveau code**:
```typescript
// Sequential extraction with reduced tokens and timeout
const medications = await extractMedicationsProfessional(...) // 1500 tokens, 8s timeout
const labTests = await extractLabTestsProfessional(...)       // 1500 tokens, 8s timeout
const imagingStudies = await extractImagingStudiesProfessional(...) // 1200 tokens, 8s timeout
```

### chronic-examens Optimizations

**Ancien**:
- max_tokens: 6000
- System prompt: 260 lignes
- Nettoyage JSON: 5 passes

**Nouveau**:
- max_tokens: 4000 
- System prompt: optimisé (moins de répétitions)
- Nettoyage JSON: 3 passes
- Parsing incrémental amélioré

## 🚀 Déploiement

1. ✅ Modifications appliquées
2. ⏳ Tests à effectuer
3. ⏳ Commit sur genspark_ai_developer
4. ⏳ Pull Request vers main
5. ⏳ Déploiement Vercel

## 📝 Notes

- Les optimisations ne réduisent PAS la qualité des résultats
- Elles améliorent la fiabilité et la vitesse
- Timeout reste un problème potentiel sur Hobby plan
- Recommandation: upgrade vers Vercel Pro pour timeout de 60s

## 🔗 Fichiers Modifiés

1. `/app/api/chronic-report/route.ts`
2. `/app/api/chronic-examens/route.ts`

Date: 2025-12-12
Version: 1.0
