// app/api/save-medical-report/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Interface pour le stockage en mémoire (remplacez par une vraie base de données)
interface StoredReport {
  id: string
  patientId: string
  content: any
  status: 'draft' | 'validated'
  metadata: any
  createdAt: Date
  updatedAt: Date
}

// Stockage temporaire en mémoire (à remplacer par une vraie base de données)
const memoryStorage = new Map<string, StoredReport>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, patientId, report, action, metadata } = body

    console.log(`📝 Action de sauvegarde: ${action} pour patient: ${patientId}`)

    if (!patientId || !report) {
      return NextResponse.json({
        success: false,
        error: "Données manquantes: patientId et report sont requis"
      }, { status: 400 })
    }

    const now = new Date()
    
    if (action === 'save') {
      // Sauvegarder ou mettre à jour
      const id = reportId || `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const existingReport = reportId ? memoryStorage.get(reportId) : null
      
      const reportToSave: StoredReport = {
        id,
        patientId,
        content: report,
        status: metadata?.validationStatus || 'draft',
        metadata: {
          ...metadata,
          lastModified: now.toISOString()
        },
        createdAt: existingReport?.createdAt || now,
        updatedAt: now
      }
      
      memoryStorage.set(id, reportToSave)
      
      console.log(`✅ Rapport sauvegardé avec ID: ${id}`)
      
      return NextResponse.json({
        success: true,
        data: {
          reportId: id,
          status: reportToSave.status,
          savedAt: now.toISOString()
        }
      })
    }
    
    if (action === 'validate') {
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
      
      // Valider et verrouiller le rapport
      const validatedReport: StoredReport = {
        ...existingReport,
        content: report,
        status: 'validated',
        metadata: {
          ...existingReport.metadata,
          ...metadata,
          validatedAt: now.toISOString(),
          locked: true
        },
        updatedAt: now
      }
      
      memoryStorage.set(reportId, validatedReport)
      
      console.log(`✅ Rapport validé: ${reportId}`)
      
      return NextResponse.json({
        success: true,
        data: {
          reportId,
          status: 'validated',
          validatedAt: now.toISOString()
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const reportId = searchParams.get('reportId')
    
    console.log(`🔍 Recherche rapport - patientId: ${patientId}, reportId: ${reportId}`)
    
    if (reportId) {
      // Rechercher par ID de rapport
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
            updatedAt: report.updatedAt
          }
        })
      }
    }
    
    if (patientId) {
      // Rechercher le rapport le plus récent du patient
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
            updatedAt: latestReport.updatedAt
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

// Endpoint pour lister tous les rapports d'un patient
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

// Note: Cette implémentation utilise un stockage en mémoire temporaire.
// Pour une application en production, remplacez par une vraie base de données:
// - PostgreSQL avec Prisma
// - MongoDB
// - Firebase Firestore
// - Supabase
// etc.

// Exemple avec Prisma (commenté):
/*
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { reportId, patientId, report, action, metadata } = body

  if (action === 'save') {
    const savedReport = await prisma.medicalReport.upsert({
      where: { id: reportId || 'new_' + Date.now() },
      update: {
        content: report,
        metadata,
        updatedAt: new Date()
      },
      create: {
        patientId,
        content: report,
        metadata,
        status: 'draft'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { reportId: savedReport.id }
    })
  }
  
  // ... reste du code
}
*/