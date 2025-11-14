'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  Heart,
  Weight,
  Ruler,
  Thermometer,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Stethoscope
} from 'lucide-react'
import { ComparisonCard } from '@/lib/follow-up/shared'
import { compareVitalSigns } from '@/lib/follow-up/shared/utils/data-comparator'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface NormalClinicalFormProps {
  patientDemographics: PatientDemographics | null
  previousConsultation: ConsultationHistoryItem | null
  onSubmit: (data: any) => void
}

export function NormalClinicalForm({
  patientDemographics,
  previousConsultation,
  onSubmit
}: NormalClinicalFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    presentIllness: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    physicalExam: '',
    symptoms: ''
  })

  const [showComparison, setShowComparison] = useState(false)
  const [comparison, setComparison] = useState<any>(null)

  // Pre-fill height from patient demographics if available
  useEffect(() => {
    if (patientDemographics?.height) {
      setFormData(prev => ({
        ...prev,
        height: String(patientDemographics.height)
      }))
    }
  }, [patientDemographics])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-calculate comparison when vital signs are entered
    if (['bloodPressureSystolic', 'bloodPressureDiastolic', 'weight', 'height'].includes(field)) {
      updateComparison({ ...formData, [field]: value })
    }
  }

  const updateComparison = (data: typeof formData) => {
    if (!previousConsultation?.vitalSigns) return

    const currentVitals: any = {}
    const previousVitals = previousConsultation.vitalSigns

    // Blood pressure
    if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
      currentVitals.bloodPressureSystolic = parseFloat(data.bloodPressureSystolic)
      currentVitals.bloodPressureDiastolic = parseFloat(data.bloodPressureDiastolic)
    }

    // Weight
    if (data.weight) {
      currentVitals.weight = parseFloat(data.weight)
    }

    // Height (for BMI calculation)
    if (data.height) {
      currentVitals.height = parseFloat(data.height)
    }

    // Only show comparison if we have at least one vital sign
    if (Object.keys(currentVitals).length > 0) {
      const comparisonResult = compareVitalSigns(previousVitals, currentVitals)
      setComparison(comparisonResult)
      setShowComparison(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Calculate BMI if weight and height available
    let bmi = null
    if (formData.weight && formData.height) {
      const weightNum = parseFloat(formData.weight)
      const heightNum = parseFloat(formData.height) / 100 // cm to m
      bmi = (weightNum / (heightNum * heightNum)).toFixed(1)
    }

    const submissionData = {
      ...formData,
      bmi,
      comparison,
      previousConsultation,
      timestamp: new Date().toISOString()
    }

    onSubmit(submissionData)
  }

  const isFormValid = 
    formData.chiefComplaint.trim() !== '' &&
    formData.bloodPressureSystolic !== '' &&
    formData.bloodPressureDiastolic !== ''

  return (
    <div className="space-y-6">
      {/* Previous Consultation Reference */}
      {previousConsultation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Previous Consultation Reference
            </CardTitle>
            <CardDescription>
              {new Date(previousConsultation.date).toLocaleDateString()} - {previousConsultation.chiefComplaint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {previousConsultation.vitalSigns?.bloodPressure && (
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-xs text-gray-600">Blood Pressure</p>
                    <p className="font-semibold">{previousConsultation.vitalSigns.bloodPressure}</p>
                  </div>
                </div>
              )}
              {previousConsultation.vitalSigns?.weight && (
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-600">Weight</p>
                    <p className="font-semibold">{previousConsultation.vitalSigns.weight} kg</p>
                  </div>
                </div>
              )}
              {previousConsultation.vitalSigns?.temperature && (
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-600">Temperature</p>
                    <p className="font-semibold">{previousConsultation.vitalSigns.temperature}°C</p>
                  </div>
                </div>
              )}
              {previousConsultation.vitalSigns?.heartRate && (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-600">Heart Rate</p>
                    <p className="font-semibold">{previousConsultation.vitalSigns.heartRate} bpm</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Chief Complaint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-red-500" />
              Chief Complaint & History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">
                Chief Complaint <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="chiefComplaint"
                placeholder="Patient's main reason for visit..."
                value={formData.chiefComplaint}
                onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="presentIllness">History of Present Illness</Label>
              <Textarea
                id="presentIllness"
                placeholder="Timeline and progression of symptoms..."
                value={formData.presentIllness}
                onChange={(e) => handleInputChange('presentIllness', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Current Symptoms</Label>
              <Textarea
                id="symptoms"
                placeholder="Detailed description of current symptoms..."
                value={formData.symptoms}
                onChange={(e) => handleInputChange('symptoms', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vital Signs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Vital Signs
            </CardTitle>
            <CardDescription>
              Enter current vital signs - comparison with previous visit will be shown automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blood Pressure */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Blood Pressure <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Systolic"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => handleInputChange('bloodPressureSystolic', e.target.value)}
                    required
                  />
                  <span className="self-center text-gray-500">/</span>
                  <Input
                    type="number"
                    placeholder="Diastolic"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => handleInputChange('bloodPressureDiastolic', e.target.value)}
                    required
                  />
                  <span className="self-center text-sm text-gray-500">mmHg</span>
                </div>
              </div>

              {/* Heart Rate */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  Heart Rate
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 72"
                    value={formData.heartRate}
                    onChange={(e) => handleInputChange('heartRate', e.target.value)}
                  />
                  <span className="self-center text-sm text-gray-500">bpm</span>
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  Temperature
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 36.5"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                  />
                  <span className="self-center text-sm text-gray-500">°C</span>
                </div>
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-blue-500" />
                  Weight
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 70.5"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                  />
                  <span className="self-center text-sm text-gray-500">kg</span>
                </div>
              </div>

              {/* Height */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-purple-500" />
                  Height
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 170"
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                  />
                  <span className="self-center text-sm text-gray-500">cm</span>
                </div>
              </div>

              {/* Respiratory Rate */}
              <div className="space-y-2">
                <Label>Respiratory Rate</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 16"
                    value={formData.respiratoryRate}
                    onChange={(e) => handleInputChange('respiratoryRate', e.target.value)}
                  />
                  <span className="self-center text-sm text-gray-500">/min</span>
                </div>
              </div>

              {/* Oxygen Saturation */}
              <div className="space-y-2">
                <Label>Oxygen Saturation (SpO2)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 98"
                    value={formData.oxygenSaturation}
                    onChange={(e) => handleInputChange('oxygenSaturation', e.target.value)}
                  />
                  <span className="self-center text-sm text-gray-500">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Examination */}
        <Card>
          <CardHeader>
            <CardTitle>Physical Examination Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="physicalExam"
              placeholder="Detailed physical examination findings..."
              value={formData.physicalExam}
              onChange={(e) => handleInputChange('physicalExam', e.target.value)}
              rows={5}
            />
          </CardContent>
        </Card>

        {/* Comparison Card */}
        {showComparison && comparison && (
          <ComparisonCard
            comparison={comparison}
            previousDate={previousConsultation?.date}
            currentDate={new Date().toISOString()}
          />
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={!isFormValid}
            className="min-w-[200px]"
          >
            {!isFormValid ? (
              <>
                <AlertCircle className="mr-2 h-5 w-5" />
                Complete Required Fields
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Proceed to Report Generation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
