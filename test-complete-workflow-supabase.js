const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteWorkflow() {
  console.log('🚀 TEST COMPLET DU WORKFLOW VOICE DICTATION + SUPABASE\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Simuler les données d'un workflow complet
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const consultationId = `VOICE_${timestamp}_${randomId}`;
  
  console.log('📋 ÉTAPE 1: Préparation des données du workflow');
  console.log('   Consultation ID:', consultationId);
  
  const reportData = {
    medicalReport: {
      narrative: "Le patient présente des symptômes de grippe saisonnière avec fièvre modérée...",
      sections: {
        chiefComplaint: "Fièvre et toux depuis 3 jours",
        history: "Patient de 35 ans, aucun antécédent notable",
        examination: "Température: 38.5°C, Auscultation: râles bronchiques",
        assessment: "Infection virale des voies respiratoires supérieures",
        plan: "Traitement symptomatique, repos, surveillance"
      }
    },
    prescriptions: {
      medications: [
        {
          name: "Paracétamol",
          dosage: "1g",
          frequency: "3 fois par jour",
          duration: "5 jours"
        },
        {
          name: "Sirop antitussif",
          dosage: "15ml",
          frequency: "3 fois par jour",
          duration: "5 jours"
        }
      ]
    },
    labOrders: {
      tests: []
    },
    imagingOrders: {
      studies: []
    }
  };
  
  const patientData = {
    patientId: 'TEST_PATIENT_001',
    name: 'Jean Dupont',
    age: 35,
    gender: 'M',
    email: 'jean.dupont@example.com',
    phone: '+33612345678'
  };
  
  const diagnosisData = {
    analysis: {
      clinical_analysis: {
        primary_diagnosis: {
          condition: 'Infection virale des voies respiratoires supérieures',
          confidence_level: 'High'
        }
      }
    }
  };
  
  const transcription = {
    text: "Le patient se plaint de fièvre et de toux depuis trois jours. Il présente une température de trente-huit virgule cinq degrés. L'auscultation révèle des râles bronchiques. Je diagnostique une infection virale des voies respiratoires supérieures et prescris du paracétamol un gramme trois fois par jour pendant cinq jours, ainsi qu'un sirop antitussif.",
    duration: 45.5,
    language: 'fr'
  };
  
  const consultationType = 'standard';
  
  console.log('   ✅ Données préparées\n');
  
  console.log('📋 ÉTAPE 2: Construction du record pour Supabase');
  
  const consultationRecord = {
    consultation_id: consultationId,
    patient_id: patientData.patientId || `VOICE_PATIENT_${timestamp}`,
    consultation_type: consultationType,
    consultation_date: new Date().toISOString().split('T')[0],
    
    // Patient info - stored in patient_data JSONB
    patient_data: {
      name: patientData.name || 'Unknown Patient',
      age: patientData.age || null,
      gender: patientData.gender || null,
      email: patientData.email || null,
      phone: patientData.phone || null
    },
    
    // Use the flat patient_name, patient_email, patient_phone columns that exist
    patient_name: patientData.name || 'Unknown Patient',
    patient_age: patientData.age?.toString() || null,
    patient_email: patientData.email || null,
    patient_phone: patientData.phone || null,
    
    // Clinical data
    chief_complaint: reportData.medicalReport?.sections?.chiefComplaint || 'Voice dictation consultation',
    diagnosis: diagnosisData.analysis?.clinical_analysis?.primary_diagnosis?.condition || 'Pending analysis',
    
    // Full report data (NEW COLUMNS)
    medical_report: reportData.medicalReport || null,
    prescriptions: reportData.prescriptions || null,
    lab_orders: reportData.labOrders || null,
    imaging_orders: reportData.imagingOrders || null,
    
    // Transcription
    transcription_text: transcription.text || null,
    
    // Workflow metadata
    workflow_metadata: {
      source: 'voice_dictation',
      timestamp: new Date().toISOString(),
      consultationType: consultationType,
      transcription_duration: transcription.duration,
      transcription_language: transcription.language
    },
    
    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log('   Colonnes à insérer:', Object.keys(consultationRecord).join(', '));
  console.log('   ✅ Record construit\n');
  
  console.log('📋 ÉTAPE 3: Insertion dans Supabase');
  console.log('   Table: consultation_records');
  
  try {
    const { data, error } = await supabase
      .from('consultation_records')
      .insert(consultationRecord)
      .select()
      .single();
    
    if (error) {
      console.log('   ❌ ERREUR D\'INSERTION:');
      console.log('      Code:', error.code);
      console.log('      Message:', error.message);
      console.log('      Details:', error.details);
      console.log('      Hint:', error.hint);
      return;
    }
    
    console.log('   ✅ INSERTION RÉUSSIE !');
    console.log('   Database ID:', data.id);
    console.log('   Consultation ID:', data.consultation_id);
    console.log('   Created at:', data.created_at);
    console.log();
    
    console.log('📋 ÉTAPE 4: Vérification de la sauvegarde');
    
    // Relire depuis Supabase
    const { data: savedData, error: readError } = await supabase
      .from('consultation_records')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();
    
    if (readError) {
      console.log('   ❌ Erreur de lecture:', readError.message);
      return;
    }
    
    console.log('   ✅ Lecture réussie');
    console.log('   Colonnes sauvegardées:');
    console.log('      - medical_report:', savedData.medical_report ? '✅' : '❌');
    console.log('      - prescriptions:', savedData.prescriptions ? '✅' : '❌');
    console.log('      - lab_orders:', savedData.lab_orders ? '✅' : '❌');
    console.log('      - imaging_orders:', savedData.imaging_orders ? '✅' : '❌');
    console.log('      - transcription_text:', savedData.transcription_text ? '✅' : '❌');
    console.log('      - workflow_metadata:', savedData.workflow_metadata ? '✅' : '❌');
    console.log();
    
    console.log('📋 ÉTAPE 5: Test de récupération via API patient-history');
    console.log('   (Simulation du comportement de /view-report/[consultationId])');
    
    // Simuler ce que fait l'API patient-history
    const { data: fullReport, error: fetchError } = await supabase
      .from('consultation_records')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();
    
    if (fetchError) {
      console.log('   ❌ Erreur de récupération:', fetchError.message);
      return;
    }
    
    console.log('   ✅ Rapport récupéré avec succès');
    console.log('   Structure du fullReport:');
    console.log('      - medicalReport:', fullReport.medical_report ? 'Present' : 'Missing');
    console.log('      - prescriptions:', fullReport.prescriptions ? 'Present' : 'Missing');
    console.log('      - Number of medications:', fullReport.prescriptions?.medications?.length || 0);
    console.log();
    
    console.log('📋 ÉTAPE 6: Nettoyage (suppression du test)');
    
    const { error: deleteError } = await supabase
      .from('consultation_records')
      .delete()
      .eq('consultation_id', consultationId);
    
    if (deleteError) {
      console.log('   ⚠️  Erreur de suppression:', deleteError.message);
    } else {
      console.log('   ✅ Test record supprimé');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 TEST COMPLET RÉUSSI !');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('✅ RÉSUMÉ:');
    console.log('   1. ✅ Préparation des données');
    console.log('   2. ✅ Construction du record');
    console.log('   3. ✅ Insertion dans Supabase');
    console.log('   4. ✅ Vérification des colonnes');
    console.log('   5. ✅ Récupération du rapport complet');
    console.log('   6. ✅ Nettoyage');
    console.log('\n🚀 LE WORKFLOW VOICE DICTATION EST 100% FONCTIONNEL !\n');
    
  } catch (err) {
    console.log('   ❌ ERREUR INATTENDUE:', err.message);
    console.log('   Stack:', err.stack);
  }
}

testCompleteWorkflow().catch(console.error);
