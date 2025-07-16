"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"

interface WorkflowStep {
  step: number
  name: string
  status: "pending" | "processing" | "completed" | "error"
  result?: any
  error?: string
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
    { step: 4, name: "Vérification médicaments FDA/RxNorm", status: "pending" },
    { step: 5, name: "Génération rapport final", status: "pending" },
  ])
  const [finalResult, setFinalResult] = useState<WorkflowResult | null>(null)

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

  const startWorkflow = async () => {
    setIsProcessing(true)
    setCurrentStep(0)

    try {
      const response = await fetch("/api/medical-orchestrator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questions,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors du traitement")
      }

      const data = await response.json()

      if (data.success) {
        setSteps(data.workflow)
        setFinalResult(data.finalReport)
        onComplete(data.finalReport)
      } else {
        throw new Error(data.error || "Erreur inconnue")
      }
    } catch (error) {
      console.error("Erreur workflow:", error)
      const errorSteps = steps.map((step, index) => ({
        ...step,
        status: index === currentStep ? ("error" as const) : step.status,
        error: index === currentStep ? (error as Error).message : undefined,
      }))
      setSteps(errorSteps)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadReport = () => {
    if (!finalResult) return

    const reportContent = `
RAPPORT DE CONSULTATION MÉDICALE
================================

${finalResult.consultationReport}

DIAGNOSTIC IA
=============
${finalResult.diagnosis}

EXAMENS RECOMMANDÉS
==================
${finalResult.examens}

PRESCRIPTION
============
${finalResult.prescription}

EVIDENCE SCIENTIFIQUE
====================
Articles PubMed trouvés: ${finalResult.pubmedEvidence?.articles?.length || 0}

Généré le: ${new Date().toLocaleString("fr-FR")}
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
            </span>
          </div>
        </CardHeader>
      </Card>

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

                {step.error && <div className="text-sm text-red-600 mt-1">Erreur: {step.error}</div>}

                {step.result && step.status === "completed" && (
                  <div className="text-sm text-green-600 mt-1">✓ Traitement terminé avec succès</div>
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
              <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {finalResult.diagnosis.substring(0, 300)}...
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
              <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {finalResult.examens.substring(0, 300)}...
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
              <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {finalResult.prescription.substring(0, 300)}...
              </div>
            </CardContent>
          </Card>

          {/* Evidence PubMed */}
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
                  {finalResult.fdaVerification?.success ? "✓ Validé" : "⚠ À vérifier"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
