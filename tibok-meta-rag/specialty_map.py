"""Map pathologies.json entries to the SpecialtyCode enum used by the RAG
runtime (lib/rag/medical-rag.ts — keep in sync manually).

Per-pathology_id overrides exist because a handful of "category" buckets in
pathologies.json (nephro-urologie, rhumato-msk, ophtalmo-orl, infectiologie)
map to two DIFFERENT SpecialtyCode values depending on the specific
pathology — a single category-level mapping would misfile e.g. urology
topics under nephrology. Everything not listed here falls back to the
category-level default.
"""

from __future__ import annotations

CATEGORY_DEFAULT: dict[str, str] = {
    "cardiovasculaire": "cardiology",
    "endocrino-metabolique": "endocrinology",
    "respiratoire": "pulmonology",
    "nephro-urologie": "nephrology",
    "gastro-hepato": "hepatology_gastro",
    "neurologie": "neurology",
    "psychiatrie": "psychiatry",
    "rhumato-msk": "rheumatology",
    "dermatologie": "dermatology",
    "infectiologie": "infectious_diseases",
    "hematologie": "hematology",
    "gynecologie": "women_health",
    "pediatrie": "pediatrics",
    "ophtalmo-orl": "ophthalmology",
    "oncologie-depistage": "preventive_medicine",
    "allergie-immuno": "allergy",
}

PATHOLOGY_OVERRIDE: dict[str, str] = {
    # nephro-urologie -> urology (mrc stays nephrology, the category default)
    "lithiase_urinaire": "urology",
    "cystite": "urology",
    "pyelonephrite": "urology",
    "hbp": "urology",
    "incontinence_urinaire": "urology",
    "dysfonction_erectile": "urology",
    # rhumato-msk -> musculoskeletal (soft-tissue / mechanical, vs.
    # inflammatory rheumatology which stays the category default)
    "lombalgie": "musculoskeletal",
    "cervicalgie": "musculoskeletal",
    "tendinopathies": "musculoskeletal",
    "canal_carpien": "musculoskeletal",
    "capsulite": "musculoskeletal",
    # infectiologie -> tropical_diseases
    "dengue": "tropical_diseases",
    "chikungunya": "tropical_diseases",
    "leptospirose": "tropical_diseases",
    "paludisme": "tropical_diseases",
    "typhoide": "tropical_diseases",
    # ophtalmo-orl -> ent (eye conditions stay ophthalmology, the default)
    "sinusite": "ent",
    "acouphenes": "ent",
}


def specialty_for(pathology_id: str, category: str) -> str:
    return PATHOLOGY_OVERRIDE.get(pathology_id) or CATEGORY_DEFAULT.get(
        category, "general_medicine"
    )
