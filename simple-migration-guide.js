#!/usr/bin/env node

// SIMPLE AUTOMATED MIGRATION SCRIPT
// This script adds the missing columns to consultation_records table

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  SUPABASE MIGRATION - Add Voice Dictation Columns           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('This script will guide you through adding missing columns');
console.log('to the consultation_records table.');
console.log('');
console.log('Missing columns:');
console.log('  • medical_report (JSONB)');
console.log('  • prescriptions (JSONB)');
console.log('  • lab_orders (JSONB)');
console.log('  • imaging_orders (JSONB)');
console.log('  • transcription_text (TEXT)');
console.log('  • workflow_metadata (JSONB)');
console.log('');
console.log('════════════════════════════════════════════════════════════════');
console.log('');
console.log('⚠️  AUTOMATIC MIGRATION VIA API IS NOT POSSIBLE');
console.log('');
console.log('Supabase does not allow DDL (ALTER TABLE) commands via REST API.');
console.log('You must execute the SQL manually in Supabase Dashboard.');
console.log('');
console.log('════════════════════════════════════════════════════════════════');
console.log('');

rl.question('Press ENTER to see the SQL to execute... ', () => {
  console.log('');
  console.log('📋 COPY THIS SQL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`ALTER TABLE consultation_records
ADD COLUMN IF NOT EXISTS medical_report JSONB,
ADD COLUMN IF NOT EXISTS prescriptions JSONB,
ADD COLUMN IF NOT EXISTS lab_orders JSONB,
ADD COLUMN IF NOT EXISTS imaging_orders JSONB,
ADD COLUMN IF NOT EXISTS transcription_text TEXT,
ADD COLUMN IF NOT EXISTS workflow_metadata JSONB;

COMMENT ON COLUMN consultation_records.medical_report IS 'Complete medical report from voice dictation or normal consultation';
COMMENT ON COLUMN consultation_records.prescriptions IS 'Prescription details including medications, dosages, etc.';
COMMENT ON COLUMN consultation_records.lab_orders IS 'Laboratory test orders';
COMMENT ON COLUMN consultation_records.imaging_orders IS 'Imaging study orders (X-ray, CT, MRI, etc.)';
COMMENT ON COLUMN consultation_records.transcription_text IS 'Original voice transcription for voice dictation consultations';
COMMENT ON COLUMN consultation_records.workflow_metadata IS 'Metadata about the workflow that created this consultation';

CREATE INDEX IF NOT EXISTS idx_consultation_records_workflow_source 
ON consultation_records ((workflow_metadata->>'source'));`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📝 STEPS TO EXECUTE:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/ehlqjfuutyhpbrqcvdut/sql');
  console.log('2. Click "New query"');
  console.log('3. Paste the SQL above');
  console.log('4. Click "Run" (or press Ctrl+Enter)');
  console.log('5. You should see: "Success. No rows returned"');
  console.log('');
  console.log('✅ DONE! Voice dictation will now save to Supabase.');
  console.log('');
  
  rl.close();
});
