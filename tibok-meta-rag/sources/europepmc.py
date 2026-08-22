"""Europe PMC client — primary source for meta-analyses / systematic reviews.

Free, no API key, native JSON, and open-access full texts are exploitable
for text & data mining (TDM). See:
https://www.ebi.ac.uk/europepmc/webservices/rest/search
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from ratelimit import AsyncRateLimiter

logger = logging.getLogger("tibok_meta_rag.europepmc")

BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest"
PAGE_SIZE = 100
MAX_REQ_PER_SEC = 5

# Shared across all callers within a process so the 5 req/s ceiling is
# actually respected even when several pathologies are ingested concurrently.
_rate_limiter = AsyncRateLimiter(rate=MAX_REQ_PER_SEC, period=1.0)


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 500, 502, 503, 504)
    return isinstance(exc, (httpx.TransportError, httpx.TimeoutException))


def _retrying():
    return retry(
        reraise=True,
        retry=retry_if_exception(_is_retryable),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        stop=stop_after_attempt(5),
    )


def build_query(mesh_term: str, since_year: int | None = None, extra_query: str | None = None) -> str:
    """Build the Europe PMC query string for meta-analyses / systematic reviews."""
    q = (
        f'MESH:"{mesh_term}" AND '
        '(PUB_TYPE:"meta-analysis" OR PUB_TYPE:"systematic review")'
    )
    if since_year:
        q += f' AND (FIRST_PDATE:[{since_year}-01-01 TO 3000-12-31])'
    if extra_query:
        q += f" {extra_query}"
    return q


@_retrying()
async def _get(client: httpx.AsyncClient, url: str, params: dict[str, Any]) -> dict[str, Any]:
    await _rate_limiter.acquire()
    resp = await client.get(url, params=params, timeout=30.0)
    resp.raise_for_status()
    return resp.json()


async def search(
    client: httpx.AsyncClient,
    mesh_term: str,
    *,
    since_year: int | None = None,
    extra_query: str | None = None,
    max_results: int = 100,
) -> list[dict[str, Any]]:
    """Search Europe PMC and return raw `result` rows (resultType=core).

    Pages through the cursor-based API until `max_results` rows are collected
    or the corpus is exhausted.
    """
    query = build_query(mesh_term, since_year=since_year, extra_query=extra_query)
    rows: list[dict[str, Any]] = []
    cursor_mark = "*"

    while len(rows) < max_results:
        params = {
            "query": query,
            "format": "json",
            "pageSize": min(PAGE_SIZE, max_results - len(rows)),
            "resultType": "core",
            "cursorMark": cursor_mark,
        }
        try:
            data = await _get(client, f"{BASE_URL}/search", params)
        except (httpx.HTTPStatusError, httpx.TransportError, httpx.TimeoutException) as exc:
            logger.error("[europepmc] search failed for mesh=%r: %s", mesh_term, exc)
            break

        page = data.get("resultList", {}).get("result", [])
        rows.extend(page)

        next_cursor = data.get("nextCursorMark")
        if not page or not next_cursor or next_cursor == cursor_mark:
            break
        cursor_mark = next_cursor

    logger.info("[europepmc] mesh=%r -> %d raw rows", mesh_term, len(rows))
    return rows[:max_results]


async def fetch_full_text_xml(client: httpx.AsyncClient, pmcid: str) -> str | None:
    """Fetch the OA full-text XML for a hit, given its PMCID (e.g. "PMC1234567").

    Caller MUST have checked isOpenAccess == 'Y' first. Even then, a 404 is
    expected and normal: "isOpenAccess" means freely readable, which is a
    broader set than the TDM-mineable full-text subset this endpoint serves.
    """
    url = f"{BASE_URL}/{pmcid}/fullTextXML"
    try:
        await _rate_limiter.acquire()
        resp = await client.get(url, timeout=30.0)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.text
    except (httpx.HTTPStatusError, httpx.TransportError, httpx.TimeoutException) as exc:
        logger.warning("[europepmc] full-text fetch failed for %s: %s", pmcid, exc)
        return None


def xml_to_plain_text(xml_text: str) -> str | None:
    """Strip a JATS full-text XML document down to plain text (best effort)."""
    from xml.etree import ElementTree as ET

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("[europepmc] full-text XML parse error: %s", exc)
        return None
    text = " ".join(t.strip() for t in root.itertext() if t and t.strip())
    return text or None


def is_retracted(row: dict[str, Any]) -> bool:
    pub_types = [p.lower() for p in _pub_type_list(row)]
    return any("retract" in p for p in pub_types)


def _pub_type_list(row: dict[str, Any]) -> list[str]:
    pub_type_list = row.get("pubTypeList", {}).get("pubType", [])
    if isinstance(pub_type_list, str):
        return [pub_type_list]
    return list(pub_type_list or [])


def classify_doc_type(row: dict[str, Any]) -> str:
    pub_types = [p.lower() for p in _pub_type_list(row)]
    if any("meta-analysis" in p for p in pub_types):
        return "meta-analysis"
    if any("systematic review" in p for p in pub_types):
        return "systematic-review"
    return "other"


_TAG_RE = re.compile(r"<[^>]+>")
_H4_SPLIT_RE = re.compile(r"<h4>(.*?)</h4>", re.IGNORECASE | re.DOTALL)


def clean_abstract_html(raw: str) -> str:
    """Turn Europe PMC's `<h4>Label</h4>text` structured abstracts into
    plain "LABEL: text" sections (matching the PubMed abstract shape), and
    strip any other markup for records without section headings."""
    if not raw:
        return ""
    parts = _H4_SPLIT_RE.split(raw)
    if len(parts) == 1:
        return _TAG_RE.sub("", raw).strip()

    segments: list[str] = []
    pre_text = _TAG_RE.sub("", parts[0]).strip()
    if pre_text:
        segments.append(pre_text)
    for i in range(1, len(parts), 2):
        label = parts[i].strip().upper()
        text = _TAG_RE.sub("", parts[i + 1] if i + 1 < len(parts) else "").strip()
        if text:
            segments.append(f"{label}: {text}")
    return "\n".join(segments)


def to_document_dict(row: dict[str, Any]) -> dict[str, Any]:
    """Map a raw Europe PMC `result` row to the pipeline's Document fields."""
    authors = []
    author_list = row.get("authorList", {}).get("author", [])
    for a in author_list:
        name = a.get("fullName") or a.get("collectiveName")
        if name:
            authors.append(name)

    mesh_terms = []
    for m in row.get("meshHeadingList", {}).get("meshHeading", []):
        term = m.get("descriptorName")
        if term:
            mesh_terms.append(term)

    is_oa = row.get("isOpenAccess") == "Y"
    pmid = row.get("pmid")
    pmcid = row.get("pmcid")
    ext_id = row.get("id")
    source = row.get("source", "MED")
    doc_id = pmcid if pmcid else (f"PMID{pmid}" if pmid else f"{source}{ext_id}")

    year = None
    pub_year = row.get("pubYear")
    if pub_year and str(pub_year).isdigit():
        year = int(pub_year)

    # The fullTextXML endpoint is only reachable via the PMCID, not the
    # search hit's own source/id (e.g. "MED"/pmid) — those only resolve
    # metadata, not text-mined full text.
    full_text_pmcid = pmcid if (is_oa and pmcid) else None

    return {
        "doc_id": doc_id,
        "pmid": pmid,
        "doi": row.get("doi"),
        "title": row.get("title", "").strip(),
        "abstract": clean_abstract_html(row.get("abstractText") or ""),
        "conclusions": "",
        "full_text_available": is_oa,
        "full_text": None,  # filled in by caller if OA and requested
        "journal": row.get("journalInfo", {}).get("journal", {}).get("title", ""),
        "year": year,
        "authors": authors,
        "doc_type": classify_doc_type(row),
        "mesh_terms": mesh_terms,
        "source": "europepmc",
        "url": f"https://europepmc.org/article/{source}/{ext_id}" if ext_id else "",
        "langue": (row.get("language") or "en").lower()[:2],
        "citation_count": int(row.get("citedByCount") or 0),
        "retracted": is_retracted(row),
        "publication_types": _pub_type_list(row),
        # internal, used by full-text fetch step
        "_europepmc_pmcid": full_text_pmcid,
        "_europepmc_is_oa": is_oa,
    }
