# tibok-meta-rag

Pipeline Python d'ingestion de méta-analyses et revues systématiques pour
enrichir le RAG du AI Doctor de TIBOK ("My Medical Intelligence").

Pour chaque pathologie d'une liste fournie (`pathologies.json`, 136
pathologies / 16 catégories), le pipeline interroge des APIs publiques
gratuites (Europe PMC en priorité, PubMed en complément, Unpaywall en
enrichissement optionnel), extrait abstracts + métadonnées (+ full-text
quand disponible en open access), déduplique, score et produit un fichier
JSON par pathologie (`ingest.py`, voir plus bas). Un second script
(`ingest_supabase.py`) découpe ces documents en chunks et les pousse dans
les mêmes tables Supabase de production que les guidelines officielles
(voir [Ingestion Supabase & embeddings](#ingestion-supabase--embeddings)).

## Ce que ce pipeline NE fait PAS

- Pas de résumé/reformulation des abstracts par LLM.
- Pas de téléchargement de PDF non open-access. Unpaywall n'est utilisé que
  pour vérifier l'existence d'une copie OA légale et enregistrer son URL —
  jamais pour en télécharger le contenu.

## Installation

```bash
cd tibok-meta-rag
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # puis renseigner NCBI_API_KEY / UNPAYWALL_EMAIL
```

Variables d'environnement (voir `.env.example`) :

| Variable          | Requis | Effet |
|-------------------|--------|-------|
| `NCBI_API_KEY`    | non    | PubMed passe de 3 à 10 req/s |
| `UNPAYWALL_EMAIL`  | non    | Sans elle, l'enrichissement Unpaywall est ignoré (log warning, non bloquant) |
| `NCBI_EMAIL`       | non    | Envoyé aux E-utilities (bonne pratique NCBI) |

Aucune clé n'est requise pour un usage minimal : Europe PMC est gratuit et
sans clé, PubMed fonctionne sans clé à 3 req/s.

## Exécution

```bash
python ingest.py --all                       # toutes les pathologies
python ingest.py --pathology dt2 hta          # sélection explicite
python ingest.py --pilot                      # les 15 pathologies du pilote
python ingest.py --since 2026-07-01           # mode incrémental (cron mensuel)
python ingest.py --all --max-docs 15          # top 15 au lieu du défaut (25)
```

### Pilote (à exécuter en premier)

```bash
python ingest.py --pilot
```

Couvre : `dt2, hta, dyslipidemie, obesite, mrc, asthme, bpco, depression,
anxiete, arthrose, lombalgie, rgo, hypothyroidie, fa,
insuffisance_cardiaque`.

(Note : le pilote MeSH pour "anxiete" correspond à l'entrée `tag` — trouble
anxieux généralisé — dans `pathologies.json`.)

## Sortie

- `output/{pathology_id}.json` — un document par pathologie, schéma validé
  par Pydantic (`models.PathologyOutput`) :

  ```json
  {
    "pathology_id": "dt2",
    "generated_at": "2026-08-22T10:00:00Z",
    "documents": [
      {
        "doc_id": "PMC1234567",
        "pmid": "12345678",
        "doi": "10.xxxx/xxxx",
        "title": "...",
        "abstract": "...",
        "conclusions": "...",
        "full_text_available": true,
        "full_text": "... (null si non-OA ou non text-minable)",
        "journal": "...",
        "year": 2024,
        "authors": ["...", "..."],
        "doc_type": "meta-analysis",
        "mesh_terms": ["..."],
        "source": "europepmc",
        "url": "https://...",
        "langue": "en",
        "citation_count": 42
      }
    ]
  }
  ```

- `output/_summary.json` — rapport global régénéré à partir de **tout** le
  contenu présent dans `output/` (pas seulement le run courant) : par
  pathologie, nombre de documents, % full-text OA, année médiane, répartition
  par source ; plus le total de documents et les éventuelles erreurs.

- `logs/ingest_{timestamp}.log` — log structuré (fichier + console) : nombre
  de résultats par source, doublons éliminés, erreurs API.

## Logique de sélection et scoring

1. **Dédoublonnage** par DOI, puis par titre normalisé pour les
   enregistrements sans DOI. Deux occurrences de la même publication
   (typiquement une depuis Europe PMC, une depuis PubMed) sont fusionnées —
   la meilleure valeur de chaque champ est conservée, pas seulement la
   première rencontrée.
2. **Score de priorité** (pondération) :
   - année récente : 40 % (fenêtre de récence de 10 ans)
   - `citation_count` : 25 % (échelle logarithmique)
   - journal Cochrane/BMJ/Lancet/JAMA/NEJM : 20 %
   - full-text OA disponible : 15 %
3. **Top N** conservé par pathologie (25 par défaut, `--max-docs`).
4. **Exclusion** : lettres, errata, retractations (`publication_type`
   contenant "Retracted Publication", "Letter", "Erratum", "Comment",
   "Editorial", "News").

## Idempotence

Relancer le pipeline sur une pathologie déjà ingérée ne duplique rien : les
documents existants dans `output/{pathology_id}.json` sont rechargés,
fusionnés avec les nouveaux résultats via le même dédoublonnage par DOI/titre
(en gardant p. ex. le `citation_count` le plus à jour), puis re-scorés — le
fichier de sortie est réécrit avec le nouveau top N.

## APIs utilisées

1. **Europe PMC** (source principale) — gratuit, sans clé, JSON natif.
   Endpoint recherche : `GET /search`. Le texte intégral n'est demandé que
   pour les documents effectivement retenus après scoring (`--max-docs`),
   jamais pour tout le pool de candidats, via `GET /{PMCID}/fullTextXML` — un
   404 y est normal et non bloquant : `isOpenAccess: Y` (librement lisible)
   est un ensemble plus large que le sous-corpus text-minable servi par cet
   endpoint.
2. **PubMed E-utilities** (fallback / complément) — `esearch.fcgi` puis
   `efetch.fcgi` (XML), 3 req/s sans clé / 10 req/s avec `NCBI_API_KEY`.
3. **Unpaywall** (optionnel) — pour un DOI sans full-text Europe PMC,
   vérifie l'existence d'un PDF OA légal (`best_oa_location.url_for_pdf`).
   Ignoré si `UNPAYWALL_EMAIL` n'est pas défini.

Toutes les requêtes respectent un rate limit prudent (5 req/s Europe PMC,
5 req/s Unpaywall, 3-10 req/s PubMed) avec retry exponentiel sur 429/500-504
(`tenacity`, jusqu'à 5 tentatives).

## Règles légales (strict)

- Full-text stocké **uniquement** si open access confirmé (Europe PMC
  `isOpenAccess == "Y"` avec texte réellement mineable, ou Unpaywall
  `best_oa_location`).
- Sinon : abstract + métadonnées uniquement.
- Aucun scraping de Cochrane Library, Wiley, Elsevier ou tout site éditeur
  derrière paywall.
- DOI et URL source conservés sur chaque document pour la traçabilité des
  citations.

## Tests

```bash
pytest -q
```

Un test d'intégration mocké (via `respx`) par source (`europepmc.py`,
`pubmed.py`, `unpaywall.py`) plus des suites de tests unitaires pour le
scoring (dédoublonnage, exclusion, pondération, idempotence), le chunking
(`chunking.py`) et le mapping de spécialité (`specialty_map.py`).

## Ingestion Supabase & embeddings

`ingest_supabase.py` pousse `output/*.json` vers les **mêmes tables
Supabase de production** que les guidelines officielles (celles que
`lib/rag/medical-rag.ts` interroge en direct pour les diagnostics) :
`guidelines_raw` → `guidelines_validated` → `guidelines_chunks` (+
`guideline_content_kind`). Il mirrore exactement le pattern de
`scripts/rag-ingest/ingest.py` (upsert idempotent par
`(source_id, guideline_external_id)`, cleanup + réinsertion des chunks à
chaque re-run).

**Point de sécurité patient le plus important du script** : chaque ligne
insérée est taguée `content_kind = 'recherche'` dans
`guideline_content_kind` — jamais `'referentiel'`. Une méta-analyse
rapporte une synthèse d'études, elle ne porte pas l'autorité d'une
recommandation de société savante ; c'est ce tag qui empêche le modèle de
la citer comme telle dans un rapport (voir `contentKindWarning()` dans
`lib/rag/medical-rag.ts`).

Découpage en chunks (`chunking.py`, notre JSON n'est pas pré-chunké
contrairement à l'export de Stéphane) : chunk 0 = titre + abstract (+
conclusion si absente de l'abstract) ; chunks 1..N = texte intégral
découpé en fenêtres de ~3500 caractères sur des frontières de paragraphe,
avec un léger recouvrement. Sur les 136 pathologies déjà récupérées :
3400 documents → **74 829 chunks** (`embedding` laissé `NULL`).

```bash
python ingest_supabase.py --dry-run                    # simulation (défaut)
python ingest_supabase.py --pathology dt2 --dry-run     # une pathologie
python ingest_supabase.py --no-dry-run                  # écriture réelle
```

Variables d'environnement requises pour `--no-dry-run` : `SUPABASE_URL`
(ou `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY` — identiques
à celles de `scripts/rag-ingest/ingest.py`.

**Étape suivante obligatoire** : `guidelines_chunks.embedding` reste `NULL`
après ce script. Lancer ensuite `scripts/rag-ingest/generate-embeddings.mjs`
(déjà générique sur toute la table, aucun nouveau script d'embedding requis)
— ou son wrapper GitHub Actions **RAG — Embed missing chunks**.

**Exécution recommandée** : workflow GitHub Actions **RAG Ingest
Meta-Analyses (tibok-meta-rag)** (`.github/workflows/rag-ingest-meta-analyses.yml`),
qui réutilise les secrets `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` déjà
configurés pour le pipeline de guidelines. `dry_run=true` par défaut —
toujours valider en dry-run puis sur une seule pathologie
(`pathology=dt2 --max-docs=3`) avant un run complet.

## Cron mensuel (mode incrémental)

Pour ne récupérer que les publications indexées depuis la dernière
exécution :

```bash
# crontab -e — tous les 1er du mois à 03h00
0 3 1 * * cd /path/to/tibok-meta-rag && \
  .venv/bin/python ingest.py --since "$(date -d '35 days ago' +\%Y-\%m-\%d)" \
  >> logs/cron.log 2>&1
```

`--since` restreint la fenêtre de publication interrogée sur Europe PMC
(`FIRST_PDATE`) et PubMed (`[dp]`) ; combiné à la fusion idempotente par
DOI, relancer plus souvent que nécessaire ne crée aucun doublon.

## Structure du projet

```
tibok-meta-rag/
├── pathologies.json      # catalogue d'entrée (136 pathologies, 16 catégories)
├── ingest.py             # orchestrateur de récupération (CLI)
├── ingest_supabase.py    # pousse output/*.json vers Supabase (production)
├── chunking.py           # découpage d'un Document en chunks embeddables
├── specialty_map.py      # pathology_id/category -> SpecialtyCode
├── models.py             # schémas Pydantic v2
├── scoring.py            # dédoublonnage, exclusion, scoring
├── ratelimit.py           # rate limiter async partagé
├── sources/
│   ├── europepmc.py
│   ├── pubmed.py
│   └── unpaywall.py
├── output/                # 1 JSON par pathologie + _summary.json (committé)
├── logs/                  # logs structurés (généré, gitignored)
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```
