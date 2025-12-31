// Apply migration to add missing columns
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('📋 MIGRATION REQUIRED');
console.log('════════════════════════════════════════════════════════════');
console.log('');
console.log('The consultation_records table exists but is missing columns:');
console.log('  - medical_report');
console.log('  - prescriptions');  
console.log('  - lab_orders');
console.log('  - imaging_orders');
console.log('  - transcription_text');
console.log('  - workflow_metadata');
console.log('');
console.log('These columns are required for the voice dictation workflow.');
console.log('');
console.log('════════════════════════════════════════════════════════════');
console.log('');
console.log('📝 MANUAL STEPS:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/ehlqjfuutyhpbrqcvdut');
console.log('2. Navigate to: SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the SQL below:');
console.log('');
console.log('────────────────────────────────────────────────────────────');
console.log('');

// Read and display the migration SQL
const sql = fs.readFileSync('./supabase-add-columns.sql', 'utf8');
console.log(sql);

console.log('');
console.log('────────────────────────────────────────────────────────────');
console.log('');
console.log('5. Run the query');
console.log('6. Verify the columns were added');
console.log('7. Test voice dictation again');
console.log('');
console.log('✅ After this migration, voice dictation will work perfectly!');
console.log('');
