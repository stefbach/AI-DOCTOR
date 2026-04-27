# 📘 RUNBOOK — Constitution complète de la base de guidelines

**Branche** : `claude/medical-assistant-transparency-dv5S9`
**Couverture** : **16 sources** (5 RSS + 1 RSS+RSS + 10 sociétés HTML)
**Estimation totale** : 30-90 minutes, ~$2-10 d'embeddings OpenAI

---

## 🎯 Philosophie

L'objectif est de constituer une **base de connaissances médicale complète et vivante**
en SQL, source par source, à partir des organisations médicales officielles
mondiales. Cette base alimente le RAG runtime qui enrichit GPT-5.4 à chaque
consultation.

---

## 📊 Cartographie des 16 sources

### Phase 1 — RSS / API publiques (6 sources)

| # | Code | Méthode | Fréquence | Volume attendu |
|---|------|---------|-----------|----------------|
| 1 | **FDA** | RSS | horaire | drug_safety_alerts |
| 2 | **WHO** | RSS | hebdo | medical_guidelines (en) |
| 3 | **HAS** | RSS | quotidien | medical_guidelines (fr) |
| 4 | **CDC** | RSS | quotidien | medical_guidelines (en) |
| 5 | **NICE** | RSS + fallback | quotidien | medical_guidelines (en) |
| 6 | **ECDC** | RSS | hebdo | medical_guidelines (en) |

### Phase 2 — Sociétés savantes / scraping HTML (10 sources)

| # | Code | Spécialité | Fréquence | Volume attendu |
|---|------|-----------|-----------|----------------|
| 7 | **ESC** | Cardiologie | mensuel | ~25 guidelines |
| 8 | **AHA** | Cardiologie | mensuel | ~20 statements |
| 9 | **ADA** | Diabétologie | annuel | ~15 articles |
| 10 | **IDSA** | Infectiologie | mensuel | ~30 protocoles |
| 11 | **KDIGO** | Néphrologie | mensuel | ~15 guidelines |
| 12 | **GOLD** | BPCO | annuel | 1 rapport principal |
| 13 | **GINA** | Asthme | annuel | 1 rapport principal |
| 14 | **EASL** | Hépatologie | mensuel | ~20 guidelines |
| 15 | **ERS** | Pneumologie | mensuel | ~20 guidelines |
| 16 | **USPSTF** | Prévention | mensuel | ~30 recommandations |

**Total estimé** : 200-300 guidelines, 5000-15000 chunks vectorisés.

---

## ✅ Pré-requis

### 1. Variables d'environnement

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=sk-proj-<your-key>
RAG_ENABLED=true
SEED_MAX_ITEMS=30                    # cap items per source
```

### 2. Dépendances npm

```bash
npm install
# rss-parser, pdf-parse, cheerio, resend, tsx, zod (déjà ajoutés au package.json)
```

### 3. Migration Supabase appliquée

```bash
npm run rag:migrate
```

---

## 🚀 Mode opératoire (4 étapes)

### Étape 1 — Test connectivité (gratuit, 30 secondes)

Avant tout coût OpenAI, savoir quelles sources sont joignables depuis votre réseau :

```bash
npm run rag:test
```

**Sortie** : tableau des 16 sources avec ✅/⚠️/❌. Vous saurez immédiatement quelles
sources nécessiteront un fallback PDF manuel.

### Étape 2 — Phase 1 (RSS, ~5 min)

Lancement progressif (recommandé) :

```bash
npm run rag:seed:fda      # 1-2 min, alertes médicaments
npm run rag:seed:who      # 2-3 min, guidelines WHO
npm run rag:seed:has      # 2-3 min, guidelines HAS (FR)
npm run rag:seed:cdc      # 2-3 min, MMWR + recommandations CDC
npm run rag:seed:nice     # 3-5 min, NICE (avec fallback automatique)
npm run rag:seed:ecdc     # 1-2 min
```

Ou tout en un coup :

```bash
npm run rag:seed:phase1
```

### Étape 3 — Phase 2 (sociétés savantes, ~30-60 min)

Les 10 sociétés savantes nécessitent du scraping HTML qui peut être plus
fragile. Recommandation : tester source par source.

```bash
npm run rag:seed:esc      # Cardiologie EU
npm run rag:seed:aha      # Cardiologie US
npm run rag:seed:ada      # Diabétologie US
npm run rag:seed:idsa     # Infectiologie US
npm run rag:seed:kdigo    # Néphrologie INT
npm run rag:seed:gold     # BPCO INT
npm run rag:seed:gina     # Asthme INT
npm run rag:seed:easl     # Hépatologie EU
npm run rag:seed:ers      # Pneumologie EU
npm run rag:seed:uspstf   # Prévention US
```

Ou tout en un coup :

```bash
npm run rag:seed:phase2
```

### Étape 4 — Tout en une commande (Phase 1 + Phase 2)

```bash
npm run rag:seed
# Lance les 16 sources séquentiellement, ~30-90 min total
```

---

## 🔧 En cas de blocage d'une source

### Symptômes typiques

- HTTP 403 / 401 : géo-restriction ou paywall (ESC complet, ADA full text)
- HTTP 404 : URL changée → mettre à jour `html-source-configs.ts`
- 0 items extraits : sélecteur CSS obsolète → idem
- Timeout : feed lent → re-essayer plus tard
- Anti-bot : Cloudflare etc. → fallback PDF manuel

### Fallback : upload manuel de PDFs

Pour toute source bloquée, télécharger le PDF officiel depuis votre navigateur
et utiliser la commande générique :

```bash
npm run rag:upload-pdf -- <source> <pdf-path> <code> "<title>" [url]
```

**Exemples** :

```bash
# NICE NG185
npm run rag:upload-pdf -- NICE ./guidelines/ng185.pdf NG185 \
  "Acute coronary syndromes" https://www.nice.org.uk/guidance/ng185

# ESC 2024 STEMI
npm run rag:upload-pdf -- ESC ./guidelines/esc-stemi-2024.pdf ESC-STEMI-2024 \
  "ESC 2024 Guidelines for STEMI" https://www.escardio.org/...

# ADA Standards of Care 2026
npm run rag:upload-pdf -- ADA ./guidelines/ada-soc-2026.pdf ADA-2026-SOC \
  "Standards of Medical Care in Diabetes 2026"
```

---

## 📊 Vérification après seed

### Tableau de bord SQL

```sql
-- Vue d'ensemble
SELECT
  source,
  status,
  count(DISTINCT guideline_code) AS unique_guidelines,
  count(*) AS total_chunks
FROM medical_guidelines
GROUP BY source, status
ORDER BY source, status;
```

### Statistiques par run

```sql
SELECT
  source_code,
  status,
  duration_ms / 1000 AS duration_s,
  items_fetched,
  items_new,
  items_failed,
  chunks_created,
  estimated_cost_usd
FROM guideline_ingestion_runs
WHERE started_at > NOW() - INTERVAL '1 day'
ORDER BY started_at DESC;
```

### Alertes de sécurité actives

```sql
SELECT count(*), source FROM drug_safety_alerts
WHERE active = true
GROUP BY source;
```

---

## ✅ Validation médicale (étape obligatoire)

Tous les chunks ingérés ont `status = 'pending_review'`. Un médecin doit les
valider avant qu'ils soient utilisés en consultation.

**Interface** : `https://your-app.vercel.app/admin/guidelines`

**Validation par lot** :

```sql
-- Approuver tous les guidelines d'une source d'un coup
UPDATE medical_guidelines
SET status = 'active',
    validated_by = 'dr.referent@x.com',
    validated_at = NOW()
WHERE source = 'NICE' AND status = 'pending_review';
```

---

## 💰 Coût total attendu

| Phase | Sources | Chunks estimés | Coût embeddings | Coût AI metadata | Total |
|-------|---------|---------------|-----------------|------------------|-------|
| Phase 1 | 6 RSS | ~3000 | $0.06 | $0.50 | **~$0.60** |
| Phase 2 | 10 HTML | ~5000 | $0.10 | $1.00 | **~$1.10** |
| **TOTAL** | **16** | **~8000** | **$0.16** | **$1.50** | **~$1.70** |

Coût récurrent (n8n continu) : ~$5-15/mois pour mises à jour automatiques.

---

## 🆘 Troubleshooting

| Symptôme | Cause probable | Fix |
|----------|---------------|-----|
| `Missing required env vars` | Variables non chargées | `source .env.local` |
| `Feed unreachable: HTTP 403` | Anti-bot / géo | Fallback PDF manuel |
| `OpenAI rate limit` | Trop de requêtes | Lancer source par source |
| `Insert failed: duplicate key` | Déjà ingéré | Normal — détection OK |
| `pgvector extension not found` | Migration non appliquée | `npm run rag:migrate` |
| `0 items extracted` | Sélecteur CSS obsolète | Inspecter site, MAJ html-source-configs.ts |
| HTML scraper crash | Site redesign | Idem |

---

## 🔄 Maintenance continue (après seed initial)

Une fois la base initiale constituée, n8n prend le relais pour les mises à jour :

1. Importer les workflows depuis `n8n-workflows/` (voir SETUP.md)
2. Activer les 8 workflows dans l'ordre indiqué
3. Le master agent `master-03-health-check.json` surveille la fraîcheur de chaque source

---

## 📊 Commandes npm récapitulatif

```bash
# Connectivité
npm run rag:test                    # test sans coût

# Migration
npm run rag:migrate                 # applique le schéma

# Seed Phase 1 (RSS)
npm run rag:seed:phase1             # 6 sources d'un coup
npm run rag:seed:fda
npm run rag:seed:who
npm run rag:seed:has
npm run rag:seed:cdc
npm run rag:seed:nice
npm run rag:seed:ecdc

# Seed Phase 2 (sociétés HTML)
npm run rag:seed:phase2             # 10 sources d'un coup
npm run rag:seed:esc
npm run rag:seed:aha
npm run rag:seed:ada
npm run rag:seed:idsa
npm run rag:seed:kdigo
npm run rag:seed:gold
npm run rag:seed:gina
npm run rag:seed:easl
npm run rag:seed:ers
npm run rag:seed:uspstf

# Seed complet
npm run rag:seed                    # tout en un coup
npm run rag:seed:dry                # connectivité uniquement, no cost

# Fallback manuel PDF
npm run rag:upload-pdf -- <source> <pdf> <code> "<title>" [url]
```

---

## 🎯 Status final attendu

Après exécution complète et validation médicale :

```
✅ 16 sources actives
✅ 200-300 guidelines indexés
✅ 5000-15000 chunks vectorisés
✅ Recherche sémantique opérationnelle
✅ RAG runtime branché dans openai-diagnosis
✅ n8n workflows actifs pour mises à jour continues
✅ Audit trail médico-légal (10 ans)
```

**Système RAG médical pleinement opérationnel.**
