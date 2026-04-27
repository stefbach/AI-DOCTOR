/**
 * Sources registry — configuration for all 15 guideline sources.
 *
 * Used by bulk-seed scripts (initial ingestion) AND n8n workflows
 * (continuous updates). Both reference the same source definitions to
 * ensure consistency.
 */

export type IngestionMethod = 'rss' | 'atom' | 'sitemap' | 'html_scrape' | 'api'
export type SourceFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annual'

export interface SourceConfig {
  code: string
  name: string
  country: string
  type: 'national_authority' | 'international_authority' | 'medical_society' | 'public_health' | 'regulatory'
  ingestion_method: IngestionMethod
  primary_url: string
  secondary_urls?: string[]
  cron_schedule: string
  frequency: SourceFrequency
  primary_specialties: string[]
  language: 'en' | 'fr' | 'es' | 'de'
  priority: number  // 1 = highest, used to order bulk-seed phases
  notes?: string
  // Optional filtering rules for items
  filters?: {
    titleIncludes?: string[]
    titleExcludes?: string[]
    maxAgeDays?: number
  }
}

export const SOURCES: Record<string, SourceConfig> = {
  // ─── PRIORITY 1-5 (Phase 1: bulk-seed) ──────────────────────────────────

  FDA: {
    code: 'FDA',
    name: 'FDA Drug Safety Alerts',
    country: 'USA',
    type: 'regulatory',
    ingestion_method: 'rss',
    primary_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/rss.xml',
    secondary_urls: [
      'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drugs/rss.xml'
    ],
    cron_schedule: '0 * * * *',
    frequency: 'hourly',
    primary_specialties: ['all'],
    language: 'en',
    priority: 1,
    notes: 'Targets drug_safety_alerts table, NOT medical_guidelines'
  },

  WHO: {
    code: 'WHO',
    name: 'World Health Organization',
    country: 'INT',
    type: 'international_authority',
    ingestion_method: 'rss',
    primary_url: 'https://www.who.int/feeds/entity/publications/en/rss.xml',
    cron_schedule: '0 3 * * 1',
    frequency: 'weekly',
    primary_specialties: ['public_health', 'infectious_diseases', 'maternal_health'],
    language: 'en',
    priority: 2,
    filters: {
      titleIncludes: ['guideline', 'recommendation', 'clinical', 'technical guidance'],
      titleExcludes: ['news', 'press release', 'event']
    }
  },

  HAS: {
    code: 'HAS',
    name: 'Haute Autorité de Santé',
    country: 'FR',
    type: 'national_authority',
    ingestion_method: 'rss',
    primary_url: 'https://www.has-sante.fr/jcms/fc_2875171/fr/toutes-nos-publications/feed',
    cron_schedule: '0 3 * * *',
    frequency: 'daily',
    primary_specialties: ['all'],
    language: 'fr',
    priority: 3,
    filters: {
      titleIncludes: ['recommandation', 'guide', 'fiche pertinence', 'avis'],
      titleExcludes: ['communiqué', 'actualité']
    }
  },

  CDC: {
    code: 'CDC',
    name: 'Centers for Disease Control and Prevention',
    country: 'USA',
    type: 'public_health',
    ingestion_method: 'rss',
    primary_url: 'https://tools.cdc.gov/api/v2/resources/media/rss/132608.rss',
    secondary_urls: [
      'https://www.cdc.gov/mmwr/rss/mmwr.xml'
    ],
    cron_schedule: '0 5 * * *',
    frequency: 'daily',
    primary_specialties: ['infectious_diseases', 'public_health', 'vaccination'],
    language: 'en',
    priority: 4,
    filters: {
      titleIncludes: ['guideline', 'recommendation', 'mmwr', 'vaccination schedule', 'clinical'],
      titleExcludes: ['quick stats', 'notes from the field']
    }
  },

  NICE: {
    code: 'NICE',
    name: 'National Institute for Health and Care Excellence',
    country: 'UK',
    type: 'national_authority',
    ingestion_method: 'rss',
    primary_url: 'https://www.nice.org.uk/guidance/published?type=ng,cg,qs,ta&feed=rss',
    cron_schedule: '0 3 * * *',
    frequency: 'daily',
    primary_specialties: ['all'],
    language: 'en',
    priority: 5,
    notes: 'NICE access to verify before bulk-seed (potential geo/auth restrictions). Fallback: manual PDF ingestion via scripts/bulk-seed/sources/nice-fallback.ts'
  },

  // ─── PRIORITY 6-15 (Phase 2: n8n monthly workflows) ─────────────────────

  ESC: {
    code: 'ESC',
    name: 'European Society of Cardiology',
    country: 'EU',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://www.escardio.org/Guidelines',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['cardiology'],
    language: 'en',
    priority: 6
  },

  AHA: {
    code: 'AHA',
    name: 'American Heart Association',
    country: 'USA',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://professional.heart.org/en/guidelines-and-statements',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['cardiology'],
    language: 'en',
    priority: 7
  },

  ADA: {
    code: 'ADA',
    name: 'American Diabetes Association',
    country: 'USA',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://diabetesjournals.org/care/issue',
    cron_schedule: '0 5 1 1 *',
    frequency: 'annual',
    primary_specialties: ['endocrinology', 'diabetology'],
    language: 'en',
    priority: 8
  },

  IDSA: {
    code: 'IDSA',
    name: 'Infectious Diseases Society of America',
    country: 'USA',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://www.idsociety.org/practice-guideline/',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['infectious_diseases'],
    language: 'en',
    priority: 9
  },

  KDIGO: {
    code: 'KDIGO',
    name: 'Kidney Disease: Improving Global Outcomes',
    country: 'INT',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://kdigo.org/guidelines/',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['nephrology'],
    language: 'en',
    priority: 10
  },

  GOLD: {
    code: 'GOLD',
    name: 'Global Initiative for Chronic Obstructive Lung Disease',
    country: 'INT',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://goldcopd.org/',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['pulmonology', 'copd'],
    language: 'en',
    priority: 11
  },

  GINA: {
    code: 'GINA',
    name: 'Global Initiative for Asthma',
    country: 'INT',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://ginasthma.org/reports/',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['pulmonology', 'asthma'],
    language: 'en',
    priority: 12
  },

  EASL: {
    code: 'EASL',
    name: 'European Association for the Study of the Liver',
    country: 'EU',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://easl.eu/publications/clinical-practice-guidelines/',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['hepatology'],
    language: 'en',
    priority: 13
  },

  ERS: {
    code: 'ERS',
    name: 'European Respiratory Society',
    country: 'EU',
    type: 'medical_society',
    ingestion_method: 'html_scrape',
    primary_url: 'https://www.ersnet.org/guidelines/',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['pulmonology'],
    language: 'en',
    priority: 14
  },

  USPSTF: {
    code: 'USPSTF',
    name: 'US Preventive Services Task Force',
    country: 'USA',
    type: 'national_authority',
    ingestion_method: 'html_scrape',
    primary_url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics',
    cron_schedule: '0 4 1 * *',
    frequency: 'monthly',
    primary_specialties: ['prevention', 'screening'],
    language: 'en',
    priority: 15
  },

  ECDC: {
    code: 'ECDC',
    name: 'European Centre for Disease Prevention and Control',
    country: 'EU',
    type: 'public_health',
    ingestion_method: 'rss',
    primary_url: 'https://www.ecdc.europa.eu/en/taxonomy/term/170/rss.xml',
    cron_schedule: '0 5 * * 1',
    frequency: 'weekly',
    primary_specialties: ['infectious_diseases', 'public_health', 'epidemiology'],
    language: 'en',
    priority: 16
  }
}

export const PHASE_1_SOURCES = Object.values(SOURCES).filter((s) => s.priority <= 5)
export const PHASE_2_SOURCES = Object.values(SOURCES).filter((s) => s.priority > 5)

export function getSourceByCode(code: string): SourceConfig | undefined {
  return SOURCES[code.toUpperCase()]
}
