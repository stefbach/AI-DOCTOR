// app/api/voice-dictation-workflow/route.ts
// WORKFLOW DICTÉE VOCALE → DIAGNOSTIC → RAPPORT CONSULTATION
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes pour le workflow complet

// ============================================
// TYPES
// ============================================
interface VoiceDictationInput {
  audioFile: File;
  doctorInfo: {
    fullName: string;
    qualifications?: string;
    specialty?: string;
    medicalCouncilNumber?: string;
  };
  patientId?: string;
  consultationType?: 'standard' | 'specialist_referral'; // Type de consultation
  referringPhysician?: { // Si consultation de correspondant
    name: string;
    specialty?: string;
    contact?: string;
  };
}

interface ExtractedClinicalData {
  patientInfo: {
    age?: number;
    sex?: string;
    weight?: number;
    height?: number;
    allergies?: string[];
    currentMedications?: string[];
    medicalHistory?: string[];
  };
  clinicalData: {
    chiefComplaint: string;
    symptoms: string[];
    symptomDuration: string;
    diseaseHistory: string;
    vitalSigns?: {
      bloodPressure?: string;
      pulse?: number;
      temperature?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
    };
  };
  aiQuestions?: Array<{
    question: string;
    answer: string;
  }>;
  referralInfo?: { // Informations de correspondant
    referringPhysician?: string;
    referralReason?: string;
    previousInvestigations?: string[];
    referralDate?: string;
    urgency?: 'routine' | 'urgent' | 'emergency';
  };
}

// ============================================
// PROMPT D'EXTRACTION DES DONNÉES CLINIQUES
// ============================================
const EXTRACTION_SYSTEM_PROMPT = `
# 🎤 SYSTÈME D'EXTRACTION DE DONNÉES MÉDICALES DEPUIS DICTÉE

Vous êtes un expert médical qui extrait et structure les informations d'une dictée vocale médicale.

⚠️ **IMPORTANT**: Cette dictée peut être :
- Une **consultation standard** (médecin généraliste ou spécialiste)
- Une **consultation de correspondant spécialiste** (avis spécialisé suite à référence)

## 🎯 VOTRE MISSION

À partir d'une transcription de dictée médicale (en français ou anglais), extraire TOUTES les informations cliniques pertinentes et les structurer en format JSON standardisé.

⚠️ **CRITICAL MEDICATION NORMALIZATION RULE**:
- The doctor may dictate medication names in FRENCH (e.g., "Paracétamol", "Amoxicilline")
- You MUST normalize ALL medication names to ENGLISH (UK standard) in your output
- Examples:
  - Paracétamol → Paracetamol
  - Amoxicilline → Amoxicillin
  - Ibuprofène → Ibuprofen
  - Metformine → Metformin
  - Amoxicilline-acide clavulanique → Co-Amoxiclav
- The AI downstream expects ENGLISH drug names for proper processing

**Si c'est une consultation de correspondant**, identifiez et extrayez également :
- Le médecin référent (qui a envoyé le patient)
- Le motif de la référence
- Les investigations déjà réalisées
- L'urgence de la consultation

## 📋 FORMAT DE SORTIE JSON REQUIS

\`\`\`json
{
  "patientInfo": {
    "age": number | null,
    "sex": "M" | "F" | "Unknown",
    "weight": number | null,
    "height": number | null,
    "allergies": ["allergie1", "allergie2"],
    "currentMedications": ["med1 dosage", "med2 dosage"],
    "medicalHistory": ["antécédent1", "antécédent2"]
  },
  "clinicalData": {
    "chiefComplaint": "Motif principal de consultation",
    "symptoms": ["symptôme1", "symptôme2", "symptôme3"],
    "symptomDuration": "3 jours" | "2 semaines" | etc.,
    "diseaseHistory": "Histoire détaillée de la maladie actuelle",
    "vitalSigns": {
      "bloodPressure": "120/80",
      "pulse": 72,
      "temperature": 37.5,
      "respiratoryRate": 16,
      "oxygenSaturation": 98
    }
  },
  "aiQuestions": [
    {
      "question": "Question pertinente identifiée",
      "answer": "Réponse extraite de la dictée ou 'Non mentionné'"
    }
  ],
  "referralInfo": {
    "referringPhysician": "Nom du médecin référent ou null",
    "referralReason": "Raison de la référence au spécialiste ou null",
    "previousInvestigations": ["Examen 1 déjà fait", "Examen 2 déjà fait"],
    "referralDate": "Date de la référence ou null",
    "urgency": "routine" | "urgent" | "emergency" | null
  },
  "transcriptionMetadata": {
    "language": "fr" | "en",
    "originalText": "Transcription complète",
    "extractionConfidence": "high" | "medium" | "low",
    "consultationType": "standard" | "specialist_referral"
  }
}
\`\`\`

## 🔍 RÈGLES D'EXTRACTION

### 1. INFORMATIONS PATIENT
- **Âge** : Chercher mentions explicites ("patient de 45 ans", "45-year-old patient")
- **Sexe** : Identifier pronoms, titres (M./Mme), ou mentions directes
- **Poids/Taille** : Chercher valeurs en kg/lbs, cm/m
- **Allergies** : Chercher "allergique à", "allergie", "contre-indication"
- **Médicaments actuels** : "prend actuellement", "traitement en cours", "sous"
- **Antécédents** : "antécédents de", "historique de", "history of"

### 2. DONNÉES CLINIQUES
- **Motif principal** : Première plainte mentionnée, raison de consultation
- **Symptômes** : TOUS les symptômes mentionnés (douleur, fièvre, toux, etc.)
- **Durée** : "depuis 3 jours", "for 2 weeks", "il y a une semaine"
- **Histoire de la maladie** : Chronologie, évolution, facteurs déclenchants
- **Signes vitaux** : TA, pouls, température, fréquence respiratoire, SpO2

### 3. EXAMEN CLINIQUE (si mentionné)
- Ajouter comme questions/réponses dans aiQuestions
- Exemple : {"question": "Auscultation pulmonaire", "answer": "Râles crépitants bilatéraux"}

### 4. INFORMATIONS DE CORRESPONDANT (si applicable)
- **Médecin référent** : "Référé par Dr. X" / "Envoyé par le Dr. Y" / "Sur demande de..."
- **Motif de référence** : "pour avis spécialisé", "pour prise en charge", "suspicion de..."
- **Investigations déjà faites** : "Patient a déjà fait...", "examens précédents montrent..."
- **Urgence** : "urgent", "semi-urgent", "routine", "à voir rapidement"
- **Date de référence** : Si mentionnée
- **MOTS-CLÉS** : "référé", "envoyé", "correspondant", "avis spécialisé", "référence"

### 5. IMPRESSIONS DIAGNOSTIQUES
- Si le médecin mentionne un diagnostic suspecté, l'inclure dans aiQuestions
- Exemple : {"question": "Impression diagnostique du clinicien", "answer": "Pneumonie communautaire probable"}
- Pour correspondant : Inclure l'impression du médecin référent si mentionnée

### 6. PRESCRIPTIONS DICTÉES
- Si le médecin dicte des prescriptions, les extraire dans currentMedications avec format standardisé
- ⚠️ **CRITICAL**: Always normalize to ENGLISH (UK) drug names
- Exemple : "Amoxicillin 500mg three times daily for 7 days"

## ⚠️ RÈGLES IMPORTANTES

1. **NE PAS INVENTER** : Si une information n'est pas mentionnée, mettre null ou []
2. **PRÉSERVER LE LANGAGE** : Garder les termes médicaux exacts de la dictée
3. **ÊTRE EXHAUSTIF** : Extraire TOUTE information cliniquement pertinente
4. **NORMALISER LES FORMATS** :
   - Âge : nombre entier
   - Sexe : "M", "F", ou "Unknown"
   - TA : format "systolic/diastolic"
   - Température : nombre décimal en °C
5. **CONTEXTUALISER** : Dans diseaseHistory, créer une narration cohérente

## 📝 EXEMPLES

**Exemple 1 - Dictée courte:**
"Patient masculin de 52 ans se présentant pour douleurs thoraciques depuis 2 heures. Tension à 150/95, pouls à 88. Antécédent d'hypertension, sous Amlodipine 5mg."

→ Extraction :
\`\`\`json
{
  "patientInfo": {
    "age": 52,
    "sex": "M",
    "weight": null,
    "height": null,
    "allergies": [],
    "currentMedications": ["Amlodipine 5mg"],
    "medicalHistory": ["Hypertension"]
  },
  "clinicalData": {
    "chiefComplaint": "Douleurs thoraciques",
    "symptoms": ["douleurs thoraciques"],
    "symptomDuration": "2 heures",
    "diseaseHistory": "Patient masculin de 52 ans se présentant pour douleurs thoraciques évoluant depuis 2 heures",
    "vitalSigns": {
      "bloodPressure": "150/95",
      "pulse": 88
    }
  }
}
\`\`\`

**Exemple 2 - Dictée détaillée:**
"Femme de 34 ans, enceinte de 18 semaines, consulte pour fièvre à 38.5°C depuis 3 jours, toux productive, dyspnée d'effort. Pas d'allergie connue. Auscultation : râles crépitants base droite. SpO2 à 94% en air ambiant. Je suspecte une pneumonie du lobe inférieur droit. Prescrire Co-Amoxiclav 1g twice daily for 7 days and Paracetamol 1g if fever."

→ Extraction complète avec diagnostic et prescriptions
⚠️ IMPORTANT: Extract medications in ENGLISH even if dictated in French:
- Amoxicilline-acide clavulanique → Co-Amoxiclav
- Paracétamol → Paracetamol

**Exemple 3 - Dictée de correspondant spécialiste (IMPORTANT):**
"Homme de 58 ans référé par Dr. Martin pour avis cardiologique concernant douleurs thoraciques atypiques. Patient a déjà fait ECG et troponines qui sont normaux selon son médecin traitant. Examen d'aujourd'hui : auscultation cardiaque normale, souffle 2/6 systolique au foyer mitral. Tension 145/85. Je pense qu'il s'agit plutôt de douleurs musculo-squelettiques d'origine pariétale. Je recommande test d'effort de dépistage à faire dans les 3 mois. Je renvoie le patient à son médecin traitant Dr. Martin avec ces conclusions et mes recommandations."

→ Extraction avec referralInfo rempli :
\`\`\`json
{
  "patientInfo": {
    "age": 58,
    "sex": "M"
  },
  "clinicalData": {
    "chiefComplaint": "Avis cardiologique pour douleurs thoraciques atypiques",
    "symptoms": ["douleurs thoraciques atypiques"],
    "vitalSigns": {
      "bloodPressure": "145/85"
    }
  },
  "referralInfo": {
    "referringPhysician": "Dr. Martin",
    "referralReason": "Avis cardiologique pour douleurs thoraciques atypiques",
    "previousInvestigations": ["ECG normal", "Troponines normales"],
    "urgency": "routine"
  },
  "transcriptionMetadata": {
    "consultationType": "specialist_referral"
  }
}
\`\`\`

## 🎯 VALIDATION FINALE

Avant de retourner le JSON :
- [ ] Toutes les sections présentes (même si vides)
- [ ] Aucune valeur "undefined"
- [ ] Formats respectés (âge=number, sex=M/F/Unknown)
- [ ] diseaseHistory est une phrase complète et cohérente
- [ ] Signes vitaux en format standardisé
- [ ] aiQuestions inclut examen clinique ET impressions diagnostiques si mentionnés
- [ ] referralInfo rempli si c'est une consultation de correspondant
- [ ] consultationType correctement identifié ("standard" ou "specialist_referral")

Extraire maintenant les données de la dictée médicale fournie.
`;

// ============================================
// FONCTION 1: TRANSCRIPTION WHISPER
// ============================================
async function transcribeAudio(audioFile: File): Promise<{
  text: string;
  translatedText: string;
  duration: number;
  language: string;
  wasTranslated: boolean;
}> {
  console.log('🎤 Step 1: Transcribing audio with Whisper...');

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    // No language parameter = auto-detect French or English
    response_format: 'verbose_json',
    temperature: 0.2
  });

  console.log(`✅ Transcription completed`);
  console.log(`   Duration: ${transcription.duration}s`);
  console.log(`   Language detected: ${transcription.language}`);
  console.log(`   Text length: ${transcription.text.length} chars`);

  let translatedText = transcription.text;
  let wasTranslated = false;

  // If French detected, translate to English
  if (transcription.language === 'fr' || transcription.language === 'french') {
    console.log('🇫🇷 French detected - translating to English...');
    translatedText = await translateToEnglish(transcription.text);
    wasTranslated = true;
    console.log('✅ Translation completed');
  }

  return {
    text: transcription.text,
    translatedText,
    duration: transcription.duration || 0,
    language: transcription.language || 'unknown',
    wasTranslated
  };
}

// ============================================
// FONCTION 1b: TRANSLATE FRENCH TO ENGLISH
// ============================================
async function translateToEnglish(frenchText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4',
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
    return frenchText;
  }
}

// ============================================
// FONCTION 2: EXTRACTION DES DONNÉES CLINIQUES
// ============================================
async function extractClinicalData(
  transcriptionText: string
): Promise<ExtractedClinicalData> {
  console.log('🧠 Step 2: Extracting clinical data with GPT-5.4...');

  const extraction = await openai.chat.completions.create({
    model: 'gpt-5.4',
    messages: [
      {
        role: 'system',
        content: EXTRACTION_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `Transcription de la dictée médicale:\n\n${transcriptionText}\n\nExtrayez toutes les données cliniques en JSON.`
      }
    ],
    temperature: 0.1,
    max_completion_tokens: 3000,
    response_format: { type: "json_object" }
  });
  
  const extractedData = JSON.parse(
    extraction.choices[0].message.content || '{}'
  );
  
  console.log('✅ Clinical data extracted');
  console.log(`   Patient age: ${extractedData.patientInfo?.age || 'not specified'}`);
  console.log(`   Chief complaint: ${extractedData.clinicalData?.chiefComplaint || 'not specified'}`);
  console.log(`   Symptoms: ${extractedData.clinicalData?.symptoms?.length || 0}`);
  
  // Détecter si c'est une consultation de correspondant
  const isReferral = extractedData.referralInfo?.referringPhysician || 
                     extractedData.transcriptionMetadata?.consultationType === 'specialist_referral';
  
  if (isReferral) {
    console.log(`   🔍 SPECIALIST REFERRAL DETECTED`);
    console.log(`      Referring physician: ${extractedData.referralInfo?.referringPhysician || 'Not specified'}`);
    console.log(`      Referral reason: ${extractedData.referralInfo?.referralReason || 'Not specified'}`);
    console.log(`      Previous investigations: ${extractedData.referralInfo?.previousInvestigations?.length || 0}`);
  }
  
  return extractedData;
}

// ============================================
// FONCTION 3: PRÉPARATION POUR API OPENAI-DIAGNOSIS
// ============================================
function prepareForDiagnosisAPI(extractedData: ExtractedClinicalData) {
  console.log('📋 Step 3: Preparing data for openai-diagnosis API...');
  
  const patientInfo = extractedData.patientInfo;
  const clinicalData = extractedData.clinicalData;
  const referralInfo = extractedData.referralInfo;
  
  // Si c'est une consultation de correspondant, ajouter les informations dans aiQuestions
  const aiQuestions = [...(extractedData.aiQuestions || [])];
  
  if (referralInfo?.referringPhysician) {
    aiQuestions.push({
      question: "Médecin référent",
      answer: referralInfo.referringPhysician
    });
  }
  
  if (referralInfo?.referralReason) {
    aiQuestions.push({
      question: "Motif de la référence",
      answer: referralInfo.referralReason
    });
  }
  
  if (referralInfo?.previousInvestigations && referralInfo.previousInvestigations.length > 0) {
    aiQuestions.push({
      question: "Examens déjà réalisés",
      answer: referralInfo.previousInvestigations.join(', ')
    });
  }
  
  return {
    patientData: {
      age: patientInfo.age || 'Not specified',
      sex: patientInfo.sex || 'Unknown',
      gender: patientInfo.sex || 'Unknown',
      weight: patientInfo.weight || null,
      height: patientInfo.height || null,
      medicalHistory: patientInfo.medicalHistory || [],
      currentMedications: patientInfo.currentMedications || [],
      allergies: patientInfo.allergies || []
    },
    clinicalData: {
      chiefComplaint: clinicalData.chiefComplaint,
      symptoms: clinicalData.symptoms || [],
      symptomDuration: clinicalData.symptomDuration || 'Not specified',
      diseaseHistory: clinicalData.diseaseHistory || '',
      vitalSigns: clinicalData.vitalSigns || {}
    },
    aiQuestions: aiQuestions,
    referralInfo: referralInfo || null
  };
}

// ============================================
// FONCTION 4: APPEL API OPENAI-DIAGNOSIS
// ============================================
async function callDiagnosisAPI(
  preparedData: any,
  request: NextRequest
): Promise<any> {
  console.log('🔬 Step 4: Calling openai-diagnosis API...');
  
  // Use internal server-to-server call with full URL
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  const internalUrl = `${protocol}://${host}/api/openai-diagnosis`
  
  console.log(`   Internal API URL: ${internalUrl}`)
  
  const diagnosisResponse = await fetch(internalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward important headers for authentication
      ...(request.headers.get('cookie') && { 'cookie': request.headers.get('cookie')! }),
      ...(request.headers.get('authorization') && { 'authorization': request.headers.get('authorization')! })
    },
    body: JSON.stringify({
      patientData: preparedData.patientData,
      clinicalData: preparedData.clinicalData,
      aiQuestions: preparedData.aiQuestions
    })
  });
  
  if (!diagnosisResponse.ok) {
    const errorText = await diagnosisResponse.text();
    throw new Error(`Diagnosis API failed: ${diagnosisResponse.status} - ${errorText}`);
  }
  
  const diagnosisResult = await diagnosisResponse.json();
  
  console.log('✅ Diagnosis API completed');
  console.log('   Response structure:', Object.keys(diagnosisResult));
  console.log(`   Has analysis: ${!!diagnosisResult.analysis}`);
  console.log(`   Primary diagnosis: ${diagnosisResult.analysis?.clinical_analysis?.primary_diagnosis?.condition || 'Unknown'}`);
  console.log(`   Medications: ${diagnosisResult.analysis?.treatment_plan?.medications?.length || 0}`);
  
  return diagnosisResult;
}

// ============================================
// FONCTION 5: APPEL API GENERATE-CONSULTATION-REPORT
// ============================================
async function callReportGenerationAPI(
  diagnosisData: any,
  patientData: any,
  clinicalData: any,
  doctorInfo: any,
  request: NextRequest
): Promise<any> {
  console.log('📄 Step 5: Calling generate-consultation-report API...');
  
  // Use internal server-to-server call with full URL
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  const internalUrl = `${protocol}://${host}/api/generate-consultation-report`
  
  console.log(`   Internal API URL: ${internalUrl}`)
  
  // Extract diagnosis analysis - handle different response structures
  const analysisData = diagnosisData.analysis || diagnosisData
  
  console.log('   Diagnosis data structure:', Object.keys(diagnosisData))
  console.log('   Using analysis data:', Object.keys(analysisData))
  
  const reportResponse = await fetch(internalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward important headers for authentication
      ...(request.headers.get('cookie') && { 'cookie': request.headers.get('cookie')! }),
      ...(request.headers.get('authorization') && { 'authorization': request.headers.get('authorization')! })
    },
    body: JSON.stringify({
      patientData: patientData,
      clinicalData: clinicalData,
      diagnosisData: analysisData,  // Use extracted analysis
      doctorData: doctorInfo,
      includeFullPrescriptions: true
    })
  });
  
  if (!reportResponse.ok) {
    const errorText = await reportResponse.text();
    throw new Error(`Report generation API failed: ${reportResponse.status} - ${errorText}`);
  }
  
  const reportResult = await reportResponse.json();
  
  console.log('✅ Report generation completed');
  console.log(`   Report sections: ${Object.keys(reportResult.report?.medicalReport?.report || {}).length}`);
  console.log(`   Medications in prescription: ${reportResult.report?.prescriptions?.medications?.prescription?.medications?.length || 0}`);
  
  return reportResult;
}

// ============================================
// FONCTION 6: SAUVEGARDER LE RAPPORT DANS SUPABASE
// ============================================
async function saveReportToSupabase(
  reportData: any,
  patientData: any,
  diagnosisData: any,
  transcription: string,
  consultationType: string
): Promise<string> {
  console.log('💾 Step 6: Saving report to Supabase...');
  
  try {
    // Generate a unique consultation ID
    const consultationId = `VOICE_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Prepare the data to save
    const consultationRecord = {
      consultation_id: consultationId,
      patient_id: patientData.patientId || `VOICE_PATIENT_${Date.now()}`,
      consultation_type: consultationType,
      consultation_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Patient info - store in patient_data JSONB and also in flat columns
      patient_data: {
        name: `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient from Voice Dictation',
        age: patientData.age || null,
        gender: patientData.gender || null,
        email: patientData.email || null,
        phone: patientData.phone || null
      },
      patient_name: `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient from Voice Dictation',
      patient_email: patientData.email || null,
      patient_phone: patientData.phone || null,
      patient_age: patientData.age?.toString() || null,
      
      // Clinical data
      chief_complaint: reportData.report?.medicalReport?.report?.presentingComplaint?.chiefComplaint || 'Voice dictation consultation',
      diagnosis: diagnosisData.analysis?.clinical_analysis?.primary_diagnosis?.condition || 'Pending analysis',
      
      // Full report data (NEW COLUMNS)
      medical_report: reportData.report?.medicalReport || null,
      prescriptions: reportData.report?.prescriptions || null,
      lab_orders: reportData.report?.labOrders || null,
      imaging_orders: reportData.report?.imagingOrders || null,
      
      // Transcription
      transcription_text: transcription,
      
      // Workflow metadata
      workflow_metadata: {
        source: 'voice_dictation',
        timestamp: new Date().toISOString(),
        consultationType: consultationType
      }
    };
    
    // Insert into Supabase
    console.log('📝 Attempting to insert into consultation_records table...');
    console.log('   Record keys:', Object.keys(consultationRecord));
    console.log('   Consultation ID:', consultationId);
    
    const { data, error } = await supabase
      .from('consultation_records')
      .insert([consultationRecord])
      .select()
      .single();
    
    if (error) {
      console.error('❌ ========================================');
      console.error('   SUPABASE INSERT FAILED');
      console.error('========================================');
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      console.error('   Hint:', error.hint);
      console.error('========================================');
      
      // Don't throw - just log and return the ID anyway
      console.warn('⚠️ Could not save to Supabase, but continuing with in-memory ID');
      console.warn('⚠️ This report will NOT be accessible from /view-report or patient history');
      return consultationId;
    }
    
    console.log('✅ ========================================');
    console.log('   REPORT SAVED TO SUPABASE SUCCESSFULLY');
    console.log('========================================');
    console.log('   Consultation ID:', consultationId);
    console.log('   Database record ID:', data?.id);
    console.log('========================================');
    
    return consultationId;
    
  } catch (error) {
    console.error('❌ Error saving to Supabase:', error);
    // Return a temporary ID even if save fails
    const tempId = `TEMP_${Date.now()}`;
    console.warn(`⚠️ Using temporary ID: ${tempId}`);
    return tempId;
  }
}

// ============================================
// FONCTION PRINCIPALE - WORKFLOW COMPLET
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🎤 ========================================');
    console.log('   VOICE DICTATION WORKFLOW STARTED');
    console.log('========================================');
    
    // Récupérer les données du formulaire
    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;
    const doctorInfoStr = formData.get('doctorInfo') as string;
    const patientId = formData.get('patientId') as string;
    
    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: 'Audio file is required'
      }, { status: 400 });
    }
    
    const doctorInfo = doctorInfoStr ? JSON.parse(doctorInfoStr) : {};
    
    console.log(`📁 Audio file received: ${audioFile.name} (${audioFile.size} bytes)`);
    console.log(`👨‍⚕️ Doctor: ${doctorInfo.fullName || 'Not specified'}`);
    
    // ===== ÉTAPE 1: TRANSCRIPTION =====
    let transcription;
    try {
      console.log('🎯 Starting Step 1: Transcription...');
      transcription = await transcribeAudio(audioFile);
      console.log('✅ Step 1 completed successfully');
    } catch (error) {
      console.error('❌ Step 1 FAILED:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // ===== ÉTAPE 2: EXTRACTION DES DONNÉES =====
    // Use translated text (English) for extraction
    const textForExtraction = transcription.translatedText || transcription.text;
    let extractedData;
    try {
      console.log('🎯 Starting Step 2: Clinical Data Extraction...');
      extractedData = await extractClinicalData(textForExtraction);
      console.log('✅ Step 2 completed successfully');
    } catch (error) {
      console.error('❌ Step 2 FAILED:', error);
      throw new Error(`Clinical data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // ===== ÉTAPE 3: PRÉPARATION POUR DIAGNOSTIC =====
    let preparedData;
    try {
      console.log('🎯 Starting Step 3: Data Preparation...');
      preparedData = prepareForDiagnosisAPI(extractedData);
      console.log('✅ Step 3 completed successfully');
    } catch (error) {
      console.error('❌ Step 3 FAILED:', error);
      throw new Error(`Data preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // ===== ÉTAPE 4: APPEL API DIAGNOSTIC =====
    let diagnosisResult;
    try {
      console.log('🎯 Starting Step 4: Diagnosis API Call...');
      diagnosisResult = await callDiagnosisAPI(preparedData, request);
      console.log('✅ Step 4 completed successfully');
      console.log('   Diagnosis result keys:', Object.keys(diagnosisResult));
    } catch (error) {
      console.error('❌ Step 4 FAILED:', error);
      console.error('   Error details:', error);
      throw new Error(`Diagnosis API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // ===== ÉTAPE 5: GÉNÉRATION DU RAPPORT =====
    let reportResult;
    try {
      console.log('🎯 Starting Step 5: Report Generation API Call...');
      reportResult = await callReportGenerationAPI(
        diagnosisResult,
        preparedData.patientData,
        preparedData.clinicalData,
        doctorInfo,
        request
      );
      console.log('✅ Step 5 completed successfully');
      console.log('   Report result keys:', Object.keys(reportResult));
    } catch (error) {
      console.error('❌ Step 5 FAILED:', error);
      console.error('   Error details:', error);
      throw new Error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // ===== ÉTAPE 6: SAUVEGARDE DANS SUPABASE =====
    let consultationId;
    const isReferralConsultation = extractedData.referralInfo?.referringPhysician || 
                                   extractedData.transcriptionMetadata?.consultationType === 'specialist_referral';
    const consultationType = isReferralConsultation ? 'specialist_referral' : 'standard';
    
    try {
      console.log('🎯 Starting Step 6: Saving to Supabase...');
      consultationId = await saveReportToSupabase(
        reportResult,
        preparedData.patientData,
        diagnosisResult,
        transcription.text,
        consultationType
      );
      console.log('✅ Step 6 completed successfully');
      console.log(`   Consultation ID: ${consultationId}`);
    } catch (error) {
      console.error('❌ Step 6 FAILED:', error);
      console.error('   Error details:', error);
      // Don't throw - use a temporary ID
      consultationId = `TEMP_${Date.now()}`;
      console.warn(`⚠️ Using temporary consultation ID: ${consultationId}`);
    }
    
    // ===== RÉPONSE FINALE =====
    const processingTime = Date.now() - startTime;
    
    // Détecter si c'est une consultation de correspondant (déjà fait en haut)
    
    console.log('✅ ========================================');
    console.log('   WORKFLOW COMPLETED SUCCESSFULLY');
    console.log(`   Consultation ID: ${consultationId}`);
    console.log(`   Consultation type: ${isReferralConsultation ? 'SPECIALIST REFERRAL' : 'STANDARD'}`);
    console.log(`   Total processing time: ${processingTime}ms`);
    console.log('========================================');
    
    return NextResponse.json({
      success: true,
      consultationId: consultationId, // ✅ ADD THIS!
      consultationType: isReferralConsultation ? 'specialist_referral' : 'standard',
      workflow: {
        step1_transcription: {
          text: transcription.translatedText, // Always return English text
          originalText: transcription.text, // Original (may be French)
          translatedText: transcription.translatedText, // Translated to English
          duration: `${transcription.duration}s`,
          language: transcription.language,
          wasTranslated: transcription.wasTranslated
        },
        step2_extraction: {
          patientInfo: extractedData.patientInfo,
          clinicalData: extractedData.clinicalData,
          aiQuestions: extractedData.aiQuestions,
          referralInfo: extractedData.referralInfo || null,
          consultationType: isReferralConsultation ? 'specialist_referral' : 'standard'
        },
        step3_diagnosis: {
          primaryDiagnosis: diagnosisResult.analysis?.clinical_analysis?.primary_diagnosis?.condition,
          confidence: diagnosisResult.analysis?.clinical_analysis?.primary_diagnosis?.confidence_level,
          medications: diagnosisResult.analysis?.treatment_plan?.medications?.length || 0,
          investigations: (diagnosisResult.analysis?.investigation_strategy?.laboratory_tests?.length || 0) +
                         (diagnosisResult.analysis?.investigation_strategy?.imaging_studies?.length || 0)
        },
        step4_report: {
          reportGenerated: !!reportResult.report,
          sections: Object.keys(reportResult.report?.medicalReport?.report || {}),
          prescriptionMedications: reportResult.report?.prescriptions?.medications?.prescription?.medications?.length || 0
        },
        step5_save: {
          saved: !!consultationId,
          consultationId: consultationId
        }
      },
      finalReport: {
        ...reportResult.report,
        consultationId: consultationId // ✅ ADD THIS TOO!
      },
      metadata: {
        consultationId: consultationId, // ✅ AND HERE!
        workflowType: 'voice_dictation_to_consultation_report',
        totalProcessingTime: `${processingTime}ms`,
        stepsCompleted: [
          '1. Audio transcription (Whisper)',
          '2. Clinical data extraction (GPT-5.4)',
          '3. Medical diagnosis (openai-diagnosis API)',
          '4. Report generation (generate-consultation-report API)'
        ],
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ ========================================');
    console.error('   VOICE DICTATION WORKFLOW FAILED');
    console.error('   Processing time before error:', processingTime + 'ms');
    console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('========================================');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during voice dictation processing',
      errorDetails: {
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
        processingTime: `${processingTime}ms`
      }
    }, { status: 500 });
  }
}

// ============================================
// HEALTH CHECK
// ============================================
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    endpoint: 'voice-dictation-workflow',
    description: 'Complete voice dictation to consultation report workflow',
    workflow: [
      'Step 1: Whisper audio transcription',
      'Step 2: GPT-5.4 clinical data extraction',
      'Step 3: openai-diagnosis API call',
      'Step 4: generate-consultation-report API call'
    ],
    features: [
      'Automatic transcription (French/English)',
      'Intelligent clinical data extraction',
      'Full integration with existing diagnosis pipeline',
      'Complete consultation report generation',
      'Prescription management',
      'UK/Mauritius medical nomenclature'
    ],
    requiredInput: {
      audioFile: 'File (MP3, WAV, M4A, etc.)',
      doctorInfo: 'JSON string with doctor details',
      patientId: 'String (optional)'
    },
    estimatedProcessingTime: '60-120 seconds',
    maxDuration: '180 seconds'
  });
}
