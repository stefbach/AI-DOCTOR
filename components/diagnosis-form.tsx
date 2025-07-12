"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Brain,
  AlertTriangle,
  BookOpen,
  Loader2,
  CheckCircle,
  Database,
  Pill,
  FileText,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { MedicalAPIService } from "@/lib/api-services"

interface DiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onNext: (data: any) => void
  onBack: () => void
}

export default function DiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  onNext,
  onBack,
}: DiagnosisFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [apiStatus, setApiStatus] = useState({
    openai: "idle",
    fda: "idle",
    rxnorm: "idle",
    pubmed: "idle",
  })

  const apiService = MedicalAPIService.getInstance()

  useEffect(() => {
    generateCompleteDiagnosis()
  }, [])

  const generateCompleteDiagnosis = async () => {
    setIsLoading(true)
    setError(null)
    setProgress(0)
    setDiagnosisResult(null)

    try {
      // Étape 1: Génération du diagnostic avec OpenAI GPT-4 (VRAIE API)
      setCurrentStep("Connexion à OpenAI GPT-4 pour analyse diagnostique...")
      setApiStatus((prev) => ({ ...prev, openai: "loading" }))
      setProgress(20)

      const diagnosisResponse = await apiService.generateDiagnosisWithOpenAI(patientData, clinicalData, questionsData)

      setApiStatus((prev) => ({ ...prev, openai: "success" }))
      setProgress(40)

      // Étape 2: Recherche de références PubMed (VRAIE API)
      setCurrentStep("Recherche de références scientifiques sur PubMed...")
      setApiStatus((prev) => ({ ...prev, pubmed: "loading" }))

      const symptoms = [clinicalData.chiefComplaint, ...(clinicalData.symptoms || [])].filter(Boolean)
      const pubmedResults = await apiService.searchPubMedReferences(
        diagnosisResponse.diagnosis.primary.condition,
        symptoms,
      )

      setApiStatus((prev) => ({ ...prev, pubmed: "success" }))
      setProgress(60)

      // Étape 3: Vérification des médicaments avec FDA (VRAIE API)
      setCurrentStep("Vérification des interactions médicamenteuses via FDA...")
      setApiStatus((prev) => ({ ...prev, fda: "loading" }))

      let fdaResults: any[] = []
      if (diagnosisResponse.recommendations?.medications?.length > 0) {
        const medicationNames = diagnosisResponse.recommendations.medications.map((m: any) => m.name)
        fdaResults = await apiService.checkDrugInteractionsFDA(medicationNames)
      }

      setApiStatus((prev) => ({ ...prev, fda: "success" }))
      setProgress(80)

      // Étape 4: Normalisation avec RxNorm (VRAIE API)
      setCurrentStep("Normalisation des médicaments via RxNorm...")
      setApiStatus((prev) => ({ ...prev, rxnorm: "loading" }))

      const rxnormResults: any[] = []
      if (diagnosisResponse.recommendations?.medications?.length > 0) {
        for (const med of diagnosisResponse.recommendations.medications) {
          const rxnormResult = await apiService.normalizeWithRxNorm(med.name)
          rxnormResults.push(rxnormResult)
        }
      }

      setApiStatus((prev) => ({ ...prev, rxnorm: "success" }))
      setProgress(100)

      // Compilation des résultats finaux
      const finalResult = {
        ...diagnosisResponse,
        pubmedReferences: pubmedResults,
        medicationInfo: {
          fdaData: fdaResults,
          rxnormData: rxnormResults,
        },
        apiStatuses: {
          openai: "success",
          fda: "success",
          rxnorm: "success",
          pubmed: "success",
        },
        generatedAt: new Date().toISOString(),
        patientContext: {
          age: patientData.age,
          gender: patientData.gender,
          chiefComplaint: clinicalData.chiefComplaint,
        },
      }

      setDiagnosisResult(finalResult)
      setCurrentStep("Analyse terminée - Toutes les APIs connectées avec succès")
    } catch (err: any) {
      console.error("Erreur génération diagnostic:", err)
      setError(`Erreur lors de la génération du diagnostic: ${err.message || err}`)

      // Marquer les APIs en erreur selon l'étape
      setApiStatus((prev) => ({
        openai: currentStep.includes("OpenAI") ? "error" : prev.openai,
        fda: currentStep.includes("FDA") ? "error" : prev.fda,
        rxnorm: currentStep.includes("RxNorm") ? "error" : prev.rxnorm,
        pubmed: currentStep.includes("PubMed") ? "error" : prev.pubmed,
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const getApiStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const getApiStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "Connecté"
      case "loading":
        return "En cours..."
      case "error":
        return "Erreur"
      default:
        return "En attente"
    }
  }

  const handleNext = () => {
    if (diagnosisResult) {
      onNext(diagnosisResult)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Brain className="w-6 h-6 text-blue-600" />
            Diagnostic IA - Analyse Multi-Sources
          </CardTitle>
          <p className="text-gray-600">
            Analyse diagnostique complète utilisant OpenAI GPT-4, FDA Database, RxNorm et PubMed
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statut des APIs en temps réel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5" />
                Statut des Intégrations API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getApiStatusIcon(apiStatus.openai)}
                  <div>
                    <p className="font-medium text-sm">OpenAI GPT-4</p>
                    <p className="text-xs text-gray-500">{getApiStatusText(apiStatus.openai)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getApiStatusIcon(apiStatus.fda)}
                  <div>
                    <p className="font-medium text-sm">FDA Database</p>
                    <p className="text-xs text-gray-500">{getApiStatusText(apiStatus.fda)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getApiStatusIcon(apiStatus.rxnorm)}
                  <div>
                    <p className="font-medium text-sm">RxNorm API</p>
                    <p className="text-xs text-gray-500">{getApiStatusText(apiStatus.rxnorm)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getApiStatusIcon(apiStatus.pubmed)}
                  <div>
                    <p className="font-medium text-sm">PubMed API</p>
                    <p className="text-xs text-gray-500">{getApiStatusText(apiStatus.pubmed)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barre de progression */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progression de l'analyse</span>
                    <span className="text-sm text-gray-500">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  {currentStep && (
                    <p className="text-sm text-blue-600 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {currentStep}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affichage des erreurs */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button variant="outline" size="sm" onClick={generateCompleteDiagnosis} className="ml-4 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Résultats du diagnostic */}
          {diagnosisResult && (
            <div className="space-y-6">
              {/* Diagnostic Principal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Diagnostic Principal
                    </span>
                    <Badge
                      variant="outline"
                      className={`${
                        diagnosisResult.diagnosis.primary.confidence >= 80
                          ? "bg-green-100 text-green-800"
                          : diagnosisResult.diagnosis.primary.confidence >= 60
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      Confiance: {diagnosisResult.diagnosis.primary.confidence}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-blue-900">
                        {diagnosisResult.diagnosis.primary.condition}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Code ICD-10: {diagnosisResult.diagnosis.primary.icd10}
                      </p>
                      <Badge
                        variant={
                          diagnosisResult.diagnosis.primary.severity === "severe"
                            ? "destructive"
                            : diagnosisResult.diagnosis.primary.severity === "moderate"
                              ? "default"
                              : "secondary"
                        }
                        className="mt-2"
                      >
                        Sévérité:{" "}
                        {diagnosisResult.diagnosis.primary.severity === "severe"
                          ? "Sévère"
                          : diagnosisResult.diagnosis.primary.severity === "moderate"
                            ? "Modérée"
                            : "Légère"}
                      </Badge>
                    </div>

                    <Progress value={diagnosisResult.diagnosis.primary.confidence} className="w-full" />

                    <div>
                      <h4 className="font-medium mb-2">Justification clinique:</h4>
                      <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                        {diagnosisResult.diagnosis.primary.rationale}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnostics Différentiels */}
              {diagnosisResult.diagnosis.differential && diagnosisResult.diagnosis.differential.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      Diagnostics Différentiels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {diagnosisResult.diagnosis.differential.map((diff: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 bg-orange-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-orange-900">{diff.condition}</h4>
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              {diff.probability}% de probabilité
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{diff.rationale}</p>
                          {diff.rulOutTests && diff.rulOutTests.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Examens pour éliminer:</h5>
                              <div className="flex flex-wrap gap-2">
                                {diff.rulOutTests.map((test: string, testIndex: number) => (
                                  <Badge key={testIndex} variant="secondary" className="text-xs">
                                    {test}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommandations Thérapeutiques */}
              {diagnosisResult.recommendations?.medications &&
                diagnosisResult.recommendations.medications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-green-600" />
                        Recommandations Thérapeutiques
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {diagnosisResult.recommendations.medications.map((med: any, index: number) => {
                          const fdaInfo = diagnosisResult.medicationInfo?.fdaData?.[index]
                          const rxnormInfo = diagnosisResult.medicationInfo?.rxnormData?.[index]

                          return (
                            <div key={index} className="border rounded-lg p-4 bg-green-50">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-green-900">{med.name}</h4>
                                <div className="flex gap-2">
                                  {fdaInfo?.fdaApproved && (
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      FDA Approuvé
                                    </Badge>
                                  )}
                                  {rxnormInfo?.rxcui && (
                                    <Badge variant="outline" className="text-xs">
                                      RxCUI: {rxnormInfo.rxcui}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p>
                                    <strong>Posologie:</strong> {med.dosage}
                                  </p>
                                  <p>
                                    <strong>Fréquence:</strong> {med.frequency}
                                  </p>
                                  {med.duration && (
                                    <p>
                                      <strong>Durée:</strong> {med.duration}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p>
                                    <strong>Indication:</strong> {med.indication}
                                  </p>
                                  {fdaInfo?.activeIngredient && (
                                    <p>
                                      <strong>Principe actif:</strong> {fdaInfo.activeIngredient}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Interactions médicamenteuses */}
                              {fdaInfo?.interactions && fdaInfo.interactions.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="font-medium text-sm mb-2 text-red-700">
                                    ⚠️ Interactions médicamenteuses:
                                  </h5>
                                  <div className="space-y-2">
                                    {fdaInfo.interactions.slice(0, 3).map((interaction: any, intIndex: number) => (
                                      <div
                                        key={intIndex}
                                        className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-300"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <strong className="text-red-800">{interaction.drug}</strong>
                                          <Badge
                                            variant={
                                              interaction.severity === "major"
                                                ? "destructive"
                                                : interaction.severity === "moderate"
                                                  ? "default"
                                                  : "secondary"
                                            }
                                            className="text-xs"
                                          >
                                            {interaction.severity}
                                          </Badge>
                                        </div>
                                        <p className="text-red-700">{interaction.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Contre-indications */}
                              {med.contraindications && med.contraindications.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="font-medium text-sm mb-2">Contre-indications:</h5>
                                  <div className="flex flex-wrap gap-1">
                                    {med.contraindications.map((contra: string, contraIndex: number) => (
                                      <Badge key={contraIndex} variant="outline" className="text-xs bg-yellow-50">
                                        {contra}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Références Scientifiques PubMed */}
              {diagnosisResult.pubmedReferences && diagnosisResult.pubmedReferences.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      Références Scientifiques (PubMed)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {diagnosisResult.pubmedReferences.map((ref: any, index: number) => (
                        <div key={index} className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-3 rounded-r">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm text-purple-900 leading-tight">{ref.title}</h4>
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 ml-2">
                              Score: {Math.round(ref.relevanceScore)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            <strong>Auteurs:</strong> {ref.authors.slice(0, 3).join(", ")}
                            {ref.authors.length > 3 && " et al."}
                          </p>
                          <p className="text-xs text-gray-600 mb-2">
                            <strong>Journal:</strong> {ref.journal} ({ref.year})
                            {ref.pmid !== "local_ref_1" && ref.pmid !== "local_ref_2" && ref.pmid !== "local_ref_3" && (
                              <span> - PMID: {ref.pmid}</span>
                            )}
                          </p>
                          {ref.abstract && (
                            <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                              {ref.abstract.substring(0, 300)}
                              {ref.abstract.length > 300 && "..."}
                            </p>
                          )}
                          {ref.url && ref.url !== "#" && (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:text-purple-800 underline mt-2 inline-block"
                            >
                              Voir l'article complet →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={onBack} className="px-6 py-3 bg-transparent">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Retour Questions
                </Button>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={generateCompleteDiagnosis} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Régénérer
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!diagnosisResult}
                    className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                  >
                    Continuer vers les Examens
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
