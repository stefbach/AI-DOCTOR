import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Validation function to check for fake/test data
function validatePatientData(patientName: string, patientData: any): { isValid: boolean; error?: string } {
  // Check for invalid patient names
  const invalidNames = ['Patient', 'Non spécifié', 'Test', 'test', 'Demo', 'demo', '[Name Required]', 'undefined', 'null']
  
  if (!patientName || patientName.trim() === '') {
    return { isValid: false, error: "Patient name is required" }
  }
  
  if (invalidNames.some(invalid => patientName.includes(invalid))) {
    return { isValid: false, error: "Invalid patient name detected (test/demo data)" }
  }
  
  if (patientName.includes('1970') || patientName.includes('[') || patientName.includes(']')) {
    return { isValid: false, error: "Patient name contains invalid characters or placeholder text" }
  }
  
  // Check for suspiciously short names
  if (patientName.trim().length < 3) {
    return { isValid: false, error: "Patient name is too short" }
  }
  
  // Check for valid email if provided
  if (patientData?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(patientData.email) || 
        patientData.email.includes('test') || 
        patientData.email.includes('example')) {
      return { isValid: false, error: "Invalid patient email address" }
    }
  }
  
  // Check for valid phone if provided
  if (patientData?.phone) {
    // Remove spaces and special characters for validation
    const cleanPhone = patientData.phone.replace(/[\s\-\(\)]/g, '')
    if (cleanPhone.length < 7 || cleanPhone === '00000000') {
      return { isValid: false, error: "Invalid patient phone number" }
    }
  }
  
  return { isValid: true }
}

// Validation function for doctor data
function validateDoctorData(doctorName: string, doctorId: string, report: any): { isValid: boolean; error?: string } {
  if (!doctorName || doctorName.includes('[') || doctorName === 'Dr. [Name Required]') {
    return { isValid: false, error: "Valid doctor name is required" }
  }
  
  if (!doctorId || doctorId === 'undefined' || doctorId === 'null') {
    return { isValid: false, error: "Valid doctor ID is required" }
  }
  
  // Check MCM registration number in report
  const mcmNumber = report?.compteRendu?.praticien?.numeroEnregistrement
  if (!mcmNumber || mcmNumber.includes('[') || mcmNumber === '[MCM Registration Required]') {
    return { isValid: false, error: "Valid MCM registration number is required" }
  }
  
  // Check doctor email
  const doctorEmail = report?.compteRendu?.praticien?.email
  if (!doctorEmail || doctorEmail.includes('[') || !doctorEmail.includes('@')) {
    return { isValid: false, error: "Valid doctor email is required" }
  }
  
  return { isValid: true }
}

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
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase GET error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // If no data found, return empty success (not 404)
    if (!data) {
      console.log('No existing report found for consultation:', consultationId)
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    // Return the data with proper structure
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

    // Basic field validation
    if (!consultationId || !patientId) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: consultationId and patientId are required"
      }, { status: 400 })
    }

    // Validate patient data
    const patientValidation = validatePatientData(patientName, patientData)
    if (!patientValidation.isValid) {
      console.error('❌ Invalid patient data:', patientValidation.error)
      return NextResponse.json({
        success: false,
        error: `Patient validation failed: ${patientValidation.error}`,
        validationError: true
      }, { status: 400 })
    }

    // Validate doctor data
    const doctorValidation = validateDoctorData(doctorName, doctorId, report)
    if (!doctorValidation.isValid) {
      console.error('❌ Invalid doctor data:', doctorValidation.error)
      return NextResponse.json({
        success: false,
        error: `Doctor validation failed: ${doctorValidation.error}`,
        validationError: true
      }, { status: 400 })
    }

    // Additional strict validation for finalization
    if (action === 'finalize') {
      // Ensure all required patient fields are present
      if (!patientData?.email || patientData.email === '') {
        return NextResponse.json({
          success: false,
          error: "Patient email is required for document finalization",
          validationError: true
        }, { status: 400 })
      }
      
      if (!patientData?.phone || patientData.phone === '') {
        return NextResponse.json({
          success: false,
          error: "Patient phone number is required for document finalization",
          validationError: true
        }, { status: 400 })
      }
      
      // Check if report has actual medical content
      const hasContent = report?.compteRendu?.rapport?.motifConsultation && 
                        report?.compteRendu?.rapport?.conclusionDiagnostique
      
      if (!hasContent) {
        return NextResponse.json({
          success: false,
          error: "Medical report must contain consultation details and diagnosis",
          validationError: true
        }, { status: 400 })
      }
      
      // Verify signatures exist for finalized documents
      if (!metadata?.signatures || Object.keys(metadata.signatures).length === 0) {
        return NextResponse.json({
          success: false,
          error: "Document signatures are required for finalization",
          validationError: true
        }, { status: 400 })
      }
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
      .maybeSingle()

    let result
    
    if (existingRecord) {
      // Update existing record
      console.log('📝 Updating existing record for consultation:', consultationId)
      
      const updateData = {
        documents_data: documentsData,
        prescription_data: prescriptionData,
        documents_status: action === 'finalize' ? 'finalized' : (action === 'validate' ? 'validated' : 'draft'),
        signatures: metadata?.signatures || {},
        document_validations: metadata?.documentValidations || {},
        doctor_name: doctorName,
        patient_name: patientName,
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('consultation_records')
        .update(updateData)
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
      console.log('📝 Creating new record for consultation:', consultationId)
      
      const insertData = {
        consultation_id: consultationId,
        patient_id: patientId,
        doctor_id: doctorId,
        patient_data: patientData || {},
        clinical_data: clinicalData || {},
        diagnosis_data: diagnosisData || {},
        documents_data: documentsData,
        prescription_data: prescriptionData,
        documents_status: action === 'finalize' ? 'finalized' : 'draft',
        prescription_status: 'pending_validation',
        signatures: metadata?.signatures || {},
        document_validations: metadata?.documentValidations || {},
        doctor_name: doctorName,
        patient_name: patientName,
        has_prescriptions: !!(report?.ordonnances?.medicaments?.prescription?.medicaments?.length > 0),
        has_lab_requests: !!(report?.ordonnances?.biologie),
        has_imaging_requests: !!(report?.ordonnances?.imagerie),
        has_invoice: !!(report?.invoice),
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('consultation_records')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        throw error
      }
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
    
    // Check if it's a Supabase unique constraint error
    if (error && typeof error === 'object' && 'code' in error) {
      const supabaseError = error as any
      if (supabaseError.code === '23505') {
        return NextResponse.json({
          success: false,
          error: "A record for this consultation already exists"
        }, { status: 409 })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to save report"
    }, { status: 500 })
  }
}
