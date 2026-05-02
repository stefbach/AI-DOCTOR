#!/usr/bin/env python3
"""
TIBOK RAG — Medical Guidelines PDF Downloader
==============================================
Downloads ~287 clinical guidelines (NICE, USPSTF, CDC, ECDC, WHO, HAS,
KDIGO, GOLD, GINA, ESC, AHA, ADA, IDSA, EASL, ERS) into a structured
folder ready for RAG ingestion.

Usage:
    python download_guidelines.py --csv guidelines_master.csv --out ./pdfs
    python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --source HAS
    python download_guidelines.py --csv guidelines_master.csv --out ./pdfs --commercial-only

Outputs:
    ./pdfs/<SOURCE>/<ID>.pdf       — downloaded PDFs
    ./pdfs/manifest.json           — RAG-ready manifest with metadata
    ./pdfs/download_log.csv        — success/failure log
    ./pdfs/failed.csv              — failures only (re-runnable)

Author: built for Stéphane Bach / TIBOK
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# Optional PMC fallback (NCBI E-utilities)
try:
    from pmc_fallback import find_pmc_mirror
    PMC_AVAILABLE = True
except ImportError:
    PMC_AVAILABLE = False
    find_pmc_mirror = None  # type: ignore

# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------
import os
USER_AGENT = os.environ.get(
    "TIBOK_USER_AGENT",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36",
)
TIMEOUT = 60  # seconds per HTTP request
RETRY_MAX = 3
RETRY_BACKOFF = 5  # seconds, doubled on each retry
RATE_LIMIT_PER_DOMAIN = 1.5  # seconds between requests to same domain
MAX_WORKERS = 4  # parallel downloads (keep low to be polite)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("tibok-dl")


# ----------------------------------------------------------------------
# Per-domain rate limiter
# ----------------------------------------------------------------------
class DomainRateLimiter:
    """Polite rate limiting: minimum delay between requests to same host."""

    def __init__(self, min_interval: float = RATE_LIMIT_PER_DOMAIN):
        self.min_interval = min_interval
        self._last: dict[str, float] = {}

    def wait(self, url: str) -> None:
        host = urlparse(url).netloc
        now = time.monotonic()
        last = self._last.get(host, 0.0)
        wait = (last + self.min_interval) - now
        if wait > 0:
            time.sleep(wait)
        self._last[host] = time.monotonic()


RATE = DomainRateLimiter()


# ----------------------------------------------------------------------
# HTTP helpers
# ----------------------------------------------------------------------
def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9,fr;q=0.8",
    })
    return s


def fetch(session: requests.Session, url: str,
          stream: bool = False) -> Optional[requests.Response]:
    """GET with retry + rate limiting. Returns Response or None."""
    last_exc = None
    backoff = RETRY_BACKOFF
    for attempt in range(1, RETRY_MAX + 1):
        try:
            RATE.wait(url)
            resp = session.get(url, timeout=TIMEOUT, stream=stream,
                               allow_redirects=True)
            if resp.status_code == 200:
                return resp
            if resp.status_code in (429, 503):
                log.warning("Rate-limited (%d) on %s — sleeping %ds",
                            resp.status_code, url, backoff)
                time.sleep(backoff)
                backoff *= 2
                continue
            log.warning("HTTP %d for %s", resp.status_code, url)
            return resp
        except requests.RequestException as e:
            last_exc = e
            log.warning("Attempt %d/%d failed for %s: %s",
                        attempt, RETRY_MAX, url, e)
            time.sleep(backoff)
            backoff *= 2
    log.error("All retries failed for %s: %s", url, last_exc)
    return None


# ----------------------------------------------------------------------
# Per-source PDF URL resolvers
# ----------------------------------------------------------------------
def resolve_nice(session: requests.Session, page_url: str) -> Optional[str]:
    """NICE: scrape /resources/...-pdf-<id> link on guidance page."""
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='/resources/']"):
        href = a.get("href", "")
        if re.search(r"-pdf-\d+$", href):
            return urljoin(page_url, href)
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def resolve_uspstf(session: requests.Session, page_url: str) -> Optional[str]:
    """USPSTF: 'Download Final Recommendation Statement (PDF)' link."""
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='RecommendationStatementFinal']"):
        href = a.get("href", "")
        full = urljoin(page_url, href)
        if full.endswith(".pdf"):
            return full
        sub = fetch(session, full)
        if sub and sub.status_code == 200:
            ssoup = BeautifulSoup(sub.text, "html.parser")
            for sa in ssoup.select("a[href$='.pdf']"):
                return urljoin(full, sa["href"])
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def resolve_cdc_mmwr(session: requests.Session, page_url: str) -> Optional[str]:
    """CDC MMWR: PDF link on the article page."""
    if page_url.endswith(".pdf"):
        return page_url
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='.pdf']"):
        href = a["href"]
        if "rr" in href.lower() or "wr" in href.lower():
            return urljoin(page_url, href)
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def resolve_ecdc(session: requests.Session, page_url: str) -> Optional[str]:
    """ECDC: PDF link on publications-data page."""
    if page_url.endswith(".pdf"):
        return page_url
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='/sites/default/files/'][href$='.pdf']"):
        return urljoin(page_url, a["href"])
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def resolve_who(session: requests.Session, page_url: str) -> Optional[str]:
    """WHO: 'Download' button on publications/i/item page IRIS PDF."""
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='iris.who.int']"):
        href = a["href"]
        if ".pdf" in href.lower() or "bitstream" in href.lower():
            return urljoin(page_url, href)
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def resolve_has(session: requests.Session, page_url: str) -> Optional[str]:
    """HAS: PDF on /upload/docs/application/pdf/..."""
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    candidates = []
    for a in soup.select("a[href*='/upload/docs/application/pdf/']"):
        href = a["href"]
        if href.lower().endswith(".pdf"):
            candidates.append(urljoin(page_url, href))
    if not candidates:
        return None
    for kw in ("recommandation", "guide", "synthese", "rapport"):
        for c in candidates:
            if kw in c.lower():
                return c
    return candidates[0]


def resolve_oxford_academic(session: requests.Session,
                             page_url: str) -> Optional[str]:
    """Oxford Academic (eurheartj, cid): article-pdf link."""
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='/article-pdf/']"):
        return urljoin(page_url, a["href"])
    if "/article/" in page_url:
        guess = page_url.replace("/article/", "/article-pdf/")
        return guess
    return None


def resolve_ahajournals(session: requests.Session,
                        page_url: str) -> Optional[str]:
    """AHA Journals: /doi/pdf/<doi> link."""
    if "/doi/" in page_url and "/pdf/" not in page_url:
        return page_url.replace("/doi/", "/doi/pdf/")
    return page_url


def resolve_diabetesjournals(session: requests.Session,
                              page_url: str) -> Optional[str]:
    """ADA Diabetes Journals (Silverchair): scrape PDF link."""
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='article-pdf']"):
        return urljoin(page_url, a["href"])
    return None


def resolve_idsa(session: requests.Session, page_url: str) -> Optional[str]:
    """IDSA: either oxford academic, idsociety.org, or external."""
    if "academic.oup.com" in page_url:
        return resolve_oxford_academic(session, page_url)
    if page_url.endswith(".pdf"):
        return page_url
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def resolve_easl(session: requests.Session, page_url: str) -> Optional[str]:
    """EASL Journal of Hepatology: /article/<id>/pdf link."""
    r = fetch(session, page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href$='/pdf'], a[href*='/pdf']"):
        href = a["href"]
        if "fulltext" not in href:
            return urljoin(page_url, href)
    if "/fulltext" in page_url:
        return page_url.replace("/fulltext", "/pdf")
    return None


def resolve_ers(session: requests.Session, page_url: str) -> Optional[str]:
    """ERS publications: full.pdf suffix."""
    if page_url.endswith(".pdf"):
        return page_url
    if not page_url.endswith(".full.pdf"):
        return page_url + ".full.pdf"
    return page_url


def resolve_kdigo(session: requests.Session, page_url: str) -> Optional[str]:
    """KDIGO: hint URL is already the PDF."""
    return page_url if page_url.endswith(".pdf") else None


def resolve_direct(session: requests.Session, page_url: str) -> Optional[str]:
    """Generic: page_url is already a PDF."""
    return page_url if page_url.endswith(".pdf") else None


SOURCE_RESOLVERS = {
    "NICE": resolve_nice,
    "USPSTF": resolve_uspstf,
    "CDC": resolve_cdc_mmwr,
    "ECDC": resolve_ecdc,
    "WHO": resolve_who,
    "HAS": resolve_has,
    "KDIGO": resolve_kdigo,
    "GOLD": resolve_direct,
    "GINA": resolve_direct,
    "ESC": resolve_oxford_academic,
    "AHA": resolve_ahajournals,
    "ADA": resolve_diabetesjournals,
    "IDSA": resolve_idsa,
    "EASL": resolve_easl,
    "ERS": resolve_ers,
}


# ----------------------------------------------------------------------
# Download orchestration
# ----------------------------------------------------------------------
@dataclass
class DownloadResult:
    id: str
    source: str
    title: str
    year: str
    page_url: str
    pdf_url: Optional[str]
    pdf_source: str       # "direct" | "pmc" | "manual"
    pmcid: Optional[str]  # populated if pdf_source == "pmc"
    local_path: Optional[str]
    sha256: Optional[str]
    size_bytes: Optional[int]
    status: str           # "ok" | "no_pdf" | "http_error" | "exception"
    error: Optional[str]
    license: str
    commercial_use: str
    clinical_domain: str
    priority: str


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download_one(row: dict, out_dir: Path,
                 session: requests.Session,
                 use_pmc_fallback: bool = True) -> DownloadResult:
    src = row["source"]
    gid = row["id"]
    page_url = row["page_url"].strip()
    pdf_hint = row.get("pdf_url_hint", "").strip()

    base = DownloadResult(
        id=gid, source=src, title=row["title"], year=row["year"],
        page_url=page_url, pdf_url=None, pdf_source="direct", pmcid=None,
        local_path=None, sha256=None, size_bytes=None,
        status="exception", error=None,
        license=row["license"], commercial_use=row["commercial_use"],
        clinical_domain=row["clinical_domain"], priority=row["priority"],
    )

    src_dir = out_dir / src
    src_dir.mkdir(parents=True, exist_ok=True)
    target = src_dir / f"{gid}.pdf"

    if target.exists() and target.stat().st_size > 1024:
        log.info("[%s] already downloaded (%d bytes), skipping",
                 gid, target.stat().st_size)
        base.local_path = str(target)
        base.sha256 = sha256_of(target)
        base.size_bytes = target.stat().st_size
        base.status = "ok"
        return base

    try:
        # 1. Try direct download
        pdf_url = pdf_hint or None
        if not pdf_url:
            resolver = SOURCE_RESOLVERS.get(src, resolve_direct)
            pdf_url = resolver(session, page_url)

        if pdf_url:
            base.pdf_url = pdf_url
            ok = _download_to(session, pdf_url, target, gid)
            if ok:
                base.local_path = str(target)
                base.sha256 = sha256_of(target)
                base.size_bytes = target.stat().st_size
                base.status = "ok"
                base.pdf_source = "direct"
                log.info("[%s] OK (direct) — %s (%d KB)",
                         gid, target.name, base.size_bytes // 1024)
                return base

        # 2. Direct failed — try PMC fallback
        if use_pmc_fallback and PMC_AVAILABLE:
            log.info("[%s] direct download failed, trying PMC fallback...",
                     gid)
            pmc = find_pmc_mirror(session, row["title"], row["year"], src)
            if pmc and pmc.get("pdf_url"):
                base.pdf_url = pmc["pdf_url"]
                base.pmcid = pmc["pmcid"]
                ok = _download_to(session, pmc["pdf_url"], target, gid)
                if ok:
                    base.local_path = str(target)
                    base.sha256 = sha256_of(target)
                    base.size_bytes = target.stat().st_size
                    base.status = "ok"
                    base.pdf_source = "pmc"
                    log.info("[%s] OK (PMC %s) — %s (%d KB)",
                             gid, pmc["pmcid"], target.name,
                             base.size_bytes // 1024)
                    return base

        # 3. Both failed
        if not pdf_url and not (use_pmc_fallback and PMC_AVAILABLE):
            base.status = "no_pdf"
            base.error = "Could not resolve PDF URL"
        elif not pdf_url:
            base.status = "no_pdf"
            base.error = "No direct PDF URL and no PMC mirror found"
        else:
            base.status = "http_error"
            base.error = "Direct + PMC fallback both failed"
        log.warning("[%s] %s — %s", gid, row["title"][:60], base.error)
        return base

    except Exception as e:
        base.status = "exception"
        base.error = f"{type(e).__name__}: {e}"
        log.error("[%s] EXCEPTION: %s", gid, e)
        return base


def _download_to(session: requests.Session, url: str, target: Path,
                 gid: str) -> bool:
    """Download a URL to target file. Returns True on success."""
    resp = fetch(session, url, stream=True)
    if resp is None or resp.status_code != 200:
        return False
    ctype = resp.headers.get("Content-Type", "").lower()
    if "html" in ctype and "pdf" not in ctype:
        log.warning("[%s] got HTML instead of PDF from %s", gid, url)
        return False
    try:
        with open(target, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 14):
                if chunk:
                    f.write(chunk)
        size = target.stat().st_size
        if size < 1024:
            log.warning("[%s] PDF too small (%d bytes), discarding",
                        gid, size)
            target.unlink(missing_ok=True)
            return False
        with open(target, "rb") as f:
            magic = f.read(5)
        if not magic.startswith(b"%PDF-"):
            log.warning("[%s] not a valid PDF (magic=%r), discarding",
                        gid, magic)
            target.unlink(missing_ok=True)
            return False
        return True
    except Exception as e:
        log.warning("[%s] write failed: %s", gid, e)
        target.unlink(missing_ok=True)
        return False


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--csv", required=True, type=Path,
                   help="Path to guidelines_master.csv")
    p.add_argument("--out", required=True, type=Path,
                   help="Output directory for PDFs and manifest")
    p.add_argument("--source", default=None,
                   help="Filter by source (e.g. HAS, USPSTF)")
    p.add_argument("--commercial-only", action="store_true",
                   help="Only download licenses allowing commercial use")
    p.add_argument("--priority", default=None,
                   choices=("high", "medium", "low"),
                   help="Filter by priority")
    p.add_argument("--workers", type=int, default=MAX_WORKERS,
                   help=f"Parallel downloads (default {MAX_WORKERS})")
    p.add_argument("--no-pmc", action="store_true",
                   help="Disable PMC fallback when direct download fails")
    p.add_argument("--dry-run", action="store_true",
                   help="Print what would be downloaded, don't fetch")
    args = p.parse_args()

    if not args.csv.exists():
        log.error("CSV not found: %s", args.csv)
        return 1

    args.out.mkdir(parents=True, exist_ok=True)

    with open(args.csv, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    if args.source:
        rows = [r for r in rows if r["source"] == args.source]
    if args.commercial_only:
        rows = [r for r in rows if r["commercial_use"] == "allowed"]
    if args.priority:
        rows = [r for r in rows if r["priority"] == args.priority]

    log.info("Selected %d guidelines for download", len(rows))

    if args.dry_run:
        for r in rows:
            print(f"  {r['id']:12s} [{r['commercial_use']:10s}] "
                  f"{r['source']:8s} — {r['title'][:80]}")
        return 0

    use_pmc = not args.no_pmc and PMC_AVAILABLE
    if args.no_pmc:
        log.info("PMC fallback DISABLED (--no-pmc)")
    elif not PMC_AVAILABLE:
        log.warning("PMC fallback module not available (pmc_fallback.py missing)")
    else:
        log.info("PMC fallback ENABLED (NCBI E-utilities)")

    session = make_session()
    results: list[DownloadResult] = []

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(download_one, r, args.out, session, use_pmc): r
                   for r in rows}
        for fut in as_completed(futures):
            results.append(fut.result())

    # Manifest
    n_ok = sum(1 for r in results if r.status == "ok")
    n_pmc = sum(1 for r in results if r.status == "ok" and r.pdf_source == "pmc")
    n_direct = n_ok - n_pmc
    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(results),
        "ok": n_ok,
        "ok_direct": n_direct,
        "ok_pmc": n_pmc,
        "no_pdf": sum(1 for r in results if r.status == "no_pdf"),
        "http_error": sum(1 for r in results if r.status == "http_error"),
        "exception": sum(1 for r in results if r.status == "exception"),
        "documents": [asdict(r) for r in sorted(results, key=lambda x: x.id)],
    }
    manifest_path = args.out / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    log.info("Manifest written: %s", manifest_path)

    log_path = args.out / "download_log.csv"
    with open(log_path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(asdict(results[0]).keys()))
        w.writeheader()
        for r in sorted(results, key=lambda x: x.id):
            w.writerow(asdict(r))

    failed = [r for r in results if r.status != "ok"]
    if failed:
        fail_path = args.out / "failed.csv"
        with open(fail_path, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(asdict(failed[0]).keys()))
            w.writeheader()
            for r in sorted(failed, key=lambda x: x.id):
                w.writerow(asdict(r))
        log.warning("%d failures logged in %s", len(failed), fail_path)

    log.info("=" * 60)
    log.info("DONE — total=%d  ok=%d (direct=%d, pmc=%d)  "
             "no_pdf=%d  http_error=%d  exception=%d",
             manifest["total"], manifest["ok"],
             manifest["ok_direct"], manifest["ok_pmc"],
             manifest["no_pdf"], manifest["http_error"],
             manifest["exception"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
