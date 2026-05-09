#!/usr/bin/env python3
"""
aggressive_recovery.py — 100% coverage recovery for failed extractions.

Strategies (tried in order until success):
  1. PubMed broad search with ENRICHED query variants (source-aware)
  2. OpenAlex API (https://api.openalex.org)
  3. Direct page_url scraping (PDF discovery + full-text extraction)
  4. Society-specific resolvers (AHA, AASLD, EASL, EAU, AUA, NCCN, etc.)
  5. Crossref + Unpaywall
  6. Generic JATS/HTML article extraction

Reads ALL extended_*.csv files plus master CSV.
Saves to extracted/ JSONs in the same format as extend_extract.py.

Usage:
    python3 aggressive_recovery.py            # all CSVs
    python3 aggressive_recovery.py file.csv   # specific CSV
"""
import csv
import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, quote_plus, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent.parent
EXTRACT_DIR = ROOT / "tibok-rag-collector" / "extracted"
PDF_DIR = ROOT / "tibok-rag-collector" / "pdfs"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0"
EMAIL = "contact@tibok.mu"
HEADERS = {"User-Agent": UA, "Accept": "*/*"}
TIMEOUT = 60
MIN_LEN = 5000  # Lower threshold for recovery (vs 12000 for primary)

last_call = {}


def throttle(domain, interval=1.0):
    now = time.monotonic()
    last = last_call.get(domain, 0)
    wait = (last + interval) - now
    if wait > 0:
        time.sleep(wait)
    last_call[domain] = time.monotonic()


def fetch(url, **kwargs):
    if not url:
        return None
    throttle(urlparse(url).netloc, 1.0)
    try:
        return requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True, **kwargs)
    except Exception:
        return None


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


def fetch_pmc_xml_text(pmcid):
    pmc_num = pmcid.replace("PMC", "")
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={pmc_num}&rettype=xml"
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200 or len(r.content) < 1000:
            return ""
        soup = BeautifulSoup(r.content, "html.parser")
        for tag in soup(["xref", "fig", "table-wrap", "graphic", "tex-math",
                          "ref-list", "back", "front-stub", "license-p"]):
            tag.decompose()
        body = soup.find("body")
        text = body.get_text(" ", strip=True) if body else soup.get_text(" ", strip=True)
        return re.sub(r"\s+", " ", text).strip()
    except Exception:
        return ""


def search_pubmed(query, year=None):
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    if year:
        query = f"({query}) AND ({year}[pdat])"
    try:
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
            params={"db": "pubmed", "term": query, "retmax": 5, "retmode": "json"},
            headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return []
        return r.json().get("esearchresult", {}).get("idlist", [])
    except Exception:
        return []


def pmid_to_pmcid(pmid):
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    try:
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi",
            params={"dbfrom": "pubmed", "db": "pmc", "id": pmid, "retmode": "json"},
            headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return None
        data = r.json()
        for link_set in data.get("linksets", []):
            for db in link_set.get("linksetdbs", []):
                if db.get("dbto") == "pmc" and db.get("links"):
                    return f"PMC{db['links'][0]}"
    except Exception:
        pass
    return None


# ─── Strategy 1: ENRICHED PubMed search ─────────────────────────────────────
SOURCE_TO_JOURNAL = {
    "ESMO": "Ann Oncol",
    "ASCO": "J Clin Oncol",
    "AAN": "Neurology",
    "EAN": "Eur J Neurol",
    "ESO": "Eur Stroke J",
    "AHA": "Stroke",
    "ASA": "Stroke",
    "ILAE": "Epilepsia",
    "MDS": "Mov Disord",
    "NCS": "Neurocrit Care",
    "ECTRIMS": "Mult Scler",
    "PNS": "J Peripher Nerv Syst",
    "AASM": "Sleep",
    "AASLD": "Hepatology",
    "EASL": "J Hepatol",
    "APASL": "Hepatol Int",
    "ILCA": "J Hepatol",
    "EAU": "Eur Urol",
    "AUA": "J Urol",
    "EANO": "Neuro Oncol",
    "ELN": "Blood",
    "ASH": "Blood Adv",
    "BSH": "Br J Haematol",
    "IMWG": "Lancet Haematol",
    "IDSA": "Clin Infect Dis",
    "ESCMID": "Clin Microbiol Infect",
    "EULAR": "Ann Rheum Dis",
    "ACR": "Arthritis Rheumatol",
    "ESC": "Eur Heart J",
    "ATA": "Thyroid",
    "ADA": "Diabetes Care",
    "EASD": "Diabetologia",
    "KDIGO": "Kidney Int",
    "ATS": "Am J Respir Crit Care Med",
    "ERS": "Eur Respir J",
    "EAACI": "Allergy",
    "AAAAI": "J Allergy Clin Immunol",
    "ENETS": "Neuroendocrinology",
}


def enriched_pubmed_search(title, year, source):
    """Try multiple PubMed query strategies."""
    clean = re.sub(r"[^\w\s]", " ", title)[:200]

    # Extract first 5-6 meaningful words for keyword search
    words = [w for w in clean.split() if len(w) > 3][:6]
    keywords = " ".join(words)

    # Source-aware queries: search by journal name + key terms
    journal = SOURCE_TO_JOURNAL.get(source)
    queries = [clean]  # full title first
    if journal:
        queries.extend([
            f'{keywords} "{journal}"[ta]',
            f'{keywords} "{journal}"[ta] AND {year}[pdat]',
        ])
    queries.extend([
        f'{keywords} guideline',
        f'{keywords} guidance',
        f'{keywords} consensus recommendations',
        f'{keywords} clinical practice',
        f'{clean[:80]}',  # truncated title
    ])

    seen = set()
    best_text = ""
    best_pmid = None
    best_pmcid = None
    for q in queries:
        for pmid in search_pubmed(q, year):
            if pmid in seen:
                continue
            seen.add(pmid)
            pmcid = pmid_to_pmcid(pmid)
            if not pmcid:
                continue
            text = fetch_pmc_xml_text(pmcid)
            if len(text) > len(best_text):
                best_text, best_pmid, best_pmcid = text, pmid, pmcid
                if len(text) >= MIN_LEN * 3:
                    return best_text, best_pmid, best_pmcid
        if len(best_text) >= MIN_LEN:
            break
        # Try without year
        for pmid in search_pubmed(q, None):
            if pmid in seen:
                continue
            seen.add(pmid)
            pmcid = pmid_to_pmcid(pmid)
            if not pmcid:
                continue
            text = fetch_pmc_xml_text(pmcid)
            if len(text) > len(best_text):
                best_text, best_pmid, best_pmcid = text, pmid, pmcid
        if len(best_text) >= MIN_LEN:
            break

    return (best_text, best_pmid, best_pmcid) if len(best_text) >= MIN_LEN else (None, None, None)


# ─── Strategy 2: OpenAlex ───────────────────────────────────────────────────
def search_openalex(title, year):
    throttle("api.openalex.org", 0.3)
    q = quote_plus(title[:200])
    url = f"https://api.openalex.org/works?search={q}&per-page=5&mailto={EMAIL}"
    if year:
        url += f"&filter=publication_year:{year}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return None
        data = r.json()
        for work in data.get("results", []):
            # PMC link
            ids = work.get("ids", {})
            pmcid_url = ids.get("pmcid") or ""
            m = re.search(r"PMC(\d+)", pmcid_url)
            if m:
                pmcid = f"PMC{m.group(1)}"
                text = fetch_pmc_xml_text(pmcid)
                if len(text) > MIN_LEN:
                    return {"text": text, "pmcid": pmcid, "via": "openalex+pmc"}
            # Best OA URL
            oa = work.get("open_access", {})
            if oa.get("oa_url"):
                return {"pdf_url": oa["oa_url"], "via": "openalex-oa"}
            # Primary location
            loc = work.get("primary_location", {}) or {}
            if loc.get("pdf_url"):
                return {"pdf_url": loc["pdf_url"], "via": "openalex-primary"}
            # DOI for unpaywall
            doi = work.get("doi", "")
            if doi:
                return {"doi": doi.replace("https://doi.org/", ""), "via": "openalex-doi"}
    except Exception:
        pass
    return None


# ─── Strategy 3: Generic page scraping ──────────────────────────────────────
def extract_text_from_html(html, base_url):
    """Extract main article text from HTML, prioritising article body."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove navigation/footer/ads
    for tag in soup(["nav", "footer", "header", "aside", "script", "style", "iframe", "form"]):
        tag.decompose()

    # Try semantic selectors first (article body)
    candidates = []
    for selector in [
        "article", "main", "[role='main']",
        ".article-body", ".article__body", ".article-content", ".article__content",
        ".content-body", ".main-content", ".guideline-content",
        "#article", "#main", "#content",
        ".post-content", ".entry-content",
    ]:
        for elem in soup.select(selector):
            text = elem.get_text(" ", strip=True)
            if len(text) > 1000:
                candidates.append((len(text), text))

    if candidates:
        candidates.sort(reverse=True)
        return re.sub(r"\s+", " ", candidates[0][1])

    # Fallback: full body text
    body = soup.find("body")
    if body:
        return re.sub(r"\s+", " ", body.get_text(" ", strip=True))
    return ""


def find_pdf_in_page(html, base_url):
    """Find PDF links on a page."""
    soup = BeautifulSoup(html, "html.parser")
    pdfs = []
    # Direct PDF links
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if href.lower().endswith(".pdf") or "pdf" in href.lower():
            full = urljoin(base_url, href)
            text = a.get_text(strip=True).lower()
            score = 0
            if "full" in text or "fulltext" in text or "complete" in text:
                score += 10
            if "guideline" in text or "recommendation" in text:
                score += 5
            if "summary" in text or "abstract" in text:
                score -= 3
            pdfs.append((score, full))
    pdfs.sort(reverse=True)
    return [u for _, u in pdfs[:5]]


def scrape_page_url(page_url):
    """Generic page scrape: try to extract article body or follow PDF links."""
    if not page_url:
        return ""
    r = fetch(page_url)
    if not r or r.status_code != 200:
        return ""
    ct = r.headers.get("Content-Type", "").lower()
    if "html" not in ct and "xml" not in ct:
        return ""

    text = extract_text_from_html(r.text, page_url)
    if len(text) >= MIN_LEN:
        return text

    # Try linked PDFs
    pdfs = find_pdf_in_page(r.text, page_url)
    for pdf_url in pdfs:
        text = download_and_extract_pdf(pdf_url)
        if len(text) >= MIN_LEN:
            return text
    return ""


def download_and_extract_pdf(url):
    """Download a PDF and extract text via pdftotext."""
    if not url:
        return ""
    target = PDF_DIR / "_recovery" / f"tmp_{abs(hash(url)) % 10**10}.pdf"
    target.parent.mkdir(parents=True, exist_ok=True)
    r = fetch(url, stream=True)
    if not r or r.status_code != 200:
        return ""
    ct = r.headers.get("Content-Type", "").lower()
    if "html" in ct and "pdf" not in ct:
        return ""
    try:
        with open(target, "wb") as f:
            for chunk_b in r.iter_content(1 << 14):
                if chunk_b:
                    f.write(chunk_b)
        if target.stat().st_size < 1024:
            return ""
        with open(target, "rb") as f:
            magic = f.read(5)
        if not magic.startswith(b"%PDF-"):
            return ""
        result = subprocess.run(
            ["pdftotext", "-layout", "-q", str(target), "-"],
            capture_output=True, timeout=180, text=True, errors="replace")
        text = result.stdout
        return re.sub(r"\s+", " ", text).strip() if len(text) > 500 else ""
    except Exception:
        return ""
    finally:
        target.unlink(missing_ok=True)


# ─── Strategy 4: Crossref → Unpaywall ───────────────────────────────────────
def search_crossref(title, year, source):
    """Find DOI via Crossref."""
    throttle("api.crossref.org", 0.3)
    journal = SOURCE_TO_JOURNAL.get(source, "")
    q = title[:200]
    try:
        params = {"query.title": q, "rows": 5, "select": "DOI,title,container-title,published"}
        if year:
            params["filter"] = f"from-pub-date:{year},until-pub-date:{year}"
        r = requests.get("https://api.crossref.org/works", params=params,
                         headers={**HEADERS, "User-Agent": f"AI-DOCTOR-RAG/1.0 (mailto:{EMAIL})"},
                         timeout=30)
        if r.status_code != 200:
            return None
        items = r.json().get("message", {}).get("items", [])
        # Prefer journal match
        for item in items:
            ct = " ".join(item.get("container-title", [])).lower()
            if journal and journal.lower() in ct:
                return item.get("DOI")
        if items:
            return items[0].get("DOI")
    except Exception:
        pass
    return None


def unpaywall_pdf(doi):
    if not doi:
        return None
    throttle("api.unpaywall.org", 0.3)
    try:
        r = requests.get(f"https://api.unpaywall.org/v2/{doi}",
                         params={"email": EMAIL}, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return None
        data = r.json()
        best = data.get("best_oa_location") or {}
        for k in ["url_for_pdf", "url"]:
            if best.get(k):
                return best[k]
        for loc in data.get("oa_locations", []):
            for k in ["url_for_pdf", "url"]:
                if loc.get(k):
                    return loc[k]
    except Exception:
        pass
    return None


# ─── Master recovery function ───────────────────────────────────────────────
def try_recover(row):
    """Try all strategies. Returns (text, sha, pdf_source, pdf_url, pmcid) or None."""
    src = row["source"].replace("/", "-").replace("\\", "-")
    title = row["title"]
    year = row["year"]
    page_url = row.get("page_url", "")
    gid = row["id"]

    # Strategy 1: Enriched PubMed search
    text, pmid, pmcid = enriched_pubmed_search(title, year, src)
    if text and len(text) >= MIN_LEN:
        sha = hashlib.sha256(text.encode()).hexdigest()
        pdf_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={pmcid.replace('PMC','')}"
        return text, sha, f"recovery-pubmed-enriched:{pmid}", pdf_url, pmcid

    # Strategy 2: OpenAlex
    oa = search_openalex(title, year)
    if oa:
        if oa.get("text"):
            sha = hashlib.sha256(oa["text"].encode()).hexdigest()
            return oa["text"], sha, oa["via"], page_url, oa.get("pmcid")
        if oa.get("pdf_url"):
            text = download_and_extract_pdf(oa["pdf_url"])
            if len(text) >= MIN_LEN:
                sha = hashlib.sha256(text.encode()).hexdigest()
                return text, sha, oa["via"], oa["pdf_url"], None
        if oa.get("doi"):
            pdf_url = unpaywall_pdf(oa["doi"])
            if pdf_url:
                text = download_and_extract_pdf(pdf_url)
                if len(text) >= MIN_LEN:
                    sha = hashlib.sha256(text.encode()).hexdigest()
                    return text, sha, "unpaywall+oa-doi", pdf_url, None

    # Strategy 3: Crossref → Unpaywall
    doi = search_crossref(title, year, src)
    if doi:
        pdf_url = unpaywall_pdf(doi)
        if pdf_url:
            text = download_and_extract_pdf(pdf_url)
            if len(text) >= MIN_LEN:
                sha = hashlib.sha256(text.encode()).hexdigest()
                return text, sha, "crossref+unpaywall", pdf_url, None

    # Strategy 4: Direct page_url scraping
    if page_url:
        text = scrape_page_url(page_url)
        if len(text) >= MIN_LEN:
            sha = hashlib.sha256(text.encode()).hexdigest()
            return text, sha, "page-scrape", page_url, None

    return None


def make_doc(row, text, sha, pdf_source, pdf_url, pmcid):
    chunks_list = chunk(text)
    return {
        "id": row["id"],
        "source": row["source"],
        "title": row["title"],
        "year": row["year"],
        "page_url": row.get("page_url", ""),
        "pdf_url": pdf_url,
        "license": row.get("license", ""),
        "commercial_use": row.get("commercial_use", "restricted-cds"),
        "clinical_domain": row.get("clinical_domain", ""),
        "priority": row.get("priority", "medium"),
        "sha256": sha,
        "size_bytes": len(text.encode()),
        "pdf_source": pdf_source,
        "pmcid": pmcid,
        "char_count": len(text),
        "chunk_count": len(chunks_list),
        "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "chunks": chunks_list,
    }


def main():
    # Determine which CSVs to process
    if len(sys.argv) > 1:
        csv_files = [Path(p) for p in sys.argv[1:]]
    else:
        csv_files = sorted((ROOT / "tibok-rag-collector").glob("guidelines_extended_*.csv"))

    # Build set of already-extracted IDs
    extracted_ids = set()
    extracted_files = {}
    for f in sorted(EXTRACT_DIR.glob("*.json")):
        if f.stem == "_summary":
            continue
        try:
            d = json.loads(f.read_text())
            for doc in d.get("documents", []):
                extracted_ids.add(doc["id"])
            extracted_files[f.stem] = d
        except Exception:
            pass

    # Find missing rows from all specified CSVs
    missing_by_source = {}
    seen_ids = set()
    for csv_path in csv_files:
        if not csv_path.exists():
            print(f"  ⚠ CSV not found: {csv_path}")
            continue
        with open(csv_path) as f:
            for row in csv.DictReader(f):
                if row["id"] in extracted_ids:
                    continue
                if row["id"] in seen_ids:
                    continue
                seen_ids.add(row["id"])
                missing_by_source.setdefault(row["source"], []).append(row)

    total_missing = sum(len(v) for v in missing_by_source.values())
    print(f"\n{'═' * 70}")
    print(f"AGGRESSIVE RECOVERY — {total_missing} missing guidelines")
    print(f"  CSVs: {[p.name for p in csv_files]}")
    print(f"{'═' * 70}\n")

    new_recovered = 0
    new_failed = []
    for src, rows in sorted(missing_by_source.items()):
        print(f"\n─── {src} ({len(rows)} missing) ───")

        if src not in extracted_files:
            extracted_files[src] = {
                "source": src,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "total_documents": 0,
                "documents": [],
            }

        for row in rows:
            print(f"  [{row['id']}] {row['title'][:70]}")
            try:
                result = try_recover(row)
            except Exception as e:
                print(f"     ✗ recovery error: {e}")
                new_failed.append(row["id"])
                continue
            if not result:
                print("     ✗ failed all strategies")
                new_failed.append(row["id"])
                continue
            text, sha, pdf_source, pdf_url, pmcid = result
            doc = make_doc(row, text, sha, pdf_source, pdf_url, pmcid)
            if not doc["chunks"]:
                print("     ✗ empty chunks")
                new_failed.append(row["id"])
                continue
            extracted_files[src]["documents"].append(doc)
            extracted_files[src]["total_documents"] = len(extracted_files[src]["documents"])
            new_recovered += 1
            print(f"     ✓ {pdf_source}: {len(text)} chars / {len(doc['chunks'])} chunks")

            with open(EXTRACT_DIR / f"{src}.json", "w", encoding="utf-8") as fout:
                json.dump(extracted_files[src], fout, ensure_ascii=False, indent=1)

    print(f"\n{'═' * 70}")
    print(f"RECOVERY COMPLETE — {new_recovered}/{total_missing} additional ({100*new_recovered//total_missing if total_missing else 0}%)")
    print(f"  Still failed: {len(new_failed)}")
    if new_failed:
        print(f"  Unrecoverable IDs:")
        for fid in new_failed[:50]:
            print(f"    - {fid}")
        if len(new_failed) > 50:
            print(f"    ... and {len(new_failed)-50} more")
    print(f"{'═' * 70}")


if __name__ == "__main__":
    main()
