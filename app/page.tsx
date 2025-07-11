"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Brain,
  Pill,
  FileText,
  User,
  Stethoscope,
  CheckCircle,
  HelpCircle,
  FlaskConical,
  Target,
  Microscope,
} from "lucide-react"

// Import des composants
const PatientForm = dynamic(() => import("@/components/patient-form"), { ssr: false })
const ClinicalForm = dynamic(() => import("@/components/clinical-form"), { ssr: false })
const QuestionsForm = dynamic(() => import("@/components/questions-form"), { ssr: false })

// Import des composants médicaux
const ConsultationReport = dynamic(() => import("@/components/medical-documents/consultation-report"), { ssr: false })
const BiologyPrescription = dynamic(() => import("@/components/medical-documents/biology-prescription"), { ssr: false })
const MedicationPrescription = dynamic(() => import("@/components/medical-documents/medication-prescription"), {
  ssr: false,
})
const ImagingPrescription = dynamic(() => import("@/components/medical-documents/imaging-prescription"), { ssr: false })

const RealMedicalSystemOpenAI = () => {
  // États de workflow
  const [currentStep, setCurrentStep] = useState("patient")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Configuration API
  const [apiKey, setApiKey] = useState(
    "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",
  )
  const [apiKeyValid, setApiKeyValid] = useState(true)
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    fda: false,
    rxnorm: false,
    pubmed: false,
  })

  // Données patient
  const [patientData, setPatientData] = useState({
    name: "",
    age: "",
    gender: "",
    weight: "",
    height: "",
    medicalHistory: "",
    currentMedications: "",
    allergies: "",
    insurance: "",
    emergencyContact: "",
  })

  // Présentation clinique
  const [clinicalData, setClinicalData] = useState({
    chiefComplaint: "",
    symptoms: "",
    duration: "",
    severity: "",
    vitals: {
      bp: "",
      hr: "",
      temp: "",
      spo2: "",
      rr: "",
      pain: "",
    },
    physicalExam: "",
  })

  // Questions cliniques générées par IA
  const [clinicalQuestions, setClinicalQuestions] = useState(null)
  const [clinicalAnswers, setClinicalAnswers] = useState({})

  // Diagnostic enrichi avec APIs
  const [enhancedResults, setEnhancedResults] = useState(null)
  const [apiInsights, setApiInsights] = useState({
    fdaData: [],
    interactions: null,
    literature: [],
    trials: [],
    guidelines: [],
    recalls: [],
    adverseEvents: [],
  })

  // Prescription médicale
  const [prescriptionData, setPrescriptionData] = useState(null)

  // Examens complémentaires
  const [recommendedExams, setRecommendedExams] = useState(null)
  const [examResults, setExamResults] = useState({})

  // Fonctions utilitaires
  const clearErrors = () => setErrors({})
  const setError = (field, message) => setErrors((prev) => ({ ...prev, [field]: message }))

  // Handlers pour les formulaires
  const handlePatientDataChange = useCallback((newData) => {
    setPatientData(newData)
  }, [])

  const handleClinicalDataChange = useCallback((newData) => {
    setClinicalData(newData)
  }, [])

  // Test de connectivité des APIs
  const testApiConnectivity = useCallback(async () => {
    const results = {
      openai: false,
      fda: false,
      rxnorm: false,
      pubmed: false,
    }

    try {
      // Test OpenAI
      const openaiResponse = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      results.openai = openaiResponse.ok

      // Test FDA
      const fdaResponse = await fetch("https://api.fda.gov/drug/label.json?limit=1")
      results.fda = fdaResponse.ok

      // Test RxNorm
      const rxnormResponse = await fetch("https://rxnav.nlm.nih.gov/REST/drugs.json?name=aspirin")
      results.rxnorm = rxnormResponse.ok

      // Test PubMed
      const pubmedResponse = await fetch(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=medicine&retmax=1",
      )
      results.pubmed = pubmedResponse.ok
    } catch (error) {
      console.error("Erreur test connectivité:", error)
    }

    setApiStatus(results)
    return results
  }, [apiKey])

  // Appel OpenAI avec Function Calling
  const callOpenAIWithFunctions = useCallback(
    async (messages, functions = null, functionCall = null) => {
      if (!apiKey) {
        throw new Error("Clé API OpenAI requise")
      }

      const requestBody = {
        model: "gpt-4o",
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000,
      }

      if (functions) {
        requestBody.functions = functions
        if (functionCall) {
          requestBody.function_call = functionCall
        }
      }

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`OpenAI API Error ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        return data.choices[0].message
      } catch (error) {
        console.error("Erreur OpenAI:", error)
        throw error
      }
    },
    [apiKey],
  )

  // Génération questions cliniques
  const generateClinicalQuestions = useCallback(async () => {
    if (!patientData.name || !clinicalData.chiefComplaint) {
      setError("questions", "Données patient et motif de consultation requis")
      return
    }

    setIsLoading(true)
    clearErrors()

    try {
      const messages = [
        {
          role: "system",
          content: `Tu es un médecin interniste expert avec 20 ans d'expérience. Analyse ce cas clinique et génère 5 questions précises pour affiner le diagnostic. Prends en compte les dernières guidelines médicales et pratique factuelle. Réponds UNIQUEMENT en JSON valide.`,
        },
        {
          role: "user",
          content: `
PATIENT:
- Nom: ${patientData.name}
- Âge: ${patientData.age} ans
- Genre: ${patientData.gender}
- Poids: ${patientData.weight} kg
- Taille: ${patientData.height} cm
- Antécédents: ${patientData.medicalHistory || "Non renseignés"}
- Médicaments actuels: ${patientData.currentMedications || "Aucun"}
- Allergies: ${patientData.allergies || "Aucune connue"}

PRÉSENTATION CLINIQUE:
- Motif: ${clinicalData.chiefComplaint}
- Symptômes: ${clinicalData.symptoms}
- Durée: ${clinicalData.duration || "Non précisée"}
- Sévérité: ${clinicalData.severity || "Non évaluée"}
- Signes vitaux: TA=${clinicalData.vitals.bp}, FC=${clinicalData.vitals.hr}, T°=${clinicalData.vitals.temp}, SpO2=${clinicalData.vitals.spo2}

Format de réponse JSON OBLIGATOIRE:
{
  "preliminary_assessment": "Impression clinique initiale basée sur les données",
  "differential_diagnoses": ["Diagnostic 1", "Diagnostic 2", "Diagnostic 3"],
  "questions": [
    {
      "question": "Question clinique précise et spécifique",
      "rationale": "Justification médicale détaillée",
      "category": "symptom|examination|history|timeline|risk_factors",
      "priority": "high|medium|low",
      "expected_answers": ["Réponse possible 1", "Réponse possible 2"]
    }
  ]
}
          `,
        },
      ]

      const response = await callOpenAIWithFunctions(messages)
      const cleaned = response.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim()
      const parsed = JSON.parse(cleaned)
      setClinicalQuestions(parsed)
      setCurrentStep("questions")
    } catch (error) {
      console.error("Erreur questions cliniques:", error)
      setError("questions", `Erreur: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [patientData, clinicalData, callOpenAIWithFunctions])

  // Génération diagnostic enrichi
  const generateEnhancedDiagnosis = useCallback(async () => {
    if (!clinicalQuestions || Object.keys(clinicalAnswers).length === 0) {
      setError("diagnosis", "Réponses aux questions cliniques requises")
      return
    }

    setIsLoading(true)
    clearErrors()

    try {
      // Préparer les données pour l'analyse
      const answersText = Object.entries(clinicalAnswers)
        .map(([index, answer]) => {
          const question = clinicalQuestions.questions[index]
          return `Q: ${question?.question}
R: ${answer}`
        })
        .join("\n\n")

      const messages = [
        {
          role: "system",
          content: `Tu es un médecin expert qui doit effectuer un diagnostic différentiel complet avec recommandations de traitement et examens.`,
        },
        {
          role: "user",
          content: `
Effectue un diagnostic complet pour ce patient:

PATIENT: ${patientData.name}, ${patientData.age} ans, ${patientData.gender}
ANTÉCÉDENTS: ${patientData.medicalHistory?.substring(0, 200) || "Aucun"}
MÉDICAMENTS: ${patientData.currentMedications?.substring(0, 200) || "Aucun"}
ALLERGIES: ${patientData.allergies?.substring(0, 100) || "Aucune"}

CLINIQUE: 
- Motif: ${clinicalData.chiefComplaint}
- Symptômes: ${clinicalData.symptoms?.substring(0, 300)}
- Durée: ${clinicalData.duration || "Non précisée"}
- Signes vitaux: TA=${clinicalData.vitals.bp}, FC=${clinicalData.vitals.hr}

ÉVALUATION: ${clinicalQuestions.preliminary_assessment?.substring(0, 200)}

RÉPONSES: ${answersText.substring(0, 500)}

Réponds en JSON avec ce format exact:
{
  "primary_diagnosis": {
    "condition": "Diagnostic principal",
    "confidence": 85,
    "icd10": "Code ICD-10",
    "rationale": "Justification détaillée"
  },
  "differential_diagnoses": [
    {
      "condition": "Diagnostic différentiel",
      "probability": 15,
      "rationale": "Pourquoi considéré"
    }
  ],
  "recommended_medications": [
    {
      "name": "Nom médicament",
      "dosage": "Posologie",
      "duration": "Durée",
      "instructions": "Instructions"
    }
  ],
  "recommended_exams": [
    {
      "name": "Nom examen",
      "category": "biology|imaging|cardiac",
      "indication": "Raison",
      "urgency": "routine|urgent"
    }
  ],
  "clinical_recommendations": [
    {
      "category": "immediate|monitoring|followup|lifestyle",
      "action": "Action recommandée",
      "priority": "high|medium|low",
      "timeline": "Délai"
    }
  ]
}
          `,
        },
      ]

      const response = await callOpenAIWithFunctions(messages)
      const cleaned = response.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim()

      const enhancedDiagnosis = JSON.parse(cleaned)
      setEnhancedResults(enhancedDiagnosis)

      // Générer prescription data
      if (enhancedDiagnosis.recommended_medications) {
        setPrescriptionData({
          prescription: {
            medications: enhancedDiagnosis.recommended_medications,
            follow_up: {
              next_visit: "2 semaines",
              warning_signs: ["Aggravation des symptômes", "Nouveaux symptômes"],
            },
          },
        })
      }

      // Générer examens recommandés
      if (enhancedDiagnosis.recommended_exams) {
        setRecommendedExams({
          recommended_exams: enhancedDiagnosis.recommended_exams,
        })
      }

      setCurrentStep("diagnosis")
    } catch (error) {
      console.error("Erreur diagnostic enrichi:", error)
      setError("diagnosis", `Erreur: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [clinicalQuestions, clinicalAnswers, patientData, clinicalData, callOpenAIWithFunctions])

  // Validation des étapes
  const isPatientValid = patientData.name && patientData.age && patientData.gender
  const isClinicalValid = clinicalData.chiefComplaint && clinicalData.symptoms

  // Initialisation
  useEffect(() => {
    testApiConnectivity()
  }, [testApiConnectivity])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* En-tête avec status APIs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Medical AI Expert</h1>
                <p className="text-sm text-gray-600">Système médical avec vraies APIs mondiales</p>
              </div>
            </div>

            {/* Status APIs en temps réel */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${apiStatus.openai ? "bg-green-500" : "bg-red-500"}`}></div>
                <span className="text-sm font-medium">OpenAI</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${apiStatus.fda ? "bg-green-500" : "bg-red-500"}`}></div>
                <span className="text-sm font-medium">FDA</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${apiStatus.rxnorm ? "bg-green-500" : "bg-red-500"}`}></div>
                <span className="text-sm font-medium">RxNorm</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${apiStatus.pubmed ? "bg-green-500" : "bg-red-500"}`}></div>
                <span className="text-sm font-medium">PubMed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation des étapes */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {[
              { id: "patient", label: "Patient", icon: User },
              { id: "clinical", label: "Clinique", icon: Stethoscope },
              { id: "questions", label: "Questions IA", icon: HelpCircle },
              { id: "diagnosis", label: "Diagnostic", icon: Target },
              { id: "biology", label: "Examens Bio", icon: FlaskConical },
              { id: "medication", label: "Prescription", icon: Pill },
              { id: "imaging", label: "Imagerie", icon: Microscope },
              { id: "report", label: "Compte-Rendu", icon: FileText },
            ].map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted =
                (step.id === "patient" && isPatientValid) ||
                (step.id === "clinical" && isClinicalValid) ||
                (step.id === "questions" && clinicalQuestions) ||
                (step.id === "diagnosis" && enhancedResults) ||
                (step.id === "biology" && recommendedExams) ||
                (step.id === "medication" && prescriptionData) ||
                (step.id === "imaging" && recommendedExams) ||
                (step.id === "report" && enhancedResults)

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : isCompleted
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{step.label}</span>
                    {isCompleted && <CheckCircle className="h-4 w-4" />}
                  </button>
                  {index < 7 && <div className="w-8 h-px bg-gray-300 mx-2"></div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Étape 1: Informations Patient */}
        {currentStep === "patient" && (
          <PatientForm
            initialData={patientData}
            onDataChange={handlePatientDataChange}
            onNext={() => setCurrentStep("clinical")}
            isValid={isPatientValid}
          />
        )}

        {/* Étape 2: Présentation Clinique */}
        {currentStep === "clinical" && (
          <ClinicalForm
            initialData={clinicalData}
            onDataChange={handleClinicalDataChange}
            onNext={generateClinicalQuestions}
            onBack={() => setCurrentStep("patient")}
            isValid={isClinicalValid}
            isLoading={isLoading}
            error={errors.questions}
            apiStatus={apiStatus}
          />
        )}

        {/* Étape 3: Questions Cliniques IA */}
        {currentStep === "questions" && clinicalQuestions && (
          <QuestionsForm
            clinicalQuestions={clinicalQuestions}
            initialAnswers={clinicalAnswers}
            onAnswersChange={setClinicalAnswers}
            onNext={generateEnhancedDiagnosis}
            onBack={() => setCurrentStep("clinical")}
            isLoading={isLoading}
            error={errors.diagnosis}
            apiStatus={apiStatus}
          />
        )}

        {/* Étape 4: Diagnostic Enrichi avec APIs */}
        {currentStep === "diagnosis" && enhancedResults && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Target className="h-6 w-6 mr-3 text-purple-600" />
              Diagnostic Enrichi avec APIs Réelles
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Diagnostic principal */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-purple-800">🎯 Diagnostic Principal</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold">Condition:</span> {enhancedResults.primary_diagnosis?.condition}
                  </div>
                  <div>
                    <span className="font-semibold">Confiance:</span>{" "}
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {enhancedResults.primary_diagnosis?.confidence}%
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Code ICD-10:</span> {enhancedResults.primary_diagnosis?.icd10}
                  </div>
                  <div>
                    <span className="font-semibold">Justification:</span>
                    <p className="text-sm mt-1">{enhancedResults.primary_diagnosis?.rationale}</p>
                  </div>
                </div>
              </div>

              {/* Diagnostics différentiels */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-blue-800">🔍 Diagnostics Différentiels</h3>
                <div className="space-y-3">
                  {enhancedResults.differential_diagnoses?.map((diff, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{diff.condition}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{diff.probability}%</span>
                      </div>
                      <p className="text-sm text-gray-600">{diff.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommandations cliniques */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-green-800">📋 Recommandations Cliniques</h3>
                <div className="space-y-3">
                  {enhancedResults.clinical_recommendations?.map((rec, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{rec.action}</span>
                        <div className="flex space-x-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              rec.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : rec.priority === "medium"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{rec.timeline}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Catégorie: {rec.category}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Examens recommandés */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-orange-800">🔬 Examens Recommandés</h3>
                <div className="space-y-3">
                  {enhancedResults.recommended_exams?.map((exam, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{exam.name}</span>
                        <div className="flex space-x-2">
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                            {exam.category}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              exam.urgency === "urgent" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {exam.urgency}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{exam.indication}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep("questions")}
                className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ← Retour Questions
              </button>
              <button
                onClick={() => setCurrentStep("biology")}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FlaskConical className="h-5 w-5 mr-2" />
                Examens Biologiques →
              </button>
            </div>
          </div>
        )}

        {/* Étape 5: Examens Biologiques */}
        {currentStep === "biology" && recommendedExams && (
          <BiologyPrescription
            recommendedExams={recommendedExams}
            patientData={patientData}
            clinicalData={clinicalData}
            diagnosis={enhancedResults}
            onNext={() => setCurrentStep("medication")}
            onBack={() => setCurrentStep("diagnosis")}
          />
        )}

        {/* Étape 6: Prescription Médicamenteuse */}
        {currentStep === "medication" && prescriptionData && (
          <MedicationPrescription
            prescriptionData={prescriptionData}
            patientData={patientData}
            clinicalData={clinicalData}
            diagnosis={enhancedResults}
            onNext={() => setCurrentStep("imaging")}
            onBack={() => setCurrentStep("biology")}
          />
        )}

        {/* Étape 7: Imagerie Médicale */}
        {currentStep === "imaging" && recommendedExams && (
          <ImagingPrescription
            recommendedExams={recommendedExams}
            patientData={patientData}
            clinicalData={clinicalData}
            diagnosis={enhancedResults}
            onNext={() => setCurrentStep("report")}
            onBack={() => setCurrentStep("medication")}
          />
        )}

        {/* Étape 8: Compte-Rendu de Consultation */}
        {currentStep === "report" && enhancedResults && (
          <ConsultationReport
            patientData={patientData}
            clinicalData={clinicalData}
            diagnosis={enhancedResults}
            clinicalQuestions={clinicalQuestions}
            clinicalAnswers={clinicalAnswers}
            onBack={() => setCurrentStep("imaging")}
          />
        )}
      </div>
    </div>
  )
}

export default RealMedicalSystemOpenAI
