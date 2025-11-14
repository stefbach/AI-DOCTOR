'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  TrendingUp,
  ClipboardCheck,
  Stethoscope,
  Activity,
  Pill
} from 'lucide-react'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface NormalReportDisplayProps {
  patientDemographics: PatientDemographics | null
  clinicalData: any
  previousConsultation: ConsultationHistoryItem | null
  consultationHistory: ConsultationHistoryItem[]
  onReportGenerated?: (report: any) => void
}

export function NormalReportDisplay({
  patientDemographics,
  clinicalData,
  previousConsultation,
  consultationHistory,
  onReportGenerated
}: NormalReportDisplayProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)

  // Auto-generate report on mount
  useEffect(() => {
    if (clinicalData && patientDemographics) {
      generateReport()
    }
  }, [clinicalData, patientDemographics])

  const generateReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/normal-follow-up-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientDemographics,
          clinicalData,
          previousConsultation,
          consultationHistory: consultationHistory.slice(0, 3) // Last 3 consultations
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const data = await response.json()
      setReport(data.report)
      onReportGenerated?.(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!report) return

    const reportText = formatReportForDownload(report)
    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `follow-up-report-${patientDemographics?.fullName}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium text-gray-700">Generating Follow-Up Report...</p>
          <p className="text-sm text-gray-500 mt-2">
            Analyzing patient history and current clinical data
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-4"
            onClick={generateReport}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!report) return null

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Follow-up report generated successfully with historical context
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleDownload} size="lg">
          <Download className="h-5 w-5 mr-2" />
          Download Report
        </Button>
        <Button variant="outline" onClick={generateReport} size="lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      </div>

      {/* Report Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                Follow-Up Medical Report
              </CardTitle>
              <CardDescription className="mt-2">
                Patient: {patientDemographics?.fullName} • Date: {new Date().toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge className="bg-blue-600">Follow-Up Consultation</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Information */}
          {report.patientInfo && (
            <section>
              <h3 className="font-bold text-lg mb-3 text-blue-900 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Patient Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {report.patientInfo}
                </pre>
              </div>
            </section>
          )}

          <Separator />

          {/* Chief Complaint */}
          {report.chiefComplaint && (
            <section className="border-l-4 border-red-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-red-900 flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                CHIEF COMPLAINT
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.chiefComplaint}</p>
            </section>
          )}

          {/* History Comparison */}
          {report.historyComparison && (
            <section className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-purple-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                COMPARISON WITH PREVIOUS VISIT
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.historyComparison}</p>
            </section>
          )}

          {/* Present Illness */}
          {report.presentIllness && (
            <section className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-blue-900">HISTORY OF PRESENT ILLNESS</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.presentIllness}</p>
            </section>
          )}

          {/* Physical Examination */}
          {report.physicalExamination && (
            <section className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-green-900">PHYSICAL EXAMINATION</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.physicalExamination}</p>
            </section>
          )}

          {/* Vital Signs Analysis */}
          {report.vitalSignsAnalysis && (
            <section className="border-l-4 border-cyan-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-cyan-900 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                VITAL SIGNS ANALYSIS
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.vitalSignsAnalysis}</p>
            </section>
          )}

          {/* Clinical Assessment */}
          {report.clinicalAssessment && (
            <section className="border-l-4 border-indigo-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-indigo-900">CLINICAL ASSESSMENT</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.clinicalAssessment}</p>
            </section>
          )}

          {/* Diagnosis */}
          {report.diagnosis && (
            <section className="border-l-4 border-orange-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-orange-900">DIAGNOSIS</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.diagnosis}</p>
            </section>
          )}

          {/* Treatment Plan */}
          {report.treatmentPlan && (
            <section className="border-l-4 border-teal-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-teal-900 flex items-center gap-2">
                <Pill className="h-5 w-5" />
                TREATMENT PLAN
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.treatmentPlan}</p>
            </section>
          )}

          {/* Recommendations */}
          {report.recommendations && (
            <section className="border-l-4 border-pink-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-pink-900">RECOMMENDATIONS</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.recommendations}</p>
            </section>
          )}

          {/* Follow-Up Plan */}
          {report.followUpPlan && (
            <section className="border-l-4 border-yellow-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-yellow-900">FOLLOW-UP PLAN</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.followUpPlan}</p>
            </section>
          )}

          {/* Signature */}
          {report.signature && (
            <section className="mt-8 pt-4 border-t">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.signature}</p>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatReportForDownload(report: any): string {
  const sections = []

  sections.push('=' .repeat(80))
  sections.push('FOLLOW-UP MEDICAL REPORT')
  sections.push('=' .repeat(80))
  sections.push('')

  if (report.patientInfo) {
    sections.push('PATIENT INFORMATION')
    sections.push('-'.repeat(80))
    sections.push(report.patientInfo)
    sections.push('')
  }

  if (report.chiefComplaint) {
    sections.push('CHIEF COMPLAINT')
    sections.push('-'.repeat(80))
    sections.push(report.chiefComplaint)
    sections.push('')
  }

  if (report.historyComparison) {
    sections.push('COMPARISON WITH PREVIOUS VISIT')
    sections.push('-'.repeat(80))
    sections.push(report.historyComparison)
    sections.push('')
  }

  if (report.presentIllness) {
    sections.push('HISTORY OF PRESENT ILLNESS')
    sections.push('-'.repeat(80))
    sections.push(report.presentIllness)
    sections.push('')
  }

  if (report.physicalExamination) {
    sections.push('PHYSICAL EXAMINATION')
    sections.push('-'.repeat(80))
    sections.push(report.physicalExamination)
    sections.push('')
  }

  if (report.vitalSignsAnalysis) {
    sections.push('VITAL SIGNS ANALYSIS')
    sections.push('-'.repeat(80))
    sections.push(report.vitalSignsAnalysis)
    sections.push('')
  }

  if (report.clinicalAssessment) {
    sections.push('CLINICAL ASSESSMENT')
    sections.push('-'.repeat(80))
    sections.push(report.clinicalAssessment)
    sections.push('')
  }

  if (report.diagnosis) {
    sections.push('DIAGNOSIS')
    sections.push('-'.repeat(80))
    sections.push(report.diagnosis)
    sections.push('')
  }

  if (report.treatmentPlan) {
    sections.push('TREATMENT PLAN')
    sections.push('-'.repeat(80))
    sections.push(report.treatmentPlan)
    sections.push('')
  }

  if (report.recommendations) {
    sections.push('RECOMMENDATIONS')
    sections.push('-'.repeat(80))
    sections.push(report.recommendations)
    sections.push('')
  }

  if (report.followUpPlan) {
    sections.push('FOLLOW-UP PLAN')
    sections.push('-'.repeat(80))
    sections.push(report.followUpPlan)
    sections.push('')
  }

  if (report.signature) {
    sections.push('')
    sections.push(report.signature)
  }

  sections.push('')
  sections.push('=' .repeat(80))
  sections.push(`Generated: ${new Date().toLocaleString()}`)
  sections.push('=' .repeat(80))

  return sections.join('\n')
}
