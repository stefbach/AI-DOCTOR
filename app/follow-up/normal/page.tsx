'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  PatientSearch, 
  HistoryList, 
  ComparisonCard,
  ConsultationDetailModal,
  usePatientHistory,
  type ConsultationHistoryItem
} from '@/lib/follow-up/shared'
import { Stethoscope, ClipboardList, FileText, UserCheck, FileSignature } from 'lucide-react'
import { NormalClinicalForm } from '@/lib/follow-up/normal/components/normal-clinical-form'
import { NormalReportDisplay } from '@/lib/follow-up/normal/components/normal-report-display'
import { FollowUpDocuments } from '@/lib/follow-up/shared/components/follow-up-documents'

/**
 * Normal Consultation Follow-Up Page
 * 
 * Complete workflow for follow-up general consultations:
 * 1. Search patient by name/email/phone
 * 2. View consultation history
 * 3. Enter new clinical data with comparison to previous visit
 * 4. Generate follow-up report with historical context
 * 
 * Uses hybrid architecture with shared components from lib/follow-up/shared
 */
export default function NormalFollowUpPage() {
  const {
    history,
    mostRecent,
    patientDemographics,
    loading,
    error,
    searchPatient
  } = usePatientHistory()

  const [activeTab, setActiveTab] = useState<'search' | 'clinical' | 'report' | 'documents'>('search')
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationHistoryItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [generatedReport, setGeneratedReport] = useState<any>(null)

  const handleSearch = async (criteria: any) => {
    await searchPatient(criteria)
    
    // Auto-advance to clinical tab if patient found
    if (history.length > 0) {
      setActiveTab('clinical')
    }
  }

  const handleConsultationSelect = (consultation: ConsultationHistoryItem) => {
    setSelectedConsultation(consultation)
    setIsDetailModalOpen(true)
  }

  const handleClinicalDataSubmit = (data: any) => {
    setClinicalData(data)
    setActiveTab('report')
  }

  const handleReportGenerated = (report: any) => {
    setGeneratedReport(report)
    // Auto-advance to documents tab
    setActiveTab('documents')
  }

  const handleDocumentsComplete = () => {
    // Could add save to database or redirect logic here
    alert('Consultation de suivi terminée avec succès!')
  }

  // Determine if we can proceed to each tab
  const canAccessClinical = history.length > 0
  const canAccessReport = clinicalData !== null
  const canAccessDocuments = generatedReport !== null

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img src="/tibok-logo.svg" alt="TIBOK Logo" className="h-12 w-auto object-contain" />
          <div className="p-3 bg-blue-100 rounded-lg">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Normal Consultation Follow-Up
            </h1>
            <p className="text-gray-600 mt-1">
              Compare patient progress and generate follow-up medical reports
            </p>
          </div>
        </div>

        {/* Patient Info Banner (if found) */}
        {patientDemographics && (
          <Card className="mt-4 bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">
                      {patientDemographics.fullName}
                    </p>
                    <p className="text-sm text-blue-700">
                      {patientDemographics.age} years • {patientDemographics.gender}
                      {patientDemographics.email && ` • ${patientDemographics.email}`}
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-600">
                  {history.length} consultation{history.length !== 1 ? 's' : ''} on record
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            1. Search Patient
          </TabsTrigger>
          <TabsTrigger 
            value="clinical" 
            disabled={!canAccessClinical}
            className="flex items-center gap-2"
          >
            <Stethoscope className="h-4 w-4" />
            2. Clinical Data
          </TabsTrigger>
          <TabsTrigger 
            value="report" 
            disabled={!canAccessReport}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            3. Generate Report
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            disabled={!canAccessDocuments}
            className="flex items-center gap-2"
          >
            <FileSignature className="h-4 w-4" />
            4. Documents
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Patient Search & History */}
        <TabsContent value="search" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Search Panel */}
            <div>
              <PatientSearch
                onSearch={handleSearch}
                loading={loading}
                error={error}
                resultCount={history.length}
              />
            </div>

            {/* History Panel */}
            <div>
              {history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Consultation History</CardTitle>
                    <CardDescription>
                      Previous consultations for this patient
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HistoryList
                      history={history}
                      onSelectConsultation={handleConsultationSelect}
                      selectedId={selectedConsultation?.id}
                      maxItems={5}
                      showTimeline={true}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Clinical Data Entry */}
        <TabsContent value="clinical" className="space-y-6">
          <NormalClinicalForm
            patientDemographics={patientDemographics}
            previousConsultation={mostRecent}
            onSubmit={handleClinicalDataSubmit}
          />
        </TabsContent>

        {/* Tab 3: Report Generation */}
        <TabsContent value="report" className="space-y-6">
          <NormalReportDisplay
            patientDemographics={patientDemographics}
            clinicalData={clinicalData}
            previousConsultation={mostRecent}
            consultationHistory={history}
            onReportGenerated={handleReportGenerated}
          />
        </TabsContent>

        {/* Tab 4: Documents (Prescriptions, Lab Tests, Sick Leave) */}
        <TabsContent value="documents" className="space-y-6">
          <FollowUpDocuments
            patientDemographics={patientDemographics}
            generatedReport={generatedReport}
            previousConsultation={mostRecent}
            consultationHistory={history}
            consultationType="normal"
            onComplete={handleDocumentsComplete}
          />
        </TabsContent>
      </Tabs>

      {/* Consultation Detail Modal */}
      <ConsultationDetailModal
        consultation={selectedConsultation}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  )
}
