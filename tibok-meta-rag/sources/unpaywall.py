"""Unpaywall client — optional enrichment for DOIs Europe PMC didn't mark OA.

Never downloads content: only asks whether a legal OA PDF location exists
(`best_oa_location.url_for_pdf`) and returns that URL for the record's
metadata. Downloading/parsing that PDF is out of scope for this pipeline.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from ratelimit import AsyncRateLimiter

logger = logging.getLogger("tibok_meta_rag.unpaywall")

BASE_URL = "https://api.unpaywall.org/v2"
MAX_REQ_PER_SEC = 5

_rate_limiter = AsyncRateLimiter(rate=MAX_REQ_PER_SEC, period=1.0)


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 500, 502, 503, 504)
    return isinstance(exc, (httpx.TransportError, httpx.TimeoutException))


def _retrying():
    return retry(
        reraise=True,
        retry=retry_if_exception(_is_retryable),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        stop=stop_after_attempt(5),
    )


@_retrying()
async def _get(client: httpx.AsyncClient, doi: str, email: str) -> httpx.Response | None:
    await _rate_limiter.acquire()
    resp = await client.get(f"{BASE_URL}/{doi}", params={"email": email}, timeout=30.0)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp


async def find_oa_pdf_url(client: httpx.AsyncClient, doi: str) -> str | None:
    """Return a legal OA PDF URL for `doi`, or None if none exists / lookup fails."""
    email = os.environ.get("UNPAYWALL_EMAIL")
    if not email:
        logger.warning("[unpaywall] UNPAYWALL_EMAIL not set — skipping enrichment for %s", doi)
        return None
    try:
        resp = await _get(client, doi, email)
    except (httpx.HTTPStatusError, httpx.TransportError, httpx.TimeoutException) as exc:
        logger.warning("[unpaywall] lookup failed for doi=%s: %s", doi, exc)
        return None
    if resp is None:
        return None
    data: dict[str, Any] = resp.json()
    best_location = data.get("best_oa_location") or {}
    return best_location.get("url_for_pdf")


async def enrich_missing_full_text(client: httpx.AsyncClient, documents: list[dict[str, Any]]) -> None:
    """Mutates `documents` in place: sets full_text_available for OA-confirmed DOIs.

    We deliberately do NOT fetch/store the PDF body — just the fact that a
    legal OA copy exists and where, which is enough for citation traceability.
    Full text stays whatever Europe PMC already provided (None if not OA there).
    """
    for doc in documents:
        if doc.get("full_text_available") or not doc.get("doi"):
            continue
        pdf_url = await find_oa_pdf_url(client, doc["doi"])
        if pdf_url:
            doc["full_text_available"] = True
            doc["_unpaywall_oa_pdf_url"] = pdf_url
            logger.info("[unpaywall] OA PDF found for doi=%s", doc["doi"])
