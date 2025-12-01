'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Stethoscope,
  Eye,
  Heart,
  ArrowRight,
  FileText,
  User,
  CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ConsultationType } from '@/lib/consultation-hub/route-decision'
import { determineOptimalRoute } from '@/lib/consultation-hub/route-decision'
import type { ConsultationHistoryItem } from '@/lib/follow-up/shared'
import { extractPatientDemographicsFromHistory } from '@/lib/follow-up/shared/utils/history-fetcher'

export interface HubWorkflowSelectorProps {
  patientData: {
    consultations: ConsultationHistoryItem[]
    tibokPatientInfo?: {
      consultation_specialty?: 'general' | 'dermatology' | 'chronic_disease'
      [key: string]: any
    }
  } | null
  onProceed: (path: string) => void
}

export function HubWorkflowSelector({ patientData, onProceed }: HubWorkflowSelectorProps) {
  const router = useRouter()

  // Get the consultation type from Tibok (patient's choice)
  const tibokSpecialty = patientData?.tibokPatientInfo?.consultation_specialty
  const isDermatologyFromTibok = tibokSpecialty === 'dermatology'

  // For dermatology, auto-select; for others, default to 'normal'
  const [selectedType, setSelectedType] = useState<ConsultationType>(
    isDermatologyFromTibok ? 'dermatology' : 'normal'
  )
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')

  const consultationHistory = patientData?.consultations || []
  const routeDecision = determineOptimalRoute(consultationHistory, selectedType)
  const tibokPatientInfo = patientData?.tibokPatientInfo

  // Extract patient demographics for display
  // First try from consultation history, then fallback to tibokPatientInfo
  const demographicsFromHistory = consultationHistory.length > 0
    ? extractPatientDemographicsFromHistory(consultationHistory)
    : null

  // Build demographics object with fallbacks from tibokPatientInfo
  const demographics = {
    firstName: demographicsFromHistory?.firstName || tibokPatientInfo?.first_name || tibokPatientInfo?.firstName || '',
    lastName: demographicsFromHistory?.lastName || tibokPatientInfo?.last_name || tibokPatientInfo?.lastName || '',
    fullName: demographicsFromHistory?.fullName || tibokPatientInfo?.full_name || tibokPatientInfo?.fullName || '',
    age: demographicsFromHistory?.age || tibokPatientInfo?.age || '',
    dateOfBirth: demographicsFromHistory?.dateOfBirth || tibokPatientInfo?.date_of_birth || tibokPatientInfo?.dateOfBirth || '',
    gender: demographicsFromHistory?.gender || tibokPatientInfo?.gender || tibokPatientInfo?.sexe || '',
    phone: demographicsFromHistory?.phone || tibokPatientInfo?.phone || tibokPatientInfo?.telephone || '',
    email: demographicsFromHistory?.email || tibokPatientInfo?.email || '',
    address: demographicsFromHistory?.address || tibokPatientInfo?.address || tibokPatientInfo?.adresse || '',
  }

  // Check if we have any meaningful patient data
  const hasPatientInfo = demographics.firstName || demographics.lastName || demographics.fullName || demographics.age

  const handleProceed = () => {
    const selectedPath = selectedWorkflow || routeDecision.recommendedPath

    // Mark that we're coming from the consultation hub (to prevent redirect loop)
    sessionStorage.setItem('fromConsultationHub', 'true')

    // If going to a FULL consultation (not follow-up) AND we have patient data
    // Store demographics in sessionStorage for pre-filling
    const hasPatientData = consultationHistory.length > 0 || tibokPatientInfo
    if (!selectedPath.includes('/follow-up') && hasPatientData) {
      console.log('📋 Preparing patient data for prefill...')

      // Extract demographics from consultation history, then fallback to tibokPatientInfo
      const historyDemographics = consultationHistory.length > 0
        ? extractPatientDemographicsFromHistory(consultationHistory)
        : null

      // Build combined demographics with fallbacks
      const prefillDemographics = {
        firstName: historyDemographics?.firstName || tibokPatientInfo?.first_name || tibokPatientInfo?.firstName || '',
        lastName: historyDemographics?.lastName || tibokPatientInfo?.last_name || tibokPatientInfo?.lastName || '',
        age: historyDemographics?.age || tibokPatientInfo?.age || '',
        dateOfBirth: historyDemographics?.dateOfBirth || tibokPatientInfo?.date_of_birth || tibokPatientInfo?.dateOfBirth || '',
        gender: historyDemographics?.gender || tibokPatientInfo?.gender || tibokPatientInfo?.sexe || '',
        phone: historyDemographics?.phone || tibokPatientInfo?.phone || tibokPatientInfo?.telephone || '',
        email: historyDemographics?.email || tibokPatientInfo?.email || '',
        address: historyDemographics?.address || tibokPatientInfo?.address || tibokPatientInfo?.adresse || '',
        weight: historyDemographics?.weight || tibokPatientInfo?.weight || tibokPatientInfo?.poids || '',
        height: historyDemographics?.height || tibokPatientInfo?.height || tibokPatientInfo?.taille || '',
        allergies: historyDemographics?.allergies || tibokPatientInfo?.allergies || [],
        medicalHistory: historyDemographics?.medicalHistory || tibokPatientInfo?.medicalHistory || tibokPatientInfo?.antecedentsMedicaux || [],
        currentMedications: historyDemographics?.currentMedications || tibokPatientInfo?.currentMedications || tibokPatientInfo?.medicamentsActuels || ''
      }

      if (prefillDemographics.firstName || prefillDemographics.lastName || prefillDemographics.age) {
        console.log('✅ Demographics extracted:', prefillDemographics)
        
        // Prepare base data in PatientForm format
        const basePrefillData = {
          firstName: prefillDemographics.firstName || '',
          lastName: prefillDemographics.lastName || '',
          birthDate: prefillDemographics.dateOfBirth || '',
          age: prefillDemographics.age || '',
          gender: prefillDemographics.gender || '',
          phone: prefillDemographics.phone || '',
          email: prefillDemographics.email || '',
          address: prefillDemographics.address || '',
          weight: prefillDemographics.weight || '',
          height: prefillDemographics.height || '',
          // Handle allergies - can be array or string
          allergies: Array.isArray(prefillDemographics.allergies)
            ? prefillDemographics.allergies
            : (prefillDemographics.allergies ? [prefillDemographics.allergies] : []),
          otherAllergies: '',
          // Handle medical history - can be array or string
          medicalHistory: Array.isArray(prefillDemographics.medicalHistory)
            ? prefillDemographics.medicalHistory
            : (prefillDemographics.medicalHistory ? [prefillDemographics.medicalHistory] : []),
          otherMedicalHistory: '',
          currentMedicationsText: Array.isArray(prefillDemographics.currentMedications)
            ? prefillDemographics.currentMedications.join(', ')
            : (prefillDemographics.currentMedications || '')
        }
        
        // DERMATOLOGY WORKFLOW
        if (selectedPath === '/dermatology') {
          console.log('🔬 Setting up dermatology workflow with patient prefill')

          // Include Tibok image data and IDs for dermatology
          const dermatologyData = {
            ...basePrefillData,
            // IDs for document sending
            consultationId: patientData?.searchCriteria?.consultationId || '',
            patientId: patientData?.searchCriteria?.patientId || '',
            doctorId: patientData?.searchCriteria?.doctorId || '',
            // Tibok image data
            tibokImageUrl: tibokPatientInfo?.temp_image_url || '',
            hasTibokImage: tibokPatientInfo?.has_temp_image || false,
            imageExpiresAt: tibokPatientInfo?.image_expires_at || '',
            imageUploadedAt: tibokPatientInfo?.image_uploaded_at || ''
          }

          sessionStorage.setItem('dermatologyPatientData', JSON.stringify(dermatologyData))
          sessionStorage.setItem('isDermatologyWorkflow', 'true')
          sessionStorage.setItem('isExistingPatientDermatology', 'true')

          console.log('💾 Dermatology prefill data stored with Tibok image:', dermatologyData.tibokImageUrl ? 'Yes' : 'No')
          console.log('📋 IDs stored:', {
            consultationId: dermatologyData.consultationId,
            patientId: dermatologyData.patientId,
            doctorId: dermatologyData.doctorId
          })
        }
        // CHRONIC DISEASE WORKFLOW
        else if (selectedPath === '/chronic-disease') {
          console.log('🏥 Setting up chronic disease workflow with patient prefill')
          
          // Extract chronic disease history
          const chronicHistory = consultationHistory
            .filter((c: any) => c.consultationType === 'chronic' || c.consultationType === 'chronic_disease')
            .map((c: any) => ({
              date: c.date,
              diagnosis: c.diagnosis || 'N/A',
              medications: c.medications || []
            }))
          
          // Add chronic-specific data
          const chronicPrefillData = {
            ...basePrefillData,
            knownChronicDiseases: chronicHistory,
            previousChronicDiagnoses: chronicHistory.map((c: any) => c.diagnosis).filter(d => d !== 'N/A').join(', ')
          }
          
          sessionStorage.setItem('chronicDiseasePatientData', JSON.stringify(chronicPrefillData))
          sessionStorage.setItem('isChronicDiseaseWorkflow', 'true')
          sessionStorage.setItem('isExistingPatientChronic', 'true')
          sessionStorage.setItem('chronicDiseaseHistory', JSON.stringify(chronicHistory))
          
          console.log('💾 Chronic disease prefill data stored with history:', chronicHistory.length, 'entries')
        }
        // NORMAL CONSULTATION WORKFLOW
        else if (selectedPath === '/consultation') {
          sessionStorage.setItem('consultationPatientData', JSON.stringify(basePrefillData))
          sessionStorage.setItem('isExistingPatientConsultation', 'true')
          
          console.log('💾 Normal consultation prefill data stored')
        }
      } else {
        console.warn('⚠️ Could not extract demographics from consultation history')
      }
    }
    
    onProceed(selectedPath)
    router.push(selectedPath)
  }

  // For dermatology from Tibok: skip type selection, show patient info directly
  if (isDermatologyFromTibok) {
    return (
      <div className="space-y-6">
        {/* Dermatology Auto-Selected Notice */}
        <Card className="border-indigo-300 bg-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-indigo-600" />
              Consultation Dermatologique
              <Badge className="bg-indigo-600 ml-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sélectionné par le patient
              </Badge>
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Le patient a choisi une consultation dermatologique sur Tibok
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Patient Information Summary */}
        {hasPatientInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Informations Patient
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {(demographics.firstName || demographics.lastName || demographics.fullName) && (
                  <div>
                    <span className="text-gray-500">Nom:</span>
                    <p className="font-medium">
                      {demographics.firstName && demographics.lastName
                        ? `${demographics.firstName} ${demographics.lastName}`
                        : demographics.fullName || demographics.firstName || demographics.lastName}
                    </p>
                  </div>
                )}
                {demographics.age && (
                  <div>
                    <span className="text-gray-500">Âge:</span>
                    <p className="font-medium">{demographics.age} ans</p>
                  </div>
                )}
                {demographics.gender && (
                  <div>
                    <span className="text-gray-500">Genre:</span>
                    <p className="font-medium">{demographics.gender === 'male' ? 'Homme' : demographics.gender === 'female' ? 'Femme' : demographics.gender}</p>
                  </div>
                )}
                {demographics.phone && (
                  <div>
                    <span className="text-gray-500">Téléphone:</span>
                    <p className="font-medium">{demographics.phone}</p>
                  </div>
                )}
                {demographics.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{demographics.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Summary if exists */}
        {routeDecision.patientSummary && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              📊 Résumé Historique
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                • Total consultations: {routeDecision.patientSummary.totalConsultations}
              </p>
              <p>
                • Dernière consultation: {new Date(routeDecision.patientSummary.lastConsultationDate).toLocaleDateString()}
              </p>
              <p>
                • Type précédent: {routeDecision.patientSummary.lastConsultationType}
              </p>
            </div>
          </div>
        )}

        {/* Proceed Button - Dermatology */}
        <Button
          onClick={handleProceed}
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowRight className="mr-2 h-5 w-5" />
          Continuer vers Dermatologie
        </Button>
      </div>
    )
  }

  // For Normal/Chronic from Tibok: show type selection (doctor chooses between Normal and Chronic)
  return (
    <div className="space-y-6">
      {/* Type Selection - Only Normal and Chronic options for doctor to choose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Type de Consultation
          </CardTitle>
          <CardDescription>
            Choisissez le type de consultation à effectuer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value as ConsultationType)
              setSelectedWorkflow('') // Reset workflow selection
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Normal */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'normal' ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4" onClick={() => setSelectedType('normal')}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="normal" id="type-normal" />
                    <div className="flex-1">
                      <Label htmlFor="type-normal" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold">Consultation Normale</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Consultation médicale générale
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chronic */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'chronic' ? 'ring-2 ring-red-500' : ''}`}>
                <CardContent className="p-4" onClick={() => setSelectedType('chronic')}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="chronic" id="type-chronic" />
                    <div className="flex-1">
                      <Label htmlFor="type-chronic" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="h-5 w-5 text-red-600" />
                          <span className="font-semibold">Maladie Chronique</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Diabète, hypertension, etc.
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Proceed Button */}
      <Button
        onClick={handleProceed}
        size="lg"
        className={`w-full ${selectedType === 'chronic' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        <ArrowRight className="mr-2 h-5 w-5" />
        {selectedType === 'chronic' ? 'Continuer vers Maladie Chronique' : 'Continuer vers Consultation Normale'}
      </Button>
    </div>
  )
}
