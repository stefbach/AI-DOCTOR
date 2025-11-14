'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CheckCircle,
  AlertCircle,
  Heart,
  Pill,
  FileText,
  TrendingUp,
  Activity
} from 'lucide-react'
import { ComparisonCard } from '@/lib/follow-up/shared'
import { compareVitalSigns } from '@/lib/follow-up/shared/utils/data-comparator'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface ChronicClinicalFormProps {
  patientDemographics: PatientDemographics | null
  previousConsultation: ConsultationHistoryItem | null
  trendsData: any
  onSubmit: (data: any) => void
}

export function ChronicClinicalForm({
  patientDemographics,
  previousConsultation,
  trendsData,
  onSubmit
}: ChronicClinicalFormProps) {
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    chronicConditionStatus: '',
    symptomsChanges: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    weight: '',
    height: patientDemographics?.height?.toString() || '',
    glucose: '',
    medicationAdherence: true,
    missedDoses: '',
    sideEffects: '',
    lifestyleChanges: '',
    dietAdherence: '',
    exerciseRoutine: '',
    clinicalAssessment: ''
  })

  const [showComparison, setShowComparison] = useState(false)
  const [comparison, setComparison] = useState<any>(null)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    if (['bloodPressureSystolic', 'bloodPressureDiastolic', 'weight', 'height', 'glucose'].includes(field) && typeof value === 'string') {
      updateComparison({ ...formData, [field]: value })
    }
  }

  const updateComparison = (data: typeof formData) => {
    if (!previousConsultation?.vitalSigns) return

    const currentVitals: any = {}
    if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
      currentVitals.bloodPressureSystolic = parseFloat(data.bloodPressureSystolic)
      currentVitals.bloodPressureDiastolic = parseFloat(data.bloodPressureDiastolic)
    }
    if (data.weight) currentVitals.weight = parseFloat(data.weight)
    if (data.height) currentVitals.height = parseFloat(data.height)
    if (data.glucose) currentVitals.glucose = parseFloat(data.glucose)

    if (Object.keys(currentVitals).length > 0) {
      const comparisonResult = compareVitalSigns(
        previousConsultation.vitalSigns,
        currentVitals,
        { isDiabetic: true }
      )
      setComparison(comparisonResult)
      setShowComparison(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let bmi = null
    if (formData.weight && formData.height) {
      const weight = parseFloat(formData.weight)
      const height = parseFloat(formData.height) / 100
      bmi = (weight / (height * height)).toFixed(1)
    }

    onSubmit({
      ...formData,
      bmi,
      comparison,
      trendsData,
      previousConsultation,
      timestamp: new Date().toISOString()
    })
  }

  const isValid = formData.chiefComplaint.trim() !== '' && formData.bloodPressureSystolic !== ''

  return (
    <div className="space-y-6">
      {trendsData && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                <strong>{trendsData.consultationCount} consultations</strong> analyzed for long-term trends
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" />
              Chief Complaint & Chronic Condition Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chiefComplaint">Chief Complaint <span className="text-red-500">*</span></Label>
              <Textarea
                id="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="chronicConditionStatus">Chronic Condition Status</Label>
              <Textarea
                id="chronicConditionStatus"
                value={formData.chronicConditionStatus}
                onChange={(e) => handleInputChange('chronicConditionStatus', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="symptomsChanges">Symptoms Changes Since Last Visit</Label>
              <Textarea
                id="symptomsChanges"
                value={formData.symptomsChanges}
                onChange={(e) => handleInputChange('symptomsChanges', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Current Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Blood Pressure <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Systolic"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => handleInputChange('bloodPressureSystolic', e.target.value)}
                    required
                  />
                  <span className="self-center">/</span>
                  <Input
                    type="number"
                    placeholder="Diastolic"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => handleInputChange('bloodPressureDiastolic', e.target.value)}
                    required
                  />
                  <span className="self-center text-sm">mmHg</span>
                </div>
              </div>
              <div>
                <Label>Weight</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                  />
                  <span className="self-center text-sm">kg</span>
                </div>
              </div>
              <div>
                <Label>Height</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                  />
                  <span className="self-center text-sm">cm</span>
                </div>
              </div>
              <div>
                <Label>Blood Glucose</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.glucose}
                    onChange={(e) => handleInputChange('glucose', e.target.value)}
                  />
                  <span className="self-center text-sm">mmol/L</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              Medication Compliance & Side Effects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="medicationAdherence"
                checked={formData.medicationAdherence}
                onCheckedChange={(checked) => handleInputChange('medicationAdherence', checked as boolean)}
              />
              <Label htmlFor="medicationAdherence">Patient is adherent to prescribed medications</Label>
            </div>
            <div>
              <Label htmlFor="missedDoses">Missed Doses / Non-Adherence Details</Label>
              <Textarea
                id="missedDoses"
                value={formData.missedDoses}
                onChange={(e) => handleInputChange('missedDoses', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="sideEffects">Side Effects Reported</Label>
              <Textarea
                id="sideEffects"
                value={formData.sideEffects}
                onChange={(e) => handleInputChange('sideEffects', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Lifestyle & Self-Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dietAdherence">Diet Adherence</Label>
              <Textarea
                id="dietAdherence"
                value={formData.dietAdherence}
                onChange={(e) => handleInputChange('dietAdherence', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="exerciseRoutine">Exercise Routine</Label>
              <Textarea
                id="exerciseRoutine"
                value={formData.exerciseRoutine}
                onChange={(e) => handleInputChange('exerciseRoutine', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="lifestyleChanges">Lifestyle Changes Since Last Visit</Label>
              <Textarea
                id="lifestyleChanges"
                value={formData.lifestyleChanges}
                onChange={(e) => handleInputChange('lifestyleChanges', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinical Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="clinicalAssessment"
              value={formData.clinicalAssessment}
              onChange={(e) => handleInputChange('clinicalAssessment', e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {showComparison && comparison && (
          <ComparisonCard
            comparison={comparison}
            previousDate={previousConsultation?.date}
            currentDate={new Date().toISOString()}
          />
        )}

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={!isValid} className="min-w-[200px]">
            {!isValid ? (
              <><AlertCircle className="mr-2 h-5 w-5" />Complete Required Fields</>
            ) : (
              <><CheckCircle className="mr-2 h-5 w-5" />Generate Report</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
