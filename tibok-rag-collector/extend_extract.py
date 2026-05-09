#!/usr/bin/env python3
"""
extend_extract.py — Extract additional guidelines from guidelines_extended.csv

Targets: ASCO, ESMO, EULAR, ACR, SCCM, ESICM, AAP, ACOG, AAN, AASLD, AAD,
         ASH, NIH-COVID, SIGN, WHO-EXT.

Strategy: PubMed broad search → PMC efetch full XML.
(All listed sources publish in PubMed-indexed journals; most articles in PMC.)
"""
import csv
import hashlib
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent.parent
CSV_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].endswith(".csv") else (ROOT / "tibok-rag-collector" / "guidelines_extended.csv")
EXTRACT_DIR = ROOT / "tibok-rag-collector" / "extracted"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0"
HEADERS = {"User-Agent": UA}
EMAIL = "contact@tibok.mu"
TIMEOUT = 60
MIN_LEN = 12000

last_t = {}


def throttle(d, i=0.5):
    n = time.monotonic()
    w = (last_t.get(d, 0) + i) - n
    if w > 0:
        time.sleep(w)
    last_t[d] = time.monotonic()


def search_pubmed(query, year=None):
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    if year:
        query = f"({query}) AND ({year}[pdat])"
    try:
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
            params={"db": "pubmed", "term": query, "retmode": "json", "retmax": 8,
                    "tool": "tibok-extend", "email": EMAIL},
            headers=HEADERS, timeout=TIMEOUT)
        return r.json().get("esearchresult", {}).get("idlist", []) if r.status_code == 200 else []
    except Exception:
        return []


def pmid_to_pmcid(pmid):
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    try:
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi",
            params={"dbfrom": "pubmed", "db": "pmc", "id": pmid, "retmode": "json",
                    "tool": "tibok-extend", "email": EMAIL},
            headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return None
        for ls in r.json().get("linksets", []):
            for db in ls.get("linksetdbs", []):
                if db.get("dbto") == "pmc":
                    links = db.get("links", [])
                    if links:
                        return f"PMC{links[0]}"
    except Exception:
        pass
    return None


def fetch_pmc(pmcid):
    pmc_num = pmcid.replace("PMC", "")
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    try:
        r = requests.get(
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={pmc_num}&rettype=xml",
            headers=HEADERS, timeout=TIMEOUT)
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


def find_full_text(title, year):
    """Try multiple PubMed queries, return longest PMC text found."""
    clean = re.sub(r"[^\w\s]", " ", title)[:150]
    queries = [
        clean, f"{clean} guideline", f"{clean} recommendation",
        f"{clean} consensus", f"{clean} {year}",
    ]
    seen_pmids = set()
    best_text, best_pmid, best_pmcid = "", None, None
    for q in queries:
        for pmid in search_pubmed(q, year):
            if pmid in seen_pmids:
                continue
            seen_pmids.add(pmid)
            pmcid = pmid_to_pmcid(pmid)
            if not pmcid:
                continue
            text = fetch_pmc(pmcid)
            if len(text) > len(best_text):
                best_text, best_pmid, best_pmcid = text, pmid, pmcid
                if len(text) >= MIN_LEN * 2:  # very good match, stop searching
                    return best_text, best_pmid, best_pmcid
        if len(best_text) >= MIN_LEN:
            return best_text, best_pmid, best_pmcid
    return (best_text, best_pmid, best_pmcid) if len(best_text) >= MIN_LEN else (None, None, None)


def chunk(text, size=800, overlap=100):
    words = re.sub(r"\s+", " ", text).strip().split()
    out = []
    for i in range(0, len(words), size - overlap):
        s = words[i:i + size]
        if len(s) < 30:
            break
        out.append({"chunk_index": len(out), "content": " ".join(s)})
    return out


def main():
    files = {}
    for f in sorted(EXTRACT_DIR.glob("*.json")):
        if f.stem == "_summary":
            continue
        files[f.stem] = json.loads(f.read_text())

    extracted_ids = set()
    for d in files.values():
        for doc in d.get("documents", []):
            extracted_ids.add(doc["id"])

    rows = []
    with open(CSV_PATH) as f:
        for row in csv.DictReader(f):
            if row["id"] not in extracted_ids:
                rows.append(row)

    print(f"Extending with {len(rows)} new guidelines from {CSV_PATH.name}\n")

    recovered = 0
    by_src_count = {}
    for row in rows:
        src = row["source"].replace("/", "-").replace("\\", "-")
        gid = row["id"]
        title = row["title"]
        year = row["year"]
        print(f"[{gid}] {title[:60]} ({year})")

        text, pmid, pmcid = find_full_text(title, year)
        if not text or len(text) < MIN_LEN:
            print(f"    ✗ no full text via PubMed/PMC")
            continue

        chunks_list = chunk(text)
        if not chunks_list:
            print("    ✗ empty chunks")
            continue

        if src not in files:
            files[src] = {
                "source": src,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "total_documents": 0,
                "documents": [],
            }

        doc = {
            "id": gid,
            "source": src,
            "title": title,
            "year": year,
            "page_url": row["page_url"],
            "pdf_url": f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={pmcid.replace('PMC','')}",
            "license": row["license"],
            "commercial_use": row["commercial_use"],
            "clinical_domain": row["clinical_domain"],
            "priority": row["priority"],
            "sha256": hashlib.sha256(text.encode()).hexdigest(),
            "size_bytes": len(text.encode()),
            "pdf_source": f"extend-pubmed:{pmid}",
            "pmcid": pmcid,
            "char_count": len(text),
            "chunk_count": len(chunks_list),
            "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "chunks": chunks_list,
        }
        files[src]["documents"].append(doc)
        files[src]["total_documents"] = len(files[src]["documents"])

        with open(EXTRACT_DIR / f"{src}.json", "w", encoding="utf-8") as fout:
            json.dump(files[src], fout, ensure_ascii=False, indent=1)

        by_src_count[src] = by_src_count.get(src, 0) + 1
        recovered += 1
        print(f"    ✓ via {pmcid}: {len(text)} chars / {len(chunks_list)} chunks")

    print(f"\n══════════════════════════════════════════════════════════════════════")
    print(f"EXTEND COMPLETE — {recovered}/{len(rows)} extracted")
    for src, n in sorted(by_src_count.items()):
        print(f"  {src}: +{n}")


if __name__ == "__main__":
    main()
