-- Create consultation_records table for voice dictation and other consultation workflows
-- This table stores complete consultation reports with all medical data

CREATE TABLE IF NOT EXISTS consultation_records (
  -- Primary key and identifiers
  id BIGSERIAL PRIMARY KEY,
  consultation_id VARCHAR(255) UNIQUE NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  consultation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Patient demographic information
  patient_name VARCHAR(500),
  patient_email VARCHAR(255),
  patient_phone VARCHAR(50),
  patient_age INTEGER,
  patient_gender VARCHAR(50),
  
  -- Clinical summary fields
  chief_complaint TEXT,
  diagnosis TEXT,
  consultation_type VARCHAR(100) DEFAULT 'standard',
  
  -- Full medical data (JSONB for flexible structure)
  medical_report JSONB,
  prescriptions JSONB,
  lab_orders JSONB,
  imaging_orders JSONB,
  
  -- Additional data
  transcription_text TEXT,  -- For voice dictation
  workflow_metadata JSONB,  -- Store workflow info (source, timestamps, etc.)
  
  -- Indexes for common queries
  CONSTRAINT consultation_records_consultation_id_key UNIQUE (consultation_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consultation_records_patient_id ON consultation_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_records_created_at ON consultation_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_records_consultation_type ON consultation_records(consultation_type);
CREATE INDEX IF NOT EXISTS idx_consultation_records_patient_email ON consultation_records(patient_email);
CREATE INDEX IF NOT EXISTS idx_consultation_records_patient_phone ON consultation_records(patient_phone);

-- Enable Row Level Security (RLS)
ALTER TABLE consultation_records ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
-- (Adjust this based on your security requirements)
CREATE POLICY "Allow all operations for authenticated users" 
ON consultation_records
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow all operations for anon users 
-- (For development/testing - remove in production or restrict as needed)
CREATE POLICY "Allow all operations for anon users" 
ON consultation_records
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Create policy to allow service role full access
CREATE POLICY "Allow all operations for service role" 
ON consultation_records
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE consultation_records IS 'Stores complete consultation records from all workflows (voice dictation, normal consultation, chronic disease, etc.)';

-- Add comments to important columns
COMMENT ON COLUMN consultation_records.consultation_id IS 'Unique consultation identifier (e.g., VOICE_timestamp_random)';
COMMENT ON COLUMN consultation_records.medical_report IS 'Complete medical report in JSON format';
COMMENT ON COLUMN consultation_records.prescriptions IS 'Prescription details including medications, dosages, etc.';
COMMENT ON COLUMN consultation_records.transcription_text IS 'Original voice transcription for voice dictation consultations';
COMMENT ON COLUMN consultation_records.workflow_metadata IS 'Metadata about the workflow that created this consultation';
