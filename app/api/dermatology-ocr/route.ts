// app/api/dermatology-ocr/route.ts
// VERSION 2.0: Enhanced with structured JSON, clinical scoring, image quality validation, and retry mechanism
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates image quality assessment
 */
function validateImageQuality(analysis: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!analysis.imageQualityAssessment) {
    issues.push('Missing image quality assessment')
    return { isValid: false, issues }
  }
  
  const quality = analysis.imageQualityAssessment
  
  if (!quality.overallQuality) {
    issues.push('Missing overall image quality rating')
  }
  
  if (quality.overallQuality === 'Poor') {
    issues.push('Image quality is poor - may affect diagnostic accuracy')
  }
  
  if (!quality.focus) {
    issues.push('Missing focus assessment')
  }
  
  if (!quality.lighting) {
    issues.push('Missing lighting assessment')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Validates dermatology-specific observations
 */
function validateDermatologyObservations(analysis: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Visual observations validation
  if (!analysis.visualObservations) {
    issues.push('Missing visual observations')
    return { isValid: false, issues }
  }
  
  const visual = analysis.visualObservations
  
  if (!visual.primaryMorphology) {
    issues.push('Missing primary lesion morphology (Macule/Papule/Plaque/Vesicle/etc.)')
  }
  
  if (!visual.color || visual.color.length < 5) {
    issues.push('Missing or incomplete color description')
  }
  
  if (!visual.distribution) {
    issues.push('Missing distribution pattern')
  }
  
  // Location analysis validation
  if (!analysis.locationAnalysis?.primarySite) {
    issues.push('Missing primary anatomical site')
  }
  
  // Differential diagnoses validation
  if (!analysis.differentialDiagnoses || !Array.isArray(analysis.differentialDiagnoses)) {
    issues.push('Missing differential diagnoses array')
  } else if (analysis.differentialDiagnoses.length < 2) {
    issues.push(`Only ${analysis.differentialDiagnoses.length} differential diagnosis - minimum 2 required`)
  }
  
  // Urgency assessment validation
  if (!analysis.urgencyAssessment?.level) {
    issues.push('Missing urgency level assessment')
  }
  
  if (!analysis.urgencyAssessment?.timeframe) {
    issues.push('Missing recommended timeframe for evaluation')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Validates clinical scoring completeness
 */
function validateClinicalScoring(analysis: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check if melanoma concern is assessed
  if (analysis.clinicalScoring?.melanomaConcern) {
    const melanoma = analysis.clinicalScoring.melanomaConcern
    
    if (!melanoma.abcdeScore) {
      issues.push('Melanoma concern present but missing ABCDE score')
    }
    
    if (!melanoma.riskLevel) {
      issues.push('Melanoma concern present but missing risk level')
    }
    
    if (melanoma.urgentEvaluation === undefined) {
      issues.push('Melanoma concern present but missing urgent evaluation flag')
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Calls OpenAI Vision API with retry mechanism and quality validation
 */
async function callOpenAIVisionWithRetry(
  openai: OpenAI,
  images: any[],
  patientData: any,
  additionalNotes: string,
  maxRetries: number = 2
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 OpenAI Vision call attempt ${attempt + 1}/${maxRetries + 1}`)
      
      // Prepare image messages
      const imageMessages: any[] = images.map((img: any) => ({
        type: "image_url",
        image_url: {
          url: img.dataUrl,
          detail: "high"
        }
      }))
      
      // Create base prompt
      let analysisPrompt = `You are an expert dermatologist with advanced training in skin condition analysis and dermoscopy.

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age}
- Gender: ${patientData.gender}
${additionalNotes ? `\nCLINICAL NOTES:\n${additionalNotes}` : ''}

Analyze the provided skin condition image(s) in comprehensive detail.`
      
      // Enhance prompt on retries
      if (attempt === 1) {
        analysisPrompt += `

🚨 PREVIOUS RESPONSE HAD QUALITY ISSUES - ENHANCED REQUIREMENTS:

CRITICAL REQUIREMENTS:
- MUST assess image quality (focus, lighting, angle, scale)
- MUST classify primary lesion morphology (Macule/Papule/Plaque/Vesicle/Pustule/Nodule/Tumor)
- MUST provide minimum 2 differential diagnoses with likelihood percentages
- MUST assess urgency level (Emergency/Urgent/Routine)
- MUST evaluate melanoma concern with ABCDE criteria if any pigmented lesion
- ALL descriptions must be detailed and specific (minimum 20 characters)

Provide complete, structured dermatological analysis meeting professional standards.`
      } else if (attempt >= 2) {
        analysisPrompt += `

🆘 MAXIMUM QUALITY MODE - FINAL ATTEMPT:

ABSOLUTE REQUIREMENTS:
1. IMAGE QUALITY: Assess focus, lighting, scale, angle - be specific
2. MORPHOLOGY: Use standard dermatology terms (Macule, Papule, Plaque, Vesicle, Pustule, Nodule, Tumor, Ulcer)
3. LOCATION: Specify exact anatomical site and distribution pattern
4. ABCDE SCORING: For ANY pigmented lesion, evaluate Asymmetry, Border, Color, Diameter, Evolution
5. DIFFERENTIAL DIAGNOSES: Minimum 2, with likelihood %, supporting features, distinguishing features
6. URGENCY: Emergency (immediate), Urgent (24-48h), or Routine - be decisive
7. RED FLAGS: List specific warning signs requiring immediate attention

This is professional dermatology documentation - quality must be EXCELLENT.`
      }
      
      analysisPrompt += `

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanations):
{
  "imageQualityAssessment": {
    "overallQuality": "Excellent|Good|Fair|Poor",
    "focus": "Sharp|Slightly blurred|Blurred",
    "lighting": "Good|Overexposed|Underexposed|Mixed",
    "scale": "Reference present|Size estimable|No scale reference",
    "angle": "Optimal perpendicular|Slightly angled|Suboptimal",
    "diagnosticQuality": "Sufficient for diagnosis|Limited diagnostic value|Repeat imaging recommended",
    "recommendations": "Recommendations for better images if needed"
  },
  
  "visualObservations": {
    "primaryMorphology": "Macule|Papule|Plaque|Vesicle|Pustule|Nodule|Tumor|Patch|Wheal|Ulcer|Cyst",
    "secondaryMorphology": ["Scale", "Crust", "Excoriation", "Lichenification", "Atrophy", "Fissure"],
    "color": "Detailed color description (e.g., Erythematous, Hyperpigmented, Violaceous)",
    "size": "Size description with measurements if visible (e.g., 2-5mm individual lesions, 10cm plaque)",
    "shape": "Round|Oval|Irregular|Linear|Annular|Serpiginous|Polygonal",
    "border": "Well-demarcated|Ill-defined|Raised|Flat|Scalloped",
    "texture": "Smooth|Rough|Scaly|Verrucous|Lichenified|Atrophic",
    "distribution": "Localized|Regional|Generalized|Symmetric|Asymmetric|Grouped|Scattered",
    "arrangement": "Discrete|Confluent|Linear|Annular|Herpetiform|Zosteriform",
    "surfaceChanges": "Description of surface characteristics"
  },
  
  "locationAnalysis": {
    "primarySite": "Face|Scalp|Neck|Trunk|Upper extremities|Lower extremities|Hands|Feet|Genitalia|Mucosa",
    "specificAreas": ["Detailed anatomical locations"],
    "pattern": "Photoexposed areas|Pressure points|Flexural|Extensor|Follicular|Dermatomal|Blaschkoid|None apparent",
    "laterality": "Bilateral symmetric|Bilateral asymmetric|Unilateral|Midline"
  },
  
  "clinicalScoring": {
    "melanomaConcern": {
      "applicable": true/false,
      "abcdeScore": {
        "asymmetry": "Symmetric|Asymmetric",
        "borderIrregularity": "Regular borders|Irregular/notched borders",
        "colorVariegation": "Uniform color|Multiple colors (specify)",
        "diameter": "Size in mm",
        "evolution": "Stable|Changing (specify how)"
      },
      "riskLevel": "High|Moderate|Low",
      "urgentEvaluation": true/false,
      "dermoscopyRecommended": true/false
    },
    "inflammationSeverity": "None|Mild|Moderate|Severe",
    "infectionSigns": "None|Possible|Probable (specify signs)"
  },
  
  "differentialDiagnoses": [
    {
      "diagnosis": "Specific condition name",
      "likelihood": 60,
      "supportingFeatures": ["Feature 1 that supports this diagnosis", "Feature 2", "Feature 3"],
      "distinguishingFeatures": "Key features to confirm or exclude this diagnosis",
      "nextSteps": "Investigations or criteria to confirm"
    },
    {
      "diagnosis": "Alternative diagnosis",
      "likelihood": 25,
      "supportingFeatures": ["Supporting feature 1", "Supporting feature 2"],
      "distinguishingFeatures": "How to differentiate from primary",
      "nextSteps": "Confirmation steps"
    }
  ],
  
  "urgencyAssessment": {
    "level": "Emergency|Urgent|Semi-urgent|Routine",
    "timeframe": "Immediate|Within 24 hours|Within 48-72 hours|Within 1-2 weeks|Routine follow-up",
    "rationale": "Explanation for urgency level",
    "redFlags": ["Specific warning sign 1", "Specific warning sign 2"],
    "concerningFeatures": ["Feature requiring closer attention"]
  },
  
  "recommendedActions": {
    "immediateSteps": ["Action 1", "Action 2"],
    "additionalImages": ["Type of image needed (e.g., Close-up, Different angle, Dermoscopy, Under Wood's lamp)"],
    "clinicalInformation": ["Duration of lesion", "Associated symptoms", "Prior treatments", "Family history", "Other relevant history"],
    "investigations": ["Dermoscopy", "Biopsy (punch/shave/excisional)", "Patch testing", "Fungal culture", "Bacterial culture", "Blood tests if systemic"],
    "specialistReferral": "Dermatology|Dermatopathology|Plastic surgery|None needed at this stage"
  },
  
  "clinicalCorrelation": {
    "symptomsToAsk": ["Symptom 1 to inquire about", "Symptom 2"],
    "historyPoints": ["Important history element 1", "Important history element 2"],
    "physicalExamFindings": ["What to look for on physical exam"],
    "differentiatingTests": ["Tests that would help differentiate between top diagnoses"]
  },
  
  "educationalNotes": {
    "keyFindings": "Summary of most important visual findings",
    "diagnosticApproach": "Systematic approach to these findings",
    "learningPoints": ["Teaching point 1", "Teaching point 2"]
  }
}

⚠️ CRITICAL VALIDATION REQUIREMENTS:
- Image quality assessment MUST be complete with all fields
- Primary morphology MUST be specified using standard dermatology terminology
- MINIMUM 2 differential diagnoses with likelihood percentages
- Urgency level and timeframe MUST be specified
- If ANY pigmented lesion visible: MUST include melanoma ABCDE assessment
- All descriptions minimum 20 characters (be detailed, not vague)
- Red flags MUST be identified if present

GENERATE comprehensive professional dermatological image analysis.`
      
      // Call OpenAI Vision API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert dermatologist specializing in visual diagnosis of skin conditions. Provide detailed, accurate, professional analysis in structured JSON format."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: analysisPrompt
              },
              ...imageMessages
            ]
          }
        ],
        max_tokens: 3500,
        temperature: attempt === 0 ? 0.3 : 0.2, // Stricter on retries
        response_format: { type: "json_object" }
      })
      
      const content = completion.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('No content received from OpenAI Vision API')
      }
      
      // Parse JSON response
      let analysisData
      try {
        analysisData = JSON.parse(content)
      } catch (parseError) {
        throw new Error(`JSON parse error: ${parseError}`)
      }
      
      // Validate quality
      const imageQualityValidation = validateImageQuality(analysisData)
      const observationsValidation = validateDermatologyObservations(analysisData)
      const scoringValidation = validateClinicalScoring(analysisData)
      
      const allIssues = [
        ...imageQualityValidation.issues,
        ...observationsValidation.issues,
        ...scoringValidation.issues
      ]
      
      // If quality issues found and we have retries left, throw error to retry
      if (allIssues.length > 0 && attempt < maxRetries) {
        console.log(`⚠️ Quality issues detected (${allIssues.length}), retrying...`)
        console.log('Issues:', allIssues.slice(0, 5))
        throw new Error(`Quality validation failed: ${allIssues.slice(0, 3).join('; ')}`)
      }
      
      // Log quality metrics
      if (allIssues.length > 0) {
        console.log(`⚠️ Final attempt - ${allIssues.length} quality issues remain but proceeding`)
        console.log('Image quality issues:', imageQualityValidation.issues.length)
        console.log('Observations issues:', observationsValidation.issues.length)
        console.log('Scoring issues:', scoringValidation.issues.length)
      } else {
        console.log('✅ Quality validation passed - dermatology OCR standards met')
      }
      
      return {
        analysis: analysisData,
        qualityMetrics: {
          imageQualityValid: imageQualityValidation.isValid,
          observationsComplete: observationsValidation.isValid,
          clinicalScoringComplete: scoringValidation.isValid,
          attempt: attempt + 1,
          issues: allIssues
        }
      }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff
        console.log(`⏳ Retrying in ${waitTime}ms with enhanced dermatology requirements...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
}

// ==================== MAIN POST HANDLER ====================

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client inside the function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const body = await request.json()
    const { images, patientData, additionalNotes } = body

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      )
    }

    console.log(`🔬 Starting dermatology OCR analysis v2.0 for ${images.length} image(s)`)
    console.log(`👤 Patient: ${patientData.firstName} ${patientData.lastName}`)

    // Call OpenAI Vision with retry mechanism and quality validation
    const result = await callOpenAIVisionWithRetry(
      openai, 
      images, 
      patientData, 
      additionalNotes || '', 
      2
    )
    
    const analysisData = result.analysis

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      analysisId: `DERM-OCR-${Date.now()}`,
      patientInfo: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: patientData.age,
        gender: patientData.gender
      },
      images: {
        count: images.length,
        analyzedAt: new Date().toISOString()
      },
      analysis: analysisData,
      qualityMetrics: result.qualityMetrics,
      version: '2.0-Structured-Clinical-Scoring',
      summary: generateSummary(analysisData)
    }

    console.log('✅ Dermatology OCR v2.0 analysis completed successfully')
    console.log(`📊 Quality: Image ${result.qualityMetrics.imageQualityValid ? '✅' : '⚠️'}, Observations ${result.qualityMetrics.observationsComplete ? '✅' : '⚠️'}, Scoring ${result.qualityMetrics.clinicalScoringComplete ? '✅' : '⚠️'}`)
    console.log(`⚠️ Urgency: ${analysisData.urgencyAssessment?.level || 'Not assessed'}`)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Error in dermatology OCR analysis:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to analyze dermatology images',
        message: error.message,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Generates human-readable summary from structured analysis
 */
function generateSummary(analysis: any): string {
  const parts: string[] = []
  
  // Image quality
  if (analysis.imageQualityAssessment?.overallQuality) {
    parts.push(`Image quality: ${analysis.imageQualityAssessment.overallQuality}`)
  }
  
  // Primary findings
  if (analysis.visualObservations?.primaryMorphology) {
    parts.push(`Primary morphology: ${analysis.visualObservations.primaryMorphology}`)
  }
  
  // Location
  if (analysis.locationAnalysis?.primarySite) {
    parts.push(`Location: ${analysis.locationAnalysis.primarySite}`)
  }
  
  // Top diagnosis
  if (analysis.differentialDiagnoses && analysis.differentialDiagnoses.length > 0) {
    const topDx = analysis.differentialDiagnoses[0]
    parts.push(`Primary consideration: ${topDx.diagnosis} (${topDx.likelihood}% likelihood)`)
  }
  
  // Urgency
  if (analysis.urgencyAssessment?.level) {
    parts.push(`Urgency: ${analysis.urgencyAssessment.level}`)
  }
  
  // Melanoma concern
  if (analysis.clinicalScoring?.melanomaConcern?.riskLevel) {
    parts.push(`Melanoma risk: ${analysis.clinicalScoring.melanomaConcern.riskLevel}`)
  }
  
  return parts.join('. ') + '.'
}
