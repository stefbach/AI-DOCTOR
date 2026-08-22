import httpx
import respx

from sources import pubmed

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

SAMPLE_EFETCH_XML = """<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>87654321</PMID>
      <Article>
        <Journal>
          <Title>BMJ</Title>
          <JournalIssue><PubDate><Year>2022</Year></PubDate></JournalIssue>
        </Journal>
        <ArticleTitle>Statins for primary prevention: a meta-analysis</ArticleTitle>
        <Abstract>
          <AbstractText Label="BACKGROUND">Cardiovascular risk is high.</AbstractText>
          <AbstractText Label="CONCLUSION">Statins reduce risk.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author><LastName>Garcia</LastName><Initials>M</Initials></Author>
        </AuthorList>
        <Language>eng</Language>
        <PublicationTypeList>
          <PublicationType>Journal Article</PublicationType>
          <PublicationType>Meta-Analysis</PublicationType>
        </PublicationTypeList>
      </Article>
      <MeshHeadingList>
        <MeshHeading><DescriptorName>Dyslipidemias</DescriptorName></MeshHeading>
      </MeshHeadingList>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="doi">10.1136/bmj.example</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>
"""


def test_build_query_includes_mesh_pt_and_date_range():
    q = pubmed.build_query("Dyslipidemias", since_year=2018)
    assert '"Dyslipidemias"[Mesh]' in q
    assert "meta-analysis[pt]" in q
    assert '"2018"[dp]' in q


@respx.mock
async def test_esearch_returns_pmids():
    respx.get(ESEARCH_URL).mock(
        return_value=httpx.Response(200, json={"esearchresult": {"idlist": ["87654321"]}})
    )
    async with httpx.AsyncClient() as client:
        ids = await pubmed.esearch(client, "Dyslipidemias", max_results=10)
    assert ids == ["87654321"]


@respx.mock
async def test_efetch_parses_medline_xml():
    respx.get(EFETCH_URL).mock(return_value=httpx.Response(200, text=SAMPLE_EFETCH_XML))
    async with httpx.AsyncClient() as client:
        docs = await pubmed.efetch(client, ["87654321"])

    assert len(docs) == 1
    doc = docs[0]
    assert doc["pmid"] == "87654321"
    assert doc["doi"] == "10.1136/bmj.example"
    assert doc["title"] == "Statins for primary prevention: a meta-analysis"
    assert "BACKGROUND: Cardiovascular risk is high." in doc["abstract"]
    assert "CONCLUSION: Statins reduce risk." in doc["abstract"]
    assert doc["journal"] == "BMJ"
    assert doc["year"] == 2022
    assert doc["authors"] == ["Garcia M"]
    assert doc["doc_type"] == "meta-analysis"
    assert doc["mesh_terms"] == ["Dyslipidemias"]
    assert doc["source"] == "pubmed"
    assert doc["retracted"] is False


def test_is_retracted_detects_retracted_publication():
    assert pubmed.is_retracted(["Retracted Publication"])
    assert not pubmed.is_retracted(["Meta-Analysis"])


@respx.mock
async def test_search_combines_esearch_and_efetch():
    respx.get(ESEARCH_URL).mock(
        return_value=httpx.Response(200, json={"esearchresult": {"idlist": ["87654321"]}})
    )
    respx.get(EFETCH_URL).mock(return_value=httpx.Response(200, text=SAMPLE_EFETCH_XML))
    async with httpx.AsyncClient() as client:
        docs = await pubmed.search(client, "Dyslipidemias", max_results=10)
    assert len(docs) == 1


@respx.mock
async def test_search_returns_empty_when_no_pmids_found():
    respx.get(ESEARCH_URL).mock(return_value=httpx.Response(200, json={"esearchresult": {"idlist": []}}))
    async with httpx.AsyncClient() as client:
        docs = await pubmed.search(client, "Nonexistent Term", max_results=10)
    assert docs == []
