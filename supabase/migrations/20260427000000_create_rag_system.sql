-- ============================================================================
-- AI-DOCTOR — RAG System Migration
-- Date: 2026-04-27
-- Branch: claude/medical-assistant-transparency-dv5S9
--
-- Creates the complete RAG (Retrieval-Augmented Generation) infrastructure:
--   - medical_guidelines       (chunks + embeddings + versioning)
--   - drug_safety_alerts       (FDA/EMA/MHRA/ANSM active alerts)
--   - guideline_update_log     (audit trail)
--   - consultation_rag_trace   (per-consultation traceability — 10y retention)
--   - guideline_sources        (15 sources registry)
--   - guideline_ingestion_runs (job execution audit)
--   - guideline_failed_documents (retry queue)
--
-- RPC functions:
--   - match_guidelines(embedding, threshold, count, specialties, language)
--   - check_drug_alerts(drug_name)
--
-- Materialized view:
--   - guideline_specialty_index
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE: medical_guidelines
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_guidelines (
  id BIGSERIAL PRIMARY KEY,

  source TEXT NOT NULL CHECK (source IN (
    'NICE','WHO','ESC','AHA','ACC','ADA','HAS','IDSA',
    'KDIGO','GOLD','GINA','USPSTF','CDC','ECDC','EASL',
    'ERS','BNF','OTHER'
  )),
  guideline_code TEXT NOT NULL,
  title TEXT NOT NULL,
  section TEXT,
  chunk_index INT NOT NULL DEFAULT 0,
  total_chunks INT NOT NULL DEFAULT 1,

  content TEXT NOT NULL,
  embedding VECTOR(1536),

  url TEXT NOT NULL,
  source_hash TEXT,
  page_reference TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en','fr','es','de')),

  version TEXT NOT NULL DEFAULT '1.0',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  replaces_id BIGINT REFERENCES medical_guidelines(id),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review','active','superseded','withdrawn','rejected'
  )),
  superseded_at TIMESTAMPTZ,

  specialty TEXT[] DEFAULT '{}',
  conditions_covered TEXT[] DEFAULT '{}',
  drugs_mentioned TEXT[] DEFAULT '{}',
  patient_population JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ingested_by TEXT NOT NULL DEFAULT 'unknown',
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,

  content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,

  UNIQUE (source, guideline_code, chunk_index, version)
);

COMMENT ON TABLE medical_guidelines IS
  'Chunks of medical guidelines with embeddings for semantic RAG search.';
COMMENT ON COLUMN medical_guidelines.status IS
  'pending_review (awaiting human validation) | active (production) | superseded (replaced) | withdrawn (removed) | rejected (rejected at review)';

CREATE INDEX IF NOT EXISTS idx_guidelines_active_lookup
  ON medical_guidelines (status, source, guideline_code)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_guidelines_pending
  ON medical_guidelines (status, created_at DESC)
  WHERE status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_guidelines_embedding
  ON medical_guidelines
  USING hnsw (embedding vector_cosine_ops)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_guidelines_fts
  ON medical_guidelines
  USING gin (content_tsv)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_guidelines_specialty
  ON medical_guidelines
  USING gin (specialty)
  WHERE status = 'active';

-- updated_at trigger
CREATE OR REPLACE FUNCTION rag_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_guidelines_updated_at ON medical_guidelines;
CREATE TRIGGER trigger_guidelines_updated_at
  BEFORE UPDATE ON medical_guidelines
  FOR EACH ROW EXECUTE FUNCTION rag_update_timestamp();

-- ============================================================================
-- TABLE: drug_safety_alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS drug_safety_alerts (
  id BIGSERIAL PRIMARY KEY,

  source TEXT NOT NULL CHECK (source IN (
    'FDA','EMA','MHRA','ANSM','HealthCanada','TGA','Swissmedic','OTHER'
  )),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'recall','black_box','contraindication','shortage',
    'safety_communication','dose_adjustment','interaction_warning'
  )),
  severity TEXT CHECK (severity IN ('class_I','class_II','class_III','critical','moderate','low')),

  drug_name TEXT NOT NULL,
  drug_name_normalized TEXT NOT NULL,
  drug_name_aliases TEXT[] DEFAULT '{}',
  atc_code TEXT,

  summary TEXT NOT NULL,
  full_text TEXT,
  affected_lots TEXT[] DEFAULT '{}',
  affected_countries TEXT[] DEFAULT '{}',
  recommended_action TEXT,

  url TEXT NOT NULL,
  published_date DATE NOT NULL,
  effective_until DATE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ,
  deactivated_by TEXT,
  deactivation_reason TEXT,

  extraction_confidence FLOAT CHECK (extraction_confidence BETWEEN 0 AND 1),
  validated_by_human BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE drug_safety_alerts IS
  'Active drug safety alerts (recalls, black box warnings, etc.) from regulatory authorities.';

CREATE INDEX IF NOT EXISTS idx_alerts_active_drug
  ON drug_safety_alerts (drug_name_normalized)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_alerts_aliases
  ON drug_safety_alerts
  USING gin (drug_name_aliases)
  WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_url
  ON drug_safety_alerts (url);

-- ============================================================================
-- TABLE: guideline_update_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS guideline_update_log (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  guideline_code TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'created','updated','superseded','withdrawn','rejected','validated'
  )),
  old_version TEXT,
  new_version TEXT,
  old_hash TEXT,
  new_hash TEXT,
  changes_summary TEXT,
  significance TEXT CHECK (significance IN ('major','moderate','minor','cosmetic')),
  triggered_by TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_update_log_date
  ON guideline_update_log (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_log_source
  ON guideline_update_log (source, guideline_code);

-- ============================================================================
-- TABLE: consultation_rag_trace (10-year retention required for medico-legal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultation_rag_trace (
  id BIGSERIAL PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  patient_anonymous_id TEXT,

  query_text TEXT NOT NULL,
  query_embedding_model TEXT DEFAULT 'text-embedding-3-small',

  guidelines_retrieved JSONB NOT NULL DEFAULT '[]',
  alerts_triggered JSONB DEFAULT '[]',

  gpt_model TEXT NOT NULL DEFAULT 'gpt-5.4',
  reasoning_effort TEXT DEFAULT 'medium',
  total_input_tokens INT,
  total_output_tokens INT,
  total_cost_usd DECIMAL(10, 6),

  consultation_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE consultation_rag_trace IS
  'Per-consultation RAG traceability — REQUIRED 10-year retention for medico-legal audit.';

CREATE INDEX IF NOT EXISTS idx_rag_trace_consultation
  ON consultation_rag_trace (consultation_id);
CREATE INDEX IF NOT EXISTS idx_rag_trace_date
  ON consultation_rag_trace (created_at DESC);

-- ============================================================================
-- TABLE: guideline_sources (registry of the 15 sources)
-- ============================================================================
CREATE TABLE IF NOT EXISTS guideline_sources (
  id BIGSERIAL PRIMARY KEY,

  source_code TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  source_country TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'national_authority','international_authority','medical_society',
    'public_health','regulatory'
  )),

  ingestion_method TEXT NOT NULL CHECK (ingestion_method IN (
    'rss','atom','sitemap','html_scrape','api','manual_upload','pdf_archive'
  )),
  primary_url TEXT NOT NULL,
  secondary_urls TEXT[] DEFAULT '{}',

  cron_schedule TEXT NOT NULL,
  frequency_label TEXT NOT NULL,

  primary_specialties TEXT[] DEFAULT '{}',
  language_primary TEXT DEFAULT 'en',
  languages_supported TEXT[] DEFAULT '{en}',

  active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 5,
  n8n_workflow_id TEXT,
  last_successful_run TIMESTAMPTZ,
  last_failed_run TIMESTAMPTZ,
  consecutive_failures INT DEFAULT 0,
  access_status TEXT DEFAULT 'unknown' CHECK (access_status IN (
    'unknown','accessible','restricted','blocked','requires_auth'
  )),

  description TEXT,
  documentation_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_active
  ON guideline_sources (active, cron_schedule);
CREATE INDEX IF NOT EXISTS idx_sources_specialty
  ON guideline_sources USING gin (primary_specialties);

-- ============================================================================
-- TABLE: guideline_ingestion_runs (job audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS guideline_ingestion_runs (
  id BIGSERIAL PRIMARY KEY,

  source_id BIGINT REFERENCES guideline_sources(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running','success','partial_success','failed','skipped'
  )),

  items_fetched INT DEFAULT 0,
  items_new INT DEFAULT 0,
  items_updated INT DEFAULT 0,
  items_unchanged INT DEFAULT 0,
  items_failed INT DEFAULT 0,
  chunks_created INT DEFAULT 0,
  embeddings_generated INT DEFAULT 0,

  openai_tokens_used INT DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0,

  error_message TEXT,
  error_stack TEXT,
  warnings TEXT[],
  metadata JSONB DEFAULT '{}',

  triggered_by TEXT NOT NULL DEFAULT 'cron',
  n8n_execution_id TEXT,
  n8n_execution_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source
  ON guideline_ingestion_runs (source_code, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status
  ON guideline_ingestion_runs (status, started_at DESC);

-- ============================================================================
-- TABLE: guideline_failed_documents (retry queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS guideline_failed_documents (
  id BIGSERIAL PRIMARY KEY,
  source_code TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_title TEXT,
  error_type TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  first_failed_at TIMESTAMPTZ DEFAULT NOW(),
  last_failed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_failed_unresolved
  ON guideline_failed_documents (resolved, next_retry_at)
  WHERE resolved = FALSE;

-- ============================================================================
-- RPC: match_guidelines (semantic search)
-- ============================================================================
CREATE OR REPLACE FUNCTION match_guidelines(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.65,
  match_count INT DEFAULT 5,
  filter_specialties TEXT[] DEFAULT NULL,
  filter_language TEXT DEFAULT 'en'
)
RETURNS TABLE (
  id BIGINT,
  source TEXT,
  guideline_code TEXT,
  title TEXT,
  section TEXT,
  content TEXT,
  url TEXT,
  page_reference TEXT,
  version TEXT,
  effective_date DATE,
  specialty TEXT[],
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    g.id, g.source, g.guideline_code, g.title, g.section, g.content,
    g.url, g.page_reference, g.version, g.effective_date, g.specialty,
    1 - (g.embedding <=> query_embedding) AS similarity
  FROM medical_guidelines g
  WHERE
    g.status = 'active'
    AND g.language = filter_language
    AND (filter_specialties IS NULL OR g.specialty && filter_specialties)
    AND 1 - (g.embedding <=> query_embedding) > match_threshold
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================================
-- RPC: check_drug_alerts
-- ============================================================================
CREATE OR REPLACE FUNCTION check_drug_alerts(drug_name_input TEXT)
RETURNS TABLE (
  id BIGINT,
  source TEXT,
  alert_type TEXT,
  severity TEXT,
  drug_name TEXT,
  summary TEXT,
  url TEXT,
  published_date DATE,
  recommended_action TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id, a.source, a.alert_type, a.severity, a.drug_name,
    a.summary, a.url, a.published_date, a.recommended_action
  FROM drug_safety_alerts a
  WHERE
    a.active = TRUE
    AND (
      a.drug_name_normalized = LOWER(REGEXP_REPLACE(drug_name_input, '[^a-zA-Z0-9]', '', 'g'))
      OR EXISTS (
        SELECT 1 FROM unnest(a.drug_name_aliases) alias
        WHERE LOWER(REGEXP_REPLACE(alias, '[^a-zA-Z0-9]', '', 'g'))
            = LOWER(REGEXP_REPLACE(drug_name_input, '[^a-zA-Z0-9]', '', 'g'))
      )
    )
  ORDER BY a.published_date DESC;
$$;

-- ============================================================================
-- MATERIALIZED VIEW: guideline_specialty_index
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS guideline_specialty_index AS
SELECT
  unnest(specialty) AS specialty,
  source,
  guideline_code,
  COUNT(DISTINCT id) AS chunk_count,
  MAX(effective_date) AS latest_version_date,
  MAX(updated_at) AS last_updated
FROM medical_guidelines
WHERE status = 'active'
GROUP BY unnest(specialty), source, guideline_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_specialty_index_pk
  ON guideline_specialty_index (specialty, source, guideline_code);

CREATE OR REPLACE FUNCTION refresh_specialty_index()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY guideline_specialty_index;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE medical_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_update_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_rag_trace ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_failed_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_guidelines" ON medical_guidelines;
CREATE POLICY "service_role_all_guidelines"
  ON medical_guidelines FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_alerts" ON drug_safety_alerts;
CREATE POLICY "service_role_all_alerts"
  ON drug_safety_alerts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_log" ON guideline_update_log;
CREATE POLICY "service_role_all_log"
  ON guideline_update_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_trace" ON consultation_rag_trace;
CREATE POLICY "service_role_all_trace"
  ON consultation_rag_trace FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_sources" ON guideline_sources;
CREATE POLICY "service_role_all_sources"
  ON guideline_sources FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_runs" ON guideline_ingestion_runs;
CREATE POLICY "service_role_all_runs"
  ON guideline_ingestion_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_failed" ON guideline_failed_documents;
CREATE POLICY "service_role_all_failed"
  ON guideline_failed_documents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED: 15 guideline sources
-- ============================================================================
INSERT INTO guideline_sources
  (source_code, source_name, source_country, source_type, ingestion_method,
   primary_url, cron_schedule, frequency_label, primary_specialties,
   language_primary, priority, access_status, description)
VALUES
  ('FDA', 'FDA Drug Safety Alerts', 'USA', 'regulatory',
   'rss', 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/rss.xml',
   '0 * * * *', 'hourly', '{all}', 'en', 1, 'unknown',
   'US FDA — drug recalls and safety alerts (real-time)'),

  ('WHO', 'World Health Organization', 'INT', 'international_authority',
   'rss', 'https://www.who.int/feeds/entity/publications/en/rss.xml',
   '0 3 * * 1', 'weekly', '{public_health,infectious_diseases,maternal_health}', 'en', 2, 'unknown',
   'International health authority — global guidelines'),

  ('HAS', 'Haute Autorité de Santé', 'FR', 'national_authority',
   'rss', 'https://www.has-sante.fr/jcms/fc_2875171/fr/toutes-nos-publications/feed',
   '0 3 * * *', 'daily', '{all}', 'fr', 3, 'unknown',
   'Autorité française — recommandations de bonne pratique'),

  ('CDC', 'Centers for Disease Control and Prevention', 'USA', 'public_health',
   'rss', 'https://tools.cdc.gov/api/v2/resources/media/rss/132608.rss',
   '0 5 * * *', 'daily', '{infectious_diseases,public_health,vaccination}', 'en', 4, 'unknown',
   'US CDC — MMWR weekly report and clinical guidelines'),

  ('NICE', 'National Institute for Health and Care Excellence', 'UK', 'national_authority',
   'rss', 'https://www.nice.org.uk/guidance/published?type=ng,cg,qs,ta&feed=rss',
   '0 3 * * *', 'daily', '{all}', 'en', 5, 'unknown',
   'UK national authority — all clinical specialties (access to verify)'),

  ('ESC', 'European Society of Cardiology', 'EU', 'medical_society',
   'html_scrape', 'https://www.escardio.org/Guidelines',
   '0 4 1 * *', 'monthly', '{cardiology}', 'en', 6, 'unknown',
   'European cardiology society — clinical practice guidelines'),

  ('AHA', 'American Heart Association', 'USA', 'medical_society',
   'html_scrape', 'https://professional.heart.org/en/guidelines-and-statements',
   '0 4 1 * *', 'monthly', '{cardiology}', 'en', 7, 'unknown',
   'US cardiology — guidelines and scientific statements'),

  ('ADA', 'American Diabetes Association', 'USA', 'medical_society',
   'html_scrape', 'https://diabetesjournals.org/care/issue',
   '0 5 1 1 *', 'annual', '{endocrinology,diabetology}', 'en', 8, 'unknown',
   'Standards of Medical Care in Diabetes — annual update'),

  ('IDSA', 'Infectious Diseases Society of America', 'USA', 'medical_society',
   'html_scrape', 'https://www.idsociety.org/practice-guideline/',
   '0 4 1 * *', 'monthly', '{infectious_diseases}', 'en', 9, 'unknown',
   'US infectious diseases — antimicrobial guidelines'),

  ('KDIGO', 'Kidney Disease: Improving Global Outcomes', 'INT', 'medical_society',
   'html_scrape', 'https://kdigo.org/guidelines/',
   '0 4 1 * *', 'monthly', '{nephrology}', 'en', 10, 'unknown',
   'International nephrology guidelines'),

  ('GOLD', 'Global Initiative for Chronic Obstructive Lung Disease', 'INT', 'medical_society',
   'html_scrape', 'https://goldcopd.org/',
   '0 4 1 * *', 'monthly', '{pulmonology,copd}', 'en', 11, 'unknown',
   'International COPD guidelines — annual report'),

  ('GINA', 'Global Initiative for Asthma', 'INT', 'medical_society',
   'html_scrape', 'https://ginasthma.org/reports/',
   '0 4 1 * *', 'monthly', '{pulmonology,asthma}', 'en', 12, 'unknown',
   'International asthma guidelines'),

  ('EASL', 'European Association for the Study of the Liver', 'EU', 'medical_society',
   'html_scrape', 'https://easl.eu/publications/clinical-practice-guidelines/',
   '0 4 1 * *', 'monthly', '{hepatology}', 'en', 13, 'unknown',
   'European hepatology guidelines'),

  ('ERS', 'European Respiratory Society', 'EU', 'medical_society',
   'html_scrape', 'https://www.ersnet.org/guidelines/',
   '0 4 1 * *', 'monthly', '{pulmonology}', 'en', 14, 'unknown',
   'European respiratory medicine'),

  ('USPSTF', 'US Preventive Services Task Force', 'USA', 'national_authority',
   'html_scrape', 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics',
   '0 4 1 * *', 'monthly', '{prevention,screening}', 'en', 15, 'unknown',
   'US preventive medicine recommendations'),

  ('ECDC', 'European Centre for Disease Prevention and Control', 'EU', 'public_health',
   'rss', 'https://www.ecdc.europa.eu/en/taxonomy/term/170/rss.xml',
   '0 5 * * 1', 'weekly', '{infectious_diseases,public_health,epidemiology}', 'en', 16, 'unknown',
   'European CDC — epidemiological surveillance')
ON CONFLICT (source_code) DO NOTHING;

COMMIT;
