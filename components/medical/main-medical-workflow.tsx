// components/medical/main-medical-workflow.tsx

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
  ArrowLeft,
  AlertTriangle
} from "lucide-react"

// Import du DocumentsWorkflow adapté
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
  const [currentPhase, setCurrentPhase] = useState('documents')
  const [consultationReport, setConsultationReport] = useState<any>(null)
  const [finalDocuments, setFinalDocuments] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ Load existing consultation report on mount
  useEffect(() => {
    const loadExistingReport = async () => {
      try {
        setIsLoading(true)
        
        // 1. Check if we have a consultation report already
        const allData = await consultationDataService.getAllData()
        console.log('MedicalWorkflow - Loaded data:', allData)
        
        if (allData?.consultationReport) {
          console.log('✅ Found existing consultation report')
          setConsultationReport(allData.consultationReport)
        } else {
          console.log('⚠️ No consultation report found, need to generate one')
          
          // If we have all the necessary data, try to generate the report
          if (patientData && clinicalData && diagnosisData) {
            await generateConsultationReport()
          } else {
            setError('Données insuffisantes pour générer le rapport de consultation')
          }
        }
        
        // Load existing final documents if any
        if (allData?.workflowResult) {
          setFinalDocuments(allData.workflowResult)
        }
        
      } catch (error) {
        console.error('Error loading existing report:', error)
        setError('Erreur lors du chargement du rapport existant')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadExistingReport()
  }, [patientData, clinicalData, diagnosisData])

  // ✅ Generate consultation report if needed
  const generateConsultationReport = async () => {
    try {
      console.log('🚀 Generating consultation report...')
      
      const response = await fetch('/api/generate-consultation-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
          diagnosisData,
        }),
      })

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Consultation report generated:', result)

      if (result.success && result.data) {
        setConsultationReport(result.data)
        
        // Save the generated report
        await consultationDataService.saveConsultationReport(result.data)
        console.log('💾 Report saved to consultation service')
      } else {
        throw new Error(result.error || 'Échec génération du rapport')
      }

    } catch (error) {
      console.error('❌ Error generating consultation report:', error)
      setError(`Erreur génération rapport: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  // ✅ Initialize consultation when component mounts
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

  // ✅ Callback when documents workflow is completed
  const handleDocumentsComplete = async (editedDocs: any) => {
    console.log('✅ Documents finalisés:', editedDocs)
    setFinalDocuments(editedDocs)
    
    try {
      // Save the final documents
      await consultationDataService.saveStepData(4, {
        type: 'documents_workflow_complete',
        documents: editedDocs,
        consultationReport,
        completedAt: new Date().toISOString()
      })
      
      console.log('💾 Final documents saved')
    } catch (error) {
      console.error('Error saving workflow documents:', error)
    }
    
    // Mark workflow as completed
    setCurrentPhase('completed')
    
    // Call parent completion handler
    if (onComplete) {
      onComplete({
        documents: editedDocs,
        consultationReport,
        type: 'medical_workflow_complete'
      })
    }
  }

  // ✅ Handle back to previous step
  const handleBackToDiagnosis = () => {
    if (onBack) {
      onBack()
    }
  }

  const patientName = `${patientData?.firstName || 'Patient'} ${patientData?.lastName || 'X'}`

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600">Chargement du rapport de consultation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ Error state
  if (error && !consultationReport) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-50 border border-red-200">
          <CardHeader className="bg-red-100">
            <CardTitle className="flex items-center gap-3 text-red-800">
              <AlertTriangle className="h-6 w-6" />
              Erreur du Workflow Médical
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBackToDiagnosis}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour Diagnostic
              </Button>
              <Button onClick={generateConsultationReport}>
                Réessayer Génération
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ Main phase: Documents editing
  if (currentPhase === 'documents') {
    return (
      <div className="space-y-6">
        {/* Header info */}
        <Card className="bg-blue-50 border border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800">Workflow Documents Mauriciens</p>
                  <p className="text-sm text-blue-600">Patient: {patientName}</p>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white">
                Étape 4/4 - Documents
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Documents workflow */}
        <DocumentsWorkflow
          consultationReport={consultationReport}
          diagnosisData={diagnosisData}
          patientData={patientData}
          clinicalData={clinicalData}
          questionsData={questionsData}
          onBack={handleBackToDiagnosis}
          onComplete={handleDocumentsComplete}
        />
      </div>
    )
  }

  // ✅ Completion phase
  if (currentPhase === 'completed') {
    return (
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <CheckCircle className="h-8 w-8" />
              Workflow Médical Complété !
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <CheckCircle className="h-24 w-24 text-green-500 mx-auto" />
              
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Documents mauriciens finalisés !</h2>
                <p className="text-gray-600">
                  Le dossier médical complet de {patientName} est prêt
                </p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">Éléments finalisés :</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Compte-rendu consultation
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Examens biologiques
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Examens paracliniques
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
                      onComplete({
                        documents: finalDocuments,
                        consultationReport,
                        type: 'workflow_complete',
                        completedAt: new Date().toISOString()
                      })
                    }
                  }}
                  className="bg-blue-600 text-white"
                >
                  🎯 Consultation Terminée
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
