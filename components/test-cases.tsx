"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TestTube,
  Play,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Heart,
  Brain,
  Stethoscope,
} from "lucide-react"

interface TestCase {
  id: string
  title: string
  severity: "mild" | "moderate" | "severe"
  category: string
  icon: any
  description: string
  expectedDiagnosis: string
  patientData: any
  clinicalData: any
  questionsData: any
}

interface TestCasesProps {
  onTestCaseLoad?: (testCase: TestCase) => void
  onNext?: () => void
}

export default function TestCases({ onTestCaseLoad, onNext }: TestCasesProps) {
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)

  const testCases: TestCase[] = [
    {
      id: "fever-syndrome",
      title: "Syndrome Fébrile",
      severity: "moderate",
      category: "Infectiologie",
      icon: Thermometer,
      description: "Femme de 35 ans présentant une fièvre à 38.5°C avec céphalées et myalgies depuis 3 jours",
      expectedDiagnosis: "Syndrome viral probable",
      patientData: {
        age: 35,
        gender: "Femme",
        weight: 65,
        height: 165,
        allergies: "Aucune allergie connue",
        medicalHistory: "RAS",
        currentMedications: "Aucun traitement en cours",
        familyHistory: "Pas d'antécédents familiaux particuliers",
      },
      clinicalData: {
        chiefComplaint: "Fièvre et céphalées depuis 3 jours",
        symptoms: ["Fièvre", "Céphalées", "Myalgies", "Asthénie"],
        vitalSigns: {
          temperature: "38.5",
          bloodPressure: "125/80",
          heartRate: "95",
          oxygenSaturation: "98",
        },
        physicalExam:
          "Patient fébrile, état général conservé. Pas de raideur méningée. Examen ORL normal. Auscultation cardio-pulmonaire normale.",
      },
      questionsData: {
        responses: [
          { question: "Avez-vous des frissons ?", answer: "Oui, surtout le soir" },
          { question: "Avez-vous des nausées ou vomissements ?", answer: "Quelques nausées" },
          { question: "Avez-vous une toux ?", answer: "Non" },
          { question: "Avez-vous des douleurs abdominales ?", answer: "Non" },
          { question: "Avez-vous voyagé récemment ?", answer: "Non" },
        ],
      },
    },
    {
      id: "chest-pain",
      title: "Douleur Thoracique",
      severity: "severe",
      category: "Cardiologie",
      icon: Heart,
      description:
        "Homme de 55 ans avec douleur thoracique constrictive d'effort, facteurs de risque cardiovasculaires",
      expectedDiagnosis: "Angor stable probable",
      patientData: {
        age: 55,
        gender: "Homme",
        weight: 85,
        height: 175,
        allergies: "Aucune allergie connue",
        medicalHistory: "Hypertension artérielle, dyslipidémie",
        currentMedications: "Amlodipine 5mg, Atorvastatine 20mg",
        familyHistory: "Père décédé d'infarctus à 60 ans",
      },
      clinicalData: {
        chiefComplaint: "Douleur thoracique à l'effort depuis 2 semaines",
        symptoms: ["Douleur thoracique", "Dyspnée d'effort", "Fatigue"],
        vitalSigns: {
          temperature: "36.8",
          bloodPressure: "145/90",
          heartRate: "78",
          oxygenSaturation: "97",
        },
        physicalExam:
          "Surpoids. Auscultation cardiaque : rythme régulier, pas de souffle. Auscultation pulmonaire normale. Pas d'œdèmes des membres inférieurs.",
      },
      questionsData: {
        responses: [
          { question: "La douleur survient-elle à l'effort ?", answer: "Oui, systématiquement" },
          { question: "La douleur cède-t-elle au repos ?", answer: "Oui, en 2-3 minutes" },
          { question: "Fumez-vous ?", answer: "Ex-fumeur, arrêt il y a 2 ans" },
          { question: "Avez-vous du diabète ?", answer: "Non" },
          { question: "La douleur irradie-t-elle ?", answer: "Vers le bras gauche parfois" },
        ],
      },
    },
    {
      id: "headache",
      title: "Céphalées Récurrentes",
      severity: "mild",
      category: "Neurologie",
      icon: Brain,
      description: "Femme de 28 ans avec céphalées pulsatiles unilatérales récurrentes avec photophobie",
      expectedDiagnosis: "Migraine sans aura",
      patientData: {
        age: 28,
        gender: "Femme",
        weight: 58,
        height: 162,
        allergies: "Allergie à l'aspirine",
        medicalHistory: "RAS",
        currentMedications: "Contraception orale",
        familyHistory: "Mère migraineuse",
      },
      clinicalData: {
        chiefComplaint: "Céphalées récurrentes depuis 6 mois",
        symptoms: ["Céphalées pulsatiles", "Photophobie", "Nausées"],
        vitalSigns: {
          temperature: "36.7",
          bloodPressure: "110/70",
          heartRate: "68",
          oxygenSaturation: "99",
        },
        physicalExam: "Examen neurologique normal. Pas de raideur méningée. Fond d'œil normal. Pas de déficit focal.",
      },
      questionsData: {
        responses: [
          { question: "Les céphalées sont-elles unilatérales ?", answer: "Oui, souvent côté droit" },
          { question: "Y a-t-il des facteurs déclenchants ?", answer: "Stress, règles, manque de sommeil" },
          { question: "Avez-vous des troubles visuels avant la crise ?", answer: "Non" },
          { question: "Les céphalées durent-elles longtemps ?", answer: "4 à 12 heures" },
          { question: "Que prenez-vous comme traitement ?", answer: "Paracétamol, peu efficace" },
        ],
      },
    },
    {
      id: "abdominal-pain",
      title: "Douleur Abdominale",
      severity: "severe",
      category: "Gastroentérologie",
      icon: Stethoscope,
      description: "Homme de 42 ans avec douleur épigastrique intense irradiant vers l'épaule droite",
      expectedDiagnosis: "Cholécystite aiguë probable",
      patientData: {
        age: 42,
        gender: "Homme",
        weight: 95,
        height: 178,
        allergies: "Aucune allergie connue",
        medicalHistory: "Lithiase vésiculaire connue",
        currentMedications: "Aucun traitement",
        familyHistory: "RAS",
      },
      clinicalData: {
        chiefComplaint: "Douleur abdominale intense depuis 6 heures",
        symptoms: ["Douleur épigastrique", "Nausées", "Vomissements", "Fièvre"],
        vitalSigns: {
          temperature: "38.2",
          bloodPressure: "130/85",
          heartRate: "105",
          oxygenSaturation: "98",
        },
        physicalExam:
          "Douleur à la palpation de l'hypochondre droit. Signe de Murphy positif. Défense localisée. Pas d'ictère.",
      },
      questionsData: {
        responses: [
          { question: "La douleur irradie-t-elle ?", answer: "Oui, vers l'épaule droite" },
          { question: "Y a-t-il un facteur déclenchant ?", answer: "Repas gras hier soir" },
          { question: "Avez-vous déjà eu ce type de douleur ?", answer: "Oui, mais moins intense" },
          { question: "Avez-vous des troubles du transit ?", answer: "Non" },
          { question: "Prenez-vous des anti-inflammatoires ?", answer: "Non" },
        ],
      },
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return "bg-green-100 text-green-800"
      case "moderate":
        return "bg-yellow-100 text-yellow-800"
      case "severe":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "mild":
        return <CheckCircle className="h-4 w-4" />
      case "moderate":
        return <Clock className="h-4 w-4" />
      case "severe":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const runAITest = async (testCase: TestCase) => {
    setIsRunningTest(true)
    setTestResults(null)

    try {
      const startTime = Date.now()

      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: testCase.patientData,
          clinicalData: testCase.clinicalData,
          questionsData: testCase.questionsData,
        }),
      })

      const responseTime = Date.now() - startTime
      const result = await response.json()

      if (response.ok) {
        setTestResults({
          success: true,
          responseTime,
          diagnosis: result.diagnosis,
          recommendations: result.recommendations,
          expectedDiagnosis: testCase.expectedDiagnosis,
          testCase: testCase.title,
        })
      } else {
        setTestResults({
          success: false,
          error: result.error,
          testCase: testCase.title,
        })
      }
    } catch (error: any) {
      setTestResults({
        success: false,
        error: error.message,
        testCase: testCase.title,
      })
    }

    setIsRunningTest(false)
  }

  const loadTestCase = (testCase: TestCase) => {
    setSelectedCase(testCase.id)
    if (onTestCaseLoad) {
      onTestCaseLoad(testCase)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          <strong>Cas de Test Cliniques :</strong> Utilisez ces cas prédéfinis pour tester rapidement le système de
          diagnostic IA. Chaque cas contient des données patient réelles anonymisées.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cases">Cas Cliniques</TabsTrigger>
          <TabsTrigger value="results">Résultats de Test</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testCases.map((testCase) => {
              const Icon = testCase.icon
              return (
                <Card
                  key={testCase.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCase === testCase.id ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {testCase.title}
                      </CardTitle>
                      <Badge className={getSeverityColor(testCase.severity)}>
                        {getSeverityIcon(testCase.severity)}
                        <span className="ml-1 capitalize">{testCase.severity}</span>
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      <Badge variant="outline" className="mb-2">
                        {testCase.category}
                      </Badge>
                      <br />
                      {testCase.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <strong>Diagnostic attendu :</strong>
                      <div className="text-muted-foreground">{testCase.expectedDiagnosis}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => loadTestCase(testCase)} className="flex-1">
                        <User className="h-4 w-4 mr-1" />
                        Charger les Données
                      </Button>
                      <Button size="sm" onClick={() => runAITest(testCase)} disabled={isRunningTest} className="flex-1">
                        {isRunningTest ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                            Test...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Tester avec IA
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {testResults ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  Résultats du Test : {testResults.testCase}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testResults.success ? (
                  <>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">Temps de réponse: {testResults.responseTime}ms</Badge>
                      <Badge className="bg-green-100 text-green-800">✓ Test réussi</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Diagnostic IA</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div>
                              <strong>{testResults.diagnosis?.primary?.condition}</strong>
                              <Badge variant="outline" className="ml-2">
                                {testResults.diagnosis?.primary?.confidence}% confiance
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {testResults.diagnosis?.primary?.rationale}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Diagnostic Attendu</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="font-medium">{testResults.expectedDiagnosis}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {testResults.recommendations && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Recommandations IA</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {testResults.recommendations.exams?.length > 0 && (
                              <div>
                                <strong>Examens recommandés :</strong>
                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                  {testResults.recommendations.exams.map((exam: any, index: number) => (
                                    <li key={index}>
                                      {exam.name} - {exam.indication}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {testResults.recommendations.medications?.length > 0 && (
                              <div>
                                <strong>Traitements recommandés :</strong>
                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                  {testResults.recommendations.medications.map((med: any, index: number) => (
                                    <li key={index}>
                                      {med.name} - {med.dosage}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      <strong>Erreur lors du test :</strong>
                      <div className="mt-2 text-sm">{testResults.error}</div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TestTube className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">
                  Aucun test exécuté. Sélectionnez un cas clinique et cliquez sur "Tester avec IA".
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {selectedCase && (
        <Alert className="border-blue-200 bg-blue-50">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong>Cas sélectionné :</strong> Les données du cas "
            {testCases.find((tc) => tc.id === selectedCase)?.title}" ont été chargées. Vous pouvez maintenant passer à
            l'étape suivante ou continuer le workflow normal.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réinitialiser
        </Button>
        {selectedCase && onNext && <Button onClick={onNext}>Continuer avec le Cas Sélectionné</Button>}
      </div>
    </div>
  )
}
