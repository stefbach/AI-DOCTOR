'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react'

/**
 * View Report Page
 * 
 * Displays a full medical report in professional format
 * Accessible from consultation history
 */
export default function ViewReportPage() {
  const params = useParams()
  const router = useRouter()
  const consultationId = params?.consultationId as string
  
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (consultationId) {
      fetchReport(consultationId)
    }
  }, [consultationId])

  const fetchReport = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch from Supabase via API
      const response = await fetch('/api/patient-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: id })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch report')
      }
      
      const data = await response.json()
      
      if (data.consultations && data.consultations.length > 0) {
        const consultation = data.consultations[0]
        setReport(consultation.fullReport)
      } else {
        throw new Error('Report not found')
      }
    } catch (err: any) {
      console.error('Error fetching report:', err)
      setError(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!report) return
    
    let content = ''
    
    if (typeof report === 'string') {
      content = report
    } else if (report.medicalReport?.narrative) {
      content = report.medicalReport.narrative
    } else if (report.compteRendu?.synthese) {
      content = report.compteRendu.synthese
    } else {
      content = JSON.stringify(report, null, 2)
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Medical_Report_${consultationId}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-lg font-medium text-gray-700">Chargement du rapport...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Erreur de Chargement
              </h2>
              <p className="text-gray-600 mb-6">
                {error || 'Le rapport médical demandé est introuvable.'}
              </p>
              <Button onClick={() => router.push('/consultation-hub')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au Hub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header - Hidden on Print */}
      <div className="print:hidden bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push('/consultation-hub')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Rapport Médical
                </h1>
                <p className="text-sm text-gray-500">
                  Consultation ID: {consultationId}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {renderReport(report)}
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Render report based on its structure
 */
function renderReport(report: any) {
  // Case 1: String report
  if (typeof report === 'string') {
    return (
      <div 
        className="prose prose-sm max-w-none"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap'
        }}
      >
        {report}
      </div>
    )
  }

  // Case 2: English format with narrative
  if (report.medicalReport?.narrative) {
    return (
      <div 
        className="prose prose-sm max-w-none"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap'
        }}
        dangerouslySetInnerHTML={{
          __html: formatNarrativeWithBoldHeaders(report.medicalReport.narrative)
        }}
      />
    )
  }

  // Case 3: Mauritian format
  if (report.compteRendu) {
    return renderMauritianReport(report.compteRendu)
  }

  // Case 4: Structured data - render as sections
  if (report.medicalReport) {
    return renderStructuredReport(report.medicalReport)
  }

  // Fallback: JSON display
  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
        {JSON.stringify(report, null, 2)}
      </pre>
    </div>
  )
}

/**
 * Format narrative with bold section headers
 */
function formatNarrativeWithBoldHeaders(narrative: string): string {
  const sectionHeaders = [
    'CHRONIC DISEASE FOLLOW-UP CONSULTATION REPORT',
    'CONSULTATION REPORT',
    'DOCUMENT INFORMATION',
    'PATIENT IDENTIFICATION',
    'CHIEF COMPLAINT',
    'HISTORY OF PRESENT ILLNESS',
    'PAST MEDICAL HISTORY',
    'PHYSICAL EXAMINATION',
    'REVIEW OF SYSTEMS',
    'CLINICAL ASSESSMENT',
    'CHRONIC DISEASE MANAGEMENT',
    'DIAGNOSTIC SUMMARY',
    'TREATMENT PLAN',
    'PRESCRIPTIONS',
    'ORDONNANCE',
    'LABORATORY INVESTIGATIONS',
    'BIOLOGIE',
    'PARACLINICAL EXAMINATIONS',
    'PARACLINIQUE',
    'DIETARY RECOMMENDATIONS',
    'PATIENT EDUCATION',
    'FOLLOW-UP PLAN',
    'PROGNOSIS',
    'SIGNATURE',
    'MEDICAL CERTIFICATION'
  ]
  
  const lines = narrative.split('\n')
  
  const formattedLines = lines.map(line => {
    const trimmedLine = line.trim()
    
    // Skip separator lines
    if (trimmedLine.match(/^═+$/)) {
      return line
    }
    
    // Check if this line is a section header
    if (sectionHeaders.includes(trimmedLine)) {
      return `<strong>${line}</strong>`
    }
    
    // Regular line - escape HTML
    return line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  })
  
  return formattedLines.join('\n')
}

/**
 * Render Mauritian format report
 */
function renderMauritianReport(compteRendu: any) {
  return (
    <div className="space-y-6">
      {/* Header */}
      {compteRendu.header && (
        <div className="text-center border-b-2 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{compteRendu.header.titre}</h1>
          <p className="text-gray-600 mt-1">{compteRendu.header.sousTitre}</p>
          <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500">
            <span>Référence: {compteRendu.header.reference}</span>
            <span>Date: {compteRendu.header.dateRapport}</span>
          </div>
        </div>
      )}

      {/* Patient Info */}
      {compteRendu.patient && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Informations Patient</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Nom:</strong> {compteRendu.patient.nomComplet}</div>
            <div><strong>Âge:</strong> {compteRendu.patient.age} ans</div>
            <div><strong>Sexe:</strong> {compteRendu.patient.sexe}</div>
            <div><strong>Téléphone:</strong> {compteRendu.patient.telephone}</div>
          </div>
        </div>
      )}

      {/* Synthesis/Narrative */}
      {compteRendu.synthese && (
        <div className="prose prose-sm max-w-none">
          <h2 className="font-bold text-lg mb-2">Compte Rendu</h2>
          <div className="whitespace-pre-wrap text-gray-700">
            {compteRendu.synthese}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Render structured medical report
 */
function renderStructuredReport(medicalReport: any) {
  return (
    <div className="space-y-6">
      {/* Header */}
      {medicalReport.header && (
        <div className="text-center border-b-2 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{medicalReport.header.title}</h1>
          <p className="text-gray-600 mt-1">{medicalReport.header.subtitle}</p>
          <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500">
            <span>Reference: {medicalReport.header.reference}</span>
            <span>Date: {medicalReport.header.reportDate}</span>
          </div>
        </div>
      )}

      {/* Patient */}
      {medicalReport.patient && (
        <section className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Patient Information</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Name:</strong> {medicalReport.patient.fullName}</div>
            <div><strong>Age:</strong> {medicalReport.patient.age} years</div>
            <div><strong>Gender:</strong> {medicalReport.patient.gender}</div>
            <div><strong>Phone:</strong> {medicalReport.patient.phone}</div>
          </div>
        </section>
      )}

      {/* Clinical Evaluation */}
      {medicalReport.clinicalEvaluation && (
        <section>
          <h2 className="font-bold text-lg mb-2">Clinical Evaluation</h2>
          
          {medicalReport.clinicalEvaluation.chiefComplaint && (
            <div className="mb-3">
              <h3 className="font-semibold text-sm text-gray-700 mb-1">Chief Complaint</h3>
              <p className="text-gray-600">{medicalReport.clinicalEvaluation.chiefComplaint}</p>
            </div>
          )}
          
          {medicalReport.clinicalEvaluation.historyOfPresentIllness && (
            <div className="mb-3">
              <h3 className="font-semibold text-sm text-gray-700 mb-1">History of Present Illness</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{medicalReport.clinicalEvaluation.historyOfPresentIllness}</p>
            </div>
          )}
        </section>
      )}

      {/* Diagnostic Summary */}
      {medicalReport.diagnosticSummary && (
        <section className="bg-green-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Diagnosis</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{medicalReport.diagnosticSummary.diagnosticConclusion}</p>
        </section>
      )}
    </div>
  )
}
