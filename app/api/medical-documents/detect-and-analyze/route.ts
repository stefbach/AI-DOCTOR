// ============================================================================
// Medical Documents - Auto-Detect and Analyze API
// ============================================================================
// Purpose: Automatically detect document type and analyze multiple documents
// Input: Array of image files (base64)
// Output: Detected type + analysis for each document
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DetectAndAnalyzeRequest {
  images: string[]; // Array of base64 encoded images
}

interface DocumentAnalysisResult {
  id: string;
  detectedType: 'biology' | 'radiology' | 'unknown';
  subType: string;
  confidence: number;
  extractedData: any;
  clinicalInterpretation: any;
  error?: string;
}

// ============================================================================
// DETECTION PROMPT
// ============================================================================

const DETECTION_PROMPT = `You are a medical expert analyzing document images.

OBJECTIVE: Identify the type of medical document.

DOCUMENT TYPES:
1. BIOLOGY TESTS (Laboratory Results):
   - Blood tests (CBC, hemogram, NFS)
   - Biochemistry (glucose, creatinine, liver function, kidney function)
   - Lipid profile (cholesterol, triglycerides)
   - Hormones (thyroid, diabetes markers like HbA1c)
   - Inflammatory markers (CRP, ESR)
   - Coagulation tests
   - Tumor markers
   - Vitamins
   - Electrolytes
   - Any laboratory analysis

2. RADIOLOGY REPORTS (Medical Imaging):
   - X-Ray (Radiographie)
   - CT Scan / TDM (Tomodensitométrie)
   - MRI / IRM (Imagerie par Résonance Magnétique)
   - Ultrasound / Échographie
   - Mammography
   - Any medical imaging report

3. UNKNOWN:
   - Not a medical document
   - Prescription
   - Medical certificate
   - Other non-analyzable document

INSTRUCTIONS:
1. Analyze the document image carefully
2. Identify key indicators (lab values, imaging findings, report structure)
3. Determine if it's BIOLOGY or RADIOLOGY
4. Provide a specific subtype
5. Rate your confidence (0.0 to 1.0)

OUTPUT FORMAT (JSON):
{
  "documentType": "biology" | "radiology" | "unknown",
  "subType": "specific type",
  "confidence": 0.95,
  "reasoning": "Brief explanation of detection"
}

EXAMPLES:
- Blood test with WBC, RBC, Hemoglobin → {"documentType": "biology", "subType": "Complete Blood Count (CBC)", "confidence": 0.98}
- Chest X-Ray report → {"documentType": "radiology", "subType": "X-Ray", "confidence": 0.95}
- HbA1c and glucose results → {"documentType": "biology", "subType": "Diabetes Tests", "confidence": 0.97}
`;

// ============================================================================
// BIOLOGY EXTRACTION PROMPT
// ============================================================================

const BIOLOGY_EXTRACTION_PROMPT = `You are a medical expert specialized in extracting data from biology test documents.

OBJECTIVE: Extract ALL structured information from the biology test document.

Extract the following:
1. Patient demographics (name, age, gender, ID)
2. Test metadata (date, lab name, doctor)
3. ALL test results with:
   - Test name
   - Value
   - Unit
   - Reference range (normal values)
   - Status (normal/abnormal/critical)
4. Lab comments or notes

OUTPUT FORMAT (JSON):
{
  "patient": {
    "name": "string or null",
    "age": number or null,
    "gender": "M/F/O or null",
    "patientId": "string or null"
  },
  "metadata": {
    "testDate": "YYYY-MM-DD",
    "labName": "string",
    "requestingDoctor": "string or null"
  },
  "results": [
    {
      "testName": "string",
      "value": "string",
      "unit": "string",
      "referenceRange": "string",
      "status": "normal|abnormal|critical",
      "interpretation": "brief note"
    }
  ],
  "labComments": "string or null"
}

IMPORTANT:
- Extract EVERY test result found
- Preserve exact values and units
- Mark abnormal values correctly
- Include reference ranges
`;

// ============================================================================
// BIOLOGY ANALYSIS PROMPT
// ============================================================================

const BIOLOGY_ANALYSIS_PROMPT = `You are a medical expert providing clinical interpretation of biology test results.

OBJECTIVE: Analyze biology test results and provide a complete clinical interpretation.

Based on the extracted results, provide:

1. CLINICAL SIGNIFICANCE:
   - Overall assessment
   - Key abnormalities and their implications
   - Severity level (normal/mild/moderate/severe/critical)

2. PATHOLOGY DETECTION:
   - Identified or suspected conditions
   - Supporting evidence from test results

3. RECOMMENDATIONS:
   - Immediate actions needed (if any)
   - Follow-up tests recommended
   - Lifestyle or treatment suggestions

4. RISK ASSESSMENT:
   - Urgent action required? (yes/no)
   - Critical values that need immediate attention

OUTPUT FORMAT (JSON):
{
  "clinicalSignificance": {
    "overallAssessment": "summary",
    "keyFindings": ["finding1", "finding2"],
    "severity": "normal|mild|moderate|severe|critical",
    "requiresUrgentAction": boolean
  },
  "pathologies": [
    {
      "condition": "name",
      "confidence": "confirmed|suspected|unlikely",
      "supportingEvidence": ["evidence1", "evidence2"]
    }
  ],
  "recommendations": [
    "recommendation1",
    "recommendation2"
  ],
  "criticalAlerts": ["alert1", "alert2"]
}
`;

// ============================================================================
// RADIOLOGY EXTRACTION PROMPT
// ============================================================================

const RADIOLOGY_EXTRACTION_PROMPT = `You are a medical expert specialized in extracting data from radiology reports.

OBJECTIVE: Extract ALL structured information from the radiology report.

Extract the following:
1. Patient demographics
2. Exam metadata (date, type, radiologist)
3. Clinical indication
4. Technique/Protocol
5. Findings (detailed)
6. Impression/Conclusion
7. Recommendations

OUTPUT FORMAT (JSON):
{
  "patient": {
    "name": "string or null",
    "age": number or null,
    "gender": "M/F/O or null"
  },
  "metadata": {
    "examDate": "YYYY-MM-DD",
    "examType": "X-Ray|CT|MRI|Ultrasound|Other",
    "bodyRegion": "string",
    "radiologist": "string or null"
  },
  "clinicalIndication": "string",
  "technique": "string",
  "findings": "detailed description",
  "impression": "radiologist conclusion",
  "recommendations": "string or null"
}
`;

// ============================================================================
// RADIOLOGY ANALYSIS PROMPT
// ============================================================================

const RADIOLOGY_ANALYSIS_PROMPT = `You are a medical expert providing clinical interpretation of radiology reports.

OBJECTIVE: Analyze radiology findings and provide complete clinical interpretation.

Based on the extracted report, provide:

1. CLINICAL SIGNIFICANCE:
   - Key pathological findings
   - Severity assessment
   - Urgent findings

2. DIFFERENTIAL DIAGNOSIS:
   - Possible conditions based on findings
   - Confidence levels

3. RECOMMENDATIONS:
   - Follow-up imaging needed
   - Additional investigations
   - Treatment implications

OUTPUT FORMAT (JSON):
{
  "clinicalSignificance": {
    "keyFindings": ["finding1", "finding2"],
    "severity": "normal|mild|moderate|severe|critical",
    "requiresUrgentAction": boolean
  },
  "differentialDiagnosis": [
    {
      "condition": "name",
      "confidence": "high|medium|low",
      "reasoning": "explanation"
    }
  ],
  "recommendations": ["rec1", "rec2"],
  "criticalAlerts": ["alert1"] 
}
`;

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: DetectAndAnalyzeRequest = await request.json();
    const { images } = body;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      );
    }

    if (images.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 documents allowed per request' },
        { status: 400 }
      );
    }

    // Process each document
    const results: DocumentAnalysisResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      const documentId = `doc_${Date.now()}_${i}`;

      try {
        console.log(`Processing document ${i + 1}/${images.length}...`);

        // Step 1: Detect document type
        console.log('Step 1: Detecting document type...');
        const detectionCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: DETECTION_PROMPT,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify the type of this medical document.',
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
          temperature: 0.2,
          max_tokens: 500,
        });

        const detectionResult = JSON.parse(
          detectionCompletion.choices[0].message.content || '{}'
        );

        console.log('Detection result:', detectionResult);

        if (detectionResult.documentType === 'unknown') {
          results.push({
            id: documentId,
            detectedType: 'unknown',
            subType: 'Unknown',
            confidence: detectionResult.confidence || 0,
            extractedData: null,
            clinicalInterpretation: null,
            error: 'Document type could not be determined',
          });
          continue;
        }

        // Step 2: Extract data based on type
        console.log('Step 2: Extracting data...');
        const extractionPrompt =
          detectionResult.documentType === 'biology'
            ? BIOLOGY_EXTRACTION_PROMPT
            : RADIOLOGY_EXTRACTION_PROMPT;

        const extractionCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: extractionPrompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all structured data from this medical document.',
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
          temperature: 0.2,
          max_tokens: 4000,
        });

        const extractedData = JSON.parse(
          extractionCompletion.choices[0].message.content || '{}'
        );

        console.log('Extraction complete');

        // Step 3: Clinical analysis
        console.log('Step 3: Performing clinical analysis...');
        const analysisPrompt =
          detectionResult.documentType === 'biology'
            ? BIOLOGY_ANALYSIS_PROMPT
            : RADIOLOGY_ANALYSIS_PROMPT;

        const analysisCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: analysisPrompt,
            },
            {
              role: 'user',
              content: `Analyze this medical data:\n\n${JSON.stringify(extractedData, null, 2)}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 3000,
        });

        const clinicalInterpretation = JSON.parse(
          analysisCompletion.choices[0].message.content || '{}'
        );

        console.log(`Document ${i + 1} analysis complete`);

        results.push({
          id: documentId,
          detectedType: detectionResult.documentType,
          subType: detectionResult.subType || 'Not specified',
          confidence: detectionResult.confidence || 0,
          extractedData,
          clinicalInterpretation,
        });
      } catch (error) {
        console.error(`Error processing document ${i + 1}:`, error);
        results.push({
          id: documentId,
          detectedType: 'unknown',
          subType: 'Error',
          confidence: 0,
          extractedData: null,
          clinicalInterpretation: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalDocuments: images.length,
        processedDocuments: results.length,
        results,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
