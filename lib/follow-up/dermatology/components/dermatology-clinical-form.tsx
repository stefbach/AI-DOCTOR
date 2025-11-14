'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  AlertCircle,
  Eye,
  Ruler,
  Droplets,
  Layers,
  FileText,
  Image as ImageIcon
} from 'lucide-react'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface DermatologyClinicalFormProps {
  patientDemographics: PatientDemographics | null
  previousConsultation: ConsultationHistoryItem | null
  imageComparisonData: any
  onSubmit: (data: any) => void
}

export function DermatologyClinicalForm({
  patientDemographics,
  previousConsultation,
  imageComparisonData,
  onSubmit
}: DermatologyClinicalFormProps) {
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    presentIllness: '',
    lesionLocation: '',
    lesionSize: '',
    lesionColor: '',
    lesionTexture: '',
    lesionBorders: '',
    surfaceChanges: '',
    associatedSymptoms: '',
    previousTreatmentResponse: '',
    skinExamination: '',
    diagnosis: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submissionData = {
      ...formData,
      imageComparison: imageComparisonData,
      previousConsultation,
      timestamp: new Date().toISOString()
    }

    onSubmit(submissionData)
  }

  const isFormValid = 
    formData.chiefComplaint.trim() !== '' &&
    formData.lesionLocation.trim() !== ''

  return (
    <div className="space-y-6">
      {/* Previous Consultation Reference */}
      {previousConsultation && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-indigo-600" />
              Previous Consultation Reference
            </CardTitle>
            <CardDescription>
              {new Date(previousConsultation.date).toLocaleDateString()} - {previousConsultation.chiefComplaint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previousConsultation.diagnosis && (
              <div className="mb-2">
                <p className="text-sm font-medium text-indigo-900">Previous Diagnosis:</p>
                <p className="text-sm text-indigo-700">{previousConsultation.diagnosis}</p>
              </div>
            )}
            {imageComparisonData && (
              <div className="flex items-center gap-2 mt-3">
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                <Badge variant="outline" className="border-indigo-400">
                  {imageComparisonData.previousImages.length} previous • {imageComparisonData.currentImages.length} current images
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Chief Complaint & History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" />
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
                placeholder="Patient's main concern regarding skin condition..."
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
                placeholder="Timeline of skin condition development and changes since last visit..."
                value={formData.presentIllness}
                onChange={(e) => handleInputChange('presentIllness', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousTreatmentResponse">Treatment Response Since Last Visit</Label>
              <Textarea
                id="previousTreatmentResponse"
                placeholder="How has the patient responded to previous treatment? Any side effects? Adherence issues?"
                value={formData.previousTreatmentResponse}
                onChange={(e) => handleInputChange('previousTreatmentResponse', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lesion/Skin Findings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-indigo-600" />
              Dermatological Findings
            </CardTitle>
            <CardDescription>
              Detailed description of skin lesion(s) and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lesion Location */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="lesionLocation" className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-500" />
                  Lesion Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lesionLocation"
                  placeholder="e.g., Left forearm, dorsal aspect"
                  value={formData.lesionLocation}
                  onChange={(e) => handleInputChange('lesionLocation', e.target.value)}
                  required
                />
              </div>

              {/* Lesion Size */}
              <div className="space-y-2">
                <Label htmlFor="lesionSize" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-blue-500" />
                  Size (cm)
                </Label>
                <Input
                  id="lesionSize"
                  placeholder="e.g., 2.5 x 1.5"
                  value={formData.lesionSize}
                  onChange={(e) => handleInputChange('lesionSize', e.target.value)}
                />
              </div>

              {/* Lesion Color */}
              <div className="space-y-2">
                <Label htmlFor="lesionColor" className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-pink-500" />
                  Color/Pigmentation
                </Label>
                <Input
                  id="lesionColor"
                  placeholder="e.g., Erythematous, hyperpigmented"
                  value={formData.lesionColor}
                  onChange={(e) => handleInputChange('lesionColor', e.target.value)}
                />
              </div>

              {/* Lesion Texture */}
              <div className="space-y-2">
                <Label htmlFor="lesionTexture">Texture/Consistency</Label>
                <Input
                  id="lesionTexture"
                  placeholder="e.g., Smooth, scaly, crusted"
                  value={formData.lesionTexture}
                  onChange={(e) => handleInputChange('lesionTexture', e.target.value)}
                />
              </div>

              {/* Lesion Borders */}
              <div className="space-y-2">
                <Label htmlFor="lesionBorders">Border Characteristics</Label>
                <Input
                  id="lesionBorders"
                  placeholder="e.g., Well-defined, irregular"
                  value={formData.lesionBorders}
                  onChange={(e) => handleInputChange('lesionBorders', e.target.value)}
                />
              </div>

              {/* Surface Changes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="surfaceChanges">Surface Changes</Label>
                <Textarea
                  id="surfaceChanges"
                  placeholder="e.g., Scaling, vesiculation, excoriation, crusting..."
                  value={formData.surfaceChanges}
                  onChange={(e) => handleInputChange('surfaceChanges', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Associated Symptoms */}
        <Card>
          <CardHeader>
            <CardTitle>Associated Symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="associatedSymptoms"
              placeholder="e.g., Pruritus, pain, burning sensation, discharge..."
              value={formData.associatedSymptoms}
              onChange={(e) => handleInputChange('associatedSymptoms', e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Comprehensive Skin Examination */}
        <Card>
          <CardHeader>
            <CardTitle>Comprehensive Skin Examination</CardTitle>
            <CardDescription>
              Full skin examination findings and comparison with previous visit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="skinExamination"
              placeholder="Detailed description of skin examination, including other relevant findings, comparison with previous examination..."
              value={formData.skinExamination}
              onChange={(e) => handleInputChange('skinExamination', e.target.value)}
              rows={5}
            />
          </CardContent>
        </Card>

        {/* Diagnosis */}
        <Card>
          <CardHeader>
            <CardTitle>Clinical Diagnosis/Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="diagnosis"
              placeholder="Dermatological diagnosis, differential diagnosis, clinical impression..."
              value={formData.diagnosis}
              onChange={(e) => handleInputChange('diagnosis', e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

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
