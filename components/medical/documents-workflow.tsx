// src/components/medical/documents-workflow.tsx

"use client"

import { useState } from "react"
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
  const [currentStep, setCurrentStep] = useState(0)
  const [editedDocuments, setEditedDocuments] = useState({
    consultation: mauritianDocuments?.consultation || {},
    biology: mauritianDocuments?.biology || {},
    paraclinical: mauritianDocuments?.paraclinical || {},
    medication: mauritianDocuments?.medication || {}
  })
  const [completedSteps, setCompletedSteps] = useState(new Set())

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

  const patientName = `${patientData?.firstName || 'Patient'} ${patientData?.lastName || 'X'}`
  const progressPercentage = ((completedSteps.size / steps.length) * 100)

  // Vue d'ensemble si pas d'étape spécifique sélectionnée
  if (currentStep === -1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
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
          />
        )}

        {currentStep === 1 && (
          <BiologyEditor
            biologyData={editedDocuments.biology}
            onSave={handleSaveDocument}
            onNext={handleNext}
            onPrevious={handlePrevious}
            patientName={patientName}
          />
        )}

        {currentStep === 2 && (
          <ParaclinicalEditor
            paraclinicalData={editedDocuments.paraclinical}
            onSave={handleSaveDocument}
            onNext={handleNext}
            onPrevious={handlePrevious}
            patientName={patientName}
          />
        )}

        {currentStep === 3 && (
          <MedicationEditor
            medicationData={editedDocuments.medication}
            onSave={handleSaveDocument}
            onNext={() => setCurrentStep(-1)}
            onPrevious={handlePrevious}
            patientName={patientName}
            patientAge={patientData?.age || 30}
            patientAllergies={(patientData?.allergies || []).join(', ') || 'Aucune'}
          />
        )}
      </div>
    </div>
  )
}
