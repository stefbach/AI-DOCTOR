'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  ArrowLeft,
  Info
} from 'lucide-react'
import { HubPatientSearch } from '@/components/consultation-hub/hub-patient-search'
import { HubPatientSummary } from '@/components/consultation-hub/hub-patient-summary'
import { HubWorkflowSelector } from '@/components/consultation-hub/hub-workflow-selector'
import { HubDocumentAnalysisOption } from '@/components/consultation-hub/hub-document-analysis-option'
import { HistoryList, ConsultationDetailModal } from '@/lib/follow-up/shared'
import type { ConsultationHistoryItem } from '@/lib/follow-up/shared'

type WorkflowStep = 'search' | 'summary' | 'documents' | 'workflow'

/**
 * Consultation Hub - Interface Centrale Intelligente
 * 
 * Point d'entrée unique pour tous les types de consultations.
 * Détecte automatiquement si le patient est nouveau ou existant
 * et route intelligemment vers le workflow approprié.
 */
export default function ConsultationHubPage() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('search')
  const [patientData, setPatientData] = useState<any>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationHistoryItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handlePatientFound = (data: any) => {
    setPatientData(data)
    setCurrentStep('summary')
  }

  const handleNewPatient = () => {
    // Redirect to normal consultation for new patient
    window.location.href = '/'
  }

  const handleViewHistory = () => {
    setShowHistoryModal(true)
  }

  const handleConsultationSelect = (consultation: ConsultationHistoryItem) => {
    setSelectedConsultation(consultation)
    setIsDetailModalOpen(true)
  }

  const handleProceedToWorkflow = () => {
    // Go to document analysis option first
    setCurrentStep('documents')
    setShowHistoryModal(false)
  }

  const handleDocumentsComplete = (hasDocuments: boolean) => {
    // After documents (saved or skipped), go to workflow selection
    setCurrentStep('workflow')
  }

  const handleSkipDocuments = () => {
    // Skip directly to workflow selection
    setCurrentStep('workflow')
  }

  const handleReset = () => {
    setCurrentStep('search')
    setPatientData(null)
    setShowHistoryModal(false)
  }

  const handleWorkflowProceed = (path: string) => {
    // Navigation will be handled by the component
    console.log('Proceeding to:', path)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src="/tibok-logo.svg" 
            alt="TIBOK Logo" 
            className="h-12 w-auto object-contain"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Hub de Consultation
            </h1>
            <p className="text-gray-600 mt-1">
              Centre intelligent de gestion des consultations médicales
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour Accueil
          </Button>
        </div>

        {/* Info Banner */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Comment ça marche:</strong> Recherchez votre patient. 
            Le système détectera automatiquement s'il s'agit d'une première consultation 
            ou d'un suivi et vous proposera le workflow optimal.
          </AlertDescription>
        </Alert>
      </div>

      {/* Progress Indicator */}
      {currentStep !== 'search' && (
        <div className="mb-6 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nouvelle Recherche
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full ${currentStep === 'summary' || currentStep === 'documents' || currentStep === 'workflow' ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${currentStep === 'documents' || currentStep === 'workflow' ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${currentStep === 'workflow' ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Step 1: Search */}
        {currentStep === 'search' && (
          <HubPatientSearch
            onPatientFound={handlePatientFound}
            onNewPatient={handleNewPatient}
          />
        )}

        {/* Step 2: Patient Summary */}
        {currentStep === 'summary' && patientData && (
          <div className="space-y-6">
            <HubPatientSummary
              patientData={patientData}
              onViewHistory={handleViewHistory}
            />

            {!showHistoryModal && (
              <div className="flex justify-end">
                <Button
                  onClick={handleProceedToWorkflow}
                  size="lg"
                >
                  Continue →
                </Button>
              </div>
            )}

            {/* History Modal Content */}
            {showHistoryModal && (
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Historique Complet des Consultations
                    </h3>
                    <Button
                      onClick={handleProceedToWorkflow}
                      size="sm"
                    >
                      Continuer →
                    </Button>
                  </div>
                  <Separator className="mb-4" />
                  <HistoryList
                    history={patientData.consultations}
                    onSelectConsultation={handleConsultationSelect}
                    selectedId={selectedConsultation?.id}
                    showTimeline={true}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Document Analysis (Optional) */}
        {currentStep === 'documents' && patientData && (
          <HubDocumentAnalysisOption
            patient={{
              id: patientData.consultations?.[0]?.patient_data?.id || 'patient_' + Date.now(),
              fullName: patientData.consultations?.[0]?.patient_data?.fullName || 'Unknown',
              firstName: patientData.consultations?.[0]?.patient_data?.firstName,
              lastName: patientData.consultations?.[0]?.patient_data?.lastName,
              age: patientData.consultations?.[0]?.patient_data?.age,
              gender: patientData.consultations?.[0]?.patient_data?.gender,
              phone: patientData.consultations?.[0]?.patient_data?.phone,
              email: patientData.consultations?.[0]?.patient_data?.email,
            }}
            onComplete={handleDocumentsComplete}
            onSkip={handleSkipDocuments}
          />
        )}

        {/* Step 4: Workflow Selection */}
        {currentStep === 'workflow' && patientData && (
          <HubWorkflowSelector
            patientData={patientData}
            onProceed={handleWorkflowProceed}
          />
        )}
      </div>

      {/* Consultation Detail Modal */}
      <ConsultationDetailModal
        consultation={selectedConsultation}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  )
}
