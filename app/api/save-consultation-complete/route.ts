// app/api/save-consultation-complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json()
    
    console.log('📝 Saving complete consultation report with doctor data from TIBOK...')
    
    // Validate the report data
    if (!reportData || !reportData.header || !reportData.patient || !reportData.consultation) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid report data: missing required fields' 
        },
        { status: 400 }
      )
    }

    // Extract all relevant information
    const timestamp = new Date().toISOString()
    
    // 1. Save the main consultation report
    const consultationReportData = {
      // IDs
      patient_id: reportData.patient.id || null,
      doctor_id: reportData.consultation.doctorId || null,
      consultation_id: reportData.consultation.consultationId || null,
      
      // Patient information
      patient_first_name: reportData.patient.firstName,
      patient_last_name: reportData.patient.lastName,
      patient_date_of_birth: reportData.patient.dateOfBirth || null,
      patient_age: reportData.patient.age,
      patient_gender: reportData.patient.gender,
      patient_weight: reportData.patient.weight,
      patient_height: reportData.patient.height,
      patient_bmi: reportData.patient.weight && reportData.patient.height 
        ? (reportData.patient.weight / Math.pow(reportData.patient.height / 100, 2)).toFixed(2) 
        : null,
      
      // Doctor information from TIBOK
      doctor_name: reportData.header.name || reportData.consultation.doctorName,
      doctor_title: reportData.header.title || 'Dr',
      doctor_specialty: reportData.header.specialty || reportData.consultation.doctorSpecialty || 'Médecine Générale',
      doctor_council_number: reportData.header.mauritianMedicalCouncil || reportData.consultation.doctorCouncilNumber,
      doctor_email: reportData.header.email,
      doctor_phone: reportData.header.phone,
      doctor_institution: reportData.header.chuAffiliation || 'CHU Sir Seewoosagur Ramgoolam',
      doctor_department: reportData.header.department,
      doctor_academic_title: reportData.header.academicTitle,
      
      // Consultation details
      consultation_date: reportData.consultation.consultationDate || timestamp,
      consultation_time: reportData.consultation.consultationTime,
      consultation_type: reportData.consultation.consultationType || 'Télémédecine',
      urgency_level: reportData.consultation.urgencyLevel || 'Standard',
      evidence_level: reportData.consultation.evidenceLevel || 'B',
      
      // Clinical data
      chief_complaint: reportData.medical?.clinical?.chiefComplaint || '',
      history_present_illness: reportData.medical?.clinical?.historyOfPresentIllness || '',
      vital_signs: reportData.medical?.clinical?.vitalSigns || {},
      pain_scale: reportData.medical?.clinical?.painScale || 0,
      
      // Diagnosis information
      diagnosis_primary: reportData.medical?.diagnosis?.comprehensiveDiagnosis?.primary?.condition || '',
      diagnosis_confidence: reportData.medical?.diagnosis?.comprehensiveDiagnosis?.primary?.confidence || 0,
      diagnosis_severity: reportData.medical?.diagnosis?.comprehensiveDiagnosis?.primary?.severity || '',
      diagnosis_icd_code: reportData.medical?.diagnosis?.comprehensiveDiagnosis?.primary?.icd11 
        || reportData.medical?.diagnosis?.comprehensiveDiagnosis?.primary?.icd10 || '',
      diagnosis_rationale: reportData.medical?.diagnosis?.comprehensiveDiagnosis?.primary?.rationale || '',
      
      // Differential diagnoses (stored as JSON)
      differential_diagnoses: reportData.medical?.diagnosis?.comprehensiveDiagnosis?.systematicDifferential || [],
      
      // Treatment plan
      medications: reportData.medical?.prescriptions?.medications || [],
      examinations_biology: reportData.medical?.examinations?.biology || null,
      examinations_imaging: reportData.medical?.examinations?.imaging || null,
      
      // Academic content
      teaching_notes: reportData.consultation.teachingNotes || reportData.academic?.teaching || '',
      research_notes: reportData.consultation.researchNotes || reportData.academic?.research || '',
      
      // Tropical medicine specifics
      seasonal_context: reportData.tropical?.seasonal || reportData.consultation.seasonalContext || '',
      tropical_warnings: reportData.tropical?.warnings || [],
      mauritian_specifics: reportData.consultation.mauritianSpecifics || reportData.tropical?.adaptations || '',
      cultural_considerations: reportData.consultation.culturalConsiderations || '',
      
      // Follow-up plan
      follow_up_plan: reportData.consultation.followUpPlan || '',
      emergency_contacts: reportData.consultation.emergencyContacts || 'SAMU 114 | Police 999',
      
      // AI enhancement data
      ai_enhanced: reportData.aiEnhanced?.processed || false,
      ai_recommendations: reportData.aiEnhanced?.recommendations || [],
      ai_generated_content: reportData.aiEnhanced?.generated || {},
      
      // Metadata
      report_id: `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      is_from_tibok: reportData.header.isFromTibok || true,
      report_status: 'completed',
      created_at: timestamp,
      updated_at: timestamp,
      
      // Store the complete report as JSON for reference
      full_report_data: reportData
    }

    console.log('💾 Inserting consultation report into database...')
    
    // Insert into consultation_reports table
    const { data: savedReport, error: reportError } = await supabase
      .from('consultation_reports')
      .insert(consultationReportData)
      .select()
      .single()

    if (reportError) {
      console.error('❌ Error saving consultation report:', reportError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to save consultation report',
          details: reportError.message 
        },
        { status: 500 }
      )
    }

    console.log('✅ Consultation report saved successfully:', savedReport.id)

    // 2. Update the consultation status if consultation_id exists
    if (reportData.consultation.consultationId) {
      const { error: updateError } = await supabase
        .from('consultations')
        .update({
          status: 'completed',
          report_generated: true,
          report_id: savedReport.id,
          completed_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', reportData.consultation.consultationId)

      if (updateError) {
        console.warn('⚠️ Warning: Could not update consultation status:', updateError)
      } else {
        console.log('✅ Consultation status updated')
      }
    }

    // 3. Create a document record for easy access
    const documentData = {
      patient_id: reportData.patient.id,
      doctor_id: reportData.consultation.doctorId,
      consultation_id: reportData.consultation.consultationId,
      document_type: 'consultation_report',
      document_name: `Rapport Consultation - ${reportData.patient.firstName} ${reportData.patient.lastName} - ${new Date().toLocaleDateString('fr-FR')}`,
      document_url: `/api/generate-pdf/${savedReport.id}`, // You'll need to create this endpoint
      metadata: {
        report_id: savedReport.id,
        doctor_name: reportData.header.name,
        doctor_specialty: reportData.header.specialty,
        consultation_date: reportData.consultation.consultationDate,
        generated_by: 'TIBOK IA DOCTOR'
      },
      created_at: timestamp
    }

    const { data: savedDocument, error: documentError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (documentError) {
      console.warn('⚠️ Warning: Could not create document record:', documentError)
    } else {
      console.log('✅ Document record created:', savedDocument.id)
    }

    // 4. Log the activity
    const activityData = {
      patient_id: reportData.patient.id,
      doctor_id: reportData.consultation.doctorId,
      activity_type: 'consultation_report_generated',
      activity_description: `Rapport de consultation généré par ${reportData.header.name}`,
      metadata: {
        report_id: savedReport.id,
        document_id: savedDocument?.id,
        ai_enhanced: reportData.aiEnhanced?.processed || false
      },
      created_at: timestamp
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert(activityData)

    if (activityError) {
      console.warn('⚠️ Warning: Could not log activity:', activityError)
    }

    // Return success response with all relevant IDs
    return NextResponse.json({
      success: true,
      message: 'Consultation report saved successfully',
      data: {
        reportId: savedReport.id,
        documentId: savedDocument?.id,
        consultationId: reportData.consultation.consultationId,
        patientName: `${reportData.patient.firstName} ${reportData.patient.lastName}`,
        doctorName: reportData.header.name,
        doctorSpecialty: reportData.header.specialty,
        timestamp: timestamp
      },
      metadata: {
        reportUrl: `/api/reports/${savedReport.id}`,
        pdfUrl: `/api/generate-pdf/${savedReport.id}`,
        savedAt: timestamp
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error in save-consultation-complete:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to retrieve a saved report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    const { data: report, error } = await supabase
      .from('consultation_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      report: report.full_report_data,
      metadata: {
        reportId: report.id,
        createdAt: report.created_at,
        doctorName: report.doctor_name,
        patientName: `${report.patient_first_name} ${report.patient_last_name}`
      }
    })

  } catch (error) {
    console.error('Error retrieving report:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve report' },
      { status: 500 }
    )
  }
}
