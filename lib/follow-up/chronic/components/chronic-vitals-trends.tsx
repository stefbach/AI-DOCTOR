'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Weight,
  Activity,
  Droplet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar
} from 'lucide-react'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface ChronicVitalsTrendsProps {
  patientDemographics: PatientDemographics | null
  consultationHistory: ConsultationHistoryItem[]
  onComplete: (data: any) => void
}

interface TrendDataPoint {
  date: string
  value: number | null
  displayValue: string
}

interface TrendSummary {
  metric: string
  icon: React.ReactNode
  color: string
  data: TrendDataPoint[]
  average: number
  min: number
  max: number
  trend: 'improving' | 'worsening' | 'stable'
  unit: string
}

export function ChronicVitalsTrends({
  patientDemographics,
  consultationHistory,
  onComplete
}: ChronicVitalsTrendsProps) {
  const [trends, setTrends] = useState<TrendSummary[]>([])

  useEffect(() => {
    if (consultationHistory.length > 0) {
      analyzeTrends()
    }
  }, [consultationHistory])

  const analyzeTrends = () => {
    const trendData: TrendSummary[] = []

    // Blood Pressure Systolic Trend
    const bpData = extractBPTrend()
    if (bpData.data.length > 0) {
      trendData.push(bpData)
    }

    // Weight Trend
    const weightData = extractWeightTrend()
    if (weightData.data.length > 0) {
      trendData.push(weightData)
    }

    // Glucose Trend (if diabetic)
    const glucoseData = extractGlucoseTrend()
    if (glucoseData.data.length > 0) {
      trendData.push(glucoseData)
    }

    // BMI Trend
    const bmiData = extractBMITrend()
    if (bmiData.data.length > 0) {
      trendData.push(bmiData)
    }

    setTrends(trendData)
  }

  const extractBPTrend = (): TrendSummary => {
    const data: TrendDataPoint[] = []
    
    consultationHistory.forEach(consultation => {
      if (consultation.vitalSigns?.bloodPressure) {
        const bp = consultation.vitalSigns.bloodPressure
        const systolic = typeof bp === 'string' 
          ? parseInt(bp.split('/')[0]) 
          : bp.systolic || null

        if (systolic) {
          data.push({
            date: new Date(consultation.date).toLocaleDateString(),
            value: systolic,
            displayValue: typeof bp === 'string' ? bp : `${bp.systolic}/${bp.diastolic}`
          })
        }
      }
    })

    const values = data.map(d => d.value!).filter(v => v !== null)
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const min = values.length > 0 ? Math.min(...values) : 0
    const max = values.length > 0 ? Math.max(...values) : 0

    // Determine trend
    let trend: 'improving' | 'worsening' | 'stable' = 'stable'
    if (values.length >= 2) {
      const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length)
      const older = values.slice(0, Math.max(1, values.length - 3)).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3)
      
      if (recent < older - 5) trend = 'improving'
      else if (recent > older + 5) trend = 'worsening'
    }

    return {
      metric: 'Blood Pressure (Systolic)',
      icon: <Heart className="h-5 w-5" />,
      color: 'red',
      data,
      average: Math.round(average),
      min,
      max,
      trend,
      unit: 'mmHg'
    }
  }

  const extractWeightTrend = (): TrendSummary => {
    const data: TrendDataPoint[] = []
    
    consultationHistory.forEach(consultation => {
      if (consultation.vitalSigns?.weight) {
        const weight = parseFloat(String(consultation.vitalSigns.weight))
        if (!isNaN(weight)) {
          data.push({
            date: new Date(consultation.date).toLocaleDateString(),
            value: weight,
            displayValue: `${weight} kg`
          })
        }
      }
    })

    const values = data.map(d => d.value!).filter(v => v !== null)
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const min = values.length > 0 ? Math.min(...values) : 0
    const max = values.length > 0 ? Math.max(...values) : 0

    // For weight, stable is generally good
    let trend: 'improving' | 'worsening' | 'stable' = 'stable'
    if (values.length >= 2) {
      const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length)
      const older = values.slice(0, Math.max(1, values.length - 3)).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3)
      
      const change = Math.abs(recent - older)
      if (change < 2) trend = 'stable'
    }

    return {
      metric: 'Weight',
      icon: <Weight className="h-5 w-5" />,
      color: 'blue',
      data,
      average: parseFloat(average.toFixed(1)),
      min: parseFloat(min.toFixed(1)),
      max: parseFloat(max.toFixed(1)),
      trend,
      unit: 'kg'
    }
  }

  const extractGlucoseTrend = (): TrendSummary => {
    const data: TrendDataPoint[] = []
    
    consultationHistory.forEach(consultation => {
      if (consultation.vitalSigns?.glucose || consultation.vitalSigns?.bloodGlucose) {
        const glucose = parseFloat(String(consultation.vitalSigns.glucose || consultation.vitalSigns.bloodGlucose))
        if (!isNaN(glucose)) {
          data.push({
            date: new Date(consultation.date).toLocaleDateString(),
            value: glucose,
            displayValue: `${glucose} mmol/L`
          })
        }
      }
    })

    const values = data.map(d => d.value!).filter(v => v !== null)
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const min = values.length > 0 ? Math.min(...values) : 0
    const max = values.length > 0 ? Math.max(...values) : 0

    // For glucose, lower is better (but not too low)
    let trend: 'improving' | 'worsening' | 'stable' = 'stable'
    if (values.length >= 2) {
      const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length)
      const older = values.slice(0, Math.max(1, values.length - 3)).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3)
      
      if (recent < older && recent >= 4) trend = 'improving'
      else if (recent > older && recent > 7) trend = 'worsening'
    }

    return {
      metric: 'Blood Glucose',
      icon: <Droplet className="h-5 w-5" />,
      color: 'purple',
      data,
      average: parseFloat(average.toFixed(1)),
      min: parseFloat(min.toFixed(1)),
      max: parseFloat(max.toFixed(1)),
      trend,
      unit: 'mmol/L'
    }
  }

  const extractBMITrend = (): TrendSummary => {
    const data: TrendDataPoint[] = []
    
    consultationHistory.forEach(consultation => {
      if (consultation.vitalSigns?.bmi) {
        const bmi = parseFloat(String(consultation.vitalSigns.bmi))
        if (!isNaN(bmi)) {
          data.push({
            date: new Date(consultation.date).toLocaleDateString(),
            value: bmi,
            displayValue: `${bmi.toFixed(1)} kg/m²`
          })
        }
      }
    })

    const values = data.map(d => d.value!).filter(v => v !== null)
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const min = values.length > 0 ? Math.min(...values) : 0
    const max = values.length > 0 ? Math.max(...values) : 0

    let trend: 'improving' | 'worsening' | 'stable' = 'stable'
    if (values.length >= 2) {
      const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length)
      const older = values.slice(0, Math.max(1, values.length - 3)).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3)
      
      // Moving towards healthy BMI (18.5-24.9) is improving
      if (recent < 25 && older >= 25) trend = 'improving'
      else if (recent >= 25 && older < 25) trend = 'worsening'
    }

    return {
      metric: 'BMI',
      icon: <Activity className="h-5 w-5" />,
      color: 'green',
      data,
      average: parseFloat(average.toFixed(1)),
      min: parseFloat(min.toFixed(1)),
      max: parseFloat(max.toFixed(1)),
      trend,
      unit: 'kg/m²'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="h-4 w-4 text-green-600" />
      case 'worsening':
        return <TrendingUp className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <Badge className="bg-green-600">Improving</Badge>
      case 'worsening':
        return <Badge className="bg-red-600">Needs Attention</Badge>
      default:
        return <Badge variant="secondary">Stable</Badge>
    }
  }

  const handleContinue = () => {
    const trendsAnalysis = {
      trends,
      consultationCount: consultationHistory.length,
      dateRange: {
        from: consultationHistory[consultationHistory.length - 1]?.date,
        to: consultationHistory[0]?.date
      },
      timestamp: new Date().toISOString()
    }
    onComplete(trendsAnalysis)
  }

  if (consultationHistory.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No consultation history available for trend analysis
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">Long-Term Monitoring Period</p>
                <p className="text-sm text-blue-700">
                  {consultationHistory.length} consultations • 
                  {consultationHistory.length > 1 && (
                    <> From {new Date(consultationHistory[consultationHistory.length - 1].date).toLocaleDateString()} to {new Date(consultationHistory[0].date).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trends Cards */}
      {trends.map((trendSummary, idx) => (
        <Card key={idx} className={`border-l-4 border-${trendSummary.color}-500`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 bg-${trendSummary.color}-100 rounded-lg`}>
                  {trendSummary.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{trendSummary.metric}</CardTitle>
                  <CardDescription>
                    {trendSummary.data.length} data points
                  </CardDescription>
                </div>
              </div>
              {getTrendBadge(trendSummary.trend)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 font-medium uppercase">Average</p>
                <p className="text-xl font-bold text-gray-900">
                  {trendSummary.average} <span className="text-sm font-normal text-gray-600">{trendSummary.unit}</span>
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 font-medium uppercase">Min</p>
                <p className="text-xl font-bold text-gray-900">
                  {trendSummary.min} <span className="text-sm font-normal text-gray-600">{trendSummary.unit}</span>
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 font-medium uppercase">Max</p>
                <p className="text-xl font-bold text-gray-900">
                  {trendSummary.max} <span className="text-sm font-normal text-gray-600">{trendSummary.unit}</span>
                </p>
              </div>
            </div>

            {/* Data Points Timeline */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                {getTrendIcon(trendSummary.trend)}
                Historical Data
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {trendSummary.data.slice().reverse().map((point, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="text-sm text-gray-600">{point.date}</span>
                    <span className="text-sm font-semibold text-gray-900">{point.displayValue}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          size="lg"
          className="min-w-[250px]"
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          Proceed to Clinical Assessment
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
