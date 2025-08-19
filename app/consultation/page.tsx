"use client"

import { useState, useEffect } from "react"
import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import { consultationDataService } from '@/lib/consultation-data-service'
import { debugLog } from '@/lib/logger'

export default function ConsultationPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [consultationId, setConsultationId] = useState<string | null>(null)
  
  // États pour stocker les données de chaque étape
  const [patientData, setPatientData] = useState<any>(null)
  const [clinicalData, setClinicalData] = useState<any>(null)
  const [questionsData, setQuestionsData] = useState<any>(null)

  // Initialize consultation
  useEffect(() => {
    const initConsultation = async () => {
      try {
        const id = await consultationDataService.initializeConsultation()
        setConsultationId(id)
        debugLog('✅ Consultation initialized:', { id }, ['id'])
        
        // Load any existing data
        const savedData = await consultationDataService.getAllData()
        if (savedData) {
          debugLog('📂 Loaded saved data', {
            hasPatientData: !!savedData.patientData,
            hasClinicalData: !!savedData.clinicalData,
            hasQuestionsData: !!savedData.questionsData
          }, ['hasPatientData', 'hasClinicalData', 'hasQuestionsData'])
          if (savedData.patientData) setPatientData(savedData.patientData)
          if (savedData.clinicalData) setClinicalData(savedData.clinicalData)
          if (savedData.questionsData) setQuestionsData(savedData.questionsData)
          
          // Determine which step to show based on saved data
          if (savedData.questionsData?.responses?.length > 0) {
            setCurrentStep(2)
          } else if (savedData.clinicalData?.chiefComplaint) {
            setCurrentStep(1)
          } else if (savedData.patientData?.firstName) {
            setCurrentStep(0)
          }
        }
      } catch (error) {
        console.error('Error initializing consultation:', error)
      }
    }
    
    initConsultation()
  }, [])

  // Handlers for data updates
  const handlePatientDataChange = (data: any) => {
    debugLog('📊 PATIENT DATA UPDATED:', {
      hasAllergies: (data?.allergies?.length || 0) > 0,
      hasMedicalHistory: (data?.medicalHistory?.length || 0) > 0,
      dataKeys: Object.keys(data || {})
    }, ['hasAllergies', 'hasMedicalHistory', 'dataKeys'])
    setPatientData(data)
  }

  const handleClinicalDataChange = (data: any) => {
    debugLog('🏥 CLINICAL DATA UPDATED:', {
      hasChiefComplaint: !!data?.chiefComplaint,
      symptomsCount: data?.symptoms?.length,
      painScale: data?.painScale,
      hasSymptomDuration: !!data?.symptomDuration,
      dataKeys: Object.keys(data || {})
    }, ['hasChiefComplaint', 'symptomsCount', 'painScale', 'hasSymptomDuration', 'dataKeys'])
    setClinicalData(data)
  }

  const handleQuestionsDataChange = (data: any) => {
    debugLog('❓ QUESTIONS DATA UPDATED:', {
      responsesCount: data?.responses?.length,
      dataKeys: Object.keys(data || {})
    }, ['responsesCount', 'dataKeys'])
    setQuestionsData(data)
  }

  // Navigation handlers
  const goToNext = () => {
    debugLog(`➡️ NAVIGATING FROM STEP ${currentStep} TO STEP ${currentStep + 1}`)
    debugLog('Current data state:', {
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      hasQuestionsData: !!questionsData
    }, ['hasPatientData', 'hasClinicalData', 'hasQuestionsData'])
    
    if (currentStep === 1) {
      // Moving from Clinical to Questions
      debugLog('🚀 MOVING TO QUESTIONS WITH DATA:', {
        patientExists: !!patientData,
        clinicalExists: !!clinicalData
      }, ['patientExists', 'clinicalExists'])
    }
    
    setCurrentStep(prev => prev + 1)
  }

  const goToPrevious = () => {
    debugLog(`⬅️ NAVIGATING FROM STEP ${currentStep} TO STEP ${currentStep - 1}`)
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  // Debug info display
  const renderDebugInfo = () => (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">🔍 DEBUG INFO</div>
      <div>Step: {currentStep}</div>
      <div>Consultation ID: {consultationId || 'None'}</div>
      <div>Patient Data: {patientData ? '✅' : '❌'}</div>
      <div>Clinical Data: {clinicalData ? '✅' : '❌'}</div>
      <div>Questions Data: {questionsData ? '✅' : '❌'}</div>
      {patientData && (
        <div className="mt-2">
          Patient: {patientData.firstName} {patientData.lastName}
        </div>
      )}
      {clinicalData && (
        <div>
          Chief Complaint: {clinicalData.chiefComplaint?.substring(0, 30)}...
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {['Patient Info', 'Clinical Info', 'AI Questions'].map((label, index) => (
              <div
                key={index}
                className={`flex items-center ${
                  index < 2 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index <= currentStep
                      ? 'bg-blue-600'
                      : 'bg-gray-300'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="ml-2 text-sm font-medium">
                  {label}
                </span>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      index < currentStep
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {currentStep === 0 && (
            <PatientForm
              data={patientData}
              onDataChange={handlePatientDataChange}
              onNext={goToNext}
              consultationId={consultationId}
            />
          )}

          {currentStep === 1 && (
            <ClinicalForm
              data={clinicalData}
              patientData={patientData}
              onDataChange={handleClinicalDataChange}
              onNext={goToNext}
              onPrevious={goToPrevious}
              consultationId={consultationId}
            />
          )}

          {currentStep === 2 && (
            <>
              {/* Debug check before rendering QuestionsForm */}
              {(!patientData || !clinicalData) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h3 className="text-red-800 font-bold mb-2">⚠️ Missing Data</h3>
                  <p className="text-red-600">
                    Patient Data: {patientData ? '✅ Present' : '❌ Missing'}
                  </p>
                  <p className="text-red-600">
                    Clinical Data: {clinicalData ? '✅ Present' : '❌ Missing'}
                  </p>
                  {!patientData && (
                    <p className="mt-2 text-sm">
                      Patient data is missing. Please go back and fill the patient form.
                    </p>
                  )}
                  {!clinicalData && (
                    <p className="mt-2 text-sm">
                      Clinical data is missing. Please go back and fill the clinical form.
                    </p>
                  )}
                  <button
                    onClick={goToPrevious}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Go Back
                  </button>
                </div>
              )}
              
              {patientData && clinicalData && (
                <QuestionsForm
                  patientData={patientData}
                  clinicalData={clinicalData}
                  onDataChange={handleQuestionsDataChange}
                  onNext={() => debugLog('Next from Questions')}
                  onPrevious={goToPrevious}
                  consultationId={consultationId}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Debug panel */}
      {renderDebugInfo()}
    </div>
  )
}
