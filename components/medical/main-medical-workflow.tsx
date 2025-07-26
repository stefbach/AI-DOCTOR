// src/components/medical/main-medical-workflow.tsx

"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
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

// Import seulement du DocumentsWorkflow
import DocumentsWorkflow from './documents-workflow'

interface MedicalWorkflowProps {
  patientData?: any
  clinicalData?: any
  questionsData?: any
  diagnosisData?: any
  initialData?: any
  onComplete?: (data: any) => void
  onBack?: () => void
  language?: string
}

export default function MedicalWorkflow({ 
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  initialData,
  onComplete,
  onBack,
  language = 'fr'
}: MedicalWorkflowProps) {
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

  // Initialize consultation when component mounts
  useEffect(() => {
    const initConsultation = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const consultationId = urlParams.get('consultationId')
      const patientId = urlParams.get('patientId')
      const doctorId = urlParams.get('doctorId')
      
      if (consultationId && patientId && doctorId) {
        console.log('Initializing consultation with:', { consultationId, patientId, doctorId })
        await consultationDataService.initializeConsultation(consultationId, patientId, doctorId)
      }
    }
    
    initConsultation()
  }, [])

  // Callback du workflow documents
  const handleDocumentsComplete = async (editedDocs) => {
    console.log('✅ Documents finalisés:', editedDocs)
    setFinalDocuments(editedDocs)
    
    try {
      await consultationDataService.saveStepData(4, editedDocs)
    } catch (error) {
      console.error('Error saving workflow documents:', error)
    }
    
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

  // Load all saved data for auto-fill when component mounts
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const allData = await consultationDataService.getDataForAutoFill()
        
        console.log('Loading data for auto-fill:', allData)
        
        if (allData) {
          if (allData.workflowResult) {
            setFinalDocuments(allData.workflowResult)
          }
        }
      } catch (error) {
        console.error('Error loading data for auto-fill:', error)
      }
    }
    
    loadAllData()
  }, [])

  // Effet pour initialiser les données si diagnosisData arrive
  useEffect(() => {
    const generateReportIfNeeded = async () => {
      if (!diagnosisData) return;
      try {
        const res = await fetch('/api/generate-consultation-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientData,
            clinicalData,
            questionsData,
            diagnosisData,
          }),
        });

        const reportJson = await res.json();

        // Sauvegarder le rapport dans la session
        await consultationDataService.saveStepData(3, { report: reportJson });

        // Optionnel : mettre à jour localement un état ou mauritianDocuments.consultation
        // setMauritianDocuments((prev) => ({ ...prev, consultation: reportJson }));
      } catch (error) {
        console.error('Erreur lors de la génération du rapport de consultation :', error);
      }
    };

    generateReportIfNeeded();
  }, [diagnosisData, patientData, clinicalData, questionsData]);

  // Phase principale : Édition documents (toujours affichée)
  if (currentPhase === 'documents') {
    return (
      <div className="space-y-6">
        <DocumentsWorkflow
          diagnosisData={diagnosisResult || diagnosisData}
          mauritianDocuments={mauritianDocuments}
          patientData={patientData}
          onBack={handleBackToDiagnosis}
          onComplete={handleDocumentsComplete}
        />
      </div>
    )
  }

  // Phase complétée (cas rare - normalement géré par page.tsx)
  if (currentPhase === 'completed') {
    return (
      <div className="space-y-6">
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
    )
  }

  return null
}
