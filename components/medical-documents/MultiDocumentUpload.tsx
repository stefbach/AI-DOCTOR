'use client';

// ============================================================================
// Multi-Document Upload Component
// ============================================================================
// Purpose: Upload multiple medical documents (biology and/or radiology)
// Features: Drag & drop, multiple files, automatic type detection
// ============================================================================

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileSearch,
  Microscope,
  Scan,
} from 'lucide-react';

interface UploadedDocument {
  id: string;
  file: File;
  base64: string;
  preview: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  detectedType?: 'biology' | 'radiology' | 'unknown';
  subType?: string;
  confidence?: number;
  extractedData?: any;
  clinicalInterpretation?: any;
  error?: string;
}

interface MultiDocumentUploadProps {
  onAnalysisComplete?: (results: UploadedDocument[]) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

export default function MultiDocumentUpload({ onAnalysisComplete }: MultiDocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not supported: ${file.name}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${file.name} (max 10MB)`;
    }
    return null;
  };

  // ============================================================================
  // FILE CONVERSION
  // ============================================================================

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ============================================================================
  // FILE UPLOAD HANDLER
  // ============================================================================

  const handleFilesAdded = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Validate total count
      if (documents.length + fileArray.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} documents allowed`);
        return;
      }

      // Validate and process each file
      const newDocuments: UploadedDocument[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        try {
          const base64 = await fileToBase64(file);
          newDocuments.push({
            id: `${Date.now()}_${Math.random()}`,
            file,
            base64,
            preview: base64,
            status: 'pending',
          });
        } catch (err) {
          console.error('Error converting file:', err);
          setError(`Failed to process file: ${file.name}`);
        }
      }

      setDocuments((prev) => [...prev, ...newDocuments]);
      setError(null);
    },
    [documents.length]
  );

  // ============================================================================
  // DRAG & DROP HANDLERS
  // ============================================================================

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesAdded(files);
    }
  };

  // ============================================================================
  // FILE INPUT HANDLER
  // ============================================================================

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesAdded(files);
    }
    // Reset input
    e.target.value = '';
  };

  // ============================================================================
  // REMOVE FILE
  // ============================================================================

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  // ============================================================================
  // ANALYZE ALL DOCUMENTS
  // ============================================================================

  const handleAnalyzeAll = async () => {
    if (documents.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setError(null);

    try {
      // Prepare images
      const images = documents.map((doc) => doc.base64);

      // Call API
      const response = await fetch('/api/medical-documents/detect-and-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Update documents with results
      const updatedDocuments = documents.map((doc, index) => {
        const result = data.data.results[index];
        return {
          ...doc,
          status: result.error ? 'error' : 'completed',
          detectedType: result.detectedType,
          subType: result.subType,
          confidence: result.confidence,
          extractedData: result.extractedData,
          clinicalInterpretation: result.clinicalInterpretation,
          error: result.error,
        } as UploadedDocument;
      });

      setDocuments(updatedDocuments);
      setAnalysisProgress(100);

      if (onAnalysisComplete) {
        onAnalysisComplete(updatedDocuments);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ============================================================================
  // RENDER DOCUMENT TYPE ICON
  // ============================================================================

  const renderTypeIcon = (doc: UploadedDocument) => {
    if (doc.status !== 'completed') return <FileText className="w-5 h-5 text-gray-400" />;

    if (doc.detectedType === 'biology') {
      return <Microscope className="w-5 h-5 text-blue-600" />;
    } else if (doc.detectedType === 'radiology') {
      return <Scan className="w-5 h-5 text-purple-600" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="py-12 text-center">
          <Upload className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h3 className="text-xl font-semibold mb-2">
            Upload Medical Documents
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop your biology and/or radiology documents here
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Supports: JPG, PNG, PDF • Max 10 files • Max 10MB each
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={() => document.getElementById('file-input')?.click()}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileSearch className="w-5 h-5 mr-2" />
              Choose Files
            </Button>
            <p className="text-xs text-gray-500">
              {documents.length}/{MAX_FILES} documents uploaded
            </p>
          </div>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Uploaded Documents ({documents.length})</span>
              {!isAnalyzing && documents.some((d) => d.status === 'pending') && (
                <Button onClick={handleAnalyzeAll} className="bg-green-600 hover:bg-green-700">
                  <FileSearch className="w-4 h-4 mr-2" />
                  Analyze All Documents
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAnalyzing && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Analyzing documents...</span>
                  <span className="text-sm font-semibold">{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="h-2" />
              </div>
            )}

            {documents.map((doc) => (
              <Card key={doc.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Preview */}
                    <div className="w-16 h-16 rounded border flex-shrink-0 overflow-hidden bg-gray-100">
                      {doc.file.type.startsWith('image/') ? (
                        <img
                          src={doc.preview}
                          alt={doc.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-full h-full p-3 text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {renderTypeIcon(doc)}
                          <h4 className="font-medium truncate">{doc.file.name}</h4>
                        </div>
                        {doc.status !== 'analyzing' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(doc.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 text-sm">
                        {doc.status === 'pending' && (
                          <span className="text-gray-600">Ready to analyze</span>
                        )}
                        {doc.status === 'analyzing' && (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-blue-600">Analyzing...</span>
                          </>
                        )}
                        {doc.status === 'completed' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-medium">
                              {doc.detectedType === 'biology'
                                ? `Biology Test: ${doc.subType}`
                                : doc.detectedType === 'radiology'
                                ? `Radiology: ${doc.subType}`
                                : 'Unknown document type'}
                            </span>
                            {doc.confidence && (
                              <span className="text-gray-500 ml-2">
                                ({Math.round(doc.confidence * 100)}% confidence)
                              </span>
                            )}
                          </>
                        )}
                        {doc.status === 'error' && (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-600">{doc.error || 'Analysis failed'}</span>
                          </>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        {(doc.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
