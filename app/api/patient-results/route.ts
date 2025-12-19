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
    const type = searchParams.get('type') // 'lab', 'radiology', or 'all'

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
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
      const { data: labData, error: labError } = await supabase
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
            tests_ordered,
            scheduled_date,
            results_ready_at,
            clinical_notes
          )
        `)
        .eq('lab_orders.patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (labError) {
        console.error('Error fetching lab results:', labError)
      } else if (labData && labData.length > 0) {
        results.labResults = labData[0]
        results.hasLabResults = true
      }
    }

    // Fetch Radiology Results
    if (type === 'radiology' || type === 'all' || !type) {
      const { data: radioData, error: radioError } = await supabase
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
            exams_ordered,
            scheduled_date,
            results_ready_at,
            clinical_notes
          )
        `)
        .eq('radiology_orders.patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)

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
