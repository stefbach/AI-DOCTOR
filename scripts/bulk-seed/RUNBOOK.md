# 📘 RUNBOOK — Constitution complète de la base de guidelines

**Branche** : `claude/medical-assistant-transparency-dv5S9`
**Couverture cible** : **287 guidelines** (15 sources, all licenses) via le collector Python
**Estimation totale** : Phase A (download Python) ~30-90 min · Phase B (ingest TS) ~30-60 min
**Coût total estimé** : **~$2-10** d'embeddings OpenAI

---

## 🎯 Philosophie

L'objectif est de constituer en SQL **toute la base de connaissances médicale**
des 287 guidelines officiels — **les 96 commercialement libres ET les 191
restreints** — pour alimenter le RAG en consultation.

Le filtrage commercial **ne se fait PAS à l'ingestion** : tout est ingéré, et la
distinction `commercial_use` (`allowed` / `restricted` / `restricted-cds`) est
préservée dans `metadata` pour permettre un filtrage au runtime selon le
contexte d'usage (POC dev / B2B prod sous licence).

---

## 🏗️ Architecture du pipeline

```
PHASE A — Acquisition (Python)
  tibok-rag-collector/download_guidelines.py
       │
       ├─ Resolveur direct (NICE/HAS/USPSTF/...)
       │   └─ Échec → fallback PMC (NCBI E-utilities)
       │
       ▼
  pdfs/manifest.json  +  pdfs/<SOURCE>/<ID>.pdf

                      │
                      ▼
PHASE B — Ingestion (TypeScript)
  scripts/bulk-seed/sources/ingest-from-manifest.ts
       │
       ├─ Extract PDF text (pdf-parse)
       ├─ AI metadata (specialty, conditions, drugs)
       ├─ Chunking (~800 mots overlap 100)
       ├─ Embeddings (OpenAI text-embedding-3-small, 1536d)
       └─ Insert Supabase medical_guidelines (status='pending_review')
                      │
                      ▼
PHASE C — Validation médicale humaine
  /admin/guidelines → status='active'
                      │
                      ▼
PHASE D — Runtime RAG
  app/api/openai-diagnosis/route.ts utilise les guidelines actifs
```

**Pourquoi cette séparation Python ↔ TypeScript** :
- Python excelle pour scraping, anti-bot, fallback PMC
- TypeScript dans Next.js gère naturellement Supabase + embeddings + runtime
- Manifest.json = contrat clair entre les deux

---

## 📊 Couverture des 287 guidelines

| Source | Nombre | License | commercial_use |
|--------|--------|---------|----------------|
| NICE | 30 | NICE © | restricted |
| USPSTF | 30 | US Public Domain | **allowed** |
| CDC | 15 | US Public Domain | **allowed** |
| ECDC | 10 | Decision 2011/833/EU | **allowed** |
| WHO | 20 | CC BY-NC-SA 3.0 IGO | restricted |
| HAS | 40 | Etalab 2.0 | **allowed** |
| KDIGO | 15 | KDIGO © | restricted |
| GOLD | 1 | GOLD © | restricted |
| GINA | 1 | GINA © | restricted |
| ESC | 25 | ESC/OUP © | restricted |
| AHA/ACC | 20 | AHA © | restricted |
| ADA | 10 | ADA © | restricted |
| IDSA | 30 | IDSA © (CDS clause) | restricted-cds |
| EASL | 20 | EASL/Elsevier © | restricted |
| ERS | 20 | ERS © | restricted |

**Total** : 287 guidelines · 96 allowed · 191 restricted

⚠️ Pour usage **production B2B**, contracter les licences nécessaires avec :
NICE, WHO (NC), KDIGO, GOLD, GINA, ESC/OUP, AHA, ADA, IDSA (clause CDS), EASL, ERS.

Pour **POC, recherche, développement interne** : ingestion totale OK avec attribution.

---

## ✅ Pré-requis

### 1. Variables d'environnement (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=sk-proj-<your-key>

RAG_ENABLED=true
FEATURE_SAFETY_ALERTS=true
FEATURE_RAG_TRACE=true

# Optionnel pour PMC fallback (10 req/s au lieu de 3 req/s)
NCBI_API_KEY=<your-ncbi-key>     # https://www.ncbi.nlm.nih.gov/account/
NCBI_EMAIL=contact@tibok.mu
```

### 2. Dépendances

```bash
# TypeScript / Next.js (déjà dans package.json)
npm install

# Python (pour le collector)
cd tibok-rag-collector
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 3. Migration Supabase appliquée

```bash
npm run rag:migrate
```

---

## 🚀 Mode opératoire (5 étapes)

### Étape 0 — Test connectivité (gratuit, 30 sec)

```bash
npm run rag:test
```
→ Vérifie quelles sources RSS répondent depuis votre réseau.

### Étape 1 — Phase A : Téléchargement des 287 PDFs (Python)

#### Téléchargement complet (les 287, recommandé)

```bash
npm run rag:download-all
# = cd tibok-rag-collector && python3 download_guidelines.py --csv guidelines_master.csv --out ./pdfs
```

**Durée** : 30-90 minutes selon vitesse réseau et taux de réussite PMC fallback.
**Sortie** :
- `tibok-rag-collector/pdfs/manifest.json` (toutes les métadonnées)
- `tibok-rag-collector/pdfs/<SOURCE>/<ID>.pdf` (les PDFs eux-mêmes)
- `tibok-rag-collector/pdfs/failed.csv` (les échecs, pour retry)

#### Téléchargement progressif (si vous préférez source par source)

```bash
npm run rag:download-source -- HAS         # 40 PDFs Etalab
npm run rag:download-source -- USPSTF      # 30 PDFs Public Domain
npm run rag:download-source -- CDC         # 15 PDFs Public Domain
npm run rag:download-source -- ECDC        # 10 PDFs EU Decision
npm run rag:download-source -- NICE        # 30 PDFs (peut nécessiter retry)
# ... idem pour les 11 autres sources
```

#### Re-téléchargement des échecs

```bash
cd tibok-rag-collector
python3 download_guidelines.py --csv ./pdfs/failed.csv --out ./pdfs
```

#### Filtres optionnels (pour test)

```bash
# Test priorité haute uniquement (~150 docs)
cd tibok-rag-collector
python3 download_guidelines.py --csv guidelines_master.csv --out ./pdfs --priority high

# Vue de ce qui sera téléchargé sans coût
python3 download_guidelines.py --csv guidelines_master.csv --out ./pdfs --dry-run
```

### Étape 2 — Phase B : Ingestion dans Supabase (TypeScript)

```bash
# Ingestion complète (les 287)
npm run rag:ingest-manifest -- ./tibok-rag-collector/pdfs/manifest.json
```

**Comportement par défaut** :
- Ingère **TOUS** les documents `status === 'ok'` du manifest (allowed + restricted)
- Préserve `commercial_use`, `license`, `pdf_source`, `pmcid`, `priority` dans `metadata`
- Tout va en `status = 'pending_review'` → validation médicale obligatoire

**Filtres optionnels (env vars)** :
```bash
# Test : ingester uniquement HAS
FILTER_SOURCE=HAS npm run rag:ingest-manifest -- ./tibok-rag-collector/pdfs/manifest.json

# Test : reprendre après interruption (skip ce qui est déjà en DB)
RESUME=true npm run rag:ingest-manifest -- ./tibok-rag-collector/pdfs/manifest.json

# Test : limiter à 10 docs (vérification rapide)
MAX_DOCS=10 npm run rag:ingest-manifest -- ./tibok-rag-collector/pdfs/manifest.json
```

### Étape 3 — Phase C : Validation médicale humaine

Tous les chunks ont `status = 'pending_review'` après ingestion. Un médecin
référent doit les valider.

**Interface** : `/admin/guidelines`

**Validation par lot via SQL** (à utiliser avec discernement) :

```sql
-- Approuver toutes les sources commercialement libres en bloc
UPDATE medical_guidelines
SET status = 'active',
    validated_by = 'medical-officer@tibok.mu',
    validated_at = NOW()
WHERE status = 'pending_review'
  AND metadata->>'commercial_use' = 'allowed';
-- → ~96 guidelines × ~30 chunks = ~3000 chunks activés

-- Approuver source par source pour les restreintes (après contractualisation)
UPDATE medical_guidelines
SET status = 'active', validated_by = '...', validated_at = NOW()
WHERE source = 'NICE' AND status = 'pending_review';
-- (à répéter pour chaque source dont la licence a été contractée)
```

### Étape 4 — Phase D : Runtime RAG opérationnel

Aucune action — le code est déjà en place. Dès qu'un guideline a
`status = 'active'`, il participe à la recherche sémantique du runtime
`app/api/openai-diagnosis/route.ts`.

**Filtrage commercial au runtime** (optionnel — pour B2B prod uniquement) :

Adapter la fonction RPC `match_guidelines` (Supabase) pour filtrer selon le
contexte d'usage :

```sql
-- Variant: only allowed-for-commercial
SELECT * FROM match_guidelines(query_embedding, 0.65, 5)
WHERE metadata->>'commercial_use' = 'allowed';
```

Ou dans le code TS, filtrer après retrieve :
```ts
const guidelines = await retrieveRelevantGuidelines(query)
const safeForB2B = guidelines.filter(g =>
  g.metadata?.commercial_use === 'allowed'
)
```

---

## 📊 Vérification après seed

### Volume total

```sql
SELECT
  metadata->>'commercial_use' AS commercial_use,
  count(DISTINCT guideline_code) AS guidelines,
  count(*) AS chunks
FROM medical_guidelines
GROUP BY metadata->>'commercial_use';
```

Attendu après ingestion complète :
```
commercial_use      guidelines    chunks
─────────────────   ──────────   ─────────
allowed             ~96          ~3000-4000
restricted          ~165         ~5000-7000
restricted-cds      ~30          ~1500-2000  (IDSA)
```

### Couverture par source

```sql
SELECT
  source,
  count(DISTINCT guideline_code) AS guidelines,
  count(*) AS chunks,
  metadata->>'commercial_use' AS commercial_use
FROM medical_guidelines
GROUP BY source, metadata->>'commercial_use'
ORDER BY source;
```

### Suivi du pdf_source (direct vs PMC fallback)

```sql
SELECT
  source,
  metadata->>'pdf_source' AS pdf_source,
  count(DISTINCT guideline_code) AS guidelines
FROM medical_guidelines
GROUP BY source, metadata->>'pdf_source'
ORDER BY source;
```
→ Utile pour identifier quelles sources ont nécessité PMC (donc dépendance NIH).

### Documents échoués (pour retry)

```sql
SELECT source_code, document_url, error_type, error_message
FROM guideline_failed_documents
WHERE resolved = FALSE
ORDER BY first_failed_at DESC;
```

---

## 💰 Coût estimé

| Phase | Détail | Coût |
|-------|--------|------|
| Python download | API NCBI (gratuit) + bande passante | **$0** |
| AI metadata extraction | 287 docs × ~1500 tokens × $5/1M | ~$2.15 |
| Embeddings | ~10000 chunks × ~800 tokens × $0.02/1M | ~$0.16 |
| **TOTAL** | | **~$2.30** |

(Ordre de grandeur — la facture exacte dépend du % de PMC fallback et de la
taille moyenne des PDFs.)

---

## 🆘 Troubleshooting

| Symptôme | Cause | Fix |
|----------|-------|-----|
| Python `ModuleNotFoundError: pmc_fallback` | venv non activé | `source tibok-rag-collector/.venv/bin/activate` |
| `ImportError: requests` | deps non installées | `pip install -r tibok-rag-collector/requirements.txt` |
| Beaucoup de `no_pdf` dans manifest | Anti-bot (NICE, ESC, AHA) | Vérifier User-Agent, ou télécharger manuellement et utiliser `npm run rag:upload-pdf` |
| `OpenAI rate limit` durant ingestion | Trop de chunks/sec | Réduire batch size (100→50) dans `helpers.ts` |
| `Insert failed: duplicate key` | Réingestion sans `RESUME=true` | Lancer avec `RESUME=true` |
| Texte PDF vide ou très court | PDF scanné sans OCR | Document à exclure ou OCR manuel |
| HAS PDF en français mal indexé | language non détecté | Le bridge force `language='fr'` pour HAS automatiquement |

---

## 🔄 Maintenance continue

Une fois la base initiale constituée, n8n prend le relais pour les **mises à
jour automatiques** (voir `n8n-workflows/SETUP.md`) :
- Nouveaux guidelines NICE quotidiens
- Nouveaux WHO hebdomadaires
- Alertes FDA horaires
- etc.

Le collector Python reste utile pour les **re-syncs annuels complets** ou pour
ajouter des sources nouvelles.

---

## 📊 Récapitulatif des commandes

```bash
# === Connectivité (no cost) ===
npm run rag:test

# === Migration ===
npm run rag:migrate

# === Phase A — Download Python ===
npm run rag:download-all                    # 287 guidelines
npm run rag:download-source -- HAS          # source spécifique
# (le script Python supporte aussi --priority high, --commercial-only, --no-pmc, --dry-run)

# === Phase B — Ingest TS ===
npm run rag:ingest-manifest -- ./tibok-rag-collector/pdfs/manifest.json
# Variants:
FILTER_SOURCE=HAS  npm run rag:ingest-manifest -- ...
FILTER_COMMERCIAL=allowed npm run rag:ingest-manifest -- ...
RESUME=true        npm run rag:ingest-manifest -- ...
MAX_DOCS=10        npm run rag:ingest-manifest -- ...

# === Manuel (PDF déjà téléchargé hors Python) ===
npm run rag:upload-pdf -- <source> <pdf-path> <code> "<title>" [url]

# === RSS-only orchestrator (alternative au Python collector) ===
npm run rag:seed                            # 16 sources via TS
npm run rag:seed:fda                        # source par source
# ...
```

---

## 🎯 Status final attendu

Après exécution complète et validation médicale :

```
✅ 287 guidelines indexés (96 allowed + 191 restricted)
✅ ~10000 chunks vectorisés (text-embedding-3-small, 1536d)
✅ Recherche sémantique pgvector (HNSW) opérationnelle
✅ Filtrage commercial possible au runtime (metadata.commercial_use)
✅ Audit trail complet (sha256, pdf_source, pmcid)
✅ RAG runtime branché dans openai-diagnosis
✅ n8n workflows actifs pour mises à jour continues
✅ Validation médicale 10 ans (consultation_rag_trace)
```

**→ Système RAG médical pleinement opérationnel et conforme.**
