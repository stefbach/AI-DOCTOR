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
    if (!criteria.name && !criteria.email && !criteria.phone && !criteria.nationalId && !criteria.dateOfBirth) {
      return NextResponse.json({
        success: false,
        error: 'At least one search criterion is required'
      }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from('consultation_records')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Apply filters based on criteria
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
      
      // Detect consultation type
      let consultationType: 'normal' | 'dermatology' | 'chronic' = 'normal'
      if (record.consultation_type) {
        consultationType = record.consultation_type
      } else if (documentsData.compteRendu?.header?.consultationType?.toLowerCase().includes('dermatology')) {
        consultationType = 'dermatology'
      } else if (documentsData.medicalReport?.chronicDiseaseAssessment) {
        consultationType = 'chronic'
      }
      
      // Extract vital signs (try different structures)
      let vitalSigns = {}
      
      // From Mauritian structure (compteRendu)
      if (documentsData.compteRendu?.patient) {
        const patient = documentsData.compteRendu.patient
        vitalSigns = {
          bloodPressureSystolic: patient.bloodPressureSystolic || patient.tensionSystolique,
          bloodPressureDiastolic: patient.bloodPressureDiastolic || patient.tensionDiastolique,
          bloodGlucose: patient.bloodGlucose || patient.glycemie,
          weight: patient.poids || patient.weight,
          height: patient.taille || patient.height,
          temperature: patient.temperature,
          heartRate: patient.heartRate || patient.frequenceCardiaque
        }
      }
      
      // From medicalReport structure (chronic)
      if (documentsData.medicalReport?.patient) {
        const patient = documentsData.medicalReport.patient
        vitalSigns = {
          ...vitalSigns,
          bloodPressureSystolic: vitalSigns.bloodPressureSystolic || patient.bloodPressureSystolic,
          bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic || patient.bloodPressureDiastolic,
          bloodGlucose: vitalSigns.bloodGlucose || patient.bloodGlucose,
          weight: vitalSigns.weight || patient.weight,
          height: vitalSigns.height || patient.height,
          temperature: vitalSigns.temperature || patient.temperature
        }
      }
      
      // Extract other data
      const chiefComplaint = 
        documentsData.compteRendu?.rapport?.motifConsultation ||
        documentsData.medicalReport?.clinicalEvaluation?.chiefComplaint ||
        'Follow-up consultation'
      
      const diagnosis = 
        documentsData.compteRendu?.rapport?.syntheseDiagnostique ||
        documentsData.medicalReport?.diagnosticSummary?.diagnosticConclusion ||
        ''
      
      const medications = 
        documentsData.ordonnances?.medicaments?.prescription?.medications ||
        documentsData.medicationPrescription?.prescription?.medications ||
        []
      
      const labTests = 
        documentsData.ordonnances?.biologie?.prescription?.analyses ||
        documentsData.laboratoryTests?.prescription?.tests ||
        []
      
      const imagingStudies = 
        documentsData.ordonnances?.imagerie?.prescription?.examinations ||
        documentsData.paraclinicalExams?.prescription?.exams ||
        []
      
      const images = documentsData.compteRendu?.imageAnalysis?.images || []
      
      const dietaryPlan = documentsData.dietaryPlan || null
      
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
