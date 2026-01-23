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
    const checkOnly = searchParams.get('checkOnly') === 'true' // Only check if results exist, don't fetch full data

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
      searchedPatientId: patientId,
      checkOnly: checkOnly
    }

    console.log('🔍 Patient Results API called with:', { patientId, patientName, type, checkOnly })

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

      console.log('📋 Lab orders query result:', {
        count: allLabOrders?.length || 0,
        error: labOrdersError?.message,
        firstFewNames: allLabOrders?.slice(0, 5).map(o => ({ patient_name: o.patient_name, patient_id: o.patient_id }))
      })

      if (labOrdersError) {
        console.error('Error fetching lab orders:', labOrdersError)
      } else if (allLabOrders && allLabOrders.length > 0) {
        // Log all patient names for debugging
        debug.labOrderPatientNames = allLabOrders.slice(0, 10).map(o => o.patient_name)
        debug.labOrderPatientIds = allLabOrders.slice(0, 10).map(o => o.patient_id)

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

        debug.matchedLabOrder = matchedOrder ? { id: matchedOrder.id, patient_name: matchedOrder.patient_name, patient_id: matchedOrder.patient_id } : null

        console.log('🔎 Lab order matching result:', {
          matchedOrder: matchedOrder ? { id: matchedOrder.id, patient_name: matchedOrder.patient_name, patient_id: matchedOrder.patient_id } : null,
          searchedPatientId: patientId,
          searchedPatientName: patientName
        })

        // Step 2: If we found an order, get the results
        if (matchedOrder) {
          // For checkOnly mode, just verify results exist
          const selectFields = checkOnly
            ? 'id'
            : 'id, results_data, interpretation_notes, validated_by, validated_at, created_at'

          const { data: labResultData, error: labResultError } = await supabase
            .from('lab_results')
            .select(selectFields)
            .eq('lab_order_id', matchedOrder.id)
            .order('created_at', { ascending: false })
            .limit(1)

          debug.labResultsCount = labResultData?.length || 0
          debug.labResultsError = labResultError?.message || null

          console.log('🧪 Lab results query result:', {
            orderId: matchedOrder.id,
            resultsCount: labResultData?.length || 0,
            error: labResultError?.message
          })

          if (labResultError) {
            console.error('Error fetching lab results:', labResultError)
          } else if (labResultData && labResultData.length > 0) {
            results.hasLabResults = true
            // Only include full results if not in checkOnly mode
            if (!checkOnly) {
              results.labResults = {
                ...labResultData[0],
                lab_orders: matchedOrder
              }
            }
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

      console.log('📋 Radiology orders query result:', {
        count: allRadioOrders?.length || 0,
        error: radioOrdersError?.message,
        firstFewNames: allRadioOrders?.slice(0, 5).map(o => ({ patient_name: o.patient_name, patient_id: o.patient_id }))
      })

      if (radioOrdersError) {
        console.error('Error fetching radiology orders:', radioOrdersError)
      } else if (allRadioOrders && allRadioOrders.length > 0) {
        // Log all patient names for debugging
        debug.radioOrderPatientNames = allRadioOrders.slice(0, 10).map(o => o.patient_name)
        debug.radioOrderPatientIds = allRadioOrders.slice(0, 10).map(o => o.patient_id)

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

        debug.matchedRadioOrder = matchedOrder ? { id: matchedOrder.id, patient_name: matchedOrder.patient_name, patient_id: matchedOrder.patient_id } : null

        console.log('🔎 Radiology order matching result:', {
          matchedOrder: matchedOrder ? { id: matchedOrder.id, patient_name: matchedOrder.patient_name, patient_id: matchedOrder.patient_id } : null,
          searchedPatientId: patientId,
          searchedPatientName: patientName
        })

        // Step 2: If we found an order, get the results
        if (matchedOrder) {
          // For checkOnly mode, just verify results exist
          const selectFields = checkOnly
            ? 'id'
            : 'id, results_data, radiologist_name, radiologist_notes, validated_at, created_at'

          const { data: radioResultData, error: radioResultError } = await supabase
            .from('radiology_results')
            .select(selectFields)
            .eq('radiology_order_id', matchedOrder.id)
            .order('created_at', { ascending: false })
            .limit(1)

          debug.radioResultsCount = radioResultData?.length || 0
          debug.radioResultsError = radioResultError?.message || null

          console.log('📷 Radiology results query result:', {
            orderId: matchedOrder.id,
            resultsCount: radioResultData?.length || 0,
            error: radioResultError?.message
          })

          if (radioResultError) {
            console.error('Error fetching radiology results:', radioResultError)
          } else if (radioResultData && radioResultData.length > 0) {
            results.hasRadiologyResults = true
            // Only include full results if not in checkOnly mode
            if (!checkOnly) {
              results.radiologyResults = {
                ...radioResultData[0],
                radiology_orders: matchedOrder
              }
            }
          }
        }
      }
    }

    console.log('✅ Patient Results API response:', {
      patientId,
      patientName,
      hasLabResults: results.hasLabResults,
      hasRadiologyResults: results.hasRadiologyResults,
      debugSummary: {
        labOrdersCount: debug.labOrdersCount,
        matchedLabOrder: debug.matchedLabOrder,
        labResultsCount: debug.labResultsCount,
        radioOrdersCount: debug.radioOrdersCount,
        matchedRadioOrder: debug.matchedRadioOrder,
        radioResultsCount: debug.radioResultsCount
      }
    })

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
