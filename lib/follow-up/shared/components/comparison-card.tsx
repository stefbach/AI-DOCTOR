'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Heart,
  Weight,
  Activity,
  Droplet,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { VitalSignsComparison } from '@/lib/follow-up/shared/utils/data-comparator'

export interface ComparisonCardProps {
  comparison: VitalSignsComparison
  previousDate?: string
  currentDate?: string
}

/**
 * ComparisonCard Component
 * 
 * Displays vital signs comparison between two consultations with visual trends,
 * clinical interpretation, and improvement indicators.
 * 
 * @component
 * @example
 * ```tsx
 * <ComparisonCard 
 *   comparison={vitalSignsComparison}
 *   previousDate="2024-01-15"
 *   currentDate="2024-02-20"
 * />
 * ```
 */
export function ComparisonCard({ 
  comparison, 
  previousDate,
  currentDate 
}: ComparisonCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Vital Signs Evolution
        </CardTitle>
        <CardDescription>
          Comparison between consultations
          {previousDate && currentDate && (
            <span className="block mt-1 text-xs">
              {new Date(previousDate).toLocaleDateString()} 
              <ArrowRight className="inline h-3 w-3 mx-1" />
              {new Date(currentDate).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blood Pressure */}
        {comparison.bloodPressure && (
          <VitalMetricDisplay
            icon={<Heart className="h-5 w-5 text-red-500" />}
            label="Blood Pressure"
            previousValue={comparison.bloodPressure.previousValue}
            currentValue={comparison.bloodPressure.currentValue}
            change={comparison.bloodPressure.change}
            changePercent={comparison.bloodPressure.changePercent}
            trend={comparison.bloodPressure.trend}
            isImprovement={comparison.bloodPressure.isImprovement}
            interpretation={comparison.bloodPressure.interpretation}
            unit="mmHg"
          />
        )}

        {/* Weight */}
        {comparison.weight && (
          <VitalMetricDisplay
            icon={<Weight className="h-5 w-5 text-blue-500" />}
            label="Weight"
            previousValue={comparison.weight.previousValue}
            currentValue={comparison.weight.currentValue}
            change={comparison.weight.change}
            changePercent={comparison.weight.changePercent}
            trend={comparison.weight.trend}
            isImprovement={comparison.weight.isImprovement}
            interpretation={comparison.weight.interpretation}
            unit="kg"
          />
        )}

        {/* BMI */}
        {comparison.bmi && (
          <VitalMetricDisplay
            icon={<Activity className="h-5 w-5 text-green-500" />}
            label="BMI"
            previousValue={comparison.bmi.previousValue}
            currentValue={comparison.bmi.currentValue}
            change={comparison.bmi.change}
            changePercent={comparison.bmi.changePercent}
            trend={comparison.bmi.trend}
            isImprovement={comparison.bmi.isImprovement}
            interpretation={comparison.bmi.interpretation}
            unit="kg/m²"
          />
        )}

        {/* Glucose */}
        {comparison.glucose && (
          <VitalMetricDisplay
            icon={<Droplet className="h-5 w-5 text-purple-500" />}
            label="Blood Glucose"
            previousValue={comparison.glucose.previousValue}
            currentValue={comparison.glucose.currentValue}
            change={comparison.glucose.change}
            changePercent={comparison.glucose.changePercent}
            trend={comparison.glucose.trend}
            isImprovement={comparison.glucose.isImprovement}
            interpretation={comparison.glucose.interpretation}
            unit="mmol/L"
          />
        )}

        {/* Overall Summary */}
        {hasAnyMetric(comparison) && (
          <div className="pt-4 border-t">
            <OverallAssessment comparison={comparison} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface VitalMetricDisplayProps {
  icon: React.ReactNode
  label: string
  previousValue: string
  currentValue: string
  change: string
  changePercent?: number
  trend: 'up' | 'down' | 'stable'
  isImprovement?: boolean
  interpretation?: string
  unit: string
}

function VitalMetricDisplay({
  icon,
  label,
  previousValue,
  currentValue,
  change,
  changePercent,
  trend,
  isImprovement,
  interpretation,
  unit
}: VitalMetricDisplayProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />
      case 'down':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getTrendColor = () => {
    if (isImprovement === true) return 'text-green-600 bg-green-50 border-green-200'
    if (isImprovement === false) return 'text-red-600 bg-red-50 border-red-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        
        {isImprovement !== undefined && (
          <div className="flex items-center gap-1">
            {isImprovement ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-xs font-medium ${
              isImprovement ? 'text-green-600' : 'text-red-600'
            }`}>
              {isImprovement ? 'Improved' : 'Concern'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Previous Value */}
        <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Previous</p>
          <p className="text-lg font-bold text-gray-700">{previousValue} <span className="text-sm font-normal text-gray-500">{unit}</span></p>
        </div>

        {/* Arrow */}
        <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />

        {/* Current Value */}
        <div className="flex-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-600 font-medium uppercase mb-1">Current</p>
          <p className="text-lg font-bold text-blue-700">{currentValue} <span className="text-sm font-normal text-blue-500">{unit}</span></p>
        </div>
      </div>

      {/* Change Badge */}
      <div className={`flex items-center gap-2 p-2 rounded-md border ${getTrendColor()}`}>
        {getTrendIcon()}
        <span className="text-sm font-medium">
          {change} {unit}
          {changePercent !== undefined && ` (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`}
        </span>
      </div>

      {/* Clinical Interpretation */}
      {interpretation && (
        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
          <p className="text-sm text-blue-800">
            <strong>Clinical Status:</strong> {interpretation}
          </p>
        </div>
      )}
    </div>
  )
}

function OverallAssessment({ comparison }: { comparison: VitalSignsComparison }) {
  const improvements = countImprovements(comparison)
  const concerns = countConcerns(comparison)
  const stable = countStable(comparison)
  const total = improvements + concerns + stable

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <Activity className="h-4 w-4 text-blue-600" />
        Overall Assessment
      </h4>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
          <p className="text-2xl font-bold text-green-700">{improvements}</p>
          <p className="text-xs text-green-600 font-medium">Improved</p>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-2xl font-bold text-gray-700">{stable}</p>
          <p className="text-xs text-gray-600 font-medium">Stable</p>
        </div>
        
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
          <p className="text-2xl font-bold text-red-700">{concerns}</p>
          <p className="text-xs text-red-600 font-medium">Concerns</p>
        </div>
      </div>

      {improvements > concerns && (
        <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
          <p className="text-sm text-green-800 font-medium">
            ✅ Patient shows positive progress with {improvements} improved metric{improvements !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {concerns > improvements && (
        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <p className="text-sm text-yellow-800 font-medium">
            ⚠️ Attention needed: {concerns} metric{concerns !== 1 ? 's require' : ' requires'} monitoring
          </p>
        </div>
      )}

      {improvements === concerns && total > 0 && (
        <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-800 font-medium">
            📊 Mixed results: Continue monitoring and treatment plan
          </p>
        </div>
      )}
    </div>
  )
}

function hasAnyMetric(comparison: VitalSignsComparison): boolean {
  return !!(comparison.bloodPressure || comparison.weight || comparison.bmi || comparison.glucose)
}

function countImprovements(comparison: VitalSignsComparison): number {
  let count = 0
  if (comparison.bloodPressure?.isImprovement) count++
  if (comparison.weight?.isImprovement) count++
  if (comparison.bmi?.isImprovement) count++
  if (comparison.glucose?.isImprovement) count++
  return count
}

function countConcerns(comparison: VitalSignsComparison): number {
  let count = 0
  if (comparison.bloodPressure?.isImprovement === false) count++
  if (comparison.weight?.isImprovement === false) count++
  if (comparison.bmi?.isImprovement === false) count++
  if (comparison.glucose?.isImprovement === false) count++
  return count
}

function countStable(comparison: VitalSignsComparison): number {
  let count = 0
  if (comparison.bloodPressure && comparison.bloodPressure.isImprovement === undefined) count++
  if (comparison.weight && comparison.weight.isImprovement === undefined) count++
  if (comparison.bmi && comparison.bmi.isImprovement === undefined) count++
  if (comparison.glucose && comparison.glucose.isImprovement === undefined) count++
  return count
}
