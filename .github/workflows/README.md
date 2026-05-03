# 🤖 GitHub Actions Workflows — AI-DOCTOR

| Workflow | Trigger | Description |
|---|---|---|
| `deploy.prod.yml` | Push `main` | Déploiement production (existant, intact) |
| `rag-ingest.yml` | Manuel | Ingestion RAG via SSH sur le VPS |

---

## 🧠 RAG Ingestion via VPS SSH

### 💡 Pourquoi SSH plutôt que credentials dans GitHub ?

Le VPS a **déjà** tous les credentials nécessaires dans son `.env.local` :
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Le workflow **réutilise les secrets SSH existants** (déjà utilisés par `deploy.prod.yml`) :
- `SSH_HOST`
- `SSH_USER`
- `SSH_PRIVATE_KEY`
- `SSH_PORT`

→ **Aucun secret à recopier dans GitHub.** Tout fonctionne avec ce qui est déjà là.

---

## 🚀 Procédure d'utilisation

### Étape 1 — Vérifier les pré-requis sur le VPS (1 fois)

Vérifier que le VPS a bien la branche RAG cloné et `.env.local` complet.

SSH sur le VPS :
```bash
cd /home/tibok/medical-ai-expert
ls -la .env.local
grep -E "^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY)=" .env.local
```

Si tout est OK, c'est bon. Sinon ajouter les variables manquantes dans `.env.local`.

### Étape 2 — Lancer l'ingestion

`https://github.com/stefbach/AI-DOCTOR/actions`
→ "🧠 RAG — Ingest Guidelines into Supabase (via VPS SSH)"
→ **Run workflow**

#### Mode `dry-run` (recommandé en premier, gratuit, ~30 sec)
- Mode : `dry-run`
- Run

→ Liste les fichiers/migrations qui seraient appliqués, **sans rien modifier**.

#### Mode `migrate-only` (~30 sec)
- Mode : `migrate-only`
- Run

→ Applique les 2 migrations Supabase (création des 7 tables RAG + pgvector).

#### Mode `single-source` (~1 min, ~$0.001)
- Mode : `single-source`
- Source : `GOLD` (1 doc, idéal pour test)
- Resume : `true`
- Run

→ Ingère 1 seule source dans Supabase. Permet de valider que tout fonctionne.

#### Mode `full-ingest` (10-15 min, ~$0.22)
- Mode : `full-ingest`
- Resume : `true`
- Run

→ Migrations + ingestion complète des 984 guidelines.

### Étape 3 — Vérification

Dans Supabase SQL Editor :
```sql
SELECT
  count(DISTINCT guideline_code) AS guidelines,
  count(*) AS chunks,
  pg_size_pretty(pg_total_relation_size('medical_guidelines')) AS size
FROM medical_guidelines;
-- Attendu : 984 guidelines / ~12 000 chunks
```

---

## 🔄 Ce qui se passe pendant l'exécution

1. GitHub Actions démarre un runner Ubuntu
2. Vérifie que les secrets SSH sont configurés
3. Se connecte en SSH au VPS
4. Sur le VPS :
   - `cd /home/tibok/medical-ai-expert`
   - `git pull` la branche RAG
   - Vérifie `.env.local`
   - `npm install` (si nécessaire)
   - Source les variables d'env depuis `.env.local`
   - Lance `npm run rag:migrate` puis `npm run rag:ingest-extracted ALL`
5. Affiche les logs dans GitHub Actions UI
6. Génère un résumé avec le SQL de vérification

---

## 🆘 Troubleshooting

| Symptôme | Fix |
|---|---|
| `SSH_HOST missing` | Vérifier les secrets dans Settings → Secrets |
| `.env.local not found on VPS` | SSH sur le VPS et créer/vérifier le fichier |
| `NEXT_PUBLIC_SUPABASE_URL missing` | Ajouter les vars manquantes dans `.env.local` du VPS |
| `pgvector extension not found` | Upgrader Supabase Pro (HNSW indexes nécessitent Pro) |
| OpenAI rate limit | Lancer source par source en mode `single-source` |
| Branche pas trouvée | Le VPS doit avoir la branche `claude/medical-assistant-transparency-dv5S9` ou main avec le code RAG |

---

## ✅ Avantages de l'approche SSH

| Aspect | Sans SSH (GitHub direct) | **Avec SSH (cette approche)** |
|---|---|---|
| Secrets à gérer | 3 nouveaux dans GitHub | **0 nouveau** (réutilise SSH existant) |
| Duplication credentials | OUI | **NON** |
| Environnement d'exécution | Runner GitHub Ubuntu | **Votre VPS** (où tourne déjà l'app) |
| Sécurité OpenAI | Quota partagé GitHub | **Quota directement sur votre clé** |
| Audit | Logs GitHub Actions | **Logs GitHub Actions + logs VPS** |
| Maintenance | Garder secrets sync | **Une seule source de vérité (.env.local du VPS)** |

---

## 🔄 Maintenance continue

Après l'ingestion initiale (one-shot), n8n prend le relais pour les mises à
jour automatiques (FDA alerts horaire, NICE quotidien, etc.). Voir
`n8n-workflows/SETUP.md`.

Le workflow `rag-ingest.yml` reste utile pour :
- Re-ingestion complète après ajout de nouveaux guidelines au catalogue
- Single-source si une source spécifique est mise à jour
- Migrations futures du schéma Supabase
