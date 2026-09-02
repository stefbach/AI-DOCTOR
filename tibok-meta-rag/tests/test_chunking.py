from chunking import chunk_document


def make_doc(**overrides):
    doc = {
        "doc_id": "PMC123",
        "title": "Efficacy of drug X: a meta-analysis",
        "abstract": "Background: ... Conclusion: drug X works.",
        "conclusions": "",
        "full_text": None,
        "full_text_available": False,
    }
    doc.update(overrides)
    return doc


def test_chunk_document_summary_only_when_no_full_text():
    chunks = chunk_document(make_doc())
    assert len(chunks) == 1
    assert chunks[0]["chunk_index"] == 0
    assert "Efficacy of drug X" in chunks[0]["content"]
    assert "drug X works" in chunks[0]["content"]


def test_chunk_document_includes_distinct_conclusions():
    doc = make_doc(abstract="Background: risk factors reviewed.", conclusions="Statins reduce risk.")
    chunks = chunk_document(doc)
    assert "CONCLUSION: Statins reduce risk." in chunks[0]["content"]


def test_chunk_document_skips_conclusions_already_in_abstract():
    doc = make_doc(abstract="... CONCLUSION: drug X works well.", conclusions="drug X works well.")
    chunks = chunk_document(doc)
    assert chunks[0]["content"].count("drug X works well") == 1


def test_chunk_document_splits_full_text_into_multiple_chunks():
    long_text = "\n".join(f"Paragraph {i} " + "word " * 200 for i in range(20))
    doc = make_doc(full_text=long_text, full_text_available=True)
    chunks = chunk_document(doc)
    assert len(chunks) > 2
    assert chunks[0]["chunk_index"] == 0
    indices = [c["chunk_index"] for c in chunks[1:]]
    assert indices == sorted(indices)
    assert all(len(c["content"]) <= 3500 * 1.2 + 1 for c in chunks[1:])


def test_chunk_document_no_full_text_chunks_when_full_text_none():
    chunks = chunk_document(make_doc(full_text=None))
    assert len(chunks) == 1


def test_chunk_document_hard_splits_a_single_giant_paragraph():
    giant = "x" * 10_000
    doc = make_doc(full_text=giant, full_text_available=True)
    chunks = chunk_document(doc)
    full_text_chunks = chunks[1:]
    assert len(full_text_chunks) >= 3
    assert all(len(c["content"]) <= 3500 for c in full_text_chunks)
