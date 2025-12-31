// Test script to verify consultation_records table and permissions
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTable() {
  console.log('🧪 Testing consultation_records table...\n');
  
  // Test 1: Check if we can SELECT
  console.log('📖 Test 1: SELECT permission...');
  try {
    const { data, error } = await supabase
      .from('consultation_records')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ SELECT failed:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
    } else {
      console.log('✅ SELECT successful!');
      console.log('   Found', data.length, 'records');
      if (data.length > 0) {
        console.log('   Sample columns:', Object.keys(data[0]));
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
  
  // Test 2: Try to INSERT a test record
  console.log('\n📝 Test 2: INSERT permission...');
  try {
    const testRecord = {
      consultation_id: `TEST_${Date.now()}`,
      patient_id: 'TEST_PATIENT_123',
      patient_name: 'Test Patient',
      consultation_type: 'test',
      chief_complaint: 'Test complaint',
      diagnosis: 'Test diagnosis',
      created_at: new Date().toISOString(),
      medical_report: { test: true },
      prescriptions: { test: true },
      workflow_metadata: { source: 'test_script' }
    };
    
    console.log('   Attempting to insert test record...');
    console.log('   Record keys:', Object.keys(testRecord));
    
    const { data, error } = await supabase
      .from('consultation_records')
      .insert([testRecord])
      .select();
    
    if (error) {
      console.error('❌ INSERT failed:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      
      // Check for specific error types
      if (error.code === '42P01') {
        console.error('\n   💡 Table does not exist!');
      } else if (error.code === '42501') {
        console.error('\n   💡 Permission denied - check RLS policies!');
      } else if (error.code === '23505') {
        console.error('\n   💡 Duplicate key - record already exists!');
      } else if (error.code === '23502') {
        console.error('\n   💡 NOT NULL violation - missing required field!');
      }
    } else {
      console.log('✅ INSERT successful!');
      console.log('   Inserted record:', data);
      
      // Clean up: delete the test record
      console.log('\n🧹 Cleaning up test record...');
      const { error: deleteError } = await supabase
        .from('consultation_records')
        .delete()
        .eq('consultation_id', testRecord.consultation_id);
      
      if (deleteError) {
        console.error('❌ DELETE failed:', deleteError.message);
      } else {
        console.log('✅ Test record deleted successfully');
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
  
  // Test 3: Check RLS policies
  console.log('\n🔒 Test 3: Checking RLS status...');
  console.log('   Note: Cannot query pg_policies directly with anon key');
  console.log('   If INSERT failed with permission error, check RLS policies in Supabase dashboard');
}

testTable();
