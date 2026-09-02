#!/usr/bin/env python3
"""TIBOK meta-analysis RAG ingestion pipeline — CLI orchestrator.

For each pathology, retrieves the best meta-analyses / systematic reviews
from Europe PMC (primary) and PubMed (fallback/complement), enriches missing
full texts via Unpaywall, dedupes, scores and writes output/{pathology_id}.json.

Usage:
    python ingest.py --all
    python ingest.py --pathology dt2 hta
    python ingest.py --pilot
    python ingest.py --since 2026-07-01
    python ingest.py --all --max-docs 15
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import re
import statistics
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from pydantic import ValidationError

from models import Document, IngestSummary, Pathology, PathologyOutput, PathologySummary
from scoring import rank_and_select
from sources import europepmc, pubmed, unpaywall

ROOT = Path(__file__).parent
PATHOLOGIES_FILE = ROOT / "pathologies.json"
OUTPUT_DIR = ROOT / "output"
LOGS_DIR = ROOT / "logs"

DEFAULT_MAX_DOCS = 25
DEFAULT_SINCE_YEAR = 2016
PATHOLOGY_CONCURRENCY = 4

CONCLUSION_LABEL_RE = re.compile(
    r"(?:^|\n)\s*(conclusion|conclusions|interpretation)\s*[:\-]\s*(.+?)(?=\n\s*[A-Z][a-zA-Z ]{2,20}\s*[:\-]|\Z)",
    re.IGNORECASE | re.DOTALL,
)

logger = logging.getLogger("tibok_meta_rag")


# ============================================================================
# Logging
# ============================================================================

def setup_logging() -> Path:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / f"ingest_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.log"

    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    fmt = logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s")

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(fmt)
    logger.addHandler(console_handler)

    # Also route the sources' loggers to the same handlers.
    for name in ("tibok_meta_rag.europepmc", "tibok_meta_rag.pubmed", "tibok_meta_rag.unpaywall"):
        sub_logger = logging.getLogger(name)
        sub_logger.setLevel(logging.INFO)
        sub_logger.handlers.clear()
        sub_logger.addHandler(file_handler)
        sub_logger.addHandler(console_handler)
        sub_logger.propagate = False

    return log_file


# ============================================================================
# Pathology selection
# ============================================================================

def load_pathologies() -> list[Pathology]:
    raw = json.loads(PATHOLOGIES_FILE.read_text(encoding="utf-8"))
    return [Pathology.model_validate(row) for row in raw]


def select_pathologies(
    all_pathologies: list[Pathology],
    *,
    pathology_ids: list[str] | None,
    pilot: bool,
    select_all: bool,
) -> list[Pathology]:
    if pathology_ids:
        by_id = {p.pathology_id: p for p in all_pathologies}
        missing = [pid for pid in pathology_ids if pid not in by_id]
        if missing:
            raise SystemExit(f"Unknown pathology_id(s): {', '.join(missing)}")
        return [by_id[pid] for pid in pathology_ids]
    if pilot:
        return [p for p in all_pathologies if p.pilot]
    if select_all:
        return all_pathologies
    # --since alone (no explicit selector) drives the monthly incremental cron
    # over the whole catalogue.
    return all_pathologies


# ============================================================================
# Conclusions extraction (best-effort, from the structured abstract text)
# ============================================================================

def extract_conclusions(abstract: str) -> str:
    if not abstract:
        return ""
    match = CONCLUSION_LABEL_RE.search(abstract)
    if match:
        return match.group(2).strip()
    return ""


# ============================================================================
# Per-pathology retrieval
# ============================================================================

async def fetch_pathology_documents(
    client: httpx.AsyncClient,
    pathology: Pathology,
    *,
    since_year: int | None,
    fetch_pool_size: int,
) -> list[dict[str, Any]]:
    """Run Europe PMC + PubMed concurrently and return raw Document dicts."""
    europepmc_task = europepmc.search(
        client,
        pathology.mesh,
        since_year=since_year,
        extra_query=pathology.extra_query,
        max_results=fetch_pool_size,
    )
    pubmed_task = pubmed.search(
        client,
        pathology.mesh,
        since_year=since_year,
        extra_query=pathology.extra_query,
        max_results=fetch_pool_size,
    )
    europepmc_rows, pubmed_docs = await asyncio.gather(europepmc_task, pubmed_task)

    europepmc_docs = [europepmc.to_document_dict(row) for row in europepmc_rows]

    logger.info(
        "[%s] retrieved europepmc=%d pubmed=%d (before dedup)",
        pathology.pathology_id,
        len(europepmc_docs),
        len(pubmed_docs),
    )
    return europepmc_docs + pubmed_docs


async def hydrate_full_text(client: httpx.AsyncClient, selected: list[dict[str, Any]]) -> None:
    """Fetch OA full-text XML for the final top-N Europe PMC docs only.

    Bounded to the docs that actually survived scoring, so full-text fetch
    cost scales with --max-docs rather than the raw candidate pool.
    """
    for doc in selected:
        if doc.get("source") != "europepmc" or not doc.get("_europepmc_is_oa"):
            continue
        pmcid = doc.get("_europepmc_pmcid")
        if not pmcid:
            continue
        xml_text = await europepmc.fetch_full_text_xml(client, pmcid)
        if xml_text:
            doc["full_text"] = europepmc.xml_to_plain_text(xml_text)

    # Unpaywall enrichment for anything still lacking a full-text flag.
    await unpaywall.enrich_missing_full_text(client, selected)

    for doc in selected:
        if not doc.get("conclusions"):
            doc["conclusions"] = extract_conclusions(doc.get("abstract", ""))
        # Strip internal bookkeeping fields before validation/output.
        for internal_key in list(doc.keys()):
            if internal_key.startswith("_"):
                doc.pop(internal_key, None)


def load_existing_output(pathology_id: str) -> list[dict[str, Any]]:
    path = OUTPUT_DIR / f"{pathology_id}.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("documents", [])
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("[%s] could not read existing output (%s) — starting fresh", pathology_id, exc)
        return []


def write_pathology_output(pathology_id: str, documents: list[dict[str, Any]]) -> PathologyOutput:
    validated_docs = []
    for doc in documents:
        try:
            validated_docs.append(Document.model_validate(doc))
        except ValidationError as exc:
            logger.error("[%s] dropping malformed document %r: %s", pathology_id, doc.get("doc_id"), exc)

    output = PathologyOutput(
        pathology_id=pathology_id,
        generated_at=datetime.now(timezone.utc),
        documents=validated_docs,
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"{pathology_id}.json"
    out_path.write_text(output.model_dump_json(indent=2), encoding="utf-8")
    logger.info("[%s] wrote %d documents -> %s", pathology_id, len(validated_docs), out_path)
    return output


async def process_pathology(
    client: httpx.AsyncClient,
    pathology: Pathology,
    *,
    since_year: int | None,
    max_docs: int,
    semaphore: asyncio.Semaphore,
) -> PathologyOutput | None:
    async with semaphore:
        try:
            raw_docs = await fetch_pathology_documents(
                client, pathology, since_year=since_year, fetch_pool_size=max(max_docs * 4, 40)
            )
            existing_docs = load_existing_output(pathology.pathology_id)
            combined = existing_docs + raw_docs

            before = len(combined)
            selected = rank_and_select(combined, max_docs=max_docs)
            logger.info(
                "[%s] %d candidates (incl. %d existing) -> %d selected after dedup/scoring",
                pathology.pathology_id,
                before,
                len(existing_docs),
                len(selected),
            )

            await hydrate_full_text(client, selected)
            return write_pathology_output(pathology.pathology_id, selected)
        except Exception:
            logger.exception("[%s] ingestion failed", pathology.pathology_id)
            return None


# ============================================================================
# Summary report
# ============================================================================

def build_summary() -> IngestSummary:
    pathology_summaries: list[PathologySummary] = []
    total_documents = 0
    errors: list[str] = []

    for path in sorted(OUTPUT_DIR.glob("*.json")):
        if path.name == "_summary.json":
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            errors.append(f"{path.name}: {exc}")
            continue

        documents = data.get("documents", [])
        doc_count = len(documents)
        total_documents += doc_count
        oa_count = sum(1 for d in documents if d.get("full_text_available"))
        years = [d["year"] for d in documents if d.get("year")]
        sources: dict[str, int] = {}
        for d in documents:
            sources[d.get("source", "unknown")] = sources.get(d.get("source", "unknown"), 0) + 1

        pathology_summaries.append(
            PathologySummary(
                pathology_id=data.get("pathology_id", path.stem),
                doc_count=doc_count,
                pct_full_text_oa=round(100 * oa_count / doc_count, 1) if doc_count else 0.0,
                median_year=statistics.median(years) if years else None,
                sources=sources,
            )
        )

    return IngestSummary(
        generated_at=datetime.now(timezone.utc),
        pathologies=pathology_summaries,
        total_documents=total_documents,
        errors=errors,
    )


def write_summary() -> Path:
    summary = build_summary()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summary_path = OUTPUT_DIR / "_summary.json"
    summary_path.write_text(summary.model_dump_json(indent=2), encoding="utf-8")
    logger.info(
        "Summary: %d pathologies, %d total documents -> %s",
        len(summary.pathologies),
        summary.total_documents,
        summary_path,
    )
    return summary_path


# ============================================================================
# CLI
# ============================================================================

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    selector = parser.add_mutually_exclusive_group()
    selector.add_argument("--all", action="store_true", help="Ingest all pathologies")
    selector.add_argument("--pathology", nargs="+", metavar="ID", help="Ingest only these pathology_id(s)")
    selector.add_argument("--pilot", action="store_true", help="Ingest only the 15 pilot pathologies")
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Incremental mode: only consider literature published since this date (YYYY-MM-DD)",
    )
    parser.add_argument("--max-docs", type=int, default=DEFAULT_MAX_DOCS, help=f"Max docs kept per pathology (default {DEFAULT_MAX_DOCS})")
    return parser.parse_args(argv)


def resolve_since_year(since: str | None) -> int | None:
    if not since:
        return DEFAULT_SINCE_YEAR
    try:
        return date.fromisoformat(since).year
    except ValueError:
        raise SystemExit(f"--since must be YYYY-MM-DD, got {since!r}")


async def run(args: argparse.Namespace) -> None:
    all_pathologies = load_pathologies()
    selected = select_pathologies(
        all_pathologies,
        pathology_ids=args.pathology,
        pilot=args.pilot,
        select_all=args.all,
    )
    since_year = resolve_since_year(args.since)

    logger.info(
        "Starting ingestion: %d pathologies, since_year=%s, max_docs=%d",
        len(selected),
        since_year,
        args.max_docs,
    )

    semaphore = asyncio.Semaphore(PATHOLOGY_CONCURRENCY)
    headers = {"User-Agent": "tibok-meta-rag/1.0 (TIBOK AI Doctor RAG ingestion)"}
    async with httpx.AsyncClient(headers=headers) as client:
        tasks = [
            process_pathology(client, pathology, since_year=since_year, max_docs=args.max_docs, semaphore=semaphore)
            for pathology in selected
        ]
        await asyncio.gather(*tasks)

    write_summary()


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    log_file = setup_logging()
    logger.info("Log file: %s", log_file)
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
