// ============================================================================
// Medical Documents - OCR/Extract API Route
// ============================================================================
// Purpose: Extract text and structured data from medical document images using GPT-4 Vision
// Technology: OpenAI GPT-4o-mini (same as other modules)
// Method: POST
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  DocumentType,
  BiologyType,
  RadiologyType,
  ExtractRequest,
  ExtractResponse,
  BiologyDocument,
  RadiologyDocument,
} from '@/lib/medical-documents/types';
import {
  generateDocumentId,
  extractPatientName,
  extractDate,
  calculateConfidence,
} from '@/lib/medical-documents/utils';

// Initialize OpenAI client (same pattern as dermatology module)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// EXTRACTION PROMPTS
// ============================================================================

const BIOLOGY_EXTRACTION_PROMPT = `Tu es un expert médical spécialisé dans l'extraction de données à partir de documents d'analyses biologiques mauriciens.

OBJECTIF: Extraire TOUTES les informations structurées du document d'analyse biologique.

INSTRUCTIONS:
1. Extraire le texte complet du document avec précision
2. Identifier et extraire les informations du patient (nom, date)
3. Extraire TOUS les résultats d'analyses avec leurs valeurs et unités
4. Identifier les valeurs de référence pour chaque test
5. Repérer les laboratoire et médecin prescripteur si mentionnés

FORMAT DE RÉPONSE (JSON strict):
{
  "rawText": "Texte complet extrait du document",
  "patientName": "Nom du patient ou null",
  "examinationDate": "Date au format YYYY-MM-DD ou null",
  "laboratoryName": "Nom du laboratoire ou null",
  "prescribingDoctor": "Dr. Nom ou null",
  "results": [
    {
      "testName": "Nom du test (ex: Hémoglobine, Glycémie)",
      "value": "Valeur mesurée (nombre ou string)",
      "unit": "Unité (ex: g/dL, mmol/L)",
      "referenceRange": "Plage de référence (ex: 3.5-5.5) ou null"
    }
  ],
  "biologyType": "Type d'analyse détecté ou null",
  "confidence": 0.0-1.0
}

TYPES D'ANALYSES BIOLOGIQUES:
- blood_count: NFS (Numération Formule Sanguine)
- lipid_profile: Bilan lipidique (cholestérol, triglycérides)
- liver_function: Bilan hépatique (SGOT, SGPT, GGT)
- kidney_function: Bilan rénal (créatinine, urée)
- thyroid_function: Bilan thyroïdien (TSH, T3, T4)
- diabetes: Bilan diabétique (glycémie, HbA1c)
- electrolytes: Ionogramme (Na, K, Cl)
- coagulation: Coagulation (TP, TCA, INR)
- inflammatory: Inflammation (CRP, VS)
- tumor_markers: Marqueurs tumoraux
- hormones: Hormones
- vitamins: Vitamines
- other_biology: Autres

IMPORTANT:
- Si une information n'est pas trouvée, retourner null
- Extraire TOUTES les lignes de résultats visibles
- Conserver les valeurs exactes avec leurs unités
- Le score de confiance doit refléter la qualité de l'extraction (0-1)`;

const RADIOLOGY_EXTRACTION_PROMPT = `Tu es un expert médical spécialisé dans l'extraction de données à partir de comptes-rendus radiologiques mauriciens.

OBJECTIF: Extraire TOUTES les informations structurées du compte-rendu radiologique.

INSTRUCTIONS:
1. Extraire le texte complet du document avec précision
2. Identifier le type d'imagerie (radiographie, scanner, IRM, échographie, mammographie)
3. Extraire les informations du patient
4. Identifier la région anatomique examinée
5. Extraire la technique utilisée
6. Extraire les observations (findings)
7. Extraire la conclusion/impression du radiologue
8. Identifier les recommandations si présentes

FORMAT DE RÉPONSE (JSON strict):
{
  "rawText": "Texte complet extrait du document",
  "patientName": "Nom du patient ou null",
  "examinationDate": "Date au format YYYY-MM-DD ou null",
  "radiologyCenter": "Nom du centre d'imagerie ou null",
  "radiologist": "Dr. Nom du radiologue ou null",
  "prescribingDoctor": "Dr. Nom du prescripteur ou null",
  "radiologyType": "Type d'imagerie ou null",
  "bodyPart": "Région anatomique examinée",
  "technique": "Technique utilisée",
  "findings": "Observations détaillées",
  "impression": "Conclusion du radiologue",
  "recommendations": "Recommandations ou null",
  "confidence": 0.0-1.0
}

TYPES D'IMAGERIE:
- xray: Radiographie
- ct_scan: Scanner (TDM)
- mri: IRM
- ultrasound: Échographie
- mammography: Mammographie
- other_radiology: Autres

IMPORTANT:
- Si une information n'est pas trouvée, retourner null
- Extraire le texte complet des sections "findings" et "impression"
- Le score de confiance doit refléter la qualité de l'extraction (0-1)
- Conserver la terminologie médicale exacte`;

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ExtractRequest = await request.json();
    const { imageData, documentType, subType, patientId } = body;

    // Validation
    if (!imageData || !documentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Image data and document type are required',
        } as ExtractResponse,
        { status: 400 }
      );
    }

    if (!['biology', 'radiology'].includes(documentType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid document type. Must be "biology" or "radiology"',
        } as ExtractResponse,
        { status: 400 }
      );
    }

    // Validate base64 image format
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid image format. Must be base64 encoded image',
        } as ExtractResponse,
        { status: 400 }
      );
    }

    // Select appropriate prompt based on document type
    const systemPrompt = documentType === 'biology' 
      ? BIOLOGY_EXTRACTION_PROMPT 
      : RADIOLOGY_EXTRACTION_PROMPT;

    // Call OpenAI GPT-4o-mini with Vision (same as dermatology module)
    console.log(`[Medical Documents] Extracting ${documentType} document...`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse ce document médical de type ${documentType === 'biology' ? 'biologie' : 'radiologie'} et extrais toutes les informations structurées.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for precise extraction
      max_tokens: 4000,
    });

    // Parse AI response
    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    const extractedData = JSON.parse(aiResponse);
    console.log('[Medical Documents] Extraction successful');

    // Generate document ID
    const documentId = generateDocumentId(documentType);

    // Build structured document based on type
    let structuredDocument: Partial<BiologyDocument> | Partial<RadiologyDocument>;

    if (documentType === 'biology') {
      structuredDocument = {
        id: documentId,
        type: 'biology',
        biologyType: (subType as BiologyType) || extractedData.biologyType || 'other_biology',
        patientId: patientId,
        patientName: extractedData.patientName || undefined,
        examinationDate: extractedData.examinationDate || new Date().toISOString().split('T')[0],
        laboratoryName: extractedData.laboratoryName || undefined,
        prescribingDoctor: extractedData.prescribingDoctor || undefined,
        rawText: extractedData.rawText || '',
        results: extractedData.results || [],
        status: 'extracting',
        uploadedAt: new Date().toISOString(),
        confidence: extractedData.confidence || 0.8,
      } as Partial<BiologyDocument>;
    } else {
      structuredDocument = {
        id: documentId,
        type: 'radiology',
        radiologyType: (subType as RadiologyType) || extractedData.radiologyType || 'other_radiology',
        patientId: patientId,
        patientName: extractedData.patientName || undefined,
        examinationDate: extractedData.examinationDate || new Date().toISOString().split('T')[0],
        radiologyCenter: extractedData.radiologyCenter || undefined,
        radiologist: extractedData.radiologist || undefined,
        prescribingDoctor: extractedData.prescribingDoctor || undefined,
        rawText: extractedData.rawText || '',
        bodyPart: extractedData.bodyPart || 'Non spécifié',
        technique: extractedData.technique || 'Non spécifié',
        findings: extractedData.findings || '',
        impression: extractedData.impression || '',
        recommendations: extractedData.recommendations || undefined,
        status: 'extracting',
        uploadedAt: new Date().toISOString(),
        confidence: extractedData.confidence || 0.8,
      } as Partial<RadiologyDocument>;
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          rawText: extractedData.rawText || '',
          extractedData: structuredDocument,
          confidence: extractedData.confidence || 0.8,
        },
      } as ExtractResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('[Medical Documents] Extraction error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API Error: ${error.message}`,
        } as ExtractResponse,
        { status: error.status || 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
      } as ExtractResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// METHOD NOT ALLOWED HANDLER
// ============================================================================

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
