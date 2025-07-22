// src/components/medical/main-medical-workflow.tsx

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  FileText, 
  ArrowRight,
  CheckCircle,
  User,
  Calendar,
  ArrowLeft
} from "lucide-react"

// Import seulement du DocumentsWorkflow - PAS de DiagnosisForm
import DocumentsWorkflow from './documents-workflow'

export default function MedicalWorkflow({ 
  patientData, 
  clinicalData, 
  questionsData,
  diagnosisData, // 👈 Reçu de l'étape 3 (page.tsx)
  onComplete,   // 👈 Callback vers page.tsx
  onBack,       // 👈 Retour vers étape précédente
  language = 'fr'
}) {
  // Toujours commencer par les documents car diagnosisData est fourni
  const [currentPhase, setCurrentPhase] = useState('documents')
  const [diagnosisResult, setDiagnosisResult] = useState(diagnosisData?.diagnosis || null)
  const [mauritianDocuments, setMauritianDocuments] = useState(diagnosisData?.mauritianDocuments || null)
  const [finalDocuments, setFinalDocuments] = useState(null)

  const phases = [
    {
      id: 'documents', 
      title: 'Documents Mauriciens',
      icon: FileText,
      color: 'from-blue-600 to-purple-600',
      description: 'Édition des 4 documents professionnels'
    }
  ]

  // Callback du workflow documents
  const handleDocumentsComplete = (editedDocs) => {
    console.log('✅ Documents finalisés:', editedDocs)
    setFinalDocuments(editedDocs)
    
    // Appeler onComplete pour retourner à page.tsx
    if (onComplete) {
      onComplete(editedDocs)
    } else {
      setCurrentPhase('completed')
    }
  }

  // Retour au diagnostic (page.tsx étape 3)
  const handleBackToDiagnosis = () => {
    if (onBack) {
      onBack()
    }
  }

  const patientName = `${patientData?.firstName || 'Patient'} ${patientData?.lastName || 'X'}`

  // Effet pour initialiser les données si diagnosisData arrive
  useEffect(() => {
    if (diagnosisData) {
      setDiagnosisResult(diagnosisData.diagnosis || null)
      setMauritianDocuments(diagnosisData.mauritianDocuments || null)
    }
  }, [diagnosisData])

  // Phase principale : Édition documents (toujours affichée)
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

  // Phase complétée (cas rare - normalement géré par page.tsx)
  if (currentPhase === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <CheckCircle className="h-8 w-8" />
                Documents Mauriciens Complétés !
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-6">
                <CheckCircle className="h-24 w-24 text-green-500 mx-auto" />
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Documents édités avec succès !</h2>
                  <p className="text-gray-600">
                    Les 4 documents mauriciens de {patientName} sont finalisés
                  </p>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">Documents finalisés :</h3>
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
                      if (onComplete) {
                        onComplete(finalDocuments)
                      }
                    }}
                    className="bg-blue-600 text-white"
                  >
                    🆕 Étape Suivante
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
