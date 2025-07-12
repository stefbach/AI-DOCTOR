"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, AlertTriangle, BookOpen, Loader2 } from "lucide-react"
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
  const [apiStatus, setApiStatus] = useState({
    openai: "idle",
    fda: "idle",
    rxnorm: "idle",
    pubmed: "idle",
  })

  const apiService = MedicalAPIService.getInstance()

  useEffect(() => {
    // Génération automatique du diagnostic au chargement
    generateDiagnosis()
  }, [])

  const generateDiagnosis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Étape 1: Génération du diagnostic avec OpenAI
      setApiStatus((prev) => ({ ...prev, openai: "loading" }))
      const diagnosisResponse = await apiService.generateDiagnosisWithOpenAI(patientData, clinicalData, questionsData)
      setApiStatus((prev) => ({ ...prev, openai: "success" }))

      // Étape 2: Vérification des médicaments avec FDA
      if (diagnosisResponse.recommendations?.medications?.length > 0) {
        setApiStatus((prev) => ({ ...prev, fda: "loading" }))
        const medicationNames = diagnosisResponse.recommendations.medications.map((m) => m.name)
        const fdaResults = await apiService.checkDrugInteractionsFDA(medicationNames)
        setApiStatus((prev) => ({ ...prev, fda: "success" }))

        // Enrichir les médicaments avec les données FDA
        diagnosisResponse.recommendations.medications = diagnosisResponse.recommendations.medications.map(
          (med, index) => ({
            ...med,
            fdaInfo: fdaResults[index] || null,
          }),
        )
      }

      // Étape 3: Normalisation avec RxNorm
      setApiStatus((prev) => ({ ...prev, rxnorm: "loading" }))
      if (diagnosisResponse.recommendations?.medications?.length > 0) {
        for (const med of diagnosisResponse.recommendations.medications) {
          const rxNormResult = await apiService.normalizeWithRxNorm(med.name)
          med.rxNormInfo = rxNormResult
        }
      }
      setApiStatus((prev) => ({ ...prev, rxnorm: "success" }))

      // Étape 4: Recherche de références PubMed
      setApiStatus((prev) => ({ ...prev, pubmed: "loading" }))
      const symptoms = [clinicalData.chiefComplaint, ...(clinicalData.symptoms || [])]
      const pubmedResults = await apiService.searchPubMedReferences(
        diagnosisResponse.diagnosis.primary.condition,
        symptoms,
      )
      setApiStatus((prev) => ({ ...prev, pubmed: "success" }))

      // Finaliser le résultat
      const finalResult = {
        ...diagnosisResponse,
        pubmedReferences: pubmedResults,
        analysisTimestamp: new Date().toISOString(),
        patientContext: {
          age: patientData.age,
          gender: patientData.gender,
          allergies: patientData.allergies,
        },
      }

      setDiagnosisResult(finalResult)
    } catch (err) {
      console.error("Erreur génération diagnostic:", err)
      setError("Erreur lors de la génération du diagnostic. Veuillez réessayer.")
      setApiStatus((prev) => ({
        ...prev,
        openai: "error",
        fda: "error",
        rxnorm: "error",
        pubmed: "error",
      }))
    } finally {
      setIsLoading(false)
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
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Diagnostic IA - Analyse Multi-Sources
          </CardTitle>
          <CardDescription>
            Analyse diagnostique complète utilisant OpenAI GPT-4, FDA Database, RxNorm et PubMed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statut des APIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div
                className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  apiStatus.openai === "success"
                    ? "bg-green-500"
                    : apiStatus.openai === "loading"
                      ? "bg-yellow-500"
                      : apiStatus.openai === "error"
                        ? "bg-red-500"
                        : "bg-gray-300"
                }`}
              ></div>
              <p className="text-sm font-medium">OpenAI GPT-4</p>
              <p className="text-xs text-gray-500">Diagnostic IA</p>
            </div>
            <div className="text-center">
              <div
                className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  apiStatus.fda === "success"
                    ? "bg-green-500"
                    : apiStatus.fda === "loading"
                      ? "bg-yellow-500"
                      : apiStatus.fda === "error"
                        ? "bg-red-500"
                        : "bg-gray-300"
                }`}
              ></div>
              <p className="text-sm font-medium">FDA Database</p>
              <p className="text-xs text-gray-500">Interactions</p>
            </div>
            <div className="text-center">
              <div
                className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  apiStatus.rxnorm === "success"
                    ? "bg-green-500"
                    : apiStatus.rxnorm === "loading"
                      ? "bg-yellow-500"
                      : apiStatus.rxnorm === "error"
                        ? "bg-red-500"
                        : "bg-gray-300"
                }`}
              ></div>
              <p className="text-sm font-medium">RxNorm API</p>
              <p className="text-xs text-gray-500">Normalisation</p>
            </div>
            <div className="text-center">
              <div
                className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  apiStatus.pubmed === "success"
                    ? "bg-green-500"
                    : apiStatus.pubmed === "loading"
                      ? "bg-yellow-500"
                      : apiStatus.pubmed === "error"
                        ? "bg-red-500"
                        : "bg-gray-300"
                }`}
              ></div>
              <p className="text-sm font-medium">PubMed API</p>
              <p className="text-xs text-gray-500">Références</p>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Génération du diagnostic en cours...</p>
              <p className="text-sm text-gray-600">Analyse des données avec intelligence artificielle</p>
            </div>
          )}

          {error && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {diagnosisResult && (
            <div className="space-y-6">
              {/* Diagnostic Principal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Diagnostic Principal</span>
                    <Badge variant="outline">Confiance: {diagnosisResult.diagnosis.primary.confidence}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-lg">{diagnosisResult.diagnosis.primary.condition}</h4>
                      <p className="text-sm text-gray-600">Code ICD-10: {diagnosisResult.diagnosis.primary.icd10}</p>
                      <Badge
                        variant={
                          diagnosisResult.diagnosis.primary.severity === "severe"
                            ? "destructive"
                            : diagnosisResult.diagnosis.primary.severity === "moderate"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {diagnosisResult.diagnosis.primary.severity}
                      </Badge>
                    </div>
                    <Progress value={diagnosisResult.diagnosis.primary.confidence} className="w-full" />
                    <p className="text-sm">{diagnosisResult.diagnosis.primary.rationale}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnostics Différentiels */}
              <Card>
                <CardHeader>
                  <CardTitle>Diagnostics Différentiels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {diagnosisResult.diagnosis.differential.map((diff: any, index: number) => (
                      <div key={index} className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{diff.condition}</h4>
                          <Badge variant="outline">{diff.probability}%</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{diff.rationale}</p>
                        <div className="flex flex-wrap gap-2">
                          {diff.rulOutTests.map((test: string, testIndex: number) => (
                            <Badge key={testIndex} variant="secondary" className="text-xs">
                              {test}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommandations Thérapeutiques */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommandations Thérapeutiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {diagnosisResult.recommendations.medications.map((med: any, index: number) => (
                      <div key={index} className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{med.name}</h4>
                          {med.fdaInfo && (
                            <Badge variant={med.fdaInfo.fdaApproved ? "default" : "destructive"}>
                              {med.fdaInfo.fdaApproved ? "FDA Approuvé" : "Non approuvé"}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p>
                              <strong>Posologie:</strong> {med.dosage}
                            </p>
                            <p>
                              <strong>Fréquence:</strong> {med.frequency}
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Indication:</strong> {med.indication}
                            </p>
                            {med.rxNormInfo && (
                              <p>
                                <strong>RxCUI:</strong> {med.rxNormInfo.rxcui}
                              </p>
                            )}
                          </div>
                        </div>
                        {med.fdaInfo && med.fdaInfo.interactions.length > 0 && (
                          <div className="mt-3">
                            <h5 className="font-medium text-sm mb-2">⚠️ Interactions:</h5>
                            <div className="space-y-1">
                              {med.fdaInfo.interactions.map((interaction: any, intIndex: number) => (
                                <div key={intIndex} className="text-xs bg-yellow-50 p-2 rounded">
                                  <strong>{interaction.drug}:</strong> {interaction.description}
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {interaction.severity}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Références Scientifiques */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Références Scientifiques (PubMed)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {diagnosisResult.pubmedReferences.map((ref: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-medium text-sm">{ref.title}</h4>
                        <p className="text-xs text-gray-600">
                          {ref.authors.join(", ")} - {ref.journal} ({ref.year})
                        </p>
                        <p className="text-xs mt-1">{ref.abstract}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            PMID: {ref.pmid}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Score: {ref.relevanceScore}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Retour
        </Button>
        <Button onClick={handleNext} disabled={!diagnosisResult} className="bg-blue-600 hover:bg-blue-700">
          Continuer vers Examens Paracliniques →
        </Button>
      </div>
    </div>
  )
}
