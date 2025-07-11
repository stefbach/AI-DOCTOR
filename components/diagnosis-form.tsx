"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Brain, ArrowLeft, ArrowRight, Loader2, Target, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react"

interface DiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onNext: (data: any) => void
  onBack: () => void
}

interface Diagnosis {
  condition: string
  icd10: string
  confidence: number
  rationale: string
  severity: "mild" | "moderate" | "severe"
}

interface DifferentialDiagnosis {
  condition: string
  probability: number
  rationale: string
  rulOutTests?: string[]
}

interface ClinicalRecommendation {
  category: "treatment" | "monitoring" | "lifestyle" | "referral"
  action: string
  priority: "high" | "medium" | "low"
  timeline: string
}

interface DiagnosisData {
  primaryDiagnosis: Diagnosis
  differentialDiagnoses: DifferentialDiagnosis[]
  clinicalRecommendations: ClinicalRecommendation[]
  recommendedExams: any[]
  riskFactors: string[]
  prognosis: string
  generatedAt: string
}

export default function DiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  onNext,
  onBack,
}: DiagnosisFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData | null>(null)
  const [currentStep, setCurrentStep] = useState<"generating" | "review" | "complete">("generating")

  const generateDiagnosisWithAI = useCallback(async () => {
    setIsGenerating(true)
    setCurrentStep("generating")

    // Simulation d'analyse IA avec délai réaliste
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Génération du diagnostic basé sur les données collectées
    const diagnosis: DiagnosisData = {
      primaryDiagnosis: {
        condition: "Syndrome coronarien aigu probable",
        icd10: "I20.9",
        confidence: 78,
        rationale: `Basé sur les symptômes de douleur thoracique, les facteurs de risque cardiovasculaires identifiés, 
        et les réponses à l'anamnèse dirigée. La présentation clinique est compatible avec un syndrome coronarien aigu.`,
        severity: "moderate",
      },
      differentialDiagnoses: [
        {
          condition: "Péricardite aiguë",
          probability: 15,
          rationale: "Douleur thoracique avec caractéristiques inflammatoires possibles",
          rulOutTests: ["ECG", "Échocardiographie", "CRP"],
        },
        {
          condition: "Embolie pulmonaire",
          probability: 12,
          rationale: "Dyspnée et douleur thoracique, facteurs de risque à évaluer",
          rulOutTests: ["D-dimères", "Angioscanner pulmonaire"],
        },
        {
          condition: "Reflux gastro-œsophagien",
          probability: 8,
          rationale: "Douleur thoracique pouvant mimer une origine cardiaque",
          rulOutTests: ["Test aux IPP", "Endoscopie si nécessaire"],
        },
      ],
      clinicalRecommendations: [
        {
          category: "treatment",
          action: "Débuter un traitement antiagrégant plaquettaire (Aspirine 75mg/j)",
          priority: "high",
          timeline: "Immédiatement",
        },
        {
          category: "monitoring",
          action: "Surveillance ECG et enzymes cardiaques",
          priority: "high",
          timeline: "Dans les 6 heures",
        },
        {
          category: "lifestyle",
          action: "Arrêt du tabac et modification du régime alimentaire",
          priority: "medium",
          timeline: "Dès que possible",
        },
        {
          category: "referral",
          action: "Consultation cardiologique dans les 48h",
          priority: "high",
          timeline: "Sous 48 heures",
        },
      ],
      recommendedExams: [
        {
          name: "Électrocardiogramme (ECG)",
          category: "urgent",
          indication: "Recherche de signes d'ischémie myocardique",
          code: "DEQP003",
        },
        {
          name: "Troponines cardiaques",
          category: "biology",
          indication: "Marqueurs de nécrose myocardique",
          code: "B1201",
        },
        {
          name: "Radiographie thoracique",
          category: "imaging",
          indication: "Élimination d'autres causes de douleur thoracique",
          code: "R1101",
        },
        {
          name: "Échocardiographie",
          category: "imaging",
          indication: "Évaluation de la fonction cardiaque",
          code: "R5101",
        },
      ],
      riskFactors: [
        "Âge > 50 ans",
        "Antécédents familiaux cardiovasculaires",
        "Tabagisme actuel ou récent",
        "Hypertension artérielle",
        "Dyslipidémie probable",
      ],
      prognosis: `Avec une prise en charge appropriée et rapide, le pronostic est généralement favorable. 
      La confirmation diagnostique par les examens complémentaires permettra d'adapter le traitement.`,
      generatedAt: new Date().toISOString(),
    }

    setDiagnosisData(diagnosis)
    setIsGenerating(false)
    setCurrentStep("review")
  }, [])

  useEffect(() => {
    if (currentStep === "generating") {
      generateDiagnosisWithAI()
    }
  }, [currentStep, generateDiagnosisWithAI])

  const handleConfirmDiagnosis = () => {
    setCurrentStep("complete")
  }

  const handleRegenerateDiagnosis = () => {
    setCurrentStep("generating")
    setDiagnosisData(null)
  }

  const handleNext = () => {
    onNext(diagnosisData)
  }

  if (currentStep === "generating" || isGenerating) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <Brain className="h-16 w-16 text-blue-600 animate-pulse" />
              <div className="absolute -top-2 -right-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-4">Génération du Diagnostic par IA</h3>
            <div className="text-center space-y-2 max-w-md">
              <p className="text-gray-600">
                L'IA analyse les données de{" "}
                <strong>
                  {patientData?.firstName} {patientData?.lastName}
                </strong>
              </p>
              <div className="space-y-1 text-sm text-gray-500">
                <div>✓ Données cliniques analysées</div>
                <div>✓ Anamnèse dirigée évaluée ({questionsData?.answeredQuestions} réponses)</div>
                <div className="animate-pulse">⏳ Génération du diagnostic différentiel...</div>
                <div className="animate-pulse">⏳ Calcul des probabilités diagnostiques...</div>
                <div className="animate-pulse">⏳ Recommandations thérapeutiques...</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentStep === "complete") {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl text-green-600">
              <CheckCircle className="h-6 w-6 mr-3" />
              Diagnostic Confirmé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                Le diagnostic a été généré et confirmé. Vous pouvez maintenant procéder à la prescription d'examens
                complémentaires.
              </AlertDescription>
            </Alert>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Diagnostic Principal</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{diagnosisData?.primaryDiagnosis.condition}</p>
                  <p className="text-sm text-gray-600">Code ICD-10: {diagnosisData?.primaryDiagnosis.icd10}</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {diagnosisData?.primaryDiagnosis.confidence}% de confiance
                </Badge>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <Button onClick={() => setCurrentStep("review")} variant="outline">
                Revoir le diagnostic
              </Button>
              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                Continuer vers les Examens
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Target className="h-6 w-6 mr-3 text-blue-600" />
            Diagnostic Généré par IA
          </CardTitle>
          <p className="text-gray-600">
            Analyse complète pour {patientData?.firstName} {patientData?.lastName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Diagnostic principal */}
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">Diagnostic Principal</h3>
              <Badge
                className={`${
                  diagnosisData?.primaryDiagnosis.confidence! >= 80
                    ? "bg-green-100 text-green-800"
                    : diagnosisData?.primaryDiagnosis.confidence! >= 60
                      ? "bg-orange-100 text-orange-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {diagnosisData?.primaryDiagnosis.confidence}% de confiance
              </Badge>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-800">{diagnosisData?.primaryDiagnosis.condition}</h4>
                <p className="text-sm text-blue-700">Code ICD-10: {diagnosisData?.primaryDiagnosis.icd10}</p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-1">Justification clinique:</h5>
                <p className="text-sm text-blue-700">{diagnosisData?.primaryDiagnosis.rationale}</p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge
                  variant={
                    diagnosisData?.primaryDiagnosis.severity === "severe"
                      ? "destructive"
                      : diagnosisData?.primaryDiagnosis.severity === "moderate"
                        ? "default"
                        : "secondary"
                  }
                >
                  Sévérité:{" "}
                  {diagnosisData?.primaryDiagnosis.severity === "severe"
                    ? "Sévère"
                    : diagnosisData?.primaryDiagnosis.severity === "moderate"
                      ? "Modérée"
                      : "Légère"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Diagnostics différentiels */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Diagnostics Différentiels
            </h3>
            <div className="space-y-3">
              {diagnosisData?.differentialDiagnoses.map((diff, index) => (
                <Card key={index} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{diff.condition}</h4>
                      <Badge variant="outline">{diff.probability}% de probabilité</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{diff.rationale}</p>
                    {diff.rulOutTests && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Examens pour éliminer:</h5>
                        <div className="flex flex-wrap gap-1">
                          {diff.rulOutTests.map((test, testIndex) => (
                            <Badge key={testIndex} variant="secondary" className="text-xs">
                              {test}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recommandations cliniques */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
              Recommandations Cliniques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diagnosisData?.clinicalRecommendations.map((rec, index) => (
                <Card
                  key={index}
                  className={`border-l-4 ${
                    rec.priority === "high"
                      ? "border-l-red-500"
                      : rec.priority === "medium"
                        ? "border-l-orange-500"
                        : "border-l-gray-500"
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {rec.category === "treatment"
                          ? "Traitement"
                          : rec.category === "monitoring"
                            ? "Surveillance"
                            : rec.category === "lifestyle"
                              ? "Mode de vie"
                              : "Référence"}
                      </Badge>
                      <Badge
                        className={
                          rec.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : rec.priority === "medium"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-800"
                        }
                      >
                        {rec.priority === "high" ? "Urgent" : rec.priority === "medium" ? "Important" : "Routine"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{rec.action}</p>
                    <p className="text-xs text-gray-600">Délai: {rec.timeline}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Examens recommandés */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Examens Complémentaires Recommandés</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diagnosisData?.recommendedExams.map((exam, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{exam.name}</h4>
                      <Badge
                        variant={
                          exam.category === "urgent"
                            ? "destructive"
                            : exam.category === "biology"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {exam.category === "urgent" ? "Urgent" : exam.category === "biology" ? "Biologie" : "Imagerie"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{exam.indication}</p>
                    <p className="text-xs text-gray-500">Code: {exam.code}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Facteurs de risque et pronostic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Facteurs de Risque Identifiés</h3>
              <div className="space-y-2">
                {diagnosisData?.riskFactors.map((factor, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Pronostic</h3>
              <p className="text-sm text-gray-700">{diagnosisData?.prognosis}</p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button onClick={onBack} variant="outline" className="px-6 py-3 bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour Questions
            </Button>

            <div className="flex space-x-3">
              <Button onClick={handleRegenerateDiagnosis} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                Régénérer
              </Button>
              <Button onClick={handleConfirmDiagnosis} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmer le Diagnostic
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
