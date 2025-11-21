'use client';

// ============================================================================
// Medical Documents Analysis with Patient Linking
// ============================================================================
// Purpose: Complete workflow with patient selection + document analysis
// Flow: Select Patient → Upload Documents → Auto-detect → Analyze → Save to Patient Record
// ============================================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileSearch,
  Home,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Search,
  UserPlus,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import MultiDocumentUpload from '@/components/medical-documents/MultiDocumentUpload';
import { supabase } from '@/lib/supabase';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth?: string;
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

type WorkflowStep = 'select-patient' | 'upload-documents' | 'view-results';

export default function MedicalDocumentsLinkedPage() {
  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('select-patient');
  
  // Patient state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // New patient form
  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
  });
  
  // Documents state
  const [analyzedDocuments, setAnalyzedDocuments] = useState<UploadedDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ============================================================================
  // PATIENT SEARCH
  // ============================================================================

  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Search in consultations table for patient data
      const { data, error } = await supabase
        .from('consultations')
        .select('patient_data')
        .ilike('patient_data->>fullName', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Extract unique patients
      const patients: Patient[] = [];
      const seenNames = new Set();

      data?.forEach((consultation: any) => {
        const patientData = consultation.patient_data;
        if (patientData && patientData.fullName) {
          const name = patientData.fullName.toLowerCase();
          if (!seenNames.has(name)) {
            seenNames.add(name);
            patients.push({
              id: patientData.id || `patient_${Date.now()}`,
              firstName: patientData.firstName || '',
              lastName: patientData.lastName || '',
              fullName: patientData.fullName,
              dateOfBirth: patientData.birthDate || patientData.dateOfBirth,
              age: patientData.age,
              gender: patientData.gender,
              phone: patientData.phone,
              email: patientData.email,
            });
          }
        }
      });

      setSearchResults(patients);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentStep('upload-documents');
  };

  const handleCreateNewPatient = () => {
    if (!newPatientData.firstName || !newPatientData.lastName) {
      alert('Please enter at least first name and last name');
      return;
    }

    const newPatient: Patient = {
      id: `new_patient_${Date.now()}`,
      firstName: newPatientData.firstName,
      lastName: newPatientData.lastName,
      fullName: `${newPatientData.firstName} ${newPatientData.lastName}`,
      dateOfBirth: newPatientData.dateOfBirth || undefined,
      gender: newPatientData.gender || undefined,
      phone: newPatientData.phone || undefined,
      email: newPatientData.email || undefined,
    };

    setSelectedPatient(newPatient);
    setCurrentStep('upload-documents');
  };

  // ============================================================================
  // DOCUMENT ANALYSIS
  // ============================================================================

  const handleAnalysisComplete = (results: UploadedDocument[]) => {
    console.log('Analysis complete:', results);
    setAnalyzedDocuments(results);
    setCurrentStep('view-results');
  };

  // ============================================================================
  // SAVE TO PATIENT RECORD
  // ============================================================================

  const handleSaveToPatientRecord = async () => {
    if (!selectedPatient || analyzedDocuments.length === 0) return;

    setIsSaving(true);
    try {
      // Prepare documents data
      const documentsToSave = analyzedDocuments
        .filter(doc => doc.status === 'completed')
        .map(doc => ({
          document_type: doc.detectedType,
          sub_type: doc.subType,
          confidence: doc.confidence,
          extracted_data: doc.extractedData,
          clinical_interpretation: doc.clinicalInterpretation,
          file_name: doc.file.name,
          file_size: doc.file.size,
          upload_date: new Date().toISOString(),
        }));

      // Create a consultation entry with medical documents
      const consultationData = {
        patient_data: {
          id: selectedPatient.id,
          fullName: selectedPatient.fullName,
          firstName: selectedPatient.firstName,
          lastName: selectedPatient.lastName,
          dateOfBirth: selectedPatient.dateOfBirth,
          age: selectedPatient.age,
          gender: selectedPatient.gender,
          phone: selectedPatient.phone,
          email: selectedPatient.email,
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

      // Show success message
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('❌ Error saving documents:', error);
      alert('Error saving documents to patient record');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER: PATIENT SELECTION
  // ============================================================================

  const renderPatientSelection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Select Patient
          </CardTitle>
          <CardDescription>
            Search for an existing patient or create a new patient record
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle between existing and new */}
          <div className="flex gap-4">
            <Button
              variant={!isNewPatient ? 'default' : 'outline'}
              onClick={() => setIsNewPatient(false)}
              className="flex-1"
            >
              <Search className="w-4 h-4 mr-2" />
              Existing Patient
            </Button>
            <Button
              variant={isNewPatient ? 'default' : 'outline'}
              onClick={() => setIsNewPatient(true)}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              New Patient
            </Button>
          </div>

          {!isNewPatient ? (
            // Search existing patient
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                />
                <Button onClick={handleSearchPatient} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{patient.fullName}</p>
                          <p className="text-sm text-gray-600">
                            {patient.age && `${patient.age} years`}
                            {patient.age && patient.gender && ' • '}
                            {patient.gender}
                            {patient.phone && ` • ${patient.phone}`}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Create new patient
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    value={newPatientData.firstName}
                    onChange={(e) =>
                      setNewPatientData({ ...newPatientData, firstName: e.target.value })
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    value={newPatientData.lastName}
                    onChange={(e) =>
                      setNewPatientData({ ...newPatientData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={newPatientData.dateOfBirth}
                    onChange={(e) =>
                      setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={newPatientData.gender}
                    onChange={(e) =>
                      setNewPatientData({ ...newPatientData, gender: e.target.value })
                    }
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newPatientData.phone}
                    onChange={(e) =>
                      setNewPatientData({ ...newPatientData, phone: e.target.value })
                    }
                    placeholder="+230 5123 4567"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newPatientData.email}
                    onChange={(e) =>
                      setNewPatientData({ ...newPatientData, email: e.target.value })
                    }
                    placeholder="john.doe@example.com"
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateNewPatient}
                className="w-full"
                size="lg"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Patient & Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // RENDER: DOCUMENT UPLOAD
  // ============================================================================

  const renderDocumentUpload = () => (
    <div className="space-y-6">
      {/* Patient Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">
                  {selectedPatient?.fullName}
                </p>
                <p className="text-sm text-blue-700">
                  {selectedPatient?.age && `${selectedPatient.age} years`}
                  {selectedPatient?.age && selectedPatient?.gender && ' • '}
                  {selectedPatient?.gender}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPatient(null);
                setCurrentStep('select-patient');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change Patient
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Component */}
      <MultiDocumentUpload onAnalysisComplete={handleAnalysisComplete} />
    </div>
  );

  // ============================================================================
  // RENDER: RESULTS
  // ============================================================================

  const renderResults = () => {
    const completedDocs = analyzedDocuments.filter((d) => d.status === 'completed');

    return (
      <div className="space-y-6">
        {/* Patient Info + Save Button */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">
                    Analysis Complete for {selectedPatient?.fullName}
                  </p>
                  <p className="text-sm text-green-700">
                    {completedDocs.length} document(s) analyzed successfully
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {saveSuccess && (
                  <Badge className="bg-green-600 text-white">
                    ✓ Saved!
                  </Badge>
                )}
                <Button
                  onClick={handleSaveToPatientRecord}
                  disabled={isSaving || saveSuccess}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display documents analysis results - reuse from V2 */}
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Results displayed here. The full results component from V2 would be integrated here.
            {completedDocs.length > 0 && ` ${completedDocs.length} documents ready to save.`}
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setAnalyzedDocuments([]);
              setCurrentStep('upload-documents');
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Analyze More Documents
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAnalyzedDocuments([]);
              setSelectedPatient(null);
              setCurrentStep('select-patient');
            }}
          >
            New Patient
          </Button>
        </div>
      </div>
    );
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
                  With patient record integration
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

      {/* Progress Steps */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          {['select-patient', 'upload-documents', 'view-results'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : index < ['select-patient', 'upload-documents', 'view-results'].indexOf(currentStep)
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div
                  className={`w-24 h-1 mx-2 ${
                    index < ['select-patient', 'upload-documents', 'view-results'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        {currentStep === 'select-patient' && renderPatientSelection()}
        {currentStep === 'upload-documents' && renderDocumentUpload()}
        {currentStep === 'view-results' && renderResults()}
      </div>
    </div>
  );
}
