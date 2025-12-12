// app/api/chronic-examens/route.ts - Chronic Disease Laboratory and Paraclinical Exam Orders API
// Generates exam orders for chronic disease monitoring (HbA1c, lipids, ECG, fundus exam, etc.)
// VERSION 2.0: Streaming SSE to avoid Vercel Hobby 10s timeout
import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const preferredRegion = 'auto'
export const maxDuration = 60 // Extended for Pro plans (Hobby uses streaming)

export async function POST(req: NextRequest) {
  try {
    const { patientData, clinicalData, diagnosisData, reportData } = await req.json()

    // Get current date for exam orders
    const orderDate = new Date()
    const orderId = `EXM-CHR-${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    const systemPrompt = `You are a SENIOR ENDOCRINOLOGIST ordering laboratory tests and paraclinical examinations for chronic disease monitoring.

You MUST generate COMPREHENSIVE EXAM ORDERS for chronic disease follow-up based on the diagnosis data provided.

CRITICAL REQUIREMENTS:

1. LABORATORY TESTS (BIOLOGICAL EXAMS):
   For DIABETES:
   - HbA1c (Hémoglobine glyquée) - MANDATORY every 3 months
   - Glycémie à jeun - Baseline assessment
   - Bilan lipidique complet (CT, HDL, LDL, TG) - Every 6 months
   - Créatininémie + DFG (fonction rénale) - Every 6-12 months
   - Microalbuminurie - Annual (nephropathy screening)
   - ASAT, ALAT (fonction hépatique) - If on medications
   - TSH - Annual if type 1 diabetes
   
   For HYPERTENSION:
   - Ionogramme sanguin (Na, K, Cl) - Baseline and monitoring
   - Créatininémie + DFG - Monitoring renal function
   - Bilan lipidique - CV risk assessment
   - Glycémie à jeun - Diabetes screening
   
   For OBESITY/DYSLIPIDEMIA:
   - Bilan lipidique complet - Monitoring
   - Glycémie à jeun + HbA1c - Diabetes screening
   - Bilan hépatique (ASAT, ALAT, GGT) - NASH screening
   - TSH - Thyroid function if weight gain
   
   For CV PROTECTION:
   - Troponine - If chest pain/CV symptoms
   - BNP/NT-proBNP - If heart failure suspected

2. PARACLINICAL EXAMS (IMAGING & SPECIAL TESTS):
   For DIABETES:
   - Fond d'œil (Fundus examination) - MANDATORY annual (retinopathy screening)
   - ECG - Annual (cardiovascular screening)
   - Examen des pieds - Every consultation (neuropathy/arteriopathy)
   - Écho-Doppler artères MI - If arteriopathy suspected
   - Test monofilament - Neuropathy screening
   
   For HYPERTENSION:
   - ECG - Baseline and annual (LVH screening)
   - Échocardiographie - If uncontrolled or LVH suspected
   - Holter tensionnel 24h - If white coat or masked HTN suspected
   - Écho-Doppler TSA - If carotid bruit or high CV risk
   - Mesure de l'index de pression systolique cheville/bras - Arteriopathy screening
   
   For OBESITY:
   - Échographie abdominale - NASH/steatosis screening
   - Test d'effort - CV fitness if starting exercise program
   
   For COMPLICATIONS:
   - EMG - If neuropathy symptoms
   - IRM cérébrale - If neurological symptoms
   - Scintigraphie myocardique - If ischemia suspected

3. EXAM ORDER FORMAT:
   Each exam must include:
   - Test/exam name (English medical terminology - Anglo-Saxon standards)
   - Category (BIOLOGIE, IMAGERIE, EXPLORATION FONCTIONNELLE, CONSULTATION SPÉCIALISÉE)
   - Clinical indication (why ordered)
   - Urgency (URGENT, SEMI-URGENT, ROUTINE)
   - Timing (when to perform: IMMÉDIAT, DANS 1 MOIS, DANS 3 MOIS, etc.)
   - Frequency (how often: TOUS LES 3 MOIS, ANNUEL, etc.)
   - Fasting requirement (À JEUN, NON À JEUN)
   - Special instructions
   - Expected results / targets
   - Follow-up plan based on results

4. EXAM SELECTION LOGIC:
   - Based on chronic diseases present
   - Based on disease control status
   - Based on complications screening needs
   - Based on medication monitoring needs
   - Based on follow-up schedule from diagnosis
   - Consider patient's last exam dates if available

5. MAURITIUS HEALTHCARE CONTEXT:
   - Use English medical terminology (Anglo-Saxon standards)
   - Follow Mauritius lab standards
   - Include local lab reference values
   - Consider local availability of exams

Return ONLY valid JSON with this EXACT structure:
{
  "success": true,
  "examOrders": {
    "orderHeader": {
      "orderId": "unique ID",
      "orderType": "CHRONIC DISEASE MONITORING",
      "orderDate": "date",
      "orderTime": "time",
      "prescriber": {
        "name": "doctor name",
        "specialty": "Endocrinology / Internal Medicine",
        "medicalCouncilNumber": "MCM registration"
      },
      "patient": {
        "lastName": "last name",
        "firstName": "first name",
        "age": age,
        "chronicDiseases": ["list of chronic diseases"]
      },
      "clinicalContext": "brief clinical context for labs"
    },
    "laboratoryTests": [
      {
        "lineNumber": 1,
        "category": "BIOCHIMIE|HÉMATOLOGIE|IMMUNOLOGIE|MICROBIOLOGIE",
        "testName": "test name in English",
        "testCode": "lab code if applicable",
        "clinicalIndication": "why this test is ordered",
        "urgency": "URGENT|SEMI-URGENT|ROUTINE",
        "timing": {
          "when": "when to perform",
          "frequency": "how often (tous les 3 mois, annuel, etc.)",
          "nextDueDate": "estimated date if known"
        },
        "preparation": {
          "fasting": true|false,
          "fastingDuration": "duration if fasting required",
          "medicationInstructions": "medication instructions if any",
          "otherInstructions": "other preparation instructions"
        },
        "expectedResults": {
          "normalRange": "normal reference range",
          "targetForPatient": "specific target for this patient",
          "interpretationGuidance": "how to interpret results"
        },
        "monitoringPurpose": {
          "diseaseMonitoring": "which disease",
          "medicationMonitoring": "which medication if applicable",
          "complicationScreening": "which complication if applicable"
        },
        "followUpActions": {
          "ifNormal": "action if normal",
          "ifAbnormal": "action if abnormal",
          "alertCriteria": "when to alert doctor immediately"
        }
      }
    ],
    "paraclinicalExams": [
      {
        "lineNumber": 1,
        "category": "IMAGERIE|EXPLORATION FONCTIONNELLE|CONSULTATION SPÉCIALISÉE",
        "examName": "exam name in English",
        "examType": "specific type",
        "clinicalIndication": "why this exam is ordered",
        "urgency": "URGENT|SEMI-URGENT|ROUTINE",
        "timing": {
          "when": "when to perform",
          "frequency": "how often",
          "nextDueDate": "estimated date if known"
        },
        "preparation": {
          "fastingRequired": true|false,
          "medicationAdjustments": "medication adjustments if needed",
          "contrastAllergy": "check contrast allergy if applicable",
          "otherPreparation": "other preparation instructions"
        },
        "technicalSpecifications": {
          "specificProtocol": "specific protocol if needed",
          "views": "specific views to obtain",
          "measurements": "specific measurements needed"
        },
        "expectedFindings": {
          "normalFindings": "what normal looks like",
          "concerningFindings": "what to look for",
          "reportingRequirements": "what should be in report"
        },
        "followUpActions": {
          "ifNormal": "action if normal",
          "ifAbnormal": "action if abnormal",
          "alertCriteria": "when to alert doctor immediately"
        }
      }
    ],
    "specialistReferrals": [
      {
        "specialty": "specialty name",
        "consultationType": "INITIAL|FOLLOW-UP|URGENT",
        "indication": "clinical indication for referral",
        "urgency": "URGENT|SEMI-URGENT|ROUTINE",
        "timing": "when to schedule",
        "frequency": "how often",
        "specificQuestions": "specific questions for specialist",
        "informationToProvide": "information to provide to specialist"
      }
    ],
    "examSummary": {
      "totalLabTests": number,
      "totalParaclinicalExams": number,
      "totalSpecialistReferrals": number,
      "byUrgency": {
        "urgent": number,
        "semiUrgent": number,
        "routine": number
      },
      "byPurpose": {
        "diseaseMonitoring": number,
        "complicationScreening": number,
        "medicationMonitoring": number,
        "cardiovascularRisk": number
      },
      "estimatedCost": "estimated total cost if known",
      "timelineOverview": "overview of when exams should be done"
    },
    "monitoringPlan": {
      "immediate": ["exams to do immediately"],
      "oneMonth": ["exams within 1 month"],
      "threeMonths": ["exams within 3 months"],
      "sixMonths": ["exams within 6 months"],
      "annual": ["annual exams"]
    },
    "laboratoryNotes": {
      "specimenCollection": "specimen collection instructions",
      "transportRequirements": "transport requirements if any",
      "resultReporting": "how results should be reported",
      "criticalValueAlerts": "critical values requiring immediate alert"
    },
    "orderValidation": {
      "appropriateTests": "tests appropriate for diagnoses",
      "noRedundantTests": "no unnecessary redundancy",
      "timingAppropriate": "timing appropriate for monitoring",
      "safetyChecked": "safety considerations reviewed",
      "costEffective": "cost-effectiveness considered",
      "validationScore": number_0_to_100
    }
  }
}

IMPORTANT:
1. Base exam selection on diagnosis data (diseaseAssessment, followUpPlan)
2. Include ALL essential exams for each chronic disease
3. Prioritize by urgency and clinical importance
4. Consider last exam dates to avoid redundancy
5. Include both monitoring exams and complication screening
6. Provide specific timing for each exam
7. Include preparation instructions (fasting, medication adjustments)
8. Specify what to look for in results
9. Define follow-up actions based on results
10. Use English medical terminology with Anglo-Saxon standards`

    // Calculate BMI for clinical context
    const weight = parseFloat(patientData.weight)
    const heightInMeters = parseFloat(patientData.height) / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    const patientContext = `
EXAM ORDER DATE: ${orderDate.toLocaleDateString('fr-MU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
TIME: ${orderDate.toLocaleTimeString('fr-MU', { hour: '2-digit', minute: '2-digit' })}
ORDER ID: ${orderId}

PATIENT INFORMATION:
- Full Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Date of Birth: ${patientData.birthDate || patientData.dateOfBirth || 'Not provided'}
- Weight: ${weight} kg
- Height: ${patientData.height} cm
- BMI: ${bmi.toFixed(1)} kg/m² (${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese'})
- Address: ${patientData.address || 'Not provided'}, ${patientData.city || ''} ${patientData.country || ''}
- Phone: ${patientData.phone || 'Not provided'}

GYNECOLOGICAL STATUS (if female):
${patientData.gender?.toLowerCase() === 'female' || patientData.gender?.toLowerCase() === 'femme' ? `
- Pregnancy Status: ${patientData.pregnancyStatus || 'Not specified'}
- Last Menstrual Period: ${patientData.lastMenstrualPeriod || 'Not specified'}
- Gestational Age: ${patientData.gestationalAge || 'Not applicable'}
` : '- Not applicable (male patient)'}

CHRONIC DISEASES & MEDICAL HISTORY (REQUIRE MONITORING):
${(patientData.medicalHistory || []).map((d: string, i: number) => `${i + 1}. ${d}`).join('\n') || '- None declared'}
${patientData.otherMedicalHistory ? `\nAdditional Medical History: ${patientData.otherMedicalHistory}` : ''}

CURRENT MEDICATIONS (may require monitoring):
${patientData.currentMedicationsText || patientData.currentMedications || 'None reported'}

ALLERGIES (important for contrast agents, etc.):
${Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : (patientData.allergies || 'No known allergies')}
${patientData.otherAllergies ? `\nOther Allergies: ${patientData.otherAllergies}` : ''}

LIFESTYLE HABITS (context for exam interpretation):
- Smoking: ${patientData.lifeHabits?.smoking || 'Not specified'}
- Alcohol Consumption: ${patientData.lifeHabits?.alcohol || 'Not specified'}
- Physical Activity: ${patientData.lifeHabits?.physicalActivity || 'Not specified'}

CURRENT CLINICAL EXAMINATION DATA:
${clinicalData ? `
- Chief Complaint: ${clinicalData.chiefComplaint || 'Not specified'}
- Current Blood Pressure: ${clinicalData.vitalSigns?.bloodPressureSystolic || 'Not measured'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || 'Not measured'} mmHg
- Current Blood Glucose: ${clinicalData.vitalSigns?.bloodGlucose || 'Not measured'} g/L
- Heart Rate: ${clinicalData.vitalSigns?.heartRate || 'Not measured'} bpm
- Last HbA1c: ${clinicalData.chronicDiseaseSpecific?.lastHbA1c || 'Not available'} (Date: ${clinicalData.chronicDiseaseSpecific?.lastHbA1cDate || 'N/A'})
- Last Lipid Panel: ${clinicalData.chronicDiseaseSpecific?.lastLipidPanel || 'Not available'} (Date: ${clinicalData.chronicDiseaseSpecific?.lastLipidPanelDate || 'N/A'})
- Last Follow-up: ${clinicalData.chronicDiseaseSpecific?.lastFollowUp || 'Not available'}
- Complications Present:
  * Vision Changes: ${clinicalData.chronicDiseaseSpecific?.complications?.visionChanges || 'None'}
  * Foot Problems: ${clinicalData.chronicDiseaseSpecific?.complications?.footProblems || 'None'}
  * Chest Pain: ${clinicalData.chronicDiseaseSpecific?.complications?.chestPain || 'None'}
  * Shortness of Breath: ${clinicalData.chronicDiseaseSpecific?.complications?.shortnessOfBreath || 'None'}
` : 'Clinical data not available'}

DIAGNOSIS DATA (BASIS FOR EXAM ORDERS):
${JSON.stringify(diagnosisData, null, 2)}

FOLLOW-UP PLAN FROM DIAGNOSIS:
${diagnosisData.followUpPlan ? JSON.stringify(diagnosisData.followUpPlan, null, 2) : 'Not provided'}

MONITORING REQUIREMENTS FROM REPORT:
${reportData?.structuredData?.monitoring ? JSON.stringify(reportData.structuredData.monitoring, null, 2) : 'Not yet generated'}

DOCTOR INFORMATION:
- Name: Dr. ${patientData.doctorName || 'TIBOKai DOCTOR'}
- Specialty: Endocrinology / Internal Medicine
- MCM Number: ${patientData.doctorMCM || 'MCM-XXXXXXXXX'}

EXAM ORDER INSTRUCTIONS:
1. Review the diagnosis data carefully
2. Identify all chronic diseases present (diabetes, hypertension, obesity, dyslipidemia)
3. For each disease, order appropriate monitoring exams:
   
   DIABETES:
   - HbA1c (MANDATORY every 3 months)
   - Glycémie à jeun
   - Bilan lipidique (every 6 months)
   - Créatininémie + DFG (every 6-12 months)
   - Microalbuminurie (annual)
   - Fond d'œil (MANDATORY annual)
   - ECG (annual)
   
   HYPERTENSION:
   - Ionogramme
   - Créatininémie + DFG
   - ECG (annual)
   - Échocardiographie (if uncontrolled)
   
   OBESITY/DYSLIPIDEMIA:
   - Bilan lipidique
   - Glycémie + HbA1c
   - Bilan hépatique
   
4. Categorize exams by urgency:
   - URGENT: If patient has concerning symptoms
   - SEMI-URGENT: If disease poorly controlled
   - ROUTINE: Regular monitoring schedule
   
5. Specify timing:
   - IMMÉDIAT: Critical exams
   - DANS 1 MOIS: Important follow-up
   - DANS 3 MOIS: HbA1c and quarterly monitoring
   - DANS 6 MOIS: Lipids and semi-annual monitoring
   - ANNUEL: Fundus exam, ECG, comprehensive check
   
6. Include fasting requirements:
   - À JEUN: Glycémie, bilan lipidique, bilan hépatique
   - NON À JEUN: HbA1c, créatininémie, ECG, fond d'œil
   
7. Specify target values:
   - HbA1c: < 7% (or patient-specific)
   - LDL cholesterol: < 1.0 g/L (if diabetes)
   - DFG: > 60 mL/min/1.73m²
   
8. Define follow-up actions based on results
   
9. Include specialist referrals if needed:
   - Ophtalmologue (fundus exam)
   - Cardiologue (if complications)
   - Néphrologue (if renal impairment)
   - Podologue (foot exam)
   
10. Write in ENGLISH with Anglo-Saxon medical standards
11. Generate COMPLETE JSON with ALL required fields

Generate the comprehensive chronic disease exam orders now.`

    // ========== STREAMING SSE IMPLEMENTATION ==========
    const encoder = new TextEncoder()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (event: string, data: any) => {
          try {
            const jsonData = JSON.stringify(data)
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${jsonData}\n\n`))
            console.log(`📤 SSE sent: ${event} (${jsonData.length} bytes)`)
          } catch (err: any) {
            console.error(`❌ Failed to send SSE event ${event}:`, err.message)
            // Send a simplified error if JSON stringify fails
            controller.enqueue(encoder.encode(`event: error\ndata: {"error":"Failed to serialize ${event} event","details":"${err.message}"}\n\n`))
          }
        }

        try {
          sendSSE('progress', { message: 'Generating exam orders...', progress: 10 })

          // Call OpenAI with streaming
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: patientContext }
              ],
              temperature: 0.2,
              max_tokens: 6000, // Increased to prevent truncated JSON response
              response_format: { type: "json_object" },
              stream: true
            }),
          })

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
          }

          if (!response.body) {
            throw new Error('No response body from OpenAI')
          }

          sendSSE('progress', { message: 'Processing exam data...', progress: 30 })

          // Process the stream
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let fullContent = ''
          let chunkCount = 0

          let buffer = ''
          let streamError: Error | null = null
          let lastProgressTime = Date.now()
          const MAX_STREAM_DURATION = 55000 // 55 seconds max (before Vercel 60s limit)

          // Keep-alive interval to prevent connection timeout
          const keepAliveInterval = setInterval(() => {
            try {
              sendSSE('heartbeat', { timestamp: Date.now() })
              console.log('💓 Heartbeat sent')
            } catch (e) {
              console.error('❌ Heartbeat failed:', e)
            }
          }, 5000) // Send heartbeat every 5 seconds

          // Timeout protection
          const timeoutCheck = setInterval(() => {
            const elapsed = Date.now() - lastProgressTime
            if (elapsed > 30000) { // 30 seconds without OpenAI data
              console.error('⏰ OpenAI stream timeout - no data for 30s')
              streamError = new Error('OpenAI stream timeout - no data received for 30 seconds')
            }
            if (Date.now() - lastProgressTime > MAX_STREAM_DURATION) {
              console.error('⏰ Max stream duration exceeded')
              streamError = new Error('Maximum stream duration exceeded (55s)')
            }
          }, 5000)

          try {
            while (true) {
              if (streamError) {
                console.error('🛑 Breaking loop due to error:', streamError.message)
                break
              }

              const { done, value } = await reader.read()
              if (done) {
                // Flush any remaining data in decoder
                const remaining = decoder.decode()
                if (remaining) buffer += remaining
                console.log('✅ OpenAI reader done signal received')
                break
              }

              lastProgressTime = Date.now()
              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk
              const lines = buffer.split('\n')
              buffer = lines.pop() || '' // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    console.log('✅ Received [DONE] from OpenAI')
                    continue
                  }

                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content
                    if (content) {
                      fullContent += content
                      chunkCount++

                      if (chunkCount % 10 === 0) {
                        const progress = Math.min(85, 30 + Math.floor(chunkCount / 2))
                        sendSSE('progress', { message: `Generating lab tests... ${progress}%`, progress })
                      }
                    }
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            }
          } catch (readError: any) {
            console.error('❌ Error reading OpenAI stream:', readError.message)
            streamError = readError
          } finally {
            clearInterval(keepAliveInterval)
            clearInterval(timeoutCheck)
          }

          if (streamError) {
            throw new Error(`OpenAI stream error: ${streamError.message}`)
          }

          // Process any remaining data in the buffer
          if (buffer.trim()) {
            const remainingLines = buffer.split('\n')
            for (const line of remainingLines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullContent += content
                    chunkCount++
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }

          console.log('📊 OpenAI stream completed:', chunkCount, 'chunks,', fullContent.length, 'chars')
          sendSSE('progress', { message: 'Validating exam orders...', progress: 90 })

          // Parse JSON response
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            console.error('No JSON found in response. Content length:', fullContent.length)
            console.error('Content preview:', fullContent.substring(0, 500))
            throw new Error('No valid JSON found in AI response')
          }

          console.log('📋 JSON matched, length:', jsonMatch[0].length, 'chars')

          // Robust JSON cleanup function to fix control characters in strings
          const cleanJsonString = (jsonStr: string): string => {
            let result = ''
            let inString = false
            let escaped = false

            for (let i = 0; i < jsonStr.length; i++) {
              const char = jsonStr[i]
              const charCode = jsonStr.charCodeAt(i)

              if (escaped) {
                result += char
                escaped = false
                continue
              }

              if (char === '\\' && inString) {
                escaped = true
                result += char
                continue
              }

              if (char === '"' && !escaped) {
                inString = !inString
                result += char
                continue
              }

              // If inside a string and hit a control character, escape it
              if (inString && charCode < 32) {
                if (charCode === 10) result += '\\n'
                else if (charCode === 13) result += '\\r'
                else if (charCode === 9) result += '\\t'
                else result += `\\u${charCode.toString(16).padStart(4, '0')}`
                continue
              }

              result += char
            }

            return result
          }

          const cleanedJson = cleanJsonString(jsonMatch[0])

          let examOrdersData
          try {
            examOrdersData = JSON.parse(cleanedJson)
          } catch (parseError: any) {
            console.error('❌ JSON parse error (attempt 1):', parseError.message)
            const errorPosition = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0')
            console.error('Character at error position:', cleanedJson.charAt(errorPosition), '(code:', cleanedJson.charCodeAt(errorPosition), ')')
            console.error('Content around error:', cleanedJson.substring(Math.max(0, errorPosition - 50), errorPosition + 50))

            // Attempt 2: More aggressive cleanup
            console.log('🔄 Attempting more aggressive JSON repair...')
            try {
              const startIdx = cleanedJson.indexOf('{')
              const endIdx = cleanedJson.lastIndexOf('}')
              let repairedJson = cleanedJson.substring(startIdx, endIdx + 1)

              // Fix common issues
              repairedJson = repairedJson.replace(/[""]/g, '"').replace(/['']/g, "'")
              repairedJson = repairedJson.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1')
              repairedJson = repairedJson.replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
              repairedJson = repairedJson.replace(/,(\s*[}\]])/g, '$1')

              examOrdersData = JSON.parse(repairedJson)
              console.log('✅ JSON repair successful on attempt 2')
            } catch (repairError: any) {
              console.error('❌ JSON repair attempt 2 failed:', repairError.message)
              console.error('Content (first 500 chars):', cleanedJson.substring(0, 500))
              throw new Error(`JSON parse error: ${parseError.message}`)
            }
          }

          console.log('✅ JSON parsed successfully')

          // Handle multiple possible structures from OpenAI
          let finalExamOrders = examOrdersData.examOrders || examOrdersData

          // Log the structure we received
          console.log('📋 Received data structure:', {
            topLevelKeys: Object.keys(examOrdersData),
            hasExamOrdersWrapper: !!examOrdersData.examOrders,
            finalKeys: Object.keys(finalExamOrders)
          })

          // Try to find lab tests and paraclinical exams in various possible locations
          let labTests = finalExamOrders.laboratoryTests ||
                         finalExamOrders.laboratory_tests ||
                         finalExamOrders.labTests ||
                         finalExamOrders.lab_tests ||
                         []

          let paraclinicalExams = finalExamOrders.paraclinicalExams ||
                                  finalExamOrders.paraclinical_exams ||
                                  finalExamOrders.imaging ||
                                  finalExamOrders.imagingExams ||
                                  []

          // Normalize arrays
          if (!Array.isArray(labTests)) labTests = []
          if (!Array.isArray(paraclinicalExams)) paraclinicalExams = []

          console.log('🔍 Validation:', {
            labTestsCount: labTests.length,
            paraclinicalCount: paraclinicalExams.length,
            allKeys: Object.keys(finalExamOrders)
          })

          // Normalize the structure
          finalExamOrders = {
            ...finalExamOrders,
            laboratoryTests: labTests,
            paraclinicalExams: paraclinicalExams
          }

          // Warn if empty but don't fail - some patients might not need tests
          if (labTests.length === 0 && paraclinicalExams.length === 0) {
            console.warn('⚠️ No lab tests or paraclinical exams found - proceeding anyway')
          }

          sendSSE('progress', { message: 'Finalizing...', progress: 95 })

          // Build complete result
          const completeResult = {
            success: true,
            examOrders: finalExamOrders,
            orderId: orderId,
            generatedAt: orderDate.toISOString()
          }

          console.log('📦 Sending complete event...')

          // Send complete result
          sendSSE('complete', completeResult)

          console.log('✅ Complete event sent successfully')

          sendSSE('progress', { message: 'Complete!', progress: 100 })

        } catch (error: any) {
          console.error('Streaming error:', error)
          console.error('Error stack:', error.stack)
          try {
            sendSSE('error', { error: 'Failed to generate exam orders', details: error.message })
          } catch (sendError: any) {
            console.error('Failed to send error event:', sendError.message)
          }
        } finally {
          try {
            controller.close()
          } catch (closeError: any) {
            console.error('Failed to close controller:', closeError.message)
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error("Chronic Examens API Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate chronic disease exam orders",
        details: error.message
      },
      { status: 500 }
    )
  }
}
