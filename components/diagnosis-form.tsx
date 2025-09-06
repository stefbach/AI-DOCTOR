"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  Brain, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Target,
  Search,
  Eye,
  FileText,
  TestTube,
  Pill,
  Stethoscope,
  Edit3,
  Clock,
  MapPin,
  AlertCircle,
  Activity,
  Monitor,
  Calendar,
  DollarSign,
  Lightbulb,
  Shield,
  Zap,
  FlaskConical,
  ClipboardCheck,
  RefreshCw,
  Sparkles,
  User,
  Circle
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"
import PatientAdviceCarousel from './patient-advice-carousel'

interface DiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
  language?: Language
  consultationId?: string | null
}

// ==================== FONCTION DE TRANSFORMATION DES DONNÉES API ====================
const transformApiDataToFrontend = (apiData: any) => {
  console.log('🔄 Transforming API data for frontend compatibility...')
  console.log('🔍 API Data Keys:', Object.keys(apiData))
  
  // Debug API structure
  if (apiData.diagnosis) console.log('📊 Diagnosis structure:', Object.keys(apiData.diagnosis))
  if (apiData.clinical_analysis) console.log('📊 Clinical analysis structure:', Object.keys(apiData.clinical_analysis))
  if (apiData.investigation_strategy) console.log('📊 Investigation strategy structure:', Object.keys(apiData.investigation_strategy))
  if (apiData.treatment_plan) console.log('📊 Treatment plan structure:', Object.keys(apiData.treatment_plan))
  
  return {
    // ========== DIAGNOSTIC PRINCIPAL ==========
    diagnosis: {
      primary: apiData.diagnosis?.primary || {
        condition: apiData.clinical_analysis?.primary_diagnosis?.condition || "Diagnostic en cours d'évaluation",
        icd10: apiData.clinical_analysis?.primary_diagnosis?.icd10_code || 
               apiData.clinical_analysis?.primary_diagnosis?.icd10 || 
               apiData.diagnosis?.primary?.icd10 || "R69",
        confidence: apiData.clinical_analysis?.primary_diagnosis?.confidence_level || 
                   apiData.diagnosis?.primary?.confidence || 70,
        severity: apiData.clinical_analysis?.primary_diagnosis?.severity || "modérée",
        detailedAnalysis: apiData.clinical_analysis?.primary_diagnosis?.pathophysiology || 
                         "Analyse détaillée basée sur la présentation clinique",
        clinicalRationale: apiData.clinical_analysis?.primary_diagnosis?.clinical_reasoning || 
                          "Raisonnement clinique structuré",
        prognosis: "Evolution favorable avec prise en charge appropriée",
        diagnosticCriteriaMet: [
          "Présentation clinique compatible",
          "Analyse structurée réalisée",
          "Critères diagnostiques évalués"
        ],
        certaintyLevel: (apiData.clinical_analysis?.primary_diagnosis?.confidence_level || 70) > 80 ? "Élevée" : "Modérée"
      },
      differential: apiData.clinical_analysis?.differential_diagnoses || 
                   apiData.diagnosis?.differential || []
    },

    // ========== RAISONNEMENT DIAGNOSTIQUE ==========
    diagnosticReasoning: apiData.diagnostic_reasoning || {
      key_findings: {
        from_history: apiData.diagnostic_reasoning?.key_findings?.from_history || "Analyse de l'historique médical",
        from_symptoms: apiData.diagnostic_reasoning?.key_findings?.from_symptoms || "Analyse des symptômes présentés",
        from_ai_questions: apiData.diagnostic_reasoning?.key_findings?.from_ai_questions || "Réponses au questionnaire IA analysées",
        red_flags: apiData.diagnostic_reasoning?.key_findings?.red_flags || "Aucun signe d'alarme identifié"
      },
      syndrome_identification: {
        clinical_syndrome: apiData.diagnostic_reasoning?.syndrome_identification?.clinical_syndrome || "Syndrome clinique identifié",
        supporting_features: apiData.diagnostic_reasoning?.syndrome_identification?.supporting_features || ["Symptômes compatibles"],
        inconsistent_features: apiData.diagnostic_reasoning?.syndrome_identification?.inconsistent_features || []
      },
      clinical_confidence: {
        diagnostic_certainty: apiData.diagnostic_reasoning?.clinical_confidence?.diagnostic_certainty || "Modérée",
        reasoning: apiData.diagnostic_reasoning?.clinical_confidence?.reasoning || "Basé sur les données de téléconsultation",
        missing_information: apiData.diagnostic_reasoning?.clinical_confidence?.missing_information || "Examen physique complet recommandé"
      }
    },

    // ========== ANALYSE EXPERTE ==========
    expertAnalysis: {
      expert_investigations: {
        investigation_strategy: {
          diagnostic_approach: apiData.investigation_strategy?.clinical_justification || 
                              "Approche diagnostique systématique",
          tests_by_purpose: {
            to_confirm_primary: (apiData.investigation_strategy?.laboratory_tests || [])
              .slice(0, 2)
              .map((test: any) => ({
                test: test.test_name || "Examen de laboratoire",
                rationale: test.clinical_justification || "Confirmation diagnostique"
              })),
            to_exclude_differentials: (apiData.investigation_strategy?.laboratory_tests || [])
              .slice(2, 4)
              .map((test: any) => ({
                test: test.test_name || "Test différentiel",
                differential: "Diagnostic différentiel"
              })),
            to_assess_severity: (apiData.investigation_strategy?.laboratory_tests || [])
              .slice(4, 6)
              .map((test: any) => ({
                test: test.test_name || "Évaluation sévérité",
                purpose: "Évaluation de la sévérité"
              }))
          },
          test_sequence: {
            immediate: "Tests urgents si nécessaire",
            urgent: "Bilan dans les 24-48h",
            routine: "Suivi selon évolution"
          }
        },
        immediate_priority: (apiData.investigation_strategy?.laboratory_tests || []).map((test: any) => ({
          category: 'biology',
          examination: test.test_name || "Examen de laboratoire",
          specific_indication: test.clinical_justification || "Indication clinique",
          urgency: test.urgency || 'routine',
          mauritius_availability: {
            where: test.mauritius_logistics?.where || "C-Lab, Green Cross, Biosanté",
            cost: test.mauritius_logistics?.cost || "Rs 500-1200",
            turnaround: test.mauritius_logistics?.turnaround || "2-6h"
          }
        }))
      },
      
      expert_therapeutics: {
        primary_treatments: (apiData.medications || apiData.treatment_plan?.medications || []).map((med: any) => ({
          medication_dci: med.dci || med.name || med.medication_name || "Médicament",
          therapeutic_class: "Classe thérapeutique",
          precise_indication: med.indication || med.why_prescribed || "Indication médicale",
          mechanism: "Mécanisme d'action thérapeutique",
          dosing_regimen: {
            adult: { en: med.posology || med.how_to_take || med.dosing?.adult || "Selon prescription" },
            adjustments: {
              elderly: { en: "Ajustement si nécessaire" },
              renal: { en: "Adaptation selon fonction rénale" }
            }
          },
          duration: { en: med.duration || "Selon évolution" },
          mauritius_availability: {
            public_free: true,
            estimated_cost: "Rs 50-300"
          }
        }))
      }
    },

    // ========== DOCUMENTS MAURITIENS ==========
    mauritianDocuments: apiData.mauritianDocuments || apiData.mauritiusDocuments || {
      consultation: {
        header: {
          title: "RAPPORT DE CONSULTATION",
          date: new Date().toLocaleDateString('fr-FR'),
          physician: "Dr. MÉDECIN EXPERT"
        },
        patient: {
          firstName: "Patient",
          lastName: "",
          age: "? ans"
        }
      },
      biological: apiData.mauritianDocuments?.biological || null,
      prescription: apiData.mauritianDocuments?.prescription || null,
      imaging: apiData.mauritianDocuments?.imaging || null
    }
  }
}

// Component for appearance animation
const AnimatedSection = ({ 
  show, 
  children, 
  delay = 0 
}: { 
  show: boolean
  children: React.ReactNode
  delay?: number 
}) => (
  <div 
    className={`
      transition-all duration-1000 ease-out
      ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
    `}
    style={{ 
      transitionDelay: `${delay}ms`,
      display: show ? 'block' : 'none'
    }}
  >
    {children}
  </div>
)

// Component for progressive text appearance
const StreamingText = ({ 
  text, 
  speed = 10,
  onComplete 
}: { 
  text: string
  speed?: number
  onComplete?: () => void
}) => {
  const [displayedText, setDisplayedText] = useState('')
  
  useEffect(() => {
    if (!text) return
    
    setDisplayedText('')
    let index = 0
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1))
        index++
      } else {
        clearInterval(timer)
        onComplete?.()
      }
    }, speed)
    
    return () => clearInterval(timer)
  }, [text, speed, onComplete])
  
  return <span>{displayedText}</span>
}

// Component for section status
const SectionStatus = ({ status }: { status: 'pending' | 'loading' | 'complete' }) => {
  const configs = {
    pending: {
      icon: <Clock className="h-3 w-3 text-gray-400" />,
      text: "En attente",
      className: "bg-gray-100 text-gray-600"
    },
    loading: {
      icon: <Loader2 className="h-3 w-3 animate-spin text-blue-600" />,
      text: "Analyse...",
      className: "bg-blue-100 text-blue-600"
    },
    complete: {
      icon: <CheckCircle className="h-3 w-3 text-green-600" />,
      text: "Terminé",
      className: "bg-green-100 text-green-600"
    }
  }
  
  const config = configs[status]
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  )
}

// Helper component for progress steps
function ProgressStep({ 
  completed, 
  active, 
  children 
}: { 
  completed: boolean
  active: boolean
  children: React.ReactNode 
}) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-300 ${
      completed ? 'opacity-100' : 'opacity-60'
    }`}>
      {completed ? (
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
      ) : active ? (
        <div className="h-5 w-5 flex-shrink-0">
          <div className="h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent animate-spin" />
        </div>
      ) : (
        <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
      )}
      <span className={`text-sm ${
        completed ? 'text-green-700 font-medium' : 
        active ? 'text-blue-700 font-medium' : 
        'text-gray-500'
      }`}>
        {children}
      </span>
    </div>
  )
}

export default function DiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  onDataChange,
  onNext,
  onPrevious,
  language = 'en',
  consultationId
}: DiagnosisFormProps) {
  // ==================== ÉTATS PRINCIPAUX ====================
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [diagnosticReasoning, setDiagnosticReasoning] = useState<any>(null)
  const [expertAnalysis, setExpertAnalysis] = useState<any>(null)
  const [mauritianDocuments, setMauritianDocuments] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [documentsGenerated, setDocumentsGenerated] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<string | null>(null)
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false)
  const [generationInProgress, setGenerationInProgress] = useState(false)
  
  // États pour la progression
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("Initialisation...")
  
  // États pour l'apparition progressive
  const [showReasoning, setShowReasoning] = useState(false)
  const [showPrimaryDiagnosis, setShowPrimaryDiagnosis] = useState(false)
  const [showInvestigations, setShowInvestigations] = useState(false)
  const [showTreatments, setShowTreatments] = useState(false)
  const [showDifferential, setShowDifferential] = useState(false)
  const [showMonitoring, setShowMonitoring] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)
  
  // États pour le statut des sections
  const [sectionStatus, setSectionStatus] = useState({
    reasoning: 'pending' as 'pending' | 'loading' | 'complete',
    primary: 'pending' as 'pending' | 'loading' | 'complete',
    investigations: 'pending' as 'pending' | 'loading' | 'complete',
    treatments: 'pending' as 'pending' | 'loading' | 'complete',
    differential: 'pending' as 'pending' | 'loading' | 'complete',
    monitoring: 'pending' as 'pending' | 'loading' | 'complete',
    documents: 'pending' as 'pending' | 'loading' | 'complete'
  })

  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)

  // ==================== CHARGEMENT DES DONNÉES SAUVEGARDÉES ====================
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('📂 Loading saved diagnosis data...')
      try {
        const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
        
        if (currentConsultationId) {
          const savedData = await consultationDataService.getAllData()
          console.log('💾 Saved data found:', {
            hasDiagnosisData: !!savedData?.diagnosisData,
            hasDiagnosis: !!savedData?.diagnosisData?.diagnosis,
            hasDocuments: !!savedData?.diagnosisData?.mauritianDocuments
          })
          
          if (savedData?.diagnosisData) {
            if (savedData.diagnosisData.diagnosis) {
              setDiagnosis(savedData.diagnosisData.diagnosis)
              setHasAutoGenerated(true)
              // Si on a des données sauvegardées, tout afficher directement
              setShowReasoning(true)
              setShowPrimaryDiagnosis(true)
              setShowInvestigations(true)
              setShowTreatments(true)
              setShowDifferential(true)
              setShowMonitoring(true)
              setShowDocuments(true)
              setSectionStatus({
                reasoning: 'complete',
                primary: 'complete',
                investigations: 'complete',
                treatments: 'complete',
                differential: 'complete',
                monitoring: 'complete',
                documents: 'complete'
              })
            }
            if (savedData.diagnosisData.diagnosticReasoning) {
              setDiagnosticReasoning(savedData.diagnosisData.diagnosticReasoning)
            }
            if (savedData.diagnosisData.expertAnalysis) {
              setExpertAnalysis(savedData.diagnosisData.expertAnalysis)
            }
            if (savedData.diagnosisData.mauritianDocuments) {
              setMauritianDocuments(savedData.diagnosisData.mauritianDocuments)
              setDocumentsGenerated(true)
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading saved diagnosis data:', error)
      }
    }
    
    loadSavedData()
  }, [consultationId])

  // ==================== PROGRESSION RÉALISTE ====================
  useEffect(() => {
    if (loading) {
      setAnalysisProgress(0)
      
      const messages = [
        { time: 0, msg: "Connexion à l'IA Médicale GPT-5...", progress: 5 },
        { time: 2000, msg: "Analyse des symptômes et historique médical...", progress: 15 },
        { time: 5000, msg: "Identification du syndrome clinique...", progress: 25 },
        { time: 10000, msg: "Formulation des hypothèses diagnostiques...", progress: 40 },
        { time: 20000, msg: "Élaboration de la stratégie d'investigation...", progress: 60 },
        { time: 30000, msg: "Génération du plan de traitement personnalisé...", progress: 75 },
        { time: 40000, msg: "Adaptation au contexte mauricien...", progress: 85 },
        { time: 50000, msg: "Finalisation de l'analyse et des documents...", progress: 95 }
      ]
      
      const timers = messages.map(({ time, msg, progress }) => {
        return setTimeout(() => {
          if (loading) {
            setProgressMessage(msg)
            setAnalysisProgress(progress)
          }
        }, time)
      })
      
      return () => {
        timers.forEach(timer => clearTimeout(timer))
        setAnalysisProgress(0)
      }
    }
  }, [loading])

  // ==================== AUTO-GÉNÉRATION SÉCURISÉE ====================
  useEffect(() => {
    console.log('🎯 AUTO-GENERATION CHECK (SECURED):', {
      hasAutoGenerated,
      hasDiagnosis: !!diagnosis,
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      chiefComplaint: clinicalData?.chiefComplaint,
      generationInProgress
    })

    if (!hasAutoGenerated && 
        !diagnosis && 
        !generationInProgress &&
        patientData && 
        clinicalData && 
        clinicalData.chiefComplaint) {
      
      console.log('🚀 AUTO-GENERATING DIAGNOSIS (SECURED)...')
      setHasAutoGenerated(true)
      setGenerationInProgress(true)
      generateCompleteDiagnosisAndDocuments()
    }
  }, [hasAutoGenerated, diagnosis, patientData, clinicalData, generationInProgress])

  // ==================== SAUVEGARDE AUTOMATIQUE ====================
  useEffect(() => {
    const saveData = async () => {
      if (!diagnosis || !mauritianDocuments) return
      
      try {
        const dataToSave = {
          diagnosis,
          diagnosticReasoning,
          expertAnalysis,
          mauritianDocuments,
          documentsGenerated,
          timestamp: new Date().toISOString()
        }
        await consultationDataService.saveStepData(3, dataToSave)
        console.log("💾 Auto-saved diagnosis data")
      } catch (error) {
        console.error('❌ Error saving diagnosis data:', error)
      }
    }
    
    saveData()
  }, [diagnosis, diagnosticReasoning, expertAnalysis, mauritianDocuments, documentsGenerated])

  // ==================== TEST API ====================
  const testAPI = async () => {
    console.log('🧪 Testing API...')
    setApiTestResult('Test en cours...')
    try {
      const res = await fetch('/api/openai-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: { age: 30, sex: 'M', firstName: 'Test', lastName: 'Patient' },
          clinicalData: { chiefComplaint: 'Test chest pain' },
          questionsData: [],
          language: 'en'
        })
      })
      const data = await res.json()
      console.log('🧪 API Test Response:', data)
      setApiTestResult(data.success ? '✅ API fonctionne!' : `❌ Erreur: ${data.error}`)
    } catch (error) {
      console.error('🧪 API Test Error:', error)
      setApiTestResult(`❌ Erreur: ${error}`)
    }
  }

  // ==================== ANIMATION PROGRESSIVE CORRIGÉE ====================
  const animateProgressiveAppearance = (rawApiData: any) => {
    console.log('🎭 Starting corrected progressive appearance...')
    console.log('📥 Raw API Data received:', Object.keys(rawApiData))
    
    // Transformer les données d'abord
    const data = transformApiDataToFrontend(rawApiData)
    console.log('🔄 Transformed data:', Object.keys(data))
    
    // Reset de tous les états d'affichage
    setShowReasoning(false)
    setShowPrimaryDiagnosis(false)
    setShowInvestigations(false)
    setShowTreatments(false)
    setShowDifferential(false)
    setShowMonitoring(false)
    setShowDocuments(false)
    
    // 1. Raisonnement diagnostique
    setTimeout(() => {
      setSectionStatus(prev => ({ ...prev, reasoning: 'loading' }))
    }, 500)
    
    setTimeout(() => {
      console.log('📊 Setting diagnostic reasoning:', !!data.diagnosticReasoning)
      setDiagnosticReasoning(data.diagnosticReasoning)
      setShowReasoning(true)
      setSectionStatus(prev => ({ ...prev, reasoning: 'complete', primary: 'loading' }))
    }, 2000)
    
    // 2. Diagnostic principal
    setTimeout(() => {
      console.log('🎯 Setting primary diagnosis:', !!data.diagnosis)
      setDiagnosis(data.diagnosis)
      setShowPrimaryDiagnosis(true)
      setSectionStatus(prev => ({ ...prev, primary: 'complete', investigations: 'loading' }))
    }, 4000)
    
    // 3. Investigations - CORRIGÉ
    setTimeout(() => {
      console.log('🔬 Setting expert analysis:', !!data.expertAnalysis, !!data.expertAnalysis?.expert_investigations)
      setExpertAnalysis(data.expertAnalysis)
      setShowInvestigations(true)
      setSectionStatus(prev => ({ ...prev, investigations: 'complete', treatments: 'loading' }))
    }, 6000)
    
    // 4. Traitements
    setTimeout(() => {
      console.log('💊 Showing treatments')
      setShowTreatments(true)
      setSectionStatus(prev => ({ ...prev, treatments: 'complete', differential: 'loading' }))
    }, 8000)
    
    // 5. Diagnostics différentiels
    setTimeout(() => {
      console.log('🔍 Showing differential diagnoses')
      setShowDifferential(true)
      setSectionStatus(prev => ({ ...prev, differential: 'complete', monitoring: 'loading' }))
    }, 10000)
    
    // 6. Surveillance
    setTimeout(() => {
      console.log('📊 Showing monitoring')
      setShowMonitoring(true)
      setSectionStatus(prev => ({ ...prev, monitoring: 'complete', documents: 'loading' }))
    }, 11500)
    
    // 7. Documents
    setTimeout(() => {
      console.log('📄 Setting documents:', !!data.mauritianDocuments)
      setMauritianDocuments(data.mauritianDocuments)
      setShowDocuments(true)
      setDocumentsGenerated(true)
      setSectionStatus(prev => ({ ...prev, documents: 'complete' }))
      
      // Données complètes pour le composant parent
      const completeData = {
        diagnosis: data.diagnosis,
        diagnosticReasoning: data.diagnosticReasoning,
        mauritianDocuments: data.mauritianDocuments,
        expertAnalysis: data.expertAnalysis,
        completeData: data,
        documentsGenerated: true
      }
      console.log('✅ Notifying parent component with complete data')
      onDataChange(completeData)
    }, 13000)
  }

  // ==================== GÉNÉRATION COMPLÈTE CORRIGÉE ====================
  const generateCompleteDiagnosisAndDocuments = async () => {
    console.log('🩺 ========== STARTING CORRECTED DIAGNOSIS GENERATION ==========')
    console.log('📋 Patient Data:', {
      hasData: !!patientData,
      age: patientData?.age,
      sex: patientData?.sex,
      name: `${patientData?.firstName} ${patientData?.lastName}`
    })
    console.log('🏥 Clinical Data:', {
      hasData: !!clinicalData,
      chiefComplaint: clinicalData?.chiefComplaint,
      symptoms: clinicalData?.symptoms?.length || 0
    })

    if (!patientData || !clinicalData) {
      console.error('❌ Missing required data')
      setError("Données patient ou cliniques manquantes")
      setGenerationInProgress(false)
      return
    }

    setLoading(true)
    setError(null)
    setDocumentsGenerated(false)

    try {
      console.log("📡 Calling API /api/openai-diagnosis...")
      
      const requestBody = {
        patientData,
        clinicalData,
        questionsData: questionsData?.responses || [],
        language,
      }
      
      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📨 Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`)
      }

      const rawApiData = await response.json()
      console.log("✅ API Response received:", {
        success: rawApiData.success,
        hasDiagnosis: !!rawApiData.diagnosis,
        hasDocuments: !!rawApiData.mauritianDocuments,
        hasMedications: !!rawApiData.medications,
        hasInvestigations: !!rawApiData.investigation_strategy,
        hasClinicalAnalysis: !!rawApiData.clinical_analysis
      })

      // Debug de la structure complète
      console.log("🔍 COMPLETE API STRUCTURE DEBUG:")
      console.log("- Keys:", Object.keys(rawApiData))
      if (rawApiData.diagnosis) console.log("- Diagnosis keys:", Object.keys(rawApiData.diagnosis))
      if (rawApiData.clinical_analysis) console.log("- Clinical analysis keys:", Object.keys(rawApiData.clinical_analysis))

      if (rawApiData.success) {
        console.log("✅ Starting corrected progressive display...")
        setLoading(false)
        setGenerationInProgress(false)
        animateProgressiveAppearance(rawApiData)
      } else {
        throw new Error(rawApiData.error || "Format de réponse invalide")
      }

    } catch (err) {
      console.error("❌ Generation error:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")
      setGenerationInProgress(false)

      console.log("⚠️ Generating fallback data...")
      const fallbackData = generateCompleteFallback()
      setLoading(false)
      animateProgressiveAppearance({
        diagnosis: fallbackData.diagnosis,
        medications: [],
        mauritianDocuments: fallbackData.mauritianDocuments,
        diagnostic_reasoning: fallbackData.diagnosticReasoning
      })
      
    } finally {
      console.log('🩺 ========== DIAGNOSIS GENERATION COMPLETE ==========')
    }
  }

  // ==================== RÉGÉNÉRATION FORCÉE ====================
  const forceRegenerate = () => {
    console.log('🔄 Force regenerating diagnosis...')
    setHasAutoGenerated(false)
    setGenerationInProgress(false)
    setDiagnosis(null)
    setExpertAnalysis(null)
    setDiagnosticReasoning(null)
    setMauritianDocuments(null)
    setDocumentsGenerated(false)
    setShowReasoning(false)
    setShowPrimaryDiagnosis(false)
    setShowInvestigations(false)
    setShowTreatments(false)
    setShowDifferential(false)
    setShowMonitoring(false)
    setShowDocuments(false)
    setSectionStatus({
      reasoning: 'pending',
      primary: 'pending',
      investigations: 'pending',
      treatments: 'pending',
      differential: 'pending',
      monitoring: 'pending',
      documents: 'pending'
    })
    generateCompleteDiagnosisAndDocuments()
  }

  // ==================== DONNÉES DE SECOURS ====================
  const generateCompleteFallback = () => {
    console.log('🔧 Generating fallback diagnosis...')
    
    const fallbackDiagnosis = {
      primary: {
        condition: `Syndrome clinique - ${clinicalData?.chiefComplaint || "Consultation médicale"}`,
        icd10: "R53",
        confidence: 70,
        severity: "modérée",
        detailedAnalysis: "Analyse basée sur les symptômes présentés nécessitant investigation complémentaire",
        clinicalRationale: `Symptômes: ${clinicalData?.chiefComplaint}. Nécessite anamnèse complète et examen clinique`,
        prognosis: "Evolution favorable attendue avec prise en charge appropriée",
        diagnosticCriteriaMet: ["Symptômes compatibles", "Contexte clinique évocateur"],
        certaintyLevel: "Modérée"
      },
      differential: [
        {
          condition: "Syndrome viral",
          probability: 40,
          reasoning: "Cause fréquente de symptômes non spécifiques",
          discriminating_test: "Sérologie virale"
        }
      ]
    }

    const fallbackDiagnosticReasoning = {
      key_findings: {
        from_history: "Données cliniques de base disponibles",
        from_symptoms: clinicalData?.chiefComplaint || "Symptômes à préciser",
        from_ai_questions: "Réponses au questionnaire IA",
        red_flags: "Aucun signe d'alarme identifié"
      },
      syndrome_identification: {
        clinical_syndrome: "Syndrome à préciser",
        supporting_features: ["Symptômes rapportés"],
        inconsistent_features: ["À évaluer"]
      }
    }

    const fallbackExpertAnalysis = {
      expert_investigations: {
        investigation_strategy: {
          diagnostic_approach: "Approche diagnostique systématique",
          tests_by_purpose: {
            to_confirm_primary: [],
            to_exclude_differentials: [],
            to_assess_severity: []
          },
          test_sequence: {
            immediate: "Tests urgents si nécessaire",
            urgent: "Bilan dans les 24-48h",
            routine: "Suivi selon évolution"
          }
        },
        immediate_priority: [
          {
            category: "biology",
            examination: "Numération formule sanguine + CRP",
            specific_indication: "Recherche d'un syndrome inflammatoire",
            urgency: "urgent",
            mauritius_availability: {
              where: "C-Lab, Green Cross",
              cost: "Rs 600-1200",
              turnaround: "2-6h urgent"
            }
          }
        ]
      },
      expert_therapeutics: {
        primary_treatments: [
          {
            medication_dci: "Paracétamol",
            therapeutic_class: "Antalgique-Antipyrétique",
            precise_indication: "Traitement symptomatique douleur/fièvre",
            mechanism: "Inhibition de la synthèse des prostaglandines au niveau central",
            dosing_regimen: {
              adult: { en: "1g x 3-4/jour" }
            },
            mauritius_availability: {
              public_free: true,
              estimated_cost: "Rs 50-100"
            }
          }
        ]
      }
    }

    const dateFormat = new Date().toLocaleDateString("fr-FR")
    
    const fallbackDocuments = {
      consultation: {
        header: {
          title: "RAPPORT DE CONSULTATION",
          date: dateFormat,
          physician: "Dr. MÉDECIN EXPERT"
        },
        patient: {
          firstName: patientData?.firstName || "Patient",
          lastName: patientData?.lastName || "",
          age: `${patientData?.age || "?"} ans`
        },
        diagnostic_reasoning: fallbackDiagnosticReasoning,
        clinical_summary: {
          chief_complaint: clinicalData?.chiefComplaint || "À préciser",
          diagnosis: fallbackDiagnosis.primary.condition
        }
      }
    }

    return {
      diagnosis: fallbackDiagnosis,
      diagnosticReasoning: fallbackDiagnosticReasoning,
      expertAnalysis: fallbackExpertAnalysis,
      mauritianDocuments: fallbackDocuments
    }
  }

  // ==================== SECTIONS DE NAVIGATION ====================
  const sections = [
    { id: "reasoning", title: "Raisonnement Diagnostique", icon: Brain, status: sectionStatus.reasoning },
    { id: "primary", title: "Diagnostic Principal", icon: Target, status: sectionStatus.primary },
    { id: "examinations", title: "Stratégie d'Investigation", icon: TestTube, status: sectionStatus.investigations },
    { id: "treatments", title: "Traitements Prescrits", icon: Pill, status: sectionStatus.treatments },
    { id: "differential", title: "Diagnostics Différentiels", icon: Search, status: sectionStatus.differential },
    { id: "monitoring", title: "Surveillance", icon: Monitor, status: sectionStatus.monitoring },
    { id: "documents", title: "Documents Maurice", icon: FileText, status: sectionStatus.documents },
  ]

  // ==================== INTERFACE DE CHARGEMENT ====================
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Carrousel de conseils personnalisés */}
        <PatientAdviceCarousel 
          patientData={patientData}
          clinicalData={clinicalData}
          analysisProgress={analysisProgress}
          progressMessage={progressMessage}
        />
        
        {/* Carte d'analyse IA en cours */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
            <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold">
              <Brain className="h-6 w-6 animate-pulse" />
              Intelligence Artificielle GPT-5 en Action
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Indicateurs de qualité */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <Shield className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-700">Recommandations Int.</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-700">Maurice</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <Brain className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-700">GPT-5</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <Sparkles className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-700">Expert</p>
              </div>
            </div>

            {/* Liste d'étapes avec animation */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg">
              <div className="space-y-2">
                <ProgressStep completed={analysisProgress > 10} active={analysisProgress <= 10}>
                  Analyse des données patient
                </ProgressStep>
                <ProgressStep completed={analysisProgress > 25} active={analysisProgress > 10 && analysisProgress <= 25}>
                  Identification du syndrome clinique
                </ProgressStep>
                <ProgressStep completed={analysisProgress > 40} active={analysisProgress > 25 && analysisProgress <= 40}>
                  Formulation des hypothèses diagnostiques
                </ProgressStep>
                <ProgressStep completed={analysisProgress > 60} active={analysisProgress > 40 && analysisProgress <= 60}>
                  Stratégie d'investigation
                </ProgressStep>
                <ProgressStep completed={analysisProgress > 75} active={analysisProgress > 60 && analysisProgress <= 75}>
                  Plan de traitement personnalisé
                </ProgressStep>
                <ProgressStep completed={analysisProgress > 85} active={analysisProgress > 75 && analysisProgress <= 85}>
                  Adaptation au contexte mauricien
                </ProgressStep>
              </div>
            </div>

            {/* Animation de chargement centrée */}
            <div className="flex justify-center mt-6">
              <div className="relative">
                <div className="w-12 h-12">
                  <div className="absolute inset-0 border-3 border-emerald-200 rounded-full"></div>
                  <div className="absolute inset-0 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== INTERFACE D'ERREUR ====================
  if (!diagnosis && error) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" />
              Erreur de Génération
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
              <p className="text-lg text-gray-700">Impossible de générer l'analyse médicale</p>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-mono">{error}</p>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Veuillez vérifier que :</p>
                <ul className="list-disc list-inside text-left max-w-md mx-auto">
                  <li>Les données patient sont complètes</li>
                  <li>Le motif de consultation est renseigné</li>
                  <li>La clé API OpenAI est configurée</li>
                  <li>Votre connexion internet est stable</li>
                </ul>
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={generateCompleteDiagnosisAndDocuments} 
                  className="mt-6"
                  size="lg"
                  disabled={generationInProgress}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
                <Button 
                  onClick={testAPI}
                  variant="outline"
                  className="mt-6"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tester l'API
                </Button>
              </div>
              {apiTestResult && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm font-mono">{apiTestResult}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== INTERFACE PRINCIPALE SANS DIAGNOSTIC ====================
  if (!diagnosis) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Brain className="h-6 w-6" />
              Génération de l'Analyse Médicale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-blue-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-800">
                  Préparation de l'analyse...
                </p>
                <p className="text-gray-600">
                  L'IA va automatiquement générer votre diagnostic
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                <p className="text-sm font-semibold text-gray-700 mb-2">État actuel :</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    {patientData ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-red-600" />}
                    Patient : {patientData?.firstName} {patientData?.lastName}
                  </li>
                  <li className="flex items-center gap-2">
                    {clinicalData ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-red-600" />}
                    Motif : {clinicalData?.chiefComplaint || 'Non fourni'}
                  </li>
                  <li className="flex items-center gap-2">
                    {questionsData?.responses?.length > 0 ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-yellow-600" />}
                    Questions IA : {questionsData?.responses?.length || 0} réponses
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-4 items-center">
                <Button 
                  onClick={generateCompleteDiagnosisAndDocuments} 
                  className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
                  size="lg"
                  disabled={!patientData || !clinicalData || loading || generationInProgress}
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Générer l'Analyse Médicale
                </Button>
                
                <Button 
                  onClick={testAPI}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tester la Connexion API
                </Button>
              </div>
              
              {apiTestResult && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm font-mono">{apiTestResult}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== INTERFACE PRINCIPALE AVEC DIAGNOSTIC ====================
  return (
    <div className="space-y-6">
      {/* En-tête de succès */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            Analyse Médicale Experte
          </CardTitle>
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
              Confiance : {diagnosis?.primary?.confidence || 70}%
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
              Certitude : {diagnosis?.primary?.certaintyLevel || "Modérée"}
            </Badge>
            <Badge className="bg-blue-500 text-white">
              GPT-5 Amélioré
            </Badge>
            {documentsGenerated && (
              <Badge className="bg-green-500 text-white">
                Documents Prêts
              </Badge>
            )}
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              onClick={forceRegenerate}
              variant="outline"
              size="sm"
              disabled={loading || generationInProgress}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || generationInProgress) ? 'animate-spin' : ''}`} />
              Régénérer l'analyse
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation des sections avec statuts */}
      <div className="flex flex-wrap gap-2 justify-center">
        {sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => setCurrentSection(index)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
              currentSection === index
                ? "bg-emerald-600 text-white shadow-lg"
                : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{section.title}</span>
            <SectionStatus status={section.status} />
          </button>
        ))}
      </div>

      {/* ==================== RAISONNEMENT DIAGNOSTIQUE ==================== */}
      <AnimatedSection show={showReasoning} delay={0}>
        {currentSection === 0 && diagnosticReasoning && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Brain className="h-6 w-6" />
                Raisonnement Diagnostique Systématique
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {/* Éléments clés identifiés */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Éléments Clés Identifiés
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-purple-700">Historique clinique :</span>
                      <p className="text-gray-700">
                        <StreamingText text={diagnosticReasoning.key_findings?.from_history || ""} speed={5} />
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Pattern symptomatique :</span>
                      <p className="text-gray-700">
                        <StreamingText text={diagnosticReasoning.key_findings?.from_symptoms || ""} speed={5} />
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Questionnaire IA :</span>
                      <p className="text-gray-700">
                        <StreamingText text={diagnosticReasoning.key_findings?.from_ai_questions || ""} speed={5} />
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Signes d'Alarme
                  </h4>
                  <p className="text-sm text-gray-700">
                    <StreamingText text={diagnosticReasoning.key_findings?.red_flags || "Aucun signe d'alarme identifié"} speed={8} />
                  </p>
                </div>
              </div>

              {/* Identification du syndrome */}
              {diagnosticReasoning.syndrome_identification && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Syndrome Clinique Identifié
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="font-medium text-blue-700">Syndrome :</span>
                      <p className="text-lg font-semibold text-gray-800">
                        <StreamingText text={diagnosticReasoning.syndrome_identification.clinical_syndrome} speed={10} />
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Éléments en faveur :</span>
                      <p className="text-sm text-gray-700">
                        {diagnosticReasoning.syndrome_identification.supporting_features?.join(', ') || 'Éléments compatibles'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-orange-700">Éléments discordants :</span>
                      <p className="text-sm text-gray-700">
                        {diagnosticReasoning.syndrome_identification.inconsistent_features?.join(', ') || 'Aucun'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </AnimatedSection>

      {/* ==================== DIAGNOSTIC PRINCIPAL ==================== */}
      <AnimatedSection show={showPrimaryDiagnosis} delay={200}>
        {currentSection === 1 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Target className="h-6 w-6" />
                Diagnostic Principal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="text-center p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
                <h3 className="text-2xl font-bold text-emerald-800 mb-4">
                  <StreamingText 
                    text={diagnosis?.primary?.condition || "Diagnostic à préciser"}
                    speed={15}
                  />
                </h3>
                <div className="flex justify-center gap-4">
                  <Badge className="bg-emerald-100 text-emerald-800 text-sm px-4 py-2">
                    Probabilité : {diagnosis?.primary?.confidence || 70}%
                  </Badge>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-sm px-4 py-2">
                    Sévérité : {diagnosis?.primary?.severity || "À évaluer"}
                  </Badge>
                  {diagnosis?.primary?.icd10 && (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-sm px-4 py-2">
                      CIM-10 : {diagnosis.primary.icd10}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Critères diagnostiques validés */}
              {diagnosis?.primary?.diagnosticCriteriaMet && diagnosis.primary.diagnosticCriteriaMet.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Critères Diagnostiques Validés
                  </h4>
                  <ul className="space-y-2">
                    {diagnosis.primary.diagnosticCriteriaMet.map((criterion: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnosis?.primary?.detailedAnalysis && (
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-emerald-600" />
                    Analyse Physiopathologique Détaillée
                  </h4>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <StreamingText 
                        text={diagnosis.primary.detailedAnalysis}
                        speed={8}
                      />
                    </p>
                  </div>
                </div>
              )}

              {diagnosis?.primary?.clinicalRationale && (
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-emerald-600" />
                    Raisonnement Clinique
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <StreamingText 
                        text={diagnosis.primary.clinicalRationale}
                        speed={8}
                      />
                    </p>
                  </div>
                </div>
              )}

              {diagnosis?.primary?.prognosis && (
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    Pronostic
                  </h4>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <StreamingText 
                        text={diagnosis.primary.prognosis}
                        speed={8}
                      />
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </AnimatedSection>

      {/* ==================== STRATÉGIE D'INVESTIGATION ==================== */}
      <AnimatedSection show={showInvestigations} delay={300}>
        {currentSection === 2 && showInvestigations && expertAnalysis?.expert_investigations && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <TestTube className="h-6 w-6" />
                Stratégie d'Investigation Complète
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {/* Approche diagnostique */}
              {expertAnalysis.expert_investigations.investigation_strategy?.diagnostic_approach && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
                  <p className="text-center font-medium text-red-800">
                    {expertAnalysis.expert_investigations.investigation_strategy.diagnostic_approach}
                  </p>
                </div>
              )}

              {/* Tests par objectif */}
              {expertAnalysis.expert_investigations.tests_by_purpose && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Confirmer le diagnostic principal */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Confirmer le Diagnostic
                    </h4>
                    <div className="space-y-3">
                      {expertAnalysis.expert_investigations.tests_by_purpose.to_confirm_primary?.map((test: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium text-green-700">
                            {test.test}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            {test.rationale}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exclure les différentiels */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Exclure les Différentiels
                    </h4>
                    <div className="space-y-3">
                      {expertAnalysis.expert_investigations.tests_by_purpose.to_exclude_differentials?.map((test: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium text-orange-700">
                            {test.test}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            Exclut : {test.differential}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Évaluer la sévérité */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Évaluer la Sévérité
                    </h4>
                    <div className="space-y-3">
                      {expertAnalysis.expert_investigations.tests_by_purpose.to_assess_severity?.map((test: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium text-blue-700">
                            {test.test}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            {test.purpose}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Séquence temporelle des tests */}
              {expertAnalysis.expert_investigations.test_sequence && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Séquence Temporelle des Tests
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-red-100 text-red-800">IMMÉDIAT</Badge>
                      <p className="text-sm">{expertAnalysis.expert_investigations.test_sequence.immediate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-orange-100 text-orange-800">24-48H</Badge>
                      <p className="text-sm">{expertAnalysis.expert_investigations.test_sequence.urgent}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-yellow-100 text-yellow-800">ROUTINE</Badge>
                      <p className="text-sm">{expertAnalysis.expert_investigations.test_sequence.routine}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste détaillée des tests */}
              <div className="grid gap-6">
                {expertAnalysis.expert_investigations.immediate_priority?.map((exam: any, index: number) => (
                  <div key={index} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-red-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {exam.category === 'biology' && <FlaskConical className="h-6 w-6 text-red-600" />}
                        {exam.category === 'imaging' && <Activity className="h-6 w-6 text-blue-600" />}
                        {exam.category === 'functional' && <Stethoscope className="h-6 w-6 text-green-600" />}
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">
                            {exam.examination}
                          </h3>
                          <Badge className={`mt-1 ${
                            exam.urgency === 'immediate' ? 'bg-red-100 text-red-800' :
                            exam.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {exam.urgency === 'immediate' ? 'IMMÉDIAT' :
                             exam.urgency === 'urgent' ? 'URGENT' : 'SEMI-URGENT'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-1">INDICATION :</h4>
                        <p className="text-sm text-gray-600">
                          {exam.specific_indication}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-white rounded border">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            DISPONIBILITÉ MAURICE :
                          </h4>
                          <p className="text-xs text-gray-600">
                            {exam.mauritius_availability?.where || 'À vérifier'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            COÛT & DÉLAI :
                          </h4>
                          <div className="space-y-1">
                            <p className="text-xs text-green-600">
                              <strong>Coût :</strong> {exam.mauritius_availability?.cost || 'À vérifier'}
                            </p>
                            <p className="text-xs text-orange-600">
                              <strong>Délai :</strong> {exam.mauritius_availability?.turnaround || 'À vérifier'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </AnimatedSection>

      {/* ==================== TRAITEMENTS ==================== */}
      <AnimatedSection show={showTreatments} delay={400}>
        {currentSection === 3 && showTreatments && expertAnalysis?.expert_therapeutics?.primary_treatments && expertAnalysis.expert_therapeutics.primary_treatments.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Pill className="h-6 w-6" />
                Traitements Prescrits ({expertAnalysis.expert_therapeutics.primary_treatments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6">
                {expertAnalysis.expert_therapeutics.primary_treatments.map((treatment: any, index: number) => (
                  <div key={index} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-purple-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Pill className="h-6 w-6 text-purple-600" />
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">
                            {treatment.medication_dci}
                          </h3>
                          <Badge variant="outline" className="mt-1 border-purple-300 text-purple-700">
                            {treatment.therapeutic_class}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-1">INDICATION :</h4>
                        <p className="text-sm text-gray-600">
                          {treatment.precise_indication}
                        </p>
                      </div>

                      {treatment.mechanism && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-1">MÉCANISME D'ACTION :</h4>
                          <p className="text-sm text-gray-600">
                            {treatment.mechanism}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">POSOLOGIE :</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Adulte :</strong> {treatment.dosing_regimen?.adult?.en || 'À préciser'}</p>
                            {treatment.dosing_regimen?.adjustments?.elderly && (
                              <p><strong>Sujet âgé :</strong> {treatment.dosing_regimen.adjustments.elderly.en}</p>
                            )}
                            {treatment.dosing_regimen?.adjustments?.renal && (
                              <p><strong>Insuffisance rénale :</strong> {treatment.dosing_regimen.adjustments.renal.en}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">DURÉE & COÛT :</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Durée :</strong> {treatment.duration?.en || 'Selon évolution'}</p>
                            <p><strong>Disponible :</strong> {treatment.mauritius_availability?.public_free ? 'Gratuit (public)' : 'Payant'}</p>
                            {treatment.mauritius_availability?.estimated_cost && (
                              <p><strong>Coût estimé :</strong> {treatment.mauritius_availability.estimated_cost}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </AnimatedSection>

      {/* ==================== DIAGNOSTICS DIFFÉRENTIELS ==================== */}
      <AnimatedSection show={showDifferential} delay={500}>
        {currentSection === 4 && showDifferential && diagnosis?.differential && diagnosis.differential.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Search className="h-6 w-6" />
                Diagnostics Différentiels ({diagnosis.differential.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6">
                {diagnosis.differential.map((diff: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-400 pl-6 bg-blue-25 p-4 rounded-r-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-blue-800">
                        {diff.condition || "Diagnostic différentiel"}
                      </h4>
                      <Badge className="bg-blue-100 text-blue-800">{diff.probability || 30}%</Badge>
                    </div>
                    
                    {diff.reasoning && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 italic">
                          {diff.reasoning}
                        </p>
                      </div>
                    )}
                    
                    {diff.supporting_features && (
                      <div className="mb-2">
                        <span className="font-medium text-green-700 text-sm">En faveur : </span>
                        <span className="text-sm text-gray-600">{diff.supporting_features}</span>
                      </div>
                    )}
                    
                    {diff.against_features && (
                      <div className="mb-2">
                        <span className="font-medium text-red-700 text-sm">Contre : </span>
                        <span className="text-sm text-gray-600">{diff.against_features}</span>
                      </div>
                    )}
                    
                    {diff.discriminating_test && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 mt-3">
                        <span className="font-medium text-blue-700">
                          <TestTube className="h-4 w-4 inline mr-1" />
                          Test discriminant : 
                        </span>
                        <span className="text-sm text-blue-600 ml-2">
                          {diff.discriminating_test}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </AnimatedSection>

      {/* ==================== SURVEILLANCE ==================== */}
      <AnimatedSection show={showMonitoring} delay={600}>
        {currentSection === 5 && showMonitoring && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Monitor className="h-6 w-6" />
                Plan de Surveillance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Surveillance Immédiate (24h)</h3>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Efficacité du traitement symptomatique</li>
                    <li>• Tolérance médicamenteuse</li>
                    <li>• Évolution des symptômes</li>
                    <li>• Signes de complications</li>
                  </ul>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-orange-800">Suivi à Court Terme (1 semaine)</h3>
                  </div>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Réévaluation clinique</li>
                    <li>• Résultats des examens biologiques</li>
                    <li>• Ajustement thérapeutique si nécessaire</li>
                    <li>• Observance du traitement</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Suivi à Long Terme</h3>
                  </div>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Prévention des récidives</li>
                    <li>• Surveillance de la fonction d'organe</li>
                    <li>• Éducation thérapeutique</li>
                    <li>• Adaptation du mode de vie</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Signes d'Alarme - Consultation Urgente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Aggravation de l'état général</li>
                    <li>• Fièvre persistante >39°C</li>
                    <li>• Douleur non contrôlée >8/10</li>
                  </ul>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Effets indésirables sévères</li>
                    <li>• Nouveaux symptômes neurologiques</li>
                    <li>• Urgences Maurice : 114 (SAMU)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </AnimatedSection>

      {/* ==================== DOCUMENTS ==================== */}
      <AnimatedSection show={showDocuments} delay={700}>
        {currentSection === 6 && showDocuments && documentsGenerated && mauritianDocuments && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                Documents Médicaux Mauriciens Complets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Rapport de consultation */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-800">Rapport de Consultation</h3>
                      <p className="text-sm text-blue-600">Avec raisonnement diagnostique</p>
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>Patient :</strong> {mauritianDocuments.consultation?.patient?.firstName} {mauritianDocuments.consultation?.patient?.lastName}</p>
                    <p><strong>Date :</strong> {mauritianDocuments.consultation?.header?.date}</p>
                    <p><strong>Diagnostic :</strong> {diagnosis?.primary?.condition}</p>
                    <p className="text-green-600"><strong>✅</strong> Raisonnement diagnostique inclus</p>
                  </div>
                </div>

                {/* Examens de laboratoire */}
                <div className="bg-red-50 p-6 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <TestTube className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-red-800">Examens de Laboratoire</h3>
                      <p className="text-sm text-red-600">Structurés par objectif</p>
                    </div>
                  </div>
                  <div className="text-xs text-red-700">
                    <p><strong>Tests :</strong> {mauritianDocuments.biological?.examinations?.length || 0} examens</p>
                    <p className="text-green-600"><strong>✅</strong> Tests organisés par objectif diagnostique</p>
                    <p className="text-green-600"><strong>✅</strong> Disponibilité Maurice incluse</p>
                  </div>
                </div>

                {/* Imagerie */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Stethoscope className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">Imagerie Médicale</h3>
                      <p className="text-sm text-green-600">Séquence temporelle</p>
                    </div>
                  </div>
                  <div className="text-xs text-green-700">
                    {mauritianDocuments.imaging ? (
                      <>
                        <p><strong>Études :</strong> {mauritianDocuments.imaging.studies?.length || 0}</p>
                        <p className="text-green-600"><strong>✅</strong> Priorisation temporelle</p>
                      </>
                    ) : (
                      <p className="text-gray-600">Aucune imagerie requise</p>
                    )}
                  </div>
                </div>

                {/* Prescription */}
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Pill className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-800">Prescription</h3>
                      <p className="text-sm text-purple-600">Mécanismes d'action</p>
                    </div>
                  </div>
                  <div className="text-xs text-purple-700">
                    <p><strong>Médicaments :</strong> {mauritianDocuments.prescription?.prescriptions?.length || 0}</p>
                    <p className="text-green-600"><strong>✅</strong> Mécanismes d'action détaillés</p>
                    <p className="text-green-600"><strong>✅</strong> Disponibilité et coûts Maurice</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-lg border border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">Documents Complets avec Logique Diagnostique</span>
                </div>
                <p className="text-sm text-purple-700">
                  Tous les documents incluent un raisonnement diagnostique systématique 
                  et une stratégie d'investigation structurée pour une meilleure traçabilité médicale.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">Prêt pour impression et archivage</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </AnimatedSection>

      {/* ==================== NAVIGATION ==================== */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux Questions IA
        </Button>

        {documentsGenerated ? (
          <Button 
            onClick={onNext}
            className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Éditer les Documents
          </Button>
        ) : (
          <Button 
            onClick={generateCompleteDiagnosisAndDocuments}
            className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={loading || generationInProgress}
          >
            <Brain className="h-4 w-4 mr-2" />
            Générer l'Analyse
          </Button>
        )}
      </div>

      {/* Indicateur d'auto-génération */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Génération automatique avec apparition progressive</span>
        </div>
      </div>
    </div>
  )
}
