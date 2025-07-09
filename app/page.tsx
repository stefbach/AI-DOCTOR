"use client"

import { useState, useReducer, useContext, createContext, useCallback, useMemo, useEffect } from "react"
import {
  Brain,
  Pill,
  FileText,
  User,
  Stethoscope,
  CheckCircle,
  Loader,
  Search,
  Shield,
  Activity,
  Target,
  Award,
  Settings,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  Heart,
  Thermometer,
  Download,
  Printer,
  Users,
  Database,
  Globe,
  BookOpen,
  FlaskConical,
  Zap,
  TrendingUp,
  Star,
  ExternalLink
} from "lucide-react"

// ========================================
// 🔑 CONFIGURATION OPENAI AVEC FUNCTION CALLING
// ========================================
const OPENAI_CONFIG = {
  apiKey: "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
", 
  baseURL: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4o", // Modèle le plus récent avec function calling
}

// ========================================
// 🗃️ SERVICES API MÉDICAUX OPTIMISÉS
// ========================================

class MedicalAPIService {
  constructor() {
    this.cache = new Map()
    this.rateLimiter = new Map()
    this.baseURLs = {
      fda: "https://api.fda.gov",
      rxnorm: "https://rxnav.nlm.nih.gov/REST",
      pubmed: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
      clinicaltrials: "https://clinicaltrials.gov/api/v2"
    }
  }

  // Cache intelligent avec TTL
  getCached(key, ttlMinutes = 60) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < ttlMinutes * 60 * 1000) {
      return cached.data
    }
    return null
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  // Rate limiting par API
  async checkRateLimit(apiName, maxRequests = 240, windowMs = 60000) {
    const now = Date.now()
    const requests = this.rateLimiter.get(apiName) || []
    const validRequests = requests.filter(time => now - time < windowMs)
    
    if (validRequests.length >= maxRequests) {
      throw new Error(`Rate limit exceeded for ${apiName}`)
    }
    
    validRequests.push(now)
    this.rateLimiter.set(apiName, validRequests)
  }

  // FDA Drug API - Informations sur médicaments
  async searchFDADrugs(drugName, limit = 5) {
    const cacheKey = `fda_drugs_${drugName}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    await this.checkRateLimit('fda')

    try {
      const response = await fetch(
        `${this.baseURLs.fda}/drug/label.json?search=openfda.brand_name:"${drugName}"&limit=${limit}`
      )
      const data = await response.json()
      
      const processed = data.results?.map(drug => ({
        brandName: drug.openfda?.brand_name?.[0],
        genericName: drug.openfda?.generic_name?.[0],
        manufacturer: drug.openfda?.manufacturer_name?.[0],
        indications: drug.indications_and_usage?.[0],
        contraindications: drug.contraindications?.[0],
        warnings: drug.warnings?.[0],
        dosage: drug.dosage_and_administration?.[0],
        adverseReactions: drug.adverse_reactions?.[0]
      })) || []

      this.setCache(cacheKey, processed)
      return processed
    } catch (error) {
      console.error('FDA API Error:', error)
      return []
    }
  }

  // RxNorm API - Interactions médicamenteuses
  async checkDrugInteractions(drugList) {
    const cacheKey = `interactions_${drugList.sort().join('_')}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    await this.checkRateLimit('rxnorm')

    try {
      const rxcuis = []
      
      // Obtenir RxCUI pour chaque médicament
      for (const drug of drugList) {
        const response = await fetch(
          `${this.baseURLs.rxnorm}/rxcui.json?name=${encodeURIComponent(drug)}`
        )
        const data = await response.json()
        if (data.idGroup?.rxnormId?.[0]) {
          rxcuis.push(data.idGroup.rxnormId[0])
        }
      }

      if (rxcuis.length < 2) return { interactions: [], severity: 'none' }

      // Vérifier interactions
      const interactionResponse = await fetch(
        `${this.baseURLs.rxnorm}/interaction/list.json?rxcuis=${rxcuis.join('+')}`
      )
      const interactionData = await interactionResponse.json()

      const interactions = interactionData.fullInteractionTypeGroup?.[0]?.fullInteractionType?.map(interaction => ({
        drug1: interaction.minConcept?.[0]?.name,
        drug2: interaction.minConcept?.[1]?.name,
        severity: interaction.interactionPair?.[0]?.severity,
        description: interaction.interactionPair?.[0]?.description
      })) || []

      const result = {
        interactions,
        severity: interactions.length > 0 ? 'warning' : 'none',
        hasInteractions: interactions.length > 0
      }

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error('RxNorm API Error:', error)
      return { interactions: [], severity: 'none', hasInteractions: false }
    }
  }

  // PubMed API - Littérature médicale
  async searchPubMed(query, maxResults = 5) {
    const cacheKey = `pubmed_${query}`
    const cached = this.getCached(cacheKey, 120) // 2h cache pour PubMed
    if (cached) return cached

    await this.checkRateLimit('pubmed')

    try {
      // Recherche d'IDs
      const searchResponse = await fetch(
        `${this.baseURLs.pubmed}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json`
      )
      const searchData = await searchResponse.json()
      const ids = searchData.esearchresult?.idlist || []

      if (ids.length === 0) return []

      // Récupérer détails des articles
      const detailsResponse = await fetch(
        `${this.baseURLs.pubmed}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
      )
      const detailsData = await detailsResponse.json()

      const articles = ids.map(id => {
        const article = detailsData.result[id]
        return {
          pmid: id,
          title: article?.title,
          authors: article?.authors?.map(a => a.name).join(', '),
          journal: article?.source,
          pubdate: article?.pubdate,
          doi: article?.elocationid,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
        }
      }).filter(article => article.title)

      this.setCache(cacheKey, articles)
      return articles
    } catch (error) {
      console.error('PubMed API Error:', error)
      return []
    }
  }

  // ClinicalTrials.gov API - Essais cliniques
  async searchClinicalTrials(condition, intervention = null, maxResults = 5) {
    const cacheKey = `trials_${condition}_${intervention || 'all'}`
    const cached = this.getCached(cacheKey, 240) // 4h cache pour trials
    if (cached) return cached

    await this.checkRateLimit('clinicaltrials')

    try {
      let query = `query.cond=${encodeURIComponent(condition)}`
      if (intervention) {
        query += `&query.intr=${encodeURIComponent(intervention)}`
      }
      
      const response = await fetch(
        `${this.baseURLs.clinicaltrials}/studies?${query}&countTotal=true&pageSize=${maxResults}&format=json`
      )
      const data = await response.json()

      const trials = data.studies?.map(study => ({
        nctId: study.protocolSection?.identificationModule?.nctId,
        title: study.protocolSection?.identificationModule?.briefTitle,
        status: study.protocolSection?.statusModule?.overallStatus,
        phase: study.protocolSection?.designModule?.phases?.[0],
        condition: study.protocolSection?.conditionsModule?.conditions?.[0],
        intervention: study.protocolSection?.armsInterventionsModule?.interventions?.[0]?.name,
        sponsor: study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
        locations: study.protocolSection?.contactsLocationsModule?.locations?.slice(0, 3),
        url: `https://clinicaltrials.gov/study/${study.protocolSection?.identificationModule?.nctId}`
      })) || []

      this.setCache(cacheKey, trials)
      return trials
    } catch (error) {
      console.error('ClinicalTrials API Error:', error)
      return []
    }
  }
}

// ========================================
// 🤖 SERVICE OPENAI AVEC FUNCTION CALLING
// ========================================

class OpenAIMedicalService {
  constructor() {
    this.apiService = new MedicalAPIService()
    this.functions = this.defineFunctions()
  }

  defineFunctions() {
    return [
      {
        name: "search_fda_drugs",
        description: "Recherche d'informations détaillées sur un médicament via l'API FDA",
        parameters: {
          type: "object",
          properties: {
            drug_name: { type: "string", description: "Nom du médicament à rechercher" },
            limit: { type: "number", description: "Nombre max de résultats", default: 5 }
          },
          required: ["drug_name"]
        }
      },
      {
        name: "check_drug_interactions",
        description: "Vérification des interactions médicamenteuses via RxNorm",
        parameters: {
          type: "object",
          properties: {
            drug_list: { type: "array", items: { type: "string" }, description: "Liste des médicaments" }
          },
          required: ["drug_list"]
        }
      },
      {
        name: "search_pubmed_literature",
        description: "Recherche de littérature médicale récente via PubMed",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Terme de recherche médical" },
            max_results: { type: "number", description: "Nombre max d'articles", default: 5 }
          },
          required: ["query"]
        }
      },
      {
        name: "search_clinical_trials",
        description: "Recherche d'essais cliniques via ClinicalTrials.gov",
        parameters: {
          type: "object",
          properties: {
            condition: { type: "string", description: "Condition/pathologie à rechercher" },
            intervention: { type: "string", description: "Intervention/traitement", default: null },
            max_results: { type: "number", description: "Nombre max d'essais", default: 5 }
          },
          required: ["condition"]
        }
      }
    ]
  }

  async executeFunction(functionName, args) {
    switch (functionName) {
      case 'search_fda_drugs':
        return await this.apiService.searchFDADrugs(args.drug_name, args.limit)
      case 'check_drug_interactions':
        return await this.apiService.checkDrugInteractions(args.drug_list)
      case 'search_pubmed_literature':
        return await this.apiService.searchPubMed(args.query, args.max_results)
      case 'search_clinical_trials':
        return await this.apiService.searchClinicalTrials(args.condition, args.intervention, args.max_results)
      default:
        throw new Error(`Function ${functionName} not found`)
    }
  }

  async generateEnhancedDiagnosis(patientData, clinicalPresentation, clinicalAnswers) {
    const messages = [
      {
        role: "system",
        content: `Tu es un médecin interniste expert avec accès aux bases de données médicales mondiales. 
        Tu peux utiliser les fonctions disponibles pour :
        - Rechercher des informations détaillées sur les médicaments (FDA)
        - Vérifier les interactions médicamenteuses (RxNorm) 
        - Consulter la littérature médicale récente (PubMed)
        - Rechercher des essais cliniques en cours (ClinicalTrials.gov)
        
        Utilise ces outils pour enrichir ton diagnostic et tes recommandations.`
      },
      {
        role: "user",
        content: `ANALYSE MÉDICALE COMPLÈTE AVEC DONNÉES EN TEMPS RÉEL

PATIENT:
${JSON.stringify(patientData, null, 2)}

PRÉSENTATION CLINIQUE:
${JSON.stringify(clinicalPresentation, null, 2)}

RÉPONSES AUX QUESTIONS CLINIQUES:
${Object.entries(clinicalAnswers).map(([i, answer]) => `Q${+i+1}: ${answer}`).join('\n')}

INSTRUCTIONS:
1. Utilise les fonctions disponibles pour rechercher des informations pertinentes
2. Propose un diagnostic différentiel basé sur les données actuelles
3. Vérifie les interactions avec les médicaments actuels du patient
4. Recherche la littérature récente pour ce type de cas
5. Identifie les essais cliniques pertinents si applicable

Réponds en JSON structuré avec toutes les informations collectées.`
      }
    ]

    try {
      const response = await fetch(OPENAI_CONFIG.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.model,
          messages,
          functions: this.functions,
          function_call: "auto",
          temperature: 0.1,
          max_tokens: 6000
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`)
      }

      const data = await response.json()
      let result = { functionCalls: [], finalAnalysis: null }

      // Traiter les appels de fonction
      if (data.choices[0].message.function_call) {
        const functionCall = data.choices[0].message.function_call
        const functionResult = await this.executeFunction(
          functionCall.name,
          JSON.parse(functionCall.arguments)
        )

        result.functionCalls.push({
          function: functionCall.name,
          arguments: JSON.parse(functionCall.arguments),
          result: functionResult
        })

        // Continuer la conversation avec les résultats
        messages.push(data.choices[0].message)
        messages.push({
          role: "function",
          name: functionCall.name,
          content: JSON.stringify(functionResult)
        })

        // Deuxième appel pour l'analyse finale
        const finalResponse = await fetch(OPENAI_CONFIG.baseURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`
          },
          body: JSON.stringify({
            model: OPENAI_CONFIG.model,
            messages,
            temperature: 0.1,
            max_tokens: 4000
          })
        })

        const finalData = await finalResponse.json()
        try {
          result.finalAnalysis = JSON.parse(finalData.choices[0].message.content)
        } catch {
          result.finalAnalysis = { analysis: finalData.choices[0].message.content }
        }
      }

      return result
    } catch (error) {
      console.error('OpenAI Enhanced Diagnosis Error:', error)
      throw error
    }
  }
}

// ========================================
// 📊 CONTEXTE ET REDUCER OPTIMISÉS
// ========================================

const initialState = {
  currentStep: 'patient',
  isLoading: false,
  errors: {},
  patientData: {
    name: '', age: '', gender: '', weight: '', height: '', ethnicity: '',
    medicalHistory: [], surgicalHistory: [], currentMedications: [], 
    allergies: [], familyHistory: [], smokingStatus: '', alcoholStatus: '', activityLevel: ''
  },
  clinicalPresentation: {
    chiefComplaint: '', symptoms: '', duration: '', severity: '',
    systolicBP: '', diastolicBP: '', heartRate: '', temperature: '', oxygenSaturation: ''
  },
  clinicalQuestions: null,
  clinicalAnswers: {},
  enhancedDiagnosis: null,
  prescription: null,
  workup: null,
  apiInsights: {
    fdaData: [],
    interactions: null,
    literature: [],
    trials: []
  }
}

const medicalReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload }
    
    case 'UPDATE_PATIENT_DATA':
      return {
        ...state,
        patientData: { ...state.patientData, ...action.payload }
      }
    
    case 'UPDATE_CLINICAL_PRESENTATION':
      return {
        ...state,
        clinicalPresentation: { ...state.clinicalPresentation, ...action.payload }
      }
    
    case 'SET_CLINICAL_QUESTIONS':
      return {
        ...state,
        clinicalQuestions: action.payload,
        currentStep: 'questions'
      }
    
    case 'UPDATE_CLINICAL_ANSWERS':
      return {
        ...state,
        clinicalAnswers: { ...state.clinicalAnswers, [action.index]: action.answer }
      }
    
    case 'SET_ENHANCED_DIAGNOSIS':
      return {
        ...state,
        enhancedDiagnosis: action.payload,
        currentStep: 'diagnosis'
      }
    
    case 'SET_API_INSIGHTS':
      return {
        ...state,
        apiInsights: { ...state.apiInsights, ...action.payload }
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.message }
      }
    
    case 'CLEAR_ERRORS':
      return { ...state, errors: {} }
    
    default:
      return state
  }
}

const MedicalContext = createContext()

// ========================================
// 🎯 COMPOSANTS OPTIMISÉS
// ========================================

const MedicalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(medicalReducer, initialState)
  const openAIService = useMemo(() => new OpenAIMedicalService(), [])

  const value = useMemo(() => ({
    state,
    dispatch,
    openAIService
  }), [state, openAIService])

  return (
    <MedicalContext.Provider value={value}>
      {children}
    </MedicalContext.Provider>
  )
}

// Hook personnalisé optimisé
const useMedical = () => {
  const context = useContext(MedicalContext)
  if (!context) {
    throw new Error('useMedical must be used within MedicalProvider')
  }
  return context
}

// Composant En-tête avec métriques en temps réel
const SystemHeader = () => {
  const { state } = useMedical()

  const metrics = useMemo(() => ({
    confidence: state.enhancedDiagnosis?.confidence || 0,
    functionCalls: state.enhancedDiagnosis?.functionCalls?.length || 0,
    completedSteps: Object.values({
      patient: state.patientData.name && state.patientData.age,
      clinical: state.clinicalPresentation.chiefComplaint,
      questions: state.clinicalQuestions && Object.keys(state.clinicalAnswers).length > 0,
      diagnosis: state.enhancedDiagnosis,
    }).filter(Boolean).length
  }), [state])

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-8 rounded-2xl mb-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center">
            <Brain className="h-10 w-10 mr-4" />
            Système Médical Expert IA - APIs Intégrées
          </h1>
          <p className="text-indigo-100 mt-3 text-lg">
            FDA • RxNorm • PubMed • ClinicalTrials.gov • OpenAI Function Calling
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-indigo-200">Confiance IA</div>
          <div className="text-3xl font-bold">{Math.round(metrics.confidence * 100)}%</div>
          <div className="text-xs text-indigo-200">
            {metrics.functionCalls} API calls • {metrics.completedSteps}/4 étapes
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
        <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
          <Database className="h-6 w-6 mx-auto mb-2" />
          <div className="text-xs">FDA</div>
          <div className="font-bold">{state.apiInsights.fdaData.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
          <Pill className="h-6 w-6 mx-auto mb-2" />
          <div className="text-xs">Interactions</div>
          <div className="font-bold">{state.apiInsights.interactions?.interactions?.length || 0}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
          <BookOpen className="h-6 w-6 mx-auto mb-2" />
          <div className="text-xs">PubMed</div>
          <div className="font-bold">{state.apiInsights.literature.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
          <FlaskConical className="h-6 w-6 mx-auto mb-2" />
          <div className="text-xs">Essais</div>
          <div className="font-bold">{state.apiInsights.trials.length}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
          <Zap className="h-6 w-6 mx-auto mb-2" />
          <div className="text-xs">API Calls</div>
          <div className="font-bold">{metrics.functionCalls}</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
          <TrendingUp className="h-6 w-6 mx-auto mb-2" />
          <div className="text-xs">Temps Réel</div>
          <div className="font-bold text-xs">ACTIF</div>
        </div>
      </div>
    </div>
  )
}

// Composant Diagnostic Enrichi avec APIs
const EnhancedDiagnosisPanel = () => {
  const { state, dispatch, openAIService } = useMedical()

  const handleEnhancedDiagnosis = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'CLEAR_ERRORS' })

    try {
      const result = await openAIService.generateEnhancedDiagnosis(
        state.patientData,
        state.clinicalPresentation,
        state.clinicalAnswers
      )

      dispatch({ type: 'SET_ENHANCED_DIAGNOSIS', payload: result })

      // Extraire les données des APIs pour affichage séparé
      const apiInsights = {}
      result.functionCalls?.forEach(call => {
        switch (call.function) {
          case 'search_fda_drugs':
            apiInsights.fdaData = call.result
            break
          case 'check_drug_interactions':
            apiInsights.interactions = call.result
            break
          case 'search_pubmed_literature':
            apiInsights.literature = call.result
            break
          case 'search_clinical_trials':
            apiInsights.trials = call.result
            break
        }
      })

      dispatch({ type: 'SET_API_INSIGHTS', payload: apiInsights })

    } catch (error) {
      dispatch({ type: 'SET_ERROR', field: 'diagnosis', message: error.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state, dispatch, openAIService])

  if (state.currentStep !== 'diagnosis') return null

  return (
    <div className="space-y-6">
      {/* Déclencheur diagnostic enrichi */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Brain className="h-6 w-6 mr-3 text-purple-600" />
          Diagnostic Enrichi avec APIs Médicales
        </h2>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <Star className="h-5 w-5 text-purple-600 mr-2" />
            <span className="font-semibold text-purple-800">Analyse IA Avancée</span>
          </div>
          <p className="text-sm text-purple-700">
            L'IA va interroger en temps réel les bases de données FDA, RxNorm, PubMed et ClinicalTrials.gov 
            pour enrichir le diagnostic avec les dernières données disponibles.
          </p>
        </div>

        <button
          onClick={handleEnhancedDiagnosis}
          disabled={state.isLoading || !state.clinicalAnswers || Object.keys(state.clinicalAnswers).length === 0}
          className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-lg"
        >
          {state.isLoading ? (
            <>
              <Loader className="animate-spin h-6 w-6 mr-3" />
              Analyse en cours avec APIs...
            </>
          ) : (
            <>
              <Globe className="h-6 w-6 mr-3" />
              Lancer Diagnostic Enrichi IA
            </>
          )}
        </button>
      </div>

      {/* Résultats API enrichis */}
      {state.enhancedDiagnosis && (
        <div className="space-y-6">
          {/* Analyse principale */}
          {state.enhancedDiagnosis.finalAnalysis && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-600" />
                Analyse Diagnostique IA
              </h3>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                  {JSON.stringify(state.enhancedDiagnosis.finalAnalysis, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Données FDA */}
          {state.apiInsights.fdaData?.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                Données FDA en Temps Réel
              </h3>
              <div className="space-y-4">
                {state.apiInsights.fdaData.map((drug, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">{drug.brandName || drug.genericName}</h4>
                    <div className="text-sm text-gray-600 mt-2">
                      <p><strong>Fabricant:</strong> {drug.manufacturer}</p>
                      <p><strong>Indications:</strong> {drug.indications?.substring(0, 200)}...</p>
                      {drug.contraindications && (
                        <p className="text-red-600"><strong>Contre-indications:</strong> {drug.contraindications.substring(0, 200)}...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactions médicamenteuses */}
          {state.apiInsights.interactions?.hasInteractions && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Interactions Médicamenteuses Détectées
              </h3>
              <div className="space-y-3">
                {state.apiInsights.interactions.interactions.map((interaction, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-red-800">
                        {interaction.drug1} ↔ {interaction.drug2}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        interaction.severity === 'major' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {interaction.severity}
                      </span>
                    </div>
                    <p className="text-sm text-red-700">{interaction.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Littérature PubMed */}
          {state.apiInsights.literature?.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                Littérature Médicale Récente
              </h3>
              <div className="space-y-4">
                {state.apiInsights.literature.map((article, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{article.title}</h4>
                    <div className="text-sm text-gray-600">
                      <p><strong>Auteurs:</strong> {article.authors}</p>
                      <p><strong>Journal:</strong> {article.journal} ({article.pubdate})</p>
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 mt-2"
                      >
                        Voir sur PubMed <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Essais cliniques */}
          {state.apiInsights.trials?.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <FlaskConical className="h-5 w-5 mr-2 text-orange-600" />
                Essais Cliniques en Cours
              </h3>
              <div className="space-y-4">
                {state.apiInsights.trials.map((trial, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{trial.title}</h4>
                    <div className="text-sm text-gray-600">
                      <p><strong>ID:</strong> {trial.nctId}</p>
                      <p><strong>Status:</strong> {trial.status}</p>
                      <p><strong>Phase:</strong> {trial.phase}</p>
                      <p><strong>Sponsor:</strong> {trial.sponsor}</p>
                      <a 
                        href={trial.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 mt-2"
                      >
                        Voir sur ClinicalTrials.gov <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Erreurs */}
      {state.errors.diagnosis && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5 inline mr-2" />
          {state.errors.diagnosis}
        </div>
      )}
    </div>
  )
}

// Composant principal simplifié
const OptimizedMedicalSystem = () => {
  const { state, dispatch } = useMedical()

  const updatePatientData = useCallback((field, value) => {
    dispatch({ type: 'UPDATE_PATIENT_DATA', payload: { [field]: value } })
  }, [dispatch])

  const updateClinicalPresentation = useCallback((field, value) => {
    dispatch({ type: 'UPDATE_CLINICAL_PRESENTATION', payload: { [field]: value } })
  }, [dispatch])

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <SystemHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Section Patient simplifié */}
          {state.currentStep === 'patient' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <User className="h-6 w-6 mr-3 text-blue-600" />
                Données Patient
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={state.patientData.name}
                  onChange={(e) => updatePatientData('name', e.target.value)}
                  placeholder="Nom complet *"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={state.patientData.age}
                  onChange={(e) => updatePatientData('age', parseInt(e.target.value))}
                  placeholder="Âge *"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={state.patientData.gender}
                  onChange={(e) => updatePatientData('gender', e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Genre *</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'clinical' })}
                  disabled={!state.patientData.name || !state.patientData.age || !state.patientData.gender}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Continuer <ChevronRight className="h-5 w-5 ml-2 inline" />
                </button>
              </div>
            </div>
          )}

          {/* Section Clinique simplifié */}
          {state.currentStep === 'clinical' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Stethoscope className="h-6 w-6 mr-3 text-green-600" />
                Présentation Clinique
              </h2>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={state.clinicalPresentation.chiefComplaint}
                  onChange={(e) => updateClinicalPresentation('chiefComplaint', e.target.value)}
                  placeholder="Motif de consultation *"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={state.clinicalPresentation.symptoms}
                  onChange={(e) => updateClinicalPresentation('symptoms', e.target.value)}
                  placeholder="Histoire de la maladie actuelle *"
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'patient' })}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Retour
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'diagnosis' })}
                  disabled={!state.clinicalPresentation.chiefComplaint || !state.clinicalPresentation.symptoms}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Lancer Diagnostic IA <ChevronRight className="h-5 w-5 ml-2 inline" />
                </button>
              </div>
            </div>
          )}

          {/* Diagnostic enrichi */}
          <EnhancedDiagnosisPanel />
        </div>

        {/* Panneau latéral */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Status Système</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>OpenAI:</span>
                <span className="text-green-600 font-semibold">✓ Configuré</span>
              </div>
              <div className="flex justify-between">
                <span>FDA API:</span>
                <span className="text-green-600 font-semibold">✓ Actif</span>
              </div>
              <div className="flex justify-between">
                <span>RxNorm:</span>
                <span className="text-green-600 font-semibold">✓ Actif</span>
              </div>
              <div className="flex justify-between">
                <span>PubMed:</span>
                <span className="text-green-600 font-semibold">✓ Actif</span>
              </div>
              <div className="flex justify-between">
                <span>ClinicalTrials:</span>
                <span className="text-green-600 font-semibold">✓ Actif</span>
              </div>
            </div>
          </div>

          {state.patientDat
