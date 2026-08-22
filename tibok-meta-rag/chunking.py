"""Split a retrieved meta-analysis Document into embeddable chunks.

Mirrors the shape scripts/rag-ingest/ingest.py expects (a list of
{"chunk_index": int, "content": str}) but produces it ourselves — unlike
Stéphane's export, our documents aren't pre-chunked.

Chunk 0 is always title + abstract (+ conclusions, if not already folded
into the abstract by the source's own structured-abstract labelling) — this
is what most queries will match, since it's short, dense and consistently
present. Chunks 1..N split full_text (only present for OA articles) into
~3500-char windows on paragraph boundaries, small enough to stay well under
text-embedding-3-small's 8192-token cap (see generate-embeddings.mjs for the
char-based safety margin this mirrors) without a second truncation surprise
at embedding time.
"""

from __future__ import annotations

from typing import Any

FULL_TEXT_CHUNK_CHARS = 3500
FULL_TEXT_CHUNK_OVERLAP = 300


def _build_summary_chunk(doc: dict[str, Any]) -> str:
    parts = [doc.get("title", "").strip()]
    abstract = (doc.get("abstract") or "").strip()
    if abstract:
        parts.append(abstract)
    conclusions = (doc.get("conclusions") or "").strip()
    if conclusions and conclusions not in abstract:
        parts.append(f"CONCLUSION: {conclusions}")
    return "\n\n".join(p for p in parts if p)


def _split_full_text(full_text: str) -> list[str]:
    """Greedy paragraph-aware split into ~FULL_TEXT_CHUNK_CHARS windows."""
    text = full_text.strip()
    if not text:
        return []
    if len(text) <= FULL_TEXT_CHUNK_CHARS:
        return [text]

    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    if len(paragraphs) <= 1:
        paragraphs = [text]

    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) > FULL_TEXT_CHUNK_CHARS and current:
            chunks.append(current)
            # small overlap so a fact split across the boundary still has
            # a chance to be retrieved from either neighbouring chunk
            current = current[-FULL_TEXT_CHUNK_OVERLAP:] + "\n\n" + para
        else:
            current = candidate
    if current:
        chunks.append(current)

    # A single paragraph longer than the window (rare, e.g. a giant table)
    # still needs hard splitting so no chunk blows past the safety margin.
    hard_split: list[str] = []
    for c in chunks:
        if len(c) <= FULL_TEXT_CHUNK_CHARS * 1.2:
            hard_split.append(c)
            continue
        for i in range(0, len(c), FULL_TEXT_CHUNK_CHARS):
            hard_split.append(c[i : i + FULL_TEXT_CHUNK_CHARS])
    return hard_split


def chunk_document(doc: dict[str, Any]) -> list[dict[str, Any]]:
    """Return [{"chunk_index": int, "content": str}, ...] for one Document."""
    chunks: list[dict[str, Any]] = []

    summary = _build_summary_chunk(doc)
    if summary:
        chunks.append({"chunk_index": 0, "content": summary})

    full_text = doc.get("full_text")
    if full_text:
        for i, piece in enumerate(_split_full_text(full_text), start=1):
            chunks.append({"chunk_index": i, "content": piece})

    return chunks
