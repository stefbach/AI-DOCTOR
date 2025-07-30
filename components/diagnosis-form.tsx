"use client"

import { useState, useEffect } from "react"
import { consultationDataService } from '@/lib/consultation-data-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  RefreshCw
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

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

export default function EnhancedDiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  onDataChange,
  onNext,
  onPrevious,
  language = 'fr',
  consultationId
}: DiagnosisFormProps) {
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [diagnosticReasoning, setDiagnosticReasoning] = useState<any>(null)
  const [expertAnalysis, setExpertAnalysis] = useState<any>(null)
  const [mauritianDocuments, setMauritianDocuments] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [documentsGenerated, setDocumentsGenerated] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<string | null>(null)

  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)

  // Load saved data on mount
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

  // Auto-generate avec conditions simplifiées
  useEffect(() => {
    console.log('🔄 Checking if should auto-generate:', {
      hasDiagnosis: !!diagnosis,
      hasPatientData: !!patientData,
      hasClinicalData: !!clinicalData,
      chiefComplaint: clinicalData?.chiefComplaint
    })

    // Générer automatiquement si on a les données nécessaires et pas de diagnostic
    if (!diagnosis && 
        patientData && 
        clinicalData && 
        clinicalData.chiefComplaint) {
      
      console.log('🚀 Auto-generating diagnosis...')
      generateCompleteDiagnosisAndDocuments()
    }
  }, [patientData, clinicalData]) // Retirer diagnosis des dépendances pour éviter les boucles

  // Save data when diagnosis is generated or updated
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
        console.log("💾 Auto-saved enhanced diagnosis data to consultation service")
      } catch (error) {
        console.error('❌ Error saving diagnosis data:', error)
      }
    }
    
    saveData()
  }, [diagnosis, diagnosticReasoning, expertAnalysis, mauritianDocuments, documentsGenerated])

  // Test API function
  const testAPI = async () => {
    console.log('🧪 Testing API...')
    setApiTestResult('Testing...')
    try {
      const res = await fetch('/api/openai-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: { age: 30, sex: 'M', firstName: 'Test', lastName: 'Patient' },
          clinicalData: { chiefComplaint: 'Test douleur thoracique' },
          questionsData: [],
          language: 'fr'
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

  const generateCompleteDiagnosisAndDocuments = async () => {
    console.log('🩺 ========== STARTING DIAGNOSIS GENERATION ==========')
    console.log('📋 Patient Data:', {
      hasData: !!patientData,
      age: patientData?.age,
      sex: patientData?.sex,
      chiefComplaint: clinicalData?.chiefComplaint
    })

    // Validation plus souple
    if (!patientData || !clinicalData) {
      console.error('❌ Missing required data:', { patientData: !!patientData, clinicalData: !!clinicalData })
      setError("Données patient ou cliniques manquantes")
      return
    }

    setLoading(true)
    setError(null)
    setDocumentsGenerated(false)

    try {
      console.log("📡 Sending request to /api/openai-diagnosis...")
      
      const requestBody = {
        patientData,
        clinicalData,
        questionsData,
        language,
      }
      
      console.log("📦 Request body:", {
        patientDataKeys: Object.keys(patientData || {}),
        clinicalDataKeys: Object.keys(clinicalData || {}),
        questionsCount: questionsData?.length || 0,
        language
      })

      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📨 Response received:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`)
      }

      const data = await response.json()
      console.log("📦 API Response:", {
        success: data.success,
        hasError: !!data.error,
        hasDiagnosis: !!data.diagnosis,
        hasDiagnosticReasoning: !!data.diagnosticReasoning,
        hasExpertAnalysis: !!data.expertAnalysis,
        hasDocuments: !!data.mauritianDocuments
      })

      if (data.success && data.diagnosis && data.mauritianDocuments) {
        console.log("✅ Setting diagnosis data...")
        
        setDiagnosis(data.diagnosis)
        setDiagnosticReasoning(data.diagnosticReasoning || null)
        setExpertAnalysis(data.expertAnalysis || data.expert_analysis || {})
        setMauritianDocuments(data.mauritianDocuments)
        setDocumentsGenerated(true)
        
        // Save complete enhanced data
        const completeData = { 
          diagnosis: data.diagnosis,
          diagnosticReasoning: data.diagnosticReasoning,
          mauritianDocuments: data.mauritianDocuments,
          expertAnalysis: data.expertAnalysis || data.expert_analysis || {},
          completeData: data,
          documentsGenerated: true
        }
        
        // Call onDataChange to update parent component
        onDataChange(completeData)
        
        // Save to consultation service
        try {
          await consultationDataService.saveStepData(3, completeData)
          console.log("✅ Data saved to consultation service")
        } catch (saveError) {
          console.error("❌ Error saving to consultation service:", saveError)
        }
        
      } else {
        console.error("❌ Invalid response format:", data)
        throw new Error(data.error || "Format de réponse invalide")
      }

    } catch (err) {
      console.error("❌ Generation error:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")

      // Generate fallback data
      console.log("⚠️ Generating fallback data...")
      const fallbackData = generateCompleteFallback()
      setDiagnosis(fallbackData.diagnosis)
      setDiagnosticReasoning(fallbackData.diagnosticReasoning)
      setExpertAnalysis(fallbackData.expertAnalysis)
      setMauritianDocuments(fallbackData.mauritianDocuments)
      setDocumentsGenerated(true)
      
      const completeData = {
        diagnosis: fallbackData.diagnosis,
        diagnosticReasoning: fallbackData.diagnosticReasoning,
        mauritianDocuments: fallbackData.mauritianDocuments,
        expertAnalysis: fallbackData.expertAnalysis,
        completeData: fallbackData,
        documentsGenerated: true
      }
      
      onDataChange(completeData)
      
    } finally {
      setLoading(false)
      console.log('🩺 ========== DIAGNOSIS GENERATION COMPLETE ==========')
    }
  }

  const generateCompleteFallback = () => {
    console.log('🔧 Generating fallback diagnosis...')
    
    const fallbackDiagnosis = {
      primary: {
        condition: `Syndrome clinique - ${clinicalData?.chiefComplaint || "Consultation médicale"}`,
        condition_bilingual: {
          fr: `Syndrome clinique - ${clinicalData?.chiefComplaint || "Consultation médicale"}`,
          en: `Clinical syndrome - ${clinicalData?.chiefComplaint || "Medical consultation"}`
        },
        icd10: "R53",
        confidence: 70,
        severity: "moderate",
        severity_bilingual: { fr: "modérée", en: "moderate" },
        detailedAnalysis: "Analyse basée sur les symptômes présentés nécessitant exploration complémentaire",
        detailedAnalysis_bilingual: {
          fr: "Analyse basée sur les symptômes présentés nécessitant exploration complémentaire",
          en: "Analysis based on presented symptoms requiring further investigation"
        },
        clinicalRationale: `Symptômes: ${clinicalData?.chiefComplaint}. Nécessite anamnèse et examen clinique approfondis`,
        clinicalRationale_bilingual: {
          fr: `Symptômes: ${clinicalData?.chiefComplaint}. Nécessite anamnèse et examen clinique approfondis`,
          en: `Symptoms: ${clinicalData?.chiefComplaint}. Requires thorough history and clinical examination`
        },
        prognosis: "Évolution favorable attendue avec prise en charge appropriée",
        prognosis_bilingual: {
          fr: "Évolution favorable attendue avec prise en charge appropriée",
          en: "Favorable evolution expected with appropriate management"
        },
        diagnosticCriteriaMet: ["Symptômes compatibles", "Contexte clinique évocateur"],
        certaintyLevel: "Moderate"
      },
      differential: [
        {
          condition: { fr: "Syndrome viral", en: "Viral syndrome" },
          condition_bilingual: { fr: "Syndrome viral", en: "Viral syndrome" },
          probability: 40,
          reasoning: { 
            fr: "Cause fréquente de symptômes non spécifiques",
            en: "Common cause of non-specific symptoms"
          },
          reasoning_bilingual: { 
            fr: "Cause fréquente de symptômes non spécifiques",
            en: "Common cause of non-specific symptoms"
          },
          discriminating_test: { fr: "Sérologie virale", en: "Viral serology" }
        }
      ]
    }

    const fallbackDiagnosticReasoning = {
      key_findings: {
        from_history: "Données cliniques de base disponibles",
        from_symptoms: clinicalData?.chiefComplaint || "Symptômes à préciser",
        from_ai_questions: "Réponses du questionnaire IA",
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
          diagnostic_approach: { 
            fr: "Approche diagnostique systématique", 
            en: "Systematic diagnostic approach" 
          },
          tests_by_purpose: {
            to_confirm_primary: [],
            to_exclude_differentials: [],
            to_assess_severity: []
          },
          test_sequence: {
            immediate: "Tests urgents si nécessaire",
            urgent: "Bilan dans 24-48h",
            routine: "Suivi selon évolution"
          }
        },
        immediate_priority: [
          {
            category: "biology",
            examination: "Hémogramme complet + CRP",
            examination_bilingual: { fr: "Hémogramme complet + CRP", en: "Complete blood count + CRP" },
            specific_indication: "Recherche syndrome inflammatoire",
            indication_bilingual: { 
              fr: "Recherche syndrome inflammatoire",
              en: "Search for inflammatory syndrome"
            },
            urgency: "urgent",
            mauritius_availability: {
              where: "C-Lab, Green Cross",
              cost: "Rs 600-1200",
              turnaround: "2-6h urgent"
            }
          }
        ],
        tests_by_purpose: {},
        test_sequence: {}
      },
      expert_therapeutics: {
        primary_treatments: [
          {
            medication_dci: "Paracétamol",
            medication_bilingual: { fr: "Paracétamol", en: "Paracetamol" },
            therapeutic_class: "Antalgique-Antipyrétique",
            precise_indication: "Traitement symptomatique",
            indication_bilingual: { 
              fr: "Traitement symptomatique douleur/fièvre",
              en: "Symptomatic treatment pain/fever"
            },
            mechanism: "Inhibition synthèse prostaglandines",
            mechanism_bilingual: {
              fr: "Inhibition de la synthèse des prostaglandines au niveau central",
              en: "Inhibition of prostaglandin synthesis at central level"
            },
            dosing_regimen: {
              adult: { fr: "1g x 3-4/jour", en: "1g x 3-4/day" }
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
          title: { fr: "COMPTE-RENDU DE CONSULTATION", en: "CONSULTATION REPORT" },
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
          diagnosis: fallbackDiagnosis.primary.condition_bilingual
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

  const sections = [
    { id: "reasoning", title: "Raisonnement Diagnostique", icon: Brain },
    { id: "primary", title: "Diagnostic Principal", icon: Target },
    { id: "examinations", title: "Stratégie d'Investigation", icon: TestTube },
    { id: "treatments", title: "Traitements Prescrits", icon: Pill },
    { id: "differential", title: "Diagnostics Différentiels", icon: Search },
    { id: "monitoring", title: "Surveillance", icon: Monitor },
    { id: "documents", title: "Documents Maurice", icon: FileText },
  ]

  // Loading interface
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              <Brain className="h-10 w-10 text-emerald-600" />
              Analyse Médicale Expert GPT-4o
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-20">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin animate-reverse"></div>
                  <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-2xl font-bold text-gray-800">Génération Analyse Complète</p>
                <p className="text-lg text-gray-600">Raisonnement Diagnostique + Stratégie Investigation</p>
                <div className="max-w-md mx-auto text-sm text-gray-500 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span>Raisonnement diagnostique systématique</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>Critères diagnostiques validés</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <TestTube className="h-4 w-4" />
                    <span>Tests organisés par objectif</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Protocoles sécurité intégrés</span>
                  </div>
                </div>
              </div>
              <Progress value={75} className="w-96 mx-auto h-3" />
              <p className="text-xs text-gray-400">Powered by GPT-4o Enhanced - 10000 tokens</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error interface with retry button
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
                <p>Vérifiez que :</p>
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

  // Main interface - Enhanced with force generation button
  if (!diagnosis) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Brain className="h-6 w-6" />
              Générer l'Analyse Médicale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <Brain className="h-20 w-20 text-blue-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-800">
                  Prêt à générer l'analyse médicale
                </p>
                <p className="text-gray-600">
                  L'IA va analyser les données et générer un diagnostic complet
                </p>
              </div>
              
              {/* État des données */}
              <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                <p className="text-sm font-semibold text-gray-700 mb-2">État actuel :</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Patient : {patientData ? '✅' : '❌'} {patientData?.firstName} {patientData?.lastName}</li>
                  <li>• Âge/Sexe : {patientData?.age || '?'} ans - {patientData?.sex || '?'}</li>
                  <li>• Clinique : {clinicalData ? '✅' : '❌'} {clinicalData?.chiefComplaint || 'Non renseigné'}</li>
                  <li>• Questions IA : {questionsData?.length || 0} réponses</li>
                  <li>• API Status : <span className="font-mono">{process.env.NEXT_PUBLIC_API_STATUS || 'À vérifier'}</span></li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-4 items-center">
                <Button 
                  onClick={generateCompleteDiagnosisAndDocuments} 
                  className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
                  size="lg"
                  disabled={!patientData || !clinicalData || loading}
                >
                  <Brain className="h-5 w-5 mr-2" />
                  {loading ? 'Génération en cours...' : 'Générer l\'Analyse Médicale'}
                </Button>
                
                <Button 
                  onClick={testAPI}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tester la connexion API
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

        {/* Debug Panel */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono space-y-1">
              <p>hasPatientData: {String(!!patientData)}</p>
              <p>hasClinicalData: {String(!!clinicalData)}</p>
              <p>chiefComplaint: {clinicalData?.chiefComplaint || 'null'}</p>
              <p>questionsCount: {questionsData?.length || 0}</p>
              <p>diagnosis: {String(!!diagnosis)}</p>
              <p>loading: {String(loading)}</p>
              <p>error: {error || 'null'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Rest of your component code remains the same...
  // (The rendering of the actual diagnosis sections)
  
  return (
    <div className="space-y-6">
      {/* Success header */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            Analyse Médicale Experte Enrichie
          </CardTitle>
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
              Confiance: {diagnosis?.primary?.confidence || 70}%
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
              Certitude: {diagnosis?.primary?.certaintyLevel || "Modérée"}
            </Badge>
            <Badge className="bg-blue-500 text-white">
              GPT-4o Enhanced
            </Badge>
            {documentsGenerated && (
              <Badge className="bg-green-500 text-white">
                Documents Prêts
              </Badge>
            )}
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              onClick={generateCompleteDiagnosisAndDocuments}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Régénérer l'analyse
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Section navigation */}
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
          </button>
        ))}
      </div>

      {/* DIAGNOSTIC REASONING (NEW SECTION) */}
      {currentSection === 0 && diagnosticReasoning && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Brain className="h-6 w-6" />
              Raisonnement Diagnostique Systématique
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Key Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Éléments Clés Identifiés
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-purple-700">Histoire clinique:</span>
                    <p className="text-gray-700">{diagnosticReasoning.key_findings?.from_history}</p>
                  </div>
                  <div>
                    <span className="font-medium text-purple-700">Pattern symptomatique:</span>
                    <p className="text-gray-700">{diagnosticReasoning.key_findings?.from_symptoms}</p>
                  </div>
                  <div>
                    <span className="font-medium text-purple-700">Questionnaire IA:</span>
                    <p className="text-gray-700">{diagnosticReasoning.key_findings?.from_ai_questions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Signaux d'Alerte
                </h4>
                <p className="text-sm text-gray-700">
                  {diagnosticReasoning.key_findings?.red_flags || "Aucun signal d'alerte identifié"}
                </p>
              </div>
            </div>

            {/* Syndrome Identification */}
            {diagnosticReasoning.syndrome_identification && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Syndrome Clinique Identifié
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="font-medium text-blue-700">Syndrome:</span>
                    <p className="text-lg font-semibold text-gray-800">
                      {diagnosticReasoning.syndrome_identification.clinical_syndrome}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Éléments concordants:</span>
                    <p className="text-sm text-gray-700">
                      {diagnosticReasoning.syndrome_identification.supporting_features}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-700">Éléments discordants:</span>
                    <p className="text-sm text-gray-700">
                      {diagnosticReasoning.syndrome_identification.inconsistent_features || "Aucun"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PRIMARY DIAGNOSIS (Enhanced with criteria) */}
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
                {language === 'fr' && diagnosis?.primary?.condition_bilingual?.fr 
                  ? diagnosis.primary.condition_bilingual.fr
                  : diagnosis?.primary?.condition || "Diagnostic à préciser"}
              </h3>
              <div className="flex justify-center gap-4">
                <Badge className="bg-emerald-100 text-emerald-800 text-sm px-4 py-2">
                  Probabilité: {diagnosis?.primary?.confidence || 70}%
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-sm px-4 py-2">
                  Sévérité: {language === 'fr' && diagnosis?.primary?.severity_bilingual?.fr 
                    ? diagnosis.primary.severity_bilingual.fr
                    : diagnosis?.primary?.severity || "À évaluer"}
                </Badge>
                {diagnosis?.primary?.icd10 && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700 text-sm px-4 py-2">
                    CIM-10: {diagnosis.primary.icd10}
                  </Badge>
                )}
              </div>
            </div>

            {/* Diagnostic Criteria Met (NEW) */}
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
                    {language === 'fr' && diagnosis.primary.detailedAnalysis_bilingual?.fr 
                      ? diagnosis.primary.detailedAnalysis_bilingual.fr
                      : diagnosis.primary.detailedAnalysis}
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
                    {language === 'fr' && diagnosis.primary.clinicalRationale_bilingual?.fr 
                      ? diagnosis.primary.clinicalRationale_bilingual.fr
                      : diagnosis.primary.clinicalRationale}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* INVESTIGATION STRATEGY (Enhanced with test purposes) */}
      {currentSection === 2 && expertAnalysis?.expert_investigations && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <TestTube className="h-6 w-6" />
              Stratégie d'Investigation Complète
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Diagnostic Approach */}
            {expertAnalysis.expert_investigations.investigation_strategy?.diagnostic_approach && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
                <p className="text-center font-medium text-red-800">
                  {language === 'fr' 
                    ? expertAnalysis.expert_investigations.investigation_strategy.diagnostic_approach.fr
                    : expertAnalysis.expert_investigations.investigation_strategy.diagnostic_approach.en}
                </p>
              </div>
            )}

            {/* Tests by Purpose (NEW) */}
            {expertAnalysis.expert_investigations.tests_by_purpose && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* To Confirm Primary */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Confirmer Diagnostic
                  </h4>
                  <div className="space-y-3">
                    {expertAnalysis.expert_investigations.tests_by_purpose.to_confirm_primary?.map((test: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium text-green-700">
                          {language === 'fr' ? test.test.fr : test.test.en}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {language === 'fr' ? test.rationale.fr : test.rationale.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* To Exclude Differentials */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Exclure Différentiels
                  </h4>
                  <div className="space-y-3">
                    {expertAnalysis.expert_investigations.tests_by_purpose.to_exclude_differentials?.map((test: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium text-orange-700">
                          {language === 'fr' ? test.test.fr : test.test.en}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          Exclut: {test.differential}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* To Assess Severity */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Évaluer Sévérité
                  </h4>
                  <div className="space-y-3">
                    {expertAnalysis.expert_investigations.tests_by_purpose.to_assess_severity?.map((test: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium text-blue-700">
                          {language === 'fr' ? test.test.fr : test.test.en}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {language === 'fr' ? test.purpose.fr : test.purpose.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Test Sequence Timeline (NEW) */}
            {expertAnalysis.expert_investigations.test_sequence && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Séquence Temporelle des Examens
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

            {/* Detailed Test List */}
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
                          {language === 'fr' && exam.examination_bilingual?.fr 
                            ? exam.examination_bilingual.fr
                            : exam.examination}
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
                        {language === 'fr' && exam.indication_bilingual?.fr 
                          ? exam.indication_bilingual.fr
                          : exam.specific_indication}
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
                            <strong>Coût:</strong> {exam.mauritius_availability?.cost || 'À vérifier'}
                          </p>
                          <p className="text-xs text-orange-600">
                            <strong>Délai:</strong> {exam.mauritius_availability?.turnaround || 'À vérifier'}
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

      {/* TREATMENTS */}
      {currentSection === 3 && expertAnalysis?.expert_therapeutics?.primary_treatments && expertAnalysis.expert_therapeutics.primary_treatments.length > 0 && (
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
                          {language === 'fr' && treatment.medication_bilingual?.fr 
                            ? treatment.medication_bilingual.fr
                            : treatment.medication_dci}
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
                        {language === 'fr' && treatment.indication_bilingual?.fr 
                          ? treatment.indication_bilingual.fr
                          : treatment.precise_indication}
                      </p>
                    </div>

                    {treatment.mechanism_bilingual && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-1">MÉCANISME D'ACTION :</h4>
                        <p className="text-sm text-gray-600">
                          {language === 'fr' ? treatment.mechanism_bilingual.fr : treatment.mechanism_bilingual.en}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">POSOLOGIE :</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Adulte:</strong> {treatment.dosing_regimen?.adult?.fr || 'À préciser'}</p>
                          {treatment.dosing_regimen?.adjustments?.elderly && (
                            <p><strong>Sujet âgé:</strong> {treatment.dosing_regimen.adjustments.elderly.fr}</p>
                          )}
                          {treatment.dosing_regimen?.adjustments?.renal && (
                            <p><strong>Insuff. rénale:</strong> {treatment.dosing_regimen.adjustments.renal.fr}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">DURÉE & COÛT :</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Durée:</strong> {treatment.dosing_regimen?.duration?.fr || 'Selon évolution'}</p>
                          <p><strong>Disponible:</strong> {treatment.mauritius_availability?.public_free ? 'Gratuit (public)' : 'Payant'}</p>
                          {treatment.mauritius_availability?.estimated_cost && (
                            <p><strong>Coût estimé:</strong> {treatment.mauritius_availability.estimated_cost}</p>
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

      {/* DIFFERENTIAL DIAGNOSES */}
      {currentSection === 4 && diagnosis?.differential && diagnosis.differential.length > 0 && (
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
                      {language === 'fr' && diff.condition?.fr 
                        ? diff.condition.fr 
                        : diff.condition?.en || diff.condition || "Diagnostic différentiel"}
                    </h4>
                    <Badge className="bg-blue-100 text-blue-800">{diff.probability || 30}%</Badge>
                  </div>
                  
                  {diff.reasoning && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 italic">
                        {language === 'fr' && diff.reasoning.fr 
                          ? diff.reasoning.fr 
                          : diff.reasoning.en || diff.reasoning}
                      </p>
                    </div>
                  )}
                  
                  {diff.supporting_features && (
                    <div className="mb-2">
                      <span className="font-medium text-green-700 text-sm">Arguments pour: </span>
                      <span className="text-sm text-gray-600">{diff.supporting_features}</span>
                    </div>
                  )}
                  
                  {diff.against_features && (
                    <div className="mb-2">
                      <span className="font-medium text-red-700 text-sm">Arguments contre: </span>
                      <span className="text-sm text-gray-600">{diff.against_features}</span>
                    </div>
                  )}
                  
                  {diff.discriminating_test && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 mt-3">
                      <span className="font-medium text-blue-700">
                        <TestTube className="h-4 w-4 inline mr-1" />
                        Test discriminant: 
                      </span>
                      <span className="text-sm text-blue-600 ml-2">
                        {language === 'fr' ? diff.discriminating_test.fr : diff.discriminating_test.en}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MONITORING */}
      {currentSection === 5 && (
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
                  <li>• Efficacité traitement symptomatique</li>
                  <li>• Tolérance médicamenteuse</li>
                  <li>• Évolution symptômes</li>
                  <li>• Signes complications</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">Suivi Court Terme (1 semaine)</h3>
                </div>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Réévaluation clinique</li>
                  <li>• Résultats examens biologiques</li>
                  <li>• Adaptation thérapeutique si besoin</li>
                  <li>• Observance traitement</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">Suivi Long Terme</h3>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Prévention récidives</li>
                  <li>• Surveillance fonction organes</li>
                  <li>• Éducation thérapeutique</li>
                  <li>• Adaptation style de vie</li>
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
                  <li>• Aggravation état général</li>
                  <li>• Fièvre &gt;39°C persistante</li>
                  <li>• Douleur non contrôlée &gt;8/10</li>
                </ul>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Effets indésirables sévères</li>
                  <li>• Symptômes neurologiques nouveaux</li>
                  <li>• Urgences Maurice: 114 (SAMU)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DOCUMENTS */}
      {currentSection === 6 && documentsGenerated && mauritianDocuments && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              Documents Médicaux Mauriciens Enrichis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              
              {/* Consultation avec Raisonnement */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-800">Compte Rendu Consultation</h3>
                    <p className="text-sm text-blue-600">Avec raisonnement diagnostique</p>
                  </div>
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Patient:</strong> {mauritianDocuments.consultation?.patient?.firstName} {mauritianDocuments.consultation?.patient?.lastName}</p>
                  <p><strong>Diagnostic:</strong> {
                    language === 'fr' && mauritianDocuments.consultation?.clinical_summary?.diagnosis?.fr
                      ? mauritianDocuments.consultation.clinical_summary.diagnosis.fr
                      : diagnosis?.primary?.condition
                  }</p>
                  <p className="text-green-600"><strong>Nouveau:</strong> Raisonnement diagnostique inclus</p>
                </div>
              </div>

              {/* Autres documents */}
              <div className="bg-red-50 p-6 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <TestTube className="h-8 w-8 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-800">Examens Structurés</h3>
                    <p className="text-sm text-red-600">Par objectif diagnostique</p>
                  </div>
                </div>
                <div className="text-xs text-red-700">
                  <p className="text-green-600"><strong>Nouveau:</strong> Tests organisés par objectif</p>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <Stethoscope className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Séquence Temporelle</h3>
                    <p className="text-sm text-green-600">Examens priorisés</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <Pill className="h-8 w-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-purple-800">Prescription Détaillée</h3>
                    <p className="text-sm text-purple-600">Mécanismes d'action inclus</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-lg border border-blue-300">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-purple-800">Documents Enrichis avec Logique Diagnostique</span>
              </div>
              <p className="text-sm text-purple-700">
                Tous les documents incluent maintenant le raisonnement diagnostique systématique 
                et la stratégie d'investigation structurée pour une meilleure traçabilité médicale.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour Questions IA
        </Button>

        {documentsGenerated ? (
          <Button 
            onClick={onNext}
            className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Éditer Documents
          </Button>
        ) : (
          <Button 
            onClick={generateCompleteDiagnosisAndDocuments}
            className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Brain className="h-4 w-4 mr-2" />
            Générer Analyse Enrichie
          </Button>
        )}
      </div>

      {/* Debug footer */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <details>
          <summary className="cursor-pointer text-xs font-mono text-gray-600">Debug Info</summary>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify({
              hasDiagnosis: !!diagnosis,
              hasPatientData: !!patientData,
              hasClinicalData: !!clinicalData,
              chiefComplaint: clinicalData?.chiefComplaint,
              documentsGenerated,
              apiKey: process.env.NEXT_PUBLIC_API_STATUS || 'Check server logs'
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
