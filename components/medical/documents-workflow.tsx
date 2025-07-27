// components/medical/documents-workflow.tsx - Version avec génération automatique

"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { MauritianDocumentsGenerator } from '@/lib/mauritian-documents-generator'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
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
  User,
  RefreshCw,
  Zap,
  AlertTriangle
} from "lucide-react"

// Import des composants d'édition
import ConsultationEditor from './editors/consultation-editor'
import BiologyEditor from './editors/biology-editor' 
import ParaclinicalEditor from './editors/paraclinical-editor'
import MedicationEditor from './editors/medication-editor'

interface DocumentsWorkflowProps {
  consultationReport?: any
  diagnosisData?: any
  patientData?: any
  clinicalData?: any
  questionsData?: any
  onBack?: () => void
  onComplete?: (documents: any) => void
}

export default function DocumentsWorkflow({ 
  consultationReport,
  diagnosisData, 
  patientData,
  clinicalData,
  questionsData,
  onBack,
  onComplete 
}: DocumentsWorkflowProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(-1)
  
  // ✅ États pour les documents générés et édités
  const [generatedDocuments, setGeneratedDocuments] = useState<any>(null)
  const [editedDocuments, setEditedDocuments] = useState({
    consultation: {},
    biology: {},
    paraclinical: {},
    medication: {},
  })
  const [completedSteps, setCompletedSteps] = useState(new Set())
  
  // États des données complètes
  const [completePatientData, setCompletePatientData] = useState<any>(null)
  const [completeClinicalData, setCompleteClinicalData] = useState<any>(null)
  const [completeQuestionsData, setCompleteQuestionsData] = useState<any>(null)
  const [completeDoctorData, setCompleteDoctorData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // ✅ Load all data for documents auto-fill
  useEffect(() => {
    const loadAllDataForDocuments = async () => {
      try {
        console.log('📋 Loading all data for documents auto-fill')
        setIsLoadingData(true)
        
        // 1. Get all saved consultation data
        const allData = await consultationDataService.getAllData()
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
                
                // Additional fields
                otherAllergies: fullPatientData.otherAllergies || '',
                otherMedicalHistory: fullPatientData.otherMedicalHistory || ''
              }
              
              console.log('Enhanced patient data:', fullPatientData)
            }
          }
        }
        
        // 5. Set all the data
        setCompletePatientData(fullPatientData)
        setCompleteClinicalData(allData?.clinicalData || clinicalData || {})
        setCompleteQuestionsData(allData?.questionsData || questionsData || {})
        setCompleteDoctorData(doctorInfo)
        
        // 6. ✅ AUTO-GENERATE documents if we have all necessary data
        if (consultationReport && fullPatientData && doctorInfo && diagnosisData) {
          await generateMauritianDocuments(consultationReport, fullPatientData, doctorInfo, diagnosisData)
        }
        
      } catch (error) {
        console.error('Error loading complete data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    loadAllDataForDocuments()
  }, [patientData, clinicalData, questionsData, consultationReport, diagnosisData])

  // ✅ AUTO-GENERATE Mauritian documents
  const generateMauritianDocuments = async (
    consultationReport: any,
    patientData: any,
    doctorData: any,
    diagnosisData: any,
    forceRegenerate = false
  ) => {
    try {
      console.log('🚀 Generating Mauritian documents automatically...')
      setIsGenerating(true)

      // Check if already generated (unless forcing regeneration)
      if (generatedDocuments && !forceRegenerate) {
        console.log('✅ Documents already generated, skipping')
        return
      }

      // Prepare doctor info for generator
      const doctorInfo = {
        fullName: doctorData?.full_name || doctorData?.fullName || "Dr. MÉDECIN EXPERT",
        specialty: doctorData?.specialty || "Médecine générale",
        address: doctorData?.address || "Cabinet médical, Maurice",
        city: doctorData?.city || "Port-Louis, Maurice",
        phone: doctorData?.phone || "+230 xxx xxx xxx",
        email: doctorData?.email || "contact@cabinet.mu",
        registrationNumber: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || "Medical Council of Mauritius - Reg. No. XXXXX"
      }
console.log("🧪 Vérification des données AVANT génération :");
console.log("👤 patientData =", JSON.stringify(patientData, null, 2));
console.log("🧠 diagnosisData =", JSON.stringify(diagnosisData?.diagnosis, null, 2));
console.log("🩺 doctorInfo =", JSON.stringify(doctorInfo, null, 2));

      console.log("🚀 GÉNÉRATION MANUELLE LANCÉE");

      // ✅ Generate all 4 documents using the generator
      const mauritianDocs = MauritianDocumentsGenerator.generateMauritianDocuments(
        consultationReport,
        doctorInfo,
        patientData,
        diagnosisData
      )

      console.log('✅ Generated Mauritian documents:', mauritianDocs)

      // Set the generated documents
      setGeneratedDocuments(mauritianDocs)
      
      // Initialize edited documents with generated ones
      setEditedDocuments({
        consultation: mauritianDocs.consultation,
        biology: mauritianDocs.biology,
        paraclinical: mauritianDocs.paraclinical,
        medication: mauritianDocs.medication
      })

      // Save to consultation service
      await consultationDataService.saveConsultationReport({
        ...consultationReport,
        mauritianDocuments: mauritianDocs,
        generatedAt: new Date().toISOString()
      })

      toast({
        title: "✅ Documents générés !",
        description: "Les 4 documents mauriciens ont été générés automatiquement",
      })

    } catch (error) {
      console.error('❌ Error generating documents:', error)
      toast({
        title: "Erreur",
        description: "Échec de la génération automatique des documents",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Force regeneration of documents
  const handleRegenerateDocuments = async () => {
    if (consultationReport && completePatientData && completeDoctorData && diagnosisData) {
      await generateMauritianDocuments(
        consultationReport, 
        completePatientData, 
        completeDoctorData, 
        diagnosisData,
        true // Force regeneration
      )
    }
  }

  // Helper functions
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

  const handleSaveDocument = async (docType: string, updatedData: any) => {
    setEditedDocuments(prev => ({
      ...prev,
      [docType]: updatedData
    }))
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    
    // ✅ Sauvegarder immédiatement les changements
    try {
      const updatedDocuments = {
        ...editedDocuments,
        [docType]: updatedData
      }
      await consultationDataService.saveConsultationReport({
        ...consultationReport,
        mauritianDocuments: {
          ...generatedDocuments,
          [docType]: updatedData
        },
        editedDocuments: updatedDocuments
      })
      console.log(`✅ ${docType} sauvegardé:`, updatedData)
    } catch (error) {
      console.error('Error saving document:', error)
    }
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

  const handleComplete = async () => {
    console.log('🎯 Documents finaux:', editedDocuments)
    
    // Sauvegarder les documents finaux
    try {
      await consultationDataService.saveConsultationReport({
        ...consultationReport,
        mauritianDocuments: editedDocuments,
        finalDocuments: editedDocuments,
        completedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error saving final documents:', error)
    }
    
    onComplete && onComplete(editedDocuments)
  }

  const patientName = `${completePatientData?.firstName || patientData?.firstName || 'Patient'} ${completePatientData?.lastName || patientData?.lastName || 'X'}`
  const progressPercentage = ((completedSteps.size / steps.length) * 100)

  // Loading state while fetching data or generating
  if (isLoadingData || isGenerating) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600">
                {isGenerating ? 'Génération automatique des documents mauriciens...' : 'Chargement des données...'}
              </p>
              {isGenerating && (
                <p className="text-sm text-blue-600">
                  ⚡ Création automatique : Compte-rendu • Examens biologiques • Examens paracliniques • Ordonnance
                </p>
              )}
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
        {/* Header principal avec indicateur de génération automatique */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-gray-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <FileText className="h-8 w-8" />
              Documents Mauriciens
              {generatedDocuments && (
                <Badge className="bg-green-500 text-white ml-2">
                  <Zap className="h-4 w-4 mr-1" />
                  Générés automatiquement
                </Badge>
              )}
            </CardTitle>
            <div className="flex justify-between items-center mt-4">
              <div>
                <p className="text-slate-200">Patient: {patientName}</p>
                <p className="text-slate-300 text-sm">Diagnostic: {diagnosisData?.diagnosis?.primary?.condition || 'En cours'}</p>
                {generatedDocuments && (
                  <p className="text-green-200 text-sm">
                    ✅ 4 documents générés et prêts à éditer
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-slate-200">Progression</div>
                <div className="text-2xl font-bold">{completedSteps.size}/{steps.length}</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Bouton de régénération */}
        {generatedDocuments && (
          <Card className="bg-amber-50 border border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Documents générés automatiquement</p>
                    <p className="text-sm text-amber-700">Basés sur le diagnostic IA et les données patient</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateDocuments}
                  disabled={isGenerating}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Régénérer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              {generatedDocuments ? 
                (completedSteps.size === 0 ? 'Documents générés automatiquement - Vous pouvez les éditer si nécessaire' :
                 completedSteps.size === steps.length ? 'Tous les documents sont finalisés !' :
                 `${steps.length - completedSteps.size} document(s) à réviser`) :
                'En attente de génération automatique...'
              }
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
                  <div className="flex gap-2">
                    {generatedDocuments && (
                      <Badge className="bg-green-500 text-white text-xs">
                        Généré
                      </Badge>
                    )}
                    {completedSteps.has(index) && (
                      <CheckCircle className="h-6 w-6 text-green-200" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">{step.description}</p>
                <div className="flex justify-between items-center">
                  <Badge variant={generatedDocuments ? "default" : "outline"} className={generatedDocuments ? "bg-green-600" : ""}>
                    {generatedDocuments ? "Prêt à éditer" : "En attente"}
                  </Badge>
                  <Button variant="outline" size="sm" disabled={!generatedDocuments}>
                    {generatedDocuments ? "Éditer" : "Générer d'abord"}
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
            Retour
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
                  Télécharger PDF
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
          
          {generatedDocuments && completedSteps.size === 0 && (
            <Button 
              onClick={() => setCurrentStep(0)}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-3 shadow-lg"
            >
              Réviser Documents
            </Button>
          )}

          {!generatedDocuments && (
            <Button 
              onClick={handleRegenerateDocuments}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 shadow-lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              Générer Documents
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Rendu des composants d'édition spécifiques avec documents pré-remplis
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
            {generatedDocuments && (
              <Badge className="bg-green-500 text-white">
                <Zap className="h-4 w-4 mr-1" />
                Auto-généré
              </Badge>
            )}
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
          {generatedDocuments && (
            <Badge className="bg-green-500 text-white text-xs">Auto</Badge>
          )}
          {completedSteps.has(index) && (
            <CheckCircle className="h-4 w-4" />
          )}
        </button>
      ))}
    </div>
  )

  // Rendu selon l'étape courante avec documents pré-remplis
  return (
    <div className="space-y-6">
      <StepHeader />
      <TabNavigation />

      {/* Contenu de l'étape courante */}
      {currentStep === 0 && (
        <ConsultationEditor
          consultationData={editedDocuments.consultation}
          onSave={(data) => handleSaveDocument('consultation', data)}
          onDiscard={() => setCurrentStep(-1)}
          patientData={completePatientData}
          clinicalData={completeClinicalData}
          questionsData={completeQuestionsData}
          diagnosisData={diagnosisData}
          doctorData={completeDoctorData}
          mauritianDocuments={generatedDocuments}
        />
      )}

      {currentStep === 1 && (
        <BiologyEditor
          biologyData={editedDocuments.biology}
          onSave={(type, data) => handleSaveDocument('biology', data)}
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
          onSave={(type, data) => handleSaveDocument('paraclinical', data)}
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
          onSave={(type, data) => handleSaveDocument('medication', data)}
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
