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
      console.error('❌ Supabase not configured - missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return NextResponse.json({ success: false, error: 'Draft saving not configured' }, { status: 503 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { consultationId, reportContent, doctorInfo, modifiedSections, patientId, doctorId, validationStatus } = body

    if (!consultationId) {
      return NextResponse.json({ success: false, error: 'Missing consultationId' }, { status: 400 })
    }

    // SIMULATION MODE: Return mock success for sim- prefixed consultations
    if (typeof consultationId === 'string' && consultationId.startsWith('sim-')) {
      console.log('🎮 Simulation draft save — returning mock success for:', consultationId)
      return NextResponse.json({
        success: true,
        data: { consultationId, status: 'draft', storage: 'simulation' }
      })
    }

    console.log('📝 Saving draft for consultation:', consultationId)
    console.log('📊 Report content size:', JSON.stringify(reportContent || {}).length, 'bytes')

    // Extract doctor and patient info from reportContent
    const doctorName = doctorInfo?.nom ||
                       reportContent?.compteRendu?.praticien?.nom ||
                       reportContent?.medicalReport?.practitioner?.name ||
                       'Unknown Doctor'

    const patientName = reportContent?.compteRendu?.patient?.nomComplet ||
                        reportContent?.medicalReport?.patient?.fullName ||
                        'Unknown Patient'

    // Build documents_data structure matching save-medical-report format
    const documentsData = {
      consultationReport: {
        content: reportContent?.compteRendu || {},
        ...(reportContent?.medicalReport && { medicalReport: reportContent.medicalReport })
      },
      prescriptions: reportContent?.ordonnances || {},
      medicationPrescription: reportContent?.medicationPrescription || null,
      laboratoryTests: reportContent?.laboratoryTests || null,
      paraclinicalExams: reportContent?.paraclinicalExams || null,
      dietaryPlan: reportContent?.dietaryPlan || reportContent?.dietaryProtocol || null,
      sickLeave: reportContent?.sickLeave || null,
      invoice: reportContent?.invoice || null,
      lastModified: new Date().toISOString(),
      editedSections: modifiedSections || []
    }

    // Determine consultation type
    const consultationType = reportContent?.compteRendu?.metadata?.typeConsultation ||
                             (reportContent?.medicalReport ? 'chronic_disease' : 'general')

    // Check if record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('consultation_records')
      .select('id, documents_status')
      .eq('consultation_id', consultationId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing record:', checkError)
      throw checkError
    }

    let result
    const finalStatus = validationStatus || 'draft'

    if (existingRecord) {
      // Update existing record
      console.log('📝 Updating existing draft for consultation:', consultationId)

      const { data, error } = await supabase
        .from('consultation_records')
        .update({
          documents_data: documentsData,
          documents_status: existingRecord.documents_status === 'finalized' ? 'finalized' : finalStatus,
          consultation_type: consultationType,
          doctor_name: doctorName,
          patient_name: patientName,
          updated_at: new Date().toISOString()
        })
        .eq('consultation_id', consultationId)
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase update error:', error)
        throw error
      }
      result = data
    } else {
      // Create new record
      console.log('📝 Creating new draft for consultation:', consultationId)

      const { data, error } = await supabase
        .from('consultation_records')
        .insert({
          consultation_id: consultationId,
          patient_id: patientId || 'unknown',
          doctor_id: doctorId || 'unknown',
          documents_data: documentsData,
          documents_status: finalStatus,
          consultation_type: consultationType,
          doctor_name: doctorName,
          patient_name: patientName,
          consultation_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        throw error
      }
      result = data
    }

    console.log('✅ Draft saved successfully')
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('❌ Draft save error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to save draft',
      code: error?.code
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

    // Load from consultation_records table (same as save-medical-report)
    const { data, error } = await supabase
      .from('consultation_records')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Transform data to expected format for backwards compatibility
    const transformedData = data ? {
      consultation_id: data.consultation_id,
      report_content: data.documents_data?.consultationReport?.content || data.documents_data,
      doctor_info: {
        nom: data.doctor_name,
        specialite: data.doctor_specialty
      },
      validation_status: data.documents_status,
      last_edited_at: data.updated_at
    } : null

    return NextResponse.json({
      success: true,
      data: transformedData
    })
  } catch (error) {
    console.error('Draft fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch draft'
    }, { status: 500 })
  }
}
