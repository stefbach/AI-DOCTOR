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

interface PatientSearchCriteria {
  patientId?: string
  consultationId?: string  // Can be used to find patient by consultation
  name?: string
  email?: string
  phone?: string
  nationalId?: string
  dateOfBirth?: string
  limit?: number  // Number of records to fetch (default 10)
  offset?: number // Number of records to skip (for pagination)
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
    let isNewConsultation = false
    let singleConsultationData = null  // Store single consultation data if consultationId is provided

    if (!resolvedPatientId && criteria.consultationId) {
      console.log('🔍 Looking up consultation by ID:', criteria.consultationId)
      // When consultationId is provided, fetch the FULL consultation record directly
      const { data: consultationRecord, error: lookupError } = await supabase
        .from('consultation_records')
        .select('*')  // ✅ Select ALL columns including medical_report, prescriptions, etc.
        .eq('consultation_id', criteria.consultationId)
        .single()

      if (!lookupError && consultationRecord) {
        resolvedPatientId = consultationRecord.patient_id
        singleConsultationData = consultationRecord  // ✅ Store the full record
        console.log('✅ Found consultation record:', {
          consultationId: consultationRecord.consultation_id,
          patientId: consultationRecord.patient_id,
          hasReport: !!consultationRecord.medical_report
        })
      } else {
        console.log('⚠️ Could not find consultation - this is likely a NEW consultation')
        isNewConsultation = true
      }
    }

    // If this is a new consultation (consultationId provided but not found in our database)
    // and we have no patientId to look up by, return empty result immediately
    // This prevents querying all records when there's no valid filter
    if (isNewConsultation && !resolvedPatientId && !criteria.name && !criteria.email && !criteria.phone) {
      console.log('📋 New consultation detected with no patient history - returning empty result')
      return NextResponse.json({
        success: true,
        consultations: [],
        count: 0
      })
    }

    // ✅ If we have a single consultation record, return it directly with fullReport
    if (singleConsultationData) {
      console.log('📄 Returning single consultation with full report')
      
      const fullReport = {
        medicalReport: singleConsultationData.medical_report,
        prescriptions: singleConsultationData.prescriptions,
        labOrders: singleConsultationData.lab_orders,
        imagingOrders: singleConsultationData.imaging_orders
      }
      
      return NextResponse.json({
        success: true,
        consultations: [{
          id: singleConsultationData.id,
          consultationId: singleConsultationData.consultation_id,
          consultationType: singleConsultationData.consultation_type || 'standard',
          date: singleConsultationData.created_at || singleConsultationData.consultation_date,
          chiefComplaint: singleConsultationData.chief_complaint || 'Voice Dictation Consultation',
          diagnosis: singleConsultationData.diagnosis || '',
          medications: [],
          vitalSigns: {},
          labTests: [],
          imagingStudies: [],
          images: [],
          dietaryPlan: null,
          fullReport: fullReport,  // ✅ Include the full report!
          _lightweight: false
        }],
        count: 1,
        totalCount: 1,
        hasMore: false
      })
    }

    // Build query with pagination to prevent timeout
    // OPTIMIZATION: Only select essential columns for list view
    // Exclude documents_data (large JSON blobs) - fetch on demand via /api/consultation-detail
    const queryLimit = criteria.limit || 10
    const queryOffset = criteria.offset || 0

    // Essential columns for list view (excludes documents_data to prevent Supabase overload)
    const listViewColumns = `
      id,
      consultation_id,
      patient_id,
      patient_name,
      patient_email,
      patient_phone,
      chief_complaint,
      diagnosis,
      consultation_type,
      created_at,
      updated_at
    `

    let query = supabase
      .from('consultation_records')
      .select(listViewColumns, { count: 'exact' })  // Only essential columns + count
      .order('created_at', { ascending: false })
      .range(queryOffset, queryOffset + queryLimit - 1)

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
      } else {
        // Safety check: if we have no filters at all, return empty result
        // This prevents returning ALL records from the database
        console.log('⚠️ No valid filters to apply - returning empty result to prevent unfiltered query')
        return NextResponse.json({
          success: true,
          consultations: [],
          count: 0
        })
      }
    }

    const { data, error, count: totalCount } = await query

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
        count: 0,
        totalCount: totalCount || 0,
        hasMore: false
      })
    }

    console.log(`✅ Found ${data.length} consultation(s), total: ${totalCount}`)

    // Transform data to consultation history format (lightweight - no documents_data)
    // Full details are fetched on-demand via /api/consultation-detail
    const consultations = data.map((record, index) => {
      try {
        // Use direct columns only (no documents_data parsing needed)
        const consultationType = record.consultation_type || 'normal'

        return {
          id: record.id,
          consultationId: record.consultation_id,
          consultationType,
          date: record.created_at,
          chiefComplaint: record.chief_complaint || 'Follow-up consultation',
          diagnosis: record.diagnosis || '',
          // These will be populated when user views details via /api/consultation-detail
          medications: [],
          vitalSigns: {},
          labTests: [],
          imagingStudies: [],
          images: [],
          dietaryPlan: null,
          fullReport: null,  // null indicates details need to be fetched
          // Flag to indicate this is a lightweight record
          _lightweight: true
        }
      } catch (recordError: any) {
        console.error(`❌ Error transforming record ${index}:`, recordError?.message, 'Record ID:', record?.id)
        return {
          id: record?.id || `error-${index}`,
          consultationId: record?.consultation_id || null,
          consultationType: 'normal' as const,
          date: record?.created_at || new Date().toISOString(),
          chiefComplaint: 'Error loading consultation',
          diagnosis: '',
          medications: [],
          vitalSigns: {},
          labTests: [],
          imagingStudies: [],
          images: [],
          dietaryPlan: null,
          fullReport: null,
          _lightweight: true
        }
      }
    })

    const hasMore = totalCount ? (queryOffset + data.length) < totalCount : false

    return NextResponse.json({
      success: true,
      consultations,
      count: consultations.length,
      totalCount: totalCount || consultations.length,
      hasMore
    })

  } catch (error: any) {
    console.error('❌ Patient history API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch patient history'
    }, { status: 500 })
  }
}
