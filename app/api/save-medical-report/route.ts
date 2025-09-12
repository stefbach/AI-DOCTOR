import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Keep existing interface and add new fields
interface StoredReport {
  id: string
  patientId: string
  content: any
  status: 'draft' | 'validated'
  metadata: any
  createdAt: Date
  updatedAt: Date
  // New fields for signatures
  doctorId?: string
  doctorName?: string
  patientName?: string
  signatures?: any
  documentValidations?: any
}

// Keep existing memory storage (your current implementation)
const memoryStorage = new Map<string, StoredReport>()

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ehlqjfuutyhpbrqcvdut.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to sync with Supabase (enhanced version)
async function syncWithSupabase(reportData: any, action: string) {
  try {
    // Check if Supabase sync is enabled
    const enableSync = process.env.ENABLE_SUPABASE_SYNC !== 'false' // Default to true
    
    if (!enableSync) {
      console.log('Supabase sync disabled, using memory storage only')
      return { success: false, reason: 'disabled' }
    }

    const { 
      consultationId,
      patientId,
      doctorId,
      doctorName,
      patientName,
      report,
      metadata,
      patientData,
      clinicalData,
      diagnosisData
    } = reportData

    // Extract report sections and prescriptions
    const reportSections = report?.compteRendu?.rapport || {}
    const prescriptions = report?.ordonnances || {}
    
    // Build the documents_data JSON object
    const documentsData = {
      consultationReport: report?.compteRendu || {},
      prescriptions: prescriptions,
      invoice: report?.invoice || {},
      lastModified: new Date().toISOString(),
      editedSections: metadata?.modifiedSections || []
    }

    // Build prescription_data JSON object
    const prescriptionData = {
      medications: prescriptions?.medicaments?.prescription?.medicaments || [],
      laboratoryTests: prescriptions?.biologie?.prescription?.analyses || {},
      imagingStudies: prescriptions?.imagerie?.prescription?.examens || [],
      generatedAt: new Date().toISOString()
    }

    // Prepare data for Supabase
    const supabaseData = {
      consultation_id: consultationId || `consultation_${Date.now()}`,
      patient_id: patientId,
      doctor_id: doctorId,
      doctor_name: doctorName,
      patient_name: patientName,
      
      // Store complete data in JSONB fields
      documents_data: documentsData,
      prescription_data: prescriptionData,
      patient_data: patientData || {},
      clinical_data: clinicalData || {},
      diagnosis_data: diagnosisData || {},
      
      // Extract key fields for querying
      chief_complaint: reportSections.motifConsultation || '',
      diagnosis: reportSections.conclusionDiagnostique || '',
      
      // Status fields
      documents_status: action === 'validate' ? 'validated' : 'draft',
      prescription_status: action === 'validate' ? 'validated' : 'pending_validation',
      
      // Prescription flags
      has_prescriptions: (prescriptions?.medicaments?.prescription?.medicaments?.length || 0) > 0,
      has_lab_requests: Object.keys(prescriptions?.biologie?.prescription?.analyses || {}).length > 0,
      has_imaging_requests: (prescriptions?.imagerie?.prescription?.examens?.length || 0) > 0,
      has_invoice: !!report?.invoice,
      
      // Metadata
      signatures: metadata?.signatures || {},
      document_validations: metadata?.documentValidations || {},
      updated_at: new Date().toISOString()
    }

    if (action === 'validate') {
      supabaseData.prescription_validated_at = new Date().toISOString()
    }

    // Check if record exists
    const { data: existingRecord } = await supabase
      .from('consultation_records')
      .select('id')
      .eq('consultation_id', consultationId)
      .single()

    let result
    
    if (existingRecord) {
      // Update existing record
      result = await supabase
        .from('consultation_records')
        .update(supabaseData)
        .eq('consultation_id', consultationId)
        .select()
        .single()
    } else {
      // Insert new record
      result = await supabase
        .from('consultation_records')
        .insert({
          ...supabaseData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Supabase sync error:', result.error)
      return { success: false, error: result.error }
    }

    console.log('✅ Synced with Supabase successfully')
    return { success: true, data: result.data }
    
  } catch (error) {
    console.error('Supabase sync error (non-blocking):', error)
    // Don't fail the main operation if sync fails
    return { success: false, error }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      reportId, 
      patientId, 
      report, 
      action, 
      metadata,
      // New fields for signatures and Supabase
      consultationId,
      doctorId,
      doctorName,
      patientName,
      patientData,
      clinicalData,
      diagnosisData
    } = body

    console.log(`📝 Action de sauvegarde: ${action} pour patient: ${patientId}`)

    if (!patientId || !report) {
      return NextResponse.json({
        success: false,
        error: "Données manquantes: patientId et report sont requis"
      }, { status: 400 })
    }

    const now = new Date()
    
    // Try to sync with Supabase first
    const supabaseSync = await syncWithSupabase({
      consultationId: consultationId || reportId,
      patientId,
      doctorId,
      doctorName,
      patientName,
      report,
      metadata,
      patientData,
      clinicalData,
      diagnosisData
    }, action)

    // If Supabase sync succeeded, return that result
    if (supabaseSync.success) {
      return NextResponse.json({
        success: true,
        data: {
          reportId: consultationId || reportId,
          status: action === 'validate' ? 'validated' : 'draft',
          savedAt: now.toISOString(),
          storage: 'supabase',
          report: report // Return full report for compatibility
        }
      })
    }

    // Fallback to memory storage if Supabase fails
    console.log('Using memory storage fallback')
    
    if (action === 'save') {
      // Keep existing save logic for memory storage
      const id = reportId || `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const existingReport = reportId ? memoryStorage.get(reportId) : null
      
      const reportToSave: StoredReport = {
        id,
        patientId,
        content: report,
        status: metadata?.validationStatus || 'draft',
        metadata: {
          ...metadata,
          lastModified: now.toISOString(),
          // Add signature metadata if provided
          signatures: metadata?.signatures || {},
          documentValidations: metadata?.documentValidations || {}
        },
        createdAt: existingReport?.createdAt || now,
        updatedAt: now,
        // Add new fields
        doctorId: doctorId || existingReport?.doctorId,
        doctorName: doctorName || existingReport?.doctorName,
        patientName: patientName || existingReport?.patientName,
        signatures: metadata?.signatures || existingReport?.signatures || {},
        documentValidations: metadata?.documentValidations || existingReport?.documentValidations || {}
      }
      
      memoryStorage.set(id, reportToSave)
      
      console.log(`✅ Rapport sauvegardé avec ID: ${id} (memory storage)`)
      
      return NextResponse.json({
        success: true,
        data: {
          reportId: id,
          status: reportToSave.status,
          savedAt: now.toISOString(),
          storage: 'memory',
          report: reportToSave // Return full report for compatibility
        }
      })
    }
    
    if (action === 'validate') {
      // Keep existing validation logic
      if (!reportId) {
        return NextResponse.json({
          success: false,
          error: "reportId requis pour la validation"
        }, { status: 400 })
      }
      
      const existingReport = memoryStorage.get(reportId)
      if (!existingReport) {
        return NextResponse.json({
          success: false,
          error: "Rapport non trouvé"
        }, { status: 404 })
      }
      
      // Valider et verrouiller le rapport avec signatures
      const validatedReport: StoredReport = {
        ...existingReport,
        content: report,
        status: 'validated',
        metadata: {
          ...existingReport.metadata,
          ...metadata,
          validatedAt: now.toISOString(),
          validatedBy: doctorName || metadata?.validatedBy || 'Doctor',
          locked: true,
          // Include final signatures
          signatures: metadata?.signatures || existingReport.signatures,
          documentValidations: metadata?.documentValidations || existingReport.documentValidations
        },
        updatedAt: now,
        // Update signature fields
        signatures: metadata?.signatures || existingReport.signatures,
        documentValidations: metadata?.documentValidations || existingReport.documentValidations
      }
      
      memoryStorage.set(reportId, validatedReport)
      
      console.log(`✅ Rapport validé: ${reportId} (memory storage)`)
      
      return NextResponse.json({
        success: true,
        data: {
          reportId,
          status: 'validated',
          validatedAt: now.toISOString(),
          storage: 'memory',
          report: validatedReport // Return full report for compatibility
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: `Action non reconnue: ${action}`
    }, { status: 400 })
    
  } catch (error) {
    console.error("❌ Erreur API save-medical-report:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    }, { status: 500 })
  }
}

// Keep your existing GET function with Supabase integration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const reportId = searchParams.get('reportId')
    const consultationId = searchParams.get('consultationId')
    
    console.log(`🔍 Recherche rapport - patientId: ${patientId}, reportId: ${reportId}, consultationId: ${consultationId}`)
    
    // Try Supabase first
    if (consultationId) {
      const { data, error } = await supabase
        .from('consultation_records')
        .select('*')
        .eq('consultation_id', consultationId)
        .single()
      
      if (data && !error) {
        return NextResponse.json({
          success: true,
          data: {
            id: data.id,
            consultationId: data.consultation_id,
            content: data.documents_data || {},
            status: data.documents_status,
            metadata: {
              wordCount: data.documents_data?.wordCount,
              validationStatus: data.documents_status
            },
            signatures: data.signatures,
            documentValidations: data.document_validations,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            storage: 'supabase'
          }
        })
      }
    }
    
    // Fallback to memory storage
    if (reportId) {
      // Keep existing search by ID logic
      const report = memoryStorage.get(reportId)
      if (report) {
        return NextResponse.json({
          success: true,
          data: {
            id: report.id,
            content: report.content,
            status: report.status,
            metadata: report.metadata,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
            // Add signature data to response
            signatures: report.signatures,
            documentValidations: report.documentValidations,
            storage: 'memory'
          }
        })
      }
    }
    
    if (patientId) {
      // Keep existing search by patient logic
      let latestReport: StoredReport | null = null
      
      for (const [_, report] of memoryStorage) {
        if (report.patientId === patientId) {
          if (!latestReport || report.updatedAt > latestReport.updatedAt) {
            latestReport = report
          }
        }
      }
      
      if (latestReport) {
        console.log(`✅ Rapport trouvé pour patient ${patientId}: ${latestReport.id}`)
        return NextResponse.json({
          success: true,
          data: {
            id: latestReport.id,
            content: latestReport.content,
            status: latestReport.status,
            metadata: latestReport.metadata,
            createdAt: latestReport.createdAt,
            updatedAt: latestReport.updatedAt,
            // Add signature data
            signatures: latestReport.signatures,
            documentValidations: latestReport.documentValidations,
            storage: 'memory'
          }
        })
      }
    }
    
    console.log("❌ Aucun rapport trouvé")
    return NextResponse.json({
      success: false,
      error: "Aucun rapport trouvé"
    }, { status: 404 })
    
  } catch (error) {
    console.error("❌ Erreur API get-medical-report:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    }, { status: 500 })
  }
}

// Keep your existing DELETE function unchanged
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')
    
    if (!reportId) {
      return NextResponse.json({
        success: false,
        error: "reportId requis"
      }, { status: 400 })
    }
    
    const report = memoryStorage.get(reportId)
    if (!report) {
      return NextResponse.json({
        success: false,
        error: "Rapport non trouvé"
      }, { status: 404 })
    }
    
    if (report.status === 'validated') {
      return NextResponse.json({
        success: false,
        error: "Impossible de supprimer un rapport validé"
      }, { status: 403 })
    }
    
    memoryStorage.delete(reportId)
    
    console.log(`🗑️ Rapport supprimé: ${reportId}`)
    
    return NextResponse.json({
      success: true,
      message: "Rapport supprimé avec succès"
    })
    
  } catch (error) {
    console.error("❌ Erreur API delete-medical-report:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    }, { status: 500 })
  }
}

// Keep your existing note about database options
// Note: Cette implémentation utilise un stockage en mémoire temporaire.
// Pour une application en production, remplacez par une vraie base de données:
// - PostgreSQL avec Prisma
// - MongoDB
// - Firebase Firestore
// - Supabase
// etc.
