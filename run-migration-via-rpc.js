// Execute migration via Supabase RPC function
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  console.log('🚀 Executing migration via RPC function...\n');
  
  try {
    // Call the migration function
    const { data, error } = await supabase.rpc('migrate_add_voice_dictation_columns');
    
    if (error) {
      console.error('❌ Migration failed:');
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      
      if (error.code === '42883') {
        console.error('\n💡 Function does not exist!');
        console.error('\n📋 You need to create the function first:');
        console.error('   1. Go to Supabase Dashboard SQL Editor');
        console.error('   2. Run the SQL from: supabase-create-migration-function.sql');
        console.error('   3. Then run this script again');
      }
      
      return false;
    }
    
    console.log('✅ Migration successful!');
    console.log('   Result:', data);
    console.log('\n📊 Columns added:');
    console.log('   ✅ medical_report (JSONB)');
    console.log('   ✅ prescriptions (JSONB)');
    console.log('   ✅ lab_orders (JSONB)');
    console.log('   ✅ imaging_orders (JSONB)');
    console.log('   ✅ transcription_text (TEXT)');
    console.log('   ✅ workflow_metadata (JSONB)');
    console.log('\n🎉 Voice dictation will now save to Supabase!');
    
    return true;
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

// Test after migration
async function testAfterMigration() {
  console.log('\n\n🧪 Testing INSERT after migration...\n');
  
  try {
    const testRecord = {
      consultation_id: `TEST_${Date.now()}`,
      patient_id: 'TEST_PATIENT_MIGRATION',
      patient_name: 'Test Patient After Migration',
      consultation_type: 'test',
      chief_complaint: 'Test complaint',
      diagnosis: 'Test diagnosis',
      medical_report: { test: true, migrated: true },
      prescriptions: { test: true },
      lab_orders: { test: true },
      imaging_orders: { test: true },
      transcription_text: 'Test transcription',
      workflow_metadata: { source: 'test_migration', success: true }
    };
    
    console.log('   Inserting test record with new columns...');
    
    const { data, error } = await supabase
      .from('consultation_records')
      .insert([testRecord])
      .select();
    
    if (error) {
      console.error('❌ INSERT still fails:', error.message);
      console.error('   Code:', error.code);
      return false;
    }
    
    console.log('✅ INSERT successful with new columns!');
    console.log('   Record ID:', data[0].id);
    
    // Clean up
    await supabase
      .from('consultation_records')
      .delete()
      .eq('consultation_id', testRecord.consultation_id);
    
    console.log('✅ Test record cleaned up');
    console.log('\n🎊 MIGRATION VERIFIED - Everything works!');
    
    return true;
    
  } catch (err) {
    console.error('❌ Test error:', err.message);
    return false;
  }
}

// Run migration and test
(async () => {
  const migrationSuccess = await runMigration();
  
  if (migrationSuccess) {
    await testAfterMigration();
  }
})();
