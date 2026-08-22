"""Deduplication, filtering and priority scoring for retrieved documents.

Weighting (per the ingestion spec):
  - recent year:            40%
  - citation_count:         25%
  - top-tier journal:       20% (Cochrane / BMJ / Lancet / JAMA / NEJM)
  - full-text OA available: 15%
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

TOP_JOURNALS = ("cochrane", "bmj", "lancet", "jama", "nejm", "new england journal of medicine")

EXCLUDED_PUBLICATION_TYPES = (
    "retracted publication",
    "letter",
    "comment",
    "editorial",
    "erratum",
    "published erratum",
    "news",
)

WEIGHT_YEAR = 0.40
WEIGHT_CITATIONS = 0.25
WEIGHT_JOURNAL = 0.20
WEIGHT_FULL_TEXT = 0.15

RECENCY_WINDOW_YEARS = 10


def normalize_title(title: str) -> str:
    t = title.lower().strip()
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t)
    return t


def is_excluded(doc: dict[str, Any]) -> bool:
    """Letters, errata, retractions — never index these."""
    if doc.get("retracted"):
        return True
    pub_types = [p.lower() for p in doc.get("publication_types", [])]
    return any(excluded in p for p in pub_types for excluded in EXCLUDED_PUBLICATION_TYPES)


def _merge(primary: dict[str, Any], secondary: dict[str, Any]) -> dict[str, Any]:
    """Merge two records judged to be the same document. `primary` wins ties."""
    merged = dict(primary)
    for key in ("abstract", "conclusions", "journal", "url", "full_text"):
        if not merged.get(key) and secondary.get(key):
            merged[key] = secondary[key]
    if not merged.get("full_text_available") and secondary.get("full_text_available"):
        merged["full_text_available"] = True
        merged["full_text"] = merged.get("full_text") or secondary.get("full_text")
    if not merged.get("year") and secondary.get("year"):
        merged["year"] = secondary["year"]
    if not merged.get("pmid") and secondary.get("pmid"):
        merged["pmid"] = secondary["pmid"]
    if not merged.get("doi") and secondary.get("doi"):
        merged["doi"] = secondary["doi"]
    merged["citation_count"] = max(merged.get("citation_count", 0) or 0, secondary.get("citation_count", 0) or 0)
    merged["mesh_terms"] = sorted(set(merged.get("mesh_terms", [])) | set(secondary.get("mesh_terms", [])))
    merged["authors"] = merged.get("authors") or secondary.get("authors", [])
    return merged


def dedupe(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Dedup by DOI first, then by normalized title for DOI-less records.

    When two raw rows collide (typically the same paper from Europe PMC and
    PubMed), they are merged rather than one being dropped outright, so the
    surviving record has the union of available metadata.
    """
    by_doi: dict[str, dict[str, Any]] = {}
    no_doi: list[dict[str, Any]] = []

    for doc in documents:
        doi = (doc.get("doi") or "").strip().lower()
        if doi:
            if doi in by_doi:
                by_doi[doi] = _merge(by_doi[doi], doc)
            else:
                by_doi[doi] = doc
        else:
            no_doi.append(doc)

    by_title: dict[str, dict[str, Any]] = {}
    for doc in no_doi:
        key = normalize_title(doc.get("title", ""))
        if not key:
            continue
        if key in by_title:
            by_title[key] = _merge(by_title[key], doc)
        else:
            by_title[key] = doc

    return list(by_doi.values()) + list(by_title.values())


def _year_score(year: int | None, current_year: int) -> float:
    if not year:
        return 0.0
    age = current_year - year
    if age <= 0:
        return 1.0
    if age >= RECENCY_WINDOW_YEARS:
        return 0.0
    return 1.0 - (age / RECENCY_WINDOW_YEARS)


def _citation_score(citation_count: int, max_citations: int) -> float:
    if max_citations <= 0:
        return 0.0
    # log-scale so a handful of highly-cited outliers don't flatten the rest
    import math

    return math.log1p(citation_count) / math.log1p(max_citations)


def _journal_score(journal: str) -> float:
    j = (journal or "").lower()
    return 1.0 if any(top in j for top in TOP_JOURNALS) else 0.0


def _full_text_score(doc: dict[str, Any]) -> float:
    return 1.0 if doc.get("full_text_available") else 0.0


def score_document(doc: dict[str, Any], *, max_citations: int, current_year: int | None = None) -> float:
    current_year = current_year or datetime.now(timezone.utc).year
    return (
        WEIGHT_YEAR * _year_score(doc.get("year"), current_year)
        + WEIGHT_CITATIONS * _citation_score(doc.get("citation_count", 0) or 0, max_citations)
        + WEIGHT_JOURNAL * _journal_score(doc.get("journal", ""))
        + WEIGHT_FULL_TEXT * _full_text_score(doc)
    )


def rank_and_select(
    documents: list[dict[str, Any]],
    *,
    max_docs: int = 25,
    current_year: int | None = None,
) -> list[dict[str, Any]]:
    """Full pipeline: exclude -> dedupe -> score -> sort desc -> top N."""
    filtered = [d for d in documents if not is_excluded(d)]
    deduped = dedupe(filtered)

    max_citations = max((d.get("citation_count", 0) or 0 for d in deduped), default=0)
    for doc in deduped:
        doc["score"] = round(score_document(doc, max_citations=max_citations, current_year=current_year), 4)

    deduped.sort(key=lambda d: d["score"], reverse=True)
    return deduped[:max_docs]
