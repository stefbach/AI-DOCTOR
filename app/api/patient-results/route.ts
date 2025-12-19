// app/api/patient-results/route.ts
// API to fetch patient's latest lab and radiology results
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = 'nodejs'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')
    const patientName = searchParams.get('patientName')
    const type = searchParams.get('type') // 'lab', 'radiology', or 'all'

    if (!patientId && !patientName) {
      return NextResponse.json(
        { error: "Patient ID or Patient Name is required" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results: {
      labResults: any | null
      radiologyResults: any | null
      hasLabResults: boolean
      hasRadiologyResults: boolean
    } = {
      labResults: null,
      radiologyResults: null,
      hasLabResults: false,
      hasRadiologyResults: false
    }

    // Fetch Lab Results
    if (type === 'lab' || type === 'all' || !type) {
      let labQuery = supabase
        .from('lab_results')
        .select(`
          id,
          results_data,
          interpretation_notes,
          validated_by,
          validated_at,
          created_at,
          lab_orders!inner (
            id,
            order_number,
            patient_id,
            patient_name,
            tests_ordered,
            scheduled_date,
            results_ready_at,
            clinical_notes
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1)

      // Filter by patient_id or patient_name
      if (patientId) {
        labQuery = labQuery.eq('lab_orders.patient_id', patientId)
      } else if (patientName) {
        // Use ilike for case-insensitive partial match
        labQuery = labQuery.ilike('lab_orders.patient_name', `%${patientName}%`)
      }

      const { data: labData, error: labError } = await labQuery

      if (labError) {
        console.error('Error fetching lab results:', labError)
      } else if (labData && labData.length > 0) {
        results.labResults = labData[0]
        results.hasLabResults = true
      }
    }

    // Fetch Radiology Results
    if (type === 'radiology' || type === 'all' || !type) {
      let radioQuery = supabase
        .from('radiology_results')
        .select(`
          id,
          results_data,
          radiologist_name,
          radiologist_notes,
          validated_at,
          created_at,
          radiology_orders!inner (
            id,
            order_number,
            patient_id,
            patient_name,
            exams_ordered,
            scheduled_date,
            results_ready_at,
            clinical_notes
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1)

      // Filter by patient_id or patient_name
      if (patientId) {
        radioQuery = radioQuery.eq('radiology_orders.patient_id', patientId)
      } else if (patientName) {
        // Use ilike for case-insensitive partial match
        radioQuery = radioQuery.ilike('radiology_orders.patient_name', `%${patientName}%`)
      }

      const { data: radioData, error: radioError } = await radioQuery

      if (radioError) {
        console.error('Error fetching radiology results:', radioError)
      } else if (radioData && radioData.length > 0) {
        results.radiologyResults = radioData[0]
        results.hasRadiologyResults = true
      }
    }

    return NextResponse.json({
      success: true,
      patientId,
      patientName,
      ...results
    })

  } catch (error: any) {
    console.error("Patient Results API Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch patient results", details: error.message },
      { status: 500 }
    )
  }
}
