'use client';

// ============================================================================
// Medical Documents Analysis - Main Page
// ============================================================================
// Purpose: Complete workflow for uploading and analyzing medical documents
// Steps: Type Selection → Upload → Extract → Analyze → Results
// Similar to: Dermatology module workflow
// ============================================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Download,
  Home,
  AlertTriangle,
} from 'lucide-react';
import DocumentTypeSelector from '@/components/medical-documents/DocumentTypeSelector';
import DocumentUpload from '@/components/medical-documents/DocumentUpload';
import AnalysisProgress, { AnalysisStep } from '@/components/medical-documents/AnalysisProgress';
import {
  DocumentType,
  BiologyType,
  RadiologyType,
  MedicalDocument,
  AnalyzeResponse,
  ClinicalSignificance,
  isBiologyDocument,
  isRadiologyDocument,
} from '@/lib/medical-documents/types';
import {
  formatDateFrench,
  getBiologyTypeLabel,
  getRadiologyTypeLabel,
  getResultStatusBadgeClasses,
  getStatusLabel,
} from '@/lib/medical-documents/utils';

// ============================================================================
// WORKFLOW STEPS
// ============================================================================

type WorkflowStep = 'select-type' | 'upload' | 'analyze' | 'results';

const WORKFLOW_STEPS = [
  { id: 'select-type', title: 'Document Type', icon: FileText },
  { id: 'upload', title: 'Upload', icon: FileText },
  { id: 'analyze', title: 'AI Analysis', icon: FileText },
  { id: 'results', title: 'Results', icon: CheckCircle },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MedicalDocumentsPage() {
  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('select-type');
  
  // Document type state
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [subType, setSubType] = useState<BiologyType | RadiologyType | null>(null);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  
  // Analysis state
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('extracting');
  const [analyzedDocument, setAnalyzedDocument] = useState<MedicalDocument | null>(null);
  const [clinicalSignificance, setClinicalSignificance] = useState<ClinicalSignificance | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // WORKFLOW NAVIGATION
  // ============================================================================

  const goToNextStep = () => {
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < WORKFLOW_STEPS.length - 1) {
      const nextStep = WORKFLOW_STEPS[currentIndex + 1].id as WorkflowStep;
      setCurrentStep(nextStep);
      
      // Trigger analysis when moving to analyze step
      if (nextStep === 'analyze') {
        handleAnalyzeDocument();
      }
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(WORKFLOW_STEPS[currentIndex - 1].id as WorkflowStep);
    }
  };

  const canProceed = (): boolean => {
    if (currentStep === 'select-type') return documentType !== null && subType !== null;
    if (currentStep === 'upload') return uploadedFile !== null && fileBase64 !== null;
    if (currentStep === 'analyze') return false; // Can't manually proceed during analysis
    return true;
  };

  // ============================================================================
  // ANALYSIS LOGIC
  // ============================================================================

  const handleAnalyzeDocument = async () => {
    if (!fileBase64 || !documentType || !subType) {
      setError('Données manquantes pour l\'analyse');
      return;
    }

    try {
      setError(null);
      
      // Step 1: Extract
      setAnalysisStep('extracting');
      const extractResponse = await fetch('/api/medical-documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: fileBase64,
          documentType,
          subType,
        }),
      });

      const extractData = await extractResponse.json();
      
      if (!extractData.success) {
        throw new Error(extractData.error || 'Erreur lors de l\'extraction');
      }

      // Step 2: Analyze
      setAnalysisStep('analyzing');
      const analyzeResponse = await fetch('/api/medical-documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: extractData.data.extractedData.id,
          documentType,
          extractedText: extractData.data.rawText,
          subType,
        }),
      });

      const analyzeData: AnalyzeResponse = await analyzeResponse.json();
      
      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'Erreur lors de l\'analyse');
      }

      // Step 3: Complete
      setAnalysisStep('completed');
      setAnalyzedDocument(analyzeData.data!.document);
      setClinicalSignificance(analyzeData.data!.clinicalSignificance);
      setRecommendations(analyzeData.data!.recommendations);

      // Auto-advance to results
      setTimeout(() => {
        setCurrentStep('results');
      }, 1000);

    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisStep('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  // ============================================================================
  // RESET WORKFLOW
  // ============================================================================

  const handleReset = () => {
    setCurrentStep('select-type');
    setDocumentType(null);
    setSubType(null);
    setUploadedFile(null);
    setFileBase64(null);
    setAnalysisStep('extracting');
    setAnalyzedDocument(null);
    setClinicalSignificance(null);
    setRecommendations([]);
    setError(null);
  };

  // ============================================================================
  // RENDER: STEP CONTENT
  // ============================================================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-type':
        return (
          <DocumentTypeSelector
            selectedType={documentType}
            selectedSubType={subType}
            onTypeChange={(type) => {
              setDocumentType(type);
              setSubType(null); // Reset subtype when main type changes
            }}
            onSubTypeChange={setSubType}
          />
        );

      case 'upload':
        return (
          <DocumentUpload
            uploadedFile={uploadedFile}
            onFileUpload={(file, base64) => {
              setUploadedFile(file);
              setFileBase64(base64);
            }}
            onFileRemove={() => {
              setUploadedFile(null);
              setFileBase64(null);
            }}
          />
        );

      case 'analyze':
        return <AnalysisProgress currentStep={analysisStep} error={error} />;

      case 'results':
        return renderResults();

      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER: RESULTS
  // ============================================================================

  const renderResults = () => {
    if (!analyzedDocument || !clinicalSignificance) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>No results available</AlertDescription>
        </Alert>
      );
    }

    const severityColors: Record<string, string> = {
      normal: 'green',
      mild: 'blue',
      moderate: 'yellow',
      severe: 'orange',
      critical: 'red',
    };

    const severityColor = severityColors[clinicalSignificance.severity] || 'gray';

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className={`border-2 border-${severityColor}-200 bg-${severityColor}-50`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className={`w-6 h-6 text-${severityColor}-600`} />
              <span>Analysis Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Document Type</p>
              <p className="font-semibold">
                {documentType === 'biology' 
                  ? getBiologyTypeLabel(analyzedDocument.type === 'biology' ? analyzedDocument.biologyType : 'other_biology')
                  : getRadiologyTypeLabel(analyzedDocument.type === 'radiology' ? analyzedDocument.radiologyType : 'other_radiology')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Severity</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${severityColor}-100 text-${severityColor}-800`}>
                {clinicalSignificance.severity.toUpperCase()}
              </span>
            </div>
            {clinicalSignificance.requiresUrgentAction && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="font-semibold">
                  ⚠️ WARNING: This analysis requires urgent medical action
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Clinical Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Clinical Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">
              {clinicalSignificance.summary}
            </p>
          </CardContent>
        </Card>

        {/* Key Findings */}
        {clinicalSignificance.keyFindings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {clinicalSignificance.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-800">{finding}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Abnormal Results (Biology only) */}
        {isBiologyDocument(analyzedDocument) && clinicalSignificance.abnormalResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results anormaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clinicalSignificance.abnormalResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{result.testName}</p>
                      <p className="text-sm text-gray-600">
                        Value: {result.value} {result.unit}
                        {result.referenceRange && ` (Reference: ${result.referenceRange})`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getResultStatusBadgeClasses(result.status)}`}>
                      {getStatusLabel(result.status as any)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span className="text-gray-800">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Critical Alerts */}
        {clinicalSignificance.criticalAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Critical Alerts:</p>
              <ul className="space-y-1">
                {clinicalSignificance.criticalAlerts.map((alert, index) => (
                  <li key={index}>• {alert}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER: MAIN UI
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Medical Documents Analysis
          </h1>
          <p className="text-gray-600">
            Upload and analyze your biology and radiology documents
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = WORKFLOW_STEPS.findIndex(s => s.id === currentStep) > index;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive ? 'border-blue-500 bg-blue-500 text-white' :
                      isCompleted ? 'border-green-500 bg-green-500 text-white' :
                      'border-gray-300 bg-white text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
                    </div>
                    <p className={`mt-2 text-sm font-medium ${
                      isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <Card className="mb-6">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 'results' ? handleReset : goToPreviousStep}
            disabled={currentStep === 'select-type' || currentStep === 'analyze'}
          >
            {currentStep === 'results' ? (
              <>
                <Home className="w-4 h-4 mr-2" />
                New Analysis
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </>
            )}
          </Button>

          {currentStep !== 'results' && currentStep !== 'analyze' && (
            <Button
              onClick={goToNextStep}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
