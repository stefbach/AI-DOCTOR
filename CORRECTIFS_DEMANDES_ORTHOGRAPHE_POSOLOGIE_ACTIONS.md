# 🔧 CORRECTIFS DEMANDÉS : Orthographe, Posologie, Limite Actions IA

**Date** : 31 décembre 2025  
**Priorité** : 🔴 HAUTE  
**Statut** : 📋 EN COURS

---

## 📋 Problèmes Identifiés

### **Problème 1 : Correction Orthographique Automatique Non Désirée**

**Description** :
Le système corrige automatiquement l'orthographe des médicaments :
- Input : `metformine 1/j`
- Output : `Metformin 500mg OD`
- **Problème** : `metformine` → `Metformin` (correction automatique)

**Demande utilisateur** :
> "on ne modifie pas l'orthographe"

---

### **Problème 2 : Ajout Automatique de Posologie Par Défaut**

**Description** :
Le système ajoute automatiquement des doses standards :
- Input : `amlodipine 1/j`
- Output : `Amlodipine 5mg OD`
- **Problème** : Ajout automatique de `5mg` (dose par défaut)

**Demande utilisateur** :
> "on ne propose pas de posologie par défaut"

---

### **Problème 3 : Assistant IA Limité à 2 Actions**

**Description** :
L'Assistant IA trouve 4 modifications mais n'en applique que 2 :
- IA trouve : 4 actions nécessaires
- IA applique : 2 actions (limite système)
- Utilisateur doit : Renouveler la demande 2 fois pour tout intégrer

**Demande utilisateur** :
> "assistant ia est limité à deux propositions pour l'implémentation, on doit renouveler l'action plusieurs fois si il y a plus de deux modifications à intégrer"

---

## 💡 Solutions Proposées

### **Solution 1 : Désactiver Correction Orthographique**

**Fichier** : `app/api/openai-diagnosis/route.ts`

**Option A : Supprimer la Correction dans le Prompt**
```typescript
// AVANT (lignes 480, 497, 514)
"validated_corrections": "Spelling: metformine→Metformin, Dosology: 1/j→OD",

// APRÈS
"validated_corrections": "Dosology: 1/j→OD",
// Garder seulement la conversion de format, pas l'orthographe
```

**Option B : Garder l'Orthographe Originale**
```typescript
// AVANT
Input: "metformine 1/j"
→ Output: { "medication_name": "Metformin 500mg", "dci": "Metformin" }

// APRÈS
Input: "metformine 1/j"
→ Output: { "medication_name": "metformine", "dci": "Metformine" }
// Préserver exactement ce que le médecin a tapé
```

**Recommendation** : **Option B** - Préserver l'orthographe exacte du médecin

---

### **Solution 2 : Désactiver Ajout Automatique de Dose**

**Fichier** : `app/api/openai-diagnosis/route.ts`

**Modification du Prompt**
```typescript
// AVANT (ligne 523)
"- If dose is MISSING, add standard therapeutic dose based on medication"

// APRÈS
"- If dose is MISSING, leave medication name WITHOUT dose"
"- Do NOT add standard doses automatically"
"- PRESERVE exactly what the doctor wrote"
```

**Exemples Modifiés**
```typescript
// AVANT
Input: "amlodipine 1/j"
→ Output: { "medication_name": "Amlodipine 5mg" }

// APRÈS
Input: "amlodipine 1/j"
→ Output: { "medication_name": "amlodipine" }
// Pas d'ajout de dose si non fournie
```

---

### **Solution 3 : Augmenter la Limite d'Actions IA**

**Fichier** : `app/api/tibok-medical-assistant/route.ts`

**Modification du Prompt (ligne 64)**
```typescript
// AVANT
- MAXIMUM 2 ACTIONS per response (NEVER more)

// APRÈS
- MAXIMUM 5 ACTIONS per response (if needed)
```

**Justification** :
- **2 actions** = Utilisateur doit renouveler 2-3 fois ❌
- **5 actions** = Couvre la plupart des cas en une fois ✅
- **Token budget** : Raisonnable avec 5 actions

**Alternative : Mode Batch**
```typescript
// Si l'utilisateur demande beaucoup de modifications
"Si vous détectez plus de 5 actions nécessaires :
1. Générer les 5 premières actions
2. Ajouter un message : '⚠️ 3 actions supplémentaires disponibles, demandez-moi de continuer'
3. L'utilisateur peut répondre 'continuer' pour les actions suivantes"
```

---

## 🔧 Implémentation des Correctifs

### **Correctif 1 : Préserver Orthographe Originale**

**Fichier** : `app/api/openai-diagnosis/route.ts`

**Sections à Modifier** :

1. **Ligne 480** - Exemple metformine
```typescript
// SUPPRIMER la correction orthographique
"validated_corrections": "Dosology: 1/j→OD, Format standardized to UK",
// NE PAS INCLURE "Spelling: metformine→Metformin"
```

2. **Ligne 1007** - Map de corrections DCI
```typescript
// SUPPRIMER ou COMMENTER
// 'metformine': 'Metformine',
// OU garder l'orthographe française si c'est ce que le médecin veut
```

3. **Ligne 4478** - Fallback DCI corrections
```typescript
// SUPPRIMER les corrections orthographiques
// 'metformin': 'Metformin', 'metfromin': 'Metformin', 'metformine': 'Metformin',
// OU ne corriger QUE les fautes de frappe évidentes, pas les variations FR/EN
```

---

### **Correctif 2 : Ne Pas Ajouter Dose Par Défaut**

**Fichier** : `app/api/openai-diagnosis/route.ts`

**Ligne 523** - Règle d'ajout de dose
```typescript
// AVANT
"- If dose is MISSING, add standard therapeutic dose based on medication"

// APRÈS
"- If dose is MISSING, DO NOT add any dose"
"- Preserve the medication name exactly as provided by the doctor"
"- ONLY include dose if explicitly provided in the original input"
```

**Exemples à Modifier** (lignes 475-516)
```typescript
// AVANT
Input: "metformine 1/j"
→ { "medication_name": "Metformin 500mg" }

// APRÈS
Input: "metformine 1/j"
→ { "medication_name": "metformine" }
// Pas de dose si non fournie

Input: "metformine 500mg 1/j"
→ { "medication_name": "metformine 500mg" }
// Dose incluse car fournie
```

---

### **Correctif 3 : Augmenter Limite Actions IA**

**Fichier** : `app/api/tibok-medical-assistant/route.ts`

**Ligne 64** - Token limit
```typescript
// AVANT
- MAXIMUM 2 ACTIONS per response (NEVER more)

// APRÈS
- MAXIMUM 5 ACTIONS per response (if clinically necessary)
- Prioritize most important actions first
- If more than 5 actions needed, inform user and wait for "continue" request
```

**Ligne 414** - Documentation
```typescript
// AVANT
1. **MAXIMUM 2 ACTIONS** per response (to avoid truncated JSON)

// APRÈS
1. **MAXIMUM 5 ACTIONS** per response (balanced between completeness and token budget)
```

---

## 📊 Impact des Modifications

### **Correctif 1 : Orthographe**

| Aspect | Avant | Après |
|--------|-------|-------|
| Input | `metformine 1/j` | `metformine 1/j` |
| Output | `Metformin 500mg OD` | `metformine OD` |
| Correction | ✅ Automatique | ❌ Aucune |
| Respect saisie médecin | ❌ Non | ✅ Oui |

---

### **Correctif 2 : Posologie**

| Aspect | Avant | Après |
|--------|-------|-------|
| Input | `amlodipine 1/j` | `amlodipine 1/j` |
| Output | `Amlodipine 5mg OD` | `amlodipine OD` |
| Ajout dose | ✅ Automatique (5mg) | ❌ Aucun |
| Médecin décide | ❌ Non | ✅ Oui |

---

### **Correctif 3 : Limite Actions**

| Aspect | Avant | Après |
|--------|-------|-------|
| Actions trouvées | 4 | 4 |
| Actions appliquées | 2 | 4-5 |
| Demandes nécessaires | 2-3 fois | 1 fois |
| Expérience utilisateur | ⚠️ Fastidieux | ✅ Fluide |

---

## ⚠️ Considérations Importantes

### **Pour Correctif 1 & 2 : Responsabilité Médicale**

**Avantage** :
- ✅ Médecin garde contrôle total sur orthographe et dosage
- ✅ Pas de modification non désirée
- ✅ Respect de la saisie originale

**Inconvénient** :
- ⚠️ Risque de fautes de frappe non détectées
- ⚠️ Pas d'aide pour doses standards
- ⚠️ Médecin doit tout vérifier manuellement

**Recommandation** :
- Désactiver corrections automatiques comme demandé
- Mais ajouter un **warning visuel** pour alerter le médecin :
  ```
  ⚠️ Vérifiez : "metformine" (orthographe non standard détectée)
  ℹ️ Dose manquante : considérez d'ajouter la posologie
  ```

---

### **Pour Correctif 3 : Token Budget**

**Calcul du Budget** :
- 2 actions = ~500 tokens
- 5 actions = ~1250 tokens
- Limite GPT-4 = 8000 tokens output

**Conclusion** : 5 actions = **SAFE** ✅

---

## 🚀 Plan d'Implémentation

### **Ordre Recommandé**

1. **Correctif 3** (Limite actions) - ⭐ Priorité #1
   - Impact : Amélioration UX immédiate
   - Risque : Faible
   - Temps : 10 minutes

2. **Correctif 1** (Orthographe) - ⭐ Priorité #2
   - Impact : Respect de la saisie médecin
   - Risque : Moyen (fautes non corrigées)
   - Temps : 20 minutes

3. **Correctif 2** (Posologie) - ⭐ Priorité #3
   - Impact : Médecin contrôle dosages
   - Risque : Moyen (doses manquantes)
   - Temps : 20 minutes

**Temps total estimé** : ~1 heure

---

## 📋 Checklist de Validation

### **Après Correctif 1**
- [ ] Input `metformine 1/j` → Output `metformine OD` (pas `Metformin`)
- [ ] Input `paracétamol 3/j` → Output `paracétamol TDS` (pas `Paracetamol`)
- [ ] Orthographe française préservée
- [ ] Fautes de frappe évidentes toujours corrigées (optionnel)

### **Après Correctif 2**
- [ ] Input `amlodipine 1/j` → Output `amlodipine OD` (pas de dose)
- [ ] Input `amlodipine 5mg 1/j` → Output `amlodipine 5mg OD` (dose préservée)
- [ ] Aucune dose ajoutée si non fournie
- [ ] Warning affiché pour doses manquantes (optionnel)

### **Après Correctif 3**
- [ ] IA génère jusqu'à 5 actions
- [ ] Test : demander 4 modifications → 4 actions générées
- [ ] Test : demander 6 modifications → 5 actions + message "continuer"
- [ ] Pas de JSON tronqué

---

## 🎯 Résumé des Changements

| Correctif | Fichier | Lignes | Changement | Impact |
|-----------|---------|--------|------------|--------|
| **1. Orthographe** | `openai-diagnosis/route.ts` | 480, 1007, 4478 | Supprimer corrections | Préserve saisie |
| **2. Posologie** | `openai-diagnosis/route.ts` | 523, 475-516 | Ne pas ajouter dose | Médecin décide |
| **3. Limite Actions** | `tibok-medical-assistant/route.ts` | 64, 414 | 2 → 5 actions | Moins de répétitions |

---

## 🤔 Questions pour Validation

### **Question 1 : Orthographe**
Voulez-vous :
- **Option A** : Aucune correction (même fautes évidentes) ?
- **Option B** : Corriger fautes évidentes (`metfromin` → `metformin`) mais pas FR/EN ?

### **Question 2 : Posologie**
Voulez-vous :
- **Option A** : Jamais ajouter de dose ?
- **Option B** : Suggérer dose mais ne pas l'ajouter automatiquement ?

### **Question 3 : Limite Actions**
Voulez-vous :
- **Option A** : 5 actions maximum ?
- **Option B** : 10 actions maximum ?
- **Option C** : Aucune limite (risque JSON tronqué) ?

---

*Document créé le 31 décembre 2025*  
*Status: 📋 DEMANDE DE CLARIFICATION*  
*Repository: https://github.com/stefbach/AI-DOCTOR*
