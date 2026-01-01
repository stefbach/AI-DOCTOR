# 🚨 CORRECTION URGENTE - IBUPROFEN DANS ACS

**Date**: 31 Décembre 2025  
**Gravité**: 🔴 CRITIQUE

---

## ❌ ERREUR MORTELLE DÉTECTÉE

**Cas**: Homme 62 ans, douleur thoracique + irradiation bras gauche  
**Diagnostic**: ACS (Acute Coronary Syndrome)  
**Erreur**: Prescription **Ibuprofen 400mg TDS**

### Pourquoi c'est mortel?
- ⚠️ **+30-50% risque MI**
- ⚠️ **Favorise thrombose**
- ⚠️ **Réduit efficacité aspirine**
- ⚠️ **Aggrave pronostic CV**

---

## ✅ TRAITEMENT CORRECT

### ACS Protocol
1. **Aspirin 300mg** STAT
2. **Ticagrelor 180mg** STAT
3. **Fondaparinux 2.5mg** SC (NSTEMI)
4. **Primary PCI** <120min (STEMI)

### Analgésie
- ✅ **Paracetamol 1g QDS**
- ✅ **Morphine 2.5-5mg IV** (si sévère)
- ❌ **JAMAIS Ibuprofen**

---

## 🔧 CORRECTIONS APPLIQUÉES

### 1. Safety Check intégré (ligne ~340)
```
⚠️🚨 CRITICAL MEDICATION SAFETY CHECK
- cardiac_symptoms_present? → NO NSAIDs!
- gi_bleeding_risk? → NO NSAIDs!
- age >65? → PREFER Paracetamol
```

### 2. Banner Ultra-Visible (ligne ~488)
```
🚫🚨 ABSOLUTE MEDICATION BAN - CARDIAC PATIENTS

⛔ NEVER PRESCRIBE NSAIDs IF:
1. ❌ Chest pain
2. ❌ ACS/MI
3. ❌ Cardiac symptoms
4. ❌ Age >65

✅ SAFE: Paracetamol OR Aspirin+Ticagrelor (if ACS)
```

---

## 📊 RÉSULTAT

| Aspect | Avant | Après |
|--------|-------|-------|
| Safety check | ❌ | ✅ |
| NSAIDs warning | ⚠️ | 🚨 |
| ACS protocol | ⚠️ | ✅ |

**Fichier modifié**: `app/api/openai-diagnosis/route.ts` (~60 lignes)

---

**Repository**: https://github.com/stefbach/AI-DOCTOR  
**Statut**: ✅ **CORRECTION CRITIQUE APPLIQUÉE**

**🚨 SÉCURITÉ PATIENT RENFORCÉE 🚨**
