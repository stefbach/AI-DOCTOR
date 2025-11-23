# 📊 Comment Voir les Logs Backend sur Vercel

## 🎯 Objectif

Voir les logs backend qui contiennent:
- `💊 PRESCRIPTION EXTRACTION`
- `📋 Current medications validated by AI`
- `✅ PRESCRIPTIONS EXTRACTED SUMMARY`

## 📋 Méthode 1: Via Dashboard Vercel (RECOMMANDÉ)

### Étape 1: Aller sur Vercel Dashboard
1. Aller sur https://vercel.com/
2. Se connecter avec votre compte
3. Cliquer sur votre projet **AI-DOCTOR**

### Étape 2: Ouvrir les Logs
1. Dans le menu de gauche, cliquer sur **"Logs"** ou **"Functions"**
2. Ou aller directement sur: `https://vercel.com/[votre-nom]/ai-doctor/logs`

### Étape 3: Filtrer les Logs
1. Dans le filtre, chercher **"generate-consultation-report"**
2. Ou filtrer par **"Function Logs"**
3. Sélectionner **"Real-time"** ou **"Last hour"**

### Étape 4: Faire une Consultation
1. Pendant que les logs sont ouverts, faire une consultation avec des médicaments actuels
2. Les logs apparaîtront en temps réel
3. Chercher les lignes avec **💊** ou **📋**

### Étape 5: Copier les Logs
1. Cliquer sur **"Download"** ou **"Export"**
2. Ou sélectionner et copier manuellement
3. Me les envoyer

## 📋 Méthode 2: Via Vercel CLI (Pour Développeurs)

### Installation
```bash
npm i -g vercel
vercel login
```

### Voir les Logs en Temps Réel
```bash
vercel logs [votre-deployment-url] --follow
```

### Filtrer les Logs
```bash
vercel logs [votre-deployment-url] --follow | grep "💊"
```

## 📋 Méthode 3: Via l'URL de Deployment

### Étape 1: Trouver l'URL du Dernier Deployment
1. Sur Vercel Dashboard → Deployments
2. Copier l'URL du dernier deployment (ex: `https://ai-doctor-xyz.vercel.app`)

### Étape 2: Voir les Logs
1. Aller sur: `https://vercel.com/[votre-nom]/ai-doctor/deployments/[deployment-id]/logs`
2. Ou cliquer sur le deployment puis "View Function Logs"

## 🔍 CE QUE JE CHERCHE DANS LES LOGS BACKEND

### Log Critique 1: Entrée de l'API
```
💊 ========== PRESCRIPTION EXTRACTION FROM DIAGNOSIS API ==========
📦 diagnosisData received:
   hasCurrentMedicationsValidated: true
   currentMedicationsValidatedLength: X
   currentMedicationsValidatedContent: [...]
```

**SI X = 0**: Les médicaments n'arrivent pas de openai-diagnosis!

### Log Critique 2: Extraction
```
📋 Current medications validated by AI: X
✅ EXTRACTING CURRENT MEDICATIONS:
   1. Metformin 500mg - 500mg - BD (twice daily)
```

**SI pas présent**: Aucun médicament à extraire!

### Log Critique 3: Résumé
```
✅ ========== PRESCRIPTIONS EXTRACTED SUMMARY ==========
   📊 Total counts:
      - Medications: X
   💊 Medications breakdown:
      - Current (continued): X
      - Newly prescribed: X
```

**SI Current = 0**: Les médicaments actuels ne sont pas extraits!

### Log Critique 4: Après Traduction
```
🔍 DETAILED MEDICATIONS AFTER TRANSLATION:
   1. Metformin 500mg - type: current_continued - validated: true
```

**SI pas présent**: Les médicaments disparaissent pendant la traduction!

## ⚠️ PROBLÈMES COURANTS

### "Je ne vois pas les logs"
- Vérifier que vous êtes sur le bon projet
- Vérifier que le filtre n'est pas trop restrictif
- Essayer de faire une consultation pendant que les logs sont ouverts

### "Les logs sont vides"
- Attendre quelques secondes après la génération du rapport
- Rafraîchir la page des logs
- Vérifier que le deployment est bien le dernier

### "Trop de logs"
- Utiliser le filtre: chercher **"💊"** ou **"PRESCRIPTION"**
- Ou télécharger et me les envoyer tous

## 📤 FORMAT POUR M'ENVOYER LES LOGS

```
=== LOGS BACKEND VERCEL ===
[Coller TOUS les logs qui contiennent 💊 ou 📋 ou ✅]

OU

[Télécharger le fichier .txt et me l'envoyer]

=== RÉSULTAT ===
Médicaments dans le rapport: OUI/NON
```

## 🚀 ALTERNATIVE: Logs en Local

Si vous développez en local avec `npm run dev`:

### Voir les logs
Les logs apparaissent directement dans le terminal où tourne le serveur.

### Copier les logs
1. Faire la consultation
2. Dans le terminal, chercher les logs avec 💊
3. Sélectionner et copier
4. Me les envoyer

---

## 🎯 RÉSUMÉ RAPIDE

1. **Aller sur Vercel Dashboard** → Logs
2. **Faire une consultation** avec médicaments actuels
3. **Copier les logs** qui contiennent 💊 ou 📋
4. **Me les envoyer**

**Avec ces logs, je peux corriger le problème en 2 minutes!** 🙏
