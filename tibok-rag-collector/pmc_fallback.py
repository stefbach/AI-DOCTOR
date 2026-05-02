#!/usr/bin/env python3
"""
PMC Fallback Module — NCBI E-utilities
=======================================
When direct download fails (paywall, anti-bot, broken URL), this module
finds an Open Access mirror of the article on PubMed Central (PMC).

Pipeline:
    1. esearch on PubMed: find PMID matching the title + year
    2. elink: convert PMID -> PMCID (only if article is in PMC)
    3. fetch PMC landing page: extract direct PDF URL
    4. caller (download_guidelines.py) downloads from NIH

API rate limiting:
    - Without API key: 3 requests/sec
    - With NCBI_API_KEY env var: 10 requests/sec
    - Free key: https://www.ncbi.nlm.nih.gov/account/

References:
    https://www.ncbi.nlm.nih.gov/books/NBK25500/

Author: built for Stéphane Bach / TIBOK
"""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

log = logging.getLogger("tibok-pmc")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PMC_BASE = "https://www.ncbi.nlm.nih.gov/pmc"
NCBI_API_KEY = os.environ.get("NCBI_API_KEY", "")
NCBI_EMAIL = os.environ.get("NCBI_EMAIL", "contact@tibok.mu")
NCBI_TOOL = "tibok-rag-collector"

# Polite per-call delay
_LAST_CALL = 0.0
_MIN_INTERVAL = 0.35 if NCBI_API_KEY else 1.0  # 10/s with key, 1/s without


def _throttle() -> None:
    global _LAST_CALL
    elapsed = time.monotonic() - _LAST_CALL
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _LAST_CALL = time.monotonic()


def _ncbi_params(extra: Optional[dict] = None) -> dict:
    """Standard NCBI E-utility parameters (with optional API key)."""
    p = {
        "tool": NCBI_TOOL,
        "email": NCBI_EMAIL,
    }
    if NCBI_API_KEY:
        p["api_key"] = NCBI_API_KEY
    if extra:
        p.update(extra)
    return p


# ---------------------------------------------------------------------------
# Title normalization (for PubMed search)
# ---------------------------------------------------------------------------
def _normalize_title(title: str) -> str:
    """Strip punctuation that confuses PubMed query parser, lowercase."""
    # Replace : / | etc with spaces, then collapse whitespace
    cleaned = re.sub(r"[^\w\s]", " ", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    return cleaned


# ---------------------------------------------------------------------------
# Step 1: esearch — find a PMID
# ---------------------------------------------------------------------------
def search_pubmed(session: requests.Session, title: str,
                  year: str) -> Optional[str]:
    """
    Search PubMed for a guideline by title + year. Returns the first PMID
    or None if not found.

    Strategy:
        1. Strict search with publication-type filter (Guideline OR
           Practice Guideline) to avoid commentaries/reviews.
        2. If empty, fallback to loose search (no PT filter).
    """
    norm_title = _normalize_title(title)

    # Strict query: title + year + publication type filter
    strict_term = (
        f'({norm_title})[Title] AND '
        f'({year}[Date - Publication]) AND '
        f'("Guideline"[Publication Type] OR '
        f'"Practice Guideline"[Publication Type])'
    )
    pmid = _do_esearch(session, strict_term)
    if pmid:
        return pmid

    # Fallback: loose query without PT filter
    loose_term = f'({norm_title})[Title] AND ({year}[Date - Publication])'
    return _do_esearch(session, loose_term)


def _do_esearch(session: requests.Session, term: str) -> Optional[str]:
    _throttle()
    url = f"{NCBI_BASE}/esearch.fcgi"
    params = _ncbi_params({
        "db": "pubmed",
        "term": term,
        "retmode": "json",
        "retmax": 5,
        "sort": "relevance",
    })
    try:
        r = session.get(url, params=params, timeout=30)
        if r.status_code != 200:
            log.warning("esearch HTTP %d for term: %s", r.status_code, term[:80])
            return None
        data = r.json()
        idlist = data.get("esearchresult", {}).get("idlist", [])
        if idlist:
            return idlist[0]
        return None
    except Exception as e:
        log.warning("esearch failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Step 2: elink — PMID -> PMCID
# ---------------------------------------------------------------------------
def pmid_to_pmcid(session: requests.Session, pmid: str) -> Optional[str]:
    """
    Use elink to find the PMC ID for a PubMed article (if it's in PMC).
    Returns "PMC<digits>" or None.
    """
    _throttle()
    url = f"{NCBI_BASE}/elink.fcgi"
    params = _ncbi_params({
        "dbfrom": "pubmed",
        "db": "pmc",
        "id": pmid,
        "retmode": "json",
    })
    try:
        r = session.get(url, params=params, timeout=30)
        if r.status_code != 200:
            log.warning("elink HTTP %d for PMID %s", r.status_code, pmid)
            return None
        data = r.json()
        for linkset in data.get("linksets", []):
            for db in linkset.get("linksetdbs", []):
                if db.get("dbto") == "pmc":
                    links = db.get("links", [])
                    if links:
                        # Links are bare numeric IDs; prefix with PMC
                        return f"PMC{links[0]}"
        return None
    except Exception as e:
        log.warning("elink failed for PMID %s: %s", pmid, e)
        return None


# ---------------------------------------------------------------------------
# Step 3: scrape PMC landing page for PDF URL
# ---------------------------------------------------------------------------
def fetch_pmc_pdf_url(session: requests.Session, pmcid: str) -> str:
    """
    Find the direct PDF URL for a PMC article.

    Tries (in order):
        1. <meta name="citation_pdf_url"> in the HTML (most reliable)
        2. Any <a href> matching /pmc/articles/<PMCID>/pdf/ pattern
        3. Fallback: predictable URL /pmc/articles/<PMCID>/pdf/

    Always returns a URL — even if scraping fails, the predictable
    fallback URL has a high success rate on NIH.
    """
    landing_url = f"{PMC_BASE}/articles/{pmcid}/"

    _throttle()
    try:
        r = session.get(landing_url, timeout=30)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")

            # 1. citation_pdf_url meta tag
            meta = soup.find("meta", attrs={"name": "citation_pdf_url"})
            if meta and meta.get("content"):
                return meta["content"]

            # 2. <a href> matching the standard PMC PDF URL pattern
            pattern = re.compile(rf"/pmc/articles/{pmcid}/pdf/")
            for a in soup.find_all("a", href=True):
                if pattern.search(a["href"]):
                    return urljoin("https://www.ncbi.nlm.nih.gov", a["href"])
    except Exception as e:
        log.warning("fetch_pmc_pdf_url scrape failed for %s: %s", pmcid, e)

    # 3. Fallback: predictable path (often works)
    return f"{PMC_BASE}/articles/{pmcid}/pdf/"


# ---------------------------------------------------------------------------
# Public API: full pipeline
# ---------------------------------------------------------------------------
def find_pmc_mirror(session: requests.Session, title: str, year: str,
                    source: Optional[str] = None) -> Optional[dict]:
    """
    Find an Open Access PMC mirror for a guideline.

    Returns:
        {
            "pmid": "12345678",
            "pmcid": "PMC7734661",
            "pdf_url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC.../pdf/...",
        }
        or None if no PMC mirror was found.
    """
    pmid = search_pubmed(session, title, year)
    if not pmid:
        log.info("[PMC] No PubMed match for: %s (%s)", title[:60], year)
        return None

    pmcid = pmid_to_pmcid(session, pmid)
    if not pmcid:
        log.info("[PMC] PMID %s found but no PMC deposit", pmid)
        return None

    pdf_url = fetch_pmc_pdf_url(session, pmcid)
    log.info("[PMC] %s -> %s -> %s", pmid, pmcid, pdf_url)
    return {
        "pmid": pmid,
        "pmcid": pmcid,
        "pdf_url": pdf_url,
    }
