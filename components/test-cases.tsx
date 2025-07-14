"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  User,
  Heart,
  Brain,
  Baby,
  Stethoscope,
  TestTube,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Target,
  Play,
} from "lucide-react"

interface TestCase {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  patientData: any
  clinicalData: any
  expectedQuestionTypes: string[]
  simulatedResponses?: { [key: string]: string }
  expectedDiagnosis?: {
    primary: string
    confidence: number
    differentials: string[]
  }
}

interface DiagnosticTestResult {
  testCase: TestCase
  questions: any[]
  responses: any[]
  diagnosis: any
  analysis: {
    questionQuality: number
    responseRelevance: number
    diagnosticAccuracy: number
    overallScore: number
    recommendations: string[]
  }
  timing: {
    questionsGeneration: number
    diagnosisGeneration: number
    total: number
  }
  success: boolean
  error?: string
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
    simulatedResponses: {
      douleur_irradiation: "Oui, vers le bras gauche et la mâchoire",
      effort_declencheur: "Oui, à l'effort et au stress",
      medicaments_pris: "Oui, tous les jours comme prescrit",
      symptomes_nuit: "Oui, réveils nocturnes avec essoufflement",
      antecedents_familiaux: "Père décédé d'infarctus �� 70 ans",
      tabac_arret: "Arrêt il y a 5 ans, fumait 1 paquet/jour pendant 40 ans",
      activite_limitee: "Oui, ne peut plus monter les escaliers sans s'arrêter",
      stress_recent: "Oui, décès de l'épouse il y a 3 mois",
    },
    expectedDiagnosis: {
      primary: "Syndrome coronarien aigu",
      confidence: 85,
      differentials: ["Insuffisance cardiaque", "Angor instable", "Embolie pulmonaire"],
    },
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
    simulatedResponses: {
      cycle_menstruel: "Cycles réguliers de 28 jours, règles douloureuses",
      douleur_regles: "Oui, très douloureuses depuis l'adolescence, aggravation récente",
      contraception: "Pilule depuis 5 ans, prise régulière",
      rapports_douloureux: "Oui, dyspareunie profonde",
      fertilite_desir: "Désir de grossesse dans 1-2 ans",
      traitement_endometriose: "Traitement hormonal antérieur, arrêté il y a 6 mois",
      symptomes_digestifs: "Ballonnements et troubles du transit pendant les règles",
      fatigue_chronique: "Oui, fatigue importante surtout en période menstruelle",
    },
    expectedDiagnosis: {
      primary: "Poussée d'endométriose",
      confidence: 80,
      differentials: ["Kyste ovarien", "Syndrome de l'intestin irritable", "Appendicite"],
    },
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
    simulatedResponses: {
      ecole_epidemie: "Oui, plusieurs enfants malades dans la classe",
      vaccinations: "À jour selon le calendrier vaccinal",
      appetit: "Refuse de manger depuis 2 jours, boit peu",
      sommeil: "Sommeil agité, réveils fréquents",
      jeu_activite: "Moins actif, reste couché, ne joue pas",
      famille_malade: "Papa a eu mal de gorge la semaine dernière",
      medicaments_donnes: "Paracétamol et Ventoline selon besoin",
      respiration: "Toux sèche la nuit, respiration un peu sifflante",
    },
    expectedDiagnosis: {
      primary: "Infection virale des voies respiratoires",
      confidence: 75,
      differentials: ["Pneumonie", "Exacerbation asthmatique", "Angine streptococcique"],
    },
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
    simulatedResponses: {
      glycemies: "Variables, entre 1.5 et 3.5 g/L, difficiles à contrôler",
      insuline_prise: "Oui, mais parfois oublie le soir",
      plaie_evolution: "Apparue il y a 3 semaines, ne cicatrise pas, rougeur autour",
      vision_changement: "Vision floue progressive depuis 1 mois",
      pieds_sensation: "Fourmillements et engourdissements, ne sent pas bien",
      regime_alimentaire: "Difficile à suivre, écarts fréquents",
      controles_medicaux: "Dernière consultation diabéto il y a 6 mois",
      soif_urines: "Oui, boit beaucoup et urine souvent, surtout la nuit",
    },
    expectedDiagnosis: {
      primary: "Diabète décompensé avec complications",
      confidence: 90,
      differentials: ["Infection du pied diabétique", "Rétinopathie évolutive", "Acidocétose"],
    },
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
    simulatedResponses: {
      idees_suicidaires: "Oui, pensées de mort mais pas de plan précis",
      alcool_quantite: "4-5 verres par jour, augmentation récente",
      travail_stress: "Licenciement il y a 1 mois, recherche d'emploi difficile",
      soutien_famille: "Parents inquiets mais relation tendue",
      medicaments_efficacite: "Sertraline moins efficace, augmente le Lorazépam",
      sommeil: "Endormissement difficile, réveils à 4h du matin",
      activites_plaisir: "Plus rien ne m'intéresse, isolement social",
      antecedents_tentative: "Non, mais y pense de plus en plus",
    },
    expectedDiagnosis: {
      primary: "Épisode dépressif majeur sévère",
      confidence: 85,
      differentials: ["Trouble bipolaire", "Trouble de l'adaptation", "Trouble lié à l'alcool"],
    },
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
    simulatedResponses: {
      tabac_quantite: "1.5 paquet par jour depuis 35 ans, pas d'arrêt envisagé",
      expectorations: "Jaunes-vertes, plus abondantes le matin",
      essoufflement_evolution: "Aggravation progressive, maintenant au repos",
      infections_recentes: "Bronchite il y a 2 mois, antibiotiques",
      medicaments_soulagement: "Ventoline de plus en plus souvent, peu efficace",
      activite_limitee: "Ne peut plus faire les courses, escaliers impossibles",
      oxygene_domicile: "Non, mais y pense car très essoufflé",
      entourage_fumeur: "Épouse fumeuse aussi, fument à la maison",
    },
    expectedDiagnosis: {
      primary: "Exacerbation de BPCO",
      confidence: 88,
      differentials: ["Pneumonie", "Insuffisance cardiaque", "Embolie pulmonaire"],
    },
  },
]

export default function TestCases() {
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null)
  const [isRunningDiagnosticTest, setIsRunningDiagnosticTest] = useState(false)
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, DiagnosticTestResult>>({})
  const [currentTestProgress, setCurrentTestProgress] = useState(0)
  const [currentTestStep, setCurrentTestStep] = useState("")

  const simulateResponsesForQuestions = (questions: any[], testCase: TestCase): any[] => {
    return questions.map((question, index) => {
      const questionText = question.question.toLowerCase()
      let answer = "Information non disponible"

      // Recherche de correspondance avec les réponses simulées
      for (const [key, value] of Object.entries(testCase.simulatedResponses || {})) {
        if (
          questionText.includes(key.split("_")[0]) ||
          questionText.includes(key.split("_")[1]) ||
          questionText.includes(key.replace("_", " "))
        ) {
          answer = value
          break
        }
      }

      // Réponses génériques basées sur le type de question
      if (answer === "Information non disponible") {
        if (question.type === "yes_no") {
          answer = Math.random() > 0.5 ? "Oui" : "Non"
        } else if (question.type === "scale") {
          answer = Math.floor(Math.random() * 10) + 1
        } else if (question.type === "multiple_choice" && question.options) {
          answer = question.options[Math.floor(Math.random() * question.options.length)]
        } else {
          // Réponses contextuelles basées sur le cas
          if (questionText.includes("douleur")) {
            answer = "Douleur modérée, constante, aggravée par l'effort"
          } else if (questionText.includes("symptôme")) {
            answer = "Présent depuis le début, évolution progressive"
          } else if (questionText.includes("traitement")) {
            answer = "Prise régulière selon prescription"
          } else {
            answer = "Symptôme présent, impact sur la vie quotidienne"
          }
        }
      }

      return {
        questionId: question.id,
        question: question.question,
        answer: answer,
        type: question.type,
      }
    })
  }

  const runCompleteDiagnosticTest = async (testCase: TestCase) => {
    setSelectedTest(testCase)
    setIsRunningDiagnosticTest(true)
    setCurrentTestProgress(0)
    setCurrentTestStep("Initialisation du test...")

    const startTime = Date.now()
    let questionsTime = 0
    let diagnosisTime = 0

    try {
      console.log(`🧪 Test diagnostic complet: ${testCase.name}`)

      // Étape 1: Génération des questions
      setCurrentTestStep("Génération des questions personnalisées...")
      setCurrentTestProgress(20)

      const questionsStart = Date.now()
      const questionsResponse = await fetch("/api/openai-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: testCase.patientData,
          clinicalData: testCase.clinicalData,
          numberOfQuestions: 8,
          focusArea: "diagnostic complet",
        }),
      })

      if (!questionsResponse.ok) {
        throw new Error(`Erreur génération questions: ${questionsResponse.status}`)
      }

      const questionsData = await questionsResponse.json()
      if (!questionsData.success || !questionsData.questions) {
        throw new Error("Questions non générées")
      }

      questionsTime = Date.now() - questionsStart
      console.log(`✅ ${questionsData.questions.length} questions générées en ${questionsTime}ms`)

      // Étape 2: Simulation des réponses
      setCurrentTestStep("Simulation des réponses patient...")
      setCurrentTestProgress(40)

      const simulatedResponses = simulateResponsesForQuestions(questionsData.questions, testCase)
      console.log(`✅ ${simulatedResponses.length} réponses simulées`)

      // Étape 3: Génération du diagnostic
      setCurrentTestStep("Génération du diagnostic IA...")
      setCurrentTestProgress(60)

      const diagnosisStart = Date.now()
      const diagnosisResponse = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: testCase.patientData,
          clinicalData: testCase.clinicalData,
          questionsData: { responses: simulatedResponses },
        }),
      })

      if (!diagnosisResponse.ok) {
        throw new Error(`Erreur génération diagnostic: ${diagnosisResponse.status}`)
      }

      const diagnosisData = await diagnosisResponse.json()
      if (!diagnosisData.success) {
        throw new Error("Diagnostic non généré")
      }

      diagnosisTime = Date.now() - diagnosisStart
      console.log(`✅ Diagnostic généré en ${diagnosisTime}ms`)

      // Étape 4: Analyse des résultats
      setCurrentTestStep("Analyse des résultats...")
      setCurrentTestProgress(80)

      const analysis = analyzeDiagnosticResults(questionsData.questions, simulatedResponses, diagnosisData, testCase)

      const totalTime = Date.now() - startTime

      const result: DiagnosticTestResult = {
        testCase,
        questions: questionsData.questions,
        responses: simulatedResponses,
        diagnosis: diagnosisData,
        analysis,
        timing: {
          questionsGeneration: questionsTime,
          diagnosisGeneration: diagnosisTime,
          total: totalTime,
        },
        success: true,
      }

      setDiagnosticResults((prev) => ({
        ...prev,
        [testCase.id]: result,
      }))

      setCurrentTestStep("Test terminé avec succès!")
      setCurrentTestProgress(100)

      console.log(`✅ Test diagnostic complet terminé en ${totalTime}ms`)
      console.log(`📊 Score global: ${analysis.overallScore}%`)
    } catch (error: any) {
      console.error(`❌ Erreur test diagnostic ${testCase.name}:`, error)

      const result: DiagnosticTestResult = {
        testCase,
        questions: [],
        responses: [],
        diagnosis: null,
        analysis: {
          questionQuality: 0,
          responseRelevance: 0,
          diagnosticAccuracy: 0,
          overallScore: 0,
          recommendations: [`Erreur: ${error.message}`],
        },
        timing: {
          questionsGeneration: 0,
          diagnosisGeneration: 0,
          total: Date.now() - startTime,
        },
        success: false,
        error: error.message,
      }

      setDiagnosticResults((prev) => ({
        ...prev,
        [testCase.id]: result,
      }))

      setCurrentTestStep(`Erreur: ${error.message}`)
    } finally {
      setIsRunningDiagnosticTest(false)
      setTimeout(() => {
        setCurrentTestProgress(0)
        setCurrentTestStep("")
      }, 3000)
    }
  }

  const analyzeDiagnosticResults = (questions: any[], responses: any[], diagnosis: any, testCase: TestCase) => {
    const analysis = {
      questionQuality: 0,
      responseRelevance: 0,
      diagnosticAccuracy: 0,
      overallScore: 0,
      recommendations: [] as string[],
    }

    // 1. Qualité des questions (30%)
    let questionScore = 0
    questions.forEach((question) => {
      const questionText = question.question.toLowerCase()

      // Personnalisation selon l'âge
      if (
        testCase.patientData.age > 65 &&
        (questionText.includes("autonomie") || questionText.includes("chute") || questionText.includes("mémoire"))
      ) {
        questionScore += 2
      }

      // Pertinence selon les symptômes
      testCase.clinicalData.symptoms?.forEach((symptom: string) => {
        if (questionText.includes(symptom.toLowerCase())) {
          questionScore += 1
        }
      })

      // Spécificité (éviter les questions génériques)
      if (!questionText.startsWith("depuis quand") && !questionText.startsWith("avez-vous")) {
        questionScore += 1
      }
    })
    analysis.questionQuality = Math.min(100, (questionScore / questions.length) * 10)

    // 2. Pertinence des réponses (20%)
    const answeredQuestions = responses.filter((r) => r.answer && r.answer !== "Information non disponible")
    analysis.responseRelevance = (answeredQuestions.length / responses.length) * 100

    // 3. Précision diagnostique (50%)
    if (diagnosis?.data?.comprehensiveDiagnosis?.primary && testCase.expectedDiagnosis) {
      const actualDiagnosis = diagnosis.data.comprehensiveDiagnosis.primary.condition.toLowerCase()
      const expectedDiagnosis = testCase.expectedDiagnosis.primary.toLowerCase()

      // Correspondance exacte
      if (actualDiagnosis.includes(expectedDiagnosis) || expectedDiagnosis.includes(actualDiagnosis)) {
        analysis.diagnosticAccuracy = 100
      } else {
        // Vérifier les diagnostics différentiels
        const differentials = diagnosis.data.comprehensiveDiagnosis.differential || []
        const matchInDifferentials = differentials.some(
          (diff: any) =>
            diff.condition.toLowerCase().includes(expectedDiagnosis) ||
            expectedDiagnosis.includes(diff.condition.toLowerCase()),
        )

        if (matchInDifferentials) {
          analysis.diagnosticAccuracy = 70
        } else {
          // Vérifier si c'est dans la même catégorie
          const expectedCategory = getConditionCategory(testCase.expectedDiagnosis.primary)
          const actualCategory = getConditionCategory(actualDiagnosis)

          if (expectedCategory === actualCategory) {
            analysis.diagnosticAccuracy = 40
          } else {
            analysis.diagnosticAccuracy = 10
          }
        }
      }
    }

    // Score global pondéré
    analysis.overallScore = Math.round(
      analysis.questionQuality * 0.3 + analysis.responseRelevance * 0.2 + analysis.diagnosticAccuracy * 0.5,
    )

    // Recommandations
    if (analysis.questionQuality < 70) {
      analysis.recommendations.push("Améliorer la personnalisation des questions")
    }
    if (analysis.responseRelevance < 80) {
      analysis.recommendations.push("Enrichir les réponses simulées")
    }
    if (analysis.diagnosticAccuracy < 60) {
      analysis.recommendations.push("Revoir la logique de diagnostic IA")
    }
    if (analysis.overallScore >= 80) {
      analysis.recommendations.push("Excellent résultat - système performant")
    }

    return analysis
  }

  const getConditionCategory = (condition: string): string => {
    const conditionLower = condition.toLowerCase()

    if (conditionLower.includes("cardia") || conditionLower.includes("infarc") || conditionLower.includes("angor")) {
      return "cardiovascular"
    }
    if (conditionLower.includes("respirat") || conditionLower.includes("pneum") || conditionLower.includes("bpco")) {
      return "respiratory"
    }
    if (conditionLower.includes("diabèt") || conditionLower.includes("glyc")) {
      return "endocrine"
    }
    if (conditionLower.includes("dépres") || conditionLower.includes("anxié") || conditionLower.includes("psychi")) {
      return "psychiatric"
    }
    if (
      conditionLower.includes("gynéco") ||
      conditionLower.includes("endométr") ||
      conditionLower.includes("ovarien")
    ) {
      return "gynecological"
    }

    return "general"
  }

  const runAllDiagnosticTests = async () => {
    for (const testCase of testCases) {
      await runCompleteDiagnosticTest(testCase)
      // Pause entre les tests
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Tests Diagnostiques Complets IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={runAllDiagnosticTests} disabled={isRunningDiagnosticTest}>
              {isRunningDiagnosticTest ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Lancer Tous les Tests Diagnostiques
            </Button>
            <Badge variant="outline">
              {Object.keys(diagnosticResults).length} / {testCases.length} tests complétés
            </Badge>
          </div>

          {isRunningDiagnosticTest && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentTestStep}</span>
                <span>{currentTestProgress}%</span>
              </div>
              <Progress value={currentTestProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cases">Cas de Test</TabsTrigger>
          <TabsTrigger value="results">Résultats Diagnostiques</TabsTrigger>
          <TabsTrigger value="analysis">Analyse Comparative</TabsTrigger>
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
                      <strong>Diagnostic attendu:</strong> {testCase.expectedDiagnosis?.primary}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <Button
                      size="sm"
                      onClick={() => runCompleteDiagnosticTest(testCase)}
                      disabled={isRunningDiagnosticTest}
                    >
                      {isRunningDiagnosticTest && selectedTest?.id === testCase.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test Complet"
                      )}
                    </Button>

                    {diagnosticResults[testCase.id] && (
                      <Badge
                        className={`${getScoreBadge(diagnosticResults[testCase.id].analysis.overallScore)} text-white`}
                      >
                        {diagnosticResults[testCase.id].analysis.overallScore}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {Object.entries(diagnosticResults).map(([testId, result]) => {
            const testCase = testCases.find((t) => t.id === testId)
            if (!testCase) return null

            return (
              <Card key={testId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {testCase.icon}
                      {testCase.name}
                    </div>
                    <div className="flex gap-2">
                      {result.success ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Succès
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500 text-white">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Échec
                        </Badge>
                      )}
                      <Badge variant="outline">Score: {result.analysis.overallScore}%</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.success ? (
                    <div className="space-y-4">
                      {/* Métriques de performance */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getScoreColor(result.analysis.questionQuality)}`}>
                            {Math.round(result.analysis.questionQuality)}%
                          </div>
                          <div className="text-sm text-gray-600">Qualité Questions</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getScoreColor(result.analysis.responseRelevance)}`}>
                            {Math.round(result.analysis.responseRelevance)}%
                          </div>
                          <div className="text-sm text-gray-600">Réponses Pertinentes</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getScoreColor(result.analysis.diagnosticAccuracy)}`}>
                            {Math.round(result.analysis.diagnosticAccuracy)}%
                          </div>
                          <div className="text-sm text-gray-600">Précision Diagnostic</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{result.timing.total}ms</div>
                          <div className="text-sm text-gray-600">Temps Total</div>
                        </div>
                      </div>

                      {/* Diagnostic généré vs attendu */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Diagnostic Généré</h4>
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="font-medium">
                              {result.diagnosis?.data?.comprehensiveDiagnosis?.primary?.condition || "Non disponible"}
                            </div>
                            <div className="text-sm text-gray-600">
                              Confiance: {result.diagnosis?.data?.comprehensiveDiagnosis?.primary?.confidence || 0}%
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Diagnostic Attendu</h4>
                          <div className="bg-green-50 p-3 rounded">
                            <div className="font-medium">{testCase.expectedDiagnosis?.primary || "Non défini"}</div>
                            <div className="text-sm text-gray-600">
                              Confiance attendue: {testCase.expectedDiagnosis?.confidence || 0}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recommandations */}
                      <div>
                        <h4 className="font-semibold mb-2">Recommandations</h4>
                        <ul className="space-y-1">
                          {result.analysis.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Détails timing */}
                      <div className="text-xs text-gray-500">
                        Questions: {result.timing.questionsGeneration}ms | Diagnostic:{" "}
                        {result.timing.diagnosisGeneration}ms | Total: {result.timing.total}ms
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{result.error || "Erreur inconnue lors du test"}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {Object.keys(diagnosticResults).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Analyse Comparative des Performances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Scores moyens */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {["questionQuality", "responseRelevance", "diagnosticAccuracy", "overallScore"].map((metric) => {
                      const scores = Object.values(diagnosticResults)
                        .filter((r) => r.success)
                        .map((r) => r.analysis[metric as keyof typeof r.analysis] as number)
                      const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

                      const labels = {
                        questionQuality: "Qualité Questions",
                        responseRelevance: "Pertinence Réponses",
                        diagnosticAccuracy: "Précision Diagnostic",
                        overallScore: "Score Global",
                      }

                      return (
                        <div key={metric} className="text-center">
                          <div className={`text-3xl font-bold ${getScoreColor(average)}`}>{Math.round(average)}%</div>
                          <div className="text-sm text-gray-600">{labels[metric as keyof typeof labels]}</div>
                          <div className="text-xs text-gray-500">Moyenne sur {scores.length} tests</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Répartition des performances */}
                  <div>
                    <h4 className="font-semibold mb-4">Répartition des Performances</h4>
                    <div className="space-y-2">
                      {Object.entries(diagnosticResults).map(([testId, result]) => {
                        const testCase = testCases.find((t) => t.id === testId)
                        if (!testCase || !result.success) return null

                        return (
                          <div key={testId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              {testCase.icon}
                              <span className="font-medium">{testCase.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                Q: {Math.round(result.analysis.questionQuality)}% | R:{" "}
                                {Math.round(result.analysis.responseRelevance)}% | D:{" "}
                                {Math.round(result.analysis.diagnosticAccuracy)}%
                              </div>
                              <Badge className={`${getScoreBadge(result.analysis.overallScore)} text-white`}>
                                {result.analysis.overallScore}%
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recommandations globales */}
                  <div>
                    <h4 className="font-semibold mb-2">Recommandations Globales</h4>
                    <div className="bg-blue-50 p-4 rounded">
                      <ul className="space-y-1 text-sm">
                        <li>• Améliorer la personnalisation des questions selon l'âge et les antécédents</li>
                        <li>• Enrichir la base de réponses simulées pour les tests</li>
                        <li>• Optimiser la logique de diagnostic différentiel</li>
                        <li>• Réduire les temps de génération pour une meilleure UX</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Aucun test diagnostic n'a encore été exécuté. Lancez les tests pour voir l'analyse comparative.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
