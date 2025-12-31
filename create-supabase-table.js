// Script to create consultation_records table in Supabase
// Run with: node create-supabase-table.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials (from lib/supabase.ts)
const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs';

// For DDL operations, we need the service role key (if available)
// If not available, we'll try with anon key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

async function createTable() {
  console.log('🚀 Starting table creation...');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Using key:', supabaseServiceKey ? 'Service Role' : 'Anon Key');
  
  try {
    // First, check if table already exists
    console.log('\n🔍 Checking if table already exists...');
    const { data: existingData, error: checkError } = await supabase
      .from('consultation_records')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table consultation_records already exists!');
      console.log('   You can start using it right away.');
      return;
    }
    
    console.log('⚠️  Table does not exist yet. Need to create it.');
    console.log('   Error:', checkError.message);
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'supabase-create-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('\n📝 SQL Script loaded:', sqlFile);
    console.log('   Length:', sql.length, 'characters');
    
    // Note: Direct SQL execution via client library is not supported
    // You need to use Supabase Dashboard or REST API
    console.log('\n❌ Cannot execute DDL statements via JavaScript client.');
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('─────────────────────────────────────────────────────────');
    console.log('1. Go to: https://supabase.com/dashboard/project/ehlqjfuutyhpbrqcvdut');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy the contents of: supabase-create-table.sql');
    console.log('5. Paste and run the query');
    console.log('─────────────────────────────────────────────────────────');
    console.log('\nOr copy this SQL directly:\n');
    console.log('─────────────────────────────────────────────────────────');
    console.log(sql);
    console.log('─────────────────────────────────────────────────────────');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Test connection first
async function testConnection() {
  console.log('🔌 Testing Supabase connection...');
  
  try {
    // Try to query an existing table (consultations)
    const { data, error } = await supabase
      .from('consultations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Table "consultations" does not exist or cannot be accessed');
      console.log('   This is expected if it\'s a new project');
    } else {
      console.log('✅ Connection successful! Can access existing tables.');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

// Run the script
(async () => {
  await testConnection();
  console.log('\n');
  await createTable();
})();
