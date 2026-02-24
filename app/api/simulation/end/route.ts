import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { simulationId } = await request.json()

    if (!simulationId) {
      return NextResponse.json(
        { error: 'Missing simulationId' },
        { status: 400 }
      )
    }

    // Forward to Tibok's simulation end endpoint (server-side to avoid CORS)
    const tibokUrl = process.env.NEXT_PUBLIC_TIBOK_URL || 'http://localhost:3001'
    const tibokResponse = await fetch(`${tibokUrl}/api/doctor/simulation/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulationId })
    })

    if (!tibokResponse.ok) {
      const errorText = await tibokResponse.text()
      console.error('Tibok simulation end failed:', tibokResponse.status, errorText)
      throw new Error(`Tibok returned ${tibokResponse.status}`)
    }

    const data = await tibokResponse.json()
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error('Error ending simulation:', error)
    return NextResponse.json(
      { error: 'Failed to end simulation' },
      { status: 500 }
    )
  }
}
