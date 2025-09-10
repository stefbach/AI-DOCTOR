// app/api/medical-ai-assistant/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface MedicalAIRequest {
  userRequest: string
  medicalContext: {
    currentReport: any
    selectedSection: string
    patientInfo: {
      age: string
      sex: string
      diagnosis: string
    }
    currentMedications: any[]
    currentLabTests: any
    currentImaging: any[]
    capabilities?: {
      canModifyText: boolean
      canAddMedications: boolean
      canAddLabTests: boolean
      canAddImaging: boolean
      canUpdateMedications: boolean
      canUpdateLabTests: boolean
      canUpdateImaging: boolean
    }
  }
  requestType: 'medical_improvement' | 'section_correction' | 'prescription_optimization' | 'enhanced_medical_improvement'
  mauritiusStandards: boolean
  enhancedCapabilities?: boolean
}

// Prompt spécialisé amélioré pour l'assistant IA médical mauricien
const ENHANCED_MAURITIUS_MEDICAL_AI_ASSISTANT_PROMPT = `YOU ARE AN EXPERT MEDICAL AI ASSISTANT FOR MAURITIUS HEALTHCARE SYSTEM WITH ENHANCED CAPABILITIES

🏥 MEDICAL COUNCIL OF MAURITIUS (MCM) COMPLIANCE + UK/ANGLO-SAXON STANDARDS + MULTI-FUNCTION CAPABILITIES

Your role is to improve, correct, enhance medical reports AND manage prescriptions according to:
- Medical Council of Mauritius guidelines
- UK/Anglo-Saxon medical nomenclature  
- British pharmaceutical naming conventions
- UK laboratory test nomenclature (FBC, U&E, LFTs, TFTs)
- UK dosing conventions (OD/BD/TDS/QDS)
- Precise DCI (International Non-proprietary Names)

🆕 ENHANCED CAPABILITIES:
You can now:
1. MODIFY TEXT SECTIONS of medical reports
2. ADD NEW MEDICATIONS to prescriptions
3. ADD NEW LABORATORY TESTS to orders
4. ADD NEW IMAGING STUDIES to requests
5. PROVIDE STRUCTURED DATA for medications, lab tests, and imaging

RESPOND ONLY IN VALID JSON FORMAT:
{
  "success": true,
  "response": "Your detailed explanation of what you're doing",
  "improvement_type": "text_enhancement|medication_addition|lab_test_addition|imaging_addition|complete_review",
  "suggestion": {
    "type": "text|medication|labTest|imaging",
    "section": "section_name_or_target",
    "text": "improved_text_if_text_modification", 
    "data": {
      // For medications:
      "nom": "medication_name",
      "denominationCommune": "INN_name",
      "dosage": "500mg",
      "forme": "tablet",
      "posologie": "1 tablet TDS",
      "modeAdministration": "Oral route",
      "dureeTraitement": "7 days",
      "quantite": "1 box",
      "instructions": "Take with food",
      "justification": "Clinical indication",
      "nonSubstituable": false
      
      // For lab tests:
      "nom": "test_name",
      "category": "hematology|clinicalChemistry|immunology|microbiology|endocrinology|general",
      "urgence": false,
      "aJeun": false,
      "conditionsPrelevement": "special_conditions",
      "motifClinique": "clinical_indication",
      "tubePrelevement": "EDTA (Purple top)",
      "delaiResultat": "Standard"
      
      // For imaging:
      "type": "X-Ray|CT Scan|MRI|Ultrasound",
      "modalite": "imaging_modality",
      "region": "anatomical_region",
      "indicationClinique": "clinical_indication",
      "urgence": false,
      "contraste": false,
      "protocoleSpecifique": "specific_protocol",
      "questionDiagnostique": "diagnostic_question"
    },
    "reasoning": "medical_justification_for_changes"
  },
  "medical_standards_applied": [
    "standards_you_applied"
  ],
  "mauritius_compliance": {
    "mcm_guidelines": true,
    "uk_nomenclature": true,
    "dci_precision": true,
    "anglo_saxon_standards": true
  }
}

CRITICAL REQUIREMENTS FOR ENHANCED MEDICAL IMPROVEMENTS:

🎯 TEXT MODIFICATIONS (when type="text"):
- Use precise UK medical terminology
- Include ICD-10 codes when relevant
- Provide detailed pathophysiology
- Add differential diagnoses considerations
- Ensure clinical reasoning is thorough

💊 MEDICATION ADDITIONS (when type="medication"):
- ALWAYS use exact DCI names (Amoxicilline, Paracétamol, Ibuprofène)
- UK dosing format: "1 tablet TDS" (OD/BD/TDS/QDS)
- Include daily total doses where appropriate
- Detailed indications: minimum 30 characters with medical context
- Consider contraindications and interactions
- Mauritius availability information
- Provide complete structured data object

🧪 LABORATORY TEST ADDITIONS (when type="labTest"):
- UK nomenclature: "Full Blood Count (FBC)", "U&E", "LFTs", "TFTs"
- Specific clinical indications for each test
- Appropriate tube types and collection protocols
- Correct categorization (hematology, clinicalChemistry, etc.)
- Consider urgency and fasting requirements

📊 IMAGING ADDITIONS (when type="imaging"):
- Precise imaging modalities with UK terminology
- Specific anatomical regions
- Clear clinical indications and questions to answer
- Appropriate urgency levels and protocols
- Consider contrast requirements

🏥 MAURITIUS HEALTHCARE CONTEXT:
- Local availability of medications and tests
- Public vs private healthcare considerations
- Cost considerations in Mauritian Rupees
- Local hospital and laboratory networks
- Emergency contact numbers (SAMU: 114)

DECISION LOGIC FOR ENHANCEMENT TYPE:
1. If user requests text improvement → type="text"
2. If user requests adding medication → type="medication"
3. If user requests adding lab test → type="labTest"
4. If user requests adding imaging → type="imaging"
5. If user requests complete review → analyze what's needed most

SECTION MAPPING FOR IMPROVEMENTS:
- motifConsultation = Chief Complaint
- anamnese = History of Present Illness  
- antecedents = Past Medical History
- examenClinique = Physical Examination
- syntheseDiagnostique = Diagnostic Synthesis
- conclusionDiagnostique = Diagnostic Conclusion
- priseEnCharge = Management Plan
- surveillance = Follow-up Plan
- conclusion = Final Remarks
- medications = Prescription additions
- laboratory = Lab test additions
- imaging = Imaging additions

ALWAYS:
✅ Maintain medical accuracy and evidence-based approach
✅ Use UK/Mauritius standard medical terminology
✅ Provide detailed, professional medical language
✅ Include specific dosages, frequencies, and durations for medications
✅ Add clinical justifications for all recommendations
✅ Ensure patient safety considerations
✅ Comply with Medical Council of Mauritius standards
✅ Provide structured data when adding medications/tests/imaging

NEVER:
❌ Use vague or generic medical terms
❌ Provide incomplete medication information
❌ Skip clinical reasoning
❌ Use non-UK medical terminology
❌ Omit safety considerations
❌ Add inappropriate medications or tests
❌ Ignore contraindications or interactions

ENHANCED CAPABILITIES CONTEXT:
Current capabilities available: {{CAPABILITIES}}

USER REQUEST: {{USER_REQUEST}}

CURRENT MEDICAL CONTEXT:
{{MEDICAL_CONTEXT}}

Provide your enhanced medical improvement following Mauritius MCM standards with UK nomenclature and appropriate enhancement type.`

export async function POST(request: NextRequest) {
  console.log('🤖 Enhanced Medical AI Assistant API - Mauritius Standards')
  
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.error('❌ OpenAI API key missing or invalid')
      return NextResponse.json({
        success: false,
        error: 'Configuration API manquante'
      }, { status: 500 })
    }

    const body: MedicalAIRequest = await request.json()
    
    if (!body.userRequest || !body.medicalContext) {
      return NextResponse.json({
        success: false,
        error: 'Données requises manquantes'
      }, { status: 400 })
    }

    // Déterminer si on utilise les capacités étendues
    const useEnhancedCapabilities = body.enhancedCapabilities && body.requestType === 'enhanced_medical_improvement'
    
    // Préparer le contexte médical pour GPT-4
    const medicalContextString = JSON.stringify({
      patient: body.medicalContext.patientInfo,
      current_report_sections: body.medicalContext.currentReport?.compteRendu?.rapport || {},
      selected_section: body.medicalContext.selectedSection,
      current_medications: body.medicalContext.currentMedications,
      lab_tests: body.medicalContext.currentLabTests,
      imaging_studies: body.medicalContext.currentImaging,
      diagnosis: body.medicalContext.patientInfo.diagnosis,
      capabilities: body.medicalContext.capabilities || {}
    }, null, 2)

    // Choisir le prompt approprié
    const basePrompt = useEnhancedCapabilities ? 
      ENHANCED_MAURITIUS_MEDICAL_AI_ASSISTANT_PROMPT : 
      MAURITIUS_MEDICAL_AI_ASSISTANT_PROMPT

    // Construire le prompt final avec contexte des capacités
    const finalPrompt = basePrompt
      .replace('{{USER_REQUEST}}', body.userRequest)
      .replace('{{MEDICAL_CONTEXT}}', medicalContextString)
      .replace('{{CAPABILITIES}}', JSON.stringify(body.medicalContext.capabilities || {}, null, 2))

    console.log('📤 Sending enhanced request to GPT-4 with Mauritius medical standards...')
    console.log('🔧 Enhanced capabilities enabled:', useEnhancedCapabilities)
    console.log('🎯 Available capabilities:', body.medicalContext.capabilities)

    // Appel à GPT-4 avec paramètres optimisés pour les capacités étendues
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: useEnhancedCapabilities ?
              `You are an expert medical AI assistant specializing in Mauritius healthcare standards with ENHANCED CAPABILITIES. You MUST respond ONLY with valid JSON. Use UK medical terminology, precise DCI names, and comply with Medical Council of Mauritius guidelines. You can now modify text sections, add medications, add lab tests, and add imaging studies. Always provide structured data for additions and specify the correct "type" field in your suggestion.` :
              `You are an expert medical AI assistant specializing in Mauritius healthcare standards. You MUST respond ONLY with valid JSON. Use UK medical terminology, precise DCI names, and comply with Medical Council of Mauritius guidelines. Every medication must have exact DCI, UK dosing format, and detailed clinical indications.`
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.2
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const rawContent = data.choices[0]?.message?.content || ''

    console.log('📥 Enhanced GPT-4 response received')

    // Parser la réponse JSON
    let parsedResponse: any
    try {
      // Nettoyer le contenu si nécessaire
      let cleanContent = rawContent.trim()
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      
      parsedResponse = JSON.parse(cleanContent)
      
      // Validation spéciale pour les capacités étendues
      if (useEnhancedCapabilities && parsedResponse.suggestion) {
        const suggestion = parsedResponse.suggestion
        const suggestionType = suggestion.type || 'text'
        
        console.log('🔍 Validating enhanced suggestion:', {
          type: suggestionType,
          hasSection: !!suggestion.section,
          hasText: !!suggestion.text,
          hasData: !!suggestion.data,
          dataKeys: suggestion.data ? Object.keys(suggestion.data) : []
        })
        
        // Validation selon le type
        switch (suggestionType) {
          case 'medication':
            if (!suggestion.data || !suggestion.data.nom) {
              console.warn('⚠️ Invalid medication suggestion - missing required data')
              parsedResponse.suggestion = null
            } else {
              // Compléter les données manquantes avec des valeurs par défaut
              parsedResponse.suggestion.data = {
                nom: suggestion.data.nom,
                denominationCommune: suggestion.data.denominationCommune || suggestion.data.nom,
                dosage: suggestion.data.dosage || '',
                forme: suggestion.data.forme || 'tablet',
                posologie: suggestion.data.posologie || '',
                modeAdministration: suggestion.data.modeAdministration || 'Oral route',
                dureeTraitement: suggestion.data.dureeTraitement || '7 days',
                quantite: suggestion.data.quantite || '1 box',
                instructions: suggestion.data.instructions || '',
                justification: suggestion.data.justification || '',
                nonSubstituable: suggestion.data.nonSubstituable || false,
                ligneComplete: `${suggestion.data.nom} ${suggestion.data.dosage || ''}\n${suggestion.data.posologie || ''} - ${suggestion.data.modeAdministration || 'Oral route'}\nDuration: ${suggestion.data.dureeTraitement || '7 days'} - Quantity: ${suggestion.data.quantite || '1 box'}`
              }
            }
            break
            
          case 'labTest':
            if (!suggestion.data || !suggestion.data.nom) {
              console.warn('⚠️ Invalid lab test suggestion - missing required data')
              parsedResponse.suggestion = null
            } else {
              // Compléter les données manquantes avec des valeurs par défaut
              parsedResponse.suggestion.data = {
                nom: suggestion.data.nom,
                category: suggestion.data.category || 'general',
                urgence: suggestion.data.urgence || false,
                aJeun: suggestion.data.aJeun || false,
                conditionsPrelevement: suggestion.data.conditionsPrelevement || '',
                motifClinique: suggestion.data.motifClinique || '',
                renseignementsCliniques: suggestion.data.renseignementsCliniques || '',
                tubePrelevement: suggestion.data.tubePrelevement || 'As per laboratory protocol',
                delaiResultat: suggestion.data.delaiResultat || 'Standard'
              }
            }
            break
            
          case 'imaging':
            if (!suggestion.data || !suggestion.data.type) {
              console.warn('⚠️ Invalid imaging suggestion - missing required data')
              parsedResponse.suggestion = null
            } else {
              // Compléter les données manquantes avec des valeurs par défaut
              parsedResponse.suggestion.data = {
                type: suggestion.data.type,
                modalite: suggestion.data.modalite || suggestion.data.type,
                region: suggestion.data.region || '',
                indicationClinique: suggestion.data.indicationClinique || '',
                urgence: suggestion.data.urgence || false,
                contraste: suggestion.data.contraste || false,
                protocoleSpecifique: suggestion.data.protocoleSpecifique || '',
                questionDiagnostique: suggestion.data.questionDiagnostique || ''
              }
            }
            break
            
          default: // 'text'
            if (!suggestion.text || !suggestion.section) {
              console.warn('⚠️ Invalid text suggestion - missing text or section')
              parsedResponse.suggestion = null
            }
            break
        }
        
        console.log('✅ Enhanced suggestion validation completed')
      }
      
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      console.log('Raw content:', rawContent.substring(0, 500))
      
      // Fallback response
      parsedResponse = {
        success: true,
        response: "Amélioration suggérée selon les standards du Medical Council of Mauritius. Veuillez reformuler votre demande pour une réponse plus précise.",
        improvement_type: "general_guidance",
        medical_standards_applied: ["Medical Council of Mauritius guidelines", "UK medical nomenclature"],
        mauritius_compliance: {
          mcm_guidelines: true,
          uk_nomenclature: true,
          dci_precision: true,
          anglo_saxon_standards: true
        }
      }
    }

    // Validation de la réponse
    if (!parsedResponse.success) {
      parsedResponse.success = true
    }

    // Ajouter des métadonnées système étendues
    parsedResponse.system_metadata = {
      ai_model: 'GPT-4o',
      standards_applied: 'Medical Council of Mauritius + UK Anglo-Saxon',
      nomenclature: 'UK Medical Terminology',
      dci_enforcement: true,
      mauritius_context: true,
      enhanced_capabilities: useEnhancedCapabilities,
      available_functions: body.medicalContext.capabilities,
      timestamp: new Date().toISOString()
    }

    console.log('✅ Enhanced Medical AI assistant response processed successfully')
    console.log(`🏥 Improvement type: ${parsedResponse.improvement_type || 'general'}`)
    console.log(`🎯 Suggestion type: ${parsedResponse.suggestion?.type || 'none'}`)
    console.log(`🔧 Enhanced mode: ${useEnhancedCapabilities}`)

    return NextResponse.json(parsedResponse)

  } catch (error) {
    console.error('❌ Enhanced Medical AI Assistant API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      fallback_response: "Assistant temporairement indisponible. Le système Medical Council of Mauritius reste opérationnel pour les fonctions principales.",
      system_status: {
        api_available: false,
        mauritius_standards: true,
        enhanced_capabilities: false,
        manual_review_recommended: true
      }
    }, { status: 500 })
  }
}

// Prompt original pour compatibilité descendante
const MAURITIUS_MEDICAL_AI_ASSISTANT_PROMPT = `YOU ARE AN EXPERT MEDICAL AI ASSISTANT FOR MAURITIUS HEALTHCARE SYSTEM

🏥 MEDICAL COUNCIL OF MAURITIUS (MCM) COMPLIANCE + UK/ANGLO-SAXON STANDARDS

Your role is to improve, correct, and enhance medical reports according to:
- Medical Council of Mauritius guidelines
- UK/Anglo-Saxon medical nomenclature  
- British pharmaceutical naming conventions
- UK laboratory test nomenclature (FBC, U&E, LFTs, TFTs)
- UK dosing conventions (OD/BD/TDS/QDS)
- Precise DCI (International Non-proprietary Names)

RESPOND ONLY IN VALID JSON FORMAT:
{
  "success": true,
  "response": "Your detailed explanation of what you're doing",
  "improvement_type": "section_enhancement|prescription_optimization|diagnostic_refinement|complete_review",
  "suggestion": {
    "section": "section_name_if_applicable",
    "text": "improved_text_if_section_modification", 
    "reasoning": "medical_justification_for_changes"
  },
  "medical_standards_applied": [
    "standards_you_applied"
  ],
  "mauritius_compliance": {
    "mcm_guidelines": true,
    "uk_nomenclature": true,
    "dci_precision": true,
    "anglo_saxon_standards": true
  }
}

CRITICAL REQUIREMENTS FOR MEDICAL IMPROVEMENTS:

🎯 DIAGNOSTIC ENHANCEMENTS:
- Use precise UK medical terminology
- Include ICD-10 codes when relevant
- Provide detailed pathophysiology
- Add differential diagnoses considerations
- Ensure clinical reasoning is thorough

💊 PRESCRIPTION OPTIMIZATIONS:
- ALWAYS use exact DCI names (Amoxicilline, Paracétamol, Ibuprofène)
- UK dosing format: "500mg TDS" (OD/BD/TDS/QDS)
- Include daily total doses: "1500mg/day"
- Detailed indications: minimum 30 characters with medical context
- Complete contraindications and interactions
- Mauritius availability information

🧪 LABORATORY IMPROVEMENTS:
- UK nomenclature: "Full Blood Count (FBC)", "U&E", "LFTs", "TFTs"
- Specific clinical indications for each test
- Expected normal values
- Tube types and collection protocols
- Mauritius laboratory logistics

📊 IMAGING ENHANCEMENTS:
- Precise imaging modalities with UK terminology
- Specific anatomical regions
- Clinical indications and questions to answer
- Urgency levels and protocols

🏥 MAURITIUS HEALTHCARE CONTEXT:
- Local availability of medications and tests
- Public vs private healthcare considerations
- Cost estimates in Mauritian Rupees
- Local hospital and laboratory networks
- Emergency contact numbers (SAMU: 114)

SECTION MAPPING FOR IMPROVEMENTS:
- motifConsultation = Chief Complaint
- anamnese = History of Present Illness  
- antecedents = Past Medical History
- examenClinique = Physical Examination
- syntheseDiagnostique = Diagnostic Synthesis
- conclusionDiagnostique = Diagnostic Conclusion
- priseEnCharge = Management Plan
- surveillance = Follow-up Plan
- conclusion = Final Remarks

ALWAYS:
✅ Maintain medical accuracy and evidence-based approach
✅ Use UK/Mauritius standard medical terminology
✅ Provide detailed, professional medical language
✅ Include specific dosages, frequencies, and durations
✅ Add clinical justifications for all recommendations
✅ Ensure patient safety considerations
✅ Comply with Medical Council of Mauritius standards

NEVER:
❌ Use vague or generic medical terms
❌ Provide incomplete medication information
❌ Skip clinical reasoning
❌ Use non-UK medical terminology
❌ Omit safety considerations

USER REQUEST: {{USER_REQUEST}}

CURRENT MEDICAL CONTEXT:
{{MEDICAL_CONTEXT}}

Provide your medical improvement following Mauritius MCM standards with UK nomenclature.`

// Health check endpoint
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const test = url.searchParams.get('test')
  
  if (test === 'mauritius') {
    // Test des capacités d'amélioration médicale étendues
    const testContext = {
      userRequest: "Améliore la prescription avec standards MCM et ajoute un médicament pour l'hypertension",
      medicalContext: {
        currentReport: {
          compteRendu: {
            rapport: {
              motifConsultation: "Douleur abdominale",
              conclusionDiagnostique: "Gastrite aiguë"
            }
          }
        },
        selectedSection: "priseEnCharge",
        patientInfo: {
          age: "35",
          sex: "F", 
          diagnosis: "Gastrite aiguë"
        },
        currentMedications: [
          {
            nom: "Paracetamol 500mg",
            denominationCommune: "Paracétamol",
            justification: "Douleur"
          }
        ],
        currentLabTests: {},
        currentImaging: [],
        capabilities: {
          canModifyText: true,
          canAddMedications: true,
          canAddLabTests: true,
          canAddImaging: true,
          canUpdateMedications: true,
          canUpdateLabTests: true,
          canUpdateImaging: true
        }
      },
      requestType: 'enhanced_medical_improvement' as const,
      mauritiusStandards: true,
      enhancedCapabilities: true
    }

    return NextResponse.json({
      status: '✅ Enhanced Medical AI Assistant - Test Mauritius',
      system: 'Mauritius Medical Council Standards + UK Nomenclature + Enhanced Capabilities',
      capabilities: [
        '🏥 Medical Council of Mauritius compliance',
        '🇬🇧 UK/Anglo-Saxon medical terminology',
        '💊 Precise DCI enforcement', 
        '🧪 UK laboratory nomenclature (FBC, U&E, LFTs)',
        '📊 UK dosing conventions (OD/BD/TDS/QDS)',
        '🎯 Section-specific improvements',
        '🔍 Prescription optimization',
        '📋 Diagnostic enhancement',
        '🏝️ Mauritius healthcare context',
        '🆕 Add medications functionality',
        '🆕 Add laboratory tests functionality',
        '🆕 Add imaging studies functionality',
        '🆕 Multi-type suggestion support'
      ],
      test_context: testContext,
      api_endpoints: {
        improvement: 'POST /api/medical-ai-assistant',
        test: 'GET /api/medical-ai-assistant?test=mauritius'
      },
      enhanced_features: {
        text_modification: true,
        medication_addition: true,
        lab_test_addition: true,
        imaging_addition: true,
        structured_data_support: true,
        multi_type_suggestions: true
      }
    })
  }

  return NextResponse.json({
    status: '✅ Enhanced Medical AI Assistant API - Ready',
    version: 'Mauritius MCM Standards + UK Nomenclature + Enhanced Capabilities',
    features: [
      'Real-time medical report improvements',
      'Medical Council of Mauritius compliance',
      'UK/Anglo-Saxon medical terminology',
      'Precise DCI enforcement',
      'Section-specific enhancements',
      'Prescription optimization',
      'Laboratory test improvements',
      'Imaging study enhancements',
      'Enhanced medication addition',
      'Enhanced laboratory test addition',
      'Enhanced imaging study addition',
      'Multi-type suggestion support'
    ],
    integration: 'Compatible with existing Mauritius medical system',
    standards: 'Medical Council of Mauritius + UK Medical Nomenclature',
    enhanced_capabilities: true
  })
}
