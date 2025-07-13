"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, AlertCircle, Loader2, Play, FileText, Clock, Target } from "lucide-react"

interface TestCase {
  id: string
  name: string
  description: string
  patientData: any
  clinicalData: any
  questionsData: any
  expectedDiagnosis: {
    condition: string
    icd10: string
    confidence: number
  }
  expectedExams: string[]
  expectedMedications: string[]
}

interface TestResult {
  testCase: TestCase
  actualDiagnosis?: any
  score: number
  details: {
    diagnosisMatch: boolean
    examMatch: number
    medicationMatch: number
    responseTime: number
  }
  status: "success" | "partial" | "failed"
  error?: string
}

const testCases: TestCase[] = [
  {
    id: "hypertension-case",
    name: "Hypertension Artérielle",
    description: "Patient de 55 ans avec HTA nouvellement diagnostiquée",
    patientData: {
      age: 55,
      gender: "Homme",
      allergies: "Aucune",
      medicalHistory: "Diabète type 2, surpoids",
    },
    clinicalData: {
      chiefComplaint: "Céphalées matinales et vertiges",
      symptoms: ["Céphalées", "Vertiges", "Fatigue", "Vision floue"],
      vitalSigns: {
        bloodPressure: "165/95",
        heartRate: "78",
        temperature: "36.8",
        oxygenSaturation: "98",
      },
      physicalExam: "Souffle cardiaque léger, pas d'œdème des membres inférieurs",
    },
    questionsData: {
      responses: [
        { question: "Antécédents familiaux d'HTA ?", answer: "Oui, père et mère" },
        { question: "Consommation de sel ?", answer: "Élevée" },
        { question: "Activité physique ?", answer: "Sédentaire" },
        { question: "Stress professionnel ?", answer: "Élevé" },
      ],
    },
    expectedDiagnosis: {
      condition: "Hypertension artérielle",
      icd10: "I10",
      confidence: 85,
    },
    expectedExams: ["Bilan lipidique", "Créatininémie", "ECG", "Fond d'œil"],
    expectedMedications: ["IEC", "Diurétique", "Antihypertenseur"],
  },
  {
    id: "respiratory-infection",
    name: "Infection Respiratoire",
    description: "Patiente de 35 ans avec syndrome grippal",
    patientData: {
      age: 35,
      gender: "Femme",
      allergies: "Pénicilline",
      medicalHistory: "Asthme léger",
    },
    clinicalData: {
      chiefComplaint: "Toux et fièvre depuis 3 jours",
      symptoms: ["Toux productive", "Fièvre", "Dyspnée", "Douleurs thoraciques"],
      vitalSigns: {
        bloodPressure: "120/75",
        heartRate: "95",
        temperature: "38.5",
        oxygenSaturation: "94",
      },
      physicalExam: "Râles crépitants base droite, matité à la percussion",
    },
    questionsData: {
      responses: [
        { question: "Exposition récente ?", answer: "Collègue malade" },
        { question: "Vaccination grippe ?", answer: "Non" },
        { question: "Tabagisme ?", answer: "Non" },
        { question: "Voyage récent ?", answer: "Non" },
      ],
    },
    expectedDiagnosis: {
      condition: "Pneumonie communautaire",
      icd10: "J18",
      confidence: 80,
    },
    expectedExams: ["Radiographie thoracique", "CRP", "Hémocultures", "ECBC"],
    expectedMedications: ["Macrolide", "Bronchodilatateur", "Antipyrétique"],
  },
  {
    id: "abdominal-pain",
    name: "Douleurs Abdominales",
    description: "Patient de 42 ans avec douleurs abdominales aiguës",
    patientData: {
      age: 42,
      gender: "Homme",
      allergies: "Aucune",
      medicalHistory: "Lithiase biliaire connue",
    },
    clinicalData: {
      chiefComplaint: "Douleur épigastrique intense depuis 2h",
      symptoms: ["Douleur épigastrique", "Nausées", "Vomissements", "Irradiation dorsale"],
      vitalSigns: {
        bloodPressure: "140/85",
        heartRate: "105",
        temperature: "37.8",
        oxygenSaturation: "98",
      },
      physicalExam: "Défense épigastrique, Murphy positif, pas d'ictère",
    },
    questionsData: {
      responses: [
        { question: "Relation avec les repas ?", answer: "Après repas gras" },
        { question: "Douleur similaire antérieure ?", answer: "Oui, moins intense" },
        { question: "Alcool ?", answer: "Occasionnel" },
        { question: "Perte de poids ?", answer: "Non" },
      ],
    },
    expectedDiagnosis: {
      condition: "Cholécystite aiguë",
      icd10: "K80.0",
      confidence: 85,
    },
    expectedExams: ["Échographie abdominale", "Bilan hépatique", "Lipasémie", "NFS"],
    expectedMedications: ["Antispasmodique", "Antalgique", "Antibiotique"],
  },
  {
    id: "diabetes-followup",
    name: "Suivi Diabète",
    description: "Patiente de 60 ans en suivi de diabète type 2",
    patientData: {
      age: 60,
      gender: "Femme",
      allergies: "Sulfamides",
      medicalHistory: "Diabète type 2, HTA, dyslipidémie",
    },
    clinicalData: {
      chiefComplaint: "Contrôle diabète et fatigue",
      symptoms: ["Fatigue", "Polyurie", "Polydipsie", "Vision floue"],
      vitalSigns: {
        bloodPressure: "150/90",
        heartRate: "72",
        temperature: "36.5",
        oxygenSaturation: "98",
      },
      physicalExam: "IMC 32, pas de signes de complications",
    },
    questionsData: {
      responses: [
        { question: "Observance traitement ?", answer: "Irrégulière" },
        { question: "Régime alimentaire ?", answer: "Difficile à suivre" },
        { question: "Dernière HbA1c ?", answer: "9.2%" },
        { question: "Activité physique ?", answer: "Nulle" },
      ],
    },
    expectedDiagnosis: {
      condition: "Diabète type 2 déséquilibré",
      icd10: "E11.9",
      confidence: 90,
    },
    expectedExams: ["HbA1c", "Bilan lipidique", "Microalbuminurie", "Fond d'œil"],
    expectedMedications: ["Metformine", "Insuline", "Statine"],
  },
]

export default function TestCases() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [currentTestIndex, setCurrentTestIndex] = useState(-1)
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)

  const calculateScore = (testCase: TestCase, actualDiagnosis: any): TestResult => {
    let score = 0
    const details = {
      diagnosisMatch: false,
      examMatch: 0,
      medicationMatch: 0,
      responseTime: 0,
    }

    // Vérification du diagnostic (40% du score)
    if (actualDiagnosis?.diagnosis?.primary?.condition) {
      const actualCondition = actualDiagnosis.diagnosis.primary.condition.toLowerCase()
      const expectedCondition = testCase.expectedDiagnosis.condition.toLowerCase()

      if (actualCondition.includes(expectedCondition) || expectedCondition.includes(actualCondition)) {
        details.diagnosisMatch = true
        score += 40
      }
    }

    // Vérification des examens recommandés (30% du score)
    if (actualDiagnosis?.recommendations?.exams) {
      const actualExams = actualDiagnosis.recommendations.exams.map((e: any) => e.name.toLowerCase())
      const matchedExams = testCase.expectedExams.filter((expectedExam) =>
        actualExams.some((actualExam) => actualExam.includes(expectedExam.toLowerCase())),
      )
      details.examMatch = (matchedExams.length / testCase.expectedExams.length) * 100
      score += (details.examMatch / 100) * 30
    }

    // Vérification des médicaments (30% du score)
    if (actualDiagnosis?.recommendations?.medications) {
      const actualMeds = actualDiagnosis.recommendations.medications.map((m: any) => m.name.toLowerCase())
      const matchedMeds = testCase.expectedMedications.filter((expectedMed) =>
        actualMeds.some((actualMed) => actualMed.includes(expectedMed.toLowerCase())),
      )
      details.medicationMatch = (matchedMeds.length / testCase.expectedMedications.length) * 100
      score += (details.medicationMatch / 100) * 30
    }

    const status = score >= 80 ? "success" : score >= 50 ? "partial" : "failed"

    return {
      testCase,
      actualDiagnosis,
      score: Math.round(score),
      details,
      status,
    }
  }

  const runSingleTest = async (testCase: TestCase): Promise<TestResult> => {
    const startTime = Date.now()

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

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json()
        return {
          testCase,
          score: 0,
          details: {
            diagnosisMatch: false,
            examMatch: 0,
            medicationMatch: 0,
            responseTime,
          },
          status: "failed",
          error: errorData.error || `Erreur HTTP ${response.status}`,
        }
      }

      const actualDiagnosis = await response.json()
      const result = calculateScore(testCase, actualDiagnosis)
      result.details.responseTime = responseTime

      return result
    } catch (error: any) {
      return {
        testCase,
        score: 0,
        details: {
          diagnosisMatch: false,
          examMatch: 0,
          medicationMatch: 0,
          responseTime: Date.now() - startTime,
        },
        status: "failed",
        error: error.message,
      }
    }
  }

  const runAllTests = async () => {
    setIsRunningTests(true)
    setTestResults([])
    setCurrentTestIndex(0)

    const results: TestResult[] = []

    for (let i = 0; i < testCases.length; i++) {
      setCurrentTestIndex(i)
      const result = await runSingleTest(testCases[i])
      results.push(result)
      setTestResults([...results])
    }

    setCurrentTestIndex(-1)
    setIsRunningTests(false)
  }

  const loadTestCaseIntoWorkflow = (testCase: TestCase) => {
    // Stocker les données du cas de test dans le localStorage pour le workflow principal
    localStorage.setItem(
      "medicalWorkflowData",
      JSON.stringify({
        patientData: testCase.patientData,
        clinicalData: testCase.clinicalData,
        questionsData: testCase.questionsData,
        fromTestCase: true,
        testCaseName: testCase.name,
      }),
    )

    // Rediriger vers le workflow principal
    window.location.href = "/"
  }

  const getStatusIcon = (status: "success" | "partial" | "failed") => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "partial":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: "success" | "partial" | "failed", score: number) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">✓ Réussi ({score}%)</Badge>
      case "partial":
        return <Badge variant="secondary">⚠ Partiel ({score}%)</Badge>
      case "failed":
        return <Badge variant="destructive">✗ Échec ({score}%)</Badge>
    }
  }

  const averageScore =
    testResults.length > 0
      ? Math.round(testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length)
      : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Tests de Performance IA Médicale
          </CardTitle>
          <CardDescription>Évaluez la précision du système avec des cas cliniques prédéfinis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runAllTests} disabled={isRunningTests} className="flex-1">
              {isRunningTests ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test en cours... ({currentTestIndex + 1}/{testCases.length})
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Lancer Tous les Tests
                </>
              )}
            </Button>

            {testResults.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Score Moyen: {averageScore}%
                </Badge>
              </div>
            )}
          </div>

          {isRunningTests && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression des tests</span>
                <span>
                  {currentTestIndex + 1}/{testCases.length}
                </span>
              </div>
              <Progress value={((currentTestIndex + 1) / testCases.length) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cases">Cas de Test</TabsTrigger>
          <TabsTrigger value="results">Résultats</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testCases.map((testCase) => (
              <Card key={testCase.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{testCase.name}</CardTitle>
                  <CardDescription>{testCase.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Patient:</strong> {testCase.patientData.gender}, {testCase.patientData.age} ans
                    </div>
                    <div>
                      <strong>Motif:</strong> {testCase.clinicalData.chiefComplaint}
                    </div>
                    <div>
                      <strong>Diagnostic attendu:</strong> {testCase.expectedDiagnosis.condition}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTestCase(testCase)}
                      className="flex-1"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Détails
                    </Button>
                    <Button size="sm" onClick={() => loadTestCaseIntoWorkflow(testCase)} className="flex-1">
                      <Play className="h-3 w-3 mr-1" />
                      Charger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {testResults.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun test n'a encore été exécuté. Lancez les tests pour voir les résultats.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <Card
                  key={index}
                  className={
                    result.status === "success"
                      ? "border-green-200"
                      : result.status === "partial"
                        ? "border-orange-200"
                        : "border-red-200"
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        {result.testCase.name}
                      </CardTitle>
                      {getStatusBadge(result.status, result.score)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.error ? (
                      <Alert className="border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <AlertDescription>
                          <strong>Erreur:</strong> {result.error}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">Diagnostic</div>
                          <div className={result.details.diagnosisMatch ? "text-green-600" : "text-red-600"}>
                            {result.details.diagnosisMatch ? "✓ Correct" : "✗ Incorrect"}
                          </div>
                          {result.actualDiagnosis?.diagnosis?.primary?.condition && (
                            <div className="text-muted-foreground">
                              Reçu: {result.actualDiagnosis.diagnosis.primary.condition}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="font-medium">Examens</div>
                          <div className={result.details.examMatch >= 50 ? "text-green-600" : "text-orange-600"}>
                            {Math.round(result.details.examMatch)}% de correspondance
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="font-medium">Médicaments</div>
                          <div className={result.details.medicationMatch >= 50 ? "text-green-600" : "text-orange-600"}>
                            {Math.round(result.details.medicationMatch)}% de correspondance
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {result.details.responseTime}ms
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedTestCase && (
        <Card>
          <CardHeader>
            <CardTitle>Détails du Cas: {selectedTestCase.name}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSelectedTestCase(null)} className="w-fit">
              Fermer
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Données Patient</h4>
                  <div className="text-sm space-y-1">
                    <div>Âge: {selectedTestCase.patientData.age} ans</div>
                    <div>Sexe: {selectedTestCase.patientData.gender}</div>
                    <div>Allergies: {selectedTestCase.patientData.allergies}</div>
                    <div>Antécédents: {selectedTestCase.patientData.medicalHistory}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Données Cliniques</h4>
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Motif:</strong> {selectedTestCase.clinicalData.chiefComplaint}
                    </div>
                    <div>
                      <strong>Symptômes:</strong> {selectedTestCase.clinicalData.symptoms.join(", ")}
                    </div>
                    <div>
                      <strong>Signes vitaux:</strong>
                    </div>
                    <div className="ml-4">
                      <div>TA: {selectedTestCase.clinicalData.vitalSigns.bloodPressure}</div>
                      <div>FC: {selectedTestCase.clinicalData.vitalSigns.heartRate} bpm</div>
                      <div>T°: {selectedTestCase.clinicalData.vitalSigns.temperature}°C</div>
                      <div>SpO2: {selectedTestCase.clinicalData.vitalSigns.oxygenSaturation}%</div>
                    </div>
                    <div>
                      <strong>Examen:</strong> {selectedTestCase.clinicalData.physicalExam}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Questions/Réponses</h4>
                  <div className="text-sm space-y-1">
                    {selectedTestCase.questionsData.responses.map((response, index) => (
                      <div key={index}>
                        <strong>Q:</strong> {response.question}
                        <br />
                        <strong>R:</strong> {response.answer}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Résultats Attendus</h4>
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Diagnostic:</strong> {selectedTestCase.expectedDiagnosis.condition} (
                      {selectedTestCase.expectedDiagnosis.icd10})
                    </div>
                    <div>
                      <strong>Examens:</strong> {selectedTestCase.expectedExams.join(", ")}
                    </div>
                    <div>
                      <strong>Médicaments:</strong> {selectedTestCase.expectedMedications.join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => loadTestCaseIntoWorkflow(selectedTestCase)} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Charger ce Cas dans le Workflow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
