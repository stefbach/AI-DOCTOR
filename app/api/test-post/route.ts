// app/api/test-post/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🔍 TEST POST ENDPOINT")
  
  try {
    // 1. Test body parsing
    const body = await request.json()
    console.log("✅ Body parsed:", JSON.stringify(body).substring(0, 100))
    
    // 2. Test API key
    const apiKey = process.env.OPENAI_API_KEY
    console.log("✅ API Key exists:", !!apiKey)
    
    // 3. Test OpenAI with MINIMAL request
    if (apiKey) {
      const startTime = Date.now()
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',  // FAST model
          messages: [
            { role: 'user', content: 'Say "test"' }
          ],
          max_tokens: 10  // MINIMAL tokens
        }),
      })
      
      const elapsed = Date.now() - startTime
      
      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json({ 
          error: "OpenAI failed",
          status: response.status,
          details: error.substring(0, 200),
          timeMs: elapsed
        })
      }
      
      const data = await response.json()
      return NextResponse.json({
        success: true,
        timeMs: elapsed,
        response: data.choices[0]?.message?.content,
        message: "If this works, the problem is in the main endpoint logic"
      })
    }
    
    return NextResponse.json({ 
      error: "No API key",
      received: body 
    })
    
  } catch (error: any) {
    console.error("❌ Error:", error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack?.substring(0, 500)
    })
  }
}
