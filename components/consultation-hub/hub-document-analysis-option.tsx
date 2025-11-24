'use client';

// ============================================================================
// Hub Document Analysis Option Component
// ============================================================================
// Purpose: Optional document analysis within consultation hub workflow
// Shows AFTER patient selection, BEFORE consultation type choice
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileSearch,
  Upload,
  ArrowRight,
  CheckCircle,
  Microscope,
  Scan,
  Info,
  X,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import MultiDocumentUpload from '@/components/medical-documents/MultiDocumentUpload';
import { supabase } from '@/lib/supabase';

interface Patient {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
}

interface UploadedDocument {
  id: string;
  file: File;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  detectedType?: 'biology' | 'radiology' | 'unknown';
  subType?: string;
  confidence?: number;
  extractedData?: any;
  clinicalInterpretation?: any;
  error?: string;
}

interface HubDocumentAnalysisOptionProps {
  patient: Patient;
  onComplete: (hasDocuments: boolean) => void;
  onSkip: () => void;
}

export function HubDocumentAnalysisOption({
  patient,
  onComplete,
  onSkip,
}: HubDocumentAnalysisOptionProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [analyzedDocuments, setAnalyzedDocuments] = useState<UploadedDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ============================================================================
  // HANDLE ANALYSIS COMPLETE
  // ============================================================================

  const handleAnalysisComplete = (results: UploadedDocument[]) => {
    console.log('Analysis complete:', results);
    setAnalyzedDocuments(results);
  };

  // ============================================================================
  // SAVE TO PATIENT RECORD
  // ============================================================================

  const handleSaveToPatientRecord = async () => {
    if (analyzedDocuments.length === 0) return;

    setIsSaving(true);
    try {
      // Prepare documents data
      const documentsToSave = analyzedDocuments
        .filter((doc) => doc.status === 'completed')
        .map((doc) => ({
          document_type: doc.detectedType,
          sub_type: doc.subType,
          confidence: doc.confidence,
          extracted_data: doc.extractedData,
          clinical_interpretation: doc.clinicalInterpretation,
          file_name: doc.file.name,
          file_size: doc.file.size,
          upload_date: new Date().toISOString(),
        }));

      // Create consultation entry with medical documents
      const consultationData = {
        patient_data: {
          id: patient.id,
          fullName: patient.fullName,
          firstName: patient.firstName,
          lastName: patient.lastName,
          age: patient.age,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
        },
        consultation_type: 'medical_documents',
        medical_documents: documentsToSave,
        created_at: new Date().toISOString(),
        status: 'completed',
      };

      const { data, error } = await supabase
        .from('consultations')
        .insert([consultationData])
        .select();

      if (error) throw error;

      console.log('✅ Documents saved to patient record:', data);
      setSaveSuccess(true);

      // Wait a bit then proceed
      setTimeout(() => {
        onComplete(true);
      }, 1500);
    } catch (error) {
      console.error('❌ Error saving documents:', error);
      alert('Error saving documents to patient record');
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER: INITIAL CHOICE
  // ============================================================================

  if (!showUpload && analyzedDocuments.length === 0) {
    return (
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-blue-600" />
            Medical Documents Analysis (Optional)
          </CardTitle>
          <CardDescription>
            Do you want to upload and analyze medical documents for this patient before proceeding?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient Info */}
          <Alert className="bg-blue-50 border-blue-300">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              <strong>Patient:</strong> {patient.fullName}
              {patient.age && ` • ${patient.age} years`}
              {patient.gender && ` • ${patient.gender}`}
            </AlertDescription>
          </Alert>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Microscope className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Biology Tests</p>
                <p className="text-xs text-gray-600">
                  Blood tests, lab results, biochemistry
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Scan className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Radiology Reports</p>
                <p className="text-xs text-gray-600">
                  X-rays, CT scans, MRI, ultrasounds
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={onSkip}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Skip Documents</span>
              <span className="text-xs text-gray-500">
                Proceed without analyzing documents
              </span>
            </Button>

            <Button
              onClick={() => setShowUpload(true)}
              className="h-auto py-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Documents</span>
              <span className="text-xs text-blue-100">
                Analyze biology & radiology documents
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: UPLOAD & ANALYSIS
  // ============================================================================

  if (showUpload && analyzedDocuments.length === 0) {
    return (
      <div className="space-y-4">
        {/* Patient Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSearch className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Analyzing documents for: {patient.fullName}
                  </p>
                  <p className="text-sm text-blue-700">
                    Upload multiple files • Auto-detect type • AI analysis
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Component */}
        <MultiDocumentUpload onAnalysisComplete={handleAnalysisComplete} />
      </div>
    );
  }

  // ============================================================================
  // RENDER: RESULTS & SAVE
  // ============================================================================

  if (analyzedDocuments.length > 0) {
    const completedDocs = analyzedDocuments.filter((d) => d.status === 'completed');
    const biologyDocs = completedDocs.filter((d) => d.detectedType === 'biology');
    const radiologyDocs = completedDocs.filter((d) => d.detectedType === 'radiology');

    return (
      <div className="space-y-4">
        {/* Success Summary */}
        <Card className={saveSuccess ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {saveSuccess ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {saveSuccess
                      ? '✓ Documents saved to patient record!'
                      : `Analysis complete for ${patient.fullName}`}
                  </p>
                  <p className="text-sm text-gray-700">
                    {completedDocs.length} document(s) analyzed •{' '}
                    {biologyDocs.length} biology • {radiologyDocs.length} radiology
                  </p>
                </div>
              </div>
              {!saveSuccess && (
                <Button
                  onClick={handleSaveToPatientRecord}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Patient Record
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analyzed Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedDocs.map((doc, index) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {doc.detectedType === 'biology' ? (
                    <Microscope className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Scan className="w-5 h-5 text-purple-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{doc.file.name}</p>
                    <p className="text-xs text-gray-600">
                      {doc.subType} • {Math.round((doc.confidence || 0) * 100)}% confidence
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    doc.detectedType === 'biology'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-purple-100 text-purple-800 border-purple-300'
                  }
                >
                  {doc.detectedType === 'biology' ? 'Biology' : 'Radiology'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Proceed Button */}
        {saveSuccess && (
          <Button
            onClick={() => onComplete(true)}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Proceed to Consultation Type Selection
          </Button>
        )}
      </div>
    );
  }

  return null;
}
