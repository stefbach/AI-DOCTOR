# Module Documents Médicaux - Exemples de Code

## 📝 Exemples d'Implémentation Détaillés

---

## 1. Types TypeScript Complets

```typescript
// lib/follow-up/medical-documents/types/document-types.ts

export type DocumentType = 'biology' | 'radiology'
export type UrgencyLevel = 'routine' | 'priority' | 'urgent' | 'critical'
export type BiologyStatus = 'normal' | 'borderline' | 'low' | 'high' | 'critical'

// ===== BIOLOGY TYPES =====

export interface BiologyResult {
  id: string
  parameter: string
  value: number | string
  unit: string
  normalRange: {
    min?: number
    max?: number
    text: string
  }
  status: BiologyStatus
  flag?: 'L' | 'H' | 'LL' | 'HH'  // Low, High, Very Low, Very High
  interpretation?: string
  criticalValue?: boolean
}

export interface BiologyDocument {
  type: 'biology'
  testName: string
  testCategory: 'hematology' | 'biochemistry' | 'immunology' | 'microbiology' | 'other'
  laboratory: {
    name: string
    address?: string
    phone?: string
  }
  sampleInfo: {
    type: string  // blood, urine, etc.
    collectionDate: string
    collectionTime?: string
  }
  reportDate: string
  results: BiologyResult[]
  comments?: string
  requestingPhysician?: string
}

// ===== RADIOLOGY TYPES =====

export interface RadiologyFinding {
  id: string
  location: string
  description: string
  measurement?: string
  significance: 'benign' | 'indeterminate' | 'suspicious' | 'urgent'
  correlationNeeded?: boolean
}

export interface RadiologyDocument {
  type: 'radiology'
  examType: string  // "CT Scan", "MRI", "X-Ray", etc.
  examCategory: 'chest' | 'abdomen' | 'neuro' | 'musculoskeletal' | 'other'
  technique: string
  region: string
  indication: string
  date: string
  time?: string
  facility: {
    name: string
    address?: string
  }
  clinicalHistory?: string
  comparison?: {
    hasComparison: boolean
    comparisonDate?: string
    comparisonNotes?: string
  }
  findings: RadiologyFinding[]
  impression: string
  conclusion: string
  recommendations?: string[]
  radiologist: {
    name: string
    signature?: string
  }
  urgentFindings?: boolean
}

// ===== UNIFIED DOCUMENT TYPES =====

export interface MedicalDocument {
  id: string
  patientId: string
  documentType: DocumentType
  uploadDate: string
  uploadedBy?: string
  originalDocument: {
    name: string
    size: number
    mimeType: string
    dataUrl?: string
    thumbnailUrl?: string
  }
  extractedData: BiologyDocument | RadiologyDocument
  ocrMetadata: {
    confidence: number
    method: 'gpt4-vision' | 'gemini-vision' | 'tesseract'
    processingTime: number
    needsReview: boolean
    reviewedBy?: string
    reviewDate?: string
  }
}

export interface AnalyzedDocument extends MedicalDocument {
  analysis: {
    id: string
    generatedAt: string
    aiModel: string
    summary: string
    keyFindings: KeyFinding[]
    abnormalities: Abnormality[]
    clinicalSignificance: string
    recommendations: Recommendation[]
    urgency: UrgencyLevel
    actionItems: ActionItem[]
    requiresFollowUp: boolean
    suggestedSpecialty?: string
  }
  associatedConsultationId?: string
  consultationType?: 'normal' | 'dermatology' | 'chronic'
}

export interface KeyFinding {
  id: string
  category: string
  description: string
  severity: 'mild' | 'moderate' | 'severe'
  requiresAction: boolean
}

export interface Abnormality {
  id: string
  parameter: string
  actualValue: string
  expectedRange: string
  deviation: 'above' | 'below'
  clinicalImplication: string
  urgency: UrgencyLevel
}

export interface Recommendation {
  id: string
  type: 'treatment' | 'investigation' | 'referral' | 'lifestyle' | 'monitoring'
  priority: 'immediate' | 'short-term' | 'long-term'
  description: string
  rationale: string
}

export interface ActionItem {
  id: string
  action: string
  timeline: string
  responsible: string
  status: 'pending' | 'in-progress' | 'completed'
}

// ===== COMPARISON TYPES =====

export interface DocumentComparison {
  id: string
  generatedAt: string
  previousDocument: AnalyzedDocument
  currentDocument: AnalyzedDocument
  timeInterval: {
    days: number
    formattedText: string
  }
  comparisonType: 'biology' | 'radiology'
  analysis: BiologyComparison | RadiologyComparison
}

export interface BiologyComparison {
  type: 'biology'
  summary: string
  trends: BiologyTrend[]
  overallTrend: 'improving' | 'stable' | 'worsening' | 'mixed'
  significantChanges: SignificantChange[]
  clinicalSignificance: string
  recommendations: string[]
}

export interface BiologyTrend {
  parameter: string
  previousValue: number | string
  currentValue: number | string
  change: {
    absolute: number | null
    percentage: number | null
    direction: 'increased' | 'decreased' | 'stable'
  }
  trendAnalysis: string
  clinicalRelevance: string
}

export interface SignificantChange {
  parameter: string
  description: string
  clinicalImplication: string
  requiresAction: boolean
  urgency: UrgencyLevel
}

export interface RadiologyComparison {
  type: 'radiology'
  summary: string
  evolution: {
    overall: 'improved' | 'stable' | 'progressed' | 'mixed'
    description: string
  }
  findingComparisons: FindingComparison[]
  newFindings?: RadiologyFinding[]
  resolvedFindings?: RadiologyFinding[]
  clinicalSignificance: string
  recommendations: string[]
}

export interface FindingComparison {
  location: string
  previousState: string
  currentState: string
  change: 'improved' | 'stable' | 'worsened' | 'new' | 'resolved'
  details: string
  clinicalRelevance: string
}

// ===== FOLLOW-UP INTEGRATION =====

export interface DocumentFollowUpData {
  patientDemographics: {
    fullName: string
    age: number
    gender: string
    email?: string
    phone?: string
  }
  currentDocument: AnalyzedDocument
  previousDocument?: AnalyzedDocument
  documentComparison?: DocumentComparison
  clinicalData: {
    chiefComplaint: string
    currentSymptoms: string[]
    symptomsSince?: string
    currentMedications?: string[]
    relevantHistory?: string
    physicalExam?: string
    vitalSigns?: Record<string, string>
  }
  consultationHistory: Array<{
    id: string
    date: string
    type: string
    diagnosis?: string
  }>
  consultationType: 'normal' | 'dermatology' | 'chronic'
}

export interface DocumentFollowUpReport {
  id: string
  generatedAt: string
  summary: string
  documentAnalysis: string
  comparativeAnalysis?: string
  clinicalCorrelation: string
  assessmentAndPlan: {
    assessment: string
    plan: string[]
  }
  recommendations: Recommendation[]
  nextSteps: string[]
  followUpSchedule?: {
    recommendedDate: string
    reasonForFollowUp: string
    examsToRepeat?: string[]
  }
  urgency: UrgencyLevel
  requiresSpecialistReferral: boolean
  referralDetails?: {
    specialty: string
    reason: string
    priority: string
  }
}
```

---

## 2. Composant DocumentUpload

```typescript
// components/medical-documents/document-upload.tsx

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  X, 
  ArrowLeft,
  ArrowRight, 
  Loader2,
  FileCheck,
  AlertCircle,
  TestTube,
  Scan
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { DocumentType } from '@/lib/follow-up/medical-documents/types/document-types'

interface DocumentUploadProps {
  patientData: any
  onNext: (data: { 
    document: any, 
    documentType: DocumentType, 
    clinicalContext: string 
  }) => void
  onBack: () => void
}

export default function DocumentUpload({
  patientData,
  onNext,
  onBack
}: DocumentUploadProps) {
  const [uploadedDocument, setUploadedDocument] = useState<any>(null)
  const [documentType, setDocumentType] = useState<DocumentType | 'auto'>('auto')
  const [clinicalContext, setClinicalContext] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  const handleDocumentUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPG, PNG, WEBP)",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 15MB",
        variant: "destructive"
      })
      return
    }

    setIsValidating(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        
        setUploadedDocument({
          id: Date.now(),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: dataUrl,
          uploadedAt: new Date().toISOString()
        })

        toast({
          title: "Document uploaded",
          description: `${file.name} uploaded successfully`
        })
        
        setIsValidating(false)
      }
      
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read the file",
          variant: "destructive"
        })
        setIsValidating(false)
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading document:', error)
      toast({
        title: "Upload error",
        description: "An error occurred during upload",
        variant: "destructive"
      })
      setIsValidating(false)
    }
  }, [])

  const handleRemoveDocument = useCallback(() => {
    setUploadedDocument(null)
    toast({
      title: "Document removed",
      description: "Document has been removed"
    })
  }, [])

  const handleContinue = useCallback(() => {
    if (!uploadedDocument) {
      toast({
        title: "No document",
        description: "Please upload a document before continuing",
        variant: "destructive"
      })
      return
    }

    if (documentType === 'auto') {
      toast({
        title: "Document type required",
        description: "Please select the document type or choose auto-detect",
        variant: "destructive"
      })
      return
    }

    onNext({
      document: uploadedDocument,
      documentType: documentType as DocumentType,
      clinicalContext
    })
  }, [uploadedDocument, documentType, clinicalContext, onNext])

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert className="border-blue-200 bg-blue-50">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Instructions:</strong> Upload a laboratory report (biology) or radiology report. 
          The document should be clear and readable. Supported formats: PDF, JPG, PNG, WEBP (max 15MB).
        </AlertDescription>
      </Alert>

      {/* Document Type Selection */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">
            Document Type
          </Label>
          <RadioGroup 
            value={documentType} 
            onValueChange={(value) => setDocumentType(value as DocumentType | 'auto')}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileCheck className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-semibold">Auto-detect</p>
                    <p className="text-sm text-gray-600">Let AI determine the document type</p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="biology" id="biology" />
                <Label htmlFor="biology" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TestTube className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Biology / Laboratory Results</p>
                    <p className="text-sm text-gray-600">Blood tests, urine analysis, etc.</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="radiology" id="radiology" />
                <Label htmlFor="radiology" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Scan className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">Radiology Report</p>
                    <p className="text-sm text-gray-600">X-Ray, CT, MRI, Ultrasound reports</p>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50/30">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Medical Document
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Click to select a document or drag and drop (max 15MB)
            </p>
            <label htmlFor="document-upload">
              <Button 
                type="button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
                onClick={() => document.getElementById('document-upload')?.click()}
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Select Document
                  </>
                )}
              </Button>
            </label>
            <input
              id="document-upload"
              type="file"
              accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleDocumentUpload}
              disabled={isValidating}
            />
            <p className="text-xs text-gray-500 mt-4">
              Supported formats: PDF, JPG, PNG, WEBP
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Document Preview */}
      {uploadedDocument && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-1">
                    Document Uploaded
                  </h4>
                  <p className="text-sm text-green-800 mb-2">
                    {uploadedDocument.name}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {(uploadedDocument.size / 1024).toFixed(2)} KB
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {uploadedDocument.type}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveDocument}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Context */}
      <div className="space-y-2">
        <Label htmlFor="clinicalContext" className="text-base font-semibold">
          Clinical Context (Optional)
        </Label>
        <Textarea
          id="clinicalContext"
          value={clinicalContext}
          onChange={(e) => setClinicalContext(e.target.value)}
          placeholder="Reason for the exam, current symptoms, relevant medical history..."
          className="min-h-[100px]"
        />
        <p className="text-xs text-gray-500">
          This information helps AI provide more accurate analysis and recommendations
        </p>
      </div>

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
          disabled={!uploadedDocument || isValidating}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          Continue to Extraction
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
```

---

## 3. API OCR Document Médical

```typescript
// app/api/medical-document-ocr/route.ts

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { DocumentType, BiologyDocument, RadiologyDocument } from '@/lib/follow-up/medical-documents/types/document-types'

export async function POST(request: NextRequest) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const body = await request.json()
    const { 
      document, 
      documentType, 
      patientData, 
      clinicalContext 
    } = body

    console.log(`📄 Starting OCR for medical document: ${document.name}`)
    console.log(`👤 Patient: ${patientData.firstName} ${patientData.lastName}`)
    console.log(`📋 Document type: ${documentType}`)

    // Determine if document is PDF or image
    const isPDF = document.type === 'application/pdf'
    
    // For PDF, we need to convert first page to image or use PDF.js
    // For simplicity, we'll assume it's an image or base64 image from PDF
    
    const ocrPrompt = documentType === 'biology' 
      ? getBiologyOCRPrompt(patientData, clinicalContext)
      : documentType === 'radiology'
      ? getRadiologyOCRPrompt(patientData, clinicalContext)
      : getAutoDetectOCRPrompt(patientData, clinicalContext)

    // Use GPT-4 Vision for OCR
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert medical document processor specialized in extracting structured data from laboratory and radiology reports."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: ocrPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: document.dataUrl
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })

    const extractedDataRaw = completion.choices[0].message.content || '{}'
    const extractedData = JSON.parse(extractedDataRaw)

    // Validate and structure the data
    const structuredData = documentType === 'biology' || extractedData.detectedType === 'biology'
      ? structureBiologyData(extractedData)
      : structureRadiologyData(extractedData)

    const result = {
      success: true,
      documentId: `DOC-${Date.now()}`,
      extractedText: extractedData.rawText || '',
      detectedType: extractedData.detectedType || documentType,
      structuredData,
      ocrMetadata: {
        confidence: extractedData.confidence || 0.85,
        method: 'gpt4-vision',
        processingTime: Date.now(),
        needsReview: extractedData.confidence < 0.8
      },
      timestamp: new Date().toISOString()
    }

    console.log('✅ OCR extraction completed successfully')

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ Error in medical document OCR:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to extract document data',
        message: error.message,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

function getBiologyOCRPrompt(patientData: any, clinicalContext: string): string {
  return `Extract all information from this laboratory/biology report and return it in JSON format.

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age}
- Gender: ${patientData.gender}

CLINICAL CONTEXT:
${clinicalContext || 'Not provided'}

INSTRUCTIONS:
1. Extract ALL test results with their values, units, and normal ranges
2. Identify the laboratory name and contact information
3. Extract sample collection date/time and report date
4. Flag any abnormal values
5. Extract any comments or notes from the report

RETURN JSON WITH THIS EXACT STRUCTURE:
{
  "detectedType": "biology",
  "confidence": 0.95,
  "rawText": "full extracted text...",
  "data": {
    "testName": "Complete Blood Count",
    "testCategory": "hematology",
    "laboratory": {
      "name": "Lab name",
      "address": "Address if available",
      "phone": "Phone if available"
    },
    "sampleInfo": {
      "type": "blood/urine/etc",
      "collectionDate": "YYYY-MM-DD",
      "collectionTime": "HH:MM"
    },
    "reportDate": "YYYY-MM-DD",
    "results": [
      {
        "id": "unique-id",
        "parameter": "Hemoglobin",
        "value": 14.5,
        "unit": "g/dL",
        "normalRange": {
          "min": 12.0,
          "max": 16.0,
          "text": "12.0-16.0"
        },
        "status": "normal",
        "flag": null,
        "interpretation": "Within normal limits",
        "criticalValue": false
      }
    ],
    "comments": "Any additional comments from the report"
  }
}

IMPORTANT:
- Extract ALL parameters, even if values are normal
- Convert all values to numbers where possible
- Identify abnormal values (status: "low", "high", "critical")
- Include normal ranges exactly as shown
- If information is missing, use null`
}

function getRadiologyOCRPrompt(patientData: any, clinicalContext: string): string {
  return `Extract all information from this radiology report and return it in JSON format.

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age}
- Gender: ${patientData.gender}

CLINICAL CONTEXT:
${clinicalContext || 'Not provided'}

INSTRUCTIONS:
1. Extract exam type, technique, and region examined
2. Extract all findings with their locations and descriptions
3. Identify the main impression/conclusion
4. Extract radiologist information
5. Note any urgent findings

RETURN JSON WITH THIS EXACT STRUCTURE:
{
  "detectedType": "radiology",
  "confidence": 0.95,
  "rawText": "full extracted text...",
  "data": {
    "examType": "CT Scan",
    "examCategory": "chest",
    "technique": "Multi-detector CT without contrast",
    "region": "Thorax",
    "indication": "Reason for exam",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "facility": {
      "name": "Radiology center name",
      "address": "Address if available"
    },
    "clinicalHistory": "Relevant history from report",
    "comparison": {
      "hasComparison": true,
      "comparisonDate": "YYYY-MM-DD",
      "comparisonNotes": "Comparison notes"
    },
    "findings": [
      {
        "id": "unique-id",
        "location": "Right lower lobe",
        "description": "8mm nodule",
        "measurement": "8mm",
        "significance": "indeterminate",
        "correlationNeeded": true
      }
    ],
    "impression": "Main impression/summary",
    "conclusion": "Final conclusion",
    "recommendations": ["Follow-up CT in 3 months", "Clinical correlation suggested"],
    "radiologist": {
      "name": "Dr. Name",
      "signature": "signature if visible"
    },
    "urgentFindings": false
  }
}

IMPORTANT:
- Extract ALL findings, even minor ones
- Preserve measurements exactly as stated
- Note urgency if mentioned
- Extract comparison notes if available`
}

function getAutoDetectOCRPrompt(patientData: any, clinicalContext: string): string {
  return `Analyze this medical document and determine if it's a laboratory (biology) report or a radiology report.
Then extract all relevant information accordingly.

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age}
- Gender: ${patientData.gender}

CLINICAL CONTEXT:
${clinicalContext || 'Not provided'}

INSTRUCTIONS:
1. First determine the document type: "biology" or "radiology"
2. Then extract all relevant information based on the detected type
3. Return structured data appropriate for the document type

RETURN JSON following the structure for biology or radiology as appropriate.
Include "detectedType" field indicating which type was detected.`
}

function structureBiologyData(data: any): BiologyDocument {
  // Validate and structure biology data
  return {
    type: 'biology',
    testName: data.data?.testName || 'Unknown Test',
    testCategory: data.data?.testCategory || 'other',
    laboratory: data.data?.laboratory || { name: 'Unknown' },
    sampleInfo: data.data?.sampleInfo || { 
      type: 'unknown', 
      collectionDate: new Date().toISOString().split('T')[0] 
    },
    reportDate: data.data?.reportDate || new Date().toISOString().split('T')[0],
    results: data.data?.results || [],
    comments: data.data?.comments,
    requestingPhysician: data.data?.requestingPhysician
  }
}

function structureRadiologyData(data: any): RadiologyDocument {
  // Validate and structure radiology data
  return {
    type: 'radiology',
    examType: data.data?.examType || 'Unknown Exam',
    examCategory: data.data?.examCategory || 'other',
    technique: data.data?.technique || 'Not specified',
    region: data.data?.region || 'Not specified',
    indication: data.data?.indication || '',
    date: data.data?.date || new Date().toISOString().split('T')[0],
    time: data.data?.time,
    facility: data.data?.facility || { name: 'Unknown' },
    clinicalHistory: data.data?.clinicalHistory,
    comparison: data.data?.comparison,
    findings: data.data?.findings || [],
    impression: data.data?.impression || '',
    conclusion: data.data?.conclusion || '',
    recommendations: data.data?.recommendations,
    radiologist: data.data?.radiologist || { name: 'Unknown' },
    urgentFindings: data.data?.urgentFindings || false
  }
}
```

---

## 4. Page Workflow Principal

```typescript
// app/medical-documents/page.tsx

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  FileSearch,
  Brain,
  FileCheck,
  ArrowLeft
} from "lucide-react"

import DocumentUpload from "@/components/medical-documents/document-upload"
import ExtractedDataReview from "@/components/medical-documents/extracted-data-review"
import DocumentAnalysisReport from "@/components/medical-documents/document-analysis-report"
import DocumentIntegration from "@/components/medical-documents/document-integration"

export default function MedicalDocumentsWorkflow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<any>(null)
  const [documentData, setDocumentData] = useState<any>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)

  // Load patient data from sessionStorage
  useEffect(() => {
    const savedPatientData = sessionStorage.getItem('medicalDocumentPatientData')
    const isDocumentWorkflow = sessionStorage.getItem('isMedicalDocumentWorkflow')
    
    if (!savedPatientData || isDocumentWorkflow !== 'true') {
      console.log('❌ No patient data found, redirecting to home')
      router.push('/')
      return
    }
    
    try {
      const data = JSON.parse(savedPatientData)
      setPatientData(data)
      console.log('✅ Patient data loaded:', data)
    } catch (error) {
      console.error('Error parsing patient data:', error)
      router.push('/')
    }
  }, [router])

  const handleBackToHome = () => {
    sessionStorage.removeItem('medicalDocumentPatientData')
    sessionStorage.removeItem('isMedicalDocumentWorkflow')
    router.push('/')
  }

  const handleStepClick = (index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index)
    }
  }

  const steps = [
    {
      icon: FileText,
      title: "Upload Document",
      description: "Upload laboratory or radiology report",
      status: currentStep === 0 ? "current" : currentStep > 0 ? "complete" : "upcoming"
    },
    {
      icon: FileSearch,
      title: "Extract & Review",
      description: "AI extraction and validation",
      status: currentStep === 1 ? "current" : currentStep > 1 ? "complete" : "upcoming"
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Intelligent clinical analysis",
      status: currentStep === 2 ? "current" : currentStep > 2 ? "complete" : "upcoming"
    },
    {
      icon: FileCheck,
      title: "Integration",
      description: "Add to patient record",
      status: currentStep === 3 ? "current" : currentStep > 3 ? "complete" : "upcoming"
    }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  if (!patientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="glass-card w-full max-w-md shadow-2xl border-0">
          <CardContent className="p-6">
            <p className="text-center">Loading medical documents workflow...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="gradient-accent text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/tibok-logo.svg" 
                alt="TIBOK Logo" 
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Medical Documents Analysis
                </h1>
                <p className="text-cyan-100 text-sm">AI-Powered Document Processing & Analysis</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleBackToHome}
              className="flex items-center gap-2 bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Patient Info Banner */}
        <Card className="glass-card mb-6 shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Patient</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {patientData.firstName} {patientData.lastName}
                </p>
              </div>
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-md">
                Medical Document Analysis
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="glass-card mb-6 shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Progress
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Document analysis workflow</p>
              </div>
              <Badge className="gradient-accent text-white border-0 px-4 py-2 shadow-md">
                Step {currentStep + 1}/{steps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Progress value={progress} className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div
                    key={index}
                    onClick={() => handleStepClick(index)}
                    className={`p-5 rounded-xl smooth-transition cursor-pointer transform
                      ${step.status === "current" 
                        ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xl scale-105 step-active" 
                        : step.status === "complete" 
                        ? "bg-gradient-to-br from-green-500 to-blue-500 text-white shadow-lg hover:scale-105 hover:shadow-xl" 
                        : "bg-white/50 backdrop-blur-sm border-2 border-gray-200 opacity-70 cursor-not-allowed"}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                        ${step.status === "current" || step.status === "complete"
                          ? "bg-white/20 backdrop-blur-sm"
                          : "bg-gray-200"
                        }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-sm flex-1">{step.title}</h3>
                    </div>
                    <p className={`text-xs ${
                      step.status === "current" || step.status === "complete"
                        ? "text-white/80"
                        : "text-gray-600"
                    }`}>{step.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="space-y-6">
          {currentStep === 0 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Upload Medical Document
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DocumentUpload
                  patientData={patientData}
                  onNext={(data) => {
                    console.log('✅ Document uploaded:', data)
                    setDocumentData(data)
                    setCurrentStep(1)
                  }}
                  onBack={handleBackToHome}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-6 w-6" />
                  Review Extracted Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ExtractedDataReview
                  patientData={patientData}
                  documentData={documentData}
                  onNext={(data) => {
                    console.log('✅ Data validated:', data)
                    setExtractedData(data)
                    setCurrentStep(2)
                  }}
                  onBack={() => setCurrentStep(0)}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-6 w-6" />
                  AI Clinical Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DocumentAnalysisReport
                  patientData={patientData}
                  documentData={documentData}
                  extractedData={extractedData}
                  onNext={(data) => {
                    console.log('✅ Analysis completed:', data)
                    setAnalysisData(data)
                    setCurrentStep(3)
                  }}
                  onBack={() => setCurrentStep(1)}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="shadow-xl border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-6 w-6" />
                  Document Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DocumentIntegration
                  patientData={patientData}
                  documentData={documentData}
                  extractedData={extractedData}
                  analysisData={analysisData}
                  onComplete={handleBackToHome}
                />
                <div className="mt-4 flex justify-start">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(2)}
                  >
                    Back to Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
```

Ce document fournit des exemples de code complets et détaillés pour implémenter le module. Voulez-vous que je continue avec d'autres composants ou que je crée un guide d'intégration avec les workflows existants ?
