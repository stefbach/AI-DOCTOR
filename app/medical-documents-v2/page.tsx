'use client';

// ============================================================================
// Medical Documents Analysis V2 - Simplified Workflow
// ============================================================================
// Purpose: Upload multiple documents, auto-detect type, analyze with AI
// No manual type selection required!
// ============================================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileSearch,
  Home,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Microscope,
  Scan,
  Download,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import MultiDocumentUpload from '@/components/medical-documents/MultiDocumentUpload';

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

export default function MedicalDocumentsV2Page() {
  const [analyzedDocuments, setAnalyzedDocuments] = useState<UploadedDocument[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ============================================================================
  // HANDLE ANALYSIS COMPLETE
  // ============================================================================

  const handleAnalysisComplete = (results: UploadedDocument[]) => {
    console.log('Analysis complete:', results);
    setAnalyzedDocuments(results);
    setShowResults(true);
  };

  // ============================================================================
  // RESET
  // ============================================================================

  const handleReset = () => {
    setAnalyzedDocuments([]);
    setShowResults(false);
  };

  // ============================================================================
  // RENDER RESULTS
  // ============================================================================

  const renderResults = () => {
    const completedDocs = analyzedDocuments.filter((d) => d.status === 'completed');
    const errorDocs = analyzedDocuments.filter((d) => d.status === 'error');

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Analysis Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-green-600">{completedDocs.length}</p>
                <p className="text-sm text-gray-600">Analyzed Successfully</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">
                  {completedDocs.filter((d) => d.detectedType === 'biology').length}
                </p>
                <p className="text-sm text-gray-600">Biology Tests</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">
                  {completedDocs.filter((d) => d.detectedType === 'radiology').length}
                </p>
                <p className="text-sm text-gray-600">Radiology Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Documents */}
        {errorDocs.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {errorDocs.length} document(s) could not be analyzed. Please check the files and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Individual Results */}
        {completedDocs.map((doc, index) => (
          <Card key={doc.id} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {doc.detectedType === 'biology' ? (
                    <Microscope className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Scan className="w-6 h-6 text-purple-600" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{doc.file.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {doc.detectedType === 'biology' ? 'Biology Test' : 'Radiology Report'} •{' '}
                      {doc.subType}
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
                  {doc.confidence && `${Math.round(doc.confidence * 100)}% confidence`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clinical Significance */}
              {doc.clinicalInterpretation?.clinicalSignificance && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Clinical Significance
                  </h4>
                  <Alert
                    className={
                      doc.clinicalInterpretation.clinicalSignificance.requiresUrgentAction
                        ? 'bg-red-50 border-red-300'
                        : 'bg-blue-50 border-blue-300'
                    }
                  >
                    <AlertDescription>
                      <p className="font-medium mb-2">
                        Severity:{' '}
                        <Badge
                          className={getSeverityBadgeClass(
                            doc.clinicalInterpretation.clinicalSignificance.severity
                          )}
                        >
                          {doc.clinicalInterpretation.clinicalSignificance.severity.toUpperCase()}
                        </Badge>
                      </p>
                      <p className="text-sm">
                        {doc.clinicalInterpretation.clinicalSignificance.overallAssessment ||
                          'Assessment completed'}
                      </p>
                      {doc.clinicalInterpretation.clinicalSignificance.keyFindings && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {doc.clinicalInterpretation.clinicalSignificance.keyFindings.map(
                            (finding: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>{finding}</span>
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                  {doc.clinicalInterpretation.clinicalSignificance.requiresUrgentAction && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="font-semibold">
                        ⚠️ WARNING: This analysis requires urgent medical action
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Extracted Data Preview */}
              {doc.extractedData && (
                <div>
                  <h4 className="font-semibold mb-2">Extracted Data</h4>
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    {doc.detectedType === 'biology' && doc.extractedData.results && (
                      <div>
                        <p className="font-medium mb-2">Test Results:</p>
                        <ul className="space-y-1">
                          {doc.extractedData.results.slice(0, 5).map((result: any, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-gray-600">{result.testName}:</span>
                              <span className="font-medium">
                                {result.value} {result.unit}
                              </span>
                              <Badge
                                variant="outline"
                                className={getResultStatusClass(result.status)}
                              >
                                {result.status}
                              </Badge>
                            </li>
                          ))}
                          {doc.extractedData.results.length > 5 && (
                            <li className="text-gray-500 italic">
                              ...and {doc.extractedData.results.length - 5} more results
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {doc.detectedType === 'radiology' && doc.extractedData.findings && (
                      <div>
                        <p className="font-medium mb-1">Findings:</p>
                        <p className="text-gray-700">{doc.extractedData.findings}</p>
                        {doc.extractedData.impression && (
                          <>
                            <p className="font-medium mt-2 mb-1">Impression:</p>
                            <p className="text-gray-700">{doc.extractedData.impression}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {doc.clinicalInterpretation?.recommendations &&
                doc.clinicalInterpretation.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm">
                      {doc.clinicalInterpretation.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Critical Alerts */}
              {doc.clinicalInterpretation?.criticalAlerts &&
                doc.clinicalInterpretation.criticalAlerts.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <p className="font-semibold mb-1">Critical Alerts:</p>
                      <ul className="space-y-1 text-sm">
                        {doc.clinicalInterpretation.criticalAlerts.map((alert: string, i: number) => (
                          <li key={i}>• {alert}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
            </CardContent>
          </Card>
        ))}

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleReset} variant="outline" size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Analyze More Documents
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="lg">
            <Download className="w-4 h-4 mr-2" />
            Print / Save Results
          </Button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getSeverityBadgeClass = (severity: string): string => {
    const classes: Record<string, string> = {
      normal: 'bg-green-100 text-green-800',
      mild: 'bg-blue-100 text-blue-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      severe: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return classes[severity] || 'bg-gray-100 text-gray-800';
  };

  const getResultStatusClass = (status: string): string => {
    const classes: Record<string, string> = {
      normal: 'bg-green-100 text-green-800 border-green-300',
      abnormal: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
    };
    return classes[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="gradient-primary text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/tibok-logo.svg" alt="TIBOK Logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <FileSearch className="w-6 h-6" />
                  Medical Documents Analysis
                </h1>
                <p className="text-blue-100 text-sm">
                  Automatic detection • Biology & Radiology • AI-powered
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
              onClick={() => (window.location.href = '/')}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {!showResults ? (
          <>
            {/* Info Card */}
            <Card className="mb-6 bg-white/80 backdrop-blur-sm">
              <CardContent className="py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileSearch className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-1">No Type Selection</h3>
                    <p className="text-sm text-gray-600">
                      AI automatically detects if it's a biology test or radiology report
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Microscope className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-1">Multiple Documents</h3>
                    <p className="text-sm text-gray-600">
                      Upload up to 10 documents at once - mix biology and radiology
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-1">Complete Analysis</h3>
                    <p className="text-sm text-gray-600">
                      OCR extraction + clinical interpretation for each document
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Component */}
            <MultiDocumentUpload onAnalysisComplete={handleAnalysisComplete} />
          </>
        ) : (
          renderResults()
        )}
      </div>
    </div>
  );
}
