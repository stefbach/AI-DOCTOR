// app/api/medical-report-assistant/route.ts - AI Assistant for Medical Report Editing
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

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

    // Call GPT-4 with function calling for structured actions
    const result = await generateText({
      model: openai("gpt-4o"),
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
- Be concise but medically thorough`

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
