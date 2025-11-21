'use client';

// ============================================================================
// DocumentUpload Component
// ============================================================================
// Purpose: File upload interface with drag & drop support for medical documents
// Features: Drag & drop, file validation, preview, progress tracking
// Used in: Medical documents workflow
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileImage, Check, AlertCircle } from 'lucide-react';
import { fileToBase64, isValidImageFile, isValidFileSize, formatFileSize } from '@/lib/medical-documents/utils';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface DocumentUploadProps {
  onFileUpload: (file: File, base64Data: string) => void;
  onFileRemove: () => void;
  uploadedFile: File | null;
  disabled?: boolean;
  isProcessing?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DocumentUpload({
  onFileUpload,
  onFileRemove,
  uploadedFile,
  disabled = false,
  isProcessing = false,
}: DocumentUploadProps) {
  // State
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!isValidImageFile(file)) {
      return 'Invalid file type. Only images are accepted (JPEG, PNG, GIF, WebP).';
    }

    // Check file size (max 10MB)
    if (!isValidFileSize(file, 10)) {
      return 'File is too large. Maximum size is 10 MB.';
    }

    return null;
  };

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFile = useCallback(async (file: File) => {
    // Reset error
    setError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // Convert to base64
      const base64Data = await fileToBase64(file);
      setPreview(base64Data);
      
      // Call parent callback
      onFileUpload(file, base64Data);
    } catch (err) {
      setError('Error loading file. Please try again.');
      console.error('File upload error:', err);
    }
  }, [onFileUpload]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
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

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemoveFile = () => {
    setPreview(null);
    setError(null);
    onFileRemove();
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show preview if file is uploaded
  if (uploadedFile && preview) {
    return (
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-6 space-y-4">
          {/* File Info Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{uploadedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            {!disabled && !isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Image Preview */}
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            <img
              src={preview}
              alt="Document preview"
              className="w-full h-auto max-h-96 object-contain bg-white"
            />
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Processing...</span>
                <span className="font-medium text-blue-600">AI Analysis</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          {/* Success Message */}
          {!isProcessing && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Document loaded successfully. Click &quot;Suivant&quot; to continue.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show upload interface
  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!disabled ? handleBrowseClick : undefined}
      >
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {/* Icon */}
            <div
              className={`p-4 rounded-full ${
                isDragging ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <Upload
                className={`w-8 h-8 ${
                  isDragging ? 'text-blue-600' : 'text-gray-600'
                }`}
              />
            </div>

            {/* Text */}
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">
                {isDragging
                  ? 'Drop file here'
                  : 'Drag and drop your document'}
              </p>
              <p className="text-sm text-gray-600">
                ou{' '}
                <span className="text-blue-600 font-medium hover:underline">
                  browse your files
                </span>
              </p>
            </div>

            {/* File Requirements */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>Accepted formats: JPEG, PNG, GIF, WebP</p>
              <p>Maximum size: 10 Mo</p>
            </div>

            {/* Browse Button */}
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              disabled={disabled}
            >
              <FileImage className="w-4 h-4 mr-2" />
              Select a file
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Helper Text */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium mb-2">📋 Tips for better analysis</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Ensure the document is well-lit and readable</li>
          <li>Avoid reflections and blurry areas</li>
          <li>Photograph the document flat, without folds</li>
          <li>Make sure all text is visible</li>
        </ul>
      </div>
    </div>
  );
}
