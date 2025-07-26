// src/components/medical/documents-workflow.tsx

"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  FileText, 
  TestTube, 
  Stethoscope, 
  Pill,
  CheckCircle,
  Eye,
  Download,
  Save,
  User
} from "lucide-react"

// Import des composants d'édition
import ConsultationEditor from './editors/consultation-editor'
import BiologyEditor from './editors/biology-editor' 
import ParaclinicalEditor from './editors/paraclinical-editor'
import MedicationEditor from './editors/medication-editor'

export default function DocumentsWorkflow({ 
  diagnosisData, 
  mauritianDocuments, 
  patientData,
  onBack,
  onComplete 
}) {
  const [editedDocuments, setEditedDocuments] = useState({
  consultation: report || mauritianDocuments?.consultation || {},
  biology: mauritianDocuments?.biology || {},
  paraclinical: mauritianDocuments?.paraclinical || {},
  medication: mauritianDocuments?.medication || {},
});
  const [completedSteps, setCompletedSteps] = useState(new Set())
  
  // Add comprehensive data states
  const [completePatientData, setCompletePatientData] = useState<any>(null)
  const [completeClinicalData, setCompleteClinicalData] = useState<any>(null)
  const [completeQuestionsData, setCompleteQuestionsData] = useState<any>(null)
  const [completeDoctorData, setCompleteDoctorData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load all data for documents auto-fill
  useEffect(() => {
    const loadAllDataForDocuments = async () => {
      try {
        console.log('📋 Loading all data for documents auto-fill')
        setIsLoadingData(true)
        
        // 1. Get all saved consultation data
        const allData = await consultationDataService.getDataForAutoFill()
        console.log('All consultation data:', allData)
        
        // 2. Get doctor data from sessionStorage first
        let doctorInfo = null
        const doctorDataStr = sessionStorage.getItem('tibokDoctorData')
        if (doctorDataStr) {
          doctorInfo = JSON.parse(doctorDataStr)
          console.log('Doctor data from session:', doctorInfo)
        }
        
        // 3. Get current consultation ID
        const consultationId = consultationDataService.getCurrentConsultationId()
        
        // 4. Get complete patient data including address and phone from DB
        let fullPatientData = allData?.patientData || patientData || {}
        
        if (consultationId) {
          const { data: consultation } = await supabase
            .from('consultations')
            .select('patient_id, doctor_id, patient_height, patient_weight')
            .eq('id', consultationId)
            .single()
          
          // Get doctor data if not already loaded and consultation has doctor_id
          if (!doctorInfo && consultation?.doctor_id) {
            const { data: doctor } = await supabase
              .from('doctors')
              .select('*')
              .eq('id', consultation.doctor_id)
              .single()
            
            if (doctor) {
              doctorInfo = doctor
              console.log('Doctor data from DB:', doctor)
            }
          }
          
          // Get complete patient data if consultation has patient_id
          if (consultation?.patient_id) {
            const { data: dbPatient } = await supabase
              .from('patients')
              .select('*')
              .eq('id', consultation.patient_id)
              .single()
            
            if (dbPatient) {
              // Merge database patient data with existing data
              // Priority: consultation form data > database data > default data
              fullPatientData = {
                // Basic info - prioritize form data
                firstName: fullPatientData.firstName || dbPatient.first_name || '',
                lastName: fullPatientData.lastName || dbPatient.last_name || '',
                birthDate: fullPatientData.birthDate || dbPatient.date_of_birth || '',
                age: fullPatientData.age || calculateAge(dbPatient.date_of_birth) || '',
                gender: fullPatientData.gender || [mapGender(dbPatient.gender)] || [],
                
                // Physical measurements - prioritize consultation data (most recent)
                height: consultation.patient_height || fullPatientData.height || dbPatient.height || '',
                weight: consultation.patient_weight || fullPatientData.weight || dbPatient.weight || '',
                
                // Contact info - IMPORTANT: Get from database as form doesn't collect these
                address: dbPatient.address || fullPatientData.address || '',
                phone: dbPatient.phone_number || fullPatientData.phone || '',
                phoneNumber: dbPatient.phone_number || fullPatientData.phoneNumber || '',
                email: dbPatient.email || fullPatientData.email || '',
                
                // Location info
                city: dbPatient.city || fullPatientData.city || '',
                country: dbPatient.country || fullPatientData.country || 'Maurice',
                
                // Medical info - prioritize form data
                allergies: fullPatientData.allergies || [],
                medicalHistory: fullPatientData.medicalHistory || [],
                currentMedicationsText: fullPatientData.currentMedicationsText || '',
                lifeHabits: fullPatientData.lifeHabits || {},
                
                // ID info from database
                idNumber: dbPatient.id_number || fullPatientData.idNumber || '',
                
                // Additional fields that might be useful
                otherAllergies: fullPatientData.otherAllergies || '',
                otherMedicalHistory: fullPatientData.otherMedicalHistory || ''
              }
              
              console.log('Enhanced patient data:', fullPatientData)
            }
          }
        }
        
        // 5. Set all the data
        setCompletePatientData(fullPatientData)
        setCompleteClinicalData(allData?.clinicalData || {})
        setCompleteQuestionsData(allData?.questionsData || {})
        setCompleteDoctorData(doctorInfo)
        
      } catch (error) {
        console.error('Error loading complete data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    loadAllDataForDocuments()
  }, [patientData])

  // Helper function to calculate age from birth date
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return ''
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age.toString()
  }

  // Helper function to map gender values
  const mapGender = (gender: string) => {
    if (!gender) return ''
    const genderLower = gender.toLowerCase()
    if (genderLower === 'm' || genderLower === 'male' || genderLower === 'masculin') {
      return 'Masculin'
    } else if (genderLower === 'f' || genderLower === 'female' || genderLower === 'féminin') {
      return 'Féminin'
    }
    return gender
  }

  // Debug log to track received props
  useEffect(() => {
    console.log('DocumentsWorkflow received props:', {
      mauritianDocuments,
      diagnosisData,
      patientData
    })
  }, [mauritianDocuments, diagnosisData, patientData])

  // Update editedDocuments when mauritianDocuments changes
  useEffect(() => {
    if (mauritianDocuments) {
      setEditedDocuments({
        consultation: mauritianDocuments.consultation || {},
        biology: mauritianDocuments.biology || {},
        paraclinical: mauritianDocuments.paraclinical || {},
        medication: mauritianDocuments.medication || {}
      })
    }
  }, [mauritianDocuments])

  const steps = [
    {
      id: 'consultation',
      title: 'Compte-rendu Consultation',
      icon: FileText,
      color: 'from-blue-600 to-emerald-600',
      bgColor: 'from-blue-50 to-emerald-50',
      description: 'Anamnèse, examen physique, diagnostic'
    },
    {
      id: 'biology',
      title: 'Examens Biologiques', 
      icon: TestTube,
      color: 'from-red-600 to-orange-600',
      bgColor: 'from-red-50 to-orange-50',
      description: 'NFS, CRP, biochimie, sérologies'
    },
    {
      id: 'paraclinical', 
      title: 'Examens Paracliniques',
      icon: Stethoscope,
      color: 'from-green-600 to-teal-600',
      bgColor: 'from-green-50 to-teal-50',
      description: 'Imagerie, échographie, explorations'
    },
    {
      id: 'medication',
      title: 'Ordonnance Médicaments',
      icon: Pill,
      color: 'from-purple-600 to-pink-600', 
      bgColor: 'from-purple-50 to-pink-50',
      description: 'Prescriptions sécurisées, conseils'
    }
  ]

  const handleSaveDocument = (docType, updatedData) => {
    setEditedDocuments(prev => ({
      ...prev,
      [docType]: updatedData
    }))
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    console.log(`✅ ${docType} sauvegardé:`, updatedData)
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    console.log('🎯 Documents finaux:', editedDocuments)
    onComplete && onComplete(editedDocuments)
  }

  const patientName = `${completePatientData?.firstName || patientData?.firstName || 'Patient'} ${completePatientData?.lastName || patientData?.lastName || 'X'}`
  const progressPercentage = ((completedSteps.size / steps.length) * 100)

  // Loading state while fetching data
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vue d'ensemble si pas d'étape spécifique sélectionnée
  if (currentStep === -1) {
    return (
      <div className="space-y-6">
        {/* Header principal */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-gray-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <FileText className="h-8 w-8" />
              Documents Mauriciens - Vue d'ensemble
            </CardTitle>
            <div className="flex justify-between items-center mt-4">
              <div>
                <p className="text-slate-200">Patient: {patientName}</p>
                <p className="text-slate-300 text-sm">Diagnostic: {diagnosisData?.primary?.condition}</p>
              </div>
              <div className="text-right">
                <div className="text-slate-200">Progression</div>
                <div className="text-2xl font-bold">{completedSteps.size}/{steps.length}</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress global */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Édition des documents</span>
                <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <p className="text-sm text-gray-600">
              {completedSteps.size === 0 ? 'Commencez par éditer le premier document' :
               completedSteps.size === steps.length ? 'Tous les documents sont prêts !' :
               `${steps.length - completedSteps.size} document(s) restant(s)`}
            </p>
          </CardContent>
        </Card>

        {/* Grille des documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <Card key={step.id} className={`bg-gradient-to-br ${step.bgColor} border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer`}
              onClick={() => setCurrentStep(index)}>
              <CardHeader className={`bg-gradient-to-r ${step.color} text-white`}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <step.icon className="h-6 w-6" />
                    {step.title}
                  </div>
                  {completedSteps.has(index) && (
                    <CheckCircle className="h-6 w-6 text-green-200" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">{step.description}</p>
                <div className="flex justify-between items-center">
                  <Badge variant={completedSteps.has(index) ? "default" : "outline"}>
                    {completedSteps.has(index) ? "Complété" : "À éditer"}
                  </Badge>
                  <Button variant="outline" size="sm">
                    {completedSteps.has(index) ? "Modifier" : "Éditer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="px-6 py-3 shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {onBack ? 'Retour Étape Précédente' : 'Retour Diagnostic'}
          </Button>

          <div className="flex gap-3">
            {completedSteps.size > 0 && (
              <>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu Global
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </>
            )}
            
            {completedSteps.size === steps.length && (
              <Button 
                onClick={handleComplete}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 shadow-lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Finaliser Dossier
              </Button>
            )}
          </div>
          
          {completedSteps.size === 0 && (
            <Button 
              onClick={() => setCurrentStep(0)}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-3 shadow-lg"
            >
              Commencer l'Édition
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Rendu des composants d'édition spécifiques
  const currentStepData = steps[currentStep]
  
  // Header pour toutes les étapes
  const StepHeader = () => (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-6">
      <CardHeader className={`bg-gradient-to-r ${currentStepData.color} text-white rounded-t-lg`}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <currentStepData.icon className="h-8 w-8" />
            {currentStepData.title}
            <Badge className="bg-white/20 text-white">
              Étape {currentStep + 1}/4
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(-1)}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            Vue d'ensemble
          </Button>
        </CardTitle>
        <div className="mt-4">
          <Progress 
            value={((currentStep + 1) / steps.length) * 100} 
            className="h-2 bg-white/20"
          />
        </div>
      </CardHeader>
    </Card>
  )

  // Navigation par onglets
  const TabNavigation = () => (
    <div className="flex flex-wrap gap-2 justify-center mb-6">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => setCurrentStep(index)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
            currentStep === index
              ? `bg-gradient-to-r ${step.color} text-white shadow-lg`
              : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
          }`}
        >
          <step.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{step.title}</span>
          {completedSteps.has(index) && (
            <CheckCircle className="h-4 w-4" />
          )}
        </button>
      ))}
    </div>
  )

  // Rendu selon l'étape courante
  return (
    <div className="space-y-6">
      <StepHeader />
      <TabNavigation />

      {/* Contenu de l'étape courante */}
      {currentStep === 0 && (
        <ConsultationEditor
          consultationData={editedDocuments.consultation}
          onSave={handleSaveDocument}
          onNext={handleNext}
          onPrevious={() => setCurrentStep(-1)}
          patientName={patientName}
          patientData={completePatientData}
          clinicalData={completeClinicalData}
          questionsData={completeQuestionsData}
          diagnosisData={diagnosisData}
          doctorData={completeDoctorData}
          mauritianDocuments={mauritianDocuments}
        />
      )}

      {currentStep === 1 && (
        <BiologyEditor
          biologyData={editedDocuments.biology}
          onSave={handleSaveDocument}
          onNext={handleNext}
          onPrevious={handlePrevious}
          patientName={patientName}
          patientData={completePatientData}
          diagnosisData={diagnosisData}
          doctorData={completeDoctorData}
        />
      )}

      {currentStep === 2 && (
        <ParaclinicalEditor
          paraclinicalData={editedDocuments.paraclinical}
          onSave={handleSaveDocument}
          onNext={handleNext}
          onPrevious={handlePrevious}
          patientName={patientName}
          patientData={completePatientData}
          diagnosisData={diagnosisData}
          doctorData={completeDoctorData}
        />
      )}

      {currentStep === 3 && (
        <MedicationEditor
          medicationData={editedDocuments.medication}
          onSave={handleSaveDocument}
          onNext={() => setCurrentStep(-1)}
          onPrevious={handlePrevious}
          patientName={patientName}
          patientAge={completePatientData?.age || patientData?.age || 30}
          patientAllergies={(completePatientData?.allergies || patientData?.allergies || []).join(', ') || 'Aucune'}
          patientData={completePatientData}
          diagnosisData={diagnosisData}
          doctorData={completeDoctorData}
        />
      )}
    </div>
  )
}
