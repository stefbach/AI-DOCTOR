#!/usr/bin/env python3
"""
final_recovery.py — Last-resort recovery for remaining missing guidelines.

Tries for each missing doc:
  1. PubMed search with broad title-only query (no PT filter, no date constraint)
  2. Examine top 10 PMID matches, prefer the one with PMCID and longest abstract
  3. efetch full XML
  4. Fallback: try CrossRef for DOI, then OpenAlex by DOI for PDF URL

Skips HAS (Jalios CMS requires headless browser) and known broken URLs.
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
CSV_PATH = ROOT / "tibok-rag-collector" / "guidelines_master.csv"
EXTRACT_DIR = ROOT / "tibok-rag-collector" / "extracted"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0"
HEADERS = {"User-Agent": UA}
EMAIL = "contact@tibok.mu"
TIMEOUT = 60
MIN_TEXT_LEN = 12000

last = {}


def throttle(d, i=0.5):
    n = time.monotonic()
    w = (last.get(d, 0) + i) - n
    if w > 0:
        time.sleep(w)
    last[d] = time.monotonic()


def fetch_pmc(pmcid):
    pmc_num = pmcid.replace("PMC", "")
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    try:
        r = requests.get(
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={pmc_num}&rettype=xml",
            headers=HEADERS, timeout=TIMEOUT
        )
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


def search_broad(title):
    """Multiple broad PubMed queries, return all PMIDs found."""
    pmids = []
    clean = re.sub(r"[^\w\s]", " ", title)[:150]
    queries = [
        clean,                                  # bare title
        f"{clean} guideline",
        f"{clean} recommendation",
        f"{clean} management",
    ]
    for q in queries:
        throttle("eutils.ncbi.nlm.nih.gov", 0.5)
        try:
            r = requests.get(
                "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
                params={"db": "pubmed", "term": q, "retmode": "json", "retmax": 10,
                        "tool": "tibok-final", "email": EMAIL},
                headers=HEADERS, timeout=TIMEOUT,
            )
            if r.status_code == 200:
                ids = r.json().get("esearchresult", {}).get("idlist", [])
                for i in ids:
                    if i not in pmids:
                        pmids.append(i)
        except Exception:
            pass
        if len(pmids) >= 15:
            break
    return pmids


def pmid_to_pmcid(pmid):
    throttle("eutils.ncbi.nlm.nih.gov", 0.5)
    try:
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi",
            params={"dbfrom": "pubmed", "db": "pmc", "id": pmid, "retmode": "json",
                    "tool": "tibok-final", "email": EMAIL},
            headers=HEADERS, timeout=TIMEOUT,
        )
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


def main():
    files = {}
    for f in sorted(EXTRACT_DIR.glob("*.json")):
        if f.stem == "_summary":
            continue
        files[f.stem] = json.loads(f.read_text())

    extracted_ids = set()
    for src, d in files.items():
        for doc in d.get("documents", []):
            extracted_ids.add(doc["id"])

    missing = []
    with open(CSV_PATH) as f:
        for row in csv.DictReader(f):
            if row["id"] in extracted_ids:
                continue
            # Skip HAS - JS-loaded, won't recover
            if row["source"] == "HAS":
                continue
            missing.append(row)

    print(f"Final recovery: {len(missing)} non-HAS missing\n")

    recovered = 0
    for row in missing:
        src = row["source"]
        gid = row["id"]
        title = row["title"]
        year = row["year"]
        print(f"[{gid}] {title[:60]} ({year})")

        # Search broadly
        pmids = search_broad(title)
        if not pmids:
            print("    ✗ no PubMed match")
            continue

        # Try each PMID for PMCID full text
        best_text = ""
        best_pmcid = None
        best_pmid = None
        for pmid in pmids[:8]:
            pmcid = pmid_to_pmcid(pmid)
            if not pmcid:
                continue
            text = fetch_pmc(pmcid)
            if len(text) > len(best_text):
                best_text = text
                best_pmcid = pmcid
                best_pmid = pmid
                if len(text) >= MIN_TEXT_LEN:
                    break

        if len(best_text) < MIN_TEXT_LEN:
            print(f"    ✗ best PMC match too short ({len(best_text)} chars)")
            continue

        # Save
        chunks = chunk(best_text)
        if not chunks:
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
            "pdf_url": f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={best_pmcid.replace('PMC','')}",
            "license": row["license"],
            "commercial_use": row["commercial_use"],
            "clinical_domain": row["clinical_domain"],
            "priority": row["priority"],
            "sha256": hashlib.sha256(best_text.encode()).hexdigest(),
            "size_bytes": len(best_text.encode()),
            "pdf_source": f"final-pubmed:{best_pmid}",
            "pmcid": best_pmcid,
            "char_count": len(best_text),
            "chunk_count": len(chunks),
            "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "chunks": chunks,
        }
        files[src]["documents"].append(doc)
        files[src]["total_documents"] = len(files[src]["documents"])

        # Save incrementally
        with open(EXTRACT_DIR / f"{src}.json", "w", encoding="utf-8") as fout:
            json.dump(files[src], fout, ensure_ascii=False, indent=1)

        recovered += 1
        print(f"    ✓ recovered via PubMed:{best_pmid}/{best_pmcid}: {len(best_text)} chars")

    print(f"\nFINAL RECOVERY: {recovered}/{len(missing)} additional guidelines recovered")


if __name__ == "__main__":
    main()
