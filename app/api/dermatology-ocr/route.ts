import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { images, patientData, additionalNotes } = body

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      )
    }

    console.log(`🔬 Starting dermatology OCR analysis for ${images.length} image(s)`)
    console.log(`👤 Patient: ${patientData.firstName} ${patientData.lastName}`)

    // Prepare image analysis messages
    const imageMessages: any[] = images.map((img: any, index: number) => ({
      type: "image_url",
      image_url: {
        url: img.dataUrl,
        detail: "high"
      }
    }))

    // Create comprehensive dermatology analysis prompt
    const analysisPrompt = `You are an expert dermatologist with advanced training in skin condition analysis. 
Analyze the provided skin condition image(s) in detail.

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age}
- Gender: ${patientData.gender}
${additionalNotes ? `\nCLINICAL NOTES:\n${additionalNotes}` : ''}

ANALYSIS REQUIREMENTS:
1. VISUAL OBSERVATIONS:
   - Describe the skin lesion(s) or condition visible in the image(s)
   - Note color, texture, size, shape, borders, and distribution
   - Identify any specific dermatological features (e.g., scaling, vesicles, papules, macules)

2. LOCATION & EXTENT:
   - Identify the body area(s) affected
   - Note if the condition is localized or widespread
   - Describe any patterns (linear, circular, grouped, etc.)

3. PRELIMINARY ASSESSMENT:
   - List possible differential diagnoses based on visual features
   - Note any concerning features that require urgent attention
   - Identify typical vs atypical presentations

4. ADDITIONAL OBSERVATIONS:
   - Note any secondary changes (inflammation, infection signs, scarring)
   - Identify factors that may affect diagnosis or treatment
   - Suggest what additional clinical information would be helpful

Provide a structured, professional dermatological analysis suitable for clinical documentation.`

    // Call OpenAI Vision API for image analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert dermatologist specializing in visual diagnosis of skin conditions. Provide detailed, accurate, and professional analysis."
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
      max_tokens: 2000,
      temperature: 0.3
    })

    const analysis = completion.choices[0].message.content

    // Parse the analysis to extract key components
    const observations = extractObservations(analysis || '')
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      analysisId: `DERM-${Date.now()}`,
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
      analysis: {
        fullText: analysis,
        summary: extractSummary(analysis || ''),
        visualObservations: observations.visual,
        location: observations.location,
        preliminaryDiagnoses: observations.diagnoses,
        concerningFeatures: observations.concerning,
        recommendations: observations.recommendations
      },
      observations: observations.keyPoints,
      summary: `AI analysis completed for ${images.length} skin image(s). ${observations.keyPoints.length} key observations identified.`
    }

    console.log('✅ Dermatology OCR analysis completed successfully')

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ Error in dermatology OCR analysis:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to analyze images',
        message: error.message,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

// Helper function to extract summary
function extractSummary(analysis: string): string {
  const lines = analysis.split('\n').filter(line => line.trim())
  // Get first substantive paragraph
  for (const line of lines) {
    if (line.length > 50 && !line.includes(':')) {
      return line.trim()
    }
  }
  return lines.slice(0, 2).join(' ').trim()
}

// Helper function to extract structured observations
function extractObservations(analysis: string) {
  const observations = {
    visual: [] as string[],
    location: [] as string[],
    diagnoses: [] as string[],
    concerning: [] as string[],
    recommendations: [] as string[],
    keyPoints: [] as string[]
  }

  // Split analysis into sections
  const sections = analysis.split(/\d+\.\s+[A-Z\s]+:/).filter(s => s.trim())
  
  sections.forEach((section, index) => {
    const lines = section.split('\n').filter(line => line.trim() && line.includes('-'))
    const points = lines.map(line => line.replace(/^-\s*/, '').trim()).filter(p => p.length > 10)
    
    if (index === 0) observations.visual = points
    else if (index === 1) observations.location = points
    else if (index === 2) observations.diagnoses = points
    else if (index === 3) observations.recommendations = points
  })

  // Extract key points for summary
  observations.keyPoints = [
    ...observations.visual.slice(0, 2),
    ...observations.diagnoses.slice(0, 2),
    ...observations.concerning.slice(0, 1)
  ].filter(p => p)

  return observations
}
