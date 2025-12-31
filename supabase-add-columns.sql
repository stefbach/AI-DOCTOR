-- Migration: Add columns for voice dictation workflow
-- Adds medical_report, prescriptions, lab_orders, imaging_orders, transcription_text, workflow_metadata

-- Add new columns if they don't exist
ALTER TABLE consultation_records
ADD COLUMN IF NOT EXISTS medical_report JSONB,
ADD COLUMN IF NOT EXISTS prescriptions JSONB,
ADD COLUMN IF NOT EXISTS lab_orders JSONB,
ADD COLUMN IF NOT EXISTS imaging_orders JSONB,
ADD COLUMN IF NOT EXISTS transcription_text TEXT,
ADD COLUMN IF NOT EXISTS workflow_metadata JSONB;

-- Add comment to new columns
COMMENT ON COLUMN consultation_records.medical_report IS 'Complete medical report from voice dictation or normal consultation';
COMMENT ON COLUMN consultation_records.prescriptions IS 'Prescription details including medications, dosages, etc.';
COMMENT ON COLUMN consultation_records.lab_orders IS 'Laboratory test orders';
COMMENT ON COLUMN consultation_records.imaging_orders IS 'Imaging study orders (X-ray, CT, MRI, etc.)';
COMMENT ON COLUMN consultation_records.transcription_text IS 'Original voice transcription for voice dictation consultations';
COMMENT ON COLUMN consultation_records.workflow_metadata IS 'Metadata about the workflow that created this consultation';

-- Create index on workflow_metadata for querying by source
CREATE INDEX IF NOT EXISTS idx_consultation_records_workflow_source 
ON consultation_records ((workflow_metadata->>'source'));

COMMENT ON INDEX idx_consultation_records_workflow_source IS 'Index for querying consultations by workflow source (voice_dictation, normal, etc.)';
