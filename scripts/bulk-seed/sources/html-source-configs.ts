/**
 * HTML scraping configurations for the 11 medical society sources.
 *
 * Each entry corresponds to a source in sources-config.ts and provides:
 *   - link_selector: CSS selector to find guideline links on the index page
 *   - link_filter: optional URL/title filter
 *   - content_selector: CSS selector for main content (omit for default)
 *   - pdf_selector: CSS selector for PDF download links (if available)
 *   - max_links: cost control
 *
 * NOTE: CSS selectors may need adjustment when source websites are redesigned.
 * If a scraper stops returning results, inspect the source HTML and update
 * the selector here.
 */

import { SOURCES } from '../lib/sources-config.js'
import type { HTMLScrapingConfig } from './html-scrape-guidelines.js'

// ============================================================================
// ESC — European Society of Cardiology
// ============================================================================
export const ESC_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.ESC,
  link_selector: 'a[href*="/Guidelines/Clinical-Practice-Guidelines/"]',
  link_filter: (href, text) => {
    // Skip non-guideline links and old archived ones (>5 years)
    if (text.length < 5) return false
    if (/2018|2017|2016|2015/i.test(text)) return false
    return true
  },
  pdf_selector: 'a[href$=".pdf"][title*="Pocket"]',
  max_links: 25,
  user_agent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  code_extractor: (url, title) => {
    // ESC URLs: /Guidelines/Clinical-Practice-Guidelines/Acute-Coronary-Syndromes-Guidelines
    const m = url.match(/\/Clinical-Practice-Guidelines\/([^/?]+)/i)
    if (m) return `ESC-${m[1].slice(0, 60)}`
    return `ESC-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// AHA — American Heart Association
// ============================================================================
export const AHA_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.AHA,
  link_selector:
    'a[href*="/guidelines/"], a[href*="/statements/"], a[href*="ahajournals.org"]',
  link_filter: (href, text) => {
    if (text.length < 8) return false
    const lower = text.toLowerCase()
    return /guideline|statement|recommendation/.test(lower)
  },
  max_links: 20,
  code_extractor: (url, title) => {
    const m = url.match(/\/(guidelines|statements)\/([^/?]+)/i)
    if (m) return `AHA-${m[2].slice(0, 60)}`
    return `AHA-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// ADA — American Diabetes Association (annual Standards of Care)
// ============================================================================
export const ADA_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.ADA,
  link_selector: 'a[href*="/care/article/"][href*="Standards"]',
  link_filter: (href, text) => {
    return /standards|care/i.test(text)
  },
  pdf_selector: 'a[href*="/article-pdf/"]',
  max_links: 15,
  code_extractor: (url, title) => {
    // ADA articles by year
    const yearMatch = title.match(/20\d{2}/)
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)
    return `ADA-${year}-${slug}`
  }
}

// ============================================================================
// IDSA — Infectious Diseases Society of America
// ============================================================================
export const IDSA_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.IDSA,
  link_selector: 'a[href*="/practice-guideline/"]',
  link_filter: (href, text) => {
    if (text.length < 5) return false
    // Filter out the index page itself
    return !href.endsWith('/practice-guideline/')
  },
  max_links: 30,
  code_extractor: (url, title) => {
    const m = url.match(/\/practice-guideline\/([^/?]+)/i)
    if (m) return `IDSA-${m[1].slice(0, 60)}`
    return `IDSA-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// KDIGO — Kidney Disease: Improving Global Outcomes
// ============================================================================
export const KDIGO_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.KDIGO,
  link_selector: 'a[href*="/guidelines/"]',
  link_filter: (href, text) => {
    return text.length > 5 && !href.endsWith('/guidelines/')
  },
  pdf_selector: 'a[href$=".pdf"]',
  max_links: 15,
  code_extractor: (url, title) => {
    const m = url.match(/\/guidelines\/([^/?]+)/i)
    if (m) return `KDIGO-${m[1].slice(0, 60)}`
    return `KDIGO-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// GOLD — Global Initiative for Chronic Obstructive Lung Disease
// ============================================================================
export const GOLD_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.GOLD,
  link_selector: 'a[href*="gold-report"], a[href*="/wp-content/uploads/"][href$=".pdf"]',
  link_filter: (href, text) => {
    return /report|pocket|guide/i.test(text) || /\.pdf$/i.test(href)
  },
  pdf_selector: 'a[href$=".pdf"]',
  max_links: 10,
  code_extractor: (url, title) => {
    const yearMatch = url.match(/20\d{2}/) || title.match(/20\d{2}/)
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()
    return `GOLD-${year}-Report`
  }
}

// ============================================================================
// GINA — Global Initiative for Asthma
// ============================================================================
export const GINA_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.GINA,
  link_selector: 'a[href*="/reports/"]',
  link_filter: (href, text) => {
    return text.length > 5 && !href.endsWith('/reports/')
  },
  pdf_selector: 'a[href$=".pdf"]',
  max_links: 10,
  code_extractor: (url, title) => {
    const yearMatch = url.match(/20\d{2}/) || title.match(/20\d{2}/)
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()
    return `GINA-${year}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
  }
}

// ============================================================================
// EASL — European Association for the Study of the Liver
// ============================================================================
export const EASL_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.EASL,
  link_selector: 'a[href*="/publications/clinical-practice-guidelines/"]',
  link_filter: (href, text) => {
    return text.length > 8 && !href.endsWith('/clinical-practice-guidelines/')
  },
  pdf_selector: 'a[href$=".pdf"]',
  max_links: 20,
  code_extractor: (url, title) => {
    const m = url.match(/\/clinical-practice-guidelines\/([^/?]+)/i)
    if (m) return `EASL-${m[1].slice(0, 60)}`
    return `EASL-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// ERS — European Respiratory Society
// ============================================================================
export const ERS_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.ERS,
  link_selector: 'a[href*="/guidelines/"], a[href*="/statements/"]',
  link_filter: (href, text) => {
    return text.length > 5 && !href.endsWith('/guidelines/')
  },
  max_links: 20,
  code_extractor: (url, title) => {
    const m = url.match(/\/(guidelines|statements)\/([^/?]+)/i)
    if (m) return `ERS-${m[2].slice(0, 60)}`
    return `ERS-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// USPSTF — US Preventive Services Task Force
// ============================================================================
export const USPSTF_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.USPSTF,
  link_selector: 'a[href*="/uspstf/recommendation/"]',
  link_filter: (href, text) => {
    return text.length > 5
  },
  max_links: 30,
  code_extractor: (url, title) => {
    const m = url.match(/\/recommendation\/([^/?]+)/i)
    if (m) return `USPSTF-${m[1].slice(0, 60)}`
    return `USPSTF-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// ECDC — European Centre for Disease Prevention and Control
// (also has RSS but we add HTML scraper as fallback for richer index)
// ============================================================================
export const ECDC_HTML_CONFIG: HTMLScrapingConfig = {
  source: SOURCES.ECDC,
  link_selector: 'a[href*="/publications-data/"]',
  link_filter: (href, text) => {
    return /guideline|guidance|recommendation|technical report/i.test(text)
  },
  pdf_selector: 'a[href$=".pdf"]',
  max_links: 25,
  code_extractor: (url, title) => {
    const m = url.match(/\/publications-data\/([^/?]+)/i)
    if (m) return `ECDC-${m[1].slice(0, 60)}`
    return `ECDC-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
  }
}

// ============================================================================
// Registry of all HTML configs (for the orchestrator)
// ============================================================================
export const HTML_CONFIGS: Record<string, HTMLScrapingConfig> = {
  ESC: ESC_CONFIG,
  AHA: AHA_CONFIG,
  ADA: ADA_CONFIG,
  IDSA: IDSA_CONFIG,
  KDIGO: KDIGO_CONFIG,
  GOLD: GOLD_CONFIG,
  GINA: GINA_CONFIG,
  EASL: EASL_CONFIG,
  ERS: ERS_CONFIG,
  USPSTF: USPSTF_CONFIG,
  ECDC_HTML: ECDC_HTML_CONFIG
}
