# 🚀 Production Deployment — Ingestion Supabase

**État au moment du déploiement :**
- 984 guidelines extraits dans `tibok-rag-collector/extracted/` (126 fichiers JSON)
- 66.5 MB de texte chunké
- Tous les outils de bridge sont prêts dans `scripts/bulk-seed/`

---

## ⚡ Procédure express (3 commandes)

```bash
# 0. Pré-requis : .env.local avec NEXT_PUBLIC_SUPABASE_URL,
#    SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
npm install

# 1. Appliquer les migrations Supabase (création des 7 tables RAG)
npm run rag:migrate

# 2. Ingérer les 984 guidelines dans pgvector (~10-15 min, ~$0.22 OpenAI)
npm run rag:ingest-extracted ALL
```

C'est tout. À l'issue, votre Supabase contient :
- **984 lignes "guideline"** dans `medical_guidelines`
- **~12 000 chunks vectorisés** prêts pour la recherche sémantique
- **Status `pending_review`** pour validation médicale humaine

---

## 📋 Étapes détaillées

### Étape 0 — Variables d'environnement

Dans `.env.local` (ou Vercel env) :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>     # OBLIGATOIRE (RLS bypass)
OPENAI_API_KEY=sk-proj-...                        # pour les embeddings

# Feature flags du runtime RAG
RAG_ENABLED=true
RAG_MIN_SIMILARITY=0.65
RAG_TOP_K=5
RAG_REASONING_EFFORT=medium
FEATURE_SAFETY_ALERTS=true
FEATURE_RAG_TRACE=true

# Webhook (pour n8n plus tard)
N8N_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Site URL pour redirections webhook
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Étape 1 — Migration Supabase

```bash
npm run rag:migrate
```

Crée :
- `medical_guidelines` — table principale avec embedding VECTOR(1536)
- `drug_safety_alerts` — alertes FDA/EMA
- `guideline_update_log` — audit trail
- `consultation_rag_trace` — traçabilité 10 ans
- `guideline_sources` — registre des 16 sources principales (étendu)
- `guideline_ingestion_runs` — log des jobs
- `guideline_failed_documents` — retry queue
- 2 fonctions RPC (`match_guidelines`, `check_drug_alerts`)
- HNSW index pgvector

**2 migrations seront appliquées** :
1. `20260427000000_create_rag_system.sql` — Tables initiales
2. `20260503000000_extend_source_check.sql` — CHECK étendu pour 126 sources

### Étape 2 — Test connectivité (optionnel)

```bash
npm run rag:ingest-extracted ALL -- --dry-run
# Variant via env :
DRY_RUN=true npm run rag:ingest-extracted ALL
```

Liste les 126 fichiers et affiche `dry-run` pour chacun, sans coût.

### Étape 3 — Ingestion complète

```bash
npm run rag:ingest-extracted ALL
```

Pour chaque fichier `tibok-rag-collector/extracted/<SOURCE>.json` :
1. Charge le JSON
2. Pour chaque document :
   - Skip si `RESUME=true` et déjà ingéré (vérification SHA-256)
   - Génère les embeddings OpenAI (batches de 100)
   - Insère dans `medical_guidelines` avec status `pending_review`
   - Préserve toutes les métadonnées (license, commercial_use, pmcid, ...)

**Durée estimée** : 10-15 minutes (parallélisable jusqu'à 100 chunks par batch).
**Coût estimé** : ~$0.22 (text-embedding-3-small @ $0.02/M tokens × ~11M tokens).

### Étape 3b — Ingestion par source (alternative pour granularité)

Si vous préférez ingérer source par source (utile pour debug ou validation progressive) :

```bash
# Sources principales d'abord (haute autorité)
npm run rag:ingest-extracted NICE
npm run rag:ingest-extracted WHO
npm run rag:ingest-extracted ESC
npm run rag:ingest-extracted AHA
npm run rag:ingest-extracted Cochrane
# ... etc pour les 126 sources
```

### Étape 4 — Vérification

```sql
-- Volume total
SELECT
  count(DISTINCT guideline_code) AS guidelines,
  count(*) AS chunks,
  count(*) FILTER (WHERE status = 'pending_review') AS pending,
  pg_size_pretty(pg_total_relation_size('medical_guidelines')) AS table_size
FROM medical_guidelines;

-- Par source (top 20)
SELECT
  source,
  count(DISTINCT guideline_code) AS guidelines,
  count(*) AS chunks,
  ROUND(AVG(length(content))) AS avg_chunk_chars
FROM medical_guidelines
GROUP BY source
ORDER BY chunks DESC
LIMIT 20;

-- Test recherche sémantique
SELECT * FROM match_guidelines(
  -- embedding d'un test (à remplacer par un vrai embedding)
  ARRAY_FILL(0.5::float, ARRAY[1536])::vector,
  0.0,  -- threshold = 0 pour voir tous les résultats
  5
);
```

### Étape 5 — Activation du RAG runtime

Le runtime est déjà branché dans `app/api/openai-diagnosis/route.ts`. Une fois Supabase peuplé, **chaque consultation enrichira automatiquement le prompt GPT-5.4** avec les top-5 guidelines pertinents.

Pour confirmer, relancer une consultation test et vérifier dans `consultation_rag_trace` :

```sql
SELECT
  consultation_id,
  query_text,
  jsonb_array_length(guidelines_retrieved) AS n_guidelines,
  jsonb_array_length(alerts_triggered) AS n_alerts,
  total_input_tokens,
  total_cost_usd,
  created_at
FROM consultation_rag_trace
ORDER BY created_at DESC
LIMIT 10;
```

### Étape 6 — Validation médicale (en parallèle avec usage)

Tous les chunks sont en `status = 'pending_review'`. Vous pouvez :

**Option A** — Activation en bloc (rapide, à utiliser avec discernement) :

```sql
-- Activer toutes les sources commercialement libres
UPDATE medical_guidelines
SET status = 'active', validated_by = 'medical-officer@your-domain', validated_at = NOW()
WHERE metadata->>'commercial_use' = 'allowed'
  AND status = 'pending_review';
-- → environ 96 + Cochrane + NORD + USPSTF + CDC + HAS active

-- Activer source par source après validation
UPDATE medical_guidelines
SET status = 'active', validated_by = 'dr.referent@x.com', validated_at = NOW()
WHERE source = 'NICE' AND status = 'pending_review';
```

**Option B** — Validation manuelle via UI :

```
https://your-app.vercel.app/admin/guidelines
```

Page dédiée avec aperçu, approbation/rejet par lot.

---

## 🆘 Troubleshooting

| Symptôme | Cause | Fix |
|----------|-------|-----|
| `Missing required env vars` | `.env.local` manquant | Voir Étape 0 |
| `pgvector extension not found` | Plan Supabase Free | Upgrade Pro (HNSW indexes nécessitent Pro) |
| `Embeddings rate limit` | Trop de batchs | Réduire batch size dans `helpers.ts` (100 → 50) |
| `Insert violation: source_check` | Migration 2 non appliquée | Re-run `npm run rag:migrate` |
| `Cannot read property 'documents'` | JSON corrompu | Vérifier le fichier source dans extracted/ |
| Ingestion très lente | OpenAI rate limit | Lancer source par source au lieu de ALL |

---

## 📊 Status final attendu

```
medical_guidelines :
  984 guidelines distinctes (guideline_code)
  ~12 000 chunks
  status = 'pending_review' partout
  126 valeurs distinctes pour 'source'
  metadata JSONB rempli (license, pdf_source, pmcid, ...)
  embedding VECTOR(1536) pour chaque chunk
  HNSW index actif pour recherche sub-100ms
```

**À l'activation**, le RAG runtime utilisera ces 12 000 chunks pour enrichir
automatiquement chaque consultation GPT-5.4 avec les top-5 guidelines pertinents.

---

## 🔄 Maintenance continue

Une fois en production, n8n prend le relais pour les mises à jour automatiques
(voir `n8n-workflows/SETUP.md`) :
- FDA alertes médicaments : horaire
- NICE nouveaux guidelines : quotidien
- WHO publications : hebdomadaire
- Sociétés savantes : mensuel
- Master agents (validation, retry, health check)

Le bridge `ingest-from-extracted.ts` peut être relancé à tout moment pour
ré-ingérer le corpus complet (par ex. après retraitement local).
