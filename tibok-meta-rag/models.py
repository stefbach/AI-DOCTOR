"""Pydantic v2 schema for the TIBOK meta-analysis RAG ingestion pipeline."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DocType = Literal["meta-analysis", "systematic-review", "other"]
SourceName = Literal["europepmc", "pubmed"]


class Pathology(BaseModel):
    """One entry of pathologies.json — the input catalogue."""

    model_config = ConfigDict(extra="forbid")

    pathology_id: str
    label_fr: str
    icd10: str
    mesh: str
    category: str
    pilot: bool = False
    extra_query: str | None = None


class Document(BaseModel):
    """One retrieved meta-analysis / systematic review, ready for embedding."""

    model_config = ConfigDict(extra="forbid")

    doc_id: str
    pmid: str | None = None
    doi: str | None = None
    title: str
    abstract: str = ""
    conclusions: str = ""
    full_text_available: bool = False
    full_text: str | None = None
    journal: str = ""
    year: int | None = None
    authors: list[str] = Field(default_factory=list)
    doc_type: DocType = "other"
    mesh_terms: list[str] = Field(default_factory=list)
    source: SourceName
    url: str = ""
    langue: str = "en"
    citation_count: int = 0

    # Internal fields used by scoring/dedup, not part of the ingestion API
    # contract but useful to keep alongside the row until output is written.
    retracted: bool = False
    publication_types: list[str] = Field(default_factory=list)
    score: float | None = None


class PathologyOutput(BaseModel):
    """Content of output/{pathology_id}.json"""

    model_config = ConfigDict(extra="forbid")

    pathology_id: str
    generated_at: datetime
    documents: list[Document]


class PathologySummary(BaseModel):
    """One row of output/_summary.json"""

    model_config = ConfigDict(extra="forbid")

    pathology_id: str
    doc_count: int
    pct_full_text_oa: float
    median_year: float | None
    sources: dict[str, int]


class IngestSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    generated_at: datetime
    pathologies: list[PathologySummary]
    total_documents: int
    errors: list[str] = Field(default_factory=list)
