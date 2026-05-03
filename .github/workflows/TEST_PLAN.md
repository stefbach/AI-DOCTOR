# 🧪 Plan de test RAG — avant merge en main

**Objectif** : valider l'ingestion et le runtime RAG **sans toucher à la prod main**.

**Principe** : la branche `claude/medical-assistant-transparency-dv5S9` est isolée.
On teste tout dessus, et seulement quand c'est validé, on merge en main.

---

## 🛡️ Pourquoi c'est safe

| Composant | Sur main aujourd'hui | Sur la branche RAG | Impact mutuel |
|---|---|---|---|
| App Next.js | ✅ Tourne | ✅ Tourne (avec RAG en plus) | **Aucun** — branches Git séparées |
| Supabase tables | ❌ Pas de tables RAG | ✅ Tables RAG créées | **Aucun** — la prod ne lit pas ces tables |
| `.env.local` du VPS | ✅ Existe | ✅ Existe (même fichier) | **Aucun** — RAG_ENABLED contrôle l'activation |
| Coût OpenAI | $0 | ~$0.22 (1 fois) | **Limité** — un seul run d'embeddings |

---

## 📋 Phase 1 — Tests sans coût (5 minutes)

### Test 1.1 — Dry run (vérifier que tout est branché)

`Actions → 🧠 RAG → Run workflow`
- Branch : **`claude/medical-assistant-transparency-dv5S9`**
- Mode : **`dry-run`**
- Run

✅ **Attendu** :
```
✅ SSH secrets present
✅ .env.local has Supabase + OpenAI credentials
✅ Found 126 extracted source files on branch ...
🟦 DRY RUN — listing what would be done
   Would apply migrations: 2
   Would ingest: ~984 documents from 126 sources
```

❌ **Si fail** :
- "RAG code not on branch" → la branche n'est pas pushée. À fixer côté git.
- ".env.local has missing var" → ajouter les variables manquantes dans le `.env.local` du VPS.

---

### Test 1.2 — Migrations Supabase (~30 sec, gratuit)

- Branch : `claude/medical-assistant-transparency-dv5S9`
- Mode : **`migrate-only`**
- Run

✅ **Attendu** :
```
🗄️  Applying Supabase migrations...
✅ Migration applied successfully
✅ medical_guidelines table created
✅ pgvector extension active
✅ HNSW index created
```

**Vérification SQL** dans Supabase Dashboard → SQL Editor :

```sql
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename LIKE 'medical_guidelines%' OR tablename LIKE 'guideline_%' OR tablename LIKE 'drug_%' OR tablename LIKE 'consultation_rag%';
-- Doit retourner 7 tables RAG
```

---

## 🔬 Phase 2 — Test ingestion 1 source (~1 min, ~$0.001)

### Test 2.1 — Ingestion d'1 doc (GOLD = 1 doc, idéal pour test)

- Branch : `claude/medical-assistant-transparency-dv5S9`
- Mode : **`single-source`**
- Source : **`GOLD`**
- Resume : `true`
- Run

✅ **Attendu** :
```
🔬 Ingesting source: GOLD
[1/1] GOLD-001 GOLD 2025 Report COPD Strategy
  ✅ embeddings (167 chunks)
  ✅ inserted into medical_guidelines
✅ Operation complete: single-source
```

**Vérification SQL** :

```sql
-- Volume ingéré
SELECT count(DISTINCT guideline_code) AS docs, count(*) AS chunks
FROM medical_guidelines WHERE source = 'GOLD';
-- Attendu : 1 doc / ~167 chunks

-- Aperçu d'un chunk
SELECT chunk_index, length(content) AS chars, substring(content, 1, 200) AS preview
FROM medical_guidelines WHERE source = 'GOLD' ORDER BY chunk_index LIMIT 3;
```

✅ **Si 167 chunks et le preview ressemble bien au texte du GOLD COPD Report** → l'ingestion fonctionne.

---

### Test 2.2 — Test recherche sémantique

Dans Supabase SQL Editor :

```sql
-- Récupérer un embedding "quelconque" pour tester la fonction match_guidelines
-- (en prod, l'embedding vient d'OpenAI, ici on prend un embedding existant)
WITH q AS (SELECT embedding FROM medical_guidelines WHERE source='GOLD' LIMIT 1)
SELECT * FROM match_guidelines(
  (SELECT embedding FROM q),
  0.65,    -- match_threshold
  5        -- match_count
);
-- Doit retourner 5 lignes du GOLD report
```

✅ **Si ça retourne 5 résultats** → la recherche pgvector fonctionne.

---

## 🚀 Phase 3 — Ingestion complète (~12 min, ~$0.22)

⚠️ **Vous pouvez décider après Phase 2 si vous y allez ou pas.** Si Phase 2
a échoué, ne lancez PAS Phase 3.

### Test 3.1 — Full ingestion 984 docs

- Branch : `claude/medical-assistant-transparency-dv5S9`
- Mode : **`full-ingest`**
- Resume : **`true`** (skip GOLD déjà fait)
- Run

⏱ Durée : 10-15 minutes. **Vous pouvez fermer l'onglet** — GitHub continue.

✅ **Attendu** :
```
🚀 FULL INGESTION (~10-15 min, ~$0.22 OpenAI cost)
Step 1/2: applying migrations...
✅ already applied (idempotent)

Step 2/2: ingesting all 984 guidelines...
[1/984] AAAAI/AAAAI-001 ... ✅
[2/984] AAAAI/AAAAI-002 ... ✅
...
[984/984] WSPID/WSPID-001 ... ✅
TOTAL ok=984 skipped=0 failed=0
```

**Vérification SQL finale** :

```sql
-- Volume total
SELECT
  count(DISTINCT source) AS sources,
  count(DISTINCT guideline_code) AS guidelines,
  count(*) AS chunks,
  pg_size_pretty(pg_total_relation_size('medical_guidelines')) AS size
FROM medical_guidelines;
-- Attendu : ~119 sources, ~984 guidelines, ~12000 chunks, ~200 MB

-- Top sources
SELECT source, count(DISTINCT guideline_code) AS guidelines
FROM medical_guidelines
GROUP BY source ORDER BY guidelines DESC LIMIT 10;
```

---

## 🩺 Phase 4 — Test du runtime RAG (sans toucher main)

### Test 4.1 — Lancer une consultation test

Sur **la branche RAG**, lancer l'app et faire une consultation test :

```bash
# SSH sur le VPS
cd /home/tibok/medical-ai-expert
# (la branche RAG est déjà checkout grâce au workflow)
npm run build
# Si l'app prod tourne sur main, on peut faire ce test sur un port différent
PORT=3001 npm run start
```

Faire une consultation test via l'API :

```bash
curl -X POST http://localhost:3001/api/openai-diagnosis \
  -H "Content-Type: application/json" \
  -d '{
    "patientContext": {
      "age": 45,
      "sex": "F",
      "chief_complaint": "fever, cough, weight loss for 3 months",
      "symptoms": ["night sweats", "hemoptysis"],
      "medical_history": [],
      "current_medications": [],
      "allergies": []
    }
  }'
```

✅ **Attendu** : la réponse mentionne tuberculose et cite des guidelines NICE/WHO/ATS sur la TB.

### Test 4.2 — Vérifier que les guidelines sont récupérés

```sql
-- Voir le dernier consultation_rag_trace
SELECT
  consultation_id,
  query_text,
  jsonb_array_length(guidelines_retrieved) AS n_guidelines,
  guidelines_retrieved->0->>'source' AS top_source,
  guidelines_retrieved->0->>'title' AS top_title,
  total_input_tokens,
  total_cost_usd,
  created_at
FROM consultation_rag_trace
ORDER BY created_at DESC LIMIT 5;
```

✅ **Si `n_guidelines = 5` et les sources sont pertinentes** → le RAG runtime fonctionne.

---

## 📊 Phase 5 — Validation médicale (en parallèle)

Tous les chunks sont en `status = 'pending_review'`. Activation par lot :

```sql
-- Activer toutes les sources commercialement libres
UPDATE medical_guidelines
SET status = 'active', validated_by = 'test', validated_at = NOW()
WHERE metadata->>'commercial_use' = 'allowed'
  AND status = 'pending_review';
-- → environ 96 guidelines activés

-- OU activer source par source après revue manuelle
UPDATE medical_guidelines
SET status = 'active', validated_by = 'medical-officer@x.com', validated_at = NOW()
WHERE source = 'NICE' AND status = 'pending_review';
```

OU via l'UI : `https://your-app/admin/guidelines` (sur la branche RAG).

---

## ✅ Décision : merger en main ?

Avant de merger, vérifier la checklist :

```
[ ] Phase 1 dry-run : ✅ pas d'erreurs
[ ] Phase 1 migrate : ✅ tables créées
[ ] Phase 2 single-source GOLD : ✅ 1 doc / 167 chunks ingérés
[ ] Phase 2 recherche sémantique : ✅ pgvector retourne des résultats
[ ] Phase 3 full ingest : ✅ 984/984 docs ingérés
[ ] Phase 4 runtime test : ✅ RAG enrichit les consultations
[ ] Phase 5 validation : ✅ au moins quelques sources activées
```

Si tous ✅ → **merger en main** :

```bash
git checkout main
git merge claude/medical-assistant-transparency-dv5S9
git push origin main
# → deploy.prod.yml se déclenche automatiquement
# → la prod sur main reçoit le code RAG (déjà ingéré en DB)
# → activer RAG_ENABLED=true sur le VPS
```

Si problèmes → continuer à corriger sur la branche, **la prod reste intacte sur main**.

---

## 🆘 Rollback

Si après merge en main quelque chose pose problème :

**Option A — Désactivation rapide** (1 minute) :
```bash
# SSH sur le VPS
echo 'RAG_ENABLED=false' >> .env.local
# Restart app
```
→ Le RAG est désactivé, l'app continue à fonctionner sans enrichissement.

**Option B — Rollback Git complet** :
```bash
git revert HEAD       # annule le merge
git push origin main
```
→ Auto-deploy revient à l'état d'avant.

**Option C — Vider Supabase** :
```sql
TRUNCATE medical_guidelines, drug_safety_alerts, consultation_rag_trace,
         guideline_update_log, guideline_ingestion_runs, guideline_failed_documents
CASCADE;
```
→ Tout effacer, ré-ingérer plus tard.

---

## ⏱ Budget temps total estimé

| Phase | Durée | Coût |
|---|---|---|
| Phase 1 (dry-run + migrate) | 5 min | $0 |
| Phase 2 (test single source) | 5 min | ~$0.001 |
| Phase 3 (full ingest) | 15 min | ~$0.22 |
| Phase 4 (test runtime) | 10 min | $0.01 (1 consultation) |
| Phase 5 (validation par lot) | 10 min | $0 |
| **TOTAL** | **~45 min** | **~$0.23** |

**Une seule personne, ~1 heure de travail effectif, pour transformer 984 guidelines extraits → RAG opérationnel en prod.**
