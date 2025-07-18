import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const consultationId = searchParams.get('consultationId')
    const patientId = searchParams.get('patientId')
    const source = searchParams.get('source')
    
    // Verify the request is coming from TIBOK
    if (source !== 'tibok' || !consultationId || !patientId) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      )
    }
    
    // Get Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Fetch consultation data
    const consultationResponse = await fetch(
      `${supabaseUrl}/rest/v1/consultations?id=eq.${consultationId}`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!consultationResponse.ok) {
      console.error('Failed to fetch consultation:', consultationResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch consultation' },
        { status: consultationResponse.status }
      )
    }
    
    const consultationData = await consultationResponse.json()
    if (!consultationData || consultationData.length === 0) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }
    
    // Fetch patient data
    const patientResponse = await fetch(
      `${supabaseUrl}/rest/v1/patients?id=eq.${patientId}`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!patientResponse.ok) {
      console.error('Failed to fetch patient:', patientResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch patient' },
        { status: patientResponse.status }
      )
    }
    
    const patientData = await patientResponse.json()
    if (!patientData || patientData.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }
    
    // Return the data
    return NextResponse.json({
      consultation: consultationData[0],
      patient: patientData[0]
    })
    
  } catch (error) {
    console.error('Error in consultation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
