import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use ANON_KEY since we have open RLS policy for drafts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Draft saving not configured' }, { status: 503 })
    }
    const body = await request.json()
    const { consultationId, reportContent, doctorInfo, modifiedSections, patientId, doctorId } = body
    
    const { data, error } = await supabase
      .from('consultation_drafts')
      .upsert({
        consultation_id: consultationId,
        patient_id: patientId,
        doctor_id: doctorId,
        report_content: reportContent,
        doctor_info: doctorInfo,
        modified_sections: modifiedSections,
        last_edited_at: new Date().toISOString(),
        validation_status: reportContent?.compteRendu?.metadata?.validationStatus || 'draft'
      }, {
        onConflict: 'consultation_id'
      })
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Draft save error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save draft' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Draft loading not configured' }, { status: 503 })
    }
    const url = new URL(request.url)
    const consultationId = url.searchParams.get('consultationId')
    
    if (!consultationId) {
      return NextResponse.json({ success: false, error: 'Missing consultationId' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('consultation_drafts')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: data || null 
    })
  } catch (error) {
    console.error('Draft fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch draft' 
    }, { status: 500 })
  }
}
