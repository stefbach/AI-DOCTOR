# 📘 RUNBOOK — Bulk Seed AI-DOCTOR RAG

**Branche** : `claude/medical-assistant-transparency-dv5S9`
**Phase** : 1 — 5 sources prioritaires
**Estimé** : 2-4 h pour exécution complète, ~10-30 $ d'embeddings OpenAI

---

## 🎯 Objectif

Constituer la base initiale de guidelines médicaux dans Supabase à partir des
5 sources prioritaires :

1. **FDA Drug Safety Alerts** → table `drug_safety_alerts`
2. **WHO** (international) → table `medical_guidelines`
3. **HAS** (France) → table `medical_guidelines`
4. **CDC** (USA) → table `medical_guidelines`
5. **NICE** (UK) → table `medical_guidelines` (avec fallback PDF si bloqué)

---

## ✅ Pré-requis

### Variables d'environnement

Toutes ces variables doivent être définies avant l'exécution :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# OpenAI
OPENAI_API_KEY=sk-proj-<your-key>

# RAG runtime feature flags
RAG_ENABLED=true
RAG_MIN_SIMILARITY=0.65
RAG_TOP_K=5
RAG_REASONING_EFFORT=medium
FEATURE_SAFETY_ALERTS=true
FEATURE_RAG_TRACE=true

# Webhook secret (pour future intégration n8n)
N8N_WEBHOOK_SECRET=<openssl rand -hex 32>

# Site URL (pour webhook callback)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Dépendances npm

```bash
npm install rss-parser pdf-parse cheerio resend zod
npm install -D @types/pdf-parse tsx
```

---

## 🔢 Ordre d'exécution

### Étape 1 — Appliquer la migration Supabase

```bash
# Auto-apply (recommandé)
npx tsx scripts/apply-rag-migration.ts

# Si exec_sql RPC non disponible, fallback Supabase CLI
supabase db push
# OU coller manuellement le SQL dans Dashboard → SQL Editor
```

**Vérification** :
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'medical_guidelines','drug_safety_alerts','guideline_update_log',
    'consultation_rag_trace','guideline_sources','guideline_ingestion_runs',
    'guideline_failed_documents'
  );
-- Doit retourner 7 lignes

SELECT extname FROM pg_extension WHERE extname = 'vector';
-- Doit retourner 1 ligne

SELECT count(*) FROM guideline_sources;
-- Doit retourner 16 (FDA + 15 guideline sources)
```

### Étape 2 — Test de connectivité (dry-run)

Avant d'engager le coût OpenAI, on vérifie que les flux RSS répondent :

```bash
npx tsx scripts/bulk-seed/index.ts --dry-run
```

**Résultat attendu** : tableau récapitulatif indiquant `dry_run` pour chaque source,
sans consommation OpenAI. Les sources injoignables apparaissent avec `failed`.

### Étape 3 — Exécution progressive (recommandé)

#### 3.1 — Source par source pour valider

```bash
# FDA d'abord (le plus critique, le plus rapide)
npx tsx scripts/bulk-seed/index.ts --only=FDA --max=20

# Vérifier le résultat
psql ... -c "SELECT count(*) FROM drug_safety_alerts WHERE active=true;"
```

```bash
# WHO
npx tsx scripts/bulk-seed/index.ts --only=WHO --max=10

# HAS
npx tsx scripts/bulk-seed/index.ts --only=HAS --max=10

# CDC
npx tsx scripts/bulk-seed/index.ts --only=CDC --max=10

# NICE (peut échouer → fallback automatique avec liste à ingérer manuellement)
npx tsx scripts/bulk-seed/index.ts --only=NICE
```

#### 3.2 — Tout en un coup (si confiant après tests)

```bash
npx tsx scripts/bulk-seed/index.ts --max=30
```

**Durée estimée** : 30-90 minutes selon nombre d'items et latence OpenAI.

### Étape 4 — Si NICE bloqué : ingestion manuelle des PDFs prioritaires

Le script `nice-fallback.ts` affichera la liste des 13 guidelines NICE prioritaires
si l'accès automatique échoue.

Procédure manuelle :

```bash
# 1. Télécharger les PDFs depuis nice.org.uk dans ./guidelines/nice/
mkdir -p guidelines/nice
# (téléchargement manuel via navigateur, ou wget si non bloqué)

# 2. Ingérer chaque PDF
npx tsx scripts/bulk-seed/sources/nice-manual.ts \
  ./guidelines/nice/ng185.pdf NG185 "Acute coronary syndromes"

npx tsx scripts/bulk-seed/sources/nice-manual.ts \
  ./guidelines/nice/ng128.pdf NG128 "Stroke and TIA in over 16s"

# ... répéter pour les 13 guidelines listés
```

### Étape 5 — Validation médicale

Tous les chunks ingérés sont en `status = 'pending_review'`. Un médecin doit
les valider avant qu'ils soient utilisés en consultation.

**Tableau de bord** :
```sql
-- Vue d'ensemble
SELECT source, status, count(DISTINCT guideline_code) AS guidelines, count(*) AS chunks
FROM medical_guidelines
GROUP BY source, status
ORDER BY source, status;

-- Lister les guidelines en attente
SELECT id, source, guideline_code, title, created_at
FROM medical_guidelines
WHERE status = 'pending_review'
ORDER BY source, guideline_code, chunk_index
LIMIT 50;
```

**Validation par lot** (après revue manuelle des contenus) :
```sql
-- Approuver un guideline complet
UPDATE medical_guidelines
SET status = 'active', validated_by = 'dr.example@x.com', validated_at = NOW()
WHERE source = 'NICE' AND guideline_code = 'NG185' AND status = 'pending_review';

-- Approuver tous les guidelines d'une source en une fois (à utiliser avec prudence)
UPDATE medical_guidelines
SET status = 'active', validated_by = 'bulk-validation@x.com', validated_at = NOW()
WHERE source = 'WHO' AND status = 'pending_review';
```

---

## 📊 Monitoring de l'exécution

### Pendant l'exécution

```sql
-- Runs en cours
SELECT source_code, started_at, items_fetched, items_new, items_failed, status
FROM guideline_ingestion_runs
WHERE started_at > NOW() - INTERVAL '1 hour'
ORDER BY started_at DESC;
```

### Après l'exécution

```sql
-- Statistiques par source
SELECT
  source_code,
  status,
  duration_ms / 1000.0 AS duration_s,
  items_fetched,
  items_new,
  items_failed,
  chunks_created,
  estimated_cost_usd
FROM guideline_ingestion_runs
WHERE started_at > NOW() - INTERVAL '1 day'
ORDER BY started_at DESC;

-- Documents échoués (à reprendre)
SELECT source_code, document_url, error_type, error_message, retry_count
FROM guideline_failed_documents
WHERE resolved = FALSE
ORDER BY first_failed_at DESC;
```

---

## 🔄 Retry des documents échoués

Pour réessayer manuellement les documents qui ont échoué :

```bash
# (à implémenter en Phase 2 - script de retry)
npx tsx scripts/bulk-seed/retry-failed.ts
```

En attendant, retry manuel :
```sql
SELECT * FROM guideline_failed_documents
WHERE resolved = FALSE AND retry_count < 5;
```

Puis re-tenter l'ingestion via le script NICE manuel ou en relançant la source
correspondante.

---

## 💰 Coût estimé

Hypothèses pour Phase 1 complète (~150 guidelines × 30 chunks moyens = 4500 chunks) :

| Poste | Calcul | Coût |
|---|---|---|
| Embeddings (text-embedding-3-small) | 4500 chunks × 800 tokens × $0.02/1M | ~$0.07 |
| AI extraction métadonnées (gpt-5.4) | 150 docs × 1500 tokens × $5/1M | ~$1.13 |
| **Total Phase 1** | | **~$1.50-5** |

**Bien moindre que prévu** — les modèles d'embeddings sont très bon marché.

---

## ⚠️ Points d'attention

### NICE potentiellement bloqué

Le script `nice-fallback.ts` essaie 3 stratégies :
1. RSS officiel (préférée)
2. Sitemap public (TODO)
3. Liste manuelle (13 guidelines prioritaires)

Si vos tests confirment l'accès, retirer le fallback et utiliser le pipeline standard.

### Limitation `text-embedding-3-small`

Les chunks sont tronqués à 8000 caractères avant embedding. C'est la limite
standard du modèle (8191 tokens). Pour des chunks plus longs, downgrade au
chunking ~500 mots dans `helpers.ts`.

### Validation humaine obligatoire

**Aucun guideline ne doit être marqué `status = 'active'` automatiquement.**
La validation par un médecin référent est obligatoire pour la conformité
médico-légale.

### Anonymisation patient

Le runtime RAG (`/lib/rag/medical-rag.ts`) reçoit le contexte clinique du
patient. Vérifier que la route `/app/api/openai-diagnosis/route.ts` anonymise
bien les données avant de les passer au RAG.

---

## 🚀 Phase 2 (à venir)

Une fois Phase 1 validée et opérationnelle :
1. Créer les 15 workflows n8n pour mises à jour continues
2. Brancher les webhooks `/api/webhook/n8n/rag-ingest` et `/api/webhook/n8n/safety-alert`
3. Configurer les alertes Slack/Email
4. Étendre aux 10 sources Phase 2 (ESC, AHA, ADA, IDSA, KDIGO, GOLD, GINA, EASL, ERS, USPSTF, ECDC)

---

## 🆘 En cas de problème

| Symptôme | Diagnostic | Action |
|---|---|---|
| `Missing required env vars` | Variables non chargées | `source .env.local` ou exporter manuellement |
| `Feed unreachable: HTTP 403` | IP bloquée par la source | NICE notamment — utiliser nice-manual.ts |
| `OpenAI rate limit` | Trop de requêtes | Réduire `--max` ou attendre 1 min |
| `Insert failed: duplicate key` | Guideline déjà ingéré | Normal — détection de duplicat fonctionne |
| `pgvector extension not found` | Migration non appliquée | Étape 1 |
| `Embedding length 1536 mismatch` | Mauvais modèle | Vérifier `text-embedding-3-small` |

**Logs détaillés** : tous les runs sont loggés dans `guideline_ingestion_runs`.
**Documents échoués** : voir `guideline_failed_documents`.
