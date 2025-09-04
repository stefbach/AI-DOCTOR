import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, targetLanguage = 'en', sourceLanguage = 'auto' } = body
    
    // If no text provided, return empty
    if (!text || text.trim() === '') {
      return NextResponse.json({ translatedText: '' })
    }

    // If text is already in English (basic check), return as-is
    if (targetLanguage === 'en' && !containsFrench(text)) {
      return NextResponse.json({ translatedText: text })
    }

    console.log('🌍 Translating text:', { 
      original: text.substring(0, 50) + '...', 
      from: sourceLanguage, 
      to: targetLanguage 
    })

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a medical translator. Translate the following text from ${sourceLanguage === 'auto' ? 'French' : sourceLanguage} to ${targetLanguage}. 
          Rules:
          - Keep medical terms accurate and use standard medical terminology
          - Preserve the meaning exactly
          - Only return the translated text, nothing else
          - If the text is already in ${targetLanguage}, return it unchanged
          - For medical conditions, use proper capitalization (e.g., "Hypertension", not "hypertension")`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1, // Low temperature for consistent medical translations
      max_tokens: 200
    })

    const translatedText = response.choices[0]?.message?.content || text
    
    console.log('✅ Translation complete:', {
      original: text.substring(0, 50),
      translated: translatedText.substring(0, 50)
    })
    
    return NextResponse.json({ translatedText: translatedText.trim() })
    
  } catch (error: any) {
    console.error('❌ Translation error:', error?.message || error)
    
    // If OpenAI fails, try basic replacements as fallback
    let fallbackText = text || ''
    
    // Basic French to English replacements
    const basicReplacements: Record<string, string> = {
      'Autre allergies test': 'Other allergies test',
      'Autre antecedents test': 'Other medical history test',
      'Autre antécédents test': 'Other medical history test',
      'Autre': 'Other',
      'autre': 'other',
      'antécédents': 'medical history',
      'antecedents': 'medical history'
    }
    
    for (const [french, english] of Object.entries(basicReplacements)) {
      fallbackText = fallbackText.replace(french, english)
    }
    
    // Return fallback translation or original text
    return NextResponse.json({ 
      translatedText: fallbackText,
      error: 'Translation service unavailable, using fallback'
    })
  }
}

// Helper function to detect if text contains French
function containsFrench(text: string): boolean {
  const frenchIndicators = [
    'autre', 'Autre',
    'antécédents', 'antecedents',
    'médicaments', 'medicaments',
    'œ', 'é', 'è', 'ê', 'à', 'ç', 'ù'
  ]
  
  const lowerText = text.toLowerCase()
  return frenchIndicators.some(indicator => lowerText.includes(indicator))
}
