import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

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
    const digitsOnly = (patientData.phone || '').replace(/\D/g, '')
    // Only fail if there are NO digits at all
    if (digitsOnly.length === 0) {
      return { isValid: false, error: "Phone number required" }
    }
    // Accept partial numbers but log them
    if (digitsOnly.length < 7) {
      console.log('⚠️ Partial phone number accepted:', patientData.phone, `(${digitsOnly.length} digits)`)
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

  // Check MCM registration number in report (support both normal and chronic disease structures)
  const mcmNumber = report?.compteRendu?.praticien?.numeroEnregistrement ||
                    report?.medicalReport?.practitioner?.registrationNumber
  if (!mcmNumber || mcmNumber.includes('[') || mcmNumber === '[MCM Registration Required]') {
    return { isValid: false, error: "Valid MCM registration number is required" }
  }

  // Check doctor email (support both normal and chronic disease structures)
  const doctorEmail = report?.compteRendu?.praticien?.email ||
                      report?.medicalReport?.practitioner?.email
  if (!doctorEmail || doctorEmail.includes('[') || !doctorEmail.includes('@')) {
    return { isValid: false, error: "Valid doctor email is required" }
  }

  return { isValid: true }
}

// Helper function to detect prescription renewal
function isPrescriptionRenewal(clinicalData: any, documentsData: any, report: any): boolean {
  const chiefComplaint = clinicalData?.chiefComplaint?.toLowerCase() || ''
  const motifConsultation = documentsData?.consultationReport?.rapport?.motifConsultation?.toLowerCase() || ''
  const reportMotif = report?.compteRendu?.rapport?.motifConsultation?.toLowerCase() || ''
  
  const renewalKeywords = [
    'renewal', 
    'renouvellement', 
    'ordonnance', 
    'prescription',
    'refill',
    'order renewal',
    'repeat prescription',
    'médicaments à renouveler'
  ]
  
  return renewalKeywords.some(keyword => 
    chiefComplaint.includes(keyword) || 
    motifConsultation.includes(keyword) ||
    reportMotif.includes(keyword)
  )
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
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Report saving not configured' }, { status: 503 })
    }
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

    // Structure the documents data (support both normal and chronic disease structures)
    const documentsData = {
      consultationReport: report?.compteRendu || report?.medicalReport || {},
      prescriptions: report?.ordonnances || {},
      // Chronic disease specific data
      medicationPrescription: report?.medicationPrescription || null,
      laboratoryTests: report?.laboratoryTests || null,
      paraclinicalExams: report?.paraclinicalExams || null,
      dietaryPlan: report?.dietaryPlan || null,
      followUpPlan: report?.followUpPlan || null,
      invoice: report?.invoice || null,
      lastModified: new Date().toISOString(),
      editedSections: metadata?.modifiedSections || []
    }

    // Extract consultation type from report metadata (support both structures)
    const consultationType = report?.compteRendu?.metadata?.typeConsultation ||
                             (report?.medicalReport ? 'chronic_disease' : 'general')

    // Check if this is a prescription renewal
    const isRenewal = isPrescriptionRenewal(clinicalData, documentsData, report)
    
    if (isRenewal) {
      console.log('💊 Prescription renewal detected - applying relaxed validation')
    }

    // Additional strict validation for finalization
    if (action === 'finalize') {
      if (isRenewal) {
        // For prescription renewals, apply very relaxed validation
        console.log('📋 Prescription renewal mode - relaxed validation applied')
        
        // Don't require medications immediately for renewals
        // Doctor will add them in the UI
        
        // Don't require signatures for renewals if not yet validated
        // They will be added during validation
        
      } else {
        // Normal strict validation for regular consultations
        
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
        
        // Check if report has actual medical content (support both structures)
        const hasNormalContent = report?.compteRendu?.rapport?.motifConsultation &&
                                report?.compteRendu?.rapport?.conclusionDiagnostique
        const hasChronicContent = report?.medicalReport?.narrative &&
                                 (report?.medicalReport?.diagnosticSummary?.diagnosticConclusion ||
                                  report?.medicalReport?.chronicDiseaseAssessment)

        if (!hasNormalContent && !hasChronicContent) {
          return NextResponse.json({
            success: false,
            error: "Medical report must contain consultation details and diagnosis",
            validationError: true
          }, { status: 400 })
        }
        
        // Verify signatures exist for finalized documents (not for renewals)
        if (!metadata?.signatures || Object.keys(metadata.signatures).length === 0) {
          return NextResponse.json({
            success: false,
            error: "Document signatures are required for finalization",
            validationError: true
          }, { status: 400 })
        }
      }
    }

// Structure prescription data separately for pharmacy workflow
    // Support both normal consultation (French field names) and chronic disease (English field names)
    const normalMeds = report?.ordonnances?.medicaments?.prescription?.medicaments || []
    const chronicMeds = report?.ordonnances?.medicaments?.prescription?.medications || []

    const normalLabs = report?.ordonnances?.biologie?.prescription?.analyses
    const chronicLabs = report?.ordonnances?.biologie?.prescription?.tests

    const normalImaging = report?.ordonnances?.imagerie?.prescription?.examens || []
    const chronicImaging = report?.ordonnances?.imagerie?.prescription?.exams || []

    const prescriptionData = {
      medications: normalMeds.length > 0 ? normalMeds : chronicMeds,
      laboratoryTests: {
        hematology: normalLabs?.hematology || chronicLabs?.hematology || [],
        clinicalChemistry: normalLabs?.clinicalChemistry || chronicLabs?.clinicalChemistry || [],
        immunology: normalLabs?.immunology || chronicLabs?.immunology || [],
        microbiology: normalLabs?.microbiology || chronicLabs?.microbiology || [],
        endocrinology: normalLabs?.endocrinology || chronicLabs?.endocrinology || [],
        general: normalLabs?.general || chronicLabs?.general || []
      },
imagingStudies: normalImaging.length > 0 ? normalImaging : chronicImaging,
sickLeave: report?.ordonnances?.arretMaladie?.certificat ? {
  dateDebut: report.ordonnances.arretMaladie.certificat.dateDebut,
  dateFin: report.ordonnances.arretMaladie.certificat.dateFin,
  nombreJours: report.ordonnances.arretMaladie.certificat.nombreJours,
  motifMedical: report.ordonnances.arretMaladie.certificat.motifMedical || 
                report?.compteRendu?.rapport?.conclusionDiagnostique || 
                'État de santé nécessitant un arrêt de travail',
  remarques: report.ordonnances.arretMaladie.certificat.remarques || '',
  restrictionsTravail: report.ordonnances.arretMaladie.certificat.restrictionsTravail || '',
  repriseAutorisee: report.ordonnances.arretMaladie.certificat.repriseAutorisee
} : null,
generatedAt: new Date().toISOString()
    }

    // Validate content completeness before determining status
    let finalStatus = 'draft';
    // Support both normal and chronic disease report structures
    const hasValidContent = (documentsData.consultationReport?.rapport?.motifConsultation &&
                            documentsData.consultationReport?.rapport?.conclusionDiagnostique) ||
                           (documentsData.consultationReport?.narrative &&
                            (documentsData.consultationReport?.diagnosticSummary?.diagnosticConclusion ||
                             documentsData.consultationReport?.chronicDiseaseAssessment));

    const hasMedications = prescriptionData.medications && prescriptionData.medications.length > 0;
    const hasLabTests = Object.values(prescriptionData.laboratoryTests || {}).some((tests: any) => tests.length > 0);
    const hasImaging = prescriptionData.imagingStudies && prescriptionData.imagingStudies.length > 0;

    // Determine appropriate status based on action and content
    if (action === 'finalize') {
      // For renewals, we can finalize even without all content
      if (isRenewal) {
        finalStatus = 'finalized';
      } else if (!hasValidContent) {
        console.warn('⚠️ Cannot finalize without consultation content - downgrading to draft');
        finalStatus = 'draft';
      } else {
        finalStatus = 'finalized';
      }
    } else if (action === 'validate') {
      finalStatus = 'validated';
    } else {
      finalStatus = 'draft';
    }

    // Check if record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('consultation_records')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle()

    // Only throw if there's an actual database error
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing record:', checkError)
      throw checkError
    }

    let result

    if (existingRecord) {
      // Update existing record
      console.log('📝 Updating existing record for consultation:', consultationId)
      console.log('Current status:', existingRecord.documents_status, '→ New status:', finalStatus)
      
      // Prevent downgrading from finalized to draft (unless it's a renewal)
      if (!isRenewal && existingRecord.documents_status === 'finalized' && finalStatus === 'draft') {
        console.warn('⚠️ Cannot downgrade finalized record to draft')
        finalStatus = existingRecord.documents_status; // Keep finalized status
      }
      
      // Prevent overwriting completed records with empty data (unless renewal)
      if (!isRenewal && existingRecord.documents_status === 'completed' && !hasValidContent && action === 'finalize') {
        console.error('❌ Cannot finalize completed record without content')
        return NextResponse.json({
          success: false,
          error: 'Cannot finalize consultation without medical content',
          validationError: true
        }, { status: 400 })
      }
      
const updateData = {
        documents_data: documentsData,
        prescription_data: prescriptionData,
        documents_status: finalStatus,
        consultation_type: consultationType,
        signatures: metadata?.signatures || {},
        document_validations: metadata?.documentValidations || {},
        doctor_name: doctorName,
        patient_name: patientName,
        patient_data: patientData || existingRecord.patient_data || {},
        clinical_data: clinicalData || existingRecord.clinical_data || {},
        diagnosis_data: isRenewal ? {} : (diagnosisData || existingRecord.diagnosis_data || {}),
        has_prescriptions: hasMedications,
        has_lab_requests: hasLabTests,
        has_imaging_requests: hasImaging,
       has_sick_leave: !!(prescriptionData.sickLeave && (prescriptionData.sickLeave.nombreJours > 0 || prescriptionData.sickLeave.numberOfDays > 0)),
  sick_leave_data: prescriptionData.sickLeave || null,
  has_invoice: !!(report?.invoice),
        chief_complaint: documentsData?.consultationReport?.rapport?.motifConsultation ||
                         clinicalData?.chiefComplaint ||
                         clinicalData?.visitReasons?.join(', ') ||
                         existingRecord.chief_complaint ||
                         (isRenewal ? 'Prescription Renewal / Renouvellement d\'ordonnance' : null),
        diagnosis: documentsData?.consultationReport?.rapport?.conclusionDiagnostique ||
                   documentsData?.consultationReport?.diagnosticSummary?.diagnosticConclusion ||
                   documentsData?.consultationReport?.chronicDiseaseAssessment?.primaryDiagnosis ||
                   existingRecord.diagnosis ||
                   (isRenewal ? 'Prescription renewal - stable condition' : null),
        doctor_specialty: documentsData?.consultationReport?.praticien?.specialite ||
                          report?.compteRendu?.praticien?.specialite ||
                          report?.medicalReport?.practitioner?.specialty ||
                          existingRecord.doctor_specialty ||
                          null,
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
      
      // Validate consultation date
      let consultationDate = new Date().toISOString();
      if (clinicalData?.consultationDate) {
        const parsedDate = new Date(clinicalData.consultationDate);
        if (parsedDate.getFullYear() >= 2000 && parsedDate.getFullYear() <= new Date().getFullYear() + 1) {
          consultationDate = parsedDate.toISOString();
        } else {
          console.warn('⚠️ Invalid consultation date detected, using current date');
        }
      }

const insertData = {
        consultation_id: consultationId,
        patient_id: patientId,
        doctor_id: doctorId,
        patient_data: patientData || {},
        clinical_data: clinicalData || {},
        diagnosis_data: isRenewal ? {} : (diagnosisData || {}),
        documents_data: documentsData,
        prescription_data: prescriptionData,
        documents_status: finalStatus,
        consultation_type: consultationType,
        prescription_status: hasMedications ? 'pending_validation' : null,
        signatures: metadata?.signatures || {},
        document_validations: metadata?.documentValidations || {},
        doctor_name: doctorName,
        patient_name: patientName,
        consultation_date: consultationDate,
        has_prescriptions: hasMedications,
        has_lab_requests: hasLabTests,
        has_imaging_requests: hasImaging,
        has_sick_leave: !!(prescriptionData.sickLeave && (prescriptionData.sickLeave.nombreJours > 0 || prescriptionData.sickLeave.numberOfDays > 0)),
  sick_leave_data: prescriptionData.sickLeave || null,
  has_invoice: !!(report?.invoice),
        chief_complaint: documentsData?.consultationReport?.rapport?.motifConsultation ||
                         clinicalData?.chiefComplaint ||
                         clinicalData?.visitReasons?.join(', ') ||
                         (isRenewal ? 'Prescription Renewal / Renouvellement d\'ordonnance' : null),
        diagnosis: documentsData?.consultationReport?.rapport?.conclusionDiagnostique ||
                   documentsData?.consultationReport?.diagnosticSummary?.diagnosticConclusion ||
                   documentsData?.consultationReport?.chronicDiseaseAssessment?.primaryDiagnosis ||
                   (isRenewal ? 'Prescription renewal - stable condition' : null),
        doctor_specialty: documentsData?.consultationReport?.praticien?.specialite ||
                          report?.compteRendu?.praticien?.specialite ||
                          report?.medicalReport?.practitioner?.specialty ||
                          null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('consultation_records')
        .insert(insertData)
        .select()
        .single()
        
      if (error) {
        console.error('❌ Supabase insert error:', error)
        
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
          // Try to update instead if insert fails due to duplicate
          console.log('Record already exists, attempting update instead...')
          const { data: updateData, error: updateError } = await supabase
            .from('consultation_records')
            .update({
              ...insertData,
              created_at: undefined // Don't update created_at
            })
            .eq('consultation_id', consultationId)
            .select()
            .single()
            
          if (updateError) {
            throw updateError
          }
          result = updateData
        } else {
          throw error
        }
      } else {
        result = data
      }
    }

    console.log('✅ Supabase save successful')

    return NextResponse.json({
      success: true,
      data: {
        reportId: consultationId,
        status: result.documents_status,
        savedAt: result.updated_at || result.created_at,
        storage: 'supabase',
        report: documentsData,
        action: existingRecord ? 'updated' : 'created'
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
