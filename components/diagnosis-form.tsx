"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, CheckCircle, AlertTriangle, Target, BookOpen, Lightbulb, Loader2 } from "lucide-react"

interface DiagnosticHypothesis {
  condition: string
  probability: number
  confidence: number
  reasoning: string
  supportingEvidence: string[]
  contradictingEvidence: string[]
  nextSteps: string[]
}

interface DiagnosisData {
  primaryDiagnosis: DiagnosticHypothesis | null
  differentialDiagnoses: DiagnosticHypothesis[]
  recommendedTests: string[]
  treatmentSuggestions: string[]
  followUpPlan: string
  riskFactors: string[]
  prognosisNotes: string
  aiConfidence: number
  generationStatus: "pending" | "generating" | "completed" | "error"
  data?: any
}

interface DiagnosisFormProps {
  patientData?: any
  clinicalData?: any
  questionsData?: any
  data?: DiagnosisData
  allData?: any
  onDataChange: (data: DiagnosisData) => void
  onNext: () => void
  onPrevious: () => void
}

export default function DiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  data,
  allData,
  onDataChange,
  onNext,
  onPrevious,
}: DiagnosisFormProps) {
  const [formData, setFormData] = useState<DiagnosisData>({
    primaryDiagnosis: null,
    differentialDiagnoses: [],
    recommendedTests: [],
    treatmentSuggestions: [],
    followUpPlan: "",
    riskFactors: [],
    prognosisNotes: "",
    aiConfidence: 0,
    generationStatus: "pending",
    ...data,
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-génération du diagnostic quand les données sont disponibles
  useEffect(() => {
    const shouldGenerate =
      formData.generationStatus === "pending" &&
      (patientData || allData?.patientData) &&
      (clinicalData || allData?.clinicalData) &&
      !isGenerating

    if (shouldGenerate) {
      console.log("🎯 Auto-génération du diagnostic...")
      generateDiagnosis()
    }
  }, [patientData, clinicalData, questionsData, allData])

  const generateDiagnosis = async () => {
    setIsGenerating(true)
    setError(null)

    const updatedData = { ...formData, generationStatus: "generating" as const }
    setFormData(updatedData)
    onDataChange(updatedData)

    try {
      console.log("🔍 Génération diagnostic avec données:", {
        patient: patientData || allData?.patientData,
        clinical: clinicalData || allData?.clinicalData,
        questions: questionsData || allData?.questionsData,
      })

      const response = await fetch("/api/diagnosis-expert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData: patientData || allData?.patientData,
          clinicalData: clinicalData || allData?.clinicalData,
          questionsData: questionsData || allData?.questionsData,
          emergencyFlags: [],
          teleMedContext: {},
          locationData: {},
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Erreur HTTP:", response.status, errorText)
        throw new Error(`Erreur API: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log("✅ Résultat diagnostic reçu:", result)

      if (!result.success) {
        throw new Error(result.error || "Erreur lors de la génération du diagnostic")
      }

      const expertData = result.data

      // Traitement sécurisé des données avec vérifications
      const processedData: DiagnosisData = {
        primaryDiagnosis: expertData?.comprehensiveDiagnosis?.primary
          ? {
              condition: expertData.comprehensiveDiagnosis.primary.condition || "Diagnostic en cours d'analyse",
              probability: expertData.comprehensiveDiagnosis.primary.probability || 85,
              confidence: expertData.comprehensiveDiagnosis.primary.confidence || 75,
              reasoning:
                expertData.comprehensiveDiagnosis.primary.reasoning || "Analyse basée sur les données cliniques",
              supportingEvidence: Array.isArray(expertData.comprehensiveDiagnosis.primary.supportingEvidence)
                ? expertData.comprehensiveDiagnosis.primary.supportingEvidence
                : [],
              contradictingEvidence: Array.isArray(expertData.comprehensiveDiagnosis.primary.contradictingEvidence)
                ? expertData.comprehensiveDiagnosis.primary.contradictingEvidence
                : [],
              nextSteps: ["Examens complémentaires", "Suivi clinique"],
            }
          : {
              condition: "Syndrome clinique nécessitant évaluation complémentaire",
              probability: 70,
              confidence: 60,
              reasoning: "Analyse basée sur les données disponibles",
              supportingEvidence: ["Données cliniques collectées"],
              contradictingEvidence: [],
              nextSteps: ["Consultation médicale", "Examens complémentaires"],
            },

        differentialDiagnoses: Array.isArray(expertData?.comprehensiveDiagnosis?.differential)
          ? expertData.comprehensiveDiagnosis.differential.map((diff: any) => ({
              condition: diff?.condition || "Diagnostic différentiel",
              probability: diff?.probability || 50,
              confidence: 70,
              reasoning: diff?.reasoning || "À considérer",
              supportingEvidence: [],
              contradictingEvidence: [],
              nextSteps: [diff?.investigationNeeded || "Examens à déterminer"],
            }))
          : [
              {
                condition: "Pathologie fonctionnelle",
                probability: 50,
                confidence: 50,
                reasoning: "À considérer en l'absence d'éléments organiques",
                supportingEvidence: [],
                contradictingEvidence: [],
                nextSteps: ["Évaluation clinique approfondie"],
              },
            ],

        recommendedTests: Array.isArray(expertData?.recommendedExams)
          ? expertData.recommendedExams.map((exam: any) => exam?.name || exam?.test || "Examen à déterminer")
          : ["Bilan biologique standard", "Imagerie selon orientation"],

        treatmentSuggestions: Array.isArray(expertData?.expertTherapeutics?.evidenceBasedMedications)
          ? expertData.expertTherapeutics.evidenceBasedMedications.map(
              (med: any) => `${med?.name || "Médicament"} - ${med?.indication || "Selon indication"}`,
            )
          : ["Traitement symptomatique", "Surveillance évolution"],

        followUpPlan:
          expertData?.prognosticAssessment?.shortTerm?.expectedOutcome ||
          expertData?.prognosticAssessment?.shortTerm ||
          "Suivi à déterminer",

        riskFactors: processRiskFactors(expertData?.prognosticAssessment?.riskFactors),

        prognosisNotes:
          expertData?.prognosticAssessment?.longTerm?.expectedOutcome ||
          expertData?.prognosticAssessment?.longTerm ||
          "Pronostic à évaluer",

        aiConfidence:
          expertData?.qualityMetrics_CHU?.confidenceLevel ||
          result?.metadata?.confidenceLevel ||
          expertData?.confidenceLevel ||
          75,

        generationStatus: "completed",
        data: expertData,
      }

      console.log("✅ Données diagnostic traitées:", processedData)
      setFormData(processedData)
      onDataChange(processedData)
    } catch (error) {
      console.error("❌ Erreur génération diagnostic:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")

      const fallbackData: DiagnosisData = {
        primaryDiagnosis: {
          condition: "Syndrome clinique nécessitant évaluation complémentaire",
          probability: 70,
          confidence: 60,
          reasoning: "Analyse basée sur les données disponibles. Erreur lors de l'analyse IA complète.",
          supportingEvidence: ["Données cliniques collectées"],
          contradictingEvidence: [],
          nextSteps: ["Consultation médicale", "Examens complémentaires"],
        },
        differentialDiagnoses: [
          {
            condition: "Pathologie fonctionnelle",
            probability: 50,
            confidence: 50,
            reasoning: "À considérer en l'absence d'éléments organiques",
            supportingEvidence: [],
            contradictingEvidence: [],
            nextSteps: ["Évaluation clinique approfondie"],
          },
        ],
        recommendedTests: ["Bilan biologique standard", "Imagerie selon orientation"],
        treatmentSuggestions: ["Traitement symptomatique", "Surveillance évolution"],
        followUpPlan: "Réévaluation clinique dans 48-72h",
        riskFactors: ["Facteurs de risque à évaluer"],
        prognosisNotes: "Pronostic à déterminer après évaluation complète",
        aiConfidence: 60,
        generationStatus: "completed",
        data: null,
      }

      setFormData(fallbackData)
      onDataChange(fallbackData)
    } finally {
      setIsGenerating(false)
    }
  }

  // Fonction pour traiter les facteurs de risque de manière sécurisée
  const processRiskFactors = (riskFactors: any): string[] => {
    if (!riskFactors) return ["Facteurs de risque à évaluer"]

    if (Array.isArray(riskFactors)) {
      return riskFactors.map((factor: any) => {
        if (typeof factor === "string") return factor
        if (typeof factor === "object" && factor?.factor) return factor.factor
        return "Facteur de risque"
      })
    }

    if (typeof riskFactors === "string") {
      return [riskFactors]
    }

    return ["Facteurs de risque à évaluer"]
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return "text-red-600 bg-red-100"
    if (probability >= 60) return "text-orange-600 bg-orange-100"
    if (probability >= 40) return "text-yellow-600 bg-yellow-100"
    return "text-green-600 bg-green-100"
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600"
    if (confidence >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  if (formData.generationStatus === "generating" || isGenerating) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Génération du Diagnostic IA Expert</h3>
            <p className="text-gray-600 mb-4">
              L'IA analyse toutes les données collectées pour générer un diagnostic expert niveau CHU...
            </p>
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Analyse en cours...</div>
              <Progress value={66} className="w-full" />
            </div>
            <div className="mt-4 text-xs text-gray-400">Intégration des APIs: PubMed, FDA, RxNorm</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (formData.generationStatus === "error" && !formData.primaryDiagnosis) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error || "Erreur lors de la génération du diagnostic. Veuillez réessayer."}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={generateDiagnosis} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              "Régénérer le Diagnostic"
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (formData.generationStatus === "pending" && !formData.primaryDiagnosis) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Diagnostic IA Expert</h3>
            <p className="text-gray-600 mb-4">Prêt à générer le diagnostic basé sur les données collectées</p>
            <Button onClick={generateDiagnosis} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Générer le Diagnostic Expert
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Diagnostic Expert Généré par IA
            </div>
            <Badge className={`${getConfidenceColor(formData.aiConfidence)} border-current`}>
              Confiance: {formData.aiConfidence}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Niveau de confiance global</span>
              <span>{formData.aiConfidence}%</span>
            </div>
            <Progress value={formData.aiConfidence} className="h-2" />
          </div>
          {error && (
            <Alert className="mt-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {error} - Diagnostic généré en mode dégradé
              </AlertDescription>
            </Alert>
          )}

          {formData.data?.externalData?.apisUsed?.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">APIs Intégrées:</div>
              <div className="text-xs text-blue-600">{formData.data.externalData.apisUsed.join(", ")}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="primary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="primary">Diagnostic Principal</TabsTrigger>
          <TabsTrigger value="differential">Diagnostics Différentiels</TabsTrigger>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          <TabsTrigger value="followup">Suivi</TabsTrigger>
        </TabsList>

        <TabsContent value="primary" className="space-y-4">
          {formData.primaryDiagnosis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {formData.primaryDiagnosis.condition}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getProbabilityColor(formData.primaryDiagnosis.probability)}>
                      {formData.primaryDiagnosis.probability}% Probabilité
                    </Badge>
                    <Badge variant="outline" className={getConfidenceColor(formData.primaryDiagnosis.confidence)}>
                      {formData.primaryDiagnosis.confidence}% Confiance
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Raisonnement Clinique</h4>
                  <p className="text-gray-700">{formData.primaryDiagnosis.reasoning}</p>
                </div>

                {formData.primaryDiagnosis.supportingEvidence &&
                  formData.primaryDiagnosis.supportingEvidence.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 text-green-700">Éléments Supportant</h4>
                        <ul className="space-y-1">
                          {formData.primaryDiagnosis.supportingEvidence.map((evidence, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{evidence}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {formData.primaryDiagnosis.contradictingEvidence &&
                        formData.primaryDiagnosis.contradictingEvidence.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 text-red-700">Éléments Contradictoires</h4>
                            <ul className="space-y-1">
                              {formData.primaryDiagnosis.contradictingEvidence.map((evidence, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{evidence}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}

                {formData.primaryDiagnosis.nextSteps && formData.primaryDiagnosis.nextSteps.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Prochaines Étapes</h4>
                    <ul className="space-y-1">
                      {formData.primaryDiagnosis.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="differential" className="space-y-4">
          {formData.differentialDiagnoses && formData.differentialDiagnoses.length > 0 ? (
            formData.differentialDiagnoses.map((diagnosis, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{diagnosis.condition}</span>
                    <div className="flex gap-2">
                      <Badge className={getProbabilityColor(diagnosis.probability)}>{diagnosis.probability}%</Badge>
                      <Badge variant="outline" className={getConfidenceColor(diagnosis.confidence)}>
                        {diagnosis.confidence}% Confiance
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700">{diagnosis.reasoning}</p>
                  {diagnosis.nextSteps && diagnosis.nextSteps.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold mb-1">Investigations nécessaires</h5>
                      <ul className="space-y-1">
                        {diagnosis.nextSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-xs">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <p>Aucun diagnostic différentiel généré</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  Examens Recommandés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {formData.recommendedTests && formData.recommendedTests.length > 0 ? (
                    formData.recommendedTests.map((test, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">{test}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">Aucun examen spécifique recommandé</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4" />
                  Suggestions de Traitement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {formData.treatmentSuggestions && formData.treatmentSuggestions.length > 0 ? (
                    formData.treatmentSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">Aucune suggestion de traitement spécifique</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          {formData.riskFactors && formData.riskFactors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Facteurs de Risque</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {formData.riskFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{factor}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="followup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan de Suivi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm">{formData.followUpPlan || "Plan de suivi à déterminer"}</p>
              </div>
            </CardContent>
          </Card>

          {formData.prognosisNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes Pronostiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm">{formData.prognosisNotes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Retour aux Questions IA
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateDiagnosis} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Régénération...
              </>
            ) : (
              "Régénérer"
            )}
          </Button>
          <Button onClick={onNext}>Continuer vers les Examens</Button>
        </div>
      </div>
    </div>
  )
}
