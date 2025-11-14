'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Loader2, AlertCircle, CheckCircle, Download, RefreshCw,
  TrendingUp, Heart, Pill, Activity
} from 'lucide-react'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface ChronicReportDisplayProps {
  patientDemographics: PatientDemographics | null
  clinicalData: any
  trendsData: any
  previousConsultation: ConsultationHistoryItem | null
  consultationHistory: ConsultationHistoryItem[]
  onReportGenerated?: (report: any) => void
}

export function ChronicReportDisplay({
  patientDemographics, clinicalData, trendsData, previousConsultation,
  consultationHistory, onReportGenerated
}: ChronicReportDisplayProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    if (clinicalData && patientDemographics && trendsData) {
      generateReport()
    }
  }, [clinicalData, patientDemographics, trendsData])

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chronic-follow-up-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientDemographics, clinicalData, trendsData, previousConsultation,
          consultationHistory: consultationHistory.slice(0, 5)
        })
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const data = await response.json()
      setReport(data.report)
      onReportGenerated?.(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-lg font-medium">Generating Chronic Disease Follow-Up Report...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!report) return null

  return (
    <div className="space-y-6">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Chronic disease follow-up report generated with long-term trend analysis
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button onClick={() => {}} size="lg"><Download className="h-5 w-5 mr-2" />Download</Button>
        <Button variant="outline" onClick={generateReport} size="lg"><RefreshCw className="h-4 w-4 mr-2" />Regenerate</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-600" />
            Chronic Disease Follow-Up Report
          </CardTitle>
          <CardDescription>Patient: {patientDemographics?.fullName} • Date: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {report.patientInfo && <section><h3 className="font-bold text-lg mb-3">Patient Information</h3><div className="bg-gray-50 p-4 rounded-lg border"><pre className="whitespace-pre-wrap text-sm font-sans">{report.patientInfo}</pre></div></section>}
          <Separator />
          {report.chiefComplaint && <section className="border-l-4 border-red-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2">CHIEF COMPLAINT</h3><p className="whitespace-pre-wrap">{report.chiefComplaint}</p></section>}
          {report.trendAnalysis && <section className="border-l-4 border-purple-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2 flex items-center gap-2"><TrendingUp className="h-5 w-5" />LONG-TERM TREND ANALYSIS</h3><p className="whitespace-pre-wrap">{report.trendAnalysis}</p></section>}
          {report.clinicalAssessment && <section className="border-l-4 border-blue-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2">CLINICAL ASSESSMENT</h3><p className="whitespace-pre-wrap">{report.clinicalAssessment}</p></section>}
          {report.medicationCompliance && <section className="border-l-4 border-green-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Pill className="h-5 w-5" />MEDICATION COMPLIANCE</h3><p className="whitespace-pre-wrap">{report.medicationCompliance}</p></section>}
          {report.diagnosis && <section className="border-l-4 border-orange-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2">DIAGNOSIS</h3><p className="whitespace-pre-wrap">{report.diagnosis}</p></section>}
          {report.treatmentPlan && <section className="border-l-4 border-teal-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2">TREATMENT PLAN</h3><p className="whitespace-pre-wrap">{report.treatmentPlan}</p></section>}
          {report.recommendations && <section className="border-l-4 border-pink-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2">RECOMMENDATIONS</h3><p className="whitespace-pre-wrap">{report.recommendations}</p></section>}
          {report.followUpPlan && <section className="border-l-4 border-yellow-500 pl-4 py-2"><h3 className="font-bold text-lg mb-2">FOLLOW-UP PLAN</h3><p className="whitespace-pre-wrap">{report.followUpPlan}</p></section>}
        </CardContent>
      </Card>
    </div>
  )
}
