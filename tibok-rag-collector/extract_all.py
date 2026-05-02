#!/usr/bin/env python3
"""
Massive PDF download + text extraction pipeline.
Reads guidelines_master.csv, downloads accessible PDFs, extracts text,
saves as one JSON per source in extracted/<SOURCE>.json.

Outputs per-source JSON files committed to git so the user can VIEW the
guideline content directly in the repo (without needing to run anything).
"""
import csv
import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# PMC fallback (NCBI E-utilities) — used when direct download fails
sys.path.insert(0, str(Path(__file__).parent))
try:
    from pmc_fallback import find_pmc_mirror
    PMC_OK = True
except Exception as e:
    print(f"[warn] PMC fallback not available: {e}")
    PMC_OK = False
    find_pmc_mirror = None

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
HEADERS = {"User-Agent": UA, "Accept": "*/*"}
TIMEOUT = 90
RATE = 1.5  # sec between requests to same domain

ROOT = Path(__file__).parent.parent  # AI-DOCTOR root
CSV_PATH = ROOT / "tibok-rag-collector" / "guidelines_master.csv"
PDF_DIR = ROOT / "tibok-rag-collector" / "pdfs"
EXTRACT_DIR = ROOT / "tibok-rag-collector" / "extracted"

PDF_DIR.mkdir(parents=True, exist_ok=True)
EXTRACT_DIR.mkdir(parents=True, exist_ok=True)

last_call = {}


def throttle(url):
    from urllib.parse import urlparse
    host = urlparse(url).netloc
    now = time.monotonic()
    last = last_call.get(host, 0)
    wait = (last + RATE) - now
    if wait > 0:
        time.sleep(wait)
    last_call[host] = time.monotonic()


def fetch(url, stream=False):
    throttle(url)
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=stream, allow_redirects=True)
        return r
    except Exception as e:
        print(f"   ✗ fetch error: {e}")
        return None


def resolve_pdf_url(row):
    """Resolve the actual PDF URL for a row (handle per-source patterns)."""
    src = row["source"]
    page_url = row["page_url"]
    hint = row.get("pdf_url_hint", "").strip()
    if hint and hint.endswith(".pdf"):
        return hint
    if page_url.endswith(".pdf"):
        return page_url

    # Resolvers per source (subset — direct download patterns)
    if src == "AHA" and "/doi/" in page_url and "/pdf/" not in page_url:
        return page_url.replace("/doi/", "/doi/pdf/")
    if src == "ERS" and not page_url.endswith(".full.pdf"):
        return page_url + ".full.pdf"
    if src == "EASL" and "/fulltext" in page_url:
        return page_url.replace("/fulltext", "/pdf")

    # For other sources, scrape the page for a PDF link
    r = fetch(page_url)
    if not r or r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")

    if src == "NICE":
        for a in soup.select("a[href*='/resources/']"):
            href = a.get("href", "")
            if re.search(r"-pdf-\d+$", href):
                return urljoin(page_url, href)
    if src == "USPSTF":
        for a in soup.select("a[href*='RecommendationStatementFinal']"):
            full = urljoin(page_url, a.get("href", ""))
            if full.endswith(".pdf"):
                return full
    if src == "HAS":
        candidates = []
        for a in soup.select("a[href*='/upload/docs/application/pdf/']"):
            h = a.get("href", "")
            if h.lower().endswith(".pdf"):
                candidates.append(urljoin(page_url, h))
        if candidates:
            for kw in ("recommandation", "guide", "synthese", "rapport"):
                for c in candidates:
                    if kw in c.lower():
                        return c
            return candidates[0]
    if src == "WHO":
        for a in soup.select("a[href*='iris.who.int']"):
            h = a.get("href", "")
            if ".pdf" in h.lower() or "bitstream" in h.lower():
                return urljoin(page_url, h)

    # Fallback: any PDF link
    for a in soup.select("a[href$='.pdf']"):
        return urljoin(page_url, a["href"])
    return None


def download_pdf(url, target):
    if target.exists() and target.stat().st_size > 1024:
        return True
    r = fetch(url, stream=True)
    if not r or r.status_code != 200:
        return False
    ct = r.headers.get("Content-Type", "").lower()
    if "html" in ct and "pdf" not in ct:
        return False
    with open(target, "wb") as f:
        for chunk in r.iter_content(1 << 14):
            if chunk:
                f.write(chunk)
    if target.stat().st_size < 1024:
        target.unlink(missing_ok=True)
        return False
    with open(target, "rb") as f:
        if not f.read(5).startswith(b"%PDF-"):
            target.unlink(missing_ok=True)
            return False
    return True


def extract_text(pdf_path):
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", "-q", str(pdf_path), "-"],
            capture_output=True, timeout=120, text=True, errors="replace"
        )
        return result.stdout
    except Exception as e:
        print(f"   pdftotext error: {e}")
        return ""


def chunk_text(text, chunk_size=800, overlap=100):
    text = re.sub(r"\s+", " ", text).strip()
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        slice_words = words[i:i + chunk_size]
        if len(slice_words) < 30:
            break
        chunks.append({"chunk_index": len(chunks), "content": " ".join(slice_words)})
    return chunks


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def main():
    only_source = sys.argv[1] if len(sys.argv) > 1 else None
    max_per_source = int(sys.argv[2]) if len(sys.argv) > 2 else 50

    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    by_source = {}
    for r in rows:
        if only_source and r["source"] != only_source:
            continue
        by_source.setdefault(r["source"], []).append(r)

    overall_summary = []

    for source, source_rows in by_source.items():
        source_rows = source_rows[:max_per_source]
        print(f"\n{'═' * 70}")
        print(f"📚 {source} — {len(source_rows)} guidelines")
        print(f"{'═' * 70}")

        out_json = EXTRACT_DIR / f"{source}.json"
        existing_docs = []
        if out_json.exists():
            try:
                existing_docs = json.loads(out_json.read_text())["documents"]
            except Exception:
                pass
        existing_ids = {d["id"] for d in existing_docs}

        documents = list(existing_docs)
        new_count = 0
        skip_count = 0
        fail_count = 0

        src_pdf_dir = PDF_DIR / source
        src_pdf_dir.mkdir(parents=True, exist_ok=True)

        for row in source_rows:
            gid = row["id"]
            if gid in existing_ids:
                skip_count += 1
                continue

            print(f"\n  [{gid}] {row['title'][:70]}")
            target = src_pdf_dir / f"{gid}.pdf"

            pdf_url = resolve_pdf_url(row)
            pdf_source = "direct"
            pmcid = None
            ok = False
            if pdf_url:
                ok = download_pdf(pdf_url, target)
                if ok:
                    print(f"     ✓ direct: {pdf_url[:80]}")

            # Fallback PMC (NCBI) if direct failed
            if not ok and PMC_OK:
                print(f"     ↻ trying PMC fallback...")
                sess = requests.Session()
                sess.headers.update(HEADERS)
                pmc = find_pmc_mirror(sess, row["title"], row["year"], row["source"])
                if pmc and pmc.get("pdf_url"):
                    pdf_url = pmc["pdf_url"]
                    pmcid = pmc["pmcid"]
                    pdf_source = "pmc"
                    ok = download_pdf(pdf_url, target)
                    if ok:
                        print(f"     ✓ PMC ({pmcid}): {pdf_url[:80]}")

            if not ok:
                print(f"     ✗ no PDF (direct + PMC both failed)")
                fail_count += 1
                continue

            size = target.stat().st_size
            print(f"     ✓ downloaded {size // 1024}KB from {pdf_url[:80]}")

            text = extract_text(target)
            if len(text) < 500:
                print(f"     ✗ extracted text too short ({len(text)} chars)")
                fail_count += 1
                continue

            chunks = chunk_text(text)
            if not chunks:
                fail_count += 1
                continue

            doc = {
                "id": gid,
                "source": row["source"],
                "title": row["title"],
                "year": row["year"],
                "page_url": row["page_url"],
                "pdf_url": pdf_url,
                "license": row["license"],
                "commercial_use": row["commercial_use"],
                "clinical_domain": row["clinical_domain"],
                "priority": row["priority"],
                "sha256": sha256_of(target),
                "size_bytes": size,
                "pdf_source": pdf_source,
                "pmcid": pmcid,
                "char_count": len(text),
                "chunk_count": len(chunks),
                "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "chunks": chunks,
            }
            documents.append(doc)
            new_count += 1
            print(f"     ✓ extracted {len(text)} chars, {len(chunks)} chunks")

            # Save incrementally to avoid losing work
            payload = {
                "source": source,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "total_documents": len(documents),
                "documents": documents,
            }
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=1)

        print(f"\n  📊 {source}: new={new_count} skipped={skip_count} failed={fail_count}")
        overall_summary.append({
            "source": source,
            "total_in_csv": len(source_rows),
            "extracted": len(documents),
            "new": new_count,
            "skipped": skip_count,
            "failed": fail_count,
        })

    # Global summary
    summary_path = EXTRACT_DIR / "_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "sources": overall_summary,
            "total_extracted": sum(s["extracted"] for s in overall_summary),
            "total_failed": sum(s["failed"] for s in overall_summary),
        }, f, ensure_ascii=False, indent=2)

    print(f"\n{'═' * 70}")
    print("FINAL SUMMARY")
    print(f"{'═' * 70}")
    for s in overall_summary:
        print(f"  {s['source']:8s} extracted {s['extracted']}/{s['total_in_csv']} (new={s['new']} failed={s['failed']})")


if __name__ == "__main__":
    main()
