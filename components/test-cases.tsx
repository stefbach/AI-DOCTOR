"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Heart, Brain, Baby, Stethoscope, TestTube, Loader2 } from "lucide-react"

interface TestCase {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  patientData: any
  clinicalData: any
  expectedQuestionTypes: string[]
}

const testCases: TestCase[] = [
  {
    id: "elderly-cardiac",
    name: "Patient Âgé - Cardiaque",
    description: "Homme de 75 ans avec antécédents cardiovasculaires",
    icon: <Heart className="h-5 w-5" />,
    patientData: {
      firstName: "Jean",
      lastName: "Dupont",
      age: 75,
      gender: "M",
      weight: 80,
      height: 175,
      bloodType: "A+",
      medicalHistory: ["Hypertension artérielle", "Infarctus du myocarde (2018)", "Diabète type 2"],
      currentMedications: ["Amlodipine 10mg", "Metformine 1000mg", "Aspirine 75mg", "Atorvastatine 20mg"],
      allergies: ["Pénicilline"],
      lifeHabits: {
        smoking: "Ancien fumeur",
        alcohol: "Occasionnel",
        physicalActivity: "Activité légère",
      },
    },
    clinicalData: {
      chiefComplaint: "Douleur thoracique et essoufflement depuis 2 jours",
      symptoms: ["Douleur thoracique", "Essoufflement", "Fatigue", "Palpitations"],
      symptomDuration: "1-3 jours",
      vitalSigns: {
        temperature: "36.8",
        heartRate: "95",
        bloodPressureSystolic: "160",
        bloodPressureDiastolic: "90",
      },
      painScale: 6,
      functionalStatus: "Impact modéré",
      notes: "Patient inquiet, douleur constrictive",
    },
    expectedQuestionTypes: ["cardiac_risk", "medication_compliance", "cognitive_assessment", "functional_decline"],
  },
  {
    id: "young-woman",
    name: "Jeune Femme - Gynécologique",
    description: "Femme de 28 ans avec symptômes cycliques",
    icon: <User className="h-5 w-5" />,
    patientData: {
      firstName: "Marie",
      lastName: "Martin",
      age: 28,
      gender: "F",
      weight: 65,
      height: 168,
      bloodType: "O+",
      medicalHistory: ["Endométriose"],
      currentMedications: ["Pilule contraceptive", "Ibuprofène au besoin"],
      allergies: [],
      lifeHabits: {
        smoking: "Jamais fumé",
        alcohol: "Occasionnel",
        physicalActivity: "Activité modérée",
      },
    },
    clinicalData: {
      chiefComplaint: "Douleurs pelviennes intenses et nausées",
      symptoms: ["Douleur abdominale", "Nausées", "Fatigue", "Maux de tête"],
      symptomDuration: "4-7 jours",
      vitalSigns: {
        temperature: "37.2",
        heartRate: "88",
        bloodPressureSystolic: "110",
        bloodPressureDiastolic: "70",
      },
      painScale: 8,
      functionalStatus: "Impact important",
      notes: "Douleurs cycliques, aggravation récente",
    },
    expectedQuestionTypes: ["menstrual_cycle", "hormonal_factors", "reproductive_health", "pain_characterization"],
  },
  {
    id: "pediatric",
    name: "Enfant - Pédiatrique",
    description: "Enfant de 8 ans avec fièvre et symptômes respiratoires",
    icon: <Baby className="h-5 w-5" />,
    patientData: {
      firstName: "Lucas",
      lastName: "Petit",
      age: 8,
      gender: "M",
      weight: 28,
      height: 130,
      bloodType: "B+",
      medicalHistory: ["Asthme léger"],
      currentMedications: ["Ventoline au besoin"],
      allergies: ["Arachides", "Pollen"],
      lifeHabits: {
        smoking: "Non applicable",
        alcohol: "Non applicable",
        physicalActivity: "Activité intense",
      },
    },
    clinicalData: {
      chiefComplaint: "Fièvre et toux depuis 3 jours",
      symptoms: ["Fièvre", "Toux", "Mal de gorge", "Fatigue"],
      symptomDuration: "3-7 jours",
      vitalSigns: {
        temperature: "38.5",
        heartRate: "110",
        bloodPressureSystolic: "95",
        bloodPressureDiastolic: "60",
      },
      painScale: 3,
      functionalStatus: "Impact modéré",
      notes: "Enfant grognon, refuse de manger",
    },
    expectedQuestionTypes: ["pediatric_development", "school_exposure", "family_symptoms", "vaccination_status"],
  },
  {
    id: "diabetic-elderly",
    name: "Diabétique Âgé - Complications",
    description: "Femme de 68 ans diabétique avec complications",
    icon: <TestTube className="h-5 w-5" />,
    patientData: {
      firstName: "Françoise",
      lastName: "Bernard",
      age: 68,
      gender: "F",
      weight: 85,
      height: 160,
      bloodType: "AB+",
      medicalHistory: ["Diabète type 2", "Rétinopathie diabétique", "Neuropathie périphérique", "Hypertension"],
      currentMedications: ["Insuline Lantus", "Metformine", "Ramipril", "Prégabaline"],
      allergies: ["Sulfamides"],
      lifeHabits: {
        smoking: "Jamais fumé",
        alcohol: "Jamais",
        physicalActivity: "Sédentaire",
      },
    },
    clinicalData: {
      chiefComplaint: "Plaie au pied qui ne guérit pas et vision floue",
      symptoms: ["Vision floue", "Douleur au pied", "Fatigue", "Soif excessive"],
      symptomDuration: "2-4 semaines",
      vitalSigns: {
        temperature: "37.0",
        heartRate: "78",
        bloodPressureSystolic: "145",
        bloodPressureDiastolic: "85",
      },
      painScale: 5,
      functionalStatus: "Impact important",
      notes: "Glycémies variables, plaie infectée possible",
    },
    expectedQuestionTypes: ["glycemic_control", "diabetic_complications", "wound_care", "medication_adherence"],
  },
  {
    id: "psychiatric",
    name: "Jeune Adulte - Psychiatrique",
    description: "Homme de 25 ans avec symptômes anxio-dépressifs",
    icon: <Brain className="h-5 w-5" />,
    patientData: {
      firstName: "Thomas",
      lastName: "Rousseau",
      age: 25,
      gender: "M",
      weight: 70,
      height: 180,
      bloodType: "A-",
      medicalHistory: ["Trouble anxieux généralisé", "Épisode dépressif majeur"],
      currentMedications: ["Sertraline 50mg", "Lorazépam au besoin"],
      allergies: [],
      lifeHabits: {
        smoking: "Fumeur actuel",
        alcohol: "Régulier",
        physicalActivity: "Sédentaire",
      },
    },
    clinicalData: {
      chiefComplaint: "Anxiété majeure, insomnie et idées noires depuis 2 semaines",
      symptoms: ["Anxiété", "Insomnie", "Fatigue", "Perte d'appétit", "Troubles de la concentration"],
      symptomDuration: "1-2 semaines",
      vitalSigns: {
        temperature: "36.5",
        heartRate: "92",
        bloodPressureSystolic: "125",
        bloodPressureDiastolic: "80",
      },
      painScale: 2,
      functionalStatus: "Impact important",
      notes: "Patient agité, évoque des difficultés professionnelles",
    },
    expectedQuestionTypes: ["suicide_risk", "substance_use", "social_support", "treatment_compliance"],
  },
  {
    id: "respiratory",
    name: "Adulte - Respiratoire",
    description: "Homme de 55 ans fumeur avec symptômes respiratoires",
    icon: <Stethoscope className="h-5 w-5" />,
    patientData: {
      firstName: "Pierre",
      lastName: "Moreau",
      age: 55,
      gender: "M",
      weight: 90,
      height: 175,
      bloodType: "O-",
      medicalHistory: ["BPCO", "Tabagisme chronique"],
      currentMedications: ["Spiriva", "Ventoline", "Prednisone"],
      allergies: ["Latex"],
      lifeHabits: {
        smoking: "Fumeur actuel",
        alcohol: "Important",
        physicalActivity: "Sédentaire",
      },
    },
    clinicalData: {
      chiefComplaint: "Essoufflement majoré et toux productive depuis 1 semaine",
      symptoms: ["Essoufflement", "Toux", "Expectorations", "Fatigue", "Douleur thoracique"],
      symptomDuration: "4-7 jours",
      vitalSigns: {
        temperature: "37.8",
        heartRate: "105",
        bloodPressureSystolic: "140",
        bloodPressureDiastolic: "85",
      },
      painScale: 4,
      functionalStatus: "Impact important",
      notes: "Expectorations purulentes, dyspnée d'effort majorée",
    },
    expectedQuestionTypes: ["smoking_cessation", "respiratory_function", "exacerbation_triggers", "oxygen_therapy"],
  },
]

export default function TestCases() {
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const runTest = async (testCase: TestCase) => {
    setSelectedTest(testCase)
    setIsGenerating(true)
    setError(null)
    setGeneratedQuestions([])

    try {
      console.log(`🧪 Test en cours: ${testCase.name}`)

      const response = await fetch("/api/openai-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData: testCase.patientData,
          clinicalData: testCase.clinicalData,
          numberOfQuestions: 8,
          focusArea: "diagnostic personnalisé",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (!data.success || !data.questions) {
        throw new Error("Réponse invalide de l'API")
      }

      setGeneratedQuestions(data.questions)

      // Analyser les résultats
      const analysis = analyzeQuestions(data.questions, testCase)
      setTestResults((prev) => ({
        ...prev,
        [testCase.id]: {
          questions: data.questions,
          analysis,
          metadata: data.metadata,
          timestamp: new Date().toISOString(),
        },
      }))

      console.log(`✅ Test ${testCase.name} terminé avec succès`)
      console.log(`📊 ${data.questions.length} questions générées`)
    } catch (error: any) {
      console.error(`❌ Erreur test ${testCase.name}:`, error)
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const analyzeQuestions = (questions: any[], testCase: TestCase) => {
    const analysis = {
      totalQuestions: questions.length,
      questionTypes: questions.map((q) => q.type),
      categories: questions.map((q) => q.category),
      priorities: questions.map((q) => q.priority),
      personalizationScore: 0,
      relevanceScore: 0,
      specificityScore: 0,
      recommendations: [] as string[],
    }

    // Score de personnalisation (basé sur les données patient)
    let personalizationPoints = 0
    questions.forEach((q) => {
      const questionText = q.question.toLowerCase()

      // Vérifier la personnalisation selon l'âge
      if (
        testCase.patientData.age > 65 &&
        (questionText.includes("mémoire") || questionText.includes("autonomie") || questionText.includes("chute"))
      ) {
        personalizationPoints += 2
      }

      // Vérifier la personnalisation selon le sexe
      if (testCase.patientData.gender === "F" && testCase.patientData.age >= 15 && testCase.patientData.age <= 50) {
        if (
          questionText.includes("menstruel") ||
          questionText.includes("cycle") ||
          questionText.includes("grossesse")
        ) {
          personalizationPoints += 2
        }
      }

      // Vérifier la personnalisation selon les antécédents
      testCase.patientData.medicalHistory?.forEach((condition: string) => {
        if (questionText.includes(condition.toLowerCase().split(" ")[0])) {
          personalizationPoints += 1
        }
      })

      // Vérifier la personnalisation selon les médicaments
      testCase.patientData.currentMedications?.forEach((med: string) => {
        const medName = med.toLowerCase().split(" ")[0]
        if (
          questionText.includes(medName) ||
          questionText.includes("médicament") ||
          questionText.includes("traitement")
        ) {
          personalizationPoints += 1
        }
      })
    })

    analysis.personalizationScore = Math.min(100, (personalizationPoints / questions.length) * 20)

    // Score de pertinence (basé sur les symptômes actuels)
    let relevancePoints = 0
    questions.forEach((q) => {
      const questionText = q.question.toLowerCase()
      testCase.clinicalData.symptoms?.forEach((symptom: string) => {
        if (questionText.includes(symptom.toLowerCase())) {
          relevancePoints += 1
        }
      })

      // Pertinence selon le motif de consultation
      const chiefComplaint = testCase.clinicalData.chiefComplaint.toLowerCase()
      if (chiefComplaint.includes("douleur") && questionText.includes("douleur")) {
        relevancePoints += 2
      }
      if (chiefComplaint.includes("essoufflement") && questionText.includes("essoufflement")) {
        relevancePoints += 2
      }
    })

    analysis.relevanceScore = Math.min(100, (relevancePoints / questions.length) * 15)

    // Score de spécificité (éviter les questions génériques)
    let specificityPoints = 0
    const genericPatterns = ["depuis quand", "avez-vous", "ressentez-vous", "comment"]
    questions.forEach((q) => {
      const questionText = q.question.toLowerCase()
      const isGeneric = genericPatterns.some((pattern) => questionText.startsWith(pattern))
      if (!isGeneric) {
        specificityPoints += 1
      }
    })

    analysis.specificityScore = (specificityPoints / questions.length) * 100

    // Recommandations
    if (analysis.personalizationScore < 50) {
      analysis.recommendations.push("Améliorer la personnalisation selon l'âge et les antécédents")
    }
    if (analysis.relevanceScore < 60) {
      analysis.recommendations.push("Mieux cibler les symptômes actuels")
    }
    if (analysis.specificityScore < 70) {
      analysis.recommendations.push("Éviter les questions trop génériques")
    }

    return analysis
  }

  const runAllTests = async () => {
    for (const testCase of testCases) {
      await runTest(testCase)
      // Pause entre les tests pour éviter la surcharge
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Tests de Génération de Questions IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={runAllTests} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Lancer Tous les Tests
            </Button>
            <Badge variant="outline">
              {Object.keys(testResults).length} / {testCases.length} tests complétés
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cases">Cas de Test</TabsTrigger>
          <TabsTrigger value="results">Résultats</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testCases.map((testCase) => (
              <Card key={testCase.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {testCase.icon}
                    {testCase.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{testCase.description}</p>

                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>Patient:</strong> {testCase.patientData.firstName} {testCase.patientData.lastName},
                      {testCase.patientData.age} ans, {testCase.patientData.gender}
                    </div>
                    <div>
                      <strong>Motif:</strong> {testCase.clinicalData.chiefComplaint}
                    </div>
                    <div>
                      <strong>Antécédents:</strong> {testCase.patientData.medicalHistory?.join(", ") || "Aucun"}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <Button size="sm" onClick={() => runTest(testCase)} disabled={isGenerating}>
                      {isGenerating && selectedTest?.id === testCase.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Tester"
                      )}
                    </Button>

                    {testResults[testCase.id] && <Badge variant="secondary">✓ Testé</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {selectedTest && generatedQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Résultats pour: {selectedTest.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedQuestions.map((question, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            question.priority === "high"
                              ? "destructive"
                              : question.priority === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {question.priority}
                        </Badge>
                        <Badge variant="outline">{question.category}</Badge>
                        <Badge variant="outline">{question.type}</Badge>
                      </div>
                      <h4 className="font-medium">{question.question}</h4>
                      {question.options && (
                        <div className="mt-2">
                          <strong>Options:</strong>
                          <ul className="list-disc list-inside ml-4">
                            {question.options.map((option: string, i: number) => (
                              <li key={i} className="text-sm">
                                {option}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Justification:</strong> {question.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {Object.entries(testResults).map(([testId, result]) => {
            const testCase = testCases.find((t) => t.id === testId)
            if (!testCase) return null

            return (
              <Card key={testId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {testCase.icon}
                    Analyse: {testCase.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(result.analysis.personalizationScore)}%
                      </div>
                      <div className="text-sm text-gray-600">Personnalisation</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(result.analysis.relevanceScore)}%
                      </div>
                      <div className="text-sm text-gray-600">Pertinence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(result.analysis.specificityScore)}%
                      </div>
                      <div className="text-sm text-gray-600">Spécificité</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <strong>Questions générées:</strong> {result.analysis.totalQuestions}
                    </div>
                    <div>
                      <strong>Types:</strong> {result.analysis.questionTypes.join(", ")}
                    </div>
                    <div>
                      <strong>Catégories:</strong> {[...new Set(result.analysis.categories)].join(", ")}
                    </div>
                    <div>
                      <strong>Priorités:</strong> {[...new Set(result.analysis.priorities)].join(", ")}
                    </div>
                  </div>

                  {result.analysis.recommendations.length > 0 && (
                    <div className="mt-4">
                      <strong>Recommandations:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {result.analysis.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-sm text-gray-600">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
