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
  Eye,
  Image as ImageIcon,
  TrendingUp,
  Stethoscope
} from 'lucide-react'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface DermatologyReportDisplayProps {
  patientDemographics: PatientDemographics | null
  clinicalData: any
  imageComparisonData: any
  previousConsultation: ConsultationHistoryItem | null
  consultationHistory: ConsultationHistoryItem[]
  onReportGenerated?: (report: any) => void
}

export function DermatologyReportDisplay({
  patientDemographics,
  clinicalData,
  imageComparisonData,
  previousConsultation,
  consultationHistory,
  onReportGenerated
}: DermatologyReportDisplayProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)

  // Auto-generate report on mount
  useEffect(() => {
    if (clinicalData && patientDemographics && imageComparisonData) {
      generateReport()
    }
  }, [clinicalData, patientDemographics, imageComparisonData])

  const generateReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dermatology-follow-up-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientDemographics,
          clinicalData,
          imageComparisonData,
          previousConsultation,
          consultationHistory: consultationHistory.slice(0, 3)
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
    a.download = `dermatology-follow-up-${patientDemographics?.fullName}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-lg font-medium text-gray-700">Generating Dermatology Follow-Up Report...</p>
          <p className="text-sm text-gray-500 mt-2">
            Analyzing skin condition progression and treatment response
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
          ✅ Dermatology follow-up report generated successfully with image comparison analysis
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
                <Eye className="h-6 w-6 text-indigo-600" />
                Dermatology Follow-Up Report
              </CardTitle>
              <CardDescription className="mt-2">
                Patient: {patientDemographics?.fullName} • Date: {new Date().toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge className="bg-indigo-600">Dermatology Follow-Up</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Information */}
          {report.patientInfo && (
            <section>
              <h3 className="font-bold text-lg mb-3 text-indigo-900 flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
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
              <h3 className="font-bold text-lg mb-2 text-red-900">CHIEF COMPLAINT</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.chiefComplaint}</p>
            </section>
          )}

          {/* Image Comparison Analysis */}
          {report.imageComparison && (
            <section className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-purple-900 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                IMAGE COMPARISON ANALYSIS
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.imageComparison}</p>
            </section>
          )}

          {/* Treatment Response */}
          {report.treatmentResponse && (
            <section className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-green-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                TREATMENT RESPONSE ASSESSMENT
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.treatmentResponse}</p>
            </section>
          )}

          {/* Present Illness */}
          {report.presentIllness && (
            <section className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-blue-900">HISTORY OF PRESENT ILLNESS</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.presentIllness}</p>
            </section>
          )}

          {/* Dermatological Findings */}
          {report.dermatologicalFindings && (
            <section className="border-l-4 border-indigo-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-indigo-900 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                DERMATOLOGICAL FINDINGS
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.dermatologicalFindings}</p>
            </section>
          )}

          {/* Comprehensive Skin Examination */}
          {report.skinExamination && (
            <section className="border-l-4 border-cyan-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-cyan-900">COMPREHENSIVE SKIN EXAMINATION</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.skinExamination}</p>
            </section>
          )}

          {/* Clinical Assessment */}
          {report.clinicalAssessment && (
            <section className="border-l-4 border-orange-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-orange-900">CLINICAL ASSESSMENT</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.clinicalAssessment}</p>
            </section>
          )}

          {/* Diagnosis */}
          {report.diagnosis && (
            <section className="border-l-4 border-pink-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-pink-900">DIAGNOSIS</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.diagnosis}</p>
            </section>
          )}

          {/* Treatment Plan */}
          {report.treatmentPlan && (
            <section className="border-l-4 border-teal-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-teal-900">TREATMENT PLAN</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.treatmentPlan}</p>
            </section>
          )}

          {/* Recommendations */}
          {report.recommendations && (
            <section className="border-l-4 border-yellow-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-yellow-900">RECOMMENDATIONS</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.recommendations}</p>
            </section>
          )}

          {/* Follow-Up Plan */}
          {report.followUpPlan && (
            <section className="border-l-4 border-lime-500 pl-4 py-2">
              <h3 className="font-bold text-lg mb-2 text-lime-900">FOLLOW-UP PLAN</h3>
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

      {/* Image Reference */}
      {imageComparisonData && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-semibold text-indigo-900">Images Analyzed</p>
                <p className="text-sm text-indigo-700">
                  {imageComparisonData.previousImages?.length || 0} previous images • {imageComparisonData.currentImages?.length || 0} current images
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatReportForDownload(report: any): string {
  const sections = []

  sections.push('='.repeat(80))
  sections.push('DERMATOLOGY FOLLOW-UP REPORT')
  sections.push('='.repeat(80))
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

  if (report.imageComparison) {
    sections.push('IMAGE COMPARISON ANALYSIS')
    sections.push('-'.repeat(80))
    sections.push(report.imageComparison)
    sections.push('')
  }

  if (report.treatmentResponse) {
    sections.push('TREATMENT RESPONSE ASSESSMENT')
    sections.push('-'.repeat(80))
    sections.push(report.treatmentResponse)
    sections.push('')
  }

  if (report.presentIllness) {
    sections.push('HISTORY OF PRESENT ILLNESS')
    sections.push('-'.repeat(80))
    sections.push(report.presentIllness)
    sections.push('')
  }

  if (report.dermatologicalFindings) {
    sections.push('DERMATOLOGICAL FINDINGS')
    sections.push('-'.repeat(80))
    sections.push(report.dermatologicalFindings)
    sections.push('')
  }

  if (report.skinExamination) {
    sections.push('COMPREHENSIVE SKIN EXAMINATION')
    sections.push('-'.repeat(80))
    sections.push(report.skinExamination)
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
  sections.push('='.repeat(80))
  sections.push(`Generated: ${new Date().toLocaleString()}`)
  sections.push('='.repeat(80))

  return sections.join('\n')
}
