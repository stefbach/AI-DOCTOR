"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Brain, AlertTriangle, BookOpen, Loader2, Pill, FileText, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react"

interface DiagnosisFormProps {
  data?: any
  allData?: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function DiagnosisForm({ data, allData, onDataChange, onNext, onPrevious }: DiagnosisFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [diagnosisResult, setDiagnosisResult] = useState<any>(data || null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")

  useEffect(() => {
    if (!diagnosisResult && allData?.patientData && allData?.clinicalData) {
      generateCompleteDiagnosis()
    }
  }, [allData])

  const generateCompleteDiagnosis = async () => {
    setIsLoading(true)
    setError(null)
    setProgress(0)
    setDiagnosisResult(null)

    try {
      // Étape 1: Génération du diagnostic avec OpenAI GPT-4
      setCurrentStep("Connexion à OpenAI GPT-4 pour analyse diagnostique...")
      setProgress(25)

      const diagnosisResponse = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: allData.patientData,
          clinicalData: allData.clinicalData,
          questionsData: allData.questionsData,
        }),
      })

      if (!diagnosisResponse.ok) {
        throw new Error(`Erreur API diagnostic: ${diagnosisResponse.status}`)
      }

      const diagnosisData = await diagnosisResponse.json()
      if (!diagnosisData.success) {
        throw new Error(diagnosisData.error || "Erreur lors de la génération du diagnostic")
      }

      setProgress(50)

      // Étape 2: Recherche de références PubMed
      setCurrentStep("Recherche de références scientifiques sur PubMed...")

      const pubmedResponse = await fetch("/api/pubmed-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: diagnosisData.data.diagnosis?.primary?.condition || "diagnostic médical",
          maxResults: 3,
        }),
      })

      let pubmedResults = []
      if (pubmedResponse.ok) {
        const pubmedData = await pubmedResponse.json()
        if (pubmedData.success) {
          pubmedResults = pubmedData.data
        }
      }

      setProgress(75)

      // Étape 3: Vérification des médicaments avec FDA
      setCurrentStep("Vérification des interactions médicamenteuses via FDA...")

      let fdaResults = []
      if (diagnosisData.data.recommendations?.medications?.length > 0) {
        const medicationNames = diagnosisData.data.recommendations.medications.map((m: any) => m.name)

        const fdaResponse = await fetch("/api/fda-drug-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medications: medicationNames }),
        })

        if (fdaResponse.ok) {
          const fdaData = await fdaResponse.json()
          if (fdaData.success) {
            fdaResults = fdaData.data
          }
        }
      }

      setProgress(100)

      // Compilation des résultats finaux
      const finalResult = {
        ...diagnosisData.data,
        pubmedReferences: pubmedResults,
        medicationInfo: {
          fdaData: fdaResults,
        },
        generatedAt: new Date().toISOString(),
        patientContext: {
          age: allData?.patientData?.age,
          gender: allData?.patientData?.gender,
          chiefComplaint: allData?.clinicalData?.chiefComplaint,
        },
      }

      setDiagnosisResult(finalResult)
      onDataChange(finalResult)
      setCurrentStep("Analyse terminée - Diagnostic généré avec succès")
    } catch (err: any) {
      console.error("Erreur génération diagnostic:", err)
      setError(`Erreur lors de la génération du diagnostic: ${err.message || err}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    if (diagnosisResult) {
      onNext()
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
          <p className="text-gray-600">Analyse diagnostique complète utilisant OpenAI GPT-4, FDA Database et PubMed</p>
        </CardHeader>
        <CardContent className="space-y-6">
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
          {diagnosisResult && diagnosisResult.diagnosis && (
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
                          <p className="text-sm text-gray-700">{diff.rationale}</p>
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
                            {ref.pmid && <span> - PMID: {ref.pmid}</span>}
                          </p>
                          {ref.abstract && (
                            <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                              {ref.abstract.substring(0, 300)}
                              {ref.abstract.length > 300 && "..."}
                            </p>
                          )}
                          {ref.url && (
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
                <Button variant="outline" onClick={onPrevious} className="px-6 py-3 bg-transparent">
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
