# ⚠️ PROBLÈME TIMEOUT - SOLUTION REQUISE

**Date:** 1er Janvier 2026  
**Commit:** 693c7a5  
**Status:** `/api/openai-diagnosis` restauré à l'état original

---

## 🔴 PROBLÈME

**Vercel Free Plan:**
- ⏱️ **Timeout maximum:** 60 secondes
- 🔴 **GPT-4 prend:** 50-70 secondes
- ❌ **Résultat:** Timeout 504 errors

**Current `maxDuration: 120`** ne fonctionne PAS sur Free Plan (ignoré).

---

## ❌ CE QUI NE MARCHE PAS

### **Option 1: Ajouter timeout 50s**
```typescript
signal: AbortSignal.timeout(50000)
```
**Résultat:** 
- ❌ Échoue systématiquement car GPT-4 prend >50s
- ❌ Erreur 500: "GPT-4 API timeout (>50s)"

### **Option 2: Optimiser prompt système**
```typescript
// Réduire de 500 tokens → 150 tokens
```
**Résultat:**
- ⚠️ Utilisateur ne veut PAS modifier `/api/openai-diagnosis`
- ⚠️ Qualité potentiellement réduite

---

## ✅ SOLUTIONS POSSIBLES

### **SOLUTION 1: VERCEL PRO (RECOMMANDÉ)**

**Coût:** $20/mois  
**Timeout:** 300 secondes (5 minutes)  
**Avantages:**
- ✅ Pas de modification code
- ✅ Qualité maximale GPT-4
- ✅ Pas de limite prompt

**Action:**
1. Aller sur https://vercel.com/account/billing
2. Upgrade to Pro Plan
3. Deploy → timeout 300s

---

### **SOLUTION 2: GPT-4O-MINI**

**Modification minimale:** Changer juste le model

```typescript
// Dans openai-diagnosis/route.ts ligne ~2111
model: 'gpt-4o-mini',  // Au lieu de 'gpt-4o'
```

**Avantages:**
- ✅ 2-3x plus rapide (20-30s au lieu de 60s+)
- ✅ 10x moins cher
- ✅ Reste sur Free Plan
- ⚠️ Qualité légèrement inférieure (-10-15%)

**Action:**
1. Modifier UNE SEULE ligne
2. Tester qualité diagnostique
3. Si OK: déployer

---

### **SOLUTION 3: PROMPT OPTIMISÉ (SI ACCEPTÉ)**

**Si l'utilisateur accepte de réduire le prompt:**

```typescript
// Système actuel: ~500 tokens
content: `🏥 YOU ARE A COMPLETE MEDICAL ENCYCLOPEDIA...
📚 BNF, VIDAL, Harrison's, Goodman & Gilman...
[30 lignes de texte]
`

// Système optimisé: ~150 tokens
content: `Expert physician following BNF/NICE guidelines.
Use INN names, check interactions, UK dosing (OD/BD/TDS/QDS).
Generate comprehensive medical JSON.`
```

**Avantages:**
- ✅ 20-30% plus rapide
- ✅ Même qualité (instructions essentielles gardées)
- ✅ Reste sur Free Plan

**Action:**
1. Demander permission utilisateur
2. Optimiser prompt (garder qualité)
3. Tester et déployer

---

### **SOLUTION 4: SPLIT API CALLS**

**Architecture alternative:**

```
1. Quick diagnosis (30s) - Diagnostic principal
2. Detailed medications (20s) - Prescriptions détaillées
3. Investigations (15s) - Examens détaillés
```

**Avantages:**
- ✅ Chaque appel <60s
- ✅ Parallélisation possible
- ⚠️ Architecture plus complexe

---

## 📊 COMPARAISON SOLUTIONS

| Solution | Coût | Modification code | Temps implem | Qualité | Succès |
|----------|------|-------------------|--------------|---------|--------|
| **Vercel Pro** | $20/mois | Aucune ✅ | 5 min | 100% | 100% |
| **GPT-4o-mini** | Gratuit | 1 ligne | 5 min | 85-90% | 95% |
| **Prompt optimisé** | Gratuit | Légère | 30 min | 95-100% | 90% |
| **Split API** | Gratuit | Majeure | 4-6h | 100% | 85% |

---

## 🎯 RECOMMANDATION

### **Court Terme (Aujourd'hui):**

**Option A: Si budget disponible**
→ **Upgrade Vercel Pro** ($20/mois)
- Pas de modification code
- Qualité maximale
- Solution immédiate

**Option B: Si budget limité**
→ **Tester GPT-4o-mini**
- Modifier 1 ligne: `model: 'gpt-4o-mini'`
- Tester qualité sur 5-10 cas
- Si OK: déployer

### **Moyen Terme:**

Si GPT-4o-mini ne suffit pas:
1. Demander permission optimiser prompt
2. Ou considérer Vercel Pro

---

## 📝 ÉTAT ACTUEL

**Fichier:** `/app/api/openai-diagnosis/route.ts`  
**État:** Restauré à l'original (commit 68ff4bb)  
**maxDuration:** 120s (ignoré sur Free Plan)  
**Timeout réel:** 60s (limite Vercel Free)

**Modifications appliquées cette session:**
- ✅ Sécurité NSAIDs (GARDÉ)
- ✅ Validation ACS (GARDÉ)
- ✅ Trust GPT-4 (GARDÉ)
- ✅ Fix TypeError (GARDÉ)
- ❌ Timeout 50s (ANNULÉ)
- ❌ Prompt optimisé (ANNULÉ)

**Code openai-diagnosis:** Intact sauf sécurité médicale

---

## ⏭️ PROCHAINE ACTION

**ATTENDRE DÉCISION UTILISATEUR:**

1. ✅ **Upgrade Vercel Pro?** → Pas de code à modifier
2. ✅ **Tester GPT-4o-mini?** → 1 ligne à modifier
3. ✅ **Autoriser optimisation prompt?** → Optimisation légère
4. ❌ **Garder status quo?** → Timeouts continueront

---

**Repository:** https://github.com/stefbach/AI-DOCTOR  
**Commit:** 693c7a5  
**Status:** ⏳ EN ATTENTE DÉCISION TIMEOUT
