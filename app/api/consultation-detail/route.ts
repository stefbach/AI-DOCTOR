// app/api/consultation-detail/route.ts
// API endpoint for fetching full consultation details including documents_data
// This is called on-demand when user views a specific consultation

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

/**
 * POST /api/consultation-detail
 * Fetch full details for a single consultation (including documents_data)
 *
 * Request body: { consultationId: string } or { id: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 })
    }

    const { consultationId, id } = await req.json()
    const recordId = id || consultationId

    if (!recordId) {
      return NextResponse.json({
        success: false,
        error: 'Consultation ID is required'
      }, { status: 400 })
    }

    console.log('🔍 Fetching full consultation details for:', recordId)

    // Fetch single record with all data including documents_data
    const { data: record, error } = await supabase
      .from('consultation_records')
      .select('*')
      .or(`id.eq.${recordId},consultation_id.eq.${recordId}`)
      .single()

    if (error) {
      console.error('❌ Supabase query error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    if (!record) {
      return NextResponse.json({
        success: false,
        error: 'Consultation not found'
      }, { status: 404 })
    }

    console.log('✅ Full consultation details fetched')

    // Transform to full consultation format with all details
    const documentsData = record.documents_data || {}

    // Extract data from various structures
    const consultationReportContent = documentsData.consultationReport?.content || {}
    const compteRendu = documentsData.compteRendu || consultationReportContent || {}
    const rapport = compteRendu.rapport || consultationReportContent.rapport || {}
    const medicalReport = documentsData.consultationReport?.medicalReport || documentsData.medicalReport || {}

    // Detect consultation type
    let consultationType: 'normal' | 'dermatology' | 'chronic' = 'normal'
    if (record.consultation_type) {
      consultationType = record.consultation_type
    } else if (compteRendu.header?.consultationType?.toLowerCase().includes('dermatology')) {
      consultationType = 'dermatology'
    } else if (medicalReport?.chronicDiseaseAssessment) {
      consultationType = 'chronic'
    }

    // Extract vital signs
    let vitalSigns: any = {}
    const patientData = compteRendu.patient || consultationReportContent.patient || {}
    if (Object.keys(patientData).length > 0) {
      vitalSigns = {
        bloodPressureSystolic: patientData.bloodPressureSystolic || patientData.tensionSystolique,
        bloodPressureDiastolic: patientData.bloodPressureDiastolic || patientData.tensionDiastolique,
        bloodGlucose: patientData.bloodGlucose || patientData.glycemie,
        weight: patientData.poids || patientData.weight,
        height: patientData.taille || patientData.height,
        temperature: patientData.temperature,
        heartRate: patientData.heartRate || patientData.frequenceCardiaque
      }
    }

    if (medicalReport?.patient) {
      const mrPatient = medicalReport.patient
      vitalSigns = {
        ...vitalSigns,
        bloodPressureSystolic: vitalSigns.bloodPressureSystolic || mrPatient.bloodPressureSystolic,
        bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic || mrPatient.bloodPressureDiastolic,
        bloodGlucose: vitalSigns.bloodGlucose || mrPatient.bloodGlucose,
        weight: vitalSigns.weight || mrPatient.weight,
        height: vitalSigns.height || mrPatient.height,
        temperature: vitalSigns.temperature || mrPatient.temperature
      }
    }

    // Extract chief complaint
    const chiefComplaint =
      rapport.motifConsultation ||
      consultationReportContent.rapport?.motifConsultation ||
      medicalReport?.clinicalEvaluation?.chiefComplaint ||
      record.chief_complaint ||
      'Follow-up consultation'

    // Extract diagnosis
    const diagnosis =
      rapport.syntheseDiagnostique ||
      rapport.conclusionDiagnostique ||
      consultationReportContent.rapport?.syntheseDiagnostique ||
      medicalReport?.diagnosticSummary?.diagnosticConclusion ||
      record.diagnosis ||
      ''

    // Extract prescriptions
    const prescriptions = documentsData.prescriptions || documentsData.ordonnances || {}
    const medications =
      prescriptions.medications?.prescription?.medications ||
      prescriptions.medicaments?.prescription?.medications ||
      prescriptions.medicaments?.prescription?.medicaments ||
      documentsData.medicationPrescription?.prescription?.medications ||
      []

    // Extract lab tests
    const laboratoryData = prescriptions.laboratoryTests || prescriptions.biologie || documentsData.laboratoryTests || {}
    const labTests =
      laboratoryData.prescription?.analyses ||
      laboratoryData.prescription?.tests ||
      laboratoryData.tests ||
      []

    // Extract imaging
    const imagingData = prescriptions.imagingStudies || prescriptions.imagerie || documentsData.paraclinicalExams || {}
    const imagingStudies =
      imagingData.prescription?.examinations ||
      imagingData.prescription?.exams ||
      imagingData.examinations ||
      []

    // Extract images for dermatology
    const images = compteRendu.imageAnalysis?.images || consultationReportContent.imageAnalysis?.images || []

    // Extract diet plan and follow-up
    const dietaryPlan = documentsData.dietaryPlan || record.diet_plan_data || null
    const followUpPlan = documentsData.followUpPlan || record.follow_up_data || null

    // Build full report
    const fullReport = {
      ...documentsData,
      dietaryPlan,
      followUpPlan,
      diet_plan_data: record.diet_plan_data,
      follow_up_data: record.follow_up_data
    }

    const consultation = {
      id: record.id,
      consultationId: record.consultation_id,
      consultationType,
      date: record.created_at,
      chiefComplaint,
      diagnosis,
      medications,
      vitalSigns,
      labTests,
      imagingStudies,
      images,
      dietaryPlan,
      fullReport,
      _lightweight: false  // Full details loaded
    }

    return NextResponse.json({
      success: true,
      consultation
    })

  } catch (error: any) {
    console.error('❌ Consultation detail API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch consultation details'
    }, { status: 500 })
  }
}
