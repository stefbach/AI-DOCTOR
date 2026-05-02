#!/usr/bin/env python3
"""
fix_short.py — Replace short (abstract-only) extracts with full-text versions.

Many docs were extracted with <15K chars because:
  - USPSTF resolver picked the 1-page infographic instead of Final Rec Statement
  - PMC efetch returned only abstract for some PMC entries (no full deposit)
  - Some "summary" PDFs picked up instead of full guidelines

Strategy per source:
  USPSTF: PubMed search "<title> recommendation statement" → PMC efetch
          (USPSTF FRS are all in JAMA, indexed in PubMed with PMCID)
  IDSA:   Try academic.oup.com /article-pdf/ direct URL pattern
  WHO:    Try IRIS direct download via discovered handle URL
  Other:  Try OpenAlex with broader query, then PubMed fallback

Only REPLACES if the new version is significantly longer than the existing one.
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
HEADERS = {"User-Agent": UA, "Accept": "*/*"}
TIMEOUT = 60
EMAIL = "contact@tibok.mu"
SHORT_THRESHOLD = 15000  # chars — below this, doc is considered "short"
MIN_IMPROVEMENT_FACTOR = 1.5  # only replace if new content is 1.5x larger

last_call = {}


def throttle(domain, interval=0.5):
    now = time.monotonic()
    last = last_call.get(domain, 0)
    wait = (last + interval) - now
    if wait > 0:
        time.sleep(wait)
    last_call[domain] = time.monotonic()


def fetch_pmc_xml_text(pmcid):
    """Fetch JATS XML body via efetch, return plain text."""
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


def search_pubmed(query, year=None):
    """Search PubMed with given query, return first PMID."""
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    if year:
        query = f"({query}) AND ({year}[pdat])"
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": 5,
        "tool": "tibok-fix-short",
        "email": EMAIL,
    }
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return []
        data = r.json()
        return data.get("esearchresult", {}).get("idlist", [])
    except Exception as e:
        print(f"      esearch error: {e}")
        return []


def pmid_to_pmcid(pmid):
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi"
    params = {
        "dbfrom": "pubmed",
        "db": "pmc",
        "id": pmid,
        "retmode": "json",
        "tool": "tibok-fix-short",
        "email": EMAIL,
    }
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return None
        data = r.json()
        for ls in data.get("linksets", []):
            for db in ls.get("linksetdbs", []):
                if db.get("dbto") == "pmc":
                    links = db.get("links", [])
                    if links:
                        return f"PMC{links[0]}"
    except Exception:
        pass
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


def fix_uspstf(doc):
    """USPSTF Final Recommendation Statements are in JAMA, indexed in PubMed."""
    title = doc["title"]
    year = doc["year"]
    # Build clean query
    clean_title = re.sub(r"[^\w\s]", " ", title).strip()
    queries = [
        f'USPSTF Recommendation Statement {clean_title}',
        f'US Preventive Services Task Force {clean_title}',
        f'Preventive Services Task Force {clean_title}',
    ]
    for q in queries:
        pmids = search_pubmed(q, year)
        for pmid in pmids[:3]:
            pmcid = pmid_to_pmcid(pmid)
            if pmcid:
                text = fetch_pmc_xml_text(pmcid)
                if text and len(text) >= SHORT_THRESHOLD:
                    return text, pmcid, f"pubmed:{pmid}"
    return None


def fix_idsa(doc):
    """IDSA papers are in academic.oup.com — try direct PDF URL."""
    page_url = doc["page_url"]
    if "academic.oup.com/cid/article/" not in page_url:
        return None
    pdf_url = page_url.replace("/article/", "/article-pdf/")
    throttle("academic.oup.com", 1.5)
    try:
        r = requests.get(pdf_url, headers=HEADERS, timeout=TIMEOUT, stream=True)
        if r.status_code == 200 and r.headers.get("Content-Type", "").lower().startswith("application/pdf"):
            target = PDF_DIR / "IDSA" / f"{doc['id']}.pdf"
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "wb") as f:
                for ch in r.iter_content(1 << 14):
                    if ch:
                        f.write(ch)
            with open(target, "rb") as f:
                if not f.read(5).startswith(b"%PDF-"):
                    target.unlink(missing_ok=True)
                    return None
            text = subprocess.run(
                ["pdftotext", "-layout", "-q", str(target), "-"],
                capture_output=True, timeout=120, text=True, errors="replace"
            ).stdout
            if len(text) >= SHORT_THRESHOLD:
                return text, None, "academic-oup-pdf"
    except Exception:
        pass
    return None


def fix_generic(doc):
    """Generic fallback: PubMed search + efetch."""
    title = doc["title"]
    year = doc["year"]
    clean_title = re.sub(r"[^\w\s]", " ", title).strip()
    queries = [
        f'{clean_title}',
        f'{clean_title} guideline',
        f'{clean_title} recommendation',
    ]
    for q in queries:
        pmids = search_pubmed(q, year)
        for pmid in pmids[:3]:
            pmcid = pmid_to_pmcid(pmid)
            if pmcid:
                text = fetch_pmc_xml_text(pmcid)
                if text and len(text) >= SHORT_THRESHOLD:
                    return text, pmcid, f"pubmed:{pmid}"
    return None


def main():
    # Load all extracted JSON files
    files = {}
    for f in sorted(EXTRACT_DIR.glob("*.json")):
        if f.stem == "_summary":
            continue
        files[f.stem] = json.loads(f.read_text())

    # Find short docs
    short_items = []  # (source_file, doc_index, doc)
    for src, data in files.items():
        for i, doc in enumerate(data.get("documents", [])):
            if doc.get("char_count", 0) < SHORT_THRESHOLD:
                short_items.append((src, i, doc))

    print(f"\n{'═' * 70}")
    print(f"FIX SHORT — {len(short_items)} documents below {SHORT_THRESHOLD} chars")
    print(f"{'═' * 70}\n")

    fixed_count = 0
    for src, idx, doc in short_items:
        print(f"[{doc['id']}] {doc['title'][:55]} ({doc['char_count']} chars)")
        result = None

        if src == "USPSTF":
            result = fix_uspstf(doc)
        elif src == "IDSA":
            result = fix_idsa(doc)

        if not result:
            result = fix_generic(doc)

        if result:
            new_text, pmcid, via = result
            old_chars = doc["char_count"]
            if len(new_text) >= old_chars * MIN_IMPROVEMENT_FACTOR:
                # Replace
                chunks = chunk(new_text)
                doc["chunks"] = chunks
                doc["chunk_count"] = len(chunks)
                doc["char_count"] = len(new_text)
                if pmcid:
                    doc["pmcid"] = pmcid
                doc["pdf_source"] = via
                doc["sha256"] = hashlib.sha256(new_text.encode()).hexdigest()
                doc["size_bytes"] = len(new_text.encode())
                doc["extracted_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                files[src]["documents"][idx] = doc
                fixed_count += 1
                print(f"   ✓ FIXED via {via}: {old_chars} → {len(new_text)} chars (+{len(new_text) - old_chars:,})")

                # Save incrementally
                with open(EXTRACT_DIR / f"{src}.json", "w", encoding="utf-8") as fout:
                    json.dump(files[src], fout, ensure_ascii=False, indent=1)
            else:
                print(f"   ⊝ found but not significantly longer ({len(new_text)} vs {old_chars}), keeping original")
        else:
            print(f"   ✗ no fuller version found")

    print(f"\n{'═' * 70}")
    print(f"FIX COMPLETE — {fixed_count}/{len(short_items)} documents replaced with longer versions")
    print(f"{'═' * 70}")


if __name__ == "__main__":
    main()
