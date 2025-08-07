// api/update-doctor-signature.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { doctorId, signatureDataUrl, lastSignedAt } = await request.json()

    if (!doctorId || !signatureDataUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update the doctors table with the signature
    // Add these columns to your doctors table if they don't exist:
    // - digital_signature (text) - stores the base64 data URL
    // - signature_created_at (timestamp)
    // - last_signed_at (timestamp)
    
    const { data, error } = await supabase
      .from('doctors')
      .update({
        digital_signature: signatureDataUrl,
        signature_created_at: lastSignedAt,
        last_signed_at: lastSignedAt
      })
      .eq('id', doctorId)
      .select()
      .single()

    if (error) {
      console.error('Error updating doctor signature:', error)
      return NextResponse.json(
        { error: 'Failed to store signature' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Signature stored successfully',
      data
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to retrieve stored signature
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')

    if (!doctorId) {
      return NextResponse.json(
        { error: 'Doctor ID required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('doctors')
      .select('digital_signature, signature_created_at, last_signed_at')
      .eq('id', doctorId)
      .single()

    if (error) {
      console.error('Error fetching signature:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve signature' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signature: data?.digital_signature || null,
      createdAt: data?.signature_created_at || null,
      lastUsed: data?.last_signed_at || null
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
