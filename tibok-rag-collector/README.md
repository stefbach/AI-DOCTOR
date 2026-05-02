# TIBOK RAG — Medical Guidelines Collector

Infrastructure pour ingérer ~287 guidelines cliniques internationales dans le RAG TIBOK AI Doctor.

## Contenu du livrable

| Fichier | Description |
|---------|-------------|
| `guidelines_master.csv` | Catalogue maître des 287 guidelines (15 sources) |
| `download_guidelines.py` | Script de scraping/téléchargement parallèle robuste |
| `pmc_fallback.py` | Module PMC (NCBI E-utilities) — fallback automatique |
| `test_resolvers.py` | 14 tests unitaires pour les résolveurs URL→PDF |
| `test_pmc_fallback.py` | 12 tests unitaires pour le module PMC |
| `requirements.txt` | Dépendances Python |
| `README.md` | Ce fichier |

## Architecture à 2 étages

```
guideline → resolver direct (NICE/HAS/USPSTF/...) ─┬─> ✅ PDF
                                                    │
                                                    └─> ❌ échec
                                                         │
                                                         ▼
                                                PMC fallback (NCBI E-utilities)
                                                         │
                                                  ┌──────┴──────┐
                                                  │             │
                                                  ▼             ▼
                                              ✅ PDF PMC    ❌ failed.csv
```

**Résultat estimé : ~95% des 287 PDFs téléchargés automatiquement.**

## Sources couvertes (287 guidelines)

| Source | Nombre | Licence | Usage commercial TIBOK |
|--------|--------|---------|------------------------|
| NICE | 30 | NICE © | ⚠️ Licence requise pour B2B |
| USPSTF | 30 | US Public Domain | ✅ Libre |
| CDC | 15 | US Public Domain | ✅ Libre |
| ECDC | 10 | Decision 2011/833/EU | ✅ Avec attribution |
| WHO | 20 | CC BY-NC-SA 3.0 IGO | ⚠️ NC : autorisation requise |
| HAS | 40 | Etalab 2.0 | ✅ Avec attribution |
| KDIGO | 15 | KDIGO © | ⚠️ Contacter info@kdigo.org |
| GOLD | 1 | GOLD © | ⚠️ Autorisation requise |
| GINA | 1 | GINA © | ⚠️ Autorisation requise |
| ESC | 25 | ESC/OUP © | ⚠️ permissions@oup.com |
| AHA/ACC | 20 | AHA © | ⚠️ Permissions Wolters Kluwer |
| ADA | 10 | ADA © | ⚠️ Permissions ADA |
| IDSA | 30 | IDSA © (clause CDS) | ⚠️⚠️ Clause spécifique aux logiciels CDS |
| EASL | 20 | EASL/Elsevier © | ⚠️ Permissions Elsevier |
| ERS | 20 | ERS © | ⚠️ permissions@ersnet.org |

**Synthèse licences :**
- 96 guidelines en accès commercial libre (USPSTF + CDC + ECDC + HAS)
- 191 guidelines avec restrictions commerciales — à licencier pour TIBOK B2B prod

## PMC fallback (NCBI E-utilities)

Quand le téléchargement direct échoue (paywall, anti-bot, URL changée, etc.),
le script interroge automatiquement **PubMed Central** — le repository NIH
public d'articles biomédicaux Open Access.

**Fonctionnement** :
1. `esearch` : recherche du titre + année dans PubMed → PMID
2. `elink` : conversion PMID → PMCID si l'article est dans PMC
3. Scrape de la landing PMC pour récupérer l'URL PDF directe
4. Téléchargement (NIH = serveur stable, pas d'anti-bot)

**Couverture PMC estimée par source** :
- AHA/ACC : ~70% (mandat de dépôt à 12 mois pour articles AHA-funded)
- ESC : ~40% (dépend du financement des auteurs)
- IDSA : ~80% (Oxford Academic OA pour la plupart)
- EASL : ~30% (Elsevier — peu de OA)
- ERS : ~85% (politique d'accès libre)
- Autres sources : pas besoin (téléchargement direct fonctionne)

**Configuration optionnelle** (recommandé pour usage intensif) :
```bash
# Obtenir une clé API NCBI gratuite : https://www.ncbi.nlm.nih.gov/account/
export NCBI_API_KEY="votre_clé_ici"
export NCBI_EMAIL="contact@tibok.mu"
```
Sans clé : 3 requêtes/sec (suffisant pour 287 docs en quelques minutes).
Avec clé : 10 requêtes/sec.

**Légal — précisions importantes** :
- Le PDF récupéré sur PMC est le **author manuscript** (version pré-mise en page)
ou la version finale si l'éditeur l'autorise
- License : **NIH Public Access Policy** autorise la lecture et le data mining
(donc le RAG est compatible)
- Pour la **redistribution commerciale**, vérifier le tag de license de chaque
article (CC BY, CC BY-NC, etc.) — disponible dans les métadonnées PMC
- Le manifest.json indique `pdf_source: "pmc"` pour traçabilité légale

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Utilisation

### 1. Téléchargement complet (toutes les sources)
```bash
python download_guidelines.py --csv guidelines_master.csv --out ./pdfs
```

### 2. Téléchargement uniquement licences commerciales libres (recommandé pour POC TIBOK)
```bash
python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --commercial-only
```

### 3. Une source spécifique
```bash
python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --source HAS
python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --source USPSTF
```

### 4. Filtrer par priorité clinique (high/medium/low)
```bash
python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --priority high
```

### 5. Dry-run (vérifier la sélection sans télécharger)
```bash
python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --dry-run
```

### 6. Désactiver le fallback PMC (si tu ne veux que les sources directes)
```bash
python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --no-pmc
```

### 7. Re-télécharger uniquement les échecs
Le script génère `pdfs/failed.csv` après chaque run. Pour réessayer :
```bash
python download_guidelines.py --csv ./pdfs/failed.csv --out ./pdfs
```

## Sortie

```
pdfs/
├── manifest.json          # JSON consolidé (métadonnées + sha256 + chemins) → input pipeline RAG
├── download_log.csv       # Log complet (success + failure)
├── failed.csv             # Échecs seuls (re-runnable)
├── NICE/
│   ├── NICE-001.pdf
│   ├── NICE-002.pdf
│   └── ...
├── USPSTF/
│   ├── USPSTF-001.pdf
│   └── ...
├── HAS/
│   └── ...
└── ...
```

### Format `manifest.json`
```json
{
  "generated_at": "2026-05-02T...",
  "total": 287,
  "ok": 274,
  "ok_direct": 248,
  "ok_pmc": 26,
  "no_pdf": 5,
  "http_error": 6,
  "exception": 2,
  "documents": [
    {
      "id": "AHA-013",
      "source": "AHA",
      "title": "Primary Prevention of CVD",
      "year": "2019",
      "page_url": "https://www.ahajournals.org/doi/10.1161/...",
      "pdf_url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7734661/pdf/...",
      "pdf_source": "pmc",
      "pmcid": "PMC7734661",
      "local_path": "pdfs/AHA/AHA-013.pdf",
      "sha256": "a7b3...",
      "size_bytes": 2843200,
      "status": "ok",
      "license": "AHA/ACC ©",
      "commercial_use": "restricted",
      "clinical_domain": "cardiology",
      "priority": "high"
    },
    {
      "id": "HAS-001",
      "pdf_source": "direct",
      "pmcid": null,
      "...": "..."
    }
  ]
}
```

## Intégration pipeline RAG TIBOK (TypeScript bridge)

Le `manifest.json` est consommé par le bridge TypeScript :

```bash
# Côté TypeScript (Next.js, depuis la racine du repo AI-DOCTOR) :
npm run rag:ingest-manifest -- ./tibok-rag-collector/pdfs/manifest.json
```

Ce bridge :
1. Lit le manifest
2. Pour chaque doc OK : extrait le texte du PDF (pdf-parse)
3. Découpe en chunks (~800 mots overlap 100)
4. Génère les embeddings OpenAI (text-embedding-3-small)
5. Insère dans Supabase `medical_guidelines` (status='pending_review')
6. Préserve toute la traçabilité (license, commercial_use, sha256, pdf_source, pmcid)

### Schéma Supabase

Le schéma est déjà créé par `supabase/migrations/20260427000000_create_rag_system.sql`.
Les colonnes `metadata` (JSONB) capturent les champs spécifiques TIBOK :
- `metadata.license`
- `metadata.commercial_use` (allowed | restricted | restricted-cds)
- `metadata.clinical_domain`
- `metadata.priority` (high | medium | low)
- `metadata.pdf_source` (direct | pmc | manual)
- `metadata.pmcid`

## Comportement du scraper

- **Rate limiting** : 1.5s entre requêtes au même domaine (poli, ne risque pas de ban)
- **Retry** : 3 tentatives, backoff exponentiel (5s, 10s, 20s)
- **Parallélisme** : 4 workers par défaut (`--workers N` pour ajuster)
- **Reprise** : skip automatique des PDFs déjà téléchargés (taille > 1KB)
- **Validation** : vérifie Content-Type + taille minimum + calcule SHA-256
- **User-Agent** identifié comme TIBOK avec contact

## Limitations connues

1. **NICE** : URLs PDF dynamiques (`-pdf-<id>`) — résolution depuis page guidance.
2. **GINA** : PDF officiel derrière formulaire — utilise version archive.
3. **EASL/Elsevier** : certains PDFs en accès libre HTML mais PDF nécessite Open Access.
4. **Oxford Academic** : certains articles peuvent réagir au User-Agent — adapter si besoin.
5. **WHO IRIS** : redirections multiples — le résolveur les suit.

## Roadmap

- [x] **PMC fallback** ✅ Implémenté (NCBI E-utilities)
- [x] **TypeScript bridge to Supabase** ✅ scripts/bulk-seed/sources/ingest-from-manifest.ts
- [ ] Ajouter extraction de métadonnées PDF (auteurs, DOI, ISBN)
- [ ] Détection automatique des mises à jour (refresh basé sur sha256)
- [ ] Support sitemap.xml pour NICE/HAS pour découverte dynamique
- [ ] Module de licensing : vérification automatique des autorisations obtenues
- [ ] Mode "manual PDF" pour intégrer les documents téléchargés à la main

## Conformité

⚠️ **Avant déploiement TIBOK production B2B**, contacter les ayants-droit pour :
- IDSA (clause CDS spécifique : explicit ban d'incorporation dans logiciel CDS sans accord)
- WHO (NC dans CC BY-NC-SA)
- ESC/AHA/ADA/EASL/ERS (permissions éditeurs)
- NICE (licence commerciale)

Pour POC, recherche, développement interne : OK avec attribution correcte.

---
**Auteur** : Stéphane Bach / TIBOK
**Version** : 1.0 — Mai 2026
