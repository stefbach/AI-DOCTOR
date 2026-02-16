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
async function transcribeAudio(audioFile: File, preferredLanguage?: string): Promise<{
  text: string;
  translatedText: string;
  duration: number;
  language: string;
  wasTranslated: boolean;
}> {
  console.log('🔊 Step 1: Starting audio transcription...');
  console.log(`   Audio file: ${audioFile.name} (${audioFile.size} bytes)`);
  console.log(`   Preferred language: ${preferredLanguage || 'auto-detect'}`);

  // Bilingual medical prompt (French + English) to help Whisper recognize medical terms in both languages
  // Short common phrases are listed first to help Whisper recognize them when dictated as standalone phrases
  const medicalPrompt = `Medical dictation. Common short phrases: abdominal pain, chest pain, headache, back pain, sore throat, stomach ache, fever, cough, nausea, vomiting, diarrhea, constipation, fatigue, dizziness, shortness of breath.
Douleur abdominale, douleur thoracique, mal de tête, mal au dos, mal de gorge, mal au ventre, fièvre, toux, nausée, vomissement, diarrhée, constipation, fatigue, vertige.
French symptoms: douleur abdominale, douleur thoracique, céphalée, migraine, nausée, vomissement, diarrhée, constipation, fièvre, toux, dyspnée, fatigue, asthénie, vertige, palpitations, mal de tête, mal au ventre, mal à la poitrine.
English symptoms: abdominal pain, chest pain, headache, migraine, nausea, vomiting, diarrhea, constipation, fever, cough, shortness of breath, fatigue, dizziness, palpitations, back pain, joint pain, muscle pain.
Medications: Doliprane, Paracetamol, Paracétamol, Metformin, Metformine, Amoxicillin, Amoxicilline, Augmentin, Ibuprofen, Ibuprofène, Aspirin, Aspirine, Omeprazole, Oméprazole, Pantoprazole, Atorvastatin, Atorvastatine, Amlodipine, Ramipril, Lisinopril, Bisoprolol, Furosemide, Furosémide, Levothyroxine, Lévothyroxine, Prednisone, Prednisolone, Insulin, Insuline, Ventolin, Ventoline, Salbutamol.
Medical history: diabète, diabetes, hypertension, asthme, asthma, BPCO, COPD, insuffisance cardiaque, heart failure, insuffisance rénale, kidney failure.
Dosages: milligrams, milligrammes, mg, grams, grammes, g.`;

  try {
    // For short phrases, specifying language helps Whisper accuracy
    const whisperOptions: any = {
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      prompt: medicalPrompt,
    };

    // If a preferred language is specified, use it to help Whisper
    if (preferredLanguage && preferredLanguage !== 'auto') {
      const langMap: { [key: string]: string } = {
        'en': 'en',
        'en-US': 'en',
        'en-GB': 'en',
        'fr': 'fr',
        'fr-FR': 'fr',
      };
      const whisperLang = langMap[preferredLanguage] || preferredLanguage.split('-')[0];
      whisperOptions.language = whisperLang;
      console.log(`   Using specified language for Whisper: ${whisperLang}`);
    } else {
      console.log('   Using auto-detection for language (bilingual support)');
    }

    // Step 1: First transcribe to detect the language
    const transcription = await openai.audio.transcriptions.create(whisperOptions);

    console.log('✅ Transcription completed');
    console.log(`   Text length: ${transcription.text.length} characters`);
    console.log(`   Duration: ${transcription.duration} seconds`);
    console.log(`   Language detected: ${transcription.language}`);

    let translatedText = transcription.text;
    let wasTranslated = false;

    // Step 2: If non-English detected, use Whisper's native translation endpoint
    // This is more reliable than a separate GPT call and has no extra cost
    const detectedLang = (transcription.language || '').toLowerCase();
    const isNonEnglish = detectedLang && detectedLang !== 'en' && detectedLang !== 'english';

    if (isNonEnglish) {
      console.log(`🌐 Non-English detected (${detectedLang}) - using Whisper translation endpoint...`);
      try {
        const translationResult = await openai.audio.translations.create({
          file: audioFile,
          model: 'whisper-1',
          prompt: 'Medical dictation. Translate to English. ' + medicalPrompt.split('\n')[0],
        });
        translatedText = translationResult.text;
        wasTranslated = true;
        console.log(`✅ Whisper translation completed: "${translatedText}"`);
      } catch (translationError: any) {
        console.error('⚠️ Whisper translation failed, falling back to GPT translation:', translationError.message);
        // Fallback to GPT-5.2 translation
        translatedText = await translateToEnglish(transcription.text);
        wasTranslated = true;
        console.log(`✅ GPT fallback translation completed: "${translatedText}"`);
      }
    }

    return {
      text: transcription.text,
      translatedText,
      duration: transcription.duration || 0,
      language: transcription.language || 'unknown',
      wasTranslated,
    };
  } catch (error: any) {
    console.error('❌ Transcription failed:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// ============================================
// FUNCTION 1b: TRANSLATE FRENCH TO ENGLISH
// ============================================
async function translateToEnglish(frenchText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: `You are a medical translator. Translate the following French medical text to English.

RULES:
1. Translate accurately while maintaining medical terminology
2. Use INN/generic drug names in English (e.g., "Paracétamol" → "Paracetamol", "Amoxicilline" → "Amoxicillin")
3. Use standard UK/US medical abbreviations
4. Keep the same structure and meaning
5. Return ONLY the translated text, nothing else`
        },
        {
          role: 'user',
          content: frenchText
        }
      ],
      temperature: 0.2,
      max_completion_tokens: 2000,
    });

    return response.choices[0]?.message?.content?.trim() || frenchText;
  } catch (error: any) {
    console.error('❌ Translation failed:', error.message);
    // Return original text if translation fails
    return frenchText;
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
      model: 'gpt-5.2',
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
    const preferredLanguage = formData.get('language') as string | null;
    // Language can be specified to improve Whisper accuracy for short phrases

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
    console.log(`   Preferred language: ${preferredLanguage || 'auto-detect'}`);

    const startTime = Date.now();

    // STEP 1: Transcribe audio (use preferred language if specified)
    let transcription;
    try {
      console.log('\n📝 STEP 1/3: Audio Transcription');
      transcription = await transcribeAudio(audioFile, preferredLanguage || undefined);
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
    // Use translated text if available, otherwise use original
    const textToNormalize = transcription.translatedText || transcription.text;
    let normalization;
    try {
      console.log('\n🔄 STEP 2/3: Normalization to Anglo-Saxon Nomenclature');
      normalization = await normalizeTranscription(textToNormalize);
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
        text: transcription.translatedText, // Always return English text
        originalText: transcription.text, // Original transcription (may be French)
        translatedText: transcription.translatedText, // Translated to English
        normalizedText: normalization.normalizedText,
        duration: transcription.duration,
        language: transcription.language,
        wasTranslated: transcription.wasTranslated,
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
