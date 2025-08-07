// app/api/test-direct/route.ts
import { NextResponse } from 'next/server'

// PAS de runtime edge !
// export const runtime = 'edge'

export async function GET() {
  // Test 1: Variable existe ?
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ 
      error: "❌ OPENAI_API_KEY n'existe pas sur Vercel",
      solution: "Allez dans Settings → Environment Variables"
    })
  }
  
  // Test 2: Appel OpenAI
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Dis "OK"' }],
        max_tokens: 10
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: "❌ OpenAI refuse",
        details: data.error,
        status: response.status
      })
    }
    
    return NextResponse.json({ 
      success: "✅ Tout fonctionne !",
      response: data.choices[0].message.content
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: "❌ Erreur réseau",
      message: error.message
    })
  }
}
