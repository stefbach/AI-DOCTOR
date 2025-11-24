// ============================================================================
// Medical Documents - Analysis API Route
// ============================================================================
// Purpose: Analyze extracted medical documents and provide clinical insights
// Technology: OpenAI GPT-4o (same as other modules - high-quality analysis)
// Method: POST
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  DocumentType,
  BiologyDocument,
  RadiologyDocument,
  MedicalDocument,
  AnalyzeRequest,
  AnalyzeResponse,
  ClinicalSignificance,
  BiologyResult,
  isBiologyDocument,
  isRadiologyDocument,
} from '@/lib/medical-documents/types';
import {
  determineResultStatus,
  getCriticalResults,
  hasCriticalResults,
} from '@/lib/medical-documents/utils';

// Initialize OpenAI client (same pattern as dermatology and normal diagnosis modules)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// ANALYSIS PROMPTS
// ============================================================================

const BIOLOGY_ANALYSIS_PROMPT = `You are a Mauritian general practitioner expert in interpreting biology test results.

CONTEXT: Mauritius - Mixed healthcare system (public/private), high prevalence of diabetes and cardiovascular diseases.

OBJECTIVE: Analyze biology test results and provide a complete clinical interpretation.

INSTRUCTIONS:
1. Analyser CHAQUE résultat par rapport aux valeurs de référence
2. Identifier les anomalies (légères, modérées, sévères, critiques)
3. Évaluer la signification clinique globale
4. Fournir des recommandations adaptées au contexte mauricien
5. Signaler les situations nécessitant une action urgente

FORMAT DE RÉPONSE (JSON strict):
{
  "clinicalSignificance": {
    "severity": "normal | mild | moderate | severe | critical",
    "keyFindings": [
      "Liste des observations cliniques principales"
    ],
    "abnormalResults": [
      {
        "testName": "Nom du test",
        "value": "Valeur",
        "unit": "Unité",
        "referenceRange": "Plage normale",
        "status": "low | high | critical",
        "flagged": true
      }
    ],
    "criticalAlerts": [
      "Liste des alertes critiques nécessitant une action immédiate"
    ],
    "requiresUrgentAction": true/false,
    "summary": "Résumé clinique en français pour Maurice"
  },
  "recommendations": [
    "Recommandations cliniques spécifiques et actionnables"
  ]
}

CRITÈRES DE SÉVÉRITÉ:
- normal: Tous les résultats dans les normes
- mild: Légères anomalies sans impact clinique majeur
- moderate: Anomalies nécessitant surveillance ou ajustement thérapeutique
- severe: Anomalies significatives nécessitant intervention médicale
- critical: Valeurs dangereuses nécessitant action urgente

RECOMMANDATIONS TYPES:
- Répéter l'analyse si doute
- Consulter médecin dans [délai]
- Ajuster traitement actuel
- Investigations complémentaires
- Mesures hygiéno-diététiques
- Urgence hospitalière si critique

IMPORTANT:
- Adapter au contexte mauricien (disponibilité médicaments, accès soins)
- Toujours en français (langue médicale à Maurice)
- Clarté et précision pour médecins généralistes
- Signaler les interactions médicamenteuses potentielles si contexte fourni`;

const RADIOLOGY_ANALYSIS_PROMPT = `You are a Mauritian general practitioner expert in interpreting radiology reports.

CONTEXT: Mauritius - Mixed healthcare system (public/private), variable access to advanced imaging.

OBJECTIVE: Analyze the radiology report and provide clinical interpretation for patient management.

INSTRUCTIONS:
1. Analyser les observations (findings) du radiologue
2. Interpréter la conclusion (impression)
3. Évaluer la signification clinique et l'urgence
4. Identifier les diagnostics différentiels possibles
5. Fournir des recommandations de prise en charge
6. Signaler les situations nécessitant une action urgente

FORMAT DE RÉPONSE (JSON strict):
{
  "clinicalSignificance": {
    "severity": "normal | mild | moderate | severe | critical",
    "keyFindings": [
      "Liste des observations principales extraites du compte-rendu"
    ],
    "abnormalResults": [],
    "criticalAlerts": [
      "Liste des situations critiques identifiées"
    ],
    "requiresUrgentAction": true/false,
    "summary": "Synthèse clinique en français adaptée à Maurice"
  },
  "recommendations": [
    "Recommandations de prise en charge spécifiques et actionnables"
  ]
}

CRITÈRES DE SÉVÉRITÉ:
- normal: Examen normal ou variantes normales
- mild: Anomalies mineures sans impact clinique immédiat
- moderate: Anomalies nécessitant surveillance ou traitement
- severe: Pathologie significative nécessitant prise en charge active
- critical: Urgence médicale ou chirurgicale

SITUATIONS CRITIQUES (exemples):
- Suspicion de fracture déplacée
- Épanchement pleural massif
- Masse suspecte nécessitant biopsie urgente
- Signes d'infection sévère
- Obstruction digestive
- Pneumothorax
- AVC aigu

RECOMMANDATIONS TYPES:
- Consultation spécialiste dans [délai]
- Examens complémentaires (biologie, autre imagerie)
- Traitement médical ou chirurgical
- Surveillance évolutive
- Hospitalisation si nécessaire
- Urgence si critique

IMPORTANT:
- Adapter au contexte mauricien (accès aux spécialistes, disponibilité imagerie)
- Toujours en français (langue médicale à Maurice)
- Clarté pour médecins généralistes
- Prioriser les actions selon disponibilité locale`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build context string from patient information
 */
function buildPatientContext(request: AnalyzeRequest): string {
  if (!request.patientContext) return '';

  const { age, gender, chronicDiseases, currentMedications } = request.patientContext;
  const contextParts: string[] = [];

  if (age) contextParts.push(`Âge: ${age} ans`);
  if (gender) {
    const genderLabel = gender === 'male' ? 'Homme' : gender === 'female' ? 'Femme' : 'Autre';
    contextParts.push(`Sexe: ${genderLabel}`);
  }
  if (chronicDiseases && chronicDiseases.length > 0) {
    contextParts.push(`Maladies chroniques: ${chronicDiseases.join(', ')}`);
  }
  if (currentMedications && currentMedications.length > 0) {
    contextParts.push(`Traitements actuels: ${currentMedications.join(', ')}`);
  }

  return contextParts.length > 0 
    ? `\n\nCONTEXTE PATIENT:\n${contextParts.join('\n')}`
    : '';
}

/**
 * Build user prompt for biology document
 */
function buildBiologyPrompt(request: AnalyzeRequest): string {
  const contextStr = buildPatientContext(request);
  
  return `Analyze the following biology test results and provide a complete clinical interpretation.

TYPE D'ANALYSE: ${request.subType || 'Non spécifié'}

RÉSULTATS EXTRAITS:
${request.extractedText}
${contextStr}

Fournis une analyse détaillée en JSON selon le format spécifié.`;
}

/**
 * Build user prompt for radiology document
 */
function buildRadiologyPrompt(request: AnalyzeRequest): string {
  const contextStr = buildPatientContext(request);
  
  return `Analyze the following radiology report and provide a complete clinical interpretation.

TYPE D'IMAGERIE: ${request.subType || 'Non spécifié'}

COMPTE-RENDU:
${request.extractedText}
${contextStr}

Fournis une analyse détaillée en JSON selon le format spécifié.`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: AnalyzeRequest = await request.json();
    const { documentId, documentType, extractedText, subType, patientContext } = body;

    // Validation
    if (!documentId || !documentType || !extractedText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document ID, type, and extracted text are required',
        } as AnalyzeResponse,
        { status: 400 }
      );
    }

    if (!['biology', 'radiology'].includes(documentType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid document type. Must be "biology" or "radiology"',
        } as AnalyzeResponse,
        { status: 400 }
      );
    }

    // Select appropriate prompt and build user message
    const systemPrompt = documentType === 'biology' 
      ? BIOLOGY_ANALYSIS_PROMPT 
      : RADIOLOGY_ANALYSIS_PROMPT;

    const userPrompt = documentType === 'biology'
      ? buildBiologyPrompt(body)
      : buildRadiologyPrompt(body);

    // Call OpenAI GPT-4o for high-quality medical analysis (same as dermatology module)
    console.log(`[Medical Documents] Analyzing ${documentType} document ${documentId}...`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Use GPT-4o for complex medical analysis
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Low temperature for consistent medical analysis
      max_tokens: 4000,
    });

    // Parse AI response
    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    const analysisData = JSON.parse(aiResponse);
    console.log('[Medical Documents] Analysis successful');

    // Build complete document object
    const now = new Date().toISOString();
    let completeDocument: MedicalDocument;

    if (documentType === 'biology') {
      // For biology documents, ensure results have proper status flags
      const processedResults: BiologyResult[] = (analysisData.clinicalSignificance.abnormalResults || []).map((result: BiologyResult) => ({
        ...result,
        status: result.status || determineResultStatus(result.value, result.referenceRange),
        flagged: result.flagged || result.status !== 'normal',
      }));

      completeDocument = {
        id: documentId,
        type: 'biology',
        biologyType: subType as any || 'other_biology',
        patientId: patientContext?.age ? `PATIENT-${Date.now()}` : undefined,
        examinationDate: new Date().toISOString().split('T')[0],
        rawText: extractedText,
        results: processedResults,
        status: 'completed',
        uploadedAt: now,
        analyzedAt: now,
        confidence: 0.85,
      } as BiologyDocument;
    } else {
      completeDocument = {
        id: documentId,
        type: 'radiology',
        radiologyType: subType as any || 'other_radiology',
        patientId: patientContext?.age ? `PATIENT-${Date.now()}` : undefined,
        examinationDate: new Date().toISOString().split('T')[0],
        rawText: extractedText,
        bodyPart: 'Voir compte-rendu',
        technique: 'Voir compte-rendu',
        findings: extractedText.substring(0, 500), // Simplified for this implementation
        impression: analysisData.clinicalSignificance.summary || 'Voir analyse complète',
        recommendations: analysisData.recommendations?.join('; '),
        status: 'completed',
        uploadedAt: now,
        analyzedAt: now,
        confidence: 0.85,
      } as RadiologyDocument;
    }

    // Build clinical significance object
    const clinicalSignificance: ClinicalSignificance = {
      severity: analysisData.clinicalSignificance.severity || 'normal',
      keyFindings: analysisData.clinicalSignificance.keyFindings || [],
      abnormalResults: analysisData.clinicalSignificance.abnormalResults || [],
      criticalAlerts: analysisData.clinicalSignificance.criticalAlerts || [],
      requiresUrgentAction: analysisData.clinicalSignificance.requiresUrgentAction || false,
      summary: analysisData.clinicalSignificance.summary || '',
    };

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          document: completeDocument,
          clinicalSignificance,
          recommendations: analysisData.recommendations || [],
        },
      } as AnalyzeResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('[Medical Documents] Analysis error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API Error: ${error.message}`,
        } as AnalyzeResponse,
        { status: error.status || 500 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse AI response. Please try again.',
        } as AnalyzeResponse,
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown analysis error',
      } as AnalyzeResponse,
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
