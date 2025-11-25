'use client'

import React, { useState, useEffect } from 'react'
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
import { HistoryList, ConsultationDetailModal } from '@/lib/follow-up/shared'
import type { ConsultationHistoryItem } from '@/lib/follow-up/shared'

type WorkflowStep = 'search' | 'summary' | 'workflow'

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

  // Auto-load returning patient data from sessionStorage (set by main page redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const isReturning = urlParams.get('returning') === 'true'

    if (isReturning) {
      const storedData = sessionStorage.getItem('returningPatientData')
      if (storedData) {
        try {
          const returningPatientData = JSON.parse(storedData)
          console.log('📋 Auto-loading returning patient data:', returningPatientData)

          // Set patient data and show history
          setPatientData(returningPatientData)
          setCurrentStep('summary')
          setShowHistoryModal(true)

          // Clean up
          sessionStorage.removeItem('returningPatientData')
        } catch (error) {
          console.error('❌ Error loading returning patient data:', error)
        }
      }
    }
  }, [])

  const handlePatientFound = (data: any) => {
    setPatientData(data)
    setCurrentStep('summary')

    // Auto-show history for returning patients (≥1 consultation)
    if (data.consultations && data.consultations.length >= 1) {
      console.log('📋 Returning patient detected - auto-showing consultation history')
      setShowHistoryModal(true)
    }
  }

  const handleNewPatient = () => {
    // Redirect to normal consultation for new patient
    window.location.href = '/consultation'
  }

  const handleViewHistory = () => {
    setShowHistoryModal(true)
  }

  const handleConsultationSelect = (consultation: ConsultationHistoryItem) => {
    setSelectedConsultation(consultation)
    setIsDetailModalOpen(true)
  }

  const handleProceedToWorkflow = () => {
    setCurrentStep('workflow')
    setShowHistoryModal(false)
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
            <div className={`h-2 flex-1 rounded-full ${currentStep === 'summary' || currentStep === 'workflow' ? 'bg-green-500' : 'bg-gray-200'}`} />
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
                  Continuer vers Sélection Workflow →
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

        {/* Step 3: Workflow Selection */}
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
