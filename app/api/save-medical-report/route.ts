import { NextRequest, NextResponse } from 'next/server'

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

// Supabase configuration for future use (optional)
const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs'

// Function to sync with Supabase (optional - only if you want to use it)
async function syncWithSupabase(reportData: any, action: string) {
  try {
    // Only sync if environment variable is set
    if (process.env.ENABLE_SUPABASE_SYNC === 'true') {
      const supabaseData = {
        consultation_id: reportData.consultationId || `consultation_${Date.now()}`,
        patient_id: reportData.patientId,
        doctor_id: reportData.doctorId || 'default-doctor',
        doctor_name: reportData.doctorName || 'Dr. Default',
        patient_name: reportData.patientName || 'Patient',
        report_content: reportData.content,
        signatures: reportData.signatures || {},
        document_validations: reportData.documentValidations || {},
        validation_status: reportData.status || 'draft',
        validated_at: action === 'validate' ? new Date().toISOString() : null,
        validated_by: action === 'validate' ? reportData.doctorName : null,
        updated_at: new Date().toISOString()
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/medical_reports`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(supabaseData)
      })

      if (response.ok) {
        console.log('✅ Synced with Supabase')
      }
    }
  } catch (error) {
    console.error('Supabase sync error (non-blocking):', error)
    // Don't fail the main operation if sync fails
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
      // New fields for signatures
      consultationId,
      doctorId,
      doctorName,
      patientName
    } = body

    console.log(`📝 Action de sauvegarde: ${action} pour patient: ${patientId}`)

    if (!patientId || !report) {
      return NextResponse.json({
        success: false,
        error: "Données manquantes: patientId et report sont requis"
      }, { status: 400 })
    }

    const now = new Date()
    
    if (action === 'save') {
      // Keep existing save logic
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
      
      // Optional: Sync with Supabase
      await syncWithSupabase({
        ...reportToSave,
        consultationId
      }, 'save')
      
      console.log(`✅ Rapport sauvegardé avec ID: ${id}`)
      
      return NextResponse.json({
        success: true,
        data: {
          reportId: id,
          status: reportToSave.status,
          savedAt: now.toISOString(),
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
      
      // Optional: Sync with Supabase
      await syncWithSupabase({
        ...validatedReport,
        consultationId
      }, 'validate')
      
      console.log(`✅ Rapport validé: ${reportId}`)
      
      return NextResponse.json({
        success: true,
        data: {
          reportId,
          status: 'validated',
          validatedAt: now.toISOString(),
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

// Keep your existing GET function unchanged
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const reportId = searchParams.get('reportId')
    const consultationId = searchParams.get('consultationId')
    
    console.log(`🔍 Recherche rapport - patientId: ${patientId}, reportId: ${reportId}, consultationId: ${consultationId}`)
    
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
            documentValidations: report.documentValidations
          }
        })
      }
    }
    
    if (consultationId) {
      // Search by consultation ID (new feature)
      for (const [_, report] of memoryStorage) {
        if (report.metadata?.consultationId === consultationId) {
          return NextResponse.json({
            success: true,
            data: {
              id: report.id,
              content: report.content,
              status: report.status,
              metadata: report.metadata,
              createdAt: report.createdAt,
              updatedAt: report.updatedAt,
              signatures: report.signatures,
              documentValidations: report.documentValidations
            }
          })
        }
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
            documentValidations: latestReport.documentValidations
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
