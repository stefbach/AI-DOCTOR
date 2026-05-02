#!/usr/bin/env python3
"""
Unit tests for download_guidelines.py resolvers.
Run: python3 test_resolvers.py
"""
import sys
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from download_guidelines import (
    resolve_nice, resolve_uspstf, resolve_cdc_mmwr, resolve_ecdc,
    resolve_who, resolve_has, resolve_oxford_academic,
    resolve_ahajournals, resolve_easl, resolve_ers, resolve_kdigo,
)


def make_response(status=200, html=""):
    r = MagicMock()
    r.status_code = status
    r.text = html
    return r


class TestResolvers(unittest.TestCase):

    def test_nice_finds_pdf_link(self):
        html = '''
        <html><body>
          <a href="/guidance/ng136/resources/visual-summary-pdf-6899919517">
              Visual summary (PDF)</a>
          <a href="/guidance/ng136/resources/hypertension-in-adults-diagnosis-and-management-pdf-66141722710213">
              Download guidance (PDF)</a>
        </body></html>
        '''
        with patch("download_guidelines.fetch",
                   return_value=make_response(200, html)):
            url = resolve_nice(MagicMock(), "https://www.nice.org.uk/guidance/ng136")
        self.assertIsNotNone(url)
        self.assertIn("-pdf-", url)
        self.assertTrue(url.startswith("https://www.nice.org.uk/"))

    def test_uspstf_finds_pdf_via_doc_page(self):
        rec_page = '''
        <a href="/uspstf/document/RecommendationStatementFinal/breast-cancer-screening">
            Final recommendation</a>
        '''
        doc_page = '''
        <a href="/sites/default/files/file/.../breast-cancer-final-rec.pdf">
            Download PDF</a>
        '''
        responses = [make_response(200, rec_page),
                     make_response(200, doc_page)]
        with patch("download_guidelines.fetch", side_effect=responses):
            url = resolve_uspstf(
                MagicMock(),
                "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening")
        self.assertIsNotNone(url)
        self.assertTrue(url.endswith(".pdf"))

    def test_cdc_mmwr_passthrough_if_pdf(self):
        url = resolve_cdc_mmwr(
            MagicMock(),
            "https://www.cdc.gov/hiv/pdf/risk/prep/cdc-hiv-prep-guidelines-2021.pdf")
        self.assertEqual(url, "https://www.cdc.gov/hiv/pdf/risk/prep/cdc-hiv-prep-guidelines-2021.pdf")

    def test_cdc_mmwr_finds_rr_pdf(self):
        html = '''
        <a href="/mmwr/volumes/71/rr/pdfs/rr7103a1-H.pdf">PDF</a>
        '''
        with patch("download_guidelines.fetch",
                   return_value=make_response(200, html)):
            url = resolve_cdc_mmwr(
                MagicMock(),
                "https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm")
        self.assertIsNotNone(url)
        self.assertIn("rr7103a1", url)

    def test_ecdc_passthrough(self):
        url = resolve_ecdc(
            MagicMock(),
            "https://www.ecdc.europa.eu/sites/default/files/documents/x.pdf")
        self.assertTrue(url.endswith(".pdf"))

    def test_who_finds_iris_pdf(self):
        html = '''
        <a href="https://iris.who.int/bitstream/handle/10665/123456/9789240033986-eng.pdf">
            Download</a>
        '''
        with patch("download_guidelines.fetch",
                   return_value=make_response(200, html)):
            url = resolve_who(
                MagicMock(),
                "https://www.who.int/publications/i/item/9789240033986")
        self.assertIsNotNone(url)
        self.assertIn("iris.who.int", url)

    def test_has_prefers_recommandation_pdf(self):
        html = '''
        <a href="/upload/docs/application/pdf/2024-03/synthese.pdf">Synthèse</a>
        <a href="/upload/docs/application/pdf/2024-03/recommandation_hta.pdf">Recommandation</a>
        <a href="/upload/docs/application/pdf/2024-03/methode.pdf">Méthode</a>
        '''
        with patch("download_guidelines.fetch",
                   return_value=make_response(200, html)):
            url = resolve_has(
                MagicMock(),
                "https://www.has-sante.fr/jcms/p_3489524/fr/hta")
        self.assertIsNotNone(url)
        self.assertIn("recommandation", url.lower())

    def test_oxford_academic_finds_article_pdf(self):
        html = '''
        <a href="/eurheartj/article-pdf/45/36/3415/12345/ehae177.pdf">PDF</a>
        '''
        with patch("download_guidelines.fetch",
                   return_value=make_response(200, html)):
            url = resolve_oxford_academic(
                MagicMock(),
                "https://academic.oup.com/eurheartj/article/45/36/3415/7743115")
        self.assertIsNotNone(url)
        self.assertIn("article-pdf", url)

    def test_oxford_academic_fallback_url_swap(self):
        with patch("download_guidelines.fetch",
                   return_value=make_response(200, "<html></html>")):
            url = resolve_oxford_academic(
                MagicMock(),
                "https://academic.oup.com/eurheartj/article/45/36/3415/7743115")
        self.assertIsNotNone(url)
        self.assertIn("article-pdf", url)

    def test_ahajournals_doi_swap(self):
        url = resolve_ahajournals(
            MagicMock(),
            "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001356")
        self.assertEqual(
            url,
            "https://www.ahajournals.org/doi/pdf/10.1161/CIR.0000000000001356")

    def test_easl_fallback_swap(self):
        with patch("download_guidelines.fetch",
                   return_value=make_response(200, "<html></html>")):
            url = resolve_easl(
                MagicMock(),
                "https://www.journal-of-hepatology.eu/article/S0168-8278(24)02508-X/fulltext")
        self.assertIsNotNone(url)
        self.assertIn("/pdf", url)
        self.assertNotIn("fulltext", url)

    def test_ers_appends_full_pdf(self):
        url = resolve_ers(
            MagicMock(),
            "https://publications.ersnet.org/content/erj/64/3/2400125")
        self.assertTrue(url.endswith(".full.pdf"))

    def test_ers_passthrough_if_pdf(self):
        url = resolve_ers(
            MagicMock(),
            "https://publications.ersnet.org/content/erj/66/6/2501126.full.pdf")
        self.assertTrue(url.endswith(".full.pdf"))

    def test_kdigo_only_accepts_pdf_hint(self):
        url = resolve_kdigo(
            MagicMock(),
            "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf")
        self.assertIsNotNone(url)


if __name__ == "__main__":
    unittest.main(verbosity=2)
