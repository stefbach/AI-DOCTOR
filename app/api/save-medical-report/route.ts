import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')
    
    console.log(`🔍 GET request - consultationId: ${consultationId}`)
    
    if (!consultationId) {
      return NextResponse.json({
        success: false,
        error: "consultationId is required"
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('consultation_records')
      .select('*')
      .eq('consultation_id', consultationId)
      .single()

    if (error) {
      console.error('Supabase GET error:', error)
      if (error.code === 'PGRST116') {
        // No record found
        return NextResponse.json({
          success: false,
          error: "No report found"
        }, { status: 404 })
      }
      throw error
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: "No report found"
      }, { status: 404 })
    }

    // Return the data in the expected format
    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        consultationId: data.consultation_id,
        content: data.documents_data || {},
        prescriptionData: data.prescription_data || {},
        status: data.documents_status || 'draft',
        signatures: data.signatures || {},
        documentValidations: data.document_validations || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    })
    
  } catch (error) {
    console.error("❌ GET Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch report"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 POST request received')
    
    const {
      consultationId,
      patientId,
      doctorId,
      doctorName,
      patientName,
      report,
      action,
      metadata,
      patientData,
      clinicalData,
      diagnosisData
    } = body

    if (!consultationId || !patientId) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields"
      }, { status: 400 })
    }

    // Structure the documents data
    const documentsData = {
      consultationReport: report?.compteRendu || {},
      prescriptions: report?.ordonnances || {},
      invoice: report?.invoice || null,
      lastModified: new Date().toISOString(),
      editedSections: metadata?.modifiedSections || []
    }

    // Structure prescription data separately for pharmacy workflow
    const prescriptionData = {
      medications: report?.ordonnances?.medicaments?.prescription?.medicaments || [],
      laboratoryTests: {
        hematology: report?.ordonnances?.biologie?.prescription?.analyses?.hematology || [],
        clinicalChemistry: report?.ordonnances?.biologie?.prescription?.analyses?.clinicalChemistry || [],
        immunology: report?.ordonnances?.biologie?.prescription?.analyses?.immunology || [],
        microbiology: report?.ordonnances?.biologie?.prescription?.analyses?.microbiology || [],
        endocrinology: report?.ordonnances?.biologie?.prescription?.analyses?.endocrinology || [],
        general: report?.ordonnances?.biologie?.prescription?.analyses?.general || []
      },
      imagingStudies: report?.ordonnances?.imagerie?.prescription?.examens || [],
      generatedAt: new Date().toISOString()
    }

    // Check if record exists
    const { data: existingRecord } = await supabase
      .from('consultation_records')
      .select('id')
      .eq('consultation_id', consultationId)
      .single()

    let result
    
    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from('consultation_records')
        .update({
          documents_data: documentsData,
          prescription_data: prescriptionData,
          documents_status: action === 'validate' ? 'validated' : 'draft',
          signatures: metadata?.signatures || {},
          document_validations: metadata?.documentValidations || {},
          doctor_name: doctorName,
          patient_name: patientName,
          updated_at: new Date().toISOString()
        })
        .eq('consultation_id', consultationId)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('consultation_records')
        .insert({
          consultation_id: consultationId,
          patient_id: patientId,
          doctor_id: doctorId,
          patient_data: patientData || {},
          clinical_data: clinicalData || {},
          diagnosis_data: diagnosisData || {},
          documents_data: documentsData,
          prescription_data: prescriptionData,
          documents_status: 'draft',
          prescription_status: 'pending_validation',
          signatures: metadata?.signatures || {},
          document_validations: metadata?.documentValidations || {},
          doctor_name: doctorName,
          patient_name: patientName,
          has_prescriptions: !!(report?.ordonnances?.medicaments?.prescription?.medicaments?.length > 0),
          has_lab_requests: !!(report?.ordonnances?.biologie),
          has_imaging_requests: !!(report?.ordonnances?.imagerie),
          has_invoice: !!(report?.invoice)
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    console.log('✅ Supabase save successful')
    
    return NextResponse.json({
      success: true,
      data: {
        reportId: consultationId,
        status: result.documents_status,
        savedAt: result.updated_at || result.created_at,
        storage: 'supabase',
        report: documentsData
      }
    })

  } catch (error) {
    console.error("❌ POST Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to save report"
    }, { status: 500 })
  }
}
