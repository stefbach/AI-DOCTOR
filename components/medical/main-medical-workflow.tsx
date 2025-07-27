// components/medical/main-medical-workflow.tsx - Version corrigée avec génération locale

"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  Brain, 
  FileText, 
  ArrowRight,
  CheckCircle,
  User,
  Calendar,
  ArrowLeft,
  AlertTriangle,
  Eye,
  Download,
  Zap
} from "lucide-react"

// Import des composants
import DocumentsWorkflow from './documents-workflow'
import MauritianDocumentsPreview from './mauritian-documents-preview'

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
  const { toast } = useToast()
  const [currentPhase, setCurrentPhase] = useState('documents')
  const [consultationReport, setConsultationReport] = useState<any>(null)
  const [finalDocuments, setFinalDocuments] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ Generate consultation report using local generator
  const generateConsultationReportLocally = async () => {
    try {
      console.log('🚀 Generating consultation report locally...')
      
      // Ensure we have all required data
      const allData = await consultationDataService.getAllData()
      const pData = patientData || allData?.patientData
      const cData = clinicalData || allData?.clinicalData
      const qData = questionsData || allData?.questionsData
      const dData = diagnosisData || allData?.diagnosisData

      console.log('Data check:', { 
        hasPatient: !!pData, 
        hasClinical: !!cData, 
        hasQuestions: !!qData, 
        hasDiagnosis: !!dData 
      })

      if (!pData || !cData || !dData) {
        throw new Error('Données insuffisantes pour générer le rapport (patient, clinique et diagnostic requis)')
      }

      // Use the local generation method
      const result = await consultationDataService.generateConsultationReport(
        pData,
        cData,
        qData,
        dData
      )

      console.log('✅ Consultation report generated:', result)

      if (result) {
        setConsultationReport(result)
        
        // Save the generated report
        await consultationDataService.saveConsultationReport(result)
        console.log('💾 Report saved to consultation service')

        toast({
          title: "✅ Rapport généré !",
          description: "Le rapport de consultation et les documents mauriciens ont été générés automatiquement",
        })

        return result
      } else {
        throw new Error('Aucun résultat retourné par le générateur')
      }

    } catch (error) {
      console.error('❌ Error generating consultation report:', error)
      setError(`Erreur génération rapport: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      
      toast({
        title: "Erreur",
        description: "Échec de la génération automatique du rapport",
        variant: "destructive"
      })
      
      return null
    }
  }

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
          console.log('⚠️ No consultation report found, generating one locally...')
          
          // ✅ Generate using local generator
          await generateConsultationReportLocally()
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
      
      toast({
        title: "✅ Documents finalisés !",
        description: "Tous les documents mauriciens sont prêts",
      })
    } catch (error) {
      console.error('Error saving workflow documents:', error)
    }
    
    // Mark workflow as completed
    setCurrentPhase('preview')
  }

  // ✅ Handle back to previous step
  const handleBackToDiagnosis = () => {
    if (onBack) {
      onBack()
    }
  }

  // ✅ Handle preview navigation
  const handleBackToDocuments = () => {
    setCurrentPhase('documents')
  }

  const handleFinalComplete = () => {
    setCurrentPhase('completed')
    
    // Call parent completion handler
    if (onComplete) {
      onComplete({
        documents: finalDocuments,
        consultationReport,
        type: 'medical_workflow_complete',
        completedAt: new Date().toISOString()
      })
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
              <p className="text-gray-600">Génération automatique du rapport de consultation...</p>
              <p className="text-sm text-blue-600">
                ⚡ Création : Compte-rendu • Examens biologiques • Examens paracliniques • Ordonnance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ Error state with retry button
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
              <Button onClick={async () => {
                setError(null)
                setIsLoading(true)
                await generateConsultationReportLocally()
                setIsLoading(false)
              }}>
                <Zap className="h-4 w-4 mr-2" />
                Réessayer Génération
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ Documents editing phase
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
                  {consultationReport?.mauritianDocuments && (
                    <p className="text-sm text-green-600">
                      ✅ Documents auto-générés et prêts à éditer
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-blue-600 text-white">
                  Étape 4/4 - Documents
                </Badge>
                {consultationReport?.mauritianDocuments && (
                  <Badge className="bg-green-500 text-white">
                    <Zap className="h-4 w-4 mr-1" />
                    Auto-générés
                  </Badge>
                )}
              </div>
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

  // ✅ Preview phase
  if (currentPhase === 'preview') {
    return (
      <div className="space-y-6">
        {/* Header info */}
        <Card className="bg-green-50 border border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Aperçu Documents Finalisés</p>
                  <p className="text-sm text-green-600">Patient: {patientName}</p>
                  <p className="text-sm text-green-600">Tous les documents sont prêts à imprimer</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-600 text-white">
                  Documents Finalisés
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToDocuments}
                >
                  ✏️ Modifier
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents preview */}
        <MauritianDocumentsPreview
          documents={finalDocuments}
          onBack={handleBackToDocuments}
          onDownload={(docType) => {
            console.log(`Downloading ${docType}`)
            toast({
              title: "Téléchargement",
              description: `Téléchargement du document ${docType} en cours...`,
            })
          }}
          onPrint={(docType) => {
            console.log(`Printing ${docType}`)
            toast({
              title: "Impression",
              description: `Document ${docType} envoyé à l'imprimante`,
            })
          }}
        />

        {/* Final actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">
                Dossier médical complet prêt pour impression et archivage
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={handleBackToDocuments}
                >
                  ✏️ Modifier Documents
                </Button>
                
                <Button 
                  onClick={handleFinalComplete}
                  className="bg-green-600 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Consultation Terminée
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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

              {/* Résumé de la consultation */}
              <div className="bg-blue-50 p-6 rounded-lg text-left">
                <h3 className="font-semibold text-blue-800 mb-3">Résumé de la consultation :</h3>
                <div className="text-sm space-y-2">
                  <p><strong>Patient :</strong> {patientName}</p>
                  <p><strong>Diagnostic principal :</strong> {diagnosisData?.diagnosis?.primary?.condition || 'Diagnostic établi'}</p>
                  <p><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
                  <p><strong>Documents générés :</strong> 4 documents mauriciens complets</p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentPhase('preview')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Revoir Documents
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setCurrentPhase('documents')}
                >
                  ✏️ Modifier Documents
                </Button>
                
                <Button className="bg-green-600 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger Dossier
                </Button>
                
                <Button 
                  onClick={() => {
                    toast({
                      title: "✅ Consultation archivée",
                      description: "Le dossier a été sauvegardé dans la base de données",
                    })
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
                  🎯 Archiver & Terminer
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
