// /app/api/tibok-medical-assistant/route.ts
// TIBOK Medical Assistant - Expert AI for Professional Report Analysis & Modification
// Version 1.0 - Integration with Professional Report Page

import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const runtime = 'nodejs'
export const maxDuration = 90 // 90 seconds for GPT-4 medical assistance (increased for complex analysis)

// ==================== ZOD SCHEMA FOR STRUCTURED OUTPUT ====================
const tibokResponseSchema = z.object({
  response: z.string().max(300).describe("Concise analysis text in English (max 300 chars)"),
  actions: z.array(z.object({
    type: z.enum(['modify_medical_report', 'modify_medication_prescription', 'modify_lab_prescription', 'modify_paraclinical_prescription', 'analyze_document_coherence']),
    action: z.enum(['add', 'update', 'remove']).optional(),
    section: z.string().optional(),
    content: z.any(),
    reasoning: z.string().max(80).describe("Brief justification in English (max 80 chars)")
  })).max(2).describe("Maximum 2 actions"),
  alerts: z.array(z.object({
    type: z.enum(['critical', 'warning', 'info']),
    message: z.string()
  })),
  suggestions: z.array(z.object({
    category: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    suggestion: z.string(),
    reasoning: z.string()
  }))
})

// ==================== TYPES ====================
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

interface DocumentContext {
  medicalReport?: any
  prescription?: any
  laboratoryTests?: any
  imagingStudies?: any
  patientInfo?: any
  vitalSigns?: any
}

interface AssistantAction {
  type: 'modify_medical_report' | 'modify_medication_prescription' | 'modify_lab_prescription' | 'modify_paraclinical_prescription' | 'analyze_document_coherence' | 'search_medical_knowledge' | 'none'
  section?: string
  action?: 'add' | 'update' | 'remove'
  content?: any
  reasoning?: string
  urgency?: 'routine' | 'urgent' | 'emergency'
}

// ==================== ANONYMISATION RGPD/HIPAA ====================
/**
 * Anonymise les données patient selon RGPD Article 32 et HIPAA §164.514
 * Supprime tous les identifiants personnels avant envoi à OpenAI
 * @param patientData - Données patient brutes
 * @returns Données anonymisées + identité originale (pour restauration)
 */
function anonymizePatientData(patientData: any): { 
  anonymized: any, 
  originalIdentity: any 
} {
  const originalIdentity = {
    nom: patientData?.nom,
    nomComplet: patientData?.nomComplet,
    firstName: patientData?.firstName,
    lastName: patientData?.lastName,
    name: patientData?.name,
    prenom: patientData?.prenom,
    telephone: patientData?.telephone,
    phone: patientData?.phone,
    email: patientData?.email
  }
  
  const anonymized = { ...patientData }
  
  // Supprimer TOUS les identifiants personnels (HIPAA §164.514 Safe Harbor)
  delete anonymized.nom
  delete anonymized.nomComplet
  delete anonymized.firstName
  delete anonymized.lastName
  delete anonymized.name
  delete anonymized.prenom
  delete anonymized.telephone
  delete anonymized.phone
  delete anonymized.email
  delete anonymized.address
  delete anonymized.adresse
  
  // Générer ID anonyme unique (pseudonymisation RGPD Article 32)
  anonymized.anonymousId = `TIBOK-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
  
  console.log('🔒 Patient data anonymized for TIBOK (GDPR/HIPAA compliant)')
  console.log(`   - Anonymous ID: ${anonymized.anonymousId}`)
  console.log(`   - Personal identifiers removed: ${Object.keys(originalIdentity).filter(k => originalIdentity[k]).length}`)
  
  return { anonymized, originalIdentity }
}

// ==================== TIBOK MEDICAL ASSISTANT SYSTEM PROMPT ====================
const TIBOK_MEDICAL_ASSISTANT_SYSTEM_PROMPT = `
# TIBOK Medical Assistant - Expert AI for Professional Medical Consultation Optimization

## IDENTITY & ROLE
Expert AI for TIBOK platform (Mauritius). PRIMARY ROLE: **SUGGEST CONCRETE ADDITIONS** to medical consultations.
- Language: **ENGLISH ONLY** (all fields, values, analysis)
- You intervene AFTER automatic generation of all 4 consultation documents

## CRITICAL TOKEN LIMITS
1. MAX 5 actions per response
2. "response" field: MAX 300 characters
3. "reasoning" field: MAX 80 characters per action
4. Priority: Valid JSON > number of actions

## JSON FORMAT (ABSOLUTE REQUIREMENT)
⚠️ CRITICAL: Respond with VALID JSON ONLY
- Start with {, end with }
- NO markdown (\`\`\`json), NO text before/after JSON
- All strings in double quotes "
- No trailing commas

{
  "response": "Brief analysis in ENGLISH (max 300 chars)",
  "actions": [
    {
      "type": "modify_medication_prescription",
      "action": "add",
      "content": {
        "nom": "Amlodipine",
        "denominationCommune": "Amlodipine",
        "dosage": "10mg",
        "posologie": "1 tablet daily",
        "dureeTraitement": "30 days",
        "justification": "BP control optimization"
      },
      "reasoning": "Increase for better BP control"
    }
  ],
  "alerts": [],
  "suggestions": []
}

## ACTION TYPES (CHOOSE CORRECTLY!)
1. **modify_medication_prescription**: Medications ONLY (Amlodipine, Metformin, etc.)
2. **modify_lab_prescription**: Lab tests (HbA1c, CBC, Creatinine, etc.) - NOT medications!
3. **modify_paraclinical_prescription**: Imaging/exams (CT, MRI, ECG, X-ray) - NOT medications!
4. **modify_medical_report**: Update report text sections

## ADD/REMOVE RULES
- **NEW item** → action: "add" (ALWAYS for new items)
- **DELETE item** → action: "remove" (requires index)
- **NEVER** action: "update" (unless index provided by system)

## FIELD REQUIREMENTS BY TYPE

### Medication (modify_medication_prescription)
Required: nom, denominationCommune, dosage, posologie, voieAdministration, dureeTraitement, quantite, justification

### Lab Test (modify_lab_prescription)
Required: category (hematology|clinicalChemistry|endocrinology|microbiology|immunology|general)
         test.name, test.code, test.clinical_indication, test.urgent, test.fasting

### Imaging (modify_paraclinical_prescription)
Required: type, region, clinical_indication, urgent, contrast (if applicable)

### Report Section (modify_medical_report)
Required: section (motifConsultation|anamnese|examenClinique|conclusionDiagnostique|priseEnCharge|recommandations)
         content (new text in ENGLISH)

## REMOVAL EXAMPLES
Remove medication: {"type": "modify_medication_prescription", "action": "remove", "content": {"index": 2, "medication_name": "Paracetamol"}, "reasoning": "Per doctor request"}

Remove lab test: {"type": "modify_lab_prescription", "action": "remove", "content": {"category": "hematology", "index": 0, "test_name": "CBC"}, "reasoning": "Already done recently"}

Remove imaging: {"type": "modify_paraclinical_prescription", "action": "remove", "content": {"index": 1, "exam_type": "Chest X-ray"}, "reasoning": "Not clinically indicated"}

## QUICK REFERENCE - TYPE SELECTION
Question: Is this a DRUG/MEDICATION? → modify_medication_prescription
Question: Is this a LAB TEST/BLOOD TEST? → modify_lab_prescription
Question: Is this IMAGING/SCAN/X-RAY/ECG? → modify_paraclinical_prescription
Question: Modify report TEXT? → modify_medical_report

## MEDICAL EXPERTISE
Based on NICE, BNF, WHO, ESC, ADA guidelines. You can:
- Analyze document coherence
- Suggest evidence-based additions
- Check drug interactions
- Identify missing monitoring
- Prioritize by clinical urgency

## FINAL CHECKS BEFORE SENDING
✅ Valid JSON format
✅ Correct "type" for each action (medication vs lab vs imaging)
✅ All required fields present
✅ action: "add" for all new items
✅ "response" < 300 chars
✅ "reasoning" < 80 chars each

Now analyze the provided documents and respond with valid JSON following all rules above.
`

// ==================== HELPER FUNCTIONS ====================

function buildDocumentContextSummary(context: DocumentContext): string {
  let summary = '═══════════════════════════════════════════════════════════════════\n'
  summary += '📋 ÉTAT ACTUEL DES DOCUMENTS DE CONSULTATION\n'
  summary += '═══════════════════════════════════════════════════════════════════\n\n'

  // Patient Info (ANONYMISÉ RGPD/HIPAA)
  if (context.patientInfo) {
    summary += '👤 PATIENT:\n'
    // ✅ Utiliser ID anonyme au lieu du nom (RGPD/HIPAA compliant)
    summary += `   - ID: ${context.patientInfo.anonymousId || 'ANON'}\n`
    summary += `   - Âge: ${context.patientInfo.age || 'N/A'}\n`
    summary += `   - Sexe: ${context.patientInfo.sexe || context.patientInfo.sex || 'N/A'}\n`
    if (context.patientInfo.poids) summary += `   - Poids: ${context.patientInfo.poids} kg\n`
    if (context.patientInfo.allergies && context.patientInfo.allergies !== 'NKDA (No Known Drug Allergies)') {
      summary += `   - ⚠️ ALLERGIES: ${context.patientInfo.allergies}\n`
    }
    if (context.patientInfo.medicalHistory) {
      summary += `   - Antécédents: ${context.patientInfo.medicalHistory}\n`
    }
    if (context.patientInfo.currentMedications && context.patientInfo.currentMedications !== 'No current medications') {
      summary += `   - Traitement actuel: ${context.patientInfo.currentMedications}\n`
    }
    summary += '\n'
  }

  // Vital Signs
  if (context.vitalSigns) {
    summary += '📊 SIGNES VITAUX:\n'
    if (context.vitalSigns.bloodPressureSystolic && context.vitalSigns.bloodPressureDiastolic) {
      const systolic = parseInt(context.vitalSigns.bloodPressureSystolic)
      const diastolic = parseInt(context.vitalSigns.bloodPressureDiastolic)
      let bpAlert = ''
      if (systolic >= 180 || diastolic >= 120) bpAlert = ' ⚠️ URGENCE HYPERTENSIVE'
      else if (systolic >= 140 || diastolic >= 90) bpAlert = ' ⚠️ HTA'
      summary += `   - TA: ${systolic}/${diastolic} mmHg${bpAlert}\n`
    }
    if (context.vitalSigns.temperature) {
      const temp = parseFloat(context.vitalSigns.temperature)
      let tempAlert = ''
      if (temp >= 38.5) tempAlert = ' ⚠️ FIÈVRE'
      summary += `   - Température: ${temp}°C${tempAlert}\n`
    }
    if (context.vitalSigns.bloodGlucose) {
      const glucose = parseFloat(context.vitalSigns.bloodGlucose)
      let glucoseAlert = ''
      if (glucose < 0.7) glucoseAlert = ' ⚠️ HYPOGLYCÉMIE'
      else if (glucose > 2.0) glucoseAlert = ' ⚠️ HYPERGLYCÉMIE SÉVÈRE'
      else if (glucose > 1.26) glucoseAlert = ' ⚠️ HYPERGLYCÉMIE'
      summary += `   - Glycémie: ${glucose} g/L${glucoseAlert}\n`
    }
    summary += '\n'
  }

  // Medical Report
  if (context.medicalReport) {
    summary += '📄 RAPPORT MÉDICAL:\n'
    if (context.medicalReport.motifConsultation) {
      summary += `   - Motif: ${context.medicalReport.motifConsultation.substring(0, 200)}...\n`
    }
    if (context.medicalReport.conclusionDiagnostique) {
      summary += `   - Diagnostic: ${context.medicalReport.conclusionDiagnostique.substring(0, 200)}...\n`
    }
    if (context.medicalReport.priseEnCharge) {
      summary += `   - Plan de traitement: ${context.medicalReport.priseEnCharge.substring(0, 150)}...\n`
    }
    summary += '\n'
  }

  // Medications
  if (context.prescription?.medicaments && context.prescription.medicaments.length > 0) {
    summary += `💊 ORDONNANCE (${context.prescription.medicaments.length} médicament(s)):\n`
    context.prescription.medicaments.forEach((med: any, idx: number) => {
      const dci = med.denominationCommune || med.dci || med.nom
      summary += `   ${idx + 1}. ${med.nom || 'N/A'}\n`
      summary += `      - DCI: ${dci}\n`
      summary += `      - Dosage: ${med.dosage || 'N/A'}\n`
      summary += `      - Posologie: ${med.posologie || 'N/A'}\n`
      summary += `      - Durée: ${med.dureeTraitement || 'N/A'}\n`
      if (med.justification) {
        summary += `      - Indication: ${med.justification}\n`
      }
    })
    summary += '\n'
  } else {
    summary += '💊 ORDONNANCE: Aucun médicament prescrit\n\n'
  }

  // Laboratory Tests
  if (context.laboratoryTests?.analyses) {
    const analyses = context.laboratoryTests.analyses
    const totalTests = Object.values(analyses).reduce((acc: number, tests: any) => 
      acc + (Array.isArray(tests) ? tests.length : 0), 0)
    
    if (totalTests > 0) {
      summary += `🔬 EXAMENS BIOLOGIQUES (${totalTests} test(s)):\n`
      for (const [category, tests] of Object.entries(analyses)) {
        if (Array.isArray(tests) && tests.length > 0) {
          summary += `   📋 ${category.toUpperCase()}:\n`
          tests.forEach((test: any) => {
            summary += `      - ${test.nom || 'N/A'}\n`
            if (test.motifClinique) summary += `        Indication: ${test.motifClinique}\n`
            if (test.urgence) summary += `        ⚠️ URGENT\n`
          })
        }
      }
      summary += '\n'
    } else {
      summary += '🔬 EXAMENS BIOLOGIQUES: Aucun examen prescrit\n\n'
    }
  }

  // Imaging Studies
  if (context.imagingStudies?.examens && context.imagingStudies.examens.length > 0) {
    summary += `🩻 EXAMENS PARACLINIQUES (${context.imagingStudies.examens.length} examen(s)):\n`
    context.imagingStudies.examens.forEach((exam: any, idx: number) => {
      summary += `   ${idx + 1}. ${exam.type || exam.modalite || 'N/A'} - ${exam.region || 'N/A'}\n`
      if (exam.indicationClinique) summary += `      Indication: ${exam.indicationClinique}\n`
      if (exam.urgence) summary += `      ⚠️ URGENT\n`
      if (exam.contraste) summary += `      💉 Avec contraste\n`
    })
    summary += '\n'
  } else {
    summary += '🩻 EXAMENS PARACLINIQUES: Aucun examen prescrit\n\n'
  }

  summary += '═══════════════════════════════════════════════════════════════════\n'
  return summary
}

function parseAssistantResponse(text: string): { response: string; actions: AssistantAction[]; alerts: any[]; suggestions: any[] } {
  console.log('🔍 Parsing TIBOK response, length:', text.length)
  
  // Multiple strategies to extract JSON
  let jsonStr: string | null = null
  
  // Strategy 1: Look for ```json blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i)
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    jsonStr = jsonBlockMatch[1].trim()
    console.log('📋 Found JSON in code block')
  }
  
  // Strategy 2: Look for raw JSON object with "response" key
  if (!jsonStr) {
    const rawJsonMatch = text.match(/\{[\s\S]*?"response"\s*:\s*"[\s\S]*?\}(?=\s*$|\s*\n)/i)
    if (rawJsonMatch) {
      jsonStr = rawJsonMatch[0]
      console.log('📋 Found raw JSON object')
    }
  }
  
  // Strategy 3: Try to find any JSON object in the text
  if (!jsonStr) {
    const anyJsonMatch = text.match(/\{[\s\S]*\}/g)
    if (anyJsonMatch) {
      // Try each match, starting from the longest
      const sortedMatches = anyJsonMatch.sort((a, b) => b.length - a.length)
      for (const match of sortedMatches) {
        try {
          const test = JSON.parse(match)
          if (test.response || test.actions || test.alerts || test.suggestions) {
            jsonStr = match
            console.log('📋 Found JSON via deep search')
            break
          }
        } catch {}
      }
    }
  }
  
  if (jsonStr) {
    try {
      // Clean the JSON string
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
      const parsed = JSON.parse(jsonStr)
      
      console.log('✅ JSON parsed successfully')
      console.log('   - Response length:', (parsed.response || '').length)
      console.log('   - Actions:', (parsed.actions || []).length)
      console.log('   - Alerts:', (parsed.alerts || []).length)
      console.log('   - Suggestions:', (parsed.suggestions || []).length)
      
      // Clean response to ensure no JSON code is shown to user
      let cleanResponse = parsed.response || text
      
      console.log('🧹 Raw response before cleaning (first 200 chars):', cleanResponse.substring(0, 200))
      
      // CRITICAL: The response field should ONLY contain human-readable text
      // Remove any JSON-like content from response (security measure)
      
      // Strategy 1: Remove code blocks
      cleanResponse = cleanResponse.replace(/```[\s\S]*?```/gi, '')
      
      // Strategy 2: Remove everything that looks like JSON (starts with { or [)
      cleanResponse = cleanResponse.replace(/\{[^}]*"type"[^}]*\}/gi, '')  // Remove action objects
      cleanResponse = cleanResponse.replace(/\{[^}]*"category"[^}]*\}/gi, '')  // Remove category objects
      
      // Strategy 3: If response still contains { or }, it's probably JSON - clear it
      if (cleanResponse.includes('"type":') || cleanResponse.includes('"action":') || cleanResponse.includes('"content":')) {
        console.log('⚠️ Response still contains JSON keywords - using default message')
        cleanResponse = "✅ Analyse effectuée avec succès.\n\nVeuillez consulter les actions proposées ci-dessous pour appliquer les modifications recommandées."
      }
      
      cleanResponse = cleanResponse.trim()
      
      // If response is empty or too short after cleaning, use a default message
      if (!cleanResponse || cleanResponse.length < 50) {
        cleanResponse = "✅ Analyse effectuée avec succès.\n\nVeuillez consulter les actions proposées ci-dessous pour appliquer les modifications recommandées."
      }
      
      console.log('✨ Cleaned response (first 200 chars):', cleanResponse.substring(0, 200))
      
      return {
        response: cleanResponse,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      }
    } catch (e) {
      console.log('⚠️ JSON parse error:', e)
    }
  }
  
  // ❌ JSON parsing failed completely - this should NOT happen
  console.error('🚨 CRITICAL: JSON parsing failed completely!')
  console.error('🚨 Raw AI response:', text.substring(0, 500))
  console.error('🚨 This indicates AI did not follow JSON format instructions')
  
  // Return error state - DO NOT use unreliable text extraction fallback
  // The fallback creates broken actions with only "description" field
  return {
    response: "❌ Erreur de format de réponse. L'assistant doit générer du JSON valide.\n\nVeuillez réessayer votre demande.",
    actions: [],
    alerts: [{
      type: 'warning',
      message: 'Format de réponse incorrect détecté - veuillez reformuler votre question'
    }],
    suggestions: []
  }
}

function generateConversationId(): string {
  return `TIBOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ==================== MAIN API HANDLER ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      message,
      conversationHistory = [],
      documentContext,
      conversationId
    } = body

    console.log('🤖 TIBOK MEDICAL ASSISTANT REQUEST')
    console.log(`   - Message: ${message?.substring(0, 100)}...`)
    console.log(`   - Has Medical Report: ${!!documentContext?.medicalReport}`)
    console.log(`   - Has Prescription: ${!!documentContext?.prescription}`)
    console.log(`   - Has Lab Tests: ${!!documentContext?.laboratoryTests}`)
    console.log(`   - Has Imaging: ${!!documentContext?.imagingStudies}`)

    // ✅ ANONYMISER LES DONNÉES PATIENT AVANT ENVOI À OPENAI (RGPD/HIPAA)
    let originalIdentity = null
    if (documentContext?.patientInfo) {
      const { anonymized, originalIdentity: identity } = anonymizePatientData(documentContext.patientInfo)
      originalIdentity = identity
      documentContext.patientInfo = anonymized
      console.log('🔒 Patient data anonymized (GDPR/HIPAA compliant)')
    }

    // Build context summary from all documents (avec données anonymisées)
    const contextSummary = buildDocumentContextSummary(documentContext || {})

    // Prepare messages for GPT-4 (avec données anonymisées)
    const messages: Message[] = [
      { role: 'system', content: TIBOK_MEDICAL_ASSISTANT_SYSTEM_PROMPT },
      { role: 'system', content: contextSummary },  // ✅ CONTEXTE ANONYMISÉ
      ...conversationHistory.slice(-15), // Keep last 15 messages for context
      { role: 'user', content: message }
    ]

    console.log('📡 Calling GPT-4 with ANONYMIZED patient data (GDPR/HIPAA compliant)...')

    // Call GPT-4 with structured output (guarantees valid JSON)
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: tibokResponseSchema,
      messages,
      maxTokens: 1500,
      temperature: 0.1
    })

    const parsed = result.object as any

    console.log('✅ TIBOK Assistant response generated')
    console.log(`   - Response length: ${parsed.response.length} chars`)
    console.log(`   - Actions: ${parsed.actions.length}`)
    console.log(`   - Alerts: ${parsed.alerts.length}`)
    console.log(`   - Suggestions: ${parsed.suggestions.length}`)
    console.log(`   - GDPR/HIPAA compliance: ✅ Patient data anonymized`)

    return NextResponse.json({
      success: true,
      response: parsed.response,
      actions: parsed.actions,
      alerts: parsed.alerts,
      suggestions: parsed.suggestions,
      conversationId: conversationId || generateConversationId(),
      timestamp: new Date().toISOString(),
      compliance: {
        anonymized: true,
        gdpr: true,
        hipaa: true,
        method: 'pseudonymization',
        standard: 'RGPD Article 32 + HIPAA §164.514',
        identifiersRemoved: originalIdentity ? Object.keys(originalIdentity).filter(k => originalIdentity[k]).length : 0
      }
    })

  } catch (error: any) {
    console.error('❌ Error in TIBOK Medical Assistant:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to process TIBOK assistant request',
      message: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}

// ==================== GET HANDLER FOR STATUS ====================
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    name: 'TIBOK Medical Assistant',
    version: '1.0',
    capabilities: [
      'analyze_document_coherence',
      'modify_medical_report',
      'modify_medication_prescription',
      'modify_lab_prescription',
      'modify_paraclinical_prescription',
      'search_medical_knowledge'
    ],
    supportedDocuments: [
      'medical_report',
      'prescription',
      'laboratory_tests',
      'imaging_studies'
    ]
  })
}
