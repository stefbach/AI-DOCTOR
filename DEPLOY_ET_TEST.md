# 🚨 DÉPLOIEMENT URGENT - INSTRUCTIONS SIMPLES

## ❗ LE PROBLÈME

L'application en production tourne avec **L'ANCIEN CODE** qui ne marche pas.
Il faut déployer le NOUVEAU code pour que ça fonctionne.

---

## 🔧 ÉTAPE 1: MERGER LE PR

**Pull Request:** https://github.com/stefbach/AI-DOCTOR/pull/42

1. Va sur le lien
2. Clique sur "Merge pull request"
3. Confirme le merge

✅ **Le code sera dans la branche main**

---

## 🚀 ÉTAPE 2: DÉPLOYER EN PRODUCTION

### Option A: Si tu utilises Vercel/Netlify
```bash
# Le déploiement est automatique après le merge
# Attends 2-3 minutes que le build se termine
# Vérifie sur le dashboard que le déploiement est "Success"
```

### Option B: Si tu utilises un serveur avec PM2
```bash
# Sur le serveur:
cd /home/user/webapp
git pull origin main
npm install  # Au cas où
npm run build
pm2 restart all

# Vérifie que l'app tourne:
pm2 status
pm2 logs --lines 50
```

### Option C: Si tu utilises Docker
```bash
# Sur le serveur:
docker-compose down
git pull origin main
docker-compose build
docker-compose up -d
```

### Option D: Si tu utilises un autre système
```bash
# Arrête l'application
# Pull le nouveau code
git pull origin main
# Rebuil
d
npm run build
# Redémarre l'application
```

---

## 🧪 ÉTAPE 3: TESTER AVEC LES LOGS

### 3.1 Entre des médicaments

Dans le formulaire patient, section "Current Medications":
```
metfromin 500mg 2 fois par jour
asprin 100mg le matin
```

Motif: "Renouvellement d'ordonnance"

### 3.2 Regarde les logs serveur

**CHERCHE CETTE LIGNE:**
```
🔍 DEBUG - Raw patient data received:
```

**Tu dois voir:**
```
🔍 DEBUG - Raw patient data received:
   - body.patientData.currentMedications: [ 'metfromin 500mg 2 fois par jour', 'asprin 100mg le matin' ]
   - Type: object
   - Is Array?: true
```

### ✅ SI TU VOIS `Is Array?: true`
**PARFAIT!** Le code marche! Continue au point 3.3

### ❌ SI TU VOIS `Is Array?: false` ou une STRING
**PROBLÈME!** L'ancien code tourne encore. Refais l'étape 2.

### 3.3 Vérifie la réponse OpenAI

**CHERCHE CETTE LIGNE:**
```
💊 CURRENT MEDICATIONS VALIDATED BY AI:
```

**Tu dois voir:**
```
💊 CURRENT MEDICATIONS VALIDATED BY AI: 2
   1. Metformin 500mg - BD (twice daily)
      Original: "metfromin 500mg 2 fois par jour"
      Corrections: Spelling: metfromin→Metformin, Dosology: 2 fois par jour→BD
```

### ✅ SI TU VOIS ÇA
**EXCELLENT!** L'IA a compris et corrigé!

### ❌ SI TU VOIS "NO CURRENT MEDICATIONS VALIDATED"
**PROBLÈME!** L'IA n'a pas retourné les médicaments. Envoie-moi les logs complets.

### 3.4 Vérifie le rapport final

Dans l'interface, regarde le "Professional Report".

**Tu dois voir:**
```
TRAITEMENTS ACTUELS (À CONTINUER):
1. Metformin 500mg
   Posologie: BD (twice daily)
   [Corrections: metfromin → Metformin]
   
2. Aspirin 100mg
   Posologie: OD (morning)
   [Corrections: asprin → Aspirin]
```

### ✅ SI TU VOIS LES 2 MÉDICAMENTS CORRIGÉS
**🎉 SUCCÈS COMPLET! ÇA MARCHE!**

---

## 🐛 SI ÇA NE MARCHE TOUJOURS PAS

### Check 1: Vérifie que le bon code est déployé

```bash
# Sur le serveur:
cd /home/user/webapp
git log --oneline -n 1

# Tu dois voir:
# 0cc7410 debug: Add detailed logging for currentMedications data flow
# OU un commit plus récent du PR #42
```

Si ce n'est PAS ce commit, fais:
```bash
git pull origin main
```

### Check 2: Vérifie les variables d'environnement

```bash
# Sur le serveur:
echo $OPENAI_API_KEY
# Doit afficher: sk-...

# Si vide:
export OPENAI_API_KEY="ta-clé-ici"
```

### Check 3: Regarde TOUS les logs

```bash
# Si PM2:
pm2 logs --lines 100

# Si Docker:
docker-compose logs -f --tail 100

# Si autre:
# Regarde les logs de ton serveur
```

**CHERCHE:**
- "🔍 DEBUG - Raw patient data received"
- "Is Array?: true" ou "Is Array?: false"
- "💊 CURRENT MEDICATIONS VALIDATED BY AI"

**ENVOIE-MOI CES 3 SECTIONS DE LOGS** si ça ne marche pas!

---

## 📝 RÉCAPITULATIF RAPIDE

1. ✅ Merge PR #42
2. ✅ Déploie (rebuild + restart)
3. ✅ Teste avec médicaments
4. ✅ Vérifie les logs:
   - `Is Array?: true` ← Doit être TRUE
   - `CURRENT MEDICATIONS VALIDATED BY AI: 2` ← Doit montrer les médicaments
5. ✅ Vérifie le rapport final

---

## 🆘 AIDE RAPIDE

### Logs à chercher (dans l'ordre):

1. **`🔍 DEBUG - Raw patient data received`**
   - Vérifie: `Is Array?: true`

2. **`📋 Contexte patient préparé`**
   - Vérifie: `Médicaments actuels : 2` (pas 45!)
   - Vérifie: Affiche un array `[...]` (pas une string)

3. **`💊 CURRENT MEDICATIONS VALIDATED BY AI`**
   - Vérifie: Affiche 2 médicaments avec corrections

4. **`✅ COMBINED PRESCRIPTION`**
   - Vérifie: Total de médicaments correct

Si UN SEUL de ces logs est faux, envoie-moi la section complète!

---

**DERNIER COMMIT:** 0cc7410 - debug: Add detailed logging
**PULL REQUEST:** #42 - https://github.com/stefbach/AI-DOCTOR/pull/42

🚀 **UNE FOIS MERGÉ ET DÉPLOYÉ, ÇA VA MARCHER!**
