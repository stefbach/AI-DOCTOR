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
  diagnosis: string
  examens: string
  prescription: string
  pubmedEvidence: any
  fdaVerification: any
  consultationReport: string
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
    { step: 1, name: "Analyse diagnostique IA", status: "pending" },
    { step: 2, name: "Recherche evidence PubMed", status: "pending" },
    { step: 3, name: "Génération examens paracliniques", status: "pending" },
    { step: 4, name: "Prescription médicamenteuse", status: "pending" },
    { step: 5, name: "Génération rapport final", status: "pending" },
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
      console.log("🚀 Démarrage workflow médical expert")

      const response = await fetch("/api/medical-orchestrator", {
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

      console.log("📡 Statut réponse orchestrator:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur API ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const data = await response.json()
      console.log("✅ Réponse orchestrator reçue:", data.success)

      if (data.success && data.workflow) {
        // Mise à jour des steps depuis la réponse
        setSteps(data.workflow.map((workflowStep: any) => ({
          step: workflowStep.step,
          name: workflowStep.name,
          status: workflowStep.status,
          result: workflowStep.result,
          error: workflowStep.error,
          details: workflowStep.description || workflowStep.errorDetails?.context
        })))

        if (data.finalReport) {
          setFinalResult(data.finalReport)
          onComplete(data.finalReport)
        } else {
          throw new Error("Rapport final non généré")
        }
      } else {
        throw new Error(data.error || "Workflow incomplet")
      }

    } catch (error) {
      console.error("❌ Erreur workflow:", error)
      setGlobalError(error instanceof Error ? error.message : "Erreur inconnue")

      // En cas d'erreur globale, créer un résultat de fallback
      const fallbackResult = generateFallbackResult()
      setFinalResult(fallbackResult)
      onComplete(fallbackResult)

      // Marquer au moins une étape comme complétée avec fallback
      updateStepStatus(0, "completed", fallbackResult, undefined, "Données de fallback utilisées")
      
    } finally {
      setIsProcessing(false)
    }
  }

  const generateFallbackResult = (): WorkflowResult => {
    const patientName = `${patientData?.firstName || "Prénom"} ${patientData?.lastName || "Nom"}`
    const today = new Date().toLocaleDateString("fr-FR")

    return {
      diagnosis: `Évaluation clinique pour ${patientName} - Diagnostic en cours d'analyse selon les symptômes présentés: ${(clinicalData?.symptoms || []).join(", ") || "symptômes à préciser"}. Surveillance clinique recommandée.`,
      
      examens: `Plan d'examens pour ${patientName}:
- Biologie: NFS + CRP + Ionogramme (bilan de première intention)
- Imagerie: Radiographie thoracique si indiquée
- Surveillance: Réévaluation clinique à 24-48h`,
      
      prescription: `Prescription de base pour ${patientName}:
- Paracétamol 500mg: 3 fois par jour si nécessaire, 5 jours maximum
- Surveillance: Efficacité et tolérance
- Réévaluation: Consultation si pas d'amélioration à 72h`,
      
      consultationReport: `COMPTE-RENDU DE CONSULTATION MÉDICALE

Date: ${today}
Patient: ${patientName}
Âge: ${patientData?.age || "XX"} ans

MOTIF DE CONSULTATION:
${clinicalData?.chiefComplaint || "Consultation médicale"}

SYMPTÔMES:
${(clinicalData?.symptoms || []).join(", ") || "Aucun symptôme spécifique"}

ÉVALUATION:
Analyse clinique en cours - Données collectées via système expert IA

CONDUITE À TENIR:
- Surveillance clinique
- Traitement symptomatique adapté
- Réévaluation programmée

Généré en mode sécurisé - ${new Date().toISOString()}`,
      
      pubmedEvidence: {
        articles: [],
        metadata: { source: "Fallback mode", totalResults: 0 }
      },
      
      fdaVerification: {
        success: false,
        message: "Vérification FDA non disponible en mode fallback"
      }
    }
  }

  const retryWorkflow = () => {
    startWorkflow()
  }

  const downloadReport = () => {
    if (!finalResult) return

    const reportContent = `
RAPPORT DE CONSULTATION MÉDICALE COMPLET
======================================

${finalResult.consultationReport}

DIAGNOSTIC DÉTAILLÉ
==================
${finalResult.diagnosis}

EXAMENS RECOMMANDÉS
==================
${finalResult.examens}

PRESCRIPTION
============
${finalResult.prescription}

EVIDENCE SCIENTIFIQUE
====================
Articles PubMed: ${finalResult.pubmedEvidence?.articles?.length || 0}
Vérification FDA: ${finalResult.fdaVerification?.success ? "Validée" : "Non disponible"}

Généré par TIBOK IA DOCTOR le ${new Date().toLocaleString("fr-FR")}
    `

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rapport-consultation-${patientData.lastName}-${new Date().toISOString().split("T")[0]}.txt`
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
            Workflow Médical IA - Analyse Complète
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
            <span className="text-sm">Le système a basculé en mode sécurisé avec données de fallback.</span>
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
          <CardTitle className="text-lg">Progression du Traitement</CardTitle>
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
                    ✓ Traitement terminé avec succès
                    {step.details && (
                      <div className="text-xs text-green-500 mt-1">{step.details}</div>
                    )}
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
              Traitement en cours...
            </>
          ) : (
            <>
              <Stethoscope className="h-4 w-4 mr-2" />
              Lancer l'Analyse Médicale IA
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

      {/* Résultats partiels même en cas d'erreur */}
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
              <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                {finalResult.diagnosis.substring(0, 300)}
                {finalResult.diagnosis.length > 300 && "..."}
              </div>
            </CardContent>
          </Card>

          {/* Examens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConical className="h-5 w-5" />
                Examens Recommandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                {finalResult.examens.substring(0, 300)}
                {finalResult.examens.length > 300 && "..."}
              </div>
            </CardContent>
          </Card>

          {/* Prescription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pill className="h-5 w-5" />
                Prescription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                {finalResult.prescription.substring(0, 300)}
                {finalResult.prescription.length > 300 && "..."}
              </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Evidence Scientifique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <p className="mb-2">
                  <span className="font-medium">Articles PubMed:</span>{" "}
                  {finalResult.pubmedEvidence?.articles?.length || 0}
                </p>
                <p>
                  <span className="font-medium">Vérification FDA:</span>{" "}
                  {finalResult.fdaVerification?.success ? "✓ Validé" : "⚠ Non disponible"}
                </p>
                {globalError && (
                  <Badge variant="secondary" className="mt-2">
                    Mode sécurisé activé
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
