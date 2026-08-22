from specialty_map import specialty_for


def test_category_default_used_when_no_override():
    assert specialty_for("dt2", "endocrino-metabolique") == "endocrinology"
    assert specialty_for("mrc", "nephro-urologie") == "nephrology"


def test_pathology_override_wins_over_category_default():
    assert specialty_for("hbp", "nephro-urologie") == "urology"
    assert specialty_for("lombalgie", "rhumato-msk") == "musculoskeletal"
    assert specialty_for("dengue", "infectiologie") == "tropical_diseases"
    assert specialty_for("sinusite", "ophtalmo-orl") == "ent"


def test_unknown_category_falls_back_to_general_medicine():
    assert specialty_for("unknown_pathology", "unknown_category") == "general_medicine"
