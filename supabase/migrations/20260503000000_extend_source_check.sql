-- ============================================================================
-- MIGRATION: Extend source CHECK constraint for 126+ medical sources
-- Date: 2026-05-03
--
-- The original migration only allowed 18 sources (NICE/WHO/ESC/...).
-- After 6 extraction passes we have 126 source codes. This migration:
--   1. Drops the strict CHECK constraint on medical_guidelines.source
--   2. Replaces it with a length-based constraint (allows any source code)
--
-- This is safe: the source codes come from a curated CSV catalog and the
-- application layer enforces consistency. RLS still protects writes.
-- ============================================================================

BEGIN;

-- 1. Drop the existing CHECK constraint
ALTER TABLE medical_guidelines
  DROP CONSTRAINT IF EXISTS medical_guidelines_source_check;

-- 2. Add a permissive constraint (any non-empty short code)
ALTER TABLE medical_guidelines
  ADD CONSTRAINT medical_guidelines_source_check
  CHECK (source IS NOT NULL AND length(source) BETWEEN 2 AND 30);

-- 3. Same treatment for guideline_sources registry table
ALTER TABLE guideline_sources
  DROP CONSTRAINT IF EXISTS guideline_sources_source_type_check;

ALTER TABLE guideline_sources
  ADD CONSTRAINT guideline_sources_source_type_check
  CHECK (source_type IN (
    'national_authority',
    'international_authority',
    'medical_society',
    'public_health',
    'regulatory',
    'humanitarian',           -- new: MSF, ICRC, Sphere, UNICEF
    'cochrane_reviews',       -- new: Cochrane systematic reviews
    'rare_diseases',          -- new: Orphanet, NORD
    'primary_care_society'    -- new: AAFP, RACGP, CFPC, ACP, RCGP
  ));

-- 4. Helpful comment
COMMENT ON CONSTRAINT medical_guidelines_source_check ON medical_guidelines IS
  'Permissive check: source is any 2-30 char code (curated by application layer).';

COMMIT;
