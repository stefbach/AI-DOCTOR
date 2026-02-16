// app/api/medical-report-assistant/route.ts - AI Assistant for Medical Report Editing v2.0
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { 
  findLabTest, 
  findImagingStudy, 
  validateLabTest, 
  validateImagingStudy,
  LAB_TESTS_NOMENCLATURE,
  IMAGING_NOMENCLATURE
} from "./nomenclature"

// ==================== TYPES ====================
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ReportContext {
  patientInfo?: any
  diagnosis?: any
  medications?: any[]
  labTests?: any[]
  imagingStudies?: any[]
  narrativeContent?: any
  consultationType?: 'general' | 'dermatology' | 'chronic'
}

interface AssistantAction {
  type: 'modify' | 'add' | 'delete' | 'suggest' | 'clarify' | 'none'
  target?: 'medication' | 'lab_test' | 'imaging' | 'narrative' | 'diagnosis'
  data?: any
  explanation?: string
}

// ==================== MAIN API HANDLER ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      message, 
      conversationHistory = [], 
      reportContext,
      mode = 'assistant' // 'assistant' | 'correction' | 'suggestion'
    } = body

    console.log('🤖 MEDICAL REPORT ASSISTANT REQUEST')
    console.log(`   - Mode: ${mode}`)
    console.log(`   - Message: ${message?.substring(0, 100)}...`)
    console.log(`   - Consultation Type: ${reportContext?.consultationType || 'general'}`)
    console.log(`   - Current Medications: ${reportContext?.medications?.length || 0}`)
    console.log(`   - Current Lab Tests: ${reportContext?.labTests?.length || 0}`)

    // Build system prompt based on mode and consultation type
    const systemPrompt = buildSystemPrompt(mode, reportContext)
    
    // Build context summary
    const contextSummary = buildContextSummary(reportContext)
    
    // Prepare messages for GPT
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `CURRENT REPORT CONTEXT:\n${contextSummary}` },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ]

    console.log('📡 Calling GPT-4 for intelligent assistance...')

    // Call GPT-5.2 with function calling for structured actions
    const result = await generateText({
      model: openai("gpt-5.2", { reasoningEffort: "none" }),
      messages,
      maxTokens: 2000,
      temperature: 0.3,
      tools: {
        // Tool 1: Modify existing item (medication, test, etc.)
        modifyItem: {
          description: 'Modify an existing medication, lab test, or imaging study',
          parameters: {
            type: 'object',
            properties: {
              itemType: {
                type: 'string',
                enum: ['medication', 'lab_test', 'imaging'],
                description: 'Type of item to modify'
              },
              itemIndex: {
                type: 'number',
                description: 'Index of the item in the array (0-based)'
              },
              changes: {
                type: 'object',
                description: 'Object containing fields to change with new values'
              },
              reason: {
                type: 'string',
                description: 'Medical reasoning for the modification'
              }
            },
            required: ['itemType', 'itemIndex', 'changes', 'reason']
          }
        },

        // Tool 2: Add new item
        addItem: {
          description: 'Add a new medication, lab test, or imaging study',
          parameters: {
            type: 'object',
            properties: {
              itemType: {
                type: 'string',
                enum: ['medication', 'lab_test', 'imaging'],
                description: 'Type of item to add'
              },
              itemData: {
                type: 'object',
                description: 'Complete data for the new item'
              },
              reason: {
                type: 'string',
                description: 'Medical reasoning for adding this item'
              }
            },
            required: ['itemType', 'itemData', 'reason']
          }
        },

        // Tool 3: Delete item
        deleteItem: {
          description: 'Remove a medication, lab test, or imaging study',
          parameters: {
            type: 'object',
            properties: {
              itemType: {
                type: 'string',
                enum: ['medication', 'lab_test', 'imaging'],
                description: 'Type of item to delete'
              },
              itemIndex: {
                type: 'number',
                description: 'Index of the item in the array (0-based)'
              },
              reason: {
                type: 'string',
                description: 'Medical reasoning for removing this item'
              }
            },
            required: ['itemType', 'itemIndex', 'reason']
          }
        },

        // Tool 4: Update narrative section
        updateNarrative: {
          description: 'Update a narrative section of the medical report',
          parameters: {
            type: 'object',
            properties: {
              section: {
                type: 'string',
                enum: [
                  'chiefComplaint', 
                  'historyOfPresentIllness', 
                  'physicalExamination',
                  'diagnosticSynthesis',
                  'diagnosticConclusion',
                  'managementPlan',
                  'followUpPlan'
                ],
                description: 'Section to update'
              },
              newContent: {
                type: 'string',
                description: 'New content for the section'
              },
              reason: {
                type: 'string',
                description: 'Reasoning for the update'
              }
            },
            required: ['section', 'newContent', 'reason']
          }
        },

        // Tool 5: Provide suggestions
        provideSuggestions: {
          description: 'Provide intelligent suggestions to improve the medical report',
          parameters: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'string',
                      enum: ['medication', 'lab_test', 'imaging', 'narrative', 'safety'],
                      description: 'Category of suggestion'
                    },
                    priority: {
                      type: 'string',
                      enum: ['high', 'medium', 'low'],
                      description: 'Priority level'
                    },
                    suggestion: {
                      type: 'string',
                      description: 'The suggestion text'
                    },
                    reasoning: {
                      type: 'string',
                      description: 'Medical reasoning behind the suggestion'
                    }
                  }
                }
              }
            },
            required: ['suggestions']
          }
        },

        // Tool 6: Validate & Challenge doctor's proposal
        validateProposal: {
          description: 'Validate or challenge a doctor\'s proposed change with medical argumentation. Use when doctor asks "Why do you accept/reject this?"',
          parameters: {
            type: 'object',
            properties: {
              proposalType: {
                type: 'string',
                enum: ['diagnosis_change', 'medication_change', 'test_addition', 'test_removal'],
                description: 'Type of proposal being validated'
              },
              doctorProposal: {
                type: 'string',
                description: 'What the doctor wants to change'
              },
              validation: {
                type: 'string',
                enum: ['accept', 'reject', 'accept_with_modifications'],
                description: 'Validation decision'
              },
              medicalReasoning: {
                type: 'string',
                description: 'Detailed medical reasoning for accepting or rejecting. Include clinical evidence, guidelines, contraindications, etc.'
              },
              alternative: {
                type: 'string',
                description: 'If rejecting, suggest alternative approach'
              },
              supportingEvidence: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Clinical guidelines, studies, or evidence supporting the decision'
              }
            },
            required: ['proposalType', 'doctorProposal', 'validation', 'medicalReasoning']
          }
        },

        // Tool 7: Modify diagnosis with validation
        modifyDiagnosis: {
          description: 'Modify the primary diagnosis with full medical argumentation',
          parameters: {
            type: 'object',
            properties: {
              currentDiagnosis: {
                type: 'string',
                description: 'Current diagnosis'
              },
              proposedDiagnosis: {
                type: 'string',
                description: 'Proposed new diagnosis'
              },
              clinicalJustification: {
                type: 'string',
                description: 'Clinical features supporting the new diagnosis'
              },
              differentialConsiderations: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Why other diagnoses were ruled out'
              },
              confidence: {
                type: 'string',
                enum: ['high', 'moderate', 'low'],
                description: 'Confidence in new diagnosis'
              },
              additionalInvestigations: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Tests needed to confirm new diagnosis'
              }
            },
            required: ['currentDiagnosis', 'proposedDiagnosis', 'clinicalJustification', 'confidence']
          }
        },

        // Tool 8: Validate nomenclature conformity
        validateNomenclature: {
          description: 'Validate if a lab test or imaging study conforms to required nomenclature standards',
          parameters: {
            type: 'object',
            properties: {
              testType: {
                type: 'string',
                enum: ['lab_test', 'imaging'],
                description: 'Type of test to validate'
              },
              testName: {
                type: 'string',
                description: 'Name of the test as entered by doctor'
              },
              conforms: {
                type: 'boolean',
                description: 'Whether the test name conforms to nomenclature'
              },
              standardizedName: {
                type: 'string',
                description: 'Correct standardized name according to nomenclature'
              },
              reasoning: {
                type: 'string',
                description: 'Explanation of nomenclature requirements'
              }
            },
            required: ['testType', 'testName', 'conforms', 'reasoning']
          }
        }
      }
    })

    // Extract response and tool calls
    const responseText = result.text
    const toolCalls = result.toolCalls || []

    // Process tool calls and prepare actions
    const actions: AssistantAction[] = []
    
    for (const toolCall of toolCalls) {
      const action = processToolCall(toolCall, reportContext)
      if (action) {
        actions.push(action)
      }
    }

    console.log(`✅ Assistant response generated`)
    console.log(`   - Response length: ${responseText.length} chars`)
    console.log(`   - Actions detected: ${actions.length}`)

    return NextResponse.json({
      success: true,
      response: responseText,
      actions,
      conversationId: body.conversationId || generateConversationId(),
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error in medical report assistant:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process assistant request',
      message: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}

// ==================== HELPER FUNCTIONS ====================

function buildSystemPrompt(mode: string, reportContext: ReportContext): string {
  const consultationType = reportContext.consultationType || 'general'
  
  let basePrompt = `You are an expert medical AI assistant helping doctors review and improve medical consultation reports.

YOUR ROLE:
- Assist doctors in correcting, completing, and improving medical reports
- Provide intelligent suggestions based on medical best practices
- Answer questions about the report content and clinical reasoning
- Help add, modify, or remove medications, lab tests, and imaging studies
- Ensure medical accuracy, safety, and completeness

CAPABILITIES:
- Modify existing prescriptions (dosage, frequency, duration)
- Add new medications with proper DCI naming and dosing
- Suggest additional lab tests or imaging based on diagnosis
- Delete inappropriate or contraindicated items
- Update narrative sections for clarity and completeness
- Provide medical reasoning for all suggestions

IMPORTANT GUIDELINES:
- ALWAYS use DCI (Dénomination Commune Internationale) for medication names
- Use UK dosing format: OD (once daily), BD (twice daily), TDS (three times daily), QDS (four times daily)
- Consider pregnancy status if applicable
- Flag potential drug interactions or contraindications
- Suggest evidence-based investigations aligned with diagnosis
- Be concise but medically thorough

🔍 CRITICAL: MEDICAL VALIDATION & ARGUMENTATION
When doctors propose changes (diagnosis, medications, tests), you MUST:
1. VALIDATE medically using clinical evidence
2. ACCEPT if proposal is sound with supporting reasoning
3. REJECT if unsafe/inappropriate with clear medical justification
4. SUGGEST ALTERNATIVES if rejecting
5. Provide clinical guidelines/evidence supporting your decision

Example dialogue:
Doctor: "Je pense que c'est une pneumonie, pas une bronchite"
You: "✅ ACCEPTÉ - Justification: Présence de fièvre >38.5°C, crépitants localisés lobe inférieur droit, leucocytose 15000. Radiographie thoracique recommandée pour confirmation."

Doctor: "Retire l'Amoxicilline"
You: "❌ REJETÉ - Justification: Patient présente pneumonie bactérienne confirmée. Arrêt prématuré risque complications et résistance. Alternative: Si allergie pénicilline → Azithromycine 500mg OD 3 jours."

📋 STRICT NOMENCLATURE COMPLIANCE FOR INVESTIGATIONS
ALL lab tests and imaging studies MUST conform to standardized nomenclature.

REJECT non-conforming names and provide standardized equivalents:
❌ "Prise de sang" → ✅ "Full Blood Count (FBC)"
❌ "Echo abdomen" → ✅ "Abdominal Ultrasound (Complete)"
❌ "Scanner cerveau" → ✅ "CT Brain (Non-contrast)"

When doctor requests test by informal name:
1. Identify standardized name from nomenclature database
2. Explain why standardization is required (billing, lab processing, reporting)
3. Provide complete test details (sample type, fasting, turnaround time)

💡 DIAGNOSIS MODIFICATION PROTOCOL
When doctor wants to change diagnosis:
1. Review current clinical data supporting current diagnosis
2. Assess new diagnosis against presenting symptoms/signs
3. Consider differential diagnoses systematically
4. Recommend additional investigations to confirm if needed
5. Assign confidence level (high/moderate/low)
6. Update treatment plan accordingly`

  // Add consultation-specific context
  if (consultationType === 'dermatology') {
    basePrompt += `

DERMATOLOGY CONSULTATION CONTEXT:
- Focus on topical and oral dermatological treatments
- Consider skin-specific investigations (biopsy, dermoscopy, patch tests)
- Ensure treatments match lesion morphology and diagnosis
- Pay attention to ABCDE criteria for suspicious lesions
- Recommend appropriate follow-up timelines for skin conditions`
  } else if (consultationType === 'chronic') {
    basePrompt += `

CHRONIC DISEASE MANAGEMENT CONTEXT:
- Focus on long-term medication management
- Consider lifestyle modifications (diet, exercise)
- Ensure regular monitoring schedules (HbA1c, BP, etc.)
- Pay attention to complications prevention
- Emphasize patient education and adherence`
  }

  // Add mode-specific instructions
  if (mode === 'correction') {
    basePrompt += `

MODE: CORRECTION ASSISTANT
- Focus on identifying and fixing errors in the report
- Check for medical inconsistencies
- Verify medication dosing and contraindications
- Ensure investigations match the diagnosis`
  } else if (mode === 'suggestion') {
    basePrompt += `

MODE: SUGGESTION ASSISTANT
- Proactively suggest improvements
- Identify missing investigations
- Recommend additional treatments if appropriate
- Highlight areas that need more detail`
  }

  return basePrompt
}

function buildContextSummary(context: ReportContext): string {
  let summary = '=== CURRENT MEDICAL REPORT STATE ===\n\n'
  
  // Patient info
  if (context.patientInfo) {
    summary += `PATIENT:\n`
    summary += `- Age: ${context.patientInfo.age || 'N/A'}\n`
    summary += `- Gender: ${context.patientInfo.gender || 'N/A'}\n`
    if (context.patientInfo.pregnancyStatus && context.patientInfo.pregnancyStatus !== 'not_applicable') {
      summary += `- ⚠️ Pregnancy Status: ${context.patientInfo.pregnancyStatus}\n`
    }
    summary += '\n'
  }

  // Diagnosis
  if (context.diagnosis) {
    summary += `DIAGNOSIS:\n`
    summary += `Primary: ${context.diagnosis.primary || 'N/A'}\n`
    if (context.diagnosis.differentials && context.diagnosis.differentials.length > 0) {
      summary += `Differentials: ${context.diagnosis.differentials.join(', ')}\n`
    }
    summary += '\n'
  }

  // Medications
  if (context.medications && context.medications.length > 0) {
    summary += `CURRENT MEDICATIONS (${context.medications.length}):\n`
    context.medications.forEach((med: any, idx: number) => {
      summary += `${idx + 1}. ${med.name || med.medication} - ${med.dosage || ''} ${med.frequency || ''} (${med.duration || 'N/A'})\n`
      if (med.indication) {
        summary += `   Indication: ${med.indication}\n`
      }
    })
    summary += '\n'
  }

  // Lab Tests
  if (context.labTests && context.labTests.length > 0) {
    summary += `LABORATORY TESTS (${context.labTests.length}):\n`
    context.labTests.forEach((test: any, idx: number) => {
      summary += `${idx + 1}. ${test.name} (${test.category || 'General'})\n`
      if (test.indication) {
        summary += `   Indication: ${test.indication}\n`
      }
    })
    summary += '\n'
  }

  // Imaging Studies
  if (context.imagingStudies && context.imagingStudies.length > 0) {
    summary += `IMAGING STUDIES (${context.imagingStudies.length}):\n`
    context.imagingStudies.forEach((img: any, idx: number) => {
      summary += `${idx + 1}. ${img.type || img.name}\n`
      if (img.indication) {
        summary += `   Indication: ${img.indication}\n`
      }
    })
    summary += '\n'
  }

  // Narrative content (if available)
  if (context.narrativeContent) {
    summary += `NARRATIVE SECTIONS:\n`
    if (context.narrativeContent.chiefComplaint) {
      summary += `- Chief Complaint: ${context.narrativeContent.chiefComplaint.substring(0, 100)}...\n`
    }
    if (context.narrativeContent.diagnosticConclusion) {
      summary += `- Diagnostic Conclusion: ${context.narrativeContent.diagnosticConclusion.substring(0, 100)}...\n`
    }
  }

  return summary
}

function processToolCall(toolCall: any, context: ReportContext): AssistantAction | null {
  try {
    const toolName = toolCall.toolName
    const args = toolCall.args

    console.log(`🔧 Processing tool call: ${toolName}`)

    switch (toolName) {
      case 'modifyItem':
        return {
          type: 'modify',
          target: args.itemType as any,
          data: {
            index: args.itemIndex,
            changes: args.changes
          },
          explanation: args.reason
        }

      case 'addItem':
        return {
          type: 'add',
          target: args.itemType as any,
          data: args.itemData,
          explanation: args.reason
        }

      case 'deleteItem':
        return {
          type: 'delete',
          target: args.itemType as any,
          data: {
            index: args.itemIndex
          },
          explanation: args.reason
        }

      case 'updateNarrative':
        return {
          type: 'modify',
          target: 'narrative',
          data: {
            section: args.section,
            content: args.newContent
          },
          explanation: args.reason
        }

      case 'provideSuggestions':
        return {
          type: 'suggest',
          data: args.suggestions,
          explanation: 'AI-generated suggestions for report improvement'
        }

      case 'validateProposal':
        return {
          type: args.validation === 'accept' ? 'modify' : 'clarify',
          target: args.proposalType.includes('diagnosis') ? 'diagnosis' : 
                 args.proposalType.includes('medication') ? 'medication' :
                 args.proposalType.includes('test') ? 'lab_test' : undefined,
          data: {
            validation: args.validation,
            reasoning: args.medicalReasoning,
            alternative: args.alternative,
            evidence: args.supportingEvidence
          },
          explanation: `${args.validation === 'accept' ? '✅ ACCEPTÉ' : args.validation === 'reject' ? '❌ REJETÉ' : '⚠️ ACCEPTÉ AVEC MODIFICATIONS'}: ${args.medicalReasoning}`
        }

      case 'modifyDiagnosis':
        return {
          type: 'modify',
          target: 'diagnosis',
          data: {
            current: args.currentDiagnosis,
            proposed: args.proposedDiagnosis,
            justification: args.clinicalJustification,
            differentials: args.differentialConsiderations,
            confidence: args.confidence,
            additionalTests: args.additionalInvestigations
          },
          explanation: `Modification diagnostique: ${args.currentDiagnosis} → ${args.proposedDiagnosis}\n\nJustification: ${args.clinicalJustification}\n\nConfiance: ${args.confidence}`
        }

      case 'validateNomenclature':
        // Validate against actual nomenclature database
        const validation = args.testType === 'lab_test' ? 
          validateLabTest(args.testName) : 
          validateImagingStudy(args.testName)
        
        return {
          type: args.conforms ? 'clarify' : 'modify',
          target: args.testType as any,
          data: {
            originalName: args.testName,
            standardizedName: args.standardizedName || validation.standardized?.name,
            conforms: validation.valid,
            reasoning: args.reasoning,
            nomenclatureDetails: validation.standardized
          },
          explanation: validation.valid ? 
            `✅ CONFORME: "${args.testName}" est conforme à la nomenclature\n\n${args.reasoning}` :
            `⚠️ NON-CONFORME: "${args.testName}"\n\nNom standardisé requis: "${args.standardizedName || validation.suggestion}"\n\n${args.reasoning}`
        }

      default:
        console.log(`⚠️ Unknown tool: ${toolName}`)
        return null
    }
  } catch (error) {
    console.error('❌ Error processing tool call:', error)
    return null
  }
}

function generateConversationId(): string {
  return `ASSIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
