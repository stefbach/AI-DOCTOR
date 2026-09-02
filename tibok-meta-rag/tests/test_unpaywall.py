import httpx
import respx

from sources import unpaywall

DOI = "10.1001/jama.2023.00001"
URL = f"https://api.unpaywall.org/v2/{DOI}"


@respx.mock
async def test_find_oa_pdf_url_returns_pdf_when_available(monkeypatch):
    monkeypatch.setenv("UNPAYWALL_EMAIL", "test@example.com")
    respx.get(URL).mock(
        return_value=httpx.Response(
            200,
            json={"best_oa_location": {"url_for_pdf": "https://example.org/paper.pdf"}},
        )
    )
    async with httpx.AsyncClient() as client:
        url = await unpaywall.find_oa_pdf_url(client, DOI)
    assert url == "https://example.org/paper.pdf"


@respx.mock
async def test_find_oa_pdf_url_returns_none_when_no_oa_location(monkeypatch):
    monkeypatch.setenv("UNPAYWALL_EMAIL", "test@example.com")
    respx.get(URL).mock(return_value=httpx.Response(200, json={"best_oa_location": None}))
    async with httpx.AsyncClient() as client:
        url = await unpaywall.find_oa_pdf_url(client, DOI)
    assert url is None


@respx.mock
async def test_find_oa_pdf_url_returns_none_on_404(monkeypatch):
    monkeypatch.setenv("UNPAYWALL_EMAIL", "test@example.com")
    respx.get(URL).mock(return_value=httpx.Response(404))
    async with httpx.AsyncClient() as client:
        url = await unpaywall.find_oa_pdf_url(client, DOI)
    assert url is None


async def test_find_oa_pdf_url_skips_when_email_not_set(monkeypatch):
    monkeypatch.delenv("UNPAYWALL_EMAIL", raising=False)
    async with httpx.AsyncClient() as client:
        url = await unpaywall.find_oa_pdf_url(client, DOI)
    assert url is None


@respx.mock
async def test_enrich_missing_full_text_sets_flag_only_when_pdf_found(monkeypatch):
    monkeypatch.setenv("UNPAYWALL_EMAIL", "test@example.com")
    respx.get(URL).mock(
        return_value=httpx.Response(
            200, json={"best_oa_location": {"url_for_pdf": "https://example.org/paper.pdf"}}
        )
    )
    documents = [
        {"doi": DOI, "full_text_available": False},
        {"doi": None, "full_text_available": False},
        {"doi": "10.1/already-oa", "full_text_available": True},
    ]
    async with httpx.AsyncClient() as client:
        await unpaywall.enrich_missing_full_text(client, documents)

    assert documents[0]["full_text_available"] is True
    assert documents[1]["full_text_available"] is False
    assert documents[2]["full_text_available"] is True
