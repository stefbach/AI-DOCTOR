#!/usr/bin/env python3
"""
ingest_supabase.py — Push tibok-meta-rag/output/*.json into the TIBOK
Supabase RAG (same production tables the live AI Doctor queries).

Mirrors scripts/rag-ingest/ingest.py (Stéphane's 984-guideline pipeline):
same 4-step write (raw -> cleanup -> validated -> chunks), same idempotent
upsert-on-conflict semantics, embeddings left NULL for a later batch pass.

DIFFERENCES from scripts/rag-ingest/ingest.py, and why:

  - Chunking: our documents aren't pre-chunked (unlike Stéphane's export),
    so chunk_document() (chunking.py) splits each one here: chunk 0 =
    title+abstract+conclusions, chunks 1..N = full_text windows.

  - guideline_content_kind: EVERY row inserted by this script is tagged
    'recherche' (primary research / systematic review) in the
    guideline_content_kind table, never 'referentiel'. A meta-analysis
    reports pooled study evidence — it does not carry the authority of a
    learned-society recommendation, and the prompt-formatting layer
    (lib/rag/medical-rag.ts formatGuidelinesForPrompt) reads this table to
    stop the model citing it as if it were one. This is the single most
    important correctness property of this script — do not remove it.

  - source_code: deliberately NOT the journal name. guidelines_sources.code
    is a short acronym in every existing row (CDC, NICE, WHO...) and this
    script has no way to confirm a column-length constraint against the
    live schema without DB access. Using per-journal codes could silently
    fail or truncate on a constraint we can't see from here. Instead every
    row uses a small fixed source per origin pipeline (EUROPEPMC / PUBMED),
    and the real journal name is preserved in chunk_metadata.journal so it
    is not lost — just not promoted to a guidelines_sources.code value
    until someone with schema access confirms it's safe to do so.

Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, same as
scripts/rag-ingest/ingest.py. Reads from tibok-meta-rag/output/ by default
(override with META_RAG_OUTPUT_DIR).

CLI:
    --pathology ID [ID ...]   only these pathology_id(s)
    --max-docs N              cap docs ingested per pathology (0 = no cap)
    --dry-run                 no writes, only stats (default: True — pass
                               --no-dry-run to actually write)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from supabase import Client, create_client
from postgrest.exceptions import APIError

from chunking import chunk_document
from specialty_map import specialty_for

ROOT = Path(__file__).parent
DEFAULT_OUTPUT_DIR = ROOT / "output"
PATHOLOGIES_FILE = ROOT / "pathologies.json"

INGEST_RUN_ID = "tibok_meta_rag_v1"
CHUNK_BATCH_SIZE = 50
CONTENT_KIND = "recherche"

SOURCE_CODES = {
    "europepmc": {"code": "EUROPEPMC", "name": "Europe PMC", "base_url": "https://europepmc.org"},
    "pubmed": {"code": "PUBMED", "name": "PubMed", "base_url": "https://pubmed.ncbi.nlm.nih.gov"},
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_pathology_categories() -> dict[str, str]:
    raw = json.loads(PATHOLOGIES_FILE.read_text(encoding="utf-8"))
    return {p["pathology_id"]: p["category"] for p in raw}


def external_id_for(doc: dict[str, Any]) -> str:
    """Stable, source-scoped identifier. DOI preferred (globally unique);
    falls back to doc_id (PMC id or PMID-derived) when a paper has none."""
    doi = (doc.get("doi") or "").strip()
    return doi if doi else doc["doc_id"]


class MetaAnalysisIngester:
    def __init__(self, client: Client, dry_run: bool = True):
        self.client = client
        self.dry_run = dry_run
        self.sources_cache: dict[str, str] = {}
        self.specialties_cache: dict[str, str] = {}

    def ensure_source(self, pipeline_source: str) -> str:
        info = SOURCE_CODES[pipeline_source]
        code = info["code"]
        if code in self.sources_cache:
            return self.sources_cache[code]
        if self.dry_run:
            return f"dry-run-source-{code}"
        payload = {
            "code": code,
            "name": info["name"],
            "full_name": info["name"],
            "country": "?",
            "base_url": info["base_url"],
            "description": "Meta-analyses / systematic reviews ingestion pipeline (tibok-meta-rag)",
            "update_frequency": "monthly",
            "is_active": True,
        }
        self.client.table("guidelines_sources").upsert(payload, on_conflict="code").execute()
        r = self.client.table("guidelines_sources").select("id").eq("code", code).single().execute()
        self.sources_cache[code] = r.data["id"]
        return self.sources_cache[code]

    def ensure_specialty(self, code: str) -> str:
        if code in self.specialties_cache:
            return self.specialties_cache[code]
        if self.dry_run:
            return f"dry-run-spec-{code}"
        # Every code this script can produce (specialty_map.py) was already
        # seeded by scripts/rag-ingest/ingest.py's CLINICAL_DOMAIN_TO_SPECIALTY
        # / NEW_SPECIALTY_LABELS. This upsert is a defensive no-op unless
        # that assumption ever breaks — falls back to code-as-label.
        payload = {"code": code, "name_en": code, "name_fr": code, "is_active": True}
        self.client.table("guidelines_specialties").upsert(payload, on_conflict="code").execute()
        r = self.client.table("guidelines_specialties").select("id").eq("code", code).single().execute()
        self.specialties_cache[code] = r.data["id"]
        return self.specialties_cache[code]

    def ingest_doc(self, doc: dict[str, Any], specialty_code: str) -> dict[str, Any]:
        source_id = self.ensure_source(doc["source"])
        specialty_id = self.ensure_specialty(specialty_code)
        external_id = external_id_for(doc)
        chunks = chunk_document(doc)

        if self.dry_run:
            return {"raw_id": "dry-run", "validated_id": "dry-run", "chunks_inserted": len(chunks)}

        # Step 1 — UPSERT guidelines_raw
        raw_payload = {
            "source_id": source_id,
            "specialty_id": specialty_id,
            "guideline_external_id": external_id,
            "title": doc["title"],
            "raw_content": (doc.get("abstract") or "") + "\n\n" + (doc.get("full_text") or ""),
            "source_url": doc.get("url", ""),
            "source_publication_date": f"{doc['year']}-01-01" if doc.get("year") else f"{datetime.now(timezone.utc).year}-01-01",
            "fetched_at": now_iso(),
            "fetched_by_run_id": INGEST_RUN_ID,
            "status": "validated",
            "validated_at": now_iso(),
            "extraction_method": doc["source"],
            "extraction_quality": "high" if doc.get("full_text_available") else "medium",
            "actual_source_pmid": doc.get("pmid"),
            "actual_source_pmcid": doc["doc_id"] if str(doc.get("doc_id", "")).startswith("PMC") else None,
            "commercial_use": "unknown",
            "legal_status": "open",
            "content_sha256": None,
        }
        r1 = self.client.table("guidelines_raw").upsert(
            raw_payload, on_conflict="source_id,guideline_external_id"
        ).execute()
        if r1.data:
            raw_id = r1.data[0]["id"]
        else:
            r1b = (
                self.client.table("guidelines_raw")
                .select("id")
                .eq("source_id", source_id)
                .eq("guideline_external_id", external_id)
                .single()
                .execute()
            )
            raw_id = r1b.data["id"]

        # Step 2 — cleanup old validated/chunks for idempotent re-runs
        old_v = self.client.table("guidelines_validated").select("id").eq("raw_id", raw_id).execute()
        old_validated_ids = [v["id"] for v in (old_v.data or [])]
        if old_validated_ids:
            self.client.table("guidelines_chunks").delete().in_("guideline_id", old_validated_ids).execute()
            self.client.table("guideline_content_kind").delete().in_("guideline_id", old_validated_ids).execute()
            self.client.table("guidelines_validated").delete().eq("raw_id", raw_id).execute()

        # Step 3 — INSERT guidelines_validated
        validated_payload = {
            "raw_id": raw_id,
            "source_id": source_id,
            "specialty_id": specialty_id,
            "guideline_external_id": external_id,
            "title": doc["title"],
            "validated_content": raw_payload["raw_content"],
            "chunks_generated": True,
            "chunks_count": len(chunks),
            "chunks_generated_at": now_iso(),
            "version_number": 1,
            "is_current": True,
        }
        r3 = self.client.table("guidelines_validated").insert(validated_payload).execute()
        if not r3.data:
            raise RuntimeError(f"guidelines_validated insert returned empty for {external_id}")
        validated_id = r3.data[0]["id"]

        # Step 3b — content_kind: ALWAYS 'recherche' for this pipeline.
        self.client.table("guideline_content_kind").upsert(
            {"guideline_id": validated_id, "kind": CONTENT_KIND}, on_conflict="guideline_id"
        ).execute()

        # Step 4 — INSERT chunks (embedding left NULL; a later batch pass —
        # scripts/rag-ingest/generate-embeddings.mjs, unmodified, already
        # fills any NULL embedding row regardless of which pipeline wrote
        # it — embeds these too. No new embedding script needed.)
        inserted = 0
        for batch_start in range(0, len(chunks), CHUNK_BATCH_SIZE):
            batch = chunks[batch_start : batch_start + CHUNK_BATCH_SIZE]
            payloads = [
                {
                    "guideline_id": validated_id,
                    "source_id": source_id,
                    "specialty_id": specialty_id,
                    "source_code": SOURCE_CODES[doc["source"]]["code"],
                    "specialty_code": specialty_code,
                    "chunk_index": chunk["chunk_index"],
                    "chunk_content": chunk["content"],
                    "chunk_metadata": {
                        "journal": doc.get("journal", ""),
                        "year": doc.get("year"),
                        "doc_type": doc.get("doc_type"),
                        "citation_count": doc.get("citation_count", 0),
                        "authors": doc.get("authors", [])[:5],
                    },
                }
                for chunk in batch
            ]
            self.client.table("guidelines_chunks").insert(payloads).execute()
            inserted += len(payloads)

        return {"raw_id": raw_id, "validated_id": validated_id, "chunks_inserted": inserted}


def iter_pathology_files(output_dir: Path, pathology_ids: list[str] | None):
    for path in sorted(output_dir.glob("*.json")):
        if path.stem == "_summary":
            continue
        if pathology_ids and path.stem not in pathology_ids:
            continue
        yield path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pathology", nargs="+", metavar="ID", default=None)
    parser.add_argument("--max-docs", type=int, default=0)
    dry_run_group = parser.add_mutually_exclusive_group()
    dry_run_group.add_argument("--dry-run", dest="dry_run", action="store_true", default=True)
    dry_run_group.add_argument("--no-dry-run", dest="dry_run", action="store_false")
    args = parser.parse_args()

    output_dir = Path(os.environ.get("META_RAG_OUTPUT_DIR", str(DEFAULT_OUTPUT_DIR)))
    if not output_dir.exists():
        print(f"❌ Output dir not found: {output_dir}", file=sys.stderr)
        return 1

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not args.dry_run and (not url or not key):
        print("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (required for --no-dry-run)", file=sys.stderr)
        return 1

    client = create_client(url, key) if url and key else None
    ingester = MetaAnalysisIngester(client, dry_run=args.dry_run)
    categories = load_pathology_categories()

    print("━━━ tibok-meta-rag → Supabase ingestion ━━━")
    print(f"Output dir : {output_dir}")
    print(f"Mode       : {'DRY-RUN (no writes)' if args.dry_run else 'LIVE WRITE'}")
    print(f"content_kind for every row: '{CONTENT_KIND}'")
    print()

    stats = {"pathologies": 0, "docs": 0, "ingested": 0, "failed": 0, "chunks": 0}
    failed: list[tuple[str, str]] = []
    t0 = time.time()

    for path in iter_pathology_files(output_dir, args.pathology):
        data = json.loads(path.read_text(encoding="utf-8"))
        pathology_id = data["pathology_id"]
        category = categories.get(pathology_id, "")
        specialty_code = specialty_for(pathology_id, category)
        stats["pathologies"] += 1

        docs = data.get("documents", [])
        if args.max_docs:
            docs = docs[: args.max_docs]

        for doc in docs:
            stats["docs"] += 1
            ident = f"{pathology_id}/{doc['doc_id']}"
            try:
                res = ingester.ingest_doc(doc, specialty_code)
                stats["ingested"] += 1
                stats["chunks"] += res["chunks_inserted"]
            except (APIError, Exception) as e:  # noqa: BLE001 — failsafe, continue on any per-doc error
                stats["failed"] += 1
                failed.append((ident, f"{type(e).__name__}: {e}"))
                print(f"❌ {ident}: {type(e).__name__}: {e}")
                if not isinstance(e, APIError):
                    traceback.print_exc()

        print(f"[{pathology_id}] specialty={specialty_code} docs={len(docs)}")

    elapsed = time.time() - t0
    print()
    print("─" * 70)
    print(f"Pathologies processed : {stats['pathologies']}")
    print(f"Docs scanned          : {stats['docs']}")
    print(f"  ✅ Ingested          : {stats['ingested']}")
    print(f"  ❌ Failed            : {stats['failed']}")
    print(f"Total chunks inserted : {stats['chunks']} (embedding=NULL — run generate-embeddings.mjs next)")
    print(f"Time elapsed          : {elapsed:.1f}s")
    print("─" * 70)

    if failed:
        print("\nFailed docs detail:")
        for ident, err in failed[:50]:
            print(f"  - {ident}: {err[:200]}")

    return 0 if stats["failed"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
