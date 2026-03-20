"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Loader2, Camera, Upload, X, ImageIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Props {
  patientData: any
  imageData: any
  ocrAnalysisData: any
  questionsData: any
  onNext: (data: any) => void
  onBack: () => void
  onImageUpdate?: (images: any[]) => void
}

export default function DermatologyDiagnosisForm(props: Props) {
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editedDiagnosis, setEditedDiagnosis] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const [uploadedImages, setUploadedImages] = useState<any[]>([])

  const hasImages = (props.imageData && props.imageData.length > 0) || uploadedImages.length > 0

  // Compress image using canvas to reduce base64 payload size
  const compressImage = useCallback((file: File, maxWidth = 1920, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(event.target?.result as string)
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
          resolve(compressedDataUrl)
        }
        img.onerror = () => reject(new Error('Failed to load image for compression'))
        img.src = event.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }, [])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: any[] = []
    let validFileCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid file type", description: `${file.name} is not an image file`, variant: "destructive" })
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit`, variant: "destructive" })
        continue
      }

      validFileCount++

      try {
        const compressedDataUrl = await compressImage(file)
        newImages.push({
          id: Date.now() + i,
          name: file.name,
          size: Math.round(compressedDataUrl.length * 0.75),
          type: 'image/jpeg',
          dataUrl: compressedDataUrl,
          uploadedAt: new Date().toISOString(),
          source: 'manual' as const
        })

        if (newImages.length === validFileCount) {
          setUploadedImages(prev => {
            const updated = [...prev, ...newImages]
            // Notify parent about the new images
            props.onImageUpdate?.(updated)
            return updated
          })
          toast({ title: "Images uploaded", description: `${newImages.length} image(s) added successfully` })
        }
      } catch (error) {
        toast({ title: "Image processing failed", description: `Failed to process ${file.name}`, variant: "destructive" })
      }
    }

    // Reset input value so the same file can be selected again
    e.target.value = ''
  }, [compressImage, props.onImageUpdate])

  const handleRemoveImage = useCallback((imageId: number) => {
    setUploadedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId)
      props.onImageUpdate?.(updated)
      return updated
    })
    toast({ title: "Image removed", description: "Image has been removed" })
  }, [props.onImageUpdate])

  const startProgressSimulation = () => {
    setProgress(0)
    setProgressMessage('Analyzing skin condition images...')

    const stages = [
      { progress: 15, message: 'Analyzing skin condition images...' },
      { progress: 30, message: 'Processing patient history...' },
      { progress: 45, message: 'Evaluating symptoms and patterns...' },
      { progress: 60, message: 'Generating differential diagnosis...' },
      { progress: 75, message: 'Creating treatment recommendations...' },
      { progress: 85, message: 'Finalizing diagnosis report...' },
    ]

    let stageIndex = 0
    progressInterval.current = setInterval(() => {
      if (stageIndex < stages.length) {
        setProgress(stages[stageIndex].progress)
        setProgressMessage(stages[stageIndex].message)
        stageIndex++
      }
    }, 3000) // Change stage every 3 seconds
  }

  const stopProgressSimulation = (success: boolean) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    if (success) {
      setProgress(100)
      setProgressMessage('Diagnosis complete!')
    }
  }

  const generateDiagnosis = async () => {
    setIsGenerating(true)
    startProgressSimulation()

    try {
      // Use locally uploaded images if no images were provided from step 1
      const effectiveImageData = (props.imageData && props.imageData.length > 0)
        ? props.imageData
        : uploadedImages

      const response = await fetch('/api/dermatology-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...props,
          imageData: effectiveImageData
        })
      })
      const data = await response.json()
      stopProgressSimulation(true)

      // Small delay to show 100% before transitioning
      await new Promise(resolve => setTimeout(resolve, 500))

      setDiagnosis(data)
      setEditedDiagnosis(data.diagnosis?.fullText || '')
      toast({ title: "Success", description: "Diagnosis generated successfully" })
    } catch (error) {
      stopProgressSimulation(false)
      toast({ title: "Error", description: "Failed to generate diagnosis", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  // Auto-generate diagnosis on component mount only if images are available
  useEffect(() => {
    if (!diagnosis && !isGenerating && hasImages) {
      generateDiagnosis()
    }

    // Cleanup interval on unmount
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Image Upload Section - shown when no images available */}
      {!hasImages && !diagnosis && !isGenerating && (
        <Card className="border-2 border-dashed border-teal-300 bg-teal-50/30">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                <Camera className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Skin Condition Image Available
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                No image was uploaded for this consultation. Upload a photo of the skin condition to improve the AI diagnosis accuracy.
              </p>
              <Button
                type="button"
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                onClick={() => document.getElementById('diagnosis-image-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Skin Image
              </Button>
              <input
                id="diagnosis-image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: JPG, PNG, GIF, WEBP (max 10MB per image)
              </p>

              <div className="mt-6 pt-6 border-t border-teal-200">
                <p className="text-sm text-gray-500 mb-3">Or continue without an image:</p>
                <Button
                  variant="outline"
                  onClick={() => generateDiagnosis()}
                  className="border-teal-300 text-teal-700 hover:bg-teal-50"
                >
                  Generate Diagnosis Without Image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Images Preview */}
      {uploadedImages.length > 0 && !diagnosis && (
        <Card className="border-teal-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Uploaded Images ({uploadedImages.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('diagnosis-image-upload-more')?.click()}
                  className="text-xs"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  Add More
                </Button>
                <input
                  id="diagnosis-image-upload-more"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploadedImages.map((image) => (
                <div key={image.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={image.dataUrl}
                    alt={image.name}
                    className="w-full h-32 object-cover"
                  />
                  <button
                    onClick={() => handleRemoveImage(image.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate">{image.name}</p>
                  </div>
                </div>
              ))}
            </div>
            {!isGenerating && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => generateDiagnosis()}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Generate Diagnosis with Images
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generating Diagnosis Progress */}
      {!diagnosis && isGenerating && (
        <Card className="border-teal-200">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-md space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{progressMessage}</span>
                  <span className="font-medium text-teal-600">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                <span>Generating AI Diagnosis...</span>
              </div>

              <p className="text-xs text-gray-400 text-center max-w-sm">
                Our AI is analyzing the skin condition images and patient data to provide a comprehensive diagnosis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnosis Result */}
      {diagnosis && (
        <>
          <Card className="border-teal-200">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle>Dermatological Diagnosis</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea value={editedDiagnosis} onChange={(e) => setEditedDiagnosis(e.target.value)} className="min-h-[400px] font-mono text-sm" />
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={props.onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            <Button onClick={() => props.onNext({ ...diagnosis, diagnosis: { ...diagnosis.diagnosis, fullText: editedDiagnosis } })} className="bg-gradient-to-r from-teal-600 to-cyan-600">
              Continue to Report<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
