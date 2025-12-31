// Execute SQL migration via Supabase REST API
const https = require('https');

const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs';

// Try service role key if available
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const sql = `
ALTER TABLE consultation_records
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
ON consultation_records ((workflow_metadata->>'source'));
`;

console.log('🚀 Attempting to execute migration SQL...\n');

// Try using PostgREST rpc endpoint
const data = JSON.stringify({
  query: sql
});

const options = {
  hostname: 'ehlqjfuutyhpbrqcvdut.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}\n`);

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Response:', body);
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✅ Migration executed successfully!');
    } else if (res.statusCode === 404) {
      console.log('\n❌ exec_sql function not found');
      console.log('   This is expected - Supabase does not expose DDL via REST API');
      console.log('\n   Please run the SQL manually in Supabase Dashboard');
    } else {
      console.log('\n⚠️  Unexpected response');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();
