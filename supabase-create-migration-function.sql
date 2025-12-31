-- Step 1: Create a function that executes the migration
-- Run this first in Supabase SQL Editor

CREATE OR REPLACE FUNCTION migrate_add_voice_dictation_columns()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add columns if they don't exist
  ALTER TABLE consultation_records
  ADD COLUMN IF NOT EXISTS medical_report JSONB,
  ADD COLUMN IF NOT EXISTS prescriptions JSONB,
  ADD COLUMN IF NOT EXISTS lab_orders JSONB,
  ADD COLUMN IF NOT EXISTS imaging_orders JSONB,
  ADD COLUMN IF NOT EXISTS transcription_text TEXT,
  ADD COLUMN IF NOT EXISTS workflow_metadata JSONB;

  -- Add comments
  EXECUTE 'COMMENT ON COLUMN consultation_records.medical_report IS ''Complete medical report from voice dictation or normal consultation''';
  EXECUTE 'COMMENT ON COLUMN consultation_records.prescriptions IS ''Prescription details including medications, dosages, etc.''';
  EXECUTE 'COMMENT ON COLUMN consultation_records.lab_orders IS ''Laboratory test orders''';
  EXECUTE 'COMMENT ON COLUMN consultation_records.imaging_orders IS ''Imaging study orders (X-ray, CT, MRI, etc.)''';
  EXECUTE 'COMMENT ON COLUMN consultation_records.transcription_text IS ''Original voice transcription for voice dictation consultations''';
  EXECUTE 'COMMENT ON COLUMN consultation_records.workflow_metadata IS ''Metadata about the workflow that created this consultation''';

  -- Create index
  CREATE INDEX IF NOT EXISTS idx_consultation_records_workflow_source 
  ON consultation_records ((workflow_metadata->>'source'));

  RETURN 'Migration completed successfully! 6 columns added.';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Migration failed: ' || SQLERRM;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION migrate_add_voice_dictation_columns() TO anon;
GRANT EXECUTE ON FUNCTION migrate_add_voice_dictation_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_add_voice_dictation_columns() TO service_role;
