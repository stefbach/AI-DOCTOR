#!/usr/bin/env python3
"""
final_recovery.py — Last-resort 100% coverage script.

For entries that even aggressive_recovery couldn't get, try:
  1. Wayback Machine snapshots of the page_url
  2. DuckDuckGo site-restricted PDF search
  3. PubMed abstract-only fallback
  4. Citation stub (preserves entry with title + URL)

Reads ALL extended_*.csv catalogs.
Saves only NEW recoveries to extracted/ JSONs.

Usage: python3 final_recovery.py [csv_file ...]
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
MIN_LEN = 3000

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


def extract_text_from_html(html):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["nav", "footer", "header", "aside", "script", "style", "iframe", "form"]):
        tag.decompose()
    candidates = []
    for sel in ["article", "main", "[role='main']", ".article-body", ".article__body",
                ".content-body", ".main-content", ".guideline-content",
                "#article", "#main", "#content", ".post-content", ".entry-content"]:
        for elem in soup.select(sel):
            t = elem.get_text(" ", strip=True)
            if len(t) > 1000:
                candidates.append((len(t), t))
    if candidates:
        candidates.sort(reverse=True)
        return re.sub(r"\s+", " ", candidates[0][1])
    body = soup.find("body")
    if body:
        return re.sub(r"\s+", " ", body.get_text(" ", strip=True))
    return ""


def wayback_lookup(url):
    if not url:
        return None
    throttle("archive.org", 0.5)
    try:
        r = requests.get("https://archive.org/wayback/available",
                         params={"url": url}, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return None
        data = r.json()
        snap = data.get("archived_snapshots", {}).get("closest", {})
        if snap.get("available") and snap.get("url"):
            return snap["url"]
    except Exception:
        pass
    return None


def wayback_recover(page_url):
    archived = wayback_lookup(page_url)
    if not archived:
        return ""
    r = fetch(archived)
    if not r or r.status_code != 200:
        return ""
    text = extract_text_from_html(r.text)
    return text if len(text) >= MIN_LEN else ""


DOMAIN_HINTS = {
    "NCCN": "nccn.org", "AUA": "auanet.org", "EAU": "uroweb.org",
    "AAOS": "aaos.org", "AAO": "aao.org", "AAO-HNS": "entnet.org",
    "AAOMS": "aaoms.org", "AHA": "heart.org", "ESC": "escardio.org",
    "AAN": "aan.com", "EAN": "ean.org", "ESO": "eso-stroke.org",
    "ASCO": "asco.org", "ESMO": "esmo.org", "ATS": "thoracic.org",
    "ERS": "ersnet.org", "ASGE": "asge.org", "ESGE": "esge.com",
    "AGA": "gastro.org", "ACG": "gi.org", "AASLD": "aasld.org",
    "EASL": "easl.eu", "ACR": "acr.org", "EULAR": "eular.org",
    "ASH": "hematology.org", "BSH": "b-s-h.org.uk", "ISTH": "isth.org",
    "ENDO-Society": "endocrine.org", "ATA": "thyroid.org",
    "ADA": "diabetes.org", "EASD": "easd.org", "KDIGO": "kdigo.org",
    "ACOG": "acog.org", "RCOG": "rcog.org.uk", "IDSA": "idsociety.org",
    "ESCMID": "escmid.org", "WHO": "who.int", "CDC": "cdc.gov",
    "NICE": "nice.org.uk", "EANO": "eano.eu", "ASA": "asahq.org",
    "BAD": "bad.org.uk", "AAD": "aad.org", "EADV": "eadv.org",
    "APA": "psychiatry.org", "AAP": "aap.org", "ENMC": "enmc.org",
    "ASNR": "asnr.org", "ASRS": "asrs.org", "EFP": "efp.org",
    "AAOM": "aaom.com", "ESPGHAN": "espghan.org", "ESPEN": "espen.org",
    "ESCMID": "escmid.org",
}


def ddg_search_pdf(title, source):
    domain = DOMAIN_HINTS.get(source)
    if not domain:
        return None
    keywords = " ".join([w for w in re.sub(r"[^\w\s]", " ", title).split() if len(w) > 3][:5])
    query = f"site:{domain} {keywords} filetype:pdf"
    throttle("duckduckgo.com", 1.5)
    try:
        r = requests.get("https://duckduckgo.com/html/",
                         params={"q": query},
                         headers={**HEADERS, "Referer": "https://duckduckgo.com/"},
                         timeout=30)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        for a in soup.select("a.result__a, a.result__url, a"):
            href = a.get("href", "")
            if href.lower().endswith(".pdf") and domain in href:
                return href
    except Exception:
        pass
    return None


def download_and_extract_pdf(url):
    if not url:
        return ""
    target = PDF_DIR / "_recovery_final" / f"tmp_{abs(hash(url)) % 10**10}.pdf"
    target.parent.mkdir(parents=True, exist_ok=True)
    r = fetch(url, stream=True)
    if not r or r.status_code != 200:
        return ""
    ct = r.headers.get("Content-Type", "").lower()
    if "html" in ct and "pdf" not in ct:
        return ""
    try:
        with open(target, "wb") as f:
            for ch in r.iter_content(1 << 14):
                if ch:
                    f.write(ch)
        if target.stat().st_size < 1024:
            return ""
        with open(target, "rb") as f:
            if not f.read(5).startswith(b"%PDF-"):
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


def pubmed_abstract_fallback(title):
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    clean = re.sub(r"[^\w\s]", " ", title)[:200]
    try:
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
            params={"db": "pubmed", "term": clean, "retmax": 1, "retmode": "json"},
            headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return ""
        ids = r.json().get("esearchresult", {}).get("idlist", [])
        if not ids:
            return ""
        r2 = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
            params={"db": "pubmed", "id": ids[0], "rettype": "abstract", "retmode": "xml"},
            headers=HEADERS, timeout=TIMEOUT)
        if r2.status_code != 200:
            return ""
        soup = BeautifulSoup(r2.content, "html.parser")
        title_tag = soup.find("articletitle")
        abstract_tags = soup.find_all("abstracttext")
        parts = []
        if title_tag:
            parts.append(title_tag.get_text(" ", strip=True))
        for a in abstract_tags:
            parts.append(a.get_text(" ", strip=True))
        text = " ".join(parts)
        return re.sub(r"\s+", " ", text).strip() if len(text) > 200 else ""
    except Exception:
        return ""


def citation_stub(row):
    parts = [
        f"Title: {row['title']}",
        f"Source: {row['source']}",
        f"Year: {row['year']}",
        f"Domain: {row.get('clinical_domain', '')}",
        f"License: {row.get('license', '')}",
    ]
    if row.get('page_url'):
        parts.append(f"Available at: {row['page_url']}")
    parts.append("")
    parts.append(
        f"This is a citation reference for the {row['source']} guideline "
        f"'{row['title']}' published in {row['year']}. The full text was not "
        f"freely retrievable at the time of indexing (proprietary access, "
        f"member portal, or content not yet indexed in open repositories). "
        f"Clinicians should consult the original publication at the URL "
        f"provided. The topic area is: {row.get('clinical_domain', '')}. "
        f"This citation enables the RAG system to surface this guideline as "
        f"a recommendation when relevant to a clinical query, even though "
        f"detailed content is not embedded."
    )
    return "\n".join(parts)


def try_final_recover(row):
    src = row["source"].replace("/", "-").replace("\\", "-")
    title = row["title"]
    page_url = row.get("page_url", "")

    text = wayback_recover(page_url)
    if len(text) >= MIN_LEN:
        sha = hashlib.sha256(text.encode()).hexdigest()
        return text, sha, "wayback-machine", page_url

    pdf_url = ddg_search_pdf(title, src)
    if pdf_url:
        text = download_and_extract_pdf(pdf_url)
        if len(text) >= MIN_LEN:
            sha = hashlib.sha256(text.encode()).hexdigest()
            return text, sha, "ddg-site-pdf", pdf_url

    text = pubmed_abstract_fallback(title)
    if len(text) >= 500:
        sha = hashlib.sha256(text.encode()).hexdigest()
        return text, sha, "pubmed-abstract", page_url

    text = citation_stub(row)
    sha = hashlib.sha256(text.encode()).hexdigest()
    return text, sha, "citation-stub", page_url


def make_doc(row, text, sha, pdf_source, pdf_url):
    chunks_list = chunk(text)
    return {
        "id": row["id"],
        "source": row["source"].replace("/", "-").replace("\\", "-"),
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
        "pmcid": None,
        "char_count": len(text),
        "chunk_count": len(chunks_list),
        "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "chunks": chunks_list,
    }


def main():
    if len(sys.argv) > 1:
        csv_files = [Path(p) for p in sys.argv[1:]]
    else:
        csv_files = sorted((ROOT / "tibok-rag-collector").glob("guidelines_extended_*.csv"))

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

    missing_by_source = {}
    seen_ids = set()
    for csv_path in csv_files:
        if not csv_path.exists():
            continue
        with open(csv_path) as f:
            for row in csv.DictReader(f):
                if row["id"] in extracted_ids or row["id"] in seen_ids:
                    continue
                seen_ids.add(row["id"])
                missing_by_source.setdefault(
                    row["source"].replace("/", "-").replace("\\", "-"), []
                ).append(row)

    total = sum(len(v) for v in missing_by_source.values())
    print(f"\n{'═' * 70}")
    print(f"FINAL RECOVERY — {total} stubborn entries (4-strategy fallback)")
    print(f"{'═' * 70}\n")

    counts = {"wayback-machine": 0, "ddg-site-pdf": 0,
              "pubmed-abstract": 0, "citation-stub": 0, "failed": 0}

    for src, rows in sorted(missing_by_source.items()):
        print(f"\n─── {src} ({len(rows)}) ───")
        if src not in extracted_files:
            extracted_files[src] = {
                "source": src,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "total_documents": 0,
                "documents": [],
            }
        for row in rows:
            print(f"  [{row['id']}] {row['title'][:65]}")
            try:
                result = try_final_recover(row)
            except Exception as e:
                print(f"     ✗ error: {e}")
                counts["failed"] += 1
                continue
            text, sha, src_via, pdf_url = result
            doc = make_doc(row, text, sha, src_via, pdf_url)
            if not doc["chunks"]:
                counts["failed"] += 1
                continue
            extracted_files[src]["documents"].append(doc)
            extracted_files[src]["total_documents"] = len(extracted_files[src]["documents"])
            counts[src_via] = counts.get(src_via, 0) + 1
            print(f"     ✓ {src_via}: {len(text)} chars / {len(doc['chunks'])} chunks")
            with open(EXTRACT_DIR / f"{src}.json", "w", encoding="utf-8") as fout:
                json.dump(extracted_files[src], fout, ensure_ascii=False, indent=1)

    print(f"\n{'═' * 70}")
    print(f"FINAL RECOVERY COMPLETE")
    for k, v in counts.items():
        print(f"  {k}: {v}")
    full_text = counts["wayback-machine"] + counts["ddg-site-pdf"]
    abstract = counts["pubmed-abstract"]
    stub = counts["citation-stub"]
    success = full_text + abstract + stub
    print(f"\n  TRUE 100%: {success}/{total} entries now have a doc")
    print(f"  Of which: {full_text} full-text · {abstract} abstract · {stub} citation-stub")
    print(f"{'═' * 70}")


if __name__ == "__main__":
    main()
