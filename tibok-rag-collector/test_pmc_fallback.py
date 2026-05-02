#!/usr/bin/env python3
"""Unit tests for pmc_fallback.py — uses mocked NCBI responses."""
import json
import sys
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pmc_fallback import (
    search_pubmed, pmid_to_pmcid, fetch_pmc_pdf_url, find_pmc_mirror,
    _normalize_title,
)


def mock_resp(status=200, json_body=None, text=""):
    r = MagicMock()
    r.status_code = status
    if json_body is not None:
        r.json.return_value = json_body
    r.text = text
    return r


class TestPMCFallback(unittest.TestCase):

    def test_normalize_title_strips_punctuation(self):
        out = _normalize_title("ESC/EACTS 2024 Guidelines: Atrial Fibrillation!")
        self.assertNotIn(":", out)
        self.assertNotIn("/", out)
        self.assertNotIn("!", out)
        self.assertEqual(out, "esc eacts 2024 guidelines atrial fibrillation")

    def test_search_pubmed_returns_first_pmid(self):
        body = {"esearchresult": {"idlist": ["12345678", "23456789"]}}
        sess = MagicMock()
        sess.get.return_value = mock_resp(200, json_body=body)
        pmid = search_pubmed(sess, "Test guideline title", "2024")
        self.assertEqual(pmid, "12345678")

    def test_search_pubmed_falls_back_when_strict_empty(self):
        empty = mock_resp(200, {"esearchresult": {"idlist": []}})
        loose = mock_resp(200, {"esearchresult": {"idlist": ["99999999"]}})
        sess = MagicMock()
        sess.get.side_effect = [empty, loose]
        pmid = search_pubmed(sess, "Some obscure guideline", "2020")
        self.assertEqual(pmid, "99999999")

    def test_search_pubmed_returns_none_when_no_match(self):
        body = {"esearchresult": {"idlist": []}}
        sess = MagicMock()
        sess.get.return_value = mock_resp(200, json_body=body)
        pmid = search_pubmed(sess, "Nonexistent", "2024")
        self.assertIsNone(pmid)

    def test_pmid_to_pmcid_extracts_pmcid(self):
        body = {
            "linksets": [{
                "linksetdbs": [{
                    "dbto": "pmc",
                    "links": ["7734661"]
                }]
            }]
        }
        sess = MagicMock()
        sess.get.return_value = mock_resp(200, json_body=body)
        pmcid = pmid_to_pmcid(sess, "12345")
        self.assertEqual(pmcid, "PMC7734661")

    def test_pmid_to_pmcid_returns_none_no_pmc_link(self):
        body = {"linksets": [{"linksetdbs": []}]}
        sess = MagicMock()
        sess.get.return_value = mock_resp(200, json_body=body)
        pmcid = pmid_to_pmcid(sess, "12345")
        self.assertIsNone(pmcid)

    def test_fetch_pmc_pdf_url_via_meta_tag(self):
        html = '''
        <html><head>
        <meta name="citation_pdf_url"
              content="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123/pdf/article.pdf">
        </head></html>
        '''
        sess = MagicMock()
        sess.get.return_value = mock_resp(200, text=html)
        url = fetch_pmc_pdf_url(sess, "PMC123")
        self.assertEqual(
            url,
            "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123/pdf/article.pdf")

    def test_fetch_pmc_pdf_url_via_href_pattern(self):
        html = '''
        <a href="/pmc/articles/PMC456/pdf/main.pdf">Download PDF</a>
        '''
        sess = MagicMock()
        sess.get.return_value = mock_resp(200, text=html)
        url = fetch_pmc_pdf_url(sess, "PMC456")
        self.assertTrue(url.endswith("PMC456/pdf/main.pdf"))
        self.assertTrue(url.startswith("https://www.ncbi.nlm.nih.gov"))

    def test_fetch_pmc_pdf_url_fallback_to_oai(self):
        sess = MagicMock()
        sess.get.return_value = mock_resp(200, text="<html></html>")
        url = fetch_pmc_pdf_url(sess, "PMC789")
        self.assertIn("PMC789/pdf/", url)

    def test_find_pmc_mirror_full_pipeline(self):
        responses = [
            mock_resp(200, {"esearchresult": {"idlist": ["111111"]}}),
            mock_resp(200, {
                "linksets": [{"linksetdbs": [{
                    "dbto": "pmc", "links": ["999999"]
                }]}]
            }),
            mock_resp(200, text='''
                <meta name="citation_pdf_url"
                content="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC999999/pdf/x.pdf">
            '''),
        ]
        sess = MagicMock()
        sess.get.side_effect = responses
        result = find_pmc_mirror(sess, "Test guideline", "2023")
        self.assertIsNotNone(result)
        self.assertEqual(result["pmid"], "111111")
        self.assertEqual(result["pmcid"], "PMC999999")
        self.assertIn("PMC999999", result["pdf_url"])

    def test_find_pmc_mirror_no_pubmed_match(self):
        empty = mock_resp(200, {"esearchresult": {"idlist": []}})
        sess = MagicMock()
        sess.get.return_value = empty
        result = find_pmc_mirror(sess, "Nonexistent", "2024")
        self.assertIsNone(result)

    def test_find_pmc_mirror_no_pmc_deposit(self):
        responses = [
            mock_resp(200, {"esearchresult": {"idlist": ["222"]}}),
            mock_resp(200, {"linksets": [{"linksetdbs": []}]}),
        ]
        sess = MagicMock()
        sess.get.side_effect = responses
        result = find_pmc_mirror(sess, "Indexed but not OA", "2020")
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main(verbosity=2)
