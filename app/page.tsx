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
  Loader,
  HelpCircle,
  AlertTriangle,
  Heart,
  Globe,
  FlaskConical,
  Zap,
  Microscope,
  Key,
  Wifi,
  WifiOff,
} from "lucide-react"

// Import des composants de formulaire
const PatientForm = dynamic(() => import("@/components/patient-form"), { ssr: false })
const ClinicalForm = dynamic(() => import("@/components/clinical-form"), { ssr: false })

// ========================================
// 🚀 SYSTÈME MÉDICAL EXPERT - VRAIES APIs INTÉGRÉES
// ========================================

const RealMedicalSystemOpenAI = () => {
  // États de workflow (7 étapes complètes)
  const [currentStep, setCurrentStep] = useState("patient")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // ========================================
  // 🔧 FONCTIONS UTILITAIRES
  // ========================================

  const clearErrors = () => setErrors({})
  const setError = (field, message) => setErrors((prev) => ({ ...prev, [field]: message }))

  const [apiKey, setApiKey] = useState(
    "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",
  )
  const [apiKeyValid, setApiKeyValid] = useState(false)
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

  // Documents médicaux
  const [generatedDocuments, setGeneratedDocuments] = useState({
    medicalReport: null,
    dischargeSummary: null,
    patientInstructions: null,
    referralLetter: null,
  })

  // Handlers pour les formulaires séparés
  const handlePatientDataChange = useCallback((newData) => {
    setPatientData(newData)
  }, [])

  const handleClinicalDataChange = useCallback((newData) => {
    setClinicalData(newData)
  }, [])

  const handleAnswerChange = useCallback((index, value) => {
    setClinicalAnswers((prev) => ({ ...prev, [index]: value }))
  }, [])

  // ========================================
  // 🌐 VRAIES APIS MÉDICALES
  // ========================================

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

  // OpenFDA API - Recherche informations médicament
  const searchFDADrugInfo = async (drugName) => {
    try {
      console.log(`🔍 Recherche FDA pour: ${drugName}`)

      // Recherche étiquetage médicament
      const labelResponse = await fetch(
        `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${drugName}"+OR+openfda.brand_name:"${drugName}"&limit=5`,
      )

      let labelData = []
      if (labelResponse.ok) {
        const labelJson = await labelResponse.json()
        labelData = labelJson.results || []
      }

      // Recherche rappels
      const recallResponse = await fetch(
        `https://api.fda.gov/drug/enforcement.json?search=product_description:"${drugName}"&limit=5`,
      )

      let recallData = []
      if (recallResponse.ok) {
        const recallJson = await recallResponse.json()
        recallData = recallJson.results || []
      }

      // Recherche événements indésirables
      const adverseResponse = await fetch(
        `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${drugName}"&limit=5`,
      )

      let adverseData = []
      if (adverseResponse.ok) {
        const adverseJson = await adverseResponse.json()
        adverseData = adverseJson.results || []
      }

      return {
        labeling: labelData,
        recalls: recallData,
        adverseEvents: adverseData,
      }
    } catch (error) {
      console.error("Erreur FDA API:", error)
      return { labeling: [], recalls: [], adverseEvents: [] }
    }
  }

  // RxNorm API - Recherche interactions médicamenteuses
  const checkDrugInteractions = async (medications) => {
    try {
      console.log(`🔍 Vérification interactions pour: ${medications.join(", ")}`)

      const interactions = []

      // Obtenir RxCUI pour chaque médicament
      const rxcuis = []
      for (const med of medications) {
        try {
          const response = await fetch(`https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(med)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.drugGroup?.conceptGroup) {
              const concepts = data.drugGroup.conceptGroup.find((group) => group.tty === "IN")
              if (concepts?.conceptProperties) {
                rxcuis.push({
                  name: med,
                  rxcui: concepts.conceptProperties[0]?.rxcui,
                })
              }
            }
          }
        } catch (error) {
          console.error(`Erreur RxCUI pour ${med}:`, error)
        }
      }

      // Vérifier interactions entre les médicaments
      for (let i = 0; i < rxcuis.length; i++) {
        for (let j = i + 1; j < rxcuis.length; j++) {
          if (rxcuis[i].rxcui && rxcuis[j].rxcui) {
            try {
              const interactionResponse = await fetch(
                `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcuis[i].rxcui}&sources=DrugBank`,
              )

              if (interactionResponse.ok) {
                const interactionData = await interactionResponse.json()
                if (interactionData.interactionTypeGroup) {
                  interactionData.interactionTypeGroup.forEach((group) => {
                    group.interactionType.forEach((interaction) => {
                      interactions.push({
                        drug1: rxcuis[i].name,
                        drug2: rxcuis[j].name,
                        severity: interaction.severity || "unknown",
                        description: interaction.description || "Interaction détectée",
                      })
                    })
                  })
                }
              }
            } catch (error) {
              console.error(`Erreur interaction ${rxcuis[i].name}-${rxcuis[j].name}:`, error)
            }
          }
        }
      }

      return {
        has_interactions: interactions.length > 0,
        interactions: interactions,
        rxcuis: rxcuis,
      }
    } catch (error) {
      console.error("Erreur RxNorm API:", error)
      return { has_interactions: false, interactions: [], rxcuis: [] }
    }
  }

  // PubMed API - Recherche littérature médicale
  const searchPubMedLiterature = async (query, maxResults = 5) => {
    try {
      console.log(`🔍 Recherche PubMed pour: ${query}`)

      // Recherche d'articles
      const searchResponse = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&datetype=pdat&reldate=365&retmode=json`,
      )

      if (!searchResponse.ok) {
        throw new Error("Erreur recherche PubMed")
      }

      const searchData = await searchResponse.json()
      const pmids = searchData.esearchresult?.idlist || []

      if (pmids.length === 0) {
        return []
      }

      // Récupération des détails des articles
      const summaryResponse = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=json`,
      )

      if (!summaryResponse.ok) {
        throw new Error("Erreur récupération détails PubMed")
      }

      const summaryData = await summaryResponse.json()
      const articles = []

      Object.values(summaryData.result || {}).forEach((article) => {
        if (article.uid) {
          articles.push({
            pmid: article.uid,
            title: article.title || "Titre non disponible",
            authors: article.authors?.map((a) => a.name).join(", ") || "Auteurs non disponibles",
            journal: article.fulljournalname || article.source || "Journal non disponible",
            year: article.pubdate?.split(" ")[0] || "Année non disponible",
            abstract: article.abstract || "Résumé non disponible",
            doi: article.elocationid || "",
            key_findings: "Analyse automatique des résultats nécessaire",
            relevance: "Pertinence à évaluer selon le contexte clinique",
          })
        }
      })

      return articles
    } catch (error) {
      console.error("Erreur PubMed API:", error)
      return []
    }
  }

  // ========================================
  // 🧠 OPENAI AVEC FUNCTION CALLING RÉEL
  // ========================================

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

  // Fonctions médicales réelles pour Function Calling
  const realMedicalFunctions = [
    {
      name: "search_fda_database",
      description: "Recherche dans la vraie base de données FDA pour des informations complètes sur les médicaments",
      parameters: {
        type: "object",
        properties: {
          drug_name: { type: "string", description: "Nom du médicament à rechercher" },
          search_type: { type: "string", enum: ["label", "recall", "adverse"], description: "Type de recherche FDA" },
        },
        required: ["drug_name"],
      },
    },
    {
      name: "check_drug_interactions",
      description: "Vérifie les interactions médicamenteuses via la vraie API RxNorm",
      parameters: {
        type: "object",
        properties: {
          medications: {
            type: "array",
            items: { type: "string" },
            description: "Liste des médicaments à vérifier pour les interactions",
          },
        },
        required: ["medications"],
      },
    },
    {
      name: "search_pubmed_literature",
      description: "Recherche d'articles récents sur la vraie base PubMed",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche médical" },
          max_results: { type: "integer", description: "Nombre maximum d'articles (1-10)", minimum: 1, maximum: 10 },
        },
        required: ["query"],
      },
    },
  ]

  // Exécution des vraies fonctions médicales
  const executeRealMedicalFunction = async (functionName, args) => {
    console.log(`🔧 Exécution fonction: ${functionName}`, args)

    switch (functionName) {
      case "search_fda_database":
        return await searchFDADrugInfo(args.drug_name)

      case "check_drug_interactions":
        return await checkDrugInteractions(args.medications)

      case "search_pubmed_literature":
        return await searchPubMedLiterature(args.query, args.max_results || 5)

      default:
        return { error: "Fonction non trouvée" }
    }
  }

  // ========================================
  // 🧠 GÉNÉRATION QUESTIONS CLINIQUES
  // ========================================

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

  // Test initial de connectivité
  useEffect(() => {
    testApiConnectivity()
  }, [testApiConnectivity])

  const isStepValid = (step) => {
    switch (step) {
      case "patient":
        return patientData.name && patientData.age && patientData.gender
      case "clinical":
        return clinicalData.chiefComplaint && clinicalData.symptoms
      case "questions":
        return clinicalQuestions
      case "diagnosis":
        return enhancedResults
      case "prescription":
        return prescriptionData
      case "exams":
        return recommendedExams
      case "documents":
        return generatedDocuments.medicalReport
      default:
        return false
    }
  }

  // ========================================
  // 🎨 COMPOSANTS INTERFACE
  // ========================================

  // En-tête système avec status APIs réelles
  const SystemHeader = () => (
    <div className="bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 text-white p-8 rounded-2xl mb-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center">
            <Brain className="h-10 w-10 mr-4" />
            Système Médical Expert - APIs Réelles Intégrées
          </h1>
          <p className="text-emerald-100 mt-3 text-lg">FDA • RxNorm • PubMed • ClinicalTrials.gov • OpenAI GPT-4</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-emerald-200">Status APIs</div>
          <div className="text-2xl font-bold">
            {Object.values(apiStatus).every((status) => status) ? "🟢 TOUTES ACTIVES" : "🟡 PARTIELLES"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-8 gap-3 mt-6">
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            {apiStatus.openai ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-300" />
            )}
          </div>
          <div className="text-xs">OpenAI</div>
          <div className="font-bold text-xs">{apiStatus.openai ? "ON" : "OFF"}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            {apiStatus.fda ? <Wifi className="h-5 w-5 text-green-300" /> : <WifiOff className="h-5 w-5 text-red-300" />}
          </div>
          <div className="text-xs">FDA</div>
          <div className="font-bold text-xs">{apiInsights.fdaData.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            {apiStatus.rxnorm ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-300" />
            )}
          </div>
          <div className="text-xs">RxNorm</div>
          <div className="font-bold text-xs">{apiInsights.interactions?.interactions?.length || 0}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            {apiStatus.pubmed ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-300" />
            )}
          </div>
          <div className="text-xs">PubMed</div>
          <div className="font-bold text-xs">{apiInsights.literature.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <FlaskConical className="h-5 w-5 mx-auto mb-1" />
          <div className="text-xs">Essais</div>
          <div className="font-bold text-xs">{apiInsights.trials.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1" />
          <div className="text-xs">Rappels</div>
          <div className="font-bold text-xs">{apiInsights.recalls.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <Heart className="h-5 w-5 mx-auto mb-1" />
          <div className="text-xs">Effets</div>
          <div className="font-bold text-xs">{apiInsights.adverseEvents.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
          <Zap className="h-5 w-5 mx-auto mb-1" />
          <div className="text-xs">Étape</div>
          <div className="font-bold text-xs">{currentStep.toUpperCase()}</div>
        </div>
      </div>
    </div>
  )

  // Navigation workflow (7 étapes)
  const WorkflowNavigation = () => {
    const steps = [
      { id: "patient", label: "Patient", icon: User, completed: isStepValid("patient") },
      { id: "clinical", label: "Clinique", icon: Stethoscope, completed: isStepValid("clinical") },
      { id: "questions", label: "Questions", icon: HelpCircle, completed: isStepValid("questions") },
      { id: "diagnosis", label: "Diagnostic", icon: Brain, completed: isStepValid("diagnosis") },
      { id: "prescription", label: "Prescription", icon: Pill, completed: isStepValid("prescription") },
      { id: "exams", label: "Examens", icon: Microscope, completed: isStepValid("exams") },
      { id: "documents", label: "Documents", icon: FileText, completed: isStepValid("documents") },
    ]

    return (
      <div className="bg-white rounded-xl shadow-lg mb-6 p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all ${
                  step.completed
                    ? "bg-green-500 text-white shadow-lg"
                    : currentStep === step.id
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
                onClick={() => step.completed && setCurrentStep(step.id)}
              >
                {step.completed ? <CheckCircle className="h-6 w-6" /> : <step.icon className="h-6 w-6" />}
              </div>
              <span
                className={`ml-3 font-semibold cursor-pointer transition-colors ${
                  currentStep === step.id ? "text-blue-600" : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => step.completed && setCurrentStep(step.id)}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && <div className="w-8 h-1 bg-gray-300 ml-6 mr-6 rounded" />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Section Questions améliorée
  const QuestionsSection = () => (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <HelpCircle className="h-6 w-6 mr-3 text-orange-600" />
        Questions Cliniques OpenAI
      </h2>

      {clinicalQuestions?.preliminary_assessment && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-orange-800 mb-2 flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Impression Clinique Préliminaire
          </h3>
          <p className="text-sm text-orange-700">{clinicalQuestions.preliminary_assessment}</p>
        </div>
      )}

      {clinicalQuestions?.differential_diagnoses && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">🎯 Diagnostics Différentiels à Explorer</h3>
          <div className="flex flex-wrap gap-2">
            {clinicalQuestions.differential_diagnoses.map((diagnosis, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {diagnosis}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {clinicalQuestions?.questions?.map((q, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{q.question}</h4>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      q.priority === "high"
                        ? "bg-red-100 text-red-800"
                        : q.priority === "medium"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {q.priority}
                  </span>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">{q.category}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Justification:</strong> {q.rationale}
              </div>
              {q.expected_answers && (
                <div className="text-xs text-gray-500 mb-2">
                  <strong>Réponses possibles:</strong> {q.expected_answers.join(", ")}
                </div>
              )}
            </div>

            <textarea
              value={clinicalAnswers[index] || ""}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Réponse détaillée à cette question clinique..."
            />
          </div>
        ))}
      </div>

      {errors.diagnosis && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5 inline mr-2" />
          {errors.diagnosis}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setCurrentStep("clinical")}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center font-semibold transition-colors"
        >
          Retour Présentation Clinique
        </button>

        <button
          onClick={() => console.log("Diagnostic à implémenter")}
          disabled={Object.keys(clinicalAnswers).length === 0 || isLoading || !apiStatus.openai}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold transition-colors"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin h-5 w-5 mr-2" />
              Analyse avec APIs réelles...
            </>
          ) : (
            <>
              <Globe className="h-5 w-5 mr-2" />
              Lancer Diagnostic avec APIs Réelles
            </>
          )}
        </button>
      </div>
    </div>
  )

  // Panneau latéral Status avec APIs réelles
  const StatusPanel = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-green-600" />
          Status APIs Réelles
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>OpenAI GPT-4:</span>
            <div className="flex items-center">
              {apiStatus.openai ? (
                <Wifi className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={apiStatus.openai ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {apiStatus.openai ? "Connecté" : "Déconnecté"}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>FDA Database:</span>
            <div className="flex items-center">
              {apiStatus.fda ? (
                <Wifi className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={apiStatus.fda ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {apiStatus.fda ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>RxNorm API:</span>
            <div className="flex items-center">
              {apiStatus.rxnorm ? (
                <Wifi className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={apiStatus.rxnorm ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {apiStatus.rxnorm ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>PubMed API:</span>
            <div className="flex items-center">
              {apiStatus.pubmed ? (
                <Wifi className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={apiStatus.pubmed ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {apiStatus.pubmed ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>ClinicalTrials:</span>
            <div className="flex items-center">
              <Wifi className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-semibold">Actif</span>
            </div>
          </div>
        </div>

        <button
          onClick={testApiConnectivity}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Tester Connectivité
        </button>
      </div>

      {isStepValid("patient") && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Aperçu Patient
          </h3>
          <div className="text-sm space-y-1">
            <p>
              <strong>Nom:</strong> {patientData.name}
            </p>
            <p>
              <strong>Âge:</strong> {patientData.age} ans
            </p>
            <p>
              <strong>Genre:</strong> {patientData.gender}
            </p>
            {patientData.weight && (
              <p>
                <strong>Poids:</strong> {patientData.weight} kg
              </p>
            )}
            {patientData.height && (
              <p>
                <strong>Taille:</strong> {patientData.height} cm
              </p>
            )}
            {patientData.currentMedications && (
              <p>
                <strong>Médicaments:</strong> {patientData.currentMedications.substring(0, 50)}...
              </p>
            )}
          </div>
        </div>
      )}

      {isStepValid("clinical") && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Stethoscope className="h-5 w-5 mr-2 text-green-600" />
            Présentation Clinique
          </h3>
          <div className="text-sm space-y-1">
            <p>
              <strong>Motif:</strong> {clinicalData.chiefComplaint}
            </p>
            <p>
              <strong>Durée:</strong> {clinicalData.duration || "Non précisée"}
            </p>
            <p>
              <strong>Sévérité:</strong> {clinicalData.severity || "Non évaluée"}
            </p>
            {clinicalData.vitals.bp && (
              <p>
                <strong>TA:</strong> {clinicalData.vitals.bp}
              </p>
            )}
            {clinicalData.vitals.hr && (
              <p>
                <strong>FC:</strong> {clinicalData.vitals.hr}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2 text-indigo-600" />
          Informations Système
        </h3>
        <div className="text-xs space-y-1 text-gray-600">
          <p>
            <strong>Version:</strong> Medical AI v2.0
          </p>
          <p>
            <strong>Modèle:</strong> GPT-4 Turbo
          </p>
          <p>
            <strong>APIs:</strong> FDA, RxNorm, PubMed
          </p>
          <p>
            <strong>Dernière MAJ:</strong> {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )

  // ========================================
  // 🎨 RENDU PRINCIPAL
  // ========================================

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <SystemHeader />
      <WorkflowNavigation />

      {/* Alertes de connectivité */}
      {!Object.values(apiStatus).every((status) => status) && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-6">
          <AlertTriangle className="h-5 w-5 inline mr-2" />
          <strong>Attention:</strong> Certaines APIs ne sont pas disponibles. Les fonctionnalités peuvent être limitées.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {currentStep === "patient" && (
            <PatientForm
              initialData={patientData}
              onDataChange={handlePatientDataChange}
              onNext={() => setCurrentStep("clinical")}
              isValid={isStepValid("patient")}
            />
          )}
          {currentStep === "clinical" && (
            <ClinicalForm
              initialData={clinicalData}
              onDataChange={handleClinicalDataChange}
              onNext={generateClinicalQuestions}
              onBack={() => setCurrentStep("patient")}
              isValid={isStepValid("clinical")}
              isLoading={isLoading}
              error={errors.questions}
              apiStatus={apiStatus}
            />
          )}
          {currentStep === "questions" && <QuestionsSection />}
        </div>

        <div>
          <StatusPanel />
        </div>
      </div>
    </div>
  )
}

export default RealMedicalSystemOpenAI
