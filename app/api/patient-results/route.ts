// app/api/patient-results/route.ts
// API to fetch patient's latest lab and radiology results
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = 'nodejs'

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

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      })
      return NextResponse.json(
        { error: "Server configuration error - missing Supabase credentials" },
        { status: 500 }
      )
    }

    // Create Supabase client with anon key (same as other APIs)
    // Note: RLS policies must allow SELECT for authenticated users on lab/radiology tables
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Debug info to track what's happening
    const debug: any = {
      searchedPatientName: patientName,
      searchedPatientId: patientId
    }

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
    // Step 1: Find lab_orders for this patient
    // Step 2: Get lab_results for those orders
    if (type === 'lab' || type === 'all' || !type) {
      // Step 1: Query lab_orders to find patient's orders
      const { data: allLabOrders, error: labOrdersError } = await supabase
        .from('lab_orders')
        .select('id, order_number, patient_id, patient_name, tests_ordered, scheduled_date, results_ready_at, clinical_notes')
        .order('created_at', { ascending: false })

      debug.labOrdersCount = allLabOrders?.length || 0
      debug.labOrdersError = labOrdersError?.message || null

      if (labOrdersError) {
        console.error('Error fetching lab orders:', labOrdersError)
      } else if (allLabOrders && allLabOrders.length > 0) {
        // Log all patient names for debugging
        debug.labOrderPatientNames = allLabOrders.slice(0, 10).map(o => o.patient_name)

        // Find matching order by patient
        let matchedOrder = null

        for (const order of allLabOrders) {
          if (patientId && order.patient_id === patientId) {
            matchedOrder = order
            break
          } else if (patientName) {
            const orderPatientName = (order.patient_name || '').toLowerCase()
            const searchName = patientName.toLowerCase()
            // Flexible matching
            if (orderPatientName.includes(searchName) || searchName.includes(orderPatientName) ||
                orderPatientName.split(' ').some((part: string) => searchName.includes(part)) ||
                searchName.split(' ').some((part: string) => orderPatientName.includes(part))) {
              matchedOrder = order
              break
            }
          }
        }

        debug.matchedLabOrder = matchedOrder ? { id: matchedOrder.id, patient_name: matchedOrder.patient_name } : null

        // Step 2: If we found an order, get the results
        if (matchedOrder) {
          const { data: labResultData, error: labResultError } = await supabase
            .from('lab_results')
            .select('id, results_data, interpretation_notes, validated_by, validated_at, created_at')
            .eq('lab_order_id', matchedOrder.id)
            .order('created_at', { ascending: false })
            .limit(1)

          debug.labResultsCount = labResultData?.length || 0
          debug.labResultsError = labResultError?.message || null

          if (labResultError) {
            console.error('Error fetching lab results:', labResultError)
          } else if (labResultData && labResultData.length > 0) {
            results.labResults = {
              ...labResultData[0],
              lab_orders: matchedOrder
            }
            results.hasLabResults = true
          }
        }
      }
    }

    // Fetch Radiology Results
    // Step 1: Find radiology_orders for this patient
    // Step 2: Get radiology_results for those orders
    if (type === 'radiology' || type === 'all' || !type) {
      // Step 1: Query radiology_orders to find patient's orders
      const { data: allRadioOrders, error: radioOrdersError } = await supabase
        .from('radiology_orders')
        .select('id, order_number, patient_id, patient_name, exams_ordered, scheduled_date, results_ready_at, clinical_notes')
        .order('created_at', { ascending: false })

      debug.radioOrdersCount = allRadioOrders?.length || 0
      debug.radioOrdersError = radioOrdersError?.message || null

      if (radioOrdersError) {
        console.error('Error fetching radiology orders:', radioOrdersError)
      } else if (allRadioOrders && allRadioOrders.length > 0) {
        // Log all patient names for debugging
        debug.radioOrderPatientNames = allRadioOrders.slice(0, 10).map(o => o.patient_name)

        // Find matching order by patient
        let matchedOrder = null

        for (const order of allRadioOrders) {
          if (patientId && order.patient_id === patientId) {
            matchedOrder = order
            break
          } else if (patientName) {
            const orderPatientName = (order.patient_name || '').toLowerCase()
            const searchName = patientName.toLowerCase()
            // Flexible matching
            if (orderPatientName.includes(searchName) || searchName.includes(orderPatientName) ||
                orderPatientName.split(' ').some((part: string) => searchName.includes(part)) ||
                searchName.split(' ').some((part: string) => orderPatientName.includes(part))) {
              matchedOrder = order
              break
            }
          }
        }

        debug.matchedRadioOrder = matchedOrder ? { id: matchedOrder.id, patient_name: matchedOrder.patient_name } : null

        // Step 2: If we found an order, get the results
        if (matchedOrder) {
          const { data: radioResultData, error: radioResultError } = await supabase
            .from('radiology_results')
            .select('id, results_data, radiologist_name, radiologist_notes, validated_at, created_at')
            .eq('radiology_order_id', matchedOrder.id)
            .order('created_at', { ascending: false })
            .limit(1)

          debug.radioResultsCount = radioResultData?.length || 0
          debug.radioResultsError = radioResultError?.message || null

          if (radioResultError) {
            console.error('Error fetching radiology results:', radioResultError)
          } else if (radioResultData && radioResultData.length > 0) {
            results.radiologyResults = {
              ...radioResultData[0],
              radiology_orders: matchedOrder
            }
            results.hasRadiologyResults = true
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      patientId,
      patientName,
      debug, // Include debug info to help diagnose
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
