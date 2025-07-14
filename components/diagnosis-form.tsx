"use client"

import { TabsContent } from "@/components/ui/tabs"

import { TabsTrigger } from "@/components/ui/tabs"

import { TabsList } from "@/components/ui/tabs"

import { Tabs } from "@/components/ui/tabs"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, CheckCircle, AlertTriangle, Target, BookOpen, Lightbulb } from "lucide-react"

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
}

interface DiagnosisFormProps {
  data?: DiagnosisData
  allData?: any
  onDataChange: (data: DiagnosisData) => void
  onNext: () => void
  onPrevious: () => void
}

export default function DiagnosisForm({ data, allData, onDataChange, onNext, onPrevious }: DiagnosisFormProps) {
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

  useEffect(() => {
    if (
      formData.generationStatus === "pending" &&
      allData?.patientData &&
      allData?.clinicalData &&
      allData?.questionsData
    ) {
      generateDiagnosis()
    }
  }, [allData])

  const generateDiagnosis = async () => {
    setIsGenerating(true)
    const updatedData = { ...formData, generationStatus: "generating" as const }
    setFormData(updatedData)
    onDataChange(updatedData)

    try {
      // Utiliser la vraie API OpenAI pour le diagnostic
      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData: allData?.patientData,
          clinicalData: allData?.clinicalData,
          questionsData: allData?.questionsData,
        }),
      })

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`)
      }

      const result = await response.json()

      const finalData: DiagnosisData = {
        ...formData,
        primaryDiagnosis: result.primaryDiagnosis,
        differentialDiagnoses: result.differentialDiagnoses || [],
        recommendedTests: result.recommendedTests || [],
        treatmentSuggestions: result.treatmentSuggestions || [],
        followUpPlan: result.followUpPlan || "",
        riskFactors: result.riskFactors || [],
        prognosisNotes: result.prognosisNotes || "",
        aiConfidence: result.confidence || 0,
        generationStatus: "completed",
      }

      setFormData(finalData)
      onDataChange(finalData)
    } catch (error) {
      console.error("Erreur génération diagnostic:", error)
      const errorData = { ...formData, generationStatus: "error" as const }
      setFormData(errorData)
      onDataChange(errorData)
    } finally {
      setIsGenerating(false)
    }
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
            <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Génération du Diagnostic IA</h3>
            <p className="text-gray-600 mb-4">
              L'IA analyse toutes les données collectées pour générer un diagnostic...
            </p>
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Analyse en cours...</div>
              <Progress value={66} className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (formData.generationStatus === "error") {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Erreur lors de la génération du diagnostic. Veuillez réessayer.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={generateDiagnosis}>Régénérer le Diagnostic</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec confiance IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Diagnostic Généré par IA
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
                </div>

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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="differential" className="space-y-4">
          {formData.differentialDiagnoses.map((diagnosis, index) => (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h5 className="text-sm font-semibold text-green-700 mb-1">Pour</h5>
                    <ul className="space-y-1">
                      {diagnosis.supportingEvidence.map((evidence, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                          <span className="text-xs">{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-red-700 mb-1">Contre</h5>
                    <ul className="space-y-1">
                      {diagnosis.contradictingEvidence.map((evidence, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-600 mt-1 flex-shrink-0" />
                          <span className="text-xs">{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  {formData.recommendedTests.map((test, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{test}</span>
                    </li>
                  ))}
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
                  {formData.treatmentSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

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
        </TabsContent>

        <TabsContent value="followup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan de Suivi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm">{formData.followUpPlan}</p>
              </div>
            </CardContent>
          </Card>

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
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Retour aux Questions IA
        </Button>
        <Button onClick={onNext}>Continuer vers les Examens</Button>
      </div>
    </div>
  )
}
