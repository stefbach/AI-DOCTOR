'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Image as ImageIcon,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  ZoomIn,
  Calendar
} from 'lucide-react'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface DermatologyImageComparisonProps {
  patientDemographics: PatientDemographics | null
  previousConsultation: ConsultationHistoryItem | null
  onComplete: (data: any) => void
}

export function DermatologyImageComparison({
  patientDemographics,
  previousConsultation,
  onComplete
}: DermatologyImageComparisonProps) {
  const [currentImages, setCurrentImages] = useState<string[]>([])
  const [imageNotes, setImageNotes] = useState('')
  const [visualComparison, setVisualComparison] = useState('')

  const previousImages = previousConsultation?.images || []

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // In a real application, you would upload these to a server
    // For now, we'll create data URLs
    const fileArray = Array.from(files)
    fileArray.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setCurrentImages(prev => [...prev, event.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    setCurrentImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleComplete = () => {
    const comparisonData = {
      previousImages,
      currentImages,
      imageNotes,
      visualComparison,
      timestamp: new Date().toISOString()
    }
    onComplete(comparisonData)
  }

  const isReadyToProceed = currentImages.length > 0

  return (
    <div className="space-y-6">
      {/* Instruction Alert */}
      <Alert className="bg-indigo-50 border-indigo-200">
        <Eye className="h-4 w-4 text-indigo-600" />
        <AlertDescription className="text-indigo-800">
          📸 Upload current skin condition images and compare with previous visit to track treatment progress
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Previous Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              Previous Visit Images
            </CardTitle>
            <CardDescription>
              {previousConsultation 
                ? `From ${new Date(previousConsultation.date).toLocaleDateString()}`
                : 'No previous images available'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previousImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {previousImages.map((imageUrl, idx) => (
                  <div key={idx} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={`Previous image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <Badge className="absolute top-2 right-2 bg-gray-800">
                      Image {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No previous images available</p>
                <p className="text-sm mt-1">This is the first consultation with images</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Images Upload */}
        <Card className="border-2 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-600" />
              Current Visit Images
            </CardTitle>
            <CardDescription>
              Upload new images of the skin condition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Button */}
            <div className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="image-upload"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-3 text-indigo-500" />
                <p className="text-sm font-medium text-gray-700">
                  Click to upload images
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG up to 10MB each
                </p>
              </label>
            </div>

            {/* Uploaded Images Preview */}
            {currentImages.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {currentImages.map((imageUrl, idx) => (
                  <div key={idx} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-indigo-300 bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={`Current image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Badge className="absolute bottom-2 left-2 bg-indigo-600">
                      New {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visual Comparison Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Visual Comparison Analysis</CardTitle>
          <CardDescription>
            Describe observable changes between previous and current images
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visualComparison">
              Visual Changes Observed
            </Label>
            <Textarea
              id="visualComparison"
              placeholder="e.g., Lesion size reduced from ~2cm to ~1cm, erythema decreased, crusting resolved, hyperpigmentation noted..."
              value={visualComparison}
              onChange={(e) => setVisualComparison(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageNotes">
              Additional Image Notes
            </Label>
            <Textarea
              id="imageNotes"
              placeholder="Any additional notes about image quality, lighting, angles, or specific areas of interest..."
              value={imageNotes}
              onChange={(e) => setImageNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      {currentImages.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Image Comparison Ready
                  </p>
                  <p className="text-sm text-blue-700">
                    {previousImages.length} previous image{previousImages.length !== 1 ? 's' : ''} • {currentImages.length} current image{currentImages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleComplete}
          disabled={!isReadyToProceed}
          size="lg"
          className="min-w-[250px]"
        >
          {!isReadyToProceed ? (
            <>
              <AlertCircle className="mr-2 h-5 w-5" />
              Upload Current Images to Continue
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Proceed to Clinical Findings
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
