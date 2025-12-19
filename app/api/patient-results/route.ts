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
      // First, find the lab order for this patient
      let labOrderQuery = supabase
        .from('lab_orders')
        .select('id, order_number, patient_id, patient_name, tests_ordered, scheduled_date, results_ready_at, clinical_notes')
        .order('created_at', { ascending: false })
        .limit(1)

      if (patientId) {
        labOrderQuery = labOrderQuery.eq('patient_id', patientId)
      } else if (patientName) {
        labOrderQuery = labOrderQuery.ilike('patient_name', `%${patientName}%`)
      }

      const { data: labOrderData, error: labOrderError } = await labOrderQuery

      if (labOrderError) {
        console.error('Error fetching lab orders:', labOrderError)
      } else if (labOrderData && labOrderData.length > 0) {
        const labOrderId = labOrderData[0].id

        // Now fetch the results for this order
        const { data: labResultData, error: labResultError } = await supabase
          .from('lab_results')
          .select('id, results_data, interpretation_notes, validated_by, validated_at, created_at')
          .eq('lab_order_id', labOrderId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (labResultError) {
          console.error('Error fetching lab results:', labResultError)
        } else if (labResultData && labResultData.length > 0) {
          results.labResults = {
            ...labResultData[0],
            lab_orders: labOrderData[0]
          }
          results.hasLabResults = true
        }
      }
    }

    // Fetch Radiology Results
    if (type === 'radiology' || type === 'all' || !type) {
      // First, find the radiology order for this patient
      let radioOrderQuery = supabase
        .from('radiology_orders')
        .select('id, order_number, patient_id, patient_name, exams_ordered, scheduled_date, results_ready_at, clinical_notes')
        .order('created_at', { ascending: false })
        .limit(1)

      if (patientId) {
        radioOrderQuery = radioOrderQuery.eq('patient_id', patientId)
      } else if (patientName) {
        radioOrderQuery = radioOrderQuery.ilike('patient_name', `%${patientName}%`)
      }

      const { data: radioOrderData, error: radioOrderError } = await radioOrderQuery

      if (radioOrderError) {
        console.error('Error fetching radiology orders:', radioOrderError)
      } else if (radioOrderData && radioOrderData.length > 0) {
        const radioOrderId = radioOrderData[0].id

        // Now fetch the results for this order
        const { data: radioResultData, error: radioResultError } = await supabase
          .from('radiology_results')
          .select('id, results_data, radiologist_name, radiologist_notes, validated_at, created_at')
          .eq('radiology_order_id', radioOrderId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (radioResultError) {
          console.error('Error fetching radiology results:', radioResultError)
        } else if (radioResultData && radioResultData.length > 0) {
          results.radiologyResults = {
            ...radioResultData[0],
            radiology_orders: radioOrderData[0]
          }
          results.hasRadiologyResults = true
        }
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
