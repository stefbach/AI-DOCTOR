import httpx
import respx

from sources import europepmc

SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"

SAMPLE_ROW = {
    "id": "12345678",
    "source": "MED",
    "pmid": "12345678",
    "pmcid": "PMC9999999",
    "doi": "10.1016/j.example.2024.01.001",
    "title": "Efficacy of drug X in condition Y: a systematic review and meta-analysis",
    "abstractText": "Background: ... Conclusion: drug X is effective.",
    "journalInfo": {"journal": {"title": "The Lancet"}},
    "pubYear": "2024",
    "authorList": {"author": [{"fullName": "Smith J"}, {"fullName": "Doe A"}]},
    "pubTypeList": {"pubType": ["Journal Article", "Meta-Analysis"]},
    "meshHeadingList": {"meshHeading": [{"descriptorName": "Hypertension"}]},
    "isOpenAccess": "Y",
    "citedByCount": 42,
    "language": "eng",
}


def test_build_query_includes_mesh_and_pub_types():
    q = europepmc.build_query("Hypertension")
    assert 'MESH:"Hypertension"' in q
    assert 'PUB_TYPE:"meta-analysis"' in q
    assert 'PUB_TYPE:"systematic review"' in q


def test_build_query_with_since_year_and_extra_query():
    q = europepmc.build_query("Asthma", since_year=2020, extra_query="AND (child OR pediatric)")
    assert "2020-01-01" in q
    assert "child OR pediatric" in q


@respx.mock
async def test_search_returns_rows_from_single_page():
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "resultList": {"result": [SAMPLE_ROW]},
                "nextCursorMark": None,
            },
        )
    )
    async with httpx.AsyncClient() as client:
        rows = await europepmc.search(client, "Hypertension", max_results=10)

    assert len(rows) == 1
    assert rows[0]["pmid"] == "12345678"


@respx.mock
async def test_search_handles_server_error_gracefully():
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(500))
    async with httpx.AsyncClient() as client:
        rows = await europepmc.search(client, "Hypertension", max_results=10)
    assert rows == []


def test_to_document_dict_maps_fields_correctly():
    doc = europepmc.to_document_dict(SAMPLE_ROW)
    assert doc["doc_id"] == "PMC9999999"
    assert doc["doi"] == "10.1016/j.example.2024.01.001"
    assert doc["journal"] == "The Lancet"
    assert doc["year"] == 2024
    assert doc["authors"] == ["Smith J", "Doe A"]
    assert doc["doc_type"] == "meta-analysis"
    assert doc["mesh_terms"] == ["Hypertension"]
    assert doc["full_text_available"] is True
    assert doc["citation_count"] == 42
    assert doc["retracted"] is False
    assert doc["source"] == "europepmc"


def test_is_retracted_detects_retracted_publication():
    row = {**SAMPLE_ROW, "pubTypeList": {"pubType": ["Retracted Publication"]}}
    assert europepmc.is_retracted(row)


def test_xml_to_plain_text_strips_tags():
    xml = "<article><body><p>Hello <b>world</b>.</p></body></article>"
    text = europepmc.xml_to_plain_text(xml)
    assert text == "Hello world ."


def test_xml_to_plain_text_returns_none_on_malformed_xml():
    assert europepmc.xml_to_plain_text("<not-closed>") is None


def test_clean_abstract_html_converts_h4_sections_to_labelled_text():
    raw = "<h4>Background</h4>Some context.<h4>Conclusion</h4>Drug X works."
    cleaned = europepmc.clean_abstract_html(raw)
    assert cleaned == "BACKGROUND: Some context.\nCONCLUSION: Drug X works."


def test_clean_abstract_html_strips_tags_when_no_sections():
    assert europepmc.clean_abstract_html("<p>Plain <i>text</i>.</p>") == "Plain text."


@respx.mock
async def test_fetch_full_text_xml_uses_bare_pmcid_path():
    route = respx.get("https://www.ebi.ac.uk/europepmc/webservices/rest/PMC1234567/fullTextXML").mock(
        return_value=httpx.Response(200, text="<article><body>full text</body></article>")
    )
    async with httpx.AsyncClient() as client:
        xml_text = await europepmc.fetch_full_text_xml(client, "PMC1234567")
    assert route.called
    assert xml_text is not None and "full text" in xml_text


@respx.mock
async def test_fetch_full_text_xml_returns_none_on_404():
    respx.get("https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7654321/fullTextXML").mock(
        return_value=httpx.Response(404)
    )
    async with httpx.AsyncClient() as client:
        xml_text = await europepmc.fetch_full_text_xml(client, "PMC7654321")
    assert xml_text is None
