// INTEGRATION_ASSISTANT_EXAMPLE.tsx
// Exemple complet d'intégration de l'Assistant AI dans un rapport médical
// avec modifications en temps réel du document

"use client"

import { useState, useEffect } from "react"
import MedicalReportChatAssistant from "@/components/medical-report-chat-assistant"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { 
  FileText, 
  Save, 
  Download, 
  CheckCircle2,
  AlertCircle,
  Pill,
  FlaskConical,
  Scan
} from "lucide-react"

// ==================== EXAMPLE INTEGRATION ====================
export default function DermatologyReportWithAssistant() {
  // État du rapport médical
  const [reportData, setReportData] = useState({
    patientInfo: {
      firstName: "Jean",
      lastName: "Dupont",
      age: 45,
      gender: "M",
      pregnancyStatus: "not_applicable"
    },
    diagnosis: {
      primary: "Melanoma malin - Stade I",
      confidence: "High",
      differentials: ["Dysplastic Nevus", "Seborrheic Keratosis"],
      pathophysiology: "Transformation maligne des mélanocytes avec critères ABCDE positifs...",
    },
    narrativeContent: {
      chiefComplaint: "Lésion pigmentée évolutive avant-bras droit",
      historyOfPresentIllness: "Patient consulte pour lésion pigmentée apparue il y a 6 mois...",
      physicalExamination: "Macule pigmentée 8mm, asymétrique, bordures irrégulières...",
      diagnosticSynthesis: "Lésion suspecte selon critères ABCDE (score 5/5)...",
      diagnosticConclusion: "Melanoma malin probable - Biopsie excisionnelle urgente requise",
      managementPlan: "Biopsie excisionnelle + marges 2mm + mapping ganglionnaire sentinelle...",
      followUpPlan: "Révision post-biopsie 7 jours + résultats anatomopathologie 14 jours..."
    },
    medications: [
      {
        name: "Hydrocortisone 1% Cream",
        dci: "Hydrocortisone",
        dosage: "1%",
        frequency: "BD",
        duration: "7 days",
        route: "Topical",
        indication: "Inflammation locale péri-lésionnelle",
        instructions: "Apply thin layer to affected area after cleansing"
      }
    ],
    labTests: [
      {
        name: "Skin Biopsy - Excisional",
        category: "Dermatology",
        urgent: true,
        indication: "Confirmation histologique melanoma",
        clinical_information: "Lésion suspecte ABCDE 5/5"
      }
    ],
    imagingStudies: []
  })

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [modificationLog, setModificationLog] = useState<any[]>([])

  // Préparer le contexte pour l'assistant
  const reportContext = {
    patientInfo: reportData.patientInfo,
    diagnosis: reportData.diagnosis,
    medications: reportData.medications,
    labTests: reportData.labTests,
    imagingStudies: reportData.imagingStudies,
    narrativeContent: reportData.narrativeContent,
    consultationType: 'dermatology' as const
  }

  // ==================== HANDLER: APPLIQUER LES ACTIONS DE L'ASSISTANT ====================
  const handleApplyAction = (action: any) => {
    console.log('🔧 Applying action:', action)
    
    const timestamp = new Date().toISOString()
    let modification: any = {
      timestamp,
      action: action.type,
      target: action.target,
      explanation: action.explanation
    }

    try {
      switch (action.type) {
        case 'add':
          handleAddItem(action, modification)
          break
        
        case 'modify':
          handleModifyItem(action, modification)
          break
        
        case 'delete':
          handleDeleteItem(action, modification)
          break
        
        case 'suggest':
          handleSuggestions(action, modification)
          break
        
        case 'clarify':
          handleValidation(action, modification)
          break
        
        default:
          console.log('Unknown action type:', action.type)
      }

      // Log la modification
      setModificationLog(prev => [...prev, modification])
      setHasUnsavedChanges(true)

      toast({
        title: "✅ Modification appliquée",
        description: action.explanation || "Le rapport a été mis à jour"
      })

    } catch (error: any) {
      console.error('Error applying action:', error)
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  // ==================== ADD ITEM ====================
  const handleAddItem = (action: any, modification: any) => {
    const { target, data } = action

    if (target === 'medication') {
      setReportData(prev => ({
        ...prev,
        medications: [...prev.medications, data]
      }))
      modification.details = `Médicament ajouté: ${data.name}`
    }
    else if (target === 'lab_test') {
      setReportData(prev => ({
        ...prev,
        labTests: [...prev.labTests, data]
      }))
      modification.details = `Examen ajouté: ${data.name}`
    }
    else if (target === 'imaging') {
      setReportData(prev => ({
        ...prev,
        imagingStudies: [...prev.imagingStudies, data]
      }))
      modification.details = `Imagerie ajoutée: ${data.type || data.name}`
    }
  }

  // ==================== MODIFY ITEM ====================
  const handleModifyItem = (action: any, modification: any) => {
    const { target, data } = action

    if (target === 'medication') {
      setReportData(prev => {
        const updated = [...prev.medications]
        if (data.index !== undefined) {
          // Modifier médicament existant
          updated[data.index] = {
            ...updated[data.index],
            ...data.changes
          }
          modification.details = `Médicament modifié: ${updated[data.index].name}`
        }
        return { ...prev, medications: updated }
      })
    }
    else if (target === 'lab_test') {
      setReportData(prev => {
        const updated = [...prev.labTests]
        if (data.index !== undefined) {
          updated[data.index] = {
            ...updated[data.index],
            ...data.changes
          }
          modification.details = `Examen modifié: ${updated[data.index].name}`
        }
        return { ...prev, labTests: updated }
      })
    }
    else if (target === 'narrative') {
      // Modifier section narrative
      setReportData(prev => ({
        ...prev,
        narrativeContent: {
          ...prev.narrativeContent,
          [data.section]: data.content
        }
      }))
      modification.details = `Section modifiée: ${data.section}`
    }
    else if (target === 'diagnosis') {
      // Modifier diagnostic
      if (data.proposed) {
        setReportData(prev => ({
          ...prev,
          diagnosis: {
            ...prev.diagnosis,
            primary: data.proposed,
            confidence: data.confidence || prev.diagnosis.confidence,
            differentials: data.differentials || prev.diagnosis.differentials
          }
        }))
        modification.details = `Diagnostic modifié: ${data.current} → ${data.proposed}`
      }
    }
  }

  // ==================== DELETE ITEM ====================
  const handleDeleteItem = (action: any, modification: any) => {
    const { target, data } = action

    if (target === 'medication') {
      setReportData(prev => {
        const deleted = prev.medications[data.index]
        modification.details = `Médicament supprimé: ${deleted?.name}`
        return {
          ...prev,
          medications: prev.medications.filter((_, i) => i !== data.index)
        }
      })
    }
    else if (target === 'lab_test') {
      setReportData(prev => {
        const deleted = prev.labTests[data.index]
        modification.details = `Examen supprimé: ${deleted?.name}`
        return {
          ...prev,
          labTests: prev.labTests.filter((_, i) => i !== data.index)
        }
      })
    }
    else if (target === 'imaging') {
      setReportData(prev => {
        const deleted = prev.imagingStudies[data.index]
        modification.details = `Imagerie supprimée: ${deleted?.type || deleted?.name}`
        return {
          ...prev,
          imagingStudies: prev.imagingStudies.filter((_, i) => i !== data.index)
        }
      })
    }
  }

  // ==================== HANDLE SUGGESTIONS ====================
  const handleSuggestions = (action: any, modification: any) => {
    // Les suggestions ne modifient pas directement, elles sont juste affichées
    modification.details = `${action.data?.length || 0} suggestions générées`
    
    toast({
      title: "💡 Suggestions disponibles",
      description: `${action.data?.length || 0} suggestions pour améliorer le rapport`
    })
  }

  // ==================== HANDLE VALIDATION ====================
  const handleValidation = (action: any, modification: any) => {
    // Validation/challenge du docteur
    const { data } = action
    
    if (data.validation === 'reject') {
      modification.details = `Proposition rejetée: ${data.reasoning}`
      toast({
        title: "❌ Proposition rejetée",
        description: data.reasoning,
        variant: "destructive"
      })
    } else if (data.validation === 'accept') {
      modification.details = `Proposition acceptée: ${data.reasoning}`
      toast({
        title: "✅ Proposition acceptée",
        description: data.reasoning
      })
    } else {
      modification.details = `Proposition modifiée: ${data.reasoning}`
      toast({
        title: "⚠️ Accepté avec modifications",
        description: data.reasoning
      })
    }
  }

  // ==================== UPDATE REPORT ====================
  const handleUpdateReport = (updates: any) => {
    setReportData(prev => ({
      ...prev,
      ...updates
    }))
    setHasUnsavedChanges(true)
  }

  // ==================== SAVE REPORT ====================
  const handleSaveReport = async () => {
    try {
      // Sauvegarder le rapport (API call)
      console.log('💾 Saving report...', reportData)
      
      // Simuler sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setHasUnsavedChanges(false)
      toast({
        title: "✅ Rapport sauvegardé",
        description: "Toutes les modifications ont été enregistrées"
      })
    } catch (error) {
      toast({
        title: "❌ Erreur de sauvegarde",
        description: "Impossible de sauvegarder le rapport",
        variant: "destructive"
      })
    }
  }

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Rapport de Consultation - Dermatologie
            </h1>
            <p className="text-gray-600 mt-1">
              Patient: {reportData.patientInfo.firstName} {reportData.patientInfo.lastName}
            </p>
          </div>
          <div className="flex gap-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                <AlertCircle className="h-4 w-4 mr-1" />
                Modifications non sauvegardées
              </Badge>
            )}
            <Button 
              onClick={handleSaveReport}
              disabled={!hasUnsavedChanges}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Main Content: Report + Assistant side by side */}
        <div className="grid grid-cols-2 gap-6">
          
          {/* LEFT: Medical Report Preview */}
          <div className="space-y-6">
            
            {/* Diagnostic Card */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Diagnostic
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Diagnostic principal:</span>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {reportData.diagnosis.primary}
                    </p>
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      Confiance: {reportData.diagnosis.confidence}
                    </Badge>
                  </div>
                  
                  {reportData.diagnosis.differentials.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Diagnostics différentiels:</span>
                      <ul className="mt-2 space-y-1">
                        {reportData.diagnosis.differentials.map((diff, i) => (
                          <li key={i} className="text-sm text-gray-700">• {diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Medications Card */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Prescriptions ({reportData.medications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {reportData.medications.map((med, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{med.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {med.dosage} - {med.frequency} - {med.duration}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">DCI:</span> {med.dci}
                          </p>
                          {med.indication && (
                            <p className="text-xs text-gray-700 mt-2 italic">
                              {med.indication}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{med.route}</Badge>
                      </div>
                    </div>
                  ))}
                  {reportData.medications.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      Aucun médicament prescrit
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lab Tests Card */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Examens de Laboratoire ({reportData.labTests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {reportData.labTests.map((test, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{test.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{test.category}</p>
                          {test.indication && (
                            <p className="text-xs text-gray-700 mt-1 italic">{test.indication}</p>
                          )}
                        </div>
                        {test.urgent && (
                          <Badge variant="destructive">URGENT</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {reportData.labTests.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      Aucun examen prescrit
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Modification Log */}
            {modificationLog.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="bg-gray-100">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Historique des modifications ({modificationLog.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {modificationLog.map((log, i) => (
                      <div key={i} className="text-xs p-2 bg-green-50 rounded border border-green-200">
                        <span className="font-medium text-green-800">
                          {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                        </span>
                        <span className="text-gray-700 ml-2">- {log.details || log.explanation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: AI Assistant */}
          <div className="sticky top-6">
            <MedicalReportChatAssistant
              reportContext={reportContext}
              onApplyAction={handleApplyAction}
              onUpdateReport={handleUpdateReport}
              mode="assistant"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
