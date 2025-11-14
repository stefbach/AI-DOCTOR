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
import { Eye, Image as ImageIcon, FileText, UserCheck, ClipboardList } from 'lucide-react'
import { DermatologyImageComparison } from '@/lib/follow-up/dermatology/components/dermatology-image-comparison'
import { DermatologyClinicalForm } from '@/lib/follow-up/dermatology/components/dermatology-clinical-form'
import { DermatologyReportDisplay } from '@/lib/follow-up/dermatology/components/dermatology-report-display'

/**
 * Dermatology Consultation Follow-Up Page
 * 
 * Complete workflow for dermatology follow-up consultations:
 * 1. Search patient by name/email/phone
 * 2. View consultation history with images
 * 3. Compare before/after skin condition images
 * 4. Enter new clinical findings
 * 5. Generate dermatology follow-up report with image analysis
 * 
 * Uses hybrid architecture with shared components from lib/follow-up/shared
 */
export default function DermatologyFollowUpPage() {
  const {
    history,
    mostRecent,
    patientDemographics,
    loading,
    error,
    searchPatient
  } = usePatientHistory()

  const [activeTab, setActiveTab] = useState<'search' | 'images' | 'clinical' | 'report'>('search')
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationHistoryItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [imageComparisonData, setImageComparisonData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [generatedReport, setGeneratedReport] = useState<any>(null)

  const handleSearch = async (criteria: any) => {
    await searchPatient(criteria)
    
    // Auto-advance to images tab if patient found with previous images
    if (history.length > 0) {
      setActiveTab('images')
    }
  }

  const handleConsultationSelect = (consultation: ConsultationHistoryItem) => {
    setSelectedConsultation(consultation)
    setIsDetailModalOpen(true)
  }

  const handleImageComparisonComplete = (data: any) => {
    setImageComparisonData(data)
    setActiveTab('clinical')
  }

  const handleClinicalDataSubmit = (data: any) => {
    setClinicalData(data)
    setActiveTab('report')
  }

  const handleReportGenerated = (report: any) => {
    setGeneratedReport(report)
  }

  // Determine if we can proceed to each tab
  const canAccessImages = history.length > 0
  const canAccessClinical = imageComparisonData !== null
  const canAccessReport = clinicalData !== null

  // Filter history to only dermatology consultations
  const dermatologyHistory = history.filter(
    c => c.consultationType?.toLowerCase() === 'dermatology'
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Eye className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dermatology Follow-Up
            </h1>
            <p className="text-gray-600 mt-1">
              Compare skin condition progression and generate dermatology follow-up reports
            </p>
          </div>
        </div>

        {/* Patient Info Banner (if found) */}
        {patientDemographics && (
          <Card className="mt-4 bg-indigo-50 border-indigo-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="font-semibold text-indigo-900">
                      {patientDemographics.fullName}
                    </p>
                    <p className="text-sm text-indigo-700">
                      {patientDemographics.age} years • {patientDemographics.gender}
                      {patientDemographics.email && ` • ${patientDemographics.email}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-indigo-600">
                    {dermatologyHistory.length} dermatology consultation{dermatologyHistory.length !== 1 ? 's' : ''}
                  </Badge>
                  {mostRecent?.images && (
                    <Badge variant="outline" className="border-indigo-400 text-indigo-700">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {mostRecent.images.length} previous image{mostRecent.images.length !== 1 ? 's' : ''}
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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            1. Search
          </TabsTrigger>
          <TabsTrigger 
            value="images" 
            disabled={!canAccessImages}
            className="flex items-center gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            2. Images
          </TabsTrigger>
          <TabsTrigger 
            value="clinical" 
            disabled={!canAccessClinical}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
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
                resultCount={dermatologyHistory.length}
              />
            </div>

            {/* History Panel */}
            <div>
              {dermatologyHistory.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <HistoryList
                      history={dermatologyHistory}
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

        {/* Tab 2: Image Comparison */}
        <TabsContent value="images" className="space-y-6">
          <DermatologyImageComparison
            patientDemographics={patientDemographics}
            previousConsultation={mostRecent}
            onComplete={handleImageComparisonComplete}
          />
        </TabsContent>

        {/* Tab 3: Clinical Data Entry */}
        <TabsContent value="clinical" className="space-y-6">
          <DermatologyClinicalForm
            patientDemographics={patientDemographics}
            previousConsultation={mostRecent}
            imageComparisonData={imageComparisonData}
            onSubmit={handleClinicalDataSubmit}
          />
        </TabsContent>

        {/* Tab 4: Report Generation */}
        <TabsContent value="report" className="space-y-6">
          <DermatologyReportDisplay
            patientDemographics={patientDemographics}
            clinicalData={clinicalData}
            imageComparisonData={imageComparisonData}
            previousConsultation={mostRecent}
            consultationHistory={dermatologyHistory}
            onReportGenerated={handleReportGenerated}
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
