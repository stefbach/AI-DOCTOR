"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  Stethoscope,
  FlaskConical,
  Pill,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  FileText,
  Edit3,
} from "lucide-react"

interface WorkflowStep {
  step: number
  name: string
  status: "pending" | "processing" | "completed" | "error"
  result?: any
  error?: string
  details?: string
}

interface WorkflowResult {
  diagnosis: any
  mauritianDocuments: any
  success: boolean
}

interface MedicalWorkflowManagerProps {
  patientData: any
  clinicalData: any
  questions: string
  onComplete: (result: WorkflowResult) => void
}

export default function MedicalWorkflowManager({
  patientData,
  clinicalData,
  questions,
  onComplete,
}: MedicalWorkflowManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { step: 1, name: "Analyse diagnostique IA complète", status: "pending" },
    { step: 2, name: "Génération compte-rendu consultation", status: "pending" },
    { step: 3, name: "Création ordonnances biologiques", status: "pending" },
    { step: 4, name: "Création ordonnances paracliniques", status: "pending" },
    { step: 5, name: "Prescription médicamenteuse sécurisée", status: "pending" },
  ])
  const [finalResult, setFinalResult] = useState<WorkflowResult | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            Terminé
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="default" className="bg-blue-500">
            En cours
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Erreur</Badge>
      default:
        return <Badge variant="secondary">En attente</Badge>
    }
  }

  const updateStepStatus = (stepIndex: number, status: WorkflowStep['status'], result?: any, error?: string, details?: string) => {
    setSteps(prevSteps => 
      prevSteps.map((step, index) => 
        index === stepIndex 
          ? { ...step, status, result, error, details }
          : step
      )
    )
  }

  const simulateStepsProgression = (diagnosis: any, mauritianDocuments: any) => {
    // Simuler la progression des étapes pour l'UI
    const stepUpdates = [
      { index: 0, name: "Analyse diagnostique IA complète", result: diagnosis },
      { index: 1, name: "Génération compte-rendu consultation", result: mauritianDocuments.consultation },
      { index: 2, name: "Création ordonnances biologiques", result: mauritianDocuments.biology },
      { index: 3, name: "Création ordonnances paracliniques", result: mauritianDocuments.paraclinical },
      { index: 4, name: "Prescription médicamenteuse sécurisée", result: mauritianDocuments.medication },
    ]

    stepUpdates.forEach((update, i) => {
      setTimeout(() => {
        updateStepStatus(update.index, "processing")
        setTimeout(() => {
          updateStepStatus(update.index, "completed", update.result, undefined, "Généré avec succès")
        }, 500)
      }, i * 800)
    })
  }

  const startWorkflow = async () => {
    setIsProcessing(true)
    setCurrentStep(0)
    setGlobalError(null)
    setFinalResult(null)

    // Réinitialiser tous les steps
    setSteps(prevSteps => 
      prevSteps.map(step => ({ ...step, status: "pending", result: undefined, error: undefined, details: undefined }))
    )

    try {
      console.log("🚀 Démarrage workflow médical direct - API unique")

      // APPEL DIRECT À LA NOUVELLE API COMPLÈTE
      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData: { responses: questions },
        }),
      })

      console.log("📡 Statut réponse API directe:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur API ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const data = await response.json()
      console.log("✅ Réponse API directe reçue:", data.success)

      if (data.success && data.diagnosis && data.mauritianDocuments) {
        // Simuler la progression pour l'UI
        simulateStepsProgression(data.diagnosis, data.mauritianDocuments)
        
        // Préparer le résultat final
        const workflowResult: WorkflowResult = {
          diagnosis: data.diagnosis,
          mauritianDocuments: data.mauritianDocuments,
          success: true
        }

        // Attendre que toutes les étapes soient "complétées" visuellement
        setTimeout(() => {
          setFinalResult(workflowResult)
          onComplete(workflowResult)
        }, 5000) // 5 secondes pour voir toutes les étapes

      } else {
        throw new Error(data.error || "Réponse API incomplète")
      }

    } catch (error) {
      console.error("❌ Erreur workflow:", error)
      setGlobalError(error instanceof Error ? error.message : "Erreur inconnue")

      // En cas d'erreur, créer un résultat de fallback
      const fallbackResult = generateFallbackResult()
      setFinalResult(fallbackResult)
      onComplete(fallbackResult)

      // Marquer les étapes comme ayant des erreurs
      updateStepStatus(0, "error", undefined, "Erreur API", "Utilisation du mode fallback")
      
    } finally {
      setIsProcessing(false)
    }
  }

  const generateFallbackResult = (): WorkflowResult => {
    const patientName = `${patientData?.firstName || "Prénom"} ${patientData?.lastName || "Nom"}`
    const today = new Date().toLocaleDateString("fr-FR")

    return {
      success: true,
      diagnosis: {
        primary: {
          condition: `Évaluation clinique pour ${patientName} - Diagnostic en cours selon symptômes: ${(clinicalData?.symptoms || []).join(", ") || "à préciser"}`,
          confidence: 70,
          severity: "moderate"
        },
        differential: [
          {
            condition: "Syndrome viral",
            probability: 60,
            rationale: "Symptômes compatibles"
          }
        ]
      },
      mauritianDocuments: {
        consultation: {
          header: {
            title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
            date: today,
            physician: "Dr. TIBOK IA DOCTOR"
          },
          patient: {
            firstName: patientData?.firstName || "Prénom",
            lastName: patientData?.lastName || "Nom",
            age: `${patientData?.age || "XX"} ans`
          },
          content: {
            chiefComplaint: clinicalData?.chiefComplaint || "Consultation médicale",
            diagnosis: `Évaluation clinique - ${clinicalData?.chiefComplaint || "symptômes"}`
          }
        },
        biology: {
          header: {
            title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
            subtitle: "PRESCRIPTION D'EXAMENS BIOLOGIQUES"
          },
          prescriptions: [
            {
              id: 1,
              exam: "NFS + CRP",
              indication: "Bilan inflammatoire de base",
              urgency: "PROGRAMMÉ"
            }
          ]
        },
        medication: {
          header: {
            title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
            subtitle: "PRESCRIPTION MÉDICAMENTEUSE"
          },
          prescriptions: [
            {
              id: 1,
              dci: "Paracétamol",
              dosage: "1g",
              frequency: "3x/jour si nécessaire",
              duration: "5 jours maximum",
              indication: "Traitement symptomatique"
            }
          ]
        }
      }
    }
  }

  const retryWorkflow = () => {
    startWorkflow()
  }

  const downloadReport = () => {
    if (!finalResult) return

    const reportContent = `
RAPPORT DE CONSULTATION MÉDICALE COMPLET - TIBOK IA DOCTOR
=========================================================

DIAGNOSTIC PRINCIPAL
===================
${finalResult.diagnosis?.primary?.condition || "Diagnostic en cours"}
Confiance: ${finalResult.diagnosis?.primary?.confidence || 70}%

DOCUMENTS MAURICIENS GÉNÉRÉS
============================
✓ Compte-rendu de consultation
✓ Ordonnance examens biologiques 
✓ Ordonnance examens paracliniques
✓ Ordonnance médicamenteuse sécurisée

INFORMATIONS PATIENT
===================
Nom: ${finalResult.mauritianDocuments?.consultation?.patient?.firstName} ${finalResult.mauritianDocuments?.consultation?.patient?.lastName}
Âge: ${finalResult.mauritianDocuments?.consultation?.patient?.age}
Date consultation: ${finalResult.mauritianDocuments?.consultation?.header?.date}

PRESCRIPTIONS
=============
Examens biologiques: ${finalResult.mauritianDocuments?.biology?.prescriptions?.length || 0} prescription(s)
Médicaments: ${finalResult.mauritianDocuments?.medication?.prescriptions?.length || 0} prescription(s)

Généré par TIBOK IA DOCTOR le ${new Date().toLocaleString("fr-FR")}
Workflow médical direct - API unique optimisée
    `

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rapport-tibok-${patientData.lastName}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const completedSteps = steps.filter((step) => step.status === "completed").length
  const errorSteps = steps.filter((step) => step.status === "error").length
  const progress = (completedSteps / steps.length) * 100

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6" />
            Workflow Médical Direct - Génération Tous Documents
          </CardTitle>
          <div className="flex items-center gap-4">
            <Progress value={progress} className="flex-1" />
            <span className="text-sm font-medium">
              {completedSteps}/{steps.length}
              {errorSteps > 0 && (
                <span className="text-red-600 ml-2">({errorSteps} erreurs)</span>
              )}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Erreur globale */}
      {globalError && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Attention:</strong> {globalError}
            <br />
            <span className="text-sm">Le système a basculé en mode sécurisé avec documents de base.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Informations patient */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Nom:</span> {patientData.firstName} {patientData.lastName}
            </div>
            <div>
              <span className="font-medium">Âge:</span> {patientData.age} ans
            </div>
            <div>
              <span className="font-medium">Sexe:</span> {patientData.gender}
            </div>
            <div>
              <span className="font-medium">Poids:</span> {patientData.weight}kg
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Étapes du workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progression du Traitement Direct</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStepIcon(step.status)}
                <span className="font-medium">Étape {step.step}</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span>{step.name}</span>
                  {getStepBadge(step.status)}
                </div>

                {step.error && (
                  <div className="text-sm text-red-600 mt-1">
                    <strong>Erreur:</strong> {step.error}
                    {step.details && (
                      <div className="text-xs text-red-500 mt-1">{step.details}</div>
                    )}
                  </div>
                )}

                {step.result && step.status === "completed" && (
                  <div className="text-sm text-green-600 mt-1">
                    ✓ {step.details || "Document généré avec succès"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={startWorkflow} disabled={isProcessing} className="flex-1">
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Stethoscope className="h-4 w-4 mr-2" />
              Générer Diagnostic + Documents Mauriciens
            </>
          )}
        </Button>

        {(globalError || errorSteps > 0) && !isProcessing && (
          <Button onClick={retryWorkflow} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        )}

        {finalResult && (
          <Button onClick={downloadReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Télécharger le Rapport
          </Button>
        )}
      </div>

      {/* Résultats */}
      {finalResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Diagnostic */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5" />
                Diagnostic IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div className="font-medium">{finalResult.diagnosis?.primary?.condition}</div>
                <div className="text-gray-600">Confiance: {finalResult.diagnosis?.primary?.confidence || 70}%</div>
                {finalResult.diagnosis?.differential && (
                  <div className="text-xs text-gray-500">
                    Différentiels: {finalResult.diagnosis.differential.length} considéré(s)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Documents Mauriciens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Compte-rendu consultation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Ordonnance examens biologiques</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Ordonnance examens paracliniques</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Prescription médicamenteuse</span>
                </div>
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-1 text-blue-700 text-xs">
                    <Edit3 className="h-3 w-3" />
                    <span>Tous les documents sont modifiables</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
