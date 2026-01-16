// app/api/voice-dictation-transcribe/route.ts
// NOUVELLE API: Transcription + Normalisation Anglo-Saxonne + Extraction
// Le frontend affichera ensuite DiagnosisForm et ProfessionalReport

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  normalizeTranscriptionToEnglish,
  normalizeMedicationList,
  type NormalizationResult 
} from '@/lib/medical-terminology-normalizer';

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

  // Medical prompt to help Whisper recognize medical terms (bilingual French/English)
  const medicalPrompt = `Medical transcription. Common medications: Doliprane, Paracetamol, Acetaminophen, Metformin, Metformine, Amoxicillin, Amoxicilline, Augmentin, Ibuprofen, Ibuprofène, Aspirin, Aspirine, Omeprazole, Pantoprazole, Atorvastatin, Simvastatin, Amlodipine, Ramipril, Lisinopril, Bisoprolol, Furosemide, Spironolactone, Levothyroxine, Prednisone, Prednisolone, Insulin, Insuline, Lantus, Novorapid, Glucophage, Diamicron, Gliclazide, Januvia, Sitagliptin, Plavix, Clopidogrel, Xarelto, Eliquis, Pradaxa, Ventolin, Ventoline, Salbutamol, Albuterol, Seretide, Symbicort, Singulair, Montelukast, Nexium, Gaviscon, Imodium, Xanax, Zolpidem, Zopiclone, Sertraline, Fluoxetine, Prozac, Effexor, Venlafaxine, Cymbalta, Duloxetine, Lyrica, Pregabalin, Gabapentin, Neurontin. Dosages: milligrams, mg, grams, g, micrograms, mcg, milliliters, ml.`;

  try {
    // Auto-detect language - Whisper will detect French or English
    // The normalizer will then convert French terms to English
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Force English transcription to avoid misdetection
      response_format: 'verbose_json',
      prompt: medicalPrompt, // Help Whisper recognize medical terms
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
// FUNCTION 2: NORMALIZE TRANSCRIPTION TO ENGLISH
// ============================================
async function normalizeTranscription(transcriptionText: string): Promise<NormalizationResult> {
  console.log('🔄 Step 2: Normalizing transcription to Anglo-Saxon nomenclature...');
  
  const normalizationResult = normalizeTranscriptionToEnglish(transcriptionText);
  
  console.log('✅ Normalization completed');
  console.log(`   Original text length: ${normalizationResult.originalText.length} chars`);
  console.log(`   Normalized text length: ${normalizationResult.normalizedText.length} chars`);
  console.log(`   Corrections made: ${normalizationResult.corrections.length}`);
  console.log(`   Confidence: ${normalizationResult.confidence.toFixed(1)}%`);
  
  // Log corrections by type
  const medCorrections = normalizationResult.corrections.filter(c => c.type === 'medication').length;
  const termCorrections = normalizationResult.corrections.filter(c => c.type === 'medical_term').length;
  const dosageCorrections = normalizationResult.corrections.filter(c => c.type === 'dosage').length;
  
  if (medCorrections > 0) console.log(`   → Medications: ${medCorrections} corrections`);
  if (termCorrections > 0) console.log(`   → Medical terms: ${termCorrections} corrections`);
  if (dosageCorrections > 0) console.log(`   → Dosages: ${dosageCorrections} corrections`);
  
  return normalizationResult;
}

// ============================================
// FUNCTION 3: EXTRACT CLINICAL DATA
// ============================================
async function extractClinicalData(normalizedText: string): Promise<{
  patientInfo: any;
  clinicalData: any;
  aiQuestions: any;
  doctorNotes?: any;
  referralInfo?: any;
  consultationType: 'standard' | 'specialist_referral';
}> {
  console.log('📊 Step 3: Extracting clinical data with GPT-4o...');

  const extractionPrompt = `You are an expert medical assistant. Analyze this medical consultation transcription and extract the following information in strict JSON format:

⚠️ CRITICAL: This transcription has been NORMALIZED to Anglo-Saxon (UK/US) medical nomenclature. Use ENGLISH medical terminology throughout.

⚠️ IMPORTANT: PRESERVE ALL diagnostic hypotheses, clinical notes, and reasoning from the physician. DO NOT DELETE this crucial information.

{
  "patientInfo": {
    "firstName": "patient first name",
    "lastName": "patient last name",
    "age": number (age in years),
    "gender": "M" or "F" or "Other",
    "email": "email if mentioned",
    "phone": "phone if mentioned"
  },
  "clinicalData": {
    "chiefComplaint": "main reason for consultation IN ENGLISH",
    "symptoms": ["symptom 1 IN ENGLISH", "symptom 2 IN ENGLISH"],
    "duration": "symptom duration",
    "severity": "mild/moderate/severe",
    "medicalHistory": ["history 1 IN ENGLISH", "history 2 IN ENGLISH"],
    "currentMedications": ["medication 1 (USE INN/GENERIC NAME IN ENGLISH)", "medication 2"],
    "allergies": ["allergy 1", "allergy 2"],
    "vitalSigns": {
      "temperature": "in °C if mentioned",
      "bloodPressure": "in mmHg if mentioned (e.g., 140/90)",
      "heartRate": "in bpm if mentioned",
      "respiratoryRate": "in /min if mentioned",
      "oxygenSaturation": "SpO2 in % if mentioned"
    }
  },
  "aiQuestions": {
    "primaryConcern": "main concern IN ENGLISH",
    "additionalSymptoms": ["other symptoms IN ENGLISH"],
    "riskFactors": ["identified risk factors IN ENGLISH"]
  },
  "doctorNotes": {
    "clinicalHypotheses": ["physician hypothesis 1 IN ENGLISH", "hypothesis 2"],
    "differentialDiagnoses": ["differential diagnosis 1 IN ENGLISH", "differential 2"],
    "clinicalReasoning": "physician's clinical reasoning IN ENGLISH",
    "treatmentPlan": "physician's preliminary treatment plan IN ENGLISH",
    "observations": "important clinical observations from physician IN ENGLISH",
    "recommendations": ["recommendation 1 IN ENGLISH", "recommendation 2"]
  },
  "referralInfo": {
    "isReferral": true/false,
    "referringPhysician": "referring physician name if this is a referral",
    "specialty": "specialty if mentioned",
    "reasonForReferral": "reason for referral IN ENGLISH"
  }
}

🎯 CRITICAL RULES:
1. USE ENGLISH MEDICAL TERMINOLOGY ONLY (e.g., "chest pain" NOT "douleur thoracique")
2. USE INN/GENERIC DRUG NAMES IN ENGLISH (e.g., "Amoxicillin" NOT "Amoxicilline")
3. PRESERVE ALL diagnostic hypotheses from the physician in "doctorNotes.clinicalHypotheses"
4. KEEP ALL differential diagnoses mentioned by the physician
5. MAINTAIN the original clinical reasoning from the physician
6. DO NOT TRANSFORM or DELETE the physician's clinical thoughts
7. If physician says "I think", "probably", "possibly" → PRESERVE in doctorNotes IN ENGLISH
8. Use standard UK/US abbreviations: BP (blood pressure), HR (heart rate), RR (respiratory rate), SpO2 (oxygen saturation)
9. Medications: MUST use INN (International Nonproprietary Names) in English

Transcription (ALREADY NORMALIZED TO ENGLISH):
${normalizedText}

Respond ONLY with JSON, no additional text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert medical assistant who extracts structured clinical data using Anglo-Saxon (UK/US) medical nomenclature.',
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
    
    // Normalize medications if present
    if (extractedData.clinicalData?.currentMedications?.length > 0) {
      console.log(`   💊 Normalizing ${extractedData.clinicalData.currentMedications.length} medications...`);
      const normalizedMeds = normalizeMedicationList(extractedData.clinicalData.currentMedications);
      
      // Log any corrections
      const medCorrections = normalizedMeds.filter(m => m.original !== m.normalized);
      if (medCorrections.length > 0) {
        console.log(`   ✅ Corrected ${medCorrections.length} medication names:`);
        medCorrections.forEach(m => {
          console.log(`      "${m.original}" → "${m.normalized}"`);
        });
      }
      
      // Update with normalized names
      extractedData.clinicalData.currentMedications = normalizedMeds.map(m => m.normalized);
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
    // Language auto-detected by Whisper, then normalized to English

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

    // STEP 1: Transcribe audio (auto-detect language)
    let transcription;
    try {
      console.log('\n📝 STEP 1/3: Audio Transcription (auto-detect language)');
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

    // STEP 2: Normalize transcription to Anglo-Saxon nomenclature
    let normalization;
    try {
      console.log('\n🔄 STEP 2/3: Normalization to Anglo-Saxon Nomenclature');
      normalization = await normalizeTranscription(transcription.text);
    } catch (error: any) {
      console.error('❌ STEP 2 FAILED:', error.message);
      // Continue with original text if normalization fails
      console.warn('⚠️ Continuing with original transcription text');
      normalization = {
        originalText: transcription.text,
        normalizedText: transcription.text,
        corrections: [],
        confidence: 100
      };
    }

    // STEP 3: Extract clinical data
    let extractedData;
    try {
      console.log('\n📝 STEP 3/3: Clinical Data Extraction');
      extractedData = await extractClinicalData(normalization.normalizedText);
    } catch (error: any) {
      console.error('❌ STEP 3 FAILED:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Data extraction failed',
          details: error.message,
          failedAt: 'step3_extraction',
          transcription, // Return transcription for debugging
          normalization, // Return normalization for debugging
        },
        { status: 500 }
      );
    }

    const totalTime = Date.now() - startTime;

    console.log('\n✅ ========================================');
    console.log('   TRANSCRIPTION + NORMALIZATION + EXTRACTION COMPLETE');
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Normalization confidence: ${normalization.confidence.toFixed(1)}%`);
    console.log(`   Corrections applied: ${normalization.corrections.length}`);
    console.log('========================================\n');

    // Return data for frontend to display and continue workflow
    return NextResponse.json({
      success: true,
      transcription: {
        text: transcription.text,
        originalText: transcription.text,
        normalizedText: normalization.normalizedText,
        duration: transcription.duration,
        language: transcription.language,
      },
      normalization: {
        corrections: normalization.corrections,
        confidence: normalization.confidence,
        correctionsByType: {
          medication: normalization.corrections.filter(c => c.type === 'medication').length,
          medicalTerm: normalization.corrections.filter(c => c.type === 'medical_term').length,
          dosage: normalization.corrections.filter(c => c.type === 'dosage').length,
          spelling: normalization.corrections.filter(c => c.type === 'spelling').length,
        }
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
