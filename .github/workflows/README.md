# 🤖 GitHub Actions Workflows — AI-DOCTOR RAG

Ce dossier contient les workflows GitHub Actions pour automatiser
l'ingestion et la maintenance du système RAG médical.

## 📋 Workflows disponibles

| Workflow | Trigger | Coût | Durée | Description |
|---|---|---|---|---|
| `rag-connectivity-test.yml` | Manuel | $0 | 30 sec | Vérifie que Supabase + OpenAI + sources RSS sont joignables |
| `rag-ingest.yml` | Manuel | ~$0.22 | 10-15 min | Ingère les 984 guidelines dans Supabase pgvector |
| `deploy.prod.yml` | Push `main` | — | — | Déploiement prod existant (intact) |

---

## 🔐 Étape 1 — Configurer les 3 secrets GitHub (1 fois, 2 minutes)

**Aller sur** : `https://github.com/stefbach/AI-DOCTOR/settings/secrets/actions`

Cliquer **"New repository secret"** trois fois pour ajouter :

| Nom du secret | Valeur | Où la trouver |
|---|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Supabase Dashboard → Settings → API → `service_role` (secret) |
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI Platform → API Keys |

⚠️ **Important** :
- `SUPABASE_SERVICE_ROLE_KEY` est la clé **secrète** (pas l'anon key)
- Une fois enregistrés, **personne ne peut les relire** (même les admins du repo)
- Les secrets sont chiffrés et **uniquement** accessibles aux workflows pendant l'exécution

---

## 🚀 Étape 2 — Test de connectivité (gratuit)

Avant la première ingestion, vérifier que tout est branché :

1. Aller sur **Actions** : `https://github.com/stefbach/AI-DOCTOR/actions`
2. Cliquer sur **"🔌 RAG — Connectivity Test"** dans la sidebar gauche
3. Cliquer le bouton **"Run workflow"** (à droite)
4. Sélectionner la branche `claude/medical-assistant-transparency-dv5S9`
5. Cliquer le bouton vert **"Run workflow"**

⏱ Durée : ~30 secondes.

**Résultat attendu** :
```
✅ Source RSS feeds (16 sources)
✅ Supabase reachable
✅ OpenAI API reachable
✅ text-embedding-3-small model accessible
ℹ️  medical_guidelines table not yet created (normal, on va la créer)
📚 126 source files / 984 documents ready to ingest
```

Si tout est ✅, passer à l'étape 3.

---

## 🚀 Étape 3 — Migrations Supabase

1. Aller sur **Actions** → **"🧠 RAG — Ingest Guidelines into Supabase"**
2. Cliquer **"Run workflow"**
3. Choisir :
   - Mode : **`migrate-only`**
   - Source : (laisser vide)
   - Resume : (peu importe)
4. Cliquer **"Run workflow"**

⏱ Durée : ~30 secondes.

Cela va créer dans Supabase :
- 7 tables (medical_guidelines, drug_safety_alerts, ...)
- 2 fonctions RPC (match_guidelines, check_drug_alerts)
- HNSW index pgvector
- RLS policies
- Seed des 16 sources principales

---

## 🚀 Étape 4 — Test sur 1 seule source (recommandé avant le full-ingest)

Pour vérifier que l'ingestion fonctionne sans dépenser tout le budget :

1. Actions → **"🧠 RAG — Ingest Guidelines into Supabase"** → Run workflow
2. Mode : **`single-source`**
3. Source : **`GOLD`** (1 seul document, ~1 MB → idéal pour test rapide)
4. Resume : `true`
5. Run

⏱ Durée : ~1 minute.
💰 Coût : ~$0.0008.

**Vérifier ensuite** dans Supabase SQL editor :
```sql
SELECT count(*) FROM medical_guidelines WHERE source = 'GOLD';
-- doit retourner ~167 (chunks du GOLD 2025 Report)
```

---

## 🚀 Étape 5 — Full ingestion (les 984 guidelines)

1. Actions → **"🧠 RAG — Ingest Guidelines into Supabase"** → Run workflow
2. Mode : **`full-ingest`**
3. Resume : **`true`** (skip les docs déjà ingérés via test étape 4)
4. Run

⏱ Durée : 10-15 minutes.
💰 Coût : ~$0.22 sur votre compte OpenAI.

**Vous pouvez fermer l'onglet** — GitHub continue le run en background.
Vous recevrez un email à la fin (si activé dans vos préférences).

**Vérifier ensuite** :
```sql
-- Volume total
SELECT count(DISTINCT guideline_code), count(*)
FROM medical_guidelines;
-- doit retourner ~984 / ~12000

-- Top 10 sources
SELECT source, count(DISTINCT guideline_code) AS guidelines, count(*) AS chunks
FROM medical_guidelines
GROUP BY source ORDER BY chunks DESC LIMIT 10;
```

---

## 🆘 Que faire si le workflow échoue ?

### Si "Verify required secrets" fail
→ Ajouter les 3 secrets manquants (étape 1).

### Si "Apply Supabase migrations" fail avec `extension vector not found`
→ Upgrader Supabase Pro (HNSW index requis pour les embeddings 1536-d).
→ OU appliquer la migration manuellement dans le SQL Editor du Dashboard Supabase.

### Si "Ingest" échoue à mi-chemin
→ Relancer en mode `full-ingest` avec `resume=true` — il reprend où il s'était arrêté.
→ Les docs déjà ingérés sont identifiés par leur SHA-256.

### Si OpenAI rate-limit (429)
→ Réduire la concurrence dans `lib/bulk-seed/helpers.ts` (batch de 100 → 50).
→ OU lancer source par source en mode `single-source`.

### Si le workflow ne démarre pas
→ Vérifier que `Actions` est activé dans Settings → Actions → General.
→ Vérifier que la branche existe et contient bien `.github/workflows/`.

---

## 📊 Audit / replay

Tous les runs sont visibles dans l'onglet **Actions** :
- ✅ Logs complets
- ✅ Durée par étape
- ✅ "Re-run failed jobs" en 1 clic
- ✅ Téléchargement des logs

---

## 🔄 Maintenance continue

Une fois l'ingestion initiale faite, n8n prend le relais pour les mises à jour
quotidiennes/horaires (FDA alerts, NICE updates, etc.). Voir
`n8n-workflows/SETUP.md`.

Le workflow `rag-ingest.yml` reste utile pour :
- Re-ingestion complète après ajout de nouveaux docs au catalogue
- Single-source si une source est mise à jour
- Migrations futures du schéma Supabase
