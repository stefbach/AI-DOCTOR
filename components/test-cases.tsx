"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Stethoscope, Activity, Brain, Clock, AlertTriangle, CheckCircle, Play, Loader2 } from "lucide-react"

interface TestCase {
  id: string
  title: string
  severity: "léger" | "modéré" | "sévère"
  category: string
  patientData: {
    firstName: string
    lastName: string
    age: number
    gender: string
    weight: number
    height: number
    allergies: string
    medicalHistory: string
    currentMedications: string
  }
  clinicalData: {
    chiefComplaint: string
    symptoms: string[]
    duration: string
    severity: string
    vitalSigns: {
      temperature: string
      bloodPressure: string
      heartRate: string
      respiratoryRate: string
      oxygenSaturation: string
    }
    physicalExam: string
  }
  questionsData: {
    responses: Array<{
      question: string
      answer: string
      importance: "high" | "medium" | "low"
    }>
  }
  expectedDiagnosis: {
    primary: string
    differential: string[]
    confidence: number
  }
  description: string
}

const testCases: TestCase[] = [
  {
    id: "case-1",
    title: "Syndrome Fébrile avec Céphalées",
    severity: "modéré",
    category: "Infectiologie",
    description: "Femme de 35 ans présentant une fièvre et des céphalées depuis 3 jours",
    patientData: {
      firstName: "Marie",
      lastName: "Dupont",
      age: 35,
      gender: "Femme",
      weight: 65,
      height: 165,
      allergies: "Pénicilline",
      medicalHistory: "Migraines occasionnelles",
      currentMedications: "Contraceptif oral",
    },
    clinicalData: {
      chiefComplaint: "Fièvre et maux de tête depuis 3 jours",
      symptoms: ["Fièvre", "Céphalées", "Fatigue", "Frissons", "Photophobie légère"],
      duration: "3 jours",
      severity: "Modérée",
      vitalSigns: {
        temperature: "38.5",
        bloodPressure: "125/80",
        heartRate: "95",
        respiratoryRate: "18",
        oxygenSaturation: "98",
      },
      physicalExam: "Raideur nucale absente, pas de signes méningés, examen neurologique normal",
    },
    questionsData: {
      responses: [
        {
          question: "Avez-vous des nausées ou vomissements ?",
          answer: "Quelques nausées mais pas de vomissements",
          importance: "high",
        },
        {
          question: "Avez-vous voyagé récemment ?",
          answer: "Non",
          importance: "medium",
        },
        {
          question: "Y a-t-il eu un contact avec une personne malade ?",
          answer: "Mon enfant a eu de la fièvre la semaine dernière",
          importance: "high",
        },
      ],
    },
    expectedDiagnosis: {
      primary: "Syndrome viral probable",
      differential: ["Grippe", "Infection virale des voies respiratoires", "Gastro-entérite virale"],
      confidence: 75,
    },
  },
  {
    id: "case-2",
    title: "Douleur Thoracique à l'Effort",
    severity: "sévère",
    category: "Cardiologie",
    description: "Homme de 55 ans avec douleur thoracique survenant à l'effort",
    patientData: {
      firstName: "Pierre",
      lastName: "Martin",
      age: 55,
      gender: "Homme",
      weight: 85,
      height: 175,
      allergies: "Aucune",
      medicalHistory: "Hypertension, diabète type 2, tabagisme",
      currentMedications: "Metformine, Lisinopril",
    },
    clinicalData: {
      chiefComplaint: "Douleur thoracique à l'effort depuis 2 semaines",
      symptoms: ["Douleur thoracique", "Essoufflement", "Fatigue à l'effort"],
      duration: "2 semaines",
      severity: "Modérée à sévère",
      vitalSigns: {
        temperature: "36.8",
        bloodPressure: "145/90",
        heartRate: "78",
        respiratoryRate: "16",
        oxygenSaturation: "97",
      },
      physicalExam: "Auscultation cardiaque normale au repos, pas de souffle, œdèmes des chevilles absents",
    },
    questionsData: {
      responses: [
        {
          question: "La douleur irradie-t-elle vers le bras ou la mâchoire ?",
          answer: "Parfois vers le bras gauche",
          importance: "high",
        },
        {
          question: "Combien de cigarettes fumez-vous par jour ?",
          answer: "Un paquet depuis 30 ans",
          importance: "high",
        },
        {
          question: "Avez-vous des antécédents familiaux de maladie cardiaque ?",
          answer: "Mon père a fait un infarctus à 60 ans",
          importance: "high",
        },
      ],
    },
    expectedDiagnosis: {
      primary: "Angor stable probable",
      differential: ["Maladie coronarienne", "Angor instable", "Cardiomyopathie ischémique"],
      confidence: 85,
    },
  },
  {
    id: "case-3",
    title: "Céphalées Récurrentes",
    severity: "léger",
    category: "Neurologie",
    description: "Femme de 28 ans avec céphalées récurrentes et troubles visuels",
    patientData: {
      firstName: "Sophie",
      lastName: "Bernard",
      age: 28,
      gender: "Femme",
      weight: 58,
      height: 162,
      allergies: "Aucune",
      medicalHistory: "Migraines depuis l'adolescence",
      currentMedications: "Contraceptif oral, Sumatriptan au besoin",
    },
    clinicalData: {
      chiefComplaint: "Céphalées avec troubles visuels depuis 1 semaine",
      symptoms: ["Céphalées pulsatiles", "Troubles visuels", "Nausées", "Sensibilité à la lumière"],
      duration: "1 semaine (épisodes récurrents)",
      severity: "Modérée",
      vitalSigns: {
        temperature: "36.7",
        bloodPressure: "110/70",
        heartRate: "72",
        respiratoryRate: "14",
        oxygenSaturation: "99",
      },
      physicalExam: "Examen neurologique normal, pas de signes focaux, fond d'œil normal",
    },
    questionsData: {
      responses: [
        {
          question: "Décrivez les troubles visuels",
          answer: "Aura visuelle avec zigzags lumineux avant la céphalée",
          importance: "high",
        },
        {
          question: "Y a-t-il des facteurs déclenchants ?",
          answer: "Stress, manque de sommeil, règles",
          importance: "medium",
        },
        {
          question: "Les céphalées ont-elles changé récemment ?",
          answer: "Plus fréquentes depuis 2 mois",
          importance: "high",
        },
      ],
    },
    expectedDiagnosis: {
      primary: "Migraine avec aura",
      differential: ["Migraine sans aura", "Céphalée de tension", "Céphalée hormonale"],
      confidence: 90,
    },
  },
  {
    id: "case-4",
    title: "Douleur Abdominale Aiguë",
    severity: "sévère",
    category: "Gastroentérologie",
    description: "Homme de 42 ans avec douleur abdominale aiguë et fièvre",
    patientData: {
      firstName: "Jean",
      lastName: "Moreau",
      age: 42,
      gender: "Homme",
      weight: 78,
      height: 180,
      allergies: "Aucune",
      medicalHistory: "Lithiase biliaire connue",
      currentMedications: "Aucun",
    },
    clinicalData: {
      chiefComplaint: "Douleur abdominale intense depuis 6 heures",
      symptoms: ["Douleur épigastrique", "Fièvre", "Nausées", "Vomissements"],
      duration: "6 heures",
      severity: "Sévère",
      vitalSigns: {
        temperature: "38.8",
        bloodPressure: "130/85",
        heartRate: "105",
        respiratoryRate: "20",
        oxygenSaturation: "98",
      },
      physicalExam: "Douleur à la palpation de l'hypochondre droit, signe de Murphy positif, défense localisée",
    },
    questionsData: {
      responses: [
        {
          question: "La douleur irradie-t-elle quelque part ?",
          answer: "Vers l'épaule droite et le dos",
          importance: "high",
        },
        {
          question: "Avez-vous déjà eu ce type de douleur ?",
          answer: "Oui, mais moins intense, après des repas gras",
          importance: "high",
        },
        {
          question: "Avez-vous remarqué une coloration des urines ou selles ?",
          answer: "Urines foncées depuis hier",
          importance: "high",
        },
      ],
    },
    expectedDiagnosis: {
      primary: "Cholécystite aiguë",
      differential: ["Lithiase biliaire compliquée", "Angiocholite", "Pancréatite aiguë"],
      confidence: 88,
    },
  },
]

interface TestCasesProps {
  onTestCaseLoad?: (testCase: TestCase) => void
  onComplete?: (data: any) => void
}

export default function TestCases({ onTestCaseLoad, onComplete }: TestCasesProps) {
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const runDiagnosticTest = async (testCase: TestCase) => {
    setIsRunningTest(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: testCase.patientData,
          clinicalData: testCase.clinicalData,
          questionsData: testCase.questionsData,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setTestResult({
          success: true,
          aiDiagnosis: result,
          expected: testCase.expectedDiagnosis,
          testCase: testCase,
        })
      } else {
        const error = await response.json()
        setTestResult({
          success: false,
          error: error.error || "Erreur lors du diagnostic",
        })
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: `Erreur de connexion: ${error.message}`,
      })
    }

    setIsRunningTest(false)
  }

  const loadTestCase = (testCase: TestCase) => {
    if (onTestCaseLoad) {
      onTestCaseLoad(testCase)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "léger":
        return "bg-green-100 text-green-800"
      case "modéré":
        return "bg-yellow-100 text-yellow-800"
      case "sévère":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Cas de Test Cliniques
          </CardTitle>
          <CardDescription>
            Testez le système avec des cas cliniques réels et comparez les résultats du diagnostic IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testCases.map((testCase) => (
              <Card key={testCase.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{testCase.title}</CardTitle>
                    <Badge className={getSeverityColor(testCase.severity)}>{testCase.severity}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{testCase.category}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {testCase.patientData.gender}, {testCase.patientData.age} ans
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{testCase.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>
                        {testCase.patientData.firstName} {testCase.patientData.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Stethoscope className="h-4 w-4" />
                      <span>{testCase.clinicalData.chiefComplaint}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Durée: {testCase.clinicalData.duration}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCase(testCase)
                        runDiagnosticTest(testCase)
                      }}
                      disabled={isRunningTest}
                      className="flex-1"
                    >
                      {isRunningTest && selectedCase?.id === testCase.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Test en cours...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Tester avec IA
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadTestCase(testCase)}>
                      Charger le Cas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Résultats du Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.success ? (
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="comparison">Comparaison</TabsTrigger>
                  <TabsTrigger value="ai-result">Diagnostic IA</TabsTrigger>
                  <TabsTrigger value="expected">Diagnostic Attendu</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-600">Diagnostic IA</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Principal:</span>
                            <p className="text-sm">{testResult.aiDiagnosis.primaryDiagnosis}</p>
                          </div>
                          <div>
                            <span className="font-medium">Confiance:</span>
                            <Badge variant="outline" className="ml-2">
                              {testResult.aiDiagnosis.confidence}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-green-600">Diagnostic Attendu</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Principal:</span>
                            <p className="text-sm">{testResult.expected.primary}</p>
                          </div>
                          <div>
                            <span className="font-medium">Confiance:</span>
                            <Badge variant="outline" className="ml-2">
                              {testResult.expected.confidence}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Activity className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Analyse:</strong> Le diagnostic IA sera comparé automatiquement avec le diagnostic
                      attendu. Les différences peuvent indiquer des points d'amélioration ou des perspectives
                      alternatives valides.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="ai-result" className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium">Diagnostic Principal</h4>
                          <p className="text-sm">{testResult.aiDiagnosis.primaryDiagnosis}</p>
                        </div>

                        {testResult.aiDiagnosis.differentialDiagnoses && (
                          <div>
                            <h4 className="font-medium">Diagnostics Différentiels</h4>
                            <ul className="text-sm list-disc list-inside">
                              {testResult.aiDiagnosis.differentialDiagnoses.map((diagnosis: string, index: number) => (
                                <li key={index}>{diagnosis}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {testResult.aiDiagnosis.reasoning && (
                          <div>
                            <h4 className="font-medium">Raisonnement</h4>
                            <p className="text-sm">{testResult.aiDiagnosis.reasoning}</p>
                          </div>
                        )}

                        {testResult.aiDiagnosis.recommendations && (
                          <div>
                            <h4 className="font-medium">Recommandations</h4>
                            <ul className="text-sm list-disc list-inside">
                              {testResult.aiDiagnosis.recommendations.map((rec: string, index: number) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="expected" className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium">Diagnostic Principal Attendu</h4>
                          <p className="text-sm">{testResult.expected.primary}</p>
                        </div>

                        <div>
                          <h4 className="font-medium">Diagnostics Différentiels Attendus</h4>
                          <ul className="text-sm list-disc list-inside">
                            {testResult.expected.differential.map((diagnosis: string, index: number) => (
                              <li key={index}>{diagnosis}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium">Niveau de Confiance Attendu</h4>
                          <Badge variant="outline">{testResult.expected.confidence}%</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Erreur lors du test:</strong> {testResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
