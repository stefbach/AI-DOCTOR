'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  PatientSearch, 
  HistoryList, 
  ConsultationDetailModal,
  usePatientHistory,
  type ConsultationHistoryItem
} from '@/lib/follow-up/shared'
import { Heart, TrendingUp, FileText, UserCheck, ClipboardList, Activity, FileSignature } from 'lucide-react'
import { ChronicVitalsTrends } from '@/lib/follow-up/chronic/components/chronic-vitals-trends'
import { ChronicClinicalForm } from '@/lib/follow-up/chronic/components/chronic-clinical-form'
import { ChronicFollowUpProfessionalReport } from '@/lib/follow-up/chronic/components/chronic-follow-up-professional-report'
import { FollowUpDocuments } from '@/lib/follow-up/shared/components/follow-up-documents'

/**
 * Chronic Disease Follow-Up Page
 * 
 * Complete workflow for chronic disease management follow-up:
 * 1. Search patient by name/email/phone
 * 2. View consultation history and vital signs trends
 * 3. Analyze long-term progression (BP, weight, glucose)
 * 4. Enter new clinical data with medication compliance
 * 5. Generate chronic disease follow-up report with trend analysis
 * 
 * Uses hybrid architecture with shared components from lib/follow-up/shared
 */
export default function ChronicFollowUpPage() {
  const {
    history,
    mostRecent,
    patientDemographics,
    loading,
    error,
    searchPatient
  } = usePatientHistory()

  const [activeTab, setActiveTab] = useState<'search' | 'trends' | 'clinical' | 'report' | 'documents'>('search')
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationHistoryItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [trendsData, setTrendsData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  const [consultationId, setConsultationId] = useState<string>('')

  const handleSearch = async (criteria: any) => {
    await searchPatient(criteria)

    // Auto-advance to trends tab if patient found
    if (history.length > 0) {
      // Generate a unique consultation ID for this follow-up session
      const newConsultationId = `chronic_followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setConsultationId(newConsultationId)
      setActiveTab('trends')
    }
  }

  const handleConsultationSelect = (consultation: ConsultationHistoryItem) => {
    setSelectedConsultation(consultation)
    setIsDetailModalOpen(true)
  }

  const handleTrendsComplete = (data: any) => {
    setTrendsData(data)
    setActiveTab('clinical')
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
    alert('Consultation de suivi de maladie chronique terminée avec succès!')
  }

  // Determine if we can proceed to each tab
  const canAccessTrends = history.length > 0
  const canAccessClinical = trendsData !== null
  const canAccessReport = clinicalData !== null
  const canAccessDocuments = generatedReport !== null

  // Filter history to chronic disease consultations
  const chronicHistory = history.filter(
    c => c.consultationType?.toLowerCase().includes('chronic')
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img src="/tibok-logo.png.png" alt="TIBOK Logo" className="h-12 w-auto object-contain" />
          <div className="p-3 bg-red-100 rounded-lg">
            <Heart className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Chronic Disease Follow-Up
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor long-term trends and generate comprehensive chronic disease management reports
            </p>
          </div>
        </div>

        {/* Patient Info Banner (if found) */}
        {patientDemographics && (
          <Card className="mt-4 bg-red-50 border-red-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">
                      {patientDemographics.fullName}
                    </p>
                    <p className="text-sm text-red-700">
                      {patientDemographics.age} years • {patientDemographics.gender}
                      {patientDemographics.email && ` • ${patientDemographics.email}`}
                    </p>
                    {patientDemographics.chronicConditions && patientDemographics.chronicConditions.length > 0 && (
                      <p className="text-sm text-red-800 mt-1 font-medium">
                        Conditions: {patientDemographics.chronicConditions.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-red-600">
                    {chronicHistory.length} chronic consultation{chronicHistory.length !== 1 ? 's' : ''}
                  </Badge>
                  {history.length > 0 && (
                    <Badge variant="outline" className="border-red-400 text-red-700">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {history.length} total visits
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            1. Search
          </TabsTrigger>
          <TabsTrigger 
            value="trends" 
            disabled={!canAccessTrends}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            2. Trends
          </TabsTrigger>
          <TabsTrigger 
            value="clinical" 
            disabled={!canAccessClinical}
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            3. Clinical
          </TabsTrigger>
          <TabsTrigger 
            value="report" 
            disabled={!canAccessReport}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            4. Report
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            disabled={!canAccessDocuments}
            className="flex items-center gap-2"
          >
            <FileSignature className="h-4 w-4" />
            5. Documents
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
                resultCount={chronicHistory.length}
              />
            </div>

            {/* History Panel */}
            <div>
              {history.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
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

        {/* Tab 2: Vital Signs Trends */}
        <TabsContent value="trends" className="space-y-6">
          <ChronicVitalsTrends
            patientDemographics={patientDemographics}
            consultationHistory={history}
            onComplete={handleTrendsComplete}
          />
        </TabsContent>

        {/* Tab 3: Clinical Data Entry */}
        <TabsContent value="clinical" className="space-y-6">
          <ChronicClinicalForm
            patientDemographics={patientDemographics}
            previousConsultation={mostRecent}
            trendsData={trendsData}
            onSubmit={handleClinicalDataSubmit}
          />
        </TabsContent>

        {/* Tab 4: Report Generation */}
        <TabsContent value="report" className="space-y-6">
          <ChronicFollowUpProfessionalReport
            patientDemographics={patientDemographics}
            clinicalData={clinicalData}
            trendsData={trendsData}
            previousConsultation={mostRecent}
            consultationHistory={history}
            consultationId={consultationId}
            onReportGenerated={handleReportGenerated}
          />
        </TabsContent>

        {/* Tab 5: Documents (Prescriptions, Lab Tests, Sick Leave) */}
        <TabsContent value="documents" className="space-y-6">
          <FollowUpDocuments
            patientDemographics={patientDemographics}
            generatedReport={generatedReport}
            previousConsultation={mostRecent}
            consultationHistory={history}
            consultationType="chronic"
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
