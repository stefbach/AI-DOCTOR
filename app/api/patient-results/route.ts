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

    // ============ FETCH LAB RESULTS ============
    if (type === 'lab' || type === 'all' || !type) {
      let matchedLabOrders: any[] = []

      // Step 1: Try to find lab_orders by patient_id (exact match)
      if (patientId) {
        const { data: ordersByPatientId, error: ordersByIdError } = await supabase
          .from('lab_orders')
          .select('id, order_number, patient_id, patient_name, tests_ordered, scheduled_date, results_ready_at, clinical_notes')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })

        debug.labOrdersByIdCount = ordersByPatientId?.length || 0
        debug.labOrdersByIdError = ordersByIdError?.message || null

        console.log('📋 Lab orders by patient_id:', {
          patientId,
          count: ordersByPatientId?.length || 0,
          error: ordersByIdError?.message
        })

        if (ordersByPatientId && ordersByPatientId.length > 0) {
          matchedLabOrders = ordersByPatientId
        }
      }

      // Step 2: If no match by ID and we have a name, try by patient_name (case-insensitive)
      if (matchedLabOrders.length === 0 && patientName) {
        const { data: ordersByName, error: ordersByNameError } = await supabase
          .from('lab_orders')
          .select('id, order_number, patient_id, patient_name, tests_ordered, scheduled_date, results_ready_at, clinical_notes')
          .ilike('patient_name', `%${patientName}%`)
          .order('created_at', { ascending: false })

        debug.labOrdersByNameCount = ordersByName?.length || 0
        debug.labOrdersByNameError = ordersByNameError?.message || null

        console.log('📋 Lab orders by patient_name:', {
          patientName,
          count: ordersByName?.length || 0,
          error: ordersByNameError?.message,
          matchedNames: ordersByName?.slice(0, 5).map(o => o.patient_name)
        })

        if (ordersByName && ordersByName.length > 0) {
          matchedLabOrders = ordersByName
        }
      }

      debug.totalMatchedLabOrders = matchedLabOrders.length

      // Step 3: For matched orders, check if lab_results exist
      if (matchedLabOrders.length > 0) {
        // Get all order IDs
        const orderIds = matchedLabOrders.map(o => o.id)

        // Query lab_results for any of these orders
        const selectFields = checkOnly
          ? 'id, lab_order_id'
          : 'id, lab_order_id, results_data, interpretation_notes, validated_by, validated_at, created_at'

        const { data: labResultData, error: labResultError } = await supabase
          .from('lab_results')
          .select(selectFields)
          .in('lab_order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(1)

        debug.labResultsCount = labResultData?.length || 0
        debug.labResultsError = labResultError?.message || null

        console.log('🧪 Lab results query:', {
          orderIds,
          resultsCount: labResultData?.length || 0,
          error: labResultError?.message
        })

        if (labResultError) {
          console.error('Error fetching lab results:', labResultError)
        } else if (labResultData && labResultData.length > 0) {
          results.hasLabResults = true

          // Only include full results if not in checkOnly mode
          if (!checkOnly) {
            // Find the corresponding order for this result
            const resultOrderId = labResultData[0].lab_order_id
            const matchedOrder = matchedLabOrders.find(o => o.id === resultOrderId)

            results.labResults = {
              ...labResultData[0],
              lab_orders: matchedOrder
            }
          }
        }
      }
    }

    // ============ FETCH RADIOLOGY RESULTS ============
    if (type === 'radiology' || type === 'all' || !type) {
      let matchedRadioOrders: any[] = []

      // Step 1: Try to find radiology_orders by patient_id (exact match)
      if (patientId) {
        const { data: ordersByPatientId, error: ordersByIdError } = await supabase
          .from('radiology_orders')
          .select('id, order_number, patient_id, patient_name, exams_ordered, scheduled_date, results_ready_at, clinical_notes')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })

        debug.radioOrdersByIdCount = ordersByPatientId?.length || 0
        debug.radioOrdersByIdError = ordersByIdError?.message || null

        console.log('📋 Radiology orders by patient_id:', {
          patientId,
          count: ordersByPatientId?.length || 0,
          error: ordersByIdError?.message
        })

        if (ordersByPatientId && ordersByPatientId.length > 0) {
          matchedRadioOrders = ordersByPatientId
        }
      }

      // Step 2: If no match by ID and we have a name, try by patient_name (case-insensitive)
      if (matchedRadioOrders.length === 0 && patientName) {
        const { data: ordersByName, error: ordersByNameError } = await supabase
          .from('radiology_orders')
          .select('id, order_number, patient_id, patient_name, exams_ordered, scheduled_date, results_ready_at, clinical_notes')
          .ilike('patient_name', `%${patientName}%`)
          .order('created_at', { ascending: false })

        debug.radioOrdersByNameCount = ordersByName?.length || 0
        debug.radioOrdersByNameError = ordersByNameError?.message || null

        console.log('📋 Radiology orders by patient_name:', {
          patientName,
          count: ordersByName?.length || 0,
          error: ordersByNameError?.message,
          matchedNames: ordersByName?.slice(0, 5).map(o => o.patient_name)
        })

        if (ordersByName && ordersByName.length > 0) {
          matchedRadioOrders = ordersByName
        }
      }

      debug.totalMatchedRadioOrders = matchedRadioOrders.length

      // Step 3: For matched orders, check if radiology_results exist
      if (matchedRadioOrders.length > 0) {
        // Get all order IDs
        const orderIds = matchedRadioOrders.map(o => o.id)

        // Query radiology_results for any of these orders
        const selectFields = checkOnly
          ? 'id, radiology_order_id'
          : 'id, radiology_order_id, results_data, radiologist_name, radiologist_notes, validated_at, created_at'

        const { data: radioResultData, error: radioResultError } = await supabase
          .from('radiology_results')
          .select(selectFields)
          .in('radiology_order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(1)

        debug.radioResultsCount = radioResultData?.length || 0
        debug.radioResultsError = radioResultError?.message || null

        console.log('📷 Radiology results query:', {
          orderIds,
          resultsCount: radioResultData?.length || 0,
          error: radioResultError?.message
        })

        if (radioResultError) {
          console.error('Error fetching radiology results:', radioResultError)
        } else if (radioResultData && radioResultData.length > 0) {
          results.hasRadiologyResults = true

          // Only include full results if not in checkOnly mode
          if (!checkOnly) {
            // Find the corresponding order for this result
            const resultOrderId = radioResultData[0].radiology_order_id
            const matchedOrder = matchedRadioOrders.find(o => o.id === resultOrderId)

            results.radiologyResults = {
              ...radioResultData[0],
              radiology_orders: matchedOrder
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
        labOrdersByIdCount: debug.labOrdersByIdCount,
        labOrdersByNameCount: debug.labOrdersByNameCount,
        totalMatchedLabOrders: debug.totalMatchedLabOrders,
        labResultsCount: debug.labResultsCount,
        radioOrdersByIdCount: debug.radioOrdersByIdCount,
        radioOrdersByNameCount: debug.radioOrdersByNameCount,
        totalMatchedRadioOrders: debug.totalMatchedRadioOrders,
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
