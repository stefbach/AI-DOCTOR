'use client'

import React, { useState } from 'react'
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
  CheckCircle,
  Mic
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
  const isGeneralFromTibok = tibokSpecialty === 'general'
  const isChronicFromTibok = tibokSpecialty === 'chronic_disease'

  // Debug: Log what we received from Tibok
  console.log('🏥 Hub Workflow - tibokPatientInfo:', patientData?.tibokPatientInfo)
  console.log('🏥 Hub Workflow - consultation_specialty from Tibok:', tibokSpecialty)

  // Auto-select based on Tibok specialty
  const [selectedType, setSelectedType] = useState<ConsultationType>(
    isDermatologyFromTibok ? 'dermatology' : isChronicFromTibok ? 'chronic' : 'normal'
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

  const handleProceed = (pathOverride?: string) => {
    const selectedPath = pathOverride || selectedWorkflow || routeDecision.recommendedPath

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
        // For arrays, prefer the one with actual items (empty array is truthy in JS)
        allergies: (historyDemographics?.allergies?.length ? historyDemographics.allergies : null) || tibokPatientInfo?.allergies || [],
        medicalHistory: (historyDemographics?.medicalHistory?.length ? historyDemographics.medicalHistory : null) || tibokPatientInfo?.medicalHistory || tibokPatientInfo?.antecedentsMedicaux || [],
        currentMedications: historyDemographics?.currentMedications || tibokPatientInfo?.currentMedications || tibokPatientInfo?.medicamentsActuels || '',
        otherAllergies: tibokPatientInfo?.otherAllergies || tibokPatientInfo?.other_allergies || '',
        otherMedicalHistory: tibokPatientInfo?.otherMedicalHistory || tibokPatientInfo?.other_medical_history || '',
        smokingStatus: tibokPatientInfo?.smokingStatus || tibokPatientInfo?.smoking_status || '',
        alcoholConsumption: tibokPatientInfo?.alcoholConsumption || tibokPatientInfo?.alcohol_consumption || '',
        physicalActivity: tibokPatientInfo?.physicalActivity || tibokPatientInfo?.physical_activity || '',
      }

      if (prefillDemographics.firstName || prefillDemographics.lastName || prefillDemographics.age) {
        console.log('✅ Demographics extracted:', prefillDemographics)

        // Normalize gender to match PatientForm expected values ('Male' or 'Female')
        const normalizeGender = (gender: string | undefined): string => {
          if (!gender) return ''
          const g = gender.toLowerCase().trim()
          const maleVariants = ['m', 'male', 'masculin', 'homme', 'man']
          const femaleVariants = ['f', 'female', 'féminin', 'femme', 'woman']
          if (maleVariants.includes(g)) return 'Male'
          if (femaleVariants.includes(g)) return 'Female'
          return gender // Return as-is if already correct format
        }

        // Normalize lifestyle values to match PatientForm expected format
        const normalizeSmokingStatus = (value: string): string => {
          if (!value) return ''
          const v = value.toLowerCase().trim()
          if (v.includes('current') || v === 'actuel') return 'actuel'
          if (v.includes('non') || v === 'never' || v === 'non-smoker') return 'non'
          if (v.includes('ex') || v.includes('former') || v === 'ancien') return 'ancien'
          return ''
        }

        const normalizeAlcoholConsumption = (value: string): string => {
          if (!value) return ''
          const v = value.toLowerCase().trim()
          if (v === 'never' || v === 'none' || v === 'jamais') return 'jamais'
          if (v === 'occasional' || v === 'occasionnel') return 'occasionnel'
          if (v === 'regular' || v === 'daily' || v === 'regulier') return 'regulier'
          return ''
        }

        const normalizePhysicalActivity = (value: string): string => {
          if (!value) return ''
          const v = value.toLowerCase().trim()
          if (v === 'sedentary' || v === 'none' || v === 'sedentaire') return 'sedentaire'
          if (v === 'moderate' || v === 'moderee' || v === 'modérée') return 'moderee'
          if (v === 'intense' || v === 'high') return 'intense'
          return ''
        }

        // Prepare base data in PatientForm format
        const basePrefillData = {
          firstName: prefillDemographics.firstName || '',
          lastName: prefillDemographics.lastName || '',
          birthDate: prefillDemographics.dateOfBirth || '',
          age: prefillDemographics.age || '',
          gender: normalizeGender(prefillDemographics.gender),
          phone: prefillDemographics.phone || '',
          email: prefillDemographics.email || '',
          address: prefillDemographics.address || '',
          weight: prefillDemographics.weight || '',
          height: prefillDemographics.height || '',
          // Handle allergies - can be array or string
          allergies: Array.isArray(prefillDemographics.allergies)
            ? prefillDemographics.allergies
            : (prefillDemographics.allergies ? [prefillDemographics.allergies] : []),
          otherAllergies: prefillDemographics.otherAllergies || '',
          // Handle medical history - can be array or string
          medicalHistory: Array.isArray(prefillDemographics.medicalHistory)
            ? prefillDemographics.medicalHistory
            : (prefillDemographics.medicalHistory ? [prefillDemographics.medicalHistory] : []),
          otherMedicalHistory: prefillDemographics.otherMedicalHistory || '',
          currentMedicationsText: Array.isArray(prefillDemographics.currentMedications)
            ? prefillDemographics.currentMedications.join(', ')
            : (prefillDemographics.currentMedications || ''),
          lifeHabits: {
            smoking: normalizeSmokingStatus(prefillDemographics.smokingStatus),
            alcohol: normalizeAlcoholConsumption(prefillDemographics.alcoholConsumption),
            physicalActivity: normalizePhysicalActivity(prefillDemographics.physicalActivity),
          }
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

          // Map Tibok specialty to consultation type for banner display
          let tibokConsultationType: 'normal' | 'chronic' | null = null
          if (tibokSpecialty === 'general') {
            tibokConsultationType = 'normal'
          } else if (tibokSpecialty === 'chronic_disease') {
            tibokConsultationType = 'chronic'
          }

          // Add chronic-specific data
          const chronicPrefillData = {
            ...basePrefillData,
            knownChronicDiseases: chronicHistory,
            previousChronicDiagnoses: chronicHistory.map((c: any) => c.diagnosis).filter(d => d !== 'N/A').join(', '),
            // Include patient's original Tibok selection for doctor awareness banner
            tibokConsultationType: tibokConsultationType,
            // IDs for document sending
            consultationId: patientData?.searchCriteria?.consultationId || '',
            patientId: patientData?.searchCriteria?.patientId || '',
            doctorId: patientData?.searchCriteria?.doctorId || ''
          }

          sessionStorage.setItem('chronicDiseasePatientData', JSON.stringify(chronicPrefillData))
          sessionStorage.setItem('isChronicDiseaseWorkflow', 'true')
          sessionStorage.setItem('isExistingPatientChronic', 'true')
          sessionStorage.setItem('chronicDiseaseHistory', JSON.stringify(chronicHistory))

          console.log('💾 Chronic disease prefill data stored with history:', chronicHistory.length, 'entries')
          if (tibokConsultationType) {
            console.log('📋 Patient selected consultation type from Tibok:', tibokConsultationType)
          }
        }
        // NORMAL CONSULTATION WORKFLOW
        else if (selectedPath === '/') {
          // Map Tibok specialty to consultation type for banner display
          // 'general' → 'normal', 'chronic_disease' → 'chronic'
          let tibokConsultationType: 'normal' | 'chronic' | null = null
          if (tibokSpecialty === 'general') {
            tibokConsultationType = 'normal'
          } else if (tibokSpecialty === 'chronic_disease') {
            tibokConsultationType = 'chronic'
          }

          const normalConsultationData = {
            ...basePrefillData,
            // Include patient's original Tibok selection for doctor awareness banner
            tibokConsultationType: tibokConsultationType,
            // IDs for document sending
            consultationId: patientData?.searchCriteria?.consultationId || '',
            patientId: patientData?.searchCriteria?.patientId || '',
            doctorId: patientData?.searchCriteria?.doctorId || ''
          }

          sessionStorage.setItem('consultationPatientData', JSON.stringify(normalConsultationData))
          sessionStorage.setItem('isExistingPatientConsultation', 'true')

          console.log('💾 Normal consultation prefill data stored')
          if (tibokConsultationType) {
            console.log('📋 Patient selected consultation type from Tibok:', tibokConsultationType)
          }
        }
      } else {
        console.warn('⚠️ Could not extract demographics from consultation history')
      }
    }
    
    onProceed(selectedPath)
    router.push(selectedPath)
  }

  // Helper component for patient information display
  const PatientInfoCard = () => (
    hasPatientInfo ? (
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            Informations Patient
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
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
              <div className="sm:col-span-2 md:col-span-1">
                <span className="text-gray-500">Email:</span>
                <p className="font-medium truncate">{demographics.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    ) : null
  )

  // Helper component for history summary
  const HistorySummaryCard = () => (
    routeDecision.patientSummary ? (
      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">
          📊 Résumé Historique
        </h4>
        <div className="text-xs sm:text-sm text-blue-800 space-y-1">
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
    ) : null
  )

  // ============ DERMATOLOGY PATH ============
  if (isDermatologyFromTibok) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Dermatology Auto-Selected Notice */}
        <Card className="border-indigo-300 bg-indigo-50">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                <span>Consultation Dermatologique</span>
              </div>
              <Badge className="bg-indigo-600 self-start sm:ml-2 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sélectionné par le patient
              </Badge>
            </CardTitle>
            <CardDescription className="text-indigo-700 text-xs sm:text-sm">
              Le patient a choisi une consultation dermatologique sur Tibok
            </CardDescription>
          </CardHeader>
        </Card>

        <PatientInfoCard />
        <HistorySummaryCard />

        {/* Proceed Button - Dermatology */}
        <Button
          onClick={() => handleProceed()}
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm sm:text-base"
        >
          <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Continuer vers Dermatologie
        </Button>
      </div>
    )
  }

  // ============ GENERAL/NORMAL CONSULTATION PATH ============
  if (isGeneralFromTibok) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Normal Consultation Auto-Selected Notice */}
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <span>Consultation Normale</span>
              </div>
              <Badge className="bg-blue-600 self-start sm:ml-2 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sélectionné par le patient
              </Badge>
            </CardTitle>
            <CardDescription className="text-blue-700 text-xs sm:text-sm">
              Le patient a choisi une consultation médicale générale sur Tibok
            </CardDescription>
          </CardHeader>
        </Card>

        <PatientInfoCard />
        <HistorySummaryCard />

        {/* Proceed Button - Normal */}
        <Button
          onClick={() => handleProceed()}
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
        >
          <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Continuer vers Consultation Normale
        </Button>
      </div>
    )
  }

  // ============ CHRONIC DISEASE PATH ============
  if (isChronicFromTibok) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Chronic Disease Auto-Selected Notice */}
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                <span>Suivi Maladie Chronique</span>
              </div>
              <Badge className="bg-red-600 self-start sm:ml-2 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sélectionné par le patient
              </Badge>
            </CardTitle>
            <CardDescription className="text-red-700 text-xs sm:text-sm">
              Le patient a choisi un suivi de maladie chronique sur Tibok
            </CardDescription>
          </CardHeader>
        </Card>

        <PatientInfoCard />
        <HistorySummaryCard />

        {/* Proceed Button - Chronic (Primary) */}
        <Button
          onClick={() => handleProceed()}
          size="lg"
          className="w-full bg-red-600 hover:bg-red-700 text-sm sm:text-base"
        >
          <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Continuer vers Maladie Chronique
        </Button>

        {/* Alternative Button - Normal Consultation */}
        <div className="text-center">
          <Button
            onClick={() => handleProceed('/')}
            variant="outline"
            size="lg"
            className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 text-sm sm:text-base"
          >
            <Stethoscope className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Ou choisir Consultation Normale
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Si le médecin estime qu&apos;une consultation générale est plus appropriée
          </p>
        </div>
      </div>
    )
  }

  // ============ FALLBACK: NO TIBOK SPECIALTY - SHOW TYPE SELECTION ============
  // This is shown when no consultation_specialty was provided from Tibok
  const patientSelectedType = tibokSpecialty === 'general' ? 'normal' : tibokSpecialty === 'chronic_disease' ? 'chronic' : null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Banner showing patient's original selection from Tibok */}
      {patientSelectedType && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500 rounded-full flex-shrink-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-blue-900 mb-1 text-sm sm:text-base">
                  {patientSelectedType === 'normal' ? '📋 Consultation Normale' : '🩺 Suivi Maladie Chronique'} sélectionné par le patient
                </h4>
                <p className="text-blue-800 text-xs sm:text-sm">
                  Le patient a choisi ce type de consultation sur Tibok. Vous pouvez confirmer ou modifier selon votre évaluation clinique.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Type Selection - Only Normal and Chronic options for doctor to choose */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            Type de Consultation
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Choisissez le type de consultation à effectuer
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <RadioGroup
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value as ConsultationType)
              setSelectedWorkflow('') // Reset workflow selection
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Normal */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'normal' ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-3 sm:p-4" onClick={() => setSelectedType('normal')}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <RadioGroupItem value="normal" id="type-normal" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="type-normal" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2">
                          <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                          <span className="font-semibold text-sm sm:text-base">Consultation Normale</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Consultation médicale générale
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chronic */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'chronic' ? 'ring-2 ring-red-500' : ''}`}>
                <CardContent className="p-3 sm:p-4" onClick={() => setSelectedType('chronic')}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <RadioGroupItem value="chronic" id="type-chronic" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="type-chronic" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2">
                          <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                          <span className="font-semibold text-sm sm:text-base">Maladie Chronique</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Diabète, hypertension, etc.
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voice Dictation */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'voice_dictation' ? 'ring-2 ring-purple-500' : ''} sm:col-span-2 lg:col-span-1`}>
                <CardContent className="p-3 sm:p-4" onClick={() => setSelectedType('voice_dictation' as ConsultationType)}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <RadioGroupItem value="voice_dictation" id="type-voice" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="type-voice" className="cursor-pointer">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                          <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                          <span className="font-semibold text-sm sm:text-base">Dictée Vocale</span>
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-purple-100 text-purple-700 border-purple-300">
                            NOUVEAU
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Consultation par dictée audio
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
        onClick={() => {
          if (selectedType === 'voice_dictation') {
            handleProceed('/voice-dictation')
          } else {
            handleProceed()
          }
        }}
        size="lg"
        className={`w-full text-sm sm:text-base ${
          selectedType === 'chronic' ? 'bg-red-600 hover:bg-red-700' :
          selectedType === 'voice_dictation' ? 'bg-purple-600 hover:bg-purple-700' :
          'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {selectedType === 'chronic' ? 'Continuer vers Maladie Chronique' :
         selectedType === 'voice_dictation' ? 'Continuer vers Dictée Vocale' :
         'Continuer vers Consultation Normale'}
      </Button>
    </div>
  )
}
