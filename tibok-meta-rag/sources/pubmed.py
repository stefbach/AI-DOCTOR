"""PubMed E-utilities client — fallback / complement to Europe PMC.

esearch.fcgi finds PMIDs, efetch.fcgi (retmode=xml) returns the full
MEDLINE record we parse for metadata + abstract.
"""

from __future__ import annotations

import logging
import os
from typing import Any
from xml.etree import ElementTree as ET

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from ratelimit import AsyncRateLimiter

logger = logging.getLogger("tibok_meta_rag.pubmed")

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
EFETCH_BATCH_SIZE = 200

_rate_limiter: AsyncRateLimiter | None = None


def _get_rate_limiter() -> AsyncRateLimiter:
    """Lazily built so NCBI_API_KEY set after import (e.g. in tests) still applies."""
    global _rate_limiter
    if _rate_limiter is None:
        rate = 10.0 if os.environ.get("NCBI_API_KEY") else 3.0
        _rate_limiter = AsyncRateLimiter(rate=rate, period=1.0)
    return _rate_limiter


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


def _common_params() -> dict[str, str]:
    params = {}
    api_key = os.environ.get("NCBI_API_KEY")
    if api_key:
        params["api_key"] = api_key
    tool = os.environ.get("NCBI_TOOL", "tibok-meta-rag")
    email = os.environ.get("UNPAYWALL_EMAIL") or os.environ.get("NCBI_EMAIL")
    params["tool"] = tool
    if email:
        params["email"] = email
    return params


def build_query(mesh_term: str, since_year: int | None = 2016, extra_query: str | None = None) -> str:
    end_year = "3000"
    start_year = since_year or 2016
    q = f'"{mesh_term}"[Mesh] AND (meta-analysis[pt] OR systematic review[pt])'
    q += f' AND ("{start_year}"[dp] : "{end_year}"[dp])'
    if extra_query:
        q += f" {extra_query}"
    return q


@_retrying()
async def _get(client: httpx.AsyncClient, url: str, params: dict[str, Any]) -> httpx.Response:
    await _get_rate_limiter().acquire()
    resp = await client.get(url, params=params, timeout=30.0)
    resp.raise_for_status()
    return resp


async def esearch(
    client: httpx.AsyncClient,
    mesh_term: str,
    *,
    since_year: int | None = 2016,
    extra_query: str | None = None,
    max_results: int = 100,
) -> list[str]:
    """Return a list of PMIDs matching the query."""
    params = {
        **_common_params(),
        "db": "pubmed",
        "term": build_query(mesh_term, since_year=since_year, extra_query=extra_query),
        "retmode": "json",
        "retmax": str(max_results),
        "sort": "relevance",
    }
    try:
        resp = await _get(client, f"{BASE_URL}/esearch.fcgi", params)
    except (httpx.HTTPStatusError, httpx.TransportError, httpx.TimeoutException) as exc:
        logger.error("[pubmed] esearch failed for mesh=%r: %s", mesh_term, exc)
        return []
    data = resp.json()
    ids = data.get("esearchresult", {}).get("idlist", [])
    logger.info("[pubmed] mesh=%r -> %d PMIDs", mesh_term, len(ids))
    return ids


async def efetch(client: httpx.AsyncClient, pmids: list[str]) -> list[dict[str, Any]]:
    """Fetch and parse full MEDLINE records for a batch of PMIDs."""
    documents: list[dict[str, Any]] = []
    for i in range(0, len(pmids), EFETCH_BATCH_SIZE):
        batch = pmids[i : i + EFETCH_BATCH_SIZE]
        params = {
            **_common_params(),
            "db": "pubmed",
            "id": ",".join(batch),
            "retmode": "xml",
        }
        try:
            resp = await _get(client, f"{BASE_URL}/efetch.fcgi", params)
        except (httpx.HTTPStatusError, httpx.TransportError, httpx.TimeoutException) as exc:
            logger.error("[pubmed] efetch failed for batch starting %s: %s", batch[0], exc)
            continue
        documents.extend(_parse_efetch_xml(resp.text))
    return documents


def _text(el: ET.Element | None) -> str:
    return (el.text or "").strip() if el is not None else ""


def _parse_abstract(article: ET.Element) -> str:
    parts = []
    for ab in article.findall(".//Abstract/AbstractText"):
        label = ab.get("Label")
        text = "".join(ab.itertext()).strip()
        if not text:
            continue
        parts.append(f"{label}: {text}" if label else text)
    return "\n".join(parts)


def _parse_year(article: ET.Element) -> int | None:
    year_el = article.find(".//Journal/JournalIssue/PubDate/Year")
    if year_el is not None and _text(year_el).isdigit():
        return int(_text(year_el))
    medline_date = _text(article.find(".//Journal/JournalIssue/PubDate/MedlineDate"))
    if medline_date and medline_date[:4].isdigit():
        return int(medline_date[:4])
    return None


def _parse_authors(article: ET.Element) -> list[str]:
    authors = []
    for author in article.findall(".//AuthorList/Author"):
        collective = _text(author.find("CollectiveName"))
        if collective:
            authors.append(collective)
            continue
        last = _text(author.find("LastName"))
        initials = _text(author.find("Initials"))
        if last:
            authors.append(f"{last} {initials}".strip())
    return authors


def _parse_mesh_terms(article: ET.Element) -> list[str]:
    return [
        _text(d)
        for d in article.findall(".//MeshHeadingList/MeshHeading/DescriptorName")
        if _text(d)
    ]


def _parse_doi(pubmed_article: ET.Element) -> str | None:
    for aid in pubmed_article.findall(".//ArticleIdList/ArticleId"):
        if aid.get("IdType") == "doi" and _text(aid):
            return _text(aid)
    for eloc in pubmed_article.findall(".//ELocationID"):
        if eloc.get("EIdType") == "doi" and _text(eloc):
            return _text(eloc)
    return None


def _parse_publication_types(article: ET.Element) -> list[str]:
    return [_text(pt) for pt in article.findall(".//PublicationTypeList/PublicationType") if _text(pt)]


def classify_doc_type(publication_types: list[str]) -> str:
    lowered = [p.lower() for p in publication_types]
    if any("meta-analysis" in p for p in lowered):
        return "meta-analysis"
    if any("systematic review" in p for p in lowered):
        return "systematic-review"
    return "other"


def is_retracted(publication_types: list[str]) -> bool:
    return any("retracted" in p.lower() for p in publication_types)


def _parse_efetch_xml(xml_text: str) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.error("[pubmed] efetch XML parse error: %s", exc)
        return documents

    for pubmed_article in root.findall(".//PubmedArticle"):
        article = pubmed_article.find(".//Article")
        if article is None:
            continue
        pmid = _text(pubmed_article.find(".//MedlineCitation/PMID"))
        publication_types = _parse_publication_types(article)
        documents.append(
            {
                "doc_id": f"PMID{pmid}" if pmid else "",
                "pmid": pmid or None,
                "doi": _parse_doi(pubmed_article),
                "title": _text(article.find("ArticleTitle")),
                "abstract": _parse_abstract(article),
                "conclusions": "",
                "full_text_available": False,
                "full_text": None,
                "journal": _text(article.find(".//Journal/Title")) or _text(article.find(".//Journal/ISOAbbreviation")),
                "year": _parse_year(article),
                "authors": _parse_authors(article),
                "doc_type": classify_doc_type(publication_types),
                "mesh_terms": _parse_mesh_terms(pubmed_article.find(".//MedlineCitation") or pubmed_article),
                "source": "pubmed",
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else "",
                "langue": (_text(article.find(".//Language")) or "en").lower()[:2],
                "citation_count": 0,  # PubMed does not expose citation counts
                "retracted": is_retracted(publication_types),
                "publication_types": publication_types,
            }
        )
    logger.info("[pubmed] parsed %d records from efetch batch", len(documents))
    return documents


async def search(
    client: httpx.AsyncClient,
    mesh_term: str,
    *,
    since_year: int | None = 2016,
    extra_query: str | None = None,
    max_results: int = 100,
) -> list[dict[str, Any]]:
    """esearch then efetch — returns Document-shaped dicts."""
    pmids = await esearch(
        client, mesh_term, since_year=since_year, extra_query=extra_query, max_results=max_results
    )
    if not pmids:
        return []
    return await efetch(client, pmids)
