#!/usr/bin/env python3
"""
ingest.py — Ingest Stéphane's medical guidelines into the TIBOK Supabase RAG.

Designed to run inside GitHub Actions (`.github/workflows/rag-ingest-tibok.yml`).
The data branch (`claude/medical-assistant-transparency-dv5S9`) is sparse-checked
out at `${RAG_SOURCE_DIR}` containing `*.json` per source.

Per doc, executes 4 steps via supabase-py (PostgREST):
    1. UPSERT guidelines_raw                    (idempotent on source_id, guideline_external_id)
    2. DELETE old guidelines_chunks + guidelines_validated for that raw_id
    3. INSERT guidelines_validated              (is_current=true, chunks_generated=true)
    4. INSERT guidelines_chunks                 (batches of 50, embedding NULL)

Sources / specialties are upserted lazily once per code (cached in memory).

Required env:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    RAG_SOURCE_DIR              path to extracted/*.json directory

Failsafe: any per-doc error is logged and the doc is skipped; the run continues.

CLI:
    --tier           {high|medium|low|all}  default high
    --max-docs N                             default 0 (no limit)
    --source X                               filter by source code
    --external-id X                          target a single doc by external_id
    --skip-first N                           skip the first N matching docs
    --dry-run                                no writes, only stats
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from supabase import Client, create_client
from postgrest.exceptions import APIError

# ============================================================================
# Configuration
# ============================================================================

INGEST_RUN_ID = "stephane_extraction_6295_20260511"
MEGANE_UUID = "76af3567-4789-4c5e-9d41-2940352e6986"

# Owner confirmed (2026-05-11): include ADA / GINA / ASCO / ESMO / GOLD.
# Previous run excluded them for Mauritius legal review; this run includes
# them with legal_status='gated' (derived from commercial_use) so they can
# be displayed with a license badge in the runtime.
EXCLUDED_SOURCES: set[str] = set()
GATED_SOURCES = {"NICE", "KDIGO", "EASL"}

CLINICAL_DOMAIN_TO_SPECIALTY = {
    "cardiology": "cardiology", "dermatology": "dermatology",
    "endocrinology": "endocrinology", "geriatrics": "geriatrics",
    "hepatology": "hepatology_gastro", "gastroenterology": "hepatology_gastro",
    "infectious": "infectious_diseases", "nephrology": "nephrology",
    "neurology": "neurology", "pediatrics": "pediatrics",
    "prevention": "preventive_medicine", "preventive": "preventive_medicine",
    "public_health": "preventive_medicine",
    "pulmonology": "pulmonology", "respiratory": "pulmonology",
    "gynecology": "women_health", "obstetrics": "women_health",
    "reproductive": "women_health",
    "emergency": "emergency_medicine", "critical_care": "emergency_medicine",
    "primary_care": "general_medicine", "care-org": "general_medicine",
    "pediatric_oncology": "oncology",
    "tropical_diseases": "tropical_diseases", "oncology": "oncology",
    "psychiatry": "psychiatry", "rheumatology": "rheumatology",
    "rare_diseases": "rare_diseases", "urology": "urology",
    "humanitarian": "humanitarian", "hematology": "hematology",
    "ent": "ent", "orthopedics": "orthopedics", "allergy": "allergy",
    "anesthesia": "anesthesia", "musculoskeletal": "musculoskeletal",
    "nutrition": "nutrition",
    "cardiothoracic_surgery": "cardiothoracic_surgery",
    "vascular_surgery": "vascular_surgery",
    "ophthalmology": "ophthalmology", "sleep": "sleep_medicine",
    "radiology": "radiology", "pain": "pain_management",
    "pharmacogenomics": "pharmacogenomics", "palliative": "palliative_care",
    "genetics": "genetics", "sports_medicine": "sports_medicine",
    "colorectal_surgery": "colorectal_surgery",
    "integrative": "integrative_medicine", "bariatric": "bariatric_surgery",
    "plastic_surgery": "plastic_surgery", "wound_care": "wound_care",
    "occupational": "occupational_medicine", "pathology": "pathology",
    "pharmacology": "pharmacology", "surgery": "general_surgery",
}

NEW_SPECIALTY_LABELS = {
    "tropical_diseases": ("Tropical Diseases", "Médecine tropicale"),
    "oncology": ("Oncology", "Oncologie"),
    "psychiatry": ("Psychiatry", "Psychiatrie"),
    "rheumatology": ("Rheumatology", "Rhumatologie"),
    "rare_diseases": ("Rare Diseases", "Maladies rares"),
    "urology": ("Urology", "Urologie"),
    "humanitarian": ("Humanitarian Medicine", "Médecine humanitaire"),
    "hematology": ("Hematology", "Hématologie"),
    "ent": ("Otolaryngology (ENT)", "ORL"),
    "orthopedics": ("Orthopedics", "Orthopédie"),
    "allergy": ("Allergology", "Allergologie"),
    "anesthesia": ("Anesthesiology", "Anesthésie"),
    "musculoskeletal": ("Musculoskeletal Medicine",
                        "Médecine de l'appareil locomoteur"),
    "nutrition": ("Nutrition", "Nutrition"),
    "cardiothoracic_surgery": ("Cardiothoracic Surgery",
                               "Chirurgie cardiothoracique"),
    "vascular_surgery": ("Vascular Surgery", "Chirurgie vasculaire"),
    "ophthalmology": ("Ophthalmology", "Ophtalmologie"),
    "sleep_medicine": ("Sleep Medicine", "Médecine du sommeil"),
    "radiology": ("Radiology", "Radiologie"),
    "pain_management": ("Pain Management", "Médecine de la douleur"),
    "pharmacogenomics": ("Pharmacogenomics", "Pharmacogénomique"),
    "palliative_care": ("Palliative Care", "Soins palliatifs"),
    "genetics": ("Medical Genetics", "Génétique médicale"),
    "sports_medicine": ("Sports Medicine", "Médecine du sport"),
    "colorectal_surgery": ("Colorectal Surgery", "Chirurgie colorectale"),
    "integrative_medicine": ("Integrative Medicine", "Médecine intégrative"),
    "bariatric_surgery": ("Bariatric Surgery", "Chirurgie bariatrique"),
    "plastic_surgery": ("Plastic Surgery", "Chirurgie plastique"),
    "wound_care": ("Wound Care", "Soins des plaies"),
    "occupational_medicine": ("Occupational Medicine", "Médecine du travail"),
    "pathology": ("Pathology", "Anatomopathologie"),
    "pharmacology": ("Pharmacology", "Pharmacologie"),
    "general_surgery": ("General Surgery", "Chirurgie générale"),
}

METHOD_TO_QUALITY = {
    "direct": "high", "pmc-xml": "medium",
    "openalex": "medium", "openalex+pmc-xml": "medium",
    "pubmed": "low", "extend-pubmed": "low", "final-pubmed": "low",
}

CHUNK_BATCH_SIZE = 50


# ============================================================================
# Pure helpers
# ============================================================================

def parse_pdf_source(pdf_source: str) -> tuple[str, str | None]:
    if not pdf_source:
        return ("unknown", None)
    if ":" in pdf_source:
        method, suffix = pdf_source.split(":", 1)
        return (method.strip(), suffix.strip() or None)
    return (pdf_source.strip(), None)


def compute_legal_status(source: str, commercial_use: str) -> str:
    if source in EXCLUDED_SOURCES:
        return "excluded"
    if source in GATED_SOURCES:
        return "gated"
    if (commercial_use or "").lower() == "allowed":
        return "open"
    return "gated"


def map_specialty(clinical_domain: str) -> str:
    # Passthrough: forward the raw clinical_domain (e.g. cardiology_hf,
    # ophthalmology_anterior) as specialty_code. ensure_specialty() creates
    # any missing row in guidelines_specialties on the fly, so the 470+
    # fine-grained domains shipped on this branch do not need to be folded
    # into the original 50-ish coarse codes.
    return clinical_domain or "general_medicine"


def extract_domain(url: str) -> str:
    if not url:
        return ""
    m = re.match(r"https?://([^/]+)", url)
    return f"https://{m.group(1)}" if m else ""


def parse_year_to_date(year: Any) -> str:
    try:
        y = int(str(year).strip())
        if 1900 <= y <= 2100:
            return f"{y}-01-01"
    except (ValueError, TypeError):
        pass
    return f"{datetime.now(timezone.utc).year}-01-01"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def process_doc(doc: dict) -> dict | None:
    source = doc.get("source", "")
    if not source:
        return None
    method, pmid = parse_pdf_source(doc.get("pdf_source", ""))
    quality = METHOD_TO_QUALITY.get(method, "low")
    legal_status = compute_legal_status(source, doc.get("commercial_use", ""))
    specialty_code = map_specialty(doc.get("clinical_domain", ""))
    raw_content = " ".join(c.get("content", "") for c in doc.get("chunks", []))
    return {
        "source": source,
        "external_id": doc.get("id", ""),
        "title": doc.get("title", "Untitled"),
        "year": doc.get("year", ""),
        "page_url": doc.get("page_url", ""),
        "license": doc.get("license", ""),
        "commercial_use": doc.get("commercial_use", ""),
        "clinical_domain": doc.get("clinical_domain", ""),
        "specialty_code": specialty_code,
        "sha256": doc.get("sha256", ""),
        "pmcid": doc.get("pmcid"),
        "pmid": pmid,
        "method": method,
        "quality": quality,
        "legal_status": legal_status,
        "extracted_at": doc.get("extracted_at"),
        "char_count": doc.get("char_count", 0),
        "raw_content": raw_content,
        "chunks": doc.get("chunks", []),
    }


# ============================================================================
# Ingester
# ============================================================================

class Ingester:
    def __init__(self, client: Client, dry_run: bool = False):
        self.client = client
        self.dry_run = dry_run
        self.sources_cache: dict[str, str] = {}      # code -> id
        self.specialties_cache: dict[str, str] = {}  # code -> id
        self.warmed = False

    def warm_caches(self) -> None:
        if self.warmed:
            return
        srcs = self.client.table("guidelines_sources").select("id,code").execute()
        for row in srcs.data or []:
            self.sources_cache[row["code"]] = row["id"]
        specs = self.client.table("guidelines_specialties").select("id,code").execute()
        for row in specs.data or []:
            self.specialties_cache[row["code"]] = row["id"]
        self.warmed = True
        print(f"   [cache] {len(self.sources_cache)} sources, "
              f"{len(self.specialties_cache)} specialties")

    def ensure_source(self, code: str, base_url: str) -> str:
        if code in self.sources_cache:
            return self.sources_cache[code]
        payload = {
            "code": code, "name": code, "full_name": code,
            "country": "?", "base_url": base_url,
            "description": "", "update_frequency": "monthly", "is_active": True,
        }
        if self.dry_run:
            print(f"   [dry-run] would insert source: {code}")
            return "dry-run-source-id"
        self.client.table("guidelines_sources").upsert(
            payload, on_conflict="code"
        ).execute()
        # Re-fetch (upsert may return [] when conflict + no change)
        r = self.client.table("guidelines_sources").select("id").eq("code", code).single().execute()
        sid = r.data["id"]
        self.sources_cache[code] = sid
        return sid

    def ensure_specialty(self, code: str) -> str:
        if code in self.specialties_cache:
            return self.specialties_cache[code]
        en, fr = NEW_SPECIALTY_LABELS.get(code, (code, code))
        payload = {
            "code": code, "name_en": en, "name_fr": fr, "is_active": True,
        }
        if self.dry_run:
            print(f"   [dry-run] would insert specialty: {code} ({en} / {fr})")
            return "dry-run-spec-id"
        self.client.table("guidelines_specialties").upsert(
            payload, on_conflict="code"
        ).execute()
        r = self.client.table("guidelines_specialties").select("id").eq("code", code).single().execute()
        sid = r.data["id"]
        self.specialties_cache[code] = sid
        return sid

    def ingest_doc(self, doc: dict) -> dict:
        source_id = self.ensure_source(doc["source"], extract_domain(doc["page_url"]))
        specialty_id = self.ensure_specialty(doc["specialty_code"])

        if self.dry_run:
            return {
                "raw_id": "dry-run",
                "validated_id": "dry-run",
                "chunks_inserted": len(doc["chunks"]),
            }

        # Step 1 — UPSERT guidelines_raw
        raw_payload = {
            "source_id": source_id,
            "specialty_id": specialty_id,
            "guideline_external_id": doc["external_id"],
            "title": doc["title"],
            "raw_content": doc["raw_content"],
            "source_url": doc["page_url"],
            "source_publication_date": parse_year_to_date(doc["year"]),
            "fetched_at": doc["extracted_at"] or now_iso(),
            "fetched_by_run_id": INGEST_RUN_ID,
            "status": "validated",
            "validated_at": now_iso(),
            "validated_by": MEGANE_UUID,
            "extraction_method": doc["method"],
            "extraction_quality": doc["quality"],
            "actual_source_pmid": doc["pmid"],
            "actual_source_pmcid": doc["pmcid"],
            "license_label": doc["license"],
            "commercial_use": doc["commercial_use"],
            "legal_status": doc["legal_status"],
            "content_sha256": doc["sha256"],
        }
        r1 = self.client.table("guidelines_raw").upsert(
            raw_payload, on_conflict="source_id,guideline_external_id"
        ).execute()
        if r1.data:
            raw_id = r1.data[0]["id"]
        else:
            r1b = (self.client.table("guidelines_raw")
                       .select("id")
                       .eq("source_id", source_id)
                       .eq("guideline_external_id", doc["external_id"])
                       .single()
                       .execute())
            raw_id = r1b.data["id"]

        # Step 2 — Cleanup old validated/chunks (idempotency)
        old_v = self.client.table("guidelines_validated").select("id").eq("raw_id", raw_id).execute()
        old_validated_ids = [v["id"] for v in (old_v.data or [])]
        if old_validated_ids:
            self.client.table("guidelines_chunks").delete().in_("guideline_id", old_validated_ids).execute()
            self.client.table("guidelines_validated").delete().eq("raw_id", raw_id).execute()

        # Step 3 — INSERT guidelines_validated
        validated_payload = {
            "raw_id": raw_id,
            "source_id": source_id,
            "specialty_id": specialty_id,
            "guideline_external_id": doc["external_id"],
            "title": doc["title"],
            "validated_content": doc["raw_content"],
            "validated_by": MEGANE_UUID,
            "chunks_generated": True,
            "chunks_count": len(doc["chunks"]),
            "chunks_generated_at": now_iso(),
            "version_number": 1,
            "is_current": True,
        }
        r3 = self.client.table("guidelines_validated").insert(validated_payload).execute()
        if not r3.data:
            raise RuntimeError(f"guidelines_validated insert returned empty for {doc['external_id']}")
        validated_id = r3.data[0]["id"]

        # Step 4 — INSERT chunks (batches)
        inserted = 0
        chunks = doc["chunks"]
        for batch_start in range(0, len(chunks), CHUNK_BATCH_SIZE):
            batch = chunks[batch_start:batch_start + CHUNK_BATCH_SIZE]
            payloads = []
            for chunk in batch:
                meta = {
                    "extraction_method": doc["method"],
                    "extraction_quality": doc["quality"],
                    "actual_source_pmid": doc["pmid"],
                    "actual_source_pmcid": doc["pmcid"],
                    "title_displayed": doc["title"],
                    "year": doc["year"],
                    "license": doc["license"],
                    "char_count_doc": doc["char_count"],
                }
                if doc["quality"] == "low":
                    meta["warning"] = (
                        "Content sourced via PubMed substitution. "
                        "Title may not match the official guideline."
                    )
                payloads.append({
                    "guideline_id": validated_id,
                    "source_id": source_id,
                    "specialty_id": specialty_id,
                    "source_code": doc["source"],
                    "specialty_code": doc["specialty_code"],
                    "chunk_index": int(chunk.get("chunk_index", batch_start)),
                    "chunk_content": chunk.get("content", ""),
                    "chunk_metadata": meta,
                })
            self.client.table("guidelines_chunks").insert(payloads).execute()
            inserted += len(payloads)

        return {"raw_id": raw_id, "validated_id": validated_id, "chunks_inserted": inserted}


# ============================================================================
# Main
# ============================================================================

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tier", choices=["high", "medium", "low", "all"], default="high")
    parser.add_argument("--max-docs", type=int, default=0)
    parser.add_argument("--source", type=str, default=None)
    parser.add_argument("--external-id", type=str, default=None)
    parser.add_argument("--skip-first", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    source_dir_env = os.environ.get("RAG_SOURCE_DIR")
    if not source_dir_env:
        print("❌ RAG_SOURCE_DIR env var not set", file=sys.stderr)
        return 1
    source_dir = Path(source_dir_env)
    if not source_dir.exists():
        print(f"❌ Source dir not found: {source_dir}", file=sys.stderr)
        return 1

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing", file=sys.stderr)
        return 1

    client = create_client(url, key)
    ingester = Ingester(client, dry_run=args.dry_run)

    print(f"━━━ {args.tier.upper()} TIER INGESTION ━━━")
    print(f"Source dir : {source_dir}")
    print(f"Run ID     : {INGEST_RUN_ID}")
    if args.dry_run:
        print("Mode       : DRY-RUN (no writes)")
    print()

    if not args.dry_run:
        try:
            ingester.warm_caches()
        except APIError as e:
            print(f"❌ Failed to warm caches (auth or schema issue): {e}", file=sys.stderr)
            return 1

    selected: list[dict] = []
    stats = {
        "scanned": 0, "skipped_legal": 0, "skipped_tier": 0,
        "skipped_source": 0, "skipped_external_id": 0, "skipped_first_n": 0,
        "ingested": 0, "failed": 0,
    }
    chunks_total = 0
    failed_docs: list[tuple[str, str]] = []
    matched_so_far = 0
    t0 = time.time()

    for fn in sorted(os.listdir(source_dir)):
        if fn.startswith("_") or not fn.endswith(".json"):
            continue
        with open(source_dir / fn, encoding="utf-8") as f:
            data = json.load(f)
        for raw_doc in data.get("documents", []):
            stats["scanned"] += 1
            doc = process_doc(raw_doc)
            if doc is None:
                continue
            if doc["legal_status"] == "excluded":
                stats["skipped_legal"] += 1
                continue
            if args.tier != "all" and doc["quality"] != args.tier:
                stats["skipped_tier"] += 1
                continue
            if args.source and doc["source"] != args.source:
                stats["skipped_source"] += 1
                continue
            if args.external_id and doc["external_id"] != args.external_id:
                stats["skipped_external_id"] += 1
                continue
            matched_so_far += 1
            if matched_so_far <= args.skip_first:
                stats["skipped_first_n"] += 1
                continue
            selected.append(doc)
            if args.max_docs and len(selected) >= args.max_docs:
                break
        if args.max_docs and len(selected) >= args.max_docs:
            break

    print(f"Scanned       : {stats['scanned']}")
    print(f"Skip legal    : {stats['skipped_legal']}")
    print(f"Skip tier     : {stats['skipped_tier']}")
    if args.source:
        print(f"Skip source   : {stats['skipped_source']}")
    if args.external_id:
        print(f"Skip ext-id   : {stats['skipped_external_id']}")
    if args.skip_first:
        print(f"Skip first {args.skip_first}: {stats['skipped_first_n']}")
    print(f"Selected      : {len(selected)} doc(s) / "
          f"{sum(len(d['chunks']) for d in selected)} chunks")
    print()

    if args.dry_run:
        print("DRY-RUN: showing first 5 selected:")
        for d in selected[:5]:
            print(f"  - {d['source']}/{d['external_id']} | "
                  f"{d['method']}/{d['quality']}/{d['legal_status']} | "
                  f"specialty={d['specialty_code']} | chunks={len(d['chunks'])} | "
                  f"title={d['title'][:80]}")
        return 0

    for idx, doc in enumerate(selected, 1):
        ident = f"{doc['source']}/{doc['external_id']}"
        try:
            t = time.time()
            res = ingester.ingest_doc(doc)
            elapsed = time.time() - t
            stats["ingested"] += 1
            chunks_total += res["chunks_inserted"]
            print(f"[{idx}/{len(selected)}] ✅ {ident:30s} "
                  f"{doc['method']}/{doc['quality']:6s} "
                  f"{res['chunks_inserted']:3d} chunks  ({elapsed:5.1f}s)")
        except APIError as e:
            stats["failed"] += 1
            failed_docs.append((ident, f"APIError {getattr(e, 'code', '?')}: {e}"))
            print(f"[{idx}/{len(selected)}] ❌ {ident:30s} APIError: {e}")
        except Exception as e:
            stats["failed"] += 1
            failed_docs.append((ident, str(e)))
            print(f"[{idx}/{len(selected)}] ❌ {ident:30s} {type(e).__name__}: {e}")
            traceback.print_exc()

    elapsed_total = time.time() - t0
    print()
    print("─" * 70)
    print(f"Tier requested        : {args.tier}")
    print(f"Total docs scanned    : {stats['scanned']}")
    print(f"Skipped (legal)       : {stats['skipped_legal']}")
    print(f"Skipped (tier filter) : {stats['skipped_tier']}")
    print(f"Selected              : {len(selected)}")
    print(f"  ✅ Ingested          : {stats['ingested']}")
    print(f"  ❌ Failed            : {stats['failed']}")
    print(f"Total chunks inserted : {chunks_total}")
    print(f"Time elapsed          : {elapsed_total:.1f}s ({elapsed_total/60:.1f} min)")
    print("─" * 70)

    if failed_docs:
        print()
        print("Failed docs detail:")
        for ident, err in failed_docs:
            print(f"  - {ident}: {err[:200]}")

    return 0 if stats["failed"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
