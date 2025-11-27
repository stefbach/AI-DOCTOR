// app/api/patient-history/route.ts
// API endpoint for retrieving patient consultation history

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

interface PatientSearchCriteria {
  patientId?: string
  consultationId?: string  // Can be used to find patient by consultation
  name?: string
  email?: string
  phone?: string
  nationalId?: string
  dateOfBirth?: string
}

/**
 * POST /api/patient-history
 * Retrieve consultation history for a patient
 *
 * Request body:
 * {
 *   patientId?: string,
 *   name?: string,
 *   email?: string,
 *   phone?: string,
 *   nationalId?: string,
 *   dateOfBirth?: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   consultations: ConsultationHistoryItem[],
 *   count: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 })
    }

    const criteria: PatientSearchCriteria = await req.json()

    console.log('🔍 Patient history search with criteria:', criteria)

    // Validate at least one search criterion
    if (!criteria.patientId && !criteria.consultationId && !criteria.name && !criteria.email && !criteria.phone && !criteria.nationalId && !criteria.dateOfBirth) {
      return NextResponse.json({
        success: false,
        error: 'At least one search criterion is required'
      }, { status: 400 })
    }

    // If consultationId is provided, first find the patient_id from that consultation
    let resolvedPatientId = criteria.patientId
    if (!resolvedPatientId && criteria.consultationId) {
      console.log('🔍 Looking up patient_id from consultation:', criteria.consultationId)
      const { data: consultationRecord, error: lookupError } = await supabase
        .from('consultation_records')
        .select('patient_id')
        .eq('consultation_id', criteria.consultationId)
        .single()

      if (!lookupError && consultationRecord?.patient_id) {
        resolvedPatientId = consultationRecord.patient_id
        console.log('✅ Found patient_id from consultation:', resolvedPatientId)
      } else {
        console.log('⚠️ Could not find patient_id from consultation')
      }
    }

    // Build query
    let query = supabase
      .from('consultation_records')
      .select('*')
      .order('created_at', { ascending: false })

    // If patientId is provided or resolved, use it directly (most reliable)
    if (resolvedPatientId) {
      query = query.eq('patient_id', resolvedPatientId)
    } else {
      // Apply filters based on other criteria
      const orConditions: string[] = []

      if (criteria.name) {
        // Search in patient_name field (case-insensitive)
        orConditions.push(`patient_name.ilike.%${criteria.name}%`)
      }

      if (criteria.email) {
        orConditions.push(`patient_email.eq.${criteria.email}`)
      }

      if (criteria.phone) {
        // Normalize phone number (remove spaces, dashes)
        const normalizedPhone = criteria.phone.replace(/[\s\-\(\)]/g, '')
        orConditions.push(`patient_phone.ilike.%${normalizedPhone}%`)
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','))
      }
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Supabase query error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No consultations found')
      return NextResponse.json({
        success: true,
        consultations: [],
        count: 0
      })
    }

    console.log(`✅ Found ${data.length} consultation(s)`)
    
    // Transform data to consultation history format
    const consultations = data.map(record => {
      const documentsData = record.documents_data || {}

      // The data is saved in different structures depending on how it was saved:
      // - New format: consultationReport.content contains compteRendu structure
      // - Legacy format: compteRendu at root level
      const consultationReportContent = documentsData.consultationReport?.content || {}
      const compteRendu = documentsData.compteRendu || consultationReportContent || {}
      const rapport = compteRendu.rapport || consultationReportContent.rapport || {}
      const medicalReport = documentsData.consultationReport?.medicalReport || documentsData.medicalReport || {}

      // Debug: Log the structure for troubleshooting
      console.log('📋 Data structure keys:', Object.keys(documentsData))
      console.log('📋 consultationReport keys:', documentsData.consultationReport ? Object.keys(documentsData.consultationReport) : 'none')

      // Detect consultation type
      let consultationType: 'normal' | 'dermatology' | 'chronic' = 'normal'
      if (record.consultation_type) {
        consultationType = record.consultation_type
      } else if (compteRendu.header?.consultationType?.toLowerCase().includes('dermatology')) {
        consultationType = 'dermatology'
      } else if (medicalReport?.chronicDiseaseAssessment) {
        consultationType = 'chronic'
      }

      // Extract vital signs (try different structures)
      let vitalSigns: any = {}

      // From compteRendu.patient (may be in consultationReport.content or directly)
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

      // From medicalReport structure (chronic)
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

      // Extract chief complaint from multiple possible paths
      const chiefComplaint =
        rapport.motifConsultation ||
        consultationReportContent.rapport?.motifConsultation ||
        medicalReport?.clinicalEvaluation?.chiefComplaint ||
        record.chief_complaint ||
        'Follow-up consultation'

      // Extract diagnosis from multiple possible paths
      const diagnosis =
        rapport.syntheseDiagnostique ||
        rapport.conclusionDiagnostique ||
        consultationReportContent.rapport?.syntheseDiagnostique ||
        medicalReport?.diagnosticSummary?.diagnosticConclusion ||
        record.diagnosis ||
        ''

      // Extract prescriptions from multiple possible paths
      const prescriptions = documentsData.prescriptions || documentsData.ordonnances || {}
      const medications =
        prescriptions.medications?.prescription?.medications ||
        prescriptions.medicaments?.prescription?.medications ||
        prescriptions.medicaments?.prescription?.medicaments ||
        documentsData.medicationPrescription?.prescription?.medications ||
        []

      // Extract lab tests from multiple possible paths
      const laboratoryData = prescriptions.laboratoryTests || prescriptions.biologie || documentsData.laboratoryTests || {}
      const labTests =
        laboratoryData.prescription?.analyses ||
        laboratoryData.prescription?.tests ||
        laboratoryData.tests ||
        []

      // Extract imaging from multiple possible paths
      const imagingData = prescriptions.imagingStudies || prescriptions.imagerie || documentsData.paraclinicalExams || {}
      const imagingStudies =
        imagingData.prescription?.examinations ||
        imagingData.prescription?.exams ||
        imagingData.examinations ||
        []

      // Extract images for dermatology
      const images = compteRendu.imageAnalysis?.images || consultationReportContent.imageAnalysis?.images || []

      // Extract diet plan
      const dietaryPlan = documentsData.dietaryPlan || record.diet_plan_data || null
      
      return {
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
        fullReport: documentsData
      }
    })
    
    return NextResponse.json({
      success: true,
      consultations,
      count: consultations.length
    })

  } catch (error: any) {
    console.error('❌ Patient history API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch patient history'
    }, { status: 500 })
  }
}
