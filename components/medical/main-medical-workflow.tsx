// src/components/medical/main-medical-workflow.tsx

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  FileText, 
  ArrowRight,
  CheckCircle,
  User,
  Calendar
} from "lucide-react"

// Import des composants - AJUSTEZ LES CHEMINS SELON VOTRE STRUCTURE
import CompleteDiagnosisForm from './diagnosis-form'
import DocumentsWorkflow from './documents-workflow'

export default function MedicalWorkflow({ 
  patientData, 
  clinicalData, 
  questionsData 
}) {
  const [currentPhase, setCurrentPhase] = useState('diagnosis') // 'diagnosis' | 'documents' | 'completed'
  const [diagnosisResult, setDiagnosisResult] = useState(null)
  const [mauritianDocuments, setMauritianDocuments] = useState(null)
  const [finalDocuments, setFinalDocuments] = useState(null)

  const phases = [
    {
      id: 'diagnosis',
      title: 'Diagnostic IA Expert',
      icon: Brain,
      color: 'from-emerald-600 to-blue-600',
      description: 'Analyse médicale approfondie avec IA'
    },
    {
      id: 'documents', 
      title: 'Documents Mauriciens',
      icon: FileText,
      color: 'from-blue-600 to-purple-600',
      description: 'Édition des 4 documents professionnels'
    }
  ]

  // Callback du diagnostic form
  const handleDiagnosisComplete = (data) => {
    console.log('✅ Diagnostic complété:', data)
    setDiagnosisResult(data.diagnosis)
    setMauritianDocuments(data.mauritianDocuments)
  }

  // Navigation vers l'édition des documents  
  const handleGoToDocuments = () => {
    if (diagnosisResult && mauritianDocuments) {
      setCurrentPhase('documents')
    }
  }

  // Callback du workflow documents
  const handleDocumentsComplete = (editedDocs) => {
    console.log('✅ Documents finalisés:', editedDocs)
    setFinalDocuments(editedDocs)
    setCurrentPhase('completed')
  }

  // Retour au diagnostic
  const handleBackToDiagnosis = () => {
    setCurrentPhase('diagnosis')
  }

  // Retour à une étape précédente (pour le diagnostic)
  const handleDiagnosisPrevious = () => {
    // Ici vous pouvez implémenter le retour vers l'étape précédente de votre workflow
    // Par exemple, retour aux questions IA
    console.log('Retour étape précédente')
  }

  const patientName = `${patientData?.firstName || 'Patient'} ${patientData?.lastName || 'X'}`

  // Phase 1: Diagnostic IA
  if (currentPhase === 'diagnosis') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        
        {/* Header workflow */}
        <div className="bg-white/80 backdrop-blur-sm border-b shadow-sm p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h2 className="font-semibold text-gray-800">{patientName}</h2>
                    <p className="text-sm text-gray-600">{clinicalData?.chiefComplaint || 'Consultation médicale'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Progress workflow */}
                <div className="flex items-center gap-2">
                  {phases.map((phase, index) => (
                    <div key={phase.id} className="flex items-center gap-2">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        currentPhase === phase.id 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : diagnosisResult && phase.id === 'documents'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <phase.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{phase.title}</span>
                        {currentPhase === phase.id && (
                          <Badge className="bg-emerald-500 text-white text-xs">En cours</Badge>
                        )}
                        {diagnosisResult && phase.id === 'documents' && currentPhase !== 'documents' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">Prêt</Badge>
                        )}
                      </div>
                      {index < phases.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Composant diagnostic */}
        <CompleteDiagnosisForm
          patientData={patientData}
          clinicalData={clinicalData}
          questionsData={questionsData}
          onDataChange={handleDiagnosisComplete}
          onNext={handleGoToDocuments}
          onPrevious={handleDiagnosisPrevious}
        />
      </div>
    )
  }

  // Phase 2: Édition documents
  if (currentPhase === 'documents') {
    return (
      <DocumentsWorkflow
        diagnosisData={diagnosisResult}
        mauritianDocuments={mauritianDocuments}
        patientData={patientData}
        onBack={handleBackToDiagnosis}
        onComplete={handleDocumentsComplete}
      />
    )
  }

  // Phase 3: Dossier complété
  if (currentPhase === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <CheckCircle className="h-8 w-8" />
                Dossier Médical Complété !
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-6">
                <CheckCircle className="h-24 w-24 text-green-500 mx-auto" />
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Félicitations !</h2>
                  <p className="text-gray-600">
                    Le dossier médical complet de {patientName} est prêt
                  </p>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">Documents générés :</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Compte-rendu consultation
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Ordonnance examens biologiques
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Ordonnance examens paracliniques
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Ordonnance médicamenteuse
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentPhase('documents')}
                  >
                    ← Modifier Documents
                  </Button>
                  
                  <Button className="bg-green-600 text-white">
                    📥 Télécharger Dossier
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setCurrentPhase('diagnosis')
                      setDiagnosisResult(null)
                      setMauritianDocuments(null)
                      setFinalDocuments(null)
                    }}
                    variant="outline"
                  >
                    🆕 Nouveau Patient
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
