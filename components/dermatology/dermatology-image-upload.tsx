"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  X,
  Camera,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  ImageIcon,
  Brain,
  CloudDownload,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useTibokConsultation, DermatologyImageData } from "@/hooks/use-tibok-consultation"

interface DermatologyImageUploadProps {
  patientData: any
  onNext: (data: { images: any[], ocrAnalysis: any }) => void
  onBack: () => void
}

export default function DermatologyImageUpload({
  patientData,
  onNext,
  onBack
}: DermatologyImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<any[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [ocrResults, setOcrResults] = useState<any>(null)
  const [tibokImageLoaded, setTibokImageLoaded] = useState(false)

  // Use Tibok consultation hook for auto-fetching images
  // Pass consultationId from patientData since URL params are lost during navigation
  const {
    dermatologyImage,
    hasPatientImage,
    imageExpired,
    unableToProvideImage,
    loadingImage,
    imageError,
    shouldShowImageUpload,
    fetchImage
  } = useTibokConsultation({ consultationId: patientData?.consultationId })

  // Auto-load Tibok image from direct URL (from patientData.tibokImageUrl)
  useEffect(() => {
    const loadTibokImageFromUrl = async () => {
      // Check if we have a direct Tibok image URL in patientData
      const tibokImageUrl = patientData?.tibokImageUrl
      const hasTibokImage = patientData?.hasTibokImage

      if (tibokImageUrl && hasTibokImage && !tibokImageLoaded) {
        console.log('📸 Loading patient image directly from Tibok URL:', tibokImageUrl)

        try {
          // Fetch the image and convert to data URL
          const response = await fetch(tibokImageUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`)
          }

          const blob = await response.blob()
          const reader = new FileReader()

          reader.onload = () => {
            const dataUrl = reader.result as string

            const tibokImage = {
              id: Date.now(),
              name: 'patient-image-tibok.jpg',
              size: blob.size,
              type: blob.type || 'image/jpeg',
              dataUrl: dataUrl,
              uploadedAt: patientData?.imageUploadedAt || new Date().toISOString(),
              source: 'tibok' as const
            }

            setUploadedImages([tibokImage])
            setTibokImageLoaded(true)

            toast({
              title: "Image Patient Chargée",
              description: "L'image téléchargée par le patient depuis Tibok a été automatiquement chargée",
            })
          }

          reader.onerror = () => {
            console.error('❌ Error reading image blob')
            toast({
              title: "Erreur de chargement",
              description: "Impossible de charger l'image du patient. Veuillez télécharger manuellement.",
              variant: "destructive"
            })
          }

          reader.readAsDataURL(blob)
        } catch (error) {
          console.error('❌ Error loading Tibok image from URL:', error)
          toast({
            title: "Erreur de chargement",
            description: "Impossible de charger l'image du patient. Veuillez télécharger manuellement.",
            variant: "destructive"
          })
        }
      }
    }

    loadTibokImageFromUrl()
  }, [patientData?.tibokImageUrl, patientData?.hasTibokImage, tibokImageLoaded])

  // Auto-load Tibok image from hook (fallback method)
  useEffect(() => {
    if (dermatologyImage && !tibokImageLoaded) {
      console.log('📸 Auto-loading patient image from Tibok hook')

      // Add the Tibok image to uploaded images
      const tibokImage = {
        id: dermatologyImage.id,
        name: dermatologyImage.name,
        size: dermatologyImage.size,
        type: dermatologyImage.type,
        dataUrl: dermatologyImage.dataUrl,
        uploadedAt: dermatologyImage.uploadedAt,
        source: 'tibok' as const
      }

      setUploadedImages([tibokImage])
      setTibokImageLoaded(true)

      toast({
        title: "Image Patient Chargée",
        description: "L'image téléchargée par le patient depuis Tibok a été automatiquement chargée",
      })
    }
  }, [dermatologyImage, tibokImageLoaded])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: any[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        })
        continue
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive"
        })
        continue
      }

      // Convert to base64
      const reader = new FileReader()
      reader.onload = (event) => {
        newImages.push({
          id: Date.now() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: event.target?.result as string,
          uploadedAt: new Date().toISOString(),
          source: 'manual' as const
        })

        // Update state when all files are processed
        if (newImages.length === files.length) {
          setUploadedImages(prev => [...prev, ...newImages])
          toast({
            title: "Images uploaded",
            description: `${newImages.length} image(s) added successfully`
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleRemoveImage = useCallback((imageId: number) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
    // Reset OCR results when images change
    setOcrResults(null)
    toast({
      title: "Image removed",
      description: "Image has been removed from the upload list"
    })
  }, [])

  const handleAnalyzeImages = useCallback(async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No images",
        description: "Please upload at least one image before analyzing",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)

    try {
      // Call OCR API for image analysis
      const response = await fetch('/api/dermatology-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedImages.map(img => ({
            id: img.id,
            name: img.name,
            dataUrl: img.dataUrl
          })),
          patientData: {
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            age: patientData.age,
            gender: patientData.gender
          },
          additionalNotes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze images')
      }

      const result = await response.json()
      setOcrResults(result)

      toast({
        title: "Analysis complete",
        description: "AI has analyzed your skin images successfully"
      })
    } catch (error) {
      console.error('Error analyzing images:', error)
      toast({
        title: "Analysis failed",
        description: "Failed to analyze images. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [uploadedImages, patientData, additionalNotes])

  const handleContinue = useCallback(() => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No images uploaded",
        description: "Please upload at least one image",
        variant: "destructive"
      })
      return
    }

    if (!ocrResults) {
      toast({
        title: "Analysis required",
        description: "Please analyze the images before continuing",
        variant: "destructive"
      })
      return
    }

    onNext({
      images: uploadedImages,
      ocrAnalysis: ocrResults
    })
  }, [uploadedImages, ocrResults, onNext])

  const handleRetryFetchImage = useCallback(async () => {
    await fetchImage()
  }, [fetchImage])

  return (
    <div className="space-y-6">
      {/* Loading Tibok Image */}
      {loadingImage && (
        <Alert className="border-blue-200 bg-blue-50">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            <strong>Loading patient image...</strong> Fetching the image uploaded by the patient from Tibok.
          </AlertDescription>
        </Alert>
      )}

      {/* Tibok Image Loaded Successfully */}
      {tibokImageLoaded && uploadedImages.some(img => img.source === 'tibok') && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Patient image loaded!</strong> The image uploaded by the patient has been automatically retrieved from Tibok.
          </AlertDescription>
        </Alert>
      )}

      {/* Image Error - Show retry option */}
      {imageError && !tibokImageLoaded && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>Could not load patient image.</strong> {imageError}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryFetchImage}
                className="ml-4 border-amber-400 text-amber-700 hover:bg-amber-100"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Image Expired Warning */}
      {imageExpired && hasPatientImage && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Image URL expired.</strong> The patient's uploaded image link has expired. Please upload a new image manually.
          </AlertDescription>
        </Alert>
      )}

      {/* Patient Unable to Provide Image */}
      {unableToProvideImage && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Patient unable to provide image.</strong> The patient indicated they cannot provide an image. You may proceed without an image or upload one yourself.
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions - Only show when no Tibok image loaded */}
      {!tibokImageLoaded && (
        <Alert className="border-teal-200 bg-teal-50">
          <Camera className="h-4 w-4 text-teal-600" />
          <AlertDescription className="text-teal-800">
            <strong>Instructions:</strong> Upload clear photos of the skin condition from different angles. Make sure the images are well-lit and in focus. You can upload multiple images.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section - Only show when no Tibok image loaded */}
      {!tibokImageLoaded && shouldShowImageUpload && (
        <Card className="border-2 border-dashed border-teal-300 bg-teal-50/30">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Skin Condition Images
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Click to select images or drag and drop (max 10MB per image)
              </p>
              <label htmlFor="image-upload">
                <Button
                  type="button"
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 cursor-pointer"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Select Images
                </Button>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: JPG, PNG, GIF, WEBP
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Images Preview */}
      {uploadedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Images ({uploadedImages.length})
            </h3>
            <Badge variant="secondary" className="bg-teal-100 text-teal-800">
              Ready for analysis
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedImages.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="w-full h-48 object-cover"
                    />
                    {/* Source badge */}
                    {image.source === 'tibok' && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-blue-500 text-white text-xs">
                          <CloudDownload className="h-3 w-3 mr-1" />
                          Patient Upload
                        </Badge>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {image.source === 'tibok' ? 'Patient Uploaded Image' : image.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(image.size / 1024).toFixed(2)} KB
                      {image.source === 'tibok' && ' • From Tibok'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="additionalNotes" className="text-base font-semibold">
          Additional Clinical Notes (Optional)
        </Label>
        <Textarea
          id="additionalNotes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Describe symptoms, duration, any previous treatments, etc."
          className="min-h-[100px]"
        />
      </div>

      {/* AI Analysis Button */}
      {uploadedImages.length > 0 && !ocrResults && (
        <div className="flex justify-center">
          <Button
            onClick={handleAnalyzeImages}
            disabled={isAnalyzing}
            size="lg"
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyzing Images...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 mr-2" />
                Analyze Images with AI
              </>
            )}
          </Button>
        </div>
      )}

      {/* OCR Analysis Results */}
      {ocrResults && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-teal-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-teal-900 mb-2">
                  AI Analysis Completed
                </h3>
                <p className="text-sm text-teal-800 mb-4">
                  {ocrResults.summary}
                </p>

                {ocrResults.observations && ocrResults.observations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-teal-900">Key Observations:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {ocrResults.observations.map((obs: string, idx: number) => (
                        <li key={idx} className="text-sm text-teal-800">{obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={uploadedImages.length === 0 || !ocrResults}
          size="lg"
          className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
        >
          Continue to Questions
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
