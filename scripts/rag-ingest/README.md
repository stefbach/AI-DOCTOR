# RAG Ingestion — Stéphane 984 docs

Ingère les 984 guidelines médicaux de la branche
`claude/medical-assistant-transparency-dv5S9` vers Supabase TIBOK.

## Usage (Megane)

1. Aller dans Actions → "RAG Ingest TIBOK Guidelines"
2. Cliquer "Run workflow"
3. Choisir tier (`high` / `medium` / `low` / `all`)
4. Optionnel : `max_docs` pour test (ex: `5`)
5. Optionnel : `dry_run` pour simulation (par défaut **true** — décocher pour exécution réelle)
6. Optionnel : `source` pour filtrer (ex: `CDC`)
7. Optionnel : `external_id` pour cibler un seul doc (ex: `CDC-003`)
8. Cliquer "Run workflow" vert

## Ordre recommandé

1. `dry_run=true`, `tier=high`, `max_docs=5` → vérifier logs
2. `dry_run=false`, `tier=high`, `external_id=CDC-003` → 1 doc test
3. Vérifier en DB via Claude principal (Supabase MCP)
4. `dry_run=false`, `tier=high` → tier complet (~53 docs effectifs après exclusion légale)
5. `dry_run=false`, `tier=medium` → ~125 docs
6. `dry_run=false`, `tier=low` → ~770 docs
7. Lancer le script `generate-embeddings` après ingestion complète

## Secrets requis

Dans **Settings → Secrets and variables → Actions** :

| Nom | Valeur |
|---|---|
| `SUPABASE_URL` | `https://yyxmqositmmyyeyuryln.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (depuis Vercel env de v0-medical-ai-expert) |

## Inputs du workflow

| Input | Type | Default | Description |
|---|---|---|---|
| `tier` | choice | `high` | Quality tier basé sur `extraction_method` |
| `max_docs` | string | `0` | Limite docs (0 = pas de limite) |
| `dry_run` | bool | `true` | Simule sans écrire — **toujours commencer en true** |
| `source` | string | (vide) | Filtre par code source (CDC, USPSTF…) |
| `external_id` | string | (vide) | Cible un seul doc par external_id |

## Exclusions légales (hard-coded)

ADA, GINA, ASCO, ESMO, GOLD — content non-redistribuable.
~39 docs sont skippés d'office.

## Idempotence

Re-run d'un même tier safe : `ON CONFLICT (source_id, guideline_external_id) DO UPDATE`
sur `guidelines_raw`, puis `DELETE` chunks + validated avant `INSERT` validated frais.

## Embeddings

Le trigger Supabase `trigger_rag_chunk_embed` est configuré pour skip
`fetched_by_run_id LIKE 'stephane_extraction_%'`. Les chunks sont insérés avec
`embedding=NULL`. Un second script (à venir) générera les embeddings en batch
via OpenAI `text-embedding-3-small`.
