from datetime import datetime, timezone

from scoring import dedupe, is_excluded, normalize_title, rank_and_select, score_document


def make_doc(**overrides):
    doc = {
        "doc_id": "PMID1",
        "pmid": "1",
        "doi": "10.1/abc",
        "title": "A meta-analysis of things",
        "abstract": "abstract text",
        "conclusions": "",
        "full_text_available": False,
        "full_text": None,
        "journal": "Some Journal",
        "year": 2023,
        "authors": ["Doe J"],
        "doc_type": "meta-analysis",
        "mesh_terms": ["Hypertension"],
        "source": "europepmc",
        "url": "https://example.org",
        "langue": "en",
        "citation_count": 10,
        "retracted": False,
        "publication_types": ["Meta-Analysis"],
    }
    doc.update(overrides)
    return doc


def test_normalize_title_strips_punctuation_and_case():
    assert normalize_title("A Meta-Analysis: of THINGS!") == "a metaanalysis of things"


def test_is_excluded_flags_retracted():
    doc = make_doc(retracted=True)
    assert is_excluded(doc)


def test_is_excluded_flags_letters_and_errata():
    assert is_excluded(make_doc(publication_types=["Letter"]))
    assert is_excluded(make_doc(publication_types=["Published Erratum"]))
    assert not is_excluded(make_doc(publication_types=["Meta-Analysis"]))


def test_dedupe_by_doi_merges_citation_count_and_full_text():
    a = make_doc(doi="10.1/same", citation_count=5, full_text_available=False, full_text=None)
    b = make_doc(doi="10.1/same", citation_count=20, full_text_available=True, full_text="body")
    merged = dedupe([a, b])
    assert len(merged) == 1
    assert merged[0]["citation_count"] == 20
    assert merged[0]["full_text_available"] is True
    assert merged[0]["full_text"] == "body"


def test_dedupe_by_normalized_title_when_doi_missing():
    a = make_doc(doi=None, title="Efficacy of X in Y: A meta-analysis")
    b = make_doc(doi=None, title="efficacy of x in y a metaanalysis")
    merged = dedupe([a, b])
    assert len(merged) == 1


def test_dedupe_keeps_distinct_documents_separate():
    a = make_doc(doi="10.1/one", title="Study one")
    b = make_doc(doi="10.1/two", title="Study two")
    merged = dedupe([a, b])
    assert len(merged) == 2


def test_score_document_rewards_recency_citations_journal_and_oa():
    current_year = 2026
    recent_top_journal_oa = make_doc(year=2025, citation_count=100, journal="The Lancet", full_text_available=True)
    old_unknown_journal_no_oa = make_doc(year=2010, citation_count=0, journal="Obscure Regional Journal", full_text_available=False)

    high = score_document(recent_top_journal_oa, max_citations=100, current_year=current_year)
    low = score_document(old_unknown_journal_no_oa, max_citations=100, current_year=current_year)

    assert high > low
    assert 0.0 <= low <= 1.0
    assert 0.0 <= high <= 1.0


def test_rank_and_select_excludes_retracted_and_respects_max_docs():
    docs = [make_doc(doi=f"10.1/{i}", title=f"Study {i}", year=2020 + (i % 5)) for i in range(10)]
    docs.append(make_doc(doi="10.1/bad", title="Retracted study", retracted=True))

    selected = rank_and_select(docs, max_docs=3, current_year=2026)

    assert len(selected) == 3
    assert all(not d.get("retracted") for d in selected)
    scores = [d["score"] for d in selected]
    assert scores == sorted(scores, reverse=True)


def test_rank_and_select_is_idempotent_on_merge():
    """Feeding the same document set twice (simulating a re-run) must not duplicate entries."""
    docs = [make_doc(doi="10.1/x", title="Study X")]
    first_pass = rank_and_select(docs, max_docs=25, current_year=2026)
    second_pass = rank_and_select(first_pass + docs, max_docs=25, current_year=2026)
    assert len(second_pass) == 1
