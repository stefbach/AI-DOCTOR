// app/api/voice-dictation-transcribe/route.ts
// NOUVELLE API: Transcription + Extraction uniquement
// Le frontend affichera ensuite DiagnosisForm et ProfessionalReport

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes max

// ============================================
// FUNCTION 1: TRANSCRIBE AUDIO
// ============================================
async function transcribeAudio(audioFile: File): Promise<{
  text: string;
  duration: number;
  language: string;
}> {
  console.log('🔊 Step 1: Starting audio transcription...');
  console.log(`   Audio file: ${audioFile.name} (${audioFile.size} bytes)`);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'fr', // French by default, Whisper will auto-detect if needed
      response_format: 'verbose_json',
    });

    console.log('✅ Transcription completed');
    console.log(`   Text length: ${transcription.text.length} characters`);
    console.log(`   Duration: ${transcription.duration} seconds`);
    console.log(`   Language: ${transcription.language}`);

    return {
      text: transcription.text,
      duration: transcription.duration || 0,
      language: transcription.language || 'fr',
    };
  } catch (error: any) {
    console.error('❌ Transcription failed:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// ============================================
// FUNCTION 2: EXTRACT CLINICAL DATA
// ============================================
async function extractClinicalData(transcriptionText: string): Promise<{
  patientInfo: any;
  clinicalData: any;
  aiQuestions: any;
  referralInfo?: any;
  consultationType: 'standard' | 'specialist_referral';
}> {
  console.log('📊 Step 2: Extracting clinical data with GPT-4o...');

  const extractionPrompt = `Tu es un assistant médical expert. Analyse cette transcription de consultation médicale et extrais les informations suivantes au format JSON strict:

⚠️ IMPORTANT: PRÉSERVE TOUTES les hypothèses diagnostiques, notes cliniques, et raisonnements du médecin. NE PAS SUPPRIMER ces informations cruciales.

{
  "patientInfo": {
    "firstName": "prénom du patient",
    "lastName": "nom du patient",
    "age": nombre (age en années),
    "gender": "M" ou "F" ou "Other",
    "email": "email si mentionné",
    "phone": "téléphone si mentionné"
  },
  "clinicalData": {
    "chiefComplaint": "motif principal de consultation",
    "symptoms": ["symptôme 1", "symptôme 2"],
    "duration": "durée des symptômes",
    "severity": "légère/modérée/sévère",
    "medicalHistory": ["antécédent 1", "antécédent 2"],
    "currentMedications": ["médicament 1", "médicament 2"],
    "allergies": ["allergie 1", "allergie 2"],
    "vitalSigns": {
      "temperature": "en °C si mentionné",
      "bloodPressure": "en mmHg si mentionné",
      "heartRate": "en bpm si mentionné",
      "respiratoryRate": "en /min si mentionné"
    }
  },
  "aiQuestions": {
    "primaryConcern": "préoccupation principale",
    "additionalSymptoms": ["autres symptômes"],
    "riskFactors": ["facteurs de risque identifiés"]
  },
  "doctorNotes": {
    "clinicalHypotheses": ["hypothèse 1 du médecin", "hypothèse 2"],
    "differentialDiagnoses": ["diagnostic différentiel 1", "diagnostic différentiel 2"],
    "clinicalReasoning": "raisonnement clinique du médecin",
    "treatmentPlan": "plan thérapeutique préliminaire du médecin",
    "observations": "observations cliniques importantes du médecin",
    "recommendations": ["recommandation 1", "recommandation 2"]
  },
  "referralInfo": {
    "isReferral": true/false,
    "referringPhysician": "nom du médecin référent si c'est une référence",
    "specialty": "spécialité si mentionnée",
    "reasonForReferral": "raison de la référence"
  }
}

🎯 RÈGLES CRITIQUES:
1. PRÉSERVE ABSOLUMENT toutes les hypothèses diagnostiques du médecin dans "doctorNotes.clinicalHypotheses"
2. CONSERVE tous les diagnostics différentiels mentionnés par le médecin
3. GARDE le raisonnement clinique original du médecin
4. NE TRANSFORME PAS ni ne SUPPRIME les pensées cliniques du médecin
5. Si le médecin mentionne "je pense que", "probablement", "possiblement" → PRÉSERVE dans doctorNotes

Transcription:
${transcriptionText}

Réponds UNIQUEMENT avec le JSON, sans texte additionnel.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant médical expert qui extrait des données cliniques structurées.',
        },
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const extractedData = JSON.parse(completion.choices[0].message.content || '{}');

    console.log('✅ Extraction completed');
    console.log(`   Patient: ${extractedData.patientInfo?.firstName} ${extractedData.patientInfo?.lastName}`);
    console.log(`   Chief complaint: ${extractedData.clinicalData?.chiefComplaint}`);
    
    // Log doctor's clinical hypotheses if present
    if (extractedData.doctorNotes?.clinicalHypotheses?.length > 0) {
      console.log(`   ⚕️ Doctor's hypotheses preserved: ${extractedData.doctorNotes.clinicalHypotheses.length} hypotheses`);
    }

    // Determine consultation type
    const isReferral = extractedData.referralInfo?.isReferral === true;
    const consultationType = isReferral ? 'specialist_referral' : 'standard';

    return {
      patientInfo: extractedData.patientInfo || {},
      clinicalData: extractedData.clinicalData || {},
      aiQuestions: extractedData.aiQuestions || {},
      doctorNotes: extractedData.doctorNotes || {}, // ⚕️ NOUVEAU: Hypothèses du médecin
      referralInfo: isReferral ? extractedData.referralInfo : undefined,
      consultationType,
    };
  } catch (error: any) {
    console.error('❌ Extraction failed:', error.message);
    throw new Error(`Data extraction failed: ${error.message}`);
  }
}

// ============================================
// MAIN API ENDPOINT
// ============================================
export async function POST(request: NextRequest) {
  console.log('🎤 ========================================');
  console.log('   VOICE DICTATION TRANSCRIBE API');
  console.log('   (Transcription + Extraction ONLY)');
  console.log('========================================');

  try {
    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;
    const doctorInfo = JSON.parse(formData.get('doctorInfo') as string || '{}');
    const patientId = formData.get('patientId') as string | null;

    // Validate audio file
    if (!audioFile) {
      console.error('❌ No audio file provided');
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('✅ Request validated');
    console.log(`   Audio file: ${audioFile.name} (${audioFile.size} bytes)`);
    console.log(`   Patient ID: ${patientId || 'Not provided'}`);

    const startTime = Date.now();

    // STEP 1: Transcribe audio
    let transcription;
    try {
      console.log('\n📝 STEP 1/2: Audio Transcription');
      transcription = await transcribeAudio(audioFile);
    } catch (error: any) {
      console.error('❌ STEP 1 FAILED:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Transcription failed',
          details: error.message,
          failedAt: 'step1_transcription',
        },
        { status: 500 }
      );
    }

    // STEP 2: Extract clinical data
    let extractedData;
    try {
      console.log('\n📝 STEP 2/2: Clinical Data Extraction');
      extractedData = await extractClinicalData(transcription.text);
    } catch (error: any) {
      console.error('❌ STEP 2 FAILED:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Data extraction failed',
          details: error.message,
          failedAt: 'step2_extraction',
          transcription, // Return transcription for debugging
        },
        { status: 500 }
      );
    }

    const totalTime = Date.now() - startTime;

    console.log('\n✅ ========================================');
    console.log('   TRANSCRIPTION + EXTRACTION COMPLETE');
    console.log(`   Total time: ${totalTime}ms`);
    console.log('========================================\n');

    // Return data for frontend to display and continue workflow
    return NextResponse.json({
      success: true,
      transcription: {
        text: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
      },
      extractedData: {
        patientInfo: extractedData.patientInfo,
        clinicalData: extractedData.clinicalData,
        aiQuestions: extractedData.aiQuestions,
        doctorNotes: extractedData.doctorNotes, // ⚕️ IMPORTANT: Hypothèses du médecin
        referralInfo: extractedData.referralInfo,
        consultationType: extractedData.consultationType,
      },
      metadata: {
        processingTime: totalTime,
        audioFileName: audioFile.name,
        audioFileSize: audioFile.size,
      },
    });
  } catch (error: any) {
    console.error('❌ ========================================');
    console.error('   UNEXPECTED ERROR');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    endpoint: '/api/voice-dictation-transcribe',
    description: 'Voice dictation transcription and extraction (Steps 1-2 only)',
    steps: [
      '1. Audio transcription (Whisper API)',
      '2. Clinical data extraction (GPT-4o)',
    ],
    note: 'Frontend will then display DiagnosisForm and ProfessionalReport',
  });
}
