#!/usr/bin/env python3
"""
retry_missing.py — Aggressive recovery of guidelines that failed direct/PMC.

Strategies (tried in order):
  1. OpenAlex API (https://api.openalex.org) — free, returns OA URLs
  2. Unpaywall API (https://api.unpaywall.org) — free with email
  3. Source-specific scraping:
     - HAS: scrape /upload/docs/application/pdf/ from page + jcms r_/c_ docs
     - WHO: follow IRIS bitstream chain
     - KDIGO: scrape kdigo.org/guidelines index
     - USPSTF: try alternative URL patterns
     - CDC: try MMWR PDF naming convention
     - ECDC: scrape sub-pages
  4. PubMed search with looser query (title only, no PT filter, no date)

Usage:
    python3 tibok-rag-collector/retry_missing.py
"""
import csv
import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, quote_plus

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent.parent
CSV_PATH = ROOT / "tibok-rag-collector" / "guidelines_master.csv"
EXTRACT_DIR = ROOT / "tibok-rag-collector" / "extracted"
PDF_DIR = ROOT / "tibok-rag-collector" / "pdfs"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0"
EMAIL = "contact@tibok.mu"
HEADERS = {"User-Agent": UA, "Accept": "*/*"}
TIMEOUT = 60

last_call = {}


def throttle(domain, interval=1.0):
    now = time.monotonic()
    last = last_call.get(domain, 0)
    wait = (last + interval) - now
    if wait > 0:
        time.sleep(wait)
    last_call[domain] = time.monotonic()


def fetch(url, **kwargs):
    from urllib.parse import urlparse
    throttle(urlparse(url).netloc, 1.0)
    try:
        return requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True, **kwargs)
    except Exception as e:
        print(f"      fetch error: {e}")
        return None


def extract_text_from_pdf(path):
    try:
        r = subprocess.run(["pdftotext", "-layout", "-q", str(path), "-"],
                           capture_output=True, timeout=180, text=True, errors="replace")
        return r.stdout
    except Exception:
        return ""


def fetch_pmc_xml_text(pmcid):
    pmc_num = pmcid.replace("PMC", "")
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={pmc_num}&rettype=xml"
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200 or len(r.content) < 1000:
            return ""
        soup = BeautifulSoup(r.content, "html.parser")
        for tag in soup(["xref", "fig", "table-wrap", "graphic", "tex-math", "ref-list",
                          "back", "front-stub", "license-p"]):
            tag.decompose()
        body = soup.find("body")
        text = body.get_text(" ", strip=True) if body else soup.get_text(" ", strip=True)
        return re.sub(r"\s+", " ", text).strip()
    except Exception as e:
        print(f"      efetch error: {e}")
        return ""


def chunk(text, size=800, overlap=100):
    text = re.sub(r"\s+", " ", text).strip()
    words = text.split()
    out = []
    for i in range(0, len(words), size - overlap):
        s = words[i:i + size]
        if len(s) < 30:
            break
        out.append({"chunk_index": len(out), "content": " ".join(s)})
    return out


def sha_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


# ─── Strategy 1: OpenAlex API ───────────────────────────────────────────────
def search_openalex(title, year=None):
    """Returns OA PDF URL if available."""
    throttle("api.openalex.org", 0.3)
    q = quote_plus(title[:200])
    url = f"https://api.openalex.org/works?search={q}&per-page=3&mailto={EMAIL}"
    if year:
        url += f"&filter=publication_year:{year}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return None
        data = r.json()
        for work in data.get("results", []):
            oa = work.get("open_access", {})
            if oa.get("oa_url"):
                # Verify it ends with .pdf or content-type
                pdf_url = oa["oa_url"]
                if "pmc" in pdf_url.lower():
                    # extract PMC ID
                    m = re.search(r"PMC(\d+)", pdf_url)
                    if m:
                        return {"pmcid": f"PMC{m.group(1)}", "via": "openalex+pmc"}
                return {"pdf_url": pdf_url, "via": "openalex"}
            # Try primary location
            loc = work.get("primary_location", {}) or {}
            pdf = loc.get("pdf_url")
            if pdf:
                return {"pdf_url": pdf, "via": "openalex-primary"}
    except Exception as e:
        print(f"      OpenAlex error: {e}")
    return None


# ─── Strategy 2: Unpaywall API ───────────────────────────────────────────────
def search_unpaywall_by_doi(doi):
    if not doi:
        return None
    throttle("api.unpaywall.org", 0.3)
    url = f"https://api.unpaywall.org/v2/{doi}?email={EMAIL}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return None
        data = r.json()
        best = data.get("best_oa_location") or {}
        if best.get("url_for_pdf"):
            return {"pdf_url": best["url_for_pdf"], "via": "unpaywall"}
        for loc in data.get("oa_locations", []):
            if loc.get("url_for_pdf"):
                return {"pdf_url": loc["url_for_pdf"], "via": "unpaywall"}
    except Exception:
        pass
    return None


def extract_doi_from_url(url):
    m = re.search(r"10\.\d{4,9}/[^\s/?#]+", url)
    return m.group(0).rstrip(".,;)") if m else None


# ─── Strategy 3a: HAS aggressive scraping ────────────────────────────────────
def has_resolve(page_url, title):
    """HAS uses Jalios CMS — try multiple patterns."""
    r = fetch(page_url)
    if not r or r.status_code != 200:
        return None

    # Look for upload/docs PDFs
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='/upload/docs/application/pdf/']"):
        href = a.get("href", "")
        if href.lower().endswith(".pdf"):
            return urljoin(page_url, href)

    # HAS jcms format: try /jcms/<id>/file
    jcms_ids = re.findall(r"/jcms/(r_[a-z0-9_]+|c_\d+|p_\d+)", r.text)
    candidates = []
    for jid in set(jcms_ids):
        # HAS download URL pattern
        candidates.append(f"https://www.has-sante.fr/jcms/{jid}?download=true")
        candidates.append(f"https://www.has-sante.fr/jcms/{jid}/file")
    for url in candidates[:8]:
        rr = fetch(url, stream=False)
        if rr and rr.status_code == 200 and rr.headers.get("Content-Type", "").lower().startswith("application/pdf"):
            return url

    # Fallback: look for "_documents" tab URL or "fiche-doc" pattern
    for a in soup.select("a[href*='/jcms/']"):
        href = a.get("href", "")
        text = a.get_text(strip=True).lower()
        if any(k in text for k in ["pdf", "télécharger", "rapport", "recommandation", "document"]):
            full = urljoin(page_url, href)
            if full != page_url:
                # Try fetching this sub-page for PDFs
                rr = fetch(full)
                if rr and rr.status_code == 200:
                    sub = BeautifulSoup(rr.text, "html.parser")
                    for a2 in sub.select("a[href*='/upload/docs/application/pdf/']"):
                        href2 = a2.get("href", "")
                        if href2.lower().endswith(".pdf"):
                            return urljoin(full, href2)
    return None


# ─── Strategy 3b: WHO IRIS chain ────────────────────────────────────────────
def who_resolve(page_url):
    """Follow WHO publications page to IRIS bitstream PDF."""
    r = fetch(page_url)
    if not r or r.status_code != 200:
        return None
    # Look for any iris.who.int link
    for m in re.finditer(r'https?://iris\.who\.int/[^\s"\']+', r.text):
        u = m.group(0)
        if "bitstream" in u or u.endswith(".pdf"):
            return u

    # Try IRIS handle pattern: ISBN -> /handle/10665/<n>
    isbn = re.search(r'\b(978\d{10}|9789\d{9})\b', page_url + " " + r.text)
    if isbn:
        # try IRIS search
        s_url = f"https://iris.who.int/discover?query={isbn.group(0)}"
        r2 = fetch(s_url)
        if r2 and r2.status_code == 200:
            soup = BeautifulSoup(r2.text, "html.parser")
            for a in soup.select("a[href*='/handle/']"):
                handle = urljoin("https://iris.who.int", a["href"])
                rh = fetch(handle)
                if rh:
                    soup2 = BeautifulSoup(rh.text, "html.parser")
                    for a2 in soup2.select("a[href*='bitstream']"):
                        if a2["href"].lower().endswith(".pdf"):
                            return urljoin(handle, a2["href"])
    return None


# ─── Strategy 3c: KDIGO scrape index ────────────────────────────────────────
KDIGO_INDEX_CACHE = None


def kdigo_resolve(title):
    global KDIGO_INDEX_CACHE
    if KDIGO_INDEX_CACHE is None:
        r = fetch("https://kdigo.org/guidelines/")
        if not r or r.status_code != 200:
            KDIGO_INDEX_CACHE = []
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        # Find all PDF links in current guidelines page
        KDIGO_INDEX_CACHE = []
        for a in soup.select("a[href*='wp-content/uploads/'][href$='.pdf']"):
            KDIGO_INDEX_CACHE.append({
                "url": urljoin("https://kdigo.org/", a["href"]),
                "text": a.get_text(strip=True).lower()
            })
    # Match by keywords
    t_lower = title.lower()
    keywords = [w for w in re.findall(r"[a-z]{4,}", t_lower) if w not in ("management", "guideline", "kdigo")]
    for entry in KDIGO_INDEX_CACHE:
        text_or_url = (entry["url"] + " " + entry["text"]).lower()
        if sum(1 for k in keywords if k in text_or_url) >= 2:
            return entry["url"]
    return None


# ─── Strategy 3d: USPSTF retry ─────────────────────────────────────────────
def uspstf_resolve(page_url):
    """USPSTF: scrape document page chain for PDF."""
    r = fetch(page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    # Method 1: any pdf link on page
    for a in soup.select("a[href$='.pdf']"):
        h = urljoin(page_url, a["href"])
        if "uspreventiveservices" in h or "uspstf" in h:
            return h
    # Method 2: /document/RecommendationStatement... chain
    for a in soup.select("a[href*='/document/']"):
        full = urljoin(page_url, a["href"])
        rr = fetch(full)
        if rr and rr.status_code == 200:
            sub = BeautifulSoup(rr.text, "html.parser")
            for a2 in sub.select("a[href$='.pdf']"):
                return urljoin(full, a2["href"])
    return None


# ─── Strategy 3e: ECDC scrape ───────────────────────────────────────────────
def ecdc_resolve(page_url):
    r = fetch(page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    # ECDC main PDF is usually under /sites/default/files/documents/
    for a in soup.select("a[href*='/sites/default/files/'][href$='.pdf']"):
        return urljoin(page_url, a["href"])
    # Fallback any PDF
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


# ─── Strategy 3f: CDC scrape ────────────────────────────────────────────────
def cdc_resolve(page_url):
    if page_url.endswith(".pdf"):
        return page_url
    # MMWR pattern: /mmwr/volumes/<v>/rr/rr<vol><num>.htm -> /pdfs/rr<vol><num>-H.pdf
    m = re.match(r"https?://www\.cdc\.gov/mmwr/volumes/(\d+)/(\w+)/(\w+)\.htm", page_url)
    if m:
        vol, ttype, fname = m.group(1), m.group(2), m.group(3)
        return f"https://www.cdc.gov/mmwr/volumes/{vol}/{ttype}/pdfs/{fname}-H.pdf"
    r = fetch(page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    for a in soup.select("a[href*='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def download_pdf(url, target):
    r = fetch(url, stream=True)
    if not r or r.status_code != 200:
        return False
    ct = r.headers.get("Content-Type", "").lower()
    if "html" in ct and "pdf" not in ct:
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "wb") as f:
        for chunk_b in r.iter_content(1 << 14):
            if chunk_b:
                f.write(chunk_b)
    if target.stat().st_size < 1024:
        target.unlink(missing_ok=True)
        return False
    with open(target, "rb") as f:
        if not f.read(5).startswith(b"%PDF-"):
            target.unlink(missing_ok=True)
            return False
    return True


def try_recover(row):
    """Try multiple strategies to recover one missing guideline.
    Returns (text, sha, size, pdf_source, pdf_url, pmcid) or None."""
    src = row["source"]
    title = row["title"]
    year = row["year"]
    page_url = row["page_url"]
    target = PDF_DIR / src / f"{row['id']}.pdf"

    # Strategy A: source-specific scraping
    pdf_url = None
    if src == "HAS":
        pdf_url = has_resolve(page_url, title)
    elif src == "WHO":
        pdf_url = who_resolve(page_url)
    elif src == "KDIGO":
        pdf_url = kdigo_resolve(title)
    elif src == "USPSTF":
        pdf_url = uspstf_resolve(page_url)
    elif src == "ECDC":
        pdf_url = ecdc_resolve(page_url)
    elif src == "CDC":
        pdf_url = cdc_resolve(page_url)

    if pdf_url:
        if download_pdf(pdf_url, target):
            text = extract_text_from_pdf(target)
            if len(text) > 500:
                return text, sha_of(target), target.stat().st_size, "source-scrape", pdf_url, None

    # Strategy B: OpenAlex
    oa = search_openalex(title, year)
    if oa:
        if oa.get("pmcid"):
            text = fetch_pmc_xml_text(oa["pmcid"])
            if text and len(text) > 500:
                size = len(text.encode())
                sha = hashlib.sha256(text.encode()).hexdigest()
                pdf_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={oa['pmcid'].replace('PMC','')}"
                return text, sha, size, "openalex+pmc-xml", pdf_url, oa["pmcid"]
        if oa.get("pdf_url"):
            if download_pdf(oa["pdf_url"], target):
                text = extract_text_from_pdf(target)
                if len(text) > 500:
                    return text, sha_of(target), target.stat().st_size, "openalex", oa["pdf_url"], None

    # Strategy C: Unpaywall
    doi = extract_doi_from_url(page_url)
    if doi:
        up = search_unpaywall_by_doi(doi)
        if up and up.get("pdf_url"):
            if download_pdf(up["pdf_url"], target):
                text = extract_text_from_pdf(target)
                if len(text) > 500:
                    return text, sha_of(target), target.stat().st_size, "unpaywall", up["pdf_url"], None

    return None


def main():
    # 1. Build set of already-extracted IDs
    extracted_ids = set()
    extracted_files = {}
    for f in sorted(EXTRACT_DIR.glob("*.json")):
        if f.stem == "_summary":
            continue
        d = json.loads(f.read_text())
        for doc in d.get("documents", []):
            extracted_ids.add(doc["id"])
        extracted_files[f.stem] = d

    # 2. Find missing rows
    missing_by_source = {}
    with open(CSV_PATH) as f:
        for row in csv.DictReader(f):
            if row["id"] not in extracted_ids:
                missing_by_source.setdefault(row["source"], []).append(row)

    print(f"\n{'═' * 70}")
    print(f"RETRY MISSING — {sum(len(v) for v in missing_by_source.values())} guidelines")
    print(f"{'═' * 70}\n")

    # 3. Try recovery
    new_recovered = 0
    for src, rows in sorted(missing_by_source.items()):
        print(f"\n─── {src} ({len(rows)} missing) ───")

        # Load existing JSON for this source (may not exist)
        if src not in extracted_files:
            extracted_files[src] = {
                "source": src,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "total_documents": 0,
                "documents": [],
            }

        for row in rows:
            print(f"  [{row['id']}] {row['title'][:60]}")
            result = try_recover(row)
            if not result:
                print("     ✗ failed all strategies")
                continue
            text, sha, size, src_via, pdf_url, pmcid = result
            chunks = chunk(text)
            if not chunks:
                print("     ✗ empty chunks")
                continue
            doc = {
                "id": row["id"],
                "source": src,
                "title": row["title"],
                "year": row["year"],
                "page_url": row["page_url"],
                "pdf_url": pdf_url,
                "license": row["license"],
                "commercial_use": row["commercial_use"],
                "clinical_domain": row["clinical_domain"],
                "priority": row["priority"],
                "sha256": sha,
                "size_bytes": size,
                "pdf_source": src_via,
                "pmcid": pmcid,
                "char_count": len(text),
                "chunk_count": len(chunks),
                "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "chunks": chunks,
            }
            extracted_files[src]["documents"].append(doc)
            extracted_files[src]["total_documents"] = len(extracted_files[src]["documents"])
            new_recovered += 1
            print(f"     ✓ recovered via {src_via}: {len(text)} chars / {len(chunks)} chunks")

            # Save incrementally
            with open(EXTRACT_DIR / f"{src}.json", "w", encoding="utf-8") as fout:
                json.dump(extracted_files[src], fout, ensure_ascii=False, indent=1)

    print(f"\n{'═' * 70}")
    print(f"RECOVERY COMPLETE — {new_recovered} additional guidelines extracted")
    print(f"{'═' * 70}")


if __name__ == "__main__":
    main()
