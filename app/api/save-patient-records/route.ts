import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { patientId, records } = body

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('patients')
      .update({
        weight: records.weight ?? null,
        height: records.height ?? null,
        allergies: records.allergies ?? null,
        other_allergies: records.other_allergies ?? null,
        medical_history: records.medical_history ?? null,
        other_medical_history: records.other_medical_history ?? null,
        current_medications: records.current_medications ?? null,
        smoking_status: records.smoking_status ?? null,
        alcohol_consumption: records.alcohol_consumption ?? null,
        physical_activity: records.physical_activity ?? null,
      })
      .eq('id', patientId)

    if (error) {
      console.error('Failed to save patient records:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('Patient records saved for:', patientId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in save-patient-records:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
