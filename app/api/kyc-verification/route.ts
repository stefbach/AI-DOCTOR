import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Records a doctor's KYC (patient identity) verification at the start of a
// consultation, for compliance/audit. Uses the ANON key with a permissive
// RLS insert policy (see migration create_kyc_verifications_table), matching
// the pattern used by other write routes (e.g. save-draft).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyxmqositmmyyeyuryln.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ KYC: Failed to parse request body:', parseError)
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const {
      consultationId,
      patientId,
      doctorId,
      consultationType,
      approved,
      patientSnapshot,
    } = body || {}

    // KYC is an explicit attestation — approval must be true to be recorded.
    if (approved !== true) {
      return NextResponse.json({ success: false, error: 'KYC not approved' }, { status: 400 })
    }

    // SIMULATION MODE: don't try to persist for sim- consultations.
    if (typeof consultationId === 'string' && consultationId.startsWith('sim-')) {
      console.log('🎮 KYC simulation — returning mock success for:', consultationId)
      return NextResponse.json({ success: true, data: { storage: 'simulation' } })
    }

    if (!supabase) {
      console.error('❌ KYC: Supabase not configured — missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return NextResponse.json({ success: false, error: 'KYC recording not configured' }, { status: 503 })
    }

    const { data, error } = await supabase
      .from('kyc_verifications')
      .insert({
        consultation_id: consultationId ?? null,
        patient_id: patientId ?? null,
        doctor_id: doctorId ?? null,
        consultation_type: consultationType ?? null,
        approved: true,
        patient_snapshot: patientSnapshot ?? {},
        verified_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('❌ KYC: Supabase insert failed:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log('✅ KYC verification recorded:', { consultationId, doctorId, id: data?.id })
    return NextResponse.json({ success: true, data: { id: data?.id ?? null } })
  } catch (error: any) {
    console.error('❌ KYC: Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}
